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
  name: 'VppNat44Page',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('address-pool');

    const config = ref({
      address_pools: [],
      exclude_rules: [],
      inside_interfaces: '',
      outside_interfaces: '',
      static_rules: [],
    });

    const poolColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 120 },
      { key: 'translation_addresses', title: '翻译地址', dataIndex: 'translation_addresses', width: 200 },
      { key: 'translation_interfaces', title: '翻译接口', dataIndex: 'translation_interfaces', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const excludeRuleColumns = [
      { key: 'rule_number', title: '规则号', dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'external_interface', title: '外部接口', dataIndex: 'external_interface', width: 120 },
      { key: 'local_address', title: '本地地址', dataIndex: 'local_address', width: 120 },
      { key: 'local_port', title: '本地端口', dataIndex: 'local_port', width: 80 },
      { key: 'protocol', title: '协议', dataIndex: 'protocol', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const staticRuleColumns = [
      { key: 'rule_number', title: '规则号', dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 150 },
      { key: 'protocol', title: '协议', dataIndex: 'protocol', width: 80 },
      { key: 'local_address', title: '本地地址', dataIndex: 'local_address', width: 120 },
      { key: 'external_address', title: '外部地址', dataIndex: 'external_address', width: 120 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedPools = ref([]);
    const selectedExcludeRules = ref([]);
    const selectedStaticRules = ref([]);

    const showPoolModal = ref(false);
    const editingPool = ref(null);
    const showExcludeRuleModal = ref(false);
    const editingExcludeRule = ref(null);
    const showStaticRuleModal = ref(false);
    const editingStaticRule = ref(null);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'address-pool': return 'vpp nat44 address-pool';
        case 'exclude': return 'vpp nat44 exclude';
        case 'interfaces': return 'vpp nat44 interface';
        case 'static': return 'vpp nat44 static';
        default: return 'vpp nat44';
      }
    });

    function nat44ToForm(data = {}) {
      const pools = data['address-pool'] || {};
      const excludeRules = data.exclude?.rule || {};
      const staticRules = data.static?.rule || {};

      return {
        address_pools: Object.entries(pools).map(([name, pool]) => ({
          _name: name,
          name,
          translation_addresses: joinLines(pool['translation-address']),
          translation_interfaces: joinLines(pool['translation-interface']),
          twice_nat_addresses: joinLines(pool['twice-nat-address']),
          twice_nat_interfaces: joinLines(pool['twice-nat-interface']),
        })),
        exclude_rules: Object.entries(excludeRules).map(([num, rule]) => ({
          _rule_number: num,
          rule_number: num,
          description: rule.description || '',
          external_interface: rule['external-interface'] || '',
          local_address: rule['local-address'] || '',
          local_port: rule['local-port'] || '',
          protocol: rule.protocol || 'all',
        })),
        inside_interfaces: joinLines(data['inside-interface']),
        outside_interfaces: joinLines(data['outside-interface']),
        static_rules: Object.entries(staticRules).map(([num, rule]) => ({
          _rule_number: num,
          rule_number: num,
          description: rule.description || '',
          protocol: rule.protocol || 'all',
          local_address: rule.local?.address || '',
          local_port: rule.local?.port || '',
          external_address: rule.external?.address || '',
          external_port: rule.external?.port || '',
          out_to_in_only: rule['out-to-in-only'] !== undefined,
          self_twice_nat: rule['self-twice-nat'] !== undefined,
          twice_nat: rule['twice-nat'] !== undefined,
          twice_nat_address: rule['twice-nat']?.address || '',
        })),
      };
    }

    function formToNat44(form) {
      const result = {};

      const pools = {};
      for (const pool of form.address_pools || []) {
        if (!pool.name) continue;
        const obj = {};
        const transAddrs = splitLines(pool.translation_addresses);
        if (transAddrs.length) obj['translation-address'] = transAddrs;
        const transIfaces = splitLines(pool.translation_interfaces);
        if (transIfaces.length) obj['translation-interface'] = transIfaces;
        const twiceAddrs = splitLines(pool.twice_nat_addresses);
        if (twiceAddrs.length) obj['twice-nat-address'] = twiceAddrs;
        const twiceIfaces = splitLines(pool.twice_nat_interfaces);
        if (twiceIfaces.length) obj['twice-nat-interface'] = twiceIfaces;
        pools[pool.name] = obj;
      }
      if (Object.keys(pools).length) result['address-pool'] = pools;

      const excludeRules = {};
      for (const rule of form.exclude_rules || []) {
        const ruleObj = {};
        if (isPresent(rule.description)) ruleObj.description = String(rule.description);
        if (isPresent(rule.external_interface)) ruleObj['external-interface'] = String(rule.external_interface);
        if (isPresent(rule.local_address)) ruleObj['local-address'] = String(rule.local_address);
        if (isPresent(rule.local_port)) ruleObj['local-port'] = String(rule.local_port);
        if (isPresent(rule.protocol)) ruleObj.protocol = String(rule.protocol);
        excludeRules[rule.rule_number] = ruleObj;
      }
      if (Object.keys(excludeRules).length) result.exclude = { rule: excludeRules };

      const insideIfaces = splitLines(form.inside_interfaces);
      if (insideIfaces.length) result['inside-interface'] = insideIfaces;
      const outsideIfaces = splitLines(form.outside_interfaces);
      if (outsideIfaces.length) result['outside-interface'] = outsideIfaces;

      const staticRules = {};
      for (const rule of form.static_rules || []) {
        const ruleObj = {};
        if (isPresent(rule.description)) ruleObj.description = String(rule.description);
        if (isPresent(rule.protocol)) ruleObj.protocol = String(rule.protocol);
        if (isPresent(rule.local_address)) {
          ruleObj.local = { address: String(rule.local_address) };
          if (isPresent(rule.local_port)) ruleObj.local.port = String(rule.local_port);
        }
        if (isPresent(rule.external_address)) {
          ruleObj.external = { address: String(rule.external_address) };
          if (isPresent(rule.external_port)) ruleObj.external.port = String(rule.external_port);
        }
        if (rule.out_to_in_only) ruleObj['out-to-in-only'] = '';
        if (rule.self_twice_nat) ruleObj['self-twice-nat'] = '';
        if (rule.twice_nat) {
          ruleObj['twice-nat'] = {};
          if (isPresent(rule.twice_nat_address)) ruleObj['twice-nat'].address = String(rule.twice_nat_address);
        }
        staticRules[rule.rule_number] = ruleObj;
      }
      if (Object.keys(staticRules).length) result.static = { rule: staticRules };

      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('vpp nat44', true);
        config.value = nat44ToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp nat44');
        const payload = formToNat44(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp nat44', payload);
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

    function createPool() {
      editingPool.value = { name: '', translation_addresses: '', translation_interfaces: '', twice_nat_addresses: '', twice_nat_interfaces: '' };
      showPoolModal.value = true;
    }

    function editPool() {
      if (!selectedPools.value.length) return alert('请选择要编辑的地址池');
      const row = config.value.address_pools.find(p => p.name === selectedPools.value[0]);
      if (!row) return alert('未找到选中的地址池');
      editingPool.value = JSON.parse(JSON.stringify(row));
      showPoolModal.value = true;
    }

    function removePool() {
      if (!selectedPools.value.length) return alert('请选择要删除的地址池');
      config.value.address_pools = config.value.address_pools.filter(p => p.name !== selectedPools.value[0]);
      selectedPools.value = [];
    }

    function savePool() {
      if (!editingPool.value.name) return alert('请输入池名称');
      const list = config.value.address_pools;
      const idx = list.findIndex(p => p._name === editingPool.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingPool.value });
      else list.push({ ...editingPool.value });
      config.value.address_pools = list;
      showPoolModal.value = false;
    }

    function createExcludeRule() {
      editingExcludeRule.value = { rule_number: '', description: '', external_interface: '', local_address: '', local_port: '', protocol: 'all' };
      showExcludeRuleModal.value = true;
    }

    function editExcludeRule() {
      if (!selectedExcludeRules.value.length) return alert('请选择要编辑的规则');
      const row = config.value.exclude_rules.find(r => r.rule_number === selectedExcludeRules.value[0]);
      if (!row) return alert('未找到选中的规则');
      editingExcludeRule.value = JSON.parse(JSON.stringify(row));
      showExcludeRuleModal.value = true;
    }

    function removeExcludeRule() {
      if (!selectedExcludeRules.value.length) return alert('请选择要删除的规则');
      config.value.exclude_rules = config.value.exclude_rules.filter(r => r.rule_number !== selectedExcludeRules.value[0]);
      selectedExcludeRules.value = [];
    }

    function saveExcludeRule() {
      if (!editingExcludeRule.value.rule_number) return alert('请输入规则号');
      const list = config.value.exclude_rules;
      const idx = list.findIndex(r => r._rule_number === editingExcludeRule.value._rule_number);
      if (idx >= 0) list.splice(idx, 1, { ...editingExcludeRule.value });
      else list.push({ ...editingExcludeRule.value });
      config.value.exclude_rules = list;
      showExcludeRuleModal.value = false;
    }

    function createStaticRule() {
      editingStaticRule.value = { rule_number: '', description: '', protocol: 'all', local_address: '', local_port: '', external_address: '', external_port: '', out_to_in_only: false, self_twice_nat: false, twice_nat: false, twice_nat_address: '' };
      showStaticRuleModal.value = true;
    }

    function editStaticRule() {
      if (!selectedStaticRules.value.length) return alert('请选择要编辑的规则');
      const row = config.value.static_rules.find(r => r.rule_number === selectedStaticRules.value[0]);
      if (!row) return alert('未找到选中的规则');
      editingStaticRule.value = JSON.parse(JSON.stringify(row));
      showStaticRuleModal.value = true;
    }

    function removeStaticRule() {
      if (!selectedStaticRules.value.length) return alert('请选择要删除的规则');
      config.value.static_rules = config.value.static_rules.filter(r => r.rule_number !== selectedStaticRules.value[0]);
      selectedStaticRules.value = [];
    }

    function saveStaticRule() {
      if (!editingStaticRule.value.rule_number) return alert('请输入规则号');
      const list = config.value.static_rules;
      const idx = list.findIndex(r => r._rule_number === editingStaticRule.value._rule_number);
      if (idx >= 0) list.splice(idx, 1, { ...editingStaticRule.value });
      else list.push({ ...editingStaticRule.value });
      config.value.static_rules = list;
      showStaticRuleModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, activeTab, commandPath,
      poolColumns, excludeRuleColumns, staticRuleColumns,
      selectedPools, selectedExcludeRules, selectedStaticRules,
      showPoolModal, editingPool, showExcludeRuleModal, editingExcludeRule,
      showStaticRuleModal, editingStaticRule,
      load, save,
      createPool, editPool, removePool, savePool,
      createExcludeRule, editExcludeRule, removeExcludeRule, saveExcludeRule,
      createStaticRule, editStaticRule, removeStaticRule, saveStaticRule,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'address-pool', title: '地址池' },
        { key: 'exclude', title: '排除规则' },
        { key: 'interfaces', title: '接口' },
        { key: 'static', title: '静态规则' }
      ]">

      <template #address-pool>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPool">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPool" :disabled="!selectedPools.length || selectedPools.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePool" :disabled="!selectedPools.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="poolColumns" :data="config.address_pools" rowKey="name" :externalToolbar="true" @selection-change="selectedPools = $event" :selectable="true" />
      </template>

      <template #exclude>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createExcludeRule">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editExcludeRule" :disabled="!selectedExcludeRules.length || selectedExcludeRules.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeExcludeRule" :disabled="!selectedExcludeRules.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="excludeRuleColumns" :data="config.exclude_rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedExcludeRules = $event" :selectable="true" />
      </template>

      <template #interfaces>
        <div class="form-row"><label class="form-label">内部接口</label><textarea class="form-control" v-model="config.inside_interfaces" rows="3" placeholder="每行一个接口" title="NAT内部接口" /></div>
        <div class="form-row"><label class="form-label">外部接口</label><textarea class="form-control" v-model="config.outside_interfaces" rows="3" placeholder="每行一个接口" title="NAT外部接口" /></div>
      </template>

      <template #static>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createStaticRule">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editStaticRule" :disabled="!selectedStaticRules.length || selectedStaticRules.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeStaticRule" :disabled="!selectedStaticRules.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="staticRuleColumns" :data="config.static_rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedStaticRules = $event" :selectable="true" />
      </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showPoolModal" :title="editingPool && editingPool._name ? '编辑地址池' : '新建地址池'" @confirm="savePool" @close="showPoolModal = false" width="700px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingPool.name" :disabled="editingPool._name" title="地址池名称" /></div>
        <div class="form-row"><label class="form-label">翻译地址</label><textarea class="form-control" v-model="editingPool.translation_addresses" rows="3" placeholder="每行一个IPv4/范围" title="翻译地址" /></div>
        <div class="form-row"><label class="form-label">翻译接口</label><textarea class="form-control" v-model="editingPool.translation_interfaces" rows="2" placeholder="每行一个接口" title="翻译接口" /></div>
        <div class="form-row"><label class="form-label">Twice NAT地址</label><textarea class="form-control" v-model="editingPool.twice_nat_addresses" rows="2" placeholder="每行一个IPv4/范围" title="Twice NAT地址" /></div>
        <div class="form-row"><label class="form-label">Twice NAT接口</label><textarea class="form-control" v-model="editingPool.twice_nat_interfaces" rows="2" placeholder="每行一个接口" title="Twice NAT接口" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showExcludeRuleModal" :title="editingExcludeRule && editingExcludeRule._rule_number ? '编辑排除规则' : '新建排除规则'" @confirm="saveExcludeRule" @close="showExcludeRuleModal = false">
        <div class="form-row"><label class="form-label">规则号</label><input class="form-control" v-model="editingExcludeRule.rule_number" :disabled="editingExcludeRule._rule_number" title="规则编号" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingExcludeRule.description" title="规则描述" /></div>
        <div class="form-row"><label class="form-label">外部接口</label><input class="form-control" v-model="editingExcludeRule.external_interface" title="外部接口" /></div>
        <div class="form-row"><label class="form-label">本地地址</label><input class="form-control" v-model="editingExcludeRule.local_address" placeholder="x.x.x.x" title="本地IPv4地址" /></div>
        <div class="form-row"><label class="form-label">本地端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingExcludeRule.local_port" title="本地端口" /></div>
        <div class="form-row"><label class="form-label">协议</label>
          <select class="form-control" v-model="editingExcludeRule.protocol" title="协议">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
            <option value="all">All (默认)</option>
          </select>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showStaticRuleModal" :title="editingStaticRule && editingStaticRule._rule_number ? '编辑静态规则' : '新建静态规则'" @confirm="saveStaticRule" @close="showStaticRuleModal = false" width="700px">
        <div class="form-row"><label class="form-label">规则号</label><input class="form-control" v-model="editingStaticRule.rule_number" :disabled="editingStaticRule._rule_number" title="规则编号" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingStaticRule.description" title="规则描述" /></div>
        <div class="form-row"><label class="form-label">协议</label>
          <select class="form-control" v-model="editingStaticRule.protocol" title="协议">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
            <option value="all">All (默认)</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">本地地址</label><input class="form-control" v-model="editingStaticRule.local_address" placeholder="x.x.x.x" title="本地IPv4地址" /></div>
        <div class="form-row"><label class="form-label">本地端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingStaticRule.local_port" title="本地端口" /></div>
        <div class="form-row"><label class="form-label">外部地址</label><input class="form-control" v-model="editingStaticRule.external_address" placeholder="x.x.x.x" title="外部IPv4地址" /></div>
        <div class="form-row"><label class="form-label">外部端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingStaticRule.external_port" title="外部端口" /></div>
        <div class="form-row"><label class="form-label">仅Out-to-In</label><input type="checkbox" v-model="editingStaticRule.out_to_in_only" title="仅允许out-to-in方向" /></div>
        <div class="form-row"><label class="form-label">Self Twice NAT</label><input type="checkbox" v-model="editingStaticRule.self_twice_nat" title="Self twice NAT" /></div>
        <div class="form-row"><label class="form-label">Twice NAT</label><input type="checkbox" v-model="editingStaticRule.twice_nat" title="Twice NAT" /></div>
        <div class="form-row"><label class="form-label">Twice NAT地址</label><input class="form-control" v-model="editingStaticRule.twice_nat_address" placeholder="x.x.x.x" title="Twice NAT地址" /></div>
      </DraggableModal>
    </div>
  `,
});
