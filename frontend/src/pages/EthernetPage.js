import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { useVisibilityStore } from '/src/stores/visibility.js';
import { interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

function isPhysicalEthernet(name) {
  return name && name.indexOf('.') === -1;
}

function buildBasicSchema(isPhysical, t) {
  return [
    { key: 'name', title: t('ethernet.basic.name'), placeholder: t('ethernet.basic.name_placeholder'), disabled: isPhysical },
    { key: 'description', title: t('ethernet.basic.description') },
    { key: 'address', title: t('ethernet.basic.address'), type: 'textarea', placeholder: t('ethernet.basic.address_placeholder'), help: t('ethernet.basic.address_help') },
    { key: 'mtu', title: t('ethernet.basic.mtu'), type: 'number', placeholder: t('ethernet.basic.mtu_placeholder') },
    { key: 'speed', title: t('ethernet.basic.speed'), type: 'select', options: ['auto', '10', '100', '1000', '2500', '5000', '10000', '25000', '40000', '50000', '100000'] },
    { key: 'duplex', title: t('ethernet.basic.duplex'), type: 'select', options: ['auto', 'half', 'full'] },
    { key: 'mac', title: t('ethernet.basic.mac_address'), placeholder: t('ethernet.basic.mac_address_placeholder') },
    { key: 'hw_id', title: t('ethernet.basic.hw_id'), placeholder: t('ethernet.basic.hw_id_placeholder') },
    { key: 'vrf', title: t('ethernet.basic.vrf_instance'), placeholder: t('ethernet.basic.vrf_instance_placeholder') },
    { key: 'disable', title: t('ethernet.basic.disable'), type: 'checkbox' },
    { key: 'disable_flow_control', title: t('ethernet.basic.disable_flow_control'), type: 'checkbox' },
    { key: 'disable_link_detect', title: t('ethernet.basic.disable_link_detect'), type: 'checkbox' },
    { key: 'redirect', title: t('ethernet.basic.redirect'), placeholder: t('ethernet.basic.redirect_placeholder') },
  ];
}

function buildDhcpSchema(_unused, t) {
  return [
    { key: 'dhcp_client_id', title: t('ethernet.dhcp.client_id') },
    { key: 'dhcp_default_route_distance', title: t('ethernet.dhcp.default_route_distance'), type: 'number', placeholder: t('ethernet.dhcp.default_route_distance_placeholder') },
    { key: 'dhcp_host_name', title: t('ethernet.dhcp.host_name'), placeholder: t('ethernet.dhcp.host_name_placeholder') },
    { key: 'dhcp_mtu', title: t('ethernet.dhcp.use_mtu'), type: 'checkbox', help: t('ethernet.dhcp.use_mtu_help') },
    { key: 'dhcp_no_default_route', title: t('ethernet.dhcp.no_default_route'), type: 'checkbox' },
    { key: 'dhcp_reject', title: t('ethernet.dhcp.reject'), type: 'textarea', placeholder: t('ethernet.dhcp.reject_placeholder'), help: t('ethernet.dhcp.reject_help') },
    { key: 'dhcp_user_class', title: t('ethernet.dhcp.user_class') },
    { key: 'dhcp_vendor_class_id', title: t('ethernet.dhcp.vendor_class_id') },
  ];
}

function buildDhcpv6Schema(_unused, t) {
  return [
    { key: 'dhcpv6_duid', title: t('ethernet.dhcpv6.duid') },
    { key: 'dhcpv6_no_release', title: t('ethernet.dhcpv6.no_release'), type: 'checkbox' },
    { key: 'dhcpv6_parameters_only', title: t('ethernet.dhcpv6.parameters_only'), type: 'checkbox', help: t('ethernet.dhcpv6.parameters_only_help') },
    { key: 'dhcpv6_rapid_commit', title: t('ethernet.dhcpv6.rapid_commit'), type: 'checkbox', help: t('ethernet.dhcpv6.rapid_commit_help') },
    { key: 'dhcpv6_temporary', title: t('ethernet.dhcpv6.temporary'), type: 'checkbox', help: t('ethernet.dhcpv6.temporary_help') },
    { key: 'dhcpv6_pd', title: t('ethernet.dhcpv6.pd'), type: 'textarea', placeholder: t('ethernet.dhcpv6.pd_placeholder'), help: t('ethernet.dhcpv6.pd_help') },
  ];
}

function buildEapolSchema(_unused, t) {
  return [
    { key: 'eapol_ca_certificate', title: t('ethernet.eapol.ca_certificate'), placeholder: t('ethernet.eapol.ca_certificate_placeholder') },
    { key: 'eapol_certificate', title: t('ethernet.eapol.certificate'), placeholder: t('ethernet.eapol.certificate_placeholder') },
    { key: 'eapol_passphrase', title: t('ethernet.eapol.passphrase'), type: 'password' },
  ];
}

function buildIpSchema(_unused, t) {
  return [
    { key: 'ip_adjust_mss', title: t('ethernet.ip.adjust_mss'), type: 'number', placeholder: t('ethernet.ip.adjust_mss_placeholder') },
    { key: 'ip_arp_cache_timeout', title: t('ethernet.ip.arp_cache_timeout'), type: 'number', placeholder: t('ethernet.ip.arp_cache_timeout_placeholder') },
    { key: 'ip_disable_arp_filter', title: t('ethernet.ip.disable_arp_filter'), type: 'checkbox' },
    { key: 'ip_disable_forwarding', title: t('ethernet.ip.disable_forwarding'), type: 'checkbox' },
    { key: 'ip_enable_arp_accept', title: t('ethernet.ip.enable_arp_accept'), type: 'checkbox' },
    { key: 'ip_enable_arp_announce', title: t('ethernet.ip.enable_arp_announce'), type: 'checkbox' },
    { key: 'ip_enable_arp_ignore', title: t('ethernet.ip.enable_arp_ignore'), type: 'checkbox' },
    { key: 'ip_enable_directed_broadcast', title: t('ethernet.ip.enable_directed_broadcast'), type: 'checkbox' },
    { key: 'ip_enable_proxy_arp', title: t('ethernet.ip.enable_proxy_arp'), type: 'checkbox' },
    { key: 'ip_proxy_arp_pvlan', title: t('ethernet.ip.proxy_arp_pvlan'), type: 'checkbox' },
    { key: 'ip_source_validation', title: t('ethernet.ip.source_validation'), type: 'select', options: ['', 'strict', 'loose', 'disable'] },
  ];
}

function buildIpv6Schema(_unused, t) {
  return [
    { key: 'ipv6_accept_dad', title: t('ethernet.ipv6.accept_dad'), type: 'number', placeholder: t('ethernet.ipv6.accept_dad_placeholder') },
    { key: 'ipv6_address', title: t('ethernet.ipv6.address_mode'), type: 'multi-select', options: ['autoconf', 'eui64', 'no-default-link-local'] },
    { key: 'ipv6_adjust_mss', title: t('ethernet.ipv6.adjust_mss'), type: 'number', placeholder: t('ethernet.ipv6.adjust_mss_placeholder') },
    { key: 'ipv6_base_reachable_time', title: t('ethernet.ipv6.base_reachable_time'), type: 'number', placeholder: t('ethernet.ipv6.base_reachable_time_placeholder') },
    { key: 'ipv6_disable_forwarding', title: t('ethernet.ipv6.disable_forwarding'), type: 'checkbox' },
    { key: 'ipv6_dup_addr_detect_transmits', title: t('ethernet.ipv6.dup_addr_detect_transmits'), type: 'number', placeholder: t('ethernet.ipv6.dup_addr_detect_transmits_placeholder') },
    { key: 'ipv6_source_validation', title: t('ethernet.ipv6.source_validation'), type: 'select', options: ['', 'strict', 'loose', 'disable'] },
  ];
}

function buildAdvancedSchema(interfaceNames, t) {
  return [
    { key: 'offload', title: t('ethernet.advanced.offload'), type: 'multi-select', options: ['gro', 'gso', 'sg', 'tso'] },
    { key: 'mirror_ingress', title: t('ethernet.advanced.mirror_ingress'), type: 'select', options: ['', ...interfaceNames], help: t('ethernet.advanced.mirror_ingress_help') },
    { key: 'mirror_egress', title: t('ethernet.advanced.mirror_egress'), type: 'select', options: ['', ...interfaceNames], help: t('ethernet.advanced.mirror_egress_help') },
    { key: 'vif', title: t('ethernet.advanced.vif'), type: 'textarea', placeholder: t('ethernet.advanced.vif_placeholder'), help: t('ethernet.advanced.vif_help') },
    { key: 'vif_s', title: t('ethernet.advanced.vif_s'), type: 'textarea', placeholder: t('ethernet.advanced.vif_s_placeholder'), help: t('ethernet.advanced.vif_s_help') },
    { key: 'evpn', title: t('ethernet.advanced.evpn'), type: 'textarea', placeholder: t('ethernet.advanced.evpn_placeholder'), help: t('ethernet.advanced.evpn_help') },
    { key: 'ring_buffer_rx', title: t('ethernet.advanced.ring_buffer_rx'), type: 'number', placeholder: t('ethernet.advanced.ring_buffer_placeholder'), help: t('ethernet.advanced.ring_buffer_rx_help') },
    { key: 'ring_buffer_tx', title: t('ethernet.advanced.ring_buffer_tx'), type: 'number', placeholder: t('ethernet.advanced.ring_buffer_placeholder'), help: t('ethernet.advanced.ring_buffer_tx_help') },
  ];
}

const TAB_DEFS = [
  { key: 'basic', titleKey: 'ethernet.tabs.basic', schemaBuilder: buildBasicSchema },
  { key: 'dhcp', titleKey: 'ethernet.tabs.dhcp', schemaBuilder: buildDhcpSchema },
  { key: 'dhcpv6', titleKey: 'ethernet.tabs.dhcpv6', schemaBuilder: buildDhcpv6Schema },
  { key: 'eapol', titleKey: 'ethernet.tabs.eapol', schemaBuilder: buildEapolSchema },
  { key: 'ip', titleKey: 'ethernet.tabs.ip', schemaBuilder: buildIpSchema },
  { key: 'ipv6', titleKey: 'ethernet.tabs.ipv6', schemaBuilder: buildIpv6Schema },
  { key: 'advanced', titleKey: 'ethernet.tabs.advanced', schemaBuilder: buildAdvancedSchema },
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
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const visibilityStore = useVisibilityStore();
    onMounted(() => { visibilityStore.load(); });
    const COLUMNS = computed(() => [
      { key: 'name', title: t('ethernet.columns.name') },
      { key: 'type', title: t('ethernet.columns.type'), width: '80px' },
      { key: 'address_mode', title: t('ethernet.columns.address_mode') },
      { key: 'ipv4_address', title: t('ethernet.columns.ipv4_address') },
      { key: 'ipv6_address', title: t('ethernet.columns.ipv6_address') },
      { key: 'mac', title: t('ethernet.columns.mac') },
      { key: 'mtu', title: t('ethernet.columns.mtu') },
      { key: 'speed', title: t('ethernet.columns.speed') },
      { key: 'vrf', title: t('ethernet.columns.vrf') },
      { key: 'vif', title: t('ethernet.columns.vif') },
      { key: 'vif_s', title: t('ethernet.columns.vif_s') },
      { key: 'description', title: t('ethernet.columns.description') },
      { key: 'operstate', title: t('ethernet.columns.operstate') },
    ]);
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref({});
    const selected = ref([]);
    const activeTab = ref('basic');
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const tabs = computed(() => {
      const interfaceNames = data.value.map(i => i.name);
      const isPhysical = isPhysicalEthernet(editingItem.value?.name);
      return TAB_DEFS.filter(tabDef => {
        if (tabDef.key === 'eapol') {
          return visibilityStore.isVisible('ethernet-eapol');
        }
        return true;
      }).map(tabDef => {
        const title = t(tabDef.titleKey);
        if (tabDef.schemaBuilder) {
          const schema = tabDef.schemaBuilder(tabDef.key === 'basic' ? isPhysical : interfaceNames, t);
          return { ...tabDef, title, schema };
        }
        return { ...tabDef, title };
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

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    function create() {
      editingItem.value = configToForm({});
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return showError({ message: t('ethernet.errors.select_row') });
      const row = data.value.find(r => r.name === selected.value[0]) || {};
      editingItem.value = { ...configToForm({ ...row._config, name: row.name }), type: row.type };
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return showError({ message: t('ethernet.errors.select_row') });
      const selectedRows = data.value.filter(r => selected.value.includes(r.name));
      const physical = selectedRows.filter(r => r.type === t('ethernet.types.physical_ethernet'));
      if (physical.length) {
        return showError({ message: t('ethernet.errors.cannot_delete_physical', { names: physical.map(r => r.name).join(', ') }) });
      }
      pendingDeleteNames.value = selected.value.map(name => {
        const row = data.value.find(r => r.name === name);
        return row ? row.name : name;
      });
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`interfaces ethernet ${name}`);
        configStore.markPending();
      }
      selected.value = [];
      pendingDeleteNames.value = [];
      await configStore.checkSessionChanged();
      await load();
    }

    async function save() {
      const name = editingItem.value?.name;
      if (!name) return showError({ message: t('ethernet.errors.name_required') });
      try {
        const value = formToConfig(editingItem.value);
        await configStore.setConfig(`interfaces ethernet ${name}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data, loading, modalVisible, editingItem, selected, activeTab, writeDisabled,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS, tabs,
      load, create, edit, remove, confirmRemove, save, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable :columns="COLUMNS" :data="data" :loading="loading" :disabled="writeDisabled"
                 :actions="['create', 'edit', 'delete', 'refresh']"
                 tableKey="ethernet_interfaces" rowKey="name"
                 @create="create" @edit="edit" @delete="remove" @refresh="load"
                 @selection-change="selected = $event">
        <template #operstate="{ value }">
          <span class="status-dot" :class="value === 'UP' ? 'status-up' : 'status-down'"></span>
        </template>
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? t('ethernet.modal.edit') + editingItem.name : t('ethernet.modal.create')" width="820px" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-if="tab.schema" v-model="editingItem" :schema="tab.schema" :disabled="writeDisabled" :formKey="'eth_' + tab.key" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
});
