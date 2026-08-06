import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import SourceDestMatchCards from '/src/components/Form/SourceDestMatchCards.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const PACKET_TYPE_OPTIONS = [
  { value: 'broadcast', label: 'broadcast' },
  { value: 'host', label: 'host' },
  { value: 'multicast', label: 'multicast' },
  { value: 'other', label: 'other' },
];

const TRANSLATION_ADDRESS_OPTIONS = [
  { value: 'masquerade', label: 'masquerade' },
];

const ADDRESS_MAPPING_OPTIONS = [
  { value: 'persistent', label: 'persistent' },
  { value: 'random', label: 'random' },
];

const PORT_MAPPING_OPTIONS = [
  { value: 'random', label: 'random' },
  { value: 'none', label: 'none' },
];

const GROUP_TYPE_OPTIONS = [
  { value: 'address', label: '地 址' },
  { value: 'address-group', label: '地址组' },
  { value: 'network-group', label: '网络组' },
  { value: 'domain-group', label: '域名组' },
];

export default defineComponent({
  name: 'SourceNatPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat source';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const modalKey = ref(0);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);

    // Dynamic options
    const interfaces = ref([]);
    const interfaceGroups = ref([]);
    const addressGroups = ref([]);
    const networkGroups = ref([]);
    const portGroups = ref([]);
    const domainGroups = ref([]);
    const macGroups = ref([]);
    const protocols = ref([]);

    const tabs = [
      { key: 'basic', title: '基本' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'outbound', title: '出站接口' },
      { key: 'translation', title: '翻译' },
    ];
    const activeTab = ref('basic');

    const tabSchemas = computed(() => ({
      basic: [
        { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
        { key: 'description', title: '描述', type: 'text', help: '规则描述信息' },
        { key: 'protocol', title: '协议', type: 'select', help: '匹配的协议类型（默认: all）',
          options: protocols.value.length ? protocols.value.map(p => ({ value: p, label: p })) : [] },
        { key: 'packetType', title: '包类型', type: 'select', help: '数据包类型',
          options: PACKET_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
        { key: 'log', title: '日志', type: 'checkbox', defaultValue: false, help: '记录匹配此规则的数据包' },
        { key: 'exclude', title: '排除', type: 'checkbox', defaultValue: false, help: '排除匹配此规则的数据包' },
        { key: 'disable', title: '禁用', type: 'checkbox', defaultValue: false, help: '禁用此规则' },
      ],
      source: [
        { key: 'sourcePort', title: '端口', type: 'text', placeholder: '端口号/范围', help: '范围: 1-65535，支持端口范围如 1024-65535' },
      ],
      destination: [
        { key: 'destinationPort', title: '端口', type: 'text', placeholder: '端口号/范围', help: '范围: 1-65535，支持端口范围如 80-443' },
      ],
      outbound: [
        { key: 'outboundInterfaceName', title: '接口名称', type: 'select', help: '出站接口名称',
          options: ['any', ...interfaces.value].map(n => ({ value: n, label: n })) },
        { key: 'outboundInterfaceGroup', title: '接口组', type: 'select', help: '接口组名称',
          options: interfaceGroups.value.map(g => ({ value: g, label: g })) },
      ],
      translation: [
        { key: 'translationAddress', title: '翻译地址', type: 'text', placeholder: 'IP地址/网段/地址范围', help: '支持 x.x.x.x, x.x.x.x/x, x.x.x.x-x.x.x.x' },
        { key: 'translationMasquerade', title: 'Masquerade', type: 'checkbox', defaultValue: false, help: 'NAT 到出站接口的主地址' },
        { key: 'translationPort', title: '翻译端口', type: 'text', placeholder: '端口号或范围', help: '范围: 1-65535，支持端口范围如 1001-1005' },
        { key: 'translationAddressMapping', title: '地址映射', type: 'select', help: '地址映射方式（默认: random）',
          options: ADDRESS_MAPPING_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
        { key: 'translationPortMapping', title: '端口映射', type: 'select', help: '端口映射方式（默认: none）',
          options: PORT_MAPPING_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
      ],
    }));

    const columns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'protocol', title: '协议' },
      { key: 'sourceValue', title: '源地址' },
      { key: 'destinationValue', title: '目的地址' },
      { key: 'outboundInterfaceName', title: '出站接口' },
      { key: 'translationAddress', title: '翻译地址' },
      { key: 'log', title: '日志' },
      { key: 'disable', title: '禁用' },
    ];

    async function loadDynamicOptions() {
      const fetchSuggestions = async (path, field) => {
        try {
          const res = await configApi.suggestions(path, field);
          return (res.suggestions || []).filter(Boolean);
        } catch (e) {
          return [];
        }
      };

      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name || i).filter(Boolean);
      } catch (e) {
        interfaces.value = [];
      }

      const [
        ifGroups, protos
      ] = await Promise.all([
        fetchSuggestions('nat source rule 1 outbound-interface', 'group'),
        fetchSuggestions('nat source rule 1', 'protocol'),
      ]);

      // Fetch firewall groups directly from config
      let addrGroups = [], netGroups = [], prtGroups = [], domGroups = [], macGrps = [];
      try {
        const groupResp = await configApi.get('firewall group');
        if (groupResp.success && groupResp.data) {
          const gd = groupResp.data;
          if (gd['address-group']) addrGroups = Object.keys(gd['address-group']);
          if (gd['network-group']) netGroups = Object.keys(gd['network-group']);
          if (gd['port-group']) prtGroups = Object.keys(gd['port-group']);
          if (gd['domain-group']) domGroups = Object.keys(gd['domain-group']);
          if (gd['mac-group']) macGrps = Object.keys(gd['mac-group']);
        }
      } catch (e) {
        // fallback to suggestions
        [addrGroups, netGroups, prtGroups, domGroups, macGrps] = await Promise.all([
          fetchSuggestions('firewall group', 'address-group'),
          fetchSuggestions('firewall group', 'network-group'),
          fetchSuggestions('firewall group', 'port-group'),
          fetchSuggestions('firewall group', 'domain-group'),
          fetchSuggestions('firewall group', 'mac-group'),
        ]);
      }

      interfaceGroups.value = ifGroups;
      addressGroups.value = addrGroups;
      networkGroups.value = netGroups;
      portGroups.value = prtGroups;
      domainGroups.value = domGroups;
      macGroups.value = macGrps;
      protocols.value = protos;
    }

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => ({
            id: parseInt(id) || id,
            ...flattenRule(attrs),
          }));
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });
        }
      } catch (e) {
        showError('加载源 NAT 配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    function flattenRule(attrs) {
      const rule = {};
      if (attrs.description) rule.description = attrs.description;
      if (attrs.disable) rule.disable = true;
      if (attrs.exclude) rule.exclude = true;
      if (attrs.log) rule.log = true;
      if (attrs['packet-type']) rule.packetType = attrs['packet-type'];
      if (attrs.protocol) rule.protocol = attrs.protocol;

      const src = attrs.source || {};
      rule.sourceGroupType = 'address';
      rule.sourceValue = '';
      rule.sourceGroupValue = '';
      if (src.address) { rule.sourceValue = src.address; }
      if (src.group) {
        const g = src.group;
        if (g['address-group']) { rule.sourceGroupType = 'address-group'; rule.sourceGroupValue = g['address-group']; }
        else if (g['network-group']) { rule.sourceGroupType = 'network-group'; rule.sourceGroupValue = g['network-group']; }
        else if (g['domain-group']) { rule.sourceGroupType = 'domain-group'; rule.sourceGroupValue = g['domain-group']; }
        if (g['mac-group']) rule.sourceMacValue = g['mac-group'];
      }
      if (src.port) rule.sourcePort = src.port;

      const dst = attrs.destination || {};
      rule.destinationGroupType = 'address';
      rule.destinationValue = '';
      rule.destinationGroupValue = '';
      if (dst.address) { rule.destinationValue = dst.address; }
      if (dst.group) {
        const g = dst.group;
        if (g['address-group']) { rule.destinationGroupType = 'address-group'; rule.destinationGroupValue = g['address-group']; }
        else if (g['network-group']) { rule.destinationGroupType = 'network-group'; rule.destinationGroupValue = g['network-group']; }
        else if (g['domain-group']) { rule.destinationGroupType = 'domain-group'; rule.destinationGroupValue = g['domain-group']; }
        if (g['mac-group']) rule.destinationMacValue = g['mac-group'];
        if (g['port-group']) rule.destinationPortGroup = g['port-group'];
      }
      if (dst.port) rule.destinationPort = dst.port;

      const trans = attrs.translation || {};
      if (trans.address) {
        if (trans.address === 'masquerade') {
          rule.translationMasquerade = true;
        } else {
          rule.translationAddress = trans.address;
        }
      }
      if (trans.port) rule.translationPort = trans.port;
      if (trans.options) {
        const opts = trans.options;
        if (opts['address-mapping']) rule.translationAddressMapping = Object.keys(opts['address-mapping'])[0] || 'random';
        if (opts['port-mapping']) rule.translationPortMapping = Object.keys(opts['port-mapping'])[0] || 'random';
      }

      if (attrs['outbound-interface']) {
        const oi = attrs['outbound-interface'];
        rule.outboundInterfaceName = oi.name || '';
        rule.outboundInterfaceGroup = oi.group || '';
      }

      return rule;
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.disable) value.disable = '';
      if (rule.exclude) value.exclude = '';
      if (rule.log) value.log = '';
      if (rule.packetType) value['packet-type'] = rule.packetType;
      if (rule.protocol && rule.protocol !== 'all') value.protocol = rule.protocol;

      const src = {};
      const srcType = rule.sourceGroupType || 'address';
      if (srcType === 'address') {
        if (rule.sourceValue) src.address = rule.sourceValue;
      } else {
        const group = {};
        group[srcType] = rule.sourceGroupValue;
        src.group = group;
      }
      if (rule.sourceMacValue) {
        if (!src.group) src.group = {};
        src.group['mac-group'] = rule.sourceMacValue;
      }
      if (rule.sourcePort) src.port = rule.sourcePort;
      if (Object.keys(src).length) value.source = src;

      const dst = {};
      const dstType = rule.destinationGroupType || 'address';
      if (dstType === 'address') {
        if (rule.destinationValue) dst.address = rule.destinationValue;
      } else {
        const group = {};
        group[dstType] = rule.destinationGroupValue;
        dst.group = group;
      }
      if (rule.destinationMacValue) {
        if (!dst.group) dst.group = {};
        dst.group['mac-group'] = rule.destinationMacValue;
      }
      if (rule.destinationPortGroup) {
        if (!dst.group) dst.group = {};
        dst.group['port-group'] = rule.destinationPortGroup;
      }
      if (rule.destinationPort) dst.port = rule.destinationPort;
      if (Object.keys(dst).length) value.destination = dst;

      const trans = {};
      if (rule.translationMasquerade) {
        trans.address = 'masquerade';
      } else if (rule.translationAddress) {
        trans.address = rule.translationAddress;
      }
      if (rule.translationPort) trans.port = rule.translationPort;
      const transOptions = {};
      if (rule.translationAddressMapping) transOptions['address-mapping'] = { [rule.translationAddressMapping]: '' };
      if (rule.translationPortMapping) transOptions['port-mapping'] = { [rule.translationPortMapping]: '' };
      if (Object.keys(transOptions).length) trans.options = transOptions;
      if (Object.keys(trans).length) value.translation = trans;

      if (rule.outboundInterfaceName || rule.outboundInterfaceGroup) {
        const iface = {};
        if (rule.outboundInterfaceName) iface.name = rule.outboundInterfaceName;
        if (rule.outboundInterfaceGroup) iface.group = rule.outboundInterfaceGroup;
        value['outbound-interface'] = iface;
      }

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = {
          id: 1,
          sourceGroupType: 'address',
          sourceValue: '',
          sourceMacValue: '',
          destinationGroupType: 'address',
          destinationValue: '',
          destinationMacValue: '',
        };
        editingOriginalId.value = null;
      }
      modalKey.value++;
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: '请输入规则编号' });

        const portFields = ['sourcePort', 'destinationPort', 'translationPort'];
        for (const field of portFields) {
          if (rule[field] && rule.protocol && !['tcp', 'udp', 'tcp_udp'].includes(rule.protocol)) {
            return showError({ message: '端口只能在协议为 tcp、udp 或 tcp_udp 时指定' });
          }
        }

        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError('保存源 NAT 规则失败', e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      if (!confirm('确认删除此源 NAT 规则？')) return;
      try {
        await configStore.deleteConfig(`${path} rule ${row.id}`);
        await load();
      } catch (e) {
        showError('删除源 NAT 规则失败', e);
      }
    }

    // Update sourceValue options when sourceGroupType changes
    function handleSourceTypeChange(newType) {
      if (editingRule.value) {
        editingRule.value.sourceGroupType = newType;
        editingRule.value.sourceValue = '';
        editingRule.value.sourceGroupValue = '';
      }
    }

    function handleDestinationTypeChange(newType) {
      if (editingRule.value) {
        editingRule.value.destinationGroupType = newType;
        editingRule.value.destinationValue = '';
        editingRule.value.destinationGroupValue = '';
      }
    }

    onMounted(() => { load(); loadDynamicOptions(); });
    watch(() => route.path, () => { load(); loadDynamicOptions(); });

    return { path, writeDisabled, rules, loading, modalVisible, modalKey, editingRule, editingOriginalId, tabs, activeTab, tabSchemas, columns, openModal, saveRule, deleteRule, load, GROUP_TYPE_OPTIONS, addressGroups, networkGroups, domainGroups, macGroups, portGroups, handleSourceTypeChange, handleDestinationTypeChange };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, SourceDestMatchCards, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule" />
      <div style="height:32px;"></div>
      <div class="page-actions-bottom">
        <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? '编辑源 NAT 规则' : '创建源 NAT 规则'" width="820px" :key="modalKey" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template #source>
            <SourceDestMatchCards
              title="源地址"
              :groupOptions="GROUP_TYPE_OPTIONS"
              placeholder="IP地址/组名称"
              macPlaceholder="MAC组名称"
              portGroupPlaceholder="端口组名称"
              :groupType="editingRule?.sourceGroupType || 'address'"
              :addressValue="editingRule?.sourceValue || ''"
              :groupValue="editingRule?.sourceGroupValue || ''"
              :macValue="editingRule?.sourceMacValue || ''"
              :portGroupValue="editingRule?.sourcePortGroup || ''"
              :disabled="writeDisabled"
              :addressGroupOptions="addressGroups"
              :networkGroupOptions="networkGroups"
              :domainGroupOptions="domainGroups"
              :macGroupOptions="macGroups"
              :portGroupOptions="portGroups"
              @update:groupType="handleSourceTypeChange"
              @update:addressValue="editingRule.sourceValue = $event"
              @update:groupValue="editingRule.sourceGroupValue = $event"
              @update:macValue="editingRule.sourceMacValue = $event"
              @update:portGroupValue="editingRule.sourcePortGroup = $event"
            />
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :showAdvanced="true" :formKey="'source_nat_rule_source'" />
          </template>
          <template #destination>
            <SourceDestMatchCards
              title="目的地址"
              :groupOptions="GROUP_TYPE_OPTIONS"
              placeholder="IP地址/组名称"
              macPlaceholder="MAC组名称"
              portGroupPlaceholder="端口组名称"
              :groupType="editingRule?.destinationGroupType || 'address'"
              :addressValue="editingRule?.destinationValue || ''"
              :groupValue="editingRule?.destinationGroupValue || ''"
              :macValue="editingRule?.destinationMacValue || ''"
              :portGroupValue="editingRule?.destinationPortGroup || ''"
              :disabled="writeDisabled"
              :addressGroupOptions="addressGroups"
              :networkGroupOptions="networkGroups"
              :domainGroupOptions="domainGroups"
              :macGroupOptions="macGroups"
              :portGroupOptions="portGroups"
              @update:groupType="handleDestinationTypeChange"
              @update:addressValue="editingRule.destinationValue = $event"
              @update:groupValue="editingRule.destinationGroupValue = $event"
              @update:macValue="editingRule.destinationMacValue = $event"
              @update:portGroupValue="editingRule.destinationPortGroup = $event"
            />
            <ConfigForm v-model="editingRule" :schema="tabSchemas.destination" :showAdvanced="true" :formKey="'source_nat_rule_destination'" />
          </template>
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :showAdvanced="true" :formKey="'source_nat_rule_basic'" />
          </template>
          <template #outbound>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.outbound" :showAdvanced="true" :formKey="'source_nat_rule_outbound'" />
          </template>
          <template #translation>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.translation" :showAdvanced="true" :formKey="'source_nat_rule_translation'" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
