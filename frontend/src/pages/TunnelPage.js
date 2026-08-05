import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const ENCAPSULATION_OPTIONS = [
  { value: 'erspan', label: 'erspan (Encapsulated Remote SPAN)' },
  { value: 'gre', label: 'gre (Generic Routing Encapsulation - 网络层)' },
  { value: 'gretap', label: 'gretap (Generic Routing Encapsulation - 数据链路层)' },
  { value: 'ip6erspan', label: 'ip6erspan (ERSPAN over IPv6)' },
  { value: 'ip6gre', label: 'ip6gre (GRE over IPv6 - 网络层)' },
  { value: 'ip6gretap', label: 'ip6gretap (GRE over IPv6 - 数据链路层)' },
  { value: 'ip6ip6', label: 'ip6ip6 (IPv6 in IPv6)' },
  { value: 'ipip', label: 'ipip (IPv4 in IPv4)' },
  { value: 'ipip6', label: 'ipip6 (IPv4 in IPv6)' },
  { value: 'sit', label: 'sit (Simple Internet Transition - IPv6 in IPv4)' },
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

const ERSPAN_DIRECTION_OPTIONS = [
  { value: 'ingress', label: 'ingress (镜像入方向流量)' },
  { value: 'egress', label: 'egress (镜像出方向流量)' },
];

const ERSPAN_VERSION_OPTIONS = [
  { value: '1', label: '1 (ERSPAN Type II - 默认)' },
  { value: '2', label: '2 (ERSPAN Type III)' },
];

const TOS_OPTIONS = [
  { value: 'inherit', label: 'inherit (继承 - 默认)' },
  ...Array.from({ length: 100 }, (_, i) => ({ value: String(i), label: String(i) })),
];

const ENCAPLIMIT_OPTIONS = [
  { value: 'none', label: 'none (禁用封装限制)' },
  ...Array.from({ length: 256 }, (_, i) => ({ value: String(i), label: String(i) })),
];

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 150 },
  { key: 'encapsulation', title: '封装类型', width: 120 },
  { key: 'remote', title: '远端地址', width: 150 },
  { key: 'source_address', title: '源地址', width: 150 },
  { key: 'source_interface', title: '源接口', width: 120 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'address', title: 'IP 地址', width: 200 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 120, fixed: 'right' },
];

export default defineComponent({
  name: 'TunnelPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const tunnels = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingTunnel = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    const schema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 tun0, tun1', disabled: !!editingTunnel.value?.name },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'encapsulation', title: '封装类型', type: 'select', options: ENCAPSULATION_OPTIONS, required: true },
      { key: 'remote', title: '远端地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址' },
      { key: 'source_address', title: '源地址', type: 'text', placeholder: '本地源 IP 地址' },
      { key: 'source_interface', title: '源接口', type: 'select', options: interfaceOptions.value, placeholder: '选择接口' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个地址，如 10.0.0.1/24', help: '支持 IPv4/IPv6 地址和前缀' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '默认: 1476', help: '最大传输单元 (68-16000 字节, 默认: 1476)' },
      { key: '6rd_prefix', title: '6RD 前缀', type: 'text', placeholder: 'IPv6 地址和前缀长度，如 2001:db8::/32' },
      { key: '6rd_relay_prefix', title: '6RD 中继前缀', type: 'text', placeholder: 'IPv4 前缀，如 192.168.0.0/16' },
      { key: 'disable', title: '禁用接口', type: 'checkbox' },
      { key: 'disable_link_detect', title: '忽略链路状态', type: 'checkbox' },
      { key: 'enable_multicast', title: '启用多播', type: 'checkbox', help: '在隧道上启用多播操作' },
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 名称' },
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
      { key: 'ipv6_no_default_link_local', title: '移除默认链路本地地址', type: 'checkbox' },
      { key: 'ipv6_adjust_mss', title: '调整 TCP MSS', type: 'text', placeholder: '536-65535 或 clamp-mss-to-pmtu' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '默认: 30', help: '基础可达时间 (秒)' },
      { key: 'ipv6_disable_forwarding', title: '禁用 IPv6 转发', type: 'checkbox' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 探测次数', type: 'number', min: 0, placeholder: '默认: 1', help: '执行 DAD 时发送的 NS 消息数量 (0=禁用)' },
      { key: 'ipv6_source_validation', title: '源验证 (uRPF)', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择验证模式' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '将入方向流量镜像到指定接口' },
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '将出方向流量镜像到指定接口' },
    ]);

    const parametersSchema = computed(() => [
      {
        key: 'parameters_erspan', title: 'ERSPAN 参数', type: 'group', children: [
          { key: 'direction', title: '方向', type: 'select', options: ERSPAN_DIRECTION_OPTIONS, placeholder: '选择镜像方向' },
          { key: 'hw_id', title: '硬件 ID', type: 'number', min: 0, max: 1048575, placeholder: '0-1048575', help: 'ERSPAN 引擎唯一标识符' },
          { key: 'index', title: '索引', type: 'number', min: 0, max: 63, placeholder: '0-63', help: 'ERSPAN v1 索引字段' },
          { key: 'version', title: '版本', type: 'select', options: ERSPAN_VERSION_OPTIONS, help: '协议版本 (默认: 1)' },
        ],
      },
      {
        key: 'parameters_ip', title: 'IPv4 隧道参数', type: 'group', children: [
          { key: 'ignore_df', title: '忽略 DF 位', type: 'checkbox', help: '忽略 Don\'t Fragment 位' },
          { key: 'key', title: '隧道密钥', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '仅 GRE 隧道' },
          { key: 'no_pmtu_discovery', title: '禁用 PMTU 发现', type: 'checkbox', help: '禁用路径 MTU 发现' },
          { key: 'tos', title: 'TOS 值', type: 'select', options: TOS_OPTIONS, placeholder: '选择 TOS 值', help: '出站数据包 TOS 值 (默认: inherit)' },
          { key: 'ttl', title: 'TTL', type: 'text', placeholder: '0 (继承) 或 1-255', help: '出站数据包 TTL (默认: 64, 0=继承)' },
        ],
      },
      {
        key: 'parameters_ipv6', title: 'IPv6 隧道参数', type: 'group', children: [
          { key: 'encaplimit', title: '封装限制', type: 'select', options: ENCAPLIMIT_OPTIONS, placeholder: '选择封装限制', help: '固定封装限制 (默认: 4, none=禁用)' },
          { key: 'flowlabel', title: '流标签', type: 'text', placeholder: 'inherit 或 0x0-0x0fffff', help: '出站数据包流标签' },
          { key: 'hoplimit', title: '跳数限制', type: 'number', min: 0, max: 255, placeholder: '0-255', help: '跳数限制 (默认: 64)' },
          { key: 'tclass', title: '流量类别', type: 'text', placeholder: 'inherit 或 0x0-0x0fffff', help: '流量类别 (默认: inherit)' },
        ],
      },
    ]);

    // Dynamic tabs based on encapsulation type
    const modalTabs = computed(() => {
      const encap = editingTunnel.value?.encapsulation || '';
      const tabs = [{ key: 'basic', title: '基本配置' }];

      // ERSPAN related encapsulations
      if (encap === 'erspan' || encap === 'ip6erspan') {
        tabs.push({ key: 'erspan', title: 'ERSPAN 参数' });
      }

      // IPv4 tunnel parameters (for IPv4-based encapsulations)
      const ipv4Encaps = ['gre', 'gretap', 'ipip', 'ipip6', 'sit'];
      if (ipv4Encaps.includes(encap)) {
        tabs.push({ key: 'ipParams', title: 'IPv4 隧道参数' });
      }

      // IPv6 tunnel parameters (for IPv6-based encapsulations)
      const ipv6Encaps = ['ip6gre', 'ip6gretap', 'ip6ip6'];
      if (ipv6Encaps.includes(encap)) {
        tabs.push({ key: 'ipv6Params', title: 'IPv6 隧道参数' });
      }

      // Always show these tabs
      tabs.push(
        { key: 'ip', title: 'IPv4 参数' },
        { key: 'ipv6', title: 'IPv6 参数' },
        { key: 'mirror', title: '流量镜像' },
        { key: 'preview', title: '命令预览' }
      );

      return tabs;
    });

    const commandText = computed(() => {
      if (!editingTunnel.value) return '';
      const t = editingTunnel.value;
      const cmds = [];
      const base = `set interfaces tunnel ${t.name}`;
      if (t.description) cmds.push(`${base} description ${t.description}`);
      if (t.encapsulation) cmds.push(`${base} encapsulation ${t.encapsulation}`);
      if (t.remote) cmds.push(`${base} remote ${t.remote}`);
      if (t.source_address) cmds.push(`${base} source-address ${t.source_address}`);
      if (t.source_interface) cmds.push(`${base} source-interface ${t.source_interface}`);
      if (t.address) {
        const addrs = t.address.split('\n').filter(Boolean);
        addrs.forEach(addr => cmds.push(`${base} address ${addr.trim()}`));
      }
      if (t.mtu) cmds.push(`${base} mtu ${t.mtu}`);
      if (t['6rd_prefix']) cmds.push(`${base} 6rd-prefix ${t['6rd_prefix']}`);
      if (t['6rd_relay_prefix']) cmds.push(`${base} 6rd-relay-prefix ${t['6rd_relay_prefix']}`);
      if (t.disable) cmds.push(`${base} disable`);
      if (t.disable_link_detect) cmds.push(`${base} disable-link-detect`);
      if (t.enable_multicast) cmds.push(`${base} enable-multicast`);
      if (t.redirect) cmds.push(`${base} redirect ${t.redirect}`);
      if (t.vrf) cmds.push(`${base} vrf ${t.vrf}`);

      // Mirror
      if (t.mirror_ingress) cmds.push(`${base} mirror ingress ${t.mirror_ingress}`);
      if (t.mirror_egress) cmds.push(`${base} mirror egress ${t.mirror_egress}`);

      // Parameters - ERSPAN
      const erspan = t.parameters_erspan || {};
      if (erspan.direction) cmds.push(`${base} parameters erspan direction ${erspan.direction}`);
      if (erspan.hw_id !== '' && erspan.hw_id !== null && erspan.hw_id !== undefined) cmds.push(`${base} parameters erspan hw-id ${erspan.hw_id}`);
      if (erspan.index !== '' && erspan.index !== null && erspan.index !== undefined) cmds.push(`${base} parameters erspan index ${erspan.index}`);
      if (erspan.version && erspan.version !== '1') cmds.push(`${base} parameters erspan version ${erspan.version}`);

      // Parameters - IP
      const ipParams = t.parameters_ip || {};
      if (ipParams.ignore_df) cmds.push(`${base} parameters ip ignore-df`);
      if (ipParams.key !== '' && ipParams.key !== null && ipParams.key !== undefined) cmds.push(`${base} parameters ip key ${ipParams.key}`);
      if (ipParams.no_pmtu_discovery) cmds.push(`${base} parameters ip no-pmtu-discovery`);
      if (ipParams.tos && ipParams.tos !== 'inherit') cmds.push(`${base} parameters ip tos ${ipParams.tos}`);
      if (ipParams.ttl && ipParams.ttl !== '') cmds.push(`${base} parameters ip ttl ${ipParams.ttl}`);

      // Parameters - IPv6
      const ipv6Params = t.parameters_ipv6 || {};
      if (ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') cmds.push(`${base} parameters ipv6 encaplimit ${ipv6Params.encaplimit}`);
      if (ipv6Params.flowlabel) cmds.push(`${base} parameters ipv6 flowlabel ${ipv6Params.flowlabel}`);
      if (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null && ipv6Params.hoplimit !== undefined) cmds.push(`${base} parameters ipv6 hoplimit ${ipv6Params.hoplimit}`);
      if (ipv6Params.tclass) cmds.push(`${base} parameters ipv6 tclass ${ipv6Params.tclass}`);

      return cmds.join('\n');
    });

    function tunnelToForm(tun) {
      const addresses = Array.isArray(tun.address) ? tun.address : (tun.address ? [tun.address] : []);
      const ipv6 = tun.ipv6 || {};
      const ipv6Address = Array.isArray(ipv6.address) ? ipv6.address : (ipv6.address ? [ipv6.address] : []);
      const params = tun.parameters || {};
      const erspan = params.erspan || {};
      const ipParams = params.ip || {};
      const ipv6Params = params.ipv6 || {};
      return {
        name: tun.name || '',
        description: tun.description || '',
        encapsulation: tun.encapsulation || '',
        remote: tun.remote || '',
        source_address: tun['source-address'] || '',
        source_interface: tun['source-interface'] || '',
        address: addresses.join('\n'),
        mtu: tun.mtu || '',
        '6rd_prefix': tun['6rd-prefix'] || '',
        '6rd_relay_prefix': tun['6rd-relay-prefix'] || '',
        disable: !!tun.disable || tun.disable === '',
        disable_link_detect: !!tun['disable-link-detect'] || tun['disable-link-detect'] === '',
        enable_multicast: !!tun['enable-multicast'] || tun['enable-multicast'] === '',
        redirect: tun.redirect || '',
        vrf: tun.vrf || '',
        ip_adjust_mss: tun.ip?.['adjust-mss'] || '',
        ip_arp_cache_timeout: tun.ip?.['arp-cache-timeout'] || '',
        ip_disable_arp_filter: !!tun.ip?.['disable-arp-filter'],
        ip_disable_forwarding: !!tun.ip?.['disable-forwarding'],
        ip_enable_arp_accept: !!tun.ip?.['enable-arp-accept'],
        ip_enable_arp_announce: !!tun.ip?.['enable-arp-announce'],
        ip_enable_arp_ignore: !!tun.ip?.['enable-arp-ignore'],
        ip_enable_directed_broadcast: !!tun.ip?.['enable-directed-broadcast'],
        ip_enable_proxy_arp: !!tun.ip?.['enable-proxy-arp'],
        ip_proxy_arp_pvlan: !!tun.ip?.['proxy-arp-pvlan'],
        ip_source_validation: tun.ip?.['source-validation'] || '',
        ipv6_accept_dad: ipv6['accept-dad'] !== undefined ? String(ipv6['accept-dad']) : '1',
        ipv6_address_autoconf: ipv6Address.includes('autoconf'),
        ipv6_address_eui64: ipv6Address.find(a => typeof a === 'object' && a.eui64) || '',
        ipv6_no_default_link_local: ipv6Address.includes('no-default-link-local'),
        ipv6_adjust_mss: ipv6['adjust-mss'] || '',
        ipv6_base_reachable_time: ipv6['base-reachable-time'] || '',
        ipv6_disable_forwarding: !!ipv6['disable-forwarding'],
        ipv6_dup_addr_detect_transmits: ipv6['dup-addr-detect-transmits'] !== undefined ? String(ipv6['dup-addr-detect-transmits']) : '1',
        ipv6_source_validation: ipv6['source-validation'] || '',
        mirror_ingress: tun.mirror?.ingress || '',
        mirror_egress: tun.mirror?.egress || '',
        parameters_erspan: {
          direction: erspan.direction || '',
          hw_id: erspan['hw-id'] !== undefined ? erspan['hw-id'] : '',
          index: erspan.index !== undefined ? erspan.index : '',
          version: erspan.version || '1',
        },
        parameters_ip: {
          ignore_df: !!ipParams['ignore-df'],
          key: ipParams.key !== undefined ? ipParams.key : '',
          no_pmtu_discovery: !!ipParams['no-pmtu-discovery'],
          tos: ipParams.tos || 'inherit',
          ttl: ipParams.ttl !== undefined ? String(ipParams.ttl) : '',
        },
        parameters_ipv6: {
          encaplimit: ipv6Params.encaplimit !== undefined ? String(ipv6Params.encaplimit) : '4',
          flowlabel: ipv6Params.flowlabel || '',
          hoplimit: ipv6Params.hoplimit !== undefined ? String(ipv6Params.hoplimit) : '',
          tclass: ipv6Params.tclass || '',
        },
      };
    }

    function formToTunnel(form) {
      const value = {};
      if (form.description) value.description = form.description;
      if (form.encapsulation) value.encapsulation = form.encapsulation;
      if (form.remote) value.remote = form.remote;
      if (form.source_address) value['source-address'] = form.source_address;
      if (form.source_interface) value['source-interface'] = form.source_interface;
      const addrs = (form.address || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (addrs.length) value.address = addrs;
      if (form.mtu) value.mtu = String(form.mtu);
      if (form['6rd_prefix']) value['6rd-prefix'] = form['6rd_prefix'];
      if (form['6rd_relay_prefix']) value['6rd-relay-prefix'] = form['6rd_relay_prefix'];
      if (form.disable) value.disable = '';
      if (form.disable_link_detect) value['disable-link-detect'] = '';
      if (form.enable_multicast) value['enable-multicast'] = '';
      if (form.redirect) value.redirect = form.redirect;
      if (form.vrf) value.vrf = form.vrf;

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

      const mirror = {};
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (Object.keys(mirror).length) value.mirror = mirror;

      // Parameters
      const parameters = {};
      const erspan = form.parameters_erspan || {};
      if (erspan.direction || erspan.hw_id !== '' || erspan.index !== '' || (erspan.version && erspan.version !== '1')) {
        const e = {};
        if (erspan.direction) e.direction = erspan.direction;
        if (erspan.hw_id !== '' && erspan.hw_id !== null && erspan.hw_id !== undefined) e['hw-id'] = erspan.hw_id;
        if (erspan.index !== '' && erspan.index !== null && erspan.index !== undefined) e.index = erspan.index;
        if (erspan.version && erspan.version !== '1') e.version = erspan.version;
        if (Object.keys(e).length) parameters.erspan = e;
      }
      const ipParams = form.parameters_ip || {};
      if (ipParams.ignore_df || ipParams.key !== '' || ipParams.no_pmtu_discovery || (ipParams.tos && ipParams.tos !== 'inherit') || (ipParams.ttl && ipParams.ttl !== '')) {
        const ip = {};
        if (ipParams.ignore_df) ip['ignore-df'] = '';
        if (ipParams.key !== '' && ipParams.key !== null && ipParams.key !== undefined) ip.key = ipParams.key;
        if (ipParams.no_pmtu_discovery) ip['no-pmtu-discovery'] = '';
        if (ipParams.tos && ipParams.tos !== 'inherit') ip.tos = ipParams.tos;
        if (ipParams.ttl && ipParams.ttl !== '') ip.ttl = ipParams.ttl;
        if (Object.keys(ip).length) parameters.ip = ip;
      }
      const ipv6Params = form.parameters_ipv6 || {};
      if ((ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') || ipv6Params.flowlabel || (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null) || ipv6Params.tclass) {
        const ipv6 = {};
        if (ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') ipv6.encaplimit = ipv6Params.encaplimit;
        if (ipv6Params.flowlabel) ipv6.flowlabel = ipv6Params.flowlabel;
        if (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null && ipv6Params.hoplimit !== undefined) ipv6.hoplimit = ipv6Params.hoplimit;
        if (ipv6Params.tclass) ipv6.tclass = ipv6Params.tclass;
        if (Object.keys(ipv6).length) parameters.ipv6 = ipv6;
      }
      if (Object.keys(parameters).length) value.parameters = parameters;

      return value;
    }

    async function load() {
      loading.value = true;
      try {
        const [tunRes, ifRes] = await Promise.all([
          configApi.get('interfaces tunnel'),
          interfaceApi.ethernet(),
        ]);
        const tunData = tunRes.data || {};
        tunnels.value = Object.entries(tunData).map(([name, config]) => ({
          name,
          ...config,
          address: Array.isArray(config.address) ? config.address.join(', ') : (config.address || ''),
          source_address: config['source-address'] || '',
          source_interface: config['source-interface'] || '',
          disable_link_detect: !!config['disable-link-detect'],
          enable_multicast: !!config['enable-multicast'],
          '6rd_prefix': config['6rd-prefix'] || '',
          '6rd_relay_prefix': config['6rd-relay-prefix'] || '',
        }));
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface
        }));
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function getDefaultForm() {
      return {
        name: '',
        description: '',
        encapsulation: '',
        remote: '',
        source_address: '',
        source_interface: '',
        address: '',
        mtu: '',
        '6rd_prefix': '',
        '6rd_relay_prefix': '',
        disable: false,
        disable_link_detect: false,
        enable_multicast: false,
        redirect: '',
        vrf: '',
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
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '',
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '1',
        ipv6_source_validation: '',
        mirror_ingress: '',
        mirror_egress: '',
        parameters_erspan: { direction: '', hw_id: '', index: '', version: '1' },
        parameters_ip: { ignore_df: false, key: '', no_pmtu_discovery: false, tos: 'inherit', ttl: '' },
        parameters_ipv6: { encaplimit: '4', flowlabel: '', hoplimit: '', tclass: '' },
      };
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingTunnel.value = tunnelToForm(tunnels.value[index]);
      } else {
        editingTunnel.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      if (!editingTunnel.value.name) {
        showError('请输入接口名称');
        return;
      }
      if (!editingTunnel.value.encapsulation) {
        showError('请选择封装类型');
        return;
      }
      const config = formToTunnel(editingTunnel.value);
      try {
        await configApi.set(`interfaces tunnel ${editingTunnel.value.name}`, config);
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function remove() {
      if (selected.value.length === 0) {
        showError('请选择要删除的隧道');
        return;
      }
      const names = selected.value.map(s => s.name);
      try {
        await Promise.all(names.map(name => configApi.delete(`interfaces tunnel ${name}`)));
        selected.value = [];
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    onMounted(load);

    return {
      loading, tunnels, selected, modalVisible, editingTunnel, interfaceOptions, activeTab,
      COLUMNS,
      schema, ipSchema, ipv6Schema, mirrorSchema, parametersSchema, commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="tunnels"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? tunnels.indexOf(selected[0]) : -1)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
        rowKey="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'disable'">
            <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
              {{ record.disable ? '是' : '否' }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(tunnels.indexOf(record))">编辑</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">删除</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingTunnel?.name ? '编辑隧道接口' : '创建隧道接口'"
        width="800px"
        @confirm="save"
      >
        <div v-if="editingTunnel">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingTunnel" :schema="schema" />
            </template>
            <template #erspan>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_erspan', title: 'ERSPAN 参数', type: 'group', children: parametersSchema[0].children }]" />
            </template>
            <template #ipParams>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_ip', title: 'IPv4 隧道参数', type: 'group', children: parametersSchema[1].children }]" />
            </template>
            <template #ipv6Params>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_ipv6', title: 'IPv6 隧道参数', type: 'group', children: parametersSchema[2].children }]" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingTunnel" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingTunnel" :schema="ipv6Schema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingTunnel" :schema="mirrorSchema" />
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
