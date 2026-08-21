import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';



const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', labelKey: 'wireguard.options.source_validation.strict' },
  { value: 'loose', labelKey: 'wireguard.options.source_validation.loose' },
  { value: 'disable', labelKey: 'wireguard.options.source_validation.disable' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', labelKey: 'wireguard.options.accept_dad.0' },
  { value: '1', labelKey: 'wireguard.options.accept_dad.1' },
  { value: '2', labelKey: 'wireguard.options.accept_dad.2' },
];

function resolveOptions(options, t) {
  if (!Array.isArray(options)) return options;
  return options.map(opt => {
    if (opt && opt.labelKey) return { ...opt, label: t(opt.labelKey) };
    return opt;
  });
}

function buildBasicSchema(t) {
  return [
    { key: 'name', title: t('wireguard.basic.name'), type: 'text', required: true, placeholder: t('wireguard.basic.name_placeholder'), help: t('wireguard.basic.name_help') },
    { key: 'description', title: t('wireguard.basic.description'), type: 'text', placeholder: t('wireguard.basic.description_placeholder') },
    { key: 'private_key', title: t('wireguard.basic.private_key'), type: 'textarea', placeholder: t('wireguard.basic.private_key_placeholder'), help: t('wireguard.basic.private_key_help') },
    { key: 'port', title: t('wireguard.basic.port'), type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: t('wireguard.basic.port_help') },
    { key: 'fwmark', title: t('wireguard.basic.fwmark'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('wireguard.basic.fwmark_help') },
    { key: 'max_dns_retry', title: t('wireguard.basic.max_dns_retry'), type: 'number', min: 1, max: 15, placeholder: '1-15', help: t('wireguard.basic.max_dns_retry_help') },
    { key: 'mtu', title: t('wireguard.basic.mtu'), type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: t('wireguard.basic.mtu_help') },
    { key: 'per_client_thread', title: t('wireguard.basic.per_client_thread'), type: 'checkbox', help: t('wireguard.basic.per_client_thread_help') },
    { key: 'disable', title: t('wireguard.basic.disable'), type: 'checkbox', help: t('wireguard.basic.disable_help') },
  ];
}

function buildIpSchema(t) {
  return [
    { key: 'ip_adjust_mss', title: t('wireguard.ip.adjust_mss'), type: 'text', placeholder: t('wireguard.ip.adjust_mss_placeholder'), help: t('wireguard.ip.adjust_mss_help') },
    { key: 'ip_arp_cache_timeout', title: t('wireguard.ip.arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('wireguard.ip.arp_cache_timeout_help') },
    { key: 'ip_disable_arp_filter', title: t('wireguard.ip.disable_arp_filter'), type: 'checkbox', help: t('wireguard.ip.disable_arp_filter_help') },
    { key: 'ip_disable_forwarding', title: t('wireguard.ip.disable_forwarding'), type: 'checkbox', help: t('wireguard.ip.disable_forwarding_help') },
    { key: 'ip_enable_arp_accept', title: t('wireguard.ip.enable_arp_accept'), type: 'checkbox', help: t('wireguard.ip.enable_arp_accept_help') },
    { key: 'ip_enable_arp_announce', title: t('wireguard.ip.enable_arp_announce'), type: 'checkbox', help: t('wireguard.ip.enable_arp_announce_help') },
    { key: 'ip_enable_arp_ignore', title: t('wireguard.ip.enable_arp_ignore'), type: 'checkbox', help: t('wireguard.ip.enable_arp_ignore_help') },
    { key: 'ip_enable_directed_broadcast', title: t('wireguard.ip.enable_directed_broadcast'), type: 'checkbox', help: t('wireguard.ip.enable_directed_broadcast_help') },
    { key: 'ip_enable_proxy_arp', title: t('wireguard.ip.enable_proxy_arp'), type: 'checkbox', help: t('wireguard.ip.enable_proxy_arp_help') },
    { key: 'ip_proxy_arp_pvlan', title: t('wireguard.ip.proxy_arp_pvlan'), type: 'checkbox', help: t('wireguard.ip.proxy_arp_pvlan_help') },
    { key: 'ip_source_validation', title: t('wireguard.ip.source_validation'), type: 'select', options: resolveOptions(SOURCE_VALIDATION_OPTIONS, t), placeholder: t('wireguard.ip.source_validation_placeholder'), help: t('wireguard.ip.source_validation_help') },
  ];
}

function buildIpv6Schema(t) {
  return [
    { key: 'ipv6_accept_dad', title: t('wireguard.ipv6.accept_dad'), type: 'select', options: resolveOptions(ACCEPT_DAD_OPTIONS, t), help: t('wireguard.ipv6.accept_dad_help') },
    { key: 'ipv6_autoconf', title: t('wireguard.ipv6.autoconf'), type: 'checkbox', help: t('wireguard.ipv6.autoconf_help') },
    { key: 'ipv6_eui64', title: t('wireguard.ipv6.eui64'), type: 'text', placeholder: t('wireguard.ipv6.eui64_placeholder'), help: t('wireguard.ipv6.eui64_help') },
    { key: 'ipv6_no_default_link_local', title: t('wireguard.ipv6.no_default_link_local'), type: 'checkbox', help: t('wireguard.ipv6.no_default_link_local_help') },
    { key: 'ipv6_adjust_mss', title: t('wireguard.ipv6.adjust_mss'), type: 'text', placeholder: t('wireguard.ipv6.adjust_mss_placeholder'), help: t('wireguard.ipv6.adjust_mss_help') },
    { key: 'ipv6_base_reachable_time', title: t('wireguard.ipv6.base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('wireguard.ipv6.base_reachable_time_help') },
    { key: 'ipv6_disable_forwarding', title: t('wireguard.ipv6.disable_forwarding'), type: 'checkbox', help: t('wireguard.ipv6.disable_forwarding_help') },
    { key: 'ipv6_dup_addr_detect_transmits', title: t('wireguard.ipv6.dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('wireguard.ipv6.dup_addr_detect_transmits_help') },
    { key: 'ipv6_source_validation', title: t('wireguard.ipv6.source_validation'), type: 'select', options: resolveOptions(SOURCE_VALIDATION_OPTIONS, t), placeholder: t('wireguard.ipv6.source_validation_placeholder'), help: t('wireguard.ipv6.source_validation_help') },
  ];
}

function buildMirrorSchema(t, interfaceOptions) {
  return [
    { key: 'mirror_egress', title: t('wireguard.mirror.egress'), type: 'select', options: interfaceOptions, placeholder: t('wireguard.mirror.target_placeholder'), help: t('wireguard.mirror.egress_help') },
    { key: 'mirror_ingress', title: t('wireguard.mirror.ingress'), type: 'select', options: interfaceOptions, placeholder: t('wireguard.mirror.target_placeholder'), help: t('wireguard.mirror.ingress_help') },
  ];
}

function buildOtherSchema(t, interfaceOptions) {
  return [
    { key: 'redirect', title: t('wireguard.other.redirect'), type: 'select', options: interfaceOptions, placeholder: t('wireguard.other.target_placeholder'), help: t('wireguard.other.redirect_help') },
    { key: 'vrf', title: t('wireguard.other.vrf'), type: 'text', placeholder: t('wireguard.other.vrf_placeholder'), help: t('wireguard.other.vrf_help') },
  ];
}

function buildPeerSchema(t) {
  return [
    { key: 'name', title: t('wireguard.peer.name'), type: 'text', required: true, placeholder: t('wireguard.peer.name_placeholder') },
    { key: 'public_key', title: t('wireguard.peer.public_key'), type: 'text', required: true, placeholder: t('wireguard.peer.public_key_placeholder') },
    { key: 'preshared_key', title: t('wireguard.peer.preshared_key'), type: 'text', placeholder: t('wireguard.peer.preshared_key_placeholder') },
    { key: 'address', title: t('wireguard.peer.address'), type: 'text', placeholder: t('wireguard.peer.address_placeholder') },
    { key: 'allowed_ips', title: t('wireguard.peer.allowed_ips'), type: 'textarea', placeholder: t('wireguard.peer.allowed_ips_placeholder'), help: t('wireguard.peer.allowed_ips_help') },
    { key: 'host_name', title: t('wireguard.peer.host_name'), type: 'text', placeholder: 'FQDN', help: t('wireguard.peer.host_name_help') },
    { key: 'port', title: t('wireguard.peer.port'), type: 'number', min: 1, max: 65535, placeholder: '1-65535' },
    { key: 'persistent_keepalive', title: t('wireguard.peer.persistent_keepalive'), type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: t('wireguard.peer.persistent_keepalive_help') },
    { key: 'description', title: t('wireguard.peer.description'), type: 'text', placeholder: t('wireguard.peer.description_placeholder') },
    { key: 'disable', title: t('wireguard.peer.disable'), type: 'checkbox', help: t('wireguard.peer.disable_help') },
  ];
}

export default defineComponent({
  name: 'WireGuardPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const wireguards = ref([]);
    const modalVisible = ref(false);
    const editingWG = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedWG = ref([]);

    // Delete confirmation modals
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const peerDeleteModalVisible = ref(false);
    const pendingDeletePeerIndex = ref(-1);
    const pendingDeletePeerName = ref('');

    // Peer management
    const peers = ref([]);
    const editingPeerIndex = ref(-1);
    const peerModalVisible = ref(false);
    const peerForm = ref(null);
    const selectedPeers = ref([]);

    // Resolved columns
    const columns = computed(() => [
      { key: 'name', title: t('wireguard.columns.name'), width: 120 },
      { key: 'description', title: t('wireguard.columns.description'), width: 160 },
      { key: 'port', title: t('wireguard.columns.port'), width: 80 },
      { key: 'mtu', title: t('wireguard.columns.mtu'), width: 80 },
      { key: 'peer_count', title: t('wireguard.columns.peer_count'), width: 100 },
      { key: 'disable', title: t('wireguard.columns.disable'), width: 80 },
      { key: 'actions', title: t('wireguard.columns.actions'), width: 100 },
    ]);

    const peerColumns = computed(() => [
      { key: 'name', title: t('wireguard.peer_columns.name'), width: 120 },
      { key: 'public_key', title: t('wireguard.peer_columns.public_key'), width: 200 },
      { key: 'address', title: t('wireguard.peer_columns.address'), width: 140 },
      { key: 'port', title: t('wireguard.peer_columns.port'), width: 80 },
      { key: 'disable', title: t('wireguard.peer_columns.disable'), width: 80 },
      { key: 'actions', title: t('wireguard.peer_columns.actions'), width: 100 },
    ]);

    // Schema definitions
    const basicSchema = computed(() => buildBasicSchema(t));
    const ipSchema = computed(() => buildIpSchema(t));
    const ipv6Schema = computed(() => buildIpv6Schema(t));
    const mirrorSchema = computed(() => buildMirrorSchema(t, interfaceOptions.value));
    const otherSchema = computed(() => buildOtherSchema(t, interfaceOptions.value));
    const peerSchema = computed(() => buildPeerSchema(t));

    // Command text
    const commandText = computed(() => {
      if (!editingWG.value) return '';
      const w = editingWG.value;
      const name = w.name || 'wgN';
      const lines = [];

      if (w.description) lines.push(`set interfaces wireguard ${name} description "${w.description}"`);
      if (w.private_key) lines.push(`set interfaces wireguard ${name} private-key ${w.private_key}`);
      if (w.port) lines.push(`set interfaces wireguard ${name} port ${w.port}`);
      if (w.fwmark !== undefined && w.fwmark !== null && w.fwmark !== '') lines.push(`set interfaces wireguard ${name} fwmark ${w.fwmark}`);
      if (w.max_dns_retry) lines.push(`set interfaces wireguard ${name} max-dns-retry ${w.max_dns_retry}`);
      if (w.mtu) lines.push(`set interfaces wireguard ${name} mtu ${w.mtu}`);
      if (w.per_client_thread) lines.push(`set interfaces wireguard ${name} per-client-thread`);
      if (w.disable) lines.push(`set interfaces wireguard ${name} disable`);

      // IP
      if (w.ip_adjust_mss) lines.push(`set interfaces wireguard ${name} ip adjust-mss ${w.ip_adjust_mss}`);
      if (w.ip_arp_cache_timeout) lines.push(`set interfaces wireguard ${name} ip arp-cache-timeout ${w.ip_arp_cache_timeout}`);
      if (w.ip_disable_arp_filter) lines.push(`set interfaces wireguard ${name} ip disable-arp-filter`);
      if (w.ip_disable_forwarding) lines.push(`set interfaces wireguard ${name} ip disable-forwarding`);
      if (w.ip_enable_arp_accept) lines.push(`set interfaces wireguard ${name} ip enable-arp-accept`);
      if (w.ip_enable_arp_announce) lines.push(`set interfaces wireguard ${name} ip enable-arp-announce`);
      if (w.ip_enable_arp_ignore) lines.push(`set interfaces wireguard ${name} ip enable-arp-ignore`);
      if (w.ip_enable_directed_broadcast) lines.push(`set interfaces wireguard ${name} ip enable-directed-broadcast`);
      if (w.ip_enable_proxy_arp) lines.push(`set interfaces wireguard ${name} ip enable-proxy-arp`);
      if (w.ip_proxy_arp_pvlan) lines.push(`set interfaces wireguard ${name} ip proxy-arp-pvlan`);
      if (w.ip_source_validation) lines.push(`set interfaces wireguard ${name} ip source-validation ${w.ip_source_validation}`);

      // IPv6
      if (w.ipv6_accept_dad && w.ipv6_accept_dad !== '1') lines.push(`set interfaces wireguard ${name} ipv6 accept-dad ${w.ipv6_accept_dad}`);
      if (w.ipv6_autoconf) lines.push(`set interfaces wireguard ${name} ipv6 address autoconf`);
      if (w.ipv6_eui64) lines.push(`set interfaces wireguard ${name} ipv6 address eui64 ${w.ipv6_eui64}`);
      if (w.ipv6_no_default_link_local) lines.push(`set interfaces wireguard ${name} ipv6 address no-default-link-local`);
      if (w.ipv6_adjust_mss) lines.push(`set interfaces wireguard ${name} ipv6 adjust-mss ${w.ipv6_adjust_mss}`);
      if (w.ipv6_base_reachable_time) lines.push(`set interfaces wireguard ${name} ipv6 base-reachable-time ${w.ipv6_base_reachable_time}`);
      if (w.ipv6_disable_forwarding) lines.push(`set interfaces wireguard ${name} ipv6 disable-forwarding`);
      if (w.ipv6_dup_addr_detect_transmits !== undefined && w.ipv6_dup_addr_detect_transmits !== null && w.ipv6_dup_addr_detect_transmits !== '') lines.push(`set interfaces wireguard ${name} ipv6 dup-addr-detect-transmits ${w.ipv6_dup_addr_detect_transmits}`);
      if (w.ipv6_source_validation) lines.push(`set interfaces wireguard ${name} ipv6 source-validation ${w.ipv6_source_validation}`);

      // Mirror
      if (w.mirror_egress) lines.push(`set interfaces wireguard ${name} mirror egress ${w.mirror_egress}`);
      if (w.mirror_ingress) lines.push(`set interfaces wireguard ${name} mirror ingress ${w.mirror_ingress}`);

      // Other
      if (w.redirect) lines.push(`set interfaces wireguard ${name} redirect ${w.redirect}`);
      if (w.vrf) lines.push(`set interfaces wireguard ${name} vrf ${w.vrf}`);

      // Peers
      if (peers.value && peers.value.length) {
        peers.value.forEach(p => {
          lines.push(`set interfaces wireguard ${name} peer ${p.name} public-key ${p.public_key}`);
          if (p.preshared_key) lines.push(`set interfaces wireguard ${name} peer ${p.name} preshared-key ${p.preshared_key}`);
          if (p.address) lines.push(`set interfaces wireguard ${name} peer ${p.name} address ${p.address}`);
          if (p.allowed_ips) {
            p.allowed_ips.split('\n').filter(Boolean).forEach(ip => {
              lines.push(`set interfaces wireguard ${name} peer ${p.name} allowed-ips ${ip.trim()}`);
            });
          }
          if (p.host_name) lines.push(`set interfaces wireguard ${name} peer ${p.name} host-name ${p.host_name}`);
          if (p.port) lines.push(`set interfaces wireguard ${name} peer ${p.name} port ${p.port}`);
          if (p.persistent_keepalive) lines.push(`set interfaces wireguard ${name} peer ${p.name} persistent-keepalive ${p.persistent_keepalive}`);
          if (p.description) lines.push(`set interfaces wireguard ${name} peer ${p.name} description "${p.description}"`);
          if (p.disable) lines.push(`set interfaces wireguard ${name} peer ${p.name} disable`);
        });
      }

      return lines.length ? lines.join('\n') : t('wireguard.command.no_config');
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: t('wireguard.tabs.basic') },
      { key: 'ip', title: t('wireguard.tabs.ipv4') },
      { key: 'ipv6', title: t('wireguard.tabs.ipv6') },
      { key: 'peer', title: t('wireguard.tabs.peer') },
      { key: 'mirror', title: t('wireguard.tabs.mirror') },
      { key: 'other', title: t('wireguard.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', private_key: '', port: '',
        fwmark: '', max_dns_retry: '', mtu: '',
        per_client_thread: false, disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '',
        ipv6_no_default_link_local: false, ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function getDefaultPeerForm() {
      return {
        name: '', public_key: '', preshared_key: '', address: '',
        allowed_ips: '', host_name: '', port: '',
        persistent_keepalive: '', description: '', disable: false,
      };
    }

    function wgToForm(w) {
      return {
        name: w.name || '',
        description: w.description || '',
        private_key: w.private_key || '',
        port: w.port || '',
        fwmark: w.fwmark !== undefined ? w.fwmark : '',
        max_dns_retry: w.max_dns_retry || '',
        mtu: w.mtu || '',
        per_client_thread: !!w.per_client_thread,
        disable: !!w.disable,
        ip_adjust_mss: w.ip?.adjust_mss || '',
        ip_arp_cache_timeout: w.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!w.ip?.disable_arp_filter,
        ip_disable_forwarding: !!w.ip?.disable_forwarding,
        ip_enable_arp_accept: !!w.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!w.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!w.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!w.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!w.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!w.ip?.proxy_arp_pvlan,
        ip_source_validation: w.ip?.source_validation || '',
        ipv6_accept_dad: w.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!w.ipv6?.address?.autoconf,
        ipv6_eui64: w.ipv6?.address?.eui64 || '',
        ipv6_no_default_link_local: !!w.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: w.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: w.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!w.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: w.ipv6?.dup_addr_detect_transmits !== undefined ? w.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: w.ipv6?.source_validation || '',
        mirror_egress: w.mirror?.egress || '',
        mirror_ingress: w.mirror?.ingress || '',
        redirect: w.redirect || '',
        vrf: w.vrf || '',
      };
    }

    function formToWG(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.private_key) result.private_key = form.private_key;
      if (form.port) result.port = Number(form.port);
      if (form.fwmark !== '' && form.fwmark !== null && form.fwmark !== undefined) result.fwmark = Number(form.fwmark);
      if (form.max_dns_retry) result.max_dns_retry = Number(form.max_dns_retry);
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.per_client_thread) result.per_client_thread = true;
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
        const res = await api.get('/config', { path: 'interfaces wireguard' });
        const cfg = res.data || {};
        wireguards.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          port: val.port || '',
          mtu: val.mtu || '',
          peer_count: val.peer ? Object.keys(val.peer).length : 0,
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
      } catch (err) {
        handleError(err);
      } finally {
        loading.value = false;
      }
    }

    function handleError(err) {
      showError({ message: t('wireguard.errors.error_message', { code: err.code || 'ERROR', detail: err.message || err }) });
    }

    async function openModal(index = -1) {
      if (index >= 0) {
        const raw = wireguards.value[index];
        editingWG.value = wgToForm(raw);
        // Load peers from raw config
        const peerData = raw.peer || {};
        peers.value = Object.entries(peerData).map(([name, p]) => ({
          name,
          ...p,
          allowed_ips: Array.isArray(p.allowed_ips) ? p.allowed_ips.join('\n') : (p.allowed_ips || ''),
        }));
      } else {
        editingWG.value = getDefaultForm();
        peers.value = [];
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingWG.value;
        const name = form.name;
        if (!name) { showError({ message: t('wireguard.errors.name_required') }); return; }

        const config = formToWG(form);
        console.log('[WireGuard] Saving config:', JSON.stringify(config, null, 2));

        const path = `interfaces wireguard ${name}`;
        await configStore.setConfig(path, config);
        configStore.markPending();

        // Save peers
        if (peers.value && peers.value.length) {
          for (const p of peers.value) {
            const peerConfig = { public_key: p.public_key };
            if (p.preshared_key) peerConfig.preshared_key = p.preshared_key;
            if (p.address) peerConfig.address = p.address;
            if (p.allowed_ips) {
              peerConfig.allowed_ips = p.allowed_ips.split('\n').filter(Boolean).map(s => s.trim());
            }
            if (p.host_name) peerConfig.host_name = p.host_name;
            if (p.port) peerConfig.port = Number(p.port);
            if (p.persistent_keepalive) peerConfig.persistent_keepalive = Number(p.persistent_keepalive);
            if (p.description) peerConfig.description = p.description;
            if (p.disable) peerConfig.disable = true;

            await configStore.setConfig(`${path} peer ${p.name}`, peerConfig);
            configStore.markPending();
          }
        }

        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    function remove() {
      if (!selectedWG.value.length) { showError({ message: t('wireguard.errors.select_for_delete') }); return; }
      pendingDeleteNames.value = selectedWG.value.map(w => w.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces wireguard ${name}`);
          configStore.markPending();
        }
        selectedWG.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    // Peer management functions
    function openPeerModal(index = -1) {
      if (index >= 0) {
        peerForm.value = JSON.parse(JSON.stringify(peers.value[index]));
        editingPeerIndex.value = index;
      } else {
        peerForm.value = getDefaultPeerForm();
        editingPeerIndex.value = -1;
      }
      peerModalVisible.value = true;
    }

    function savePeer() {
      const p = peerForm.value;
      if (!p.name) { showError({ message: t('wireguard.errors.peer_name_required') }); return; }
      if (!p.public_key) { showError({ message: t('wireguard.errors.public_key_required') }); return; }

      if (editingPeerIndex.value >= 0) {
        peers.value[editingPeerIndex.value] = JSON.parse(JSON.stringify(p));
      } else {
        peers.value.push(JSON.parse(JSON.stringify(p)));
      }
      peerModalVisible.value = false;
    }

    function deletePeer(index) {
      const peer = peers.value[index];
      if (!peer) return;
      pendingDeletePeerIndex.value = index;
      pendingDeletePeerName.value = peer.name || peer.public_key || '';
      peerDeleteModalVisible.value = true;
    }

    function confirmRemovePeer() {
      peerDeleteModalVisible.value = false;
      if (pendingDeletePeerIndex.value >= 0 && pendingDeletePeerIndex.value < peers.value.length) {
        peers.value.splice(pendingDeletePeerIndex.value, 1);
      }
      pendingDeletePeerIndex.value = -1;
      pendingDeletePeerName.value = '';
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {
      t, loading, wireguards, selected: selectedWG, modalVisible, editingWG, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      peers, editingPeerIndex, peerModalVisible, peerForm, selectedPeers, peerColumns,
      peerDeleteModalVisible, pendingDeletePeerName,
      columns,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema, peerSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load,
      openPeerModal, savePeer, deletePeer, confirmRemovePeer,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="columns"
        :data="wireguards"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingWG?.name ? t('wireguard.modal.edit') : t('wireguard.modal.create')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingWG" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingWG" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingWG" /></template>
            <template #peer>
              <DataTable
                :columns="peerColumns"
                :data="peers"
                :selectable="true"
                :actions="['create', 'edit', 'delete']"
                @create="openPeerModal(-1)"
                @edit="openPeerModal"
                @delete="deletePeer"
                @selection-change="selectedPeers = $event"
              />
            </template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingWG" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingWG" /></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('common.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('common.buttons.ok') }}</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="peerModalVisible" :title="editingPeerIndex >= 0 ? t('wireguard.peer.modal.edit') : t('wireguard.peer.modal.create')" width="700px">
        <template #default>
          <ConfigForm :schema="peerSchema" :model="peerForm" />
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="peerModalVisible = false">{{ t('common.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="savePeer">{{ t('common.buttons.ok') }}</button>
        </template>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('wireguard.modal.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('wireguard.delete.confirm_interface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="peerDeleteModalVisible" :title="t('wireguard.modal.confirm_delete')" width="400px" @confirm="confirmRemovePeer">
        <div>{{ t('wireguard.delete.confirm_peer') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeletePeerName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
