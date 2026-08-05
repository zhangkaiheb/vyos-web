import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'encapsulation', title: '封装类型', width: 100 },
  { key: 'remote', title: '远端地址', width: 140 },
  { key: 'tunnel_id', title: '隧道 ID', width: 80 },
  { key: 'session_id', title: '会话 ID', width: 80 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

const ENCAPSULATION_OPTIONS = [
  { value: 'udp', label: 'udp (UDP - 默认)' },
  { value: 'ip', label: 'ip (IP)' },
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
  name: 'L2tpv3Page',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const l2tpv3s = ref([]);
    const modalVisible = ref(false);
    const editingL2tpv3 = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedL2tpv3 = ref([]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 l2tpeth0, l2tpeth1', help: '格式: l2tpethN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个 IPv4/IPv6 地址或 CIDR', help: '接口 IP 地址 (支持多行)' },
      { key: 'encapsulation', title: '封装类型', type: 'select', options: ENCAPSULATION_OPTIONS, help: '封装类型 (默认: udp)' },
      { key: 'remote', title: '远端地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址', help: '隧道远端地址' },
      { key: 'source_address', title: '源地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址', help: '用于建立连接的源 IP 地址' },
      { key: 'source_port', title: '源端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: 'UDP 源端口 (默认: 5000)' },
      { key: 'destination_port', title: '目的端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: 'UDP 目的端口 (默认: 5000)' },
      { key: 'tunnel_id', title: '本地隧道 ID', type: 'number', min: 1, max: 429496729, placeholder: '1-429496729', help: '本地隧道标识符' },
      { key: 'peer_tunnel_id', title: '对端隧道 ID', type: 'number', min: 1, max: 429496729, placeholder: '1-429496729', help: '对端隧道标识符' },
      { key: 'session_id', title: '会话 ID', type: 'number', min: 1, max: 429496729, placeholder: '1-429496729', help: '会话标识符' },
      { key: 'peer_session_id', title: '对端会话 ID', type: 'number', min: 1, max: 429496729, placeholder: '1-429496729', help: '对端会话标识符' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1488)' },
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
      { key: 'ipv6_interface_identifier', title: '接口标识符', type: 'text', placeholder: '如 ::1:2:3:4', help: 'SLAAC 接口标识符' },
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
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingL2tpv3.value) return '';
      const l = editingL2tpv3.value;
      const name = l.name || 'l2tpethN';
      const lines = [];

      if (l.description) lines.push(`set interfaces l2tpv3 ${name} description "${l.description}"`);
      if (l.address) {
        l.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces l2tpv3 ${name} address ${a.trim()}`);
        });
      }
      if (l.encapsulation && l.encapsulation !== 'udp') lines.push(`set interfaces l2tpv3 ${name} encapsulation ${l.encapsulation}`);
      if (l.remote) lines.push(`set interfaces l2tpv3 ${name} remote ${l.remote}`);
      if (l.source_address) lines.push(`set interfaces l2tpv3 ${name} source-address ${l.source_address}`);
      if (l.source_port) lines.push(`set interfaces l2tpv3 ${name} source-port ${l.source_port}`);
      if (l.destination_port) lines.push(`set interfaces l2tpv3 ${name} destination-port ${l.destination_port}`);
      if (l.tunnel_id !== '' && l.tunnel_id !== null && l.tunnel_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} tunnel-id ${l.tunnel_id}`);
      if (l.peer_tunnel_id !== '' && l.peer_tunnel_id !== null && l.peer_tunnel_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} peer-tunnel-id ${l.peer_tunnel_id}`);
      if (l.session_id !== '' && l.session_id !== null && l.session_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} session-id ${l.session_id}`);
      if (l.peer_session_id !== '' && l.peer_session_id !== null && l.peer_session_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} peer-session-id ${l.peer_session_id}`);
      if (l.mtu) lines.push(`set interfaces l2tpv3 ${name} mtu ${l.mtu}`);
      if (l.disable) lines.push(`set interfaces l2tpv3 ${name} disable`);

      // IP
      if (l.ip_adjust_mss) lines.push(`set interfaces l2tpv3 ${name} ip adjust-mss ${l.ip_adjust_mss}`);
      if (l.ip_arp_cache_timeout) lines.push(`set interfaces l2tpv3 ${name} ip arp-cache-timeout ${l.ip_arp_cache_timeout}`);
      if (l.ip_disable_arp_filter) lines.push(`set interfaces l2tpv3 ${name} ip disable-arp-filter`);
      if (l.ip_disable_forwarding) lines.push(`set interfaces l2tpv3 ${name} ip disable-forwarding`);
      if (l.ip_enable_arp_accept) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-accept`);
      if (l.ip_enable_arp_announce) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-announce`);
      if (l.ip_enable_arp_ignore) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-ignore`);
      if (l.ip_enable_directed_broadcast) lines.push(`set interfaces l2tpv3 ${name} ip enable-directed-broadcast`);
      if (l.ip_enable_proxy_arp) lines.push(`set interfaces l2tpv3 ${name} ip enable-proxy-arp`);
      if (l.ip_proxy_arp_pvlan) lines.push(`set interfaces l2tpv3 ${name} ip proxy-arp-pvlan`);
      if (l.ip_source_validation) lines.push(`set interfaces l2tpv3 ${name} ip source-validation ${l.ip_source_validation}`);

      // IPv6
      if (l.ipv6_accept_dad && l.ipv6_accept_dad !== '1') lines.push(`set interfaces l2tpv3 ${name} ipv6 accept-dad ${l.ipv6_accept_dad}`);
      if (l.ipv6_autoconf) lines.push(`set interfaces l2tpv3 ${name} ipv6 address autoconf`);
      if (l.ipv6_eui64) lines.push(`set interfaces l2tpv3 ${name} ipv6 address eui64 ${l.ipv6_eui64}`);
      if (l.ipv6_interface_identifier) lines.push(`set interfaces l2tpv3 ${name} ipv6 address interface-identifier ${l.ipv6_interface_identifier}`);
      if (l.ipv6_no_default_link_local) lines.push(`set interfaces l2tpv3 ${name} ipv6 address no-default-link-local`);
      if (l.ipv6_adjust_mss) lines.push(`set interfaces l2tpv3 ${name} ipv6 adjust-mss ${l.ipv6_adjust_mss}`);
      if (l.ipv6_base_reachable_time) lines.push(`set interfaces l2tpv3 ${name} ipv6 base-reachable-time ${l.ipv6_base_reachable_time}`);
      if (l.ipv6_disable_forwarding) lines.push(`set interfaces l2tpv3 ${name} ipv6 disable-forwarding`);
      if (l.ipv6_dup_addr_detect_transmits !== '' && l.ipv6_dup_addr_detect_transmits !== null && l.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces l2tpv3 ${name} ipv6 dup-addr-detect-transmits ${l.ipv6_dup_addr_detect_transmits}`);
      if (l.ipv6_source_validation) lines.push(`set interfaces l2tpv3 ${name} ipv6 source-validation ${l.ipv6_source_validation}`);

      // Mirror
      if (l.mirror_egress) lines.push(`set interfaces l2tpv3 ${name} mirror egress ${l.mirror_egress}`);
      if (l.mirror_ingress) lines.push(`set interfaces l2tpv3 ${name} mirror ingress ${l.mirror_ingress}`);

      // Other
      if (l.vrf) lines.push(`set interfaces l2tpv3 ${name} vrf ${l.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', encapsulation: 'udp', remote: '',
        source_address: '', source_port: '', destination_port: '',
        tunnel_id: '', peer_tunnel_id: '', session_id: '', peer_session_id: '',
        mtu: '', disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        vrf: '',
      };
    }

    function l2tpv3ToForm(l) {
      return {
        name: l.name || '',
        description: l.description || '',
        address: Array.isArray(l.address) ? l.address.join('\n') : (l.address || ''),
        encapsulation: l.encapsulation || 'udp',
        remote: l.remote || '',
        source_address: l.source_address || '',
        source_port: l.source_port || '',
        destination_port: l.destination_port || '',
        tunnel_id: l.tunnel_id !== undefined ? l.tunnel_id : '',
        peer_tunnel_id: l.peer_tunnel_id !== undefined ? l.peer_tunnel_id : '',
        session_id: l.session_id !== undefined ? l.session_id : '',
        peer_session_id: l.peer_session_id !== undefined ? l.peer_session_id : '',
        mtu: l.mtu || '',
        disable: !!l.disable,
        ip_adjust_mss: l.ip?.adjust_mss || '',
        ip_arp_cache_timeout: l.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!l.ip?.disable_arp_filter,
        ip_disable_forwarding: !!l.ip?.disable_forwarding,
        ip_enable_arp_accept: !!l.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!l.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!l.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!l.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!l.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!l.ip?.proxy_arp_pvlan,
        ip_source_validation: l.ip?.source_validation || '',
        ipv6_accept_dad: l.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!l.ipv6?.address?.autoconf,
        ipv6_eui64: l.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: l.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!l.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: l.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: l.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!l.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: l.ipv6?.dup_addr_detect_transmits !== undefined ? l.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: l.ipv6?.source_validation || '',
        mirror_egress: l.mirror?.egress || '',
        mirror_ingress: l.mirror?.ingress || '',
        vrf: l.vrf || '',
      };
    }

    function formToL2tpv3(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.encapsulation && form.encapsulation !== 'udp') result.encapsulation = form.encapsulation;
      if (form.remote) result.remote = form.remote;
      if (form.source_address) result.source_address = form.source_address;
      if (form.source_port) result.source_port = Number(form.source_port);
      if (form.destination_port) result.destination_port = Number(form.destination_port);
      if (form.tunnel_id !== '' && form.tunnel_id !== null && form.tunnel_id !== undefined) result.tunnel_id = Number(form.tunnel_id);
      if (form.peer_tunnel_id !== '' && form.peer_tunnel_id !== null && form.peer_tunnel_id !== undefined) result.peer_tunnel_id = Number(form.peer_tunnel_id);
      if (form.session_id !== '' && form.session_id !== null && form.session_id !== undefined) result.session_id = Number(form.session_id);
      if (form.peer_session_id !== '' && form.peer_session_id !== null && form.peer_session_id !== undefined) result.peer_session_id = Number(form.peer_session_id);
      if (form.mtu) result.mtu = Number(form.mtu);
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
      if (form.ipv6_autoconf || form.ipv6_eui64 || form.ipv6_interface_identifier || form.ipv6_no_default_link_local) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_eui64) addr.eui64 = form.ipv6_eui64;
        if (form.ipv6_interface_identifier) addr.interface_identifier = form.ipv6_interface_identifier;
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

      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces l2tpv3' });
        const cfg = res.data || {};
        l2tpv3s.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          encapsulation: val.encapsulation || 'udp',
          remote: val.remote || '',
          tunnel_id: val.tunnel_id !== undefined ? val.tunnel_id : '',
          session_id: val.session_id !== undefined ? val.session_id : '',
          mtu: val.mtu || '',
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

    function openModal(index = -1) {
      if (index >= 0) {
        editingL2tpv3.value = l2tpv3ToForm(l2tpv3s.value[index]);
      } else {
        editingL2tpv3.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingL2tpv3.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToL2tpv3(form);
        console.log('[L2TPv3] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces l2tpv3 ${name}`;
        await api.put('/config', { path, value: config });

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedL2tpv3.value.length) { alert('请先选择要删除的 L2TPv3 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedL2tpv3.value.length} 个 L2TPv3 接口?`)) return;
      try {
        for (const l of selectedL2tpv3.value) {
          await api.delete('/config', { path: `interfaces l2tpv3 ${l.name}` });
        }
        selectedL2tpv3.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, l2tpv3s, selected: selectedL2tpv3, modalVisible, editingL2tpv3, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="l2tpv3s"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingL2tpv3?.name ? '编辑 L2TPv3 接口' : '创建 L2TPv3 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingL2tpv3" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingL2tpv3" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingL2tpv3" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingL2tpv3" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingL2tpv3" />
            </template>
            <template #command>
              <pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre>
            </template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="save">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
