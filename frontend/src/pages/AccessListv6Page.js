import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const ACTION_OPTIONS = [
  { value: 'permit', label: 'permit' },
  { value: 'deny', label: 'deny' },
];

const IPV6_SOURCE_TYPES = [
  { value: 'any', label: 'any' },
  { value: 'exact-match', label: 'exact-match (精确匹配前缀)' },
  { value: 'network', label: 'network (IPv6 前缀)' },
];

const RULE_TABS = [
  { key: 'basic', title: '基本' },
  { key: 'source', title: '源' },
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
      { key: 'number', title: '访问列表名称' },
      { key: 'type', title: '类型' },
      { key: 'description', title: '描述' },
      { key: 'ruleCount', title: '规则数' },
    ];

    const ruleColumns = [
      { key: 'rule', title: '规则编号' },
      { key: 'action', title: '动作' },
      { key: 'source', title: '源' },
      { key: 'description', title: '描述' },
    ];

    const listSchema = computed(() => [
      {
        key: 'number',
        title: '访问列表名称',
        type: 'text',
        required: true,
        help: 'IPv6 访问列表名称（文本）',
      },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const sourceSchema = computed(() => [
      { key: 'type', title: '类型', type: 'select', options: IPV6_SOURCE_TYPES, default: 'any' },
      { key: 'network', title: 'IPv6 前缀', type: 'text', validate: 'ipv6', placeholder: '如 2001:db8::/64' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 65535, required: true, help: '范围 1-65535' },
      { key: 'action', title: '动作', type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
      source: [{ key: 'source', title: '源', type: 'group', children: sourceSchema.value }],
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
            type: 'IPv6 访问列表',
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

    function validateListName(name) {
      if (!name) return '请输入访问列表名称';
      return '';
    }

    async function saveList() {
      const err = validateListName(editingList.value.number);
      if (err) return showError({ message: err });
      const original = editingListOriginalNumber.value;
      if (!original && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: '访问列表名称已存在' });
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
      const err = validateListName(editingList.value.number);
      if (err) return showError({ message: err });
      if (!editingListOriginalNumber.value && lists.value.some(l => String(l.number) === String(editingList.value.number))) {
        return showError({ message: '访问列表名称已存在' });
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
      if (r.source?.type === 'network') {
        if (!r.source.network) return '请输入源 IPv6 前缀';
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
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
