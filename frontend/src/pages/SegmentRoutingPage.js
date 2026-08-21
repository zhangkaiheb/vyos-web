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
      'mpls': !!attrs.mpls,
    });
  }

  const srv6 = data.srv6 || {};
  return {
    interfaces,
    srv6: {
      locator: srv6.locator || '',
      encapsulation: srv6.encapsulation || '',
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
      if (iface.mpls) attrs.mpls = {};
      result.interface[iface.name] = attrs;
    }
  }

  if (form.srv6) {
    const srv6Result = {};
    if (isPresent(form.srv6.locator)) srv6Result.locator = form.srv6.locator;
    if (isPresent(form.srv6.encapsulation)) srv6Result.encapsulation = form.srv6.encapsulation;
    if (Object.keys(srv6Result).length) result.srv6 = srv6Result;
  }

  return result;
}

export default defineComponent({
  name: 'SegmentRoutingPage',
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
    const interfaceForm = ref({ name: '', mpls: false });

    const deleteModalVisible = ref(false);
    const pendingDeleteName = ref('');
    const pendingDeleteIndex = ref(-1);

    const interfaceColumns = [
      { key: 'name', title: t('segmentRouting.columns.interfaceName') },
      { key: 'mpls', title: 'MPLS', render: (val) => val ? t('segmentRouting.options.enabled') : t('segmentRouting.options.disabled') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols segment-routing interface';
      if (activeTab.value === 'srv6') return 'protocols segment-routing srv6';
      return 'protocols segment-routing';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'segment-routing']);
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
        await configStore.setConfig('protocols segment-routing', payload);
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
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
        interfaceForm.value = { name: '', mpls: false };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('segmentRouting.messages.selectInterface') });
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      pendingDeleteName.value = config.value.interfaces[index].name;
      pendingDeleteIndex.value = index;
      deleteModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      config.value.interfaces.splice(pendingDeleteIndex.value, 1);
      deleteModalVisible.value = false;
      pendingDeleteName.value = '';
      pendingDeleteIndex.value = -1;
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
      deleteModalVisible, pendingDeleteName, pendingDeleteIndex,
      interfaceColumns, commandPath,
      openInterfaceModal, deleteInterface, confirmDeleteInterface,
      saveInterface, save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('segmentRouting.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('segmentRouting.tabs.basic') },
        { key: 'interfaces', title: t('segmentRouting.tabs.interfaces') },
        { key: 'srv6', title: t('segmentRouting.tabs.srv6') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('segmentRouting.sections.segmentRoutingConfig') }}</div>
              <div style="padding:16px;">
                <p style="color:#666;">{{ t('segmentRouting.descriptions.basicConfig') }}</p>
              </div>
            </div>
          </div>
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #srv6>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('segmentRouting.labels.locator') }}</label>
              <input type="text" class="form-control" v-model="config.srv6.locator" :placeholder="t('segmentRouting.placeholders.srv6Locator')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('segmentRouting.labels.encapsulation') }}</label>
              <input type="text" class="form-control" v-model="config.srv6.encapsulation" :placeholder="t('segmentRouting.placeholders.encapsulationType')" style="width:100%;" />
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('segmentRouting.modals.editSegmentRoutingInterface') : t('segmentRouting.modals.addSegmentRoutingInterface')" width="500px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('segmentRouting.labels.interfaceNameRequired') }}</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('segmentRouting.placeholders.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('segmentRouting.labels.enableMpls') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.mpls" /></label>
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('segmentRouting.modals.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('segmentRouting.messages.confirmDeleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
