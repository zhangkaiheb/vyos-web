import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'vni', title: 'VNI', width: 100 },
  { key: 'group', title: '组播地址', width: 140 },
  { key: 'remote', title: '远端地址', width: 140 },
  { key: 'source_address', title: '源地址', width: 140 },
  { key: 'port', title: '端口', width: 80 },
  { key: 'mtu', title: 'MTU', width: 80 },
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
  name: 'VxlanPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const vxlans = ref([]);
    const modalVisible = ref(false);
    const editingVxlan = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVxlan = ref([]);

    // VLAN-to-VNI management
    const vlanToVni = ref([]);
    const editingVlanIndex = ref(-1);
    const vlanModalVisible = ref(false);
    const vlanForm = ref(null);
    const selectedVlans = ref([]);

    const vlanColumns = [
      { key: 'vlan', title: 'VLAN ID', width: 120 },
      { key: 'vni', title: 'VNI', width: 120 },
      { key: 'description', title: '描述', width: 200 },
      { key: 'actions', title: '操作', width: 100 },
    ];

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 vxlan0, vxlan1', help: '格式: vxlanN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'vni', title: 'VNI', type: 'number', min: 0, max: 16777214, placeholder: '0-16777214', help: 'VXLAN 虚拟网络标识符' },
      { key: 'group', title: '组播地址', type: 'text', placeholder: 'IPv4 或 IPv6 组播地址', help: 'VXLAN 接口的组播组地址' },
      { key: 'remote', title: '远端地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址', help: '隧道远端地址' },
      { key: 'source_address', title: '源地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址', help: '用于建立连接的源 IP 地址' },
      { key: 'source_interface', title: '源接口', type: 'select', options: interfaceOptions.value, placeholder: '选择源接口', help: '用于建立连接的接口' },
      { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: '连接使用的端口号 (默认: 4789)' },
      { key: 'mac', title: 'MAC 地址', type: 'text', placeholder: '如 00:11:22:33:44:55', help: '硬件 MAC 地址' },
      { key: 'gpe', title: 'VXLAN-GPE', type: 'checkbox', help: '启用通用协议扩展 (VXLAN-GPE)' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const parametersSchema = computed(() => [
      { key: 'param_ignore_df', title: '忽略 DF 位', type: 'checkbox', help: '忽略 DF (不分片) 位' },
      { key: 'param_key', title: '隧道密钥', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '隧道密钥' },
      { key: 'param_no_pmtu_discovery', title: '禁用 PMTU 发现', type: 'checkbox', help: '禁用路径 MTU 发现' },
      { key: 'param_tos', title: 'TOS 值', type: 'number', min: 0, max: 99, placeholder: '0-99', help: '出站数据包的 TOS 值' },
      { key: 'param_ttl', title: 'TTL', type: 'number', min: 0, max: 255, placeholder: '0-255', help: '出站数据包的 TTL (0=继承, 默认: 64)' },
      { key: 'param_encaplimit', title: '封装限制', type: 'number', min: 0, max: 255, placeholder: '0-255', help: '固定封装限制 (默认: 4)' },
      { key: 'param_flowlabel', title: '流标签', type: 'text', placeholder: 'inherit 或 0x0-0x0fffff', help: '出站数据包的流标签' },
      { key: 'param_neighbor_suppress', title: '抑制邻居发现', type: 'checkbox', help: '抑制邻居发现协议' },
      { key: 'param_nolearning', title: '禁用学习', type: 'checkbox', help: '禁用 MAC 地址学习' },
      { key: 'param_vni_filter', title: 'VNI 过滤', type: 'checkbox', help: '启用 VNI 过滤' },
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
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    // VLAN-to-VNI schema
    const vlanSchema = computed(() => [
      { key: 'vlan', title: 'VLAN ID', type: 'text', required: true, placeholder: '如 100 或 100-200', help: 'VLAN ID (0-4094) 或范围' },
      { key: 'vni', title: 'VNI', type: 'text', required: true, placeholder: '如 1000 或 1000-2000', help: 'VNI (0-16777214) 或范围' },
      { key: 'description', title: '描述', type: 'text', placeholder: '映射描述' },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingVxlan.value) return '';
      const v = editingVxlan.value;
      const name = v.name || 'vxlanN';
      const lines = [];

      if (v.description) lines.push(`set interfaces vxlan ${name} description "${v.description}"`);
      if (v.vni !== '' && v.vni !== null && v.vni !== undefined) lines.push(`set interfaces vxlan ${name} vni ${v.vni}`);
      if (v.group) lines.push(`set interfaces vxlan ${name} group ${v.group}`);
      if (v.remote) lines.push(`set interfaces vxlan ${name} remote ${v.remote}`);
      if (v.source_address) lines.push(`set interfaces vxlan ${name} source-address ${v.source_address}`);
      if (v.source_interface) lines.push(`set interfaces vxlan ${name} source-interface ${v.source_interface}`);
      if (v.port) lines.push(`set interfaces vxlan ${name} port ${v.port}`);
      if (v.mac) lines.push(`set interfaces vxlan ${name} mac ${v.mac}`);
      if (v.gpe) lines.push(`set interfaces vxlan ${name} gpe`);
      if (v.mtu) lines.push(`set interfaces vxlan ${name} mtu ${v.mtu}`);
      if (v.disable) lines.push(`set interfaces vxlan ${name} disable`);

      // Parameters
      if (v.param_ignore_df) lines.push(`set interfaces vxlan ${name} parameters ip ignore-df`);
      if (v.param_key !== '' && v.param_key !== null && v.param_key !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip key ${v.param_key}`);
      if (v.param_no_pmtu_discovery) lines.push(`set interfaces vxlan ${name} parameters ip no-pmtu-discovery`);
      if (v.param_tos !== '' && v.param_tos !== null && v.param_tos !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip tos ${v.param_tos}`);
      if (v.param_ttl !== '' && v.param_ttl !== null && v.param_ttl !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip ttl ${v.param_ttl}`);
      if (v.param_encaplimit !== '' && v.param_encaplimit !== null && v.param_encaplimit !== undefined) lines.push(`set interfaces vxlan ${name} parameters ipv6 encaplimit ${v.param_encaplimit}`);
      if (v.param_flowlabel) lines.push(`set interfaces vxlan ${name} parameters ipv6 flowlabel ${v.param_flowlabel}`);
      if (v.param_neighbor_suppress) lines.push(`set interfaces vxlan ${name} parameters neighbor-suppress`);
      if (v.param_nolearning) lines.push(`set interfaces vxlan ${name} parameters nolearning`);
      if (v.param_vni_filter) lines.push(`set interfaces vxlan ${name} parameters vni-filter`);

      // IP
      if (v.ip_adjust_mss) lines.push(`set interfaces vxlan ${name} ip adjust-mss ${v.ip_adjust_mss}`);
      if (v.ip_arp_cache_timeout) lines.push(`set interfaces vxlan ${name} ip arp-cache-timeout ${v.ip_arp_cache_timeout}`);
      if (v.ip_disable_arp_filter) lines.push(`set interfaces vxlan ${name} ip disable-arp-filter`);
      if (v.ip_disable_forwarding) lines.push(`set interfaces vxlan ${name} ip disable-forwarding`);
      if (v.ip_enable_arp_accept) lines.push(`set interfaces vxlan ${name} ip enable-arp-accept`);
      if (v.ip_enable_arp_announce) lines.push(`set interfaces vxlan ${name} ip enable-arp-announce`);
      if (v.ip_enable_arp_ignore) lines.push(`set interfaces vxlan ${name} ip enable-arp-ignore`);
      if (v.ip_enable_directed_broadcast) lines.push(`set interfaces vxlan ${name} ip enable-directed-broadcast`);
      if (v.ip_enable_proxy_arp) lines.push(`set interfaces vxlan ${name} ip enable-proxy-arp`);
      if (v.ip_proxy_arp_pvlan) lines.push(`set interfaces vxlan ${name} ip proxy-arp-pvlan`);
      if (v.ip_source_validation) lines.push(`set interfaces vxlan ${name} ip source-validation ${v.ip_source_validation}`);

      // IPv6
      if (v.ipv6_accept_dad && v.ipv6_accept_dad !== '1') lines.push(`set interfaces vxlan ${name} ipv6 accept-dad ${v.ipv6_accept_dad}`);
      if (v.ipv6_autoconf) lines.push(`set interfaces vxlan ${name} ipv6 address autoconf`);
      if (v.ipv6_eui64) lines.push(`set interfaces vxlan ${name} ipv6 address eui64 ${v.ipv6_eui64}`);
      if (v.ipv6_interface_identifier) lines.push(`set interfaces vxlan ${name} ipv6 address interface-identifier ${v.ipv6_interface_identifier}`);
      if (v.ipv6_no_default_link_local) lines.push(`set interfaces vxlan ${name} ipv6 address no-default-link-local`);
      if (v.ipv6_adjust_mss) lines.push(`set interfaces vxlan ${name} ipv6 adjust-mss ${v.ipv6_adjust_mss}`);
      if (v.ipv6_base_reachable_time) lines.push(`set interfaces vxlan ${name} ipv6 base-reachable-time ${v.ipv6_base_reachable_time}`);
      if (v.ipv6_disable_forwarding) lines.push(`set interfaces vxlan ${name} ipv6 disable-forwarding`);
      if (v.ipv6_dup_addr_detect_transmits !== '' && v.ipv6_dup_addr_detect_transmits !== null && v.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces vxlan ${name} ipv6 dup-addr-detect-transmits ${v.ipv6_dup_addr_detect_transmits}`);
      if (v.ipv6_source_validation) lines.push(`set interfaces vxlan ${name} ipv6 source-validation ${v.ipv6_source_validation}`);

      // Mirror
      if (v.mirror_egress) lines.push(`set interfaces vxlan ${name} mirror egress ${v.mirror_egress}`);
      if (v.mirror_ingress) lines.push(`set interfaces vxlan ${name} mirror ingress ${v.mirror_ingress}`);

      // Other
      if (v.redirect) lines.push(`set interfaces vxlan ${name} redirect ${v.redirect}`);
      if (v.vrf) lines.push(`set interfaces vxlan ${name} vrf ${v.vrf}`);

      // VLAN-to-VNI
      if (vlanToVni.value && vlanToVni.value.length) {
        vlanToVni.value.forEach(m => {
          if (m.description) lines.push(`set interfaces vxlan ${name} vlan-to-vni ${m.vlan} description "${m.description}"`);
          if (m.vni) lines.push(`set interfaces vxlan ${name} vlan-to-vni ${m.vlan} vni ${m.vni}`);
        });
      }

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'parameters', title: '隧道参数' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'vlan', title: 'VLAN-to-VNI' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', vni: '', group: '', remote: '',
        source_address: '', source_interface: '', port: '', mac: '',
        gpe: false, mtu: '', disable: false,
        param_ignore_df: false, param_key: '', param_no_pmtu_discovery: false,
        param_tos: '', param_ttl: '', param_encaplimit: '', param_flowlabel: '',
        param_neighbor_suppress: false, param_nolearning: false, param_vni_filter: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function getDefaultVlanForm() {
      return { vlan: '', vni: '', description: '' };
    }

    function vxlanToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        vni: v.vni !== undefined ? v.vni : '',
        group: v.group || '',
        remote: v.remote || '',
        source_address: v.source_address || '',
        source_interface: v.source_interface || '',
        port: v.port || '',
        mac: v.mac || '',
        gpe: !!v.gpe,
        mtu: v.mtu || '',
        disable: !!v.disable,
        param_ignore_df: !!v.parameters?.ip?.ignore_df,
        param_key: v.parameters?.ip?.key !== undefined ? v.parameters.ip.key : '',
        param_no_pmtu_discovery: !!v.parameters?.ip?.no_pmtu_discovery,
        param_tos: v.parameters?.ip?.tos !== undefined ? v.parameters.ip.tos : '',
        param_ttl: v.parameters?.ip?.ttl !== undefined ? v.parameters.ip.ttl : '',
        param_encaplimit: v.parameters?.ipv6?.encaplimit !== undefined ? v.parameters.ipv6.encaplimit : '',
        param_flowlabel: v.parameters?.ipv6?.flowlabel || '',
        param_neighbor_suppress: !!v.parameters?.neighbor_suppress,
        param_nolearning: !!v.parameters?.nolearning,
        param_vni_filter: !!v.parameters?.vni_filter,
        ip_adjust_mss: v.ip?.adjust_mss || '',
        ip_arp_cache_timeout: v.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!v.ip?.disable_arp_filter,
        ip_disable_forwarding: !!v.ip?.disable_forwarding,
        ip_enable_arp_accept: !!v.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!v.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!v.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!v.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!v.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!v.ip?.proxy_arp_pvlan,
        ip_source_validation: v.ip?.source_validation || '',
        ipv6_accept_dad: v.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!v.ipv6?.address?.autoconf,
        ipv6_eui64: v.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: v.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!v.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: v.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: v.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!v.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: v.ipv6?.dup_addr_detect_transmits !== undefined ? v.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: v.ipv6?.source_validation || '',
        mirror_egress: v.mirror?.egress || '',
        mirror_ingress: v.mirror?.ingress || '',
        redirect: v.redirect || '',
        vrf: v.vrf || '',
      };
    }

    function formToVxlan(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.vni !== '' && form.vni !== null && form.vni !== undefined) result.vni = Number(form.vni);
      if (form.group) result.group = form.group;
      if (form.remote) result.remote = form.remote;
      if (form.source_address) result.source_address = form.source_address;
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.port) result.port = Number(form.port);
      if (form.mac) result.mac = form.mac;
      if (form.gpe) result.gpe = true;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      // Parameters
      const params = {};
      const ipParam = {};
      if (form.param_ignore_df) ipParam.ignore_df = true;
      if (form.param_key !== '' && form.param_key !== null && form.param_key !== undefined) ipParam.key = Number(form.param_key);
      if (form.param_no_pmtu_discovery) ipParam.no_pmtu_discovery = true;
      if (form.param_tos !== '' && form.param_tos !== null && form.param_tos !== undefined) ipParam.tos = Number(form.param_tos);
      if (form.param_ttl !== '' && form.param_ttl !== null && form.param_ttl !== undefined) ipParam.ttl = Number(form.param_ttl);
      if (Object.keys(ipParam).length) params.ip = ipParam;

      const ipv6Param = {};
      if (form.param_encaplimit !== '' && form.param_encaplimit !== null && form.param_encaplimit !== undefined) ipv6Param.encaplimit = Number(form.param_encaplimit);
      if (form.param_flowlabel) ipv6Param.flowlabel = form.param_flowlabel;
      if (Object.keys(ipv6Param).length) params.ipv6 = ipv6Param;

      if (form.param_neighbor_suppress) params.neighbor_suppress = true;
      if (form.param_nolearning) params.nolearning = true;
      if (form.param_vni_filter) params.vni_filter = true;

      if (Object.keys(params).length) result.parameters = params;

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

      if (form.redirect) result.redirect = form.redirect;
      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces vxlan' });
        const cfg = res.data || {};
        vxlans.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          vni: val.vni !== undefined ? val.vni : '',
          group: val.group || '',
          remote: val.remote || '',
          source_address: val.source_address || '',
          port: val.port || '',
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
        const raw = vxlans.value[index];
        editingVxlan.value = vxlanToForm(raw);
        // Load vlan-to-vni mappings
        const v2v = raw['vlan-to-vni'] || {};
        vlanToVni.value = Object.entries(v2v).map(([vlan, m]) => ({
          vlan,
          vni: m.vni || '',
          description: m.description || '',
        }));
      } else {
        editingVxlan.value = getDefaultForm();
        vlanToVni.value = [];
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingVxlan.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToVxlan(form);
        console.log('[VXLAN] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces vxlan ${name}`;
        await api.put('/config', { path, value: config });

        // Save vlan-to-vni mappings
        if (vlanToVni.value && vlanToVni.value.length) {
          for (const m of vlanToVni.value) {
            const vlanConfig = {};
            if (m.description) vlanConfig.description = m.description;
            if (m.vni) vlanConfig.vni = m.vni;
            await api.put('/config', { path: `${path} vlan-to-vni ${m.vlan}`, value: vlanConfig });
          }
        }

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedVxlan.value.length) { alert('请先选择要删除的 VXLAN 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedVxlan.value.length} 个 VXLAN 接口?`)) return;
      try {
        for (const v of selectedVxlan.value) {
          await api.delete('/config', { path: `interfaces vxlan ${v.name}` });
        }
        selectedVxlan.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    // VLAN-to-VNI management
    function openVlanModal(index = -1) {
      if (index >= 0) {
        vlanForm.value = JSON.parse(JSON.stringify(vlanToVni.value[index]));
        editingVlanIndex.value = index;
      } else {
        vlanForm.value = getDefaultVlanForm();
        editingVlanIndex.value = -1;
      }
      vlanModalVisible.value = true;
    }

    function saveVlan() {
      const m = vlanForm.value;
      if (!m.vlan) { alert('请输入 VLAN ID'); return; }
      if (!m.vni) { alert('请输入 VNI'); return; }

      if (editingVlanIndex.value >= 0) {
        vlanToVni.value[editingVlanIndex.value] = JSON.parse(JSON.stringify(m));
      } else {
        vlanToVni.value.push(JSON.parse(JSON.stringify(m)));
      }
      vlanModalVisible.value = false;
    }

    function deleteVlan(index) {
      if (!confirm('确定删除此映射?')) return;
      vlanToVni.value.splice(index, 1);
    }

    onMounted(() => { load(); });

    return {
      loading, vxlans, selected: selectedVxlan, modalVisible, editingVxlan, interfaceOptions, activeTab,
      vlanToVni, editingVlanIndex, vlanModalVisible, vlanForm, selectedVlans, vlanColumns,
      COLUMNS,
      basicSchema, parametersSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema, vlanSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
      openVlanModal, saveVlan, deleteVlan,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="vxlans"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingVxlan?.name ? '编辑 VXLAN 接口' : '创建 VXLAN 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingVxlan" />
            </template>
            <template #parameters>
              <ConfigForm :schema="parametersSchema" :model="editingVxlan" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingVxlan" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingVxlan" />
            </template>
            <template #vlan>
              <DataTable
                :columns="vlanColumns"
                :data="vlanToVni"
                :selectable="true"
                :actions="['create', 'edit', 'delete']"
                @create="openVlanModal(-1)"
                @edit="openVlanModal"
                @delete="deleteVlan"
                @selection-change="selectedVlans = $event"
              />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingVxlan" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingVxlan" />
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

      <DraggableModal v-model:visible="vlanModalVisible" :title="editingVlanIndex >= 0 ? '编辑 VLAN-to-VNI 映射' : '创建 VLAN-to-VNI 映射'" width="600px">
        <template #default>
          <ConfigForm :schema="vlanSchema" :model="vlanForm" />
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="vlanModalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="saveVlan">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
