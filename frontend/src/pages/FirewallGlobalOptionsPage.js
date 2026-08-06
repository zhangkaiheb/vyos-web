import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const ENABLE_OPTIONS = ['', 'enable', 'disable'];
const VALIDATION_OPTIONS = ['', 'strict', 'loose', 'disable'];
const ACTION_OPTIONS = ['', 'accept', 'drop', 'reject'];
const LOG_LEVEL_OPTIONS = ['', 'emerg', 'alert', 'crit', 'err', 'warn', 'notice', 'info', 'debug'];

const GENERAL_SCHEMA = [
  { key: 'all_ping', title: '所有 ICMP 请求 (all-ping)', type: 'select', options: ENABLE_OPTIONS, help: '处理所有 IPv4 ICMP echo 请求' },
  { key: 'broadcast_ping', title: '广播 ICMP 请求 (broadcast-ping)', type: 'select', options: ENABLE_OPTIONS, help: '处理广播 IPv4 ICMP echo/timestamp 请求' },
  { key: 'directed_broadcast', title: '定向广播转发 (directed-broadcast)', type: 'select', options: ENABLE_OPTIONS, help: '所有接口 IPv4 定向广播转发' },
  { key: 'ip_src_route', title: 'IPv4 源路由选项 (ip-src-route)', type: 'select', options: ENABLE_OPTIONS, help: '处理带源路由选项的 IPv4 数据包' },
  { key: 'ipv6_receive_redirects', title: 'IPv6 接收重定向 (ipv6-receive-redirects)', type: 'select', options: ENABLE_OPTIONS, help: '处理接收到的 ICMPv6 重定向消息' },
  { key: 'ipv6_source_validation', title: 'IPv6 源验证 (ipv6-source-validation)', type: 'select', options: VALIDATION_OPTIONS, help: 'RFC3704 IPv6 反向路径源验证' },
  { key: 'ipv6_src_route', title: 'IPv6 源路由扩展头 (ipv6-src-route)', type: 'select', options: ENABLE_OPTIONS, help: '处理带路由扩展头的 IPv6 数据包' },
  { key: 'log_martians', title: '无效地址日志 (log-martians)', type: 'select', options: ENABLE_OPTIONS, help: '记录无效地址的 IPv4 数据包' },
  { key: 'receive_redirects', title: 'IPv4 接收重定向 (receive-redirects)', type: 'select', options: ENABLE_OPTIONS, help: '处理接收到的 IPv4 ICMP 重定向消息' },
  { key: 'resolver_cache', title: '域名解析缓存 (resolver-cache)', type: 'checkbox', help: '解析失败时保留上次成功值' },
  { key: 'resolver_interval', title: '解析更新间隔 (resolver-interval)', type: 'number', placeholder: '300', help: '域名解析更新间隔，单位秒', min: 10, max: 3600 },
  { key: 'send_redirects', title: 'IPv4 发送重定向 (send-redirects)', type: 'select', options: ENABLE_OPTIONS, help: '发送 IPv4 ICMP 重定向消息' },
  { key: 'source_validation', title: 'IPv4 源验证 (source-validation)', type: 'select', options: VALIDATION_OPTIONS, help: 'RFC3704 IPv4 反向路径源验证' },
  { key: 'syn_cookies', title: 'TCP SYN Cookies (syn-cookies)', type: 'select', options: ENABLE_OPTIONS, help: 'IPv4 TCP SYN Cookie 保护' },
  { key: 'twa_hazards_protection', title: 'TIME-WAIT 保护 (twa-hazards-protection)', type: 'select', options: ENABLE_OPTIONS, help: 'RFC1337 TCP TIME-WAIT 暗杀风险保护' },
];

function statePolicySchema(state) {
  const titleMap = { established: '已建立', invalid: '无效', related: '相关' };
  return [
    { key: `state_policy_${state}_action`, title: `${titleMap[state]} 连接动作`, type: 'select', options: ACTION_OPTIONS },
    { key: `state_policy_${state}_log`, title: `${titleMap[state]} 连接日志`, type: 'checkbox' },
    { key: `state_policy_${state}_log_level`, title: `${titleMap[state]} 日志级别`, type: 'select', options: LOG_LEVEL_OPTIONS },
  ];
}

const STATE_POLICY_SCHEMA = [
  ...statePolicySchema('established'),
  ...statePolicySchema('invalid'),
  ...statePolicySchema('related'),
];

const TIMEOUT_SCHEMA = [
  { key: 'timeout_icmp', title: 'ICMP 超时 (秒)', type: 'number', placeholder: '30', min: 1, max: 21474836 },
  { key: 'timeout_other', title: '通用连接超时 (秒)', type: 'number', placeholder: '600', min: 1, max: 21474836 },
  { key: 'timeout_tcp_close', title: 'TCP CLOSE 超时 (秒)', type: 'number', placeholder: '10', min: 1, max: 21474836 },
  { key: 'timeout_tcp_close_wait', title: 'TCP CLOSE-WAIT 超时 (秒)', type: 'number', placeholder: '60', min: 1, max: 21474836 },
  { key: 'timeout_tcp_established', title: 'TCP ESTABLISHED 超时 (秒)', type: 'number', placeholder: '432000', min: 1, max: 21474836 },
  { key: 'timeout_tcp_fin_wait', title: 'TCP FIN-WAIT 超时 (秒)', type: 'number', placeholder: '120', min: 1, max: 21474836 },
  { key: 'timeout_tcp_last_ack', title: 'TCP LAST-ACK 超时 (秒)', type: 'number', placeholder: '30', min: 1, max: 21474836 },
  { key: 'timeout_tcp_syn_recv', title: 'TCP SYN-RECEIVED 超时 (秒)', type: 'number', placeholder: '60', min: 1, max: 21474836 },
  { key: 'timeout_tcp_syn_sent', title: 'TCP SYN-SENT 超时 (秒)', type: 'number', placeholder: '120', min: 1, max: 21474836 },
  { key: 'timeout_tcp_time_wait', title: 'TCP TIME-WAIT 超时 (秒)', type: 'number', placeholder: '120', min: 1, max: 21474836 },
  { key: 'timeout_udp_other', title: 'UDP OTHER 超时 (秒)', type: 'number', placeholder: '30', min: 1, max: 21474836 },
  { key: 'timeout_udp_stream', title: 'UDP STREAM 超时 (秒)', type: 'number', placeholder: '180', min: 1, max: 21474836 },
];

const TAB_DEFS = [
  { key: 'general', title: '常规', schema: GENERAL_SCHEMA },
  { key: 'state_policy', title: '状态策略', schema: STATE_POLICY_SCHEMA },
  { key: 'timeout', title: '超时', schema: TIMEOUT_SCHEMA },
];

const DEFAULTS = {
  all_ping: 'enable',
  broadcast_ping: 'disable',
  directed_broadcast: 'enable',
  ip_src_route: 'disable',
  ipv6_receive_redirects: 'disable',
  ipv6_source_validation: 'disable',
  ipv6_src_route: 'disable',
  log_martians: 'enable',
  receive_redirects: 'disable',
  resolver_cache: false,
  resolver_interval: 300,
  send_redirects: 'enable',
  source_validation: 'disable',
  syn_cookies: 'enable',
  twa_hazards_protection: 'disable',

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
    if (cfg[cfgKey] !== undefined) form[formKey] = cfg[cfgKey];
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
    if (isPresent(val)) value[cfgKey] = String(val);
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
    const form = ref({ ...DEFAULTS });
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('general');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

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
        await configApi.set('firewall global-options', value);
        // Boolean nodes must be set without a value (null) because set_section
        // treats empty strings as leaf values and creates invalid paths.
        if (form.value.resolver_cache) {
          await configApi.set('firewall global-options resolver-cache', null);
        } else {
          try { await configApi.delete('firewall global-options resolver-cache'); } catch (_) {}
        }
        for (const state of ['established', 'invalid', 'related']) {
          if (form.value[`state_policy_${state}_log`]) {
            await configApi.set(`firewall global-options state-policy ${state} log`, null);
          } else {
            try { await configApi.delete(`firewall global-options state-policy ${state} log`); } catch (_) {}
          }
        }
        saved.value = true;
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);

    return {
      form, loading, saving, saved, activeTab, writeDisabled,
      tabs: TAB_DEFS,
      load, save, route,
    };
  },
  template: `
    <div>
      <div class="page-section">
        <div v-if="saved" class="alert alert-success">已保存</div>
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]="{ tab: t }">
            <ConfigForm v-model="form" :schema="t.schema" :disabled="writeDisabled" :formKey="'fw_global_' + t.key" />
          </template>
        </TabGroup>
        <div class="page-actions-bottom">
          <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled || saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
  components: { ConfigForm, TabGroup },
});
