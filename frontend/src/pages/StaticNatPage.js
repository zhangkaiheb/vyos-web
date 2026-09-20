import { defineComponent, ref, computed, onMounted, watch, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'StaticNatPage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat static';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const modalKey = ref(0);
    const interfaces = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteRuleId = ref('');

    const tabs = computed(() => [
      { key: 'basic', title: t('staticNat.tab.basic') },
      { key: 'match', title: t('staticNat.tab.match') },
      { key: 'translation', title: t('staticNat.tab.translation') },
    ]);
    const activeTab = ref('basic');

    const tabSchemas = computed(() => ({
      basic: [
        { key: 'id', title: t('staticNat.field.ruleNumber'), type: 'text', required: true, help: t('staticNat.help.ruleNumber') },
        { key: 'description', title: t('staticNat.field.description'), type: 'text', help: t('staticNat.help.description') },
        { key: 'log', title: t('staticNat.field.log'), type: 'checkbox', defaultValue: false, help: t('staticNat.help.log') },
      ],
      match: [
        { key: 'destinationAddress', title: t('staticNat.field.destinationAddress'), type: 'text', placeholder: t('staticNat.placeholder.destinationAddress'), help: t('staticNat.help.destinationAddress') },
        { key: 'inboundInterface', title: t('staticNat.field.inboundInterface'), type: 'select', placeholder: t('staticNat.placeholder.inboundInterface'), help: t('staticNat.help.inboundInterface'),
          options: ['any', ...interfaces.value] },
      ],
      translation: [
        { key: 'translationAddress', title: t('staticNat.field.translationAddress'), type: 'text', placeholder: t('staticNat.placeholder.translationAddress'), help: t('staticNat.help.translationAddress') },
      ],
    }));

    const columns = computed(() => [
      { key: 'id', title: t('staticNat.column.ruleNumber') },
      { key: 'description', title: t('staticNat.column.description') },
      { key: 'destinationAddress', title: t('staticNat.column.destinationAddress') },
      { key: 'inboundInterface', title: t('staticNat.column.inboundInterface') },
      { key: 'translationAddress', title: t('staticNat.column.translationAddress') },
      { key: 'log', title: t('staticNat.column.log') },
    ]);

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => ({
            id: id,
            ...flattenRule(attrs),
          }));
        }
      } catch (e) {
        showError(t('staticNat.loadFailed'), e);
      } finally {
        loading.value = false;
      }
    }

    function flattenRule(attrs) {
      const rule = {};
      if (attrs.description) rule.description = attrs.description;
      if (attrs.log) rule.log = true;

      const dst = attrs.destination || {};
      if (dst.address) rule.destinationAddress = dst.address;

      const trans = attrs.translation || {};
      if (trans.address) rule.translationAddress = trans.address;

      if (attrs['inbound-interface']) {
        rule.inboundInterface = attrs['inbound-interface'];
      }

      return rule;
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.log) value.log = '';

      const dst = {};
      if (rule.destinationAddress) dst.address = rule.destinationAddress;
      if (Object.keys(dst).length) value.destination = dst;

      const trans = {};
      if (rule.translationAddress) trans.address = rule.translationAddress;
      if (Object.keys(trans).length) value.translation = trans;

      if (rule.inboundInterface) {
        value['inbound-interface'] = rule.inboundInterface;
      }

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: '' };
        editingOriginalId.value = null;
      }
      modalKey.value++;
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: t('staticNat.ruleNumberRequired') });
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
        showError(t('staticNat.saveFailed'), e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      pendingDeleteRuleId.value = row.id;
      deleteModalVisible.value = true;
    }

    async function confirmDeleteRule() {
      deleteModalVisible.value = false;
      try {
        await configStore.deleteConfig(`${path} rule ${pendingDeleteRuleId.value}`);
        configStore.markPending();
        pendingDeleteRuleId.value = '';
        await load();
      } catch (e) {
        showError(t('staticNat.deleteFailed'), e);
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name || i).filter(Boolean);
      } catch (e) {
        interfaces.value = [];
      }
    }

    onMounted(() => { load(); loadInterfaces(); onMenuRefresh(load); window.addEventListener('config-committed', load); });
    watch(() => route.path, () => { load(); loadInterfaces(); });

    return { path, writeDisabled, rules, loading, modalVisible, modalKey, editingRule, editingOriginalId, tabs, activeTab, tabSchemas, columns, openModal, saveRule, deleteRule, deleteModalVisible, pendingDeleteRuleId, confirmDeleteRule, load, t };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule" />
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? t('staticNat.editRule') : t('staticNat.createRule')" width="820px" :key="modalKey" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="editingRule" :schema="tabSchemas[tab.key]" :showAdvanced="true" :formKey="'static_nat_rule_' + tab.key" :editMode="!!editingOriginalId" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('config.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteRule">
        <div>{{ t('staticNat.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteRuleId }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
