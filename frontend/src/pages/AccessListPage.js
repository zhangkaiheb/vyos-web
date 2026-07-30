import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const ACTION_OPTIONS = [
  { value: 'permit', label: 'permit' },
  { value: 'deny', label: 'deny' },
];

const IPV4_SOURCE_DEST_TYPES = [
  { value: 'any', label: 'any' },
  { value: 'host', label: 'host' },
  { value: 'network', label: 'network + inverse-mask' },
];

const RULE_TABS = [
  { key: 'basic', title: '基本' },
  { key: 'source', title: '源' },
  { key: 'destination', title: '目的' },
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

function getListTypeLabel(number) {
  const type = getListType(number);
  const labels = {
    standard: '标准 (1-99)',
    extended: '扩展 (100-199)',
    'standard-expanded': '标准扩展 (1300-1999)',
    'extended-expanded': '扩展扩展 (2000-2699)',
    unknown: '未知',
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

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => {
      return !!editingList.value?.number;
    });

    const listColumns = [
      { key: 'number', title: '访问列表编号' },
      { key: 'type', title: '类型' },
      { key: 'description', title: '描述' },
      { key: 'ruleCount', title: '规则数' },
    ];

    const ruleColumns = [
      { key: 'rule', title: '规则编号' },
      { key: 'action', title: '动作' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'description', title: '描述' },
    ];

    const listSchema = computed(() => [
      {
        key: 'number',
        title: '访问列表编号',
        type: 'number',
        required: true,
        help: '标准：1-99、1300-1999；扩展：100-199、2000-2699',
      },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const sourceSchema = computed(() => [
      { key: 'type', title: '类型', type: 'select', options: IPV4_SOURCE_DEST_TYPES, default: 'any' },
      { key: 'host', title: '主机地址', type: 'text', validate: 'ipv4', placeholder: '如 192.168.1.1' },
      { key: 'network', title: '网络地址', type: 'text', validate: 'ipv4', placeholder: '如 192.168.0.0' },
      { key: 'inverse-mask', title: '反掩码', type: 'text', placeholder: '如 0.0.255.255', help: '通配符反掩码，每段取值 0/1/3/7/15/31/63/127/255' },
    ]);

    const destinationSchema = computed(() => [
      { key: 'type', title: '类型', type: 'select', options: IPV4_SOURCE_DEST_TYPES, default: 'any' },
      { key: 'host', title: '主机地址', type: 'text', validate: 'ipv4', placeholder: '如 192.168.1.1' },
      { key: 'network', title: '网络地址', type: 'text', validate: 'ipv4', placeholder: '如 192.168.0.0' },
      { key: 'inverse-mask', title: '反掩码', type: 'text', placeholder: '如 0.0.255.255', help: '通配符反掩码，每段取值 0/1/3/7/15/31/63/127/255' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 65535, required: true, help: '范围 1-65535' },
      { key: 'action', title: '动作', type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
      source: [{ key: 'source', title: '源', type: 'group', children: sourceSchema.value }],
      destination: [{ key: 'destination', title: '目的', type: 'group', children: destinationSchema.value }],
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
            type: getListTypeLabel(num),
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

    onMounted(load);
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
      if (!selectedListNumbers.value.length) return showError({ message: '请选择一个访问列表' });
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
      if (!selectedListNumbers.value.length) return showError({ message: '请选择一个访问列表' });
      if (!confirm('确认删除选中的访问列表及其所有规则？')) return;
      for (const num of selectedListNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${num}`);
      }
      await configStore.checkSessionChanged();
      selectedListNumbers.value = [];
      await load();
    }

    function validateListNumber(number) {
      if (!number) return '请输入访问列表编号';
      const n = parseInt(number, 10);
      if (isNaN(n)) return '请输入有效的访问列表编号';
      if ((n >= 1 && n <= 99) || (n >= 100 && n <= 199) || (n >= 1300 && n <= 1999) || (n >= 2000 && n <= 2699)) {
        return '';
      }
      return '编号必须在 1-99、100-199、1300-1999 或 2000-2699 范围内';
    }

    async function saveList() {
      const err = validateListNumber(editingList.value.number);
      if (err) return showError({ message: err });
      const original = editingListOriginalNumber.value;
      if (!original && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: '访问列表编号已存在' });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && String(original) !== String(editingList.value.number)) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              rules[r.rule] = formRuleToConfig(r);
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.number}`, newValue);
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.number}`, value);
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
        return showError({ message: '访问列表编号已存在' });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: '请选择一条规则' });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: '请选择一条规则' });
      if (!confirm('确认删除选中的规则？')) return;
      const listNum = editingList.value.number;
      for (const num of selectedRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listNum} rule ${num}`);
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      await loadListRules(listNum);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return '请输入规则编号';
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return '规则编号范围 1-65535';
      if (!r.action) return '请选择动作';
      if (r.source?.type === 'host') {
        if (!r.source.host) return '请输入源主机地址';
        if (!validIPv4Address(r.source.host)) return '源主机地址必须是 IPv4 地址';
      }
      if (r.source?.type === 'network') {
        if (!r.source.network || !r.source['inverse-mask']) return '请输入源网络地址和反掩码';
        if (!validIPv4Address(r.source.network)) return '源网络地址必须是 IPv4 地址';
        if (!validIPv4WildcardMask(r.source['inverse-mask'])) return '源反掩码格式无效，如 0.0.255.255';
      }
      if (r.destination?.type === 'host') {
        if (!r.destination.host) return '请输入目的主机地址';
        if (!validIPv4Address(r.destination.host)) return '目的主机地址必须是 IPv4 地址';
      }
      if (r.destination?.type === 'network') {
        if (!r.destination.network || !r.destination['inverse-mask']) return '请输入目的网络地址和反掩码';
        if (!validIPv4Address(r.destination.network)) return '目的网络地址必须是 IPv4 地址';
        if (!validIPv4WildcardMask(r.destination['inverse-mask'])) return '目的反掩码格式无效，如 0.0.255.255';
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
        return showError({ message: '规则编号已存在' });
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

    return {
      lists, loading, selectedListNumbers, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalNumber,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      listColumns, ruleColumns, listSchema, ruleTabs: RULE_TABS, ruleTabSchemas, displayRules,
      path, writeDisabled, canCreateRule,
      load, createList, editList, removeList, saveList, createRule, editRule, removeRule, saveRule,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNumbers.length || selectedListNumbers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNumbers.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNumbers = $event" :selectable="true" :externalToolbar="true" row-key="number">
        </DataTable>
      </div>
      <div class="section">
        <CommandPreview :path="path" />
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalNumber ? '编辑' : '创建'" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">规则</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">删除</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="displayRules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? '编辑规则' : '创建规则'" width="780px" @confirm="saveRule" modal-class="on-top">
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
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
