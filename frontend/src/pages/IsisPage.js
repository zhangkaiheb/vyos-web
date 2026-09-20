import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

// Validation functions moved inside setup() for i18n access

// IS-IS configuration conversion
function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      metric: attrs.metric || '',
      passive: !!attrs.passive,
      'network-type': attrs['network-type'] || '',
    });
  }

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

  return {
    net: data.net || '',
    level: data.level || '',
    'metric-style': data['metric-style'] || '',
    'dynamic-hostname': !!data['dynamic-hostname'],
    'log-adjacency-changes': !!data['log-adjacency-changes'],
    'purge-originator': !!data['purge-originator'],
    'set-attached-bit': !!data['set-attached-bit'],
    'set-overload-bit': !!data['set-overload-bit'],
    'lsp-gen-interval': data['lsp-gen-interval'] || '',
    'lsp-mtu': data['lsp-mtu'] || '',
    'lsp-refresh-interval': data['lsp-refresh-interval'] || '',
    'max-lsp-lifetime': data['max-lsp-lifetime'] || '',
    interfaces,
    redistributes,
    'default-information': {
      originate: {
        always: !!defOrig.always,
        metric: defOrig.metric || '',
        'route-map': defOrig['route-map'] || '',
      },
    },
    'area-password': data['area-password'] || '',
    'domain-password': data['domain-password'] || '',
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form.net)) result.net = String(form.net);
  if (isPresent(form.level)) result.level = String(form.level);
  if (isPresent(form['metric-style'])) result['metric-style'] = String(form['metric-style']);
  if (form['dynamic-hostname']) result['dynamic-hostname'] = {};
  if (form['log-adjacency-changes']) result['log-adjacency-changes'] = {};
  if (form['purge-originator']) result['purge-originator'] = {};
  if (form['set-attached-bit']) result['set-attached-bit'] = {};
  if (form['set-overload-bit']) result['set-overload-bit'] = {};
  if (isPresent(form['lsp-gen-interval'])) result['lsp-gen-interval'] = String(form['lsp-gen-interval']);
  if (isPresent(form['lsp-mtu'])) result['lsp-mtu'] = String(form['lsp-mtu']);
  if (isPresent(form['lsp-refresh-interval'])) result['lsp-refresh-interval'] = String(form['lsp-refresh-interval']);
  if (isPresent(form['max-lsp-lifetime'])) result['max-lsp-lifetime'] = String(form['max-lsp-lifetime']);

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface.metric)) attrs.metric = String(iface.metric);
      if (iface.passive) attrs.passive = {};
      if (isPresent(iface['network-type'])) attrs['network-type'] = iface['network-type'];
      result.interface[iface.name] = attrs;
    }
  }

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
    const orig = form['default-information'].originate;
    if (orig.always || orig.metric || orig['route-map']) {
      result['default-information'] = { originate: {} };
      if (orig.always) result['default-information'].originate.always = {};
      if (isPresent(orig.metric)) result['default-information'].originate.metric = String(orig.metric);
      if (isPresent(orig['route-map'])) result['default-information'].originate['route-map'] = orig['route-map'];
    }
  }

  if (isPresent(form['area-password'])) result['area-password'] = String(form['area-password']);
  if (isPresent(form['domain-password'])) result['domain-password'] = String(form['domain-password']);

  return result;
}

export default defineComponent({
  name: 'IsisPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    // Validation functions with i18n
    function validateNET(value) {
      if (!value) return '';
      if (!/^[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}$/.test(value)) {
        return t('validation.isisNetFormat');
      }
      return '';
    }

    function validateMetric(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 16777215) return t('validation.isisMetricRange');
      return '';
    }

    function validateTimer(value, min, max, name) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < min || n > max) return t('validation.timerRange');
      return '';
    }

    function validateLspMtu(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 128 || n > 4352) return t('validation.isisLspMtuRange');
      return '';
    }

    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({ name: '', metric: '', passive: false, 'network-type': '' });

    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const interfaceColumns = computed(() => [
      { key: 'name', title: t('routing.isis.col.interfaceName') },
      { key: 'metric', title: t('routing.isis.col.metric') },
      { key: 'network-type', title: t('routing.isis.col.networkType') },
    ]);

    const redistributeColumns = computed(() => [
      { key: 'protocol', title: t('routing.isis.col.protocol') },
      { key: 'metric', title: t('routing.isis.col.metric') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols isis interface';
      if (activeTab.value === 'redistribute') return 'protocols isis redistribute';
      if (activeTab.value === 'default-info') return 'protocols isis default-information originate';
      if (activeTab.value === 'passwords') return 'protocols isis area-password';
      return 'protocols isis';
    });

    const LEVEL_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'level-1', label: 'Level 1' },
      { value: 'level-2', label: 'Level 2' },
      { value: 'level-1-2', label: 'Level 1-2' },
    ]);

    const METRIC_STYLE_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'old', label: 'Old (ISO 10589)' },
      { value: 'new', label: 'New' },
      { value: 'transition', label: 'Transition' },
    ]);

    const NETWORK_TYPE_OPTIONS = computed(() => [
      { value: '', label: t('option.default') },
      { value: 'point-to-point', label: 'Point-to-Point' },
      { value: 'broadcast', label: 'Broadcast' },
    ]);

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'isis']);
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
      if (config.value.net) {
        const err = validateNET(config.value.net);
        if (err) return showError({ message: t('routing.isis.error.net') + err });
      }
      if (config.value['lsp-mtu']) {
        const err = validateLspMtu(config.value['lsp-mtu']);
        if (err) return showError({ message: t('routing.isis.error.lspMtu') + err });
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols isis', payload);
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        redistributeModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openInterfaceModal(index = -1) {
      editingInterfaceIndex.value = index;
      if (index >= 0) {
        interfaceForm.value = JSON.parse(JSON.stringify(config.value.interfaces[index]));
      } else {
        interfaceForm.value = { name: '', metric: '', passive: false, 'network-type': '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('routing.isis.error.interfaceNameRequired') });
      if (interfaceForm.value.metric) {
        const err = validateMetric(interfaceForm.value.metric);
        if (err) return showError({ message: err });
      }
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
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
      if (!redistributeForm.value.protocol) return showError({ message: t('routing.isis.error.protocolRequired') });
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
      loadInterfaces();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      interfaceColumns, redistributeColumns,
      LEVEL_OPTIONS, METRIC_STYLE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, commandPath,
      openInterfaceModal, openRedistributeModal,
      deleteInterface, deleteRedistribute,
      confirmDeleteInterface, confirmDeleteRedistribute,
      deleteInterfaceModalVisible, pendingDeleteInterfaceNames,
      deleteRedistributeModalVisible, pendingDeleteRedistributeNames,
      saveInterface, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('msg.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('routing.isis.tab.basic') },
        { key: 'interfaces', title: t('routing.isis.tab.interfaces') },
        { key: 'redistribute', title: t('routing.isis.tab.redistribute') },
        { key: 'default-info', title: t('routing.isis.tab.defaultInfo') },
        { key: 'passwords', title: t('routing.isis.tab.passwords') },
        { key: 'advanced', title: t('routing.isis.tab.advanced') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.isis.basic.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.net') }}</label>
                  <input type="text" class="form-control" v-model="config.net"
                         :placeholder="t('routing.isis.form.netPlaceholder')" style="width:100%;"
                         :title="t('routing.isis.form.netTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.level') }}</label>
                  <select class="form-control" v-model="config.level" style="width:100%;">
                    <option v-for="opt in LEVEL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.metricStyle') }}</label>
                  <select class="form-control" v-model="config['metric-style']" style="width:100%;">
                    <option v-for="opt in METRIC_STYLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.dynamicHostname') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['dynamic-hostname']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.logAdjacencyChanges') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.purgeOriginator') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['purge-originator']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.setAttachedBit') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['set-attached-bit']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.setOverloadBit') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['set-overload-bit']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.lspGenInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['lsp-gen-interval']"
                         min="1" max="65535" :placeholder="t('routing.isis.form.lspGenIntervalPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.lspMtu') }}</label>
                  <input type="number" class="form-control" v-model="config['lsp-mtu']"
                         min="128" max="4352" placeholder="128-4352" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.lspRefreshInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['lsp-refresh-interval']"
                         min="1" max="65535" :placeholder="t('routing.isis.form.lspRefreshIntervalPlaceholder')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.isis.form.maxLspLifetime') }}</label>
                  <input type="number" class="form-control" v-model="config['max-lsp-lifetime']"
                         min="1" max="65535" :placeholder="t('routing.isis.form.maxLspLifetimePlaceholder')" style="width:100%;" />
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

        <template #redistribute>
          <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                     rowKey="protocol" :actions="['create', 'edit', 'delete']"
                     @create="openRedistributeModal(-1)" @edit="openRedistributeModal" @delete="deleteRedistribute" />
        </template>

        <template #default-info>
          <div style="padding:16px;">
            <h4>{{ t('routing.isis.defaultInfo.title') }}</h4>
            <div class="form-row">
              <label class="form-label">{{ t('routing.isis.defaultInfo.always') }}</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('routing.isis.defaultInfo.metric') }}</label>
              <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                     min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('routing.isis.defaultInfo.routeMap') }}</label>
              <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                     :placeholder="t('routing.isis.defaultInfo.routeMapPlaceholder')" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #passwords>
          <div style="padding:16px;">
            <h4>{{ t('routing.isis.passwords.title') }}</h4>
            <div class="form-row">
              <label class="form-label">{{ t('routing.isis.passwords.areaPassword') }}</label>
              <input type="password" class="form-control" v-model="config['area-password']"
                     :placeholder="t('routing.isis.passwords.areaPasswordPlaceholder')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('routing.isis.passwords.domainPassword') }}</label>
              <input type="password" class="form-control" v-model="config['domain-password']"
                     :placeholder="t('routing.isis.passwords.domainPasswordPlaceholder')" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #advanced>
          <div style="padding:16px;">
            <h4>{{ t('routing.isis.advanced.title') }}</h4>
            <p style="color:#666;">{{ t('routing.isis.advanced.hint') }}</p>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('routing.isis.modal.editInterface') : t('routing.isis.modal.addInterface')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.interfaceName') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('routing.isis.modal.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.metric') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.metric"
                 min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.networkType') }}</label>
          <select class="form-control" v-model="interfaceForm['network-type']" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.passive" />
            {{ t('routing.isis.modal.passiveMode') }}
          </label>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? t('routing.isis.modal.editRedistribute') : t('routing.isis.modal.addRedistribute')" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.protocol') }} *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.metric') }}</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric"
                 min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.isis.modal.routeMap') }}</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']"
                 :placeholder="t('routing.isis.modal.routeMapPlaceholder')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('common.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('routing.isis.delete.confirmInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteInterfaceNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteRedistributeModalVisible" :title="t('common.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteRedistribute">
        <div>{{ t('routing.isis.delete.confirmRedistribute') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRedistributeNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
