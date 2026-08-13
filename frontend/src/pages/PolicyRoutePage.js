import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { interfaceApi, configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const ACTION_OPTIONS = [
  { value: 'accept', labelKey: 'policyRoute.options.accept' },
  { value: 'reject', labelKey: 'policyRoute.options.reject' },
  { value: 'return', labelKey: 'policyRoute.options.return' },
  { value: 'drop', labelKey: 'policyRoute.options.drop' },
];

const FRAGMENT_OPTIONS = [
  { value: 'match-frag', labelKey: 'policyRoute.options.matchFrag' },
  { value: 'match-non-frag', labelKey: 'policyRoute.options.matchNonFrag' },
];

const IPSEC_OPTIONS = [
  { value: 'match-ipsec', labelKey: 'policyRoute.options.matchIpsec' },
  { value: 'match-none', labelKey: 'policyRoute.options.matchNone' },
];

const PACKET_TYPE_OPTIONS = ['broadcast', 'host', 'multicast', 'other'];

const STATE_OPTIONS = ['established', 'invalid', 'new', 'related'];

function emptyRule() {
  return {
    rule: '',
    action: '',
    description: '',
    protocol: 'all',
    disable: false,
    source: { address: '', 'mac-address': '', port: '', group: { 'address-group': '', 'domain-group': '', 'mac-group': '', 'network-group': '', 'port-group': '' } },
    destination: { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'mac-group': '', 'network-group': '', 'port-group': '' } },
    'inbound-interface': '',
    'outbound-interface': '',
    'connection-mark': '',
    dscp: '',
    'dscp-exclude': '',
    fragment: '',
    icmp: { code: '', type: '', 'type-name': '' },
    ipsec: '',
    limit: { burst: '', rate: '' },
    log: false,
    mark: '',
    'packet-length': '',
    'packet-length-exclude': '',
    'packet-type': '',
    state: [],
    tcp: { flags: [], not: false, mss: '' },
    ttl: { eq: '', gt: '', lt: '' },
    recent: { count: '', time: '' },
    time: { monthdays: '', startdate: '', starttime: '', stopdate: '', stoptime: '', utc: false, weekdays: '' },
    set: { 'connection-mark': '', dscp: '', mark: '', table: '', 'tcp-mss': '' },
  };
}

function parseTcpFlags(flagsValue, mssValue) {
  const tcp = { flags: [], not: false, mss: mssValue || '' };
  if (!flagsValue || typeof flagsValue !== 'object') return tcp;
  const keys = Object.keys(flagsValue);
  if (keys.includes('not')) {
    tcp.not = true;
    const notValue = flagsValue.not;
    if (notValue && typeof notValue === 'object') {
      tcp.flags = Object.keys(notValue);
    } else if (notValue) {
      tcp.flags = [String(notValue)];
    }
  } else {
    tcp.flags = keys.filter(k => k !== 'not');
  }
  return tcp;
}

function configRulesToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  for (const [num, attrs] of Object.entries(raw)) {
    result.push({
      rule: num,
      action: attrs.action || '',
      description: attrs.description || '',
      protocol: attrs.protocol || 'all',
      disable: !!attrs.disable,
      source: attrs.source ? {
        address: attrs.source.address || '',
        'mac-address': attrs.source['mac-address'] || '',
        port: attrs.source.port || '',
        group: {
          'address-group': attrs.source.group?.['address-group'] || '',
          'domain-group': attrs.source.group?.['domain-group'] || '',
          'mac-group': attrs.source.group?.['mac-group'] || '',
          'network-group': attrs.source.group?.['network-group'] || '',
          'port-group': attrs.source.group?.['port-group'] || '',
        },
      } : { address: '', 'mac-address': '', port: '', group: { 'address-group': '', 'domain-group': '', 'mac-group': '', 'network-group': '', 'port-group': '' } },
      destination: attrs.destination ? {
        address: attrs.destination.address || '',
        port: attrs.destination.port || '',
        group: {
          'address-group': attrs.destination.group?.['address-group'] || '',
          'domain-group': attrs.destination.group?.['domain-group'] || '',
          'mac-group': attrs.destination.group?.['mac-group'] || '',
          'network-group': attrs.destination.group?.['network-group'] || '',
          'port-group': attrs.destination.group?.['port-group'] || '',
        },
      } : { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'mac-group': '', 'network-group': '', 'port-group': '' } },
      'inbound-interface': attrs['inbound-interface'] || '',
      'outbound-interface': attrs['outbound-interface'] || '',
      'connection-mark': attrs['connection-mark'] || '',
      dscp: attrs.dscp || '',
      'dscp-exclude': attrs['dscp-exclude'] || '',
      fragment: attrs.fragment || '',
      icmp: attrs.icmp ? {
        code: attrs.icmp.code || '',
        type: attrs.icmp.type || '',
        'type-name': attrs.icmp['type-name'] || '',
      } : { code: '', type: '', 'type-name': '' },
      ipsec: attrs.ipsec || '',
      limit: attrs.limit ? {
        burst: attrs.limit.burst || '',
        rate: attrs.limit.rate || '',
      } : { burst: '', rate: '' },
      log: !!attrs.log,
      mark: attrs.mark || '',
      'packet-length': attrs['packet-length'] || '',
      'packet-length-exclude': attrs['packet-length-exclude'] || '',
      'packet-type': attrs['packet-type'] || '',
      state: Array.isArray(attrs.state) ? attrs.state : (attrs.state ? [attrs.state] : []),
      tcp: attrs.tcp ? parseTcpFlags(attrs.tcp.flags, attrs.tcp.mss) : { flags: [], not: false, mss: '' },
      ttl: attrs.ttl ? {
        eq: attrs.ttl.eq || '',
        gt: attrs.ttl.gt || '',
        lt: attrs.ttl.lt || '',
      } : { eq: '', gt: '', lt: '' },
      recent: attrs.recent ? {
        count: attrs.recent.count || '',
        time: attrs.recent.time || '',
      } : { count: '', time: '' },
      time: attrs.time ? {
        monthdays: attrs.time.monthdays || '',
        startdate: attrs.time.startdate || '',
        starttime: attrs.time.starttime || '',
        stopdate: attrs.time.stopdate || '',
        stoptime: attrs.time.stoptime || '',
        utc: !!attrs.time.utc,
        weekdays: attrs.time.weekdays || '',
      } : { monthdays: '', startdate: '', starttime: '', stopdate: '', stoptime: '', utc: false, weekdays: '' },
      set: attrs.set ? {
        'connection-mark': attrs.set['connection-mark'] || '',
        dscp: attrs.set.dscp || '',
        mark: attrs.set.mark || '',
        table: attrs.set.table || '',
        'tcp-mss': attrs.set['tcp-mss'] || '',
      } : { 'connection-mark': '', dscp: '', mark: '', table: '', 'tcp-mss': '' },
    });
  }
  return result;
}

function formRuleToConfig(item) {
  const result = {};
  if (item.action) result.action = item.action;
  if (item.description) result.description = item.description;
  if (item.protocol && item.protocol !== 'all') result.protocol = item.protocol;
  if (item.disable) result.disable = '';

  const source = {};
  if (item.source?.address) source.address = item.source.address;
  if (item.source?.['mac-address']) source['mac-address'] = item.source['mac-address'];
  if (item.source?.port) source.port = item.source.port;
  const sourceGroup = {};
  if (item.source?.group?.['address-group']) sourceGroup['address-group'] = item.source.group['address-group'];
  if (item.source?.group?.['domain-group']) sourceGroup['domain-group'] = item.source.group['domain-group'];
  if (item.source?.group?.['mac-group']) sourceGroup['mac-group'] = item.source.group['mac-group'];
  if (item.source?.group?.['network-group']) sourceGroup['network-group'] = item.source.group['network-group'];
  if (item.source?.group?.['port-group']) sourceGroup['port-group'] = item.source.group['port-group'];
  if (Object.keys(sourceGroup).length) source.group = sourceGroup;
  if (Object.keys(source).length) result.source = source;

  const destination = {};
  if (item.destination?.address) destination.address = item.destination.address;
  if (item.destination?.port) destination.port = item.destination.port;
  const destinationGroup = {};
  if (item.destination?.group?.['address-group']) destinationGroup['address-group'] = item.destination.group['address-group'];
  if (item.destination?.group?.['domain-group']) destinationGroup['domain-group'] = item.destination.group['domain-group'];
  if (item.destination?.group?.['mac-group']) destinationGroup['mac-group'] = item.destination.group['mac-group'];
  if (item.destination?.group?.['network-group']) destinationGroup['network-group'] = item.destination.group['network-group'];
  if (item.destination?.group?.['port-group']) destinationGroup['port-group'] = item.destination.group['port-group'];
  if (Object.keys(destinationGroup).length) destination.group = destinationGroup;
  if (Object.keys(destination).length) result.destination = destination;

  if (item['inbound-interface']) result['inbound-interface'] = item['inbound-interface'];
  if (item['outbound-interface']) result['outbound-interface'] = item['outbound-interface'];
  if (item['connection-mark']) result['connection-mark'] = item['connection-mark'];
  if (item.dscp) result.dscp = item.dscp;
  if (item['dscp-exclude']) result['dscp-exclude'] = item['dscp-exclude'];
  if (item.fragment) result.fragment = item.fragment;

  const icmp = {};
  if (item.icmp?.code !== undefined && item.icmp.code !== '' && item.icmp.code !== null) icmp.code = item.icmp.code;
  if (item.icmp?.type !== undefined && item.icmp.type !== '' && item.icmp.type !== null) icmp.type = item.icmp.type;
  if (item.icmp?.['type-name']) icmp['type-name'] = item.icmp['type-name'];
  if (Object.keys(icmp).length) result.icmp = icmp;

  if (item.ipsec) result.ipsec = item.ipsec;

  const limit = {};
  if (item.limit?.burst !== undefined && item.limit.burst !== '' && item.limit.burst !== null) limit.burst = String(item.limit.burst);
  if (item.limit?.rate) limit.rate = item.limit.rate;
  if (Object.keys(limit).length) result.limit = limit;

  if (item.log) result.log = '';
  if (item.mark) result.mark = item.mark;
  if (item['packet-length']) result['packet-length'] = item['packet-length'];
  if (item['packet-length-exclude']) result['packet-length-exclude'] = item['packet-length-exclude'];
  if (item['packet-type']) result['packet-type'] = item['packet-type'];
  if (item.state?.length) result.state = item.state;

  const tcp = {};
  if (item.tcp?.flags?.length) {
    const flagsObj = {};
    for (const flag of item.tcp.flags) flagsObj[flag] = '';
    if (item.tcp.not) tcp.flags = { not: flagsObj };
    else tcp.flags = flagsObj;
  }
  if (item.tcp?.mss !== undefined && item.tcp.mss !== '' && item.tcp.mss !== null) tcp.mss = item.tcp.mss;
  if (Object.keys(tcp).length) result.tcp = tcp;

  const ttl = {};
  if (item.ttl?.eq !== undefined && item.ttl.eq !== '' && item.ttl.eq !== null) ttl.eq = String(item.ttl.eq);
  if (item.ttl?.gt !== undefined && item.ttl.gt !== '' && item.ttl.gt !== null) ttl.gt = String(item.ttl.gt);
  if (item.ttl?.lt !== undefined && item.ttl.lt !== '' && item.ttl.lt !== null) ttl.lt = String(item.ttl.lt);
  if (Object.keys(ttl).length) result.ttl = ttl;

  const recent = {};
  if (item.recent?.count !== undefined && item.recent.count !== '' && item.recent.count !== null) recent.count = String(item.recent.count);
  if (item.recent?.time !== undefined && item.recent.time !== '' && item.recent.time !== null) recent.time = String(item.recent.time);
  if (Object.keys(recent).length) result.recent = recent;

  const time = {};
  if (item.time?.monthdays) time.monthdays = item.time.monthdays;
  if (item.time?.startdate) time.startdate = item.time.startdate;
  if (item.time?.starttime) time.starttime = item.time.starttime;
  if (item.time?.stopdate) time.stopdate = item.time.stopdate;
  if (item.time?.stoptime) time.stoptime = item.time.stoptime;
  if (item.time?.utc) time.utc = '';
  if (item.time?.weekdays) time.weekdays = item.time.weekdays;
  if (Object.keys(time).length) result.time = time;

  const set = {};
  if (item.set?.['connection-mark'] !== undefined && item.set['connection-mark'] !== '' && item.set['connection-mark'] !== null) set['connection-mark'] = item.set['connection-mark'];
  if (item.set?.dscp !== undefined && item.set.dscp !== '' && item.set.dscp !== null) set.dscp = item.set.dscp;
  if (item.set?.mark !== undefined && item.set.mark !== '' && item.set.mark !== null) set.mark = item.set.mark;
  if (item.set?.table) set.table = item.set.table;
  if (item.set?.['tcp-mss'] !== undefined && item.set['tcp-mss'] !== '' && item.set['tcp-mss'] !== null) set['tcp-mss'] = item.set['tcp-mss'];
  if (Object.keys(set).length) result.set = set;

  return result;
}

function configRuleSetsToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  for (const [name, attrs] of Object.entries(raw)) {
    const iface = attrs.interface
      ? (Array.isArray(attrs.interface) ? attrs.interface.join(', ') : String(attrs.interface))
      : '';
    result.push({
      name,
      description: attrs.description || '',
      'default-log': !!attrs['default-log'],
      interface: iface,
      rules: configRulesToForm(attrs.rule),
    });
  }
  return result;
}

function formRuleSetsToConfig(list) {
  const result = {};
  for (const item of list) {
    const entry = {};
    if (item.description) entry.description = item.description;
    if (item['default-log']) entry['default-log'] = '';
    if (item.interface) entry.interface = item.interface;
    const rules = {};
    for (const r of item.rules || []) {
      const cfg = formRuleToConfig(r);
      if (Object.keys(cfg).length || r.rule) rules[r.rule] = cfg;
    }
    if (Object.keys(rules).length) entry.rule = rules;
    result[item.name] = entry;
  }
  return result;
}

function formatEndpoint(ep) {
  if (!ep || typeof ep !== 'object') return '';
  const parts = [];
  if (ep.address) parts.push(ep.address);
  if (ep['mac-address']) parts.push(`MAC:${ep['mac-address']}`);
  if (ep.port) parts.push(`:${ep.port}`);
  if (ep.group?.['address-group']) parts.push(`AG:${ep.group['address-group']}`);
  if (ep.group?.['domain-group']) parts.push(`DG:${ep.group['domain-group']}`);
  if (ep.group?.['mac-group']) parts.push(`MG:${ep.group['mac-group']}`);
  if (ep.group?.['network-group']) parts.push(`NG:${ep.group['network-group']}`);
  if (ep.group?.['port-group']) parts.push(`PG:${ep.group['port-group']}`);
  return parts.join('') || '';
}

export default defineComponent({
  name: 'PolicyRoutePage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const ruleSets = ref([]);
    const interfaces = ref([]);
    const loading = ref(false);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingRuleSet = ref(null);
    const editingRuleSetOriginalName = ref('');
    const ruleModalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleOriginalNumber = ref('');
    const ruleSetActiveTab = ref('basic');
    const ruleActiveTab = ref('basic');
    const ruleSelected = ref([]);
    const dataTableRef = ref(null);

    // Delete confirmation modals
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const ruleDeleteModalVisible = ref(false);
    const pendingDeleteRuleNumbers = ref([]);

    const path = computed(() => {
      const p = route.path.replace(/^\//, '').replace(/\//g, ' ');
      return p;
    });

    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    function resolveOptions(opts) {
      return opts.map(o => ({ ...o, label: t(o.labelKey) }));
    }

    const ruleSetColumns = computed(() => [
      { key: 'name', title: t('policyRoute.columns.ruleSetName') },
      { key: 'description', title: t('policyRoute.columns.description') },
      { key: 'interface', title: t('policyRoute.columns.interface') },
      { key: 'rule_count', title: t('policyRoute.columns.ruleCount') },
      { key: 'default-log', title: t('policyRoute.columns.defaultLog') },
    ]);

    const ruleColumns = computed(() => [
      { key: 'rule', title: t('policyRoute.columns.ruleNumber') },
      { key: 'description', title: t('policyRoute.columns.description') },
      { key: 'action', title: t('policyRoute.columns.action') },
      { key: 'protocol', title: t('policyRoute.columns.protocol') },
      { key: 'source', title: t('policyRoute.columns.source') },
      { key: 'destination', title: t('policyRoute.columns.destination') },
      { key: 'set_table', title: t('policyRoute.columns.routeTable') },
      { key: 'disable', title: t('policyRoute.columns.disable') },
    ]);

    const ruleSetSchema = computed(() => [
      { key: 'name', title: t('policyRoute.fields.name'), type: 'text', required: true },
      { key: 'description', title: t('policyRoute.fields.description'), type: 'text' },
      { key: 'default-log', title: t('policyRoute.fields.defaultLog'), type: 'checkbox', valueless: true },
      { key: 'interface', title: t('policyRoute.fields.interface'), type: 'select', options: [] },
    ]);

    const ruleSetSchemaWithInterfaces = computed(() => {
      const opts = interfaces.value.map(n => ({ value: n, label: n }));
      return ruleSetSchema.value.map(f => f.key === 'interface' ? { ...f, options: opts } : f);
    });

    const ruleTabs = computed(() => [
      { key: 'basic', title: t('policyRoute.tabs.basic') },
      { key: 'source', title: t('policyRoute.tabs.sourceDestination') },
      { key: 'set', title: t('policyRoute.tabs.set') },
      { key: 'advanced', title: t('policyRoute.tabs.advanced') },
    ]);

    const baseRuleSchema = computed(() => [
      { key: 'rule', title: t('policyRoute.fields.rule'), type: 'number', min: 1, max: 999999, required: true, help: t('policyRoute.help.ruleNumberRange') },
      { key: 'action', title: t('policyRoute.fields.action'), type: 'select', options: resolveOptions(ACTION_OPTIONS), required: true },
      { key: 'description', title: t('policyRoute.fields.description'), type: 'text' },
      { key: 'protocol', title: t('policyRoute.fields.protocol'), type: 'select', dynamic: true, default: 'all', help: t('policyRoute.help.protocolDefault') },
      { key: 'disable', title: t('policyRoute.fields.disable'), type: 'checkbox', valueless: true },
    ]);

    const sourceDestinationSchema = computed(() => [
      {
        key: 'source', title: t('policyRoute.fields.source'), type: 'group', children: [
          { key: 'address', title: t('policyRoute.fields.address'), type: 'text', validate: 'ip-segment', placeholder: t('policyRoute.placeholders.address'), help: t('policyRoute.help.addressExclude') },
          { key: 'mac-address', title: t('policyRoute.fields.macAddress'), type: 'text', validate: 'mac-exclude', placeholder: t('policyRoute.placeholders.macAddress'), help: t('policyRoute.help.macAddressExclude') },
          { key: 'port', title: t('policyRoute.fields.port'), type: 'port', placeholder: t('policyRoute.placeholders.port') },
          {
            key: 'group', title: t('policyRoute.fields.group'), type: 'group', children: [
              { key: 'address-group', title: t('policyRoute.fields.addressGroup'), type: 'select', dynamic: true },
              { key: 'domain-group', title: t('policyRoute.fields.domainGroup'), type: 'select', dynamic: true },
              { key: 'mac-group', title: t('policyRoute.fields.macGroup'), type: 'select', dynamic: true },
              { key: 'network-group', title: t('policyRoute.fields.networkGroup'), type: 'select', dynamic: true },
              { key: 'port-group', title: t('policyRoute.fields.portGroup'), type: 'select', dynamic: true },
            ],
          },
        ],
      },
      {
        key: 'destination', title: t('policyRoute.fields.destination'), type: 'group', children: [
          { key: 'address', title: t('policyRoute.fields.address'), type: 'text', validate: 'ip-segment', placeholder: t('policyRoute.placeholders.address'), help: t('policyRoute.help.addressExclude') },
          { key: 'port', title: t('policyRoute.fields.port'), type: 'port', placeholder: t('policyRoute.placeholders.port') },
          {
            key: 'group', title: t('policyRoute.fields.group'), type: 'group', children: [
              { key: 'address-group', title: t('policyRoute.fields.addressGroup'), type: 'select', dynamic: true },
              { key: 'domain-group', title: t('policyRoute.fields.domainGroup'), type: 'select', dynamic: true },
              { key: 'mac-group', title: t('policyRoute.fields.macGroup'), type: 'select', dynamic: true },
              { key: 'network-group', title: t('policyRoute.fields.networkGroup'), type: 'select', dynamic: true },
              { key: 'port-group', title: t('policyRoute.fields.portGroup'), type: 'select', dynamic: true },
            ],
          },
        ],
      },
      { key: 'inbound-interface', title: t('policyRoute.fields.inboundInterface'), type: 'select', options: [] },
      { key: 'outbound-interface', title: t('policyRoute.fields.outboundInterface'), type: 'select', options: [] },
    ]);

    const setSchema = computed(() => [
      {
        key: 'set', title: t('policyRoute.fields.set'), type: 'group', children: [
          { key: 'table', title: t('policyRoute.fields.table'), type: 'text', placeholder: t('policyRoute.placeholders.table'), help: t('policyRoute.help.tableHelp') },
          { key: 'connection-mark', title: t('policyRoute.fields.connectionMark'), type: 'number', min: 0, max: 2147483647, help: t('policyRoute.help.connectionMarkRange') },
          { key: 'mark', title: t('policyRoute.fields.mark'), type: 'number', min: 1, max: 2147483647, help: t('policyRoute.help.markRange') },
          { key: 'dscp', title: t('policyRoute.fields.dscp'), type: 'number', min: 0, max: 63, help: t('policyRoute.help.dscpRange') },
          { key: 'tcp-mss', title: t('policyRoute.fields.tcpMss'), type: 'number', min: 500, max: 1460, help: t('policyRoute.help.tcpMssRange') },
        ],
      },
    ]);

    const advancedSchema = computed(() => [
      { key: 'connection-mark', title: t('policyRoute.fields.connectionMark'), type: 'text', validate: 'number-exclude-range', min: 0, max: 2147483647, placeholder: t('policyRoute.placeholders.connectionMark'), help: t('policyRoute.help.connectionMarkExclude') },
      { key: 'dscp', title: t('policyRoute.fields.dscp'), type: 'text', validate: 'number-exclude-range', min: 0, max: 63, placeholder: t('policyRoute.placeholders.dscp'), help: t('policyRoute.help.dscpExcludeHelp') },
      { key: 'dscp-exclude', title: t('policyRoute.fields.dscpExclude'), type: 'text', validate: 'number-range', min: 0, max: 63, placeholder: t('policyRoute.placeholders.dscpExclude'), help: t('policyRoute.help.dscpExcludeHelp') },
      { key: 'fragment', title: t('policyRoute.fields.fragment'), type: 'select', options: resolveOptions(FRAGMENT_OPTIONS) },
      {
        key: 'icmp', title: t('policyRoute.fields.icmp'), type: 'group', children: [
          { key: 'code', title: t('policyRoute.fields.code'), type: 'number', min: 0, max: 255, help: t('policyRoute.help.icmpCodeRange') },
          { key: 'type', title: t('policyRoute.fields.type'), type: 'number', min: 0, max: 255, help: t('policyRoute.help.icmpTypeRange') },
          { key: 'type-name', title: t('policyRoute.fields.typeName'), type: 'text' },
        ],
        advanced: true,
      },
      { key: 'ipsec', title: t('policyRoute.fields.ipsec'), type: 'select', options: resolveOptions(IPSEC_OPTIONS) },
      {
        key: 'limit', title: t('policyRoute.fields.limit'), type: 'group', children: [
          { key: 'burst', title: t('policyRoute.fields.burst'), type: 'number', min: 0, max: 4294967295, help: t('policyRoute.help.burstRange') },
          { key: 'rate', title: t('policyRoute.fields.rate'), type: 'text', validate: 'rate-limit', placeholder: t('policyRoute.placeholders.rate'), help: t('policyRoute.help.rateFormat') },
        ],
        advanced: true,
      },
      { key: 'log', title: t('policyRoute.fields.log'), type: 'checkbox', valueless: true },
      { key: 'mark', title: t('policyRoute.fields.mark'), type: 'text', validate: 'number-exclude-range', min: 0, max: 2147483647, placeholder: t('policyRoute.placeholders.mark'), help: t('policyRoute.help.markExclude') },
      { key: 'packet-length', title: t('policyRoute.fields.packetLength'), type: 'text', validate: 'number-exclude-range', min: 1, max: 65535, placeholder: t('policyRoute.placeholders.packetLength'), help: t('policyRoute.help.packetLengthRange') },
      { key: 'packet-length-exclude', title: t('policyRoute.fields.packetLengthExclude'), type: 'text', validate: 'number-range', min: 1, max: 65535, placeholder: t('policyRoute.placeholders.packetLengthExclude'), help: t('policyRoute.help.packetLengthExcludeRange') },
      { key: 'packet-type', title: t('policyRoute.fields.packetType'), type: 'select', options: PACKET_TYPE_OPTIONS },
      { key: 'state', title: t('policyRoute.fields.state'), type: 'multi-select', options: STATE_OPTIONS },
      {
        key: 'recent', title: t('policyRoute.fields.recent'), type: 'group', children: [
          { key: 'count', title: t('policyRoute.fields.count'), type: 'number', min: 1, max: 255, help: t('policyRoute.help.recentCountRange') },
          { key: 'time', title: t('policyRoute.fields.time'), type: 'number', min: 0, max: 4294967295, help: t('policyRoute.help.recentTimeRange') },
        ],
        advanced: true,
      },
      {
        key: 'time', title: t('policyRoute.fields.time'), type: 'group', children: [
          { key: 'monthdays', title: t('policyRoute.fields.monthdays'), type: 'text', placeholder: t('policyRoute.placeholders.monthdays') },
          { key: 'startdate', title: t('policyRoute.fields.startdate'), type: 'text', placeholder: t('policyRoute.placeholders.startdate') },
          { key: 'starttime', title: t('policyRoute.fields.starttime'), type: 'text', placeholder: t('policyRoute.placeholders.starttime') },
          { key: 'stopdate', title: t('policyRoute.fields.stopdate'), type: 'text', placeholder: t('policyRoute.placeholders.stopdate') },
          { key: 'stoptime', title: t('policyRoute.fields.stoptime'), type: 'text', placeholder: t('policyRoute.placeholders.stoptime') },
          { key: 'utc', title: t('policyRoute.fields.utc'), type: 'checkbox', valueless: true },
          { key: 'weekdays', title: t('policyRoute.fields.weekdays'), type: 'text', placeholder: t('policyRoute.placeholders.weekdays') },
        ],
        advanced: true,
      },
      {
        key: 'tcp', title: t('policyRoute.fields.tcp'), type: 'group', children: [
          { key: 'flags', title: t('policyRoute.fields.flags'), type: 'multi-select', options: ['ack', 'cwr', 'ecn', 'fin', 'psh', 'rst', 'syn', 'urg'], help: t('policyRoute.help.flagsMultiSelect') },
          { key: 'not', title: t('policyRoute.fields.not'), type: 'checkbox', valueless: true },
          { key: 'mss', title: t('policyRoute.fields.mss'), type: 'text', validate: 'number-range', min: 1, max: 16384, placeholder: t('policyRoute.placeholders.mss'), help: t('policyRoute.help.mssRange') },
        ],
        advanced: true,
      },
      {
        key: 'ttl', title: t('policyRoute.fields.ttl'), type: 'group', children: [
          { key: 'eq', title: t('policyRoute.fields.eq'), type: 'number', min: 0, max: 255, help: t('policyRoute.help.ttlEqRange') },
          { key: 'gt', title: t('policyRoute.fields.gt'), type: 'number', min: 0, max: 255, help: t('policyRoute.help.ttlGtRange') },
          { key: 'lt', title: t('policyRoute.fields.lt'), type: 'number', min: 0, max: 255, help: t('policyRoute.help.ttlLtRange') },
        ],
        advanced: true,
      },
    ]);

    function buildTabSchemas() {
      return {
        basic: baseRuleSchema.value,
        source: sourceDestinationSchema.value.map(f => f.key === 'inbound-interface' || f.key === 'outbound-interface' ? { ...f, options: interfaces.value } : f),
        set: setSchema.value,
        advanced: advancedSchema.value,
      };
    }

    const tabSchemas = computed(() => buildTabSchemas());

    const ruleSuggestionPath = computed(() => {
      return `policy route ${editingRuleSet.value?.name || ''}`;
    });

    const tableData = computed(() => {
      return ruleSets.value.map(r => ({
        ...r,
        'rule_count': r.rules?.length || 0,
        'default-log': r['default-log'] ? t('policyRoute.options.yes') : '',
        interface: r.interface || '',
      }));
    });

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name || i).filter(Boolean);
      } catch (e) {
        interfaces.value = [];
      }
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        ruleSets.value = configRuleSetsToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
    });
    watch(() => route.path, () => { load(); loadInterfaces(); ruleSelected.value = []; });

    function createRuleSet() {
      editingRuleSet.value = { name: '', description: '', 'default-log': false, interface: '', rules: [] };
      editingRuleSetOriginalName.value = '';
      modalVisible.value = true;
    }

    function editRuleSet() {
      if (!selected.value.length) return showError({ message: t('policyRoute.messages.selectRow') });
      const row = ruleSets.value.find(r => r.name === selected.value[0]);
      if (!row) return;
      editingRuleSet.value = JSON.parse(JSON.stringify(row));
      editingRuleSetOriginalName.value = row.name;
      modalVisible.value = true;
    }

    function removeRuleSet() {
      if (!selected.value.length) return showError({ message: t('policyRoute.messages.selectRow') });
      pendingDeleteNames.value = [...selected.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveRuleSet() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function saveRuleSet() {
      const name = editingRuleSet.value?.name;
      if (!name) return showError({ message: t('policyRoute.messages.enterRuleSetName') });
      const original = editingRuleSetOriginalName.value;
      const value = {};
      if (editingRuleSet.value.description) value.description = editingRuleSet.value.description;
      if (editingRuleSet.value['default-log']) value['default-log'] = '';
      if (editingRuleSet.value.interface?.length) value.interface = editingRuleSet.value.interface;
      try {
        if (original && original !== name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} ${name}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function createRule() {
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!ruleSelected.value.length) return showError({ message: t('policyRoute.messages.selectRule') });
      const row = editingRuleSet.value.rules.find(r => String(r.rule) === String(ruleSelected.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function removeRule() {
      if (!ruleSelected.value.length) return showError({ message: t('policyRoute.messages.selectRule') });
      pendingDeleteRuleNumbers.value = [...ruleSelected.value];
      ruleDeleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      ruleDeleteModalVisible.value = false;
      const setName = editingRuleSet.value.name;
      for (const num of pendingDeleteRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${setName} rule ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      ruleSelected.value = [];
      pendingDeleteRuleNumbers.value = [];
      editingRuleSet.value.rules = configRulesToForm((await configStore.getConfig(`${path.value} ${setName} rule`, true)).data || {});
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return t('policyRoute.validation.enterRuleNumber');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 999999) return t('policyRoute.validation.ruleNumberRange');
      if (!r.action) return t('policyRoute.validation.selectAction');
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      const setName = editingRuleSet.value.name;
      const original = editingRuleOriginalNumber.value;
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${setName} rule ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} ${setName} rule ${editingRule.value.rule}`, value);
        configStore.markPending();
        ruleModalVisible.value = false;
        await configStore.checkSessionChanged();
        editingRuleSet.value.rules = configRulesToForm((await configStore.getConfig(`${path.value} ${setName} rule`, true)).data || {});
        await load();
      } catch (e) {
        showError(e);
      }
    }

    const commandText = computed(() => {
      const cfg = formRuleSetsToConfig(ruleSets.value);
      if (!Object.keys(cfg).length) return '';
      return `set ${path.value}\n` + JSON.stringify(cfg, null, 2);
    });

    return {t,
      
      ruleSets, tableData, loading, selected, modalVisible, editingRuleSet,
      ruleModalVisible, editingRule, ruleSetActiveTab, ruleActiveTab, dataTableRef, ruleSetColumns, ruleColumns,
      ruleSetSchemaWithInterfaces, tabSchemas, ruleTabs, ruleSelected, writeDisabled, commandText, ruleSuggestionPath,
      load, createRuleSet, editRuleSet, removeRuleSet, confirmRemoveRuleSet, saveRuleSet,
      createRule, editRule, removeRule, confirmRemoveRule, saveRule,
      formatEndpoint,
      deleteModalVisible, pendingDeleteNames, ruleDeleteModalVisible, pendingDeleteRuleNumbers,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="createRuleSet" :disabled="writeDisabled">{{ t('policyRoute.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRuleSet" :disabled="writeDisabled || !selected.length || selected.length > 1">{{ t('policyRoute.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRuleSet" :disabled="writeDisabled || !selected.length">{{ t('policyRoute.buttons.delete') }}</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">{{ t('policyRoute.buttons.refresh') }}</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :columns="ruleSetColumns" :data="tableData" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" row-key="name">
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingRuleSet?.name ? t('policyRoute.modals.editRuleSet') : t('policyRoute.modals.createRuleSet')" width="780px" @confirm="saveRuleSet">
        <TabGroup v-model="ruleSetActiveTab" :tabs="[{key:'basic',title:t('policyRoute.tabs.basic')},{key:'rules',title:t('policyRoute.tabs.rules')}]">
          <template #basic>
            <ConfigForm v-model="editingRuleSet" :schema="ruleSetSchemaWithInterfaces" :disabled="writeDisabled" />
          </template>
          <template #rules>
            <div style="padding:8px 0;">
              <div class="toolbar toolbar-compact">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled">{{ t('policyRoute.buttons.createRule') }}</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !ruleSelected.length || ruleSelected.length > 1">{{ t('policyRoute.buttons.edit') }}</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !ruleSelected.length">{{ t('policyRoute.buttons.delete') }}</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="ruleColumns" :data="editingRuleSet?.rules || []" :disabled="writeDisabled"
                         @selection-change="ruleSelected = $event" :selectable="true" :externalToolbar="true" row-key="rule">
                <template #source="{ row }">{{ formatEndpoint(row.source) }}</template>
                <template #destination="{ row }">{{ formatEndpoint(row.destination) }}</template>
                <template #set_table="{ row }">{{ row.set?.table }}</template>
                <template #disable="{ row }">{{ row.disable ? t('policyRoute.options.yes') : '' }}</template>
              </DataTable>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRule?.rule ? t('policyRoute.modals.editRule') : t('policyRoute.modals.createRule')" width="820px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" :suggestionPath="ruleSuggestionPath" />
          </template>
          <template #source>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :disabled="writeDisabled" :showAdvanced="true" :suggestionPath="ruleSuggestionPath" />
          </template>
          <template #set>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.set" :disabled="writeDisabled" :showAdvanced="true" :suggestionPath="ruleSuggestionPath" />
          </template>
          <template #advanced>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.advanced" :disabled="writeDisabled" :showAdvanced="true" :suggestionPath="ruleSuggestionPath" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('policyRoute.modals.confirmDelete')" width="400px" @confirm="confirmRemoveRuleSet">
        <div>{{ t('policyRoute.messages.confirmDeleteRuleSet') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleDeleteModalVisible" :title="t('policyRoute.modals.confirmDelete')" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('policyRoute.messages.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteRuleNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
