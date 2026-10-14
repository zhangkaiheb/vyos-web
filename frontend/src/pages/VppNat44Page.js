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
import { useI18n } from '/src/i18n/index.js';

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
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('address-pool');

    const config = ref({
      address_pools: [],
      exclude_rules: [],
      inside_interfaces: '',
      outside_interfaces: '',
      static_rules: [],
    });

    const poolColumns = [
      { key: 'name', title: t('nat44.columns.name'), dataIndex: 'name', width: 120 },
      { key: 'translation_addresses', title: t('nat44.columns.translationAddresses'), dataIndex: 'translation_addresses', width: 200 },
      { key: 'translation_interfaces', title: t('nat44.columns.translationInterfaces'), dataIndex: 'translation_interfaces', width: 150 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const excludeRuleColumns = [
      { key: 'rule_number', title: t('nat44.columns.ruleNumber'), dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: t('nat44.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'external_interface', title: t('nat44.columns.externalInterface'), dataIndex: 'external_interface', width: 120 },
      { key: 'local_address', title: t('nat44.columns.localAddress'), dataIndex: 'local_address', width: 120 },
      { key: 'local_port', title: t('nat44.columns.localPort'), dataIndex: 'local_port', width: 80 },
      { key: 'protocol', title: t('nat44.columns.protocol'), dataIndex: 'protocol', width: 80 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const staticRuleColumns = [
      { key: 'rule_number', title: t('nat44.columns.ruleNumber'), dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: t('nat44.columns.description'), dataIndex: 'description', width: 150 },
      { key: 'protocol', title: t('nat44.columns.protocol'), dataIndex: 'protocol', width: 80 },
      { key: 'local_address', title: t('nat44.columns.localAddress'), dataIndex: 'local_address', width: 120 },
      { key: 'external_address', title: t('nat44.columns.externalAddress'), dataIndex: 'external_address', width: 120 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
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
      try {
        const res = await configApi.get('vpp nat44', true);
        config.value = nat44ToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('app.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('vpp nat44');
        const payload = formToNat44(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('vpp nat44', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('app.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createPool() {
      editingPool.value = { name: '', translation_addresses: '', translation_interfaces: '', twice_nat_addresses: '', twice_nat_interfaces: '' };
      showPoolModal.value = true;
    }

    function editPool() {
      if (!selectedPools.value.length) return showError({ message: t('nat44.selectPoolFirst') });
      const row = config.value.address_pools.find(p => p.name === selectedPools.value[0]);
      if (!row) return showError({ message: t('nat44.poolNotFound') });
      editingPool.value = JSON.parse(JSON.stringify(row));
      showPoolModal.value = true;
    }

    function removePool() {
      if (!selectedPools.value.length) return showError({ message: t('nat44.selectPoolFirst') });
      config.value.address_pools = config.value.address_pools.filter(p => p.name !== selectedPools.value[0]);
      selectedPools.value = [];
    }

    function savePool() {
      if (!editingPool.value.name) return showError({ message: t('nat44.nameRequired') });
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
      if (!selectedExcludeRules.value.length) return showError({ message: t('nat44.selectRuleFirst') });
      const row = config.value.exclude_rules.find(r => r.rule_number === selectedExcludeRules.value[0]);
      if (!row) return showError({ message: t('nat44.ruleNotFound') });
      editingExcludeRule.value = JSON.parse(JSON.stringify(row));
      showExcludeRuleModal.value = true;
    }

    function removeExcludeRule() {
      if (!selectedExcludeRules.value.length) return showError({ message: t('nat44.selectRuleFirst') });
      config.value.exclude_rules = config.value.exclude_rules.filter(r => r.rule_number !== selectedExcludeRules.value[0]);
      selectedExcludeRules.value = [];
    }

    function saveExcludeRule() {
      if (!editingExcludeRule.value.rule_number) return showError({ message: t('nat44.ruleNumberRequired') });
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
      if (!selectedStaticRules.value.length) return showError({ message: t('nat44.selectRuleFirst') });
      const row = config.value.static_rules.find(r => r.rule_number === selectedStaticRules.value[0]);
      if (!row) return showError({ message: t('nat44.ruleNotFound') });
      editingStaticRule.value = JSON.parse(JSON.stringify(row));
      showStaticRuleModal.value = true;
    }

    function removeStaticRule() {
      if (!selectedStaticRules.value.length) return showError({ message: t('nat44.selectRuleFirst') });
      config.value.static_rules = config.value.static_rules.filter(r => r.rule_number !== selectedStaticRules.value[0]);
      selectedStaticRules.value = [];
    }

    function saveStaticRule() {
      if (!editingStaticRule.value.rule_number) return showError({ message: t('nat44.ruleNumberRequired') });
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
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
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
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'address-pool', title: t('nat44.tabs.addressPool') },
        { key: 'exclude', title: t('nat44.tabs.excludeRules') },
        { key: 'interfaces', title: t('nat44.tabs.interfaces') },
        { key: 'static', title: t('nat44.tabs.staticRules') }
      ]">

      <template #address-pool>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPool">{{ t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPool" :disabled="!selectedPools.length || selectedPools.length > 1">{{ t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePool" :disabled="!selectedPools.length">{{ t('app.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="poolColumns" :data="config.address_pools" rowKey="name" :externalToolbar="true" @selection-change="selectedPools = $event" :selectable="true" />
      </template>

      <template #exclude>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createExcludeRule">{{ t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editExcludeRule" :disabled="!selectedExcludeRules.length || selectedExcludeRules.length > 1">{{ t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeExcludeRule" :disabled="!selectedExcludeRules.length">{{ t('app.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="excludeRuleColumns" :data="config.exclude_rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedExcludeRules = $event" :selectable="true" />
      </template>

      <template #interfaces>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.insideInterface') }}</label><textarea class="form-control" v-model="config.inside_interfaces" rows="3" :placeholder="t('nat44.placeholder.onePerLine')" :title="t('nat44.form.insideInterface')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.outsideInterface') }}</label><textarea class="form-control" v-model="config.outside_interfaces" rows="3" :placeholder="t('nat44.placeholder.onePerLine')" :title="t('nat44.form.outsideInterface')" /></div>
      </template>

      <template #static>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createStaticRule">{{ t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editStaticRule" :disabled="!selectedStaticRules.length || selectedStaticRules.length > 1">{{ t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeStaticRule" :disabled="!selectedStaticRules.length">{{ t('app.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="staticRuleColumns" :data="config.static_rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedStaticRules = $event" :selectable="true" />
      </template>
      </TabGroup>

      <div v-if="activeTab === 'interfaces'" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || loading">{{ saving ? t('app.loading') : t('app.confirm') }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showPoolModal" :title="editingPool && editingPool._name ? t('nat44.modal.editPool') : t('nat44.modal.createPool')" @confirm="savePool" @close="showPoolModal = false" width="700px">
        <div class="form-row"><label class="form-label">{{ t('nat44.form.name') }}</label><input class="form-control" v-model="editingPool.name" :disabled="editingPool._name" :title="t('nat44.form.name')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.translationAddresses') }}</label><textarea class="form-control" v-model="editingPool.translation_addresses" rows="3" :placeholder="t('nat44.placeholder.ipv4Range')" :title="t('nat44.form.translationAddresses')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.translationInterfaces') }}</label><textarea class="form-control" v-model="editingPool.translation_interfaces" rows="2" :placeholder="t('nat44.placeholder.onePerLine')" :title="t('nat44.form.translationInterfaces')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.twiceNatAddresses') }}</label><textarea class="form-control" v-model="editingPool.twice_nat_addresses" rows="2" :placeholder="t('nat44.placeholder.ipv4Range')" :title="t('nat44.form.twiceNatAddresses')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.twiceNatInterfaces') }}</label><textarea class="form-control" v-model="editingPool.twice_nat_interfaces" rows="2" :placeholder="t('nat44.placeholder.onePerLine')" :title="t('nat44.form.twiceNatInterfaces')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showExcludeRuleModal" :title="editingExcludeRule && editingExcludeRule._rule_number ? t('nat44.modal.editExcludeRule') : t('nat44.modal.createExcludeRule')" @confirm="saveExcludeRule" @close="showExcludeRuleModal = false">
        <div class="form-row"><label class="form-label">{{ t('nat44.form.ruleNumber') }}</label><input class="form-control" v-model="editingExcludeRule.rule_number" :disabled="editingExcludeRule._rule_number" :title="t('nat44.form.ruleNumber')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.description') }}</label><input class="form-control" v-model="editingExcludeRule.description" :title="t('nat44.form.description')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.externalInterface') }}</label><input class="form-control" v-model="editingExcludeRule.external_interface" :title="t('nat44.form.externalInterface')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.localAddress') }}</label><input class="form-control" v-model="editingExcludeRule.local_address" placeholder="x.x.x.x" :title="t('nat44.form.localAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.localPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingExcludeRule.local_port" :title="t('nat44.form.localPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.protocol') }}</label>
          <select class="form-control" v-model="editingExcludeRule.protocol" :title="t('nat44.form.protocol')">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
            <option value="all">{{ t('nat44.protocol.all') }}</option>
          </select>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showStaticRuleModal" :title="editingStaticRule && editingStaticRule._rule_number ? t('nat44.modal.editStaticRule') : t('nat44.modal.createStaticRule')" @confirm="saveStaticRule" @close="showStaticRuleModal = false" width="700px">
        <div class="form-row"><label class="form-label">{{ t('nat44.form.ruleNumber') }}</label><input class="form-control" v-model="editingStaticRule.rule_number" :disabled="editingStaticRule._rule_number" :title="t('nat44.form.ruleNumber')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.description') }}</label><input class="form-control" v-model="editingStaticRule.description" :title="t('nat44.form.description')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.protocol') }}</label>
          <select class="form-control" v-model="editingStaticRule.protocol" :title="t('nat44.form.protocol')">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
            <option value="all">{{ t('nat44.protocol.all') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.localAddress') }}</label><input class="form-control" v-model="editingStaticRule.local_address" placeholder="x.x.x.x" :title="t('nat44.form.localAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.localPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingStaticRule.local_port" :title="t('nat44.form.localPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.externalAddress') }}</label><input class="form-control" v-model="editingStaticRule.external_address" placeholder="x.x.x.x" :title="t('nat44.form.externalAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.externalPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingStaticRule.external_port" :title="t('nat44.form.externalPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.outToInOnly') }}</label><input type="checkbox" v-model="editingStaticRule.out_to_in_only" :title="t('nat44.form.outToInOnly')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.selfTwiceNat') }}</label><input type="checkbox" v-model="editingStaticRule.self_twice_nat" :title="t('nat44.form.selfTwiceNat')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.twiceNat') }}</label><input type="checkbox" v-model="editingStaticRule.twice_nat" :title="t('nat44.form.twiceNat')" /></div>
        <div class="form-row"><label class="form-label">{{ t('nat44.form.twiceNatAddress') }}</label><input class="form-control" v-model="editingStaticRule.twice_nat_address" placeholder="x.x.x.x" :title="t('nat44.form.twiceNatAddress')" /></div>
      </DraggableModal>
    </div>
  `,
});
