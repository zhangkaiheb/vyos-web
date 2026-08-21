import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DataTable from '/src/components/Table/DataTable.js';
import { useI18n } from '/src/i18n/index.js';

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

function validateName(name, t) {
  if (!name || !String(name).trim()) return t('webproxy.validation.nameRequired');
  if (!/^[a-zA-Z0-9_.:-]+$/.test(String(name))) return t('webproxy.validation.nameInvalidChars');
  return '';
}

function validateIPv4(value, t) {
  if (!value) return '';
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!re.test(value)) return t('webproxy.validation.ipv4Invalid');
  return '';
}

function validateHostOrIPv4(value, t) {
  if (!value) return '';
  if (!validateIPv4(value, t)) return '';
  const hostRe = /^(?=.{1,253}$)[a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?(\.[a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?)*\.?$/;
  if (!hostRe.test(value)) return t('webproxy.validation.hostOrIpv4Invalid');
  return '';
}

function validateRange(value, min, max, nameKey, t, params = {}) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < min || n > max) return t(nameKey, { min, max, ...params });
  return '';
}

function validatePort(value, t, allowZero = false) {
  const min = allowZero ? 0 : 1;
  return validateRange(value, min, 65535, 'webproxy.validation.portRange', t);
}

function validatePortList(text, t, allowZero = false) {
  for (const line of splitMembers(text)) {
    const err = validatePort(line, t, allowZero);
    if (err) return err;
  }
  return '';
}

function validateRequired(value, msg) {
  if (!isPresent(value)) return msg;
  return '';
}

function validateFQDN(value, t) {
  if (!value) return '';
  const re = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,63}$/;
  if (!re.test(value)) return t('webproxy.validation.fqdnInvalid');
  return '';
}

function validateIPv4OrFQDN(value, t) {
  if (!value) return '';
  if (!validateIPv4(value, t) || !validateFQDN(value, t)) return '';
  return t('webproxy.validation.ipv4OrFqdnInvalid');
}

function validateURL(value, t) {
  if (!value) return '';
  const re = /^(\/[a-zA-Z0-9_\-./?&=+%~#]*)$/;
  if (!re.test(value)) return t('webproxy.validation.urlInvalid');
  return '';
}

function validateAppendDomain(value, t) {
  if (!value) return '';
  if (!value.startsWith('.')) return t('webproxy.validation.appendDomainMustStartWithDot');
  const re = /^\.[A-Za-z0-9][-.A-Za-z0-9]*$/;
  if (!re.test(value)) return t('webproxy.validation.appendDomainInvalid');
  return '';
}

function validateSafePort(value, t) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < 1 || n > 65535) return t('webproxy.validation.portRange', { min: 1, max: 65535 });
  const allowed = (n >= 1 && n <= 20) || (n >= 22 && n <= 69) || (n >= 71 && n <= 79) ||
    (n >= 81 && n <= 209) || (n >= 211 && n <= 279) || (n >= 281 && n <= 442) ||
    (n >= 444 && n <= 487) || (n >= 489 && n <= 590) || (n >= 592 && n <= 776) ||
    (n >= 778 && n <= 872) || (n >= 874 && n <= 1024) || n >= 1025;
  if (!allowed) return t('webproxy.validation.safePortAlreadyIncluded');
  return '';
}

function validateSSLSafePort(value, t) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < 1 || n > 65535) return t('webproxy.validation.portRange', { min: 1, max: 65535 });
  if (n === 443) return t('webproxy.validation.sslSafePort443Included');
  return '';
}

function validateRuleNumber(value, t) {
  return validateRange(value, 1, 1024, 'webproxy.validation.ruleNumberRange', t);
}

function validateKeyword(value, t) {
  if (!value) return '';
  if (/[\x00-\x1f]/.test(value)) return t('webproxy.validation.keywordInvalidChars');
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
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(webproxyToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const commandPath = 'service webproxy';

    const listenColumns = [
      { key: 'address', title: t('webproxy.columns.listenAddress') },
      { key: 'port', title: t('webproxy.columns.port') },
      { key: 'disable_transparent', title: t('webproxy.columns.nonTransparent') },
    ];
    const peerColumns = [
      { key: 'name', title: t('webproxy.columns.name') },
      { key: 'address', title: t('webproxy.columns.address') },
      { key: 'type', title: t('webproxy.columns.type') },
      { key: 'http_port', title: t('webproxy.columns.httpPort') },
      { key: 'icp_port', title: t('webproxy.columns.icpPort') },
    ];
    const ruleColumns = [
      { key: 'number', title: t('webproxy.columns.ruleNumber') },
      { key: 'source_group', title: t('webproxy.columns.sourceGroup') },
      { key: 'default_action', title: t('webproxy.columns.defaultAction') },
      { key: 'time_period', title: t('webproxy.columns.timePeriod') },
    ];
    const sourceGroupColumns = [
      { key: 'name', title: t('webproxy.columns.name') },
      { key: 'address', title: t('webproxy.columns.address') },
      { key: 'description', title: t('webproxy.columns.description') },
    ];
    const timePeriodColumns = [
      { key: 'name', title: t('webproxy.columns.name') },
      { key: 'ranges', title: t('webproxy.columns.timePeriod') },
      { key: 'description', title: t('webproxy.columns.description') },
    ];

    const listenRows = computed(() => (config.value.listen_addresses || []).map(item => ({
      _address: item.address,
      address: item.address,
      port: item.port || '-',
      disable_transparent: item.disable_transparent ? t('webproxy.common.yes') : t('webproxy.common.no'),
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

    const deleteListenModalVisible = ref(false);
    const pendingDeleteListenNames = ref([]);
    const deleteCachePeerModalVisible = ref(false);
    const pendingDeleteCachePeerNames = ref([]);
    const deleteRuleModalVisible = ref(false);
    const pendingDeleteRuleNumbers = ref([]);
    const deleteSourceGroupModalVisible = ref(false);
    const pendingDeleteSourceGroupNames = ref([]);
    const deleteTimePeriodModalVisible = ref(false);
    const pendingDeleteTimePeriodNames = ref([]);

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
      const err = validateRequired(item.address, t('webproxy.validation.listenAddressRequired')) || validateIPv4(item.address, t)
        || (item.port ? validateRange(item.port, 1025, 65535, 'webproxy.validation.listenPortRange', t) : '');
      if (err) return showError({ message: err });
      const list = config.value.listen_addresses;
      const idx = list.findIndex(x => x._address === item._address);
      const newItem = { ...item };
      if (idx >= 0) {
        list[idx] = newItem;
      } else {
        if (list.some(x => x.address === item.address)) return showError({ message: t('webproxy.validation.listenAddressExists') });
        list.push(newItem);
      }
      modals.value.listen = false;
    }

    function deleteListenAddress(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.address];
      const names = keys.map(k => config.value.listen_addresses.find(x => x.address === k)?.address).filter(Boolean);
      if (!names.length) return;
      pendingDeleteListenNames.value = names;
      deleteListenModalVisible.value = true;
    }

    function confirmDeleteListenAddress() {
      deleteListenModalVisible.value = false;
      config.value.listen_addresses = config.value.listen_addresses.filter(x => !pendingDeleteListenNames.value.includes(x.address));
      pendingDeleteListenNames.value = [];
    }

    function saveCachePeer() {
      const item = editing.value.peer;
      const err = validateName(item.name, t) || validateHostOrIPv4(item.address, t)
        || (item.http_port ? validateRange(item.http_port, 1025, 65535, 'webproxy.validation.httpPortRange', t) : '')
        || validateRange(item.icp_port, 0, 65535, 'webproxy.validation.icpPortRange', t);
      if (err) return showError({ message: err });
      const list = config.value.cache_peers;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return showError({ message: t('webproxy.validation.cachePeerNameExists') });
        list.push({ ...item });
      }
      modals.value.peer = false;
    }

    function deleteCachePeer(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.cache_peers.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      pendingDeleteCachePeerNames.value = names;
      deleteCachePeerModalVisible.value = true;
    }

    function confirmDeleteCachePeer() {
      deleteCachePeerModalVisible.value = false;
      config.value.cache_peers = config.value.cache_peers.filter(x => !pendingDeleteCachePeerNames.value.includes(x.name));
      pendingDeleteCachePeerNames.value = [];
    }

    function saveRule() {
      const item = editing.value.rule;
      const err = validateRuleNumber(item.number, t)
        || validateRequired(item.source_group, t('webproxy.validation.sourceGroupRequired'))
        || (sourceGroupOptions.value.includes(item.source_group) ? '' : t('webproxy.validation.sourceGroupNotFound'))
        || validateList(item.local_block, (v) => validateIPv4OrFQDN(v, t))
        || validateList(item.local_ok, (v) => validateIPv4OrFQDN(v, t))
        || validateList(item.local_block_url, (v) => validateURL(v, t))
        || validateList(item.local_ok_url, (v) => validateURL(v, t))
        || validateList(item.local_block_keyword, (v) => validateKeyword(v, t));
      if (err) return showError({ message: err });
      const list = config.value.url_filtering.squidguard.rules;
      const idx = list.findIndex(x => x._number === item._number);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.number === item.number)) return showError({ message: t('webproxy.validation.ruleNumberExists') });
        list.push({ ...item });
      }
      modals.value.rule = false;
    }

    function deleteRule(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.number];
      const numbers = keys.map(k => config.value.url_filtering.squidguard.rules.find(x => x.number === k)?.number).filter(Boolean);
      if (!numbers.length) return;
      pendingDeleteRuleNumbers.value = numbers;
      deleteRuleModalVisible.value = true;
    }

    function confirmDeleteRule() {
      deleteRuleModalVisible.value = false;
      const list = config.value.url_filtering.squidguard.rules;
      config.value.url_filtering.squidguard.rules = list.filter(x => !pendingDeleteRuleNumbers.value.includes(x.number));
      pendingDeleteRuleNumbers.value = [];
    }

    function saveSourceGroup() {
      const item = editing.value.sourceGroup;
      const err = validateName(item.name, t) || validateRequired(item.address, t('webproxy.validation.addressRequired'));
      if (err) return showError({ message: err });
      const list = config.value.url_filtering.squidguard.source_groups;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return showError({ message: t('webproxy.validation.sourceGroupNameExists') });
        list.push({ ...item });
      }
      modals.value.sourceGroup = false;
    }

    function deleteSourceGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.url_filtering.squidguard.source_groups.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      pendingDeleteSourceGroupNames.value = names;
      deleteSourceGroupModalVisible.value = true;
    }

    function confirmDeleteSourceGroup() {
      deleteSourceGroupModalVisible.value = false;
      const list = config.value.url_filtering.squidguard.source_groups;
      config.value.url_filtering.squidguard.source_groups = list.filter(x => !pendingDeleteSourceGroupNames.value.includes(x.name));
      pendingDeleteSourceGroupNames.value = [];
    }

    function saveTimePeriod() {
      const item = editing.value.timePeriod;
      const err = validateName(item.name, t) || validateRequired(item.ranges, t('webproxy.validation.timePeriodRequired'));
      if (err) return showError({ message: err });
      const parsed = parseTimePeriods(item.ranges);
      if (!Object.keys(parsed).length) return showError({ message: t('webproxy.validation.timePeriodFormatError') });
      const list = config.value.url_filtering.squidguard.time_periods;
      const idx = list.findIndex(x => x._name === item._name);
      if (idx >= 0) {
        list[idx] = { ...item };
      } else {
        if (list.some(x => x.name === item.name)) return showError({ message: t('webproxy.validation.timePeriodNameExists') });
        list.push({ ...item });
      }
      modals.value.timePeriod = false;
    }

    function deleteTimePeriod(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.url_filtering.squidguard.time_periods.find(x => x.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      pendingDeleteTimePeriodNames.value = names;
      deleteTimePeriodModalVisible.value = true;
    }

    function confirmDeleteTimePeriod() {
      deleteTimePeriodModalVisible.value = false;
      const list = config.value.url_filtering.squidguard.time_periods;
      config.value.url_filtering.squidguard.time_periods = list.filter(x => !pendingDeleteTimePeriodNames.value.includes(x.name));
      pendingDeleteTimePeriodNames.value = [];
    }

    function validate() {
      const c = config.value;
      if (isPresent(c.default_port)) {
        const err = validateRange(c.default_port, 1025, 65535, 'webproxy.validation.defaultPortRange', t);
        if (err) return err;
      }
      if (isPresent(c.cache_size)) {
        const err = validateRange(c.cache_size, 0, 1000000, 'webproxy.validation.cacheSizeRange', t);
        if (err) return err;
      }
      if (isPresent(c.mem_cache_size)) {
        const err = validateRange(c.mem_cache_size, 1, 100000, 'webproxy.validation.memCacheSizeRange', t);
        if (err) return err;
      }
      if (isPresent(c.maximum_object_size)) {
        const err = validateRange(c.maximum_object_size, 1, 1000000, 'webproxy.validation.maxObjectSizeRange', t);
        if (err) return err;
      }
      if (isPresent(c.minimum_object_size)) {
        const err = validateRange(c.minimum_object_size, 1, 100000, 'webproxy.validation.minObjectSizeRange', t);
        if (err) return err;
      }
      if (isPresent(c.reply_body_max_size)) {
        const err = validateRange(c.reply_body_max_size, 1, 100000, 'webproxy.validation.replyBodyMaxSizeRange', t);
        if (err) return err;
      }
      if (isPresent(c.append_domain)) {
        const err = validateAppendDomain(c.append_domain, t);
        if (err) return err;
      }
      if (isPresent(c.outgoing_address)) {
        const err = validateIPv4(c.outgoing_address, t);
        if (err) return err;
      }
      let listErr = validateList(c.safe_ports, (v) => validateSafePort(v, t));
      if (listErr) return t('webproxy.validation.safePortsError', { error: listErr });
      listErr = validateList(c.ssl_safe_ports, (v) => validateSSLSafePort(v, t));
      if (listErr) return t('webproxy.validation.sslSafePortsError', { error: listErr });

      for (const item of c.listen_addresses || []) {
        const err = validateIPv4(item.address, t) || (item.port ? validateRange(item.port, 1025, 65535, 'webproxy.validation.listenPortRange', t) : '');
        if (err) return t('webproxy.validation.listenAddressError', { address: item.address, error: err });
      }
      for (const item of c.cache_peers || []) {
        const err = validateHostOrIPv4(item.address, t)
          || (item.http_port ? validateRange(item.http_port, 1025, 65535, 'webproxy.validation.httpPortRange', t) : '')
          || validateRange(item.icp_port, 0, 65535, 'webproxy.validation.icpPortRange', t);
        if (err) return t('webproxy.validation.cachePeerError', { name: item.name, error: err });
      }

      const auth = c.authentication;
      if (auth.method === 'ldap') {
        if (!isPresent(auth.ldap.server)) return t('webproxy.validation.ldapServerRequired');
        if (!isPresent(auth.ldap.base_dn)) return t('webproxy.validation.ldapBaseDnRequired');
        if (isPresent(auth.ldap.port)) {
          const err = validateRange(auth.ldap.port, 1, 65535, 'webproxy.validation.ldapPortRange', t);
          if (err) return err;
        }
        if (isPresent(auth.ldap.version)) {
          const err = validateRange(auth.ldap.version, 2, 3, 'webproxy.validation.ldapVersionRange', t);
          if (err) return err;
        }
        if ((isPresent(auth.ldap.bind_dn) || isPresent(auth.ldap.password)) && !(isPresent(auth.ldap.bind_dn) && isPresent(auth.ldap.password))) {
          return t('webproxy.validation.ldapBindDnAndPasswordRequired');
        }
      }
      if (isPresent(auth.children)) {
        const err = validateRange(auth.children, 1, 500, 'webproxy.validation.authChildrenRange', t);
        if (err) return err;
      }
      if (isPresent(auth.credentials_ttl)) {
        const err = validateRange(auth.credentials_ttl, 1, 600, 'webproxy.validation.credentialsTtlRange', t);
        if (err) return err;
      }

      const sg = c.url_filtering?.squidguard;
      if (sg) {
        if (isPresent(sg.auto_update?.update_hour)) {
          const err = validateRange(sg.auto_update.update_hour, 0, 23, 'webproxy.validation.updateHourRange', t);
          if (err) return err;
        }
        listErr = validateList(sg.local_block, (v) => validateIPv4OrFQDN(v, t));
        if (listErr) return t('webproxy.validation.localBlockError', { error: listErr });
        listErr = validateList(sg.local_ok, (v) => validateIPv4OrFQDN(v, t));
        if (listErr) return t('webproxy.validation.localOkError', { error: listErr });
        listErr = validateList(sg.local_block_url, (v) => validateURL(v, t));
        if (listErr) return t('webproxy.validation.localBlockUrlError', { error: listErr });
        listErr = validateList(sg.local_ok_url, (v) => validateURL(v, t));
        if (listErr) return t('webproxy.validation.localOkUrlError', { error: listErr });
        listErr = validateList(sg.local_block_keyword, (v) => validateKeyword(v, t));
        if (listErr) return t('webproxy.validation.localBlockKeywordError', { error: listErr });
        for (const item of sg.rules || []) {
          const err = validateRuleNumber(item.number, t)
            || validateRequired(item.source_group, t('webproxy.validation.sourceGroupRequired'))
            || (sourceGroupOptions.value.includes(item.source_group) ? '' : t('webproxy.validation.sourceGroupNotFound'));
          if (err) return t('webproxy.validation.ruleError', { number: item.number, error: err });
        }
      }
      return '';
    }

    async function save() {
      const err = validate();
      if (err) return showError({ message: err });
      saving.value = true;
      try {
        const value = webproxyToConfig(config.value);
        const paths = [
          'service webproxy',
        ];
        for (const p of paths) {
          try { await configStore.deleteConfig(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configStore.setConfig('service webproxy', value);
        }
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

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      listenColumns, peerColumns, ruleColumns, sourceGroupColumns, timePeriodColumns,
      listenRows, peerRows, ruleRows, sourceGroupRows, timePeriodRows, sourceGroupOptions, timePeriodOptions,
      modals, titles, editing,
      deleteListenModalVisible, pendingDeleteListenNames, confirmDeleteListenAddress,
      deleteCachePeerModalVisible, pendingDeleteCachePeerNames, confirmDeleteCachePeer,
      deleteRuleModalVisible, pendingDeleteRuleNumbers, confirmDeleteRule,
      deleteSourceGroupModalVisible, pendingDeleteSourceGroupNames, confirmDeleteSourceGroup,
      deleteTimePeriodModalVisible, pendingDeleteTimePeriodNames, confirmDeleteTimePeriod,
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
  components: { TabGroup, ToolbarButton, DraggableModal, DataTable },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('webproxy.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('webproxy.tabs.basic') },
        { key: 'listen', title: t('webproxy.tabs.listen') },
        { key: 'auth', title: t('webproxy.tabs.auth') },
        { key: 'peers', title: t('webproxy.tabs.peers') },
        { key: 'url-filter', title: t('webproxy.tabs.urlFilter') }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.defaultPort') }}</label><input type="number" min="1025" max="65535" class="form-control" v-model="config.default_port" placeholder="3128" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.cacheSize') }}</label><input type="number" min="0" class="form-control" v-model="config.cache_size" :placeholder="t('webproxy.placeholders.cacheSize')" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.memCacheSize') }}</label><input type="number" min="1" max="100000" class="form-control" v-model="config.mem_cache_size" placeholder="20" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.maxObjectSize') }}</label><input type="number" min="1" max="1000000" class="form-control" v-model="config.maximum_object_size" placeholder="1-1000000" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.minObjectSize') }}</label><input type="number" min="1" max="100000" class="form-control" v-model="config.minimum_object_size" placeholder="1-100000" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.replyBodyMaxSize') }}</label><input type="number" min="1" max="100000" class="form-control" v-model="config.reply_body_max_size" placeholder="1-100000" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.appendDomain') }}</label><input class="form-control" v-model="config.append_domain" placeholder=".example.com" /></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.outgoingAddress') }}</label><input class="form-control" v-model="config.outgoing_address" :placeholder="t('webproxy.placeholders.ipv4Address')" /></div>
          <div class="form-row">
            <label class="form-label">{{ t('webproxy.labels.disableAccessLog') }}</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.disable_access_log" /> {{ t('webproxy.labels.disabled') }}</label>
          </div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.domainBlock') }}</label><textarea class="form-control" v-model="config.domain_block" rows="3" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.domainNoncache') }}</label><textarea class="form-control" v-model="config.domain_noncache" rows="3" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.replyBlockMime') }}</label><textarea class="form-control" v-model="config.reply_block_mime" rows="3" :placeholder="t('webproxy.placeholders.onePerLineMime')"></textarea></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.safePorts') }}</label><textarea class="form-control" v-model="config.safe_ports" rows="2" :placeholder="t('webproxy.placeholders.onePerLinePort')"></textarea></div>
          <div class="form-row"><label class="form-label">{{ t('webproxy.labels.sslSafePorts') }}</label><textarea class="form-control" v-model="config.ssl_safe_ports" rows="2" :placeholder="t('webproxy.placeholders.onePerLinePort')"></textarea></div>
        </template>

        <template #listen>
          <div class="data-table-wrapper">
            <DataTable :columns="listenColumns" :data="listenRows" row-key="address" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openModal('listen', null, t('webproxy.modals.createListen'))" @edit="row => openModal('listen', config.listen_addresses.find(x => x.address === row.address), t('webproxy.modals.editListen'))" @delete="deleteListenAddress" @refresh="load" />
          </div>
        </template>

        <template #auth>
          <div class="form-row">
            <label class="form-label">{{ t('webproxy.labels.authMethod') }}</label>
            <select class="form-control" v-model="config.authentication.method">
              <option value="">{{ t('webproxy.labels.none') }}</option>
              <option v-for="m in AUTH_METHOD_OPTIONS.slice(1)" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <template v-if="config.authentication.method">
            <div class="form-row"><label class="form-label">{{ t('webproxy.labels.authChildren') }}</label><input type="number" min="1" max="500" class="form-control" v-model="config.authentication.children" placeholder="5" /></div>
            <div class="form-row"><label class="form-label">{{ t('webproxy.labels.credentialsTtl') }}</label><input type="number" min="1" max="600" class="form-control" v-model="config.authentication.credentials_ttl" placeholder="60" /></div>
            <div class="form-row"><label class="form-label">{{ t('webproxy.labels.authRealm') }}</label><input class="form-control" v-model="config.authentication.realm" placeholder="My Company proxy server" /></div>
          </template>
          <template v-if="config.authentication.method === 'ldap'">
            <div class="form-group">
              <div class="form-group-title">{{ t('webproxy.sections.ldapSettings') }}</div>
              <div class="form-group-content">
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.server') }}</label><input class="form-control" v-model="config.authentication.ldap.server" placeholder="ldap.example.com" /></div>
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="config.authentication.ldap.port" placeholder="389" /></div>
                <div class="form-row"><label class="form-label">Base DN</label><input class="form-control" v-model="config.authentication.ldap.base_dn" placeholder="dc=example,dc=com" /></div>
                <div class="form-row"><label class="form-label">Bind DN</label><input class="form-control" v-model="config.authentication.ldap.bind_dn" /></div>
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.password') }}</label><input type="password" class="form-control" v-model="config.authentication.ldap.password" /></div>
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.filterExpression') }}</label><input class="form-control" v-model="config.authentication.ldap.filter_expression" /></div>
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.usernameAttribute') }}</label><input class="form-control" v-model="config.authentication.ldap.username_attribute" placeholder="uid" /></div>
                <div class="form-row"><label class="form-label">{{ t('webproxy.labels.protocolVersion') }}</label><input type="number" min="2" max="3" class="form-control" v-model="config.authentication.ldap.version" placeholder="3" /></div>
                <div class="form-row">
                  <label class="form-label">{{ t('webproxy.labels.useSslTls') }}</label>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.authentication.ldap.use_ssl" /> {{ t('webproxy.labels.enabled') }}</label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('webproxy.labels.persistentConnection') }}</label>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.authentication.ldap.persistent_connection" /> {{ t('webproxy.labels.enabled') }}</label>
                </div>
              </div>
            </div>
          </template>
        </template>

        <template #peers>
          <div class="data-table-wrapper">
            <DataTable :columns="peerColumns" :data="peerRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openModal('peer', null, t('webproxy.modals.createPeer'))" @edit="row => openModal('peer', config.cache_peers.find(x => x.name === row.name), t('webproxy.modals.editPeer'))" @delete="deleteCachePeer" @refresh="load" />
          </div>
        </template>

        <template #url-filter>
          <div class="form-group">
            <div class="form-group-title">{{ t('webproxy.sections.squidGuardSettings') }}</div>
            <div class="form-group-content">
              <div class="form-row">
                <label class="form-label">{{ t('webproxy.labels.defaultAction') }}</label>
                <select class="form-control" v-model="config.url_filtering.squidguard.default_action">
                  <option v-for="a in DEFAULT_ACTION_OPTIONS" :key="a" :value="a">{{ a }}</option>
                </select>
              </div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.redirectUrl') }}</label><input class="form-control" v-model="config.url_filtering.squidguard.redirect_url" placeholder="block.vyos.net" /></div>
              <div class="form-row">
                <label class="form-label">{{ t('webproxy.labels.allowIpaddrUrl') }}</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.url_filtering.squidguard.allow_ipaddr_url" /> {{ t('webproxy.labels.enabled') }}</label>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('webproxy.labels.enableSafeSearch') }}</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="config.url_filtering.squidguard.enable_safe_search" /> {{ t('webproxy.labels.enabled') }}</label>
              </div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.allowCategory') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.allow_category" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.blockCategory') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.block_category" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.logCategory') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.log" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlock') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block" rows="2" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlockKeyword') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block_keyword" rows="2" :placeholder="t('webproxy.placeholders.onePerLineKeyword')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlockUrl') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_block_url" rows="2" :placeholder="t('webproxy.placeholders.onePerLineUrl')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localOk') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_ok" rows="2" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localOkUrl') }}</label><textarea class="form-control" v-model="config.url_filtering.squidguard.local_ok_url" rows="2" :placeholder="t('webproxy.placeholders.onePerLineUrl')"></textarea></div>
            </div>
          </div>

          <div class="form-group">
            <div class="form-group-title">{{ t('webproxy.sections.autoUpdate') }}</div>
            <div class="form-group-content">
              <div class="form-row"><label class="form-label">{{ t('webproxy.labels.updateHour') }}</label><input type="number" min="0" max="23" class="form-control" v-model="config.url_filtering.squidguard.auto_update.update_hour" placeholder="0-23" /></div>
            </div>
          </div>

          <div class="form-group">
            <div class="form-group-title">{{ t('webproxy.sections.sourceGroups') }}</div>
            <div class="form-group-content">
              <div class="data-table-wrapper">
                <DataTable :columns="sourceGroupColumns" :data="sourceGroupRows" row-key="name" :selectable="true"
                  :actions="['create','edit','delete','refresh']"
                  @create="openModal('sourceGroup', null, t('webproxy.modals.createSourceGroup'))" @edit="row => openModal('sourceGroup', config.url_filtering.squidguard.source_groups.find(x => x.name === row.name), t('webproxy.modals.editSourceGroup'))" @delete="deleteSourceGroup" @refresh="load" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="form-group-title">{{ t('webproxy.sections.timePeriods') }}</div>
            <div class="form-group-content">
              <div class="data-table-wrapper">
                <DataTable :columns="timePeriodColumns" :data="timePeriodRows" row-key="name" :selectable="true"
                  :actions="['create','edit','delete','refresh']"
                  @create="openModal('timePeriod', null, t('webproxy.modals.createTimePeriod'))" @edit="row => openModal('timePeriod', config.url_filtering.squidguard.time_periods.find(x => x.name === row.name), t('webproxy.modals.editTimePeriod'))" @delete="deleteTimePeriod" @refresh="load" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="form-group-title">{{ t('webproxy.sections.rules') }}</div>
            <div class="form-group-content">
              <div class="data-table-wrapper">
                <DataTable :columns="ruleColumns" :data="ruleRows" row-key="number" :selectable="true"
                  :actions="['create','edit','delete','refresh']"
                  @create="openModal('rule', null, t('webproxy.modals.createRule'))" @edit="row => openModal('rule', config.url_filtering.squidguard.rules.find(x => x.number === row.number), t('webproxy.modals.editRule'))" @delete="deleteRule" @refresh="load" />
              </div>
            </div>
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="modals.listen" :title="titles.listen" @confirm="saveListenAddress">
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.listenAddress') }}</label><input class="form-control" v-model="editing.listen.address" :placeholder="t('webproxy.placeholders.ipv4Address')" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="editing.listen.port" :placeholder="t('webproxy.placeholders.leaveEmptyForDefault')" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.nonTransparentMode') }}</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.listen.disable_transparent" /> {{ t('webproxy.labels.enabled') }}</label></div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.peer" :title="titles.peer" @confirm="saveCachePeer">
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.name') }}</label><input class="form-control" v-model="editing.peer.name" placeholder="FQDN" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.address') }}</label><input class="form-control" v-model="editing.peer.address" :placeholder="t('webproxy.placeholders.ipOrHostname')" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.type') }}</label><select class="form-control" v-model="editing.peer.type"><option v-for="opt in CACHE_PEER_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.httpPort') }}</label><input type="number" min="1025" max="65535" class="form-control" v-model="editing.peer.http_port" placeholder="1025-65535" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.icpPort') }}</label><input type="number" min="0" max="65535" class="form-control" v-model="editing.peer.icp_port" :placeholder="t('webproxy.placeholders.icpPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.options') }}</label><input class="form-control" v-model="editing.peer.options" :placeholder="t('webproxy.placeholders.optionsExample')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.sourceGroup" :title="titles.sourceGroup" @confirm="saveSourceGroup">
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.name') }}</label><input class="form-control" v-model="editing.sourceGroup.name" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.addressList') }}</label><textarea class="form-control" v-model="editing.sourceGroup.address" rows="4" :placeholder="t('webproxy.placeholders.onePerLineIpSubnet')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.domainList') }}</label><textarea class="form-control" v-model="editing.sourceGroup.domain" rows="3" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.userList') }}</label><textarea class="form-control" v-model="editing.sourceGroup.user" rows="3" :placeholder="t('webproxy.placeholders.onePerLineUsername')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.ldapIpSearch') }}</label><textarea class="form-control" v-model="editing.sourceGroup.ldap_ip_search" rows="2" :placeholder="t('webproxy.placeholders.onePerLineLdapExpr')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.ldapUserSearch') }}</label><textarea class="form-control" v-model="editing.sourceGroup.ldap_user_search" rows="2" :placeholder="t('webproxy.placeholders.onePerLineLdapExpr')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.description') }}</label><input class="form-control" v-model="editing.sourceGroup.description" :placeholder="t('webproxy.placeholders.maxChars255')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.timePeriod" :title="titles.timePeriod" @confirm="saveTimePeriod">
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.name') }}</label><input class="form-control" v-model="editing.timePeriod.name" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.timePeriod') }}</label><textarea class="form-control" v-model="editing.timePeriod.ranges" rows="5" :placeholder="t('webproxy.placeholders.timePeriodExample')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.description') }}</label><input class="form-control" v-model="editing.timePeriod.description" :placeholder="t('webproxy.placeholders.maxChars255')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="modals.rule" :title="titles.rule" @confirm="saveRule">
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.ruleNumber') }}</label><input type="number" min="1" max="1024" class="form-control" v-model="editing.rule.number" placeholder="1-1024" /></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.sourceGroup') }}</label><select class="form-control" v-model="editing.rule.source_group"><option value="">{{ t('webproxy.labels.pleaseSelect') }}</option><option v-for="g in sourceGroupOptions" :key="g" :value="g">{{ g }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.defaultAction') }}</label><select class="form-control" v-model="editing.rule.default_action"><option v-for="a in DEFAULT_ACTION_OPTIONS" :key="a" :value="a">{{ a }}</option></select></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.timePeriod') }}</label><select class="form-control" v-model="editing.rule.time_period"><option value="">{{ t('webproxy.labels.none') }}</option><option v-for="p in timePeriodOptions" :key="p" :value="p">{{ p }}</option></select></div>
        <div class="form-row">
          <label class="form-label">{{ t('webproxy.labels.allowIpaddrUrl') }}</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.rule.allow_ipaddr_url" /> {{ t('webproxy.labels.enabled') }}</label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('webproxy.labels.enableSafeSearch') }}</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" v-model="editing.rule.enable_safe_search" /> {{ t('webproxy.labels.enabled') }}</label>
        </div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.allowCategory') }}</label><textarea class="form-control" v-model="editing.rule.allow_category" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.blockCategory') }}</label><textarea class="form-control" v-model="editing.rule.block_category" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlock') }}</label><textarea class="form-control" v-model="editing.rule.local_block" rows="2" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlockKeyword') }}</label><textarea class="form-control" v-model="editing.rule.local_block_keyword" rows="2" :placeholder="t('webproxy.placeholders.onePerLineKeyword')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localBlockUrl') }}</label><textarea class="form-control" v-model="editing.rule.local_block_url" rows="2" :placeholder="t('webproxy.placeholders.onePerLineUrl')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localOk') }}</label><textarea class="form-control" v-model="editing.rule.local_ok" rows="2" :placeholder="t('webproxy.placeholders.onePerLineDomain')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.localOkUrl') }}</label><textarea class="form-control" v-model="editing.rule.local_ok_url" rows="2" :placeholder="t('webproxy.placeholders.onePerLineUrl')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.logCategory') }}</label><textarea class="form-control" v-model="editing.rule.log" rows="2" :placeholder="t('webproxy.placeholders.onePerLineCategory')"></textarea></div>
        <div class="form-row"><label class="form-label">{{ t('webproxy.labels.redirectUrl') }}</label><input class="form-control" v-model="editing.rule.redirect_url" placeholder="block.vyos.net" /></div>
      </DraggableModal>
    </div>
  `,
});
