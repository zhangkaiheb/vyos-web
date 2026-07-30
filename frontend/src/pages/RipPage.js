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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateNetwork(value) {
  if (!value) return '';
  const m = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
  if (!m) return '网络格式错误 (例如: 192.168.1.0/24)';
  if (parseInt(m[2], 10) < 0 || parseInt(m[2], 10) > 32) return '前缀长度必须在 0-32 之间';
  return '';
}

function validateMetric(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 16) return '度量值必须在 0-16 之间';
  return '';
}

function validateDistance(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return '管理距离必须在 1-255 之间';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

function validateVersion(value) {
  if (!value) return '';
  if (value !== '1' && value !== '2' && value !== '2R') return '版本必须为 1, 2 或 2R';
  return '';
}

// RIP 配置转换
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

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'receive-version', title: '接收版本' },
      { key: 'send-version', title: '发送版本' },
      { key: 'split-horizon', title: '水平分割' },
    ];

    const networkDistColumns = [
      { key: 'network', title: '网络' },
      { key: 'access-list', title: '访问列表' },
      { key: 'distance', title: '距离' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'route-map', title: '路由映射' },
    ];

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

    const SPLIT_HORIZON_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'disable', label: '禁用' },
      { value: 'poison-reverse', label: 'Poison Reverse' },
    ];

    const VERSION_OPTIONS = [
      { value: '', label: '默认' },
      { value: '1', label: 'RIPv1' },
      { value: '2', label: 'RIPv2' },
      { value: '2R', label: 'RIPv2R' },
    ];

    async function load() {
      loading.value = true;
      try {
        const data = await configApi.get(['protocols', 'rip']);
        config.value = configToForm(data);
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (config.value['default-distance']) {
        const err = validateDistance(config.value['default-distance']);
        if (err) return alert(`默认距离：${err}`);
      }
      if (config.value['default-metric']) {
        const err = validateMetric(config.value['default-metric']);
        if (err) return alert(`默认度量值：${err}`);
      }
      for (let i = 0; i < config.value.networks.length; i++) {
        const err = validateNetwork(config.value.networks[i]);
        if (err) return alert(`网络 ${i + 1}：${err}`);
      }
      for (let i = 0; i < config.value.neighbors.length; i++) {
        const err = validateIPv4(config.value.neighbors[i]);
        if (err) return alert(`邻居 ${i + 1}：${err}`);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols rip', payload);
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        networkDistModalVisible.value = false;
        redistributeModalVisible.value = false;
        await load();
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
      if (!interfaceForm.value.name) return alert('请输入接口名称');
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
      if (!networkDistForm.value.network) return alert('请输入网络');
      const err = validateNetwork(networkDistForm.value.network);
      if (err) return alert(err);
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
    function deleteNetworkDist(index) {
      if (confirm('确定删除此网络距离配置？')) config.value.networkDistances.splice(index, 1);
    }
    function deleteRedistribute(index) {
      if (confirm('确定删除此重分发配置？')) config.value.redistributes.splice(index, 1);
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
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
      addMd5Key, removeMd5Key, saveInterface, saveNetworkDist, saveRedistribute,
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
        { key: 'neighbors', title: '邻居' },
        { key: 'networks', title: '网络' },
        { key: 'network-dist', title: '网络距离' },
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
                  <label class="form-label">默认管理距离</label>
                  <input type="number" class="form-control" v-model="config['default-distance']" min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">默认度量值</label>
                  <input type="number" class="form-control" v-model="config['default-metric']" min="0" max="16" placeholder="0-16" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">路由映射</label>
                  <input type="text" class="form-control" v-model="config['route-map']" placeholder="路由映射名称" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">RIP 版本</label>
                  <select class="form-control" v-model="config.version" style="width:100%;">
                    <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
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

        <template #neighbors>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">邻居地址</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newNeighbor" placeholder="IPv4 地址" style="width:100%;" />
                <ToolbarButton size="small" @click="addNeighbor">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.neighbors" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeNeighbor(idx)">删除</ToolbarButton>
            </div>
          </div>
        </template>

        <template #networks>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">网络</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newNetwork" placeholder="例如: 192.168.1.0/24" style="width:100%;" />
                <ToolbarButton size="small" @click="addNetwork">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(n, idx) in config.networks" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ n }}</span>
              <ToolbarButton size="small" danger @click="removeNetwork(idx)">删除</ToolbarButton>
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
              <label class="form-label">静态路由</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newRoute" placeholder="例如: 10.0.0.0/8" style="width:100%;" />
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
              <label class="form-label">通告默认路由</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate" /></label>
            </div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 RIP 接口' : '添加 RIP 接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <input type="text" class="form-control" v-model="interfaceForm.name" placeholder="例如: eth0" style="width:100%;" :disabled="editingInterfaceIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">明文密码</label>
          <input type="password" class="form-control" v-model="interfaceForm['plaintext-password']" placeholder="认证密码" style="width:100%;" />
        </div>
        <h4 style="margin-top:20px;">MD5 密钥</h4>
        <div v-for="(key, idx) in interfaceForm.md5Keys" :key="idx" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
          <input type="number" class="form-control" v-model="key['key-id']" min="1" max="255" placeholder="密钥 ID" style="width:100px;" />
          <input type="password" class="form-control" v-model="key.password" placeholder="密码" style="flex:1;" />
          <ToolbarButton size="small" danger @click="removeMd5Key(idx)">删除</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addMd5Key">添加 MD5 密钥</ToolbarButton>
        <div class="form-row" style="margin-top:20px;">
          <label class="form-label">接收版本</label>
          <select class="form-control" v-model="interfaceForm['receive-version']" style="width:100%;">
            <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">发送版本</label>
          <select class="form-control" v-model="interfaceForm['send-version']" style="width:100%;">
            <option v-for="opt in VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">水平分割</label>
          <select class="form-control" v-model="interfaceForm['split-horizon']" style="width:100%;">
            <option v-for="opt in SPLIT_HORIZON_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Network Distance Modal -->
      <DraggableModal v-model:visible="networkDistModalVisible" :title="editingNetworkDistIndex >= 0 ? '编辑网络距离' : '添加网络距离'" width="600px" @confirm="saveNetworkDist">
        <div class="form-row">
          <label class="form-label">网络 *</label>
          <input type="text" class="form-control" v-model="networkDistForm.network" placeholder="例如: 192.168.1.0/24" style="width:100%;" :disabled="editingNetworkDistIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">访问列表</label>
          <input type="text" class="form-control" v-model="networkDistForm['access-list']" placeholder="访问列表名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">距离</label>
          <input type="number" class="form-control" v-model="networkDistForm.distance" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑 RIP 重分发' : '添加 RIP 重分发'" width="600px" @confirm="saveRedistribute">
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
