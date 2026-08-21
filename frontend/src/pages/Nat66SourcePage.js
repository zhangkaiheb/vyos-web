import { defineComponent, ref, computed, onMounted, watch, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'Nat66SourcePage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat66 source';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const ruleSchema = computed(() => [
      { key: 'id', title: t('nat66.source.field.ruleNumber'), type: 'number', min: 1, max: 999999, required: true, help: t('nat66.source.help.ruleNumber') },
      { key: 'description', title: t('nat66.source.field.description'), type: 'text' },
      { key: 'protocol', title: t('nat66.source.field.protocol'), type: 'text', placeholder: t('nat66.source.placeholder.protocol') },
      { key: 'sourcePrefix', title: t('nat66.source.field.sourcePrefix'), type: 'text', placeholder: t('nat66.source.placeholder.sourcePrefix') },
      { key: 'sourcePort', title: t('nat66.source.field.sourcePort'), type: 'text', placeholder: t('nat66.source.placeholder.sourcePort') },
      { key: 'destinationPrefix', title: t('nat66.source.field.destinationPrefix'), type: 'text', placeholder: t('nat66.source.placeholder.destinationPrefix') },
      { key: 'destinationPort', title: t('nat66.source.field.destinationPort'), type: 'text', placeholder: t('nat66.source.placeholder.destinationPort') },
      { key: 'outboundInterface', title: t('nat66.source.field.outboundInterface'), type: 'text', placeholder: t('nat66.source.placeholder.outboundInterface') },
      { key: 'translationAddress', title: t('nat66.source.field.translationAddress'), type: 'text', placeholder: t('nat66.source.placeholder.translationAddress') },
      { key: 'translationPort', title: t('nat66.source.field.translationPort'), type: 'text', placeholder: t('nat66.source.placeholder.translationPort') },
      { key: 'log', title: t('nat66.source.field.log'), type: 'checkbox' },
      { key: 'exclude', title: t('nat66.source.field.exclude'), type: 'checkbox', help: t('nat66.source.help.exclude') },
      { key: 'disable', title: t('nat66.source.field.disable'), type: 'checkbox' },
    ]);

    const ruleColumns = computed(() => [
      { key: 'id', title: t('nat66.source.column.ruleNumber') },
      { key: 'description', title: t('nat66.source.column.description') },
      { key: 'protocol', title: t('nat66.source.column.protocol') },
      { key: 'sourcePrefix', title: t('nat66.source.column.sourcePrefix') },
      { key: 'destinationPrefix', title: t('nat66.source.column.destinationPrefix') },
      { key: 'outboundInterface', title: t('nat66.source.column.outboundInterface') },
      { key: 'translationAddress', title: t('nat66.source.column.translationAddress') },
      { key: 'log', title: t('nat66.source.column.log') },
      { key: 'disable', title: t('nat66.source.column.disable') },
    ]);

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => ({
            id: parseInt(id) || id,
            ...flattenRule(attrs),
          }));
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });
        }
      } catch (e) {
        showError(t('nat66.source.loadFailed'), e);
      } finally {
        loading.value = false;
      }
    }

    function flattenRule(attrs) {
      const rule = {};
      if (attrs.description) rule.description = attrs.description;
      if (attrs.disable) rule.disable = true;
      if (attrs.exclude) rule.exclude = true;
      if (attrs.log) rule.log = true;
      if (attrs.protocol) rule.protocol = attrs.protocol;

      const src = attrs.source || {};
      if (src.prefix) rule.sourcePrefix = src.prefix;
      if (src.port) rule.sourcePort = src.port;

      const dst = attrs.destination || {};
      if (dst.prefix) rule.destinationPrefix = dst.prefix;
      if (dst.port) rule.destinationPort = dst.port;

      const trans = attrs.translation || {};
      if (trans.address) rule.translationAddress = trans.address;
      if (trans.port) rule.translationPort = trans.port;

      if (attrs['outbound-interface']) {
        rule.outboundInterface = attrs['outbound-interface'].name || '';
      }

      return rule;
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.disable) value.disable = '';
      if (rule.exclude) value.exclude = '';
      if (rule.log) value.log = '';
      if (rule.protocol) value.protocol = rule.protocol;

      const src = {};
      if (rule.sourcePrefix) src.prefix = rule.sourcePrefix;
      if (rule.sourcePort) src.port = rule.sourcePort;
      if (Object.keys(src).length) value.source = src;

      const dst = {};
      if (rule.destinationPrefix) dst.prefix = rule.destinationPrefix;
      if (rule.destinationPort) dst.port = rule.destinationPort;
      if (Object.keys(dst).length) value.destination = dst;

      const trans = {};
      if (rule.translationAddress) trans.address = rule.translationAddress;
      if (rule.translationPort) trans.port = rule.translationPort;
      if (Object.keys(trans).length) value.translation = trans;

      if (rule.outboundInterface) {
        value['outbound-interface'] = { name: rule.outboundInterface };
      }

      return value;
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
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: t('nat66.source.ruleNumberRequired') });
        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(t('nat66.source.saveFailed'), e);
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
          showError(t('nat66.source.deleteFailed'), e);
        }
      }
      pendingDeleteNames.value = [];
      await load();
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });
    watch(() => route.path, load);

    return {
      path, writeDisabled,
      rules, loading,
      modalVisible, editingRule, editingOriginalId,
      deleteModalVisible, pendingDeleteNames,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule, confirmRemove,
      t,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal" @delete="deleteRule" />
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? t('nat66.source.editRule') : t('nat66.source.createRule')" width="700px">
        <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" :editMode="!!editingOriginalId" />
        <template #footer>
          <button @click="modalVisible = false">{{ t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveRule">{{ t('app.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('nat66.source.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="id in pendingDeleteNames" :key="id" style="padding:2px 0;">{{ id }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
