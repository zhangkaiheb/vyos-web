import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

let mirrorKeyCounter = 0;
function nextMirrorKey() { return '_mk_' + (++mirrorKeyCounter); }

export default defineComponent({
  name: 'ContainerRegistryPage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);

    const registries = ref([]);

    const registryColumns = computed(() => [
      { key: 'name', title: t('containerRegistry.columns.registryName'), dataIndex: 'name', width: 180 },
      { key: 'username', title: t('containerRegistry.columns.username'), dataIndex: 'username', width: 150 },
      { key: 'insecure', title: t('containerRegistry.columns.insecure'), dataIndex: 'insecure', width: 80 },
      { key: 'disable', title: t('containerRegistry.columns.disable'), dataIndex: 'disable', width: 80 },
      { key: 'mirror_count', title: t('containerRegistry.columns.mirrorCount'), dataIndex: 'mirror_count', width: 80 },
      { key: 'actions', title: t('containerRegistry.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const mirrorColumns = computed(() => [
      { key: 'host_name', title: t('containerRegistry.columns.hostName'), dataIndex: 'host_name', width: 180 },
      { key: 'address', title: t('containerRegistry.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'port', title: t('containerRegistry.columns.port'), dataIndex: 'port', width: 80 },
      { key: 'path', title: t('containerRegistry.columns.path'), dataIndex: 'path', width: 150 },
      { key: 'actions', title: t('containerRegistry.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const selectedRegistries = ref([]);
    const selectedMirrors = ref([]);

    const showRegistryModal = ref(false);
    const editingRegistry = ref(null);

    const showMirrorModal = ref(false);
    const editingMirror = ref(null);

    const commandPath = computed(() => 'container registry');

    function registryToForm(data = {}) {
      const entries = Object.entries(data);
      return entries.map(([name, reg]) => {
        const auth = reg.authentication || {};
        const mirrors = reg.mirror || {};
        return {
          _name: name,
          name: name,
          username: auth.username || '',
          password: auth.password || '',
          insecure: reg.insecure !== undefined,
          disable: reg.disable !== undefined,
          mirrors: Object.entries(mirrors).map(([hostName, m]) => ({
            _key: nextMirrorKey(),
            _host_name: hostName,
            host_name: hostName,
            address: m.address || '',
            port: m.port || '',
            path: m.path || '',
          })),
          mirror_count: Object.keys(mirrors).length,
        };
      });
    }

    function formToRegistry(list) {
      const result = {};
      for (const reg of list) {
        if (!reg.name) continue;
        const obj = {};
        if (reg.insecure) obj.insecure = '';
        if (reg.disable) obj.disable = '';

        const auth = {};
        if (isPresent(reg.username)) auth.username = String(reg.username);
        if (isPresent(reg.password)) auth.password = String(reg.password);
        if (Object.keys(auth).length) obj.authentication = auth;

        const mirrors = {};
        for (const m of reg.mirrors || []) {
          if (!m.host_name) continue;
          const mObj = {};
          if (isPresent(m.address)) mObj.address = String(m.address);
          if (isPresent(m.port)) mObj.port = String(m.port);
          if (isPresent(m.path)) mObj.path = String(m.path);
          mirrors[m.host_name] = mObj;
        }
        if (Object.keys(mirrors).length) obj.mirror = mirrors;

        result[reg.name] = obj;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('container registry', true);
        registries.value = registryToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('containerRegistry.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('container registry');
        const payload = formToRegistry(registries.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('container registry', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('containerRegistry.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createRegistry() {
      editingRegistry.value = {
        name: '',
        username: '',
        password: '',
        insecure: false,
        disable: false,
        mirrors: [],
        mirror_count: 0,
      };
      showRegistryModal.value = true;
    }

    function editRegistry() {
      if (!selectedRegistries.value.length) return showError({ message: t('containerRegistry.errors.selectRegistryToEdit') });
      const row = registries.value.find(r => r.name === selectedRegistries.value[0]);
      if (!row) return showError({ message: t('containerRegistry.errors.registryNotFound') });
      editingRegistry.value = JSON.parse(JSON.stringify(row));
      selectedMirrors.value = [];
      showRegistryModal.value = true;
    }

    function editRegistryByRecord(record) {
      const row = registries.value.find(r => r.name === record.name);
      if (!row) return;
      editingRegistry.value = JSON.parse(JSON.stringify(row));
      selectedMirrors.value = [];
      showRegistryModal.value = true;
    }

    function removeRegistry() {
      if (!selectedRegistries.value.length) return showError({ message: t('containerRegistry.errors.selectRegistryToDelete') });
      registries.value = registries.value.filter(r => r.name !== selectedRegistries.value[0]);
      selectedRegistries.value = [];
    }

    function removeRegistryByRecord(record) {
      registries.value = registries.value.filter(r => r.name !== record.name);
    }

    function saveRegistry() {
      if (!editingRegistry.value.name) return showError({ message: t('containerRegistry.errors.registryNameRequired') });
      const list = registries.value;
      const idx = list.findIndex(r => r._name === editingRegistry.value._name);
      const reg = { ...editingRegistry.value };
      reg.mirror_count = (reg.mirrors || []).length;
      if (idx >= 0) list.splice(idx, 1, reg);
      else list.push(reg);
      registries.value = list;
      showRegistryModal.value = false;
    }

    function createMirror() {
      editingMirror.value = {
        _key: '',
        _host_name: '',
        host_name: '',
        address: '',
        port: '',
        path: '',
      };
      showMirrorModal.value = true;
    }

    function editMirror() {
      if (!selectedMirrors.value.length) return showError({ message: t('containerRegistry.errors.selectMirrorToEdit') });
      const row = editingRegistry.value.mirrors.find(m => m._key === selectedMirrors.value[0]);
      if (!row) return showError({ message: t('containerRegistry.errors.mirrorNotFound') });
      editingMirror.value = JSON.parse(JSON.stringify(row));
      showMirrorModal.value = true;
    }

    function editMirrorByRecord(record) {
      const row = editingRegistry.value.mirrors.find(m => m._key === record._key);
      if (!row) return;
      editingMirror.value = JSON.parse(JSON.stringify(row));
      showMirrorModal.value = true;
    }

    function removeMirror() {
      if (!selectedMirrors.value.length) return showError({ message: t('containerRegistry.errors.selectMirrorToDelete') });
      editingRegistry.value.mirrors = editingRegistry.value.mirrors.filter(m => m._key !== selectedMirrors.value[0]);
      editingRegistry.value.mirror_count = editingRegistry.value.mirrors.length;
      selectedMirrors.value = [];
    }

    function removeMirrorByRecord(record) {
      editingRegistry.value.mirrors = editingRegistry.value.mirrors.filter(m => m._key !== record._key);
      editingRegistry.value.mirror_count = editingRegistry.value.mirrors.length;
    }

    function saveMirror() {
      if (!editingMirror.value.host_name) return showError({ message: t('containerRegistry.errors.hostNameRequired') });
      if (editingMirror.value.path && !editingMirror.value.path.startsWith('/')) {
        return showError({ message: t('containerRegistry.errors.pathMustStartWithSlash') });
      }
      const list = editingRegistry.value.mirrors;
      if (editingMirror.value._key) {
        const idx = list.findIndex(m => m._key === editingMirror.value._key);
        if (idx >= 0) list.splice(idx, 1, { ...editingMirror.value });
      } else {
        const newMirror = { ...editingMirror.value, _key: nextMirrorKey() };
        list.push(newMirror);
      }
      editingRegistry.value.mirrors = list;
      editingRegistry.value.mirror_count = list.length;
      showMirrorModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, registries, commandPath,
      registryColumns, mirrorColumns,
      selectedRegistries, selectedMirrors,
      showRegistryModal, editingRegistry,
      showMirrorModal, editingMirror,
      load, save,
      createRegistry, editRegistry, editRegistryByRecord, removeRegistry, removeRegistryByRecord, saveRegistry,
      createMirror, editMirror, editMirrorByRecord, removeMirror, removeMirrorByRecord, saveMirror,
    };
  },
  template: `
    <div class="page-container">
      <div style="font-weight:bold;margin:16px 0 8px;">{{ t('containerRegistry.pageTitle') }}</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createRegistry">{{ t('containerRegistry.buttons.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editRegistry" :disabled="!selectedRegistries.length || selectedRegistries.length > 1">{{ t('containerRegistry.buttons.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeRegistry" :disabled="!selectedRegistries.length">{{ t('containerRegistry.buttons.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="registryColumns" :data="registries" rowKey="name" :externalToolbar="true" @selection-change="selectedRegistries = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'insecure'">
            <span>{{ record.insecure ? t('containerRegistry.labels.yes') : t('containerRegistry.labels.no') }}</span>
          </template>
          <template v-if="column.key === 'disable'">
            <span>{{ record.disable ? t('containerRegistry.labels.yes') : t('containerRegistry.labels.no') }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editRegistryByRecord(record)" style="margin-right:8px">{{ t('containerRegistry.actions.edit') }}</a>
            <a @click="removeRegistryByRecord(record)" style="color:#ff4d4f">{{ t('containerRegistry.actions.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal v-model:visible="showRegistryModal" :title="editingRegistry && editingRegistry._name ? t('containerRegistry.modals.editRegistry') : t('containerRegistry.modals.createRegistry')" @confirm="saveRegistry" @close="showRegistryModal = false" width="800px">
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.registryName') }}</label><input class="form-control" v-model="editingRegistry.name" :disabled="editingRegistry._name" :placeholder="t('containerRegistry.placeholders.registryName')" :title="t('containerRegistry.titles.registryName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.insecure') }}</label><input type="checkbox" v-model="editingRegistry.insecure" :title="t('containerRegistry.titles.insecure')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.disable') }}</label><input type="checkbox" v-model="editingRegistry.disable" :title="t('containerRegistry.titles.disable')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('containerRegistry.labels.authentication') }}</div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.labels.username') }}</label><input class="form-control" v-model="editingRegistry.username" :title="t('containerRegistry.titles.username')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.labels.password') }}</label><input class="form-control" type="password" v-model="editingRegistry.password" :title="t('containerRegistry.titles.password')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('containerRegistry.labels.mirrors') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createMirror">{{ t('containerRegistry.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editMirror" :disabled="!selectedMirrors.length || selectedMirrors.length > 1">{{ t('containerRegistry.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeMirror" :disabled="!selectedMirrors.length">{{ t('containerRegistry.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="mirrorColumns" :data="editingRegistry.mirrors" rowKey="_key" :externalToolbar="true" @selection-change="selectedMirrors = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editMirrorByRecord(record)" style="margin-right:8px">{{ t('containerRegistry.actions.edit') }}</a>
              <a @click="removeMirrorByRecord(record)" style="color:#ff4d4f">{{ t('containerRegistry.actions.delete') }}</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <DraggableModal v-model:visible="showMirrorModal" :title="editingMirror && editingMirror._key ? t('containerRegistry.modals.editMirror') : t('containerRegistry.modals.addMirror')" @confirm="saveMirror" @close="showMirrorModal = false" width="600px">
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.hostName') }}</label><input class="form-control" v-model="editingMirror.host_name" :disabled="editingMirror._key" :placeholder="t('containerRegistry.placeholders.hostName')" :title="t('containerRegistry.titles.hostName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.address') }}</label><input class="form-control" v-model="editingMirror.address" :placeholder="t('containerRegistry.placeholders.address')" :title="t('containerRegistry.titles.address')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingMirror.port" :title="t('containerRegistry.titles.port')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerRegistry.columns.path') }}</label><input class="form-control" v-model="editingMirror.path" :placeholder="t('containerRegistry.placeholders.path')" :title="t('containerRegistry.titles.path')" /></div>
      </DraggableModal>
    </div>
  `,
});
