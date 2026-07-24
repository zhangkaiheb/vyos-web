import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const COLUMNS = [
  { key: 'name', title: '接口名称' },
  { key: 'type', title: '接口类型' },
  { key: 'address_mode', title: '地址模式' },
  { key: 'ipv4_address', title: 'IPv4地址' },
  { key: 'ipv6_address', title: 'IPv6地址' },
  { key: 'mac', title: 'MAC' },
  { key: 'mtu', title: 'MTU' },
  { key: 'speed', title: '速率' },
  { key: 'vrf', title: 'VRF' },
  { key: 'vif', title: 'VIF' },
  { key: 'vif_s', title: 'VIF-S' },
  { key: 'description', title: '描述' },
  { key: 'operstate', title: '状态' },
];

function isPhysicalEthernet(name) {
  return name && name.indexOf('.') === -1;
}

function buildBasicSchema(isPhysical) {
  return [
    { key: 'name', title: '接口名称', placeholder: '例如 eth0', disabled: isPhysical },
    { key: 'description', title: '描述' },
    { key: 'address', title: 'IP地址', type: 'textarea', placeholder: '每行一个地址，可包含 dhcp / dhcpv6', help: '每行一个地址，支持 IPv4/IPv6、dhcp、dhcpv6' },
    { key: 'mtu', title: 'MTU', type: 'number', placeholder: '例如 1500' },
    { key: 'speed', title: '速率', type: 'select', options: ['auto', '10', '100', '1000', '2500', '5000', '10000', '25000', '40000', '50000', '100000'] },
    { key: 'duplex', title: '双工模式', type: 'select', options: ['auto', 'half', 'full'] },
    { key: 'mac', title: 'MAC地址', placeholder: '例如 00:11:22:33:44:55' },
    { key: 'hw_id', title: '硬件ID (hw-id)', placeholder: '绑定物理网卡MAC' },
    { key: 'vrf', title: 'VRF实例', placeholder: 'VRF名称' },
    { key: 'disable', title: '禁用接口', type: 'checkbox' },
    { key: 'disable_flow_control', title: '禁用流控', type: 'checkbox' },
    { key: 'disable_link_detect', title: '忽略链路状态', type: 'checkbox' },
    { key: 'redirect', title: '重定向目标', placeholder: '目标接口或地址' },
  ];
}

const DHCP_SCHEMA = [
  { key: 'dhcp_client_id', title: 'Client ID' },
  { key: 'dhcp_default_route_distance', title: '默认路由距离', type: 'number', placeholder: '默认 210' },
  { key: 'dhcp_host_name', title: '主机名', placeholder: '覆盖系统主机名' },
  { key: 'dhcp_mtu', title: '使用DHCP MTU', type: 'checkbox', help: '使用DHCP服务器提供的MTU，忽略接口设置' },
  { key: 'dhcp_no_default_route', title: '不安装默认路由', type: 'checkbox' },
  { key: 'dhcp_reject', title: '拒绝的地址/前缀', type: 'textarea', placeholder: '每行一个 IPv4 地址或前缀', help: '拒绝来自这些地址/前缀的DHCP租约' },
  { key: 'dhcp_user_class', title: '用户类别' },
  { key: 'dhcp_vendor_class_id', title: 'Vendor Class ID' },
];

const DHCPV6_SCHEMA = [
  { key: 'dhcpv6_duid', title: 'DUID' },
  { key: 'dhcpv6_no_release', title: '不发送释放消息', type: 'checkbox' },
  { key: 'dhcpv6_parameters_only', title: '仅获取参数', type: 'checkbox', help: '仅获取配置参数，不获取地址' },
  { key: 'dhcpv6_rapid_commit', title: '快速提交', type: 'checkbox', help: '等待立即回复而不是广告' },
  { key: 'dhcpv6_temporary', title: '临时地址', type: 'checkbox', help: 'IPv6 临时地址' },
  { key: 'dhcpv6_pd', title: '前缀委托 (pd)', type: 'textarea', placeholder: 'JSON 格式，例如 {"0": {"interface": "eth1"}}', help: 'DHCPv6 前缀委托接口配置' },
];

const EAPOL_SCHEMA = [
  { key: 'eapol_ca_certificate', title: 'CA 证书', placeholder: 'PKI 配置中的 CA 名称' },
  { key: 'eapol_certificate', title: '证书', placeholder: 'PKI 配置中的证书名称' },
  { key: 'eapol_passphrase', title: '私钥密码', type: 'password' },
];

const IP_SCHEMA = [
  { key: 'ip_adjust_mss', title: '调整 TCP MSS', type: 'number', placeholder: '例如 1400' },
  { key: 'ip_arp_cache_timeout', title: 'ARP 缓存超时', type: 'number', placeholder: '默认 30 秒' },
  { key: 'ip_disable_arp_filter', title: '禁用 ARP 过滤', type: 'checkbox' },
  { key: 'ip_disable_forwarding', title: '禁用 IP 转发', type: 'checkbox' },
  { key: 'ip_enable_arp_accept', title: '启用 ARP accept', type: 'checkbox' },
  { key: 'ip_enable_arp_announce', title: '启用 ARP announce', type: 'checkbox' },
  { key: 'ip_enable_arp_ignore', title: '启用 ARP ignore', type: 'checkbox' },
  { key: 'ip_enable_directed_broadcast', title: '启用定向广播转发', type: 'checkbox' },
  { key: 'ip_enable_proxy_arp', title: '启用 Proxy ARP', type: 'checkbox' },
  { key: 'ip_proxy_arp_pvlan', title: '启用私有 VLAN Proxy ARP', type: 'checkbox' },
  { key: 'ip_source_validation', title: '源验证 (uRPF)', type: 'select', options: ['', 'strict', 'loose', 'disable'] },
];

const IPV6_SCHEMA = [
  { key: 'ipv6_accept_dad', title: '接受 DAD', type: 'number', placeholder: '默认 1' },
  { key: 'ipv6_address', title: 'IPv6 地址模式', type: 'multi-select', options: ['autoconf', 'eui64', 'no-default-link-local'] },
  { key: 'ipv6_adjust_mss', title: '调整 TCP MSS', type: 'number', placeholder: '例如 1280' },
  { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', placeholder: '默认 30 秒' },
  { key: 'ipv6_disable_forwarding', title: '禁用 IPv6 转发', type: 'checkbox' },
  { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 探测次数', type: 'number', placeholder: '默认 1' },
  { key: 'ipv6_source_validation', title: '源验证 (uRPF)', type: 'select', options: ['', 'strict', 'loose', 'disable'] },
];

function buildAdvancedSchema(interfaceNames) {
  return [
    { key: 'offload', title: '硬件卸载', type: 'multi-select', options: ['gro', 'gso', 'sg', 'tso'] },
    { key: 'mirror_ingress', title: '镜像入方向目标接口', type: 'select', options: ['', ...interfaceNames], help: '将入方向流量镜像到指定接口' },
    { key: 'mirror_egress', title: '镜像出方向目标接口', type: 'select', options: ['', ...interfaceNames], help: '将出方向流量镜像到指定接口' },
    { key: 'vif', title: 'VIF (VLAN)', type: 'textarea', placeholder: 'JSON 格式，例如 {"10": {"address": ["192.168.10.1/24"]}}', help: 'JSON对象，键为VLAN ID' },
    { key: 'vif_s', title: 'VIF-S (QinQ)', type: 'textarea', placeholder: 'JSON 格式', help: 'JSON对象，键为S-VLAN ID' },
    { key: 'evpn', title: 'EVPN', type: 'textarea', placeholder: 'JSON 格式，例如 {"uplink": {}}', help: 'JSON对象' },
    { key: 'ring_buffer_rx', title: 'RX Ring Buffer', type: 'number', placeholder: '80-16384', help: '接收环缓冲区大小' },
    { key: 'ring_buffer_tx', title: 'TX Ring Buffer', type: 'number', placeholder: '80-16384', help: '发送环缓冲区大小' },
  ];
}

const TAB_DEFS = [
  { key: 'basic', title: '基础', schemaBuilder: buildBasicSchema },
  { key: 'dhcp', title: 'DHCP', schema: DHCP_SCHEMA },
  { key: 'dhcpv6', title: 'DHCPv6', schema: DHCPV6_SCHEMA },
  { key: 'eapol', title: 'EAPOL', schema: EAPOL_SCHEMA },
  { key: 'ip', title: 'IPv4', schema: IP_SCHEMA },
  { key: 'ipv6', title: 'IPv6', schema: IPV6_SCHEMA },
  { key: 'advanced', title: '高级', schemaBuilder: buildAdvancedSchema },
];

function safeJsonParse(text, defaultValue = {}) {
  if (!text) return defaultValue;
  try {
    return JSON.parse(text);
  } catch (e) {
    return defaultValue;
  }
}

function formatJson(value) {
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return String(value);
  }
}

function extractLeaf(cfg, path, defaultValue = '') {
  let cur = cfg;
  for (const p of path) {
    if (cur === undefined || cur === null) return defaultValue;
    cur = cur[p];
  }
  return cur === undefined || cur === null ? defaultValue : cur;
}

function hasLeaf(cfg, path) {
  let cur = cfg;
  for (const p of path) {
    if (cur === undefined || cur === null) return false;
    cur = cur[p];
  }
  return cur !== undefined;
}

function isPresent(value) {
  if (value === undefined || value === null || value === false || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function joinList(value) {
  if (Array.isArray(value)) return value.join('\n');
  return value || '';
}

function splitList(text) {
  return (text || '').split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
}

function configToForm(cfg) {
  const addresses = Array.isArray(cfg.address) ? cfg.address : (cfg.address ? [cfg.address] : []);
  const dhcp = cfg['dhcp-options'] || {};
  const dhcpv6 = cfg['dhcpv6-options'] || {};
  const eapol = cfg.eapol || {};
  const ip = cfg.ip || {};
  const ipv6 = cfg.ipv6 || {};
  const ipv6Addr = Array.isArray(ipv6.address) ? ipv6.address : (ipv6.address ? [ipv6.address] : []);

  return {
    name: cfg.name || '',
    description: cfg.description || '',
    address: addresses.join('\n'),
    mtu: cfg.mtu || '',
    speed: cfg.speed || 'auto',
    duplex: cfg.duplex || 'auto',
    mac: cfg.mac || '',
    hw_id: cfg['hw-id'] || '',
    vrf: cfg.vrf || '',
    disable: !!cfg.disable || cfg.disable === '',
    disable_flow_control: !!cfg['disable-flow-control'] || cfg['disable-flow-control'] === '',
    disable_link_detect: !!cfg['disable-link-detect'] || cfg['disable-link-detect'] === '',
    redirect: cfg.redirect || '',

    dhcp_client_id: extractLeaf(dhcp, ['client-id']),
    dhcp_default_route_distance: extractLeaf(dhcp, ['default-route-distance']),
    dhcp_host_name: extractLeaf(dhcp, ['host-name']),
    dhcp_mtu: hasLeaf(dhcp, ['mtu']),
    dhcp_no_default_route: hasLeaf(dhcp, ['no-default-route']),
    dhcp_reject: joinList(dhcp.reject),
    dhcp_user_class: extractLeaf(dhcp, ['user-class']),
    dhcp_vendor_class_id: extractLeaf(dhcp, ['vendor-class-id']),

    dhcpv6_duid: extractLeaf(dhcpv6, ['duid']),
    dhcpv6_no_release: hasLeaf(dhcpv6, ['no-release']),
    dhcpv6_parameters_only: hasLeaf(dhcpv6, ['parameters-only']),
    dhcpv6_rapid_commit: hasLeaf(dhcpv6, ['rapid-commit']),
    dhcpv6_temporary: hasLeaf(dhcpv6, ['temporary']),
    dhcpv6_pd: formatJson(dhcpv6.pd),

    eapol_ca_certificate: extractLeaf(eapol, ['ca-certificate']),
    eapol_certificate: extractLeaf(eapol, ['certificate']),
    eapol_passphrase: extractLeaf(eapol, ['passphrase']),

    ip_adjust_mss: extractLeaf(ip, ['adjust-mss']),
    ip_arp_cache_timeout: extractLeaf(ip, ['arp-cache-timeout']),
    ip_disable_arp_filter: hasLeaf(ip, ['disable-arp-filter']),
    ip_disable_forwarding: hasLeaf(ip, ['disable-forwarding']),
    ip_enable_arp_accept: hasLeaf(ip, ['enable-arp-accept']),
    ip_enable_arp_announce: hasLeaf(ip, ['enable-arp-announce']),
    ip_enable_arp_ignore: hasLeaf(ip, ['enable-arp-ignore']),
    ip_enable_directed_broadcast: hasLeaf(ip, ['enable-directed-broadcast']),
    ip_enable_proxy_arp: hasLeaf(ip, ['enable-proxy-arp']),
    ip_proxy_arp_pvlan: hasLeaf(ip, ['proxy-arp-pvlan']),
    ip_source_validation: extractLeaf(ip, ['source-validation']),

    ipv6_accept_dad: extractLeaf(ipv6, ['accept-dad']),
    ipv6_address: ipv6Addr,
    ipv6_adjust_mss: extractLeaf(ipv6, ['adjust-mss']),
    ipv6_base_reachable_time: extractLeaf(ipv6, ['base-reachable-time']),
    ipv6_disable_forwarding: hasLeaf(ipv6, ['disable-forwarding']),
    ipv6_dup_addr_detect_transmits: extractLeaf(ipv6, ['dup-addr-detect-transmits']),
    ipv6_source_validation: extractLeaf(ipv6, ['source-validation']),

    offload: Object.keys(cfg.offload || {}),
    mirror_ingress: extractLeaf(cfg.mirror || {}, ['ingress']),
    mirror_egress: extractLeaf(cfg.mirror || {}, ['egress']),
    vif: formatJson(cfg.vif || {}),
    vif_s: formatJson(cfg['vif-s'] || {}),
    evpn: formatJson(cfg.evpn || {}),
    ring_buffer_rx: extractLeaf(cfg['ring-buffer'] || {}, ['rx']),
    ring_buffer_tx: extractLeaf(cfg['ring-buffer'] || {}, ['tx']),
  };
}

function setNested(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] === undefined || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

function formToConfig(form) {
  const value = {};

  if (form.description) value.description = form.description;

  const addressLines = splitList(form.address);
  if (addressLines.length) value.address = addressLines;

  if (form.mtu) value.mtu = String(form.mtu);
  if (form.speed && form.speed !== 'auto') value.speed = form.speed;
  if (form.duplex && form.duplex !== 'auto') value.duplex = form.duplex;
  if (form.mac) value.mac = form.mac;
  if (form.hw_id) value['hw-id'] = form.hw_id;
  if (form.vrf) value.vrf = form.vrf;

  if (form.disable) value.disable = '';
  if (form.disable_flow_control) value['disable-flow-control'] = '';
  if (form.disable_link_detect) value['disable-link-detect'] = '';
  if (form.redirect) value.redirect = form.redirect;

  // DHCP options
  const dhcp = {};
  if (form.dhcp_client_id) dhcp['client-id'] = form.dhcp_client_id;
  if (form.dhcp_default_route_distance) dhcp['default-route-distance'] = String(form.dhcp_default_route_distance);
  if (form.dhcp_host_name) dhcp['host-name'] = form.dhcp_host_name;
  if (form.dhcp_mtu) dhcp.mtu = '';
  if (form.dhcp_no_default_route) dhcp['no-default-route'] = '';
  const reject = splitList(form.dhcp_reject);
  if (reject.length) dhcp.reject = reject;
  if (form.dhcp_user_class) dhcp['user-class'] = form.dhcp_user_class;
  if (form.dhcp_vendor_class_id) dhcp['vendor-class-id'] = form.dhcp_vendor_class_id;
  if (Object.keys(dhcp).length) value['dhcp-options'] = dhcp;

  // DHCPv6 options
  const dhcpv6 = {};
  if (form.dhcpv6_duid) dhcpv6.duid = form.dhcpv6_duid;
  if (form.dhcpv6_no_release) dhcpv6['no-release'] = '';
  if (form.dhcpv6_parameters_only) dhcpv6['parameters-only'] = '';
  if (form.dhcpv6_rapid_commit) dhcpv6['rapid-commit'] = '';
  if (form.dhcpv6_temporary) dhcpv6.temporary = '';
  const pd = safeJsonParse(form.dhcpv6_pd);
  if (Object.keys(pd).length) dhcpv6.pd = pd;
  if (Object.keys(dhcpv6).length) value['dhcpv6-options'] = dhcpv6;

  // EAPOL
  const eapol = {};
  if (form.eapol_ca_certificate) eapol['ca-certificate'] = form.eapol_ca_certificate;
  if (form.eapol_certificate) eapol.certificate = form.eapol_certificate;
  if (form.eapol_passphrase) eapol.passphrase = form.eapol_passphrase;
  if (Object.keys(eapol).length) value.eapol = eapol;

  // IP
  const ip = {};
  if (form.ip_adjust_mss) ip['adjust-mss'] = String(form.ip_adjust_mss);
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

  // IPv6
  const ipv6 = {};
  if (form.ipv6_accept_dad) ipv6['accept-dad'] = String(form.ipv6_accept_dad);
  if (form.ipv6_address && form.ipv6_address.length) ipv6.address = form.ipv6_address;
  if (form.ipv6_adjust_mss) ipv6['adjust-mss'] = String(form.ipv6_adjust_mss);
  if (form.ipv6_base_reachable_time) ipv6['base-reachable-time'] = String(form.ipv6_base_reachable_time);
  if (form.ipv6_disable_forwarding) ipv6['disable-forwarding'] = '';
  if (form.ipv6_dup_addr_detect_transmits) ipv6['dup-addr-detect-transmits'] = String(form.ipv6_dup_addr_detect_transmits);
  if (form.ipv6_source_validation) ipv6['source-validation'] = form.ipv6_source_validation;
  if (Object.keys(ipv6).length) value.ipv6 = ipv6;

  // Advanced
  if (form.offload && form.offload.length) {
    value.offload = {};
    for (const key of form.offload) value.offload[key] = {};
  }
  const mirror = {};
  if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
  if (form.mirror_egress) mirror.egress = form.mirror_egress;
  if (Object.keys(mirror).length) value.mirror = mirror;
  const vif = safeJsonParse(form.vif);
  if (Object.keys(vif).length) value.vif = vif;
  const vifS = safeJsonParse(form.vif_s);
  if (Object.keys(vifS).length) value['vif-s'] = vifS;
  const evpn = safeJsonParse(form.evpn);
  if (Object.keys(evpn).length) value.evpn = evpn;
  const ringBuffer = {};
  if (form.ring_buffer_rx) ringBuffer.rx = String(form.ring_buffer_rx);
  if (form.ring_buffer_tx) ringBuffer.tx = String(form.ring_buffer_tx);
  if (Object.keys(ringBuffer).length) value['ring-buffer'] = ringBuffer;

  return value;
}

export default defineComponent({
  name: 'EthernetPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref({});
    const selected = ref([]);
    const activeTab = ref('basic');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const tabs = computed(() => {
      const interfaceNames = data.value.map(i => i.name);
      const isPhysical = isPhysicalEthernet(editingItem.value?.name);
      return TAB_DEFS.map(t => {
        if (t.schemaBuilder) {
          return { ...t, schema: t.schemaBuilder(t.key === 'basic' ? isPhysical : interfaceNames) };
        }
        return t;
      });
    });

    async function load() {
      loading.value = true;
      try {
        const res = await interfaceApi.ethernet();
        data.value = res.interfaces || [];
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    function create() {
      editingItem.value = configToForm({});
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert('请选择一行');
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      editingItem.value = { ...configToForm({ ...row._config, name: row.name }), type: row.type };
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return alert('请选择一行');
      const selectedRows = data.value.filter(r => selected.value.includes(r.id));
      const physical = selectedRows.filter(r => r.type === '以太网');
      if (physical.length) {
        return alert(`物理以太网接口不能删除：${physical.map(r => r.name).join(', ')}`);
      }
      if (!confirm('确认删除选中的接口配置？')) return;
      for (const id of selected.value) {
        await configStore.deleteConfig(`interfaces ethernet ${id}`);
      }
      selected.value = [];
      await configStore.checkSessionChanged();
      await load();
    }

    async function save() {
      const name = editingItem.value?.name;
      if (!name) return alert('接口名称不能为空');
      try {
        const value = formToConfig(editingItem.value);
        await configStore.setConfig(`interfaces ethernet ${name}`, value);
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data, loading, modalVisible, editingItem, selected, activeTab, writeDisabled,
      columns: COLUMNS, tabs,
      load, create, edit, remove, save,
    };
  },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 tableKey="ethernet_interfaces"
                 @create="create" @edit="edit" @delete="remove" @refresh="load"
                 @selection-change="selected = $event">
        <template #operstate="{ value }">
          <span class="status-dot" :class="value === 'UP' ? 'status-up' : 'status-down'"></span>
        </template>
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? '编辑以太网接口: ' + editingItem.name : '创建以太网接口'" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]="{ tab: t }">
            <ConfigForm v-model="editingItem" :schema="t.schema" :disabled="writeDisabled" :formKey="'eth_' + t.key" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
});
