import { defineComponent, ref, computed, onMounted, watch, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

const PROTOCOL_OPTIONS = [
  { value: 'icmp', label: 'ICMP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
];

export default defineComponent({
  name: 'Nat64SourcePage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat64 source';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const ruleSchema = computed(() => [
      { key: 'id', title: t('nat64.source.field.ruleNumber'), type: 'number', min: 1, max: 999999, required: true, help: t('nat64.source.help.ruleNumber') },
      { key: 'description', title: t('nat64.source.field.description'), type: 'text' },
      { key: 'matchMark', title: t('nat64.source.field.matchMark'), type: 'number', min: 1, max: 2147483647, placeholder: t('nat64.source.placeholder.matchMark') },
      { key: 'sourcePrefix', title: t('nat64.source.field.sourcePrefix'), type: 'text', placeholder: t('nat64.source.placeholder.sourcePrefix') },
      { key: 'disable', title: t('nat64.source.field.disable'), type: 'checkbox' },
    ]);

    const ruleColumns = computed(() => [
      { key: 'id', title: t('nat64.source.column.ruleNumber') },
      { key: 'description', title: t('nat64.source.column.description') },
      { key: 'sourcePrefix', title: t('nat64.source.column.sourcePrefix') },
      { key: 'matchMark', title: t('nat64.source.column.fwmark') },
      { key: 'disable', title: t('nat64.source.column.disable') },
    ]);

    // Translation pools per rule
    const poolModalVisible = ref(false);
    const editingPool = ref(null);
    const editingPoolRuleId = ref(null);
    const editingPoolOriginalId = ref(null);

    const poolSchema = computed(() => [
      { key: 'id', title: t('nat64.source.pool.field.poolId'), type: 'number', min: 1, max: 999999, required: true, help: t('nat64.source.pool.help.poolId') },
      { key: 'description', title: t('nat64.source.pool.field.description'), type: 'text' },
      { key: 'address', title: t('nat64.source.pool.field.address'), type: 'text', placeholder: t('nat64.source.pool.placeholder.address') },
      { key: 'port', title: t('nat64.source.pool.field.port'), type: 'text', placeholder: t('nat64.source.pool.placeholder.port') },
      { key: 'protocol', title: t('nat64.source.pool.field.protocol'), type: 'select', options: PROTOCOL_OPTIONS },
      { key: 'disable', title: t('nat64.source.pool.field.disable'), type: 'checkbox' },
    ]);

    const poolColumns = computed(() => [
      { key: 'id', title: t('nat64.source.pool.column.poolId') },
      { key: 'description', title: t('nat64.source.pool.column.description') },
      { key: 'address', title: t('nat64.source.pool.column.address') },
      { key: 'port', title: t('nat64.source.pool.column.port') },
      { key: 'protocol', title: t('nat64.source.pool.column.protocol') },
      { key: 'disable', title: t('nat64.source.pool.column.disable') },
    ]);

    const currentRulePools = computed(() => {
      if (!editingRule.value) return [];
      return editingRule.value._pools || [];
    });

    const selectedPools = ref([]);

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => {
            const rule = { id: parseInt(id) || id };
            if (attrs.description) rule.description = attrs.description;
            if (attrs.disable) rule.disable = true;
            if (attrs.match?.mark) rule.matchMark = parseInt(attrs.match.mark);
            if (attrs.source?.prefix) rule.sourcePrefix = attrs.source.prefix;

            // Parse translation pools
            const trans = attrs.translation || {};
            const poolData = trans.pool || {};
            rule._pools = Object.entries(poolData).map(([poolId, poolAttrs]) => ({
              id: parseInt(poolId) || poolId,
              description: poolAttrs.description || '',
              address: poolAttrs.address || '',
              port: poolAttrs.port || '',
              protocol: poolAttrs.protocol || '',
              disable: poolAttrs.disable ? true : false,
            }));
            rule._pools.sort((a, b) => a.id - b.id);

            return rule;
          });
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });
        }
      } catch (e) {
        showError(t('nat64.source.loadFailed'), e);
      } finally {
        loading.value = false;
      }
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.disable) value.disable = '';
      if (rule.matchMark) value.match = { mark: String(rule.matchMark) };

      if (rule.sourcePrefix) value.source = { prefix: rule.sourcePrefix };

      const trans = {};
      if (rule._pools && rule._pools.length) {
        const poolObj = {};
        for (const pool of rule._pools) {
          const pv = {};
          if (pool.description) pv.description = pool.description;
          if (pool.disable) pv.disable = '';
          if (pool.address) pv.address = pool.address;
          if (pool.port) pv.port = pool.port;
          if (pool.protocol) pv.protocol = { [pool.protocol]: '' };
          poolObj[pool.id] = pv;
        }
        trans.pool = poolObj;
      }
      if (Object.keys(trans).length) value.translation = trans;

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row, _pools: [...(row._pools || [])] };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: 1, _pools: [] };
        editingOriginalId.value = null;
      }
      selectedPools.value = [];
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: t('nat64.source.ruleNumberRequired') });
        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(t('nat64.source.saveFailed'), e);
      }
    }

    function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      pendingDeleteNames.value = [row.id];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const id of pendingDeleteNames.value) {
        try {
          await configStore.deleteConfig(`${path} rule ${id}`);
          configStore.markPending();
        } catch (e) {
          showError(t('nat64.source.deleteFailed'), e);
        }
      }
      pendingDeleteNames.value = [];
      await load();
    }

    // Pool handlers (within rule modal)
    function openPoolModal(row) {
      if (row) {
        editingPool.value = { ...row };
        editingPoolOriginalId.value = row.id;
      } else {
        const maxId = editingRule.value._pools.reduce((max, p) => Math.max(max, p.id), 0);
        editingPool.value = { id: maxId + 1 };
        editingPoolOriginalId.value = null;
      }
      poolModalVisible.value = true;
    }

    function savePool() {
      const pool = editingPool.value;
      if (!pool.id) return showError({ message: t('nat64.source.pool.poolIdRequired') });
      if (editingPoolOriginalId.value) {
        const idx = editingRule.value._pools.findIndex(p => p.id === editingPoolOriginalId.value);
        if (idx !== -1) editingRule.value._pools.splice(idx, 1, { ...pool });
      } else {
        editingRule.value._pools.push({ ...pool });
      }
      editingRule.value._pools.sort((a, b) => a.id - b.id);
      poolModalVisible.value = false;
    }

    function deletePool() {
      if (!selectedPools.value.length) return showError({ message: t('nat64.source.pool.selectPool') });
      editingRule.value._pools = editingRule.value._pools.filter(p => !selectedPools.value.includes(p.id));
      selectedPools.value = [];
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });
    watch(() => route.path, load);

    return {
      path, writeDisabled,
      rules, loading,
      modalVisible, editingRule, editingOriginalId,
      deleteModalVisible, pendingDeleteNames,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule, confirmRemove,
      poolModalVisible, editingPool, editingPoolOriginalId,
      poolSchema, poolColumns,
      currentRulePools, selectedPools,
      openPoolModal, savePool, deletePool,
      t,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal" @delete="deleteRule" />

      <!-- Rule Modal with embedded pool management -->
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? t('nat64.source.editRule') : t('nat64.source.createRule')" width="800px">
        <div style="margin-bottom:16px;">
          <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" />
        </div>
        <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('nat64.source.translationPool') }}</div>
          <div style="padding:16px;">
            <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="openPoolModal(null)">{{ t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" :disabled="selectedPools.length !== 1" @click="openPoolModal(currentRulePools.find(p => p.id === selectedPools[0]))">{{ t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" :disabled="!selectedPools.length" @click="deletePool">{{ t('app.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="poolColumns" :data="currentRulePools" v-model:selectedRowKeys="selectedPools" row-key="id" :selectable="true" :externalToolbar="true" />
          </div>
        </div>
        <template #footer>
          <button @click="modalVisible = false">{{ t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveRule">{{ t('app.confirm') }}</button>
        </template>
      </DraggableModal>

      <!-- Pool Modal -->
      <DraggableModal v-model:visible="poolModalVisible" :title="editingPoolOriginalId ? t('nat64.source.pool.editPool') : t('nat64.source.pool.createPool')" width="500px">
        <ConfigForm v-model="editingPool" :schema="poolSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="poolModalVisible = false">{{ t('app.cancel') }}</button>
          <button class="btn-primary" @click="savePool">{{ t('app.confirm') }}</button>
        </template>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('nat64.source.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="id in pendingDeleteNames" :key="id" style="padding:2px 0;">{{ id }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
