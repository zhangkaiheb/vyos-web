import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

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

export default defineComponent({
  name: 'VppIpfixPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const config = ref({
      active_timeout: '15',
      inactive_timeout: '120',
      flowprobe_record: ['l3'],
      collectors: [],
      interfaces: [],
    });

    const collectorColumns = [
      { key: 'address', title: '地址', dataIndex: 'address', width: 150 },
      { key: 'port', title: '端口', dataIndex: 'port', width: 80 },
      { key: 'path_mtu', title: 'Path MTU', dataIndex: 'path_mtu', width: 100 },
      { key: 'source_address', title: '源地址', dataIndex: 'source_address', width: 150 },
      { key: 'template_interval', title: '模板间隔', dataIndex: 'template_interval', width: 100 },
      { key: 'udp_checksum', title: 'UDP校验', dataIndex: 'udp_checksum', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const interfaceColumns = [
      { key: 'interface', title: '接口', dataIndex: 'interface', width: 150 },
      { key: 'direction', title: '方向', dataIndex: 'direction', width: 100 },
      { key: 'flow_variant', title: '流类型', dataIndex: 'flow_variant', width: 100 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedCollectors = ref([]);
    const selectedInterfaces = ref([]);

    const showCollectorModal = ref(false);
    const editingCollector = ref(null);
    const showInterfaceModal = ref(false);
    const editingInterface = ref(null);

    const commandPath = computed(() => 'vpp ipfix');

    function ipfixToForm(data = {}) {
      const collectors = data.collector || {};
      const interfaces = data.interface || {};
      const flowprobe = data.flowprobe || {};

      return {
        active_timeout: data['active-timeout'] || '15',
        inactive_timeout: data['inactive-timeout'] || '120',
        flowprobe_record: flowprobe.record ? toArray(flowprobe.record) : ['l3'],
        collectors: Object.entries(collectors).map(([address, c]) => ({
          _address: address,
          address,
          port: c.port || '4739',
          path_mtu: c['path-mtu'] || '512',
          source_address: c['source-address'] || '',
          template_interval: c['template-interval'] || '20',
          udp_checksum: c['udp-checksum'] !== undefined,
        })),
        interfaces: Object.entries(interfaces).map(([iface, attrs]) => ({
          _interface: iface,
          interface: iface,
          direction: attrs.direction || 'both',
          flow_variant: attrs['flow-variant'] || 'ipv4',
        })),
      };
    }

    function formToIpfix(form) {
      const result = {};
      if (isPresent(form.active_timeout)) result['active-timeout'] = String(form.active_timeout);
      if (isPresent(form.inactive_timeout)) result['inactive-timeout'] = String(form.inactive_timeout);

      if (form.flowprobe_record && form.flowprobe_record.length) {
        result.flowprobe = { record: form.flowprobe_record };
      }

      const collectors = {};
      for (const c of form.collectors || []) {
        if (!c.address) continue;
        const obj = {};
        if (isPresent(c.port)) obj.port = String(c.port);
        if (isPresent(c.path_mtu)) obj['path-mtu'] = String(c.path_mtu);
        if (isPresent(c.source_address)) obj['source-address'] = String(c.source_address);
        if (isPresent(c.template_interval)) obj['template-interval'] = String(c.template_interval);
        if (c.udp_checksum) obj['udp-checksum'] = '';
        collectors[c.address] = obj;
      }
      if (Object.keys(collectors).length) result.collector = collectors;

      const interfaces = {};
      for (const i of form.interfaces || []) {
        if (!i.interface) continue;
        const obj = {};
        if (isPresent(i.direction)) obj.direction = String(i.direction);
        if (isPresent(i.flow_variant)) obj['flow-variant'] = String(i.flow_variant);
        interfaces[i.interface] = obj;
      }
      if (Object.keys(interfaces).length) result.interface = interfaces;

      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('vpp ipfix', true);
        config.value = ipfixToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp ipfix');
        const payload = formToIpfix(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp ipfix', payload);
        }
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createCollector() {
      editingCollector.value = { address: '', port: '4739', path_mtu: '512', source_address: '', template_interval: '20', udp_checksum: false };
      showCollectorModal.value = true;
    }

    function editCollector() {
      if (!selectedCollectors.value.length) return alert('请选择要编辑的收集器');
      const row = config.value.collectors.find(c => c.address === selectedCollectors.value[0]);
      if (!row) return alert('未找到选中的收集器');
      editingCollector.value = JSON.parse(JSON.stringify(row));
      showCollectorModal.value = true;
    }

    function removeCollector() {
      if (!selectedCollectors.value.length) return alert('请选择要删除的收集器');
      config.value.collectors = config.value.collectors.filter(c => c.address !== selectedCollectors.value[0]);
      selectedCollectors.value = [];
    }

    function saveCollector() {
      if (!editingCollector.value.address) return alert('请输入收集器地址');
      const list = config.value.collectors;
      const idx = list.findIndex(c => c._address === editingCollector.value._address);
      if (idx >= 0) list.splice(idx, 1, { ...editingCollector.value });
      else list.push({ ...editingCollector.value });
      config.value.collectors = list;
      showCollectorModal.value = false;
    }

    function createInterface() {
      editingInterface.value = { interface: '', direction: 'both', flow_variant: 'ipv4' };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterfaces.value.length) return alert('请选择要编辑的接口');
      const row = config.value.interfaces.find(i => i.interface === selectedInterfaces.value[0]);
      if (!row) return alert('未找到选中的接口');
      editingInterface.value = JSON.parse(JSON.stringify(row));
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterfaces.value.length) return alert('请选择要删除的接口');
      config.value.interfaces = config.value.interfaces.filter(i => i.interface !== selectedInterfaces.value[0]);
      selectedInterfaces.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.interface) return alert('请输入接口名称');
      const list = config.value.interfaces;
      const idx = list.findIndex(i => i._interface === editingInterface.value._interface);
      if (idx >= 0) list.splice(idx, 1, { ...editingInterface.value });
      else list.push({ ...editingInterface.value });
      config.value.interfaces = list;
      showInterfaceModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, commandPath,
      collectorColumns, interfaceColumns,
      selectedCollectors, selectedInterfaces,
      showCollectorModal, editingCollector, showInterfaceModal, editingInterface,
      load, save,
      createCollector, editCollector, removeCollector, saveCollector,
      createInterface, editInterface, removeInterface, saveInterface,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="form-row"><label class="form-label">活跃超时</label><input class="form-control" type="number" min="0" max="2147483647" v-model="config.active_timeout" title="活跃流超时时间（秒），默认15" /></div>
      <div class="form-row"><label class="form-label">非活跃超时</label><input class="form-control" type="number" min="0" max="2147483647" v-model="config.inactive_timeout" title="非活跃流超时时间（秒），默认120" /></div>
      <div class="form-row"><label class="form-label">Flowprobe记录</label>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <label><input type="checkbox" value="l2" v-model="config.flowprobe_record" /> L2</label>
          <label><input type="checkbox" value="l3" v-model="config.flowprobe_record" /> L3</label>
          <label><input type="checkbox" value="l4" v-model="config.flowprobe_record" /> L4</label>
        </div>
      </div>

      <div style="font-weight:bold;margin:16px 0 8px;">收集器</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createCollector">添加</ToolbarButton>
        <ToolbarButton icon="edit" @click="editCollector" :disabled="!selectedCollectors.length || selectedCollectors.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeCollector" :disabled="!selectedCollectors.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="collectorColumns" :data="config.collectors" rowKey="address" :externalToolbar="true" @selection-change="selectedCollectors = $event" :selectable="true" />

      <div style="font-weight:bold;margin:16px 0 8px;">接口</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createInterface">添加</ToolbarButton>
        <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterfaces.length || selectedInterfaces.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterfaces.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="interfaceColumns" :data="config.interfaces" rowKey="interface" :externalToolbar="true" @selection-change="selectedInterfaces = $event" :selectable="true" />

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showCollectorModal" :title="editingCollector && editingCollector._address ? '编辑收集器' : '添加收集器'" @confirm="saveCollector" @close="showCollectorModal = false">
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editingCollector.address" :disabled="editingCollector._address" placeholder="x.x.x.x" title="收集器IP地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingCollector.port" title="收集器端口，默认4739" /></div>
        <div class="form-row"><label class="form-label">Path MTU</label><input class="form-control" type="number" min="68" max="1450" v-model="editingCollector.path_mtu" title="路径MTU，默认512" /></div>
        <div class="form-row"><label class="form-label">源地址</label><input class="form-control" v-model="editingCollector.source_address" placeholder="x.x.x.x" title="源IP地址" /></div>
        <div class="form-row"><label class="form-label">模板间隔</label><input class="form-control" type="number" min="1" max="300" v-model="editingCollector.template_interval" title="模板发送间隔（秒），默认20" /></div>
        <div class="form-row"><label class="form-label">UDP校验和</label><input type="checkbox" v-model="editingCollector.udp_checksum" title="启用UDP校验和" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showInterfaceModal" :title="editingInterface && editingInterface._interface ? '编辑接口' : '添加接口'" @confirm="saveInterface" @close="showInterfaceModal = false">
        <div class="form-row"><label class="form-label">接口</label><input class="form-control" v-model="editingInterface.interface" :disabled="editingInterface._interface" title="接口名称" /></div>
        <div class="form-row"><label class="form-label">方向</label>
          <select class="form-control" v-model="editingInterface.direction" title="流量方向">
            <option value="rx">RX</option>
            <option value="tx">TX</option>
            <option value="both">Both (默认)</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">流类型</label>
          <select class="form-control" v-model="editingInterface.flow_variant" title="流变体">
            <option value="l2">L2</option>
            <option value="ipv4">IPv4 (默认)</option>
            <option value="ipv6">IPv6</option>
          </select>
        </div>
      </DraggableModal>
    </div>
  `,
});
