import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
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

export default defineComponent({
  name: 'VppKernelInterfacesPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);

    const config = ref({
      interfaces: [],
    });

    const interfaceColumns = [
      { key: 'name', title: t('vppKernel.columns.name'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('vppKernel.columns.description'), dataIndex: 'description', width: 200 },
      { key: 'address', title: t('vppKernel.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'rx_mode', title: t('vppKernel.columns.rxMode'), dataIndex: 'rx_mode', width: 100 },
      { key: 'disable', title: t('vppKernel.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'vif_count', title: t('vppKernel.columns.vifCount'), dataIndex: 'vif_count', width: 80 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const vifColumns = [
      { key: 'vlan_id', title: 'VLAN ID', dataIndex: 'vlan_id', width: 80 },
      { key: 'address', title: t('vppKernel.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'description', title: t('vppKernel.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'disable', title: t('vppKernel.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedInterfaces = ref([]);
    const selectedVifs = ref([]);

    const showInterfaceModal = ref(false);
    const editingInterface = ref(null);
    const showVifModal = ref(false);
    const editingVif = ref(null);

    const commandPath = computed(() => 'vpp kernel-interfaces');

    function kernelInterfacesToForm(data = {}) {
      return {
        interfaces: Object.entries(data).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          address: joinLines(item.address),
          mtu: item.mtu || '',
          rx_mode: item['rx-mode'] || '',
          disable: item.disable !== undefined,
          vifs: item.vif ? Object.entries(item.vif).map(([vlanId, v]) => ({
            _vlan_id: vlanId,
            vlan_id: parseInt(vlanId),
            address: joinLines(v.address),
            description: v.description || '',
            mtu: v.mtu || '',
            disable: v.disable !== undefined,
          })) : [],
        })),
      };
    }

    function formToKernelInterfaces(form) {
      const result = {};
      for (const item of form.interfaces || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        const addrs = splitLines(item.address);
        if (addrs.length) obj.address = addrs;
        if (isPresent(item.mtu)) obj.mtu = String(item.mtu);
        if (isPresent(item.rx_mode)) obj['rx-mode'] = String(item.rx_mode);
        if (item.disable) obj.disable = '';
        if (item.vifs && item.vifs.length) {
          obj.vif = {};
          for (const v of item.vifs) {
            const vObj = {};
            const vAddrs = splitLines(v.address);
            if (vAddrs.length) vObj.address = vAddrs;
            if (isPresent(v.description)) vObj.description = String(v.description);
            if (isPresent(v.mtu)) vObj.mtu = String(v.mtu);
            if (v.disable) vObj.disable = '';
            obj.vif[v.vlan_id] = vObj;
          }
        }
        result[item.name] = obj;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpp kernel-interfaces', true);
        config.value = kernelInterfacesToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('app.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('vpp kernel-interfaces');
        const payload = formToKernelInterfaces(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('vpp kernel-interfaces', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('app.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createInterface() {
      editingInterface.value = { name: '', description: '', address: '', mtu: '', rx_mode: '', disable: false, vifs: [] };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vppKernel.selectInterfaceFirst') });
      const row = config.value.interfaces.find(i => i.name === selectedInterfaces.value[0]);
      if (!row) return showError({ message: t('vppKernel.interfaceNotFound') });
      editingInterface.value = JSON.parse(JSON.stringify(row));
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vppKernel.selectInterfaceFirst') });
      config.value.interfaces = config.value.interfaces.filter(i => i.name !== selectedInterfaces.value[0]);
      selectedInterfaces.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.name) return showError({ message: t('vppKernel.nameRequired') });
      const list = config.value.interfaces;
      const idx = list.findIndex(i => i._name === editingInterface.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingInterface.value });
      else list.push({ ...editingInterface.value });
      config.value.interfaces = list;
      showInterfaceModal.value = false;
    }

    function createVif() {
      editingVif.value = { vlan_id: '', address: '', description: '', mtu: '', disable: false };
      showVifModal.value = true;
    }

    function editVif() {
      if (!selectedVifs.value.length) return showError({ message: t('vppKernel.selectVifFirst') });
      const row = editingInterface.value.vifs.find(v => v.vlan_id === selectedVifs.value[0]);
      if (!row) return showError({ message: t('vppKernel.vifNotFound') });
      editingVif.value = JSON.parse(JSON.stringify(row));
      showVifModal.value = true;
    }

    function removeVif() {
      if (!selectedVifs.value.length) return showError({ message: t('vppKernel.selectVifFirst') });
      editingInterface.value.vifs = editingInterface.value.vifs.filter(v => v.vlan_id !== selectedVifs.value[0]);
      selectedVifs.value = [];
    }

    function saveVif() {
      if (editingVif.value.vlan_id === '' || editingVif.value.vlan_id === null) return showError({ message: t('vppKernel.vlanIdRequired') });
      const list = editingInterface.value.vifs;
      const idx = list.findIndex(v => v._vlan_id === editingVif.value._vlan_id);
      if (idx >= 0) list.splice(idx, 1, { ...editingVif.value });
      else list.push({ ...editingVif.value });
      editingInterface.value.vifs = list;
      showVifModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, config, commandPath,
      interfaceColumns, vifColumns,
      selectedInterfaces, selectedVifs,
      showInterfaceModal, editingInterface, showVifModal, editingVif,
      load, save,
      createInterface, editInterface, removeInterface, saveInterface,
      createVif, editVif, removeVif, saveVif,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createInterface">{{ t('app.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterfaces.length || selectedInterfaces.length > 1">{{ t('app.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterfaces.length">{{ t('app.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="interfaceColumns" :data="config.interfaces" rowKey="name" :externalToolbar="true" @selection-change="selectedInterfaces = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'vif_count'">
            {{ record.vifs ? record.vifs.length : 0 }}
          </template>
        </template>
      </DataTable>

      <DraggableModal v-model:visible="showInterfaceModal" :title="editingInterface && editingInterface._name ? t('vppKernel.modal.editInterface') : t('vppKernel.modal.createInterface')" @confirm="saveInterface" @close="showInterfaceModal = false" width="800px">
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.name') }}</label><input class="form-control" v-model="editingInterface.name" :disabled="editingInterface._name" placeholder="vpp(tun|tap)N" :title="t('vppKernel.form.name')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.description') }}</label><input class="form-control" v-model="editingInterface.description" :title="t('vppKernel.form.description')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.address') }}</label><textarea class="form-control" v-model="editingInterface.address" rows="3" :placeholder="t('vppKernel.placeholder.addressPerLine')" :title="t('vppKernel.form.address')" /></div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingInterface.mtu" :title="t('vppKernel.form.mtu')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.rxMode') }}</label>
          <select class="form-control" v-model="editingInterface.rx_mode" :title="t('vppKernel.form.rxMode')">
            <option value="">{{ t('vppKernel.rxMode.notSet') }}</option>
            <option value="polling">Polling</option>
            <option value="interrupt">Interrupt</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.disable') }}</label><input type="checkbox" v-model="editingInterface.disable" :title="t('vppKernel.form.disable')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('vppKernel.sections.vifManagement') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createVif">{{ t('vppKernel.buttons.addVif') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editVif" :disabled="!selectedVifs.length || selectedVifs.length > 1">{{ t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeVif" :disabled="!selectedVifs.length">{{ t('app.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="vifColumns" :data="editingInterface.vifs" rowKey="vlan_id" :externalToolbar="true" @selection-change="selectedVifs = $event" :selectable="true" />
      </DraggableModal>

      <DraggableModal v-model:visible="showVifModal" :title="editingVif && editingVif._vlan_id !== undefined ? t('vppKernel.modal.editVif') : t('vppKernel.modal.addVif')" @confirm="saveVif" @close="showVifModal = false">
        <div class="form-row"><label class="form-label">VLAN ID</label><input class="form-control" type="number" min="0" max="4094" v-model="editingVif.vlan_id" :disabled="editingVif._vlan_id !== undefined" title="VLAN ID" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.address') }}</label><textarea class="form-control" v-model="editingVif.address" rows="3" :placeholder="t('vppKernel.placeholder.addressPerLine')" :title="t('vppKernel.form.address')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.description') }}</label><input class="form-control" v-model="editingVif.description" :title="t('vppKernel.form.description')" /></div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingVif.mtu" :title="t('vppKernel.form.mtu')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppKernel.form.disable') }}</label><input type="checkbox" v-model="editingVif.disable" :title="t('vppKernel.form.disable')" /></div>
      </DraggableModal>
    </div>
  `,
});
