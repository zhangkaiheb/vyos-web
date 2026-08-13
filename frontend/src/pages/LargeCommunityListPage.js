import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const ACTION_OPTIONS = [
  { value: 'permit', label: 'permit' },
  { value: 'deny', label: 'deny' },
];

export default defineComponent({
  name: 'LargeCommunityListPage',
  setup() {
    const { t } = useI18n();
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

    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const ruleDeleteModalVisible = ref(false);
    const pendingDeleteRuleNumbers = ref([]);

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => {
      return !!editingList.value?.name;
    });

    const RULE_TABS = computed(() => [
      { key: 'basic', title: t('largeCommunityList.tabs.basic') },
    ]);

    const listColumns = computed(() => [
      { key: 'name', title: t('largeCommunityList.columns.name') },
      { key: 'description', title: t('largeCommunityList.columns.description') },
      { key: 'ruleCount', title: t('largeCommunityList.columns.ruleCount') },
    ]);

    const ruleColumns = computed(() => [
      { key: 'rule', title: t('largeCommunityList.columns.rule') },
      { key: 'action', title: t('largeCommunityList.columns.action') },
      { key: 'regex', title: t('largeCommunityList.columns.regex') },
      { key: 'description', title: t('largeCommunityList.columns.description') },
    ]);

    const listSchema = computed(() => [
      { key: 'name', title: t('largeCommunityList.schema.name'), type: 'text', required: true, placeholder: t('largeCommunityList.schema.namePlaceholder') },
      { key: 'description', title: t('largeCommunityList.schema.description'), type: 'text' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: t('largeCommunityList.schema.rule'), type: 'number', min: 1, max: 65535, required: true, help: t('largeCommunityList.schema.ruleHelp') },
      { key: 'action', title: t('largeCommunityList.schema.action'), type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'regex', title: t('largeCommunityList.schema.regex'), type: 'text', placeholder: t('largeCommunityList.schema.regexPlaceholder') },
      { key: 'description', title: t('largeCommunityList.schema.description'), type: 'text' },
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

    onMounted(() => { load(); onMenuRefresh(load); });
    watch(() => route.path, () => {
      selectedListNames.value = [];
      selectedRuleNumbers.value = [];
      load();
    });

    function emptyList() { return { name: '', description: '', rules: [] }; }
    function emptyRule() { return { rule: '', action: '', regex: '', description: '' }; }

    async function loadListRules(listName) {
      try {
        const res = await configStore.getConfig(`${path.value} ${listName} rule`, true);
        const raw = res.data || {};
        editingList.value.rules = Object.entries(raw).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', regex: attrs.regex || '', description: attrs.description || '',
        }));
      } catch (e) { showError(e); }
    }

    function createList() { editingList.value = emptyList(); editingListOriginalName.value = ''; selectedRuleNumbers.value = []; listModalVisible.value = true; }

    async function editList() {
      if (!selectedListNames.value.length) return showError({ message: t('largeCommunityList.messages.selectList') });
      if (selectedListNames.value.length > 1) return showError({ message: t('largeCommunityList.messages.selectList') });
      const list = lists.value.find(l => l.name === selectedListNames.value[0]);
      if (!list) return;
      editingList.value = {
        name: list.name, description: list.description,
        rules: Object.entries(list.rules).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', regex: attrs.regex || '', description: attrs.description || '',
        })),
      };
      editingListOriginalName.value = list.name;
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    async function removeList() {
      if (!selectedListNames.value.length) return showError({ message: t('largeCommunityList.messages.selectList') });
      pendingDeleteNames.value = [...selectedListNames.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveList() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedListNames.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function saveList() {
      if (!editingList.value.name) return showError({ message: t('largeCommunityList.messages.enterName') });
      const original = editingListOriginalName.value;
      if (!original && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: t('largeCommunityList.messages.nameExists') });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && original !== editingList.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          configStore.markPending();
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              rules[r.rule] = { action: r.action || '', regex: r.regex || '', ...(r.description ? { description: r.description } : {}) };
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, newValue);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, value);
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
      if (!editingList.value.name) return showError({ message: t('largeCommunityList.messages.enterNameFirst') });
      if (!editingListOriginalName.value && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: t('largeCommunityList.messages.nameExists') });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('largeCommunityList.messages.selectRule') });
      if (selectedRuleNumbers.value.length > 1) return showError({ message: t('largeCommunityList.messages.selectRule') });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('largeCommunityList.messages.selectRule') });
      pendingDeleteRuleNumbers.value = [...selectedRuleNumbers.value];
      ruleDeleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      ruleDeleteModalVisible.value = false;
      const listName = editingList.value.name;
      for (const num of pendingDeleteRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listName} rule ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      pendingDeleteRuleNumbers.value = [];
      await loadListRules(listName);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return t('largeCommunityList.validation.enterRuleNumber');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('largeCommunityList.validation.ruleNumberRange');
      if (!r.action) return t('largeCommunityList.validation.selectAction');
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      if (!editingList.value) return;
      const listName = editingList.value.name;
      const original = editingRuleOriginalNumber.value;
      if (!original && editingList.value.rules.some(r => String(r.rule) === String(editingRule.value.rule))) {
        return showError({ message: t('largeCommunityList.messages.ruleNumberExists') });
      }
      const value = {};
      if (editingRule.value.action) value.action = editingRule.value.action;
      if (editingRule.value.regex) value.regex = editingRule.value.regex;
      if (editingRule.value.description) value.description = editingRule.value.description;
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listName} rule ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} ${listName} rule ${editingRule.value.rule}`, value);
        configStore.markPending();
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

    return {t,
      
      lists, loading, selectedListNames, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalName,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      deleteModalVisible, pendingDeleteNames, ruleDeleteModalVisible, pendingDeleteRuleNumbers,
      listColumns, ruleColumns, listSchema, ruleTabs: RULE_TABS, ruleTabSchemas,
      path, writeDisabled, canCreateRule, ACTION_OPTIONS,
      load, createList, editList, removeList, confirmRemoveList, saveList,
      createRule, editRule, removeRule, confirmRemoveRule, saveRule, loadListRules,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">{{ t('largeCommunityList.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNames.length || selectedListNames.length > 1">{{ t('largeCommunityList.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNames.length">{{ t('largeCommunityList.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('largeCommunityList.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalName ? t('largeCommunityList.modals.edit') : t('largeCommunityList.modals.create')" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">{{ t('largeCommunityList.sections.rules') }}</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">{{ t('largeCommunityList.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">{{ t('largeCommunityList.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">{{ t('largeCommunityList.buttons.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="editingList.rules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? t('largeCommunityList.modals.editRule') : t('largeCommunityList.modals.createRule')" width="780px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('largeCommunityList.modals.confirmDelete')" width="400px" @confirm="confirmRemoveList">
        <div>{{ t('largeCommunityList.messages.confirmDeleteList') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleDeleteModalVisible" :title="t('largeCommunityList.modals.confirmDelete')" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('largeCommunityList.messages.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteRuleNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
