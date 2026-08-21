import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function listenInterfacesToForm(items = {}) {
  return Object.entries(items).map(([name, item]) => ({
    _name: name,
    name,
    address: item?.address || '',
  }));
}

function listenInterfacesToConfig(formItems) {
  const result = {};
  for (const item of formItems || []) {
    if (!item.name) continue;
    const entry = {};
    if (isPresent(item.address)) entry.address = item.address;
    result[item.name] = entry;
  }
  return result;
}

function upstreamInterfacesToForm(items = {}) {
  return Object.entries(items).map(([name, item]) => ({
    _name: name,
    name,
    addresses: toArray(item?.address),
  }));
}

function upstreamInterfacesToConfig(formItems) {
  const result = {};
  for (const item of formItems || []) {
    if (!item.name) continue;
    const addrs = toArray(item.addresses || []).filter(Boolean);
    if (addrs.length) result[item.name] = { address: addrs };
    else result[item.name] = {};
  }
  return result;
}

function dhcpv6RelayToForm(data = {}) {
  return {
    disable: data.disable !== undefined,
    max_hop_count: data['max-hop-count'] !== undefined ? String(data['max-hop-count']) : '10',
    use_interface_id_option: data['use-interface-id-option'] !== undefined,
    listen_interfaces: listenInterfacesToForm(data['listen-interface']),
    upstream_interfaces: upstreamInterfacesToForm(data['upstream-interface']),
  };
}

function dhcpv6RelayToConfig(form) {
  const result = {};
  if (form.disable) result.disable = '';
  if (isPresent(form.max_hop_count)) result['max-hop-count'] = parseInt(form.max_hop_count, 10);
  if (form.use_interface_id_option) result['use-interface-id-option'] = '';

  const listen = listenInterfacesToConfig(form.listen_interfaces || []);
  if (Object.keys(listen).length) result['listen-interface'] = listen;

  const upstream = upstreamInterfacesToConfig(form.upstream_interfaces || []);
  if (Object.keys(upstream).length) result['upstream-interface'] = upstream;

  return result;
}

export default defineComponent({
  name: 'Dhcpv6RelayPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dhcpv6RelayToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('dhcpv6relay.errors.invalidIPv6');
      return '';
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => 'service dhcpv6-relay');

    const listenColumns = [
      { key: 'name', title: t('dhcpv6relay.columns.interface') },
      { key: 'address', title: t('dhcpv6relay.columns.listenAddress') },
    ];

    const selectedListen = ref([]);
    const showListenModal = ref(false);
    const editingListen = ref({});

    const upstreamColumns = [
      { key: 'name', title: t('dhcpv6relay.columns.interface') },
      { key: 'addresses', title: t('dhcpv6relay.columns.upstreamServerAddress'), render: v => toArray(v).join(', ') },
    ];

    const selectedUpstream = ref([]);
    const showUpstreamModal = ref(false);
    const editingUpstream = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dhcpv6-relay', true);
        config.value = dhcpv6RelayToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const hop = parseInt(config.value.max_hop_count, 10);
      if (isNaN(hop) || hop < 1 || hop > 255) return showError({ message: t('dhcpv6relay.errors.hopCountRange') });

      const listenNames = new Set();
      for (const item of config.value.listen_interfaces || []) {
        if (!item.name) return showError({ message: t('dhcpv6relay.errors.listenNameRequired') });
        if (listenNames.has(item.name)) return showError({ message: t('dhcpv6relay.errors.listenDuplicate', { name: item.name }) });
        listenNames.add(item.name);
        if (isPresent(item.address)) {
          const err = validateIPv6(item.address);
          if (err) return showError({ message: t('dhcpv6relay.errors.listenInvalidAddress', { name: item.name, error: err }) });
        }
      }

      const upstreamNames = new Set();
      for (const item of config.value.upstream_interfaces || []) {
        if (!item.name) return showError({ message: t('dhcpv6relay.errors.upstreamNameRequired') });
        if (upstreamNames.has(item.name)) return showError({ message: t('dhcpv6relay.errors.upstreamDuplicate', { name: item.name }) });
        upstreamNames.add(item.name);
        const addrs = toArray(item.addresses || []).filter(Boolean);
        if (!addrs.length) return showError({ message: t('dhcpv6relay.errors.upstreamAddressRequired', { name: item.name }) });
        for (const addr of addrs) {
          const err = validateIPv6(addr);
          if (err) return showError({ message: t('dhcpv6relay.errors.upstreamInvalidAddress', { name: item.name, address: addr, error: err }) });
        }
      }

      saving.value = true;
      try {
        await configStore.setConfig('service dhcpv6-relay', dhcpv6RelayToConfig(config.value));
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createListen() {
      editingListen.value = { name: '', address: '' };
      showListenModal.value = true;
    }

    function editListen() {
      if (!selectedListen.value.length) return showError({ message: t('dhcpv6relay.errors.selectListenToEdit') });
      const row = (config.value.listen_interfaces || []).find(i => i._name === selectedListen.value[0]);
      if (!row) return showError({ message: t('dhcpv6relay.errors.selectedListenNotFound') });
      editingListen.value = JSON.parse(JSON.stringify(row));
      showListenModal.value = true;
    }

    function removeListen() {
      if (!selectedListen.value.length) return showError({ message: t('dhcpv6relay.errors.selectListenToDelete') });
      config.value.listen_interfaces = (config.value.listen_interfaces || []).filter(i => i._name !== selectedListen.value[0]);
      selectedListen.value = [];
    }

    function saveListen() {
      if (!editingListen.value.name) return showError({ message: t('dhcpv6relay.errors.selectInterface') });
      const list = config.value.listen_interfaces || [];
      const idx = list.findIndex(i => i._name === editingListen.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingListen.value)));
      } else {
        if (list.some(i => i.name === editingListen.value.name)) return showError({ message: t('dhcpv6relay.errors.listenAlreadyExists') });
        list.push(JSON.parse(JSON.stringify(editingListen.value)));
      }
      config.value.listen_interfaces = [...list];
      selectedListen.value = [];
      showListenModal.value = false;
    }

    function createUpstream() {
      editingUpstream.value = { name: '', addresses: [] };
      showUpstreamModal.value = true;
    }

    function editUpstream() {
      if (!selectedUpstream.value.length) return showError({ message: t('dhcpv6relay.errors.selectUpstreamToEdit') });
      const row = (config.value.upstream_interfaces || []).find(i => i._name === selectedUpstream.value[0]);
      if (!row) return showError({ message: t('dhcpv6relay.errors.selectedUpstreamNotFound') });
      editingUpstream.value = JSON.parse(JSON.stringify(row));
      showUpstreamModal.value = true;
    }

    function removeUpstream() {
      if (!selectedUpstream.value.length) return showError({ message: t('dhcpv6relay.errors.selectUpstreamToDelete') });
      config.value.upstream_interfaces = (config.value.upstream_interfaces || []).filter(i => i._name !== selectedUpstream.value[0]);
      selectedUpstream.value = [];
    }

    function saveUpstream() {
      if (!editingUpstream.value.name) return showError({ message: t('dhcpv6relay.errors.selectInterface') });
      const addrs = toArray(editingUpstream.value.addresses || []).filter(Boolean);
      if (!addrs.length) return showError({ message: t('dhcpv6relay.errors.upstreamAddressRequiredGeneral') });
      for (const addr of addrs) {
        const err = validateIPv6(addr);
        if (err) return showError({ message: t('dhcpv6relay.errors.invalidAddress', { address: addr, error: err }) });
      }
      const list = config.value.upstream_interfaces || [];
      const idx = list.findIndex(i => i._name === editingUpstream.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingUpstream.value)));
      } else {
        if (list.some(i => i.name === editingUpstream.value.name)) return showError({ message: t('dhcpv6relay.errors.upstreamAlreadyExists') });
        list.push(JSON.parse(JSON.stringify(editingUpstream.value)));
      }
      config.value.upstream_interfaces = [...list];
      selectedUpstream.value = [];
      showUpstreamModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      listenColumns, selectedListen, showListenModal, editingListen,
      upstreamColumns, selectedUpstream, showUpstreamModal, editingUpstream,
      load, save,
      createListen, editListen, removeListen, saveListen,
      createUpstream, editUpstream, removeUpstream, saveUpstream,
      validateIPv6,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('dhcpv6relay.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('dhcpv6relay.tabs.basic') },
        { key: 'relay-options', title: t('dhcpv6relay.tabs.relayOptions') }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" :title="t('dhcpv6relay.tooltips.disableInstance')">{{ t('dhcpv6relay.labels.disable') }}</label>
            <input type="checkbox" v-model="config.disable" :title="t('dhcpv6relay.tooltips.disableInstance')" />
          </div>

          <div style="margin-top:16px;">
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createListen">{{ t('dhcpv6relay.buttons.createListen') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editListen" :disabled="!selectedListen.length || selectedListen.length > 1">{{ t('dhcpv6relay.buttons.editListen') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeListen" :disabled="!selectedListen.length">{{ t('dhcpv6relay.buttons.deleteListen') }}</ToolbarButton>
            </div>
            <DataTable :columns="listenColumns" :data="config.listen_interfaces" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedListen = $event" />
          </div>

          <div style="margin-top:16px;">
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createUpstream">{{ t('dhcpv6relay.buttons.createUpstream') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editUpstream" :disabled="!selectedUpstream.length || selectedUpstream.length > 1">{{ t('dhcpv6relay.buttons.editUpstream') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeUpstream" :disabled="!selectedUpstream.length">{{ t('dhcpv6relay.buttons.deleteUpstream') }}</ToolbarButton>
            </div>
            <DataTable :columns="upstreamColumns" :data="config.upstream_interfaces" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedUpstream = $event" />
          </div>
        </template>

        <template #relay-options>
          <div class="form-row">
            <label class="form-label" :title="t('dhcpv6relay.tooltips.maxHopCount')">{{ t('dhcpv6relay.labels.maxHopCount') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="255" class="form-control" v-model="config.max_hop_count" :placeholder="t('dhcpv6relay.placeholders.maxHopCount')" :title="t('dhcpv6relay.labels.maxHopCount')" />
              <div class="form-hint">{{ t('dhcpv6relay.hints.maxHopCountRange') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('dhcpv6relay.tooltips.useInterfaceIdOption')">{{ t('dhcpv6relay.labels.useInterfaceIdOption') }}</label>
            <input type="checkbox" v-model="config.use_interface_id_option" :title="t('dhcpv6relay.tooltips.useInterfaceIdOption')" />
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="showListenModal" :title="t('dhcpv6relay.modals.listenInterface')" width="420px" @confirm="saveListen" @close="showListenModal = false">
        <div class="form-row">
          <label class="form-label">{{ t('dhcpv6relay.labels.interface') }}</label>
          <select class="form-control" v-model="editingListen.name" :disabled="!!editingListen._name">
            <option value="">{{ t('dhcpv6relay.placeholders.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('dhcpv6relay.labels.listenAddress') }}</label>
          <input type="text" class="form-control" v-model="editingListen.address" :placeholder="t('dhcpv6relay.placeholders.listenAddressOptional')" />
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showUpstreamModal" :title="t('dhcpv6relay.modals.upstreamInterface')" width="520px" @confirm="saveUpstream" @close="showUpstreamModal = false">
        <div class="form-row">
          <label class="form-label">{{ t('dhcpv6relay.labels.interface') }}</label>
          <select class="form-control" v-model="editingUpstream.name" :disabled="!!editingUpstream._name">
            <option value="">{{ t('dhcpv6relay.placeholders.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('dhcpv6relay.labels.upstreamServerAddress') }}</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingUpstream.addresses" :options="[]" :title-left="t('dhcpv6relay.dualList.available')" :title-right="t('dhcpv6relay.dualList.selected')" allow-custom :custom-placeholder="t('dhcpv6relay.dualList.enterIPv6')" :custom-validator="validateIPv6" />
            <div class="form-hint">{{ t('dhcpv6relay.hints.addIPv6Address') }}</div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
