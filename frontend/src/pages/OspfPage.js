import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateAreaId(value) {
  if (!value) return '';
  // 支持数字格式 (0-4294967295) 或点分十进制格式
  if (/^\d+$/.test(value)) {
    const n = parseInt(value, 10);
    if (n < 0 || n > 4294967295) return '区域 ID 必须在 0-4294967295 之间';
  } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return '区域 ID 格式错误 (数字或点分十进制)';
  }
  return '';
}

function validateNetwork(value) {
  if (!value) return '';
  const match = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
  if (!match) return '网络格式错误 (例如: 192.168.1.0/24)';
  const [, , prefix] = match;
  if (parseInt(prefix, 10) < 0 || parseInt(prefix, 10) > 32) return '前缀长度必须在 0-32 之间';
  return '';
}

function validateCost(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 65535) return '成本必须在 1-65535 之间';
  return '';
}

function validateBandwidth(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 100000) return '带宽必须在 1-100000 Mbit/s 之间';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

function validatePriority(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 255) return '优先级必须在 0-255 之间';
  return '';
}

function validateMetric(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 16777214) return '度量值必须在 0-16777214 之间';
  return '';
}

function validateMetricType(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || (n !== 1 && n !== 2)) return '度量类型必须为 1 或 2';
  return '';
}

function validateHelloMultiplier(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 10) return 'Hello 乘数必须在 1-10 之间';
  return '';
}

function validateAdvertiseRangeCost(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 65535) return '通告范围成本必须在 1-65535 之间';
  return '';
}

function validateAutoCost(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4000000) return '参考带宽必须在 1-4000000 Kbit/s 之间';
  return '';
}

function validateAccessList(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 199) return '访问列表必须在 1-199 之间';
  return '';
}

function validateSummaryAddress(value) {
  if (!value) return '';
  const match = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
  if (!match) return '汇总地址格式错误 (例如: 10.0.0.0/8)';
  const [, , prefix] = match;
  if (parseInt(prefix, 10) < 0 || parseInt(prefix, 10) > 32) return '前缀长度必须在 0-32 之间';
  return '';
}

function validateDistance(value, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return `${name}必须在 1-255 之间`;
  return '';
}

function validateGracePeriod(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 1800) return 'Grace 周期必须在 1-1800 秒之间';
  return '';
}

function validatePollInterval(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 65535) return '轮询间隔必须在 1-65535 秒之间';
  return '';
}

function validateLabel(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 1048575) return '标签值必须在 0-1048575 之间';
  return '';
}

function validateRefreshTimer(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 10 || n > 1800) return '刷新定时器必须在 10-1800 秒之间';
  return '';
}

function validateLdpHolddown(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 10000) return '保持时间必须在 0-10000 秒之间';
  return '';
}

// OSPF 配置转换
function configToForm(data = {}) {
  // 区域列表
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
    
    // 解析 area-type: API 返回 { normal: {} } 或 { nssa: {} } 等对象
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

  // 接口列表
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

  // 邻居列表
  const neighbors = [];
  const neighborData = data.neighbor || {};
  for (const [ip, attrs] of Object.entries(neighborData)) {
    neighbors.push({
      address: ip,
      'poll-interval': attrs['poll-interval'] || '',
      priority: attrs.priority || '',
    });
  }

  // 重分发列表
  const redistributes = [];
  const redistributeData = data.redistribute || {};
  for (const [proto, attrs] of Object.entries(redistributeData)) {
    if (proto === 'table') continue; // table 单独处理
    redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'metric-type': attrs['metric-type'] || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  // 重分发路由表
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

  // 解析 summary-address 详细配置
  const summaryAddresses = [];
  const summaryData = data['summary-address'] || {};
  for (const [addr, attrs] of Object.entries(summaryData)) {
    summaryAddresses.push({
      address: addr,
      'no-advertise': !!attrs['no-advertise'],
      tag: attrs.tag || '',
    });
  }

  // 解析访问列表: API 返回 { "1": { export: ["kernel", "static"] } }
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
      { key: 'id', title: '区域 ID' },
      { key: 'area-type', title: '区域类型' },
      { key: 'networks', title: '网络数量', render: (row) => row.networks?.length || 0 },
    ];

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'area', title: '区域' },
      { key: 'cost', title: '成本' },
      { key: 'network', title: '网络类型' },
    ];

    const neighborColumns = [
      { key: 'address', title: '邻居地址' },
      { key: 'poll-interval', title: '轮询间隔' },
      { key: 'priority', title: '优先级' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'metric-type', title: '度量类型' },
    ];

    const redistributeTableColumns = [
      { key: 'table', title: '路由表编号' },
      { key: 'metric', title: '度量值' },
      { key: 'metric-type', title: '度量类型' },
    ];

    const summaryAddressColumns = [
      { key: 'address', title: '汇总地址' },
      { key: 'no-advertise', title: '不通告', render: (row) => row['no-advertise'] ? '是' : '否' },
      { key: 'tag', title: '标签' },
    ];

    const accessListColumns = [
      { key: 'number', title: '编号' },
      { key: 'export', title: '导出协议', render: (row) => row.export?.join(', ') || '' },
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

    const AREA_TYPE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'stub', label: 'Stub' },
      { value: 'nssa', label: 'NSSA' },
      { value: 'stub no-summary', label: 'Stub No Summary' },
    ];

    const NETWORK_TYPE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'broadcast', label: 'Broadcast' },
      { value: 'non-broadcast', label: 'Non-Broadcast' },
      { value: 'point-to-point', label: 'Point-to-Point' },
      { value: 'point-to-multipoint', label: 'Point-to-Multipoint' },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static' },
    ];

    const AUTH_TYPE_OPTIONS = [
      { value: '', label: '无' },
      { value: 'message-digest', label: 'Message Digest' },
    ];

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
      // 验证基本设置
      if (config.value['router-id']) {
        const err = validateIPv4(config.value['router-id']);
        if (err) return alert(`路由器 ID：${err}`);
      }
      if (config.value['default-metric']) {
        const err = validateMetric(config.value['default-metric']);
        if (err) return alert(`默认度量值：${err}`);
      }
      if (config.value['maximum-paths']) {
        const n = parseInt(config.value['maximum-paths'], 10);
        if (isNaN(n) || n < 1 || n > 64) return alert('最大路径数必须在 1-64 之间');
      }
      if (config.value['auto-cost']?.['reference-bandwidth']) {
        const err = validateAutoCost(config.value['auto-cost']['reference-bandwidth']);
        if (err) return alert(`参考带宽：${err}`);
      }

      // 验证区域
      for (let i = 0; i < config.value.areas.length; i++) {
        const area = config.value.areas[i];
        if (area.id) {
          const err = validateAreaId(area.id);
          if (err) return alert(`区域 ${i + 1}：${err}`);
        }
        for (let j = 0; j < area.networks.length; j++) {
          const err = validateNetwork(area.networks[j].network);
          if (err) return alert(`区域 ${area.id || i + 1} 网络 ${j + 1}：${err}`);
        }
      }

      // 验证接口
      for (let i = 0; i < config.value.interfaces.length; i++) {
        const iface = config.value.interfaces[i];
        if (iface.cost) {
          const err = validateCost(iface.cost);
          if (err) return alert(`接口 ${iface.name || i + 1}：成本 ${err}`);
        }
        if (iface.bandwidth) {
          const err = validateBandwidth(iface.bandwidth);
          if (err) return alert(`接口 ${iface.name || i + 1}：带宽 ${err}`);
        }
        if (iface.priority) {
          const err = validatePriority(iface.priority);
          if (err) return alert(`接口 ${iface.name || i + 1}：优先级 ${err}`);
        }
        if (iface['dead-interval']) {
          const err = validateTimer(iface['dead-interval'], 1, 65535, '死亡间隔');
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
        if (iface['hello-interval']) {
          const err = validateTimer(iface['hello-interval'], 1, 65535, 'Hello 间隔');
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
        if (iface['retransmit-interval']) {
          const err = validateTimer(iface['retransmit-interval'], 1, 65535, '重传间隔');
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
        if (iface['transmit-delay']) {
          const err = validateTimer(iface['transmit-delay'], 1, 65535, '发送延迟');
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
      }

      // 验证邻居
      for (let i = 0; i < config.value.neighbors.length; i++) {
        const neighbor = config.value.neighbors[i];
        if (neighbor.address) {
          const err = validateIPv4(neighbor.address);
          if (err) return alert(`邻居 ${i + 1}：${err}`);
        }
        if (neighbor['poll-interval']) {
          const err = validateTimer(neighbor['poll-interval'], 1, 65535, '轮询间隔');
          if (err) return alert(`邻居 ${i + 1}：${err}`);
        }
        if (neighbor.priority) {
          const err = validatePriority(neighbor.priority);
          if (err) return alert(`邻居 ${i + 1}：优先级 ${err}`);
        }
      }

      // 验证重分发
      for (let i = 0; i < config.value.redistributes.length; i++) {
        const redist = config.value.redistributes[i];
        if (redist.metric) {
          const err = validateMetric(redist.metric);
          if (err) return alert(`重分发 ${redist.protocol || i + 1}：度量值 ${err}`);
        }
        if (redist['metric-type']) {
          const err = validateMetricType(redist['metric-type']);
          if (err) return alert(`重分发 ${redist.protocol || i + 1}：${err}`);
        }
      }

      // 验证重分发路由表
      for (let i = 0; i < config.value.redistributeTables.length; i++) {
        const tableItem = config.value.redistributeTables[i];
        if (tableItem.table) {
          const tableNum = parseInt(tableItem.table, 10);
          if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) {
            return alert(`重分发路由表 ${i + 1}：路由表编号必须在 1-200 之间`);
          }
        }
        if (tableItem.metric) {
          const err = validateMetric(tableItem.metric);
          if (err) return alert(`重分发路由表 ${tableItem.table || i + 1}：度量值 ${err}`);
        }
        if (tableItem['metric-type']) {
          const err = validateMetricType(tableItem['metric-type']);
          if (err) return alert(`重分发路由表 ${tableItem.table || i + 1}：${err}`);
        }
      }

      // 验证定时器
      if (config.value.timers?.throttle?.spf) {
        const spf = config.value.timers.throttle.spf;
        if (spf.delay) {
          const err = validateTimer(spf.delay, 1, 65535, 'SPF 延迟');
          if (err) return alert(`SPF 定时器：${err}`);
        }
        if (spf['initial-holdtime']) {
          const err = validateTimer(spf['initial-holdtime'], 1, 65535, 'SPF 初始保持时间');
          if (err) return alert(`SPF 定时器：${err}`);
        }
        if (spf['max-holdtime']) {
          const err = validateTimer(spf['max-holdtime'], 1, 65535, 'SPF 最大保持时间');
          if (err) return alert(`SPF 定时器：${err}`);
        }
      }

      // 验证默认信息
      if (config.value['default-information']?.originate) {
        const orig = config.value['default-information'].originate;
        if (orig.metric) {
          const err = validateMetric(orig.metric);
          if (err) return alert(`默认信息：度量值 ${err}`);
        }
        if (orig['metric-type']) {
          const err = validateMetricType(orig['metric-type']);
          if (err) return alert(`默认信息：${err}`);
        }
      }

      // 验证距离配置
      if (config.value['distance']?.global) {
        const err = validateDistance(config.value['distance'].global, '全局距离');
        if (err) return alert(`距离：${err}`);
      }
      if (config.value['distance']?.ospf) {
        const ospf = config.value['distance'].ospf;
        if (ospf.external) {
          const err = validateDistance(ospf.external, 'OSPF 外部距离');
          if (err) return alert(`距离：${err}`);
        }
        if (ospf['inter-area']) {
          const err = validateDistance(ospf['inter-area'], 'OSPF 区域间距离');
          if (err) return alert(`距离：${err}`);
        }
        if (ospf['intra-area']) {
          const err = validateDistance(ospf['intra-area'], 'OSPF 区域内距离');
          if (err) return alert(`距离：${err}`);
        }
      }

      // 验证平滑重启
      if (config.value['graceful-restart']?.['grace-period']) {
        const err = validateGracePeriod(config.value['graceful-restart']['grace-period']);
        if (err) return alert(`平滑重启：${err}`);
      }

      // 验证最大度量值
      if (config.value['max-metric']?.['router-lsa']) {
        const routerLsa = config.value['max-metric']['router-lsa'];
        if (routerLsa['on-shutdown']) {
          const err = validateTimer(routerLsa['on-shutdown'], 1, 65535, '关闭前通告时间');
          if (err) return alert(`最大度量值：${err}`);
        }
        if (routerLsa['on-startup']) {
          const err = validateTimer(routerLsa['on-startup'], 1, 65535, '启动时通告时间');
          if (err) return alert(`最大度量值：${err}`);
        }
      }

      // 验证 MPLS-TE
      if (config.value['mpls-te']?.['router-address']) {
        const err = validateIPv4(config.value['mpls-te']['router-address']);
        if (err) return alert(`MPLS-TE：路由器地址 ${err}`);
      }

      // 验证 LDP 同步
      if (config.value['ldp-sync']?.holddown) {
        const err = validateLdpHolddown(config.value['ldp-sync'].holddown);
        if (err) return alert(`LDP 同步：${err}`);
      }

      // 验证段路由
      if (config.value['segment-routing']) {
        const sr = config.value['segment-routing'];
        if (sr['global-block']) {
          if (sr['global-block']['low-label-value']) {
            const err = validateLabel(sr['global-block']['low-label-value']);
            if (err) return alert(`段路由全局块：${err}`);
          }
          if (sr['global-block']['high-label-value']) {
            const err = validateLabel(sr['global-block']['high-label-value']);
            if (err) return alert(`段路由全局块：${err}`);
          }
        }
        if (sr['local-block']) {
          if (sr['local-block']['low-label-value']) {
            const err = validateLabel(sr['local-block']['low-label-value']);
            if (err) return alert(`段路由本地块：${err}`);
          }
          if (sr['local-block']['high-label-value']) {
            const err = validateLabel(sr['local-block']['high-label-value']);
            if (err) return alert(`段路由本地块：${err}`);
          }
        }
      }

      // 验证聚合定时器
      if (config.value['aggregation']?.timer) {
        const err = validateTimer(config.value['aggregation'].timer, 1, 60, '聚合定时器');
        if (err) return alert(`聚合：${err}`);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols ospf', payload);
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
      if (!accessListForm.value.number) return alert('请输入访问列表编号');
      if (editingAccessListIndex.value >= 0) {
        config.value['access-list'].splice(editingAccessListIndex.value, 1, JSON.parse(JSON.stringify(accessListForm.value)));
      } else {
        config.value['access-list'].push(JSON.parse(JSON.stringify(accessListForm.value)));
      }
      accessListModalVisible.value = false;
    }

    function deleteAccessList(index) {
      if (confirm('确定删除此访问列表？')) {
        config.value['access-list'].splice(index, 1);
      }
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
      if (!summaryAddressForm.value.address) return alert('请输入汇总地址');
      const err = validateSummaryAddress(summaryAddressForm.value.address);
      if (err) return alert(err);
      
      if (editingSummaryAddressIndex.value >= 0) {
        config.value['summary-address'].splice(editingSummaryAddressIndex.value, 1, JSON.parse(JSON.stringify(summaryAddressForm.value)));
      } else {
        config.value['summary-address'].push(JSON.parse(JSON.stringify(summaryAddressForm.value)));
      }
      summaryAddressModalVisible.value = false;
    }

    function deleteSummaryAddress(index) {
      if (confirm('确定删除此汇总地址？')) {
        config.value['summary-address'].splice(index, 1);
      }
    }

    function saveArea() {
      if (!areaForm.value.id) return alert('请输入区域 ID');
      const err = validateAreaId(areaForm.value.id);
      if (err) return alert(err);
      for (const net of areaForm.value.networks) {
        const netErr = validateNetwork(net.network);
        if (netErr) return alert(netErr);
      }
      for (const range of areaForm.value.ranges) {
        const rangeErr = validateNetwork(range.range);
        if (rangeErr) return alert(`汇总范围: ${rangeErr}`);
        if (range['advertise-range-cost']) {
          const costErr = validateAdvertiseRangeCost(range['advertise-range-cost']);
          if (costErr) return alert(`汇总范围: ${costErr}`);
        }
        if (range['substitute']) {
          const subErr = validateNetwork(range['substitute']);
          if (subErr) return alert(`替代地址: ${subErr}`);
        }
      }
      // 验证虚拟链路
      for (let i = 0; i < areaForm.value.virtualLinks.length; i++) {
        const vlink = areaForm.value.virtualLinks[i];
        if (!vlink.address) return alert(`虚拟链路 ${i + 1}: 请输入邻居路由器 ID`);
        const addrErr = validateIPv4(vlink.address);
        if (addrErr) return alert(`虚拟链路 ${i + 1}: ${addrErr}`);
        if (vlink['hello-interval']) {
          const helloErr = validateTimer(vlink['hello-interval'], 1, 65535, 'Hello 间隔');
          if (helloErr) return alert(`虚拟链路 ${vlink.address}: ${helloErr}`);
        }
        if (vlink['dead-interval']) {
          const deadErr = validateTimer(vlink['dead-interval'], 1, 65535, '死亡间隔');
          if (deadErr) return alert(`虚拟链路 ${vlink.address}: ${deadErr}`);
        }
        if (vlink['retransmit-interval']) {
          const retransmitErr = validateTimer(vlink['retransmit-interval'], 1, 65535, '重传间隔');
          if (retransmitErr) return alert(`虚拟链路 ${vlink.address}: ${retransmitErr}`);
        }
        if (vlink['transmit-delay']) {
          const delayErr = validateTimer(vlink['transmit-delay'], 1, 65535, '发送延迟');
          if (delayErr) return alert(`虚拟链路 ${vlink.address}: ${delayErr}`);
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
      if (!interfaceForm.value.name) return alert('请输入接口名称');
      if (interfaceForm.value.cost) {
        const err = validateCost(interfaceForm.value.cost);
        if (err) return alert(err);
      }
      if (interfaceForm.value.bandwidth) {
        const err = validateBandwidth(interfaceForm.value.bandwidth);
        if (err) return alert(err);
      }
      if (interfaceForm.value.priority) {
        const err = validatePriority(interfaceForm.value.priority);
        if (err) return alert(err);
      }
      if (interfaceForm.value['hello-interval']) {
        const err = validateTimer(interfaceForm.value['hello-interval'], 1, 65535, 'Hello 间隔');
        if (err) return alert(err);
      }
      if (interfaceForm.value['dead-interval']) {
        const err = validateTimer(interfaceForm.value['dead-interval'], 1, 65535, '死亡间隔');
        if (err) return alert(err);
      }
      if (interfaceForm.value['retransmit-interval']) {
        const err = validateTimer(interfaceForm.value['retransmit-interval'], 1, 65535, '重传间隔');
        if (err) return alert(err);
      }
      if (interfaceForm.value['transmit-delay']) {
        const err = validateTimer(interfaceForm.value['transmit-delay'], 1, 65535, '发送延迟');
        if (err) return alert(err);
      }
      if (interfaceForm.value['hello-multiplier']) {
        const err = validateHelloMultiplier(interfaceForm.value['hello-multiplier']);
        if (err) return alert(err);
      }
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function saveNeighbor() {
      if (!neighborForm.value.address) return alert('请输入邻居地址');
      const err = validateIPv4(neighborForm.value.address);
      if (err) return alert(err);
      if (neighborForm.value['poll-interval']) {
        const err = validatePollInterval(neighborForm.value['poll-interval']);
        if (err) return alert(err);
      }
      if (neighborForm.value.priority) {
        const err = validatePriority(neighborForm.value.priority);
        if (err) return alert(err);
      }
      if (editingNeighborIndex.value >= 0) {
        config.value.neighbors.splice(editingNeighborIndex.value, 1, JSON.parse(JSON.stringify(neighborForm.value)));
      } else {
        config.value.neighbors.push(JSON.parse(JSON.stringify(neighborForm.value)));
      }
      neighborModalVisible.value = false;
    }

    function saveRedistribute() {
      if (!redistributeForm.value.protocol) return alert('请选择协议');
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return alert(err);
      }
      if (redistributeForm.value['metric-type']) {
        const err = validateMetricType(redistributeForm.value['metric-type']);
        if (err) return alert(err);
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
      if (!redistributeTableForm.value.table) return alert('请输入路由表编号');
      const tableNum = parseInt(redistributeTableForm.value.table, 10);
      if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) return alert('路由表编号必须在 1-200 之间');
      if (redistributeTableForm.value.metric) {
        const err = validateMetric(redistributeTableForm.value.metric);
        if (err) return alert(err);
      }
      if (redistributeTableForm.value['metric-type']) {
        const err = validateMetricType(redistributeTableForm.value['metric-type']);
        if (err) return alert(err);
      }
      if (editingRedistributeTableIndex.value >= 0) {
        config.value.redistributeTables.splice(editingRedistributeTableIndex.value, 1, JSON.parse(JSON.stringify(redistributeTableForm.value)));
      } else {
        config.value.redistributeTables.push(JSON.parse(JSON.stringify(redistributeTableForm.value)));
      }
      redistributeTableModalVisible.value = false;
    }

    function deleteRedistributeTable(index) {
      if (confirm('确定删除此重分发路由表配置？')) {
        config.value.redistributeTables.splice(index, 1);
      }
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
      if (confirm('确定删除此区域？')) {
        config.value.areas.splice(index, 1);
      }
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) {
        config.value.interfaces.splice(index, 1);
      }
    }

    function deleteNeighbor(index) {
      if (confirm('确定删除此邻居？')) {
        config.value.neighbors.splice(index, 1);
      }
    }

    function deleteRedistribute(index) {
      if (confirm('确定删除此重分发配置？')) {
        config.value.redistributes.splice(index, 1);
      }
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      newPassiveInterface, addPassiveInterface, removePassiveInterface,
      accessListModalVisible, editingAccessListIndex, accessListForm,
      accessListColumns, EXPORT_PROTOCOL_OPTIONS,
      openAccessListModal, saveAccessList, deleteAccessList,
      summaryAddressModalVisible, editingSummaryAddressIndex, summaryAddressForm,
      openSummaryAddressModal, saveSummaryAddress, deleteSummaryAddress,
      areaModalVisible, editingAreaIndex, areaForm,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      neighborModalVisible, editingNeighborIndex, neighborForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      redistributeTableModalVisible, editingRedistributeTableIndex, redistributeTableForm,
      openRedistributeTableModal, saveRedistributeTable, deleteRedistributeTable,
      areaColumns, interfaceColumns, neighborColumns, redistributeColumns, redistributeTableColumns, summaryAddressColumns,
      AREA_TYPE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, AUTH_TYPE_OPTIONS, commandPath,
      openAreaModal, openInterfaceModal, openNeighborModal, openRedistributeModal,
      deleteArea, deleteInterface, deleteNeighbor, deleteRedistribute,
      addAreaNetwork, removeAreaNetwork, addAreaRange, removeAreaRange, addAreaVirtualLink, removeAreaVirtualLink, saveArea,
      saveInterface, saveNeighbor, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'areas', title: '区域' },
        { key: 'interfaces', title: '接口' },
        { key: 'neighbors', title: '邻居' },
        { key: 'redistribute', title: '重分发' },
        { key: 'access-list', title: '访问列表' },
        { key: 'summary-address', title: '汇总地址' },
        { key: 'distance', title: '距离' },
        { key: 'graceful-restart', title: '平滑重启' },
        { key: 'timers', title: '定时器' },
        { key: 'default-info', title: '默认信息' },
        { key: 'max-metric', title: '最大度量' },
        { key: 'mpls-te', title: 'MPLS-TE' },
        { key: 'ldp-sync', title: 'LDP 同步' },
        { key: 'segment-routing', title: '段路由' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">OSPF 参数</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">路由器 ID</label>
                  <input type="text" class="form-control" v-model="config['router-id']"
                         placeholder="例如: 1.1.1.1" style="width:100%;"
                         title="OSPF 路由器标识符 (IPv4 地址格式)" />
                </div>
                <div class="form-row">
                  <label class="form-label">ABR 类型</label>
                  <select class="form-control" v-model="config['parameters']['abr-type']" style="width:100%;">
                    <option value="">默认 (cisco)</option>
                    <option value="cisco">Cisco</option>
                    <option value="ibm">IBM</option>
                    <option value="shortcut">Shortcut</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">启用 Opaque-LSA 能力 (RFC2370)</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['parameters']['opaque-lsa']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">启用 RFC1583 兼容性</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['parameters']['rfc1583-compatibility']" /></label>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">默认度量值</label>
                  <input type="number" class="form-control" v-model="config['default-metric']"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                         title="重分发路由的默认度量值 (0-16777214)" />
                </div>
                <div class="form-row">
                  <label class="form-label">最大路径数</label>
                  <input type="number" class="form-control" v-model="config['maximum-paths']"
                         min="1" max="64" placeholder="1-64" style="width:100%;"
                         title="ECMP 最大路径数 (1-64)" />
                </div>
                <div class="form-row">
                  <label class="form-label">参考带宽</label>
                  <input type="number" class="form-control" v-model="config['auto-cost']['reference-bandwidth']"
                         min="1" max="4000000" placeholder="1-4000000 Kbit/s" style="width:100%;"
                         title="auto-cost 参考带宽 (1-4000000 Kbit/s)" />
                </div>
                <div class="form-row">
                  <label class="form-label">记录邻接关系变化</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">被动接口</label>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <select class="form-control" v-model="newPassiveInterface" style="width:100%;" title="选择被动接口">
                      <option value="">请选择接口</option>
                      <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
                    </select>
                    <ToolbarButton size="small" @click="addPassiveInterface">添加</ToolbarButton>
                  </div>
                </div>
                <div v-if="config['passive-interface'].length > 0" class="form-row">
                  <label class="form-label"></label>
                  <div style="display:flex; flex-direction:column; gap:5px;">
                    <div v-for="(iface, idx) in config['passive-interface']" :key="idx"
                         style="display:flex; gap:10px; align-items:center;">
                      <span>{{ iface }}</span>
                      <ToolbarButton size="small" danger @click="removePassiveInterface(idx)">删除</ToolbarButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">能力配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">启用 Opaque LSA</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['capability'].opaque" /></label>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">外部路由聚合</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">延迟定时器</label>
                  <input type="number" class="form-control" v-model="config['aggregation']['timer']"
                         min="5" max="1800" placeholder="5-1800 秒" style="width:100%;"
                         title="延迟定时器 (5-1800 秒，默认 5)" />
                </div>
              </div>
            </div>

            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">LSA 刷新</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">刷新定时器</label>
                  <input type="number" class="form-control" v-model="config.refresh.timers"
                         min="10" max="1800" placeholder="10-1800 秒" style="width:100%;"
                         title="LSA 刷新定时器 (10-1800 秒，默认 1800)" />
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">协议重分发</div>
              <div style="padding:16px;">
                <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                           rowKey="protocol" :actions="['create', 'edit', 'delete']"
                           @create="openRedistributeModal(-1)" @edit="openRedistributeModal" @delete="deleteRedistribute" />
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由表重分发</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">重分发非主内核路由表</p>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">SPF 定时器</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">延迟</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf.delay"
                         min="1" max="65535" placeholder="1-65535 毫秒" style="width:100%;"
                         title="从收到第一个变化到 SPF 计算的延迟 (1-65535 毫秒，默认 200)" />
                </div>
                <div class="form-row">
                  <label class="form-label">初始保持时间</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf['initial-holdtime']"
                         min="1" max="65535" placeholder="1-65535 毫秒" style="width:100%;"
                         title="连续 SPF 计算之间的初始保持时间 (1-65535 毫秒，默认 1000)" />
                </div>
                <div class="form-row">
                  <label class="form-label">最大保持时间</label>
                  <input type="number" class="form-control" v-model="config.timers.throttle.spf['max-holdtime']"
                         min="1" max="65535" placeholder="1-65535 毫秒" style="width:100%;"
                         title="连续 SPF 计算之间的最大保持时间 (1-65535 毫秒，默认 10000)" />
                </div>
              </div>
            </div>
          </div>
        </template>



        <template #default-info>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">默认信息通告</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">始终通告默认路由</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">度量值</label>
                  <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                         title="默认路由的度量值 (0-16777214)" />
                </div>
                <div class="form-row">
                  <label class="form-label">度量类型</label>
                  <select class="form-control" v-model="config['default-information'].originate['metric-type']" style="width:100%;">
                    <option value="">默认 (2)</option>
                    <option value="1">类型 1</option>
                    <option value="2">类型 2</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">路由映射</label>
                  <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                         placeholder="路由映射名称" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #access-list>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">访问列表</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">过滤路由更新中的网络</p>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">汇总地址</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">外部汇总地址配置</p>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">全局距离</label>
                  <input type="number" class="form-control" v-model="config['distance']['global']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         title="全局管理距离 (1-255)" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">OSPF 特定距离</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">外部路由距离</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['external']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         title="外部路由的管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">区域间路由距离</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['inter-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         title="区域间路由的管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">区域内路由距离</label>
                  <input type="number" class="form-control" v-model="config['distance']['ospf']['intra-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;"
                         title="区域内路由的管理距离 (1-255)" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #graceful-restart>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">平滑重启</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">Grace 周期</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart']['grace-period']"
                         min="1" max="1800" placeholder="1-1800 秒" style="width:100%;"
                         title="最大 grace 周期长度 (1-1800 秒，默认 120)" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">助手配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">启用助手支持</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart']['helper']['enable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">仅支持计划内重启</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart']['helper']['planned-only']" /></label>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #max-metric>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">最大度量值 (Router-LSA)</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">通告自己的 Router-LSA 为无限距离（stub 路由器）</p>
                <div class="form-row">
                  <label class="form-label">管理应用（无限期）</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['max-metric']['router-lsa']['administrative']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">关闭前通告</label>
                  <input type="number" class="form-control" v-model="config['max-metric']['router-lsa']['on-shutdown']"
                         min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                         title="在完全关闭 OSPF 前通告 stub-router 的时间" />
                </div>
                <div class="form-row">
                  <label class="form-label">启动时通告</label>
                  <input type="number" class="form-control" v-model="config['max-metric']['router-lsa']['on-startup']"
                         min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                         title="启动 OSPF 时自动通告 stub Router-LSA 的时间" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #mpls-te>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">MPLS 流量工程</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">启用 MPLS-TE 功能</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['mpls-te']['enable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">路由器地址</label>
                  <input type="text" class="form-control" v-model="config['mpls-te']['router-address']"
                         placeholder="例如: 1.1.1.1" style="width:100%;"
                         title="通告路由器的稳定 IP 地址 (默认: 0.0.0.0)" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #ldp-sync>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">LDP-IGP 同步</div>
              <div style="padding:16px;">
                <p style="color:#666; font-size:12px; margin-top:0;">协议级 LDP-IGP 同步配置</p>
                <div class="form-row">
                  <label class="form-label">保持时间</label>
                  <input type="number" class="form-control" v-model="config['ldp-sync']['holddown']"
                         min="0" max="10000" placeholder="0-10000 秒" style="width:100%;"
                         title="LDP-IGP 成本恢复的保持时间 (0-10000 秒)" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #segment-routing>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">段路由 (Segment Routing)</div>
              <div style="padding:16px;">
                <div style="margin-top:8px; border:1px solid #e8e8e8; border-radius:4px; overflow:hidden;">
                  <div style="background:#fafafa; padding:8px 14px; font-weight:bold; font-size:13px; border-bottom:1px solid #e8e8e8;">全局块 (Global Block)</div>
                  <div style="padding:12px 14px;">
                    <div class="form-row">
                      <label class="form-label">低标签值</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['global-block']['low-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             title="MPLS 标签下限" />
                    </div>
                    <div class="form-row">
                      <label class="form-label">高标签值</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['global-block']['high-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             title="MPLS 标签上限" />
                    </div>
                  </div>
                </div>
                <div style="margin-top:12px; border:1px solid #e8e8e8; border-radius:4px; overflow:hidden;">
                  <div style="background:#fafafa; padding:8px 14px; font-weight:bold; font-size:13px; border-bottom:1px solid #e8e8e8;">本地块 (Local Block)</div>
                  <div style="padding:12px 14px;">
                    <div class="form-row">
                      <label class="form-label">低标签值</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['local-block']['low-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             title="MPLS 标签下限" />
                    </div>
                    <div class="form-row">
                      <label class="form-label">高标签值</label>
                      <input type="number" class="form-control" v-model="config['segment-routing']['local-block']['high-label-value']"
                             min="0" max="1048575" placeholder="0-1048575" style="width:100%;"
                             title="MPLS 标签上限" />
                    </div>
                  </div>
                </div>
                <div class="form-row" style="margin-top:12px;">
                  <label class="form-label">最大标签深度</label>
                  <input type="number" class="form-control" v-model="config['segment-routing']['maximum-label-depth']"
                         min="1" max="10" placeholder="1-10" style="width:100%;"
                         title="此路由器允许的最大 MPLS 标签深度" />
                </div>
              </div>
            </div>
          </div>
        </template>


      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Summary Address Modal -->
      <DraggableModal v-model:visible="summaryAddressModalVisible" :title="editingSummaryAddressIndex >= 0 ? '编辑汇总地址' : '添加汇总地址'" width="600px" @confirm="saveSummaryAddress">
        <div class="form-row">
          <label class="form-label">汇总地址 *</label>
          <input type="text" class="form-control" v-model="summaryAddressForm.address"
                 placeholder="例如: 10.0.0.0/8" style="width:100%;"
                 title="汇总网络地址 (CIDR 格式)" :disabled="editingSummaryAddressIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">不通告此汇总路由</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="summaryAddressForm['no-advertise']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">标签</label>
          <input type="number" class="form-control" v-model="summaryAddressForm.tag"
                 min="0" max="4294967295" placeholder="0-4294967295" style="width:100%;"
                 title="路由标签值" />
        </div>
      </DraggableModal>

      <!-- Access List Modal -->
      <DraggableModal v-model:visible="accessListModalVisible" :title="editingAccessListIndex >= 0 ? '编辑访问列表' : '添加访问列表'" width="600px" @confirm="saveAccessList">
        <div class="form-row">
          <label class="form-label">访问列表编号 *</label>
          <input type="number" class="form-control" v-model="accessListForm.number"
                 min="0" max="4294967295" placeholder="0-4294967295" style="width:100%;"
                 title="访问列表编号" :disabled="editingAccessListIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">导出协议</label>
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
      <DraggableModal v-model:visible="areaModalVisible" :title="editingAreaIndex >= 0 ? '编辑 OSPF 区域' : '添加 OSPF 区域'" width="600px" @confirm="saveArea">
        <div class="form-row">
          <label class="form-label">区域 ID *</label>
          <input type="text" class="form-control" v-model="areaForm.id"
                 placeholder="例如: 0 或 0.0.0.0" style="width:100%;"
                 title="OSPF 区域标识符 (数字 0-4294967295 或点分十进制)" :disabled="editingAreaIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">区域类型</label>
          <select class="form-control" v-model="areaForm['area-type']" style="width:100%;">
            <option v-for="opt in AREA_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">认证类型</label>
          <select class="form-control" v-model="areaForm.authentication" style="width:100%;">
            <option v-for="opt in AUTH_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">导出列表</label>
          <input type="text" class="form-control" v-model="areaForm['export-list']"
                 placeholder="访问列表名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">导入列表</label>
          <input type="text" class="form-control" v-model="areaForm['import-list']"
                 placeholder="访问列表名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">启用快捷模式</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="areaForm.shortcut" /></label>
        </div>

        <h4 style="margin-top:20px;">网络</h4>
        <div v-for="(net, idx) in areaForm.networks" :key="idx" style="display:flex; gap:10px; margin-bottom:10px;">
          <input type="text" class="form-control" v-model="net.network"
                 placeholder="例如: 192.168.1.0/24" style="flex:1;"
                 title="OSPF 网络地址 (CIDR 格式)" />
          <ToolbarButton size="small" danger @click="removeAreaNetwork(idx)">删除</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addAreaNetwork">添加网络</ToolbarButton>

        <h4 style="margin-top:20px;">汇总范围</h4>
        <div v-for="(range, idx) in areaForm.ranges" :key="idx" style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:4px;">
          <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
            <input type="text" class="form-control" v-model="range.range"
                   placeholder="例如: 10.0.0.0/8" style="flex:1;"
                   title="汇总网络地址 (CIDR 格式)" />
            <ToolbarButton size="small" danger @click="removeAreaRange(idx)">删除</ToolbarButton>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="number" class="form-control" v-model="range['advertise-range-cost']"
                   min="1" max="65535" placeholder="成本 1-65535" style="width:150px;"
                   title="通告范围成本 (1-65535)" />
            <input type="text" class="form-control" v-model="range.substitute"
                   placeholder="替代地址 (例如: 10.0.0.0/16)" style="flex:1;"
                   title="将范围通告为另一个前缀" />
            <label style="white-space:nowrap;">
              <input type="checkbox" v-model="range['not-advertise']" />
              不通告
            </label>
          </div>
        </div>
        <ToolbarButton size="small" @click="addAreaRange">添加汇总范围</ToolbarButton>

        <h4 style="margin-top:20px;">虚拟链路</h4>
        <div v-for="(vlink, idx) in areaForm.virtualLinks" :key="idx" style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:4px;">
          <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
            <input type="text" class="form-control" v-model="vlink.address"
                   placeholder="邻居路由器 ID (例如: 1.1.1.1)" style="flex:1;"
                   title="虚拟链路邻居的路由器 ID" />
            <ToolbarButton size="small" danger @click="removeAreaVirtualLink(idx)">删除</ToolbarButton>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <input type="number" class="form-control" v-model="vlink['hello-interval']"
                   min="1" max="65535" placeholder="Hello 间隔 (秒)"
                   title="Hello 包发送间隔 (1-65535 秒，默认 10)" />
            <input type="number" class="form-control" v-model="vlink['dead-interval']"
                   min="1" max="65535" placeholder="死亡间隔 (秒)"
                   title="邻居死亡检测间隔 (1-65535 秒，默认 40)" />
            <input type="number" class="form-control" v-model="vlink['retransmit-interval']"
                   min="1" max="65535" placeholder="重传间隔 (秒)"
                   title="LSA 重传间隔 (1-65535 秒，默认 5)" />
            <input type="number" class="form-control" v-model="vlink['transmit-delay']"
                   min="1" max="65535" placeholder="发送延迟 (秒)"
                   title="链路状态发送延迟 (1-65535 秒，默认 1)" />
          </div>
          <div style="margin-top:10px;">
            <label>
              <input type="checkbox" v-model="vlink.authentication" />
              启用认证
            </label>
          </div>
        </div>
        <ToolbarButton size="small" @click="addAreaVirtualLink">添加虚拟链路</ToolbarButton>
      </DraggableModal>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 OSPF 接口' : '添加 OSPF 接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">请选择接口</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">区域</label>
          <input type="text" class="form-control" v-model="interfaceForm.area"
                 placeholder="例如: 0" style="width:100%;"
                 title="OSPF 区域 ID" />
        </div>
        <div class="form-row">
          <label class="form-label">成本</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost"
                 min="1" max="65535" placeholder="1-65535" style="width:100%;"
                 title="接口 OSPF 成本 (1-65535)" />
        </div>
        <div class="form-row">
          <label class="form-label">带宽 (Mbit/s)</label>
          <input type="number" class="form-control" v-model="interfaceForm.bandwidth"
                 min="1" max="100000" placeholder="1-100000" style="width:100%;"
                 title="接口带宽 (1-100000 Mbit/s)" />
        </div>
        <div class="form-row">
          <label class="form-label">网络类型</label>
          <select class="form-control" v-model="interfaceForm.network" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Hello 间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="Hello 包发送间隔 (1-65535 秒，默认 10)" />
        </div>
        <div class="form-row">
          <label class="form-label">Hello 乘数</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-multiplier']"
                 min="1" max="10" placeholder="1-10" style="width:100%;"
                 title="Hello 乘数，用于计算死亡间隔 (1-10，默认 1)" />
        </div>
        <div class="form-row">
          <label class="form-label">死亡间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['dead-interval']"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="邻居死亡检测间隔 (1-65535 秒，默认 40)" />
        </div>
        <div class="form-row">
          <label class="form-label">重传间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['retransmit-interval']"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="LSA 重传间隔 (1-65535 秒，默认 5)" />
        </div>
        <div class="form-row">
          <label class="form-label">发送延迟</label>
          <input type="number" class="form-control" v-model="interfaceForm['transmit-delay']"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="链路状态发送延迟 (1-65535 秒，默认 1)" />
        </div>
        <div class="form-row">
          <label class="form-label">优先级</label>
          <input type="number" class="form-control" v-model="interfaceForm.priority"
                 min="0" max="255" placeholder="0-255" style="width:100%;"
                 title="路由器优先级 (0-255，默认 1)" />
        </div>
        <div class="form-row">
          <label class="form-label">启用 BFD</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.bfd" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">被动模式</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.passive" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">忽略 MTU 不匹配</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['mtu-ignore']" /></label>
        </div>
      </DraggableModal>

      <!-- Neighbor Modal -->
      <DraggableModal v-model:visible="neighborModalVisible" :title="editingNeighborIndex >= 0 ? '编辑 OSPF 邻居' : '添加 OSPF 邻居'" width="600px" @confirm="saveNeighbor">
        <div class="form-row">
          <label class="form-label">邻居地址 *</label>
          <input type="text" class="form-control" v-model="neighborForm.address"
                 placeholder="例如: 192.168.1.1" style="width:100%;"
                 title="邻居 IPv4 地址" :disabled="editingNeighborIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">轮询间隔</label>
          <input type="number" class="form-control" v-model="neighborForm['poll-interval']"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="死亡邻居轮询间隔 (1-65535 秒，默认 60)" />
        </div>
        <div class="form-row">
          <label class="form-label">优先级</label>
          <input type="number" class="form-control" v-model="neighborForm.priority"
                 min="0" max="255" placeholder="0-255" style="width:100%;"
                 title="邻居优先级 (0-255，默认 0)" />
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑 OSPF 重分发' : '添加 OSPF 重分发'" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 title="重分发路由的度量值 (0-16777214)" />
        </div>
        <div class="form-row">
          <label class="form-label">度量类型</label>
          <select class="form-control" v-model="redistributeForm['metric-type']" style="width:100%;">
            <option value="">默认 (2)</option>
            <option value="1">类型 1</option>
            <option value="2">类型 2</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Redistribute Table Modal -->
      <DraggableModal v-model:visible="redistributeTableModalVisible" :title="editingRedistributeTableIndex >= 0 ? '编辑路由表重分发' : '添加路由表重分发'" width="600px" @confirm="saveRedistributeTable">
        <div class="form-row">
          <label class="form-label">路由表编号 *</label>
          <input type="number" class="form-control" v-model="redistributeTableForm.table"
                 min="1" max="200" placeholder="1-200" style="width:100%;"
                 title="非主内核路由表编号 (1-200)" :disabled="editingRedistributeTableIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeTableForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 title="重分发路由的度量值 (0-16777214)" />
        </div>
        <div class="form-row">
          <label class="form-label">度量类型</label>
          <select class="form-control" v-model="redistributeTableForm['metric-type']" style="width:100%;">
            <option value="">默认 (2)</option>
            <option value="1">类型 1</option>
            <option value="2">类型 2</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeTableForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
