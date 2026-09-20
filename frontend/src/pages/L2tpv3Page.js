import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'L2tpv3Page',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const l2tpv3s = ref([]);
    const modalVisible = ref(false);
    const editingL2tpv3 = ref(null);
    const isEditMode = ref(false);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const activeTab = ref('basic');
    const selectedL2tpv3 = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('l2tpv3.columns.name'), width: 120 },
      { key: 'description', title: t('l2tpv3.columns.description'), width: 160 },
      { key: 'encapsulation', title: t('l2tpv3.columns.encapsulation'), width: 100 },
      { key: 'remote', title: t('l2tpv3.columns.remote'), width: 140 },
      { key: 'tunnel_id', title: t('l2tpv3.columns.tunnelId'), width: 80 },
      { key: 'session_id', title: t('l2tpv3.columns.sessionId'), width: 80 },
      { key: 'mtu', title: t('l2tpv3.columns.mtu'), width: 80 },
      { key: 'disable', title: t('l2tpv3.columns.disable'), width: 80 },
      { key: 'actions', title: t('l2tpv3.columns.actions'), width: 100 },
    ]);

    const ENCAPSULATION_OPTIONS = computed(() => [
      { value: '', label: '' },
      { value: 'udp', label: t('l2tpv3.options.encapsulation.udp') },
      { value: 'ip', label: t('l2tpv3.options.encapsulation.ip') },
    ]);

    const SOURCE_VALIDATION_OPTIONS = computed(() => [
      { value: '', label: '' },
      { value: 'strict', label: t('l2tpv3.options.sourceValidation.strict') },
      { value: 'loose', label: t('l2tpv3.options.sourceValidation.loose') },
      { value: 'disable', label: t('l2tpv3.options.sourceValidation.disable') },
    ]);

    const acceptDadOptions = computed(() => [
      { value: '', label: '' },
      { value: '0', label: '0 - ' + t('ethernet.ipv6.accept_dad_option_0') },
      { value: '1', label: '1 - ' + t('ethernet.ipv6.accept_dad_option_1') },
      { value: '2', label: '2 - ' + t('ethernet.ipv6.accept_dad_option_2') },
    ]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('l2tpv3.schema.basic.name'), type: 'text', required: true, placeholder: t('l2tpv3.schema.basic.namePlaceholder'), help: t('l2tpv3.schema.basic.nameHelp'), disabled: isEditMode.value },
      { key: 'description', title: t('l2tpv3.schema.basic.description'), type: 'text', placeholder: t('l2tpv3.schema.basic.descriptionPlaceholder') },
      { key: 'address', title: t('l2tpv3.schema.basic.address'), type: 'textarea', placeholder: t('l2tpv3.schema.basic.addressPlaceholder'), help: t('l2tpv3.schema.basic.addressHelp') },
      { key: 'encapsulation', title: t('l2tpv3.schema.basic.encapsulation'), type: 'select', options: ENCAPSULATION_OPTIONS.value, help: t('l2tpv3.schema.basic.encapsulationHelp') },
      { key: 'remote', title: t('l2tpv3.schema.basic.remote'), type: 'text', placeholder: t('l2tpv3.schema.basic.remotePlaceholder'), help: t('l2tpv3.schema.basic.remoteHelp') },
      { key: 'source_address', title: t('l2tpv3.schema.basic.sourceAddress'), type: 'text', placeholder: t('l2tpv3.schema.basic.sourceAddressPlaceholder'), help: t('l2tpv3.schema.basic.sourceAddressHelp') },
      { key: 'source_port', title: t('l2tpv3.schema.basic.sourcePort'), type: 'number', min: 1, max: 65535, placeholder: t('l2tpv3.schema.basic.sourcePortPlaceholder'), help: t('l2tpv3.schema.basic.sourcePortHelp') },
      { key: 'destination_port', title: t('l2tpv3.schema.basic.destinationPort'), type: 'number', min: 1, max: 65535, placeholder: t('l2tpv3.schema.basic.destinationPortPlaceholder'), help: t('l2tpv3.schema.basic.destinationPortHelp') },
      { key: 'tunnel_id', title: t('l2tpv3.schema.basic.tunnelId'), type: 'number', min: 1, max: 429496729, placeholder: t('l2tpv3.schema.basic.tunnelIdPlaceholder'), help: t('l2tpv3.schema.basic.tunnelIdHelp') },
      { key: 'peer_tunnel_id', title: t('l2tpv3.schema.basic.peerTunnelId'), type: 'number', min: 1, max: 429496729, placeholder: t('l2tpv3.schema.basic.peerTunnelIdPlaceholder'), help: t('l2tpv3.schema.basic.peerTunnelIdHelp') },
      { key: 'session_id', title: t('l2tpv3.schema.basic.sessionId'), type: 'number', min: 1, max: 429496729, placeholder: t('l2tpv3.schema.basic.sessionIdPlaceholder'), help: t('l2tpv3.schema.basic.sessionIdHelp') },
      { key: 'peer_session_id', title: t('l2tpv3.schema.basic.peerSessionId'), type: 'number', min: 1, max: 429496729, placeholder: t('l2tpv3.schema.basic.peerSessionIdPlaceholder'), help: t('l2tpv3.schema.basic.peerSessionIdHelp') },
      { key: 'mtu', title: t('l2tpv3.schema.basic.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('l2tpv3.schema.basic.mtuPlaceholder'), help: t('l2tpv3.schema.basic.mtuHelp') },
      { key: 'disable', title: t('l2tpv3.schema.basic.disable'), type: 'checkbox', help: t('l2tpv3.schema.basic.disableHelp') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('l2tpv3.schema.ip.adjustMss'), type: 'text', placeholder: t('l2tpv3.schema.ip.adjustMssPlaceholder'), help: t('l2tpv3.schema.ip.adjustMssHelp') },
      { key: 'ip_arp_cache_timeout', title: t('l2tpv3.schema.ip.arpCacheTimeout'), type: 'number', min: 1, max: 86400, placeholder: t('l2tpv3.schema.ip.arpCacheTimeoutPlaceholder'), help: t('l2tpv3.schema.ip.arpCacheTimeoutHelp') },
      { key: 'ip_disable_arp_filter', title: t('l2tpv3.schema.ip.disableArpFilter'), type: 'checkbox', help: t('l2tpv3.schema.ip.disableArpFilterHelp') },
      { key: 'ip_disable_forwarding', title: t('l2tpv3.schema.ip.disableForwarding'), type: 'checkbox', help: t('l2tpv3.schema.ip.disableForwardingHelp') },
      { key: 'ip_enable_arp_accept', title: t('l2tpv3.schema.ip.enableArpAccept'), type: 'checkbox', help: t('l2tpv3.schema.ip.enableArpAcceptHelp') },
      { key: 'ip_enable_arp_announce', title: t('l2tpv3.schema.ip.enableArpAnnounce'), type: 'checkbox', help: t('l2tpv3.schema.ip.enableArpAnnounceHelp') },
      { key: 'ip_enable_arp_ignore', title: t('l2tpv3.schema.ip.enableArpIgnore'), type: 'checkbox', help: t('l2tpv3.schema.ip.enableArpIgnoreHelp') },
      { key: 'ip_enable_directed_broadcast', title: t('l2tpv3.schema.ip.enableDirectedBroadcast'), type: 'checkbox', help: t('l2tpv3.schema.ip.enableDirectedBroadcastHelp') },
      { key: 'ip_enable_proxy_arp', title: t('l2tpv3.schema.ip.enableProxyArp'), type: 'checkbox', help: t('l2tpv3.schema.ip.enableProxyArpHelp') },
      { key: 'ip_proxy_arp_pvlan', title: t('l2tpv3.schema.ip.proxyArpPvlan'), type: 'checkbox', help: t('l2tpv3.schema.ip.proxyArpPvlanHelp') },
      { key: 'ip_source_validation', title: t('l2tpv3.schema.ip.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('l2tpv3.schema.ip.sourceValidationPlaceholder'), help: t('l2tpv3.schema.ip.sourceValidationHelp') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('l2tpv3.schema.ipv6.acceptDad'), type: 'select', options: acceptDadOptions.value, help: t('l2tpv3.schema.ipv6.acceptDadHelp') },
      { key: 'ipv6_autoconf', title: t('l2tpv3.schema.ipv6.autoconf'), type: 'checkbox', help: t('l2tpv3.schema.ipv6.autoconfHelp') },
      { key: 'ipv6_eui64', title: t('l2tpv3.schema.ipv6.eui64'), type: 'text', placeholder: t('l2tpv3.schema.ipv6.eui64Placeholder'), help: t('l2tpv3.schema.ipv6.eui64Help') },
      { key: 'ipv6_interface_identifier', title: t('l2tpv3.schema.ipv6.interfaceIdentifier'), type: 'text', placeholder: t('l2tpv3.schema.ipv6.interfaceIdentifierPlaceholder'), help: t('l2tpv3.schema.ipv6.interfaceIdentifierHelp') },
      { key: 'ipv6_no_default_link_local', title: t('l2tpv3.schema.ipv6.noDefaultLinkLocal'), type: 'checkbox', help: t('l2tpv3.schema.ipv6.noDefaultLinkLocalHelp') },
      { key: 'ipv6_adjust_mss', title: t('l2tpv3.schema.ipv6.adjustMss'), type: 'text', placeholder: t('l2tpv3.schema.ipv6.adjustMssPlaceholder'), help: t('l2tpv3.schema.ipv6.adjustMssHelp') },
      { key: 'ipv6_base_reachable_time', title: t('l2tpv3.schema.ipv6.baseReachableTime'), type: 'number', min: 1, max: 86400, placeholder: t('l2tpv3.schema.ipv6.baseReachableTimePlaceholder'), help: t('l2tpv3.schema.ipv6.baseReachableTimeHelp') },
      { key: 'ipv6_disable_forwarding', title: t('l2tpv3.schema.ipv6.disableForwarding'), type: 'checkbox', help: t('l2tpv3.schema.ipv6.disableForwardingHelp') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('l2tpv3.schema.ipv6.dupAddrDetectTransmits'), type: 'number', min: 0, max: 100, placeholder: t('l2tpv3.schema.ipv6.dupAddrDetectTransmitsPlaceholder'), help: t('l2tpv3.schema.ipv6.dupAddrDetectTransmitsHelp') },
      { key: 'ipv6_source_validation', title: t('l2tpv3.schema.ipv6.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('l2tpv3.schema.ipv6.sourceValidationPlaceholder'), help: t('l2tpv3.schema.ipv6.sourceValidationHelp') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('l2tpv3.schema.mirror.egress'), type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: t('l2tpv3.schema.mirror.placeholder'), help: t('l2tpv3.schema.mirror.egressHelp') },
      { key: 'mirror_ingress', title: t('l2tpv3.schema.mirror.ingress'), type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: t('l2tpv3.schema.mirror.placeholder'), help: t('l2tpv3.schema.mirror.ingressHelp') },
    ]);

    const otherSchema = computed(() => [
      { key: 'vrf', title: t('l2tpv3.schema.other.vrf'), type: 'select', options: [{ value: '', label: '' }, ...vrfOptions.value], placeholder: t('l2tpv3.schema.other.vrfPlaceholder'), help: t('l2tpv3.schema.other.vrfHelp') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingL2tpv3.value) return '';
      const l = editingL2tpv3.value;
      const name = l.name || 'l2tpethN';
      const lines = [];

      if (l.description) lines.push(`set interfaces l2tpv3 ${name} description "${l.description}"`);
      if (l.address) {
        l.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces l2tpv3 ${name} address ${a.trim()}`);
        });
      }
      if (l.encapsulation && l.encapsulation !== 'udp') lines.push(`set interfaces l2tpv3 ${name} encapsulation ${l.encapsulation}`);
      if (l.remote) lines.push(`set interfaces l2tpv3 ${name} remote ${l.remote}`);
      if (l.source_address) lines.push(`set interfaces l2tpv3 ${name} source-address ${l.source_address}`);
      if (l.source_port) lines.push(`set interfaces l2tpv3 ${name} source-port ${l.source_port}`);
      if (l.destination_port) lines.push(`set interfaces l2tpv3 ${name} destination-port ${l.destination_port}`);
      if (l.tunnel_id !== '' && l.tunnel_id !== null && l.tunnel_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} tunnel-id ${l.tunnel_id}`);
      if (l.peer_tunnel_id !== '' && l.peer_tunnel_id !== null && l.peer_tunnel_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} peer-tunnel-id ${l.peer_tunnel_id}`);
      if (l.session_id !== '' && l.session_id !== null && l.session_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} session-id ${l.session_id}`);
      if (l.peer_session_id !== '' && l.peer_session_id !== null && l.peer_session_id !== undefined) lines.push(`set interfaces l2tpv3 ${name} peer-session-id ${l.peer_session_id}`);
      if (l.mtu) lines.push(`set interfaces l2tpv3 ${name} mtu ${l.mtu}`);
      if (l.disable) lines.push(`set interfaces l2tpv3 ${name} disable`);

      // IP
      if (l.ip_adjust_mss) lines.push(`set interfaces l2tpv3 ${name} ip adjust-mss ${l.ip_adjust_mss}`);
      if (l.ip_arp_cache_timeout) lines.push(`set interfaces l2tpv3 ${name} ip arp-cache-timeout ${l.ip_arp_cache_timeout}`);
      if (l.ip_disable_arp_filter) lines.push(`set interfaces l2tpv3 ${name} ip disable-arp-filter`);
      if (l.ip_disable_forwarding) lines.push(`set interfaces l2tpv3 ${name} ip disable-forwarding`);
      if (l.ip_enable_arp_accept) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-accept`);
      if (l.ip_enable_arp_announce) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-announce`);
      if (l.ip_enable_arp_ignore) lines.push(`set interfaces l2tpv3 ${name} ip enable-arp-ignore`);
      if (l.ip_enable_directed_broadcast) lines.push(`set interfaces l2tpv3 ${name} ip enable-directed-broadcast`);
      if (l.ip_enable_proxy_arp) lines.push(`set interfaces l2tpv3 ${name} ip enable-proxy-arp`);
      if (l.ip_proxy_arp_pvlan) lines.push(`set interfaces l2tpv3 ${name} ip proxy-arp-pvlan`);
      if (l.ip_source_validation) lines.push(`set interfaces l2tpv3 ${name} ip source-validation ${l.ip_source_validation}`);

      // IPv6
      if (l.ipv6_accept_dad && l.ipv6_accept_dad !== '1') lines.push(`set interfaces l2tpv3 ${name} ipv6 accept-dad ${l.ipv6_accept_dad}`);
      if (l.ipv6_autoconf) lines.push(`set interfaces l2tpv3 ${name} ipv6 address autoconf`);
      if (l.ipv6_eui64) lines.push(`set interfaces l2tpv3 ${name} ipv6 address eui64 ${l.ipv6_eui64}`);
      if (l.ipv6_interface_identifier) lines.push(`set interfaces l2tpv3 ${name} ipv6 address interface-identifier ${l.ipv6_interface_identifier}`);
      if (l.ipv6_no_default_link_local) lines.push(`set interfaces l2tpv3 ${name} ipv6 address no-default-link-local`);
      if (l.ipv6_adjust_mss) lines.push(`set interfaces l2tpv3 ${name} ipv6 adjust-mss ${l.ipv6_adjust_mss}`);
      if (l.ipv6_base_reachable_time) lines.push(`set interfaces l2tpv3 ${name} ipv6 base-reachable-time ${l.ipv6_base_reachable_time}`);
      if (l.ipv6_disable_forwarding) lines.push(`set interfaces l2tpv3 ${name} ipv6 disable-forwarding`);
      if (l.ipv6_dup_addr_detect_transmits !== '' && l.ipv6_dup_addr_detect_transmits !== null && l.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces l2tpv3 ${name} ipv6 dup-addr-detect-transmits ${l.ipv6_dup_addr_detect_transmits}`);
      if (l.ipv6_source_validation) lines.push(`set interfaces l2tpv3 ${name} ipv6 source-validation ${l.ipv6_source_validation}`);

      // Mirror
      if (l.mirror_egress) lines.push(`set interfaces l2tpv3 ${name} mirror egress ${l.mirror_egress}`);
      if (l.mirror_ingress) lines.push(`set interfaces l2tpv3 ${name} mirror ingress ${l.mirror_ingress}`);

      // Other
      if (l.vrf) lines.push(`set interfaces l2tpv3 ${name} vrf ${l.vrf}`);

      return lines.length ? lines.join('\n') : t('l2tpv3.command.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('l2tpv3.tabs.basic') },
      { key: 'ip', title: t('l2tpv3.tabs.ip') },
      { key: 'ipv6', title: t('l2tpv3.tabs.ipv6') },
      { key: 'mirror', title: t('l2tpv3.tabs.mirror') },
      { key: 'other', title: t('l2tpv3.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', encapsulation: '', remote: '',
        source_address: '', source_port: '', destination_port: '',
        tunnel_id: '', peer_tunnel_id: '', session_id: '', peer_session_id: '',
        mtu: '', disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        vrf: '',
      };
    }

    function l2tpv3ToForm(l) {
      return {
        name: l.name || '',
        description: l.description || '',
        address: Array.isArray(l.address) ? l.address.join('\n') : (l.address || ''),
        encapsulation: l.encapsulation || '',
        remote: l.remote || '',
        source_address: l.source_address || '',
        source_port: l.source_port || '',
        destination_port: l.destination_port || '',
        tunnel_id: l.tunnel_id !== undefined ? l.tunnel_id : '',
        peer_tunnel_id: l.peer_tunnel_id !== undefined ? l.peer_tunnel_id : '',
        session_id: l.session_id !== undefined ? l.session_id : '',
        peer_session_id: l.peer_session_id !== undefined ? l.peer_session_id : '',
        mtu: l.mtu || '',
        disable: !!l.disable,
        ip_adjust_mss: l.ip?.adjust_mss || '',
        ip_arp_cache_timeout: l.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!l.ip?.disable_arp_filter,
        ip_disable_forwarding: !!l.ip?.disable_forwarding,
        ip_enable_arp_accept: !!l.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!l.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!l.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!l.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!l.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!l.ip?.proxy_arp_pvlan,
        ip_source_validation: l.ip?.source_validation || '',
        ipv6_accept_dad: l.ipv6?.accept_dad || '',
        ipv6_autoconf: !!l.ipv6?.address?.autoconf,
        ipv6_eui64: l.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: l.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!l.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: l.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: l.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!l.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: l.ipv6?.dup_addr_detect_transmits !== undefined ? l.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: l.ipv6?.source_validation || '',
        mirror_egress: l.mirror?.egress || '',
        mirror_ingress: l.mirror?.ingress || '',
        vrf: l.vrf || '',
      };
    }

    function formToL2tpv3(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.encapsulation && form.encapsulation !== 'udp') result.encapsulation = form.encapsulation;
      if (form.remote) result.remote = form.remote;
      if (form.source_address) result.source_address = form.source_address;
      if (form.source_port) result.source_port = Number(form.source_port);
      if (form.destination_port) result.destination_port = Number(form.destination_port);
      if (form.tunnel_id !== '' && form.tunnel_id !== null && form.tunnel_id !== undefined) result.tunnel_id = Number(form.tunnel_id);
      if (form.peer_tunnel_id !== '' && form.peer_tunnel_id !== null && form.peer_tunnel_id !== undefined) result.peer_tunnel_id = Number(form.peer_tunnel_id);
      if (form.session_id !== '' && form.session_id !== null && form.session_id !== undefined) result.session_id = Number(form.session_id);
      if (form.peer_session_id !== '' && form.peer_session_id !== null && form.peer_session_id !== undefined) result.peer_session_id = Number(form.peer_session_id);
      if (form.mtu) result.mtu = Number(form.mtu);
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

      // Mirror
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;

      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('/config', { path: 'interfaces l2tpv3' });
        const cfg = res.data || {};
        l2tpv3s.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          encapsulation: val.encapsulation || 'udp',
          remote: val.remote || '',
          tunnel_id: val.tunnel_id !== undefined ? val.tunnel_id : '',
          session_id: val.session_id !== undefined ? val.session_id : '',
          mtu: val.mtu || '',
          disable: !!val.disable,
          description: val.description || '',
        }));

        // Load interface options
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));

        // Load VRF options
        try {
          const vrfRes = await api.get('/config', { path: 'vrf' });
          const vrfData = vrfRes.data || {};
          const nameData = vrfData.name || vrfData;
          vrfOptions.value = Object.keys(nameData)
            .filter(name => typeof nameData[name] === 'object')
            .map(name => ({ value: name, label: name }));
        } catch (e) {
          vrfOptions.value = [];
        }
      } catch (err) {
        handleError(err);
      } finally {
        loading.value = false;
      }
    }

    function handleError(err) {
      showError({ message: `${t('l2tpv3.error.code')}: ${err.code || 'ERROR'}\n${t('l2tpv3.error.message')}: ${err.message || err}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingL2tpv3.value = l2tpv3ToForm(l2tpv3s.value[index]);
        isEditMode.value = true;
      } else {
        editingL2tpv3.value = getDefaultForm();
        isEditMode.value = false;
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function openModalByRow(row) {
      if (!row) {
        openModal(-1);
        return;
      }
      const index = l2tpv3s.value.findIndex(l => l.name === row.name);
      openModal(index);
    }

    async function save() {
      try {
        const form = editingL2tpv3.value;
        const name = form.name;
        if (!name) return showError({ message: t('l2tpv3.error.nameRequired') });

        const config = formToL2tpv3(form);
        console.log('[L2TPv3] Save config:', JSON.stringify(config, null, 2));

        const path = `interfaces l2tpv3 ${name}`;
        await configStore.setConfig(path, config);
        configStore.markPending();
        await configStore.checkSessionChanged();

        modalVisible.value = false;
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    function remove() {
      if (!selectedL2tpv3.value.length) return showError({ message: t('l2tpv3.error.selectToDelete') });
      pendingDeleteNames.value = selectedL2tpv3.value.map(l => l.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces l2tpv3 ${name}`);
          configStore.markPending();
        }
        selectedL2tpv3.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, l2tpv3s, selected: selectedL2tpv3, modalVisible, editingL2tpv3, isEditMode, interfaceOptions, vrfOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, openModalByRow, save, remove, confirmRemove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="l2tpv3s"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModalByRow($event)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingL2tpv3?.name ? t('l2tpv3.modal.edit') : t('l2tpv3.modal.create')" width="900px" @confirm="save">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingL2tpv3" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingL2tpv3" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingL2tpv3" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingL2tpv3" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingL2tpv3" />
            </template>
          </TabGroup>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('l2tpv3.modal.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemove">
        <div>{{ t('l2tpv3.modal.confirmDeleteMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
