import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const PROTOCOL_OPTIONS = [
  { value: 'icmp', label: 'ICMP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
];

export default defineComponent({
  name: 'Nat64SourcePage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat64 source';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);

    const ruleSchema = [
      { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'matchMark', title: '匹配 fwmark 值', type: 'number', min: 1, max: 2147483647, placeholder: '1-2147483647' },
      { key: 'sourcePrefix', title: 'IPv6 源前缀', type: 'text', placeholder: 'h:h:h:h:h:h:h:h/x' },
      { key: 'disable', title: '禁用', type: 'checkbox' },
    ];

    const ruleColumns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'sourcePrefix', title: 'IPv6 源前缀' },
      { key: 'matchMark', title: 'fwmark' },
      { key: 'disable', title: '禁用' },
    ];

    // Translation pools per rule
    const poolModalVisible = ref(false);
    const editingPool = ref(null);
    const editingPoolRuleId = ref(null);
    const editingPoolOriginalId = ref(null);

    const poolSchema = [
      { key: 'id', title: '池编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'address', title: 'IPv4 地址/前缀', type: 'text', placeholder: 'x.x.x.x 或 x.x.x.x/x' },
      { key: 'port', title: '端口', type: 'text', placeholder: '1-65535 或 start-end' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS },
      { key: 'disable', title: '禁用', type: 'checkbox' },
    ];

    const poolColumns = [
      { key: 'id', title: '池编号' },
      { key: 'description', title: '描述' },
      { key: 'address', title: 'IPv4 地址' },
      { key: 'port', title: '端口' },
      { key: 'protocol', title: '协议' },
      { key: 'disable', title: '禁用' },
    ];

    const currentRulePools = computed(() => {
      if (!editingRule.value) return [];
      return editingRule.value._pools || [];
    });

    const selectedPools = ref([]);

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => {
            const rule = { id: parseInt(id) || id };
            if (attrs.description) rule.description = attrs.description;
            if (attrs.disable) rule.disable = true;
            if (attrs.match?.mark) rule.matchMark = parseInt(attrs.match.mark);
            if (attrs.source?.prefix) rule.sourcePrefix = attrs.source.prefix;

            // Parse translation pools
            const trans = attrs.translation || {};
            const poolData = trans.pool || {};
            rule._pools = Object.entries(poolData).map(([poolId, poolAttrs]) => ({
              id: parseInt(poolId) || poolId,
              description: poolAttrs.description || '',
              address: poolAttrs.address || '',
              port: poolAttrs.port || '',
              protocol: poolAttrs.protocol || '',
              disable: poolAttrs.disable ? true : false,
            }));
            rule._pools.sort((a, b) => a.id - b.id);

            return rule;
          });
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });
        }
      } catch (e) {
        showError('加载 NAT64 源配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.disable) value.disable = '';
      if (rule.matchMark) value.match = { mark: String(rule.matchMark) };

      if (rule.sourcePrefix) value.source = { prefix: rule.sourcePrefix };

      const trans = {};
      if (rule._pools && rule._pools.length) {
        const poolObj = {};
        for (const pool of rule._pools) {
          const pv = {};
          if (pool.description) pv.description = pool.description;
          if (pool.disable) pv.disable = '';
          if (pool.address) pv.address = pool.address;
          if (pool.port) pv.port = pool.port;
          if (pool.protocol) pv.protocol = { [pool.protocol]: '' };
          poolObj[pool.id] = pv;
        }
        trans.pool = poolObj;
      }
      if (Object.keys(trans).length) value.translation = trans;

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row, _pools: [...(row._pools || [])] };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: 1, _pools: [] };
        editingOriginalId.value = null;
      }
      selectedPools.value = [];
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: '请输入规则编号' });
        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError('保存 NAT64 源规则失败', e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      if (!confirm('确认删除此 NAT64 源规则？')) return;
      try {
        await configStore.deleteConfig(`${path} rule ${row.id}`);
        await load();
      } catch (e) {
        showError('删除 NAT64 源规则失败', e);
      }
    }

    // Pool handlers (within rule modal)
    function openPoolModal(row) {
      if (row) {
        editingPool.value = { ...row };
        editingPoolOriginalId.value = row.id;
      } else {
        const maxId = editingRule.value._pools.reduce((max, p) => Math.max(max, p.id), 0);
        editingPool.value = { id: maxId + 1 };
        editingPoolOriginalId.value = null;
      }
      poolModalVisible.value = true;
    }

    function savePool() {
      const pool = editingPool.value;
      if (!pool.id) return showError({ message: '请输入池编号' });
      if (editingPoolOriginalId.value) {
        const idx = editingRule.value._pools.findIndex(p => p.id === editingPoolOriginalId.value);
        if (idx !== -1) editingRule.value._pools.splice(idx, 1, { ...pool });
      } else {
        editingRule.value._pools.push({ ...pool });
      }
      editingRule.value._pools.sort((a, b) => a.id - b.id);
      poolModalVisible.value = false;
    }

    function deletePool() {
      if (!selectedPools.value.length) return showError({ message: '请选择池' });
      editingRule.value._pools = editingRule.value._pools.filter(p => !selectedPools.value.includes(p.id));
      selectedPools.value = [];
    }

    onMounted(load);
    watch(() => route.path, load);

    return {
      path, writeDisabled,
      rules, loading,
      modalVisible, editingRule, editingOriginalId,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule,
      poolModalVisible, editingPool, editingPoolOriginalId,
      poolSchema, poolColumns,
      currentRulePools, selectedPools,
      openPoolModal, savePool, deletePool,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal" @delete="deleteRule" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
      </div>

      <!-- Rule Modal with embedded pool management -->
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? '编辑 NAT64 源规则' : '创建 NAT64 源规则'" width="800px">
        <div style="margin-bottom:16px;">
          <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" />
        </div>
        <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">翻译池</div>
          <div style="padding:16px;">
            <div class="toolbar toolbar-compact" style="margin-bottom:8px;">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="openPoolModal(null)">创建</ToolbarButton>
                <ToolbarButton icon="edit" :disabled="selectedPools.length !== 1" @click="openPoolModal(currentRulePools.find(p => p.id === selectedPools[0]))">编辑</ToolbarButton>
                <ToolbarButton icon="delete" :disabled="!selectedPools.length" @click="deletePool">删除</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="poolColumns" :data="currentRulePools" v-model:selectedRowKeys="selectedPools" row-key="id" :selectable="true" :externalToolbar="true" />
          </div>
        </div>
        <template #footer>
          <button @click="modalVisible = false">取消</button>
          <button class="btn-primary" @click="saveRule">确定</button>
        </template>
      </DraggableModal>

      <!-- Pool Modal -->
      <DraggableModal v-model:visible="poolModalVisible" :title="editingPoolOriginalId ? '编辑翻译池' : '创建翻译池'" width="500px">
        <ConfigForm v-model="editingPool" :schema="poolSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="poolModalVisible = false">取消</button>
          <button class="btn-primary" @click="savePool">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
