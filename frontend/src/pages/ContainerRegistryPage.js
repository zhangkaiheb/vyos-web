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

let mirrorKeyCounter = 0;
function nextMirrorKey() { return '_mk_' + (++mirrorKeyCounter); }

export default defineComponent({
  name: 'ContainerRegistryPage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const registries = ref([]);

    const registryColumns = [
      { key: 'name', title: '注册表名称', dataIndex: 'name', width: 180 },
      { key: 'username', title: '认证用户名', dataIndex: 'username', width: 150 },
      { key: 'insecure', title: '不安全', dataIndex: 'insecure', width: 80 },
      { key: 'disable', title: '禁用', dataIndex: 'disable', width: 80 },
      { key: 'mirror_count', title: '镜像数', dataIndex: 'mirror_count', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const mirrorColumns = [
      { key: 'host_name', title: '主机名', dataIndex: 'host_name', width: 180 },
      { key: 'address', title: '地址', dataIndex: 'address', width: 150 },
      { key: 'port', title: '端口', dataIndex: 'port', width: 80 },
      { key: 'path', title: '路径', dataIndex: 'path', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedRegistries = ref([]);
    const selectedMirrors = ref([]);

    const showRegistryModal = ref(false);
    const editingRegistry = ref(null);

    const showMirrorModal = ref(false);
    const editingMirror = ref(null);

    const commandPath = computed(() => 'container registry');

    function registryToForm(data = {}) {
      const entries = Object.entries(data);
      return entries.map(([name, reg]) => {
        const auth = reg.authentication || {};
        const mirrors = reg.mirror || {};
        return {
          _name: name,
          name: name,
          username: auth.username || '',
          password: auth.password || '',
          insecure: reg.insecure !== undefined,
          disable: reg.disable !== undefined,
          mirrors: Object.entries(mirrors).map(([hostName, m]) => ({
            _key: nextMirrorKey(),
            _host_name: hostName,
            host_name: hostName,
            address: m.address || '',
            port: m.port || '',
            path: m.path || '',
          })),
          mirror_count: Object.keys(mirrors).length,
        };
      });
    }

    function formToRegistry(list) {
      const result = {};
      for (const reg of list) {
        if (!reg.name) continue;
        const obj = {};
        if (reg.insecure) obj.insecure = '';
        if (reg.disable) obj.disable = '';

        const auth = {};
        if (isPresent(reg.username)) auth.username = String(reg.username);
        if (isPresent(reg.password)) auth.password = String(reg.password);
        if (Object.keys(auth).length) obj.authentication = auth;

        const mirrors = {};
        for (const m of reg.mirrors || []) {
          if (!m.host_name) continue;
          const mObj = {};
          if (isPresent(m.address)) mObj.address = String(m.address);
          if (isPresent(m.port)) mObj.port = String(m.port);
          if (isPresent(m.path)) mObj.path = String(m.path);
          mirrors[m.host_name] = mObj;
        }
        if (Object.keys(mirrors).length) obj.mirror = mirrors;

        result[reg.name] = obj;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('container registry', true);
        registries.value = registryToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('container registry');
        const payload = formToRegistry(registries.value);
        if (Object.keys(payload).length) {
          await configApi.set('container registry', payload);
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

    function createRegistry() {
      editingRegistry.value = {
        name: '',
        username: '',
        password: '',
        insecure: false,
        disable: false,
        mirrors: [],
        mirror_count: 0,
      };
      showRegistryModal.value = true;
    }

    function editRegistry() {
      if (!selectedRegistries.value.length) return alert('请选择要编辑的注册表');
      const row = registries.value.find(r => r.name === selectedRegistries.value[0]);
      if (!row) return alert('未找到选中的注册表');
      editingRegistry.value = JSON.parse(JSON.stringify(row));
      selectedMirrors.value = [];
      showRegistryModal.value = true;
    }

    function editRegistryByRecord(record) {
      const row = registries.value.find(r => r.name === record.name);
      if (!row) return;
      editingRegistry.value = JSON.parse(JSON.stringify(row));
      selectedMirrors.value = [];
      showRegistryModal.value = true;
    }

    function removeRegistry() {
      if (!selectedRegistries.value.length) return alert('请选择要删除的注册表');
      registries.value = registries.value.filter(r => r.name !== selectedRegistries.value[0]);
      selectedRegistries.value = [];
    }

    function removeRegistryByRecord(record) {
      registries.value = registries.value.filter(r => r.name !== record.name);
    }

    function saveRegistry() {
      if (!editingRegistry.value.name) return alert('请输入注册表名称');
      const list = registries.value;
      const idx = list.findIndex(r => r._name === editingRegistry.value._name);
      const reg = { ...editingRegistry.value };
      reg.mirror_count = (reg.mirrors || []).length;
      if (idx >= 0) list.splice(idx, 1, reg);
      else list.push(reg);
      registries.value = list;
      showRegistryModal.value = false;
    }

    function createMirror() {
      editingMirror.value = {
        _key: '',
        _host_name: '',
        host_name: '',
        address: '',
        port: '',
        path: '',
      };
      showMirrorModal.value = true;
    }

    function editMirror() {
      if (!selectedMirrors.value.length) return alert('请选择要编辑的镜像');
      const row = editingRegistry.value.mirrors.find(m => m._key === selectedMirrors.value[0]);
      if (!row) return alert('未找到选中的镜像');
      editingMirror.value = JSON.parse(JSON.stringify(row));
      showMirrorModal.value = true;
    }

    function editMirrorByRecord(record) {
      const row = editingRegistry.value.mirrors.find(m => m._key === record._key);
      if (!row) return;
      editingMirror.value = JSON.parse(JSON.stringify(row));
      showMirrorModal.value = true;
    }

    function removeMirror() {
      if (!selectedMirrors.value.length) return alert('请选择要删除的镜像');
      editingRegistry.value.mirrors = editingRegistry.value.mirrors.filter(m => m._key !== selectedMirrors.value[0]);
      editingRegistry.value.mirror_count = editingRegistry.value.mirrors.length;
      selectedMirrors.value = [];
    }

    function removeMirrorByRecord(record) {
      editingRegistry.value.mirrors = editingRegistry.value.mirrors.filter(m => m._key !== record._key);
      editingRegistry.value.mirror_count = editingRegistry.value.mirrors.length;
    }

    function saveMirror() {
      if (!editingMirror.value.host_name) return alert('请输入镜像主机名');
      if (editingMirror.value.path && !editingMirror.value.path.startsWith('/')) {
        return alert('路径必须以 / 开头');
      }
      const list = editingRegistry.value.mirrors;
      if (editingMirror.value._key) {
        const idx = list.findIndex(m => m._key === editingMirror.value._key);
        if (idx >= 0) list.splice(idx, 1, { ...editingMirror.value });
      } else {
        const newMirror = { ...editingMirror.value, _key: nextMirrorKey() };
        list.push(newMirror);
      }
      editingRegistry.value.mirrors = list;
      editingRegistry.value.mirror_count = list.length;
      showMirrorModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, registries, commandPath,
      registryColumns, mirrorColumns,
      selectedRegistries, selectedMirrors,
      showRegistryModal, editingRegistry,
      showMirrorModal, editingMirror,
      load, save,
      createRegistry, editRegistry, editRegistryByRecord, removeRegistry, removeRegistryByRecord, saveRegistry,
      createMirror, editMirror, editMirrorByRecord, removeMirror, removeMirrorByRecord, saveMirror,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div style="font-weight:bold;margin:16px 0 8px;">容器注册表</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createRegistry">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editRegistry" :disabled="!selectedRegistries.length || selectedRegistries.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeRegistry" :disabled="!selectedRegistries.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="registryColumns" :data="registries" rowKey="name" :externalToolbar="true" @selection-change="selectedRegistries = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'insecure'">
            <span>{{ record.insecure ? '是' : '否' }}</span>
          </template>
          <template v-if="column.key === 'disable'">
            <span>{{ record.disable ? '是' : '否' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editRegistryByRecord(record)" style="margin-right:8px">编辑</a>
            <a @click="removeRegistryByRecord(record)" style="color:#ff4d4f">删除</a>
          </template>
        </template>
      </DataTable>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showRegistryModal" :title="editingRegistry && editingRegistry._name ? '编辑注册表' : '新建注册表'" @confirm="saveRegistry" @close="showRegistryModal = false" width="800px">
        <div class="form-row"><label class="form-label">注册表名称</label><input class="form-control" v-model="editingRegistry.name" :disabled="editingRegistry._name" placeholder="如 docker.io" title="注册表名称，如 docker.io、quay.io" /></div>
        <div class="form-row"><label class="form-label">不安全</label><input type="checkbox" v-model="editingRegistry.insecure" title="允许通过未加密 HTTP 或不受信任证书的 TLS 连接访问注册表" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingRegistry.disable" title="禁用该实例" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">认证</div>
        <div class="form-row"><label class="form-label">用户名</label><input class="form-control" v-model="editingRegistry.username" title="认证用户名" /></div>
        <div class="form-row"><label class="form-label">密码</label><input class="form-control" type="password" v-model="editingRegistry.password" title="认证密码" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">镜像</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createMirror">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editMirror" :disabled="!selectedMirrors.length || selectedMirrors.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeMirror" :disabled="!selectedMirrors.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="mirrorColumns" :data="editingRegistry.mirrors" rowKey="_key" :externalToolbar="true" @selection-change="selectedMirrors = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editMirrorByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeMirrorByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <DraggableModal v-model:visible="showMirrorModal" :title="editingMirror && editingMirror._key ? '编辑镜像' : '添加镜像'" @confirm="saveMirror" @close="showMirrorModal = false" width="600px">
        <div class="form-row"><label class="form-label">主机名</label><input class="form-control" v-model="editingMirror.host_name" :disabled="editingMirror._key" placeholder="如 mirror.example.com" title="容器注册表镜像的主机名" /></div>
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editingMirror.address" placeholder="x.x.x.x" title="镜像的 IP 地址" /></div>
        <div class="form-row"><label class="form-label">端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingMirror.port" title="连接使用的端口号" /></div>
        <div class="form-row"><label class="form-label">路径</label><input class="form-control" v-model="editingMirror.path" placeholder="/v2" title="镜像路径，必须以 / 开头（可选）" /></div>
      </DraggableModal>
    </div>
  `,
});
