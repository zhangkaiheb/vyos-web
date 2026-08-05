import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'port', title: '端口', width: 80 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'peer_count', title: 'Peer 数量', width: 100 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (严格)' },
  { value: 'loose', label: 'loose (宽松)' },
  { value: 'disable', label: 'disable (禁用)' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 (禁用 DAD)' },
  { value: '1', label: '1 (启用 DAD - 默认)' },
  { value: '2', label: '2 (启用 DAD - MAC 重复时禁用 IPv6)' },
];

export default defineComponent({
  name: 'WireGuardPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const wireguards = ref([]);
    const modalVisible = ref(false);
    const editingWG = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedWG = ref([]);

    // Peer management
    const peers = ref([]);
    const editingPeerIndex = ref(-1);
    const peerModalVisible = ref(false);
    const peerForm = ref(null);
    const selectedPeers = ref([]);

    const peerColumns = [
      { key: 'name', title: 'Peer 别名', width: 120 },
      { key: 'public_key', title: '公钥', width: 200 },
      { key: 'address', title: '地址', width: 140 },
      { key: 'port', title: '端口', width: 80 },
      { key: 'disable', title: '禁用', width: 80 },
      { key: 'actions', title: '操作', width: 100 },
    ];

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 wg0, wg1', help: '格式: wgN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'private_key', title: '私钥', type: 'textarea', placeholder: 'Base64 编码的私钥', help: 'WireGuard 私钥' },
      { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: '连接使用的端口号' },
      { key: 'fwmark', title: 'Fwmark', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '出站数据包的 fwmark 值 (默认: 0)' },
      { key: 'max_dns_retry', title: 'DNS 重试次数', type: 'number', min: 1, max: 15, placeholder: '1-15', help: 'DNS 解析失败时的最大重试次数 (默认: 3)' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1420)' },
      { key: 'per_client_thread', title: '每客户端线程', type: 'checkbox', help: '为每个客户端的流量使用独立线程处理' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ip_arp_cache_timeout', title: 'ARP 缓存超时', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: 'ARP 缓存条目超时 (秒, 默认: 30)' },
      { key: 'ip_disable_arp_filter', title: '禁用 ARP 过滤', type: 'checkbox', help: '禁用 ARP 过滤' },
      { key: 'ip_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IP 转发' },
      { key: 'ip_enable_arp_accept', title: '启用 ARP 接受', type: 'checkbox', help: '启用 ARP 接受' },
      { key: 'ip_enable_arp_announce', title: '启用 ARP 通告', type: 'checkbox', help: '启用 ARP 通告' },
      { key: 'ip_enable_arp_ignore', title: '启用 ARP 忽略', type: 'checkbox', help: '启用 ARP 忽略' },
      { key: 'ip_enable_directed_broadcast', title: '启用定向广播', type: 'checkbox', help: '启用定向广播转发' },
      { key: 'ip_enable_proxy_arp', title: '启用代理 ARP', type: 'checkbox', help: '启用代理 ARP' },
      { key: 'ip_proxy_arp_pvlan', title: '私有 VLAN 代理 ARP', type: 'checkbox', help: '启用私有 VLAN 代理 ARP' },
      { key: 'ip_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: '接受 DAD', type: 'select', options: ACCEPT_DAD_OPTIONS, help: '重复地址检测 (默认: 1)' },
      { key: 'ipv6_autoconf', title: '自动配置', type: 'checkbox', help: '使用 SLAAC 获取 IPv6 地址' },
      { key: 'ipv6_eui64', title: 'EUI-64 前缀', type: 'text', placeholder: 'IPv6 前缀', help: '基于 MAC 的 EUI-64 地址前缀' },
      { key: 'ipv6_no_default_link_local', title: '无默认链路本地地址', type: 'checkbox', help: '移除默认链路本地地址' },
      { key: 'ipv6_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: '基础可达时间 (秒, 默认: 30)' },
      { key: 'ipv6_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IPv6 转发' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 传输次数', type: 'number', min: 0, max: 100, placeholder: '0-100', help: 'DAD 期间发送的 NS 消息数 (默认: 1, 0=禁用)' },
      { key: 'ipv6_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像出方向流量到目标接口' },
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像入方向流量到目标接口' },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    // Peer schema
    const peerSchema = computed(() => [
      { key: 'name', title: 'Peer 别名', type: 'text', required: true, placeholder: 'Peer 别名' },
      { key: 'public_key', title: '公钥', type: 'text', required: true, placeholder: 'Base64 编码的公钥' },
      { key: 'preshared_key', title: '预共享密钥', type: 'text', placeholder: 'Base64 编码的预共享密钥' },
      { key: 'address', title: '地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址' },
      { key: 'allowed_ips', title: '允许 IP', type: 'textarea', placeholder: '每行一个 IP 或子网', help: '允许通过此 Peer 的 IP 地址' },
      { key: 'host_name', title: '主机名', type: 'text', placeholder: 'FQDN', help: 'WireGuard 端点的主机名' },
      { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
      { key: 'persistent_keepalive', title: '保活间隔', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: '发送保活消息的间隔 (秒)' },
      { key: 'description', title: '描述', type: 'text', placeholder: 'Peer 描述' },
      { key: 'disable', title: '禁用', type: 'checkbox', help: '禁用此 Peer' },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingWG.value) return '';
      const w = editingWG.value;
      const name = w.name || 'wgN';
      const lines = [];

      if (w.description) lines.push(`set interfaces wireguard ${name} description "${w.description}"`);
      if (w.private_key) lines.push(`set interfaces wireguard ${name} private-key ${w.private_key}`);
      if (w.port) lines.push(`set interfaces wireguard ${name} port ${w.port}`);
      if (w.fwmark !== undefined && w.fwmark !== null && w.fwmark !== '') lines.push(`set interfaces wireguard ${name} fwmark ${w.fwmark}`);
      if (w.max_dns_retry) lines.push(`set interfaces wireguard ${name} max-dns-retry ${w.max_dns_retry}`);
      if (w.mtu) lines.push(`set interfaces wireguard ${name} mtu ${w.mtu}`);
      if (w.per_client_thread) lines.push(`set interfaces wireguard ${name} per-client-thread`);
      if (w.disable) lines.push(`set interfaces wireguard ${name} disable`);

      // IP
      if (w.ip_adjust_mss) lines.push(`set interfaces wireguard ${name} ip adjust-mss ${w.ip_adjust_mss}`);
      if (w.ip_arp_cache_timeout) lines.push(`set interfaces wireguard ${name} ip arp-cache-timeout ${w.ip_arp_cache_timeout}`);
      if (w.ip_disable_arp_filter) lines.push(`set interfaces wireguard ${name} ip disable-arp-filter`);
      if (w.ip_disable_forwarding) lines.push(`set interfaces wireguard ${name} ip disable-forwarding`);
      if (w.ip_enable_arp_accept) lines.push(`set interfaces wireguard ${name} ip enable-arp-accept`);
      if (w.ip_enable_arp_announce) lines.push(`set interfaces wireguard ${name} ip enable-arp-announce`);
      if (w.ip_enable_arp_ignore) lines.push(`set interfaces wireguard ${name} ip enable-arp-ignore`);
      if (w.ip_enable_directed_broadcast) lines.push(`set interfaces wireguard ${name} ip enable-directed-broadcast`);
      if (w.ip_enable_proxy_arp) lines.push(`set interfaces wireguard ${name} ip enable-proxy-arp`);
      if (w.ip_proxy_arp_pvlan) lines.push(`set interfaces wireguard ${name} ip proxy-arp-pvlan`);
      if (w.ip_source_validation) lines.push(`set interfaces wireguard ${name} ip source-validation ${w.ip_source_validation}`);

      // IPv6
      if (w.ipv6_accept_dad && w.ipv6_accept_dad !== '1') lines.push(`set interfaces wireguard ${name} ipv6 accept-dad ${w.ipv6_accept_dad}`);
      if (w.ipv6_autoconf) lines.push(`set interfaces wireguard ${name} ipv6 address autoconf`);
      if (w.ipv6_eui64) lines.push(`set interfaces wireguard ${name} ipv6 address eui64 ${w.ipv6_eui64}`);
      if (w.ipv6_no_default_link_local) lines.push(`set interfaces wireguard ${name} ipv6 address no-default-link-local`);
      if (w.ipv6_adjust_mss) lines.push(`set interfaces wireguard ${name} ipv6 adjust-mss ${w.ipv6_adjust_mss}`);
      if (w.ipv6_base_reachable_time) lines.push(`set interfaces wireguard ${name} ipv6 base-reachable-time ${w.ipv6_base_reachable_time}`);
      if (w.ipv6_disable_forwarding) lines.push(`set interfaces wireguard ${name} ipv6 disable-forwarding`);
      if (w.ipv6_dup_addr_detect_transmits !== undefined && w.ipv6_dup_addr_detect_transmits !== null && w.ipv6_dup_addr_detect_transmits !== '') lines.push(`set interfaces wireguard ${name} ipv6 dup-addr-detect-transmits ${w.ipv6_dup_addr_detect_transmits}`);
      if (w.ipv6_source_validation) lines.push(`set interfaces wireguard ${name} ipv6 source-validation ${w.ipv6_source_validation}`);

      // Mirror
      if (w.mirror_egress) lines.push(`set interfaces wireguard ${name} mirror egress ${w.mirror_egress}`);
      if (w.mirror_ingress) lines.push(`set interfaces wireguard ${name} mirror ingress ${w.mirror_ingress}`);

      // Other
      if (w.redirect) lines.push(`set interfaces wireguard ${name} redirect ${w.redirect}`);
      if (w.vrf) lines.push(`set interfaces wireguard ${name} vrf ${w.vrf}`);

      // Peers
      if (peers.value && peers.value.length) {
        peers.value.forEach(p => {
          lines.push(`set interfaces wireguard ${name} peer ${p.name} public-key ${p.public_key}`);
          if (p.preshared_key) lines.push(`set interfaces wireguard ${name} peer ${p.name} preshared-key ${p.preshared_key}`);
          if (p.address) lines.push(`set interfaces wireguard ${name} peer ${p.name} address ${p.address}`);
          if (p.allowed_ips) {
            p.allowed_ips.split('\n').filter(Boolean).forEach(ip => {
              lines.push(`set interfaces wireguard ${name} peer ${p.name} allowed-ips ${ip.trim()}`);
            });
          }
          if (p.host_name) lines.push(`set interfaces wireguard ${name} peer ${p.name} host-name ${p.host_name}`);
          if (p.port) lines.push(`set interfaces wireguard ${name} peer ${p.name} port ${p.port}`);
          if (p.persistent_keepalive) lines.push(`set interfaces wireguard ${name} peer ${p.name} persistent-keepalive ${p.persistent_keepalive}`);
          if (p.description) lines.push(`set interfaces wireguard ${name} peer ${p.name} description "${p.description}"`);
          if (p.disable) lines.push(`set interfaces wireguard ${name} peer ${p.name} disable`);
        });
      }

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'peer', title: 'Peer 管理' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', private_key: '', port: '',
        fwmark: '', max_dns_retry: '', mtu: '',
        per_client_thread: false, disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_no_default_link_local: false, ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function getDefaultPeerForm() {
      return {
        name: '', public_key: '', preshared_key: '', address: '',
        allowed_ips: '', host_name: '', port: '',
        persistent_keepalive: '', description: '', disable: false,
      };
    }

    function wgToForm(w) {
      return {
        name: w.name || '',
        description: w.description || '',
        private_key: w.private_key || '',
        port: w.port || '',
        fwmark: w.fwmark !== undefined ? w.fwmark : '',
        max_dns_retry: w.max_dns_retry || '',
        mtu: w.mtu || '',
        per_client_thread: !!w.per_client_thread,
        disable: !!w.disable,
        ip_adjust_mss: w.ip?.adjust_mss || '',
        ip_arp_cache_timeout: w.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!w.ip?.disable_arp_filter,
        ip_disable_forwarding: !!w.ip?.disable_forwarding,
        ip_enable_arp_accept: !!w.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!w.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!w.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!w.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!w.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!w.ip?.proxy_arp_pvlan,
        ip_source_validation: w.ip?.source_validation || '',
        ipv6_accept_dad: w.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!w.ipv6?.address?.autoconf,
        ipv6_eui64: w.ipv6?.address?.eui64 || '',
        ipv6_no_default_link_local: !!w.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: w.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: w.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!w.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: w.ipv6?.dup_addr_detect_transmits !== undefined ? w.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: w.ipv6?.source_validation || '',
        mirror_egress: w.mirror?.egress || '',
        mirror_ingress: w.mirror?.ingress || '',
        redirect: w.redirect || '',
        vrf: w.vrf || '',
      };
    }

    function formToWG(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.private_key) result.private_key = form.private_key;
      if (form.port) result.port = Number(form.port);
      if (form.fwmark !== '' && form.fwmark !== null && form.fwmark !== undefined) result.fwmark = Number(form.fwmark);
      if (form.max_dns_retry) result.max_dns_retry = Number(form.max_dns_retry);
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.per_client_thread) result.per_client_thread = true;
      if (form.disable) result.disable = true;

      // IP
      const ip = {};
      if (form.ip_adjust_mss) ip.adjust_mss = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout) ip.arp_cache_timeout = Number(form.ip_arp_cache_timeout);
      if (form.ip_disable_arp_filter) ip.disable_arp_filter = true;
      if (form.ip_disable_forwarding) ip.disable_forwarding = true;
      if (form.ip_enable_arp_accept) ip.enable_arp_accept = true;
      if (form.ip_enable_arp_announce) ip.enable_arp_announce = true;
      if (form.ip_enable_arp_ignore) ip.enable_arp_ignore = true;
      if (form.ip_enable_directed_broadcast) ip.enable_directed_broadcast = true;
      if (form.ip_enable_proxy_arp) ip.enable_proxy_arp = true;
      if (form.ip_proxy_arp_pvlan) ip.proxy_arp_pvlan = true;
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      // IPv6
      const ipv6 = {};
      if (form.ipv6_accept_dad && form.ipv6_accept_dad !== '1') ipv6.accept_dad = form.ipv6_accept_dad;
      if (form.ipv6_autoconf || form.ipv6_eui64 || form.ipv6_no_default_link_local) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_eui64) addr.eui64 = form.ipv6_eui64;
        if (form.ipv6_no_default_link_local) addr.no_default_link_local = true;
        ipv6.address = addr;
      }
      if (form.ipv6_adjust_mss) ipv6.adjust_mss = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6.base_reachable_time = Number(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6.disable_forwarding = true;
      if (form.ipv6_dup_addr_detect_transmits !== '' && form.ipv6_dup_addr_detect_transmits !== null && form.ipv6_dup_addr_detect_transmits !== undefined) ipv6.dup_addr_detect_transmits = Number(form.ipv6_dup_addr_detect_transmits);
      if (form.ipv6_source_validation) ipv6.source_validation = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) result.ipv6 = ipv6;

      // Mirror
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;

      if (form.redirect) result.redirect = form.redirect;
      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces wireguard' });
        const cfg = res.data || {};
        wireguards.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          port: val.port || '',
          mtu: val.mtu || '',
          peer_count: val.peer ? Object.keys(val.peer).length : 0,
          disable: !!val.disable,
          description: val.description || '',
        }));

        // Load interface options
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function showError(err) {
      alert(`错误码: ${err.code || 'ERROR'}\n错误信息: ${err.message || err}`);
    }

    async function openModal(index = -1) {
      if (index >= 0) {
        const raw = wireguards.value[index];
        editingWG.value = wgToForm(raw);
        // Load peers from raw config
        const peerData = raw.peer || {};
        peers.value = Object.entries(peerData).map(([name, p]) => ({
          name,
          ...p,
          allowed_ips: Array.isArray(p.allowed_ips) ? p.allowed_ips.join('\n') : (p.allowed_ips || ''),
        }));
      } else {
        editingWG.value = getDefaultForm();
        peers.value = [];
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingWG.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToWG(form);
        console.log('[WireGuard] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces wireguard ${name}`;
        await api.put('/config', { path, value: config });

        // Save peers
        if (peers.value && peers.value.length) {
          for (const p of peers.value) {
            const peerConfig = { public_key: p.public_key };
            if (p.preshared_key) peerConfig.preshared_key = p.preshared_key;
            if (p.address) peerConfig.address = p.address;
            if (p.allowed_ips) {
              peerConfig.allowed_ips = p.allowed_ips.split('\n').filter(Boolean).map(s => s.trim());
            }
            if (p.host_name) peerConfig.host_name = p.host_name;
            if (p.port) peerConfig.port = Number(p.port);
            if (p.persistent_keepalive) peerConfig.persistent_keepalive = Number(p.persistent_keepalive);
            if (p.description) peerConfig.description = p.description;
            if (p.disable) peerConfig.disable = true;

            await api.put('/config', { path: `${path} peer ${p.name}`, value: peerConfig });
          }
        }

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedWG.value.length) { alert('请先选择要删除的 WireGuard 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedWG.value.length} 个 WireGuard 接口?`)) return;
      try {
        for (const w of selectedWG.value) {
          await api.delete('/config', { path: `interfaces wireguard ${w.name}` });
        }
        selectedWG.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    // Peer management functions
    function openPeerModal(index = -1) {
      if (index >= 0) {
        peerForm.value = JSON.parse(JSON.stringify(peers.value[index]));
        editingPeerIndex.value = index;
      } else {
        peerForm.value = getDefaultPeerForm();
        editingPeerIndex.value = -1;
      }
      peerModalVisible.value = true;
    }

    function savePeer() {
      const p = peerForm.value;
      if (!p.name) { alert('请输入 Peer 别名'); return; }
      if (!p.public_key) { alert('请输入公钥'); return; }

      if (editingPeerIndex.value >= 0) {
        peers.value[editingPeerIndex.value] = JSON.parse(JSON.stringify(p));
      } else {
        peers.value.push(JSON.parse(JSON.stringify(p)));
      }
      peerModalVisible.value = false;
    }

    function deletePeer(index) {
      if (!confirm('确定删除此 Peer?')) return;
      peers.value.splice(index, 1);
    }

    onMounted(() => { load(); });

    return {
      loading, wireguards, selected: selectedWG, modalVisible, editingWG, interfaceOptions, activeTab,
      peers, editingPeerIndex, peerModalVisible, peerForm, selectedPeers, peerColumns,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema, peerSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
      openPeerModal, savePeer, deletePeer,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="wireguards"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingWG?.name ? '编辑 WireGuard 接口' : '创建 WireGuard 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs" />
          <div v-show="activeTab === 'basic'" style="padding: 16px 0;">
            <ConfigForm :schema="basicSchema" :model="editingWG" />
          </div>
          <div v-show="activeTab === 'ip'" style="padding: 16px 0;">
            <ConfigForm :schema="ipSchema" :model="editingWG" />
          </div>
          <div v-show="activeTab === 'ipv6'" style="padding: 16px 0;">
            <ConfigForm :schema="ipv6Schema" :model="editingWG" />
          </div>
          <div v-show="activeTab === 'peer'" style="padding: 16px 0;">
            <DataTable
              :columns="peerColumns"
              :data="peers"
              :selectable="true"
              :actions="['create', 'edit', 'delete']"
              @create="openPeerModal(-1)"
              @edit="openPeerModal"
              @delete="deletePeer"
              @selection-change="selectedPeers = $event"
            />
          </div>
          <div v-show="activeTab === 'mirror'" style="padding: 16px 0;">
            <ConfigForm :schema="mirrorSchema" :model="editingWG" />
          </div>
          <div v-show="activeTab === 'other'" style="padding: 16px 0;">
            <ConfigForm :schema="otherSchema" :model="editingWG" />
          </div>
          <div v-show="activeTab === 'command'" style="padding: 16px 0;">
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre>
          </div>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="save">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="peerModalVisible" :title="editingPeerIndex >= 0 ? '编辑 Peer' : '创建 Peer'" width="700px">
        <template #default>
          <ConfigForm :schema="peerSchema" :model="peerForm" />
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="peerModalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="savePeer">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
