import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
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
    { key: 'mtu', title: 'MTU', type: 'number', min: 1, placeholder: 'MTU 大小' },
    { key: 'priority', title: '优先级', type: 'number', min: 0, placeholder: '规则评估优先级', help: '默认: 20' },
  ];
}

function priorityQueueTopSchema() {
  return [
    { key: 'name', title: '策略名称', type: 'text', required: true },
    { key: 'description', title: '描述', type: 'text' },
  ];
}

function priorityQueueClassSchema() {
  return [
    { key: 'id', title: '优先级', type: 'number', min: 1, max: 7, required: true, placeholder: '1-7' },
    { key: 'description', title: '描述', type: 'text' },
    { key: 'codel-quantum', title: 'CoDel Quantum', type: 'number', min: 0, max: 1048576, placeholder: '0-1048576', help: '默认: 1514' },
    { key: 'flows', title: '流数量', type: 'number', min: 1, max: 65536, placeholder: '1-65536', help: '默认: 1024' },
    { key: 'interval', title: '间隔 (ms)', type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: '默认: 100' },
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
    { key: 'mark-probability', title: '标记概率', type: 'number', min: 0, max: 100, placeholder: '0-100', help: '默认: 10' },
    { key: 'maximum-threshold', title: '最大阈值', type: 'number', min: 0, placeholder: '随机检测最大阈值', help: '默认: 18' },
    { key: 'minimum-threshold', title: '最小阈值', type: 'number', min: 0, placeholder: '随机检测最小阈值' },
    { key: 'queue-limit', title: '队列限制', type: 'number', min: 1, placeholder: '最大队列大小' },
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
    const activeTab = ref('cake');
    const dataTableRef = ref(null);

    // Class management
    const classModalVisible = ref(false);
    const editingClasses = ref([]);
    const classModalEditing = ref(null);
    const classActiveTab = ref('classes');
    const classFormTab = ref('basic');

    const columns = [
      { key: 'name', title: '策略名称', dataIndex: 'name', width: 150 },
      { key: 'type', title: '策略类型', dataIndex: 'type', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
    ];

    const classColumns = [
      { key: 'id', title: '类 ID / 优先级', dataIndex: 'id', width: 120 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'bandwidth', title: '带宽', dataIndex: 'bandwidth', width: 120 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tableData = computed(() => {
      const result = [];
      for (const policy of policies.value) {
        result.push({
          key: `${policy.type}-${policy.name}`,
          name: policy.name,
          type: policy.type,
          description: policy.description || '',
          ...policy,
        });
      }
      return result;
    });

    const filteredData = computed(() => {
      return tableData.value.filter(item => item.type === activeTab.value);
    });

    const currentSchema = computed(() => {
      return getSchemaByType(activeTab.value);
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
      let cmd = `set qos policy ${type} ${name} class ${c.id}`;
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
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function create() {
      editingPolicy.value = {
        name: '',
        type: activeTab.value,
        description: '',
      };
      modalVisible.value = true;
    }

    function edit(record) {
      editingPolicy.value = { ...record };
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

        await configStore.commit();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function remove(record) {
      if (!confirm(`确定删除策略 ${record.name} (${record.type})？`)) return;
      try {
        await configApi.delete(`qos policy ${record.type} ${record.name}`);
        await configStore.commit();
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    // ========== Class management ==========

    function openClassManager(record) {
      editingPolicy.value = { ...record };
      // Load existing classes from the policy data
      const policy = policies.value.find(p => p.name === record.name && p.type === record.type);
      editingClasses.value = [];
      if (policy && policy.class) {
        for (const [id, classConfig] of Object.entries(policy.class)) {
          editingClasses.value.push({ id: Number(id), ...classConfig });
        }
      }
      classActiveTab.value = 'classes';
      classModalVisible.value = true;
    }

    function createClass() {
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
      classModalVisible.value = true;
    }

    function editClass(cls) {
      classModalEditing.value = { ...cls };
      classFormTab.value = 'basic';
    }

    async function saveClass() {
      if (!classModalEditing.value || !editingPolicy.value) return;
      const { type, name } = editingPolicy.value;
      const c = classModalEditing.value;

      try {
        // Delete old class if editing
        if (c._oldId !== undefined && c._oldId !== c.id) {
          await configApi.delete(`qos policy ${type} ${name} class ${c._oldId}`);
        }

        await configApi.set(`qos policy ${type} ${name} class`, String(c.id));

        for (const [key, value] of Object.entries(c)) {
          if (key === 'id' || key === '_oldId') continue;
          if (value === undefined || value === null || value === '') continue;

          if (typeof value === 'object' && !Array.isArray(value)) {
            for (const [subKey, subValue] of Object.entries(value)) {
              if (subValue === true) {
                await configApi.set(`qos policy ${type} ${name} class ${c.id} ${key} ${subKey}`, '');
              } else if (subValue !== undefined && subValue !== null && subValue !== '') {
                await configApi.set(`qos policy ${type} ${name} class ${c.id} ${key} ${subKey}`, String(subValue));
              }
            }
          } else {
            await configApi.set(`qos policy ${type} ${name} class ${c.id} ${key}`, String(value));
          }
        }

        await configStore.commit();
        classModalEditing.value = null;
        // Refresh classes
        const policy = policies.value.find(p => p.name === name && p.type === type);
        editingClasses.value = [];
        if (policy && policy.class) {
          for (const [id, classConfig] of Object.entries(policy.class)) {
            editingClasses.value.push({ id: Number(id), ...classConfig });
          }
        }
      } catch (e) {
        showError(e.message || '保存类失败');
      }
    }

    async function removeClass(cls) {
      if (!confirm(`确定删除类 ${cls.id}？`)) return;
      const { type, name } = editingPolicy.value;
      try {
        await configApi.delete(`qos policy ${type} ${name} class ${cls.id}`);
        await configStore.commit();
        const policy = policies.value.find(p => p.name === name && p.type === type);
        editingClasses.value = [];
        if (policy && policy.class) {
          for (const [id, classConfig] of Object.entries(policy.class)) {
            editingClasses.value.push({ id: Number(id), ...classConfig });
          }
        }
      } catch (e) {
        showError(e.message || '删除类失败');
      }
    }

    function closeClassManager() {
      classModalVisible.value = false;
      classModalEditing.value = null;
      editingPolicy.value = null;
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
      loading, filteredData, columns, selected, modalVisible, editingPolicy, activeTab,
      currentSchema, commandText, dataTableRef, POLICY_TYPES,
      classModalVisible, editingClasses, classModalEditing, classActiveTab, classFormTab,
      classColumns, classSchema, classCommandText,
      load, create, edit, save, remove,
      openClassManager, createClass, editClass, saveClass, removeClass, closeClassManager,
      getClassFormTabs, getClassFormSchema, hasClasses,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        ref="dataTableRef"
        :columns="columns"
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
            <a v-if="hasClasses(record.type)" @click="openClassManager(record)" style="margin-right: 8px">管理类</a>
            <a @click="edit(record)" style="margin-right: 8px">编辑</a>
            <a @click="remove(record)" style="color: #ff4d4f">删除</a>
          </template>
        </template>
      </DataTable>

      <!-- Policy create/edit modal -->
      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingPolicy && filteredData.find(d => d.key === editingPolicy.key) ? '编辑QoS策略' : '新建QoS策略'"
        @confirm="save"
        @close="modalVisible = false"
        width="750"
      >
        <ConfigForm v-if="editingPolicy" v-model="editingPolicy" :schema="currentSchema" />
        <CommandPreview v-if="commandText" :command="commandText" />
      </DraggableModal>

      <!-- Class manager modal (for policies with classes) -->
      <DraggableModal
        v-model:visible="classModalVisible"
        :title="editingPolicy ? '管理类 - ' + editingPolicy.name + ' (' + editingPolicy.type + ')' : '管理类'"
        @close="closeClassManager"
        width="800"
      >
        <div v-if="classActiveTab === 'classes'">
          <div class="toolbar" style="margin-bottom: 12px;">
            <ToolbarButton @click="createClass" icon="create">新建类</ToolbarButton>
            <ToolbarButton @click="closeClassManager" icon="cancel">关闭</ToolbarButton>
          </div>
          <DataTable
            :columns="classColumns"
            :data="editingClasses.map(c => ({ key: c.id, ...c }))"
            :loading="loading"
            :externalToolbar="true"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editClass(record)" style="margin-right: 8px">编辑</a>
                <a @click="removeClass(record)" style="color: #ff4d4f">删除</a>
              </template>
            </template>
          </DataTable>
        </div>

        <div v-if="classModalEditing">
          <div v-if="getClassFormTabs().length > 1" style="margin-bottom: 12px;">
            <TabGroup v-model="classFormTab" :tabs="getClassFormTabs()">
              <template v-for="tab in getClassFormTabs()" :key="tab.key" #[tab.key]>
                <ConfigForm v-model="classModalEditing" :schema="getClassFormSchema(tab.key)" />
              </template>
            </TabGroup>
          </div>
          <ConfigForm v-else v-model="classModalEditing" :schema="getClassFormSchema('basic')" />
          <div style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px;">
            <ToolbarButton @click="classModalEditing = null" icon="cancel">取消</ToolbarButton>
            <ToolbarButton @click="saveClass" icon="save">保存</ToolbarButton>
          </div>
          <CommandPreview v-if="classCommandText" :command="classCommandText" />
        </div>
      </DraggableModal>
    </div>
  `,
});
