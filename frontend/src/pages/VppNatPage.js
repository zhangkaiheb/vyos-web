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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'VppNatPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('cgnat');

    const config = ref({
      inside_interfaces: '',
      outside_interfaces: '',
      rules: [],
      timeouts: {
        icmp: '60',
        tcp_established: '7440',
        tcp_transitory: '240',
        udp: '300',
      },
    });

    const ruleColumns = [
      { key: 'rule_number', title: '规则号', dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'inside_prefix', title: '内部前缀', dataIndex: 'inside_prefix', width: 150 },
      { key: 'outside_prefix', title: '外部前缀', dataIndex: 'outside_prefix', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedRules = ref([]);
    const showRuleModal = ref(false);
    const editingRule = ref(null);

    const commandPath = computed(() => 'vpp nat');

    function natToForm(data = {}) {
      const rules = data.rule || {};
      const timeouts = data.timeout || {};

      return {
        inside_interfaces: joinLines(data['inside-interface']),
        outside_interfaces: joinLines(data['outside-interface']),
        rules: Object.entries(rules).map(([num, rule]) => ({
          _rule_number: num,
          rule_number: num,
          description: rule.description || '',
          inside_prefix: rule.inside?.prefix || '',
          outside_prefix: rule.outside?.prefix || '',
        })),
        timeouts: {
          icmp: timeouts.icmp || '60',
          tcp_established: timeouts['tcp-established'] || '7440',
          tcp_transitory: timeouts['tcp-transitory'] || '240',
          udp: timeouts.udp || '300',
        },
      };
    }

    function formToNat(form) {
      const result = {};

      const insideIfaces = splitLines(form.inside_interfaces);
      if (insideIfaces.length) result['inside-interface'] = insideIfaces;

      const outsideIfaces = splitLines(form.outside_interfaces);
      if (outsideIfaces.length) result['outside-interface'] = outsideIfaces;

      const rules = {};
      for (const rule of form.rules || []) {
        const ruleObj = {};
        if (isPresent(rule.description)) ruleObj.description = String(rule.description);
        if (isPresent(rule.inside_prefix)) ruleObj.inside = { prefix: String(rule.inside_prefix) };
        if (isPresent(rule.outside_prefix)) ruleObj.outside = { prefix: String(rule.outside_prefix) };
        rules[rule.rule_number] = ruleObj;
      }
      if (Object.keys(rules).length) result.rule = rules;

      const timeout = {};
      if (isPresent(form.timeouts.icmp)) timeout.icmp = String(form.timeouts.icmp);
      if (isPresent(form.timeouts.tcp_established)) timeout['tcp-established'] = String(form.timeouts.tcp_established);
      if (isPresent(form.timeouts.tcp_transitory)) timeout['tcp-transitory'] = String(form.timeouts.tcp_transitory);
      if (isPresent(form.timeouts.udp)) timeout.udp = String(form.timeouts.udp);
      if (Object.keys(timeout).length) result.timeout = timeout;

      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('vpp nat', true);
        config.value = natToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp nat');
        const payload = formToNat(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp nat', payload);
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

    function createRule() {
      editingRule.value = { rule_number: '', description: '', inside_prefix: '', outside_prefix: '' };
      showRuleModal.value = true;
    }

    function editRule() {
      if (!selectedRules.value.length) return alert('请选择要编辑的规则');
      const row = config.value.rules.find(r => r.rule_number === selectedRules.value[0]);
      if (!row) return alert('未找到选中的规则');
      editingRule.value = JSON.parse(JSON.stringify(row));
      showRuleModal.value = true;
    }

    function removeRule() {
      if (!selectedRules.value.length) return alert('请选择要删除的规则');
      config.value.rules = config.value.rules.filter(r => r.rule_number !== selectedRules.value[0]);
      selectedRules.value = [];
    }

    function saveRule() {
      if (!editingRule.value.rule_number) return alert('请输入规则号');
      const list = config.value.rules;
      const idx = list.findIndex(r => r._rule_number === editingRule.value._rule_number);
      if (idx >= 0) list.splice(idx, 1, { ...editingRule.value });
      else list.push({ ...editingRule.value });
      config.value.rules = list;
      showRuleModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, activeTab, commandPath,
      ruleColumns, selectedRules, showRuleModal, editingRule,
      load, save,
      createRule, editRule, removeRule, saveRule,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'cgnat', title: 'CGNAT' }
      ]">

      <template #cgnat>
        <div class="form-row"><label class="form-label">内部接口</label><textarea class="form-control" v-model="config.inside_interfaces" rows="3" placeholder="每行一个接口" title="NAT内部接口" /></div>
        <div class="form-row"><label class="form-label">外部接口</label><textarea class="form-control" v-model="config.outside_interfaces" rows="3" placeholder="每行一个接口" title="NAT外部接口" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">规则</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createRule">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRule" :disabled="!selectedRules.length || selectedRules.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRule" :disabled="!selectedRules.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="ruleColumns" :data="config.rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedRules = $event" :selectable="true" />

        <div style="font-weight:bold;margin:16px 0 8px;">超时设置</div>
        <div class="form-row"><label class="form-label">ICMP</label><input class="form-control" type="number" v-model="config.timeouts.icmp" title="ICMP超时（秒），默认60" /></div>
        <div class="form-row"><label class="form-label">TCP已建立</label><input class="form-control" type="number" v-model="config.timeouts.tcp_established" title="TCP已建立连接超时（秒），默认7440" /></div>
        <div class="form-row"><label class="form-label">TCP临时</label><input class="form-control" type="number" v-model="config.timeouts.tcp_transitory" title="TCP临时连接超时（秒），默认240" /></div>
        <div class="form-row"><label class="form-label">UDP</label><input class="form-control" type="number" v-model="config.timeouts.udp" title="UDP超时（秒），默认300" /></div>
      </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showRuleModal" :title="editingRule && editingRule._rule_number ? '编辑规则' : '新建规则'" @confirm="saveRule" @close="showRuleModal = false">
        <div class="form-row"><label class="form-label">规则号</label><input class="form-control" v-model="editingRule.rule_number" :disabled="editingRule._rule_number" title="规则编号" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingRule.description" title="规则描述" /></div>
        <div class="form-row"><label class="form-label">内部前缀</label><input class="form-control" v-model="editingRule.inside_prefix" placeholder="x.x.x.x/x" title="内部IP前缀" /></div>
        <div class="form-row"><label class="form-label">外部前缀</label><input class="form-control" v-model="editingRule.outside_prefix" placeholder="x.x.x.x/x" title="外部IP前缀" /></div>
      </DraggableModal>
    </div>
  `,
});
