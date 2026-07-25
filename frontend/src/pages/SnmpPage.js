import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const PROTOCOL_OPTIONS = [
  { key: 'udp', label: 'UDP（默认）' },
  { key: 'tcp', label: 'TCP' },
];

const AUTHORIZATION_OPTIONS = [
  { key: 'ro', label: 'Read-Only（默认）' },
  { key: 'rw', label: 'Read-Write' },
];

const OID_ENABLE_OPTIONS = [
  { key: 'ip-forward', label: 'ip-forward (.1.3.6.1.2.1.4.24)' },
  { key: 'ip-route-table', label: 'ip-route-table (.1.3.6.1.2.1.4.21)' },
  { key: 'ip-net-to-media-table', label: 'ip-net-to-media-table (.1.3.6.1.2.1.4.22)' },
  { key: 'ip-net-to-physical-phys-address', label: 'ip-net-to-physical-phys-address (.1.3.6.1.2.1.4.35)' },
];

const V3_MODE_OPTIONS = [
  { key: 'ro', label: 'Read-Only（默认）' },
  { key: 'rw', label: 'Read-Write' },
];

const V3_SECLEVEL_OPTIONS = [
  { key: 'auth', label: 'auth（默认）' },
  { key: 'noauth', label: 'noauth' },
  { key: 'priv', label: 'priv' },
];

const V3_AUTH_TYPE_OPTIONS = [
  { key: 'md5', label: 'MD5（默认）' },
  { key: 'sha', label: 'SHA' },
];

const V3_PRIVACY_TYPE_OPTIONS = [
  { key: 'des', label: 'DES（默认）' },
  { key: 'aes', label: 'AES' },
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
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  if (!validateIPv4(value) || !validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function validateIPPrefix(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'IP 前缀格式应为 地址/长度';
  const [ip, prefix] = parts;
  const p = parseInt(prefix, 10);
  if (isNaN(p)) return '前缀长度必须为数字';
  const v4Err = validateIPv4(ip);
  const v6Err = validateIPv6(ip);
  if (!v4Err && (p < 0 || p > 32)) return 'IPv4 前缀范围 0-32';
  if (!v6Err && (p < 0 || p > 128)) return 'IPv6 前缀范围 0-128';
  if (v4Err && v6Err) return 'IP 地址格式错误';
  return '';
}

function validateEngineID(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F]+$/.test(value)) return 'Engine ID 必须为十六进制字符';
  if (value.length < 10 || value.length > 64) return 'Engine ID 长度应为 10-64 个十六进制字符';
  return '';
}

function validateOID(value) {
  if (!value) return '';
  if (!/^\.?\d+(\.\d+)*$/.test(value)) return 'OID 格式错误，示例：.1.3.6.1.2.1.4.24';
  return '';
}

function communitiesToForm(communities = {}) {
  return Object.entries(communities).map(([name, c]) => ({
    _name: name,
    name,
    authorization: c.authorization || 'ro',
    client: toArray(c.client),
    network: toArray(c.network),
  }));
}

function communitiesToConfig(formCommunities) {
  const result = {};
  for (const c of formCommunities) {
    if (!c.name) continue;
    const item = {};
    if (isPresent(c.authorization)) item.authorization = c.authorization;
    if (c.client?.length) item.client = [...c.client];
    if (c.network?.length) item.network = [...c.network];
    result[c.name] = item;
  }
  return result;
}

function trapTargetsToForm(targets = {}) {
  return Object.entries(targets).map(([target, t]) => ({
    _target: target,
    target,
    port: t.port !== undefined ? String(t.port) : '',
  }));
}

function trapTargetsToConfig(formTargets) {
  const result = {};
  for (const t of formTargets) {
    if (!t.target) continue;
    const item = {};
    if (isPresent(t.port)) item.port = String(t.port);
    result[t.target] = item;
  }
  return result;
}

function scriptExtensionsToForm(extensions = {}) {
  return Object.entries(extensions).map(([name, e]) => ({
    _name: name,
    name,
    script: e.script || '',
  }));
}

function scriptExtensionsToConfig(formExtensions) {
  const result = {};
  for (const e of formExtensions) {
    if (!e.name) continue;
    const item = {};
    if (isPresent(e.script)) item.script = e.script;
    result[e.name] = item;
  }
  return result;
}

function v3TrapTargetsToForm(targets = {}) {
  return Object.entries(targets).map(([target, t]) => ({
    _target: target,
    target,
    port: t.port !== undefined ? String(t.port) : '',
  }));
}

function v3TrapTargetsToConfig(formTargets) {
  const result = {};
  for (const t of formTargets) {
    if (!t.target) continue;
    const item = {};
    if (isPresent(t.port)) item.port = String(t.port);
    result[t.target] = item;
  }
  return result;
}

function v3GroupsToForm(groups = {}) {
  return Object.entries(groups).map(([name, g]) => ({
    _name: name,
    name,
    mode: g.mode || 'ro',
    seclevel: g.seclevel || 'auth',
    view: g.view || '',
  }));
}

function v3GroupsToConfig(formGroups) {
  const result = {};
  for (const g of formGroups) {
    if (!g.name) continue;
    const item = {};
    if (isPresent(g.mode)) item.mode = g.mode;
    if (isPresent(g.seclevel)) item.seclevel = g.seclevel;
    if (isPresent(g.view)) item.view = g.view;
    result[g.name] = item;
  }
  return result;
}

function v3UsersToForm(users = {}) {
  return Object.entries(users).map(([name, u]) => {
    const auth = u.auth || {};
    const privacy = u.privacy || {};
    return {
      _name: name,
      name,
      group: u.group || '',
      mode: u.mode || 'ro',
      auth_type: auth.type || 'md5',
      auth_plaintext: auth['plaintext-password'] || '',
      auth_encrypted: auth['encrypted-password'] || '',
      privacy_type: privacy.type || 'des',
      privacy_plaintext: privacy['plaintext-password'] || '',
      privacy_encrypted: privacy['encrypted-password'] || '',
    };
  });
}

function v3UsersToConfig(formUsers) {
  const result = {};
  for (const u of formUsers) {
    if (!u.name) continue;
    const item = {};
    if (isPresent(u.group)) item.group = u.group;
    if (isPresent(u.mode)) item.mode = u.mode;
    const auth = {};
    if (isPresent(u.auth_type)) auth.type = u.auth_type;
    if (isPresent(u.auth_plaintext)) auth['plaintext-password'] = u.auth_plaintext;
    if (isPresent(u.auth_encrypted)) auth['encrypted-password'] = u.auth_encrypted;
    if (Object.keys(auth).length) item.auth = auth;
    const privacy = {};
    if (isPresent(u.privacy_type)) privacy.type = u.privacy_type;
    if (isPresent(u.privacy_plaintext)) privacy['plaintext-password'] = u.privacy_plaintext;
    if (isPresent(u.privacy_encrypted)) privacy['encrypted-password'] = u.privacy_encrypted;
    if (Object.keys(privacy).length) item.privacy = privacy;
    result[u.name] = item;
  }
  return result;
}

function v3ViewsToForm(views = {}) {
  return Object.entries(views).map(([name, v]) => {
    const oids = v.oid || {};
    return {
      _name: name,
      name,
      oids: Object.keys(oids).join('\n'),
    };
  });
}

function v3ViewsToConfig(formViews) {
  const result = {};
  for (const v of formViews) {
    if (!v.name) continue;
    const item = {};
    const oids = splitMembers(v.oids);
    if (oids.length) {
      item.oid = {};
      for (const o of oids) item.oid[o] = {};
    }
    result[v.name] = item;
  }
  return result;
}

function snmpToForm(data = {}) {
  const v3 = data.v3 || {};
  return {
    description: data.description || '',
    contact: data.contact || '',
    location: data.location || '',
    protocol: data.protocol || 'udp',
    vrf: data.vrf || '',
    listen_address: toArray(data['listen-address']),
    trap_source: data['trap-source'] || '',
    trap_targets: trapTargetsToForm(data['trap-target']),
    oid_enable: toArray(data['oid-enable']),
    smux_peer: toArray(data['smux-peer']),
    communities: communitiesToForm(data.community),
    script_extensions: scriptExtensionsToForm(data['script-extensions']?.['extension-name']),
    v3: {
      engineid: v3.engineid || '',
      groups: v3GroupsToForm(v3.group),
      users: v3UsersToForm(v3.user),
      views: v3ViewsToForm(v3.view),
      trap_targets: v3TrapTargetsToForm(v3['trap-target']),
    },
  };
}

function snmpToConfig(form) {
  const result = {};
  if (isPresent(form.description)) result.description = form.description;
  if (isPresent(form.contact)) result.contact = form.contact;
  if (isPresent(form.location)) result.location = form.location;
  if (isPresent(form.protocol)) result.protocol = form.protocol;
  if (isPresent(form.vrf)) result.vrf = form.vrf;
  if (form.listen_address?.length) result['listen-address'] = [...form.listen_address];
  if (isPresent(form.trap_source)) result['trap-source'] = form.trap_source;
  const trapTargets = trapTargetsToConfig(form.trap_targets || []);
  if (Object.keys(trapTargets).length) result['trap-target'] = trapTargets;
  if (form.oid_enable?.length) result['oid-enable'] = [...form.oid_enable];
  if (form.smux_peer?.length) result['smux-peer'] = [...form.smux_peer];
  const communities = communitiesToConfig(form.communities || []);
  if (Object.keys(communities).length) result.community = communities;
  const extensions = scriptExtensionsToConfig(form.script_extensions || []);
  if (Object.keys(extensions).length) {
    result['script-extensions'] = { 'extension-name': extensions };
  }
  const v3Result = {};
  if (isPresent(form.v3?.engineid)) v3Result.engineid = form.v3.engineid;
  const v3Groups = v3GroupsToConfig(form.v3?.groups || []);
  if (Object.keys(v3Groups).length) v3Result.group = v3Groups;
  const v3Users = v3UsersToConfig(form.v3?.users || []);
  if (Object.keys(v3Users).length) v3Result.user = v3Users;
  const v3Views = v3ViewsToConfig(form.v3?.views || []);
  if (Object.keys(v3Views).length) v3Result.view = v3Views;
  const v3TrapTargets = v3TrapTargetsToConfig(form.v3?.trap_targets || []);
  if (Object.keys(v3TrapTargets).length) v3Result['trap-target'] = v3TrapTargets;
  if (Object.keys(v3Result).length) result.v3 = v3Result;
  return result;
}

export default defineComponent({
  name: 'SnmpPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(snmpToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const localAddresses = computed(() => {
      const addresses = new Set();
      for (const iface of interfaces.value) {
        for (const ip of toArray(iface.ipv4_address)) addresses.add(String(ip).split('/')[0]);
        for (const ip of toArray(iface.ipv6_address)) addresses.add(String(ip).split('/')[0]);
      }
      addresses.add('127.0.0.1');
      addresses.add('::1');
      return Array.from(addresses).filter(Boolean).sort();
    });

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = res.interfaces || [];
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'communities': return 'service snmp community';
        case 'trap-targets': return 'service snmp trap-target';
        case 'script-extensions': return 'service snmp script-extensions extension-name';
        case 'v3': return 'service snmp v3';
        case 'basic':
        default: return 'service snmp';
      }
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service snmp', true);
        config.value = snmpToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      for (const ip of config.value.listen_address || []) {
        const err = validateIP(ip);
        if (err) return alert(`监听地址 ${ip}：${err}`);
      }
      if (isPresent(config.value.trap_source)) {
        const err = validateIP(config.value.trap_source);
        if (err) return alert(`Trap 源地址：${err}`);
      }
      for (const t of config.value.trap_targets || []) {
        if (!t.target) return alert('Trap 目标地址不能为空');
        const err = validateIP(t.target);
        if (err) return alert(`Trap 目标 ${t.target}：${err}`);
        if (isPresent(t.port)) {
          const port = parseInt(t.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) return alert(`Trap 目标 ${t.target} 端口范围 1-65535`);
        }
      }
      for (const c of config.value.communities || []) {
        if (!c.name) return alert('Community 名称不能为空');
        for (const ip of c.client || []) {
          const err = validateIP(ip);
          if (err) return alert(`Community ${c.name} 客户端 ${ip}：${err}`);
        }
        for (const net of c.network || []) {
          const err = validateIPPrefix(net);
          if (err) return alert(`Community ${c.name} 网络 ${net}：${err}`);
        }
      }
      for (const e of config.value.script_extensions || []) {
        if (!e.name) return alert('Script Extension 名称不能为空');
        if (!isPresent(e.script)) return alert(`Script Extension ${e.name} 脚本路径不能为空`);
      }
      for (const oid of config.value.smux_peer || []) {
        const err = validateOID(oid);
        if (err) return alert(`SMUX Peer OID ${oid}：${err}`);
      }
      if (isPresent(config.value.v3?.engineid)) {
        const err = validateEngineID(config.value.v3.engineid);
        if (err) return alert(`Engine ID：${err}`);
      }
      for (const g of config.value.v3?.groups || []) {
        if (!g.name) return alert('v3 组名不能为空');
        const err = validateName(g.name);
        if (err) return alert(`v3 组 ${g.name}：${err}`);
      }
      for (const t of config.value.v3?.trap_targets || []) {
        if (!t.target) return alert('v3 Trap 目标地址不能为空');
        const err = validateIP(t.target);
        if (err) return alert(`v3 Trap 目标 ${t.target}：${err}`);
        if (isPresent(t.port)) {
          const port = parseInt(t.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) return alert(`v3 Trap 目标 ${t.target} 端口范围 1-65535`);
        }
      }
      for (const u of config.value.v3?.users || []) {
        if (!u.name) return alert('v3 用户名不能为空');
        if (!isPresent(u.group)) return alert(`v3 用户 ${u.name} 所属组不能为空`);
      }
      for (const v of config.value.v3?.views || []) {
        if (!v.name) return alert('v3 视图名称不能为空');
        for (const oid of splitMembers(v.oids)) {
          const err = validateOID(oid);
          if (err) return alert(`v3 视图 ${v.name} OID ${oid}：${err}`);
        }
      }

      saving.value = true;
      try {
        await configApi.set('service snmp', snmpToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    const communityColumns = [
      { key: 'name', title: 'Community 名称' },
      { key: 'authorization', title: '授权' },
      { key: 'client', title: '允许客户端', render: v => toArray(v).join(', ') },
      { key: 'network', title: '允许网络', render: v => toArray(v).join(', ') },
    ];
    const selectedCommunity = ref([]);
    const showCommunityModal = ref(false);
    const editingCommunity = ref({});

    function createCommunity() {
      editingCommunity.value = { name: '', authorization: 'ro', client: [], network: [] };
      showCommunityModal.value = true;
    }

    function editCommunity() {
      if (!selectedCommunity.value.length) return alert('请选择要编辑的 Community');
      const row = (config.value.communities || []).find(c => c._name === selectedCommunity.value[0]);
      if (!row) return alert('未找到选中的 Community');
      editingCommunity.value = JSON.parse(JSON.stringify(row));
      showCommunityModal.value = true;
    }

    function removeCommunity() {
      if (!selectedCommunity.value.length) return alert('请选择要删除的 Community');
      config.value.communities = (config.value.communities || []).filter(c => c._name !== selectedCommunity.value[0]);
      selectedCommunity.value = [];
    }

    function saveCommunity() {
      const err = validateName(editingCommunity.value.name);
      if (err) return alert(err);
      const list = config.value.communities || [];
      const idx = list.findIndex(c => c._name === editingCommunity.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingCommunity.value)));
      } else {
        if (list.some(c => c.name === editingCommunity.value.name)) return alert('该 Community 名称已存在');
        list.push(JSON.parse(JSON.stringify(editingCommunity.value)));
      }
      config.value.communities = [...list];
      selectedCommunity.value = [];
      showCommunityModal.value = false;
    }

    const trapTargetColumns = [
      { key: 'target', title: '目标地址' },
      { key: 'port', title: '端口' },
    ];
    const selectedTrapTarget = ref([]);
    const showTrapTargetModal = ref(false);
    const editingTrapTarget = ref({});

    function createTrapTarget() {
      editingTrapTarget.value = { target: '', port: '' };
      showTrapTargetModal.value = true;
    }

    function editTrapTarget() {
      if (!selectedTrapTarget.value.length) return alert('请选择要编辑的 Trap 目标');
      const row = (config.value.trap_targets || []).find(t => t._target === selectedTrapTarget.value[0]);
      if (!row) return alert('未找到选中的 Trap 目标');
      editingTrapTarget.value = JSON.parse(JSON.stringify(row));
      showTrapTargetModal.value = true;
    }

    function removeTrapTarget() {
      if (!selectedTrapTarget.value.length) return alert('请选择要删除的 Trap 目标');
      config.value.trap_targets = (config.value.trap_targets || []).filter(t => t._target !== selectedTrapTarget.value[0]);
      selectedTrapTarget.value = [];
    }

    function saveTrapTarget() {
      if (!editingTrapTarget.value.target) return alert('请输入 Trap 目标地址');
      const err = validateIP(editingTrapTarget.value.target);
      if (err) return alert(err);
      const list = config.value.trap_targets || [];
      const idx = list.findIndex(t => t._target === editingTrapTarget.value._target);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingTrapTarget.value)));
      } else {
        if (list.some(t => t.target === editingTrapTarget.value.target)) return alert('该 Trap 目标已存在');
        list.push(JSON.parse(JSON.stringify(editingTrapTarget.value)));
      }
      config.value.trap_targets = [...list];
      selectedTrapTarget.value = [];
      showTrapTargetModal.value = false;
    }

    const scriptExtensionColumns = [
      { key: 'name', title: '扩展名称' },
      { key: 'script', title: '脚本路径' },
    ];
    const selectedScriptExtension = ref([]);
    const showScriptExtensionModal = ref(false);
    const editingScriptExtension = ref({});

    function createScriptExtension() {
      editingScriptExtension.value = { name: '', script: '' };
      showScriptExtensionModal.value = true;
    }

    function editScriptExtension() {
      if (!selectedScriptExtension.value.length) return alert('请选择要编辑的 Script Extension');
      const row = (config.value.script_extensions || []).find(e => e._name === selectedScriptExtension.value[0]);
      if (!row) return alert('未找到选中的 Script Extension');
      editingScriptExtension.value = JSON.parse(JSON.stringify(row));
      showScriptExtensionModal.value = true;
    }

    function removeScriptExtension() {
      if (!selectedScriptExtension.value.length) return alert('请选择要删除的 Script Extension');
      config.value.script_extensions = (config.value.script_extensions || []).filter(e => e._name !== selectedScriptExtension.value[0]);
      selectedScriptExtension.value = [];
    }

    function saveScriptExtension() {
      if (!editingScriptExtension.value.name) return alert('请输入扩展名称');
      if (!isPresent(editingScriptExtension.value.script)) return alert('请输入脚本路径');
      const list = config.value.script_extensions || [];
      const idx = list.findIndex(e => e._name === editingScriptExtension.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingScriptExtension.value)));
      } else {
        if (list.some(e => e.name === editingScriptExtension.value.name)) return alert('该扩展名称已存在');
        list.push(JSON.parse(JSON.stringify(editingScriptExtension.value)));
      }
      config.value.script_extensions = [...list];
      selectedScriptExtension.value = [];
      showScriptExtensionModal.value = false;
    }

    const v3GroupColumns = [
      { key: 'name', title: '组名' },
      { key: 'mode', title: '模式' },
      { key: 'seclevel', title: '安全级别' },
      { key: 'view', title: '视图' },
    ];
    const selectedV3Group = ref([]);
    const showV3GroupModal = ref(false);
    const editingV3Group = ref({});

    function createV3Group() {
      editingV3Group.value = { name: '', mode: 'ro', seclevel: 'auth', view: '' };
      showV3GroupModal.value = true;
    }

    function editV3Group() {
      if (!selectedV3Group.value.length) return alert('请选择要编辑的 v3 组');
      const row = (config.value.v3?.groups || []).find(g => g._name === selectedV3Group.value[0]);
      if (!row) return alert('未找到选中的 v3 组');
      editingV3Group.value = JSON.parse(JSON.stringify(row));
      showV3GroupModal.value = true;
    }

    function removeV3Group() {
      if (!selectedV3Group.value.length) return alert('请选择要删除的 v3 组');
      config.value.v3.groups = (config.value.v3?.groups || []).filter(g => g._name !== selectedV3Group.value[0]);
      selectedV3Group.value = [];
    }

    function saveV3Group() {
      const err = validateName(editingV3Group.value.name);
      if (err) return alert(err);
      const list = config.value.v3?.groups || [];
      const idx = list.findIndex(g => g._name === editingV3Group.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingV3Group.value)));
      } else {
        if (list.some(g => g.name === editingV3Group.value.name)) return alert('该 v3 组已存在');
        list.push(JSON.parse(JSON.stringify(editingV3Group.value)));
      }
      if (!config.value.v3) config.value.v3 = {};
      config.value.v3.groups = [...list];
      selectedV3Group.value = [];
      showV3GroupModal.value = false;
    }

    const v3UserColumns = [
      { key: 'name', title: '用户名' },
      { key: 'group', title: '所属组' },
      { key: 'mode', title: '模式' },
      { key: 'auth_type', title: '认证协议' },
      { key: 'privacy_type', title: '加密协议' },
    ];
    const selectedV3User = ref([]);
    const showV3UserModal = ref(false);
    const editingV3User = ref({});

    function createV3User() {
      editingV3User.value = {
        name: '', group: '', mode: 'ro', auth_type: 'md5', auth_plaintext: '', auth_encrypted: '',
        privacy_type: 'des', privacy_plaintext: '', privacy_encrypted: '',
      };
      showV3UserModal.value = true;
    }

    function editV3User() {
      if (!selectedV3User.value.length) return alert('请选择要编辑的 v3 用户');
      const row = (config.value.v3?.users || []).find(u => u._name === selectedV3User.value[0]);
      if (!row) return alert('未找到选中的 v3 用户');
      editingV3User.value = JSON.parse(JSON.stringify(row));
      showV3UserModal.value = true;
    }

    function removeV3User() {
      if (!selectedV3User.value.length) return alert('请选择要删除的 v3 用户');
      config.value.v3.users = (config.value.v3?.users || []).filter(u => u._name !== selectedV3User.value[0]);
      selectedV3User.value = [];
    }

    function saveV3User() {
      if (!editingV3User.value.name) return alert('请输入 v3 用户名');
      if (!isPresent(editingV3User.value.group)) return alert('请选择 v3 用户所属组');
      const list = config.value.v3?.users || [];
      const idx = list.findIndex(u => u._name === editingV3User.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingV3User.value)));
      } else {
        if (list.some(u => u.name === editingV3User.value.name)) return alert('该 v3 用户已存在');
        list.push(JSON.parse(JSON.stringify(editingV3User.value)));
      }
      if (!config.value.v3) config.value.v3 = {};
      config.value.v3.users = [...list];
      selectedV3User.value = [];
      showV3UserModal.value = false;
    }

    const v3ViewColumns = [
      { key: 'name', title: '视图名' },
      { key: 'oids', title: 'OID 列表', render: v => String(v || '').replace(/\n/g, ', ') },
    ];
    const selectedV3View = ref([]);
    const showV3ViewModal = ref(false);
    const editingV3View = ref({});

    function createV3View() {
      editingV3View.value = { name: '', oids: '' };
      showV3ViewModal.value = true;
    }

    function editV3View() {
      if (!selectedV3View.value.length) return alert('请选择要编辑的 v3 视图');
      const row = (config.value.v3?.views || []).find(v => v._name === selectedV3View.value[0]);
      if (!row) return alert('未找到选中的 v3 视图');
      editingV3View.value = JSON.parse(JSON.stringify(row));
      showV3ViewModal.value = true;
    }

    function removeV3View() {
      if (!selectedV3View.value.length) return alert('请选择要删除的 v3 视图');
      config.value.v3.views = (config.value.v3?.views || []).filter(v => v._name !== selectedV3View.value[0]);
      selectedV3View.value = [];
    }

    function saveV3View() {
      if (!editingV3View.value.name) return alert('请输入 v3 视图名');
      for (const oid of splitMembers(editingV3View.value.oids)) {
        const err = validateOID(oid);
        if (err) return alert(`OID ${oid}：${err}`);
      }
      const list = config.value.v3?.views || [];
      const idx = list.findIndex(v => v._name === editingV3View.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingV3View.value)));
      } else {
        if (list.some(v => v.name === editingV3View.value.name)) return alert('该 v3 视图已存在');
        list.push(JSON.parse(JSON.stringify(editingV3View.value)));
      }
      if (!config.value.v3) config.value.v3 = {};
      config.value.v3.views = [...list];
      selectedV3View.value = [];
      showV3ViewModal.value = false;
    }

    const v3TrapTargetColumns = [
      { key: 'target', title: '目标地址' },
      { key: 'port', title: '端口' },
    ];
    const selectedV3TrapTarget = ref([]);
    const showV3TrapTargetModal = ref(false);
    const editingV3TrapTarget = ref({});

    function createV3TrapTarget() {
      editingV3TrapTarget.value = { target: '', port: '' };
      showV3TrapTargetModal.value = true;
    }

    function editV3TrapTarget() {
      if (!selectedV3TrapTarget.value.length) return alert('请选择要编辑的 v3 Trap 目标');
      const row = (config.value.v3?.trap_targets || []).find(t => t._target === selectedV3TrapTarget.value[0]);
      if (!row) return alert('未找到选中的 v3 Trap 目标');
      editingV3TrapTarget.value = JSON.parse(JSON.stringify(row));
      showV3TrapTargetModal.value = true;
    }

    function removeV3TrapTarget() {
      if (!selectedV3TrapTarget.value.length) return alert('请选择要删除的 v3 Trap 目标');
      config.value.v3.trap_targets = (config.value.v3?.trap_targets || []).filter(t => t._target !== selectedV3TrapTarget.value[0]);
      selectedV3TrapTarget.value = [];
    }

    function saveV3TrapTarget() {
      if (!editingV3TrapTarget.value.target) return alert('请输入 v3 Trap 目标地址');
      const err = validateIP(editingV3TrapTarget.value.target);
      if (err) return alert(err);
      if (isPresent(editingV3TrapTarget.value.port)) {
        const port = parseInt(editingV3TrapTarget.value.port, 10);
        if (isNaN(port) || port < 1 || port > 65535) return alert('端口范围 1-65535');
      }
      const list = config.value.v3?.trap_targets || [];
      const idx = list.findIndex(t => t._target === editingV3TrapTarget.value._target);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingV3TrapTarget.value)));
      } else {
        if (list.some(t => t.target === editingV3TrapTarget.value.target)) return alert('该 v3 Trap 目标已存在');
        list.push(JSON.parse(JSON.stringify(editingV3TrapTarget.value)));
      }
      if (!config.value.v3) config.value.v3 = {};
      config.value.v3.trap_targets = [...list];
      selectedV3TrapTarget.value = [];
      showV3TrapTargetModal.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, commandPath, interfaces, localAddresses,
      communityColumns, selectedCommunity, showCommunityModal, editingCommunity,
      trapTargetColumns, selectedTrapTarget, showTrapTargetModal, editingTrapTarget,
      scriptExtensionColumns, selectedScriptExtension, showScriptExtensionModal, editingScriptExtension,
      v3GroupColumns, selectedV3Group, showV3GroupModal, editingV3Group,
      v3UserColumns, selectedV3User, showV3UserModal, editingV3User,
      v3ViewColumns, selectedV3View, showV3ViewModal, editingV3View,
      v3TrapTargetColumns, selectedV3TrapTarget, showV3TrapTargetModal, editingV3TrapTarget,
      load, save,
      createCommunity, editCommunity, removeCommunity, saveCommunity,
      createTrapTarget, editTrapTarget, removeTrapTarget, saveTrapTarget,
      createScriptExtension, editScriptExtension, removeScriptExtension, saveScriptExtension,
      createV3Group, editV3Group, removeV3Group, saveV3Group,
      createV3User, editV3User, removeV3User, saveV3User,
      createV3View, editV3View, removeV3View, saveV3View,
      createV3TrapTarget, editV3TrapTarget, removeV3TrapTarget, saveV3TrapTarget,
      PROTOCOL_OPTIONS, AUTHORIZATION_OPTIONS, OID_ENABLE_OPTIONS,
      V3_MODE_OPTIONS, V3_SECLEVEL_OPTIONS, V3_AUTH_TYPE_OPTIONS, V3_PRIVACY_TYPE_OPTIONS,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'communities', title: 'Community' },
        { key: 'trap-targets', title: 'Trap 目标' },
        { key: 'script-extensions', title: '脚本扩展' },
        { key: 'v3', title: 'SNMP v3' }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label" title="SNMP 服务描述">描述</label><input class="form-control" v-model="config.description" placeholder="描述" /></div>
          <div class="form-row"><label class="form-label" title="联系人信息">联系人</label><input class="form-control" v-model="config.contact" placeholder="contact@example.com" /></div>
          <div class="form-row"><label class="form-label" title="位置信息">位置</label><input class="form-control" v-model="config.location" placeholder="Beijing" /></div>
          <div class="form-row"><label class="form-label" title="监听协议，默认 UDP">协议</label>
            <select class="form-control" v-model="config.protocol">
              <option v-for="o in PROTOCOL_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label" title="SNMP 所属 VRF">VRF</label><input class="form-control" v-model="config.vrf" placeholder="VRF 名称" /></div>
          <div class="form-row"><label class="form-label" title="监听地址">监听地址</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.listen_address" :options="localAddresses" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row"><label class="form-label" title="Trap 源地址">Trap 源地址</label><input class="form-control" v-model="config.trap_source" placeholder="IPv4 / IPv6 地址" /></div>
          <div class="form-row"><label class="form-label" title="SMUX 子树 OID">SMUX Peer</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.smux_peer" :options="[]" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row" style="align-items:flex-start;">
            <label class="form-label" title="启用默认禁用的 OID" style="padding-top:6px;">启用 OID</label>
            <div style="flex:1;max-width:700px;">
              <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:8px 16px;">
                <label v-for="o in OID_ENABLE_OPTIONS" :key="o.key" style="display:flex;align-items:center;gap:6px;white-space:nowrap;">
                  <input type="checkbox" v-model="config.oid_enable" :value="o.key" /> {{ o.label }}
                </label>
              </div>
            </div>
          </div>
        </template>

        <template #communities>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createCommunity">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editCommunity" :disabled="!selectedCommunity.length || selectedCommunity.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeCommunity" :disabled="!selectedCommunity.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="communityColumns" :data="config.communities" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedCommunity = $event" />
        </template>

        <template #trap-targets>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createTrapTarget">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editTrapTarget" :disabled="!selectedTrapTarget.length || selectedTrapTarget.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeTrapTarget" :disabled="!selectedTrapTarget.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="trapTargetColumns" :data="config.trap_targets" row-key="target" :externalToolbar="true" :selectable="true" @selection-change="selectedTrapTarget = $event" />
        </template>

        <template #script-extensions>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createScriptExtension">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editScriptExtension" :disabled="!selectedScriptExtension.length || selectedScriptExtension.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeScriptExtension" :disabled="!selectedScriptExtension.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="scriptExtensionColumns" :data="config.script_extensions" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedScriptExtension = $event" />
        </template>

        <template #v3>
          <div class="form-row"><label class="form-label" title="SNMPv3 引擎 ID（10-64 位十六进制）">Engine ID</label><input class="form-control" v-model="config.v3.engineid" placeholder="10-64 位十六进制字符" /></div>

          <h3 style="margin:16px 0 8px;">组配置</h3>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createV3Group">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editV3Group" :disabled="!selectedV3Group.length || selectedV3Group.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeV3Group" :disabled="!selectedV3Group.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="v3GroupColumns" :data="config.v3.groups" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedV3Group = $event" />

          <h3 style="margin:16px 0 8px;">用户配置</h3>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createV3User">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editV3User" :disabled="!selectedV3User.length || selectedV3User.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeV3User" :disabled="!selectedV3User.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="v3UserColumns" :data="config.v3.users" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedV3User = $event" />

          <h3 style="margin:16px 0 8px;">视图配置</h3>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createV3View">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editV3View" :disabled="!selectedV3View.length || selectedV3View.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeV3View" :disabled="!selectedV3View.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="v3ViewColumns" :data="config.v3.views" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedV3View = $event" />

          <h3 style="margin:16px 0 8px;">v3 Trap 目标</h3>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createV3TrapTarget">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editV3TrapTarget" :disabled="!selectedV3TrapTarget.length || selectedV3TrapTarget.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeV3TrapTarget" :disabled="!selectedV3TrapTarget.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="v3TrapTargetColumns" :data="config.v3.trap_targets" row-key="target" :externalToolbar="true" :selectable="true" @selection-change="selectedV3TrapTarget = $event" />
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showCommunityModal" title="Community" width="620px" @confirm="saveCommunity" @close="showCommunityModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingCommunity.name" :disabled="!!editingCommunity._name" placeholder="public" /></div>
        <div class="form-row"><label class="form-label">授权</label>
          <select class="form-control" v-model="editingCommunity.authorization">
            <option v-for="o in AUTHORIZATION_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">允许客户端</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingCommunity.client" :options="[]" title-left="可选" title-right="已选" />
            <div class="form-hint">每行一个 IPv4/IPv6 地址</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">允许网络</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingCommunity.network" :options="[]" title-left="可选" title-right="已选" />
            <div class="form-hint">每行一个 IPv4/IPv6 CIDR，默认 0.0.0.0/0, ::/0</div>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showTrapTargetModal" title="Trap 目标" @confirm="saveTrapTarget" @close="showTrapTargetModal = false">
        <div class="form-row"><label class="form-label">目标地址</label><input class="form-control" v-model="editingTrapTarget.target" :disabled="!!editingTrapTarget._target" placeholder="IPv4 / IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="editingTrapTarget.port" placeholder="1-65535" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showScriptExtensionModal" title="脚本扩展" @confirm="saveScriptExtension" @close="showScriptExtensionModal = false">
        <div class="form-row"><label class="form-label">扩展名称</label><input class="form-control" v-model="editingScriptExtension.name" :disabled="!!editingScriptExtension._name" /></div>
        <div class="form-row"><label class="form-label">脚本路径</label><input class="form-control" v-model="editingScriptExtension.script" placeholder="/config/scripts/..." /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showV3GroupModal" title="SNMP v3 组" width="620px" @confirm="saveV3Group" @close="showV3GroupModal = false">
        <div class="form-row"><label class="form-label">组名</label><input class="form-control" v-model="editingV3Group.name" :disabled="!!editingV3Group._name" placeholder="group01" /></div>
        <div class="form-row"><label class="form-label">模式</label>
          <select class="form-control" v-model="editingV3Group.mode">
            <option v-for="o in V3_MODE_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">安全级别</label>
          <select class="form-control" v-model="editingV3Group.seclevel">
            <option v-for="o in V3_SECLEVEL_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">视图</label>
          <select class="form-control" v-model="editingV3Group.view">
            <option value="">-- 不指定 --</option>
            <option v-for="v in config.v3.views" :key="v.name" :value="v.name">{{ v.name }}</option>
          </select>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showV3UserModal" title="SNMP v3 用户" width="620px" @confirm="saveV3User" @close="showV3UserModal = false">
        <div class="form-row"><label class="form-label">用户名</label><input class="form-control" v-model="editingV3User.name" :disabled="!!editingV3User._name" placeholder="user01" /></div>
        <div class="form-row"><label class="form-label">所属组</label>
          <select class="form-control" v-model="editingV3User.group">
            <option value="">-- 请选择 --</option>
            <option v-for="g in config.v3.groups" :key="g.name" :value="g.name">{{ g.name }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">模式</label>
          <select class="form-control" v-model="editingV3User.mode">
            <option v-for="o in V3_MODE_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">认证协议</label>
          <select class="form-control" v-model="editingV3User.auth_type">
            <option v-for="o in V3_AUTH_TYPE_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">认证明文密码</label><input type="password" class="form-control" v-model="editingV3User.auth_plaintext" placeholder="plain text key" /></div>
        <div class="form-row"><label class="form-label">认证加密密码</label><input type="password" class="form-control" v-model="editingV3User.auth_encrypted" placeholder="encrypted key" /></div>
        <div class="form-row"><label class="form-label">加密协议</label>
          <select class="form-control" v-model="editingV3User.privacy_type">
            <option v-for="o in V3_PRIVACY_TYPE_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">加密明文密码</label><input type="password" class="form-control" v-model="editingV3User.privacy_plaintext" placeholder="plain text key" /></div>
        <div class="form-row"><label class="form-label">加密加密密码</label><input type="password" class="form-control" v-model="editingV3User.privacy_encrypted" placeholder="encrypted key" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showV3ViewModal" title="SNMP v3 视图" width="620px" @confirm="saveV3View" @close="showV3ViewModal = false">
        <div class="form-row"><label class="form-label">视图名</label><input class="form-control" v-model="editingV3View.name" :disabled="!!editingV3View._name" placeholder="view01" /></div>
        <div class="form-row"><label class="form-label" style="align-self:flex-start;padding-top:6px;">OID 列表</label>
          <div style="flex:1;max-width:600px;">
            <textarea class="form-control" v-model="editingV3View.oids" rows="5" placeholder="每行一个 OID，示例：.1.3.6.1.2.1.4.24"></textarea>
            <div class="form-hint">每行一个 OID</div>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showV3TrapTargetModal" title="SNMP v3 Trap 目标" @confirm="saveV3TrapTarget" @close="showV3TrapTargetModal = false">
        <div class="form-row"><label class="form-label">目标地址</label><input class="form-control" v-model="editingV3TrapTarget.target" :disabled="!!editingV3TrapTarget._target" placeholder="IPv4 / IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="editingV3TrapTarget.port" placeholder="1-65535" /></div>
      </DraggableModal>
    </div>
  `,
});
