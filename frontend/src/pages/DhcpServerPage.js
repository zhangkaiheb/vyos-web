import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const HA_MODE_OPTIONS = ['active-active', 'active-passive'];

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function joinMembers(val) {
  return toArray(val).join('\n');
}

function splitMembers(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function tr(tFn, key, params = {}) {
  return tFn(key, params);
}

function validateName(name, t) {
  if (!name || !String(name).trim()) return t('dhcp.validation.nameRequired');
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return t('dhcp.validation.nameInvalid');
  return '';
}

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('dhcp.validation.ipv4Invalid');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('dhcp.validation.ipv4Invalid');
  return '';
}

function validateCIDR(value, t) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return t('dhcp.validation.cidrFormat');
  const err = validateIPv4(parts[0], t);
  if (err) return err;
  const mask = parseInt(parts[1], 10);
  if (isNaN(mask) || mask < 0 || mask > 32) return t('dhcp.validation.maskRange');
  return '';
}

function validateMAC(value, t) {
  if (!value) return '';
  if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(value)) return t('dhcp.validation.macFormat');
  return '';
}

function optionToForm(option = {}) {
  return {
    bootfile_name: option['bootfile-name'] || '',
    bootfile_server: option['bootfile-server'] || '',
    bootfile_size: option['bootfile-size'] || '',
    captive_portal: option['captive-portal'] || '',
    client_prefix_length: option['client-prefix-length'] || '',
    default_router: joinMembers(option['default-router']),
    domain_name: option['domain-name'] || '',
    domain_search: joinMembers(option['domain-search']),
    ip_forwarding: option['ip-forwarding'] !== undefined,
    ipv6_only_preferred: option['ipv6-only-preferred'] || '',
    name_server: joinMembers(option['name-server']),
    ntp_server: joinMembers(option['ntp-server']),
    pop_server: option['pop-server'] || '',
    server_identifier: option['server-identifier'] || '',
    smtp_server: joinMembers(option['smtp-server']),
    static_route: staticRoutesToForm(option['static-route']),
    tftp_server_name: option['tftp-server-name'] || '',
    time_offset: option['time-offset'] || '',
    time_server: joinMembers(option['time-server']),
    time_zone: option['time-zone'] || '',
    vendor_option: vendorOptionToForm(option['vendor-option']),
    wins_server: joinMembers(option['wins-server']),
    wpad_url: option['wpad-url'] || '',
  };
}

function optionToConfig(formOption) {
  const result = {};
  if (isPresent(formOption.bootfile_name)) result['bootfile-name'] = String(formOption.bootfile_name);
  if (isPresent(formOption.bootfile_server)) result['bootfile-server'] = String(formOption.bootfile_server);
  if (isPresent(formOption.bootfile_size)) result['bootfile-size'] = String(formOption.bootfile_size);
  if (isPresent(formOption.captive_portal)) result['captive-portal'] = String(formOption.captive_portal);
  if (isPresent(formOption.client_prefix_length)) result['client-prefix-length'] = String(formOption.client_prefix_length);
  const defaultRouters = splitMembers(formOption.default_router);
  if (defaultRouters.length) result['default-router'] = defaultRouters;
  if (isPresent(formOption.domain_name)) result['domain-name'] = String(formOption.domain_name);
  const domainSearch = splitMembers(formOption.domain_search);
  if (domainSearch.length) result['domain-search'] = domainSearch;
  if (formOption.ip_forwarding) result['ip-forwarding'] = '';
  if (isPresent(formOption.ipv6_only_preferred)) result['ipv6-only-preferred'] = String(formOption.ipv6_only_preferred);
  const nameServers = splitMembers(formOption.name_server);
  if (nameServers.length) result['name-server'] = nameServers;
  const ntpServers = splitMembers(formOption.ntp_server);
  if (ntpServers.length) result['ntp-server'] = ntpServers;
  if (isPresent(formOption.pop_server)) result['pop-server'] = String(formOption.pop_server);
  if (isPresent(formOption.server_identifier)) result['server-identifier'] = String(formOption.server_identifier);
  const smtpServers = splitMembers(formOption.smtp_server);
  if (smtpServers.length) result['smtp-server'] = smtpServers;
  const staticRoutes = staticRoutesToConfig(formOption.static_route || []);
  if (Object.keys(staticRoutes).length) result['static-route'] = staticRoutes;
  if (isPresent(formOption.tftp_server_name)) result['tftp-server-name'] = String(formOption.tftp_server_name);
  if (isPresent(formOption.time_offset)) result['time-offset'] = String(formOption.time_offset);
  const timeServers = splitMembers(formOption.time_server);
  if (timeServers.length) result['time-server'] = timeServers;
  if (isPresent(formOption.time_zone)) result['time-zone'] = String(formOption.time_zone);
  const vendorOptions = vendorOptionToConfig(formOption.vendor_option || []);
  if (Object.keys(vendorOptions).length) result['vendor-option'] = vendorOptions;
  const winsServers = splitMembers(formOption.wins_server);
  if (winsServers.length) result['wins-server'] = winsServers;
  if (isPresent(formOption.wpad_url)) result['wpad-url'] = String(formOption.wpad_url);
  return result;
}

function staticRoutesToForm(routes = {}) {
  return Object.entries(routes).map(([destination, r]) => ({
    _destination: destination,
    destination,
    next_hop: r['next-hop'] || '',
  }));
}

function staticRoutesToConfig(formRoutes) {
  const result = {};
  for (const r of formRoutes) {
    if (!r.destination) continue;
    const item = {};
    if (isPresent(r.next_hop)) item['next-hop'] = String(r.next_hop);
    result[r.destination] = item;
  }
  return result;
}

function vendorOptionToForm(vo = {}) {
  return Object.entries(vo).map(([id, v]) => ({
    _id: id,
    id,
    value: v.value || '',
  }));
}

function vendorOptionToConfig(formVo) {
  const result = {};
  for (const v of formVo) {
    if (!v.id) continue;
    const item = {};
    if (isPresent(v.value)) item.value = String(v.value);
    result[v.id] = item;
  }
  return result;
}

function rangesToForm(ranges = {}) {
  return Object.entries(ranges).map(([name, r]) => ({
    _name: name,
    name,
    start: r.start || '',
    stop: r.stop || '',
  }));
}

function rangesToConfig(formRanges) {
  const result = {};
  for (const r of formRanges) {
    if (!r.name) continue;
    const item = {};
    if (isPresent(r.start)) item.start = String(r.start);
    if (isPresent(r.stop)) item.stop = String(r.stop);
    result[r.name] = item;
  }
  return result;
}

function staticMappingsToForm(mappings = {}) {
  return Object.entries(mappings).map(([name, m]) => ({
    _name: name,
    name,
    description: m.description || '',
    disable: m.disable !== undefined,
    duid: m.duid || '',
    ip_address: m['ip-address'] || '',
    mac_address: m.mac || '',
    option: optionToForm(m.option),
  }));
}

function staticMappingsToConfig(formMappings) {
  const result = {};
  for (const m of formMappings) {
    if (!m.name) continue;
    const item = {};
    if (isPresent(m.description)) item.description = String(m.description);
    if (m.disable) item.disable = '';
    if (isPresent(m.duid)) item.duid = String(m.duid);
    if (isPresent(m.ip_address)) item['ip-address'] = String(m.ip_address);
    if (isPresent(m.mac_address)) item.mac = String(m.mac_address);
    const option = optionToConfig(m.option || {});
    if (Object.keys(option).length) item.option = option;
    result[m.name] = item;
  }
  return result;
}

function subnetsToForm(subnets = {}) {
  return Object.entries(subnets).map(([subnet, s]) => ({
    _subnet: subnet,
    subnet,
    description: s.description || '',
    disable: s.disable !== undefined,
    subnet_id: s['subnet-id'] !== undefined ? String(s['subnet-id']) : '',
    ignore_client_id: s['ignore-client-id'] !== undefined,
    lease: s.lease !== undefined ? String(s.lease) : '',
    exclude: joinMembers(s.exclude),
    default_router: joinMembers(s['default-router']),
    domain_name: s['domain-name'] || '',
    domain_search: joinMembers(s['domain-search']),
    name_server: joinMembers(s['name-server']),
    ntp_server: joinMembers(s['ntp-server']),
    range: rangesToForm(s.range),
    static_mapping: staticMappingsToForm(s['static-mapping']),
    option: optionToForm(s.option),
  }));
}

function subnetsToConfig(formSubnets) {
  const result = {};
  for (const s of formSubnets) {
    if (!s.subnet) continue;
    const item = {};
    if (isPresent(s.description)) item.description = String(s.description);
    if (s.disable) item.disable = '';
    if (isPresent(s.subnet_id)) item['subnet-id'] = String(s.subnet_id);
    if (s.ignore_client_id) item['ignore-client-id'] = '';
    if (isPresent(s.lease)) item.lease = String(s.lease);
    const excludes = splitMembers(s.exclude);
    if (excludes.length) item.exclude = excludes;
    const defaultRouters = splitMembers(s.default_router);
    if (defaultRouters.length) item['default-router'] = defaultRouters;
    if (isPresent(s.domain_name)) item['domain-name'] = String(s.domain_name);
    const domainSearch = splitMembers(s.domain_search);
    if (domainSearch.length) item['domain-search'] = domainSearch;
    const nameServers = splitMembers(s.name_server);
    if (nameServers.length) item['name-server'] = nameServers;
    const ntpServers = splitMembers(s.ntp_server);
    if (ntpServers.length) item['ntp-server'] = ntpServers;
    const ranges = rangesToConfig(s.range || []);
    if (Object.keys(ranges).length) item.range = ranges;
    const mappings = staticMappingsToConfig(s.static_mapping || []);
    if (Object.keys(mappings).length) item['static-mapping'] = mappings;
    const option = optionToConfig(s.option || {});
    if (Object.keys(option).length) item.option = option;
    result[s.subnet] = item;
  }
  return result;
}

function sharedNetworksToForm(networks = {}) {
  return Object.entries(networks).map(([name, n]) => ({
    _name: name,
    name,
    authoritative: n.authoritative !== undefined,
    description: n.description || '',
    disable: n.disable !== undefined,
    option: optionToForm(n.option),
    subnets: subnetsToForm(n.subnet),
  }));
}

function sharedNetworksToConfig(formNetworks) {
  const result = {};
  for (const n of formNetworks) {
    if (!n.name) continue;
    const item = {};
    if (n.authoritative) item.authoritative = '';
    if (isPresent(n.description)) item.description = String(n.description);
    if (n.disable) item.disable = '';
    const option = optionToConfig(n.option || {});
    if (Object.keys(option).length) item.option = option;
    const subnets = subnetsToConfig(n.subnets || []);
    if (Object.keys(subnets).length) item.subnet = subnets;
    result[n.name] = item;
  }
  return result;
}

function haToForm(ha = {}) {
  return {
    mode: ha.mode || 'active-active',
    name: ha.name || '',
    remote: ha.remote || '',
    source_address: ha['source-address'] || '',
    status: ha.status || '',
    ca_certificate: ha['ca-certificate'] || '',
    certificate: ha.certificate || '',
  };
}

function haToConfig(formHa) {
  const result = {};
  if (isPresent(formHa.mode)) result.mode = String(formHa.mode);
  if (isPresent(formHa.name)) result.name = String(formHa.name);
  if (isPresent(formHa.remote)) result.remote = String(formHa.remote);
  if (isPresent(formHa.source_address)) result['source-address'] = String(formHa.source_address);
  if (isPresent(formHa.status)) result.status = String(formHa.status);
  if (isPresent(formHa.ca_certificate)) result['ca-certificate'] = String(formHa.ca_certificate);
  if (isPresent(formHa.certificate)) result.certificate = String(formHa.certificate);
  return result;
}

function dhcpServerToForm(data = {}) {
  return {
    disable: data.disable !== undefined,
    dynamic_dns_update: data['dynamic-dns-update'] !== undefined,
    hostfile_update: data['hostfile-update'] !== undefined,
    listen_address: joinMembers(data['listen-address']),
    listen_interface: joinMembers(data['listen-interface']),
    high_availability: haToForm(data['high-availability']),
    shared_networks: sharedNetworksToForm(data['shared-network-name']),
  };
}

function dhcpServerToConfig(form) {
  const result = {};
  if (form.disable) result.disable = '';
  if (form.dynamic_dns_update) result['dynamic-dns-update'] = '';
  if (form.hostfile_update) result['hostfile-update'] = '';
  const listenAddresses = splitMembers(form.listen_address);
  if (listenAddresses.length) result['listen-address'] = listenAddresses;
  const listenInterfaces = splitMembers(form.listen_interface);
  if (listenInterfaces.length) result['listen-interface'] = listenInterfaces;
  const ha = haToConfig(form.high_availability || {});
  if (Object.keys(ha).length) result['high-availability'] = ha;
  const networks = sharedNetworksToConfig(form.shared_networks || []);
  if (Object.keys(networks).length) result['shared-network-name'] = networks;
  return result;
}

const DhcpOptionForm = defineComponent({
  name: 'DhcpOptionForm',
  props: { modelValue: { type: Object, default: () => ({}) }, disabled: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const form = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val),
    });

    const staticRouteColumns = [
      { key: 'destination', title: t('dhcp.columns.destination') },
      { key: 'next_hop', title: t('dhcp.columns.nextHop') },
    ];
    const vendorOptionColumns = [
      { key: 'id', title: t('dhcp.columns.id') },
      { key: 'value', title: t('dhcp.columns.value') },
    ];

    const selectedStaticRoute = ref([]);
    const selectedVendorOption = ref([]);

    const showStaticRouteModal = ref(false);
    const editingStaticRoute = ref({});
    const showVendorOptionModal = ref(false);
    const editingVendorOption = ref({});

    function ensureArrays() {
      if (!Array.isArray(form.value.static_route)) form.value.static_route = [];
      if (!Array.isArray(form.value.vendor_option)) form.value.vendor_option = [];
    }

    function createStaticRoute() {
      ensureArrays();
      editingStaticRoute.value = { destination: '', next_hop: '' };
      showStaticRouteModal.value = true;
    }
    function editStaticRoute() {
      ensureArrays();
      if (!selectedStaticRoute.value.length) return showError({ message: t('dhcp.messages.selectStaticRoute') });
      const row = form.value.static_route.find(r => r.destination === selectedStaticRoute.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.staticRouteNotFound') });
      editingStaticRoute.value = { ...row };
      showStaticRouteModal.value = true;
    }
    function removeStaticRoute() {
      ensureArrays();
      if (!selectedStaticRoute.value.length) return showError({ message: t('dhcp.messages.selectStaticRoute') });
      form.value.static_route = form.value.static_route.filter(r => r.destination !== selectedStaticRoute.value[0]);
      selectedStaticRoute.value = [];
    }
    function saveStaticRoute() {
      if (!editingStaticRoute.value.destination) return showError({ message: t('dhcp.messages.enterDestination') });
      const err = validateCIDR(editingStaticRoute.value.destination, t);
      if (err) return showError({ message: err });
      if (editingStaticRoute.value.next_hop && validateIPv4(editingStaticRoute.value.next_hop, t)) return showError({ message: t('dhcp.validation.nextHopInvalid') });
      ensureArrays();
      const list = form.value.static_route;
      const idx = list.findIndex(r => r._destination === editingStaticRoute.value._destination);
      if (idx >= 0) list.splice(idx, 1, { ...editingStaticRoute.value });
      else list.push({ ...editingStaticRoute.value });
      form.value.static_route = [...list];
      showStaticRouteModal.value = false;
    }

    function createVendorOption() {
      ensureArrays();
      editingVendorOption.value = { id: '', value: '' };
      showVendorOptionModal.value = true;
    }
    function editVendorOption() {
      ensureArrays();
      if (!selectedVendorOption.value.length) return showError({ message: t('dhcp.messages.selectVendorOption') });
      const row = form.value.vendor_option.find(v => v.id === selectedVendorOption.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.vendorOptionNotFound') });
      editingVendorOption.value = { ...row };
      showVendorOptionModal.value = true;
    }
    function removeVendorOption() {
      ensureArrays();
      if (!selectedVendorOption.value.length) return showError({ message: t('dhcp.messages.selectVendorOption') });
      form.value.vendor_option = form.value.vendor_option.filter(v => v.id !== selectedVendorOption.value[0]);
      selectedVendorOption.value = [];
    }
    function saveVendorOption() {
      if (!editingVendorOption.value.id) return showError({ message: t('dhcp.messages.enterVendorOptionId') });
      ensureArrays();
      const list = form.value.vendor_option;
      const idx = list.findIndex(v => v._id === editingVendorOption.value._id);
      if (idx >= 0) list.splice(idx, 1, { ...editingVendorOption.value });
      else list.push({ ...editingVendorOption.value });
      form.value.vendor_option = [...list];
      showVendorOptionModal.value = false;
    }

    return {
      t,
      form,
      staticRouteColumns, vendorOptionColumns,
      selectedStaticRoute, selectedVendorOption,
      showStaticRouteModal, editingStaticRoute,
      showVendorOptionModal, editingVendorOption,
      createStaticRoute, editStaticRoute, removeStaticRoute, saveStaticRoute,
      createVendorOption, editVendorOption, removeVendorOption, saveVendorOption,
    };
  },
  components: { DataTable, DraggableModal, ToolbarButton },
  template: `
    <div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.bootfileName') }}</label><input class="form-control" v-model="form.bootfile_name" :disabled="disabled" :title="t('dhcp.titles.bootfileName')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.bootfileServer') }}</label><input class="form-control" v-model="form.bootfile_server" :disabled="disabled" :title="t('dhcp.titles.bootfileServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.bootfileSize') }}</label><input type="number" min="0" class="form-control" v-model="form.bootfile_size" :disabled="disabled" :placeholder="t('dhcp.placeholders.bytes')" :title="t('dhcp.titles.bootfileSize')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.captivePortal') }}</label><input class="form-control" v-model="form.captive_portal" :disabled="disabled" :title="t('dhcp.titles.captivePortal')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.clientPrefixLength') }}</label><input type="number" min="0" max="32" class="form-control" v-model="form.client_prefix_length" :disabled="disabled" :placeholder="t('dhcp.placeholders.prefixLength')" :title="t('dhcp.titles.clientPrefixLength')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.defaultRouter') }}</label><textarea class="form-control" v-model="form.default_router" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.defaultRouter')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.domainName') }}</label><input class="form-control" v-model="form.domain_name" :disabled="disabled" :title="t('dhcp.titles.domainName')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.domainSearch') }}</label><textarea class="form-control" v-model="form.domain_search" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.domainSearch')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.ipForwarding') }}</label><input type="checkbox" v-model="form.ip_forwarding" :disabled="disabled" :title="t('dhcp.titles.ipForwarding')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.ipv6OnlyPreferred') }}</label><input type="number" min="0" class="form-control" v-model="form.ipv6_only_preferred" :disabled="disabled" :placeholder="t('dhcp.placeholders.seconds')" :title="t('dhcp.titles.ipv6OnlyPreferred')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.dnsServer') }}</label><textarea class="form-control" v-model="form.name_server" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.dnsServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.ntpServer') }}</label><textarea class="form-control" v-model="form.ntp_server" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.ntpServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.popServer') }}</label><input class="form-control" v-model="form.pop_server" :disabled="disabled" :title="t('dhcp.titles.popServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.serverIdentifier') }}</label><input class="form-control" v-model="form.server_identifier" :disabled="disabled" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.serverIdentifier')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.smtpServer') }}</label><textarea class="form-control" v-model="form.smtp_server" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.smtpServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.tftpServerName') }}</label><input class="form-control" v-model="form.tftp_server_name" :disabled="disabled" :title="t('dhcp.titles.tftpServerName')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.timeOffset') }}</label><input type="number" class="form-control" v-model="form.time_offset" :disabled="disabled" :placeholder="t('dhcp.placeholders.seconds')" :title="t('dhcp.titles.timeOffset')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.timeServer') }}</label><textarea class="form-control" v-model="form.time_server" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.timeServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.timeZone') }}</label><input class="form-control" v-model="form.time_zone" :disabled="disabled" :title="t('dhcp.titles.timeZone')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.winsServer') }}</label><textarea class="form-control" v-model="form.wins_server" rows="2" :disabled="disabled" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.winsServer')" /></div>
      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.wpadUrl') }}</label><input class="form-control" v-model="form.wpad_url" :disabled="disabled" :title="t('dhcp.titles.wpadUrl')" /></div>

      <div class="form-row"><label class="form-label">{{ t('dhcp.labels.staticRoutes') }}</label></div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createStaticRoute" :disabled="disabled">{{ t('app.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editStaticRoute" :disabled="disabled || !selectedStaticRoute.length || selectedStaticRoute.length > 1">{{ t('app.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeStaticRoute" :disabled="disabled || !selectedStaticRoute.length">{{ t('app.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="staticRouteColumns" :data="form.static_route || []" row-key="destination" :externalToolbar="true" @selection-change="selectedStaticRoute = $event" :selectable="true" />

      <div class="form-row" style="margin-top:12px;"><label class="form-label">{{ t('dhcp.labels.vendorOptions') }}</label></div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createVendorOption" :disabled="disabled">{{ t('app.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editVendorOption" :disabled="disabled || !selectedVendorOption.length || selectedVendorOption.length > 1">{{ t('app.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeVendorOption" :disabled="disabled || !selectedVendorOption.length">{{ t('app.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="vendorOptionColumns" :data="form.vendor_option || []" row-key="id" :externalToolbar="true" @selection-change="selectedVendorOption = $event" :selectable="true" />

      <DraggableModal v-model:visible="showStaticRouteModal" :title="t('dhcp.modals.staticRoute')" @confirm="saveStaticRoute" @close="showStaticRouteModal = false">
        <div class="form-row"><label class="form-label">{{ t('dhcp.columns.destination') }}</label><input class="form-control" v-model="editingStaticRoute.destination" :disabled="editingStaticRoute._destination" :placeholder="t('dhcp.placeholders.cidr')" :title="t('dhcp.titles.destination')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.columns.nextHop') }}</label><input class="form-control" v-model="editingStaticRoute.next_hop" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.nextHop')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showVendorOptionModal" :title="t('dhcp.modals.vendorOption')" @confirm="saveVendorOption" @close="showVendorOptionModal = false">
        <div class="form-row"><label class="form-label">{{ t('dhcp.columns.id') }}</label><input class="form-control" v-model="editingVendorOption.id" :disabled="editingVendorOption._id" :title="t('dhcp.titles.vendorOptionId')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.columns.value') }}</label><input class="form-control" v-model="editingVendorOption.value" :title="t('dhcp.titles.vendorOptionValue')" /></div>
      </DraggableModal>
    </div>
  `,
});

export default defineComponent({
  name: 'DhcpServerPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dhcpServerToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);
    const listenAddressOptions = ref([]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
        const addrs = new Set();
        for (const i of list) {
          for (const addr of String(i.ipv4_address || '').split(',')) {
            const a = addr.trim();
            if (a) addrs.add(a.split('/')[0]);
          }
        }
        listenAddressOptions.value = Array.from(addrs).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    function appendListenAddress(addr) {
      if (!addr) return;
      const current = splitMembers(config.value.listen_address);
      if (!current.includes(addr)) {
        config.value.listen_address = [...current, addr].join('\n');
      }
    }

    const sharedNetworkColumns = [
      { key: 'name', title: t('dhcp.columns.name') },
      { key: 'authoritative', title: t('dhcp.columns.authoritative'), render: (v) => v ? t('app.yes') : t('app.no') },
      { key: 'description', title: t('dhcp.columns.description') },
      { key: 'disable', title: t('dhcp.columns.disable'), render: (v) => v ? t('app.yes') : t('app.no') },
      { key: 'subnets', title: t('dhcp.columns.subnetCount'), render: (v) => (v || []).length },
    ];
    const subnetColumns = [
      { key: 'subnet', title: t('dhcp.columns.subnet') },
      { key: 'subnet_id', title: t('dhcp.columns.subnetId') },
      { key: 'description', title: t('dhcp.columns.description') },
      { key: 'disable', title: t('dhcp.columns.disable'), render: (v) => v ? t('app.yes') : t('app.no') },
      { key: 'range', title: t('dhcp.columns.rangeCount'), render: (v) => (v || []).length },
      { key: 'static_mapping', title: t('dhcp.columns.staticMappingCount'), render: (v) => (v || []).length },
    ];
    const rangeColumns = [
      { key: 'name', title: t('dhcp.columns.name') },
      { key: 'start', title: t('dhcp.columns.start') },
      { key: 'stop', title: t('dhcp.columns.stop') },
    ];
    const staticMappingColumns = [
      { key: 'name', title: t('dhcp.columns.name') },
      { key: 'description', title: t('dhcp.columns.description') },
      { key: 'disable', title: t('dhcp.columns.disable'), render: (v) => v ? t('app.yes') : t('app.no') },
      { key: 'duid', title: t('dhcp.columns.duid') },
      { key: 'ip_address', title: t('dhcp.columns.ipAddress') },
      { key: 'mac_address', title: t('dhcp.columns.macAddress') },
    ];

    const selectedSharedNetwork = ref([]);
    const selectedSubnet = ref([]);
    const selectedRange = ref([]);
    const selectedStaticMapping = ref([]);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'ha': return 'service dhcp-server high-availability';
        case 'shared-networks': return 'service dhcp-server shared-network-name';
        case 'basic':
        default: return 'service dhcp-server';
      }
    });

    const showSharedNetworkModal = ref(false);
    const editingSharedNetwork = ref({});
    const sharedNetworkActiveTab = ref('basic');

    const showSubnetModal = ref(false);
    const editingSubnet = ref({});

    const showRangeModal = ref(false);
    const editingRange = ref({});

    const showStaticMappingModal = ref(false);
    const editingStaticMapping = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dhcp-server', true);
        config.value = dhcpServerToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const listenAddresses = splitMembers(config.value.listen_address);
      for (const ip of listenAddresses) {
        if (validateIPv4(ip, t)) return showError({ message: t('dhcp.errors.listenAddressInvalid', { ip }) });
      }
      const ha = config.value.high_availability || {};
      if (isPresent(ha.remote) && validateIPv4(ha.remote, t)) return showError({ message: t('dhcp.errors.haRemoteInvalid') });
      if (isPresent(ha.source_address) && validateIPv4(ha.source_address, t)) return showError({ message: t('dhcp.errors.haSourceInvalid') });
      for (const n of config.value.shared_networks || []) {
        if (!n.name) return showError({ message: t('dhcp.errors.sharedNetworkNameRequired') });
        for (const s of n.subnets || []) {
          if (!s.subnet) return showError({ message: t('dhcp.errors.subnetRequired', { network: n.name }) });
          const err = validateCIDR(s.subnet, t);
          if (err) return showError({ message: t('dhcp.errors.subnetInvalid', { network: n.name, subnet: s.subnet, error: err }) });
          for (const r of s.range || []) {
            if (!r.name) return showError({ message: t('dhcp.errors.rangeNameRequired') });
            if (validateIPv4(r.start, t) || validateIPv4(r.stop, t)) return showError({ message: t('dhcp.errors.rangeIpInvalid', { name: r.name }) });
          }
          for (const m of s.static_mapping || []) {
            if (!m.name) return showError({ message: t('dhcp.errors.staticMappingNameRequired') });
            if (m.ip_address && validateIPv4(m.ip_address, t)) return showError({ message: t('dhcp.errors.staticMappingIpInvalid', { name: m.name }) });
            if (m.mac_address && validateMAC(m.mac_address, t)) return showError({ message: t('dhcp.errors.staticMappingMacInvalid', { name: m.name }) });
          }
        }
      }

      saving.value = true;
      try {
        await configApi.set('service dhcp-server', dhcpServerToConfig(config.value));
        configStore.markPending();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createSharedNetwork() {
      editingSharedNetwork.value = {
        name: '', description: '', authoritative: false, disable: false,
        option: optionToForm(), subnets: [],
      };
      sharedNetworkActiveTab.value = 'basic';
      showSharedNetworkModal.value = true;
    }
    function editSharedNetwork() {
      if (!selectedSharedNetwork.value.length) return showError({ message: t('dhcp.messages.selectSharedNetwork') });
      const row = (config.value.shared_networks || []).find(n => n.name === selectedSharedNetwork.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.sharedNetworkNotFound') });
      editingSharedNetwork.value = JSON.parse(JSON.stringify(row));
      sharedNetworkActiveTab.value = 'basic';
      showSharedNetworkModal.value = true;
    }
    function removeSharedNetwork() {
      if (!selectedSharedNetwork.value.length) return showError({ message: t('dhcp.messages.selectSharedNetwork') });
      config.value.shared_networks = (config.value.shared_networks || []).filter(n => n.name !== selectedSharedNetwork.value[0]);
      selectedSharedNetwork.value = [];
    }
    function saveSharedNetwork() {
      const err = validateName(editingSharedNetwork.value.name, t);
      if (err) return showError({ message: err });
      const list = config.value.shared_networks || [];
      const idx = list.findIndex(n => n._name === editingSharedNetwork.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingSharedNetwork.value });
      else list.push({ ...editingSharedNetwork.value });
      config.value.shared_networks = list;
      showSharedNetworkModal.value = false;
    }

    function createSubnet() {
      editingSubnet.value = {
        subnet: '', description: '', disable: false,
        subnet_id: '', ignore_client_id: false, lease: '', exclude: '',
        default_router: '', domain_name: '', domain_search: '', name_server: '', ntp_server: '',
        range: [], static_mapping: [], option: optionToForm(),
      };
      showSubnetModal.value = true;
    }
    function editSubnet() {
      if (!selectedSubnet.value.length) return showError({ message: t('dhcp.messages.selectSubnet') });
      const row = (editingSharedNetwork.value.subnets || []).find(s => s.subnet === selectedSubnet.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.subnetNotFound') });
      editingSubnet.value = JSON.parse(JSON.stringify(row));
      showSubnetModal.value = true;
    }
    function removeSubnet() {
      if (!selectedSubnet.value.length) return showError({ message: t('dhcp.messages.selectSubnet') });
      editingSharedNetwork.value.subnets = (editingSharedNetwork.value.subnets || []).filter(s => s.subnet !== selectedSubnet.value[0]);
      selectedSubnet.value = [];
    }
    function saveSubnet() {
      if (!editingSubnet.value.subnet) return showError({ message: t('dhcp.messages.enterSubnet') });
      const err = validateCIDR(editingSubnet.value.subnet, t);
      if (err) return showError({ message: err });
      const list = editingSharedNetwork.value.subnets || [];
      const idx = list.findIndex(s => s._subnet === editingSubnet.value._subnet);
      if (idx >= 0) list.splice(idx, 1, { ...editingSubnet.value });
      else list.push({ ...editingSubnet.value });
      editingSharedNetwork.value.subnets = list;
      showSubnetModal.value = false;
    }

    function createRange() {
      editingRange.value = { name: '', start: '', stop: '' };
      showRangeModal.value = true;
    }
    function editRange() {
      if (!selectedRange.value.length) return showError({ message: t('dhcp.messages.selectRange') });
      const row = (editingSubnet.value.range || []).find(r => r.name === selectedRange.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.rangeNotFound') });
      editingRange.value = { ...row };
      showRangeModal.value = true;
    }
    function removeRange() {
      if (!selectedRange.value.length) return showError({ message: t('dhcp.messages.selectRange') });
      editingSubnet.value.range = (editingSubnet.value.range || []).filter(r => r.name !== selectedRange.value[0]);
      selectedRange.value = [];
    }
    function saveRange() {
      if (!editingRange.value.name) return showError({ message: t('dhcp.messages.enterRangeName') });
      if (editingRange.value.start && validateIPv4(editingRange.value.start, t)) return showError({ message: t('dhcp.validation.startIpInvalid') });
      if (editingRange.value.stop && validateIPv4(editingRange.value.stop, t)) return showError({ message: t('dhcp.validation.endIpInvalid') });
      const list = editingSubnet.value.range || [];
      const idx = list.findIndex(r => r._name === editingRange.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingRange.value });
      else list.push({ ...editingRange.value });
      editingSubnet.value.range = list;
      showRangeModal.value = false;
    }

    function createStaticMapping() {
      editingStaticMapping.value = { name: '', description: '', disable: false, duid: '', ip_address: '', mac_address: '', option: optionToForm() };
      showStaticMappingModal.value = true;
    }
    function editStaticMapping() {
      if (!selectedStaticMapping.value.length) return showError({ message: t('dhcp.messages.selectStaticMapping') });
      const row = (editingSubnet.value.static_mapping || []).find(m => m.name === selectedStaticMapping.value[0]);
      if (!row) return showError({ message: t('dhcp.messages.staticMappingNotFound') });
      editingStaticMapping.value = { ...row };
      showStaticMappingModal.value = true;
    }
    function removeStaticMapping() {
      if (!selectedStaticMapping.value.length) return showError({ message: t('dhcp.messages.selectStaticMapping') });
      editingSubnet.value.static_mapping = (editingSubnet.value.static_mapping || []).filter(m => m.name !== selectedStaticMapping.value[0]);
      selectedStaticMapping.value = [];
    }
    function saveStaticMapping() {
      if (!editingStaticMapping.value.name) return showError({ message: t('dhcp.messages.enterStaticMappingName') });
      if (editingStaticMapping.value.ip_address && validateIPv4(editingStaticMapping.value.ip_address, t)) return showError({ message: t('dhcp.validation.ipInvalid') });
      if (editingStaticMapping.value.mac_address && validateMAC(editingStaticMapping.value.mac_address, t)) return showError({ message: t('dhcp.validation.macInvalid') });
      const list = editingSubnet.value.static_mapping || [];
      const idx = list.findIndex(m => m._name === editingStaticMapping.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingStaticMapping.value });
      else list.push({ ...editingStaticMapping.value });
      editingSubnet.value.static_mapping = list;
      showStaticMappingModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      HA_MODE_OPTIONS,
      loading, saving, saved, config, activeTab, writeDisabled, commandPath, interfaces, listenAddressOptions,
      sharedNetworkColumns, subnetColumns, rangeColumns, staticMappingColumns,
      selectedSharedNetwork, selectedSubnet, selectedRange, selectedStaticMapping,
      showSharedNetworkModal, editingSharedNetwork, sharedNetworkActiveTab,
      showSubnetModal, editingSubnet,
      showRangeModal, editingRange,
      showStaticMappingModal, editingStaticMapping,
      load, save, appendListenAddress,
      createSharedNetwork, editSharedNetwork, removeSharedNetwork, saveSharedNetwork,
      createSubnet, editSubnet, removeSubnet, saveSubnet,
      createRange, editRange, removeRange, saveRange,
      createStaticMapping, editStaticMapping, removeStaticMapping, saveStaticMapping,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton, DhcpOptionForm },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('dhcp.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('dhcp.tabs.basic') },
        { key: 'ha', title: t('dhcp.tabs.ha') },
        { key: 'shared-networks', title: t('dhcp.tabs.sharedNetworks') }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.disable') }}</label><input type="checkbox" v-model="config.disable" :title="t('dhcp.titles.disable')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.dynamicDnsUpdate') }}</label><input type="checkbox" v-model="config.dynamic_dns_update" :title="t('dhcp.titles.dynamicDnsUpdate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.hostfileUpdate') }}</label><input type="checkbox" v-model="config.hostfile_update" :title="t('dhcp.titles.hostfileUpdate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.listenAddress') }}</label>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <select class="form-control" @change="appendListenAddress($event.target.value); $event.target.value = ''" :title="t('dhcp.titles.listenAddressSelect')">
              <option value="">{{ t('dhcp.placeholders.selectPresetAddress') }}</option>
              <option v-for="addr in listenAddressOptions" :key="addr" :value="addr">{{ addr }}</option>
            </select>
            <textarea class="form-control" v-model="config.listen_address" rows="3" :placeholder="t('dhcp.placeholders.listenAddress')" :title="t('dhcp.titles.listenAddress')" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.listenInterface') }}</label>
          <select class="form-control" v-model="config.listen_interface" :title="t('dhcp.titles.listenInterface')">
            <option value="">{{ t('dhcp.placeholders.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </template>

      <template #ha>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.mode') }}</label>
          <select class="form-control" v-model="config.high_availability.mode" :title="t('dhcp.titles.mode')">
            <option v-for="o in HA_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.peerName') }}</label><input class="form-control" v-model="config.high_availability.name" :title="t('dhcp.titles.peerName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.remoteAddress') }}</label><input class="form-control" v-model="config.high_availability.remote" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.remoteAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.sourceAddress') }}</label><input class="form-control" v-model="config.high_availability.source_address" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.sourceAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.statusLevel') }}</label><input class="form-control" v-model="config.high_availability.status" :title="t('dhcp.titles.statusLevel')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.caCertificate') }}</label><input class="form-control" v-model="config.high_availability.ca_certificate" :title="t('dhcp.titles.caCertificate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.certificate') }}</label><input class="form-control" v-model="config.high_availability.certificate" :title="t('dhcp.titles.certificate')" /></div>
      </template>

      <template #shared-networks>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createSharedNetwork">{{ t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editSharedNetwork" :disabled="!selectedSharedNetwork.length || selectedSharedNetwork.length > 1">{{ t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeSharedNetwork" :disabled="!selectedSharedNetwork.length">{{ t('app.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="sharedNetworkColumns" :data="config.shared_networks" row-key="name" :externalToolbar="true" @selection-change="selectedSharedNetwork = $event" :selectable="true" />
      </template>
      </TabGroup>

      <DraggableModal v-model:visible="showSharedNetworkModal" :title="t('dhcp.modals.sharedNetwork')" width="780" @confirm="saveSharedNetwork" @close="showSharedNetworkModal = false">
        <TabGroup v-model="sharedNetworkActiveTab" :tabs="[
          { key: 'basic', title: t('dhcp.tabs.basic') },
          { key: 'subnets', title: t('dhcp.tabs.subnets') },
          { key: 'options', title: t('dhcp.tabs.options') }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.name') }}</label><input class="form-control" v-model="editingSharedNetwork.name" :disabled="editingSharedNetwork._name" :title="t('dhcp.titles.sharedNetworkName')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.description') }}</label><input class="form-control" v-model="editingSharedNetwork.description" :title="t('dhcp.titles.description')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.authoritative') }}</label><input type="checkbox" v-model="editingSharedNetwork.authoritative" :title="t('dhcp.titles.authoritative')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.disable') }}</label><input type="checkbox" v-model="editingSharedNetwork.disable" :title="t('dhcp.titles.disableSharedNetwork')" /></div>
          </template>

          <template #subnets>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createSubnet">{{ t('app.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editSubnet" :disabled="!selectedSubnet.length || selectedSubnet.length > 1">{{ t('app.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeSubnet" :disabled="!selectedSubnet.length">{{ t('app.delete') }}</ToolbarButton>
            </div>
            <DataTable :columns="subnetColumns" :data="editingSharedNetwork.subnets" row-key="subnet" :externalToolbar="true" @selection-change="selectedSubnet = $event" :selectable="true" />
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingSharedNetwork.option" />
          </template>
        </TabGroup>
      </DraggableModal>

      <DraggableModal v-model:visible="showSubnetModal" :title="t('dhcp.modals.subnet')" width="780" @confirm="saveSubnet" @close="showSubnetModal = false">
        <TabGroup :tabs="[
          { key: 'basic', title: t('dhcp.tabs.basic') },
          { key: 'ranges', title: t('dhcp.tabs.ranges') },
          { key: 'mappings', title: t('dhcp.tabs.mappings') },
          { key: 'options', title: t('dhcp.tabs.options') }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.subnet') }}</label><input class="form-control" v-model="editingSubnet.subnet" :disabled="editingSubnet._subnet" :placeholder="t('dhcp.placeholders.cidr')" :title="t('dhcp.titles.subnetCidr')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.description') }}</label><input class="form-control" v-model="editingSubnet.description" :title="t('dhcp.titles.description')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.disable') }}</label><input type="checkbox" v-model="editingSubnet.disable" :title="t('dhcp.titles.disableSubnet')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.subnetId') }}</label><input type="number" min="0" max="4294967295" class="form-control" v-model="editingSubnet.subnet_id" :placeholder="t('dhcp.placeholders.subnetId')" :title="t('dhcp.titles.subnetId')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.ignoreClientId') }}</label><input type="checkbox" v-model="editingSubnet.ignore_client_id" :title="t('dhcp.titles.ignoreClientId')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.leaseTime') }}</label><input type="number" min="1" class="form-control" v-model="editingSubnet.lease" :placeholder="t('dhcp.placeholders.leaseTime')" :title="t('dhcp.titles.leaseTime')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.excludeAddresses') }}</label><textarea class="form-control" v-model="editingSubnet.exclude" rows="2" :placeholder="t('dhcp.placeholders.excludeAddresses')" :title="t('dhcp.titles.excludeAddresses')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.defaultRouter') }}</label><textarea class="form-control" v-model="editingSubnet.default_router" rows="2" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.defaultRouter')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.domainName') }}</label><input class="form-control" v-model="editingSubnet.domain_name" :title="t('dhcp.titles.domainName')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.domainSearch') }}</label><textarea class="form-control" v-model="editingSubnet.domain_search" rows="2" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.domainSearch')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.dnsServer') }}</label><textarea class="form-control" v-model="editingSubnet.name_server" rows="2" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.dnsServer')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.labels.ntpServer') }}</label><textarea class="form-control" v-model="editingSubnet.ntp_server" rows="2" :placeholder="t('dhcp.placeholders.onePerLine')" :title="t('dhcp.titles.ntpServer')" /></div>
          </template>

          <template #ranges>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createRange">{{ t('app.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editRange" :disabled="!selectedRange.length || selectedRange.length > 1">{{ t('app.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeRange" :disabled="!selectedRange.length">{{ t('app.delete') }}</ToolbarButton>
            </div>
            <DataTable :columns="rangeColumns" :data="editingSubnet.range" row-key="name" :externalToolbar="true" @selection-change="selectedRange = $event" :selectable="true" />
          </template>

          <template #mappings>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createStaticMapping">{{ t('app.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editStaticMapping" :disabled="!selectedStaticMapping.length || selectedStaticMapping.length > 1">{{ t('app.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeStaticMapping" :disabled="!selectedStaticMapping.length">{{ t('app.delete') }}</ToolbarButton>
            </div>
            <DataTable :columns="staticMappingColumns" :data="editingSubnet.static_mapping" row-key="name" :externalToolbar="true" @selection-change="selectedStaticMapping = $event" :selectable="true" />
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingSubnet.option" />
          </template>
        </TabGroup>
      </DraggableModal>

      <DraggableModal v-model:visible="showRangeModal" :title="t('dhcp.modals.range')" @confirm="saveRange" @close="showRangeModal = false">
        <div class="form-row"><label class="form-label">{{ t('dhcp.columns.name') }}</label><input class="form-control" v-model="editingRange.name" :disabled="editingRange._name" :title="t('dhcp.titles.rangeName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.startAddress') }}</label><input class="form-control" v-model="editingRange.start" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.startAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dhcp.labels.endAddress') }}</label><input class="form-control" v-model="editingRange.stop" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.endAddress')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showStaticMappingModal" :title="t('dhcp.modals.staticMapping')" width="780" @confirm="saveStaticMapping" @close="showStaticMappingModal = false">
        <TabGroup :tabs="[
          { key: 'basic', title: t('dhcp.tabs.basic') },
          { key: 'options', title: t('dhcp.tabs.options') }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.name') }}</label><input class="form-control" v-model="editingStaticMapping.name" :disabled="editingStaticMapping._name" :title="t('dhcp.titles.staticMappingName')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.description') }}</label><input class="form-control" v-model="editingStaticMapping.description" :title="t('dhcp.titles.description')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.disable') }}</label><input type="checkbox" v-model="editingStaticMapping.disable" :title="t('dhcp.titles.disableStaticMapping')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.duid') }}</label><input class="form-control" v-model="editingStaticMapping.duid" :placeholder="t('dhcp.placeholders.duid')" :title="t('dhcp.titles.duid')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.ipAddress') }}</label><input class="form-control" v-model="editingStaticMapping.ip_address" :placeholder="t('dhcp.placeholders.ipv4')" :title="t('dhcp.titles.ipAddress')" /></div>
            <div class="form-row"><label class="form-label">{{ t('dhcp.columns.macAddress') }}</label><input class="form-control" v-model="editingStaticMapping.mac_address" :placeholder="t('dhcp.placeholders.mac')" :title="t('dhcp.titles.macAddress')" /></div>
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingStaticMapping.option" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
