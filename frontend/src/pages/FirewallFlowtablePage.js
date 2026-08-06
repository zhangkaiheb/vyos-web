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

export default defineComponent({
  name: 'FirewallFlowtablePage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const columns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'offload', title: '卸载方式', dataIndex: 'offload', width: 120 },
      { key: 'interfaces', title: '接口', dataIndex: 'interfaces', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const flowtables = ref([]);
    const selected = ref([]);
    const showFlowtableModal = ref(false);
    const editingFlowtable = ref(null);

    const flowtableSchema = [
      { key: 'name', title: '名称', type: 'text', required: true, help: '流表名称' },
      { key: 'description', title: '描述', type: 'text', help: '流表描述' },
      { key: 'offload', title: '卸载方式', type: 'select', options: [
        { value: 'software', label: '软件卸载 (默认)' },
        { value: 'hardware', label: '硬件卸载' },
      ], help: '流表卸载方式' },
      { key: 'interfaces', title: '接口', type: 'textarea', help: '逗号分隔的接口名称，如 eth0, eth1' },
    ];

    const commandPath = computed(() => 'firewall flowtable');

    function flowtableToForm(data = {}) {
      return Object.entries(data).map(([name, ft]) => ({
        _name: name,
        name,
        description: ft.description || '',
        offload: ft.offload === 'hardware' ? 'hardware' : 'software',
        interfaces: toArray(ft.interface).join(', '),
      }));
    }

    function formToFlowtable(items) {
      const result = {};
      for (const item of items) {
        if (!item.name) continue;
        const ft = {};
        if (isPresent(item.description)) ft.description = String(item.description);
        if (item.offload && item.offload !== 'software') ft.offload = String(item.offload);
        const interfaces = item.interfaces ? String(item.interfaces).split(',').map(s => s.trim()).filter(Boolean) : [];
        if (interfaces.length) ft.interface = interfaces;
        result[item.name] = ft;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('firewall flowtable', true);
        flowtables.value = flowtableToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToFlowtable(flowtables.value);
        await configApi.set('firewall flowtable', payload);
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createFlowtable() {
      editingFlowtable.value = { name: '', description: '', offload: 'software', interfaces: '' };
      showFlowtableModal.value = true;
    }

    function editFlowtable() {
      if (!selected.value.length) return alert('请选择要编辑的流表');
      const row = flowtables.value.find(f => f.name === selected.value[0]);
      if (!row) return alert('未找到选中的流表');
      editingFlowtable.value = JSON.parse(JSON.stringify(row));
      showFlowtableModal.value = true;
    }

    function removeFlowtable() {
      if (!selected.value.length) return alert('请选择要删除的流表');
      flowtables.value = flowtables.value.filter(f => f.name !== selected.value[0]);
      selected.value = [];
    }

    function saveFlowtable() {
      if (!editingFlowtable.value.name) return alert('请输入流表名称');
      const list = flowtables.value;
      const idx = list.findIndex(f => f._name === editingFlowtable.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingFlowtable.value });
      else list.push({ ...editingFlowtable.value });
      flowtables.value = list;
      showFlowtableModal.value = false;
    }

    function editFlowtableByRecord(record) {
      editingFlowtable.value = JSON.parse(JSON.stringify(record));
      showFlowtableModal.value = true;
    }

    function removeFlowtableByRecord(record) {
      flowtables.value = flowtables.value.filter(f => f.name !== record.name);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, flowtables, selected,
      showFlowtableModal, editingFlowtable,
      columns, flowtableSchema, commandPath,
      load, save,
      createFlowtable, editFlowtable, removeFlowtable, saveFlowtable,
      editFlowtableByRecord, removeFlowtableByRecord,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="toolbar">
        <ToolbarButton icon="create" @click="createFlowtable">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editFlowtable" :disabled="!selected.length || selected.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeFlowtable" :disabled="!selected.length">删除</ToolbarButton>
      </div>

      <DataTable :columns="columns" :data="flowtables" rowKey="name" :externalToolbar="true" @selection-change="selected = $event" :selectable="true" :loading="loading">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a @click="editFlowtableByRecord(record)">编辑</a>
            <a @click="removeFlowtableByRecord(record)" style="color:#ff4d4f;margin-left:8px">删除</a>
          </template>
        </template>
      </DataTable>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showFlowtableModal" :title="editingFlowtable && editingFlowtable._name ? '编辑流表' : '新建流表'" @confirm="saveFlowtable" @close="showFlowtableModal = false">
        <ConfigForm :schema="flowtableSchema" v-model="editingFlowtable" />
      </DraggableModal>
    </div>
  `,
});
