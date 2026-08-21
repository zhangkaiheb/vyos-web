import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'ConntrackPage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();

    const TABS = computed(() => [
      { key: 'basic', title: t('conntrack.tabs.basic') },
      { key: 'tcp', title: t('conntrack.tabs.tcp') },
      { key: 'timeout', title: t('conntrack.tabs.timeout') },
      { key: 'ignore', title: t('conntrack.tabs.ignore') },
      { key: 'log', title: t('conntrack.tabs.log') },
      { key: 'modules', title: t('conntrack.tabs.modules') },
    ]);

    const LOG_SCHEMA = computed(() => [
      { key: 'tcpNew', title: t('conntrack.log.tcpNew'), type: 'checkbox' },
      { key: 'tcpUpdate', title: t('conntrack.log.tcpUpdate'), type: 'checkbox' },
      { key: 'tcpDestroy', title: t('conntrack.log.tcpDestroy'), type: 'checkbox' },
      { key: 'udpNew', title: t('conntrack.log.udpNew'), type: 'checkbox' },
      { key: 'udpUpdate', title: t('conntrack.log.udpUpdate'), type: 'checkbox' },
      { key: 'udpDestroy', title: t('conntrack.log.udpDestroy'), type: 'checkbox' },
      { key: 'icmpNew', title: t('conntrack.log.icmpNew'), type: 'checkbox' },
      { key: 'icmpUpdate', title: t('conntrack.log.icmpUpdate'), type: 'checkbox' },
      { key: 'icmpDestroy', title: t('conntrack.log.icmpDestroy'), type: 'checkbox' },
      { key: 'otherNew', title: t('conntrack.log.otherNew'), type: 'checkbox' },
      { key: 'otherUpdate', title: t('conntrack.log.otherUpdate'), type: 'checkbox' },
      { key: 'otherDestroy', title: t('conntrack.log.otherDestroy'), type: 'checkbox' },
    ]);

    const MODULES_SCHEMA = computed(() => [
      { key: 'ftp', title: 'FTP', type: 'checkbox' },
      { key: 'h323', title: 'H.323', type: 'checkbox' },
      { key: 'nfs', title: 'NFS', type: 'checkbox' },
      { key: 'pptp', title: 'PPTP', type: 'checkbox' },
      { key: 'rtsp', title: 'RTSP', type: 'checkbox' },
      { key: 'sip', title: 'SIP', type: 'checkbox' },
      { key: 'sqlnet', title: 'SQLnet', type: 'checkbox' },
      { key: 'tftp', title: 'TFTP', type: 'checkbox' },
    ]);

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
    const ignoreColumns = computed(() => [
      { key: 'id', title: t('conntrack.columns.ruleNumber') },
      { key: 'description', title: t('conntrack.columns.description') },
      { key: 'protocol', title: t('conntrack.columns.protocol') },
      { key: 'inboundInterface', title: t('conntrack.columns.inboundInterface') },
      { key: 'sourceAddress', title: t('conntrack.columns.sourceAddress') },
      { key: 'sourcePort', title: t('conntrack.columns.sourcePort') },
      { key: 'destinationAddress', title: t('conntrack.columns.destinationAddress') },
      { key: 'destinationPort', title: t('conntrack.columns.destinationPort') },
    ]);
    const customColumns = computed(() => [
      { key: 'id', title: t('conntrack.columns.ruleNumber') },
      { key: 'description', title: t('conntrack.columns.description') },
      { key: 'protocol', title: t('conntrack.columns.protocol') },
      { key: 'inboundInterface', title: t('conntrack.columns.inboundInterface') },
    ]);

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
      { key: 'expectTableSize', title: t('conntrack.basic.expectTableSize'), type: 'number', min: 1, max: 50000000, defaultValue: 2048, help: t('conntrack.basic.expectTableSizeHelp') },
      { key: 'hashSize', title: t('conntrack.basic.hashSize'), type: 'number', min: 1, max: 50000000, defaultValue: 32768, help: t('conntrack.basic.hashSizeHelp') },
      { key: 'tableSize', title: t('conntrack.basic.tableSize'), type: 'number', min: 1, max: 50000000, defaultValue: 262144, help: t('conntrack.basic.tableSizeHelp') },
      { key: 'flowAccounting', title: t('conntrack.basic.flowAccounting'), type: 'checkbox' },
    ]);

    const tcpSchema = computed(() => [
      { key: 'halfOpenConnections', title: t('conntrack.tcp.halfOpenConnections'), type: 'number', min: 1, max: 50000000, defaultValue: 512, help: t('conntrack.tcp.halfOpenConnectionsHelp') },
      { key: 'loose', title: t('conntrack.tcp.loose'), type: 'select', options: [
        { value: 'enable', label: t('app.enable') },
        { value: 'disable', label: t('app.disable') },
      ], defaultValue: 'enable', help: t('conntrack.tcp.looseHelp') },
      { key: 'maxRetrans', title: t('conntrack.tcp.maxRetrans'), type: 'number', min: 1, max: 255, defaultValue: 3, help: t('conntrack.tcp.maxRetransHelp') },
    ]);

    const TCP_FLAGS_OPTIONS = [
      'ack', 'cwr', 'ecn', 'fin', 'psh', 'rst', 'syn', 'urg',
    ].map(v => ({ value: v, label: v.toUpperCase() }));

    const ignoreRuleSchema = computed(() => [
      { key: 'id', title: t('conntrack.ignoreRule.id'), type: 'number', min: 1, max: 999999, required: true, help: t('conntrack.ignoreRule.idHelp') },
      { key: 'description', title: t('conntrack.ignoreRule.description'), type: 'text' },
      { key: 'protocol', title: t('conntrack.ignoreRule.protocol'), type: 'select', options: PROTOCOL_OPTIONS, placeholder: t('conntrack.ignoreRule.protocolPlaceholder') },
      { key: 'inboundInterface', title: t('conntrack.ignoreRule.inboundInterface'), type: 'text', placeholder: t('conntrack.ignoreRule.inboundInterfacePlaceholder') },
      { key: 'sourceAddress', title: t('conntrack.ignoreRule.sourceAddress'), type: 'text', placeholder: t('conntrack.ignoreRule.sourceAddressPlaceholder') },
      { key: 'sourceAddressGroup', title: t('conntrack.ignoreRule.sourceAddressGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.sourceAddressGroupPlaceholder') },
      { key: 'sourceDomainGroup', title: t('conntrack.ignoreRule.sourceDomainGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.sourceDomainGroupPlaceholder') },
      { key: 'sourceNetworkGroup', title: t('conntrack.ignoreRule.sourceNetworkGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.sourceNetworkGroupPlaceholder') },
      { key: 'sourcePort', title: t('conntrack.ignoreRule.sourcePort'), type: 'text', placeholder: t('conntrack.ignoreRule.sourcePortPlaceholder') },
      { key: 'sourcePortGroup', title: t('conntrack.ignoreRule.sourcePortGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.sourcePortGroupPlaceholder') },
      { key: 'destinationAddress', title: t('conntrack.ignoreRule.destinationAddress'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationAddressPlaceholder') },
      { key: 'destinationAddressGroup', title: t('conntrack.ignoreRule.destinationAddressGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationAddressGroupPlaceholder') },
      { key: 'destinationDomainGroup', title: t('conntrack.ignoreRule.destinationDomainGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationDomainGroupPlaceholder') },
      { key: 'destinationNetworkGroup', title: t('conntrack.ignoreRule.destinationNetworkGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationNetworkGroupPlaceholder') },
      { key: 'destinationMacGroup', title: t('conntrack.ignoreRule.destinationMacGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationMacGroupPlaceholder') },
      { key: 'destinationPort', title: t('conntrack.ignoreRule.destinationPort'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationPortPlaceholder') },
      { key: 'destinationPortGroup', title: t('conntrack.ignoreRule.destinationPortGroup'), type: 'text', placeholder: t('conntrack.ignoreRule.destinationPortGroupPlaceholder') },
      { key: 'tcpFlags', title: t('conntrack.ignoreRule.tcpFlags'), type: 'multi-select', options: TCP_FLAGS_OPTIONS, placeholder: t('conntrack.ignoreRule.tcpFlagsPlaceholder') },
      { key: 'tcpFlagsNot', title: t('conntrack.ignoreRule.tcpFlagsNot'), type: 'multi-select', options: TCP_FLAGS_OPTIONS, placeholder: t('conntrack.ignoreRule.tcpFlagsNotPlaceholder') },
    ]);

    const customRuleSchema = computed(() => [
      { key: 'id', title: t('conntrack.customRule.id'), type: 'number', min: 1, max: 999999, required: true, help: t('conntrack.customRule.idHelp') },
      { key: 'description', title: t('conntrack.customRule.description'), type: 'text' },
      { key: 'protocol', title: t('conntrack.customRule.protocol'), type: 'select', options: PROTOCOL_OPTIONS, placeholder: t('conntrack.customRule.protocolPlaceholder') },
      { key: 'inboundInterface', title: t('conntrack.customRule.inboundInterface'), type: 'text', placeholder: t('conntrack.customRule.inboundInterfacePlaceholder') },
      { key: 'sourceAddress', title: t('conntrack.customRule.sourceAddress'), type: 'text', placeholder: t('conntrack.customRule.sourceAddressPlaceholder') },
      { key: 'sourcePort', title: t('conntrack.customRule.sourcePort'), type: 'text', placeholder: t('conntrack.customRule.sourcePortPlaceholder') },
      { key: 'destinationAddress', title: t('conntrack.customRule.destinationAddress'), type: 'text', placeholder: t('conntrack.customRule.destinationAddressPlaceholder') },
      { key: 'destinationPort', title: t('conntrack.customRule.destinationPort'), type: 'text', placeholder: t('conntrack.customRule.destinationPortPlaceholder') },
      { key: 'tcpClose', title: t('conntrack.customRule.tcpClose'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpCloseHelp') },
      { key: 'tcpCloseWait', title: t('conntrack.customRule.tcpCloseWait'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpCloseWaitHelp') },
      { key: 'tcpEstablished', title: t('conntrack.customRule.tcpEstablished'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpEstablishedHelp') },
      { key: 'tcpFinWait', title: t('conntrack.customRule.tcpFinWait'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpFinWaitHelp') },
      { key: 'tcpLastAck', title: t('conntrack.customRule.tcpLastAck'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpLastAckHelp') },
      { key: 'tcpSynRecv', title: t('conntrack.customRule.tcpSynRecv'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpSynRecvHelp') },
      { key: 'tcpSynSent', title: t('conntrack.customRule.tcpSynSent'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpSynSentHelp') },
      { key: 'tcpTimeWait', title: t('conntrack.customRule.tcpTimeWait'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.tcpTimeWaitHelp') },
      { key: 'udpReplied', title: t('conntrack.customRule.udpReplied'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.udpRepliedHelp') },
      { key: 'udpUnreplied', title: t('conntrack.customRule.udpUnreplied'), type: 'number', min: 1, max: 21474836, help: t('conntrack.customRule.udpUnrepliedHelp') },
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
        showError(t('conntrack.loadFailed'), e);
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(t('conntrack.saveBasicFailed'), e);
      }
    }

    async function saveTcp() {
      try {
        const value = {};
        value['half-open-connections'] = String(tcpData.value.halfOpenConnections);
        value.loose = tcpData.value.loose;
        value['max-retrans'] = String(tcpData.value.maxRetrans);
        await configStore.setConfig(`${path.value}/tcp`, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(t('conntrack.saveTcpFailed'), e);
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(t('conntrack.saveLoggingFailed'), e);
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(t('conntrack.saveModuleFailed'), e);
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        ignoreIpv4ModalVisible.value = false;
        await load();
      } catch (e) { showError(t('conntrack.saveIgnoreRuleFailed'), e); }
    }
    async function deleteIgnoreIpv4() {
      if (!selectedIgnoreIpv4.value.length) return;
      try {
        for (const id of selectedIgnoreIpv4.value) {
          await configStore.deleteConfig(`${path.value}/ignore/ipv4/rule/${id}`);
          configStore.markPending();
        }
        selectedIgnoreIpv4.value = [];
        await load();
      } catch (e) { showError(t('conntrack.deleteIgnoreRuleFailed'), e); }
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        ignoreIpv6ModalVisible.value = false;
        await load();
      } catch (e) { showError(t('conntrack.saveIgnoreRuleFailed'), e); }
    }
    async function deleteIgnoreIpv6() {
      if (!selectedIgnoreIpv6.value.length) return;
      try {
        for (const id of selectedIgnoreIpv6.value) {
          await configStore.deleteConfig(`${path.value}/ignore/ipv6/rule/${id}`);
          configStore.markPending();
        }
        selectedIgnoreIpv6.value = [];
        await load();
      } catch (e) { showError(t('conntrack.deleteIgnoreRuleFailed'), e); }
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        customIpv4ModalVisible.value = false;
        await load();
      } catch (e) { showError(t('conntrack.saveTimeoutRuleFailed'), e); }
    }
    async function deleteCustomIpv4() {
      if (!selectedCustomIpv4.value.length) return;
      try {
        for (const id of selectedCustomIpv4.value) {
          await configStore.deleteConfig(`${path.value}/timeout/custom/ipv4/rule/${id}`);
          configStore.markPending();
        }
        selectedCustomIpv4.value = [];
        await load();
      } catch (e) { showError(t('conntrack.deleteTimeoutRuleFailed'), e); }
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
        configStore.markPending();
        await configStore.checkSessionChanged();
        customIpv6ModalVisible.value = false;
        await load();
      } catch (e) { showError(t('conntrack.saveTimeoutRuleFailed'), e); }
    }
    async function deleteCustomIpv6() {
      if (!selectedCustomIpv6.value.length) return;
      try {
        for (const id of selectedCustomIpv6.value) {
          await configStore.deleteConfig(`${path.value}/timeout/custom/ipv6/rule/${id}`);
          configStore.markPending();
        }
        selectedCustomIpv6.value = [];
        await load();
      } catch (e) { showError(t('conntrack.deleteTimeoutRuleFailed'), e); }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {t,
      
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.tabs.basic') }}</div>
              <div style="padding:16px;">
                <ConfigForm v-model="basicData" :schema="basicSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #tcp>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.tabs.tcp') }}</div>
              <div style="padding:16px;">
                <ConfigForm v-model="tcpData" :schema="tcpSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #timeout>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.customRulesIpv4') }}</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openCustomIpv4Modal(null)">{{ $t('app.create') }}</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedCustomIpv4.length !== 1" @click="openCustomIpv4Modal(customIpv4Rules.find(r => r.id === selectedCustomIpv4[0]))">{{ $t('app.edit') }}</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedCustomIpv4.length" @click="deleteCustomIpv4">{{ $t('app.delete') }}</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="customColumns" :data="customIpv4Rules" v-model:selectedRowKeys="selectedCustomIpv4" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.customRulesIpv6') }}</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openCustomIpv6Modal(null)">{{ $t('app.create') }}</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedCustomIpv6.length !== 1" @click="openCustomIpv6Modal(customIpv6Rules.find(r => r.id === selectedCustomIpv6[0]))">{{ $t('app.edit') }}</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedCustomIpv6.length" @click="deleteCustomIpv6">{{ $t('app.delete') }}</ToolbarButton>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.ignoreRulesIpv4') }}</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openIgnoreIpv4Modal(null)">{{ $t('app.create') }}</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedIgnoreIpv4.length !== 1" @click="openIgnoreIpv4Modal(ignoreIpv4Rules.find(r => r.id === selectedIgnoreIpv4[0]))">{{ $t('app.edit') }}</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedIgnoreIpv4.length" @click="deleteIgnoreIpv4">{{ $t('app.delete') }}</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="ignoreColumns" :data="ignoreIpv4Rules" v-model:selectedRowKeys="selectedIgnoreIpv4" row-key="id" :selectable="true" :externalToolbar="true" />
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.ignoreRulesIpv6') }}</div>
              <div style="padding:16px;">
                <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="openIgnoreIpv6Modal(null)">{{ $t('app.create') }}</ToolbarButton>
                    <ToolbarButton icon="edit" :disabled="selectedIgnoreIpv6.length !== 1" @click="openIgnoreIpv6Modal(ignoreIpv6Rules.find(r => r.id === selectedIgnoreIpv6[0]))">{{ $t('app.edit') }}</ToolbarButton>
                    <ToolbarButton icon="delete" :disabled="!selectedIgnoreIpv6.length" @click="deleteIgnoreIpv6">{{ $t('app.delete') }}</ToolbarButton>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.tabs.log') }}</div>
              <div style="padding:16px;">
                <ConfigForm v-model="logData" :schema="logSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

        <template #modules>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ $t('conntrack.tabs.modules') }}</div>
              <div style="padding:16px;">
                <ConfigForm v-model="modulesData" :schema="modulesSchema" :disabled="writeDisabled" :showAdvanced="true" />
              </div>
            </div>
          </div>
        </template>

      </TabGroup>

      <!-- Modals -->
      <DraggableModal v-model:visible="ignoreIpv4ModalVisible" :title="$t('conntrack.ignoreRulesIpv4')" width="600px">
        <ConfigForm v-model="editingIgnoreIpv4" :schema="ignoreRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="ignoreIpv4ModalVisible = false">{{ $t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveIgnoreIpv4">{{ $t('app.confirm') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="ignoreIpv6ModalVisible" :title="$t('conntrack.ignoreRulesIpv6')" width="600px">
        <ConfigForm v-model="editingIgnoreIpv6" :schema="ignoreRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="ignoreIpv6ModalVisible = false">{{ $t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveIgnoreIpv6">{{ $t('app.confirm') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="customIpv4ModalVisible" :title="$t('conntrack.customRulesIpv4')" width="700px">
        <ConfigForm v-model="editingCustomIpv4" :schema="customRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="customIpv4ModalVisible = false">{{ $t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveCustomIpv4">{{ $t('app.confirm') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="customIpv6ModalVisible" :title="$t('conntrack.customRulesIpv6')" width="700px">
        <ConfigForm v-model="editingCustomIpv6" :schema="customRuleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="customIpv6ModalVisible = false">{{ $t('app.cancel') }}</button>
          <button class="btn-primary" @click="saveCustomIpv6">{{ $t('app.confirm') }}</button>
        </template>
      </DraggableModal>

    </div>
  `,
});
