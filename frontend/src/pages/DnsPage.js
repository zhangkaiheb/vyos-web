import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

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
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dnsToForm());
    const activeTab = ref('forwarding');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const DNSSEC_OPTIONS = [
      { key: 'process-no-validate', label: t('dns.dnssec.processNoValidate') },
      { key: 'ignore', label: t('dns.dnssec.ignore') },
      { key: 'validate', label: t('dns.dnssec.validate') },
    ];

    const IP_VERSION_OPTIONS = [
      { key: 'ipv4', label: t('dns.ipVersion.ipv4') },
      { key: 'ipv6', label: t('dns.ipVersion.ipv6') },
      { key: 'both', label: 'both' },
    ];

    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('dns.validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('dns.validation.ipv4Format');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('dns.validation.ipv6Format');
      return '';
    }

    function validateIP(value) {
      if (!value) return '';
      if (!validateIPv4(value)) return '';
      if (!validateIPv6(value)) return '';
      return t('dns.validation.ipFormat');
    }

    function validateIPPrefix(value) {
      if (!value) return '';
      if (value.includes('/')) {
        const [ip, prefix] = value.split('/');
        const p = parseInt(prefix, 10);
        if (isNaN(p)) return t('dns.validation.prefixMustBeNumber');
        const v4Err = validateIPv4(ip);
        const v6Err = validateIPv6(ip);
        if (!v4Err && (p < 0 || p > 32)) return t('dns.validation.ipv4PrefixRange');
        if (!v6Err && (p < 0 || p > 128)) return t('dns.validation.ipv6PrefixRange');
        if (v4Err && v6Err) return t('dns.validation.ipPrefixFormat');
        return '';
      }
      return validateIP(value);
    }

    function validateRange(value, min, max, nameKey) {
      if (!isPresent(value)) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < min || n > max) return t('dns.validation.range', { name: t(nameKey), min, max });
      return '';
    }

    function validateIPv6Prefix96(value) {
      if (!value) return '';
      const parts = value.split('/');
      if (parts.length !== 2) return t('dns.validation.dns64PrefixFormat');
      const err = validateIPv6(parts[0]);
      if (err) return err;
      const p = parseInt(parts[1], 10);
      if (isNaN(p) || p !== 96) return t('dns.validation.dns64PrefixLength');
      return '';
    }

    function validatePrefixExclusion(value) {
      if (!value) return '';
      const v = String(value).trim();
      const target = v.startsWith('!') ? v.slice(1) : v;
      if (!target) return t('dns.validation.prefixNotEmpty');
      return validateIPPrefix(target);
    }

    function validateNetmaskOrDomain(value) {
      if (!value) return '';
      if (value.includes('/')) return validateIPPrefix(value);
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value) || /^[0-9a-fA-F:]+$/.test(value)) return validateIP(value);
      if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return t('dns.validation.enterValidDomainOrNetmask');
      return '';
    }

    function validateIPOrFQDN(value) {
      if (!value) return '';
      if (validateIP(value)) {
        if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return t('dns.validation.enterValidIpOrFqdn');
      }
      return '';
    }

    function validateConfigAuthPath(value) {
      if (!value) return '';
      if (!value.startsWith('/config/auth/')) return t('dns.validation.keyFileInConfigAuth');
      return '';
    }

    function validateHostname(value) {
      if (!value) return t('dns.validation.enterHostname');
      if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]$/.test(value)) return t('dns.validation.hostnameFormat');
      return '';
    }

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
      { key: 'domain', title: t('dns.columns.domain') },
      { key: 'name_servers', title: t('dns.columns.dnsServers'), render: (v) => (v || []).map(ns => ns.port ? `${ns.address}:${ns.port}` : ns.address).join(', ') },
    ];

    const selectedDomain = ref([]);
    const showDomainModal = ref(false);
    const editingDomain = ref({});

    const selectedDomainNameServer = ref([]);
    const showDomainNameServerModal = ref(false);
    const editingDomainNameServer = ref({});

    const nameServerColumns = [
      { key: 'address', title: t('dns.columns.address') },
      { key: 'port', title: t('dns.columns.port'), render: v => isPresent(v) ? v : t('dns.columns.portDefault') },
    ];

    const selectedNameServer = ref([]);
    const showNameServerModal = ref(false);
    const editingNameServer = ref({});

    const dynamicColumns = [
      { key: 'name', title: t('dns.columns.name') },
      { key: 'protocol', title: t('dns.columns.protocol') },
      { key: 'server', title: t('dns.columns.server') },
      { key: 'host_name', title: t('dns.columns.hostname'), render: v => splitMembers(v).join(', ') },
      { key: 'address_type', title: t('dns.columns.addressSource'), render: v => v === 'interface' ? t('dns.columns.addressSourceInterface') : (v === 'web' ? 'Web' : '-') },
    ];

    const selectedDynamic = ref([]);
    const showDynamicModal = ref(false);
    const editingDynamic = ref({});

    const authoritativeColumns = [
      { key: 'domain', title: t('dns.columns.domain') },
      { key: 'disable', title: t('dns.columns.status'), render: v => v ? t('dns.columns.statusDisabled') : t('dns.columns.statusEnabled') },
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
      let err = validateRange(f.port, 1, 65535, 'dns.fields.port');
      if (err) return showError({ message: err + t('dns.validation.portDefault53') });
      err = validateRange(f.timeout, 10, 60000, 'dns.fields.timeout');
      if (err) return showError({ message: err + t('dns.validation.timeoutDefault1500') });
      err = validateRange(f.cache_size, 0, 2147483647, 'dns.fields.cacheSize');
      if (err) return showError({ message: err + t('dns.validation.cacheSizeDefault10000') });
      err = validateRange(f.negative_ttl, 0, 7200, 'dns.fields.negativeTtl');
      if (err) return showError({ message: err + t('dns.validation.negativeTtlDefault3600') });

      for (const ip of f.listen_address || []) {
        err = validateIP(ip);
        if (err) return showError({ message: t('dns.validation.listenAddressError', { ip, err }) });
      }
      const nameServerAddresses = new Set();
      for (const ns of f.name_servers || []) {
        if (!ns.address) return showError({ message: t('dns.validation.upstreamDnsNotEmpty') });
        if (nameServerAddresses.has(ns.address)) return showError({ message: t('dns.validation.upstreamDnsDuplicate', { address: ns.address }) });
        nameServerAddresses.add(ns.address);
        err = validateIP(ns.address);
        if (err) return showError({ message: t('dns.validation.upstreamDnsError', { address: ns.address, err }) });
        err = validateRange(ns.port, 1, 65535, 'dns.fields.port');
        if (err) return showError({ message: t('dns.validation.upstreamDnsPortError', { address: ns.address, err }) });
      }
      for (const item of f.allow_from || []) {
        err = validateIPPrefix(item);
        if (err) return showError({ message: t('dns.validation.allowFromError', { item, err }) });
      }
      for (const ip of f.source_address || []) {
        err = validateIP(ip);
        if (err) return showError({ message: t('dns.validation.sourceAddressError', { ip, err }) });
      }
      for (const ip of f.exclude_throttle_address || []) {
        err = validateIPPrefix(ip);
        if (err) return showError({ message: t('dns.validation.excludeThrottleError', { ip, err }) });
      }
      err = validateIPv6Prefix96(f.dns64_prefix);
      if (err) return showError({ message: t('dns.validation.dns64PrefixError', { err }) });
      err = validateRange(f.serve_stale_extension, 0, 65535, 'dns.fields.serveStaleExtension');
      if (err) return showError({ message: err + t('dns.validation.serveStaleDefault0') });

      const opts = f.options || {};
      for (const item of opts.ecs_add_for || []) {
        err = validatePrefixExclusion(item);
        if (err) return showError({ message: t('dns.validation.ecsAddForError', { item, err }) });
      }
      err = validateRange(opts.ecs_ipv4_bits, 0, 32, 'dns.fields.ecsIpv4Bits');
      if (err) return showError({ message: err });
      for (const item of opts.edns_subnet_allow_list || []) {
        err = validateNetmaskOrDomain(item);
        if (err) return showError({ message: t('dns.validation.ednsSubnetAllowListError', { item, err }) });
      }

      const authNames = new Set();
      for (const a of f.authoritative_domain || []) {
        if (!a.domain) return showError({ message: t('dns.validation.authoritativeNameEmpty') });
        if (authNames.has(a.domain)) return showError({ message: t('dns.validation.authoritativeDuplicate', { domain: a.domain }) });
        authNames.add(a.domain);
      }

      const d = config.value.dynamic || {};
      err = validateRange(d.interval, 60, 3600, 'dns.fields.updateInterval');
      if (err) return showError({ message: err + t('dns.validation.intervalDefault300') });

      for (const n of d.names || []) {
        if (!n.name) return showError({ message: t('dns.validation.dynamicNameEmpty') });
        if (!n.protocol) return showError({ message: t('dns.validation.dynamicProtocolEmpty', { name: n.name }) });
        if (n.address_type === 'interface' && !n.address_interface) return showError({ message: t('dns.validation.dynamicSelectInterface', { name: n.name }) });
        if (n.address_type === 'web' && !n.web_url) return showError({ message: t('dns.validation.dynamicWebUrlEmpty', { name: n.name }) });
        const hostNames = splitMembers(n.host_name);
        if (!hostNames.length) return showError({ message: t('dns.validation.dynamicHostnameEmpty', { name: n.name }) });
        for (const h of hostNames) {
          err = validateHostname(h);
          if (err) return showError({ message: t('dns.validation.dynamicHostnameError', { name: n.name, hostname: h, err }) });
        }
        err = validateIPOrFQDN(n.server);
        if (err) return showError({ message: t('dns.validation.dynamicServerError', { name: n.name, err }) });
        err = validateConfigAuthPath(n.key);
        if (err) return showError({ message: t('dns.validation.dynamicKeyError', { name: n.name, err }) });
        err = validateRange(n.expiry_time, 300, 2160000, 'dns.fields.expiryTime');
        if (err) return showError({ message: t('dns.validation.dynamicExpiryError', { name: n.name, err }) });
        err = validateRange(n.wait_time, 60, 86400, 'dns.fields.waitTime');
        if (err) return showError({ message: t('dns.validation.dynamicWaitTimeError', { name: n.name, err }) });
        err = validateRange(n.ttl, 0, 2147483647, 'dns.fields.ttl');
        if (err) return showError({ message: t('dns.validation.dynamicTtlError', { name: n.name, err }) });
      }

      for (const dItem of config.value.domains || []) {
        if (!dItem.domain) return showError({ message: t('dns.validation.domainForwardDomainEmpty') });
        if (!dItem.name_servers?.length) return showError({ message: t('dns.validation.domainForwardNsRequired', { domain: dItem.domain }) });
        const domainNsAddresses = new Set();
        for (const ns of dItem.name_servers) {
          if (!ns.address) return showError({ message: t('dns.validation.domainForwardNsAddressEmpty', { domain: dItem.domain }) });
          if (domainNsAddresses.has(ns.address)) return showError({ message: t('dns.validation.domainForwardNsDuplicate', { domain: dItem.domain, address: ns.address }) });
          domainNsAddresses.add(ns.address);
          err = validateIP(ns.address);
          if (err) return showError({ message: t('dns.validation.domainForwardNsError', { domain: dItem.domain, address: ns.address, err }) });
          err = validateRange(ns.port, 1, 65535, 'dns.fields.port');
          if (err) return showError({ message: t('dns.validation.domainForwardNsPortError', { domain: dItem.domain, address: ns.address, err }) });
        }
      }

      saving.value = true;
      try {
        await configStore.setConfig('service dns', dnsToConfig(config.value));
        configStore.markPending();
        await configStore.checkSessionChanged();
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
      if (!selectedDomain.value.length) return showError({ message: t('dns.messages.selectDomainToEdit') });
      const row = (config.value.domains || []).find(d => d._domain === selectedDomain.value[0]);
      if (!row) return showError({ message: t('dns.messages.domainNotFound') });
      editingDomain.value = { ...row };
      showDomainModal.value = true;
    }

    function removeDomain() {
      if (!selectedDomain.value.length) return showError({ message: t('dns.messages.selectDomainToDelete') });
      config.value.domains = (config.value.domains || []).filter(d => d._domain !== selectedDomain.value[0]);
      selectedDomain.value = [];
    }

    function saveDomain() {
      if (!editingDomain.value.domain) return showError({ message: t('dns.messages.enterDomain') });
      if (!editingDomain.value.name_servers?.length) return showError({ message: t('dns.messages.enterAtLeastOneDns') });
      const domainNsAddresses = new Set();
      for (const ns of editingDomain.value.name_servers) {
        if (!ns.address) return showError({ message: t('dns.messages.dnsAddressNotEmpty') });
        if (domainNsAddresses.has(ns.address)) return showError({ message: t('dns.messages.dnsDuplicate', { address: ns.address }) });
        domainNsAddresses.add(ns.address);
        let err = validateIP(ns.address);
        if (err) return showError({ message: t('dns.messages.dnsError', { address: ns.address, err }) });
        err = validateRange(ns.port, 1, 65535, 'dns.fields.port');
        if (err) return showError({ message: t('dns.messages.dnsPortError', { address: ns.address, err }) });
      }
      const row = { ...editingDomain.value };
      if (!row._domain) row._domain = row.domain;
      const list = config.value.domains || [];
      const idx = list.findIndex(d => d._domain === row._domain);
      if (idx >= 0 && !editingDomain.value._domain) return showError({ message: t('dns.messages.domainAlreadyExists') });
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
      if (!selectedDomainNameServer.value.length) return showError({ message: t('dns.messages.selectDnsToEdit') });
      const row = (editingDomain.value.name_servers || []).find(ns => ns._address === selectedDomainNameServer.value[0]);
      if (!row) return showError({ message: t('dns.messages.dnsNotFound') });
      editingDomainNameServer.value = { ...row };
      showDomainNameServerModal.value = true;
    }

    function removeDomainNameServer() {
      if (!selectedDomainNameServer.value.length) return showError({ message: t('dns.messages.selectDnsToDelete') });
      editingDomain.value.name_servers = (editingDomain.value.name_servers || []).filter(ns => ns._address !== selectedDomainNameServer.value[0]);
      selectedDomainNameServer.value = [];
    }

    function saveDomainNameServer() {
      if (!editingDomainNameServer.value.address) return showError({ message: t('dns.messages.enterDnsAddress') });
      let err = validateIP(editingDomainNameServer.value.address);
      if (err) return showError({ message: t('dns.messages.dnsAddressError', { err }) });
      err = validateRange(editingDomainNameServer.value.port, 1, 65535, 'dns.fields.port');
      if (err) return showError({ message: t('dns.messages.portError', { err }) });
      const row = { ...editingDomainNameServer.value };
      if (!row._address) row._address = row.address;
      const list = editingDomain.value.name_servers || [];
      const idx = list.findIndex(ns => ns._address === row._address);
      if (idx >= 0 && !editingDomainNameServer.value._address) return showError({ message: t('dns.messages.dnsAlreadyExists') });
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
      if (!selectedNameServer.value.length) return showError({ message: t('dns.messages.selectUpstreamDnsToEdit') });
      const row = (config.value.forwarding.name_servers || []).find(ns => ns._address === selectedNameServer.value[0]);
      if (!row) return showError({ message: t('dns.messages.upstreamDnsNotFound') });
      editingNameServer.value = { ...row };
      showNameServerModal.value = true;
    }

    function removeNameServer() {
      if (!selectedNameServer.value.length) return showError({ message: t('dns.messages.selectUpstreamDnsToDelete') });
      config.value.forwarding.name_servers = (config.value.forwarding.name_servers || []).filter(ns => ns._address !== selectedNameServer.value[0]);
      selectedNameServer.value = [];
    }

    function saveNameServer() {
      if (!editingNameServer.value.address) return showError({ message: t('dns.messages.enterDnsAddress') });
      let err = validateIP(editingNameServer.value.address);
      if (err) return showError({ message: t('dns.messages.dnsAddressError', { err }) });
      err = validateRange(editingNameServer.value.port, 1, 65535, 'dns.fields.port');
      if (err) return showError({ message: t('dns.messages.portError', { err }) });
      const row = { ...editingNameServer.value };
      if (!row._address) row._address = row.address;
      const list = config.value.forwarding.name_servers || [];
      const idx = list.findIndex(ns => ns._address === row._address);
      if (idx >= 0 && !editingNameServer.value._address) return showError({ message: t('dns.messages.dnsAlreadyExists') });
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
      if (!selectedDynamic.value.length) return showError({ message: t('dns.messages.selectDynamicToEdit') });
      const row = (config.value.dynamic.names || []).find(n => n._name === selectedDynamic.value[0]);
      if (!row) return showError({ message: t('dns.messages.dynamicNotFound') });
      editingDynamic.value = { ...row };
      showDynamicModal.value = true;
    }

    function removeDynamic() {
      if (!selectedDynamic.value.length) return showError({ message: t('dns.messages.selectDynamicToDelete') });
      config.value.dynamic.names = (config.value.dynamic.names || []).filter(n => n._name !== selectedDynamic.value[0]);
      selectedDynamic.value = [];
    }

    function saveDynamic() {
      if (!editingDynamic.value.name) return showError({ message: t('dns.messages.enterDynamicName') });
      const hostNames = splitMembers(editingDynamic.value.host_name);
      if (!hostNames.length) return showError({ message: t('dns.messages.enterAtLeastOneHostname') });
      for (const h of hostNames) {
        const err = validateHostname(h);
        if (err) return showError({ message: t('dns.messages.hostnameError', { hostname: h, err }) });
      }
      let err = validateIPOrFQDN(editingDynamic.value.server);
      if (err) return showError({ message: t('dns.messages.serverError', { err }) });
      err = validateConfigAuthPath(editingDynamic.value.key);
      if (err) return showError({ message: t('dns.messages.keyFileError', { err }) });
      err = validateRange(editingDynamic.value.expiry_time, 300, 2160000, 'dns.fields.expiryTime');
      if (err) return showError({ message: err + t('dns.validation.secondsSuffix') });
      err = validateRange(editingDynamic.value.wait_time, 60, 86400, 'dns.fields.waitTime');
      if (err) return showError({ message: err + t('dns.validation.secondsSuffix') });
      err = validateRange(editingDynamic.value.ttl, 0, 2147483647, 'dns.fields.ttl');
      if (err) return showError({ message: err + t('dns.validation.secondsSuffix') });

      const row = { ...editingDynamic.value };
      if (!row._name) row._name = row.name;
      const list = config.value.dynamic.names || [];
      const idx = list.findIndex(n => n._name === row._name);
      if (idx >= 0 && !editingDynamic.value._name) return showError({ message: t('dns.messages.nameAlreadyExists') });
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
      if (!selectedAuthoritative.value.length) return showError({ message: t('dns.messages.selectAuthoritativeToEdit') });
      const row = (config.value.forwarding.authoritative_domain || []).find(a => a._domain === selectedAuthoritative.value[0]);
      if (!row) return showError({ message: t('dns.messages.authoritativeNotFound') });
      editingAuthoritative.value = { ...row };
      showAuthoritativeModal.value = true;
    }

    function removeAuthoritative() {
      if (!selectedAuthoritative.value.length) return showError({ message: t('dns.messages.selectAuthoritativeToDelete') });
      config.value.forwarding.authoritative_domain = (config.value.forwarding.authoritative_domain || []).filter(a => a._domain !== selectedAuthoritative.value[0]);
      selectedAuthoritative.value = [];
    }

    function saveAuthoritative() {
      if (!editingAuthoritative.value.domain) return showError({ message: t('dns.messages.enterAuthoritativeDomain') });
      const row = { ...editingAuthoritative.value };
      if (!row._domain) row._domain = row.domain;
      const list = config.value.forwarding.authoritative_domain || [];
      const idx = list.findIndex(a => a._domain === row._domain);
      if (idx >= 0 && !editingAuthoritative.value._domain) return showError({ message: t('dns.messages.authoritativeAlreadyExists') });
      if (idx >= 0) list.splice(idx, 1, row);
      else list.push(row);
      config.value.forwarding.authoritative_domain = [...list];
      selectedAuthoritative.value = [];
      showAuthoritativeModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

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
      t,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('dns.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'forwarding', title: t('dns.tabs.forwarding') },
        { key: 'domain', title: t('dns.tabs.domainForwarding') },
        { key: 'authoritative', title: t('dns.tabs.authoritative') },
        { key: 'dynamic', title: t('dns.tabs.dynamic') }
      ]">

        <template #forwarding>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.listenAddressTitle')">{{ t('dns.forwarding.listenAddress') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.listen_address" :options="localAddresses" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.enterIpPlaceholder')" :custom-validator="validateIP" />
              <div class="form-hint">{{ t('dns.forwarding.listenAddressHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.upstreamDnsTitle')">{{ t('dns.forwarding.upstreamDns') }}</label>
            <div style="flex:1;max-width:600px;">
              <div class="toolbar" style="padding-left:0;">
                <ToolbarButton icon="create" @click="createNameServer">{{ t('dns.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editNameServer" :disabled="!selectedNameServer.length || selectedNameServer.length > 1">{{ t('dns.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeNameServer" :disabled="!selectedNameServer.length">{{ t('dns.buttons.delete') }}</ToolbarButton>
              </div>
              <DataTable :columns="nameServerColumns" :data="config.forwarding.name_servers" row-key="address" :externalToolbar="true" @selection-change="selectedNameServer = $event" :selectable="true" />
              <div class="form-hint">{{ t('dns.forwarding.upstreamDnsHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.allowFromTitle')">{{ t('dns.forwarding.allowFrom') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.allow_from" :options="ALLOW_FROM_OPTIONS" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.allowFromPlaceholder')" :custom-validator="validateIPPrefix" />
              <div class="form-hint">{{ t('dns.forwarding.allowFromHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.sourceAddressTitle')">{{ t('dns.forwarding.sourceAddress') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.source_address" :options="localAddresses" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.enterIpPlaceholder')" :custom-validator="validateIP" />
              <div class="form-hint">{{ t('dns.forwarding.sourceAddressHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.portTitle')">{{ t('dns.fields.port') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.forwarding.port" :placeholder="t('dns.forwarding.portPlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.portHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.timeoutTitle')">{{ t('dns.fields.timeout') }}</label>
            <div style="flex:1;">
              <input type="number" min="10" max="60000" class="form-control" v-model="config.forwarding.timeout" :placeholder="t('dns.forwarding.timeoutPlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.timeoutHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.cacheSizeTitle')">{{ t('dns.fields.cacheSize') }}</label>
            <div style="flex:1;">
              <input type="number" min="0" max="2147483647" class="form-control" v-model="config.forwarding.cache_size" :placeholder="t('dns.forwarding.cacheSizePlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.cacheSizeHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.negativeTtlTitle')">{{ t('dns.fields.negativeTtl') }}</label>
            <div style="flex:1;">
              <input type="number" min="0" max="7200" class="form-control" v-model="config.forwarding.negative_ttl" :placeholder="t('dns.forwarding.negativeTtlPlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.negativeTtlHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.dnssecTitle')">DNSSEC</label>
            <select class="form-control" v-model="config.forwarding.dnssec">
              <option v-for="o in DNSSEC_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label" :title="t('dns.forwarding.useSystemNsTitle')">{{ t('dns.forwarding.useSystemNs') }}</label><input type="checkbox" v-model="config.forwarding.system" /></div>
          <div class="form-row"><label class="form-label" :title="t('dns.forwarding.ignoreHostsTitle')">{{ t('dns.forwarding.ignoreHosts') }}</label><input type="checkbox" v-model="config.forwarding.ignore_hosts_file" /></div>
          <div class="form-row"><label class="form-label" :title="t('dns.forwarding.noServeRfc1918Title')">{{ t('dns.forwarding.noServeRfc1918') }}</label><input type="checkbox" v-model="config.forwarding.no_serve_rfc1918" /></div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.dhcpInterfaceTitle')">{{ t('dns.forwarding.dhcpInterface') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.dhcp" :options="interfaceNames" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" />
              <div class="form-hint">{{ t('dns.forwarding.dhcpInterfaceHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.dns64PrefixTitle')">{{ t('dns.forwarding.dns64Prefix') }}</label>
            <div style="flex:1;">
              <input class="form-control" v-model="config.forwarding.dns64_prefix" :placeholder="t('dns.forwarding.dns64PrefixPlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.dns64PrefixHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.excludeThrottleTitle')">{{ t('dns.forwarding.excludeThrottle') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.forwarding.exclude_throttle_address" :options="[]" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.allowFromPlaceholder')" :custom-validator="validateIPPrefix" />
              <div class="form-hint">{{ t('dns.forwarding.excludeThrottleHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dns.forwarding.serveStaleTitle')">{{ t('dns.fields.serveStaleExtension') }}</label>
            <div style="flex:1;">
              <input type="number" min="0" max="65535" class="form-control" v-model="config.forwarding.serve_stale_extension" :placeholder="t('dns.forwarding.serveStalePlaceholder')" />
              <div class="form-hint">{{ t('dns.forwarding.serveStaleHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div style="flex:1;">
              <button type="button" class="toolbar-btn" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? t('dns.buttons.collapseAdvanced') : t('dns.buttons.expandAdvanced') }}</button>
            </div>
          </div>
          <div v-if="showAdvanced" style="border:1px solid var(--color-border);padding:12px;border-radius:2px;margin-bottom:12px;">
            <div class="form-row">
              <label class="form-label" :title="t('dns.forwarding.ecsAddForTitle')">{{ t('dns.forwarding.ecsAddFor') }}</label>
              <div style="flex:1;max-width:600px;">
                <DualListSelector v-model="config.forwarding.options.ecs_add_for" :options="[]" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.ecsAddForPlaceholder')" :custom-validator="validatePrefixExclusion" />
                <div class="form-hint">{{ t('dns.forwarding.ecsAddForHint') }}</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label" :title="t('dns.forwarding.ecsIpv4BitsTitle')">{{ t('dns.fields.ecsIpv4Bits') }}</label>
              <div style="flex:1;">
                <input type="number" min="0" max="32" class="form-control" v-model="config.forwarding.options.ecs_ipv4_bits" placeholder="0-32" />
                <div class="form-hint">{{ t('dns.forwarding.ecsIpv4BitsHint') }}</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label" :title="t('dns.forwarding.ednsSubnetAllowListTitle')">{{ t('dns.forwarding.ednsSubnetAllowList') }}</label>
              <div style="flex:1;max-width:600px;">
                <DualListSelector v-model="config.forwarding.options.edns_subnet_allow_list" :options="[]" :title-left="t('dns.common.available')" :title-right="t('dns.common.selected')" allow-custom :custom-placeholder="t('dns.forwarding.ednsSubnetPlaceholder')" :custom-validator="validateNetmaskOrDomain" />
                <div class="form-hint">{{ t('dns.forwarding.ednsSubnetAllowListHint') }}</div>
              </div>
            </div>
          </div>
        </template>

        <template #domain>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createDomain">{{ t('dns.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDomain" :disabled="!selectedDomain.length || selectedDomain.length > 1">{{ t('dns.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDomain" :disabled="!selectedDomain.length">{{ t('dns.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="domainColumns" :data="config.domains" row-key="domain" :externalToolbar="true" @selection-change="selectedDomain = $event" :selectable="true" />
        </template>

        <template #authoritative>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createAuthoritative">{{ t('dns.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editAuthoritative" :disabled="!selectedAuthoritative.length || selectedAuthoritative.length > 1">{{ t('dns.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeAuthoritative" :disabled="!selectedAuthoritative.length">{{ t('dns.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="authoritativeColumns" :data="config.forwarding.authoritative_domain" row-key="domain" :externalToolbar="true" @selection-change="selectedAuthoritative = $event" :selectable="true" />
        </template>

        <template #dynamic>
          <div class="form-row">
            <label class="form-label" :title="t('dns.dynamic.intervalTitle')">{{ t('dns.fields.updateInterval') }}</label>
            <div style="flex:1;">
              <input type="number" min="60" max="3600" class="form-control" v-model="config.dynamic.interval" :placeholder="t('dns.dynamic.intervalPlaceholder')" />
              <div class="form-hint">{{ t('dns.dynamic.intervalHint') }}</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" :title="t('dns.dynamic.vrfTitle')">VRF</label><input class="form-control" v-model="config.dynamic.vrf" :placeholder="t('dns.dynamic.vrfPlaceholder')" /></div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createDynamic">{{ t('dns.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDynamic" :disabled="!selectedDynamic.length || selectedDynamic.length > 1">{{ t('dns.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDynamic" :disabled="!selectedDynamic.length">{{ t('dns.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="dynamicColumns" :data="config.dynamic.names" row-key="name" :externalToolbar="true" @selection-change="selectedDynamic = $event" :selectable="true" />
        </template>
      </TabGroup>

      <div v-if="activeTab === 'forwarding' || activeTab === 'dynamic'" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showDomainModal" :title="t('dns.modalTitles.domainForwarding')" width="600px" @confirm="saveDomain" @close="showDomainModal = false">
        <div class="form-row"><label class="form-label">{{ t('dns.fields.domain') }}</label><input class="form-control" v-model="editingDomain.domain" :disabled="!!editingDomain._domain" placeholder="example.com" /></div>
        <div style="margin-top:12px;">
          <div style="font-weight:600;margin-bottom:8px;">{{ t('dns.fields.dnsServers') }}</div>
          <div class="toolbar" style="padding-left:0;">
            <ToolbarButton icon="create" @click="createDomainNameServer">{{ t('dns.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editDomainNameServer" :disabled="!selectedDomainNameServer.length || selectedDomainNameServer.length > 1">{{ t('dns.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeDomainNameServer" :disabled="!selectedDomainNameServer.length">{{ t('dns.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="nameServerColumns" :data="editingDomain.name_servers" row-key="address" :externalToolbar="true" @selection-change="selectedDomainNameServer = $event" :selectable="true" />
          <div class="form-hint">{{ t('dns.forwarding.upstreamDnsHint') }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showDomainNameServerModal" :title="t('dns.modalTitles.dnsServer')" @confirm="saveDomainNameServer" @close="showDomainNameServerModal = false">
        <div class="form-row"><label class="form-label">{{ t('dns.fields.address') }}</label><input class="form-control" v-model="editingDomainNameServer.address" :disabled="!!editingDomainNameServer._address" :placeholder="t('dns.placeholders.ipAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="editingDomainNameServer.port" :placeholder="t('dns.placeholders.port')" /><div class="form-hint">{{ t('dns.forwarding.portHint') }}</div></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showNameServerModal" :title="t('dns.modalTitles.upstreamDnsServer')" @confirm="saveNameServer" @close="showNameServerModal = false">
        <div class="form-row"><label class="form-label">{{ t('dns.fields.address') }}</label><input class="form-control" v-model="editingNameServer.address" :disabled="!!editingNameServer._address" :placeholder="t('dns.placeholders.ipAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="editingNameServer.port" :placeholder="t('dns.placeholders.port')" /><div class="form-hint">{{ t('dns.forwarding.portHint') }}</div></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showDynamicModal" :title="t('dns.modalTitles.dynamicDns')" width="560px" @confirm="saveDynamic" @close="showDynamicModal = false">
        <div class="form-row"><label class="form-label">{{ t('dns.fields.name') }}</label><input class="form-control" v-model="editingDynamic.name" :disabled="!!editingDynamic._name" :placeholder="t('dns.placeholders.serviceName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.protocol') }}</label>
          <select class="form-control" v-model="editingDynamic.protocol">
            <option value="">{{ t('dns.placeholders.selectProtocol') }}</option>
            <option v-for="p in DYNAMIC_PROTOCOL_OPTIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.server') }}</label><input class="form-control" v-model="editingDynamic.server" :placeholder="t('dns.placeholders.ipOrFqdn')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.hostname') }}</label><textarea class="form-control" v-model="editingDynamic.host_name" rows="2" :placeholder="t('dns.placeholders.hostnames')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.addressSource') }}</label>
          <select class="form-control" v-model="editingDynamic.address_type">
            <option value="">{{ t('dns.placeholders.notSelected') }}</option>
            <option value="interface">{{ t('dns.fields.interface') }}</option>
            <option value="web">Web</option>
          </select>
        </div>
        <div class="form-row" v-if="editingDynamic.address_type === 'interface'"><label class="form-label">{{ t('dns.fields.interface') }}</label>
          <select class="form-control" v-model="editingDynamic.address_interface">
            <option value="">{{ t('dns.placeholders.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
          </select>
        </div>
        <template v-if="editingDynamic.address_type === 'web'">
          <div class="form-row"><label class="form-label">Web URL</label><input class="form-control" v-model="editingDynamic.web_url" placeholder="https://..." /></div>
          <div class="form-row"><label class="form-label">{{ t('dns.fields.skipMode') }}</label><input class="form-control" v-model="editingDynamic.web_skip" :placeholder="t('dns.placeholders.skipMode')" /></div>
        </template>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.ipVersion') }}</label>
          <select class="form-control" v-model="editingDynamic.ip_version">
            <option v-for="o in IP_VERSION_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.username') }}</label><input class="form-control" v-model="editingDynamic.username" :placeholder="t('dns.placeholders.username')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.password') }}</label><input type="password" class="form-control" v-model="editingDynamic.password" :placeholder="t('dns.placeholders.password')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.keyFile') }}</label><input class="form-control" v-model="editingDynamic.key" placeholder="/config/auth/..." /><div class="form-hint">{{ t('dns.dynamic.keyFileHint') }}</div></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.zone') }}</label><input class="form-control" v-model="editingDynamic.zone" :placeholder="t('dns.placeholders.zone')" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.ttl') }}</label><input type="number" min="0" max="2147483647" class="form-control" v-model="editingDynamic.ttl" placeholder="0-2147483647" /><div class="form-hint">{{ t('dns.dynamic.ttlHint') }}</div></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.expiryTime') }}</label><input type="number" min="300" max="2160000" class="form-control" v-model="editingDynamic.expiry_time" placeholder="300-2160000" /><div class="form-hint">{{ t('dns.dynamic.expiryTimeHint') }}</div></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.waitTime') }}</label><input type="number" min="60" max="86400" class="form-control" v-model="editingDynamic.wait_time" placeholder="60-86400" /><div class="form-hint">{{ t('dns.dynamic.waitTimeHint') }}</div></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.description') }}</label><input class="form-control" v-model="editingDynamic.description" :placeholder="t('dns.placeholders.description')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showAuthoritativeModal" :title="t('dns.modalTitles.authoritativeDomain')" @confirm="saveAuthoritative" @close="showAuthoritativeModal = false">
        <div class="form-row"><label class="form-label">{{ t('dns.fields.domain') }}</label><input class="form-control" v-model="editingAuthoritative.domain" :disabled="!!editingAuthoritative._domain" placeholder="example.com" /></div>
        <div class="form-row"><label class="form-label">{{ t('dns.fields.disable') }}</label><input type="checkbox" v-model="editingAuthoritative.disable" /></div>
      </DraggableModal>
    </div>
  `,
});
