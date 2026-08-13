import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

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

// Validation functions moved inside setup() for i18n access

function configToForm(data = {}) {
  const areas = [];
  const areaData = data.area || {};
  for (const [areaId, attrs] of Object.entries(areaData)) {
    const networks = [];
    const networkData = attrs.network || {};
    if (Array.isArray(networkData)) {
      for (const network of networkData) {
        networks.push({ network });
      }
    } else {
      for (const [network] of Object.entries(networkData)) {
        networks.push({ network });
      }
    }
    
    const ranges = [];
    const rangeData = attrs.range || {};
    for (const [range, rangeAttrs] of Object.entries(rangeData)) {
      ranges.push({
        range,
        'not-advertise': !!rangeAttrs['not-advertise'],
        'advertise-range-cost': rangeAttrs['advertise-range-cost'] || '',
        'substitute': rangeAttrs['substitute'] || '',
      });
    }
    
    const virtualLinks = [];
    const virtualLinkData = attrs['virtual-link'] || {};
    for (const [vlinkId, vlinkAttrs] of Object.entries(virtualLinkData)) {
      virtualLinks.push({
        address: vlinkId,
        authentication: !!vlinkAttrs.authentication,
        'dead-interval': vlinkAttrs['dead-interval'] || '',
        'hello-interval': vlinkAttrs['hello-interval'] || '',
        'retransmit-interval': vlinkAttrs['retransmit-interval'] || '',
        'transmit-delay': vlinkAttrs['transmit-delay'] || '',
      });
    }
    
    let areaType = '';
    if (attrs['area-type']) {
      if (typeof attrs['area-type'] === 'string') {
        areaType = attrs['area-type'];
      } else if (typeof attrs['area-type'] === 'object') {
        areaType = Object.keys(attrs['area-type'])[0] || '';
      }
    }
    
    areas.push({
      id: areaId,
      'area-type': areaType,
      authentication: attrs.authentication || '',
      'export-list': attrs['export-list'] || '',
      'import-list': attrs['import-list'] || '',
      shortcut: !!attrs.shortcut,
      networks,
      ranges,
      virtualLinks,
    });
  }

  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      area: attrs.area || '',
      authentication: attrs.authentication || {},
      bandwidth: attrs.bandwidth || '',
      bfd: !!attrs.bfd,
      cost: attrs.cost || '',
      'dead-interval': attrs['dead-interval'] || '',
      'hello-interval': attrs['hello-interval'] || '',
      'hello-multiplier': attrs['hello-multiplier'] || '',
      'ldp-sync': attrs['ldp-sync'] || {},
      'mtu-ignore': !!attrs['mtu-ignore'],
      network: attrs.network || '',
      passive: !!attrs.passive,
      priority: attrs.priority || '',
      'retransmit-interval': attrs['retransmit-interval'] || '',
      'transmit-delay': attrs['transmit-delay'] || '',
    });
  }

  const neighbors = [];
  const neighborData = data.neighbor || {};
  for (const [ip, attrs] of Object.entries(neighborData)) {
    neighbors.push({
      address: ip,
      'poll-interval': attrs['poll-interval'] || '',
      priority: attrs.priority || '',
    });
  }

  const redistributes = [];
  const redistributeData = data.redistribute || {};
  for (const [proto, attrs] of Object.entries(redistributeData)) {
    if (proto === 'table') continue;
    redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'metric-type': attrs['metric-type'] || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  const redistributeTables = [];
  const tableData = redistributeData.table || {};
  for (const [tableId, attrs] of Object.entries(tableData)) {
    redistributeTables.push({
      table: tableId,
      metric: attrs?.metric || '',
      'metric-type': attrs?.['metric-type'] || '',
      'route-map': attrs?.['route-map'] || '',
    });
  }

  const defInfo = data['default-information'] || {};
  const defOrig = defInfo.originate || {};

  const summaryAddresses = [];
  const summaryData = data['summary-address'] || {};
  for (const [addr, attrs] of Object.entries(summaryData)) {
    summaryAddresses.push({
      address: addr,
      'no-advertise': !!attrs['no-advertise'],
      tag: attrs.tag || '',
    });
  }

  const accessLists = [];
  const accessListData = data['access-list'] || {};
  for (const [aclNum, attrs] of Object.entries(accessListData)) {
    let exportProtos = [];
    if (attrs?.export) {
      if (Array.isArray(attrs.export)) {
        exportProtos = attrs.export;
      } else if (typeof attrs.export === 'object') {
        exportProtos = Object.keys(attrs.export);
      }
    }
    accessLists.push({
      number: aclNum,
      export: exportProtos,
    });
  }

  return {
    'router-id': data.parameters?.['router-id'] || '',
    'default-metric': data['default-metric'] || '',
    'maximum-paths': data['maximum-paths'] || '',
    'auto-cost': { 'reference-bandwidth': data['auto-cost']?.['reference-bandwidth'] || '' },
    'log-adjacency-changes': !!data['log-adjacency-changes'],
    'log-adjacency-changes-detail': !!data['log-adjacency-changes']?.detail,
    'passive-interface': toArray(data['passive-interface']),
    'passive-interface-default': !!data['passive-interface']?.default,
    'access-list': accessLists,
    'summary-address': summaryAddresses,
    'capability': {
      'opaque': !!data.capability?.opaque,
    },
    'distance': {
      'global': data.distance?.global || '',
      'ospf': {
        'external': data.distance?.ospf?.external || '',
        'inter-area': data.distance?.ospf?.['inter-area'] || '',
        'intra-area': data.distance?.ospf?.['intra-area'] || '',
      },
    },
    'graceful-restart': {
      'grace-period': data['graceful-restart']?.['grace-period'] || '',
      'helper': {
        'enable': !!data['graceful-restart']?.helper?.enable,
        'planned-only': !!data['graceful-restart']?.helper?.['planned-only'],
      },
    },
    'aggregation': {
      timer: data.aggregation?.timer || '',
    },
    'ldp-sync': {
      holddown: data['ldp-sync']?.holddown || '',
    },
    'max-metric': {
      'router-lsa': {
        administrative: !!data['max-metric']?.['router-lsa']?.administrative,
        'on-shutdown': data['max-metric']?.['router-lsa']?.['on-shutdown'] || '',
        'on-startup': data['max-metric']?.['router-lsa']?.['on-startup'] || '',
      },
    },
    'mpls-te': {
      enable: !!data['mpls-te']?.enable,
      'router-address': data['mpls-te']?.['router-address'] || '',
    },
    'parameters': {
      'abr-type': data.parameters?.['abr-type'] || '',
      'opaque-lsa': !!data.parameters?.['opaque-lsa'],
      'rfc1583-compatibility': !!data.parameters?.['rfc1583-compatibility'],
    },
    'refresh': {
      timers: data.refresh?.timers || '',
    },
    'segment-routing': {
      'global-block': {
        'high-label-value': data['segment-routing']?.['global-block']?.['high-label-value'] || '',
        'low-label-value': data['segment-routing']?.['global-block']?.['low-label-value'] || '',
      },
      'local-block': {
        'high-label-value': data['segment-routing']?.['local-block']?.['high-label-value'] || '',
        'low-label-value': data['segment-routing']?.['local-block']?.['low-label-value'] || '',
      },
      'maximum-label-depth': data['segment-routing']?.['maximum-label-depth'] || '',
      prefix: [],
    },
    areas,
    interfaces,
    neighbors,
    redistributes,
    redistributeTables,
    timers: { throttle: { spf: { delay: '', 'initial-holdtime': '', 'max-holdtime': '' } }, ...(data.timers || {}) },
    'default-information': {
      originate: {
        always: !!defOrig.always,
        metric: defOrig.metric || '',
        'metric-type': defOrig['metric-type'] || '',
        'route-map': defOrig['route-map'] || '',
      },
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['router-id'])) {
    result.parameters = { 'router-id': String(form['router-id']) };
  }

  if (isPresent(form['default-metric'])) {
    result['default-metric'] = String(form['default-metric']);
  }

  if (isPresent(form['maximum-paths'])) {
    result['maximum-paths'] = String(form['maximum-paths']);
  }

  if (isPresent(form['auto-cost']?.['reference-bandwidth'])) {
    result['auto-cost'] = { 'reference-bandwidth': String(form['auto-cost']['reference-bandwidth']) };
  }

  if (form['log-adjacency-changes']) {
    result['log-adjacency-changes'] = {};
    if (form['log-adjacency-changes-detail']) {
      result['log-adjacency-changes'].detail = {};
    }
  }

  if (form['passive-interface']?.length || form['passive-interface-default']) {
    if (form['passive-interface-default']) {
      result['passive-interface'] = { default: {} };
    }
    if (form['passive-interface']?.length) {
      result['passive-interface'] = form['passive-interface'];
    }
  }

  // Access list
  if (form['access-list']?.length) {
    result['access-list'] = {};
    for (const acl of form['access-list']) {
      if (!acl.number) continue;
      const attrs = {};
      if (acl.export?.length) {
        attrs.export = {};
        for (const proto of acl.export) {
          attrs.export[proto] = {};
        }
      }
      result['access-list'][acl.number] = attrs;
    }
  }

  // Summary address
  if (form['summary-address']?.length) {
    result['summary-address'] = {};
    for (const addr of form['summary-address']) {
      if (!addr.address) continue;
      const attrs = {};
      if (addr['no-advertise']) attrs['no-advertise'] = {};
      if (isPresent(addr.tag)) attrs.tag = String(addr.tag);
      result['summary-address'][addr.address] = attrs;
    }
  }

  // Capability
  if (form['capability']?.['opaque']) {
    result.capability = { opaque: {} };
  }

  // Distance
  if (isPresent(form['distance']?.['global']) || isPresent(form['distance']?.['ospf'])) {
    result.distance = {};
    if (isPresent(form['distance']['global'])) result.distance.global = String(form['distance']['global']);
    if (form['distance']?.['ospf']) {
      const ospfDist = {};
      if (isPresent(form['distance']['ospf']['external'])) ospfDist.external = String(form['distance']['ospf']['external']);
      if (isPresent(form['distance']['ospf']['inter-area'])) ospfDist['inter-area'] = String(form['distance']['ospf']['inter-area']);
      if (isPresent(form['distance']['ospf']['intra-area'])) ospfDist['intra-area'] = String(form['distance']['ospf']['intra-area']);
      if (Object.keys(ospfDist).length > 0) result.distance.ospf = ospfDist;
    }
  }

  // Graceful restart
  const gr = form['graceful-restart'];
  if (gr && (isPresent(gr['grace-period']) || gr.helper?.enable || gr.helper?.['planned-only'])) {
    result['graceful-restart'] = {};
    if (isPresent(gr['grace-period'])) result['graceful-restart']['grace-period'] = String(gr['grace-period']);
    if (gr.helper?.enable || gr.helper?.['planned-only']) {
      result['graceful-restart'].helper = {};
      if (gr.helper.enable) result['graceful-restart'].helper.enable = {};
      if (gr.helper['planned-only']) result['graceful-restart'].helper['planned-only'] = {};
    }
  }

  // Aggregation
  if (isPresent(form['aggregation']?.timer)) {
    result.aggregation = { timer: String(form['aggregation'].timer) };
  }

  // LDP sync
  if (isPresent(form['ldp-sync']?.holddown)) {
    result['ldp-sync'] = { holddown: String(form['ldp-sync'].holddown) };
  }

  // Max metric
  const mm = form['max-metric']?.['router-lsa'];
  if (mm && (mm.administrative || isPresent(mm['on-shutdown']) || isPresent(mm['on-startup']))) {
    result['max-metric'] = { 'router-lsa': {} };
    if (mm.administrative) result['max-metric']['router-lsa'].administrative = {};
    if (isPresent(mm['on-shutdown'])) result['max-metric']['router-lsa']['on-shutdown'] = String(mm['on-shutdown']);
    if (isPresent(mm['on-startup'])) result['max-metric']['router-lsa']['on-startup'] = String(mm['on-startup']);
  }

  // MPLS TE
  if (form['mpls-te']?.enable || isPresent(form['mpls-te']?.['router-address'])) {
    result['mpls-te'] = {};
    if (form['mpls-te'].enable) result['mpls-te'].enable = {};
    if (isPresent(form['mpls-te']['router-address'])) result['mpls-te']['router-address'] = String(form['mpls-te']['router-address']);
  }

  // Parameters (abr-type, opaque-lsa, rfc1583-compatibility)
  if (isPresent(form['parameters']?.['abr-type']) || form['parameters']?.['opaque-lsa'] || form['parameters']?.['rfc1583-compatibility']) {
    if (!result.parameters) result.parameters = {};
    if (isPresent(form['parameters']['abr-type'])) result.parameters['abr-type'] = String(form['parameters']['abr-type']);
    if (form['parameters']['opaque-lsa']) result.parameters['opaque-lsa'] = {};
    if (form['parameters']['rfc1583-compatibility']) result.parameters['rfc1583-compatibility'] = {};
  }

  // Refresh timers
  if (isPresent(form['refresh']?.timers)) {
    result.refresh = { timers: String(form['refresh'].timers) };
  }

  // Segment routing
  const sr = form['segment-routing'];
  if (sr && (isPresent(sr['global-block']?.['high-label-value']) || isPresent(sr['global-block']?.['low-label-value']) ||
      isPresent(sr['local-block']?.['high-label-value']) || isPresent(sr['local-block']?.['low-label-value']) ||
      isPresent(sr['maximum-label-depth']))) {
    result['segment-routing'] = {};
    if (isPresent(sr['global-block']?.['high-label-value']) || isPresent(sr['global-block']?.['low-label-value'])) {
      result['segment-routing']['global-block'] = {};
      if (isPresent(sr['global-block']['high-label-value'])) result['segment-routing']['global-block']['high-label-value'] = String(sr['global-block']['high-label-value']);
      if (isPresent(sr['global-block']['low-label-value'])) result['segment-routing']['global-block']['low-label-value'] = String(sr['global-block']['low-label-value']);
    }
    if (isPresent(sr['local-block']?.['high-label-value']) || isPresent(sr['local-block']?.['low-label-value'])) {
      result['segment-routing']['local-block'] = {};
      if (isPresent(sr['local-block']['high-label-value'])) result['segment-routing']['local-block']['high-label-value'] = String(sr['local-block']['high-label-value']);
      if (isPresent(sr['local-block']['low-label-value'])) result['segment-routing']['local-block']['low-label-value'] = String(sr['local-block']['low-label-value']);
    }
    if (isPresent(sr['maximum-label-depth'])) result['segment-routing']['maximum-label-depth'] = String(sr['maximum-label-depth']);
  }

  // Areas
  if (form.areas?.length) {
    result.area = {};
    for (const area of form.areas) {
      if (!area.id) continue;
      const attrs = {};
      
      if (isPresent(area['area-type'])) attrs['area-type'] = area['area-type'];
      if (isPresent(area.authentication)) attrs.authentication = area.authentication;
      if (isPresent(area['export-list'])) attrs['export-list'] = area['export-list'];
      if (isPresent(area['import-list'])) attrs['import-list'] = area['import-list'];
      if (area.shortcut) attrs.shortcut = {};
      
      if (area.networks?.length) {
        attrs.network = {};
        for (const net of area.networks) {
          if (net.network) attrs.network[net.network] = {};
        }
      }
      
      if (area.ranges?.length) {
        attrs.range = {};
        for (const range of area.ranges) {
          if (!range.range) continue;
          const rangeAttrs = {};
          if (range['not-advertise']) rangeAttrs['not-advertise'] = {};
          if (isPresent(range['advertise-range-cost'])) {
            rangeAttrs['advertise-range-cost'] = String(range['advertise-range-cost']);
          }
          if (isPresent(range['substitute'])) {
            rangeAttrs['substitute'] = range['substitute'];
          }
          attrs.range[range.range] = rangeAttrs;
        }
      }

      if (area.virtualLinks?.length) {
        attrs['virtual-link'] = {};
        for (const vlink of area.virtualLinks) {
          if (!vlink.address) continue;
          const vlinkAttrs = {};
          if (vlink.authentication) vlinkAttrs.authentication = {};
          if (isPresent(vlink['hello-interval'])) vlinkAttrs['hello-interval'] = String(vlink['hello-interval']);
          if (isPresent(vlink['dead-interval'])) vlinkAttrs['dead-interval'] = String(vlink['dead-interval']);
          if (isPresent(vlink['retransmit-interval'])) vlinkAttrs['retransmit-interval'] = String(vlink['retransmit-interval']);
          if (isPresent(vlink['transmit-delay'])) vlinkAttrs['transmit-delay'] = String(vlink['transmit-delay']);
          attrs['virtual-link'][vlink.address] = vlinkAttrs;
        }
      }
      
      result.area[area.id] = attrs;
    }
  }

  // Interfaces
  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      
      if (isPresent(iface.area)) attrs.area = iface.area;
      if (isPresent(iface.bandwidth)) attrs.bandwidth = String(iface.bandwidth);
      if (iface.bfd) attrs.bfd = {};
      if (isPresent(iface.cost)) attrs.cost = String(iface.cost);
      if (isPresent(iface['dead-interval'])) attrs['dead-interval'] = String(iface['dead-interval']);
      if (isPresent(iface['hello-interval'])) attrs['hello-interval'] = String(iface['hello-interval']);
      if (isPresent(iface['hello-multiplier'])) attrs['hello-multiplier'] = String(iface['hello-multiplier']);
      if (iface['mtu-ignore']) attrs['mtu-ignore'] = {};
      if (isPresent(iface.network)) attrs.network = iface.network;
      if (iface.passive) attrs.passive = {};
      if (isPresent(iface.priority)) attrs.priority = String(iface.priority);
      if (isPresent(iface['retransmit-interval'])) attrs['retransmit-interval'] = String(iface['retransmit-interval']);
      if (isPresent(iface['transmit-delay'])) attrs['transmit-delay'] = String(iface['transmit-delay']);
      
      result.interface[iface.name] = attrs;
    }
  }

  // Neighbors
  if (form.neighbors?.length) {
    result.neighbor = {};
    for (const neighbor of form.neighbors) {
      if (!neighbor.address) continue;
      const attrs = {};
      if (isPresent(neighbor['poll-interval'])) attrs['poll-interval'] = String(neighbor['poll-interval']);
      if (isPresent(neighbor.priority)) attrs.priority = String(neighbor.priority);
      result.neighbor[neighbor.address] = attrs;
    }
  }

  // Redistributes
  if (form.redistributes?.length) {
    result.redistribute = {};
    for (const redist of form.redistributes) {
      if (!redist.protocol) continue;
      const attrs = {};
      if (isPresent(redist.metric)) attrs.metric = String(redist.metric);
      if (isPresent(redist['metric-type'])) attrs['metric-type'] = String(redist['metric-type']);
      if (isPresent(redist['route-map'])) attrs['route-map'] = redist['route-map'];
      result.redistribute[redist.protocol] = attrs;
    }
  }

  // Redistribute tables
  if (form.redistributeTables?.length) {
    if (!result.redistribute) result.redistribute = {};
    result.redistribute.table = {};
    for (const tableItem of form.redistributeTables) {
      if (!tableItem.table) continue;
      const attrs = {};
      if (isPresent(tableItem.metric)) attrs.metric = String(tableItem.metric);
      if (isPresent(tableItem['metric-type'])) attrs['metric-type'] = String(tableItem['metric-type']);
      if (isPresent(tableItem['route-map'])) attrs['route-map'] = tableItem['route-map'];
      result.redistribute.table[tableItem.table] = attrs;
    }
  }

  // Timers
  if (form.timers && form.timers.throttle?.spf) {
    const spf = form.timers.throttle.spf;
    if (spf.delay || spf['initial-holdtime'] || spf['max-holdtime']) {
      result.timers = { throttle: { spf: {} } };
      if (isPresent(spf.delay)) result.timers.throttle.spf.delay = String(spf.delay);
      if (isPresent(spf['initial-holdtime'])) result.timers.throttle.spf['initial-holdtime'] = String(spf['initial-holdtime']);
      if (isPresent(spf['max-holdtime'])) result.timers.throttle.spf['max-holdtime'] = String(spf['max-holdtime']);
    }
  }

  // Default information
  if (form['default-information']?.originate) {
    const orig = form['default-information'].originate;
    if (orig.always || orig.metric || orig['metric-type'] || orig['route-map']) {
      result['default-information'] = { originate: {} };
      if (orig.always) result['default-information'].originate.always = {};
      if (isPresent(orig.metric)) result['default-information'].originate.metric = String(orig.metric);
      if (isPresent(orig['metric-type'])) result['default-information'].originate['metric-type'] = String(orig['metric-type']);
      if (isPresent(orig['route-map'])) result['default-information'].originate['route-map'] = orig['route-map'];
    }
  }

  return result;
}

export default defineComponent({
  name: 'OspfPage',
  setup() {
    const { t } = useI18n();
    
    // Validation functions with i18n support
    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('ospf.validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('ospf.validation.ipv4Format');
      return '';
    }

    function validateAreaId(value) {
      if (!value) return '';
      if (/^\d+$/.test(value)) {
        const n = parseInt(value, 10);
        if (n < 0 || n > 4294967295) return t('ospf.validation.areaIdRange', { min: 0, max: 4294967295 });
      } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return t('ospf.validation.areaIdFormat');
      }
      return '';
    }

    function validateNetwork(value) {
      if (!value) return '';
      const match = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
      if (!match) return t('ospf.validation.networkFormat');
      const [, , prefix] = match;
      if (parseInt(prefix, 10) < 0 || parseInt(prefix, 10) > 32) return t('ospf.validation.prefixLengthRange', { min: 0, max: 32 });
      return '';
    }

    function validateCost(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('ospf.validation.costRange', { min: 1, max: 65535 });
      return '';
    }

    function validateBandwidth(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 100000) return t('ospf.validation.bandwidthRange', { min: 1, max: 100000 });
      return '';
    }

    function validateTimer(value, min, max, name) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < min || n > max) return t('ospf.validation.timerRange', { name, min, max });
      return '';
    }

    function validatePriority(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 255) return t('ospf.validation.priorityRange', { min: 0, max: 255 });
      return '';
    }

    function validateMetric(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 16777214) return t('ospf.validation.metricRange', { min: 0, max: 16777214 });
      return '';
    }

    function validateMetricType(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || (n !== 1 && n !== 2)) return t('ospf.validation.metricTypeInvalid');
      return '';
    }

    function validateHelloMultiplier(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 10) return t('ospf.validation.helloMultiplierRange', { min: 1, max: 10 });
      return '';
    }

    function validateAdvertiseRangeCost(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('ospf.validation.advertiseRangeCostRange', { min: 1, max: 65535 });
      return '';
    }

    function validateAutoCost(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 4000000) return t('ospf.validation.autoCostRange', { min: 1, max: 4000000 });
      return '';
    }

    function validateAccessList(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 199) return t('ospf.validation.accessListRange', { min: 1, max: 199 });
      return '';
    }

    function validateSummaryAddress(value) {
      if (!value) return '';
      const match = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
      if (!match) return t('ospf.validation.summaryAddressFormat');
      const [, , prefix] = match;
      if (parseInt(prefix, 10) < 0 || parseInt(prefix, 10) > 32) return t('ospf.validation.prefixLengthRange', { min: 0, max: 32 });
      return '';
    }

    function validateDistance(value, name) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 255) return t('ospf.validation.distanceRange', { name, min: 1, max: 255 });
      return '';
    }

    function validateGracePeriod(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 1800) return t('ospf.validation.gracePeriodRange', { min: 1, max: 1800 });
      return '';
    }

    function validatePollInterval(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('ospf.validation.pollIntervalRange', { min: 1, max: 65535 });
      return '';
    }

    function validateLabel(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 1048575) return t('ospf.validation.labelRange', { min: 0, max: 1048575 });
      return '';
    }

    function validateRefreshTimer(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 10 || n > 1800) return t('ospf.validation.refreshTimerRange', { min: 10, max: 1800 });
      return '';
    }

    function validateLdpHolddown(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 10000) return t('ospf.validation.ldpHolddownRange', { min: 0, max: 10000 });
      return '';
    }

    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const newPassiveInterface = ref('');
    const newAccessList = ref('');
    const interfaces = ref([]);

    // Summary address modal
    const summaryAddressModalVisible = ref(false);
    const editingSummaryAddressIndex = ref(-1);
    const summaryAddressForm = ref({
      address: '', 'no-advertise': false, tag: '',
    });

    // Area modal
    const areaModalVisible = ref(false);
    const editingAreaIndex = ref(-1);
    const areaForm = ref({
      id: '', 'area-type': '', authentication: '', 'export-list': '', 'import-list': '',
      shortcut: false, networks: [], ranges: [], virtualLinks: [],
    });

    // Interface modal
    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({
      name: '', area: '', bandwidth: '', bfd: false, cost: '', 'dead-interval': '',
      'hello-interval': '', 'hello-multiplier': '', 'mtu-ignore': false, network: '',
      passive: false, priority: '', 'retransmit-interval': '', 'transmit-delay': '',
    });

    // Neighbor modal
    const neighborModalVisible = ref(false);
    const editingNeighborIndex = ref(-1);
    const neighborForm = ref({
      address: '', 'poll-interval': '', priority: '',
    });

    // Redistribute modal
    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({
      protocol: '', metric: '', 'metric-type': '', 'route-map': '',
    });

    // Redistribute table modal
    const redistributeTableModalVisible = ref(false);
    const editingRedistributeTableIndex = ref(-1);
    const redistributeTableForm = ref({
      table: '', metric: '', 'metric-type': '', 'route-map': '',
    });

    const areaColumns = [
      { key: 'id', title: t('ospf.area.id') },
      { key: 'area-type', title: t('ospf.area.type') },
      { key: 'networks', title: t('ospf.area.networkCount'), render: (row) => row.networks?.length || 0 },
    ];

    const interfaceColumns = [
      { key: 'name', title: t('ospf.interface.name') },
      { key: 'area', title: t('ospf.area.title') },
      { key: 'cost', title: t('ospf.interface.cost') },
      { key: 'network', title: t('ospf.interface.networkType') },
    ];

    const neighborColumns = [
      { key: 'address', title: t('ospf.neighbor.address') },
      { key: 'poll-interval', title: t('ospf.neighbor.pollInterval') },
      { key: 'priority', title: t('ospf.neighbor.priority') },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: t('ospf.redistribute.protocol') },
      { key: 'metric', title: t('ospf.redistribute.metric') },
      { key: 'metric-type', title: t('ospf.redistribute.metricType') },
    ];

    const redistributeTableColumns = [
      { key: 'table', title: t('ospf.redistribute.tableNumber') },
      { key: 'metric', title: t('ospf.redistribute.metric') },
      { key: 'metric-type', title: t('ospf.redistribute.metricType') },
    ];

    const summaryAddressColumns = [
      { key: 'address', title: t('ospf.summaryAddress.address') },
      { key: 'no-advertise', title: t('ospf.summaryAddress.noAdvertise'), render: (row) => row['no-advertise'] ? t('common.yes') : t('common.no') },
      { key: 'tag', title: t('ospf.summaryAddress.tag') },
    ];

    const accessListColumns = [
      { key: 'number', title: t('ospf.accessList.number') },
      { key: 'export', title: t('ospf.accessList.exportProtocols'), render: (row) => row.export?.join(', ') || '' },
    ];

    const EXPORT_PROTOCOL_OPTIONS = [
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static' },
    ];

    // Access list modal
    const accessListModalVisible = ref(false);
    const editingAccessListIndex = ref(-1);
    const accessListForm = ref({ number: '', export: [] });

    // Delete confirmation modals
    const deleteAccessListModalVisible = ref(false);
    const pendingDeleteAccessListNames = ref([]);

    const deleteSummaryAddressModalVisible = ref(false);
    const pendingDeleteSummaryAddressNames = ref([]);

    const deleteRedistributeTableModalVisible = ref(false);
    const pendingDeleteRedistributeTableNames = ref([]);

    const deleteAreaModalVisible = ref(false);
    const pendingDeleteAreaNames = ref([]);

    const deleteInterfaceModalVisible = ref(false);
    const pendingDeleteInterfaceNames = ref([]);

    const deleteNeighborModalVisible = ref(false);
    const pendingDeleteNeighborNames = ref([]);

    const deleteRedistributeModalVisible = ref(false);
    const pendingDeleteRedistributeNames = ref([]);

    const commandPath = computed(() => {
      if (activeTab.value === 'areas') return 'protocols ospf area';
      if (activeTab.value === 'interfaces') return 'protocols ospf interface';
      if (activeTab.value === 'neighbors') return 'protocols ospf neighbor';
      if (activeTab.value === 'redistribute') return 'protocols ospf redistribute';
      if (activeTab.value === 'timers') return 'protocols ospf timers throttle spf';
      if (activeTab.value === 'default-info') return 'protocols ospf default-information originate';
      if (activeTab.value === 'access-list') return 'protocols ospf access-list';
      if (activeTab.value === 'summary-address') return 'protocols ospf summary-address';
      if (activeTab.value === 'capability') return 'protocols ospf capability';
      if (activeTab.value === 'distance') return 'protocols ospf distance';
      if (activeTab.value === 'graceful-restart') return 'protocols ospf graceful-restart';
      return 'protocols ospf';
    });

    const AREA_TYPE_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'stub', label: 'Stub' },
      { value: 'nssa', label: 'NSSA' },
      { value: 'stub no-summary', label: 'Stub No Summary' },
    ]);

    const NETWORK_TYPE_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'broadcast', label: 'Broadcast' },
      { value: 'non-broadcast', label: 'Non-Broadcast' },
      { value: 'point-to-point', label: 'Point-to-Point' },
      { value: 'point-to-multipoint', label: 'Point-to-Multipoint' },
    ]);

    const REDISTRIBUTE_PROTOCOL_OPTIONS = computed(() => [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static' },
    ]);

    const AUTH_TYPE_OPTIONS = computed(() => [
      { value: '', label: t('option.none') },
      { value: 'message-digest', label: 'Message Digest' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'ospf']);
        console.log('OSPF API response:', res);
        console.log('OSPF data:', res.data);
        config.value = configToForm(res.data || {});
        console.log('OSPF form:', config.value);
      } catch (e) {
        console.error('OSPF load error:', e);
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function save() {
      if (config.value['router-id']) {
        const err = validateIPv4(config.value['router-id']);
        if (err) return showError({ message: `${t('ospf.validation.routerId')}${err}` });
      }
      if (config.value['default-metric']) {
        const err = validateMetric(config.value['default-metric']);
        if (err) return showError({ message: `${t('ospf.validation.defaultMetric')}${err}` });
      }
      if (config.value['maximum-paths']) {
        const n = parseInt(config.value['maximum-paths'], 10);
        if (isNaN(n) || n < 1 || n > 64) return showError({ message: t('ospf.validation.maxPathsRange') });
      }
      if (config.value['auto-cost']?.['reference-bandwidth']) {
        const err = validateAutoCost(config.value['auto-cost']['reference-bandwidth']);
        if (err) return showError({ message: `${t('ospf.validation.refBandwidth')}${err}` });
      }

      for (let i = 0; i < config.value.areas.length; i++) {
        const area = config.value.areas[i];
        if (area.id) {
          const err = validateAreaId(area.id);
          if (err) return showError({ message: `${t('ospf.validation.area')} ${i + 1}${err}` });
        }
        for (let j = 0; j < area.networks.length; j++) {
          const err = validateNetwork(area.networks[j].network);
          if (err) return showError({ message: `${t('ospf.validation.area')} ${area.id || i + 1} ${t('ospf.validation.network')} ${j + 1}${err}` });
        }
      }

      for (let i = 0; i < config.value.interfaces.length; i++) {
        const iface = config.value.interfaces[i];
        if (iface.cost) {
          const err = validateCost(iface.cost);
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${t('ospf.validation.cost')} ${err}` });
        }
        if (iface.bandwidth) {
          const err = validateBandwidth(iface.bandwidth);
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${t('ospf.validation.bandwidth')} ${err}` });
        }
        if (iface.priority) {
          const err = validatePriority(iface.priority);
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${t('ospf.validation.priority')} ${err}` });
        }
        if (iface['dead-interval']) {
          const err = validateTimer(iface['dead-interval'], 1, 65535, t('ospf.validation.deadInterval'));
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${err}` });
        }
        if (iface['hello-interval']) {
          const err = validateTimer(iface['hello-interval'], 1, 65535, t('ospf.validation.helloInterval'));
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${err}` });
        }
        if (iface['retransmit-interval']) {
          const err = validateTimer(iface['retransmit-interval'], 1, 65535, t('ospf.validation.retransmitInterval'));
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${err}` });
        }
        if (iface['transmit-delay']) {
          const err = validateTimer(iface['transmit-delay'], 1, 65535, t('ospf.validation.transmitDelay'));
          if (err) return showError({ message: `${t('ospf.validation.interface')} ${iface.name || i + 1}${err}` });
        }
      }

      for (let i = 0; i < config.value.neighbors.length; i++) {
        const neighbor = config.value.neighbors[i];
        if (neighbor.address) {
          const err = validateIPv4(neighbor.address);
          if (err) return showError({ message: `${t('ospf.validation.neighbor')} ${i + 1}${err}` });
        }
        if (neighbor['poll-interval']) {
          const err = validateTimer(neighbor['poll-interval'], 1, 65535, t('ospf.validation.pollInterval'));
          if (err) return showError({ message: `${t('ospf.validation.neighbor')} ${i + 1}${err}` });
        }
        if (neighbor.priority) {
          const err = validatePriority(neighbor.priority);
          if (err) return showError({ message: `${t('ospf.validation.neighbor')} ${i + 1}${t('ospf.validation.priority')} ${err}` });
        }
      }

      for (let i = 0; i < config.value.redistributes.length; i++) {
        const redist = config.value.redistributes[i];
        if (redist.metric) {
          const err = validateMetric(redist.metric);
          if (err) return showError({ message: `${t('ospf.validation.redistribute')} ${redist.protocol || i + 1}${t('ospf.validation.metric')} ${err}` });
        }
        if (redist['metric-type']) {
          const err = validateMetricType(redist['metric-type']);
          if (err) return showError({ message: `${t('ospf.validation.redistribute')} ${redist.protocol || i + 1}${err}` });
        }
      }

      for (let i = 0; i < config.value.redistributeTables.length; i++) {
        const tableItem = config.value.redistributeTables[i];
        if (tableItem.table) {
          const tableNum = parseInt(tableItem.table, 10);
          if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) {
            return showError({ message: `${t('ospf.validation.redistributeTable')} ${i + 1}${t('ospf.validation.tableNumberRange')}` });
          }
        }
        if (tableItem.metric) {
          const err = validateMetric(tableItem.metric);
          if (err) return showError({ message: `${t('ospf.validation.redistributeTable')} ${tableItem.table || i + 1}${t('ospf.validation.metric')} ${err}` });
        }
        if (tableItem['metric-type']) {
          const err = validateMetricType(tableItem['metric-type']);
          if (err) return showError({ message: `${t('ospf.validation.redistributeTable')} ${tableItem.table || i + 1}${err}` });
        }
      }

      if (config.value.timers?.throttle?.spf) {
        const spf = config.value.timers.throttle.spf;
        if (spf.delay) {
          const err = validateTimer(spf.delay, 1, 65535, t('ospf.validation.spfDelay'));
          if (err) return showError({ message: `${t('ospf.validation.spfTimer')}${err}` });
        }
        if (spf['initial-holdtime']) {
          const err = validateTimer(spf['initial-holdtime'], 1, 65535, t('ospf.validation.spfInitialHoldtime'));
          if (err) return showError({ message: `${t('ospf.validation.spfTimer')}${err}` });
        }
        if (spf['max-holdtime']) {
          const err = validateTimer(spf['max-holdtime'], 1, 65535, t('ospf.validation.spfMaxHoldtime'));
          if (err) return showError({ message: `${t('ospf.validation.spfTimer')}${err}` });
        }
      }

      if (config.value['default-information']?.originate) {
        const orig = config.value['default-information'].originate;
        if (orig.metric) {
          const err = validateMetric(orig.metric);
          if (err) return showError({ message: `${t('ospf.validation.defaultInfo')}${t('ospf.validation.metric')} ${err}` });
        }
        if (orig['metric-type']) {
          const err = validateMetricType(orig['metric-type']);
          if (err) return showError({ message: `${t('ospf.validation.defaultInfo')}${err}` });
        }
      }

      if (config.value['distance']?.global) {
        const err = validateDistance(config.value['distance'].global, t('ospf.validation.globalDistance'));
        if (err) return showError({ message: `${t('ospf.validation.distance')}${err}` });
      }
      if (config.value['distance']?.ospf) {
        const ospf = config.value['distance'].ospf;
        if (ospf.external) {
          const err = validateDistance(ospf.external, t('ospf.validation.externalDistance'));
          if (err) return showError({ message: `${t('ospf.validation.distance')}${err}` });
        }
        if (ospf['inter-area']) {
          const err = validateDistance(ospf['inter-area'], t('ospf.validation.interAreaDistance'));
          if (err) return showError({ message: `${t('ospf.validation.distance')}${err}` });
        }
        if (ospf['intra-area']) {
          const err = validateDistance(ospf['intra-area'], t('ospf.validation.intraAreaDistance'));
          if (err) return showError({ message: `${t('ospf.validation.distance')}${err}` });
        }
      }

      if (config.value['graceful-restart']?.['grace-period']) {
        const err = validateGracePeriod(config.value['graceful-restart']['grace-period']);
        if (err) return showError({ message: `${t('ospf.validation.gracefulRestart')}${err}` });
      }

      if (config.value['max-metric']?.['router-lsa']) {
        const routerLsa = config.value['max-metric']['router-lsa'];
        if (routerLsa['on-shutdown']) {
          const err = validateTimer(routerLsa['on-shutdown'], 1, 65535, t('ospf.validation.onShutdown'));
          if (err) return showError({ message: `${t('ospf.validation.maxMetric')}${err}` });
        }
        if (routerLsa['on-startup']) {
          const err = validateTimer(routerLsa['on-startup'], 1, 65535, t('ospf.validation.onStartup'));
          if (err) return showError({ message: `${t('ospf.validation.maxMetric')}${err}` });
        }
      }

      if (config.value['mpls-te']?.['router-address']) {
        const err = validateIPv4(config.value['mpls-te']['router-address']);
        if (err) return showError({ message: `${t('ospf.validation.mplsTe')}${err}` });
      }

      if (config.value['ldp-sync']?.holddown) {
        const err = validateLdpHolddown(config.value['ldp-sync'].holddown);
        if (err) return showError({ message: `${t('ospf.validation.ldpSync')}${err}` });
      }

      if (config.value['segment-routing']) {
        const sr = config.value['segment-routing'];
        if (sr['global-block']) {
          if (sr['global-block']['low-label-value']) {
            const err = validateLabel(sr['global-block']['low-label-value']);
            if (err) return showError({ message: `${t('ospf.validation.segmentRoutingGlobalBlock')}${err}` });
          }
          if (sr['global-block']['high-label-value']) {
            const err = validateLabel(sr['global-block']['high-label-value']);
            if (err) return showError({ message: `${t('ospf.validation.segmentRoutingGlobalBlock')}${err}` });
          }
        }
        if (sr['local-block']) {
          if (sr['local-block']['low-label-value']) {
            const err = validateLabel(sr['local-block']['low-label-value']);
            if (err) return showError({ message: `${t('ospf.validation.segmentRoutingLocalBlock')}${err}` });
          }
          if (sr['local-block']['high-label-value']) {
            const err = validateLabel(sr['local-block']['high-label-value']);
            if (err) return showError({ message: `${t('ospf.validation.segmentRoutingLocalBlock')}${err}` });
          }
        }
      }

      if (config.value['aggregation']?.timer) {
        const err = validateTimer(config.value['aggregation'].timer, 1, 60, t('ospf.validation.aggregationTimer'));
        if (err) return showError({ message: `${t('ospf.validation.aggregation')}${err}` });
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols ospf', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        areaModalVisible.value = false;
        interfaceModalVisible.value = false;
        neighborModalVisible.value = false;
        redistributeModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openAreaModal(index = -1) {
      editingAreaIndex.value = index;
      if (index >= 0) {
        areaForm.value = JSON.parse(JSON.stringify(config.value.areas[index]));
        if (!areaForm.value.virtualLinks) {
          areaForm.value.virtualLinks = [];
        }
      } else {
        areaForm.value = {
          id: '', 'area-type': '', authentication: '', 'export-list': '', 'import-list': '',
          shortcut: false, networks: [], ranges: [], virtualLinks: [],
        };
      }
      areaModalVisible.value = true;
    }

    function addAreaNetwork() {
      areaForm.value.networks.push({ network: '' });
    }

    function removeAreaNetwork(idx) {
      areaForm.value.networks.splice(idx, 1);
    }

    function addAreaRange() {
      areaForm.value.ranges.push({ range: '', 'not-advertise': false, 'advertise-range-cost': '', substitute: '' });
    }

    function removeAreaRange(idx) {
      areaForm.value.ranges.splice(idx, 1);
    }

    function addAreaVirtualLink() {
      areaForm.value.virtualLinks.push({ address: '', authentication: false, 'dead-interval': '', 'hello-interval': '', 'retransmit-interval': '', 'transmit-delay': '' });
    }

    function removeAreaVirtualLink(idx) {
      areaForm.value.virtualLinks.splice(idx, 1);
    }

    function addPassiveInterface() {
      if (newPassiveInterface.value && !config.value['passive-interface'].includes(newPassiveInterface.value)) {
        config.value['passive-interface'].push(newPassiveInterface.value);
        newPassiveInterface.value = '';
      }
    }

    function removePassiveInterface(idx) {
      config.value['passive-interface'].splice(idx, 1);
    }

    function openAccessListModal(index = -1) {
      editingAccessListIndex.value = index;
      if (index >= 0) {
        accessListForm.value = JSON.parse(JSON.stringify(config.value['access-list'][index]));
      } else {
        accessListForm.value = { number: '', export: [] };
      }
      accessListModalVisible.value = true;
    }

    function saveAccessList() {
      if (!accessListForm.value.number) return showError({ message: t('ospf.validation.enterAccessListNumber') });
      if (editingAccessListIndex.value >= 0) {
        config.value['access-list'].splice(editingAccessListIndex.value, 1, JSON.parse(JSON.stringify(accessListForm.value)));
      } else {
        config.value['access-list'].push(JSON.parse(JSON.stringify(accessListForm.value)));
      }
      accessListModalVisible.value = false;
    }

    function deleteAccessList(index) {
      pendingDeleteAccessListNames.value = [config.value['access-list'][index].number];
      deleteAccessListModalVisible.value = true;
    }

    function confirmDeleteAccessList() {
      const index = config.value['access-list'].findIndex(a => String(a.number) === String(pendingDeleteAccessListNames.value[0]));
      if (index >= 0) {
        config.value['access-list'].splice(index, 1);
      }
      deleteAccessListModalVisible.value = false;
      pendingDeleteAccessListNames.value = [];
    }

    function openSummaryAddressModal(index = -1) {
      editingSummaryAddressIndex.value = index;
      if (index >= 0) {
        summaryAddressForm.value = JSON.parse(JSON.stringify(config.value['summary-address'][index]));
      } else {
        summaryAddressForm.value = { address: '', 'no-advertise': false, tag: '' };
      }
      summaryAddressModalVisible.value = true;
    }

    function saveSummaryAddress() {
      if (!summaryAddressForm.value.address) return showError({ message: t('ospf.validation.enterSummaryAddress') });
      const err = validateSummaryAddress(summaryAddressForm.value.address);
      if (err) return showError({ message: err });
      
      if (editingSummaryAddressIndex.value >= 0) {
        config.value['summary-address'].splice(editingSummaryAddressIndex.value, 1, JSON.parse(JSON.stringify(summaryAddressForm.value)));
      } else {
        config.value['summary-address'].push(JSON.parse(JSON.stringify(summaryAddressForm.value)));
      }
      summaryAddressModalVisible.value = false;
    }

    function deleteSummaryAddress(index) {
      pendingDeleteSummaryAddressNames.value = [config.value['summary-address'][index].address];
      deleteSummaryAddressModalVisible.value = true;
    }

    function confirmDeleteSummaryAddress() {
      const index = config.value['summary-address'].findIndex(a => a.address === pendingDeleteSummaryAddressNames.value[0]);
      if (index >= 0) {
        config.value['summary-address'].splice(index, 1);
      }
      deleteSummaryAddressModalVisible.value = false;
      pendingDeleteSummaryAddressNames.value = [];
    }

    function saveArea() {
      if (!areaForm.value.id) return showError({ message: t('ospf.validation.enterAreaId') });
      const err = validateAreaId(areaForm.value.id);
      if (err) return showError({ message: err });
      for (const net of areaForm.value.networks) {
        const netErr = validateNetwork(net.network);
        if (netErr) return showError({ message: netErr });
      }
      for (const range of areaForm.value.ranges) {
        const rangeErr = validateNetwork(range.range);
        if (rangeErr) return showError({ message: `${t('ospf.validation.summaryRange')}${rangeErr}` });
        if (range['advertise-range-cost']) {
          const costErr = validateAdvertiseRangeCost(range['advertise-range-cost']);
          if (costErr) return showError({ message: `${t('ospf.validation.summaryRange')}${costErr}` });
        }
        if (range['substitute']) {
          const subErr = validateNetwork(range['substitute']);
          if (subErr) return showError({ message: `${t('ospf.validation.substituteAddress')}${subErr}` });
        }
      }
      for (let i = 0; i < areaForm.value.virtualLinks.length; i++) {
        const vlink = areaForm.value.virtualLinks[i];
        if (!vlink.address) return showError({ message: `${t('ospf.validation.virtualLink')} ${i + 1}${t('ospf.validation.enterNeighborRouterId')}` });
        const addrErr = validateIPv4(vlink.address);
        if (addrErr) return showError({ message: `${t('ospf.validation.virtualLink')} ${i + 1}${addrErr}` });
        if (vlink['hello-interval']) {
          const helloErr = validateTimer(vlink['hello-interval'], 1, 65535, t('ospf.validation.helloInterval'));
          if (helloErr) return showError({ message: `${t('ospf.validation.virtualLink')} ${vlink.address}${helloErr}` });
        }
        if (vlink['dead-interval']) {
          const deadErr = validateTimer(vlink['dead-interval'], 1, 65535, t('ospf.validation.deadInterval'));
          if (deadErr) return showError({ message: `${t('ospf.validation.virtualLink')} ${vlink.address}${deadErr}` });
        }
        if (vlink['retransmit-interval']) {
          const retransmitErr = validateTimer(vlink['retransmit-interval'], 1, 65535, t('ospf.validation.retransmitInterval'));
          if (retransmitErr) return showError({ message: `${t('ospf.validation.virtualLink')} ${vlink.address}${retransmitErr}` });
        }
        if (vlink['transmit-delay']) {
          const delayErr = validateTimer(vlink['transmit-delay'], 1, 65535, t('ospf.validation.transmitDelay'));
          if (delayErr) return showError({ message: `${t('ospf.validation.virtualLink')} ${vlink.address}${delayErr}` });
        }
      }
      if (editingAreaIndex.value >= 0) {
        config.value.areas.splice(editingAreaIndex.value, 1, JSON.parse(JSON.stringify(areaForm.value)));
      } else {
        config.value.areas.push(JSON.parse(JSON.stringify(areaForm.value)));
      }
      areaModalVisible.value = false;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('ospf.validation.enterInterfaceName') });
      if (interfaceForm.value.cost) {
        const err = validateCost(interfaceForm.value.cost);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value.bandwidth) {
        const err = validateBandwidth(interfaceForm.value.bandwidth);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value.priority) {
        const err = validatePriority(interfaceForm.value.priority);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['hello-interval']) {
        const err = validateTimer(interfaceForm.value['hello-interval'], 1, 65535, t('ospf.validation.helloInterval'));
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['dead-interval']) {
        const err = validateTimer(interfaceForm.value['dead-interval'], 1, 65535, t('ospf.validation.deadInterval'));
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['retransmit-interval']) {
        const err = validateTimer(interfaceForm.value['retransmit-interval'], 1, 65535, t('ospf.validation.retransmitInterval'));
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['transmit-delay']) {
        const err = validateTimer(interfaceForm.value['transmit-delay'], 1, 65535, t('ospf.validation.transmitDelay'));
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['hello-multiplier']) {
        const err = validateHelloMultiplier(interfaceForm.value['hello-multiplier']);
        if (err) return showError({ message: err });
      }
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function saveNeighbor() {
      if (!neighborForm.value.address) return showError({ message: t('ospf.validation.enterNeighborAddress') });
      const err = validateIPv4(neighborForm.value.address);
      if (err) return showError({ message: err });
      if (neighborForm.value['poll-interval']) {
        const err = validatePollInterval(neighborForm.value['poll-interval']);
        if (err) return showError({ message: err });
      }
      if (neighborForm.value.priority) {
        const err = validatePriority(neighborForm.value.priority);
        if (err) return showError({ message: err });
      }
      if (editingNeighborIndex.value >= 0) {
        config.value.neighbors.splice(editingNeighborIndex.value, 1, JSON.parse(JSON.stringify(neighborForm.value)));
      } else {
        config.value.neighbors.push(JSON.parse(JSON.stringify(neighborForm.value)));
      }
      neighborModalVisible.value = false;
    }

    function saveRedistribute() {
      if (!redistributeForm.value.protocol) return showError({ message: t('ospf.validation.selectProtocol') });
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return showError({ message: err });
      }
      if (redistributeForm.value['metric-type']) {
        const err = validateMetricType(redistributeForm.value['metric-type']);
        if (err) return showError({ message: err });
      }
      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, JSON.parse(JSON.stringify(redistributeForm.value)));
      } else {
        config.value.redistributes.push(JSON.parse(JSON.stringify(redistributeForm.value)));
      }
      redistributeModalVisible.value = false;
    }

    function openRedistributeTableModal(index = -1) {
      editingRedistributeTableIndex.value = index;
      if (index >= 0) {
        redistributeTableForm.value = JSON.parse(JSON.stringify(config.value.redistributeTables[index]));
      } else {
        redistributeTableForm.value = { table: '', metric: '', 'metric-type': '', 'route-map': '' };
      }
      redistributeTableModalVisible.value = true;
    }

    function saveRedistributeTable() {
      if (!redistributeTableForm.value.table) return showError({ message: t('ospf.validation.enterTableId') });
      const tableNum = parseInt(redistributeTableForm.value.table, 10);
      if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) return showError({ message: t('ospf.validation.tableIdRange') });
      if (redistributeTableForm.value.metric) {
        const err = validateMetric(redistributeTableForm.value.metric);
        if (err) return showError({ message: err });
      }
      if (redistributeTableForm.value['metric-type']) {
        const err = validateMetricType(redistributeTableForm.value['metric-type']);
        if (err) return showError({ message: err });
      }
      if (editingRedistributeTableIndex.value >= 0) {
        config.value.redistributeTables.splice(editingRedistributeTableIndex.value, 1, JSON.parse(JSON.stringify(redistributeTableForm.value)));
      } else {
        config.value.redistributeTables.push(JSON.parse(JSON.stringify(redistributeTableForm.value)));
      }
      redistributeTableModalVisible.value = false;
    }

    function deleteRedistributeTable(index) {
      pendingDeleteRedistributeTableNames.value = [config.value.redistributeTables[index].table];
      deleteRedistributeTableModalVisible.value = true;
    }

    function confirmDeleteRedistributeTable() {
      const index = config.value.redistributeTables.findIndex(a => String(a.table) === String(pendingDeleteRedistributeTableNames.value[0]));
      if (index >= 0) {
        config.value.redistributeTables.splice(index, 1);
      }
      deleteRedistributeTableModalVisible.value = false;
      pendingDeleteRedistributeTableNames.value = [];
    }

    function openInterfaceModal(index = -1) {
      editingInterfaceIndex.value = index;
      if (index >= 0) {
        interfaceForm.value = JSON.parse(JSON.stringify(config.value.interfaces[index]));
      } else {
        interfaceForm.value = {
          name: '', area: '', bandwidth: '', bfd: false, cost: '', 'dead-interval': '',
          'hello-interval': '', 'hello-multiplier': '', 'mtu-ignore': false, network: '',
          passive: false, priority: '', 'retransmit-interval': '', 'transmit-delay': '',
        };
      }
      interfaceModalVisible.value = true;
    }

    function openNeighborModal(index = -1) {
      editingNeighborIndex.value = index;
      if (index >= 0) {
        neighborForm.value = JSON.parse(JSON.stringify(config.value.neighbors[index]));
      } else {
        neighborForm.value = { address: '', 'poll-interval': '', priority: '' };
      }
      neighborModalVisible.value = true;
    }

    function openRedistributeModal(index = -1) {
      editingRedistributeIndex.value = index;
      if (index >= 0) {
        redistributeForm.value = JSON.parse(JSON.stringify(config.value.redistributes[index]));
      } else {
        redistributeForm.value = { protocol: '', metric: '', 'metric-type': '', 'route-map': '' };
      }
      redistributeModalVisible.value = true;
    }

    function deleteArea(index) {
      pendingDeleteAreaNames.value = [config.value.areas[index].id];
      deleteAreaModalVisible.value = true;
    }

    function confirmDeleteArea() {
      const index = config.value.areas.findIndex(a => a.id === pendingDeleteAreaNames.value[0]);
      if (index >= 0) {
        config.value.areas.splice(index, 1);
      }
      deleteAreaModalVisible.value = false;
      pendingDeleteAreaNames.value = [];
    }

    function deleteInterface(index) {
      pendingDeleteInterfaceNames.value = [config.value.interfaces[index].name];
      deleteInterfaceModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      const index = config.value.interfaces.findIndex(a => a.name === pendingDeleteInterfaceNames.value[0]);
      if (index >= 0) {
        config.value.interfaces.splice(index, 1);
      }
      deleteInterfaceModalVisible.value = false;
      pendingDeleteInterfaceNames.value = [];
    }

    function deleteNeighbor(index) {
      pendingDeleteNeighborNames.value = [config.value.neighbors[index].address];
      deleteNeighborModalVisible.value = true;
    }

    function confirmDeleteNeighbor() {
      const index = config.value.neighbors.findIndex(a => a.address === pendingDeleteNeighborNames.value[0]);
      if (index >= 0) {
        config.value.neighbors.splice(index, 1);
      }
      deleteNeighborModalVisible.value = false;
      pendingDeleteNeighborNames.value = [];
    }

    function deleteRedistribute(index) {
      pendingDeleteRedistributeNames.value = [config.value.redistributes[index].protocol];
      deleteRedistributeModalVisible.value = true;
    }

    function confirmDeleteRedistribute() {
      const index = config.value.redistributes.findIndex(a => a.protocol === pendingDeleteRedistributeNames.value[0]);
      if (index >= 0) {
        config.value.redistributes.splice(index, 1);
      }
      deleteRedistributeModalVisible.value = false;
      pendingDeleteRedistributeNames.value = [];
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      newPassiveInterface, addPassiveInterface, removePassiveInterface,
      accessListModalVisible, editingAccessListIndex, accessListForm,
      accessListColumns, EXPORT_PROTOCOL_OPTIONS,
      openAccessListModal, saveAccessList, deleteAccessList, confirmDeleteAccessList,
      deleteAccessListModalVisible, pendingDeleteAccessListNames,
      summaryAddressModalVisible, editingSummaryAddressIndex, summaryAddressForm,
      openSummaryAddressModal, saveSummaryAddress, deleteSummaryAddress, confirmDeleteSummaryAddress,
      deleteSummaryAddressModalVisible, pendingDeleteSummaryAddressNames,
      areaModalVisible, editingAreaIndex, areaForm,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      neighborModalVisible, editingNeighborIndex, neighborForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      redistributeTableModalVisible, editingRedistributeTableIndex, redistributeTableForm,
      openRedistributeTableModal, saveRedistributeTable, deleteRedistributeTable, confirmDeleteRedistributeTable,
      deleteRedistributeTableModalVisible, pendingDeleteRedistributeTableNames,
      deleteAreaModalVisible, pendingDeleteAreaNames, confirmDeleteArea,
      deleteInterfaceModalVisible, pendingDeleteInterfaceNames, confirmDeleteInterface,
      deleteNeighborModalVisible, pendingDeleteNeighborNames, confirmDeleteNeighbor,
      deleteRedistributeModalVisible, pendingDeleteRedistributeNames, confirmDeleteRedistribute,
      areaColumns, interfaceColumns, neighborColumns, redistributeColumns, redistributeTableColumns, summaryAddressColumns,
      AREA_TYPE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, AUTH_TYPE_OPTIONS, commandPath,
      openAreaModal, openInterfaceModal, openNeighborModal, openRedistributeModal,
      deleteArea, deleteInterface, deleteNeighbor, deleteRedistribute,
      addAreaNetwork, removeAreaNetwork, addAreaRange, removeAreaRange, addAreaVirtualLink, removeAreaVirtualLink, saveArea,
      saveInterface, saveNeighbor, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('common.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('ospf.tabs.basic') },
        { key: 'areas', title: t('ospf.tabs.areas') },
        { key: 'interfaces', title: t('ospf.tabs.interfaces') },
        { key: 'neighbors', title: t('ospf.tabs.neighbors') },
        { key: 'redistribute', title: t('ospf.tabs.redistribute') },
        { key: 'access-list', title: t('ospf.tabs.accessList') },
        { key: 'summary-address', title: t('ospf.tabs.summaryAddress') },
        { key: 'distance', title: t('ospf.tabs.distance') },
        { key: 'graceful-restart', title: t('ospf.tabs.gracefulRestart') },
        { key: 'timers', title: t('ospf.tabs.timers') },
        { key: 'default-info', title: t('ospf.tabs.defaultInfo') },
        { key: 'max-metric', title: t('ospf.tabs.maxMetric') },
        { key: 'mpls-te', title: t('ospf.tabs.mplsTe') },
        { key: 'ldp-sync', title: t('ospf.tabs.ldpSync') },
        { key: 'segment-routing', title: t('ospf.tabs.segmentRouting') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.basic.parameters') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.routerId') }}</label>
                  <input type="text" class="form-control" v-model="config['router-id']"
                         :placeholder="t('ospf.basic.routerIdPlaceholder')" style="width:100%;"
                         :title="t('ospf.basic.routerIdTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.abrType') }}</label>
                  <select class="form-control" v-model="config['parameters']['abr-type']" style="width:100%;">
                    <option value="">{{ t('ospf.basic.abrTypeDefault') }}</option>
                    <option value="cisco">Cisco</option>
                    <option value="ibm">IBM</option>
                    <option value="shortcut">Shortcut</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.opaqueLsa') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['parameters']['opaque-lsa']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.rfc1583') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['parameters']['rfc1583-compatibility']" /></label>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.basic.config') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.defaultMetric') }}</label>
                  <input type="number" class="form-control" v-model="config['default-metric']"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                         :title="t('ospf.basic.defaultMetricTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.maxPaths') }}</label>
                  <input type="number" class="form-control" v-model="config['maximum-paths']"
                         min="1" max="64" placeholder="1-64" style="width:100%;"
                         :title="t('ospf.basic.maxPathsTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.refBandwidth') }}</label>
                  <input type="number" class="form-control" v-model="config['auto-cost']['reference-bandwidth']"
                         min="1" max="4000000" placeholder="1-4000000 Kbit/s" style="width:100%;"
                         :title="t('ospf.basic.refBandwidthTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.logAdjacency') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.passiveInterface') }}</label>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <select class="form-control" v-model="newPassiveInterface" style="width:100%;" :title="t('ospf.basic.selectPassiveInterface')">
                      <option value="">{{ t('ospf.basic.selectInterface') }}</option>
                      <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
                    </select>
                    <ToolbarButton size="small" @click="addPassiveInterface">{{ t('common.add') }}</ToolbarButton>
                  </div>
                </div>
                <div v-if="config['passive-interface'].length > 0" class="form-row">
                  <label class="form-label"></label>
                  <div style="display:flex; flex-direction:column; gap:5px;">
                    <div v-for="(iface, idx) in config['passive-interface']" :key="idx"
                         style="display:flex; gap:10px; align-items:center;">
                      <span>{{ iface }}</span>
                      <ToolbarButton size="small" danger @click="removePassiveInterface(idx)">{{ t('common.delete') }}</ToolbarButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.basic.capability') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.enableOpaqueLsa') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['capability'].opaque" /></label>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.basic.externalAggregation') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.delayTimer') }}</label>
                  <input type="number" class="form-control" v-model="config['aggregation']['timer']"
                         min="5" max="1800" :placeholder="t('ospf.basic.delayTimerPlaceholder')" style="width:100%;"
                         :title="t('ospf.basic.delayTimerTitle')" />
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.basic.lsaRefresh') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.basic.refreshTimer') }}</label>
                  <input type="number" class="form-control" v-model="config.refresh.timers"
                         min="10" max="1800" :placeholder="t('ospf.basic.refreshTimerPlaceholder')" style="width:100%;"
                         :title="t('ospf.basic.refreshTimerTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #areas>
          <DataTable :columns="areaColumns" :data="config.areas" :loading="loading" :disabled="writeDisabled"
                     rowKey="id" :actions="['create', 'edit', 'delete']"
                     @create="openAreaModal(-1)" @edit="openAreaModal" @delete="deleteArea" />
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #neighbors>
          <DataTable :columns="neighborColumns" :data="config.neighbors" :loading="loading" :disabled="writeDisabled"
                     rowKey="address" :actions="['create', 'edit', 'delete']"
                     @create="openNeighborModal(-1)" @edit="openNeighborModal" @delete="deleteNeighbor" />
        </template>

        <template #redistribute>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.redistribute.protocolRedist') }}</div>
              <div style="padding:16px;">
                <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                           rowKey="protocol" :actions="['create', 'edit', 'delete']"
                           @create="openRedistributeModal(-1)" @edit="openRedistributeModal" @delete="deleteRedistribute" />
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.redistribute.tableRedist') }}</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">{{ t('ospf.redistribute.tableRedistDesc') }}</p>
                <DataTable :columns="redistributeTableColumns" :data="config.redistributeTables" :loading="loading" :disabled="writeDisabled"
                           rowKey="table" :actions="['create', 'edit', 'delete']"
                           @create="openRedistributeTableModal(-1)" @edit="openRedistributeTableModal" @delete="deleteRedistributeTable" />
              </div>
            </div>
          </div>
        </template>

        <template #timers>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.timers.spfTimer') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.timers.delay') }}</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf.delay"
                         min="1" max="65535" :placeholder="t('ospf.timers.delayPlaceholder')" style="width:100%;"
                         :title="t('ospf.timers.delayTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.timers.initialHoldtime') }}</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf['initial-holdtime']"
                         min="1" max="65535" :placeholder="t('ospf.timers.initialHoldtimePlaceholder')" style="width:100%;"
                         :title="t('ospf.timers.initialHoldtimeTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.timers.maxHoldtime') }}</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf['max-holdtime']"
                         min="1" max="65535" :placeholder="t('ospf.timers.maxHoldtimePlaceholder')" style="width:100%;"
                         :title="t('ospf.timers.maxHoldtimeTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>



        <template #default-info>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.defaultInfo.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.defaultInfo.alwaysOriginate') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.defaultInfo.metric') }}</label>
                  <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                         :title="t('ospf.defaultInfo.metricTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.defaultInfo.metricType') }}</label>
                  <select class="form-control" v-model="config['default-information'].originate['metric-type']" style="width:100%;">
                    <option value="">{{ t('ospf.defaultInfo.metricTypeDefault') }}</option>
                    <option value="1">{{ t('ospf.defaultInfo.metricType1') }}</option>
                    <option value="2">{{ t('ospf.defaultInfo.metricType2') }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.defaultInfo.routeMap') }}</label>
                  <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                         :placeholder="t('ospf.defaultInfo.routeMapPlaceholder')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #access-list>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.accessList.title') }}</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">{{ t('ospf.accessList.desc') }}</p>
                <DataTable :columns="accessListColumns" :data="config['access-list']" :loading="loading" :disabled="writeDisabled"
                           rowKey="number" :actions="['create', 'edit', 'delete']"
                           @create="openAccessListModal(-1)" @edit="openAccessListModal" @delete="deleteAccessList" />
              </div>
            </div>
          </div>
        </template>

        <template #summary-address>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.summaryAddress.title') }}</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">{{ t('ospf.summaryAddress.desc') }}</p>
                <DataTable :columns="summaryAddressColumns" :data="config['summary-address']" :loading="loading" :disabled="writeDisabled"
                           rowKey="address" :actions="['create', 'edit', 'delete']"
                           @create="openSummaryAddressModal(-1)" @edit="openSummaryAddressModal" @delete="deleteSummaryAddress" />
              </div>
            </div>
          </div>
        </template>

        <template #distance>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.distance.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.distance.global') }}</label>
                  <input type="number" class="form-control" v-model="config['distance']['global']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         :title="t('ospf.distance.globalTitle')" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.distance.ospfSpecific') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.distance.external') }}</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['external']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         :title="t('ospf.distance.externalTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.distance.interArea') }}</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['inter-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         :title="t('ospf.distance.interAreaTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.distance.intraArea') }}</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['intra-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         :title="t('ospf.distance.intraAreaTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #graceful-restart>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.gracefulRestart.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.gracefulRestart.gracePeriod') }}</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart']['grace-period']"
                         min="1" max="1800" :placeholder="t('ospf.gracefulRestart.gracePeriodPlaceholder')" style="width:100%;"
                         :title="t('ospf.gracefulRestart.gracePeriodTitle')" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.gracefulRestart.helperConfig') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.gracefulRestart.enableHelper') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart']['helper']['enable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.gracefulRestart.plannedOnly') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart']['helper']['planned-only']" /></label>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #max-metric>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.maxMetric.title') }}</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">{{ t('ospf.maxMetric.desc') }}</p>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.maxMetric.administrative') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['max-metric']['router-lsa']['administrative']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.maxMetric.onShutdown') }}</label>
                  <input type="number" class="form-control" v-model="config['max-metric']['router-lsa']['on-shutdown']"
                         min="1" max="65535" :placeholder="t('ospf.maxMetric.onShutdownPlaceholder')" style="width:100%;"
                         :title="t('ospf.maxMetric.onShutdownTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.maxMetric.onStartup') }}</label>
                  <input type="number" class="form-control" v-model="config['max-metric']['router-lsa']['on-startup']"
                         min="1" max="65535" :placeholder="t('ospf.maxMetric.onStartupPlaceholder')" style="width:100%;"
                         :title="t('ospf.maxMetric.onStartupTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #mpls-te>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.mplsTe.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.mplsTe.enable') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['mpls-te']['enable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.mplsTe.routerAddress') }}</label>
                  <input type="text" class="form-control" v-model="config['mpls-te']['router-address']"
                         :placeholder="t('ospf.mplsTe.routerAddressPlaceholder')" style="width:100%;"
                         :title="t('ospf.mplsTe.routerAddressTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #ldp-sync>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.ldpSync.title') }}</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">{{ t('ospf.ldpSync.desc') }}</p>
                <div class="form-row">
                  <label class="form-label">{{ t('ospf.ldpSync.holddown') }}</label>
                  <input type="number" class="form-control" v-model="config['ldp-sync']['holddown']"
                         min="0" max="10000" :placeholder="t('ospf.ldpSync.holddownPlaceholder')" style="width:100%;"
                         :title="t('ospf.ldpSync.holddownTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #segment-routing>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('ospf.segmentRouting.title') }}</div>
              <div style="padding:16px;">
                <div style="margin-top:8px; border:1px solid #e8e8e8; border-radius:4px; overflow:hidden;">
                  <div style="background:#fafafa; padding:8px 14px; font-weight:bold; font-size:13px; border-bottom:1px solid #e8e8e8;">{{ t('ospf.segmentRouting.globalBlock') }}</div>
                  <div style="padding:12px 14px;">
                    <div class="form-row">
                      <label class="form-label">{{ t('ospf.segmentRouting.lowLabelValue') }}</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['global-block']['low-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             :title="t('ospf.segmentRouting.lowLabelTitle')" />
                    </div>
                    <div class="form-row">
                      <label class="form-label">{{ t('ospf.segmentRouting.highLabelValue') }}</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['global-block']['high-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             :title="t('ospf.segmentRouting.highLabelTitle')" />
                    </div>
                  </div>
                </div>
                <div style="margin-top:12px; border:1px solid #e8e8e8; border-radius:4px; overflow:hidden;">
                  <div style="background:#fafafa; padding:8px 14px; font-weight:bold; font-size:13px; border-bottom:1px solid #e8e8e8;">{{ t('ospf.segmentRouting.localBlock') }}</div>
                  <div style="padding:12px 14px;">
                    <div class="form-row">
                      <label class="form-label">{{ t('ospf.segmentRouting.lowLabelValue') }}</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['local-block']['low-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             :title="t('ospf.segmentRouting.lowLabelTitle')" />
                    </div>
                    <div class="form-row">
                      <label class="form-label">{{ t('ospf.segmentRouting.highLabelValue') }}</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['local-block']['high-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             :title="t('ospf.segmentRouting.highLabelTitle')" />
                    </div>
                  </div>
                </div>
                <div class="form-row" style="margin-top:12px;">
                  <label class="form-label">{{ t('ospf.segmentRouting.maxLabelDepth') }}</label>
                  <input type="number" class="form-control" v-model="config['segment-routing']['maximum-label-depth']"
                         min="1" max="10" placeholder="1-10" style="width:100%;"
                         :title="t('ospf.segmentRouting.maxLabelDepthTitle')" />
                </div>
              </div>
            </div>
          </div>
        </template>


      </TabGroup>

      <!-- Summary Address Modal -->
      <DraggableModal v-model:visible="summaryAddressModalVisible" :title="editingSummaryAddressIndex >= 0 ? t('ospf.summaryAddress.editTitle') : t('ospf.summaryAddress.addTitle')" width="600px" @confirm="saveSummaryAddress">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.summaryAddress.addressLabel') }} *</label>
          <input type="text" class="form-control" v-model="summaryAddressForm.address"
                 :placeholder="t('ospf.summaryAddress.addressPlaceholder')" style="width:100%;"
                 :title="t('ospf.summaryAddress.addressTitle')" :disabled="editingSummaryAddressIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.summaryAddress.noAdvertiseLabel') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="summaryAddressForm['no-advertise']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.summaryAddress.tagLabel') }}</label>
          <input type="number" class="form-control" v-model="summaryAddressForm.tag"
                 min="0" max="4294967295" placeholder="0-4294967295" style="width:100%;"
                 :title="t('ospf.summaryAddress.tagTitle')" />
        </div>
      </DraggableModal>

      <!-- Access List Modal -->
      <DraggableModal v-model:visible="accessListModalVisible" :title="editingAccessListIndex >= 0 ? t('ospf.accessList.editTitle') : t('ospf.accessList.addTitle')" width="600px" @confirm="saveAccessList">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.accessList.numberLabel') }} *</label>
          <input type="number" class="form-control" v-model="accessListForm.number"
                 min="0" max="4294967295" placeholder="0-4294967295" style="width:100%;"
                 :title="t('ospf.accessList.numberTitle')" :disabled="editingAccessListIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.accessList.exportProtocols') }}</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
            <label v-for="opt in EXPORT_PROTOCOL_OPTIONS" :key="opt.value"
                   style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" :value="opt.value" v-model="accessListForm.export" />
              {{ opt.label }}
            </label>
          </div>
        </div>
      </DraggableModal>

      <!-- Area Modal -->
      <DraggableModal v-model:visible="areaModalVisible" :title="editingAreaIndex >= 0 ? t('ospf.area.editTitle') : t('ospf.area.addTitle')" width="600px" @confirm="saveArea">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.idLabel') }} *</label>
          <input type="text" class="form-control" v-model="areaForm.id"
                 :placeholder="t('ospf.area.idPlaceholder')" style="width:100%;"
                 :title="t('ospf.area.idTitle')" :disabled="editingAreaIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.typeLabel') }}</label>
          <select class="form-control" v-model="areaForm['area-type']" style="width:100%;">
            <option v-for="opt in AREA_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.authType') }}</label>
          <select class="form-control" v-model="areaForm.authentication" style="width:100%;">
            <option v-for="opt in AUTH_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.exportList') }}</label>
          <input type="text" class="form-control" v-model="areaForm['export-list']"
                 :placeholder="t('ospf.area.accessListName')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.importList') }}</label>
          <input type="text" class="form-control" v-model="areaForm['import-list']"
                 :placeholder="t('ospf.area.accessListName')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.area.enableShortcut') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="areaForm.shortcut" /></label>
        </div>

        <h4 style="margin-top:20px;">{{ t('ospf.area.networks') }}</h4>
        <div v-for="(net, idx) in areaForm.networks" :key="idx" style="display:flex; gap:10px; margin-bottom:10px;">
          <input type="text" class="form-control" v-model="net.network"
                 :placeholder="t('ospf.area.networkPlaceholder')" style="flex:1;"
                 :title="t('ospf.area.networkTitle')" />
          <ToolbarButton size="small" danger @click="removeAreaNetwork(idx)">{{ t('common.delete') }}</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addAreaNetwork">{{ t('ospf.area.addNetwork') }}</ToolbarButton>

        <h4 style="margin-top:20px;">{{ t('ospf.area.summaryRanges') }}</h4>
        <div v-for="(range, idx) in areaForm.ranges" :key="idx" style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:4px;">
          <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
            <input type="text" class="form-control" v-model="range.range"
                   :placeholder="t('ospf.area.rangePlaceholder')" style="flex:1;"
                   :title="t('ospf.area.rangeTitle')" />
            <ToolbarButton size="small" danger @click="removeAreaRange(idx)">{{ t('common.delete') }}</ToolbarButton>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="number" class="form-control" v-model="range['advertise-range-cost']"
                   min="1" max="65535" :placeholder="t('ospf.area.costPlaceholder')" style="width:150px;"
                   :title="t('ospf.area.costTitle')" />
            <input type="text" class="form-control" v-model="range.substitute"
                   :placeholder="t('ospf.area.substitutePlaceholder')" style="flex:1;"
                   :title="t('ospf.area.substituteTitle')" />
            <label style="white-space:nowrap;">
              <input type="checkbox" v-model="range['not-advertise']" />
              {{ t('ospf.area.noAdvertise') }}
            </label>
          </div>
        </div>
        <ToolbarButton size="small" @click="addAreaRange">{{ t('ospf.area.addSummaryRange') }}</ToolbarButton>

        <h4 style="margin-top:20px;">{{ t('ospf.area.virtualLinks') }}</h4>
        <div v-for="(vlink, idx) in areaForm.virtualLinks" :key="idx" style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:4px;">
          <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
            <input type="text" class="form-control" v-model="vlink.address"
                   :placeholder="t('ospf.area.vlinkPlaceholder')" style="flex:1;"
                   :title="t('ospf.area.vlinkTitle')" />
            <ToolbarButton size="small" danger @click="removeAreaVirtualLink(idx)">{{ t('common.delete') }}</ToolbarButton>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <input type="number" class="form-control" v-model="vlink['hello-interval']"
                   min="1" max="65535" :placeholder="t('ospf.area.helloIntervalPlaceholder')"
                   :title="t('ospf.area.helloIntervalTitle')" />
            <input type="number" class="form-control" v-model="vlink['dead-interval']"
                   min="1" max="65535" :placeholder="t('ospf.area.deadIntervalPlaceholder')"
                   :title="t('ospf.area.deadIntervalTitle')" />
            <input type="number" class="form-control" v-model="vlink['retransmit-interval']"
                   min="1" max="65535" :placeholder="t('ospf.area.retransmitIntervalPlaceholder')"
                   :title="t('ospf.area.retransmitIntervalTitle')" />
            <input type="number" class="form-control" v-model="vlink['transmit-delay']"
                   min="1" max="65535" :placeholder="t('ospf.area.transmitDelayPlaceholder')"
                   :title="t('ospf.area.transmitDelayTitle')" />
          </div>
          <div style="margin-top:10px;">
            <label>
              <input type="checkbox" v-model="vlink.authentication" />
              {{ t('ospf.area.enableAuth') }}
            </label>
          </div>
        </div>
        <ToolbarButton size="small" @click="addAreaVirtualLink">{{ t('ospf.area.addVirtualLink') }}</ToolbarButton>
      </DraggableModal>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('ospf.interface.editTitle') : t('ospf.interface.addTitle')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.nameLabel') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('ospf.interface.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.area') }}</label>
          <input type="text" class="form-control" v-model="interfaceForm.area"
                 :placeholder="t('ospf.interface.areaPlaceholder')" style="width:100%;"
                 :title="t('ospf.interface.areaTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.cost') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost"
                 min="1" max="65535" placeholder="1-65535" style="width:100%;"
                 :title="t('ospf.interface.costTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.bandwidth') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.bandwidth"
                 min="1" max="100000" placeholder="1-100000" style="width:100%;"
                 :title="t('ospf.interface.bandwidthTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.networkType') }}</label>
          <select class="form-control" v-model="interfaceForm.network" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']"
                 min="1" max="65535" :placeholder="t('ospf.interface.helloIntervalPlaceholder')" style="width:100%;"
                 :title="t('ospf.interface.helloIntervalTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.helloMultiplier') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-multiplier']"
                 min="1" max="10" placeholder="1-10" style="width:100%;"
                 :title="t('ospf.interface.helloMultiplierTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.deadInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['dead-interval']"
                 min="1" max="65535" :placeholder="t('ospf.interface.deadIntervalPlaceholder')" style="width:100%;"
                 :title="t('ospf.interface.deadIntervalTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.retransmitInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['retransmit-interval']"
                 min="1" max="65535" :placeholder="t('ospf.interface.retransmitIntervalPlaceholder')" style="width:100%;"
                 :title="t('ospf.interface.retransmitIntervalTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.transmitDelay') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['transmit-delay']"
                 min="1" max="65535" :placeholder="t('ospf.interface.transmitDelayPlaceholder')" style="width:100%;"
                 :title="t('ospf.interface.transmitDelayTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.priority') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.priority"
                 min="0" max="255" placeholder="0-255" style="width:100%;"
                 :title="t('ospf.interface.priorityTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.enableBfd') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.bfd" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.passiveMode') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.passive" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.interface.ignoreMtu') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['mtu-ignore']" /></label>
        </div>
      </DraggableModal>

      <!-- Neighbor Modal -->
      <DraggableModal v-model:visible="neighborModalVisible" :title="editingNeighborIndex >= 0 ? t('ospf.neighbor.editTitle') : t('ospf.neighbor.addTitle')" width="600px" @confirm="saveNeighbor">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.neighbor.addressLabel') }} *</label>
          <input type="text" class="form-control" v-model="neighborForm.address"
                 :placeholder="t('ospf.neighbor.addressPlaceholder')" style="width:100%;"
                 :title="t('ospf.neighbor.addressTitle')" :disabled="editingNeighborIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.neighbor.pollIntervalLabel') }}</label>
          <input type="number" class="form-control" v-model="neighborForm['poll-interval']"
                 min="1" max="65535" :placeholder="t('ospf.neighbor.pollIntervalPlaceholder')" style="width:100%;"
                 :title="t('ospf.neighbor.pollIntervalTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.neighbor.priorityLabel') }}</label>
          <input type="number" class="form-control" v-model="neighborForm.priority"
                 min="0" max="255" placeholder="0-255" style="width:100%;"
                 :title="t('ospf.neighbor.priorityTitle')" />
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? t('ospf.redistribute.editTitle') : t('ospf.redistribute.addTitle')" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistribute.protocolLabel') }} *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistribute.metricLabel') }}</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 :title="t('ospf.redistribute.metricTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistribute.metricTypeLabel') }}</label>
          <select class="form-control" v-model="redistributeForm['metric-type']" style="width:100%;">
            <option value="">{{ t('ospf.redistribute.metricTypeDefault') }}</option>
            <option value="1">{{ t('ospf.redistribute.metricType1') }}</option>
            <option value="2">{{ t('ospf.redistribute.metricType2') }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistribute.routeMapLabel') }}</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']"
                 :placeholder="t('ospf.redistribute.routeMapPlaceholder')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Redistribute Table Modal -->
      <DraggableModal v-model:visible="redistributeTableModalVisible" :title="editingRedistributeTableIndex >= 0 ? t('ospf.redistributeTable.editTitle') : t('ospf.redistributeTable.addTitle')" width="600px" @confirm="saveRedistributeTable">
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistributeTable.tableIdLabel') }} *</label>
          <input type="number" class="form-control" v-model="redistributeTableForm.table"
                 min="1" max="200" placeholder="1-200" style="width:100%;"
                 :title="t('ospf.redistributeTable.tableIdTitle')" :disabled="editingRedistributeTableIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistributeTable.metricLabel') }}</label>
          <input type="number" class="form-control" v-model="redistributeTableForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 :title="t('ospf.redistributeTable.metricTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistributeTable.metricTypeLabel') }}</label>
          <select class="form-control" v-model="redistributeTableForm['metric-type']" style="width:100%;">
            <option value="">{{ t('ospf.redistributeTable.metricTypeDefault') }}</option>
            <option value="1">{{ t('ospf.redistributeTable.metricType1') }}</option>
            <option value="2">{{ t('ospf.redistributeTable.metricType2') }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ospf.redistributeTable.routeMapLabel') }}</label>
          <input type="text" class="form-control" v-model="redistributeTableForm['route-map']"
                 :placeholder="t('ospf.redistributeTable.routeMapPlaceholder')" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
