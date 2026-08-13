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

const IPV4_SOURCE_DEST_TYPES = [
  { value: 'any', label: 'any' },
  { value: 'host', label: 'host' },
  { value: 'network', label: 'network + inverse-mask' },
];

function normalizeValue(val) {
  if (Array.isArray(val) && val.length) return val[0];
  return val || '';
}

function validIPv4Address(ip) {
  return /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(ip);
}

function validIPv4WildcardMask(mask) {
  if (!validIPv4Address(mask)) return false;
  return mask.split('.').every(octet => [0, 1, 3, 7, 15, 31, 63, 127, 255].includes(parseInt(octet, 10)));
}

function getListType(number) {
  const n = parseInt(number, 10);
  if (n >= 1 && n <= 99) return 'standard';
  if (n >= 100 && n <= 199) return 'extended';
  if (n >= 1300 && n <= 1999) return 'standard-expanded';
  if (n >= 2000 && n <= 2699) return 'extended-expanded';
  return 'unknown';
}

function getListTypeLabel(number, t) {
  const type = getListType(number);
  const labels = {
    standard: t('accesslist.types.standard'),
    extended: t('accesslist.types.extended'),
    'standard-expanded': t('accesslist.types.standardExpanded'),
    'extended-expanded': t('accesslist.types.extendedExpanded'),
    unknown: t('accesslist.types.unknown'),
  };
  return labels[type] || type;
}

function endpointToForm(ep) {
  const empty = { type: 'any', host: '', network: '', 'inverse-mask': '' };
  if (!ep || typeof ep !== 'object') return empty;
  if (ep.any !== undefined) return empty;
  if (ep.host) {
    return { type: 'host', host: normalizeValue(ep.host), network: '', 'inverse-mask': '' };
  }
  if (ep.network) {
    return {
      type: 'network',
      host: '',
      network: normalizeValue(ep.network),
      'inverse-mask': normalizeValue(ep['inverse-mask']),
    };
  }
  return empty;
}

function endpointToConfig(formEp) {
  switch (formEp?.type) {
    case 'host':
      return formEp.host ? { host: formEp.host } : {};
    case 'network':
      return formEp.network || formEp['inverse-mask']
        ? { network: formEp.network || '', 'inverse-mask': formEp['inverse-mask'] || '' }
        : {};
    case 'any':
    default:
      return { any: '' };
  }
}

function formatFormEndpoint(formEp) {
  if (!formEp || typeof formEp !== 'object') return '';
  if (formEp.type === 'any') return 'any';
  if (formEp.type === 'host') return formEp.host ? `host ${formEp.host}` : '';
  if (formEp.type === 'network') {
    return `network ${formEp.network || ''} ${formEp['inverse-mask'] || ''}`.trim();
  }
  return '';
}

function configRulesToForm(rawRules) {
  if (!rawRules || typeof rawRules !== 'object') return [];
  return Object.entries(rawRules).map(([num, attrs]) => ({
    rule: num,
    action: attrs.action || '',
    description: attrs.description || '',
    source: endpointToForm(attrs.source),
    destination: endpointToForm(attrs.destination),
  }));
}

function formRuleToConfig(item) {
  const result = {
    action: item.action,
    source: endpointToConfig(item.source),
    destination: endpointToConfig(item.destination),
  };
  if (item.description) result.description = item.description;
  return result;
}

export default defineComponent({
  name: 'AccessListPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();

    const RULE_TABS = [
      { key: 'basic', title: t('accesslist.tabs.basic') },
      { key: 'source', title: t('accesslist.tabs.source') },
      { key: 'destination', title: t('accesslist.tabs.destination') },
    ];
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

    const listColumns = [
      { key: 'number', title: t('accesslist.columns.number') },
      { key: 'type', title: t('accesslist.columns.type') },
      { key: 'description', title: t('accesslist.columns.description') },
      { key: 'ruleCount', title: t('accesslist.columns.ruleCount') },
    ];

    const ruleColumns = [
      { key: 'rule', title: t('accesslist.ruleColumns.rule') },
      { key: 'action', title: t('accesslist.ruleColumns.action') },
      { key: 'source', title: t('accesslist.ruleColumns.source') },
      { key: 'destination', title: t('accesslist.ruleColumns.destination') },
      { key: 'description', title: t('accesslist.ruleColumns.description') },
    ];

    const listSchema = computed(() => [
      {
        key: 'number',
        title: t('accesslist.form.number'),
        type: 'number',
        required: true,
        help: t('accesslist.form.numberHelp'),
      },
      { key: 'description', title: t('accesslist.form.description'), type: 'text' },
    ]);

    const sourceSchema = computed(() => [
      { key: 'type', title: t('accesslist.form.type'), type: 'select', options: IPV4_SOURCE_DEST_TYPES, default: 'any' },
      { key: 'host', title: t('accesslist.form.host'), type: 'text', validate: 'ipv4', placeholder: t('accesslist.form.hostPlaceholder') },
      { key: 'network', title: t('accesslist.form.network'), type: 'text', validate: 'ipv4', placeholder: t('accesslist.form.networkPlaceholder') },
      { key: 'inverse-mask', title: t('accesslist.form.inverseMask'), type: 'text', placeholder: t('accesslist.form.inverseMaskPlaceholder'), help: t('accesslist.form.inverseMaskHelp') },
    ]);

    const destinationSchema = computed(() => [
      { key: 'type', title: t('accesslist.form.type'), type: 'select', options: IPV4_SOURCE_DEST_TYPES, default: 'any' },
      { key: 'host', title: t('accesslist.form.host'), type: 'text', validate: 'ipv4', placeholder: t('accesslist.form.hostPlaceholder') },
      { key: 'network', title: t('accesslist.form.network'), type: 'text', validate: 'ipv4', placeholder: t('accesslist.form.networkPlaceholder') },
      { key: 'inverse-mask', title: t('accesslist.form.inverseMask'), type: 'text', placeholder: t('accesslist.form.inverseMaskPlaceholder'), help: t('accesslist.form.inverseMaskHelp') },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: t('accesslist.form.rule'), type: 'number', min: 1, max: 65535, required: true, help: t('accesslist.form.ruleHelp') },
      { key: 'action', title: t('accesslist.form.action'), type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: t('accesslist.form.description'), type: 'text' },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
      source: [{ key: 'source', title: t('accesslist.form.source'), type: 'group', children: sourceSchema.value }],
      destination: [{ key: 'destination', title: t('accesslist.form.destination'), type: 'group', children: destinationSchema.value }],
    }));

    const displayRules = computed(() => {
      return (editingList.value?.rules || []).map(r => ({
        ...r,
        source: formatFormEndpoint(r.source),
        destination: formatFormEndpoint(r.destination),
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
            type: getListTypeLabel(num, t),
            ruleCount: Object.keys(rules).length,
            rules,
          });
        }
        result.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
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
        source: { type: 'any', host: '', network: '', 'inverse-mask': '' },
        destination: { type: 'any', host: '', network: '', 'inverse-mask': '' },
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
      if (!selectedListNumbers.value.length) return showError({ message: t('accesslist.messages.selectList') });
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
      if (!selectedListNumbers.value.length) return showError({ message: t('accesslist.messages.selectList') });
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

    function validateListNumber(number) {
      if (!number) return t('accesslist.validation.numberRequired');
      const n = parseInt(number, 10);
      if (isNaN(n)) return t('accesslist.validation.numberInvalid');
      if ((n >= 1 && n <= 99) || (n >= 100 && n <= 199) || (n >= 1300 && n <= 1999) || (n >= 2000 && n <= 2699)) {
        return '';
      }
      return t('accesslist.validation.numberRange');
    }

    async function saveList() {
      const err = validateListNumber(editingList.value.number);
      if (err) return showError({ message: err });
      const original = editingListOriginalNumber.value;
      if (!original && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: t('accesslist.validation.numberExists') });
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
      const err = validateListNumber(editingList.value.number);
      if (err) return showError({ message: err });
      if (!editingListOriginalNumber.value && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: t('accesslist.validation.numberExists') });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('accesslist.messages.selectRule') });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('accesslist.messages.selectRule') });
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
      if (!r.rule) return t('accesslist.ruleValidation.ruleRequired');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('accesslist.ruleValidation.ruleRange');
      if (!r.action) return t('accesslist.ruleValidation.actionRequired');
      if (r.source?.type === 'host') {
        if (!r.source.host) return t('accesslist.ruleValidation.sourceHostRequired');
        if (!validIPv4Address(r.source.host)) return t('accesslist.ruleValidation.sourceHostInvalid');
      }
      if (r.source?.type === 'network') {
        if (!r.source.network || !r.source['inverse-mask']) return t('accesslist.ruleValidation.sourceNetworkRequired');
        if (!validIPv4Address(r.source.network)) return t('accesslist.ruleValidation.sourceNetworkInvalid');
        if (!validIPv4WildcardMask(r.source['inverse-mask'])) return t('accesslist.ruleValidation.sourceMaskInvalid');
      }
      if (r.destination?.type === 'host') {
        if (!r.destination.host) return t('accesslist.ruleValidation.destHostRequired');
        if (!validIPv4Address(r.destination.host)) return t('accesslist.ruleValidation.destHostInvalid');
      }
      if (r.destination?.type === 'network') {
        if (!r.destination.network || !r.destination['inverse-mask']) return t('accesslist.ruleValidation.destNetworkRequired');
        if (!validIPv4Address(r.destination.network)) return t('accesslist.ruleValidation.destNetworkInvalid');
        if (!validIPv4WildcardMask(r.destination['inverse-mask'])) return t('accesslist.ruleValidation.destMaskInvalid');
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
        return showError({ message: t('accesslist.ruleValidation.ruleExists') });
      }
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listNum} rule ${original}`);
        }
        await configStore.setConfig(`${path.value} ${listNum} rule ${editingRule.value.rule}`, value);
        ruleModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
        // After load(), refresh the modal's rule table with parsed form data
        if (listModalVisible.value) {
          await loadListRules(listNum);
        }
      } catch (e) {
        showError(e);
      }
    }

    return {t,
      
      lists, loading, selectedListNumbers, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalNumber,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      deleteModalVisible, pendingDeleteNumbers, ruleDeleteModalVisible, pendingDeleteRuleNumbers,
      listColumns, ruleColumns, listSchema, ruleTabs: RULE_TABS, ruleTabSchemas, displayRules,
      path, writeDisabled, canCreateRule,
      load, createList, editList, removeList, confirmRemoveList, saveList, createRule, editRule, removeRule, confirmRemoveRule, saveRule,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">{{ t('accesslist.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNumbers.length || selectedListNumbers.length > 1">{{ t('accesslist.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNumbers.length">{{ t('accesslist.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('accesslist.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNumbers = $event" :selectable="true" :externalToolbar="true" row-key="number">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalNumber ? t('accesslist.modals.editList') : t('accesslist.modals.createList')" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">{{ t('accesslist.sections.rules') }}</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">{{ t('accesslist.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">{{ t('accesslist.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">{{ t('accesslist.buttons.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="displayRules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? t('accesslist.modals.editRule') : t('accesslist.modals.createRule')" width="780px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #source>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.source" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #destination>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.destination" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('accesslist.modals.confirmDelete')" width="400px" @confirm="confirmRemoveList">
        <div>{{ t('accesslist.modals.confirmDeleteList') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleDeleteModalVisible" :title="t('accesslist.modals.confirmDelete')" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('accesslist.modals.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteRuleNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
