import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

// Options
const PROTOCOL_OPTIONS = [
  { value: '802.1q', label: '802.1q (默认)' },
  { value: '802.1ad', label: '802.1ad' },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict - Strict Reverse Path Forwarding (RFC3704)' },
  { value: 'loose', label: 'loose - Loose Reverse Path Forwarding (RFC3704)' },
  { value: 'disable', label: 'disable - No source validation' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 - Disable DAD' },
  { value: '1', label: '1 - Enable DAD (默认)' },
  { value: '2', label: '2 - Enable DAD, disable if duplicate MAC found' },
];

const COLUMNS = [
  { key: 'name', title: '接口名称', dataIndex: 'name', width: 120 },
  { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
  { key: 'member_count', title: '成员数', dataIndex: 'member_count', width: 80 },
  { key: 'stp', title: 'STP', dataIndex: 'stp', width: 80 },
  { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 120 },
];

export default defineComponent({
  name: 'BridgePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const bridges = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingBridge = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 br0, br1', help: '格式: brN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'mac', title: 'MAC 地址', type: 'text', placeholder: '如 00:11:22:33:44:55', help: '硬件 MAC 地址' },
      { key: 'aging', title: 'MAC 老化时间', type: 'number', min: 0, max: 1000000, placeholder: '0 或 10-1000000', help: 'MAC 地址老化时间 (秒, 默认: 300, 0=禁用学习)' },
      { key: 'forwarding_delay', title: '转发延迟', type: 'number', min: 0, max: 30, placeholder: '0-30', help: '转发延迟 (秒, 默认: 14)' },
      { key: 'hello_time', title: 'Hello 时间', type: 'number', min: 1, max: 10, placeholder: '1-10', help: 'Hello 包广告间隔 (秒, 默认: 2)' },
      { key: 'max_age', title: '最大老化时间', type: 'number', min: 6, max: 40, placeholder: '6-40', help: '邻居网桥移除间隔 (秒, 默认: 20)' },
      { key: 'priority', title: '优先级', type: 'number', min: 0, max: 61440, step: 4096, placeholder: '0-61440', help: '网桥优先级 (默认: 32768)' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS, help: '服务 VLAN 协议 (默认: 802.1q)' },
      { key: 'members', title: '成员接口', type: 'dual-list', options: interfaceOptions.value, titleLeft: '可选接口', titleRight: '已选成员', help: '桥接成员接口列表' },
      { key: 'stp', title: '启用 STP', type: 'checkbox', help: '启用生成树协议' },
      { key: 'enable_vlan', title: '启用 VLAN', type: 'checkbox', help: '启用 VLAN 感知桥接' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
      { key: 'disable_link_detect', title: '忽略链路状态', type: 'checkbox', help: '忽略链路状态变化' },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: '客户端 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '客户端标识符' },
      { key: 'dhcp_default_route_distance', title: '默认路由距离', type: 'number', min: 1, max: 255, placeholder: '1-255', help: '默认路由距离 (默认: 210)' },
      { key: 'dhcp_host_name', title: '主机名', type: 'text', placeholder: '覆盖系统主机名', help: '发送到 DHCP 服务器的主机名' },
      { key: 'dhcp_mtu', title: '使用 DHCP MTU', type: 'checkbox', help: '使用 DHCP 服务器的 MTU 值' },
      { key: 'dhcp_no_default_route', title: '不安装默认路由', type: 'checkbox', help: '不安装默认路由到系统' },
      { key: 'dhcp_reject', title: '拒绝地址', type: 'textarea', placeholder: '每行一个 IP 或子网', help: '拒绝 DHCP 租约的 IP 地址或子网' },
      { key: 'dhcp_user_class', title: '用户类别', type: 'text', placeholder: 'DHCP 选项字符串', help: '用户可配置选项' },
      { key: 'dhcp_vendor_class_id', title: '厂商标识', type: 'text', placeholder: 'DHCP 选项字符串', help: '厂商标识符' },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: 'DUID', type: 'text', placeholder: '如 00:01:00:01:2a:3b:4c:5d', help: 'DHCP 唯一标识符' },
      { key: 'dhcpv6_no_release', title: '不发送释放消息', type: 'checkbox', help: '客户端退出时不发送释放消息' },
      { key: 'dhcpv6_no_request_dns', title: '不请求 DNS', type: 'checkbox', help: '不请求 DNS 服务器' },
      { key: 'dhcpv6_no_request_domain', title: '不请求域名', type: 'checkbox', help: '不请求域名' },
      { key: 'dhcpv6_parameters_only', title: '仅参数', type: 'checkbox', help: '仅获取配置参数,不获取地址' },
      { key: 'dhcpv6_rapid_commit', title: '快速提交', type: 'checkbox', help: '等待立即回复而非广告' },
      { key: 'dhcpv6_temporary', title: '临时地址', type: 'checkbox', help: 'IPv6 临时地址' },
    ]);

    const igmpSchema = computed(() => [
      { key: 'igmp_enable', title: '启用 IGMP', type: 'checkbox', help: '启用 IGMP/MLD 设置' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: '调整 MSS', type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: 'clamp-mss-to-pmtu - 自动设置 MSS' },
      ], placeholder: '选择或输入 536-65535', help: '调整 TCP MSS 值' },
      { key: 'ip_arp_cache_timeout', title: 'ARP 缓存超时', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: 'ARP 缓存条目超时 (秒, 默认: 30)' },
      { key: 'ip_disable_arp_filter', title: '禁用 ARP 过滤', type: 'checkbox', help: '禁用 ARP 过滤' },
      { key: 'ip_disable_forwarding', title: '禁用 IP 转发', type: 'checkbox', help: '禁用 IP 转发' },
      { key: 'ip_enable_arp_accept', title: '启用 ARP 接受', type: 'checkbox', help: '启用 ARP 接受' },
      { key: 'ip_enable_arp_announce', title: '启用 ARP 宣告', type: 'checkbox', help: '启用 ARP 宣告' },
      { key: 'ip_enable_arp_ignore', title: '启用 ARP 忽略', type: 'checkbox', help: '启用 ARP 忽略' },
      { key: 'ip_enable_directed_broadcast', title: '启用定向广播', type: 'checkbox', help: '启用定向广播转发' },
      { key: 'ip_enable_proxy_arp', title: '启用 Proxy ARP', type: 'checkbox', help: '启用代理 ARP' },
      { key: 'ip_proxy_arp_pvlan', title: 'Proxy ARP PVLAN', type: 'checkbox', help: '启用私有 VLAN 代理 ARP' },
      { key: 'ip_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: '接受 DAD', type: 'select', options: ACCEPT_DAD_OPTIONS, help: '接受重复地址检测 (默认: 1)' },
      { key: 'ipv6_autoconf', title: '自动配置', type: 'checkbox', help: '启用 SLAAC 自动配置' },
      { key: 'ipv6_eui64', title: 'EUI-64 前缀', type: 'text', placeholder: '如 2001:db8::/64', help: '基于 MAC 的 EUI-64 前缀' },
      { key: 'ipv6_no_default_link_local', title: '移除默认链路本地地址', type: 'checkbox', help: '移除默认链路本地地址' },
      { key: 'ipv6_adjust_mss', title: '调整 MSS', type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: 'clamp-mss-to-pmtu - 自动设置 MSS' },
      ], placeholder: '选择或输入 536-65535', help: '调整 TCP MSS 值' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: '基础可达时间 (秒, 默认: 30)' },
      { key: 'ipv6_disable_forwarding', title: '禁用 IPv6 转发', type: 'checkbox', help: '禁用 IPv6 转发' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 探测次数', type: 'number', min: 0, max: 100, placeholder: '0 或 1-100', help: 'DAD 探测次数 (默认: 1, 0=禁用)' },
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

    // Command text
    const commandText = computed(() => {
      if (!editingBridge.value) return '';
      const b = editingBridge.value;
      const name = b.name || 'brN';
      const lines = [];

      if (b.description) lines.push(`set interfaces bridge ${name} description "${b.description}"`);
      if (b.mac) lines.push(`set interfaces bridge ${name} mac ${b.mac}`);
      if (b.aging !== undefined && b.aging !== null) lines.push(`set interfaces bridge ${name} aging ${b.aging}`);
      if (b.forwarding_delay) lines.push(`set interfaces bridge ${name} forwarding-delay ${b.forwarding_delay}`);
      if (b.hello_time) lines.push(`set interfaces bridge ${name} hello-time ${b.hello_time}`);
      if (b.max_age) lines.push(`set interfaces bridge ${name} max-age ${b.max_age}`);
      if (b.priority) lines.push(`set interfaces bridge ${name} priority ${b.priority}`);
      if (b.protocol) lines.push(`set interfaces bridge ${name} protocol ${b.protocol}`);
      if (b.mtu) lines.push(`set interfaces bridge ${name} mtu ${b.mtu}`);
      if (b.stp) lines.push(`set interfaces bridge ${name} stp`);
      if (b.enable_vlan) lines.push(`set interfaces bridge ${name} enable-vlan`);
      if (b.disable) lines.push(`set interfaces bridge ${name} disable`);
      if (b.disable_link_detect) lines.push(`set interfaces bridge ${name} disable-link-detect`);

      // Members
      if (b.members && b.members.length > 0) {
        b.members.forEach(m => lines.push(`set interfaces bridge ${name} member interface ${m}`));
      }

      // DHCP
      if (b.dhcp_client_id) lines.push(`set interfaces bridge ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) lines.push(`set interfaces bridge ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) lines.push(`set interfaces bridge ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) lines.push(`set interfaces bridge ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) lines.push(`set interfaces bridge ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => lines.push(`set interfaces bridge ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) lines.push(`set interfaces bridge ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) lines.push(`set interfaces bridge ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      // DHCPv6
      if (b.dhcpv6_duid) lines.push(`set interfaces bridge ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) lines.push(`set interfaces bridge ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) lines.push(`set interfaces bridge ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) lines.push(`set interfaces bridge ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) lines.push(`set interfaces bridge ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) lines.push(`set interfaces bridge ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) lines.push(`set interfaces bridge ${name} dhcpv6-options temporary`);

      // IGMP
      if (b.igmp_enable) lines.push(`set interfaces bridge ${name} igmp enable`);

      // IP
      if (b.ip_adjust_mss) lines.push(`set interfaces bridge ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) lines.push(`set interfaces bridge ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) lines.push(`set interfaces bridge ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) lines.push(`set interfaces bridge ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) lines.push(`set interfaces bridge ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) lines.push(`set interfaces bridge ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) lines.push(`set interfaces bridge ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) lines.push(`set interfaces bridge ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) lines.push(`set interfaces bridge ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) lines.push(`set interfaces bridge ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) lines.push(`set interfaces bridge ${name} ip source-validation ${b.ip_source_validation}`);

      // IPv6
      if (b.ipv6_accept_dad) lines.push(`set interfaces bridge ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) lines.push(`set interfaces bridge ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) lines.push(`set interfaces bridge ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) lines.push(`set interfaces bridge ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) lines.push(`set interfaces bridge ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) lines.push(`set interfaces bridge ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) lines.push(`set interfaces bridge ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) lines.push(`set interfaces bridge ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) lines.push(`set interfaces bridge ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      // Mirror
      if (b.mirror_egress) lines.push(`set interfaces bridge ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) lines.push(`set interfaces bridge ${name} mirror ingress ${b.mirror_ingress}`);

      // Other
      if (b.redirect) lines.push(`set interfaces bridge ${name} redirect ${b.redirect}`);
      if (b.vrf) lines.push(`set interfaces bridge ${name} vrf ${b.vrf}`);

      return lines.join('\n') || '# 未配置任何参数';
    });

    // Tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'dhcp', title: 'DHCP' },
      { key: 'dhcpv6', title: 'DHCPv6' },
      { key: 'igmp', title: 'IGMP' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'preview', title: '命令预览' },
    ]);

    // Default form
    function getDefaultForm() {
      return {
        name: '',
        description: '',
        mac: '',
        aging: 300,
        forwarding_delay: 14,
        hello_time: 2,
        max_age: 20,
        priority: 32768,
        protocol: '802.1q',
        members: [],
        stp: false,
        enable_vlan: false,
        mtu: 1500,
        disable: false,
        disable_link_detect: false,
        dhcp_client_id: '',
        dhcp_default_route_distance: 210,
        dhcp_host_name: '',
        dhcp_mtu: false,
        dhcp_no_default_route: false,
        dhcp_reject: '',
        dhcp_user_class: '',
        dhcp_vendor_class_id: '',
        dhcpv6_duid: '',
        dhcpv6_no_release: false,
        dhcpv6_no_request_dns: false,
        dhcpv6_no_request_domain: false,
        dhcpv6_parameters_only: false,
        dhcpv6_rapid_commit: false,
        dhcpv6_temporary: false,
        igmp_enable: false,
        ip_adjust_mss: '',
        ip_arp_cache_timeout: 30,
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
        ipv6_autoconf: false,
        ipv6_eui64: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: 30,
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: 1,
        ipv6_source_validation: '',
        mirror_egress: '',
        mirror_ingress: '',
        redirect: '',
        vrf: '',
      };
    }

    // Convert config to form
    function bridgeToForm(cfg) {
      const form = getDefaultForm();
      form.name = cfg.name || '';
      form.description = cfg.description || '';
      form.mac = cfg.mac || '';
      form.aging = cfg.aging || 300;
      form.forwarding_delay = cfg['forwarding-delay'] || 14;
      form.hello_time = cfg['hello-time'] || 2;
      form.max_age = cfg['max-age'] || 20;
      form.priority = cfg.priority || 32768;
      form.protocol = cfg.protocol || '802.1q';
      form.mtu = cfg.mtu || 1500;
      form.stp = !!cfg.stp;
      form.enable_vlan = !!cfg['enable-vlan'];
      form.disable = !!cfg.disable;
      form.disable_link_detect = !!cfg['disable-link-detect'];

      // Members
      form.members = (cfg.member?.interface || []).map(i => typeof i === 'string' ? i : Object.keys(i)[0]);

      // DHCP
      if (cfg['dhcp-options']) {
        form.dhcp_client_id = cfg['dhcp-options']['client-id'] || '';
        form.dhcp_default_route_distance = cfg['dhcp-options']['default-route-distance'] || 210;
        form.dhcp_host_name = cfg['dhcp-options']['host-name'] || '';
        form.dhcp_mtu = !!cfg['dhcp-options'].mtu;
        form.dhcp_no_default_route = !!cfg['dhcp-options']['no-default-route'];
        form.dhcp_reject = (cfg['dhcp-options'].reject || []).join('\n');
        form.dhcp_user_class = cfg['dhcp-options']['user-class'] || '';
        form.dhcp_vendor_class_id = cfg['dhcp-options']['vendor-class-id'] || '';
      }

      // DHCPv6
      if (cfg['dhcpv6-options']) {
        form.dhcpv6_duid = cfg['dhcpv6-options'].duid || '';
        form.dhcpv6_no_release = !!cfg['dhcpv6-options']['no-release'];
        form.dhcpv6_no_request_dns = !!cfg['dhcpv6-options']['no-request-dns'];
        form.dhcpv6_no_request_domain = !!cfg['dhcpv6-options']['no-request-domain-name'];
        form.dhcpv6_parameters_only = !!cfg['dhcpv6-options']['parameters-only'];
        form.dhcpv6_rapid_commit = !!cfg['dhcpv6-options']['rapid-commit'];
        form.dhcpv6_temporary = !!cfg['dhcpv6-options'].temporary;
      }

      // IGMP
      if (cfg.igmp) {
        form.igmp_enable = !!cfg.igmp.enable;
      }

      // IP
      if (cfg.ip) {
        form.ip_adjust_mss = cfg.ip['adjust-mss'] || '';
        form.ip_arp_cache_timeout = cfg.ip['arp-cache-timeout'] || 30;
        form.ip_disable_arp_filter = !!cfg.ip['disable-arp-filter'];
        form.ip_disable_forwarding = !!cfg.ip['disable-forwarding'];
        form.ip_enable_arp_accept = !!cfg.ip['enable-arp-accept'];
        form.ip_enable_arp_announce = !!cfg.ip['enable-arp-announce'];
        form.ip_enable_arp_ignore = !!cfg.ip['enable-arp-ignore'];
        form.ip_enable_directed_broadcast = !!cfg.ip['enable-directed-broadcast'];
        form.ip_enable_proxy_arp = !!cfg.ip['enable-proxy-arp'];
        form.ip_proxy_arp_pvlan = !!cfg.ip['proxy-arp-pvlan'];
        form.ip_source_validation = cfg.ip['source-validation'] || '';
      }

      // IPv6
      if (cfg.ipv6) {
        form.ipv6_accept_dad = cfg.ipv6['accept-dad'] || '1';
        form.ipv6_autoconf = cfg.ipv6.address === 'autoconf' || !!cfg.ipv6.address?.autoconf;
        form.ipv6_eui64 = typeof cfg.ipv6.address === 'object' && cfg.ipv6.address.eui64 ? Object.keys(cfg.ipv6.address.eui64)[0] || '' : '';
        form.ipv6_no_default_link_local = cfg.ipv6.address === 'no-default-link-local' || !!cfg.ipv6.address?.['no-default-link-local'];
        form.ipv6_adjust_mss = cfg.ipv6['adjust-mss'] || '';
        form.ipv6_base_reachable_time = cfg.ipv6['base-reachable-time'] || 30;
        form.ipv6_disable_forwarding = !!cfg.ipv6['disable-forwarding'];
        form.ipv6_dup_addr_detect_transmits = cfg.ipv6['dup-addr-detect-transmits'] || 1;
        form.ipv6_source_validation = cfg.ipv6['source-validation'] || '';
      }

      // Mirror
      if (cfg.mirror) {
        form.mirror_egress = cfg.mirror.egress || '';
        form.mirror_ingress = cfg.mirror.ingress || '';
      }

      // Other
      form.redirect = cfg.redirect || '';
      form.vrf = cfg.vrf || '';

      return form;
    }

    // Load data
    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('interfaces bridge');
        bridges.value = Object.entries(res.data || {}).map(([name, cfg]) => ({
          name,
          ...cfg,
          member_count: (cfg.member?.interface || []).length,
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

    // Open modal
    function openModal(index = -1) {
      if (index >= 0) {
        editingBridge.value = bridgeToForm(bridges.value[index]);
      } else {
        editingBridge.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    // Save
    async function save() {
      if (!editingBridge.value) return;
      const b = editingBridge.value;
      const name = b.name;
      if (!name) {
        showError('请输入接口名称');
        return;
      }

      const commands = [];
      const deleteCmd = `delete interfaces bridge ${name}`;

      // Build commands from form
      if (b.description) commands.push(`set interfaces bridge ${name} description "${b.description}"`);
      if (b.mac) commands.push(`set interfaces bridge ${name} mac ${b.mac}`);
      if (b.aging !== undefined && b.aging !== null) commands.push(`set interfaces bridge ${name} aging ${b.aging}`);
      if (b.forwarding_delay) commands.push(`set interfaces bridge ${name} forwarding-delay ${b.forwarding_delay}`);
      if (b.hello_time) commands.push(`set interfaces bridge ${name} hello-time ${b.hello_time}`);
      if (b.max_age) commands.push(`set interfaces bridge ${name} max-age ${b.max_age}`);
      if (b.priority) commands.push(`set interfaces bridge ${name} priority ${b.priority}`);
      if (b.protocol) commands.push(`set interfaces bridge ${name} protocol ${b.protocol}`);
      if (b.mtu) commands.push(`set interfaces bridge ${name} mtu ${b.mtu}`);
      if (b.stp) commands.push(`set interfaces bridge ${name} stp`);
      if (b.enable_vlan) commands.push(`set interfaces bridge ${name} enable-vlan`);
      if (b.disable) commands.push(`set interfaces bridge ${name} disable`);
      if (b.disable_link_detect) commands.push(`set interfaces bridge ${name} disable-link-detect`);

      if (b.members && b.members.length > 0) {
        b.members.forEach(m => commands.push(`set interfaces bridge ${name} member interface ${m}`));
      }

      if (b.dhcp_client_id) commands.push(`set interfaces bridge ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) commands.push(`set interfaces bridge ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) commands.push(`set interfaces bridge ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) commands.push(`set interfaces bridge ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) commands.push(`set interfaces bridge ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => commands.push(`set interfaces bridge ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) commands.push(`set interfaces bridge ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) commands.push(`set interfaces bridge ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      if (b.dhcpv6_duid) commands.push(`set interfaces bridge ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) commands.push(`set interfaces bridge ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) commands.push(`set interfaces bridge ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) commands.push(`set interfaces bridge ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) commands.push(`set interfaces bridge ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) commands.push(`set interfaces bridge ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) commands.push(`set interfaces bridge ${name} dhcpv6-options temporary`);

      if (b.igmp_enable) commands.push(`set interfaces bridge ${name} igmp enable`);

      if (b.ip_adjust_mss) commands.push(`set interfaces bridge ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) commands.push(`set interfaces bridge ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) commands.push(`set interfaces bridge ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) commands.push(`set interfaces bridge ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) commands.push(`set interfaces bridge ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) commands.push(`set interfaces bridge ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) commands.push(`set interfaces bridge ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) commands.push(`set interfaces bridge ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) commands.push(`set interfaces bridge ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) commands.push(`set interfaces bridge ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) commands.push(`set interfaces bridge ${name} ip source-validation ${b.ip_source_validation}`);

      if (b.ipv6_accept_dad) commands.push(`set interfaces bridge ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) commands.push(`set interfaces bridge ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) commands.push(`set interfaces bridge ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) commands.push(`set interfaces bridge ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) commands.push(`set interfaces bridge ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) commands.push(`set interfaces bridge ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) commands.push(`set interfaces bridge ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) commands.push(`set interfaces bridge ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) commands.push(`set interfaces bridge ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      if (b.mirror_egress) commands.push(`set interfaces bridge ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) commands.push(`set interfaces bridge ${name} mirror ingress ${b.mirror_ingress}`);

      if (b.redirect) commands.push(`set interfaces bridge ${name} redirect ${b.redirect}`);
      if (b.vrf) commands.push(`set interfaces bridge ${name} vrf ${b.vrf}`);

      try {
        const allCommands = [deleteCmd, ...commands];
        await configApi.configure(allCommands);
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    // Delete
    async function remove() {
      if (selected.value.length === 0) {
        showError('请选择要删除的接口');
        return;
      }
      if (!confirm(`确定要删除选中的 ${selected.value.length} 个桥接接口吗?`)) return;

      const commands = selected.value.map(b => `delete interfaces bridge ${b.name}`);
      try {
        await configApi.configure(commands);
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => {
      load();
    });

    return {
      loading, bridges, selected, modalVisible, editingBridge, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, igmpSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="bridges"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? bridges.indexOf(selected[0]) : -1)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
        rowKey="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'stp'">
            <span :class="record.stp ? 'badge badge-success' : 'badge badge-secondary'">
              {{ record.stp ? '启用' : '禁用' }}
            </span>
          </template>
          <template v-if="column.key === 'disable'">
            <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
              {{ record.disable ? '是' : '否' }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(bridges.indexOf(record))">编辑</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">删除</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingBridge?.name ? '编辑桥接接口' : '创建桥接接口'"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingBridge">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingBridge" :schema="basicSchema" />
            </template>
            <template #dhcp>
              <ConfigForm v-model="editingBridge" :schema="dhcpSchema" />
            </template>
            <template #dhcpv6>
              <ConfigForm v-model="editingBridge" :schema="dhcpv6Schema" />
            </template>
            <template #igmp>
              <ConfigForm v-model="editingBridge" :schema="igmpSchema" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingBridge" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingBridge" :schema="ipv6Schema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingBridge" :schema="mirrorSchema" />
            </template>
            <template #other>
              <ConfigForm v-model="editingBridge" :schema="otherSchema" />
            </template>
            <template #preview>
              <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">{{ commandText }}</pre>
            </template>
          </TabGroup>
        </div>
      </DraggableModal>
    </div>
  `,
});
