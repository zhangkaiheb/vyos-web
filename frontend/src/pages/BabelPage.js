import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
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

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'cost', title: '成本' },
      { key: 'hello-interval', title: 'Hello 间隔' },
      { key: 'type', title: '类型' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'route-map', title: '路由映射' },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'static', label: 'Static' },
    ];

    const INTERFACE_TYPE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'wired', label: '有线' },
      { value: 'wireless', label: '无线' },
    ];

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
        await configApi.set('protocols babel', payload);
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
      if (!interfaceForm.value.name) return alert('请选择接口');
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
      if (!redistributeForm.value.protocol) return alert('请选择协议');
      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, JSON.parse(JSON.stringify(redistributeForm.value)));
      } else {
        config.value.redistributes.push(JSON.parse(JSON.stringify(redistributeForm.value)));
      }
      redistributeModalVisible.value = false;
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) config.value.interfaces.splice(index, 1);
    }

    function deleteRedistribute(index) {
      if (confirm('确定删除此重分发配置？')) config.value.redistributes.splice(index, 1);
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      interfaceColumns, redistributeColumns,
      REDISTRIBUTE_PROTOCOL_OPTIONS, INTERFACE_TYPE_OPTIONS, commandPath,
      openInterfaceModal, openRedistributeModal,
      deleteInterface, deleteRedistribute,
      saveInterface, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'interfaces', title: '接口' },
        { key: 'redistribute', title: '重分发' },
        { key: 'parameters', title: '参数' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">分发列表</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">IPv4 访问列表</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv4['access-list']" placeholder="访问列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">IPv4 前缀列表</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv4['prefix-list']" placeholder="前缀列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">IPv6 访问列表</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv6['access-list']" placeholder="访问列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">IPv6 前缀列表</label>
                  <input type="text" class="form-control" v-model="config['distribute-list'].ipv6['prefix-list']" placeholder="前缀列表名称" style="width:100%;" />
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
              <label class="form-label">更新间隔</label>
              <input type="number" class="form-control" v-model="config.parameters['update-interval']" min="1" max="65535" placeholder="默认: 120 秒" style="width:100%;" />
            </div>
          </div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 Babel 接口' : '添加 Babel 接口'" width="600px" @confirm="saveInterface">
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
          <label class="form-label">成本</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost" min="1" max="65535" placeholder="1-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">Hello 间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']" min="1" max="65535" placeholder="默认: 4 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">接口类型</label>
          <select class="form-control" v-model="interfaceForm.type" style="width:100%;">
            <option v-for="opt in INTERFACE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑重分发' : '添加重分发'" width="500px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;">
            <option value="">请选择协议</option>
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="65535" placeholder="0-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
