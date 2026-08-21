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

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('babel.errors.ipv4Format');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('babel.errors.ipv4Format');
  return '';
}

function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      'cost': attrs.cost || '',
      'hello-interval': attrs['hello-interval'] || '',
      'type': attrs.type || '',
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

  const distList = data['distribute-list'] || {};

  return {
    interfaces,
    redistributes,
    'distribute-list': {
      ipv4: {
        'access-list': distList.ipv4?.['access-list'] || '',
        'prefix-list': distList.ipv4?.['prefix-list'] || '',
      },
      ipv6: {
        'access-list': distList.ipv6?.['access-list'] || '',
        'prefix-list': distList.ipv6?.['prefix-list'] || '',
      },
    },
    parameters: {
      'update-interval': data.parameters?.['update-interval'] || '',
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface.cost)) attrs.cost = String(iface.cost);
      if (isPresent(iface['hello-interval'])) attrs['hello-interval'] = String(iface['hello-interval']);
      if (isPresent(iface.type)) attrs.type = iface.type;
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

  const dl = form['distribute-list'];
  if (dl) {
    const dlResult = {};
    if (dl.ipv4?.['access-list'] || dl.ipv4?.['prefix-list']) {
      dlResult.ipv4 = {};
      if (dl.ipv4['access-list']) dlResult.ipv4['access-list'] = dl.ipv4['access-list'];
      if (dl.ipv4['prefix-list']) dlResult.ipv4['prefix-list'] = dl.ipv4['prefix-list'];
    }
    if (dl.ipv6?.['access-list'] || dl.ipv6?.['prefix-list']) {
      dlResult.ipv6 = {};
      if (dl.ipv6['access-list']) dlResult.ipv6['access-list'] = dl.ipv6['access-list'];
      if (dl.ipv6['prefix-list']) dlResult.ipv6['prefix-list'] = dl.ipv6['prefix-list'];
    }
    if (Object.keys(dlResult).length) result['distribute-list'] = dlResult;
  }

  if (form.parameters?.['update-interval']) {
    result.parameters = { 'update-interval': String(form.parameters['update-interval']) };
  }

  return result;
}

export default defineComponent({
  name: 'BabelPage',
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

    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({
      name: '', cost: '', 'hello-interval': '', type: '',
    });

    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const interfaceColumns = computed(() => [
      { key: 'name', title: t('babel.columns.interfaceName') },
      { key: 'cost', title: t('babel.columns.cost') },
      { key: 'hello-interval', title: t('babel.columns.helloInterval') },
      { key: 'type', title: t('babel.columns.type') },
    ]);

    const redistributeColumns = computed(() => [
      { key: 'protocol', title: t('babel.columns.protocol') },
      { key: 'metric', title: t('babel.columns.metric') },
      { key: 'route-map', title: t('babel.columns.routeMap') },
    ]);

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'static', label: 'Static' },
    ];

    const INTERFACE_TYPE_OPTIONS = computed(() => [
      { value: '', label: t('babel.options.default') },
      { value: 'wired', label: t('babel.options.wired') },
      { value: 'wireless', label: t('babel.options.wireless') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols babel interface';
      if (activeTab.value === 'redistribute') return 'protocols babel redistribute';
      if (activeTab.value === 'parameters') return 'protocols babel parameters';
      return 'protocols babel';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'babel']);
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
      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols babel', payload);
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
        interfaceForm.value = { name: '', cost: '', 'hello-interval': '', type: '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('babel.messages.selectInterface') });
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
      if (!redistributeForm.value.protocol) return showError({ message: t('babel.messages.selectProtocol') });
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
      REDISTRIBUTE_PROTOCOL_OPTIONS, INTERFACE_TYPE_OPTIONS, commandPath,
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
      <div v-if="saved" class="alert alert-success">{{ t('babel.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('babel.tabs.basic') },
        { key: 'interfaces', title: t('babel.tabs.interfaces') },
        { key: 'redistribute', title: t('babel.tabs.redistribute') },
        { key: 'parameters', title: t('babel.tabs.parameters') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('babel.labels.distributeList') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('babel.labels.ipv4AccessList') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv4['access-list']" :placeholder="t('babel.placeholders.accessListName')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('babel.labels.ipv4PrefixList') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv4['prefix-list']" :placeholder="t('babel.placeholders.prefixListName')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('babel.labels.ipv6AccessList') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv6['access-list']" :placeholder="t('babel.placeholders.accessListName')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('babel.labels.ipv6PrefixList') }}</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv6['prefix-list']" :placeholder="t('babel.placeholders.prefixListName')" style="width:100%;" />
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

        <template #parameters>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('babel.labels.updateInterval') }}</label>
              <input type="number" class="form-control" v-model="config.parameters['update-interval']" min="1" max="65535" :placeholder="t('babel.placeholders.updateInterval')" style="width:100%;" />
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('babel.modals.editBabelInterface') : t('babel.modals.addBabelInterface')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.interfaceNameRequired') }}</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('babel.messages.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.cost') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost" min="1" max="65535" placeholder="1-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']" min="1" max="65535" :placeholder="t('babel.placeholders.helloInterval')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.interfaceType') }}</label>
          <select class="form-control" v-model="interfaceForm.type" style="width:100%;">
            <option v-for="opt in INTERFACE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? t('babel.modals.editRedistribute') : t('babel.modals.addRedistribute')" width="500px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.protocolRequired') }}</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;">
            <option value="">{{ t('babel.messages.selectProtocol') }}</option>
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.metric') }}</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="65535" placeholder="0-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('babel.labels.routeMap') }}</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" :placeholder="t('babel.placeholders.routeMapName')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('babel.modals.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('babel.messages.confirmDeleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteInterfaceNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteRedistributeModalVisible" :title="t('babel.modals.confirmDelete')" width="400px" @confirm="confirmDeleteRedistribute">
        <div>{{ t('babel.messages.confirmDeleteRedistribute') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRedistributeNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
