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
import { useI18n } from '/src/i18n/index.js';

function getTestTypeOptions(t) {
  return [
    { value: 'ping', label: t('wan.options.testType.ping') },
    { value: 'ttl', label: t('wan.options.testType.ttl') },
    { value: 'user-defined', label: t('wan.options.testType.userDefined') },
  ];
}

function getProtocolOptions(t) {
  return [
    { value: 'all', label: t('wan.options.protocol.all') },
    { value: 'tcp_udp', label: t('wan.options.protocol.tcpUdp') },
    { value: 'tcp', label: t('wan.options.protocol.tcp') },
    { value: 'udp', label: t('wan.options.protocol.udp') },
    { value: 'icmp', label: t('wan.options.protocol.icmp') },
    { value: 'gre', label: t('wan.options.protocol.gre') },
    { value: 'esp', label: t('wan.options.protocol.esp') },
    { value: 'ah', label: t('wan.options.protocol.ah') },
    { value: 'custom', label: t('wan.options.protocol.custom') },
  ];
}

function getBalanceOptions(t) {
  return [
    { value: 'flow', label: t('wan.options.balance.flow') },
    { value: 'per-packet-balancing', label: t('wan.options.balance.perPacket') },
  ];
}

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
    const testObj = h.test;
    if (testObj['resp-time'] && testObj['resp-time'] !== 5) cmds.push(`${base} test resp-time ${testObj['resp-time']}`);
    if (testObj.target) cmds.push(`${base} test target ${testObj.target}`);
    if (testObj['test-script']) cmds.push(`${base} test test-script ${testObj['test-script']}`);
    if (testObj['ttl-limit'] && testObj['ttl-limit'] !== 1) cmds.push(`${base} test ttl-limit ${testObj['ttl-limit']}`);
    if (testObj.type && testObj.type !== 'ping') cmds.push(`${base} test type ${testObj.type}`);
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
    const { t } = useI18n();
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
      { key: 'disable-source-nat', title: t('wan.global.disableSourceNat'), type: 'checkbox', help: t('wan.global.disableSourceNatHelp') },
      { key: 'enable-local-traffic', title: t('wan.global.enableLocalTraffic'), type: 'checkbox', help: t('wan.global.enableLocalTrafficHelp') },
      { key: 'flush-connections', title: t('wan.global.flushConnections'), type: 'checkbox', help: t('wan.global.flushConnectionsHelp') },
      { key: 'hook', title: t('wan.global.hook'), type: 'text', help: t('wan.global.hookHelp'), placeholder: t('wan.global.hookPlaceholder') },
      { key: 'sticky-inbound', title: t('wan.global.stickyInbound'), type: 'checkbox', help: t('wan.global.stickyInboundHelp') },
    ]);

    const healthSchema = computed(() => [
      { key: 'interface', title: t('wan.health.interface'), type: 'select', options: interfaces.value, required: true, placeholder: t('wan.health.interfacePlaceholder'), help: t('wan.health.interfaceHelp') },
      { key: 'nexthop', title: t('wan.health.nexthop'), type: 'text', required: true, placeholder: t('wan.health.nexthopPlaceholder'), help: t('wan.health.nexthopHelp') },
      { key: 'failure-count', title: t('wan.health.failureCount'), type: 'number', min: 1, max: 10, default: 1, help: t('wan.health.failureCountHelp') },
      { key: 'success-count', title: t('wan.health.successCount'), type: 'number', min: 1, max: 10, default: 1, help: t('wan.health.successCountHelp') },
    ]);

    const testSchema = computed(() => [
      { key: 'type', title: t('wan.health.testType'), type: 'select', options: getTestTypeOptions(t), default: 'ping', help: t('wan.health.testTypeHelp') },
      { key: 'target', title: t('wan.health.target'), type: 'text', placeholder: t('wan.health.targetPlaceholder'), help: t('wan.health.targetHelp') },
      { key: 'resp-time', title: t('wan.health.respTime'), type: 'number', min: 1, max: 30, default: 5, help: t('wan.health.respTimeHelp') },
      { key: 'ttl-limit', title: t('wan.health.ttlLimit'), type: 'number', min: 1, max: 254, default: 1, help: t('wan.health.ttlLimitHelp') },
      { key: 'test-script', title: t('wan.health.testScript'), type: 'text', placeholder: t('wan.health.testScriptPlaceholder'), help: t('wan.health.testScriptHelp') },
    ]);

    const ruleBasicSchema = computed(() => [
      { key: 'rule', title: t('wan.rules.rule'), type: 'number', min: 1, max: 9999, required: true, help: t('wan.rules.ruleHelp') },
      { key: 'description', title: t('wan.rules.description'), type: 'text', placeholder: t('wan.rules.descriptionPlaceholder') },
      { key: 'inbound-interface', title: t('wan.rules.inboundInterface'), type: 'select', options: ['any', ...interfaces.value], required: true, help: t('wan.rules.inboundInterfaceHelp') },
      { key: 'interface', title: t('wan.rules.outboundInterface'), type: 'multi-select', options: interfaces.value, required: true, help: t('wan.rules.outboundInterfaceHelp') },
      { key: 'protocol', title: t('wan.rules.protocol'), type: 'select', options: getProtocolOptions(t), default: 'all', help: t('wan.rules.protocolHelp') },
      { key: 'protocolNumber', title: t('wan.rules.protocolNumber'), type: 'number', min: 0, max: 255, placeholder: t('wan.rules.protocolNumberPlaceholder'), help: t('wan.rules.protocolNumberHelp') },
      { key: 'exclude', title: t('wan.rules.exclude'), type: 'checkbox', help: t('wan.rules.excludeHelp') },
      { key: 'failover', title: t('wan.rules.failover'), type: 'checkbox', help: t('wan.rules.failoverHelp') },
      { key: 'per-packet-balancing', title: t('wan.rules.perPacketBalancing'), type: 'checkbox', help: t('wan.rules.perPacketBalancingHelp') },
      { key: 'limit', title: t('wan.rules.limit'), type: 'group', children: [
        { key: 'burst', title: t('wan.rules.burst'), type: 'text', placeholder: t('wan.rules.burstPlaceholder'), help: t('wan.rules.burstHelp') },
        { key: 'rate', title: t('wan.rules.rate'), type: 'text', placeholder: t('wan.rules.ratePlaceholder'), help: t('wan.rules.rateHelp') },
      ]},
    ]);

    const ruleDestSchema = computed(() => [
      { key: 'destination', title: t('wan.rules.destination'), type: 'group', children: [
        { key: 'address', title: t('wan.rules.destinationAddress'), type: 'text', placeholder: t('wan.rules.destinationAddressPlaceholder'), help: t('wan.rules.destinationAddressHelp') },
        { key: 'port', title: t('wan.rules.destinationPort'), type: 'text', placeholder: t('wan.rules.destinationPortPlaceholder'), help: t('wan.rules.destinationPortHelp') },
        { key: 'group', title: t('wan.rules.destinationGroup'), type: 'group', children: [
          { key: 'address-group', title: t('wan.rules.destinationAddressGroup'), type: 'select', dynamic: true, help: t('wan.rules.destinationAddressGroupHelp') },
          { key: 'domain-group', title: t('wan.rules.destinationDomainGroup'), type: 'select', dynamic: true, help: t('wan.rules.destinationDomainGroupHelp') },
          { key: 'network-group', title: t('wan.rules.destinationNetworkGroup'), type: 'select', dynamic: true, help: t('wan.rules.destinationNetworkGroupHelp') },
          { key: 'port-group', title: t('wan.rules.destinationPortGroup'), type: 'select', dynamic: true, help: t('wan.rules.destinationPortGroupHelp') },
        ]},
      ]},
    ]);

    const ruleSourceSchema = computed(() => [
      { key: 'source', title: t('wan.rules.source'), type: 'group', children: [
        { key: 'address', title: t('wan.rules.sourceAddress'), type: 'text', placeholder: t('wan.rules.sourceAddressPlaceholder'), help: t('wan.rules.sourceAddressHelp') },
        { key: 'port', title: t('wan.rules.sourcePort'), type: 'text', placeholder: t('wan.rules.sourcePortPlaceholder'), help: t('wan.rules.sourcePortHelp') },
        { key: 'group', title: t('wan.rules.sourceGroup'), type: 'group', children: [
          { key: 'address-group', title: t('wan.rules.sourceAddressGroup'), type: 'select', dynamic: true, help: t('wan.rules.sourceAddressGroupHelp') },
          { key: 'domain-group', title: t('wan.rules.sourceDomainGroup'), type: 'select', dynamic: true, help: t('wan.rules.sourceDomainGroupHelp') },
          { key: 'network-group', title: t('wan.rules.sourceNetworkGroup'), type: 'select', dynamic: true, help: t('wan.rules.sourceNetworkGroupHelp') },
          { key: 'port-group', title: t('wan.rules.sourcePortGroup'), type: 'select', dynamic: true, help: t('wan.rules.sourcePortGroupHelp') },
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
        showError(e, t('wan.errors.loadFailed'));
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
      if (!h.interface) { showError(null, t('wan.errors.interfaceRequired')); return; }
      if (!h.nexthop) { showError(null, t('wan.errors.nexthopRequired')); return; }
      showHealthModal.value = false;
      loadConfig();
    }

    function saveRule() {
      const r = editingRule.value;
      if (!r.rule) { showError(null, t('wan.errors.ruleRequired')); return; }
      if (!r['inbound-interface']) { showError(null, t('wan.errors.inboundInterfaceRequired')); return; }
      if (r.interface.length === 0) { showError(null, t('wan.errors.outboundInterfaceRequired')); return; }
      showRuleModal.value = false;
      loadConfig();
    }

    function deleteHealth(h) {
      healthList.value = healthList.value.filter(x => x.interface !== h.interface);
    }

    function deleteRule(r) {
      ruleList.value = ruleList.value.filter(x => x.rule !== r.rule);
    }

    function getTestTypeLabel(type, tFunc) {
      const options = getTestTypeOptions(tFunc);
      const opt = options.find(o => o.value === type);
      return opt ? opt.label : type;
    }

    function getProtocolLabel(proto, tFunc) {
      const options = getProtocolOptions(tFunc);
      const opt = options.find(o => o.value === proto);
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

        configStore.markPending();
        await configStore.checkSessionChanged();
        await loadConfig();
      } catch (e) {
        showError(e, t('wan.errors.saveFailed'));
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => { loadConfig(); window.addEventListener('config-committed', loadConfig); });

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
      t,
    };
  },
  template: `
    <div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'global', title: t('wan.tabs.global') },
        { key: 'health', title: t('wan.tabs.health') },
        { key: 'rules', title: t('wan.tabs.rules') },
      ]">
        <template #global>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" :title="t('wan.global.disableSourceNatHelp')">{{ t('wan.global.disableSourceNat') }}</label>
                <input type="checkbox" v-model="globalConfig['disable-source-nat']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('wan.global.disableSourceNatHelp') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('wan.global.enableLocalTrafficHelp')">{{ t('wan.global.enableLocalTraffic') }}</label>
                <input type="checkbox" v-model="globalConfig['enable-local-traffic']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('wan.global.enableLocalTrafficHelp') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('wan.global.flushConnectionsHelp')">{{ t('wan.global.flushConnections') }}</label>
                <input type="checkbox" v-model="globalConfig['flush-connections']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('wan.global.flushConnectionsHelp') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('wan.global.hookHelp')">{{ t('wan.global.hook') }}</label>
                <input type="text" v-model="globalConfig.hook" :placeholder="t('wan.global.hookPlaceholder')" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('wan.global.hookHelp') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('wan.global.stickyInboundHelp')">{{ t('wan.global.stickyInbound') }}</label>
                <input type="checkbox" v-model="globalConfig['sticky-inbound']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('wan.global.stickyInboundHelp') }}</div>
            </div>
          </div>
        </template>

        <template #health>
          <DataTable :columns="[
              { key: 'interface', title: t('wan.health.columns.interface'), width: 120 },
              { key: 'nexthop', title: t('wan.health.columns.nexthop'), width: 150 },
              { key: 'failureCount', title: t('wan.health.columns.failureCount'), width: 100 },
              { key: 'successCount', title: t('wan.health.columns.successCount'), width: 100 },
              { key: 'testType', title: t('wan.health.columns.testType'), width: 120 },
              { key: 'testTarget', title: t('wan.health.columns.testTarget'), width: 150 },
              { key: 'respTime', title: t('wan.health.columns.respTime'), width: 100 },
              { key: 'ttlLimit', title: t('wan.health.columns.ttlLimit'), width: 100 },
              { key: 'actions', title: t('app.actions'), width: 120 },
            ]" :data="healthList.map(h => ({
              interface: h.interface,
              nexthop: h.nexthop,
              failureCount: h['failure-count'],
              successCount: h['success-count'],
              testType: getTestTypeLabel(h.test?.type || 'ping', t),
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
                <button class="btn btn-link" @click="openHealthModal(record.actions)">{{ t('wan.buttons.edit') }}</button>
                <button class="btn btn-link btn-danger" @click="deleteHealth(record.actions)">{{ t('wan.buttons.delete') }}</button>
              </template>
            </DataTable>
        </template>

        <template #rules>
          <DataTable :columns="[
              { key: 'rule', title: t('wan.rules.columns.rule'), width: 100 },
              { key: 'description', title: t('wan.rules.columns.description'), width: 150 },
              { key: 'inboundInterface', title: t('wan.rules.columns.inboundInterface'), width: 120 },
              { key: 'interface', title: t('wan.rules.columns.outboundInterface'), width: 150 },
              { key: 'protocol', title: t('wan.rules.columns.protocol'), width: 100 },
              { key: 'exclude', title: t('wan.rules.columns.exclude'), width: 60 },
              { key: 'failover', title: t('wan.rules.columns.failover'), width: 80 },
              { key: 'destination', title: t('wan.rules.columns.destination'), width: 150 },
              { key: 'source', title: t('wan.rules.columns.source'), width: 150 },
              { key: 'actions', title: t('app.actions'), width: 120 },
            ]" :data="ruleList.map(r => ({
              rule: r.rule,
              description: r.description || '-',
              inboundInterface: r['inbound-interface'],
              interface: r.interface.join(', '),
              protocol: getProtocolLabel(r.protocol, t),
              exclude: r.exclude ? t('wan.options.yes') : '-',
              failover: r.failover ? t('wan.options.yes') : '-',
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
                <button class="btn btn-link" @click="openRuleModal(record.actions)">{{ t('wan.buttons.edit') }}</button>
                <button class="btn btn-link btn-danger" @click="deleteRule(record.actions)">{{ t('wan.buttons.delete') }}</button>
              </template>
            </DataTable>
        </template>

      </TabGroup>

      <div v-if="activeTab === 'global'" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="loading" @click="saveConfig">
          {{ loading ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <!-- Health Check Modal -->
      <DraggableModal v-model:visible="showHealthModal" :title="t('wan.health.modalTitle')" width="600px" @ok="saveHealth">
        <ConfigForm :schema="healthSchema" :model="editingHealth" />
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
          <h4 style="margin-bottom: 12px;">{{ t('wan.health.testParams') }}</h4>
          <ConfigForm :schema="testSchema" :model="editingHealth.test" />
        </div>
      </DraggableModal>

      <!-- Rule Modal -->
      <DraggableModal v-model:visible="showRuleModal" :title="t('wan.rules.modalTitle')" width="700px" @ok="saveRule">
        <TabGroup v-model="activeRuleTab" :tabs="[
          { key: 'basic', title: t('wan.tabs.basic') },
          { key: 'destination', title: t('wan.tabs.destination') },
          { key: 'source', title: t('wan.tabs.source') },
        ]">
          <template #basic>
            <ConfigForm :schema="ruleBasicSchema" :model="editingRule" />
          </template>

          <template #destination>
            <ConfigForm :schema="ruleDestSchema" :model="editingRule" :suggestionPath="commandPath" />
          </template>

          <template #source>
            <ConfigForm :schema="ruleSourceSchema" :model="editingRule" :suggestionPath="commandPath" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
