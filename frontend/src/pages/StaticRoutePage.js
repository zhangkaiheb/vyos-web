import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const ROUTE_TYPES = [
  { value: 'next-hop', label: '下一跳' },
  { value: 'interface', label: '出接口' },
  { value: 'blackhole', label: '黑洞' },
  { value: 'reject', label: '拒绝' },
  { value: 'dhcp-interface', label: 'DHCP接口' },
];

const ROUTE_TYPE_LABELS = Object.fromEntries(ROUTE_TYPES.map(t => [t.value, t.label]));

const BFD_MODES = [
  { value: 'none', label: '无' },
  { value: 'profile', label: 'BFD Profile' },
  { value: 'multi-hop', label: 'BFD Multi-hop' },
];

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv4CIDR(value) {
  if (!value) return '目标网络不能为空';
  const parts = value.split('/');
  if (parts.length !== 2) return '格式应为 x.x.x.x/x';
  const err = validateIPv4(parts[0]);
  if (err) return err;
  const mask = parseInt(parts[1], 10);
  if (isNaN(mask) || mask < 0 || mask > 32) return '掩码范围 0-32';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  if (!/^([0-9a-fA-F:]+)(\/\d{1,3})?$/.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIPv6CIDR(value) {
  if (!value) return '目标网络不能为空';
  const parts = value.split('/');
  if (parts.length !== 2) return '格式应为 x:x:x:x::x/x';
  const err = validateIPv6(parts[0]);
  if (err) return err;
  const mask = parseInt(parts[1], 10);
  if (isNaN(mask) || mask < 0 || mask > 128) return '掩码范围 0-128';
  return '';
}

function validateMAC(value) {
  if (!value) return '';
  if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(value)) return 'MAC 格式错误，如 aa:bb:cc:dd:ee:ff';
  return '';
}

function validateDistance(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return '距离范围 1-255';
  return '';
}

function validateTag(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 4294967295) return '标签范围 0-4294967295';
  return '';
}

function validateBFDSource(value) {
  if (!value) return 'Source 地址不能为空';
  const ipv4Err = validateIPv4(value);
  const ipv6Err = validateIPv6(value);
  if (ipv4Err && ipv6Err) return 'Source 地址格式错误';
  return '';
}

function validateSegments(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return 'Segments 不能为空';
  return '';
}

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
    const route = useRoute();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm({}));
    const activeTab = ref('route');
    const interfaces = ref([]);
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const routeColumns = [
      { key: 'destination', title: '目标网络' },
      { key: 'type', title: '类型', render: v => ROUTE_TYPE_LABELS[v] || v },
      { key: 'value', title: '值', render: v => v || '-' },
      { key: 'distance', title: '距离' },
      { key: 'tag', title: '标签', render: v => v || '-' },
      { key: 'outbound_interface', title: '出接口', render: v => v || '-' },
      { key: 'vrf', title: 'VRF', render: v => v || '-' },
      { key: 'disable', title: '禁用', render: v => v ? '是' : '否' },
      { key: 'bfd_mode', title: 'BFD', render: v => {
        if (!v || v === 'none') return '-';
        if (v === 'profile') return 'Profile';
        if (v === 'multi-hop') return 'Multi-hop';
        return v;
      }},
      { key: 'bfd_profile', title: 'BFD Profile', render: v => v || '-' },
      { key: 'description', title: '描述', render: v => v || '-' },
    ];

    const arpColumns = [
      { key: 'interface', title: '接口' },
      { key: 'address', title: 'IP 地址' },
      { key: 'mac', title: 'MAC 地址' },
      { key: 'description', title: '描述' },
    ];

    const neighborProxyColumns = [
      { key: 'type', title: '类型', render: v => v === 'nd' ? 'ND' : 'ARP' },
      { key: 'address', title: '地址' },
      { key: 'interface', title: '接口' },
    ];

    const multicastColumns = [
      { key: 'type', title: '类型', render: v => v === 'route' ? 'MRIB 单播路由' : '接口路由' },
      { key: 'destination', title: '目标网络' },
    ];

    const tableColumns = [
      { key: 'table_number', title: '表编号' },
      { key: 'description', title: '描述', render: v => v || '-' },
      { key: 'route', title: 'IPv4 路由数', render: v => (v || []).length },
      { key: 'route6', title: 'IPv6 路由数', render: v => (v || []).length },
    ];

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
        if (err) return `下一跳${err}`;
        if (item.bfd_mode === 'profile') {
          if (!item.bfd_profile) return 'BFD Profile 名称不能为空';
        } else if (item.bfd_mode === 'multi-hop') {
          err = validateBFDSource(item.bfd_multi_hop_source);
          if (err) return `BFD ${err}`;
        }
        if (ipv6) {
          err = validateSegments(item.segments);
          if (err) return err;
        }
      } else if (item.type === 'interface' || item.type === 'dhcp-interface') {
        if (!item.value) return '接口不能为空';
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
      if (!item.interface) return '接口不能为空';
      const err = validateIPv4(item.address);
      if (err) return `IP${err}`;
      if (item.mac) {
        const macErr = validateMAC(item.mac);
        if (macErr) return macErr;
      }
      return '';
    }

    function validateNeighborProxy(item) {
      if (!item.interface) return '接口不能为空';
      const err = item.type === 'nd' ? validateIPv6(item.address) : validateIPv4(item.address);
      if (err) return `地址${err}`;
      return '';
    }

    function validateMulticast(item) {
      return validateIPv4CIDR(item.destination);
    }

    function validateTable(value) {
      if (!value) return '策略路由表编号不能为空';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 200) return '策略路由表编号范围 1-200';
      return '';
    }

    async function save() {
      for (const item of config.value.route) {
        const err = validateRoute(item, false);
        if (err) return alert(`IPv4 静态路由 ${item.destination || '未命名'}: ${err}`);
      }
      for (const item of config.value.route6) {
        const err = validateRoute(item, true);
        if (err) return alert(`IPv6 静态路由 ${item.destination || '未命名'}: ${err}`);
      }
      for (const item of config.value.arp) {
        const err = validateArp(item);
        if (err) return alert(`静态 ARP ${item.address || '未命名'}: ${err}`);
      }
      for (const item of config.value.neighbor_proxy) {
        const err = validateNeighborProxy(item);
        if (err) return alert(`Neighbor Proxy ${item.address || '未命名'}: ${err}`);
      }
      for (const item of config.value.multicast) {
        const err = validateMulticast(item);
        if (err) return alert(`组播路由 ${item.destination || '未命名'}: ${err}`);
      }
      for (const item of config.value.tables) {
        const err = validateTable(item.table_number);
        if (err) return alert(`策略路由表 ${item.table_number || '未命名'}: ${err}`);
        for (const r of item.route) {
          const rerr = validateRoute(r, false);
          if (rerr) return alert(`策略路由表 ${item.table_number} IPv4 路由 ${r.destination || '未命名'}: ${rerr}`);
        }
        for (const r of item.route6) {
          const rerr = validateRoute(r, true);
          if (rerr) return alert(`策略路由表 ${item.table_number} IPv6 路由 ${r.destination || '未命名'}: ${rerr}`);
        }
      }

      saving.value = true;
      try {
        const payload = formToConfig(config.value);
        await configApi.set('protocols static', payload);
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
      if (!selection.length) return alert('请选择要编辑的静态路由');
      const idx = parseInt(selection[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= list.length) return alert('未找到选中的静态路由');
      routeModalContext.value = context;
      editingRoute.value = { ...list[idx], _index: idx };
      editingRouteIPv6.value = ipv6;
      routeModalVisible.value = true;
    }
    function removeRoute(ipv6 = false, context = null) {
      const selection = getRouteSelection(ipv6, context);
      const list = getRouteList(ipv6, context);
      if (!selection.length) return alert('请选择要删除的静态路由');
      const indices = selection.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) list.splice(idx, 1);
      selection.length = 0;
    }
    function saveRoute() {
      const err = validateRoute(editingRoute.value, editingRouteIPv6.value);
      if (err) return alert(err);
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
      if (!arpSelection.value.length) return alert('请选择要编辑的静态 ARP');
      const idx = parseInt(arpSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.arp.length) return alert('未找到选中的静态 ARP');
      editingArp.value = { ...config.value.arp[idx], _index: idx };
      arpModalVisible.value = true;
    }
    function removeArp() {
      if (!arpSelection.value.length) return alert('请选择要删除的静态 ARP');
      const indices = arpSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.arp.splice(idx, 1);
      arpSelection.value.length = 0;
    }
    function saveArp() {
      const err = validateArp(editingArp.value);
      if (err) return alert(err);
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
      if (!npSelection.value.length) return alert('请选择要编辑的 Neighbor Proxy');
      const idx = parseInt(npSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.neighbor_proxy.length) return alert('未找到选中的 Neighbor Proxy');
      editingNp.value = { ...config.value.neighbor_proxy[idx], _index: idx };
      npModalVisible.value = true;
    }
    function removeNeighborProxy() {
      if (!npSelection.value.length) return alert('请选择要删除的 Neighbor Proxy');
      const indices = npSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.neighbor_proxy.splice(idx, 1);
      npSelection.value.length = 0;
    }
    function saveNeighborProxy() {
      const err = validateNeighborProxy(editingNp.value);
      if (err) return alert(err);
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
      if (!mcSelection.value.length) return alert('请选择要编辑的组播路由');
      const idx = parseInt(mcSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.multicast.length) return alert('未找到选中的组播路由');
      editingMc.value = { ...config.value.multicast[idx], _index: idx };
      mcModalVisible.value = true;
    }
    function removeMulticast() {
      if (!mcSelection.value.length) return alert('请选择要删除的组播路由');
      const indices = mcSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.multicast.splice(idx, 1);
      mcSelection.value.length = 0;
    }
    function saveMulticast() {
      const err = validateMulticast(editingMc.value);
      if (err) return alert(err);
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
      if (!tableSelection.value.length) return alert('请选择要编辑的策略路由表');
      const idx = parseInt(tableSelection.value[0], 10);
      if (isNaN(idx) || idx < 0 || idx >= config.value.tables.length) return alert('未找到选中的策略路由表');
      editingTable.value = JSON.parse(JSON.stringify({ ...config.value.tables[idx], _index: idx }));
      tableRouteSelection.value.length = 0;
      tableRoute6Selection.value.length = 0;
      tableActiveTab.value = 'route';
      tableModalVisible.value = true;
    }
    function removeTable() {
      if (!tableSelection.value.length) return alert('请选择要删除的策略路由表');
      const indices = tableSelection.value.map(s => parseInt(s, 10)).filter(n => !isNaN(n)).sort((a, b) => b - a);
      for (const idx of indices) config.value.tables.splice(idx, 1);
      tableSelection.value.length = 0;
    }
    function saveTable() {
      const err = validateTable(editingTable.value.table_number);
      if (err) return alert(err);
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
    });

    return {
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
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-section">
      <div v-if="saved" class="alert alert-success">{{ $t('msg.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'route', title: 'IPv4 静态路由' },
        { key: 'route6', title: 'IPv6 静态路由' },
        { key: 'arp', title: '静态 ARP' },
        { key: 'neighbor-proxy', title: 'Neighbor Proxy' },
        { key: 'multicast', title: '组播路由' },
        { key: 'table', title: '策略路由表' },
        { key: 'advanced', title: '高级' },
      ]">
        <template #route>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRoute(false)" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRoute(false)" :disabled="writeDisabled || !routeSelection.length || routeSelection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRoute(false)" :disabled="writeDisabled || !routeSelection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="routeColumns" :data="config.route.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="routeSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #route6>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRoute(true)" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRoute(true)" :disabled="writeDisabled || !route6Selection.length || route6Selection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRoute(true)" :disabled="writeDisabled || !route6Selection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="routeColumns" :data="config.route6.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="route6Selection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #arp>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createArp" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editArp" :disabled="writeDisabled || !arpSelection.length || arpSelection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeArp" :disabled="writeDisabled || !arpSelection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="arpColumns" :data="config.arp.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="arpSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #neighbor-proxy>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createNeighborProxy" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editNeighborProxy" :disabled="writeDisabled || !npSelection.length || npSelection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeNeighborProxy" :disabled="writeDisabled || !npSelection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="neighborProxyColumns" :data="config.neighbor_proxy.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="npSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #multicast>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createMulticast" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editMulticast" :disabled="writeDisabled || !mcSelection.length || mcSelection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeMulticast" :disabled="writeDisabled || !mcSelection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="multicastColumns" :data="config.multicast.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="mcSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #table>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createTable" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editTable" :disabled="writeDisabled || !tableSelection.length || tableSelection.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeTable" :disabled="writeDisabled || !tableSelection.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load" :disabled="loading">刷新</ToolbarButton>
          </div>
          <DataTable :columns="tableColumns" :data="config.tables.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableSelection = $event" :selectable="true" :loading="loading" />
        </template>

        <template #advanced>
          <div class="form-row">
            <label class="form-label">Route-map</label>
            <input class="form-control" v-model="config.route_map" :disabled="writeDisabled" placeholder="路由映射名称" title="指定要使用的 route-map 名称" />
          </div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : $t('app.save') }}</ToolbarButton>
      </div>

      <CommandPreview path="protocols static" />


      <!-- Table Modal -->
      <DraggableModal v-model:visible="tableModalVisible" title="策略路由表" width="1100px" @confirm="saveTable" @close="tableModalVisible = false">
        <div class="form-row">
          <label class="form-label">表编号</label>
          <div class="form-control">
            <input type="number" min="1" max="200" v-model="editingTable.table_number" :disabled="editingTable._index !== undefined" placeholder="1-200" title="策略路由表编号" />
            <div class="form-hint">范围 1-200</div>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">描述</label>
          <input class="form-control" v-model="editingTable.description" placeholder="可选" title="策略路由表描述" />
        </div>
        <div class="form-row" style="margin-top: 12px;">
          <TabGroup v-model="tableActiveTab" :tabs="[
            { key: 'route', title: 'IPv4 路由' },
            { key: 'route6', title: 'IPv6 路由' },
          ]" style="flex: 1;">
            <template #route>
              <div class="toolbar toolbar-compact">
                <ToolbarButton icon="create" @click="createRoute(false, true)" :disabled="writeDisabled">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRoute(false, true)" :disabled="writeDisabled || !tableRouteSelection.length || tableRouteSelection.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRoute(false, true)" :disabled="writeDisabled || !tableRouteSelection.length">删除</ToolbarButton>
              </div>
              <DataTable :columns="routeColumns" :data="editingTable.route.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableRouteSelection = $event" :selectable="true" />
            </template>
            <template #route6>
              <div class="toolbar toolbar-compact">
                <ToolbarButton icon="create" @click="createRoute(true, true)" :disabled="writeDisabled">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRoute(true, true)" :disabled="writeDisabled || !tableRoute6Selection.length || tableRoute6Selection.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRoute(true, true)" :disabled="writeDisabled || !tableRoute6Selection.length">删除</ToolbarButton>
              </div>
              <DataTable :columns="routeColumns" :data="editingTable.route6.map((r, i) => ({ ...r, _index: i }))" row-key="_index" :externalToolbar="true" @selection-change="tableRoute6Selection = $event" :selectable="true" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>

      <!-- ARP Modal -->
      <DraggableModal v-model:visible="arpModalVisible" title="静态 ARP" @confirm="saveArp" @close="arpModalVisible = false">
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingArp.interface">
            <option value="">-- 请选择 --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">IP 地址</label>
          <input class="form-control" v-model="editingArp.address" placeholder="x.x.x.x" title="IPv4 目标地址" />
        </div>
        <div class="form-row">
          <label class="form-label">MAC 地址</label>
          <input class="form-control" v-model="editingArp.mac" placeholder="aa:bb:cc:dd:ee:ff" title="硬件 MAC 地址" />
        </div>
        <div class="form-row">
          <label class="form-label">描述</label>
          <input class="form-control" v-model="editingArp.description" placeholder="可选" title="描述" />
        </div>
      </DraggableModal>

      <!-- Neighbor Proxy Modal -->
      <DraggableModal v-model:visible="npModalVisible" title="Neighbor Proxy" @confirm="saveNeighborProxy" @close="npModalVisible = false">
        <div class="form-row">
          <label class="form-label">类型</label>
          <select class="form-control" v-model="editingNp.type">
            <option value="arp">ARP</option>
            <option value="nd">ND</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">地址</label>
          <input class="form-control" v-model="editingNp.address" :placeholder="editingNp.type === 'nd' ? 'x:x:x:x::x' : 'x.x.x.x'" :title="editingNp.type === 'nd' ? 'IPv6 目标地址' : 'IPv4 目标地址'" />
        </div>
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingNp.interface">
            <option value="">-- 请选择 --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Multicast Modal -->
      <DraggableModal v-model:visible="mcModalVisible" title="组播路由" @confirm="saveMulticast" @close="mcModalVisible = false">
        <div class="form-row">
          <label class="form-label">类型</label>
          <select class="form-control" v-model="editingMc.type">
            <option value="interface-route">接口路由</option>
            <option value="route">MRIB 单播路由</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">目标网络</label>
          <input class="form-control" v-model="editingMc.destination" placeholder="x.x.x.x/x" title="IPv4 目标网络" />
        </div>
      </DraggableModal>
      <!-- Route Modal -->
      <DraggableModal v-model:visible="routeModalVisible" :title="(editingRouteIPv6 ? 'IPv6' : 'IPv4') + ' 静态路由'" modal-class="on-top" @confirm="saveRoute" @close="routeModalVisible = false">
        <div class="form-row">
          <label class="form-label">目标网络</label>
          <input class="form-control" v-model="editingRoute.destination" :disabled="editingRoute._index !== undefined" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x/x' : 'x.x.x.x/x'" title="目标网络 CIDR" />
        </div>
        <div class="form-row">
          <label class="form-label">类型</label>
          <select class="form-control" v-model="editingRoute.type">
            <option v-for="opt in ROUTE_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">下一跳地址</label>
          <input class="form-control" v-model="editingRoute.value" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x' : 'x.x.x.x'" title="下一跳 IP 地址" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">出接口（可选）</label>
          <select class="form-control" v-model="editingRoute.outbound_interface">
            <option value="">-- 请选择 --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'interface' || editingRoute.type === 'dhcp-interface'">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingRoute.value">
            <option value="">-- 请选择 --</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type !== 'dhcp-interface'">
          <label class="form-label">距离</label>
          <div class="form-control">
            <input type="number" min="1" max="255" v-model="editingRoute.distance" placeholder="1" title="管理距离，范围 1-255，默认 1" />
            <div class="form-hint">范围 1-255，默认 1</div>
          </div>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'blackhole' || editingRoute.type === 'reject'">
          <label class="form-label">标签</label>
          <div class="form-control">
            <input type="number" min="0" max="4294967295" v-model="editingRoute.tag" placeholder="可选" title="路由标签" />
            <div class="form-hint">范围 0-4294967295</div>
          </div>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' || editingRoute.type === 'interface'">
          <label class="form-label">VRF</label>
          <input class="form-control" v-model="editingRoute.vrf" placeholder="可选" title="泄露路由的 VRF" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' || editingRoute.type === 'interface'">
          <label class="form-label"><input type="checkbox" v-model="editingRoute.disable" /> 禁用</label>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop'">
          <label class="form-label">BFD</label>
          <select class="form-control" v-model="editingRoute.bfd_mode">
            <option v-for="opt in BFD_MODES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'profile'">
          <label class="form-label">BFD Profile</label>
          <input class="form-control" v-model="editingRoute.bfd_profile" placeholder="BFD profile 名称" title="BFD profile 名称" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'multi-hop'">
          <label class="form-label">Source 地址</label>
          <input class="form-control" v-model="editingRoute.bfd_multi_hop_source" :placeholder="editingRouteIPv6 ? 'x:x:x:x::x' : 'x.x.x.x'" title="BFD 会话源地址" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRoute.bfd_mode === 'multi-hop'">
          <label class="form-label">BFD Profile</label>
          <input class="form-control" v-model="editingRoute.bfd_multi_hop_profile" placeholder="BFD profile 名称" title="BFD profile 名称" />
        </div>
        <div class="form-row" v-if="editingRoute.type === 'next-hop' && editingRouteIPv6">
          <label class="form-label">SRv6 Segments</label>
          <input class="form-control" v-model="editingRoute.segments" placeholder="Segments (SIDs)" title="SRv6 segments" />
        </div>
        <div class="form-row">
          <label class="form-label">描述</label>
          <input class="form-control" v-model="editingRoute.description" placeholder="可选" title="路由描述" />
        </div>
      </DraggableModal>
    </div>
  `,
});
