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
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const config = ref({
      interfaces: [],
    });

    const interfaceColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'address', title: '地址', dataIndex: 'address', width: 150 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'rx_mode', title: 'RX模式', dataIndex: 'rx_mode', width: 100 },
      { key: 'disable', title: '禁用', dataIndex: 'disable', width: 60 },
      { key: 'vif_count', title: 'VIF数', dataIndex: 'vif_count', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const vifColumns = [
      { key: 'vlan_id', title: 'VLAN ID', dataIndex: 'vlan_id', width: 80 },
      { key: 'address', title: '地址', dataIndex: 'address', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'disable', title: '禁用', dataIndex: 'disable', width: 60 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
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
      saved.value = false;
      try {
        const res = await configApi.get('vpp kernel-interfaces', true);
        config.value = kernelInterfacesToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp kernel-interfaces');
        const payload = formToKernelInterfaces(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp kernel-interfaces', payload);
        }
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createInterface() {
      editingInterface.value = { name: '', description: '', address: '', mtu: '', rx_mode: '', disable: false, vifs: [] };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterfaces.value.length) return alert('请选择要编辑的接口');
      const row = config.value.interfaces.find(i => i.name === selectedInterfaces.value[0]);
      if (!row) return alert('未找到选中的接口');
      editingInterface.value = JSON.parse(JSON.stringify(row));
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterfaces.value.length) return alert('请选择要删除的接口');
      config.value.interfaces = config.value.interfaces.filter(i => i.name !== selectedInterfaces.value[0]);
      selectedInterfaces.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.name) return alert('请输入接口名称');
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
      if (!selectedVifs.value.length) return alert('请选择要编辑的VIF');
      const row = editingInterface.value.vifs.find(v => v.vlan_id === selectedVifs.value[0]);
      if (!row) return alert('未找到选中的VIF');
      editingVif.value = JSON.parse(JSON.stringify(row));
      showVifModal.value = true;
    }

    function removeVif() {
      if (!selectedVifs.value.length) return alert('请选择要删除的VIF');
      editingInterface.value.vifs = editingInterface.value.vifs.filter(v => v.vlan_id !== selectedVifs.value[0]);
      selectedVifs.value = [];
    }

    function saveVif() {
      if (editingVif.value.vlan_id === '' || editingVif.value.vlan_id === null) return alert('请输入VLAN ID');
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
    });

    return {
      loading, saving, saved, config, commandPath,
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
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="toolbar">
        <ToolbarButton icon="create" @click="createInterface">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterfaces.length || selectedInterfaces.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterfaces.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="interfaceColumns" :data="config.interfaces" rowKey="name" :externalToolbar="true" @selection-change="selectedInterfaces = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'vif_count'">
            {{ record.vifs ? record.vifs.length : 0 }}
          </template>
        </template>
      </DataTable>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showInterfaceModal" :title="editingInterface && editingInterface._name ? '编辑内核接口' : '新建内核接口'" @confirm="saveInterface" @close="showInterfaceModal = false" width="800px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingInterface.name" :disabled="editingInterface._name" placeholder="vpp(tun|tap)N" title="内核接口名称" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingInterface.description" title="接口描述" /></div>
        <div class="form-row"><label class="form-label">地址</label><textarea class="form-control" v-model="editingInterface.address" rows="3" placeholder="每行一个IP/dhcp/dhcpv6" title="IP地址" /></div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingInterface.mtu" title="最大传输单元" /></div>
        <div class="form-row"><label class="form-label">RX模式</label>
          <select class="form-control" v-model="editingInterface.rx_mode" title="接收模式">
            <option value="">未设置</option>
            <option value="polling">Polling</option>
            <option value="interrupt">Interrupt</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingInterface.disable" title="禁用接口" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">VIF管理</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createVif">添加VIF</ToolbarButton>
          <ToolbarButton icon="edit" @click="editVif" :disabled="!selectedVifs.length || selectedVifs.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeVif" :disabled="!selectedVifs.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="vifColumns" :data="editingInterface.vifs" rowKey="vlan_id" :externalToolbar="true" @selection-change="selectedVifs = $event" :selectable="true" />
      </DraggableModal>

      <DraggableModal v-model:visible="showVifModal" :title="editingVif && editingVif._vlan_id !== undefined ? '编辑VIF' : '添加VIF'" @confirm="saveVif" @close="showVifModal = false">
        <div class="form-row"><label class="form-label">VLAN ID</label><input class="form-control" type="number" min="0" max="4094" v-model="editingVif.vlan_id" :disabled="editingVif._vlan_id !== undefined" title="VLAN ID" /></div>
        <div class="form-row"><label class="form-label">地址</label><textarea class="form-control" v-model="editingVif.address" rows="3" placeholder="每行一个IP/dhcp/dhcpv6" title="IP地址" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingVif.description" title="VIF描述" /></div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingVif.mtu" title="最大传输单元" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingVif.disable" title="禁用VIF" /></div>
      </DraggableModal>
    </div>
  `,
});
