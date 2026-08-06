import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
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

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  if (!validateIPv4(value)) return '';
  if (!validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function validateASN(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4294967294) return 'ASN 必须在 1-4294967294 之间';
  return '';
}

function validatePort(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 65535) return '端口必须在 1-65535 之间';
  return '';
}

function validateEbgpMultihop(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return 'EBGP 多跳必须在 1-255 之间';
  return '';
}

function validateAdvertInterval(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 600) return '广告间隔必须在 0-600 秒之间';
  return '';
}

function validateTtlHops(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 254) return 'TTL 安全跳数必须在 1-254 之间';
  return '';
}

function validateTimer(value, allowZero) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < (allowZero ? 0 : 1) || n > 65535) return `定时器必须在 ${allowZero ? '0' : '1'}-65535 秒之间`;
  return '';
}

function validateBmpMaxRetry(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 100 || n > 4294967295) return '最大重试间隔必须在 100-4294967295 毫秒之间';
  return '';
}

function validateBmpMinRetry(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) return '最小重试间隔必须为正整数 (毫秒)';
  return '';
}

function validateVni(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 16777215) return 'VNI 必须在 1-16777215 之间';
  return '';
}

function validateDistance(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return '管理距离必须在 1-255 之间';
  return '';
}

function validateMaxPaths(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 64) return '最大路径数必须在 1-64 之间';
  return '';
}

function validateDampeningHalfLife(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 45) return 'Dampening half-life 必须在 1-45 分钟之间';
  return '';
}

function validateDampeningValue(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 20000) return '值必须在 1-20000 之间';
  return '';
}

function validateGracefulRestart(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4095) return '优雅重启时间必须在 1-4095 秒之间';
  return '';
}

function validateNetworkCIDR(value) {
  if (!value) return '';
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(value)) return '网络格式错误，应为 x.x.x.x/x';
  return '';
}

function validateConfedId(value) {
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    const n = parseInt(value, 10);
    if (n < 1 || n > 4294967294) return 'Confederation ID 必须在 1-4294967294 之间';
  } else if (!validateIPv4(value)) {
    // valid IPv4 is OK
  } else {
    return 'Confederation ID 必须是 ASN 或 IPv4 地址';
  }
  return '';
}

// BGP 配置转换
function configToForm(data = {}) {
  // 邻居列表
  const neighbors = [];
  const neighborData = data.neighbor || {};
  for (const [ip, attrs] of Object.entries(neighborData)) {
    neighbors.push({
      address: ip,
      'remote-as': attrs['remote-as'] || '',
      description: attrs.description || '',
      'peer-group': attrs['peer-group'] || '',
      shutdown: !!attrs.shutdown,
      passive: !!attrs.passive,
      'ebgp-multihop': attrs['ebgp-multihop'] || '',
      'advertisement-interval': attrs['advertisement-interval'] || '',
      password: attrs.password || '',
      port: attrs.port || '',
      'update-source': attrs['update-source'] || '',
      'local-as': attrs['local-as'] || '',
      'local-role': attrs['local-role'] || '',
      timers: {
        connect: attrs.timers?.connect || '',
        holdtime: attrs.timers?.holdtime || '',
        keepalive: attrs.timers?.keepalive || '',
      },
      'ttl-security': { hops: attrs['ttl-security']?.hops || '' },
      'address-family': attrs['address-family'] || {},
      bfd: {
        enable: !!attrs.bfd,
        'check-control-plane-failure': !!attrs.bfd?.['check-control-plane-failure'],
        profile: attrs.bfd?.profile || '',
      },
      capability: {
        dynamic: !!attrs.capability?.dynamic,
        'extended-nexthop': !!attrs.capability?.['extended-nexthop'],
        'software-version': !!attrs.capability?.['software-version'],
      },
      'graceful-restart': {
        enable: !!attrs['graceful-restart'],
        'restart-time': attrs['graceful-restart']?.['restart-time'] || '',
        'stalepath-time': attrs['graceful-restart']?.['stalepath-time'] || '',
        'preserve-fw-state': !!attrs['graceful-restart']?.['preserve-fw-state'],
      },
      interface: attrs.interface || {},
      'path-attribute': {
        discard: toArray(attrs['path-attribute']?.discard).join(', '),
        'treat-as-withdraw': toArray(attrs['path-attribute']?.['treat-as-withdraw']).join(', '),
      },
      'enforce-first-as': !!attrs['enforce-first-as'],
      'override-capability': !!attrs['override-capability'],
      'disable-connected-check': !!attrs['disable-connected-check'],
      'disable-capability-negotiation': !!attrs['disable-capability-negotiation'],
    });
  }

  // Peer-group 列表
  const peerGroups = [];
  const peerGroupData = data['peer-group'] || {};
  for (const [name, attrs] of Object.entries(peerGroupData)) {
    peerGroups.push({
      name,
      'remote-as': attrs['remote-as'] || '',
      description: attrs.description || '',
      shutdown: !!attrs.shutdown,
      passive: !!attrs.passive,
      'ebgp-multihop': attrs['ebgp-multihop'] || '',
      'advertisement-interval': attrs['advertisement-interval'] || '',
      password: attrs.password || '',
      port: attrs.port || '',
      'local-as': attrs['local-as'] || '',
      'local-role': attrs['local-role'] || '',
      timers: {
        connect: attrs.timers?.connect || '',
        holdtime: attrs.timers?.holdtime || '',
        keepalive: attrs.timers?.keepalive || '',
      },
      'ttl-security': { hops: attrs['ttl-security']?.hops || '' },
      'update-source': attrs['update-source'] || '',
      'address-family': attrs['address-family'] || {},
      bfd: {
        enable: !!attrs.bfd,
        'check-control-plane-failure': !!attrs.bfd?.['check-control-plane-failure'],
        profile: attrs.bfd?.profile || '',
      },
      capability: {
        dynamic: !!attrs.capability?.dynamic,
        'extended-nexthop': !!attrs.capability?.['extended-nexthop'],
        'software-version': !!attrs.capability?.['software-version'],
      },
      'graceful-restart': {
        enable: !!attrs['graceful-restart'],
        'restart-time': attrs['graceful-restart']?.['restart-time'] || '',
        'stalepath-time': attrs['graceful-restart']?.['stalepath-time'] || '',
      },
      'enforce-first-as': !!attrs['enforce-first-as'],
      'override-capability': !!attrs['override-capability'],
      'disable-connected-check': !!attrs['disable-connected-check'],
      'disable-capability-negotiation': !!attrs['disable-capability-negotiation'],
    });
  }

  // BMP targets
  const bmpTargets = [];
  const bmpData = data.bmp?.target || {};
  for (const [name, attrs] of Object.entries(bmpData)) {
    bmpTargets.push({
      name,
      address: attrs.address || '',
      port: attrs.port || '5000',
      'max-retry': attrs['max-retry'] || '2000',
      'min-retry': attrs['min-retry'] || '1000',
      mirror: !!attrs.mirror,
      monitor: {
        'ipv4-unicast': {
          'post-policy': !!attrs.monitor?.['ipv4-unicast']?.['post-policy'],
          'pre-policy': !!attrs.monitor?.['ipv4-unicast']?.['pre-policy'],
        },
        'ipv6-unicast': {
          'post-policy': !!attrs.monitor?.['ipv6-unicast']?.['post-policy'],
          'pre-policy': !!attrs.monitor?.['ipv6-unicast']?.['pre-policy'],
        },
      },
    });
  }

  // Listen ranges
  const listenRanges = [];
  const listenData = data.listen?.range || {};
  for (const [range, attrs] of Object.entries(listenData)) {
    listenRanges.push({
      range,
      'peer-group': attrs['peer-group'] || '',
    });
  }

  // Address family - ipv4-unicast
  const afIpv4 = data['address-family']?.['ipv4-unicast'] || {};
  const networks = [];
  const networkData = afIpv4.network || {};
  for (const [network, attrs] of Object.entries(networkData)) {
    networks.push({
      network,
      backdoor: !!attrs.backdoor,
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv4-unicast aggregate-address
  const aggregates = [];
  const aggregateData = afIpv4['aggregate-address'] || {};
  for (const [aggregate, attrs] of Object.entries(aggregateData)) {
    aggregates.push({
      aggregate,
      'as-set': !!attrs['as-set'],
      'summary-only': !!attrs['summary-only'],
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv4-unicast redistribute
  const redistributes = [];
  const redistData = afIpv4.redistribute || {};
  for (const [proto, attrs] of Object.entries(redistData)) {
    redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv4-unicast distance
  const distance = {
    external: afIpv4.distance?.external || '',
    internal: afIpv4.distance?.internal || '',
    local: afIpv4.distance?.local || '',
    prefixes: [],
  };
  const distancePrefixData = afIpv4.distance?.prefix || {};
  for (const [prefix, attrs] of Object.entries(distancePrefixData)) {
    distance.prefixes.push({
      prefix,
      distance: attrs.distance || '',
    });
  }

  // Address family - ipv4-unicast maximum-paths
  const maxPaths = {
    ebgp: afIpv4['maximum-paths']?.ebgp || '',
    ibgp: afIpv4['maximum-paths']?.ibgp || '',
  };

  // Address family - ipv4-unicast export
  const exportConfig = {
    vpn: !!afIpv4.export?.vpn,
  };

  // Address family - ipv4-unicast import
  const importConfig = {
    vpn: !!afIpv4.import?.vpn,
    vrfs: [],
  };
  const importVrfData = afIpv4.import?.vrf || {};
  for (const vrf of Object.keys(importVrfData)) {
    importConfig.vrfs.push(vrf);
  }

  // Address family - ipv4-unicast label
  const labelConfig = {
    vpn: {
      export: afIpv4.label?.vpn?.export || '',
      'allocation-mode': afIpv4.label?.vpn?.['allocation-mode'] || '',
    },
  };

  // Address family - ipv4-unicast nexthop
  const nexthopConfig = {
    vpn: {
      export: afIpv4.nexthop?.vpn?.export || '',
    },
  };

  // Address family - ipv4-unicast rd
  const rdConfig = {
    vpn: {
      export: afIpv4.rd?.vpn?.export || '',
    },
  };

  // Address family - ipv4-unicast route-map
  const routeMapConfig = {
    vpn: {
      export: afIpv4['route-map']?.vpn?.export || '',
      import: afIpv4['route-map']?.vpn?.import || '',
    },
  };

  // Address family - ipv4-unicast route-target
  const routeTargetConfig = {
    vpn: {
      both: afIpv4['route-target']?.vpn?.both || '',
      export: afIpv4['route-target']?.vpn?.export || '',
      import: afIpv4['route-target']?.vpn?.import || '',
    },
  };

  // Address family - ipv4-unicast sid
  const sidConfig = {
    vpn: {
      export: afIpv4.sid?.vpn?.export || '',
    },
  };

  // Address family - ipv4-multicast distance
  const ipv4MulticastDistance = {
    external: data['address-family']?.['ipv4-multicast']?.distance?.external || '',
    internal: data['address-family']?.['ipv4-multicast']?.distance?.internal || '',
    local: data['address-family']?.['ipv4-multicast']?.distance?.local || '',
  };

  // Address family - ipv4-multicast distance prefix
  const ipv4MulticastDistancePrefixes = [];
  const ipv4MulticastDistancePrefixData = data['address-family']?.['ipv4-multicast']?.distance?.prefix || {};
  for (const [prefix, attrs] of Object.entries(ipv4MulticastDistancePrefixData)) {
    ipv4MulticastDistancePrefixes.push({
      prefix,
      distance: attrs.distance || '',
    });
  }

  // Address family - ipv4-vpn rd
  const ipv4VpnRd = data['address-family']?.['ipv4-vpn']?.rd || '';

  // Address family - ipv4-vpn route-target
  const ipv4VpnRouteTarget = {
    both: data['address-family']?.['ipv4-vpn']?.['route-target']?.both || '',
    export: data['address-family']?.['ipv4-vpn']?.['route-target']?.export || '',
    import: data['address-family']?.['ipv4-vpn']?.['route-target']?.import || '',
  };

  // Address family - ipv4-vpn label
  const ipv4VpnLabel = {
    export: data['address-family']?.['ipv4-vpn']?.label?.export || '',
    'allocation-mode': data['address-family']?.['ipv4-vpn']?.label?.['allocation-mode'] || '',
  };

  // Address family - ipv4-vpn nexthop
  const ipv4VpnNexthop = data['address-family']?.['ipv4-vpn']?.nexthop || '';

  // Address family - ipv4-vpn route-map
  const ipv4VpnRouteMap = {
    export: data['address-family']?.['ipv4-vpn']?.['route-map']?.export || '',
    import: data['address-family']?.['ipv4-vpn']?.['route-map']?.import || '',
  };

  // Address family - ipv4-vpn sid
  const ipv4VpnSid = data['address-family']?.['ipv4-vpn']?.sid || '';

  // Address family - ipv6-unicast
  const afIpv6 = data['address-family']?.['ipv6-unicast'] || {};
  const ipv6Networks = [];
  const ipv6NetworkData = afIpv6.network || {};
  for (const [network, attrs] of Object.entries(ipv6NetworkData)) {
    ipv6Networks.push({
      network,
      'path-limit': attrs['path-limit'] || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv6-unicast aggregate-address
  const ipv6Aggregates = [];
  const ipv6AggregateData = afIpv6['aggregate-address'] || {};
  for (const [aggregate, attrs] of Object.entries(ipv6AggregateData)) {
    ipv6Aggregates.push({
      aggregate,
      'as-set': !!attrs['as-set'],
      'summary-only': !!attrs['summary-only'],
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv6-unicast redistribute
  const ipv6Redistributes = [];
  const ipv6RedistData = afIpv6.redistribute || {};
  for (const [proto, attrs] of Object.entries(ipv6RedistData)) {
    ipv6Redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  // Address family - ipv6-unicast distance
  const ipv6Distance = {
    external: afIpv6.distance?.external || '',
    internal: afIpv6.distance?.internal || '',
    local: afIpv6.distance?.local || '',
  };

  // Address family - ipv6-unicast distance prefix
  const ipv6DistancePrefixes = [];
  const ipv6DistancePrefixData = afIpv6.distance?.prefix || {};
  for (const [prefix, attrs] of Object.entries(ipv6DistancePrefixData)) {
    ipv6DistancePrefixes.push({
      prefix,
      distance: attrs.distance || '',
    });
  }

  // Address family - ipv6-unicast maximum-paths
  const ipv6MaxPaths = {
    ebgp: afIpv6['maximum-paths']?.ebgp || '',
    ibgp: afIpv6['maximum-paths']?.ibgp || '',
  };

  // Address family - ipv6-unicast export
  const ipv6ExportConfig = {
    vpn: !!afIpv6.export?.vpn,
  };

  // Address family - ipv6-unicast import
  const ipv6ImportConfig = {
    vpn: !!afIpv6.import?.vpn,
    vrfs: [],
  };
  const ipv6ImportVrfData = afIpv6.import?.vrf || {};
  for (const vrf of Object.keys(ipv6ImportVrfData)) {
    ipv6ImportConfig.vrfs.push(vrf);
  }

  // Address family - ipv6-unicast label
  const ipv6LabelConfig = {
    vpn: {
      export: afIpv6.label?.vpn?.export || '',
      'allocation-mode': afIpv6.label?.vpn?.['allocation-mode'] || '',
    },
  };

  // Address family - ipv6-unicast nexthop
  const ipv6NexthopConfig = {
    vpn: {
      export: afIpv6.nexthop?.vpn?.export || '',
    },
  };

  // Address family - ipv6-unicast rd
  const ipv6RdConfig = {
    vpn: {
      export: afIpv6.rd?.vpn?.export || '',
    },
  };

  // Address family - ipv6-unicast route-map
  const ipv6RouteMapConfig = {
    vpn: {
      export: afIpv6['route-map']?.vpn?.export || '',
      import: afIpv6['route-map']?.vpn?.import || '',
    },
  };

  // Address family - ipv6-unicast route-target
  const ipv6RouteTargetConfig = {
    vpn: {
      both: afIpv6['route-target']?.vpn?.both || '',
      export: afIpv6['route-target']?.vpn?.export || '',
      import: afIpv6['route-target']?.vpn?.import || '',
    },
  };

  // Address family - ipv6-unicast sid
  const ipv6SidConfig = {
    vpn: {
      export: afIpv6.sid?.vpn?.export || '',
    },
  };

  // Address family - ipv6-multicast distance
  const ipv6MulticastDistance = {
    external: data['address-family']?.['ipv6-multicast']?.distance?.external || '',
    internal: data['address-family']?.['ipv6-multicast']?.distance?.internal || '',
    local: data['address-family']?.['ipv6-multicast']?.distance?.local || '',
  };

  // Address family - ipv6-multicast distance prefix
  const ipv6MulticastDistancePrefixes = [];
  const ipv6MulticastDistancePrefixData = data['address-family']?.['ipv6-multicast']?.distance?.prefix || {};
  for (const [prefix, attrs] of Object.entries(ipv6MulticastDistancePrefixData)) {
    ipv6MulticastDistancePrefixes.push({
      prefix,
      distance: attrs.distance || '',
    });
  }

  // Address family - ipv6-multicast maximum-paths
  const ipv6MulticastMaxPaths = {
    ebgp: data['address-family']?.['ipv6-multicast']?.['maximum-paths']?.ebgp || '',
    ibgp: data['address-family']?.['ipv6-multicast']?.['maximum-paths']?.ibgp || '',
  };

  // Address family - ipv6-vpn rd
  const ipv6VpnRd = data['address-family']?.['ipv6-vpn']?.rd || '';

  // Address family - ipv6-vpn route-target
  const ipv6VpnRouteTarget = {
    both: data['address-family']?.['ipv6-vpn']?.['route-target']?.both || '',
    export: data['address-family']?.['ipv6-vpn']?.['route-target']?.export || '',
    import: data['address-family']?.['ipv6-vpn']?.['route-target']?.import || '',
  };

  // Address family - ipv6-vpn label
  const ipv6VpnLabel = {
    export: data['address-family']?.['ipv6-vpn']?.label?.export || '',
    'allocation-mode': data['address-family']?.['ipv6-vpn']?.label?.['allocation-mode'] || '',
  };

  // Address family - ipv6-vpn nexthop
  const ipv6VpnNexthop = data['address-family']?.['ipv6-vpn']?.nexthop || '';

  // Address family - ipv6-vpn route-map
  const ipv6VpnRouteMap = {
    export: data['address-family']?.['ipv6-vpn']?.['route-map']?.export || '',
    import: data['address-family']?.['ipv6-vpn']?.['route-map']?.import || '',
  };

  // Address family - ipv6-vpn sid
  const ipv6VpnSid = data['address-family']?.['ipv6-vpn']?.sid || '';

  // Helper function to parse address family data
  function parseAddressFamily(familyName) {
    const af = data['address-family']?.[familyName] || {};
    const networks = [];
    const networkData = af.network || {};
    for (const [network, attrs] of Object.entries(networkData)) {
      networks.push({
        network,
        backdoor: !!attrs.backdoor,
        'route-map': attrs['route-map'] || '',
      });
    }

    const aggregates = [];
    const aggregateData = af['aggregate-address'] || {};
    for (const [aggregate, attrs] of Object.entries(aggregateData)) {
      aggregates.push({
        aggregate,
        'as-set': !!attrs['as-set'],
        'summary-only': !!attrs['summary-only'],
        'route-map': attrs['route-map'] || '',
      });
    }

    const redistributes = [];
    const redistData = af.redistribute || {};
    for (const [proto, attrs] of Object.entries(redistData)) {
      redistributes.push({
        protocol: proto,
        metric: attrs.metric || '',
        'route-map': attrs['route-map'] || '',
      });
    }

    // Parse distance with complete structure
    const distance = {
      external: af.distance?.external || '',
      internal: af.distance?.internal || '',
      local: af.distance?.local || '',
      prefixes: [],
    };
    const distancePrefixData = af.distance?.prefix || {};
    for (const [prefix, attrs] of Object.entries(distancePrefixData)) {
      distance.prefixes.push({
        prefix,
        distance: attrs.distance || '',
      });
    }

    const maxPaths = {
      ebgp: af['maximum-paths']?.ebgp || '',
      ibgp: af['maximum-paths']?.ibgp || '',
    };

    return { networks, aggregates, redistributes, distance, maxPaths };
  }

  // Parse all 8 new address families
  const ipv4FlowspecData = parseAddressFamily('ipv4-flowspec');
  // Parse ipv4-flowspec local-install interface
  const ipv4FlowspecLocalInstall = data['address-family']?.['ipv4-flowspec']?.['local-install']?.interface || '';
  const ipv4LabeledUnicastData = parseAddressFamily('ipv4-labeled-unicast');
  const ipv4MulticastData = parseAddressFamily('ipv4-multicast');
  const ipv4VpnData = parseAddressFamily('ipv4-vpn');
  // Parse ipv4-vpn networks with label and rd
  const ipv4VpnNetworks = [];
  const ipv4VpnNetworkData = data['address-family']?.['ipv4-vpn']?.network || {};
  for (const [network, attrs] of Object.entries(ipv4VpnNetworkData)) {
    ipv4VpnNetworks.push({
      network,
      label: attrs.label || '',
      rd: attrs.rd || '',
    });
  }
  const ipv6FlowspecData = parseAddressFamily('ipv6-flowspec');
  // Parse ipv6-flowspec local-install interface
  const ipv6FlowspecLocalInstall = data['address-family']?.['ipv6-flowspec']?.['local-install']?.interface || '';
  const ipv6LabeledUnicastData = parseAddressFamily('ipv6-labeled-unicast');
  const ipv6MulticastData = parseAddressFamily('ipv6-multicast');
  const ipv6VpnData = parseAddressFamily('ipv6-vpn');
  // Parse ipv6-vpn networks with label and rd
  const ipv6VpnNetworks = [];
  const ipv6VpnNetworkData = data['address-family']?.['ipv6-vpn']?.network || {};
  for (const [network, attrs] of Object.entries(ipv6VpnNetworkData)) {
    ipv6VpnNetworks.push({
      network,
      label: attrs.label || '',
      rd: attrs.rd || '',
    });
  }

  // Interface MPLS
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [name, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name,
      'mpls-forwarding': !!attrs.mpls?.forwarding,
    });
  }

  // Address family - l2vpn-evpn
  const afL2vpnEvpn = data['address-family']?.['l2vpn-evpn'] || {};
  const evpnRouteTargets = [];
  const rtData = afL2vpnEvpn['route-target'] || {};
  for (const direction of ['both', 'export', 'import']) {
    const rtList = rtData[direction] || {};
    for (const [rt, attrs] of Object.entries(rtList)) {
      evpnRouteTargets.push({
        direction,
        'route-target': rt,
      });
    }
  }

  const evpVnis = [];
  const vniData = afL2vpnEvpn.vni || {};
  for (const [vni, attrs] of Object.entries(vniData)) {
    const vniRts = [];
    const vniRtData = attrs['route-target'] || {};
    for (const direction of ['both', 'export', 'import']) {
      const rtList = vniRtData[direction] || {};
      for (const [rt, rtAttrs] of Object.entries(rtList)) {
        vniRts.push({
          direction,
          'route-target': rt,
        });
      }
    }
    evpVnis.push({
      vni,
      'route-targets': vniRts,
    });
  }

  return {
    'system-as': data['system-as'] || '',
    neighbors,
    peerGroups,
    bmpTargets,
    listenRanges,
    networks,
    aggregates,
    redistributes,
    distance,
    maxPaths,
    exportConfig,
    importConfig,
    labelConfig,
    nexthopConfig,
    rdConfig,
    routeMapConfig,
    routeTargetConfig,
    sidConfig,
    ipv6Networks,
    ipv6Aggregates,
    ipv6Redistributes,
    ipv6Distance,
    ipv6DistancePrefixes,
    ipv6MaxPaths,
    ipv6ExportConfig,
    ipv6ImportConfig,
    ipv6LabelConfig,
    ipv6NexthopConfig,
    ipv6RdConfig,
    ipv6RouteMapConfig,
    ipv6RouteTargetConfig,
    ipv6SidConfig,
    ipv6MulticastDistance,
    ipv6MulticastMaxPaths,
    ipv6VpnRd,
    ipv6VpnRouteTarget,
    ipv6VpnLabel,
    ipv6VpnNexthop,
    ipv6VpnRouteMap,
    ipv6VpnSid,
    ipv4FlowspecNetworks: ipv4FlowspecData.networks,
    ipv4FlowspecAggregates: ipv4FlowspecData.aggregates,
    ipv4FlowspecRedistributes: ipv4FlowspecData.redistributes,
    ipv4FlowspecDistance: ipv4FlowspecData.distance,
    ipv4FlowspecMaxPaths: ipv4FlowspecData.maxPaths,
    ipv4MulticastNetworks: ipv4MulticastData.networks,
    ipv4MulticastAggregates: ipv4MulticastData.aggregates,
    ipv4MulticastRedistributes: ipv4MulticastData.redistributes,
    ipv4VpnNetworks: ipv4VpnData.networks,
    ipv4VpnAggregates: ipv4VpnData.aggregates,
    ipv4VpnRedistributes: ipv4VpnData.redistributes,
    ipv4VpnDistance: ipv4VpnData.distance,
    ipv4VpnMaxPaths: ipv4VpnData.maxPaths,
    ipv4VpnRd: ipv4VpnRd,
    ipv4VpnRouteTarget: ipv4VpnRouteTarget,
    ipv4VpnLabel: ipv4VpnLabel,
    ipv4VpnNexthop: ipv4VpnNexthop,
    ipv4VpnRouteMap: ipv4VpnRouteMap,
    ipv4VpnSid: ipv4VpnSid,
    ipv6FlowspecNetworks: ipv6FlowspecData.networks,
    ipv6FlowspecAggregates: ipv6FlowspecData.aggregates,
    ipv6FlowspecRedistributes: ipv6FlowspecData.redistributes,
    ipv6FlowspecDistance: ipv6FlowspecData.distance,
    ipv6FlowspecMaxPaths: ipv6FlowspecData.maxPaths,
    ipv6LabeledUnicastNetworks: ipv6LabeledUnicastData.networks,
    ipv6LabeledUnicastAggregates: ipv6LabeledUnicastData.aggregates,
    ipv6MulticastNetworks: ipv6MulticastData.networks,
    ipv6MulticastAggregates: ipv6MulticastData.aggregates,
    ipv6MulticastRedistributes: ipv6MulticastData.redistributes,
    ipv6MulticastDistance: ipv6MulticastData.distance,
    ipv6MulticastMaxPaths: ipv6MulticastData.maxPaths,
    ipv6VpnNetworks: ipv6VpnData.networks,
    ipv6VpnAggregates: ipv6VpnData.aggregates,
    ipv6VpnRedistributes: ipv6VpnData.redistributes,
    ipv6VpnDistance: ipv6VpnData.distance,
    ipv6VpnMaxPaths: ipv6VpnData.maxPaths,
    interfaces,
    timers: data.timers || { connect: '', holdtime: '', keepalive: '' },
    'mirror-buffer-limit': data.bmp?.['mirror-buffer-limit'] || '',
    'listen-limit': data.listen?.limit || '',
    parameters: {
      'cluster-id': data.parameters?.['cluster-id'] || '',
      'router-id': data.parameters?.['router-id'] || '',
      'log-neighbor-changes': !!data.parameters?.['log-neighbor-changes'],
      'always-compare-med': !!data.parameters?.['always-compare-med'],
      'deterministic-med': !!data.parameters?.['deterministic-med'],
      'ebgp-requires-policy': !!data.parameters?.['ebgp-requires-policy'],
      'fast-convergence': !!data.parameters?.['fast-convergence'],
      'graceful-shutdown': !!data.parameters?.['graceful-shutdown'],
      'network-import-check': !!data.parameters?.['network-import-check'],
      'disable-ebgp-connected-route-check': !!data.parameters?.['disable-ebgp-connected-route-check'],
      'allow-martian-nexthop': !!data.parameters?.['allow-martian-nexthop'],
      bestpath: {
        'as-path': {
          'multipath-relax': !!data.parameters?.bestpath?.['as-path']?.['multipath-relax'],
          'ignore': !!data.parameters?.bestpath?.['as-path']?.ignore,
        },
        'compare-routerid': !!data.parameters?.bestpath?.['compare-routerid'],
        'med': {
          'confed': !!data.parameters?.bestpath?.med?.confed,
          'missing-as-worst': !!data.parameters?.bestpath?.med?.['missing-as-worst'],
        },
        'skip-mp': !!data.parameters?.bestpath?.['skip-mp'],
      },
      confederation: {
        identifier: data.parameters?.confederation?.identifier || '',
        peers: toArray(data.parameters?.confederation?.peers),
      },
      dampening: {
        enable: !!data.parameters?.dampening,
        'max-suppress-time': data.parameters?.dampening?.['max-suppress-time'] || '',
        'start-suppress-time': data.parameters?.dampening?.['start-suppress-time'] || '',
        'half-life': data.parameters?.dampening?.['half-life'] || '',
        'reuse': data.parameters?.dampening?.reuse || '',
      },
      'graceful-restart': {
        enable: !!data.parameters?.['graceful-restart'],
        restart: data.parameters?.['graceful-restart']?.restart || '',
        stalepath: data.parameters?.['graceful-restart']?.stalepath || '',
      },
    },
    sid: {
      vpn: !!data.sid?.vpn,
    },
    srv6: {
      locator: data.srv6?.locator || '',
    },
    'address-family': {
      ...(data['address-family'] || {}),
      'ipv4-flowspec': {
        'local-install': {
          interface: data['address-family']?.['ipv4-flowspec']?.['local-install']?.interface || '',
        },
      },
      'ipv4-labeled-unicast': {
        networks: ipv4LabeledUnicastData.networks,
        aggregates: ipv4LabeledUnicastData.aggregates,
        maxPaths: ipv4LabeledUnicastData.maxPaths,
      },
      'ipv4-multicast': {
        networks: ipv4MulticastData.networks,
        aggregates: ipv4MulticastData.aggregates,
        distance: ipv4MulticastDistance,
        distancePrefixes: ipv4MulticastDistancePrefixes,
      },
      'ipv4-vpn': {
        networks: ipv4VpnNetworks,
      },
      'ipv6-flowspec': {
        'local-install': {
          interface: ipv6FlowspecLocalInstall,
        },
      },
      'ipv6-labeled-unicast': {
        networks: ipv6LabeledUnicastData.networks,
        aggregates: ipv6LabeledUnicastData.aggregates,
      },
      'ipv6-multicast': {
        networks: ipv6MulticastData.networks,
        aggregates: ipv6MulticastData.aggregates,
        distance: ipv6MulticastDistance,
        distancePrefixes: ipv6MulticastDistancePrefixes,
      },
      'ipv6-vpn': {
        networks: ipv6VpnNetworks,
      },
      'l2vpn-evpn': {
        'advertise-all-vni': !!afL2vpnEvpn['advertise-all-vni'],
        'advertise-pip': !!afL2vpnEvpn['advertise-pip'],
        'advertise-svi-ip': !!afL2vpnEvpn['advertise-svi-ip'],
        'disable-ead-evi-rx': !!afL2vpnEvpn['disable-ead-evi-rx'],
        'disable-ead-evi-tx': !!afL2vpnEvpn['disable-ead-evi-tx'],
        rd: afL2vpnEvpn.rd || '',
        'rt-auto-derive': !!afL2vpnEvpn['rt-auto-derive'],
        flooding: !!afL2vpnEvpn.flooding,
        'mac-vrf': {
          soo: afL2vpnEvpn['mac-vrf']?.soo || '',
        },
        'route-targets': evpnRouteTargets,
        vnis: evpVnis,
        'ead-es-route-target': {
          export: afL2vpnEvpn['ead-es-route-target']?.export || '',
        },
        'ead-es-frag': {
          'evi-limit': afL2vpnEvpn['ead-es-frag']?.['evi-limit'] || '',
        },
        advertise: {
          'ipv4-unicast': {
            enable: !!afL2vpnEvpn.advertise?.['ipv4-unicast'],
            'route-map': afL2vpnEvpn.advertise?.['ipv4-unicast']?.['route-map'] || '',
          },
          'ipv6-unicast': {
            enable: !!afL2vpnEvpn.advertise?.['ipv6-unicast'],
            'route-map': afL2vpnEvpn.advertise?.['ipv6-unicast']?.['route-map'] || '',
          },
        },
        'default-originate': {
          'ipv4': !!afL2vpnEvpn['default-originate']?.ipv4,
          'ipv6': !!afL2vpnEvpn['default-originate']?.ipv6,
        },
      },
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['system-as'])) {
    result['system-as'] = String(form['system-as']);
  }

  // Neighbors
  if (form.neighbors?.length) {
    result.neighbor = {};
    for (const n of form.neighbors) {
      if (!n.address) continue;
      const attrs = {};
      if (isPresent(n['remote-as'])) attrs['remote-as'] = String(n['remote-as']);
      if (isPresent(n.description)) attrs.description = n.description;
      if (isPresent(n['peer-group'])) attrs['peer-group'] = n['peer-group'];
      if (n.shutdown) attrs.shutdown = {};
      if (n.passive) attrs.passive = {};
      if (isPresent(n['ebgp-multihop'])) attrs['ebgp-multihop'] = String(n['ebgp-multihop']);
      if (isPresent(n['advertisement-interval'])) attrs['advertisement-interval'] = String(n['advertisement-interval']);
      if (isPresent(n.password)) attrs.password = n.password;
      if (isPresent(n.port)) attrs.port = String(n.port);
      if (isPresent(n['update-source'])) attrs['update-source'] = n['update-source'];
      if (isPresent(n['local-as'])) attrs['local-as'] = String(n['local-as']);
      if (isPresent(n['local-role'])) attrs['local-role'] = n['local-role'];
      if (n.timers && (n.timers.connect || n.timers.holdtime || n.timers.keepalive)) {
        attrs.timers = {};
        if (isPresent(n.timers.connect)) attrs.timers.connect = String(n.timers.connect);
        if (isPresent(n.timers.holdtime)) attrs.timers.holdtime = String(n.timers.holdtime);
        if (isPresent(n.timers.keepalive)) attrs.timers.keepalive = String(n.timers.keepalive);
      }
      if (n['ttl-security'] && isPresent(n['ttl-security'].hops)) {
        attrs['ttl-security'] = { hops: String(n['ttl-security'].hops) };
      }
      // BFD
      if (n.bfd?.enable) {
        const bfdAttrs = {};
        if (n.bfd['check-control-plane-failure']) bfdAttrs['check-control-plane-failure'] = {};
        if (isPresent(n.bfd.profile)) bfdAttrs.profile = n.bfd.profile;
        attrs.bfd = Object.keys(bfdAttrs).length ? bfdAttrs : {};
      }
      // Capability
      if (n.capability) {
        const capAttrs = {};
        if (n.capability.dynamic) capAttrs.dynamic = {};
        if (n.capability['extended-nexthop']) capAttrs['extended-nexthop'] = {};
        if (n.capability['software-version']) capAttrs['software-version'] = {};
        if (Object.keys(capAttrs).length) attrs.capability = capAttrs;
      }
      // Graceful restart
      if (n['graceful-restart']?.enable) {
        const grAttrs = {};
        if (isPresent(n['graceful-restart']['restart-time'])) grAttrs['restart-time'] = String(n['graceful-restart']['restart-time']);
        if (isPresent(n['graceful-restart']['stalepath-time'])) grAttrs['stalepath-time'] = String(n['graceful-restart']['stalepath-time']);
        if (n['graceful-restart']['preserve-fw-state']) grAttrs['preserve-fw-state'] = {};
        attrs['graceful-restart'] = Object.keys(grAttrs).length ? grAttrs : {};
      }
      // Path attribute
      if (n['path-attribute']) {
        const paAttrs = {};
        if (isPresent(n['path-attribute'].discard)) paAttrs.discard = n['path-attribute'].discard.split(',').map(s => s.trim()).filter(Boolean);
        if (isPresent(n['path-attribute']['treat-as-withdraw'])) paAttrs['treat-as-withdraw'] = n['path-attribute']['treat-as-withdraw'].split(',').map(s => s.trim()).filter(Boolean);
        if (Object.keys(paAttrs).length) attrs['path-attribute'] = paAttrs;
      }
      result.neighbor[n.address] = attrs;
    }
  }

  // Peer groups
  if (form.peerGroups?.length) {
    result['peer-group'] = {};
    for (const pg of form.peerGroups) {
      if (!pg.name) continue;
      const attrs = {};
      if (isPresent(pg['remote-as'])) attrs['remote-as'] = String(pg['remote-as']);
      if (isPresent(pg.description)) attrs.description = pg.description;
      if (pg.shutdown) attrs.shutdown = {};
      if (isPresent(pg['ebgp-multihop'])) attrs['ebgp-multihop'] = String(pg['ebgp-multihop']);
      if (isPresent(pg['advertisement-interval'])) attrs['advertisement-interval'] = String(pg['advertisement-interval']);
      if (isPresent(pg.password)) attrs.password = pg.password;
      if (isPresent(pg['local-as'])) attrs['local-as'] = String(pg['local-as']);
      if (isPresent(pg['local-role'])) attrs['local-role'] = pg['local-role'];
      if (pg.timers && (pg.timers.connect || pg.timers.holdtime || pg.timers.keepalive)) {
        attrs.timers = {};
        if (isPresent(pg.timers.connect)) attrs.timers.connect = String(pg.timers.connect);
        if (isPresent(pg.timers.holdtime)) attrs.timers.holdtime = String(pg.timers.holdtime);
        if (isPresent(pg.timers.keepalive)) attrs.timers.keepalive = String(pg.timers.keepalive);
      }
      if (pg['ttl-security'] && isPresent(pg['ttl-security'].hops)) {
        attrs['ttl-security'] = { hops: String(pg['ttl-security'].hops) };
      }
      // BFD
      if (pg.bfd?.enable) {
        const bfdAttrs = {};
        if (pg.bfd['check-control-plane-failure']) bfdAttrs['check-control-plane-failure'] = {};
        if (isPresent(pg.bfd.profile)) bfdAttrs.profile = pg.bfd.profile;
        attrs.bfd = Object.keys(bfdAttrs).length ? bfdAttrs : {};
      }
      // Capability
      if (pg.capability) {
        const capAttrs = {};
        if (pg.capability.dynamic) capAttrs.dynamic = {};
        if (pg.capability['extended-nexthop']) capAttrs['extended-nexthop'] = {};
        if (pg.capability['software-version']) capAttrs['software-version'] = {};
        if (Object.keys(capAttrs).length) attrs.capability = capAttrs;
      }
      // Graceful restart
      if (pg['graceful-restart']?.enable) {
        const grAttrs = {};
        if (isPresent(pg['graceful-restart']['restart-time'])) grAttrs['restart-time'] = String(pg['graceful-restart']['restart-time']);
        if (isPresent(pg['graceful-restart']['stalepath-time'])) grAttrs['stalepath-time'] = String(pg['graceful-restart']['stalepath-time']);
        if (pg['graceful-restart']['preserve-fw-state']) grAttrs['preserve-fw-state'] = {};
        attrs['graceful-restart'] = Object.keys(grAttrs).length ? grAttrs : {};
      }
      // Path attribute
      if (pg['path-attribute']) {
        const paAttrs = {};
        if (isPresent(pg['path-attribute'].discard)) paAttrs.discard = pg['path-attribute'].discard.split(',').map(s => s.trim()).filter(Boolean);
        if (isPresent(pg['path-attribute']['treat-as-withdraw'])) paAttrs['treat-as-withdraw'] = pg['path-attribute']['treat-as-withdraw'].split(',').map(s => s.trim()).filter(Boolean);
        if (Object.keys(paAttrs).length) attrs['path-attribute'] = paAttrs;
      }
      result['peer-group'][pg.name] = attrs;
    }
  }

  // BMP targets
  if (form.bmpTargets?.length) {
    result.bmp = { target: {} };
    for (const t of form.bmpTargets) {
      if (!t.name) continue;
      const attrs = {};
      if (isPresent(t.address)) attrs.address = t.address;
      if (isPresent(t.port)) attrs.port = String(t.port);
      if (isPresent(t['max-retry'])) attrs['max-retry'] = String(t['max-retry']);
      if (isPresent(t['min-retry'])) attrs['min-retry'] = String(t['min-retry']);
      if (t.mirror) attrs.mirror = {};
      // Monitor
      if (t.monitor) {
        const monitorAttrs = {};
        if (t.monitor['ipv4-unicast']) {
          const ipv4Attrs = {};
          if (t.monitor['ipv4-unicast']['post-policy']) ipv4Attrs['post-policy'] = {};
          if (t.monitor['ipv4-unicast']['pre-policy']) ipv4Attrs['pre-policy'] = {};
          if (Object.keys(ipv4Attrs).length) monitorAttrs['ipv4-unicast'] = ipv4Attrs;
        }
        if (t.monitor['ipv6-unicast']) {
          const ipv6Attrs = {};
          if (t.monitor['ipv6-unicast']['post-policy']) ipv6Attrs['post-policy'] = {};
          if (t.monitor['ipv6-unicast']['pre-policy']) ipv6Attrs['pre-policy'] = {};
          if (Object.keys(ipv6Attrs).length) monitorAttrs['ipv6-unicast'] = ipv6Attrs;
        }
        if (Object.keys(monitorAttrs).length) attrs.monitor = monitorAttrs;
      }
      result.bmp.target[t.name] = attrs;
    }
    if (isPresent(form['mirror-buffer-limit'])) {
      result.bmp['mirror-buffer-limit'] = String(form['mirror-buffer-limit']);
    }
  }

  // Listen ranges
  if (form.listenRanges?.length) {
    result.listen = { range: {} };
    for (const lr of form.listenRanges) {
      if (!lr.range) continue;
      const attrs = {};
      if (isPresent(lr['peer-group'])) attrs['peer-group'] = lr['peer-group'];
      result.listen.range[lr.range] = attrs;
    }
    if (isPresent(form['listen-limit'])) {
      result.listen.limit = String(form['listen-limit']);
    }
  }

  // Networks
  if (form.networks?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].network = {};
    for (const net of form.networks) {
      if (net.network) {
        const attrs = {};
        if (net.backdoor) attrs.backdoor = {};
        if (isPresent(net['route-map'])) attrs['route-map'] = net['route-map'];
        result['address-family']['ipv4-unicast'].network[net.network] = attrs;
      }
    }
  }

  // Aggregate addresses
  if (form.aggregates?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast']['aggregate-address'] = {};
    for (const agg of form.aggregates) {
      if (agg.aggregate) {
        const attrs = {};
        if (agg['as-set']) attrs['as-set'] = {};
        if (agg['summary-only']) attrs['summary-only'] = {};
        if (isPresent(agg['route-map'])) attrs['route-map'] = agg['route-map'];
        result['address-family']['ipv4-unicast']['aggregate-address'][agg.aggregate] = attrs;
      }
    }
  }

  // Redistribute
  if (form.redistributes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].redistribute = {};
    for (const r of form.redistributes) {
      if (!r.protocol) continue;
      const attrs = {};
      if (isPresent(r.metric)) attrs.metric = String(r.metric);
      if (isPresent(r['route-map'])) attrs['route-map'] = r['route-map'];
      result['address-family']['ipv4-unicast'].redistribute[r.protocol] = attrs;
    }
  }

  // Distance
  if (form.distance && (form.distance.external || form.distance.internal || form.distance.local)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].distance = {};
    if (isPresent(form.distance.external)) result['address-family']['ipv4-unicast'].distance.external = String(form.distance.external);
    if (isPresent(form.distance.internal)) result['address-family']['ipv4-unicast'].distance.internal = String(form.distance.internal);
    if (isPresent(form.distance.local)) result['address-family']['ipv4-unicast'].distance.local = String(form.distance.local);
  }

  // Maximum paths
  if (form.maxPaths && (form.maxPaths.ebgp || form.maxPaths.ibgp)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast']['maximum-paths'] = {};
    if (isPresent(form.maxPaths.ebgp)) result['address-family']['ipv4-unicast']['maximum-paths'].ebgp = String(form.maxPaths.ebgp);
    if (isPresent(form.maxPaths.ibgp)) result['address-family']['ipv4-unicast']['maximum-paths'].ibgp = String(form.maxPaths.ibgp);
  }

  // Distance prefix
  if (form.distance?.prefixes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    if (!result['address-family']['ipv4-unicast'].distance) result['address-family']['ipv4-unicast'].distance = {};
    result['address-family']['ipv4-unicast'].distance.prefix = {};
    for (const p of form.distance.prefixes) {
      if (p.prefix && isPresent(p.distance)) {
        result['address-family']['ipv4-unicast'].distance.prefix[p.prefix] = { distance: String(p.distance) };
      }
    }
  }

  // Export
  if (form.exportConfig?.vpn) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].export = { vpn: {} };
  }

  // Import
  if (form.importConfig?.vpn || form.importConfig?.vrfs?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].import = {};
    if (form.importConfig.vpn) result['address-family']['ipv4-unicast'].import.vpn = {};
    if (form.importConfig.vrfs?.length) {
      result['address-family']['ipv4-unicast'].import.vrf = {};
      for (const vrf of form.importConfig.vrfs) {
        result['address-family']['ipv4-unicast'].import.vrf[vrf] = {};
      }
    }
  }

  // Label
  if (form.labelConfig?.vpn?.export || form.labelConfig?.vpn?.['allocation-mode']) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].label = { vpn: {} };
    if (isPresent(form.labelConfig.vpn.export)) result['address-family']['ipv4-unicast'].label.vpn.export = String(form.labelConfig.vpn.export);
    if (isPresent(form.labelConfig.vpn['allocation-mode'])) result['address-family']['ipv4-unicast'].label.vpn['allocation-mode'] = form.labelConfig.vpn['allocation-mode'];
  }

  // Nexthop
  if (form.nexthopConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].nexthop = { vpn: { export: form.nexthopConfig.vpn.export } };
  }

  // RD
  if (form.rdConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].rd = { vpn: { export: form.rdConfig.vpn.export } };
  }

  // Route-map
  if (form.routeMapConfig?.vpn?.export || form.routeMapConfig?.vpn?.import) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast']['route-map'] = { vpn: {} };
    if (isPresent(form.routeMapConfig.vpn.export)) result['address-family']['ipv4-unicast']['route-map'].vpn.export = form.routeMapConfig.vpn.export;
    if (isPresent(form.routeMapConfig.vpn.import)) result['address-family']['ipv4-unicast']['route-map'].vpn.import = form.routeMapConfig.vpn.import;
  }

  // Route-target
  if (form.routeTargetConfig?.vpn?.both || form.routeTargetConfig?.vpn?.export || form.routeTargetConfig?.vpn?.import) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast']['route-target'] = { vpn: {} };
    if (isPresent(form.routeTargetConfig.vpn.both)) result['address-family']['ipv4-unicast']['route-target'].vpn.both = form.routeTargetConfig.vpn.both;
    if (isPresent(form.routeTargetConfig.vpn.export)) result['address-family']['ipv4-unicast']['route-target'].vpn.export = form.routeTargetConfig.vpn.export;
    if (isPresent(form.routeTargetConfig.vpn.import)) result['address-family']['ipv4-unicast']['route-target'].vpn.import = form.routeTargetConfig.vpn.import;
  }

  // SID
  if (form.sidConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-unicast']) result['address-family']['ipv4-unicast'] = {};
    result['address-family']['ipv4-unicast'].sid = { vpn: { export: form.sidConfig.vpn.export } };
  }

  // IPv6 Networks
  if (form.ipv6Networks?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].network = {};
    for (const net of form.ipv6Networks) {
      if (net.network) {
        const attrs = {};
        if (isPresent(net['path-limit'])) attrs['path-limit'] = String(net['path-limit']);
        if (isPresent(net['route-map'])) attrs['route-map'] = net['route-map'];
        result['address-family']['ipv6-unicast'].network[net.network] = attrs;
      }
    }
  }

  // IPv6 Aggregate addresses
  if (form.ipv6Aggregates?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast']['aggregate-address'] = {};
    for (const agg of form.ipv6Aggregates) {
      if (agg.aggregate) {
        const attrs = {};
        if (agg['as-set']) attrs['as-set'] = {};
        if (agg['summary-only']) attrs['summary-only'] = {};
        if (isPresent(agg['route-map'])) attrs['route-map'] = agg['route-map'];
        result['address-family']['ipv6-unicast']['aggregate-address'][agg.aggregate] = attrs;
      }
    }
  }

  // IPv6 Redistribute
  if (form.ipv6Redistributes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].redistribute = {};
    for (const r of form.ipv6Redistributes) {
      if (!r.protocol) continue;
      const attrs = {};
      if (isPresent(r.metric)) attrs.metric = String(r.metric);
      if (isPresent(r['route-map'])) attrs['route-map'] = r['route-map'];
      result['address-family']['ipv6-unicast'].redistribute[r.protocol] = attrs;
    }
  }

  // IPv6 Distance
  if (form.ipv6Distance && (form.ipv6Distance.external || form.ipv6Distance.internal || form.ipv6Distance.local)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].distance = {};
    if (isPresent(form.ipv6Distance.external)) result['address-family']['ipv6-unicast'].distance.external = String(form.ipv6Distance.external);
    if (isPresent(form.ipv6Distance.internal)) result['address-family']['ipv6-unicast'].distance.internal = String(form.ipv6Distance.internal);
    if (isPresent(form.ipv6Distance.local)) result['address-family']['ipv6-unicast'].distance.local = String(form.ipv6Distance.local);
  }

  // IPv6 Distance prefix
  if (form.ipv6DistancePrefixes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].distance = result['address-family']['ipv6-unicast'].distance || {};
    result['address-family']['ipv6-unicast'].distance.prefix = {};
    for (const dp of form.ipv6DistancePrefixes) {
      if (dp.prefix && isPresent(dp.distance)) {
        result['address-family']['ipv6-unicast'].distance.prefix[dp.prefix] = { distance: String(dp.distance) };
      }
    }
  }

  // IPv6 Maximum paths
  if (form.ipv6MaxPaths && (form.ipv6MaxPaths.ebgp || form.ipv6MaxPaths.ibgp)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast']['maximum-paths'] = {};
    if (isPresent(form.ipv6MaxPaths.ebgp)) result['address-family']['ipv6-unicast']['maximum-paths'].ebgp = String(form.ipv6MaxPaths.ebgp);
    if (isPresent(form.ipv6MaxPaths.ibgp)) result['address-family']['ipv6-unicast']['maximum-paths'].ibgp = String(form.ipv6MaxPaths.ibgp);
  }

  // IPv6 Export
  if (form.ipv6ExportConfig?.vpn) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].export = { vpn: {} };
  }

  // IPv6 Import
  if (form.ipv6ImportConfig?.vpn || form.ipv6ImportConfig?.vrfs?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].import = {};
    if (form.ipv6ImportConfig.vpn) result['address-family']['ipv6-unicast'].import.vpn = {};
    if (form.ipv6ImportConfig.vrfs?.length) {
      result['address-family']['ipv6-unicast'].import.vrf = {};
      for (const vrf of form.ipv6ImportConfig.vrfs) {
        result['address-family']['ipv6-unicast'].import.vrf[vrf] = {};
      }
    }
  }

  // IPv6 Label
  if (form.ipv6LabelConfig?.vpn?.export || form.ipv6LabelConfig?.vpn?.['allocation-mode']) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].label = { vpn: {} };
    if (isPresent(form.ipv6LabelConfig.vpn.export)) result['address-family']['ipv6-unicast'].label.vpn.export = String(form.ipv6LabelConfig.vpn.export);
    if (isPresent(form.ipv6LabelConfig.vpn['allocation-mode'])) result['address-family']['ipv6-unicast'].label.vpn['allocation-mode'] = form.ipv6LabelConfig.vpn['allocation-mode'];
  }

  // IPv6 Nexthop
  if (form.ipv6NexthopConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].nexthop = { vpn: { export: form.ipv6NexthopConfig.vpn.export } };
  }

  // IPv6 RD
  if (form.ipv6RdConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].rd = { vpn: { export: form.ipv6RdConfig.vpn.export } };
  }

  // IPv6 Route-map
  if (form.ipv6RouteMapConfig?.vpn?.export || form.ipv6RouteMapConfig?.vpn?.import) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast']['route-map'] = { vpn: {} };
    if (isPresent(form.ipv6RouteMapConfig.vpn.export)) result['address-family']['ipv6-unicast']['route-map'].vpn.export = form.ipv6RouteMapConfig.vpn.export;
    if (isPresent(form.ipv6RouteMapConfig.vpn.import)) result['address-family']['ipv6-unicast']['route-map'].vpn.import = form.ipv6RouteMapConfig.vpn.import;
  }

  // IPv6 Route-target
  if (form.ipv6RouteTargetConfig?.vpn?.both || form.ipv6RouteTargetConfig?.vpn?.export || form.ipv6RouteTargetConfig?.vpn?.import) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast']['route-target'] = { vpn: {} };
    if (isPresent(form.ipv6RouteTargetConfig.vpn.both)) result['address-family']['ipv6-unicast']['route-target'].vpn.both = form.ipv6RouteTargetConfig.vpn.both;
    if (isPresent(form.ipv6RouteTargetConfig.vpn.export)) result['address-family']['ipv6-unicast']['route-target'].vpn.export = form.ipv6RouteTargetConfig.vpn.export;
    if (isPresent(form.ipv6RouteTargetConfig.vpn.import)) result['address-family']['ipv6-unicast']['route-target'].vpn.import = form.ipv6RouteTargetConfig.vpn.import;
  }

  // IPv6 SID
  if (form.ipv6SidConfig?.vpn?.export) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-unicast']) result['address-family']['ipv6-unicast'] = {};
    result['address-family']['ipv6-unicast'].sid = { vpn: { export: form.ipv6SidConfig.vpn.export } };
  }

  // IPv6 VPN RD
  if (isPresent(form.ipv6VpnRd)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-vpn']) result['address-family']['ipv6-vpn'] = {};
    result['address-family']['ipv6-vpn'].rd = form.ipv6VpnRd;
  }

  // Helper function to generate address family config
  function generateAddressFamilyConfig(familyName, networks, aggregates, redistributes, distance, maxPaths) {
    const hasNetworks = networks?.length > 0;
    const hasAggregates = aggregates?.length > 0;
    const hasRedistributes = redistributes?.length > 0;
    const hasDistance = distance && (distance.external || distance.internal || distance.local);
    const hasMaxPaths = maxPaths && (maxPaths.ebgp || maxPaths.ibgp);

    if (!hasNetworks && !hasAggregates && !hasRedistributes && !hasDistance && !hasMaxPaths) {
      return;
    }

    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family'][familyName]) result['address-family'][familyName] = {};

    if (hasNetworks) {
      result['address-family'][familyName].network = {};
      for (const net of networks) {
        if (net.network) {
          const attrs = {};
          if (net.backdoor) attrs.backdoor = {};
          if (isPresent(net['route-map'])) attrs['route-map'] = net['route-map'];
          result['address-family'][familyName].network[net.network] = attrs;
        }
      }
    }

    if (hasAggregates) {
      result['address-family'][familyName]['aggregate-address'] = {};
      for (const agg of aggregates) {
        if (agg.aggregate) {
          const attrs = {};
          if (agg['as-set']) attrs['as-set'] = {};
          if (agg['summary-only']) attrs['summary-only'] = {};
          if (isPresent(agg['route-map'])) attrs['route-map'] = agg['route-map'];
          result['address-family'][familyName]['aggregate-address'][agg.aggregate] = attrs;
        }
      }
    }

    if (hasRedistributes) {
      result['address-family'][familyName].redistribute = {};
      for (const r of redistributes) {
        if (!r.protocol) continue;
        const attrs = {};
        if (isPresent(r.metric)) attrs.metric = String(r.metric);
        if (isPresent(r['route-map'])) attrs['route-map'] = r['route-map'];
        result['address-family'][familyName].redistribute[r.protocol] = attrs;
      }
    }

    if (hasDistance) {
      result['address-family'][familyName].distance = {};
      if (isPresent(distance.external)) result['address-family'][familyName].distance.external = String(distance.external);
      if (isPresent(distance.internal)) result['address-family'][familyName].distance.internal = String(distance.internal);
      if (isPresent(distance.local)) result['address-family'][familyName].distance.local = String(distance.local);
    }

    if (hasMaxPaths) {
      result['address-family'][familyName]['maximum-paths'] = {};
      if (isPresent(maxPaths.ebgp)) result['address-family'][familyName]['maximum-paths'].ebgp = String(maxPaths.ebgp);
      if (isPresent(maxPaths.ibgp)) result['address-family'][familyName]['maximum-paths'].ibgp = String(maxPaths.ibgp);
    }
  }

  // Generate config for all 8 new address families
  generateAddressFamilyConfig('ipv4-labeled-unicast', form['address-family']?.['ipv4-labeled-unicast']?.networks, form['address-family']?.['ipv4-labeled-unicast']?.aggregates, [], null, form['address-family']?.['ipv4-labeled-unicast']?.maxPaths);
  generateAddressFamilyConfig('ipv4-multicast', form['address-family']?.['ipv4-multicast']?.networks, form['address-family']?.['ipv4-multicast']?.aggregates, [], form['address-family']?.['ipv4-multicast']?.distance, null);

  // IPv4 Multicast distance prefix
  if (form['address-family']?.['ipv4-multicast']?.distancePrefixes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-multicast']) result['address-family']['ipv4-multicast'] = {};
    result['address-family']['ipv4-multicast'].distance = result['address-family']['ipv4-multicast'].distance || {};
    result['address-family']['ipv4-multicast'].distance.prefix = {};
    for (const dp of form['address-family']['ipv4-multicast'].distancePrefixes) {
      if (dp.prefix && isPresent(dp.distance)) {
        result['address-family']['ipv4-multicast'].distance.prefix[dp.prefix] = { distance: String(dp.distance) };
      }
    }
  }

  // IPv4 VPN networks with label and rd
  if (form['address-family']?.['ipv4-vpn']?.networks?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-vpn']) result['address-family']['ipv4-vpn'] = {};
    result['address-family']['ipv4-vpn'].network = {};
    for (const net of form['address-family']['ipv4-vpn'].networks) {
      if (net.network) {
        const attrs = {};
        if (isPresent(net.label)) attrs.label = String(net.label);
        if (isPresent(net.rd)) attrs.rd = net.rd;
        result['address-family']['ipv4-vpn'].network[net.network] = attrs;
      }
    }
  }

  // IPv6 Flowspec local-install interface
  if (isPresent(form['address-family']?.['ipv6-flowspec']?.['local-install']?.interface)) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-flowspec']) result['address-family']['ipv6-flowspec'] = {};
    result['address-family']['ipv6-flowspec']['local-install'] = { interface: form['address-family']['ipv6-flowspec']['local-install'].interface };
  }

  generateAddressFamilyConfig('ipv6-labeled-unicast', form['address-family']?.['ipv6-labeled-unicast']?.networks, form['address-family']?.['ipv6-labeled-unicast']?.aggregates, [], null, null);
  generateAddressFamilyConfig('ipv6-multicast', form['address-family']?.['ipv6-multicast']?.networks, form['address-family']?.['ipv6-multicast']?.aggregates, [], null, null);

  // IPv6 Multicast distance prefix
  if (form['address-family']?.['ipv6-multicast']?.distancePrefixes?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-multicast']) result['address-family']['ipv6-multicast'] = {};
    result['address-family']['ipv6-multicast'].distance = result['address-family']['ipv6-multicast'].distance || {};
    result['address-family']['ipv6-multicast'].distance.prefix = {};
    for (const dp of form['address-family']['ipv6-multicast'].distancePrefixes) {
      if (dp.prefix && isPresent(dp.distance)) {
        result['address-family']['ipv6-multicast'].distance.prefix[dp.prefix] = { distance: String(dp.distance) };
      }
    }
  }
  // IPv6 VPN networks with label and rd
  if (form['address-family']?.['ipv6-vpn']?.networks?.length) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv6-vpn']) result['address-family']['ipv6-vpn'] = {};
    result['address-family']['ipv6-vpn'].network = {};
    for (const net of form['address-family']['ipv6-vpn'].networks) {
      if (net.network) {
        const attrs = {};
        if (isPresent(net.label)) attrs.label = String(net.label);
        if (isPresent(net.rd)) attrs.rd = net.rd;
        result['address-family']['ipv6-vpn'].network[net.network] = attrs;
      }
    }
  }

  // IPv4 Flowspec local-install interface
  if (form['address-family']?.['ipv4-flowspec']?.['local-install']?.interface) {
    if (!result['address-family']) result['address-family'] = {};
    if (!result['address-family']['ipv4-flowspec']) result['address-family']['ipv4-flowspec'] = {};
    result['address-family']['ipv4-flowspec']['local-install'] = {
      interface: form['address-family']['ipv4-flowspec']['local-install'].interface,
    };
  }

  // Interfaces
  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (iface['mpls-forwarding']) attrs.mpls = { forwarding: {} };
      result.interface[iface.name] = attrs;
    }
  }

  // L2VPN EVPN
  const evpn = form['address-family']?.['l2vpn-evpn'];
  if (evpn) {
    const evpnAttrs = {};
    if (evpn['advertise-all-vni']) evpnAttrs['advertise-all-vni'] = {};
    if (evpn['advertise-pip']) evpnAttrs['advertise-pip'] = {};
    if (evpn['advertise-svi-ip']) evpnAttrs['advertise-svi-ip'] = {};
    if (evpn['disable-ead-evi-rx']) evpnAttrs['disable-ead-evi-rx'] = {};
    if (evpn['disable-ead-evi-tx']) evpnAttrs['disable-ead-evi-tx'] = {};
    if (isPresent(evpn.rd)) evpnAttrs.rd = evpn.rd;
    if (evpn['rt-auto-derive']) evpnAttrs['rt-auto-derive'] = {};
    if (evpn.flooding) evpnAttrs.flooding = { disable: {} };
    if (evpn['mac-vrf'] && isPresent(evpn['mac-vrf'].soo)) {
      evpnAttrs['mac-vrf'] = { soo: evpn['mac-vrf'].soo };
    }

    // Route targets
    if (evpn['route-targets']?.length) {
      evpnAttrs['route-target'] = {};
      for (const rt of evpn['route-targets']) {
        if (!rt['route-target']) continue;
        const direction = rt.direction || 'both';
        if (!evpnAttrs['route-target'][direction]) {
          evpnAttrs['route-target'][direction] = {};
        }
        evpnAttrs['route-target'][direction][rt['route-target']] = {};
      }
    }

    // VNIs
    if (evpn.vnis?.length) {
      evpnAttrs.vni = {};
      for (const vni of evpn.vnis) {
        if (!vni.vni) continue;
        const vniAttrs = {};
        if (vni['route-targets']?.length) {
          vniAttrs['route-target'] = {};
          for (const rt of vni['route-targets']) {
            if (!rt['route-target']) continue;
            const direction = rt.direction || 'both';
            if (!vniAttrs['route-target'][direction]) {
              vniAttrs['route-target'][direction] = {};
            }
            vniAttrs['route-target'][direction][rt['route-target']] = {};
          }
        }
        evpnAttrs.vni[vni.vni] = vniAttrs;
      }
    }

    // EAD-ES route target
    if (evpn['ead-es-route-target'] && isPresent(evpn['ead-es-route-target'].export)) {
      evpnAttrs['ead-es-route-target'] = { export: evpn['ead-es-route-target'].export };
    }

    // EAD-ES frag evi-limit
    if (evpn['ead-es-frag'] && isPresent(evpn['ead-es-frag']['evi-limit'])) {
      evpnAttrs['ead-es-frag'] = { 'evi-limit': evpn['ead-es-frag']['evi-limit'] };
    }

    // Advertise ipv4/ipv6 unicast route-map
    if (evpn.advertise) {
      if (evpn.advertise['ipv4-unicast']?.enable) {
        if (!evpnAttrs.advertise) evpnAttrs.advertise = {};
        const advAttrs = {};
        if (isPresent(evpn.advertise['ipv4-unicast']['route-map'])) {
          advAttrs['route-map'] = evpn.advertise['ipv4-unicast']['route-map'];
        }
        evpnAttrs.advertise['ipv4-unicast'] = advAttrs;
      }
      if (evpn.advertise['ipv6-unicast']?.enable) {
        if (!evpnAttrs.advertise) evpnAttrs.advertise = {};
        const advAttrs = {};
        if (isPresent(evpn.advertise['ipv6-unicast']['route-map'])) {
          advAttrs['route-map'] = evpn.advertise['ipv6-unicast']['route-map'];
        }
        evpnAttrs.advertise['ipv6-unicast'] = advAttrs;
      }
    }

    // Default originate
    if (evpn['default-originate']) {
      if (evpn['default-originate'].ipv4 || evpn['default-originate'].ipv6) {
        evpnAttrs['default-originate'] = {};
        if (evpn['default-originate'].ipv4) evpnAttrs['default-originate'].ipv4 = {};
        if (evpn['default-originate'].ipv6) evpnAttrs['default-originate'].ipv6 = {};
      }
    }

    if (Object.keys(evpnAttrs).length) {
      if (!result['address-family']) result['address-family'] = {};
      result['address-family']['l2vpn-evpn'] = evpnAttrs;
    }
  }

  // Timers
  if (form.timers && (form.timers.connect || form.timers.holdtime || form.timers.keepalive)) {
    result.timers = {};
    if (isPresent(form.timers.connect)) result.timers.connect = String(form.timers.connect);
    if (isPresent(form.timers.holdtime)) result.timers.holdtime = String(form.timers.holdtime);
    if (isPresent(form.timers.keepalive)) result.timers.keepalive = String(form.timers.keepalive);
  }

  // Parameters
  const p = form.parameters;
  if (p) {
    const params = {};
    if (isPresent(p['cluster-id'])) params['cluster-id'] = p['cluster-id'];
    if (isPresent(p['router-id'])) params['router-id'] = p['router-id'];
    if (p['log-neighbor-changes']) params['log-neighbor-changes'] = {};
    if (p['always-compare-med']) params['always-compare-med'] = {};
    if (p['deterministic-med']) params['deterministic-med'] = {};
    if (p['ebgp-requires-policy']) params['ebgp-requires-policy'] = {};
    if (p['fast-convergence']) params['fast-convergence'] = {};
    if (p['graceful-shutdown']) params['graceful-shutdown'] = {};
    if (p['network-import-check']) params['network-import-check'] = {};
    if (p['disable-ebgp-connected-route-check']) params['disable-ebgp-connected-route-check'] = {};
    if (p['allow-martian-nexthop']) params['allow-martian-nexthop'] = {};

    // bestpath
    if (p.bestpath) {
      const bp = {};
      if (p.bestpath['as-path']) {
        const asp = {};
        if (p.bestpath['as-path']['multipath-relax']) asp['multipath-relax'] = {};
        if (p.bestpath['as-path']['ignore']) asp['ignore'] = {};
        if (Object.keys(asp).length) bp['as-path'] = asp;
      }
      if (p.bestpath['compare-routerid']) bp['compare-routerid'] = {};
      if (p.bestpath['skip-mp']) bp['skip-mp'] = {};
      if (p.bestpath.med) {
        const med = {};
        if (p.bestpath.med.confed) med.confed = {};
        if (p.bestpath.med['missing-as-worst']) med['missing-as-worst'] = {};
        if (Object.keys(med).length) bp.med = med;
      }
      if (Object.keys(bp).length) params.bestpath = bp;
    }

    // confederation
    if (p.confederation) {
      const conf = {};
      if (isPresent(p.confederation.identifier)) conf.identifier = p.confederation.identifier;
      if (p.confederation.peers?.length) conf.peers = p.confederation.peers;
      if (Object.keys(conf).length) params.confederation = conf;
    }

    // dampening
    if (p.dampening?.enable) {
      const damp = {};
      if (isPresent(p.dampening['half-life'])) damp['half-life'] = String(p.dampening['half-life']);
      if (isPresent(p.dampening.reuse)) damp.reuse = String(p.dampening.reuse);
      if (isPresent(p.dampening['start-suppress-time'])) damp['start-suppress-time'] = String(p.dampening['start-suppress-time']);
      if (isPresent(p.dampening['max-suppress-time'])) damp['max-suppress-time'] = String(p.dampening['max-suppress-time']);
      params.dampening = damp;
    }

    // graceful-restart
    if (p['graceful-restart']?.enable) {
      const gr = {};
      if (isPresent(p['graceful-restart'].restart)) gr.restart = String(p['graceful-restart'].restart);
      if (isPresent(p['graceful-restart'].stalepath)) gr.stalepath = String(p['graceful-restart'].stalepath);
      params['graceful-restart'] = gr;
    }

    if (Object.keys(params).length) result.parameters = params;
  }

  // SID
  if (form.sid?.vpn) {
    result.sid = { vpn: {} };
  }

  // SRv6
  if (isPresent(form.srv6?.locator)) {
    result.srv6 = { locator: form.srv6.locator };
  }

  return result;
}

export default defineComponent({
  name: 'BgpPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const activeAfTab = ref('ipv4-unicast');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    // Neighbor modal
    const neighborModalVisible = ref(false);
    const editingNeighborIndex = ref(-1);
    const neighborForm = ref({
      address: '', 'remote-as': '', description: '', 'peer-group': '', shutdown: false, passive: false,
      'ebgp-multihop': '', 'advertisement-interval': '', password: '', port: '', 'update-source': '',
      'local-as': '', 'local-role': '', timers: { connect: '', holdtime: '', keepalive: '' },
      'ttl-security': { hops: '' },
      'address-family': {},
      interface: {},
      'enforce-first-as': false, 'override-capability': false, 'disable-connected-check': false,
      'disable-capability-negotiation': false,
      bfd: { enable: false, 'check-control-plane-failure': false, profile: '' },
      capability: { dynamic: false, 'extended-nexthop': false, 'software-version': false },
      'graceful-restart': { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false },
      'path-attribute': { discard: '', 'treat-as-withdraw': '' },
    });

    // Peer-group modal
    const peerGroupModalVisible = ref(false);
    const editingPeerGroupIndex = ref(-1);
    const peerGroupForm = ref({
      name: '', 'remote-as': '', description: '', shutdown: false, 'ebgp-multihop': '',
      'advertisement-interval': '', password: '', port: '', 'local-as': '', 'local-role': '',
      timers: { connect: '', holdtime: '', keepalive: '' },
      'ttl-security': { hops: '' },
      'update-source': '',
      'address-family': {},
      'enforce-first-as': false, 'override-capability': false, 'disable-connected-check': false,
      'disable-capability-negotiation': false,
      bfd: { enable: false, 'check-control-plane-failure': false, profile: '' },
      capability: { dynamic: false, 'extended-nexthop': false, 'software-version': false },
      'graceful-restart': { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false },
      'path-attribute': { discard: '', 'treat-as-withdraw': '' },
    });

    // BMP target modal
    const bmpModalVisible = ref(false);
    const editingBmpIndex = ref(-1);
    const bmpForm = ref({
      name: '', address: '', port: '5000', 'max-retry': '2000', 'min-retry': '1000', mirror: false,
      monitor: { 'ipv4-unicast': { 'post-policy': false, 'pre-policy': false }, 'ipv6-unicast': { 'post-policy': false, 'pre-policy': false } }
    });

    // Listen range modal
    const listenModalVisible = ref(false);
    const editingListenIndex = ref(-1);
    const listenForm = ref({ range: '', 'peer-group': '' });

    // Network modal
    const networkModalVisible = ref(false);
    const editingNetworkIndex = ref(-1);
    const networkForm = ref({ network: '', backdoor: false, 'route-map': '' });

    // Aggregate modal
    const aggregateModalVisible = ref(false);
    const editingAggregateIndex = ref(-1);
    const aggregateForm = ref({ aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' });

    // Interface modal
    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({ name: '', 'mpls-forwarding': false });

    // IPv6 Network modal
    const ipv6NetworkModalVisible = ref(false);
    const editingIpv6NetworkIndex = ref(-1);
    const ipv6NetworkForm = ref({ network: '', 'path-limit': '', 'route-map': '' });

    // IPv6 Aggregate modal
    const ipv6AggregateModalVisible = ref(false);
    const editingIpv6AggregateIndex = ref(-1);
    const ipv6AggregateForm = ref({ aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' });

    // IPv6 Redistribute modal
    const ipv6RedistributeModalVisible = ref(false);
    const editingIpv6RedistributeIndex = ref(-1);
    const ipv6RedistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    // Helper function to create address family data structures
    function createAddressFamilyData(prefix, isIPv6 = false) {
      const data = {
        [`${prefix}NetworkModalVisible`]: ref(false),
        [`editing${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}NetworkIndex`]: ref(-1),
        [`${prefix}NetworkForm`]: ref({ network: '', backdoor: false, 'route-map': '' }),
        [`${prefix}AggregateModalVisible`]: ref(false),
        [`editing${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}AggregateIndex`]: ref(-1),
        [`${prefix}AggregateForm`]: ref({ aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' }),
        [`${prefix}RedistributeModalVisible`]: ref(false),
        [`editing${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}RedistributeIndex`]: ref(-1),
        [`${prefix}RedistributeForm`]: ref({ protocol: '', metric: '', 'route-map': '' }),
        [`${prefix}NetworkColumns`]: [
          { key: 'network', title: isIPv6 ? 'IPv6 网络' : '网络' },
          { key: 'backdoor', title: '后门' },
          { key: 'route-map', title: '路由映射' },
        ],
        [`${prefix}AggregateColumns`]: [
          { key: 'aggregate', title: isIPv6 ? 'IPv6 聚合网络' : '聚合网络' },
          { key: 'as-set', title: 'AS Set' },
          { key: 'summary-only', title: '仅汇总' },
          { key: 'route-map', title: '路由映射' },
        ],
        [`${prefix}RedistributeColumns`]: [
          { key: 'protocol', title: '协议' },
          { key: 'metric', title: '度量值' },
          { key: 'route-map', title: '路由映射' },
        ],
      };
      return data;
    }

    // Create data structures for all 8 new address families
    const ipv4FlowspecData = createAddressFamilyData('ipv4Flowspec', false);
    const ipv4LabeledUnicastData = createAddressFamilyData('ipv4LabeledUnicast', false);
    const ipv4MulticastData = createAddressFamilyData('ipv4Multicast', false);

    // IPv4 Multicast distance prefix modal
    const ipv4MulticastDistancePrefixModalVisible = ref(false);
    const editingIpv4MulticastDistancePrefixIndex = ref(-1);
    const ipv4MulticastDistancePrefixForm = ref({ prefix: '', distance: '' });
    const ipv4MulticastDistancePrefixColumns = [
      { key: 'prefix', title: '前缀' },
      { key: 'distance', title: '管理距离 (1-255)' },
    ];

    function createDistancePrefixIpv4Multicast() {
      editingIpv4MulticastDistancePrefixIndex.value = -1;
      ipv4MulticastDistancePrefixForm.value = { prefix: '', distance: '' };
      ipv4MulticastDistancePrefixModalVisible.value = true;
    }

    function editDistancePrefixIpv4Multicast(row) {
      const idx = config['address-family']['ipv4-multicast'].distancePrefixes.findIndex(d => d.prefix === row.prefix);
      editingIpv4MulticastDistancePrefixIndex.value = idx;
      ipv4MulticastDistancePrefixForm.value = { ...row };
      ipv4MulticastDistancePrefixModalVisible.value = true;
    }

    function deleteDistancePrefixesIpv4Multicast(rows) {
      const prefixes = new Set(rows.map(r => r.prefix));
      config['address-family']['ipv4-multicast'].distancePrefixes =
        config['address-family']['ipv4-multicast'].distancePrefixes.filter(d => !prefixes.has(d.prefix));
    }

    function saveDistancePrefixIpv4Multicast() {
      const form = ipv4MulticastDistancePrefixForm.value;
      if (!form.prefix) { alert('请填写前缀'); return; }
      if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(form.prefix)) { alert('前缀格式无效，应为 x.x.x.x/x'); return; }
      if (!form.distance || form.distance < 1 || form.distance > 255) { alert('管理距离应为 1-255'); return; }

      const idx = editingIpv4MulticastDistancePrefixIndex.value;
      if (idx >= 0) {
        config['address-family']['ipv4-multicast'].distancePrefixes[idx] = { ...form };
      } else {
        config['address-family']['ipv4-multicast'].distancePrefixes.push({ ...form });
      }
      ipv4MulticastDistancePrefixModalVisible.value = false;
    }

    // IPv6 Multicast distance prefix modal
    const ipv6MulticastDistancePrefixModalVisible = ref(false);
    const editingIpv6MulticastDistancePrefixIndex = ref(-1);
    const ipv6MulticastDistancePrefixForm = ref({ prefix: '', distance: '' });
    const ipv6MulticastDistancePrefixColumns = [
      { key: 'prefix', title: '前缀' },
      { key: 'distance', title: '管理距离 (1-255)' },
    ];

    function createDistancePrefixIpv6Multicast() {
      editingIpv6MulticastDistancePrefixIndex.value = -1;
      ipv6MulticastDistancePrefixForm.value = { prefix: '', distance: '' };
      ipv6MulticastDistancePrefixModalVisible.value = true;
    }

    function editDistancePrefixIpv6Multicast(row) {
      const idx = config['address-family']['ipv6-multicast'].distancePrefixes.findIndex(d => d.prefix === row.prefix);
      editingIpv6MulticastDistancePrefixIndex.value = idx;
      ipv6MulticastDistancePrefixForm.value = { ...row };
      ipv6MulticastDistancePrefixModalVisible.value = true;
    }

    function deleteDistancePrefixesIpv6Multicast(rows) {
      const prefixes = new Set(rows.map(r => r.prefix));
      config['address-family']['ipv6-multicast'].distancePrefixes =
        config['address-family']['ipv6-multicast'].distancePrefixes.filter(d => !prefixes.has(d.prefix));
    }

    function saveDistancePrefixIpv6Multicast() {
      const form = ipv6MulticastDistancePrefixForm.value;
      if (!form.prefix) { alert('请填写前缀'); return; }
      if (!/^[0-9a-fA-F:]+\/\d+$/.test(form.prefix)) { alert('前缀格式无效，应为 IPv6 前缀'); return; }
      if (!form.distance || form.distance < 1 || form.distance > 255) { alert('管理距离应为 1-255'); return; }

      const idx = editingIpv6MulticastDistancePrefixIndex.value;
      if (idx >= 0) {
        config['address-family']['ipv6-multicast'].distancePrefixes[idx] = { ...form };
      } else {
        config['address-family']['ipv6-multicast'].distancePrefixes.push({ ...form });
      }
      ipv6MulticastDistancePrefixModalVisible.value = false;
    }

    const ipv4VpnData = createAddressFamilyData('ipv4Vpn', false);
    // Override ipv4-vpn network columns and form for label and rd
    ipv4VpnData.ipv4VpnNetworkColumns = [
      { key: 'network', title: '网络' },
      { key: 'label', title: 'MPLS 标签 (0-1048575)' },
      { key: 'rd', title: '路由区分器 (ASN:NN 或 IP:NN)' },
    ];
    ipv4VpnData.ipv4VpnNetworkForm = ref({ network: '', label: '', rd: '' });

    // Custom ipv4-vpn network operations (data stored in address-family)
    function createNetworkIpv4Vpn() {
      editingIpv4VpnNetworkIndex.value = -1;
      ipv4VpnNetworkForm.value = { network: '', label: '', rd: '' };
      ipv4VpnNetworkModalVisible.value = true;
    }

    function editNetworkIpv4Vpn(row) {
      const idx = config['address-family']['ipv4-vpn'].networks.findIndex(n => n.network === row.network);
      editingIpv4VpnNetworkIndex.value = idx;
      ipv4VpnNetworkForm.value = { ...row };
      ipv4VpnNetworkModalVisible.value = true;
    }

    function deleteNetworksIpv4Vpn(rows) {
      if (!rows.length) return;
      if (!confirm('确认删除选中的网络？')) return;
      const toDelete = new Set(rows.map(r => r.network));
      config['address-family']['ipv4-vpn'].networks =
        config['address-family']['ipv4-vpn'].networks.filter(n => !toDelete.has(n.network));
    }

    function saveNetworkIpv4Vpn() {
      const form = ipv4VpnNetworkForm.value;
      const network = String(form.network || '').trim();
      if (!network) return alert('请输入网络地址');
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(network)) {
        return alert('网络格式错误，应为 x.x.x.x/x');
      }
      if (form.label !== '' && form.label !== undefined) {
        const label = parseInt(form.label);
        if (isNaN(label) || label < 0 || label > 1048575) {
          return alert('MPLS 标签值应为 0-1048575');
        }
      }

      const duplicate = config['address-family']['ipv4-vpn'].networks.find(
        (n, i) => n.network === network && i !== editingIpv4VpnNetworkIndex.value
      );
      if (duplicate) return alert('该网络已存在');

      const newNet = { network, label: form.label || '', rd: form.rd || '' };
      if (editingIpv4VpnNetworkIndex.value >= 0) {
        config['address-family']['ipv4-vpn'].networks.splice(editingIpv4VpnNetworkIndex.value, 1, newNet);
      } else {
        config['address-family']['ipv4-vpn'].networks.push(newNet);
      }
      ipv4VpnNetworkModalVisible.value = false;
    }

    const ipv6FlowspecData = createAddressFamilyData('ipv6Flowspec', true);
    const ipv6LabeledUnicastData = createAddressFamilyData('ipv6LabeledUnicast', true);
    const ipv6MulticastData = createAddressFamilyData('ipv6Multicast', true);
    const ipv6VpnData = createAddressFamilyData('ipv6Vpn', true);
    // Override ipv6-vpn network columns and form for label and rd
    ipv6VpnData.ipv6VpnNetworkColumns = [
      { key: 'network', title: '网络' },
      { key: 'label', title: 'MPLS 标签 (0-1048575)' },
      { key: 'rd', title: '路由区分器 (ASN:NN 或 IP:NN)' },
    ];
    ipv6VpnData.ipv6VpnNetworkForm = ref({ network: '', label: '', rd: '' });

    // Custom ipv6-vpn network operations (data stored in address-family)
    function createNetworkIpv6Vpn() {
      editingIpv6VpnNetworkIndex.value = -1;
      ipv6VpnNetworkForm.value = { network: '', label: '', rd: '' };
      ipv6VpnNetworkModalVisible.value = true;
    }

    function editNetworkIpv6Vpn(row) {
      const idx = config['address-family']['ipv6-vpn'].networks.findIndex(n => n.network === row.network);
      editingIpv6VpnNetworkIndex.value = idx;
      ipv6VpnNetworkForm.value = { ...row };
      ipv6VpnNetworkModalVisible.value = true;
    }

    function deleteNetworksIpv6Vpn(rows) {
      if (!rows.length) return;
      if (!confirm('确认删除选中的网络？')) return;
      const toDelete = new Set(rows.map(r => r.network));
      config['address-family']['ipv6-vpn'].networks =
        config['address-family']['ipv6-vpn'].networks.filter(n => !toDelete.has(n.network));
    }

    function saveNetworkIpv6Vpn() {
      const form = ipv6VpnNetworkForm.value;
      const network = String(form.network || '').trim();
      if (!network) return alert('请输入网络地址');
      if (!/^[0-9a-fA-F:]+\/\d+$/.test(network)) {
        return alert('IPv6 网络格式错误，应为 h:h:h:h:h:h:h:h/x');
      }
      if (form.label !== '' && form.label !== undefined) {
        const label = parseInt(form.label);
        if (isNaN(label) || label < 0 || label > 1048575) {
          return alert('MPLS 标签值应为 0-1048575');
        }
      }

      const duplicate = config['address-family']['ipv6-vpn'].networks.find(
        (n, i) => n.network === network && i !== editingIpv6VpnNetworkIndex.value
      );
      if (duplicate) return alert('该网络已存在');

      const newNet = { network, label: form.label || '', rd: form.rd || '' };
      if (editingIpv6VpnNetworkIndex.value >= 0) {
        config['address-family']['ipv6-vpn'].networks.splice(editingIpv6VpnNetworkIndex.value, 1, newNet);
      } else {
        config['address-family']['ipv6-vpn'].networks.push(newNet);
      }
      ipv6VpnNetworkModalVisible.value = false;
    }

    // Destructure all address family data for top-level access
    const {
      ipv4FlowspecNetworkModalVisible, editingIpv4FlowspecNetworkIndex, ipv4FlowspecNetworkForm,
      ipv4FlowspecAggregateModalVisible, editingIpv4FlowspecAggregateIndex, ipv4FlowspecAggregateForm,
      ipv4FlowspecRedistributeModalVisible, editingIpv4FlowspecRedistributeIndex, ipv4FlowspecRedistributeForm,
      ipv4FlowspecNetworkColumns, ipv4FlowspecAggregateColumns, ipv4FlowspecRedistributeColumns,
    } = ipv4FlowspecData;
    const {
      ipv4LabeledUnicastNetworkModalVisible, editingIpv4LabeledUnicastNetworkIndex, ipv4LabeledUnicastNetworkForm,
      ipv4LabeledUnicastAggregateModalVisible, editingIpv4LabeledUnicastAggregateIndex, ipv4LabeledUnicastAggregateForm,
      ipv4LabeledUnicastRedistributeModalVisible, editingIpv4LabeledUnicastRedistributeIndex, ipv4LabeledUnicastRedistributeForm,
      ipv4LabeledUnicastNetworkColumns, ipv4LabeledUnicastAggregateColumns, ipv4LabeledUnicastRedistributeColumns,
    } = ipv4LabeledUnicastData;
    const {
      ipv4MulticastNetworkModalVisible, editingIpv4MulticastNetworkIndex, ipv4MulticastNetworkForm,
      ipv4MulticastAggregateModalVisible, editingIpv4MulticastAggregateIndex, ipv4MulticastAggregateForm,
      ipv4MulticastRedistributeModalVisible, editingIpv4MulticastRedistributeIndex, ipv4MulticastRedistributeForm,
      ipv4MulticastNetworkColumns, ipv4MulticastAggregateColumns, ipv4MulticastRedistributeColumns,
    } = ipv4MulticastData;
    const {
      ipv4VpnNetworkModalVisible, editingIpv4VpnNetworkIndex, ipv4VpnNetworkForm,
      ipv4VpnAggregateModalVisible, editingIpv4VpnAggregateIndex, ipv4VpnAggregateForm,
      ipv4VpnRedistributeModalVisible, editingIpv4VpnRedistributeIndex, ipv4VpnRedistributeForm,
      ipv4VpnNetworkColumns, ipv4VpnAggregateColumns, ipv4VpnRedistributeColumns,
    } = ipv4VpnData;
    const {
      ipv6FlowspecNetworkModalVisible, editingIpv6FlowspecNetworkIndex, ipv6FlowspecNetworkForm,
      ipv6FlowspecAggregateModalVisible, editingIpv6FlowspecAggregateIndex, ipv6FlowspecAggregateForm,
      ipv6FlowspecRedistributeModalVisible, editingIpv6FlowspecRedistributeIndex, ipv6FlowspecRedistributeForm,
      ipv6FlowspecNetworkColumns, ipv6FlowspecAggregateColumns, ipv6FlowspecRedistributeColumns,
    } = ipv6FlowspecData;
    const {
      ipv6LabeledUnicastNetworkModalVisible, editingIpv6LabeledUnicastNetworkIndex, ipv6LabeledUnicastNetworkForm,
      ipv6LabeledUnicastAggregateModalVisible, editingIpv6LabeledUnicastAggregateIndex, ipv6LabeledUnicastAggregateForm,
      ipv6LabeledUnicastRedistributeModalVisible, editingIpv6LabeledUnicastRedistributeIndex, ipv6LabeledUnicastRedistributeForm,
      ipv6LabeledUnicastNetworkColumns, ipv6LabeledUnicastAggregateColumns, ipv6LabeledUnicastRedistributeColumns,
    } = ipv6LabeledUnicastData;
    const {
      ipv6MulticastNetworkModalVisible, editingIpv6MulticastNetworkIndex, ipv6MulticastNetworkForm,
      ipv6MulticastAggregateModalVisible, editingIpv6MulticastAggregateIndex, ipv6MulticastAggregateForm,
      ipv6MulticastRedistributeModalVisible, editingIpv6MulticastRedistributeIndex, ipv6MulticastRedistributeForm,
      ipv6MulticastNetworkColumns, ipv6MulticastAggregateColumns, ipv6MulticastRedistributeColumns,
    } = ipv6MulticastData;
    const {
      ipv6VpnNetworkModalVisible, editingIpv6VpnNetworkIndex, ipv6VpnNetworkForm,
      ipv6VpnAggregateModalVisible, editingIpv6VpnAggregateIndex, ipv6VpnAggregateForm,
      ipv6VpnRedistributeModalVisible, editingIpv6VpnRedistributeIndex, ipv6VpnRedistributeForm,
      ipv6VpnNetworkColumns, ipv6VpnAggregateColumns, ipv6VpnRedistributeColumns,
    } = ipv6VpnData;

    // EVPN Route Target modal
    const evpnRtModalVisible = ref(false);
    const editingEvpnRtIndex = ref(-1);
    const evpnRtForm = ref({ direction: 'both', 'route-target': '' });

    // EVPN VNI modal
    const evpnVniModalVisible = ref(false);
    const editingEvpnVniIndex = ref(-1);
    const evpnVniForm = ref({ vni: '', 'route-targets': [] });

    // EVPN VNI Route Target modal
    const evpnVniRtModalVisible = ref(false);
    const editingEvpnVniRtIndex = ref(-1);
    const evpnVniRtForm = ref({ direction: 'both', 'route-target': '' });
    const currentVniIndex = ref(-1);

    const neighborColumns = [
      { key: 'address', title: '邻居地址' },
      { key: 'remote-as', title: '远程 ASN' },
      { key: 'description', title: '描述' },
      { key: 'peer-group', title: 'Peer Group' },
      { key: 'state', title: '状态' },
    ];

    const peerGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'remote-as', title: '远程 ASN' },
      { key: 'description', title: '描述' },
    ];

    const bmpColumns = [
      { key: 'name', title: '名称' },
      { key: 'address', title: '地址' },
      { key: 'port', title: '端口' },
    ];

    const listenColumns = [
      { key: 'range', title: '范围' },
      { key: 'peer-group', title: 'Peer Group' },
    ];

    const networkColumns = [
      { key: 'network', title: '网络' },
      { key: 'backdoor', title: '后门' },
      { key: 'route-map', title: '路由映射' },
    ];

    const aggregateColumns = [
      { key: 'aggregate', title: '聚合网络' },
      { key: 'as-set', title: 'AS Set' },
      { key: 'summary-only', title: '仅汇总' },
      { key: 'route-map', title: '路由映射' },
    ];

    const interfaceColumns = [
      { key: 'name', title: '接口' },
      { key: 'mpls-forwarding', title: 'MPLS 转发' },
    ];

    const ipv6NetworkColumns = [
      { key: 'network', title: 'IPv6 网络' },
      { key: 'path-limit', title: '路径限制 (0-255)' },
      { key: 'route-map', title: '路由映射' },
    ];

    const ipv6AggregateColumns = [
      { key: 'aggregate', title: 'IPv6 聚合网络' },
      { key: 'as-set', title: 'AS Set' },
      { key: 'summary-only', title: '仅汇总' },
      { key: 'route-map', title: '路由映射' },
    ];

    const ipv6RedistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'route-map', title: '路由映射' },
    ];

    const ipv6DistancePrefixColumns = [
      { key: 'prefix', title: '前缀' },
      { key: 'distance', title: '管理距离 (1-255)' },
    ];

    const evpnRtColumns = [
      { key: 'direction', title: '方向' },
      { key: 'route-target', title: 'Route Target' },
    ];

    const evpnVniColumns = [
      { key: 'vni', title: 'VNI' },
      { key: 'route-targets', title: 'Route Targets' },
    ];

    const EVPN_RT_DIRECTIONS = [
      { value: 'both', label: 'Both (双向)' },
      { value: 'export', label: 'Export (导出)' },
      { value: 'import', label: 'Import (导入)' },
    ];

    const LOCAL_ROLE_OPTIONS = [
      { value: '', label: '-- 无 --' },
      { value: 'customer', label: 'Customer (Transit)' },
      { value: 'peer', label: 'Peer (Peering)' },
      { value: 'provider', label: 'Provider (Transit)' },
      { value: 'rs-client', label: 'RS Client' },
      { value: 'rs-server', label: 'Route Server' },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'neighbors') return 'protocols bgp neighbor';
      if (activeTab.value === 'peer-groups') return 'protocols bgp peer-group';
      if (activeTab.value === 'bmp') return 'protocols bgp bmp target';
      if (activeTab.value === 'listen') return 'protocols bgp listen range';
      if (activeTab.value === 'interfaces') return 'protocols bgp interface';
      if (activeTab.value === 'address-family') {
        return `protocols bgp address-family ${activeAfTab.value}`;
      }
      if (activeTab.value === 'sid') return 'protocols bgp sid';
      if (activeTab.value === 'srv6') return 'protocols bgp srv6';
      return 'protocols bgp';
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('protocols bgp', true);
        config.value = configToForm(res.data || {});
      } catch (e) {
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
      // Validate system-as
      if (config.value['system-as']) {
        const err = validateASN(config.value['system-as']);
        if (err) return alert(`系统 ASN：${err}`);
      }

      // Validate global timers
      if (config.value.timers) {
        if (config.value.timers.holdtime) {
          const err = validateTimer(config.value.timers.holdtime, true);
          if (err) return alert(`全局保持定时器：${err}`);
        }
        if (config.value.timers.keepalive) {
          const err = validateTimer(config.value.timers.keepalive, false);
          if (err) return alert(`全局 Keepalive 定时器：${err}`);
        }
      }

      // Validate max paths
      if (config.value.maxPaths) {
        if (config.value.maxPaths.ebgp) {
          const err = validateMaxPaths(config.value.maxPaths.ebgp);
          if (err) return alert(`eBGP 最大路径数：${err}`);
        }
        if (config.value.maxPaths.ibgp) {
          const err = validateMaxPaths(config.value.maxPaths.ibgp);
          if (err) return alert(`iBGP 最大路径数：${err}`);
        }
      }

      // Validate distance
      if (config.value.distance) {
        if (config.value.distance.external) {
          const err = validateDistance(config.value.distance.external);
          if (err) return alert(`eBGP 管理距离：${err}`);
        }
        if (config.value.distance.internal) {
          const err = validateDistance(config.value.distance.internal);
          if (err) return alert(`iBGP 管理距离：${err}`);
        }
        if (config.value.distance.local) {
          const err = validateDistance(config.value.distance.local);
          if (err) return alert(`本地路由管理距离：${err}`);
        }
      }

      // Validate neighbors
      for (const n of config.value.neighbors || []) {
        if (!n.address) continue;
        const ipErr = validateIP(n.address);
        if (ipErr) return alert(`邻居 ${n.address}：${ipErr}`);
        if (n['remote-as']) {
          const asnErr = validateASN(n['remote-as']);
          if (asnErr) return alert(`邻居 ${n.address} 远程 ASN：${asnErr}`);
        }
        const ebgpErr = validateEbgpMultihop(n['ebgp-multihop']);
        if (ebgpErr) return alert(`邻居 ${n.address} EBGP 多跳：${ebgpErr}`);
        const advErr = validateAdvertInterval(n['advertisement-interval']);
        if (advErr) return alert(`邻居 ${n.address} 广告间隔：${advErr}`);
        const portErr = validatePort(n.port);
        if (portErr) return alert(`邻居 ${n.address} 端口：${portErr}`);
        const localAsErr = validateASN(n['local-as']);
        if (localAsErr) return alert(`邻居 ${n.address} 本地 ASN：${localAsErr}`);
        if (n.timers) {
          const connErr = validateTimer(n.timers.connect, true);
          if (connErr) return alert(`邻居 ${n.address} 连接定时器：${connErr}`);
          const holdErr = validateTimer(n.timers.holdtime, true);
          if (holdErr) return alert(`邻居 ${n.address} 保持定时器：${holdErr}`);
          const kaErr = validateTimer(n.timers.keepalive, false);
          if (kaErr) return alert(`邻居 ${n.address} Keepalive 定时器：${kaErr}`);
        }
        const ttlErr = validateTtlHops(n['ttl-security']?.hops);
        if (ttlErr) return alert(`邻居 ${n.address} TTL 安全跳数：${ttlErr}`);
      }

      // Validate peer groups
      for (const pg of config.value.peerGroups || []) {
        if (!pg.name) continue;
        const asnErr = validateASN(pg['remote-as']);
        if (asnErr) return alert(`Peer Group ${pg.name} 远程 ASN：${asnErr}`);
        const ebgpErr = validateEbgpMultihop(pg['ebgp-multihop']);
        if (ebgpErr) return alert(`Peer Group ${pg.name} EBGP 多跳：${ebgpErr}`);
        const advErr = validateAdvertInterval(pg['advertisement-interval']);
        if (advErr) return alert(`Peer Group ${pg.name} 广告间隔：${advErr}`);
        const localAsErr = validateASN(pg['local-as']);
        if (localAsErr) return alert(`Peer Group ${pg.name} 本地 ASN：${localAsErr}`);
      }

      // Validate BMP targets
      for (const t of config.value.bmpTargets || []) {
        if (!t.name) continue;
        if (t.address) {
          const ipErr = validateIP(t.address);
          if (ipErr) return alert(`BMP ${t.name} 地址：${ipErr}`);
        }
        const portErr = validatePort(t.port);
        if (portErr) return alert(`BMP ${t.name} 端口：${portErr}`);
        const maxErr = validateBmpMaxRetry(t['max-retry']);
        if (maxErr) return alert(`BMP ${t.name} 最大重试：${maxErr}`);
        const minErr = validateBmpMinRetry(t['min-retry']);
        if (minErr) return alert(`BMP ${t.name} 最小重试：${minErr}`);
      }

      // Validate listen ranges
      for (const lr of config.value.listenRanges || []) {
        if (!lr.range) continue;
        const ipErr = validateIP(lr.range.split('/')[0]);
        if (ipErr) return alert(`监听范围 ${lr.range}：${ipErr}`);
      }

      // Validate networks
      for (const net of config.value.networks || []) {
        if (!net.network) continue;
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(net.network)) {
          return alert(`网络 ${net.network}：格式错误，应为 x.x.x.x/x`);
        }
      }

      // Validate parameters
      const p = config.value.parameters;
      if (p) {
        // Validate confederation identifier
        if (p.confederation?.identifier) {
          const confErr = validateConfedId(p.confederation.identifier);
          if (confErr) return alert(`Confederation Identifier：${confErr}`);
        }

        // Validate dampening
        if (p.dampening?.enable) {
          const halfLifeErr = validateDampeningHalfLife(p.dampening['half-life']);
          if (halfLifeErr) return alert(`Dampening Half-Life：${halfLifeErr}`);
          const reuseErr = validateDampeningValue(p.dampening.reuse);
          if (reuseErr) return alert(`Dampening Reuse：${reuseErr}`);
          const startSuppressErr = validateDampeningValue(p.dampening['start-suppress-time']);
          if (startSuppressErr) return alert(`Dampening Start Suppress：${startSuppressErr}`);
          const maxSuppressErr = validateDampeningValue(p.dampening['max-suppress-time']);
          if (maxSuppressErr) return alert(`Dampening Max Suppress：${maxSuppressErr}`);
        }

        // Validate graceful-restart
        if (p['graceful-restart']?.enable) {
          const restartErr = validateGracefulRestart(p['graceful-restart'].restart);
          if (restartErr) return alert(`优雅重启时间：${restartErr}`);
          const stalepathErr = validateGracefulRestart(p['graceful-restart'].stalepath);
          if (stalepathErr) return alert(`陈旧路径时间：${stalepathErr}`);
        }
      }

      saving.value = true;
      try {
        await configApi.set('protocols bgp', configToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    // Neighbor operations
    function createNeighbor() {
      editingNeighborIndex.value = -1;
      neighborForm.value = {
        address: '', 'remote-as': '', description: '', 'peer-group': '', shutdown: false, passive: false,
        'ebgp-multihop': '', 'advertisement-interval': '', password: '', port: '', 'update-source': '',
        'local-as': '', 'local-role': '', timers: { connect: '', holdtime: '', keepalive: '' },
        'ttl-security': { hops: '' },
        'address-family': {},
        interface: {},
        'enforce-first-as': false, 'override-capability': false, 'disable-connected-check': false,
        'disable-capability-negotiation': false,
        bfd: { enable: false, 'check-control-plane-failure': false, profile: '' },
        capability: { dynamic: false, 'extended-nexthop': false, 'software-version': false },
        'graceful-restart': { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false },
        'path-attribute': { discard: '', 'treat-as-withdraw': '' },
      };
      neighborModalVisible.value = true;
    }

    function editNeighbor(row) {
      editingNeighborIndex.value = config.value.neighbors.findIndex(n => n.address === row.address);
      neighborForm.value = {
        ...row,
        timers: { ...row.timers },
        'ttl-security': { ...row['ttl-security'] },
        'address-family': { ...(row['address-family'] || {}) },
        interface: { ...(row.interface || {}) },
        bfd: { ...(row.bfd || { enable: false, 'check-control-plane-failure': false, profile: '' }) },
        capability: { ...(row.capability || { dynamic: false, 'extended-nexthop': false, 'software-version': false }) },
        'graceful-restart': { ...(row['graceful-restart'] || { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false }) },
        'path-attribute': { ...(row['path-attribute'] || { discard: '', 'treat-as-withdraw': '' }) },
      };
      neighborModalVisible.value = true;
    }

    function deleteNeighbors(selectedAddresses) {
      if (!selectedAddresses.length) return;
      if (!confirm('确认删除选中的 BGP 邻居？')) return;
      const toDelete = new Set(selectedAddresses);
      config.value.neighbors = config.value.neighbors.filter(n => !toDelete.has(n.address));
    }

    function saveNeighbor() {
      const addr = String(neighborForm.value.address || '').trim();
      if (!addr) return alert('请输入邻居地址');

      const ipErr = validateIP(addr);
      if (ipErr) return alert(ipErr);

      if (neighborForm.value['remote-as']) {
        const asnErr = validateASN(neighborForm.value['remote-as']);
        if (asnErr) return alert(asnErr);
      }

      const duplicate = config.value.neighbors.find((n, i) => n.address === addr && i !== editingNeighborIndex.value);
      if (duplicate) return alert('该邻居地址已存在');

      const newNeighbor = { ...neighborForm.value, address: addr };

      if (editingNeighborIndex.value >= 0) {
        config.value.neighbors.splice(editingNeighborIndex.value, 1, newNeighbor);
      } else {
        config.value.neighbors.push(newNeighbor);
      }
      neighborModalVisible.value = false;
    }

    // Peer-group operations
    function createPeerGroup() {
      editingPeerGroupIndex.value = -1;
      peerGroupForm.value = {
        name: '', 'remote-as': '', description: '', shutdown: false, 'ebgp-multihop': '',
        'advertisement-interval': '', password: '', port: '', 'local-as': '', 'local-role': '',
        timers: { connect: '', holdtime: '', keepalive: '' },
        'ttl-security': { hops: '' },
        'update-source': '',
        'address-family': {},
        'enforce-first-as': false, 'override-capability': false, 'disable-connected-check': false,
        'disable-capability-negotiation': false,
        bfd: { enable: false, 'check-control-plane-failure': false, profile: '' },
        capability: { dynamic: false, 'extended-nexthop': false, 'software-version': false },
        'graceful-restart': { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false },
        'path-attribute': { discard: '', 'treat-as-withdraw': '' },
      };
      peerGroupModalVisible.value = true;
    }

    function editPeerGroup(row) {
      editingPeerGroupIndex.value = config.value.peerGroups.findIndex(pg => pg.name === row.name);
      peerGroupForm.value = {
        ...row,
        timers: { ...row.timers },
        'ttl-security': { ...row['ttl-security'] },
        'address-family': { ...(row['address-family'] || {}) },
        bfd: { ...(row.bfd || { enable: false, 'check-control-plane-failure': false, profile: '' }) },
        capability: { ...(row.capability || { dynamic: false, 'extended-nexthop': false, 'software-version': false }) },
        'graceful-restart': { ...(row['graceful-restart'] || { enable: false, 'restart-time': '', 'stalepath-time': '', 'preserve-fw-state': false }) },
        'path-attribute': { ...(row['path-attribute'] || { discard: '', 'treat-as-withdraw': '' }) },
      };
      peerGroupModalVisible.value = true;
    }

    function deletePeerGroups(selectedNames) {
      if (!selectedNames.length) return;
      if (!confirm('确认删除选中的 Peer Group？')) return;
      const toDelete = new Set(selectedNames);
      config.value.peerGroups = config.value.peerGroups.filter(pg => !toDelete.has(pg.name));
    }

    function savePeerGroup() {
      const name = String(peerGroupForm.value.name || '').trim();
      if (!name) return alert('请输入 Peer Group 名称');

      if (peerGroupForm.value['remote-as']) {
        const asnErr = validateASN(peerGroupForm.value['remote-as']);
        if (asnErr) return alert(asnErr);
      }

      const duplicate = config.value.peerGroups.find((pg, i) => pg.name === name && i !== editingPeerGroupIndex.value);
      if (duplicate) return alert('该 Peer Group 名称已存在');

      const newPg = { ...peerGroupForm.value, name };

      if (editingPeerGroupIndex.value >= 0) {
        config.value.peerGroups.splice(editingPeerGroupIndex.value, 1, newPg);
      } else {
        config.value.peerGroups.push(newPg);
      }
      peerGroupModalVisible.value = false;
    }

    // BMP operations
    function createBmp() {
      editingBmpIndex.value = -1;
      bmpForm.value = { name: '', address: '', port: '5000', 'max-retry': '2000', 'min-retry': '1000', mirror: false,
        monitor: { 'ipv4-unicast': { 'post-policy': false, 'pre-policy': false }, 'ipv6-unicast': { 'post-policy': false, 'pre-policy': false } } };
      bmpModalVisible.value = true;
    }

    function editBmp(row) {
      editingBmpIndex.value = config.value.bmpTargets.findIndex(t => t.name === row.name);
      bmpForm.value = { ...row };
      bmpModalVisible.value = true;
    }

    function deleteBmpTargets(selectedNames) {
      if (!selectedNames.length) return;
      if (!confirm('确认删除选中的 BMP 目标？')) return;
      const toDelete = new Set(selectedNames);
      config.value.bmpTargets = config.value.bmpTargets.filter(t => !toDelete.has(t.name));
    }

    function saveBmp() {
      const name = String(bmpForm.value.name || '').trim();
      if (!name) return alert('请输入 BMP 目标名称');

      if (bmpForm.value.address) {
        const ipErr = validateIP(bmpForm.value.address);
        if (ipErr) return alert(ipErr);
      }

      const duplicate = config.value.bmpTargets.find((t, i) => t.name === name && i !== editingBmpIndex.value);
      if (duplicate) return alert('该 BMP 目标名称已存在');

      const newTarget = { ...bmpForm.value, name };

      if (editingBmpIndex.value >= 0) {
        config.value.bmpTargets.splice(editingBmpIndex.value, 1, newTarget);
      } else {
        config.value.bmpTargets.push(newTarget);
      }
      bmpModalVisible.value = false;
    }

    // Listen range operations
    function createListen() {
      editingListenIndex.value = -1;
      listenForm.value = { range: '', 'peer-group': '' };
      listenModalVisible.value = true;
    }

    function editListen(row) {
      editingListenIndex.value = config.value.listenRanges.findIndex(lr => lr.range === row.range);
      listenForm.value = { ...row };
      listenModalVisible.value = true;
    }

    function deleteListenRanges(selectedRanges) {
      if (!selectedRanges.length) return;
      if (!confirm('确认删除选中的监听范围？')) return;
      const toDelete = new Set(selectedRanges);
      config.value.listenRanges = config.value.listenRanges.filter(lr => !toDelete.has(lr.range));
    }

    function saveListen() {
      const range = String(listenForm.value.range || '').trim();
      if (!range) return alert('请输入监听范围');

      const ipErr = validateIP(range.split('/')[0]);
      if (ipErr) return alert(ipErr);

      const duplicate = config.value.listenRanges.find((lr, i) => lr.range === range && i !== editingListenIndex.value);
      if (duplicate) return alert('该监听范围已存在');

      const newLr = { ...listenForm.value, range };

      if (editingListenIndex.value >= 0) {
        config.value.listenRanges.splice(editingListenIndex.value, 1, newLr);
      } else {
        config.value.listenRanges.push(newLr);
      }
      listenModalVisible.value = false;
    }

    // Network operations
    function createNetwork() {
      editingNetworkIndex.value = -1;
      networkForm.value = { network: '', backdoor: false, 'route-map': '' };
      networkModalVisible.value = true;
    }

    function editNetwork(row) {
      editingNetworkIndex.value = config.value.networks.findIndex(n => n.network === row.network);
      networkForm.value = { ...row };
      networkModalVisible.value = true;
    }

    function deleteNetworks(selectedNetworks) {
      if (!selectedNetworks.length) return;
      if (!confirm('确认删除选中的网络？')) return;
      const toDelete = new Set(selectedNetworks);
      config.value.networks = config.value.networks.filter(n => !toDelete.has(n.network));
    }

    function saveNetwork() {
      const network = String(networkForm.value.network || '').trim();
      if (!network) return alert('请输入网络地址');

      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(network)) {
        return alert('网络格式错误，应为 x.x.x.x/x');
      }

      const duplicate = config.value.networks.find((n, i) => n.network === network && i !== editingNetworkIndex.value);
      if (duplicate) return alert('该网络已存在');

      const newNet = { ...networkForm.value, network };

      if (editingNetworkIndex.value >= 0) {
        config.value.networks.splice(editingNetworkIndex.value, 1, newNet);
      } else {
        config.value.networks.push(newNet);
      }
      networkModalVisible.value = false;
    }

    // Aggregate operations
    function createAggregate() {
      editingAggregateIndex.value = -1;
      aggregateForm.value = { aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' };
      aggregateModalVisible.value = true;
    }

    function editAggregate(row) {
      editingAggregateIndex.value = config.value.aggregates.findIndex(a => a.aggregate === row.aggregate);
      aggregateForm.value = { ...row };
      aggregateModalVisible.value = true;
    }

    function deleteAggregates(selectedAggregates) {
      if (!selectedAggregates.length) return;
      if (!confirm('确认删除选中的聚合网络？')) return;
      const toDelete = new Set(selectedAggregates);
      config.value.aggregates = config.value.aggregates.filter(a => !toDelete.has(a.aggregate));
    }

    function saveAggregate() {
      const aggregate = String(aggregateForm.value.aggregate || '').trim();
      if (!aggregate) return alert('请输入聚合网络地址');

      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(aggregate)) {
        return alert('聚合网络格式错误，应为 x.x.x.x/x');
      }

      const duplicate = config.value.aggregates.find((a, i) => a.aggregate === aggregate && i !== editingAggregateIndex.value);
      if (duplicate) return alert('该聚合网络已存在');

      const newAgg = { ...aggregateForm.value, aggregate };

      if (editingAggregateIndex.value >= 0) {
        config.value.aggregates.splice(editingAggregateIndex.value, 1, newAgg);
      } else {
        config.value.aggregates.push(newAgg);
      }
      aggregateModalVisible.value = false;
    }

    // Interface operations
    function createInterface() {
      editingInterfaceIndex.value = -1;
      interfaceForm.value = { name: '', 'mpls-forwarding': false };
      interfaceModalVisible.value = true;
    }

    function editInterface(row) {
      editingInterfaceIndex.value = config.value.interfaces.findIndex(i => i.name === row.name);
      interfaceForm.value = { ...row };
      interfaceModalVisible.value = true;
    }

    function deleteInterfaces(selectedNames) {
      if (!selectedNames.length) return;
      if (!confirm('确认删除选中的接口？')) return;
      const toDelete = new Set(selectedNames);
      config.value.interfaces = config.value.interfaces.filter(i => !toDelete.has(i.name));
    }

    function saveInterface() {
      const name = String(interfaceForm.value.name || '').trim();
      if (!name) return alert('请输入接口名称');

      const duplicate = config.value.interfaces.find((i, idx) => i.name === name && idx !== editingInterfaceIndex.value);
      if (duplicate) return alert('该接口已存在');

      const newIface = { ...interfaceForm.value, name };

      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, newIface);
      } else {
        config.value.interfaces.push(newIface);
      }
      interfaceModalVisible.value = false;
    }

    // Redistribute modal
    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'route-map', title: '路由映射' },
    ];

    const REDISTRIBUTE_PROTOCOLS = [
      { value: '', label: '-- 选择协议 --' },
      { value: 'babel', label: 'Babel' },
      { value: 'connected', label: 'Connected (直连)' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel (内核)' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static (静态)' },
    ];

    const IPV6_REDISTRIBUTE_PROTOCOLS = [
      { value: '', label: '-- 选择协议 --' },
      { value: 'babel', label: 'Babel' },
      { value: 'connected', label: 'Connected (直连)' },
      { value: 'kernel', label: 'Kernel (内核)' },
      { value: 'ospfv3', label: 'OSPFv3' },
      { value: 'ripng', label: 'RIPng' },
      { value: 'static', label: 'Static (静态)' },
      { value: 'table', label: 'Table (路由表)' },
    ];

    // Redistribute operations
    function createRedistribute() {
      editingRedistributeIndex.value = -1;
      redistributeForm.value = { protocol: '', metric: '', 'route-map': '' };
      redistributeModalVisible.value = true;
    }

    function editRedistribute(row) {
      editingRedistributeIndex.value = config.value.redistributes.findIndex(r => r.protocol === row.protocol);
      redistributeForm.value = { ...row };
      redistributeModalVisible.value = true;
    }

    function deleteRedistributes(selectedProtocols) {
      if (!selectedProtocols.length) return;
      if (!confirm('确认删除选中的重分发？')) return;
      const toDelete = new Set(selectedProtocols);
      config.value.redistributes = config.value.redistributes.filter(r => !toDelete.has(r.protocol));
    }

    function saveRedistribute() {
      const protocol = String(redistributeForm.value.protocol || '').trim();
      if (!protocol) return alert('请选择协议');

      const duplicate = config.value.redistributes.find((r, i) => r.protocol === protocol && i !== editingRedistributeIndex.value);
      if (duplicate) return alert('该协议已存在');

      const newRedist = { ...redistributeForm.value, protocol };

      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, newRedist);
      } else {
        config.value.redistributes.push(newRedist);
      }
      redistributeModalVisible.value = false;
    }

    // IPv6 Network operations
    function createIpv6Network() {
      editingIpv6NetworkIndex.value = -1;
      ipv6NetworkForm.value = { network: '', backdoor: false, 'route-map': '' };
      ipv6NetworkModalVisible.value = true;
    }

    function editIpv6Network(row) {
      editingIpv6NetworkIndex.value = config.value.ipv6Networks.findIndex(n => n.network === row.network);
      ipv6NetworkForm.value = { ...row };
      ipv6NetworkModalVisible.value = true;
    }

    function deleteIpv6Networks(selectedNetworks) {
      if (!selectedNetworks.length) return;
      if (!confirm('确认删除选中的 IPv6 网络？')) return;
      const toDelete = new Set(selectedNetworks);
      config.value.ipv6Networks = config.value.ipv6Networks.filter(n => !toDelete.has(n.network));
    }

    function saveIpv6Network() {
      const network = String(ipv6NetworkForm.value.network || '').trim();
      if (!network) return alert('请输入 IPv6 网络地址');

      const parts = network.split('/');
      if (parts.length !== 2) {
        return alert('IPv6 网络格式错误，应为 xxxx:xxxx::xxxx/prefix');
      }
      const prefix = parseInt(parts[1], 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 128) {
        return alert('IPv6 前缀长度必须在 0-128 之间');
      }
      const ipErr = validateIPv6(parts[0]);
      if (ipErr) return alert('IPv6 地址格式错误');

      const duplicate = config.value.ipv6Networks.find((n, i) => n.network === network && i !== editingIpv6NetworkIndex.value);
      if (duplicate) return alert('该 IPv6 网络已存在');

      const newNet = { ...ipv6NetworkForm.value, network };
      if (editingIpv6NetworkIndex.value >= 0) {
        config.value.ipv6Networks.splice(editingIpv6NetworkIndex.value, 1, newNet);
      } else {
        config.value.ipv6Networks.push(newNet);
      }
      ipv6NetworkModalVisible.value = false;
    }

    // IPv6 Aggregate operations
    function createIpv6Aggregate() {
      editingIpv6AggregateIndex.value = -1;
      ipv6AggregateForm.value = { aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' };
      ipv6AggregateModalVisible.value = true;
    }

    function editIpv6Aggregate(row) {
      editingIpv6AggregateIndex.value = config.value.ipv6Aggregates.findIndex(a => a.aggregate === row.aggregate);
      ipv6AggregateForm.value = { ...row };
      ipv6AggregateModalVisible.value = true;
    }

    function deleteIpv6Aggregates(selectedAggregates) {
      if (!selectedAggregates.length) return;
      if (!confirm('确认删除选中的 IPv6 聚合网络？')) return;
      const toDelete = new Set(selectedAggregates);
      config.value.ipv6Aggregates = config.value.ipv6Aggregates.filter(a => !toDelete.has(a.aggregate));
    }

    function saveIpv6Aggregate() {
      const aggregate = String(ipv6AggregateForm.value.aggregate || '').trim();
      if (!aggregate) return alert('请输入 IPv6 聚合网络地址');

      const parts = aggregate.split('/');
      if (parts.length !== 2) {
        return alert('IPv6 聚合网络格式错误，应为 xxxx:xxxx::xxxx/prefix');
      }
      const prefix = parseInt(parts[1], 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 128) {
        return alert('IPv6 前缀长度必须在 0-128 之间');
      }
      const ipErr = validateIPv6(parts[0]);
      if (ipErr) return alert('IPv6 地址格式错误');

      const duplicate = config.value.ipv6Aggregates.find((a, i) => a.aggregate === aggregate && i !== editingIpv6AggregateIndex.value);
      if (duplicate) return alert('该 IPv6 聚合网络已存在');

      const newAgg = { ...ipv6AggregateForm.value, aggregate };
      if (editingIpv6AggregateIndex.value >= 0) {
        config.value.ipv6Aggregates.splice(editingIpv6AggregateIndex.value, 1, newAgg);
      } else {
        config.value.ipv6Aggregates.push(newAgg);
      }
      ipv6AggregateModalVisible.value = false;
    }

    // IPv6 Redistribute operations
    function createIpv6Redistribute() {
      editingIpv6RedistributeIndex.value = -1;
      ipv6RedistributeForm.value = { protocol: '', metric: '', 'route-map': '' };
      ipv6RedistributeModalVisible.value = true;
    }

    function editIpv6Redistribute(row) {
      editingIpv6RedistributeIndex.value = config.value.ipv6Redistributes.findIndex(r => r.protocol === row.protocol);
      ipv6RedistributeForm.value = { ...row };
      ipv6RedistributeModalVisible.value = true;
    }

    function deleteIpv6Redistributes(selectedProtocols) {
      if (!selectedProtocols.length) return;
      if (!confirm('确认删除选中的 IPv6 重分发？')) return;
      const toDelete = new Set(selectedProtocols);
      config.value.ipv6Redistributes = config.value.ipv6Redistributes.filter(r => !toDelete.has(r.protocol));
    }

    function saveIpv6Redistribute() {
      const protocol = String(ipv6RedistributeForm.value.protocol || '').trim();
      if (!protocol) return alert('请选择协议');

      const duplicate = config.value.ipv6Redistributes.find((r, i) => r.protocol === protocol && i !== editingIpv6RedistributeIndex.value);
      if (duplicate) return alert('该协议已存在');

      const newRedist = { ...ipv6RedistributeForm.value, protocol };
      if (editingIpv6RedistributeIndex.value >= 0) {
        config.value.ipv6Redistributes.splice(editingIpv6RedistributeIndex.value, 1, newRedist);
      } else {
        config.value.ipv6Redistributes.push(newRedist);
      }
      ipv6RedistributeModalVisible.value = false;
    }

    // IPv6 Distance Prefix modal
    const ipv6DistancePrefixModalVisible = ref(false);
    const editingIpv6DistancePrefixIndex = ref(-1);
    const ipv6DistancePrefixForm = ref({ prefix: '', distance: '' });

    function createDistancePrefixIpv6Unicast() {
      editingIpv6DistancePrefixIndex.value = -1;
      ipv6DistancePrefixForm.value = { prefix: '', distance: '' };
      ipv6DistancePrefixModalVisible.value = true;
    }

    function editDistancePrefixIpv6Unicast(row) {
      const idx = config.value.ipv6DistancePrefixes.findIndex(d => d.prefix === row.prefix);
      editingIpv6DistancePrefixIndex.value = idx;
      ipv6DistancePrefixForm.value = { ...row };
      ipv6DistancePrefixModalVisible.value = true;
    }

    function deleteDistancePrefixesIpv6Unicast(rows) {
      if (!rows.length) return;
      if (!confirm('确认删除选中的前缀管理距离？')) return;
      const prefixes = new Set(rows.map(r => r.prefix));
      config.value.ipv6DistancePrefixes = config.value.ipv6DistancePrefixes.filter(d => !prefixes.has(d.prefix));
    }

    function saveDistancePrefixIpv6Unicast() {
      const form = ipv6DistancePrefixForm.value;
      if (!form.prefix) { alert('请填写前缀'); return; }
      if (!/^[0-9a-fA-F:]+\/\d+$/.test(form.prefix)) { alert('前缀格式无效，应为 IPv6 前缀'); return; }
      if (!form.distance || form.distance < 1 || form.distance > 255) { alert('管理距离应为 1-255'); return; }

      const idx = editingIpv6DistancePrefixIndex.value;
      if (idx >= 0) {
        config.value.ipv6DistancePrefixes[idx] = { ...form };
      } else {
        config.value.ipv6DistancePrefixes.push({ ...form });
      }
      ipv6DistancePrefixModalVisible.value = false;
    }

    // Helper function to create CRUD operations for address families
    function createAddressFamilyOperations(prefix, configKey, isIPv6, refs) {
      const {
        networkModalVisible, editingNetworkIndex, networkForm,
        aggregateModalVisible, editingAggregateIndex, aggregateForm,
        redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      } = refs;

      // Network operations
      function createNetwork() {
        editingNetworkIndex.value = -1;
        networkForm.value = { network: '', backdoor: false, 'route-map': '' };
        networkModalVisible.value = true;
      }

      function editNetwork(row) {
        editingNetworkIndex.value = config.value[configKey + 'Networks'].findIndex(n => n.network === row.network);
        networkForm.value = { ...row };
        networkModalVisible.value = true;
      }

      function deleteNetworks(selectedNetworks) {
        if (!selectedNetworks.length) return;
        if (!confirm(`确认删除选中的${isIPv6 ? ' IPv6' : ''}网络？`)) return;
        const toDelete = new Set(selectedNetworks);
        config.value[configKey + 'Networks'] = config.value[configKey + 'Networks'].filter(n => !toDelete.has(n.network));
      }

      function saveNetwork() {
        const network = String(networkForm.value.network || '').trim();
        if (!network) return alert(`请输入${isIPv6 ? ' IPv6' : ''}网络地址`);

        if (isIPv6) {
          const parts = network.split('/');
          if (parts.length !== 2) {
            return alert('IPv6 网络格式错误，应为 xxxx:xxxx::xxxx/prefix');
          }
          const prefixLen = parseInt(parts[1], 10);
          if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) {
            return alert('IPv6 前缀长度必须在 0-128 之间');
          }
          const ipErr = validateIPv6(parts[0]);
          if (ipErr) return alert('IPv6 地址格式错误');
        } else {
          if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(network)) {
            return alert('网络格式错误，应为 x.x.x.x/x');
          }
        }

        const duplicate = config.value[configKey + 'Networks'].find((n, i) => n.network === network && i !== editingNetworkIndex.value);
        if (duplicate) return alert('该网络已存在');

        const newNet = { ...networkForm.value, network };
        if (editingNetworkIndex.value >= 0) {
          config.value[configKey + 'Networks'].splice(editingNetworkIndex.value, 1, newNet);
        } else {
          config.value[configKey + 'Networks'].push(newNet);
        }
        networkModalVisible.value = false;
      }

      // Aggregate operations
      function createAggregate() {
        editingAggregateIndex.value = -1;
        aggregateForm.value = { aggregate: '', 'as-set': false, 'summary-only': false, 'route-map': '' };
        aggregateModalVisible.value = true;
      }

      function editAggregate(row) {
        editingAggregateIndex.value = config.value[configKey + 'Aggregates'].findIndex(a => a.aggregate === row.aggregate);
        aggregateForm.value = { ...row };
        aggregateModalVisible.value = true;
      }

      function deleteAggregates(selectedAggregates) {
        if (!selectedAggregates.length) return;
        if (!confirm(`确认删除选中的${isIPv6 ? ' IPv6' : ''}聚合网络？`)) return;
        const toDelete = new Set(selectedAggregates);
        config.value[configKey + 'Aggregates'] = config.value[configKey + 'Aggregates'].filter(a => !toDelete.has(a.aggregate));
      }

      function saveAggregate() {
        const aggregate = String(aggregateForm.value.aggregate || '').trim();
        if (!aggregate) return alert(`请输入${isIPv6 ? ' IPv6' : ''}聚合网络地址`);

        if (isIPv6) {
          const parts = aggregate.split('/');
          if (parts.length !== 2) {
            return alert('IPv6 聚合网络格式错误，应为 xxxx:xxxx::xxxx/prefix');
          }
          const prefixLen = parseInt(parts[1], 10);
          if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) {
            return alert('IPv6 前缀长度必须在 0-128 之间');
          }
          const ipErr = validateIPv6(parts[0]);
          if (ipErr) return alert('IPv6 地址格式错误');
        } else {
          if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(aggregate)) {
            return alert('聚合网络格式错误，应为 x.x.x.x/x');
          }
        }

        const duplicate = config.value[configKey + 'Aggregates'].find((a, i) => a.aggregate === aggregate && i !== editingAggregateIndex.value);
        if (duplicate) return alert('该聚合网络已存在');

        const newAgg = { ...aggregateForm.value, aggregate };
        if (editingAggregateIndex.value >= 0) {
          config.value[configKey + 'Aggregates'].splice(editingAggregateIndex.value, 1, newAgg);
        } else {
          config.value[configKey + 'Aggregates'].push(newAgg);
        }
        aggregateModalVisible.value = false;
      }

      // Redistribute operations
      function createRedistribute() {
        editingRedistributeIndex.value = -1;
        redistributeForm.value = { protocol: '', metric: '', 'route-map': '' };
        redistributeModalVisible.value = true;
      }

      function editRedistribute(row) {
        editingRedistributeIndex.value = config.value[configKey + 'Redistributes'].findIndex(r => r.protocol === row.protocol);
        redistributeForm.value = { ...row };
        redistributeModalVisible.value = true;
      }

      function deleteRedistributes(selectedProtocols) {
        if (!selectedProtocols.length) return;
        if (!confirm(`确认删除选中的${isIPv6 ? ' IPv6' : ''}重分发？`)) return;
        const toDelete = new Set(selectedProtocols);
        config.value[configKey + 'Redistributes'] = config.value[configKey + 'Redistributes'].filter(r => !toDelete.has(r.protocol));
      }

      function saveRedistribute() {
        const protocol = String(redistributeForm.value.protocol || '').trim();
        if (!protocol) return alert('请选择协议');

        const duplicate = config.value[configKey + 'Redistributes'].find((r, i) => r.protocol === protocol && i !== editingRedistributeIndex.value);
        if (duplicate) return alert('该协议已存在');

        const newRedist = { ...redistributeForm.value, protocol };
        if (editingRedistributeIndex.value >= 0) {
          config.value[configKey + 'Redistributes'].splice(editingRedistributeIndex.value, 1, newRedist);
        } else {
          config.value[configKey + 'Redistributes'].push(newRedist);
        }
        redistributeModalVisible.value = false;
      }

      // Capitalize first letter for method names
      const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      
      return {
        [`createNetwork${capPrefix}`]: createNetwork,
        [`editNetwork${capPrefix}`]: editNetwork,
        [`deleteNetworks${capPrefix}`]: deleteNetworks,
        [`saveNetwork${capPrefix}`]: saveNetwork,
        [`createAggregate${capPrefix}`]: createAggregate,
        [`editAggregate${capPrefix}`]: editAggregate,
        [`deleteAggregates${capPrefix}`]: deleteAggregates,
        [`saveAggregate${capPrefix}`]: saveAggregate,
        [`createRedistribute${capPrefix}`]: createRedistribute,
        [`editRedistribute${capPrefix}`]: editRedistribute,
        [`deleteRedistributes${capPrefix}`]: deleteRedistributes,
        [`saveRedistribute${capPrefix}`]: saveRedistribute,
      };
    }

    // Create operations for all 8 new address families
    const ipv4FlowspecOps = createAddressFamilyOperations('ipv4Flowspec', 'ipv4Flowspec', false, {
      networkModalVisible: ipv4FlowspecNetworkModalVisible, editingNetworkIndex: editingIpv4FlowspecNetworkIndex, networkForm: ipv4FlowspecNetworkForm,
      aggregateModalVisible: ipv4FlowspecAggregateModalVisible, editingAggregateIndex: editingIpv4FlowspecAggregateIndex, aggregateForm: ipv4FlowspecAggregateForm,
      redistributeModalVisible: ipv4FlowspecRedistributeModalVisible, editingRedistributeIndex: editingIpv4FlowspecRedistributeIndex, redistributeForm: ipv4FlowspecRedistributeForm,
    });
    const ipv4LabeledUnicastOps = createAddressFamilyOperations('ipv4LabeledUnicast', 'ipv4LabeledUnicast', false, {
      networkModalVisible: ipv4LabeledUnicastNetworkModalVisible, editingNetworkIndex: editingIpv4LabeledUnicastNetworkIndex, networkForm: ipv4LabeledUnicastNetworkForm,
      aggregateModalVisible: ipv4LabeledUnicastAggregateModalVisible, editingAggregateIndex: editingIpv4LabeledUnicastAggregateIndex, aggregateForm: ipv4LabeledUnicastAggregateForm,
      redistributeModalVisible: ipv4LabeledUnicastRedistributeModalVisible, editingRedistributeIndex: editingIpv4LabeledUnicastRedistributeIndex, redistributeForm: ipv4LabeledUnicastRedistributeForm,
    });
    const ipv4MulticastOps = createAddressFamilyOperations('ipv4Multicast', 'ipv4Multicast', false, {
      networkModalVisible: ipv4MulticastNetworkModalVisible, editingNetworkIndex: editingIpv4MulticastNetworkIndex, networkForm: ipv4MulticastNetworkForm,
      aggregateModalVisible: ipv4MulticastAggregateModalVisible, editingAggregateIndex: editingIpv4MulticastAggregateIndex, aggregateForm: ipv4MulticastAggregateForm,
      redistributeModalVisible: ipv4MulticastRedistributeModalVisible, editingRedistributeIndex: editingIpv4MulticastRedistributeIndex, redistributeForm: ipv4MulticastRedistributeForm,
    });
    const ipv4VpnOps = createAddressFamilyOperations('ipv4Vpn', 'ipv4Vpn', false, {
      networkModalVisible: ipv4VpnNetworkModalVisible, editingNetworkIndex: editingIpv4VpnNetworkIndex, networkForm: ipv4VpnNetworkForm,
      aggregateModalVisible: ipv4VpnAggregateModalVisible, editingAggregateIndex: editingIpv4VpnAggregateIndex, aggregateForm: ipv4VpnAggregateForm,
      redistributeModalVisible: ipv4VpnRedistributeModalVisible, editingRedistributeIndex: editingIpv4VpnRedistributeIndex, redistributeForm: ipv4VpnRedistributeForm,
    });
    const ipv6FlowspecOps = createAddressFamilyOperations('ipv6Flowspec', 'ipv6Flowspec', true, {
      networkModalVisible: ipv6FlowspecNetworkModalVisible, editingNetworkIndex: editingIpv6FlowspecNetworkIndex, networkForm: ipv6FlowspecNetworkForm,
      aggregateModalVisible: ipv6FlowspecAggregateModalVisible, editingAggregateIndex: editingIpv6FlowspecAggregateIndex, aggregateForm: ipv6FlowspecAggregateForm,
      redistributeModalVisible: ipv6FlowspecRedistributeModalVisible, editingRedistributeIndex: editingIpv6FlowspecRedistributeIndex, redistributeForm: ipv6FlowspecRedistributeForm,
    });
    const ipv6LabeledUnicastOps = createAddressFamilyOperations('ipv6LabeledUnicast', 'ipv6LabeledUnicast', true, {
      networkModalVisible: ipv6LabeledUnicastNetworkModalVisible, editingNetworkIndex: editingIpv6LabeledUnicastNetworkIndex, networkForm: ipv6LabeledUnicastNetworkForm,
      aggregateModalVisible: ipv6LabeledUnicastAggregateModalVisible, editingAggregateIndex: editingIpv6LabeledUnicastAggregateIndex, aggregateForm: ipv6LabeledUnicastAggregateForm,
      redistributeModalVisible: ipv6LabeledUnicastRedistributeModalVisible, editingRedistributeIndex: editingIpv6LabeledUnicastRedistributeIndex, redistributeForm: ipv6LabeledUnicastRedistributeForm,
    });
    const ipv6MulticastOps = createAddressFamilyOperations('ipv6Multicast', 'ipv6Multicast', true, {
      networkModalVisible: ipv6MulticastNetworkModalVisible, editingNetworkIndex: editingIpv6MulticastNetworkIndex, networkForm: ipv6MulticastNetworkForm,
      aggregateModalVisible: ipv6MulticastAggregateModalVisible, editingAggregateIndex: editingIpv6MulticastAggregateIndex, aggregateForm: ipv6MulticastAggregateForm,
      redistributeModalVisible: ipv6MulticastRedistributeModalVisible, editingRedistributeIndex: editingIpv6MulticastRedistributeIndex, redistributeForm: ipv6MulticastRedistributeForm,
    });
    const ipv6VpnOps = createAddressFamilyOperations('ipv6Vpn', 'ipv6Vpn', true, {
      networkModalVisible: ipv6VpnNetworkModalVisible, editingNetworkIndex: editingIpv6VpnNetworkIndex, networkForm: ipv6VpnNetworkForm,
      aggregateModalVisible: ipv6VpnAggregateModalVisible, editingAggregateIndex: editingIpv6VpnAggregateIndex, aggregateForm: ipv6VpnAggregateForm,
      redistributeModalVisible: ipv6VpnRedistributeModalVisible, editingRedistributeIndex: editingIpv6VpnRedistributeIndex, redistributeForm: ipv6VpnRedistributeForm,
    });

    // EVPN Route Target operations
    function createEvpnRt() {
      editingEvpnRtIndex.value = -1;
      evpnRtForm.value = { direction: 'both', 'route-target': '' };
      evpnRtModalVisible.value = true;
    }

    function editEvpnRt(row) {
      editingEvpnRtIndex.value = config.value['address-family']['l2vpn-evpn']['route-targets'].findIndex(rt => rt['route-target'] === row['route-target'] && rt.direction === row.direction);
      evpnRtForm.value = { ...row };
      evpnRtModalVisible.value = true;
    }

    function deleteEvpnRts(selected) {
      if (!selected.length) return;
      if (!confirm('确认删除选中的 Route Target？')) return;
      const toDelete = new Set(selected.map(s => `${s.direction}::${s['route-target']}`));
      config.value['address-family']['l2vpn-evpn']['route-targets'] = config.value['address-family']['l2vpn-evpn']['route-targets'].filter(rt => !toDelete.has(`${rt.direction}::${rt['route-target']}`));
    }

    function saveEvpnRt() {
      const rt = String(evpnRtForm.value['route-target'] || '').trim();
      if (!rt) return alert('请输入 Route Target');
      const direction = evpnRtForm.value.direction || 'both';

      const duplicate = config.value['address-family']['l2vpn-evpn']['route-targets'].find((r, i) => r['route-target'] === rt && r.direction === direction && i !== editingEvpnRtIndex.value);
      if (duplicate) return alert('该 Route Target 已存在');

      const newRt = { direction, 'route-target': rt };
      if (editingEvpnRtIndex.value >= 0) {
        config.value['address-family']['l2vpn-evpn']['route-targets'].splice(editingEvpnRtIndex.value, 1, newRt);
      } else {
        config.value['address-family']['l2vpn-evpn']['route-targets'].push(newRt);
      }
      evpnRtModalVisible.value = false;
    }

    // EVPN VNI operations
    function createEvpnVni() {
      editingEvpnVniIndex.value = -1;
      evpnVniForm.value = { vni: '', 'route-targets': [] };
      evpnVniModalVisible.value = true;
    }

    function editEvpnVni(row) {
      editingEvpnVniIndex.value = config.value['address-family']['l2vpn-evpn'].vnis.findIndex(v => v.vni === row.vni);
      evpnVniForm.value = { vni: row.vni, 'route-targets': [...(row['route-targets'] || [])] };
      evpnVniModalVisible.value = true;
    }

    function deleteEvpnVnis(selected) {
      if (!selected.length) return;
      if (!confirm('确认删除选中的 VNI？')) return;
      const toDelete = new Set(selected.map(s => String(s.vni)));
      config.value['address-family']['l2vpn-evpn'].vnis = config.value['address-family']['l2vpn-evpn'].vnis.filter(v => !toDelete.has(String(v.vni)));
    }

    function saveEvpnVni() {
      const vni = String(evpnVniForm.value.vni || '').trim();
      if (!vni) return alert('请输入 VNI');
      const vniErr = validateVni(vni);
      if (vniErr) return alert(`VNI：${vniErr}`);

      const duplicate = config.value['address-family']['l2vpn-evpn'].vnis.find((v, i) => v.vni === vni && i !== editingEvpnVniIndex.value);
      if (duplicate) return alert('该 VNI 已存在');

      const newVni = { vni, 'route-targets': [...evpnVniForm.value['route-targets']] };
      if (editingEvpnVniIndex.value >= 0) {
        config.value['address-family']['l2vpn-evpn'].vnis.splice(editingEvpnVniIndex.value, 1, newVni);
      } else {
        config.value['address-family']['l2vpn-evpn'].vnis.push(newVni);
      }
      evpnVniModalVisible.value = false;
    }

    // EVPN VNI Route Target operations
    function createEvpnVniRt() {
      editingEvpnVniRtIndex.value = -1;
      evpnVniRtForm.value = { direction: 'both', 'route-target': '' };
      evpnVniRtModalVisible.value = true;
    }

    function editEvpnVniRt(row) {
      editingEvpnVniRtIndex.value = evpnVniForm.value['route-targets'].findIndex(rt => rt['route-target'] === row['route-target'] && rt.direction === row.direction);
      evpnVniRtForm.value = { ...row };
      evpnVniRtModalVisible.value = true;
    }

    function deleteEvpnVniRts(selected) {
      if (!selected.length) return;
      if (!confirm('确认删除选中的 Route Target？')) return;
      const toDelete = new Set(selected.map(s => `${s.direction}::${s['route-target']}`));
      evpnVniForm.value['route-targets'] = evpnVniForm.value['route-targets'].filter(rt => !toDelete.has(`${rt.direction}::${rt['route-target']}`));
    }

    function saveEvpnVniRt() {
      const rt = String(evpnVniRtForm.value['route-target'] || '').trim();
      if (!rt) return alert('请输入 Route Target');
      const direction = evpnVniRtForm.value.direction || 'both';

      const duplicate = evpnVniForm.value['route-targets'].find((r, i) => r['route-target'] === rt && r.direction === direction && i !== editingEvpnVniRtIndex.value);
      if (duplicate) return alert('该 Route Target 已存在');

      const newRt = { direction, 'route-target': rt };
      if (editingEvpnVniRtIndex.value >= 0) {
        evpnVniForm.value['route-targets'].splice(editingEvpnVniRtIndex.value, 1, newRt);
      } else {
        evpnVniForm.value['route-targets'].push(newRt);
      }
      evpnVniRtModalVisible.value = false;
    }

    function openVniRtManager(row) {
      const idx = config.value['address-family']['l2vpn-evpn'].vnis.findIndex(v => v.vni === row.vni);
      if (idx < 0) return;
      currentVniIndex.value = idx;
      evpnVniForm.value = { vni: row.vni, 'route-targets': [...(row['route-targets'] || [])] };
      evpnVniRtModalVisible.value = true;
    }

    function saveEvpnVniRtManager() {
      if (currentVniIndex.value >= 0) {
        config.value['address-family']['l2vpn-evpn'].vnis[currentVniIndex.value]['route-targets'] = [...evpnVniForm.value['route-targets']];
      }
      evpnVniRtModalVisible.value = false;
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    // Parameters section
    const parametersForm = computed({
      get: () => config.value.parameters || {},
      set: (val) => { config.value.parameters = val; }
    });

    // SID section
    const sidForm = computed({
      get: () => config.value.sid || {},
      set: (val) => { config.value.sid = val; }
    });

    // SRv6 section
    const srv6Form = computed({
      get: () => config.value.srv6 || {},
      set: (val) => { config.value.srv6 = val; }
    });

    // Confederation peers management
    const confederationPeers = computed({
      get: () => config.value.parameters?.confederation?.peers || [],
      set: (val) => {
        if (!config.value.parameters) config.value.parameters = {};
        if (!config.value.parameters.confederation) config.value.parameters.confederation = {};
        config.value.parameters.confederation.peers = val;
      }
    });

    function addConfederationPeer() {
      const peer = prompt('请输入 Confederation Peer ASN:');
      if (!peer) return;
      const asnErr = validateASN(peer);
      if (asnErr) return alert(asnErr);
      if (confederationPeers.value.includes(peer)) return alert('该 Peer 已存在');
      confederationPeers.value = [...confederationPeers.value, peer];
    }

    function removeConfederationPeer(index) {
      confederationPeers.value = confederationPeers.value.filter((_, i) => i !== index);
    }

    return {
      loading, saving, saved, config, activeTab, activeAfTab, writeDisabled,
      interfaces,
      neighborColumns, peerGroupColumns, bmpColumns, listenColumns, networkColumns, aggregateColumns, interfaceColumns, redistributeColumns,
      ipv6NetworkColumns, ipv6AggregateColumns, ipv6RedistributeColumns, ipv6DistancePrefixColumns,
      ipv4FlowspecNetworkColumns, ipv4FlowspecAggregateColumns, ipv4FlowspecRedistributeColumns,
      ipv4LabeledUnicastNetworkColumns, ipv4LabeledUnicastAggregateColumns, ipv4LabeledUnicastRedistributeColumns,
      ipv4MulticastNetworkColumns, ipv4MulticastAggregateColumns, ipv4MulticastRedistributeColumns,
      ipv4VpnNetworkColumns, ipv4VpnAggregateColumns, ipv4VpnRedistributeColumns,
      ipv6FlowspecNetworkColumns, ipv6FlowspecAggregateColumns, ipv6FlowspecRedistributeColumns,
      ipv6LabeledUnicastNetworkColumns, ipv6LabeledUnicastAggregateColumns, ipv6LabeledUnicastRedistributeColumns,
      ipv6MulticastNetworkColumns, ipv6MulticastAggregateColumns, ipv6MulticastRedistributeColumns,
      ipv6VpnNetworkColumns, ipv6VpnAggregateColumns, ipv6VpnRedistributeColumns,
      LOCAL_ROLE_OPTIONS, REDISTRIBUTE_PROTOCOLS, IPV6_REDISTRIBUTE_PROTOCOLS, commandPath,
      neighborModalVisible, neighborForm, editingNeighborIndex,
      peerGroupModalVisible, peerGroupForm, editingPeerGroupIndex,
      bmpModalVisible, bmpForm, editingBmpIndex,
      listenModalVisible, listenForm, editingListenIndex,
      networkModalVisible, networkForm, editingNetworkIndex,
      aggregateModalVisible, aggregateForm, editingAggregateIndex,
      interfaceModalVisible, interfaceForm, editingInterfaceIndex,
      redistributeModalVisible, redistributeForm, editingRedistributeIndex,
      ipv6NetworkModalVisible, ipv6NetworkForm, editingIpv6NetworkIndex,
      ipv6AggregateModalVisible, ipv6AggregateForm, editingIpv6AggregateIndex,
      ipv6RedistributeModalVisible, ipv6RedistributeForm, editingIpv6RedistributeIndex,
      ipv6DistancePrefixModalVisible, ipv6DistancePrefixForm, editingIpv6DistancePrefixIndex,
      createDistancePrefixIpv6Unicast, editDistancePrefixIpv6Unicast, deleteDistancePrefixesIpv6Unicast, saveDistancePrefixIpv6Unicast,
      ipv4FlowspecNetworkModalVisible, ipv4FlowspecNetworkForm, editingIpv4FlowspecNetworkIndex,
      ipv4FlowspecAggregateModalVisible, ipv4FlowspecAggregateForm, editingIpv4FlowspecAggregateIndex,
      ipv4FlowspecRedistributeModalVisible, ipv4FlowspecRedistributeForm, editingIpv4FlowspecRedistributeIndex,
      ipv4LabeledUnicastNetworkModalVisible, ipv4LabeledUnicastNetworkForm, editingIpv4LabeledUnicastNetworkIndex,
      ipv4LabeledUnicastAggregateModalVisible, ipv4LabeledUnicastAggregateForm, editingIpv4LabeledUnicastAggregateIndex,
      ipv4LabeledUnicastRedistributeModalVisible, ipv4LabeledUnicastRedistributeForm, editingIpv4LabeledUnicastRedistributeIndex,
      ipv4MulticastNetworkModalVisible, ipv4MulticastNetworkForm, editingIpv4MulticastNetworkIndex,
      ipv4MulticastAggregateModalVisible, ipv4MulticastAggregateForm, editingIpv4MulticastAggregateIndex,
      ipv4MulticastRedistributeModalVisible, ipv4MulticastRedistributeForm, editingIpv4MulticastRedistributeIndex,
      ipv4MulticastDistancePrefixModalVisible, ipv4MulticastDistancePrefixForm, editingIpv4MulticastDistancePrefixIndex,
      ipv4MulticastDistancePrefixColumns,
      ipv6MulticastDistancePrefixModalVisible, ipv6MulticastDistancePrefixForm, editingIpv6MulticastDistancePrefixIndex,
      ipv6MulticastDistancePrefixColumns,
      createDistancePrefixIpv6Multicast, editDistancePrefixIpv6Multicast, deleteDistancePrefixesIpv6Multicast, saveDistancePrefixIpv6Multicast,
      ipv4VpnNetworkModalVisible, ipv4VpnNetworkForm, editingIpv4VpnNetworkIndex,
      ipv4VpnAggregateModalVisible, ipv4VpnAggregateForm, editingIpv4VpnAggregateIndex,
      ipv4VpnRedistributeModalVisible, ipv4VpnRedistributeForm, editingIpv4VpnRedistributeIndex,
      ipv6FlowspecNetworkModalVisible, ipv6FlowspecNetworkForm, editingIpv6FlowspecNetworkIndex,
      ipv6FlowspecAggregateModalVisible, ipv6FlowspecAggregateForm, editingIpv6FlowspecAggregateIndex,
      ipv6FlowspecRedistributeModalVisible, ipv6FlowspecRedistributeForm, editingIpv6FlowspecRedistributeIndex,
      ipv6LabeledUnicastNetworkModalVisible, ipv6LabeledUnicastNetworkForm, editingIpv6LabeledUnicastNetworkIndex,
      ipv6LabeledUnicastAggregateModalVisible, ipv6LabeledUnicastAggregateForm, editingIpv6LabeledUnicastAggregateIndex,
      ipv6LabeledUnicastRedistributeModalVisible, ipv6LabeledUnicastRedistributeForm, editingIpv6LabeledUnicastRedistributeIndex,
      ipv6MulticastNetworkModalVisible, ipv6MulticastNetworkForm, editingIpv6MulticastNetworkIndex,
      ipv6MulticastAggregateModalVisible, ipv6MulticastAggregateForm, editingIpv6MulticastAggregateIndex,
      ipv6MulticastRedistributeModalVisible, ipv6MulticastRedistributeForm, editingIpv6MulticastRedistributeIndex,
      ipv6VpnNetworkModalVisible, ipv6VpnNetworkForm, editingIpv6VpnNetworkIndex,
      ipv6VpnAggregateModalVisible, ipv6VpnAggregateForm, editingIpv6VpnAggregateIndex,
      ipv6VpnRedistributeModalVisible, ipv6VpnRedistributeForm, editingIpv6VpnRedistributeIndex,
      evpnRtModalVisible, evpnRtForm, editingEvpnRtIndex,
      evpnRtColumns, evpnVniColumns,
      evpnVniModalVisible, evpnVniForm, editingEvpnVniIndex,
      evpnVniRtModalVisible, editingEvpnVniRtIndex,
      currentVniIndex, EVPN_RT_DIRECTIONS,
      parametersForm, sidForm, srv6Form, confederationPeers,
      load, save,
      createNeighbor, editNeighbor, deleteNeighbors, saveNeighbor,
      createPeerGroup, editPeerGroup, deletePeerGroups, savePeerGroup,
      createBmp, editBmp, deleteBmpTargets, saveBmp,
      createListen, editListen, deleteListenRanges, saveListen,
      createNetwork, editNetwork, deleteNetworks, saveNetwork,
      createAggregate, editAggregate, deleteAggregates, saveAggregate,
      createInterface, editInterface, deleteInterfaces, saveInterface,
      createRedistribute, editRedistribute, deleteRedistributes, saveRedistribute,
      createIpv6Network, editIpv6Network, deleteIpv6Networks, saveIpv6Network,
      createIpv6Aggregate, editIpv6Aggregate, deleteIpv6Aggregates, saveIpv6Aggregate,
      createIpv6Redistribute, editIpv6Redistribute, deleteIpv6Redistributes, saveIpv6Redistribute,
      ...ipv4FlowspecOps,
      ...ipv4LabeledUnicastOps,
      ...ipv4MulticastOps,
      createDistancePrefixIpv4Multicast, editDistancePrefixIpv4Multicast, deleteDistancePrefixesIpv4Multicast, saveDistancePrefixIpv4Multicast,
      ...ipv4VpnOps,
      createNetworkIpv4Vpn, editNetworkIpv4Vpn, deleteNetworksIpv4Vpn, saveNetworkIpv4Vpn,
      ...ipv6FlowspecOps,
      ...ipv6LabeledUnicastOps,
      ...ipv6MulticastOps,
      ...ipv6VpnOps,
      createNetworkIpv6Vpn, editNetworkIpv6Vpn, deleteNetworksIpv6Vpn, saveNetworkIpv6Vpn,
      createEvpnRt, editEvpnRt, deleteEvpnRts, saveEvpnRt,
      evpnVniModalVisible, editingEvpnVniIndex,
      createEvpnVni, editEvpnVni, deleteEvpnVnis, saveEvpnVni,
      evpnVniRtModalVisible, editingEvpnVniRtIndex,
      createEvpnVniRt, editEvpnVniRt, saveEvpnVniRt, saveEvpnVniRtManager,
      openVniRtManager,
      addConfederationPeer, removeConfederationPeer,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'neighbors', title: '邻居' },
        { key: 'peer-groups', title: 'Peer Group' },
        { key: 'interfaces', title: '接口' },
        { key: 'bmp', title: 'BMP' },
        { key: 'listen', title: '监听' },
        { key: 'parameters', title: '参数' },
        { key: 'address-family', title: '地址族' },
        { key: 'sid', title: 'SID' },
        { key: 'srv6', title: 'SRv6' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">系统 ASN *</label>
              <input type="number" class="form-control" v-model="config['system-as']"
                     min="1" max="4294967294" placeholder="例如: 300" style="width:200px !important; flex:none !important;"
                     title="自治系统号 (1-4294967294)" />
            </div>
            <div class="form-row">
              <label class="form-label">保持定时器</label>
              <input type="number" class="form-control" v-model="config.timers.holdtime"
                     min="0" max="65535" placeholder="0=禁用, 1-65535 秒" style="width:200px !important; flex:none !important;"
                     title="BGP 保持定时器 (0=禁用, 1-65535 秒)" />
            </div>
            <div class="form-row">
              <label class="form-label">Keepalive 定时器</label>
              <input type="number" class="form-control" v-model="config.timers.keepalive"
                     min="1" max="65535" placeholder="1-65535 秒" style="width:200px !important; flex:none !important;"
                     title="BGP Keepalive 定时器 (1-65535 秒)" />
            </div>
          </div>
        </template>

        <template #neighbors>
          <DataTable :columns="neighborColumns" :data="config.neighbors" :loading="loading" :disabled="writeDisabled"
                     rowKey="address" :actions="['create', 'edit', 'delete']"
                     @create="createNeighbor" @edit="editNeighbor" @delete="deleteNeighbors" />
        </template>

        <template #peer-groups>
          <DataTable :columns="peerGroupColumns" :data="config.peerGroups" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="createPeerGroup" @edit="editPeerGroup" @delete="deletePeerGroups" />
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="createInterface" @edit="editInterface" @delete="deleteInterfaces" />
        </template>

        <template #bmp>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">镜像缓冲区限制</label>
              <input type="number" class="form-control" v-model="config['mirror-buffer-limit']"
                     min="0" max="4294967294" placeholder="0-4294967294 字节" style="width:200px !important; flex:none !important;"
                     title="最大镜像缓冲区内存限制 (字节)" />
            </div>
          </div>
          <DataTable :columns="bmpColumns" :data="config.bmpTargets" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="createBmp" @edit="editBmp" @delete="deleteBmpTargets" />
        </template>

        <template #listen>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">最大动态邻居数</label>
              <input type="number" class="form-control" v-model="config['listen-limit']"
                     min="1" max="65535" placeholder="1-65535" style="width:200px !important; flex:none !important;"
                     title="最大动态邻居数 (1-65535)" />
            </div>
          </div>
          <DataTable :columns="listenColumns" :data="config.listenRanges" :loading="loading" :disabled="writeDisabled"
                     rowKey="range" :actions="['create', 'edit', 'delete']"
                     @create="createListen" @edit="editListen" @delete="deleteListenRanges" />
        </template>

        <template #parameters>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">参数配置</div>
              <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">Cluster ID</label>
              <input type="text" class="form-control" v-model="config.parameters['cluster-id']"
                     placeholder="例如: 1.1.1.1 或 ASN" style="width:200px !important; flex:none !important;"
                     title="Route-reflector cluster-id" />
            </div>
            <div class="form-row">
              <label class="form-label">Router ID</label>
              <input type="text" class="form-control" v-model="config.parameters['router-id']"
                     placeholder="例如: 1.1.1.1" style="width:200px !important; flex:none !important;"
                     title="BGP Router ID" />
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['log-neighbor-changes']" /> 记录邻居状态变化</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['always-compare-med']" /> 总是比较 MED</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['deterministic-med']" /> 确定性 MED 比较</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['ebgp-requires-policy']" /> eBGP 需要策略 (RFC8212)</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['fast-convergence']" /> 快速收敛</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['graceful-shutdown']" /> 优雅关闭</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['network-import-check']" /> 网络导入检查</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['disable-ebgp-connected-route-check']" /> 禁用 eBGP 直连检查</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['allow-martian-nexthop']" /> 允许火星下一跳</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath['compare-routerid']" /> 比较 Router ID</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath['skip-mp']" /> 跳过多路径</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath['as-path']['multipath-relax']" /> AS 路径多路径放松</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath['as-path']['ignore']" /> 忽略 AS 路径</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath.med.confed" /> MED Confederation</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.bestpath.med['missing-as-worst']" /> 缺失 MED 视为最差</label>
            </div>
            <div class="form-row">
              <label class="form-label"> Confederation Identifier</label>
              <input type="text" class="form-control" v-model="config.parameters.confederation.identifier"
                     placeholder="ASN" style="width:200px !important; flex:none !important;"
                     title=" Confederation Identifier (ASN)" />
            </div>
            <div class="form-row">
              <label class="form-label">Confederation Peers</label>
              <div>
                <button class="btn btn-sm btn-primary" @click="addConfederationPeer">添加 Peer</button>
              </div>
            </div>
            <div v-if="confederationPeers.length > 0">
              <div v-for="(peer, index) in confederationPeers" :key="index" class="form-row" style="padding-left: 20px;">
                <label class="form-label">Peer {{ index + 1 }}</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <span>{{ peer }}</span>
                  <button class="btn btn-sm btn-danger" @click="removeConfederationPeer(index)">删除</button>
                </div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">Dampening Half-Life</label>
              <input type="number" class="form-control" v-model="config.parameters.dampening['half-life']"
                     min="1" max="45" placeholder="1-45 分钟" style="width:200px !important; flex:none !important;"
                     title="路由抖动抑制半衰期 (1-45 分钟)" />
            </div>
            <div class="form-row">
              <label class="form-label">Dampening Reuse</label>
              <input type="number" class="form-control" v-model="config.parameters.dampening.reuse"
                     min="1" max="20000" placeholder="1-20000" style="width:200px !important; flex:none !important;"
                     title="路由抖动抑制重用值 (1-20000)" />
            </div>
            <div class="form-row">
              <label class="form-label">Dampening Start Suppress</label>
              <input type="number" class="form-control" v-model="config.parameters.dampening['start-suppress-time']"
                     min="1" max="20000" placeholder="1-20000" style="width:200px !important; flex:none !important;"
                     title="路由抖动抑制开始抑制时间 (1-20000)" />
            </div>
            <div class="form-row">
              <label class="form-label">Dampening Max Suppress</label>
              <input type="number" class="form-control" v-model="config.parameters.dampening['max-suppress-time']"
                     min="1" max="20000" placeholder="1-20000" style="width:200px !important; flex:none !important;"
                     title="路由抖动抑制最大抑制时间 (1-20000)" />
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters.dampening.enable" /> 启用路由抖动抑制</label>
            </div>
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.parameters['graceful-restart'].enable" /> 启用优雅重启</label>
            </div>
            <div class="form-row">
              <label class="form-label">优雅重启时间</label>
              <input type="number" class="form-control" v-model="config.parameters['graceful-restart'].restart"
                     min="1" max="4095" placeholder="1-4095 秒" style="width:200px !important; flex:none !important;"
                     title="优雅重启时间 (1-4095 秒)" />
            </div>
            <div class="form-row">
              <label class="form-label">陈旧路径时间</label>
              <input type="number" class="form-control" v-model="config.parameters['graceful-restart'].stalepath"
                     min="1" max="4095" placeholder="1-4095 秒" style="width:200px !important; flex:none !important;"
                     title="陈旧路径保留时间 (1-4095 秒)" />
            </div>
              </div>
            </div>
          </div>
        </template>

        <template #address-family>
          <TabGroup v-model="activeAfTab" :tabs="[
            { key: 'ipv4-flowspec', title: 'IPv4 Flowspec' },
            { key: 'ipv4-labeled-unicast', title: 'IPv4 标签单播' },
            { key: 'ipv4-multicast', title: 'IPv4 组播' },
            { key: 'ipv4-unicast', title: 'IPv4 单播' },
            { key: 'ipv4-vpn', title: 'IPv4 VPN' },
            { key: 'ipv6-flowspec', title: 'IPv6 Flowspec' },
            { key: 'ipv6-labeled-unicast', title: 'IPv6 标签单播' },
            { key: 'ipv6-multicast', title: 'IPv6 组播' },
            { key: 'ipv6-unicast', title: 'IPv6 单播' },
            { key: 'ipv6-vpn', title: 'IPv6 VPN' },
            { key: 'l2vpn-evpn', title: 'L2VPN EVPN' }
          ]">
            <template #ipv4-flowspec>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">本地安装 (Local Install)</div>
                  <div style="padding:16px;">
                    <div class="form-row">
                      <label class="form-label">接口</label>
                      <select class="form-control" v-model="config['address-family']['ipv4-flowspec']['local-install'].interface" style="width:300px;">
                        <option value="">-- 请选择 --</option>
                        <option value="eth0">eth0</option>
                        <option value="eth1">eth1</option>
                        <option value="eth1.10">eth1.10</option>
                        <option value="eth1.20">eth1.20</option>
                        <option value="eth1.20.30">eth1.20.30</option>
                        <option value="lo">lo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #ipv4-labeled-unicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4LabeledUnicastNetworkColumns" :data="config['address-family']['ipv4-labeled-unicast'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv4LabeledUnicast" @edit="editNetworkIpv4LabeledUnicast" @delete="deleteNetworksIpv4LabeledUnicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4LabeledUnicastAggregateColumns" :data="config['address-family']['ipv4-labeled-unicast'].aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createAggregateIpv4LabeledUnicast" @edit="editAggregateIpv4LabeledUnicast" @delete="deleteAggregatesIpv4LabeledUnicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">最大路径数</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 最大路径数</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv4-labeled-unicast'].maxPaths.ebgp"
                         min="1" max="256" placeholder="1-256" style="width:200px !important; flex:none !important;" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 最大路径数</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv4-labeled-unicast'].maxPaths.ibgp"
                         min="1" max="256" placeholder="1-256" style="width:200px !important; flex:none !important;" />
                </div>
                  </div>
                </div>
              </div>
            </template>

            <template #ipv4-multicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4MulticastNetworkColumns" :data="config['address-family']['ipv4-multicast'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv4Multicast" @edit="editNetworkIpv4Multicast" @delete="deleteNetworksIpv4Multicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4MulticastAggregateColumns" :data="config['address-family']['ipv4-multicast'].aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createAggregateIpv4Multicast" @edit="editAggregateIpv4Multicast" @delete="deleteAggregatesIpv4Multicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv4-multicast'].distance.external"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="eBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv4-multicast'].distance.internal"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="iBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">本地距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv4-multicast'].distance.local"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="本地 BGP 路由管理距离 (1-255)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">前缀管理距离</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4MulticastDistancePrefixColumns" :data="config['address-family']['ipv4-multicast'].distancePrefixes" :loading="loading" :disabled="writeDisabled"
                           rowKey="prefix" :actions="['create', 'edit', 'delete']"
                           @create="createDistancePrefixIpv4Multicast" @edit="editDistancePrefixIpv4Multicast" @delete="deleteDistancePrefixesIpv4Multicast" />
                  </div>
                </div>
              </div>
            </template>

            <template #ipv4-unicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="networkColumns" :data="config.networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetwork" @edit="editNetwork" @delete="deleteNetworks" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="aggregateColumns" :data="config.aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createAggregate" @edit="editAggregate" @delete="deleteAggregates" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">重分发</div>
                  <div style="padding:16px;">
                <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                           rowKey="protocol" :actions="['create', 'edit', 'delete']"
                           @create="createRedistribute" @edit="editRedistribute" @delete="deleteRedistributes" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 距离</label>
                  <input type="number" class="form-control" v-model="config.distance.external"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="eBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 距离</label>
                  <input type="number" class="form-control" v-model="config.distance.internal"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="iBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">本地距离</label>
                  <input type="number" class="form-control" v-model="config.distance.local"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="本地 BGP 路由管理距离 (1-255)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">最大路径数</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 最大路径</label>
                  <input type="number" class="form-control" v-model="config.maxPaths.ebgp"
                         min="1" max="64" placeholder="1-64" style="width:200px !important; flex:none !important;"
                         title="eBGP 最大路径数 (1-64)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 最大路径</label>
                  <input type="number" class="form-control" v-model="config.maxPaths.ibgp"
                         min="1" max="64" placeholder="1-64" style="width:200px !important; flex:none !important;"
                         title="iBGP 最大路径数 (1-64)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">VPN 导出/导入</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config.exportConfig.vpn" /> 导出到 VPN</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config.importConfig.vpn" /> 从 VPN 导入</label>
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">标签配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 标签导出</label>
                  <input type="text" class="form-control" v-model="config.labelConfig.vpn.export"
                         placeholder="标签值" style="width:200px !important; flex:none !important;"
                         title="VPN 标签导出值" />
                </div>
                <div class="form-row">
                  <label class="form-label">标签分配模式</label>
                  <select class="form-control" v-model="config.labelConfig.vpn['allocation-mode']" style="width:200px !important; flex:none !important;">
                    <option value="">-- 选择 --</option>
                    <option value="per-nexthop">per-nexthop</option>
                  </select>
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">下一跳配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 下一跳导出</label>
                  <input type="text" class="form-control" v-model="config.nexthopConfig.vpn.export"
                         placeholder="下一跳地址" style="width:200px !important; flex:none !important;"
                         title="VPN 下一跳导出地址" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由区分器 (RD)</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN RD 导出</label>
                  <input type="text" class="form-control" v-model="config.rdConfig.vpn.export"
                         placeholder="路由区分器" style="width:200px !important; flex:none !important;"
                         title="VPN 路由区分器导出值" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由映射</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 导出路由映射</label>
                  <input type="text" class="form-control" v-model="config.routeMapConfig.vpn.export"
                         placeholder="路由映射名称" style="width:200px !important; flex:none !important;"
                         title="VPN 导出路由映射名称" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导入路由映射</label>
                  <input type="text" class="form-control" v-model="config.routeMapConfig.vpn.import"
                         placeholder="路由映射名称" style="width:200px !important; flex:none !important;"
                         title="VPN 导入路由映射名称" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由目标</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 双向路由目标</label>
                  <input type="text" class="form-control" v-model="config.routeTargetConfig.vpn.both"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 双向路由目标（导入和导出）" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导出路由目标</label>
                  <input type="text" class="form-control" v-model="config.routeTargetConfig.vpn.export"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 导出路由目标" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导入路由目标</label>
                  <input type="text" class="form-control" v-model="config.routeTargetConfig.vpn.import"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 导入路由目标" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">SID 配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN SID 导出</label>
                  <input type="text" class="form-control" v-model="config.sidConfig.vpn.export"
                         placeholder="SID 值" style="width:200px !important; flex:none !important;"
                         title="VPN SID 导出值" />
                </div>
                  </div>
                </div>
              </div>
            </template>

            <template #ipv4-vpn>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv4VpnNetworkColumns" :data="config['address-family']['ipv4-vpn'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv4Vpn" @edit="editNetworkIpv4Vpn" @delete="deleteNetworksIpv4Vpn" />
                  </div>
                </div>
              </div>
            </template>

            <template #ipv6-flowspec>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">本地安装接口</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">接口</label>
                  <select class="form-control" v-model="config['address-family']['ipv6-flowspec']['local-install'].interface" style="width:200px !important; flex:none !important;">
                    <option value="">-- 选择 --</option>
                    <option value="eth1">eth1</option>
                    <option value="eth1.10">eth1.10</option>
                    <option value="eth1.20">eth1.20</option>
                    <option value="eth1.20.30">eth1.20.30</option>
                    <option value="lo">lo</option>
                  </select>
                </div>
                  </div>
                </div>
              </div>
            </template>

            <template #ipv6-labeled-unicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6LabeledUnicastNetworkColumns" :data="config['address-family']['ipv6-labeled-unicast'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv6LabeledUnicast" @edit="editNetworkIpv6LabeledUnicast" @delete="deleteNetworksIpv6LabeledUnicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6LabeledUnicastAggregateColumns" :data="config['address-family']['ipv6-labeled-unicast'].aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createAggregateIpv6LabeledUnicast" @edit="editAggregateIpv6LabeledUnicast" @delete="deleteAggregatesIpv6LabeledUnicast" />
                  </div>
                </div>
              </div>
            </template>

            <template #ipv6-multicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6MulticastNetworkColumns" :data="config['address-family']['ipv6-multicast'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv6Multicast" @edit="editNetworkIpv6Multicast" @delete="deleteNetworksIpv6Multicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6MulticastAggregateColumns" :data="config['address-family']['ipv6-multicast'].aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createAggregateIpv6Multicast" @edit="editAggregateIpv6Multicast" @delete="deleteAggregatesIpv6Multicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv6-multicast'].distance.external"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="eBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv6-multicast'].distance.internal"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="iBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">本地距离</label>
                  <input type="number" class="form-control" v-model="config['address-family']['ipv6-multicast'].distance.local"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="本地 BGP 路由管理距离 (1-255)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">前缀管理距离</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6MulticastDistancePrefixColumns" :data="config['address-family']['ipv6-multicast'].distancePrefixes" :loading="loading" :disabled="writeDisabled"
                           rowKey="prefix" :actions="['create', 'edit', 'delete']"
                           @create="createDistancePrefixIpv6Multicast" @edit="editDistancePrefixIpv6Multicast" @delete="deleteDistancePrefixesIpv6Multicast" />
                  </div>
                </div>
              </div>
            </template>
            <template #ipv6-unicast>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">IPv6 网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6NetworkColumns" :data="config.ipv6Networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createIpv6Network" @edit="editIpv6Network" @delete="deleteIpv6Networks" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">IPv6 聚合地址</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6AggregateColumns" :data="config.ipv6Aggregates" :loading="loading" :disabled="writeDisabled"
                           rowKey="aggregate" :actions="['create', 'edit', 'delete']"
                           @create="createIpv6Aggregate" @edit="editIpv6Aggregate" @delete="deleteIpv6Aggregates" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">IPv6 重分发</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6RedistributeColumns" :data="config.ipv6Redistributes" :loading="loading" :disabled="writeDisabled"
                           rowKey="protocol" :actions="['create', 'edit', 'delete']"
                           @create="createIpv6Redistribute" @edit="editIpv6Redistribute" @delete="deleteIpv6Redistributes" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 距离</label>
                  <input type="number" class="form-control" v-model="config.ipv6Distance.external"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="eBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 距离</label>
                  <input type="number" class="form-control" v-model="config.ipv6Distance.internal"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="iBGP 路由管理距离 (1-255)" />
                </div>
                <div class="form-row">
                  <label class="form-label">本地距离</label>
                  <input type="number" class="form-control" v-model="config.ipv6Distance.local"
                         min="1" max="255" placeholder="1-255" style="width:200px !important; flex:none !important;"
                         title="本地 BGP 路由管理距离 (1-255)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">最大路径数</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">eBGP 最大路径</label>
                  <input type="number" class="form-control" v-model="config.ipv6MaxPaths.ebgp"
                         min="1" max="256" placeholder="1-256" style="width:200px !important; flex:none !important;"
                         title="eBGP 最大路径数 (1-256)" />
                </div>
                <div class="form-row">
                  <label class="form-label">iBGP 最大路径</label>
                  <input type="number" class="form-control" v-model="config.ipv6MaxPaths.ibgp"
                         min="1" max="256" placeholder="1-256" style="width:200px !important; flex:none !important;"
                         title="iBGP 最大路径数 (1-256)" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">前缀管理距离</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6DistancePrefixColumns" :data="config.ipv6DistancePrefixes" :loading="loading" :disabled="writeDisabled"
                           rowKey="prefix" :actions="['create', 'edit', 'delete']"
                           @create="createDistancePrefixIpv6Unicast" @edit="editDistancePrefixIpv6Unicast" @delete="deleteDistancePrefixesIpv6Unicast" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">VPN 导出/导入</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config.ipv6ExportConfig.vpn" /> 导出到 VPN</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config.ipv6ImportConfig.vpn" /> 从 VPN 导入</label>
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">标签配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 标签导出</label>
                  <input type="text" class="form-control" v-model="config.ipv6LabelConfig.vpn.export"
                         placeholder="标签值" style="width:200px !important; flex:none !important;"
                         title="VPN 标签导出值" />
                </div>
                <div class="form-row">
                  <label class="form-label">标签分配模式</label>
                  <select class="form-control" v-model="config.ipv6LabelConfig.vpn['allocation-mode']" style="width:200px !important; flex:none !important;">
                    <option value="">-- 选择 --</option>
                    <option value="per-nexthop">per-nexthop</option>
                  </select>
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">下一跳配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 下一跳导出</label>
                  <input type="text" class="form-control" v-model="config.ipv6NexthopConfig.vpn.export"
                         placeholder="下一跳地址" style="width:200px !important; flex:none !important;"
                         title="VPN 下一跳导出地址" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由区分器 (RD)</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN RD 导出</label>
                  <input type="text" class="form-control" v-model="config.ipv6RdConfig.vpn.export"
                         placeholder="路由区分器" style="width:200px !important; flex:none !important;"
                         title="VPN 路由区分器导出值" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由映射</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 导出路由映射</label>
                  <input type="text" class="form-control" v-model="config.ipv6RouteMapConfig.vpn.export"
                         placeholder="路由映射名称" style="width:200px !important; flex:none !important;"
                         title="VPN 导出路由映射名称" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导入路由映射</label>
                  <input type="text" class="form-control" v-model="config.ipv6RouteMapConfig.vpn.import"
                         placeholder="路由映射名称" style="width:200px !important; flex:none !important;"
                         title="VPN 导入路由映射名称" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">路由目标</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN 双向路由目标</label>
                  <input type="text" class="form-control" v-model="config.ipv6RouteTargetConfig.vpn.both"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 双向路由目标（导入和导出）" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导出路由目标</label>
                  <input type="text" class="form-control" v-model="config.ipv6RouteTargetConfig.vpn.export"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 导出路由目标" />
                </div>
                <div class="form-row">
                  <label class="form-label">VPN 导入路由目标</label>
                  <input type="text" class="form-control" v-model="config.ipv6RouteTargetConfig.vpn.import"
                         placeholder="路由目标" style="width:200px !important; flex:none !important;"
                         title="VPN 导入路由目标" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">SID 配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">VPN SID 导出</label>
                  <input type="text" class="form-control" v-model="config.ipv6SidConfig.vpn.export"
                         placeholder="SID 值" style="width:200px !important; flex:none !important;"
                         title="VPN SID 导出值" />
                </div>
                  </div>
                </div>
              </div>
            </template>

            <template #ipv6-vpn>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">网络</div>
                  <div style="padding:16px;">
                <DataTable :columns="ipv6VpnNetworkColumns" :data="config['address-family']['ipv6-vpn'].networks" :loading="loading" :disabled="writeDisabled"
                           rowKey="network" :actions="['create', 'edit', 'delete']"
                           @create="createNetworkIpv6Vpn" @edit="editNetworkIpv6Vpn" @delete="deleteNetworksIpv6Vpn" />
                  </div>
                </div>
              </div>
            </template>

            <template #l2vpn-evpn>
              <div style="padding:16px;">
                <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本设置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['advertise-pip']" /> 通告 PIP (advertise-pip)</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['advertise-svi-ip']" /> 通告 SVI IP (advertise-svi-ip)</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['disable-ead-evi-rx']" /> 禁用 EAD EVI 接收 (disable-ead-evi-rx)</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['disable-ead-evi-tx']" /> 禁用 EAD EVI 发送 (disable-ead-evi-tx)</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['rt-auto-derive']" /> 自动推导 RT (rt-auto-derive)</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['flooding']" /> 禁用泛洪 (flooding disable)</label>
                </div>
                <div class="form-row">
                  <label class="form-label">Route Distinguisher (RD)</label>
                  <input type="text" class="form-control" v-model="config['address-family']['l2vpn-evpn'].rd"
                         placeholder="例如: 1:1 或 1.1.1.1:100" style="width:300px;" />
                </div>
                <div class="form-row">
                  <label class="form-label">MAC VRF SOO</label>
                  <input type="text" class="form-control" v-model="config['address-family']['l2vpn-evpn']['mac-vrf'].soo"
                         placeholder="例如: 1:1 或 1.1.1.1:100" style="width:300px;" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">EAD-ES 配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">EAD-ES Route Target Export</label>
                  <input type="text" class="form-control" v-model="config['address-family']['l2vpn-evpn']['ead-es-route-target'].export"
                         placeholder="Route Target" style="width:300px;" />
                </div>
                <div class="form-row">
                  <label class="form-label">EAD-ES Frag EVI Limit</label>
                  <input type="number" class="form-control" v-model="config['address-family']['l2vpn-evpn']['ead-es-frag-evi-limit']"
                         min="1" max="65535" placeholder="1-65535" style="width:200px !important; flex:none !important;" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">Advertise 配置</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn'].advertise['ipv4-unicast'].enable" /> 通告 IPv4 Unicast</label>
                </div>
                <div v-if="config['address-family']['l2vpn-evpn'].advertise['ipv4-unicast'].enable" class="form-row">
                  <label class="form-label">IPv4 Unicast Route-Map</label>
                  <input type="text" class="form-control" v-model="config['address-family']['l2vpn-evpn'].advertise['ipv4-unicast']['route-map']"
                         placeholder="Route-map 名称" style="width:300px;" />
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn'].advertise['ipv6-unicast'].enable" /> 通告 IPv6 Unicast</label>
                </div>
                <div v-if="config['address-family']['l2vpn-evpn'].advertise['ipv6-unicast'].enable" class="form-row">
                  <label class="form-label">IPv6 Unicast Route-Map</label>
                  <input type="text" class="form-control" v-model="config['address-family']['l2vpn-evpn'].advertise['ipv6-unicast']['route-map']"
                         placeholder="Route-map 名称" style="width:300px;" />
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">Default Originate</div>
                  <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['default-originate'].ipv4" /> IPv4 Default Originate</label>
                </div>
                <div class="form-row">
                  <label class="form-label"></label>
                  <label><input type="checkbox" v-model="config['address-family']['l2vpn-evpn']['default-originate'].ipv6" /> IPv6 Default Originate</label>
                </div>
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">Route Target</div>
                  <div style="padding:16px;">
                <DataTable :columns="evpnRtColumns" :data="config['address-family']['l2vpn-evpn']['route-targets']" :loading="loading" :disabled="writeDisabled"
                           rowKey="key" :actions="['create', 'edit', 'delete']"
                           @create="createEvpnRt" @edit="editEvpnRt" @delete="deleteEvpnRts" />
                  </div>
                </div>

                <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
                  <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">VNI</div>
                  <div style="padding:16px;">
                <DataTable :columns="evpnVniColumns" :data="config['address-family']['l2vpn-evpn'].vnis" :loading="loading" :disabled="writeDisabled"
                           rowKey="vni" :actions="['create', 'edit', 'delete']"
                           @create="createEvpnVni" @edit="editEvpnVni" @delete="deleteEvpnVnis">
                  <template #cell-route-targets="{ row }">
                    <span>{{ (row['route-targets'] || []).length }} 个 RT</span>
                    <button class="btn btn-sm btn-link" @click.stop="openVniRtManager(row)" style="margin-left:8px;">管理</button>
                  </template>
                </DataTable>
                  </div>
                </div>
              </div>
            </template>
          </TabGroup>
        </template>

        <template #sid>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label"></label>
              <label><input type="checkbox" v-model="config.sid.vpn" /> 启用 VPN SID (当前 VRF 与 VPN 之间)</label>
            </div>
          </div>
        </template>

        <template #srv6>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">SRv6 Locator</label>
              <input type="text" class="form-control" v-model="config.srv6.locator"
                     placeholder="例如: MYLOCATOR" style="width:300px;"
                     title="SRv6 Locator 名称" />
            </div>
          </div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Neighbor Modal -->
      <DraggableModal v-model:visible="neighborModalVisible" :title="editingNeighborIndex >= 0 ? '编辑 BGP 邻居' : '添加 BGP 邻居'" width="600px" @confirm="saveNeighbor">
        <div class="form-row">
          <label class="form-label">邻居地址 *</label>
          <input type="text" class="form-control" v-model="neighborForm.address"
                 placeholder="IPv4 或 IPv6 地址" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">远程 ASN</label>
          <input type="number" class="form-control" v-model="neighborForm['remote-as']"
                 min="1" max="4294967294" placeholder="1-4294967294" style="width:100%;"
                 title="邻居 AS 号 (1-4294967294)" />
        </div>
        <div class="form-row">
          <label class="form-label">描述</label>
          <input type="text" class="form-control" v-model="neighborForm.description"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">Peer Group</label>
          <input type="text" class="form-control" v-model="neighborForm['peer-group']"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">本地角色</label>
          <select class="form-control" v-model="neighborForm['local-role']" style="width:100%;">
            <option v-for="opt in LOCAL_ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">EBGP 多跳</label>
          <input type="number" class="form-control" v-model="neighborForm['ebgp-multihop']"
                 min="1" max="255" placeholder="1-255" style="width:100%;"
                 title="EBGP 多跳数 (1-255)" />
        </div>
        <div class="form-row">
          <label class="form-label">广告间隔</label>
          <input type="number" class="form-control" v-model="neighborForm['advertisement-interval']"
                 min="0" max="600" placeholder="0-600 秒" style="width:100%;"
                 title="最小路由更新广告间隔 (0-600 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">更新源</label>
          <input type="text" class="form-control" v-model="neighborForm['update-source']"
                 placeholder="接口名或 IP 地址" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">端口</label>
          <input type="number" class="form-control" v-model="neighborForm.port"
                 min="1" max="65535" placeholder="1-65535" style="width:100%;"
                 title="BGP 端口 (1-65535)" />
        </div>
        <div class="form-row">
          <label class="form-label">本地 ASN</label>
          <input type="number" class="form-control" v-model="neighborForm['local-as']"
                 min="1" max="4294967294" placeholder="1-4294967294" style="width:100%;"
                 title="本地 AS 号 (1-4294967294)" />
        </div>
        <div class="form-row">
          <label class="form-label">密码</label>
          <input type="password" class="form-control" v-model="neighborForm.password"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">连接定时器</label>
          <input type="number" class="form-control" v-model="neighborForm.timers.connect"
                 min="0" max="65535" placeholder="0=禁用, 1-65535 秒" style="width:100%;"
                 title="BGP 连接定时器 (0=禁用, 1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">保持定时器</label>
          <input type="number" class="form-control" v-model="neighborForm.timers.holdtime"
                 min="0" max="65535" placeholder="0=禁用, 1-65535 秒" style="width:100%;"
                 title="BGP 保持定时器 (0=禁用, 1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">Keepalive 定时器</label>
          <input type="number" class="form-control" v-model="neighborForm.timers.keepalive"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="BGP Keepalive 定时器 (1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">TTL 安全跳数</label>
          <input type="number" class="form-control" v-model="neighborForm['ttl-security'].hops"
                 min="1" max="254" placeholder="1-254" style="width:100%;"
                 title="TTL 安全机制最大跳数 (1-254)" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm.shutdown" /> 关闭 (Shutdown)</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm.passive" /> 被动模式 (Passive)</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm['enforce-first-as']" /> 强制首 AS (Enforce First AS)</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm['override-capability']" /> 覆盖能力协商</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm['disable-connected-check']" /> 禁用直连检查</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm['disable-capability-negotiation']" /> 禁用能力协商</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm['graceful-restart'].enable" /> 优雅重启 (Graceful Restart)</label>
        </div>
        <div v-if="neighborForm['graceful-restart'].enable">
          <div class="form-row">
            <label class="form-label">优雅重启时间</label>
            <input type="number" class="form-control" v-model="neighborForm['graceful-restart']['restart-time']"
                   min="1" max="4095" placeholder="1-4095 秒" style="width:100%;"
                   title="优雅重启时间 (1-4095 秒)" />
          </div>
          <div class="form-row">
            <label class="form-label">陈旧路径时间</label>
            <input type="number" class="form-control" v-model="neighborForm['graceful-restart']['stalepath-time']"
                   min="1" max="4095" placeholder="1-4095 秒" style="width:100%;"
                   title="陈旧路径保留时间 (1-4095 秒)" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <label><input type="checkbox" v-model="neighborForm['graceful-restart']['preserve-fw-state']" /> 保留防火墙状态</label>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="neighborForm.bfd.enable" /> 启用 BFD</label>
        </div>
        <div v-if="neighborForm.bfd.enable">
          <div class="form-row">
            <label class="form-label"></label>
            <label><input type="checkbox" v-model="neighborForm.bfd['check-control-plane-failure']" /> 检查控制平面故障</label>
          </div>
          <div class="form-row">
            <label class="form-label">BFD Profile</label>
            <input type="text" class="form-control" v-model="neighborForm.bfd.profile"
                   placeholder="BFD 配置文件名称" style="width:100%;" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">能力协商</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="neighborForm.capability.dynamic" /> 动态能力</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="neighborForm.capability['extended-nexthop']" /> 扩展下一跳</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="neighborForm.capability['software-version']" /> 软件版本</label>
        </div>
        <div class="form-row">
          <label class="form-label">路径属性</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">丢弃</label>
          <input type="text" class="form-control" v-model="neighborForm['path-attribute'].discard"
                 placeholder="逗号分隔的属性列表" style="width:100%;" />
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">视为撤回</label>
          <input type="text" class="form-control" v-model="neighborForm['path-attribute']['treat-as-withdraw']"
                 placeholder="逗号分隔的属性列表" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Peer Group Modal -->
      <DraggableModal v-model:visible="peerGroupModalVisible" :title="editingPeerGroupIndex >= 0 ? '编辑 Peer Group' : '添加 Peer Group'" width="600px" @confirm="savePeerGroup">
        <div class="form-row">
          <label class="form-label">名称 *</label>
          <input type="text" class="form-control" v-model="peerGroupForm.name"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">远程 ASN</label>
          <input type="number" class="form-control" v-model="peerGroupForm['remote-as']"
                 min="1" max="4294967294" placeholder="1-4294967294" style="width:100%;"
                 title="邻居 AS 号 (1-4294967294)" />
        </div>
        <div class="form-row">
          <label class="form-label">描述</label>
          <input type="text" class="form-control" v-model="peerGroupForm.description"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">本地角色</label>
          <select class="form-control" v-model="peerGroupForm['local-role']" style="width:100%;">
            <option v-for="opt in LOCAL_ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">EBGP 多跳</label>
          <input type="number" class="form-control" v-model="peerGroupForm['ebgp-multihop']"
                 min="1" max="255" placeholder="1-255" style="width:100%;"
                 title="EBGP 多跳数 (1-255)" />
        </div>
        <div class="form-row">
          <label class="form-label">广告间隔</label>
          <input type="number" class="form-control" v-model="peerGroupForm['advertisement-interval']"
                 min="0" max="600" placeholder="0-600 秒" style="width:100%;"
                 title="最小路由更新广告间隔 (0-600 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">端口</label>
          <input type="number" class="form-control" v-model="peerGroupForm.port"
                 min="1" max="65535" placeholder="1-65535" style="width:100%;"
                 title="BGP 端口 (1-65535)" />
        </div>
        <div class="form-row">
          <label class="form-label">本地 ASN</label>
          <input type="number" class="form-control" v-model="peerGroupForm['local-as']"
                 min="1" max="4294967294" placeholder="1-4294967294" style="width:100%;"
                 title="本地 AS 号 (1-4294967294)" />
        </div>
        <div class="form-row">
          <label class="form-label">密码</label>
          <input type="password" class="form-control" v-model="peerGroupForm.password"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">连接定时器</label>
          <input type="number" class="form-control" v-model="peerGroupForm.timers.connect"
                 min="0" max="65535" placeholder="0=禁用, 1-65535 秒" style="width:100%;"
                 title="BGP 连接定时器 (0=禁用, 1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">保持定时器</label>
          <input type="number" class="form-control" v-model="peerGroupForm.timers.holdtime"
                 min="0" max="65535" placeholder="0=禁用, 1-65535 秒" style="width:100%;"
                 title="BGP 保持定时器 (0=禁用, 1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">Keepalive 定时器</label>
          <input type="number" class="form-control" v-model="peerGroupForm.timers.keepalive"
                 min="1" max="65535" placeholder="1-65535 秒" style="width:100%;"
                 title="BGP Keepalive 定时器 (1-65535 秒)" />
        </div>
        <div class="form-row">
          <label class="form-label">TTL 安全跳数</label>
          <input type="number" class="form-control" v-model="peerGroupForm['ttl-security'].hops"
                 min="1" max="254" placeholder="1-254" style="width:100%;"
                 title="TTL 安全机制最大跳数 (1-254)" />
        </div>
        <div class="form-row">
          <label class="form-label">更新源接口</label>
          <input type="text" class="form-control" v-model="peerGroupForm['update-source']"
                 placeholder="例如: eth0" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm.shutdown" /> 关闭 (Shutdown)</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm['enforce-first-as']" /> 强制首 AS</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm['override-capability']" /> 覆盖能力协商</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm['disable-connected-check']" /> 禁用直连检查</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm['disable-capability-negotiation']" /> 禁用能力协商</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm['graceful-restart'].enable" /> 优雅重启 (Graceful Restart)</label>
        </div>
        <div v-if="peerGroupForm['graceful-restart'].enable">
          <div class="form-row">
            <label class="form-label">优雅重启时间</label>
            <input type="number" class="form-control" v-model="peerGroupForm['graceful-restart']['restart-time']"
                   min="1" max="4095" placeholder="1-4095 秒" style="width:100%;"
                   title="优雅重启时间 (1-4095 秒)" />
          </div>
          <div class="form-row">
            <label class="form-label">陈旧路径时间</label>
            <input type="number" class="form-control" v-model="peerGroupForm['graceful-restart']['stalepath-time']"
                   min="1" max="4095" placeholder="1-4095 秒" style="width:100%;"
                   title="陈旧路径保留时间 (1-4095 秒)" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <label><input type="checkbox" v-model="peerGroupForm['graceful-restart']['preserve-fw-state']" /> 保留防火墙状态</label>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="peerGroupForm.bfd.enable" /> 启用 BFD</label>
        </div>
        <div v-if="peerGroupForm.bfd.enable">
          <div class="form-row">
            <label class="form-label"></label>
            <label><input type="checkbox" v-model="peerGroupForm.bfd['check-control-plane-failure']" /> 检查控制平面故障</label>
          </div>
          <div class="form-row">
            <label class="form-label">BFD Profile</label>
            <input type="text" class="form-control" v-model="peerGroupForm.bfd.profile"
                   placeholder="BFD 配置文件名称" style="width:100%;" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">能力协商</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="peerGroupForm.capability.dynamic" /> 动态能力</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="peerGroupForm.capability['extended-nexthop']" /> 扩展下一跳</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label><input type="checkbox" v-model="peerGroupForm.capability['software-version']" /> 软件版本</label>
        </div>
        <div class="form-row">
          <label class="form-label">路径属性</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">丢弃</label>
          <input type="text" class="form-control" v-model="peerGroupForm['path-attribute'].discard"
                 placeholder="逗号分隔的属性列表" style="width:100%;" />
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">视为撤回</label>
          <input type="text" class="form-control" v-model="peerGroupForm['path-attribute']['treat-as-withdraw']"
                 placeholder="逗号分隔的属性列表" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- BMP Modal -->
      <DraggableModal v-model:visible="bmpModalVisible" :title="editingBmpIndex >= 0 ? '编辑 BMP 目标' : '添加 BMP 目标'" width="500px" @confirm="saveBmp">
        <div class="form-row">
          <label class="form-label">名称 *</label>
          <input type="text" class="form-control" v-model="bmpForm.name"
                 style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">地址</label>
          <input type="text" class="form-control" v-model="bmpForm.address"
                 placeholder="IPv4 或 IPv6 地址" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">端口</label>
          <input type="number" class="form-control" v-model="bmpForm.port"
                 min="1" max="65535" placeholder="1-65535 (默认: 5000)" style="width:100%;"
                 title="BMP 连接端口 (1-65535, 默认: 5000)" />
        </div>
        <div class="form-row">
          <label class="form-label">最大重试间隔 (ms)</label>
          <input type="number" class="form-control" v-model="bmpForm['max-retry']"
                 min="100" max="4294967295" placeholder="100-4294967295 (默认: 2000)" style="width:100%;"
                 title="最大连接重试间隔 (100-4294967295 ms, 默认: 2000)" />
        </div>
        <div class="form-row">
          <label class="form-label">最小重试间隔 (ms)</label>
          <input type="number" class="form-control" v-model="bmpForm['min-retry']"
                 min="1" placeholder="正整数 (默认: 1000)" style="width:100%;"
                 title="最小连接重试间隔 (毫秒, 默认: 1000)" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="bmpForm.mirror" /> 启用镜像 (Mirror)</label>
        </div>
        <div class="form-row">
          <label class="form-label">监控配置</label>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">IPv4 Unicast</label>
          <div style="display: flex; gap: 20px;">
            <label><input type="checkbox" v-model="bmpForm.monitor['ipv4-unicast']['post-policy']" /> Post-Policy</label>
            <label><input type="checkbox" v-model="bmpForm.monitor['ipv4-unicast']['pre-policy']" /> Pre-Policy</label>
          </div>
        </div>
        <div class="form-row" style="padding-left: 20px;">
          <label class="form-label">IPv6 Unicast</label>
          <div style="display: flex; gap: 20px;">
            <label><input type="checkbox" v-model="bmpForm.monitor['ipv6-unicast']['post-policy']" /> Post-Policy</label>
            <label><input type="checkbox" v-model="bmpForm.monitor['ipv6-unicast']['pre-policy']" /> Pre-Policy</label>
          </div>
        </div>
      </DraggableModal>

      <!-- Listen Modal -->
      <DraggableModal v-model:visible="listenModalVisible" :title="editingListenIndex >= 0 ? '编辑监听范围' : '添加监听范围'" width="500px" @confirm="saveListen">
        <div class="form-row">
          <label class="form-label">范围 *</label>
          <input type="text" class="form-control" v-model="listenForm.range"
                 placeholder="例如: 3.3.3.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">Peer Group</label>
          <input type="text" class="form-control" v-model="listenForm['peer-group']"
                 style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Network Modal -->
      <DraggableModal v-model:visible="networkModalVisible" :title="editingNetworkIndex >= 0 ? '编辑网络' : '添加网络'" width="500px" @confirm="saveNetwork">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="networkForm.network"
                 placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="networkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="networkForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Aggregate Modal -->
      <DraggableModal v-model:visible="aggregateModalVisible" :title="editingAggregateIndex >= 0 ? '编辑聚合' : '添加聚合'" width="500px" @confirm="saveAggregate">
        <div class="form-row">
          <label class="form-label">聚合网络 *</label>
          <input type="text" class="form-control" v-model="aggregateForm.aggregate"
                 placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="aggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="aggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="aggregateForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑接口' : '添加接口'" width="500px" @confirm="saveInterface">
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
          <label class="form-label">启用 MPLS 转发</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['mpls-forwarding']" /></label>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;">
            <option v-for="opt in REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 title="重分发路由的度量值 (0-16777214)" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Network Modal -->
      <DraggableModal v-model:visible="ipv6NetworkModalVisible" :title="editingIpv6NetworkIndex >= 0 ? '编辑 IPv6 网络' : '添加 IPv6 网络'" width="500px" @confirm="saveIpv6Network">
        <div class="form-row">
          <label class="form-label">IPv6 网络 *</label>
          <input type="text" class="form-control" v-model="ipv6NetworkForm.network"
                 placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路径限制 (0-255)</label>
          <input type="number" class="form-control" v-model="ipv6NetworkForm['path-limit']"
                 min="0" max="255" placeholder="0-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6NetworkForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Aggregate Modal -->
      <DraggableModal v-model:visible="ipv6AggregateModalVisible" :title="editingIpv6AggregateIndex >= 0 ? '编辑 IPv6 聚合' : '添加 IPv6 聚合'" width="500px" @confirm="saveIpv6Aggregate">
        <div class="form-row">
          <label class="form-label">IPv6 聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv6AggregateForm.aggregate"
                 placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6AggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6AggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6AggregateForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Redistribute Modal -->
      <DraggableModal v-model:visible="ipv6RedistributeModalVisible" :title="editingIpv6RedistributeIndex >= 0 ? '编辑 IPv6 重分发' : '添加 IPv6 重分发'" width="500px" @confirm="saveIpv6Redistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv6RedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in IPV6_REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv6RedistributeForm.metric"
                 min="0" max="16777214" placeholder="0-16777214" style="width:100%;"
                 title="重分发路由的度量值 (0-16777214)" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6RedistributeForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Distance Prefix Modal -->
      <DraggableModal v-model:visible="ipv6DistancePrefixModalVisible" :title="editingIpv6DistancePrefixIndex >= 0 ? '编辑前缀管理距离' : '添加前缀管理距离'" width="500px" @confirm="saveDistancePrefixIpv6Unicast">
        <div class="form-row">
          <label class="form-label">前缀 *</label>
          <input type="text" class="form-control" v-model="ipv6DistancePrefixForm.prefix" placeholder="例如: 2002::00/64" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">管理距离 * (1-255)</label>
          <input type="number" class="form-control" v-model="ipv6DistancePrefixForm.distance" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv4 Flowspec Modals -->
      <DraggableModal v-model:visible="ipv4FlowspecNetworkModalVisible" :title="editingIpv4FlowspecNetworkIndex >= 0 ? '编辑网络' : '添加网络'" width="500px" @confirm="saveNetworkIpv4Flowspec">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="ipv4FlowspecNetworkForm.network" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4FlowspecNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4FlowspecNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4FlowspecAggregateModalVisible" :title="editingIpv4FlowspecAggregateIndex >= 0 ? '编辑聚合' : '添加聚合'" width="500px" @confirm="saveAggregateIpv4Flowspec">
        <div class="form-row">
          <label class="form-label">聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv4FlowspecAggregateForm.aggregate" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4FlowspecAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4FlowspecAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4FlowspecAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4FlowspecRedistributeModalVisible" :title="editingIpv4FlowspecRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistributeIpv4Flowspec">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv4FlowspecRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv4FlowspecRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4FlowspecRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv4 Labeled Unicast Modals -->
      <DraggableModal v-model:visible="ipv4LabeledUnicastNetworkModalVisible" :title="editingIpv4LabeledUnicastNetworkIndex >= 0 ? '编辑网络' : '添加网络'" width="500px" @confirm="saveNetworkIpv4LabeledUnicast">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="ipv4LabeledUnicastNetworkForm.network" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4LabeledUnicastNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4LabeledUnicastNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4LabeledUnicastAggregateModalVisible" :title="editingIpv4LabeledUnicastAggregateIndex >= 0 ? '编辑聚合' : '添加聚合'" width="500px" @confirm="saveAggregateIpv4LabeledUnicast">
        <div class="form-row">
          <label class="form-label">聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv4LabeledUnicastAggregateForm.aggregate" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4LabeledUnicastAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4LabeledUnicastAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4LabeledUnicastAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4LabeledUnicastRedistributeModalVisible" :title="editingIpv4LabeledUnicastRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistributeIpv4LabeledUnicast">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv4LabeledUnicastRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv4LabeledUnicastRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4LabeledUnicastRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv4 Multicast Modals -->
      <DraggableModal v-model:visible="ipv4MulticastNetworkModalVisible" :title="editingIpv4MulticastNetworkIndex >= 0 ? '编辑网络' : '添加网络'" width="500px" @confirm="saveNetworkIpv4Multicast">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="ipv4MulticastNetworkForm.network" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4MulticastNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4MulticastNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4MulticastAggregateModalVisible" :title="editingIpv4MulticastAggregateIndex >= 0 ? '编辑聚合' : '添加聚合'" width="500px" @confirm="saveAggregateIpv4Multicast">
        <div class="form-row">
          <label class="form-label">聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv4MulticastAggregateForm.aggregate" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4MulticastAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4MulticastAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4MulticastAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4MulticastDistancePrefixModalVisible" :title="editingIpv4MulticastDistancePrefixIndex >= 0 ? '编辑前缀管理距离' : '添加前缀管理距离'" width="500px" @confirm="saveDistancePrefixIpv4Multicast">
        <div class="form-row">
          <label class="form-label">前缀 *</label>
          <input type="text" class="form-control" v-model="ipv4MulticastDistancePrefixForm.prefix" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">管理距离 * (1-255)</label>
          <input type="number" class="form-control" v-model="ipv4MulticastDistancePrefixForm.distance" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6MulticastDistancePrefixModalVisible" :title="editingIpv6MulticastDistancePrefixIndex >= 0 ? '编辑前缀管理距离' : '添加前缀管理距离'" width="500px" @confirm="saveDistancePrefixIpv6Multicast">
        <div class="form-row">
          <label class="form-label">前缀 *</label>
          <input type="text" class="form-control" v-model="ipv6MulticastDistancePrefixForm.prefix" placeholder="例如: 2002::00/64" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">管理距离 * (1-255)</label>
          <input type="number" class="form-control" v-model="ipv6MulticastDistancePrefixForm.distance" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4MulticastRedistributeModalVisible" :title="editingIpv4MulticastRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistributeIpv4Multicast">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv4MulticastRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv4MulticastRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4MulticastRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv4 VPN Modals -->
      <DraggableModal v-model:visible="ipv4VpnNetworkModalVisible" :title="editingIpv4VpnNetworkIndex >= 0 ? '编辑网络' : '添加网络'" width="500px" @confirm="saveNetworkIpv4Vpn">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="ipv4VpnNetworkForm.network" placeholder="例如: 5.5.5.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">MPLS 标签 (0-1048575)</label>
          <input type="number" class="form-control" v-model="ipv4VpnNetworkForm.label" min="0" max="1048575" placeholder="0-1048575" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由区分器 (ASN:NN 或 IP:NN)</label>
          <input type="text" class="form-control" v-model="ipv4VpnNetworkForm.rd" placeholder="例如: 6.6.6.6:235" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4VpnAggregateModalVisible" :title="editingIpv4VpnAggregateIndex >= 0 ? '编辑聚合' : '添加聚合'" width="500px" @confirm="saveAggregateIpv4Vpn">
        <div class="form-row">
          <label class="form-label">聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv4VpnAggregateForm.aggregate" placeholder="例如: 2.2.2.0/24" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4VpnAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv4VpnAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4VpnAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv4VpnRedistributeModalVisible" :title="editingIpv4VpnRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistributeIpv4Vpn">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv4VpnRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv4VpnRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv4VpnRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Flowspec Modals -->
      <DraggableModal v-model:visible="ipv6FlowspecNetworkModalVisible" :title="editingIpv6FlowspecNetworkIndex >= 0 ? '编辑 IPv6 网络' : '添加 IPv6 网络'" width="500px" @confirm="saveNetworkIpv6Flowspec">
        <div class="form-row">
          <label class="form-label">IPv6 网络 *</label>
          <input type="text" class="form-control" v-model="ipv6FlowspecNetworkForm.network" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6FlowspecNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6FlowspecNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6FlowspecAggregateModalVisible" :title="editingIpv6FlowspecAggregateIndex >= 0 ? '编辑 IPv6 聚合' : '添加 IPv6 聚合'" width="500px" @confirm="saveAggregateIpv6Flowspec">
        <div class="form-row">
          <label class="form-label">IPv6 聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv6FlowspecAggregateForm.aggregate" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6FlowspecAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6FlowspecAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6FlowspecAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6FlowspecRedistributeModalVisible" :title="editingIpv6FlowspecRedistributeIndex >= 0 ? '编辑 IPv6 重分发' : '添加 IPv6 重分发'" width="500px" @confirm="saveRedistributeIpv6Flowspec">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv6FlowspecRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in IPV6_REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv6FlowspecRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6FlowspecRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Labeled Unicast Modals -->
      <DraggableModal v-model:visible="ipv6LabeledUnicastNetworkModalVisible" :title="editingIpv6LabeledUnicastNetworkIndex >= 0 ? '编辑 IPv6 网络' : '添加 IPv6 网络'" width="500px" @confirm="saveNetworkIpv6LabeledUnicast">
        <div class="form-row">
          <label class="form-label">IPv6 网络 *</label>
          <input type="text" class="form-control" v-model="ipv6LabeledUnicastNetworkForm.network" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6LabeledUnicastNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6LabeledUnicastNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6LabeledUnicastAggregateModalVisible" :title="editingIpv6LabeledUnicastAggregateIndex >= 0 ? '编辑 IPv6 聚合' : '添加 IPv6 聚合'" width="500px" @confirm="saveAggregateIpv6LabeledUnicast">
        <div class="form-row">
          <label class="form-label">IPv6 聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv6LabeledUnicastAggregateForm.aggregate" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6LabeledUnicastAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6LabeledUnicastAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6LabeledUnicastAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6LabeledUnicastRedistributeModalVisible" :title="editingIpv6LabeledUnicastRedistributeIndex >= 0 ? '编辑 IPv6 重分发' : '添加 IPv6 重分发'" width="500px" @confirm="saveRedistributeIpv6LabeledUnicast">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv6LabeledUnicastRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in IPV6_REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv6LabeledUnicastRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6LabeledUnicastRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 Multicast Modals -->
      <DraggableModal v-model:visible="ipv6MulticastNetworkModalVisible" :title="editingIpv6MulticastNetworkIndex >= 0 ? '编辑 IPv6 网络' : '添加 IPv6 网络'" width="500px" @confirm="saveNetworkIpv6Multicast">
        <div class="form-row">
          <label class="form-label">IPv6 网络 *</label>
          <input type="text" class="form-control" v-model="ipv6MulticastNetworkForm.network" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6MulticastNetworkForm.backdoor" /> 后门路由 (Backdoor)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6MulticastNetworkForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6MulticastAggregateModalVisible" :title="editingIpv6MulticastAggregateIndex >= 0 ? '编辑 IPv6 聚合' : '添加 IPv6 聚合'" width="500px" @confirm="saveAggregateIpv6Multicast">
        <div class="form-row">
          <label class="form-label">IPv6 聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv6MulticastAggregateForm.aggregate" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6MulticastAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6MulticastAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6MulticastAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6MulticastRedistributeModalVisible" :title="editingIpv6MulticastRedistributeIndex >= 0 ? '编辑 IPv6 重分发' : '添加 IPv6 重分发'" width="500px" @confirm="saveRedistributeIpv6Multicast">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv6MulticastRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in IPV6_REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv6MulticastRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6MulticastRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- IPv6 VPN Modals -->
      <DraggableModal v-model:visible="ipv6VpnNetworkModalVisible" :title="editingIpv6VpnNetworkIndex >= 0 ? '编辑 IPv6 网络' : '添加 IPv6 网络'" width="500px" @confirm="saveNetworkIpv6Vpn">
        <div class="form-row">
          <label class="form-label">IPv6 网络 *</label>
          <input type="text" class="form-control" v-model="ipv6VpnNetworkForm.network" placeholder="例如: 2011::0/64" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">MPLS 标签 (0-1048575)</label>
          <input type="number" class="form-control" v-model="ipv6VpnNetworkForm.label" min="0" max="1048575" placeholder="0-1048575" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由区分器 (ASN:NN 或 IP:NN)</label>
          <input type="text" class="form-control" v-model="ipv6VpnNetworkForm.rd" placeholder="例如: 7.7.7.7:911" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6VpnAggregateModalVisible" :title="editingIpv6VpnAggregateIndex >= 0 ? '编辑 IPv6 聚合' : '添加 IPv6 聚合'" width="500px" @confirm="saveAggregateIpv6Vpn">
        <div class="form-row">
          <label class="form-label">IPv6 聚合网络 *</label>
          <input type="text" class="form-control" v-model="ipv6VpnAggregateForm.aggregate" placeholder="例如: 2001:db8::/32" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6VpnAggregateForm['as-set']" /> AS Set</label>
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <label><input type="checkbox" v-model="ipv6VpnAggregateForm['summary-only']" /> 仅汇总 (Summary Only)</label>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6VpnAggregateForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ipv6VpnRedistributeModalVisible" :title="editingIpv6VpnRedistributeIndex >= 0 ? '编辑 IPv6 重分发' : '添加 IPv6 重分发'" width="500px" @confirm="saveRedistributeIpv6Vpn">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="ipv6VpnRedistributeForm.protocol" style="width:100%;">
            <option v-for="opt in IPV6_REDISTRIBUTE_PROTOCOLS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="ipv6VpnRedistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="ipv6VpnRedistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- EVPN Route Target Modal -->
      <DraggableModal v-model:visible="evpnRtModalVisible" :title="editingEvpnRtIndex >= 0 ? '编辑 EVPN Route Target' : '添加 EVPN Route Target'" width="500px" @confirm="saveEvpnRt">
        <div class="form-row">
          <label class="form-label">方向 *</label>
          <select class="form-control" v-model="evpnRtForm.direction" style="width:100%;">
            <option v-for="opt in EVPN_RT_DIRECTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Route Target *</label>
          <input type="text" class="form-control" v-model="evpnRtForm['route-target']"
                 placeholder="例如: 1:1 或 1.1.1.1:100" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- EVPN VNI Modal -->
      <DraggableModal v-model:visible="evpnVniModalVisible" :title="editingEvpnVniIndex >= 0 ? '编辑 EVPN VNI' : '添加 EVPN VNI'" width="500px" @confirm="saveEvpnVni">
        <div class="form-row">
          <label class="form-label">VNI *</label>
          <input type="number" class="form-control" v-model="evpnVniForm.vni"
                 min="1" max="16777215" placeholder="1-16777215" style="width:100%;"
                 title="Virtual Network Identifier (1-16777215)" />
        </div>
      </DraggableModal>

      <!-- EVPN VNI Route Target Modal -->
      <DraggableModal v-model:visible="evpnVniRtModalVisible" :title="editingEvpnVniRtIndex >= 0 ? '编辑 VNI Route Target' : '添加 VNI Route Target'" width="600px" @confirm="saveEvpnVniRtManager">
        <div class="form-row">
          <label class="form-label">方向 *</label>
          <select class="form-control" v-model="evpnVniRtForm.direction" style="width:100%;">
            <option v-for="opt in EVPN_RT_DIRECTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Route Target *</label>
          <input type="text" class="form-control" v-model="evpnVniRtForm['route-target']"
                 placeholder="例如: 1:1 或 1.1.1.1:100" style="width:100%;" />
        </div>
        <div class="form-row" style="margin-top:20px;">
          <button class="btn btn-sm btn-primary" @click="saveEvpnVniRt">添加 Route Target</button>
        </div>
        <div style="margin-top:16px;">
          <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
            <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">已配置的 Route Targets</div>
            <div style="padding:16px;">
          <div v-if="evpnVniForm['route-targets'].length === 0" style="color:#999;padding:8px;">暂无配置</div>
          <div v-for="(rt, idx) in evpnVniForm['route-targets']" :key="idx" style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #ddd;margin:4px 0;">
            </div>
          </div>
            <span style="flex:1;">{{ rt.direction }}: {{ rt['route-target'] }}</span>
            <button class="btn btn-sm btn-danger" @click="evpnVniForm['route-targets'].splice(idx, 1)">删除</button>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
