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

function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
    });
  }

  const ldp = data.ldp || {};
  const ldpInterfaces = [];
  const ldpInterfaceData = ldp.interface || {};
  for (const [ifName, attrs] of Object.entries(ldpInterfaceData)) {
    ldpInterfaces.push({
      name: ifName,
      'hello-interval': attrs['hello-interval'] || '',
      'hello-holdtime': attrs['hello-holdtime'] || '',
    });
  }

  return {
    interfaces,
    ldp: {
      interfaces: ldpInterfaces,
      'router-id': ldp['router-id'] || '',
      'targeted-hello': !!ldp['targeted-hello'],
    },
    parameters: {
      'maximum-labels': data.parameters?.['maximum-labels'] || '',
      'range-size': data.parameters?.['range-size'] || '',
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      result.interface[iface.name] = {};
    }
  }

  if (form.ldp) {
    const ldpResult = {};
    if (form.ldp.interfaces?.length) {
      ldpResult.interface = {};
      for (const iface of form.ldp.interfaces) {
        if (!iface.name) continue;
        const attrs = {};
        if (isPresent(iface['hello-interval'])) attrs['hello-interval'] = String(iface['hello-interval']);
        if (isPresent(iface['hello-holdtime'])) attrs['hello-holdtime'] = String(iface['hello-holdtime']);
        ldpResult.interface[iface.name] = attrs;
      }
    }
    if (isPresent(form.ldp['router-id'])) ldpResult['router-id'] = form.ldp['router-id'];
    if (form.ldp['targeted-hello']) ldpResult['targeted-hello'] = {};
    if (Object.keys(ldpResult).length) result.ldp = ldpResult;
  }

  if (form.parameters) {
    const params = {};
    if (isPresent(form.parameters['maximum-labels'])) params['maximum-labels'] = String(form.parameters['maximum-labels']);
    if (isPresent(form.parameters['range-size'])) params['range-size'] = String(form.parameters['range-size']);
    if (Object.keys(params).length) result.parameters = params;
  }

  return result;
}

export default defineComponent({
  name: 'MplsPage',
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
    const interfaceForm = ref({ name: '' });

    const ldpInterfaceModalVisible = ref(false);
    const editingLdpInterfaceIndex = ref(-1);
    const ldpInterfaceForm = ref({ name: '', 'hello-interval': '', 'hello-holdtime': '' });

    const deleteInterfaceModalVisible = ref(false);
    const pendingDeleteInterfaceName = ref('');
    const pendingDeleteInterfaceIndex = ref(-1);

    const deleteLdpInterfaceModalVisible = ref(false);
    const pendingDeleteLdpInterfaceName = ref('');
    const pendingDeleteLdpInterfaceIndex = ref(-1);

    const interfaceColumns = [
      { key: 'name', title: t('mpls.columns.interfaceName') },
    ];

    const ldpInterfaceColumns = [
      { key: 'name', title: t('mpls.columns.interfaceName') },
      { key: 'hello-interval', title: t('mpls.columns.helloInterval') },
      { key: 'hello-holdtime', title: t('mpls.columns.helloHoldtime') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols mpls interface';
      if (activeTab.value === 'ldp') return 'protocols mpls ldp';
      if (activeTab.value === 'parameters') return 'protocols mpls parameters';
      return 'protocols mpls';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'mpls']);
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
        await configStore.setConfig('protocols mpls', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        ldpInterfaceModalVisible.value = false;
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
        interfaceForm.value = { name: '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('mpls.messages.selectInterface') });
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function openLdpInterfaceModal(index = -1) {
      editingLdpInterfaceIndex.value = index;
      if (index >= 0) {
        ldpInterfaceForm.value = JSON.parse(JSON.stringify(config.value.ldp.interfaces[index]));
      } else {
        ldpInterfaceForm.value = { name: '', 'hello-interval': '', 'hello-holdtime': '' };
      }
      ldpInterfaceModalVisible.value = true;
    }

    function saveLdpInterface() {
      if (!ldpInterfaceForm.value.name) return showError({ message: t('mpls.messages.selectInterface') });
      if (editingLdpInterfaceIndex.value >= 0) {
        config.value.ldp.interfaces.splice(editingLdpInterfaceIndex.value, 1, JSON.parse(JSON.stringify(ldpInterfaceForm.value)));
      } else {
        config.value.ldp.interfaces.push(JSON.parse(JSON.stringify(ldpInterfaceForm.value)));
      }
      ldpInterfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      pendingDeleteInterfaceName.value = config.value.interfaces[index].name;
      pendingDeleteInterfaceIndex.value = index;
      deleteInterfaceModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      config.value.interfaces.splice(pendingDeleteInterfaceIndex.value, 1);
      deleteInterfaceModalVisible.value = false;
      pendingDeleteInterfaceName.value = '';
      pendingDeleteInterfaceIndex.value = -1;
    }

    function deleteLdpInterface(index) {
      pendingDeleteLdpInterfaceName.value = config.value.ldp.interfaces[index].name;
      pendingDeleteLdpInterfaceIndex.value = index;
      deleteLdpInterfaceModalVisible.value = true;
    }

    function confirmDeleteLdpInterface() {
      config.value.ldp.interfaces.splice(pendingDeleteLdpInterfaceIndex.value, 1);
      deleteLdpInterfaceModalVisible.value = false;
      pendingDeleteLdpInterfaceName.value = '';
      pendingDeleteLdpInterfaceIndex.value = -1;
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      ldpInterfaceModalVisible, editingLdpInterfaceIndex, ldpInterfaceForm,
      deleteInterfaceModalVisible, pendingDeleteInterfaceName, pendingDeleteInterfaceIndex,
      deleteLdpInterfaceModalVisible, pendingDeleteLdpInterfaceName, pendingDeleteLdpInterfaceIndex,
      interfaceColumns, ldpInterfaceColumns, commandPath,
      openInterfaceModal, openLdpInterfaceModal,
      deleteInterface, confirmDeleteInterface, deleteLdpInterface, confirmDeleteLdpInterface,
      saveInterface, saveLdpInterface,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('mpls.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('mpls.tabs.basic') },
        { key: 'interfaces', title: t('mpls.tabs.interfaces') },
        { key: 'ldp', title: t('mpls.tabs.ldp') },
        { key: 'parameters', title: t('mpls.tabs.parameters') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('mpls.sections.mplsConfig') }}</div>
              <div style="padding:16px;">
                <p style="color:#666;">{{ t('mpls.descriptions.mplsConfig') }}</p>
              </div>
            </div>
          </div>
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #ldp>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('mpls.sections.ldpBasic') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('mpls.labels.routerId') }}</label>
                  <input type="text" class="form-control" v-model="config.ldp['router-id']" :placeholder="t('mpls.placeholders.routerId')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('mpls.labels.targetedHello') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.ldp['targeted-hello']" /></label>
                </div>
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9; display:flex; justify-content:space-between; align-items:center;">
                <span>{{ t('mpls.sections.ldpInterfaces') }}</span>
                <ToolbarButton size="small" @click="openLdpInterfaceModal(-1)">{{ t('mpls.buttons.addInterface') }}</ToolbarButton>
              </div>
              <DataTable :columns="ldpInterfaceColumns" :data="config.ldp.interfaces" :loading="loading" :disabled="writeDisabled"
                         rowKey="name" :actions="['edit', 'delete']"
                         @edit="openLdpInterfaceModal" @delete="deleteLdpInterface" />
            </div>
          </div>
        </template>

        <template #parameters>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('mpls.labels.maximumLabels') }}</label>
              <input type="number" class="form-control" v-model="config.parameters['maximum-labels']" min="1" max="1048575" :placeholder="t('mpls.placeholders.labelRange')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('mpls.labels.rangeSize') }}</label>
              <input type="number" class="form-control" v-model="config.parameters['range-size']" min="1" max="1048575" :placeholder="t('mpls.placeholders.labelRange')" style="width:100%;" />
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('mpls.modals.editMplsInterface') : t('mpls.modals.addMplsInterface')" width="500px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('mpls.labels.interfaceNameRequired') }}</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('mpls.placeholders.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
      </DraggableModal>

      <!-- LDP Interface Modal -->
      <DraggableModal v-model:visible="ldpInterfaceModalVisible" :title="editingLdpInterfaceIndex >= 0 ? t('mpls.modals.editLdpInterface') : t('mpls.modals.addLdpInterface')" width="500px" @confirm="saveLdpInterface">
        <div class="form-row">
          <label class="form-label">{{ t('mpls.labels.interfaceNameRequired') }}</label>
          <template v-if="editingLdpInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="ldpInterfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="ldpInterfaceForm.name" style="width:100%;">
              <option value="">{{ t('mpls.placeholders.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mpls.labels.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="ldpInterfaceForm['hello-interval']" min="1" max="65535" :placeholder="t('mpls.placeholders.helloInterval')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mpls.labels.helloHoldtime') }}</label>
          <input type="number" class="form-control" v-model="ldpInterfaceForm['hello-holdtime']" min="1" max="65535" :placeholder="t('mpls.placeholders.helloHoldtime')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Interface Confirmation Modal -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('mpls.modals.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('mpls.messages.confirmDeleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteInterfaceName }}</div>
        </div>
      </DraggableModal>

      <!-- Delete LDP Interface Confirmation Modal -->
      <DraggableModal v-model:visible="deleteLdpInterfaceModalVisible" :title="t('mpls.modals.confirmDelete')" width="400px" @confirm="confirmDeleteLdpInterface">
        <div>{{ t('mpls.messages.confirmDeleteLdpInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteLdpInterfaceName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
