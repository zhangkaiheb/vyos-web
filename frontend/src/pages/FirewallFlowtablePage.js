import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

export default defineComponent({
  name: 'FirewallFlowtablePage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);

    const columns = computed(() => [
      { key: 'name', title: t('firewall.flowtable.name'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('firewall.flowtable.description'), dataIndex: 'description', width: 200 },
      { key: 'offload', title: t('firewall.flowtable.offload'), dataIndex: 'offload', width: 120 },
      { key: 'interfaces', title: t('firewall.flowtable.interfaces'), dataIndex: 'interfaces', width: 200 },
      { key: 'actions', title: t('firewall.flowtable.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const flowtables = ref([]);
    const selected = ref([]);
    const showFlowtableModal = ref(false);
    const editingFlowtable = ref(null);

    const flowtableSchema = computed(() => [
      { key: 'name', title: t('firewall.flowtable.name'), type: 'text', required: true, help: t('firewall.flowtable.nameHelp') },
      { key: 'description', title: t('firewall.flowtable.description'), type: 'text', help: t('firewall.flowtable.descriptionHelp') },
      { key: 'offload', title: t('firewall.flowtable.offload'), type: 'select', options: [
        { value: 'software', label: t('firewall.flowtable.softwareOffload') },
        { value: 'hardware', label: t('firewall.flowtable.hardwareOffload') },
      ], help: t('firewall.flowtable.offloadHelp') },
      { key: 'interfaces', title: t('firewall.flowtable.interfaces'), type: 'textarea', help: t('firewall.flowtable.interfacesHelp') },
    ]);

    const commandPath = computed(() => 'firewall flowtable');

    function flowtableToForm(data = {}) {
      return Object.entries(data).map(([name, ft]) => ({
        _name: name,
        name,
        description: ft.description || '',
        offload: ft.offload === 'hardware' ? 'hardware' : 'software',
        interfaces: toArray(ft.interface).join(', '),
      }));
    }

    function formToFlowtable(items) {
      const result = {};
      for (const item of items) {
        if (!item.name) continue;
        const ft = {};
        if (isPresent(item.description)) ft.description = String(item.description);
        if (item.offload && item.offload !== 'software') ft.offload = String(item.offload);
        const interfaces = item.interfaces ? String(item.interfaces).split(',').map(s => s.trim()).filter(Boolean) : [];
        if (interfaces.length) ft.interface = interfaces;
        result[item.name] = ft;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('firewall flowtable', true);
        flowtables.value = flowtableToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('firewall.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToFlowtable(flowtables.value);
        await configApi.set('firewall flowtable', payload);
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('firewall.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createFlowtable() {
      editingFlowtable.value = { name: '', description: '', offload: 'software', interfaces: '' };
      showFlowtableModal.value = true;
    }

    function editFlowtable() {
      if (!selected.value.length) return showError({ message: t('firewall.flowtable.selectToEdit') });
      const row = flowtables.value.find(f => f.name === selected.value[0]);
      if (!row) return showError({ message: t('firewall.flowtable.notFound') });
      editingFlowtable.value = JSON.parse(JSON.stringify(row));
      showFlowtableModal.value = true;
    }

    function removeFlowtable() {
      if (!selected.value.length) return showError({ message: t('firewall.flowtable.selectToDelete') });
      flowtables.value = flowtables.value.filter(f => f.name !== selected.value[0]);
      selected.value = [];
    }

    function saveFlowtable() {
      if (!editingFlowtable.value.name) return showError({ message: t('firewall.flowtable.enterName') });
      const list = flowtables.value;
      const idx = list.findIndex(f => f._name === editingFlowtable.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingFlowtable.value });
      else list.push({ ...editingFlowtable.value });
      flowtables.value = list;
      showFlowtableModal.value = false;
    }

    function editFlowtableByRecord(record) {
      editingFlowtable.value = JSON.parse(JSON.stringify(record));
      showFlowtableModal.value = true;
    }

    function removeFlowtableByRecord(record) {
      flowtables.value = flowtables.value.filter(f => f.name !== record.name);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {t,
      
      loading, saving, flowtables, selected,
      showFlowtableModal, editingFlowtable,
      columns, flowtableSchema, commandPath,
      load, save,
      createFlowtable, editFlowtable, removeFlowtable, saveFlowtable,
      editFlowtableByRecord, removeFlowtableByRecord,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createFlowtable">{{ $t('app.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editFlowtable" :disabled="!selected.length || selected.length > 1">{{ $t('app.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeFlowtable" :disabled="!selected.length">{{ $t('app.delete') }}</ToolbarButton>
      </div>

      <DataTable :columns="columns" :data="flowtables" rowKey="name" :externalToolbar="true" @selection-change="selected = $event" :selectable="true" :loading="loading">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a @click="editFlowtableByRecord(record)">{{ $t('app.edit') }}</a>
            <a @click="removeFlowtableByRecord(record)" style="color:#ff4d4f;margin-left:8px">{{ $t('app.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal v-model:visible="showFlowtableModal" :title="editingFlowtable && editingFlowtable._name ? $t('firewall.flowtable.editFlowtable') : $t('firewall.flowtable.createFlowtable')" @confirm="saveFlowtable" @close="showFlowtableModal = false">
        <ConfigForm :schema="flowtableSchema" v-model="editingFlowtable" />
      </DraggableModal>
    </div>
  `,
});
