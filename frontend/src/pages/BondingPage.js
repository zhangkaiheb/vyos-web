import { defineComponent, ref, computed, onMounted, onUnmounted, inject } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

// Options
const BOND_MODE_OPTIONS = [
  { value: '802.3ad', label: '802.3ad - IEEE 802.3ad Dynamic link aggregation' },
  { value: 'active-backup', label: 'active-backup - Fault tolerant: only one slave is active' },
  { value: 'balance-rr', label: 'balance-rr - Round-robin policy' },
  { value: 'balance-xor', label: 'balance-xor - XOR policy' },
  { value: 'balance-tlb', label: 'balance-tlb - Adaptive transmit load balancing' },
  { value: 'balance-alb', label: 'balance-alb - Adaptive load balancing' },
  { value: 'broadcast', label: 'broadcast - Fault tolerant: transmits on all slaves' },
];

const HASH_POLICY_OPTIONS = [
  { value: 'layer2', label: 'layer2 - MAC addresses' },
  { value: 'layer2+3', label: 'layer2+3 - MAC + IP address' },
  { value: 'layer3+4', label: 'layer3+4 - IP address + port' },
  { value: 'encap2+3', label: 'encap2+3 - Encapsulated MAC + IP' },
  { value: 'encap3+4', label: 'encap3+4 - Encapsulated IP + port' },
];

const LACP_RATE_OPTIONS = [
  { value: 'slow', label: 'slow' },
  { value: 'fast', label: 'fast' },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict - Strict Reverse Path Forwarding (RFC3704)' },
  { value: 'loose', label: 'loose - Loose Reverse Path Forwarding (RFC3704)' },
  { value: 'disable', label: 'disable - No source validation' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 - Disable DAD' },
  { value: '1', label: '1 - Enable DAD' },
  { value: '2', label: '2 - Enable DAD, disable if duplicate MAC found' },
];

export default defineComponent({
  name: 'BondingPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = inject('i18n');
    const configStore = useConfigStore();
    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.bonding.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('interface.bonding.description'), dataIndex: 'description', width: 150 },
      { key: 'mode', title: t('interface.bonding.mode'), dataIndex: 'mode', width: 120 },
      { key: 'member_count', title: t('interface.bonding.member_count'), dataIndex: 'member_count', width: 80 },
      { key: 'mtu', title: t('interface.bonding.mtu'), dataIndex: 'mtu', width: 80 },
      { key: 'disable', title: t('interface.bonding.disable'), dataIndex: 'disable', width: 80 },
      { key: 'actions', title: t('interface.bonding.actions'), dataIndex: 'actions', width: 120 },
    ]);
    const loading = ref(false);
    const bonds = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingBond = ref(null);
    const isEditMode = ref(false);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const bridgeMembers = ref(new Set());
    const activeTab = ref('basic');
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    // Extract interface names from API response (objects have name, type, mode, etc.)
    // Exclude interfaces that are already members of any bridge
    const interfaceNames = computed(() => interfaceOptions.value.map(i => i.name || i).filter(name => name && !bridgeMembers.value.has(name)));

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.bonding.name'), type: 'text', required: true, placeholder: t('interface.bonding.name_placeholder'), help: t('interface.bonding.name_help'), disabled: isEditMode.value },
      { key: 'description', title: t('interface.bonding.description'), type: 'text', placeholder: t('interface.bonding.description_placeholder') },
      { key: 'mac', title: t('interface.bonding.mac'), type: 'text', placeholder: t('interface.bonding.mac_placeholder'), help: t('interface.bonding.mac_help') },
      { key: 'mode', title: t('interface.bonding.mode'), type: 'select', options: BOND_MODE_OPTIONS, help: t('interface.bonding.mode_help') },
      { key: 'hash_policy', title: t('interface.bonding.hash_policy'), type: 'select', options: HASH_POLICY_OPTIONS, help: t('interface.bonding.hash_policy_help') },
      { key: 'lacp_rate', title: t('interface.bonding.lacp_rate'), type: 'select', options: LACP_RATE_OPTIONS, help: t('interface.bonding.lacp_rate_help') },
      { key: 'min_links', title: t('interface.bonding.min_links'), type: 'number', min: 0, max: 16, placeholder: t('interface.bonding.min_links_placeholder'), help: t('interface.bonding.min_links_help') },
      { key: 'mii_mon_interval', title: t('interface.bonding.mii_mon_interval'), type: 'number', min: 0, max: 1000, placeholder: t('interface.bonding.mii_mon_interval_placeholder'), help: t('interface.bonding.mii_mon_interval_help') },
      { key: 'mtu', title: t('interface.bonding.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.bonding.mtu_placeholder'), help: t('interface.bonding.mtu_help') },
      { key: 'system_mac', title: t('interface.bonding.system_mac'), type: 'text', placeholder: t('interface.bonding.system_mac_placeholder'), help: t('interface.bonding.system_mac_help') },
      { key: 'disable', title: t('interface.bonding.disable_interface'), type: 'checkbox', help: t('interface.bonding.disable_interface_help') },
      { key: 'disable_link_detect', title: t('interface.bonding.disable_link_detect'), type: 'checkbox', help: t('interface.bonding.disable_link_detect_help') },
    ]);

    // Members schema: checkbox list for all interfaces + primary select
    const membersSchema = computed(() => {
      const names = interfaceNames.value;
      return [
        ...names.map(name => ({
          key: `member_${name}`,
          title: name,
          type: 'checkbox',
        })),
        { key: 'primary', title: t('interface.bonding.primary'), type: 'select', options: ['', ...names], placeholder: t('interface.bonding.primary_placeholder'), help: t('interface.bonding.primary_help') },
      ];
    });

    const arpMonitorSchema = computed(() => [
      { key: 'arp_interval', title: t('interface.bonding.arp_interval'), type: 'number', min: 0, max: 4294967295, placeholder: t('interface.bonding.arp_interval_placeholder'), help: t('interface.bonding.arp_interval_help') },
      { key: 'arp_targets', title: t('interface.bonding.arp_targets'), type: 'textarea', placeholder: t('interface.bonding.arp_targets_placeholder'), help: t('interface.bonding.arp_targets_help') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('interface.bonding.dhcp.client_id'), type: 'text', placeholder: t('interface.bonding.dhcp.client_id_placeholder'), help: t('interface.bonding.dhcp.client_id_help') },
      { key: 'dhcp_default_route_distance', title: t('interface.bonding.dhcp.default_route_distance'), type: 'number', min: 1, max: 255, placeholder: t('interface.bonding.dhcp.default_route_distance_placeholder'), help: t('interface.bonding.dhcp.default_route_distance_help') },
      { key: 'dhcp_host_name', title: t('interface.bonding.dhcp.host_name'), type: 'text', placeholder: t('interface.bonding.dhcp.host_name_placeholder'), help: t('interface.bonding.dhcp.host_name_help') },
      { key: 'dhcp_mtu', title: t('interface.bonding.dhcp.use_mtu'), type: 'checkbox', help: t('interface.bonding.dhcp.use_mtu_help') },
      { key: 'dhcp_no_default_route', title: t('interface.bonding.dhcp.no_default_route'), type: 'checkbox', help: t('interface.bonding.dhcp.no_default_route_help') },
      { key: 'dhcp_reject', title: t('interface.bonding.dhcp.reject'), type: 'textarea', placeholder: t('interface.bonding.dhcp.reject_placeholder'), help: t('interface.bonding.dhcp.reject_help') },
      { key: 'dhcp_user_class', title: t('interface.bonding.dhcp.user_class'), type: 'text', placeholder: t('interface.bonding.dhcp.user_class_placeholder'), help: t('interface.bonding.dhcp.user_class_help') },
      { key: 'dhcp_vendor_class_id', title: t('interface.bonding.dhcp.vendor_class_id'), type: 'text', placeholder: t('interface.bonding.dhcp.vendor_class_id_placeholder'), help: t('interface.bonding.dhcp.vendor_class_id_help') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('interface.bonding.dhcpv6.duid'), type: 'text', placeholder: t('interface.bonding.dhcpv6.duid_placeholder'), help: t('interface.bonding.dhcpv6.duid_help') },
      { key: 'dhcpv6_no_release', title: t('interface.bonding.dhcpv6.no_release'), type: 'checkbox', help: t('interface.bonding.dhcpv6.no_release_help') },
      { key: 'dhcpv6_no_request_dns', title: t('interface.bonding.dhcpv6.no_request_dns'), type: 'checkbox', help: t('interface.bonding.dhcpv6.no_request_dns_help') },
      { key: 'dhcpv6_no_request_domain', title: t('interface.bonding.dhcpv6.no_request_domain'), type: 'checkbox', help: t('interface.bonding.dhcpv6.no_request_domain_help') },
      { key: 'dhcpv6_parameters_only', title: t('interface.bonding.dhcpv6.parameters_only'), type: 'checkbox', help: t('interface.bonding.dhcpv6.parameters_only_help') },
      { key: 'dhcpv6_rapid_commit', title: t('interface.bonding.dhcpv6.rapid_commit'), type: 'checkbox', help: t('interface.bonding.dhcpv6.rapid_commit_help') },
      { key: 'dhcpv6_temporary', title: t('interface.bonding.dhcpv6.temporary'), type: 'checkbox', help: t('interface.bonding.dhcpv6.temporary_help') },
    ]);

    const eapolSchema = computed(() => [
      { key: 'eapol_ca_certificate', title: t('interface.bonding.eapol.ca_certificate'), type: 'text', placeholder: t('interface.bonding.eapol.ca_certificate_placeholder'), help: t('interface.bonding.eapol.ca_certificate_help') },
      { key: 'eapol_certificate', title: t('interface.bonding.eapol.certificate'), type: 'text', placeholder: t('interface.bonding.eapol.certificate_placeholder'), help: t('interface.bonding.eapol.certificate_help') },
      { key: 'eapol_passphrase', title: t('interface.bonding.eapol.passphrase'), type: 'password', placeholder: t('interface.bonding.eapol.passphrase_placeholder'), help: t('interface.bonding.eapol.passphrase_help') },
    ]);

    const evpnSchema = computed(() => [
      { key: 'evpn_es_df_pref', title: t('interface.bonding.evpn.es_df_pref'), type: 'number', min: 1, max: 65535, placeholder: t('interface.bonding.evpn.es_df_pref_placeholder'), help: t('interface.bonding.evpn.es_df_pref_help') },
      { key: 'evpn_es_id', title: t('interface.bonding.evpn.es_id'), type: 'text', placeholder: t('interface.bonding.evpn.es_id_placeholder'), help: t('interface.bonding.evpn.es_id_help') },
      { key: 'evpn_es_sys_mac', title: t('interface.bonding.evpn.es_sys_mac'), type: 'text', placeholder: t('interface.bonding.evpn.es_sys_mac_placeholder'), help: t('interface.bonding.evpn.es_sys_mac_help') },
      { key: 'evpn_uplink', title: t('interface.bonding.evpn.uplink'), type: 'checkbox', help: t('interface.bonding.evpn.uplink_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('interface.bonding.ip.adjust_mss'), type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: 'clamp-mss-to-pmtu' },
      ], placeholder: t('interface.bonding.ip.adjust_mss_placeholder'), help: t('interface.bonding.ip.adjust_mss_help') },
      { key: 'ip_arp_cache_timeout', title: t('interface.bonding.ip.arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: t('interface.bonding.ip.arp_cache_timeout_placeholder'), help: t('interface.bonding.ip.arp_cache_timeout_help') },
      { key: 'ip_disable_arp_filter', title: t('interface.bonding.ip.disable_arp_filter'), type: 'checkbox', help: t('interface.bonding.ip.disable_arp_filter_help') },
      { key: 'ip_disable_forwarding', title: t('interface.bonding.ip.disable_forwarding'), type: 'checkbox', help: t('interface.bonding.ip.disable_forwarding_help') },
      { key: 'ip_enable_arp_accept', title: t('interface.bonding.ip.enable_arp_accept'), type: 'checkbox', help: t('interface.bonding.ip.enable_arp_accept_help') },
      { key: 'ip_enable_arp_announce', title: t('interface.bonding.ip.enable_arp_announce'), type: 'checkbox', help: t('interface.bonding.ip.enable_arp_announce_help') },
      { key: 'ip_enable_arp_ignore', title: t('interface.bonding.ip.enable_arp_ignore'), type: 'checkbox', help: t('interface.bonding.ip.enable_arp_ignore_help') },
      { key: 'ip_enable_directed_broadcast', title: t('interface.bonding.ip.enable_directed_broadcast'), type: 'checkbox', help: t('interface.bonding.ip.enable_directed_broadcast_help') },
      { key: 'ip_enable_proxy_arp', title: t('interface.bonding.ip.enable_proxy_arp'), type: 'checkbox', help: t('interface.bonding.ip.enable_proxy_arp_help') },
      { key: 'ip_proxy_arp_pvlan', title: t('interface.bonding.ip.proxy_arp_pvlan'), type: 'checkbox', help: t('interface.bonding.ip.proxy_arp_pvlan_help') },
      { key: 'ip_source_validation', title: t('interface.bonding.ip.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.bonding.ip.source_validation_placeholder'), help: t('interface.bonding.ip.source_validation_help') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('interface.bonding.ipv6.accept_dad'), type: 'select', options: ACCEPT_DAD_OPTIONS, help: t('interface.bonding.ipv6.accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('interface.bonding.ipv6.autoconf'), type: 'checkbox', help: t('interface.bonding.ipv6.autoconf_help') },
      { key: 'ipv6_eui64', title: t('interface.bonding.ipv6.eui64'), type: 'text', placeholder: t('interface.bonding.ipv6.eui64_placeholder'), help: t('interface.bonding.ipv6.eui64_help') },
      { key: 'ipv6_no_default_link_local', title: t('interface.bonding.ipv6.no_default_link_local'), type: 'checkbox', help: t('interface.bonding.ipv6.no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('interface.bonding.ipv6.adjust_mss'), type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: 'clamp-mss-to-pmtu' },
      ], placeholder: t('interface.bonding.ipv6.adjust_mss_placeholder'), help: t('interface.bonding.ipv6.adjust_mss_help') },
      { key: 'ipv6_base_reachable_time', title: t('interface.bonding.ipv6.base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: t('interface.bonding.ipv6.base_reachable_time_placeholder'), help: t('interface.bonding.ipv6.base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('interface.bonding.ipv6.disable_forwarding'), type: 'checkbox', help: t('interface.bonding.ipv6.disable_forwarding_help') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('interface.bonding.ipv6.dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: t('interface.bonding.ipv6.dup_addr_detect_transmits_placeholder'), help: t('interface.bonding.ipv6.dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('interface.bonding.ipv6.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.bonding.ipv6.source_validation_placeholder'), help: t('interface.bonding.ipv6.source_validation_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('interface.bonding.mirror.egress'), type: 'select', options: ['', ...interfaceNames.value], placeholder: t('interface.bonding.mirror.placeholder'), help: t('interface.bonding.mirror.egress_help') },
      { key: 'mirror_ingress', title: t('interface.bonding.mirror.ingress'), type: 'select', options: ['', ...interfaceNames.value], placeholder: t('interface.bonding.mirror.placeholder'), help: t('interface.bonding.mirror.ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('interface.bonding.other.redirect'), type: 'select', options: ['', ...interfaceNames.value], placeholder: t('interface.bonding.other.redirect_placeholder'), help: t('interface.bonding.other.redirect_help') },
      { key: 'vrf', title: t('interface.bonding.other.vrf'), type: 'select', options: ['', ...vrfOptions.value], placeholder: t('interface.bonding.other.vrf_placeholder'), help: t('interface.bonding.other.vrf_help') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingBond.value) return '';
      const b = editingBond.value;
      const name = b.name || 'bondN';
      const lines = [];

      if (b.description) lines.push(`set interfaces bonding ${name} description "${b.description}"`);
      if (b.mac) lines.push(`set interfaces bonding ${name} mac ${b.mac}`);
      if (b.mode) lines.push(`set interfaces bonding ${name} mode ${b.mode}`);
      if (b.hash_policy) lines.push(`set interfaces bonding ${name} hash-policy ${b.hash_policy}`);
      if (b.lacp_rate) lines.push(`set interfaces bonding ${name} lacp-rate ${b.lacp_rate}`);
      if (b.mtu) lines.push(`set interfaces bonding ${name} mtu ${b.mtu}`);
      if (b.min_links) lines.push(`set interfaces bonding ${name} min-links ${b.min_links}`);
      if (b.mii_mon_interval !== undefined && b.mii_mon_interval !== null) lines.push(`set interfaces bonding ${name} mii-mon-interval ${b.mii_mon_interval}`);
      if (b.system_mac) lines.push(`set interfaces bonding ${name} system-mac ${b.system_mac}`);
      if (b.disable) lines.push(`set interfaces bonding ${name} disable`);
      if (b.disable_link_detect) lines.push(`set interfaces bonding ${name} disable-link-detect`);

      // Members
      if (b.members && b.members.length > 0) {
        b.members.forEach(m => lines.push(`set interfaces bonding ${name} member interface ${m}`));
      }
      if (b.primary) lines.push(`set interfaces bonding ${name} primary ${b.primary}`);

      // ARP monitor
      if (b.arp_interval !== undefined && b.arp_interval !== null) lines.push(`set interfaces bonding ${name} arp-monitor interval ${b.arp_interval}`);
      if (b.arp_targets) {
        b.arp_targets.split('\n').filter(t => t.trim()).forEach(t => lines.push(`set interfaces bonding ${name} arp-monitor target ${t.trim()}`));
      }

      // DHCP
      if (b.dhcp_client_id) lines.push(`set interfaces bonding ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) lines.push(`set interfaces bonding ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) lines.push(`set interfaces bonding ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) lines.push(`set interfaces bonding ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) lines.push(`set interfaces bonding ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => lines.push(`set interfaces bonding ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) lines.push(`set interfaces bonding ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) lines.push(`set interfaces bonding ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      // DHCPv6
      if (b.dhcpv6_duid) lines.push(`set interfaces bonding ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) lines.push(`set interfaces bonding ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) lines.push(`set interfaces bonding ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) lines.push(`set interfaces bonding ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) lines.push(`set interfaces bonding ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) lines.push(`set interfaces bonding ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) lines.push(`set interfaces bonding ${name} dhcpv6-options temporary`);

      // EAPOL
      if (b.eapol_ca_certificate) lines.push(`set interfaces bonding ${name} eapol ca-certificate ${b.eapol_ca_certificate}`);
      if (b.eapol_certificate) lines.push(`set interfaces bonding ${name} eapol certificate ${b.eapol_certificate}`);
      if (b.eapol_passphrase) lines.push(`set interfaces bonding ${name} eapol passphrase ${b.eapol_passphrase}`);

      // EVPN
      if (b.evpn_es_df_pref) lines.push(`set interfaces bonding ${name} evpn es-df-pref ${b.evpn_es_df_pref}`);
      if (b.evpn_es_id) lines.push(`set interfaces bonding ${name} evpn es-id ${b.evpn_es_id}`);
      if (b.evpn_es_sys_mac) lines.push(`set interfaces bonding ${name} evpn es-sys-mac ${b.evpn_es_sys_mac}`);
      if (b.evpn_uplink) lines.push(`set interfaces bonding ${name} evpn uplink`);

      // IP
      if (b.ip_adjust_mss) lines.push(`set interfaces bonding ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) lines.push(`set interfaces bonding ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) lines.push(`set interfaces bonding ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) lines.push(`set interfaces bonding ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) lines.push(`set interfaces bonding ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) lines.push(`set interfaces bonding ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) lines.push(`set interfaces bonding ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) lines.push(`set interfaces bonding ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) lines.push(`set interfaces bonding ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) lines.push(`set interfaces bonding ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) lines.push(`set interfaces bonding ${name} ip source-validation ${b.ip_source_validation}`);

      // IPv6
      if (b.ipv6_accept_dad) lines.push(`set interfaces bonding ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) lines.push(`set interfaces bonding ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) lines.push(`set interfaces bonding ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) lines.push(`set interfaces bonding ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) lines.push(`set interfaces bonding ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) lines.push(`set interfaces bonding ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) lines.push(`set interfaces bonding ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) lines.push(`set interfaces bonding ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) lines.push(`set interfaces bonding ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      // Mirror
      if (b.mirror_egress) lines.push(`set interfaces bonding ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) lines.push(`set interfaces bonding ${name} mirror ingress ${b.mirror_ingress}`);

      // Other
      if (b.redirect) lines.push(`set interfaces bonding ${name} redirect ${b.redirect}`);
      if (b.vrf) lines.push(`set interfaces bonding ${name} vrf ${b.vrf}`);

      return lines.join('\n') || `# ${t('interface.bonding.no_config')}`;
    });

    // Tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: t('interface.bonding.tab.basic') },
      { key: 'members', title: t('interface.bonding.tab.members') },
      { key: 'arp', title: t('interface.bonding.tab.arp_monitor') },
      { key: 'dhcp', title: t('interface.bonding.tab.dhcp') },
      { key: 'dhcpv6', title: t('interface.bonding.tab.dhcpv6') },
      { key: 'eapol', title: t('interface.bonding.tab.eapol') },
      { key: 'evpn', title: t('interface.bonding.tab.evpn') },
      { key: 'ip', title: t('interface.bonding.tab.ipv4_params') },
      { key: 'ipv6', title: t('interface.bonding.tab.ipv6_params') },
      { key: 'mirror', title: t('interface.bonding.tab.traffic_mirror') },
      { key: 'other', title: t('interface.bonding.tab.other') },
    ]);

    // Default form
    function getDefaultForm() {
      return {
        name: '',
        description: '',
        mac: '',
        mode: '802.3ad',
        hash_policy: 'layer2',
        lacp_rate: 'slow',
        members: [],
        primary: '',
        min_links: 0,
        mii_mon_interval: 100,
        mtu: 1500,
        system_mac: '',
        disable: false,
        disable_link_detect: false,
        arp_interval: null,
        arp_targets: '',
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
        eapol_ca_certificate: '',
        eapol_certificate: '',
        eapol_passphrase: '',
        evpn_es_df_pref: null,
        evpn_es_id: '',
        evpn_es_sys_mac: '',
        evpn_uplink: false,
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
    function bondToForm(cfg) {
      const form = getDefaultForm();
      form.name = cfg.name || '';
      form.description = cfg.description || '';
      form.mac = cfg.mac || '';
      form.mode = cfg.mode || '802.3ad';
      form.hash_policy = cfg['hash-policy'] || 'layer2';
      form.lacp_rate = cfg['lacp-rate'] || 'slow';
      form.mtu = cfg.mtu || 1500;
      form.min_links = cfg['min-links'] || 0;
      form.mii_mon_interval = cfg['mii-mon-interval'] || 100;
      form.system_mac = cfg['system-mac'] || '';
      form.disable = !!cfg.disable;
      form.disable_link_detect = !!cfg['disable-link-detect'];

      // Members - set individual checkboxes
      const memberIfaces = (cfg.member?.interface || []).map(i => typeof i === 'string' ? i : Object.keys(i)[0]);
      form.members = memberIfaces;
      interfaceNames.value.forEach(name => {
        form[`member_${name}`] = memberIfaces.includes(name);
      });
      form.primary = cfg.primary || '';

      // ARP monitor
      if (cfg['arp-monitor']) {
        form.arp_interval = cfg['arp-monitor'].interval || null;
        form.arp_targets = (cfg['arp-monitor'].target || []).join('\n');
      }

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

      // EAPOL
      if (cfg.eapol) {
        form.eapol_ca_certificate = cfg.eapol['ca-certificate'] || '';
        form.eapol_certificate = cfg.eapol.certificate || '';
        form.eapol_passphrase = cfg.eapol.passphrase || '';
      }

      // EVPN
      if (cfg.evpn) {
        form.evpn_es_df_pref = cfg.evpn['es-df-pref'] || null;
        form.evpn_es_id = cfg.evpn['es-id'] || '';
        form.evpn_es_sys_mac = cfg.evpn['es-sys-mac'] || '';
        form.evpn_uplink = !!cfg.evpn.uplink;
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
        const res = await configApi.get('interfaces bonding');
        bonds.value = Object.entries(res.data || {}).map(([name, cfg]) => ({
          name,
          ...cfg,
          member_count: (cfg.member?.interface || []).length,
        }));

        // Load interface options - only physical ethernet interfaces (no dots in name) without address configuration
        const ifRes = await interfaceApi.ethernet();
        interfaceOptions.value = (ifRes.interfaces || []).filter(i => {
          const name = i.name || i;
          return name && !name.includes('.') && !i.address_mode;
        });
        
        // Load bridge members to exclude them from bonding member options
        try {
          const bridgeRes = await configApi.get('interfaces bridge');
          const bridgeMemberSet = new Set();
          Object.values(bridgeRes.data || {}).forEach(cfg => {
            const m = cfg.member?.interface;
            if (m) {
              if (Array.isArray(m)) m.forEach(i => bridgeMemberSet.add(i));
              else Object.keys(m).forEach(i => bridgeMemberSet.add(i));
            }
          });
          bridgeMembers.value = bridgeMemberSet;
        } catch (e) {
          console.error('Failed to load bridge members:', e);
          bridgeMembers.value = new Set();
        }
        
        // Load VRF options
        try {
          const vrfRes = await configApi.get('vrf');
          vrfOptions.value = Object.keys(vrfRes.data?.name || vrfRes.data || {}).filter(name => typeof (vrfRes.data?.name || vrfRes.data)[name] === 'object');
        } catch (e) {
          console.error('Failed to load VRF options:', e);
        }
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    // Open modal
    function openModal(index = -1) {
      if (index >= 0) {
        editingBond.value = bondToForm(bonds.value[index]);
        isEditMode.value = true;
      } else {
        editingBond.value = getDefaultForm();
        isEditMode.value = false;
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    // Save
    async function save() {
      if (!editingBond.value) return;
      const b = editingBond.value;
      const name = b.name;
      if (!name) {
        showError(t('interface.bonding.nameRequired'));
        return;
      }

      const commands = [];
      const deleteCmd = `delete interfaces bonding ${name}`;

      // Build commands from form
      if (b.description) commands.push(`set interfaces bonding ${name} description "${b.description}"`);
      if (b.mac) commands.push(`set interfaces bonding ${name} mac ${b.mac}`);
      if (b.mode) commands.push(`set interfaces bonding ${name} mode ${b.mode}`);
      if (b.hash_policy) commands.push(`set interfaces bonding ${name} hash-policy ${b.hash_policy}`);
      if (b.lacp_rate) commands.push(`set interfaces bonding ${name} lacp-rate ${b.lacp_rate}`);
      if (b.mtu) commands.push(`set interfaces bonding ${name} mtu ${b.mtu}`);
      if (b.min_links) commands.push(`set interfaces bonding ${name} min-links ${b.min_links}`);
      if (b.mii_mon_interval !== undefined && b.mii_mon_interval !== null) commands.push(`set interfaces bonding ${name} mii-mon-interval ${b.mii_mon_interval}`);
      if (b.system_mac) commands.push(`set interfaces bonding ${name} system-mac ${b.system_mac}`);
      if (b.disable) commands.push(`set interfaces bonding ${name} disable`);
      if (b.disable_link_detect) commands.push(`set interfaces bonding ${name} disable-link-detect`);

      // Collect member interfaces from checkboxes
      const selectedMembers = interfaceNames.value.filter(iface => b[`member_${iface}`]);
      selectedMembers.forEach(m => commands.push(`set interfaces bonding ${name} member interface ${m}`));
      
      if (b.primary) commands.push(`set interfaces bonding ${name} primary ${b.primary}`);

      if (b.arp_interval !== undefined && b.arp_interval !== null) commands.push(`set interfaces bonding ${name} arp-monitor interval ${b.arp_interval}`);
      if (b.arp_targets) {
        b.arp_targets.split('\n').filter(t => t.trim()).forEach(t => commands.push(`set interfaces bonding ${name} arp-monitor target ${t.trim()}`));
      }

      if (b.dhcp_client_id) commands.push(`set interfaces bonding ${name} dhcp-options client-id ${b.dhcp_client_id}`);
      if (b.dhcp_default_route_distance) commands.push(`set interfaces bonding ${name} dhcp-options default-route-distance ${b.dhcp_default_route_distance}`);
      if (b.dhcp_host_name) commands.push(`set interfaces bonding ${name} dhcp-options host-name ${b.dhcp_host_name}`);
      if (b.dhcp_mtu) commands.push(`set interfaces bonding ${name} dhcp-options mtu`);
      if (b.dhcp_no_default_route) commands.push(`set interfaces bonding ${name} dhcp-options no-default-route`);
      if (b.dhcp_reject) {
        b.dhcp_reject.split('\n').filter(r => r.trim()).forEach(r => commands.push(`set interfaces bonding ${name} dhcp-options reject ${r.trim()}`));
      }
      if (b.dhcp_user_class) commands.push(`set interfaces bonding ${name} dhcp-options user-class ${b.dhcp_user_class}`);
      if (b.dhcp_vendor_class_id) commands.push(`set interfaces bonding ${name} dhcp-options vendor-class-id ${b.dhcp_vendor_class_id}`);

      if (b.dhcpv6_duid) commands.push(`set interfaces bonding ${name} dhcpv6-options duid ${b.dhcpv6_duid}`);
      if (b.dhcpv6_no_release) commands.push(`set interfaces bonding ${name} dhcpv6-options no-release`);
      if (b.dhcpv6_no_request_dns) commands.push(`set interfaces bonding ${name} dhcpv6-options no-request-dns`);
      if (b.dhcpv6_no_request_domain) commands.push(`set interfaces bonding ${name} dhcpv6-options no-request-domain-name`);
      if (b.dhcpv6_parameters_only) commands.push(`set interfaces bonding ${name} dhcpv6-options parameters-only`);
      if (b.dhcpv6_rapid_commit) commands.push(`set interfaces bonding ${name} dhcpv6-options rapid-commit`);
      if (b.dhcpv6_temporary) commands.push(`set interfaces bonding ${name} dhcpv6-options temporary`);

      if (b.eapol_ca_certificate) commands.push(`set interfaces bonding ${name} eapol ca-certificate ${b.eapol_ca_certificate}`);
      if (b.eapol_certificate) commands.push(`set interfaces bonding ${name} eapol certificate ${b.eapol_certificate}`);
      if (b.eapol_passphrase) commands.push(`set interfaces bonding ${name} eapol passphrase ${b.eapol_passphrase}`);

      if (b.evpn_es_df_pref) commands.push(`set interfaces bonding ${name} evpn es-df-pref ${b.evpn_es_df_pref}`);
      if (b.evpn_es_id) commands.push(`set interfaces bonding ${name} evpn es-id ${b.evpn_es_id}`);
      if (b.evpn_es_sys_mac) commands.push(`set interfaces bonding ${name} evpn es-sys-mac ${b.evpn_es_sys_mac}`);
      if (b.evpn_uplink) commands.push(`set interfaces bonding ${name} evpn uplink`);

      if (b.ip_adjust_mss) commands.push(`set interfaces bonding ${name} ip adjust-mss ${b.ip_adjust_mss}`);
      if (b.ip_arp_cache_timeout) commands.push(`set interfaces bonding ${name} ip arp-cache-timeout ${b.ip_arp_cache_timeout}`);
      if (b.ip_disable_arp_filter) commands.push(`set interfaces bonding ${name} ip disable-arp-filter`);
      if (b.ip_disable_forwarding) commands.push(`set interfaces bonding ${name} ip disable-forwarding`);
      if (b.ip_enable_arp_accept) commands.push(`set interfaces bonding ${name} ip enable-arp-accept`);
      if (b.ip_enable_arp_announce) commands.push(`set interfaces bonding ${name} ip enable-arp-announce`);
      if (b.ip_enable_arp_ignore) commands.push(`set interfaces bonding ${name} ip enable-arp-ignore`);
      if (b.ip_enable_directed_broadcast) commands.push(`set interfaces bonding ${name} ip enable-directed-broadcast`);
      if (b.ip_enable_proxy_arp) commands.push(`set interfaces bonding ${name} ip enable-proxy-arp`);
      if (b.ip_proxy_arp_pvlan) commands.push(`set interfaces bonding ${name} ip proxy-arp-pvlan`);
      if (b.ip_source_validation) commands.push(`set interfaces bonding ${name} ip source-validation ${b.ip_source_validation}`);

      if (b.ipv6_accept_dad) commands.push(`set interfaces bonding ${name} ipv6 accept-dad ${b.ipv6_accept_dad}`);
      if (b.ipv6_autoconf) commands.push(`set interfaces bonding ${name} ipv6 address autoconf`);
      if (b.ipv6_eui64) commands.push(`set interfaces bonding ${name} ipv6 address eui64 ${b.ipv6_eui64}`);
      if (b.ipv6_no_default_link_local) commands.push(`set interfaces bonding ${name} ipv6 address no-default-link-local`);
      if (b.ipv6_adjust_mss) commands.push(`set interfaces bonding ${name} ipv6 adjust-mss ${b.ipv6_adjust_mss}`);
      if (b.ipv6_base_reachable_time) commands.push(`set interfaces bonding ${name} ipv6 base-reachable-time ${b.ipv6_base_reachable_time}`);
      if (b.ipv6_disable_forwarding) commands.push(`set interfaces bonding ${name} ipv6 disable-forwarding`);
      if (b.ipv6_dup_addr_detect_transmits !== undefined && b.ipv6_dup_addr_detect_transmits !== null) commands.push(`set interfaces bonding ${name} ipv6 dup-addr-detect-transmits ${b.ipv6_dup_addr_detect_transmits}`);
      if (b.ipv6_source_validation) commands.push(`set interfaces bonding ${name} ipv6 source-validation ${b.ipv6_source_validation}`);

      if (b.mirror_egress) commands.push(`set interfaces bonding ${name} mirror egress ${b.mirror_egress}`);
      if (b.mirror_ingress) commands.push(`set interfaces bonding ${name} mirror ingress ${b.mirror_ingress}`);

      if (b.redirect) commands.push(`set interfaces bonding ${name} redirect ${b.redirect}`);
      if (b.vrf) commands.push(`set interfaces bonding ${name} vrf ${b.vrf}`);

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
    async function remove() {
      if (selected.value.length === 0) {
        showError(t('interface.bonding.selectInterfaceFirst'));
        return;
      }
      pendingDeleteNames.value = selected.value.map(b => b.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      const commands = pendingDeleteNames.value.map(name => `delete interfaces bonding ${name}`);
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
      onMenuRefresh(load);
    });

    return {
      loading, bonds, selected, modalVisible, editingBond, isEditMode, interfaceOptions, vrfOptions, activeTab,
      deleteModalVisible, pendingDeleteNames, confirmRemove,
      COLUMNS,
      basicSchema, membersSchema, arpMonitorSchema, dhcpSchema, dhcpv6Schema, eapolSchema, evpnSchema,
      ipSchema, ipv6Schema, mirrorSchema, otherSchema, commandText, modalTabs,
      openModal, save, remove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="bonds"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? bonds.indexOf(selected[0]) : -1)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
        rowKey="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'disable'">
            <span :class="record.disable ? 'badge badge-danger' : 'badge badge-success'">
              {{ record.disable ? t('common.yes') : t('common.no') }}
            </span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="openModal(bonds.indexOf(record))">{{ t('common.edit') }}</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">{{ t('common.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="isEditMode ? t('interface.bonding.modal.edit') : t('interface.bonding.modal.create')"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingBond">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingBond" :schema="basicSchema" />
            </template>
            <template #members>
              <ConfigForm v-model="editingBond" :schema="membersSchema" />
            </template>
            <template #arp>
              <ConfigForm v-model="editingBond" :schema="arpMonitorSchema" />
            </template>
            <template #dhcp>
              <ConfigForm v-model="editingBond" :schema="dhcpSchema" />
            </template>
            <template #dhcpv6>
              <ConfigForm v-model="editingBond" :schema="dhcpv6Schema" />
            </template>
            <template #eapol>
              <ConfigForm v-model="editingBond" :schema="eapolSchema" />
            </template>
            <template #evpn>
              <ConfigForm v-model="editingBond" :schema="evpnSchema" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingBond" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingBond" :schema="ipv6Schema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingBond" :schema="mirrorSchema" />
            </template>
            <template #other>
              <ConfigForm v-model="editingBond" :schema="otherSchema" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('common.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('interface.bonding.delete_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
