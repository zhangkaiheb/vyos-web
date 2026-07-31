import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function validateNET(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}\.[0-9a-fA-F]{2}$/.test(value)) {
    return 'NET 格式错误 (例如: 49.0001.0000.0000.0000.0000.0000.0000.0001.00)';
  }
  return '';
}

function validateMetric(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 16777215) return '度量值必须在 0-16777215 之间';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

function validateLspMtu(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 128 || n > 4352) return 'LSP MTU 必须在 128-4352 之间';
  return '';
}

// IS-IS 配置转换
function configToForm(data = {}) {
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      metric: attrs.metric || '',
      passive: !!attrs.passive,
      'network-type': attrs['network-type'] || '',
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

  const defInfo = data['default-information'] || {};
  const defOrig = defInfo.originate || {};

  return {
    net: data.net || '',
    level: data.level || '',
    'metric-style': data['metric-style'] || '',
    'dynamic-hostname': !!data['dynamic-hostname'],
    'log-adjacency-changes': !!data['log-adjacency-changes'],
    'purge-originator': !!data['purge-originator'],
    'set-attached-bit': !!data['set-attached-bit'],
    'set-overload-bit': !!data['set-overload-bit'],
    'lsp-gen-interval': data['lsp-gen-interval'] || '',
    'lsp-mtu': data['lsp-mtu'] || '',
    'lsp-refresh-interval': data['lsp-refresh-interval'] || '',
    'max-lsp-lifetime': data['max-lsp-lifetime'] || '',
    interfaces,
    redistributes,
    'default-information': {
      originate: {
        always: !!defOrig.always,
        metric: defOrig.metric || '',
        'route-map': defOrig['route-map'] || '',
      },
    },
    'area-password': data['area-password'] || '',
    'domain-password': data['domain-password'] || '',
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form.net)) result.net = String(form.net);
  if (isPresent(form.level)) result.level = String(form.level);
  if (isPresent(form['metric-style'])) result['metric-style'] = String(form['metric-style']);
  if (form['dynamic-hostname']) result['dynamic-hostname'] = {};
  if (form['log-adjacency-changes']) result['log-adjacency-changes'] = {};
  if (form['purge-originator']) result['purge-originator'] = {};
  if (form['set-attached-bit']) result['set-attached-bit'] = {};
  if (form['set-overload-bit']) result['set-overload-bit'] = {};
  if (isPresent(form['lsp-gen-interval'])) result['lsp-gen-interval'] = String(form['lsp-gen-interval']);
  if (isPresent(form['lsp-mtu'])) result['lsp-mtu'] = String(form['lsp-mtu']);
  if (isPresent(form['lsp-refresh-interval'])) result['lsp-refresh-interval'] = String(form['lsp-refresh-interval']);
  if (isPresent(form['max-lsp-lifetime'])) result['max-lsp-lifetime'] = String(form['max-lsp-lifetime']);

  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface.metric)) attrs.metric = String(iface.metric);
      if (iface.passive) attrs.passive = {};
      if (isPresent(iface['network-type'])) attrs['network-type'] = iface['network-type'];
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

  if (form['default-information']?.originate) {
    const orig = form['default-information'].originate;
    if (orig.always || orig.metric || orig['route-map']) {
      result['default-information'] = { originate: {} };
      if (orig.always) result['default-information'].originate.always = {};
      if (isPresent(orig.metric)) result['default-information'].originate.metric = String(orig.metric);
      if (isPresent(orig['route-map'])) result['default-information'].originate['route-map'] = orig['route-map'];
    }
  }

  if (isPresent(form['area-password'])) result['area-password'] = String(form['area-password']);
  if (isPresent(form['domain-password'])) result['domain-password'] = String(form['domain-password']);

  return result;
}

export default defineComponent({
  name: 'IsisPage',
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
    const interfaceForm = ref({ name: '', metric: '', passive: false, 'network-type': '' });

    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'route-map': '' });

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'metric', title: '度量值' },
      { key: 'network-type', title: '网络类型' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols isis interface';
      if (activeTab.value === 'redistribute') return 'protocols isis redistribute';
      if (activeTab.value === 'default-info') return 'protocols isis default-information originate';
      if (activeTab.value === 'passwords') return 'protocols isis area-password';
      return 'protocols isis';
    });

    const LEVEL_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'level-1', label: 'Level 1' },
      { value: 'level-2', label: 'Level 2' },
      { value: 'level-1-2', label: 'Level 1-2' },
    ];

    const METRIC_STYLE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'old', label: 'Old (ISO 10589)' },
      { value: 'new', label: 'New' },
      { value: 'transition', label: 'Transition' },
    ];

    const NETWORK_TYPE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'point-to-point', label: 'Point-to-Point' },
      { value: 'broadcast', label: 'Broadcast' },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'rip', label: 'RIP' },
      { value: 'static', label: 'Static' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'isis']);
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
      if (config.value.net) {
        const err = validateNET(config.value.net);
        if (err) return alert(`NET：${err}`);
      }
      if (config.value['lsp-mtu']) {
        const err = validateLspMtu(config.value['lsp-mtu']);
        if (err) return alert(`LSP MTU：${err}`);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols isis', payload);
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
        interfaceForm.value = { name: '', metric: '', passive: false, 'network-type': '' };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return alert('请输入接口名称');
      if (interfaceForm.value.metric) {
        const err = validateMetric(interfaceForm.value.metric);
        if (err) return alert(err);
      }
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
      LEVEL_OPTIONS, METRIC_STYLE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, commandPath,
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
        { key: 'redistribute', title: '重分发' },
        { key: 'default-info', title: '默认信息' },
        { key: 'passwords', title: '密码' },
        { key: 'advanced', title: '高级选项' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">NET (Network Entity Title)</label>
                  <input type="text" class="form-control" v-model="config.net"
                         placeholder="例如: 49.0001.0000.0000.0000.0000.0000.0000.0001.00" style="width:100%;"
                         title="IS-IS NET (ISO 格式)" />
                </div>
                <div class="form-row">
                  <label class="form-label">级别</label>
                  <select class="form-control" v-model="config.level" style="width:100%;">
                    <option v-for="opt in LEVEL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">度量值样式</label>
                  <select class="form-control" v-model="config['metric-style']" style="width:100%;">
                    <option v-for="opt in METRIC_STYLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">动态主机名</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['dynamic-hostname']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">记录邻接关系变化</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">清除发起者</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['purge-originator']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">设置附加位</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['set-attached-bit']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">设置过载位</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['set-overload-bit']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">LSP 生成间隔</label>
                  <input type="number" class="form-control" v-model="config['lsp-gen-interval']"
                         min="1" max="65535" placeholder="1-65535 毫秒" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">LSP MTU</label>
                  <input type="number" class="form-control" v-model="config['lsp-mtu']"
                         min="128" max="4352" placeholder="128-4352" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">LSP 刷新间隔</label>
                  <input type="number" class="form-control" v-model="config['lsp-refresh-interval']"
                         min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">最大 LSP 生命周期</label>
                  <input type="number" class="form-control" v-model="config['max-lsp-lifetime']"
                         min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
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

        <template #default-info>
          <div style="padding:16px;">
            <h4>默认信息通告</h4>
            <div class="form-row">
              <label class="form-label">始终通告默认路由</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
            </div>
            <div class="form-row">
              <label class="form-label">度量值</label>
              <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                     min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">路由映射</label>
              <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                     placeholder="路由映射名称" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #passwords>
          <div style="padding:16px;">
            <h4>密码配置</h4>
            <div class="form-row">
              <label class="form-label">区域密码</label>
              <input type="password" class="form-control" v-model="config['area-password']"
                     placeholder="区域认证密码" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">域密码</label>
              <input type="password" class="form-control" v-model="config['domain-password']"
                     placeholder="域认证密码" style="width:100%;" />
            </div>
          </div>
        </template>

        <template #advanced>
          <div style="padding:16px;">
            <h4>高级选项</h4>
            <p style="color:#666;">快速重路由、LDP 同步、段路由、SPF 延迟、拓扑和流量工程等高级配置请通过命令行配置。</p>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 IS-IS 接口' : '添加 IS-IS 接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">请选择接口</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="interfaceForm.metric"
                 min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">网络类型</label>
          <select class="form-control" v-model="interfaceForm['network-type']" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.passive" />
            被动模式
          </label>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑 IS-IS 重分发' : '添加 IS-IS 重分发'" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric"
                 min="0" max="16777215" placeholder="0-16777215" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']"
                 placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
