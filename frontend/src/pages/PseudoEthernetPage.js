import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'source_interface', title: '源接口', width: 120 },
  { key: 'mode', title: '模式', width: 120 },
  { key: 'mac', title: 'MAC 地址', width: 140 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

const MODE_OPTIONS = [
  { value: 'private', label: 'private (私有 - 默认)' },
  { value: 'vepa', label: 'vepa (VEPA 反射中继)' },
  { value: 'bridge', label: 'bridge (桥接)' },
  { value: 'passthru', label: 'passthru (直通)' },
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
  name: 'PseudoEthernetPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const pseudoEthernets = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedItems = ref([]);

    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 peth0, peth1', help: '格式: pethN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个 IPv4/IPv6 地址或 CIDR', help: '接口 IP 地址 (支持多行)' },
      { key: 'source_interface', title: '源接口', type: 'select', options: interfaceOptions.value, placeholder: '选择物理接口', help: '流量通过的物理接口' },
      { key: 'mode', title: '模式', type: 'select', options: MODE_OPTIONS, help: '接收模式 (默认: private)' },
      { key: 'mac', title: 'MAC 地址', type: 'text', placeholder: '如 00:11:22:33:44:55', help: 'Media Access Control 地址' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'disable_link_detect', title: '忽略链路状态', type: 'checkbox', help: '忽略链路状态变化' },
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
      { key: 'ipv6_interface_identifier', title: '接口标识符', type: 'text', placeholder: '::h:h:h:h', help: 'SLAAC 接口标识符' },
      { key: 'ipv6_no_default_link_local', title: '无默认链路本地地址', type: 'checkbox', help: '移除默认链路本地地址' },
      { key: 'ipv6_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: '基础可达时间 (秒, 默认: 30)' },
      { key: 'ipv6_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IPv6 转发' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 传输次数', type: 'number', min: 0, max: 100, placeholder: '0-100', help: 'DAD 期间发送的 NS 消息数 (默认: 1, 0=禁用)' },
      { key: 'ipv6_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: '客户端 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '用于向 DHCP 服务器标识客户端' },
      { key: 'dhcp_default_route_distance', title: '默认路由距离', type: 'number', min: 1, max: 255, placeholder: '1-255', help: '默认路由的距离 (默认: 210)' },
      { key: 'dhcp_host_name', title: '主机名', type: 'text', placeholder: '主机名', help: '覆盖系统主机名' },
      { key: 'dhcp_mtu', title: '使用 DHCP MTU', type: 'checkbox', help: '使用 DHCP 服务器提供的 MTU' },
      { key: 'dhcp_no_default_route', title: '不安装默认路由', type: 'checkbox', help: '不安装默认路由' },
      { key: 'dhcp_reject', title: '拒绝地址', type: 'textarea', placeholder: '每行一个 IP 或子网', help: '拒绝 DHCP 租约的地址' },
      { key: 'dhcp_user_class', title: '用户类别', type: 'text', placeholder: 'DHCP 选项字符串', help: '用户可配置选项' },
      { key: 'dhcp_vendor_class_id', title: '厂商类别 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '标识厂商客户端类型' },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: 'DUID', type: 'text', placeholder: 'DHCP 唯一标识符', help: '客户端发送的 DUID' },
      { key: 'dhcpv6_no_release', title: '不发送 Release', type: 'checkbox', help: '客户端退出时不发送 release 消息' },
      { key: 'dhcpv6_no_request_dns', title: '不请求 DNS', type: 'checkbox', help: '不请求 DNS 服务器' },
      { key: 'dhcpv6_no_request_domain_name', title: '不请求域名', type: 'checkbox', help: '不请求域名' },
      { key: 'dhcpv6_parameters_only', title: '仅获取参数', type: 'checkbox', help: '仅获取配置参数，不获取地址' },
      { key: 'dhcpv6_pd_instances', title: '前缀委派实例', type: 'textarea', placeholder: '每行一个: instance,interface,address,sla-id', help: '格式: 实例号,接口名,地址,SLA-ID (每行一个, 地址和 SLA-ID 可选)' },
      { key: 'dhcpv6_pd_length', title: '前缀长度', type: 'number', min: 32, max: 64, placeholder: '32-64', help: '请求的 IPv6 前缀长度 (默认: 64)' },
      { key: 'dhcpv6_rapid_commit', title: '快速提交', type: 'checkbox', help: '等待立即回复而非通告' },
      { key: 'dhcpv6_temporary', title: '临时地址', type: 'checkbox', help: 'IPv6 临时地址' },
    ]);

    const vifSchema = computed(() => [
      { key: 'vif', title: 'VLAN 子接口', type: 'textarea', placeholder: 'JSON 格式: {"10":{"description":"VLAN10","mtu":1500}}', help: '键为 VLAN ID (0-4094)，值为子接口配置' },
      { key: 'vif_s', title: 'QinQ 子接口', type: 'textarea', placeholder: 'JSON 格式: {"10":{"vif":{"20":{"description":"S10.C20"}}}}', help: 'QinQ TAG-S 子接口 (S-VLAN ID 0-4094)' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像出方向流量到目标接口' },
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像入方向流量到目标接口' },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const m = editingItem.value;
      const name = m.name || 'pethN';
      const lines = [];

      if (m.description) lines.push(`set interfaces pseudo-ethernet ${name} description "${m.description}"`);
      if (m.address) {
        m.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces pseudo-ethernet ${name} address ${a.trim()}`);
        });
      }
      if (m.source_interface) lines.push(`set interfaces pseudo-ethernet ${name} source-interface ${m.source_interface}`);
      if (m.mode && m.mode !== 'private') lines.push(`set interfaces pseudo-ethernet ${name} mode ${m.mode}`);
      if (m.mac) lines.push(`set interfaces pseudo-ethernet ${name} mac ${m.mac}`);
      if (m.mtu) lines.push(`set interfaces pseudo-ethernet ${name} mtu ${m.mtu}`);
      if (m.disable_link_detect) lines.push(`set interfaces pseudo-ethernet ${name} disable-link-detect`);
      if (m.disable) lines.push(`set interfaces pseudo-ethernet ${name} disable`);

      // IP
      if (m.ip_adjust_mss) lines.push(`set interfaces pseudo-ethernet ${name} ip adjust-mss ${m.ip_adjust_mss}`);
      if (m.ip_arp_cache_timeout) lines.push(`set interfaces pseudo-ethernet ${name} ip arp-cache-timeout ${m.ip_arp_cache_timeout}`);
      if (m.ip_disable_arp_filter) lines.push(`set interfaces pseudo-ethernet ${name} ip disable-arp-filter`);
      if (m.ip_disable_forwarding) lines.push(`set interfaces pseudo-ethernet ${name} ip disable-forwarding`);
      if (m.ip_enable_arp_accept) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-accept`);
      if (m.ip_enable_arp_announce) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-announce`);
      if (m.ip_enable_arp_ignore) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-ignore`);
      if (m.ip_enable_directed_broadcast) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-directed-broadcast`);
      if (m.ip_enable_proxy_arp) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-proxy-arp`);
      if (m.ip_proxy_arp_pvlan) lines.push(`set interfaces pseudo-ethernet ${name} ip proxy-arp-pvlan`);
      if (m.ip_source_validation) lines.push(`set interfaces pseudo-ethernet ${name} ip source-validation ${m.ip_source_validation}`);

      // IPv6
      if (m.ipv6_accept_dad && m.ipv6_accept_dad !== '1') lines.push(`set interfaces pseudo-ethernet ${name} ipv6 accept-dad ${m.ipv6_accept_dad}`);
      if (m.ipv6_autoconf) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address autoconf`);
      if (m.ipv6_eui64) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address eui64 ${m.ipv6_eui64}`);
      if (m.ipv6_interface_identifier) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address interface-identifier ${m.ipv6_interface_identifier}`);
      if (m.ipv6_no_default_link_local) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address no-default-link-local`);
      if (m.ipv6_adjust_mss) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 adjust-mss ${m.ipv6_adjust_mss}`);
      if (m.ipv6_base_reachable_time) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 base-reachable-time ${m.ipv6_base_reachable_time}`);
      if (m.ipv6_disable_forwarding) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 disable-forwarding`);
      if (m.ipv6_dup_addr_detect_transmits !== '' && m.ipv6_dup_addr_detect_transmits !== null && m.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 dup-addr-detect-transmits ${m.ipv6_dup_addr_detect_transmits}`);
      if (m.ipv6_source_validation) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 source-validation ${m.ipv6_source_validation}`);

      // DHCP
      if (m.dhcp_client_id) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options client-id ${m.dhcp_client_id}`);
      if (m.dhcp_default_route_distance) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options default-route-distance ${m.dhcp_default_route_distance}`);
      if (m.dhcp_host_name) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options host-name ${m.dhcp_host_name}`);
      if (m.dhcp_mtu) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options mtu`);
      if (m.dhcp_no_default_route) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options no-default-route`);
      if (m.dhcp_reject) {
        m.dhcp_reject.split('\n').filter(Boolean).forEach(r => {
          lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options reject ${r.trim()}`);
        });
      }
      if (m.dhcp_user_class) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options user-class ${m.dhcp_user_class}`);
      if (m.dhcp_vendor_class_id) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options vendor-class-id ${m.dhcp_vendor_class_id}`);

      // DHCPv6
      if (m.dhcpv6_duid) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options duid ${m.dhcpv6_duid}`);
      if (m.dhcpv6_no_release) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options no-release`);
      if (m.dhcpv6_no_request_dns) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options no-request-dns`);
      if (m.dhcpv6_no_request_domain_name) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options no-request-domain-name`);
      if (m.dhcpv6_parameters_only) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options parameters-only`);
      if (m.dhcpv6_pd_length) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options pd-length ${m.dhcpv6_pd_length}`);
      if (m.dhcpv6_pd_instances) {
        m.dhcpv6_pd_instances.split('\n').filter(Boolean).forEach(line => {
          const parts = line.trim().split(',').map(s => s.trim());
          if (parts.length >= 2) {
            const [inst, iface, addr, slaId] = parts;
            lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options pd ${inst} interface ${iface}`);
            if (addr) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options pd ${inst} interface ${iface} address ${addr}`);
            if (slaId) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options pd ${inst} interface ${iface} sla-id ${slaId}`);
          }
        });
      }
      if (m.dhcpv6_rapid_commit) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options rapid-commit`);
      if (m.dhcpv6_temporary) lines.push(`set interfaces pseudo-ethernet ${name} dhcpv6-options temporary`);

      // VIF
      if (m.vif) {
        try {
          const vifs = JSON.parse(m.vif);
          Object.entries(vifs).forEach(([vlanId, cfg]) => {
            if (cfg.description) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} description "${cfg.description}"`);
            if (cfg.mtu) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} mtu ${cfg.mtu}`);
            if (cfg.mac) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} mac ${cfg.mac}`);
            if (cfg.disable) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} disable`);
            if (cfg.disable_link_detect) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} disable-link-detect`);
            if (cfg.egress_qos) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} egress-qos ${cfg.egress_qos}`);
            if (cfg.ingress_qos) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} ingress-qos ${cfg.ingress_qos}`);
            if (cfg.redirect) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} redirect ${cfg.redirect}`);
            if (cfg.vrf) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} vrf ${cfg.vrf}`);
          });
        } catch (e) { /* ignore parse errors */ }
      }

      // VIF-S
      if (m.vif_s) {
        try {
          const vifs = JSON.parse(m.vif_s);
          Object.entries(vifs).forEach(([svlanId, svlanCfg]) => {
            if (svlanCfg.vif) {
              Object.entries(svlanCfg.vif).forEach(([cvlanId, cfg]) => {
                if (cfg.description) lines.push(`set interfaces pseudo-ethernet ${name} vif-s ${svlanId} vif ${cvlanId} description "${cfg.description}"`);
                if (cfg.mtu) lines.push(`set interfaces pseudo-ethernet ${name} vif-s ${svlanId} vif ${cvlanId} mtu ${cfg.mtu}`);
              });
            }
          });
        } catch (e) { /* ignore parse errors */ }
      }

      // Mirror
      if (m.mirror_egress) lines.push(`set interfaces pseudo-ethernet ${name} mirror egress ${m.mirror_egress}`);
      if (m.mirror_ingress) lines.push(`set interfaces pseudo-ethernet ${name} mirror ingress ${m.mirror_ingress}`);

      if (m.redirect) lines.push(`set interfaces pseudo-ethernet ${name} redirect ${m.redirect}`);
      if (m.vrf) lines.push(`set interfaces pseudo-ethernet ${name} vrf ${m.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'dhcp', title: 'DHCP' },
      { key: 'dhcpv6', title: 'DHCPv6' },
      { key: 'vif', title: 'VLAN 子接口' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', source_interface: '', mode: 'private', mac: '', mtu: '', disable_link_detect: false, disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '', ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        dhcpv6_duid: '', dhcpv6_no_release: false, dhcpv6_no_request_dns: false,
        dhcpv6_no_request_domain_name: false, dhcpv6_parameters_only: false,
        dhcpv6_pd_instances: '', dhcpv6_pd_length: '',
        dhcpv6_rapid_commit: false, dhcpv6_temporary: false,
        vif: '', vif_s: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function itemToForm(m) {
      return {
        name: m.name || '',
        description: m.description || '',
        address: Array.isArray(m.address) ? m.address.join('\n') : (m.address || ''),
        source_interface: m.source_interface || '',
        mode: m.mode || 'private',
        mac: m.mac || '',
        mtu: m.mtu || '',
        disable_link_detect: !!m.disable_link_detect,
        disable: !!m.disable,
        ip_adjust_mss: m.ip?.adjust_mss || '',
        ip_arp_cache_timeout: m.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!m.ip?.disable_arp_filter,
        ip_disable_forwarding: !!m.ip?.disable_forwarding,
        ip_enable_arp_accept: !!m.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!m.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!m.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!m.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!m.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!m.ip?.proxy_arp_pvlan,
        ip_source_validation: m.ip?.source_validation || '',
        ipv6_accept_dad: m.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!m.ipv6?.address?.autoconf,
        ipv6_eui64: m.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: m.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!m.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: m.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: m.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!m.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: m.ipv6?.dup_addr_detect_transmits !== undefined ? m.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: m.ipv6?.source_validation || '',
        dhcp_client_id: m['dhcp-options']?.client_id || '',
        dhcp_default_route_distance: m['dhcp-options']?.default_route_distance || '',
        dhcp_host_name: m['dhcp-options']?.host_name || '',
        dhcp_mtu: !!m['dhcp-options']?.mtu,
        dhcp_no_default_route: !!m['dhcp-options']?.no_default_route,
        dhcp_reject: Array.isArray(m['dhcp-options']?.reject) ? m['dhcp-options'].reject.join('\n') : (m['dhcp-options']?.reject || ''),
        dhcp_user_class: m['dhcp-options']?.user_class || '',
        dhcp_vendor_class_id: m['dhcp-options']?.vendor_class_id || '',
        dhcpv6_duid: m['dhcpv6-options']?.duid || '',
        dhcpv6_no_release: !!m['dhcpv6-options']?.no_release,
        dhcpv6_no_request_dns: !!m['dhcpv6-options']?.no_request_dns,
        dhcpv6_no_request_domain_name: !!m['dhcpv6-options']?.no_request_domain_name,
        dhcpv6_parameters_only: !!m['dhcpv6-options']?.parameters_only,
        dhcpv6_pd_instances: m['dhcpv6-options']?.pd
          ? Object.entries(m['dhcpv6-options'].pd).map(([inst, val]) => {
              const ifaces = val.interface ? Object.entries(val.interface).map(([ifn, ifv]) => `${ifn},${ifv.address || ''},${ifv.sla_id || ''}`).join(';') : '';
              return `${inst},${ifaces}`;
            }).join('\n')
          : '',
        dhcpv6_pd_length: m['dhcpv6-options']?.pd_length || '',
        dhcpv6_rapid_commit: !!m['dhcpv6-options']?.rapid_commit,
        dhcpv6_temporary: !!m['dhcpv6-options']?.temporary,
        vif: m.vif ? JSON.stringify(m.vif, null, 2) : '',
        vif_s: m['vif-s'] ? JSON.stringify(m['vif-s'], null, 2) : '',
        mirror_egress: m.mirror?.egress || '',
        mirror_ingress: m.mirror?.ingress || '',
        redirect: m.redirect || '',
        vrf: m.vrf || '',
      };
    }

    function formToItem(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.mode && form.mode !== 'private') result.mode = form.mode;
      if (form.mac) result.mac = form.mac;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable_link_detect) result.disable_link_detect = true;
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

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp.client_id = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp.default_route_distance = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp.host_name = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp.no_default_route = true;
      if (form.dhcp_reject) dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      if (form.dhcp_user_class) dhcp.user_class = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp.vendor_class_id = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result['dhcp-options'] = dhcp;

      // DHCPv6
      const dhcpv6 = {};
      if (form.dhcpv6_duid) dhcpv6.duid = form.dhcpv6_duid;
      if (form.dhcpv6_no_release) dhcpv6.no_release = true;
      if (form.dhcpv6_no_request_dns) dhcpv6.no_request_dns = true;
      if (form.dhcpv6_no_request_domain_name) dhcpv6.no_request_domain_name = true;
      if (form.dhcpv6_parameters_only) dhcpv6.parameters_only = true;
      if (form.dhcpv6_pd_length) dhcpv6.pd_length = Number(form.dhcpv6_pd_length);
      if (form.dhcpv6_pd_instances) {
        const pd = {};
        form.dhcpv6_pd_instances.split('\n').filter(Boolean).forEach(line => {
          const parts = line.trim().split(',').map(s => s.trim());
          if (parts.length >= 2) {
            const [inst, iface, addr, slaId] = parts;
            if (!pd[inst]) pd[inst] = {};
            if (!pd[inst].interface) pd[inst].interface = {};
            const ifCfg = {};
            if (addr) ifCfg.address = addr;
            if (slaId) ifCfg.sla_id = Number(slaId);
            pd[inst].interface[iface] = ifCfg;
          }
        });
        if (Object.keys(pd).length) dhcpv6.pd = pd;
      }
      if (form.dhcpv6_rapid_commit) dhcpv6.rapid_commit = true;
      if (form.dhcpv6_temporary) dhcpv6.temporary = true;
      if (Object.keys(dhcpv6).length) result['dhcpv6-options'] = dhcpv6;

      // VIF
      if (form.vif) {
        try {
          const vifs = JSON.parse(form.vif);
          if (Object.keys(vifs).length) result.vif = vifs;
        } catch (e) { /* ignore */ }
      }

      // VIF-S
      if (form.vif_s) {
        try {
          const vifs = JSON.parse(form.vif_s);
          if (Object.keys(vifs).length) result['vif-s'] = vifs;
        } catch (e) { /* ignore */ }
      }

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
        const res = await api.get('/config', { path: 'interfaces pseudo-ethernet' });
        const cfg = res.data || {};
        pseudoEthernets.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          source_interface: val.source_interface || '',
          mode: val.mode || 'private',
          mac: val.mac || '',
          mtu: val.mtu || '',
          disable: !!val.disable,
          description: val.description || '',
        }));

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
        editingItem.value = itemToForm(pseudoEthernets.value[index]);
      } else {
        editingItem.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingItem.value;
        if (!form.name) { alert('请输入接口名称'); return; }
        const config = formToItem(form);
        console.log('[PseudoEthernet] 保存配置:', JSON.stringify(config, null, 2));
        await api.put('/config', { path: `interfaces pseudo-ethernet ${form.name}`, value: config });
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedItems.value.length) { alert('请先选择要删除的 pseudo-ethernet 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedItems.value.length} 个 pseudo-ethernet 接口?`)) return;
      try {
        for (const m of selectedItems.value) {
          await api.delete('/config', { path: `interfaces pseudo-ethernet ${m.name}` });
        }
        selectedItems.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, pseudoEthernets, selected: selectedItems, modalVisible, editingItem, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, dhcpSchema, dhcpv6Schema, vifSchema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="pseudoEthernets"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? '编辑 pseudo-ethernet 接口' : '创建 pseudo-ethernet 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingItem" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingItem" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingItem" /></template>
            <template #dhcp><ConfigForm :schema="dhcpSchema" :model="editingItem" /></template>
            <template #dhcpv6><ConfigForm :schema="dhcpv6Schema" :model="editingItem" /></template>
            <template #vif><ConfigForm :schema="vifSchema" :model="editingItem" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingItem" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingItem" /></template>
            <template #command><pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre></template>
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
