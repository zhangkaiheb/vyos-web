import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';
import { buildDhcpv6BaseSchema, dhcpv6ConfigToForm, dhcpv6FormToConfig, dhcpv6ToCommands, DHCPV6_DEFAULTS } from '/src/utils/dhcpv6Common.js';
import { api, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

function formatJson(obj) {
  if (!obj || Object.keys(obj).length === 0) return '';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}

function safeJsonParse(str) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

export default defineComponent({
  name: 'PseudoEthernetPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const pseudoEthernets = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedItems = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('pseudoEthernet.columns.name'), width: 120 },
      { key: 'description', title: t('pseudoEthernet.columns.description'), width: 160 },
      { key: 'source_interface', title: t('pseudoEthernet.columns.sourceInterface'), width: 120 },
      { key: 'mode', title: t('pseudoEthernet.columns.mode'), width: 120 },
      { key: 'mac', title: t('pseudoEthernet.columns.mac'), width: 140 },
      { key: 'mtu', title: t('pseudoEthernet.columns.mtu'), width: 80 },
      { key: 'disable', title: t('pseudoEthernet.columns.disable'), width: 80 },
      { key: 'actions', title: t('pseudoEthernet.columns.actions'), width: 100 },
    ]);

    const MODE_OPTIONS = computed(() => [
      { value: 'private', label: t('pseudoEthernet.modeOptions.private') },
      { value: 'vepa', label: t('pseudoEthernet.modeOptions.vepa') },
      { value: 'bridge', label: t('pseudoEthernet.modeOptions.bridge') },
      { value: 'passthru', label: t('pseudoEthernet.modeOptions.passthru') },
    ]);

    const SOURCE_VALIDATION_OPTIONS = computed(() => [
      { value: 'strict', label: t('pseudoEthernet.sourceValidationOptions.strict') },
      { value: 'loose', label: t('pseudoEthernet.sourceValidationOptions.loose') },
      { value: 'disable', label: t('pseudoEthernet.sourceValidationOptions.disable') },
    ]);

    const ACCEPT_DAD_OPTIONS = computed(() => [
      { value: '0', label: t('pseudoEthernet.acceptDadOptions.0') },
      { value: '1', label: t('pseudoEthernet.acceptDadOptions.1') },
      { value: '2', label: t('pseudoEthernet.acceptDadOptions.2') },
    ]);

    const basicSchema = computed(() => [
      { key: 'name', title: t('pseudoEthernet.basic.name'), type: 'text', required: true, placeholder: t('pseudoEthernet.basic.namePlaceholder'), help: t('pseudoEthernet.basic.nameHelp') },
      { key: 'description', title: t('pseudoEthernet.basic.description'), type: 'text', placeholder: t('pseudoEthernet.basic.descriptionPlaceholder') },
      { key: 'address', title: t('pseudoEthernet.basic.address'), type: 'textarea', placeholder: t('pseudoEthernet.basic.addressPlaceholder'), help: t('pseudoEthernet.basic.addressHelp') },
      { key: 'source_interface', title: t('pseudoEthernet.basic.sourceInterface'), type: 'select', options: interfaceOptions.value, placeholder: t('pseudoEthernet.basic.sourceInterfacePlaceholder'), help: t('pseudoEthernet.basic.sourceInterfaceHelp') },
      { key: 'mode', title: t('pseudoEthernet.basic.mode'), type: 'select', options: MODE_OPTIONS.value, help: t('pseudoEthernet.basic.modeHelp') },
      { key: 'mac', title: t('pseudoEthernet.basic.mac'), type: 'text', placeholder: t('pseudoEthernet.basic.macPlaceholder'), help: t('pseudoEthernet.basic.macHelp') },
      { key: 'mtu', title: t('pseudoEthernet.basic.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('pseudoEthernet.basic.mtuPlaceholder'), help: t('pseudoEthernet.basic.mtuHelp') },
      { key: 'disable_link_detect', title: t('pseudoEthernet.basic.disableLinkDetect'), type: 'checkbox', help: t('pseudoEthernet.basic.disableLinkDetectHelp') },
      { key: 'disable', title: t('pseudoEthernet.basic.disable'), type: 'checkbox', help: t('pseudoEthernet.basic.disableHelp') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('pseudoEthernet.ip.adjustMss'), type: 'text', placeholder: t('pseudoEthernet.ip.adjustMssPlaceholder'), help: t('pseudoEthernet.ip.adjustMssHelp') },
      { key: 'ip_arp_cache_timeout', title: t('pseudoEthernet.ip.arpCacheTimeout'), type: 'number', min: 1, max: 86400, placeholder: t('pseudoEthernet.ip.arpCacheTimeoutPlaceholder'), help: t('pseudoEthernet.ip.arpCacheTimeoutHelp') },
      { key: 'ip_disable_arp_filter', title: t('pseudoEthernet.ip.disableArpFilter'), type: 'checkbox', help: t('pseudoEthernet.ip.disableArpFilterHelp') },
      { key: 'ip_disable_forwarding', title: t('pseudoEthernet.ip.disableForwarding'), type: 'checkbox', help: t('pseudoEthernet.ip.disableForwardingHelp') },
      { key: 'ip_enable_arp_accept', title: t('pseudoEthernet.ip.enableArpAccept'), type: 'checkbox', help: t('pseudoEthernet.ip.enableArpAcceptHelp') },
      { key: 'ip_enable_arp_announce', title: t('pseudoEthernet.ip.enableArpAnnounce'), type: 'checkbox', help: t('pseudoEthernet.ip.enableArpAnnounceHelp') },
      { key: 'ip_enable_arp_ignore', title: t('pseudoEthernet.ip.enableArpIgnore'), type: 'checkbox', help: t('pseudoEthernet.ip.enableArpIgnoreHelp') },
      { key: 'ip_enable_directed_broadcast', title: t('pseudoEthernet.ip.enableDirectedBroadcast'), type: 'checkbox', help: t('pseudoEthernet.ip.enableDirectedBroadcastHelp') },
      { key: 'ip_enable_proxy_arp', title: t('pseudoEthernet.ip.enableProxyArp'), type: 'checkbox', help: t('pseudoEthernet.ip.enableProxyArpHelp') },
      { key: 'ip_proxy_arp_pvlan', title: t('pseudoEthernet.ip.proxyArpPvlan'), type: 'checkbox', help: t('pseudoEthernet.ip.proxyArpPvlanHelp') },
      { key: 'ip_source_validation', title: t('pseudoEthernet.ip.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('pseudoEthernet.ip.sourceValidationPlaceholder'), help: t('pseudoEthernet.ip.sourceValidationHelp') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('pseudoEthernet.ipv6.acceptDad'), type: 'select', options: ACCEPT_DAD_OPTIONS.value, help: t('pseudoEthernet.ipv6.acceptDadHelp') },
      { key: 'ipv6_autoconf', title: t('pseudoEthernet.ipv6.autoconf'), type: 'checkbox', help: t('pseudoEthernet.ipv6.autoconfHelp') },
      { key: 'ipv6_eui64', title: t('pseudoEthernet.ipv6.eui64'), type: 'text', placeholder: t('pseudoEthernet.ipv6.eui64Placeholder'), help: t('pseudoEthernet.ipv6.eui64Help') },
      { key: 'ipv6_interface_identifier', title: t('pseudoEthernet.ipv6.interfaceIdentifier'), type: 'text', placeholder: t('pseudoEthernet.ipv6.interfaceIdentifierPlaceholder'), help: t('pseudoEthernet.ipv6.interfaceIdentifierHelp') },
      { key: 'ipv6_no_default_link_local', title: t('pseudoEthernet.ipv6.noDefaultLinkLocal'), type: 'checkbox', help: t('pseudoEthernet.ipv6.noDefaultLinkLocalHelp') },
      { key: 'ipv6_adjust_mss', title: t('pseudoEthernet.ipv6.adjustMss'), type: 'text', placeholder: t('pseudoEthernet.ipv6.adjustMssPlaceholder'), help: t('pseudoEthernet.ipv6.adjustMssHelp') },
      { key: 'ipv6_base_reachable_time', title: t('pseudoEthernet.ipv6.baseReachableTime'), type: 'number', min: 1, max: 86400, placeholder: t('pseudoEthernet.ipv6.baseReachableTimePlaceholder'), help: t('pseudoEthernet.ipv6.baseReachableTimeHelp') },
      { key: 'ipv6_disable_forwarding', title: t('pseudoEthernet.ipv6.disableForwarding'), type: 'checkbox', help: t('pseudoEthernet.ipv6.disableForwardingHelp') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('pseudoEthernet.ipv6.dupAddrDetectTransmits'), type: 'number', min: 0, max: 100, placeholder: t('pseudoEthernet.ipv6.dupAddrDetectTransmitsPlaceholder'), help: t('pseudoEthernet.ipv6.dupAddrDetectTransmitsHelp') },
      { key: 'ipv6_source_validation', title: t('pseudoEthernet.ipv6.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('pseudoEthernet.ipv6.sourceValidationPlaceholder'), help: t('pseudoEthernet.ipv6.sourceValidationHelp') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('pseudoEthernet.dhcp.clientId'), type: 'text', placeholder: t('pseudoEthernet.dhcp.clientIdPlaceholder'), help: t('pseudoEthernet.dhcp.clientIdHelp') },
      { key: 'dhcp_default_route_distance', title: t('pseudoEthernet.dhcp.defaultRouteDistance'), type: 'number', min: 1, max: 255, placeholder: t('pseudoEthernet.dhcp.defaultRouteDistancePlaceholder'), help: t('pseudoEthernet.dhcp.defaultRouteDistanceHelp') },
      { key: 'dhcp_host_name', title: t('pseudoEthernet.dhcp.hostName'), type: 'text', placeholder: t('pseudoEthernet.dhcp.hostNamePlaceholder'), help: t('pseudoEthernet.dhcp.hostNameHelp') },
      { key: 'dhcp_mtu', title: t('pseudoEthernet.dhcp.mtu'), type: 'checkbox', help: t('pseudoEthernet.dhcp.mtuHelp') },
      { key: 'dhcp_no_default_route', title: t('pseudoEthernet.dhcp.noDefaultRoute'), type: 'checkbox', help: t('pseudoEthernet.dhcp.noDefaultRouteHelp') },
      { key: 'dhcp_reject', title: t('pseudoEthernet.dhcp.reject'), type: 'textarea', placeholder: t('pseudoEthernet.dhcp.rejectPlaceholder'), help: t('pseudoEthernet.dhcp.rejectHelp') },
      { key: 'dhcp_user_class', title: t('pseudoEthernet.dhcp.userClass'), type: 'text', placeholder: t('pseudoEthernet.dhcp.userClassPlaceholder'), help: t('pseudoEthernet.dhcp.userClassHelp') },
      { key: 'dhcp_vendor_class_id', title: t('pseudoEthernet.dhcp.vendorClassId'), type: 'text', placeholder: t('pseudoEthernet.dhcp.vendorClassIdPlaceholder'), help: t('pseudoEthernet.dhcp.vendorClassIdHelp') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('pseudoEthernet.dhcpv6.duid'), type: 'text', placeholder: t('pseudoEthernet.dhcpv6.duidPlaceholder'), help: t('pseudoEthernet.dhcpv6.duidHelp') },
      { key: 'dhcpv6_no_release', title: t('pseudoEthernet.dhcpv6.noRelease'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.noReleaseHelp') },
      { key: 'dhcpv6_no_request_dns', title: t('pseudoEthernet.dhcpv6.noRequestDns'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.noRequestDnsHelp') },
      { key: 'dhcpv6_no_request_domain_name', title: t('pseudoEthernet.dhcpv6.noRequestDomainName'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.noRequestDomainNameHelp') },
      { key: 'dhcpv6_parameters_only', title: t('pseudoEthernet.dhcpv6.parametersOnly'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.parametersOnlyHelp') },
      { key: 'dhcpv6_pd_instances', title: t('pseudoEthernet.dhcpv6.pdInstances'), type: 'textarea', placeholder: t('pseudoEthernet.dhcpv6.pdInstancesPlaceholder'), help: t('pseudoEthernet.dhcpv6.pdInstancesHelp') },
      { key: 'dhcpv6_rapid_commit', title: t('pseudoEthernet.dhcpv6.rapidCommit'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.rapidCommitHelp') },
      { key: 'dhcpv6_temporary', title: t('pseudoEthernet.dhcpv6.temporary'), type: 'checkbox', help: t('pseudoEthernet.dhcpv6.temporaryHelp') },
    ]);

    const vifSchema = computed(() => [
      { key: 'vif', title: t('pseudoEthernet.vif.vif'), type: 'textarea', placeholder: t('pseudoEthernet.vif.vifPlaceholder'), help: t('pseudoEthernet.vif.vifHelp') },
      { key: 'vif_s', title: t('pseudoEthernet.vif.vifS'), type: 'textarea', placeholder: t('pseudoEthernet.vif.vifSPlaceholder'), help: t('pseudoEthernet.vif.vifSHelp') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('pseudoEthernet.mirror.egress'), type: 'select', options: interfaceOptions.value, placeholder: t('pseudoEthernet.mirror.egressPlaceholder'), help: t('pseudoEthernet.mirror.egressHelp') },
      { key: 'mirror_ingress', title: t('pseudoEthernet.mirror.ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('pseudoEthernet.mirror.ingressPlaceholder'), help: t('pseudoEthernet.mirror.ingressHelp') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('pseudoEthernet.other.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('pseudoEthernet.other.redirectPlaceholder'), help: t('pseudoEthernet.other.redirectHelp') },
      { key: 'vrf', title: t('pseudoEthernet.other.vrf'), type: 'text', placeholder: t('pseudoEthernet.other.vrfPlaceholder'), help: t('pseudoEthernet.other.vrfHelp') },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const m = editingItem.value;
      const name = m.name || 'pethN';
      const lines = [];

      if (m.description) lines.push(`set interfaces pseudo-ethernet ${name} description "${m.description}"`);
      if (m.address) {
        m.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces pseudo-ethernet ${name} address ${a.trim()}`);
        });
      }
      if (m.source_interface) lines.push(`set interfaces pseudo-ethernet ${name} source-interface ${m.source_interface}`);
      if (m.mode && m.mode !== 'private') lines.push(`set interfaces pseudo-ethernet ${name} mode ${m.mode}`);
      if (m.mac) lines.push(`set interfaces pseudo-ethernet ${name} mac ${m.mac}`);
      if (m.mtu) lines.push(`set interfaces pseudo-ethernet ${name} mtu ${m.mtu}`);
      if (m.disable_link_detect) lines.push(`set interfaces pseudo-ethernet ${name} disable-link-detect`);
      if (m.disable) lines.push(`set interfaces pseudo-ethernet ${name} disable`);

      // IP
      if (m.ip_adjust_mss) lines.push(`set interfaces pseudo-ethernet ${name} ip adjust-mss ${m.ip_adjust_mss}`);
      if (m.ip_arp_cache_timeout) lines.push(`set interfaces pseudo-ethernet ${name} ip arp-cache-timeout ${m.ip_arp_cache_timeout}`);
      if (m.ip_disable_arp_filter) lines.push(`set interfaces pseudo-ethernet ${name} ip disable-arp-filter`);
      if (m.ip_disable_forwarding) lines.push(`set interfaces pseudo-ethernet ${name} ip disable-forwarding`);
      if (m.ip_enable_arp_accept) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-accept`);
      if (m.ip_enable_arp_announce) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-announce`);
      if (m.ip_enable_arp_ignore) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-arp-ignore`);
      if (m.ip_enable_directed_broadcast) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-directed-broadcast`);
      if (m.ip_enable_proxy_arp) lines.push(`set interfaces pseudo-ethernet ${name} ip enable-proxy-arp`);
      if (m.ip_proxy_arp_pvlan) lines.push(`set interfaces pseudo-ethernet ${name} ip proxy-arp-pvlan`);
      if (m.ip_source_validation) lines.push(`set interfaces pseudo-ethernet ${name} ip source-validation ${m.ip_source_validation}`);

      // IPv6
      if (m.ipv6_accept_dad && m.ipv6_accept_dad !== '1') lines.push(`set interfaces pseudo-ethernet ${name} ipv6 accept-dad ${m.ipv6_accept_dad}`);
      if (m.ipv6_autoconf) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address autoconf`);
      if (m.ipv6_eui64) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address eui64 ${m.ipv6_eui64}`);
      if (m.ipv6_interface_identifier) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address interface-identifier ${m.ipv6_interface_identifier}`);
      if (m.ipv6_no_default_link_local) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 address no-default-link-local`);
      if (m.ipv6_adjust_mss) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 adjust-mss ${m.ipv6_adjust_mss}`);
      if (m.ipv6_base_reachable_time) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 base-reachable-time ${m.ipv6_base_reachable_time}`);
      if (m.ipv6_disable_forwarding) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 disable-forwarding`);
      if (m.ipv6_dup_addr_detect_transmits !== '' && m.ipv6_dup_addr_detect_transmits !== null && m.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 dup-addr-detect-transmits ${m.ipv6_dup_addr_detect_transmits}`);
      if (m.ipv6_source_validation) lines.push(`set interfaces pseudo-ethernet ${name} ipv6 source-validation ${m.ipv6_source_validation}`);

      // DHCP
      if (m.dhcp_client_id) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options client-id ${m.dhcp_client_id}`);
      if (m.dhcp_default_route_distance) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options default-route-distance ${m.dhcp_default_route_distance}`);
      if (m.dhcp_host_name) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options host-name ${m.dhcp_host_name}`);
      if (m.dhcp_mtu) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options mtu`);
      if (m.dhcp_no_default_route) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options no-default-route`);
      if (m.dhcp_reject) {
        m.dhcp_reject.split('\n').filter(Boolean).forEach(r => {
          lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options reject ${r.trim()}`);
        });
      }
      if (m.dhcp_user_class) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options user-class ${m.dhcp_user_class}`);
      if (m.dhcp_vendor_class_id) lines.push(`set interfaces pseudo-ethernet ${name} dhcp-options vendor-class-id ${m.dhcp_vendor_class_id}`);

      // DHCPv6
      lines.push(...dhcpv6ToCommands(m, 'pseudo-ethernet', name));

      // VIF
      if (m.vif) {
        try {
          const vifs = JSON.parse(m.vif);
          Object.entries(vifs).forEach(([vlanId, cfg]) => {
            if (cfg.description) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} description "${cfg.description}"`);
            if (cfg.mtu) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} mtu ${cfg.mtu}`);
            if (cfg.mac) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} mac ${cfg.mac}`);
            if (cfg.disable) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} disable`);
            if (cfg.disable_link_detect) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} disable-link-detect`);
            if (cfg.egress_qos) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} egress-qos ${cfg.egress_qos}`);
            if (cfg.ingress_qos) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} ingress-qos ${cfg.ingress_qos}`);
            if (cfg.redirect) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} redirect ${cfg.redirect}`);
            if (cfg.vrf) lines.push(`set interfaces pseudo-ethernet ${name} vif ${vlanId} vrf ${cfg.vrf}`);
          });
        } catch (e) { /* ignore parse errors */ }
      }

      // VIF-S
      if (m.vif_s) {
        try {
          const vifs = JSON.parse(m.vif_s);
          Object.entries(vifs).forEach(([svlanId, svlanCfg]) => {
            if (svlanCfg.vif) {
              Object.entries(svlanCfg.vif).forEach(([cvlanId, cfg]) => {
                if (cfg.description) lines.push(`set interfaces pseudo-ethernet ${name} vif-s ${svlanId} vif ${cvlanId} description "${cfg.description}"`);
                if (cfg.mtu) lines.push(`set interfaces pseudo-ethernet ${name} vif-s ${svlanId} vif ${cvlanId} mtu ${cfg.mtu}`);
              });
            }
          });
        } catch (e) { /* ignore parse errors */ }
      }

      // Mirror
      if (m.mirror_egress) lines.push(`set interfaces pseudo-ethernet ${name} mirror egress ${m.mirror_egress}`);
      if (m.mirror_ingress) lines.push(`set interfaces pseudo-ethernet ${name} mirror ingress ${m.mirror_ingress}`);

      if (m.redirect) lines.push(`set interfaces pseudo-ethernet ${name} redirect ${m.redirect}`);
      if (m.vrf) lines.push(`set interfaces pseudo-ethernet ${name} vrf ${m.vrf}`);

      return lines.length ? lines.join('\n') : t('pseudoEthernet.messages.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('pseudoEthernet.tabs.basic') },
      { key: 'ip', title: t('pseudoEthernet.tabs.ip') },
      { key: 'ipv6', title: t('pseudoEthernet.tabs.ipv6') },
      { key: 'dhcp', title: t('pseudoEthernet.tabs.dhcp') },
      { key: 'dhcpv6', title: t('pseudoEthernet.tabs.dhcpv6') },
      { key: 'vif', title: t('pseudoEthernet.tabs.vif') },
      { key: 'mirror', title: t('pseudoEthernet.tabs.mirror') },
      { key: 'other', title: t('pseudoEthernet.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', source_interface: '', mode: 'private', mac: '', mtu: '', disable_link_detect: false, disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '', ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        ...DHCPV6_DEFAULTS,
        dhcpv6_pd_instances: '',
        vif: '', vif_s: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function itemToForm(m) {
      return {
        name: m.name || '',
        description: m.description || '',
        address: Array.isArray(m.address) ? m.address.join('\n') : (m.address || ''),
        source_interface: m.source_interface || '',
        mode: m.mode || 'private',
        mac: m.mac || '',
        mtu: m.mtu || '',
        disable_link_detect: !!m.disable_link_detect,
        disable: !!m.disable,
        ip_adjust_mss: m.ip?.adjust_mss || '',
        ip_arp_cache_timeout: m.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!m.ip?.disable_arp_filter,
        ip_disable_forwarding: !!m.ip?.disable_forwarding,
        ip_enable_arp_accept: !!m.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!m.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!m.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!m.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!m.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!m.ip?.proxy_arp_pvlan,
        ip_source_validation: m.ip?.source_validation || '',
        ipv6_accept_dad: m.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!m.ipv6?.address?.autoconf,
        ipv6_eui64: m.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: m.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!m.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: m.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: m.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!m.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: m.ipv6?.dup_addr_detect_transmits !== undefined ? m.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: m.ipv6?.source_validation || '',
        dhcp_client_id: m['dhcp-options']?.client_id || '',
        dhcp_default_route_distance: m['dhcp-options']?.default_route_distance || '',
        dhcp_host_name: m['dhcp-options']?.host_name || '',
        dhcp_mtu: !!m['dhcp-options']?.mtu,
        dhcp_no_default_route: !!m['dhcp-options']?.no_default_route,
        dhcp_reject: Array.isArray(m['dhcp-options']?.reject) ? m['dhcp-options'].reject.join('\n') : (m['dhcp-options']?.reject || ''),
        dhcp_user_class: m['dhcp-options']?.user_class || '',
        dhcp_vendor_class_id: m['dhcp-options']?.vendor_class_id || '',
        ...dhcpv6ConfigToForm(m['dhcpv6-options']),
        dhcpv6_pd_instances: formatJson(m['dhcpv6-options']?.pd || {}),
        vif: m.vif ? JSON.stringify(m.vif, null, 2) : '',
        vif_s: m['vif-s'] ? JSON.stringify(m['vif-s'], null, 2) : '',
        mirror_egress: m.mirror?.egress || '',
        mirror_ingress: m.mirror?.ingress || '',
        redirect: m.redirect || '',
        vrf: m.vrf || '',
      };
    }

    function formToItem(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.mode && form.mode !== 'private') result.mode = form.mode;
      if (form.mac) result.mac = form.mac;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable_link_detect) result.disable_link_detect = true;
      if (form.disable) result.disable = true;

      // IP
      const ip = {};
      if (form.ip_adjust_mss) ip.adjust_mss = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout) ip.arp_cache_timeout = Number(form.ip_arp_cache_timeout);
      if (form.ip_disable_arp_filter) ip.disable_arp_filter = true;
      if (form.ip_disable_forwarding) ip.disable_forwarding = true;
      if (form.ip_enable_arp_accept) ip.enable_arp_accept = true;
      if (form.ip_enable_arp_announce) ip.enable_arp_announce = true;
      if (form.ip_enable_arp_ignore) ip.enable_arp_ignore = true;
      if (form.ip_enable_directed_broadcast) ip.enable_directed_broadcast = true;
      if (form.ip_enable_proxy_arp) ip.enable_proxy_arp = true;
      if (form.ip_proxy_arp_pvlan) ip.proxy_arp_pvlan = true;
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      // IPv6
      const ipv6 = {};
      if (form.ipv6_accept_dad && form.ipv6_accept_dad !== '1') ipv6.accept_dad = form.ipv6_accept_dad;
      if (form.ipv6_autoconf || form.ipv6_eui64 || form.ipv6_interface_identifier || form.ipv6_no_default_link_local) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_eui64) addr.eui64 = form.ipv6_eui64;
        if (form.ipv6_interface_identifier) addr.interface_identifier = form.ipv6_interface_identifier;
        if (form.ipv6_no_default_link_local) addr.no_default_link_local = true;
        ipv6.address = addr;
      }
      if (form.ipv6_adjust_mss) ipv6.adjust_mss = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6.base_reachable_time = Number(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6.disable_forwarding = true;
      if (form.ipv6_dup_addr_detect_transmits !== '' && form.ipv6_dup_addr_detect_transmits !== null && form.ipv6_dup_addr_detect_transmits !== undefined) ipv6.dup_addr_detect_transmits = Number(form.ipv6_dup_addr_detect_transmits);
      if (form.ipv6_source_validation) ipv6.source_validation = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) result.ipv6 = ipv6;

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp.client_id = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp.default_route_distance = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp.host_name = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp.no_default_route = true;
      if (form.dhcp_reject) dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      if (form.dhcp_user_class) dhcp.user_class = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp.vendor_class_id = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result['dhcp-options'] = dhcp;

      // DHCPv6
      const dhcpv6 = dhcpv6FormToConfig(form) || {};
      if (form.dhcpv6_pd_instances) {
        const pd = safeJsonParse(form.dhcpv6_pd_instances);
        if (Object.keys(pd).length) dhcpv6.pd = pd;
      }
      if (Object.keys(dhcpv6).length) result['dhcpv6-options'] = dhcpv6;

      // VIF
      if (form.vif) {
        try {
          const vifs = JSON.parse(form.vif);
          if (Object.keys(vifs).length) result.vif = vifs;
        } catch (e) { /* ignore */ }
      }

      // VIF-S
      if (form.vif_s) {
        try {
          const vifs = JSON.parse(form.vif_s);
          if (Object.keys(vifs).length) result['vif-s'] = vifs;
        } catch (e) { /* ignore */ }
      }

      // Mirror
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;

      if (form.redirect) result.redirect = form.redirect;
      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces pseudo-ethernet' });
        const cfg = res.data || {};
        pseudoEthernets.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          source_interface: val.source_interface || '',
          mode: val.mode || 'private',
          mac: val.mac || '',
          mtu: val.mtu || '',
          disable: !!val.disable,
          description: val.description || '',
        }));

        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        handleError(err);
      } finally {
        loading.value = false;
      }
    }

    function handleError(err) {
      showError({ message: `${t('pseudoEthernet.messages.errorCode', { code: err.code || 'ERROR' })}\n${t('pseudoEthernet.messages.errorMessage', { message: err.message || err })}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingItem.value = itemToForm(pseudoEthernets.value[index]);
      } else {
        editingItem.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingItem.value;
        if (!form.name) { showError({ message: t('pseudoEthernet.messages.enterName') }); return; }
        const config = formToItem(form);
        console.log('[PseudoEthernet] save config:', JSON.stringify(config, null, 2));
        await configStore.setConfig(`interfaces pseudo-ethernet ${form.name}`, config);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    async function remove() {
      if (!selectedItems.value.length) { showError({ message: t('pseudoEthernet.messages.selectToDelete') }); return; }
      pendingDeleteNames.value = selectedItems.value.map(m => m.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces pseudo-ethernet ${name}`);
          configStore.markPending();
        }
        selectedItems.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {
      loading, pseudoEthernets, selected: selectedItems, modalVisible, editingItem, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, dhcpSchema, dhcpv6Schema, vifSchema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load,
      t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="pseudoEthernets"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? t('pseudoEthernet.modal.edit') : t('pseudoEthernet.modal.create')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingItem" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingItem" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingItem" /></template>
            <template #dhcp><ConfigForm :schema="dhcpSchema" :model="editingItem" /></template>
            <template #dhcpv6><ConfigForm :schema="dhcpv6Schema" :model="editingItem" /></template>
            <template #vif><ConfigForm :schema="vifSchema" :model="editingItem" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingItem" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingItem" /></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('pseudoEthernet.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('pseudoEthernet.buttons.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('pseudoEthernet.modal.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('pseudoEthernet.modal.confirmDeleteMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
