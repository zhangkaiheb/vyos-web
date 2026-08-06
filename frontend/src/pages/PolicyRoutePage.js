import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { interfaceApi, configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const ACTION_OPTIONS = [
  { value: 'accept', label: '接受 (accept)' },
  { value: 'reject', label: '拒绝 (reject)' },
  { value: 'return', label: '返回 (return)' },
  { value: 'drop', label: '丢弃 (drop)' },
];

const FRAGMENT_OPTIONS = [
  { value: 'match-frag', label: '匹配分片 (match-frag)' },
  { value: 'match-non-frag', label: '匹配非分片 (match-non-frag)' },
];

const IPSEC_OPTIONS = [
  { value: 'match-ipsec', label: '匹配 IPsec (match-ipsec)' },
  { value: 'match-none', label: '匹配非 IPsec (match-none)' },
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
    const dataTableRef = ref(null);

    const path = computed(() => {
      const p = route.path.replace(/^\//, '').replace(/\//g, ' ');
      return p;
    });

    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const ruleSetColumns = [
      { key: 'name', title: '规则集名称' },
      { key: 'description', title: '描述' },
      { key: 'interface', title: '接口' },
      { key: 'rule_count', title: '规则数' },
      { key: 'default-log', title: '默认日志' },
    ];

    const ruleColumns = [
      { key: 'rule', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'action', title: '动作' },
      { key: 'protocol', title: '协议' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'set_table', title: '路由表' },
      { key: 'disable', title: '禁用' },
    ];

    const ruleSetSchema = [
      { key: 'name', title: '规则集名称', type: 'text', required: true },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'default-log', title: '默认动作日志', type: 'checkbox', valueless: true },
      { key: 'interface', title: '接口', type: 'select', options: [] },
    ];

    const ruleSetSchemaWithInterfaces = computed(() => {
      const opts = interfaces.value.map(n => ({ value: n, label: n }));
      return ruleSetSchema.map(f => f.key === 'interface' ? { ...f, options: opts } : f);
    });

    const ruleTabs = [
      { key: 'basic', title: '基本' },
      { key: 'source', title: '源/目的' },
      { key: 'set', title: '设置' },
      { key: 'advanced', title: '高级' },
    ];

    const baseRuleSchema = [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围 1-999999' },
      { key: 'action', title: '动作', type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'protocol', title: '协议', type: 'select', dynamic: true, default: 'all', help: '默认 all，从系统实时获取协议列表' },
      { key: 'disable', title: '禁用', type: 'checkbox', valueless: true },
    ];

    const sourceDestinationSchema = [
      {
        key: 'source', title: '源', type: 'group', children: [
          { key: 'address', title: '地址', type: 'text', validate: 'ip-segment', placeholder: 'IP/CIDR/范围，可 ! 排除', help: '可前缀 ! 排除' },
          { key: 'mac-address', title: 'MAC 地址', type: 'text', validate: 'mac-exclude', placeholder: 'aa:bb:cc:dd:ee:ff 或 !aa:bb:cc:dd:ee:ff', help: '可前缀 ! 表示排除' },
          { key: 'port', title: '端口', type: 'port', placeholder: '端口、范围或逗号分隔' },
          {
            key: 'group', title: '组', type: 'group', children: [
              { key: 'address-group', title: '地址组', type: 'text' },
              { key: 'domain-group', title: '域名组', type: 'text' },
              { key: 'mac-group', title: 'MAC组', type: 'text' },
              { key: 'network-group', title: '网络组', type: 'text' },
              { key: 'port-group', title: '端口组', type: 'text' },
            ],
          },
        ],
      },
      {
        key: 'destination', title: '目的', type: 'group', children: [
          { key: 'address', title: '地址', type: 'text', validate: 'ip-segment', placeholder: 'IP/CIDR/范围，可 ! 排除', help: '可前缀 ! 排除' },
          { key: 'port', title: '端口', type: 'port', placeholder: '端口、范围或逗号分隔' },
          {
            key: 'group', title: '组', type: 'group', children: [
              { key: 'address-group', title: '地址组', type: 'text' },
              { key: 'domain-group', title: '域名组', type: 'text' },
              { key: 'mac-group', title: 'MAC组', type: 'text' },
              { key: 'network-group', title: '网络组', type: 'text' },
              { key: 'port-group', title: '端口组', type: 'text' },
            ],
          },
        ],
      },
      { key: 'inbound-interface', title: '入接口', type: 'select', options: [] },
      { key: 'outbound-interface', title: '出接口', type: 'select', options: [] },
    ];

    const setSchema = [
      {
        key: 'set', title: '设置', type: 'group', children: [
          { key: 'table', title: '路由表', type: 'text', placeholder: '1-200 或 main', help: '1-200 或 main' },
          { key: 'connection-mark', title: '连接标记', type: 'number', min: 0, max: 2147483647, help: '范围 0-2147483647' },
          { key: 'mark', title: '防火墙标记', type: 'number', min: 1, max: 2147483647, help: '范围 1-2147483647' },
          { key: 'dscp', title: 'DSCP', type: 'number', min: 0, max: 63, help: '范围 0-63' },
          { key: 'tcp-mss', title: 'TCP MSS', type: 'number', min: 500, max: 1460, help: '范围 500-1460' },
        ],
      },
    ];

    const advancedSchema = [
      { key: 'connection-mark', title: '连接标记', type: 'text', validate: 'number-exclude-range', min: 0, max: 2147483647, placeholder: '0-2147483647，可 ! 排除', help: '范围 0-2147483647，可前缀 ! 排除' },
      { key: 'dscp', title: 'DSCP', type: 'text', validate: 'number-exclude-range', min: 0, max: 63, placeholder: '0-63，可 ! 排除', help: '范围 0-63，可前缀 ! 排除' },
      { key: 'dscp-exclude', title: '排除 DSCP', type: 'text', validate: 'number-range', min: 0, max: 63, placeholder: '0-63', help: '范围 0-63' },
      { key: 'fragment', title: '分片', type: 'select', options: FRAGMENT_OPTIONS },
      {
        key: 'icmp', title: 'ICMP', type: 'group', children: [
          { key: 'code', title: '代码', type: 'number', min: 0, max: 255, help: '范围 0-255' },
          { key: 'type', title: '类型', type: 'number', min: 0, max: 255, help: '范围 0-255' },
          { key: 'type-name', title: '类型名称', type: 'text' },
        ],
        advanced: true,
      },
      { key: 'ipsec', title: 'IPsec', type: 'select', options: IPSEC_OPTIONS },
      {
        key: 'limit', title: '限速', type: 'group', children: [
          { key: 'burst', title: '突发', type: 'number', min: 0, max: 4294967295, help: '范围 0-4294967295' },
          { key: 'rate', title: '速率', type: 'text', validate: 'rate-limit', placeholder: '如 5/minute', help: '格式：数字/second|minute|hour|day' },
        ],
        advanced: true,
      },
      { key: 'log', title: '日志', type: 'checkbox', valueless: true },
      { key: 'mark', title: '防火墙标记', type: 'text', validate: 'number-exclude-range', min: 0, max: 2147483647, placeholder: '0-2147483647，可 ! 排除', help: '范围 0-2147483647，可前缀 ! 排除' },
      { key: 'packet-length', title: '包长度', type: 'text', validate: 'number-exclude-range', min: 1, max: 65535, placeholder: '1-65535 或范围', help: '范围 1-65535，可前缀 ! 排除' },
      { key: 'packet-length-exclude', title: '排除包长度', type: 'text', validate: 'number-range', min: 1, max: 65535, placeholder: '1-65535 或范围', help: '范围 1-65535' },
      { key: 'packet-type', title: '包类型', type: 'select', options: PACKET_TYPE_OPTIONS },
      { key: 'state', title: '会话状态', type: 'multi-select', options: STATE_OPTIONS },
      {
        key: 'recent', title: 'Recent', type: 'group', children: [
          { key: 'count', title: '次数', type: 'number', min: 1, max: 255, help: '范围 1-255' },
          { key: 'time', title: '时间', type: 'number', min: 0, max: 4294967295, help: '范围 0-4294967295（秒）' },
        ],
        advanced: true,
      },
      {
        key: 'time', title: '时间', type: 'group', children: [
          { key: 'monthdays', title: '日期', type: 'text', placeholder: '如 1-15' },
          { key: 'startdate', title: '开始日期', type: 'text', placeholder: 'YYYY-MM-DD' },
          { key: 'starttime', title: '开始时间', type: 'text', placeholder: 'HH:MM:SS' },
          { key: 'stopdate', title: '结束日期', type: 'text', placeholder: 'YYYY-MM-DD' },
          { key: 'stoptime', title: '结束时间', type: 'text', placeholder: 'HH:MM:SS' },
          { key: 'utc', title: 'UTC', type: 'checkbox', valueless: true },
          { key: 'weekdays', title: '星期', type: 'text', placeholder: '如 Mon,Tue' },
        ],
        advanced: true,
      },
      {
        key: 'tcp', title: 'TCP', type: 'group', children: [
          { key: 'flags', title: '标志', type: 'multi-select', options: ['ack', 'cwr', 'ecn', 'fin', 'psh', 'rst', 'syn', 'urg'], help: '可多选' },
          { key: 'not', title: '匹配未设置的标志', type: 'checkbox', valueless: true },
          { key: 'mss', title: 'MSS', type: 'text', validate: 'number-range', min: 1, max: 16384, placeholder: '1-16384 或范围', help: '范围 1-16384' },
        ],
        advanced: true,
      },
      {
        key: 'ttl', title: 'TTL', type: 'group', children: [
          { key: 'eq', title: '等于', type: 'number', min: 0, max: 255, help: '范围 0-255' },
          { key: 'gt', title: '大于', type: 'number', min: 0, max: 255, help: '范围 0-255' },
          { key: 'lt', title: '小于', type: 'number', min: 0, max: 255, help: '范围 0-255' },
        ],
        advanced: true,
      },
    ];

    function buildTabSchemas() {
      return {
        basic: baseRuleSchema,
        source: sourceDestinationSchema.map(f => f.key === 'inbound-interface' || f.key === 'outbound-interface' ? { ...f, options: interfaces.value } : f),
        set: setSchema,
        advanced: advancedSchema,
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
        'default-log': r['default-log'] ? '是' : '',
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
    });
    watch(() => route.path, () => { load(); loadInterfaces(); });

    function createRuleSet() {
      editingRuleSet.value = { name: '', description: '', 'default-log': false, interface: '', rules: [] };
      editingRuleSetOriginalName.value = '';
      modalVisible.value = true;
    }

    function editRuleSet() {
      if (!selected.value.length) return alert('请选择一行');
      const row = ruleSets.value.find(r => r.name === selected.value[0]);
      if (!row) return;
      editingRuleSet.value = JSON.parse(JSON.stringify(row));
      editingRuleSetOriginalName.value = row.name;
      modalVisible.value = true;
    }

    async function removeRuleSet() {
      if (!selected.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的规则集？')) return;
      for (const name of selected.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      await load();
    }

    async function saveRuleSet() {
      const name = editingRuleSet.value?.name;
      if (!name) return alert('请输入规则集名称');
      const original = editingRuleSetOriginalName.value;
      const value = {};
      if (editingRuleSet.value.description) value.description = editingRuleSet.value.description;
      if (editingRuleSet.value['default-log']) value['default-log'] = '';
      if (editingRuleSet.value.interface?.length) value.interface = editingRuleSet.value.interface;
      try {
        if (original && original !== name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
        }
        await configStore.setConfig(`${path.value} ${name}`, value);
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    const ruleSelected = ref([]);

    function createRule() {
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!ruleSelected.value.length) return alert('请选择一条规则');
      const row = editingRuleSet.value.rules.find(r => String(r.rule) === String(ruleSelected.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!ruleSelected.value.length) return alert('请选择一条规则');
      if (!confirm('确认删除选中的规则？')) return;
      const setName = editingRuleSet.value.name;
      for (const num of ruleSelected.value) {
        await configStore.deleteConfig(`${path.value} ${setName} rule ${num}`);
      }
      await configStore.checkSessionChanged();
      ruleSelected.value = [];
      editingRuleSet.value.rules = configRulesToForm((await configStore.getConfig(`${path.value} ${setName} rule`, true)).data || {});
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return '请输入规则编号';
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 999999) return '规则编号范围 1-999999';
      if (!r.action) return '请选择动作';
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return alert(err);
      const setName = editingRuleSet.value.name;
      const original = editingRuleOriginalNumber.value;
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${setName} rule ${original}`);
        }
        await configStore.setConfig(`${path.value} ${setName} rule ${editingRule.value.rule}`, value);
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

    return {
      ruleSets, tableData, loading, selected, modalVisible, editingRuleSet,
      ruleModalVisible, editingRule, ruleSetActiveTab, ruleActiveTab, dataTableRef, ruleSetColumns, ruleColumns,
      ruleSetSchemaWithInterfaces, tabSchemas, ruleTabs, ruleSelected, writeDisabled, commandText, ruleSuggestionPath,
      load, createRuleSet, editRuleSet, removeRuleSet, saveRuleSet,
      createRule, editRule, removeRule, saveRule,
      formatEndpoint,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="createRuleSet" :disabled="writeDisabled">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRuleSet" :disabled="writeDisabled || !selected.length || selected.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRuleSet" :disabled="writeDisabled || !selected.length">删除</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :columns="ruleSetColumns" :data="tableData" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" row-key="name">
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingRuleSet?.name ? '编辑规则集' : '创建规则集'" width="780px" @confirm="saveRuleSet">
        <TabGroup v-model="ruleSetActiveTab" :tabs="[{key:'basic',title:'基本'},{key:'rules',title:'规则'}]">
          <template #basic>
            <ConfigForm v-model="editingRuleSet" :schema="ruleSetSchemaWithInterfaces" :disabled="writeDisabled" />
          </template>
          <template #rules>
            <div style="padding:8px 0;">
              <div class="toolbar toolbar-compact">
                <div class="toolbar-left">
                  <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled">创建规则</ToolbarButton>
                  <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !ruleSelected.length || ruleSelected.length > 1">编辑</ToolbarButton>
                  <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !ruleSelected.length">删除</ToolbarButton>
                </div>
              </div>
              <DataTable :columns="ruleColumns" :data="editingRuleSet?.rules || []" :disabled="writeDisabled"
                         @selection-change="ruleSelected = $event" :selectable="true" :externalToolbar="true" row-key="rule">
                <template #source="{ row }">{{ formatEndpoint(row.source) }}</template>
                <template #destination="{ row }">{{ formatEndpoint(row.destination) }}</template>
                <template #set_table="{ row }">{{ row.set?.table }}</template>
                <template #disable="{ row }">{{ row.disable ? '是' : '' }}</template>
              </DataTable>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRule?.rule ? '编辑规则' : '创建规则'" width="820px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" :suggestionPath="ruleSuggestionPath" />
          </template>
          <template #source>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #set>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.set" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #advanced>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.advanced" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
