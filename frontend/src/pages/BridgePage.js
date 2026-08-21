import { defineComponent, ref, computed, onMounted, onUnmounted, inject } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';
import { buildDhcpv6BaseSchema, dhcpv6ConfigToForm, dhcpv6FormToConfig, dhcpv6ToCommands, DHCPV6_DEFAULTS } from '/src/utils/dhcpv6Common.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict - Strict Reverse Path Forwarding (RFC3704)' },
  { value: 'loose', label: 'loose - Loose Reverse Path Forwarding (RFC3704)' },
  { value: 'disable', label: 'disable - No source validation' },
];

function emptyMember() {
  return {
    interface: '',
    allowed_vlan: '',
    bpdu_guard: false,
    cost: '',
    native_vlan: '',
    priority: '',
    root_guard: false,
  };
}

export default defineComponent({
  name: 'BridgePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();

    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.bridge.name'), dataIndex: 'name', width: 100 },
      { key: 'description', title: t('interface.bridge.description'), dataIndex: 'description', width: 120 },
      { key: 'address', title: t('interface.tunnel.address'), dataIndex: 'address', width: 180 },
      { key: 'mac', title: t('interface.bridge.mac'), dataIndex: 'mac', width: 130 },
      { key: 'protocol', title: t('interface.bridge.protocol_label'), dataIndex: 'protocol', width: 80 },
      { key: 'members', title: t('interface.bridge.members'), dataIndex: 'members', width: 150 },
      { key: 'aging', title: t('interface.bridge.aging'), dataIndex: 'aging', width: 70 },
      { key: 'forwarding_delay', title: t('interface.bridge.forwarding_delay'), dataIndex: 'forwarding_delay', width: 80 },
      { key: 'hello_time', title: t('interface.bridge.hello_time'), dataIndex: 'hello_time', width: 70 },
      { key: 'max_age', title: t('interface.bridge.max_age'), dataIndex: 'max_age', width: 70 },
      { key: 'priority', title: t('interface.bridge.priority'), dataIndex: 'priority', width: 70 },
      { key: 'stp', title: t('interface.bridge.stp'), dataIndex: 'stp', width: 70 },
      { key: 'mtu', title: t('interface.bridge.mtu'), dataIndex: 'mtu', width: 70 },
      { key: 'disable', title: t('interface.bridge.disable'), dataIndex: 'disable', width: 70 },
      { key: 'actions', title: t('interface.bridge.actions'), dataIndex: 'actions', width: 120 },
    ]);
    const loading = ref(false);
    const bridges = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingBridge = ref(null);
    const isEditMode = ref(false);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const activeTab = ref('basic');

    // Member sub-table
    const memberSelected = ref([]);
    const memberModalVisible = ref(false);
    const editingMember = ref(null);
    const isMemberEditMode = ref(false);

    // Delete confirmation modal
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const acceptDadOptions = computed(() => [
      { value: '0', label: '0 - ' + t('ethernet.ipv6.accept_dad_option_0') },
      { value: '1', label: '1 - ' + t('ethernet.ipv6.accept_dad_option_1') },
      { value: '2', label: '2 - ' + t('ethernet.ipv6.accept_dad_option_2') },
    ]);

    // Member columns for DataTable
    const memberColumns = computed(() => [
      { key: 'interface', title: t('interface.bridge.member_interface'), width: 120 },
      { key: 'allowed_vlan', title: t('interface.bridge.member_allowed_vlan'), width: 100 },
      { key: 'bpdu_guard', title: t('interface.bridge.member_bpdu_guard'), width: 80 },
      { key: 'cost', title: t('interface.bridge.member_cost'), width: 80 },
      { key: 'native_vlan', title: t('interface.bridge.member_native_vlan'), width: 100 },
      { key: 'priority', title: t('interface.bridge.member_priority'), width: 80 },
      { key: 'root_guard', title: t('interface.bridge.member_root_guard'), width: 80 },
    ]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.bridge.name'), type: 'text', required: true, placeholder: t('interface.bridge.name_placeholder'), help: t('interface.bridge.name_help'), disabled: isEditMode.value },
      { key: 'description', title: t('interface.bridge.description'), type: 'text', placeholder: t('interface.bridge.description_placeholder') },
      { key: 'address', title: t('interface.tunnel.address'), type: 'textarea', placeholder: t('interface.tunnel.address_placeholder'), help: t('interface.tunnel.address_help') },
      { key: 'mac', title: t('interface.bridge.mac'), type: 'text', placeholder: t('interface.bridge.mac_placeholder'), help: t('interface.bridge.mac_help') },
      { key: 'aging', title: t('interface.bridge.aging'), type: 'number', min: 0, max: 1000000, placeholder: t('interface.bridge.aging_placeholder'), help: t('interface.bridge.aging_help') },
      { key: 'forwarding_delay', title: t('interface.bridge.forwarding_delay'), type: 'number', min: 0, max: 30, placeholder: t('interface.bridge.forwarding_delay_placeholder'), help: t('interface.bridge.forwarding_delay_help') },
      { key: 'hello_time', title: t('interface.bridge.hello_time'), type: 'number', min: 1, max: 10, placeholder: t('interface.bridge.hello_time_placeholder'), help: t('interface.bridge.hello_time_help') },
      { key: 'max_age', title: t('interface.bridge.max_age'), type: 'number', min: 6, max: 40, placeholder: t('interface.bridge.max_age_placeholder'), help: t('interface.bridge.max_age_help') },
      { key: 'priority', title: t('interface.bridge.priority'), type: 'number', min: 0, max: 61440, step: 4096, placeholder: t('interface.bridge.priority_placeholder'), help: t('interface.bridge.priority_help') },
      { key: 'protocol', title: t('interface.bridge.protocol_label'), type: 'select', options: [
        { value: '802.1q', label: t('interface.bridge.protocol.802.1q') },
        { value: '802.1ad', label: t('interface.bridge.protocol.802.1ad') },
      ], help: t('interface.bridge.protocol_help') },
      { key: 'stp', title: t('interface.bridge.enable_stp'), type: 'checkbox', help: t('interface.bridge.enable_stp_help') },
      { key: 'enable_vlan', title: t('interface.bridge.enable_vlan'), type: 'checkbox', help: t('interface.bridge.enable_vlan_help') },
      { key: 'mtu', title: t('interface.bridge.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.bridge.mtu_placeholder'), help: t('interface.bridge.mtu_help') },
      { key: 'disable', title: t('interface.bridge.disable_interface'), type: 'checkbox', help: t('interface.bridge.disable_interface_help') },
      { key: 'disable_link_detect', title: t('interface.bridge.disable_link_detect'), type: 'checkbox', help: t('interface.bridge.disable_link_detect_help') },
    ]);

    const bondingMembers = ref(new Set());

    const availableMemberOptions = computed(() => {
      // Collect all interfaces that are already members of any bridge
      const allUsed = new Set();
      bridges.value.forEach(b => {
        if (b.members) {
          const m = b._raw?.member?.interface;
          if (m) {
            if (Array.isArray(m)) m.forEach(i => allUsed.add(i));
            else Object.keys(m).forEach(i => allUsed.add(i));
          }
        }
      });
      // Also exclude interfaces that are members of any bonding interface
      bondingMembers.value.forEach(i => allUsed.add(i));
      
      const existing = new Set((editingBridge.value?.members || []).map(m => m.interface));
      // When editing, keep the current member's interface in the list
      if (editingMember.value?.interface) {
        existing.delete(editingMember.value.interface);
      }
      return interfaceOptions.value.filter(opt => !existing.has(opt.value) && !allUsed.has(opt.value));
    });

    const memberSchema = computed(() => {
      const vlanEnabled = editingBridge.value?.enable_vlan;
      const fields = [
        { key: 'interface', title: t('interface.bridge.member_interface'), type: 'select', options: availableMemberOptions.value, required: true, placeholder: t('interface.bridge.member_interface_placeholder'), help: t('interface.bridge.member_interface_help'), disabled: isMemberEditMode.value },
        { key: 'bpdu_guard', title: t('interface.bridge.member_bpdu_guard'), type: 'checkbox', help: t('interface.bridge.member_bpdu_guard_help') },
        { key: 'cost', title: t('interface.bridge.member_cost'), type: 'number', min: 1, max: 65535, placeholder: t('interface.bridge.member_cost_placeholder'), help: t('interface.bridge.member_cost_help') },
        { key: 'priority', title: t('interface.bridge.member_priority'), type: 'number', min: 0, max: 63, placeholder: t('interface.bridge.member_priority_placeholder'), help: t('interface.bridge.member_priority_help') },
        { key: 'root_guard', title: t('interface.bridge.member_root_guard'), type: 'checkbox', help: t('interface.bridge.member_root_guard_help') },
      ];
      if (vlanEnabled) {
        fields.splice(1, 0,
          { key: 'allowed_vlan', title: t('interface.bridge.member_allowed_vlan'), type: 'text', placeholder: t('interface.bridge.member_allowed_vlan_placeholder'), help: t('interface.bridge.member_allowed_vlan_help') },
        );
        fields.splice(3, 0,
          { key: 'native_vlan', title: t('interface.bridge.member_native_vlan'), type: 'number', min: 1, max: 4094, placeholder: t('interface.bridge.member_native_vlan_placeholder'), help: t('interface.bridge.member_native_vlan_help') },
        );
      }
      return fields;
    });

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

    const dhcpv6Schema = computed(() => buildDhcpv6BaseSchema('interface.bridge.dhcpv6', t, {
      withPd: true,
      pdTitle: 'interface.bridge.dhcpv6.pd_instances',
      pdPlaceholder: 'interface.bridge.dhcpv6.pd_instances_placeholder',
      pdHelp: 'interface.bridge.dhcpv6.pd_instances_help',
    }));

    const igmpSchema = computed(() => [
      { key: 'igmp_enable', title: t('interface.bridge.igmp.enable'), type: 'checkbox', help: t('interface.bridge.igmp.enable_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('interface.bridge.ip.adjust_mss_label'), type: 'select', options: [
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
      { key: 'ipv6_accept_dad', title: t('interface.bridge.ipv6.accept_dad'), type: 'select', options: acceptDadOptions.value, help: t('interface.bridge.ipv6.accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('interface.bridge.ipv6.autoconf'), type: 'checkbox', help: t('interface.bridge.ipv6.autoconf_help') },
      { key: 'ipv6_eui64', title: t('interface.bridge.ipv6.eui64'), type: 'text', placeholder: t('interface.bridge.ipv6.eui64_placeholder'), help: t('interface.bridge.ipv6.eui64_help') },
      { key: 'ipv6_no_default_link_local', title: t('interface.bridge.ipv6.no_default_link_local'), type: 'checkbox', help: t('interface.bridge.ipv6.no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('interface.bridge.ipv6.adjust_mss'), type: 'select', options: [
        { value: 'clamp-mss-to-pmtu', label: t('interface.bridge.ipv6.adjust_mss_clamp_mss') },
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
      { key: 'vrf', title: t('interface.bridge.other.vrf'), type: 'select', options: ['', ...vrfOptions.value], placeholder: t('interface.bridge.other.vrf_placeholder'), help: t('interface.bridge.other.vrf_help') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingBridge.value) return '';
      const b = editingBridge.value;
      const name = b.name || 'brN';
      const lines = [];

      if (b.description) lines.push(`set interfaces bridge ${name} description "${b.description}"`);
      if (b.address) {
        b.address.split('\n').map(a => a.trim()).filter(Boolean).forEach(a => {
          lines.push(`set interfaces bridge ${name} address ${a}`);
        });
      }
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
        b.members.forEach(m => {
          const ifaceName = m.interface;
          if (!ifaceName) return;
          if (m.allowed_vlan) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} allowed-vlan ${m.allowed_vlan}`);
          if (m.bpdu_guard) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} bpdu-guard`);
          if (m.cost) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} cost ${m.cost}`);
          if (m.native_vlan) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} native-vlan ${m.native_vlan}`);
          if (m.priority) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} priority ${m.priority}`);
          if (m.root_guard) lines.push(`set interfaces bridge ${name} member interface ${ifaceName} root-guard`);
        });
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
      lines.push(...dhcpv6ToCommands(b, 'bridge', name));

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
      { key: 'members', title: t('interface.bridge.tab.members') },
      { key: 'dhcp', title: t('interface.bridge.tab.dhcp') },
      { key: 'dhcpv6', title: t('interface.bridge.tab.dhcpv6') },
      { key: 'igmp', title: t('interface.bridge.tab.igmp') },
      { key: 'ip', title: t('interface.bridge.tab.ipv4_params') },
      { key: 'ipv6', title: t('interface.bridge.tab.ipv6_params') },
      { key: 'mirror', title: t('interface.bridge.tab.traffic_mirror') },
      { key: 'other', title: t('interface.bridge.tab.other') },
    ]);

    // Default form - no default values so formToConfig only sends changed fields
    function getDefaultForm() {
      return {
        name: '',
        description: '',
        address: '',
        mac: '',
        aging: '',
        forwarding_delay: '',
        hello_time: '',
        max_age: '',
        priority: '',
        protocol: '',
        members: [],
        stp: false,
        enable_vlan: false,
        mtu: '',
        disable: false,
        disable_link_detect: false,
        dhcp_client_id: '',
        dhcp_default_route_distance: '',
        dhcp_host_name: '',
        dhcp_mtu: false,
        dhcp_no_default_route: false,
        dhcp_reject: '',
        dhcp_user_class: '',
        dhcp_vendor_class_id: '',
        ...DHCPV6_DEFAULTS,
        dhcpv6_pd_instances: '',
        igmp_enable: false,
        ip_adjust_mss: '',
        ip_arp_cache_timeout: '',
        ip_disable_arp_filter: false,
        ip_disable_forwarding: false,
        ip_enable_arp_accept: false,
        ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false,
        ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false,
        ip_proxy_arp_pvlan: false,
        ip_source_validation: '',
        ipv6_accept_dad: '',
        ipv6_autoconf: false,
        ipv6_eui64: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '',
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '',
        ipv6_source_validation: '',
        mirror_egress: '',
        mirror_ingress: '',
        redirect: '',
        vrf: '',
      };
    }

    // Convert config to form - only set values that exist in config
    function bridgeToForm(cfg, name) {
      const form = getDefaultForm();
      form.name = name || cfg.name || '';
      form.description = cfg.description || '';
      if (Array.isArray(cfg.address)) form.address = cfg.address.join('\n');
      else if (cfg.address) form.address = String(cfg.address);
      form.mac = cfg.mac || '';
      if (cfg.aging !== undefined) form.aging = cfg.aging;
      if (cfg['forwarding-delay'] !== undefined) form.forwarding_delay = cfg['forwarding-delay'];
      if (cfg['hello-time'] !== undefined) form.hello_time = cfg['hello-time'];
      if (cfg['max-age'] !== undefined) form.max_age = cfg['max-age'];
      if (cfg.priority !== undefined) form.priority = cfg.priority;
      if (cfg.protocol) form.protocol = cfg.protocol;
      if (cfg.mtu !== undefined) form.mtu = cfg.mtu;
      form.stp = !!cfg.stp;
      form.enable_vlan = !!cfg['enable-vlan'];
      form.disable = !!cfg.disable;
      form.disable_link_detect = !!cfg['disable-link-detect'];

      // Members - convert from nested config to table format
      const rawMembers = cfg.member?.interface;
      let memberList = [];
      if (Array.isArray(rawMembers)) {
        memberList = rawMembers;
      } else if (rawMembers && typeof rawMembers === 'object') {
        memberList = Object.entries(rawMembers).map(([name, config]) => ({ [name]: config }));
      } else if (typeof rawMembers === 'string') {
        memberList = [rawMembers];
      }
      form.members = memberList.map(iface => {
        const ifaceName = typeof iface === 'string' ? iface : Object.keys(iface)[0];
        const ifaceConfig = typeof iface === 'object' ? iface[ifaceName] || {} : {};
        return {
          interface: ifaceName,
          allowed_vlan: ifaceConfig['allowed-vlan'] || '',
          bpdu_guard: !!ifaceConfig['bpdu-guard'],
          cost: ifaceConfig.cost || '',
          native_vlan: ifaceConfig['native-vlan'] || '',
          priority: ifaceConfig.priority || '',
          root_guard: !!ifaceConfig['root-guard'],
        };
      });

      // DHCP
      if (cfg['dhcp-options']) {
        form.dhcp_client_id = cfg['dhcp-options']['client-id'] || '';
        if (cfg['dhcp-options']['default-route-distance'] !== undefined) form.dhcp_default_route_distance = cfg['dhcp-options']['default-route-distance'];
        form.dhcp_host_name = cfg['dhcp-options']['host-name'] || '';
        form.dhcp_mtu = !!cfg['dhcp-options'].mtu;
        form.dhcp_no_default_route = !!cfg['dhcp-options']['no-default-route'];
        form.dhcp_reject = (cfg['dhcp-options'].reject || []).join('\n');
        form.dhcp_user_class = cfg['dhcp-options']['user-class'] || '';
        form.dhcp_vendor_class_id = cfg['dhcp-options']['vendor-class-id'] || '';
      }

      // DHCPv6
      Object.assign(form, dhcpv6ConfigToForm(cfg['dhcpv6-options']));
      form.dhcpv6_pd_instances = formatJson(cfg['dhcpv6-options']?.pd || {});

      // IGMP
      if (cfg.igmp) {
        form.igmp_enable = !!cfg.igmp.enable;
      }

      // IP
      if (cfg.ip) {
        form.ip_adjust_mss = cfg.ip['adjust-mss'] || '';
        if (cfg.ip['arp-cache-timeout'] !== undefined) form.ip_arp_cache_timeout = cfg.ip['arp-cache-timeout'];
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
        if (cfg.ipv6['accept-dad'] !== undefined) form.ipv6_accept_dad = cfg.ipv6['accept-dad'];
        form.ipv6_autoconf = cfg.ipv6.address === 'autoconf' || !!cfg.ipv6.address?.autoconf;
        form.ipv6_eui64 = typeof cfg.ipv6.address === 'object' && cfg.ipv6.address.eui64 ? Object.keys(cfg.ipv6.address.eui64)[0] || '' : '';
        form.ipv6_no_default_link_local = cfg.ipv6.address === 'no-default-link-local' || !!cfg.ipv6.address?.['no-default-link-local'];
        form.ipv6_adjust_mss = cfg.ipv6['adjust-mss'] || '';
        if (cfg.ipv6['base-reachable-time'] !== undefined) form.ipv6_base_reachable_time = cfg.ipv6['base-reachable-time'];
        form.ipv6_disable_forwarding = !!cfg.ipv6['disable-forwarding'];
        if (cfg.ipv6['dup-addr-detect-transmits'] !== undefined) form.ipv6_dup_addr_detect_transmits = cfg.ipv6['dup-addr-detect-transmits'];
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

    // Convert form to config object
    function formToConfig(form) {
      const value = {};

      if (form.description) value.description = form.description;
      if (form.address) {
        const addresses = String(form.address).split('\n').map(a => a.trim()).filter(Boolean);
        if (addresses.length) value.address = addresses;
      }
      if (form.mac) value.mac = form.mac;
      if (form.aging !== undefined && form.aging !== null && form.aging !== '') value.aging = String(form.aging);
      if (form.forwarding_delay !== undefined && form.forwarding_delay !== null && form.forwarding_delay !== '') value['forwarding-delay'] = String(form.forwarding_delay);
      if (form.hello_time !== undefined && form.hello_time !== null && form.hello_time !== '') value['hello-time'] = String(form.hello_time);
      if (form.max_age !== undefined && form.max_age !== null && form.max_age !== '') value['max-age'] = String(form.max_age);
      if (form.priority !== undefined && form.priority !== null && form.priority !== '') value.priority = String(form.priority);
      if (form.protocol) value.protocol = form.protocol;
      if (form.mtu !== undefined && form.mtu !== null && form.mtu !== '') value.mtu = String(form.mtu);
      if (form.stp) value.stp = '';
      if (form.enable_vlan) value['enable-vlan'] = '';
      if (form.disable) value.disable = '';
      if (form.disable_link_detect) value['disable-link-detect'] = '';

      // Members
      if (form.members && form.members.length > 0) {
        const memberInterfaces = {};
        form.members.forEach(m => {
          const ifaceName = m.interface;
          if (!ifaceName) return;
          const ifaceCfg = {};
          if (m.allowed_vlan) ifaceCfg['allowed-vlan'] = m.allowed_vlan;
          if (m.bpdu_guard) ifaceCfg['bpdu-guard'] = '';
          if (m.cost) ifaceCfg.cost = String(m.cost);
          if (m.native_vlan) ifaceCfg['native-vlan'] = String(m.native_vlan);
          if (m.priority) ifaceCfg.priority = String(m.priority);
          if (m.root_guard) ifaceCfg['root-guard'] = '';
          memberInterfaces[ifaceName] = ifaceCfg;
        });
        if (Object.keys(memberInterfaces).length) {
          value.member = { interface: memberInterfaces };
        }
      }

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp['client-id'] = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp['default-route-distance'] = String(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp['host-name'] = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = '';
      if (form.dhcp_no_default_route) dhcp['no-default-route'] = '';
      if (form.dhcp_reject) {
        const rejects = form.dhcp_reject.split('\n').filter(r => r.trim());
        if (rejects.length) dhcp.reject = rejects;
      }
      if (form.dhcp_user_class) dhcp['user-class'] = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp['vendor-class-id'] = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) value['dhcp-options'] = dhcp;

      // DHCPv6
      const dhcpv6 = dhcpv6FormToConfig(form) || {};
      if (form.dhcpv6_pd_instances) {
        const pd = safeJsonParse(form.dhcpv6_pd_instances);
        if (Object.keys(pd).length) dhcpv6.pd = pd;
      }
      if (Object.keys(dhcpv6).length) value['dhcpv6-options'] = dhcpv6;

      // IGMP
      if (form.igmp_enable) value.igmp = { enable: '' };

      // IP
      const ip = {};
      if (form.ip_adjust_mss) ip['adjust-mss'] = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout !== undefined && form.ip_arp_cache_timeout !== null && form.ip_arp_cache_timeout !== '') ip['arp-cache-timeout'] = String(form.ip_arp_cache_timeout);
      if (form.ip_disable_arp_filter) ip['disable-arp-filter'] = '';
      if (form.ip_disable_forwarding) ip['disable-forwarding'] = '';
      if (form.ip_enable_arp_accept) ip['enable-arp-accept'] = '';
      if (form.ip_enable_arp_announce) ip['enable-arp-announce'] = '';
      if (form.ip_enable_arp_ignore) ip['enable-arp-ignore'] = '';
      if (form.ip_enable_directed_broadcast) ip['enable-directed-broadcast'] = '';
      if (form.ip_enable_proxy_arp) ip['enable-proxy-arp'] = '';
      if (form.ip_proxy_arp_pvlan) ip['proxy-arp-pvlan'] = '';
      if (form.ip_source_validation) ip['source-validation'] = form.ip_source_validation;
      if (Object.keys(ip).length) value.ip = ip;

      // IPv6
      const ipv6 = {};
      if (form.ipv6_accept_dad) ipv6['accept-dad'] = String(form.ipv6_accept_dad);
      const ipv6Addr = {};
      if (form.ipv6_autoconf) ipv6Addr.autoconf = '';
      if (form.ipv6_eui64) ipv6Addr.eui64 = form.ipv6_eui64;
      if (form.ipv6_no_default_link_local) ipv6Addr['no-default-link-local'] = '';
      if (Object.keys(ipv6Addr).length) ipv6.address = ipv6Addr;
      if (form.ipv6_adjust_mss) ipv6['adjust-mss'] = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6['base-reachable-time'] = String(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6['disable-forwarding'] = '';
      if (form.ipv6_dup_addr_detect_transmits !== undefined && form.ipv6_dup_addr_detect_transmits !== null && form.ipv6_dup_addr_detect_transmits !== '') {
        ipv6['dup-addr-detect-transmits'] = String(form.ipv6_dup_addr_detect_transmits);
      }
      if (form.ipv6_source_validation) ipv6['source-validation'] = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) value.ipv6 = ipv6;

      // Mirror
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) value.mirror = mirror;

      // Other
      if (form.redirect) value.redirect = form.redirect;
      if (form.vrf) value.vrf = form.vrf;

      return value;
    }

    // Load data
    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('interfaces bridge', false);
        bridges.value = Object.entries(res.data || {}).map(([name, cfg]) => ({
          name,
          description: cfg.description || '',
          address: Array.isArray(cfg.address) ? cfg.address.join(', ') : (cfg.address || ''),
          mac: cfg.mac || '',
          protocol: cfg.protocol || '',
          members: (() => {
            const m = cfg.member?.interface;
            if (!m) return '';
            if (Array.isArray(m)) return m.join(', ');
            return Object.keys(m).join(', ');
          })(),
          aging: cfg.aging || 300,
          forwarding_delay: cfg['forwarding-delay'] || 14,
          hello_time: cfg['hello-time'] || 2,
          max_age: cfg['max-age'] || 20,
          priority: cfg.priority || 32768,
          stp: !!cfg.stp,
          mtu: cfg.mtu || 1500,
          disable: !!cfg.disable,
          _raw: cfg,
        }));

        // Load interface options - exclude interfaces with address configuration
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces
          .filter(iface => !iface.address_mode) // Exclude interfaces with any address mode
          .map(iface => ({
            value: iface.name || iface,
            label: iface.name || iface,
          }));

        // Load bonding members to exclude them from bridge member options
        try {
          const bondRes = await configApi.get('interfaces bonding');
          const bondMembers = new Set();
          Object.values(bondRes.data || {}).forEach(cfg => {
            const m = cfg.member?.interface;
            if (m) {
              if (Array.isArray(m)) m.forEach(i => bondMembers.add(i));
              else Object.keys(m).forEach(i => bondMembers.add(i));
            }
          });
          bondingMembers.value = bondMembers;
        } catch (e) {
          console.error('Failed to load bonding members:', e);
          bondingMembers.value = new Set();
        }

        // Load VRF options
        try {
          const vrfRes = await configApi.get('vrf');
          const raw = vrfRes.data || {};
          const nameData = raw.name || raw;
          vrfOptions.value = Object.keys(nameData).filter(name => typeof nameData[name] === 'object');
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
        editingBridge.value = bridgeToForm(bridges.value[index]._raw, bridges.value[index].name);
        isEditMode.value = true;
      } else {
        editingBridge.value = getDefaultForm();
        isEditMode.value = false;
      }
      activeTab.value = 'basic';
      memberSelected.value = [];
      modalVisible.value = true;
    }

    function openModalByRow(row) {
      if (!row) {
        openModal(-1);
        return;
      }
      const index = bridges.value.findIndex(b => b.name === row.name);
      openModal(index);
    }

    // Member CRUD
    function createMember() {
      editingMember.value = emptyMember();
      isMemberEditMode.value = false;
      memberModalVisible.value = true;
    }

    function editMember() {
      if (!memberSelected.value.length) {
        showError(t('interface.bridge.selectMemberFirst'));
        return;
      }
      const row = editingBridge.value.members.find(m => m.interface === memberSelected.value[0]);
      if (!row) return;
      editingMember.value = JSON.parse(JSON.stringify(row));
      isMemberEditMode.value = true;
      memberModalVisible.value = true;
    }

    function removeMember() {
      if (!memberSelected.value.length) {
        showError(t('interface.bridge.selectMemberFirst'));
        return;
      }
      editingBridge.value.members = editingBridge.value.members.filter(m => !memberSelected.value.includes(m.interface));
      memberSelected.value = [];
    }

    function saveMember() {
      if (!editingMember.value?.interface) {
        showError(t('interface.bridge.selectInterface'));
        return;
      }
      const existing = editingBridge.value.members.find(m => m.interface === editingMember.value.interface);
      if (existing) {
        Object.assign(existing, editingMember.value);
      } else {
        editingBridge.value.members.push(JSON.parse(JSON.stringify(editingMember.value)));
      }
      memberModalVisible.value = false;
      memberSelected.value = [editingMember.value.interface];
    }

    // Save
    async function save() {
      const name = editingBridge.value?.name;
      if (!name) return showError({ message: t('interface.bridge.nameRequired') });
      
      // Check for duplicate name (only when creating new bridge)
      if (!isEditMode.value && bridges.value.some(b => b.name === name)) {
        return showError({ message: `桥接接口 "${name}" 已存在，请使用其他名称` });
      }
      
      try {
        // Delete IP addresses from member interfaces (bridge members cannot have IP)
        const b = editingBridge.value;
        if (b.members && b.members.length > 0) {
          for (const m of b.members) {
            const iface = m.interface;
            if (!iface) continue;
            // Build correct config path based on interface type
            // eth1 -> interfaces ethernet eth1
            // eth1.10 -> interfaces ethernet eth1 vif 10
            // eth1.20.30 -> interfaces ethernet eth1 vif-s 20 vif-c 30
            let basePath;
            const dotCount = (iface.match(/\./g) || []).length;
            if (dotCount === 0) {
              basePath = `interfaces ethernet ${iface}`;
            } else if (dotCount === 1) {
              const parts = iface.split('.');
              basePath = `interfaces ethernet ${parts[0]} vif ${parts[1]}`;
            } else if (dotCount === 2) {
              const parts = iface.split('.');
              basePath = `interfaces ethernet ${parts[0]} vif-s ${parts[1]} vif-c ${parts[2]}`;
            } else {
              continue;
            }
            try {
              await configStore.deleteConfig(`${basePath} address`);
            } catch (e) {
              // Ignore if path doesn't exist
            }
            try {
              await configStore.deleteConfig(`${basePath} ipv6 address`);
            } catch (e) {
              // Ignore if path doesn't exist
            }
          }
        }

        const value = formToConfig(editingBridge.value);
        const configPath = `interfaces bridge ${name}`;
        await configStore.setConfig(configPath, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // Delete
    function remove() {
      if (selected.value.length === 0) {
        showError(t('interface.bridge.selectInterfaceFirst'));
        return;
      }
      pendingDeleteNames.value = selected.value.map(k => bridges.value.find(b => b.name === k)?.name).filter(Boolean);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const n of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces bridge ${n}`);
        }
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
      window.addEventListener('config-committed', load);
    });

    onUnmounted(() => {
      window.removeEventListener('config-committed', load);
    });

    return {
      loading, bridges, selected, modalVisible, editingBridge, isEditMode, interfaceOptions, vrfOptions, activeTab,
      memberSelected, memberModalVisible, editingMember, isMemberEditMode, memberColumns, memberSchema,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, igmpSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, openModalByRow, save, remove, confirmRemove, load, t,
      createMember, editMember, removeMember, saveMember,
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
        @edit="openModalByRow($event)"
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
            <a @click="openModal(bridges.findIndex(b => b.name === record.name))">{{ t('common.edit') }}</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">{{ t('common.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="isEditMode ? t('interface.bridge.modal.edit') : t('interface.bridge.modal.create')"
        width="900px"
        @confirm="save"
      >
        <div v-if="editingBridge">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingBridge" :schema="basicSchema" />
            </template>
            <template #members>
              <div style="padding:8px 0;">
                <div class="toolbar toolbar-compact">
                  <div class="toolbar-left">
                    <ToolbarButton icon="create" @click="createMember">{{ t('interface.bridge.add_member') }}</ToolbarButton>
                    <ToolbarButton icon="edit" @click="editMember" :disabled="!memberSelected.length || memberSelected.length > 1">{{ t('common.edit') }}</ToolbarButton>
                    <ToolbarButton icon="delete" @click="removeMember" :disabled="!memberSelected.length">{{ t('common.delete') }}</ToolbarButton>
                  </div>
                </div>
                <DataTable :columns="memberColumns" :data="editingBridge.members || []"
                           @selection-change="memberSelected = $event" :selectable="true" :externalToolbar="true" rowKey="interface">
                  <template #bpdu_guard="{ row }">{{ row.bpdu_guard ? t('common.yes') : '' }}</template>
                  <template #root_guard="{ row }">{{ row.root_guard ? t('common.yes') : '' }}</template>
                </DataTable>
              </div>
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

      <!-- Member edit modal -->
      <DraggableModal v-model:visible="memberModalVisible" :title="isMemberEditMode ? t('interface.bridge.modal.edit_member') : t('interface.bridge.modal.create_member')" width="600px" @confirm="saveMember" modal-class="on-top">
        <ConfigForm v-if="editingMember" v-model="editingMember" :schema="memberSchema" />
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
