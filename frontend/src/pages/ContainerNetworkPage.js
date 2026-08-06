import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'ContainerNetworkPage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const networkList = ref([]);
    const selectedNetworks = ref([]);
    const showEditModal = ref(false);
    const editingNetwork = ref(null);

    const columns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'type', title: '类型', dataIndex: 'type', width: 100 },
      { key: 'gateway', title: '网关', dataIndex: 'gateway', width: 180 },
      { key: 'prefix', title: '前缀', dataIndex: 'prefix', width: 180 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'vrf', title: 'VRF', dataIndex: 'vrf', width: 100 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const commandPath = computed(() => 'container network');

    function networkToForm(name, data = {}) {
      return {
        _name: name,
        name: name,
        description: data.description || '',
        gateway: joinLines(data.gateway),
        mtu: data.mtu || '',
        no_name_server: data['no-name-server'] !== undefined,
        prefix: joinLines(data.prefix),
        type: data.type || 'bridge',
        macvlan: {
          mode: data.macvlan?.mode || '',
          parent: data.macvlan?.parent || '',
        },
        vrf: data.vrf || '',
      };
    }

    function formToNetwork(form) {
      const result = {};
      if (isPresent(form.description)) result.description = String(form.description);
      const gateways = splitLines(form.gateway);
      if (gateways.length) result.gateway = gateways;
      if (isPresent(form.mtu)) result.mtu = String(form.mtu);
      if (form.no_name_server) result['no-name-server'] = '';
      const prefixes = splitLines(form.prefix);
      if (prefixes.length) result.prefix = prefixes;
      if (form.type && form.type !== 'bridge') result.type = String(form.type);
      if (form.type === 'macvlan') {
        const macvlan = {};
        if (isPresent(form.macvlan?.mode)) macvlan.mode = String(form.macvlan.mode);
        if (isPresent(form.macvlan?.parent)) macvlan.parent = String(form.macvlan.parent);
        if (Object.keys(macvlan).length) result.macvlan = macvlan;
      }
      if (isPresent(form.vrf)) result.vrf = String(form.vrf);
      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('container network', true);
        const data = res.data || {};
        networkList.value = Object.entries(data).map(([name, cfg]) => networkToForm(name, cfg));
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function saveConfig() {
      saving.value = true;
      try {
        await configApi.delete('container network');
        const payload = {};
        for (const n of networkList.value) {
          if (!n.name) continue;
          payload[n.name] = formToNetwork(n);
        }
        if (Object.keys(payload).length) {
          await configApi.set('container network', payload);
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

    function createNetwork() {
      editingNetwork.value = {
        _name: '', name: '', description: '', gateway: '', mtu: '',
        no_name_server: false, prefix: '', type: 'bridge',
        macvlan: { mode: '', parent: '' }, vrf: '',
      };
      showEditModal.value = true;
    }

    function editNetwork() {
      if (!selectedNetworks.value.length) return alert('请选择要编辑的网络');
      const row = networkList.value.find(n => n.name === selectedNetworks.value[0]);
      if (!row) return alert('未找到选中的网络');
      editingNetwork.value = JSON.parse(JSON.stringify(row));
      showEditModal.value = true;
    }

    function removeNetwork() {
      if (!selectedNetworks.value.length) return alert('请选择要删除的网络');
      networkList.value = networkList.value.filter(n => n.name !== selectedNetworks.value[0]);
      selectedNetworks.value = [];
    }

    function saveNetwork() {
      if (!editingNetwork.value.name) return alert('请输入网络名称');
      const list = networkList.value;
      const idx = list.findIndex(n => n._name === editingNetwork.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingNetwork.value });
      else list.push({ ...editingNetwork.value });
      networkList.value = list;
      showEditModal.value = false;
    }

    function editNetworkByRecord(record) {
      editingNetwork.value = JSON.parse(JSON.stringify(record));
      showEditModal.value = true;
    }

    function removeNetworkByRecord(record) {
      networkList.value = networkList.value.filter(n => n.name !== record.name);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, networkList, columns, commandPath,
      selectedNetworks, showEditModal, editingNetwork,
      load, saveConfig,
      createNetwork, editNetwork, removeNetwork, saveNetwork,
      editNetworkByRecord, removeNetworkByRecord,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="toolbar">
        <ToolbarButton icon="create" @click="createNetwork">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editNetwork" :disabled="!selectedNetworks.length || selectedNetworks.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeNetwork" :disabled="!selectedNetworks.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="columns" :data="networkList" rowKey="name" :externalToolbar="true" @selection-change="selectedNetworks = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'gateway'">
            <span>{{ (record.gateway || '').replace(/\\n/g, ', ') }}</span>
          </template>
          <template v-if="column.key === 'prefix'">
            <span>{{ (record.prefix || '').replace(/\\n/g, ', ') }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editNetworkByRecord(record)" style="margin-right:8px">编辑</a>
            <a @click="removeNetworkByRecord(record)" style="color:#ff4d4f">删除</a>
          </template>
        </template>
      </DataTable>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="saveConfig" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <!-- Edit Modal -->
      <DraggableModal v-model:visible="showEditModal" :title="editingNetwork && editingNetwork._name ? '编辑网络: ' + editingNetwork._name : '新建网络'" @confirm="saveNetwork" @close="showEditModal = false" width="700px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingNetwork.name" :disabled="editingNetwork._name" title="网络名称" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingNetwork.description" title="描述" /></div>
        <div class="form-row"><label class="form-label">类型</label>
          <select class="form-control" v-model="editingNetwork.type" title="网络类型">
            <option value="bridge">Bridge (默认)</option>
            <option value="macvlan">MACVLAN</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingNetwork.mtu" title="最大传输单元" /></div>
        <div class="form-row"><label class="form-label">VRF</label><input class="form-control" v-model="editingNetwork.vrf" title="VRF 实例名称" /></div>
        <div class="form-row"><label class="form-label">禁用 DNS</label><input type="checkbox" v-model="editingNetwork.no_name_server" title="禁用 DNS 插件" /></div>
        <div class="form-row"><label class="form-label">网关地址</label><textarea class="form-control" v-model="editingNetwork.gateway" rows="3" placeholder="每行一个网关地址" title="网关地址" /></div>
        <div class="form-row"><label class="form-label">前缀</label><textarea class="form-control" v-model="editingNetwork.prefix" rows="3" placeholder="每行一个前缀，如 192.168.0.0/24" title="分配给网络的前缀" /></div>

        <div v-if="editingNetwork.type === 'macvlan'">
          <div style="font-weight:bold;margin:16px 0 8px;">MACVLAN 设置</div>
          <div class="form-row"><label class="form-label">模式</label>
            <select class="form-control" v-model="editingNetwork.macvlan.mode" title="MACVLAN 模式">
              <option value="bridge">Bridge</option>
              <option value="private">Private</option>
              <option value="vepa">VEPA</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">父接口</label><input class="form-control" v-model="editingNetwork.macvlan.parent" title="父网络接口" /></div>
        </div>
      </DraggableModal>
    </div>
  `,
});
