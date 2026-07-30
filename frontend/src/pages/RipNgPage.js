import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
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

function validateIPv6Prefix(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+\/\d{1,3}$/.test(value)) return 'IPv6 前缀格式错误 (例如: 2001:db8::/32)';
  return '';
}

function validateMetric(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 16) return '度量值必须在 0-16 之间';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

// RIPng 配置转换
function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      'split-horizon': attrs['split-horizon'] || '',
    });
  }

  const networks = toArray(data.network).map(n => typeof n === 'string' ? n : '');
  const aggregateAddresses = toArray(data['aggregate-address']).map(n => typeof n === 'string' ? n : '');
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
  const distList = data['distribute-list'] || {};

  return {
    'default-metric': data['default-metric'] || '',
    'route-map': data['route-map'] || '',
    interfaces,
    networks,
    aggregateAddresses,
    routes,
    'passive-interface': passiveInterfaces,
    redistributes,
    'default-information': {
      originate: !!defInfo.originate,
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

  if (isPresent(form['default-metric'])) result['default-metric'] = String(form['default-metric']);
  if (isPresent(form['route-map'])) result['route-map'] = String(form['route-map']);

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface['split-horizon'])) attrs['split-horizon'] = iface['split-horizon'];
      result.interface[iface.name] = attrs;
    }
  }

  if (form.networks?.length) result.network = form.networks.filter(n => n);
  if (form.aggregateAddresses?.length) result['aggregate-address'] = form.aggregateAddresses.filter(n => n);
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
  name: 'RipNgPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const newNetwork = ref('');
    const newAggregate = ref('');
    const newRoute = ref('');
    const newPassiveInterface = ref('');

    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({ name: '', 'split-horizon': '' });

    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'split-horizon', title: '水平分割' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'route-map', title: '路由映射' },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols ripng interface';
      if (activeTab.value === 'redistribute') return 'protocols ripng redistribute';
      if (activeTab.value === 'timers') return 'protocols ripng timers';
      return 'protocols ripng';
    });

    const SPLIT_HORIZON_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'disable', label: '禁用' },
      { value: 'poison-reverse', label: 'Poison Reverse' },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospfv3', label: 'OSPFv3' },
      { value: 'static', label: 'Static' },
    ];

    async function load() {
      loading.value = true;
      try {
        const data = await configApi.get(['protocols', 'ripng']);
        config.value = configToForm(data);
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (config.value['default-metric']) {
        const err = validateMetric(config.value['default-metric']);
        if (err) return alert(`默认度量值：${err}`);
      }
      for (let i = 0; i < config.value.networks.length; i++) {
        const err = validateIPv6Prefix(config.value.networks[i]);
        if (err) return alert(`网络 ${i + 1}：${err}`);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols ripng', payload);
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

    function addNetwork() {
      if (newNetwork.value && !config.value.networks.includes(newNetwork.value)) {
        config.value.networks.push(newNetwork.value);
        newNetwork.value = '';
      }
    }
    function removeNetwork(idx) { config.value.networks.splice(idx, 1); }

    function addAggregate() {
      if (newAggregate.value && !config.value.aggregateAddresses.includes(newAggregate.value)) {
        config.value.aggregateAddresses.push(newAggregate.value);
        newAggregate.value = '';
      }
    }
    function removeAggregate(idx) { config.value.aggregateAddresses.splice(idx, 1); }

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
        interfaceForm.value = { name: '', 'split-horizon': '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return alert('请输入接口名称');
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
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return alert(err);
      }
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

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      newNetwork, newAggregate, newRoute, newPassiveInterface,
      addNetwork, removeNetwork, addAggregate, removeAggregate, addRoute, removeRoute,
      addPassiveInterface, removePassiveInterface,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      interfaceColumns, redistributeColumns,
      SPLIT_HORIZON_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, commandPath,
      openInterfaceModal, openRedistributeModal,
      deleteInterface, deleteRedistribute,
      saveInterface, saveRedistribute,
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
        { key: 'networks', title: '网络' },
        { key: 'aggregate', title: '聚合地址' },
        { key: 'routes', title: '静态路由' },
        { key: 'redistribute', title: '重分发' },
        { key: 'passive', title: '被动接口' },
        { key: 'timers', title: '定时器' },
        { key: 'default-info', title: '默认信息' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">默认度量值</label>
                  <input type="number" class="form-control" v-model="config['default-metric']" min="0" max="16" placeholder="0-16" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">路由映射</label>
                  <input type="text" class="form-control" v-model="config['route-map']" placeholder="路由映射名称" style="width:100%;" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">分发列表</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">访问列表 (入)</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['access-list'].in" placeholder="访问列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">访问列表 (出)</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['access-list'].out" placeholder="访问列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">前缀列表 (入)</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['prefix-list'].in" placeholder="前缀列表名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">前缀列表 (出)</label>
                  <input type="text" class="form-control" v-model="config['distribute-list']['prefix-list'].out" placeholder="前缀列表名称" style="width:100%;" />
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

        <template #networks>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">网络</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newNetwork" placeholder="例如: 2001:db8::/32" style="width:100%;" />
                <ToolbarButton size="small" @click="addNetwork">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.networks" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeNetwork(idx)">删除</ToolbarButton>
            </div>
          </div>
        </template>

        <template #aggregate>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">聚合地址</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newAggregate" placeholder="例如: 2001:db8::/48" style="width:100%;" />
                <ToolbarButton size="small" @click="addAggregate">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.aggregateAddresses" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeAggregate(idx)">删除</ToolbarButton>
            </div>
          </div>
        </template>

        <template #routes>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">静态路由</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newRoute" placeholder="例如: 2001:db8:1::/48" style="width:100%;" />
                <ToolbarButton size="small" @click="addRoute">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(r, idx) in config.routes" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ r }}</span>
              <ToolbarButton size="small" danger @click="removeRoute(idx)">删除</ToolbarButton>
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
              <label class="form-label">被动接口</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newPassiveInterface" placeholder="接口名称" style="width:100%;" />
                <ToolbarButton size="small" @click="addPassiveInterface">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(iface, idx) in config['passive-interface']" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ iface }}</span>
              <ToolbarButton size="small" danger @click="removePassiveInterface(idx)">删除</ToolbarButton>
            </div>
          </div>
        </template>

        <template #timers>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">垃圾回收定时器</label>
              <input type="number" class="form-control" v-model="config.timers['garbage-collection']" min="1" max="65535" placeholder="默认: 120 秒" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">超时定时器</label>
              <input type="number" class="form-control" v-model="config.timers.timeout" min="1" max="65535" placeholder="默认: 180 秒" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">更新定时器</label>
              <input type="number" class="form-control" v-model="config.timers.update" min="1" max="65535" placeholder="默认: 30 秒" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #default-info>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">
                <input type="checkbox" v-model="config['default-information'].originate" />
                通告默认路由
              </label>
            </div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 RIPng 接口' : '添加 RIPng 接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <input type="text" class="form-control" v-model="interfaceForm.name" placeholder="例如: eth0" style="width:100%;" :disabled="editingInterfaceIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">水平分割</label>
          <select class="form-control" v-model="interfaceForm['split-horizon']" style="width:100%;">
            <option v-for="opt in SPLIT_HORIZON_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑 RIPng 重分发' : '添加 RIPng 重分发'" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="16" placeholder="0-16" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
