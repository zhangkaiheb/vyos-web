import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const DEVICE_TYPE_OPTIONS = [
  { value: 'tun', label: 'tun (三层隧道 - 默认)' },
  { value: 'tap', label: 'tap (二层隧道)' },
];

const IP_VERSION_OPTIONS = [
  { value: 'auto', label: 'auto (自动 - 默认)' },
  { value: 'ipv4', label: 'ipv4 (仅 IPv4)' },
  { value: 'ipv6', label: 'ipv6 (仅 IPv6)' },
  { value: 'dual-stack', label: 'dual-stack (双栈)' },
];

const MODE_OPTIONS = [
  { value: 'site-to-site', label: 'site-to-site (站点到站点)' },
  { value: 'client', label: 'client (客户端)' },
  { value: 'server', label: 'server (服务端)' },
];

const PROTOCOL_OPTIONS = [
  { value: 'udp', label: 'udp (UDP - 默认)' },
  { value: 'tcp-passive', label: 'tcp-passive (TCP 被动/监听)' },
  { value: 'tcp-active', label: 'tcp-active (TCP 主动/连接)' },
];

const CIPHER_OPTIONS = [
  { value: '', label: '(未设置)' },
  { value: 'none', label: 'none (无加密)' },
  { value: '3des', label: '3des (Triple DES)' },
  { value: 'aes128', label: 'aes128 (AES-128-CBC)' },
  { value: 'aes128gcm', label: 'aes128gcm (AES-128-GCM)' },
  { value: 'aes192', label: 'aes192 (AES-192-CBC)' },
  { value: 'aes192gcm', label: 'aes192gcm (AES-192-GCM)' },
  { value: 'aes256', label: 'aes256 (AES-256-CBC)' },
  { value: 'aes256gcm', label: 'aes256gcm (AES-256-GCM)' },
];

const HASH_OPTIONS = [
  { value: '', label: '(未设置)' },
  { value: 'md5', label: 'md5' },
  { value: 'sha1', label: 'sha1' },
  { value: 'sha256', label: 'sha256' },
  { value: 'sha384', label: 'sha384' },
  { value: 'sha512', label: 'sha512' },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (严格反向路径转发 RFC3704)' },
  { value: 'loose', label: 'loose (宽松反向路径转发 RFC3704)' },
  { value: 'disable', label: 'disable (无源验证)' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 (禁用 DAD)' },
  { value: '1', label: '1 (启用 DAD - 默认)' },
  { value: '2', label: '2 (启用 DAD - 发现 MAC 重复时禁用 IPv6)' },
];

const TLS_VERSION_OPTIONS = [
  { value: '1.0', label: '1.0' },
  { value: '1.1', label: '1.1' },
  { value: '1.2', label: '1.2' },
  { value: '1.3', label: '1.3' },
];

const TLS_ROLE_OPTIONS = [
  { value: 'active', label: 'active (主动)' },
  { value: 'passive', label: 'passive (被动)' },
];

const TOPOLOGY_OPTIONS = [
  { value: 'subnet', label: 'subnet (子网 - 默认)' },
  { value: 'point-to-point', label: 'point-to-point (点对点)' },
  { value: 'net30', label: 'net30 (Net30)' },
];

const MFA_CHALLENGE_OPTIONS = [
  { value: 'enable', label: 'enable (启用 - 默认)' },
  { value: 'disable', label: 'disable (禁用)' },
];

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 150 },
  { key: 'mode', title: '模式', width: 120 },
  { key: 'protocol', title: '协议', width: 100 },
  { key: 'device_type', title: '设备类型', width: 100 },
  { key: 'local_port', title: '本地端口', width: 90 },
  { key: 'remote_host', title: '远端主机', width: 140 },
  { key: 'remote_port', title: '远端端口', width: 90 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 120, fixed: 'right' },
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
    const loading = ref(false);
    const openvpnList = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 vtun0, vtun1', disabled: !!editingItem.value?.name },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'device_type', title: '设备类型', type: 'select', options: DEVICE_TYPE_OPTIONS, required: true },
      { key: 'disable', title: '禁用接口', type: 'checkbox' },
      { key: 'ip_version', title: 'IP 版本', type: 'select', options: IP_VERSION_OPTIONS },
      { key: 'mode', title: '模式', type: 'select', options: MODE_OPTIONS, required: true },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS },
      { key: 'persistent_tunnel', title: '持久隧道', type: 'checkbox', help: '隧道断开后不关闭接口' },
      { key: 'shared_secret_key', title: '共享密钥', type: 'password', placeholder: '共享密钥文件路径' },
      { key: 'use_lzo_compression', title: 'LZO 压缩', type: 'checkbox', help: '启用 LZO 压缩' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 名称' },
      { key: 'openvpn_option', title: '额外 OpenVPN 选项', type: 'textarea', placeholder: '每行一个额外的 OpenVPN 配置选项' },
      { key: 'local_host', title: '本地地址', type: 'text', placeholder: '本地监听 IP 地址' },
      { key: 'local_port', title: '本地端口', type: 'number', min: 1, max: 65535, placeholder: '默认: 1194' },
      { key: 'remote_host', title: '远端主机', type: 'text', placeholder: '远端 IP 地址' },
      { key: 'remote_port', title: '远端端口', type: 'number', min: 1, max: 65535, placeholder: '默认: 1194' },
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口' },
      { key: 'local_address', title: '本地地址 (隧道)', type: 'text', placeholder: '隧道本地 IP 地址' },
      { key: 'local_subnet_mask', title: '本地子网掩码', type: 'text', placeholder: '如 255.255.255.0' },
      { key: 'remote_address', title: '远端地址 (隧道)', type: 'text', placeholder: '隧道远端 IP 地址' },
    ]);

    const authSchema = computed(() => [
      { key: 'auth_username', title: '用户名', type: 'text', placeholder: '认证用户名' },
      { key: 'auth_password', title: '密码', type: 'password', placeholder: '认证密码' },
    ]);

    const encryptionSchema = computed(() => [
      { key: 'encryption_cipher', title: '加密算法', type: 'select', options: CIPHER_OPTIONS },
      { key: 'encryption_data_ciphers', title: '数据加密算法列表', type: 'text', placeholder: '如 AES-256-GCM:AES-128-GCM', help: '加密协商算法列表，冒号分隔' },
      { key: 'encryption_data_ciphers_fallback', title: '回退加密算法', type: 'select', options: CIPHER_OPTIONS },
      { key: 'hash', title: '哈希算法', type: 'select', options: HASH_OPTIONS },
    ]);

    const keepAliveSchema = computed(() => [
      { key: 'keepalive_failure_count', title: '失败次数', type: 'number', min: 0, max: 1000, placeholder: '默认: 60' },
      { key: 'keepalive_interval', title: '间隔 (秒)', type: 'number', min: 0, max: 600, placeholder: '默认: 10' },
    ]);

    const offloadSchema = computed(() => [
      { key: 'offload_dco', title: 'DCO 数据面卸载', type: 'checkbox', help: '启用 OpenVPN DCO (Data Channel Offload) 内核加速' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '将出方向流量镜像到指定接口' },
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '将入方向流量镜像到指定接口' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: '调整 TCP MSS', type: 'text', placeholder: '536-65535 或 clamp-mss-to-pmtu', help: '自动设置为 PMTU 值或指定字节数' },
      { key: 'ip_arp_cache_timeout', title: 'ARP 缓存超时', type: 'number', min: 1, max: 86400, placeholder: '默认: 30', help: 'ARP 缓存条目超时时间 (秒)' },
      { key: 'ip_disable_arp_filter', title: '禁用 ARP 过滤', type: 'checkbox' },
      { key: 'ip_disable_forwarding', title: '禁用 IP 转发', type: 'checkbox' },
      { key: 'ip_enable_arp_accept', title: '启用 ARP accept', type: 'checkbox' },
      { key: 'ip_enable_arp_announce', title: '启用 ARP announce', type: 'checkbox' },
      { key: 'ip_enable_arp_ignore', title: '启用 ARP ignore', type: 'checkbox' },
      { key: 'ip_enable_directed_broadcast', title: '启用定向广播转发', type: 'checkbox' },
      { key: 'ip_enable_proxy_arp', title: '启用 Proxy ARP', type: 'checkbox' },
      { key: 'ip_proxy_arp_pvlan', title: '启用私有 VLAN Proxy ARP', type: 'checkbox' },
      { key: 'ip_source_validation', title: '源验证 (uRPF)', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择验证模式' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: '接受 DAD', type: 'select', options: ACCEPT_DAD_OPTIONS, help: '重复地址检测 (默认: 1)' },
      { key: 'ipv6_address_autoconf', title: '自动配置 (SLAAC)', type: 'checkbox', help: '使用无状态自动配置获取 IPv6 地址' },
      { key: 'ipv6_address_eui64', title: 'EUI-64 前缀', type: 'text', placeholder: 'IPv6 /64 网络，如 2001:db8::/64' },
      { key: 'ipv6_address_iface_id', title: '接口标识符', type: 'text', placeholder: '::h:h:h:h' },
      { key: 'ipv6_no_default_link_local', title: '移除默认链路本地地址', type: 'checkbox' },
      { key: 'ipv6_adjust_mss', title: '调整 TCP MSS', type: 'text', placeholder: '536-65535 或 clamp-mss-to-pmtu' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '默认: 30', help: '基础可达时间 (秒)' },
      { key: 'ipv6_disable_forwarding', title: '禁用 IPv6 转发', type: 'checkbox' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 探测次数', type: 'number', min: 0, placeholder: '默认: 1', help: '执行 DAD 时发送的 NS 消息数量 (0=禁用)' },
      { key: 'ipv6_source_validation', title: '源验证 (uRPF)', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择验证模式' },
    ]);

    const serverSchema = computed(() => [
      { key: 'server_bridge_disable', title: '禁用桥接', type: 'checkbox' },
      { key: 'server_bridge_gateway', title: '桥接网关', type: 'text', placeholder: 'IPv4 网关地址' },
      { key: 'server_bridge_start', title: '桥接起始地址', type: 'text', placeholder: 'IPv4 起始地址' },
      { key: 'server_bridge_stop', title: '桥接结束地址', type: 'text', placeholder: 'IPv4 结束地址' },
      { key: 'server_bridge_subnet_mask', title: '桥接子网掩码', type: 'text', placeholder: '如 255.255.255.0' },
      { key: 'server_client_pool_disable', title: '禁用客户端地址池', type: 'checkbox' },
      { key: 'server_client_pool_start', title: '客户端池起始', type: 'text', placeholder: 'IPv4 起始地址' },
      { key: 'server_client_pool_stop', title: '客户端池结束', type: 'text', placeholder: 'IPv4 结束地址' },
      { key: 'server_client_pool_subnet_mask', title: '客户端池子网掩码', type: 'text', placeholder: '如 255.255.255.0' },
      { key: 'server_client_ipv6_pool_base', title: '客户端 IPv6 池前缀', type: 'text', placeholder: 'IPv6 前缀' },
      { key: 'server_client_ipv6_pool_disable', title: '禁用客户端 IPv6 池', type: 'checkbox' },
      { key: 'server_domain_name', title: '域名', type: 'text', placeholder: '推送给客户端的域名' },
      { key: 'server_max_connections', title: '最大连接数', type: 'number', min: 1, max: 4096, placeholder: '1-4096' },
      { key: 'server_name_server', title: 'DNS 服务器', type: 'textarea', placeholder: '每行一个 DNS 地址', help: '推送给客户端的 DNS 服务器地址' },
      { key: 'server_push_route', title: '推送路由', type: 'textarea', placeholder: '每行一条路由，如 10.0.0.0/24 metric 100', help: '推送给客户端的路由 (IPv4/IPv6 网络 + 可选 metric)' },
      { key: 'server_reject_unconfigured', title: '拒绝未配置客户端', type: 'checkbox' },
      { key: 'server_subnet', title: '服务器子网', type: 'text', placeholder: '服务器模式子网，如 10.0.0.0/24' },
      { key: 'server_topology', title: '拓扑', type: 'select', options: TOPOLOGY_OPTIONS },
    ]);

    const serverMfaSchema = computed(() => [
      { key: 'server_mfa_totp_challenge', title: '挑战模式', type: 'select', options: MFA_CHALLENGE_OPTIONS },
      { key: 'server_mfa_totp_digits', title: '位数', type: 'number', min: 1, max: 65535, placeholder: '默认: 6' },
      { key: 'server_mfa_totp_drift', title: '漂移', type: 'number', min: 1, max: 65535, placeholder: '默认: 0' },
      { key: 'server_mfa_totp_slop', title: '容差窗口 (秒)', type: 'number', min: 1, max: 65535, placeholder: '默认: 180' },
      { key: 'server_mfa_totp_step', title: '步长 (秒)', type: 'number', min: 1, max: 65535, placeholder: '默认: 30' },
    ]);

    // Server client management
    const serverClients = ref([]);
    const selectedClients = ref([]);
    const editingClientIndex = ref(-1);
    const clientModalVisible = ref(false);
    const clientForm = ref({ name: '', disable: false, ip: '', push_route: '', subnet: '' });

    const clientColumns = [
      { key: 'name', title: '客户端名称', width: 150 },
      { key: 'disable', title: '禁用', width: 80 },
      { key: 'ip', title: 'IP 地址', width: 140 },
      { key: 'push_route', title: '推送路由', width: 200 },
      { key: 'subnet', title: '子网', width: 140 },
      { key: 'actions', title: '操作', width: 120 },
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
        showError('请输入客户端名称');
        return;
      }
      const clientData = JSON.parse(JSON.stringify(clientForm.value));
      console.log('[OpenVPN] 保存客户端:', JSON.stringify(clientData, null, 2));
      if (editingClientIndex.value >= 0) {
        console.log('[OpenVPN] 更新客户端索引:', editingClientIndex.value, '原数据:', JSON.stringify(serverClients.value[editingClientIndex.value]));
        serverClients.value[editingClientIndex.value] = clientData;
        console.log('[OpenVPN] 更新后客户端列表:', JSON.stringify(serverClients.value, null, 2));
      } else {
        console.log('[OpenVPN] 新增客户端');
        serverClients.value.push(clientData);
        console.log('[OpenVPN] 新增后客户端列表:', JSON.stringify(serverClients.value, null, 2));
      }
      clientModalVisible.value = false;
    }

    function deleteClient(index) {
      if (index >= 0) {
        const clientToDelete = serverClients.value[index];
        console.log('[OpenVPN] 删除客户端索引:', index, '客户端数据:', JSON.stringify(clientToDelete));
        if (confirm('确定删除此客户端配置？')) {
          serverClients.value.splice(index, 1);
          console.log('[OpenVPN] 删除后客户端列表:', JSON.stringify(serverClients.value, null, 2));
        }
      } else if (selectedClients.value.length > 0) {
        const namesToDelete = selectedClients.value.map(c => c.name);
        console.log('[OpenVPN] 批量删除客户端:', namesToDelete);
        if (confirm('确定删除选中的客户端配置？')) {
          serverClients.value = serverClients.value.filter(c => !namesToDelete.includes(c.name));
          selectedClients.value = [];
          console.log('[OpenVPN] 批量删除后客户端列表:', JSON.stringify(serverClients.value, null, 2));
        }
      } else {
        showError('请选择要删除的客户端');
      }
    }

    const tlsSchema = computed(() => [
      { key: 'tls_auth_key', title: '认证密钥', type: 'text', placeholder: 'TLS 认证密钥文件' },
      { key: 'tls_ca_certificate', title: 'CA 证书', type: 'text', placeholder: 'PKI 配置中的 CA 证书名称' },
      { key: 'tls_certificate', title: '证书', type: 'text', placeholder: 'PKI 配置中的证书名称' },
      { key: 'tls_crypt_key', title: '加密密钥', type: 'text', placeholder: 'TLS 加密密钥文件' },
      { key: 'tls_dh_params', title: 'DH 参数', type: 'text', placeholder: 'Diffie-Hellman 参数 (仅服务端)', help: '仅服务端模式需要' },
      { key: 'tls_peer_fingerprint', title: '对端指纹', type: 'text', placeholder: 'SHA256 指纹' },
      { key: 'tls_role', title: 'TLS 角色', type: 'select', options: TLS_ROLE_OPTIONS, placeholder: '选择 TLS 角色' },
      { key: 'tls_version_min', title: '最低 TLS 版本', type: 'select', options: [{ value: '', label: '(未设置)' }, ...TLS_VERSION_OPTIONS] },
    ]);

    const replaceRouteSchema = computed(() => [
      { key: 'replace_default_route_local', title: '本地地址', type: 'text', placeholder: '替换默认路由的本地地址' },
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
        device_type: cfg['device-type'] || 'tun',
        disable: !!cfg.disable || cfg.disable === '',
        ip_version: cfg['ip-version'] || 'auto',
        mode: cfg.mode || '',
        protocol: cfg.protocol || 'udp',
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
        keepalive_failure_count: keepalive['failure-count'] !== undefined ? String(keepalive['failure-count']) : '60',
        keepalive_interval: keepalive.interval !== undefined ? String(keepalive.interval) : '10',
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
        ipv6_accept_dad: ipv6['accept-dad'] !== undefined ? String(ipv6['accept-dad']) : '1',
        ipv6_address_autoconf: ipv6Addresses.includes('autoconf'),
        ipv6_address_eui64: ipv6Addresses.find(a => typeof a === 'object' && a.eui64)?.eui64 || '',
        ipv6_address_iface_id: ipv6Addresses.find(a => typeof a === 'object' && a['interface-identifier'])?.['interface-identifier'] || '',
        ipv6_no_default_link_local: ipv6Addresses.includes('no-default-link-local'),
        ipv6_adjust_mss: ipv6['adjust-mss'] || '',
        ipv6_base_reachable_time: ipv6['base-reachable-time'] || '',
        ipv6_disable_forwarding: !!ipv6['disable-forwarding'] || ipv6['disable-forwarding'] === '',
        ipv6_dup_addr_detect_transmits: ipv6['dup-addr-detect-transmits'] !== undefined ? String(ipv6['dup-addr-detect-transmits']) : '1',
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
        server_topology: server.topology || 'subnet',
        server_clients: serverClients,
        server_mfa_totp_challenge: serverMfa.challenge || 'enable',
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
        device_type: 'tun',
        disable: false,
        ip_version: 'auto',
        mode: 'site-to-site',
        protocol: 'udp',
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
        keepalive_failure_count: '60',
        keepalive_interval: '10',
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
        ipv6_accept_dad: '1',
        ipv6_address_autoconf: false,
        ipv6_address_eui64: '',
        ipv6_address_iface_id: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '',
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '1',
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
        server_topology: 'subnet',
        server_clients: [],
        server_mfa_totp_challenge: 'enable',
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
        const [cfgRes, ifRes] = await Promise.all([
          configApi.get('interfaces openvpn'),
          interfaceApi.ethernet(),
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
      } catch (e) {
        showError(e.message || '加载失败');
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
      console.log('[OpenVPN] 开始保存接口配置');
      console.log('[OpenVPN] 接口名称:', editingItem.value.name);
      console.log('[OpenVPN] 模式:', editingItem.value.mode);
      console.log('[OpenVPN] 表单数据:', JSON.stringify(editingItem.value, null, 2));

      if (!editingItem.value.name) {
        showError('请输入接口名称');
        return;
      }
      if (!editingItem.value.mode) {
        showError('请选择模式');
        return;
      }

      const config = formToConfig(editingItem.value);
      console.log('[OpenVPN] 转换后的配置:', JSON.stringify(config, null, 2));
      console.log('[OpenVPN] 客户端数量:', config.server?.client?.length || 0);

      try {
        console.log('[OpenVPN] 调用 API: set interfaces openvpn', editingItem.value.name);
        await configApi.set(`interfaces openvpn ${editingItem.value.name}`, config);
        console.log('[OpenVPN] API 调用成功');
        modalVisible.value = false;
        await load();
        console.log('[OpenVPN] 配置保存完成，已重新加载列表');
      } catch (e) {
        console.error('[OpenVPN] 保存失败:', e);
        showError(e.message || '保存失败');
      }
    }

    async function remove() {
      if (selected.value.length === 0) {
        showError('请选择要删除的 OpenVPN 接口');
        return;
      }
      const names = selected.value.map(s => s.name);
      try {
        await Promise.all(names.map(name => configApi.delete(`interfaces openvpn ${name}`)));
        selected.value = [];
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    onMounted(load);

    return {
      loading, openvpnList, selected, modalVisible, editingItem, interfaceOptions, activeTab,
      serverClients, selectedClients, editingClientIndex, clientModalVisible, clientForm, clientColumns,
      COLUMNS,
      basicSchema, authSchema, encryptionSchema, keepAliveSchema, offloadSchema,
      mirrorSchema, ipSchema, ipv6Schema, serverSchema, serverMfaSchema,
      tlsSchema, replaceRouteSchema, commandText,
      openModal, save, remove, load,
      addClient, editClient, saveClient, deleteClient,
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
              {{ record.disable ? '是' : '否' }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(openvpnList.indexOf(record))">编辑</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">删除</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingItem?.name ? '编辑 OpenVPN 接口' : '创建 OpenVPN 接口'"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingItem">
          <TabGroup v-model="activeTab" :tabs="[
            { key: 'basic', title: '基本配置' },
            { key: 'auth', title: '认证' },
            { key: 'encryption', title: '加密' },
            { key: 'tls', title: 'TLS' },
            { key: 'server', title: '服务端' },
            { key: 'keepalive', title: 'Keep-Alive' },
            { key: 'ip', title: 'IPv4 参数' },
            { key: 'ipv6', title: 'IPv6 参数' },
            { key: 'offload', title: '卸载' },
            { key: 'mirror', title: '流量镜像' },
            { key: 'replaceRoute', title: '替换路由' },
            { key: 'preview', title: '命令预览' },
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
                仅当模式为 "server" 时可配置服务端选项
              </div>
              <template v-else>
                <h3 style="margin-top: 0;">服务端配置</h3>
                <ConfigForm v-model="editingItem" :schema="serverSchema" />
                <h3>MFA TOTP</h3>
                <ConfigForm v-model="editingItem" :schema="serverMfaSchema" />
                <h3 style="margin-top: 20px;">客户端管理</h3>
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
                        {{ record.disable ? '是' : '否' }}
                      </span>
                    </template>
                    <template v-if="column.key === 'actions'">
                      <a @click="editClient(serverClients.indexOf(record))">编辑</a>
                      <a @click="deleteClient(serverClients.indexOf(record))" style="color: #ff4d4f; margin-left: 8px;">删除</a>
                    </template>
                  </template>
                </DataTable>
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
            <template #preview>
              <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">{{ commandText }}</pre>
            </template>
          </TabGroup>
        </div>
      </DraggableModal>

      <DraggableModal
        v-model:visible="clientModalVisible"
        :title="editingClientIndex >= 0 ? '编辑客户端' : '创建客户端'"
        width="600px"
        @confirm="saveClient"
      >
        <div v-if="clientForm" style="max-height: 400px; overflow-y: auto;">
          <ConfigForm
            v-model="clientForm"
            :schema="[
              { key: 'name', title: '客户端名称', type: 'text', required: true, placeholder: '证书 Common Name', disabled: editingClientIndex >= 0 },
              { key: 'disable', title: '禁用', type: 'checkbox' },
              { key: 'ip', title: 'IP 地址', type: 'text', placeholder: '客户端 IP 地址' },
              { key: 'push_route', title: '推送路由', type: 'textarea', placeholder: '每行一条路由，如 10.0.0.0/24 metric 100' },
              { key: 'subnet', title: '子网', type: 'text', placeholder: '客户端子网' },
            ]"
          />
        </div>
      </DraggableModal>
    </div>
  `,
});
