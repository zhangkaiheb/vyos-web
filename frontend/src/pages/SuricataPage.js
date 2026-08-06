import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, monitorApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import DataTable from '/src/components/Table/DataTable.js';

const EVE_FILETYPE_OPTIONS = ['regular', 'syslog'];
const EVE_TYPE_OPTIONS = [
  'alert', 'anomaly', 'drop', 'file', 'flow', 'netflow',
  'dcerpc', 'dhcp', 'dnp3', 'dns', 'files', 'ftp', 'http', 'http2',
  'ikev2', 'krb5', 'mqtt', 'nfs', 'rdp', 'rfb', 'sip', 'smb',
  'smtp', 'snmp', 'ssh', 'tftp', 'tls',
];

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

function validateName(name) {
  if (!name || !String(name).trim()) return '请输入名称';
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return '名称只能包含字母、数字、下划线和连字符';
  return '';
}

function validateIPv4(value) {
  if (!value) return '';
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!re.test(value)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIPPrefix(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'IP 子网格式应为 地址/长度';
  const v4 = validateIPv4(parts[0]);
  const v6 = validateIPv6(parts[0]);
  if (v4 && v6) return v4;
  const p = parseInt(parts[1], 10);
  if (isNaN(p)) return '前缀长度格式错误';
  if (!v4 && (p < 0 || p > 32)) return 'IPv4 前缀长度范围为 0-32';
  if (!v6 && (p < 0 || p > 128)) return 'IPv6 前缀长度范围为 0-128';
  return '';
}

function validateAddressEntry(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const item = raw.startsWith('!') ? raw.slice(1).trim() : raw;
  if (!item) return '地址不能为空';
  if (item.includes('/')) {
    const err = validateIPPrefix(item);
    if (err) return err;
  } else {
    const v4 = validateIPv4(item);
    const v6 = validateIPv6(item);
    if (v4 && v6) return v4;
  }
  return '';
}

function validatePortEntry(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const item = raw.startsWith('!') ? raw.slice(1).trim() : raw;
  if (!item) return '端口不能为空';
  if (/^\d+-\d+$/.test(item)) {
    const [a, b] = item.split('-').map(Number);
    if (isNaN(a) || isNaN(b) || a < 1 || b > 65535 || a > b) return '端口范围应为 1-65535 且起始不大于结束';
    return '';
  }
  const n = Number(item);
  if (isNaN(n) || n < 1 || n > 65535) return '端口应为 1-65535 的数字或范围';
  return '';
}

function validateAddressGroupEntries(text) {
  for (const line of splitMembers(text)) {
    const err = validateAddressEntry(line);
    if (err) return err;
  }
  return '';
}

function validatePortGroupEntries(text) {
  for (const line of splitMembers(text)) {
    const err = validatePortEntry(line);
    if (err) return err;
  }
  return '';
}

function suricataToForm(data = {}) {
  const logEve = data.log?.eve || {};
  return {
    interface: toArray(data.interface),
    log: {
      eve: {
        filename: logEve.filename !== undefined ? String(logEve.filename) : '',
        filetype: logEve.filetype || 'regular',
        type: toArray(logEve.type),
      },
    },
    address_groups: Object.entries(data['address-group'] || {}).map(([name, g]) => ({
      _name: name,
      name,
      addresses: toArray(g.address),
      groups: toArray(g.group),
    })),
    port_groups: Object.entries(data['port-group'] || {}).map(([name, g]) => ({
      _name: name,
      name,
      ports: toArray(g.port),
      groups: toArray(g.group),
    })),
  };
}

function suricataToConfig(form) {
  const result = {};
  if (form.interface?.length) result.interface = [...form.interface];

  const eve = {};
  if (isPresent(form.log?.eve?.filename)) eve.filename = String(form.log.eve.filename);
  if (isPresent(form.log?.eve?.filetype)) eve.filetype = String(form.log.eve.filetype);
  if (form.log?.eve?.type?.length) eve.type = [...form.log.eve.type];
  if (Object.keys(eve).length) result.log = { eve };

  const addressGroups = {};
  for (const g of form.address_groups || []) {
    if (!g.name) continue;
    const item = {};
    if (g.addresses?.length) item.address = [...g.addresses];
    if (g.groups?.length) item.group = [...g.groups];
    if (Object.keys(item).length) addressGroups[g.name] = item;
  }
  if (Object.keys(addressGroups).length) result['address-group'] = addressGroups;

  const portGroups = {};
  for (const g of form.port_groups || []) {
    if (!g.name) continue;
    const item = {};
    if (g.ports?.length) item.port = [...g.ports];
    if (g.groups?.length) item.group = [...g.groups];
    if (Object.keys(item).length) portGroups[g.name] = item;
  }
  if (Object.keys(portGroups).length) result['port-group'] = portGroups;

  return result;
}

function defaultAddressGroup() {
  return { name: '', addresses: [], groups: [] };
}

function defaultPortGroup() {
  return { name: '', ports: [], groups: [] };
}

export default defineComponent({
  name: 'SuricataPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(suricataToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);
    const commandPath = 'service suricata';

    const addressGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'addresses', title: '地址数量' },
      { key: 'groups', title: '引用组数量' },
    ];
    const portGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'ports', title: '端口数量' },
      { key: 'groups', title: '引用组数量' },
    ];

    const addressGroupRows = computed(() => (config.value.address_groups || []).map(g => ({
      _name: g.name,
      name: g.name,
      addresses: (g.addresses || []).length,
      groups: (g.groups || []).length,
    })));
    const portGroupRows = computed(() => (config.value.port_groups || []).map(g => ({
      _name: g.name,
      name: g.name,
      ports: (g.ports || []).length,
      groups: (g.groups || []).length,
    })));

    const showAddressModal = ref(false);
    const showPortModal = ref(false);
    const editingAddress = ref(defaultAddressGroup());
    const editingPort = ref(defaultPortGroup());
    const addressModalTitle = ref('');
    const portModalTitle = ref('');
    const addressAddressText = ref('');
    const addressGroupText = ref('');
    const portPortText = ref('');
    const portGroupText = ref('');

    async function loadInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = (res.interfaces || []).slice().sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service suricata', true);
        config.value = suricataToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function openAddressCreate() {
      editingAddress.value = defaultAddressGroup();
      addressAddressText.value = '';
      addressGroupText.value = '';
      addressModalTitle.value = '创建地址组';
      showAddressModal.value = true;
    }

    function openAddressEdit(row) {
      const found = config.value.address_groups.find(g => g.name === row.name);
      if (!found) return;
      editingAddress.value = { ...found };
      addressAddressText.value = joinMembers(found.addresses);
      addressGroupText.value = joinMembers(found.groups);
      addressModalTitle.value = '编辑地址组';
      showAddressModal.value = true;
    }

    function deleteAddressGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.address_groups.find(g => g.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除地址组 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      config.value.address_groups = config.value.address_groups.filter(g => !names.includes(g.name));
    }

    function saveAddressGroup() {
      const err = validateName(editingAddress.value.name);
      if (err) return alert(err);
      const addrErr = validateAddressGroupEntries(addressAddressText.value);
      if (addrErr) return alert(addrErr);
      const addresses = splitMembers(addressAddressText.value);
      const groups = splitMembers(addressGroupText.value);
      const existing = config.value.address_groups.findIndex(g => g._name === editingAddress.value._name);
      const item = { _name: editingAddress.value.name, name: editingAddress.value.name, addresses, groups };
      if (existing >= 0) {
        config.value.address_groups[existing] = item;
      } else {
        if (config.value.address_groups.some(g => g.name === item.name)) {
          return alert('地址组名称已存在');
        }
        config.value.address_groups.push(item);
      }
      showAddressModal.value = false;
    }

    function openPortCreate() {
      editingPort.value = defaultPortGroup();
      portPortText.value = '';
      portGroupText.value = '';
      portModalTitle.value = '创建端口组';
      showPortModal.value = true;
    }

    function openPortEdit(row) {
      const found = config.value.port_groups.find(g => g.name === row.name);
      if (!found) return;
      editingPort.value = { ...found };
      portPortText.value = joinMembers(found.ports);
      portGroupText.value = joinMembers(found.groups);
      portModalTitle.value = '编辑端口组';
      showPortModal.value = true;
    }

    function deletePortGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.port_groups.find(g => g.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除端口组 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      config.value.port_groups = config.value.port_groups.filter(g => !names.includes(g.name));
    }

    function savePortGroup() {
      const err = validateName(editingPort.value.name);
      if (err) return alert(err);
      const portErr = validatePortGroupEntries(portPortText.value);
      if (portErr) return alert(portErr);
      const ports = splitMembers(portPortText.value);
      const groups = splitMembers(portGroupText.value);
      const existing = config.value.port_groups.findIndex(g => g._name === editingPort.value._name);
      const item = { _name: editingPort.value.name, name: editingPort.value.name, ports, groups };
      if (existing >= 0) {
        config.value.port_groups[existing] = item;
      } else {
        if (config.value.port_groups.some(g => g.name === item.name)) {
          return alert('端口组名称已存在');
        }
        config.value.port_groups.push(item);
      }
      showPortModal.value = false;
    }

    async function save() {
      saving.value = true;
      try {
        const value = suricataToConfig(config.value);
        const paths = [
          'service suricata interface',
          'service suricata log',
          'service suricata address-group',
          'service suricata port-group',
        ];
        for (const p of paths) {
          try { await configApi.delete(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configApi.set('service suricata', value);
        }
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      addressGroupColumns, portGroupColumns, addressGroupRows, portGroupRows,
      showAddressModal, showPortModal, editingAddress, editingPort,
      addressModalTitle, portModalTitle, addressAddressText, addressGroupText,
      portPortText, portGroupText,
      load, save, openAddressCreate, openAddressEdit, deleteAddressGroup, saveAddressGroup,
      openPortCreate, openPortEdit, deletePortGroup, savePortGroup,
      EVE_FILETYPE_OPTIONS, EVE_TYPE_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton, DraggableModal, DualListSelector, DataTable },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'address-groups', title: '地址组' },
        { key: 'port-groups', title: '端口组' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label">监听接口</label>
            <DualListSelector v-model="config.interface" :options="interfaces" title-left="可选" title-right="已选" />
          </div>
          <div class="form-section">
            <div class="form-section-title">EVE 日志</div>
            <div class="form-row">
              <label class="form-label">文件名</label>
              <input class="form-control" v-model="config.log.eve.filename" placeholder="eve.json" />
            </div>
            <div class="form-row">
              <label class="form-label">文件类型</label>
              <select class="form-control" v-model="config.log.eve.filetype">
                <option v-for="t in EVE_FILETYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">日志类型</label>
              <DualListSelector v-model="config.log.eve.type" :options="EVE_TYPE_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
        </template>

        <template #address-groups>
          <div class="data-table-wrapper">
            <DataTable :columns="addressGroupColumns" :data="addressGroupRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openAddressCreate" @edit="openAddressEdit" @delete="deleteAddressGroup" @refresh="load" />
          </div>
        </template>

        <template #port-groups>
          <div class="data-table-wrapper">
            <DataTable :columns="portGroupColumns" :data="portGroupRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openPortCreate" @edit="openPortEdit" @delete="deletePortGroup" @refresh="load" />
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="showAddressModal" :title="addressModalTitle">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingAddress.name" placeholder="地址组名称" /></div>
        <div class="form-row">
          <label class="form-label">地址列表</label>
          <textarea class="form-control" v-model="addressAddressText" rows="5" placeholder="每行一个 IPv4/IPv6 地址或子网，可使用 ! 取反"></textarea>
        </div>
        <div class="form-row">
          <label class="form-label">引用地址组</label>
          <textarea class="form-control" v-model="addressGroupText" rows="3" placeholder="每行一个地址组名，可使用 ! 取反"></textarea>
        </div>
        <div class="form-actions">
          <ToolbarButton @click="showAddressModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveAddressGroup">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showPortModal" :title="portModalTitle">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingPort.name" placeholder="端口组名称" /></div>
        <div class="form-row">
          <label class="form-label">端口列表</label>
          <textarea class="form-control" v-model="portPortText" rows="5" placeholder="每行一个端口、范围（如 1001-1005），可使用 ! 取反"></textarea>
        </div>
        <div class="form-row">
          <label class="form-label">引用端口组</label>
          <textarea class="form-control" v-model="portGroupText" rows="3" placeholder="每行一个端口组名，可使用 ! 取反"></textarea>
        </div>
        <div class="form-actions">
          <ToolbarButton @click="showPortModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="savePortGroup">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
