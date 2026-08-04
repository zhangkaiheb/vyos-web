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
  { value: 'AF11', label: 'AF11 (High-throughput data)' },
  { value: 'AF12', label: 'AF12 (High-throughput data)' },
  { value: 'AF13', label: 'AF13 (High-throughput data)' },
  { value: 'AF21', label: 'AF21 (Low-latency data)' },
  { value: 'AF22', label: 'AF22 (Low-latency data)' },
  { value: 'AF23', label: 'AF23 (Low-latency data)' },
  { value: 'AF31', label: 'AF31 (Multimedia streaming)' },
  { value: 'AF32', label: 'AF32 (Multimedia streaming)' },
  { value: 'AF33', label: 'AF33 (Multimedia streaming)' },
  { value: 'AF41', label: 'AF41 (Multimedia conferencing)' },
  { value: 'AF42', label: 'AF42 (Multimedia conferencing)' },
  { value: 'AF43', label: 'AF43 (Multimedia conferencing)' },
  { value: 'CS1', label: 'CS1 (Low-priority data)' },
  { value: 'CS2', label: 'CS2 (OAM)' },
  { value: 'CS3', label: 'CS3 (Broadcast video)' },
  { value: 'CS4', label: 'CS4 (Real-time interactive)' },
  { value: 'CS5', label: 'CS5 (Signaling)' },
  { value: 'CS6', label: 'CS6 (Network control)' },
  { value: 'CS7', label: 'CS7' },
  { value: 'EF', label: 'EF (Expedited Forwarding)' },
];

const TCP_FLAG_OPTIONS = [
  { value: 'ack', label: 'ACK' },
  { value: 'syn', label: 'SYN' },
];

const IP_PROTOCOL_OPTIONS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'icmp', label: 'ICMP' },
  { value: 'gre', label: 'GRE' },
  { value: 'esp', label: 'ESP' },
  { value: 'ah', label: 'AH' },
  { value: 'igmp', label: 'IGMP' },
  { value: 'ospf', label: 'OSPF' },
  { value: 'eigrp', label: 'EIGRP' },
  { value: 'sctp', label: 'SCTP' },
  { value: 'vrrp', label: 'VRRP' },
  { value: 'l2tp', label: 'L2TP' },
  { value: 'ipip', label: 'IPIP' },
  { value: 'mptcp', label: 'MPTCP' },
];

export default defineComponent({
  name: 'QosTrafficMatchGroupPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const matchGroups = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingGroup = ref(null);
    const editingMatch = ref(null);
    const matchModalVisible = ref(false);
    const activeTab = ref('groups');
    const matchActiveTab = ref('basic');
    const dataTableRef = ref(null);

    const groupColumns = [
      { key: 'name', title: '匹配组名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'matchCount', title: '匹配规则数', dataIndex: 'matchCount', width: 120 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 180, fixed: 'right' },
    ];

    const matchColumns = [
      { key: 'name', title: '匹配规则名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'type', title: '类型', dataIndex: 'type', width: 100 },
      { key: 'details', title: '详情', dataIndex: 'details', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tableData = computed(() => {
      return matchGroups.value.map(group => ({
        key: group.name,
        name: group.name,
        description: group.description || '',
        matchCount: group.matches ? Object.keys(group.matches).length : 0,
        ...group,
      }));
    });

    const currentGroupMatches = computed(() => {
      if (!editingGroup.value) return [];
      const group = matchGroups.value.find(g => g.name === editingGroup.value.name);
      if (!group || !group.matches) return [];

      return Object.entries(group.matches).map(([name, match]) => {
        let type = '';
        let details = '';

        if (match.ip) {
          type = 'IPv4';
          const parts = [];
          if (match.ip.destination?.address) parts.push(`dst:${match.ip.destination.address}`);
          if (match.ip.destination?.port) parts.push(`dport:${match.ip.destination.port}`);
          if (match.ip.source?.address) parts.push(`src:${match.ip.source.address}`);
          if (match.ip.source?.port) parts.push(`sport:${match.ip.source.port}`);
          if (match.ip.dscp) parts.push(`dscp:${match.ip.dscp}`);
          if (match.ip.protocol) parts.push(`proto:${match.ip.protocol}`);
          details = parts.join(', ');
        } else if (match.ipv6) {
          type = 'IPv6';
          const parts = [];
          if (match.ipv6.destination?.address) parts.push(`dst:${match.ipv6.destination.address}`);
          if (match.ipv6.destination?.port) parts.push(`dport:${match.ipv6.destination.port}`);
          if (match.ipv6.source?.address) parts.push(`src:${match.ipv6.source.address}`);
          if (match.ipv6.source?.port) parts.push(`sport:${match.ipv6.source.port}`);
          if (match.ipv6.dscp) parts.push(`dscp:${match.ipv6.dscp}`);
          details = parts.join(', ');
        } else if (match.mark !== undefined) {
          type = 'Mark';
          details = 'mark matched';
        } else if (match.vif !== undefined) {
          type = 'VLAN';
          details = `vif:${match.vif}`;
        }

        return {
          key: `${editingGroup.value.name}-${name}`,
          groupName: editingGroup.value.name,
          name,
          description: match.description || '',
          type,
          details,
          ...match,
        };
      });
    });

    const groupSchema = computed(() => [
      { key: 'name', title: '匹配组名称', type: 'text', required: true },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    // Match rule schema with tabs and nested groups
    const matchBasicSchema = [
      { key: 'name', title: '匹配规则名称', type: 'text', required: true },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'type', title: '类型', type: 'select', options: [
        { value: 'ip', label: 'IPv4' },
        { value: 'ipv6', label: 'IPv6' },
        { value: 'mark', label: 'Mark' },
        { value: 'vif', label: 'VLAN ID' },
      ], required: true },
    ];

    const matchIpv4Schema = [
      {
        key: 'ip', title: 'IPv4 匹配', type: 'group', children: [
          {
            key: 'destination', title: '目标', type: 'group', children: [
              { key: 'address', title: '地址', type: 'text', validate: 'ip-segment', placeholder: 'IPv4 地址或前缀，如 192.168.1.0/24' },
              { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
            ],
          },
          {
            key: 'source', title: '源', type: 'group', children: [
              { key: 'address', title: '地址', type: 'text', validate: 'ip-segment', placeholder: 'IPv4 地址或前缀，如 10.0.0.0/8' },
              { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
            ],
          },
          { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS },
          { key: 'protocol', title: '协议', type: 'select', options: IP_PROTOCOL_OPTIONS, dynamic: true },
          { key: 'max-length', title: '最大包长', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
          { key: 'tcp', title: 'TCP 标志', type: 'group', children: [
            { key: 'flags', title: '标志', type: 'multi-select', options: TCP_FLAG_OPTIONS },
          ]},
        ],
      },
    ];

    const matchIpv6Schema = [
      {
        key: 'ipv6', title: 'IPv6 匹配', type: 'group', children: [
          {
            key: 'destination', title: '目标', type: 'group', children: [
              { key: 'address', title: '地址', type: 'text', validate: 'ipv6-segment', placeholder: 'IPv6 地址或前缀，如 2001:db8::/32' },
              { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
            ],
          },
          {
            key: 'source', title: '源', type: 'group', children: [
              { key: 'address', title: '地址', type: 'text', validate: 'ipv6-segment', placeholder: 'IPv6 地址或前缀' },
              { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
            ],
          },
          { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS },
          { key: 'protocol', title: '协议', type: 'select', options: IP_PROTOCOL_OPTIONS, dynamic: true },
          { key: 'max-length', title: '最大包长', type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
          { key: 'tcp', title: 'TCP 标志', type: 'group', children: [
            { key: 'flags', title: '标志', type: 'multi-select', options: TCP_FLAG_OPTIONS },
          ]},
        ],
      },
    ];

    const matchAdvancedSchema = [
      { key: 'mark', title: '匹配 Mark', type: 'checkbox', valueless: true, help: '匹配防火墙设置的 mark（无需值）' },
      { key: 'vif', title: 'VLAN ID', type: 'number', min: 0, max: 4095, placeholder: '0-4095' },
    ];

    const matchTabs = [
      { key: 'basic', title: '基本' },
      { key: 'ipv4', title: 'IPv4' },
      { key: 'ipv6', title: 'IPv6' },
      { key: 'advanced', title: '高级' },
    ];

    function getMatchTabSchema(tabKey) {
      switch (tabKey) {
        case 'basic': return matchBasicSchema;
        case 'ipv4': return matchIpv4Schema;
        case 'ipv6': return matchIpv6Schema;
        case 'advanced': return matchAdvancedSchema;
        default: return matchBasicSchema;
      }
    }

    const commandText = computed(() => {
      if (!editingGroup.value) return '';
      const { name, description } = editingGroup.value;
      let cmd = `set qos traffic-match-group ${name}`;
      if (description) {
        cmd += ` description "${description}"`;
      }
      return cmd;
    });

    const matchCommandText = computed(() => {
      if (!editingMatch.value || !editingGroup.value) return '';
      const groupName = editingGroup.value.name;
      const m = editingMatch.value;
      let cmd = `set qos traffic-match-group ${groupName} match ${m.name || '<name>'}`;

      const parts = [];
      const type = m.type;

      if (type === 'ip' && m.ip) {
        if (m.ip.destination?.address) parts.push(`ip destination address ${m.ip.destination.address}`);
        if (m.ip.destination?.port) parts.push(`ip destination port ${m.ip.destination.port}`);
        if (m.ip.source?.address) parts.push(`ip source address ${m.ip.source.address}`);
        if (m.ip.source?.port) parts.push(`ip source port ${m.ip.source.port}`);
        if (m.ip.dscp) parts.push(`ip dscp ${m.ip.dscp}`);
        if (m.ip.protocol) parts.push(`ip protocol ${m.ip.protocol}`);
        if (m.ip['max-length']) parts.push(`ip max-length ${m.ip['max-length']}`);
        if (m.ip.tcp?.flags) {
          for (const flag of m.ip.tcp.flags) {
            parts.push(`ip tcp ${flag}`);
          }
        }
      } else if (type === 'ipv6' && m.ipv6) {
        if (m.ipv6.destination?.address) parts.push(`ipv6 destination address ${m.ipv6.destination.address}`);
        if (m.ipv6.destination?.port) parts.push(`ipv6 destination port ${m.ipv6.destination.port}`);
        if (m.ipv6.source?.address) parts.push(`ipv6 source address ${m.ipv6.source.address}`);
        if (m.ipv6.source?.port) parts.push(`ipv6 source port ${m.ipv6.source.port}`);
        if (m.ipv6.dscp) parts.push(`ipv6 dscp ${m.ipv6.dscp}`);
        if (m.ipv6.protocol) parts.push(`ipv6 protocol ${m.ipv6.protocol}`);
        if (m.ipv6['max-length']) parts.push(`ipv6 max-length ${m.ipv6['max-length']}`);
        if (m.ipv6.tcp?.flags) {
          for (const flag of m.ipv6.tcp.flags) {
            parts.push(`ipv6 tcp ${flag}`);
          }
        }
      } else if (type === 'mark') {
        parts.push('mark');
      } else if (type === 'vif') {
        if (m.vif !== undefined && m.vif !== null) parts.push(`vif ${m.vif}`);
      }

      if (parts.length > 0) {
        cmd += ' ' + parts.join(' ');
      }

      return cmd;
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('qos traffic-match-group');
        const data = res.data || {};
        const groups = [];

        for (const [name, config] of Object.entries(data)) {
          groups.push({
            name,
            description: config.description || '',
            matches: config.match || {},
          });
        }

        matchGroups.value = groups;
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function createGroup() {
      editingGroup.value = { name: '', description: '' };
      modalVisible.value = true;
    }

    function editGroup(group) {
      editingGroup.value = { ...group };
      modalVisible.value = true;
    }

    async function saveGroup() {
      if (!editingGroup.value) return;
      const { name, description } = editingGroup.value;

      try {
        await configApi.set(`qos traffic-match-group`, name);
        if (description) {
          await configApi.set(`qos traffic-match-group ${name} description`, description);
        }
        await configStore.commit();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function removeGroup(group) {
      if (!confirm(`确定删除匹配组 ${group.name}？`)) return;
      try {
        await configApi.delete(`qos traffic-match-group ${group.name}`);
        await configStore.commit();
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    function emptyMatch() {
      return {
        name: '',
        description: '',
        type: 'ip',
        ip: {
          destination: { address: '', port: null },
          source: { address: '', port: null },
          dscp: '',
          protocol: '',
          'max-length': null,
          tcp: { flags: [] },
        },
        ipv6: {
          destination: { address: '', port: null },
          source: { address: '', port: null },
          dscp: '',
          protocol: '',
          'max-length': null,
          tcp: { flags: [] },
        },
        mark: false,
        vif: null,
      };
    }

    function createMatch() {
      editingMatch.value = emptyMatch();
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    function editMatch(match) {
      const converted = emptyMatch();
      converted.name = match.name;
      converted.description = match.description || '';

      if (match.ip) {
        converted.type = 'ip';
        converted.ip = {
          destination: {
            address: match.ip.destination?.address || '',
            port: match.ip.destination?.port != null ? Number(match.ip.destination.port) : null,
          },
          source: {
            address: match.ip.source?.address || '',
            port: match.ip.source?.port != null ? Number(match.ip.source.port) : null,
          },
          dscp: match.ip.dscp || '',
          protocol: match.ip.protocol || '',
          'max-length': match.ip['max-length'] != null ? Number(match.ip['max-length']) : null,
          tcp: {
            flags: match.ip.tcp ? Object.keys(match.ip.tcp).filter(k => k !== 'not') : [],
          },
        };
      } else if (match.ipv6) {
        converted.type = 'ipv6';
        converted.ipv6 = {
          destination: {
            address: match.ipv6.destination?.address || '',
            port: match.ipv6.destination?.port != null ? Number(match.ipv6.destination.port) : null,
          },
          source: {
            address: match.ipv6.source?.address || '',
            port: match.ipv6.source?.port != null ? Number(match.ipv6.source.port) : null,
          },
          dscp: match.ipv6.dscp || '',
          protocol: match.ipv6.protocol || '',
          'max-length': match.ipv6['max-length'] != null ? Number(match.ipv6['max-length']) : null,
          tcp: {
            flags: match.ipv6.tcp ? Object.keys(match.ipv6.tcp).filter(k => k !== 'not') : [],
          },
        };
      } else if (match.mark !== undefined) {
        converted.type = 'mark';
        converted.mark = true;
      } else if (match.vif !== undefined) {
        converted.type = 'vif';
        converted.vif = Number(match.vif);
      }

      editingMatch.value = converted;
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    async function saveMatch() {
      if (!editingMatch.value || !editingGroup.value) return;
      const groupName = editingGroup.value.name;
      const m = editingMatch.value;

      try {
        await configApi.set(`qos traffic-match-group ${groupName} match`, m.name);
        if (m.description) {
          await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} description`, m.description);
        }

        if (m.type === 'ip' && m.ip) {
          if (m.ip.destination?.address) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip destination address`, m.ip.destination.address);
          }
          if (m.ip.destination?.port != null && m.ip.destination.port !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip destination port`, String(m.ip.destination.port));
          }
          if (m.ip.source?.address) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip source address`, m.ip.source.address);
          }
          if (m.ip.source?.port != null && m.ip.source.port !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip source port`, String(m.ip.source.port));
          }
          if (m.ip.dscp) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip dscp`, m.ip.dscp);
          }
          if (m.ip.protocol) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip protocol`, m.ip.protocol);
          }
          if (m.ip['max-length'] != null && m.ip['max-length'] !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip max-length`, String(m.ip['max-length']));
          }
          if (m.ip.tcp?.flags) {
            for (const flag of m.ip.tcp.flags) {
              await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ip tcp ${flag}`, '');
            }
          }
        } else if (m.type === 'ipv6' && m.ipv6) {
          if (m.ipv6.destination?.address) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 destination address`, m.ipv6.destination.address);
          }
          if (m.ipv6.destination?.port != null && m.ipv6.destination.port !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 destination port`, String(m.ipv6.destination.port));
          }
          if (m.ipv6.source?.address) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 source address`, m.ipv6.source.address);
          }
          if (m.ipv6.source?.port != null && m.ipv6.source.port !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 source port`, String(m.ipv6.source.port));
          }
          if (m.ipv6.dscp) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 dscp`, m.ipv6.dscp);
          }
          if (m.ipv6.protocol) {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 protocol`, m.ipv6.protocol);
          }
          if (m.ipv6['max-length'] != null && m.ipv6['max-length'] !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 max-length`, String(m.ipv6['max-length']));
          }
          if (m.ipv6.tcp?.flags) {
            for (const flag of m.ipv6.tcp.flags) {
              await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} ipv6 tcp ${flag}`, '');
            }
          }
        } else if (m.type === 'mark') {
          await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} mark`, '');
        } else if (m.type === 'vif') {
          if (m.vif != null && m.vif !== '') {
            await configApi.set(`qos traffic-match-group ${groupName} match ${m.name} vif`, String(m.vif));
          }
        }

        await configStore.commit();
        matchModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function removeMatch(match) {
      if (!confirm(`确定删除匹配规则 ${match.name}？`)) return;
      try {
        await configApi.delete(`qos traffic-match-group ${match.groupName} match ${match.name}`);
        await configStore.commit();
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    function manageMatches(group) {
      editingGroup.value = group;
      activeTab.value = 'matches';
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, tableData, currentGroupMatches, groupColumns, matchColumns, selected,
      modalVisible, matchModalVisible, editingGroup, editingMatch, activeTab, matchActiveTab,
      groupSchema, matchTabs, getMatchTabSchema, commandText, matchCommandText, dataTableRef,
      load, createGroup, editGroup, saveGroup, removeGroup,
      createMatch, editMatch, saveMatch, removeMatch, manageMatches,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="activeTab === 'groups'">
        <DataTable
          ref="dataTableRef"
          :columns="groupColumns"
          :data="tableData"
          :loading="loading"
          :selectedKeys="selected"
          :actions="['create', 'edit', 'delete', 'refresh']"
          @create="createGroup"
          @edit="editGroup"
          @delete="removeGroup"
          @refresh="load"
          @selection-change="(keys) => selected = keys"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="manageMatches(record)" style="margin-right: 8px">管理规则</a>
              <a @click="editGroup(record)" style="margin-right: 8px">编辑</a>
              <a @click="removeGroup(record)" style="color: #ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>
      </div>

      <div v-if="activeTab === 'matches' && editingGroup">
        <div class="toolbar">
          <ToolbarButton @click="activeTab = 'groups'" icon="cancel">返回</ToolbarButton>
          <ToolbarButton @click="createMatch" icon="create">新建匹配规则</ToolbarButton>
          <span style="margin-left: 16px; font-weight: bold;">匹配组: {{ editingGroup.name }}</span>
        </div>
        <DataTable
          :columns="matchColumns"
          :data="currentGroupMatches"
          :loading="loading"
          :externalToolbar="true"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editMatch(record)" style="margin-right: 8px">编辑</a>
              <a @click="removeMatch(record)" style="color: #ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>
      </div>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingGroup && tableData.find(d => d.key === editingGroup.key) ? '编辑匹配组' : '新建匹配组'"
        @confirm="saveGroup"
        @close="modalVisible = false"
      >
        <ConfigForm v-if="editingGroup" v-model="editingGroup" :schema="groupSchema" />
        <CommandPreview v-if="commandText" :command="commandText" />
      </DraggableModal>

      <DraggableModal
        v-model:visible="matchModalVisible"
        :title="editingMatch && currentGroupMatches.find(d => d.key === editingMatch.key) ? '编辑匹配规则' : '新建匹配规则'"
        @confirm="saveMatch"
        @close="matchModalVisible = false"
        width="750"
      >
        <TabGroup v-model="matchActiveTab" :tabs="matchTabs">
          <template #basic>
            <ConfigForm v-if="editingMatch" v-model="editingMatch" :schema="getMatchTabSchema('basic')" />
          </template>
          <template #ipv4>
            <ConfigForm v-if="editingMatch" v-model="editingMatch" :schema="getMatchTabSchema('ipv4')" />
          </template>
          <template #ipv6>
            <ConfigForm v-if="editingMatch" v-model="editingMatch" :schema="getMatchTabSchema('ipv6')" />
          </template>
          <template #advanced>
            <ConfigForm v-if="editingMatch" v-model="editingMatch" :schema="getMatchTabSchema('advanced')" />
          </template>
        </TabGroup>
        <CommandPreview v-if="matchCommandText" :command="matchCommandText" />
      </DraggableModal>
    </div>
  `,
});
