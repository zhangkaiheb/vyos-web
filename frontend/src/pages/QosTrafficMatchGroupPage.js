import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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
  { value: 'dccp', label: 'DCCP' },
  { value: 'ddp', label: 'DDP' },
  { value: 'egp', label: 'EGP' },
  { value: 'encap', label: 'ENCAP' },
  { value: 'etherip', label: 'EtherIP' },
  { value: 'fc', label: 'FC' },
  { value: 'ggp', label: 'GGP' },
  { value: 'hip', label: 'HIP' },
  { value: 'hmp', label: 'HMP' },
  { value: 'hopopt', label: 'Hop-by-Hop Options' },
  { value: 'idpr-cmtp', label: 'IDPR CMTP' },
  { value: 'idrp', label: 'IDRP' },
  { value: 'igp', label: 'IGP' },
  { value: 'ip', label: 'IP' },
  { value: 'ipcomp', label: 'IPComp' },
  { value: 'ipencap', label: 'IP Encap' },
  { value: 'ipv6', label: 'IPv6' },
  { value: 'ipv6-frag', label: 'IPv6 Fragment' },
  { value: 'ipv6-icmp', label: 'IPv6 ICMP' },
  { value: 'ipv6-nonxt', label: 'IPv6 No Next Header' },
  { value: 'ipv6-opts', label: 'IPv6 Options' },
  { value: 'ipv6-route', label: 'IPv6 Route' },
  { value: 'isis', label: 'IS-IS' },
  { value: 'iso-tp4', label: 'ISO TP4' },
  { value: 'manet', label: 'MANET' },
  { value: 'mobility-header', label: 'Mobility Header' },
  { value: 'mpls-in-ip', label: 'MPLS in IP' },
  { value: 'pim', label: 'PIM' },
  { value: 'pup', label: 'PUP' },
  { value: 'rdp', label: 'RDP' },
  { value: 'rohc', label: 'ROHC' },
  { value: 'rspf', label: 'RSPF' },
  { value: 'rsvp', label: 'RSVP' },
  { value: 'shim6', label: 'Shim6' },
  { value: 'skip', label: 'SKIP' },
  { value: 'st', label: 'ST' },
  { value: 'udplite', label: 'UDP-Lite' },
  { value: 'vmtp', label: 'VMTP' },
  { value: 'wesp', label: 'WESP' },
  { value: 'xns-idp', label: 'XNS IDP' },
  { value: 'xtp', label: 'XTP' },
];

export default defineComponent({
  name: 'QosTrafficMatchGroupPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
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
    const editingRules = ref([]);

    const deleteGroupModalVisible = ref(false);
    const pendingDeleteGroupName = ref('');
    const deleteMatchModalVisible = ref(false);
    const pendingDeleteMatchInfo = ref({ groupName: '', matchName: '' });

    const groupColumns = [
      { key: 'name', title: t('qosMatch.columns.groupName'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('qosMatch.columns.description'), dataIndex: 'description', width: 200 },
      { key: 'matchCount', title: t('qosMatch.columns.matchCount'), dataIndex: 'matchCount', width: 120 },
      { key: 'actions', title: t('qosMatch.columns.actions'), dataIndex: 'actions', width: 180, fixed: 'right' },
    ];

    const matchColumns = [
      { key: 'name', title: t('qosMatch.columns.matchName'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('qosMatch.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'type', title: t('qosMatch.columns.type'), dataIndex: 'type', width: 100 },
      { key: 'details', title: t('qosMatch.columns.details'), dataIndex: 'details', width: 200 },
      { key: 'actions', title: t('qosMatch.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];
    const ruleColumns = [
      { key: 'name', title: t('qosMatch.columns.ruleName'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('qosMatch.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'type', title: t('qosMatch.columns.type'), dataIndex: 'type', width: 80 },
      { key: 'details', title: t('qosMatch.columns.details'), dataIndex: 'details', width: 200 },
      { key: 'actions', title: t('qosMatch.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
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
      { key: 'name', title: t('qosMatch.columns.groupName'), type: 'text', required: true },
      { key: 'description', title: t('qosMatch.columns.description'), type: 'text' },
      { key: 'match-group', title: t('qosMatch.schema.matchGroup'), type: 'text', help: t('qosMatch.schema.matchGroupHelp') },
    ]);

    // Match rule schema with tabs and nested groups
    const matchBasicSchema = [
      { key: 'name', title: t('qosMatch.columns.matchName'), type: 'text', required: true },
      { key: 'description', title: t('qosMatch.columns.description'), type: 'text' },
      { key: 'type', title: t('qosMatch.columns.type'), type: 'select', options: [
        { value: 'ip', label: 'IPv4' },
        { value: 'ipv6', label: 'IPv6' },
        { value: 'mark', label: 'Mark' },
        { value: 'vif', label: 'VLAN ID' },
      ], required: true },
    ];

    const matchIpv4Schema = [
      {
        key: 'ip', title: t('qosMatch.schema.ipv4Match'), type: 'group', children: [
          {
            key: 'destination', title: t('qosMatch.schema.destination'), type: 'group', children: [
              { key: 'address', title: t('qosMatch.schema.address'), type: 'text', validate: 'ip-segment', placeholder: t('qosMatch.placeholders.ipv4Address') },
              { key: 'port', title: t('qosMatch.schema.port'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
            ],
          },
          {
            key: 'source', title: t('qosMatch.schema.source'), type: 'group', children: [
              { key: 'address', title: t('qosMatch.schema.address'), type: 'text', validate: 'ip-segment', placeholder: t('qosMatch.placeholders.ipv4SourceAddress') },
              { key: 'port', title: t('qosMatch.schema.port'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
            ],
          },
          { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS },
          { key: 'protocol', title: t('qosMatch.schema.protocol'), type: 'select', options: IP_PROTOCOL_OPTIONS, dynamic: true },
          { key: 'protocol-not', title: t('qosMatch.schema.protocolNot'), type: 'checkbox', help: t('qosMatch.schema.protocolNotHelp') },
          { key: 'max-length', title: t('qosMatch.schema.maxLength'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
          { key: 'tcp', title: t('qosMatch.schema.tcpFlags'), type: 'group', children: [
            { key: 'flags', title: t('qosMatch.schema.flags'), type: 'multi-select', options: TCP_FLAG_OPTIONS },
            { key: 'not', title: t('qosMatch.schema.not'), type: 'checkbox', help: t('qosMatch.schema.notHelp') },
          ]},
        ],
      },
    ];

    const matchIpv6Schema = [
      {
        key: 'ipv6', title: t('qosMatch.schema.ipv6Match'), type: 'group', children: [
          {
            key: 'destination', title: t('qosMatch.schema.destination'), type: 'group', children: [
              { key: 'address', title: t('qosMatch.schema.address'), type: 'text', validate: 'ipv6-segment', placeholder: t('qosMatch.placeholders.ipv6Address') },
              { key: 'port', title: t('qosMatch.schema.port'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
            ],
          },
          {
            key: 'source', title: t('qosMatch.schema.source'), type: 'group', children: [
              { key: 'address', title: t('qosMatch.schema.address'), type: 'text', validate: 'ipv6-segment', placeholder: t('qosMatch.placeholders.ipv6SourceAddress') },
              { key: 'port', title: t('qosMatch.schema.port'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
            ],
          },
          { key: 'dscp', title: 'DSCP', type: 'select', options: DSCP_OPTIONS },
          { key: 'protocol', title: t('qosMatch.schema.protocol'), type: 'select', options: IP_PROTOCOL_OPTIONS, dynamic: true },
          { key: 'protocol-not', title: t('qosMatch.schema.protocolNot'), type: 'checkbox', help: t('qosMatch.schema.protocolNotHelp') },
          { key: 'max-length', title: t('qosMatch.schema.maxLength'), type: 'number', min: 1, max: 65535, placeholder: t('qosMatch.placeholders.port') },
          { key: 'tcp', title: t('qosMatch.schema.tcpFlags'), type: 'group', children: [
            { key: 'flags', title: t('qosMatch.schema.flags'), type: 'multi-select', options: TCP_FLAG_OPTIONS },
            { key: 'not', title: t('qosMatch.schema.not'), type: 'checkbox', help: t('qosMatch.schema.notHelp') },
          ]},
        ],
      },
    ];

    const matchAdvancedSchema = [
      { key: 'mark', title: t('qosMatch.schema.matchMark'), type: 'checkbox', valueless: true, help: t('qosMatch.schema.matchMarkHelp') },
      { key: 'vif', title: t('qosMatch.schema.vifId'), type: 'number', min: 0, max: 4095, placeholder: t('qosMatch.placeholders.vif') },
    ];

    const matchTabs = [
      { key: 'basic', title: t('qosMatch.tabs.basic') },
      { key: 'ipv4', title: 'IPv4' },
      { key: 'ipv6', title: 'IPv6' },
      { key: 'advanced', title: t('qosMatch.tabs.advanced') },
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
        if (m.ip['protocol-not']) parts.push(`ip protocol not`);
        if (m.ip['max-length']) parts.push(`ip max-length ${m.ip['max-length']}`);
        if (m.ip.tcp?.flags) {
          for (const flag of m.ip.tcp.flags) {
            parts.push(`ip tcp ${flag}`);
          }
        }
        if (m.ip.tcp?.not) parts.push(`ip tcp not`);
      } else if (type === 'ipv6' && m.ipv6) {
        if (m.ipv6.destination?.address) parts.push(`ipv6 destination address ${m.ipv6.destination.address}`);
        if (m.ipv6.destination?.port) parts.push(`ipv6 destination port ${m.ipv6.destination.port}`);
        if (m.ipv6.source?.address) parts.push(`ipv6 source address ${m.ipv6.source.address}`);
        if (m.ipv6.source?.port) parts.push(`ipv6 source port ${m.ipv6.source.port}`);
        if (m.ipv6.dscp) parts.push(`ipv6 dscp ${m.ipv6.dscp}`);
        if (m.ipv6.protocol) parts.push(`ipv6 protocol ${m.ipv6.protocol}`);
        if (m.ipv6['protocol-not']) parts.push(`ipv6 protocol not`);
        if (m.ipv6['max-length']) parts.push(`ipv6 max-length ${m.ipv6['max-length']}`);
        if (m.ipv6.tcp?.flags) {
          for (const flag of m.ipv6.tcp.flags) {
            parts.push(`ipv6 tcp ${flag}`);
          }
        }
        if (m.ipv6.tcp?.not) parts.push(`ipv6 tcp not`);
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
        showError(e.message || t('qosMatch.messages.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function createGroup() {
      editingGroup.value = { name: '', description: '' };
      editingRules.value = [];
      modalVisible.value = true;
    }

    function editGroup(group) {
      editingGroup.value = { ...group };
      editingRules.value = [];
      if (group.matches) {
        for (const [name, match] of Object.entries(group.matches)) {
          editingRules.value.push({
            name,
            description: match.description || '',
            type: match.ip ? 'ip' : match.ipv6 ? 'ipv6' : match.mark !== undefined ? 'mark' : match.vif !== undefined ? 'vif' : 'ip',
            details: formatMatchDetails(match),
            _matchConfig: match,
          });
        }
      }
      modalVisible.value = true;
    }

    async function saveGroup() {
      if (!editingGroup.value) return;
      const { name, description } = editingGroup.value;

      try {
        await configStore.setConfig(`qos traffic-match-group`, name);
        if (description) {
          await configStore.setConfig(`qos traffic-match-group ${name} description`, description);
        }

        // Delete existing matches
        const existingGroup = matchGroups.value.find(g => g.name === name);
        if (existingGroup && existingGroup.matches) {
          for (const existingName of Object.keys(existingGroup.matches)) {
            await configStore.deleteConfig(`qos traffic-match-group ${name} match ${existingName}`);
          }
        }

        // Save rules
        for (const rule of editingRules.value) {
          if (rule._matchConfig) {
            await configStore.setConfig(`qos traffic-match-group ${name} match`, rule.name);
            const m = rule._matchConfig;
            if (m.description) {
              await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} description`, m.description);
            }
            if (m.type === 'ip' && m.ip) {
              if (m.ip.destination?.address) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip destination address`, m.ip.destination.address);
              if (m.ip.destination?.port != null && m.ip.destination.port !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip destination port`, String(m.ip.destination.port));
              if (m.ip.source?.address) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip source address`, m.ip.source.address);
              if (m.ip.source?.port != null && m.ip.source.port !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip source port`, String(m.ip.source.port));
              if (m.ip.dscp) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip dscp`, m.ip.dscp);
              if (m.ip.protocol) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip protocol`, m.ip.protocol);
              if (m.ip['protocol-not']) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip protocol not`, '');
              if (m.ip['max-length'] != null && m.ip['max-length'] !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip max-length`, String(m.ip['max-length']));
              if (m.ip.tcp?.flags) {
                for (const flag of m.ip.tcp.flags) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip tcp ${flag}`, '');
              }
              if (m.ip.tcp?.not) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ip tcp not`, '');
            } else if (m.type === 'ipv6' && m.ipv6) {
              if (m.ipv6.destination?.address) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 destination address`, m.ipv6.destination.address);
              if (m.ipv6.destination?.port != null && m.ipv6.destination.port !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 destination port`, String(m.ipv6.destination.port));
              if (m.ipv6.source?.address) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 source address`, m.ipv6.source.address);
              if (m.ipv6.source?.port != null && m.ipv6.source.port !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 source port`, String(m.ipv6.source.port));
              if (m.ipv6.dscp) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 dscp`, m.ipv6.dscp);
              if (m.ipv6.protocol) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 protocol`, m.ipv6.protocol);
              if (m.ipv6['protocol-not']) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 protocol not`, '');
              if (m.ipv6['max-length'] != null && m.ipv6['max-length'] !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 max-length`, String(m.ipv6['max-length']));
              if (m.ipv6.tcp?.flags) {
                for (const flag of m.ipv6.tcp.flags) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 tcp ${flag}`, '');
              }
              if (m.ipv6.tcp?.not) await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} ipv6 tcp not`, '');
            } else if (m.type === 'mark') {
              await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} mark`, '');
            } else if (m.type === 'vif') {
              if (m.vif != null && m.vif !== '') await configStore.setConfig(`qos traffic-match-group ${name} match ${rule.name} vif`, String(m.vif));
            }
          }
        }

        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || t('qosMatch.messages.saveFailed'));
      }
    }

    async function removeGroup(group) {
      pendingDeleteGroupName.value = group.name;
      deleteGroupModalVisible.value = true;
    }

    async function confirmRemoveGroup() {
      deleteGroupModalVisible.value = false;
      try {
        await configStore.deleteConfig(`qos traffic-match-group ${pendingDeleteGroupName.value}`);
        configStore.markPending();
        await configStore.checkSessionChanged();
        pendingDeleteGroupName.value = '';
        await load();
      } catch (e) {
        showError(e.message || t('qosMatch.messages.deleteFailed'));
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
          'protocol-not': false,
          'max-length': null,
          tcp: { flags: [], not: false },
        },
        ipv6: {
          destination: { address: '', port: null },
          source: { address: '', port: null },
          dscp: '',
          protocol: '',
          'protocol-not': false,
          'max-length': null,
          tcp: { flags: [], not: false },
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
          'protocol-not': match.ip['protocol-not'] || false,
          'max-length': match.ip['max-length'] != null ? Number(match.ip['max-length']) : null,
          tcp: {
            flags: match.ip.tcp ? Object.keys(match.ip.tcp).filter(k => k !== 'not') : [],
            not: match.ip.tcp?.not || false,
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
          'protocol-not': match.ipv6['protocol-not'] || false,
          'max-length': match.ipv6['max-length'] != null ? Number(match.ipv6['max-length']) : null,
          tcp: {
            flags: match.ipv6.tcp ? Object.keys(match.ipv6.tcp).filter(k => k !== 'not') : [],
            not: match.ipv6.tcp?.not || false,
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
        await configStore.setConfig(`qos traffic-match-group ${groupName} match`, m.name);
        if (m.description) {
          await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} description`, m.description);
        }

        if (m.type === 'ip' && m.ip) {
          if (m.ip.destination?.address) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip destination address`, m.ip.destination.address);
          }
          if (m.ip.destination?.port != null && m.ip.destination.port !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip destination port`, String(m.ip.destination.port));
          }
          if (m.ip.source?.address) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip source address`, m.ip.source.address);
          }
          if (m.ip.source?.port != null && m.ip.source.port !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip source port`, String(m.ip.source.port));
          }
          if (m.ip.dscp) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip dscp`, m.ip.dscp);
          }
          if (m.ip.protocol) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip protocol`, m.ip.protocol);
          }
          if (m.ip['protocol-not']) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip protocol not`, '');
          }
          if (m.ip['max-length'] != null && m.ip['max-length'] !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip max-length`, String(m.ip['max-length']));
          }
          if (m.ip.tcp?.flags) {
            for (const flag of m.ip.tcp.flags) {
              await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip tcp ${flag}`, '');
            }
          }
          if (m.ip.tcp?.not) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ip tcp not`, '');
          }
        } else if (m.type === 'ipv6' && m.ipv6) {
          if (m.ipv6.destination?.address) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 destination address`, m.ipv6.destination.address);
          }
          if (m.ipv6.destination?.port != null && m.ipv6.destination.port !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 destination port`, String(m.ipv6.destination.port));
          }
          if (m.ipv6.source?.address) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 source address`, m.ipv6.source.address);
          }
          if (m.ipv6.source?.port != null && m.ipv6.source.port !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 source port`, String(m.ipv6.source.port));
          }
          if (m.ipv6.dscp) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 dscp`, m.ipv6.dscp);
          }
          if (m.ipv6.protocol) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 protocol`, m.ipv6.protocol);
          }
          if (m.ipv6['protocol-not']) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 protocol not`, '');
          }
          if (m.ipv6['max-length'] != null && m.ipv6['max-length'] !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 max-length`, String(m.ipv6['max-length']));
          }
          if (m.ipv6.tcp?.flags) {
            for (const flag of m.ipv6.tcp.flags) {
              await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 tcp ${flag}`, '');
            }
          }
          if (m.ipv6.tcp?.not) {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} ipv6 tcp not`, '');
          }
        } else if (m.type === 'mark') {
          await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} mark`, '');
        } else if (m.type === 'vif') {
          if (m.vif != null && m.vif !== '') {
            await configStore.setConfig(`qos traffic-match-group ${groupName} match ${m.name} vif`, String(m.vif));
          }
        }

        configStore.markPending();
        await configStore.checkSessionChanged();
        matchModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || t('qosMatch.messages.saveFailed'));
      }
    }

    async function removeMatch(match) {
      pendingDeleteMatchInfo.value = { groupName: editingGroup.value.name, matchName: match.name };
      deleteMatchModalVisible.value = true;
    }

    async function confirmRemoveMatch() {
      deleteMatchModalVisible.value = false;
      try {
        await configStore.deleteConfig(`qos traffic-match-group ${pendingDeleteMatchInfo.value.groupName} match ${pendingDeleteMatchInfo.value.matchName}`);
        configStore.markPending();
        await configStore.checkSessionChanged();
        pendingDeleteMatchInfo.value = { groupName: '', matchName: '' };
        await load();
      } catch (e) {
        showError(e.message || t('qosMatch.messages.deleteFailed'));
      }
    }

    function manageMatches(group) {
      editingGroup.value = group;
      activeTab.value = 'matches';
    }

    function getGroupMatches(groupName) {
      const group = matchGroups.value.find(g => g.name === groupName);
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
        return { name, type, details, ...match };
      });
    }

    function openMatchInGroup() {
      editingMatch.value = emptyMatch();
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    function editMatchInGroup(m) {
      const converted = emptyMatch();
      converted.name = m.name;
      converted.description = m.description || '';
      if (m.ip) {
        converted.type = 'ip';
        converted.ip = {
          destination: {
            address: m.ip.destination?.address || '',
            port: m.ip.destination?.port != null ? Number(m.ip.destination.port) : null,
          },
          source: {
            address: m.ip.source?.address || '',
            port: m.ip.source?.port != null ? Number(m.ip.source.port) : null,
          },
          dscp: m.ip.dscp || '',
          protocol: m.ip.protocol || '',
          'protocol-not': m.ip['protocol-not'] || false,
          'max-length': m.ip['max-length'] != null ? Number(m.ip['max-length']) : null,
          tcp: {
            flags: m.ip.tcp ? Object.keys(m.ip.tcp).filter(k => k !== 'not') : [],
            not: m.ip.tcp?.not || false,
          },
        };
      } else if (m.ipv6) {
        converted.type = 'ipv6';
        converted.ipv6 = {
          destination: {
            address: m.ipv6.destination?.address || '',
            port: m.ipv6.destination?.port != null ? Number(m.ipv6.destination.port) : null,
          },
          source: {
            address: m.ipv6.source?.address || '',
            port: m.ipv6.source?.port != null ? Number(m.ipv6.source.port) : null,
          },
          dscp: m.ipv6.dscp || '',
          protocol: m.ipv6.protocol || '',
          'protocol-not': m.ipv6['protocol-not'] || false,
          'max-length': m.ipv6['max-length'] != null ? Number(m.ipv6['max-length']) : null,
          tcp: {
            flags: m.ipv6.tcp ? Object.keys(m.ipv6.tcp).filter(k => k !== 'not') : [],
            not: m.ipv6.tcp?.not || false,
          },
        };
      } else if (m.mark !== undefined) {
        converted.type = 'mark';
        converted.mark = true;
      } else if (m.vif !== undefined) {
        converted.type = 'vif';
        converted.vif = Number(m.vif);
      }
      editingMatch.value = converted;
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    async function removeMatchInGroup(m) {
      pendingDeleteMatchInfo.value = { groupName: editingGroup.value.name, matchName: m.name };
      deleteMatchModalVisible.value = true;
    }

    async function confirmRemoveMatchInGroup() {
      deleteMatchModalVisible.value = false;
      try {
        await configStore.deleteConfig(`qos traffic-match-group ${pendingDeleteMatchInfo.value.groupName} match ${pendingDeleteMatchInfo.value.matchName}`);
        configStore.markPending();
        await configStore.checkSessionChanged();
        pendingDeleteMatchInfo.value = { groupName: '', matchName: '' };
        await load();
      } catch (e) {
        showError(e.message || t('qosMatch.messages.deleteFailed'));
      }
    }


    function createRule() {
      editingMatch.value = emptyMatch();
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    function editRule(rule) {
      const converted = emptyMatch();
      converted.name = rule.name;
      converted.description = rule.description || '';
      const m = rule._matchConfig || {};
      if (m.ip) {
        converted.type = 'ip';
        converted.ip = {
          destination: {
            address: m.ip.destination?.address || '',
            port: m.ip.destination?.port != null ? Number(m.ip.destination.port) : null,
          },
          source: {
            address: m.ip.source?.address || '',
            port: m.ip.source?.port != null ? Number(m.ip.source.port) : null,
          },
          dscp: m.ip.dscp || '',
          protocol: m.ip.protocol || '',
          'protocol-not': m.ip['protocol-not'] || false,
          'max-length': m.ip['max-length'] != null ? Number(m.ip['max-length']) : null,
          tcp: {
            flags: m.ip.tcp ? Object.keys(m.ip.tcp).filter(k => k !== 'not') : [],
            not: m.ip.tcp?.not || false,
          },
        };
      } else if (m.ipv6) {
        converted.type = 'ipv6';
        converted.ipv6 = {
          destination: {
            address: m.ipv6.destination?.address || '',
            port: m.ipv6.destination?.port != null ? Number(m.ipv6.destination.port) : null,
          },
          source: {
            address: m.ipv6.source?.address || '',
            port: m.ipv6.source?.port != null ? Number(m.ipv6.source.port) : null,
          },
          dscp: m.ipv6.dscp || '',
          protocol: m.ipv6.protocol || '',
          'protocol-not': m.ipv6['protocol-not'] || false,
          'max-length': m.ipv6['max-length'] != null ? Number(m.ipv6['max-length']) : null,
          tcp: {
            flags: m.ipv6.tcp ? Object.keys(m.ipv6.tcp).filter(k => k !== 'not') : [],
            not: m.ipv6.tcp?.not || false,
          },
        };
      } else if (m.mark !== undefined) {
        converted.type = 'mark';
        converted.mark = true;
      } else if (m.vif !== undefined) {
        converted.type = 'vif';
        converted.vif = Number(m.vif);
      }
      editingMatch.value = converted;
      matchActiveTab.value = 'basic';
      matchModalVisible.value = true;
    }

    function saveRule() {
      if (!editingMatch.value) return;
      const m = editingMatch.value;
      const matchConfig = { description: m.description || '' };
      if (m.type === 'ip' && m.ip) {
        const ip = {};
        if (m.ip.destination?.address || m.ip.destination?.port) {
          ip.destination = {};
          if (m.ip.destination.address) ip.destination.address = m.ip.destination.address;
          if (m.ip.destination.port) ip.destination.port = m.ip.destination.port;
        }
        if (m.ip.source?.address || m.ip.source?.port) {
          ip.source = {};
          if (m.ip.source.address) ip.source.address = m.ip.source.address;
          if (m.ip.source.port) ip.source.port = m.ip.source.port;
        }
        if (m.ip.dscp) ip.dscp = m.ip.dscp;
        if (m.ip.protocol) ip.protocol = m.ip.protocol;
        if (m.ip['protocol-not']) ip['protocol-not'] = '';
        if (m.ip['max-length']) ip['max-length'] = m.ip['max-length'];
        if (m.ip.tcp?.flags && m.ip.tcp.flags.length > 0) {
          ip.tcp = {};
          for (const flag of m.ip.tcp.flags) ip.tcp[flag] = '';
          if (m.ip.tcp.not) ip.tcp.not = '';
        }
        matchConfig.ip = ip;
        matchConfig.type = 'ip';
      } else if (m.type === 'ipv6' && m.ipv6) {
        const ipv6 = {};
        if (m.ipv6.destination?.address || m.ipv6.destination?.port) {
          ipv6.destination = {};
          if (m.ipv6.destination.address) ipv6.destination.address = m.ipv6.destination.address;
          if (m.ipv6.destination.port) ipv6.destination.port = m.ipv6.destination.port;
        }
        if (m.ipv6.source?.address || m.ipv6.source?.port) {
          ipv6.source = {};
          if (m.ipv6.source.address) ipv6.source.address = m.ipv6.source.address;
          if (m.ipv6.source.port) ipv6.source.port = m.ipv6.source.port;
        }
        if (m.ipv6.dscp) ipv6.dscp = m.ipv6.dscp;
        if (m.ipv6.protocol) ipv6.protocol = m.ipv6.protocol;
        if (m.ipv6['protocol-not']) ipv6['protocol-not'] = '';
        if (m.ipv6['max-length']) ipv6['max-length'] = m.ipv6['max-length'];
        if (m.ipv6.tcp?.flags && m.ipv6.tcp.flags.length > 0) {
          ipv6.tcp = {};
          for (const flag of m.ipv6.tcp.flags) ipv6.tcp[flag] = '';
          if (m.ipv6.tcp.not) ipv6.tcp.not = '';
        }
        matchConfig.ipv6 = ipv6;
        matchConfig.type = 'ipv6';
      } else if (m.type === 'mark') {
        matchConfig.mark = '';
        matchConfig.type = 'mark';
      } else if (m.type === 'vif') {
        if (m.vif != null && m.vif !== '') matchConfig.vif = m.vif;
        matchConfig.type = 'vif';
      }
      const flatRule = {
        name: m.name,
        description: m.description || '',
        type: m.type,
        details: formatMatchDetails(matchConfig),
        _matchConfig: matchConfig,
      };
      const idx = editingRules.value.findIndex(r => r.name === m.name);
      if (idx >= 0) editingRules.value[idx] = flatRule;
      else editingRules.value.push(flatRule);
      matchModalVisible.value = false;
    }

    function removeRule(rule) {
      editingRules.value = editingRules.value.filter(r => r.name !== rule.name);
    }

    function formatMatchDetails(match) {
      const parts = [];
      if (match.ip) {
        if (match.ip.destination?.address) parts.push('dst:' + match.ip.destination.address);
        if (match.ip.destination?.port) parts.push('dport:' + match.ip.destination.port);
        if (match.ip.source?.address) parts.push('src:' + match.ip.source.address);
        if (match.ip.source?.port) parts.push('sport:' + match.ip.source.port);
        if (match.ip.dscp) parts.push('dscp:' + match.ip.dscp);
        if (match.ip.protocol) parts.push('proto:' + match.ip.protocol);
      } else if (match.ipv6) {
        if (match.ipv6.destination?.address) parts.push('dst:' + match.ipv6.destination.address);
        if (match.ipv6.destination?.port) parts.push('dport:' + match.ipv6.destination.port);
        if (match.ipv6.source?.address) parts.push('src:' + match.ipv6.source.address);
        if (match.ipv6.source?.port) parts.push('sport:' + match.ipv6.source.port);
        if (match.ipv6.dscp) parts.push('dscp:' + match.ipv6.dscp);
      } else if (match.mark !== undefined) {
        parts.push('mark matched');
      } else if (match.vif !== undefined) {
        parts.push('vif:' + match.vif);
      }
      return parts.join(', ');
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, tableData, currentGroupMatches, groupColumns, matchColumns, ruleColumns, selected,
      modalVisible, matchModalVisible, editingGroup, editingMatch, activeTab, matchActiveTab,
      groupSchema, matchTabs, getMatchTabSchema, commandText, matchCommandText, dataTableRef,
      editingRules, deleteGroupModalVisible, pendingDeleteGroupName, deleteMatchModalVisible, pendingDeleteMatchInfo,
      load, createGroup, editGroup, saveGroup, removeGroup, confirmRemoveGroup,
      createMatch, editMatch, saveMatch, removeMatch, confirmRemoveMatch, manageMatches,
      createRule, editRule, saveRule, removeRule,
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
              <a @click="manageMatches(record)" style="margin-right: 8px">{{ t('qosMatch.buttons.manageRules') }}</a>
              <a @click="editGroup(record)" style="margin-right: 8px">{{ t('qosMatch.buttons.edit') }}</a>
              <a @click="removeGroup(record)" style="color: #ff4d4f">{{ t('qosMatch.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>
      </div>

      <div v-if="activeTab === 'matches' && editingGroup">
        <div class="toolbar">
          <ToolbarButton @click="activeTab = 'groups'" icon="cancel">{{ t('qosMatch.buttons.back') }}</ToolbarButton>
          <ToolbarButton @click="createMatch" icon="create">{{ t('qosMatch.buttons.createMatch') }}</ToolbarButton>
          <span style="margin-left: 16px; font-weight: bold;">{{ t('qosMatch.labels.matchGroup') }}: {{ editingGroup.name }}</span>
        </div>
        <DataTable
          :columns="matchColumns"
          :data="currentGroupMatches"
          :loading="loading"
          :externalToolbar="true"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editMatch(record)" style="margin-right: 8px">{{ t('qosMatch.buttons.edit') }}</a>
              <a @click="removeMatch(record)" style="color: #ff4d4f">{{ t('qosMatch.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>
      </div>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingGroup && tableData.find(d => d.key === editingGroup.key) ? t('qosMatch.modals.editMatchGroup') : t('qosMatch.modals.createMatchGroup')"
        @confirm="saveGroup"
        @close="modalVisible = false"
        width="900px"
      >
        <ConfigForm v-if="editingGroup" v-model="editingGroup" :schema="groupSchema" />

        <div v-if="editingGroup" style="margin-top:20px;border-top:1px solid #e8e8e8;padding-top:16px;">
          <h4 style="margin:0 0 12px 0;">{{ t('qosMatch.messages.matchRules') }}</h4>
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
                <a @click="editRule(record)" style="margin-right:8px">{{ t('qosMatch.buttons.edit') }}</a>
                <a @click="removeRule(record)" style="color:#ff4d4f">{{ t('qosMatch.buttons.delete') }}</a>
              </template>
            </template>
          </DataTable>
          <div v-if="editingRules.length === 0" style="text-align:center;color:#999;padding:20px;">{{ t('qosMatch.messages.noRules') }}</div>
        </div>
      </DraggableModal>

      <DraggableModal
        v-model:visible="matchModalVisible"
        :title="editingMatch ? t('qosMatch.modals.editMatchRule') : t('qosMatch.modals.createMatchRule')"
        @confirm="saveRule"
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
      </DraggableModal>

      <DraggableModal v-model:visible="deleteGroupModalVisible" :title="t('qosMatch.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveGroup">
        <div>{{ t('qosMatch.modals.confirmDeleteGroup') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteGroupName }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteMatchModalVisible" :title="t('qosMatch.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveMatch">
        <div>{{ t('qosMatch.modals.confirmDeleteMatch') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteMatchInfo.matchName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
