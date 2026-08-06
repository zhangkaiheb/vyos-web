import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIPv6Prefix(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'IPv6 子网格式应为 前缀/长度';
  const err = validateIPv6(parts[0]);
  if (err) return err;
  const p = parseInt(parts[1], 10);
  if (isNaN(p) || p < 0 || p > 128) return 'IPv6 前缀长度范围为 0-128';
  return '';
}

function validateFQDN(value) {
  if (!value) return '';
  const re = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/;
  if (!re.test(value)) return '主机名格式错误';
  return '';
}

function validateIPv6OrFQDN(value) {
  if (!value) return '';
  if (!validateIPv6(value)) return '';
  if (!validateFQDN(value)) return '';
  return '请输入 IPv6 地址或主机名';
}

function expandIPv6Address(addr) {
  if (addr.includes('::')) {
    const [left, right] = addr.split('::');
    const leftParts = left ? left.split(':').filter(Boolean) : [];
    const rightParts = right ? right.split(':').filter(Boolean) : [];
    const missing = 8 - leftParts.length - rightParts.length;
    if (missing < 0) return null;
    return [...leftParts, ...new Array(missing).fill('0'), ...rightParts];
  }
  const parts = addr.split(':').filter(Boolean);
  return parts.length === 8 ? parts : null;
}

function normalizeIPv6Prefix(prefix) {
  const [addr, lenStr] = String(prefix).split('/');
  const len = parseInt(lenStr, 10);
  if (isNaN(len) || len < 0 || len > 128) return null;
  const parts = expandIPv6Address(addr);
  if (!parts) return null;
  const nums = parts.map(p => parseInt(p, 16) || 0);
  const fullParts = Math.floor(len / 16);
  const remainingBits = len % 16;
  for (let i = fullParts + 1; i < 8; i++) nums[i] = 0;
  if (fullParts < 8 && remainingBits > 0) {
    const mask = 0xffff << (16 - remainingBits);
    nums[fullParts] = nums[fullParts] & mask;
  } else if (fullParts < 8) {
    nums[fullParts] = 0;
  }
  return nums.map(n => n.toString(16)).join(':') + '/' + len;
}

function ipv6PrefixMatch(prefix1, prefix2) {
  const n1 = normalizeIPv6Prefix(prefix1);
  const n2 = normalizeIPv6Prefix(prefix2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

function getLocalIPv6Prefixes(interfaces) {
  const prefixes = new Set();
  for (const iface of interfaces || []) {
    for (const ip of toArray(iface.ipv6_address)) {
      const p = normalizeIPv6Prefix(ip);
      if (p) prefixes.add(p);
    }
  }
  return prefixes;
}

function validateRange(value, min, max, name) {
  if (!isPresent(value)) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name} 范围为 ${min}-${max}`;
  return '';
}

function commonOptionsToForm(commonOptions = {}) {
  return {
    name_server: toArray(commonOptions['name-server']),
    domain_search: joinMembers(commonOptions['domain-search']),
    info_refresh_time: commonOptions['info-refresh-time'] !== undefined ? String(commonOptions['info-refresh-time']) : '',
  };
}

function commonOptionsToConfig(formCommon) {
  const result = {};
  if (formCommon.name_server?.length) result['name-server'] = [...formCommon.name_server];
  const domainSearch = splitMembers(formCommon.domain_search);
  if (domainSearch.length) result['domain-search'] = domainSearch;
  if (isPresent(formCommon.info_refresh_time)) result['info-refresh-time'] = String(formCommon.info_refresh_time);
  return result;
}

function subnetOptionsToForm(options = {}) {
  return {
    name_server: toArray(options['name-server']),
    domain_search: joinMembers(options['domain-search']),
    sntp_server: toArray(options['sntp-server']),
    sip_server: toArray(options['sip-server']),
    nis_server: toArray(options['nis-server']),
    nisplus_server: toArray(options['nisplus-server']),
    nis_domain: options['nis-domain'] || '',
    nisplus_domain: options['nisplus-domain'] || '',
    captive_portal: options['captive-portal'] || '',
    cisco_tftp_server: toArray(options['vendor-option']?.cisco?.['tftp-server']),
  };
}

function subnetOptionsToConfig(formOptions) {
  const result = {};
  if (formOptions.name_server?.length) result['name-server'] = [...formOptions.name_server];
  const domainSearch = splitMembers(formOptions.domain_search);
  if (domainSearch.length) result['domain-search'] = domainSearch;
  if (formOptions.sntp_server?.length) result['sntp-server'] = [...formOptions.sntp_server];
  if (formOptions.sip_server?.length) result['sip-server'] = [...formOptions.sip_server];
  if (formOptions.nis_server?.length) result['nis-server'] = [...formOptions.nis_server];
  if (formOptions.nisplus_server?.length) result['nisplus-server'] = [...formOptions.nisplus_server];
  if (isPresent(formOptions.nis_domain)) result['nis-domain'] = formOptions.nis_domain;
  if (isPresent(formOptions.nisplus_domain)) result['nisplus-domain'] = formOptions.nisplus_domain;
  if (isPresent(formOptions.captive_portal)) result['captive-portal'] = formOptions.captive_portal;
  if (formOptions.cisco_tftp_server?.length) {
    result['vendor-option'] = { cisco: { 'tftp-server': [...formOptions.cisco_tftp_server] } };
  }
  return result;
}

function rangesToForm(ranges = {}) {
  return Object.entries(ranges).map(([name, r]) => ({
    _name: name,
    name,
    prefix: r.prefix || '',
    start: r.start || '',
    stop: r.stop || '',
    options: subnetOptionsToForm(r.option),
  }));
}

function rangesToConfig(formRanges) {
  const result = {};
  for (const r of formRanges) {
    if (!r.name) continue;
    const item = {};
    if (isPresent(r.prefix)) item.prefix = r.prefix;
    if (isPresent(r.start)) item.start = r.start;
    if (isPresent(r.stop)) item.stop = r.stop;
    const options = subnetOptionsToConfig(r.options || {});
    if (Object.keys(options).length) item.option = options;
    result[r.name] = item;
  }
  return result;
}

function staticMappingsToForm(mappings = {}) {
  return Object.entries(mappings).map(([name, m]) => ({
    _name: name,
    name,
    duid: m.duid || '',
    ipv6_address: m['ipv6-address'] || '',
    ipv6_prefix: m['ipv6-prefix'] || '',
    mac: m.mac || '',
    disable: m.disable !== undefined,
    options: subnetOptionsToForm(m.option),
  }));
}

function staticMappingsToConfig(formMappings) {
  const result = {};
  for (const m of formMappings) {
    if (!m.name) continue;
    const item = {};
    if (isPresent(m.duid)) item.duid = m.duid;
    if (isPresent(m.ipv6_address)) item['ipv6-address'] = m.ipv6_address;
    if (isPresent(m.ipv6_prefix)) item['ipv6-prefix'] = m.ipv6_prefix;
    if (isPresent(m.mac)) item.mac = m.mac;
    if (m.disable) item.disable = '';
    const options = subnetOptionsToConfig(m.options || {});
    if (Object.keys(options).length) item.option = options;
    result[m.name] = item;
  }
  return result;
}

function prefixDelegationsToForm(delegations = {}) {
  return Object.entries(delegations).map(([prefix, d]) => ({
    _prefix: prefix,
    prefix,
    delegated_length: d['delegated-length'] !== undefined ? String(d['delegated-length']) : '',
    prefix_length: d['prefix-length'] !== undefined ? String(d['prefix-length']) : '',
    excluded_prefix: d['excluded-prefix'] || '',
    excluded_prefix_length: d['excluded-prefix-length'] !== undefined ? String(d['excluded-prefix-length']) : '',
  }));
}

function prefixDelegationsToConfig(formDelegations) {
  const result = {};
  for (const d of formDelegations) {
    if (!d.prefix) continue;
    const item = {};
    if (isPresent(d.delegated_length)) item['delegated-length'] = String(d.delegated_length);
    if (isPresent(d.prefix_length)) item['prefix-length'] = String(d.prefix_length);
    if (isPresent(d.excluded_prefix)) item['excluded-prefix'] = d.excluded_prefix;
    if (isPresent(d.excluded_prefix_length)) item['excluded-prefix-length'] = String(d.excluded_prefix_length);
    result[d.prefix] = item;
  }
  return result;
}

function subnetsToForm(subnets = {}) {
  return Object.entries(subnets).map(([subnet, s]) => {
    const leaseTime = s['lease-time'] || {};
    return {
      _subnet: subnet,
      subnet,
      interface: s.interface || '',
      lease_time_default: leaseTime.default !== undefined ? String(leaseTime.default) : '',
      lease_time_min: leaseTime.minimum !== undefined ? String(leaseTime.minimum) : '',
      lease_time_max: leaseTime.maximum !== undefined ? String(leaseTime.maximum) : '',
      subnet_id: s['subnet-id'] !== undefined ? String(s['subnet-id']) : '',
      ranges: rangesToForm(s.range),
      static_mappings: staticMappingsToForm(s['static-mapping']),
      prefix_delegations: prefixDelegationsToForm(s['prefix-delegation']?.prefix),
      options: subnetOptionsToForm(s.option),
    };
  });
}

function subnetsToConfig(formSubnets) {
  const result = {};
  for (const s of formSubnets) {
    if (!s.subnet) continue;
    const item = {};
    if (isPresent(s.interface)) item.interface = s.interface;
    const leaseTime = {};
    if (isPresent(s.lease_time_default)) leaseTime.default = String(s.lease_time_default);
    if (isPresent(s.lease_time_min)) leaseTime.minimum = String(s.lease_time_min);
    if (isPresent(s.lease_time_max)) leaseTime.maximum = String(s.lease_time_max);
    if (Object.keys(leaseTime).length) item['lease-time'] = leaseTime;
    if (isPresent(s.subnet_id)) item['subnet-id'] = String(s.subnet_id);
    const ranges = rangesToConfig(s.ranges || []);
    if (Object.keys(ranges).length) item.range = ranges;
    const mappings = staticMappingsToConfig(s.static_mappings || []);
    if (Object.keys(mappings).length) item['static-mapping'] = mappings;
    const delegations = prefixDelegationsToConfig(s.prefix_delegations || []);
    if (Object.keys(delegations).length) item['prefix-delegation'] = { prefix: delegations };
    const options = subnetOptionsToConfig(s.options || {});
    if (Object.keys(options).length) item.option = options;
    result[s.subnet] = item;
  }
  return result;
}

function sharedNetworksToForm(networks = {}) {
  return Object.entries(networks).map(([name, n]) => ({
    _name: name,
    name,
    description: n.description || '',
    disable: n.disable !== undefined,
    interface: n.interface || '',
    common_options: commonOptionsToForm(n['common-options']),
    subnets: subnetsToForm(n.subnet),
  }));
}

function sharedNetworksToConfig(formNetworks) {
  const result = {};
  for (const n of formNetworks) {
    if (!n.name) continue;
    const item = {};
    if (isPresent(n.description)) item.description = n.description;
    if (n.disable) item.disable = '';
    if (isPresent(n.interface)) item.interface = n.interface;
    const commonOptions = commonOptionsToConfig(n.common_options || {});
    if (Object.keys(commonOptions).length) item['common-options'] = commonOptions;
    const subnets = subnetsToConfig(n.subnets || []);
    if (Object.keys(subnets).length) item.subnet = subnets;
    result[n.name] = item;
  }
  return result;
}

function dhcpv6ServerToForm(data = {}) {
  const globalParams = data['global-parameters'] || {};
  return {
    disable: data.disable !== undefined,
    disable_route_autoinstall: data['disable-route-autoinstall'] !== undefined,
    preference: data.preference !== undefined ? String(data.preference) : '',
    listen_interface: toArray(data['listen-interface']),
    global_parameters: {
      name_server: toArray(globalParams['name-server']),
    },
    shared_networks: sharedNetworksToForm(data['shared-network-name']),
  };
}

function dhcpv6ServerToConfig(form) {
  const result = {};
  if (form.disable) result.disable = '';
  if (form.disable_route_autoinstall) result['disable-route-autoinstall'] = '';
  if (isPresent(form.preference)) result.preference = String(form.preference);
  if (form.listen_interface?.length) result['listen-interface'] = [...form.listen_interface];

  const globalParams = {};
  if (form.global_parameters?.name_server?.length) globalParams['name-server'] = [...form.global_parameters.name_server];
  if (Object.keys(globalParams).length) result['global-parameters'] = globalParams;

  const networks = sharedNetworksToConfig(form.shared_networks || []);
  if (Object.keys(networks).length) result['shared-network-name'] = networks;
  return result;
}

export default defineComponent({
  name: 'Dhcpv6ServerPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dhcpv6ServerToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = res.interfaces || [];
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'global': return 'service dhcpv6-server global-parameters';
        case 'shared-networks': return 'service dhcpv6-server shared-network-name';
        case 'basic':
        default: return 'service dhcpv6-server';
      }
    });

    const networkColumns = [
      { key: 'name', title: '名称' },
      { key: 'interface', title: '接口' },
      { key: 'description', title: '描述' },
      { key: 'disable', title: '禁用', render: v => v ? '是' : '否' },
      { key: 'subnets', title: '子网数量', render: (_, row) => (row.subnets || []).length },
    ];

    const selectedNetwork = ref([]);
    const showNetworkModal = ref(false);
    const editingNetwork = ref({});

    const subnetColumns = [
      { key: 'subnet', title: 'IPv6 子网' },
      { key: 'interface', title: '接口' },
      { key: 'lease_time_default', title: '默认租约' },
      { key: 'ranges', title: '地址范围数量', render: (_, row) => (row.ranges || []).length },
    ];

    const selectedSubnet = ref([]);
    const showSubnetModal = ref(false);
    const editingSubnet = ref({});

    const rangeColumns = [
      { key: 'name', title: '名称' },
      { key: 'prefix', title: '前缀' },
      { key: 'start', title: '起始地址' },
      { key: 'stop', title: '结束地址' },
    ];

    const selectedRange = ref([]);
    const showRangeModal = ref(false);
    const editingRange = ref({});

    const mappingColumns = [
      { key: 'name', title: '名称' },
      { key: 'ipv6_address', title: 'IPv6 地址' },
      { key: 'mac', title: 'MAC' },
      { key: 'disable', title: '禁用', render: v => v ? '是' : '否' },
    ];

    const selectedMapping = ref([]);
    const showMappingModal = ref(false);
    const editingMapping = ref({});

    const delegationColumns = [
      { key: 'prefix', title: '前缀' },
      { key: 'delegated_length', title: '委派长度' },
      { key: 'prefix_length', title: '前缀长度' },
    ];

    const selectedDelegation = ref([]);
    const showDelegationModal = ref(false);
    const editingDelegation = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dhcpv6-server', true);
        config.value = dhcpv6ServerToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const err = validateRange(config.value.preference, 0, 255, 'Preference');
      if (err) return alert(err);
      for (const ip of config.value.global_parameters.name_server || []) {
        if (validateIPv6(ip)) return alert(`全局 DNS 服务器 ${ip}：IPv6 地址格式错误`);
      }
      for (const n of config.value.shared_networks || []) {
        const nameErr = validateName(n.name);
        if (nameErr) return alert(nameErr);
        for (const ip of n.common_options?.name_server || []) {
          if (validateIPv6(ip)) return alert(`共享网络 ${n.name} 通用 DNS ${ip}：IPv6 地址格式错误`);
        }
        for (const s of n.subnets || []) {
          const subnetErr = validateIPv6Prefix(s.subnet);
          if (subnetErr) return alert(`共享网络 ${n.name} 子网 ${s.subnet}：${subnetErr}`);
          const leaseErr = validateRange(s.lease_time_default, 1, 4294967295, '默认租约时间') ||
            validateRange(s.lease_time_min, 1, 4294967295, '最小租约时间') ||
            validateRange(s.lease_time_max, 1, 4294967295, '最大租约时间') ||
            validateRange(s.subnet_id, 0, 4294967295, '子网 ID');
          if (leaseErr) return alert(`子网 ${s.subnet}：${leaseErr}`);
          for (const ip of s.options?.name_server || []) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} DNS ${ip}：IPv6 地址格式错误`);
          }
          for (const ip of s.options?.sntp_server || []) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} SNTP ${ip}：IPv6 地址格式错误`);
          }
          for (const ip of s.options?.sip_server || []) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} SIP ${ip}：IPv6 地址格式错误`);
          }
          for (const ip of s.options?.nis_server || []) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} NIS ${ip}：IPv6 地址格式错误`);
          }
          for (const ip of s.options?.nisplus_server || []) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} NIS+ ${ip}：IPv6 地址格式错误`);
          }
          const tftpServers = s.options?.cisco_tftp_server || [];
          if (tftpServers.length > 2) return alert(`子网 ${s.subnet}：Cisco TFTP 服务器最多 2 个`);
          for (const ip of tftpServers) {
            if (validateIPv6(ip)) return alert(`子网 ${s.subnet} Cisco TFTP 服务器 ${ip}：IPv6 地址格式错误`);
          }
          for (const m of s.static_mappings || []) {
            if (!m.name) return alert(`子网 ${s.subnet} 存在未命名的静态映射`);
            if (isPresent(m.ipv6_address) && validateIPv6(m.ipv6_address)) return alert(`子网 ${s.subnet} 静态映射 ${m.name} IPv6 地址格式错误`);
            if (isPresent(m.ipv6_prefix) && validateIPv6Prefix(m.ipv6_prefix)) return alert(`子网 ${s.subnet} 静态映射 ${m.name} IPv6 前缀格式错误`);
            if (isPresent(m.mac) && !/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(m.mac)) return alert(`子网 ${s.subnet} 静态映射 ${m.name} MAC 格式错误`);
          }
          for (const d of s.prefix_delegations || []) {
            if (!d.prefix) return alert(`子网 ${s.subnet} 存在未设置前缀的前缀委派`);
            const dErr = validateIPv6Prefix(d.prefix);
            if (dErr) return alert(`子网 ${s.subnet} 前缀委派 ${d.prefix}：${dErr}`);
            const dlErr = validateRange(d.delegated_length, 32, 64, '委派长度');
            if (dlErr) return alert(`子网 ${s.subnet} 前缀委派 ${d.prefix}：${dlErr}`);
            const plErr = validateRange(d.prefix_length, 32, 64, '前缀长度');
            if (plErr) return alert(`子网 ${s.subnet} 前缀委派 ${d.prefix}：${plErr}`);
            if (isPresent(d.excluded_prefix)) {
              const epErr = validateIPv6Prefix(d.excluded_prefix);
              if (epErr) return alert(`子网 ${s.subnet} 前缀委派 ${d.prefix} 排除前缀：${epErr}`);
            }
            if (isPresent(d.excluded_prefix_length)) {
              const eplErr = validateRange(d.excluded_prefix_length, 32, 64, '排除前缀长度');
              if (eplErr) return alert(`子网 ${s.subnet} 前缀委派 ${d.prefix} 排除前缀长度：${eplErr}`);
            }
          }
          for (const r of s.ranges || []) {
            if (!r.name) return alert(`子网 ${s.subnet} 存在未命名的地址范围`);
            if (isPresent(r.prefix)) {
              const pErr = validateIPv6Prefix(r.prefix);
              if (pErr) return alert(`子网 ${s.subnet} 范围 ${r.name} 前缀：${pErr}`);
            }
            if (isPresent(r.start)) {
              const sErr = validateIPv6(r.start);
              if (sErr) return alert(`子网 ${s.subnet} 范围 ${r.name} 起始地址：${sErr}`);
            }
            if (isPresent(r.stop)) {
              const sErr = validateIPv6(r.stop);
              if (sErr) return alert(`子网 ${s.subnet} 范围 ${r.name} 结束地址：${sErr}`);
            }
            const rtftp = r.options?.cisco_tftp_server || [];
            if (rtftp.length > 2) return alert(`子网 ${s.subnet} 范围 ${r.name}：Cisco TFTP 服务器最多 2 个`);
            for (const ip of rtftp) {
              if (validateIPv6(ip)) return alert(`子网 ${s.subnet} 范围 ${r.name} Cisco TFTP 服务器 ${ip}：IPv6 地址格式错误`);
            }
          }
        }
      }

      const hasSubnets = config.value.shared_networks?.some(n => n.subnets?.length);
      if (hasSubnets) {
        const localPrefixes = getLocalIPv6Prefixes(interfaces.value);
        const hasConnectedSubnet = config.value.shared_networks?.some(n =>
          n.subnets?.some(s => {
            const subnetPrefix = normalizeIPv6Prefix(s.subnet);
            return subnetPrefix && localPrefixes.has(subnetPrefix);
          })
        );
        if (!hasConnectedSubnet) {
          return alert('None of the DHCPv6 subnets are connected to a subnet6 on this machine. At least one subnet6 must be connected such that DHCPv6 listens on an interface!');
        }
      }

      saving.value = true;
      try {
        await configApi.set('service dhcpv6-server', dhcpv6ServerToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createNetwork() {
      editingNetwork.value = {
        name: '', description: '', disable: false, interface: '',
        common_options: { name_server: [], domain_search: '', info_refresh_time: '' },
        subnets: [],
      };
      selectedSubnet.value = [];
      showNetworkModal.value = true;
    }

    function editNetwork() {
      if (!selectedNetwork.value.length) return alert('请选择要编辑的共享网络');
      const row = (config.value.shared_networks || []).find(n => n._name === selectedNetwork.value[0]);
      if (!row) return alert('未找到选中的共享网络');
      editingNetwork.value = JSON.parse(JSON.stringify(row));
      selectedSubnet.value = [];
      showNetworkModal.value = true;
    }

    function removeNetwork() {
      if (!selectedNetwork.value.length) return alert('请选择要删除的共享网络');
      config.value.shared_networks = (config.value.shared_networks || []).filter(n => n._name !== selectedNetwork.value[0]);
      selectedNetwork.value = [];
    }

    function saveNetwork() {
      const err = validateName(editingNetwork.value.name);
      if (err) return alert(err);
      const list = config.value.shared_networks || [];
      const idx = list.findIndex(n => n._name === editingNetwork.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingNetwork.value)));
      } else {
        if (list.some(n => n.name === editingNetwork.value.name)) return alert('该共享网络名称已存在');
        list.push(JSON.parse(JSON.stringify(editingNetwork.value)));
      }
      config.value.shared_networks = [...list];
      selectedNetwork.value = [];
      showNetworkModal.value = false;
    }

    function createSubnet() {
      editingSubnet.value = {
        subnet: '', interface: '', lease_time_default: '', lease_time_min: '', lease_time_max: '',
        subnet_id: '', ranges: [], static_mappings: [], prefix_delegations: [],
        options: { name_server: [], domain_search: '', sntp_server: [], sip_server: [], nis_server: [], nisplus_server: [], nis_domain: '', nisplus_domain: '', captive_portal: '', cisco_tftp_server: [] },
      };
      selectedRange.value = [];
      selectedMapping.value = [];
      selectedDelegation.value = [];
      showSubnetModal.value = true;
    }

    function editSubnet() {
      if (!selectedSubnet.value.length) return alert('请选择要编辑的子网');
      const row = (editingNetwork.value.subnets || []).find(s => s._subnet === selectedSubnet.value[0]);
      if (!row) return alert('未找到选中的子网');
      editingSubnet.value = JSON.parse(JSON.stringify(row));
      selectedRange.value = [];
      showSubnetModal.value = true;
    }

    function removeSubnet() {
      if (!selectedSubnet.value.length) return alert('请选择要删除的子网');
      editingNetwork.value.subnets = (editingNetwork.value.subnets || []).filter(s => s._subnet !== selectedSubnet.value[0]);
      selectedSubnet.value = [];
    }

    function saveSubnet() {
      const err = validateIPv6Prefix(editingSubnet.value.subnet);
      if (err) return alert(err);
      const tftpServers = editingSubnet.value.options?.cisco_tftp_server || [];
      if (tftpServers.length > 2) return alert('Cisco TFTP 服务器最多 2 个');
      for (const ip of tftpServers) {
        if (validateIPv6(ip)) return alert(`Cisco TFTP 服务器 ${ip}：IPv6 地址格式错误`);
      }
      const list = editingNetwork.value.subnets || [];
      const idx = list.findIndex(s => s._subnet === editingSubnet.value._subnet);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingSubnet.value)));
      } else {
        if (list.some(s => s.subnet === editingSubnet.value.subnet)) return alert('该子网已存在');
        list.push(JSON.parse(JSON.stringify(editingSubnet.value)));
      }
      editingNetwork.value.subnets = [...list];
      selectedSubnet.value = [];
      showSubnetModal.value = false;
    }

    function createRange() {
      editingRange.value = {
        name: '', prefix: '', start: '', stop: '',
        options: { name_server: [], domain_search: '', sntp_server: [], sip_server: [], nis_server: [], nisplus_server: [], nis_domain: '', nisplus_domain: '', captive_portal: '', cisco_tftp_server: [] },
      };
      showRangeModal.value = true;
    }

    function editRange() {
      if (!selectedRange.value.length) return alert('请选择要编辑的地址范围');
      const row = (editingSubnet.value.ranges || []).find(r => r._name === selectedRange.value[0]);
      if (!row) return alert('未找到选中的地址范围');
      editingRange.value = JSON.parse(JSON.stringify(row));
      showRangeModal.value = true;
    }

    function removeRange() {
      if (!selectedRange.value.length) return alert('请选择要删除的地址范围');
      editingSubnet.value.ranges = (editingSubnet.value.ranges || []).filter(r => r._name !== selectedRange.value[0]);
      selectedRange.value = [];
    }

    function saveRange() {
      if (!editingRange.value.name) return alert('请输入地址范围名称');
      const err = validateName(editingRange.value.name);
      if (err) return alert(err);
      if (isPresent(editingRange.value.prefix)) {
        const pErr = validateIPv6Prefix(editingRange.value.prefix);
        if (pErr) return alert(`前缀：${pErr}`);
      }
      if (isPresent(editingRange.value.start)) {
        const sErr = validateIPv6(editingRange.value.start);
        if (sErr) return alert(`起始地址：${sErr}`);
      }
      if (isPresent(editingRange.value.stop)) {
        const sErr = validateIPv6(editingRange.value.stop);
        if (sErr) return alert(`结束地址：${sErr}`);
      }
      const rangeTftp = editingRange.value.options?.cisco_tftp_server || [];
      if (rangeTftp.length > 2) return alert('地址范围 Cisco TFTP 服务器最多 2 个');
      for (const ip of rangeTftp) {
        if (validateIPv6(ip)) return alert(`地址范围 Cisco TFTP 服务器 ${ip}：IPv6 地址格式错误`);
      }
      const list = editingSubnet.value.ranges || [];
      const idx = list.findIndex(r => r._name === editingRange.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingRange.value)));
      } else {
        if (list.some(r => r.name === editingRange.value.name)) return alert('该地址范围名称已存在');
        list.push(JSON.parse(JSON.stringify(editingRange.value)));
      }
      editingSubnet.value.ranges = [...list];
      selectedRange.value = [];
      showRangeModal.value = false;
    }

    function createMapping() {
      editingMapping.value = {
        name: '', duid: '', ipv6_address: '', ipv6_prefix: '', mac: '', disable: false,
        options: { name_server: [], domain_search: '', sntp_server: [], sip_server: [], nis_server: [], nisplus_server: [], nis_domain: '', nisplus_domain: '', captive_portal: '', cisco_tftp_server: [] },
      };
      showMappingModal.value = true;
    }

    function editMapping() {
      if (!selectedMapping.value.length) return alert('请选择要编辑的静态映射');
      const row = (editingSubnet.value.static_mappings || []).find(m => m._name === selectedMapping.value[0]);
      if (!row) return alert('未找到选中的静态映射');
      editingMapping.value = JSON.parse(JSON.stringify(row));
      showMappingModal.value = true;
    }

    function removeMapping() {
      if (!selectedMapping.value.length) return alert('请选择要删除的静态映射');
      editingSubnet.value.static_mappings = (editingSubnet.value.static_mappings || []).filter(m => m._name !== selectedMapping.value[0]);
      selectedMapping.value = [];
    }

    function saveMapping() {
      if (!editingMapping.value.name) return alert('请输入静态映射名称');
      const err = validateName(editingMapping.value.name);
      if (err) return alert(err);
      if (isPresent(editingMapping.value.ipv6_address)) {
        const ipErr = validateIPv6(editingMapping.value.ipv6_address);
        if (ipErr) return alert(`IPv6 地址：${ipErr}`);
      }
      if (isPresent(editingMapping.value.ipv6_prefix)) {
        const pErr = validateIPv6Prefix(editingMapping.value.ipv6_prefix);
        if (pErr) return alert(`IPv6 前缀：${pErr}`);
      }
      if (isPresent(editingMapping.value.mac)) {
        if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(editingMapping.value.mac)) return alert('MAC 格式错误');
      }
      const mtftp = editingMapping.value.options?.cisco_tftp_server || [];
      if (mtftp.length > 2) return alert('静态映射 Cisco TFTP 服务器最多 2 个');
      for (const ip of mtftp) {
        if (validateIPv6(ip)) return alert(`静态映射 Cisco TFTP 服务器 ${ip}：IPv6 地址格式错误`);
      }
      const list = editingSubnet.value.static_mappings || [];
      const idx = list.findIndex(m => m._name === editingMapping.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingMapping.value)));
      } else {
        if (list.some(m => m.name === editingMapping.value.name)) return alert('该静态映射名称已存在');
        list.push(JSON.parse(JSON.stringify(editingMapping.value)));
      }
      editingSubnet.value.static_mappings = [...list];
      selectedMapping.value = [];
      showMappingModal.value = false;
    }

    function createDelegation() {
      editingDelegation.value = {
        prefix: '', delegated_length: '', prefix_length: '', excluded_prefix: '', excluded_prefix_length: '',
      };
      showDelegationModal.value = true;
    }

    function editDelegation() {
      if (!selectedDelegation.value.length) return alert('请选择要编辑的前缀委派');
      const row = (editingSubnet.value.prefix_delegations || []).find(d => d._prefix === selectedDelegation.value[0]);
      if (!row) return alert('未找到选中的前缀委派');
      editingDelegation.value = JSON.parse(JSON.stringify(row));
      showDelegationModal.value = true;
    }

    function removeDelegation() {
      if (!selectedDelegation.value.length) return alert('请选择要删除的前缀委派');
      editingSubnet.value.prefix_delegations = (editingSubnet.value.prefix_delegations || []).filter(d => d._prefix !== selectedDelegation.value[0]);
      selectedDelegation.value = [];
    }

    function saveDelegation() {
      if (!editingDelegation.value.prefix) return alert('请输入前缀');
      const pErr = validateIPv6Prefix(editingDelegation.value.prefix);
      if (pErr) return alert(`前缀：${pErr}`);
      const dlErr = validateRange(editingDelegation.value.delegated_length, 32, 64, '委派长度');
      if (dlErr) return alert(dlErr);
      const plErr = validateRange(editingDelegation.value.prefix_length, 32, 64, '前缀长度');
      if (plErr) return alert(plErr);
      if (isPresent(editingDelegation.value.excluded_prefix)) {
        const epErr = validateIPv6Prefix(editingDelegation.value.excluded_prefix);
        if (epErr) return alert(`排除前缀：${epErr}`);
      }
      if (isPresent(editingDelegation.value.excluded_prefix_length)) {
        const eplErr = validateRange(editingDelegation.value.excluded_prefix_length, 32, 64, '排除前缀长度');
        if (eplErr) return alert(eplErr);
      }
      const list = editingSubnet.value.prefix_delegations || [];
      const idx = list.findIndex(d => d._prefix === editingDelegation.value._prefix);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingDelegation.value)));
      } else {
        if (list.some(d => d.prefix === editingDelegation.value.prefix)) return alert('该前缀已存在');
        list.push(JSON.parse(JSON.stringify(editingDelegation.value)));
      }
      editingSubnet.value.prefix_delegations = [...list];
      selectedDelegation.value = [];
      showDelegationModal.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, commandPath, interfaces,
      networkColumns, selectedNetwork, showNetworkModal, editingNetwork,
      subnetColumns, selectedSubnet, showSubnetModal, editingSubnet,
      rangeColumns, selectedRange, showRangeModal, editingRange,
      mappingColumns, selectedMapping, showMappingModal, editingMapping,
      delegationColumns, selectedDelegation, showDelegationModal, editingDelegation,
      load, save, createNetwork, editNetwork, removeNetwork, saveNetwork,
      createSubnet, editSubnet, removeSubnet, saveSubnet,
      createRange, editRange, removeRange, saveRange,
      createMapping, editMapping, removeMapping, saveMapping,
      createDelegation, editDelegation, removeDelegation, saveDelegation,
      validateIPv6, validateIPv6OrFQDN,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'global', title: '全局参数' },
        { key: 'shared-networks', title: '共享网络' }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label" title="禁用 DHCPv6 服务器实例">禁用</label><input type="checkbox" v-model="config.disable" /></div>
          <div class="form-row"><label class="form-label" title="禁止从 DHCPv6 学习到的路由自动安装到 FIB">禁用路由自动安装</label><input type="checkbox" v-model="config.disable_route_autoinstall" /></div>
          <div class="form-row">
            <label class="form-label" title="服务器优先级，范围 0-255">优先级 (Preference)</label>
            <div style="flex:1;">
              <input type="number" min="0" max="255" class="form-control" v-model="config.preference" placeholder="0-255" />
              <div class="form-hint">范围：0-255</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="DHCPv6 服务器监听请求的接口">监听接口</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.listen_interface" :options="interfaces.map(i => i.name).sort()" title-left="可选" title-right="已选" />
            </div>
          </div>
        </template>

        <template #global>
          <div class="form-row">
            <label class="form-label" title="全局 DNS 服务器地址">DNS 服务器</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.global_parameters.name_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 DNS 地址后按回车" :custom-validator="validateIPv6" />
              <div class="form-hint">点击可选列表右侧的 + 号添加自定义 IPv6 DNS 地址</div>
            </div>
          </div>
        </template>

        <template #shared-networks>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createNetwork">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editNetwork" :disabled="!selectedNetwork.length || selectedNetwork.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeNetwork" :disabled="!selectedNetwork.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="networkColumns" :data="config.shared_networks" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedNetwork = $event" />
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showNetworkModal" title="共享网络" width="700px" @confirm="saveNetwork" @close="showNetworkModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingNetwork.name" :disabled="!!editingNetwork._name" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingNetwork.description" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingNetwork.disable" /></div>
        <div class="form-row"><label class="form-label">接口</label>
          <select class="form-control" v-model="editingNetwork.interface">
            <option value="">未选择</option>
            <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">通用 DNS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingNetwork.common_options.name_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 DNS 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">通用搜索域</label><textarea class="form-control" v-model="editingNetwork.common_options.domain_search" rows="2" placeholder="每行一个搜索域" /></div>
        <div class="form-row"><label class="form-label">信息刷新时间 (秒)</label><input type="number" min="0" class="form-control" v-model="editingNetwork.common_options.info_refresh_time" placeholder="秒" /></div>

        <div style="margin-top:16px;border-top:1px solid #444;padding-top:12px;">
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createSubnet">创建子网</ToolbarButton>
            <ToolbarButton icon="edit" @click="editSubnet" :disabled="!selectedSubnet.length || selectedSubnet.length > 1">编辑子网</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeSubnet" :disabled="!selectedSubnet.length">删除子网</ToolbarButton>
          </div>
          <DataTable :columns="subnetColumns" :data="editingNetwork.subnets || []" row-key="subnet" :externalToolbar="true" :selectable="true" @selection-change="selectedSubnet = $event" />
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showSubnetModal" title="子网" width="620px" @confirm="saveSubnet" @close="showSubnetModal = false">
        <div class="form-row"><label class="form-label">IPv6 子网</label>
          <div style="flex:1;">
            <input class="form-control" v-model="editingSubnet.subnet" :disabled="!!editingSubnet._subnet" placeholder="2001:db8::/64" />
            <div class="form-hint">必须与本机某个接口的 IPv6 子网一致，否则 commit 会失败</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">接口</label>
          <select class="form-control" v-model="editingSubnet.interface">
            <option value="">未选择</option>
            <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">默认租约时间 (秒)</label>
          <div style="flex:1;">
            <input type="number" min="1" max="4294967295" class="form-control" v-model="editingSubnet.lease_time_default" placeholder="1-4294967295" />
            <div class="form-hint">范围：1-4294967295 秒</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">最小租约时间 (秒)</label>
          <div style="flex:1;">
            <input type="number" min="1" max="4294967295" class="form-control" v-model="editingSubnet.lease_time_min" placeholder="1-4294967295" />
            <div class="form-hint">范围：1-4294967295 秒</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">最大租约时间 (秒)</label>
          <div style="flex:1;">
            <input type="number" min="1" max="4294967295" class="form-control" v-model="editingSubnet.lease_time_max" placeholder="1-4294967295" />
            <div class="form-hint">范围：1-4294967295 秒</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">子网 ID</label>
          <div style="flex:1;">
            <input type="number" min="0" max="4294967295" class="form-control" v-model="editingSubnet.subnet_id" placeholder="0-4294967295" />
            <div class="form-hint">范围：0-4294967295</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">子网 DNS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.name_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 DNS 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">子网搜索域</label><textarea class="form-control" v-model="editingSubnet.options.domain_search" rows="2" placeholder="每行一个搜索域" /></div>
        <div class="form-row"><label class="form-label">SNTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.sntp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">SIP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.sip_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址或主机名后按回车" :custom-validator="validateIPv6OrFQDN" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.nis_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS+ 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.nisplus_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 域</label><input class="form-control" v-model="editingSubnet.options.nis_domain" placeholder="NIS domain name" /></div>
        <div class="form-row"><label class="form-label">NIS+ 域</label><input class="form-control" v-model="editingSubnet.options.nisplus_domain" placeholder="NIS+ domain name" /></div>
        <div class="form-row"><label class="form-label">强制门户 (Captive Portal)</label><input class="form-control" v-model="editingSubnet.options.captive_portal" placeholder="Captive portal API endpoint" /></div>
        <div class="form-row"><label class="form-label" title="Cisco 专用 TFTP 服务器，每个子网最多 2 个">Cisco TFTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingSubnet.options.cisco_tftp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
            <div class="form-hint">最多 2 个 IPv6 地址</div>
          </div>
        </div>

        <div style="margin-top:16px;border-top:1px solid #444;padding-top:12px;">
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRange">创建地址范围</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRange" :disabled="!selectedRange.length || selectedRange.length > 1">编辑地址范围</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRange" :disabled="!selectedRange.length">删除地址范围</ToolbarButton>
          </div>
          <DataTable :columns="rangeColumns" :data="editingSubnet.ranges || []" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedRange = $event" />
        </div>

        <div style="margin-top:16px;border-top:1px solid #444;padding-top:12px;">
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createMapping">创建静态映射</ToolbarButton>
            <ToolbarButton icon="edit" @click="editMapping" :disabled="!selectedMapping.length || selectedMapping.length > 1">编辑静态映射</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeMapping" :disabled="!selectedMapping.length">删除静态映射</ToolbarButton>
          </div>
          <DataTable :columns="mappingColumns" :data="editingSubnet.static_mappings || []" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedMapping = $event" />
        </div>

        <div style="margin-top:16px;border-top:1px solid #444;padding-top:12px;">
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createDelegation">创建前缀委派</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDelegation" :disabled="!selectedDelegation.length || selectedDelegation.length > 1">编辑前缀委派</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDelegation" :disabled="!selectedDelegation.length">删除前缀委派</ToolbarButton>
          </div>
          <DataTable :columns="delegationColumns" :data="editingSubnet.prefix_delegations || []" row-key="prefix" :externalToolbar="true" :selectable="true" @selection-change="selectedDelegation = $event" />
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showRangeModal" title="地址范围" width="620px" @confirm="saveRange" @close="showRangeModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingRange.name" :disabled="!!editingRange._name" placeholder="range01" /></div>
        <div class="form-row"><label class="form-label">前缀</label><input class="form-control" v-model="editingRange.prefix" placeholder="h:h:h:h:h:h:h:h/x" /></div>
        <div class="form-row"><label class="form-label">起始地址</label><input class="form-control" v-model="editingRange.start" placeholder="IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">结束地址</label><input class="form-control" v-model="editingRange.stop" placeholder="IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">DNS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.name_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 DNS 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">搜索域</label><textarea class="form-control" v-model="editingRange.options.domain_search" rows="2" placeholder="每行一个搜索域" /></div>
        <div class="form-row"><label class="form-label">SNTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.sntp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">SIP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.sip_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址或主机名后按回车" :custom-validator="validateIPv6OrFQDN" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.nis_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS+ 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.nisplus_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 域</label><input class="form-control" v-model="editingRange.options.nis_domain" placeholder="NIS domain name" /></div>
        <div class="form-row"><label class="form-label">NIS+ 域</label><input class="form-control" v-model="editingRange.options.nisplus_domain" placeholder="NIS+ domain name" /></div>
        <div class="form-row"><label class="form-label">强制门户 (Captive Portal)</label><input class="form-control" v-model="editingRange.options.captive_portal" placeholder="Captive portal API endpoint" /></div>
        <div class="form-row"><label class="form-label" title="Cisco 专用 TFTP 服务器，每个范围最多 2 个">Cisco TFTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingRange.options.cisco_tftp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
            <div class="form-hint">最多 2 个 IPv6 地址</div>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showMappingModal" title="静态映射" width="620px" @confirm="saveMapping" @close="showMappingModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingMapping.name" :disabled="!!editingMapping._name" placeholder="mapping01" /></div>
        <div class="form-row"><label class="form-label">DUID</label><input class="form-control" v-model="editingMapping.duid" placeholder="Client DUID" /></div>
        <div class="form-row"><label class="form-label">IPv6 地址</label><input class="form-control" v-model="editingMapping.ipv6_address" placeholder="IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">IPv6 前缀</label><input class="form-control" v-model="editingMapping.ipv6_prefix" placeholder="IPv6 前缀" /></div>
        <div class="form-row"><label class="form-label">MAC</label><input class="form-control" v-model="editingMapping.mac" placeholder="xx:xx:xx:xx:xx:xx" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingMapping.disable" /></div>
        <div class="form-row"><label class="form-label">DNS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.name_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 DNS 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">搜索域</label><textarea class="form-control" v-model="editingMapping.options.domain_search" rows="2" placeholder="每行一个搜索域" /></div>
        <div class="form-row"><label class="form-label">SNTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.sntp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">SIP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.sip_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址或主机名后按回车" :custom-validator="validateIPv6OrFQDN" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.nis_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS+ 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.nisplus_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
          </div>
        </div>
        <div class="form-row"><label class="form-label">NIS 域</label><input class="form-control" v-model="editingMapping.options.nis_domain" placeholder="NIS domain name" /></div>
        <div class="form-row"><label class="form-label">NIS+ 域</label><input class="form-control" v-model="editingMapping.options.nisplus_domain" placeholder="NIS+ domain name" /></div>
        <div class="form-row"><label class="form-label">强制门户 (Captive Portal)</label><input class="form-control" v-model="editingMapping.options.captive_portal" placeholder="Captive portal API endpoint" /></div>
        <div class="form-row"><label class="form-label" title="Cisco 专用 TFTP 服务器，每个映射最多 2 个">Cisco TFTP 服务器</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingMapping.options.cisco_tftp_server" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
            <div class="form-hint">最多 2 个 IPv6 地址</div>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showDelegationModal" title="前缀委派" width="620px" @confirm="saveDelegation" @close="showDelegationModal = false">
        <div class="form-row"><label class="form-label">前缀</label><input class="form-control" v-model="editingDelegation.prefix" :disabled="!!editingDelegation._prefix" placeholder="2001:db8::/48" /></div>
        <div class="form-row"><label class="form-label">委派长度</label>
          <div style="flex:1;">
            <input type="number" min="32" max="64" class="form-control" v-model="editingDelegation.delegated_length" placeholder="32-64" />
            <div class="form-hint">范围：32-64</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">前缀长度</label>
          <div style="flex:1;">
            <input type="number" min="32" max="64" class="form-control" v-model="editingDelegation.prefix_length" placeholder="32-64" />
            <div class="form-hint">范围：32-64</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">排除前缀</label><input class="form-control" v-model="editingDelegation.excluded_prefix" placeholder="IPv6 前缀" /></div>
        <div class="form-row"><label class="form-label">排除前缀长度</label>
          <div style="flex:1;">
            <input type="number" min="32" max="64" class="form-control" v-model="editingDelegation.excluded_prefix_length" placeholder="32-64" />
            <div class="form-hint">范围：32-64</div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
