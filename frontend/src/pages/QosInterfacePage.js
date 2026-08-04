import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { interfaceApi, configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const DIRECTION_OPTIONS = [
  { value: 'egress', label: '出站 (egress)' },
  { value: 'ingress', label: '入站 (ingress)' },
];

export default defineComponent({
  name: 'QosInterfacePage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton, CommandPreview },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const interfaces = ref([]);
    const policies = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const dataTableRef = ref(null);

    const columns = [
      { key: 'interface', title: '接口', dataIndex: 'interface', width: 150 },
      { key: 'direction', title: '方向', dataIndex: 'direction', width: 100 },
      { key: 'policy', title: '策略', dataIndex: 'policy', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tableData = computed(() => {
      const result = [];
      for (const iface of interfaces.value) {
        if (iface.egress) {
          result.push({
            key: `${iface.name}-egress`,
            interface: iface.name,
            direction: 'egress',
            policy: iface.egress,
          });
        }
        if (iface.ingress) {
          result.push({
            key: `${iface.name}-ingress`,
            interface: iface.name,
            direction: 'ingress',
            policy: iface.ingress,
          });
        }
      }
      return result;
    });

    const schema = computed(() => [
      { key: 'interface', title: '接口', type: 'select', options: interfaces.value.map(i => ({ value: i.name, label: i.name })), required: true },
      { key: 'direction', title: '方向', type: 'select', options: DIRECTION_OPTIONS, required: true },
      { key: 'policy', title: '策略', type: 'select', options: policies.value.map(p => ({ value: p, label: p })), required: true, dynamic: true },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const { interface: iface, direction, policy } = editingItem.value;
      return `set qos interface ${iface} ${direction} ${policy}`;
    });

    async function load() {
      loading.value = true;
      try {
        const [ifaceRes, policyRes] = await Promise.all([
          interfaceApi.ethernet(),
          configApi.get('qos policy'),
        ]);

        interfaces.value = ifaceRes.interfaces || [];

        // Extract all policy names from different policy types
        const policyData = policyRes.data || {};
        const allPolicies = [];
        for (const type of ['cake', 'drop-tail', 'fair-queue', 'fq-codel', 'limiter', 'network-emulator', 'priority-queue', 'random-detect', 'rate-control', 'round-robin', 'shaper', 'shaper-hfsc']) {
          if (policyData[type]) {
            allPolicies.push(...Object.keys(policyData[type]));
          }
        }
        policies.value = allPolicies;
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function create() {
      editingItem.value = { interface: '', direction: 'egress', policy: '' };
      modalVisible.value = true;
    }

    function edit(record) {
      editingItem.value = { ...record };
      modalVisible.value = true;
    }

    async function save() {
      if (!editingItem.value) return;
      const { interface: iface, direction, policy } = editingItem.value;
      try {
        await configApi.set(`qos interface ${iface} ${direction}`, policy);
        await configStore.commit();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function remove(record) {
      if (!confirm(`确定删除 ${record.interface} 的 ${record.direction} 策略？`)) return;
      try {
        await configApi.delete(`qos interface ${record.interface} ${record.direction}`);
        await configStore.commit();
        await load();
      } catch (e) {
        showError(e.message || '删除失败');
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, tableData, columns, selected, modalVisible, editingItem, schema, commandText, dataTableRef,
      load, create, edit, save, remove,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        ref="dataTableRef"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :selectedKeys="selected"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="create"
        @edit="edit"
        @delete="remove"
        @refresh="load"
        @selection-change="(keys) => selected = keys"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a @click="edit(record)" style="margin-right: 8px">编辑</a>
            <a @click="remove(record)" style="color: #ff4d4f">删除</a>
          </template>
        </template>
      </DataTable>
      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingItem && tableData.find(d => d.key === editingItem.key) ? '编辑接口QoS' : '新建接口QoS'"
        @confirm="save"
        @close="modalVisible = false"
      >
        <ConfigForm v-if="editingItem" v-model="editingItem" :schema="schema" />
        <CommandPreview v-if="commandText" :command="commandText" />
      </DraggableModal>
    </div>
  `,
});
