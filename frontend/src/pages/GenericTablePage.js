import { defineComponent, ref, computed, watch, onMounted, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'GenericTablePage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = computed(() => {
      const meta = route.meta?.menuItem;
      if (meta?.columns) return meta.columns;
      if (!data.value.length) return [];
      const keys = Object.keys(data.value[0]);
      return keys.map(k => ({ key: k, title: k }));
    });

    const formSchema = computed(() => {
      const meta = route.meta?.menuItem;
      if (meta?.schema) return meta.schema;
      return columns.value.map(c => ({ key: c.key, title: c.title }));
    });

    async function load() {
      loading.value = true;
      // clearError();
      try {
        const res = await configStore.getConfig(path.value, true);
        const d = res.data || {};
        data.value = Object.entries(d).map(([k, v]) => ({ id: k, name: k, ...v }));
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
    watch(() => route.path, load);

    function create() {
      editingItem.value = {};
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      editingItem.value = data.value.find(r => r.id === selected.value[0]) || {};
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      pendingDeleteNames.value = selected.value.map(id => {
        const row = data.value.find(r => r.id === id);
        return row ? (row.name || row.id) : id;
      });
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function save() {
      const id = editingItem.value.name || editingItem.value.id;
      try {
        await configStore.setConfig(`${path.value} ${id}`, editingItem.value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data, loading, columns, formSchema, modalVisible, editingItem, selected, path, writeDisabled,
      deleteModalVisible, pendingDeleteNames,
      load, create, edit, remove, confirmRemove, save, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @create="create" @edit="edit" @delete="remove" @refresh="load"
                 @selection-change="selected = $event" />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? $t('app.edit') : $t('app.create')" @confirm="save">
        <ConfigForm v-model="editingItem" :schema="formSchema" :disabled="writeDisabled" />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ $t('config.deleteConfirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm },
});
