import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

const DEVICE_TYPE_OPTIONS = [
  { value: '', label: '' },
  { value: 'tun', label: 'openvpn.deviceType.tun' },
  { value: 'tap', label: 'openvpn.deviceType.tap' },
];

const IP_VERSION_OPTIONS = [
  { value: '', label: '' },
  { value: 'auto', label: 'openvpn.ipVersion.auto' },
  { value: 'ipv4', label: 'openvpn.ipVersion.ipv4' },
  { value: 'ipv6', label: 'openvpn.ipVersion.ipv6' },
  { value: 'dual-stack', label: 'openvpn.ipVersion.dualStack' },
];

const MODE_OPTIONS = [
  { value: '', label: '' },
  { value: 'site-to-site', label: 'openvpn.mode.siteToSite' },
  { value: 'client', label: 'openvpn.mode.client' },
  { value: 'server', label: 'openvpn.mode.server' },
];

const PROTOCOL_OPTIONS = [
  { value: '', label: '' },
  { value: 'udp', label: 'openvpn.protocol.udp' },
  { value: 'tcp-passive', label: 'openvpn.protocol.tcpPassive' },
  { value: 'tcp-active', label: 'openvpn.protocol.tcpActive' },
];

const CIPHER_OPTIONS = [
  { value: '', label: '' },
  { value: 'none', label: 'openvpn.cipher.none' },
  { value: '3des', label: 'openvpn.cipher.3des' },
  { value: 'aes128', label: 'openvpn.cipher.aes128' },
  { value: 'aes128gcm', label: 'openvpn.cipher.aes128gcm' },
  { value: 'aes192', label: 'openvpn.cipher.aes192' },
  { value: 'aes192gcm', label: 'openvpn.cipher.aes192gcm' },
  { value: 'aes256', label: 'openvpn.cipher.aes256' },
  { value: 'aes256gcm', label: 'openvpn.cipher.aes256gcm' },
];

const HASH_OPTIONS = [
  { value: '', label: '' },
  { value: 'md5', label: 'md5' },
  { value: 'sha1', label: 'sha1' },
  { value: 'sha256', label: 'sha256' },
  { value: 'sha384', label: 'sha384' },
  { value: 'sha512', label: 'sha512' },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: '', label: '' },
  { value: 'strict', label: 'openvpn.sourceValidation.strict' },
  { value: 'loose', label: 'openvpn.sourceValidation.loose' },
  { value: 'disable', label: 'openvpn.sourceValidation.disable' },
];

const TLS_VERSION_OPTIONS = [
  { value: '', label: '' },
  { value: '1.0', label: '1.0' },
  { value: '1.1', label: '1.1' },
  { value: '1.2', label: '1.2' },
  { value: '1.3', label: '1.3' },
];

const TLS_ROLE_OPTIONS = [
  { value: '', label: '' },
  { value: 'active', label: 'openvpn.tlsRole.active' },
  { value: 'passive', label: 'openvpn.tlsRole.passive' },
];

const TOPOLOGY_OPTIONS = [
  { value: '', label: '' },
  { value: 'subnet', label: 'openvpn.topology.subnet' },
  { value: 'point-to-point', label: 'openvpn.topology.pointToPoint' },
  { value: 'net30', label: 'openvpn.topology.net30' },
];

const MFA_CHALLENGE_OPTIONS = [
  { value: '', label: '' },
  { value: 'enable', label: 'openvpn.mfaChallenge.enable' },
  { value: 'disable', label: 'openvpn.mfaChallenge.disable' },
];

const COLUMNS = [
  { key: 'name', title: 'openvpn.columns.name', width: 120 },
  { key: 'description', title: 'openvpn.columns.description', width: 150 },
  { key: 'mode', title: 'openvpn.columns.mode', width: 120 },
  { key: 'protocol', title: 'openvpn.columns.protocol', width: 100 },
  { key: 'device_type', title: 'openvpn.columns.deviceType', width: 100 },
  { key: 'local_port', title: 'openvpn.columns.localPort', width: 90 },
  { key: 'remote_host', title: 'openvpn.columns.remoteHost', width: 140 },
  { key: 'remote_port', title: 'openvpn.columns.remotePort', width: 90 },
  { key: 'disable', title: 'openvpn.columns.disable', width: 80 },
  { key: 'actions', title: 'app.actions', width: 120, fixed: 'right' },
];

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export default defineComponent({
  name: 'OpenVpnPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const { t } = useI18n();
    const loading = ref(false);
    const openvpnList = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const activeTab = ref('basic');
    const acceptDadOptions = computed(() => [
      { value: '', label: '' },
      { value: '0', label: '0 - ' + t('ethernet.ipv6.accept_dad_option_0') },
      { value: '1', label: '1 - ' + t('ethernet.ipv6.accept_dad_option_1') },
      { value: '2', label: '2 - ' + t('ethernet.ipv6.accept_dad_option_2') },
    ]);

    const basicSchema = computed(() => [
      { key: 'name', title: 'openvpn.schema.name', type: 'text', required: true, placeholder: 'openvpn.schema.namePlaceholder', disabled: !!editingItem.value?.name },
      { key: 'description', title: 'openvpn.schema.description', type: 'text', placeholder: 'openvpn.schema.descriptionPlaceholder' },
      { key: 'device_type', title: 'openvpn.schema.deviceType', type: 'select', options: DEVICE_TYPE_OPTIONS, required: true, help: '默认值: tun' },
      { key: 'disable', title: 'openvpn.schema.disable', type: 'checkbox' },
      { key: 'ip_version', title: 'openvpn.schema.ipVersion', type: 'select', options: IP_VERSION_OPTIONS, help: '默认值: auto' },
      { key: 'mode', title: 'openvpn.schema.mode', type: 'select', options: MODE_OPTIONS, required: true },
      { key: 'protocol', title: 'openvpn.schema.protocol', type: 'select', options: PROTOCOL_OPTIONS, help: '默认值: udp' },
      { key: 'persistent_tunnel', title: 'openvpn.schema.persistentTunnel', type: 'checkbox', help: 'openvpn.schema.persistentTunnelHelp' },
      { key: 'shared_secret_key', title: 'openvpn.schema.sharedSecretKey', type: 'password', placeholder: 'openvpn.schema.sharedSecretKeyPlaceholder' },
      { key: 'use_lzo_compression', title: 'openvpn.schema.useLzoCompression', type: 'checkbox', help: 'openvpn.schema.useLzoCompressionHelp' },
      { key: 'vrf', title: 'openvpn.schema.vrf', type: 'select', options: [{ value: '', label: '' }, ...vrfOptions.value], placeholder: 'openvpn.schema.vrfPlaceholder' },
      { key: 'openvpn_option', title: 'openvpn.schema.openvpnOption', type: 'textarea', placeholder: 'openvpn.schema.openvpnOptionPlaceholder' },
      { key: 'local_host', title: 'openvpn.schema.localHost', type: 'text', placeholder: 'openvpn.schema.localHostPlaceholder', help: '未设置时: 接受所有本地地址连接' },
      { key: 'local_port', title: 'openvpn.schema.localPort', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.localPortPlaceholder' },
      { key: 'remote_host', title: 'openvpn.schema.remoteHost', type: 'text', placeholder: 'openvpn.schema.remoteHostPlaceholder', help: '未设置时: dynamic' },
      { key: 'remote_port', title: 'openvpn.schema.remotePort', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.remotePortPlaceholder' },
      { key: 'redirect', title: 'openvpn.schema.redirect', type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: 'openvpn.schema.redirectPlaceholder' },
      { key: 'local_address', title: 'openvpn.schema.localAddress', type: 'text', placeholder: 'openvpn.schema.localAddressPlaceholder' },
      { key: 'local_subnet_mask', title: 'openvpn.schema.localSubnetMask', type: 'text', placeholder: 'openvpn.schema.localSubnetMaskPlaceholder' },
      { key: 'remote_address', title: 'openvpn.schema.remoteAddress', type: 'text', placeholder: 'openvpn.schema.remoteAddressPlaceholder' },
    ]);

    const authSchema = computed(() => [
      { key: 'auth_username', title: 'openvpn.schema.authUsername', type: 'text', placeholder: 'openvpn.schema.authUsernamePlaceholder' },
      { key: 'auth_password', title: 'openvpn.schema.authPassword', type: 'password', placeholder: 'openvpn.schema.authPasswordPlaceholder' },
    ]);

    const encryptionSchema = computed(() => [
      { key: 'encryption_cipher', title: 'openvpn.schema.encryptionCipher', type: 'select', options: CIPHER_OPTIONS },
      { key: 'encryption_data_ciphers', title: 'openvpn.schema.encryptionDataCiphers', type: 'select', options: CIPHER_OPTIONS, placeholder: 'openvpn.schema.encryptionDataCiphersPlaceholder', help: 'openvpn.schema.encryptionDataCiphersHelp' },
      { key: 'encryption_data_ciphers_fallback', title: 'openvpn.schema.encryptionDataCiphersFallback', type: 'select', options: CIPHER_OPTIONS },
      { key: 'hash', title: 'openvpn.schema.hash', type: 'select', options: HASH_OPTIONS },
    ]);

    const keepAliveSchema = computed(() => [
      { key: 'keepalive_failure_count', title: 'openvpn.schema.keepaliveFailureCount', type: 'number', min: 0, max: 1000, placeholder: 'openvpn.schema.keepaliveFailureCountPlaceholder', help: '范围: 0-1000；默认值: 60' },
      { key: 'keepalive_interval', title: 'openvpn.schema.keepaliveInterval', type: 'number', min: 0, max: 600, placeholder: 'openvpn.schema.keepaliveIntervalPlaceholder', help: '范围: 0-600；默认值: 10 秒' },
    ]);

    const offloadSchema = computed(() => [
      { key: 'offload_dco', title: 'openvpn.schema.offloadDco', type: 'checkbox', help: 'openvpn.schema.offloadDcoHelp' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: 'openvpn.schema.mirrorEgress', type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: 'openvpn.schema.mirrorPlaceholder', help: 'openvpn.schema.mirrorEgressHelp' },
      { key: 'mirror_ingress', title: 'openvpn.schema.mirrorIngress', type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: 'openvpn.schema.mirrorPlaceholder', help: 'openvpn.schema.mirrorIngressHelp' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: 'openvpn.schema.ipAdjustMss', type: 'text', placeholder: 'openvpn.schema.ipAdjustMssPlaceholder', help: 'openvpn.schema.ipAdjustMssHelp' },
      { key: 'ip_arp_cache_timeout', title: 'openvpn.schema.ipArpCacheTimeout', type: 'number', min: 1, max: 86400, placeholder: 'openvpn.schema.ipArpCacheTimeoutPlaceholder', help: 'openvpn.schema.ipArpCacheTimeoutHelp' },
      { key: 'ip_disable_arp_filter', title: 'openvpn.schema.ipDisableArpFilter', type: 'checkbox' },
      { key: 'ip_disable_forwarding', title: 'openvpn.schema.ipDisableForwarding', type: 'checkbox' },
      { key: 'ip_enable_arp_accept', title: 'openvpn.schema.ipEnableArpAccept', type: 'checkbox' },
      { key: 'ip_enable_arp_announce', title: 'openvpn.schema.ipEnableArpAnnounce', type: 'checkbox' },
      { key: 'ip_enable_arp_ignore', title: 'openvpn.schema.ipEnableArpIgnore', type: 'checkbox' },
      { key: 'ip_enable_directed_broadcast', title: 'openvpn.schema.ipEnableDirectedBroadcast', type: 'checkbox' },
      { key: 'ip_enable_proxy_arp', title: 'openvpn.schema.ipEnableProxyArp', type: 'checkbox' },
      { key: 'ip_proxy_arp_pvlan', title: 'openvpn.schema.ipProxyArpPvlan', type: 'checkbox' },
      { key: 'ip_source_validation', title: 'openvpn.schema.ipSourceValidation', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: 'openvpn.schema.ipSourceValidationPlaceholder' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: 'openvpn.schema.ipv6AcceptDad', type: 'select', options: acceptDadOptions.value, help: 'openvpn.schema.ipv6AcceptDadHelp' },
      { key: 'ipv6_address_autoconf', title: 'openvpn.schema.ipv6AddressAutoconf', type: 'checkbox', help: 'openvpn.schema.ipv6AddressAutoconfHelp' },
      { key: 'ipv6_address_eui64', title: 'openvpn.schema.ipv6AddressEui64', type: 'text', placeholder: 'openvpn.schema.ipv6AddressEui64Placeholder' },
      { key: 'ipv6_address_iface_id', title: 'openvpn.schema.ipv6AddressIfaceId', type: 'text', placeholder: 'openvpn.schema.ipv6AddressIfaceIdPlaceholder' },
      { key: 'ipv6_no_default_link_local', title: 'openvpn.schema.ipv6NoDefaultLinkLocal', type: 'checkbox' },
      { key: 'ipv6_adjust_mss', title: 'openvpn.schema.ipv6AdjustMss', type: 'text', placeholder: 'openvpn.schema.ipv6AdjustMssPlaceholder' },
      { key: 'ipv6_base_reachable_time', title: 'openvpn.schema.ipv6BaseReachableTime', type: 'number', min: 1, max: 86400, placeholder: 'openvpn.schema.ipv6BaseReachableTimePlaceholder', help: 'openvpn.schema.ipv6BaseReachableTimeHelp' },
      { key: 'ipv6_disable_forwarding', title: 'openvpn.schema.ipv6DisableForwarding', type: 'checkbox' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'openvpn.schema.ipv6DupAddrDetectTransmits', type: 'number', min: 0, placeholder: 'openvpn.schema.ipv6DupAddrDetectTransmitsPlaceholder', help: 'openvpn.schema.ipv6DupAddrDetectTransmitsHelp' },
      { key: 'ipv6_source_validation', title: 'openvpn.schema.ipv6SourceValidation', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: 'openvpn.schema.ipv6SourceValidationPlaceholder' },
    ]);

    const serverSchema = computed(() => [
      { key: 'server_bridge_disable', title: 'openvpn.schema.serverBridgeDisable', type: 'checkbox' },
      { key: 'server_bridge_gateway', title: 'openvpn.schema.serverBridgeGateway', type: 'text', placeholder: 'openvpn.schema.serverBridgeGatewayPlaceholder' },
      { key: 'server_bridge_start', title: 'openvpn.schema.serverBridgeStart', type: 'text', placeholder: 'openvpn.schema.serverBridgeStartPlaceholder' },
      { key: 'server_bridge_stop', title: 'openvpn.schema.serverBridgeStop', type: 'text', placeholder: 'openvpn.schema.serverBridgeStopPlaceholder' },
      { key: 'server_bridge_subnet_mask', title: 'openvpn.schema.serverBridgeSubnetMask', type: 'text', placeholder: 'openvpn.schema.serverBridgeSubnetMaskPlaceholder' },
      { key: 'server_client_pool_disable', title: 'openvpn.schema.serverClientPoolDisable', type: 'checkbox' },
      { key: 'server_client_pool_start', title: 'openvpn.schema.serverClientPoolStart', type: 'text', placeholder: 'openvpn.schema.serverClientPoolStartPlaceholder' },
      { key: 'server_client_pool_stop', title: 'openvpn.schema.serverClientPoolStop', type: 'text', placeholder: 'openvpn.schema.serverClientPoolStopPlaceholder' },
      { key: 'server_client_pool_subnet_mask', title: 'openvpn.schema.serverClientPoolSubnetMask', type: 'text', placeholder: 'openvpn.schema.serverClientPoolSubnetMaskPlaceholder' },
      { key: 'server_client_ipv6_pool_base', title: 'openvpn.schema.serverClientIpv6PoolBase', type: 'text', placeholder: 'openvpn.schema.serverClientIpv6PoolBasePlaceholder' },
      { key: 'server_client_ipv6_pool_disable', title: 'openvpn.schema.serverClientIpv6PoolDisable', type: 'checkbox' },
      { key: 'server_domain_name', title: 'openvpn.schema.serverDomainName', type: 'text', placeholder: 'openvpn.schema.serverDomainNamePlaceholder' },
      { key: 'server_max_connections', title: 'openvpn.schema.serverMaxConnections', type: 'number', min: 1, max: 4096, placeholder: 'openvpn.schema.serverMaxConnectionsPlaceholder' },
      { key: 'server_name_server', title: 'openvpn.schema.serverNameServer', type: 'textarea', placeholder: 'openvpn.schema.serverNameServerPlaceholder', help: 'openvpn.schema.serverNameServerHelp' },
      { key: 'server_push_route', title: 'openvpn.schema.serverPushRoute', type: 'textarea', placeholder: 'openvpn.schema.serverPushRoutePlaceholder', help: 'openvpn.schema.serverPushRouteHelp' },
      { key: 'server_reject_unconfigured', title: 'openvpn.schema.serverRejectUnconfigured', type: 'checkbox' },
      { key: 'server_subnet', title: 'openvpn.schema.serverSubnet', type: 'text', placeholder: 'openvpn.schema.serverSubnetPlaceholder' },
      { key: 'server_topology', title: 'openvpn.schema.serverTopology', type: 'select', options: TOPOLOGY_OPTIONS },
    ]);

    const serverMfaSchema = computed(() => [
      { key: 'server_mfa_totp_challenge', title: 'openvpn.schema.serverMfaTotpChallenge', type: 'select', options: MFA_CHALLENGE_OPTIONS },
      { key: 'server_mfa_totp_digits', title: 'openvpn.schema.serverMfaTotpDigits', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.serverMfaTotpDigitsPlaceholder' },
      { key: 'server_mfa_totp_drift', title: 'openvpn.schema.serverMfaTotpDrift', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.serverMfaTotpDriftPlaceholder' },
      { key: 'server_mfa_totp_slop', title: 'openvpn.schema.serverMfaTotpSlop', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.serverMfaTotpSlopPlaceholder' },
      { key: 'server_mfa_totp_step', title: 'openvpn.schema.serverMfaTotpStep', type: 'number', min: 1, max: 65535, placeholder: 'openvpn.schema.serverMfaTotpStepPlaceholder' },
    ]);

    // Server client management
    const serverClients = ref([]);
    const selectedClients = ref([]);
    const editingClientIndex = ref(-1);
    const clientModalVisible = ref(false);
    const clientForm = ref({ name: '', disable: false, ip: '', push_route: '', subnet: '' });
    const deleteSingleClientModalVisible = ref(false);
    const pendingDeleteClientName = ref('');
    const deleteSelectedClientsModalVisible = ref(false);
    const pendingDeleteClientNames = ref([]);

    const clientColumns = [
      { key: 'name', title: 'openvpn.clientColumns.name', width: 150 },
      { key: 'disable', title: 'openvpn.clientColumns.disable', width: 80 },
      { key: 'ip', title: 'openvpn.clientColumns.ip', width: 140 },
      { key: 'push_route', title: 'openvpn.clientColumns.pushRoute', width: 200 },
      { key: 'subnet', title: 'openvpn.clientColumns.subnet', width: 140 },
      { key: 'actions', title: 'app.actions', width: 120 },
    ];

    function addClient() {
      clientForm.value = { name: '', disable: false, ip: '', push_route: '', subnet: '' };
      editingClientIndex.value = -1;
      clientModalVisible.value = true;
    }

    function editClient(index) {
      clientForm.value = JSON.parse(JSON.stringify(serverClients.value[index]));
      editingClientIndex.value = index;
      clientModalVisible.value = true;
    }

    function saveClient() {
      if (!clientForm.value.name) {
        showError(t('openvpn.clientNameRequired'));
        return;
      }
      const clientData = JSON.parse(JSON.stringify(clientForm.value));
      console.log('[OpenVPN] Save client:', JSON.stringify(clientData, null, 2));
      if (editingClientIndex.value >= 0) {
        console.log('[OpenVPN] Update client index:', editingClientIndex.value, 'original:', JSON.stringify(serverClients.value[editingClientIndex.value]));
        serverClients.value[editingClientIndex.value] = clientData;
        console.log('[OpenVPN] Updated client list:', JSON.stringify(serverClients.value, null, 2));
      } else {
        console.log('[OpenVPN] Add new client');
        serverClients.value.push(clientData);
        console.log('[OpenVPN] Client list after add:', JSON.stringify(serverClients.value, null, 2));
      }
      clientModalVisible.value = false;
    }

    function deleteClient(index) {
      if (index >= 0) {
        const clientToDelete = serverClients.value[index];
        console.log('[OpenVPN] Delete client index:', index, 'client:', JSON.stringify(clientToDelete));
        pendingDeleteClientName.value = clientToDelete.name;
        deleteSingleClientModalVisible.value = true;
      } else if (selectedClients.value.length > 0) {
        const namesToDelete = selectedClients.value.map(c => c.name);
        console.log('[OpenVPN] Batch delete clients:', namesToDelete);
        pendingDeleteClientNames.value = namesToDelete;
        deleteSelectedClientsModalVisible.value = true;
      } else {
        showError(t('openvpn.selectClientFirst'));
      }
    }

    function confirmDeleteSingleClient() {
      const index = serverClients.value.findIndex(c => c.name === pendingDeleteClientName.value);
      if (index >= 0) {
        serverClients.value.splice(index, 1);
        console.log('[OpenVPN] Client list after delete:', JSON.stringify(serverClients.value, null, 2));
      }
      deleteSingleClientModalVisible.value = false;
      pendingDeleteClientName.value = '';
    }

    function confirmDeleteSelectedClients() {
      serverClients.value = serverClients.value.filter(c => !pendingDeleteClientNames.value.includes(c.name));
      selectedClients.value = [];
      console.log('[OpenVPN] Client list after batch delete:', JSON.stringify(serverClients.value, null, 2));
      deleteSelectedClientsModalVisible.value = false;
      pendingDeleteClientNames.value = [];
    }

    const tlsSchema = computed(() => [
      { key: 'tls_auth_key', title: 'openvpn.schema.tlsAuthKey', type: 'text', placeholder: 'openvpn.schema.tlsAuthKeyPlaceholder' },
      { key: 'tls_ca_certificate', title: 'openvpn.schema.tlsCaCertificate', type: 'text', placeholder: 'openvpn.schema.tlsCaCertificatePlaceholder' },
      { key: 'tls_certificate', title: 'openvpn.schema.tlsCertificate', type: 'text', placeholder: 'openvpn.schema.tlsCertificatePlaceholder' },
      { key: 'tls_crypt_key', title: 'openvpn.schema.tlsCryptKey', type: 'text', placeholder: 'openvpn.schema.tlsCryptKeyPlaceholder' },
      { key: 'tls_dh_params', title: 'openvpn.schema.tlsDhParams', type: 'text', placeholder: 'openvpn.schema.tlsDhParamsPlaceholder', help: 'openvpn.schema.tlsDhParamsHelp' },
      { key: 'tls_peer_fingerprint', title: 'openvpn.schema.tlsPeerFingerprint', type: 'text', placeholder: 'openvpn.schema.tlsPeerFingerprintPlaceholder' },
      { key: 'tls_role', title: 'openvpn.schema.tlsRole', type: 'select', options: TLS_ROLE_OPTIONS, placeholder: 'openvpn.schema.tlsRolePlaceholder' },
      { key: 'tls_version_min', title: 'openvpn.schema.tlsVersionMin', type: 'select', options: TLS_VERSION_OPTIONS },
    ]);

    const replaceRouteSchema = computed(() => [
      { key: 'replace_default_route_local', title: 'openvpn.schema.replaceDefaultRouteLocal', type: 'text', placeholder: 'openvpn.schema.replaceDefaultRouteLocalPlaceholder' },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const t = editingItem.value;
      const cmds = [];
      const base = `set interfaces openvpn ${t.name}`;

      if (t.description) cmds.push(`${base} description "${t.description}"`);
      if (t.device_type && t.device_type !== 'tun') cmds.push(`${base} device-type ${t.device_type}`);
      if (t.disable) cmds.push(`${base} disable`);
      if (t.ip_version && t.ip_version !== 'auto') cmds.push(`${base} ip-version ${t.ip_version}`);
      if (t.mode) cmds.push(`${base} mode ${t.mode}`);
      if (t.protocol && t.protocol !== 'udp') cmds.push(`${base} protocol ${t.protocol}`);
      if (t.persistent_tunnel) cmds.push(`${base} persistent-tunnel`);
      if (t.shared_secret_key) cmds.push(`${base} shared-secret-key ${t.shared_secret_key}`);
      if (t.use_lzo_compression) cmds.push(`${base} use-lzo-compression`);
      if (t.vrf) cmds.push(`${base} vrf ${t.vrf}`);
      if (t.openvpn_option) {
        const opts = (t.openvpn_option || '').split('\n').filter(Boolean);
        opts.forEach(o => cmds.push(`${base} openvpn-option "${o.trim()}"`));
      }
      if (t.local_host) cmds.push(`${base} local-host ${t.local_host}`);
      if (t.local_port) cmds.push(`${base} local-port ${t.local_port}`);
      if (t.remote_host) cmds.push(`${base} remote-host ${t.remote_host}`);
      if (t.remote_port) cmds.push(`${base} remote-port ${t.remote_port}`);
      if (t.redirect) cmds.push(`${base} redirect ${t.redirect}`);
      if (t.local_address) {
        cmds.push(`${base} local-address ${t.local_address}`);
        if (t.local_subnet_mask) cmds.push(`${base} local-address ${t.local_address} subnet-mask ${t.local_subnet_mask}`);
      }
      if (t.remote_address) cmds.push(`${base} remote-address ${t.remote_address}`);

      if (t.auth_username) cmds.push(`${base} authentication username ${t.auth_username}`);
      if (t.auth_password) cmds.push(`${base} authentication password ${t.auth_password}`);

      if (t.encryption_cipher) cmds.push(`${base} encryption cipher ${t.encryption_cipher}`);
      if (t.encryption_data_ciphers) cmds.push(`${base} encryption data-ciphers ${t.encryption_data_ciphers}`);
      if (t.encryption_data_ciphers_fallback) cmds.push(`${base} encryption data-ciphers-fallback ${t.encryption_data_ciphers_fallback}`);
      if (t.hash) cmds.push(`${base} hash ${t.hash}`);

      if (t.keepalive_failure_count && t.keepalive_failure_count !== '60') cmds.push(`${base} keep-alive failure-count ${t.keepalive_failure_count}`);
      if (t.keepalive_interval && t.keepalive_interval !== '10') cmds.push(`${base} keep-alive interval ${t.keepalive_interval}`);

      if (t.offload_dco) cmds.push(`${base} offload dco`);

      if (t.mirror_egress) cmds.push(`${base} mirror egress ${t.mirror_egress}`);
      if (t.mirror_ingress) cmds.push(`${base} mirror ingress ${t.mirror_ingress}`);

      if (t.ip_adjust_mss) cmds.push(`${base} ip adjust-mss ${t.ip_adjust_mss}`);
      if (t.ip_arp_cache_timeout) cmds.push(`${base} ip arp-cache-timeout ${t.ip_arp_cache_timeout}`);
      if (t.ip_disable_arp_filter) cmds.push(`${base} ip disable-arp-filter`);
      if (t.ip_disable_forwarding) cmds.push(`${base} ip disable-forwarding`);
      if (t.ip_enable_arp_accept) cmds.push(`${base} ip enable-arp-accept`);
      if (t.ip_enable_arp_announce) cmds.push(`${base} ip enable-arp-announce`);
      if (t.ip_enable_arp_ignore) cmds.push(`${base} ip enable-arp-ignore`);
      if (t.ip_enable_directed_broadcast) cmds.push(`${base} ip enable-directed-broadcast`);
      if (t.ip_enable_proxy_arp) cmds.push(`${base} ip enable-proxy-arp`);
      if (t.ip_proxy_arp_pvlan) cmds.push(`${base} ip proxy-arp-pvlan`);
      if (t.ip_source_validation) cmds.push(`${base} ip source-validation ${t.ip_source_validation}`);

      if (t.ipv6_accept_dad && t.ipv6_accept_dad !== '1') cmds.push(`${base} ipv6 accept-dad ${t.ipv6_accept_dad}`);
      if (t.ipv6_address_autoconf) cmds.push(`${base} ipv6 address autoconf`);
      if (t.ipv6_address_eui64) cmds.push(`${base} ipv6 address eui64 ${t.ipv6_address_eui64}`);
      if (t.ipv6_address_iface_id) cmds.push(`${base} ipv6 address interface-identifier ${t.ipv6_address_iface_id}`);
      if (t.ipv6_no_default_link_local) cmds.push(`${base} ipv6 address no-default-link-local`);
      if (t.ipv6_adjust_mss) cmds.push(`${base} ipv6 adjust-mss ${t.ipv6_adjust_mss}`);
      if (t.ipv6_base_reachable_time) cmds.push(`${base} ipv6 base-reachable-time ${t.ipv6_base_reachable_time}`);
      if (t.ipv6_disable_forwarding) cmds.push(`${base} ipv6 disable-forwarding`);
      if (t.ipv6_dup_addr_detect_transmits && t.ipv6_dup_addr_detect_transmits !== '1') cmds.push(`${base} ipv6 dup-addr-detect-transmits ${t.ipv6_dup_addr_detect_transmits}`);
      if (t.ipv6_source_validation) cmds.push(`${base} ipv6 source-validation ${t.ipv6_source_validation}`);

      if (t.mode === 'server') {
        if (t.server_bridge_disable) cmds.push(`${base} server bridge disable`);
        if (t.server_bridge_gateway) cmds.push(`${base} server bridge gateway ${t.server_bridge_gateway}`);
        if (t.server_bridge_start) cmds.push(`${base} server bridge start ${t.server_bridge_start}`);
        if (t.server_bridge_stop) cmds.push(`${base} server bridge stop ${t.server_bridge_stop}`);
        if (t.server_bridge_subnet_mask) cmds.push(`${base} server bridge subnet-mask ${t.server_bridge_subnet_mask}`);
        if (t.server_client_pool_disable) cmds.push(`${base} server client-ip-pool disable`);
        if (t.server_client_pool_start) cmds.push(`${base} server client-ip-pool start ${t.server_client_pool_start}`);
        if (t.server_client_pool_stop) cmds.push(`${base} server client-ip-pool stop ${t.server_client_pool_stop}`);
        if (t.server_client_pool_subnet_mask) cmds.push(`${base} server client-ip-pool subnet-mask ${t.server_client_pool_subnet_mask}`);
        if (t.server_client_ipv6_pool_base) cmds.push(`${base} server client-ipv6-pool base ${t.server_client_ipv6_pool_base}`);
        if (t.server_client_ipv6_pool_disable) cmds.push(`${base} server client-ipv6-pool disable`);
        if (t.server_domain_name) cmds.push(`${base} server domain-name ${t.server_domain_name}`);
        if (t.server_max_connections) cmds.push(`${base} server max-connections ${t.server_max_connections}`);
        if (t.server_name_server) {
          const ns = (t.server_name_server || '').split('\n').filter(Boolean);
          ns.forEach(n => cmds.push(`${base} server name-server ${n.trim()}`));
        }
        if (t.server_push_route) {
          const routes = (t.server_push_route || '').split('\n').filter(Boolean);
          routes.forEach(r => {
            const trimmed = r.trim();
            // Format: "10.0.0.0/24 metric 100" or just "10.0.0.0/24"
            const match = trimmed.match(/^(.+?)\s+metric\s+(\d+)$/i);
            if (match) {
              cmds.push(`${base} server push-route ${match[1]} metric ${match[2]}`);
            } else {
              cmds.push(`${base} server push-route ${trimmed}`);
            }
          });
        }
        if (t.server_reject_unconfigured) cmds.push(`${base} server reject-unconfigured-clients`);
        if (t.server_subnet) cmds.push(`${base} server subnet ${t.server_subnet}`);
        if (t.server_topology && t.server_topology !== 'subnet') cmds.push(`${base} server topology ${t.server_topology}`);

        if (t.server_mfa_totp_challenge && t.server_mfa_totp_challenge !== 'enable') cmds.push(`${base} server mfa totp challenge ${t.server_mfa_totp_challenge}`);
        if (t.server_mfa_totp_digits && t.server_mfa_totp_digits !== '6') cmds.push(`${base} server mfa totp digits ${t.server_mfa_totp_digits}`);
        if (t.server_mfa_totp_drift && t.server_mfa_totp_drift !== '0') cmds.push(`${base} server mfa totp drift ${t.server_mfa_totp_drift}`);
        if (t.server_mfa_totp_slop && t.server_mfa_totp_slop !== '180') cmds.push(`${base} server mfa totp slop ${t.server_mfa_totp_slop}`);
        if (t.server_mfa_totp_step && t.server_mfa_totp_step !== '30') cmds.push(`${base} server mfa totp step ${t.server_mfa_totp_step}`);

        if (t.server_clients && t.server_clients.length) {
          t.server_clients.forEach(c => {
            const cBase = `${base} server client ${c.name}`;
            if (c.disable) cmds.push(`${cBase} disable`);
            if (c.ip) cmds.push(`${cBase} ip ${c.ip}`);
            if (c.push_route) {
              const routes = c.push_route.split('\n').filter(Boolean);
              routes.forEach(r => {
                const trimmed = r.trim();
                const match = trimmed.match(/^(.+?)\s+metric\s+(\d+)$/i);
                if (match) {
                  cmds.push(`${cBase} push-route ${match[1]} metric ${match[2]}`);
                } else {
                  cmds.push(`${cBase} push-route ${trimmed}`);
                }
              });
            }
            if (c.subnet) cmds.push(`${cBase} subnet ${c.subnet}`);
          });
        }
      }

      if (t.tls_auth_key) cmds.push(`${base} tls auth-key ${t.tls_auth_key}`);
      if (t.tls_ca_certificate) cmds.push(`${base} tls ca-certificate ${t.tls_ca_certificate}`);
      if (t.tls_certificate) cmds.push(`${base} tls certificate ${t.tls_certificate}`);
      if (t.tls_crypt_key) cmds.push(`${base} tls crypt-key ${t.tls_crypt_key}`);
      if (t.tls_dh_params) cmds.push(`${base} tls dh-params ${t.tls_dh_params}`);
      if (t.tls_peer_fingerprint) cmds.push(`${base} tls peer-fingerprint ${t.tls_peer_fingerprint}`);
      if (t.tls_role) cmds.push(`${base} tls role ${t.tls_role}`);
      if (t.tls_version_min) cmds.push(`${base} tls tls-version-min ${t.tls_version_min}`);

      if (t.replace_default_route_local) cmds.push(`${base} replace-default-route local ${t.replace_default_route_local}`);

      return cmds.join('\n');
    });

    function configToForm(cfg, name) {
      const auth = cfg.authentication || {};
      const encryption = cfg.encryption || {};
      const keepalive = cfg['keep-alive'] || {};
      const offload = cfg.offload || {};
      const mirror = cfg.mirror || {};
      const ip = cfg.ip || {};
      const ipv6 = cfg.ipv6 || {};
      const server = cfg.server || {};
      const serverBridge = server.bridge || {};
      const serverClientPool = server['client-ip-pool'] || {};
      const serverClientIpv6Pool = server['client-ipv6-pool'] || {};
      const serverMfa = server.mfa?.totp || {};
      const serverClients = toArray(server.client).map(c => ({
        name: c.name || '',
        disable: !!c.disable || c.disable === '',
        ip: c.ip || '',
        push_route: toArray(c['push-route']).join('\n'),
        subnet: c.subnet || '',
      }));
      const tls = cfg.tls || {};
      const replaceRoute = cfg['replace-default-route'] || {};

      const ipv6Addresses = toArray(ipv6.address);

      return {
        name: name || '',
        description: cfg.description || '',
        device_type: cfg['device-type'] || '',
        disable: !!cfg.disable || cfg.disable === '',
        ip_version: cfg['ip-version'] || '',
        mode: cfg.mode || '',
        protocol: cfg.protocol || '',
        persistent_tunnel: !!cfg['persistent-tunnel'] || cfg['persistent-tunnel'] === '',
        shared_secret_key: cfg['shared-secret-key'] || '',
        use_lzo_compression: !!cfg['use-lzo-compression'] || cfg['use-lzo-compression'] === '',
        vrf: cfg.vrf || '',
        openvpn_option: toArray(cfg['openvpn-option']).join('\n'),
        local_host: cfg['local-host'] || '',
        local_port: cfg['local-port'] || '',
        remote_host: cfg['remote-host'] || '',
        remote_port: cfg['remote-port'] || '',
        redirect: cfg.redirect || '',
        local_address: typeof cfg['local-address'] === 'object' ? Object.keys(cfg['local-address'])[0] || '' : (cfg['local-address'] || ''),
        local_subnet_mask: typeof cfg['local-address'] === 'object' ? (cfg['local-address'][Object.keys(cfg['local-address'])[0]]?.['subnet-mask'] || '') : '',
        remote_address: cfg['remote-address'] || '',
        auth_username: auth.username || '',
        auth_password: auth.password || '',
        encryption_cipher: encryption.cipher || '',
        encryption_data_ciphers: encryption['data-ciphers'] || '',
        encryption_data_ciphers_fallback: encryption['data-ciphers-fallback'] || '',
        hash: cfg.hash || '',
        keepalive_failure_count: keepalive['failure-count'] !== undefined ? String(keepalive['failure-count']) : '',
        keepalive_interval: keepalive.interval !== undefined ? String(keepalive.interval) : '',
        offload_dco: !!offload.dco || offload.dco === '',
        mirror_egress: mirror.egress || '',
        mirror_ingress: mirror.ingress || '',
        ip_adjust_mss: ip['adjust-mss'] || '',
        ip_arp_cache_timeout: ip['arp-cache-timeout'] || '',
        ip_disable_arp_filter: !!ip['disable-arp-filter'] || ip['disable-arp-filter'] === '',
        ip_disable_forwarding: !!ip['disable-forwarding'] || ip['disable-forwarding'] === '',
        ip_enable_arp_accept: !!ip['enable-arp-accept'] || ip['enable-arp-accept'] === '',
        ip_enable_arp_announce: !!ip['enable-arp-announce'] || ip['enable-arp-announce'] === '',
        ip_enable_arp_ignore: !!ip['enable-arp-ignore'] || ip['enable-arp-ignore'] === '',
        ip_enable_directed_broadcast: !!ip['enable-directed-broadcast'] || ip['enable-directed-broadcast'] === '',
        ip_enable_proxy_arp: !!ip['enable-proxy-arp'] || ip['enable-proxy-arp'] === '',
        ip_proxy_arp_pvlan: !!ip['proxy-arp-pvlan'] || ip['proxy-arp-pvlan'] === '',
        ip_source_validation: ip['source-validation'] || '',
        ipv6_accept_dad: ipv6['accept-dad'] !== undefined ? String(ipv6['accept-dad']) : '',
        ipv6_address_autoconf: ipv6Addresses.includes('autoconf'),
        ipv6_address_eui64: ipv6Addresses.find(a => typeof a === 'object' && a.eui64)?.eui64 || '',
        ipv6_address_iface_id: ipv6Addresses.find(a => typeof a === 'object' && a['interface-identifier'])?.['interface-identifier'] || '',
        ipv6_no_default_link_local: ipv6Addresses.includes('no-default-link-local'),
        ipv6_adjust_mss: ipv6['adjust-mss'] || '',
        ipv6_base_reachable_time: ipv6['base-reachable-time'] || '',
        ipv6_disable_forwarding: !!ipv6['disable-forwarding'] || ipv6['disable-forwarding'] === '',
        ipv6_dup_addr_detect_transmits: ipv6['dup-addr-detect-transmits'] !== undefined ? String(ipv6['dup-addr-detect-transmits']) : '',
        ipv6_source_validation: ipv6['source-validation'] || '',
        server_bridge_disable: !!serverBridge.disable || serverBridge.disable === '',
        server_bridge_gateway: serverBridge.gateway || '',
        server_bridge_start: serverBridge.start || '',
        server_bridge_stop: serverBridge.stop || '',
        server_bridge_subnet_mask: serverBridge['subnet-mask'] || '',
        server_client_pool_disable: !!serverClientPool.disable || serverClientPool.disable === '',
        server_client_pool_start: serverClientPool.start || '',
        server_client_pool_stop: serverClientPool.stop || '',
        server_client_pool_subnet_mask: serverClientPool['subnet-mask'] || '',
        server_client_ipv6_pool_base: serverClientIpv6Pool.base || '',
        server_client_ipv6_pool_disable: !!serverClientIpv6Pool.disable || serverClientIpv6Pool.disable === '',
        server_domain_name: server['domain-name'] || '',
        server_max_connections: server['max-connections'] || '',
        server_name_server: toArray(server['name-server']).join('\n'),
        server_push_route: toArray(server['push-route']).join('\n'),
        server_reject_unconfigured: !!server['reject-unconfigured-clients'] || server['reject-unconfigured-clients'] === '',
        server_subnet: server.subnet || '',
        server_topology: server.topology || '',
        server_clients: serverClients,
        server_mfa_totp_challenge: serverMfa.challenge || '',
        server_mfa_totp_digits: serverMfa.digits !== undefined ? String(serverMfa.digits) : '6',
        server_mfa_totp_drift: serverMfa.drift !== undefined ? String(serverMfa.drift) : '0',
        server_mfa_totp_slop: serverMfa.slop !== undefined ? String(serverMfa.slop) : '180',
        server_mfa_totp_step: serverMfa.step !== undefined ? String(serverMfa.step) : '30',
        tls_auth_key: tls['auth-key'] || '',
        tls_ca_certificate: tls['ca-certificate'] || '',
        tls_certificate: tls.certificate || '',
        tls_crypt_key: tls['crypt-key'] || '',
        tls_dh_params: tls['dh-params'] || '',
        tls_peer_fingerprint: tls['peer-fingerprint'] || '',
        tls_role: tls.role || '',
        tls_version_min: tls['tls-version-min'] || '',
        replace_default_route_local: replaceRoute.local || '',
      };
    }

    function formToConfig(form) {
      const value = {};

      if (form.description) value.description = form.description;
      if (form.device_type && form.device_type !== 'tun') value['device-type'] = form.device_type;
      if (form.disable) value.disable = '';
      if (form.ip_version && form.ip_version !== 'auto') value['ip-version'] = form.ip_version;
      if (form.mode) value.mode = form.mode;
      if (form.protocol && form.protocol !== 'udp') value.protocol = form.protocol;
      if (form.persistent_tunnel) value['persistent-tunnel'] = '';
      if (form.shared_secret_key) value['shared-secret-key'] = form.shared_secret_key;
      if (form.use_lzo_compression) value['use-lzo-compression'] = '';
      if (form.vrf) value.vrf = form.vrf;

      const openvpnOpts = (form.openvpn_option || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (openvpnOpts.length) value['openvpn-option'] = openvpnOpts;

      if (form.local_host) value['local-host'] = form.local_host;
      if (form.local_port) value['local-port'] = String(form.local_port);
      if (form.remote_host) value['remote-host'] = form.remote_host;
      if (form.remote_port) value['remote-port'] = String(form.remote_port);
      if (form.redirect) value.redirect = form.redirect;
      if (form.local_address) {
        if (form.local_subnet_mask) {
          value['local-address'] = { [form.local_address]: { 'subnet-mask': form.local_subnet_mask } };
        } else {
          value['local-address'] = form.local_address;
        }
      }
      if (form.remote_address) value['remote-address'] = form.remote_address;

      const auth = {};
      if (form.auth_username) auth.username = form.auth_username;
      if (form.auth_password) auth.password = form.auth_password;
      if (Object.keys(auth).length) value.authentication = auth;

      const encryption = {};
      if (form.encryption_cipher) encryption.cipher = form.encryption_cipher;
      if (form.encryption_data_ciphers) encryption['data-ciphers'] = form.encryption_data_ciphers;
      if (form.encryption_data_ciphers_fallback) encryption['data-ciphers-fallback'] = form.encryption_data_ciphers_fallback;
      if (Object.keys(encryption).length) value.encryption = encryption;

      if (form.hash) value.hash = form.hash;

      const keepalive = {};
      if (form.keepalive_failure_count && form.keepalive_failure_count !== '60') keepalive['failure-count'] = form.keepalive_failure_count;
      if (form.keepalive_interval && form.keepalive_interval !== '10') keepalive.interval = form.keepalive_interval;
      if (Object.keys(keepalive).length) value['keep-alive'] = keepalive;

      if (form.offload_dco) value.offload = { dco: '' };

      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) value.mirror = mirror;

      const ip = {};
      if (form.ip_adjust_mss) ip['adjust-mss'] = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout) ip['arp-cache-timeout'] = String(form.ip_arp_cache_timeout);
      if (form.ip_disable_arp_filter) ip['disable-arp-filter'] = '';
      if (form.ip_disable_forwarding) ip['disable-forwarding'] = '';
      if (form.ip_enable_arp_accept) ip['enable-arp-accept'] = '';
      if (form.ip_enable_arp_announce) ip['enable-arp-announce'] = '';
      if (form.ip_enable_arp_ignore) ip['enable-arp-ignore'] = '';
      if (form.ip_enable_directed_broadcast) ip['enable-directed-broadcast'] = '';
      if (form.ip_enable_proxy_arp) ip['enable-proxy-arp'] = '';
      if (form.ip_proxy_arp_pvlan) ip['proxy-arp-pvlan'] = '';
      if (form.ip_source_validation) ip['source-validation'] = form.ip_source_validation;
      if (Object.keys(ip).length) value.ip = ip;

      const ipv6 = {};
      if (form.ipv6_accept_dad && form.ipv6_accept_dad !== '1') ipv6['accept-dad'] = form.ipv6_accept_dad;
      const ipv6Addrs = [];
      if (form.ipv6_address_autoconf) ipv6Addrs.push('autoconf');
      if (form.ipv6_address_eui64) ipv6Addrs.push({ eui64: form.ipv6_address_eui64 });
      if (form.ipv6_address_iface_id) ipv6Addrs.push({ 'interface-identifier': form.ipv6_address_iface_id });
      if (form.ipv6_no_default_link_local) ipv6Addrs.push('no-default-link-local');
      if (ipv6Addrs.length) ipv6.address = ipv6Addrs;
      if (form.ipv6_adjust_mss) ipv6['adjust-mss'] = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6['base-reachable-time'] = String(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6['disable-forwarding'] = '';
      if (form.ipv6_dup_addr_detect_transmits && form.ipv6_dup_addr_detect_transmits !== '1') {
        ipv6['dup-addr-detect-transmits'] = form.ipv6_dup_addr_detect_transmits;
      }
      if (form.ipv6_source_validation) ipv6['source-validation'] = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) value.ipv6 = ipv6;

      if (form.mode === 'server') {
        const server = {};

        const bridge = {};
        if (form.server_bridge_disable) bridge.disable = '';
        if (form.server_bridge_gateway) bridge.gateway = form.server_bridge_gateway;
        if (form.server_bridge_start) bridge.start = form.server_bridge_start;
        if (form.server_bridge_stop) bridge.stop = form.server_bridge_stop;
        if (form.server_bridge_subnet_mask) bridge['subnet-mask'] = form.server_bridge_subnet_mask;
        if (Object.keys(bridge).length) server.bridge = bridge;

        const clientPool = {};
        if (form.server_client_pool_disable) clientPool.disable = '';
        if (form.server_client_pool_start) clientPool.start = form.server_client_pool_start;
        if (form.server_client_pool_stop) clientPool.stop = form.server_client_pool_stop;
        if (form.server_client_pool_subnet_mask) clientPool['subnet-mask'] = form.server_client_pool_subnet_mask;
        if (Object.keys(clientPool).length) server['client-ip-pool'] = clientPool;

        const clientIpv6Pool = {};
        if (form.server_client_ipv6_pool_base) clientIpv6Pool.base = form.server_client_ipv6_pool_base;
        if (form.server_client_ipv6_pool_disable) clientIpv6Pool.disable = '';
        if (Object.keys(clientIpv6Pool).length) server['client-ipv6-pool'] = clientIpv6Pool;

        if (form.server_domain_name) server['domain-name'] = form.server_domain_name;
        if (form.server_max_connections) server['max-connections'] = String(form.server_max_connections);

        const nameServers = (form.server_name_server || '').split('\n').map(s => s.trim()).filter(Boolean);
        if (nameServers.length) server['name-server'] = nameServers;

        const pushRoutes = (form.server_push_route || '').split('\n').map(s => s.trim()).filter(Boolean);
        if (pushRoutes.length) server['push-route'] = pushRoutes;

        if (form.server_reject_unconfigured) server['reject-unconfigured-clients'] = '';
        if (form.server_subnet) server.subnet = form.server_subnet;
        if (form.server_topology && form.server_topology !== 'subnet') server.topology = form.server_topology;

        const mfaTotp = {};
        if (form.server_mfa_totp_challenge && form.server_mfa_totp_challenge !== 'enable') mfaTotp.challenge = form.server_mfa_totp_challenge;
        if (form.server_mfa_totp_digits && form.server_mfa_totp_digits !== '6') mfaTotp.digits = form.server_mfa_totp_digits;
        if (form.server_mfa_totp_drift && form.server_mfa_totp_drift !== '0') mfaTotp.drift = form.server_mfa_totp_drift;
        if (form.server_mfa_totp_slop && form.server_mfa_totp_slop !== '180') mfaTotp.slop = form.server_mfa_totp_slop;
        if (form.server_mfa_totp_step && form.server_mfa_totp_step !== '30') mfaTotp.step = form.server_mfa_totp_step;
        if (Object.keys(mfaTotp).length) {
          server.mfa = { totp: mfaTotp };
        }

        const clients = (form.server_clients || []).map(c => {
          const client = {};
          if (c.disable) client.disable = '';
          if (c.ip) client.ip = c.ip;
          const clientPushRoutes = (c.push_route || '').split('\n').map(s => s.trim()).filter(Boolean);
          if (clientPushRoutes.length) client['push-route'] = clientPushRoutes;
          if (c.subnet) client.subnet = c.subnet;
          return { name: c.name, ...client };
        });
        if (clients.length) server.client = clients;

        if (Object.keys(server).length) value.server = server;
      }

      const tls = {};
      if (form.tls_auth_key) tls['auth-key'] = form.tls_auth_key;
      if (form.tls_ca_certificate) tls['ca-certificate'] = form.tls_ca_certificate;
      if (form.tls_certificate) tls.certificate = form.tls_certificate;
      if (form.tls_crypt_key) tls['crypt-key'] = form.tls_crypt_key;
      if (form.tls_dh_params) tls['dh-params'] = form.tls_dh_params;
      if (form.tls_peer_fingerprint) tls['peer-fingerprint'] = form.tls_peer_fingerprint;
      if (form.tls_role) tls.role = form.tls_role;
      if (form.tls_version_min) tls['tls-version-min'] = form.tls_version_min;
      if (Object.keys(tls).length) value.tls = tls;

      if (form.replace_default_route_local) {
        value['replace-default-route'] = { local: form.replace_default_route_local };
      }

      return value;
    }

    function getDefaultForm() {
      return {
        name: '',
        description: '',
        device_type: '',
        disable: false,
        ip_version: '',
        mode: '',
        protocol: '',
        persistent_tunnel: false,
        shared_secret_key: '',
        use_lzo_compression: false,
        vrf: '',
        openvpn_option: '',
        local_host: '',
        local_port: '',
        remote_host: '',
        remote_port: '',
        redirect: '',
        local_address: '',
        local_subnet_mask: '',
        remote_address: '',
        auth_username: '',
        auth_password: '',
        encryption_cipher: '',
        encryption_data_ciphers: '',
        encryption_data_ciphers_fallback: '',
        hash: '',
        keepalive_failure_count: '',
        keepalive_interval: '',
        offload_dco: false,
        mirror_egress: '',
        mirror_ingress: '',
        ip_adjust_mss: '',
        ip_arp_cache_timeout: '',
        ip_disable_arp_filter: false,
        ip_disable_forwarding: false,
        ip_enable_arp_accept: false,
        ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false,
        ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false,
        ip_proxy_arp_pvlan: false,
        ip_source_validation: '',
        ipv6_accept_dad: '',
        ipv6_address_autoconf: false,
        ipv6_address_eui64: '',
        ipv6_address_iface_id: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '',
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '',
        ipv6_source_validation: '',
        server_bridge_disable: false,
        server_bridge_gateway: '',
        server_bridge_start: '',
        server_bridge_stop: '',
        server_bridge_subnet_mask: '',
        server_client_pool_disable: false,
        server_client_pool_start: '',
        server_client_pool_stop: '',
        server_client_pool_subnet_mask: '',
        server_client_ipv6_pool_base: '',
        server_client_ipv6_pool_disable: false,
        server_domain_name: '',
        server_max_connections: '',
        server_name_server: '',
        server_push_route: '',
        server_reject_unconfigured: false,
        server_subnet: '',
        server_topology: '',
        server_clients: [],
        server_mfa_totp_challenge: '',
        server_mfa_totp_digits: '6',
        server_mfa_totp_drift: '0',
        server_mfa_totp_slop: '180',
        server_mfa_totp_step: '30',
        tls_auth_key: '',
        tls_ca_certificate: '',
        tls_certificate: '',
        tls_crypt_key: '',
        tls_dh_params: '',
        tls_peer_fingerprint: '',
        tls_role: '',
        tls_version_min: '',
        replace_default_route_local: '',
      };
    }

    async function load() {
      loading.value = true;
      try {
        const [cfgRes, ifRes, vrfRes] = await Promise.all([
          configApi.get('interfaces openvpn'),
          interfaceApi.ethernet(),
          configApi.get('vrf').catch(() => ({ data: {} })),
        ]);
        const cfgData = cfgRes.data || {};
        openvpnList.value = Object.entries(cfgData).map(([name, config]) => ({
          name,
          ...config,
          device_type: config['device-type'] || 'tun',
          local_port: config['local-port'] || '',
          remote_host: config['remote-host'] || '',
          remote_port: config['remote-port'] || '',
        }));
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));

        const vrfData = vrfRes?.data || {};
        const vrfNames = vrfData.name || vrfData;
        vrfOptions.value = Object.keys(vrfNames)
          .filter(name => typeof vrfNames[name] === 'object')
          .map(name => ({ value: name, label: name }));
      } catch (e) {
        showError(e.message || t('openvpn.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingItem.value = configToForm(openvpnList.value[index], openvpnList.value[index].name);
      } else {
        editingItem.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      console.log('[OpenVPN] Start saving interface config');
      console.log('[OpenVPN] Interface name:', editingItem.value.name);
      console.log('[OpenVPN] Mode:', editingItem.value.mode);
      console.log('[OpenVPN] Form data:', JSON.stringify(editingItem.value, null, 2));

      if (!editingItem.value.name) {
        showError(t('openvpn.interfaceNameRequired'));
        return;
      }
      if (!editingItem.value.mode) {
        showError(t('openvpn.modeRequired'));
        return;
      }

      const config = formToConfig(editingItem.value);
      console.log('[OpenVPN] Converted config:', JSON.stringify(config, null, 2));
      console.log('[OpenVPN] Client count:', config.server?.client?.length || 0);

      try {
        console.log('[OpenVPN] Calling API: set interfaces openvpn', editingItem.value.name);
        await configStore.setConfig(`interfaces openvpn ${editingItem.value.name}`, config);
        configStore.markPending();
        console.log('[OpenVPN] API call success');
        modalVisible.value = false;
        await configStore.checkSessionChanged(); await load();
        console.log('[OpenVPN] Config saved, list reloaded');
      } catch (e) {
        console.error('[OpenVPN] Save failed:', e);
        showError(e.message || t('openvpn.saveFailed'));
      }
    }

    async function remove() {
      if (selected.value.length === 0) {
        showError(t('openvpn.selectInterfaceFirst'));
        return;
      }
      const names = selected.value.map(s => s.name);
      try {
        await Promise.all(names.map(name => configStore.deleteConfig(`interfaces openvpn ${name}`)));
        configStore.markPending();
        selected.value = [];
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e.message || t('openvpn.deleteFailed'));
      }
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {t,
      
      loading, openvpnList, selected, modalVisible, editingItem, interfaceOptions, activeTab,
      serverClients, selectedClients, editingClientIndex, clientModalVisible, clientForm, clientColumns,
      deleteSingleClientModalVisible, pendingDeleteClientName,
      deleteSelectedClientsModalVisible, pendingDeleteClientNames,
      COLUMNS,
      basicSchema, authSchema, encryptionSchema, keepAliveSchema, offloadSchema,
      mirrorSchema, ipSchema, ipv6Schema, serverSchema, serverMfaSchema,
      tlsSchema, replaceRouteSchema, commandText,
      openModal, save, remove, load,
      addClient, editClient, saveClient, deleteClient,
      confirmDeleteSingleClient, confirmDeleteSelectedClients,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="openvpnList"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? openvpnList.indexOf(selected[0]) : -1)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
        rowKey="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'device_type'">
            {{ record['device-type'] || record.device_type || 'tun' }}
          </template>
          <template v-if="column.key === 'disable'">
            <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
              {{ record.disable ? t('openvpn.status.yes') : t('openvpn.status.no') }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(openvpnList.indexOf(record))">{{ t('app.edit') }}</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">{{ t('app.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingItem?.name ? t('openvpn.modal.editInterface') : t('openvpn.modal.createInterface')"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingItem">
          <TabGroup v-model="activeTab" :tabs="[
            { key: 'basic', title: t('openvpn.tabs.basic') },
            { key: 'auth', title: t('openvpn.tabs.auth') },
            { key: 'encryption', title: t('openvpn.tabs.encryption') },
            { key: 'tls', title: t('openvpn.tabs.tls') },
            { key: 'server', title: t('openvpn.tabs.server') },
            { key: 'keepalive', title: t('openvpn.tabs.keepalive') },
            { key: 'ip', title: t('openvpn.tabs.ip') },
            { key: 'ipv6', title: t('openvpn.tabs.ipv6') },
            { key: 'offload', title: t('openvpn.tabs.offload') },
            { key: 'mirror', title: t('openvpn.tabs.mirror') },
            { key: 'replaceRoute', title: t('openvpn.tabs.replaceRoute') },
          ]">
            <template #basic>
              <ConfigForm v-model="editingItem" :schema="basicSchema" />
            </template>
            <template #auth>
              <ConfigForm v-model="editingItem" :schema="authSchema" />
            </template>
            <template #encryption>
              <ConfigForm v-model="editingItem" :schema="encryptionSchema" />
            </template>
            <template #tls>
              <ConfigForm v-model="editingItem" :schema="tlsSchema" />
            </template>
            <template #server>
              <div v-if="editingItem.mode !== 'server'" style="color: #999; padding: 20px; text-align: center;">
                {{ t('openvpn.serverModeOnly') }}
              </div>
              <template v-else>
                <div class="form-group" style="margin-top: 0;">
                  <div class="form-group-title">{{ t('openvpn.serverConfig') }}</div>
                  <div class="form-group-content">
                    <ConfigForm v-model="editingItem" :schema="serverSchema" />
                  </div>
                </div>

                <div class="form-group">
                  <div class="form-group-title">MFA TOTP</div>
                  <div class="form-group-content">
                    <ConfigForm v-model="editingItem" :schema="serverMfaSchema" />
                  </div>
                </div>

                <div class="form-group">
                  <div class="form-group-title">{{ t('openvpn.clientManagement') }}</div>
                  <div class="form-group-content">
                    <DataTable
                      :columns="clientColumns"
                      :data="serverClients"
                      :selectable="false"
                      :actions="['create', 'edit', 'delete']"
                      @create="addClient"
                      @edit="editClient(selectedClients[0] ? serverClients.indexOf(selectedClients[0]) : -1)"
                      @delete="deleteClient(selectedClients[0] ? serverClients.indexOf(selectedClients[0]) : -1)"
                      @selection-change="selectedClients = $event"
                      rowKey="name"
                    >
                      <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'disable'">
                          <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
                            {{ record.disable ? t('openvpn.status.yes') : t('openvpn.status.no') }}
                          </span>
                        </template>
                        <template v-if="column.key === 'actions'">
                          <a @click="editClient(serverClients.indexOf(record))">{{ t('app.edit') }}</a>
                          <a @click="deleteClient(serverClients.indexOf(record))" style="color: #ff4d4f; margin-left: 8px;">{{ t('app.delete') }}</a>
                        </template>
                      </template>
                    </DataTable>
                  </div>
                </div>
              </template>
            </template>
            <template #keepalive>
              <ConfigForm v-model="editingItem" :schema="keepAliveSchema" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingItem" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingItem" :schema="ipv6Schema" />
            </template>
            <template #offload>
              <ConfigForm v-model="editingItem" :schema="offloadSchema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingItem" :schema="mirrorSchema" />
            </template>
            <template #replaceRoute>
              <ConfigForm v-model="editingItem" :schema="replaceRouteSchema" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>

      <DraggableModal
        v-model:visible="clientModalVisible"
        :title="editingClientIndex >= 0 ? t('openvpn.modal.editClient') : t('openvpn.modal.createClient')"
        width="600px"
        @confirm="saveClient"
      >
        <div v-if="clientForm" style="max-height: 400px; overflow-y: auto;">
          <ConfigForm
            v-model="clientForm"
            :schema="[
              { key: 'name', title: 'openvpn.clientSchema.name', type: 'text', required: true, placeholder: 'openvpn.clientSchema.namePlaceholder', disabled: editingClientIndex >= 0 },
              { key: 'disable', title: 'openvpn.clientSchema.disable', type: 'checkbox' },
              { key: 'ip', title: 'openvpn.clientSchema.ip', type: 'text', placeholder: 'openvpn.clientSchema.ipPlaceholder' },
              { key: 'push_route', title: 'openvpn.clientSchema.pushRoute', type: 'textarea', placeholder: 'openvpn.clientSchema.pushRoutePlaceholder' },
              { key: 'subnet', title: 'openvpn.clientSchema.subnet', type: 'text', placeholder: 'openvpn.clientSchema.subnetPlaceholder' },
            ]"
          />
        </div>
      </DraggableModal>

      <DraggableModal
        v-model:visible="deleteSingleClientModalVisible"
        :title="t('app.confirmDelete')"
        width="400px"
        @confirm="confirmDeleteSingleClient"
      >
        <div>{{ t('openvpn.confirmDeleteClient') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteClientName }}</div>
        </div>
      </DraggableModal>

      <DraggableModal
        v-model:visible="deleteSelectedClientsModalVisible"
        :title="t('app.confirmDelete')"
        width="400px"
        @confirm="confirmDeleteSelectedClients"
      >
        <div>{{ t('openvpn.confirmDeleteClient') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteClientNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
