import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const ACTION_OPTIONS = [
  { value: 'permit', label: 'permit' },
  { value: 'deny', label: 'deny' },
];



function normalizeValue(val) {
  if (Array.isArray(val) && val.length) return val[0];
  return val || '';
}

function endpointToForm(ep) {
  const empty = { type: 'any', network: '' };
  if (!ep || typeof ep !== 'object') return empty;
  if (ep.any !== undefined) return empty;
  if (ep['exact-match'] !== undefined) {
    return { type: 'exact-match', network: '' };
  }
  if (ep.network) {
    return { type: 'network', network: normalizeValue(ep.network) };
  }
  return empty;
}

function endpointToConfig(formEp) {
  switch (formEp?.type) {
    case 'exact-match':
      return { 'exact-match': '' };
    case 'network':
      return formEp.network ? { network: formEp.network } : {};
    case 'any':
    default:
      return { any: '' };
  }
}

function formatFormEndpoint(formEp) {
  if (!formEp || typeof formEp !== 'object') return '';
  if (formEp.type === 'any') return 'any';
  if (formEp.type === 'exact-match') return 'exact-match';
  if (formEp.type === 'network') return formEp.network ? `network ${formEp.network}` : '';
  return '';
}

function configRulesToForm(rawRules) {
  if (!rawRules || typeof rawRules !== 'object') return [];
  return Object.entries(rawRules).map(([num, attrs]) => ({
    rule: num,
    action: attrs.action || '',
    description: attrs.description || '',
    source: endpointToForm(attrs.source),
  }));
}

function formRuleToConfig(item) {
  const result = {
    action: item.action,
    source: endpointToConfig(item.source),
  };
  if (item.description) result.description = item.description;
  return result;
}

export default defineComponent({
  name: 'AccessListv6Page',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const lists = ref([]);
    const loading = ref(false);
    const selectedListNumbers = ref([]);
    const selectedRuleNumbers = ref([]);

    const listModalVisible = ref(false);
    const editingList = ref(null);
    const editingListOriginalNumber = ref('');

    const ruleModalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleOriginalNumber = ref('');
    const ruleActiveTab = ref('basic');

    const deleteModalVisible = ref(false);
    const pendingDeleteNumbers = ref([]);
    const ruleDeleteModalVisible = ref(false);
    const pendingDeleteRuleNumbers = ref([]);

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => {
      return !!editingList.value?.number;
    });

    const ipv6SourceTypes = computed(() => [
      { value: 'any', label: 'any' },
      { value: 'exact-match', label: `exact-match (${t('accesslistv6.sourceTypes.exactMatch')})` },
      { value: 'network', label: `network (${t('accesslistv6.sourceTypes.network')})` },
    ]);

    const ruleTabs = computed(() => [
      { key: 'basic', title: t('accesslistv6.tabs.basic') },
      { key: 'source', title: t('accesslistv6.tabs.source') },
    ]);

    const listColumns = computed(() => [
      { key: 'number', title: t('accesslistv6.columns.listName') },
      { key: 'type', title: t('accesslistv6.columns.type') },
      { key: 'description', title: t('accesslistv6.columns.description') },
      { key: 'ruleCount', title: t('accesslistv6.columns.ruleCount') },
    ]);

    const ruleColumns = computed(() => [
      { key: 'rule', title: t('accesslistv6.columns.ruleNumber') },
      { key: 'action', title: t('accesslistv6.columns.action') },
      { key: 'source', title: t('accesslistv6.columns.source') },
      { key: 'description', title: t('accesslistv6.columns.description') },
    ]);

    const listSchema = computed(() => [
      {
        key: 'number',
        title: t('accesslistv6.columns.listName'),
        type: 'text',
        required: true,
        help: t('accesslistv6.help.listName'),
      },
      { key: 'description', title: t('accesslistv6.columns.description'), type: 'text' },
    ]);

    const sourceSchema = computed(() => [
      { key: 'type', title: t('accesslistv6.columns.type'), type: 'select', options: ipv6SourceTypes.value, default: 'any' },
      { key: 'network', title: t('accesslistv6.columns.ipv6Prefix'), type: 'text', validate: 'ipv6', placeholder: t('accesslistv6.placeholder.ipv6Prefix') },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: t('accesslistv6.columns.ruleNumber'), type: 'number', min: 1, max: 65535, required: true, help: t('accesslistv6.help.ruleRange') },
      { key: 'action', title: t('accesslistv6.columns.action'), type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: t('accesslistv6.columns.description'), type: 'text' },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
      source: [{ key: 'source', title: t('accesslistv6.columns.source'), type: 'group', children: sourceSchema.value }],
    }));

    const displayRules = computed(() => {
      return (editingList.value?.rules || []).map(r => ({
        ...r,
        source: formatFormEndpoint(r.source),
      }));
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        const raw = res.data || {};
        const result = [];
        for (const [num, attrs] of Object.entries(raw)) {
          const rules = attrs.rule || {};
          result.push({
            id: num,
            number: num,
            description: attrs.description || '',
            type: t('accesslistv6.typeLabel'),
            ruleCount: Object.keys(rules).length,
            rules,
          });
        }
        result.sort((a, b) => String(a.number).localeCompare(String(b.number)));
        lists.value = result;
        if (selectedListNumbers.value.length && !result.some(l => String(l.number) === String(selectedListNumbers.value[0]))) {
          selectedListNumbers.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });
    watch(() => route.path, () => {
      selectedListNumbers.value = [];
      selectedRuleNumbers.value = [];
      load();
    });

    function emptyList() {
      return { number: '', description: '', rules: [] };
    }

    function emptyRule() {
      return {
        rule: '',
        action: '',
        description: '',
        source: { type: 'any', network: '' },
      };
    }

    async function loadListRules(listNum) {
      try {
        const res = await configStore.getConfig(`${path.value} ${listNum} rule`, true);
        editingList.value.rules = configRulesToForm(res.data || {});
      } catch (e) {
        showError(e);
      }
    }

    function createList() {
      editingList.value = emptyList();
      editingListOriginalNumber.value = '';
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    async function editList() {
      if (!selectedListNumbers.value.length) return showError({ message: t('accesslistv6.messages.selectList') });
      const list = lists.value.find(l => String(l.number) === String(selectedListNumbers.value[0]));
      if (!list) return;
      editingList.value = {
        number: list.number,
        description: list.description,
        rules: configRulesToForm(list.rules),
      };
      editingListOriginalNumber.value = list.number;
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    async function removeList() {
      if (!selectedListNumbers.value.length) return showError({ message: t('accesslistv6.messages.selectList') });
      pendingDeleteNumbers.value = [...selectedListNumbers.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveList() {
      deleteModalVisible.value = false;
      for (const num of pendingDeleteNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedListNumbers.value = [];
      pendingDeleteNumbers.value = [];
      await load();
    }

    function validateListName(name) {
      if (!name) return t('accesslistv6.validation.enterListName');
      return '';
    }

    async function saveList() {
      const err = validateListName(editingList.value.number);
      if (err) return showError({ message: err });
      const original = editingListOriginalNumber.value;
      if (!original && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: t('accesslistv6.validation.listNameExists') });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && String(original) !== String(editingList.value.number)) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          configStore.markPending();
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              rules[r.rule] = formRuleToConfig(r);
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.number}`, newValue);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.number}`, value);
          configStore.markPending();
        }
        listModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function createRule() {
      if (!editingList.value) return;
      const err = validateListName(editingList.value.number);
      if (err) return showError({ message: err });
      if (!editingListOriginalNumber.value && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: t('accesslistv6.validation.listNameExists') });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('accesslistv6.messages.selectRule') });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('accesslistv6.messages.selectRule') });
      pendingDeleteRuleNumbers.value = [...selectedRuleNumbers.value];
      ruleDeleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      ruleDeleteModalVisible.value = false;
      const listNum = editingList.value.number;
      for (const num of pendingDeleteRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listNum} rule ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      pendingDeleteRuleNumbers.value = [];
      await loadListRules(listNum);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return t('accesslistv6.validation.enterRuleNumber');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('accesslistv6.validation.ruleNumberRange');
      if (!r.action) return t('accesslistv6.validation.selectAction');
      if (r.source?.type === 'network') {
        if (!r.source.network) return t('accesslistv6.validation.enterSourceIpv6Prefix');
      }
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      if (!editingList.value) return;
      const listNum = editingList.value.number;
      const original = editingRuleOriginalNumber.value;
      if (!original && editingList.value.rules.some(r => String(r.rule) === String(editingRule.value.rule))) {
        return showError({ message: t('accesslistv6.validation.ruleNumberExists') });
      }
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listNum} rule ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} ${listNum} rule ${editingRule.value.rule}`, value);
        configStore.markPending();
        ruleModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
        if (listModalVisible.value) {
          await loadListRules(listNum);
        }
      } catch (e) {
        showError(e);
      }
    }

    return {
      t,
      lists, loading, selectedListNumbers, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalNumber,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      deleteModalVisible, pendingDeleteNumbers, ruleDeleteModalVisible, pendingDeleteRuleNumbers,
      listColumns, ruleColumns, listSchema, ruleTabs, ruleTabSchemas, displayRules,
      path, writeDisabled, canCreateRule,
      load, createList, editList, removeList, confirmRemoveList, saveList, createRule, editRule, removeRule, confirmRemoveRule, saveRule,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">{{ t('accesslistv6.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNumbers.length || selectedListNumbers.length > 1">{{ t('accesslistv6.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNumbers.length">{{ t('accesslistv6.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('accesslistv6.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNumbers = $event" :selectable="true" :externalToolbar="true" row-key="number">
        </DataTable>
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalNumber ? t('accesslistv6.modals.editList') : t('accesslistv6.modals.createList')" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">{{ t('accesslistv6.sections.rules') }}</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">{{ t('accesslistv6.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">{{ t('accesslistv6.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">{{ t('accesslistv6.buttons.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="displayRules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? t('accesslistv6.modals.editRule') : t('accesslistv6.modals.createRule')" width="780px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #source>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.source" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('accesslistv6.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveList">
        <div>{{ t('accesslistv6.messages.confirmDeleteList') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleDeleteModalVisible" :title="t('accesslistv6.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('accesslistv6.messages.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteRuleNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
