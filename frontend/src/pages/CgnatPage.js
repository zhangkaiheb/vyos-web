import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

export default defineComponent({
  name: 'CgnatPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat cgnat';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const activeTab = ref('rules');
    const tabs = [
      { key: 'rules', title: '规则' },
      { key: 'external', title: '外部池' },
      { key: 'internal', title: '内部池' },
    ];

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const ruleModalKey = ref(0);

    const logAllocation = ref(false);
    const extPools = ref([]);
    const intPools = ref([]);
    const poolModalVisible = ref(false);
    const poolModalKey = ref(0);
    const editingPool = ref(null);
    const editingPoolType = ref(null);
    const editingPoolOriginalName = ref(null);

    // Range sub-table
    const rangeRows = ref([]);
    const rangeModalVisible = ref(false);
    const rangeModalKey = ref(0);
    const editingRange = ref(null);
    const editingRangeIndex = ref(-1);

    const ruleSchema = computed(() => [
      { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'sourcePool', title: '源内部池', type: 'select', required: true, help: '选择已配置的内部池',
        options: intPools.value.map(p => ({ value: p.name, label: p.name })) },
      { key: 'translationPool', title: '翻译外部池', type: 'select', required: true, help: '选择已配置的外部池',
        options: extPools.value.map(p => ({ value: p.name, label: p.name })) },
    ]);

    const extPoolSchema = [
      { key: 'name', title: '池名称', type: 'text', required: true, help: '外部池的唯一标识名称' },
      { key: 'externalPortRange', title: '外部端口范围', type: 'text', placeholder: '1024-65535', help: '端口范围，默认: 1024-65535' },
      { key: 'perUserLimitPort', title: '每用户端口数', type: 'number', min: 1, max: 65535, placeholder: '2000', help: '每用户端口数，默认: 2000，范围: 1-65535' },
    ];

    const intPoolSchema = [
      { key: 'name', title: '池名称', type: 'text', required: true, help: '内部池的唯一标识名称' },
    ];

    const ruleColumns = [
      { key: 'id', title: '规则编号' },
      { key: 'sourcePool', title: '源内部池' },
      { key: 'translationPool', title: '翻译外部池' },
    ];

    const rangeColumns = [
      { key: 'range', title: 'IP地址范围' },
      { key: 'seq', title: '序号' },
    ];

    const poolColumns = [
      { key: 'name', title: '名称' },
      { key: 'ranges', title: '地址范围' },
      { key: 'portRange', title: '端口范围' },
      { key: 'perUserLimit', title: '每用户端口数' },
    ];

    const intPoolColumns = [
      { key: 'name', title: '名称' },
      { key: 'ranges', title: '地址范围' },
    ];

    function formatRangeLines(ranges) {
      if (!ranges || !ranges.length) return '';
      return ranges.map(r => {
        if (r.seq !== null && r.seq !== undefined) return `${r.range} ${r.seq}`;
        return r.range;
      }).join('\n');
    }

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;

          logAllocation.value = !!raw['log-allocation'];

          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => {
            const rule = { id: parseInt(id) || id };
            const src = attrs.source || {};
            if (src.pool) rule.sourcePool = src.pool;
            const trans = attrs.translation || {};
            if (trans.pool) rule.translationPool = trans.pool;
            return rule;
          });
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });

          const poolData = raw.pool || {};
          const extPoolData = poolData.external || {};
          extPools.value = Object.entries(extPoolData).map(([name, attrs]) => {
            const pool = { name };
            if (attrs['external-port-range']) pool.portRange = attrs['external-port-range'];
            if (attrs['per-user-limit'] && attrs['per-user-limit'].port) pool.perUserLimit = attrs['per-user-limit'].port;
            const rangeObj = attrs.range || {};
            const rangeList = Object.entries(rangeObj).map(([addr, rAttrs]) => ({
              range: addr,
              seq: rAttrs?.seq !== undefined ? parseInt(rAttrs.seq) : null,
            }));
            pool.ranges = formatRangeLines(rangeList);
            return pool;
          });

          const intPoolData = poolData.internal || {};
          intPools.value = Object.entries(intPoolData).map(([name, attrs]) => {
            const pool = { name };
            const rangeVal = attrs.range;
            if (Array.isArray(rangeVal)) {
              pool.ranges = rangeVal.join('\n');
            } else if (typeof rangeVal === 'string') {
              pool.ranges = rangeVal;
            } else if (rangeVal && typeof rangeVal === 'object') {
              const rangeList = Object.keys(rangeVal);
              pool.ranges = rangeList.join('\n');
            } else {
              pool.ranges = '';
            }
            return pool;
          });
        }
      } catch (e) {
        showError('加载 CGNAT 配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: 1 };
        editingOriginalId.value = null;
      }
      ruleModalKey.value++;
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: '请输入规则编号' });
        if (!rule.sourcePool) return showError({ message: '请输入源内部池' });
        if (!rule.translationPool) return showError({ message: '请输入翻译外部池' });

        const value = {
          source: { pool: rule.sourcePool },
          translation: { pool: rule.translationPool },
        };

        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError('保存 CGNAT 规则失败', e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      if (!confirm('确认删除此 CGNAT 规则？')) return;
      try {
        await configStore.deleteConfig(`${path} rule ${row.id}`);
        await load();
      } catch (e) {
        showError('删除 CGNAT 规则失败', e);
      }
    }

    async function openPoolModal(type, row) {
      editingPoolType.value = type;
      if (row) {
        editingPool.value = {
          name: row.name,
          externalPortRange: row.portRange || '',
          perUserLimitPort: row.perUserLimit || '',
        };
        editingPoolOriginalName.value = row.name;
        // Load ranges from row
        if (row.ranges) {
          rangeRows.value = row.ranges.split('\n').filter(Boolean).map(line => {
            const parts = line.trim().split(/\s+/);
            return { range: parts[0], seq: parts[1] ? parseInt(parts[1]) : null };
          });
        } else {
          rangeRows.value = [];
        }
      } else {
        editingPool.value = { name: '' };
        editingPoolOriginalName.value = null;
        rangeRows.value = [];
      }
      poolModalKey.value++;
      poolModalVisible.value = true;
    }

    function openRangeModal(index) {
      if (index >= 0) {
        editingRange.value = { ...rangeRows.value[index] };
        editingRangeIndex.value = index;
      } else {
        editingRange.value = { range: '', seq: '' };
        editingRangeIndex.value = -1;
      }
      rangeModalKey.value++;
      rangeModalVisible.value = true;
    }

    function saveRange() {
      const r = editingRange.value;
      if (!r.range) return showError({ message: '请输入IP地址范围' });
      const row = { range: r.range, seq: r.seq ? parseInt(r.seq) : null };
      if (editingRangeIndex.value >= 0) {
        rangeRows.value[editingRangeIndex.value] = row;
      } else {
        rangeRows.value.push(row);
      }
      rangeModalVisible.value = false;
    }

    function deleteRange(index) {
      rangeRows.value.splice(index, 1);
    }

    async function savePool() {
      try {
        const pool = editingPool.value;
        if (!pool.name) return showError({ message: '请输入池名称' });

        const poolType = editingPoolType.value;
        const value = {};

        if (poolType === 'external') {
          if (pool.externalPortRange) value['external-port-range'] = pool.externalPortRange;
          if (pool.perUserLimitPort) value['per-user-limit'] = { port: parseInt(pool.perUserLimitPort) };
        }

        // Build range from rangeRows
        if (rangeRows.value.length) {
          value.range = {};
          for (const r of rangeRows.value) {
            if (poolType === 'external') {
              value.range[r.range] = r.seq !== null ? { seq: r.seq } : {};
            } else {
              value.range[r.range] = {};
            }
          }
        }

        if (editingPoolOriginalName.value && editingPoolOriginalName.value !== pool.name) {
          await configStore.deleteConfig(`${path} pool ${poolType} ${editingPoolOriginalName.value}`);
        }
        await configStore.setConfig(`${path} pool ${poolType} ${pool.name}`, value);
        poolModalVisible.value = false;
        await load();
      } catch (e) {
        showError('保存 CGNAT 池失败', e);
      }
    }

    async function deleteExtPool(keys) {
      if (!keys || !keys.length) return;
      if (!confirm('确认删除选中的外部池？')) return;
      try {
        for (const name of keys) {
          await configStore.deleteConfig(`${path} pool external ${name}`);
        }
        await load();
      } catch (e) {
        showError('删除外部池失败', e);
      }
    }

    async function deleteIntPool(keys) {
      if (!keys || !keys.length) return;
      if (!confirm('确认删除选中的内部池？')) return;
      try {
        for (const name of keys) {
          await configStore.deleteConfig(`${path} pool internal ${name}`);
        }
        await load();
      } catch (e) {
        showError('删除内部池失败', e);
      }
    }

    async function toggleLogAllocation() {
      try {
        if (logAllocation.value) {
          await configStore.setConfig(`${path} log-allocation`, {});
        } else {
          await configStore.deleteConfig(`${path} log-allocation`);
        }
      } catch (e) {
        showError('设置日志分配失败', e);
        logAllocation.value = !logAllocation.value;
      }
    }

    onMounted(load);
    watch(() => route.path, load);

    return {
      path, writeDisabled,
      activeTab, tabs,
      logAllocation,
      rules, loading,
      modalVisible, editingRule, editingOriginalId, ruleModalKey,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule,
      extPools, intPools,
      poolModalVisible, poolModalKey, editingPool, editingPoolType, editingPoolOriginalName,
      extPoolSchema, intPoolSchema, poolColumns, intPoolColumns,
      openPoolModal, savePool, deleteExtPool, deleteIntPool,
      rangeRows, rangeColumns,
      rangeModalVisible, rangeModalKey, editingRange, editingRangeIndex,
      openRangeModal, saveRange, deleteRange,
      toggleLogAllocation, load,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton, TabGroup },
  template: `
    <div class="page-container">
      <TabGroup :tabs="tabs" v-model="activeTab">
        <template #rules>
          <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                     rowKey="id" :actions="['create', 'edit', 'delete']"
                     @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule">
            <template #toolbar-left-extra>
              <label style="display:inline-flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
                <input type="checkbox" v-model="logAllocation" :disabled="writeDisabled" @change="toggleLogAllocation" />
                记录地址端口分配日志
              </label>
            </template>
          </DataTable>
        </template>
        <template #external>
          <DataTable :columns="poolColumns" :data="extPools" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openPoolModal('external', null)"
                     @edit="openPoolModal('external', extPools.find(p => p.name === $event.name))"
                     @delete="deleteExtPool" />
        </template>
        <template #internal>
          <DataTable :columns="intPoolColumns" :data="intPools" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openPoolModal('internal', null)"
                     @edit="openPoolModal('internal', intPools.find(p => p.name === $event.name))"
                     @delete="deleteIntPool" />
        </template>
      </TabGroup>
      <div style="height:32px;"></div>

      <div class="page-actions-bottom">
        <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? '编辑 CGNAT 规则' : '创建 CGNAT 规则'" width="600px" :key="ruleModalKey">
        <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="modalVisible = false">取消</button>
          <button class="btn-primary" @click="saveRule">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="poolModalVisible" :title="editingPoolOriginalName ? '编辑 CGNAT 池' : '创建 CGNAT 池'" width="700px" :key="poolModalKey">
        <ConfigForm v-model="editingPool" :schema="editingPoolType === 'external' ? extPoolSchema : intPoolSchema" :showAdvanced="true" />
        <div style="margin-top:16px;">
          <div style="font-weight:600;margin-bottom:8px;">IP地址范围</div>
          <DataTable :columns="rangeColumns" :data="rangeRows" rowKey="range"
                     :actions="['create', 'edit', 'delete']"
                     @create="openRangeModal(-1)"
                     @edit="openRangeModal(rangeRows.findIndex(r => r.range === $event.range))"
                     @delete="deleteRange" />
        </div>
        <template #footer>
          <button @click="poolModalVisible = false">取消</button>
          <button class="btn-primary" @click="savePool">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="rangeModalVisible" :title="editingRangeIndex >= 0 ? '编辑 IP地址范围' : '添加 IP地址范围'" width="500px" :key="rangeModalKey">
        <ConfigForm v-model="editingRange" :schema="[
          { key: 'range', title: 'IP地址范围', type: 'text', required: true, placeholder: '如: 3.3.1.2-3.3.1.50 或 1.1.0.0/16' },
          { key: 'seq', title: '序号', type: 'number', min: 1, max: 999999, placeholder: editingPoolType === 'external' ? '必填' : '可选', help: editingPoolType === 'external' ? '范围: 1-999999' : '外部池必填，内部池可选' }
        ]" />
        <template #footer>
          <button @click="rangeModalVisible = false">取消</button>
          <button class="btn-primary" @click="saveRange">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
