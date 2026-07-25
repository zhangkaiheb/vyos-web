import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const LEGACY_PROTOCOLS_OPTIONS = ['cdp', 'edp', 'fdp', 'sonmp'];

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

function joinMembers(val) {
  return toArray(val).join('\n');
}

function splitMembers(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  if (!/^([0-9a-fA-F:]+)$/.test(value) || !value.includes(':')) return 'IPv6 地址格式错误';
  return '';
}

function validateIPAddress(value) {
  if (!value) return '';
  if (!validateIPv4(value) || !validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function lldpInterfacesToForm(interfaces = {}) {
  return Object.entries(interfaces).map(([name, iface]) => ({
    _interface: name,
    interface: name,
    location: iface.location || '',
    disable: iface.disable !== undefined,
  }));
}

function lldpInterfacesToConfig(formInterfaces) {
  const result = {};
  for (const iface of formInterfaces || []) {
    if (!iface.interface) continue;
    const item = {};
    if (isPresent(iface.location)) item.location = String(iface.location);
    if (iface.disable) item.disable = '';
    result[iface.interface] = item;
  }
  return result;
}

function lldpToForm(data = {}) {
  return {
    legacy_protocols: data['legacy-protocols'] || '',
    management_address: joinMembers(data['management-address']),
    snmp: data.snmp !== undefined,
    interfaces: lldpInterfacesToForm(data.interface),
  };
}

function lldpToConfig(form) {
  const result = {};
  if (isPresent(form.legacy_protocols)) result['legacy-protocols'] = String(form.legacy_protocols);
  const managementAddresses = splitMembers(form.management_address);
  if (managementAddresses.length) result['management-address'] = managementAddresses;
  if (form.snmp) result.snmp = '';
  const interfaces = lldpInterfacesToConfig(form.interfaces);
  if (Object.keys(interfaces).length) result.interface = interfaces;
  return result;
}

export default defineComponent({
  name: 'LldpPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(lldpToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      if (activeTab.value === 'interface') return 'service lldp interface';
      return 'service lldp';
    });

    const interfaceColumns = [
      { key: 'interface', title: '接口' },
      { key: 'location', title: '位置' },
      { key: 'disable', title: '禁用', render: (v) => v ? '是' : '否' },
    ];

    const selectedInterface = ref([]);
    const showInterfaceModal = ref(false);
    const editingInterface = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service lldp', true);
        config.value = lldpToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const managementAddresses = splitMembers(config.value.management_address);
      for (const ip of managementAddresses) {
        const err = validateIPAddress(ip);
        if (err) return alert(`管理地址 ${ip} 格式错误`);
      }
      for (const iface of config.value.interfaces || []) {
        if (!iface.interface) return alert('接口不能为空');
      }

      saving.value = true;
      try {
        await configApi.set('service lldp', lldpToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createInterface() {
      editingInterface.value = { interface: '', location: '', disable: false };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterface.value.length) return alert('请选择要编辑的接口');
      const row = (config.value.interfaces || []).find(i => i.interface === selectedInterface.value[0]);
      if (!row) return alert('未找到选中的接口');
      editingInterface.value = { ...row };
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterface.value.length) return alert('请选择要删除的接口');
      config.value.interfaces = (config.value.interfaces || []).filter(i => i.interface !== selectedInterface.value[0]);
      selectedInterface.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.interface) return alert('请选择接口');
      const list = config.value.interfaces || [];
      const idx = list.findIndex(i => i._interface === editingInterface.value._interface);
      if (idx >= 0) list.splice(idx, 1, { ...editingInterface.value });
      else list.push({ ...editingInterface.value });
      config.value.interfaces = list;
      showInterfaceModal.value = false;
    }

    onMounted(load);

    return {
      LEGACY_PROTOCOLS_OPTIONS,
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      interfaceColumns, selectedInterface, showInterfaceModal, editingInterface,
      load, save, createInterface, editInterface, removeInterface, saveInterface,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'interface', title: '接口' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label">Legacy Protocols</label>
            <select class="form-control" v-model="config.legacy_protocols" title="兼容的 LLDP 旧协议">
              <option value="">未选择</option>
              <option v-for="o in LEGACY_PROTOCOLS_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">管理地址</label>
            <textarea class="form-control" v-model="config.management_address" rows="3" placeholder="每行一个 IPv4/IPv6 管理地址" title="发送的 LLDP 管理地址" />
          </div>
          <div class="form-row"><label class="form-label">SNMP</label><input type="checkbox" v-model="config.snmp" title="启用 SNMP 支持" /></div>
        </template>

        <template #interface>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createInterface">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterface.length || selectedInterface.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterface.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" row-key="interface" :externalToolbar="true" @selection-change="selectedInterface = $event" :selectable="true" />
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showInterfaceModal" title="接口" @confirm="saveInterface" @close="showInterfaceModal = false">
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingInterface.interface" :disabled="editingInterface._interface" title="LLDP 接口">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">位置</label><input class="form-control" v-model="editingInterface.location" title="接口 LLDP 位置" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingInterface.disable" title="禁用该接口 LLDP" /></div>
      </DraggableModal>
    </div>
  `,
});
