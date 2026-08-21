import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';
import { buildDhcpv6BaseSchema, dhcpv6ConfigToForm, dhcpv6FormToConfig, dhcpv6ToCommands, DHCPV6_DEFAULTS } from '/src/utils/dhcpv6Common.js';
import { api, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';

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
  name: 'MacSecPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const COLUMNS = computed(() => [
      { key: 'name', title: t('macsec.columns.name'), width: 120 },
      { key: 'description', title: t('macsec.columns.description'), width: 160 },
      { key: 'source_interface', title: t('macsec.columns.source_interface'), width: 120 },
      { key: 'cipher', title: t('macsec.columns.cipher'), width: 120 },
      { key: 'mtu', title: t('macsec.columns.mtu'), width: 80 },
      { key: 'disable', title: t('macsec.columns.disable'), width: 80 },
      { key: 'actions', title: t('macsec.columns.actions'), width: 100 },
    ]);
    const loading = ref(false);
    const macsecs = ref([]);
    const modalVisible = ref(false);
    const editingMacsec = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedMacsec = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const CIPHER_OPTIONS = computed(() => [
      { value: 'gcm-aes-128', label: t('macsec.options.cipher_128') },
      { value: 'gcm-aes-256', label: t('macsec.options.cipher_256') },
    ]);

    const SOURCE_VALIDATION_OPTIONS = computed(() => [
      { value: 'strict', label: t('macsec.options.source_strict') },
      { value: 'loose', label: t('macsec.options.source_loose') },
      { value: 'disable', label: t('macsec.options.source_disable') },
    ]);

    const ACCEPT_DAD_OPTIONS = computed(() => [
      { value: '0', label: t('macsec.options.accept_dad_0') },
      { value: '1', label: t('macsec.options.accept_dad_1') },
      { value: '2', label: t('macsec.options.accept_dad_2') },
    ]);

    const basicSchema = computed(() => [
      { key: 'name', title: t('macsec.fields.name'), type: 'text', required: true, placeholder: t('macsec.fields.name_placeholder'), help: t('macsec.fields.name_help') },
      { key: 'description', title: t('macsec.fields.description'), type: 'text', placeholder: t('macsec.fields.description_placeholder') },
      { key: 'address', title: t('macsec.fields.ip_address'), type: 'textarea', placeholder: t('macsec.fields.address_placeholder'), help: t('macsec.fields.address_help') },
      { key: 'source_interface', title: t('macsec.fields.source_interface'), type: 'select', options: interfaceOptions.value, placeholder: t('macsec.fields.source_interface_placeholder'), help: t('macsec.fields.source_interface_help') },
      { key: 'mtu', title: t('macsec.fields.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('macsec.fields.mtu_placeholder'), help: t('macsec.fields.mtu_help') },
      { key: 'disable', title: t('macsec.fields.disable'), type: 'checkbox', help: t('macsec.fields.disable_help') },
    ]);

    const securitySchema = computed(() => [
      { key: 'security_cipher', title: t('macsec.fields.security.cipher'), type: 'select', options: CIPHER_OPTIONS.value, placeholder: t('macsec.fields.security.cipher_placeholder'), help: t('macsec.fields.security.cipher_help') },
      { key: 'security_encrypt', title: t('macsec.fields.security.encrypt'), type: 'checkbox', help: t('macsec.fields.security.encrypt_help') },
      { key: 'security_replay_window', title: t('macsec.fields.security.replay_window'), type: 'number', min: 0, max: 4294967295, placeholder: t('macsec.fields.security.replay_window_placeholder'), help: t('macsec.fields.security.replay_window_help') },
    ]);

    const mkaSchema = computed(() => [
      { key: 'security_mka_cak', title: t('macsec.fields.mka.cak'), type: 'text', placeholder: t('macsec.fields.mka.cak_placeholder'), help: t('macsec.fields.mka.cak_help') },
      { key: 'security_mka_ckn', title: t('macsec.fields.mka.ckn'), type: 'text', placeholder: t('macsec.fields.mka.ckn_placeholder'), help: t('macsec.fields.mka.ckn_help') },
      { key: 'security_mka_priority', title: t('macsec.fields.mka.priority'), type: 'number', min: 0, max: 255, placeholder: t('macsec.fields.mka.priority_placeholder'), help: t('macsec.fields.mka.priority_help') },
    ]);

    const staticSchema = computed(() => [
      { key: 'security_static_key', title: t('macsec.fields.static.key'), type: 'text', placeholder: t('macsec.fields.static.key_placeholder'), help: t('macsec.fields.static.key_help') },
      { key: 'security_static_peers', title: t('macsec.fields.static.peers'), type: 'textarea', placeholder: t('macsec.fields.static.peers_placeholder'), help: t('macsec.fields.static.peers_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('macsec.fields.ip.adjust_mss'), type: 'text', placeholder: t('macsec.fields.ip.adjust_mss_placeholder'), help: t('macsec.fields.ip.adjust_mss_help') },
      { key: 'ip_arp_cache_timeout', title: t('macsec.fields.ip.arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: t('macsec.fields.ip.arp_cache_timeout_placeholder'), help: t('macsec.fields.ip.arp_cache_timeout_help') },
      { key: 'ip_disable_arp_filter', title: t('macsec.fields.ip.disable_arp_filter'), type: 'checkbox', help: t('macsec.fields.ip.disable_arp_filter_help') },
      { key: 'ip_disable_forwarding', title: t('macsec.fields.ip.disable_forwarding'), type: 'checkbox', help: t('macsec.fields.ip.disable_forwarding_help') },
      { key: 'ip_enable_arp_accept', title: t('macsec.fields.ip.enable_arp_accept'), type: 'checkbox', help: t('macsec.fields.ip.enable_arp_accept_help') },
      { key: 'ip_enable_arp_announce', title: t('macsec.fields.ip.enable_arp_announce'), type: 'checkbox', help: t('macsec.fields.ip.enable_arp_announce_help') },
      { key: 'ip_enable_arp_ignore', title: t('macsec.fields.ip.enable_arp_ignore'), type: 'checkbox', help: t('macsec.fields.ip.enable_arp_ignore_help') },
      { key: 'ip_enable_directed_broadcast', title: t('macsec.fields.ip.enable_directed_broadcast'), type: 'checkbox', help: t('macsec.fields.ip.enable_directed_broadcast_help') },
      { key: 'ip_enable_proxy_arp', title: t('macsec.fields.ip.enable_proxy_arp'), type: 'checkbox', help: t('macsec.fields.ip.enable_proxy_arp_help') },
      { key: 'ip_proxy_arp_pvlan', title: t('macsec.fields.ip.proxy_arp_pvlan'), type: 'checkbox', help: t('macsec.fields.ip.proxy_arp_pvlan_help') },
      { key: 'ip_source_validation', title: t('macsec.fields.ip.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('macsec.fields.ip.source_validation_placeholder'), help: t('macsec.fields.ip.source_validation_help') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('macsec.fields.ipv6.accept_dad'), type: 'select', options: ACCEPT_DAD_OPTIONS.value, help: t('macsec.fields.ipv6.accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('macsec.fields.ipv6.autoconf'), type: 'checkbox', help: t('macsec.fields.ipv6.autoconf_help') },
      { key: 'ipv6_eui64', title: t('macsec.fields.ipv6.eui64'), type: 'text', placeholder: t('macsec.fields.ipv6.eui64_placeholder'), help: t('macsec.fields.ipv6.eui64_help') },
      { key: 'ipv6_no_default_link_local', title: t('macsec.fields.ipv6.no_default_link_local'), type: 'checkbox', help: t('macsec.fields.ipv6.no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('macsec.fields.ipv6.adjust_mss'), type: 'text', placeholder: t('macsec.fields.ipv6.adjust_mss_placeholder'), help: t('macsec.fields.ipv6.adjust_mss_help') },
      { key: 'ipv6_base_reachable_time', title: t('macsec.fields.ipv6.base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: t('macsec.fields.ipv6.base_reachable_time_placeholder'), help: t('macsec.fields.ipv6.base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('macsec.fields.ipv6.disable_forwarding'), type: 'checkbox', help: t('macsec.fields.ipv6.disable_forwarding_help') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('macsec.fields.ipv6.dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: t('macsec.fields.ipv6.dup_addr_detect_transmits_placeholder'), help: t('macsec.fields.ipv6.dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('macsec.fields.ipv6.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('macsec.fields.ipv6.source_validation_placeholder'), help: t('macsec.fields.ipv6.source_validation_help') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('macsec.fields.dhcp.client_id'), type: 'text', placeholder: t('macsec.fields.dhcp.client_id_placeholder'), help: t('macsec.fields.dhcp.client_id_help') },
      { key: 'dhcp_default_route_distance', title: t('macsec.fields.dhcp.default_route_distance'), type: 'number', min: 1, max: 255, placeholder: t('macsec.fields.dhcp.default_route_distance_placeholder'), help: t('macsec.fields.dhcp.default_route_distance_help') },
      { key: 'dhcp_host_name', title: t('macsec.fields.dhcp.host_name'), type: 'text', placeholder: t('macsec.fields.dhcp.host_name_placeholder'), help: t('macsec.fields.dhcp.host_name_help') },
      { key: 'dhcp_mtu', title: t('macsec.fields.dhcp.use_mtu'), type: 'checkbox', help: t('macsec.fields.dhcp.use_mtu_help') },
      { key: 'dhcp_no_default_route', title: t('macsec.fields.dhcp.no_default_route'), type: 'checkbox', help: t('macsec.fields.dhcp.no_default_route_help') },
      { key: 'dhcp_reject', title: t('macsec.fields.dhcp.reject'), type: 'textarea', placeholder: t('macsec.fields.dhcp.reject_placeholder'), help: t('macsec.fields.dhcp.reject_help') },
      { key: 'dhcp_user_class', title: t('macsec.fields.dhcp.user_class'), type: 'text', placeholder: t('macsec.fields.dhcp.user_class_placeholder'), help: t('macsec.fields.dhcp.user_class_help') },
      { key: 'dhcp_vendor_class_id', title: t('macsec.fields.dhcp.vendor_class_id'), type: 'text', placeholder: t('macsec.fields.dhcp.vendor_class_id_placeholder'), help: t('macsec.fields.dhcp.vendor_class_id_help') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('macsec.fields.dhcpv6.duid'), type: 'text', placeholder: t('macsec.fields.dhcpv6.duid_placeholder'), help: t('macsec.fields.dhcpv6.duid_help') },
      { key: 'dhcpv6_no_release', title: t('macsec.fields.dhcpv6.no_release'), type: 'checkbox', help: t('macsec.fields.dhcpv6.no_release_help') },
      { key: 'dhcpv6_no_request_dns', title: t('macsec.fields.dhcpv6.no_request_dns'), type: 'checkbox', help: t('macsec.fields.dhcpv6.no_request_dns_help') },
      { key: 'dhcpv6_no_request_domain_name', title: t('macsec.fields.dhcpv6.no_request_domain_name'), type: 'checkbox', help: t('macsec.fields.dhcpv6.no_request_domain_name_help') },
      { key: 'dhcpv6_parameters_only', title: t('macsec.fields.dhcpv6.parameters_only'), type: 'checkbox', help: t('macsec.fields.dhcpv6.parameters_only_help') },
      { key: 'dhcpv6_pd_instances', title: t('macsec.fields.dhcpv6.pd_instances'), type: 'textarea', placeholder: t('macsec.fields.dhcpv6.pd_instances_placeholder'), help: t('macsec.fields.dhcpv6.pd_instances_help') },
      { key: 'dhcpv6_rapid_commit', title: t('macsec.fields.dhcpv6.rapid_commit'), type: 'checkbox', help: t('macsec.fields.dhcpv6.rapid_commit_help') },
      { key: 'dhcpv6_temporary', title: t('macsec.fields.dhcpv6.temporary'), type: 'checkbox', help: t('macsec.fields.dhcpv6.temporary_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('macsec.fields.mirror.egress'), type: 'select', options: interfaceOptions.value, placeholder: t('macsec.fields.mirror.placeholder'), help: t('macsec.fields.mirror.egress_help') },
      { key: 'mirror_ingress', title: t('macsec.fields.mirror.ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('macsec.fields.mirror.placeholder'), help: t('macsec.fields.mirror.ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('macsec.fields.other.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('macsec.fields.other.redirect_placeholder'), help: t('macsec.fields.other.redirect_help') },
      { key: 'vrf', title: t('macsec.fields.other.vrf'), type: 'text', placeholder: t('macsec.fields.other.vrf_placeholder'), help: t('macsec.fields.other.vrf_help') },
    ]);

    const commandText = computed(() => {
      if (!editingMacsec.value) return '';
      const m = editingMacsec.value;
      const name = m.name || 'macsecN';
      const lines = [];

      if (m.description) lines.push(`set interfaces macsec ${name} description "${m.description}"`);
      if (m.address) {
        m.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces macsec ${name} address ${a.trim()}`);
        });
      }
      if (m.source_interface) lines.push(`set interfaces macsec ${name} source-interface ${m.source_interface}`);
      if (m.mtu) lines.push(`set interfaces macsec ${name} mtu ${m.mtu}`);
      if (m.disable) lines.push(`set interfaces macsec ${name} disable`);

      // Security
      if (m.security_cipher) lines.push(`set interfaces macsec ${name} security cipher ${m.security_cipher}`);
      if (m.security_encrypt) lines.push(`set interfaces macsec ${name} security encrypt`);
      if (m.security_replay_window !== '' && m.security_replay_window !== null && m.security_replay_window !== undefined) lines.push(`set interfaces macsec ${name} security replay-window ${m.security_replay_window}`);

      // MKA
      if (m.security_mka_cak) lines.push(`set interfaces macsec ${name} security mka cak ${m.security_mka_cak}`);
      if (m.security_mka_ckn) lines.push(`set interfaces macsec ${name} security mka ckn ${m.security_mka_ckn}`);
      if (m.security_mka_priority !== '' && m.security_mka_priority !== null && m.security_mka_priority !== undefined) lines.push(`set interfaces macsec ${name} security mka priority ${m.security_mka_priority}`);

      // Static
      if (m.security_static_key) lines.push(`set interfaces macsec ${name} security static key ${m.security_static_key}`);
      if (m.security_static_peers) {
        m.security_static_peers.split('\n').filter(Boolean).forEach(line => {
          const parts = line.trim().split(',').map(s => s.trim());
          if (parts.length >= 3) {
            const [peerName, peerMac, peerKey] = parts;
            lines.push(`set interfaces macsec ${name} security static peer ${peerName} mac ${peerMac}`);
            lines.push(`set interfaces macsec ${name} security static peer ${peerName} key ${peerKey}`);
          }
        });
      }

      // IP
      if (m.ip_adjust_mss) lines.push(`set interfaces macsec ${name} ip adjust-mss ${m.ip_adjust_mss}`);
      if (m.ip_arp_cache_timeout) lines.push(`set interfaces macsec ${name} ip arp-cache-timeout ${m.ip_arp_cache_timeout}`);
      if (m.ip_disable_arp_filter) lines.push(`set interfaces macsec ${name} ip disable-arp-filter`);
      if (m.ip_disable_forwarding) lines.push(`set interfaces macsec ${name} ip disable-forwarding`);
      if (m.ip_enable_arp_accept) lines.push(`set interfaces macsec ${name} ip enable-arp-accept`);
      if (m.ip_enable_arp_announce) lines.push(`set interfaces macsec ${name} ip enable-arp-announce`);
      if (m.ip_enable_arp_ignore) lines.push(`set interfaces macsec ${name} ip enable-arp-ignore`);
      if (m.ip_enable_directed_broadcast) lines.push(`set interfaces macsec ${name} ip enable-directed-broadcast`);
      if (m.ip_enable_proxy_arp) lines.push(`set interfaces macsec ${name} ip enable-proxy-arp`);
      if (m.ip_proxy_arp_pvlan) lines.push(`set interfaces macsec ${name} ip proxy-arp-pvlan`);
      if (m.ip_source_validation) lines.push(`set interfaces macsec ${name} ip source-validation ${m.ip_source_validation}`);

      // IPv6
      if (m.ipv6_accept_dad && m.ipv6_accept_dad !== '1') lines.push(`set interfaces macsec ${name} ipv6 accept-dad ${m.ipv6_accept_dad}`);
      if (m.ipv6_autoconf) lines.push(`set interfaces macsec ${name} ipv6 address autoconf`);
      if (m.ipv6_eui64) lines.push(`set interfaces macsec ${name} ipv6 address eui64 ${m.ipv6_eui64}`);
      if (m.ipv6_no_default_link_local) lines.push(`set interfaces macsec ${name} ipv6 address no-default-link-local`);
      if (m.ipv6_adjust_mss) lines.push(`set interfaces macsec ${name} ipv6 adjust-mss ${m.ipv6_adjust_mss}`);
      if (m.ipv6_base_reachable_time) lines.push(`set interfaces macsec ${name} ipv6 base-reachable-time ${m.ipv6_base_reachable_time}`);
      if (m.ipv6_disable_forwarding) lines.push(`set interfaces macsec ${name} ipv6 disable-forwarding`);
      if (m.ipv6_dup_addr_detect_transmits !== '' && m.ipv6_dup_addr_detect_transmits !== null && m.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces macsec ${name} ipv6 dup-addr-detect-transmits ${m.ipv6_dup_addr_detect_transmits}`);
      if (m.ipv6_source_validation) lines.push(`set interfaces macsec ${name} ipv6 source-validation ${m.ipv6_source_validation}`);

      // DHCP
      if (m.dhcp_client_id) lines.push(`set interfaces macsec ${name} dhcp-options client-id ${m.dhcp_client_id}`);
      if (m.dhcp_default_route_distance) lines.push(`set interfaces macsec ${name} dhcp-options default-route-distance ${m.dhcp_default_route_distance}`);
      if (m.dhcp_host_name) lines.push(`set interfaces macsec ${name} dhcp-options host-name ${m.dhcp_host_name}`);
      if (m.dhcp_mtu) lines.push(`set interfaces macsec ${name} dhcp-options mtu`);
      if (m.dhcp_no_default_route) lines.push(`set interfaces macsec ${name} dhcp-options no-default-route`);
      if (m.dhcp_reject) {
        m.dhcp_reject.split('\n').filter(Boolean).forEach(r => {
          lines.push(`set interfaces macsec ${name} dhcp-options reject ${r.trim()}`);
        });
      }
      if (m.dhcp_user_class) lines.push(`set interfaces macsec ${name} dhcp-options user-class ${m.dhcp_user_class}`);
      if (m.dhcp_vendor_class_id) lines.push(`set interfaces macsec ${name} dhcp-options vendor-class-id ${m.dhcp_vendor_class_id}`);

      // DHCPv6
      lines.push(...dhcpv6ToCommands(m, 'macsec', name));

      // Mirror
      if (m.mirror_egress) lines.push(`set interfaces macsec ${name} mirror egress ${m.mirror_egress}`);
      if (m.mirror_ingress) lines.push(`set interfaces macsec ${name} mirror ingress ${m.mirror_ingress}`);

      if (m.redirect) lines.push(`set interfaces macsec ${name} redirect ${m.redirect}`);
      if (m.vrf) lines.push(`set interfaces macsec ${name} vrf ${m.vrf}`);

      return lines.length ? lines.join('\n') : t('macsec.messages.no_config');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('macsec.tabs.basic') },
      { key: 'security', title: t('macsec.tabs.security') },
      { key: 'mka', title: t('macsec.tabs.mka') },
      { key: 'static', title: t('macsec.tabs.static') },
      { key: 'ip', title: t('macsec.tabs.ip') },
      { key: 'ipv6', title: t('macsec.tabs.ipv6') },
      { key: 'dhcp', title: t('macsec.tabs.dhcp') },
      { key: 'dhcpv6', title: t('macsec.tabs.dhcpv6') },
      { key: 'mirror', title: t('macsec.tabs.mirror') },
      { key: 'other', title: t('macsec.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', source_interface: '', mtu: '', disable: false,
        security_cipher: '', security_encrypt: false, security_replay_window: '',
        security_mka_cak: '', security_mka_ckn: '', security_mka_priority: '',
        security_static_key: '', security_static_peers: '',
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        ...DHCPV6_DEFAULTS,
        dhcpv6_pd_instances: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function macsecToForm(m) {
      return {
        name: m.name || '',
        description: m.description || '',
        address: Array.isArray(m.address) ? m.address.join('\n') : (m.address || ''),
        source_interface: m.source_interface || '',
        mtu: m.mtu || '',
        disable: !!m.disable,
        security_cipher: m.security?.cipher || '',
        security_encrypt: !!m.security?.encrypt,
        security_replay_window: m.security?.replay_window !== undefined ? m.security.replay_window : '',
        security_mka_cak: m.security?.mka?.cak || '',
        security_mka_ckn: m.security?.mka?.ckn || '',
        security_mka_priority: m.security?.mka?.priority !== undefined ? m.security.mka.priority : '',
        security_static_key: m.security?.static?.key || '',
        security_static_peers: m.security?.static?.peer
          ? Object.entries(m.security.static.peer).map(([pname, pval]) => `${pname},${pval.mac || ''},${pval.key || ''}`).join('\n')
          : '',
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
        mirror_egress: m.mirror?.egress || '',
        mirror_ingress: m.mirror?.ingress || '',
        redirect: m.redirect || '',
        vrf: m.vrf || '',
      };
    }

    function formToMacsec(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.source_interface) result.source_interface = form.source_interface;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      // Security
      const security = {};
      if (form.security_cipher) security.cipher = form.security_cipher;
      if (form.security_encrypt) security.encrypt = true;
      if (form.security_replay_window !== '' && form.security_replay_window !== null && form.security_replay_window !== undefined) security.replay_window = Number(form.security_replay_window);

      // MKA
      const mka = {};
      if (form.security_mka_cak) mka.cak = form.security_mka_cak;
      if (form.security_mka_ckn) mka.ckn = form.security_mka_ckn;
      if (form.security_mka_priority !== '' && form.security_mka_priority !== null && form.security_mka_priority !== undefined) mka.priority = Number(form.security_mka_priority);
      if (Object.keys(mka).length) security.mka = mka;

      // Static
      const staticCfg = {};
      if (form.security_static_key) staticCfg.key = form.security_static_key;
      if (form.security_static_peers) {
        const peers = {};
        form.security_static_peers.split('\n').filter(Boolean).forEach(line => {
          const parts = line.trim().split(',').map(s => s.trim());
          if (parts.length >= 3) {
            const [peerName, peerMac, peerKey] = parts;
            peers[peerName] = { mac: peerMac, key: peerKey };
          }
        });
        if (Object.keys(peers).length) staticCfg.peer = peers;
      }
      if (Object.keys(staticCfg).length) security.static = staticCfg;

      if (Object.keys(security).length) result.security = security;

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
      if (form.ipv6_autoconf || form.ipv6_eui64 || form.ipv6_no_default_link_local) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_eui64) addr.eui64 = form.ipv6_eui64;
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
        const res = await api.get('/config', { path: 'interfaces macsec' });
        const cfg = res.data || {};
        macsecs.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          source_interface: val.source_interface || '',
          cipher: val.security?.cipher || '',
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
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingMacsec.value = macsecToForm(macsecs.value[index]);
      } else {
        editingMacsec.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingMacsec.value;
        if (!form.name) { showError({ message: t('macsec.messages.enter_name') }); return; }
        const config = formToMacsec(form);
        console.log('[MACSec] Saving config:', JSON.stringify(config, null, 2));
        await configStore.setConfig(`interfaces macsec ${form.name}`, config);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    function remove() {
      if (!selectedMacsec.value.length) { showError({ message: t('macsec.messages.select_delete') }); return; }
      pendingDeleteNames.value = selectedMacsec.value.map(m => m.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces macsec ${name}`);
          configStore.markPending();
        }
        selectedMacsec.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {
      loading, macsecs, selected: selectedMacsec, modalVisible, editingMacsec, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, securitySchema, mkaSchema, staticSchema, ipSchema, ipv6Schema, dhcpSchema, dhcpv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="macsecs"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingMacsec?.name ? t('macsec.modal.edit') : t('macsec.modal.create')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingMacsec" /></template>
            <template #security><ConfigForm :schema="securitySchema" :model="editingMacsec" /></template>
            <template #mka><ConfigForm :schema="mkaSchema" :model="editingMacsec" /></template>
            <template #static><ConfigForm :schema="staticSchema" :model="editingMacsec" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingMacsec" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingMacsec" /></template>
            <template #dhcp><ConfigForm :schema="dhcpSchema" :model="editingMacsec" /></template>
            <template #dhcpv6><ConfigForm :schema="dhcpv6Schema" :model="editingMacsec" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingMacsec" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingMacsec" /></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('common.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('common.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('common.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('macsec.modal.delete_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
