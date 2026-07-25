import { defineComponent, ref, computed, watch, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { validateField, validIP, validIPOrSegment } from '/src/utils/validators.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const KEY_EXCHANGE_OPTIONS = ['', 'ikev1', 'ikev2'];
const IKE_MODE_OPTIONS = ['', 'main', 'aggressive'];
const CLOSE_ACTION_OPTIONS = ['', 'none', 'trap', 'start'];
const DPD_ACTION_OPTIONS = ['', 'trap', 'clear', 'restart'];
const DH_GROUP_OPTIONS = [
  '',
  { value: '1', label: '1 (modp768)' },
  { value: '2', label: '2 (modp1024)' },
  { value: '5', label: '5 (modp1536)' },
  { value: '14', label: '14 (modp2048)' },
  { value: '15', label: '15 (modp3072)' },
  { value: '16', label: '16 (modp4096)' },
  { value: '17', label: '17 (modp6144)' },
  { value: '18', label: '18 (modp8192)' },
  { value: '19', label: '19 (ecp256)' },
  { value: '20', label: '20 (ecp384)' },
  { value: '21', label: '21 (ecp521)' },
  { value: '22', label: '22 (modp1024s160)' },
  { value: '23', label: '23 (modp2048s224)' },
  { value: '24', label: '24 (modp2048s256)' },
  { value: '25', label: '25 (ecp192)' },
  { value: '26', label: '26 (ecp224)' },
  { value: '27', label: '27 (ecp224bp)' },
  { value: '28', label: '28 (ecp256bp)' },
  { value: '29', label: '29 (ecp384bp)' },
  { value: '30', label: '30 (ecp512bp)' },
  { value: '31', label: '31 (curve25519)' },
  { value: '32', label: '32 (curve448)' },
];
const ENCRYPTION_OPTIONS = ['', 'null', 'aes128', 'aes192', 'aes256', 'aes128ctr', 'aes192ctr', 'aes256ctr', 'aes128ccm64', 'aes192ccm64', 'aes256ccm64', 'aes128ccm96', 'aes192ccm96', 'aes256ccm96', 'aes128ccm128', 'aes192ccm128', 'aes256ccm128', 'aes128gcm64', 'aes192gcm64', 'aes256gcm64', 'aes128gcm96', 'aes192gcm96', 'aes256gcm96', 'aes128gcm128', 'aes192gcm128', 'aes256gcm128', 'aes128gmac', 'aes192gmac', 'aes256gmac', '3des', 'blowfish128', 'blowfish192', 'blowfish256', 'camellia128', 'camellia192', 'camellia256', 'camellia128ctr', 'camellia192ctr', 'camellia256ctr', 'camellia128ccm64', 'camellia192ccm64', 'camellia256ccm64', 'camellia128ccm96', 'camellia192ccm96', 'camellia256ccm96', 'camellia128ccm128', 'camellia192ccm128', 'camellia256ccm128', 'serpent128', 'serpent192', 'serpent256', 'twofish128', 'twofish192', 'twofish256', 'cast128', 'chacha20poly1305'];
const HASH_OPTIONS = ['', 'md5', 'md5_128', 'sha1', 'sha1_160', 'sha256', 'sha256_96', 'sha384', 'sha512', 'aesxcbc', 'aescmac', 'aes128gmac', 'aes192gmac', 'aes256gmac'];
const PRF_OPTIONS = ['', 'prfmd5', 'prfsha1', 'prfaesxcbc', 'prfaescmac', 'prfsha256', 'prfsha384', 'prfsha512'];
const ESP_MODE_OPTIONS = ['', 'tunnel', 'transport'];
const PFS_OPTIONS = ['', 'enable', 'disable', 'dh-group1', 'dh-group2', 'dh-group5', 'dh-group14', 'dh-group15', 'dh-group16', 'dh-group17', 'dh-group18', 'dh-group19', 'dh-group20', 'dh-group21', 'dh-group22', 'dh-group23', 'dh-group24', 'dh-group25', 'dh-group26', 'dh-group27', 'dh-group28', 'dh-group29', 'dh-group30', 'dh-group31', 'dh-group32'];
const COMPRESSION_OPTIONS = ['', 'enable', 'disable'];
const AUTH_MODE_OPTIONS = ['', 'pre-shared-secret', 'x509', 'rsa'];
const LOG_LEVEL_OPTIONS = ['', '0', '1', '2'];
const LOG_SUBSYSTEM_OPTIONS = ['', 'dmn', 'mgr', 'ike', 'chd', 'job', 'cfg', 'knl', 'net', 'asn', 'enc', 'lib', 'esp', 'tls', 'tnc', 'imc', 'imv', 'pts', 'any'];
const CONNECTION_TYPE_OPTIONS = ['', 'initiate', 'respond', 'none'];
const UNIQUE_OPTIONS = ['', 'never', 'keep', 'replace'];
const SERVER_MODE_OPTIONS = ['', 'pre-shared-secret', 'x509'];
const CLIENT_MODE_OPTIONS = ['', 'x509', 'eap-tls', 'eap-mschapv2', 'eap-radius'];

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

function splitCommas(text) {
  return String(text || '').split(',').map(s => s.trim()).filter(Boolean);
}

function validateLines(value, type) {
  const lines = splitMembers(value);
  for (const line of lines) {
    const err = validateField(line, { validate: type });
    if (err) return err;
  }
  return '';
}

function validateCommas(value, type) {
  const items = splitCommas(value);
  for (const item of items) {
    const err = validateField(item, { validate: type });
    if (err) return err;
  }
  return '';
}

function inRange(value, min, max) {
  const n = parseFloat(value);
  return !isNaN(n) && n >= min && n <= max;
}

function validateName(name) {
  if (!name || !String(name).trim()) return '请输入名称';
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return '名称只能包含字母、数字、下划线和连字符';
  return '';
}

function validateInterface(name) {
  if (!name || !String(name).trim()) return '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(String(name))) return '接口名只能包含字母、数字、下划线、点、连字符';
  return '';
}

function optionValue(opt) {
  return typeof opt === 'object' ? opt.value : opt;
}

function optionLabel(opt) {
  return typeof opt === 'object' ? (opt.label || opt.value) : opt;
}

function proposalToForm(proposals = {}) {
  return Object.entries(proposals).map(([num, p]) => ({
    _num: num,
    number: num,
    dh_group: p['dh-group'] || '',
    encryption: p.encryption || '',
    hash: p.hash || '',
    prf: p.prf || '',
  }));
}

function proposalToConfig(formProposals) {
  const result = {};
  for (const p of formProposals) {
    if (!p.number) continue;
    const item = {};
    if (isPresent(p.dh_group)) item['dh-group'] = String(p.dh_group);
    if (isPresent(p.encryption)) item.encryption = String(p.encryption);
    if (isPresent(p.hash)) item.hash = String(p.hash);
    if (isPresent(p.prf)) item.prf = String(p.prf);
    if (Object.keys(item).length) result[String(p.number)] = item;
  }
  return result;
}

function ikeGroupToForm(groups = {}) {
  return Object.entries(groups).map(([name, g]) => ({
    _name: name,
    name,
    close_action: g['close-action'] || 'none',
    disable_mobike: g['disable-mobike'] !== undefined,
    ikev2_reauth: g['ikev2-reauth'] !== undefined,
    key_exchange: g['key-exchange'] || '',
    lifetime: g.lifetime || '28800',
    mode: g.mode || 'main',
    dpd_action: g['dead-peer-detection']?.action || 'clear',
    dpd_interval: g['dead-peer-detection']?.interval || '30',
    dpd_timeout: g['dead-peer-detection']?.timeout || '120',
    proposals: proposalToForm(g.proposal),
  }));
}

function espGroupToForm(groups = {}) {
  return Object.entries(groups).map(([name, g]) => ({
    _name: name,
    name,
    compression: g.compression || '',
    life_bytes: g['life-bytes'] || '',
    life_packets: g['life-packets'] || '',
    lifetime: g.lifetime || '3600',
    mode: g.mode || 'tunnel',
    pfs: g.pfs || 'enable',
    proposals: proposalToForm(g.proposal),
  }));
}

function pskToForm(psks = {}) {
  return Object.entries(psks).map(([name, p]) => ({
    _name: name,
    name,
    dhcp_interface: toArray(p['dhcp-interface']).join(', '),
    ids: toArray(p.id).join('\n'),
    secret: p.secret || '',
  }));
}

function profileToForm(profiles = {}) {
  return Object.entries(profiles).map(([name, p]) => ({
    _name: name,
    name,
    authentication_mode: p.authentication?.mode || '',
    pre_shared_secret: p.authentication?.['pre-shared-secret'] || '',
    bind_tunnels: toArray(p.bind?.tunnel).join('\n'),
    esp_group: p['esp-group'] || '',
    ike_group: p['ike-group'] || '',
    disable: p.disable !== undefined,
  }));
}

function optionsToForm(options = {}) {
  return {
    disable_route_autoinstall: options['disable-route-autoinstall'] !== undefined,
    flexvpn: options.flexvpn !== undefined,
    virtual_ip: options['virtual-ip'] !== undefined,
    interface: options.interface || '',
  };
}

function logToForm(log = {}) {
  return {
    level: log.level || '',
    subsystems: toArray(log.subsystem).map(name => ({ name })),
  };
}

function tunnelToForm(tunnels = {}) {
  return Object.entries(tunnels).map(([num, t]) => ({
    _num: num,
    number: num,
    disable: t.disable !== undefined,
    esp_group: t['esp-group'] || '',
    priority: t.priority || '',
    protocol: t.protocol || '',
    local_prefix: t.local?.prefix?.join('\n') || joinMembers(t.local?.prefix),
    local_port: t.local?.port || '',
    remote_prefix: t.remote?.prefix?.join('\n') || joinMembers(t.remote?.prefix),
    remote_port: t.remote?.port || '',
  }));
}

function tunnelToConfig(formTunnels) {
  const result = {};
  for (const t of formTunnels) {
    if (!t.number) continue;
    const item = {};
    if (t.disable) item.disable = '';
    if (isPresent(t.esp_group)) item['esp-group'] = String(t.esp_group);
    if (isPresent(t.priority)) item.priority = String(t.priority);
    if (isPresent(t.protocol)) item.protocol = String(t.protocol);
    const localPrefix = splitMembers(t.local_prefix);
    if (localPrefix.length || isPresent(t.local_port)) {
      item.local = {};
      if (localPrefix.length) item.local.prefix = localPrefix;
      if (isPresent(t.local_port)) item.local.port = String(t.local_port);
    }
    const remotePrefix = splitMembers(t.remote_prefix);
    if (remotePrefix.length || isPresent(t.remote_port)) {
      item.remote = {};
      if (remotePrefix.length) item.remote.prefix = remotePrefix;
      if (isPresent(t.remote_port)) item.remote.port = String(t.remote_port);
    }
    if (Object.keys(item).length) result[String(t.number)] = item;
  }
  return result;
}

function s2sToForm(peers = {}) {
  return Object.entries(peers).map(([name, p]) => ({
    _name: name,
    name,
    connection_type: p['connection-type'] || '',
    default_esp_group: p['default-esp-group'] || '',
    description: p.description || '',
    dhcp_interface: toArray(p['dhcp-interface']).join(', '),
    disable: p.disable !== undefined,
    force_udp_encapsulation: p['force-udp-encapsulation'] !== undefined,
    ike_group: p['ike-group'] || '',
    ikev2_reauth: p['ikev2-reauth'] !== undefined,
    local_address: p['local-address'] || '',
    remote_address: toArray(p['remote-address']).join('\n'),
    replay_window: p['replay-window'] || '32',
    virtual_address: toArray(p['virtual-address']).join('\n'),
    vti_bind: p.vti?.bind || '',
    vti_esp_group: p.vti?.['esp-group'] || '',
    auth_mode: p.authentication?.mode || '',
    auth_local_id: p.authentication?.['local-id'] || '',
    auth_remote_id: p.authentication?.['remote-id'] || '',
    auth_use_x509_id: p.authentication?.['use-x509-id'] !== undefined,
    x509_ca_certs: toArray(p.authentication?.x509?.['ca-certificate']).join('\n'),
    x509_cert: p.authentication?.x509?.certificate || '',
    x509_passphrase: p.authentication?.x509?.passphrase || '',
    rsa_local_key: p.authentication?.rsa?.['local-key'] || '',
    rsa_remote_key: p.authentication?.rsa?.['remote-key'] || '',
    rsa_passphrase: p.authentication?.rsa?.passphrase || '',
    tunnels: tunnelToForm(p.tunnel),
  }));
}

function raToForm(connections = {}) {
  return Object.entries(connections).map(([name, c]) => ({
    _name: name,
    name,
    description: c.description || '',
    dhcp_interface: toArray(c['dhcp-interface']).join(', '),
    disable: c.disable !== undefined,
    esp_group: c['esp-group'] || '',
    ike_group: c['ike-group'] || '',
    local_address: c['local-address'] || '',
    local_prefix: c.local?.prefix?.join('\n') || joinMembers(c.local?.prefix),
    local_port: c.local?.port || '',
    pool: toArray(c.pool),
    replay_window: c['replay-window'] || '32',
    timeout: c.timeout || '28800',
    unique: c.unique || '',
    server_mode: c.authentication?.['server-mode'] || '',
    client_mode: c.authentication?.['client-mode'] || '',
    eap_id: c.authentication?.['eap-id'] || '',
    pre_shared_secret: c.authentication?.['pre-shared-secret'] || '',
    auth_local_id: c.authentication?.['local-id'] || '',
    x509_ca_certs: toArray(c.authentication?.x509?.['ca-certificate']).join('\n'),
    x509_cert: c.authentication?.x509?.certificate || '',
    x509_passphrase: c.authentication?.x509?.passphrase || '',
  }));
}

function raPoolToForm(pools = {}) {
  return Object.entries(pools).map(([name, p]) => ({
    _name: name,
    name,
    prefix: p.prefix || '',
    name_servers: toArray(p['name-server']).join('\n'),
    excludes: toArray(p.exclude).join('\n'),
  }));
}

function raPoolToConfig(formPools) {
  const result = {};
  for (const p of formPools) {
    if (!p.name) continue;
    const item = {};
    if (isPresent(p.prefix)) item.prefix = String(p.prefix);
    const nameServers = splitMembers(p.name_servers);
    if (nameServers.length) item['name-server'] = nameServers;
    const excludes = splitMembers(p.excludes);
    if (excludes.length) item.exclude = excludes;
    if (Object.keys(item).length) result[p.name] = item;
  }
  return result;
}

function raDhcpToForm(dhcp = {}) {
  return {
    interface: dhcp.interface || '',
    server: dhcp.server || '',
  };
}

function raRadiusToForm(radius = {}) {
  return {
    nas_identifier: radius['nas-identifier'] || '',
    timeout: radius.timeout || '2',
    servers: Object.entries(radius.server || {}).map(([ip, s]) => ({
      _ip: ip,
      ip,
      key: s.key || '',
      port: s.port || '1812',
      disable: s.disable !== undefined,
      disable_accounting: s['disable-accounting'] !== undefined,
    })),
  };
}

function raRadiusServerToConfig(servers) {
  const result = {};
  for (const s of servers) {
    if (!s.ip) continue;
    const item = {};
    if (isPresent(s.key)) item.key = String(s.key);
    if (isPresent(s.port)) item.port = String(s.port);
    if (s.disable) item.disable = '';
    if (s.disable_accounting) item['disable-accounting'] = '';
    if (Object.keys(item).length) result[s.ip] = item;
  }
  return result;
}

export default defineComponent({
  name: 'IpsecPage',
  setup() {
    const route = useRoute();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('ike');
    const raActiveTab = ref('connection');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const ikeGroups = ref([]);
    const espGroups = ref([]);
    const psks = ref([]);
    const interfaces = ref('');
    const disableUniqreqids = ref(false);
    const options = ref(optionsToForm({}));
    const logConfig = ref(logToForm({}));
    const profiles = ref([]);
    const siteToSitePeers = ref([]);
    const protocols = ref([]);
    const remoteAccessConns = ref([]);
    const remoteAccessPools = ref([]);
    const remoteAccessDhcp = ref(raDhcpToForm({}));
    const remoteAccessRadius = ref(raRadiusToForm({}));

    const selectedIke = ref([]);
    const selectedEsp = ref([]);
    const selectedPsk = ref([]);
    const selectedProfile = ref([]);
    const selectedS2s = ref([]);
    const selectedRa = ref([]);
    const selectedRaPool = ref([]);
    const selectedRaRadiusServer = ref([]);

    const ikeModalVisible = ref(false);
    const espModalVisible = ref(false);
    const pskModalVisible = ref(false);
    const profileModalVisible = ref(false);
    const s2sModalVisible = ref(false);
    const raModalVisible = ref(false);
    const raPoolModalVisible = ref(false);
    const raRadiusServerModalVisible = ref(false);

    const editingIke = ref(null);
    const editingEsp = ref(null);
    const editingPsk = ref(null);
    const editingProfile = ref(null);
    const editingS2s = ref(null);
    const editingRa = ref(null);
    const editingRaPool = ref(null);
    const editingRaRadiusServer = ref(null);

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const [res, protoRes] = await Promise.all([
          configApi.get('vpn ipsec', true),
          firewallApi.protocols().catch(() => ({ protocols: [] })),
        ]);
        const data = res.data || {};
        ikeGroups.value = ikeGroupToForm(data['ike-group']);
        espGroups.value = espGroupToForm(data['esp-group']);
        psks.value = pskToForm(data.authentication?.psk);
        interfaces.value = joinMembers(data.interface);
        disableUniqreqids.value = data['disable-uniqreqids'] !== undefined;
        options.value = optionsToForm(data.options);
        logConfig.value = logToForm(data.log);
        profiles.value = profileToForm(data.profile);
        siteToSitePeers.value = s2sToForm(data['site-to-site']?.peer);
        remoteAccessConns.value = raToForm(data['remote-access']?.connection);
        remoteAccessPools.value = raPoolToForm(data['remote-access']?.pool);
        remoteAccessDhcp.value = raDhcpToForm(data['remote-access']?.dhcp);
        remoteAccessRadius.value = raRadiusToForm(data['remote-access']?.radius);
        protocols.value = protoRes.protocols || [];
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    const tabs = [
      { key: 'ike', title: 'IKE 组' },
      { key: 'esp', title: 'ESP 组' },
      { key: 'auth', title: '认证' },
      { key: 'interface', title: '接口' },
      { key: 'options', title: '选项' },
      { key: 'log', title: '日志' },
      { key: 'profile', title: 'Profile' },
      { key: 'site_to_site', title: '站点互联' },
      { key: 'remote_access', title: '远程接入' },
    ];

    const raTabs = [
      { key: 'connection', title: '连接' },
      { key: 'pool', title: '地址池' },
      { key: 'dhcp', title: 'DHCP' },
      { key: 'radius', title: 'RADIUS' },
    ];

    const ikeColumns = [
      { key: 'name', title: '名称' },
      { key: 'key_exchange', title: '密钥交换' },
      { key: 'mode', title: '模式' },
      { key: 'lifetime', title: '生命周期' },
      { key: 'close_action', title: '关闭动作' },
      { key: 'proposals', title: '提议' },
    ];

    const espColumns = [
      { key: 'name', title: '名称' },
      { key: 'mode', title: '模式' },
      { key: 'lifetime', title: '生命周期' },
      { key: 'pfs', title: 'PFS' },
      { key: 'compression', title: '压缩' },
      { key: 'proposals', title: '提议' },
    ];

    const pskColumns = [
      { key: 'name', title: '名称' },
      { key: 'ids', title: 'ID' },
      { key: 'dhcp_interface', title: 'DHCP 接口' },
      { key: 'secret', title: '密钥' },
    ];

    const profileColumns = [
      { key: 'name', title: '名称' },
      { key: 'ike_group', title: 'IKE 组' },
      { key: 'esp_group', title: 'ESP 组' },
      { key: 'authentication_mode', title: '认证模式' },
      { key: 'disable', title: '禁用' },
    ];

    const s2sColumns = [
      { key: 'name', title: '名称' },
      { key: 'remote_address', title: '远端地址' },
      { key: 'local_address', title: '本地地址' },
      { key: 'ike_group', title: 'IKE 组' },
      { key: 'default_esp_group', title: '默认 ESP 组' },
      { key: 'connection_type', title: '连接类型' },
      { key: 'disable', title: '禁用' },
    ];

    const raColumns = [
      { key: 'name', title: '名称' },
      { key: 'ike_group', title: 'IKE 组' },
      { key: 'esp_group', title: 'ESP 组' },
      { key: 'local_address', title: '本地地址' },
      { key: 'pool', title: '地址池' },
      { key: 'disable', title: '禁用' },
    ];

    const raPoolColumns = [
      { key: 'name', title: '名称' },
      { key: 'prefix', title: '前缀' },
      { key: 'name_servers', title: 'DNS 服务器' },
      { key: 'excludes', title: '排除前缀' },
    ];

    const raRadiusServerColumns = [
      { key: 'ip', title: '服务器地址' },
      { key: 'port', title: '端口' },
      { key: 'key', title: '共享密钥' },
      { key: 'disable', title: '禁用' },
      { key: 'disable_accounting', title: '禁用计费' },
    ];

    function formatProposals(row) {
      return (row.proposals || []).map(p => `${p.number}:${p.encryption || ''}/${p.hash || ''}`).join(', ');
    }

    function formatLines(value) {
      return toArray(value).join(', ');
    }

    const protocolOptions = computed(() => {
      return ['', ...protocols.value.map(p => p.name).filter(Boolean)];
    });

    const commandPath = computed(() => {
      const base = 'vpn ipsec';
      switch (activeTab.value) {
        case 'ike': return `${base} ike-group`;
        case 'esp': return `${base} esp-group`;
        case 'auth': return `${base} authentication`;
        case 'interface': return `${base} interface`;
        case 'options': return `${base} options`;
        case 'log': return `${base} log`;
        case 'profile': return `${base} profile`;
        case 'site_to_site': return `${base} site-to-site`;
        case 'remote_access':
          switch (raActiveTab.value) {
            case 'connection': return `${base} remote-access connection`;
            case 'pool': return `${base} remote-access pool`;
            case 'dhcp': return `${base} remote-access dhcp`;
            case 'radius': return `${base} remote-access radius`;
            default: return `${base} remote-access`;
          }
        default: return base;
      }
    });

    function createIke() {
      editingIke.value = {
        key_exchange: 'ikev2',
        mode: 'main',
        lifetime: '28800',
        close_action: 'none',
        disable_mobike: false,
        ikev2_reauth: false,
        dpd_action: 'clear',
        dpd_interval: '30',
        dpd_timeout: '120',
        proposals: [{ number: '1', dh_group: '2', encryption: 'aes128', hash: 'sha1', prf: 'prfsha1' }],
      };
      ikeModalVisible.value = true;
    }

    function editIke() {
      if (!selectedIke.value.length) return alert('请选择一行');
      const row = ikeGroups.value.find(r => r.name === selectedIke.value[0]);
      editingIke.value = JSON.parse(JSON.stringify(row));
      ikeModalVisible.value = true;
    }

    async function removeIke() {
      if (!selectedIke.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的 IKE 组？')) return;
      for (const name of selectedIke.value) {
        await configApi.delete(`vpn ipsec ike-group ${name}`);
      }
      selectedIke.value = [];
      await save();
    }

    function createEsp() {
      editingEsp.value = {
        mode: 'tunnel',
        lifetime: '3600',
        pfs: 'enable',
        compression: '',
        life_bytes: '',
        life_packets: '',
        proposals: [{ number: '1', encryption: 'aes128', hash: 'sha1' }],
      };
      espModalVisible.value = true;
    }

    function editEsp() {
      if (!selectedEsp.value.length) return alert('请选择一行');
      const row = espGroups.value.find(r => r.name === selectedEsp.value[0]);
      editingEsp.value = JSON.parse(JSON.stringify(row));
      espModalVisible.value = true;
    }

    async function removeEsp() {
      if (!selectedEsp.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的 ESP 组？')) return;
      for (const name of selectedEsp.value) {
        await configApi.delete(`vpn ipsec esp-group ${name}`);
      }
      selectedEsp.value = [];
      await save();
    }

    function createPsk() {
      editingPsk.value = {};
      pskModalVisible.value = true;
    }

    function editPsk() {
      if (!selectedPsk.value.length) return alert('请选择一行');
      const row = psks.value.find(r => r.name === selectedPsk.value[0]);
      editingPsk.value = JSON.parse(JSON.stringify(row));
      pskModalVisible.value = true;
    }

    async function removePsk() {
      if (!selectedPsk.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的 PSK？')) return;
      for (const name of selectedPsk.value) {
        await configApi.delete(`vpn ipsec authentication psk ${name}`);
      }
      selectedPsk.value = [];
      await save();
    }

    function createProfile() {
      editingProfile.value = {};
      profileModalVisible.value = true;
    }

    function editProfile() {
      if (!selectedProfile.value.length) return alert('请选择一行');
      const row = profiles.value.find(r => r.name === selectedProfile.value[0]);
      editingProfile.value = JSON.parse(JSON.stringify(row));
      profileModalVisible.value = true;
    }

    async function removeProfile() {
      if (!selectedProfile.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的 Profile？')) return;
      for (const name of selectedProfile.value) {
        await configApi.delete(`vpn ipsec profile ${name}`);
      }
      selectedProfile.value = [];
      await save();
    }

    function createS2s() {
      editingS2s.value = {
        connection_type: 'initiate',
        replay_window: '32',
        tunnels: [],
      };
      s2sModalVisible.value = true;
    }

    function editS2s() {
      if (!selectedS2s.value.length) return alert('请选择一行');
      const row = siteToSitePeers.value.find(r => r.name === selectedS2s.value[0]);
      editingS2s.value = JSON.parse(JSON.stringify(row));
      s2sModalVisible.value = true;
    }

    async function removeS2s() {
      if (!selectedS2s.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的站点互联？')) return;
      for (const name of selectedS2s.value) {
        await configApi.delete(`vpn ipsec site-to-site peer ${name}`);
      }
      selectedS2s.value = [];
      await save();
    }

    function createRa() {
      editingRa.value = {
        replay_window: '32',
        timeout: '28800',
        unique: '',
        server_mode: 'x509',
        client_mode: 'eap-mschapv2',
        pool: [],
      };
      raModalVisible.value = true;
    }

    function editRa() {
      if (!selectedRa.value.length) return alert('请选择一行');
      const row = remoteAccessConns.value.find(r => r.name === selectedRa.value[0]);
      editingRa.value = JSON.parse(JSON.stringify(row));
      raModalVisible.value = true;
    }

    async function removeRa() {
      if (!selectedRa.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的远程接入连接？')) return;
      for (const name of selectedRa.value) {
        await configApi.delete(`vpn ipsec remote-access connection ${name}`);
      }
      selectedRa.value = [];
      await save();
    }

    function createRaPool() {
      editingRaPool.value = {};
      raPoolModalVisible.value = true;
    }

    function editRaPool() {
      if (!selectedRaPool.value.length) return alert('请选择一行');
      const row = remoteAccessPools.value.find(r => r.name === selectedRaPool.value[0]);
      editingRaPool.value = JSON.parse(JSON.stringify(row));
      raPoolModalVisible.value = true;
    }

    async function removeRaPool() {
      if (!selectedRaPool.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的地址池？')) return;
      for (const name of selectedRaPool.value) {
        await configApi.delete(`vpn ipsec remote-access pool ${name}`);
      }
      selectedRaPool.value = [];
      await save();
    }

    async function saveRaPool() {
      const item = editingRaPool.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      if (!item.prefix) return alert('请输入地址池前缀');
      const prefixErr = validateField(item.prefix, { validate: 'ip-segment' });
      if (prefixErr) return alert('地址池前缀：' + prefixErr);
      const value = {};
      value.prefix = String(item.prefix);
      const nameServers = splitMembers(item.name_servers);
      for (const ns of nameServers) {
        const nsErr = validateField(ns, { validate: 'ip' });
        if (nsErr) return alert('DNS 服务器 ' + ns + '：' + nsErr);
      }
      if (nameServers.length) value['name-server'] = nameServers;
      const excludes = splitMembers(item.excludes);
      for (const ex of excludes) {
        const exErr = validateField(ex, { validate: 'ip-segment' });
        if (exErr) return alert('排除前缀 ' + ex + '：' + exErr);
      }
      if (excludes.length) value.exclude = excludes;
      await configApi.set(`vpn ipsec remote-access pool ${item.name}`, value);
      raPoolModalVisible.value = false;
      await save();
    }

    async function saveRaDhcp() {
      const item = remoteAccessDhcp.value;
      const value = {};
      if (isPresent(item.server)) {
        const serverErr = validateField(item.server, { validate: 'ip' });
        if (serverErr) return alert('DHCP 服务器：' + serverErr);
        value.server = String(item.server);
      }
      if (isPresent(item.interface)) {
        const ifErr = validateInterface(item.interface);
        if (ifErr) return alert('DHCP 接口：' + ifErr);
        value.interface = String(item.interface).trim();
      }
      if (Object.keys(value).length) {
        await configApi.set('vpn ipsec remote-access dhcp', value);
      } else {
        try { await configApi.delete('vpn ipsec remote-access dhcp'); } catch (_) {}
      }
      await save();
    }

    function createRaRadiusServer() {
      editingRaRadiusServer.value = { port: '1812' };
      raRadiusServerModalVisible.value = true;
    }

    function editRaRadiusServer() {
      if (!selectedRaRadiusServer.value.length) return alert('请选择一行');
      const row = remoteAccessRadius.value.servers.find(r => r.ip === selectedRaRadiusServer.value[0]);
      editingRaRadiusServer.value = JSON.parse(JSON.stringify(row));
      raRadiusServerModalVisible.value = true;
    }

    async function removeRaRadiusServer() {
      if (!selectedRaRadiusServer.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的 RADIUS 服务器？')) return;
      for (const ip of selectedRaRadiusServer.value) {
        await configApi.delete(`vpn ipsec remote-access radius server ${ip}`);
      }
      selectedRaRadiusServer.value = [];
      await save();
    }

    async function saveRaRadiusServer() {
      const item = editingRaRadiusServer.value;
      if (!item.ip) return alert('请输入 RADIUS 服务器地址');
      const ipErr = validateField(item.ip, { validate: 'ip' });
      if (ipErr) return alert('RADIUS 服务器地址：' + ipErr);
      if (isPresent(item.port) && !inRange(item.port, 1, 65535)) return alert('RADIUS 端口范围为 1-65535');
      const value = {};
      if (isPresent(item.key)) value.key = String(item.key);
      if (isPresent(item.port)) value.port = String(item.port);
      if (item.disable) value.disable = '';
      if (item.disable_accounting) value['disable-accounting'] = '';
      await configApi.set(`vpn ipsec remote-access radius server ${item.ip}`, value);
      raRadiusServerModalVisible.value = false;
      await save();
    }

    async function saveRaRadius() {
      const item = remoteAccessRadius.value;
      const value = {};
      if (isPresent(item.nas_identifier)) value['nas-identifier'] = String(item.nas_identifier);
      if (isPresent(item.timeout) && !inRange(item.timeout, 1, 240)) return alert('RADIUS 超时范围为 1-240');
      if (isPresent(item.timeout)) value.timeout = String(item.timeout);
      const servers = raRadiusServerToConfig(item.servers || []);
      if (Object.keys(servers).length) value.server = servers;
      if (Object.keys(value).length) {
        await configApi.set('vpn ipsec remote-access radius', value);
      } else {
        try { await configApi.delete('vpn ipsec remote-access radius'); } catch (_) {}
      }
      await save();
    }

    async function saveIke() {
      const item = editingIke.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      if (isPresent(item.lifetime) && !inRange(item.lifetime, 0, 86400)) return alert('IKE 生命周期范围为 0-86400');
      if (isPresent(item.dpd_interval) && !inRange(item.dpd_interval, 2, 86400)) return alert('DPD 间隔范围为 2-86400');
      if (isPresent(item.dpd_timeout) && !inRange(item.dpd_timeout, 2, 86400)) return alert('DPD 超时范围为 2-86400');
      const value = {};
      if (isPresent(item.close_action)) value['close-action'] = String(item.close_action);
      if (item.disable_mobike) value['disable-mobike'] = '';
      if (item.ikev2_reauth) value['ikev2-reauth'] = '';
      if (isPresent(item.key_exchange)) value['key-exchange'] = String(item.key_exchange);
      if (isPresent(item.lifetime)) value.lifetime = String(item.lifetime);
      if (isPresent(item.mode)) value.mode = String(item.mode);
      const proposals = proposalToConfig(item.proposals || []);
      if (Object.keys(proposals).length) value.proposal = proposals;
      const dpd = {};
      if (isPresent(item.dpd_action)) dpd.action = String(item.dpd_action);
      if (isPresent(item.dpd_interval)) dpd.interval = String(item.dpd_interval);
      if (isPresent(item.dpd_timeout)) dpd.timeout = String(item.dpd_timeout);
      if (Object.keys(dpd).length) value['dead-peer-detection'] = dpd;
      await configApi.set(`vpn ipsec ike-group ${item.name}`, value);
      ikeModalVisible.value = false;
      await save();
    }

    async function saveEsp() {
      const item = editingEsp.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      if (isPresent(item.lifetime) && !inRange(item.lifetime, 30, 86400)) return alert('ESP 生命周期范围为 30-86400');
      if (isPresent(item.life_bytes) && !inRange(item.life_bytes, 1024, 26843545600000)) return alert('ESP 生命周期（字节）范围为 1024-26843545600000');
      if (isPresent(item.life_packets) && !inRange(item.life_packets, 1000, 26843545600000)) return alert('ESP 生命周期（包数）范围为 1000-26843545600000');
      const value = {};
      if (isPresent(item.compression)) value.compression = String(item.compression);
      if (isPresent(item.life_bytes)) value['life-bytes'] = String(item.life_bytes);
      if (isPresent(item.life_packets)) value['life-packets'] = String(item.life_packets);
      if (isPresent(item.lifetime)) value.lifetime = String(item.lifetime);
      if (isPresent(item.mode)) value.mode = String(item.mode);
      if (isPresent(item.pfs)) value.pfs = String(item.pfs);
      const proposals = proposalToConfig(item.proposals || []);
      if (Object.keys(proposals).length) value.proposal = proposals;
      await configApi.set(`vpn ipsec esp-group ${item.name}`, value);
      espModalVisible.value = false;
      await save();
    }

    async function savePsk() {
      const item = editingPsk.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      if (!item.secret) return alert('请输入密钥');
      const value = {};
      const ids = splitMembers(item.ids);
      if (ids.length) value.id = ids;
      if (isPresent(item.secret)) value.secret = String(item.secret);
      const dhcp = String(item.dhcp_interface || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const d of dhcp) {
        const dhcpErr = validateInterface(d);
        if (dhcpErr) return alert('DHCP 接口 ' + d + '：' + dhcpErr);
      }
      if (dhcp.length) value['dhcp-interface'] = dhcp;
      await configApi.set(`vpn ipsec authentication psk ${item.name}`, value);
      pskModalVisible.value = false;
      await save();
    }

    async function saveProfile() {
      const item = editingProfile.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      const value = {};
      if (item.disable) value.disable = '';
      if (isPresent(item.esp_group)) value['esp-group'] = String(item.esp_group);
      if (isPresent(item.ike_group)) value['ike-group'] = String(item.ike_group);
      const auth = {};
      if (isPresent(item.authentication_mode)) auth.mode = String(item.authentication_mode);
      if (isPresent(item.pre_shared_secret)) auth['pre-shared-secret'] = String(item.pre_shared_secret);
      if (Object.keys(auth).length) value.authentication = auth;
      const tunnels = splitMembers(item.bind_tunnels);
      if (tunnels.length) value.bind = { tunnel: tunnels };
      await configApi.set(`vpn ipsec profile ${item.name}`, value);
      profileModalVisible.value = false;
      await save();
    }

    async function saveS2s() {
      const item = editingS2s.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      const remoteAddrs = splitMembers(item.remote_address);
      if (!remoteAddrs.length) return alert('请输入至少一个远端地址');
      const remoteErr = validateLines(item.remote_address, 'ip-segment');
      if (remoteErr) return alert('远端地址：' + remoteErr);
      if (isPresent(item.local_address)) {
        const localErr = validateField(item.local_address, { validate: 'ip' });
        if (localErr) return alert('本地地址：' + localErr);
      }
      if (isPresent(item.replay_window) && !inRange(item.replay_window, 0, 1024)) return alert('Replay window 范围为 0-1024');
      const value = {};
      if (isPresent(item.connection_type)) value['connection-type'] = String(item.connection_type);
      if (isPresent(item.default_esp_group)) value['default-esp-group'] = String(item.default_esp_group);
      if (isPresent(item.description)) value.description = String(item.description);
      if (isPresent(item.dhcp_interface)) {
        const dhcpIfErr = validateInterface(item.dhcp_interface);
        if (dhcpIfErr) return alert('DHCP 接口：' + dhcpIfErr);
        value['dhcp-interface'] = String(item.dhcp_interface).trim();
      }
      if (item.disable) value.disable = '';
      if (item.force_udp_encapsulation) value['force-udp-encapsulation'] = '';
      if (isPresent(item.ike_group)) value['ike-group'] = String(item.ike_group);
      if (item.ikev2_reauth) value['ikev2-reauth'] = '';
      if (isPresent(item.local_address)) value['local-address'] = String(item.local_address);
      if (remoteAddrs.length === 1) value['remote-address'] = remoteAddrs[0];
      else value['remote-address'] = remoteAddrs;
      if (isPresent(item.replay_window)) value['replay-window'] = String(item.replay_window);
      const virtualAddrs = splitMembers(item.virtual_address);
      if (virtualAddrs.length) {
        const virtErr = validateLines(item.virtual_address, 'ip-segment');
        if (virtErr) return alert('虚拟地址：' + virtErr);
        value['virtual-address'] = virtualAddrs;
      }
      const vti = {};
      if (isPresent(item.vti_bind)) {
        const vtiErr = validateInterface(item.vti_bind);
        if (vtiErr) return alert('VTI 绑定接口：' + vtiErr);
        vti.bind = String(item.vti_bind);
      }
      if (isPresent(item.vti_esp_group)) vti['esp-group'] = String(item.vti_esp_group);
      if (Object.keys(vti).length) value.vti = vti;
      const auth = {};
      if (isPresent(item.auth_mode)) auth.mode = String(item.auth_mode);
      if (isPresent(item.auth_local_id)) auth['local-id'] = String(item.auth_local_id);
      if (isPresent(item.auth_remote_id)) auth['remote-id'] = String(item.auth_remote_id);
      if (item.auth_use_x509_id) auth['use-x509-id'] = '';
      const x509CaCerts = splitMembers(item.x509_ca_certs);
      if (x509CaCerts.length) {
        auth.x509 = auth.x509 || {};
        auth.x509['ca-certificate'] = x509CaCerts;
      }
      if (isPresent(item.x509_cert)) {
        auth.x509 = auth.x509 || {};
        auth.x509.certificate = String(item.x509_cert);
      }
      if (isPresent(item.x509_passphrase)) {
        auth.x509 = auth.x509 || {};
        auth.x509.passphrase = String(item.x509_passphrase);
      }
      if (isPresent(item.rsa_local_key)) {
        auth.rsa = auth.rsa || {};
        auth.rsa['local-key'] = String(item.rsa_local_key);
      }
      if (isPresent(item.rsa_remote_key)) {
        auth.rsa = auth.rsa || {};
        auth.rsa['remote-key'] = String(item.rsa_remote_key);
      }
      if (isPresent(item.rsa_passphrase)) {
        auth.rsa = auth.rsa || {};
        auth.rsa.passphrase = String(item.rsa_passphrase);
      }
      if (Object.keys(auth).length) value.authentication = auth;
      const tunnels = tunnelToConfig(item.tunnels || []);
      if (Object.keys(tunnels).length) {
        for (const t of item.tunnels) {
          if (!t.number) continue;
          if (!inRange(t.number, 0, 4294967295)) return alert(`隧道 ${t.number} 编号范围为 0-4294967295`);
          if (isPresent(t.priority) && !inRange(t.priority, 1, 100)) return alert(`隧道 ${t.number} 优先级范围为 1-100`);
          if (isPresent(t.local_port)) {
            const portErr = validateField(t.local_port, { validate: 'port-single' });
            if (portErr) return alert(`隧道 ${t.number} 本地端口：` + portErr);
          }
          if (isPresent(t.remote_port)) {
            const portErr = validateField(t.remote_port, { validate: 'port-single' });
            if (portErr) return alert(`隧道 ${t.number} 远端端口：` + portErr);
          }
          if (isPresent(t.local_prefix)) {
            const err = validateLines(t.local_prefix, 'ip-segment');
            if (err) return alert(`隧道 ${t.number} 本地前缀：` + err);
          }
          if (isPresent(t.remote_prefix)) {
            const err = validateLines(t.remote_prefix, 'ip-segment');
            if (err) return alert(`隧道 ${t.number} 远端前缀：` + err);
          }
        }
        value.tunnel = tunnels;
      }
      await configApi.set(`vpn ipsec site-to-site peer ${item.name}`, value);
      s2sModalVisible.value = false;
      await save();
    }

    async function saveRa() {
      const item = editingRa.value;
      const nameErr = validateName(item.name);
      if (nameErr) return alert(nameErr);
      if (isPresent(item.replay_window) && !inRange(item.replay_window, 0, 1024)) return alert('Replay window 范围为 0-1024');
      if (isPresent(item.timeout) && !inRange(item.timeout, 1, 86400)) return alert('超时范围为 1-86400');
      if (isPresent(item.local_address)) {
        const localErr = validateField(item.local_address, { validate: 'ip' });
        if (localErr) return alert('本地地址：' + localErr);
      }
      const localPrefix = splitMembers(item.local_prefix);
      if (localPrefix.length) {
        const prefixErr = validateLines(item.local_prefix, 'ip-segment');
        if (prefixErr) return alert('本地前缀：' + prefixErr);
      }
      if (isPresent(item.local_port)) {
        const portErr = validateField(item.local_port, { validate: 'port-single' });
        if (portErr) return alert('本地端口：' + portErr);
      }
      const value = {};
      if (isPresent(item.description)) value.description = String(item.description);
      if (isPresent(item.dhcp_interface)) {
        const dhcpIfErr = validateInterface(item.dhcp_interface);
        if (dhcpIfErr) return alert('DHCP 接口：' + dhcpIfErr);
        value['dhcp-interface'] = String(item.dhcp_interface).trim();
      }
      if (item.disable) value.disable = '';
      if (isPresent(item.esp_group)) value['esp-group'] = String(item.esp_group);
      if (isPresent(item.ike_group)) value['ike-group'] = String(item.ike_group);
      if (isPresent(item.local_address)) value['local-address'] = String(item.local_address);
      if (localPrefix.length || isPresent(item.local_port)) {
        value.local = {};
        if (localPrefix.length) value.local.prefix = localPrefix;
        if (isPresent(item.local_port)) value.local.port = String(item.local_port);
      }
      const pools = toArray(item.pool).map(s => String(s).trim()).filter(Boolean);
      for (const p of pools) {
        const nameErr = validateName(p);
        if (nameErr) return alert('地址池名称 ' + p + '：' + nameErr);
      }
      if (pools.length) value.pool = pools;
      if (isPresent(item.replay_window)) value['replay-window'] = String(item.replay_window);
      if (isPresent(item.timeout)) value.timeout = String(item.timeout);
      if (isPresent(item.unique)) value.unique = String(item.unique);
      const auth = {};
      if (isPresent(item.server_mode)) auth['server-mode'] = String(item.server_mode);
      if (isPresent(item.client_mode)) auth['client-mode'] = String(item.client_mode);
      if (isPresent(item.eap_id)) auth['eap-id'] = String(item.eap_id);
      if (isPresent(item.pre_shared_secret)) auth['pre-shared-secret'] = String(item.pre_shared_secret);
      if (isPresent(item.auth_local_id)) auth['local-id'] = String(item.auth_local_id);
      const x509CaCerts = splitMembers(item.x509_ca_certs);
      if (x509CaCerts.length) {
        auth.x509 = auth.x509 || {};
        auth.x509['ca-certificate'] = x509CaCerts;
      }
      if (isPresent(item.x509_cert)) {
        auth.x509 = auth.x509 || {};
        auth.x509.certificate = String(item.x509_cert);
      }
      if (isPresent(item.x509_passphrase)) {
        auth.x509 = auth.x509 || {};
        auth.x509.passphrase = String(item.x509_passphrase);
      }
      if (Object.keys(auth).length) value.authentication = auth;
      await configApi.set(`vpn ipsec remote-access connection ${item.name}`, value);
      raModalVisible.value = false;
      await save();
    }

    async function save() {
      saving.value = true;
      saved.value = false;
      try {
        const ifaceList = splitMembers(interfaces.value);
        for (const iface of ifaceList) {
          const ifErr = validateInterface(iface);
          if (ifErr) return alert('接口 ' + iface + '：' + ifErr);
        }
        if (ifaceList.length) {
          await configApi.set('vpn ipsec interface', ifaceList);
        } else {
          try { await configApi.delete('vpn ipsec interface'); } catch (_) {}
        }

        const optIfErr = validateInterface(options.value.interface);
        if (optIfErr) return alert('选项接口：' + optIfErr);

        if (disableUniqreqids.value) {
          await configApi.set('vpn ipsec disable-uniqreqids', '');
        } else {
          try { await configApi.delete('vpn ipsec disable-uniqreqids'); } catch (_) {}
        }

        const optValue = {};
        if (options.value.disable_route_autoinstall) optValue['disable-route-autoinstall'] = '';
        if (options.value.flexvpn) optValue.flexvpn = '';
        if (options.value.virtual_ip) optValue['virtual-ip'] = '';
        if (isPresent(options.value.interface)) optValue.interface = String(options.value.interface);
        if (Object.keys(optValue).length) {
          await configApi.set('vpn ipsec options', optValue);
        } else {
          try { await configApi.delete('vpn ipsec options'); } catch (_) {}
        }

        const logValue = {};
        if (isPresent(logConfig.value.level)) logValue.level = String(logConfig.value.level);
        const subs = (logConfig.value.subsystems || []).map(s => s.name).filter(Boolean);
        if (subs.length) logValue.subsystem = subs;
        if (Object.keys(logValue).length) {
          await configApi.set('vpn ipsec log', logValue);
        } else {
          try { await configApi.delete('vpn ipsec log'); } catch (_) {}
        }

        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function addIkeProposal() {
      if (!editingIke.value.proposals) editingIke.value.proposals = [];
      editingIke.value.proposals.push({ number: '', dh_group: '', encryption: '', hash: '', prf: '' });
    }

    function removeIkeProposal(index) {
      editingIke.value.proposals.splice(index, 1);
    }

    function addEspProposal() {
      if (!editingEsp.value.proposals) editingEsp.value.proposals = [];
      editingEsp.value.proposals.push({ number: '', encryption: '', hash: '' });
    }

    function removeEspProposal(index) {
      editingEsp.value.proposals.splice(index, 1);
    }

    function addLogSubsystem() {
      if (!logConfig.value.subsystems) logConfig.value.subsystems = [];
      logConfig.value.subsystems.push({ name: '' });
    }

    function removeLogSubsystem(index) {
      logConfig.value.subsystems.splice(index, 1);
    }

    function addS2sTunnel() {
      if (!editingS2s.value.tunnels) editingS2s.value.tunnels = [];
      editingS2s.value.tunnels.push({ number: '', disable: false, esp_group: '', priority: '', protocol: '', local_prefix: '', local_port: '', remote_prefix: '', remote_port: '' });
    }

    function removeS2sTunnel(index) {
      editingS2s.value.tunnels.splice(index, 1);
    }

    return {
      loading, saving, saved, activeTab, tabs, writeDisabled,
      raActiveTab, raTabs,
      ikeGroups, espGroups, psks, interfaces, disableUniqreqids, options, logConfig, profiles,
      siteToSitePeers, protocols, protocolOptions, commandPath, remoteAccessConns, remoteAccessPools, remoteAccessDhcp, remoteAccessRadius,
      selectedIke, selectedEsp, selectedPsk, selectedProfile, selectedS2s, selectedRa,
      selectedRaPool, selectedRaRadiusServer,
      ikeModalVisible, espModalVisible, pskModalVisible, profileModalVisible,
      s2sModalVisible, raModalVisible, raPoolModalVisible, raRadiusServerModalVisible,
      editingIke, editingEsp, editingPsk, editingProfile, editingS2s, editingRa,
      editingRaPool, editingRaRadiusServer,
      ikeColumns, espColumns, pskColumns, profileColumns, s2sColumns, raColumns,
      raPoolColumns, raRadiusServerColumns,
      load, save,
      createIke, editIke, removeIke, saveIke,
      createEsp, editEsp, removeEsp, saveEsp,
      createPsk, editPsk, removePsk, savePsk,
      createProfile, editProfile, removeProfile, saveProfile,
      createS2s, editS2s, removeS2s, saveS2s,
      createRa, editRa, removeRa, saveRa,
      createRaPool, editRaPool, removeRaPool, saveRaPool,
      saveRaDhcp,
      createRaRadiusServer, editRaRadiusServer, removeRaRadiusServer, saveRaRadiusServer, saveRaRadius,
      addIkeProposal, removeIkeProposal, addEspProposal, removeEspProposal,
      addLogSubsystem, removeLogSubsystem, addS2sTunnel, removeS2sTunnel,
      formatProposals, formatLines, optionValue, optionLabel,
      KEY_EXCHANGE_OPTIONS, IKE_MODE_OPTIONS, CLOSE_ACTION_OPTIONS,
      DPD_ACTION_OPTIONS, DH_GROUP_OPTIONS, ENCRYPTION_OPTIONS, HASH_OPTIONS,
      PRF_OPTIONS, ESP_MODE_OPTIONS, PFS_OPTIONS, COMPRESSION_OPTIONS,
      AUTH_MODE_OPTIONS, LOG_LEVEL_OPTIONS, LOG_SUBSYSTEM_OPTIONS,
      CONNECTION_TYPE_OPTIONS, UNIQUE_OPTIONS, SERVER_MODE_OPTIONS, CLIENT_MODE_OPTIONS,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #ike>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createIke" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editIke" :disabled="writeDisabled || !selectedIke.length || selectedIke.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeIke" :disabled="writeDisabled || !selectedIke.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="ikeColumns" :data="ikeGroups" row-key="name" :externalToolbar="true" @selection-change="selectedIke = $event" :selectable="true">
            <template #proposals="{ row }">{{ formatProposals(row) }}</template>
          </DataTable>
        </template>
        <template #esp>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createEsp" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editEsp" :disabled="writeDisabled || !selectedEsp.length || selectedEsp.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeEsp" :disabled="writeDisabled || !selectedEsp.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="espColumns" :data="espGroups" row-key="name" :externalToolbar="true" @selection-change="selectedEsp = $event" :selectable="true">
            <template #proposals="{ row }">{{ formatProposals(row) }}</template>
          </DataTable>
        </template>
        <template #auth>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createPsk" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editPsk" :disabled="writeDisabled || !selectedPsk.length || selectedPsk.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removePsk" :disabled="writeDisabled || !selectedPsk.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="pskColumns" :data="psks" row-key="name" :externalToolbar="true" @selection-change="selectedPsk = $event" :selectable="true" />
        </template>
        <template #interface>
          <div class="form-row">
            <label class="form-label" title="禁用唯一请求 ID，用于特定兼容性场景">禁用唯一请求 ID (disable-uniqreqids)</label>
            <input type="checkbox" v-model="disableUniqreqids" :disabled="writeDisabled" title="禁用唯一请求 ID" />
          </div>
          <div class="form-row">
            <label class="form-label" title="启用 IPsec 的接口，每行一个接口名（如 eth0）">接口</label>
            <textarea class="form-control" v-model="interfaces" placeholder="每行一个接口名（如 eth0）" :disabled="writeDisabled" title="IPsec 接口" />
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
          </div>
        </template>
        <template #options>
          <div class="form-row">
            <label class="form-label" title="禁止自动安装 IPsec 路由">禁用路由自动安装</label>
            <input type="checkbox" v-model="options.disable_route_autoinstall" :disabled="writeDisabled" title="禁用路由自动安装" />
          </div>
          <div class="form-row">
            <label class="form-label" title="启用 Cisco FlexVPN 兼容性">FlexVPN</label>
            <input type="checkbox" v-model="options.flexvpn" :disabled="writeDisabled" title="FlexVPN" />
          </div>
          <div class="form-row">
            <label class="form-label" title="启用虚拟 IP 支持">虚拟 IP</label>
            <input type="checkbox" v-model="options.virtual_ip" :disabled="writeDisabled" title="虚拟 IP" />
          </div>
          <div class="form-row">
            <label class="form-label" title="全局选项接口，如 eth0">选项接口</label>
            <input class="form-control" v-model="options.interface" placeholder="如 eth0" :disabled="writeDisabled" title="选项接口" />
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
          </div>
        </template>
        <template #log>
          <div class="form-row">
            <label class="form-label" title="全局日志级别，数值越大越详细（0-4）">全局日志级别</label>
            <select class="form-control" v-model="logConfig.level" :disabled="writeDisabled" title="全局日志级别">
              <option v-for="o in LOG_LEVEL_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div style="margin:12px 0;">
            <ToolbarButton icon="create" @click="addLogSubsystem" :disabled="writeDisabled">添加子系统</ToolbarButton>
          </div>
          <div v-for="(s, i) in logConfig.subsystems" :key="i" class="form-row">
            <label class="form-label" title="日志子系统名称">子系统</label>
            <select class="form-control" v-model="s.name" :disabled="writeDisabled" title="日志子系统">
              <option v-for="o in LOG_SUBSYSTEM_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
            <ToolbarButton icon="delete" @click="removeLogSubsystem(i)" :disabled="writeDisabled">删除</ToolbarButton>
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
          </div>
        </template>
        <template #profile>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createProfile" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editProfile" :disabled="writeDisabled || !selectedProfile.length || selectedProfile.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeProfile" :disabled="writeDisabled || !selectedProfile.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="profileColumns" :data="profiles" row-key="name" :externalToolbar="true" @selection-change="selectedProfile = $event" :selectable="true" />
        </template>
        <template #site_to_site>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createS2s" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editS2s" :disabled="writeDisabled || !selectedS2s.length || selectedS2s.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeS2s" :disabled="writeDisabled || !selectedS2s.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="s2sColumns" :data="siteToSitePeers" row-key="name" :externalToolbar="true" @selection-change="selectedS2s = $event" :selectable="true">
            <template #remote_address="{ row }">{{ formatLines(row.remote_address) }}</template>
          </DataTable>
        </template>
        <template #remote_access>
          <TabGroup v-model="raActiveTab" :tabs="raTabs">
            <template #connection>
              <div class="toolbar">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRa" :disabled="writeDisabled">创建</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRa" :disabled="writeDisabled || !selectedRa.length || selectedRa.length > 1">编辑</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRa" :disabled="writeDisabled || !selectedRa.length">删除</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raColumns" :data="remoteAccessConns" row-key="name" :externalToolbar="true" @selection-change="selectedRa = $event" :selectable="true">
                <template #pool="{ row }">{{ formatLines(row.pool) }}</template>
              </DataTable>
            </template>
            <template #pool>
              <div class="toolbar">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRaPool" :disabled="writeDisabled">创建</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRaPool" :disabled="writeDisabled || !selectedRaPool.length || selectedRaPool.length > 1">编辑</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRaPool" :disabled="writeDisabled || !selectedRaPool.length">删除</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raPoolColumns" :data="remoteAccessPools" row-key="name" :externalToolbar="true" @selection-change="selectedRaPool = $event" :selectable="true">
                <template #name_servers="{ row }">{{ formatLines(row.name_servers) }}</template>
                <template #excludes="{ row }">{{ formatLines(row.excludes) }}</template>
              </DataTable>
            </template>
            <template #dhcp>
              <div class="form-row">
                <label class="form-label" title="DHCP 服务器 IPv4 地址">DHCP 服务器</label>
                <input class="form-control" v-model="remoteAccessDhcp.server" placeholder="如 192.168.1.1" :disabled="writeDisabled" title="DHCP 服务器 IPv4 地址" />
              </div>
              <div class="form-row">
                <label class="form-label" title="使用 DHCP 的接口，如 eth0">DHCP 接口</label>
                <input class="form-control" v-model="remoteAccessDhcp.interface" placeholder="如 eth0" :disabled="writeDisabled" title="DHCP 接口" />
              </div>
              <div class="page-actions-bottom">
                <ToolbarButton icon="save" primary @click="saveRaDhcp" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
              </div>
            </template>
            <template #radius>
              <div class="form-row">
                <label class="form-label" title="发送给 RADIUS 的 NAS-Identifier 属性">NAS-Identifier</label>
                <input class="form-control" v-model="remoteAccessRadius.nas_identifier" :disabled="writeDisabled" title="NAS-Identifier" />
              </div>
              <div class="form-row">
                <label class="form-label" title="会话超时时间，范围 1-240 秒，默认 2">超时</label>
                <div style="flex:1;">
                  <input class="form-control" type="number" min="1" max="240" v-model="remoteAccessRadius.timeout" placeholder="2" :disabled="writeDisabled" title="RADIUS 超时（秒）" style="width:100%;" />
                  <div class="form-hint">范围：1-240，默认 2</div>
                </div>
              </div>
              <div class="toolbar">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRaRadiusServer" :disabled="writeDisabled">添加服务器</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRaRadiusServer" :disabled="writeDisabled || !selectedRaRadiusServer.length || selectedRaRadiusServer.length > 1">编辑</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRaRadiusServer" :disabled="writeDisabled || !selectedRaRadiusServer.length">删除</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raRadiusServerColumns" :data="remoteAccessRadius.servers" row-key="ip" :externalToolbar="true" @selection-change="selectedRaRadiusServer = $event" :selectable="true" />
              <div class="page-actions-bottom">
                <ToolbarButton icon="save" primary @click="saveRaRadius" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存 RADIUS' }}</ToolbarButton>
              </div>
            </template>
          </TabGroup>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />

      <DraggableModal v-model:visible="ikeModalVisible" title="IKE 组" width="920px" @confirm="saveIke">
        <div class="form-row"><label class="form-label" title="IKE 组名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingIke.name" :disabled="editingIke._name" title="IKE 组名称" /></div>
        <div class="form-row"><label class="form-label" title="IKE 密钥交换版本：ikev1 或 ikev2">密钥交换</label><select class="form-control" v-model="editingIke.key_exchange" title="IKE 密钥交换版本"><option v-for="o in KEY_EXCHANGE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="IKE 协商模式：main（主模式）或 aggressive（积极模式）">模式</label><select class="form-control" v-model="editingIke.mode" title="IKE 协商模式"><option v-for="o in IKE_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="IKE SA 生命周期，单位秒，范围 0-86400，默认 28800">生命周期</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="86400" v-model="editingIke.lifetime" placeholder="28800" title="IKE SA 生命周期（秒）" style="width:100%;" /><div class="form-hint">范围：0-86400，默认 28800</div></div></div>
        <div class="form-row"><label class="form-label" title="连接关闭时的动作：none/clear/hold/restart">关闭动作</label><select class="form-control" v-model="editingIke.close_action" title="连接关闭动作"><option v-for="o in CLOSE_ACTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="禁用 MOBIKE（IKEv2 移动性与多重宿主协议）">禁用 MOBIKE</label><input type="checkbox" v-model="editingIke.disable_mobike" title="禁用 MOBIKE" /></div>
        <div class="form-row"><label class="form-label" title="启用 IKEv2 重新认证">IKEv2 重新认证</label><input type="checkbox" v-model="editingIke.ikev2_reauth" title="启用 IKEv2 重新认证" /></div>
        <div style="font-weight:bold;margin:12px 0 8px;">Dead Peer Detection</div>
        <div class="form-row"><label class="form-label" title="DPD 检测到对端失效时执行的动作：clear/hold/restart">动作</label><select class="form-control" v-model="editingIke.dpd_action" title="DPD 动作"><option v-for="o in DPD_ACTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="DPD 探测间隔，单位秒，范围 2-86400，默认 30">间隔</label><div style="flex:1;"><input class="form-control" type="number" min="2" max="86400" v-model="editingIke.dpd_interval" placeholder="30" title="DPD 探测间隔（秒）" style="width:100%;" /><div class="form-hint">范围：2-86400，默认 30</div></div></div>
        <div class="form-row"><label class="form-label" title="DPD 超时时间，单位秒，范围 2-86400，默认 120">超时</label><div style="flex:1;"><input class="form-control" type="number" min="2" max="86400" v-model="editingIke.dpd_timeout" placeholder="120" title="DPD 超时时间（秒）" style="width:100%;" /><div class="form-hint">范围：2-86400，默认 120</div></div></div>
        <div style="font-weight:bold;margin:12px 0 8px;">提议</div>
        <div style="display:grid;grid-template-columns:70px 140px 110px 140px 110px auto;gap:8px;align-items:end;margin-bottom:4px;">
          <div style="font-size:12px;color:#666;">编号</div>
          <div style="font-size:12px;color:#666;">加密</div>
          <div style="font-size:12px;color:#666;">哈希</div>
          <div style="font-size:12px;color:#666;">DH 组</div>
          <div style="font-size:12px;color:#666;">PRF</div>
        </div>
        <div v-for="(p, i) in editingIke.proposals" :key="i" style="display:grid;grid-template-columns:70px 140px 110px 140px 110px auto;gap:8px;align-items:start;">
          <input class="form-control" v-model="p.number" placeholder="编号" title="提议编号" />
          <select class="form-control" v-model="p.encryption" title="加密算法，默认 aes128"><option v-for="o in ENCRYPTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select>
          <select class="form-control" v-model="p.hash" title="哈希算法，默认 sha1"><option v-for="o in HASH_OPTIONS" :key="o" :value="o">{{ o }}</option></select>
          <select class="form-control" v-model="p.dh_group" title="Diffie-Hellman 组，默认 2 (modp1024)"><option v-for="o in DH_GROUP_OPTIONS" :key="optionValue(o)" :value="optionValue(o)">{{ optionLabel(o) }}</option></select>
          <select class="form-control" v-model="p.prf" title="伪随机函数，默认 prfsha1"><option v-for="o in PRF_OPTIONS" :key="o" :value="o">{{ o }}</option></select>
          <ToolbarButton icon="delete" @click="removeIkeProposal(i)">删除</ToolbarButton>
        </div>
        <ToolbarButton icon="create" @click="addIkeProposal">添加提议</ToolbarButton>
      </DraggableModal>

      <DraggableModal v-model:visible="espModalVisible" title="ESP 组" width="700px" @confirm="saveEsp">
        <div class="form-row"><label class="form-label" title="ESP 组名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingEsp.name" :disabled="editingEsp._name" title="ESP 组名称" /></div>
        <div class="form-row"><label class="form-label" title="ESP 模式：tunnel（隧道模式）或 transport（传输模式）">模式</label><select class="form-control" v-model="editingEsp.mode" title="ESP 模式"><option v-for="o in ESP_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="ESP SA 生命周期，单位秒，范围 30-86400，默认 3600">生命周期</label><div style="flex:1;"><input class="form-control" type="number" min="30" max="86400" v-model="editingEsp.lifetime" placeholder="3600" title="ESP SA 生命周期（秒）" style="width:100%;" /><div class="form-hint">范围：30-86400，默认 3600</div></div></div>
        <div class="form-row"><label class="form-label" title="完美前向保密（PFS）：enable 或 disable">PFS</label><select class="form-control" v-model="editingEsp.pfs" title="完美前向保密"><option v-for="o in PFS_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="是否启用 IPsec 压缩：enable 或 disable">压缩</label><select class="form-control" v-model="editingEsp.compression" title="IPsec 压缩"><option v-for="o in COMPRESSION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="ESP 生命周期（字节），范围 1024-26843545600000">生命周期（字节）</label><div style="flex:1;"><input class="form-control" type="number" min="1024" max="26843545600000" v-model="editingEsp.life_bytes" title="ESP 生命周期（字节）" style="width:100%;" /><div class="form-hint">范围：1024-26843545600000</div></div></div>
        <div class="form-row"><label class="form-label" title="ESP 生命周期（包数），范围 1000-26843545600000">生命周期（包数）</label><div style="flex:1;"><input class="form-control" type="number" min="1000" max="26843545600000" v-model="editingEsp.life_packets" title="ESP 生命周期（包数）" style="width:100%;" /><div class="form-hint">范围：1000-26843545600000</div></div></div>
        <div style="font-weight:bold;margin:12px 0 8px;">提议</div>
        <div style="display:grid;grid-template-columns:70px 180px 150px auto;gap:8px;align-items:end;margin-bottom:4px;">
          <div style="font-size:12px;color:#666;">编号</div>
          <div style="font-size:12px;color:#666;">加密</div>
          <div style="font-size:12px;color:#666;">哈希</div>
        </div>
        <div v-for="(p, i) in editingEsp.proposals" :key="i" style="display:grid;grid-template-columns:70px 180px 150px auto;gap:8px;align-items:start;">
          <input class="form-control" v-model="p.number" placeholder="编号" title="提议编号" />
          <select class="form-control" v-model="p.encryption" title="加密算法，默认 aes128"><option v-for="o in ENCRYPTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select>
          <select class="form-control" v-model="p.hash" title="哈希算法，默认 sha1"><option v-for="o in HASH_OPTIONS" :key="o" :value="o">{{ o }}</option></select>
          <ToolbarButton icon="delete" @click="removeEspProposal(i)">删除</ToolbarButton>
        </div>
        <ToolbarButton icon="create" @click="addEspProposal">添加提议</ToolbarButton>
      </DraggableModal>

      <DraggableModal v-model:visible="pskModalVisible" title="PSK 认证" width="600px" @confirm="savePsk">
        <div class="form-row"><label class="form-label" title="PSK 名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingPsk.name" :disabled="editingPsk._name" title="PSK 名称" /></div>
        <div class="form-row"><label class="form-label" title="IKE 身份标识，每行一个（如 IP 地址、FQDN、email）">ID（每行一个）</label><textarea class="form-control" v-model="editingPsk.ids" title="IKE 身份标识" /></div>
        <div class="form-row"><label class="form-label" title="预共享密钥，用于 IKE 认证">密钥</label><input class="form-control" type="password" v-model="editingPsk.secret" title="预共享密钥" /></div>
        <div class="form-row"><label class="form-label" title="通过 DHCP 获取地址的接口，多个用逗号分隔">DHCP 接口</label><input class="form-control" v-model="editingPsk.dhcp_interface" placeholder="多个用逗号分隔" title="DHCP 接口" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="profileModalVisible" title="Profile" width="600px" @confirm="saveProfile">
        <div class="form-row"><label class="form-label" title="Profile 名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingProfile.name" :disabled="editingProfile._name" title="Profile 名称" /></div>
        <div class="form-row"><label class="form-label" title="引用的 IKE 组名称">IKE 组</label><select class="form-control" v-model="editingProfile.ike_group" title="IKE 组名称"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="引用的 ESP 组名称">ESP 组</label><select class="form-control" v-model="editingProfile.esp_group" title="ESP 组名称"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="认证模式：pre-shared-secret、x509 或 rsa">认证模式</label><select class="form-control" v-model="editingProfile.authentication_mode" title="认证模式"><option v-for="o in AUTH_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="pre-shared-secret 模式下的预共享密钥">预共享密钥</label><input class="form-control" type="password" v-model="editingProfile.pre_shared_secret" title="预共享密钥" /></div>
        <div class="form-row"><label class="form-label" title="绑定的隧道接口名称，每行一个">绑定隧道（每行一个）</label><textarea class="form-control" v-model="editingProfile.bind_tunnels" title="绑定隧道接口" /></div>
        <div class="form-row"><label class="form-label" title="禁用该 Profile">禁用</label><input type="checkbox" v-model="editingProfile.disable" title="禁用 Profile" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="s2sModalVisible" title="站点互联 Peer" width="760px" @confirm="saveS2s">
        <div class="form-row"><label class="form-label" title="站点互联 Peer 名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingS2s.name" :disabled="editingS2s._name" title="Peer 名称" /></div>
        <div class="form-row"><label class="form-label" title="远端网关地址，每行一个（IPv4/IPv6 地址或网段）">远端地址（每行一个）</label><textarea class="form-control" v-model="editingS2s.remote_address" placeholder="IPv4/IPv6 地址" title="远端网关地址" /></div>
        <div class="form-row"><label class="form-label" title="本地网关地址（IPv4/IPv6 地址）">本地地址</label><input class="form-control" v-model="editingS2s.local_address" placeholder="IPv4/IPv6 地址" title="本地网关地址" /></div>
        <div class="form-row"><label class="form-label" title="连接类型：initiator（发起方）、responder（响应方）或 response-only">连接类型</label><select class="form-control" v-model="editingS2s.connection_type" title="连接类型"><option v-for="o in CONNECTION_TYPE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="引用的 IKE 组名称">IKE 组</label><select class="form-control" v-model="editingS2s.ike_group" title="IKE 组名称"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="默认引用的 ESP 组名称">默认 ESP 组</label><select class="form-control" v-model="editingS2s.default_esp_group" title="默认 ESP 组名称"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="该 Peer 的描述信息">描述</label><input class="form-control" v-model="editingS2s.description" title="描述" /></div>
        <div class="form-row"><label class="form-label" title="通过 DHCP 获取地址的接口，如 eth0">DHCP 接口</label><input class="form-control" v-model="editingS2s.dhcp_interface" placeholder="如 eth0" title="DHCP 接口" /></div>
        <div class="form-row"><label class="form-label" title="抗重放窗口大小，范围 0-1024，默认 32">Replay window</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="1024" v-model="editingS2s.replay_window" placeholder="32" title="Replay window" style="width:100%;" /><div class="form-hint">范围：0-1024，默认 32</div></div></div>
        <div class="form-row"><label class="form-label" title="虚拟地址，每行一个（IPv4/IPv6 地址或网段）">虚拟地址（每行一个）</label><textarea class="form-control" v-model="editingS2s.virtual_address" title="虚拟地址" /></div>
        <div class="form-row"><label class="form-label" title="VTI 隧道绑定接口，如 vti0">VTI 绑定接口</label><input class="form-control" v-model="editingS2s.vti_bind" title="VTI 绑定接口" /></div>
        <div class="form-row"><label class="form-label" title="VTI 使用的 ESP 组名称">VTI ESP 组</label><select class="form-control" v-model="editingS2s.vti_esp_group" title="VTI ESP 组"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="认证模式：pre-shared-secret、x509 或 rsa">认证模式</label><select class="form-control" v-model="editingS2s.auth_mode" title="认证模式"><option v-for="o in AUTH_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="本地 IKE 身份标识">本地 ID</label><input class="form-control" v-model="editingS2s.auth_local_id" title="本地 ID" /></div>
        <div class="form-row"><label class="form-label" title="远端 IKE 身份标识">远端 ID</label><input class="form-control" v-model="editingS2s.auth_remote_id" title="远端 ID" /></div>
        <div class="form-row"><label class="form-label" title="x509 认证时使用证书中的 ID">使用 X509 ID</label><input type="checkbox" v-model="editingS2s.auth_use_x509_id" title="使用 X509 ID" /></div>
        <div class="form-row"><label class="form-label" title="强制使用 UDP 封装（NAT-T）">强制 UDP 封装</label><input type="checkbox" v-model="editingS2s.force_udp_encapsulation" title="强制 UDP 封装" /></div>
        <div class="form-row"><label class="form-label" title="禁用该 Peer">禁用</label><input type="checkbox" v-model="editingS2s.disable" title="禁用 Peer" /></div>
        <div class="form-row"><label class="form-label" title="启用 IKEv2 重新认证">IKEv2 重新认证</label><input type="checkbox" v-model="editingS2s.ikev2_reauth" title="IKEv2 重新认证" /></div>
        <div style="font-weight:bold;margin:12px 0 8px;">隧道</div>
        <div v-for="(t, i) in editingS2s.tunnels" :key="i" style="border:1px solid var(--color-border);border-radius:4px;padding:12px;margin-bottom:12px;background:#fafafa;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">编号</div>
              <input class="form-control" type="number" min="0" max="4294967295" v-model="t.number" placeholder="0-4294967295" title="隧道编号，范围 0-4294967295" style="width:100%;" />
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">ESP 组</div>
              <select class="form-control" v-model="t.esp_group" title="隧道 ESP 组" style="width:100%;"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select>
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">优先级</div>
              <input class="form-control" type="number" min="1" max="100" v-model="t.priority" placeholder="1-100" title="隧道优先级，范围 1-100，数值越小越优先" style="width:100%;" />
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">协议</div>
              <select class="form-control" v-model="t.protocol" title="协议名称" style="width:100%;"><option v-for="o in protocolOptions" :key="o" :value="o">{{ o }}</option></select>
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">本地端口</div>
              <input class="form-control" type="number" min="1" max="65535" v-model="t.local_port" placeholder="1-65535" title="本地端口，范围 1-65535" style="width:100%;" />
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">远端端口</div>
              <input class="form-control" type="number" min="1" max="65535" v-model="t.remote_port" placeholder="1-65535" title="远端端口，范围 1-65535" style="width:100%;" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">本地前缀（每行一个）</div>
              <textarea class="form-control" v-model="t.local_prefix" placeholder="IPv4/IPv6 网段" title="本地子网前缀" rows="2" style="width:100%;" />
            </div>
            <div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">远端前缀（每行一个）</div>
              <textarea class="form-control" v-model="t.remote_prefix" placeholder="IPv4/IPv6 网段" title="远端子网前缀" rows="2" style="width:100%;" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:12px;">
            <label style="white-space:nowrap;" title="禁用该隧道"><input type="checkbox" v-model="t.disable" /> 禁用</label>
            <ToolbarButton icon="delete" @click="removeS2sTunnel(i)">删除隧道</ToolbarButton>
          </div>
        </div>
        <ToolbarButton icon="create" @click="addS2sTunnel">添加隧道</ToolbarButton>
      </DraggableModal>

      <DraggableModal v-model:visible="raModalVisible" title="远程接入连接" width="650px" @confirm="saveRa">
        <div class="form-row"><label class="form-label" title="远程接入连接名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingRa.name" :disabled="editingRa._name" title="连接名称" /></div>
        <div class="form-row"><label class="form-label" title="引用的 IKE 组名称">IKE 组</label><select class="form-control" v-model="editingRa.ike_group" title="IKE 组名称"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="引用的 ESP 组名称">ESP 组</label><select class="form-control" v-model="editingRa.esp_group" title="ESP 组名称"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" title="本地监听地址（IPv4/IPv6 地址）">本地地址</label><input class="form-control" v-model="editingRa.local_address" placeholder="IPv4/IPv6 地址" title="本地监听地址" /></div>
        <div class="form-row"><label class="form-label" title="本地保护前缀，每行一个（IPv4/IPv6 网段）">本地前缀（每行一个）</label><textarea class="form-control" v-model="editingRa.local_prefix" placeholder="IPv4/IPv6 网段" title="本地保护前缀" /></div>
        <div class="form-row"><label class="form-label" title="本地监听端口，范围 1-65535">本地端口</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="65535" v-model="editingRa.local_port" title="本地监听端口" style="width:100%;" /><div class="form-hint">范围：1-65535</div></div></div>
        <div class="form-row"><label class="form-label" title="选择已创建的地址池名称（按住 Ctrl 多选）">地址池</label><select class="form-control" v-model="editingRa.pool" multiple title="选择已创建的地址池名称" style="min-height:80px;"><option value=""></option><option v-for="p in remoteAccessPools" :key="p.name" :value="p.name">{{ p.name }} ({{ p.prefix }})</option></select></div>
        <div class="form-row"><label class="form-label" title="该连接的描述信息">描述</label><input class="form-control" v-model="editingRa.description" title="描述" /></div>
        <div class="form-row"><label class="form-label" title="通过 DHCP 获取地址的接口，如 eth0">DHCP 接口</label><input class="form-control" v-model="editingRa.dhcp_interface" placeholder="如 eth0" title="DHCP 接口" /></div>
        <div class="form-row"><label class="form-label" title="抗重放窗口大小，范围 0-1024，默认 32">Replay window</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="1024" v-model="editingRa.replay_window" placeholder="32" title="Replay window" style="width:100%;" /><div class="form-hint">范围：0-1024，默认 32</div></div></div>
        <div class="form-row"><label class="form-label" title="连接超时时间，单位秒，范围 1-86400，默认 28800">超时</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="86400" v-model="editingRa.timeout" placeholder="28800" title="连接超时（秒）" style="width:100%;" /><div class="form-hint">范围：1-86400，默认 28800</div></div></div>
        <div class="form-row"><label class="form-label" title="IKE 唯一性策略：never/replace/no">唯一性策略</label><select class="form-control" v-model="editingRa.unique" title="唯一性策略"><option v-for="o in UNIQUE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div style="font-weight:bold;margin:12px 0 8px;">认证</div>
        <div class="form-row"><label class="form-label" title="服务器认证模式：x509 或 none">Server 模式</label><select class="form-control" v-model="editingRa.server_mode" title="服务器认证模式"><option v-for="o in SERVER_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="客户端认证模式：eap-mschapv2、eap-tls 或 eap-ttls">Client 模式</label><select class="form-control" v-model="editingRa.client_mode" title="客户端认证模式"><option v-for="o in CLIENT_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" title="EAP 身份标识">EAP ID</label><input class="form-control" v-model="editingRa.eap_id" title="EAP ID" /></div>
        <div class="form-row"><label class="form-label" title="EAP 等模式使用的预共享密钥">预共享密钥</label><input class="form-control" type="password" v-model="editingRa.pre_shared_secret" title="预共享密钥" /></div>
        <div class="form-row"><label class="form-label" title="本地 IKE 身份标识">本地 ID</label><input class="form-control" v-model="editingRa.auth_local_id" title="本地 ID" /></div>
        <div class="form-row"><label class="form-label" title="X509 CA 证书名称，每行一个">X509 CA 证书（每行一个）</label><textarea class="form-control" v-model="editingRa.x509_ca_certs" title="X509 CA 证书" /></div>
        <div class="form-row"><label class="form-label" title="X509 本地证书名称">X509 证书</label><input class="form-control" v-model="editingRa.x509_cert" title="X509 证书" /></div>
        <div class="form-row"><label class="form-label" title="X509 证书私钥密码">X509 密码</label><input class="form-control" type="password" v-model="editingRa.x509_passphrase" title="X509 密码" /></div>
        <div class="form-row"><label class="form-label" title="禁用该连接">禁用</label><input type="checkbox" v-model="editingRa.disable" title="禁用连接" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="raPoolModalVisible" title="远程接入地址池" width="600px" @confirm="saveRaPool">
        <div class="form-row"><label class="form-label" title="地址池名称，只能包含字母、数字、下划线和连字符">名称</label><input class="form-control" v-model="editingRaPool.name" :disabled="editingRaPool._name" title="地址池名称" /></div>
        <div class="form-row"><label class="form-label" title="地址池前缀，如 10.10.10.0/24">前缀</label><input class="form-control" v-model="editingRaPool.prefix" placeholder="如 10.10.10.0/24" title="地址池前缀" /></div>
        <div class="form-row"><label class="form-label" title="DNS 服务器地址，每行一个">DNS 服务器（每行一个）</label><textarea class="form-control" v-model="editingRaPool.name_servers" placeholder="每行一个 DNS 地址" title="DNS 服务器" /></div>
        <div class="form-row"><label class="form-label" title="从地址池中排除的前缀，每行一个">排除前缀（每行一个）</label><textarea class="form-control" v-model="editingRaPool.excludes" placeholder="每行一个排除前缀" title="排除前缀" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="raRadiusServerModalVisible" title="RADIUS 服务器" width="560px" @confirm="saveRaRadiusServer">
        <div class="form-row"><label class="form-label" title="RADIUS 服务器 IPv4 地址">服务器地址</label><input class="form-control" v-model="editingRaRadiusServer.ip" :disabled="editingRaRadiusServer._ip" placeholder="如 192.168.5.1" title="RADIUS 服务器地址" /></div>
        <div class="form-row"><label class="form-label" title="RADIUS 认证端口，默认 1812，范围 1-65535">端口</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="65535" v-model="editingRaRadiusServer.port" placeholder="1812" title="RADIUS 端口" style="width:100%;" /><div class="form-hint">范围：1-65535，默认 1812</div></div></div>
        <div class="form-row"><label class="form-label" title="RADIUS 共享密钥">共享密钥</label><input class="form-control" type="password" v-model="editingRaRadiusServer.key" title="共享密钥" /></div>
        <div class="form-row"><label class="form-label" title="禁用该 RADIUS 服务器">禁用</label><input type="checkbox" v-model="editingRaRadiusServer.disable" title="禁用" /></div>
        <div class="form-row"><label class="form-label" title="禁用 RADIUS 计费">禁用计费</label><input type="checkbox" v-model="editingRaRadiusServer.disable_accounting" title="禁用计费" /></div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
