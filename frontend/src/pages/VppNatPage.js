import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
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
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);
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

    const ruleColumns = computed(() => [
      { key: 'rule_number', title: t('vppNat.ruleNumber'), dataIndex: 'rule_number', width: 100 },
      { key: 'description', title: t('vppNat.description'), dataIndex: 'description', width: 200 },
      { key: 'inside_prefix', title: t('vppNat.insidePrefix'), dataIndex: 'inside_prefix', width: 150 },
      { key: 'outside_prefix', title: t('vppNat.outsidePrefix'), dataIndex: 'outside_prefix', width: 150 },
      { key: 'actions', title: t('vppNat.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

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
      try {
        const res = await configApi.get('vpp nat', true);
        config.value = natToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('vppNat.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('vpp nat');
        const payload = formToNat(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('vpp nat', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('vppNat.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createRule() {
      editingRule.value = { rule_number: '', description: '', inside_prefix: '', outside_prefix: '' };
      showRuleModal.value = true;
    }

    function editRule() {
      if (!selectedRules.value.length) return showError({ message: t('vppNat.selectRuleToEdit') });
      const row = config.value.rules.find(r => r.rule_number === selectedRules.value[0]);
      if (!row) return showError({ message: t('vppNat.ruleNotFound') });
      editingRule.value = JSON.parse(JSON.stringify(row));
      showRuleModal.value = true;
    }

    function removeRule() {
      if (!selectedRules.value.length) return showError({ message: t('vppNat.selectRuleToDelete') });
      config.value.rules = config.value.rules.filter(r => r.rule_number !== selectedRules.value[0]);
      selectedRules.value = [];
    }

    function saveRule() {
      if (!editingRule.value.rule_number) return showError({ message: t('vppNat.enterRuleNumber') });
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
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
      ruleColumns, selectedRules, showRuleModal, editingRule,
      load, save,
      createRule, editRule, removeRule, saveRule,
    };
  },template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'cgnat', title: 'CGNAT' }
      ]">

      <template #cgnat>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.insideInterfaces') }}</label><textarea class="form-control" v-model="config.inside_interfaces" rows="3" :placeholder="$t('vppNat.insideInterfacesPlaceholder')" :title="$t('vppNat.insideInterfacesTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.outsideInterfaces') }}</label><textarea class="form-control" v-model="config.outside_interfaces" rows="3" :placeholder="$t('vppNat.outsideInterfacesPlaceholder')" :title="$t('vppNat.outsideInterfacesTitle')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ $t('vppNat.rules') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createRule">{{ $t('vppNat.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRule" :disabled="!selectedRules.length || selectedRules.length > 1">{{ $t('vppNat.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRule" :disabled="!selectedRules.length">{{ $t('vppNat.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ruleColumns" :data="config.rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedRules = $event" :selectable="true" />

        <div style="font-weight:bold;margin:16px 0 8px;">{{ $t('vppNat.timeoutSettings') }}</div>
        <div class="form-row"><label class="form-label">ICMP</label><input class="form-control" type="number" v-model="config.timeouts.icmp" :title="$t('vppNat.icmpTimeoutTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.tcpEstablished') }}</label><input class="form-control" type="number" v-model="config.timeouts.tcp_established" :title="$t('vppNat.tcpEstablishedTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.tcpTransitory') }}</label><input class="form-control" type="number" v-model="config.timeouts.tcp_transitory" :title="$t('vppNat.tcpTransitoryTitle')" /></div>
        <div class="form-row"><label class="form-label">UDP</label><input class="form-control" type="number" v-model="config.timeouts.udp" :title="$t('vppNat.udpTimeoutTitle')" /></div>
      </template>
      </TabGroup>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" @click="save" :disabled="saving || loading">{{ saving ? $t('vppNat.saving') : $t('vppNat.confirm') }}</ToolbarButton>
        </div>
      </div>

      <DraggableModal v-model:visible="showRuleModal" :title="editingRule && editingRule._rule_number ? $t('vppNat.editRule') : $t('vppNat.createRule')" @confirm="saveRule" @close="showRuleModal = false">
        <div class="form-row"><label class="form-label">{{ $t('vppNat.ruleNumber') }}</label><input class="form-control" v-model="editingRule.rule_number" :disabled="editingRule._rule_number" :title="$t('vppNat.ruleNumberTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.description') }}</label><input class="form-control" v-model="editingRule.description" :title="$t('vppNat.descriptionTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.insidePrefix') }}</label><input class="form-control" v-model="editingRule.inside_prefix" placeholder="x.x.x.x/x" :title="$t('vppNat.insidePrefixTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('vppNat.outsidePrefix') }}</label><input class="form-control" v-model="editingRule.outside_prefix" placeholder="x.x.x.x/x" :title="$t('vppNat.outsidePrefixTitle')" /></div>
      </DraggableModal>
    </div>
  `,
});
