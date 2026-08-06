import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

function validateName(name) {
  if (!name || !String(name).trim()) return '请输入名称';
  if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return '名称只能包含字母、数字、下划线和连字符';
  return '';
}

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateCIDR(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return '格式应为 x.x.x.x/x';
  const err = validateIPv4(parts[0]);
  if (err) return err;
  const mask = parseInt(parts[1], 10);
  if (isNaN(mask) || mask < 0 || mask > 32) return '掩码范围 0-32';
  return '';
}

function validateMAC(value) {
  if (!value) return '';
  if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(value)) return 'MAC 格式错误，如 aa:bb:cc:dd:ee:ff';
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
    const form = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val),
    });

    const staticRouteColumns = [
      { key: 'destination', title: '目的网段' },
      { key: 'next_hop', title: '下一跳' },
    ];
    const vendorOptionColumns = [
      { key: 'id', title: 'ID' },
      { key: 'value', title: '值' },
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
      if (!selectedStaticRoute.value.length) return alert('请选择要编辑的静态路由');
      const row = form.value.static_route.find(r => r.destination === selectedStaticRoute.value[0]);
      if (!row) return alert('未找到选中的静态路由');
      editingStaticRoute.value = { ...row };
      showStaticRouteModal.value = true;
    }
    function removeStaticRoute() {
      ensureArrays();
      if (!selectedStaticRoute.value.length) return alert('请选择要删除的静态路由');
      form.value.static_route = form.value.static_route.filter(r => r.destination !== selectedStaticRoute.value[0]);
      selectedStaticRoute.value = [];
    }
    function saveStaticRoute() {
      if (!editingStaticRoute.value.destination) return alert('请输入目的网段');
      const err = validateCIDR(editingStaticRoute.value.destination);
      if (err) return alert(err);
      if (editingStaticRoute.value.next_hop && validateIPv4(editingStaticRoute.value.next_hop)) return alert('下一跳格式错误');
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
      if (!selectedVendorOption.value.length) return alert('请选择要编辑的厂商选项');
      const row = form.value.vendor_option.find(v => v.id === selectedVendorOption.value[0]);
      if (!row) return alert('未找到选中的厂商选项');
      editingVendorOption.value = { ...row };
      showVendorOptionModal.value = true;
    }
    function removeVendorOption() {
      ensureArrays();
      if (!selectedVendorOption.value.length) return alert('请选择要删除的厂商选项');
      form.value.vendor_option = form.value.vendor_option.filter(v => v.id !== selectedVendorOption.value[0]);
      selectedVendorOption.value = [];
    }
    function saveVendorOption() {
      if (!editingVendorOption.value.id) return alert('请输入厂商选项 ID');
      ensureArrays();
      const list = form.value.vendor_option;
      const idx = list.findIndex(v => v._id === editingVendorOption.value._id);
      if (idx >= 0) list.splice(idx, 1, { ...editingVendorOption.value });
      else list.push({ ...editingVendorOption.value });
      form.value.vendor_option = [...list];
      showVendorOptionModal.value = false;
    }

    return {
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
      <div class="form-row"><label class="form-label">Bootfile 名称</label><input class="form-control" v-model="form.bootfile_name" :disabled="disabled" title="引导文件名" /></div>
      <div class="form-row"><label class="form-label">Bootfile 服务器</label><input class="form-control" v-model="form.bootfile_server" :disabled="disabled" title="加载初始引导文件的服务器" /></div>
      <div class="form-row"><label class="form-label">Bootfile 大小</label><input type="number" min="0" class="form-control" v-model="form.bootfile_size" :disabled="disabled" placeholder="单位：字节" title="引导文件大小（字节，非负整数）" /></div>
      <div class="form-row"><label class="form-label">Captive Portal</label><input class="form-control" v-model="form.captive_portal" :disabled="disabled" title="Captive Portal API 端点" /></div>
      <div class="form-row"><label class="form-label">客户端前缀长度</label><input type="number" min="0" max="32" class="form-control" v-model="form.client_prefix_length" :disabled="disabled" placeholder="0-32" title="客户端子网掩码前缀长度（0-32，RFC 950）" /></div>
      <div class="form-row"><label class="form-label">默认路由器</label><textarea class="form-control" v-model="form.default_router" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="默认路由器" /></div>
      <div class="form-row"><label class="form-label">域名</label><input class="form-control" v-model="form.domain_name" :disabled="disabled" title="客户端域名" /></div>
      <div class="form-row"><label class="form-label">域名搜索列表</label><textarea class="form-control" v-model="form.domain_search" rows="2" :disabled="disabled" placeholder="每行一个域名" title="域名搜索列表" /></div>
      <div class="form-row"><label class="form-label">IP 转发</label><input type="checkbox" v-model="form.ip_forwarding" :disabled="disabled" title="在客户端启用 IP 转发" /></div>
      <div class="form-row"><label class="form-label">IPv6 Only Preferred</label><input type="number" min="0" class="form-control" v-model="form.ipv6_only_preferred" :disabled="disabled" placeholder="秒" title="IPv6 Only Preferred 时间（秒，RFC 8925）" /></div>
      <div class="form-row"><label class="form-label">DNS 服务器</label><textarea class="form-control" v-model="form.name_server" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="DNS 服务器" /></div>
      <div class="form-row"><label class="form-label">NTP 服务器</label><textarea class="form-control" v-model="form.ntp_server" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="NTP 服务器" /></div>
      <div class="form-row"><label class="form-label">POP 服务器</label><input class="form-control" v-model="form.pop_server" :disabled="disabled" title="POP3 服务器" /></div>
      <div class="form-row"><label class="form-label">服务器标识</label><input class="form-control" v-model="form.server_identifier" :disabled="disabled" placeholder="x.x.x.x" title="DHCP 服务器标识地址" /></div>
      <div class="form-row"><label class="form-label">SMTP 服务器</label><textarea class="form-control" v-model="form.smtp_server" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="SMTP 服务器" /></div>
      <div class="form-row"><label class="form-label">TFTP 服务器名称</label><input class="form-control" v-model="form.tftp_server_name" :disabled="disabled" title="TFTP 服务器名称" /></div>
      <div class="form-row"><label class="form-label">时间偏移</label><input type="number" class="form-control" v-model="form.time_offset" :disabled="disabled" placeholder="秒" title="客户端子网相对于 UTC 的偏移秒数（RFC 2132）" /></div>
      <div class="form-row"><label class="form-label">时间服务器</label><textarea class="form-control" v-model="form.time_server" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="时间服务器" /></div>
      <div class="form-row"><label class="form-label">时区</label><input class="form-control" v-model="form.time_zone" :disabled="disabled" title="时区 (RFC 4833)" /></div>
      <div class="form-row"><label class="form-label">WINS 服务器</label><textarea class="form-control" v-model="form.wins_server" rows="2" :disabled="disabled" placeholder="每行一个 IPv4 地址" title="WINS 服务器" /></div>
      <div class="form-row"><label class="form-label">WPAD URL</label><input class="form-control" v-model="form.wpad_url" :disabled="disabled" title="Web Proxy Autodiscovery URL" /></div>

      <div class="form-row"><label class="form-label">静态路由</label></div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createStaticRoute" :disabled="disabled">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editStaticRoute" :disabled="disabled || !selectedStaticRoute.length || selectedStaticRoute.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeStaticRoute" :disabled="disabled || !selectedStaticRoute.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="staticRouteColumns" :data="form.static_route || []" row-key="destination" :externalToolbar="true" @selection-change="selectedStaticRoute = $event" :selectable="true" />

      <div class="form-row" style="margin-top:12px;"><label class="form-label">厂商选项</label></div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createVendorOption" :disabled="disabled">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editVendorOption" :disabled="disabled || !selectedVendorOption.length || selectedVendorOption.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeVendorOption" :disabled="disabled || !selectedVendorOption.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="vendorOptionColumns" :data="form.vendor_option || []" row-key="id" :externalToolbar="true" @selection-change="selectedVendorOption = $event" :selectable="true" />

      <DraggableModal v-model:visible="showStaticRouteModal" title="静态路由" @confirm="saveStaticRoute" @close="showStaticRouteModal = false">
        <div class="form-row"><label class="form-label">目的网段</label><input class="form-control" v-model="editingStaticRoute.destination" :disabled="editingStaticRoute._destination" placeholder="x.x.x.x/x" title="目的网段" /></div>
        <div class="form-row"><label class="form-label">下一跳</label><input class="form-control" v-model="editingStaticRoute.next_hop" placeholder="x.x.x.x" title="下一跳 IPv4 地址" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showVendorOptionModal" title="厂商选项" @confirm="saveVendorOption" @close="showVendorOptionModal = false">
        <div class="form-row"><label class="form-label">ID</label><input class="form-control" v-model="editingVendorOption.id" :disabled="editingVendorOption._id" title="厂商选项 ID" /></div>
        <div class="form-row"><label class="form-label">值</label><input class="form-control" v-model="editingVendorOption.value" title="厂商选项值" /></div>
      </DraggableModal>
    </div>
  `,
});

export default defineComponent({
  name: 'DhcpServerPage',
  setup() {
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
      { key: 'name', title: '名称' },
      { key: 'authoritative', title: '权威', render: (v) => v ? '是' : '否' },
      { key: 'description', title: '描述' },
      { key: 'disable', title: '禁用', render: (v) => v ? '是' : '否' },
      { key: 'subnets', title: '子网数', render: (v) => (v || []).length },
    ];
    const subnetColumns = [
      { key: 'subnet', title: '子网' },
      { key: 'subnet_id', title: '子网 ID' },
      { key: 'description', title: '描述' },
      { key: 'disable', title: '禁用', render: (v) => v ? '是' : '否' },
      { key: 'range', title: '地址池数', render: (v) => (v || []).length },
      { key: 'static_mapping', title: '静态映射数', render: (v) => (v || []).length },
    ];
    const rangeColumns = [
      { key: 'name', title: '名称' },
      { key: 'start', title: '起始' },
      { key: 'stop', title: '结束' },
    ];
    const staticMappingColumns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
      { key: 'disable', title: '禁用', render: (v) => v ? '是' : '否' },
      { key: 'duid', title: 'DUID' },
      { key: 'ip_address', title: 'IP 地址' },
      { key: 'mac_address', title: 'MAC 地址' },
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
        if (validateIPv4(ip)) return alert(`监听地址 ${ip} 格式错误`);
      }
      const ha = config.value.high_availability || {};
      if (isPresent(ha.remote) && validateIPv4(ha.remote)) return alert('HA 远端地址格式错误');
      if (isPresent(ha.source_address) && validateIPv4(ha.source_address)) return alert('HA 源地址格式错误');
      for (const n of config.value.shared_networks || []) {
        if (!n.name) return alert('共享网络名称不能为空');
        for (const s of n.subnets || []) {
          if (!s.subnet) return alert(`共享网络 ${n.name} 的子网不能为空`);
          const err = validateCIDR(s.subnet);
          if (err) return alert(`共享网络 ${n.name} 子网 ${s.subnet}: ${err}`);
          for (const r of s.range || []) {
            if (!r.name) return alert('地址池名称不能为空');
            if (validateIPv4(r.start) || validateIPv4(r.stop)) return alert(`地址池 ${r.name}: IP 格式错误`);
          }
          for (const m of s.static_mapping || []) {
            if (!m.name) return alert('静态映射名称不能为空');
            if (m.ip_address && validateIPv4(m.ip_address)) return alert(`静态映射 ${m.name}: IP 格式错误`);
            if (m.mac_address && validateMAC(m.mac_address)) return alert(`静态映射 ${m.name}: MAC 格式错误`);
          }
        }
      }

      saving.value = true;
      try {
        await configApi.set('service dhcp-server', dhcpServerToConfig(config.value));
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
      if (!selectedSharedNetwork.value.length) return alert('请选择要编辑的共享网络');
      const row = (config.value.shared_networks || []).find(n => n.name === selectedSharedNetwork.value[0]);
      if (!row) return alert('未找到选中的共享网络');
      editingSharedNetwork.value = JSON.parse(JSON.stringify(row));
      sharedNetworkActiveTab.value = 'basic';
      showSharedNetworkModal.value = true;
    }
    function removeSharedNetwork() {
      if (!selectedSharedNetwork.value.length) return alert('请选择要删除的共享网络');
      config.value.shared_networks = (config.value.shared_networks || []).filter(n => n.name !== selectedSharedNetwork.value[0]);
      selectedSharedNetwork.value = [];
    }
    function saveSharedNetwork() {
      const err = validateName(editingSharedNetwork.value.name);
      if (err) return alert(err);
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
      if (!selectedSubnet.value.length) return alert('请选择要编辑的子网');
      const row = (editingSharedNetwork.value.subnets || []).find(s => s.subnet === selectedSubnet.value[0]);
      if (!row) return alert('未找到选中的子网');
      editingSubnet.value = JSON.parse(JSON.stringify(row));
      showSubnetModal.value = true;
    }
    function removeSubnet() {
      if (!selectedSubnet.value.length) return alert('请选择要删除的子网');
      editingSharedNetwork.value.subnets = (editingSharedNetwork.value.subnets || []).filter(s => s.subnet !== selectedSubnet.value[0]);
      selectedSubnet.value = [];
    }
    function saveSubnet() {
      if (!editingSubnet.value.subnet) return alert('请输入子网');
      const err = validateCIDR(editingSubnet.value.subnet);
      if (err) return alert(err);
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
      if (!selectedRange.value.length) return alert('请选择要编辑的地址池');
      const row = (editingSubnet.value.range || []).find(r => r.name === selectedRange.value[0]);
      if (!row) return alert('未找到选中的地址池');
      editingRange.value = { ...row };
      showRangeModal.value = true;
    }
    function removeRange() {
      if (!selectedRange.value.length) return alert('请选择要删除的地址池');
      editingSubnet.value.range = (editingSubnet.value.range || []).filter(r => r.name !== selectedRange.value[0]);
      selectedRange.value = [];
    }
    function saveRange() {
      if (!editingRange.value.name) return alert('请输入地址池名称');
      if (editingRange.value.start && validateIPv4(editingRange.value.start)) return alert('起始 IP 格式错误');
      if (editingRange.value.stop && validateIPv4(editingRange.value.stop)) return alert('结束 IP 格式错误');
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
      if (!selectedStaticMapping.value.length) return alert('请选择要编辑的静态映射');
      const row = (editingSubnet.value.static_mapping || []).find(m => m.name === selectedStaticMapping.value[0]);
      if (!row) return alert('未找到选中的静态映射');
      editingStaticMapping.value = { ...row };
      showStaticMappingModal.value = true;
    }
    function removeStaticMapping() {
      if (!selectedStaticMapping.value.length) return alert('请选择要删除的静态映射');
      editingSubnet.value.static_mapping = (editingSubnet.value.static_mapping || []).filter(m => m.name !== selectedStaticMapping.value[0]);
      selectedStaticMapping.value = [];
    }
    function saveStaticMapping() {
      if (!editingStaticMapping.value.name) return alert('请输入静态映射名称');
      if (editingStaticMapping.value.ip_address && validateIPv4(editingStaticMapping.value.ip_address)) return alert('IP 格式错误');
      if (editingStaticMapping.value.mac_address && validateMAC(editingStaticMapping.value.mac_address)) return alert('MAC 格式错误');
      const list = editingSubnet.value.static_mapping || [];
      const idx = list.findIndex(m => m._name === editingStaticMapping.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingStaticMapping.value });
      else list.push({ ...editingStaticMapping.value });
      editingSubnet.value.static_mapping = list;
      showStaticMappingModal.value = false;
    }

    onMounted(() => {
      load();
    });

    return {
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
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'ha', title: '高可用性' },
        { key: 'shared-networks', title: '共享网络' }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="config.disable" title="禁用 DHCP 服务器实例" /></div>
        <div class="form-row"><label class="form-label">动态 DNS 更新</label><input type="checkbox" v-model="config.dynamic_dns_update" title="根据 RFC4702 动态更新 DNS" /></div>
        <div class="form-row"><label class="form-label">更新 /etc/hosts</label><input type="checkbox" v-model="config.hostfile_update" title="根据客户端租约更新 /etc/hosts" /></div>
        <div class="form-row"><label class="form-label">监听地址</label>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <select class="form-control" @change="appendListenAddress($event.target.value); $event.target.value = ''" title="选择接口上的 IPv4 地址追加到下方">
              <option value="">选择预设地址追加</option>
              <option v-for="addr in listenAddressOptions" :key="addr" :value="addr">{{ addr }}</option>
            </select>
            <textarea class="form-control" v-model="config.listen_address" rows="3" placeholder="每行一个 IPv4 监听地址，也可手动输入" title="本地 IPv4 监听地址" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">监听接口</label>
          <select class="form-control" v-model="config.listen_interface" title="监听接口">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </template>

      <template #ha>
        <div class="form-row"><label class="form-label">模式</label>
          <select class="form-control" v-model="config.high_availability.mode" title="高可用性模式，默认 active-active">
            <option v-for="o in HA_MODE_OPTIONS" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">对端名称</label><input class="form-control" v-model="config.high_availability.name" title="用于标识连接的对等名称" /></div>
        <div class="form-row"><label class="form-label">远端地址</label><input class="form-control" v-model="config.high_availability.remote" placeholder="x.x.x.x" title="高可用性对等 IPv4 地址" /></div>
        <div class="form-row"><label class="form-label">源地址</label><input class="form-control" v-model="config.high_availability.source_address" placeholder="x.x.x.x" title="发起连接使用的 IPv4 源地址" /></div>
        <div class="form-row"><label class="form-label">状态层级</label><input class="form-control" v-model="config.high_availability.status" title="高可用性层级状态" /></div>
        <div class="form-row"><label class="form-label">CA 证书</label><input class="form-control" v-model="config.high_availability.ca_certificate" title="PKI 中的 CA 证书名称" /></div>
        <div class="form-row"><label class="form-label">证书</label><input class="form-control" v-model="config.high_availability.certificate" title="PKI 中的证书名称" /></div>
      </template>

      <template #shared-networks>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createSharedNetwork">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editSharedNetwork" :disabled="!selectedSharedNetwork.length || selectedSharedNetwork.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeSharedNetwork" :disabled="!selectedSharedNetwork.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="sharedNetworkColumns" :data="config.shared_networks" row-key="name" :externalToolbar="true" @selection-change="selectedSharedNetwork = $event" :selectable="true" />
      </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showSharedNetworkModal" title="共享网络" width="780" @confirm="saveSharedNetwork" @close="showSharedNetworkModal = false">
        <TabGroup v-model="sharedNetworkActiveTab" :tabs="[
          { key: 'basic', title: '基本' },
          { key: 'subnets', title: '子网' },
          { key: 'options', title: '选项' }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingSharedNetwork.name" :disabled="editingSharedNetwork._name" title="共享网络名称" /></div>
            <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingSharedNetwork.description" title="描述" /></div>
            <div class="form-row"><label class="form-label">权威</label><input type="checkbox" v-model="editingSharedNetwork.authoritative" title="使 DHCP 服务器对该物理网络具有权威性" /></div>
            <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingSharedNetwork.disable" title="禁用该共享网络" /></div>
          </template>

          <template #subnets>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createSubnet">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editSubnet" :disabled="!selectedSubnet.length || selectedSubnet.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeSubnet" :disabled="!selectedSubnet.length">删除</ToolbarButton>
            </div>
            <DataTable :columns="subnetColumns" :data="editingSharedNetwork.subnets" row-key="subnet" :externalToolbar="true" @selection-change="selectedSubnet = $event" :selectable="true" />
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingSharedNetwork.option" />
          </template>
        </TabGroup>
      </DraggableModal>

      <DraggableModal v-model:visible="showSubnetModal" title="子网" width="780" @confirm="saveSubnet" @close="showSubnetModal = false">
        <TabGroup :tabs="[
          { key: 'basic', title: '基本' },
          { key: 'ranges', title: '地址池' },
          { key: 'mappings', title: '静态映射' },
          { key: 'options', title: '选项' }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">子网</label><input class="form-control" v-model="editingSubnet.subnet" :disabled="editingSubnet._subnet" placeholder="x.x.x.x/x" title="子网 CIDR" /></div>
            <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingSubnet.description" title="描述" /></div>
            <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingSubnet.disable" title="禁用该子网" /></div>
            <div class="form-row"><label class="form-label">子网 ID</label><input type="number" min="0" max="4294967295" class="form-control" v-model="editingSubnet.subnet_id" placeholder="0-4294967295" title="唯一子网 ID（0-4294967295）" /></div>
            <div class="form-row"><label class="form-label">忽略客户端 ID</label><input type="checkbox" v-model="editingSubnet.ignore_client_id" title="在租约查找时忽略客户端标识符" /></div>
            <div class="form-row"><label class="form-label">租约时间</label><input type="number" min="1" class="form-control" v-model="editingSubnet.lease" placeholder="秒，默认 86400" title="租约超时时间（秒，默认 86400）" /></div>
            <div class="form-row"><label class="form-label">排除地址</label><textarea class="form-control" v-model="editingSubnet.exclude" rows="2" placeholder="每行一个要排除的 IPv4 地址" title="从 DHCP 租约范围中排除的 IP 地址" /></div>
            <div class="form-row"><label class="form-label">默认路由器</label><textarea class="form-control" v-model="editingSubnet.default_router" rows="2" placeholder="每行一个 IPv4 地址" title="默认路由器 IP 地址" /></div>
            <div class="form-row"><label class="form-label">域名</label><input class="form-control" v-model="editingSubnet.domain_name" title="客户端域名" /></div>
            <div class="form-row"><label class="form-label">域名搜索列表</label><textarea class="form-control" v-model="editingSubnet.domain_search" rows="2" placeholder="每行一个域名" title="域名搜索列表" /></div>
            <div class="form-row"><label class="form-label">DNS 服务器</label><textarea class="form-control" v-model="editingSubnet.name_server" rows="2" placeholder="每行一个 IPv4 地址" title="域名服务器地址" /></div>
            <div class="form-row"><label class="form-label">NTP 服务器</label><textarea class="form-control" v-model="editingSubnet.ntp_server" rows="2" placeholder="每行一个 IPv4 地址" title="NTP 服务器地址" /></div>
          </template>

          <template #ranges>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createRange">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editRange" :disabled="!selectedRange.length || selectedRange.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeRange" :disabled="!selectedRange.length">删除</ToolbarButton>
            </div>
            <DataTable :columns="rangeColumns" :data="editingSubnet.range" row-key="name" :externalToolbar="true" @selection-change="selectedRange = $event" :selectable="true" />
          </template>

          <template #mappings>
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createStaticMapping">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editStaticMapping" :disabled="!selectedStaticMapping.length || selectedStaticMapping.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeStaticMapping" :disabled="!selectedStaticMapping.length">删除</ToolbarButton>
            </div>
            <DataTable :columns="staticMappingColumns" :data="editingSubnet.static_mapping" row-key="name" :externalToolbar="true" @selection-change="selectedStaticMapping = $event" :selectable="true" />
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingSubnet.option" />
          </template>
        </TabGroup>
      </DraggableModal>

      <DraggableModal v-model:visible="showRangeModal" title="地址池" @confirm="saveRange" @close="showRangeModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingRange.name" :disabled="editingRange._name" title="地址池名称" /></div>
        <div class="form-row"><label class="form-label">起始地址</label><input class="form-control" v-model="editingRange.start" placeholder="x.x.x.x" title="起始 IPv4 地址" /></div>
        <div class="form-row"><label class="form-label">结束地址</label><input class="form-control" v-model="editingRange.stop" placeholder="x.x.x.x" title="结束 IPv4 地址" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showStaticMappingModal" title="静态映射" width="780" @confirm="saveStaticMapping" @close="showStaticMappingModal = false">
        <TabGroup :tabs="[
          { key: 'basic', title: '基本' },
          { key: 'options', title: '选项' }
        ]">
          <template #basic>
            <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingStaticMapping.name" :disabled="editingStaticMapping._name" title="静态映射名称" /></div>
            <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingStaticMapping.description" title="描述" /></div>
            <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingStaticMapping.disable" title="禁用该静态映射" /></div>
            <div class="form-row"><label class="form-label">DUID</label><input class="form-control" v-model="editingStaticMapping.duid" placeholder="xx:xx:xx:xx:xx:xx:xx:xx" title="客户端 DHCP 唯一标识符" /></div>
            <div class="form-row"><label class="form-label">IP 地址</label><input class="form-control" v-model="editingStaticMapping.ip_address" placeholder="x.x.x.x" title="静态 IP 地址" /></div>
            <div class="form-row"><label class="form-label">MAC 地址</label><input class="form-control" v-model="editingStaticMapping.mac_address" placeholder="aa:bb:cc:dd:ee:ff" title="MAC 地址" /></div>
          </template>

          <template #options>
            <DhcpOptionForm v-model="editingStaticMapping.option" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
