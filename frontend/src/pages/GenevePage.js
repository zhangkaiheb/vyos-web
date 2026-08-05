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
  { key: 'remote', title: '远端地址', width: 140 },
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
  name: 'GenevePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const geneves = ref([]);
    const modalVisible = ref(false);
    const editingGeneve = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedGeneve = ref([]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 gnv0, gnv1', help: '格式: gnvN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'vni', title: 'VNI', type: 'number', min: 0, max: 16777214, placeholder: '0-16777214', help: '虚拟网络标识符' },
      { key: 'remote', title: '远端地址', type: 'text', placeholder: 'IPv4 或 IPv6 地址', help: '隧道远端地址' },
      { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: '连接使用的端口号 (默认: 6081)' },
      { key: 'mac', title: 'MAC 地址', type: 'text', placeholder: '如 00:11:22:33:44:55', help: '硬件 MAC 地址' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const parametersSchema = computed(() => [
      { key: 'param_ip_key', title: '隧道密钥', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '隧道密钥' },
      { key: 'param_ip_tos', title: 'TOS 值', type: 'number', min: 0, max: 99, placeholder: '0-99', help: '出站数据包的 TOS 值' },
      { key: 'param_ip_ttl', title: 'TTL', type: 'number', min: 0, max: 255, placeholder: '0-255', help: '出站数据包的 TTL (0=继承, 默认: 64)' },
      { key: 'param_ipv6_flowlabel', title: '流标签', type: 'text', placeholder: 'inherit 或 0x0-0x0fffff', help: '出站数据包的流标签' },
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

    // Command text
    const commandText = computed(() => {
      if (!editingGeneve.value) return '';
      const g = editingGeneve.value;
      const name = g.name || 'gnvN';
      const lines = [];

      if (g.description) lines.push(`set interfaces geneve ${name} description "${g.description}"`);
      if (g.vni !== '' && g.vni !== null && g.vni !== undefined) lines.push(`set interfaces geneve ${name} vni ${g.vni}`);
      if (g.remote) lines.push(`set interfaces geneve ${name} remote ${g.remote}`);
      if (g.port) lines.push(`set interfaces geneve ${name} port ${g.port}`);
      if (g.mac) lines.push(`set interfaces geneve ${name} mac ${g.mac}`);
      if (g.mtu) lines.push(`set interfaces geneve ${name} mtu ${g.mtu}`);
      if (g.disable) lines.push(`set interfaces geneve ${name} disable`);

      // Parameters
      if (g.param_ip_key !== '' && g.param_ip_key !== null && g.param_ip_key !== undefined) lines.push(`set interfaces geneve ${name} parameters ip key ${g.param_ip_key}`);
      if (g.param_ip_tos !== '' && g.param_ip_tos !== null && g.param_ip_tos !== undefined) lines.push(`set interfaces geneve ${name} parameters ip tos ${g.param_ip_tos}`);
      if (g.param_ip_ttl !== '' && g.param_ip_ttl !== null && g.param_ip_ttl !== undefined) lines.push(`set interfaces geneve ${name} parameters ip ttl ${g.param_ip_ttl}`);
      if (g.param_ipv6_flowlabel) lines.push(`set interfaces geneve ${name} parameters ipv6 flowlabel ${g.param_ipv6_flowlabel}`);

      // IP
      if (g.ip_adjust_mss) lines.push(`set interfaces geneve ${name} ip adjust-mss ${g.ip_adjust_mss}`);
      if (g.ip_arp_cache_timeout) lines.push(`set interfaces geneve ${name} ip arp-cache-timeout ${g.ip_arp_cache_timeout}`);
      if (g.ip_disable_arp_filter) lines.push(`set interfaces geneve ${name} ip disable-arp-filter`);
      if (g.ip_disable_forwarding) lines.push(`set interfaces geneve ${name} ip disable-forwarding`);
      if (g.ip_enable_arp_accept) lines.push(`set interfaces geneve ${name} ip enable-arp-accept`);
      if (g.ip_enable_arp_announce) lines.push(`set interfaces geneve ${name} ip enable-arp-announce`);
      if (g.ip_enable_arp_ignore) lines.push(`set interfaces geneve ${name} ip enable-arp-ignore`);
      if (g.ip_enable_directed_broadcast) lines.push(`set interfaces geneve ${name} ip enable-directed-broadcast`);
      if (g.ip_enable_proxy_arp) lines.push(`set interfaces geneve ${name} ip enable-proxy-arp`);
      if (g.ip_proxy_arp_pvlan) lines.push(`set interfaces geneve ${name} ip proxy-arp-pvlan`);
      if (g.ip_source_validation) lines.push(`set interfaces geneve ${name} ip source-validation ${g.ip_source_validation}`);

      // IPv6
      if (g.ipv6_accept_dad && g.ipv6_accept_dad !== '1') lines.push(`set interfaces geneve ${name} ipv6 accept-dad ${g.ipv6_accept_dad}`);
      if (g.ipv6_autoconf) lines.push(`set interfaces geneve ${name} ipv6 address autoconf`);
      if (g.ipv6_eui64) lines.push(`set interfaces geneve ${name} ipv6 address eui64 ${g.ipv6_eui64}`);
      if (g.ipv6_interface_identifier) lines.push(`set interfaces geneve ${name} ipv6 address interface-identifier ${g.ipv6_interface_identifier}`);
      if (g.ipv6_no_default_link_local) lines.push(`set interfaces geneve ${name} ipv6 address no-default-link-local`);
      if (g.ipv6_adjust_mss) lines.push(`set interfaces geneve ${name} ipv6 adjust-mss ${g.ipv6_adjust_mss}`);
      if (g.ipv6_base_reachable_time) lines.push(`set interfaces geneve ${name} ipv6 base-reachable-time ${g.ipv6_base_reachable_time}`);
      if (g.ipv6_disable_forwarding) lines.push(`set interfaces geneve ${name} ipv6 disable-forwarding`);
      if (g.ipv6_dup_addr_detect_transmits !== '' && g.ipv6_dup_addr_detect_transmits !== null && g.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces geneve ${name} ipv6 dup-addr-detect-transmits ${g.ipv6_dup_addr_detect_transmits}`);
      if (g.ipv6_source_validation) lines.push(`set interfaces geneve ${name} ipv6 source-validation ${g.ipv6_source_validation}`);

      // Mirror
      if (g.mirror_egress) lines.push(`set interfaces geneve ${name} mirror egress ${g.mirror_egress}`);
      if (g.mirror_ingress) lines.push(`set interfaces geneve ${name} mirror ingress ${g.mirror_ingress}`);

      // Other
      if (g.redirect) lines.push(`set interfaces geneve ${name} redirect ${g.redirect}`);
      if (g.vrf) lines.push(`set interfaces geneve ${name} vrf ${g.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'parameters', title: '隧道参数' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', vni: '', remote: '',
        port: '', mac: '', mtu: '', disable: false,
        param_ip_key: '', param_ip_tos: '', param_ip_ttl: '', param_ipv6_flowlabel: '',
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

    function geneveToForm(g) {
      return {
        name: g.name || '',
        description: g.description || '',
        vni: g.vni !== undefined ? g.vni : '',
        remote: g.remote || '',
        port: g.port || '',
        mac: g.mac || '',
        mtu: g.mtu || '',
        disable: !!g.disable,
        param_ip_key: g.parameters?.ip?.key !== undefined ? g.parameters.ip.key : '',
        param_ip_tos: g.parameters?.ip?.tos !== undefined ? g.parameters.ip.tos : '',
        param_ip_ttl: g.parameters?.ip?.ttl !== undefined ? g.parameters.ip.ttl : '',
        param_ipv6_flowlabel: g.parameters?.ipv6?.flowlabel || '',
        ip_adjust_mss: g.ip?.adjust_mss || '',
        ip_arp_cache_timeout: g.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!g.ip?.disable_arp_filter,
        ip_disable_forwarding: !!g.ip?.disable_forwarding,
        ip_enable_arp_accept: !!g.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!g.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!g.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!g.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!g.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!g.ip?.proxy_arp_pvlan,
        ip_source_validation: g.ip?.source_validation || '',
        ipv6_accept_dad: g.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!g.ipv6?.address?.autoconf,
        ipv6_eui64: g.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: g.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!g.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: g.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: g.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!g.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: g.ipv6?.dup_addr_detect_transmits !== undefined ? g.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: g.ipv6?.source_validation || '',
        mirror_egress: g.mirror?.egress || '',
        mirror_ingress: g.mirror?.ingress || '',
        redirect: g.redirect || '',
        vrf: g.vrf || '',
      };
    }

    function formToGeneve(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.vni !== '' && form.vni !== null && form.vni !== undefined) result.vni = Number(form.vni);
      if (form.remote) result.remote = form.remote;
      if (form.port) result.port = Number(form.port);
      if (form.mac) result.mac = form.mac;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      // Parameters
      const params = {};
      const ipParam = {};
      if (form.param_ip_key !== '' && form.param_ip_key !== null && form.param_ip_key !== undefined) ipParam.key = Number(form.param_ip_key);
      if (form.param_ip_tos !== '' && form.param_ip_tos !== null && form.param_ip_tos !== undefined) ipParam.tos = Number(form.param_ip_tos);
      if (form.param_ip_ttl !== '' && form.param_ip_ttl !== null && form.param_ip_ttl !== undefined) ipParam.ttl = Number(form.param_ip_ttl);
      if (Object.keys(ipParam).length) params.ip = ipParam;

      const ipv6Param = {};
      if (form.param_ipv6_flowlabel) ipv6Param.flowlabel = form.param_ipv6_flowlabel;
      if (Object.keys(ipv6Param).length) params.ipv6 = ipv6Param;

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
        const res = await api.get('/config', { path: 'interfaces geneve' });
        const cfg = res.data || {};
        geneves.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          vni: val.vni !== undefined ? val.vni : '',
          remote: val.remote || '',
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
        editingGeneve.value = geneveToForm(geneves.value[index]);
      } else {
        editingGeneve.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingGeneve.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToGeneve(form);
        console.log('[Geneve] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces geneve ${name}`;
        await api.put('/config', { path, value: config });

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedGeneve.value.length) { alert('请先选择要删除的 Geneve 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedGeneve.value.length} 个 Geneve 接口?`)) return;
      try {
        for (const g of selectedGeneve.value) {
          await api.delete('/config', { path: `interfaces geneve ${g.name}` });
        }
        selectedGeneve.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, geneves, selected: selectedGeneve, modalVisible, editingGeneve, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, parametersSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="geneves"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingGeneve?.name ? '编辑 Geneve 接口' : '创建 Geneve 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingGeneve" />
            </template>
            <template #parameters>
              <ConfigForm :schema="parametersSchema" :model="editingGeneve" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingGeneve" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingGeneve" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingGeneve" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingGeneve" />
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
