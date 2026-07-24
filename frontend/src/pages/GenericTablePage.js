import { defineComponent, ref, computed, watch, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { t } from '/src/i18n/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';

export default defineComponent({
  name: 'GenericTablePage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
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

    onMounted(load);
    watch(() => route.path, load);

    function create() {
      editingItem.value = {};
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert($t('msg.noSelection'));
      editingItem.value = data.value.find(r => r.id === selected.value[0]) || {};
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return alert($t('msg.noSelection'));
      if (!confirm($t('msg.confirmDelete'))) return;
      for (const id of selected.value) {
        await configStore.deleteConfig(`${path.value} ${id}`);
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      await load();
    }

    async function save() {
      const id = editingItem.value.name || editingItem.value.id;
      try {
        await configStore.setConfig(`${path.value} ${id}`, editingItem.value);
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data, loading, columns, formSchema, modalVisible, editingItem, selected, path, writeDisabled,
      load, create, edit, remove, save,
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
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm },
});
