import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const AUTH_MODE_OPTIONS = ['', 'local', 'radius', 'noauth'];
const AUTH_PROTOCOL_OPTIONS = ['pap', 'chap', 'mschap', 'mschap-v2'];

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
  if (!name || !String(name).trim()) return 'pptp.messages.nameRequired';
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return 'pptp.messages.nameInvalidChars';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'pptp.messages.ipFormatInvalid';
  const ip = parts[0];
  const mask = parseInt(parts[1], 10);
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return 'pptp.messages.ipv4FormatInvalid';
  if (isNaN(mask) || mask < 0 || mask > 32) return 'pptp.messages.maskRangeInvalid';
  return '';
}

function validateIPRange(value) {
  if (!value) return '';
  if (value.includes('/')) return validateIP(value);
  const parts = value.split('-');
  if (parts.length !== 2) return 'pptp.messages.ipRangeFormatInvalid';
  for (const p of parts) {
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.trim())) return 'pptp.messages.ipv4RangeFormatInvalid';
  }
  return '';
}

function ipv4PoolToForm(pools = {}) {
  return Object.entries(pools).map(([name, p]) => ({
    _name: name,
    name,
    next_pool: p['next-pool'] || '',
    range: toArray(p.range).join('\n'),
  }));
}

function ipv4PoolToConfig(formPools) {
  const result = {};
  for (const p of formPools) {
    if (!p.name) continue;
    const item = {};
    if (isPresent(p.next_pool)) item['next-pool'] = String(p.next_pool);
    const ranges = splitMembers(p.range);
    if (ranges.length) item.range = ranges;
    result[p.name] = item;
  }
  return result;
}

function normalizeTagValue(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.keys(val);
  return [val];
}

function ipv6PoolToForm(pools = {}) {
  return Object.entries(pools).map(([name, p]) => ({
    _name: name,
    name,
    delegate: normalizeTagValue(p.delegate).join('\n'),
    prefix: normalizeTagValue(p.prefix).join('\n'),
  }));
}

function ipv6PoolToConfig(formPools) {
  const result = {};
  for (const p of formPools) {
    if (!p.name) continue;
    const item = {};
    const delegates = splitMembers(p.delegate);
    if (delegates.length) item.delegate = delegates.reduce((acc, v) => { acc[v] = {}; return acc; }, {});
    const prefixes = splitMembers(p.prefix);
    if (prefixes.length) item.prefix = prefixes.reduce((acc, v) => { acc[v] = {}; return acc; }, {});
    result[p.name] = item;
  }
  return result;
}

function localUsersToForm(users = {}) {
  return Object.entries(users).map(([username, u]) => ({
    _username: username,
    username,
    password: u.password || '',
    static_ip: u['static-ip'] || '',
    static_ip6: u['static-ip6'] || '',
    subnet: u.subnet || '',
  }));
}

function localUsersToConfig(formUsers) {
  const result = {};
  for (const u of formUsers) {
    if (!u.username) continue;
    const item = {};
    if (isPresent(u.password)) item.password = String(u.password);
    if (isPresent(u.static_ip)) item['static-ip'] = String(u.static_ip);
    if (isPresent(u.static_ip6)) item['static-ip6'] = String(u.static_ip6);
    if (isPresent(u.subnet)) item.subnet = String(u.subnet);
    result[u.username] = item;
  }
  return result;
}

function radiusServerToForm(servers = {}) {
  return Object.entries(servers).map(([address, s]) => ({
    _address: address,
    address,
    key: s.key || '',
    port: s.port || '1812',
    disable: s.disable !== undefined,
    disable_accounting: s['disable-accounting'] !== undefined,
  }));
}

function radiusServerToConfig(formServers) {
  const result = {};
  for (const s of formServers) {
    if (!s.address) continue;
    const item = {};
    if (isPresent(s.key)) item.key = String(s.key);
    if (isPresent(s.port)) item.port = String(s.port);
    if (s.disable) item.disable = '';
    if (s.disable_accounting) item['disable-accounting'] = '';
    result[s.address] = item;
  }
  return result;
}

function authToForm(auth = {}) {
  return {
    mode: auth.mode || 'local',
    protocols: toArray(auth.protocols).filter(Boolean),
    local_users: localUsersToForm(auth['local-users']?.username),
    radius: {
      nas_identifier: auth.radius?.['nas-identifier'] || '',
      timeout: auth.radius?.timeout || '2',
      servers: radiusServerToForm(auth.radius?.server),
    },
  };
}

function authToConfig(formAuth) {
  const result = {};
  if (isPresent(formAuth.mode)) result.mode = String(formAuth.mode);
  if (formAuth.protocols && formAuth.protocols.length) result.protocols = formAuth.protocols;
  const users = localUsersToConfig(formAuth.local_users || []);
  if (Object.keys(users).length) result['local-users'] = { username: users };
  const servers = radiusServerToConfig(formAuth.radius?.servers || []);
  if (Object.keys(servers).length || isPresent(formAuth.radius?.nas_identifier) || isPresent(formAuth.radius?.timeout)) {
    result.radius = {};
    if (Object.keys(servers).length) result.radius.server = servers;
    if (isPresent(formAuth.radius.nas_identifier)) result.radius['nas-identifier'] = String(formAuth.radius.nas_identifier);
    if (isPresent(formAuth.radius.timeout)) result.radius.timeout = String(formAuth.radius.timeout);
  }
  return result;
}

function pptpToForm(data = {}) {
  const ra = data['remote-access'] || {};
  return {
    description: ra.description || '',
    gateway_address: ra['gateway-address'] || '',
    outside_address: ra['outside-address'] || '',
    mtu: ra.mtu || '1436',
    max_concurrent_sessions: ra['max-concurrent-sessions'] || '',
    default_pool: ra['default-pool'] || '',
    default_ipv6_pool: ra['default-ipv6-pool'] || '',
    name_servers: toArray(ra['name-server']).join('\n'),
    wins_servers: toArray(ra['wins-server']).join('\n'),
    client_ip_pools: ipv4PoolToForm(ra['client-ip-pool']),
    client_ipv6_pools: ipv6PoolToForm(ra['client-ipv6-pool']),
    auth: authToForm(ra.authentication),
    extended_scripts: {
      on_up: ra['extended-scripts']?.['on-up'] || '',
      on_down: ra['extended-scripts']?.['on-down'] || '',
      on_change: ra['extended-scripts']?.['on-change'] || '',
    },
    limits: {
      burst: ra.limits?.burst || '',
      rate: ra.limits?.rate || '',
      timeout: ra.limits?.timeout || '',
    },
    log: ra.log || '',
    ppp_options: {
      ccp: ra['ppp-options']?.ccp !== undefined,
      mppe: ra['ppp-options']?.mppe !== undefined,
      _raw: ra['ppp-options'] || {},
    },
    shaper: ra.shaper || '',
    snmp: ra.snmp !== undefined,
  };
}

function pptpToConfig(form) {
  const ra = {};
  if (isPresent(form.description)) ra.description = String(form.description);
  if (isPresent(form.gateway_address)) ra['gateway-address'] = String(form.gateway_address);
  if (isPresent(form.outside_address)) ra['outside-address'] = String(form.outside_address);
  if (isPresent(form.mtu)) ra.mtu = String(form.mtu);
  if (isPresent(form.max_concurrent_sessions)) ra['max-concurrent-sessions'] = String(form.max_concurrent_sessions);
  if (isPresent(form.default_pool)) ra['default-pool'] = String(form.default_pool);
  if (isPresent(form.default_ipv6_pool)) ra['default-ipv6-pool'] = String(form.default_ipv6_pool);
  const nameServers = splitMembers(form.name_servers);
  if (nameServers.length) ra['name-server'] = nameServers;
  const winsServers = splitMembers(form.wins_servers);
  if (winsServers.length) ra['wins-server'] = winsServers;
  const ipPools = ipv4PoolToConfig(form.client_ip_pools || []);
  if (Object.keys(ipPools).length) ra['client-ip-pool'] = ipPools;
  const ipv6Pools = ipv6PoolToConfig(form.client_ipv6_pools || []);
  if (Object.keys(ipv6Pools).length) ra['client-ipv6-pool'] = ipv6Pools;
  const auth = authToConfig(form.auth || {});
  if (Object.keys(auth).length) ra.authentication = auth;
  if (isPresent(form.extended_scripts?.on_up) || isPresent(form.extended_scripts?.on_down) || isPresent(form.extended_scripts?.on_change)) {
    ra['extended-scripts'] = {};
    if (isPresent(form.extended_scripts.on_up)) ra['extended-scripts']['on-up'] = String(form.extended_scripts.on_up);
    if (isPresent(form.extended_scripts.on_down)) ra['extended-scripts']['on-down'] = String(form.extended_scripts.on_down);
    if (isPresent(form.extended_scripts.on_change)) ra['extended-scripts']['on-change'] = String(form.extended_scripts.on_change);
  }
  if (isPresent(form.limits?.burst) || isPresent(form.limits?.rate) || isPresent(form.limits?.timeout)) {
    ra.limits = {};
    if (isPresent(form.limits.burst)) ra.limits.burst = String(form.limits.burst);
    if (isPresent(form.limits.rate)) ra.limits.rate = String(form.limits.rate);
    if (isPresent(form.limits.timeout)) ra.limits.timeout = String(form.limits.timeout);
  }
  if (isPresent(form.log)) ra.log = String(form.log);
  if (form.ppp_options?.ccp || form.ppp_options?.mppe || Object.keys(form.ppp_options?._raw || {}).length) {
      ra['ppp-options'] = { ...(form.ppp_options._raw || {}) };
      if (form.ppp_options.ccp) ra['ppp-options'].ccp = '';
      if (form.ppp_options.mppe) ra['ppp-options'].mppe = '';
    }
  if (isPresent(form.shaper)) ra.shaper = String(form.shaper);
  if (form.snmp) ra.snmp = '';
  return { 'remote-access': ra };
}

export default defineComponent({
  name: 'PptpPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(pptpToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

    const ipPoolColumns = [
      { key: 'name', title: t('pptp.columns.name') },
      { key: 'next_pool', title: t('pptp.columns.nextPool') },
      { key: 'range', title: t('pptp.columns.range') },
    ];
    const ipv6PoolColumns = [
      { key: 'name', title: t('pptp.columns.name') },
      { key: 'prefix', title: t('pptp.columns.prefix') },
      { key: 'delegate', title: t('pptp.columns.delegate') },
    ];
    const userColumns = [
      { key: 'username', title: t('pptp.columns.username') },
      { key: 'static_ip', title: t('pptp.columns.staticIp') },
      { key: 'static_ip6', title: t('pptp.columns.staticIp6') },
      { key: 'subnet', title: t('pptp.columns.subnet') },
    ];
    const radiusServerColumns = [
      { key: 'address', title: t('pptp.columns.address') },
      { key: 'port', title: t('pptp.columns.port') },
      { key: 'disable', title: t('pptp.columns.disable') },
      { key: 'disable_accounting', title: t('pptp.columns.disableAccounting') },
    ];

    const selectedIpPool = ref([]);
    const selectedIpv6Pool = ref([]);
    const selectedUser = ref([]);
    const selectedRadiusServer = ref([]);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'pools': return 'vpn pptp remote-access client-ip-pool';
        case 'auth': return 'vpn pptp remote-access authentication';
        case 'dns': return 'vpn pptp remote-access name-server';
        case 'advanced': return 'vpn pptp remote-access';
        case 'basic':
        default: return 'vpn pptp remote-access';
      }
    });
    const showIpPoolModal = ref(false);
    const editingIpPool = ref({});
    const showIpv6PoolModal = ref(false);
    const editingIpv6Pool = ref({});
    const showUserModal = ref(false);
    const editingUser = ref({});
    const showRadiusServerModal = ref(false);
    const editingRadiusServer = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('vpn pptp', true);
        config.value = pptpToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (isPresent(config.value.mtu)) {
        const mtu = parseInt(config.value.mtu, 10);
        if (isNaN(mtu) || mtu < 68 || mtu > 1500) return showError({ message: t('pptp.messages.mtuRangeError') });
      }
      for (const p of config.value.client_ip_pools || []) {
        const err = validateName(p.name) || validateIPRange(p.range);
        if (err) return showError({ message: t('pptp.messages.ipv4PoolError', { name: p.name || '', error: t(err) }) });
      }
      for (const u of config.value.auth.local_users || []) {
        if (!u.username) return showError({ message: t('pptp.messages.localUsernameRequired') });
      }
      for (const s of config.value.auth.radius.servers || []) {
        if (!s.address) return showError({ message: t('pptp.messages.radiusServerAddressRequired') });
      }

      saving.value = true;
      try {
        await configApi.set('vpn pptp', pptpToConfig(config.value));
        configStore.markPending();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createIpPool() {
      editingIpPool.value = { name: '', next_pool: '', range: '' };
      showIpPoolModal.value = true;
    }
    function editIpPool() {
      if (!selectedIpPool.value.length) return showError({ message: t('pptp.messages.selectIpv4PoolToEdit') });
      const row = (config.value.client_ip_pools || []).find(p => p.name === selectedIpPool.value[0]);
      if (!row) return showError({ message: t('pptp.messages.ipv4PoolNotFound') });
      editingIpPool.value = { ...row };
      showIpPoolModal.value = true;
    }
    function removeIpPool() {
      if (!selectedIpPool.value.length) return showError({ message: t('pptp.messages.selectIpv4PoolToDelete') });
      config.value.client_ip_pools = (config.value.client_ip_pools || []).filter(p => p.name !== selectedIpPool.value[0]);
      selectedIpPool.value = [];
    }
    function saveIpPool() {
      const err = validateName(editingIpPool.value.name) || validateIPRange(editingIpPool.value.range);
      if (err) return showError({ message: t(err) });
      const list = config.value.client_ip_pools || [];
      const idx = list.findIndex(p => p._name === editingIpPool.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpPool.value });
      else list.push({ ...editingIpPool.value });
      config.value.client_ip_pools = list;
      showIpPoolModal.value = false;
    }

    function createIpv6Pool() {
      editingIpv6Pool.value = { name: '', delegate: '', prefix: '' };
      showIpv6PoolModal.value = true;
    }
    function editIpv6Pool() {
      if (!selectedIpv6Pool.value.length) return showError({ message: t('pptp.messages.selectIpv6PoolToEdit') });
      const row = (config.value.client_ipv6_pools || []).find(p => p.name === selectedIpv6Pool.value[0]);
      if (!row) return showError({ message: t('pptp.messages.ipv6PoolNotFound') });
      editingIpv6Pool.value = { ...row };
      showIpv6PoolModal.value = true;
    }
    function removeIpv6Pool() {
      if (!selectedIpv6Pool.value.length) return showError({ message: t('pptp.messages.selectIpv6PoolToDelete') });
      config.value.client_ipv6_pools = (config.value.client_ipv6_pools || []).filter(p => p.name !== selectedIpv6Pool.value[0]);
      selectedIpv6Pool.value = [];
    }
    function saveIpv6Pool() {
      const err = validateName(editingIpv6Pool.value.name);
      if (err) return showError({ message: t(err) });
      const list = config.value.client_ipv6_pools || [];
      const idx = list.findIndex(p => p._name === editingIpv6Pool.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpv6Pool.value });
      else list.push({ ...editingIpv6Pool.value });
      config.value.client_ipv6_pools = list;
      showIpv6PoolModal.value = false;
    }

    function createUser() {
      editingUser.value = { username: '', password: '', static_ip: '', static_ip6: '', subnet: '' };
      showUserModal.value = true;
    }
    function editUser() {
      if (!selectedUser.value.length) return showError({ message: t('pptp.messages.selectUserToEdit') });
      const row = (config.value.auth.local_users || []).find(u => u.username === selectedUser.value[0]);
      if (!row) return showError({ message: t('pptp.messages.userNotFound') });
      editingUser.value = { ...row };
      showUserModal.value = true;
    }
    function removeUser() {
      if (!selectedUser.value.length) return showError({ message: t('pptp.messages.selectUserToDelete') });
      config.value.auth.local_users = (config.value.auth.local_users || []).filter(u => u.username !== selectedUser.value[0]);
      selectedUser.value = [];
    }
    function saveUser() {
      if (!editingUser.value.username) return showError({ message: t('pptp.messages.usernameRequired') });
      const list = config.value.auth.local_users || [];
      const idx = list.findIndex(u => u._username === editingUser.value._username);
      if (idx >= 0) list.splice(idx, 1, { ...editingUser.value });
      else list.push({ ...editingUser.value });
      config.value.auth.local_users = list;
      showUserModal.value = false;
    }

    function createRadiusServer() {
      editingRadiusServer.value = { address: '', key: '', port: '1812', disable: false, disable_accounting: false };
      showRadiusServerModal.value = true;
    }
    function editRadiusServer() {
      if (!selectedRadiusServer.value.length) return showError({ message: t('pptp.messages.selectServerToEdit') });
      const row = (config.value.auth.radius.servers || []).find(s => s.address === selectedRadiusServer.value[0]);
      if (!row) return showError({ message: t('pptp.messages.serverNotFound') });
      editingRadiusServer.value = { ...row };
      showRadiusServerModal.value = true;
    }
    function removeRadiusServer() {
      if (!selectedRadiusServer.value.length) return showError({ message: t('pptp.messages.selectServerToDelete') });
      config.value.auth.radius.servers = (config.value.auth.radius.servers || []).filter(s => s.address !== selectedRadiusServer.value[0]);
      selectedRadiusServer.value = [];
    }
    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return showError({ message: t('pptp.messages.serverAddressRequired') });
      const list = config.value.auth.radius.servers || [];
      const idx = list.findIndex(s => s._address === editingRadiusServer.value._address);
      if (idx >= 0) list.splice(idx, 1, { ...editingRadiusServer.value });
      else list.push({ ...editingRadiusServer.value });
      config.value.auth.radius.servers = list;
      showRadiusServerModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      AUTH_MODE_OPTIONS, AUTH_PROTOCOL_OPTIONS,
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      ipPoolColumns, ipv6PoolColumns, userColumns, radiusServerColumns,
      selectedIpPool, selectedIpv6Pool, selectedUser, selectedRadiusServer,
      showIpPoolModal, editingIpPool,
      showIpv6PoolModal, editingIpv6Pool,
      showUserModal, editingUser,
      showRadiusServerModal, editingRadiusServer,
      load, save, t,
      createIpPool, editIpPool, removeIpPool, saveIpPool,
      createIpv6Pool, editIpv6Pool, removeIpv6Pool, saveIpv6Pool,
      createUser, editUser, removeUser, saveUser,
      createRadiusServer, editRadiusServer, removeRadiusServer, saveRadiusServer,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('pptp.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('pptp.tabs.basic') },
        { key: 'pools', title: t('pptp.tabs.pools') },
        { key: 'auth', title: t('pptp.tabs.auth') },
        { key: 'dns', title: t('pptp.tabs.dns') },
        { key: 'advanced', title: t('pptp.tabs.advanced') }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.description') }}</label><input class="form-control" v-model="config.description" :title="t('pptp.titles.pptpDescription')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.gatewayAddress') }}</label><input class="form-control" v-model="config.gateway_address" placeholder="x.x.x.x" :title="t('pptp.titles.gatewayIp')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.outsideAddress') }}</label><input class="form-control" v-model="config.outside_address" placeholder="x.x.x.x" :title="t('pptp.titles.outsideIp')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.mtu') }}</label><input class="form-control" type="number" min="68" max="1500" v-model="config.mtu" :title="t('pptp.titles.mtuDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.maxConcurrentSessions') }}</label><input class="form-control" type="number" min="1" v-model="config.max_concurrent_sessions" :title="t('pptp.titles.maxConcurrentDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.defaultIpv4Pool') }}</label>
          <select class="form-control" v-model="config.default_pool" :title="t('pptp.titles.defaultIpv4PoolDesc')">
            <option value=""></option>
            <option v-for="p in config.client_ip_pools" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.defaultIpv6Pool') }}</label>
          <select class="form-control" v-model="config.default_ipv6_pool" :title="t('pptp.titles.defaultIpv6PoolDesc')">
            <option value=""></option>
            <option v-for="p in config.client_ipv6_pools" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
        </div>
      </template>

      <template #pools>
        <div style="font-weight:bold;margin-bottom:8px;">{{ t('pptp.labels.ipv4ClientPool') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createIpPool">{{ t('pptp.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editIpPool" :disabled="!selectedIpPool.length || selectedIpPool.length > 1">{{ t('pptp.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeIpPool" :disabled="!selectedIpPool.length">{{ t('pptp.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ipPoolColumns" :data="config.client_ip_pools" row-key="name" :externalToolbar="true" @selection-change="selectedIpPool = $event" :selectable="true" />

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('pptp.labels.ipv6ClientPool') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createIpv6Pool">{{ t('pptp.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editIpv6Pool" :disabled="!selectedIpv6Pool.length || selectedIpv6Pool.length > 1">{{ t('pptp.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeIpv6Pool" :disabled="!selectedIpv6Pool.length">{{ t('pptp.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ipv6PoolColumns" :data="config.client_ipv6_pools" row-key="name" :externalToolbar="true" @selection-change="selectedIpv6Pool = $event" :selectable="true" />
      </template>

      <template #auth>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.authMode') }}</label>
          <select class="form-control" v-model="config.auth.mode" :title="t('pptp.titles.authModeDesc')">
            <option v-for="o in AUTH_MODE_OPTIONS" :key="o" :value="o">{{ o || t('pptp.messages.notSelected') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.authProtocols') }}</label>
          <div class="form-control" style="display:flex;gap:12px;align-items:center;border:none;background:transparent;padding-left:0;">
            <label v-for="o in AUTH_PROTOCOL_OPTIONS" :key="o"><input type="checkbox" :value="o" v-model="config.auth.protocols" /> {{ o }}</label>
          </div>
        </div>

        <div v-if="config.auth.mode === 'local' || config.auth.mode === ''">
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('pptp.labels.localUsers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">{{ t('pptp.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUser.length || selectedUser.length > 1">{{ t('pptp.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUser.length">{{ t('pptp.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.auth.local_users" row-key="username" :externalToolbar="true" @selection-change="selectedUser = $event" :selectable="true" />
        </div>

        <div v-if="config.auth.mode === 'radius'">
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('pptp.sections.radius') }}</div>
          <div class="form-row"><label class="form-label">{{ t('pptp.labels.nasIdentifier') }}</label><input class="form-control" v-model="config.auth.radius.nas_identifier" :title="t('pptp.titles.nasIdentifierDesc')" /></div>
          <div class="form-row"><label class="form-label">{{ t('pptp.labels.timeout') }}</label><input class="form-control" type="number" min="1" max="240" v-model="config.auth.radius.timeout" :title="t('pptp.titles.timeoutDesc')" /></div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">{{ t('pptp.buttons.add') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServer.length || selectedRadiusServer.length > 1">{{ t('pptp.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServer.length">{{ t('pptp.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.auth.radius.servers" row-key="address" :externalToolbar="true" @selection-change="selectedRadiusServer = $event" :selectable="true" />
        </div>
      </template>

      <template #dns>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.dnsServer') }}</label><textarea class="form-control" v-model="config.name_servers" rows="3" :placeholder="t('pptp.placeholders.dnsServer')" :title="t('pptp.titles.dnsServerDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.winsServer') }}</label><textarea class="form-control" v-model="config.wins_servers" rows="3" :placeholder="t('pptp.placeholders.winsServer')" :title="t('pptp.titles.winsServerDesc')" /></div>
      </template>

      <template #advanced>
        <div style="font-weight:bold;margin-bottom:8px;">{{ t('pptp.labels.extendedScripts') }}</div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.onUp') }}</label><input class="form-control" v-model="config.extended_scripts.on_up" :title="t('pptp.titles.onUpDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.onDown') }}</label><input class="form-control" v-model="config.extended_scripts.on_down" :title="t('pptp.titles.onDownDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.onChange') }}</label><input class="form-control" v-model="config.extended_scripts.on_change" :title="t('pptp.titles.onChangeDesc')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('pptp.labels.connectionLimits') }}</div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.burst') }}</label><input class="form-control" v-model="config.limits.burst" :title="t('pptp.titles.burstDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.rate') }}</label><input class="form-control" v-model="config.limits.rate" :title="t('pptp.titles.rateDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.timeout') }}</label><input class="form-control" v-model="config.limits.timeout" :title="t('pptp.titles.timeoutLimitDesc')" /></div>

        <div class="form-row"><label class="form-label">{{ t('pptp.labels.log') }}</label><input class="form-control" v-model="config.log" :placeholder="t('pptp.placeholders.log')" :title="t('pptp.titles.logDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.shaper') }}</label><input class="form-control" v-model="config.shaper" :title="t('pptp.titles.shaperDesc')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('pptp.labels.pppOptions') }}</div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.ccp') }}</label><input type="checkbox" v-model="config.ppp_options.ccp" :title="t('pptp.titles.ccpDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.mppe') }}</label><input type="checkbox" v-model="config.ppp_options.mppe" :title="t('pptp.titles.mppeDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.snmp') }}</label><input type="checkbox" v-model="config.snmp" :title="t('pptp.titles.snmpDesc')" /></div>
      </template>
      </TabGroup>

      <DraggableModal v-model:visible="showIpPoolModal" :title="t('pptp.modals.ipv4Pool')" @confirm="saveIpPool" @close="showIpPoolModal = false">
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.name') }}</label><input class="form-control" v-model="editingIpPool.name" :disabled="editingIpPool._name" :title="t('pptp.titles.poolNameDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.nextPool') }}</label><input class="form-control" v-model="editingIpPool.next_pool" :title="t('pptp.titles.nextPoolDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.range') }}</label><textarea class="form-control" v-model="editingIpPool.range" rows="3" :placeholder="t('pptp.placeholders.ipv4Range')" :title="t('pptp.titles.ipv4RangeDesc')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showIpv6PoolModal" :title="t('pptp.modals.ipv6Pool')" @confirm="saveIpv6Pool" @close="showIpv6PoolModal = false">
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.name') }}</label><input class="form-control" v-model="editingIpv6Pool.name" :disabled="editingIpv6Pool._name" :title="t('pptp.titles.poolNameDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.prefix') }}</label><textarea class="form-control" v-model="editingIpv6Pool.prefix" rows="3" :placeholder="t('pptp.placeholders.ipv6Prefix')" :title="t('pptp.titles.ipv6PrefixDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.delegatePrefix') }}</label><textarea class="form-control" v-model="editingIpv6Pool.delegate" rows="3" :placeholder="t('pptp.placeholders.delegatePrefix')" :title="t('pptp.titles.delegatePrefixDesc')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showUserModal" :title="t('pptp.modals.localUser')" @confirm="saveUser" @close="showUserModal = false">
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.username') }}</label><input class="form-control" v-model="editingUser.username" :disabled="editingUser._username" :title="t('pptp.titles.usernameDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.password') }}</label><input class="form-control" type="password" v-model="editingUser.password" :title="t('pptp.titles.passwordDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.staticIp') }}</label><input class="form-control" v-model="editingUser.static_ip" placeholder="x.x.x.x" :title="t('pptp.titles.staticIpv4Desc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.staticIp6') }}</label><input class="form-control" v-model="editingUser.static_ip6" placeholder="h:h:h:h:h:h:h:h" :title="t('pptp.titles.staticIpv6Desc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.subnet') }}</label><input class="form-control" v-model="editingUser.subnet" placeholder="x.x.x.x/x" :title="t('pptp.titles.subnetDesc')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showRadiusServerModal" :title="t('pptp.modals.radiusServer')" @confirm="saveRadiusServer" @close="showRadiusServerModal = false">
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.address') }}</label><input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._address" placeholder="x.x.x.x" :title="t('pptp.titles.radiusServerIpDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.sharedKey') }}</label><input class="form-control" v-model="editingRadiusServer.key" :title="t('pptp.titles.sharedKeyDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" :title="t('pptp.titles.portDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.disable') }}</label><input type="checkbox" v-model="editingRadiusServer.disable" :title="t('pptp.titles.disableServerDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('pptp.labels.disableAccounting') }}</label><input type="checkbox" v-model="editingRadiusServer.disable_accounting" :title="t('pptp.titles.disableAccountingDesc')" /></div>
      </DraggableModal>
    </div>
  `,
});
