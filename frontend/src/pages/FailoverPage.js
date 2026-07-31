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
  if (isNaN(n) || n < 1 || n > 255) return '度量值必须在 1-255 之间';
  return '';
}

function configToForm(data = {}) {
  const routes = [];
  const routeData = data.route || {};
  for (const [prefix, attrs] of Object.entries(routeData)) {
    const nextHops = [];
    const nhData = attrs['next-hop'] || {};
    for (const [nhAddr, nhAttrs] of Object.entries(nhData)) {
      const checks = [];
      const checkData = nhAttrs.check || {};
      const targets = toArray(checkData.target);
      for (const target of targets) {
        checks.push({
          target,
          type: checkData.type || '',
          port: checkData.port || '',
          timeout: checkData.timeout || '',
          policy: checkData.policy || '',
        });
      }
      nextHops.push({
        address: nhAddr,
        interface: nhAttrs.interface || '',
        metric: nhAttrs.metric || '',
        onlink: !!nhAttrs.onlink,
        checks,
      });
    }
    routes.push({
      prefix,
      nextHops,
    });
  }
  return { routes };
}

function configToConfig(form) {
  const result = {};
  if (form.routes?.length) {
    result.route = {};
    for (const route of form.routes) {
      if (!route.prefix) continue;
      const routeAttrs = {};
      if (route.nextHops?.length) {
        routeAttrs['next-hop'] = {};
        for (const nh of route.nextHops) {
          if (!nh.address) continue;
          const nhAttrs = {};
          if (isPresent(nh.interface)) nhAttrs.interface = nh.interface;
          if (isPresent(nh.metric)) nhAttrs.metric = String(nh.metric);
          if (nh.onlink) nhAttrs.onlink = {};
          if (nh.checks?.length) {
            nhAttrs.check = {};
            const targets = nh.checks.filter(c => c.target).map(c => c.target);
            if (targets.length) nhAttrs.check.target = targets;
            const firstCheck = nh.checks[0];
            if (isPresent(firstCheck.type)) nhAttrs.check.type = firstCheck.type;
            if (isPresent(firstCheck.port)) nhAttrs.check.port = String(firstCheck.port);
            if (isPresent(firstCheck.timeout)) nhAttrs.check.timeout = String(firstCheck.timeout);
            if (isPresent(firstCheck.policy)) nhAttrs.check.policy = firstCheck.policy;
          }
          routeAttrs['next-hop'][nh.address] = nhAttrs;
        }
      }
      result.route[route.prefix] = routeAttrs;
    }
  }
  return result;
}

export default defineComponent({
  name: 'FailoverPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('routes');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const routeModalVisible = ref(false);
    const editingRouteIndex = ref(-1);
    const routeForm = ref({ prefix: '', nextHops: [] });

    const nhModalVisible = ref(false);
    const editingNhIndex = ref(-1);
    const nhForm = ref({ address: '', interface: '', metric: '', onlink: false, checks: [] });

    const checkModalVisible = ref(false);
    const editingCheckIndex = ref(-1);
    const checkForm = ref({ target: '', type: '', port: '', timeout: '', policy: '' });

    const routeColumns = [
      { key: 'prefix', title: '路由前缀' },
      { key: 'nextHops', title: '下一跳数量', render: (val) => val?.length || 0 },
    ];

    const nhColumns = [
      { key: 'address', title: '下一跳地址' },
      { key: 'interface', title: '接口' },
      { key: 'metric', title: '度量值' },
      { key: 'onlink', title: '直连', render: (val) => val ? '是' : '否' },
    ];

    const checkColumns = [
      { key: 'target', title: '检查目标' },
      { key: 'type', title: '类型' },
      { key: 'port', title: '端口' },
      { key: 'timeout', title: '超时' },
      { key: 'policy', title: '策略' },
    ];

    const CHECK_TYPE_OPTIONS = [
      { value: '', label: '默认 (icmp)' },
      { value: 'icmp', label: 'ICMP' },
      { value: 'tcp', label: 'TCP' },
      { value: 'udp', label: 'UDP' },
    ];

    const CHECK_POLICY_OPTIONS = [
      { value: '', label: '默认 (any-available)' },
      { value: 'any-available', label: '任一可用' },
      { value: 'all-available', label: '全部可用' },
    ];

    const commandPath = computed(() => 'protocols failover route');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'failover']);
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
        await configApi.set('protocols failover', payload);
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        routeModalVisible.value = false;
        nhModalVisible.value = false;
        checkModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openRouteModal(index = -1) {
      editingRouteIndex.value = index;
      if (index >= 0) {
        routeForm.value = JSON.parse(JSON.stringify(config.value.routes[index]));
      } else {
        routeForm.value = { prefix: '', nextHops: [] };
      }
      routeModalVisible.value = true;
    }

    function saveRoute() {
      if (!routeForm.value.prefix) return alert('请输入路由前缀');
      const err = validateNetwork(routeForm.value.prefix);
      if (err) return alert(err);
      if (editingRouteIndex.value >= 0) {
        config.value.routes.splice(editingRouteIndex.value, 1, JSON.parse(JSON.stringify(routeForm.value)));
      } else {
        config.value.routes.push(JSON.parse(JSON.stringify(routeForm.value)));
      }
      routeModalVisible.value = false;
    }

    function openNhModal(index = -1) {
      editingNhIndex.value = index;
      if (index >= 0) {
        nhForm.value = JSON.parse(JSON.stringify(routeForm.value.nextHops[index]));
      } else {
        nhForm.value = { address: '', interface: '', metric: '', onlink: false, checks: [] };
      }
      nhModalVisible.value = true;
    }

    function saveNh() {
      if (!nhForm.value.address) return alert('请输入下一跳地址');
      const err = validateIPv4(nhForm.value.address);
      if (err) return alert(err);
      if (nhForm.value.metric) {
        const err = validateMetric(nhForm.value.metric);
        if (err) return alert(err);
      }
      if (editingNhIndex.value >= 0) {
        routeForm.value.nextHops.splice(editingNhIndex.value, 1, JSON.parse(JSON.stringify(nhForm.value)));
      } else {
        routeForm.value.nextHops.push(JSON.parse(JSON.stringify(nhForm.value)));
      }
      nhModalVisible.value = false;
    }

    function openCheckModal(index = -1) {
      editingCheckIndex.value = index;
      if (index >= 0) {
        checkForm.value = JSON.parse(JSON.stringify(nhForm.value.checks[index]));
      } else {
        checkForm.value = { target: '', type: '', port: '', timeout: '', policy: '' };
      }
      checkModalVisible.value = true;
    }

    function saveCheck() {
      if (!checkForm.value.target) return alert('请输入检查目标');
      const err = validateIPv4(checkForm.value.target);
      if (err) return alert(err);
      if (editingCheckIndex.value >= 0) {
        nhForm.value.checks.splice(editingCheckIndex.value, 1, JSON.parse(JSON.stringify(checkForm.value)));
      } else {
        nhForm.value.checks.push(JSON.parse(JSON.stringify(checkForm.value)));
      }
      checkModalVisible.value = false;
    }

    function deleteRoute(index) {
      if (confirm('确定删除此路由？')) config.value.routes.splice(index, 1);
    }
    function deleteNh(index) {
      routeForm.value.nextHops.splice(index, 1);
    }
    function deleteCheck(index) {
      nhForm.value.checks.splice(index, 1);
    }

    onMounted(() => {
      load();
      loadInterfaces();
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      routeModalVisible, editingRouteIndex, routeForm,
      nhModalVisible, editingNhIndex, nhForm,
      checkModalVisible, editingCheckIndex, checkForm,
      routeColumns, nhColumns, checkColumns,
      CHECK_TYPE_OPTIONS, CHECK_POLICY_OPTIONS, commandPath,
      openRouteModal, openNhModal, openCheckModal,
      deleteRoute, deleteNh, deleteCheck,
      saveRoute, saveNh, saveCheck,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'routes', title: '故障转移路由' }
      ]">

        <template #routes>
          <DataTable :columns="routeColumns" :data="config.routes" :loading="loading" :disabled="writeDisabled"
                     rowKey="prefix" :actions="['create', 'edit', 'delete']"
                     @create="openRouteModal(-1)" @edit="openRouteModal" @delete="deleteRoute" />
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Route Modal -->
      <DraggableModal v-model:visible="routeModalVisible" :title="editingRouteIndex >= 0 ? '编辑故障转移路由' : '添加故障转移路由'" width="700px" @confirm="saveRoute">
        <div class="form-row">
          <label class="form-label">路由前缀 *</label>
          <input type="text" class="form-control" v-model="routeForm.prefix" placeholder="例如: 1.1.1.1/32" style="width:100%;" :disabled="editingRouteIndex >= 0" />
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold;">下一跳列表</span>
            <ToolbarButton size="small" @click="openNhModal(-1)">添加下一跳</ToolbarButton>
          </div>
          <DataTable :columns="nhColumns" :data="routeForm.nextHops" rowKey="address"
                     :actions="['edit', 'delete']"
                     @edit="openNhModal" @delete="deleteNh" />
        </div>
      </DraggableModal>

      <!-- Next-Hop Modal -->
      <DraggableModal v-model:visible="nhModalVisible" :title="editingNhIndex >= 0 ? '编辑下一跳' : '添加下一跳'" width="600px" @confirm="saveNh">
        <div class="form-row">
          <label class="form-label">下一跳地址 *</label>
          <input type="text" class="form-control" v-model="nhForm.address" placeholder="IPv4 地址" style="width:100%;" :disabled="editingNhIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="nhForm.interface" style="width:100%;">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="nhForm.metric" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">直连</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="nhForm.onlink" /></label>
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold;">检查目标</span>
            <ToolbarButton size="small" @click="openCheckModal(-1)">添加检查</ToolbarButton>
          </div>
          <DataTable :columns="checkColumns" :data="nhForm.checks" rowKey="target"
                     :actions="['edit', 'delete']"
                     @edit="openCheckModal" @delete="deleteCheck" />
        </div>
      </DraggableModal>

      <!-- Check Modal -->
      <DraggableModal v-model:visible="checkModalVisible" :title="editingCheckIndex >= 0 ? '编辑检查目标' : '添加检查目标'" width="500px" @confirm="saveCheck">
        <div class="form-row">
          <label class="form-label">检查目标 *</label>
          <input type="text" class="form-control" v-model="checkForm.target" placeholder="IPv4 地址" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">检查类型</label>
          <select class="form-control" v-model="checkForm.type" style="width:100%;">
            <option v-for="opt in CHECK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">端口</label>
          <input type="number" class="form-control" v-model="checkForm.port" min="1" max="65535" placeholder="端口号" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">超时</label>
          <input type="number" class="form-control" v-model="checkForm.timeout" min="1" max="65535" placeholder="默认: 10 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">策略</label>
          <select class="form-control" v-model="checkForm.policy" style="width:100%;">
            <option v-for="opt in CHECK_POLICY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>
    </div>
  `,
});
