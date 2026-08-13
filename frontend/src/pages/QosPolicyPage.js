import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const POLICY_TYPES = [
  { value: 'cake', label: 'CAKE' },
  { value: 'drop-tail', label: 'Drop Tail (FIFO)' },
  { value: 'fair-queue', label: 'Fair Queue (SFQ)' },
  { value: 'fq-codel', label: 'FQ-CoDel' },
  { value: 'limiter', label: 'qosPolicy.types.limiter' },
  { value: 'network-emulator', label: 'qosPolicy.types.networkEmulator' },
  { value: 'priority-queue', label: 'qosPolicy.types.priorityQueue' },
  { value: 'random-detect', label: 'qosPolicy.types.randomDetect' },
  { value: 'rate-control', label: 'qosPolicy.types.rateControl' },
  { value: 'round-robin', label: 'qosPolicy.types.roundRobin' },
  { value: 'shaper', label: 'qosPolicy.types.shaper' },
  { value: 'shaper-hfsc', label: 'Shaper HFSC' },
];

const FLOW_ISOLATION_OPTIONS = [
  { value: 'blind', label: 'blind' },
  { value: 'src-host', label: 'src-host' },
  { value: 'dst-host', label: 'dst-host' },
  { value: 'host', label: 'host' },
  { value: 'flow', label: 'flow' },
  { value: 'dual-src-host', label: 'dual-src-host' },
  { value: 'dual-dst-host', label: 'dual-dst-host' },
  { value: 'triple-isolate', label: 'triple-isolate' },
];

const EXCEED_OPTIONS = [
  { value: 'continue', label: 'qosPolicy.options.continue' },
  { value: 'drop', label: 'qosPolicy.options.drop' },
  { value: 'ok', label: 'qosPolicy.options.ok' },
  { value: 'reclassify', label: 'qosPolicy.options.reclassify' },
  { value: 'pipe', label: 'qosPolicy.options.pipe' },
];

const QUEUE_TYPE_OPTIONS = [
  { value: 'drop-tail', label: 'drop-tail' },
  { value: 'fq-codel', label: 'fq-codel' },
];

const DSCP_OPTIONS = [
  { value: 'default', label: 'default (000000)' },
  { value: 'reliability', label: 'reliability (000001)' },
  { value: 'throughput', label: 'throughput (000010)' },
  { value: 'lowdelay', label: 'lowdelay (000100)' },
  { value: 'priority', label: 'priority (001000)' },
  { value: 'immediate', label: 'immediate (010000)' },
  { value: 'flash', label: 'flash (011000)' },
  { value: 'flash-override', label: 'flash-override (100000)' },
  { value: 'critical', label: 'critical (101000)' },
  { value: 'internet', label: 'internet (110000)' },
  { value: 'network', label: 'network (111000)' },
  { value: 'AF11', label: 'qosPolicy.dscp.AF11' },
  { value: 'AF12', label: 'qosPolicy.dscp.AF12' },
  { value: 'AF13', label: 'qosPolicy.dscp.AF13' },
  { value: 'AF21', label: 'qosPolicy.dscp.AF21' },
  { value: 'AF22', label: 'qosPolicy.dscp.AF22' },
  { value: 'AF23', label: 'qosPolicy.dscp.AF23' },
  { value: 'AF31', label: 'qosPolicy.dscp.AF31' },
  { value: 'AF32', label: 'qosPolicy.dscp.AF32' },
  { value: 'AF33', label: 'qosPolicy.dscp.AF33' },
  { value: 'AF41', label: 'qosPolicy.dscp.AF41' },
  { value: 'AF42', label: 'qosPolicy.dscp.AF42' },
  { value: 'AF43', label: 'qosPolicy.dscp.AF43' },
  { value: 'CS1', label: 'qosPolicy.dscp.CS1' },
  { value: 'CS2', label: 'CS2 (OAM)' },
  { value: 'CS3', label: 'qosPolicy.dscp.CS3' },
  { value: 'CS4', label: 'qosPolicy.dscp.CS4' },
  { value: 'CS5', label: 'qosPolicy.dscp.CS5' },
  { value: 'CS6', label: 'qosPolicy.dscp.CS6' },
  { value: 'CS7', label: 'CS7' },
  { value: 'EF', label: 'qosPolicy.dscp.EF' },
];

const IP_PROTOCOL_OPTIONS = [
  { value: 'tcp', label: 'tcp' },
  { value: 'udp', label: 'udp' },
  { value: 'icmp', label: 'icmp' },
  { value: 'igmp', label: 'igmp' },
  { value: 'ip', label: 'ip' },
  { value: 'ipv6', label: 'ipv6' },
  { value: 'ipv6-icmp', label: 'ipv6-icmp' },
  { value: 'ospf', label: 'ospf' },
  { value: 'gre', label: 'gre' },
  { value: 'esp', label: 'esp' },
  { value: 'ah', label: 'ah' },
  { value: 'sctp', label: 'sctp' },
  { value: 'dccp', label: 'dccp' },
  { value: 'l2tp', label: 'l2tp' },
  { value: 'pim', label: 'pim' },
  { value: 'rsvp', label: 'rsvp' },
  { value: 'vrrp', label: 'vrrp' },
  { value: 'igp', label: 'igp' },
  { value: 'eigrp', label: 'eigrp' },
  { value: 'mptcp', label: 'mptcp' },
];

const ETHER_PROTOCOL_OPTIONS = [
  { value: 'all', label: 'qosPolicy.etherProtocol.all' },
  { value: 'ip', label: 'qosPolicy.etherProtocol.ip' },
  { value: 'ipv6', label: 'qosPolicy.etherProtocol.ipv6' },
  { value: 'arp', label: 'arp' },
  { value: 'atalk', label: 'qosPolicy.etherProtocol.atalk' },
  { value: 'ipx', label: 'qosPolicy.etherProtocol.ipx' },
  { value: '802.1Q', label: 'qosPolicy.etherProtocol.802.1Q' },
  { value: '802_2', label: 'qosPolicy.etherProtocol.802_2' },
  { value: '802_3', label: 'qosPolicy.etherProtocol.802_3' },
  { value: 'aarp', label: 'qosPolicy.etherProtocol.aarp' },
  { value: 'aoe', label: 'qosPolicy.etherProtocol.aoe' },
  { value: 'dec', label: 'qosPolicy.etherProtocol.dec' },
  { value: 'lat', label: 'qosPolicy.etherProtocol.lat' },
  { value: 'localtalk', label: 'qosPolicy.etherProtocol.localtalk' },
  { value: 'rarp', label: 'qosPolicy.etherProtocol.rarp' },
  { value: 'snap', label: 'qosPolicy.etherProtocol.snap' },
  { value: 'x25', label: 'qosPolicy.etherProtocol.x25' },
];

const BANDWIDTH_HELP = 'qos.help.bandwidth';

// ========== Schema definitions per policy type ==========

function cakeSchema(t) {
  return [
    { key: 'name', title: t('qosPolicy.fields.name'), type: 'text', required: true },
    { key: 'description', title: t('qosPolicy.fields.description'), type: 'text' },
    { key: 'bandwidth', title: t('qosPolicy.fields.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidth'), help: BANDWIDTH_HELP },
    {
      key: 'ack-filter', title: t('qosPolicy.fields.ackFilter'), type: 'group', children: [
        { key: 'aggressive', title: t('qosPolicy.fields.aggressive'), type: 'checkbox', valueless: true, help: t('qosPolicy.help.aggressive') },
      ],
    },
    { key: 'flow-isolation', title: t('qosPolicy.fields.flowIsolation'), type: 'select', options: FLOW_ISOLATION_OPTIONS, help: t('qosPolicy.help.defaultTripleIsolate') },
    { key: 'flow-isolation-nat', title: t('qosPolicy.fields.flowIsolationNat'), type: 'checkbox', valueless: true, help: t('qosPolicy.help.flowIsolationNat') },
    { key: 'no-split-gso', title: t('qosPolicy.fields.noSplitGso'), type: 'checkbox', valueless: true, help: t('qosPolicy.help.noSplitGso') },
    { key: 'rtt', title: 'RTT (ms)', type: 'number', min: 1, max: 1000000000, placeholder: '1-1000000000', help: t('qosPolicy.help.defaultRtt') },
  ];
}

function dropTailSchema(t) {
  return [
    { key: 'name', title: t('qosPolicy.fields.name'), type: 'text', required: true },
    { key: 'description', title: t('qosPolicy.fields.description'), type: 'text' },
    { key: 'queue-limit', title: t('qosPolicy.fields.queueLimit'), type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: t('qosPolicy.help.queueLimitPackets') },
  ];
}

function fairQueueSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'hash-interval', title: t('qos.fields.hashInterval'), type: 'number', min: 0, max: 2147483647, placeholder: t('qosPolicy.placeholders.hashInterval'), help: t('qos.help.hashInterval') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, max: 127, placeholder: '1-127', help: t('qos.help.defaultQueueLimit127') },
  ];
}

function fqCodelSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'codel-quantum', title: t('qos.fields.codelQuantum'), type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: t('qos.help.defaultCodelQuantum') },
    { key: 'flows', title: t('qos.fields.flows'), type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: t('qos.help.defaultFlows') },
    { key: 'interval', title: t('qos.fields.interval'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultInterval') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 2, max: 10999, placeholder: '2-10999', help: t('qos.help.defaultQueueLimit10240') },
    { key: 'target', title: t('qos.fields.target'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultTarget') },
  ];
}

function networkEmulatorSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidthSimple'), help: t(BANDWIDTH_HELP) },
    { key: 'corruption', title: t('qos.fields.corruption'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('qos.help.corruption') },
    { key: 'delay', title: t('qos.fields.delay'), type: 'number', min: 0, placeholder: t('qos.placeholder.milliseconds'), help: t('qos.help.delay') },
    { key: 'duplicate', title: t('qos.fields.duplicate'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('qos.help.duplicate') },
    { key: 'loss', title: t('qos.fields.loss'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('qos.help.loss') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, placeholder: t('qos.placeholder.maxQueueSize') },
    { key: 'reordering', title: t('qos.fields.reordering'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('qos.help.reordering') },
  ];
}

function rateControlSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidthSimple'), help: t(BANDWIDTH_HELP) },
    { key: 'burst', title: t('qos.fields.burst'), type: 'text', placeholder: t('qosPolicy.placeholders.burstExample'), help: t('qos.help.defaultBurst') },
    { key: 'latency', title: t('qos.fields.latency'), type: 'number', min: 0, placeholder: t('qos.placeholder.milliseconds'), help: t('qos.help.defaultLatency') },
  ];
}

// ========== Complex policies with classes ==========

function limiterTopSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    {
      key: 'default', title: t('qos.fields.defaultClass'), type: 'group', children: [
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidthSimple'), help: t(BANDWIDTH_HELP) },
        { key: 'burst', title: t('qos.fields.burst'), type: 'text', placeholder: t('qosPolicy.placeholders.burstExample'), help: t('qos.help.defaultBurst') },
        { key: 'exceed', title: t('qos.fields.exceed'), type: 'select', options: EXCEED_OPTIONS, help: t('qos.help.defaultExceed') },
        { key: 'mtu', title: 'MTU', type: 'number', min: 256, max: 65535, placeholder: '256-65535' },
        { key: 'not-exceed', title: t('qos.fields.notExceed'), type: 'select', options: [
          { value: 'continue', label: 'continue' },
          { value: 'drop', label: 'drop' },
          { value: 'ok', label: 'ok' },
          { value: 'reclassify', label: 'reclassify' },
          { value: 'pipe', label: 'pipe' },
        ], help: t('qos.help.defaultNotExceed') },
      ],
    },
  ];
}

function limiterClassSchema(t) {
  return [
    { key: 'id', title: t('qos.columns.classId'), type: 'number', min: 1, max: 4090, required: true, placeholder: '1-4090' },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidthSimple'), help: t(BANDWIDTH_HELP) },
    { key: 'burst', title: t('qos.fields.burst'), type: 'text', placeholder: t('qosPolicy.placeholders.burstExample'), help: t('qos.help.defaultBurst') },
    { key: 'exceed', title: t('qos.fields.exceed'), type: 'select', options: EXCEED_OPTIONS, help: t('qos.help.defaultExceed') },
    { key: 'not-exceed', title: t('qos.fields.notExceed'), type: 'select', options: [
      { value: 'continue', label: 'continue' },
      { value: 'drop', label: 'drop' },
      { value: 'ok', label: 'ok' },
      { value: 'reclassify', label: 'reclassify' },
      { value: 'pipe', label: 'pipe' },
    ], help: t('qos.help.defaultNotExceed') },
    { key: 'match-group', title: t('qos.fields.matchGroup'), type: 'text', placeholder: t('qos.placeholder.filterGroupName'), help: t('qos.help.matchGroup') },
    { key: 'mtu', title: 'MTU', type: 'number', min: 256, max: 65535, placeholder: '256-65535' },
    { key: 'priority', title: t('qos.columns.priority'), type: 'number', min: 0, max: 20, placeholder: '0-20', help: t('qos.help.defaultPriority') },
  ];
}

function priorityQueueTopSchema(t) {
  return [
    { key: 'name', title: t('qosPolicy.fields.name'), type: 'text', required: true },
    { key: 'description', title: t('qosPolicy.fields.description'), type: 'text' },
    {
      key: 'default', title: t('qosPolicy.fields.defaultClass'), type: 'group', children: [
        { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: t('qosPolicy.help.defaultCodelQuantum1514') },
        { key: 'flows', title: t('qosPolicy.fields.flows'), type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: t('qosPolicy.help.defaultFlows1024') },
        { key: 'interval', title: t('qosPolicy.fields.interval'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qosPolicy.help.defaultRtt') },
        { key: 'queue-limit', title: t('qosPolicy.fields.queueLimit'), type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: t('qosPolicy.help.defaultMaxQueueSize') },
        { key: 'queue-type', title: t('qosPolicy.fields.queueType'), type: 'select', options: QUEUE_TYPE_OPTIONS, help: t('qosPolicy.help.defaultDropTail') },
        { key: 'target', title: t('qosPolicy.fields.targetDelay'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qosPolicy.help.defaultTargetDelay') },
      ],
    },
  ];
}

function priorityQueueClassSchema(t) {
  return [
    { key: 'id', title: t('qos.columns.priority'), type: 'number', min: 1, max: 7, required: true, placeholder: '1-7' },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'codel-quantum', title: t('qos.fields.codelQuantum'), type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: t('qos.help.defaultCodelQuantum1514') },
    { key: 'flows', title: t('qos.fields.flows'), type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: t('qos.help.defaultFlows') },
    { key: 'interval', title: t('qos.fields.interval'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultInterval') },
    { key: 'match-group', title: t('qos.fields.matchGroup'), type: 'text', placeholder: t('qos.placeholder.filterGroupName'), help: t('qos.help.matchGroup') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, placeholder: t('qos.placeholder.maxQueueSize') },
    { key: 'queue-type', title: t('qos.fields.queueType'), type: 'select', options: QUEUE_TYPE_OPTIONS, help: t('qos.help.defaultQueueType') },
    { key: 'target', title: t('qos.fields.target'), type: 'number', min: 0, placeholder: t('qos.placeholder.minQueueDelay'), help: t('qos.help.defaultTarget') },
  ];
}

function roundRobinTopSchema(t) {
  return [
    { key: 'name', title: t('qosPolicy.fields.name'), type: 'text', required: true },
    { key: 'description', title: t('qosPolicy.fields.description'), type: 'text' },
  ];
}

function roundRobinClassSchema(t) {
  return [
    { key: 'id', title: t('qos.columns.classId'), type: 'number', min: 1, max: 4095, required: true, placeholder: '1-4095' },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'codel-quantum', title: t('qos.fields.codelQuantum'), type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: t('qos.help.defaultCodelQuantum1514') },
    { key: 'flows', title: t('qos.fields.flows'), type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: t('qos.help.defaultFlows') },
    { key: 'interval', title: t('qos.fields.interval'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultInterval') },
    { key: 'quantum', title: t('qos.fields.quantum'), type: 'number', min: 1, placeholder: t('qos.placeholder.packetQuantum') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, placeholder: t('qos.placeholder.maxQueueSize') },
    { key: 'queue-type', title: t('qos.fields.queueType'), type: 'select', options: QUEUE_TYPE_OPTIONS, help: t('qos.help.defaultQueueType') },
    { key: 'target', title: t('qos.fields.target'), type: 'number', min: 0, placeholder: t('qos.placeholder.minQueueDelay'), help: t('qos.help.defaultTarget') },
  ];
}

function shaperTopSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.autoOrBandwidth'), help: t('qos.help.defaultAuto') + ', ' + t(BANDWIDTH_HELP) },
  ];
}

function shaperClassSchema(t) {
  return [
    { key: 'id', title: t('qos.columns.classId'), type: 'number', min: 2, max: 4095, required: true, placeholder: '2-4095' },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'average-packet', title: t('qos.fields.averagePacket'), type: 'number', min: 16, max: 10240, placeholder: '16-10240', help: t('qos.help.defaultAveragePacket') },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.autoOrBandwidth'), help: t('qos.help.defaultAuto') },
    { key: 'burst', title: t('qos.fields.burst'), type: 'text', placeholder: t('qosPolicy.placeholders.burstExample'), help: t('qos.help.defaultBurst') },
    { key: 'ceiling', title: t('qos.fields.ceiling'), type: 'text', placeholder: t('qosPolicy.placeholders.bandwidthSimple'), help: t('qos.help.classBandwidthLimit') },
    { key: 'codel-quantum', title: t('qos.fields.codelQuantum'), type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: t('qos.help.defaultCodelQuantum1514') },
    { key: 'flows', title: t('qos.fields.flows'), type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: t('qos.help.defaultFlows') },
    { key: 'interval', title: t('qos.fields.interval'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultInterval') },
    { key: 'mark-probability', title: t('qos.fields.markProbability'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('qos.help.defaultMarkProbability') },
    { key: 'maximum-threshold', title: t('qos.fields.maximumThreshold'), type: 'number', min: 0, placeholder: t('qos.placeholder.randomDetectMax'), help: t('qos.help.defaultMaximumThreshold') },
    { key: 'minimum-threshold', title: t('qos.fields.minimumThreshold'), type: 'number', min: 0, placeholder: t('qos.placeholder.randomDetectMin') },
    { key: 'priority', title: t('qos.columns.priority'), type: 'number', min: 0, placeholder: t('qos.placeholder.ruleEvalPriority') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, placeholder: t('qos.placeholder.maxQueueSize') },
    { key: 'queue-type', title: t('qos.fields.queueType'), type: 'select', options: [
      { value: 'fq-codel', label: 'fq-codel' },
      { value: 'drop-tail', label: 'drop-tail' },
    ], help: t('qos.help.defaultQueueTypeFqCodel') },
    { key: 'set-dscp', title: t('qos.fields.setDscp'), type: 'text', placeholder: t('qos.placeholder.dscpValue'), help: t('qos.help.setDscp') },
    { key: 'target', title: t('qos.fields.target'), type: 'number', min: 0, placeholder: t('qos.placeholder.minQueueDelay'), help: t('qos.help.defaultTarget') },
  ];
}

function shaperHfscTopSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.autoOrBandwidth'), help: t('qos.help.defaultAuto') + ', ' + t(BANDWIDTH_HELP) },
  ];
}

function shaperHfscClassSchema(t) {
  return [
    { key: 'id', title: t('qosPolicy.fields.classId'), type: 'number', min: 1, max: 4095, required: true, placeholder: '1-4095' },
    { key: 'description', title: t('qosPolicy.fields.description'), type: 'text' },
    {
      key: 'linkshare', title: t('qosPolicy.fields.linkshare'), type: 'group', children: [
        { key: 'd', title: t('qosPolicy.fields.delayMs'), type: 'number', min: 0, placeholder: t('qosPolicy.placeholders.serviceCurveDelay') },
        { key: 'm1', title: t('qosPolicy.fields.m1Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.initialRate') },
        { key: 'm2', title: t('qosPolicy.fields.m2Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.sustainableRate') },
      ],
    },
    {
      key: 'realtime', title: t('qosPolicy.fields.realtime'), type: 'group', children: [
        { key: 'd', title: t('qosPolicy.fields.delayMs'), type: 'number', min: 0, placeholder: t('qosPolicy.placeholders.serviceCurveDelay') },
        { key: 'm1', title: t('qosPolicy.fields.m1Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.initialRate') },
        { key: 'm2', title: t('qosPolicy.fields.m2Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.sustainableRate') },
      ],
    },
    {
      key: 'upperlimit', title: t('qosPolicy.fields.upperlimit'), type: 'group', children: [
        { key: 'd', title: t('qosPolicy.fields.delayMs'), type: 'number', min: 0, placeholder: t('qosPolicy.placeholders.serviceCurveDelay') },
        { key: 'm1', title: t('qosPolicy.fields.m1Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.initialRate') },
        { key: 'm2', title: t('qosPolicy.fields.m2Rate'), type: 'text', placeholder: t('qosPolicy.placeholders.rateExample'), help: t('qosPolicy.help.sustainableRate') },
      ],
    },
  ];
}

function randomDetectTopSchema(t) {
  return [
    { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
    { key: 'description', title: t('qos.columns.description'), type: 'text' },
    { key: 'bandwidth', title: t('qos.columns.bandwidth'), type: 'text', placeholder: t('qosPolicy.placeholders.autoOrBandwidth'), help: t('qos.help.defaultAuto') + ', ' + t(BANDWIDTH_HELP) },
  ];
}

function randomDetectPrecedenceSchema(t) {
  return [
    { key: 'id', title: t('qos.fields.ipPriority'), type: 'number', min: 0, max: 7, required: true, placeholder: '0-7' },
    { key: 'average-packet', title: t('qos.fields.averagePacket'), type: 'number', min: 16, max: 10240, placeholder: '16-10240', help: t('qos.help.defaultAveragePacket') },
    { key: 'mark-probability', title: t('qos.fields.markProbability'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('qos.help.defaultMarkProbability1N') },
    { key: 'maximum-threshold', title: t('qos.fields.maximumThreshold'), type: 'number', min: 0, max: 4096, placeholder: '0-4096', help: t('qos.help.defaultMaximumThresholdPackets') },
    { key: 'minimum-threshold', title: t('qos.fields.minimumThreshold'), type: 'number', min: 0, max: 4096, placeholder: '0-4096', help: t('qos.help.randomDetectMinThreshold') },
    { key: 'queue-limit', title: t('qos.columns.queueLimit'), type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: t('qos.help.queueSizePackets') },
  ];
}

// ========== Helper: get schema by type ==========

function getSchemaByType(type, t) {
  switch (type) {
    case 'cake': return cakeSchema(t);
    case 'drop-tail': return dropTailSchema(t);
    case 'fair-queue': return fairQueueSchema(t);
    case 'fq-codel': return fqCodelSchema(t);
    case 'network-emulator': return networkEmulatorSchema(t);
    case 'rate-control': return rateControlSchema(t);
    case 'limiter': return limiterTopSchema(t);
    case 'priority-queue': return priorityQueueTopSchema(t);
    case 'round-robin': return roundRobinTopSchema(t);
    case 'shaper': return shaperTopSchema(t);
    case 'shaper-hfsc': return shaperHfscTopSchema(t);
    case 'random-detect': return randomDetectTopSchema(t);
    default: return [
      { key: 'name', title: t('qos.columns.name'), type: 'text', required: true },
      { key: 'description', title: t('qos.columns.description'), type: 'text' },
    ];
  }
}

function getClassSchemaByType(type, t) {
  switch (type) {
    case 'limiter': return limiterClassSchema(t);
    case 'priority-queue': return priorityQueueClassSchema(t);
    case 'round-robin': return roundRobinClassSchema(t);
    case 'shaper': return shaperClassSchema(t);
    case 'shaper-hfsc': return shaperHfscClassSchema(t);
    case 'random-detect': return randomDetectPrecedenceSchema(t);
    default: return null;
  }
}

function hasClasses(type) {
  return ['limiter', 'priority-queue', 'round-robin', 'shaper', 'shaper-hfsc', 'random-detect'].includes(type);
}

// ========== Component ==========

export default defineComponent({
  name: 'QosPolicyPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const policies = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingPolicy = ref(null);
    const typeFilter = ref('cake');
    const dataTableRef = ref(null);

    // Class management
    const editingClasses = ref([]);
    const classModalEditing = ref(null);
    const classFormTab = ref('basic');
    const classModalVisible = ref(false);
    const editingRules = ref([]);
    const ruleModalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleClassId = ref(null);
    const interfaceOptions = ref([]);

    const POLICY_COLUMNS = {
      cake: [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 120 },
        { key: 'flowIsolation', title: t('qos.columns.flowIsolation'), dataIndex: 'flowIsolation', width: 120 },
        { key: 'rtt', title: t('qos.columns.rtt'), dataIndex: 'rtt', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'drop-tail': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 120 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'fair-queue': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'hashInterval', title: t('qos.columns.hashInterval'), dataIndex: 'hashInterval', width: 120 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 120 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'fq-codel': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'codelQuantum', title: t('qos.columns.codelQuantum'), dataIndex: 'codelQuantum', width: 120 },
        { key: 'flows', title: t('qos.columns.flows'), dataIndex: 'flows', width: 80 },
        { key: 'interval', title: t('qos.columns.interval'), dataIndex: 'interval', width: 100 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 120 },
        { key: 'target', title: t('qos.columns.target'), dataIndex: 'target', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'network-emulator': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 120 },
        { key: 'delay', title: t('qos.columns.delay'), dataIndex: 'delay', width: 100 },
        { key: 'loss', title: t('qos.columns.loss'), dataIndex: 'loss', width: 100 },
        { key: 'corruption', title: t('qos.columns.corruption'), dataIndex: 'corruption', width: 100 },
        { key: 'duplicate', title: t('qos.columns.duplicate'), dataIndex: 'duplicate', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'rate-control': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 120 },
        { key: 'burst', title: t('qos.columns.burst'), dataIndex: 'burst', width: 100 },
        { key: 'latency', title: t('qos.columns.latency'), dataIndex: 'latency', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      limiter: [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'classCount', title: t('qos.columns.classCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 220, fixed: 'right' },
      ],
      'priority-queue': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'classCount', title: t('qos.columns.classCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'round-robin': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'classCount', title: t('qos.columns.classCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      shaper: [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 120 },
        { key: 'classCount', title: t('qos.columns.classCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'shaper-hfsc': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'classCount', title: t('qos.columns.classCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'random-detect': [
        { key: 'name', title: t('qos.columns.name'), dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 120 },
        { key: 'classCount', title: t('qos.columns.priorityCount'), dataIndex: 'classCount', width: 100 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 200 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
    };

    const classColumnsMap = {
      limiter: [
        { key: 'id', title: t('qos.columns.classId'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 100 },
        { key: 'burst', title: t('qos.columns.burst'), dataIndex: 'burst', width: 80 },
        { key: 'priority', title: t('qos.columns.priority'), dataIndex: 'priority', width: 70 },
        { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 70 },
        { key: 'exceed', title: t('qos.columns.exceed'), dataIndex: 'exceed', width: 80 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'priority-queue': [
        { key: 'id', title: t('qos.columns.priority'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'codelQuantum', title: t('qos.columns.codelQuantum'), dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: t('qos.columns.flows'), dataIndex: 'flows', width: 70 },
        { key: 'interval', title: t('qos.columns.interval'), dataIndex: 'interval', width: 80 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: t('qos.columns.queueType'), dataIndex: 'queueType', width: 90 },
        { key: 'target', title: t('qos.columns.target'), dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'round-robin': [
        { key: 'id', title: t('qos.columns.classId'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'codelQuantum', title: t('qos.columns.codelQuantum'), dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: t('qos.columns.flows'), dataIndex: 'flows', width: 70 },
        { key: 'interval', title: t('qos.columns.interval'), dataIndex: 'interval', width: 80 },
        { key: 'quantum', title: t('qos.columns.quantum'), dataIndex: 'quantum', width: 80 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: t('qos.columns.queueType'), dataIndex: 'queueType', width: 90 },
        { key: 'target', title: t('qos.columns.target'), dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      shaper: [
        { key: 'id', title: t('qos.columns.classId'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'bandwidth', title: t('qos.columns.bandwidth'), dataIndex: 'bandwidth', width: 100 },
        { key: 'burst', title: t('qos.columns.burst'), dataIndex: 'burst', width: 80 },
        { key: 'ceiling', title: t('qos.columns.ceiling'), dataIndex: 'ceiling', width: 80 },
        { key: 'codelQuantum', title: t('qos.columns.codelQuantum'), dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: t('qos.columns.flows'), dataIndex: 'flows', width: 70 },
        { key: 'interval', title: t('qos.columns.interval'), dataIndex: 'interval', width: 80 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: t('qos.columns.queueType'), dataIndex: 'queueType', width: 90 },
        { key: 'target', title: t('qos.columns.target'), dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'shaper-hfsc': [
        { key: 'id', title: t('qos.columns.classId'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'random-detect': [
        { key: 'id', title: t('qos.columns.priority'), dataIndex: 'id', width: 80 },
        { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 120 },
        { key: 'averagePacket', title: t('qos.columns.averagePacket'), dataIndex: 'averagePacket', width: 80 },
        { key: 'markProbability', title: t('qos.columns.markProbability'), dataIndex: 'markProbability', width: 90 },
        { key: 'maximumThreshold', title: t('qos.columns.maximumThreshold'), dataIndex: 'maximumThreshold', width: 90 },
        { key: 'minimumThreshold', title: t('qos.columns.minimumThreshold'), dataIndex: 'minimumThreshold', width: 90 },
        { key: 'queueLimit', title: t('qos.columns.queueLimit'), dataIndex: 'queueLimit', width: 90 },
        { key: 'ruleCount', title: t('qos.columns.ruleCount'), dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
    };

    const classColumns = computed(() => {
      const type = editingPolicy.value?.type || 'limiter';
      return classColumnsMap[type] || classColumnsMap.limiter;
    });

    const ruleColumns = [
      { key: 'name', title: t('qos.columns.ruleName'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('qos.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'protocol', title: t('qos.columns.protocol'), dataIndex: 'protocol', width: 80 },
      { key: 'srcAddress', title: t('qos.columns.srcAddress'), dataIndex: 'srcAddress', width: 120 },
      { key: 'dstAddress', title: t('qos.columns.dstAddress'), dataIndex: 'dstAddress', width: 120 },
      { key: 'actions', title: t('qos.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Rule schema for edit modal
    const ruleSchema = computed(() => {
      return [
        { key: 'name', title: t('qos.columns.ruleName'), type: 'text', required: true },
        { key: 'description', title: t('qos.columns.description'), type: 'text' },
        {
          key: 'ip', title: 'IPv4', type: 'group', children: [
            { key: 'protocol', title: t('qos.columns.protocol'), type: 'select', options: IP_PROTOCOL_OPTIONS, placeholder: t('qos.placeholder.selectProtocol') },
            { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS, placeholder: t('qos.placeholder.selectDscp') },
            { key: 'max-length', title: t('qos.fields.maxLength'), type: 'number', min: 1, max: 65535 },
            {
              key: 'source', title: t('qos.fields.source'), type: 'group', children: [
                { key: 'address', title: t('qos.columns.srcAddress'), type: 'text', placeholder: t('qosPolicy.placeholders.srcNetwork') },
                { key: 'port', title: t('qos.fields.srcPort'), type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'destination', title: t('qos.fields.destination'), type: 'group', children: [
                { key: 'address', title: t('qos.columns.dstAddress'), type: 'text', placeholder: t('qosPolicy.placeholders.dstNetwork') },
                { key: 'port', title: t('qos.fields.dstPort'), type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'tcp', title: t('qos.fields.tcpFlags'), type: 'group', children: [
                { key: 'syn', title: 'SYN', type: 'checkbox', valueless: true },
                { key: 'ack', title: 'ACK', type: 'checkbox', valueless: true },
              ],
            },
          ],
        },
        {
          key: 'ipv6', title: 'IPv6', type: 'group', children: [
            { key: 'protocol', title: t('qos.columns.protocol'), type: 'select', options: IP_PROTOCOL_OPTIONS, placeholder: t('qos.placeholder.selectProtocol') },
            { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS, placeholder: t('qos.placeholder.selectDscp') },
            { key: 'max-length', title: t('qos.fields.maxLength'), type: 'number', min: 1, max: 65535 },
            {
              key: 'source', title: t('qos.fields.source'), type: 'group', children: [
                { key: 'address', title: t('qos.columns.srcAddress'), type: 'text', placeholder: t('qosPolicy.placeholders.srcIpv6Network') },
                { key: 'port', title: t('qos.fields.srcPort'), type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'destination', title: t('qos.fields.destination'), type: 'group', children: [
                { key: 'address', title: t('qos.columns.dstAddress'), type: 'text', placeholder: t('qosPolicy.placeholders.dstIpv6Network') },
                { key: 'port', title: t('qos.fields.dstPort'), type: 'number', min: 1, max: 65535 },
              ],
            },
          ],
        },
        {
          key: 'ether', title: t('qos.fields.ethernet'), type: 'group', children: [
            { key: 'source', title: t('qos.fields.srcMac'), type: 'text', placeholder: t('qosPolicy.placeholders.macAddress') },
            { key: 'destination', title: t('qos.fields.dstMac'), type: 'text', placeholder: t('qosPolicy.placeholders.macAddress') },
            { key: 'protocol', title: t('qos.columns.protocol'), type: 'select', options: ETHER_PROTOCOL_OPTIONS, placeholder: t('qos.placeholder.selectEtherProtocol') },
          ],
        },
        { key: 'interface', title: t('qos.columns.interface'), type: 'select', options: interfaceOptions.value, placeholder: t('qos.placeholder.selectInterface') },
        { key: 'mark', title: 'Mark', type: 'number', min: 0, max: 4294967295 },
        { key: 'vif', title: 'VLAN ID', type: 'number', min: 0, max: 4095 },
      ];
    });

    const tableData = computed(() => {
      const result = [];
      for (const policy of policies.value) {
        const classCount = policy.class ? Object.keys(policy.class).length : 0;
        result.push({
          key: `${policy.type}-${policy.name}`,
          name: policy.name,
          type: policy.type,
          description: policy.description || '',
          bandwidth: policy.bandwidth || '',
          queueLimit: policy['queue-limit'] || '',
          flows: policy.flows || '',
          interval: policy.interval || '',
          target: policy.target || '',
          flowIsolation: policy['flow-isolation'] || '',
          rtt: policy.rtt || '',
          hashInterval: policy['hash-interval'] || '',
          codelQuantum: policy['codel-quantum'] || '',
          delay: policy.delay || '',
          loss: policy.loss || '',
          corruption: policy.corruption || '',
          duplicate: policy.duplicate || '',
          burst: policy.burst || '',
          latency: policy.latency || '',
          classCount,
          ...policy,
        });
      }
      return result;
    });

    const filterTabs = computed(() => {
      return POLICY_TYPES.map(pt => ({ key: pt.value, title: t(pt.label) }));
    });

    const filteredData = computed(() => {
      if (!typeFilter.value) return tableData.value;
      return tableData.value.filter(item => item.type === typeFilter.value);
    });

    const currentSchema = computed(() => {
      if (editingPolicy.value) return getSchemaByType(editingPolicy.value.type, t);
      return getSchemaByType(typeFilter.value || 'cake', t);
    });

    const classSchema = computed(() => {
      if (!editingPolicy.value) return [];
      return getClassSchemaByType(editingPolicy.value.type, t) || [];
    });

    const commandText = computed(() => {
      if (!editingPolicy.value) return '';
      const { name, type, description, bandwidth, ...rest } = editingPolicy.value;
      let cmd = `set qos policy ${type} ${name}`;
      const parts = [];
      if (description) parts.push(`description "${description}"`);
      if (bandwidth) parts.push(`bandwidth ${bandwidth}`);
      // Simple fields only
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null && value !== '' && typeof value !== 'object') {
          parts.push(`${key} ${value}`);
        }
      }
      if (parts.length > 0) {
        cmd += ' ' + parts.join(' ');
      }
      return cmd;
    });

    const classCommandText = computed(() => {
      if (!classModalEditing.value || !editingPolicy.value) return '';
      const { type, name } = editingPolicy.value;
      const c = classModalEditing.value;
      const classKey = type === 'random-detect' ? 'precedence' : 'class';
      let cmd = `set qos policy ${type} ${name} ${classKey} ${c.id}`;
      const parts = [];
      for (const [key, value] of Object.entries(c)) {
        if (key === 'id') continue;
        if (value !== undefined && value !== null && value !== '' && typeof value !== 'object') {
          parts.push(`${key} ${value}`);
        }
      }
      if (parts.length > 0) {
        cmd += ' ' + parts.join(' ');
      }
      return cmd;
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('qos policy');
        const policyData = res.data || {};
        const allPolicies = [];

        for (const type of POLICY_TYPES.map(t => t.value)) {
          if (policyData[type]) {
            for (const [name, config] of Object.entries(policyData[type])) {
              allPolicies.push({
                name,
                type,
                ...config,
              });
            }
          }
        }

        policies.value = allPolicies;

        // Load interfaces
        try {
          const ifRes = await interfaceApi.ethernet();
          const ifaces = ifRes.interfaces || [];
          interfaceOptions.value = ifaces.map(iface => ({
            value: iface.name || iface,
            label: iface.name || iface
          }));
        } catch (e) {
          console.error('Failed to load interfaces:', e);
        }
      } catch (e) {
        showError(e.message || t('qos.error.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function create() {
      editingPolicy.value = {
        name: '',
        type: typeFilter.value || 'cake',
        description: '',
      };
      editingClasses.value = [];
      modalVisible.value = true;
    }

    function edit(record) {
      editingPolicy.value = { ...record };
      
      // Parse default if it's a string
      if (editingPolicy.value.default && typeof editingPolicy.value.default === 'string') {
        try {
          editingPolicy.value.default = JSON.parse(editingPolicy.value.default);
        } catch (e) {
          console.error('Failed to parse default:', e);
        }
      }
      
      // Load existing classes from the policy data
      const policy = policies.value.find(p => p.name === record.name && p.type === record.type);
      editingClasses.value = [];
      if (policy) {
        // Random Detect uses 'precedence', others use 'class'
        const classKey = record.type === 'random-detect' ? 'precedence' : 'class';
        const classes = policy[classKey];
        if (classes) {
          for (const [id, classConfig] of Object.entries(classes)) {
            const cls = { id: Number(id), ...classConfig };
            
            // Parse match if it's a string
            if (cls.match && typeof cls.match === 'string') {
              try {
                cls.match = JSON.parse(cls.match);
              } catch (e) {
                console.error('Failed to parse match:', e);
              }
            }
            
            // Map hyphenated keys to camelCase for table display
            cls.codelQuantum = cls['codel-quantum'] || '';
            cls.queueLimit = cls['queue-limit'] || '';
            cls.queueType = cls['queue-type'] || '';
            cls.averagePacket = cls['average-packet'] || '';
            cls.markProbability = cls['mark-probability'] || '';
            cls.minimumThreshold = cls['minimum-threshold'] || '';
            cls.maximumThreshold = cls['maximum-threshold'] || '';
            cls.setDscp = cls['set-dscp'] || '';
            
            // Count rules from match object
            const ruleCount = cls.match && typeof cls.match === 'object' ? Object.keys(cls.match).length : 0;
            cls.ruleCount = ruleCount;
            editingClasses.value.push(cls);
          }
        }
      }
      modalVisible.value = true;
    }

    async function save() {
      if (!editingPolicy.value) return;
      const { name, type, ...config } = editingPolicy.value;

      try {
        await configApi.set(`qos policy ${type}`, name);

        for (const [key, value] of Object.entries(config)) {
          if (value === undefined || value === null || value === '') continue;

          // Handle nested group fields (ack-filter, linkshare, realtime, upperlimit)
          if (typeof value === 'object' && !Array.isArray(value)) {
            for (const [subKey, subValue] of Object.entries(value)) {
              if (subValue === true) {
                // checkbox valueless
                await configApi.set(`qos policy ${type} ${name} ${key} ${subKey}`, '');
              } else if (subValue !== undefined && subValue !== null && subValue !== '') {
                await configApi.set(`qos policy ${type} ${name} ${key} ${subKey}`, String(subValue));
              }
            }
          } else {
            await configApi.set(`qos policy ${type} ${name} ${key}`, String(value));
          }
        }

        // Save classes
        if (hasClasses(type) && editingClasses.value.length > 0) {
          const classKey = type === 'random-detect' ? 'precedence' : 'class';
          // Delete all existing classes first
          const existingPolicy = policies.value.find(p => p.name === name && p.type === type);
          if (existingPolicy && existingPolicy[classKey]) {
            for (const existingId of Object.keys(existingPolicy[classKey])) {
              await configApi.delete(`qos policy ${type} ${name} ${classKey} ${existingId}`);
            }
          }

          // Save each class
          for (const c of editingClasses.value) {
            if (c.id === null || c.id === undefined) continue;
            await configApi.set(`qos policy ${type} ${name} ${classKey}`, String(c.id));

            for (const [key, value] of Object.entries(c)) {
              if (key === 'id' || value === undefined || value === null || value === '') continue;

              if (typeof value === 'object' && !Array.isArray(value)) {
                for (const [subKey, subValue] of Object.entries(value)) {
                  if (subValue === true) {
                    await configApi.set(`qos policy ${type} ${name} ${classKey} ${c.id} ${key} ${subKey}`, '');
                  } else if (subValue !== undefined && subValue !== null && subValue !== '') {
                    await configApi.set(`qos policy ${type} ${name} ${classKey} ${c.id} ${key} ${subKey}`, String(subValue));
                  }
                }
              } else {
                await configApi.set(`qos policy ${type} ${name} ${classKey} ${c.id} ${key}`, String(value));
              }
            }
          }
        }

        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || t('qosPolicy.errors.saveFailed'));
      }
    }

    // ========== Delete confirm ==========
    const deleteConfirmVisible = ref(false);
    const deleteTargets = ref([]); // [{name, type}]

    async function remove(keys) {
      // DataTable @delete emits array of keys; row action passes a record
      const targets = [];
      if (Array.isArray(keys)) {
        for (const k of keys) {
          const item = tableData.value.find(d => d.key === k);
          if (item) targets.push({ name: item.name, type: item.type });
        }
      } else if (keys && keys.name) {
        targets.push({ name: keys.name, type: keys.type });
      }
      if (!targets.length) return;
      deleteTargets.value = targets;
      deleteConfirmVisible.value = true;
    }

    async function confirmDelete() {
      deleteConfirmVisible.value = false;
      for (const target of deleteTargets.value) {
        try {
          await configApi.delete(`qos policy ${target.type} ${target.name}`);
        } catch (e) {
          showError(t('qos.error.deleteFailed', { name: target.name }) + ': ' + (e.message || e));
        }
      }
      configStore.markPending();
      selected.value = [];
      deleteTargets.value = [];
      await load();
    }

    // ========== Class management ==========

    function origCreateClass() {
      const schema = getClassSchemaByType(editingPolicy.value.type, t);
      const newClass = { id: null, description: '' };
      // Set defaults from schema
      if (schema) {
        for (const field of schema) {
          if (field.key === 'id') continue;
          if (field.type === 'group' && field.children) {
            newClass[field.key] = {};
            for (const child of field.children) {
              newClass[field.key][child.key] = child.type === 'checkbox' ? false : (child.type === 'number' ? null : '');
            }
          } else {
            newClass[field.key] = field.type === 'number' ? null : (field.type === 'checkbox' ? false : '');
          }
        }
      }
      classModalEditing.value = newClass;
      classFormTab.value = 'basic';
    }

    function removeClass(cls) {
      editingClasses.value = editingClasses.value.filter(c => c.id !== cls.id);
    }

    // ========== Rule management (within class) ==========

    function createRule() {
      editingRule.value = {
        name: '',
        description: '',
        ip: { protocol: '', dscp: '', 'max-length': null, source: { address: '', port: null }, destination: { address: '', port: null }, tcp: { syn: false, ack: false } },
        ipv6: { protocol: '', dscp: '', 'max-length': null, source: { address: '', port: null }, destination: { address: '', port: null } },
        ether: { source: '', destination: '', protocol: '' },
        interface: '',
        mark: null,
        vif: null,
      };
      ruleModalVisible.value = true;
    }

    function editRule(rule) {
      // Reconstruct nested structure from flat fields and _ruleConfig
      const ruleConfig = rule._ruleConfig || {};
      editingRule.value = {
        name: rule.name,
        description: rule.description || '',
        ip: {
          protocol: ruleConfig.ip?.protocol || '',
          dscp: ruleConfig.ip?.dscp || '',
          'max-length': ruleConfig.ip?.['max-length'] || null,
          source: {
            address: ruleConfig.ip?.source?.address || '',
            port: ruleConfig.ip?.source?.port || null,
          },
          destination: {
            address: ruleConfig.ip?.destination?.address || '',
            port: ruleConfig.ip?.destination?.port || null,
          },
          tcp: {
            syn: ruleConfig.ip?.tcp?.syn !== undefined ? true : false,
            ack: ruleConfig.ip?.tcp?.ack !== undefined ? true : false,
          },
        },
        ipv6: {
          protocol: ruleConfig.ipv6?.protocol || '',
          dscp: ruleConfig.ipv6?.dscp || '',
          'max-length': ruleConfig.ipv6?.['max-length'] || null,
          source: {
            address: ruleConfig.ipv6?.source?.address || '',
            port: ruleConfig.ipv6?.source?.port || null,
          },
          destination: {
            address: ruleConfig.ipv6?.destination?.address || '',
            port: ruleConfig.ipv6?.destination?.port || null,
          },
        },
        ether: {
          source: ruleConfig.ether?.source || '',
          destination: ruleConfig.ether?.destination || '',
          protocol: ruleConfig.ether?.protocol || '',
        },
        interface: ruleConfig.interface || '',
        mark: ruleConfig.mark !== undefined ? ruleConfig.mark : null,
        vif: ruleConfig.vif !== undefined ? ruleConfig.vif : null,
      };
      ruleModalVisible.value = true;
    }

    function saveRule() {
      if (!editingRule.value || !editingRule.value.name) return;
      const rule = editingRule.value;

      // Build rule config from form data
      const ruleConfig = {};
      if (rule.ip && (rule.ip.protocol || rule.ip.dscp || rule.ip['max-length'] || rule.ip.source?.address || rule.ip.source?.port || rule.ip.destination?.address || rule.ip.destination?.port || rule.ip.tcp?.syn || rule.ip.tcp?.ack)) {
        const ip = {};
        if (rule.ip.protocol) ip.protocol = rule.ip.protocol;
        if (rule.ip.dscp) ip.dscp = rule.ip.dscp;
        if (rule.ip['max-length']) ip['max-length'] = rule.ip['max-length'];
        if (rule.ip.source?.address || rule.ip.source?.port) {
          ip.source = {};
          if (rule.ip.source.address) ip.source.address = rule.ip.source.address;
          if (rule.ip.source.port) ip.source.port = rule.ip.source.port;
        }
        if (rule.ip.destination?.address || rule.ip.destination?.port) {
          ip.destination = {};
          if (rule.ip.destination.address) ip.destination.address = rule.ip.destination.address;
          if (rule.ip.destination.port) ip.destination.port = rule.ip.destination.port;
        }
        if (rule.ip.tcp?.syn || rule.ip.tcp?.ack) {
          ip.tcp = {};
          if (rule.ip.tcp.syn) ip.tcp.syn = '';
          if (rule.ip.tcp.ack) ip.tcp.ack = '';
        }
        ruleConfig.ip = ip;
      }
      if (rule.ipv6 && (rule.ipv6.protocol || rule.ipv6.dscp || rule.ipv6['max-length'] || rule.ipv6.source?.address || rule.ipv6.source?.port || rule.ipv6.destination?.address || rule.ipv6.destination?.port)) {
        const ipv6 = {};
        if (rule.ipv6.protocol) ipv6.protocol = rule.ipv6.protocol;
        if (rule.ipv6.dscp) ipv6.dscp = rule.ipv6.dscp;
        if (rule.ipv6['max-length']) ipv6['max-length'] = rule.ipv6['max-length'];
        if (rule.ipv6.source?.address || rule.ipv6.source?.port) {
          ipv6.source = {};
          if (rule.ipv6.source.address) ipv6.source.address = rule.ipv6.source.address;
          if (rule.ipv6.source.port) ipv6.source.port = rule.ipv6.source.port;
        }
        if (rule.ipv6.destination?.address || rule.ipv6.destination?.port) {
          ipv6.destination = {};
          if (rule.ipv6.destination.address) ipv6.destination.address = rule.ipv6.destination.address;
          if (rule.ipv6.destination.port) ipv6.destination.port = rule.ipv6.destination.port;
        }
        ruleConfig.ipv6 = ipv6;
      }
      if (rule.ether && (rule.ether.source || rule.ether.destination || rule.ether.protocol)) {
        ruleConfig.ether = {};
        if (rule.ether.source) ruleConfig.ether.source = rule.ether.source;
        if (rule.ether.destination) ruleConfig.ether.destination = rule.ether.destination;
        if (rule.ether.protocol) ruleConfig.ether.protocol = rule.ether.protocol;
      }
      if (rule.interface) ruleConfig.interface = rule.interface;
      if (rule.mark !== null && rule.mark !== undefined) ruleConfig.mark = rule.mark;
      if (rule.vif !== null && rule.vif !== undefined) ruleConfig.vif = rule.vif;

      // Extract flat fields for table display
      const flatRule = {
        name: rule.name,
        description: rule.description || '',
        protocol: ruleConfig.ip?.protocol || ruleConfig.ipv6?.protocol || '',
        srcAddress: ruleConfig.ip?.source?.address || ruleConfig.ipv6?.source?.address || '',
        dstAddress: ruleConfig.ip?.destination?.address || ruleConfig.ipv6?.destination?.address || '',
        _ruleConfig: ruleConfig, // Store full config for saving
      };

      const idx = editingRules.value.findIndex(r => r.name === rule.name);
      if (idx >= 0) {
        editingRules.value[idx] = flatRule;
      } else {
        editingRules.value.push(flatRule);
      }
      ruleModalVisible.value = false;
    }

    function removeRule(rule) {
      editingRules.value = editingRules.value.filter(r => r.name !== rule.name);
    }

    // Override createClass to also reset rules
    function createClass() {
      origCreateClass();
      editingRules.value = [];
      classModalVisible.value = true;
    }

    // Update class edit to load rules from match object
    function editClass(cls) {
      classModalEditing.value = { ...cls };
      classFormTab.value = 'basic';
      // Load rules from match object
      editingRules.value = [];
      
      let match = cls.match;
      // Parse match if it's a string
      if (match && typeof match === 'string') {
        try {
          match = JSON.parse(match);
        } catch (e) {
          console.error('Failed to parse match:', e);
          match = null;
        }
      }
      
      if (match && typeof match === 'object') {
        for (const [ruleName, ruleConfig] of Object.entries(match)) {
          const flatRule = {
            name: ruleName,
            description: ruleConfig.description || '',
            protocol: ruleConfig.ip?.protocol || ruleConfig.ipv6?.protocol || '',
            srcAddress: ruleConfig.ip?.source?.address || ruleConfig.ipv6?.source?.address || '',
            dstAddress: ruleConfig.ip?.destination?.address || ruleConfig.ipv6?.destination?.address || '',
            _ruleConfig: ruleConfig,
          };
          editingRules.value.push(flatRule);
        }
      }
      
      classModalVisible.value = true;
    }

    // Update saveClass to save rules into match object
    function saveClass() {
      if (!classModalEditing.value || !editingPolicy.value) return;
      const c = classModalEditing.value;

      // Build match object from rules
      const match = {};
      for (const rule of editingRules.value) {
        if (rule._ruleConfig) {
          match[rule.name] = rule._ruleConfig;
        }
      }
      c.match = Object.keys(match).length > 0 ? match : undefined;

      // Save locally
      if (c.id !== null && c.id !== undefined) {
        const idx = editingClasses.value.findIndex(cl => cl.id === c.id);
        const ruleCount = Object.keys(match).length;
        c.ruleCount = ruleCount;
        if (idx >= 0) {
          editingClasses.value[idx] = { ...c };
        } else {
          editingClasses.value.push({ ...c });
        }
      }
      classModalEditing.value = null;
      editingRules.value = [];
      classModalVisible.value = false;
    }

    // Format match rule for display
    function formatMatchRule(match) {
      if (!match) return '';
      // If it's a string (JSON), parse it
      if (typeof match === 'string') {
        try {
          match = JSON.parse(match);
        } catch (e) {
          return match;
        }
      }
      if (typeof match !== 'object') return '';

      const parts = [];
      for (const [ruleName, ruleConfig] of Object.entries(match)) {
        if (!ruleConfig || typeof ruleConfig !== 'object') continue;
        parts.push(t('qos.match.rule') + ': ' + ruleName);
        if (ruleConfig.ip) {
          const ip = ruleConfig.ip;
          if (ip.destination?.address) parts.push(t('qos.match.dstAddress') + ': ' + ip.destination.address);
          if (ip.destination?.port) parts.push(t('qos.match.dstPort') + ': ' + ip.destination.port);
          if (ip.source?.address) parts.push(t('qos.match.srcAddress') + ': ' + ip.source.address);
          if (ip.source?.port) parts.push(t('qos.match.srcPort') + ': ' + ip.source.port);
          if (ip.dscp) parts.push('DSCP: ' + ip.dscp);
          if (ip.protocol) parts.push(t('qos.match.protocol') + ': ' + ip.protocol);
          if (ip['max-length']) parts.push(t('qos.match.maxLength') + ': ' + ip['max-length']);
          if (ip.tcp) {
            const flags = Object.keys(ip.tcp).filter(k => ip.tcp[k] === '' || ip.tcp[k] === true);
            if (flags.length) parts.push(t('qos.match.tcpFlags') + ': ' + flags.join(', '));
          }
        }
        if (ruleConfig.ipv6) {
          const ipv6 = ruleConfig.ipv6;
          if (ipv6.destination?.address) parts.push(t('qos.match.ipv6Dst') + ': ' + ipv6.destination.address);
          if (ipv6.destination?.port) parts.push(t('qos.match.ipv6DstPort') + ': ' + ipv6.destination.port);
          if (ipv6.source?.address) parts.push(t('qos.match.ipv6Src') + ': ' + ipv6.source.address);
          if (ipv6.source?.port) parts.push(t('qos.match.ipv6SrcPort') + ': ' + ipv6.source.port);
          if (ipv6.dscp) parts.push('DSCP: ' + ipv6.dscp);
          if (ipv6.protocol) parts.push(t('qos.match.protocol') + ': ' + ipv6.protocol);
        }
        if (ruleConfig.ether) {
          const ether = ruleConfig.ether;
          if (ether.destination) parts.push(t('qos.match.etherDst') + ': ' + ether.destination);
          if (ether.source) parts.push(t('qos.match.etherSrc') + ': ' + ether.source);
          if (ether.protocol) parts.push(t('qos.match.etherProtocol') + ': ' + ether.protocol);
        }
        if (ruleConfig.interface) parts.push(t('qos.match.interface') + ': ' + ruleConfig.interface);
        if (ruleConfig.mark !== undefined) parts.push('Mark: ' + ruleConfig.mark);
        if (ruleConfig.vif !== undefined) parts.push('VLAN: ' + ruleConfig.vif);
      }
      return parts.join(' | ');
    }

    function getClassFormTabs() {
      const type = editingPolicy.value?.type;
      if (type === 'shaper-hfsc') {
        return [
          { key: 'basic', title: t('qos.tabs.basic') },
          { key: 'linkshare', title: 'Linkshare' },
          { key: 'realtime', title: 'Realtime' },
          { key: 'upperlimit', title: 'Upperlimit' },
        ];
      }
      return [{ key: 'basic', title: t('qos.tabs.basic') }];
    }

    function getClassFormSchema(tabKey) {
      if (!classModalEditing.value || !editingPolicy.value) return [];
      const type = editingPolicy.value.type;
      const schema = getClassSchemaByType(type, t);
      if (!schema) return [];

      if (tabKey === 'basic') {
        return schema.filter(f => f.type !== 'group');
      }
      // For shaper-hfsc tabs
      return schema.filter(f => f.type === 'group' && f.key === tabKey);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, tableData, filteredData, POLICY_COLUMNS, selected, modalVisible, editingPolicy, typeFilter,
      filterTabs, currentSchema, commandText, dataTableRef, POLICY_TYPES,
      editingClasses, classModalEditing, classModalVisible, classFormTab,
      editingRules, ruleModalVisible, editingRule,
      interfaceOptions,
      classColumns, ruleColumns, classSchema, classCommandText,
      deleteConfirmVisible, deleteTargets, confirmDelete,
      load, create, edit, save, remove,
      createClass, editClass, saveClass, removeClass, formatMatchRule,
      createRule, editRule, saveRule, removeRule,
      getClassFormTabs, getClassFormSchema, hasClasses, ruleSchema,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="typeFilter" :tabs="filterTabs" @change="selected = []">
        <template v-for="pt in POLICY_TYPES" :key="pt.value" #[pt.value]>
          <DataTable
            rowKey="key"
            :columns="POLICY_COLUMNS[pt.value]"
            :data="filteredData"
            :loading="loading"
            :selectedKeys="selected"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @create="create"
            @edit="edit"
            @delete="remove"
            @refresh="load"
            @selection-change="(keys) => selected = keys"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="edit(record)" style="margin-right: 8px">{{ t('qos.buttons.edit') }}</a>
                <a @click="remove(record)" style="color: #ff4d4f">{{ t('qos.buttons.delete') }}</a>
              </template>
            </template>
          </DataTable>
        </template>
      </TabGroup>

      <!-- Policy create/edit modal -->
      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingPolicy && tableData.find(d => d.key === editingPolicy.key) ? t('qos.modal.editPolicy') : t('qos.modal.createPolicy')"
        @confirm="save"
        @close="modalVisible = false"
        width="900"
      >
        <ConfigForm v-if="editingPolicy" v-model="editingPolicy" :schema="currentSchema" />

        <!-- Class management section (for policies with classes) -->
        <div v-if="editingPolicy && hasClasses(editingPolicy.type)" style="margin-top: 20px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
          <h4 style="margin: 0 0 12px 0;">{{ editingPolicy.type === 'random-detect' ? t('qos.sections.priorityManagement') : t('qos.sections.classManagement') }}</h4>
          <DataTable
            rowKey="id"
            :columns="classColumns"
            :data="editingClasses"
            :actions="['create', 'edit', 'delete']"
            @create="createClass"
            @edit="editClass"
            @delete="removeClass"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editClass(record)" style="margin-right: 8px">{{ t('qos.buttons.edit') }}</a>
                <a @click="removeClass(record)" style="color: #ff4d4f">{{ t('qos.buttons.delete') }}</a>
              </template>
            </template>
          </DataTable>
        </div>
      </DraggableModal>

      <!-- Class edit modal -->
      <DraggableModal
        v-model:visible="classModalVisible"
        :title="classModalEditing && editingClasses.find(c => c.id === classModalEditing.id) ? t('qos.modal.editClass') : t('qos.modal.createClass')"
        @confirm="saveClass"
        @close="classModalVisible = false"
        width="900"
      >
        <div v-if="classModalEditing">
          <div v-if="getClassFormTabs().length > 1" style="margin-bottom: 12px;">
            <TabGroup v-model="classFormTab" :tabs="getClassFormTabs()">
              <template v-for="tab in getClassFormTabs()" :key="tab.key" #[tab.key]>
                <ConfigForm v-model="classModalEditing" :schema="getClassFormSchema(tab.key)" />
              </template>
            </TabGroup>
          </div>
          <ConfigForm v-else v-model="classModalEditing" :schema="classSchema" />

          <!-- Rule management section (not for random-detect) -->
          <div v-if="editingPolicy.type !== 'random-detect'" style="margin-top: 20px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
            <h4 style="margin: 0 0 12px 0;">{{ t('qos.sections.ruleManagement') }}</h4>
            <DataTable
              rowKey="name"
              :columns="ruleColumns"
              :data="editingRules"
              :actions="['create', 'edit', 'delete']"
              @create="createRule"
              @edit="editRule"
              @delete="removeRule"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'actions'">
                  <a @click="editRule(record)" style="margin-right: 8px">{{ t('qos.buttons.edit') }}</a>
                  <a @click="removeRule(record)" style="color: #ff4d4f">{{ t('qos.buttons.delete') }}</a>
                </template>
              </template>
            </DataTable>
            <div v-if="editingRules.length === 0" style="text-align: center; color: #999; padding: 20px;">{{ t('qos.messages.noRules') }}</div>
          </div>
        </div>
      </DraggableModal>

      <!-- Rule edit modal -->
      <DraggableModal
        v-model:visible="ruleModalVisible"
        :title="editingRule ? t('qos.modal.editRule') : t('qos.modal.createRule')"
        @confirm="saveRule"
        @close="ruleModalVisible = false"
        width="700"
      >
        <ConfigForm v-if="editingRule" v-model="editingRule" :schema="ruleSchema" />
      </DraggableModal>

      <!-- Delete confirmation modal -->
      <DraggableModal
        v-model:visible="deleteConfirmVisible"
        :title="t('qos.modal.confirmDelete')"
        @confirm="confirmDelete"
        @close="deleteConfirmVisible = false"
        width="400"
      >
        <p style="margin-bottom: 12px;">{{ t('qos.messages.confirmDeletePolicy') }}</p>
        <ul style="margin: 0; padding-left: 20px;">
          <li v-for="target in deleteTargets" :key="target.name + target.type">{{ target.name }} ({{ target.type }})</li>
        </ul>
      </DraggableModal>
    </div>
  `,
});
