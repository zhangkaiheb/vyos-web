import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const ENABLE_OPTIONS = ['', 'enable', 'disable'];
const VALIDATION_OPTIONS = ['', 'strict', 'loose', 'disable'];
const ACTION_OPTIONS = ['', 'accept', 'drop', 'reject'];
const LOG_LEVEL_OPTIONS = ['', 'emerg', 'alert', 'crit', 'err', 'warn', 'notice', 'info', 'debug'];

function buildGeneralSchema(t) {
  return [
    { key: 'all_ping', title: t('firewall.global.allPing'), type: 'checkbox', help: t('firewall.global.allPingHelp') },
    { key: 'broadcast_ping', title: t('firewall.global.broadcastPing'), type: 'checkbox', help: t('firewall.global.broadcastPingHelp') },
    { key: 'directed_broadcast', title: t('firewall.global.directedBroadcast'), type: 'checkbox', help: t('firewall.global.directedBroadcastHelp') },
    { key: 'ip_src_route', title: t('firewall.global.ipSrcRoute'), type: 'checkbox', help: t('firewall.global.ipSrcRouteHelp') },
    { key: 'ipv6_receive_redirects', title: t('firewall.global.ipv6ReceiveRedirects'), type: 'checkbox', help: t('firewall.global.ipv6ReceiveRedirectsHelp') },
    { key: 'ipv6_source_validation', title: t('firewall.global.ipv6SourceValidation'), type: 'select', options: VALIDATION_OPTIONS, help: t('firewall.global.ipv6SourceValidationHelp') },
    { key: 'ipv6_src_route', title: t('firewall.global.ipv6SrcRoute'), type: 'checkbox', help: t('firewall.global.ipv6SrcRouteHelp') },
    { key: 'log_martians', title: t('firewall.global.logMartians'), type: 'checkbox', help: t('firewall.global.logMartiansHelp') },
    { key: 'receive_redirects', title: t('firewall.global.receiveRedirects'), type: 'checkbox', help: t('firewall.global.receiveRedirectsHelp') },
    { key: 'resolver_cache', title: t('firewall.global.resolverCache'), type: 'checkbox', help: t('firewall.global.resolverCacheHelp') },
    { key: 'resolver_interval', title: t('firewall.global.resolverInterval'), type: 'number', placeholder: '300', help: t('firewall.global.resolverIntervalHelp'), min: 10, max: 3600 },
    { key: 'send_redirects', title: t('firewall.global.sendRedirects'), type: 'checkbox', help: t('firewall.global.sendRedirectsHelp') },
    { key: 'source_validation', title: t('firewall.global.sourceValidation'), type: 'select', options: VALIDATION_OPTIONS, help: t('firewall.global.sourceValidationHelp') },
    { key: 'syn_cookies', title: t('firewall.global.synCookies'), type: 'checkbox', help: t('firewall.global.synCookiesHelp') },
    { key: 'twa_hazards_protection', title: t('firewall.global.twaHazardsProtection'), type: 'checkbox', help: t('firewall.global.twaHazardsProtectionHelp') },
  ];
}

function buildSingleStatePolicySchema(t, state) {
  const titleMap = { established: t('firewall.global.established'), invalid: t('firewall.global.invalid'), related: t('firewall.global.related') };
  return [
    { key: `state_policy_${state}_action`, title: `${titleMap[state]} ${t('firewall.global.connectionAction')}`, type: 'select', options: ACTION_OPTIONS },
    { key: `state_policy_${state}_log`, title: `${titleMap[state]} ${t('firewall.global.connectionLog')}`, type: 'checkbox' },
    { key: `state_policy_${state}_log_level`, title: `${titleMap[state]} ${t('firewall.global.logLevel')}`, type: 'select', options: LOG_LEVEL_OPTIONS },
  ];
}

function buildStatePolicySchema(t) {
  return [
    ...buildSingleStatePolicySchema(t, 'established'),
    ...buildSingleStatePolicySchema(t, 'invalid'),
    ...buildSingleStatePolicySchema(t, 'related'),
  ];
}

function buildTimeoutSchema(t) {
  return [
    { key: 'timeout_icmp', title: t('firewall.global.timeoutIcmp'), type: 'number', placeholder: '30', min: 1, max: 21474836 },
    { key: 'timeout_other', title: t('firewall.global.timeoutOther'), type: 'number', placeholder: '600', min: 1, max: 21474836 },
    { key: 'timeout_tcp_close', title: t('firewall.global.timeoutTcpClose'), type: 'number', placeholder: '10', min: 1, max: 21474836 },
    { key: 'timeout_tcp_close_wait', title: t('firewall.global.timeoutTcpCloseWait'), type: 'number', placeholder: '60', min: 1, max: 21474836 },
    { key: 'timeout_tcp_established', title: t('firewall.global.timeoutTcpEstablished'), type: 'number', placeholder: '432000', min: 1, max: 21474836 },
    { key: 'timeout_tcp_fin_wait', title: t('firewall.global.timeoutTcpFinWait'), type: 'number', placeholder: '120', min: 1, max: 21474836 },
    { key: 'timeout_tcp_last_ack', title: t('firewall.global.timeoutTcpLastAck'), type: 'number', placeholder: '30', min: 1, max: 21474836 },
    { key: 'timeout_tcp_syn_recv', title: t('firewall.global.timeoutTcpSynRecv'), type: 'number', placeholder: '60', min: 1, max: 21474836 },
    { key: 'timeout_tcp_syn_sent', title: t('firewall.global.timeoutTcpSynSent'), type: 'number', placeholder: '120', min: 1, max: 21474836 },
    { key: 'timeout_tcp_time_wait', title: t('firewall.global.timeoutTcpTimeWait'), type: 'number', placeholder: '120', min: 1, max: 21474836 },
    { key: 'timeout_udp_other', title: t('firewall.global.timeoutUdpOther'), type: 'number', placeholder: '30', min: 1, max: 21474836 },
    { key: 'timeout_udp_stream', title: t('firewall.global.timeoutUdpStream'), type: 'number', placeholder: '180', min: 1, max: 21474836 },
  ];
}

const DEFAULTS = {
  all_ping: true,
  broadcast_ping: false,
  directed_broadcast: true,
  ip_src_route: false,
  ipv6_receive_redirects: false,
  ipv6_source_validation: 'disable',
  ipv6_src_route: false,
  log_martians: true,
  receive_redirects: false,
  resolver_cache: false,
  resolver_interval: 300,
  send_redirects: true,
  source_validation: 'disable',
  syn_cookies: true,
  twa_hazards_protection: false,

  state_policy_established_action: '',
  state_policy_established_log: false,
  state_policy_established_log_level: '',
  state_policy_invalid_action: '',
  state_policy_invalid_log: false,
  state_policy_invalid_log_level: '',
  state_policy_related_action: '',
  state_policy_related_log: false,
  state_policy_related_log_level: '',

  timeout_icmp: 30,
  timeout_other: 600,
  timeout_tcp_close: 10,
  timeout_tcp_close_wait: 60,
  timeout_tcp_established: 432000,
  timeout_tcp_fin_wait: 120,
  timeout_tcp_last_ack: 30,
  timeout_tcp_syn_recv: 60,
  timeout_tcp_syn_sent: 120,
  timeout_tcp_time_wait: 120,
  timeout_udp_other: 30,
  timeout_udp_stream: 180,
};

function getNested(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function hasNested(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur === undefined || cur === null) return false;
    cur = cur[p];
  }
  return cur !== undefined;
}

function configToForm(cfg) {
  const form = { ...DEFAULTS };

  const mapGeneral = {
    all_ping: 'all-ping',
    broadcast_ping: 'broadcast-ping',
    directed_broadcast: 'directed-broadcast',
    ip_src_route: 'ip-src-route',
    ipv6_receive_redirects: 'ipv6-receive-redirects',
    ipv6_source_validation: 'ipv6-source-validation',
    ipv6_src_route: 'ipv6-src-route',
    log_martians: 'log-martians',
    receive_redirects: 'receive-redirects',
    resolver_cache: 'resolver-cache',
    resolver_interval: 'resolver-interval',
    send_redirects: 'send-redirects',
    source_validation: 'source-validation',
    syn_cookies: 'syn-cookies',
    twa_hazards_protection: 'twa-hazards-protection',
  };
  for (const [formKey, cfgKey] of Object.entries(mapGeneral)) {
    if (cfg[cfgKey] !== undefined) {
      // Checkbox fields: convert 'enable'/'disable' to boolean
      if (['all_ping', 'broadcast_ping', 'directed_broadcast', 'ip_src_route',
           'ipv6_receive_redirects', 'ipv6_src_route', 'log_martians',
           'receive_redirects', 'send_redirects', 'syn_cookies',
           'twa_hazards_protection'].includes(formKey)) {
        form[formKey] = cfg[cfgKey] === 'enable';
      } else {
        form[formKey] = cfg[cfgKey];
      }
    }
  }
  // resolver-cache is a boolean node (set without value)
  form.resolver_cache = cfg['resolver-cache'] !== undefined;

  for (const state of ['established', 'invalid', 'related']) {
    const sp = getNested(cfg, ['state-policy', state]) || {};
    form[`state_policy_${state}_action`] = sp.action || '';
    form[`state_policy_${state}_log`] = sp.log !== undefined;
    form[`state_policy_${state}_log_level`] = sp['log-level'] || '';
  }

  const timeout = cfg.timeout || {};
  if (timeout.icmp !== undefined) form.timeout_icmp = Number(timeout.icmp);
  if (timeout.other !== undefined) form.timeout_other = Number(timeout.other);
  const tcp = timeout.tcp || {};
  if (tcp.close !== undefined) form.timeout_tcp_close = Number(tcp.close);
  if (tcp['close-wait'] !== undefined) form.timeout_tcp_close_wait = Number(tcp['close-wait']);
  if (tcp.established !== undefined) form.timeout_tcp_established = Number(tcp.established);
  if (tcp['fin-wait'] !== undefined) form.timeout_tcp_fin_wait = Number(tcp['fin-wait']);
  if (tcp['last-ack'] !== undefined) form.timeout_tcp_last_ack = Number(tcp['last-ack']);
  if (tcp['syn-recv'] !== undefined) form.timeout_tcp_syn_recv = Number(tcp['syn-recv']);
  if (tcp['syn-sent'] !== undefined) form.timeout_tcp_syn_sent = Number(tcp['syn-sent']);
  if (tcp['time-wait'] !== undefined) form.timeout_tcp_time_wait = Number(tcp['time-wait']);
  const udp = timeout.udp || {};
  if (udp.other !== undefined) form.timeout_udp_other = Number(udp.other);
  if (udp.stream !== undefined) form.timeout_udp_stream = Number(udp.stream);

  return form;
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function formToConfig(form) {
  const value = {};

  const checkboxFields = [
    'all-ping', 'broadcast-ping', 'directed-broadcast', 'ip-src-route',
    'ipv6-receive-redirects', 'ipv6-src-route', 'log-martians',
    'receive-redirects', 'send-redirects', 'syn-cookies', 'twa-hazards-protection'
  ];

  const mapGeneral = {
    'all-ping': form.all_ping,
    'broadcast-ping': form.broadcast_ping,
    'directed-broadcast': form.directed_broadcast,
    'ip-src-route': form.ip_src_route,
    'ipv6-receive-redirects': form.ipv6_receive_redirects,
    'ipv6-source-validation': form.ipv6_source_validation,
    'ipv6-src-route': form.ipv6_src_route,
    'log-martians': form.log_martians,
    'receive-redirects': form.receive_redirects,
    'resolver-interval': form.resolver_interval,
    'send-redirects': form.send_redirects,
    'source-validation': form.source_validation,
    'syn-cookies': form.syn_cookies,
    'twa-hazards-protection': form.twa_hazards_protection,
  };
  for (const [cfgKey, val] of Object.entries(mapGeneral)) {
    if (checkboxFields.includes(cfgKey)) {
      // Checkbox fields always send 'enable' or 'disable'
      value[cfgKey] = val ? 'enable' : 'disable';
    } else if (isPresent(val)) {
      value[cfgKey] = String(val);
    }
  }
  // resolver-cache is a boolean node and is set separately

  const statePolicy = {};
  for (const state of ['established', 'invalid', 'related']) {
    const action = form[`state_policy_${state}_action`];
    const logLevel = form[`state_policy_${state}_log_level`];
    const sp = {};
    if (action) sp.action = action;
    if (logLevel) sp['log-level'] = logLevel;
    if (Object.keys(sp).length) statePolicy[state] = sp;
  }
  if (Object.keys(statePolicy).length) value['state-policy'] = statePolicy;
  // state-policy <state> log is a boolean node and is set separately

  const timeout = {};
  if (isPresent(form.timeout_icmp)) timeout.icmp = String(form.timeout_icmp);
  if (isPresent(form.timeout_other)) timeout.other = String(form.timeout_other);

  const tcp = {};
  if (isPresent(form.timeout_tcp_close)) tcp.close = String(form.timeout_tcp_close);
  if (isPresent(form.timeout_tcp_close_wait)) tcp['close-wait'] = String(form.timeout_tcp_close_wait);
  if (isPresent(form.timeout_tcp_established)) tcp.established = String(form.timeout_tcp_established);
  if (isPresent(form.timeout_tcp_fin_wait)) tcp['fin-wait'] = String(form.timeout_tcp_fin_wait);
  if (isPresent(form.timeout_tcp_last_ack)) tcp['last-ack'] = String(form.timeout_tcp_last_ack);
  if (isPresent(form.timeout_tcp_syn_recv)) tcp['syn-recv'] = String(form.timeout_tcp_syn_recv);
  if (isPresent(form.timeout_tcp_syn_sent)) tcp['syn-sent'] = String(form.timeout_tcp_syn_sent);
  if (isPresent(form.timeout_tcp_time_wait)) tcp['time-wait'] = String(form.timeout_tcp_time_wait);
  if (Object.keys(tcp).length) timeout.tcp = tcp;

  const udp = {};
  if (isPresent(form.timeout_udp_other)) udp.other = String(form.timeout_udp_other);
  if (isPresent(form.timeout_udp_stream)) udp.stream = String(form.timeout_udp_stream);
  if (Object.keys(udp).length) timeout.udp = udp;

  if (Object.keys(timeout).length) value.timeout = timeout;

  return value;
}

export default defineComponent({
  name: 'FirewallGlobalOptionsPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const form = ref({ ...DEFAULTS });
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('general');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const tabs = computed(() => [
      { key: 'general', title: t('firewall.global.tabGeneral'), schema: buildGeneralSchema(t) },
      { key: 'state_policy', title: t('firewall.global.tabStatePolicy'), schema: buildStatePolicySchema(t) },
      { key: 'timeout', title: t('firewall.global.tabTimeout'), schema: buildTimeoutSchema(t) },
    ]);

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('firewall global-options', true);
        form.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      saved.value = false;
      try {
        const value = formToConfig(form.value);
        await configStore.setConfig('firewall global-options', value);
        configStore.markPending();
        // Boolean nodes must be set without a value (null) because set_section
        // treats empty strings as leaf values and creates invalid paths.
        if (form.value.resolver_cache) {
          await configStore.setConfig('firewall global-options resolver-cache', null);
          configStore.markPending();
        } else {
          try { await configStore.deleteConfig('firewall global-options resolver-cache'); } catch (_) {}
        }
        for (const state of ['established', 'invalid', 'related']) {
          if (form.value[`state_policy_${state}_log`]) {
            await configStore.setConfig(`firewall global-options state-policy ${state} log`, null);
            configStore.markPending();
          } else {
            try { await configStore.deleteConfig(`firewall global-options state-policy ${state} log`); } catch (_) {}
          }
        }
        await configStore.checkSessionChanged();
        saved.value = true;
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {t,
      
      form, loading, saving, saved, activeTab, writeDisabled,
      tabs,
      load, save, route,
    };
  },
  template: `
    <div>
      <div class="page-section">
        <div v-if="saved" class="alert alert-success">{{ $t('firewall.global.saved') }}</div>
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="form" :schema="tab.schema" :disabled="writeDisabled" :formKey="'fw_global_' + tab.key" />
          </template>
        </TabGroup>
        <div style="margin-top:16px;text-align:center;">
          <ToolbarButton icon="save" primary :disabled="writeDisabled || saving" @click="save">
            {{ saving ? $t('app.loading') : $t('app.confirm') }}
          </ToolbarButton>
        </div>
      </div>
    </div>
  `,
  components: { ConfigForm, TabGroup, ToolbarButton },
});
