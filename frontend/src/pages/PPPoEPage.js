import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'username', title: '用户名', width: 120 },
  { key: 'source_interface', title: '源接口', width: 120 },
  { key: 'remote_address', title: '远端地址', width: 140 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'mru', title: 'MRU', width: 80 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (严格)' },
  { value: 'loose', label: 'loose (宽松)' },
  { value: 'disable', label: 'disable (禁用)' },
];

export default defineComponent({
  name: 'PPPoEPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const pppoes = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingPPPoE = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedPPPoEs = ref([]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 pppoe0, pppoe1', help: '格式: pppoeN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'source_interface', title: '源接口', type: 'select', options: interfaceOptions.value, placeholder: '选择源接口', help: '用于建立连接的接口' },
      { key: 'access_concentrator', title: '接入集中器', type: 'text', placeholder: '接入集中器名称', help: 'Access concentrator name' },
      { key: 'service_name', title: '服务名称', type: 'text', placeholder: '服务名称', help: '仅连接到通告此服务的接入集中器' },
      { key: 'authentication_username', title: '用户名', type: 'text', placeholder: 'PPPoE 认证用户名' },
      { key: 'authentication_password', title: '密码', type: 'password', placeholder: 'PPPoE 认证密码' },
      { key: 'remote_address', title: '远端地址', type: 'text', placeholder: '如 192.168.1.1', help: 'PPPoE 链路远端 IPv4 地址' },
      { key: 'local_address', title: '本地地址', type: 'text', placeholder: '如 192.168.1.2', help: 'PPPoE 链路本地端地址' },
      { key: 'host_uniq', title: 'Host-uniq', type: 'text', placeholder: 'HEX 字节字符串', help: 'Host-uniq 标签' },
      { key: 'connect_on_demand', title: '按需连接', type: 'checkbox', help: '仅在需要时建立连接' },
      { key: 'no_default_route', title: '不安装默认路由', type: 'checkbox', help: '不安装默认路由到系统' },
      { key: 'no_peer_dns', title: '不使用对端 DNS', type: 'checkbox', help: '不使用对端提供的 DNS 服务器' },
      { key: 'mru', title: 'MRU', type: 'number', min: 128, max: 16384, placeholder: '128-16384', help: '最大接收单元 (默认: MTU 值)' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 1500, placeholder: '68-1500', help: '最大传输单元 (默认: 1492)' },
      { key: 'holdoff', title: 'Holdoff 时间', type: 'number', min: 0, max: 86400, placeholder: '0-86400', help: '重连等待时间 (秒)' },
      { key: 'idle_timeout', title: '空闲超时', type: 'number', min: 0, max: 86400, placeholder: '0-86400', help: '空闲超时时间 (秒)' },
      { key: 'default_route_distance', title: '默认路由距离', type: 'number', min: 1, max: 255, placeholder: '1-255', help: '从服务器接收的默认路由距离' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: '客户端 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '客户端标识符' },
      { key: 'dhcp_default_route_distance', title: '默认路由距离', type: 'number', min: 1, max: 255, placeholder: '1-255', help: '默认路由距离 (默认: 210)' },
      { key: 'dhcp_host_name', title: '主机名', type: 'text', placeholder: '覆盖系统主机名', help: '发送到 DHCP 服务器的主机名' },
      { key: 'dhcp_mtu', title: '使用 DHCP MTU', type: 'checkbox', help: '使用 DHCP 服务器的 MTU 值' },
      { key: 'dhcp_no_default_route', title: '不安装默认路由', type: 'checkbox', help: '不安装默认路由到系统' },
      { key: 'dhcp_reject', title: '拒绝地址', type: 'textarea', placeholder: '每行一个 IP 或子网', help: '拒绝 DHCP 租约的 IP 地址或子网' },
      { key: 'dhcp_user_class', title: '用户类别', type: 'text', placeholder: 'DHCP 选项字符串', help: '用户可配置选项' },
      { key: 'dhcp_vendor_class_id', title: '厂商类别 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '厂商类别标识符' },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_instance_name', title: '实例名称', type: 'text', placeholder: 'DHCPv6 实例名称' },
      { key: 'dhcpv6_no_release', title: '不发送 Release', type: 'checkbox', help: '不发送 DHCPv6 Release 消息' },
      { key: 'dhcpv6_rapid_commit', title: '快速提交', type: 'checkbox', help: '使用 DHCPv6 快速提交选项' },
      { key: 'dhcpv6_temporary', title: '临时地址', type: 'checkbox', help: '请求临时地址 (IA_TA)' },
      { key: 'dhcpv6_pd_length', title: '前缀长度', type: 'number', min: 32, max: 64, placeholder: '32-64', help: '请求的前缀长度 (默认: 64)' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ip_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IP 转发' },
      { key: 'ip_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_autoconf', title: '自动配置', type: 'checkbox', help: '使用 SLAAC 获取 IPv6 地址' },
      { key: 'ipv6_interface_identifier', title: '接口标识符', type: 'text', placeholder: '如 ::1:2:3:4', help: 'SLAAC 接口标识符' },
      { key: 'ipv6_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ipv6_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IPv6 转发' },
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
      if (!editingPPPoE.value) return '';
      const p = editingPPPoE.value;
      const name = p.name || 'pppoeN';
      const lines = [];

      if (p.description) lines.push(`set interfaces pppoe ${name} description "${p.description}"`);
      if (p.source_interface) lines.push(`set interfaces pppoe ${name} source-interface ${p.source_interface}`);
      if (p.access_concentrator) lines.push(`set interfaces pppoe ${name} access-concentrator ${p.access_concentrator}`);
      if (p.service_name) lines.push(`set interfaces pppoe ${name} service-name ${p.service_name}`);
      if (p.authentication_username) lines.push(`set interfaces pppoe ${name} authentication username ${p.authentication_username}`);
      if (p.authentication_password) lines.push(`set interfaces pppoe ${name} authentication password ${p.authentication_password}`);
      if (p.remote_address) lines.push(`set interfaces pppoe ${name} remote-address ${p.remote_address}`);
      if (p.local_address) lines.push(`set interfaces pppoe ${name} local-address ${p.local_address}`);
      if (p.host_uniq) lines.push(`set interfaces pppoe ${name} host-uniq ${p.host_uniq}`);
      if (p.connect_on_demand) lines.push(`set interfaces pppoe ${name} connect-on-demand`);
      if (p.no_default_route) lines.push(`set interfaces pppoe ${name} no-default-route`);
      if (p.no_peer_dns) lines.push(`set interfaces pppoe ${name} no-peer-dns`);
      if (p.mru) lines.push(`set interfaces pppoe ${name} mru ${p.mru}`);
      if (p.mtu) lines.push(`set interfaces pppoe ${name} mtu ${p.mtu}`);
      if (p.holdoff !== undefined && p.holdoff !== null) lines.push(`set interfaces pppoe ${name} holdoff ${p.holdoff}`);
      if (p.idle_timeout !== undefined && p.idle_timeout !== null) lines.push(`set interfaces pppoe ${name} idle-timeout ${p.idle_timeout}`);
      if (p.default_route_distance) lines.push(`set interfaces pppoe ${name} default-route-distance ${p.default_route_distance}`);
      if (p.disable) lines.push(`set interfaces pppoe ${name} disable`);

      // DHCP
      if (p.dhcp_client_id) lines.push(`set interfaces pppoe ${name} dhcp-options client-id ${p.dhcp_client_id}`);
      if (p.dhcp_default_route_distance) lines.push(`set interfaces pppoe ${name} dhcp-options default-route-distance ${p.dhcp_default_route_distance}`);
      if (p.dhcp_host_name) lines.push(`set interfaces pppoe ${name} dhcp-options host-name ${p.dhcp_host_name}`);
      if (p.dhcp_mtu) lines.push(`set interfaces pppoe ${name} dhcp-options mtu`);
      if (p.dhcp_no_default_route) lines.push(`set interfaces pppoe ${name} dhcp-options no-default-route`);
      if (p.dhcp_reject) {
        (p.dhcp_reject || '').split('\n').filter(Boolean).forEach(ip => {
          lines.push(`set interfaces pppoe ${name} dhcp-options reject ${ip.trim()}`);
        });
      }
      if (p.dhcp_user_class) lines.push(`set interfaces pppoe ${name} dhcp-options user-class ${p.dhcp_user_class}`);
      if (p.dhcp_vendor_class_id) lines.push(`set interfaces pppoe ${name} dhcp-options vendor-class-id ${p.dhcp_vendor_class_id}`);

      // DHCPv6
      const d6inst = p.dhcpv6_instance_name || 'instance';
      if (p.dhcpv6_no_release) lines.push(`set interfaces pppoe ${name} dhcpv6-options ${d6inst} no-release`);
      if (p.dhcpv6_rapid_commit) lines.push(`set interfaces pppoe ${name} dhcpv6-options ${d6inst} rapid-commit`);
      if (p.dhcpv6_temporary) lines.push(`set interfaces pppoe ${name} dhcpv6-options ${d6inst} temporary`);
      if (p.dhcpv6_pd_length) lines.push(`set interfaces pppoe ${name} dhcpv6-options ${d6inst} pd length ${p.dhcpv6_pd_length}`);

      // IP
      if (p.ip_adjust_mss) lines.push(`set interfaces pppoe ${name} ip adjust-mss ${p.ip_adjust_mss}`);
      if (p.ip_disable_forwarding) lines.push(`set interfaces pppoe ${name} ip disable-forwarding`);
      if (p.ip_source_validation) lines.push(`set interfaces pppoe ${name} ip source-validation ${p.ip_source_validation}`);

      // IPv6
      if (p.ipv6_autoconf) lines.push(`set interfaces pppoe ${name} ipv6 address autoconf`);
      if (p.ipv6_interface_identifier) lines.push(`set interfaces pppoe ${name} ipv6 address interface-identifier ${p.ipv6_interface_identifier}`);
      if (p.ipv6_adjust_mss) lines.push(`set interfaces pppoe ${name} ipv6 adjust-mss ${p.ipv6_adjust_mss}`);
      if (p.ipv6_disable_forwarding) lines.push(`set interfaces pppoe ${name} ipv6 disable-forwarding`);

      // Mirror
      if (p.mirror_egress) lines.push(`set interfaces pppoe ${name} mirror egress ${p.mirror_egress}`);
      if (p.mirror_ingress) lines.push(`set interfaces pppoe ${name} mirror ingress ${p.mirror_ingress}`);

      // Other
      if (p.redirect) lines.push(`set interfaces pppoe ${name} redirect ${p.redirect}`);
      if (p.vrf) lines.push(`set interfaces pppoe ${name} vrf ${p.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'dhcp', title: 'DHCP' },
      { key: 'dhcpv6', title: 'DHCPv6' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', source_interface: '', access_concentrator: '',
        service_name: '', authentication_username: '', authentication_password: '',
        remote_address: '', local_address: '', host_uniq: '',
        connect_on_demand: false, no_default_route: false, no_peer_dns: false,
        mru: '', mtu: '', holdoff: '', idle_timeout: '', default_route_distance: '',
        disable: false,
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        dhcpv6_instance_name: '', dhcpv6_no_release: false, dhcpv6_rapid_commit: false,
        dhcpv6_temporary: false, dhcpv6_pd_length: '',
        ip_adjust_mss: '', ip_disable_forwarding: false, ip_source_validation: '',
        ipv6_autoconf: false, ipv6_interface_identifier: '', ipv6_adjust_mss: '',
        ipv6_disable_forwarding: false,
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function pppoeToForm(p) {
      return {
        name: p.name || '',
        description: p.description || '',
        source_interface: p.source_interface || '',
        access_concentrator: p.access_concentrator || '',
        service_name: p.service_name || '',
        authentication_username: p.authentication?.username || '',
        authentication_password: p.authentication?.password || '',
        remote_address: p.remote_address || '',
        local_address: p.local_address || '',
        host_uniq: p.host_uniq || '',
        connect_on_demand: !!p.connect_on_demand,
        no_default_route: !!p.no_default_route,
        no_peer_dns: !!p.no_peer_dns,
        mru: p.mru || '',
        mtu: p.mtu || '',
        holdoff: p.holdoff !== undefined ? p.holdoff : '',
        idle_timeout: p.idle_timeout !== undefined ? p.idle_timeout : '',
        default_route_distance: p.default_route_distance || '',
        disable: !!p.disable,
        dhcp_client_id: p.dhcp_options?.client_id || '',
        dhcp_default_route_distance: p.dhcp_options?.default_route_distance || '',
        dhcp_host_name: p.dhcp_options?.host_name || '',
        dhcp_mtu: !!p.dhcp_options?.mtu,
        dhcp_no_default_route: !!p.dhcp_options?.no_default_route,
        dhcp_reject: Array.isArray(p.dhcp_options?.reject) ? p.dhcp_options.reject.join('\n') : (p.dhcp_options?.reject || ''),
        dhcp_user_class: p.dhcp_options?.user_class || '',
        dhcp_vendor_class_id: p.dhcp_options?.vendor_class_id || '',
        dhcpv6_instance_name: p.dhcpv6_options?.instance_name || '',
        dhcpv6_no_release: !!p.dhcpv6_options?.no_release,
        dhcpv6_rapid_commit: !!p.dhcpv6_options?.rapid_commit,
        dhcpv6_temporary: !!p.dhcpv6_options?.temporary,
        dhcpv6_pd_length: p.dhcpv6_options?.pd?.length || '',
        ip_adjust_mss: p.ip?.adjust_mss || '',
        ip_disable_forwarding: !!p.ip?.disable_forwarding,
        ip_source_validation: p.ip?.source_validation || '',
        ipv6_autoconf: !!p.ipv6?.address?.autoconf,
        ipv6_interface_identifier: p.ipv6?.address?.interface_identifier || '',
        ipv6_adjust_mss: p.ipv6?.adjust_mss || '',
        ipv6_disable_forwarding: !!p.ipv6?.disable_forwarding,
        mirror_egress: p.mirror?.egress || '',
        mirror_ingress: p.mirror?.ingress || '',
        redirect: p.redirect || '',
        vrf: p.vrf || '',
      };
    }

    function formToPPPoE(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.access_concentrator) result.access_concentrator = form.access_concentrator;
      if (form.service_name) result.service_name = form.service_name;
      if (form.authentication_username || form.authentication_password) {
        result.authentication = {};
        if (form.authentication_username) result.authentication.username = form.authentication_username;
        if (form.authentication_password) result.authentication.password = form.authentication_password;
      }
      if (form.remote_address) result.remote_address = form.remote_address;
      if (form.local_address) result.local_address = form.local_address;
      if (form.host_uniq) result.host_uniq = form.host_uniq;
      if (form.connect_on_demand) result.connect_on_demand = true;
      if (form.no_default_route) result.no_default_route = true;
      if (form.no_peer_dns) result.no_peer_dns = true;
      if (form.mru) result.mru = Number(form.mru);
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.holdoff !== '' && form.holdoff !== null && form.holdoff !== undefined) result.holdoff = Number(form.holdoff);
      if (form.idle_timeout !== '' && form.idle_timeout !== null && form.idle_timeout !== undefined) result.idle_timeout = Number(form.idle_timeout);
      if (form.default_route_distance) result.default_route_distance = Number(form.default_route_distance);
      if (form.disable) result.disable = true;

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp.client_id = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp.default_route_distance = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp.host_name = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp.no_default_route = true;
      if (form.dhcp_reject) {
        dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      }
      if (form.dhcp_user_class) dhcp.user_class = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp.vendor_class_id = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result.dhcp_options = dhcp;

      // DHCPv6
      const d6 = {};
      if (form.dhcpv6_no_release) d6.no_release = true;
      if (form.dhcpv6_rapid_commit) d6.rapid_commit = true;
      if (form.dhcpv6_temporary) d6.temporary = true;
      if (form.dhcpv6_pd_length) d6.pd = { length: Number(form.dhcpv6_pd_length) };
      if (Object.keys(d6).length) {
        d6.instance_name = form.dhcpv6_instance_name || 'instance';
        result.dhcpv6_options = d6;
      }

      // IP
      const ip = {};
      if (form.ip_adjust_mss) ip.adjust_mss = form.ip_adjust_mss;
      if (form.ip_disable_forwarding) ip.disable_forwarding = true;
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      // IPv6
      const ipv6 = {};
      if (form.ipv6_autoconf || form.ipv6_interface_identifier) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_interface_identifier) addr.interface_identifier = form.ipv6_interface_identifier;
        ipv6.address = addr;
      }
      if (form.ipv6_adjust_mss) ipv6.adjust_mss = form.ipv6_adjust_mss;
      if (form.ipv6_disable_forwarding) ipv6.disable_forwarding = true;
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
        const res = await api.get('/config', { path: 'interfaces pppoe' });
        const cfg = res.data || {};
        pppoes.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          username: val.authentication?.username || '',
          source_interface: val.source_interface || '',
          remote_address: val.remote_address || '',
          mtu: val.mtu || '',
          mru: val.mru || '',
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
        editingPPPoE.value = pppoeToForm(pppoes.value[index]);
      } else {
        editingPPPoE.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingPPPoE.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToPPPoE(form);
        console.log('[PPPoE] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces pppoe ${name}`;
        await api.put('/config', { path, value: config });
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedPPPoEs.value.length) { alert('请先选择要删除的 PPPoE 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedPPPoEs.value.length} 个 PPPoE 接口?`)) return;
      try {
        for (const p of selectedPPPoEs.value) {
          await api.delete('/config', { path: `interfaces pppoe ${p.name}` });
        }
        selectedPPPoEs.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, pppoes, selected: selectedPPPoEs, modalVisible, editingPPPoE, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="pppoes"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingPPPoE?.name ? '编辑 PPPoE 接口' : '创建 PPPoE 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs" />
          <div v-show="activeTab === 'basic'" style="padding: 16px 0;">
            <ConfigForm :schema="basicSchema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'dhcp'" style="padding: 16px 0;">
            <ConfigForm :schema="dhcpSchema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'dhcpv6'" style="padding: 16px 0;">
            <ConfigForm :schema="dhcpv6Schema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'ip'" style="padding: 16px 0;">
            <ConfigForm :schema="ipSchema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'ipv6'" style="padding: 16px 0;">
            <ConfigForm :schema="ipv6Schema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'mirror'" style="padding: 16px 0;">
            <ConfigForm :schema="mirrorSchema" :model="editingPPPoE" />
          </div>
          <div v-show="activeTab === 'other'" style="padding: 16px 0;">
            <ConfigForm :schema="otherSchema" :model="editingPPPoE" />
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
    </div>
  `,
});
