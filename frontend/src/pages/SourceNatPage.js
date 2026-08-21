import { defineComponent, ref, computed, onMounted, watch, inject } from '/src/utils/vue-import.js';
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
import { onMenuRefresh } from '/src/utils/eventBus.js';

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
  { value: '', label: '' },
  { value: 'persistent', label: 'persistent' },
  { value: 'random', label: 'random' },
];

const PORT_MAPPING_OPTIONS = [
  { value: '', label: '' },
  { value: 'random', label: 'random' },
  { value: 'none', label: 'none' },
];

const GROUP_TYPE_OPTIONS = [
  { value: 'address', labelKey: 'sourceNat.groupType.address' },
  { value: 'address-group', labelKey: 'sourceNat.groupType.addressGroup' },
  { value: 'network-group', labelKey: 'sourceNat.groupType.networkGroup' },
  { value: 'domain-group', labelKey: 'sourceNat.groupType.domainGroup' },
];

export default defineComponent({
  name: 'SourceNatPage',
  setup() {
    const { t } = inject('i18n');
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
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    // Dynamic options
    const interfaces = ref([]);
    const interfaceGroups = ref([]);
    const addressGroups = ref([]);
    const networkGroups = ref([]);
    const portGroups = ref([]);
    const domainGroups = ref([]);
    const macGroups = ref([]);
    const protocols = ref([]);

    const tabs = computed(() => [
      { key: 'basic', title: t('sourceNat.tab.basic') },
      { key: 'source', title: t('sourceNat.tab.source') },
      { key: 'destination', title: t('sourceNat.tab.destination') },
      { key: 'outbound', title: t('sourceNat.tab.outbound') },
      { key: 'translation', title: t('sourceNat.tab.translation') },
    ]);
    const activeTab = ref('basic');

    const tabSchemas = computed(() => ({
      basic: [
        { key: 'id', title: t('sourceNat.field.ruleNumber'), type: 'number', min: 1, max: 999999, required: true, help: t('sourceNat.help.ruleNumber') },
        { key: 'description', title: t('sourceNat.field.description'), type: 'text', help: t('sourceNat.help.description') },
        { key: 'protocol', title: t('sourceNat.field.protocol'), type: 'select', default: 'all', help: t('sourceNat.help.protocol'),
          options: protocols.value.length ? protocols.value.map(p => ({ value: p, label: p })) : [] },
        { key: 'packetType', title: t('sourceNat.field.packetType'), type: 'select', help: t('sourceNat.help.packetType'),
          options: PACKET_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
        { key: 'log', title: t('sourceNat.field.log'), type: 'checkbox', defaultValue: false, help: t('sourceNat.help.log') },
        { key: 'exclude', title: t('sourceNat.field.exclude'), type: 'checkbox', defaultValue: false, help: t('sourceNat.help.exclude') },
        { key: 'disable', title: t('sourceNat.field.disable'), type: 'checkbox', defaultValue: false, help: t('sourceNat.help.disable') },
      ],
      source: [
        { key: 'sourcePort', title: t('sourceNat.field.port'), type: 'text', placeholder: t('sourceNat.placeholder.port'), help: t('sourceNat.help.sourcePort') },
      ],
      destination: [
        { key: 'destinationPort', title: t('sourceNat.field.port'), type: 'text', placeholder: t('sourceNat.placeholder.port'), help: t('sourceNat.help.destinationPort') },
      ],
      outbound: [
        { key: 'outboundInterfaceName', title: t('sourceNat.field.interfaceName'), type: 'select', help: t('sourceNat.help.outboundInterfaceName'),
          options: ['', 'any', ...interfaces.value].map(n => ({ value: n, label: n })), default: '' },
        { key: 'outboundInterfaceGroup', title: t('sourceNat.field.interfaceGroup'), type: 'select', help: t('sourceNat.help.outboundInterfaceGroup'),
          options: ['', ...interfaceGroups.value].map(g => ({ value: g, label: g })), default: '' },
      ],
      translation: [
        { key: 'translationAddress', title: t('sourceNat.field.translationAddress'), type: 'text', placeholder: t('sourceNat.placeholder.translationAddress'), help: t('sourceNat.help.translationAddress') },
        { key: 'translationMasquerade', title: t('sourceNat.field.masquerade'), type: 'checkbox', defaultValue: false, help: t('sourceNat.help.masquerade') },
        { key: 'translationPort', title: t('sourceNat.field.translationPort'), type: 'text', placeholder: t('sourceNat.placeholder.translationPort'), help: t('sourceNat.help.translationPort') },
        { key: 'translationAddressMapping', title: t('sourceNat.field.addressMapping'), type: 'select', help: t('sourceNat.help.addressMapping'),
          options: ADDRESS_MAPPING_OPTIONS.map(o => ({ value: o.value, label: o.label })), default: '' },
        { key: 'translationPortMapping', title: t('sourceNat.field.portMapping'), type: 'select', help: t('sourceNat.help.portMapping'),
          options: PORT_MAPPING_OPTIONS.map(o => ({ value: o.value, label: o.label })), default: '' },
      ],
    }));

    const columns = computed(() => [
      { key: 'id', title: t('sourceNat.column.ruleNumber') },
      { key: 'description', title: t('sourceNat.column.description') },
      { key: 'protocol', title: t('sourceNat.column.protocol') },
      { key: 'packetType', title: t('sourceNat.column.packetType') },
      { key: 'sourceValue', title: t('sourceNat.column.sourceAddress'), render: (val, row) => {
        const parts = [];
        if (val) parts.push(val);
        if (row.sourceGroupTypes && row.sourceGroupTypes.length) parts.push(row.sourceGroupTypes.join(', '));
        return parts.join(' ') || '';
      }},
      { key: 'sourcePort', title: t('sourceNat.column.sourcePort') },
      { key: 'destinationValue', title: t('sourceNat.column.destinationAddress') },
      { key: 'destinationGroupTypes', title: t('sourceNat.column.destinationGroup'), render: (val) => val && val.length ? val.join(', ') : '' },
      { key: 'destinationPort', title: t('sourceNat.column.destinationPort') },
      { key: 'outboundInterfaceName', title: t('sourceNat.column.outboundInterface'), render: (val, row) => {
        if (val) return val;
        return row.outboundInterfaceGroup || '';
      }},
      { key: 'translationAddress', title: t('sourceNat.column.translationAddress'), render: (val, row) => {
        if (row.translationMasquerade) return 'masquerade';
        return val || '';
      }},
      { key: 'translationPort', title: t('sourceNat.column.translationPort') },
      { key: 'translationOptions', title: t('sourceNat.column.translationOptions') },
      { key: 'log', title: t('sourceNat.column.log'), render: (val) => val ? t('app.yes') : '' },
      { key: 'disable', title: t('sourceNat.column.disable'), render: (val) => val ? t('app.yes') : '' },
    ]);

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
        const resp = await configStore.getConfig(path, true);
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
        showError(t('sourceNat.loadFailed'), e);
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
      if (attrs['packet-type'] || attrs.packet_type) rule.packetType = attrs['packet-type'] || attrs.packet_type;
      if (attrs.protocol) rule.protocol = attrs.protocol;

      const src = attrs.source || {};
      rule.sourceValue = '';
      rule.sourceGroupType = 'address';
      rule.sourceGroupValue = '';
      rule.sourceGroupTypes = [];
      if (src.address) { rule.sourceValue = src.address; }
      if (src.group) {
        const g = src.group;
        if (g['address-group'] || g.address_group) { const v = g['address-group'] || g.address_group; rule.sourceGroupType = 'address-group'; rule.sourceGroupValue = v; rule.sourceGroupTypes.push('AG:' + v); }
        if (g['network-group'] || g.network_group) { const v = g['network-group'] || g.network_group; rule.sourceGroupType = 'network-group'; rule.sourceGroupValue = v; rule.sourceGroupTypes.push('NG:' + v); }
        if (g['domain-group'] || g.domain_group) { const v = g['domain-group'] || g.domain_group; rule.sourceGroupType = 'domain-group'; rule.sourceGroupValue = v; rule.sourceGroupTypes.push('DG:' + v); }
        if (g['mac-group'] || g.mac_group) { const v = g['mac-group'] || g.mac_group; rule.sourceMacValue = v; rule.sourceGroupTypes.push('MG:' + v); }
      }
      if (src.port) rule.sourcePort = src.port;

      const dst = attrs.destination || {};
      rule.destinationValue = '';
      rule.destinationGroupType = 'address';
      rule.destinationGroupValue = '';
      rule.destinationGroupTypes = [];
      if (dst.address) { rule.destinationValue = dst.address; }
      if (dst.group) {
        const g = dst.group;
        if (g['address-group'] || g.address_group) { const v = g['address-group'] || g.address_group; rule.destinationGroupType = 'address-group'; rule.destinationGroupValue = v; rule.destinationGroupTypes.push('AG:' + v); }
        if (g['network-group'] || g.network_group) { const v = g['network-group'] || g.network_group; rule.destinationGroupType = 'network-group'; rule.destinationGroupValue = v; rule.destinationGroupTypes.push('NG:' + v); }
        if (g['domain-group'] || g.domain_group) { const v = g['domain-group'] || g.domain_group; rule.destinationGroupType = 'domain-group'; rule.destinationGroupValue = v; rule.destinationGroupTypes.push('DG:' + v); }
        if (g['mac-group'] || g.mac_group) { const v = g['mac-group'] || g.mac_group; rule.destinationMacValue = v; rule.destinationGroupTypes.push('MG:' + v); }
        if (g['port-group'] || g.port_group) { const v = g['port-group'] || g.port_group; rule.destinationPortGroup = v; rule.destinationGroupTypes.push('PG:' + v); }
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
        const mappingOpts = [];
        if (opts['address-mapping'] || opts.address_mapping) {
          const keys = Object.keys(opts['address-mapping'] || opts.address_mapping);
          const am = keys.find(k => k && !/^\d+$/.test(k));
          if (am) mappingOpts.push('addr:' + am);
        }
        if (opts['port-mapping'] || opts.port_mapping) {
          const keys = Object.keys(opts['port-mapping'] || opts.port_mapping);
          const pm = keys.find(k => k && !/^\d+$/.test(k));
          if (pm) mappingOpts.push('port:' + pm);
        }
        rule.translationOptions = mappingOpts.join(', ');
      }

      const oi = attrs['outbound-interface'] || attrs.outbound_interface;
      if (oi) {
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
        if (!rule.id) return showError({ message: t('sourceNat.ruleNumberRequired') });

        const portFields = ['sourcePort', 'destinationPort', 'translationPort'];
        for (const field of portFields) {
          if (rule[field] && rule.protocol && !['tcp', 'udp', 'tcp_udp'].includes(rule.protocol)) {
            return showError({ message: t('sourceNat.portProtocolError') });
          }
        }

        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError(t('sourceNat.saveFailed'), e);
      }
    }

    function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      pendingDeleteNames.value = [row.id];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const id of pendingDeleteNames.value) {
        try {
          await configStore.deleteConfig(`${path} rule ${id}`);
          configStore.markPending();
        } catch (e) {
          showError(t('sourceNat.deleteFailed'), e);
        }
      }
      pendingDeleteNames.value = [];
      await load();
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

    onMounted(() => {
      load();
      loadDynamicOptions();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });
    watch(() => route.path, () => { load(); loadDynamicOptions(); });

    return { path, writeDisabled, rules, loading, modalVisible, modalKey, editingRule, editingOriginalId, deleteModalVisible, pendingDeleteNames, tabs, activeTab, tabSchemas, columns, openModal, saveRule, deleteRule, confirmRemove, load, GROUP_TYPE_OPTIONS, addressGroups, networkGroups, domainGroups, macGroups, portGroups, handleSourceTypeChange, handleDestinationTypeChange, t };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, SourceDestMatchCards, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule" />
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? t('sourceNat.editRule') : t('sourceNat.createRule')" width="820px" :key="modalKey" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template #source>
            <SourceDestMatchCards
              :title="t('sourceNat.sourceAddress')"
              :groupOptions="GROUP_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))"
              :placeholder="t('sourceNat.ipAddressGroupPlaceholder')"
              :macPlaceholder="t('sourceNat.macGroupPlaceholder')"
              :portGroupPlaceholder="t('sourceNat.portGroupPlaceholder')"
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
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :showAdvanced="true" :formKey="'source_nat_rule_source'" :editMode="!!editingOriginalId" />
          </template>
          <template #destination>
            <SourceDestMatchCards
              :title="t('sourceNat.destinationAddress')"
              :groupOptions="GROUP_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))"
              :placeholder="t('sourceNat.ipAddressGroupPlaceholder')"
              :macPlaceholder="t('sourceNat.macGroupPlaceholder')"
              :portGroupPlaceholder="t('sourceNat.portGroupPlaceholder')"
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
            <ConfigForm v-model="editingRule" :schema="tabSchemas.destination" :showAdvanced="true" :formKey="'source_nat_rule_destination'" :editMode="!!editingOriginalId" />
          </template>
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :showAdvanced="true" :formKey="'source_nat_rule_basic'" :editMode="!!editingOriginalId" />
          </template>
          <template #outbound>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.outbound" :showAdvanced="true" :formKey="'source_nat_rule_outbound'" :editMode="!!editingOriginalId" />
          </template>
          <template #translation>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.translation" :showAdvanced="true" :formKey="'source_nat_rule_translation'" :editMode="!!editingOriginalId" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('sourceNat.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="id in pendingDeleteNames" :key="id" style="padding:2px 0;">{{ id }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
