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

const BASE_PROTOCOL_OPTIONS = [
  { value: 'all', label: 'all (默认)' },
  { value: 'tcp_udp', label: 'tcp_udp' },
  { value: 'tcp', label: 'tcp' },
  { value: 'udp', label: 'udp' },
  { value: 'icmp', label: 'icmp' },
  { value: 'gre', label: 'gre' },
  { value: 'esp', label: 'esp' },
  { value: 'ah', label: 'ah' },
  { value: 'sctp', label: 'sctp' },
];

const RULE_TABS = [
  { key: 'basic', title: '基本' },
  { key: 'source', title: '源/目的' },
  { key: 'set', title: '设置' },
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

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const isIPv6 = computed(() => path.value.includes('local-route6'));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'rule', title: '规则编号' },
      { key: 'protocol', title: '协议' },
      { key: 'fwmark', title: 'fwmark' },
      { key: 'inbound-interface', title: '入接口' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'set_table', title: '路由表' },
    ];

    const addressValidate = computed(() => isIPv6.value ? 'ipv6' : 'ip-segment');

    const basicSchema = [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 32765, required: true, help: '范围 1-32765' },
      { key: 'protocol', title: '协议', type: 'select', options: protocolOptions.value, default: 'all', help: '默认 all' },
      { key: 'fwmark', title: 'fwmark', type: 'number', min: 1, max: 2147483647, help: '范围 1-2147483647' },
      { key: 'inbound-interface', title: '入接口', type: 'select', options: interfaces.value },
    ];

    const sourceDestinationSchema = [
      {
        key: 'source', title: '源', type: 'group', children: [
          { key: 'address', title: '地址', type: 'text', validate: addressValidate.value, placeholder: isIPv6.value ? 'IPv6 地址或前缀' : 'IP 地址或前缀，可 ! 排除', help: isIPv6.value ? 'IPv6 地址或前缀' : '可前缀 ! 表示排除' },
          { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, help: '范围 1-65535，仅单个端口' },
        ],
      },
      {
        key: 'destination', title: '目的', type: 'group', children: [
          { key: 'address', title: '地址', type: 'text', validate: addressValidate.value, placeholder: isIPv6.value ? 'IPv6 地址或前缀' : 'IP 地址或前缀，可 ! 排除', help: isIPv6.value ? 'IPv6 地址或前缀' : '可前缀 ! 表示排除' },
          { key: 'port', title: '端口', type: 'number', min: 1, max: 65535, help: '范围 1-65535，仅单个端口' },
        ],
      },
    ];

    const setSchema = [
      {
        key: 'set', title: '设置', type: 'group', children: [
          { key: 'table', title: '路由表', type: 'text', placeholder: '1-200 或 main', help: '1-200 或 main' },
        ],
      },
    ];

    const tabSchemas = computed(() => ({
      basic: basicSchema.map(f => {
        if (f.key === 'inbound-interface') return { ...f, options: interfaces.value };
        if (f.key === 'protocol') return { ...f, options: protocolOptions.value };
        return f;
      }),
      source: sourceDestinationSchema,
      set: setSchema,
    }));

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
        protocolOptions.value = [{ value: 'all', label: 'all (默认)' }, ...list];
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
      loadInterfaces();
      loadProtocols();
    });
    watch(() => route.path, () => { load(); loadInterfaces(); loadProtocols(); });

    function createRule() {
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function editRule() {
      if (!selected.value.length) return alert('请选择一行');
      const row = rules.value.find(r => String(r.rule) === String(selected.value[0]));
      if (!row) return;
      editingRule.value = JSON.parse(JSON.stringify(row));
      editingRuleOriginalNumber.value = row.rule;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function removeRule() {
      if (!selected.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的规则？')) return;
      for (const num of selected.value) {
        await configStore.deleteConfig(`${path.value} rule ${num}`);
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return '请输入规则编号';
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 32765) return '规则编号范围 1-32765';
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return alert(err);
      const original = editingRuleOriginalNumber.value;
      const value = formRuleToConfig(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} rule ${original}`);
        }
        await configStore.setConfig(`${path.value} rule ${editingRule.value.rule}`, value);
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
      tabSchemas, RULE_TABS, writeDisabled, commandText,
      load, createRule, editRule, removeRule, saveRule,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selected.length || selected.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selected.length">删除</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :columns="columns" :data="tableData" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" row-key="rule">
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingRule?.rule ? '编辑本地策略路由规则' : '创建本地策略路由规则'" width="780px" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="RULE_TABS">
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
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
