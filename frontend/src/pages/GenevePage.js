import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'GenevePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();

    const COLUMNS = [
      { key: 'name', title: t('geneve.columns.name'), width: 120 },
      { key: 'description', title: t('geneve.columns.description'), width: 160 },
      { key: 'vni', title: t('geneve.columns.vni'), width: 100 },
      { key: 'remote', title: t('geneve.columns.remote'), width: 140 },
      { key: 'port', title: t('geneve.columns.port'), width: 80 },
      { key: 'mtu', title: t('geneve.columns.mtu'), width: 80 },
      { key: 'disable', title: t('geneve.columns.disable'), width: 80 },
      { key: 'actions', title: t('geneve.columns.actions'), width: 100 },
    ];

    const SOURCE_VALIDATION_OPTIONS = [
      { value: 'strict', label: t('geneve.options.sourceValidationStrict') },
      { value: 'loose', label: t('geneve.options.sourceValidationLoose') },
      { value: 'disable', label: t('geneve.options.sourceValidationDisable') },
    ];

    const ACCEPT_DAD_OPTIONS = [
      { value: '0', label: t('geneve.options.acceptDad0') },
      { value: '1', label: t('geneve.options.acceptDad1') },
      { value: '2', label: t('geneve.options.acceptDad2') },
    ];

    const loading = ref(false);
    const geneves = ref([]);
    const modalVisible = ref(false);
    const editingGeneve = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedGeneve = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('geneve.schema.basic.name'), type: 'text', required: true, placeholder: t('geneve.schema.basic.namePlaceholder'), help: t('geneve.schema.basic.nameHelp') },
      { key: 'description', title: t('geneve.schema.basic.description'), type: 'text', placeholder: t('geneve.schema.basic.descriptionPlaceholder') },
      { key: 'vni', title: t('geneve.schema.basic.vni'), type: 'number', min: 0, max: 16777214, placeholder: '0-16777214', help: t('geneve.schema.basic.vniHelp') },
      { key: 'remote', title: t('geneve.schema.basic.remote'), type: 'text', placeholder: t('geneve.schema.basic.remotePlaceholder'), help: t('geneve.schema.basic.remoteHelp') },
      { key: 'port', title: t('geneve.schema.basic.port'), type: 'number', min: 1, max: 65535, placeholder: '1-65535', help: t('geneve.schema.basic.portHelp') },
      { key: 'mac', title: t('geneve.schema.basic.mac'), type: 'text', placeholder: t('geneve.schema.basic.macPlaceholder'), help: t('geneve.schema.basic.macHelp') },
      { key: 'mtu', title: t('geneve.schema.basic.mtu'), type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: t('geneve.schema.basic.mtuHelp') },
      { key: 'disable', title: t('geneve.schema.basic.disable'), type: 'checkbox', help: t('geneve.schema.basic.disableHelp') },
    ]);

    const parametersSchema = computed(() => [
      { key: 'param_ip_key', title: t('geneve.schema.parameters.key'), type: 'number', min: 0, max: 4294967295, placeholder: '0-4294967295', help: t('geneve.schema.parameters.keyHelp') },
      { key: 'param_ip_tos', title: t('geneve.schema.parameters.tos'), type: 'number', min: 0, max: 99, placeholder: '0-99', help: t('geneve.schema.parameters.tosHelp') },
      { key: 'param_ip_ttl', title: t('geneve.schema.parameters.ttl'), type: 'number', min: 0, max: 255, placeholder: '0-255', help: t('geneve.schema.parameters.ttlHelp') },
      { key: 'param_ipv6_flowlabel', title: t('geneve.schema.parameters.flowlabel'), type: 'text', placeholder: t('geneve.schema.parameters.flowlabelPlaceholder'), help: t('geneve.schema.parameters.flowlabelHelp') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('geneve.schema.ip.adjustMss'), type: 'text', placeholder: t('geneve.schema.ip.adjustMssPlaceholder'), help: t('geneve.schema.ip.adjustMssHelp') },
      { key: 'ip_arp_cache_timeout', title: t('geneve.schema.ip.arpCacheTimeout'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('geneve.schema.ip.arpCacheTimeoutHelp') },
      { key: 'ip_disable_arp_filter', title: t('geneve.schema.ip.disableArpFilter'), type: 'checkbox', help: t('geneve.schema.ip.disableArpFilterHelp') },
      { key: 'ip_disable_forwarding', title: t('geneve.schema.ip.disableForwarding'), type: 'checkbox', help: t('geneve.schema.ip.disableForwardingHelp') },
      { key: 'ip_enable_arp_accept', title: t('geneve.schema.ip.enableArpAccept'), type: 'checkbox', help: t('geneve.schema.ip.enableArpAcceptHelp') },
      { key: 'ip_enable_arp_announce', title: t('geneve.schema.ip.enableArpAnnounce'), type: 'checkbox', help: t('geneve.schema.ip.enableArpAnnounceHelp') },
      { key: 'ip_enable_arp_ignore', title: t('geneve.schema.ip.enableArpIgnore'), type: 'checkbox', help: t('geneve.schema.ip.enableArpIgnoreHelp') },
      { key: 'ip_enable_directed_broadcast', title: t('geneve.schema.ip.enableDirectedBroadcast'), type: 'checkbox', help: t('geneve.schema.ip.enableDirectedBroadcastHelp') },
      { key: 'ip_enable_proxy_arp', title: t('geneve.schema.ip.enableProxyArp'), type: 'checkbox', help: t('geneve.schema.ip.enableProxyArpHelp') },
      { key: 'ip_proxy_arp_pvlan', title: t('geneve.schema.ip.proxyArpPvlan'), type: 'checkbox', help: t('geneve.schema.ip.proxyArpPvlanHelp') },
      { key: 'ip_source_validation', title: t('geneve.schema.ip.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('geneve.schema.ip.sourceValidationPlaceholder'), help: t('geneve.schema.ip.sourceValidationHelp') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('geneve.schema.ipv6.acceptDad'), type: 'select', options: ACCEPT_DAD_OPTIONS, help: t('geneve.schema.ipv6.acceptDadHelp') },
      { key: 'ipv6_autoconf', title: t('geneve.schema.ipv6.autoconf'), type: 'checkbox', help: t('geneve.schema.ipv6.autoconfHelp') },
      { key: 'ipv6_eui64', title: t('geneve.schema.ipv6.eui64'), type: 'text', placeholder: t('geneve.schema.ipv6.eui64Placeholder'), help: t('geneve.schema.ipv6.eui64Help') },
      { key: 'ipv6_interface_identifier', title: t('geneve.schema.ipv6.interfaceIdentifier'), type: 'text', placeholder: t('geneve.schema.ipv6.interfaceIdentifierPlaceholder'), help: t('geneve.schema.ipv6.interfaceIdentifierHelp') },
      { key: 'ipv6_no_default_link_local', title: t('geneve.schema.ipv6.noDefaultLinkLocal'), type: 'checkbox', help: t('geneve.schema.ipv6.noDefaultLinkLocalHelp') },
      { key: 'ipv6_adjust_mss', title: t('geneve.schema.ipv6.adjustMss'), type: 'text', placeholder: t('geneve.schema.ipv6.adjustMssPlaceholder'), help: t('geneve.schema.ipv6.adjustMssHelp') },
      { key: 'ipv6_base_reachable_time', title: t('geneve.schema.ipv6.baseReachableTime'), type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: t('geneve.schema.ipv6.baseReachableTimeHelp') },
      { key: 'ipv6_disable_forwarding', title: t('geneve.schema.ipv6.disableForwarding'), type: 'checkbox', help: t('geneve.schema.ipv6.disableForwardingHelp') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('geneve.schema.ipv6.dupAddrDetectTransmits'), type: 'number', min: 0, max: 100, placeholder: '0-100', help: t('geneve.schema.ipv6.dupAddrDetectTransmitsHelp') },
      { key: 'ipv6_source_validation', title: t('geneve.schema.ipv6.sourceValidation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('geneve.schema.ipv6.sourceValidationPlaceholder'), help: t('geneve.schema.ipv6.sourceValidationHelp') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('geneve.schema.mirror.egress'), type: 'select', options: interfaceOptions.value, placeholder: t('geneve.schema.mirror.targetPlaceholder'), help: t('geneve.schema.mirror.egressHelp') },
      { key: 'mirror_ingress', title: t('geneve.schema.mirror.ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('geneve.schema.mirror.targetPlaceholder'), help: t('geneve.schema.mirror.ingressHelp') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('geneve.schema.other.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('geneve.schema.other.redirectPlaceholder'), help: t('geneve.schema.other.redirectHelp') },
      { key: 'vrf', title: t('geneve.schema.other.vrf'), type: 'text', placeholder: t('geneve.schema.other.vrfPlaceholder'), help: t('geneve.schema.other.vrfHelp') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingGeneve.value) return '';
      const g = editingGeneve.value;
      const name = g.name || 'gnvN';
      const lines = [];

      if (g.description) lines.push(`set interfaces geneve ${name} description "${g.description}"`);
      if (g.vni !== '' && g.vni !== null && g.vni !== undefined) lines.push(`set interfaces geneve ${name} vni ${g.vni}`);
      if (g.remote) lines.push(`set interfaces geneve ${name} remote ${g.remote}`);
      if (g.port) lines.push(`set interfaces geneve ${name} port ${g.port}`);
      if (g.mac) lines.push(`set interfaces geneve ${name} mac ${g.mac}`);
      if (g.mtu) lines.push(`set interfaces geneve ${name} mtu ${g.mtu}`);
      if (g.disable) lines.push(`set interfaces geneve ${name} disable`);

      // Parameters
      if (g.param_ip_key !== '' && g.param_ip_key !== null && g.param_ip_key !== undefined) lines.push(`set interfaces geneve ${name} parameters ip key ${g.param_ip_key}`);
      if (g.param_ip_tos !== '' && g.param_ip_tos !== null && g.param_ip_tos !== undefined) lines.push(`set interfaces geneve ${name} parameters ip tos ${g.param_ip_tos}`);
      if (g.param_ip_ttl !== '' && g.param_ip_ttl !== null && g.param_ip_ttl !== undefined) lines.push(`set interfaces geneve ${name} parameters ip ttl ${g.param_ip_ttl}`);
      if (g.param_ipv6_flowlabel) lines.push(`set interfaces geneve ${name} parameters ipv6 flowlabel ${g.param_ipv6_flowlabel}`);

      // IP
      if (g.ip_adjust_mss) lines.push(`set interfaces geneve ${name} ip adjust-mss ${g.ip_adjust_mss}`);
      if (g.ip_arp_cache_timeout) lines.push(`set interfaces geneve ${name} ip arp-cache-timeout ${g.ip_arp_cache_timeout}`);
      if (g.ip_disable_arp_filter) lines.push(`set interfaces geneve ${name} ip disable-arp-filter`);
      if (g.ip_disable_forwarding) lines.push(`set interfaces geneve ${name} ip disable-forwarding`);
      if (g.ip_enable_arp_accept) lines.push(`set interfaces geneve ${name} ip enable-arp-accept`);
      if (g.ip_enable_arp_announce) lines.push(`set interfaces geneve ${name} ip enable-arp-announce`);
      if (g.ip_enable_arp_ignore) lines.push(`set interfaces geneve ${name} ip enable-arp-ignore`);
      if (g.ip_enable_directed_broadcast) lines.push(`set interfaces geneve ${name} ip enable-directed-broadcast`);
      if (g.ip_enable_proxy_arp) lines.push(`set interfaces geneve ${name} ip enable-proxy-arp`);
      if (g.ip_proxy_arp_pvlan) lines.push(`set interfaces geneve ${name} ip proxy-arp-pvlan`);
      if (g.ip_source_validation) lines.push(`set interfaces geneve ${name} ip source-validation ${g.ip_source_validation}`);

      // IPv6
      if (g.ipv6_accept_dad && g.ipv6_accept_dad !== '1') lines.push(`set interfaces geneve ${name} ipv6 accept-dad ${g.ipv6_accept_dad}`);
      if (g.ipv6_autoconf) lines.push(`set interfaces geneve ${name} ipv6 address autoconf`);
      if (g.ipv6_eui64) lines.push(`set interfaces geneve ${name} ipv6 address eui64 ${g.ipv6_eui64}`);
      if (g.ipv6_interface_identifier) lines.push(`set interfaces geneve ${name} ipv6 address interface-identifier ${g.ipv6_interface_identifier}`);
      if (g.ipv6_no_default_link_local) lines.push(`set interfaces geneve ${name} ipv6 address no-default-link-local`);
      if (g.ipv6_adjust_mss) lines.push(`set interfaces geneve ${name} ipv6 adjust-mss ${g.ipv6_adjust_mss}`);
      if (g.ipv6_base_reachable_time) lines.push(`set interfaces geneve ${name} ipv6 base-reachable-time ${g.ipv6_base_reachable_time}`);
      if (g.ipv6_disable_forwarding) lines.push(`set interfaces geneve ${name} ipv6 disable-forwarding`);
      if (g.ipv6_dup_addr_detect_transmits !== '' && g.ipv6_dup_addr_detect_transmits !== null && g.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces geneve ${name} ipv6 dup-addr-detect-transmits ${g.ipv6_dup_addr_detect_transmits}`);
      if (g.ipv6_source_validation) lines.push(`set interfaces geneve ${name} ipv6 source-validation ${g.ipv6_source_validation}`);

      // Mirror
      if (g.mirror_egress) lines.push(`set interfaces geneve ${name} mirror egress ${g.mirror_egress}`);
      if (g.mirror_ingress) lines.push(`set interfaces geneve ${name} mirror ingress ${g.mirror_ingress}`);

      // Other
      if (g.redirect) lines.push(`set interfaces geneve ${name} redirect ${g.redirect}`);
      if (g.vrf) lines.push(`set interfaces geneve ${name} vrf ${g.vrf}`);

      return lines.length ? lines.join('\n') : t('geneve.command.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('geneve.tabs.basic') },
      { key: 'parameters', title: t('geneve.tabs.parameters') },
      { key: 'ip', title: t('geneve.tabs.ip') },
      { key: 'ipv6', title: t('geneve.tabs.ipv6') },
      { key: 'mirror', title: t('geneve.tabs.mirror') },
      { key: 'other', title: t('geneve.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', vni: '', remote: '',
        port: '', mac: '', mtu: '', disable: false,
        param_ip_key: '', param_ip_tos: '', param_ip_ttl: '', param_ipv6_flowlabel: '',
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

    function geneveToForm(g) {
      return {
        name: g.name || '',
        description: g.description || '',
        vni: g.vni !== undefined ? g.vni : '',
        remote: g.remote || '',
        port: g.port || '',
        mac: g.mac || '',
        mtu: g.mtu || '',
        disable: !!g.disable,
        param_ip_key: g.parameters?.ip?.key !== undefined ? g.parameters.ip.key : '',
        param_ip_tos: g.parameters?.ip?.tos !== undefined ? g.parameters.ip.tos : '',
        param_ip_ttl: g.parameters?.ip?.ttl !== undefined ? g.parameters.ip.ttl : '',
        param_ipv6_flowlabel: g.parameters?.ipv6?.flowlabel || '',
        ip_adjust_mss: g.ip?.adjust_mss || '',
        ip_arp_cache_timeout: g.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!g.ip?.disable_arp_filter,
        ip_disable_forwarding: !!g.ip?.disable_forwarding,
        ip_enable_arp_accept: !!g.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!g.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!g.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!g.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!g.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!g.ip?.proxy_arp_pvlan,
        ip_source_validation: g.ip?.source_validation || '',
        ipv6_accept_dad: g.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!g.ipv6?.address?.autoconf,
        ipv6_eui64: g.ipv6?.address?.eui64 || '',
        ipv6_interface_identifier: g.ipv6?.address?.interface_identifier || '',
        ipv6_no_default_link_local: !!g.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: g.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: g.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!g.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: g.ipv6?.dup_addr_detect_transmits !== undefined ? g.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: g.ipv6?.source_validation || '',
        mirror_egress: g.mirror?.egress || '',
        mirror_ingress: g.mirror?.ingress || '',
        redirect: g.redirect || '',
        vrf: g.vrf || '',
      };
    }

    function formToGeneve(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.vni !== '' && form.vni !== null && form.vni !== undefined) result.vni = Number(form.vni);
      if (form.remote) result.remote = form.remote;
      if (form.port) result.port = Number(form.port);
      if (form.mac) result.mac = form.mac;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      // Parameters
      const params = {};
      const ipParam = {};
      if (form.param_ip_key !== '' && form.param_ip_key !== null && form.param_ip_key !== undefined) ipParam.key = Number(form.param_ip_key);
      if (form.param_ip_tos !== '' && form.param_ip_tos !== null && form.param_ip_tos !== undefined) ipParam.tos = Number(form.param_ip_tos);
      if (form.param_ip_ttl !== '' && form.param_ip_ttl !== null && form.param_ip_ttl !== undefined) ipParam.ttl = Number(form.param_ip_ttl);
      if (Object.keys(ipParam).length) params.ip = ipParam;

      const ipv6Param = {};
      if (form.param_ipv6_flowlabel) ipv6Param.flowlabel = form.param_ipv6_flowlabel;
      if (Object.keys(ipv6Param).length) params.ipv6 = ipv6Param;

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
        const res = await api.get('/config', { path: 'interfaces geneve' });
        const cfg = res.data || {};
        geneves.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          vni: val.vni !== undefined ? val.vni : '',
          remote: val.remote || '',
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
      } catch (err) {
        handleError(err);
      } finally {
        loading.value = false;
      }
    }

    function handleError(err) {
      showError({ message: `${t('geneve.error.code')}: ${err.code || 'ERROR'}\n${t('geneve.error.message')}: ${err.message || err}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingGeneve.value = geneveToForm(geneves.value[index]);
      } else {
        editingGeneve.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingGeneve.value;
        const name = form.name;
        if (!name) return showError({ message: t('geneve.error.nameRequired') });

        const config = formToGeneve(form);
        console.log('[Geneve] Save config:', JSON.stringify(config, null, 2));

        const path = `interfaces geneve ${name}`;
        await configStore.setConfig(path, config);
        configStore.markPending();

        modalVisible.value = false;
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    function remove() {
      if (!selectedGeneve.value.length) return showError({ message: t('geneve.error.selectForDelete') });
      pendingDeleteNames.value = selectedGeneve.value.map(g => g.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces geneve ${name}`);
          configStore.markPending();
        }
        selectedGeneve.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, geneves, selected: selectedGeneve, modalVisible, editingGeneve, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, parametersSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="geneves"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingGeneve?.name ? t('geneve.modal.editTitle') : t('geneve.modal.createTitle')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingGeneve" />
            </template>
            <template #parameters>
              <ConfigForm :schema="parametersSchema" :model="editingGeneve" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingGeneve" />
            </template>
            <template #ipv6>
              <ConfigForm :schema="ipv6Schema" :model="editingGeneve" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingGeneve" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingGeneve" />
            </template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('geneve.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('geneve.buttons.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('geneve.delete.title')" width="400px" @confirm="confirmRemove">
        <div>{{ t('geneve.delete.confirmMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
