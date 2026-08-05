import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const POLICY_TYPES = [
  { value: 'cake', label: 'CAKE' },
  { value: 'drop-tail', label: 'Drop Tail (FIFO)' },
  { value: 'fair-queue', label: 'Fair Queue (SFQ)' },
  { value: 'fq-codel', label: 'FQ-CoDel' },
  { value: 'limiter', label: 'Limiter (流量限制)' },
  { value: 'network-emulator', label: 'Network Emulator (网络仿真)' },
  { value: 'priority-queue', label: 'Priority Queue (优先级队列)' },
  { value: 'random-detect', label: 'Random Detect (WRED)' },
  { value: 'rate-control', label: 'Rate Control (速率控制)' },
  { value: 'round-robin', label: 'Round Robin (轮询)' },
  { value: 'shaper', label: 'Shaper (HTB 整形)' },
  { value: 'shaper-hfsc', label: 'Shaper HFSC' },
];

const FLOW_ISOLATION_OPTIONS = [
  { value: 'blind', label: 'blind (无流隔离)' },
  { value: 'src-host', label: 'src-host (按源主机)' },
  { value: 'dst-host', label: 'dst-host (按目标主机)' },
  { value: 'host', label: 'host (按主机对)' },
  { value: 'flow', label: 'flow (按5元组流)' },
  { value: 'dual-src-host', label: 'dual-src-host (双源主机)' },
  { value: 'dual-dst-host', label: 'dual-dst-host (双目标主机)' },
  { value: 'triple-isolate', label: 'triple-isolate (三向隔离，默认)' },
];

const EXCEED_OPTIONS = [
  { value: 'continue', label: 'continue (继续)' },
  { value: 'drop', label: 'drop (丢弃，默认)' },
  { value: 'ok', label: 'ok (接受)' },
  { value: 'reclassify', label: 'reclassify (重新分类)' },
  { value: 'pipe', label: 'pipe (管道)' },
];

const QUEUE_TYPE_OPTIONS = [
  { value: 'drop-tail', label: 'drop-tail (默认)' },
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
  { value: 'AF11', label: 'AF11 (高吞吐量数据)' },
  { value: 'AF12', label: 'AF12 (高吞吐量数据)' },
  { value: 'AF13', label: 'AF13 (高吞吐量数据)' },
  { value: 'AF21', label: 'AF21 (低延迟数据)' },
  { value: 'AF22', label: 'AF22 (低延迟数据)' },
  { value: 'AF23', label: 'AF23 (低延迟数据)' },
  { value: 'AF31', label: 'AF31 (多媒体流)' },
  { value: 'AF32', label: 'AF32 (多媒体流)' },
  { value: 'AF33', label: 'AF33 (多媒体流)' },
  { value: 'AF41', label: 'AF41 (多媒体会议)' },
  { value: 'AF42', label: 'AF42 (多媒体会议)' },
  { value: 'AF43', label: 'AF43 (多媒体会议)' },
  { value: 'CS1', label: 'CS1 (低优先级数据)' },
  { value: 'CS2', label: 'CS2 (OAM)' },
  { value: 'CS3', label: 'CS3 (广播视频)' },
  { value: 'CS4', label: 'CS4 (实时交互)' },
  { value: 'CS5', label: 'CS5 (信令)' },
  { value: 'CS6', label: 'CS6 (网络控制)' },
  { value: 'CS7', label: 'CS7' },
  { value: 'EF', label: 'EF (加速转发)' },
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
  { value: 'all', label: 'all (任意协议)' },
  { value: 'ip', label: 'ip (IPv4)' },
  { value: 'ipv6', label: 'ipv6 (IPv6)' },
  { value: 'arp', label: 'arp' },
  { value: 'atalk', label: 'atalk (AppleTalk)' },
  { value: 'ipx', label: 'ipx (Novell IPX)' },
  { value: '802.1Q', label: '802.1Q (VLAN 标签)' },
  { value: '802_2', label: '802_2 (IEEE 802.2)' },
  { value: '802_3', label: '802_3 (IEEE 802.3)' },
  { value: 'aarp', label: 'aarp (AppleTalk ARP)' },
  { value: 'aoe', label: 'aoe (ATA over Ethernet)' },
  { value: 'dec', label: 'dec (DECnet)' },
  { value: 'lat', label: 'lat (Local Area Transport)' },
  { value: 'localtalk', label: 'localtalk (Apple LocalTalk)' },
  { value: 'rarp', label: 'rarp (反向 ARP)' },
  { value: 'snap', label: 'snap (子网访问协议)' },
  { value: 'x25', label: 'x25 (X.25 分组交换)' },
];

const BANDWIDTH_HELP = '支持: 100mbit, 1gbit, 50%, 1000kbit 等';

// ========== Schema definitions per policy type ==========

function cakeSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 100mbit, 1gbit, 50%', help: BANDWIDTH_HELP },
    {
      key: 'ack-filter', title: 'ACK 过滤', type: 'group', children: [
        { key: 'aggressive', title: '激进模式', type: 'checkbox', valueless: true, help: '更积极地压缩/过滤 ACK 包' },
      ],
    },
    { key: 'flow-isolation', title: '流隔离模式', type: 'select', options: FLOW_ISOLATION_OPTIONS, help: '默认: triple-isolate' },
    { key: 'flow-isolation-nat', title: 'NAT 流隔离', type: 'checkbox', valueless: true, help: '在流隔离前执行 NAT 查找' },
    { key: 'no-split-gso', title: '不拆分 GSO', type: 'checkbox', valueless: true, help: '不将 GSO 大包拆分为线包' },
    { key: 'rtt', title: 'RTT (ms)', type: 'number', min: 1, max: 1000000000, placeholder: '1-1000000000', help: '默认: 100' },
  ];
}

function dropTailSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: '队列大小（包数）' },
  ];
}

function fairQueueSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'hash-interval', title: '哈希间隔 (s)', type: 'number', min: 0, max: 2147483647, placeholder: '0 或 1-2147483647', help: '0=无扰动, 默认: 0, 建议: 10' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, max: 127, placeholder: '1-127', help: '默认: 127' },
  ];
}

function fqCodelSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514 (字节)' },
    { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
    { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 2, max: 10999, placeholder: '2-10999', help: '默认: 10240' },
    { key: 'target', title: '目标延迟 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 5' },
  ];
}

function networkEmulatorSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 100mbit', help: BANDWIDTH_HELP },
    { key: 'corruption', title: '误码率 (%)', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '随机位置出错的包百分比' },
    { key: 'delay', title: '延迟 (ms)', type: 'number', min: 0, placeholder: '毫秒', help: '出站包延迟' },
    { key: 'duplicate', title: '重复率 (%)', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '重复包百分比' },
    { key: 'loss', title: '丢包率 (%)', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '独立丢包概率' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, placeholder: '最大队列大小' },
    { key: 'reordering', title: '重排序率 (%)', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '模拟包重排序百分比' },
  ];
}

function rateControlSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 100mbit', help: BANDWIDTH_HELP },
    { key: 'burst', title: '突发大小', type: 'text', placeholder: '如 15k, 1mb', help: '默认: 15k (字节)' },
    { key: 'latency', title: '最大延迟 (ms)', type: 'number', min: 0, placeholder: '毫秒', help: '默认: 50' },
  ];
}

// ========== Complex policies with classes ==========

function limiterTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    {
      key: 'default', title: '默认类', type: 'group', children: [
        { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 100mbit', help: BANDWIDTH_HELP },
        { key: 'burst', title: '突发大小', type: 'text', placeholder: '如 15k, 1mb', help: '默认: 15k (字节)' },
        { key: 'exceed', title: '超限动作', type: 'select', options: EXCEED_OPTIONS, help: '默认: drop' },
        { key: 'mtu', title: 'MTU', type: 'number', min: 256, max: 65535, placeholder: '256-65535' },
        { key: 'not-exceed', title: '未超限动作', type: 'select', options: [
          { value: 'continue', label: 'continue (继续)' },
          { value: 'drop', label: 'drop (丢弃)' },
          { value: 'ok', label: 'ok (接受，默认)' },
          { value: 'reclassify', label: 'reclassify (重新分类)' },
          { value: 'pipe', label: 'pipe (管道)' },
        ], help: '默认: ok' },
      ],
    },
  ];
}

function limiterClassSchema() {
  return [
    { key: 'id', title: '类 ID', type: 'number', min: 1, max: 4090, required: true, placeholder: '1-4090' },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 100mbit', help: BANDWIDTH_HELP },
    { key: 'burst', title: '突发大小', type: 'text', placeholder: '如 15k, 1mb', help: '默认: 15k (字节)' },
    { key: 'exceed', title: '超限动作', type: 'select', options: EXCEED_OPTIONS, help: '默认: drop' },
    { key: 'not-exceed', title: '未超限动作', type: 'select', options: [
      { value: 'continue', label: 'continue (继续)' },
      { value: 'drop', label: 'drop (丢弃)' },
      { value: 'ok', label: 'ok (接受，默认)' },
      { value: 'reclassify', label: 'reclassify (重新分类)' },
      { value: 'pipe', label: 'pipe (管道)' },
    ], help: '默认: ok' },
    { key: 'match-group', title: '过滤组', type: 'text', placeholder: '过滤组名称', help: 'QoS 策略的过滤组' },
    { key: 'mtu', title: 'MTU', type: 'number', min: 256, max: 65535, placeholder: '256-65535' },
    { key: 'priority', title: '优先级', type: 'number', min: 0, max: 20, placeholder: '0-20', help: '默认: 20' },
  ];
}

function priorityQueueTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    {
      key: 'default', title: '默认类', type: 'group', children: [
        { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514' },
        { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
        { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
        { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: '默认: 最大队列大小' },
        { key: 'queue-type', title: '队列类型', type: 'select', options: QUEUE_TYPE_OPTIONS, help: '默认: drop-tail' },
        { key: 'target', title: '目标延迟 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 5' },
      ],
    },
  ];
}

function priorityQueueClassSchema() {
  return [
    { key: 'id', title: '优先级', type: 'number', min: 1, max: 7, required: true, placeholder: '1-7' },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514' },
    { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
    { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
    { key: 'match-group', title: '过滤组', type: 'text', placeholder: '过滤组名称', help: 'QoS 策略的过滤组' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, placeholder: '最大队列大小' },
    { key: 'queue-type', title: '队列类型', type: 'select', options: QUEUE_TYPE_OPTIONS, help: '默认: drop-tail' },
    { key: 'target', title: '目标延迟 (ms)', type: 'number', min: 0, placeholder: '最小持续队列延迟', help: '默认: 5' },
  ];
}

function roundRobinTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
  ];
}

function roundRobinClassSchema() {
  return [
    { key: 'id', title: '类 ID', type: 'number', min: 1, max: 4095, required: true, placeholder: '1-4095' },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514' },
    { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
    { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
    { key: 'quantum', title: '调度量子', type: 'number', min: 1, placeholder: '包调度量子值' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, placeholder: '最大队列大小' },
    { key: 'queue-type', title: '队列类型', type: 'select', options: QUEUE_TYPE_OPTIONS, help: '默认: drop-tail' },
    { key: 'target', title: '目标延迟 (ms)', type: 'number', min: 0, placeholder: '最小持续队列延迟', help: '默认: 5' },
  ];
}

function shaperTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 auto, 100mbit', help: '默认: auto, ' + BANDWIDTH_HELP },
  ];
}

function shaperClassSchema() {
  return [
    { key: 'id', title: '类 ID', type: 'number', min: 2, max: 4095, required: true, placeholder: '2-4095' },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'average-packet', title: '平均包大小', type: 'number', min: 16, max: 10240, placeholder: '16-10240', help: '默认: 1024 (字节)' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 auto, 100mbit', help: '默认: auto' },
    { key: 'burst', title: '突发大小', type: 'text', placeholder: '如 15k, 1mb', help: '默认: 15k (字节)' },
    { key: 'ceiling', title: '带宽上限', type: 'text', placeholder: '如 100mbit', help: '该类带宽上限' },
    { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514' },
    { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
    { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
    { key: 'mark-probability', title: '标记概率', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '默认: 10' },
    { key: 'maximum-threshold', title: '最大阈值', type: 'number', min: 0, placeholder: '随机检测最大阈值', help: '默认: 18' },
    { key: 'minimum-threshold', title: '最小阈值', type: 'number', min: 0, placeholder: '随机检测最小阈值' },
    { key: 'priority', title: '优先级', type: 'number', min: 0, placeholder: '规则评估优先级' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, placeholder: '最大队列大小' },
    { key: 'queue-type', title: '队列类型', type: 'select', options: [
      { value: 'fq-codel', label: 'fq-codel (默认)' },
      { value: 'drop-tail', label: 'drop-tail' },
    ], help: '默认: fq-codel' },
    { key: 'set-dscp', title: '设置 DSCP', type: 'text', placeholder: 'DSCP 值', help: '修改 IP 头 DiffServ 字段' },
    { key: 'target', title: '目标延迟 (ms)', type: 'number', min: 0, placeholder: '最小持续队列延迟', help: '默认: 5' },
  ];
}

function shaperHfscTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 auto, 100mbit', help: '默认: auto, ' + BANDWIDTH_HELP },
  ];
}

function shaperHfscClassSchema() {
  return [
    { key: 'id', title: '类 ID', type: 'number', min: 1, max: 4095, required: true, placeholder: '1-4095' },
    { key: 'description', title: '描述', type: 'text' },
    {
      key: 'linkshare', title: 'Linkshare (带宽共享)', type: 'group', children: [
        { key: 'd', title: '延迟 (ms)', type: 'number', min: 0, placeholder: '服务曲线延迟' },
        { key: 'm1', title: 'M1 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '初始速率' },
        { key: 'm2', title: 'M2 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '稳定速率' },
      ],
    },
    {
      key: 'realtime', title: 'Realtime (实时)', type: 'group', children: [
        { key: 'd', title: '延迟 (ms)', type: 'number', min: 0, placeholder: '服务曲线延迟' },
        { key: 'm1', title: 'M1 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '初始速率' },
        { key: 'm2', title: 'M2 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '稳定速率' },
      ],
    },
    {
      key: 'upperlimit', title: 'Upperlimit (上限)', type: 'group', children: [
        { key: 'd', title: '延迟 (ms)', type: 'number', min: 0, placeholder: '服务曲线延迟' },
        { key: 'm1', title: 'M1 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '初始速率' },
        { key: 'm2', title: 'M2 速率', type: 'text', placeholder: '如 100kbit, 50%', help: '稳定速率' },
      ],
    },
  ];
}

function randomDetectTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'bandwidth', title: '带宽', type: 'text', placeholder: '如 auto, 100mbit', help: '默认: auto, ' + BANDWIDTH_HELP },
  ];
}

function randomDetectPrecedenceSchema() {
  return [
    { key: 'id', title: 'IP 优先级', type: 'number', min: 0, max: 7, required: true, placeholder: '0-7' },
    { key: 'average-packet', title: '平均包大小', type: 'number', min: 16, max: 10240, placeholder: '16-10240', help: '默认: 1024 (字节)' },
    { key: 'mark-probability', title: '标记概率', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 10 (1/N)' },
    { key: 'maximum-threshold', title: '最大阈值', type: 'number', min: 0, max: 4096, placeholder: '0-4096', help: '默认: 18 (包)' },
    { key: 'minimum-threshold', title: '最小阈值', type: 'number', min: 0, max: 4096, placeholder: '0-4096', help: '随机检测最小阈值' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, max: 4294967295, placeholder: '1-4294967295', help: '队列大小 (包)' },
  ];
}

// ========== Helper: get schema by type ==========

function getSchemaByType(type) {
  switch (type) {
    case 'cake': return cakeSchema();
    case 'drop-tail': return dropTailSchema();
    case 'fair-queue': return fairQueueSchema();
    case 'fq-codel': return fqCodelSchema();
    case 'network-emulator': return networkEmulatorSchema();
    case 'rate-control': return rateControlSchema();
    case 'limiter': return limiterTopSchema();
    case 'priority-queue': return priorityQueueTopSchema();
    case 'round-robin': return roundRobinTopSchema();
    case 'shaper': return shaperTopSchema();
    case 'shaper-hfsc': return shaperHfscTopSchema();
    case 'random-detect': return randomDetectTopSchema();
    default: return [
      { key: 'name', title: '策略名称', type: 'text', required: true },
      { key: 'description', title: '描述', type: 'text' },
    ];
  }
}

function getClassSchemaByType(type) {
  switch (type) {
    case 'limiter': return limiterClassSchema();
    case 'priority-queue': return priorityQueueClassSchema();
    case 'round-robin': return roundRobinClassSchema();
    case 'shaper': return shaperClassSchema();
    case 'shaper-hfsc': return shaperHfscClassSchema();
    case 'random-detect': return randomDetectPrecedenceSchema();
    default: return null;
  }
}

function hasClasses(type) {
  return ['limiter', 'priority-queue', 'round-robin', 'shaper', 'shaper-hfsc', 'random-detect'].includes(type);
}

// ========== Component ==========

export default defineComponent({
  name: 'QosPolicyPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
  setup() {
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
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
        { key: 'flowIsolation', title: '流隔离', dataIndex: 'flowIsolation', width: 120 },
        { key: 'rtt', title: 'RTT(ms)', dataIndex: 'rtt', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'drop-tail': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 120 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'fair-queue': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'hashInterval', title: '哈希间隔', dataIndex: 'hashInterval', width: 120 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 120 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'fq-codel': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'codelQuantum', title: 'CoDel量子', dataIndex: 'codelQuantum', width: 120 },
        { key: 'flows', title: '流数', dataIndex: 'flows', width: 80 },
        { key: 'interval', title: '间隔', dataIndex: 'interval', width: 100 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 120 },
        { key: 'target', title: '目标', dataIndex: 'target', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'network-emulator': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
        { key: 'delay', title: '延迟', dataIndex: 'delay', width: 100 },
        { key: 'loss', title: '丢包率', dataIndex: 'loss', width: 100 },
        { key: 'corruption', title: '损坏率', dataIndex: 'corruption', width: 100 },
        { key: 'duplicate', title: '重复率', dataIndex: 'duplicate', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'rate-control': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
        { key: 'burst', title: '突发', dataIndex: 'burst', width: 100 },
        { key: 'latency', title: '延迟', dataIndex: 'latency', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      limiter: [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'classCount', title: '类数量', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 220, fixed: 'right' },
      ],
      'priority-queue': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'classCount', title: '类数量', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'round-robin': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'classCount', title: '类数量', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      shaper: [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
        { key: 'classCount', title: '类数量', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'shaper-hfsc': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'classCount', title: '类数量', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
      'random-detect': [
        { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
        { key: 'classCount', title: '优先级数', dataIndex: 'classCount', width: 100 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
      ],
    };

    const classColumnsMap = {
      limiter: [
        { key: 'id', title: '类 ID', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 100 },
        { key: 'burst', title: '突发', dataIndex: 'burst', width: 80 },
        { key: 'priority', title: '优先级', dataIndex: 'priority', width: 70 },
        { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 70 },
        { key: 'exceed', title: '超限动作', dataIndex: 'exceed', width: 80 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'priority-queue': [
        { key: 'id', title: '优先级', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'codelQuantum', title: 'CoDel量子', dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: '流数', dataIndex: 'flows', width: 70 },
        { key: 'interval', title: '间隔', dataIndex: 'interval', width: 80 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: '队列类型', dataIndex: 'queueType', width: 90 },
        { key: 'target', title: '目标延迟', dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'round-robin': [
        { key: 'id', title: '类 ID', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'codelQuantum', title: 'CoDel量子', dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: '流数', dataIndex: 'flows', width: 70 },
        { key: 'interval', title: '间隔', dataIndex: 'interval', width: 80 },
        { key: 'quantum', title: '量子', dataIndex: 'quantum', width: 80 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: '队列类型', dataIndex: 'queueType', width: 90 },
        { key: 'target', title: '目标延迟', dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      shaper: [
        { key: 'id', title: '类 ID', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 100 },
        { key: 'burst', title: '突发', dataIndex: 'burst', width: 80 },
        { key: 'ceiling', title: '上限', dataIndex: 'ceiling', width: 80 },
        { key: 'codelQuantum', title: 'CoDel量子', dataIndex: 'codelQuantum', width: 100 },
        { key: 'flows', title: '流数', dataIndex: 'flows', width: 70 },
        { key: 'interval', title: '间隔', dataIndex: 'interval', width: 80 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 90 },
        { key: 'queueType', title: '队列类型', dataIndex: 'queueType', width: 90 },
        { key: 'target', title: '目标延迟', dataIndex: 'target', width: 80 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'shaper-hfsc': [
        { key: 'id', title: '类 ID', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
      'random-detect': [
        { key: 'id', title: '优先级', dataIndex: 'id', width: 80 },
        { key: 'description', title: '描述', dataIndex: 'description', width: 120 },
        { key: 'averagePacket', title: '平均包', dataIndex: 'averagePacket', width: 80 },
        { key: 'markProbability', title: '标记概率', dataIndex: 'markProbability', width: 90 },
        { key: 'maximumThreshold', title: '最大阈值', dataIndex: 'maximumThreshold', width: 90 },
        { key: 'minimumThreshold', title: '最小阈值', dataIndex: 'minimumThreshold', width: 90 },
        { key: 'queueLimit', title: '队列限制', dataIndex: 'queueLimit', width: 90 },
        { key: 'ruleCount', title: '规则数量', dataIndex: 'ruleCount', width: 80 },
        { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
      ],
    };

    const classColumns = computed(() => {
      const type = editingPolicy.value?.type || 'limiter';
      return classColumnsMap[type] || classColumnsMap.limiter;
    });

    const ruleColumns = [
      { key: 'name', title: '规则名称', dataIndex: 'name', width: 120 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'protocol', title: '协议', dataIndex: 'protocol', width: 80 },
      { key: 'srcAddress', title: '源地址', dataIndex: 'srcAddress', width: 120 },
      { key: 'dstAddress', title: '目标地址', dataIndex: 'dstAddress', width: 120 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Rule schema for edit modal
    const ruleSchema = computed(() => {
      return [
        { key: 'name', title: '规则名称', type: 'text', required: true },
        { key: 'description', title: '描述', type: 'text' },
        {
          key: 'ip', title: 'IPv4', type: 'group', children: [
            { key: 'protocol', title: '协议', type: 'select', options: IP_PROTOCOL_OPTIONS, placeholder: '选择协议' },
            { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS, placeholder: '选择 DSCP 值' },
            { key: 'max-length', title: '最大长度', type: 'number', min: 1, max: 65535 },
            {
              key: 'source', title: '源', type: 'group', children: [
                { key: 'address', title: '源地址', type: 'text', placeholder: '如 192.168.1.0/24' },
                { key: 'port', title: '源端口', type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'destination', title: '目标', type: 'group', children: [
                { key: 'address', title: '目标地址', type: 'text', placeholder: '如 10.0.0.0/8' },
                { key: 'port', title: '目标端口', type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'tcp', title: 'TCP 标志', type: 'group', children: [
                { key: 'syn', title: 'SYN', type: 'checkbox', valueless: true },
                { key: 'ack', title: 'ACK', type: 'checkbox', valueless: true },
              ],
            },
          ],
        },
        {
          key: 'ipv6', title: 'IPv6', type: 'group', children: [
            { key: 'protocol', title: '协议', type: 'select', options: IP_PROTOCOL_OPTIONS, placeholder: '选择协议' },
            { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS, placeholder: '选择 DSCP 值' },
            { key: 'max-length', title: '最大长度', type: 'number', min: 1, max: 65535 },
            {
              key: 'source', title: '源', type: 'group', children: [
                { key: 'address', title: '源地址', type: 'text', placeholder: '如 2001:db8::/32' },
                { key: 'port', title: '源端口', type: 'number', min: 1, max: 65535 },
              ],
            },
            {
              key: 'destination', title: '目标', type: 'group', children: [
                { key: 'address', title: '目标地址', type: 'text', placeholder: '如 2001:db8:1::/64' },
                { key: 'port', title: '目标端口', type: 'number', min: 1, max: 65535 },
              ],
            },
          ],
        },
        {
          key: 'ether', title: '以太网', type: 'group', children: [
            { key: 'source', title: '源 MAC', type: 'text', placeholder: '如 00:11:22:33:44:55' },
            { key: 'destination', title: '目标 MAC', type: 'text', placeholder: '如 00:11:22:33:44:55' },
            { key: 'protocol', title: '协议', type: 'select', options: ETHER_PROTOCOL_OPTIONS, placeholder: '选择以太网协议' },
          ],
        },
        { key: 'interface', title: '接口', type: 'select', options: interfaceOptions.value, placeholder: '选择接口' },
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
      return POLICY_TYPES.map(t => ({ key: t.value, title: t.label }));
    });

    const filteredData = computed(() => {
      if (!typeFilter.value) return tableData.value;
      return tableData.value.filter(item => item.type === typeFilter.value);
    });

    const currentSchema = computed(() => {
      if (editingPolicy.value) return getSchemaByType(editingPolicy.value.type);
      return getSchemaByType(typeFilter.value || 'cake');
    });

    const classSchema = computed(() => {
      if (!editingPolicy.value) return [];
      return getClassSchemaByType(editingPolicy.value.type) || [];
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
        showError(e.message || '加载失败');
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

        await configStore.commit();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
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
      for (const t of deleteTargets.value) {
        try {
          await configApi.delete(`qos policy ${t.type} ${t.name}`);
        } catch (e) {
          showError(`删除 ${t.name} 失败: ${e.message || e}`);
        }
      }
      await configStore.commit();
      selected.value = [];
      deleteTargets.value = [];
      await load();
    }

    // ========== Class management ==========

    function origCreateClass() {
      const schema = getClassSchemaByType(editingPolicy.value.type);
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
        parts.push(`规则: ${ruleName}`);
        if (ruleConfig.ip) {
          const ip = ruleConfig.ip;
          if (ip.destination?.address) parts.push(`目标地址: ${ip.destination.address}`);
          if (ip.destination?.port) parts.push(`目标端口: ${ip.destination.port}`);
          if (ip.source?.address) parts.push(`源地址: ${ip.source.address}`);
          if (ip.source?.port) parts.push(`源端口: ${ip.source.port}`);
          if (ip.dscp) parts.push(`DSCP: ${ip.dscp}`);
          if (ip.protocol) parts.push(`协议: ${ip.protocol}`);
          if (ip['max-length']) parts.push(`最大长度: ${ip['max-length']}`);
          if (ip.tcp) {
            const flags = Object.keys(ip.tcp).filter(k => ip.tcp[k] === '' || ip.tcp[k] === true);
            if (flags.length) parts.push(`TCP 标志: ${flags.join(', ')}`);
          }
        }
        if (ruleConfig.ipv6) {
          const ipv6 = ruleConfig.ipv6;
          if (ipv6.destination?.address) parts.push(`IPv6 目标: ${ipv6.destination.address}`);
          if (ipv6.destination?.port) parts.push(`IPv6 目标端口: ${ipv6.destination.port}`);
          if (ipv6.source?.address) parts.push(`IPv6 源: ${ipv6.source.address}`);
          if (ipv6.source?.port) parts.push(`IPv6 源端口: ${ipv6.source.port}`);
          if (ipv6.dscp) parts.push(`DSCP: ${ipv6.dscp}`);
          if (ipv6.protocol) parts.push(`协议: ${ipv6.protocol}`);
        }
        if (ruleConfig.ether) {
          const ether = ruleConfig.ether;
          if (ether.destination) parts.push(`以太网目标: ${ether.destination}`);
          if (ether.source) parts.push(`以太网源: ${ether.source}`);
          if (ether.protocol) parts.push(`以太网协议: ${ether.protocol}`);
        }
        if (ruleConfig.interface) parts.push(`接口: ${ruleConfig.interface}`);
        if (ruleConfig.mark !== undefined) parts.push(`Mark: ${ruleConfig.mark}`);
        if (ruleConfig.vif !== undefined) parts.push(`VLAN: ${ruleConfig.vif}`);
      }
      return parts.join(' | ');
    }

    function getClassFormTabs() {
      const type = editingPolicy.value?.type;
      if (type === 'shaper-hfsc') {
        return [
          { key: 'basic', title: '基本' },
          { key: 'linkshare', title: 'Linkshare' },
          { key: 'realtime', title: 'Realtime' },
          { key: 'upperlimit', title: 'Upperlimit' },
        ];
      }
      return [{ key: 'basic', title: '基本' }];
    }

    function getClassFormSchema(tabKey) {
      if (!classModalEditing.value || !editingPolicy.value) return [];
      const type = editingPolicy.value.type;
      const schema = getClassSchemaByType(type);
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
        <template v-for="t in POLICY_TYPES" :key="t.value" #[t.value]>
          <DataTable
            rowKey="key"
            :columns="POLICY_COLUMNS[t.value]"
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
                <a @click="edit(record)" style="margin-right: 8px">编辑</a>
                <a @click="remove(record)" style="color: #ff4d4f">删除</a>
              </template>
            </template>
          </DataTable>
        </template>
      </TabGroup>

      <!-- Policy create/edit modal -->
      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingPolicy && tableData.find(d => d.key === editingPolicy.key) ? '编辑QoS策略' : '新建QoS策略'"
        @confirm="save"
        @close="modalVisible = false"
        width="900"
      >
        <ConfigForm v-if="editingPolicy" v-model="editingPolicy" :schema="currentSchema" />
        <CommandPreview v-if="commandText" :command="commandText" />

        <!-- Class management section (for policies with classes) -->
        <div v-if="editingPolicy && hasClasses(editingPolicy.type)" style="margin-top: 20px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
          <h4 style="margin: 0 0 12px 0;">{{ editingPolicy.type === 'random-detect' ? '优先级管理' : '类管理' }}</h4>
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
                <a @click="editClass(record)" style="margin-right: 8px">编辑</a>
                <a @click="removeClass(record)" style="color: #ff4d4f">删除</a>
              </template>
            </template>
          </DataTable>
        </div>
      </DraggableModal>

      <!-- Class edit modal -->
      <DraggableModal
        v-model:visible="classModalVisible"
        :title="classModalEditing && editingClasses.find(c => c.id === classModalEditing.id) ? '编辑类' : '新建类'"
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
          <CommandPreview v-if="classCommandText" :command="classCommandText" />

          <!-- Rule management section (not for random-detect) -->
          <div v-if="editingPolicy.type !== 'random-detect'" style="margin-top: 20px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
            <h4 style="margin: 0 0 12px 0;">规则管理</h4>
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
                  <a @click="editRule(record)" style="margin-right: 8px">编辑</a>
                  <a @click="removeRule(record)" style="color: #ff4d4f">删除</a>
                </template>
              </template>
            </DataTable>
            <div v-if="editingRules.length === 0" style="text-align: center; color: #999; padding: 20px;">暂无规则</div>
          </div>
        </div>
      </DraggableModal>

      <!-- Rule edit modal -->
      <DraggableModal
        v-model:visible="ruleModalVisible"
        :title="editingRule ? '编辑规则' : '新建规则'"
        @confirm="saveRule"
        @close="ruleModalVisible = false"
        width="700"
      >
        <ConfigForm v-if="editingRule" v-model="editingRule" :schema="ruleSchema" />
      </DraggableModal>

      <!-- Delete confirmation modal -->
      <DraggableModal
        v-model:visible="deleteConfirmVisible"
        title="确认删除"
        @confirm="confirmDelete"
        @close="deleteConfirmVisible = false"
        width="400"
      >
        <p style="margin-bottom: 12px;">确定删除以下策略？</p>
        <ul style="margin: 0; padding-left: 20px;">
          <li v-for="t in deleteTargets" :key="t.name + t.type">{{ t.name }} ({{ t.type }})</li>
        </ul>
      </DraggableModal>
    </div>
  `,
});
