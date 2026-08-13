import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

// Constants moved inside setup() for i18n access

function normalizeDistance(value) {
  if (value === '' || value === null || value === undefined) return 1;
  const n = parseInt(value, 10);
  return isNaN(n) ? 1 : n;
}

function configRoutesToForm(raw, ipv6 = false) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  for (const [destination, entry] of Object.entries(raw)) {
    const description = entry.description || '';
    if (entry['next-hop']) {
      for (const [address, attrs] of Object.entries(entry['next-hop'])) {
        let bfd_mode = 'none';
        let bfd_profile = '';
        let bfd_multi_hop_source = '';
        let bfd_multi_hop_profile = '';
        if (attrs.bfd) {
          if (attrs.bfd.profile) {
            bfd_mode = 'profile';
            bfd_profile = attrs.bfd.profile;
          } else if (attrs.bfd['multi-hop']) {
            bfd_mode = 'multi-hop';
            const source = attrs.bfd['multi-hop'].source;
            if (typeof source === 'string') {
              bfd_multi_hop_source = source;
              bfd_multi_hop_profile = attrs.bfd['multi-hop'].profile || '';
            } else if (source && typeof source === 'object') {
              const sources = Object.keys(source);
              if (sources.length) {
                bfd_multi_hop_source = sources[0];
                bfd_multi_hop_profile = source[sources[0]].profile || '';
              }
            }
          }
        }
        result.push({
          destination,
          description,
          type: 'next-hop',
          value: address,
          outbound_interface: attrs.interface || '',
          distance: normalizeDistance(attrs.distance),
          tag: attrs.tag || '',
          disable: !!attrs.disable,
          bfd: bfd_mode !== 'none',
          bfd_mode,
          bfd_profile,
          bfd_multi_hop_source,
          bfd_multi_hop_profile,
          segments: attrs.segments || '',
          vrf: attrs.vrf || '',
        });
      }
    }
    if (entry.interface) {
      for (const [name, attrs] of Object.entries(entry.interface)) {
        result.push({
          destination,
          description,
          type: 'interface',
          value: name,
          outbound_interface: '',
          distance: normalizeDistance(attrs.distance),
          tag: attrs.tag || '',
          disable: !!attrs.disable,
          bfd: false,
          vrf: attrs.vrf || '',
        });
      }
    }
    if (entry['dhcp-interface']) {
      result.push({
        destination,
        description,
        type: 'dhcp-interface',
        value: entry['dhcp-interface'],
        outbound_interface: '',
        distance: 1,
        tag: '',
        disable: false,
        bfd: false,
        vrf: '',
      });
    }
    if (entry.blackhole) {
      result.push({
        destination,
        description,
        type: 'blackhole',
        value: '',
        outbound_interface: '',
        distance: normalizeDistance(entry.blackhole.distance),
        tag: entry.blackhole.tag || '',
        disable: false,
        bfd: false,
        vrf: '',
      });
    }
    if (entry.reject) {
      result.push({
        destination,
        description,
        type: 'reject',
        value: '',
        outbound_interface: '',
        distance: normalizeDistance(entry.reject.distance),
        tag: entry.reject.tag || '',
        disable: false,
        bfd: false,
        vrf: '',
      });
    }
  }
  return result;
}

function formRoutesToConfig(list, ipv6 = false) {
  const result = {};
  for (const item of list) {
    const entry = result[item.destination] || {};
    if (item.description && !entry.description) entry.description = item.description;
    if (item.type === 'next-hop') {
      if (!entry['next-hop']) entry['next-hop'] = {};
      const attrs = {};
      if (item.outbound_interface) attrs.interface = item.outbound_interface;
      if (item.distance !== 1) attrs.distance = String(item.distance);
      if (item.tag) attrs.tag = String(item.tag);
      if (item.disable) attrs.disable = '';
      if (item.bfd_mode === 'profile' && item.bfd_profile) {
        attrs.bfd = { profile: item.bfd_profile };
      } else if (item.bfd_mode === 'multi-hop' && item.bfd_multi_hop_source) {
        attrs.bfd = {
          'multi-hop': {
            source: { [item.bfd_multi_hop_source]: { profile: item.bfd_multi_hop_profile || '' } }
          }
        };
      }
      if (item.segments) {
        const segments = String(item.segments).trim();
        if (segments) attrs.segments = segments;
      }
      if (item.vrf) attrs.vrf = item.vrf;
      entry['next-hop'][item.value] = attrs;
    } else if (item.type === 'interface') {
      if (!entry.interface) entry.interface = {};
      const attrs = {};
      if (item.distance !== 1) attrs.distance = String(item.distance);
      if (item.tag) attrs.tag = String(item.tag);
      if (item.disable) attrs.disable = '';
      if (item.vrf) attrs.vrf = item.vrf;
      entry.interface[item.value] = attrs;
    } else if (item.type === 'dhcp-interface') {
      entry['dhcp-interface'] = item.value;
    } else if (item.type === 'blackhole') {
      const attrs = {};
      if (item.distance !== 1) attrs.distance = String(item.distance);
      if (item.tag) attrs.tag = String(item.tag);
      entry.blackhole = attrs;
    } else if (item.type === 'reject') {
      const attrs = {};
      if (item.distance !== 1) attrs.distance = String(item.distance);
      if (item.tag) attrs.tag = String(item.tag);
      entry.reject = attrs;
    }
    result[item.destination] = entry;
  }
  return result;
}

function configTablesToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  for (const [tableNumber, entry] of Object.entries(raw)) {
    result.push({
      table_number: tableNumber,
      description: entry.description || '',
      route: configRoutesToForm(entry.route, false),
      route6: configRoutesToForm(entry.route6, true),
    });
  }
  return result;
}

function formTablesToConfig(list) {
  const result = {};
  for (const item of list) {
    const entry = {};
    if (item.description) entry.description = item.description;
    const route = formRoutesToConfig(item.route, false);
    if (Object.keys(route).length) entry.route = route;
    const route6 = formRoutesToConfig(item.route6, true);
    if (Object.keys(route6).length) entry.route6 = route6;
    result[item.table_number] = entry;
  }
  return result;
}

function configArpToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  const interfaces = raw.interface || {};
  for (const [iface, ifaceData] of Object.entries(interfaces)) {
    const addresses = ifaceData.address || {};
    for (const [address, attrs] of Object.entries(addresses)) {
      result.push({
        interface: iface,
        address,
        mac: attrs.mac || '',
        description: attrs.description || '',
      });
    }
  }
  return result;
}

function formArpToConfig(list) {
  const result = { interface: {} };
  for (const item of list) {
    if (!result.interface[item.interface]) result.interface[item.interface] = { address: {} };
    const attrs = {};
    if (item.mac) attrs.mac = item.mac;
    if (item.description) attrs.description = item.description;
    result.interface[item.interface].address[item.address] = attrs;
  }
  return result;
}

function extractInterfaces(data) {
  if (!data || !data.interface) return [];
  if (Array.isArray(data.interface)) return data.interface;
  if (typeof data.interface === 'object') return Object.keys(data.interface);
  return [data.interface];
}

function configNeighborProxyToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  if (raw.arp) {
    for (const [address, data] of Object.entries(raw.arp)) {
      for (const iface of extractInterfaces(data)) {
        result.push({ type: 'arp', address, interface: iface });
      }
    }
  }
  if (raw.nd) {
    for (const [address, data] of Object.entries(raw.nd)) {
      for (const iface of extractInterfaces(data)) {
        result.push({ type: 'nd', address, interface: iface });
      }
    }
  }
  return result;
}

function formNeighborProxyToConfig(list) {
  const result = {};
  for (const item of list) {
    if (!result[item.type]) result[item.type] = {};
    if (!result[item.type][item.address]) result[item.type][item.address] = { interface: {} };
    result[item.type][item.address].interface[item.interface] = {};
  }
  return result;
}

function configMulticastToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  if (raw['interface-route']) {
    for (const destination of Object.keys(raw['interface-route'])) {
      result.push({ type: 'interface-route', destination });
    }
  }
  if (raw.route) {
    for (const destination of Object.keys(raw.route)) {
      result.push({ type: 'route', destination });
    }
  }
  return result;
}

function formMulticastToConfig(list) {
  const result = {};
  for (const item of list) {
    if (!result[item.type]) result[item.type] = {};
    result[item.type][item.destination] = {};
  }
  return result;
}

function configToForm(raw) {
  return {
    route: configRoutesToForm(raw?.route, false),
    route6: configRoutesToForm(raw?.route6, true),
    arp: configArpToForm(raw?.arp),
    neighbor_proxy: configNeighborProxyToForm(raw?.['neighbor-proxy']),
    multicast: configMulticastToForm(raw?.multicast),
    route_map: raw?.['route-map'] || '',
    tables: configTablesToForm(raw?.table),
  };
}

function formToConfig(form) {
  const result = {};
  const route = formRoutesToConfig(form.route, false);
  if (Object.keys(route).length) result.route = route;
  const route6 = formRoutesToConfig(form.route6, true);
  if (Object.keys(route6).length) result.route6 = route6;
  const arp = formArpToConfig(form.arp);
  if (Object.keys(arp.interface).length) result.arp = arp;
  const np = formNeighborProxyToConfig(form.neighbor_proxy);
  if (Object.keys(np).length) result['neighbor-proxy'] = np;
  const mc = formMulticastToConfig(form.multicast);
  if (Object.keys(mc).length) result.multicast = mc;
  if (form.route_map) result['route-map'] = form.route_map;
  const tables = formTablesToConfig(form.tables || []);
  if (Object.keys(tables).length) result.table = tables;
  return result;
}

function newRoute(ipv6 = false) {
  return {
    destination: '',
    description: '',
    type: 'next-hop',
    value: '',
    outbound_interface: '',
    distance: 1,
    tag: '',
    disable: false,
    bfd: false,
    bfd_mode: 'none',
    bfd_profile: '',
    bfd_multi_hop_source: '',
    bfd_multi_hop_profile: '',
    segments: '',
    vrf: '',
  };
}

function newArp() {
  return { interface: '', address: '', mac: '', description: '' };
}

function newNeighborProxy() {
  return { type: 'arp', address: '', interface: '' };
}

function newMulticast() {
  return { type: 'interface-route', destination: '' };
}

function newTable() {
  return { table_number: '', description: '', route: [], route6: [] };
}

export default defineComponent({
  name: 'StaticRoutePage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm({}));
    const activeTab = ref('route');
    const interfaces = ref([]);
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    // Validation functions with i18n
    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('validation.ipv4Format');
      return '';
    }

    function validateIPv4CIDR(value) {
      if (!value) return t('validation.networkRequired');
      const parts = value.split('/');
      if (parts.length !== 2) return t('validation.networkFormat');
      const err = validateIPv4(parts[0]);
      if (err) return err;
      const mask = parseInt(parts[1], 10);
      if (isNaN(mask) || mask < 0 || mask > 32) return t('validation.prefixLengthRange');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      if (!/^([0-9a-fA-F:]+)(\/\d{1,3})?$/.test(value)) return t('validation.ipv6Format');
      return '';
    }

    function validateIPv6CIDR(value) {
      if (!value) return t('validation.networkRequired');
      const parts = value.split('/');
      if (parts.length !== 2) return t('validation.ipv6NetworkFormat');
      const err = validateIPv6(parts[0]);
      if (err) return err;
      const mask = parseInt(parts[1], 10);
      if (isNaN(mask) || mask < 0 || mask > 128) return t('validation.ipv6PrefixLengthRange');
      return '';
    }

    function validateMAC(value) {
      if (!value) return '';
      if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(value)) return t('validation.macFormat');
      return '';
    }

    function validateDistance(value) {
      if (value === '' || value === null || value === undefined) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 255) return t('validation.distanceRange');
      return '';
    }

    function validateTag(value) {
      if (value === '' || value === null || value === undefined) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 4294967295) return t('validation.tagRange');
      return '';
    }

    function validateBFDSource(value) {
      if (!value) return t('validation.sourceRequired');
      const ipv4Err = validateIPv4(value);
      const ipv6Err = validateIPv6(value);
      if (ipv4Err && ipv6Err) return t('validation.sourceFormat');
      return '';
    }

    function validateSegments(value) {
      if (!value) return '';
      const trimmed = String(value).trim();
      if (!trimmed) return t('validation.segmentsRequired');
      return '';
    }

    // Constants with i18n
    const ROUTE_TYPES = computed(() => [
      { value: 'next-hop', label: t('routing.static.routeType.nextHop') },
      { value: 'interface', label: t('routing.static.routeType.interface') },
      { value: 'blackhole', label: t('routing.static.routeType.blackhole') },
      { value: 'reject', label: t('routing.static.routeType.reject') },
      { value: 'dhcp-interface', label: t('routing.static.routeType.dhcpInterface') },
    ]);

    const ROUTE_TYPE_LABELS = computed(() => Object.fromEntries(ROUTE_TYPES.value.map(t => [t.value, t.label])));

    const BFD_MODES = computed(() => [
      { value: 'none', label: t('routing.static.bfdMode.none') },
      { value: 'profile', label: 'BFD Profile' },
      { value: 'multi-hop', label: 'BFD Multi-hop' },
    ]);

    const routeColumns = computed(() => [
      { key: 'destination', title: t('routing.static.col.destination') },
      { key: 'type', title: t('routing.static.col.type'), render: v => ROUTE_TYPE_LABELS.value[v] || v },
      { key: 'value', title: t('routing.static.col.value'), render: v => v || '-' },
      { key: 'distance', title: t('routing.static.col.distance') },
      { key: 'tag', title: t('routing.static.col.tag'), render: v => v || '-' },
      { key: 'outbound_interface', title: t('routing.static.col.outboundInterface'), render: v => v || '-' },
      { key: 'vrf', title: 'VRF', render: v => v || '-' },
      { key: 'disable', title: t('routing.static.col.disable'), render: v => v ? t('common.yes') : t('common.no') },
      { key: 'bfd_mode', title: 'BFD', render: v => {
        if (!v || v === 'none') return '-';
        if (v === 'profile') return 'Profile';
        if (v === 'multi-hop') return 'Multi-hop';
        return v;
      }},
      { key: 'bfd_profile', title: 'BFD Profile', render: v => v || '-' },
      { key: 'description', title: t('routing.static.col.description'), render: v => v || '-' },
    ]);

    const arpColumns = computed(() => [
      { key: 'interface', title: t('routing.static.col.interface') },
      { key: 'address', title: t('routing.static.col.ipAddress') },
      { key: 'mac', title: t('routing.static.col.macAddress') },
      { key: 'description', title: t('routing.static.col.description') },
    ]);

    const neighborProxyColumns = computed(() => [
      { key: 'type', title: t('routing.static.col.type'), render: v => v === 'nd' ? 'ND' : 'ARP' },
      { key: 'address', title: t('routing.static.col.address') },
      { key: 'interface', title: t('routing.static.col.interface') },
    ]);

    const multicastColumns = computed(() => [
      { key: 'type', title: t('routing.static.col.type'), render: v => v === 'route' ? t('routing.static.multicastType.mribUnicast') : t('routing.static.multicastType.interfaceRoute') },
      { key: 'destination', title: t('routing.static.col.destination') },
    ]);

    const tableColumns = computed(() => [
      { key: 'table_number', title: t('routing.static.col.tableNumber') },
      { key: 'description', title: t('routing.static.col.description'), render: v => v || '-' },
      { key: 'route', title: t('routing.static.col.ipv4RouteCount'), render: v => (v || []).length },
      { key: 'route6', title: t('routing.static.col.ipv6RouteCount'), render: v => (v || []).length },
    ]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('protocols static');
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function validateRoute(item, ipv6 = false) {
      const validateCIDR = ipv6 ? validateIPv6CIDR : validateIPv4CIDR;
      let err = validateCIDR(item.destination);
      if (err) return err;
      if (item.type === 'next-hop') {
        err = ipv6 ? validateIPv6(item.value) : validateIPv4(item.value);
        if (err) return t('routing.static.error.nextHop') + err;
        if (item.bfd_mode === 'profile') {
          if (!item.bfd_profile) return t('routing.static.error.bfdProfileRequired');
        } else if (item.bfd_mode === 'multi-hop') {
          err = validateBFDSource(item.bfd_multi_hop_source);
          if (err) return 'BFD ' + err;
        }
        if (ipv6) {
          err = validateSegments(item.segments);
          if (err) return err;
        }
      } else if (item.type === 'interface' || item.type === 'dhcp-interface') {
        if (!item.value) return t('routing.static.error.interfaceRequired');
      }
      err = validateDistance(item.distance);
      if (err) return err;
      if (item.type === 'blackhole' || item.type === 'reject') {
        err = validateTag(item.tag);
        if (err) return err;
      }
      return '';
    }

    function validateArp(item) {
      if (!item.interface) return t('routing.static.error.interfaceRequired');
      const err = validateIPv4(item.address);
      if (err) return 'IP' + err;
      if (item.mac) {
        const macErr = validateMAC(item.mac);
        if (macErr) return macErr;
      }
      return '';
    }

    function validateNeighborProxy(item) {
      if (!item.interface) return t('routing.static.error.interfaceRequired');
      const err = item.type === 'nd' ? validateIPv6(item.address) : validateIPv4(item.address);
      if (err) return t('routing.static.error.address') + err;
      return '';
    }

    function validateMulticast(item) {
      return validateIPv4CIDR(item.destination);
    }

    function validateTable(value) {
      if (!value) return t('routing.static.error.tableNumberRequired');
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 200) return t('routing.static.error.tableNumberRange');
      return '';
    }

    async function save() {
      for (const item of config.value.route) {
        const err = validateRoute(item, false);
        if (err) return showError({ message: t('routing.static.error.ipv4Route', { destination: item.destination || t('common.unnamed') }) + ': ' + err });
      }
      for (const item of config.value.route6) {
        const err = validateRoute(item, true);
        if (err) return showError({ message: t('routing.static.error.ipv6Route', { destination: item.destination || t('common.unnamed') }) + ': ' + err });
      }
      for (const item of config.value.arp) {
        const err = validateArp(item);
        if (err) return showError({ message: t('routing.static.error.staticArp', { address: item.address || t('common.unnamed') }) + ': ' + err });
      }
      for (const item of config.value.neighbor_proxy) {
        const err = validateNeighborProxy(item);
        if (err) return showError({ message: 'Neighbor Proxy ' + (item.address || t('common.unnamed')) + ': ' + err });
      }
      for (const item of config.value.multicast) {
        const err = validateMulticast(item);
        if (err) return showError({ message: t('routing.static.error.multicastRoute', { destination: item.destination || t('common.unnamed') }) + ': ' + err });
      }
      for (const item of config.value.tables) {
        const err = validateTable(item.table_number);
        if (err) return showError({ message: t('routing.static.error.policyTable', { number: item.table_number || t('common.unnamed') }) + ': ' + err });
        for (const r of item.route) {
          const rerr = validateRoute(r, false);
          if (rerr) return showError({ message: t('routing.static.error.policyTableIpv4Route', { number: item.table_number, destination: r.destination || t('common.unnamed') }) + ': ' + rerr });
        }
        for (const r of item.route6) {
          const rerr = validateRoute(r, true);
          if (rerr) return showError({ message: t('routing.static.error.policyTableIpv6Route', { number: item.table_number, destination: r.destination || t('common.unnamed') }) + ': ' + rerr });
        }
      }

      saving.value = true;
      try {
        const payload = formToConfig(config.value);
        await configApi.set('protocols static', payload);
        configStore.markPending();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    // Route editing
    const routeSelection = ref([]);
    const routeModalVisible = ref(false);
    const editingRoute = ref(newRoute(false));
    const editingRouteIPv6 = ref(false);
    const routeModalContext = ref(null);

    function getRouteList(ipv6 = false, context = null) {
      if (!context) return ipv6 ? config.value.route6 : config.value.route;
      return ipv6 ? editingTable.value.route6 : editingTable.value.route;
    }
    function getRouteSelection(ipv6 = false, context = null) {
      if (!context) return ipv6 ? route6Selection.value : routeSelection.value;
      return ipv6 ? tableRoute6Selection.value : tableRouteSelection.value;
    }
    function clearRouteSelection(ipv6 = false, context = null) {
      const selection = getRouteSelection(ipv6, context);
      selection.length = 0;
    }

    function createRoute(ipv6 = false, context = null) {
      routeModalContext.value = context;
      editingRoute.value = newRoute(ipv6);
      editingRouteIPv6.value = ipv6;
      routeModalVisible.value = true;
    }
    function editRoute(ipv6 = false, context = null) {
      const selection = getRouteSelection(ipv6, context);
      const list = getRouteList(ipv6, context);
      if (!selection.length) return showError({ message: t('routing.static.error.selectRouteToEdit') });
      const idx = parseInt(selection[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= list.length) return showError({ message: t('routing.static.error.routeNotFound') });
      routeModalContext.value = context;
      editingRoute.value = { ...list[idx], _index: idx };
      editingRouteIPv6.value = ipv6;
      routeModalVisible.value = true;
    }
    function removeRoute(ipv6 = false, context = null) {
      const selection = getRouteSelection(ipv6, context);
      const list = getRouteList(ipv6, context);
      if (!selection.length) return showError({ message: t('routing.static.error.selectRouteToDelete') });
      const indices = selection.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) list.splice(idx, 1);
      selection.length = 0;
    }
    function saveRoute() {
      const err = validateRoute(editingRoute.value, editingRouteIPv6.value);
      if (err) return showError({ message: err });
      const ipv6 = editingRouteIPv6.value;
      const list = getRouteList(ipv6, routeModalContext.value);
      const item = { ...editingRoute.value };
      delete item._index;
      if (editingRoute.value._index !== undefined) {
        list.splice(editingRoute.value._index, 1, item);
      } else {
        list.push(item);
      }
      if (routeModalContext.value) {
        const key = ipv6 ? 'route6' : 'route';
        editingTable.value[key] = [...list];
      } else {
        const key = ipv6 ? 'route6' : 'route';
        config.value[key] = [...list];
      }
      routeModalVisible.value = false;
      routeModalContext.value = null;
    }

    // Route6 uses same modal but separate selection
    const route6Selection = ref([]);

    // ARP editing
    const arpSelection = ref([]);
    const arpModalVisible = ref(false);
    const editingArp = ref(newArp());

    function createArp() {
      editingArp.value = newArp();
      arpModalVisible.value = true;
    }
    function editArp() {
      if (!arpSelection.value.length) return showError({ message: t('routing.static.error.selectArpToEdit') });
      const idx = parseInt(arpSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.arp.length) return showError({ message: t('routing.static.error.arpNotFound') });
      editingArp.value = { ...config.value.arp[idx], _index: idx };
      arpModalVisible.value = true;
    }
    function removeArp() {
      if (!arpSelection.value.length) return showError({ message: t('routing.static.error.selectArpToDelete') });
      const indices = arpSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.arp.splice(idx, 1);
      arpSelection.value.length = 0;
    }
    function saveArp() {
      const err = validateArp(editingArp.value);
      if (err) return showError({ message: err });
      const item = { ...editingArp.value };
      delete item._index;
      if (editingArp.value._index !== undefined) {
        config.value.arp.splice(editingArp.value._index, 1, item);
      } else {
        config.value.arp.push(item);
      }
      config.value.arp = [...config.value.arp];
      arpModalVisible.value = false;
    }

    // Neighbor proxy editing
    const npSelection = ref([]);
    const npModalVisible = ref(false);
    const editingNp = ref(newNeighborProxy());

    function createNeighborProxy() {
      editingNp.value = newNeighborProxy();
      npModalVisible.value = true;
    }
    function editNeighborProxy() {
      if (!npSelection.value.length) return showError({ message: t('routing.static.error.selectNeighborProxyToEdit') });
      const idx = parseInt(npSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.neighbor_proxy.length) return showError({ message: t('routing.static.error.neighborProxyNotFound') });
      editingNp.value = { ...config.value.neighbor_proxy[idx], _index: idx };
      npModalVisible.value = true;
    }
    function removeNeighborProxy() {
      if (!npSelection.value.length) return showError({ message: t('routing.static.error.selectNeighborProxyToDelete') });
      const indices = npSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.neighbor_proxy.splice(idx, 1);
      npSelection.value.length = 0;
    }
    function saveNeighborProxy() {
      const err = validateNeighborProxy(editingNp.value);
      if (err) return showError({ message: err });
      const item = { ...editingNp.value };
      delete item._index;
      if (editingNp.value._index !== undefined) {
        config.value.neighbor_proxy.splice(editingNp.value._index, 1, item);
      } else {
        config.value.neighbor_proxy.push(item);
      }
      config.value.neighbor_proxy = [...config.value.neighbor_proxy];
      npModalVisible.value = false;
    }

    // Multicast editing
    const mcSelection = ref([]);
    const mcModalVisible = ref(false);
    const editingMc = ref(newMulticast());

    function createMulticast() {
      editingMc.value = newMulticast();
      mcModalVisible.value = true;
    }
    function editMulticast() {
      if (!mcSelection.value.length) return showError({ message: t('routing.static.error.selectMulticastToEdit') });
      const idx = parseInt(mcSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.multicast.length) return showError({ message: t('routing.static.error.multicastNotFound') });
      editingMc.value = { ...config.value.multicast[idx], _index: idx };
      mcModalVisible.value = true;
    }
    function removeMulticast() {
      if (!mcSelection.value.length) return showError({ message: t('routing.static.error.selectMulticastToDelete') });
      const indices = mcSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.multicast.splice(idx, 1);
      mcSelection.value.length = 0;
    }
    function saveMulticast() {
      const err = validateMulticast(editingMc.value);
      if (err) return showError({ message: err });
      const item = { ...editingMc.value };
      delete item._index;
      if (editingMc.value._index !== undefined) {
        config.value.multicast.splice(editingMc.value._index, 1, item);
      } else {
        config.value.multicast.push(item);
      }
      config.value.multicast = [...config.value.multicast];
      mcModalVisible.value = false;
    }

    // Table editing
    const tableSelection = ref([]);
    const tableModalVisible = ref(false);
    const editingTable = ref(newTable());
    const tableRouteSelection = ref([]);
    const tableRoute6Selection = ref([]);
    const tableActiveTab = ref('route');

    function createTable() {
      editingTable.value = newTable();
      tableRouteSelection.value.length = 0;
      tableRoute6Selection.value.length = 0;
      tableActiveTab.value = 'route';
      tableModalVisible.value = true;
    }
    function editTable() {
      if (!tableSelection.value.length) return showError({ message: t('routing.static.error.selectTableToEdit') });
      const idx = parseInt(tableSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.tables.length) return showError({ message: t('routing.static.error.tableNotFound') });
      editingTable.value = JSON.parse(JSON.stringify({ ...config.value.tables[idx], _index: idx }));
      tableRouteSelection.value.length = 0;
      tableRoute6Selection.value.length = 0;
      tableActiveTab.value = 'route';
      tableModalVisible.value = true;
    }
    function removeTable() {
      if (!tableSelection.value.length) return showError({ message: t('routing.static.error.selectTableToDelete') });
      const indices = tableSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.tables.splice(idx, 1);
      tableSelection.value.length = 0;
    }
    function saveTable() {
      const err = validateTable(editingTable.value.table_number);
      if (err) return showError({ message: err });
      const item = JSON.parse(JSON.stringify(editingTable.value));
      delete item._index;
      if (editingTable.value._index !== undefined) {
        config.value.tables.splice(editingTable.value._index, 1, item);
      } else {
        config.value.tables.push(item);
      }
      config.value.tables = [...config.value.tables];
      tableModalVisible.value = false;
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, interfaces, writeDisabled,
      routeColumns, routeSelection, routeModalVisible, editingRoute, editingRouteIPv6, routeModalContext,
      createRoute, editRoute, removeRoute, saveRoute,
      route6Selection,
      arpColumns, arpSelection, arpModalVisible, editingArp,
      createArp, editArp, removeArp, saveArp,
      neighborProxyColumns, npSelection, npModalVisible, editingNp,
      createNeighborProxy, editNeighborProxy, removeNeighborProxy, saveNeighborProxy,
      multicastColumns, mcSelection, mcModalVisible, editingMc,
      createMulticast, editMulticast, removeMulticast, saveMulticast,
      tableColumns, tableSelection, tableModalVisible, editingTable,
      tableRouteSelection, tableRoute6Selection, tableActiveTab,
      createTable, editTable, removeTable, saveTable,
      ROUTE_TYPES, ROUTE_TYPE_LABELS, BFD_MODES,
      save, load,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton },
  template: `
    <div class="page-section">
      <div v-if="saved" class="alert alert-success">{{ $t('msg.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'route', title: t('routing.static.tab.ipv4Route') },
        { key: 'route6', title: t('routing.static.tab.ipv6Route') },
        { key: 'arp', title: t('routing.static.tab.staticArp') },
        { key: 'neighbor-proxy', title: 'Neighbor Proxy' },
        { key: 'multicast', title: t('routing.static.tab.multicast') },
        { key: 'table', title: t('routing.static.tab.policyTable') },
        { key: 'advanced', title: t('routing.static.tab.advanced') },
      ]">
        <template #route>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRoute(false)" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRoute(false)" :disabled="writeDisabled || !routeSelection.length || routeSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRoute(false)" :disabled="writeDisabled || !routeSelection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="routeColumns" :data="config.route.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="routeSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #route6>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRoute(true)" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRoute(true)" :disabled="writeDisabled || !route6Selection.length || route6Selection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRoute(true)" :disabled="writeDisabled || !route6Selection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="routeColumns" :data="config.route6.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="route6Selection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #arp>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createArp" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editArp" :disabled="writeDisabled || !arpSelection.length || arpSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeArp" :disabled="writeDisabled || !arpSelection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="arpColumns" :data="config.arp.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="arpSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #neighbor-proxy>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createNeighborProxy" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editNeighborProxy" :disabled="writeDisabled || !npSelection.length || npSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeNeighborProxy" :disabled="writeDisabled || !npSelection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="neighborProxyColumns" :data="config.neighbor_proxy.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="npSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #multicast>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createMulticast" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editMulticast" :disabled="writeDisabled || !mcSelection.length || mcSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeMulticast" :disabled="writeDisabled || !mcSelection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="multicastColumns" :data="config.multicast.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="mcSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #table>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createTable" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editTable" :disabled="writeDisabled || !tableSelection.length || tableSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeTable" :disabled="writeDisabled || !tableSelection.length">{{ t('btn.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">{{ t('btn.refresh') }}</ToolbarButton>
          </div>
          <DataTable :columns="tableColumns" :data="config.tables.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #advanced>
          <div class="form-row">
            <label class="form-label">Route-map</label>
            <input class="form-control" v-model="config.route_map" :disabled="writeDisabled" :placeholder="t('routing.static.form.routeMapPlaceholder')" :title="t('routing.static.form.routeMapTitle')" />
          </div>
        </template>
      </TabGroup>

      <!-- Table Modal -->
      <DraggableModal v-model:visible="tableModalVisible" :title="t('routing.static.modal.policyTable')" width="1100px" @confirm="saveTable" @close="tableModalVisible = false">
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.tableNumber') }}</label>
          <div class="form-control">
            <input type="number" min="1" max="200" v-model="editingTable.table_number" :disabled="editingTable._index !== undefined" placeholder="1-200" :title="t('routing.static.form.tableNumberTitle')" />
            <div class="form-hint">{{ t('routing.static.form.tableNumberHint') }}</div>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.description') }}</label>
          <input class="form-control" v-model="editingTable.description" :placeholder="t('common.optional')" :title="t('routing.static.form.tableDescriptionTitle')" />
        </div>
        <div class="form-row" style="margin-top: 12px;">
          <TabGroup v-model="tableActiveTab" :tabs="[
            { key: 'route', title: t('routing.static.form.ipv4Route') },
            { key: 'route6', title: t('routing.static.form.ipv6Route') },
          ]" style="flex: 1;">
            <template #route>
              <div class="toolbar toolbar-compact">
                <ToolbarButton icon="create" @click="createRoute(false, true)" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRoute(false, true)" :disabled="writeDisabled || !tableRouteSelection.length || tableRouteSelection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRoute(false, true)" :disabled="writeDisabled || !tableRouteSelection.length">{{ t('btn.delete') }}</ToolbarButton>
              </div>
              <DataTable :columns="routeColumns" :data="editingTable.route.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableRouteSelection = $event" :selectable="true" />
            </template>
            <template #route6>
              <div class="toolbar toolbar-compact">
                <ToolbarButton icon="create" @click="createRoute(true, true)" :disabled="writeDisabled">{{ t('btn.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRoute(true, true)" :disabled="writeDisabled || !tableRoute6Selection.length || tableRoute6Selection.length > 1">{{ t('btn.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRoute(true, true)" :disabled="writeDisabled || !tableRoute6Selection.length">{{ t('btn.delete') }}</ToolbarButton>
              </div>
              <DataTable :columns="routeColumns" :data="editingTable.route6.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableRoute6Selection = $event" :selectable="true" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>

      <!-- ARP Modal -->
      <DraggableModal v-model:visible="arpModalVisible" :title="t('routing.static.modal.staticArp')" @confirm="saveArp" @close="arpModalVisible = false">
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.interface') }}</label>
          <select class="form-control" v-model="editingArp.interface">
            <option value="">-- {{ t('common.select') }} --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.ipAddress') }}</label>
          <input class="form-control" v-model="editingArp.address" placeholder="x.x.x.x" :title="t('routing.static.form.ipv4Destination')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.macAddress') }}</label>
          <input class="form-control" v-model="editingArp.mac" placeholder="aa:bb:cc:dd:ee:ff" :title="t('routing.static.form.hardwareMacAddress')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.description') }}</label>
          <input class="form-control" v-model="editingArp.description" :placeholder="t('common.optional')" :title="t('routing.static.form.description')" />
        </div>
      </DraggableModal>

      <!-- Neighbor Proxy Modal -->
      <DraggableModal v-model:visible="npModalVisible" title="Neighbor Proxy" @confirm="saveNeighborProxy" @close="npModalVisible = false">
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.type') }}</label>
          <select class="form-control" v-model="editingNp.type">
            <option value="arp">ARP</option>
            <option value="nd">ND</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.address') }}</label>
          <input class="form-control" v-model="editingNp.address" :placeholder="editingNp.type === 'nd' ? 'x:x:x:x::x' : 'x.x.x.x'" :title="editingNp.type === 'nd' ? t('routing.static.form.ipv6Destination') : t('routing.static.form.ipv4Destination')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.interface') }}</label>
          <select class="form-control" v-model="editingNp.interface">
            <option value="">-- {{ t('common.select') }} --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Multicast Modal -->
      <DraggableModal v-model:visible="mcModalVisible" :title="t('routing.static.modal.multicast')" @confirm="saveMulticast" @close="mcModalVisible = false">
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.type') }}</label>
          <select class="form-control" v-model="editingMc.type">
            <option value="interface-route">{{ t('routing.static.form.interfaceRoute') }}</option>
            <option value="route">{{ t('routing.static.form.mribUnicastRoute') }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.destinationNetwork') }}</label>
          <input class="form-control" v-model="editingMc.destination" placeholder="x.x.x.x/x" :title="t('routing.static.form.ipv4DestinationNetwork')" />
        </div>
      </DraggableModal>
      <!-- Route Modal -->
      <DraggableModal v-model:visible="routeModalVisible" :title="editingRouteIPv6 ? t('routing.static.modal.ipv6StaticRoute') : t('routing.static.modal.ipv4StaticRoute')" modal-class="on-top" @confirm="saveRoute" @close="routeModalVisible = false">
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.destinationNetwork') }}</label>
          <input class="form-control" v-model="editingRoute.destination" :disabled="editingRoute._index !== undefined" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x/x' : 'x.x.x.x/x'" :title="t('routing.static.form.destinationNetworkCidr')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.type') }}</label>
          <select class="form-control" v-model="editingRoute.type">
            <option v-for="opt in ROUTE_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">{{ t('routing.static.form.nextHopAddress') }}</label>
          <input class="form-control" v-model="editingRoute.value" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x' : 'x.x.x.x'" :title="t('routing.static.form.nextHopIpAddress')" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">{{ t('routing.static.form.outboundInterface') }} ({{ t('common.optional') }})</label>
          <select class="form-control" v-model="editingRoute.outbound_interface">
            <option value="">-- {{ t('common.select') }} --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'interface' || editingRoute.type === 'dhcp-interface'">
          <label class="form-label">{{ t('routing.static.form.interface') }}</label>
          <select class="form-control" v-model="editingRoute.value">
            <option value="">-- {{ t('common.select') }} --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type !== 'dhcp-interface'">
          <label class="form-label">{{ t('routing.static.form.distance') }}</label>
          <div class="form-control">
            <input type="number" min="1" max="255" v-model="editingRoute.distance" placeholder="1" :title="t('routing.static.form.distanceTitle')" />
            <div class="form-hint">{{ t('routing.static.form.distanceHint') }}</div>
          </div>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'blackhole' || editingRoute.type === 'reject'">
          <label class="form-label">{{ t('routing.static.form.tag') }}</label>
          <div class="form-control">
            <input type="number" min="0" max="4294967295" v-model="editingRoute.tag" :placeholder="t('common.optional')" :title="t('routing.static.form.tagTitle')" />
            <div class="form-hint">{{ t('routing.static.form.tagHint') }}</div>
          </div>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' || editingRoute.type === 'interface'">
          <label class="form-label">VRF</label>
          <input class="form-control" v-model="editingRoute.vrf" :placeholder="t('common.optional')" :title="t('routing.static.form.vrfTitle')" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' || editingRoute.type === 'interface'">
          <label class="form-label"><input type="checkbox" v-model="editingRoute.disable" /> {{ t('routing.static.form.disable') }}</label>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">BFD</label>
          <select class="form-control" v-model="editingRoute.bfd_mode">
            <option v-for="opt in BFD_MODES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'profile'">
          <label class="form-label">BFD Profile</label>
          <input class="form-control" v-model="editingRoute.bfd_profile" :placeholder="t('routing.static.form.bfdProfilePlaceholder')" :title="t('routing.static.form.bfdProfileTitle')" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'multi-hop'">
          <label class="form-label">{{ t('routing.static.form.sourceAddress') }}</label>
          <input class="form-control" v-model="editingRoute.bfd_multi_hop_source" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x' : 'x.x.x.x'" :title="t('routing.static.form.bfdSessionSourceAddress')" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'multi-hop'">
          <label class="form-label">BFD Profile</label>
          <input class="form-control" v-model="editingRoute.bfd_multi_hop_profile" :placeholder="t('routing.static.form.bfdProfilePlaceholder')" :title="t('routing.static.form.bfdProfileTitle')" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRouteIPv6">
          <label class="form-label">SRv6 Segments</label>
          <input class="form-control" v-model="editingRoute.segments" placeholder="Segments (SIDs)" title="SRv6 segments" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.static.form.description') }}</label>
          <input class="form-control" v-model="editingRoute.description" :placeholder="t('common.optional')" :title="t('routing.static.form.routeDescription')" />
        </div>
      </DraggableModal>
    </div>
  `,
});
