import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const DNSSEC_OPTIONS = [
  { key: 'process-no-validate', label: 'process-no-validate（处理但不验证，默认）' },
  { key: 'ignore', label: 'ignore（忽略 DNSSEC）' },
  { key: 'validate', label: 'validate（验证 DNSSEC）' },
];

const IP_VERSION_OPTIONS = [
  { key: 'ipv4', label: 'IPv4（默认）' },
  { key: 'ipv6', label: 'IPv6' },
  { key: 'both', label: 'both' },
];

const DYNAMIC_PROTOCOL_OPTIONS = [
  '1984', 'changeip', 'cloudflare', 'digitalocean', 'dinahosting', 'dnsexit2', 'dnsmadeeasy',
  'domeneshop', 'dondominio', 'dslreports1', 'duckdns', 'dyndns1', 'dyndns2', 'easydns', 'enom',
  'freedns', 'freemyip', 'gandi', 'godaddy', 'googledomains', 'hetzner', 'infomaniak', 'keysystems',
  'mythicdyn', 'namecheap', 'nfsn', 'njalla', 'noip', 'nsupdate', 'ovh', 'regfishde', 'sitelutions',
  'woima', 'yandex', 'zoneedit1',
];

const ALLOW_FROM_OPTIONS = [
  '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16',
  '::1/128', 'fc00::/7', 'fe80::/10',
];

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

function firstValue(val) {
  const arr = toArray(val);
  return arr.length ? String(arr[0]) : '';
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

function validateIPPrefix(value) {
  if (!value) return '';
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = parseInt(prefix, 10);
    if (isNaN(p)) return '前缀必须为数字';
    const v4Err = validateIPv4(ip);
    const v6Err = validateIPv6(ip);
    if (!v4Err && (p < 0 || p > 32)) return 'IPv4 前缀范围 0-32';
    if (!v6Err && (p < 0 || p > 128)) return 'IPv6 前缀范围 0-128';
    if (v4Err && v6Err) return 'IP 地址或前缀格式错误';
    return '';
  }
  return validateIP(value);
}

function validateRange(value, min, max, name) {
  if (!isPresent(value)) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name} 范围为 ${min}-${max}`;
  return '';
}

function validateIPv6Prefix96(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'DNS64 前缀格式应为 IPv6/96';
  const err = validateIPv6(parts[0]);
  if (err) return err;
  const p = parseInt(parts[1], 10);
  if (isNaN(p) || p !== 96) return 'DNS64 前缀长度必须为 96';
  return '';
}

function validatePrefixExclusion(value) {
  if (!value) return '';
  const v = String(value).trim();
  const target = v.startsWith('!') ? v.slice(1) : v;
  if (!target) return '前缀不能为空';
  return validateIPPrefix(target);
}

function validateNetmaskOrDomain(value) {
  if (!value) return '';
  if (value.includes('/')) return validateIPPrefix(value);
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value) || /^[0-9a-fA-F:]+$/.test(value)) return validateIP(value);
  if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return '请输入有效域名或网段';
  return '';
}

function validateIPOrFQDN(value) {
  if (!value) return '';
  if (validateIP(value)) {
    if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return '请输入有效 IP 地址或 FQDN';
  }
  return '';
}

function validateConfigAuthPath(value) {
  if (!value) return '';
  if (!value.startsWith('/config/auth/')) return '密钥文件必须位于 /config/auth/ 目录下';
  return '';
}

function validateHostname(value) {
  if (!value) return '请输入主机名';
  if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return '主机名格式错误';
  return '';
}

function nameServersToForm(nameServers = {}) {
  return Object.entries(nameServers).map(([address, item]) => ({
    _address: address,
    address,
    port: item?.port !== undefined ? String(item.port) : '',
  }));
}

function nameServersToConfig(formNameServers) {
  const result = {};
  for (const ns of formNameServers || []) {
    if (!ns.address) continue;
    const item = {};
    if (isPresent(ns.port)) item.port = String(ns.port);
    result[ns.address] = item;
  }
  return result;
}

function domainsToForm(domains = {}) {
  return Object.entries(domains).map(([domain, item]) => ({
    _domain: domain,
    domain,
    name_servers: nameServersToForm(item['name-server']),
  }));
}

function authoritativeDomainsToForm(domains = {}) {
  return Object.entries(domains).map(([domain, item]) => ({
    _domain: domain,
    domain,
    disable: item.disable !== undefined,
  }));
}

function authoritativeDomainsToConfig(formDomains) {
  const result = {};
  for (const d of formDomains || []) {
    if (!d.domain) continue;
    const item = {};
    if (d.disable) item.disable = '';
    result[d.domain] = item;
  }
  return result;
}

function domainsToConfig(formDomains) {
  const result = {};
  for (const d of formDomains) {
    if (!d.domain) continue;
    const item = {};
    const nameServers = nameServersToConfig(d.name_servers || []);
    if (Object.keys(nameServers).length) item['name-server'] = nameServers;
    result[d.domain] = item;
  }
  return result;
}

function dynamicNamesToForm(names = {}) {
  return Object.entries(names).map(([name, item]) => {
    const address = item.address || {};
    const web = address.web || {};
    return {
      _name: name,
      name,
      address_type: address.interface !== undefined ? 'interface' : (address.web !== undefined ? 'web' : ''),
      address_interface: firstValue(address.interface),
      web_url: web.url || '',
      web_skip: web.skip || '',
      description: item.description || '',
      expiry_time: item['expiry-time'] !== undefined ? String(item['expiry-time']) : '',
      host_name: joinMembers(item['host-name']),
      ip_version: item['ip-version'] || 'ipv4',
      key: item.key || '',
      password: item.password || '',
      protocol: item.protocol || '',
      server: item.server || '',
      ttl: item.ttl !== undefined ? String(item.ttl) : '',
      username: item.username || '',
      wait_time: item['wait-time'] !== undefined ? String(item['wait-time']) : '',
      zone: item.zone || '',
    };
  });
}

function dynamicNamesToConfig(formNames) {
  const result = {};
  for (const n of formNames) {
    if (!n.name) continue;
    const item = {};
    if (n.address_type === 'interface' && isPresent(n.address_interface)) {
      item.address = { interface: n.address_interface };
    } else if (n.address_type === 'web') {
      const web = {};
      if (isPresent(n.web_url)) web.url = n.web_url;
      if (isPresent(n.web_skip)) web.skip = n.web_skip;
      if (Object.keys(web).length) item.address = { web };
    }
    if (isPresent(n.description)) item.description = n.description;
    if (isPresent(n.expiry_time)) item['expiry-time'] = String(n.expiry_time);
    const hostNames = splitMembers(n.host_name);
    if (hostNames.length) item['host-name'] = hostNames;
    if (isPresent(n.ip_version)) item['ip-version'] = n.ip_version;
    if (isPresent(n.key)) item.key = n.key;
    if (isPresent(n.password)) item.password = n.password;
    if (isPresent(n.protocol)) item.protocol = n.protocol;
    if (isPresent(n.server)) item.server = n.server;
    if (isPresent(n.ttl)) item.ttl = String(n.ttl);
    if (isPresent(n.username)) item.username = n.username;
    if (isPresent(n.wait_time)) item['wait-time'] = String(n.wait_time);
    if (isPresent(n.zone)) item.zone = n.zone;
    result[n.name] = item;
  }
  return result;
}

function dnsToForm(data = {}) {
  const forwarding = data.forwarding || {};
  const dynamic = data.dynamic || {};
  const options = forwarding.options || {};
  return {
    forwarding: {
      listen_address: toArray(forwarding['listen-address']),
      name_servers: nameServersToForm(forwarding['name-server']),
      cache_size: forwarding['cache-size'] !== undefined ? String(forwarding['cache-size']) : '10000',
      allow_from: toArray(forwarding['allow-from']),
      dnssec: forwarding.dnssec || 'process-no-validate',
      port: forwarding.port !== undefined ? String(forwarding.port) : '53',
      timeout: forwarding.timeout !== undefined ? String(forwarding.timeout) : '1500',
      negative_ttl: forwarding['negative-ttl'] !== undefined ? String(forwarding['negative-ttl']) : '3600',
      source_address: toArray(forwarding['source-address']),
      system: forwarding.system !== undefined,
      ignore_hosts_file: forwarding['ignore-hosts-file'] !== undefined,
      no_serve_rfc1918: forwarding['no-serve-rfc1918'] !== undefined,
      authoritative_domain: authoritativeDomainsToForm(forwarding['authoritative-domain']),
      dhcp: toArray(forwarding.dhcp),
      dns64_prefix: forwarding['dns64-prefix'] || '',
      exclude_throttle_address: toArray(forwarding['exclude-throttle-address']),
      serve_stale_extension: forwarding['serve-stale-extension'] !== undefined ? String(forwarding['serve-stale-extension']) : '0',
      options: {
        ecs_add_for: toArray(options['ecs-add-for']),
        ecs_ipv4_bits: options['ecs-ipv4-bits'] !== undefined ? String(options['ecs-ipv4-bits']) : '',
        edns_subnet_allow_list: toArray(options['edns-subnet-allow-list']),
      },
    },
    domains: domainsToForm(forwarding['domain']),
    dynamic: {
      interval: dynamic.interval !== undefined ? String(dynamic.interval) : '300',
      vrf: dynamic.vrf || '',
      names: dynamicNamesToForm(dynamic['name']),
    },
  };
}

function dnsToConfig(form) {
  const result = {};
  const forwarding = {};
  const f = form.forwarding || {};
  if (f.listen_address?.length) forwarding['listen-address'] = [...f.listen_address];
  const globalNameServers = nameServersToConfig(f.name_servers || []);
  if (Object.keys(globalNameServers).length) forwarding['name-server'] = globalNameServers;
  if (isPresent(f.cache_size)) forwarding['cache-size'] = String(f.cache_size);
  if (f.allow_from?.length) forwarding['allow-from'] = [...f.allow_from];
  if (isPresent(f.dnssec)) forwarding.dnssec = String(f.dnssec);
  if (isPresent(f.port)) forwarding.port = String(f.port);
  if (isPresent(f.timeout)) forwarding.timeout = String(f.timeout);
  if (isPresent(f.negative_ttl)) forwarding['negative-ttl'] = String(f.negative_ttl);
  if (f.source_address?.length) forwarding['source-address'] = [...f.source_address];
  if (f.system) forwarding.system = '';
  if (f.ignore_hosts_file) forwarding['ignore-hosts-file'] = '';
  if (f.no_serve_rfc1918) forwarding['no-serve-rfc1918'] = '';
  if (f.dhcp?.length) forwarding.dhcp = [...f.dhcp];
  if (isPresent(f.dns64_prefix)) forwarding['dns64-prefix'] = f.dns64_prefix;
  if (f.exclude_throttle_address?.length) forwarding['exclude-throttle-address'] = [...f.exclude_throttle_address];
  if (isPresent(f.serve_stale_extension)) forwarding['serve-stale-extension'] = String(f.serve_stale_extension);

  const authDomains = authoritativeDomainsToConfig(f.authoritative_domain || []);
  if (Object.keys(authDomains).length) forwarding['authoritative-domain'] = authDomains;

  const options = {};
  if (f.options?.ecs_add_for?.length) options['ecs-add-for'] = [...f.options.ecs_add_for];
  if (isPresent(f.options?.ecs_ipv4_bits)) options['ecs-ipv4-bits'] = String(f.options.ecs_ipv4_bits);
  if (f.options?.edns_subnet_allow_list?.length) options['edns-subnet-allow-list'] = [...f.options.edns_subnet_allow_list];
  if (Object.keys(options).length) forwarding.options = options;

  const domains = domainsToConfig(form.domains || []);
  if (Object.keys(domains).length) forwarding.domain = domains;

  if (Object.keys(forwarding).length) result.forwarding = forwarding;

  const dynamic = {};
  const d = form.dynamic || {};
  if (isPresent(d.interval)) dynamic.interval = String(d.interval);
  if (isPresent(d.vrf)) dynamic.vrf = String(d.vrf);
  const names = dynamicNamesToConfig(d.names || []);
  if (Object.keys(names).length) dynamic.name = names;
  if (Object.keys(dynamic).length) result.dynamic = dynamic;

  return result;
}

export default defineComponent({
  name: 'DnsPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dnsToForm());
    const activeTab = ref('forwarding');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const localAddresses = computed(() => {
      const addresses = new Set();
      for (const iface of interfaces.value) {
        for (const ip of toArray(iface.ipv4_address)) addresses.add(String(ip).split('/')[0]);
        for (const ip of toArray(iface.ipv6_address)) addresses.add(String(ip).split('/')[0]);
      }
      addresses.add('127.0.0.1');
      addresses.add('::1');
      addresses.add('0.0.0.0');
      return Array.from(addresses).filter(Boolean).sort();
    });

    const interfaceNames = computed(() => {
      return interfaces.value.map(i => i.name).sort();
    });

    const showAdvanced = ref(false);

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
        case 'domain': return 'service dns forwarding domain';
        case 'authoritative': return 'service dns forwarding authoritative-domain';
        case 'dynamic': return 'service dns dynamic';
        case 'forwarding':
        default: return 'service dns forwarding';
      }
    });

    const domainColumns = [
      { key: 'domain', title: '域名' },
      { key: 'name_servers', title: 'DNS 服务器', render: (v) => (v || []).map(ns => ns.port ? `${ns.address}:${ns.port}` : ns.address).join(', ') },
    ];

    const selectedDomain = ref([]);
    const showDomainModal = ref(false);
    const editingDomain = ref({});

    const selectedDomainNameServer = ref([]);
    const showDomainNameServerModal = ref(false);
    const editingDomainNameServer = ref({});

    const nameServerColumns = [
      { key: 'address', title: '地址' },
      { key: 'port', title: '端口', render: v => isPresent(v) ? v : '53（默认）' },
    ];

    const selectedNameServer = ref([]);
    const showNameServerModal = ref(false);
    const editingNameServer = ref({});

    const dynamicColumns = [
      { key: 'name', title: '名称' },
      { key: 'protocol', title: '协议' },
      { key: 'server', title: '服务器' },
      { key: 'host_name', title: '主机名', render: v => splitMembers(v).join(', ') },
      { key: 'address_type', title: '地址来源', render: v => v === 'interface' ? '接口' : (v === 'web' ? 'Web' : '-') },
    ];

    const selectedDynamic = ref([]);
    const showDynamicModal = ref(false);
    const editingDynamic = ref({});

    const authoritativeColumns = [
      { key: 'domain', title: '域名' },
      { key: 'disable', title: '状态', render: v => v ? '禁用' : '启用' },
    ];

    const selectedAuthoritative = ref([]);
    const showAuthoritativeModal = ref(false);
    const editingAuthoritative = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dns', true);
        config.value = dnsToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const f = config.value.forwarding || {};
      let err = validateRange(f.port, 1, 65535, '端口');
      if (err) return alert(err + '，默认 53');
      err = validateRange(f.timeout, 10, 60000, '超时时间');
      if (err) return alert(err + ' 毫秒，默认 1500');
      err = validateRange(f.cache_size, 0, 2147483647, '缓存大小');
      if (err) return alert(err + '，默认 10000');
      err = validateRange(f.negative_ttl, 0, 7200, '负缓存 TTL');
      if (err) return alert(err + ' 秒，默认 3600');

      for (const ip of f.listen_address || []) {
        err = validateIP(ip);
        if (err) return alert(`监听地址 ${ip}：${err}`);
      }
      const nameServerAddresses = new Set();
      for (const ns of f.name_servers || []) {
        if (!ns.address) return alert('上游 DNS 服务器地址不能为空');
        if (nameServerAddresses.has(ns.address)) return alert(`上游 DNS 服务器 ${ns.address} 重复`);
        nameServerAddresses.add(ns.address);
        err = validateIP(ns.address);
        if (err) return alert(`上游 DNS 服务器 ${ns.address}：${err}`);
        err = validateRange(ns.port, 1, 65535, '端口');
        if (err) return alert(`上游 DNS 服务器 ${ns.address} 端口：${err}`);
      }
      for (const item of f.allow_from || []) {
        err = validateIPPrefix(item);
        if (err) return alert(`允许查询网络 ${item}：${err}`);
      }
      for (const ip of f.source_address || []) {
        err = validateIP(ip);
        if (err) return alert(`源地址 ${ip}：${err}`);
      }
      for (const ip of f.exclude_throttle_address || []) {
        err = validateIPPrefix(ip);
        if (err) return alert(`排除节流地址 ${ip}：${err}`);
      }
      err = validateIPv6Prefix96(f.dns64_prefix);
      if (err) return alert(`DNS64 前缀：${err}`);
      err = validateRange(f.serve_stale_extension, 0, 65535, '过期 TTL 扩展次数');
      if (err) return alert(err + '，默认 0');

      const opts = f.options || {};
      for (const item of opts.ecs_add_for || []) {
        err = validatePrefixExclusion(item);
        if (err) return alert(`EDNS Client Subnet 匹配前缀 ${item}：${err}`);
      }
      err = validateRange(opts.ecs_ipv4_bits, 0, 32, 'ECS IPv4 位数');
      if (err) return alert(err);
      for (const item of opts.edns_subnet_allow_list || []) {
        err = validateNetmaskOrDomain(item);
        if (err) return alert(`EDNS Subnet 允许列表 ${item}：${err}`);
      }

      const authNames = new Set();
      for (const a of f.authoritative_domain || []) {
        if (!a.domain) return alert('权威域名称不能为空');
        if (authNames.has(a.domain)) return alert(`权威域 ${a.domain} 重复`);
        authNames.add(a.domain);
      }

      const d = config.value.dynamic || {};
      err = validateRange(d.interval, 60, 3600, 'Dynamic DNS 更新间隔');
      if (err) return alert(err + ' 秒，默认 300');

      for (const n of d.names || []) {
        if (!n.name) return alert('Dynamic DNS 名称不能为空');
        if (!n.protocol) return alert(`Dynamic DNS ${n.name} 协议不能为空`);
        if (n.address_type === 'interface' && !n.address_interface) return alert(`Dynamic DNS ${n.name} 请选择接口`);
        if (n.address_type === 'web' && !n.web_url) return alert(`Dynamic DNS ${n.name} Web URL 不能为空`);
        const hostNames = splitMembers(n.host_name);
        if (!hostNames.length) return alert(`Dynamic DNS ${n.name} 请至少输入一个主机名`);
        for (const h of hostNames) {
          err = validateHostname(h);
          if (err) return alert(`Dynamic DNS ${n.name} 主机名 ${h}：${err}`);
        }
        err = validateIPOrFQDN(n.server);
        if (err) return alert(`Dynamic DNS ${n.name} 服务器：${err}`);
        err = validateConfigAuthPath(n.key);
        if (err) return alert(`Dynamic DNS ${n.name} 密钥文件：${err}`);
        err = validateRange(n.expiry_time, 300, 2160000, '过期时间');
        if (err) return alert(`Dynamic DNS ${n.name} ${err} 秒`);
        err = validateRange(n.wait_time, 60, 86400, '等待时间');
        if (err) return alert(`Dynamic DNS ${n.name} ${err} 秒`);
        err = validateRange(n.ttl, 0, 2147483647, 'TTL');
        if (err) return alert(`Dynamic DNS ${n.name} ${err} 秒`);
      }

      for (const dItem of config.value.domains || []) {
        if (!dItem.domain) return alert('域名转发条目中域名不能为空');
        if (!dItem.name_servers?.length) return alert(`域名 ${dItem.domain} 至少需要填写一个 DNS 服务器`);
        const domainNsAddresses = new Set();
        for (const ns of dItem.name_servers) {
          if (!ns.address) return alert(`域名 ${dItem.domain} 的 DNS 服务器地址不能为空`);
          if (domainNsAddresses.has(ns.address)) return alert(`域名 ${dItem.domain} 的 DNS 服务器 ${ns.address} 重复`);
          domainNsAddresses.add(ns.address);
          err = validateIP(ns.address);
          if (err) return alert(`域名 ${dItem.domain} 的 DNS 服务器 ${ns.address}：${err}`);
          err = validateRange(ns.port, 1, 65535, '端口');
          if (err) return alert(`域名 ${dItem.domain} 的 DNS 服务器 ${ns.address} 端口：${err}`);
        }
      }

      saving.value = true;
      try {
        await configApi.set('service dns', dnsToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createDomain() {
      editingDomain.value = { domain: '', name_servers: [] };
      showDomainModal.value = true;
    }

    function editDomain() {
      if (!selectedDomain.value.length) return alert('请选择要编辑的域名转发');
      const row = (config.value.domains || []).find(d => d._domain === selectedDomain.value[0]);
      if (!row) return alert('未找到选中的域名转发');
      editingDomain.value = { ...row };
      showDomainModal.value = true;
    }

    function removeDomain() {
      if (!selectedDomain.value.length) return alert('请选择要删除的域名转发');
      config.value.domains = (config.value.domains || []).filter(d => d._domain !== selectedDomain.value[0]);
      selectedDomain.value = [];
    }

    function saveDomain() {
      if (!editingDomain.value.domain) return alert('请输入域名');
      if (!editingDomain.value.name_servers?.length) return alert('请输入至少一个 DNS 服务器');
      const domainNsAddresses = new Set();
      for (const ns of editingDomain.value.name_servers) {
        if (!ns.address) return alert('DNS 服务器地址不能为空');
        if (domainNsAddresses.has(ns.address)) return alert(`DNS 服务器 ${ns.address} 重复`);
        domainNsAddresses.add(ns.address);
        let err = validateIP(ns.address);
        if (err) return alert(`DNS 服务器 ${ns.address}：${err}`);
        err = validateRange(ns.port, 1, 65535, '端口');
        if (err) return alert(`DNS 服务器 ${ns.address} 端口：${err}`);
      }
      const row = { ...editingDomain.value };
      if (!row._domain) row._domain = row.domain;
      const list = config.value.domains || [];
      const idx = list.findIndex(d => d._domain === row._domain);
      if (idx >= 0 && !editingDomain.value._domain) return alert('该域名已存在');
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      config.value.domains = [...list];
      selectedDomain.value = [];
      showDomainModal.value = false;
    }

    function createDomainNameServer() {
      editingDomainNameServer.value = { address: '', port: '' };
      showDomainNameServerModal.value = true;
    }

    function editDomainNameServer() {
      if (!selectedDomainNameServer.value.length) return alert('请选择要编辑的 DNS 服务器');
      const row = (editingDomain.value.name_servers || []).find(ns => ns._address === selectedDomainNameServer.value[0]);
      if (!row) return alert('未找到选中的 DNS 服务器');
      editingDomainNameServer.value = { ...row };
      showDomainNameServerModal.value = true;
    }

    function removeDomainNameServer() {
      if (!selectedDomainNameServer.value.length) return alert('请选择要删除的 DNS 服务器');
      editingDomain.value.name_servers = (editingDomain.value.name_servers || []).filter(ns => ns._address !== selectedDomainNameServer.value[0]);
      selectedDomainNameServer.value = [];
    }

    function saveDomainNameServer() {
      if (!editingDomainNameServer.value.address) return alert('请输入 DNS 服务器地址');
      let err = validateIP(editingDomainNameServer.value.address);
      if (err) return alert(`DNS 服务器地址：${err}`);
      err = validateRange(editingDomainNameServer.value.port, 1, 65535, '端口');
      if (err) return alert(`端口：${err}`);
      const row = { ...editingDomainNameServer.value };
      if (!row._address) row._address = row.address;
      const list = editingDomain.value.name_servers || [];
      const idx = list.findIndex(ns => ns._address === row._address);
      if (idx >= 0 && !editingDomainNameServer.value._address) return alert('该 DNS 服务器已存在');
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      editingDomain.value.name_servers = [...list];
      selectedDomainNameServer.value = [];
      showDomainNameServerModal.value = false;
    }

    function createNameServer() {
      editingNameServer.value = { address: '', port: '' };
      showNameServerModal.value = true;
    }

    function editNameServer() {
      if (!selectedNameServer.value.length) return alert('请选择要编辑的上游 DNS 服务器');
      const row = (config.value.forwarding.name_servers || []).find(ns => ns._address === selectedNameServer.value[0]);
      if (!row) return alert('未找到选中的上游 DNS 服务器');
      editingNameServer.value = { ...row };
      showNameServerModal.value = true;
    }

    function removeNameServer() {
      if (!selectedNameServer.value.length) return alert('请选择要删除的上游 DNS 服务器');
      config.value.forwarding.name_servers = (config.value.forwarding.name_servers || []).filter(ns => ns._address !== selectedNameServer.value[0]);
      selectedNameServer.value = [];
    }

    function saveNameServer() {
      if (!editingNameServer.value.address) return alert('请输入 DNS 服务器地址');
      let err = validateIP(editingNameServer.value.address);
      if (err) return alert(`DNS 服务器地址：${err}`);
      err = validateRange(editingNameServer.value.port, 1, 65535, '端口');
      if (err) return alert(`端口：${err}`);
      const row = { ...editingNameServer.value };
      if (!row._address) row._address = row.address;
      const list = config.value.forwarding.name_servers || [];
      const idx = list.findIndex(ns => ns._address === row._address);
      if (idx >= 0 && !editingNameServer.value._address) return alert('该 DNS 服务器已存在');
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      config.value.forwarding.name_servers = [...list];
      selectedNameServer.value = [];
      showNameServerModal.value = false;
    }

    function createDynamic() {
      editingDynamic.value = {
        name: '', address_type: 'interface', address_interface: '', web_url: '', web_skip: '',
        description: '', expiry_time: '', host_name: '', ip_version: 'ipv4', key: '', password: '',
        protocol: '', server: '', ttl: '', username: '', wait_time: '', zone: '',
      };
      showDynamicModal.value = true;
    }

    function editDynamic() {
      if (!selectedDynamic.value.length) return alert('请选择要编辑的 Dynamic DNS');
      const row = (config.value.dynamic.names || []).find(n => n._name === selectedDynamic.value[0]);
      if (!row) return alert('未找到选中的 Dynamic DNS');
      editingDynamic.value = { ...row };
      showDynamicModal.value = true;
    }

    function removeDynamic() {
      if (!selectedDynamic.value.length) return alert('请选择要删除的 Dynamic DNS');
      config.value.dynamic.names = (config.value.dynamic.names || []).filter(n => n._name !== selectedDynamic.value[0]);
      selectedDynamic.value = [];
    }

    function saveDynamic() {
      if (!editingDynamic.value.name) return alert('请输入 Dynamic DNS 名称');
      const hostNames = splitMembers(editingDynamic.value.host_name);
      if (!hostNames.length) return alert('请至少输入一个主机名');
      for (const h of hostNames) {
        const err = validateHostname(h);
        if (err) return alert(`主机名 ${h}：${err}`);
      }
      let err = validateIPOrFQDN(editingDynamic.value.server);
      if (err) return alert(`服务器：${err}`);
      err = validateConfigAuthPath(editingDynamic.value.key);
      if (err) return alert(`密钥文件：${err}`);
      err = validateRange(editingDynamic.value.expiry_time, 300, 2160000, '过期时间');
      if (err) return alert(err + ' 秒');
      err = validateRange(editingDynamic.value.wait_time, 60, 86400, '等待时间');
      if (err) return alert(err + ' 秒');
      err = validateRange(editingDynamic.value.ttl, 0, 2147483647, 'TTL');
      if (err) return alert(err + ' 秒');

      const row = { ...editingDynamic.value };
      if (!row._name) row._name = row.name;
      const list = config.value.dynamic.names || [];
      const idx = list.findIndex(n => n._name === row._name);
      if (idx >= 0 && !editingDynamic.value._name) return alert('该名称已存在');
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      config.value.dynamic.names = [...list];
      selectedDynamic.value = [];
      showDynamicModal.value = false;
    }

    function createAuthoritative() {
      editingAuthoritative.value = { domain: '', disable: false };
      showAuthoritativeModal.value = true;
    }

    function editAuthoritative() {
      if (!selectedAuthoritative.value.length) return alert('请选择要编辑的权威域');
      const row = (config.value.forwarding.authoritative_domain || []).find(a => a._domain === selectedAuthoritative.value[0]);
      if (!row) return alert('未找到选中的权威域');
      editingAuthoritative.value = { ...row };
      showAuthoritativeModal.value = true;
    }

    function removeAuthoritative() {
      if (!selectedAuthoritative.value.length) return alert('请选择要删除的权威域');
      config.value.forwarding.authoritative_domain = (config.value.forwarding.authoritative_domain || []).filter(a => a._domain !== selectedAuthoritative.value[0]);
      selectedAuthoritative.value = [];
    }

    function saveAuthoritative() {
      if (!editingAuthoritative.value.domain) return alert('请输入权威域名称');
      const row = { ...editingAuthoritative.value };
      if (!row._domain) row._domain = row.domain;
      const list = config.value.forwarding.authoritative_domain || [];
      const idx = list.findIndex(a => a._domain === row._domain);
      if (idx >= 0 && !editingAuthoritative.value._domain) return alert('该权威域已存在');
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      config.value.forwarding.authoritative_domain = [...list];
      selectedAuthoritative.value = [];
      showAuthoritativeModal.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, localAddresses, interfaceNames, commandPath, showAdvanced,
      domainColumns, selectedDomain, showDomainModal, editingDomain,
      selectedDomainNameServer, showDomainNameServerModal, editingDomainNameServer,
      nameServerColumns, selectedNameServer, showNameServerModal, editingNameServer,
      dynamicColumns, selectedDynamic, showDynamicModal, editingDynamic,
      authoritativeColumns, selectedAuthoritative, showAuthoritativeModal, editingAuthoritative,
      load, save, createDomain, editDomain, removeDomain, saveDomain,
      createDomainNameServer, editDomainNameServer, removeDomainNameServer, saveDomainNameServer,
      createNameServer, editNameServer, removeNameServer, saveNameServer,
      createDynamic, editDynamic, removeDynamic, saveDynamic,
      createAuthoritative, editAuthoritative, removeAuthoritative, saveAuthoritative,
      DNSSEC_OPTIONS, IP_VERSION_OPTIONS, DYNAMIC_PROTOCOL_OPTIONS, ALLOW_FROM_OPTIONS,
      validateIP, validateIPPrefix, validateIPv6Prefix96, validatePrefixExclusion, validateNetmaskOrDomain, validateIPOrFQDN, validateConfigAuthPath, validateHostname,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'forwarding', title: '转发' },
        { key: 'domain', title: '域名转发' },
        { key: 'authoritative', title: '权威域' },
        { key: 'dynamic', title: 'Dynamic DNS' }
      ]">

        <template #forwarding>
          <div class="form-row">
            <label class="form-label" title="DNS 转发监听地址">监听地址</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.listen_address" :options="localAddresses" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IP 地址后按回车" :custom-validator="validateIP" />
              <div class="form-hint">点击可选列表右侧的 + 号添加自定义监听地址</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="上游 DNS 服务器地址">上游 DNS 服务器</label>
            <div style="flex:1;max-width:600px;">
              <div class="toolbar" style="padding-left:0;">
                <ToolbarButton icon="create" @click="createNameServer">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editNameServer" :disabled="!selectedNameServer.length || selectedNameServer.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeNameServer" :disabled="!selectedNameServer.length">删除</ToolbarButton>
              </div>
              <DataTable :columns="nameServerColumns" :data="config.forwarding.name_servers" row-key="address" :externalToolbar="true" @selection-change="selectedNameServer = $event" :selectable="true" />
              <div class="form-hint">每条记录可配置独立端口，默认 53</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="允许查询 DNS 的客户端网络">允许查询网络</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.allow_from" :options="ALLOW_FROM_OPTIONS" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IP 或网段后按回车" :custom-validator="validateIPPrefix" />
              <div class="form-hint">点击可选列表右侧的 + 号添加自定义允许查询网络</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="DNS 转发源地址，默认 0.0.0.0, ::">源地址</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.source_address" :options="localAddresses" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IP 地址后按回车" :custom-validator="validateIP" />
              <div class="form-hint">点击可选列表右侧的 + 号添加自定义源地址</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="DNS 转发监听端口，默认 53">端口</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.forwarding.port" placeholder="1-65535，默认 53" />
              <div class="form-hint">默认：53，范围：1-65535</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="等待远程权威服务器响应的毫秒数，默认 1500">超时 (毫秒)</label>
            <div style="flex:1;">
              <input type="number" min="10" max="60000" class="form-control" v-model="config.forwarding.timeout" placeholder="10-60000，默认 1500" />
              <div class="form-hint">默认：1500，范围：10-60000 毫秒</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="DNS 缓存条目数，默认 10000">缓存大小</label>
            <div style="flex:1;">
              <input type="number" min="0" max="2147483647" class="form-control" v-model="config.forwarding.cache_size" placeholder="0-2147483647，默认 10000" />
              <div class="form-hint">默认：10000，范围：0-2147483647</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="负缓存最大时间，默认 3600 秒">负缓存 TTL (秒)</label>
            <div style="flex:1;">
              <input type="number" min="0" max="7200" class="form-control" v-model="config.forwarding.negative_ttl" placeholder="0-7200，默认 3600" />
              <div class="form-hint">默认：3600，范围：0-7200 秒</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="DNSSEC 模式，默认 process-no-validate">DNSSEC</label>
            <select class="form-control" v-model="config.forwarding.dnssec">
              <option v-for="o in DNSSEC_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label" title="使用系统名称服务器">使用系统名称服务器</label><input type="checkbox" v-model="config.forwarding.system" /></div>
          <div class="form-row"><label class="form-label" title="不在名称解析中使用本地 /etc/hosts">忽略 hosts 文件</label><input type="checkbox" v-model="config.forwarding.ignore_hosts_file" /></div>
          <div class="form-row"><label class="form-label" title="使服务器对 RFC1918 地址无权威响应">不服务 RFC1918</label><input type="checkbox" v-model="config.forwarding.no_serve_rfc1918" /></div>
          <div class="form-row">
            <label class="form-label" title="使用 DHCP 客户端名称服务器转发请求的接口">DHCP 接口</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.dhcp" :options="interfaceNames" title-left="可选" title-right="已选" />
              <div class="form-hint">从本地接口列表中选择</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="IPv6-only 客户端与 IPv4-only 服务器通信的 DNS64 前缀">DNS64 前缀</label>
            <div style="flex:1;">
              <input class="form-control" v-model="config.forwarding.dns64_prefix" placeholder="例如 64:ff9b::/96" />
              <div class="form-hint">格式：IPv6/96</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="从节流排除的 IP 地址或子网">排除节流地址</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.exclude_throttle_address" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IP 或网段后按回车" :custom-validator="validateIPPrefix" />
              <div class="form-hint">点击可选列表右侧的 + 号添加</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="过期记录 TTL 按 30 秒延长的次数，默认 0">过期 TTL 扩展次数</label>
            <div style="flex:1;">
              <input type="number" min="0" max="65535" class="form-control" v-model="config.forwarding.serve_stale_extension" placeholder="0-65535，默认 0" />
              <div class="form-hint">默认：0，范围：0-65535</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div style="flex:1;">
              <button type="button" class="toolbar-btn" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起高级选项' : '展开高级选项' }}</button>
            </div>
          </div>
          <div v-if="showAdvanced" style="border:1px solid var(--color-border);padding:12px;border-radius:2px;margin-bottom:12px;">
            <div class="form-row">
              <label class="form-label" title="启用 EDNS Client Subnet 的客户端网">ECS 添加前缀</label>
              <div style="flex:1;max-width:600px;">
                <DualListSelector v-model="config.forwarding.options.ecs_add_for" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入前缀，支持 ! 取反" :custom-validator="validatePrefixExclusion" />
                <div class="form-hint">支持 IPv4/IPv6 前缀，可加 ! 取反</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label" title="EDNS Client Subnet 传递的 IPv4 地址位数">ECS IPv4 位数</label>
              <div style="flex:1;">
                <input type="number" min="0" max="32" class="form-control" v-model="config.forwarding.options.ecs_ipv4_bits" placeholder="0-32" />
                <div class="form-hint">范围：0-32</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label" title="启用 EDNS Subnet 的域名或网段">EDNS Subnet 允许列表</label>
              <div style="flex:1;max-width:600px;">
                <DualListSelector v-model="config.forwarding.options.edns_subnet_allow_list" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入域名或网段后按回车" :custom-validator="validateNetmaskOrDomain" />
                <div class="form-hint">点击可选列表右侧的 + 号添加域名或网段</div>
              </div>
            </div>
          </div>
        </template>

        <template #domain>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createDomain">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDomain" :disabled="!selectedDomain.length || selectedDomain.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDomain" :disabled="!selectedDomain.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="domainColumns" :data="config.domains" row-key="domain" :externalToolbar="true" @selection-change="selectedDomain = $event" :selectable="true" />
        </template>

        <template #authoritative>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createAuthoritative">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editAuthoritative" :disabled="!selectedAuthoritative.length || selectedAuthoritative.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeAuthoritative" :disabled="!selectedAuthoritative.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="authoritativeColumns" :data="config.forwarding.authoritative_domain" row-key="domain" :externalToolbar="true" @selection-change="selectedAuthoritative = $event" :selectable="true" />
        </template>

        <template #dynamic>
          <div class="form-row">
            <label class="form-label" title="Dynamic DNS 更新间隔，默认 300 秒，范围 60-3600">更新间隔 (秒)</label>
            <div style="flex:1;">
              <input type="number" min="60" max="3600" class="form-control" v-model="config.dynamic.interval" placeholder="60-3600，默认 300" />
              <div class="form-hint">默认：300，范围：60-3600 秒</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" title="Dynamic DNS 所属 VRF">VRF</label><input class="form-control" v-model="config.dynamic.vrf" placeholder="VRF 名称" /></div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createDynamic">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDynamic" :disabled="!selectedDynamic.length || selectedDynamic.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDynamic" :disabled="!selectedDynamic.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="dynamicColumns" :data="config.dynamic.names" row-key="name" :externalToolbar="true" @selection-change="selectedDynamic = $event" :selectable="true" />
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showDomainModal" title="域名转发" width="560px" @confirm="saveDomain" @close="showDomainModal = false">
        <div class="form-row"><label class="form-label">域名</label><input class="form-control" v-model="editingDomain.domain" :disabled="!!editingDomain._domain" placeholder="example.com" /></div>
        <div class="form-row">
          <label class="form-label">DNS 服务器</label>
          <div style="flex:1;">
            <div class="toolbar" style="padding-left:0;">
              <ToolbarButton icon="create" @click="createDomainNameServer">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editDomainNameServer" :disabled="!selectedDomainNameServer.length || selectedDomainNameServer.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeDomainNameServer" :disabled="!selectedDomainNameServer.length">删除</ToolbarButton>
            </div>
            <DataTable :columns="nameServerColumns" :data="editingDomain.name_servers" row-key="address" :externalToolbar="true" @selection-change="selectedDomainNameServer = $event" :selectable="true" />
            <div class="form-hint">每条记录可配置独立端口，默认 53</div>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showDomainNameServerModal" title="DNS 服务器" @confirm="saveDomainNameServer" @close="showDomainNameServerModal = false">
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editingDomainNameServer.address" :disabled="!!editingDomainNameServer._address" placeholder="IPv4 / IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="editingDomainNameServer.port" placeholder="1-65535，默认 53" /><div class="form-hint">默认：53，范围：1-65535</div></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showNameServerModal" title="上游 DNS 服务器" @confirm="saveNameServer" @close="showNameServerModal = false">
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editingNameServer.address" :disabled="!!editingNameServer._address" placeholder="IPv4 / IPv6 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="editingNameServer.port" placeholder="1-65535，默认 53" /><div class="form-hint">默认：53，范围：1-65535</div></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showDynamicModal" title="Dynamic DNS" width="560px" @confirm="saveDynamic" @close="showDynamicModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingDynamic.name" :disabled="!!editingDynamic._name" placeholder="服务名称" /></div>
        <div class="form-row"><label class="form-label">协议</label>
          <select class="form-control" v-model="editingDynamic.protocol">
            <option value="">请选择协议</option>
            <option v-for="p in DYNAMIC_PROTOCOL_OPTIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">服务器</label><input class="form-control" v-model="editingDynamic.server" placeholder="IP 地址或 FQDN" /></div>
        <div class="form-row"><label class="form-label">主机名</label><textarea class="form-control" v-model="editingDynamic.host_name" rows="2" placeholder="每行一个主机名（必填）" /></div>
        <div class="form-row"><label class="form-label">地址来源</label>
          <select class="form-control" v-model="editingDynamic.address_type">
            <option value="">未选择</option>
            <option value="interface">接口</option>
            <option value="web">Web</option>
          </select>
        </div>
        <div class="form-row" v-if="editingDynamic.address_type === 'interface'"><label class="form-label">接口</label>
          <select class="form-control" v-model="editingDynamic.address_interface">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
          </select>
        </div>
        <template v-if="editingDynamic.address_type === 'web'">
          <div class="form-row"><label class="form-label">Web URL</label><input class="form-control" v-model="editingDynamic.web_url" placeholder="https://..." /></div>
          <div class="form-row"><label class="form-label">跳过模式</label><input class="form-control" v-model="editingDynamic.web_skip" placeholder="从响应中排除的模式" /></div>
        </template>
        <div class="form-row"><label class="form-label">IP 版本</label>
          <select class="form-control" v-model="editingDynamic.ip_version">
            <option v-for="o in IP_VERSION_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">用户名</label><input class="form-control" v-model="editingDynamic.username" placeholder="认证用户名" /></div>
        <div class="form-row"><label class="form-label">密码</label><input type="password" class="form-control" v-model="editingDynamic.password" placeholder="认证密码" /></div>
        <div class="form-row"><label class="form-label">密钥文件</label><input class="form-control" v-model="editingDynamic.key" placeholder="/config/auth/..." /><div class="form-hint">必须位于 /config/auth/ 目录</div></div>
        <div class="form-row"><label class="form-label">区域</label><input class="form-control" v-model="editingDynamic.zone" placeholder="DNS 区域" /></div>
        <div class="form-row"><label class="form-label">TTL (秒)</label><input type="number" min="0" max="2147483647" class="form-control" v-model="editingDynamic.ttl" placeholder="0-2147483647" /><div class="form-hint">范围：0-2147483647</div></div>
        <div class="form-row"><label class="form-label">过期时间 (秒)</label><input type="number" min="300" max="2160000" class="form-control" v-model="editingDynamic.expiry_time" placeholder="300-2160000" /><div class="form-hint">范围：300-2160000</div></div>
        <div class="form-row"><label class="form-label">等待时间 (秒)</label><input type="number" min="60" max="86400" class="form-control" v-model="editingDynamic.wait_time" placeholder="60-86400" /><div class="form-hint">范围：60-86400</div></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingDynamic.description" placeholder="描述" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showAuthoritativeModal" title="权威域" @confirm="saveAuthoritative" @close="showAuthoritativeModal = false">
        <div class="form-row"><label class="form-label">域名</label><input class="form-control" v-model="editingAuthoritative.domain" :disabled="!!editingAuthoritative._domain" placeholder="example.com" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingAuthoritative.disable" /></div>
      </DraggableModal>
    </div>
  `,
});
