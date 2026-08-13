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
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('failover.validation.ipv4Format');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('failover.validation.ipv4Format');
  return '';
}

function validateNetwork(value, t) {
  if (!value) return '';
  const m = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
  if (!m) return t('failover.validation.networkFormat');
  if (parseInt(m[2], 10) < 0 || parseInt(m[2], 10) > 32) return t('failover.validation.prefixLength');
  return '';
}

function validateMetric(value, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return t('failover.validation.metricRange');
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
    const { t } = useI18n();
    const configStore = useConfigStore();
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

    const deleteModalVisible = ref(false);
    const pendingDeleteName = ref('');
    const pendingDeleteIndex = ref(-1);

    const routeColumns = [
      { key: 'prefix', title: t('failover.columns.routePrefix') },
      { key: 'nextHops', title: t('failover.columns.nextHopCount'), render: (val) => val?.length || 0 },
    ];

    const nhColumns = [
      { key: 'address', title: t('failover.columns.nextHopAddress') },
      { key: 'interface', title: t('failover.columns.interface') },
      { key: 'metric', title: t('failover.columns.metric') },
      { key: 'onlink', title: t('failover.columns.onlink'), render: (val) => val ? t('failover.labels.yes') : t('failover.labels.no') },
    ];

    const checkColumns = [
      { key: 'target', title: t('failover.columns.checkTarget') },
      { key: 'type', title: t('failover.columns.type') },
      { key: 'port', title: t('failover.columns.port') },
      { key: 'timeout', title: t('failover.columns.timeout') },
      { key: 'policy', title: t('failover.columns.policy') },
    ];

    const CHECK_TYPE_OPTIONS = [
      { value: '', label: t('failover.labels.defaultIcmp') },
      { value: 'icmp', label: 'ICMP' },
      { value: 'tcp', label: 'TCP' },
      { value: 'udp', label: 'UDP' },
    ];

    const CHECK_POLICY_OPTIONS = [
      { value: '', label: t('failover.labels.defaultAnyAvailable') },
      { value: 'any-available', label: t('failover.labels.anyAvailable') },
      { value: 'all-available', label: t('failover.labels.allAvailable') },
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
        configStore.markPending();
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
      if (!routeForm.value.prefix) return showError({ message: t('failover.messages.enterRoutePrefix') });
      const err = validateNetwork(routeForm.value.prefix, t);
      if (err) return showError({ message: err });
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
      if (!nhForm.value.address) return showError({ message: t('failover.messages.enterNextHopAddress') });
      const err = validateIPv4(nhForm.value.address, t);
      if (err) return showError({ message: err });
      if (nhForm.value.metric) {
        const err = validateMetric(nhForm.value.metric, t);
        if (err) return showError({ message: err });
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
      if (!checkForm.value.target) return showError({ message: t('failover.messages.enterCheckTarget') });
      const err = validateIPv4(checkForm.value.target, t);
      if (err) return showError({ message: err });
      if (editingCheckIndex.value >= 0) {
        nhForm.value.checks.splice(editingCheckIndex.value, 1, JSON.parse(JSON.stringify(checkForm.value)));
      } else {
        nhForm.value.checks.push(JSON.parse(JSON.stringify(checkForm.value)));
      }
      checkModalVisible.value = false;
    }

    function deleteRoute(index) {
      pendingDeleteName.value = config.value.routes[index].prefix;
      pendingDeleteIndex.value = index;
      deleteModalVisible.value = true;
    }

    function confirmDeleteRoute() {
      config.value.routes.splice(pendingDeleteIndex.value, 1);
      deleteModalVisible.value = false;
      pendingDeleteName.value = '';
      pendingDeleteIndex.value = -1;
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
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      routeModalVisible, editingRouteIndex, routeForm,
      nhModalVisible, editingNhIndex, nhForm,
      checkModalVisible, editingCheckIndex, checkForm,
      deleteModalVisible, pendingDeleteName, pendingDeleteIndex,
      routeColumns, nhColumns, checkColumns,
      CHECK_TYPE_OPTIONS, CHECK_POLICY_OPTIONS, commandPath,
      openRouteModal, openNhModal, openCheckModal,
      deleteRoute, deleteNh, deleteCheck, confirmDeleteRoute,
      saveRoute, saveNh, saveCheck,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('failover.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'routes', title: t('failover.tabs.failoverRoutes') }
      ]">

        <template #routes>
          <DataTable :columns="routeColumns" :data="config.routes" :loading="loading" :disabled="writeDisabled"
                     rowKey="prefix" :actions="['create', 'edit', 'delete']"
                     @create="openRouteModal(-1)" @edit="openRouteModal" @delete="deleteRoute" />
        </template>
      </TabGroup>

      <!-- Route Modal -->
      <DraggableModal v-model:visible="routeModalVisible" :title="editingRouteIndex >= 0 ? t('failover.modal.editRoute') : t('failover.modal.addRoute')" width="700px" @confirm="saveRoute">
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.routePrefix') }}</label>
          <input type="text" class="form-control" v-model="routeForm.prefix" :placeholder="t('failover.form.routePrefixPlaceholder')" style="width:100%;" :disabled="editingRouteIndex >= 0" />
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold;">{{ t('failover.form.nextHopList') }}</span>
            <ToolbarButton size="small" @click="openNhModal(-1)">{{ t('failover.form.addNextHop') }}</ToolbarButton>
          </div>
          <DataTable :columns="nhColumns" :data="routeForm.nextHops" rowKey="address"
                     :actions="['edit', 'delete']"
                     @edit="openNhModal" @delete="deleteNh" />
        </div>
      </DraggableModal>

      <!-- Next-Hop Modal -->
      <DraggableModal v-model:visible="nhModalVisible" :title="editingNhIndex >= 0 ? t('failover.modal.editNextHop') : t('failover.modal.addNextHop')" width="600px" @confirm="saveNh">
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.nextHopAddress') }}</label>
          <input type="text" class="form-control" v-model="nhForm.address" :placeholder="t('failover.form.ipv4Address')" style="width:100%;" :disabled="editingNhIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.interface') }}</label>
          <select class="form-control" v-model="nhForm.interface" style="width:100%;">
            <option value="">{{ t('failover.form.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.metric') }}</label>
          <input type="number" class="form-control" v-model="nhForm.metric" min="1" max="255" :placeholder="t('failover.form.metricPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.onlink') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="nhForm.onlink" /></label>
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold;">{{ t('failover.form.checkTargets') }}</span>
            <ToolbarButton size="small" @click="openCheckModal(-1)">{{ t('failover.form.addCheck') }}</ToolbarButton>
          </div>
          <DataTable :columns="checkColumns" :data="nhForm.checks" rowKey="target"
                     :actions="['edit', 'delete']"
                     @edit="openCheckModal" @delete="deleteCheck" />
        </div>
      </DraggableModal>

      <!-- Check Modal -->
      <DraggableModal v-model:visible="checkModalVisible" :title="editingCheckIndex >= 0 ? t('failover.modal.editCheck') : t('failover.modal.addCheck')" width="500px" @confirm="saveCheck">
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.checkTarget') }}</label>
          <input type="text" class="form-control" v-model="checkForm.target" :placeholder="t('failover.form.ipv4Address')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.checkType') }}</label>
          <select class="form-control" v-model="checkForm.type" style="width:100%;">
            <option v-for="opt in CHECK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.port') }}</label>
          <input type="number" class="form-control" v-model="checkForm.port" min="1" max="65535" :placeholder="t('failover.form.portPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.timeout') }}</label>
          <input type="number" class="form-control" v-model="checkForm.timeout" min="1" max="65535" :placeholder="t('failover.form.timeoutPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('failover.form.policy') }}</label>
          <select class="form-control" v-model="checkForm.policy" style="width:100%;">
            <option v-for="opt in CHECK_POLICY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('failover.modal.confirmDelete')" width="400px" @confirm="confirmDeleteRoute">
        <div>{{ t('failover.messages.confirmDeleteRoute') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
