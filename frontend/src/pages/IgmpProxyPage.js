import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

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
      'role': attrs.role || '',
      'alt-subnet': toArray(attrs['alt-subnet']),
      'threshold': attrs.threshold || '',
    });
  }

  return {
    disable: !!data.disable,
    'disable-quickleave': !!data['disable-quickleave'],
    interfaces,
  };
}

function configToConfig(form) {
  const result = {};

  if (form.disable) result.disable = {};
  if (form['disable-quickleave']) result['disable-quickleave'] = {};

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface.role)) attrs.role = iface.role;
      if (iface['alt-subnet']?.length) attrs['alt-subnet'] = iface['alt-subnet'].filter(s => s);
      if (isPresent(iface.threshold)) attrs.threshold = String(iface.threshold);
      result.interface[iface.name] = attrs;
    }
  }

  return result;
}

export default defineComponent({
  name: 'IgmpProxyPage',
  setup() {
    const configStore = useConfigStore();
    const t = inject('i18n');
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
      name: '', role: '', 'alt-subnet': [], threshold: '',
    });

    const deleteModalVisible = ref(false);
    const pendingDeleteName = ref('');
    const pendingDeleteIndex = ref(-1);

    const interfaceColumns = computed(() => [
      { key: 'name', title: t('igmpProxy.interfaceName') },
      { key: 'role', title: t('igmpProxy.role') },
      { key: 'threshold', title: t('igmpProxy.threshold') },
    ]);

    const ROLE_OPTIONS = computed(() => [
      { value: '', label: t('igmpProxy.selectRole') },
      { value: 'upstream', label: t('igmpProxy.upstream') },
      { value: 'downstream', label: t('igmpProxy.downstream') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols igmp-proxy interface';
      return 'protocols igmp-proxy';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'igmp-proxy']);
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
        await configStore.setConfig('protocols igmp-proxy', payload);
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
        interfaceForm.value = { name: '', role: '', 'alt-subnet': [], threshold: '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('igmpProxy.pleaseSelectInterface') });
      if (!interfaceForm.value.role) return showError({ message: t('igmpProxy.pleaseSelectRole') });
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
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      deleteModalVisible, pendingDeleteName, pendingDeleteIndex,
      interfaceColumns, ROLE_OPTIONS, commandPath,
      openInterfaceModal, deleteInterface, confirmDeleteInterface,
      saveInterface, save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('igmpProxy.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('igmpProxy.basicSettings') },
        { key: 'interfaces', title: t('igmpProxy.interfaces') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('igmpProxy.globalSettings') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('igmpProxy.disableInstance') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.disable" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('igmpProxy.disableQuickLeave') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['disable-quickleave']" /></label>
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
      </TabGroup>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" @click="save" :disabled="saving || loading || writeDisabled">{{ saving ? t('igmpProxy.saving') : t('igmpProxy.confirm') }}</ToolbarButton>
        </div>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('igmpProxy.editInterface') : t('igmpProxy.addInterface')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('igmpProxy.interfaceName') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('igmpProxy.pleaseSelectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('igmpProxy.role') }} *</label>
          <select class="form-control" v-model="interfaceForm.role" style="width:100%;">
            <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('igmpProxy.threshold') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.threshold" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('igmpProxy.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('igmpProxy.confirmDeleteMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
