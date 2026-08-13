import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict - Strict Reverse Path Forwarding (RFC3704)' },
  { value: 'loose', label: 'loose - Loose Reverse Path Forwarding (RFC3704)' },
  { value: 'disable', label: 'disable - No source validation' },
];

export default defineComponent({
  name: 'BridgePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.bridge.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('interface.bridge.description'), dataIndex: 'description', width: 150 },
      { key: 'member_count', title: t('interface.bridge.member_count'), dataIndex: 'member_count', width: 80 },
      { key: 'stp', title: t('interface.bridge.stp'), dataIndex: 'stp', width: 80 },
      { key: 'mtu', title: t('interface.bridge.mtu'), dataIndex: 'mtu', width: 80 },
      { key: 'disable', title: t('interface.bridge.disable'), dataIndex: 'disable', width: 80 },
      { key: 'actions', title: t('interface.bridge.actions'), dataIndex: 'actions', width: 120 },
    ]);
    const loading = ref(false);
    const bridges = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingBridge = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    // Options (moved inside setup to use t())
    const PROTOCOL_OPTIONS = [
      { value: '802.1q', label: t('interface.bridge.protocol.802.1q') },
      { value: '802.1ad', label: '802.1ad' },
    ];

    const ACCEPT_DAD_OPTIONS = [
      { value: '0', label: '0 - Disable DAD' },
      { value: '1', label: t('interface.bridge.ipv6.accept_dad.1') },
      { value: '2', label: '2 - Enable DAD, disable if duplicate MAC found' },
    ];

    // Delete confirmation modal
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.bridge.name'), type: 'text', required: true, placeholder: t('interface.bridge.name_placeholder'), help: t('interface.bridge.name_help') },
      { key: 'description', title: t('interface.bridge.description'), type: 'text', placeholder: t('interface.bridge.description_placeholder') },
      { key: 'mac', title: t('interface.bridge.mac'), type: 'text', placeholder: t('interface.bridge.mac_placeholder'), help: t('interface.bridge.mac_help') },
      { key: 'aging', title: t('interface.bridge.aging'), type: 'number', min: 0, max: 1000000, placeholder: t('interface.bridge.aging_placeholder'), help: t('interface.bridge.aging_help') },
      { key: 'forwarding_delay', title: t('interface.bridge.forwarding_delay'), type: 'number', min: 0, max: 30, placeholder: t('interface.bridge.forwarding_delay_placeholder'), help: t('interface.bridge.forwarding_delay_help') },
      { key: 'hello_time', title: t('interface.bridge.hello_time'), type: 'number', min: 1, max: 10, placeholder: t('interface.bridge.hello_time_placeholder'), help: t('interface.bridge.hello_time_help') },
      { key: 'max_age', title: t('interface.bridge.max_age'), type: 'number', min: 6, max: 40, placeholder: t('interface.bridge.max_age_placeholder'), help: t('interface.bridge.max_age_help') },
      { key: 'priority', title: t('interface.bridge.priority'), type: 'number', min: 0, max: 61440, step: 4096, placeholder: t('interface.bridge.priority_placeholder'), help: t('interface.bridge.priority_help') },
      { key: 'protocol', title: t('interface.bridge.protocol'), type: 'select', options: PROTOCOL_OPTIONS, help: t('interface.bridge.protocol_help') },
      { key: 'members', title: t('interface.bridge.members'), type: 'dual-list', options: interfaceOptions.value, titleLeft: t('interface.bridge.available_interfaces'), titleRight: t('interface.bridge.selected_members'), help: t('interface.bridge.members_help') },
      { key: 'stp', title: t('interface.bridge.enable_stp'), type: 'checkbox', help: t('interface.bridge.enable_stp_help') },
      { key: 'enable_vlan', title: t('interface.bridge.enable_vlan'), type: 'checkbox', help: t('interface.bridge.enable_vlan_help') },
      { key: 'mtu', title: t('interface.bridge.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.bridge.mtu_placeholder'), help: t('interface.bridge.mtu_help') },
      { key: 'disable', title: t('interface.bridge.disable_interface'), type: 'checkbox', help: t('interface.bridge.disable_interface_help') },
      { key: 'disable_link_detect', title: t('interface.bridge.disable_link_detect'), type: 'checkbox', help: t('interface.bridge.disable_link_detect_help') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('interface.bridge.dhcp.client_id'), type: 'text', placeholder: t('interface.bridge.dhcp.client_id_placeholder'), help: t('interface.bridge.dhcp.client_id_help') },
      { key: 'dhcp_default_route_distance', title: t('interface.bridge.dhcp.default_route_distance'), type: 'number', min: 1, max: 255, placeholder: t('interface.bridge.dhcp.default_route_distance_placeholder'), help: t('interface.bridge.dhcp.default_route_distance_help') },
      { key: 'dhcp_host_name', title: t('interface.bridge.dhcp.host_name'), type: 'text', placeholder: t('interface.bridge.dhcp.host_name_placeholder'), help: t('interface.bridge.dhcp.host_name_help') },
      { key: 'dhcp_mtu', title: t('interface.bridge.dhcp.use_mtu'), type: 'checkbox', help: t('interface.bridge.dhcp.use_mtu_help') },
      { key: 'dhcp_no_default_route', title: t('interface.bridge.dhcp.no_default_route'), type: 'checkbox', help: t('interface.bridge.dhcp.no_default_route_help') },
      { key: 'dhcp_reject', title: t('interface.bridge.dhcp.reject'), type: 'textarea', placeholder: t('interface.bridge.dhcp.reject_placeholder'), help: t('interface.bridge.dhcp.reject_help') },
      { key: 'dhcp_user_class', title: t('interface.bridge.dhcp.user_class'), type: 'text', placeholder: t('interface.bridge.dhcp.user_class_placeholder'), help: t('interface.bridge.dhcp.user_class_help') },
      { key: 'dhcp_vendor_class_id', title: t('interface.bridge.dhcp.vendor_class_id'), type: 'text', placeholder: t('interface.bridge.dhcp.vendor_class_id_placeholder'), help: t('interface.bridge.dhcp.vendor_class_id_help') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('interface.bridge.dhcpv6.duid'), type: 'text', placeholder: t('interface.bridge.dhcpv6.duid_placeholder'), help: t('interface.bridge.dhcpv6.duid_help') },
      { key: 'dhcpv6_no_release', title: t('interface.bridge.dhcpv6.no_release'), type: 'checkbox', help: t('interface.bridge.dhcpv6.no_release_help') },
      { key: 'dhcpv6_no_request_dns', title: t('interface.bridge.dhcpv6.no_request_dns'), type: 'checkbox', help: t('interface.bridge.dhcpv6.no_request_dns_help') },
      { key: 'dhcpv6_no_request_domain', title: t('interface.bridge.dhcpv6.no_request_domain'), type: 'checkbox', help: t('interface.bridge.dhcpv6.no_request_domain_help') },
      { key: 'dhcpv6_parameters_only', title: t('interface.bridge.dhcpv6.parameters_only'), type: 'checkbox', help: t('interface.bridge.dhcpv6.parameters_only_help') },
      { key: 'dhcpv6_rapid_commit', title: t('interface.bridge.dhcpv6.rapid_commit'), type: 'checkbox', help: t('interface.bridge.dhcpv6.rapid_commit_help') },
      { key: 'dhcpv6_temporary', title: t('interface.bridge.dhcpv6.temporary'), type: 'checkbox', help: t('interface.bridge.dhcpv6.temporary_help') },
    ]);

    const igmpSchema = computed(() => [
      { key: 'igmp_enable', title: t('interface.bridge.igmp.enable'), type: 'checkbox', help: t('interface.bridge.igmp.enable_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('interface.bridge.ip.adjust_mss'), type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: t('interface.bridge.ip.adjust_mss.clamp_mss') },
      ], placeholder: t('interface.bridge.ip.adjust_mss_placeholder'), help: t('interface.bridge.ip.adjust_mss_help') },
      { key: 'ip_arp_cache_timeout', title: t('interface.bridge.ip.arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: t('interface.bridge.ip.arp_cache_timeout_placeholder'), help: t('interface.bridge.ip.arp_cache_timeout_help') },
      { key: 'ip_disable_arp_filter', title: t('interface.bridge.ip.disable_arp_filter'), type: 'checkbox', help: t('interface.bridge.ip.disable_arp_filter_help') },
      { key: 'ip_disable_forwarding', title: t('interface.bridge.ip.disable_forwarding'), type: 'checkbox', help: t('interface.bridge.ip.disable_forwarding_help') },
      { key: 'ip_enable_arp_accept', title: t('interface.bridge.ip.enable_arp_accept'), type: 'checkbox', help: t('interface.bridge.ip.enable_arp_accept_help') },
      { key: 'ip_enable_arp_announce', title: t('interface.bridge.ip.enable_arp_announce'), type: 'checkbox', help: t('interface.bridge.ip.enable_arp_announce_help') },
      { key: 'ip_enable_arp_ignore', title: t('interface.bridge.ip.enable_arp_ignore'), type: 'checkbox', help: t('interface.bridge.ip.enable_arp_ignore_help') },
      { key: 'ip_enable_directed_broadcast', title: t('interface.bridge.ip.enable_directed_broadcast'), type: 'checkbox', help: t('interface.bridge.ip.enable_directed_broadcast_help') },
      { key: 'ip_enable_proxy_arp', title: t('interface.bridge.ip.enable_proxy_arp'), type: 'checkbox', help: t('interface.bridge.ip.enable_proxy_arp_help') },
      { key: 'ip_proxy_arp_pvlan', title: t('interface.bridge.ip.proxy_arp_pvlan'), type: 'checkbox', help: t('interface.bridge.ip.proxy_arp_pvlan_help') },
      { key: 'ip_source_validation', title: t('interface.bridge.ip.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.bridge.ip.source_validation_placeholder'), help: t('interface.bridge.ip.source_validation_help') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('interface.bridge.ipv6.accept_dad'), type: 'select', options: ACCEPT_DAD_OPTIONS, help: t('interface.bridge.ipv6.accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('interface.bridge.ipv6.autoconf'), type: 'checkbox', help: t('interface.bridge.ipv6.autoconf_help') },
      { key: 'ipv6_eui64', title: t('interface.bridge.ipv6.eui64'), type: 'text', placeholder: t('interface.bridge.ipv6.eui64_placeholder'), help: t('interface.bridge.ipv6.eui64_help') },
      { key: 'ipv6_no_default_link_local', title: t('interface.bridge.ipv6.no_default_link_local'), type: 'checkbox', help: t('interface.bridge.ipv6.no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('interface.bridge.ipv6.adjust_mss'), type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: t('interface.bridge.ipv6.adjust_mss.clamp_mss') },
      ], placeholder: t('interface.bridge.ipv6.adjust_mss_placeholder'), help: t('interface.bridge.ipv6.adjust_mss_help') },
      { key: 'ipv6_base_reachable_time', title: t('interface.bridge.ipv6.base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: t('interface.bridge.ipv6.base_reachable_time_placeholder'), help: t('interface.bridge.ipv6.base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('interface.bridge.ipv6.disable_forwarding'), type: 'checkbox', help: t('interface.bridge.ipv6.disable_forwarding_help') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('interface.bridge.ipv6.dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: t('interface.bridge.ipv6.dup_addr_detect_transmits_placeholder'), help: t('interface.bridge.ipv6.dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('interface.bridge.ipv6.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.bridge.ipv6.source_validation_placeholder'), help: t('interface.bridge.ipv6.source_validation_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('interface.bridge.mirror.egress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.bridge.mirror.placeholder'), help: t('interface.bridge.mirror.egress_help') },
      { key: 'mirror_ingress', title: t('interface.bridge.mirror.ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.bridge.mirror.placeholder'), help: t('interface.bridge.mirror.ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('interface.bridge.other.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.bridge.other.redirect_placeholder'), help: t('interface.bridge.other.redirect_help') },
      { key: 'vrf', title: t('interface.bridge.other.vrf'), type: 'text', placeholder: t('interface.bridge.other.vrf_placeholder'), help: t('interface.bridge.other.vrf_help') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingBridge.value) return '';
      const b = editingBridge.value;
      const name = b.name || 'brN';
      const lines = [];

      if (b.description) lines.push(`set interfaces bridge ${name} description "${b.description}"`);
      if (b.mac) lines.push(`set interfaces bridge ${name} mac ${b.mac}`);
      if (b.aging !== undefined && b.aging !== null) lines.push(`set interfaces bridge ${name} aging ${b.aging}`);
      if (b.forwarding_delay) lines.push(`set interfaces bridge ${name} forwarding-delay ${b.forwarding_delay}`);
      if (b.hello_time) lines.push(`set interfaces bridge ${name} hello-time ${b.hello_time}`);
      if (b.max_age) lines.push(`set interfaces bridge ${name} max-age ${b.max_age}`);
      if (b.priority) lines.push(`set interfaces bridge ${name} priority ${b.priority}`);
      if (b.protocol) lines.push(`set interfaces bridge ${name} protocol ${b.protocol}`);
      if (b.mtu) lines.push(`set interfaces bridge ${name} mtu ${b.mtu}`);
      if (b.stp) lines.push(`set interfaces bridge ${name} stp`);
      if (b.enable_vlan) lines.push(`set interfaces bridge ${name} enable-vlan`);
      if (b.disable) lines.push(`set interfaces bridge ${name} disable`);
      if (b.disable_link_detect) lines.push(`set interfaces bridge ${name} disable-link-detect`);

      // Members
      if (b.members && b.members.length > 0) {
        b.members.forEach(m => lines.push(`set interfaces bridge ${name} member interface ${m}`));
      }

      // DHCP
      if (b.dhcp_client_id) lines.push(`set interfaces bridge ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) lines.push(`set interfaces bridge ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) lines.push(`set interfaces bridge ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) lines.push(`set interfaces bridge ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) lines.push(`set interfaces bridge ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => lines.push(`set interfaces bridge ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) lines.push(`set interfaces bridge ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) lines.push(`set interfaces bridge ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      // DHCPv6
      if (b.dhcpv6_duid) lines.push(`set interfaces bridge ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) lines.push(`set interfaces bridge ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) lines.push(`set interfaces bridge ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) lines.push(`set interfaces bridge ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) lines.push(`set interfaces bridge ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) lines.push(`set interfaces bridge ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) lines.push(`set interfaces bridge ${name} dhcpv6-options temporary`);

      // IGMP
      if (b.igmp_enable) lines.push(`set interfaces bridge ${name} igmp enable`);

      // IP
      if (b.ip_adjust_mss) lines.push(`set interfaces bridge ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) lines.push(`set interfaces bridge ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) lines.push(`set interfaces bridge ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) lines.push(`set interfaces bridge ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) lines.push(`set interfaces bridge ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) lines.push(`set interfaces bridge ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) lines.push(`set interfaces bridge ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) lines.push(`set interfaces bridge ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) lines.push(`set interfaces bridge ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) lines.push(`set interfaces bridge ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) lines.push(`set interfaces bridge ${name} ip source-validation ${b.ip_source_validation}`);

      // IPv6
      if (b.ipv6_accept_dad) lines.push(`set interfaces bridge ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) lines.push(`set interfaces bridge ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) lines.push(`set interfaces bridge ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) lines.push(`set interfaces bridge ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) lines.push(`set interfaces bridge ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) lines.push(`set interfaces bridge ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) lines.push(`set interfaces bridge ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) lines.push(`set interfaces bridge ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) lines.push(`set interfaces bridge ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      // Mirror
      if (b.mirror_egress) lines.push(`set interfaces bridge ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) lines.push(`set interfaces bridge ${name} mirror ingress ${b.mirror_ingress}`);

      // Other
      if (b.redirect) lines.push(`set interfaces bridge ${name} redirect ${b.redirect}`);
      if (b.vrf) lines.push(`set interfaces bridge ${name} vrf ${b.vrf}`);

      return lines.join('\n') || `# ${t('interface.bridge.no_config')}`;
    });

    // Tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: t('interface.bridge.tab.basic') },
      { key: 'dhcp', title: t('interface.bridge.tab.dhcp') },
      { key: 'dhcpv6', title: t('interface.bridge.tab.dhcpv6') },
      { key: 'igmp', title: t('interface.bridge.tab.igmp') },
      { key: 'ip', title: t('interface.bridge.tab.ipv4_params') },
      { key: 'ipv6', title: t('interface.bridge.tab.ipv6_params') },
      { key: 'mirror', title: t('interface.bridge.tab.traffic_mirror') },
      { key: 'other', title: t('interface.bridge.tab.other') },
    ]);

    // Default form
    function getDefaultForm() {
      return {
        name: '',
        description: '',
        mac: '',
        aging: 300,
        forwarding_delay: 14,
        hello_time: 2,
        max_age: 20,
        priority: 32768,
        protocol: '802.1q',
        members: [],
        stp: false,
        enable_vlan: false,
        mtu: 1500,
        disable: false,
        disable_link_detect: false,
        dhcp_client_id: '',
        dhcp_default_route_distance: 210,
        dhcp_host_name: '',
        dhcp_mtu: false,
        dhcp_no_default_route: false,
        dhcp_reject: '',
        dhcp_user_class: '',
        dhcp_vendor_class_id: '',
        dhcpv6_duid: '',
        dhcpv6_no_release: false,
        dhcpv6_no_request_dns: false,
        dhcpv6_no_request_domain: false,
        dhcpv6_parameters_only: false,
        dhcpv6_rapid_commit: false,
        dhcpv6_temporary: false,
        igmp_enable: false,
        ip_adjust_mss: '',
        ip_arp_cache_timeout: 30,
        ip_disable_arp_filter: false,
        ip_disable_forwarding: false,
        ip_enable_arp_accept: false,
        ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false,
        ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false,
        ip_proxy_arp_pvlan: false,
        ip_source_validation: '',
        ipv6_accept_dad: '1',
        ipv6_autoconf: false,
        ipv6_eui64: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: 30,
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: 1,
        ipv6_source_validation: '',
        mirror_egress: '',
        mirror_ingress: '',
        redirect: '',
        vrf: '',
      };
    }

    // Convert config to form
    function bridgeToForm(cfg) {
      const form = getDefaultForm();
      form.name = cfg.name || '';
      form.description = cfg.description || '';
      form.mac = cfg.mac || '';
      form.aging = cfg.aging || 300;
      form.forwarding_delay = cfg['forwarding-delay'] || 14;
      form.hello_time = cfg['hello-time'] || 2;
      form.max_age = cfg['max-age'] || 20;
      form.priority = cfg.priority || 32768;
      form.protocol = cfg.protocol || '802.1q';
      form.mtu = cfg.mtu || 1500;
      form.stp = !!cfg.stp;
      form.enable_vlan = !!cfg['enable-vlan'];
      form.disable = !!cfg.disable;
      form.disable_link_detect = !!cfg['disable-link-detect'];

      // Members
      form.members = (cfg.member?.interface || []).map(i => typeof i === 'string' ? i : Object.keys(i)[0]);

      // DHCP
      if (cfg['dhcp-options']) {
        form.dhcp_client_id = cfg['dhcp-options']['client-id'] || '';
        form.dhcp_default_route_distance = cfg['dhcp-options']['default-route-distance'] || 210;
        form.dhcp_host_name = cfg['dhcp-options']['host-name'] || '';
        form.dhcp_mtu = !!cfg['dhcp-options'].mtu;
        form.dhcp_no_default_route = !!cfg['dhcp-options']['no-default-route'];
        form.dhcp_reject = (cfg['dhcp-options'].reject || []).join('\n');
        form.dhcp_user_class = cfg['dhcp-options']['user-class'] || '';
        form.dhcp_vendor_class_id = cfg['dhcp-options']['vendor-class-id'] || '';
      }

      // DHCPv6
      if (cfg['dhcpv6-options']) {
        form.dhcpv6_duid = cfg['dhcpv6-options'].duid || '';
        form.dhcpv6_no_release = !!cfg['dhcpv6-options']['no-release'];
        form.dhcpv6_no_request_dns = !!cfg['dhcpv6-options']['no-request-dns'];
        form.dhcpv6_no_request_domain = !!cfg['dhcpv6-options']['no-request-domain-name'];
        form.dhcpv6_parameters_only = !!cfg['dhcpv6-options']['parameters-only'];
        form.dhcpv6_rapid_commit = !!cfg['dhcpv6-options']['rapid-commit'];
        form.dhcpv6_temporary = !!cfg['dhcpv6-options'].temporary;
      }

      // IGMP
      if (cfg.igmp) {
        form.igmp_enable = !!cfg.igmp.enable;
      }

      // IP
      if (cfg.ip) {
        form.ip_adjust_mss = cfg.ip['adjust-mss'] || '';
        form.ip_arp_cache_timeout = cfg.ip['arp-cache-timeout'] || 30;
        form.ip_disable_arp_filter = !!cfg.ip['disable-arp-filter'];
        form.ip_disable_forwarding = !!cfg.ip['disable-forwarding'];
        form.ip_enable_arp_accept = !!cfg.ip['enable-arp-accept'];
        form.ip_enable_arp_announce = !!cfg.ip['enable-arp-announce'];
        form.ip_enable_arp_ignore = !!cfg.ip['enable-arp-ignore'];
        form.ip_enable_directed_broadcast = !!cfg.ip['enable-directed-broadcast'];
        form.ip_enable_proxy_arp = !!cfg.ip['enable-proxy-arp'];
        form.ip_proxy_arp_pvlan = !!cfg.ip['proxy-arp-pvlan'];
        form.ip_source_validation = cfg.ip['source-validation'] || '';
      }

      // IPv6
      if (cfg.ipv6) {
        form.ipv6_accept_dad = cfg.ipv6['accept-dad'] || '1';
        form.ipv6_autoconf = cfg.ipv6.address === 'autoconf' || !!cfg.ipv6.address?.autoconf;
        form.ipv6_eui64 = typeof cfg.ipv6.address === 'object' && cfg.ipv6.address.eui64 ? Object.keys(cfg.ipv6.address.eui64)[0] || '' : '';
        form.ipv6_no_default_link_local = cfg.ipv6.address === 'no-default-link-local' || !!cfg.ipv6.address?.['no-default-link-local'];
        form.ipv6_adjust_mss = cfg.ipv6['adjust-mss'] || '';
        form.ipv6_base_reachable_time = cfg.ipv6['base-reachable-time'] || 30;
        form.ipv6_disable_forwarding = !!cfg.ipv6['disable-forwarding'];
        form.ipv6_dup_addr_detect_transmits = cfg.ipv6['dup-addr-detect-transmits'] || 1;
        form.ipv6_source_validation = cfg.ipv6['source-validation'] || '';
      }

      // Mirror
      if (cfg.mirror) {
        form.mirror_egress = cfg.mirror.egress || '';
        form.mirror_ingress = cfg.mirror.ingress || '';
      }

      // Other
      form.redirect = cfg.redirect || '';
      form.vrf = cfg.vrf || '';

      return form;
    }

    // Load data
    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('interfaces bridge');
        bridges.value = Object.entries(res.data || {}).map(([name, cfg]) => ({
          name,
          ...cfg,
          member_count: (cfg.member?.interface || []).length,
        }));

        // Load interface options
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    // Open modal
    function openModal(index = -1) {
      if (index >= 0) {
        editingBridge.value = bridgeToForm(bridges.value[index]);
      } else {
        editingBridge.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    // Save
    async function save() {
      if (!editingBridge.value) return;
      const b = editingBridge.value;
      const name = b.name;
      if (!name) {
        showError(t('interface.bridge.nameRequired'));
        return;
      }

      const commands = [];
      const deleteCmd = `delete interfaces bridge ${name}`;

      // Build commands from form
      if (b.description) commands.push(`set interfaces bridge ${name} description "${b.description}"`);
      if (b.mac) commands.push(`set interfaces bridge ${name} mac ${b.mac}`);
      if (b.aging !== undefined && b.aging !== null) commands.push(`set interfaces bridge ${name} aging ${b.aging}`);
      if (b.forwarding_delay) commands.push(`set interfaces bridge ${name} forwarding-delay ${b.forwarding_delay}`);
      if (b.hello_time) commands.push(`set interfaces bridge ${name} hello-time ${b.hello_time}`);
      if (b.max_age) commands.push(`set interfaces bridge ${name} max-age ${b.max_age}`);
      if (b.priority) commands.push(`set interfaces bridge ${name} priority ${b.priority}`);
      if (b.protocol) commands.push(`set interfaces bridge ${name} protocol ${b.protocol}`);
      if (b.mtu) commands.push(`set interfaces bridge ${name} mtu ${b.mtu}`);
      if (b.stp) commands.push(`set interfaces bridge ${name} stp`);
      if (b.enable_vlan) commands.push(`set interfaces bridge ${name} enable-vlan`);
      if (b.disable) commands.push(`set interfaces bridge ${name} disable`);
      if (b.disable_link_detect) commands.push(`set interfaces bridge ${name} disable-link-detect`);

      if (b.members && b.members.length > 0) {
        b.members.forEach(m => commands.push(`set interfaces bridge ${name} member interface ${m}`));
      }

      if (b.dhcp_client_id) commands.push(`set interfaces bridge ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) commands.push(`set interfaces bridge ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) commands.push(`set interfaces bridge ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) commands.push(`set interfaces bridge ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) commands.push(`set interfaces bridge ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => commands.push(`set interfaces bridge ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) commands.push(`set interfaces bridge ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) commands.push(`set interfaces bridge ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      if (b.dhcpv6_duid) commands.push(`set interfaces bridge ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) commands.push(`set interfaces bridge ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) commands.push(`set interfaces bridge ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) commands.push(`set interfaces bridge ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) commands.push(`set interfaces bridge ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) commands.push(`set interfaces bridge ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) commands.push(`set interfaces bridge ${name} dhcpv6-options temporary`);

      if (b.igmp_enable) commands.push(`set interfaces bridge ${name} igmp enable`);

      if (b.ip_adjust_mss) commands.push(`set interfaces bridge ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) commands.push(`set interfaces bridge ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) commands.push(`set interfaces bridge ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) commands.push(`set interfaces bridge ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) commands.push(`set interfaces bridge ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) commands.push(`set interfaces bridge ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) commands.push(`set interfaces bridge ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) commands.push(`set interfaces bridge ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) commands.push(`set interfaces bridge ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) commands.push(`set interfaces bridge ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) commands.push(`set interfaces bridge ${name} ip source-validation ${b.ip_source_validation}`);

      if (b.ipv6_accept_dad) commands.push(`set interfaces bridge ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) commands.push(`set interfaces bridge ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) commands.push(`set interfaces bridge ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) commands.push(`set interfaces bridge ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) commands.push(`set interfaces bridge ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) commands.push(`set interfaces bridge ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) commands.push(`set interfaces bridge ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) commands.push(`set interfaces bridge ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) commands.push(`set interfaces bridge ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      if (b.mirror_egress) commands.push(`set interfaces bridge ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) commands.push(`set interfaces bridge ${name} mirror ingress ${b.mirror_ingress}`);

      if (b.redirect) commands.push(`set interfaces bridge ${name} redirect ${b.redirect}`);
      if (b.vrf) commands.push(`set interfaces bridge ${name} vrf ${b.vrf}`);

      try {
        const allCommands = [deleteCmd, ...commands];
        await configApi.configure(allCommands);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    // Delete
    function remove() {
      if (selected.value.length === 0) {
        showError(t('interface.bridge.selectInterfaceFirst'));
        return;
      }
      pendingDeleteNames.value = selected.value.map(b => b.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      const commands = pendingDeleteNames.value.map(n => `delete interfaces bridge ${n}`);
      try {
        await configApi.configure(commands);
        configStore.markPending();
        pendingDeleteNames.value = [];
        selected.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => {
      load();
    });

    return {
      loading, bridges, selected, modalVisible, editingBridge, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, igmpSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="bridges"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? bridges.indexOf(selected[0]) : -1)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
        rowKey="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'stp'">
            <span :class="record.stp ? 'badge badge-success' : 'badge badge-secondary'">
              {{ record.stp ? t('common.enabled') : t('common.disabled') }}
            </span>
          </template>
          <template v-if="column.key === 'disable'">
            <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
              {{ record.disable ? t('common.yes') : t('common.no') }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(bridges.indexOf(record))">{{ t('common.edit') }}</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">{{ t('common.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingBridge?.name ? t('interface.bridge.modal.edit') : t('interface.bridge.modal.create')"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingBridge">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingBridge" :schema="basicSchema" />
            </template>
            <template #dhcp>
              <ConfigForm v-model="editingBridge" :schema="dhcpSchema" />
            </template>
            <template #dhcpv6>
              <ConfigForm v-model="editingBridge" :schema="dhcpv6Schema" />
            </template>
            <template #igmp>
              <ConfigForm v-model="editingBridge" :schema="igmpSchema" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingBridge" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingBridge" :schema="ipv6Schema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingBridge" :schema="mirrorSchema" />
            </template>
            <template #other>
              <ConfigForm v-model="editingBridge" :schema="otherSchema" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteModalVisible" :title="t('common.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('interface.bridge.delete_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
