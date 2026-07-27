import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DataTable from '/src/components/Table/DataTable.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const AUTH_METHOD_OPTIONS = ['', 'ldap'];
const CACHE_PEER_TYPE_OPTIONS = ['parent', 'sibling', 'multicast'];
const DEFAULT_ACTION_OPTIONS = ['allow', 'block'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'weekdays', 'weekend', 'all'];

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
  if (!/^[a-zA-Z0-9_.:-]+$/.test(String(name))) return '名称只能包含字母、数字、下划线、点、冒号和连字符';
  return '';
}

function validateIPv4(value) {
  if (!value) return '';
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!re.test(value)) return 'IPv4 地址格式错误';
  return '';
}

function validateHostOrIPv4(value) {
  if (!value) return '';
  if (!validateIPv4(value)) return '';
  const hostRe = /^(?=.{1,253}$)[a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?(\.[a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?)*\.?$/;
  if (!hostRe.test(value)) return '请输入有效的 IPv4 地址或主机名';
  return '';
}

function validateRange(value, min, max, name) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < min || n > max) return `${name} 范围为 ${min}-${max}`;
  return '';
}

function validatePort(value, allowZero = false) {
  const min = allowZero ? 0 : 1;
  return validateRange(value, min, 65535, '端口');
}

function validatePortList(text, allowZero = false) {
  for (const line of splitMembers(text)) {
    const err = validatePort(line, allowZero);
    if (err) return err;
  }
  return '';
}

function validateRequired(value, msg) {
  if (!isPresent(value)) return msg;
  return '';
}

function validateFQDN(value) {
  if (!value) return '';
  const re = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,63}$/;
  if (!re.test(value)) return '请输入有效的域名';
  return '';
}

function validateIPv4OrFQDN(value) {
  if (!value) return '';
  if (!validateIPv4(value) || !validateFQDN(value)) return '';
  return '请输入有效的 IPv4 地址或域名';
}

function validateURL(value) {
  if (!value) return '';
  const re = /^(\/[a-zA-Z0-9_\-./?&=+%~#]*)$/;
  if (!re.test(value)) return 'URL 格式错误（示例：/path/to/resource）';
  return '';
}

function validateAppendDomain(value) {
  if (!value) return '';
  if (!value.startsWith('.')) return '追加域名必须以 "." 开头';
  const re = /^\.[A-Za-z0-9][-.A-Za-z0-9]*$/;
  if (!re.test(value)) return '追加域名格式错误';
  return '';
}

function validateSafePort(value) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < 1 || n > 65535) return '端口范围为 1-65535';
  const allowed = (n >= 1 && n <= 20) || (n >= 22 && n <= 69) || (n >= 71 && n <= 79) ||
    (n >= 81 && n <= 209) || (n >= 211 && n <= 279) || (n >= 281 && n <= 442) ||
    (n >= 444 && n <= 487) || (n >= 489 && n <= 590) || (n >= 592 && n <= 776) ||
    (n >= 778 && n <= 872) || (n >= 874 && n <= 1024) || n >= 1025;
  if (!allowed) return '该端口已包含在默认安全端口列表中，无需手动添加';
  return '';
}

function validateSSLSafePort(value) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < 1 || n > 65535) return '端口范围为 1-65535';
  if (n === 443) return '443 已包含在默认 SSL 安全端口列表中';
  return '';
}

function validateRuleNumber(value) {
  return validateRange(value, 1, 1024, '规则编号');
}

function validateKeyword(value) {
  if (!value) return '';
  if (/[\x00-\x1f]/.test(value)) return '关键字包含非法字符';
  return '';
}

function validateList(text, validator) {
  for (const line of splitMembers(text)) {
    const err = validator(line);
    if (err) return err;
  }
  return '';
}

function valuelessToFlag(value) {
  return value !== undefined;
}

function flagToValueless(flag) {
  return flag ? {} : undefined;
}

function parseTimePeriods(text) {
  const result = {};
  for (const line of splitMembers(text)) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const day = parts[0];
    if (!WEEK_DAYS.includes(day)) continue;
    const time = parts.slice(1).join(' ').replace(/\s+/g, '');
    if (!/^\d\d:\d\d-\d\d:\d\d$/.test(time)) continue;
    result[day] = time;
  }
  return result;
}

function formatTimePeriods(period = {}) {
  return WEEK_DAYS.filter(d => period[d]?.time).map(d => `${d} ${period[d].time}`).join('\n');
}

function webproxyToForm(data = {}) {
  const auth = data.authentication || {};
  const ldap = auth.ldap || {};
  const sg = data['url-filtering']?.squidguard || {};
  return {
    append_domain: data['append-domain'] || '',
    cache_size: data['cache-size'] !== undefined ? String(data['cache-size']) : '100',
    default_port: data['default-port'] !== undefined ? String(data['default-port']) : '3128',
    disable_access_log: data['disable-access-log'] !== undefined,
    domain_block: joinMembers(data['domain-block']),
    domain_noncache: joinMembers(data['domain-noncache']),
    maximum_object_size: data['maximum-object-size'] !== undefined ? String(data['maximum-object-size']) : '',
    mem_cache_size: data['mem-cache-size'] !== undefined ? String(data['mem-cache-size']) : '20',
    minimum_object_size: data['minimum-object-size'] !== undefined ? String(data['minimum-object-size']) : '',
    outgoing_address: data['outgoing-address'] || '',
    reply_block_mime: joinMembers(data['reply-block-mime']),
    reply_body_max_size: data['reply-body-max-size'] !== undefined ? String(data['reply-body-max-size']) : '',
    safe_ports: joinMembers(data['safe-ports']),
    ssl_safe_ports: joinMembers(data['ssl-safe-ports']),

    listen_addresses: Object.entries(data['listen-address'] || {}).map(([address, config]) => ({
      _address: address,
      address,
      port: config.port !== undefined ? String(config.port) : '',
      disable_transparent: config['disable-transparent'] !== undefined,
    })),

    authentication: {
      method: auth.method || '',
      children: auth.children !== undefined ? String(auth.children) : '5',
      credentials_ttl: auth['credentials-ttl'] !== undefined ? String(auth['credentials-ttl']) : '60',
      realm: auth.realm || '',
      ldap: {
        server: ldap.server || '',
        port: ldap.port !== undefined ? String(ldap.port) : '389',
        use_ssl: ldap['use-ssl'] !== undefined,
        version: ldap.version !== undefined ? String(ldap.version) : '3',
        base_dn: ldap['base-dn'] || '',
        bind_dn: ldap['bind-dn'] || '',
        password: ldap.password || '',
        filter_expression: ldap['filter-expression'] || '',
        username_attribute: ldap['username-attribute'] || '',
        persistent_connection: ldap['persistent-connection'] !== undefined,
      },
    },

    cache_peers: Object.entries(data['cache-peer'] || {}).map(([name, p]) => ({
      _name: name,
      name,
      address: p.address || '',
      type: p.type || 'parent',
      http_port: p['http-port'] !== undefined ? String(p['http-port']) : '',
      icp_port: p['icp-port'] !== undefined ? String(p['icp-port']) : '',
      options: p.options || '',
    })),

    url_filtering: {
      squidguard: {
        default_action: sg['default-action'] || 'allow',
        redirect_url: sg['redirect-url'] !== undefined ? String(sg['redirect-url']) : 'block.vyos.net',
        allow_ipaddr_url: sg['allow-ipaddr-url'] !== undefined,
        enable_safe_search: sg['enable-safe-search'] !== undefined,
        allow_category: joinMembers(sg['allow-category']),
        block_category: joinMembers(sg['block-category']),
        log: joinMembers(sg.log),
        local_block: joinMembers(sg['local-block']),
        local_block_keyword: joinMembers(sg['local-block-keyword']),
        local_block_url: joinMembers(sg['local-block-url']),
        local_ok: joinMembers(sg['local-ok']),
        local_ok_url: joinMembers(sg['local-ok-url']),
        auto_update: {
          update_hour: sg['auto-update']?.['update-hour'] !== undefined ? String(sg['auto-update']['update-hour']) : '',
        },
        rules: Object.entries(sg.rule || {}).map(([number, r]) => ({
          _number: number,
          number,
          source_group: r['source-group'] || '',
          default_action: r['default-action'] || 'allow',
          time_period: r['time-period'] || '',
          allow_ipaddr_url: r['allow-ipaddr-url'] !== undefined,
          enable_safe_search: r['enable-safe-search'] !== undefined,
          allow_category: joinMembers(r['allow-category']),
          block_category: joinMembers(r['block-category']),
          local_block: joinMembers(r['local-block']),
          local_block_keyword: joinMembers(r['local-block-keyword']),
          local_block_url: joinMembers(r['local-block-url']),
          local_ok: joinMembers(r['local-ok']),
          local_ok_url: joinMembers(r['local-ok-url']),
          log: joinMembers(r.log),
          redirect_url: r['redirect-url'] !== undefined ? String(r['redirect-url']) : '',
        })),
        source_groups: Object.entries(sg['source-group'] || {}).map(([name, g]) => ({
          _name: name,
          name,
          description: g.description || '',
          domain: joinMembers(g.domain),
          address: joinMembers(g.address),
          user: joinMembers(g.user),
          ldap_ip_search: joinMembers(g['ldap-ip-search']),
          ldap_user_search: joinMembers(g['ldap-user-search']),
        })),
        time_periods: Object.entries(sg['time-period'] || {}).map(([name, t]) => ({
          _name: name,
          name,
          description: t.description || '',
          ranges: formatTimePeriods(t?.days || {}),
        })),
      },
    },
  };
}

function webproxyToConfig(form) {
  const result = {};
  if (isPresent(form.append_domain)) result['append-domain'] = String(form.append_domain);
  if (isPresent(form.cache_size)) result['cache-size'] = String(form.cache_size);
  if (isPresent(form.default_port)) result['default-port'] = String(form.default_port);
  if (form.disable_access_log) result['disable-access-log'] = '';
  const domainBlock = splitMembers(form.domain_block);
  if (domainBlock.length) result['domain-block'] = domainBlock;
  const domainNoncache = splitMembers(form.domain_noncache);
  if (domainNoncache.length) result['domain-noncache'] = domainNoncache;
  if (isPresent(form.maximum_object_size)) result['maximum-object-size'] = String(form.maximum_object_size);
  if (isPresent(form.mem_cache_size)) result['mem-cache-size'] = String(form.mem_cache_size);
  if (isPresent(form.minimum_object_size)) result['minimum-object-size'] = String(form.minimum_object_size);
  if (isPresent(form.outgoing_address)) result['outgoing-address'] = String(form.outgoing_address);
  const replyBlockMime = splitMembers(form.reply_block_mime);
  if (replyBlockMime.length) result['reply-block-mime'] = replyBlockMime;
  if (isPresent(form.reply_body_max_size)) result['reply-body-max-size'] = String(form.reply_body_max_size);
  const safePorts = splitMembers(form.safe_ports);
  if (safePorts.length) result['safe-ports'] = safePorts;
  const sslSafePorts = splitMembers(form.ssl_safe_ports);
  if (sslSafePorts.length) result['ssl-safe-ports'] = sslSafePorts;

  const listenAddresses = {};
  for (const item of form.listen_addresses || []) {
    if (!item.address) continue;
    const cfg = {};
    if (isPresent(item.port)) cfg.port = String(item.port);
    if (item.disable_transparent) cfg['disable-transparent'] = '';
    listenAddresses[item.address] = cfg;
  }
  if (Object.keys(listenAddresses).length) result['listen-address'] = listenAddresses;

  const auth = {};
  if (isPresent(form.authentication?.method)) auth.method = String(form.authentication.method);
  if (isPresent(form.authentication?.children)) auth.children = String(form.authentication.children);
  if (isPresent(form.authentication?.credentials_ttl)) auth['credentials-ttl'] = String(form.authentication.credentials_ttl);
  if (isPresent(form.authentication?.realm)) auth.realm = String(form.authentication.realm);

  const ldap = {};
  const lf = form.authentication?.ldap || {};
  if (isPresent(lf.server)) ldap.server = String(lf.server);
  if (isPresent(lf.port)) ldap.port = String(lf.port);
  if (lf.use_ssl) ldap['use-ssl'] = '';
  if (isPresent(lf.version)) ldap.version = String(lf.version);
  if (isPresent(lf.base_dn)) ldap['base-dn'] = String(lf.base_dn);
  if (isPresent(lf.bind_dn)) ldap['bind-dn'] = String(lf.bind_dn);
  if (isPresent(lf.password)) ldap.password = String(lf.password);
  if (isPresent(lf.filter_expression)) ldap['filter-expression'] = String(lf.filter_expression);
  if (isPresent(lf.username_attribute)) ldap['username-attribute'] = String(lf.username_attribute);
  if (lf.persistent_connection) ldap['persistent-connection'] = '';
  if (Object.keys(ldap).length) auth.ldap = ldap;
  if (Object.keys(auth).length) result.authentication = auth;

  const cachePeers = {};
  for (const item of form.cache_peers || []) {
    if (!item.name) continue;
    const p = {};
    if (isPresent(item.address)) p.address = String(item.address);
    if (isPresent(item.type)) p.type = String(item.type);
    if (isPresent(item.http_port)) p['http-port'] = String(item.http_port);
    if (isPresent(item.icp_port)) p['icp-port'] = String(item.icp_port);
    if (isPresent(item.options)) p.options = String(item.options);
    cachePeers[item.name] = p;
  }
  if (Object.keys(cachePeers).length) result['cache-peer'] = cachePeers;

  const sg = form.url_filtering?.squidguard;
  if (sg) {
    const squidguard = {};
    if (isPresent(sg.default_action)) squidguard['default-action'] = String(sg.default_action);
    if (isPresent(sg.redirect_url)) squidguard['redirect-url'] = String(sg.redirect_url);
    if (sg.allow_ipaddr_url) squidguard['allow-ipaddr-url'] = '';
    if (sg.enable_safe_search) squidguard['enable-safe-search'] = '';
    const allowCategory = splitMembers(sg.allow_category);
    if (allowCategory.length) squidguard['allow-category'] = allowCategory;
    const blockCategory = splitMembers(sg.block_category);
    if (blockCategory.length) squidguard['block-category'] = blockCategory;
    const log = splitMembers(sg.log);
    if (log.length) squidguard.log = log;
    const localBlock = splitMembers(sg.local_block);
    if (localBlock.length) squidguard['local-block'] = localBlock;
    const localBlockKeyword = splitMembers(sg.local_block_keyword);
    if (localBlockKeyword.length) squidguard['local-block-keyword'] = localBlockKeyword;
    const localBlockUrl = splitMembers(sg.local_block_url);
    if (localBlockUrl.length) squidguard['local-block-url'] = localBlockUrl;
    const localOk = splitMembers(sg.local_ok);
    if (localOk.length) squidguard['local-ok'] = localOk;
    const localOkUrl = splitMembers(sg.local_ok_url);
    if (localOkUrl.length) squidguard['local-ok-url'] = localOkUrl;

    const au = sg.auto_update || {};
    const autoUpdate = {};
    if (isPresent(au.update_hour)) autoUpdate['update-hour'] = String(au.update_hour);
    if (Object.keys(autoUpdate).length) squidguard['auto-update'] = autoUpdate;

    const rules = {};
    for (const item of sg.rules || []) {
      if (!isPresent(item.number)) continue;
      const r = {};
      if (isPresent(item.source_group)) r['source-group'] = String(item.source_group);
      if (isPresent(item.default_action)) r['default-action'] = String(item.default_action);
      if (isPresent(item.time_period)) r['time-period'] = String(item.time_period);
      if (item.allow_ipaddr_url) r['allow-ipaddr-url'] = '';
      if (item.enable_safe_search) r['enable-safe-search'] = '';
      const rac = splitMembers(item.allow_category);
      if (rac.length) r['allow-category'] = rac;
      const rbc = splitMembers(item.block_category);
      if (rbc.length) r['block-category'] = rbc;
      const rlb = splitMembers(item.local_block);
      if (rlb.length) r['local-block'] = rlb;
      const rlbk = splitMembers(item.local_block_keyword);
      if (rlbk.length) r['local-block-keyword'] = rlbk;
      const rlbu = splitMembers(item.local_block_url);
      if (rlbu.length) r['local-block-url'] = rlbu;
      const rlo = splitMembers(item.local_ok);
      if (rlo.length) r['local-ok'] = rlo;
      const rlou = splitMembers(item.local_ok_url);
      if (rlou.length) r['local-ok-url'] = rlou;
      const rlog = splitMembers(item.log);
      if (rlog.length) r.log = rlog;
      if (isPresent(item.redirect_url)) r['redirect-url'] = String(item.redirect_url);
      rules[String(item.number)] = r;
    }
    if (Object.keys(rules).length) squidguard.rule = rules;

    const sourceGroups = {};
    for (const item of sg.source_groups || []) {
      if (!item.name) continue;
      const g = {};
      if (isPresent(item.description)) g.description = String(item.description);
      const domains = splitMembers(item.domain);
      if (domains.length) g.domain = domains;
      const addrs = splitMembers(item.address);
      if (addrs.length) g.address = addrs;
      const users = splitMembers(item.user);
      if (users.length) g.user = users;
      const ldapIp = splitMembers(item.ldap_ip_search);
      if (ldapIp.length) g['ldap-ip-search'] = ldapIp;
      const ldapUser = splitMembers(item.ldap_user_search);
      if (ldapUser.length) g['ldap-user-search'] = ldapUser;
      if (Object.keys(g).length) sourceGroups[item.name] = g;
    }
    if (Object.keys(sourceGroups).length) squidguard['source-group'] = sourceGroups;

    const timePeriods = {};
    for (const item of sg.time_periods || []) {
      if (!item.name) continue;
      const parsed = parseTimePeriods(item.ranges);
      if (!Object.keys(parsed).length) continue;
      const t = {};
      if (isPresent(item.description)) t.description = String(item.description);
      const days = {};
      for (const [day, time] of Object.entries(parsed)) {
        days[day] = { time: String(time) };
      }
      if (Object.keys(days).length) t.days = days;
      if (Object.keys(t).length) timePeriods[item.name] = t;
    }
    if (Object.keys(timePeriods).length) squidguard['time-period'] = timePeriods;

    if (Object.keys(squidguard).length) result['url-filtering'] = { squidguard };
  }

  return result;
}

function defaultListenAddress() {
  return { address: '', port: '', disable_transparent: false };
}

function defaultCachePeer() {
  return { name: '', address: '', type: 'parent', http_port: '', icp_port: '', options: '' };
}

function defaultRule() {
  return { number: '', source_group: '', default_action: 'allow', time_period: '', allow_ipaddr_url: false, enable_safe_search: false, allow_category: '', block_category: '', local_block: '', local_block_keyword: '', local_block_url: '', local_ok: '', local_ok_url: '', log: '', redirect_url: '' };
}

function defaultSourceGroup() {
  return { name: '', description: '', domain: '', address: '', user: '', ldap_ip_search: '', ldap_user_search: '' };
}

function defaultTimePeriod() {
  return { name: '', description: '', ranges: '' };
}

export default defineComponent({
  name: 'WebProxyPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(webproxyToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const commandPath = 'service webproxy';

    const listenColumns = [
      { key: 'address', title: '监听地址' },
      { key: 'port', title: '端口' },
      { key: 'disable_transparent', title: '非透明' },
    ];
    const peerColumns = [
      { key: 'name', title: '名称' },
      { key: 'address', title: '地址' },
      { key: 'type', title: '类型' },
      { key: 'http_port', title: 'HTTP 端口' },
      { key: 'icp_port', title: 'ICP 端口' },
    ];
    const ruleColumns = [
      { key: 'number', title: '规则编号' },
      { key: 'source_group', title: '源组' },
      { key: 'default_action', title: '默认动作' },
      { key: 'time_period', title: '时间段' },
    ];
    const sourceGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'address', title: '地址' },
      { key: 'description', title: '描述' },
    ];
    const timePeriodColumns = [
      { key: 'name', title: '名称' },
      { key: 'ranges', title: '时间段' },
      { key: 'description', title: '描述' },
    ];

    const listenRows = computed(() => (config.value.listen_addresses || []).map(item => ({
      _address: item.address,
      address: item.address,
      port: item.port || '-',
      disable_transparent: item.disable_transparent ? '是' : '否',
    })));
    const peerRows = computed(() => (config.value.cache_peers || []).map(item => ({
      _name: item.name,
      name: item.name,
      address: item.address,
      type: item.type,
      http_port: item.http_port || '-',
      icp_port: item.icp_port || '-',
    })));
    const ruleRows = computed(() => (config.value.url_filtering?.squidguard?.rules || []).map(item => ({
      _number: item.number,
      number: item.number,
      source_group: item.source_group,
      default_action: item.default_action,
      time_period: item.time_period || '-',
    })));
    const sourceGroupRows = computed(() => (config.value.url_filtering?.squidguard?.source_groups || []).map(item => ({
      _name: item.name,
      name: item.name,
      address: item.address,
      description: item.description,
    })));
    const timePeriodRows = computed(() => (config.value.url_filtering?.squidguard?.time_periods || []).map(item => ({
      _name: item.name,
      name: item.name,
      ranges: item.ranges,
      description: item.description,
    })));
    const sourceGroupOptions = computed(() => (config.value.url_filtering?.squidguard?.source_groups || []).map(g => g.name));
    const timePeriodOptions = computed(() => (config.value.url_filtering?.squidguard?.time_periods || []).map(t => t.name));

    const modals = ref({
      listen: false,
      peer: false,
      rule: false,
      sourceGroup: false,
      timePeriod: false,
    });
    const titles = ref({
      listen: '', peer: '', rule: '', sourceGroup: '', timePeriod: '',
    });
    const editing = ref({
      listen: defaultListenAddress(),
      peer: defaultCachePeer(),
      rule: defaultRule(),
      sourceGroup: defaultSourceGroup(),
      timePeriod: defaultTimePeriod(),
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service webproxy', true);
        config.value = webproxyToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function openModal(type, item = null, titleText) {
      const defaults = {
        listen: defaultListenAddress,
        peer: defaultCachePeer,
        rule: defaultRule,
        sourceGroup: defaultSourceGroup,
        timePeriod: defaultTimePeriod,
      };
      editing.value[type] = item ? { ...item } : defaults[type]();
      titles.value[type] = titleText;
      modals.value[type] = true;
    }

    function saveListenAddress() {
      const item = editing.value.listen;
      const err = validateRequired(item.address, '请输入监听地址') || validateIPv4(item.address)
        || (item.port ? validateRange(item.port, 1025, 65535, '监听端口') : '');
      if (err) return alert(err);
      const list = config.value.listen_addresses;
      const idx = list.findIndex(x => x._address === item._address);
      const newItem = { ...item };
      if (idx >= 0) {
        list[idx] = newItem;
      } else {
        if (list.some(x => x.address === item.address)) return alert('监听地址已存在');
        list.push(newItem);
      }
      modals.value.listen = false;
    }

    function deleteListenAddress(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.address];
      const names = keys.map(k => config.value.listen_addresses.find(x => x.address === k)?.address).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除监听地址 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      config.value.listen_addresses = config.value.listen_addresses.filter(x => !keys.includes(x.address));
    }

    function saveCachePeer() {
      const item = editing.value.peer;
      const err = validateName(item.name) || validateHostOrIPv4(item.address)
        || (item.http_port ? validateRange(item.http_port, 1025, 65535, 'HTTP 端口') : '')
        || validateRange(item.icp_port, 0, 65535, 'ICP 端口');
      if (err) return alert(err);
      const list = config.value.cache_peers;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return alert('缓存对等体名称已存在');
        list.push({ ...item });
      }
      modals.value.peer = false;
    }

    function deleteCachePeer(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.cache_peers.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除缓存对等体 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      config.value.cache_peers = config.value.cache_peers.filter(x => !keys.includes(x.name));
    }

    function saveRule() {
      const item = editing.value.rule;
      const err = validateRuleNumber(item.number)
        || validateRequired(item.source_group, '请选择源组')
        || (sourceGroupOptions.value.includes(item.source_group) ? '' : '源组不存在')
        || validateList(item.local_block, validateIPv4OrFQDN)
        || validateList(item.local_ok, validateIPv4OrFQDN)
        || validateList(item.local_block_url, validateURL)
        || validateList(item.local_ok_url, validateURL)
        || validateList(item.local_block_keyword, validateKeyword);
      if (err) return alert(err);
      const list = config.value.url_filtering.squidguard.rules;
      const idx = list.findIndex(x => x._number === item._number);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.number === item.number)) return alert('规则编号已存在');
        list.push({ ...item });
      }
      modals.value.rule = false;
    }

    function deleteRule(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.number];
      const numbers = keys.map(k => config.value.url_filtering.squidguard.rules.find(x => x.number === k)?.number).filter(Boolean);
      if (!numbers.length) return;
      if (!confirm(`确认删除规则 ${numbers.map(n => `"${n}"`).join(', ')}？`)) return;
      const list = config.value.url_filtering.squidguard.rules;
      config.value.url_filtering.squidguard.rules = list.filter(x => !numbers.includes(x.number));
    }

    function saveSourceGroup() {
      const item = editing.value.sourceGroup;
      const err = validateName(item.name) || validateRequired(item.address, '请输入地址');
      if (err) return alert(err);
      const list = config.value.url_filtering.squidguard.source_groups;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return alert('源组名称已存在');
        list.push({ ...item });
      }
      modals.value.sourceGroup = false;
    }

    function deleteSourceGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.url_filtering.squidguard.source_groups.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除源组 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      const list = config.value.url_filtering.squidguard.source_groups;
      config.value.url_filtering.squidguard.source_groups = list.filter(x => !keys.includes(x.name));
    }

    function saveTimePeriod() {
      const item = editing.value.timePeriod;
      const err = validateName(item.name) || validateRequired(item.ranges, '请输入时间段');
      if (err) return alert(err);
      const parsed = parseTimePeriods(item.ranges);
      if (!Object.keys(parsed).length) return alert('时间段格式错误，示例：Sun 09:00 - 17:00');
      const list = config.value.url_filtering.squidguard.time_periods;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return alert('时间段名称已存在');
        list.push({ ...item });
      }
      modals.value.timePeriod = false;
    }

    function deleteTimePeriod(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.url_filtering.squidguard.time_periods.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除时间段 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      const list = config.value.url_filtering.squidguard.time_periods;
      config.value.url_filtering.squidguard.time_periods = list.filter(x => !keys.includes(x.name));
    }

    function validate() {
      const c = config.value;
      if (isPresent(c.default_port)) {
        const err = validateRange(c.default_port, 1025, 65535, '默认端口');
        if (err) return err;
      }
      if (isPresent(c.cache_size)) {
        const err = validateRange(c.cache_size, 0, 1000000, '缓存大小');
        if (err) return err;
      }
      if (isPresent(c.mem_cache_size)) {
        const err = validateRange(c.mem_cache_size, 1, 100000, '内存缓存');
        if (err) return err;
      }
      if (isPresent(c.maximum_object_size)) {
        const err = validateRange(c.maximum_object_size, 1, 1000000, '最大对象大小');
        if (err) return err;
      }
      if (isPresent(c.minimum_object_size)) {
        const err = validateRange(c.minimum_object_size, 1, 100000, '最小对象大小');
        if (err) return err;
      }
      if (isPresent(c.reply_body_max_size)) {
        const err = validateRange(c.reply_body_max_size, 1, 100000, '回复体最大大小');
        if (err) return err;
      }
      if (isPresent(c.append_domain)) {
        const err = validateAppendDomain(c.append_domain);
        if (err) return err;
      }
      if (isPresent(c.outgoing_address)) {
        const err = validateIPv4(c.outgoing_address);
        if (err) return err;
      }
      let listErr = validateList(c.safe_ports, validateSafePort);
      if (listErr) return `安全端口: ${listErr}`;
      listErr = validateList(c.ssl_safe_ports, validateSSLSafePort);
      if (listErr) return `SSL 安全端口: ${listErr}`;

      for (const item of c.listen_addresses || []) {
        const err = validateIPv4(item.address) || (item.port ? validateRange(item.port, 1025, 65535, '监听端口') : '');
        if (err) return `监听地址 ${item.address}: ${err}`;
      }
      for (const item of c.cache_peers || []) {
        const err = validateHostOrIPv4(item.address)
          || (item.http_port ? validateRange(item.http_port, 1025, 65535, 'HTTP 端口') : '')
          || validateRange(item.icp_port, 0, 65535, 'ICP 端口');
        if (err) return `缓存对等体 ${item.name}: ${err}`;
      }

      const auth = c.authentication;
      if (auth.method === 'ldap') {
        if (!isPresent(auth.ldap.server)) return 'LDAP 认证需要服务器地址';
        if (!isPresent(auth.ldap.base_dn)) return 'LDAP 认证需要 Base DN';
        if (isPresent(auth.ldap.port)) {
          const err = validateRange(auth.ldap.port, 1, 65535, 'LDAP 端口');
          if (err) return err;
        }
        if (isPresent(auth.ldap.version)) {
          const err = validateRange(auth.ldap.version, 2, 3, 'LDAP 版本');
          if (err) return err;
        }
        if ((isPresent(auth.ldap.bind_dn) || isPresent(auth.ldap.password)) && !(isPresent(auth.ldap.bind_dn) && isPresent(auth.ldap.password))) {
          return 'LDAP bind-dn 和 password 必须同时设置';
        }
      }
      if (isPresent(auth.children)) {
        const err = validateRange(auth.children, 1, 500, '认证子进程数');
        if (err) return err;
      }
      if (isPresent(auth.credentials_ttl)) {
        const err = validateRange(auth.credentials_ttl, 1, 600, '凭证有效期');
        if (err) return err;
      }

      const sg = c.url_filtering?.squidguard;
      if (sg) {
        if (isPresent(sg.auto_update?.update_hour)) {
          const err = validateRange(sg.auto_update.update_hour, 0, 23, '更新小时');
          if (err) return err;
        }
        listErr = validateList(sg.local_block, validateIPv4OrFQDN);
        if (listErr) return `本地阻断域名: ${listErr}`;
        listErr = validateList(sg.local_ok, validateIPv4OrFQDN);
        if (listErr) return `本地允许域名: ${listErr}`;
        listErr = validateList(sg.local_block_url, validateURL);
        if (listErr) return `本地阻断 URL: ${listErr}`;
        listErr = validateList(sg.local_ok_url, validateURL);
        if (listErr) return `本地允许 URL: ${listErr}`;
        listErr = validateList(sg.local_block_keyword, validateKeyword);
        if (listErr) return `本地阻断关键字: ${listErr}`;
        for (const item of sg.rules || []) {
          const err = validateRuleNumber(item.number)
            || validateRequired(item.source_group, '请选择源组')
            || (sourceGroupOptions.value.includes(item.source_group) ? '' : '源组不存在');
          if (err) return `规则 ${item.number}: ${err}`;
        }
      }
      return '';
    }

    async function save() {
      const err = validate();
      if (err) return alert(err);
      saving.value = true;
      try {
        const value = webproxyToConfig(config.value);
        const paths = [
          'service webproxy',
        ];
        for (const p of paths) {
          try { await configApi.delete(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configApi.set('service webproxy', value);
        }
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      listenColumns, peerColumns, ruleColumns, sourceGroupColumns, timePeriodColumns,
      listenRows, peerRows, ruleRows, sourceGroupRows, timePeriodRows, sourceGroupOptions, timePeriodOptions,
      modals, titles, editing,
      load, save,
      openModal,
      saveListenAddress, deleteListenAddress,
      saveCachePeer, deleteCachePeer,
      saveRule, deleteRule,
      saveSourceGroup, deleteSourceGroup,
      saveTimePeriod, deleteTimePeriod,
      AUTH_METHOD_OPTIONS, CACHE_PEER_TYPE_OPTIONS, DEFAULT_ACTION_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton, DraggableModal, DataTable, CommandPreview },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'listen', title: '监听地址' },
        { key: 'auth', title: '认证' },
        { key: 'peers', title: '缓存对等体' },
        { key: 'url-filter', title: 'URL 过滤' }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">默认端口</label><input type="number" min="1025" max="65535" class="form-control" v-model="config.default_port" placeholder="3128" /></div>
          <div class="form-row"><label class="form-label">缓存大小 (MB)</label><input type="number" min="0" class="form-control" v-model="config.cache_size" placeholder="100 (0 表示禁用)" /></div>
          <div class="form-row"><label class="form-label">内存缓存 (MB)</label><input type="number" min="1" max="100000" class="form-control" v-model="config.mem_cache_size" placeholder="20" /></div>
          <div class="form-row"><label class="form-label">最大对象大小 (KB)</label><input type="number" min="1" max="1000000" class="form-control" v-model="config.maximum_object_size" placeholder="1-1000000" /></div>
          <div class="form-row"><label class="form-label">最小对象大小 (KB)</label><input type="number" min="1" max="100000" class="form-control" v-model="config.minimum_object_size" placeholder="1-100000" /></div>
          <div class="form-row"><label class="form-label">回复体最大大小 (KB)</label><input type="number" min="1" max="100000" class="form-control" v-model="config.reply_body_max_size" placeholder="1-100000" /></div>
          <div class="form-row"><label class="form-label">默认域名</label><input class="form-control" v-model="config.append_domain" placeholder=".example.com" /></div>
          <div class="form-row"><label class="form-label">外出地址</label><input class="form-control" v-model="config.outgoing_address" placeholder="IPv4 地址" /></div>
          <div class="form-row">
            <label class="form-label">禁用访问日志</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.disable_access_log" /> 禁用</label>
          </div>
          <div class="form-row"><label class="form-label">阻断域名</label><textarea class="form-control" v-model="config.domain_block" rows="3" placeholder="每行一个域名"></textarea></div>
          <div class="form-row"><label class="form-label">不缓存域名</label><textarea class="form-control" v-model="config.domain_noncache" rows="3" placeholder="每行一个域名"></textarea></div>
          <div class="form-row"><label class="form-label">阻断 MIME 类型</label><textarea class="form-control" v-model="config.reply_block_mime" rows="3" placeholder="每行一个 MIME 类型"></textarea></div>
          <div class="form-row"><label class="form-label">安全端口</label><textarea class="form-control" v-model="config.safe_ports" rows="2" placeholder="每行一个端口"></textarea></div>
          <div class="form-row"><label class="form-label">SSL 安全端口</label><textarea class="form-control" v-model="config.ssl_safe_ports" rows="2" placeholder="每行一个端口"></textarea></div>
        </template>

        <template #listen>
          <div class="data-table-wrapper">
            <DataTable :columns="listenColumns" :data="listenRows" row-key="address" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openModal('listen', null, '创建监听地址')" @edit="row => openModal('listen', config.listen_addresses.find(x => x.address === row.address), '编辑监听地址')" @delete="deleteListenAddress" @refresh="load" />
          </div>
        </template>

        <template #auth>
          <div class="form-row">
            <label class="form-label">认证方式</label>
            <select class="form-control" v-model="config.authentication.method">
              <option value="">无</option>
              <option v-for="m in AUTH_METHOD_OPTIONS.slice(1)" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <template v-if="config.authentication.method">
            <div class="form-row"><label class="form-label">认证子进程数</label><input type="number" min="1" max="500" class="form-control" v-model="config.authentication.children" placeholder="5" /></div>
            <div class="form-row"><label class="form-label">凭证有效期 (分钟)</label><input type="number" min="1" max="600" class="form-control" v-model="config.authentication.credentials_ttl" placeholder="60" /></div>
            <div class="form-row"><label class="form-label">认证域</label><input class="form-control" v-model="config.authentication.realm" placeholder="My Company proxy server" /></div>
          </template>
          <template v-if="config.authentication.method === 'ldap'">
            <div class="form-section"><div class="form-section-title">LDAP 设置</div>
              <div class="form-row"><label class="form-label">服务器</label><input class="form-control" v-model="config.authentication.ldap.server" placeholder="ldap.example.com" /></div>
              <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="config.authentication.ldap.port" placeholder="389" /></div>
              <div class="form-row"><label class="form-label">Base DN</label><input class="form-control" v-model="config.authentication.ldap.base_dn" placeholder="dc=example,dc=com" /></div>
              <div class="form-row"><label class="form-label">Bind DN</label><input class="form-control" v-model="config.authentication.ldap.bind_dn" /></div>
              <div class="form-row"><label class="form-label">密码</label><input type="password" class="form-control" v-model="config.authentication.ldap.password" /></div>
              <div class="form-row"><label class="form-label">过滤表达式</label><input class="form-control" v-model="config.authentication.ldap.filter_expression" /></div>
              <div class="form-row"><label class="form-label">用户名属性</label><input class="form-control" v-model="config.authentication.ldap.username_attribute" placeholder="uid" /></div>
              <div class="form-row"><label class="form-label">协议版本</label><input type="number" min="2" max="3" class="form-control" v-model="config.authentication.ldap.version" placeholder="3" /></div>
              <div class="form-row">
                <label class="form-label">使用 SSL/TLS</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.authentication.ldap.use_ssl" /> 启用</label>
              </div>
              <div class="form-row">
                <label class="form-label">持久连接</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.authentication.ldap.persistent_connection" /> 启用</label>
              </div>
            </div>
          </template>
        </template>

        <template #peers>
          <div class="data-table-wrapper">
            <DataTable :columns="peerColumns" :data="peerRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openModal('peer', null, '创建缓存对等体')" @edit="row => openModal('peer', config.cache_peers.find(x => x.name === row.name), '编辑缓存对等体')" @delete="deleteCachePeer" @refresh="load" />
          </div>
        </template>

        <template #url-filter>
          <div class="form-section"><div class="form-section-title">SquidGuard 设置</div>
            <div class="form-row">
              <label class="form-label">默认动作</label>
              <select class="form-control" v-model="config.url_filtering.squidguard.default_action">
                <option v-for="a in DEFAULT_ACTION_OPTIONS" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
            <div class="form-row"><label class="form-label">重定向 URL</label><input class="form-control" v-model="config.url_filtering.squidguard.redirect_url" placeholder="block.vyos.net" /></div>
            <div class="form-row">
              <label class="form-label">允许 IP 地址 URL</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.url_filtering.squidguard.allow_ipaddr_url" /> 启用</label>
            </div>
            <div class="form-row">
              <label class="form-label">启用安全搜索</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.url_filtering.squidguard.enable_safe_search" /> 启用</label>
            </div>
            <div class="form-row"><label class="form-label">允许分类</label><textarea class="form-control" v-model="config.url_filtering.squidguard.allow_category" rows="2" placeholder="每行一个分类"></textarea></div>
            <div class="form-row"><label class="form-label">阻断分类</label><textarea class="form-control" v-model="config.url_filtering.squidguard.block_category" rows="2" placeholder="每行一个分类"></textarea></div>
            <div class="form-row"><label class="form-label">日志分类</label><textarea class="form-control" v-model="config.url_filtering.squidguard.log" rows="2" placeholder="每行一个分类"></textarea></div>
            <div class="form-row"><label class="form-label">本地阻断域名</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block" rows="2" placeholder="每行一个域名"></textarea></div>
            <div class="form-row"><label class="form-label">本地阻断关键字</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block_keyword" rows="2" placeholder="每行一个关键字"></textarea></div>
            <div class="form-row"><label class="form-label">本地阻断 URL</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block_url" rows="2" placeholder="每行一个 URL"></textarea></div>
            <div class="form-row"><label class="form-label">本地允许域名</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_ok" rows="2" placeholder="每行一个域名"></textarea></div>
            <div class="form-row"><label class="form-label">本地允许 URL</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_ok_url" rows="2" placeholder="每行一个 URL"></textarea></div>
          </div>

          <div class="form-section"><div class="form-section-title">自动更新</div>
            <div class="form-row"><label class="form-label">更新小时</label><input type="number" min="0" max="23" class="form-control" v-model="config.url_filtering.squidguard.auto_update.update_hour" placeholder="0-23" /></div>
          </div>

          <div class="form-section"><div class="form-section-title">源组</div>
            <div class="data-table-wrapper">
              <DataTable :columns="sourceGroupColumns" :data="sourceGroupRows" row-key="name" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openModal('sourceGroup', null, '创建源组')" @edit="row => openModal('sourceGroup', config.url_filtering.squidguard.source_groups.find(x => x.name === row.name), '编辑源组')" @delete="deleteSourceGroup" @refresh="load" />
            </div>
          </div>

          <div class="form-section"><div class="form-section-title">时间段</div>
            <div class="data-table-wrapper">
              <DataTable :columns="timePeriodColumns" :data="timePeriodRows" row-key="name" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openModal('timePeriod', null, '创建时间段')" @edit="row => openModal('timePeriod', config.url_filtering.squidguard.time_periods.find(x => x.name === row.name), '编辑时间段')" @delete="deleteTimePeriod" @refresh="load" />
            </div>
          </div>

          <div class="form-section"><div class="form-section-title">规则</div>
            <div class="data-table-wrapper">
              <DataTable :columns="ruleColumns" :data="ruleRows" row-key="number" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openModal('rule', null, '创建规则')" @edit="row => openModal('rule', config.url_filtering.squidguard.rules.find(x => x.number === row.number), '编辑规则')" @delete="deleteRule" @refresh="load" />
            </div>
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="modals.listen" :title="titles.listen">
        <div class="form-row"><label class="form-label">监听地址</label><input class="form-control" v-model="editing.listen.address" placeholder="IPv4 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="editing.listen.port" placeholder="留空使用默认端口" /></div>
        <div class="form-row"><label class="form-label">非透明模式</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.listen.disable_transparent" /> 启用</label></div>
        <div class="form-actions">
          <ToolbarButton @click="modals.listen = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveListenAddress">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.peer" :title="titles.peer">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editing.peer.name" placeholder="FQDN" /></div>
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editing.peer.address" placeholder="IP 地址或主机名" /></div>
        <div class="form-row"><label class="form-label">类型</label><select class="form-control" v-model="editing.peer.type"><option v-for="t in CACHE_PEER_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option></select></div>
        <div class="form-row"><label class="form-label">HTTP 端口</label><input type="number" min="1025" max="65535" class="form-control" v-model="editing.peer.http_port" placeholder="1025-65535" /></div>
        <div class="form-row"><label class="form-label">ICP 端口</label><input type="number" min="0" max="65535" class="form-control" v-model="editing.peer.icp_port" placeholder="0-65535 (0 表示禁用)" /></div>
        <div class="form-row"><label class="form-label">选项</label><input class="form-control" v-model="editing.peer.options" placeholder="例如 default" /></div>
        <div class="form-actions">
          <ToolbarButton @click="modals.peer = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveCachePeer">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.sourceGroup" :title="titles.sourceGroup">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editing.sourceGroup.name" /></div>
        <div class="form-row"><label class="form-label">地址列表</label><textarea class="form-control" v-model="editing.sourceGroup.address" rows="4" placeholder="每行一个 IP 或子网"></textarea></div>
        <div class="form-row"><label class="form-label">域名列表</label><textarea class="form-control" v-model="editing.sourceGroup.domain" rows="3" placeholder="每行一个域名"></textarea></div>
        <div class="form-row"><label class="form-label">用户列表</label><textarea class="form-control" v-model="editing.sourceGroup.user" rows="3" placeholder="每行一个用户名"></textarea></div>
        <div class="form-row"><label class="form-label">LDAP IP 搜索</label><textarea class="form-control" v-model="editing.sourceGroup.ldap_ip_search" rows="2" placeholder="每行一个 LDAP 搜索表达式"></textarea></div>
        <div class="form-row"><label class="form-label">LDAP 用户搜索</label><textarea class="form-control" v-model="editing.sourceGroup.ldap_user_search" rows="2" placeholder="每行一个 LDAP 搜索表达式"></textarea></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editing.sourceGroup.description" placeholder="最多 255 字符" /></div>
        <div class="form-actions">
          <ToolbarButton @click="modals.sourceGroup = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveSourceGroup">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.timePeriod" :title="titles.timePeriod">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editing.timePeriod.name" /></div>
        <div class="form-row"><label class="form-label">时间段</label><textarea class="form-control" v-model="editing.timePeriod.ranges" rows="5" placeholder="每行一个，示例：&#10;Sun 09:00-17:00&#10;Mon 09:00-17:00"></textarea></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editing.timePeriod.description" placeholder="最多 255 字符" /></div>
        <div class="form-actions">
          <ToolbarButton @click="modals.timePeriod = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveTimePeriod">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.rule" :title="titles.rule">
        <div class="form-row"><label class="form-label">规则编号</label><input type="number" min="1" max="1024" class="form-control" v-model="editing.rule.number" placeholder="1-1024" /></div>
        <div class="form-row"><label class="form-label">源组</label><select class="form-control" v-model="editing.rule.source_group"><option value="">请选择</option><option v-for="g in sourceGroupOptions" :key="g" :value="g">{{ g }}</option></select></div>
        <div class="form-row"><label class="form-label">默认动作</label><select class="form-control" v-model="editing.rule.default_action"><option v-for="a in DEFAULT_ACTION_OPTIONS" :key="a" :value="a">{{ a }}</option></select></div>
        <div class="form-row"><label class="form-label">时间段</label><select class="form-control" v-model="editing.rule.time_period"><option value="">无</option><option v-for="p in timePeriodOptions" :key="p" :value="p">{{ p }}</option></select></div>
        <div class="form-row">
          <label class="form-label">允许 IP 地址 URL</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.rule.allow_ipaddr_url" /> 启用</label>
        </div>
        <div class="form-row">
          <label class="form-label">启用安全搜索</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.rule.enable_safe_search" /> 启用</label>
        </div>
        <div class="form-row"><label class="form-label">允许分类</label><textarea class="form-control" v-model="editing.rule.allow_category" rows="2" placeholder="每行一个分类"></textarea></div>
        <div class="form-row"><label class="form-label">阻断分类</label><textarea class="form-control" v-model="editing.rule.block_category" rows="2" placeholder="每行一个分类"></textarea></div>
        <div class="form-row"><label class="form-label">本地阻断域名</label><textarea class="form-control" v-model="editing.rule.local_block" rows="2" placeholder="每行一个域名"></textarea></div>
        <div class="form-row"><label class="form-label">本地阻断关键字</label><textarea class="form-control" v-model="editing.rule.local_block_keyword" rows="2" placeholder="每行一个关键字"></textarea></div>
        <div class="form-row"><label class="form-label">本地阻断 URL</label><textarea class="form-control" v-model="editing.rule.local_block_url" rows="2" placeholder="每行一个 URL"></textarea></div>
        <div class="form-row"><label class="form-label">本地允许域名</label><textarea class="form-control" v-model="editing.rule.local_ok" rows="2" placeholder="每行一个域名"></textarea></div>
        <div class="form-row"><label class="form-label">本地允许 URL</label><textarea class="form-control" v-model="editing.rule.local_ok_url" rows="2" placeholder="每行一个 URL"></textarea></div>
        <div class="form-row"><label class="form-label">日志分类</label><textarea class="form-control" v-model="editing.rule.log" rows="2" placeholder="每行一个分类"></textarea></div>
        <div class="form-row"><label class="form-label">重定向 URL</label><input class="form-control" v-model="editing.rule.redirect_url" placeholder="block.vyos.net" /></div>
        <div class="form-actions">
          <ToolbarButton @click="modals.rule = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveRule">保存</ToolbarButton>
        </div>
      </DraggableModal>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
