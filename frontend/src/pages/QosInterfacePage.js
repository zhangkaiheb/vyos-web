import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const DIRECTION_OPTIONS = [
  { value: 'egress', label: '出站 (egress)' },
  { value: 'ingress', label: '入站 (ingress)' },
];

export default defineComponent({
  name: 'QosInterfacePage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
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
      { key: 'egress', title: '出站策略 (egress)', dataIndex: 'egress', width: 200 },
      { key: 'ingress', title: '入站策略 (ingress)', dataIndex: 'ingress', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tableData = computed(() => {
      return interfaces.value.map(iface => ({
        key: iface.name,
        interface: iface.name,
        egress: iface.egress || '',
        ingress: iface.ingress || '',
        ...iface,
      }));
    });

    const schema = computed(() => [
      { key: 'interface', title: '接口', type: 'select', options: interfaces.value.map(i => ({ value: i.name, label: i.name })), required: true },
      { key: 'egress', title: '出站策略 (egress)', type: 'select', options: policies.value.map(p => ({ value: p, label: p })), dynamic: true },
      { key: 'ingress', title: '入站策略 (ingress)', type: 'select', options: policies.value.map(p => ({ value: p, label: p })), dynamic: true },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const { interface: iface, egress, ingress } = editingItem.value;
      const cmds = [];
      if (egress) cmds.push(`set qos interface ${iface} egress ${egress}`);
      if (ingress) cmds.push(`set qos interface ${iface} ingress ${ingress}`);
      return cmds.join('\n');
    });

    async function load() {
      loading.value = true;
      try {
        const [qosRes, policyRes] = await Promise.all([
          configApi.get('qos interface'),
          configApi.get('qos policy'),
        ]);

        // Build interface list from qos interface config
        const qosData = qosRes.data || {};
        const ifaceList = [];
        for (const [name, config] of Object.entries(qosData)) {
          ifaceList.push({
            name,
            egress: config.egress || '',
            ingress: config.ingress || '',
          });
        }
        interfaces.value = ifaceList;

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
      editingItem.value = { interface: '', egress: '', ingress: '' };
      modalVisible.value = true;
    }

    function edit(record) {
      editingItem.value = {
        interface: record.interface,
        egress: record.egress || '',
        ingress: record.ingress || '',
      };
      modalVisible.value = true;
    }

    async function save() {
      if (!editingItem.value) return;
      const { interface: iface, egress, ingress } = editingItem.value;
      try {
        if (egress) {
          await configApi.set(`qos interface ${iface} egress`, egress);
        }
        if (ingress) {
          await configApi.set(`qos interface ${iface} ingress`, ingress);
        }
        await configStore.commit();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      }
    }

    async function remove(record) {
      if (!confirm(`确定删除接口 ${record.interface} 的 QoS 配置？`)) return;
      try {
        if (record.egress) {
          await configApi.delete(`qos interface ${record.interface} egress`);
        }
        if (record.ingress) {
          await configApi.delete(`qos interface ${record.interface} ingress`);
        }
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
        :title="editingItem && tableData.find(d => d.interface === editingItem.interface) ? '编辑接口QoS' : '新建接口QoS'"
        @confirm="save"
        @close="modalVisible = false"
      >
        <ConfigForm v-if="editingItem" v-model="editingItem" :schema="schema" />
      </DraggableModal>
    </div>
  `,
});
