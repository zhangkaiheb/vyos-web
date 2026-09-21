import { defineComponent, ref, computed, watch, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, firewallApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { useVisibilityStore } from '/src/stores/visibility.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { validateField, validIP, validIPOrSegment } from '/src/utils/validators.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const KEY_EXCHANGE_OPTIONS = ['ikev1', 'ikev2'];
const IKE_MODE_OPTIONS = ['main', 'aggressive'];
const CLOSE_ACTION_OPTIONS = ['none', 'trap', 'start'];
const DPD_ACTION_OPTIONS = ['trap', 'clear', 'restart'];
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
const ESP_MODE_OPTIONS = ['tunnel', 'transport'];
const PFS_OPTIONS = ['', 'enable', 'disable', 'dh-group1', 'dh-group2', 'dh-group5', 'dh-group14', 'dh-group15', 'dh-group16', 'dh-group17', 'dh-group18', 'dh-group19', 'dh-group20', 'dh-group21', 'dh-group22', 'dh-group23', 'dh-group24', 'dh-group25', 'dh-group26', 'dh-group27', 'dh-group28', 'dh-group29', 'dh-group30', 'dh-group31', 'dh-group32'];
const COMPRESSION_OPTIONS = ['', 'enable', 'disable'];
const AUTH_MODE_OPTIONS = ['', 'pre-shared-secret', 'x509', 'rsa'];
const LOG_LEVEL_OPTIONS = ['', '0', '1', '2'];
const LOG_SUBSYSTEM_OPTIONS = ['', 'dmn', 'mgr', 'ike', 'chd', 'job', 'cfg', 'knl', 'net', 'asn', 'enc', 'lib', 'esp', 'tls', 'tnc', 'imc', 'imv', 'pts', 'any'];
const CONNECTION_TYPE_OPTIONS = ['', 'initiate', 'respond', 'none'];
const UNIQUE_OPTIONS = ['', 'never', 'keep', 'replace'];
const SERVER_MODE_OPTIONS = ['', 'pre-shared-secret', 'x509'];
const CLIENT_MODE_OPTIONS = ['', 'x509', 'eap-tls', 'eap-mschapv2', 'eap-radius'];
const SECRET_TYPE_OPTIONS = ['plaintext', 'base64'];

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

function validateName(name, t) {
  if (!name || !String(name).trim()) return t('ipsec.validation.nameRequired');
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return t('ipsec.validation.namePattern');
  return '';
}

function validateInterface(name, t) {
  if (!name || !String(name).trim()) return '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(String(name))) return t('ipsec.validation.interfacePattern');
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
    dh_group: p.dh_group || p['dh-group'] || '',
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
    close_action: g.close_action || g['close-action'] || 'none',
    disable_mobike: g.disable_mobike !== undefined || g['disable-mobike'] !== undefined,
    ikev2_reauth: g.ikev2_reauth !== undefined || g['ikev2-reauth'] !== undefined,
    key_exchange: g.key_exchange || g['key-exchange'] || '',
    lifetime: g.lifetime || '28800',
    mode: g.mode || 'main',
    dpd_action: g.dead_peer_detection?.action || g['dead-peer-detection']?.action || '',
    dpd_interval: g.dead_peer_detection?.interval || g['dead-peer-detection']?.interval || '',
    dpd_timeout: g.dead_peer_detection?.timeout || g['dead-peer-detection']?.timeout || '',
    proposals: proposalToForm(g.proposal),
  }));
}

function espGroupToForm(groups = {}) {
  return Object.entries(groups).map(([name, g]) => ({
    _name: name,
    name,
    compression: g.compression || '',
    life_bytes: g.life_bytes || g['life-bytes'] || '',
    life_packets: g.life_packets || g['life-packets'] || '',
    lifetime: g.lifetime || '3600',
    mode: g.mode || '',
    pfs: g.pfs || '',
    proposals: proposalToForm(g.proposal),
  }));
}

function pskToForm(psks = {}) {
  return Object.entries(psks).map(([name, p]) => ({
    _name: name,
    name,
    dhcp_interface: toArray(p.dhcp_interface || p['dhcp-interface'])[0] || '',
    ids: toArray(p.id).join('\n'),
    secret: p.secret || '',
    secret_type: p.secret_type || p['secret-type'] || 'plaintext',
  }));
}

function profileToForm(profiles = {}) {
  return Object.entries(profiles).map(([name, p]) => ({
    _name: name,
    name,
    authentication_mode: p.authentication?.mode || '',
    pre_shared_secret: p.authentication?.pre_shared_secret || p.authentication?.['pre-shared-secret'] || '',
    bind_tunnels: toArray(p.bind?.tunnel).join('\n'),
    esp_group: p.esp_group || p['esp-group'] || '',
    ike_group: p.ike_group || p['ike-group'] || '',
    disable: p.disable !== undefined,
  }));
}

function optionsToForm(options = {}) {
  const retransmission = options.retransmission || {};
  return {
    disable_route_autoinstall: options.disable_route_autoinstall !== undefined || options['disable-route-autoinstall'] !== undefined,
    flexvpn: options.flexvpn !== undefined,
    virtual_ip: options.virtual_ip !== undefined || options['virtual-ip'] !== undefined,
    interface: options.interface || '',
    retransmission: {
      attempts: retransmission.attempts || '',
      base: retransmission.base || '',
      timeout: retransmission.timeout || '',
    },
  };
}

function logToForm(log = {}) {
  return {
    level: log.level || '',
    subsystems: toArray(log.subsystem).map(name => ({ name, selected: true })),
  };
}

function tunnelToForm(tunnels = {}) {
  return Object.entries(tunnels).map(([num, t]) => ({
    _num: num,
    number: num,
    disable: t.disable !== undefined,
    esp_group: t.esp_group || t['esp-group'] || '',
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
    connection_type: p.connection_type || p['connection-type'] || '',
    default_esp_group: p.default_esp_group || p['default-esp-group'] || '',
    description: p.description || '',
    dhcp_interface: toArray(p.dhcp_interface || p['dhcp-interface']).join(', '),
    disable: p.disable !== undefined,
    force_udp_encapsulation: p.force_udp_encapsulation !== undefined || p['force-udp-encapsulation'] !== undefined,
    ike_group: p.ike_group || p['ike-group'] || '',
    ikev2_reauth: p.ikev2_reauth !== undefined || p['ikev2-reauth'] !== undefined,
    local_address: p.local_address || p['local-address'] || '',
    remote_address: toArray(p.remote_address || p['remote-address']).join('\n'),
    replay_window: p.replay_window || p['replay-window'] || '',
    virtual_address: toArray(p.virtual_address || p['virtual-address']).join('\n'),
    vti_bind: p.vti?.bind || '',
    vti_esp_group: p.vti?.esp_group || p.vti?.['esp-group'] || '',
    vti_local_prefix: joinMembers(p.vti?.traffic_selector?.local?.prefix || p.vti?.['traffic-selector']?.local?.prefix),
    vti_remote_prefix: joinMembers(p.vti?.traffic_selector?.remote?.prefix || p.vti?.['traffic-selector']?.remote?.prefix),
    auth_mode: p.authentication?.mode || '',
    auth_local_id: p.authentication?.local_id || p.authentication?.['local-id'] || '',
    auth_remote_id: p.authentication?.remote_id || p.authentication?.['remote-id'] || '',
    auth_use_x509_id: p.authentication?.use_x509_id !== undefined || p.authentication?.['use-x509-id'] !== undefined,
    x509_ca_certs: toArray(p.authentication?.x509?.ca_certificate || p.authentication?.x509?.['ca-certificate']).join('\n'),
    x509_cert: p.authentication?.x509?.certificate || '',
    x509_passphrase: p.authentication?.x509?.passphrase || '',
    rsa_local_key: p.authentication?.rsa?.local_key || p.authentication?.rsa?.['local-key'] || '',
    rsa_remote_key: p.authentication?.rsa?.remote_key || p.authentication?.rsa?.['remote-key'] || '',
    rsa_passphrase: p.authentication?.rsa?.passphrase || '',
    tunnels: tunnelToForm(p.tunnel),
  }));
}

function raToForm(connections = {}) {
  return Object.entries(connections).map(([name, c]) => ({
    _name: name,
    name,
    description: c.description || '',
    dhcp_interface: toArray(c.dhcp_interface || c['dhcp-interface']).join(', '),
    disable: c.disable !== undefined,
    esp_group: c.esp_group || c['esp-group'] || '',
    ike_group: c.ike_group || c['ike-group'] || '',
    local_address: c.local_address || c['local-address'] || '',
    local_prefix: c.local?.prefix?.join('\n') || joinMembers(c.local?.prefix),
    local_port: c.local?.port || '',
    pool: toArray(c.pool),
    replay_window: c.replay_window || c['replay-window'] || '',
    timeout: c.timeout || '',
    unique: c.unique || '',
    server_mode: c.authentication?.server_mode || c.authentication?.['server-mode'] || '',
    client_mode: c.authentication?.client_mode || c.authentication?.['client-mode'] || '',
    eap_id: c.authentication?.eap_id || c.authentication?.['eap-id'] || '',
    pre_shared_secret: c.authentication?.pre_shared_secret || c.authentication?.['pre-shared-secret'] || '',
    auth_local_id: c.authentication?.local_id || c.authentication?.['local-id'] || '',
    x509_ca_certs: toArray(c.authentication?.x509?.ca_certificate || c.authentication?.x509?.['ca-certificate']).join('\n'),
    x509_cert: c.authentication?.x509?.certificate || '',
    x509_passphrase: c.authentication?.x509?.passphrase || '',
  }));
}

function raPoolToForm(pools = {}) {
  return Object.entries(pools).map(([name, p]) => ({
    _name: name,
    name,
    prefix: p.prefix || '',
    name_servers: toArray(p.name_server || p['name-server']).join('\n'),
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
    nas_identifier: radius.nas_identifier || radius['nas-identifier'] || '',
    timeout: radius.timeout || '2',
    servers: Object.entries(radius.server || {}).map(([ip, s]) => ({
      _ip: ip,
      ip,
      key: s.key || '',
      port: s.port || '1812',
      disable: s.disable !== undefined,
      disable_accounting: s.disable_accounting !== undefined || s['disable-accounting'] !== undefined,
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
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
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
    const availableInterfaces = ref([]);
    const vtiInterfaces = ref([]);
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
    const ikeModalTitle = ref('');
    const espModalVisible = ref(false);
    const espModalTitle = ref('');
    const pskModalVisible = ref(false);
    const pskModalTitle = ref('');
    const profileModalVisible = ref(false);
    const profileModalTitle = ref('');
    const s2sModalVisible = ref(false);
    const s2sModalTitle = ref('');
    const s2sModalTab = ref('peer');
    const raModalVisible = ref(false);
    const raModalTitle = ref('');
    const raPoolModalVisible = ref(false);
    const raRadiusServerModalVisible = ref(false);
    const ikeProposalModalVisible = ref(false);
    const ikeProposalModalTitle = ref('');
    const espProposalModalVisible = ref(false);
    const espProposalModalTitle = ref('');
    const tunnelModalVisible = ref(false);
    const tunnelModalTitle = ref('');

    const editingIke = ref(null);
    const editingEsp = ref(null);
    const editingPsk = ref(null);
    const editingProfile = ref(null);
    const editingS2s = ref(null);
    const editingRa = ref(null);
    const editingRaPool = ref(null);
    const editingRaRadiusServer = ref(null);
    const editingIkeProposal = ref(null);
    const editingEspProposal = ref(null);
    const editingTunnel = ref(null);

    // Delete modal refs
    const ikeDeleteModalVisible = ref(false);
    const pendingDeleteIkeNames = ref([]);
    const espDeleteModalVisible = ref(false);
    const pendingDeleteEspNames = ref([]);
    const pskDeleteModalVisible = ref(false);
    const pendingDeletePskNames = ref([]);
    const profileDeleteModalVisible = ref(false);
    const pendingDeleteProfileNames = ref([]);
    const s2sDeleteModalVisible = ref(false);
    const pendingDeleteS2sNames = ref([]);
    const raDeleteModalVisible = ref(false);
    const pendingDeleteRaNames = ref([]);
    const poolDeleteModalVisible = ref(false);
    const pendingDeletePoolNames = ref([]);
    const radiusDeleteModalVisible = ref(false);
    const pendingDeleteRadiusNames = ref([]);

    async function loadInterfaces() {
      try {
        const [ethernetRes, suggestionRes, vtiSuggestionRes] = await Promise.all([
          interfaceApi.ethernet().catch(() => ({ interfaces: [] })),
          configApi.suggestions('vpn ipsec options', 'interface').catch(() => ({ suggestions: [] })),
          configApi.suggestions('vpn ipsec site-to-site peer pn-example vti', 'bind').catch(() => ({ suggestions: [] })),
        ]);

        const ethernetList = (ethernetRes.interfaces || []).map(i => i.name).filter(Boolean);
        const suggestionList = (suggestionRes.suggestions || []).filter(Boolean);
        const merged = [...new Set([...ethernetList, ...suggestionList])].sort();
        availableInterfaces.value = merged;

        vtiInterfaces.value = (vtiSuggestionRes.suggestions || []).filter(Boolean).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
        availableInterfaces.value = [];
        vtiInterfaces.value = [];
      }
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const [res, protoRes] = await Promise.all([
          configApi.get('vpn ipsec', false),
          firewallApi.protocols().catch(() => ({ protocols: [] })),
        ]);
        const data = res.data || {};
        // Backend returns underscored keys (key_mangling), support both formats
        const ikeGroupData = data.ike_group || data['ike-group'];
        const espGroupData = data.esp_group || data['esp-group'];
        const authData = data.authentication || {};
        const siteToSiteData = data.site_to_site || data['site-to-site'];
        const remoteAccessData = data.remote_access || data['remote-access'];
        ikeGroups.value = ikeGroupToForm(ikeGroupData);
        espGroups.value = espGroupToForm(espGroupData);
        psks.value = pskToForm(authData.psk);
        interfaces.value = joinMembers(data.interface);
        disableUniqreqids.value = data.disable_uniqreqids !== undefined || data['disable-uniqreqids'] !== undefined;
        options.value = optionsToForm(data.options);
        logConfig.value = logToForm(data.log);
        profiles.value = profileToForm(data.profile);
        siteToSitePeers.value = s2sToForm(siteToSiteData?.peer);
        remoteAccessConns.value = raToForm(remoteAccessData?.connection);
        remoteAccessPools.value = raPoolToForm(remoteAccessData?.pool);
        remoteAccessDhcp.value = raDhcpToForm(remoteAccessData?.dhcp);
        remoteAccessRadius.value = raRadiusToForm(remoteAccessData?.radius);
        protocols.value = protoRes.protocols || [];
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    const visibilityStore = useVisibilityStore();
    onMounted(() => { visibilityStore.load(); });

    const tabs = computed(() => [
      { key: 'ike', title: t('ipsec.tabs.ike') },
      { key: 'esp', title: t('ipsec.tabs.esp') },
      { key: 'auth', title: t('ipsec.tabs.auth') },
      { key: 'interface', title: t('ipsec.tabs.interface') },
      { key: 'options', title: t('ipsec.tabs.options') },
      { key: 'log', title: t('ipsec.tabs.log') },
      { key: 'profile', title: t('ipsec.tabs.profile') },
      { key: 'site_to_site', title: t('ipsec.tabs.siteToSite') },
      { key: 'remote_access', title: t('ipsec.tabs.remoteAccess'), hidden: !visibilityStore.isVisible('ipsec-remote-access') },
    ].filter(tab => !tab.hidden));

    const raTabs = [
      { key: 'connection', title: t('ipsec.raTabs.connection') },
      { key: 'pool', title: t('ipsec.raTabs.pool') },
      { key: 'dhcp', title: t('ipsec.raTabs.dhcp') },
      { key: 'radius', title: t('ipsec.raTabs.radius') },
    ];

    const s2sModalTabs = computed(() => [
      { key: 'peer', title: t('ipsec.tabs.basic') },
      { key: 'authentication', title: t('ipsec.form.authentication') },
      { key: 'vti', title: 'VTI' },
      { key: 'tunnel', title: t('ipsec.form.tunnel') },
    ]);

    const ikeColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'key_exchange', title: t('ipsec.columns.keyExchange') },
      { key: 'mode', title: t('ipsec.columns.mode') },
      { key: 'lifetime', title: t('ipsec.columns.lifetime') },
      { key: 'close_action', title: t('ipsec.columns.closeAction') },
      { key: 'disable_mobike', title: t('ipsec.form.disableMobike') },
      { key: 'ikev2_reauth', title: t('ipsec.form.ikev2Reauth') },
      { key: 'proposals', title: t('ipsec.columns.proposals') },
    ];

    const espColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'mode', title: t('ipsec.columns.mode') },
      { key: 'lifetime', title: t('ipsec.columns.lifetime') },
      { key: 'pfs', title: t('ipsec.columns.pfs') },
      { key: 'compression', title: t('ipsec.columns.compression') },
      { key: 'proposals', title: t('ipsec.columns.proposals') },
    ];

    const pskColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'ids', title: t('ipsec.columns.id') },
      { key: 'dhcp_interface', title: t('ipsec.columns.dhcpInterface') },
      { key: 'secret_type', title: t('ipsec.columns.secretType') },
      { key: 'secret', title: t('ipsec.columns.secret') },
    ];

    const profileColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'ike_group', title: t('ipsec.columns.ikeGroup') },
      { key: 'esp_group', title: t('ipsec.columns.espGroup') },
      { key: 'authentication_mode', title: t('ipsec.columns.authMode') },
      { key: 'disable', title: t('ipsec.columns.disable') },
    ];

    const s2sColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'remote_address', title: t('ipsec.columns.remoteAddress') },
      { key: 'local_address', title: t('ipsec.columns.localAddress') },
      { key: 'ike_group', title: t('ipsec.columns.ikeGroup') },
      { key: 'default_esp_group', title: t('ipsec.columns.defaultEspGroup') },
      { key: 'connection_type', title: t('ipsec.columns.connectionType') },
      { key: 'disable', title: t('ipsec.columns.disable') },
    ];

    const raColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'ike_group', title: t('ipsec.columns.ikeGroup') },
      { key: 'esp_group', title: t('ipsec.columns.espGroup') },
      { key: 'local_address', title: t('ipsec.columns.localAddress') },
      { key: 'pool', title: t('ipsec.columns.pool') },
      { key: 'disable', title: t('ipsec.columns.disable') },
    ];

    const raPoolColumns = [
      { key: 'name', title: t('ipsec.columns.name') },
      { key: 'prefix', title: t('ipsec.columns.prefix') },
      { key: 'name_servers', title: t('ipsec.columns.dnsServers') },
      { key: 'excludes', title: t('ipsec.columns.excludes') },
    ];

    const raRadiusServerColumns = [
      { key: 'ip', title: t('ipsec.columns.serverAddress') },
      { key: 'port', title: t('ipsec.columns.port') },
      { key: 'key', title: t('ipsec.columns.sharedSecret') },
      { key: 'disable', title: t('ipsec.columns.disable') },
      { key: 'disable_accounting', title: t('ipsec.columns.disableAccounting') },
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

    const interfaceOptions = computed(() => {
      return availableInterfaces.value;
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
        key_exchange: 'ikev1',
        mode: 'main',
        lifetime: '28800',
        close_action: 'none',
        disable_mobike: false,
        ikev2_reauth: false,
        dpd_action: '',
        dpd_interval: '',
        dpd_timeout: '',
        proposals: [],
      };
      ikeModalTitle.value = t('ipsec.modals.createIkeGroup');
      ikeModalVisible.value = true;
    }

    function editIke() {
      if (!selectedIke.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = ikeGroups.value.find(r => r.name === selectedIke.value[0]);
      editingIke.value = JSON.parse(JSON.stringify(row));
      ikeModalTitle.value = t('ipsec.modals.editIkeGroup');
      ikeModalVisible.value = true;
    }

    async function removeIke() {
      if (!selectedIke.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteIkeNames.value = [...selectedIke.value];
      ikeDeleteModalVisible.value = true;
    }

    async function confirmRemoveIke() {
      ikeDeleteModalVisible.value = false;
      for (const name of pendingDeleteIkeNames.value) {
        await configStore.deleteConfig(`vpn ipsec ike-group ${name}`);
      }
      selectedIke.value = [];
      pendingDeleteIkeNames.value = [];
      await save();
    }

    function createEsp() {
      editingEsp.value = {
        mode: 'tunnel',
        lifetime: '',
        pfs: '',
        compression: '',
        life_bytes: '',
        life_packets: '',
        proposals: [],
      };
      espModalTitle.value = t('ipsec.modals.createEspGroup');
      espModalVisible.value = true;
    }

    function editEsp() {
      if (!selectedEsp.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = espGroups.value.find(r => r.name === selectedEsp.value[0]);
      editingEsp.value = JSON.parse(JSON.stringify(row));
      espModalTitle.value = t('ipsec.modals.editEspGroup');
      espModalVisible.value = true;
    }

    async function removeEsp() {
      if (!selectedEsp.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteEspNames.value = [...selectedEsp.value];
      espDeleteModalVisible.value = true;
    }

    async function confirmRemoveEsp() {
      espDeleteModalVisible.value = false;
      for (const name of pendingDeleteEspNames.value) {
        await configStore.deleteConfig(`vpn ipsec esp-group ${name}`);
      }
      selectedEsp.value = [];
      pendingDeleteEspNames.value = [];
      await save();
    }

    function createPsk() {
      editingPsk.value = {
        secret_type: 'plaintext',
        dhcp_interface: '',
      };
      pskModalTitle.value = t('ipsec.modals.createPsk');
      pskModalVisible.value = true;
    }

    function editPsk() {
      if (!selectedPsk.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = psks.value.find(r => r.name === selectedPsk.value[0]);
      editingPsk.value = JSON.parse(JSON.stringify(row));
      if (!editingPsk.value.secret_type) editingPsk.value.secret_type = 'plaintext';
      if (!editingPsk.value.dhcp_interface) editingPsk.value.dhcp_interface = '';
      pskModalTitle.value = t('ipsec.modals.editPsk');
      pskModalVisible.value = true;
    }

    async function removePsk() {
      if (!selectedPsk.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeletePskNames.value = [...selectedPsk.value];
      pskDeleteModalVisible.value = true;
    }

    async function confirmRemovePsk() {
      pskDeleteModalVisible.value = false;
      for (const name of pendingDeletePskNames.value) {
        await configStore.deleteConfig(`vpn ipsec authentication psk ${name}`);
      }
      selectedPsk.value = [];
      pendingDeletePskNames.value = [];
      await save();
    }

    function createProfile() {
      editingProfile.value = {};
      profileModalTitle.value = t('ipsec.modals.createProfile');
      profileModalVisible.value = true;
    }

    function editProfile() {
      if (!selectedProfile.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = profiles.value.find(r => r.name === selectedProfile.value[0]);
      editingProfile.value = JSON.parse(JSON.stringify(row));
      profileModalTitle.value = t('ipsec.modals.editProfile');
      profileModalVisible.value = true;
    }

    async function removeProfile() {
      if (!selectedProfile.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteProfileNames.value = [...selectedProfile.value];
      profileDeleteModalVisible.value = true;
    }

    async function confirmRemoveProfile() {
      profileDeleteModalVisible.value = false;
      for (const name of pendingDeleteProfileNames.value) {
        await configStore.deleteConfig(`vpn ipsec profile ${name}`);
      }
      selectedProfile.value = [];
      pendingDeleteProfileNames.value = [];
      await save();
    }

    function createS2s() {
      editingS2s.value = {
        connection_type: '',
        replay_window: '',
        vti_local_prefix: '',
        vti_remote_prefix: '',
        tunnels: [],
      };
      s2sModalTab.value = 'peer';
      s2sModalTitle.value = t('ipsec.modals.createS2sPeer');
      s2sModalVisible.value = true;
    }

    function editS2s() {
      if (!selectedS2s.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = siteToSitePeers.value.find(r => r.name === selectedS2s.value[0]);
      editingS2s.value = JSON.parse(JSON.stringify(row));
      s2sModalTab.value = 'peer';
      s2sModalTitle.value = t('ipsec.modals.editS2sPeer');
      s2sModalVisible.value = true;
    }

    async function removeS2s() {
      if (!selectedS2s.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteS2sNames.value = [...selectedS2s.value];
      s2sDeleteModalVisible.value = true;
    }

    async function confirmRemoveS2s() {
      s2sDeleteModalVisible.value = false;
      for (const name of pendingDeleteS2sNames.value) {
        await configStore.deleteConfig(`vpn ipsec site-to-site peer ${name}`);
      }
      selectedS2s.value = [];
      pendingDeleteS2sNames.value = [];
      await save();
    }

    function createRa() {
      editingRa.value = {
        replay_window: '',
        timeout: '',
        unique: '',
        server_mode: '',
        client_mode: '',
        pool: [],
      };
      raModalTitle.value = t('ipsec.modals.createRaConnection');
      raModalVisible.value = true;
    }

    function editRa() {
      if (!selectedRa.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = remoteAccessConns.value.find(r => r.name === selectedRa.value[0]);
      editingRa.value = JSON.parse(JSON.stringify(row));
      raModalTitle.value = t('ipsec.modals.editRaConnection');
      raModalVisible.value = true;
    }

    async function removeRa() {
      if (!selectedRa.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteRaNames.value = [...selectedRa.value];
      raDeleteModalVisible.value = true;
    }

    async function confirmRemoveRa() {
      raDeleteModalVisible.value = false;
      for (const name of pendingDeleteRaNames.value) {
        await configStore.deleteConfig(`vpn ipsec remote-access connection ${name}`);
      }
      selectedRa.value = [];
      pendingDeleteRaNames.value = [];
      await save();
    }

    function createRaPool() {
      editingRaPool.value = {};
      raPoolModalVisible.value = true;
    }

    function editRaPool() {
      if (!selectedRaPool.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = remoteAccessPools.value.find(r => r.name === selectedRaPool.value[0]);
      editingRaPool.value = JSON.parse(JSON.stringify(row));
      raPoolModalVisible.value = true;
    }

    async function removeRaPool() {
      if (!selectedRaPool.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeletePoolNames.value = [...selectedRaPool.value];
      poolDeleteModalVisible.value = true;
    }

    async function confirmRemoveRaPool() {
      poolDeleteModalVisible.value = false;
      for (const name of pendingDeletePoolNames.value) {
        await configStore.deleteConfig(`vpn ipsec remote-access pool ${name}`);
      }
      selectedRaPool.value = [];
      pendingDeletePoolNames.value = [];
      await save();
    }

    async function saveRaPool() {
      const item = editingRaPool.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      if (!item.prefix) return showError({ message: t('ipsec.validation.poolPrefixRequired') });
      const prefixErr = validateField(item.prefix, { validate: 'ip-segment' });
      if (prefixErr) return showError({ message: t('ipsec.validation.poolPrefix') + prefixErr });
      const value = {};
      value.prefix = String(item.prefix);
      const nameServers = splitMembers(item.name_servers);
      for (const ns of nameServers) {
        const nsErr = validateField(ns, { validate: 'ip' });
        if (nsErr) return showError({ message: t('ipsec.validation.dnsServer') + ns + t('ipsec.validation.colon') + nsErr });
      }
      if (nameServers.length) value['name-server'] = nameServers;
      const excludes = splitMembers(item.excludes);
      for (const ex of excludes) {
        const exErr = validateField(ex, { validate: 'ip-segment' });
        if (exErr) return showError({ message: t('ipsec.validation.excludePrefix') + ex + t('ipsec.validation.colon') + exErr });
      }
      if (excludes.length) value.exclude = excludes;
      await configStore.setConfig(`vpn ipsec remote-access pool ${item.name}`, value);
      raPoolModalVisible.value = false;
      await save();
    }

    async function saveRaDhcp() {
      const item = remoteAccessDhcp.value;
      const value = {};
      if (isPresent(item.server)) {
        const serverErr = validateField(item.server, { validate: 'ip' });
        if (serverErr) return showError({ message: t('ipsec.validation.dhcpServer') + serverErr });
        value.server = String(item.server);
      }
      if (isPresent(item.interface)) {
        const ifErr = validateInterface(item.interface, t);
        if (ifErr) return showError({ message: t('ipsec.validation.dhcpInterface') + ifErr });
        value.interface = String(item.interface).trim();
      }
      if (Object.keys(value).length) {
        await configStore.setConfig('vpn ipsec remote-access dhcp', value);
      } else {
        try { await configStore.deleteConfig('vpn ipsec remote-access dhcp'); } catch (_) {}
      }
      await save();
    }

    function createRaRadiusServer() {
      editingRaRadiusServer.value = { port: '1812' };
      raRadiusServerModalVisible.value = true;
    }

    function editRaRadiusServer() {
      if (!selectedRaRadiusServer.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      const row = remoteAccessRadius.value.servers.find(r => r.ip === selectedRaRadiusServer.value[0]);
      editingRaRadiusServer.value = JSON.parse(JSON.stringify(row));
      raRadiusServerModalVisible.value = true;
    }

    async function removeRaRadiusServer() {
      if (!selectedRaRadiusServer.value.length) return showError({ message: t('ipsec.messages.selectRow') });
      pendingDeleteRadiusNames.value = [...selectedRaRadiusServer.value];
      radiusDeleteModalVisible.value = true;
    }

    async function confirmRemoveRaRadiusServer() {
      radiusDeleteModalVisible.value = false;
      for (const ip of pendingDeleteRadiusNames.value) {
        await configStore.deleteConfig(`vpn ipsec remote-access radius server ${ip}`);
      }
      selectedRaRadiusServer.value = [];
      pendingDeleteRadiusNames.value = [];
      await save();
    }

    async function saveRaRadiusServer() {
      const item = editingRaRadiusServer.value;
      if (!item.ip) return showError({ message: t('ipsec.validation.radiusServerRequired') });
      const ipErr = validateField(item.ip, { validate: 'ip' });
      if (ipErr) return showError({ message: t('ipsec.validation.radiusServer') + ipErr });
      if (isPresent(item.port) && !inRange(item.port, 1, 65535)) return showError({ message: t('ipsec.validation.radiusPortRange') });
      const value = {};
      if (isPresent(item.key)) value.key = String(item.key);
      if (isPresent(item.port)) value.port = String(item.port);
      if (item.disable) value.disable = '';
      if (item.disable_accounting) value['disable-accounting'] = '';
      await configStore.setConfig(`vpn ipsec remote-access radius server ${item.ip}`, value);
      raRadiusServerModalVisible.value = false;
      await save();
    }

    async function saveRaRadius() {
      const item = remoteAccessRadius.value;
      const value = {};
      if (isPresent(item.nas_identifier)) value['nas-identifier'] = String(item.nas_identifier);
      if (isPresent(item.timeout) && !inRange(item.timeout, 1, 240)) return showError({ message: t('ipsec.validation.radiusTimeoutRange') });
      if (isPresent(item.timeout)) value.timeout = String(item.timeout);
      const servers = raRadiusServerToConfig(item.servers || []);
      if (Object.keys(servers).length) value.server = servers;
      if (Object.keys(value).length) {
        await configStore.setConfig('vpn ipsec remote-access radius', value);
      } else {
        try { await configStore.deleteConfig('vpn ipsec remote-access radius'); } catch (_) {}
      }
      await save();
    }

    async function saveIke() {
      const item = editingIke.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      if (isPresent(item.lifetime) && !inRange(item.lifetime, 0, 86400)) return showError({ message: t('ipsec.validation.ikeLifetimeRange') });
      if (isPresent(item.dpd_interval) && !inRange(item.dpd_interval, 2, 86400)) return showError({ message: t('ipsec.validation.dpdIntervalRange') });
      if (isPresent(item.dpd_timeout) && !inRange(item.dpd_timeout, 2, 86400)) return showError({ message: t('ipsec.validation.dpdTimeoutRange') });
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
      await configStore.setConfig(`vpn ipsec ike-group ${item.name}`, value);
      ikeModalVisible.value = false;
      await save();
    }

    async function saveEsp() {
      const item = editingEsp.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      if (isPresent(item.lifetime) && !inRange(item.lifetime, 30, 86400)) return showError({ message: t('ipsec.validation.espLifetimeRange') });
      if (isPresent(item.life_bytes) && !inRange(item.life_bytes, 1024, 26843545600000)) return showError({ message: t('ipsec.validation.espLifeBytesRange') });
      if (isPresent(item.life_packets) && !inRange(item.life_packets, 1000, 26843545600000)) return showError({ message: t('ipsec.validation.espLifePacketsRange') });
      const value = {};
      if (item.compression === 'enable') value.compression = '';
      if (isPresent(item.life_bytes)) value['life-bytes'] = String(item.life_bytes);
      if (isPresent(item.life_packets)) value['life-packets'] = String(item.life_packets);
      if (isPresent(item.lifetime)) value.lifetime = String(item.lifetime);
      if (isPresent(item.mode)) value.mode = String(item.mode);
      if (isPresent(item.pfs)) value.pfs = String(item.pfs);
      const proposals = proposalToConfig(item.proposals || []);
      if (Object.keys(proposals).length) value.proposal = proposals;
      await configStore.setConfig(`vpn ipsec esp-group ${item.name}`, value);
      espModalVisible.value = false;
      await save();
    }

    async function savePsk() {
      const item = editingPsk.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      if (!item.secret) return showError({ message: t('ipsec.validation.secretRequired') });
      const value = {};
      const ids = splitMembers(item.ids);
      if (ids.length) value.id = ids;
      if (isPresent(item.secret)) value.secret = String(item.secret);
      if (isPresent(item.secret_type)) value['secret-type'] = String(item.secret_type);
      if (isPresent(item.dhcp_interface)) {
        const dhcp = String(item.dhcp_interface).trim();
        const dhcpErr = validateInterface(dhcp, t);
        if (dhcpErr) return showError({ message: t('ipsec.validation.dhcpInterface') + dhcp + t('ipsec.validation.colon') + dhcpErr });
        value['dhcp-interface'] = [dhcp];
      }
      await configStore.setConfig(`vpn ipsec authentication psk ${item.name}`, value);
      pskModalVisible.value = false;
      await save();
    }

    async function saveProfile() {
      const item = editingProfile.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
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
      await configStore.setConfig(`vpn ipsec profile ${item.name}`, value);
      profileModalVisible.value = false;
      await save();
    }

    async function saveS2s() {
      const item = editingS2s.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      const remoteAddrs = splitMembers(item.remote_address);
      if (!remoteAddrs.length) return showError({ message: t('ipsec.validation.remoteAddressRequired') });
      const remoteErr = validateLines(item.remote_address, 'ip-segment');
      if (remoteErr) return showError({ message: t('ipsec.validation.remoteAddress') + remoteErr });
      if (isPresent(item.local_address)) {
        const localErr = validateField(item.local_address, { validate: 'ip' });
        if (localErr) return showError({ message: t('ipsec.validation.localAddress') + localErr });
      }
      if (isPresent(item.replay_window) && !inRange(item.replay_window, 0, 1024)) return showError({ message: t('ipsec.validation.replayWindowRange') });
      const value = {};
      if (isPresent(item.connection_type)) value['connection-type'] = String(item.connection_type);
      if (isPresent(item.default_esp_group)) value['default-esp-group'] = String(item.default_esp_group);
      if (isPresent(item.description)) value.description = String(item.description);
      if (isPresent(item.dhcp_interface)) {
        const dhcpIfErr = validateInterface(item.dhcp_interface, t);
        if (dhcpIfErr) return showError({ message: t('ipsec.validation.dhcpInterface') + dhcpIfErr });
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
        if (virtErr) return showError({ message: t('ipsec.validation.virtualAddress') + virtErr });
        value['virtual-address'] = virtualAddrs;
      }
      const vti = {};
      if (isPresent(item.vti_bind)) {
        const vtiErr = validateInterface(item.vti_bind, t);
        if (vtiErr) return showError({ message: t('ipsec.validation.vtiBindInterface') + vtiErr });
        vti.bind = String(item.vti_bind);
      }
      if (isPresent(item.vti_esp_group)) vti['esp-group'] = String(item.vti_esp_group);
      const vtiLocalPrefix = splitMembers(item.vti_local_prefix);
      const vtiRemotePrefix = splitMembers(item.vti_remote_prefix);
      if (vtiLocalPrefix.length || vtiRemotePrefix.length) {
        vti['traffic-selector'] = {};
        if (vtiLocalPrefix.length) vti['traffic-selector'].local = { prefix: vtiLocalPrefix };
        if (vtiRemotePrefix.length) vti['traffic-selector'].remote = { prefix: vtiRemotePrefix };
      }
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
        for (const tunnel of item.tunnels) {
          if (!tunnel.number) continue;
          if (!inRange(tunnel.number, 0, 4294967295)) return showError({ message: t('ipsec.validation.tunnelNumberRange') + tunnel.number + t('ipsec.validation.tunnelNumberRangeSuffix') });
          if (isPresent(tunnel.priority) && !inRange(tunnel.priority, 1, 100)) return showError({ message: t('ipsec.validation.tunnelPriorityRange') + tunnel.number + t('ipsec.validation.tunnelPriorityRangeSuffix') });
          if (isPresent(tunnel.local_port)) {
            const portErr = validateField(tunnel.local_port, { validate: 'port-single' });
            if (portErr) return showError({ message: t('ipsec.validation.tunnelLocalPort') + tunnel.number + t('ipsec.validation.colon') + portErr });
          }
          if (isPresent(tunnel.remote_port)) {
            const portErr = validateField(tunnel.remote_port, { validate: 'port-single' });
            if (portErr) return showError({ message: t('ipsec.validation.tunnelRemotePort') + tunnel.number + t('ipsec.validation.colon') + portErr });
          }
          if (isPresent(tunnel.local_prefix)) {
            const err = validateLines(tunnel.local_prefix, 'ip-segment');
            if (err) return showError({ message: t('ipsec.validation.tunnelLocalPrefix') + tunnel.number + t('ipsec.validation.colon') + err });
          }
          if (isPresent(tunnel.remote_prefix)) {
            const err = validateLines(tunnel.remote_prefix, 'ip-segment');
            if (err) return showError({ message: t('ipsec.validation.tunnelRemotePrefix') + tunnel.number + t('ipsec.validation.colon') + err });
          }
        }
        value.tunnel = tunnels;
      }
      await configStore.setConfig(`vpn ipsec site-to-site peer ${item.name}`, value);
      s2sModalVisible.value = false;
      await save();
    }

    async function saveRa() {
      const item = editingRa.value;
      const nameErr = validateName(item.name, t);
      if (nameErr) return showError({ message: nameErr });
      if (isPresent(item.replay_window) && !inRange(item.replay_window, 0, 1024)) return showError({ message: t('ipsec.validation.replayWindowRange') });
      if (isPresent(item.timeout) && !inRange(item.timeout, 1, 86400)) return showError({ message: t('ipsec.validation.timeoutRange') });
      if (isPresent(item.local_address)) {
        const localErr = validateField(item.local_address, { validate: 'ip' });
        if (localErr) return showError({ message: t('ipsec.validation.localAddress') + localErr });
      }
      const localPrefix = splitMembers(item.local_prefix);
      if (localPrefix.length) {
        const prefixErr = validateLines(item.local_prefix, 'ip-segment');
        if (prefixErr) return showError({ message: t('ipsec.validation.localPrefix') + prefixErr });
      }
      if (isPresent(item.local_port)) {
        const portErr = validateField(item.local_port, { validate: 'port-single' });
        if (portErr) return showError({ message: t('ipsec.validation.localPort') + portErr });
      }
      const value = {};
      if (isPresent(item.description)) value.description = String(item.description);
      if (isPresent(item.dhcp_interface)) {
        const dhcpIfErr = validateInterface(item.dhcp_interface, t);
        if (dhcpIfErr) return showError({ message: t('ipsec.validation.dhcpInterface') + dhcpIfErr });
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
        const nameErr = validateName(p, t);
        if (nameErr) return showError({ message: t('ipsec.validation.poolName') + p + t('ipsec.validation.colon') + nameErr });
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
      await configStore.setConfig(`vpn ipsec remote-access connection ${item.name}`, value);
      raModalVisible.value = false;
      await save();
    }

    async function save() {
      saving.value = true;
      saved.value = false;
      try {
        const ifaceList = splitMembers(interfaces.value);
        for (const iface of ifaceList) {
          const ifErr = validateInterface(iface, t);
          if (ifErr) return showError({ message: t('ipsec.validation.interface') + iface + t('ipsec.validation.colon') + ifErr });
        }
        if (ifaceList.length) {
          await configStore.setConfig('vpn ipsec interface', ifaceList);
        } else {
          try { await configStore.deleteConfig('vpn ipsec interface'); } catch (_) {}
        }

        const optIfErr = validateInterface(options.value.interface, t);
        if (optIfErr) return showError({ message: t('ipsec.validation.optionsInterface') + optIfErr });

        if (disableUniqreqids.value) {
          await configStore.setConfig('vpn ipsec disable-uniqreqids', '');
        } else {
          try { await configStore.deleteConfig('vpn ipsec disable-uniqreqids'); } catch (_) {}
        }

        const optValue = {};
        if (options.value.disable_route_autoinstall) optValue['disable-route-autoinstall'] = '';
        if (options.value.flexvpn) optValue.flexvpn = '';
        if (options.value.virtual_ip) optValue['virtual-ip'] = '';
        if (isPresent(options.value.interface)) optValue.interface = String(options.value.interface);

        const retransmissionValue = {};
        if (isPresent(options.value.retransmission?.attempts)) {
          const attempts = Number(options.value.retransmission.attempts);
          if (Number.isNaN(attempts) || attempts < 1 || attempts > 65535) return showError({ message: t('ipsec.validation.retransmissionAttemptsRange') });
          retransmissionValue.attempts = String(attempts);
        }
        if (isPresent(options.value.retransmission?.base)) {
          const base = Number(options.value.retransmission.base);
          if (Number.isNaN(base) || base < 1.0 || base > 5.0) return showError({ message: t('ipsec.validation.retransmissionBaseRange') });
          retransmissionValue.base = String(base);
        }
        if (isPresent(options.value.retransmission?.timeout)) {
          const timeout = Number(options.value.retransmission.timeout);
          if (Number.isNaN(timeout) || timeout < 1 || timeout > 1000) return showError({ message: t('ipsec.validation.retransmissionTimeoutRange') });
          retransmissionValue.timeout = String(timeout);
        }
        if (Object.keys(retransmissionValue).length) optValue.retransmission = retransmissionValue;

        if (Object.keys(optValue).length) {
          await configStore.setConfig('vpn ipsec options', optValue);
        } else {
          try { await configStore.deleteConfig('vpn ipsec options'); } catch (_) {}
        }

        const logValue = {};
        if (isPresent(logConfig.value.level)) logValue.level = String(logConfig.value.level);
        const subs = (logConfig.value.subsystems || []).filter(s => s && s.name).map(s => s.name);
        if (subs.length) logValue.subsystem = subs;
        if (Object.keys(logValue).length) {
          await configStore.setConfig('vpn ipsec log', logValue);
        } else {
          try { await configStore.deleteConfig('vpn ipsec log'); } catch (_) {}
        }

        configStore.markPending();
        await configStore.checkSessionChanged();
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

    function getDhGroupLabel(value) {
      if (!value) return '';
      const opt = DH_GROUP_OPTIONS.find(o => optionValue(o) === value);
      return opt ? optionLabel(opt) : value;
    }

    function openIkeProposalModal(index) {
      if (index === null) {
        editingIkeProposal.value = { number: '', dh_group: '', encryption: '', hash: '', prf: '', _new: true };
        ikeProposalModalTitle.value = t('ipsec.modals.createIkeProposal');
      } else {
        const p = editingIke.value.proposals[index];
        editingIkeProposal.value = { ...p, _index: index, _new: false };
        ikeProposalModalTitle.value = t('ipsec.modals.editIkeProposal');
      }
      ikeProposalModalVisible.value = true;
    }

    function saveIkeProposal() {
      const p = editingIkeProposal.value;
      if (!p) return;
      if (p._new) {
        if (!editingIke.value.proposals) editingIke.value.proposals = [];
        editingIke.value.proposals.push({ number: p.number, dh_group: p.dh_group, encryption: p.encryption, hash: p.hash, prf: p.prf });
      } else {
        editingIke.value.proposals[p._index] = { number: p.number, dh_group: p.dh_group, encryption: p.encryption, hash: p.hash, prf: p.prf };
      }
      ikeProposalModalVisible.value = false;
    }

    function openEspProposalModal(index) {
      if (index === null) {
        editingEspProposal.value = { number: '', encryption: '', hash: '', _new: true };
        espProposalModalTitle.value = t('ipsec.modals.createEspProposal');
      } else {
        const p = editingEsp.value.proposals[index];
        editingEspProposal.value = { ...p, _index: index, _new: false };
        espProposalModalTitle.value = t('ipsec.modals.editEspProposal');
      }
      espProposalModalVisible.value = true;
    }

    function saveEspProposal() {
      const p = editingEspProposal.value;
      if (!p) return;
      if (p._new) {
        if (!editingEsp.value.proposals) editingEsp.value.proposals = [];
        editingEsp.value.proposals.push({ number: p.number, encryption: p.encryption, hash: p.hash });
      } else {
        editingEsp.value.proposals[p._index] = { number: p.number, encryption: p.encryption, hash: p.hash };
      }
      espProposalModalVisible.value = false;
    }

    function deleteIkeProposals(indices) {
      if (!indices || !indices.length) return;
      const sorted = [...indices].sort((a, b) => b - a);
      for (const i of sorted) {
        editingIke.value.proposals.splice(i, 1);
      }
    }

    function deleteEspProposals(indices) {
      if (!indices || !indices.length) return;
      const sorted = [...indices].sort((a, b) => b - a);
      for (const i of sorted) {
        editingEsp.value.proposals.splice(i, 1);
      }
    }

    function openTunnelModal(index) {
      if (index === null) {
        editingTunnel.value = {
          number: '', esp_group: '', priority: '', protocol: '',
          local_port: '', remote_port: '', local_prefix: '', remote_prefix: '', disable: false,
          _new: true
        };
        tunnelModalTitle.value = t('ipsec.modals.createTunnel');
      } else {
        const tunnelRow = editingS2s.value.tunnels[index];
        editingTunnel.value = { ...tunnelRow, _index: index, _new: false };
        tunnelModalTitle.value = t('ipsec.modals.editTunnel');
      }
      tunnelModalVisible.value = true;
    }

    function saveTunnel() {
      const t = editingTunnel.value;
      if (!t) return;
      const data = {
        number: t.number, esp_group: t.esp_group, priority: t.priority,
        protocol: t.protocol, local_port: t.local_port, remote_port: t.remote_port,
        local_prefix: t.local_prefix, remote_prefix: t.remote_prefix, disable: t.disable
      };
      if (t._new) {
        if (!editingS2s.value.tunnels) editingS2s.value.tunnels = [];
        editingS2s.value.tunnels.push(data);
      } else {
        editingS2s.value.tunnels[t._index] = data;
      }
      tunnelModalVisible.value = false;
    }

    function deleteTunnels(indices) {
      if (!indices || !indices.length) return;
      const sorted = [...indices].sort((a, b) => b - a);
      for (const i of sorted) {
        editingS2s.value.tunnels.splice(i, 1);
      }
    }

    function addEspProposal() {
      if (!editingEsp.value.proposals) editingEsp.value.proposals = [];
      editingEsp.value.proposals.push({ number: '', encryption: '', hash: '' });
    }

    function removeEspProposal(index) {
      editingEsp.value.proposals.splice(index, 1);
    }

    function isSubsystemSelected(name) {
      return (logConfig.value.subsystems || []).some(s => s && s.name === name);
    }

    function toggleLogSubsystem(name, checked) {
      if (!logConfig.value.subsystems) logConfig.value.subsystems = [];
      const existing = logConfig.value.subsystems.find(s => s && s.name === name);
      if (checked) {
        if (!existing) logConfig.value.subsystems.push({ name, selected: true });
      } else if (existing) {
        logConfig.value.subsystems = logConfig.value.subsystems.filter(s => s && s.name !== name);
      }
    }

    function addS2sTunnel() {
      if (!editingS2s.value.tunnels) editingS2s.value.tunnels = [];
      editingS2s.value.tunnels.push({ number: '', disable: false, esp_group: '', priority: '', protocol: '', local_prefix: '', local_port: '', remote_prefix: '', remote_port: '' });
    }

    function removeS2sTunnel(index) {
      editingS2s.value.tunnels.splice(index, 1);
    }

    return {t,
      
      loading, saving, saved, activeTab, tabs, writeDisabled,
      raActiveTab, raTabs,
      ikeGroups, espGroups, psks, interfaces, availableInterfaces, vtiInterfaces, disableUniqreqids, options, logConfig, profiles,
      siteToSitePeers, protocols, protocolOptions, interfaceOptions, commandPath, remoteAccessConns, remoteAccessPools, remoteAccessDhcp, remoteAccessRadius,
      selectedIke, selectedEsp, selectedPsk, selectedProfile, selectedS2s, selectedRa,
      selectedRaPool, selectedRaRadiusServer,
      ikeModalVisible, ikeModalTitle, espModalVisible, espModalTitle,
      pskModalVisible, pskModalTitle, profileModalVisible, profileModalTitle,
      s2sModalVisible, s2sModalTitle, s2sModalTab, raModalVisible, raModalTitle, raPoolModalVisible, raRadiusServerModalVisible,
      ikeProposalModalVisible, ikeProposalModalTitle, espProposalModalVisible, espProposalModalTitle, tunnelModalVisible, tunnelModalTitle,
      ikeDeleteModalVisible, pendingDeleteIkeNames,
      espDeleteModalVisible, pendingDeleteEspNames,
      pskDeleteModalVisible, pendingDeletePskNames,
      profileDeleteModalVisible, pendingDeleteProfileNames,
      s2sDeleteModalVisible, pendingDeleteS2sNames,
      raDeleteModalVisible, pendingDeleteRaNames,
      poolDeleteModalVisible, pendingDeletePoolNames,
      radiusDeleteModalVisible, pendingDeleteRadiusNames,
      editingIke, editingEsp, editingPsk, editingProfile, editingS2s, editingRa,
      editingRaPool, editingRaRadiusServer, editingIkeProposal, editingEspProposal,
      editingTunnel,
      ikeColumns, espColumns, pskColumns, profileColumns, s2sColumns, raColumns,
      raPoolColumns, raRadiusServerColumns,
      load, save,
      createIke, editIke, removeIke, confirmRemoveIke, saveIke,
      createEsp, editEsp, removeEsp, confirmRemoveEsp, saveEsp,
      createPsk, editPsk, removePsk, confirmRemovePsk, savePsk,
      createProfile, editProfile, removeProfile, confirmRemoveProfile, saveProfile,
      createS2s, editS2s, removeS2s, confirmRemoveS2s, saveS2s,
      createRa, editRa, removeRa, confirmRemoveRa, saveRa,
      createRaPool, editRaPool, removeRaPool, confirmRemoveRaPool, saveRaPool,
      saveRaDhcp,
      createRaRadiusServer, editRaRadiusServer, removeRaRadiusServer, confirmRemoveRaRadiusServer, saveRaRadiusServer, saveRaRadius,
      addIkeProposal, removeIkeProposal, addEspProposal, removeEspProposal,
      openIkeProposalModal, saveIkeProposal, openEspProposalModal, saveEspProposal,
      deleteIkeProposals, deleteEspProposals, getDhGroupLabel,
      openTunnelModal, saveTunnel, deleteTunnels,
      isSubsystemSelected, toggleLogSubsystem, addS2sTunnel, removeS2sTunnel,
      formatProposals, formatLines, optionValue, optionLabel,
      KEY_EXCHANGE_OPTIONS, IKE_MODE_OPTIONS, CLOSE_ACTION_OPTIONS,
      DPD_ACTION_OPTIONS, DH_GROUP_OPTIONS, ENCRYPTION_OPTIONS, HASH_OPTIONS,
      PRF_OPTIONS, ESP_MODE_OPTIONS, PFS_OPTIONS, COMPRESSION_OPTIONS,
      AUTH_MODE_OPTIONS, LOG_LEVEL_OPTIONS, LOG_SUBSYSTEM_OPTIONS,
      CONNECTION_TYPE_OPTIONS, UNIQUE_OPTIONS, SERVER_MODE_OPTIONS, CLIENT_MODE_OPTIONS,
      SECRET_TYPE_OPTIONS,
      s2sModalTabs,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('ipsec.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #ike>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createIke" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editIke" :disabled="writeDisabled || !selectedIke.length || selectedIke.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeIke" :disabled="writeDisabled || !selectedIke.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="ikeColumns" :data="ikeGroups" row-key="name" :externalToolbar="true" @selection-change="selectedIke = $event" :selectable="true">
            <template #disable_mobike="{ row }">{{ row.disable_mobike ? t('common.yes') : t('common.no') }}</template>
            <template #ikev2_reauth="{ row }">{{ row.ikev2_reauth ? t('common.yes') : t('common.no') }}</template>
            <template #proposals="{ row }">{{ formatProposals(row) }}</template>
          </DataTable>
        </template>
        <template #esp>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createEsp" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editEsp" :disabled="writeDisabled || !selectedEsp.length || selectedEsp.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeEsp" :disabled="writeDisabled || !selectedEsp.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="espColumns" :data="espGroups" row-key="name" :externalToolbar="true" @selection-change="selectedEsp = $event" :selectable="true">
            <template #proposals="{ row }">{{ formatProposals(row) }}</template>
          </DataTable>
        </template>
        <template #auth>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createPsk" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editPsk" :disabled="writeDisabled || !selectedPsk.length || selectedPsk.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removePsk" :disabled="writeDisabled || !selectedPsk.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="pskColumns" :data="psks" row-key="name" :externalToolbar="true" @selection-change="selectedPsk = $event" :selectable="true" />
        </template>
        <template #interface>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.disableUniqreqidsTitle')">{{ t('ipsec.form.disableUniqreqids') }}</label>
            <input type="checkbox" v-model="disableUniqreqids" :disabled="writeDisabled" :title="t('ipsec.form.disableUniqreqidsTitle')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.interfaceTitle')">{{ t('ipsec.form.interface') }}</label>
            <select class="form-control" v-model="interfaces" :disabled="writeDisabled" :title="t('ipsec.form.interfaceTitle')">
              <option value="">{{ t('ipsec.form.interfacePlaceholder') }}</option>
              <option v-for="iface in availableInterfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
        </template>
        <template #options>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.disableRouteAutoinstallTitle')">{{ t('ipsec.form.disableRouteAutoinstall') }}</label>
            <input type="checkbox" v-model="options.disable_route_autoinstall" :disabled="writeDisabled" :title="t('ipsec.form.disableRouteAutoinstallTitle')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.flexvpnTitle')">{{ t('ipsec.form.flexvpn') }}</label>
            <input type="checkbox" v-model="options.flexvpn" :disabled="writeDisabled" :title="t('ipsec.form.flexvpnTitle')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.virtualIpTitle')">{{ t('ipsec.form.virtualIp') }}</label>
            <input type="checkbox" v-model="options.virtual_ip" :disabled="writeDisabled" :title="t('ipsec.form.virtualIpTitle')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.optionsInterfaceTitle')">{{ t('ipsec.form.optionsInterface') }}</label>
            <select class="form-control" v-model="options.interface" :disabled="writeDisabled" :title="t('ipsec.form.optionsInterfaceTitle')">
              <option v-for="iface in interfaceOptions" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
            <div style="background:#f5f5f5; padding:8px 16px; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ipsec.form.retransmission') }}</div>
            <div style="padding:12px 16px 12px 0; display:grid; gap:8px;">
              <div style="display:flex; align-items:flex-start; gap:12px; min-height:52px;">
                <label style="width:150px; min-width:150px; margin:0; font-weight:normal; color:#333; text-align:right; padding-top:6px;">{{ t('ipsec.form.retransmissionAttempts') }}</label>
                <div style="flex:1; min-width:0;">
                  <input class="form-control" type="number" min="1" max="65535" style="width:100%;" v-model="options.retransmission.attempts" :disabled="writeDisabled" :title="t('ipsec.form.retransmissionAttemptsTitle')" />
                  <div class="form-hint">{{ t('ipsec.form.retransmissionAttemptsHint') }}</div>
                </div>
              </div>
              <div style="display:flex; align-items:flex-start; gap:12px; min-height:52px;">
                <label style="width:150px; min-width:150px; margin:0; font-weight:normal; color:#333; text-align:right; padding-top:6px;">{{ t('ipsec.form.retransmissionBase') }}</label>
                <div style="flex:1; min-width:0;">
                  <input class="form-control" type="number" min="1" max="5" step="0.1" style="width:100%;" v-model="options.retransmission.base" :disabled="writeDisabled" :title="t('ipsec.form.retransmissionBaseTitle')" />
                  <div class="form-hint">{{ t('ipsec.form.retransmissionBaseHint') }}</div>
                </div>
              </div>
              <div style="display:flex; align-items:flex-start; gap:12px; min-height:52px;">
                <label style="width:150px; min-width:150px; margin:0; font-weight:normal; color:#333; text-align:right; padding-top:6px;">{{ t('ipsec.form.retransmissionTimeout') }}</label>
                <div style="flex:1; min-width:0;">
                  <input class="form-control" type="number" min="1" max="1000" style="width:100%;" v-model="options.retransmission.timeout" :disabled="writeDisabled" :title="t('ipsec.form.retransmissionTimeoutTitle')" />
                  <div class="form-hint">{{ t('ipsec.form.retransmissionTimeoutHint') }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template #log>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.globalLogLevelTitle')">{{ t('ipsec.form.globalLogLevel') }}</label>
            <select class="form-control" v-model="logConfig.level" :disabled="writeDisabled" :title="t('ipsec.form.globalLogLevelTitle')">
              <option v-for="o in LOG_LEVEL_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ipsec.form.subsystemTitle')">{{ t('ipsec.form.subsystem') }}</label>
            <div style="display:flex; flex-wrap:wrap; gap:12px 18px; flex:1; padding:8px 0;">
              <label v-for="opt in LOG_SUBSYSTEM_OPTIONS.filter(Boolean)" :key="opt" style="display:flex; align-items:center; gap:6px; min-width:120px;">
                <input type="checkbox" :checked="isSubsystemSelected(opt)" :disabled="writeDisabled" @change="toggleLogSubsystem(opt, $event.target.checked)" :title="t('ipsec.form.subsystemTitle')" />
                {{ opt }}
              </label>
            </div>
          </div>
        </template>
        <template #profile>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createProfile" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editProfile" :disabled="writeDisabled || !selectedProfile.length || selectedProfile.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeProfile" :disabled="writeDisabled || !selectedProfile.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="profileColumns" :data="profiles" row-key="name" :externalToolbar="true" @selection-change="selectedProfile = $event" :selectable="true" />
        </template>
        <template #site_to_site>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="createS2s" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editS2s" :disabled="writeDisabled || !selectedS2s.length || selectedS2s.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeS2s" :disabled="writeDisabled || !selectedS2s.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
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
                  <ToolbarButton icon="create" @click="createRa" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRa" :disabled="writeDisabled || !selectedRa.length || selectedRa.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRa" :disabled="writeDisabled || !selectedRa.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raColumns" :data="remoteAccessConns" row-key="name" :externalToolbar="true" @selection-change="selectedRa = $event" :selectable="true">
                <template #pool="{ row }">{{ formatLines(row.pool) }}</template>
              </DataTable>
            </template>
            <template #pool>
              <div class="toolbar">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRaPool" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRaPool" :disabled="writeDisabled || !selectedRaPool.length || selectedRaPool.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRaPool" :disabled="writeDisabled || !selectedRaPool.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raPoolColumns" :data="remoteAccessPools" row-key="name" :externalToolbar="true" @selection-change="selectedRaPool = $event" :selectable="true">
                <template #name_servers="{ row }">{{ formatLines(row.name_servers) }}</template>
                <template #excludes="{ row }">{{ formatLines(row.excludes) }}</template>
              </DataTable>
            </template>
            <template #dhcp>
              <div class="form-row">
                <label class="form-label" :title="t('ipsec.form.dhcpServerTitle')">{{ t('ipsec.form.dhcpServer') }}</label>
                <input class="form-control" v-model="remoteAccessDhcp.server" :placeholder="t('ipsec.form.dhcpServerPlaceholder')" :disabled="writeDisabled" :title="t('ipsec.form.dhcpServerTitle')" />
              </div>
              <div class="form-row">
                <label class="form-label" :title="t('ipsec.form.dhcpInterfaceTitle')">{{ t('ipsec.form.dhcpInterface') }}</label>
                <input class="form-control" v-model="remoteAccessDhcp.interface" :placeholder="t('ipsec.form.dhcpInterfacePlaceholder')" :disabled="writeDisabled" :title="t('ipsec.form.dhcpInterfaceTitle')" />
              </div>
            </template>
            <template #radius>
              <div class="form-row">
                <label class="form-label" :title="t('ipsec.form.nasIdentifierTitle')">NAS-Identifier</label>
                <input class="form-control" v-model="remoteAccessRadius.nas_identifier" :disabled="writeDisabled" :title="t('ipsec.form.nasIdentifierTitle')" />
              </div>
              <div class="form-row">
                <label class="form-label" :title="t('ipsec.form.timeoutTitle')">{{ t('ipsec.form.timeout') }}</label>
                <div style="flex:1;">
                  <input class="form-control" type="number" min="1" max="240" v-model="remoteAccessRadius.timeout" placeholder="2" :disabled="writeDisabled" :title="t('ipsec.form.timeoutTitle')" style="width:100%;" />
                  <div class="form-hint">{{ t('ipsec.form.timeoutHint') }}</div>
                </div>
              </div>
              <div class="toolbar">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRaRadiusServer" :disabled="writeDisabled">{{ t('ipsec.buttons.create') }}</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRaRadiusServer" :disabled="writeDisabled || !selectedRaRadiusServer.length || selectedRaRadiusServer.length > 1">{{ t('ipsec.buttons.edit') }}</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRaRadiusServer" :disabled="writeDisabled || !selectedRaRadiusServer.length">{{ t('ipsec.buttons.delete') }}</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="raRadiusServerColumns" :data="remoteAccessRadius.servers" row-key="ip" :externalToolbar="true" @selection-change="selectedRaRadiusServer = $event" :selectable="true" />
            </template>
          </TabGroup>
        </template>
      </TabGroup>
      <div v-if="['interface', 'options', 'log'].includes(activeTab)" style="text-align:right;padding:16px 0;">
        <ToolbarButton icon="save" primary :disabled="writeDisabled || saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>
      <DraggableModal v-model:visible="ikeModalVisible" :title="ikeModalTitle" width="920px" @confirm="saveIke">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingIke.name" :disabled="editingIke._name" :title="t('ipsec.form.nameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.keyExchangeTitle')">{{ t('ipsec.form.keyExchange') }}</label><select class="form-control" v-model="editingIke.key_exchange" :title="t('ipsec.form.keyExchangeTitle')"><option value=""></option><option v-for="o in KEY_EXCHANGE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.modeTitle')">{{ t('ipsec.form.mode') }}</label><select class="form-control" v-model="editingIke.mode" :title="t('ipsec.form.modeTitle')"><option value=""></option><option v-for="o in IKE_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.lifetimeTitle')">{{ t('ipsec.form.lifetime') }}</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="86400" v-model="editingIke.lifetime" :placeholder="t('ipsec.form.lifetimePlaceholder')" :title="t('ipsec.form.lifetimeTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.lifetimeHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.closeActionTitle')">{{ t('ipsec.form.closeAction') }}</label><select class="form-control" v-model="editingIke.close_action" :title="t('ipsec.form.closeActionTitle')"><option value=""></option><option v-for="o in CLOSE_ACTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.disableMobikeTitle')">{{ t('ipsec.form.disableMobike') }}</label><input type="checkbox" v-model="editingIke.disable_mobike" :title="t('ipsec.form.disableMobikeTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.ikev2ReauthTitle')">{{ t('ipsec.form.ikev2Reauth') }}</label><input type="checkbox" v-model="editingIke.ikev2_reauth" :title="t('ipsec.form.ikev2ReauthTitle')" /></div>
        <div class="form-group">
          <div class="form-group-title">{{ t('ipsec.form.dpd') }}</div>
          <div class="form-group-content">
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.dpdActionTitle')">{{ t('ipsec.form.dpdAction') }}</label><select class="form-control" v-model="editingIke.dpd_action" :title="t('ipsec.form.dpdActionTitle')"><option value=""></option><option v-for="o in DPD_ACTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.dpdIntervalTitle')">{{ t('ipsec.form.dpdInterval') }}</label><div style="flex:1;"><input class="form-control" type="number" min="2" max="86400" v-model="editingIke.dpd_interval" :placeholder="t('ipsec.form.dpdIntervalPlaceholder')" :title="t('ipsec.form.dpdIntervalTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.dpdIntervalHint') }}</div></div></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.dpdTimeoutTitle')">{{ t('ipsec.form.dpdTimeout') }}</label><div style="flex:1;"><input class="form-control" type="number" min="2" max="86400" v-model="editingIke.dpd_timeout" :placeholder="t('ipsec.form.dpdTimeoutPlaceholder')" :title="t('ipsec.form.dpdTimeoutTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.dpdTimeoutHint') }}</div></div></div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-group-title">{{ t('ipsec.form.proposal') }}</div>
          <div class="form-group-content">
            <DataTable rowKey="actions" :columns="[
              { key: 'number', title: t('ipsec.form.proposalNumber'), width: 100 },
              { key: 'encryption', title: t('ipsec.form.encryption'), width: 150 },
              { key: 'hash', title: t('ipsec.form.hash'), width: 120 },
              { key: 'dh_group', title: t('ipsec.form.dhGroup'), width: 150 },
              { key: 'prf', title: t('ipsec.form.prf'), width: 120 },
            ]" :data="editingIke.proposals.map((p, i) => ({
              number: p.number,
              encryption: p.encryption,
              hash: p.hash,
              dh_group: getDhGroupLabel(p.dh_group),
              prf: p.prf,
              actions: i,
            }))"
            :actions="['create', 'edit', 'delete']"
            @create="openIkeProposalModal(null)"
            @edit="openIkeProposalModal($event.actions)"
            @delete="deleteIkeProposals($event)">
            </DataTable>
          </div>
        </div>
      </DraggableModal>

      <!-- IKE Proposal Modal -->
      <DraggableModal v-model:visible="ikeProposalModalVisible" :title="ikeProposalModalTitle" width="600px" @confirm="saveIkeProposal">
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.proposalNumber') }}</label><div style="flex:1;"><input class="form-control" v-model="editingIkeProposal.number" :disabled="!editingIkeProposal._new" :placeholder="t('ipsec.form.proposalNumberPlaceholder')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.proposalNumberHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.encryption') }}</label><select class="form-control" v-model="editingIkeProposal.encryption"><option v-for="o in ENCRYPTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.hash') }}</label><select class="form-control" v-model="editingIkeProposal.hash"><option v-for="o in HASH_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.dhGroup') }}</label><select class="form-control" v-model="editingIkeProposal.dh_group"><option v-for="o in DH_GROUP_OPTIONS" :key="optionValue(o)" :value="optionValue(o)">{{ optionLabel(o) }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.prf') }}</label><select class="form-control" v-model="editingIkeProposal.prf"><option v-for="o in PRF_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
      </DraggableModal>

      <DraggableModal v-model:visible="espModalVisible" :title="espModalTitle" width="700px" @confirm="saveEsp">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingEsp.name" :disabled="editingEsp._name" :title="t('ipsec.form.nameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.espModeTitle')">{{ t('ipsec.form.espMode') }}</label><select class="form-control" v-model="editingEsp.mode" :title="t('ipsec.form.espModeTitle')"><option v-for="o in ESP_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.espLifetimeTitle')">{{ t('ipsec.form.espLifetime') }}</label><div style="flex:1;"><input class="form-control" type="number" min="30" max="86400" v-model="editingEsp.lifetime" :placeholder="t('ipsec.form.espLifetimePlaceholder')" :title="t('ipsec.form.espLifetimeTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.espLifetimeHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.pfsTitle')">{{ t('ipsec.form.pfs') }}</label><select class="form-control" v-model="editingEsp.pfs" :title="t('ipsec.form.pfsTitle')"><option v-for="o in PFS_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.compressionTitle')">{{ t('ipsec.form.compression') }}</label><select class="form-control" v-model="editingEsp.compression" :title="t('ipsec.form.compressionTitle')"><option v-for="o in COMPRESSION_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.lifeBytesTitle')">{{ t('ipsec.form.lifeBytes') }}</label><div style="flex:1;"><input class="form-control" type="number" min="1024" max="26843545600000" v-model="editingEsp.life_bytes" :title="t('ipsec.form.lifeBytesTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.lifeBytesHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.lifePacketsTitle')">{{ t('ipsec.form.lifePackets') }}</label><div style="flex:1;"><input class="form-control" type="number" min="1000" max="26843545600000" v-model="editingEsp.life_packets" :title="t('ipsec.form.lifePacketsTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.lifePacketsHint') }}</div></div></div>
        <div class="form-group">
          <div class="form-group-title">{{ t('ipsec.form.proposal') }}</div>
          <div class="form-group-content">
            <DataTable rowKey="actions" :columns="[
              { key: 'number', title: t('ipsec.form.proposalNumber'), width: 100 },
              { key: 'encryption', title: t('ipsec.form.encryption'), width: 150 },
              { key: 'hash', title: t('ipsec.form.hash'), width: 120 },
            ]" :data="editingEsp.proposals.map((p, i) => ({
              number: p.number,
              encryption: p.encryption,
              hash: p.hash,
              actions: i,
            }))"
            :actions="['create', 'edit', 'delete']"
            @create="openEspProposalModal(null)"
            @edit="openEspProposalModal($event.actions)"
            @delete="deleteEspProposals($event)">
            </DataTable>
          </div>
        </div>
      </DraggableModal>

      <!-- ESP Proposal Modal -->
      <DraggableModal v-model:visible="espProposalModalVisible" :title="espProposalModalTitle" width="600px" @confirm="saveEspProposal">
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.proposalNumber') }}</label><div style="flex:1;"><input class="form-control" v-model="editingEspProposal.number" :disabled="!editingEspProposal._new" :placeholder="t('ipsec.form.proposalNumberPlaceholder')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.espProposalNumberHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.encryption') }}</label><div style="flex:1;"><select class="form-control" v-model="editingEspProposal.encryption" style="width:100%;"><option v-for="o in ENCRYPTION_OPTIONS" :key="o" :value="o">{{ o }}</option></select><div class="form-hint">{{ t('ipsec.form.espProposalEncryptionHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.hash') }}</label><div style="flex:1;"><select class="form-control" v-model="editingEspProposal.hash" style="width:100%;"><option v-for="o in HASH_OPTIONS" :key="o" :value="o">{{ o }}</option></select><div class="form-hint">{{ t('ipsec.form.espProposalHashHint') }}</div></div></div>
      </DraggableModal>

      <!-- Tunnel Modal -->
      <DraggableModal v-model:visible="tunnelModalVisible" :title="tunnelModalTitle" width="800px" :z-index="2001" @confirm="saveTunnel">
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelNumber') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="editingTunnel.number" :disabled="!editingTunnel._new" :placeholder="t('ipsec.form.tunnelNumberPlaceholder')" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelEspGroup') }}</label><select class="form-control" v-model="editingTunnel.esp_group"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelPriority') }}</label><input class="form-control" type="number" min="1" max="100" v-model="editingTunnel.priority" :placeholder="t('ipsec.form.tunnelPriorityPlaceholder')" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelProtocol') }}</label><select class="form-control" v-model="editingTunnel.protocol"><option v-for="o in protocolOptions" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelLocalPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingTunnel.local_port" :placeholder="t('ipsec.form.tunnelLocalPortPlaceholder')" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelRemotePort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingTunnel.remote_port" :placeholder="t('ipsec.form.tunnelRemotePortPlaceholder')" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelLocalPrefixLabel') }}</label><textarea class="form-control" v-model="editingTunnel.local_prefix" :placeholder="t('ipsec.form.tunnelLocalPrefixPlaceholder')" rows="2" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelRemotePrefixLabel') }}</label><textarea class="form-control" v-model="editingTunnel.remote_prefix" :placeholder="t('ipsec.form.tunnelRemotePrefixPlaceholder')" rows="2" /></div>
        <div class="form-row"><label class="form-label">{{ t('ipsec.form.tunnelDisable') }}</label><input type="checkbox" v-model="editingTunnel.disable" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="pskModalVisible" :title="pskModalTitle" width="600px" @confirm="savePsk">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingPsk.name" :disabled="editingPsk._name" :title="t('ipsec.form.nameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.idsTitle')">{{ t('ipsec.form.ids') }}</label><textarea class="form-control" v-model="editingPsk.ids" :title="t('ipsec.form.idsTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.secretTypeTitle')">{{ t('ipsec.form.secretType') }}</label><select class="form-control" v-model="editingPsk.secret_type" :title="t('ipsec.form.secretTypeTitle')"><option v-for="o in SECRET_TYPE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.secretTitle')">{{ t('ipsec.form.secret') }}</label><input class="form-control" type="password" v-model="editingPsk.secret" :title="t('ipsec.form.secretTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.dhcpInterfaceFieldTitle')">{{ t('ipsec.form.dhcpInterfaceField') }}</label><select class="form-control" v-model="editingPsk.dhcp_interface" :title="t('ipsec.form.dhcpInterfaceFieldTitle')"><option value=""></option><option v-for="o in interfaceOptions" :key="o" :value="o">{{ o }}</option></select></div>
      </DraggableModal>

      <DraggableModal v-model:visible="profileModalVisible" :title="profileModalTitle" width="600px" @confirm="saveProfile">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingProfile.name" :disabled="editingProfile._name" :title="t('ipsec.form.nameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.ikeGroupFieldTitle')">{{ t('ipsec.form.ikeGroupField') }}</label><select class="form-control" v-model="editingProfile.ike_group" :title="t('ipsec.form.ikeGroupFieldTitle')"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.espGroupFieldTitle')">{{ t('ipsec.form.espGroupField') }}</label><select class="form-control" v-model="editingProfile.esp_group" :title="t('ipsec.form.espGroupFieldTitle')"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.authModeFieldTitle')">{{ t('ipsec.form.authModeField') }}</label><select class="form-control" v-model="editingProfile.authentication_mode" :title="t('ipsec.form.authModeFieldTitle')"><option v-for="o in AUTH_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.preSharedSecretTitle')">{{ t('ipsec.form.preSharedSecret') }}</label><input class="form-control" type="password" v-model="editingProfile.pre_shared_secret" :title="t('ipsec.form.preSharedSecretTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.bindTunnelsTitle')">{{ t('ipsec.form.bindTunnels') }}</label><textarea class="form-control" v-model="editingProfile.bind_tunnels" :title="t('ipsec.form.bindTunnelsTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.disableFieldTitle')">{{ t('ipsec.form.disableField') }}</label><input type="checkbox" v-model="editingProfile.disable" :title="t('ipsec.form.disableFieldTitle')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="s2sModalVisible" :title="s2sModalTitle" width="900px" @confirm="saveS2s">
        <TabGroup v-model="s2sModalTab" :tabs="s2sModalTabs">
          <template #peer>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingS2s.name" :disabled="editingS2s._name" :title="t('ipsec.form.nameTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.descriptionTitle')">{{ t('ipsec.form.description') }}</label><input class="form-control" v-model="editingS2s.description" :title="t('ipsec.form.descriptionTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.remoteAddressTitle')">{{ t('ipsec.form.remoteAddress') }}</label><textarea class="form-control" v-model="editingS2s.remote_address" :placeholder="t('ipsec.form.remoteAddressPlaceholder')" :title="t('ipsec.form.remoteAddressTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.localAddressTitle')">{{ t('ipsec.form.localAddress') }}</label><input class="form-control" v-model="editingS2s.local_address" :placeholder="t('ipsec.form.localAddressPlaceholder')" :title="t('ipsec.form.localAddressTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.connectionTypeTitle')">{{ t('ipsec.form.connectionType') }}</label><select class="form-control" v-model="editingS2s.connection_type" :title="t('ipsec.form.connectionTypeTitle')"><option v-for="o in CONNECTION_TYPE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.ikeGroupFieldTitle')">{{ t('ipsec.form.ikeGroupField') }}</label><select class="form-control" v-model="editingS2s.ike_group" :title="t('ipsec.form.ikeGroupFieldTitle')"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.defaultEspGroupTitle')">{{ t('ipsec.form.defaultEspGroup') }}</label><select class="form-control" v-model="editingS2s.default_esp_group" :title="t('ipsec.form.defaultEspGroupTitle')"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.dhcpInterfaceField2Title')">{{ t('ipsec.form.dhcpInterfaceField2') }}</label><select class="form-control" v-model="editingS2s.dhcp_interface" :title="t('ipsec.form.dhcpInterfaceField2Title')"><option value=""></option><option v-for="o in interfaceOptions" :key="o" :value="o">{{ o }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.replayWindowTitle')">{{ t('ipsec.form.replayWindow') }}</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="1024" v-model="editingS2s.replay_window" :placeholder="t('ipsec.form.replayWindowPlaceholder')" :title="t('ipsec.form.replayWindowTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.replayWindowHint') }}</div></div></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.virtualAddressTitle')">{{ t('ipsec.form.virtualAddress') }}</label><textarea class="form-control" v-model="editingS2s.virtual_address" :title="t('ipsec.form.virtualAddressTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.forceUdpEncapTitle')">{{ t('ipsec.form.forceUdpEncap') }}</label><input type="checkbox" v-model="editingS2s.force_udp_encapsulation" :title="t('ipsec.form.forceUdpEncapTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.disableFieldTitle')">{{ t('ipsec.form.disableField') }}</label><input type="checkbox" v-model="editingS2s.disable" :title="t('ipsec.form.disableFieldTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.ikev2ReauthTitle')">{{ t('ipsec.form.ikev2Reauth') }}</label><input type="checkbox" v-model="editingS2s.ikev2_reauth" :title="t('ipsec.form.ikev2ReauthTitle')" /></div>
          </template>
          <template #authentication>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.authModeFieldTitle')">{{ t('ipsec.form.authModeField') }}</label><select class="form-control" v-model="editingS2s.auth_mode" :title="t('ipsec.form.authModeFieldTitle')"><option v-for="o in AUTH_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.localIdTitle')">{{ t('ipsec.form.localId') }}</label><input class="form-control" v-model="editingS2s.auth_local_id" :title="t('ipsec.form.localIdTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.remoteIdTitle')">{{ t('ipsec.form.remoteId') }}</label><input class="form-control" v-model="editingS2s.auth_remote_id" :title="t('ipsec.form.remoteIdTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.useX509IdTitle')">{{ t('ipsec.form.useX509Id') }}</label><input type="checkbox" v-model="editingS2s.auth_use_x509_id" :title="t('ipsec.form.useX509IdTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509CaCertsTitle')">{{ t('ipsec.form.x509CaCerts') }}</label><textarea class="form-control" v-model="editingS2s.x509_ca_certs" :title="t('ipsec.form.x509CaCertsTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509CertTitle')">{{ t('ipsec.form.x509Cert') }}</label><input class="form-control" v-model="editingS2s.x509_cert" :title="t('ipsec.form.x509CertTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509PassphraseTitle')">{{ t('ipsec.form.x509Passphrase') }}</label><input class="form-control" type="password" v-model="editingS2s.x509_passphrase" :title="t('ipsec.form.x509PassphraseTitle')" /></div>
            <div class="form-row"><label class="form-label" title="RSA 本地密钥名称">RSA 本地密钥</label><input class="form-control" v-model="editingS2s.rsa_local_key" title="RSA 本地密钥名称" /></div>
            <div class="form-row"><label class="form-label" title="RSA 远端密钥名称">RSA 远端密钥</label><input class="form-control" v-model="editingS2s.rsa_remote_key" title="RSA 远端密钥名称" /></div>
            <div class="form-row"><label class="form-label" title="RSA 私钥密码">RSA 密码</label><input class="form-control" type="password" v-model="editingS2s.rsa_passphrase" title="RSA 私钥密码" /></div>
          </template>
          <template #vti>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.vtiBindTitle')">{{ t('ipsec.form.vtiBind') }}</label><select class="form-control" v-model="editingS2s.vti_bind" :title="t('ipsec.form.vtiBindTitle')"><option value=""></option><option v-for="v in vtiInterfaces" :key="v" :value="v">{{ v }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.vtiEspGroupTitle')">{{ t('ipsec.form.vtiEspGroup') }}</label><select class="form-control" v-model="editingS2s.vti_esp_group" :title="t('ipsec.form.vtiEspGroupTitle')"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.vtiTsLocalPrefixTitle')">{{ t('ipsec.form.vtiTsLocalPrefix') }}</label><textarea class="form-control" v-model="editingS2s.vti_local_prefix" :placeholder="t('ipsec.form.vtiTsLocalPrefixPlaceholder')" :title="t('ipsec.form.vtiTsLocalPrefixTitle')" /></div>
            <div class="form-row"><label class="form-label" :title="t('ipsec.form.vtiTsRemotePrefixTitle')">{{ t('ipsec.form.vtiTsRemotePrefix') }}</label><textarea class="form-control" v-model="editingS2s.vti_remote_prefix" :placeholder="t('ipsec.form.vtiTsRemotePrefixPlaceholder')" :title="t('ipsec.form.vtiTsRemotePrefixTitle')" /></div>
          </template>
          <template #tunnel>
            <DataTable rowKey="actions" :columns="[
              { key: 'number', title: t('ipsec.form.tunnelNumber'), width: 80 },
              { key: 'esp_group', title: t('ipsec.form.tunnelEspGroup'), width: 100 },
              { key: 'priority', title: t('ipsec.form.tunnelPriority'), width: 70 },
              { key: 'protocol', title: t('ipsec.form.tunnelProtocol'), width: 80 },
              { key: 'local_port', title: t('ipsec.form.tunnelLocalPort'), width: 80 },
              { key: 'remote_port', title: t('ipsec.form.tunnelRemotePort'), width: 80 },
              { key: 'local_prefix', title: t('ipsec.form.tunnelLocalPrefix'), width: 140 },
              { key: 'remote_prefix', title: t('ipsec.form.tunnelRemotePrefix'), width: 140 },
              { key: 'disable', title: t('ipsec.form.tunnelDisable'), width: 70 },
            ]" :data="editingS2s.tunnels.map((t, i) => ({
              number: t.number,
              esp_group: t.esp_group,
              priority: t.priority,
              protocol: t.protocol,
              local_port: t.local_port,
              remote_port: t.remote_port,
              local_prefix: t.local_prefix || '',
              remote_prefix: t.remote_prefix || '',
              disable: t.disable ? '是' : '否',
              actions: i,
            }))"
            :actions="['create', 'edit', 'delete']"
            @create="openTunnelModal(null)"
            @edit="openTunnelModal($event.actions)"
            @delete="deleteTunnels($event)">
            </DataTable>
          </template>
        </TabGroup>
      </DraggableModal>

      <DraggableModal v-model:visible="raModalVisible" :title="t('ipsec.modals.raConnection')" width="650px" @confirm="saveRa">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.nameTitle')">{{ t('ipsec.form.name') }}</label><input class="form-control" v-model="editingRa.name" :disabled="editingRa._name" :title="t('ipsec.form.nameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.ikeGroupFieldTitle')">{{ t('ipsec.form.ikeGroupField') }}</label><select class="form-control" v-model="editingRa.ike_group" :title="t('ipsec.form.ikeGroupFieldTitle')"><option value=""></option><option v-for="g in ikeGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.espGroupFieldTitle')">{{ t('ipsec.form.espGroupField') }}</label><select class="form-control" v-model="editingRa.esp_group" :title="t('ipsec.form.espGroupFieldTitle')"><option value=""></option><option v-for="g in espGroups" :key="g.name" :value="g.name">{{ g.name }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.localAddressTitle')">{{ t('ipsec.form.localAddress') }}</label><input class="form-control" v-model="editingRa.local_address" :placeholder="t('ipsec.form.localAddressPlaceholder')" :title="t('ipsec.form.localAddressTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.localPrefixTitle')">{{ t('ipsec.form.localPrefix') }}</label><textarea class="form-control" v-model="editingRa.local_prefix" :placeholder="t('ipsec.form.localPrefixPlaceholder')" :title="t('ipsec.form.localPrefixTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.localPortTitle')">{{ t('ipsec.form.localPort') }}</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="65535" v-model="editingRa.local_port" :title="t('ipsec.form.localPortTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.localPortHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.addressPoolTitle')">{{ t('ipsec.form.addressPool') }}</label><select class="form-control" v-model="editingRa.pool" multiple :title="t('ipsec.form.addressPoolTitle')" style="min-height:80px;"><option value=""></option><option v-for="p in remoteAccessPools" :key="p.name" :value="p.name">{{ p.name }} ({{ p.prefix }})</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.descriptionTitle')">{{ t('ipsec.form.description') }}</label><input class="form-control" v-model="editingRa.description" :title="t('ipsec.form.descriptionTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.dhcpInterfaceField2Title')">{{ t('ipsec.form.dhcpInterfaceField2') }}</label><input class="form-control" v-model="editingRa.dhcp_interface" :placeholder="t('ipsec.form.dhcpInterfaceField2Placeholder')" :title="t('ipsec.form.dhcpInterfaceField2Title')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.replayWindowTitle')">{{ t('ipsec.form.replayWindow') }}</label><div style="flex:1;"><input class="form-control" type="number" min="0" max="1024" v-model="editingRa.replay_window" :placeholder="t('ipsec.form.replayWindowPlaceholder')" :title="t('ipsec.form.replayWindowTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.replayWindowHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.timeoutFieldTitle')">{{ t('ipsec.form.timeoutField') }}</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="86400" v-model="editingRa.timeout" :placeholder="t('ipsec.form.timeoutFieldPlaceholder')" :title="t('ipsec.form.timeoutFieldTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.timeoutFieldHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.uniqueTitle')">{{ t('ipsec.form.unique') }}</label><select class="form-control" v-model="editingRa.unique" :title="t('ipsec.form.uniqueTitle')"><option v-for="o in UNIQUE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div style="font-weight:bold;margin:12px 0 8px;">{{ t('ipsec.form.authentication') }}</div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.serverModeTitle')">{{ t('ipsec.form.serverMode') }}</label><select class="form-control" v-model="editingRa.server_mode" :title="t('ipsec.form.serverModeTitle')"><option v-for="o in SERVER_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.clientModeTitle')">{{ t('ipsec.form.clientMode') }}</label><select class="form-control" v-model="editingRa.client_mode" :title="t('ipsec.form.clientModeTitle')"><option v-for="o in CLIENT_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option></select></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.eapIdTitle')">{{ t('ipsec.form.eapId') }}</label><input class="form-control" v-model="editingRa.eap_id" :title="t('ipsec.form.eapIdTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.preSharedSecretFieldTitle')">{{ t('ipsec.form.preSharedSecretField') }}</label><input class="form-control" type="password" v-model="editingRa.pre_shared_secret" :title="t('ipsec.form.preSharedSecretFieldTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.localIdTitle')">{{ t('ipsec.form.localId') }}</label><input class="form-control" v-model="editingRa.auth_local_id" :title="t('ipsec.form.localIdTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509CaCertsTitle')">{{ t('ipsec.form.x509CaCerts') }}</label><textarea class="form-control" v-model="editingRa.x509_ca_certs" :title="t('ipsec.form.x509CaCertsTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509CertTitle')">{{ t('ipsec.form.x509Cert') }}</label><input class="form-control" v-model="editingRa.x509_cert" :title="t('ipsec.form.x509CertTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.x509PassphraseTitle')">{{ t('ipsec.form.x509Passphrase') }}</label><input class="form-control" type="password" v-model="editingRa.x509_passphrase" :title="t('ipsec.form.x509PassphraseTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.disableFieldTitle')">{{ t('ipsec.form.disableField') }}</label><input type="checkbox" v-model="editingRa.disable" :title="t('ipsec.form.disableFieldTitle')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="raPoolModalVisible" :title="t('ipsec.modals.raPool')" width="600px" @confirm="saveRaPool">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.poolNameTitle')">{{ t('ipsec.form.poolName') }}</label><input class="form-control" v-model="editingRaPool.name" :disabled="editingRaPool._name" :title="t('ipsec.form.poolNameTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.poolPrefixTitle')">{{ t('ipsec.form.poolPrefix') }}</label><input class="form-control" v-model="editingRaPool.prefix" :placeholder="t('ipsec.form.poolPrefixPlaceholder')" :title="t('ipsec.form.poolPrefixTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.dnsServerTitle')">{{ t('ipsec.form.dnsServer') }}</label><textarea class="form-control" v-model="editingRaPool.name_servers" :placeholder="t('ipsec.form.dnsServerPlaceholder')" :title="t('ipsec.form.dnsServerTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.excludePrefixTitle')">{{ t('ipsec.form.excludePrefix') }}</label><textarea class="form-control" v-model="editingRaPool.excludes" :placeholder="t('ipsec.form.excludePrefixPlaceholder')" :title="t('ipsec.form.excludePrefixTitle')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="raRadiusServerModalVisible" :title="t('ipsec.modals.radiusServer')" width="560px" @confirm="saveRaRadiusServer">
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.radiusServerAddressTitle')">{{ t('ipsec.form.radiusServerAddress') }}</label><input class="form-control" v-model="editingRaRadiusServer.ip" :disabled="editingRaRadiusServer._ip" :placeholder="t('ipsec.form.radiusServerAddressPlaceholder')" :title="t('ipsec.form.radiusServerAddressTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.radiusPortTitle')">{{ t('ipsec.form.radiusPort') }}</label><div style="flex:1;"><input class="form-control" type="number" min="1" max="65535" v-model="editingRaRadiusServer.port" :placeholder="t('ipsec.form.radiusPortPlaceholder')" :title="t('ipsec.form.radiusPortTitle')" style="width:100%;" /><div class="form-hint">{{ t('ipsec.form.radiusPortHint') }}</div></div></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.radiusKeyTitle')">{{ t('ipsec.form.radiusKey') }}</label><input class="form-control" type="password" v-model="editingRaRadiusServer.key" :title="t('ipsec.form.radiusKeyTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.radiusDisableTitle')">{{ t('ipsec.form.radiusDisable') }}</label><input type="checkbox" v-model="editingRaRadiusServer.disable" :title="t('ipsec.form.radiusDisableTitle')" /></div>
        <div class="form-row"><label class="form-label" :title="t('ipsec.form.radiusDisableAccountingTitle')">{{ t('ipsec.form.radiusDisableAccounting') }}</label><input type="checkbox" v-model="editingRaRadiusServer.disable_accounting" :title="t('ipsec.form.radiusDisableAccountingTitle')" /></div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="ikeDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveIke">
        <div>{{ t('ipsec.messages.confirmDeleteIke') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteIkeNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="espDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveEsp">
        <div>{{ t('ipsec.messages.confirmDeleteEsp') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteEspNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="pskDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemovePsk">
        <div>{{ t('ipsec.messages.confirmDeletePsk') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeletePskNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="profileDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveProfile">
        <div>{{ t('ipsec.messages.confirmDeleteProfile') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteProfileNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="s2sDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveS2s">
        <div>{{ t('ipsec.messages.confirmDeleteS2s') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteS2sNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="raDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRa">
        <div>{{ t('ipsec.messages.confirmDeleteRa') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRaNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="poolDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRaPool">
        <div>{{ t('ipsec.messages.confirmDeletePool') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeletePoolNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="radiusDeleteModalVisible" :title="t('ipsec.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRaRadiusServer">
        <div>{{ t('ipsec.messages.confirmDeleteRadius') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRadiusNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
