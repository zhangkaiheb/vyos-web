import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'VirtualEthernetPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const veths = ref([]);
    const modalVisible = ref(false);
    const editingVeth = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVeth = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('veth.columns.name'), width: 120 },
      { key: 'description', title: t('veth.columns.description'), width: 160 },
      { key: 'peer_name', title: t('veth.columns.peerName'), width: 120 },
      { key: 'mtu', title: t('veth.columns.mtu'), width: 80 },
      { key: 'netns', title: t('veth.columns.netns'), width: 120 },
      { key: 'vif_count', title: t('veth.columns.vifCount'), width: 80 },
      { key: 'disable', title: t('veth.columns.disable'), width: 80 },
      { key: 'actions', title: t('veth.columns.actions'), width: 100 },
    ]);

    function formatJson(obj) {
      if (!obj) return '';
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

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('veth.labels.name'), type: 'text', required: true, placeholder: t('veth.placeholders.name'), help: t('veth.help.name') },
      { key: 'description', title: t('veth.labels.description'), type: 'text', placeholder: t('veth.placeholders.description') },
      { key: 'address', title: t('veth.labels.address'), type: 'textarea', placeholder: t('veth.placeholders.address'), help: t('veth.help.address') },
      { key: 'peer_name', title: t('veth.labels.peerName'), type: 'text', placeholder: t('veth.placeholders.peerName'), help: t('veth.help.peerName') },
      { key: 'mtu', title: t('veth.labels.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('veth.placeholders.mtu'), help: t('veth.help.mtu') },
      { key: 'netns', title: t('veth.labels.netns'), type: 'text', placeholder: t('veth.placeholders.netns'), help: t('veth.help.netns') },
      { key: 'disable', title: t('veth.labels.disable'), type: 'checkbox', help: t('veth.help.disable') },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: t('veth.labels.dhcpClientId'), type: 'text', placeholder: t('veth.placeholders.dhcpClientId'), help: t('veth.help.dhcpClientId') },
      { key: 'dhcp_default_route_distance', title: t('veth.labels.dhcpDefaultRouteDistance'), type: 'number', min: 1, max: 255, placeholder: t('veth.placeholders.dhcpDefaultRouteDistance'), help: t('veth.help.dhcpDefaultRouteDistance') },
      { key: 'dhcp_host_name', title: t('veth.labels.dhcpHostName'), type: 'text', placeholder: t('veth.placeholders.dhcpHostName'), help: t('veth.help.dhcpHostName') },
      { key: 'dhcp_mtu', title: t('veth.labels.dhcpMtu'), type: 'checkbox', help: t('veth.help.dhcpMtu') },
      { key: 'dhcp_no_default_route', title: t('veth.labels.dhcpNoDefaultRoute'), type: 'checkbox', help: t('veth.help.dhcpNoDefaultRoute') },
      { key: 'dhcp_reject', title: t('veth.labels.dhcpReject'), type: 'textarea', placeholder: t('veth.placeholders.dhcpReject'), help: t('veth.help.dhcpReject') },
      { key: 'dhcp_user_class', title: t('veth.labels.dhcpUserClass'), type: 'text', placeholder: t('veth.placeholders.dhcpUserClass'), help: t('veth.help.dhcpUserClass') },
      { key: 'dhcp_vendor_class_id', title: t('veth.labels.dhcpVendorClassId'), type: 'text', placeholder: t('veth.placeholders.dhcpVendorClassId'), help: t('veth.help.dhcpVendorClassId') },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: t('veth.labels.dhcpv6Duid'), type: 'text', placeholder: t('veth.placeholders.dhcpv6Duid'), help: t('veth.help.dhcpv6Duid') },
      { key: 'dhcpv6_no_release', title: t('veth.labels.dhcpv6NoRelease'), type: 'checkbox', help: t('veth.help.dhcpv6NoRelease') },
      { key: 'dhcpv6_no_request_dns', title: t('veth.labels.dhcpv6NoRequestDns'), type: 'checkbox', help: t('veth.help.dhcpv6NoRequestDns') },
      { key: 'dhcpv6_no_request_domain_name', title: t('veth.labels.dhcpv6NoRequestDomainName'), type: 'checkbox', help: t('veth.help.dhcpv6NoRequestDomainName') },
      { key: 'dhcpv6_parameters_only', title: t('veth.labels.dhcpv6ParametersOnly'), type: 'checkbox', help: t('veth.help.dhcpv6ParametersOnly') },
      { key: 'dhcpv6_pd_instances', title: t('veth.labels.dhcpv6PdInstances'), type: 'textarea', placeholder: t('veth.placeholders.dhcpv6PdInstances'), help: t('veth.help.dhcpv6PdInstances') },
      { key: 'dhcpv6_pd_length', title: t('veth.labels.dhcpv6PdLength'), type: 'number', min: 32, max: 64, placeholder: t('veth.placeholders.dhcpv6PdLength'), help: t('veth.help.dhcpv6PdLength') },
      { key: 'dhcpv6_rapid_commit', title: t('veth.labels.dhcpv6RapidCommit'), type: 'checkbox', help: t('veth.help.dhcpv6RapidCommit') },
      { key: 'dhcpv6_temporary', title: t('veth.labels.dhcpv6Temporary'), type: 'checkbox', help: t('veth.help.dhcpv6Temporary') },
    ]);

    const vifSchema = computed(() => [
      { key: 'vif', title: t('veth.labels.vif'), type: 'textarea', placeholder: t('veth.placeholders.vif'), help: t('veth.help.vif') },
      { key: 'vif_s', title: t('veth.labels.vifS'), type: 'textarea', placeholder: t('veth.placeholders.vifS'), help: t('veth.help.vifS') },
    ]);

    const otherSchema = computed(() => [
      { key: 'vrf', title: t('veth.labels.vrf'), type: 'text', placeholder: t('veth.placeholders.vrf'), help: t('veth.help.vrf') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingVeth.value) return '';
      const v = editingVeth.value;
      const name = v.name || 'vethN';
      const lines = [];

      if (v.description) lines.push(`set interfaces virtual-ethernet ${name} description "${v.description}"`);
      if (v.address) {
        v.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces virtual-ethernet ${name} address ${a.trim()}`);
        });
      }
      if (v.peer_name) lines.push(`set interfaces virtual-ethernet ${name} peer-name ${v.peer_name}`);
      if (v.mtu) lines.push(`set interfaces virtual-ethernet ${name} mtu ${v.mtu}`);
      if (v.netns) lines.push(`set interfaces virtual-ethernet ${name} netns ${v.netns}`);
      if (v.disable) lines.push(`set interfaces virtual-ethernet ${name} disable`);

      // DHCP
      if (v.dhcp_client_id) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options client-id ${v.dhcp_client_id}`);
      if (v.dhcp_default_route_distance) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options default-route-distance ${v.dhcp_default_route_distance}`);
      if (v.dhcp_host_name) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options host-name ${v.dhcp_host_name}`);
      if (v.dhcp_mtu) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options mtu`);
      if (v.dhcp_no_default_route) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options no-default-route`);
      if (v.dhcp_reject) {
        v.dhcp_reject.split('\n').filter(Boolean).forEach(r => {
          lines.push(`set interfaces virtual-ethernet ${name} dhcp-options reject ${r.trim()}`);
        });
      }
      if (v.dhcp_user_class) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options user-class ${v.dhcp_user_class}`);
      if (v.dhcp_vendor_class_id) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options vendor-class-id ${v.dhcp_vendor_class_id}`);

      // DHCPv6
      if (v.dhcpv6_duid) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options duid ${v.dhcpv6_duid}`);
      if (v.dhcpv6_no_release) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-release`);
      if (v.dhcpv6_no_request_dns) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-request-dns`);
      if (v.dhcpv6_no_request_domain_name) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-request-domain-name`);
      if (v.dhcpv6_parameters_only) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options parameters-only`);
      if (v.dhcpv6_pd_instances) {
        const pd = safeJsonParse(v.dhcpv6_pd_instances);
        Object.entries(pd).forEach(([instanceId, instanceCfg]) => {
          const pdPath = `set interfaces virtual-ethernet ${name} dhcpv6-options pd ${instanceId}`;
          if (instanceCfg.interface) lines.push(`${pdPath} interface ${instanceCfg.interface}`);
          if (instanceCfg.address) lines.push(`${pdPath} address ${instanceCfg.address}`);
          if (instanceCfg['sla-id'] !== undefined) lines.push(`${pdPath} sla-id ${instanceCfg['sla-id']}`);
        });
      }
      if (v.dhcpv6_pd_length) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options pd-length ${v.dhcpv6_pd_length}`);
      if (v.dhcpv6_rapid_commit) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options rapid-commit`);
      if (v.dhcpv6_temporary) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options temporary`);

      // VIF
      const vif = safeJsonParse(v.vif);
      if (Object.keys(vif).length) {
        Object.entries(vif).forEach(([vlanId, vlanCfg]) => {
          if (vlanCfg.address) {
            (Array.isArray(vlanCfg.address) ? vlanCfg.address : [vlanCfg.address]).forEach(addr => {
              lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} address ${addr}`);
            });
          }
          if (vlanCfg.description) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} description "${vlanCfg.description}"`);
          if (vlanCfg.disable) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} disable`);
          if (vlanCfg.mtu) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} mtu ${vlanCfg.mtu}`);
        });
      }

      const vifS = safeJsonParse(v.vif_s);
      if (Object.keys(vifS).length) {
        Object.entries(vifS).forEach(([svlanId, svlanCfg]) => {
          if (svlanCfg.address) {
            (Array.isArray(svlanCfg.address) ? svlanCfg.address : [svlanCfg.address]).forEach(addr => {
              lines.push(`set interfaces virtual-ethernet ${name} vif-s ${svlanId} address ${addr}`);
            });
          }
          if (svlanCfg.description) lines.push(`set interfaces virtual-ethernet ${name} vif-s ${svlanId} description "${svlanCfg.description}"`);
        });
      }

      if (v.vrf) lines.push(`set interfaces virtual-ethernet ${name} vrf ${v.vrf}`);

      return lines.length ? lines.join('\n') : t('veth.messages.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('veth.tabs.basic') },
      { key: 'dhcp', title: t('veth.tabs.dhcp') },
      { key: 'dhcpv6', title: t('veth.tabs.dhcpv6') },
      { key: 'vif', title: t('veth.tabs.vif') },
      { key: 'other', title: t('veth.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', peer_name: '', mtu: '', netns: '', disable: false,
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        dhcpv6_duid: '', dhcpv6_no_release: false, dhcpv6_no_request_dns: false,
        dhcpv6_no_request_domain_name: false, dhcpv6_parameters_only: false,
        dhcpv6_pd_instances: '', dhcpv6_pd_length: '',
        dhcpv6_rapid_commit: false, dhcpv6_temporary: false,
        vif: '', vif_s: '',
        vrf: '',
      };
    }

    function vethToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        address: Array.isArray(v.address) ? v.address.join('\n') : (v.address || ''),
        peer_name: v.peer_name || '',
        mtu: v.mtu || '',
        netns: v.netns || '',
        disable: !!v.disable,
        dhcp_client_id: v['dhcp-options']?.client_id || '',
        dhcp_default_route_distance: v['dhcp-options']?.default_route_distance || '',
        dhcp_host_name: v['dhcp-options']?.host_name || '',
        dhcp_mtu: !!v['dhcp-options']?.mtu,
        dhcp_no_default_route: !!v['dhcp-options']?.no_default_route,
        dhcp_reject: Array.isArray(v['dhcp-options']?.reject) ? v['dhcp-options'].reject.join('\n') : (v['dhcp-options']?.reject || ''),
        dhcp_user_class: v['dhcp-options']?.user_class || '',
        dhcp_vendor_class_id: v['dhcp-options']?.vendor_class_id || '',
        dhcpv6_duid: v['dhcpv6-options']?.duid || '',
        dhcpv6_no_release: !!v['dhcpv6-options']?.no_release,
        dhcpv6_no_request_dns: !!v['dhcpv6-options']?.no_request_dns,
        dhcpv6_no_request_domain_name: !!v['dhcpv6-options']?.no_request_domain_name,
        dhcpv6_parameters_only: !!v['dhcpv6-options']?.parameters_only,
        dhcpv6_pd_instances: formatJson(v['dhcpv6-options']?.pd || {}),
        dhcpv6_pd_length: v['dhcpv6-options']?.pd_length || '',
        dhcpv6_rapid_commit: !!v['dhcpv6-options']?.rapid_commit,
        dhcpv6_temporary: !!v['dhcpv6-options']?.temporary,
        vif: formatJson(v.vif || {}),
        vif_s: formatJson(v['vif-s'] || {}),
        vrf: v.vrf || '',
      };
    }

    function formToVeth(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.peer_name) result.peer_name = form.peer_name;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.netns) result.netns = form.netns;
      if (form.disable) result.disable = true;

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp.client_id = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp.default_route_distance = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp.host_name = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp.no_default_route = true;
      if (form.dhcp_reject) {
        dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      }
      if (form.dhcp_user_class) dhcp.user_class = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp.vendor_class_id = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result['dhcp-options'] = dhcp;

      // DHCPv6
      const dhcpv6 = {};
      if (form.dhcpv6_duid) dhcpv6.duid = form.dhcpv6_duid;
      if (form.dhcpv6_no_release) dhcpv6.no_release = true;
      if (form.dhcpv6_no_request_dns) dhcpv6.no_request_dns = true;
      if (form.dhcpv6_no_request_domain_name) dhcpv6.no_request_domain_name = true;
      if (form.dhcpv6_parameters_only) dhcpv6.parameters_only = true;
      if (form.dhcpv6_pd_instances) {
        dhcpv6.pd = safeJsonParse(form.dhcpv6_pd_instances);
      }
      if (form.dhcpv6_pd_length) dhcpv6.pd_length = Number(form.dhcpv6_pd_length);
      if (form.dhcpv6_rapid_commit) dhcpv6.rapid_commit = true;
      if (form.dhcpv6_temporary) dhcpv6.temporary = true;
      if (Object.keys(dhcpv6).length) result['dhcpv6-options'] = dhcpv6;

      // VIF
      const vif = safeJsonParse(form.vif);
      if (Object.keys(vif).length) result.vif = vif;
      const vifS = safeJsonParse(form.vif_s);
      if (Object.keys(vifS).length) result['vif-s'] = vifS;

      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces virtual-ethernet' });
        const cfg = res.data || {};
        veths.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          peer_name: val.peer_name || '',
          mtu: val.mtu || '',
          netns: val.netns || '',
          vif_count: val.vif ? Object.keys(val.vif).length : 0,
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
      showError({ message: `${t('veth.messages.errorCode', { code: err.code || 'ERROR' })}\n${t('veth.messages.errorMessage', { message: err.message || err })}` });
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingVeth.value = vethToForm(veths.value[index]);
      } else {
        editingVeth.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingVeth.value;
        const name = form.name;
        if (!name) return showError({ message: t('veth.messages.enterName') });

        const config = formToVeth(form);
        console.log('[VirtualEthernet] Save config:', JSON.stringify(config, null, 2));

        const path = `interfaces virtual-ethernet ${name}`;
        await configStore.setConfig(path, config);
        configStore.markPending();

        modalVisible.value = false;
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    function remove() {
      if (!selectedVeth.value.length) return showError({ message: t('veth.messages.selectToDelete') });
      pendingDeleteNames.value = selectedVeth.value.map(v => v.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces virtual-ethernet ${name}`);
          configStore.markPending();
        }
        selectedVeth.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        handleError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {t,
      
      loading, veths, selected: selectedVeth, modalVisible, editingVeth, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, vifSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="veths"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingVeth?.name ? t('veth.modals.editVeth') : t('veth.modals.createVeth')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingVeth" />
            </template>
            <template #dhcp>
              <ConfigForm :schema="dhcpSchema" :model="editingVeth" />
            </template>
            <template #dhcpv6>
              <ConfigForm :schema="dhcpv6Schema" :model="editingVeth" />
            </template>
            <template #vif>
              <ConfigForm :schema="vifSchema" :model="editingVeth" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingVeth" />
            </template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('veth.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('veth.buttons.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('veth.modals.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('veth.messages.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
