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
import { dhcpv6ConfigToForm, dhcpv6FormToConfig, dhcpv6ToCommands, DHCPV6_DEFAULTS } from '/src/utils/dhcpv6Common.js';

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
  name: 'PPPoEPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const pppoes = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingPPPoE = ref(null);
    const interfaceOptions = ref([]);
    const vrfOptions = ref([]);
    const activeTab = ref('basic');
    const selectedPPPoEs = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('pppoe.columns.name'), width: 120 },
      { key: 'description', title: t('pppoe.columns.description'), width: 160 },
      { key: 'username', title: t('pppoe.columns.username'), width: 120 },
      { key: 'source_interface', title: t('pppoe.columns.source_interface'), width: 120 },
      { key: 'remote_address', title: t('pppoe.columns.remote_address'), width: 140 },
      { key: 'mtu', title: 'MTU', width: 80 },
      { key: 'mru', title: 'MRU', width: 80 },
      { key: 'disable', title: t('pppoe.columns.disable'), width: 80 },
      { key: 'actions', title: t('pppoe.columns.actions'), width: 100 },
    ]);

    const SOURCE_VALIDATION_OPTIONS = computed(() => [
      { value: 'strict', label: t('pppoe.source_validation.strict') },
      { value: 'loose', label: t('pppoe.source_validation.loose') },
      { value: 'disable', label: t('pppoe.source_validation.disable') },
    ]);

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('pppoe.columns.name'), type: 'text', required: true, placeholder: t('pppoe.form.name_placeholder'), help: t('pppoe.form.name_help') },
      { key: 'description', title: t('pppoe.columns.description'), type: 'text', placeholder: t('pppoe.form.description_placeholder') },
      { key: 'source_interface', title: t('pppoe.columns.source_interface'), type: 'select', options: interfaceOptions.value, placeholder: t('pppoe.form.source_interface_placeholder'), help: t('pppoe.form.source_interface_help') },
      { key: 'access_concentrator', title: t('pppoe.form.access_concentrator'), type: 'text', placeholder: t('pppoe.form.access_concentrator_placeholder'), help: t('pppoe.form.access_concentrator_help') },
      { key: 'service_name', title: t('pppoe.form.service_name'), type: 'text', placeholder: t('pppoe.form.service_name_placeholder'), help: t('pppoe.form.service_name_help') },
      { key: 'authentication_username', title: t('pppoe.columns.username'), type: 'text', placeholder: t('pppoe.form.auth_username_placeholder') },
      { key: 'authentication_password', title: t('pppoe.form.password'), type: 'password', placeholder: t('pppoe.form.auth_password_placeholder') },
      { key: 'remote_address', title: t('pppoe.columns.remote_address'), type: 'text', placeholder: t('pppoe.form.remote_address_placeholder'), help: t('pppoe.form.remote_address_help') },
      { key: 'local_address', title: t('pppoe.form.local_address'), type: 'text', placeholder: t('pppoe.form.local_address_placeholder'), help: t('pppoe.form.local_address_help') },
      { key: 'host_uniq', title: 'Host-uniq', type: 'text', placeholder: t('pppoe.form.host_uniq_placeholder'), help: t('pppoe.form.host_uniq_help') },
      { key: 'connect_on_demand', title: t('pppoe.form.connect_on_demand'), type: 'checkbox', help: t('pppoe.form.connect_on_demand_help') },
      { key: 'no_default_route', title: t('pppoe.form.no_default_route'), type: 'checkbox', help: t('pppoe.form.no_default_route_help') },
      { key: 'no_peer_dns', title: t('pppoe.form.no_peer_dns'), type: 'checkbox', help: t('pppoe.form.no_peer_dns_help') },
      { key: 'mru', title: 'MRU', type: 'number', min: 128, max: 16384, placeholder: '128-16384', help: t('pppoe.form.mru_help') },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 1500, placeholder: '68-1500', help: t('pppoe.form.mtu_help') },
      { key: 'holdoff', title: t('pppoe.form.holdoff'), type: 'number', min: 0, max: 86400, placeholder: '0-86400', help: t('pppoe.form.holdoff_help') },
      { key: 'idle_timeout', title: t('pppoe.form.idle_timeout'), type: 'number', min: 0, max: 86400, placeholder: '0-86400', help: t('pppoe.form.idle_timeout_help') },
      { key: 'default_route_distance', title: t('pppoe.form.default_route_distance'), type: 'number', min: 1, max: 255, placeholder: '1-255', help: t('pppoe.form.default_route_distance_help') },
      { key: 'disable', title: t('pppoe.form.disable_interface'), type: 'checkbox', help: t('pppoe.form.disable_interface_help') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('pppoe.form.dhcp_client_id'), type: 'text', placeholder: t('pppoe.form.dhcp_option_string'), help: t('pppoe.form.dhcp_client_id_help') },
      { key: 'dhcp_default_route_distance', title: t('pppoe.form.default_route_distance'), type: 'number', min: 1, max: 255, placeholder: '1-255', help: t('pppoe.form.dhcp_default_route_distance_help') },
      { key: 'dhcp_host_name', title: t('pppoe.form.dhcp_host_name'), type: 'text', placeholder: t('pppoe.form.dhcp_host_name_placeholder'), help: t('pppoe.form.dhcp_host_name_help') },
      { key: 'dhcp_mtu', title: t('pppoe.form.dhcp_mtu'), type: 'checkbox', help: t('pppoe.form.dhcp_mtu_help') },
      { key: 'dhcp_no_default_route', title: t('pppoe.form.no_default_route'), type: 'checkbox', help: t('pppoe.form.no_default_route_help') },
      { key: 'dhcp_reject', title: t('pppoe.form.dhcp_reject'), type: 'textarea', placeholder: t('pppoe.form.dhcp_reject_placeholder'), help: t('pppoe.form.dhcp_reject_help') },
      { key: 'dhcp_user_class', title: t('pppoe.form.dhcp_user_class'), type: 'text', placeholder: t('pppoe.form.dhcp_option_string'), help: t('pppoe.form.dhcp_user_class_help') },
      { key: 'dhcp_vendor_class_id', title: t('pppoe.form.dhcp_vendor_class_id'), type: 'text', placeholder: t('pppoe.form.dhcp_option_string'), help: t('pppoe.form.dhcp_vendor_class_id_help') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('pppoe.form.dhcpv6_duid'), type: 'text', placeholder: t('pppoe.form.dhcpv6_duid_placeholder') },
      { key: 'dhcpv6_no_release', title: t('pppoe.form.dhcpv6_no_release'), type: 'checkbox', help: t('pppoe.form.dhcpv6_no_release_help') },
      { key: 'dhcpv6_no_request_dns', title: t('pppoe.form.dhcpv6_no_request_dns'), type: 'checkbox', help: t('pppoe.form.dhcpv6_no_request_dns_help') },
      { key: 'dhcpv6_no_request_domain_name', title: t('pppoe.form.dhcpv6_no_request_domain_name'), type: 'checkbox', help: t('pppoe.form.dhcpv6_no_request_domain_name_help') },
      { key: 'dhcpv6_parameters_only', title: t('pppoe.form.dhcpv6_parameters_only'), type: 'checkbox', help: t('pppoe.form.dhcpv6_parameters_only_help') },
      { key: 'dhcpv6_rapid_commit', title: t('pppoe.form.dhcpv6_rapid_commit'), type: 'checkbox', help: t('pppoe.form.dhcpv6_rapid_commit_help') },
      { key: 'dhcpv6_temporary', title: t('pppoe.form.dhcpv6_temporary'), type: 'checkbox', help: t('pppoe.form.dhcpv6_temporary_help') },
      { key: 'dhcpv6_pd_instances', title: t('pppoe.form.dhcpv6_pd_instances'), type: 'textarea', placeholder: t('pppoe.form.dhcpv6_pd_instances_placeholder'), help: t('pppoe.form.dhcpv6_pd_instances_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('pppoe.form.adjust_mss'), type: 'text', placeholder: t('pppoe.form.adjust_mss_placeholder'), help: t('pppoe.form.adjust_mss_help') },
      { key: 'ip_disable_forwarding', title: t('pppoe.form.disable_forwarding'), type: 'checkbox', help: t('pppoe.form.disable_forwarding_help') },
      { key: 'ip_source_validation', title: t('pppoe.form.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.value, placeholder: t('pppoe.form.source_validation_placeholder'), help: t('pppoe.form.source_validation_help') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_autoconf', title: t('pppoe.form.ipv6_autoconf'), type: 'checkbox', help: t('pppoe.form.ipv6_autoconf_help') },
      { key: 'ipv6_interface_identifier', title: t('pppoe.form.ipv6_interface_identifier'), type: 'text', placeholder: t('pppoe.form.ipv6_interface_identifier_placeholder'), help: t('pppoe.form.ipv6_interface_identifier_help') },
      { key: 'ipv6_adjust_mss', title: t('pppoe.form.adjust_mss'), type: 'text', placeholder: t('pppoe.form.adjust_mss_placeholder'), help: t('pppoe.form.adjust_mss_help') },
      { key: 'ipv6_disable_forwarding', title: t('pppoe.form.disable_forwarding'), type: 'checkbox', help: t('pppoe.form.disable_forwarding_ipv6_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('pppoe.form.mirror_egress'), type: 'select', options: interfaceOptions.value, placeholder: t('pppoe.form.mirror_target_placeholder'), help: t('pppoe.form.mirror_egress_help') },
      { key: 'mirror_ingress', title: t('pppoe.form.mirror_ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('pppoe.form.mirror_target_placeholder'), help: t('pppoe.form.mirror_ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('pppoe.form.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('pppoe.form.redirect_placeholder'), help: t('pppoe.form.redirect_help') },
      { key: 'vrf', title: t('pppoe.form.vrf_instance'), type: 'select', options: [{ value: '', label: '' }, ...vrfOptions.value], placeholder: t('pppoe.form.vrf_instance_placeholder'), help: t('pppoe.form.vrf_instance_help') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingPPPoE.value) return '';
      const p = editingPPPoE.value;
      const name = p.name || 'pppoeN';
      const lines = [];

      if (p.description) lines.push(`set interfaces pppoe ${name} description "${p.description}"`);
      if (p.source_interface) lines.push(`set interfaces pppoe ${name} source-interface ${p.source_interface}`);
      if (p.access_concentrator) lines.push(`set interfaces pppoe ${name} access-concentrator ${p.access_concentrator}`);
      if (p.service_name) lines.push(`set interfaces pppoe ${name} service-name ${p.service_name}`);
      if (p.authentication_username) lines.push(`set interfaces pppoe ${name} authentication username ${p.authentication_username}`);
      if (p.authentication_password) lines.push(`set interfaces pppoe ${name} authentication password ${p.authentication_password}`);
      if (p.remote_address) lines.push(`set interfaces pppoe ${name} remote-address ${p.remote_address}`);
      if (p.local_address) lines.push(`set interfaces pppoe ${name} local-address ${p.local_address}`);
      if (p.host_uniq) lines.push(`set interfaces pppoe ${name} host-uniq ${p.host_uniq}`);
      if (p.connect_on_demand) lines.push(`set interfaces pppoe ${name} connect-on-demand`);
      if (p.no_default_route) lines.push(`set interfaces pppoe ${name} no-default-route`);
      if (p.no_peer_dns) lines.push(`set interfaces pppoe ${name} no-peer-dns`);
      if (p.mru) lines.push(`set interfaces pppoe ${name} mru ${p.mru}`);
      if (p.mtu) lines.push(`set interfaces pppoe ${name} mtu ${p.mtu}`);
      if (p.holdoff !== undefined && p.holdoff !== null) lines.push(`set interfaces pppoe ${name} holdoff ${p.holdoff}`);
      if (p.idle_timeout !== undefined && p.idle_timeout !== null) lines.push(`set interfaces pppoe ${name} idle-timeout ${p.idle_timeout}`);
      if (p.default_route_distance) lines.push(`set interfaces pppoe ${name} default-route-distance ${p.default_route_distance}`);
      if (p.disable) lines.push(`set interfaces pppoe ${name} disable`);

      // DHCP
      if (p.dhcp_client_id) lines.push(`set interfaces pppoe ${name} dhcp-options client-id ${p.dhcp_client_id}`);
      if (p.dhcp_default_route_distance) lines.push(`set interfaces pppoe ${name} dhcp-options default-route-distance ${p.dhcp_default_route_distance}`);
      if (p.dhcp_host_name) lines.push(`set interfaces pppoe ${name} dhcp-options host-name ${p.dhcp_host_name}`);
      if (p.dhcp_mtu) lines.push(`set interfaces pppoe ${name} dhcp-options mtu`);
      if (p.dhcp_no_default_route) lines.push(`set interfaces pppoe ${name} dhcp-options no-default-route`);
      if (p.dhcp_reject) {
        (p.dhcp_reject || '').split('\n').filter(Boolean).forEach(ip => {
          lines.push(`set interfaces pppoe ${name} dhcp-options reject ${ip.trim()}`);
        });
      }
      if (p.dhcp_user_class) lines.push(`set interfaces pppoe ${name} dhcp-options user-class ${p.dhcp_user_class}`);
      if (p.dhcp_vendor_class_id) lines.push(`set interfaces pppoe ${name} dhcp-options vendor-class-id ${p.dhcp_vendor_class_id}`);

      // DHCPv6
      lines.push(...dhcpv6ToCommands(p, 'pppoe', name));

      // IP
      if (p.ip_adjust_mss) lines.push(`set interfaces pppoe ${name} ip adjust-mss ${p.ip_adjust_mss}`);
      if (p.ip_disable_forwarding) lines.push(`set interfaces pppoe ${name} ip disable-forwarding`);
      if (p.ip_source_validation) lines.push(`set interfaces pppoe ${name} ip source-validation ${p.ip_source_validation}`);

      // IPv6
      if (p.ipv6_autoconf) lines.push(`set interfaces pppoe ${name} ipv6 address autoconf`);
      if (p.ipv6_interface_identifier) lines.push(`set interfaces pppoe ${name} ipv6 address interface-identifier ${p.ipv6_interface_identifier}`);
      if (p.ipv6_adjust_mss) lines.push(`set interfaces pppoe ${name} ipv6 adjust-mss ${p.ipv6_adjust_mss}`);
      if (p.ipv6_disable_forwarding) lines.push(`set interfaces pppoe ${name} ipv6 disable-forwarding`);

      // Mirror
      if (p.mirror_egress) lines.push(`set interfaces pppoe ${name} mirror egress ${p.mirror_egress}`);
      if (p.mirror_ingress) lines.push(`set interfaces pppoe ${name} mirror ingress ${p.mirror_ingress}`);

      // Other
      if (p.redirect) lines.push(`set interfaces pppoe ${name} redirect ${p.redirect}`);
      if (p.vrf) lines.push(`set interfaces pppoe ${name} vrf ${p.vrf}`);

      return lines.length ? lines.join('\n') : t('pppoe.command.no_config');
    });

    // Dynamic tabs
    const modalTabs = computed(() => [
      { key: 'basic', title: t('pppoe.tabs.basic'), schema: basicSchema.value },
      { key: 'dhcp', title: 'DHCP', schema: dhcpSchema.value },
      { key: 'dhcpv6', title: 'DHCPv6', schema: dhcpv6Schema.value },
      { key: 'ip', title: t('pppoe.tabs.ipv4_params'), schema: ipSchema.value },
      { key: 'ipv6', title: t('pppoe.tabs.ipv6_params'), schema: ipv6Schema.value },
      { key: 'mirror', title: t('pppoe.tabs.mirror'), schema: mirrorSchema.value },
      { key: 'other', title: t('pppoe.tabs.other'), schema: otherSchema.value },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', source_interface: '', access_concentrator: '',
        service_name: '', authentication_username: '', authentication_password: '',
        remote_address: '', local_address: '', host_uniq: '',
        connect_on_demand: false, no_default_route: false, no_peer_dns: false,
        mru: '', mtu: '', holdoff: '', idle_timeout: '', default_route_distance: '',
        disable: false,
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        ...DHCPV6_DEFAULTS,
        dhcpv6_pd_instances: '',
        ip_adjust_mss: '', ip_disable_forwarding: false, ip_source_validation: '',
        ipv6_autoconf: false, ipv6_interface_identifier: '', ipv6_adjust_mss: '',
        ipv6_disable_forwarding: false,
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function pppoeToForm(p) {
      return {
        name: p.name || '',
        description: p.description || '',
        source_interface: p.source_interface || p['source-interface'] || '',
        access_concentrator: p.access_concentrator || p['access-concentrator'] || '',
        service_name: p.service_name || p['service-name'] || '',
        authentication_username: p.authentication?.username || '',
        authentication_password: p.authentication?.password || '',
        remote_address: p.remote_address || p['remote-address'] || '',
        local_address: p.local_address || p['local-address'] || '',
        host_uniq: p.host_uniq || p['host-uniq'] || '',
        connect_on_demand: !!(p.connect_on_demand || p['connect-on-demand']),
        no_default_route: !!(p.no_default_route || p['no-default-route']),
        no_peer_dns: !!(p.no_peer_dns || p['no-peer-dns']),
        mru: p.mru || '',
        mtu: p.mtu || '',
        holdoff: p.holdoff !== undefined ? p.holdoff : '',
        idle_timeout: p.idle_timeout !== undefined ? p.idle_timeout : (p['idle-timeout'] !== undefined ? p['idle-timeout'] : ''),
        default_route_distance: p.default_route_distance || p['default-route-distance'] || '',
        disable: !!p.disable,
        dhcp_client_id: (p.dhcp_options || p['dhcp-options'])?.client_id || (p.dhcp_options || p['dhcp-options'])?.['client-id'] || '',
        dhcp_default_route_distance: (p.dhcp_options || p['dhcp-options'])?.default_route_distance || (p.dhcp_options || p['dhcp-options'])?.['default-route-distance'] || '',
        dhcp_host_name: (p.dhcp_options || p['dhcp-options'])?.host_name || (p.dhcp_options || p['dhcp-options'])?.['host-name'] || '',
        dhcp_mtu: !!(p.dhcp_options || p['dhcp-options'])?.mtu,
        dhcp_no_default_route: !!((p.dhcp_options || p['dhcp-options'])?.no_default_route || (p.dhcp_options || p['dhcp-options'])?.['no-default-route']),
        dhcp_reject: (() => {
          const reject = (p.dhcp_options || p['dhcp-options'])?.reject;
          return Array.isArray(reject) ? reject.join('\n') : (reject || '');
        })(),
        dhcp_user_class: (p.dhcp_options || p['dhcp-options'])?.user_class || (p.dhcp_options || p['dhcp-options'])?.['user-class'] || '',
        dhcp_vendor_class_id: (p.dhcp_options || p['dhcp-options'])?.vendor_class_id || (p.dhcp_options || p['dhcp-options'])?.['vendor-class-id'] || '',
        ...dhcpv6ConfigToForm(p.dhcpv6_options || p['dhcpv6-options']),
        dhcpv6_pd_instances: formatJson((p.dhcpv6_options || p['dhcpv6-options'])?.pd || {}),
        ip_adjust_mss: p.ip?.adjust_mss || p.ip?.['adjust-mss'] || '',
        ip_disable_forwarding: !!(p.ip?.disable_forwarding || p.ip?.['disable-forwarding']),
        ip_source_validation: p.ip?.source_validation || p.ip?.['source-validation'] || '',
        ipv6_autoconf: !!p.ipv6?.address?.autoconf,
        ipv6_interface_identifier: p.ipv6?.address?.interface_identifier || p.ipv6?.address?.['interface-identifier'] || '',
        ipv6_adjust_mss: p.ipv6?.adjust_mss || p.ipv6?.['adjust-mss'] || '',
        ipv6_disable_forwarding: !!(p.ipv6?.disable_forwarding || p.ipv6?.['disable-forwarding']),
        mirror_egress: p.mirror?.egress || '',
        mirror_ingress: p.mirror?.ingress || '',
        redirect: p.redirect || '',
        vrf: p.vrf || '',
      };
    }

    function formToPPPoE(form) {
      const result = {};
      if (form.description) result.description = form.description;
      if (form.source_interface) result['source-interface'] = form.source_interface;
      if (form.access_concentrator) result['access-concentrator'] = form.access_concentrator;
      if (form.service_name) result['service-name'] = form.service_name;
      if (form.authentication_username || form.authentication_password) {
        result.authentication = {};
        if (form.authentication_username) result.authentication.username = form.authentication_username;
        if (form.authentication_password) result.authentication.password = form.authentication_password;
      }
      if (form.remote_address) result['remote-address'] = form.remote_address;
      if (form.local_address) result['local-address'] = form.local_address;
      if (form.host_uniq) result['host-uniq'] = form.host_uniq;
      if (form.connect_on_demand) result['connect-on-demand'] = true;
      if (form.no_default_route) result['no-default-route'] = true;
      if (form.no_peer_dns) result['no-peer-dns'] = true;
      if (form.mru) result.mru = Number(form.mru);
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.holdoff !== '' && form.holdoff !== null && form.holdoff !== undefined) result.holdoff = Number(form.holdoff);
      if (form.idle_timeout !== '' && form.idle_timeout !== null && form.idle_timeout !== undefined) result['idle-timeout'] = Number(form.idle_timeout);
      if (form.default_route_distance) result['default-route-distance'] = Number(form.default_route_distance);
      if (form.disable) result.disable = true;

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp['client-id'] = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp['default-route-distance'] = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp['host-name'] = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp['no-default-route'] = true;
      if (form.dhcp_reject) {
        dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      }
      if (form.dhcp_user_class) dhcp['user-class'] = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp['vendor-class-id'] = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result['dhcp-options'] = dhcp;

      // DHCPv6
      const d6 = dhcpv6FormToConfig(form) || {};
      if (form.dhcpv6_pd_instances) {
        const pd = safeJsonParse(form.dhcpv6_pd_instances);
        if (Object.keys(pd).length) d6.pd = pd;
      }
      if (Object.keys(d6).length) result['dhcpv6-options'] = d6;

      // IP
      const ip = {};
      if (form.ip_adjust_mss) ip['adjust-mss'] = form.ip_adjust_mss;
      if (form.ip_disable_forwarding) ip['disable-forwarding'] = true;
      if (form.ip_source_validation) ip['source-validation'] = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      // IPv6
      const ipv6 = {};
      if (form.ipv6_autoconf || form.ipv6_interface_identifier) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_interface_identifier) addr['interface-identifier'] = form.ipv6_interface_identifier;
        ipv6.address = addr;
      }
      if (form.ipv6_adjust_mss) ipv6['adjust-mss'] = form.ipv6_adjust_mss;
      if (form.ipv6_disable_forwarding) ipv6['disable-forwarding'] = true;
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
        const res = await api.get('/config', { path: 'interfaces pppoe' });
        const cfg = res.data || {};
        pppoes.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          username: val.authentication?.username || '',
          source_interface: val.source_interface || '',
          remote_address: val.remote_address || '',
          mtu: val.mtu || '',
          mru: val.mru || '',
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
          const vrfNameData = vrfData.name || vrfData;
          vrfOptions.value = Object.keys(vrfNameData)
            .filter(name => typeof vrfNameData[name] === 'object')
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
      showError({ message: `${t('pppoe.error.code')}: ${err.code || 'ERROR'}\n${t('pppoe.error.message')}: ${err.message || err}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingPPPoE.value = pppoeToForm(pppoes.value[index]);
      } else {
        editingPPPoE.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function openModalByRow(row) {
      if (!row) {
        openModal(-1);
        return;
      }
      const index = pppoes.value.findIndex(p => p.name === row.name);
      openModal(index);
    }

    async function save() {
      try {
        const form = editingPPPoE.value;
        const name = form.name;
        if (!name) { showError({ message: t('pppoe.error.name_required') }); return; }

        const config = formToPPPoE(form);
        console.log('[PPPoE] Save config:', JSON.stringify(config, null, 2));

        const path = `interfaces pppoe ${name}`;
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
      if (!selectedPPPoEs.value.length) { showError({ message: t('pppoe.error.select_delete') }); return; }
      pendingDeleteNames.value = selectedPPPoEs.value.map(p => p.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces pppoe ${name}`);
          configStore.markPending();
        }
        selectedPPPoEs.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {
      loading, pppoes, selected: selectedPPPoEs, modalVisible, editingPPPoE, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, openModalByRow, save, remove, confirmRemove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="pppoes"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModalByRow($event)"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingPPPoE?.name ? t('pppoe.modal.edit_title') : t('pppoe.modal.create_title')" width="900px" @confirm="save">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template v-for="tab in modalTabs" :key="tab.key" #[tab.key]>
              <ConfigForm v-if="tab.schema" v-model="editingPPPoE" :schema="tab.schema" />
            </template>
          </TabGroup>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('pppoe.modal.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('pppoe.modal.confirm_delete_message') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
