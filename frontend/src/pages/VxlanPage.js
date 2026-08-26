import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { showError as _showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

const SOURCE_VALIDATION_OPTIONS = [
  { value: '', label: '' },
  { value: 'strict', label: 'strict' },
  { value: 'loose', label: 'loose' },
  { value: 'disable', label: 'disable' },
];

export default defineComponent({
  name: 'VxlanPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.vxlan.name'), width: 120 },
      { key: 'description', title: t('interface.vxlan.description'), width: 160 },
      { key: 'vni', title: t('interface.vxlan.vni'), width: 100 },
      { key: 'group', title: t('interface.vxlan.group'), width: 140 },
      { key: 'remote', title: t('interface.vxlan.remote'), width: 140 },
      { key: 'source_address', title: t('interface.vxlan.source_address'), width: 140 },
      { key: 'port', title: t('interface.vxlan.port'), width: 80 },
      { key: 'mtu', title: t('interface.vxlan.mtu'), width: 80 },
      { key: 'disable', title: t('interface.vxlan.disable'), width: 80 },
      { key: 'actions', title: t('interface.vxlan.actions'), width: 100 },
    ]);
    const loading = ref(false);
    const vxlans = ref([]);
    const modalVisible = ref(false);
    const editingVxlan = ref(null);
    const isEditMode = ref(false);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVxlan = ref([]);

    // Delete confirmation modals
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const vlanDeleteModalVisible = ref(false);
    const pendingDeleteVlanIndex = ref(-1);

    // VLAN-to-VNI management
    const vlanToVni = ref([]);
    const editingVlanIndex = ref(-1);
    const vlanModalVisible = ref(false);
    const vlanForm = ref(null);
    const selectedVlans = ref([]);
    const acceptDadOptions = computed(() => [
      { value: '', label: '' },
      { value: '0', label: '0 - ' + t('ethernet.ipv6.accept_dad_option_0') },
      { value: '1', label: '1 - ' + t('ethernet.ipv6.accept_dad_option_1') },
      { value: '2', label: '2 - ' + t('ethernet.ipv6.accept_dad_option_2') },
    ]);

    const vlanColumns = [
      { key: 'vlan', title: t('interface.vxlan.vlan_id'), width: 120 },
      { key: 'vni', title: t('interface.vxlan.vni'), width: 120 },
      { key: 'description', title: t('interface.vxlan.vlan_description'), width: 200 },
      { key: 'actions', title: t('interface.vxlan.actions'), width: 100 },
    ];

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.vxlan.name'), type: 'text', required: true, placeholder: t('interface.vxlan.name_placeholder'), help: t('interface.vxlan.name_help'), disabled: isEditMode.value },
      { key: 'description', title: t('interface.vxlan.description'), type: 'text', placeholder: t('interface.vxlan.description_placeholder') },
      { key: 'vni', title: t('interface.vxlan.vni'), type: 'number', min: 0, max: 16777214, placeholder: t('interface.vxlan.vni_placeholder'), help: t('interface.vxlan.vni_help') },
      { key: 'group', title: t('interface.vxlan.group'), type: 'text', placeholder: t('interface.vxlan.group_placeholder'), help: t('interface.vxlan.group_help') },
      { key: 'remote', title: t('interface.vxlan.remote'), type: 'text', placeholder: t('interface.vxlan.remote_placeholder'), help: t('interface.vxlan.remote_help') },
      { key: 'source_address', title: t('interface.vxlan.source_address'), type: 'text', placeholder: t('interface.vxlan.source_address_placeholder'), help: t('interface.vxlan.source_address_help') },
      { key: 'source_interface', title: t('interface.vxlan.source_interface'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.vxlan.source_interface_placeholder'), help: t('interface.vxlan.source_interface_help') },
      { key: 'port', title: t('interface.vxlan.port'), type: 'number', min: 1, max: 65535, placeholder: t('interface.vxlan.port_placeholder'), help: t('interface.vxlan.port_help') },
      { key: 'mac', title: t('interface.vxlan.mac'), type: 'text', placeholder: t('interface.vxlan.mac_placeholder'), help: t('interface.vxlan.mac_help') },
      { key: 'gpe', title: t('interface.vxlan.gpe'), type: 'checkbox', help: t('interface.vxlan.gpe_help') },
      { key: 'mtu', title: t('interface.vxlan.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.vxlan.mtu_placeholder'), help: t('interface.vxlan.mtu_help') },
      { key: 'disable', title: t('interface.vxlan.disable'), type: 'checkbox', help: t('interface.vxlan.disable_help') },
    ]);

    const parametersSchema = computed(() => [
      {
        key: 'parameters_ip', title: t('interface.vxlan.ipv4_parameters'), type: 'group', children: [
          { key: 'ignore_df', title: t('interface.vxlan.param_ignore_df'), type: 'checkbox', help: t('interface.vxlan.param_ignore_df_help') },
          { key: 'key', title: t('interface.vxlan.param_key'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('interface.vxlan.param_key_help') },
          { key: 'no_pmtu_discovery', title: t('interface.vxlan.param_no_pmtu_discovery'), type: 'checkbox', help: t('interface.vxlan.param_no_pmtu_discovery_help') },
          { key: 'tos', title: t('interface.vxlan.param_tos'), type: 'number', min: 0, max: 99, placeholder: '0-99', help: t('interface.vxlan.param_tos_help') },
          { key: 'ttl', title: t('interface.vxlan.param_ttl'), type: 'number', min: 0, max: 255, placeholder: '0-255', help: t('interface.vxlan.param_ttl_help') },
        ]
      },
      {
        key: 'parameters_ipv6', title: t('interface.vxlan.ipv6_parameters'), type: 'group', children: [
          { key: 'encaplimit', title: t('interface.vxlan.param_encaplimit'), type: 'number', min: 0, max: 255, placeholder: '0-255', help: t('interface.vxlan.param_encaplimit_help') },
          { key: 'flowlabel', title: t('interface.vxlan.param_flowlabel'), type: 'text', placeholder: 'inherit or 0x0-0x0fffff', help: t('interface.vxlan.param_flowlabel_help') },
        ]
      },
      {
        key: 'parameters', title: t('interface.vxlan.general_parameters'), type: 'group', children: [
          { key: 'neighbor_suppress', title: t('interface.vxlan.param_neighbor_suppress'), type: 'checkbox', help: t('interface.vxlan.param_neighbor_suppress_help') },
          { key: 'nolearning', title: t('interface.vxlan.param_nolearning'), type: 'checkbox', help: t('interface.vxlan.param_nolearning_help') },
          { key: 'vni_filter', title: t('interface.vxlan.param_vni_filter'), type: 'checkbox', help: t('interface.vxlan.param_vni_filter_help') },
        ]
      }
    ]);

    const ipSchema = computed(() => [
      {
        key: 'ip', title: t('interface.vxlan.ipv4_config'), type: 'group', children: [
          { key: 'adjust_mss', title: t('interface.vxlan.ip_adjust_mss'), type: 'text', placeholder: 'clamp-mss-to-pmtu or 536-65535', help: t('interface.vxlan.ip_adjust_mss_help') },
          { key: 'arp_cache_timeout', title: t('interface.vxlan.ip_arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('interface.vxlan.ip_arp_cache_timeout_help') },
          { key: 'disable_arp_filter', title: t('interface.vxlan.ip_disable_arp_filter'), type: 'checkbox', help: t('interface.vxlan.ip_disable_arp_filter_help') },
          { key: 'disable_forwarding', title: t('interface.vxlan.ip_disable_forwarding'), type: 'checkbox', help: t('interface.vxlan.ip_disable_forwarding_help') },
          { key: 'enable_arp_accept', title: t('interface.vxlan.ip_enable_arp_accept'), type: 'checkbox', help: t('interface.vxlan.ip_enable_arp_accept_help') },
          { key: 'enable_arp_announce', title: t('interface.vxlan.ip_enable_arp_announce'), type: 'checkbox', help: t('interface.vxlan.ip_enable_arp_announce_help') },
          { key: 'enable_arp_ignore', title: t('interface.vxlan.ip_enable_arp_ignore'), type: 'checkbox', help: t('interface.vxlan.ip_enable_arp_ignore_help') },
          { key: 'enable_directed_broadcast', title: t('interface.vxlan.ip_enable_directed_broadcast'), type: 'checkbox', help: t('interface.vxlan.ip_enable_directed_broadcast_help') },
          { key: 'enable_proxy_arp', title: t('interface.vxlan.ip_enable_proxy_arp'), type: 'checkbox', help: t('interface.vxlan.ip_enable_proxy_arp_help') },
          { key: 'proxy_arp_pvlan', title: t('interface.vxlan.ip_proxy_arp_pvlan'), type: 'checkbox', help: t('interface.vxlan.ip_proxy_arp_pvlan_help') },
          { key: 'source_validation', title: t('interface.vxlan.ip_source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('app.please_select'), help: t('interface.vxlan.ip_source_validation_help') },
        ]
      }
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('interface.vxlan.ipv6_accept_dad'), type: 'select', options: acceptDadOptions.value, help: t('interface.vxlan.ipv6_accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('interface.vxlan.ipv6_autoconf'), type: 'checkbox', help: t('interface.vxlan.ipv6_autoconf_help') },
      { key: 'ipv6_eui64', title: t('interface.vxlan.ipv6_eui64'), type: 'text', placeholder: t('interface.vxlan.ipv6_eui64_placeholder'), help: t('interface.vxlan.ipv6_eui64_help') },
      { key: 'ipv6_interface_identifier', title: t('interface.vxlan.ipv6_interface_identifier'), type: 'text', placeholder: t('interface.vxlan.ipv6_interface_identifier_placeholder'), help: t('interface.vxlan.ipv6_interface_identifier_help') },
      { key: 'ipv6_no_default_link_local', title: t('interface.vxlan.ipv6_no_default_link_local'), type: 'checkbox', help: t('interface.vxlan.ipv6_no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('interface.vxlan.ipv6_adjust_mss'), type: 'text', placeholder: 'clamp-mss-to-pmtu or 536-65535', help: t('interface.vxlan.ipv6_adjust_mss_help') },
      { key: 'ipv6_base_reachable_time', title: t('interface.vxlan.ipv6_base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('interface.vxlan.ipv6_base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('interface.vxlan.ipv6_disable_forwarding'), type: 'checkbox', help: t('interface.vxlan.ipv6_disable_forwarding_help') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('interface.vxlan.ipv6_dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('interface.vxlan.ipv6_dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('interface.vxlan.ipv6_source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('app.please_select'), help: t('interface.vxlan.ipv6_source_validation_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('interface.vxlan.mirror_egress_title'), type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: t('interface.vxlan.mirror_target_placeholder'), help: t('interface.vxlan.mirror_egress_help') },
      { key: 'mirror_ingress', title: t('interface.vxlan.mirror_ingress_title'), type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: t('interface.vxlan.mirror_target_placeholder'), help: t('interface.vxlan.mirror_ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('interface.vxlan.redirect_title'), type: 'select', options: [{ value: '', label: '' }, ...interfaceOptions.value], placeholder: t('interface.vxlan.mirror_target_placeholder'), help: t('interface.vxlan.redirect_help') },
      { key: 'vrf', title: t('interface.vxlan.vrf_title'), type: 'select', options: [{ value: '', label: '' }, ...vrfOptions.value], placeholder: t('interface.vxlan.vrf_placeholder'), help: t('interface.vxlan.vrf_help') },
    ]);

    // VLAN-to-VNI schema
    const vlanSchema = computed(() => [
      { key: 'vlan', title: t('interface.vxlan.vlan_title'), type: 'text', required: true, placeholder: t('interface.vxlan.vlan_title_placeholder'), help: t('interface.vxlan.vlan_title_help') },
      { key: 'vni', title: t('interface.vxlan.vni_title'), type: 'text', required: true, placeholder: t('interface.vxlan.vni_title_placeholder'), help: t('interface.vxlan.vni_title_help') },
      { key: 'description', title: t('interface.vxlan.vlan_desc_title'), type: 'text', placeholder: t('interface.vxlan.vlan_desc_placeholder') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingVxlan.value) return '';
      const v = editingVxlan.value;
      const name = v.name || 'vxlanN';
      const lines = [];

      if (v.description) lines.push(`set interfaces vxlan ${name} description "${v.description}"`);
      if (v.vni !== '' && v.vni !== null && v.vni !== undefined) lines.push(`set interfaces vxlan ${name} vni ${v.vni}`);
      if (v.group) lines.push(`set interfaces vxlan ${name} group ${v.group}`);
      if (v.remote) lines.push(`set interfaces vxlan ${name} remote ${v.remote}`);
      if (v.source_address) lines.push(`set interfaces vxlan ${name} source-address ${v.source_address}`);
      if (v.source_interface) lines.push(`set interfaces vxlan ${name} source-interface ${v.source_interface}`);
      if (v.port) lines.push(`set interfaces vxlan ${name} port ${v.port}`);
      if (v.mac) lines.push(`set interfaces vxlan ${name} mac ${v.mac}`);
      if (v.gpe) lines.push(`set interfaces vxlan ${name} gpe`);
      if (v.mtu) lines.push(`set interfaces vxlan ${name} mtu ${v.mtu}`);
      if (v.disable) lines.push(`set interfaces vxlan ${name} disable`);

      // Parameters - IPv4
      if (v.parameters_ip?.ignore_df) lines.push(`set interfaces vxlan ${name} parameters ip ignore-df`);
      if (v.parameters_ip?.key !== '' && v.parameters_ip?.key !== null && v.parameters_ip?.key !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip key ${v.parameters_ip.key}`);
      if (v.parameters_ip?.no_pmtu_discovery) lines.push(`set interfaces vxlan ${name} parameters ip no-pmtu-discovery`);
      if (v.parameters_ip?.tos !== '' && v.parameters_ip?.tos !== null && v.parameters_ip?.tos !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip tos ${v.parameters_ip.tos}`);
      if (v.parameters_ip?.ttl !== '' && v.parameters_ip?.ttl !== null && v.parameters_ip?.ttl !== undefined) lines.push(`set interfaces vxlan ${name} parameters ip ttl ${v.parameters_ip.ttl}`);
      
      // Parameters - IPv6
      if (v.parameters_ipv6?.encaplimit !== '' && v.parameters_ipv6?.encaplimit !== null && v.parameters_ipv6?.encaplimit !== undefined) lines.push(`set interfaces vxlan ${name} parameters ipv6 encaplimit ${v.parameters_ipv6.encaplimit}`);
      if (v.parameters_ipv6?.flowlabel) lines.push(`set interfaces vxlan ${name} parameters ipv6 flowlabel ${v.parameters_ipv6.flowlabel}`);
      
      // Parameters - General
      if (v.parameters?.neighbor_suppress) lines.push(`set interfaces vxlan ${name} parameters neighbor-suppress`);
      if (v.parameters?.nolearning) lines.push(`set interfaces vxlan ${name} parameters nolearning`);
      if (v.parameters?.vni_filter) lines.push(`set interfaces vxlan ${name} parameters vni-filter`);

      // IP
      if (v.ip?.adjust_mss) lines.push(`set interfaces vxlan ${name} ip adjust-mss ${v.ip.adjust_mss}`);
      if (v.ip?.arp_cache_timeout) lines.push(`set interfaces vxlan ${name} ip arp-cache-timeout ${v.ip.arp_cache_timeout}`);
      if (v.ip?.disable_arp_filter) lines.push(`set interfaces vxlan ${name} ip disable-arp-filter`);
      if (v.ip?.disable_forwarding) lines.push(`set interfaces vxlan ${name} ip disable-forwarding`);
      if (v.ip?.enable_arp_accept) lines.push(`set interfaces vxlan ${name} ip enable-arp-accept`);
      if (v.ip?.enable_arp_announce) lines.push(`set interfaces vxlan ${name} ip enable-arp-announce`);
      if (v.ip?.enable_arp_ignore) lines.push(`set interfaces vxlan ${name} ip enable-arp-ignore`);
      if (v.ip?.enable_directed_broadcast) lines.push(`set interfaces vxlan ${name} ip enable-directed-broadcast`);
      if (v.ip?.enable_proxy_arp) lines.push(`set interfaces vxlan ${name} ip enable-proxy-arp`);
      if (v.ip?.proxy_arp_pvlan) lines.push(`set interfaces vxlan ${name} ip proxy-arp-pvlan`);
      if (v.ip?.source_validation) lines.push(`set interfaces vxlan ${name} ip source-validation ${v.ip.source_validation}`);

      // IPv6
      if (v.ipv6?.accept_dad && v.ipv6.accept_dad !== '1') lines.push(`set interfaces vxlan ${name} ipv6 accept-dad ${v.ipv6.accept_dad}`);
      if (v.ipv6?.autoconf) lines.push(`set interfaces vxlan ${name} ipv6 address autoconf`);
      if (v.ipv6?.eui64) lines.push(`set interfaces vxlan ${name} ipv6 address eui64 ${v.ipv6.eui64}`);
      if (v.ipv6?.interface_identifier) lines.push(`set interfaces vxlan ${name} ipv6 address interface-identifier ${v.ipv6.interface_identifier}`);
      if (v.ipv6?.no_default_link_local) lines.push(`set interfaces vxlan ${name} ipv6 address no-default-link-local`);
      if (v.ipv6?.adjust_mss) lines.push(`set interfaces vxlan ${name} ipv6 adjust-mss ${v.ipv6.adjust_mss}`);
      if (v.ipv6?.base_reachable_time) lines.push(`set interfaces vxlan ${name} ipv6 base-reachable-time ${v.ipv6.base_reachable_time}`);
      if (v.ipv6?.disable_forwarding) lines.push(`set interfaces vxlan ${name} ipv6 disable-forwarding`);
      if (v.ipv6?.dup_addr_detect_transmits !== '' && v.ipv6?.dup_addr_detect_transmits !== null && v.ipv6?.dup_addr_detect_transmits !== undefined) lines.push(`set interfaces vxlan ${name} ipv6 dup-addr-detect-transmits ${v.ipv6.dup_addr_detect_transmits}`);
      if (v.ipv6?.source_validation) lines.push(`set interfaces vxlan ${name} ipv6 source-validation ${v.ipv6.source_validation}`);

      // Mirror
      if (v.mirror?.egress) lines.push(`set interfaces vxlan ${name} mirror egress ${v.mirror.egress}`);
      if (v.mirror?.ingress) lines.push(`set interfaces vxlan ${name} mirror ingress ${v.mirror.ingress}`);

      // Other
      if (v.other?.redirect) lines.push(`set interfaces vxlan ${name} redirect ${v.other.redirect}`);
      if (v.other?.vrf) lines.push(`set interfaces vxlan ${name} vrf ${v.other.vrf}`);

      // VLAN-to-VNI
      if (vlanToVni.value && vlanToVni.value.length) {
        vlanToVni.value.forEach(m => {
          if (m.description) lines.push(`set interfaces vxlan ${name} vlan-to-vni ${m.vlan} description "${m.description}"`);
          if (m.vni) lines.push(`set interfaces vxlan ${name} vlan-to-vni ${m.vlan} vni ${m.vni}`);
        });
      }

      return lines.length ? lines.join('\n') : '# ' + t('interface.vxlan.no_config');
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: t('interface.vxlan.basic_config') },
      { key: 'parameters', title: t('interface.vxlan.parameters') },
      { key: 'ip', title: t('interface.vxlan.ip_config') },
      { key: 'ipv6', title: t('interface.vxlan.ipv6_config') },
      { key: 'vlan', title: t('interface.vxlan.vlan_to_vni') },
      { key: 'mirror', title: t('interface.vxlan.mirror_traffic') },
      { key: 'other', title: t('interface.vxlan.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', vni: '', group: '', remote: '',
        source_address: '', source_interface: '', port: '', mac: '',
        gpe: false, mtu: '', disable: false,
        param_ignore_df: false, param_key: '', param_no_pmtu_discovery: false,
        param_tos: '', param_ttl: '', param_encaplimit: '', param_flowlabel: '',
        param_neighbor_suppress: false, param_nolearning: false, param_vni_filter: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_interface_identifier: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function getDefaultVlanForm() {
      return { vlan: '', vni: '', description: '' };
    }

    function vxlanToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        vni: v.vni !== undefined ? v.vni : '',
        group: v.group || '',
        remote: v.remote || '',
        source_address: v.source_address || '',
        source_interface: v.source_interface || '',
        port: v.port || '',
        mac: v.mac || '',
        gpe: !!v.gpe,
        mtu: v.mtu || '',
        disable: !!v.disable,
        param_ignore_df: !!v.parameters?.ip?.ignore_df,
        param_key: v.parameters?.ip?.key !== undefined ? v.parameters.ip.key : '',
        param_no_pmtu_discovery: !!v.parameters?.ip?.no_pmtu_discovery,
        param_tos: v.parameters?.ip?.tos !== undefined ? v.parameters.ip.tos : '',
        param_ttl: v.parameters?.ip?.ttl !== undefined ? v.parameters.ip.ttl : '',
        param_encaplimit: v.parameters?.ipv6?.encaplimit !== undefined ? v.parameters.ipv6.encaplimit : '',
        param_flowlabel: v.parameters?.ipv6?.flowlabel || '',
        param_neighbor_suppress: !!v.parameters?.neighbor_suppress,
        param_nolearning: !!v.parameters?.nolearning,
        param_vni_filter: !!v.parameters?.vni_filter,
        ip_adjust_mss: v.ip?.adjust_mss || '',
        ip_arp_cache_timeout: v.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!v.ip?.disable_arp_filter,
        ip_disable_forwarding: !!v.ip?.disable_forwarding,
        ip_enable_arp_accept: !!v.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!v.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!v.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!v.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!v.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!v.ip?.proxy_arp_pvlan,
        ip_source_validation: v.ip?.source_validation || '',
        ipv6_accept_dad: v.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!v.ipv6?.address?.autoconf,
        ipv6_eui64: v.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: v.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!v.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: v.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: v.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!v.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: v.ipv6?.dup_addr_detect_transmits !== undefined ? v.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: v.ipv6?.source_validation || '',
        mirror_egress: v.mirror?.egress || '',
        mirror_ingress: v.mirror?.ingress || '',
        redirect: v.redirect || '',
        vrf: v.vrf || '',
      };
    }

    function formToVxlan(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.vni !== '' && form.vni !== null && form.vni !== undefined) result.vni = Number(form.vni);
      if (form.group) result.group = form.group;
      if (form.remote) result.remote = form.remote;
      if (form.source_address) result.source_address = form.source_address;
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.port) result.port = Number(form.port);
      if (form.mac) result.mac = form.mac;
      if (form.gpe) result.gpe = true;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      // Parameters
      const params = {};
      const ipParam = {};
      if (form.param_ignore_df) ipParam.ignore_df = true;
      if (form.param_key !== '' && form.param_key !== null && form.param_key !== undefined) ipParam.key = Number(form.param_key);
      if (form.param_no_pmtu_discovery) ipParam.no_pmtu_discovery = true;
      if (form.param_tos !== '' && form.param_tos !== null && form.param_tos !== undefined) ipParam.tos = Number(form.param_tos);
      if (form.param_ttl !== '' && form.param_ttl !== null && form.param_ttl !== undefined) ipParam.ttl = Number(form.param_ttl);
      if (Object.keys(ipParam).length) params.ip = ipParam;

      const ipv6Param = {};
      if (form.param_encaplimit !== '' && form.param_encaplimit !== null && form.param_encaplimit !== undefined) ipv6Param.encaplimit = Number(form.param_encaplimit);
      if (form.param_flowlabel) ipv6Param.flowlabel = form.param_flowlabel;
      if (Object.keys(ipv6Param).length) params.ipv6 = ipv6Param;

      if (form.param_neighbor_suppress) params.neighbor_suppress = true;
      if (form.param_nolearning) params.nolearning = true;
      if (form.param_vni_filter) params.vni_filter = true;

      if (Object.keys(params).length) result.parameters = params;

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

      if (form.redirect) result.redirect = form.redirect;
      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces vxlan' });
        const cfg = res.data || {};
        vxlans.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          vni: val.vni !== undefined ? val.vni : '',
          group: val.group || '',
          remote: val.remote || '',
          source_address: val.source_address || '',
          port: val.port || '',
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
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function showError(err) {
      _showError({ message: `${t('error.code')} ${err.code || 'ERROR'}\n${t('error.message')} ${err.message || err}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        const raw = vxlans.value[index];
        editingVxlan.value = vxlanToForm(raw);
        isEditMode.value = true;
        // Load vlan-to-vni mappings
        const v2v = raw['vlan-to-vni'] || {};
        vlanToVni.value = Object.entries(v2v).map(([vlan, m]) => ({
          vlan,
          vni: m.vni || '',
          description: m.description || '',
        }));
      } else {
        editingVxlan.value = getDefaultForm();
        isEditMode.value = false;
        vlanToVni.value = [];
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function openModalByRow(row) {
      if (!row) {
        openModal(-1);
        return;
      }
      const index = vxlans.value.findIndex(v => v.name === row.name);
      openModal(index);
    }

    async function save() {
      try {
        const form = editingVxlan.value;
        const name = form.name;
        if (!name) { showError({ message: t('interface.vxlan.name_required') }); return; }

        const config = formToVxlan(form);
        console.log('[VXLAN] ' + t('interface.vxlan.save_log') + ' ' + JSON.stringify(config, null, 2));

        const path = `interfaces vxlan ${name}`;
        await configStore.setConfig(path, config);
        configStore.markPending();

        // Save vlan-to-vni mappings
        if (vlanToVni.value && vlanToVni.value.length) {
          for (const m of vlanToVni.value) {
            const vlanConfig = {};
            if (m.description) vlanConfig.description = m.description;
            if (m.vni) vlanConfig.vni = m.vni;
            await configStore.setConfig(`${path} vlan-to-vni ${m.vlan}`, vlanConfig);
            configStore.markPending();
          }
        }

        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    function remove() {
      if (!selectedVxlan.value.length) { showError({ message: t('interface.vxlan.select_first') }); return; }
      pendingDeleteNames.value = selectedVxlan.value.map(v => v.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces vxlan ${name}`);
          configStore.markPending();
        }
        selectedVxlan.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    // VLAN-to-VNI management
    function openVlanModal(index = -1) {
      if (index >= 0) {
        vlanForm.value = JSON.parse(JSON.stringify(vlanToVni.value[index]));
        editingVlanIndex.value = index;
      } else {
        vlanForm.value = getDefaultVlanForm();
        editingVlanIndex.value = -1;
      }
      vlanModalVisible.value = true;
    }

    function saveVlan() {
      const m = vlanForm.value;
      if (!m.vlan) { showError({ message: t('interface.vxlan.vlan_id_required') }); return; }
      if (!m.vni) { showError({ message: t('interface.vxlan.vni_required') }); return; }

      if (editingVlanIndex.value >= 0) {
        vlanToVni.value[editingVlanIndex.value] = JSON.parse(JSON.stringify(m));
      } else {
        vlanToVni.value.push(JSON.parse(JSON.stringify(m)));
      }
      vlanModalVisible.value = false;
    }

    function deleteVlan(index) {
      pendingDeleteVlanIndex.value = index;
      vlanDeleteModalVisible.value = true;
    }

    function confirmDeleteVlan() {
      vlanDeleteModalVisible.value = false;
      vlanToVni.value.splice(pendingDeleteVlanIndex.value, 1);
      pendingDeleteVlanIndex.value = -1;
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {t,

      loading, vxlans, selected: selectedVxlan, modalVisible, editingVxlan, interfaceOptions, activeTab,
      vlanToVni, editingVlanIndex, vlanModalVisible, vlanForm, selectedVlans, vlanColumns,
      COLUMNS,
      basicSchema, parametersSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema, vlanSchema,
      commandText, modalTabs,
      deleteModalVisible, pendingDeleteNames, vlanDeleteModalVisible, pendingDeleteVlanIndex,
      openModal, openModalByRow, save, remove, confirmRemove, load,
      openVlanModal, saveVlan, deleteVlan, confirmDeleteVlan,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="vxlans"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModalByRow($event)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingVxlan?.name ? $t('interface.vxlan.modal_edit') : $t('interface.vxlan.modal_create')" width="900px" @confirm="save">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingVxlan" />
            </template>
            <template #parameters>
              <ConfigForm :schema="parametersSchema" :model="editingVxlan" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingVxlan" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingVxlan" />
            </template>
            <template #vlan>
              <DataTable
                :columns="vlanColumns"
                :data="vlanToVni"
                :selectable="true"
                :actions="['create', 'edit', 'delete']"
                @create="openVlanModal(-1)"
                @edit="openVlanModal"
                @delete="deleteVlan"
                @selection-change="selectedVlans = $event"
              />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingVxlan" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingVxlan" />
            </template>
          </TabGroup>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="vlanModalVisible" :title="editingVlanIndex >= 0 ? $t('interface.vxlan.edit_vlan_mapping') : $t('interface.vxlan.create_vlan_mapping')" width="600px" @confirm="saveVlan">
        <template #default>
          <ConfigForm :schema="vlanSchema" :model="vlanForm" />
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ $t('interface.vxlan.delete_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="vlanDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmDeleteVlan">
        <div>{{ $t('interface.vxlan.delete_vlan_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-if="pendingDeleteVlanIndex >= 0 && vlanToVni[pendingDeleteVlanIndex]" style="padding:2px 0;">
            VLAN: {{ vlanToVni[pendingDeleteVlanIndex].vlan }}, VNI: {{ vlanToVni[pendingDeleteVlanIndex].vni }}
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
