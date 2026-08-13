import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'CgnatPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat cgnat';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const activeTab = ref('rules');
    const tabs = computed(() => [
      { key: 'rules', title: t('cgnat.tabs.rules') },
      { key: 'external', title: t('cgnat.tabs.external') },
      { key: 'internal', title: t('cgnat.tabs.internal') },
    ]);

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const ruleModalKey = ref(0);

    const logAllocation = ref(false);
    const extPools = ref([]);
    const intPools = ref([]);
    const poolModalVisible = ref(false);
    const poolModalKey = ref(0);
    const editingPool = ref(null);
    const editingPoolType = ref(null);
    const editingPoolOriginalName = ref(null);

    // Range sub-table
    const rangeRows = ref([]);
    const rangeModalVisible = ref(false);
    const rangeModalKey = ref(0);
    const editingRange = ref(null);
    const editingRangeIndex = ref(-1);

    // Delete confirmation modals
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const extPoolDeleteModalVisible = ref(false);
    const pendingDeleteExtPoolNames = ref([]);
    const intPoolDeleteModalVisible = ref(false);
    const pendingDeleteIntPoolNames = ref([]);

    const ruleSchema = computed(() => [
      { key: 'id', title: t('cgnat.schema.ruleId'), type: 'number', min: 1, max: 999999, required: true, help: t('cgnat.schema.ruleIdHelp') },
      { key: 'sourcePool', title: t('cgnat.schema.sourcePool'), type: 'select', required: true, help: t('cgnat.schema.sourcePoolHelp'),
        options: intPools.value.map(p => ({ value: p.name, label: p.name })) },
      { key: 'translationPool', title: t('cgnat.schema.translationPool'), type: 'select', required: true, help: t('cgnat.schema.translationPoolHelp'),
        options: extPools.value.map(p => ({ value: p.name, label: p.name })) },
    ]);

    const extPoolSchema = computed(() => [
      { key: 'name', title: t('cgnat.schema.poolName'), type: 'text', required: true, help: t('cgnat.schema.extPoolNameHelp') },
      { key: 'externalPortRange', title: t('cgnat.schema.externalPortRange'), type: 'text', placeholder: '1024-65535', help: t('cgnat.schema.externalPortRangeHelp') },
      { key: 'perUserLimitPort', title: t('cgnat.schema.perUserLimitPort'), type: 'number', min: 1, max: 65535, placeholder: '2000', help: t('cgnat.schema.perUserLimitPortHelp') },
    ]);

    const intPoolSchema = computed(() => [
      { key: 'name', title: t('cgnat.schema.poolName'), type: 'text', required: true, help: t('cgnat.schema.intPoolNameHelp') },
    ]);

    const ruleColumns = computed(() => [
      { key: 'id', title: t('cgnat.columns.ruleId') },
      { key: 'sourcePool', title: t('cgnat.columns.sourcePool') },
      { key: 'translationPool', title: t('cgnat.columns.translationPool') },
    ]);

    const rangeColumns = computed(() => [
      { key: 'range', title: t('cgnat.columns.ipRange') },
      { key: 'seq', title: t('cgnat.columns.seq') },
    ]);

    const poolColumns = computed(() => [
      { key: 'name', title: t('cgnat.columns.name') },
      { key: 'ranges', title: t('cgnat.columns.ranges') },
      { key: 'portRange', title: t('cgnat.columns.portRange') },
      { key: 'perUserLimit', title: t('cgnat.columns.perUserLimit') },
    ]);

    const intPoolColumns = computed(() => [
      { key: 'name', title: t('cgnat.columns.name') },
      { key: 'ranges', title: t('cgnat.columns.ranges') },
    ]);

    function formatRangeLines(ranges) {
      if (!ranges || !ranges.length) return '';
      return ranges.map(r => {
        if (r.seq !== null && r.seq !== undefined) return `${r.range} ${r.seq}`;
        return r.range;
      }).join('\n');
    }

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;

          logAllocation.value = !!raw['log-allocation'];

          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => {
            const rule = { id: parseInt(id) || id };
            const src = attrs.source || {};
            if (src.pool) rule.sourcePool = src.pool;
            const trans = attrs.translation || {};
            if (trans.pool) rule.translationPool = trans.pool;
            return rule;
          });
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });

          const poolData = raw.pool || {};
          const extPoolData = poolData.external || {};
          extPools.value = Object.entries(extPoolData).map(([name, attrs]) => {
            const pool = { name };
            if (attrs['external-port-range']) pool.portRange = attrs['external-port-range'];
            if (attrs['per-user-limit'] && attrs['per-user-limit'].port) pool.perUserLimit = attrs['per-user-limit'].port;
            const rangeObj = attrs.range || {};
            const rangeList = Object.entries(rangeObj).map(([addr, rAttrs]) => ({
              range: addr,
              seq: rAttrs?.seq !== undefined ? parseInt(rAttrs.seq) : null,
            }));
            pool.ranges = formatRangeLines(rangeList);
            return pool;
          });

          const intPoolData = poolData.internal || {};
          intPools.value = Object.entries(intPoolData).map(([name, attrs]) => {
            const pool = { name };
            const rangeVal = attrs.range;
            if (Array.isArray(rangeVal)) {
              pool.ranges = rangeVal.join('\n');
            } else if (typeof rangeVal === 'string') {
              pool.ranges = rangeVal;
            } else if (rangeVal && typeof rangeVal === 'object') {
              const rangeList = Object.keys(rangeVal);
              pool.ranges = rangeList.join('\n');
            } else {
              pool.ranges = '';
            }
            return pool;
          });
        }
      } catch (e) {
        showError(t('cgnat.loadFailed'), e);
      } finally {
        loading.value = false;
      }
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: 1 };
        editingOriginalId.value = null;
      }
      ruleModalKey.value++;
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: t('cgnat.errors.ruleIdRequired') });
        if (!rule.sourcePool) return showError({ message: t('cgnat.errors.sourcePoolRequired') });
        if (!rule.translationPool) return showError({ message: t('cgnat.errors.translationPoolRequired') });

        const value = {
          source: { pool: rule.sourcePool },
          translation: { pool: rule.translationPool },
        };

        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(t('cgnat.saveRuleFailed'), e);
      }
    }

    function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      pendingDeleteNames.value = [row.id];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      deleteModalVisible.value = false;
      for (const id of pendingDeleteNames.value) {
        try {
          await configStore.deleteConfig(`${path} rule ${id}`);
          configStore.markPending();
        } catch (e) {
          showError(t('cgnat.deleteRuleFailed'), e);
        }
      }
      pendingDeleteNames.value = [];
      await load();
    }

    async function openPoolModal(type, row) {
      editingPoolType.value = type;
      if (row) {
        editingPool.value = {
          name: row.name,
          externalPortRange: row.portRange || '',
          perUserLimitPort: row.perUserLimit || '',
        };
        editingPoolOriginalName.value = row.name;
        // Load ranges from row
        if (row.ranges) {
          rangeRows.value = row.ranges.split('\n').filter(Boolean).map(line => {
            const parts = line.trim().split(/\s+/);
            return { range: parts[0], seq: parts[1] ? parseInt(parts[1]) : null };
          });
        } else {
          rangeRows.value = [];
        }
      } else {
        editingPool.value = { name: '' };
        editingPoolOriginalName.value = null;
        rangeRows.value = [];
      }
      poolModalKey.value++;
      poolModalVisible.value = true;
    }

    function openRangeModal(index) {
      if (index >= 0) {
        editingRange.value = { ...rangeRows.value[index] };
        editingRangeIndex.value = index;
      } else {
        editingRange.value = { range: '', seq: '' };
        editingRangeIndex.value = -1;
      }
      rangeModalKey.value++;
      rangeModalVisible.value = true;
    }

    function saveRange() {
      const r = editingRange.value;
      if (!r.range) return showError({ message: t('cgnat.errors.ipRangeRequired') });
      const row = { range: r.range, seq: r.seq ? parseInt(r.seq) : null };
      if (editingRangeIndex.value >= 0) {
        rangeRows.value[editingRangeIndex.value] = row;
      } else {
        rangeRows.value.push(row);
      }
      rangeModalVisible.value = false;
    }

    function deleteRange(index) {
      rangeRows.value.splice(index, 1);
    }

    async function savePool() {
      try {
        const pool = editingPool.value;
        if (!pool.name) return showError({ message: t('cgnat.errors.poolNameRequired') });

        const poolType = editingPoolType.value;
        const value = {};

        if (poolType === 'external') {
          if (pool.externalPortRange) value['external-port-range'] = pool.externalPortRange;
          if (pool.perUserLimitPort) value['per-user-limit'] = { port: parseInt(pool.perUserLimitPort) };
        }

        // Build range from rangeRows
        if (rangeRows.value.length) {
          value.range = {};
          for (const r of rangeRows.value) {
            if (poolType === 'external') {
              value.range[r.range] = r.seq !== null ? { seq: r.seq } : {};
            } else {
              value.range[r.range] = {};
            }
          }
        }

        if (editingPoolOriginalName.value && editingPoolOriginalName.value !== pool.name) {
          await configStore.deleteConfig(`${path} pool ${poolType} ${editingPoolOriginalName.value}`);
        }
        await configStore.setConfig(`${path} pool ${poolType} ${pool.name}`, value);
        configStore.markPending();
        poolModalVisible.value = false;
        await load();
      } catch (e) {
        showError(t('cgnat.savePoolFailed'), e);
      }
    }

    function deleteExtPool(keys) {
      if (!keys || !keys.length) return;
      pendingDeleteExtPoolNames.value = keys;
      extPoolDeleteModalVisible.value = true;
    }

    async function confirmRemoveExtPool() {
      extPoolDeleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteExtPoolNames.value) {
          await configStore.deleteConfig(`${path} pool external ${name}`);
          configStore.markPending();
        }
        pendingDeleteExtPoolNames.value = [];
        await load();
      } catch (e) {
        showError(t('cgnat.deleteExternalPoolFailed'), e);
      }
    }

    function deleteIntPool(keys) {
      if (!keys || !keys.length) return;
      pendingDeleteIntPoolNames.value = keys;
      intPoolDeleteModalVisible.value = true;
    }

    async function confirmRemoveIntPool() {
      intPoolDeleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteIntPoolNames.value) {
          await configStore.deleteConfig(`${path} pool internal ${name}`);
          configStore.markPending();
        }
        pendingDeleteIntPoolNames.value = [];
        await load();
      } catch (e) {
        showError(t('cgnat.deleteInternalPoolFailed'), e);
      }
    }

    async function toggleLogAllocation() {
      try {
        if (logAllocation.value) {
          await configStore.setConfig(`${path} log-allocation`, {});
        } else {
          await configStore.deleteConfig(`${path} log-allocation`);
        }
      } catch (e) {
        showError(t('cgnat.setLoggingFailed'), e);
        logAllocation.value = !logAllocation.value;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });
    watch(() => route.path, load);

    return {
      t,
      path, writeDisabled,
      activeTab, tabs,
      logAllocation,
      rules, loading,
      modalVisible, editingRule, editingOriginalId, ruleModalKey,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule, confirmRemoveRule,
      deleteModalVisible, pendingDeleteNames,
      extPools, intPools,
      poolModalVisible, poolModalKey, editingPool, editingPoolType, editingPoolOriginalName,
      extPoolSchema, intPoolSchema, poolColumns, intPoolColumns,
      openPoolModal, savePool, deleteExtPool, deleteIntPool, confirmRemoveExtPool, confirmRemoveIntPool,
      extPoolDeleteModalVisible, pendingDeleteExtPoolNames,
      intPoolDeleteModalVisible, pendingDeleteIntPoolNames,
      rangeRows, rangeColumns,
      rangeModalVisible, rangeModalKey, editingRange, editingRangeIndex,
      openRangeModal, saveRange, deleteRange,
      toggleLogAllocation, load,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton, TabGroup },
  template: `
    <div class="page-container">
      <TabGroup :tabs="tabs" v-model="activeTab">
        <template #rules>
          <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                     rowKey="id" :actions="['create', 'edit', 'delete']"
                     @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule">
            <template #toolbar-left-extra>
              <label style="display:inline-flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
                <input type="checkbox" v-model="logAllocation" :disabled="writeDisabled" @change="toggleLogAllocation" />
                {{ t('cgnat.labels.logAllocation') }}
              </label>
            </template>
          </DataTable>
        </template>
        <template #external>
          <DataTable :columns="poolColumns" :data="extPools" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openPoolModal('external', null)"
                     @edit="openPoolModal('external', extPools.find(p => p.name === $event.name))"
                     @delete="deleteExtPool" />
        </template>
        <template #internal>
          <DataTable :columns="intPoolColumns" :data="intPools" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openPoolModal('internal', null)"
                     @edit="openPoolModal('internal', intPools.find(p => p.name === $event.name))"
                     @delete="deleteIntPool" />
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? t('cgnat.modals.editRule') : t('cgnat.modals.createRule')" width="600px" :key="ruleModalKey">
        <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="modalVisible = false">{{ t('common.buttons.cancel') }}</button>
          <button class="btn-primary" @click="saveRule">{{ t('common.buttons.confirm') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="poolModalVisible" :title="editingPoolOriginalName ? t('cgnat.modals.editPool') : t('cgnat.modals.createPool')" width="700px" :key="poolModalKey">
        <ConfigForm v-model="editingPool" :schema="editingPoolType === 'external' ? extPoolSchema : intPoolSchema" :showAdvanced="true" />
        <div style="margin-top:16px;">
          <div style="font-weight:600;margin-bottom:8px;">{{ t('cgnat.labels.ipRange') }}</div>
          <DataTable :columns="rangeColumns" :data="rangeRows" rowKey="range"
                     :actions="['create', 'edit', 'delete']"
                     @create="openRangeModal(-1)"
                     @edit="openRangeModal(rangeRows.findIndex(r => r.range === $event.range))"
                     @delete="deleteRange" />
        </div>
        <template #footer>
          <button @click="poolModalVisible = false">{{ t('common.buttons.cancel') }}</button>
          <button class="btn-primary" @click="savePool">{{ t('common.buttons.confirm') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="rangeModalVisible" :title="editingRangeIndex >= 0 ? t('cgnat.modals.editRange') : t('cgnat.modals.addRange')" width="500px" :key="rangeModalKey">
        <ConfigForm v-model="editingRange" :schema="[
          { key: 'range', title: t('cgnat.schema.ipRange'), type: 'text', required: true, placeholder: t('cgnat.schema.ipRangePlaceholder') },
          { key: 'seq', title: t('cgnat.schema.seq'), type: 'number', min: 1, max: 999999, placeholder: editingPoolType === 'external' ? t('cgnat.schema.seqRequired') : t('cgnat.schema.seqOptional'), help: editingPoolType === 'external' ? t('cgnat.schema.seqHelp') : t('cgnat.schema.seqHelpOptional') }
        ]" />
        <template #footer>
          <button @click="rangeModalVisible = false">{{ t('common.buttons.cancel') }}</button>
          <button class="btn-primary" @click="saveRange">{{ t('common.buttons.confirm') }}</button>
        </template>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('cgnat.modals.confirmDelete')" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('cgnat.messages.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="id in pendingDeleteNames" :key="id" style="padding:2px 0;">{{ id }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="extPoolDeleteModalVisible" :title="t('cgnat.modals.confirmDelete')" width="400px" @confirm="confirmRemoveExtPool">
        <div>{{ t('cgnat.messages.confirmDeleteExtPool') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteExtPoolNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="intPoolDeleteModalVisible" :title="t('cgnat.modals.confirmDelete')" width="400px" @confirm="confirmRemoveIntPool">
        <div>{{ t('cgnat.messages.confirmDeleteIntPool') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteIntPoolNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
