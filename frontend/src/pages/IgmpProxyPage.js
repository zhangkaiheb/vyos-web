import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
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

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'role', title: '角色' },
      { key: 'threshold', title: '阈值' },
    ];

    const ROLE_OPTIONS = [
      { value: '', label: '请选择' },
      { value: 'upstream', label: '上游 (upstream)' },
      { value: 'downstream', label: '下游 (downstream)' },
    ];

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
        await configApi.set('protocols igmp-proxy', payload);
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
      if (!interfaceForm.value.name) return alert('请选择接口');
      if (!interfaceForm.value.role) return alert('请选择角色');
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) config.value.interfaces.splice(index, 1);
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      interfaceColumns, ROLE_OPTIONS, commandPath,
      openInterfaceModal, deleteInterface,
      saveInterface, save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'interfaces', title: '接口' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">全局设置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">禁用实例</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.disable" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">禁用快速离开</label>
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

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 IGMP 代理接口' : '添加 IGMP 代理接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">请选择接口</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">角色 *</label>
          <select class="form-control" v-model="interfaceForm.role" style="width:100%;">
            <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">阈值</label>
          <input type="number" class="form-control" v-model="interfaceForm.threshold" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
