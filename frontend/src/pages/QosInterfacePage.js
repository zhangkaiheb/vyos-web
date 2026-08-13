import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'QosInterfacePage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const interfaces = ref([]);
    const policies = ref([]);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const dataTableRef = ref(null);
    const deleteModalVisible = ref(false);
    const pendingDeleteRecord = ref(null);

    const columns = computed(() => [
      { key: 'interface', title: t('qosInterface.column.interface'), dataIndex: 'interface', width: 150 },
      { key: 'egress', title: t('qosInterface.column.egress'), dataIndex: 'egress', width: 200 },
      { key: 'ingress', title: t('qosInterface.column.ingress'), dataIndex: 'ingress', width: 200 },
      { key: 'actions', title: t('qosInterface.column.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

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
      { key: 'interface', title: t('qosInterface.schema.interface'), type: 'select', options: interfaces.value.map(i => ({ value: i.name, label: i.name })), required: true },
      { key: 'egress', title: t('qosInterface.schema.egress'), type: 'select', options: policies.value.map(p => ({ value: p, label: p })), dynamic: true },
      { key: 'ingress', title: t('qosInterface.schema.ingress'), type: 'select', options: policies.value.map(p => ({ value: p, label: p })), dynamic: true },
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
        showError(e.message || t('qosInterface.error.loadFailed'));
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
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(e.message || t('qosInterface.error.saveFailed'));
      }
    }

    async function remove(record) {
      pendingDeleteRecord.value = record;
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      const record = pendingDeleteRecord.value;
      if (!record) return;
      try {
        if (record.egress) {
          await configApi.delete(`qos interface ${record.interface} egress`);
        }
        if (record.ingress) {
          await configApi.delete(`qos interface ${record.interface} ingress`);
        }
        configStore.markPending();
        pendingDeleteRecord.value = null;
        await load();
      } catch (e) {
        showError(e.message || t('qosInterface.error.deleteFailed'));
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t, loading, tableData, columns, selected, modalVisible, editingItem, schema, commandText, dataTableRef,
      deleteModalVisible, pendingDeleteRecord,
      load, create, edit, save, remove, confirmRemove,
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
            <a @click="edit(record)" style="margin-right: 8px">{{ t('app.edit') }}</a>
            <a @click="remove(record)" style="color: #ff4d4f">{{ t('app.delete') }}</a>
          </template>
        </template>
      </DataTable>
      <DraggableModal
        v-model:visible="modalVisible"
        :title="editingItem && tableData.find(d => d.interface === editingItem.interface) ? t('qosInterface.modal.editTitle') : t('qosInterface.modal.createTitle')"
        @confirm="save"
        @close="modalVisible = false"
      >
        <ConfigForm v-if="editingItem" v-model="editingItem" :schema="schema" />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('qosInterface.modal.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('qosInterface.message.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteRecord?.interface }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
