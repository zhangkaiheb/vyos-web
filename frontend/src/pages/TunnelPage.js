import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';

const ENCAPSULATION_OPTIONS = [
  { value: 'erspan', label: 'erspan (Encapsulated Remote SPAN)' },
  { value: 'gre', label: 'gre (Generic Routing Encapsulation - Network Layer)' },
  { value: 'gretap', label: 'gretap (Generic Routing Encapsulation - Data Link Layer)' },
  { value: 'ip6erspan', label: 'ip6erspan (ERSPAN over IPv6)' },
  { value: 'ip6gre', label: 'ip6gre (GRE over IPv6 - Network Layer)' },
  { value: 'ip6gretap', label: 'ip6gretap (GRE over IPv6 - Data Link Layer)' },
  { value: 'ip6ip6', label: 'ip6ip6 (IPv6 in IPv6)' },
  { value: 'ipip', label: 'ipip (IPv4 in IPv4)' },
  { value: 'ipip6', label: 'ipip6 (IPv4 in IPv6)' },
  { value: 'sit', label: 'sit (Simple Internet Transition - IPv6 in IPv4)' },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (Strict Reverse Path Forwarding RFC3704)' },
  { value: 'loose', label: 'loose (Loose Reverse Path Forwarding RFC3704)' },
  { value: 'disable', label: 'disable (No source validation)' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 (Disable DAD)' },
  { value: '1', label: '1 (Enable DAD)' },
  { value: '2', label: '2 (Enable DAD, disable if duplicate MAC found)' },
];

const ERSPAN_DIRECTION_OPTIONS = [
  { value: 'ingress', label: 'ingress (Mirror ingress traffic)' },
  { value: 'egress', label: 'egress (Mirror egress traffic)' },
];

const ERSPAN_VERSION_OPTIONS = [
  { value: '1', label: '1 (ERSPAN Type II)' },
  { value: '2', label: '2 (ERSPAN Type III)' },
];

const TOS_OPTIONS = [
  { value: 'inherit', label: 'inherit' },
  ...Array.from({ length: 100 }, (_, i) => ({ value: String(i), label: String(i) })),
];

const ENCAPLIMIT_OPTIONS = [
  { value: 'none', label: 'none' },
  ...Array.from({ length: 256 }, (_, i) => ({ value: String(i), label: String(i) })),
];



export default defineComponent({
  name: 'TunnelPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');

    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.tunnel.name'), width: 120 },
      { key: 'description', title: t('interface.tunnel.description'), width: 150 },
      { key: 'encapsulation', title: t('interface.tunnel.encapsulation'), width: 120 },
      { key: 'remote', title: t('interface.tunnel.remote'), width: 150 },
      { key: 'source_address', title: t('interface.tunnel.source_address'), width: 150 },
      { key: 'source_interface', title: t('interface.tunnel.source_interface'), width: 120 },
      { key: 'mtu', title: t('interface.tunnel.mtu'), width: 80 },
      { key: 'address', title: t('interface.tunnel.address'), width: 200 },
      { key: 'disable', title: t('interface.tunnel.disable'), width: 80 },
      { key: 'actions', title: t('interface.tunnel.actions'), width: 120, fixed: 'right' },
    ]);

    const loading = ref(false);
    const tunnels = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingTunnel = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    const schema = computed(() => [
      { key: 'name', title: t('interface.tunnel.name'), type: 'text', required: true, placeholder: t('interface.tunnel.name_placeholder'), disabled: !!editingTunnel.value?.name },
      { key: 'description', title: t('interface.tunnel.description'), type: 'text' },
      { key: 'encapsulation', title: t('interface.tunnel.encapsulation'), type: 'select', options: ENCAPSULATION_OPTIONS, required: true },
      { key: 'remote', title: t('interface.tunnel.remote'), type: 'text', placeholder: t('interface.tunnel.remote_placeholder') },
      { key: 'source_address', title: t('interface.tunnel.source_address'), type: 'text', placeholder: t('interface.tunnel.source_address_placeholder') },
      { key: 'source_interface', title: t('interface.tunnel.source_interface'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.tunnel.source_interface_placeholder') },
      { key: 'address', title: t('interface.tunnel.address'), type: 'textarea', placeholder: t('interface.tunnel.address_placeholder'), help: t('interface.tunnel.address_help') },
      { key: 'mtu', title: t('interface.tunnel.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.tunnel.mtu_placeholder'), help: t('interface.tunnel.mtu_help') },
      { key: '6rd_prefix', title: t('interface.tunnel.6rd_prefix'), type: 'text', placeholder: t('interface.tunnel.6rd_prefix_placeholder') },
      { key: '6rd_relay_prefix', title: t('interface.tunnel.6rd_relay_prefix'), type: 'text', placeholder: t('interface.tunnel.6rd_relay_prefix_placeholder') },
      { key: 'disable', title: t('interface.tunnel.disable_interface'), type: 'checkbox' },
      { key: 'disable_link_detect', title: t('interface.tunnel.disable_link_detect'), type: 'checkbox' },
      { key: 'enable_multicast', title: t('interface.tunnel.enable_multicast'), type: 'checkbox', help: t('interface.tunnel.enable_multicast_help') },
      { key: 'redirect', title: t('interface.tunnel.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.tunnel.redirect_placeholder') },
      { key: 'vrf', title: t('interface.tunnel.vrf'), type: 'text', placeholder: t('interface.tunnel.vrf_placeholder') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('interface.tunnel.ip_adjust_mss'), type: 'text', placeholder: t('interface.tunnel.ip_adjust_mss_placeholder'), help: t('interface.tunnel.ip_adjust_mss_help') },
      { key: 'ip_arp_cache_timeout', title: t('interface.tunnel.ip_arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: t('interface.tunnel.ip_arp_cache_timeout_placeholder'), help: t('interface.tunnel.ip_arp_cache_timeout_help') },
      { key: 'ip_disable_arp_filter', title: t('interface.tunnel.ip_disable_arp_filter'), type: 'checkbox' },
      { key: 'ip_disable_forwarding', title: t('interface.tunnel.ip_disable_forwarding'), type: 'checkbox' },
      { key: 'ip_enable_arp_accept', title: t('interface.tunnel.ip_enable_arp_accept'), type: 'checkbox' },
      { key: 'ip_enable_arp_announce', title: t('interface.tunnel.ip_enable_arp_announce'), type: 'checkbox' },
      { key: 'ip_enable_arp_ignore', title: t('interface.tunnel.ip_enable_arp_ignore'), type: 'checkbox' },
      { key: 'ip_enable_directed_broadcast', title: t('interface.tunnel.ip_enable_directed_broadcast'), type: 'checkbox' },
      { key: 'ip_enable_proxy_arp', title: t('interface.tunnel.ip_enable_proxy_arp'), type: 'checkbox' },
      { key: 'ip_proxy_arp_pvlan', title: t('interface.tunnel.ip_proxy_arp_pvlan'), type: 'checkbox' },
      { key: 'ip_source_validation', title: t('interface.tunnel.ip_source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.tunnel.ip_source_validation_placeholder') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('interface.tunnel.ipv6_accept_dad'), type: 'select', options: ACCEPT_DAD_OPTIONS, help: t('interface.tunnel.ipv6_accept_dad_help') },
      { key: 'ipv6_address_autoconf', title: t('interface.tunnel.ipv6_address_autoconf'), type: 'checkbox', help: t('interface.tunnel.ipv6_address_autoconf_help') },
      { key: 'ipv6_address_eui64', title: t('interface.tunnel.ipv6_address_eui64'), type: 'text', placeholder: t('interface.tunnel.ipv6_address_eui64_placeholder') },
      { key: 'ipv6_no_default_link_local', title: t('interface.tunnel.ipv6_no_default_link_local'), type: 'checkbox' },
      { key: 'ipv6_adjust_mss', title: t('interface.tunnel.ipv6_adjust_mss'), type: 'text', placeholder: t('interface.tunnel.ipv6_adjust_mss_placeholder') },
      { key: 'ipv6_base_reachable_time', title: t('interface.tunnel.ipv6_base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: t('interface.tunnel.ipv6_base_reachable_time_placeholder'), help: t('interface.tunnel.ipv6_base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('interface.tunnel.ipv6_disable_forwarding'), type: 'checkbox' },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('interface.tunnel.ipv6_dup_addr_detect_transmits'), type: 'number', min: 0, placeholder: t('interface.tunnel.ipv6_dup_addr_detect_transmits_placeholder'), help: t('interface.tunnel.ipv6_dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('interface.tunnel.ipv6_source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.tunnel.ipv6_source_validation_placeholder') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_ingress', title: t('interface.tunnel.mirror_ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.tunnel.mirror_placeholder'), help: t('interface.tunnel.mirror_ingress_help') },
      { key: 'mirror_egress', title: t('interface.tunnel.mirror_egress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.tunnel.mirror_placeholder'), help: t('interface.tunnel.mirror_egress_help') },
    ]);

    const parametersSchema = computed(() => [
      {
        key: 'parameters_erspan', title: t('interface.tunnel.erspan_parameters'), type: 'group', children: [
          { key: 'direction', title: t('interface.tunnel.erspan_direction'), type: 'select', options: ERSPAN_DIRECTION_OPTIONS, placeholder: t('interface.tunnel.erspan_direction_placeholder') },
          { key: 'hw_id', title: t('interface.tunnel.erspan_hw_id'), type: 'number', min: 0, max: 1048575, placeholder: '0-1048575', help: t('interface.tunnel.erspan_hw_id_help') },
          { key: 'index', title: t('interface.tunnel.erspan_index'), type: 'number', min: 0, max: 63, placeholder: '0-63', help: t('interface.tunnel.erspan_index_help') },
          { key: 'version', title: t('interface.tunnel.erspan_version'), type: 'select', options: ERSPAN_VERSION_OPTIONS, help: t('interface.tunnel.erspan_version_help') },
        ],
      },
      {
        key: 'parameters_ip', title: t('interface.tunnel.ipv4_tunnel_parameters'), type: 'group', children: [
          { key: 'ignore_df', title: t('interface.tunnel.ignore_df'), type: 'checkbox', help: t('interface.tunnel.ignore_df_help') },
          { key: 'key', title: t('interface.tunnel.tunnel_key'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('interface.tunnel.tunnel_key_help') },
          { key: 'no_pmtu_discovery', title: t('interface.tunnel.no_pmtu_discovery'), type: 'checkbox', help: t('interface.tunnel.no_pmtu_discovery_help') },
          { key: 'tos', title: t('interface.tunnel.tos_value'), type: 'select', options: TOS_OPTIONS, placeholder: t('interface.tunnel.tos_value_placeholder'), help: t('interface.tunnel.tos_value_help') },
          { key: 'ttl', title: 'TTL', type: 'text', placeholder: t('interface.tunnel.ttl_placeholder'), help: t('interface.tunnel.ttl_help') },
        ],
      },
      {
        key: 'parameters_ipv6', title: t('interface.tunnel.ipv6_tunnel_parameters'), type: 'group', children: [
          { key: 'encaplimit', title: t('interface.tunnel.encaplimit'), type: 'select', options: ENCAPLIMIT_OPTIONS, placeholder: t('interface.tunnel.encaplimit_placeholder'), help: t('interface.tunnel.encaplimit_help') },
          { key: 'flowlabel', title: t('interface.tunnel.flowlabel'), type: 'text', placeholder: t('interface.tunnel.flowlabel_placeholder'), help: t('interface.tunnel.flowlabel_help') },
          { key: 'hoplimit', title: t('interface.tunnel.hoplimit'), type: 'number', min: 0, max: 255, placeholder: '0-255', help: t('interface.tunnel.hoplimit_help') },
          { key: 'tclass', title: t('interface.tunnel.tclass'), type: 'text', placeholder: t('interface.tunnel.tclass_placeholder'), help: t('interface.tunnel.tclass_help') },
        ],
      },
    ]);

    // Dynamic tabs based on encapsulation type
    const modalTabs = computed(() => {
      const encap = editingTunnel.value?.encapsulation || '';
      const tabs = [{ key: 'basic', title: t('interface.tunnel.basic_config') }];

      // ERSPAN related encapsulations
      if (encap === 'erspan' || encap === 'ip6erspan') {
        tabs.push({ key: 'erspan', title: t('interface.tunnel.erspan_parameters') });
      }

      // IPv4 tunnel parameters (for IPv4-based encapsulations)
      const ipv4Encaps = ['gre', 'gretap', 'ipip', 'ipip6', 'sit'];
      if (ipv4Encaps.includes(encap)) {
        tabs.push({ key: 'ipParams', title: t('interface.tunnel.ipv4_tunnel_parameters') });
      }

      // IPv6 tunnel parameters (for IPv6-based encapsulations)
      const ipv6Encaps = ['ip6gre', 'ip6gretap', 'ip6ip6'];
      if (ipv6Encaps.includes(encap)) {
        tabs.push({ key: 'ipv6Params', title: t('interface.tunnel.ipv6_tunnel_parameters') });
      }

      // Always show these tabs
      tabs.push(
        { key: 'ip', title: t('interface.tunnel.ipv4_params') },
        { key: 'ipv6', title: t('interface.tunnel.ipv6_params') },
        { key: 'mirror', title: t('interface.tunnel.mirror_traffic') }
      );

      return tabs;
    });

    const commandText = computed(() => {
      if (!editingTunnel.value) return '';
      const tunnel = editingTunnel.value;
      const cmds = [];
      const base = `set interfaces tunnel ${tunnel.name}`;
      if (tunnel.description) cmds.push(`${base} description ${tunnel.description}`);
      if (tunnel.encapsulation) cmds.push(`${base} encapsulation ${tunnel.encapsulation}`);
      if (tunnel.remote) cmds.push(`${base} remote ${tunnel.remote}`);
      if (tunnel.source_address) cmds.push(`${base} source-address ${tunnel.source_address}`);
      if (tunnel.source_interface) cmds.push(`${base} source-interface ${tunnel.source_interface}`);
      if (tunnel.address) {
        const addrs = tunnel.address.split('\n').filter(Boolean);
        addrs.forEach(addr => cmds.push(`${base} address ${addr.trim()}`));
      }
      if (tunnel.mtu) cmds.push(`${base} mtu ${tunnel.mtu}`);
      if (tunnel['6rd_prefix']) cmds.push(`${base} 6rd-prefix ${tunnel['6rd_prefix']}`);
      if (tunnel['6rd_relay_prefix']) cmds.push(`${base} 6rd-relay-prefix ${tunnel['6rd_relay_prefix']}`);
      if (tunnel.disable) cmds.push(`${base} disable`);
      if (tunnel.disable_link_detect) cmds.push(`${base} disable-link-detect`);
      if (tunnel.enable_multicast) cmds.push(`${base} enable-multicast`);
      if (tunnel.redirect) cmds.push(`${base} redirect ${tunnel.redirect}`);
      if (tunnel.vrf) cmds.push(`${base} vrf ${tunnel.vrf}`);

      // Mirror
      if (tunnel.mirror_ingress) cmds.push(`${base} mirror ingress ${tunnel.mirror_ingress}`);
      if (tunnel.mirror_egress) cmds.push(`${base} mirror egress ${tunnel.mirror_egress}`);

      // Parameters - ERSPAN
      const erspan = tunnel.parameters_erspan || {};
      if (erspan.direction) cmds.push(`${base} parameters erspan direction ${erspan.direction}`);
      if (erspan.hw_id !== '' && erspan.hw_id !== null && erspan.hw_id !== undefined) cmds.push(`${base} parameters erspan hw-id ${erspan.hw_id}`);
      if (erspan.index !== '' && erspan.index !== null && erspan.index !== undefined) cmds.push(`${base} parameters erspan index ${erspan.index}`);
      if (erspan.version && erspan.version !== '1') cmds.push(`${base} parameters erspan version ${erspan.version}`);

      // Parameters - IP
      const ipParams = tunnel.parameters_ip || {};
      if (ipParams.ignore_df) cmds.push(`${base} parameters ip ignore-df`);
      if (ipParams.key !== '' && ipParams.key !== null && ipParams.key !== undefined) cmds.push(`${base} parameters ip key ${ipParams.key}`);
      if (ipParams.no_pmtu_discovery) cmds.push(`${base} parameters ip no-pmtu-discovery`);
      if (ipParams.tos && ipParams.tos !== 'inherit') cmds.push(`${base} parameters ip tos ${ipParams.tos}`);
      if (ipParams.ttl && ipParams.ttl !== '') cmds.push(`${base} parameters ip ttl ${ipParams.ttl}`);

      // Parameters - IPv6
      const ipv6Params = tunnel.parameters_ipv6 || {};
      if (ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') cmds.push(`${base} parameters ipv6 encaplimit ${ipv6Params.encaplimit}`);
      if (ipv6Params.flowlabel) cmds.push(`${base} parameters ipv6 flowlabel ${ipv6Params.flowlabel}`);
      if (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null && ipv6Params.hoplimit !== undefined) cmds.push(`${base} parameters ipv6 hoplimit ${ipv6Params.hoplimit}`);
      if (ipv6Params.tclass) cmds.push(`${base} parameters ipv6 tclass ${ipv6Params.tclass}`);

      return cmds.join('\n');
    });

    function tunnelToForm(tun) {
      const addresses = Array.isArray(tun.address) ? tun.address : (tun.address ? [tun.address] : []);
      const ipv6 = tun.ipv6 || {};
      const ipv6Address = Array.isArray(ipv6.address) ? ipv6.address : (ipv6.address ? [ipv6.address] : []);
      const params = tun.parameters || {};
      const erspan = params.erspan || {};
      const ipParams = params.ip || {};
      const ipv6Params = params.ipv6 || {};
      return {
        name: tun.name || '',
        description: tun.description || '',
        encapsulation: tun.encapsulation || '',
        remote: tun.remote || '',
        source_address: tun['source-address'] || '',
        source_interface: tun['source-interface'] || '',
        address: addresses.join('\n'),
        mtu: tun.mtu || '',
        '6rd_prefix': tun['6rd-prefix'] || '',
        '6rd_relay_prefix': tun['6rd-relay-prefix'] || '',
        disable: !!tun.disable || tun.disable === '',
        disable_link_detect: !!tun['disable-link-detect'] || tun['disable-link-detect'] === '',
        enable_multicast: !!tun['enable-multicast'] || tun['enable-multicast'] === '',
        redirect: tun.redirect || '',
        vrf: tun.vrf || '',
        ip_adjust_mss: tun.ip?.['adjust-mss'] || '',
        ip_arp_cache_timeout: tun.ip?.['arp-cache-timeout'] || '',
        ip_disable_arp_filter: !!tun.ip?.['disable-arp-filter'],
        ip_disable_forwarding: !!tun.ip?.['disable-forwarding'],
        ip_enable_arp_accept: !!tun.ip?.['enable-arp-accept'],
        ip_enable_arp_announce: !!tun.ip?.['enable-arp-announce'],
        ip_enable_arp_ignore: !!tun.ip?.['enable-arp-ignore'],
        ip_enable_directed_broadcast: !!tun.ip?.['enable-directed-broadcast'],
        ip_enable_proxy_arp: !!tun.ip?.['enable-proxy-arp'],
        ip_proxy_arp_pvlan: !!tun.ip?.['proxy-arp-pvlan'],
        ip_source_validation: tun.ip?.['source-validation'] || '',
        ipv6_accept_dad: ipv6['accept-dad'] !== undefined ? String(ipv6['accept-dad']) : '1',
        ipv6_address_autoconf: ipv6Address.includes('autoconf'),
        ipv6_address_eui64: ipv6Address.find(a => typeof a === 'object' && a.eui64) || '',
        ipv6_no_default_link_local: ipv6Address.includes('no-default-link-local'),
        ipv6_adjust_mss: ipv6['adjust-mss'] || '',
        ipv6_base_reachable_time: ipv6['base-reachable-time'] || '',
        ipv6_disable_forwarding: !!ipv6['disable-forwarding'],
        ipv6_dup_addr_detect_transmits: ipv6['dup-addr-detect-transmits'] !== undefined ? String(ipv6['dup-addr-detect-transmits']) : '1',
        ipv6_source_validation: ipv6['source-validation'] || '',
        mirror_ingress: tun.mirror?.ingress || '',
        mirror_egress: tun.mirror?.egress || '',
        parameters_erspan: {
          direction: erspan.direction || '',
          hw_id: erspan['hw-id'] !== undefined ? erspan['hw-id'] : '',
          index: erspan.index !== undefined ? erspan.index : '',
          version: erspan.version || '1',
        },
        parameters_ip: {
          ignore_df: !!ipParams['ignore-df'],
          key: ipParams.key !== undefined ? ipParams.key : '',
          no_pmtu_discovery: !!ipParams['no-pmtu-discovery'],
          tos: ipParams.tos || 'inherit',
          ttl: ipParams.ttl !== undefined ? String(ipParams.ttl) : '',
        },
        parameters_ipv6: {
          encaplimit: ipv6Params.encaplimit !== undefined ? String(ipv6Params.encaplimit) : '4',
          flowlabel: ipv6Params.flowlabel || '',
          hoplimit: ipv6Params.hoplimit !== undefined ? String(ipv6Params.hoplimit) : '',
          tclass: ipv6Params.tclass || '',
        },
      };
    }

    function formToTunnel(form) {
      const value = {};
      if (form.description) value.description = form.description;
      if (form.encapsulation) value.encapsulation = form.encapsulation;
      if (form.remote) value.remote = form.remote;
      if (form.source_address) value['source-address'] = form.source_address;
      if (form.source_interface) value['source-interface'] = form.source_interface;
      const addrs = (form.address || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (addrs.length) value.address = addrs;
      if (form.mtu) value.mtu = String(form.mtu);
      if (form['6rd_prefix']) value['6rd-prefix'] = form['6rd_prefix'];
      if (form['6rd_relay_prefix']) value['6rd-relay-prefix'] = form['6rd_relay_prefix'];
      if (form.disable) value.disable = '';
      if (form.disable_link_detect) value['disable-link-detect'] = '';
      if (form.enable_multicast) value['enable-multicast'] = '';
      if (form.redirect) value.redirect = form.redirect;
      if (form.vrf) value.vrf = form.vrf;

      const ip = {};
      if (form.ip_adjust_mss) ip['adjust-mss'] = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout) ip['arp-cache-timeout'] = String(form.ip_arp_cache_timeout);
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

      const ipv6 = {};
      if (form.ipv6_accept_dad && form.ipv6_accept_dad !== '1') ipv6['accept-dad'] = form.ipv6_accept_dad;
      const ipv6Addrs = [];
      if (form.ipv6_address_autoconf) ipv6Addrs.push('autoconf');
      if (form.ipv6_address_eui64) ipv6Addrs.push({ eui64: form.ipv6_address_eui64 });
      if (form.ipv6_no_default_link_local) ipv6Addrs.push('no-default-link-local');
      if (ipv6Addrs.length) ipv6.address = ipv6Addrs;
      if (form.ipv6_adjust_mss) ipv6['adjust-mss'] = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6['base-reachable-time'] = String(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6['disable-forwarding'] = '';
      if (form.ipv6_dup_addr_detect_transmits && form.ipv6_dup_addr_detect_transmits !== '1') {
        ipv6['dup-addr-detect-transmits'] = form.ipv6_dup_addr_detect_transmits;
      }
      if (form.ipv6_source_validation) ipv6['source-validation'] = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) value.ipv6 = ipv6;

      const mirror = {};
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (Object.keys(mirror).length) value.mirror = mirror;

      // Parameters
      const parameters = {};
      const erspan = form.parameters_erspan || {};
      if (erspan.direction || erspan.hw_id !== '' || erspan.index !== '' || (erspan.version && erspan.version !== '1')) {
        const e = {};
        if (erspan.direction) e.direction = erspan.direction;
        if (erspan.hw_id !== '' && erspan.hw_id !== null && erspan.hw_id !== undefined) e['hw-id'] = erspan.hw_id;
        if (erspan.index !== '' && erspan.index !== null && erspan.index !== undefined) e.index = erspan.index;
        if (erspan.version && erspan.version !== '1') e.version = erspan.version;
        if (Object.keys(e).length) parameters.erspan = e;
      }
      const ipParams = form.parameters_ip || {};
      if (ipParams.ignore_df || ipParams.key !== '' || ipParams.no_pmtu_discovery || (ipParams.tos && ipParams.tos !== 'inherit') || (ipParams.ttl && ipParams.ttl !== '')) {
        const ip = {};
        if (ipParams.ignore_df) ip['ignore-df'] = '';
        if (ipParams.key !== '' && ipParams.key !== null && ipParams.key !== undefined) ip.key = ipParams.key;
        if (ipParams.no_pmtu_discovery) ip['no-pmtu-discovery'] = '';
        if (ipParams.tos && ipParams.tos !== 'inherit') ip.tos = ipParams.tos;
        if (ipParams.ttl && ipParams.ttl !== '') ip.ttl = ipParams.ttl;
        if (Object.keys(ip).length) parameters.ip = ip;
      }
      const ipv6Params = form.parameters_ipv6 || {};
      if ((ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') || ipv6Params.flowlabel || (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null) || ipv6Params.tclass) {
        const ipv6 = {};
        if (ipv6Params.encaplimit && ipv6Params.encaplimit !== '4') ipv6.encaplimit = ipv6Params.encaplimit;
        if (ipv6Params.flowlabel) ipv6.flowlabel = ipv6Params.flowlabel;
        if (ipv6Params.hoplimit !== '' && ipv6Params.hoplimit !== null && ipv6Params.hoplimit !== undefined) ipv6.hoplimit = ipv6Params.hoplimit;
        if (ipv6Params.tclass) ipv6.tclass = ipv6Params.tclass;
        if (Object.keys(ipv6).length) parameters.ipv6 = ipv6;
      }
      if (Object.keys(parameters).length) value.parameters = parameters;

      return value;
    }

    async function load() {
      loading.value = true;
      try {
        const [tunRes, ifRes] = await Promise.all([
          configApi.get('interfaces tunnel'),
          interfaceApi.ethernet(),
        ]);
        const tunData = tunRes.data || {};
        tunnels.value = Object.entries(tunData).map(([name, config]) => ({
          name,
          ...config,
          address: Array.isArray(config.address) ? config.address.join(', ') : (config.address || ''),
          source_address: config['source-address'] || '',
          source_interface: config['source-interface'] || '',
          disable_link_detect: !!config['disable-link-detect'],
          enable_multicast: !!config['enable-multicast'],
          '6rd_prefix': config['6rd-prefix'] || '',
          '6rd_relay_prefix': config['6rd-relay-prefix'] || '',
        }));
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface
        }));
      } catch (e) {
        showError(e.message || t('common.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function getDefaultForm() {
      return {
        name: '',
        description: '',
        encapsulation: '',
        remote: '',
        source_address: '',
        source_interface: '',
        address: '',
        mtu: '',
        '6rd_prefix': '',
        '6rd_relay_prefix': '',
        disable: false,
        disable_link_detect: false,
        enable_multicast: false,
        redirect: '',
        vrf: '',
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
        ipv6_accept_dad: '1',
        ipv6_address_autoconf: false,
        ipv6_address_eui64: '',
        ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '',
        ipv6_base_reachable_time: '',
        ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '1',
        ipv6_source_validation: '',
        mirror_ingress: '',
        mirror_egress: '',
        parameters_erspan: { direction: '', hw_id: '', index: '', version: '1' },
        parameters_ip: { ignore_df: false, key: '', no_pmtu_discovery: false, tos: 'inherit', ttl: '' },
        parameters_ipv6: { encaplimit: '4', flowlabel: '', hoplimit: '', tclass: '' },
      };
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingTunnel.value = tunnelToForm(tunnels.value[index]);
      } else {
        editingTunnel.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      if (!editingTunnel.value.name) {
        showError(t('interface.tunnel.nameRequired'));
        return;
      }
      if (!editingTunnel.value.encapsulation) {
        showError(t('interface.tunnel.encapsulationRequired'));
        return;
      }
      const config = formToTunnel(editingTunnel.value);
      try {
        await configApi.set(`interfaces tunnel ${editingTunnel.value.name}`, config);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || t('common.saveFailed'));
      }
    }

    async function remove() {
      if (selected.value.length === 0) {
        showError(t('interface.tunnel.selectTunnelFirst'));
        return;
      }
      const names = selected.value.map(s => s.name);
      try {
        await Promise.all(names.map(name => configApi.delete(`interfaces tunnel ${name}`)));
        configStore.markPending();
        selected.value = [];
        await load();
      } catch (e) {
        showError(e.message || t('common.deleteFailed'));
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {t,
      
      loading, tunnels, selected, modalVisible, editingTunnel, interfaceOptions, activeTab,
      COLUMNS,
      schema, ipSchema, ipv6Schema, mirrorSchema, parametersSchema, commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="tunnels"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal(selected[0] ? tunnels.indexOf(selected[0]) : -1)"
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
            <a @click="openModal(tunnels.indexOf(record))">{{ t('common.edit') }}</a>
            <a @click="selected = [record]; remove()" style="color: #ff4d4f; margin-left: 8px;">{{ t('common.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingTunnel?.name ? t('interface.tunnel.editTunnelInterface') : t('interface.tunnel.createTunnelInterface')"
        width="800px"
        @confirm="save"
      >
        <div v-if="editingTunnel">
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm v-model="editingTunnel" :schema="schema" />
            </template>
            <template #erspan>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_erspan', title: t('interface.tunnel.erspan_parameters'), type: 'group', children: parametersSchema[0].children }]" />
            </template>
            <template #ipParams>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_ip', title: t('interface.tunnel.ipv4_tunnel_parameters'), type: 'group', children: parametersSchema[1].children }]" />
            </template>
            <template #ipv6Params>
              <ConfigForm v-model="editingTunnel" :schema="[{ key: 'parameters_ipv6', title: t('interface.tunnel.ipv6_tunnel_parameters'), type: 'group', children: parametersSchema[2].children }]" />
            </template>
            <template #ip>
              <ConfigForm v-model="editingTunnel" :schema="ipSchema" />
            </template>
            <template #ipv6>
              <ConfigForm v-model="editingTunnel" :schema="ipv6Schema" />
            </template>
            <template #mirror>
              <ConfigForm v-model="editingTunnel" :schema="mirrorSchema" />
            </template>
          </TabGroup>
        </div>
      </DraggableModal>
    </div>
  `,
});
