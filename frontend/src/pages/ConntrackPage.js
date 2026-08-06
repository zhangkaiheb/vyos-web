import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const TABS = [
  { key: 'basic', title: '基本设置' },
  { key: 'tcp', title: 'TCP 选项' },
  { key: 'timeout', title: '超时设置' },
  { key: 'ignore', title: '忽略规则' },
  { key: 'log', title: '日志设置' },
  { key: 'modules', title: '模块' },
];

const LOG_SCHEMA = [
  { key: 'tcpNew', title: 'TCP 新建连接', type: 'checkbox' },
  { key: 'tcpUpdate', title: 'TCP 连接更新', type: 'checkbox' },
  { key: 'tcpDestroy', title: 'TCP 连接删除', type: 'checkbox' },
  { key: 'udpNew', title: 'UDP 新建连接', type: 'checkbox' },
  { key: 'udpUpdate', title: 'UDP 连接更新', type: 'checkbox' },
  { key: 'udpDestroy', title: 'UDP 连接删除', type: 'checkbox' },
  { key: 'icmpNew', title: 'ICMP 新建连接', type: 'checkbox' },
  { key: 'icmpUpdate', title: 'ICMP 连接更新', type: 'checkbox' },
  { key: 'icmpDestroy', title: 'ICMP 连接删除', type: 'checkbox' },
  { key: 'otherNew', title: '其他协议新建连接', type: 'checkbox' },
  { key: 'otherUpdate', title: '其他协议连接更新', type: 'checkbox' },
  { key: 'otherDestroy', title: '其他协议连接删除', type: 'checkbox' },
];

const MODULES_SCHEMA = [
  { key: 'ftp', title: 'FTP', type: 'checkbox' },
  { key: 'h323', title: 'H.323', type: 'checkbox' },
  { key: 'nfs', title: 'NFS', type: 'checkbox' },
  { key: 'pptp', title: 'PPTP', type: 'checkbox' },
  { key: 'rtsp', title: 'RTSP', type: 'checkbox' },
  { key: 'sip', title: 'SIP', type: 'checkbox' },
  { key: 'sqlnet', title: 'SQLnet', type: 'checkbox' },
  { key: 'tftp', title: 'TFTP', type: 'checkbox' },
];

export default defineComponent({
  name: 'ConntrackPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const activeTab = ref('basic');
    const loading = ref(false);
    const writeDisabled = computed(() => configStore.sessionChanged);
    const path = computed(() => route.path.replace(/^\//, ''));

    // Basic data
    const basicData = ref({
      expectTableSize: 2048,
      hashSize: 32768,
      tableSize: 262144,
      flowAccounting: false,
    });

    // TCP data
    const tcpData = ref({
      halfOpenConnections: 512,
      loose: 'enable',
      maxRetrans: 3,
    });

    // Log data
    const logData = ref({
      tcpNew: false, tcpUpdate: false, tcpDestroy: false,
      udpNew: false, udpUpdate: false, udpDestroy: false,
      icmpNew: false, icmpUpdate: false, icmpDestroy: false,
      otherNew: false, otherUpdate: false, otherDestroy: false,
    });

    // Modules data
    const modulesData = ref({
      ftp: false, h323: false, nfs: false, pptp: false,
      rtsp: false, sip: false, sqlnet: false, tftp: false,
    });

    // Ignore rules
    const ignoreIpv4Rules = ref([]);
    const selectedIgnoreIpv4 = ref([]);
    const ignoreIpv4ModalVisible = ref(false);
    const editingIgnoreIpv4 = ref(null);

    const ignoreIpv6Rules = ref([]);
    const selectedIgnoreIpv6 = ref([]);
    const ignoreIpv6ModalVisible = ref(false);
    const editingIgnoreIpv6 = ref(null);

    // Custom timeout rules
    const customIpv4Rules = ref([]);
    const selectedCustomIpv4 = ref([]);
    const customIpv4ModalVisible = ref(false);
    const editingCustomIpv4 = ref(null);

    const customIpv6Rules = ref([]);
    const selectedCustomIpv6 = ref([]);
    const customIpv6ModalVisible = ref(false);
    const editingCustomIpv6 = ref(null);

    // Columns
    const ignoreColumns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'protocol', title: '协议' },
      { key: 'inboundInterface', title: '入站接口' },
      { key: 'sourceAddress', title: '源地址' },
      { key: 'sourcePort', title: '源端口' },
      { key: 'destinationAddress', title: '目的地址' },
      { key: 'destinationPort', title: '目的端口' },
    ];
    const customColumns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'protocol', title: '协议' },
      { key: 'inboundInterface', title: '入站接口' },
    ];

    // Schemas
    const PROTOCOL_OPTIONS = [
      'ah','ax.25','dccp','ddp','egp','eigrp','encap','esp','etherip','ethernet',
      'fc','ggp','gre','hip','hmp','hopopt','icmp','idpr-cmtp','idrp','igmp','igp',
      'ip','ipcomp','ipencap','ipip','ipv6','ipv6-frag','ipv6-icmp','ipv6-nonxt',
      'ipv6-opts','ipv6-route','isis','iso-tp4','l2tp','manet','mobility-header',
      'mpls-in-ip','mptcp','ospf','pim','pup','rdp','rohc','rspf','rsvp','sctp',
      'shim6','skip','st','tcp','udp','udplite','vmtp','vrrp','wesp','xns-idp','xtp',
    ].map(v => ({ value: v, label: v }));

    const basicSchema = computed(() => [
      { key: 'expectTableSize', title: 'Expect 表大小', type: 'number', min: 1, max: 50000000, defaultValue: 2048, help: '范围: 1-50000000, 默认: 2048' },
      { key: 'hashSize', title: 'Hash 表大小', type: 'number', min: 1, max: 50000000, defaultValue: 32768, help: '范围: 1-50000000, 默认: 32768' },
      { key: 'tableSize', title: '连接跟踪表大小', type: 'number', min: 1, max: 50000000, defaultValue: 262144, help: '范围: 1-50000000, 默认: 262144' },
      { key: 'flowAccounting', title: '启用流量统计', type: 'checkbox' },
    ]);

    const tcpSchema = computed(() => [
      { key: 'halfOpenConnections', title: '半开连接最大数', type: 'number', min: 1, max: 50000000, defaultValue: 512, help: '默认: 512' },
      { key: 'loose', title: '宽松模式', type: 'select', options: [
        { value: 'enable', label: '启用' },
        { value: 'disable', label: '禁用' },
      ], defaultValue: 'enable', help: '默认: enable' },
      { key: 'maxRetrans', title: '最大重传次数', type: 'number', min: 1, max: 255, defaultValue: 3, help: '范围: 1-255, 默认: 3' },
    ]);

    const TCP_FLAGS_OPTIONS = [
      'ack', 'cwr', 'ecn', 'fin', 'psh', 'rst', 'syn', 'urg',
    ].map(v => ({ value: v, label: v.toUpperCase() }));

    const ignoreRuleSchema = computed(() => [
      { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS, placeholder: '选择协议' },
      { key: 'inboundInterface', title: '入站接口', type: 'text', placeholder: '例如: eth0, any' },
      { key: 'sourceAddress', title: '源地址', type: 'text', placeholder: 'IP/子网/范围, 例如: 192.168.1.0/24 或 !10.0.0.0/8' },
      { key: 'sourceAddressGroup', title: '源地址组', type: 'text', placeholder: '地址组名称' },
      { key: 'sourceDomainGroup', title: '源域名组', type: 'text', placeholder: '域名组名称' },
      { key: 'sourceNetworkGroup', title: '源网络组', type: 'text', placeholder: '网络组名称' },
      { key: 'sourcePort', title: '源端口', type: 'text', placeholder: '端口号/范围, 例如: 80 或 1001-1005' },
      { key: 'sourcePortGroup', title: '源端口组', type: 'text', placeholder: '端口组名称' },
      { key: 'destinationAddress', title: '目的地址', type: 'text', placeholder: 'IP/子网/范围, 例如: 10.0.0.0/8' },
      { key: 'destinationAddressGroup', title: '目的地址组', type: 'text', placeholder: '地址组名称' },
      { key: 'destinationDomainGroup', title: '目的域名组', type: 'text', placeholder: '域名组名称' },
      { key: 'destinationNetworkGroup', title: '目的网络组', type: 'text', placeholder: '网络组名称' },
      { key: 'destinationMacGroup', title: '目的MAC组 (IPv6)', type: 'text', placeholder: 'MAC组名称' },
      { key: 'destinationPort', title: '目的端口', type: 'text', placeholder: '端口号/范围, 例如: 80 或 1001-1005' },
      { key: 'destinationPortGroup', title: '目的端口组', type: 'text', placeholder: '端口组名称' },
      { key: 'tcpFlags', title: 'TCP 标志位', type: 'multi-select', options: TCP_FLAGS_OPTIONS, placeholder: '选择 TCP 标志' },
      { key: 'tcpFlagsNot', title: 'TCP 标志位(非)', type: 'multi-select', options: TCP_FLAGS_OPTIONS, placeholder: '选择未设置的标志' },
    ]);

    const customRuleSchema = computed(() => [
      { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS, placeholder: '选择协议' },
      { key: 'inboundInterface', title: '入站接口', type: 'text', placeholder: '例如: eth0' },
      { key: 'sourceAddress', title: '源地址', type: 'text', placeholder: '例如: 192.168.1.0/24' },
      { key: 'sourcePort', title: '源端口', type: 'text', placeholder: '端口号/范围, 例如: 80 或 1001-1005' },
      { key: 'destinationAddress', title: '目的地址', type: 'text', placeholder: '例如: 10.0.0.0/8' },
      { key: 'destinationPort', title: '目的端口', type: 'text', placeholder: '端口号/范围, 例如: 80 或 1001-1005' },
      { key: 'tcpClose', title: 'TCP CLOSE 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpCloseWait', title: 'TCP CLOSE-WAIT 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpEstablished', title: 'TCP ESTABLISHED 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpFinWait', title: 'TCP FIN-WAIT 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpLastAck', title: 'TCP LAST-ACK 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpSynRecv', title: 'TCP SYN-RECV 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpSynSent', title: 'TCP SYN-SENT 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'tcpTimeWait', title: 'TCP TIME-WAIT 超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'udpReplied', title: 'UDP 已回复超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
      { key: 'udpUnreplied', title: 'UDP 未回复超时(秒)', type: 'number', min: 1, max: 21474836, help: '范围: 1-21474836' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, false);
        const raw = res.data || {};

        // Parse basic
        if (raw['expect-table-size']) basicData.value.expectTableSize = parseInt(raw['expect-table-size']);
        if (raw['hash-size']) basicData.value.hashSize = parseInt(raw['hash-size']);
        if (raw['table-size']) basicData.value.tableSize = parseInt(raw['table-size']);
        if (raw['flow-accounting']) basicData.value.flowAccounting = true;

        // Parse TCP
        const tcp = raw.tcp || {};
        if (tcp['half-open-connections']) tcpData.value.halfOpenConnections = parseInt(tcp['half-open-connections']);
        if (tcp.loose) tcpData.value.loose = tcp.loose;
        if (tcp['max-retrans']) tcpData.value.maxRetrans = parseInt(tcp['max-retrans']);

        // Parse custom timeout rules (timeout only has 'custom' subpath)
        const custom = (raw.timeout || {}).custom || {};
        const customIpv4 = custom.ipv4 || {};
        const customIpv4Result = [];
        for (const [id, attrs] of Object.entries(customIpv4.rule || {})) {
          const rule = { id: parseInt(id), description: attrs.description || '', protocol: attrs.protocol || '', inboundInterface: attrs['inbound-interface'] || '' };
          const src = attrs.source || {};
          rule.sourceAddress = src.address || '';
          rule.sourcePort = src.port || '';
          const dst = attrs.destination || {};
          rule.destinationAddress = dst.address || '';
          rule.destinationPort = dst.port || '';
          const proto = attrs.protocol || {};
          if (proto.tcp) {
            if (proto.tcp.close) rule.tcpClose = parseInt(proto.tcp.close);
            if (proto.tcp.established) rule.tcpEstablished = parseInt(proto.tcp.established);
            if (proto.tcp['close-wait']) rule.tcpCloseWait = parseInt(proto.tcp['close-wait']);
            if (proto.tcp['fin-wait']) rule.tcpFinWait = parseInt(proto.tcp['fin-wait']);
            if (proto.tcp['last-ack']) rule.tcpLastAck = parseInt(proto.tcp['last-ack']);
            if (proto.tcp['syn-recv']) rule.tcpSynRecv = parseInt(proto.tcp['syn-recv']);
            if (proto.tcp['syn-sent']) rule.tcpSynSent = parseInt(proto.tcp['syn-sent']);
            if (proto.tcp['time-wait']) rule.tcpTimeWait = parseInt(proto.tcp['time-wait']);
          }
          if (proto.udp) {
            if (proto.udp.replied) rule.udpReplied = parseInt(proto.udp.replied);
            if (proto.udp.unreplied) rule.udpUnreplied = parseInt(proto.udp.unreplied);
          }
          customIpv4Result.push(rule);
        }
        customIpv4Result.sort((a, b) => a.id - b.id);
        customIpv4Rules.value = customIpv4Result;

        const customIpv6 = custom.ipv6 || {};
        const customIpv6Result = [];
        for (const [id, attrs] of Object.entries(customIpv6.rule || {})) {
          const rule = { id: parseInt(id), description: attrs.description || '', protocol: attrs.protocol || '', inboundInterface: attrs['inbound-interface'] || '' };
          const src = attrs.source || {};
          rule.sourceAddress = src.address || '';
          rule.sourcePort = src.port || '';
          const dst = attrs.destination || {};
          rule.destinationAddress = dst.address || '';
          rule.destinationPort = dst.port || '';
          customIpv6Result.push(rule);
        }
        customIpv6Result.sort((a, b) => a.id - b.id);
        customIpv6Rules.value = customIpv6Result;

        // Parse ignore rules
        const ignore = raw.ignore || {};
        const ignoreIpv4 = ignore.ipv4 || {};
        const ignoreIpv4Result = [];
        for (const [id, attrs] of Object.entries(ignoreIpv4.rule || {})) {
          const rule = { id: parseInt(id), description: attrs.description || '', protocol: attrs.protocol || '', inboundInterface: attrs['inbound-interface'] || '' };
          const src = attrs.source || {};
          rule.sourceAddress = src.address || '';
          rule.sourcePort = src.port || '';
          if (src.group) {
            rule.sourceAddressGroup = src.group['address-group'] || '';
            rule.sourceDomainGroup = src.group['domain-group'] || '';
            rule.sourceNetworkGroup = src.group['network-group'] || '';
            rule.sourcePortGroup = src.group['port-group'] || '';
          }
          const dst = attrs.destination || {};
          rule.destinationAddress = dst.address || '';
          rule.destinationPort = dst.port || '';
          if (dst.group) {
            rule.destinationAddressGroup = dst.group['address-group'] || '';
            rule.destinationDomainGroup = dst.group['domain-group'] || '';
            rule.destinationNetworkGroup = dst.group['network-group'] || '';
            rule.destinationMacGroup = dst.group['mac-group'] || '';
            rule.destinationPortGroup = dst.group['port-group'] || '';
          }
          const tcp = attrs.tcp || {};
          rule.tcpFlags = tcp.flags ? Object.keys(tcp.flags) : [];
          rule.tcpFlagsNot = tcp.not ? Object.keys(tcp.not) : [];
          ignoreIpv4Result.push(rule);
        }
        ignoreIpv4Result.sort((a, b) => a.id - b.id);
        ignoreIpv4Rules.value = ignoreIpv4Result;

        const ignoreIpv6 = ignore.ipv6 || {};
        const ignoreIpv6Result = [];
        for (const [id, attrs] of Object.entries(ignoreIpv6.rule || {})) {
          const rule = { id: parseInt(id), description: attrs.description || '', protocol: attrs.protocol || '', inboundInterface: attrs['inbound-interface'] || '' };
          const src = attrs.source || {};
          rule.sourceAddress = src.address || '';
          rule.sourcePort = src.port || '';
          if (src.group) {
            rule.sourceAddressGroup = src.group['address-group'] || '';
            rule.sourceDomainGroup = src.group['domain-group'] || '';
            rule.sourceNetworkGroup = src.group['network-group'] || '';
            rule.sourcePortGroup = src.group['port-group'] || '';
          }
          const dst = attrs.destination || {};
          rule.destinationAddress = dst.address || '';
          rule.destinationPort = dst.port || '';
          if (dst.group) {
            rule.destinationAddressGroup = dst.group['address-group'] || '';
            rule.destinationDomainGroup = dst.group['domain-group'] || '';
            rule.destinationNetworkGroup = dst.group['network-group'] || '';
            rule.destinationMacGroup = dst.group['mac-group'] || '';
            rule.destinationPortGroup = dst.group['port-group'] || '';
          }
          const tcp = attrs.tcp || {};
          rule.tcpFlags = tcp.flags ? Object.keys(tcp.flags) : [];
          rule.tcpFlagsNot = tcp.not ? Object.keys(tcp.not) : [];
          ignoreIpv6Result.push(rule);
        }
        ignoreIpv6Result.sort((a, b) => a.id - b.id);
        ignoreIpv6Rules.value = ignoreIpv6Result;

        // Parse log
        const log = raw.log || {};
        const logTcp = log.tcp || {};
        logData.value.tcpNew = !!logTcp.new;
        logData.value.tcpUpdate = !!logTcp.update;
        logData.value.tcpDestroy = !!logTcp.destroy;
        const logUdp = log.udp || {};
        logData.value.udpNew = !!logUdp.new;
        logData.value.udpUpdate = !!logUdp.update;
        logData.value.udpDestroy = !!logUdp.destroy;
        const logIcmp = log.icmp || {};
        logData.value.icmpNew = !!logIcmp.new;
        logData.value.icmpUpdate = !!logIcmp.update;
        logData.value.icmpDestroy = !!logIcmp.destroy;
        const logOther = log.other || {};
        logData.value.otherNew = !!logOther.new;
        logData.value.otherUpdate = !!logOther.update;
        logData.value.otherDestroy = !!logOther.destroy;

        // Parse modules
        const modules = raw.modules || {};
        modulesData.value.ftp = !!modules.ftp;
        modulesData.value.h323 = !!modules.h323;
        modulesData.value.nfs = !!modules.nfs;
        modulesData.value.pptp = !!modules.pptp;
        modulesData.value.rtsp = !!modules.rtsp;
        modulesData.value.sip = !!modules.sip;
        modulesData.value.sqlnet = !!modules.sqlnet;
        modulesData.value.tftp = !!modules.tftp;
      } catch (e) {
        showError('加载配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    async function saveBasic() {
      try {
        const value = {};
        value['expect-table-size'] = String(basicData.value.expectTableSize);
        value['hash-size'] = String(basicData.value.hashSize);
        value['table-size'] = String(basicData.value.tableSize);
        if (basicData.value.flowAccounting) value['flow-accounting'] = '';
        await configStore.setConfig(path.value, value);
        await load();
      } catch (e) {
        showError('保存基本设置失败', e);
      }
    }

    async function saveTcp() {
      try {
        const value = {};
        value['half-open-connections'] = String(tcpData.value.halfOpenConnections);
        value.loose = tcpData.value.loose;
        value['max-retrans'] = String(tcpData.value.maxRetrans);
        await configStore.setConfig(`${path.value}/tcp`, value);
        await load();
      } catch (e) {
        showError('保存 TCP 设置失败', e);
      }
    }

    async function saveLog() {
      try {
        const value = {};
        const tcp = {};
        if (logData.value.tcpNew) tcp.new = '';
        if (logData.value.tcpUpdate) tcp.update = '';
        if (logData.value.tcpDestroy) tcp.destroy = '';
        if (Object.keys(tcp).length) value.tcp = tcp;
        const udp = {};
        if (logData.value.udpNew) udp.new = '';
        if (logData.value.udpUpdate) udp.update = '';
        if (logData.value.udpDestroy) udp.destroy = '';
        if (Object.keys(udp).length) value.udp = udp;
        const icmp = {};
        if (logData.value.icmpNew) icmp.new = '';
        if (logData.value.icmpUpdate) icmp.update = '';
        if (logData.value.icmpDestroy) icmp.destroy = '';
        if (Object.keys(icmp).length) value.icmp = icmp;
        const other = {};
        if (logData.value.otherNew) other.new = '';
        if (logData.value.otherUpdate) other.update = '';
        if (logData.value.otherDestroy) other.destroy = '';
        if (Object.keys(other).length) value.other = other;
        await configStore.setConfig(`${path.value}/log`, value);
        await load();
      } catch (e) {
        showError('保存日志设置失败', e);
      }
    }

    async function saveModules() {
      try {
        const value = {};
        if (modulesData.value.ftp) value.ftp = '';
        if (modulesData.value.h323) value.h323 = '';
        if (modulesData.value.nfs) value.nfs = '';
        if (modulesData.value.pptp) value.pptp = '';
        if (modulesData.value.rtsp) value.rtsp = '';
        if (modulesData.value.sip) value.sip = '';
        if (modulesData.value.sqlnet) value.sqlnet = '';
        if (modulesData.value.tftp) value.tftp = '';
        await configStore.setConfig(`${path.value}/modules`, value);
        await load();
      } catch (e) {
        showError('保存模块设置失败', e);
      }
    }

    // Ignore handlers
    async function openIgnoreIpv4Modal(row) {
      editingIgnoreIpv4.value = row ? { ...row } : { id: 1, description: '', protocol: '', inboundInterface: '', sourceAddress: '', sourcePort: '', sourceAddressGroup: '', sourceDomainGroup: '', sourceNetworkGroup: '', sourcePortGroup: '', destinationAddress: '', destinationPort: '', destinationAddressGroup: '', destinationDomainGroup: '', destinationNetworkGroup: '', destinationMacGroup: '', destinationPortGroup: '', tcpFlags: [], tcpFlagsNot: [] };
      ignoreIpv4ModalVisible.value = true;
    }
    async function saveIgnoreIpv4() {
      try {
        const rule = editingIgnoreIpv4.value;
        const value = {};
        if (rule.description) value.description = rule.description;
        if (rule.protocol) value.protocol = rule.protocol;
        if (rule.inboundInterface) value['inbound-interface'] = rule.inboundInterface;
        const src = {};
        if (rule.sourceAddress) src.address = rule.sourceAddress;
        if (rule.sourcePort) src.port = rule.sourcePort;
        const srcGroup = {};
        if (rule.sourceAddressGroup) srcGroup['address-group'] = rule.sourceAddressGroup;
        if (rule.sourceDomainGroup) srcGroup['domain-group'] = rule.sourceDomainGroup;
        if (rule.sourceNetworkGroup) srcGroup['network-group'] = rule.sourceNetworkGroup;
        if (rule.sourcePortGroup) srcGroup['port-group'] = rule.sourcePortGroup;
        if (Object.keys(srcGroup).length) src.group = srcGroup;
        if (Object.keys(src).length) value.source = src;
        const dst = {};
        if (rule.destinationAddress) dst.address = rule.destinationAddress;
        if (rule.destinationPort) dst.port = rule.destinationPort;
        const dstGroup = {};
        if (rule.destinationAddressGroup) dstGroup['address-group'] = rule.destinationAddressGroup;
        if (rule.destinationDomainGroup) dstGroup['domain-group'] = rule.destinationDomainGroup;
        if (rule.destinationNetworkGroup) dstGroup['network-group'] = rule.destinationNetworkGroup;
        if (rule.destinationMacGroup) dstGroup['mac-group'] = rule.destinationMacGroup;
        if (rule.destinationPortGroup) dstGroup['port-group'] = rule.destinationPortGroup;
        if (Object.keys(dstGroup).length) dst.group = dstGroup;
        if (Object.keys(dst).length) value.destination = dst;
        const tcp = {};
        if (rule.tcpFlags && rule.tcpFlags.length) {
          const flags = {};
          rule.tcpFlags.forEach(f => { flags[f] = ''; });
          tcp.flags = flags;
        }
        if (rule.tcpFlagsNot && rule.tcpFlagsNot.length) {
          const notFlags = {};
          rule.tcpFlagsNot.forEach(f => { notFlags[f] = ''; });
          tcp.not = notFlags;
        }
        if (Object.keys(tcp).length) value.tcp = tcp;
        await configStore.setConfig(`${path.value}/ignore/ipv4/rule/${rule.id}`, value);
        ignoreIpv4ModalVisible.value = false;
        await load();
      } catch (e) { showError('保存忽略规则失败', e); }
    }
    async function deleteIgnoreIpv4() {
      if (!selectedIgnoreIpv4.value.length) return;
      try {
        for (const id of selectedIgnoreIpv4.value) await configStore.deleteConfig(`${path.value}/ignore/ipv4/rule/${id}`);
        selectedIgnoreIpv4.value = [];
        await load();
      } catch (e) { showError('删除忽略规则失败', e); }
    }
    async function openIgnoreIpv6Modal(row) {
      editingIgnoreIpv6.value = row ? { ...row } : { id: 1, description: '', protocol: '', inboundInterface: '', sourceAddress: '', sourcePort: '', sourceAddressGroup: '', sourceDomainGroup: '', sourceNetworkGroup: '', sourcePortGroup: '', destinationAddress: '', destinationPort: '', destinationAddressGroup: '', destinationDomainGroup: '', destinationNetworkGroup: '', destinationMacGroup: '', destinationPortGroup: '', tcpFlags: [], tcpFlagsNot: [] };
      ignoreIpv6ModalVisible.value = true;
    }
    async function saveIgnoreIpv6() {
      try {
        const rule = editingIgnoreIpv6.value;
        const value = {};
        if (rule.description) value.description = rule.description;
        if (rule.protocol) value.protocol = rule.protocol;
        if (rule.inboundInterface) value['inbound-interface'] = rule.inboundInterface;
        const src = {};
        if (rule.sourceAddress) src.address = rule.sourceAddress;
        if (rule.sourcePort) src.port = rule.sourcePort;
        const srcGroup = {};
        if (rule.sourceAddressGroup) srcGroup['address-group'] = rule.sourceAddressGroup;
        if (rule.sourceDomainGroup) srcGroup['domain-group'] = rule.sourceDomainGroup;
        if (rule.sourceNetworkGroup) srcGroup['network-group'] = rule.sourceNetworkGroup;
        if (rule.sourcePortGroup) srcGroup['port-group'] = rule.sourcePortGroup;
        if (Object.keys(srcGroup).length) src.group = srcGroup;
        if (Object.keys(src).length) value.source = src;
        const dst = {};
        if (rule.destinationAddress) dst.address = rule.destinationAddress;
        if (rule.destinationPort) dst.port = rule.destinationPort;
        const dstGroup = {};
        if (rule.destinationAddressGroup) dstGroup['address-group'] = rule.destinationAddressGroup;
        if (rule.destinationDomainGroup) dstGroup['domain-group'] = rule.destinationDomainGroup;
        if (rule.destinationNetworkGroup) dstGroup['network-group'] = rule.destinationNetworkGroup;
        if (rule.destinationMacGroup) dstGroup['mac-group'] = rule.destinationMacGroup;
        if (rule.destinationPortGroup) dstGroup['port-group'] = rule.destinationPortGroup;
        if (Object.keys(dstGroup).length) dst.group = dstGroup;
        if (Object.keys(dst).length) value.destination = dst;
        const tcp = {};
        if (rule.tcpFlags && rule.tcpFlags.length) {
          const flags = {};
          rule.tcpFlags.forEach(f => { flags[f] = ''; });
          tcp.flags = flags;
        }
        if (rule.tcpFlagsNot && rule.tcpFlagsNot.length) {
          const notFlags = {};
          rule.tcpFlagsNot.forEach(f => { notFlags[f] = ''; });
          tcp.not = notFlags;
        }
        if (Object.keys(tcp).length) value.tcp = tcp;
        await configStore.setConfig(`${path.value}/ignore/ipv6/rule/${rule.id}`, value);
        ignoreIpv6ModalVisible.value = false;
        await load();
      } catch (e) { showError('保存忽略规则失败', e); }
    }
    async function deleteIgnoreIpv6() {
      if (!selectedIgnoreIpv6.value.length) return;
      try {
        for (const id of selectedIgnoreIpv6.value) await configStore.deleteConfig(`${path.value}/ignore/ipv6/rule/${id}`);
        selectedIgnoreIpv6.value = [];
        await load();
      } catch (e) { showError('删除忽略规则失败', e); }
    }

    // Custom timeout handlers
    async function openCustomIpv4Modal(row) {
      editingCustomIpv4.value = row ? { ...row } : { id: 1, description: '', protocol: '', inboundInterface: '', sourceAddress: '', sourcePort: '', destinationAddress: '', destinationPort: '' };
      customIpv4ModalVisible.value = true;
    }
    async function saveCustomIpv4() {
      try {
        const rule = editingCustomIpv4.value;
        const value = {};
        if (rule.description) value.description = rule.description;
        if (rule.protocol) value.protocol = rule.protocol;
        if (rule.inboundInterface) value['inbound-interface'] = rule.inboundInterface;
        const src = {};
        if (rule.sourceAddress) src.address = rule.sourceAddress;
        if (rule.sourcePort) src.port = rule.sourcePort;
        if (Object.keys(src).length) value.source = src;
        const dst = {};
        if (rule.destinationAddress) dst.address = rule.destinationAddress;
        if (rule.destinationPort) dst.port = rule.destinationPort;
        if (Object.keys(dst).length) value.destination = dst;
        const proto = {};
        const tcp = {};
        if (rule.tcpClose) tcp.close = String(rule.tcpClose);
        if (rule.tcpEstablished) tcp.established = String(rule.tcpEstablished);
        if (rule.tcpCloseWait) tcp['close-wait'] = String(rule.tcpCloseWait);
        if (rule.tcpFinWait) tcp['fin-wait'] = String(rule.tcpFinWait);
        if (rule.tcpLastAck) tcp['last-ack'] = String(rule.tcpLastAck);
        if (rule.tcpSynRecv) tcp['syn-recv'] = String(rule.tcpSynRecv);
        if (rule.tcpSynSent) tcp['syn-sent'] = String(rule.tcpSynSent);
        if (rule.tcpTimeWait) tcp['time-wait'] = String(rule.tcpTimeWait);
        if (Object.keys(tcp).length) proto.tcp = tcp;
        const udp = {};
        if (rule.udpReplied) udp.replied = String(rule.udpReplied);
        if (rule.udpUnreplied) udp.unreplied = String(rule.udpUnreplied);
        if (Object.keys(udp).length) proto.udp = udp;
        if (Object.keys(proto).length) value.protocol = proto;
        await configStore.setConfig(`${path.value}/timeout/custom/ipv4/rule/${rule.id}`, value);
        customIpv4ModalVisible.value = false;
        await load();
      } catch (e) { showError('保存自定义超时规则失败', e); }
    }
    async function deleteCustomIpv4() {
      if (!selectedCustomIpv4.value.length) return;
      try {
        for (const id of selectedCustomIpv4.value) await configStore.deleteConfig(`${path.value}/timeout/custom/ipv4/rule/${id}`);
        selectedCustomIpv4.value = [];
        await load();
      } catch (e) { showError('删除自定义超时规则失败', e); }
    }
    async function openCustomIpv6Modal(row) {
      editingCustomIpv6.value = row ? { ...row } : { id: 1, description: '', protocol: '', inboundInterface: '', sourceAddress: '', sourcePort: '', destinationAddress: '', destinationPort: '' };
      customIpv6ModalVisible.value = true;
    }
    async function saveCustomIpv6() {
      try {
        const rule = editingCustomIpv6.value;
        const value = {};
        if (rule.description) value.description = rule.description;
        if (rule.protocol) value.protocol = rule.protocol;
        if (rule.inboundInterface) value['inbound-interface'] = rule.inboundInterface;
        const src = {};
        if (rule.sourceAddress) src.address = rule.sourceAddress;
        if (rule.sourcePort) src.port = rule.sourcePort;
        if (Object.keys(src).length) value.source = src;
        const dst = {};
        if (rule.destinationAddress) dst.address = rule.destinationAddress;
        if (rule.destinationPort) dst.port = rule.destinationPort;
        if (Object.keys(dst).length) value.destination = dst;
        const proto = {};
        const tcp = {};
        if (rule.tcpClose) tcp.close = String(rule.tcpClose);
        if (rule.tcpEstablished) tcp.established = String(rule.tcpEstablished);
        if (rule.tcpCloseWait) tcp['close-wait'] = String(rule.tcpCloseWait);
        if (rule.tcpFinWait) tcp['fin-wait'] = String(rule.tcpFinWait);
        if (rule.tcpLastAck) tcp['last-ack'] = String(rule.tcpLastAck);
        if (rule.tcpSynRecv) tcp['syn-recv'] = String(rule.tcpSynRecv);
        if (rule.tcpSynSent) tcp['syn-sent'] = String(rule.tcpSynSent);
        if (rule.tcpTimeWait) tcp['time-wait'] = String(rule.tcpTimeWait);
        if (Object.keys(tcp).length) proto.tcp = tcp;
        const udp = {};
        if (rule.udpReplied) udp.replied = String(rule.udpReplied);
        if (rule.udpUnreplied) udp.unreplied = String(rule.udpUnreplied);
        if (Object.keys(udp).length) proto.udp = udp;
        if (Object.keys(proto).length) value.protocol = proto;
        await configStore.setConfig(`${path.value}/timeout/custom/ipv6/rule/${rule.id}`, value);
        customIpv6ModalVisible.value = false;
        await load();
      } catch (e) { showError('保存自定义超时规则失败', e); }
    }
    async function deleteCustomIpv6() {
      if (!selectedCustomIpv6.value.length) return;
      try {
        for (const id of selectedCustomIpv6.value) await configStore.deleteConfig(`${path.value}/timeout/custom/ipv6/rule/${id}`);
        selectedCustomIpv6.value = [];
        await load();
      } catch (e) { showError('删除自定义超时规则失败', e); }
    }

    onMounted(load);

    return {
      TABS, activeTab, loading, writeDisabled, path,
      basicData, basicSchema, saveBasic,
      tcpData, tcpSchema, saveTcp,
      logData, logSchema: LOG_SCHEMA, saveLog,
      modulesData, modulesSchema: MODULES_SCHEMA, saveModules,
      ignoreIpv4Rules, selectedIgnoreIpv4, ignoreColumns, ignoreIpv4ModalVisible, editingIgnoreIpv4,
      openIgnoreIpv4Modal, saveIgnoreIpv4, deleteIgnoreIpv4,
      ignoreIpv6Rules, selectedIgnoreIpv6, ignoreIpv6ModalVisible, editingIgnoreIpv6,
      openIgnoreIpv6Modal, saveIgnoreIpv6, deleteIgnoreIpv6,
      customIpv4Rules, selectedCustomIpv4, customColumns, customIpv4ModalVisible, editingCustomIpv4,
      openCustomIpv4Modal, saveCustomIpv4, deleteCustomIpv4,
      customIpv6Rules, selectedCustomIpv6, customIpv6ModalVisible, editingCustomIpv6,
      openCustomIpv6Modal, saveCustomIpv6, deleteCustomIpv6,
      ignoreRuleSchema, customRuleSchema,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="TABS">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本设置</div>
              <div style="padding:16px;">
                <ConfigForm v-model="basicData" :schema="basicSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #tcp>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">TCP 选项</div>
              <div style="padding:16px;">
                <ConfigForm v-model="tcpData" :schema="tcpSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #timeout>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">自定义超时规则 - IPv4</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openCustomIpv4Modal(null)">创建</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedCustomIpv4.length !== 1" @click="openCustomIpv4Modal(customIpv4Rules.find(r => r.id === selectedCustomIpv4[0]))">编辑</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedCustomIpv4.length" @click="deleteCustomIpv4">删除</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="customColumns" :data="customIpv4Rules" v-model:selectedRowKeys="selectedCustomIpv4" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">自定义超时规则 - IPv6</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openCustomIpv6Modal(null)">创建</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedCustomIpv6.length !== 1" @click="openCustomIpv6Modal(customIpv6Rules.find(r => r.id === selectedCustomIpv6[0]))">编辑</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedCustomIpv6.length" @click="deleteCustomIpv6">删除</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="customColumns" :data="customIpv6Rules" v-model:selectedRowKeys="selectedCustomIpv6" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
          </div>
        </template>

        <template #ignore>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">忽略规则 - IPv4</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openIgnoreIpv4Modal(null)">创建</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedIgnoreIpv4.length !== 1" @click="openIgnoreIpv4Modal(ignoreIpv4Rules.find(r => r.id === selectedIgnoreIpv4[0]))">编辑</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedIgnoreIpv4.length" @click="deleteIgnoreIpv4">删除</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="ignoreColumns" :data="ignoreIpv4Rules" v-model:selectedRowKeys="selectedIgnoreIpv4" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">忽略规则 - IPv6</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openIgnoreIpv6Modal(null)">创建</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedIgnoreIpv6.length !== 1" @click="openIgnoreIpv6Modal(ignoreIpv6Rules.find(r => r.id === selectedIgnoreIpv6[0]))">编辑</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedIgnoreIpv6.length" @click="deleteIgnoreIpv6">删除</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="ignoreColumns" :data="ignoreIpv6Rules" v-model:selectedRowKeys="selectedIgnoreIpv6" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
          </div>
        </template>

        <template #log>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">日志设置</div>
              <div style="padding:16px;">
                <ConfigForm v-model="logData" :schema="logSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #modules>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">模块</div>
              <div style="padding:16px;">
                <ConfigForm v-model="modulesData" :schema="modulesSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton v-if="activeTab === 'basic'" icon="save" primary @click="saveBasic" :disabled="writeDisabled">保存</ToolbarButton>
        <ToolbarButton v-if="activeTab === 'tcp'" icon="save" primary @click="saveTcp" :disabled="writeDisabled">保存</ToolbarButton>
        <ToolbarButton v-if="activeTab === 'log'" icon="save" primary @click="saveLog" :disabled="writeDisabled">保存</ToolbarButton>
        <ToolbarButton v-if="activeTab === 'modules'" icon="save" primary @click="saveModules" :disabled="writeDisabled">保存</ToolbarButton>
      </div>

      <!-- Modals -->
      <DraggableModal v-model:visible="ignoreIpv4ModalVisible" title="忽略规则 - IPv4" width="600px">
        <ConfigForm v-model="editingIgnoreIpv4" :schema="ignoreRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="ignoreIpv4ModalVisible = false">取消</button>
          <button class="btn-primary" @click="saveIgnoreIpv4">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="ignoreIpv6ModalVisible" title="忽略规则 - IPv6" width="600px">
        <ConfigForm v-model="editingIgnoreIpv6" :schema="ignoreRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="ignoreIpv6ModalVisible = false">取消</button>
          <button class="btn-primary" @click="saveIgnoreIpv6">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="customIpv4ModalVisible" title="自定义超时规则 - IPv4" width="700px">
        <ConfigForm v-model="editingCustomIpv4" :schema="customRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="customIpv4ModalVisible = false">取消</button>
          <button class="btn-primary" @click="saveCustomIpv4">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="customIpv6ModalVisible" title="自定义超时规则 - IPv6" width="700px">
        <ConfigForm v-model="editingCustomIpv6" :schema="customRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="customIpv6ModalVisible = false">取消</button>
          <button class="btn-primary" @click="saveCustomIpv6">确定</button>
        </template>
      </DraggableModal>

    </div>
  `,
});
