import { defineComponent, ref, computed, onMounted, onUnmounted, inject, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'FirewallIpv4OptionsPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);

    const activeTab = ref('forward');
    const tabs = computed(() => [
      { key: 'forward', title: t('firewall.options.forward') },
      { key: 'input', title: t('firewall.options.input') },
      { key: 'name', title: t('firewall.options.name') },
      { key: 'output', title: t('firewall.options.output') },
      { key: 'prerouting', title: t('firewall.options.prerouting') },
    ]);

    const outputSubTab = ref('filter');
    const outputSubTabs = computed(() => [
      { key: 'filter', title: t('firewall.options.filter') },
      { key: 'raw', title: t('firewall.options.raw') },
    ]);

    const configPaths = {
      forward: 'firewall ipv4 forward filter',
      input: 'firewall ipv4 input filter',
      'output-filter': 'firewall ipv4 output filter',
      'output-raw': 'firewall ipv4 output raw',
      prerouting: 'firewall ipv4 prerouting raw',
    };

    const chainSchema = computed(() => [
      { key: 'default-action', title: t('firewall.options.defaultAction'), type: 'select', options: [
        { value: '', label: '' },
        { value: 'accept', label: t('firewall.options.accept') },
        { value: 'drop', label: t('firewall.options.drop') },
      ], help: t('firewall.options.defaultActionHelp') },
      { key: 'default-log', title: t('firewall.options.defaultLog'), type: 'checkbox', valueless: true, help: t('firewall.options.defaultLogHelp') },
      { key: 'description', title: t('firewall.options.description'), type: 'text', help: t('firewall.options.descriptionHelp') },
      { key: 'disable-conntrack', title: t('firewall.options.disableConntrack'), type: 'checkbox', valueless: true, help: t('firewall.options.disableConntrackHelp') },
    ]);

    const rawSchema = computed(() => [
      { key: 'default-action', title: t('firewall.options.defaultAction'), type: 'select', options: [
        { value: '', label: '' },
        { value: 'accept', label: t('firewall.options.accept') },
        { value: 'drop', label: t('firewall.options.drop') },
      ], help: t('firewall.options.defaultActionHelp') },
      { key: 'default-log', title: t('firewall.options.defaultLog'), type: 'checkbox', valueless: true, help: t('firewall.options.defaultLogHelp') },
      { key: 'description', title: t('firewall.options.description'), type: 'text', help: t('firewall.options.descriptionHelp') },
    ]);

    const preroutingSchema = computed(() => [
      { key: 'default-action', title: t('firewall.options.defaultAction'), type: 'select', options: [
        { value: '', label: '' },
        { value: 'accept', label: t('firewall.options.accept') },
        { value: 'drop', label: t('firewall.options.drop') },
      ], help: t('firewall.options.defaultActionHelp') },
      { key: 'default-jump-target', title: t('firewall.options.defaultJumpTarget'), type: 'text', help: t('firewall.options.defaultJumpTargetHelp') },
      { key: 'default-log', title: t('firewall.options.defaultLog'), type: 'checkbox', valueless: true, help: t('firewall.options.defaultLogHelp') },
      { key: 'description', title: t('firewall.options.description'), type: 'text', help: t('firewall.options.descriptionHelp') },
    ]);

    const nameSchema = computed(() => {
      const fields = [
        { key: 'name', title: t('firewall.options.nameName'), placeholder: t('firewall.options.nameName'), disabled: !!editingNameOriginal.value },
        { key: 'default-action', title: t('firewall.options.defaultAction'), type: 'select', options: [
          { value: '', label: '' },
          { value: 'accept', label: t('firewall.options.accept') },
          { value: 'drop', label: t('firewall.options.drop') },
          { value: 'reject', label: t('firewall.options.reject') },
          { value: 'return', label: t('firewall.options.return') },
          { value: 'continue', label: t('firewall.options.continue') },
          { value: 'jump', label: t('firewall.options.jump') },
        ], help: t('firewall.options.defaultActionHelp') },
        { key: 'default-jump-target', title: t('firewall.options.defaultJumpTarget'), type: 'text', help: t('firewall.options.defaultJumpTargetHelp') },
        { key: 'default-log', title: t('firewall.options.defaultLog'), type: 'checkbox', valueless: true, help: t('firewall.options.defaultLogHelp') },
        { key: 'description', title: t('firewall.options.description'), type: 'text', help: t('firewall.options.descriptionHelp') },
      ];
      return fields;
    });

    // Inline form data for each chain tab
    const formData = ref({});
    const formPath = ref('');
    const formSchema = ref([]);

    // Name list data
    const nameList = ref([]);
    const selectedName = ref([]);
    const showNameModal = ref(false);
    const editingName = ref(null);
    const editingNameOriginal = ref(null);
    const deleteConfirmModal = ref(false);
    const deleteTargetName = ref('');

    const nameColumns = computed(() => [
      { key: 'name', title: t('firewall.options.nameName'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('firewall.options.description'), dataIndex: 'description', width: 200 },
      { key: 'default-action', title: t('firewall.options.defaultAction'), width: 120, render: (_, row) => row.default_action || '' },
      { key: 'default-jump-target', title: t('firewall.options.defaultJumpTarget'), width: 150, render: (_, row) => row.default_jump_target || '' },
      { key: 'default-log', title: t('firewall.options.defaultLog'), width: 100, render: (_, row) => row.default_log ? '✓' : '' },
    ]);

    const showConfirmButton = computed(() => activeTab.value !== 'name');

    function getSchemaForTab(tabKey) {
      if (tabKey === 'output') {
        return outputSubTab.value === 'raw' ? rawSchema.value : chainSchema.value;
      } else if (tabKey === 'prerouting') {
        return preroutingSchema.value;
      }
      return chainSchema.value;
    }

    function getPathForTab(tabKey) {
      if (tabKey === 'output') {
        return configPaths[`output-${outputSubTab.value}`];
      }
      return configPaths[tabKey];
    }

    async function loadFormData(tabKey) {
      const path = getPathForTab(tabKey);
      if (!path) return;
      loading.value = true;
      try {
        const res = await configStore.getConfig(path, false);
        const d = res.data || {};
        formData.value = {
          'default-action': d.default_action || '',
          'default-log': !!d.default_log,
          description: d.description || '',
          'disable-conntrack': !!d.disable_conntrack,
          'default-jump-target': d.default_jump_target || '',
        };
        formPath.value = path;
        formSchema.value = getSchemaForTab(tabKey);
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    // Watch activeTab changes to load data when switching tabs
    watch(activeTab, async (newTab) => {
      if (newTab === 'name') {
        await loadNameList();
      } else {
        await loadFormData(newTab);
      }
    });

    // Watch output sub-tab changes
    watch(outputSubTab, async () => {
      if (activeTab.value === 'output') {
        await loadFormData('output');
      }
    });

    async function saveForm() {
      const value = {};
      if (formData.value['default-action']) value['default-action'] = formData.value['default-action'];
      if (formData.value['default-log']) value['default-log'] = '';
      if (formData.value.description) value.description = formData.value.description;
      if (formData.value['disable-conntrack']) value['disable-conntrack'] = '';
      if (formData.value['default-jump-target']) value['default-jump-target'] = formData.value['default-jump-target'];

      saving.value = true;
      try {
        await configStore.setConfig(formPath.value, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    // Name list
    async function loadNameList() {
      loading.value = true;
      try {
        const res = await configStore.getConfig('firewall ipv4 name', false);
        const d = res.data || {};
        console.log('[FirewallIpv4OptionsPage] loadNameList response:', JSON.stringify(d));
        nameList.value = Object.entries(d).map(([name, cfg]) => ({
          name,
          description: cfg.description || '',
          'default-action': cfg.default_action || '',
          'default-jump-target': cfg.default_jump_target || '',
          'default-log': !!cfg.default_log,
        }));
        console.log('[FirewallIpv4OptionsPage] nameList:', nameList.value);
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function createName() {
      editingName.value = { name: '', 'default-action': '' };
      editingNameOriginal.value = null;
      showNameModal.value = true;
    }

    function editName() {
      if (!selectedName.value.length) return showError({ message: t('msg.noSelection') });
      const row = nameList.value.find(r => r.name === selectedName.value[0]);
      if (!row) return;
      editingName.value = { ...row };
      editingNameOriginal.value = row.name;
      showNameModal.value = true;
    }

    function removeName() {
      if (!selectedName.value.length) return showError({ message: t('msg.noSelection') });
      deleteTargetName.value = selectedName.value[0];
      deleteConfirmModal.value = true;
    }

    async function confirmDelete() {
      deleteConfirmModal.value = false;
      configStore.deleteConfig(`firewall ipv4 name ${deleteTargetName.value}`);
      configStore.markPending();
      selectedName.value = [];
      await loadNameList();
    }

    async function saveName() {
      const name = editingName.value.name;
      if (!name) return showError({ message: t('msg.nameRequired') });
      const originalName = editingNameOriginal.value;
      const value = {};
      if (editingName.value['default-action']) value['default-action'] = editingName.value['default-action'];
      if (editingName.value['default-jump-target']) value['default-jump-target'] = editingName.value['default-jump-target'];
      if (editingName.value['default-log']) value['default-log'] = '';
      if (editingName.value.description) value.description = editingName.value.description;

      saving.value = true;
      try {
        if (originalName && originalName !== name) {
          await configStore.deleteConfig(`firewall ipv4 name ${originalName}`);
          configStore.markPending();
        }
        await configStore.setConfig(`firewall ipv4 name ${name}`, value);
        configStore.markPending();
        showNameModal.value = false;
        await configStore.checkSessionChanged();
        await loadNameList();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      onMenuRefresh(handleMenuRefresh);
      loadFormData('forward');
    });
    onUnmounted(() => {
      offMenuRefresh(handleMenuRefresh);
    });

    function handleMenuRefresh() {
      if (activeTab.value === 'name') {
        loadNameList();
      } else {
        loadFormData(activeTab.value);
      }
    }

    return {
      loading, saving,
      activeTab, tabs, outputSubTab, outputSubTabs,
      formData, formPath, formSchema,
      showConfirmButton,
      nameList, selectedName, nameColumns,
      nameSchema, loadNameList,
      showNameModal, editingName, editingNameOriginal,
      deleteConfirmModal, deleteTargetName, confirmDelete,
      createName, editName, removeName, saveName,
      saveForm,
      t,
    };
  },
  template: `
    <div>
      <TabGroup :tabs="tabs" v-model="activeTab">
        <template #forward>
          <div style="padding: 16px;">
            <ConfigForm :schema="formSchema" v-model="formData" />
          </div>
        </template>
        <template #input>
          <div style="padding: 16px;">
            <ConfigForm :schema="formSchema" v-model="formData" />
          </div>
        </template>
        <template #name>
          <DataTable
            :columns="nameColumns"
            :data="nameList"
            :loading="loading"
            rowKey="name"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @selection-change="selectedName = $event"
            @create="createName"
            @edit="editName"
            @delete="removeName"
            @refresh="loadNameList"
          />
        </template>
        <template #output>
          <TabGroup :tabs="outputSubTabs" v-model="outputSubTab">
            <template #filter>
              <div style="padding: 12px 0;">
                <ConfigForm :schema="formSchema" v-model="formData" />
              </div>
            </template>
            <template #raw>
              <div style="padding: 12px 0;">
                <ConfigForm :schema="formSchema" v-model="formData" />
              </div>
            </template>
          </TabGroup>
        </template>
        <template #prerouting>
          <div style="padding: 16px;">
            <ConfigForm :schema="formSchema" v-model="formData" />
          </div>
        </template>
      </TabGroup>

      <!-- Confirm button for chain tabs -->
      <div v-if="showConfirmButton" style="text-align:right;padding:16px 0;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="saveForm">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <!-- Name config modal -->
      <DraggableModal
        v-model:visible="showNameModal"
        :title="editingNameOriginal ? t('firewall.options.editName') : t('firewall.options.createName')"
        width="800"
      >
        <ConfigForm
          :schema="nameSchema"
          v-model="editingName"
        />
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <ToolbarButton icon="cancel" @click="showNameModal = false">{{ t('app.cancel') }}</ToolbarButton>
            <ToolbarButton icon="save" primary :disabled="saving" @click="saveName">{{ saving ? t('app.saving') : t('app.confirm') }}</ToolbarButton>
          </div>
        </template>
      </DraggableModal>

      <!-- Delete confirm modal -->
      <DraggableModal
        v-model:visible="deleteConfirmModal"
        :title="t('app.confirmDelete')"
        width="400"
        @confirm="confirmDelete"
      >
        <div style="padding:10px 0;">
          <p style="margin:0;">{{ t('firewall.options.confirmDelete', { name: deleteTargetName }) }}</p>
        </div>
      </DraggableModal>
    </div>
  `,
});
