import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict' },
  { value: 'loose', label: 'loose' },
  { value: 'disable', label: 'disable' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
];

export default defineComponent({
  name: 'VtiPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = inject('i18n');
    const configStore = useConfigStore();
    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.vti.name'), width: 120 },
      { key: 'description', title: t('interface.vti.description'), width: 160 },
      { key: 'mtu', title: t('interface.vti.mtu'), width: 80 },
      { key: 'vrf', title: t('interface.vti.vrf'), width: 100 },
      { key: 'disable', title: t('interface.vti.disable'), width: 80 },
      { key: 'actions', title: t('interface.vti.actions'), width: 100 },
    ]);
    const loading = ref(false);
    const vtis = ref([]);
    const modalVisible = ref(false);
    const editingVti = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVti = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.vti.name'), type: 'text', required: true, placeholder: t('interface.vti.name_placeholder'), help: t('interface.vti.name_help') },
      { key: 'description', title: t('interface.vti.description'), type: 'text', placeholder: t('interface.vti.description_placeholder') },
      { key: 'address', title: t('interface.vti.ip_address'), type: 'textarea', placeholder: t('interface.vti.address_placeholder'), help: t('interface.vti.address_help') },
      { key: 'mtu', title: t('interface.vti.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('interface.vti.mtu_placeholder'), help: t('interface.vti.mtu_help') },
      { key: 'disable', title: t('interface.vti.disable'), type: 'checkbox', help: t('interface.vti.disable_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: t('interface.vti.ip.adjust_mss'), type: 'text', placeholder: t('interface.vti.ip.adjust_mss_placeholder'), help: t('interface.vti.ip.adjust_mss_help') },
      { key: 'ip_arp_cache_timeout', title: t('interface.vti.ip.arp_cache_timeout'), type: 'number', min: 1, max: 86400, placeholder: t('interface.vti.ip.arp_cache_timeout_placeholder'), help: t('interface.vti.ip.arp_cache_timeout_help') },
      { key: 'ip_disable_arp_filter', title: t('interface.vti.ip.disable_arp_filter'), type: 'checkbox', help: t('interface.vti.ip.disable_arp_filter_help') },
      { key: 'ip_disable_forwarding', title: t('interface.vti.ip.disable_forwarding'), type: 'checkbox', help: t('interface.vti.ip.disable_forwarding_help') },
      { key: 'ip_enable_arp_accept', title: t('interface.vti.ip.enable_arp_accept'), type: 'checkbox', help: t('interface.vti.ip.enable_arp_accept_help') },
      { key: 'ip_enable_arp_announce', title: t('interface.vti.ip.enable_arp_announce'), type: 'checkbox', help: t('interface.vti.ip.enable_arp_announce_help') },
      { key: 'ip_enable_arp_ignore', title: t('interface.vti.ip.enable_arp_ignore'), type: 'checkbox', help: t('interface.vti.ip.enable_arp_ignore_help') },
      { key: 'ip_enable_directed_broadcast', title: t('interface.vti.ip.enable_directed_broadcast'), type: 'checkbox', help: t('interface.vti.ip.enable_directed_broadcast_help') },
      { key: 'ip_enable_proxy_arp', title: t('interface.vti.ip.enable_proxy_arp'), type: 'checkbox', help: t('interface.vti.ip.enable_proxy_arp_help') },
      { key: 'ip_proxy_arp_pvlan', title: t('interface.vti.ip.proxy_arp_pvlan'), type: 'checkbox', help: t('interface.vti.ip.proxy_arp_pvlan_help') },
      { key: 'ip_source_validation', title: t('interface.vti.ip.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.vti.ip.source_validation_placeholder'), help: t('interface.vti.ip.source_validation_help') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: t('interface.vti.ipv6.accept_dad'), type: 'select', options: ACCEPT_DAD_OPTIONS, help: t('interface.vti.ipv6.accept_dad_help') },
      { key: 'ipv6_autoconf', title: t('interface.vti.ipv6.address_autoconf'), type: 'checkbox', help: t('interface.vti.ipv6.address_autoconf_help') },
      { key: 'ipv6_eui64', title: t('interface.vti.ipv6.address_eui64'), type: 'text', placeholder: t('interface.vti.ipv6.address_eui64_placeholder'), help: t('interface.vti.ipv6.eui64_help') },
      { key: 'ipv6_no_default_link_local', title: t('interface.vti.ipv6.no_default_link_local'), type: 'checkbox', help: t('interface.vti.ipv6.no_default_link_local_help') },
      { key: 'ipv6_adjust_mss', title: t('interface.vti.ipv6.adjust_mss'), type: 'text', placeholder: t('interface.vti.ipv6.adjust_mss_placeholder'), help: t('interface.vti.ipv6.adjust_mss_help') },
      { key: 'ipv6_base_reachable_time', title: t('interface.vti.ipv6.base_reachable_time'), type: 'number', min: 1, max: 86400, placeholder: t('interface.vti.ipv6.base_reachable_time_placeholder'), help: t('interface.vti.ipv6.base_reachable_time_help') },
      { key: 'ipv6_disable_forwarding', title: t('interface.vti.ipv6.disable_forwarding'), type: 'checkbox', help: t('interface.vti.ipv6.disable_forwarding_help') },
      { key: 'ipv6_dup_addr_detect_transmits', title: t('interface.vti.ipv6.dup_addr_detect_transmits'), type: 'number', min: 0, max: 100, placeholder: t('interface.vti.ipv6.dup_addr_detect_transmits_placeholder'), help: t('interface.vti.ipv6.dup_addr_detect_transmits_help') },
      { key: 'ipv6_source_validation', title: t('interface.vti.ipv6.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: t('interface.vti.ipv6.source_validation_placeholder'), help: t('interface.vti.ipv6.source_validation_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('interface.vti.mirror.egress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.vti.mirror.placeholder'), help: t('interface.vti.mirror.egress_help') },
      { key: 'mirror_ingress', title: t('interface.vti.mirror.ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.vti.mirror.placeholder'), help: t('interface.vti.mirror.ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('interface.vti.other.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.vti.other.redirect_placeholder'), help: t('interface.vti.other.redirect_help') },
      { key: 'vrf', title: t('interface.vti.other.vrf'), type: 'text', placeholder: t('interface.vti.other.vrf_placeholder'), help: t('interface.vti.other.vrf_help') },
    ]);

    const commandText = computed(() => {
      if (!editingVti.value) return '';
      const v = editingVti.value;
      const name = v.name || 'vtiN';
      const lines = [];

      if (v.description) lines.push(`set interfaces vti ${name} description "${v.description}"`);
      if (v.address) {
        v.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces vti ${name} address ${a.trim()}`);
        });
      }
      if (v.mtu) lines.push(`set interfaces vti ${name} mtu ${v.mtu}`);
      if (v.disable) lines.push(`set interfaces vti ${name} disable`);

      if (v.ip_adjust_mss) lines.push(`set interfaces vti ${name} ip adjust-mss ${v.ip_adjust_mss}`);
      if (v.ip_arp_cache_timeout) lines.push(`set interfaces vti ${name} ip arp-cache-timeout ${v.ip_arp_cache_timeout}`);
      if (v.ip_disable_arp_filter) lines.push(`set interfaces vti ${name} ip disable-arp-filter`);
      if (v.ip_disable_forwarding) lines.push(`set interfaces vti ${name} ip disable-forwarding`);
      if (v.ip_enable_arp_accept) lines.push(`set interfaces vti ${name} ip enable-arp-accept`);
      if (v.ip_enable_arp_announce) lines.push(`set interfaces vti ${name} ip enable-arp-announce`);
      if (v.ip_enable_arp_ignore) lines.push(`set interfaces vti ${name} ip enable-arp-ignore`);
      if (v.ip_enable_directed_broadcast) lines.push(`set interfaces vti ${name} ip enable-directed-broadcast`);
      if (v.ip_enable_proxy_arp) lines.push(`set interfaces vti ${name} ip enable-proxy-arp`);
      if (v.ip_proxy_arp_pvlan) lines.push(`set interfaces vti ${name} ip proxy-arp-pvlan`);
      if (v.ip_source_validation) lines.push(`set interfaces vti ${name} ip source-validation ${v.ip_source_validation}`);

      if (v.ipv6_accept_dad && v.ipv6_accept_dad !== '1') lines.push(`set interfaces vti ${name} ipv6 accept-dad ${v.ipv6_accept_dad}`);
      if (v.ipv6_autoconf) lines.push(`set interfaces vti ${name} ipv6 address autoconf`);
      if (v.ipv6_eui64) lines.push(`set interfaces vti ${name} ipv6 address eui64 ${v.ipv6_eui64}`);
      if (v.ipv6_no_default_link_local) lines.push(`set interfaces vti ${name} ipv6 address no-default-link-local`);
      if (v.ipv6_adjust_mss) lines.push(`set interfaces vti ${name} ipv6 adjust-mss ${v.ipv6_adjust_mss}`);
      if (v.ipv6_base_reachable_time) lines.push(`set interfaces vti ${name} ipv6 base-reachable-time ${v.ipv6_base_reachable_time}`);
      if (v.ipv6_disable_forwarding) lines.push(`set interfaces vti ${name} ipv6 disable-forwarding`);
      if (v.ipv6_dup_addr_detect_transmits !== '' && v.ipv6_dup_addr_detect_transmits !== null && v.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces vti ${name} ipv6 dup-addr-detect-transmits ${v.ipv6_dup_addr_detect_transmits}`);
      if (v.ipv6_source_validation) lines.push(`set interfaces vti ${name} ipv6 source-validation ${v.ipv6_source_validation}`);

      if (v.mirror_egress) lines.push(`set interfaces vti ${name} mirror egress ${v.mirror_egress}`);
      if (v.mirror_ingress) lines.push(`set interfaces vti ${name} mirror ingress ${v.mirror_ingress}`);

      if (v.redirect) lines.push(`set interfaces vti ${name} redirect ${v.redirect}`);
      if (v.vrf) lines.push(`set interfaces vti ${name} vrf ${v.vrf}`);

      return lines.length ? lines.join('\n') : t('interface.vti.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('interface.vti.tab.basic') },
      { key: 'ip', title: t('interface.vti.tab.ip') },
      { key: 'ipv6', title: t('interface.vti.tab.ipv6') },
      { key: 'mirror', title: t('interface.vti.tab.mirror') },
      { key: 'other', title: t('interface.vti.tab.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', mtu: '', disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function vtiToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        address: Array.isArray(v.address) ? v.address.join('\n') : (v.address || ''),
        mtu: v.mtu || '',
        disable: !!v.disable,
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

    function formToVti(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

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
        const res = await api.get('/config', { path: 'interfaces vti' });
        const cfg = res.data || {};
        vtis.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          mtu: val.mtu || '',
          vrf: val.vrf || '',
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
        editingVti.value = vtiToForm(vtis.value[index]);
      } else {
        editingVti.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingVti.value;
        if (!form.name) { showError({ message: t('interface.vti.nameRequired') }); return; }
        const config = formToVti(form);
        console.log('[VTI] Save config:', JSON.stringify(config, null, 2));
        await configStore.setConfig(`interfaces vti ${form.name}`, config);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    function remove() {
      if (!selectedVti.value.length) { showError({ message: t('interface.vti.selectFirst') }); return; }
      pendingDeleteNames.value = selectedVti.value.map(v => v.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces vti ${name}`);
          configStore.markPending();
        }
        selectedVti.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {
      loading, vtis, selected: selectedVti, modalVisible, editingVti, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, confirmRemove, load, t,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="vtis"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingVti?.name ? t('interface.vti.modal.edit') : t('interface.vti.modal.create')" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingVti" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingVti" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingVti" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingVti" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingVti" /></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('common.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('common.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('common.confirm_delete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('interface.vti.delete_confirm') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
