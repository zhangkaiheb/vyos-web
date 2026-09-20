import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { interfaceApi, firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const BASE_PROTOCOL_OPTIONS = [
  { value: 'all', label: 'all (default)' },
  { value: 'tcp_udp', label: 'tcp_udp' },
  { value: 'tcp', label: 'tcp' },
  { value: 'udp', label: 'udp' },
  { value: 'icmp', label: 'icmp' },
  { value: 'gre', label: 'gre' },
  { value: 'esp', label: 'esp' },
  { value: 'ah', label: 'ah' },
  { value: 'sctp', label: 'sctp' },
];

function emptyRule() {
  return {
    rule: '',
    protocol: 'all',
    fwmark: '',
    'inbound-interface': '',
    source: { address: '', port: '' },
    destination: { address: '', port: '' },
    set: { table: '' },
  };
}

function normalizeValue(val) {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

function configRulesToForm(raw) {
  const result = [];
  if (!raw || typeof raw !== 'object') return result;
  for (const [num, attrs] of Object.entries(raw)) {
    result.push({
      rule: num,
      protocol: attrs.protocol || 'all',
      fwmark: attrs.fwmark || '',
      'inbound-interface': attrs['inbound-interface'] || '',
      source: attrs.source ? {
        address: normalizeValue(attrs.source.address),
        port: attrs.source.port || '',
      } : { address: '', port: '' },
      destination: attrs.destination ? {
        address: normalizeValue(attrs.destination.address),
        port: attrs.destination.port || '',
      } : { address: '', port: '' },
      set: attrs.set ? {
        table: attrs.set.table || '',
      } : { table: '' },
    });
  }
  return result;
}

function formRuleToConfig(item) {
  const result = {};
  if (item.protocol && item.protocol !== 'all') result.protocol = item.protocol;
  if (item.fwmark) result.fwmark = String(item.fwmark);
  if (item['inbound-interface']) result['inbound-interface'] = item['inbound-interface'];

  const source = {};
  if (item.source?.address) source.address = item.source.address;
  if (item.source?.port) source.port = String(item.source.port);
  if (Object.keys(source).length) result.source = source;

  const destination = {};
  if (item.destination?.address) destination.address = item.destination.address;
  if (item.destination?.port) destination.port = String(item.destination.port);
  if (Object.keys(destination).length) result.destination = destination;

  const set = {};
  if (item.set?.table) set.table = item.set.table;
  if (Object.keys(set).length) result.set = set;

  return result;
}

function formatEndpoint(ep) {
  if (!ep || typeof ep !== 'object') return '';
  const parts = [];
  if (ep.address) parts.push(ep.address);
  if (ep.port) parts.push(`:${ep.port}`);
  return parts.join('') || '';
}

export default defineComponent({
  name: 'LocalRoutePage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const rules = ref([]);
    const interfaces = ref([]);
    const protocolOptions = ref([...BASE_PROTOCOL_OPTIONS]);
    const loading = ref(false);
    const selected = ref([]);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleOriginalNumber = ref('');
    const activeTab = ref('basic');
    const dataTableRef = ref(null);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const isIPv6 = computed(() => path.value.includes('local-route6'));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = computed(() => [
      { key: 'rule', title: t('localRoute.columns.rule') },
      { key: 'protocol', title: t('localRoute.columns.protocol') },
      { key: 'fwmark', title: 'fwmark' },
      { key: 'inbound-interface', title: t('localRoute.columns.inboundInterface') },
      { key: 'source', title: t('localRoute.columns.source') },
      { key: 'destination', title: t('localRoute.columns.destination') },
      { key: 'set_table', title: t('localRoute.columns.routingTable') },
    ]);

    const addressValidate = computed(() => isIPv6.value ? 'ipv6' : 'ip-segment');

    const basicSchema = computed(() => [
      { key: 'rule', title: t('localRoute.schema.rule'), type: 'number', min: 1, max: 32765, required: true, help: t('localRoute.schema.ruleHelp') },
      { key: 'protocol', title: t('localRoute.schema.protocol'), type: 'select', options: protocolOptions.value, default: 'all', help: t('localRoute.schema.protocolHelp') },
      { key: 'fwmark', title: 'fwmark', type: 'number', min: 1, max: 2147483647, help: t('localRoute.schema.fwmarkHelp') },
      { key: 'inbound-interface', title: t('localRoute.schema.inboundInterface'), type: 'select', options: interfaces.value },
    ]);

    const sourceDestinationSchema = computed(() => [
      {
        key: 'source', title: t('localRoute.schema.source'), type: 'group', children: [
          { key: 'address', title: t('localRoute.schema.address'), type: 'text', validate: addressValidate.value, placeholder: isIPv6.value ? t('localRoute.schema.ipv6AddressPlaceholder') : t('localRoute.schema.ipv4AddressPlaceholder'), help: isIPv6.value ? t('localRoute.schema.ipv6AddressHelp') : t('localRoute.schema.ipv4AddressHelp') },
          { key: 'port', title: t('localRoute.schema.port'), type: 'number', min: 1, max: 65535, help: t('localRoute.schema.portHelp') },
        ],
      },
      {
        key: 'destination', title: t('localRoute.schema.destination'), type: 'group', children: [
          { key: 'address', title: t('localRoute.schema.address'), type: 'text', validate: addressValidate.value, placeholder: isIPv6.value ? t('localRoute.schema.ipv6AddressPlaceholder') : t('localRoute.schema.ipv4AddressPlaceholder'), help: isIPv6.value ? t('localRoute.schema.ipv6AddressHelp') : t('localRoute.schema.ipv4AddressHelp') },
          { key: 'port', title: t('localRoute.schema.port'), type: 'number', min: 1, max: 65535, help: t('localRoute.schema.portHelp') },
        ],
      },
    ]);

    const setSchema = computed(() => [
      {
        key: 'set', title: t('localRoute.schema.set'), type: 'group', children: [
          { key: 'table', title: t('localRoute.schema.routingTable'), type: 'text', placeholder: t('localRoute.schema.routingTablePlaceholder'), help: t('localRoute.schema.routingTableHelp') },
        ],
      },
    ]);

    const tabSchemas = computed(() => ({
      basic: basicSchema.value.map(f => {
        if (f.key === 'inbound-interface') return { ...f, options: interfaces.value };
        if (f.key === 'protocol') return { ...f, options: protocolOptions.value };
        return f;
      }),
      source: sourceDestinationSchema.value,
      set: setSchema.value,
    }));

    const ruleTabs = computed(() => [
      { key: 'basic', title: t('localRoute.tabs.basic') },
      { key: 'source', title: t('localRoute.tabs.source') },
      { key: 'set', title: t('localRoute.tabs.set') },
    ]);

    const tableData = computed(() => {
      return rules.value.map(r => ({
        ...r,
        source: formatEndpoint(r.source),
        destination: formatEndpoint(r.destination),
        set_table: r.set?.table || '',
      }));
    });

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name || i).filter(Boolean);
      } catch (e) {
        interfaces.value = [];
      }
    }

    async function loadProtocols() {
      try {
        const res = await firewallApi.protocols();
        const list = (res.protocols || []).map(p => ({ value: p.name, label: `${p.name} (${p.number})` }));
        protocolOptions.value = [{ value: 'all', label: t('localRoute.protocol.allDefault') }, ...list];
      } catch (e) {
        protocolOptions.value = [...BASE_PROTOCOL_OPTIONS];
      }
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(`${path.value} rule`, true);
        rules.value = configRulesToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      loadInterfaces();
      loadProtocols();
      window.addEventListener('config-committed', load);
    });
    watch(() => route.path, () => { load(); loadInterfaces(); loadProtocols(); });

    function createRule() {
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function editRule() {
      if (!selected.value.length) return showError({ message: t('localRoute.messages.selectRow') });
      const row = rules.value.find(r => String(r.rule) === String(selected.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function removeRule() {
      if (!selected.value.length) return showError({ message: t('localRoute.messages.selectRow') });
      pendingDeleteNames.value = [...selected.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      for (const num of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} rule ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return t('localRoute.validation.ruleRequired');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 32765) return t('localRoute.validation.ruleRange');
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      const original = editingRuleOriginalNumber.value;
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} rule ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} rule ${editingRule.value.rule}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    const commandText = computed(() => {
      const cfg = {};
      for (const r of rules.value) {
        cfg[r.rule] = formRuleToConfig(r);
      }
      if (!Object.keys(cfg).length) return '';
      return `set ${path.value}\n` + JSON.stringify(cfg, null, 2);
    });

    return {
      rules, tableData, loading, selected, modalVisible, editingRule,
      editingRuleOriginalNumber, activeTab, dataTableRef, columns,
      tabSchemas, ruleTabs, writeDisabled, commandText,
      deleteModalVisible, pendingDeleteNames,
      load, createRule, editRule, removeRule, confirmRemove, saveRule, t,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled">{{ t('localRoute.buttons.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selected.length || selected.length > 1">{{ t('localRoute.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selected.length">{{ t('localRoute.buttons.delete') }}</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">{{ t('localRoute.buttons.refresh') }}</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :columns="columns" :data="tableData" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" row-key="rule">
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingRule?.rule ? t('localRoute.modals.editRule') : t('localRoute.modals.createRule')" width="780px" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #source>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #set>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.set" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('localRoute.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemove">
        <div>{{ t('localRoute.messages.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteNames" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
