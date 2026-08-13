import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'NetnsPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const netnsList = ref([]);
    const loading = ref(false);
    const selectedNames = ref([]);

    const modalVisible = ref(false);
    const deleteModalVisible = ref(false);
    const editingNetns = ref(null);
    const editingOriginalName = ref('');
    const pendingDeleteNames = ref([]);

    const path = computed(() => 'netns');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'name', title: t('netns.columns.name') },
      { key: 'description', title: t('netns.columns.description') },
    ];

    const schema = computed(() => [
      { key: 'name', title: t('netns.columns.name'), type: 'text', required: true, placeholder: t('netns.form.namePlaceholder') },
      { key: 'description', title: t('netns.columns.description'), type: 'text' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        console.log('Netns API response:', res);
        const raw = res.data || {};
        // API returns { name: { ns01: {...}, ns02: {...} } }
        const nameData = raw.name || raw;
        console.log('Netns name data:', nameData);
        const result = [];
        for (const [name, attrs] of Object.entries(nameData)) {
          if (typeof attrs === 'object' && attrs !== null) {
            result.push({
              id: name,
              name,
              description: attrs.description || '',
            });
          }
        }
        console.log('Netns parsed result:', result);
        result.sort((a, b) => a.name.localeCompare(b.name));
        netnsList.value = result;
        if (selectedNames.value.length && !result.some(n => n.name === selectedNames.value[0])) {
          selectedNames.value = [];
        }
      } catch (e) {
        console.error('Netns load error:', e);
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
      selectedNames.value = [];
      load();
    });

    function emptyNetns() { return { name: '', description: '' }; }

    function create() {
      editingNetns.value = emptyNetns();
      editingOriginalName.value = '';
      modalVisible.value = true;
    }

    function edit() {
      if (!selectedNames.value.length) return showError({ message: t('netns.errors.selectOne') });
      if (selectedNames.value.length > 1) return showError({ message: t('netns.errors.selectOne') });
      const netns = netnsList.value.find(n => n.name === selectedNames.value[0]);
      if (!netns) return;
      editingNetns.value = { name: netns.name, description: netns.description };
      editingOriginalName.value = netns.name;
      modalVisible.value = true;
    }

    async function remove() {
      if (!selectedNames.value.length) return showError({ message: t('netns.errors.selectOne') });
      pendingDeleteNames.value = [...selectedNames.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} name ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedNames.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function save() {
      if (!editingNetns.value.name) return showError({ message: t('netns.errors.nameRequired') });
      const original = editingOriginalName.value;
      if (!original && netnsList.value.some(n => n.name === editingNetns.value.name)) {
        return showError({ message: t('netns.errors.nameExists') });
      }
      const value = {};
      if (editingNetns.value.description) value.description = editingNetns.value.description;
      try {
        if (original && original !== editingNetns.value.name) {
          await configStore.deleteConfig(`${path.value} name ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} name ${editingNetns.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} name ${editingNetns.value.name}`, value);
          configStore.markPending();
        }
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      t,
      netnsList, loading, selectedNames,
      modalVisible, deleteModalVisible, editingNetns, editingOriginalName, pendingDeleteNames,
      columns, schema, path, writeDisabled,
      load, create, edit, remove, confirmRemove, save,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">{{ t('netns.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selectedNames.length || selectedNames.length > 1">{{ t('netns.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selectedNames.length">{{ t('netns.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('netns.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="columns" :data="netnsList" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalName ? t('netns.modal.edit') : t('netns.modal.create')" width="500px" @confirm="save">
        <ConfigForm v-model="editingNetns" :schema="schema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('netns.modal.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('netns.modal.deleteConfirmText') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
});
