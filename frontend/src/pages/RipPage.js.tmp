import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
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

// Validation functions moved inside setup() for i18n access

// RIP configuration conversion
function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    const md5Keys = [];
    const md5Data = attrs.authentication?.md5 || {};
    for (const [keyId, keyAttrs] of Object.entries(md5Data)) {
      md5Keys.push({ 'key-id': keyId, password: keyAttrs.password || '' });
    }
    interfaces.push({
      name: ifName,
      'plaintext-password': attrs.authentication?.['plaintext-password'] || '',
      md5Keys,
      'receive-version': attrs.receive?.version || '',
      'send-version': attrs.send?.version || '',
      'split-horizon': attrs['split-horizon'] || '',
    });
  }

  const neighbors = toArray(data.neighbor).map(n => typeof n === 'string' ? n : '');

  const networks = toArray(data.network).map(n => typeof n === 'string' ? n : '');

  const networkDistances = [];
  const ndData = data['network-distance'] || {};
  for (const [network, attrs] of Object.entries(ndData)) {
    networkDistances.push({
      network,
      'access-list': attrs['access-list'] || '',
      distance: attrs.distance || '',
    });
  }

  const routes = toArray(data.route).map(r => typeof r === 'string' ? r : '');

  const passiveInterfaces = toArray(data['passive-interface']);

  const redistributes = [];
  const redistributeData = data.redistribute || {};
  for (const [proto, attrs] of Object.entries(redistributeData)) {
    redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  const defInfo = data['default-information'] || {};
  const defOrig = defInfo.originate || {};

  const distList = data['distribute-list'] || {};

  return {
    'default-distance': data['default-distance'] || '',
    'default-metric': data['default-metric'] || '',
    'route-map': data['route-map'] || '',
    version: data.version || '',
    interfaces,
    neighbors,
    networks,
    networkDistances,
    routes,
    'passive-interface': passiveInterfaces,
    redistributes,
    'default-information': {
      originate: !!defOrig,
    },
    'distribute-list': {
      'access-list': { in: distList['access-list']?.in || '', out: distList['access-list']?.out || '' },
      'prefix-list': { in: distList['prefix-list']?.in || '', out: distList['prefix-list']?.out || '' },
    },
    timers: {
      'garbage-collection': data.timers?.['garbage-collection'] || '',
      timeout: data.timers?.timeout || '',
      update: data.timers?.update || '',
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['default-distance'])) result['default-distance'] = String(form['default-distance']);
  if (isPresent(form['default-metric'])) result['default-metric'] = String(form['default-metric']);
  if (isPresent(form['route-map'])) result['route-map'] = String(form['route-map']);
  if (isPresent(form.version)) result.version = String(form.version);

  // Interfaces
  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      const auth = {};
      if (isPresent(iface['plaintext-password'])) auth['plaintext-password'] = iface['plaintext-password'];
      if (iface.md5Keys?.length) {
        auth.md5 = {};
        for (const key of iface.md5Keys) {
          if (key['key-id']) {
            auth.md5[key['key-id']] = key.password ? { password: key.password } : {};
          }
        }
      }
      if (Object.keys(auth).length) attrs.authentication = auth;
      if (isPresent(iface['receive-version'])) attrs.receive = { version: iface['receive-version'] };
      if (isPresent(iface['send-version'])) attrs.send = { version: iface['send-version'] };
      if (isPresent(iface['split-horizon'])) attrs['split-horizon'] = iface['split-horizon'];
      result.interface[iface.name] = attrs;
    }
  }

  if (form.neighbors?.length) result.neighbor = form.neighbors.filter(n => n);
  if (form.networks?.length) result.network = form.networks.filter(n => n);

  if (form.networkDistances?.length) {
    result['network-distance'] = {};
    for (const nd of form.networkDistances) {
      if (!nd.network) continue;
      const attrs = {};
      if (isPresent(nd['access-list'])) attrs['access-list'] = nd['access-list'];
      if (isPresent(nd.distance)) attrs.distance = String(nd.distance);
      result['network-distance'][nd.network] = attrs;
    }
  }

  if (form.routes?.length) result.route = form.routes.filter(r => r);
  if (form['passive-interface']?.length) result['passive-interface'] = form['passive-interface'].filter(p => p);

  if (form.redistributes?.length) {
    result.redistribute = {};
    for (const redist of form.redistributes) {
      if (!redist.protocol) continue;
      const attrs = {};
      if (isPresent(redist.metric)) attrs.metric = String(redist.metric);
      if (isPresent(redist['route-map'])) attrs['route-map'] = redist['route-map'];
      result.redistribute[redist.protocol] = attrs;
    }
  }

  if (form['default-information']?.originate) {
    result['default-information'] = { originate: {} };
  }

  const dl = form['distribute-list'];
  if (dl) {
    const dlResult = {};
    if (dl['access-list']?.in || dl['access-list']?.out) {
      dlResult['access-list'] = {};
      if (dl['access-list'].in) dlResult['access-list'].in = dl['access-list'].in;
      if (dl['access-list'].out) dlResult['access-list'].out = dl['access-list'].out;
    }
    if (dl['prefix-list']?.in || dl['prefix-list']?.out) {
      dlResult['prefix-list'] = {};
      if (dl['prefix-list'].in) dlResult['prefix-list'].in = dl['prefix-list'].in;
      if (dl['prefix-list'].out) dlResult['prefix-list'].out = dl['prefix-list'].out;
    }
    if (Object.keys(dlResult).length) result['distribute-list'] = dlResult;
  }

  if (form.timers) {
    const t = {};
    if (isPresent(form.timers['garbage-collection'])) t['garbage-collection'] = String(form.timers['garbage-collection']);
    if (isPresent(form.timers.timeout)) t.timeout = String(form.timers.timeout);
    if (isPresent(form.timers.update)) t.update = String(form.timers.update);
    if (Object.keys(t).length) result.timers = t;
  }

  return result;
}

export default defineComponent({
  name: 'RipPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const newNeighbor = ref('');
    const newNetwork = ref('');
    const newRoute = ref('');
    const newPassiveInterface = ref('');
    const interfaces = ref([]);

    // Validation functions with i18n
    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('validation.ipv4Format');
      return '';
    }

    function validateNetwork(value) {
      if (!value) return '';
      const m = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
      if (!m) return t('validation.networkFormat');
      if (parseInt(m[2], 10) < 0 || parseInt(m[2], 10) > 32) return t('validation.prefixLengthRange');
      return '';
    }

    function validateMetric(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 16) return t('validation.metricRange');
      return '';
    }

    function validateDistance(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 255) return t('validation.distanceRange');
      return '';
    }

    function validateTimer(value, min, max, name) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < min || n > max) return t('validation.timerRange');
      return '';
    }

    function validateVersion(value) {
      if (!value) return '';
      if (value !== '1' && value !== '2' && value !== '2R') return t('validation.versionInvalid');
      return '';
    }

    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({
      name: '', 'plaintext-password': '', md5Keys: [],
      'receive-version': '', 'send-version': '', 'split-horizon': '',
    });

    const networkDistModalVisible = ref(false);
    const editingNetworkDistIndex = ref(-1);
    const networkDistForm = ref({ network: '', 'access-list': '', distance: '' });

    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const interfaceColumns = computed(() => [
      { key: 'name', title: t('routing.rip.col.interfaceName') },
      { key: 'receive-version', title: t('routing.rip.col.receiveVersion') },
      { key: 'send-version', title: t('routing.rip.col.sendVersion') },
      { key: 'split-horizon', title: t('routing.rip.col.splitHorizon') },
    ]);

    const networkDistColumns = computed(() => [
      { key: 'network', title: t('routing.rip.col.network') },
      { key: 'access-list', title: t('routing.rip.col.accessList') },
      { key: 'distance', title: t('routing.rip.col.distance') },
    ]);

    const redistributeColumns = computed(() => [
      { key: 'protocol', title: t('routing.rip.col.protocol') },
      { key: 'metric', title: t('routing.rip.col.metric') },
      { key: 'route-map', title: t('routing.rip.col.routeMap') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols rip interface';
      if (activeTab.value === 'redistribute') return 'protocols rip redistribute';
      if (activeTab.value === 'timers') return 'protocols rip timers';
      return 'protocols rip';
    });

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'static', label: 'Static' },
    ];

    const SPLIT_HORIZON_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'disable', label: t('option.disable') },
      { value: 'poison-reverse', label: 'Poison Reverse' },
    ]);

    const VERSION_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: '1', label: 'RIPv1' },
      { value: '2', label: 'RIPv2' },
      { value: '2R', label: 'RIPv2R' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'rip']);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function save() {
      if (config.value['default-distance']) {
        const err = validateDistance(config.value['default-distance']);
        if (err) return showError({ message: t('routing.rip.error.defaultDistance') + err });
      }
      if (config.value['default-metric']) {
        const err = validateMetric(config.value['default-metric']);
        if (err) return showError({ message: t('routing.rip.error.defaultMetric') + err });
      }
      for (let i = 0; i < config.value.networks.length; i++) {
        const err = validateNetwork(config.value.networks[i]);
        if (err) return showError({ message: t('routing.rip.error.network', { index: i + 1 }) + err });
      }
      for (let i = 0; i < config.value.neighbors.length; i++) {
        const err = validateIPv4(config.value.neighbors[i]);
        if (err) return showError({ message: t('routing.rip.error.neighbor', { index: i + 1 }) + err });
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols rip', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        networkDistModalVisible.value = false;
        redistributeModalVisible.value = false;
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function addNeighbor() {
      if (newNeighbor.value && !config.value.neighbors.includes(newNeighbor.value)) {
        config.value.neighbors.push(newNeighbor.value);
        newNeighbor.value = '';
      }
    }
    function removeNeighbor(idx) { config.value.neighbors.splice(idx, 1); }

    function addNetwork() {
      if (newNetwork.value && !config.value.networks.includes(newNetwork.value)) {
        config.value.networks.push(newNetwork.value);
        newNetwork.value = '';
      }
    }
    function removeNetwork(idx) { config.value.networks.splice(idx, 1); }

    function addRoute() {
      if (newRoute.value && !config.value.routes.includes(newRoute.value)) {
        config.value.routes.push(newRoute.value);
        newRoute.value = '';
      }
    }
    function removeRoute(idx) { config.value.routes.splice(idx, 1); }

    function addPassiveInterface() {
      if (newPassiveInterface.value && !config.value['passive-interface'].includes(newPassiveInterface.value)) {
        config.value['passive-interface'].push(newPassiveInterface.value);
        newPassiveInterface.value = '';
      }
    }
    function removePassiveInterface(idx) { config.value['passive-interface'].splice(idx, 1); }

    function openInterfaceModal(index = -1) {
      editingInterfaceIndex.value = index;
      if (index >= 0) {
        interfaceForm.value = JSON.parse(JSON.stringify(config.value.interfaces[index]));
      } else {
        interfaceForm.value = { name: '', 'plaintext-password': '', md5Keys: [], 'receive-version': '', 'send-version': '', 'split-horizon': '' };
      }
      interfaceModalVisible.value = true;
    }

    function addMd5Key() {
      interfaceForm.value.md5Keys.push({ 'key-id': '', password: '' });
    }
    function removeMd5Key(idx) { interfaceForm.value.md5Keys.splice(idx, 1); }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('routing.rip.error.interfaceNameRequired') });
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function openNetworkDistModal(index = -1) {
      editingNetworkDistIndex.value = index;
      if (index >= 0) {
        networkDistForm.value = JSON.parse(JSON.stringify(config.value.networkDistances[index]));
      } else {
        networkDistForm.value = { network: '', 'access-list': '', distance: '' };
      }
      networkDistModalVisible.value = true;
    }

    function saveNetworkDist() {
      if (!networkDistForm.value.network) return showError({ message: t('routing.rip.error.networkRequired') });
      const err = validateNetwork(networkDistForm.value.network);
      if (err) return showError({ message: err });
      if (editingNetworkDistIndex.value >= 0) {
        config.value.networkDistances.splice(editingNetworkDistIndex.value, 1, JSON.parse(JSON.stringify(networkDistForm.value)));
      } else {
        config.value.networkDistances.push(JSON.parse(JSON.stringify(networkDistForm.value)));
      }
      networkDistModalVisible.value = false;
    }

    function openRedistributeModal(index = -1) {
      editingRedistributeIndex.value = index;
      if (index >= 0) {
        redistributeForm.value = JSON.parse(JSON.stringify(config.value.redistributes[index]));
      } else {
        redistributeForm.value = { protocol: '', metric: '', 'route-map': '' };
      }
      redistributeModalVisible.value = true;
    }

    function saveRedistribute() {
      if (!redistributeForm.value.protocol) return showError({ message: t('routing.rip.error.protocolRequired') });
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return showError({ message: err });
      }
      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, JSON.parse(JSON.stringify(redistributeForm.value)));
      } else {
        config.value.redistributes.push(JSON.parse(JSON.stringify(redistributeForm.value)));
      }
      redistributeModalVisible.value = false;
    }

    // Delete confirmation modals
    const deleteInterfaceModalVisible = ref(false);
    const pendingDeleteInterfaceNames = ref([]);

    const deleteNetworkDistModalVisible = ref(false);
    const pendingDeleteNetworkDistNames = ref([]);

    const deleteRedistributeModalVisible = ref(false);
    const pendingDeleteRedistributeNames = ref([]);

    function deleteInterface(index) {
      pendingDeleteInterfaceNames.value = [config.value.interfaces[index].name];
      deleteInterfaceModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      const index = config.value.interfaces.findIndex(a => a.name === pendingDeleteInterfaceNames.value[0]);
      if (index >= 0) {
        config.value.interfaces.splice(index, 1);
      }
      deleteInterfaceModalVisible.value = false;
      pendingDeleteInterfaceNames.value = [];
    }

    function deleteNetworkDist(index) {
      pendingDeleteNetworkDistNames.value = [config.value.networkDistances[index].network];
      deleteNetworkDistModalVisible.value = true;
    }

    function confirmDeleteNetworkDist() {
      const index = config.value.networkDistances.findIndex(a => a.network === pendingDeleteNetworkDistNames.value[0]);
      if (index >= 0) {
        config.value.networkDistances.splice(index, 1);
      }
      deleteNetworkDistModalVisible.value = false;
      pendingDeleteNetworkDistNames.value = [];
    }

    function deleteRedistribute(index) {
      pendingDeleteRedistributeNames.value = [config.value.redistributes[index].protocol];
      deleteRedistributeModalVisible.value = true;
    }

    function confirmDeleteRedistribute() {
      const index = config.value.redistributes.findIndex(a => a.protocol === pendingDeleteRedistributeNames.value[0]);
      if (index >= 0) {
        config.value.redistributes.splice(index, 1);
      }
      deleteRedistributeModalVisible.value = false;
      pendingDeleteRedistributeNames.value = [];
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      loadInterfaces();
      onMenuRefresh(load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      newNeighbor, newNetwork, newRoute, newPassiveInterface,
      addNeighbor, removeNeighbor, addNetwork, removeNetwork, addRoute, removeRoute,
      addPassiveInterface, removePassiveInterface,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      networkDistModalVisible, editingNetworkDistIndex, networkDistForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      interfaceColumns, networkDistColumns, redistributeColumns,
      REDISTRIBUTE_PROTOCOL_OPTIONS, SPLIT_HORIZON_OPTIONS, VERSION_OPTIONS, commandPath,
      openInterfaceModal, openNetworkDistModal, openRedistributeModal,
      deleteInterface, deleteNetworkDist, deleteRedistribute,
      confirmDeleteInterface, confirmDeleteNetworkDist, confirmDeleteRedistribute,
      deleteInterfaceModalVisible, pendingDeleteInterfaceNames,
      deleteNetworkDistModalVisible, pendingDeleteNetworkDistNames,
      deleteRedistributeModalVisible, pendingDeleteRedistributeNames,
      addMd5Key, removeMd5Key, saveInterface, saveNetworkDist, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('msg.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('routing.rip.tab.basic') },
        { key: 'interfaces', title: t('routing.rip.tab.interfaces') },
        { key: 'neighbors', title: t('routing.rip.tab.neighbors') },
        { key: 'networks', title: t('routing.rip.tab.networks') },
        { key: 'network-dist', title: t('routing.rip.tab.networkDist') },
        { key: 'routes', title: t('routing.rip.tab.routes') },
        { key: 'redistribute', title: t('routing.rip.tab.redistribute') },
        { key: 'passive', title: t('routing.rip.tab.passive') },
        { key: 'timers', title: t('routing.rip.tab.timers') },
        { key: 'default-info', title: t('routing.rip.tab.defaultInfo') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.rip.basic.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.defaultDistance') }}</label>
                  <input type="number" class="form-control" v-model="config['default-distance']" min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.defaultMetric') }}</label>
                  <input type="number" class="form-control" v-model="config['default-metric']" min="0" max="16" placeholder="0-16" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.routeMap') }}</label>
                  <input type="text" class="form-control" v-model="config['route-map']" :placeholder="t('routing.rip.basic.routeMapPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.version') }}</label>
                  <select class="form-control" v-model="config.version" style="width:100%;">
                    <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.rip.basic.distributeList') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.accessListIn') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['access-list'].in" :placeholder="t('routing.rip.basic.accessListPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.accessListOut') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['access-list'].out" :placeholder="t('routing.rip.basic.accessListPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.prefixListIn') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['prefix-list'].in" :placeholder="t('routing.rip.basic.prefixListPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.rip.basic.prefixListOut') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['prefix-list'].out" :placeholder="t('routing.rip.basic.prefixListPlaceholder')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #neighbors>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.neighbors.address') }}</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newNeighbor" :placeholder="t('routing.rip.neighbors.addressPlaceholder')" style="width:100%;" />
                <ToolbarButton size="small" @click="addNeighbor">{{ t('btn.add') }}</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.neighbors" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeNeighbor(idx)">{{ t('btn.delete') }}</ToolbarButton>
            </div>
          </div>
        </template>

        <template #networks>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.networks.label') }}</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newNetwork" :placeholder="t('routing.rip.networks.placeholder')" style="width:100%;" />
                <ToolbarButton size="small" @click="addNetwork">{{ t('btn.add') }}</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.networks" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeNetwork(idx)">{{ t('btn.delete') }}</ToolbarButton>
            </div>
          </div>
        </template>

        <template #network-dist>
          <DataTable :columns="networkDistColumns" :data="config.networkDistances" :loading="loading" :disabled="writeDisabled"
                     rowKey="network" :actions="['create', 'edit', 'delete']"
                     @create="openNetworkDistModal(-1)" @edit="openNetworkDistModal" @delete="deleteNetworkDist" />
        </template>

        <template #routes>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.routes.label') }}</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newRoute" :placeholder="t('routing.rip.routes.placeholder')" style="width:100%;" />
                <ToolbarButton size="small" @click="addRoute">{{ t('btn.add') }}</ToolbarButton>
              </div>
            </div>
            <div v-for="(r, idx) in config.routes" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ r }}</span>
              <ToolbarButton size="small" danger @click="removeRoute(idx)">{{ t('btn.delete') }}</ToolbarButton>
            </div>
          </div>
        </template>

        <template #redistribute>
          <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                     rowKey="protocol" :actions="['create', 'edit', 'delete']"
                     @create="openRedistributeModal(-1)" @edit="openRedistributeModal" @delete="deleteRedistribute" />
        </template>

        <template #passive>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.passive.label') }}</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <select class="form-control" v-model="newPassiveInterface" style="width:100%;">
                  <option value="">{{ t('routing.rip.passive.selectPlaceholder') }}</option>
                  <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
                </select>
                <ToolbarButton size="small" @click="addPassiveInterface">{{ t('btn.add') }}</ToolbarButton>
              </div>
            </div>
            <div v-for="(iface, idx) in config['passive-interface']" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ iface }}</span>
              <ToolbarButton size="small" danger @click="removePassiveInterface(idx)">{{ t('btn.delete') }}</ToolbarButton>
            </div>
          </div>
        </template>

        <template #timers>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.timers.garbageCollection') }}</label>
              <input type="number" class="form-control" v-model="config.timers['garbage-collection']" min="1" max="65535" :placeholder="t('routing.rip.timers.garbageCollectionPlaceholder')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.timers.timeout') }}</label>
              <input type="number" class="form-control" v-model="config.timers.timeout" min="1" max="65535" :placeholder="t('routing.rip.timers.timeoutPlaceholder')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.timers.update') }}</label>
              <input type="number" class="form-control" v-model="config.timers.update" min="1" max="65535" :placeholder="t('routing.rip.timers.updatePlaceholder')" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #default-info>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('routing.rip.defaultInfo.originate') }}</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate" /></label>
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('routing.rip.modal.editInterface') : t('routing.rip.modal.addInterface')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.interfaceName') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('routing.rip.modal.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.plaintextPassword') }}</label>
          <input type="password" class="form-control" v-model="interfaceForm['plaintext-password']" :placeholder="t('routing.rip.modal.passwordPlaceholder')" style="width:100%;" />
        </div>
        <h4 style="margin-top:20px;">{{ t('routing.rip.modal.md5Keys') }}</h4>
        <div v-for="(key, idx) in interfaceForm.md5Keys" :key="idx" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
          <input type="number" class="form-control" v-model="key['key-id']" min="1" max="255" :placeholder="t('routing.rip.modal.keyId')" style="width:100px;" />
          <input type="password" class="form-control" v-model="key.password" :placeholder="t('routing.rip.modal.password')" style="flex:1;" />
          <ToolbarButton size="small" danger @click="removeMd5Key(idx)">{{ t('btn.delete') }}</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addMd5Key">{{ t('routing.rip.modal.addMd5Key') }}</ToolbarButton>
        <div class="form-row" style="margin-top:20px;">
          <label class="form-label">{{ t('routing.rip.modal.receiveVersion') }}</label>
          <select class="form-control" v-model="interfaceForm['receive-version']" style="width:100%;">
            <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.sendVersion') }}</label>
          <select class="form-control" v-model="interfaceForm['send-version']" style="width:100%;">
            <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.splitHorizon') }}</label>
          <select class="form-control" v-model="interfaceForm['split-horizon']" style="width:100%;">
            <option v-for="opt in SPLIT_HORIZON_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Network Distance Modal -->
      <DraggableModal v-model:visible="networkDistModalVisible" :title="editingNetworkDistIndex >= 0 ? t('routing.rip.modal.editNetworkDist') : t('routing.rip.modal.addNetworkDist')" width="600px" @confirm="saveNetworkDist">
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.network') }} *</label>
          <input type="text" class="form-control" v-model="networkDistForm.network" :placeholder="t('routing.rip.modal.networkPlaceholder')" style="width:100%;" :disabled="editingNetworkDistIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.accessList') }}</label>
          <input type="text" class="form-control" v-model="networkDistForm['access-list']" :placeholder="t('routing.rip.modal.accessListPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.distance') }}</label>
          <input type="number" class="form-control" v-model="networkDistForm.distance" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? t('routing.rip.modal.editRedistribute') : t('routing.rip.modal.addRedistribute')" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.protocol') }} *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.metric') }}</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="16" placeholder="0-16" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.rip.modal.routeMap') }}</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" :placeholder="t('routing.rip.modal.routeMapPlaceholder')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('modal.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('routing.rip.delete.confirmInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteInterfaceNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteNetworkDistModalVisible" :title="t('modal.confirmDelete')" width="400px" @confirm="confirmDeleteNetworkDist">
        <div>{{ t('routing.rip.delete.confirmNetworkDist') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNetworkDistNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteRedistributeModalVisible" :title="t('modal.confirmDelete')" width="400px" @confirm="confirmDeleteRedistribute">
        <div>{{ t('routing.rip.delete.confirmRedistribute') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRedistributeNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
