import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';
import { api, configApi, interfaceApi, monitorApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict' },
  { value: 'loose', label: 'loose' },
  { value: 'disable', label: 'disable' },
];

function withEmptyOption(options = []) {
  return [{ value: '', label: '' }, ...options];
}

export default defineComponent({
  name: 'DummyPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();

    const loading = ref(false);
    const dummies = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const isEditMode = ref(false);
    const activeTab = ref('basic');
    const selectedItems = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const interfaceOptions = ref([]);
    const netnsOptions = ref([]);
    const vrfOptions = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('dummy.columns.name'), width: 120 },
      { key: 'description', title: t('dummy.columns.description'), width: 180 },
      { key: 'address', title: t('dummy.columns.address'), width: 220 },
      { key: 'mac', title: t('dummy.columns.mac'), width: 140 },
      { key: 'mtu', title: t('dummy.columns.mtu'), width: 90 },
      { key: 'netns', title: t('dummy.columns.netns'), width: 140 },
      { key: 'vrf', title: t('dummy.columns.vrf'), width: 120 },
      { key: 'disable', title: t('dummy.columns.disable'), width: 90 },
      { key: 'actions', title: t('dummy.columns.actions'), width: 100 },
    ]);

    const basicSchema = computed(() => [
      { key: 'name', title: t('dummy.labels.name'), type: 'text', required: true, placeholder: t('dummy.placeholders.name'), help: t('dummy.help.name'), disabled: isEditMode.value },
      { key: 'description', title: t('dummy.labels.description'), type: 'text', placeholder: t('dummy.placeholders.description') },
      { key: 'address', title: t('dummy.labels.address'), type: 'textarea', placeholder: t('dummy.placeholders.address'), help: t('dummy.help.address') },
      { key: 'mac', title: t('dummy.labels.mac'), type: 'text', placeholder: t('dummy.placeholders.mac'), help: t('dummy.help.mac') },
      { key: 'mtu', title: t('dummy.labels.mtu'), type: 'number', min: 68, max: 16000, placeholder: t('dummy.placeholders.mtu'), help: t('dummy.help.mtu') },
      { key: 'netns', title: t('dummy.labels.netns'), type: 'select', options: withEmptyOption(netnsOptions.value), placeholder: t('dummy.placeholders.netns'), help: t('dummy.help.netns') },
      { key: 'disable', title: t('dummy.labels.disable'), type: 'checkbox', help: t('dummy.help.disable') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_disable_forwarding', title: t('dummy.labels.ipDisableForwarding'), type: 'checkbox', help: t('dummy.help.ipDisableForwarding') },
      { key: 'ip_source_validation', title: t('dummy.labels.ipSourceValidation'), type: 'select', options: withEmptyOption(SOURCE_VALIDATION_OPTIONS), placeholder: t('dummy.placeholders.ipSourceValidation'), help: t('dummy.help.ipSourceValidation') },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_eui64', title: t('dummy.labels.ipv6Eui64'), type: 'textarea', placeholder: t('dummy.placeholders.ipv6Eui64'), help: t('dummy.help.ipv6Eui64') },
      { key: 'ipv6_no_default_link_local', title: t('dummy.labels.ipv6NoDefaultLinkLocal'), type: 'checkbox', help: t('dummy.help.ipv6NoDefaultLinkLocal') },
      { key: 'ipv6_disable_forwarding', title: t('dummy.labels.ipv6DisableForwarding'), type: 'checkbox', help: t('dummy.help.ipv6DisableForwarding') },
      { key: 'ipv6_source_validation', title: t('dummy.labels.ipv6SourceValidation'), type: 'select', options: withEmptyOption(SOURCE_VALIDATION_OPTIONS), placeholder: t('dummy.placeholders.ipv6SourceValidation'), help: t('dummy.help.ipv6SourceValidation') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('dummy.labels.mirrorEgress'), type: 'select', options: withEmptyOption(interfaceOptions.value), placeholder: t('dummy.placeholders.interface'), help: t('dummy.help.mirrorEgress') },
      { key: 'mirror_ingress', title: t('dummy.labels.mirrorIngress'), type: 'select', options: withEmptyOption(interfaceOptions.value), placeholder: t('dummy.placeholders.interface'), help: t('dummy.help.mirrorIngress') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('dummy.labels.redirect'), type: 'select', options: withEmptyOption(interfaceOptions.value), placeholder: t('dummy.placeholders.interface'), help: t('dummy.help.redirect') },
      { key: 'vrf', title: t('dummy.labels.vrf'), type: 'select', options: withEmptyOption(vrfOptions.value), placeholder: t('dummy.placeholders.vrf'), help: t('dummy.help.vrf') },
    ]);

    const modalTabs = computed(() => [
      { key: 'basic', title: t('dummy.tabs.basic') },
      { key: 'ip', title: t('dummy.tabs.ip') },
      { key: 'ipv6', title: t('dummy.tabs.ipv6') },
      { key: 'mirror', title: t('dummy.tabs.mirror') },
      { key: 'other', title: t('dummy.tabs.other') },
    ]);

    function getDefaultForm() {
      return {
        name: '',
        description: '',
        address: '',
        mac: '',
        mtu: '',
        netns: '',
        disable: false,
        ip_disable_forwarding: false,
        ip_source_validation: '',
        ipv6_eui64: '',
        ipv6_no_default_link_local: false,
        ipv6_disable_forwarding: false,
        ipv6_source_validation: '',
        mirror_egress: '',
        mirror_ingress: '',
        redirect: '',
        vrf: '',
      };
    }

    function itemToForm(item) {
      return {
        name: item.name || '',
        description: item.description || '',
        address: Array.isArray(item.address) ? item.address.join('\n') : (item.address || ''),
        mac: item.mac || '',
        mtu: item.mtu || '',
        netns: item.netns || '',
        disable: !!item.disable,
        ip_disable_forwarding: !!item.ip?.disable_forwarding,
        ip_source_validation: item.ip?.source_validation || '',
        ipv6_eui64: Array.isArray(item.ipv6?.address?.eui64)
          ? item.ipv6.address.eui64.join('\n')
          : (item.ipv6?.address?.eui64 || ''),
        ipv6_no_default_link_local: !!item.ipv6?.address?.no_default_link_local,
        ipv6_disable_forwarding: !!item.ipv6?.disable_forwarding,
        ipv6_source_validation: item.ipv6?.source_validation || '',
        mirror_egress: item.mirror?.egress || '',
        mirror_ingress: item.mirror?.ingress || '',
        redirect: item.redirect || '',
        vrf: item.vrf || '',
      };
    }

    function formToItem(form) {
      const result = {};
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').map(s => s.trim()).filter(Boolean);
      if (form.mac) result.mac = form.mac;
      if (form.mtu !== '' && form.mtu !== null && form.mtu !== undefined) result.mtu = Number(form.mtu);
      if (form.netns) result.netns = form.netns;
      if (form.disable) result.disable = true;

      const ip = {};
      if (form.ip_disable_forwarding) ip.disable_forwarding = true;
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      const ipv6 = {};
      const ipv6Address = {};
      if (form.ipv6_eui64) {
        const prefixes = form.ipv6_eui64.split('\n').map(s => s.trim()).filter(Boolean);
        if (prefixes.length) {
          ipv6Address.eui64 = prefixes;
        }
      }
      if (form.ipv6_no_default_link_local) ipv6Address.no_default_link_local = true;
      if (Object.keys(ipv6Address).length) ipv6.address = ipv6Address;
      if (form.ipv6_disable_forwarding) ipv6.disable_forwarding = true;
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

    async function loadInterfaceOptions() {
      const normalizeNames = (source) => {
        const list = [];

        if (Array.isArray(source)) {
          source.forEach(item => {
            if (typeof item === 'string') {
              list.push(item.trim());
              return;
            }
            if (item && typeof item === 'object') {
              const val = item.value || item.name || item.label || item.text || item.completion || '';
              if (val) list.push(String(val).trim());
            }
          });
        } else if (source && typeof source === 'object') {
          Object.keys(source).forEach(key => list.push(String(key).trim()));
        }

        return list
          .filter(Boolean)
          .filter(name => !name.startsWith('<') && name !== 'Enter' && name !== '[edit]');
      };

      try {
        const [egressRes, ingressRes, redirectRes] = await Promise.all([
          configApi.suggestions('interfaces dummy dum0 mirror', 'egress').catch(() => ({ suggestions: [] })),
          configApi.suggestions('interfaces dummy dum0 mirror', 'ingress').catch(() => ({ suggestions: [] })),
          configApi.suggestions('interfaces dummy dum0', 'redirect').catch(() => ({ suggestions: [] })),
        ]);

        const names = Array.from(new Set([
          ...normalizeNames(egressRes.suggestions || []),
          ...normalizeNames(ingressRes.suggestions || []),
          ...normalizeNames(redirectRes.suggestions || []),
        ])).sort();

        if (names.length) {
          interfaceOptions.value = names.map(name => ({ value: name, label: name }));
          return;
        }
      } catch (e) {
        // Fallback to runtime interface discovery
      }

      try {
        const monitorRes = await monitorApi.interfaces();
        const ifaceRaw = monitorRes.interfaces || {};
        const names = Array.isArray(ifaceRaw)
          ? normalizeNames(ifaceRaw)
          : normalizeNames(ifaceRaw);
        if (names.length) {
          interfaceOptions.value = Array.from(new Set(names)).sort().map(name => ({ value: name, label: name }));
          return;
        }
      } catch (e) {
        // Fallback to ethernet API
      }

      try {
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        const names = normalizeNames(ifaces);
        interfaceOptions.value = Array.from(new Set(names)).sort().map(name => ({ value: name, label: name }));
      } catch (e) {
        interfaceOptions.value = [];
      }
    }

    async function loadNetnsOptions() {
      try {
        const netnsRes = await api.get('/config', { path: 'netns' });
        const netnsData = netnsRes.data || {};
        const nameData = netnsData.name || netnsData;
        netnsOptions.value = Object.keys(nameData).map(name => ({ value: name, label: name }));
      } catch (e) {
        netnsOptions.value = [];
      }
    }

    async function loadVrfOptions() {
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
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces dummy' });
        const cfg = res.data || {};
        dummies.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          description: val.description || '',
          address: Array.isArray(val.address) ? val.address.join(', ') : (val.address || ''),
          mac: val.mac || '',
          mtu: val.mtu || '',
          netns: val.netns || '',
          vrf: val.vrf || '',
          disable: !!val.disable,
        }));

        await Promise.all([loadInterfaceOptions(), loadNetnsOptions(), loadVrfOptions()]);
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function openModal(payload = -1) {
      if (typeof payload === 'number' && payload >= 0) {
        editingItem.value = itemToForm(dummies.value[payload]);
        isEditMode.value = true;
      } else if (payload && typeof payload === 'object' && payload.name) {
        // Some table actions pass the row object directly.
        editingItem.value = itemToForm(payload);
        isEditMode.value = true;
      } else {
        editingItem.value = getDefaultForm();
        isEditMode.value = false;
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingItem.value;
        if (!form.name) {
          showError({ message: t('dummy.messages.enterName') });
          return;
        }
        if (!/^dum[0-9]+$/.test(form.name)) {
          showError({ message: t('dummy.messages.invalidName') });
          return;
        }
        if (form.description && form.description.length > 255) {
          showError({ message: t('dummy.messages.descriptionTooLong') });
          return;
        }
        const config = formToItem(form);
        await configStore.setConfig(`interfaces dummy ${form.name}`, config);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    function remove() {
      if (!selectedItems.value.length) {
        showError({ message: t('dummy.messages.selectToDelete') });
        return;
      }
      pendingDeleteNames.value = selectedItems.value.map(item => item.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces dummy ${name}`);
          configStore.markPending();
        }
        selectedItems.value = [];
        pendingDeleteNames.value = [];
        await configStore.checkSessionChanged();
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading,
      dummies,
      selected: selectedItems,
      modalVisible,
      editingItem,
      isEditMode,
      activeTab,
      deleteModalVisible,
      pendingDeleteNames,
      COLUMNS,
      basicSchema,
      ipSchema,
      ipv6Schema,
      mirrorSchema,
      otherSchema,
      modalTabs,
      openModal,
      save,
      remove,
      confirmRemove,
      load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="dummies"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal
        v-model:visible="modalVisible"
        :title="isEditMode ? t('dummy.modals.edit') : t('dummy.modals.create')"
        width="900px"
        @confirm="save"
      >
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" v-model="editingItem" /></template>
            <template #ip><ConfigForm :schema="ipSchema" v-model="editingItem" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" v-model="editingItem" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" v-model="editingItem" /></template>
            <template #other><ConfigForm :schema="otherSchema" v-model="editingItem" /></template>
          </TabGroup>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteModalVisible" :title="t('dummy.modals.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('dummy.messages.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});