import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'SstpPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('basic');

    const config = ref({
      description: '',
      port: '443',
      mtu: '1500',
      gateway_address: '',
      host_name: '',
      thread_count: 'all',
      max_concurrent_sessions: '',
      authentication: {
        mode: 'local',
        protocols: ['pap', 'chap', 'mschap', 'mschap-v2'],
        local_users: [],
        radius: {
          accounting_interim_interval: '',
          acct_interim_jitter: '',
          acct_timeout: '3',
          dynamic_author: { key: '', port: '1700', server: '' },
          max_try: '3',
          nas_identifier: '',
          nas_ip_address: '',
          preallocate_vif: false,
          rate_limit: { attribute: 'Filter-Id', enable: false, multiplier: '1', vendor: '' },
          source_address: '',
          servers: [],
        },
      },
      client_ip_pools: [],
      client_ipv6_pools: [],
      default_pool: '',
      default_ipv6_pool: '',
      ppp_options: {
        disable_ccp: false,
        interface_cache: '',
        ipv4: 'prefer',
        ipv6: 'deny',
        ipv6_accept_peer_interface_id: false,
        ipv6_interface_id: '',
        ipv6_peer_interface_id: '',
        lcp_echo_failure: '3',
        lcp_echo_interval: '30',
        lcp_echo_timeout: '0',
        min_mtu: '',
        mppe: 'prefer',
        mru: '',
      },
      ssl: {
        ca_certificate: '',
        certificate: '',
      },
      name_servers: '',
      wins_servers: '',
      shaper: { fwmark: '' },
      limits: { burst: '', connection_limit: '', timeout: '' },
      log: { level: '3' },
      snmp: { master_agent: false },
      extended_scripts: { on_change: '', on_down: '', on_pre_up: '', on_up: '' },
    });

    const userColumns = [
      { key: 'username', title: t('sstp.columns.username'), dataIndex: 'username', width: 150 },
      { key: 'password', title: t('sstp.columns.password'), dataIndex: 'password', width: 150 },
      { key: 'static_ip', title: t('sstp.columns.staticIp'), dataIndex: 'static_ip', width: 120 },
      { key: 'disable', title: t('sstp.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'actions', title: t('sstp.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const radiusServerColumns = [
      { key: 'address', title: t('sstp.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'key', title: t('sstp.columns.key'), dataIndex: 'key', width: 150 },
      { key: 'port', title: t('sstp.columns.port'), dataIndex: 'port', width: 80 },
      { key: 'disable', title: t('sstp.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'actions', title: t('sstp.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const ipPoolColumns = [
      { key: 'name', title: t('sstp.columns.name'), dataIndex: 'name', width: 150 },
      { key: 'next_pool', title: t('sstp.columns.nextPool'), dataIndex: 'next_pool', width: 120 },
      { key: 'range', title: t('sstp.columns.range'), dataIndex: 'range', width: 200 },
      { key: 'actions', title: t('sstp.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const ipv6PoolColumns = [
      { key: 'name', title: t('sstp.columns.name'), dataIndex: 'name', width: 150 },
      { key: 'delegate', title: t('sstp.columns.delegatePrefix'), dataIndex: 'delegate', width: 200 },
      { key: 'prefix', title: t('sstp.columns.clientPrefix'), dataIndex: 'prefix', width: 200 },
      { key: 'actions', title: t('sstp.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedUsers = ref([]);
    const selectedRadiusServers = ref([]);
    const selectedIpPools = ref([]);
    const selectedIpv6Pools = ref([]);

    const showUserModal = ref(false);
    const editingUser = ref(null);
    const showRadiusModal = ref(false);
    const editingRadiusServer = ref(null);
    const showIpPoolModal = ref(false);
    const editingIpPool = ref(null);
    const showIpv6PoolModal = ref(false);
    const editingIpv6Pool = ref(null);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'auth': return 'vpn sstp authentication';
        case 'pool': return 'vpn sstp client-ip-pool';
        case 'ppp': return 'vpn sstp ppp-options';
        case 'ssl': return 'vpn sstp ssl';
        case 'network': return 'vpn sstp name-server';
        default: return 'vpn sstp';
      }
    });

    function sstpToForm(data = {}) {
      const auth = data.authentication || {};
      const localUsers = auth['local-users'] || {};
      const radiusServers = auth.radius?.server || {};
      const ipPools = data['client-ip-pool'] || {};
      const ipv6Pools = data['client-ipv6-pool'] || {};
      const ppp = data['ppp-options'] || {};
      const ssl = data.ssl || {};
      const shaper = data.shaper || {};
      const limits = data.limits || {};
      const log = data.log || {};
      const snmp = data.snmp || {};
      const scripts = data['extended-scripts'] || {};

      return {
        description: data.description || '',
        port: data.port || '443',
        mtu: data.mtu || '1500',
        gateway_address: data['gateway-address'] || '',
        host_name: data['host-name'] || '',
        thread_count: data['thread-count'] || 'all',
        max_concurrent_sessions: data['max-concurrent-sessions'] || '',
        authentication: {
          mode: auth.mode || 'local',
          protocols: auth.protocols ? toArray(auth.protocols) : ['pap', 'chap', 'mschap', 'mschap-v2'],
          local_users: Object.entries(localUsers).map(([username, u]) => ({
            _username: username,
            username,
            password: u.password || '',
            disable: u.disable !== undefined,
            static_ip: u['static-ip'] || '',
            rate_limit: {
              download: u['rate-limit']?.download || '',
              upload: u['rate-limit']?.upload || '',
            },
          })),
          radius: {
            accounting_interim_interval: auth.radius?.['accounting-interim-interval'] || '',
            acct_interim_jitter: auth.radius?.['acct-interim-jitter'] || '',
            acct_timeout: auth.radius?.['acct-timeout'] || '3',
            dynamic_author: {
              key: auth.radius?.['dynamic-author']?.key || '',
              port: auth.radius?.['dynamic-author']?.port || '1700',
              server: auth.radius?.['dynamic-author']?.server || '',
            },
            max_try: auth.radius?.['max-try'] || '3',
            nas_identifier: auth.radius?.['nas-identifier'] || '',
            nas_ip_address: auth.radius?.['nas-ip-address'] || '',
            preallocate_vif: auth.radius?.['preallocate-vif'] !== undefined,
            rate_limit: {
              attribute: auth.radius?.['rate-limit']?.attribute || 'Filter-Id',
              enable: auth.radius?.['rate-limit']?.enable !== undefined,
              multiplier: auth.radius?.['rate-limit']?.multiplier || '1',
              vendor: auth.radius?.['rate-limit']?.vendor || '',
            },
            source_address: auth.radius?.['source-address'] || '',
            servers: Object.entries(radiusServers).map(([address, s]) => ({
              _address: address,
              address,
              key: s.key || '',
              port: s.port || '1812',
              acct_port: s['acct-port'] || '1813',
              backup: s.backup !== undefined,
              disable: s.disable !== undefined,
              disable_accounting: s['disable-accounting'] !== undefined,
              fail_time: s['fail-time'] || '0',
              priority: s.priority || '',
              source_address: s['source-address'] || '',
              timeout: s.timeout || '2',
            })),
          },
        },
        client_ip_pools: Object.entries(ipPools).map(([name, pool]) => ({
          _name: name,
          name,
          next_pool: pool['next-pool'] || '',
          range: pool.range || '',
        })),
        client_ipv6_pools: Object.entries(ipv6Pools).map(([name, pool]) => ({
          _name: name,
          name,
          delegate: pool.delegate ? Object.entries(pool.delegate).map(([d, v]) => ({
            prefix: d,
            delegation_prefix: v?.['delegation-prefix'] || '',
          })) : [],
          prefix: pool.prefix ? Object.entries(pool.prefix).map(([p, v]) => ({
            prefix: p,
            mask: v?.mask || '',
          })) : [],
        })),
        default_pool: data['default-pool'] || '',
        default_ipv6_pool: data['default-ipv6-pool'] || '',
        ppp_options: {
          disable_ccp: ppp['disable-ccp'] !== undefined,
          interface_cache: ppp['interface-cache'] || '',
          ipv4: ppp.ipv4 || 'prefer',
          ipv6: ppp.ipv6 || 'deny',
          ipv6_accept_peer_interface_id: ppp['ipv6-accept-peer-interface-id'] !== undefined,
          ipv6_interface_id: ppp['ipv6-interface-id'] || '',
          ipv6_peer_interface_id: ppp['ipv6-peer-interface-id'] || '',
          lcp_echo_failure: ppp['lcp-echo-failure'] || '3',
          lcp_echo_interval: ppp['lcp-echo-interval'] || '30',
          lcp_echo_timeout: ppp['lcp-echo-timeout'] || '0',
          min_mtu: ppp['min-mtu'] || '',
          mppe: ppp.mppe || 'prefer',
          mru: ppp.mru || '',
        },
        ssl: {
          ca_certificate: ssl['ca-certificate'] || '',
          certificate: ssl.certificate || '',
        },
        name_servers: joinLines(data['name-server']),
        wins_servers: joinLines(data['wins-server']),
        shaper: { fwmark: shaper.fwmark || '' },
        limits: {
          burst: limits.burst || '',
          connection_limit: limits['connection-limit'] || '',
          timeout: limits.timeout || '',
        },
        log: { level: log.level || '3' },
        snmp: { master_agent: snmp['master-agent'] !== undefined },
        extended_scripts: {
          on_change: scripts['on-change'] || '',
          on_down: scripts['on-down'] || '',
          on_pre_up: scripts['on-pre-up'] || '',
          on_up: scripts['on-up'] || '',
        },
      };
    }

    function formToSstp(form) {
      const result = {};

      if (isPresent(form.description)) result.description = String(form.description);
      if (isPresent(form.port) && form.port !== '443') result.port = String(form.port);
      if (isPresent(form.mtu) && form.mtu !== '1500') result.mtu = String(form.mtu);
      if (isPresent(form.gateway_address)) result['gateway-address'] = String(form.gateway_address);
      if (isPresent(form.host_name)) result['host-name'] = String(form.host_name);
      if (form.thread_count && form.thread_count !== 'all') result['thread-count'] = String(form.thread_count);
      if (isPresent(form.max_concurrent_sessions)) result['max-concurrent-sessions'] = String(form.max_concurrent_sessions);

      const auth = {};
      if (form.authentication.mode && form.authentication.mode !== 'local') auth.mode = String(form.authentication.mode);
      if (form.authentication.protocols && form.authentication.protocols.length > 0) {
        const defaults = ['pap', 'chap', 'mschap', 'mschap-v2'];
        if (JSON.stringify(form.authentication.protocols.sort()) !== JSON.stringify(defaults.sort())) {
          auth.protocols = form.authentication.protocols;
        }
      }

      const users = {};
      for (const u of form.authentication.local_users || []) {
        if (!u.username) continue;
        const user = {};
        if (u.disable) user.disable = '';
        if (isPresent(u.password)) user.password = String(u.password);
        if (isPresent(u.static_ip)) user['static-ip'] = String(u.static_ip);
        if (isPresent(u.rate_limit?.download) || isPresent(u.rate_limit?.upload)) {
          user['rate-limit'] = {};
          if (isPresent(u.rate_limit.download)) user['rate-limit'].download = String(u.rate_limit.download);
          if (isPresent(u.rate_limit.upload)) user['rate-limit'].upload = String(u.rate_limit.upload);
        }
        users[u.username] = user;
      }
      if (Object.keys(users).length) auth['local-users'] = users;

      const radius = {};
      const servers = {};
      for (const s of form.authentication.radius?.servers || []) {
        if (!s.address) continue;
        const srv = {};
        if (s.disable) srv.disable = '';
        if (isPresent(s.key)) srv.key = String(s.key);
        if (isPresent(s.port) && s.port !== '1812') srv.port = String(s.port);
        if (isPresent(s.acct_port) && s.acct_port !== '1813') srv['acct-port'] = String(s.acct_port);
        if (s.backup) srv.backup = '';
        if (s.disable_accounting) srv['disable-accounting'] = '';
        if (isPresent(s.fail_time) && s.fail_time !== '0') srv['fail-time'] = String(s.fail_time);
        if (isPresent(s.priority)) srv.priority = String(s.priority);
        if (isPresent(s.source_address)) srv['source-address'] = String(s.source_address);
        if (isPresent(s.timeout) && s.timeout !== '2') srv.timeout = String(s.timeout);
        servers[s.address] = srv;
      }
      if (Object.keys(servers).length) radius.server = servers;
      if (isPresent(form.authentication.radius?.source_address)) radius['source-address'] = String(form.authentication.radius.source_address);
      if (isPresent(form.authentication.radius?.accounting_interim_interval)) radius['accounting-interim-interval'] = String(form.authentication.radius.accounting_interim_interval);
      if (isPresent(form.authentication.radius?.acct_interim_jitter)) radius['acct-interim-jitter'] = String(form.authentication.radius.acct_interim_jitter);
      if (isPresent(form.authentication.radius?.acct_timeout) && form.authentication.radius.acct_timeout !== '3') radius['acct-timeout'] = String(form.authentication.radius.acct_timeout);
      if (isPresent(form.authentication.radius?.max_try) && form.authentication.radius.max_try !== '3') radius['max-try'] = String(form.authentication.radius.max_try);
      if (isPresent(form.authentication.radius?.nas_identifier)) radius['nas-identifier'] = String(form.authentication.radius.nas_identifier);
      if (isPresent(form.authentication.radius?.nas_ip_address)) radius['nas-ip-address'] = String(form.authentication.radius.nas_ip_address);
      if (form.authentication.radius?.preallocate_vif) radius['preallocate-vif'] = '';
      const rl = form.authentication.radius?.rate_limit;
      if (rl) {
        if (rl.enable) radius['rate-limit'] = radius['rate-limit'] || {};
        if (isPresent(rl.attribute) && rl.attribute !== 'Filter-Id') { radius['rate-limit'] = radius['rate-limit'] || {}; radius['rate-limit'].attribute = String(rl.attribute); }
        if (rl.enable) { radius['rate-limit'] = radius['rate-limit'] || {}; radius['rate-limit'].enable = ''; }
        if (isPresent(rl.multiplier) && rl.multiplier !== '1') { radius['rate-limit'] = radius['rate-limit'] || {}; radius['rate-limit'].multiplier = String(rl.multiplier); }
        if (isPresent(rl.vendor)) { radius['rate-limit'] = radius['rate-limit'] || {}; radius['rate-limit'].vendor = String(rl.vendor); }
      }
      const da = form.authentication.radius?.dynamic_author;
      if (da && (isPresent(da.key) || isPresent(da.server) || (da.port && da.port !== '1700'))) {
        radius['dynamic-author'] = {};
        if (isPresent(da.key)) radius['dynamic-author'].key = String(da.key);
        if (isPresent(da.port) && da.port !== '1700') radius['dynamic-author'].port = String(da.port);
        if (isPresent(da.server)) radius['dynamic-author'].server = String(da.server);
      }
      if (Object.keys(radius).length) auth.radius = radius;

      if (Object.keys(auth).length) result.authentication = auth;

      const ipPools = {};
      for (const pool of form.client_ip_pools || []) {
        if (!pool.name) continue;
        const p = {};
        if (isPresent(pool.next_pool)) p['next-pool'] = String(pool.next_pool);
        if (isPresent(pool.range)) p.range = String(pool.range);
        ipPools[pool.name] = p;
      }
      if (Object.keys(ipPools).length) result['client-ip-pool'] = ipPools;

      const ipv6Pools = {};
      for (const pool of form.client_ipv6_pools || []) {
        if (!pool.name) continue;
        const p = {};
        if (pool.delegate && pool.delegate.length) {
          p.delegate = {};
          for (const d of pool.delegate) {
            if (isPresent(d.prefix)) {
              p.delegate[d.prefix] = {};
              if (isPresent(d.delegation_prefix)) p.delegate[d.prefix]['delegation-prefix'] = String(d.delegation_prefix);
            }
          }
        }
        if (pool.prefix && pool.prefix.length) {
          p.prefix = {};
          for (const pr of pool.prefix) {
            if (isPresent(pr.prefix)) {
              p.prefix[pr.prefix] = {};
              if (isPresent(pr.mask)) p.prefix[pr.prefix].mask = String(pr.mask);
            }
          }
        }
        ipv6Pools[pool.name] = p;
      }
      if (Object.keys(ipv6Pools).length) result['client-ipv6-pool'] = ipv6Pools;

      if (isPresent(form.default_pool)) result['default-pool'] = String(form.default_pool);
      if (isPresent(form.default_ipv6_pool)) result['default-ipv6-pool'] = String(form.default_ipv6_pool);

      const ppp = {};
      if (form.ppp_options.disable_ccp) ppp['disable-ccp'] = '';
      if (isPresent(form.ppp_options.interface_cache)) ppp['interface-cache'] = String(form.ppp_options.interface_cache);
      if (form.ppp_options.ipv4 && form.ppp_options.ipv4 !== 'prefer') ppp.ipv4 = String(form.ppp_options.ipv4);
      if (form.ppp_options.ipv6 && form.ppp_options.ipv6 !== 'deny') ppp.ipv6 = String(form.ppp_options.ipv6);
      if (form.ppp_options.ipv6_accept_peer_interface_id) ppp['ipv6-accept-peer-interface-id'] = '';
      if (isPresent(form.ppp_options.ipv6_interface_id)) ppp['ipv6-interface-id'] = String(form.ppp_options.ipv6_interface_id);
      if (isPresent(form.ppp_options.ipv6_peer_interface_id)) ppp['ipv6-peer-interface-id'] = String(form.ppp_options.ipv6_peer_interface_id);
      if (isPresent(form.ppp_options.lcp_echo_failure) && form.ppp_options.lcp_echo_failure !== '3') ppp['lcp-echo-failure'] = String(form.ppp_options.lcp_echo_failure);
      if (isPresent(form.ppp_options.lcp_echo_interval) && form.ppp_options.lcp_echo_interval !== '30') ppp['lcp-echo-interval'] = String(form.ppp_options.lcp_echo_interval);
      if (isPresent(form.ppp_options.lcp_echo_timeout) && form.ppp_options.lcp_echo_timeout !== '0') ppp['lcp-echo-timeout'] = String(form.ppp_options.lcp_echo_timeout);
      if (isPresent(form.ppp_options.min_mtu)) ppp['min-mtu'] = String(form.ppp_options.min_mtu);
      if (form.ppp_options.mppe && form.ppp_options.mppe !== 'prefer') ppp.mppe = String(form.ppp_options.mppe);
      if (isPresent(form.ppp_options.mru)) ppp.mru = String(form.ppp_options.mru);
      if (Object.keys(ppp).length) result['ppp-options'] = ppp;

      const ssl = {};
      if (isPresent(form.ssl.ca_certificate)) ssl['ca-certificate'] = String(form.ssl.ca_certificate);
      if (isPresent(form.ssl.certificate)) ssl.certificate = String(form.ssl.certificate);
      if (Object.keys(ssl).length) result.ssl = ssl;

      const nameServers = splitLines(form.name_servers);
      if (nameServers.length) result['name-server'] = nameServers;
      const winsServers = splitLines(form.wins_servers);
      if (winsServers.length) result['wins-server'] = winsServers;

      if (isPresent(form.shaper?.fwmark)) result.shaper = { fwmark: String(form.shaper.fwmark) };

      const limits = {};
      if (isPresent(form.limits?.burst)) limits.burst = String(form.limits.burst);
      if (isPresent(form.limits?.connection_limit)) limits['connection-limit'] = String(form.limits.connection_limit);
      if (isPresent(form.limits?.timeout)) limits.timeout = String(form.limits.timeout);
      if (Object.keys(limits).length) result.limits = limits;

      if (form.log?.level && form.log.level !== '3') result.log = { level: String(form.log.level) };

      if (form.snmp?.master_agent) result.snmp = { 'master-agent': '' };

      const scripts = {};
      if (isPresent(form.extended_scripts?.on_change)) scripts['on-change'] = String(form.extended_scripts.on_change);
      if (isPresent(form.extended_scripts?.on_down)) scripts['on-down'] = String(form.extended_scripts.on_down);
      if (isPresent(form.extended_scripts?.on_pre_up)) scripts['on-pre-up'] = String(form.extended_scripts.on_pre_up);
      if (isPresent(form.extended_scripts?.on_up)) scripts['on-up'] = String(form.extended_scripts.on_up);
      if (Object.keys(scripts).length) result['extended-scripts'] = scripts;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpn sstp', true);
        config.value = sstpToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('sstp.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToSstp(config.value);
        await configStore.setConfig('vpn sstp', payload);
        configStore.markPending();
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e.message || t('sstp.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createUser() {
      editingUser.value = { username: '', password: '', disable: false, static_ip: '', rate_limit: { download: '', upload: '' } };
      showUserModal.value = true;
    }

    function editUser() {
      if (!selectedUsers.value.length) return showError({ message: t('sstp.errors.selectUserToEdit') });
      const row = config.value.authentication.local_users.find(u => u.username === selectedUsers.value[0]);
      if (!row) return showError({ message: t('sstp.errors.userNotFound') });
      editingUser.value = JSON.parse(JSON.stringify(row));
      showUserModal.value = true;
    }

    function removeUser() {
      if (!selectedUsers.value.length) return showError({ message: t('sstp.errors.selectUserToDelete') });
      config.value.authentication.local_users = config.value.authentication.local_users.filter(u => u.username !== selectedUsers.value[0]);
      selectedUsers.value = [];
    }

    function saveUser() {
      if (!editingUser.value.username) return showError({ message: t('sstp.errors.usernameRequired') });
      const list = config.value.authentication.local_users;
      const idx = list.findIndex(u => u._username === editingUser.value._username);
      if (idx >= 0) list.splice(idx, 1, { ...editingUser.value });
      else list.push({ ...editingUser.value });
      config.value.authentication.local_users = list;
      showUserModal.value = false;
    }

    function createRadiusServer() {
      editingRadiusServer.value = { address: '', key: '', port: '1812', acct_port: '1813', backup: false, disable: false, disable_accounting: false, fail_time: '0', priority: '', source_address: '', timeout: '2' };
      showRadiusModal.value = true;
    }

    function editRadiusServer() {
      if (!selectedRadiusServers.value.length) return showError({ message: t('sstp.errors.selectServerToEdit') });
      const row = config.value.authentication.radius.servers.find(s => s.address === selectedRadiusServers.value[0]);
      if (!row) return showError({ message: t('sstp.errors.serverNotFound') });
      editingRadiusServer.value = JSON.parse(JSON.stringify(row));
      showRadiusModal.value = true;
    }

    function removeRadiusServer() {
      if (!selectedRadiusServers.value.length) return showError({ message: t('sstp.errors.selectServerToDelete') });
      config.value.authentication.radius.servers = config.value.authentication.radius.servers.filter(s => s.address !== selectedRadiusServers.value[0]);
      selectedRadiusServers.value = [];
    }

    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return showError({ message: t('sstp.errors.serverAddressRequired') });
      const list = config.value.authentication.radius.servers;
      const idx = list.findIndex(s => s._address === editingRadiusServer.value._address);
      if (idx >= 0) list.splice(idx, 1, { ...editingRadiusServer.value });
      else list.push({ ...editingRadiusServer.value });
      config.value.authentication.radius.servers = list;
      showRadiusModal.value = false;
    }

    function createIpPool() {
      editingIpPool.value = { name: '', next_pool: '', range: '' };
      showIpPoolModal.value = true;
    }

    function editIpPool() {
      if (!selectedIpPools.value.length) return showError({ message: t('sstp.errors.selectIpPoolToEdit') });
      const row = config.value.client_ip_pools.find(p => p.name === selectedIpPools.value[0]);
      if (!row) return showError({ message: t('sstp.errors.ipPoolNotFound') });
      editingIpPool.value = JSON.parse(JSON.stringify(row));
      showIpPoolModal.value = true;
    }

    function removeIpPool() {
      if (!selectedIpPools.value.length) return showError({ message: t('sstp.errors.selectIpPoolToDelete') });
      config.value.client_ip_pools = config.value.client_ip_pools.filter(p => p.name !== selectedIpPools.value[0]);
      selectedIpPools.value = [];
    }

    function saveIpPool() {
      if (!editingIpPool.value.name) return showError({ message: t('sstp.errors.ipPoolNameRequired') });
      const list = config.value.client_ip_pools;
      const idx = list.findIndex(p => p._name === editingIpPool.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpPool.value });
      else list.push({ ...editingIpPool.value });
      config.value.client_ip_pools = list;
      showIpPoolModal.value = false;
    }

    function createIpv6Pool() {
      editingIpv6Pool.value = { name: '', delegate: [], prefix: [] };
      showIpv6PoolModal.value = true;
    }

    function editIpv6Pool() {
      if (!selectedIpv6Pools.value.length) return showError({ message: t('sstp.errors.selectIpv6PoolToEdit') });
      const row = config.value.client_ipv6_pools.find(p => p.name === selectedIpv6Pools.value[0]);
      if (!row) return showError({ message: t('sstp.errors.ipv6PoolNotFound') });
      editingIpv6Pool.value = JSON.parse(JSON.stringify(row));
      showIpv6PoolModal.value = true;
    }

    function removeIpv6Pool() {
      if (!selectedIpv6Pools.value.length) return showError({ message: t('sstp.errors.selectIpv6PoolToDelete') });
      config.value.client_ipv6_pools = config.value.client_ipv6_pools.filter(p => p.name !== selectedIpv6Pools.value[0]);
      selectedIpv6Pools.value = [];
    }

    function saveIpv6Pool() {
      if (!editingIpv6Pool.value.name) return showError({ message: t('sstp.errors.ipv6PoolNameRequired') });
      const list = config.value.client_ipv6_pools;
      const idx = list.findIndex(p => p._name === editingIpv6Pool.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpv6Pool.value });
      else list.push({ ...editingIpv6Pool.value });
      config.value.client_ipv6_pools = list;
      showIpv6PoolModal.value = false;
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, config, activeTab, commandPath,
      userColumns, radiusServerColumns, ipPoolColumns, ipv6PoolColumns,
      selectedUsers, selectedRadiusServers, selectedIpPools, selectedIpv6Pools,
      showUserModal, editingUser, showRadiusModal, editingRadiusServer,
      showIpPoolModal, editingIpPool, showIpv6PoolModal, editingIpv6Pool,
      load, save,
      createUser, editUser, removeUser, saveUser,
      createRadiusServer, editRadiusServer, removeRadiusServer, saveRadiusServer,
      createIpPool, editIpPool, removeIpPool, saveIpPool,
      createIpv6Pool, editIpv6Pool, removeIpv6Pool, saveIpv6Pool,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('sstp.tabs.basic') },
        { key: 'auth', title: t('sstp.tabs.auth') },
        { key: 'pool', title: t('sstp.tabs.pool') },
        { key: 'ppp', title: t('sstp.tabs.ppp') },
        { key: 'ssl', title: t('sstp.tabs.ssl') },
        { key: 'network', title: t('sstp.tabs.network') }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.description') }}</label><input class="form-control" v-model="config.description" :title="t('sstp.tips.description')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="config.port" :title="t('sstp.tips.port')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.mtu') }}</label><input class="form-control" type="number" min="68" max="1500" v-model="config.mtu" :title="t('sstp.tips.mtu')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.gatewayAddress') }}</label><input class="form-control" v-model="config.gateway_address" placeholder="x.x.x.x" :title="t('sstp.tips.gatewayAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.hostName') }}</label><input class="form-control" v-model="config.host_name" :title="t('sstp.tips.hostName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.threadCount') }}</label>
          <select class="form-control" v-model="config.thread_count" :title="t('sstp.tips.threadCount')">
            <option value="all">{{ t('sstp.options.threadCount.all') }}</option>
            <option value="half">{{ t('sstp.options.threadCount.half') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.maxConcurrentSessions') }}</label><input class="form-control" type="number" min="0" max="65535" v-model="config.max_concurrent_sessions" :title="t('sstp.tips.maxConcurrentSessions')" /></div>
      </template>

      <template #auth>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.authMode') }}</label>
          <select class="form-control" v-model="config.authentication.mode" :title="t('sstp.tips.authMode')">
            <option value="local">{{ t('sstp.options.authMode.local') }}</option>
            <option value="radius">{{ t('sstp.options.authMode.radius') }}</option>
            <option value="noauth">{{ t('sstp.options.authMode.noauth') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.authProtocols') }}</label>
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <label><input type="checkbox" value="pap" v-model="config.authentication.protocols" /> PAP</label>
            <label><input type="checkbox" value="chap" v-model="config.authentication.protocols" /> CHAP</label>
            <label><input type="checkbox" value="mschap" v-model="config.authentication.protocols" /> MS-CHAP</label>
            <label><input type="checkbox" value="mschap-v2" v-model="config.authentication.protocols" /> MS-CHAP-v2</label>
          </div>
        </div>

        <div v-if="config.authentication.mode === 'local'">
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.localUsers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">{{ t('sstp.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUsers.length || selectedUsers.length > 1">{{ t('sstp.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUsers.length">{{ t('sstp.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.authentication.local_users" rowKey="username" :externalToolbar="true" @selection-change="selectedUsers = $event" :selectable="true" />
        </div>

        <div v-if="config.authentication.mode === 'radius'">
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.sourceAddress') }}</label><input class="form-control" v-model="config.authentication.radius.source_address" placeholder="x.x.x.x" :title="t('sstp.tips.sourceAddress')" /></div>

          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.radiusGlobal') }}</div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.accountingInterval') }}</label><input class="form-control" type="number" min="1" max="3600" v-model="config.authentication.radius.accounting_interim_interval" :title="t('sstp.tips.accountingInterval')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.accountingJitter') }}</label><input class="form-control" type="number" min="1" max="60" v-model="config.authentication.radius.acct_interim_jitter" :title="t('sstp.tips.accountingJitter')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.accountingTimeout') }}</label><input class="form-control" type="number" min="0" max="60" v-model="config.authentication.radius.acct_timeout" :title="t('sstp.tips.accountingTimeout')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.maxRetry') }}</label><input class="form-control" type="number" min="1" max="20" v-model="config.authentication.radius.max_try" :title="t('sstp.tips.maxRetry')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.nasIdentifier') }}</label><input class="form-control" v-model="config.authentication.radius.nas_identifier" :title="t('sstp.tips.nasIdentifier')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.nasIpAddress') }}</label><input class="form-control" v-model="config.authentication.radius.nas_ip_address" placeholder="x.x.x.x" :title="t('sstp.tips.nasIpAddress')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.preallocateVif') }}</label><input type="checkbox" v-model="config.authentication.radius.preallocate_vif" :title="t('sstp.tips.preallocateVif')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.rateLimitAttribute') }}</label><input class="form-control" v-model="config.authentication.radius.rate_limit.attribute" :title="t('sstp.tips.rateLimitAttribute')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.enableRateLimit') }}</label><input type="checkbox" v-model="config.authentication.radius.rate_limit.enable" :title="t('sstp.tips.enableRateLimit')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.rateLimitMultiplier') }}</label><input class="form-control" v-model="config.authentication.radius.rate_limit.multiplier" :title="t('sstp.tips.rateLimitMultiplier')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.rateLimitVendor') }}</label><input class="form-control" v-model="config.authentication.radius.rate_limit.vendor" :title="t('sstp.tips.rateLimitVendor')" /></div>
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.dynamicAuthor') }}</div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.coaKey') }}</label><input class="form-control" v-model="config.authentication.radius.dynamic_author.key" :title="t('sstp.tips.coaKey')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.coaPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="config.authentication.radius.dynamic_author.port" :title="t('sstp.tips.coaPort')" /></div>
          <div class="form-row"><label class="form-label">{{ t('sstp.labels.coaServer') }}</label><input class="form-control" v-model="config.authentication.radius.dynamic_author.server" placeholder="x.x.x.x" :title="t('sstp.tips.coaServer')" /></div>
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.radiusServers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">{{ t('sstp.buttons.add') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServers.length || selectedRadiusServers.length > 1">{{ t('sstp.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServers.length">{{ t('sstp.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.authentication.radius.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedRadiusServers = $event" :selectable="true" />
        </div>
      </template>

      <template #pool>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.defaultIpPool') }}</label><input class="form-control" v-model="config.default_pool" :title="t('sstp.tips.defaultIpPool')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.defaultIpv6Pool') }}</label><input class="form-control" v-model="config.default_ipv6_pool" :title="t('sstp.tips.defaultIpv6Pool')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.clientIpPool') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createIpPool">{{ t('sstp.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editIpPool" :disabled="!selectedIpPools.length || selectedIpPools.length > 1">{{ t('sstp.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeIpPool" :disabled="!selectedIpPools.length">{{ t('sstp.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ipPoolColumns" :data="config.client_ip_pools" rowKey="name" :externalToolbar="true" @selection-change="selectedIpPools = $event" :selectable="true" />

        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('sstp.sections.clientIpv6Pool') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createIpv6Pool">{{ t('sstp.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editIpv6Pool" :disabled="!selectedIpv6Pools.length || selectedIpv6Pools.length > 1">{{ t('sstp.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeIpv6Pool" :disabled="!selectedIpv6Pools.length">{{ t('sstp.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ipv6PoolColumns" :data="config.client_ipv6_pools" rowKey="name" :externalToolbar="true" @selection-change="selectedIpv6Pools = $event" :selectable="true" />
      </template>

      <template #ppp>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.disableCcp') }}</label><input type="checkbox" v-model="config.ppp_options.disable_ccp" :title="t('sstp.tips.disableCcp')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.interfaceCache') }}</label><input class="form-control" type="number" min="1" max="256000" v-model="config.ppp_options.interface_cache" :title="t('sstp.tips.interfaceCache')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.ipv4Negotiation') }}</label>
          <select class="form-control" v-model="config.ppp_options.ipv4" :title="t('sstp.tips.ipv4Negotiation')">
            <option value="deny">{{ t('sstp.options.negotiation.deny') }}</option>
            <option value="allow">{{ t('sstp.options.negotiation.allow') }}</option>
            <option value="prefer">{{ t('sstp.options.negotiation.prefer') }}</option>
            <option value="require">{{ t('sstp.options.negotiation.require') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.ipv6Negotiation') }}</label>
          <select class="form-control" v-model="config.ppp_options.ipv6" :title="t('sstp.tips.ipv6Negotiation')">
            <option value="deny">{{ t('sstp.options.negotiation.deny') }}</option>
            <option value="allow">{{ t('sstp.options.negotiation.allow') }}</option>
            <option value="prefer">{{ t('sstp.options.negotiation.prefer') }}</option>
            <option value="require">{{ t('sstp.options.negotiation.require') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.acceptPeerInterfaceId') }}</label><input type="checkbox" v-model="config.ppp_options.ipv6_accept_peer_interface_id" :title="t('sstp.tips.acceptPeerInterfaceId')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.ipv6InterfaceId') }}</label><input class="form-control" v-model="config.ppp_options.ipv6_interface_id" :placeholder="t('sstp.placeholders.ipv6InterfaceId')" :title="t('sstp.tips.ipv6InterfaceId')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.ipv6PeerInterfaceId') }}</label><input class="form-control" v-model="config.ppp_options.ipv6_peer_interface_id" placeholder="random/ipv4-addr/calling-sid/x:x:x:x" :title="t('sstp.tips.ipv6PeerInterfaceId')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.lcpEchoFailure') }}</label><input class="form-control" type="number" v-model="config.ppp_options.lcp_echo_failure" :title="t('sstp.tips.lcpEchoFailure')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.lcpEchoInterval') }}</label><input class="form-control" type="number" v-model="config.ppp_options.lcp_echo_interval" :title="t('sstp.tips.lcpEchoInterval')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.lcpEchoTimeout') }}</label><input class="form-control" type="number" v-model="config.ppp_options.lcp_echo_timeout" :title="t('sstp.tips.lcpEchoTimeout')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.minMtu') }}</label><input class="form-control" type="number" min="68" max="65535" v-model="config.ppp_options.min_mtu" :title="t('sstp.tips.minMtu')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.mppe') }}</label>
          <select class="form-control" v-model="config.ppp_options.mppe" :title="t('sstp.tips.mppe')">
            <option value="require">{{ t('sstp.options.negotiation.require') }}</option>
            <option value="prefer">{{ t('sstp.options.negotiation.prefer') }}</option>
            <option value="deny">{{ t('sstp.options.negotiation.deny') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.mru') }}</label><input class="form-control" type="number" min="68" max="65535" v-model="config.ppp_options.mru" :title="t('sstp.tips.mru')" /></div>
      </template>

      <template #ssl>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.caCertificate') }}</label><input class="form-control" v-model="config.ssl.ca_certificate" :title="t('sstp.tips.caCertificate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.certificate') }}</label><input class="form-control" v-model="config.ssl.certificate" :title="t('sstp.tips.certificate')" /></div>
      </template>

      <template #network>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.dnsServer') }}</label><textarea class="form-control" v-model="config.name_servers" rows="3" :placeholder="t('sstp.placeholders.dnsServer')" :title="t('sstp.tips.dnsServer')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.winsServer') }}</label><textarea class="form-control" v-model="config.wins_servers" rows="3" :placeholder="t('sstp.placeholders.winsServer')" :title="t('sstp.tips.winsServer')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.fwmark') }}</label><input class="form-control" type="number" min="1" max="2147483647" v-model="config.shaper.fwmark" :title="t('sstp.tips.fwmark')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.burst') }}</label><input class="form-control" v-model="config.limits.burst" :title="t('sstp.tips.burst')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.connectionLimit') }}</label><input class="form-control" v-model="config.limits.connection_limit" :placeholder="t('sstp.placeholders.connectionLimit')" :title="t('sstp.tips.connectionLimit')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.timeout') }}</label><input class="form-control" v-model="config.limits.timeout" :title="t('sstp.tips.timeout')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.logLevel') }}</label>
          <select class="form-control" v-model="config.log.level" :title="t('sstp.tips.logLevel')">
            <option value="0">{{ t('sstp.options.logLevel.off') }}</option>
            <option value="1">{{ t('sstp.options.logLevel.error') }}</option>
            <option value="2">{{ t('sstp.options.logLevel.errorWarning') }}</option>
            <option value="3">{{ t('sstp.options.logLevel.default') }}</option>
            <option value="4">{{ t('sstp.options.logLevel.verbose') }}</option>
            <option value="5">{{ t('sstp.options.logLevel.debug') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.snmpMasterAgent') }}</label><input type="checkbox" v-model="config.snmp.master_agent" :title="t('sstp.tips.snmpMasterAgent')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.onChangeScript') }}</label><input class="form-control" v-model="config.extended_scripts.on_change" :title="t('sstp.tips.onChangeScript')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.onDownScript') }}</label><input class="form-control" v-model="config.extended_scripts.on_down" :title="t('sstp.tips.onDownScript')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.onPreUpScript') }}</label><input class="form-control" v-model="config.extended_scripts.on_pre_up" :title="t('sstp.tips.onPreUpScript')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.onUpScript') }}</label><input class="form-control" v-model="config.extended_scripts.on_up" :title="t('sstp.tips.onUpScript')" /></div>
      </template>
      </TabGroup>

      <DraggableModal v-model:visible="showUserModal" :title="editingUser && editingUser._username ? t('sstp.modals.editUser') : t('sstp.modals.createUser')" @confirm="saveUser" @close="showUserModal = false" width="600px">
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.username') }}</label><input class="form-control" v-model="editingUser.username" :disabled="editingUser._username" :title="t('sstp.tips.username')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.password') }}</label><input class="form-control" type="password" v-model="editingUser.password" :title="t('sstp.tips.password')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.staticIp') }}</label><input class="form-control" v-model="editingUser.static_ip" placeholder="x.x.x.x" :title="t('sstp.tips.staticIp')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.disable') }}</label><input type="checkbox" v-model="editingUser.disable" :title="t('sstp.tips.disableUser')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.downloadLimit') }}</label><input class="form-control" v-model="editingUser.rate_limit.download" :title="t('sstp.tips.downloadLimit')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.uploadLimit') }}</label><input class="form-control" v-model="editingUser.rate_limit.upload" :title="t('sstp.tips.uploadLimit')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showRadiusModal" :title="editingRadiusServer && editingRadiusServer._address ? t('sstp.modals.editRadiusServer') : t('sstp.modals.addRadiusServer')" @confirm="saveRadiusServer" @close="showRadiusModal = false">
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.address') }}</label><input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._address" placeholder="x.x.x.x" :title="t('sstp.tips.radiusServerAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.sharedKey') }}</label><input class="form-control" v-model="editingRadiusServer.key" :title="t('sstp.tips.sharedKey')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" :title="t('sstp.tips.radiusPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.sourceAddress') }}</label><input class="form-control" v-model="editingRadiusServer.source_address" placeholder="x.x.x.x" :title="t('sstp.tips.radiusSourceAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.acctPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.acct_port" :title="t('sstp.tips.acctPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.backup') }}</label><input type="checkbox" v-model="editingRadiusServer.backup" :title="t('sstp.tips.backup')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.disableAccounting') }}</label><input type="checkbox" v-model="editingRadiusServer.disable_accounting" :title="t('sstp.tips.disableAccounting')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.failTime') }}</label><input class="form-control" type="number" min="0" v-model="editingRadiusServer.fail_time" :title="t('sstp.tips.failTime')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.priority') }}</label><input class="form-control" v-model="editingRadiusServer.priority" :title="t('sstp.tips.priority')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.timeout') }}</label><input class="form-control" type="number" min="1" max="240" v-model="editingRadiusServer.timeout" :title="t('sstp.tips.radiusTimeout')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.disable') }}</label><input type="checkbox" v-model="editingRadiusServer.disable" :title="t('sstp.tips.disableServer')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showIpPoolModal" :title="editingIpPool && editingIpPool._name ? t('sstp.modals.editIpPool') : t('sstp.modals.createIpPool')" @confirm="saveIpPool" @close="showIpPoolModal = false" width="600px">
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.name') }}</label><input class="form-control" v-model="editingIpPool.name" :disabled="editingIpPool._name" :title="t('sstp.tips.ipPoolName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.nextPool') }}</label><input class="form-control" v-model="editingIpPool.next_pool" :title="t('sstp.tips.nextPool')" /></div>
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.range') }}</label><input class="form-control" v-model="editingIpPool.range" :placeholder="t('sstp.placeholders.ipRange')" :title="t('sstp.tips.ipRange')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showIpv6PoolModal" :title="editingIpv6Pool && editingIpv6Pool._name ? t('sstp.modals.editIpv6Pool') : t('sstp.modals.createIpv6Pool')" @confirm="saveIpv6Pool" @close="showIpv6PoolModal = false" width="700px">
        <div class="form-row"><label class="form-label">{{ t('sstp.labels.name') }}</label><input class="form-control" v-model="editingIpv6Pool.name" :disabled="editingIpv6Pool._name" :title="t('sstp.tips.ipv6PoolName')" /></div>
        <div style="font-weight:bold;margin:12px 0 8px;">{{ t('sstp.sections.delegatePrefix') }}</div>
        <div v-for="(d, i) in editingIpv6Pool.delegate" :key="'d'+i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
          <input class="form-control" v-model="d.prefix" placeholder="h:h:h:h:h:h:h:h/x" :title="t('sstp.tips.ipv6DelegatePrefix')" style="flex:2;" />
          <input class="form-control" type="number" min="32" max="64" v-model="d.delegation_prefix" placeholder="32-64" :title="t('sstp.tips.delegatePrefixLength')" style="flex:1;" />
          <button @click="editingIpv6Pool.delegate.splice(i, 1)" style="padding:4px 8px;">{{ t('sstp.buttons.delete') }}</button>
        </div>
        <button @click="editingIpv6Pool.delegate.push({prefix:'',delegation_prefix:''})" style="margin-bottom:12px;">{{ t('sstp.buttons.addDelegatePrefix') }}</button>
        <div style="font-weight:bold;margin:12px 0 8px;">{{ t('sstp.sections.clientPrefixPool') }}</div>
        <div v-for="(p, i) in editingIpv6Pool.prefix" :key="'p'+i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
          <input class="form-control" v-model="p.prefix" placeholder="h:h:h:h:h:h:h:h/x" :title="t('sstp.tips.ipv6Prefix')" style="flex:2;" />
          <input class="form-control" type="number" min="48" max="128" v-model="p.mask" placeholder="48-128" :title="t('sstp.tips.clientPrefixLength')" style="flex:1;" />
          <button @click="editingIpv6Pool.prefix.splice(i, 1)" style="padding:4px 8px;">{{ t('sstp.buttons.delete') }}</button>
        </div>
        <button @click="editingIpv6Pool.prefix.push({prefix:'',mask:''})">{{ t('sstp.buttons.addClientPrefix') }}</button>
      </DraggableModal>
    </div>
  `,
});
