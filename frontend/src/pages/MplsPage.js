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

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
    ];

    const ldpInterfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'hello-interval', title: 'Hello 间隔' },
      { key: 'hello-holdtime', title: 'Hello 保持时间' },
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
        await configApi.set('protocols mpls', payload);
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
      if (!interfaceForm.value.name) return alert('请选择接口');
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
      if (!ldpInterfaceForm.value.name) return alert('请选择接口');
      if (editingLdpInterfaceIndex.value >= 0) {
        config.value.ldp.interfaces.splice(editingLdpInterfaceIndex.value, 1, JSON.parse(JSON.stringify(ldpInterfaceForm.value)));
      } else {
        config.value.ldp.interfaces.push(JSON.parse(JSON.stringify(ldpInterfaceForm.value)));
      }
      ldpInterfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) config.value.interfaces.splice(index, 1);
    }

    function deleteLdpInterface(index) {
      if (confirm('确定删除此 LDP 接口？')) config.value.ldp.interfaces.splice(index, 1);
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      ldpInterfaceModalVisible, editingLdpInterfaceIndex, ldpInterfaceForm,
      interfaceColumns, ldpInterfaceColumns, commandPath,
      openInterfaceModal, openLdpInterfaceModal,
      deleteInterface, deleteLdpInterface,
      saveInterface, saveLdpInterface,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'interfaces', title: '接口' },
        { key: 'ldp', title: 'LDP' },
        { key: 'parameters', title: '参数' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">MPLS 配置</div>
              <div style="padding:16px;">
                <p style="color:#666;">MPLS 基本配置请在接口和 LDP 标签页中完成。</p>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">LDP 基本设置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">路由器 ID</label>
                  <input type="text" class="form-control" v-model="config.ldp['router-id']" placeholder="例如: 1.1.1.1" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">目标 Hello</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.ldp['targeted-hello']" /></label>
                </div>
              </div>
            </div>
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9; display:flex; justify-content:space-between; align-items:center;">
                <span>LDP 接口</span>
                <ToolbarButton size="small" @click="openLdpInterfaceModal(-1)">添加接口</ToolbarButton>
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
              <label class="form-label">最大标签数</label>
              <input type="number" class="form-control" v-model="config.parameters['maximum-labels']" min="1" max="1048575" placeholder="1-1048575" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">标签范围大小</label>
              <input type="number" class="form-control" v-model="config.parameters['range-size']" min="1" max="1048575" placeholder="1-1048575" style="width:100%;" />
            </div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 MPLS 接口' : '添加 MPLS 接口'" width="500px" @confirm="saveInterface">
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
      </DraggableModal>

      <!-- LDP Interface Modal -->
      <DraggableModal v-model:visible="ldpInterfaceModalVisible" :title="editingLdpInterfaceIndex >= 0 ? '编辑 LDP 接口' : '添加 LDP 接口'" width="500px" @confirm="saveLdpInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <template v-if="editingLdpInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="ldpInterfaceForm.name" style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="ldpInterfaceForm.name" style="width:100%;">
              <option value="">请选择接口</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">Hello 间隔</label>
          <input type="number" class="form-control" v-model="ldpInterfaceForm['hello-interval']" min="1" max="65535" placeholder="默认: 5 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">Hello 保持时间</label>
          <input type="number" class="form-control" v-model="ldpInterfaceForm['hello-holdtime']" min="1" max="65535" placeholder="默认: 15 秒" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
