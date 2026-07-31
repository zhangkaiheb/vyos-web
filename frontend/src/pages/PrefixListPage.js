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

const RULE_TABS = [
  { key: 'basic', title: '基本' },
];

export default defineComponent({
  name: 'PrefixListPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const lists = ref([]);
    const loading = ref(false);
    const selectedListNames = ref([]);
    const selectedRuleNumbers = ref([]);

    const listModalVisible = ref(false);
    const editingList = ref(null);
    const editingListOriginalName = ref('');

    const ruleModalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleOriginalNumber = ref('');
    const ruleActiveTab = ref('basic');

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => {
      return !!editingList.value?.name;
    });

    const listColumns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
      { key: 'ruleCount', title: '规则数' },
    ];

    const ruleColumns = [
      { key: 'rule', title: '规则编号' },
      { key: 'action', title: '动作' },
      { key: 'prefix', title: '前缀' },
      { key: 'ge', title: 'GE' },
      { key: 'le', title: 'LE' },
      { key: 'description', title: '描述' },
    ];

    const listSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: p01' },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 65535, required: true, help: '范围 1-65535' },
      { key: 'action', title: '动作', type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'prefix', title: '前缀', type: 'text', placeholder: '例如: 192.168.0.0/16' },
      { key: 'ge', title: 'GE', type: 'number', min: 0, max: 32, placeholder: '0-32', help: '前缀长度大于等于' },
      { key: 'le', title: 'LE', type: 'number', min: 0, max: 32, placeholder: '0-32', help: '前缀长度小于等于' },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
    }));

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        const raw = res.data || {};
        const result = [];
        for (const [name, attrs] of Object.entries(raw)) {
          const rules = attrs.rule || {};
          result.push({
            id: name, name,
            description: attrs.description || '',
            ruleCount: Object.keys(rules).length,
            rules,
          });
        }
        result.sort((a, b) => a.name.localeCompare(b.name));
        lists.value = result;
        if (selectedListNames.value.length && !result.some(l => l.name === selectedListNames.value[0])) {
          selectedListNames.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    watch(() => route.path, () => {
      selectedListNames.value = [];
      selectedRuleNumbers.value = [];
      load();
    });

    function emptyList() { return { name: '', description: '', rules: [] }; }
    function emptyRule() { return { rule: '', action: '', prefix: '', ge: '', le: '', description: '' }; }

    async function loadListRules(listName) {
      try {
        const res = await configStore.getConfig(`${path.value} ${listName} rule`, true);
        const raw = res.data || {};
        editingList.value.rules = Object.entries(raw).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', prefix: attrs.prefix || '',
          ge: attrs.ge || '', le: attrs.le || '', description: attrs.description || '',
        }));
      } catch (e) { showError(e); }
    }

    function createList() { editingList.value = emptyList(); editingListOriginalName.value = ''; selectedRuleNumbers.value = []; listModalVisible.value = true; }

    async function editList() {
      if (!selectedListNames.value.length) return showError({ message: '请选择一个前缀列表' });
      if (selectedListNames.value.length > 1) return showError({ message: '请选择一个前缀列表' });
      const list = lists.value.find(l => l.name === selectedListNames.value[0]);
      if (!list) return;
      editingList.value = {
        name: list.name, description: list.description,
        rules: Object.entries(list.rules).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', prefix: attrs.prefix || '',
          ge: attrs.ge || '', le: attrs.le || '', description: attrs.description || '',
        })),
      };
      editingListOriginalName.value = list.name;
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    async function removeList() {
      if (!selectedListNames.value.length) return showError({ message: '请选择一个前缀列表' });
      if (!confirm('确认删除选中的前缀列表及其所有规则？')) return;
      for (const name of selectedListNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedListNames.value = [];
      await load();
    }

    async function saveList() {
      if (!editingList.value.name) return showError({ message: '请输入名称' });
      const original = editingListOriginalName.value;
      if (!original && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && original !== editingList.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              const ruleObj = { action: r.action || '' };
              if (r.prefix) ruleObj.prefix = r.prefix;
              if (r.ge) ruleObj.ge = r.ge;
              if (r.le) ruleObj.le = r.le;
              if (r.description) ruleObj.description = r.description;
              rules[r.rule] = ruleObj;
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, newValue);
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, value);
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
      if (!editingList.value.name) return showError({ message: '请先输入名称' });
      if (!editingListOriginalName.value && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: '名称已存在' });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: '请选择一条规则' });
      if (selectedRuleNumbers.value.length > 1) return showError({ message: '请选择一条规则' });
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
      const listName = editingList.value.name;
      for (const num of selectedRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listName} rule ${num}`);
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      await loadListRules(listName);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return '请输入规则编号';
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return '规则编号范围 1-65535';
      if (!r.action) return '请选择动作';
      if (!r.prefix) return '请输入前缀';
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      if (!editingList.value) return;
      const listName = editingList.value.name;
      const original = editingRuleOriginalNumber.value;
      if (!original && editingList.value.rules.some(r => String(r.rule) === String(editingRule.value.rule))) {
        return showError({ message: '规则编号已存在' });
      }
      const value = { action: editingRule.value.action || '' };
      if (editingRule.value.prefix) value.prefix = editingRule.value.prefix;
      if (editingRule.value.ge) value.ge = editingRule.value.ge;
      if (editingRule.value.le) value.le = editingRule.value.le;
      if (editingRule.value.description) value.description = editingRule.value.description;
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listName} rule ${original}`);
        }
        await configStore.setConfig(`${path.value} ${listName} rule ${editingRule.value.rule}`, value);
        ruleModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
        if (listModalVisible.value) {
          await loadListRules(listName);
        }
      } catch (e) {
        showError(e);
      }
    }

    return {
      lists, loading, selectedListNames, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalName,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      listColumns, ruleColumns, listSchema, ruleTabs: RULE_TABS, ruleTabSchemas,
      path, writeDisabled, canCreateRule, ACTION_OPTIONS,
      load, createList, editList, removeList, saveList,
      createRule, editRule, removeRule, saveRule, loadListRules,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNames.length || selectedListNames.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNames.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
        <CommandPreview :path="path" />
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalName ? '编辑' : '创建'" width="780px" @confirm="saveList">
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
            <DataTable :columns="ruleColumns" :data="editingList.rules" :disabled="writeDisabled"
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
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
