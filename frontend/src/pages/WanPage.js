import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const TEST_TYPE_OPTIONS = [
  { value: 'ping', label: 'ping (ICMP echo)' },
  { value: 'ttl', label: 'ttl (UDP TTL expired)' },
  { value: 'user-defined', label: 'user-defined (自定义脚本)' },
];

const PROTOCOL_OPTIONS = [
  { value: 'all', label: 'all (所有协议)' },
  { value: 'tcp_udp', label: 'tcp_udp (TCP和UDP)' },
  { value: 'tcp', label: 'tcp' },
  { value: 'udp', label: 'udp' },
  { value: 'icmp', label: 'icmp' },
  { value: 'gre', label: 'gre' },
  { value: 'esp', label: 'esp' },
  { value: 'ah', label: 'ah' },
  { value: 'custom', label: '自定义 (输入协议编号)' },
];

const BALANCE_OPTIONS = [
  { value: 'flow', label: 'flow (按流)' },
  { value: 'per-packet-balancing', label: 'per-packet (按包)' },
];

function emptyHealth() {
  return {
    interface: '',
    'failure-count': 1,
    'success-count': 1,
    nexthop: '',
    test: {
      'resp-time': 5,
      target: '',
      'test-script': '',
      'ttl-limit': 1,
      type: 'ping',
    },
  };
}

function emptyRule() {
  return {
    rule: '',
    description: '',
    'inbound-interface': '',
    interface: [],
    protocol: 'all',
    protocolNumber: '',
    exclude: false,
    failover: false,
    'per-packet-balancing': false,
    limit: { burst: '', rate: '' },
    destination: { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'network-group': '', 'port-group': '' } },
    source: { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'network-group': '', 'port-group': '' } },
  };
}

function parseHealth(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const result = [];
  for (const [iface, attrs] of Object.entries(raw)) {
    const h = {
      interface: iface,
      'failure-count': attrs['failure-count'] || 1,
      'success-count': attrs['success-count'] || 1,
      nexthop: '',
      test: { 'resp-time': 5, target: '', 'test-script': '', 'ttl-limit': 1, type: 'ping' },
    };
    if (attrs.nexthop) {
      h.nexthop = typeof attrs.nexthop === 'string' ? attrs.nexthop : 'dhcp';
    }
    if (attrs.test) {
      h.test = {
        'resp-time': attrs.test['resp-time'] || 5,
        target: attrs.test.target || '',
        'test-script': attrs.test['test-script'] || '',
        'ttl-limit': attrs.test['ttl-limit'] || 1,
        type: attrs.test.type || 'ping',
      };
    }
    result.push(h);
  }
  return result;
}

function parseRules(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const result = [];
  for (const [num, attrs] of Object.entries(raw)) {
    const r = {
      rule: num,
      description: attrs.description || '',
      'inbound-interface': attrs['inbound-interface'] || '',
      interface: [],
      protocol: attrs.protocol || 'all',
      protocolNumber: '',
      exclude: !!attrs.exclude,
      failover: !!attrs.failover,
      'per-packet-balancing': !!attrs['per-packet-balancing'],
      limit: { burst: '', rate: '' },
      destination: { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'network-group': '', 'port-group': '' } },
      source: { address: '', port: '', group: { 'address-group': '', 'domain-group': '', 'network-group': '', 'port-group': '' } },
    };
    if (attrs.interface) {
      if (typeof attrs.interface === 'string') {
        r.interface = [attrs.interface];
      } else if (Array.isArray(attrs.interface)) {
        r.interface = attrs.interface;
      } else {
        r.interface = Object.keys(attrs.interface);
      }
    }
    if (attrs.protocol && !isNaN(attrs.protocol) && Number(attrs.protocol) >= 0 && Number(attrs.protocol) <= 255) {
      r.protocol = 'custom';
      r.protocolNumber = String(attrs.protocol);
    }
    if (attrs.limit) {
      r.limit = {
        burst: attrs.limit.burst || '',
        rate: attrs.limit.rate || '',
      };
    }
    if (attrs.destination) {
      r.destination.address = attrs.destination.address || '';
      r.destination.port = attrs.destination.port || '';
      if (attrs.destination.group) {
        r.destination.group['address-group'] = attrs.destination.group['address-group'] || '';
        r.destination.group['domain-group'] = attrs.destination.group['domain-group'] || '';
        r.destination.group['network-group'] = attrs.destination.group['network-group'] || '';
        r.destination.group['port-group'] = attrs.destination.group['port-group'] || '';
      }
    }
    if (attrs.source) {
      r.source.address = attrs.source.address || '';
      r.source.port = attrs.source.port || '';
      if (attrs.source.group) {
        r.source.group['address-group'] = attrs.source.group['address-group'] || '';
        r.source.group['domain-group'] = attrs.source.group['domain-group'] || '';
        r.source.group['network-group'] = attrs.source.group['network-group'] || '';
        r.source.group['port-group'] = attrs.source.group['port-group'] || '';
      }
    }
    result.push(r);
  }
  return result;
}

function healthToCommands(h) {
  const cmds = [];
  const base = `set load-balancing wan interface-health ${h.interface}`;
  cmds.push(`${base} failure-count ${h['failure-count']}`);
  cmds.push(`${base} success-count ${h['success-count']}`);
  if (h.nexthop) {
    cmds.push(`${base} nexthop ${h.nexthop}`);
  }
  if (h.test) {
    const t = h.test;
    if (t['resp-time'] && t['resp-time'] !== 5) cmds.push(`${base} test resp-time ${t['resp-time']}`);
    if (t.target) cmds.push(`${base} test target ${t.target}`);
    if (t['test-script']) cmds.push(`${base} test test-script ${t['test-script']}`);
    if (t['ttl-limit'] && t['ttl-limit'] !== 1) cmds.push(`${base} test ttl-limit ${t['ttl-limit']}`);
    if (t.type && t.type !== 'ping') cmds.push(`${base} test type ${t.type}`);
  }
  return cmds;
}

function ruleToCommands(r) {
  const cmds = [];
  const base = `set load-balancing wan rule ${r.rule}`;
  if (r.description) cmds.push(`${base} description ${r.description}`);
  if (r['inbound-interface']) cmds.push(`${base} inbound-interface ${r['inbound-interface']}`);
  for (const iface of r.interface) {
    cmds.push(`${base} interface ${iface}`);
  }
  if (r.protocol === 'custom' && r.protocolNumber) {
    cmds.push(`${base} protocol ${r.protocolNumber}`);
  } else if (r.protocol && r.protocol !== 'all') {
    cmds.push(`${base} protocol ${r.protocol}`);
  }
  if (r.exclude) cmds.push(`${base} exclude`);
  if (r.failover) cmds.push(`${base} failover`);
  if (r['per-packet-balancing']) cmds.push(`${base} per-packet-balancing`);
  if (r.limit.burst || r.limit.rate) {
    if (r.limit.burst) cmds.push(`${base} limit burst ${r.limit.burst}`);
    if (r.limit.rate) cmds.push(`${base} limit rate ${r.limit.rate}`);
  }
  if (r.destination.address) cmds.push(`${base} destination address ${r.destination.address}`);
  if (r.destination.port) cmds.push(`${base} destination port ${r.destination.port}`);
  if (r.destination.group['address-group']) cmds.push(`${base} destination group address-group ${r.destination.group['address-group']}`);
  if (r.destination.group['domain-group']) cmds.push(`${base} destination group domain-group ${r.destination.group['domain-group']}`);
  if (r.destination.group['network-group']) cmds.push(`${base} destination group network-group ${r.destination.group['network-group']}`);
  if (r.destination.group['port-group']) cmds.push(`${base} destination group port-group ${r.destination.group['port-group']}`);
  if (r.source.address) cmds.push(`${base} source address ${r.source.address}`);
  if (r.source.port) cmds.push(`${base} source port ${r.source.port}`);
  if (r.source.group['address-group']) cmds.push(`${base} source group address-group ${r.source.group['address-group']}`);
  if (r.source.group['domain-group']) cmds.push(`${base} source group domain-group ${r.source.group['domain-group']}`);
  if (r.source.group['network-group']) cmds.push(`${base} source group network-group ${r.source.group['network-group']}`);
  if (r.source.group['port-group']) cmds.push(`${base} source group port-group ${r.source.group['port-group']}`);
  return cmds;
}

function globalToCommands(g) {
  const cmds = [];
  if (g['disable-source-nat']) cmds.push('set load-balancing wan disable-source-nat');
  if (g['enable-local-traffic']) cmds.push('set load-balancing wan enable-local-traffic');
  if (g['flush-connections']) cmds.push('set load-balancing wan flush-connections');
  if (g.hook) cmds.push(`set load-balancing wan hook ${g.hook}`);
  if (g['sticky-inbound']) cmds.push('set load-balancing wan sticky-connections inbound');
  return cmds;
}

export default defineComponent({
  name: 'WanPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const loading = ref(false);
    const globalConfig = ref({
      'disable-source-nat': false,
      'enable-local-traffic': false,
      'flush-connections': false,
      hook: '',
      'sticky-inbound': false,
    });
    const healthList = ref([]);
    const ruleList = ref([]);
    const showHealthModal = ref(false);
    const showRuleModal = ref(false);
    const editingHealth = ref(null);
    const editingRule = ref(null);
    const activeTab = ref('global');
    const activeRuleTab = ref('basic');
    const interfaces = ref([]);

    const globalSchema = computed(() => [
      { key: 'disable-source-nat', title: '禁用源 NAT', type: 'checkbox', help: '禁止为WAN负载均衡配置源NAT规则' },
      { key: 'enable-local-traffic', title: '启用本地流量', type: 'checkbox', help: '为本地发起的流量启用WAN负载均衡' },
      { key: 'flush-connections', title: '刷新连接跟踪', type: 'checkbox', help: '连接状态变化时刷新连接跟踪表' },
      { key: 'hook', title: '状态变更脚本', type: 'text', help: '接口状态变化时执行的脚本路径 (/config/scripts)', placeholder: '如: wlb-hook.sh' },
      { key: 'sticky-inbound', title: '粘性连接(入方向)', type: 'checkbox', help: '启用粘性入方向WAN连接' },
    ]);

    const healthSchema = computed(() => [
      { key: 'interface', title: '接口名称', type: 'select', options: interfaces.value, required: true, placeholder: '选择接口', help: '要监控健康状态的接口' },
      { key: 'nexthop', title: '下一跳地址', type: 'text', required: true, placeholder: 'IPv4 地址或 dhcp', help: '出方向接口的下一跳地址，可设为 dhcp 或 IPv4 地址' },
      { key: 'failure-count', title: '失败次数', type: 'number', min: 1, max: 10, default: 1, help: '连续失败多少次判定为不可用 (默认: 1)' },
      { key: 'success-count', title: '成功次数', type: 'number', min: 1, max: 10, default: 1, help: '连续成功多少次判定为可用 (默认: 1)' },
    ]);

    const testSchema = computed(() => [
      { key: 'type', title: '测试类型', type: 'select', options: TEST_TYPE_OPTIONS, default: 'ping', help: 'WLB 测试类型 (默认: ping)' },
      { key: 'target', title: '测试目标地址', type: 'text', placeholder: 'IPv4 地址', help: '健康检查目标地址' },
      { key: 'resp-time', title: '响应超时时间', type: 'number', min: 1, max: 30, default: 5, help: 'Ping 响应超时时间(秒) (默认: 5)' },
      { key: 'ttl-limit', title: 'TTL 限制', type: 'number', min: 1, max: 254, default: 1, help: 'TTL 限制(跳数) (默认: 1)' },
      { key: 'test-script', title: '自定义脚本', type: 'text', placeholder: '脚本名', help: '/config/scripts 中的用户自定义脚本路径' },
    ]);

    const ruleBasicSchema = computed(() => [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 9999, required: true, help: '规则编号 (1-9999)' },
      { key: 'description', title: '描述', type: 'text', placeholder: '规则描述' },
      { key: 'inbound-interface', title: '入方向接口', type: 'select', options: ['any', ...interfaces.value], required: true, help: '入方向接口名称 (必填)' },
      { key: 'interface', title: '出方向接口', type: 'multi-select', options: interfaces.value, required: true, help: '出方向接口列表 (必填，可多选)' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS, default: 'all', help: '匹配的协议 (默认: all)' },
      { key: 'protocolNumber', title: '协议编号', type: 'number', min: 0, max: 255, placeholder: '0-255', help: 'IP 协议编号 (0-255)，选择自定义协议时使用' },
      { key: 'exclude', title: '排除', type: 'checkbox', help: '排除匹配此规则的数据包，不进行 WAN 负载均衡' },
      { key: 'failover', title: '故障转移', type: 'checkbox', help: '为匹配此规则的数据包启用故障转移' },
      { key: 'per-packet-balancing', title: '按包负载均衡', type: 'checkbox', help: '按包而非按流进行负载均衡' },
      { key: 'limit', title: '限速', type: 'group', children: [
        { key: 'burst', title: '突发值', type: 'text', placeholder: '如 10/second', help: '限速突发值 (如 10/second, 5/minute)' },
        { key: 'rate', title: '速率', type: 'text', placeholder: '如 10/second', help: '限速速率 (如 10/second, 5/minute)' },
      ]},
    ]);

    const ruleDestSchema = computed(() => [
      { key: 'destination', title: '目的', type: 'group', children: [
        { key: 'address', title: '目的地址', type: 'text', placeholder: 'IPv4 地址/子网/范围', help: '目的 IP 地址、子网或范围 (如 10.0.0.0/24, 10.0.0.1-10.0.0.10)' },
        { key: 'port', title: '目的端口', type: 'text', placeholder: '端口/范围/名称', help: '目的端口 (如 80, 1001-1005, http)' },
        { key: 'group', title: '目的组', type: 'group', children: [
          { key: 'address-group', title: '目的地址组', type: 'text', placeholder: '地址组名称', help: '目的地址组名称' },
          { key: 'domain-group', title: '目的域名组', type: 'text', placeholder: '域名组名称', help: '目的域名组名称' },
          { key: 'network-group', title: '目的网络组', type: 'text', placeholder: '网络组名称', help: '目的网络组名称' },
          { key: 'port-group', title: '目的端口组', type: 'text', placeholder: '端口组名称', help: '目的端口组名称' },
        ]},
      ]},
    ]);

    const ruleSourceSchema = computed(() => [
      { key: 'source', title: '源', type: 'group', children: [
        { key: 'address', title: '源地址', type: 'text', placeholder: 'IPv4 地址/子网/范围', help: '源 IP 地址、子网或范围' },
        { key: 'port', title: '源端口', type: 'text', placeholder: '端口/范围/名称', help: '源端口 (如 80, 1001-1005, http)' },
        { key: 'group', title: '源组', type: 'group', children: [
          { key: 'address-group', title: '源地址组', type: 'text', placeholder: '地址组名称', help: '源地址组名称' },
          { key: 'domain-group', title: '源域名组', type: 'text', placeholder: '域名组名称', help: '源域名组名称' },
          { key: 'network-group', title: '源网络组', type: 'text', placeholder: '网络组名称', help: '源网络组名称' },
          { key: 'port-group', title: '源端口组', type: 'text', placeholder: '端口组名称', help: '源端口组名称' },
        ]},
      ]},
    ]);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'global': return 'load-balancing wan';
        case 'health': return 'load-balancing wan interface-health';
        case 'rules': return 'load-balancing wan rule';
        default: return 'load-balancing wan';
      }
    });

    const allCommands = computed(() => {
      const cmds = [];
      cmds.push(...globalToCommands(globalConfig.value));
      for (const h of healthList.value) cmds.push(...healthToCommands(h));
      for (const r of ruleList.value) cmds.push(...ruleToCommands(r));
      return cmds;
    });

    async function loadConfig() {
      loading.value = true;
      try {
        const res = await configApi.get('load-balancing wan');
        const raw = res.data || {};
        globalConfig.value = {
          'disable-source-nat': !!raw['disable-source-nat'],
          'enable-local-traffic': !!raw['enable-local-traffic'],
          'flush-connections': !!raw['flush-connections'],
          hook: raw.hook || '',
          'sticky-inbound': !!(raw['sticky-connections'] && raw['sticky-connections'].inbound),
        };
        healthList.value = parseHealth(raw['interface-health']);
        ruleList.value = parseRules(raw.rule);
        const ifRes = await configApi.get('interfaces');
        const ifData = ifRes.data || {};
        const ifaceList = [];
        for (const [type, ifaces] of Object.entries(ifData)) {
          if (ifaces && typeof ifaces === 'object') {
            for (const name of Object.keys(ifaces)) {
              ifaceList.push(name);
            }
          }
        }
        interfaces.value = ifaceList;
      } catch (e) {
        showError(e, '加载WAN负载均衡配置失败');
      } finally {
        loading.value = false;
      }
    }

    function openHealthModal(h) {
      editingHealth.value = h ? JSON.parse(JSON.stringify(h)) : emptyHealth();
      showHealthModal.value = true;
    }
    function openRuleModal(r) {
      editingRule.value = r ? JSON.parse(JSON.stringify(r)) : emptyRule();
      activeRuleTab.value = 'basic';
      showRuleModal.value = true;
    }

    function saveHealth() {
      const h = editingHealth.value;
      if (!h.interface) { showError(null, '请输入接口名称'); return; }
      if (!h.nexthop) { showError(null, '请设置下一跳地址'); return; }
      showHealthModal.value = false;
      loadConfig();
    }

    function saveRule() {
      const r = editingRule.value;
      if (!r.rule) { showError(null, '请输入规则编号'); return; }
      if (!r['inbound-interface']) { showError(null, '请选择入方向接口'); return; }
      if (r.interface.length === 0) { showError(null, '请选择出方向接口'); return; }
      showRuleModal.value = false;
      loadConfig();
    }

    function deleteHealth(h) {
      healthList.value = healthList.value.filter(x => x.interface !== h.interface);
    }

    function deleteRule(r) {
      ruleList.value = ruleList.value.filter(x => x.rule !== r.rule);
    }

    function getTestTypeLabel(type) {
      const opt = TEST_TYPE_OPTIONS.find(o => o.value === type);
      return opt ? opt.label : type;
    }

    function getProtocolLabel(proto) {
      const opt = PROTOCOL_OPTIONS.find(o => o.value === proto);
      return opt ? opt.label : proto;
    }

    async function saveConfig() {
      loading.value = true;
      try {
        // Delete old config - children first, then parent
        for (const h of healthList.value) {
          await configStore.deleteConfig(`load-balancing wan interface-health ${h.interface}`);
        }
        for (const r of ruleList.value) {
          await configStore.deleteConfig(`load-balancing wan rule ${r.rule}`);
        }
        await configStore.deleteConfig('load-balancing wan');

        // Set global config
        if (globalConfig.value['disable-source-nat']) {
          await configStore.setConfig('load-balancing wan disable-source-nat', '');
        }
        if (globalConfig.value['enable-local-traffic']) {
          await configStore.setConfig('load-balancing wan enable-local-traffic', '');
        }
        if (globalConfig.value['flush-connections']) {
          await configStore.setConfig('load-balancing wan flush-connections', '');
        }
        if (globalConfig.value.hook) {
          await configStore.setConfig('load-balancing wan hook', globalConfig.value.hook);
        }
        if (globalConfig.value['sticky-inbound']) {
          await configStore.setConfig('load-balancing wan sticky-connections inbound', '');
        }

        // Set health checks
        for (const h of healthList.value) {
          const base = `load-balancing wan interface-health ${h.interface}`;
          await configStore.setConfig(`${base} failure-count`, String(h['failure-count']));
          await configStore.setConfig(`${base} success-count`, String(h['success-count']));
          await configStore.setConfig(`${base} nexthop`, h.nexthop);
          await configStore.setConfig(`${base} test resp-time`, String(h.test['resp-time']));
          await configStore.setConfig(`${base} test target`, h.test.target);
          await configStore.setConfig(`${base} test ttl-limit`, String(h.test['ttl-limit']));
          await configStore.setConfig(`${base} test type`, h.test.type);
          if (h.test['test-script']) {
            await configStore.setConfig(`${base} test test-script`, h.test['test-script']);
          }
        }

        // Set rules
        for (const r of ruleList.value) {
          const base = `load-balancing wan rule ${r.rule}`;
          if (r.description) await configStore.setConfig(`${base} description`, r.description);
          await configStore.setConfig(`${base} inbound-interface`, r['inbound-interface']);
          for (const iface of r.interface) {
            await configStore.setConfig(`${base} interface`, iface);
          }
          if (r.protocol && r.protocol !== 'all') {
            if (r.protocol === 'custom' && r.protocolNumber) {
              await configStore.setConfig(`${base} protocol`, r.protocolNumber);
            } else {
              await configStore.setConfig(`${base} protocol`, r.protocol);
            }
          }
          if (r.exclude) await configStore.setConfig(`${base} exclude`, '');
          if (r.failover) await configStore.setConfig(`${base} failover`, '');
          if (r['per-packet-balancing']) await configStore.setConfig(`${base} per-packet-balancing`, '');
          if (r.limit?.burst) await configStore.setConfig(`${base} limit burst`, r.limit.burst);
          if (r.limit?.rate) await configStore.setConfig(`${base} limit rate`, r.limit.rate);
          if (r.destination?.address) await configStore.setConfig(`${base} destination address`, r.destination.address);
          if (r.destination?.port) await configStore.setConfig(`${base} destination port`, r.destination.port);
          if (r.destination?.group?.['address-group']) await configStore.setConfig(`${base} destination group address-group`, r.destination.group['address-group']);
          if (r.destination?.group?.['domain-group']) await configStore.setConfig(`${base} destination group domain-group`, r.destination.group['domain-group']);
          if (r.destination?.group?.['network-group']) await configStore.setConfig(`${base} destination group network-group`, r.destination.group['network-group']);
          if (r.destination?.group?.['port-group']) await configStore.setConfig(`${base} destination group port-group`, r.destination.group['port-group']);
          if (r.source?.address) await configStore.setConfig(`${base} source address`, r.source.address);
          if (r.source?.port) await configStore.setConfig(`${base} source port`, r.source.port);
          if (r.source?.group?.['address-group']) await configStore.setConfig(`${base} source group address-group`, r.source.group['address-group']);
          if (r.source?.group?.['domain-group']) await configStore.setConfig(`${base} source group domain-group`, r.source.group['domain-group']);
          if (r.source?.group?.['network-group']) await configStore.setConfig(`${base} source group network-group`, r.source.group['network-group']);
          if (r.source?.group?.['port-group']) await configStore.setConfig(`${base} source group port-group`, r.source.group['port-group']);
        }

        await configStore.commit();
        await loadConfig();
      } catch (e) {
        showError(e, '保存WAN负载均衡配置失败');
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => { loadConfig(); });

    return {
      loading, globalConfig, healthList, ruleList,
      showHealthModal, showRuleModal,
      editingHealth, editingRule, activeTab, activeRuleTab, interfaces,
      globalSchema, healthSchema, testSchema, ruleBasicSchema, ruleDestSchema, ruleSourceSchema,
      commandPath, allCommands, loadConfig, saveConfig,
      openHealthModal, openRuleModal,
      saveHealth, saveRule,
      deleteHealth, deleteRule,
      getTestTypeLabel, getProtocolLabel,
    };
  },
  template: `
    <div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'global', title: '全局设置' },
        { key: 'health', title: '接口健康检查' },
        { key: 'rules', title: '规则' },
      ]">
        <template #global>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" title="禁止为 WAN 负载均衡配置源 NAT 规则">禁用源 NAT</label>
                <input type="checkbox" v-model="globalConfig['disable-source-nat']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">禁止为 WAN 负载均衡配置源 NAT 规则</div>
              <div class="form-row">
                <label class="form-label" title="为本地发起的流量启用 WAN 负载均衡">启用本地流量</label>
                <input type="checkbox" v-model="globalConfig['enable-local-traffic']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">为本地发起的流量启用 WAN 负载均衡</div>
              <div class="form-row">
                <label class="form-label" title="连接状态变化时刷新连接跟踪表">刷新连接跟踪</label>
                <input type="checkbox" v-model="globalConfig['flush-connections']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">连接状态变化时刷新连接跟踪表</div>
              <div class="form-row">
                <label class="form-label" title="接口状态变化时执行的脚本路径 (/config/scripts)">状态变更脚本</label>
                <input type="text" v-model="globalConfig.hook" placeholder="如：wlb-hook.sh" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">接口状态变化时执行的脚本路径 (/config/scripts)</div>
              <div class="form-row">
                <label class="form-label" title="启用粘性入方向 WAN 连接">粘性连接 (入方向)</label>
                <input type="checkbox" v-model="globalConfig['sticky-inbound']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">启用粘性入方向 WAN 连接</div>
            </div>
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #health>
          <DataTable :columns="[
              { key: 'interface', title: '接口', width: 120 },
              { key: 'nexthop', title: '下一跳', width: 150 },
              { key: 'failureCount', title: '失败次数', width: 100 },
              { key: 'successCount', title: '成功次数', width: 100 },
              { key: 'testType', title: '测试类型', width: 120 },
              { key: 'testTarget', title: '测试目标', width: 150 },
              { key: 'respTime', title: '响应时间', width: 100 },
              { key: 'ttlLimit', title: 'TTL限制', width: 100 },
              { key: 'actions', title: '操作', width: 120 },
            ]" :data="healthList.map(h => ({
              interface: h.interface,
              nexthop: h.nexthop,
              failureCount: h['failure-count'],
              successCount: h['success-count'],
              testType: getTestTypeLabel(h.test?.type || 'ping'),
              testTarget: h.test?.target || '-',
              respTime: h.test?.['resp-time'] + 's',
              ttlLimit: h.test?.['ttl-limit'],
              actions: h,
            }))"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @create="openHealthModal(null)"
            @edit="openHealthModal($event)"
            @delete="deleteHealth($event)"
            @refresh="loadConfig">
              <template #actions="{ record }">
                <button class="btn btn-link" @click="openHealthModal(record.actions)">编辑</button>
                <button class="btn btn-link btn-danger" @click="deleteHealth(record.actions)">删除</button>
              </template>
            </DataTable>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #rules>
          <DataTable :columns="[
              { key: 'rule', title: '规则编号', width: 100 },
              { key: 'description', title: '描述', width: 150 },
              { key: 'inboundInterface', title: '入方向接口', width: 120 },
              { key: 'interface', title: '出方向接口', width: 150 },
              { key: 'protocol', title: '协议', width: 100 },
              { key: 'exclude', title: '排除', width: 60 },
              { key: 'failover', title: '故障转移', width: 80 },
              { key: 'destination', title: '目的', width: 150 },
              { key: 'source', title: '源', width: 150 },
              { key: 'actions', title: '操作', width: 120 },
            ]" :data="ruleList.map(r => ({
              rule: r.rule,
              description: r.description || '-',
              inboundInterface: r['inbound-interface'],
              interface: r.interface.join(', '),
              protocol: getProtocolLabel(r.protocol),
              exclude: r.exclude ? '是' : '-',
              failover: r.failover ? '是' : '-',
              destination: r.destination.address || r.destination.port || r.destination.group['address-group'] || '-',
              source: r.source.address || r.source.port || r.source.group['address-group'] || '-',
              actions: r,
            }))"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @create="openRuleModal(null)"
            @edit="openRuleModal($event)"
            @delete="deleteRule($event)"
            @refresh="loadConfig">
              <template #actions="{ record }">
                <button class="btn btn-link" @click="openRuleModal(record.actions)">编辑</button>
                <button class="btn btn-link btn-danger" @click="deleteRule(record.actions)">删除</button>
              </template>
            </DataTable>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

      </TabGroup>


      <!-- 健康检查弹窗 -->
      <DraggableModal v-model:visible="showHealthModal" title="接口健康检查" width="600px" @ok="saveHealth">
        <ConfigForm :schema="healthSchema" :model="editingHealth" />
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
          <h4 style="margin-bottom: 12px;">测试参数</h4>
          <ConfigForm :schema="testSchema" :model="editingHealth.test" />
        </div>
      </DraggableModal>

      <!-- 规则弹窗 -->
      <DraggableModal v-model:visible="showRuleModal" title="WAN负载均衡规则" width="700px" @ok="saveRule">
        <TabGroup v-model="activeRuleTab" :tabs="[
          { key: 'basic', title: '基本配置' },
          { key: 'destination', title: '目的匹配' },
          { key: 'source', title: '源匹配' },
        ]">
          <template #basic>
            <ConfigForm :schema="ruleBasicSchema" :model="editingRule" />
          </template>

          <template #destination>
            <ConfigForm :schema="ruleDestSchema" :model="editingRule" />
          </template>

          <template #source>
            <ConfigForm :schema="ruleSourceSchema" :model="editingRule" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
