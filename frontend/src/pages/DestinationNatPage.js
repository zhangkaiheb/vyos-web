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
  { value: 'local', label: 'local' },
  { value: 'multicast', label: 'multicast' },
  { value: 'other', label: 'other' },
];

const HASH_OPTIONS = [
  { value: 'random', label: 'random' },
  { value: 'source-address', label: 'source-address' },
  { value: 'destination-address', label: 'destination-address' },
  { value: 'source-port', label: 'source-port' },
  { value: 'destination-port', label: 'destination-port' },
  { value: 'protocol', label: 'protocol' },
];

const GROUP_TYPE_OPTIONS = [
  { value: 'address', labelKey: 'destinationNat.groupType.address' },
  { value: 'address-group', labelKey: 'destinationNat.groupType.addressGroup' },
  { value: 'network-group', labelKey: 'destinationNat.groupType.networkGroup' },
  { value: 'domain-group', labelKey: 'destinationNat.groupType.domainGroup' },
];

export default defineComponent({
  name: 'DestinationNatPage',
  setup() {
    const { t } = inject('i18n');
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat destination';
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

    // Load balance backend table
    const loadBalanceBackends = ref([]);
    const backendModalVisible = ref(false);
    const backendModalKey = ref(0);
    const editingBackend = ref(null);
    const editingBackendIndex = ref(-1);

    const backendColumns = computed(() => [
      { key: 'address', title: t('destinationNat.backendAddress') },
      { key: 'weight', title: t('destinationNat.weight') },
    ]);

    const tabs = computed(() => [
      { key: 'basic', title: t('destinationNat.tab.basic') },
      { key: 'source', title: t('destinationNat.tab.source') },
      { key: 'destination', title: t('destinationNat.tab.destination') },
      { key: 'inbound', title: t('destinationNat.tab.inbound') },
      { key: 'translation', title: t('destinationNat.tab.translation') },
    ]);
    const activeTab = ref('basic');

    const tabSchemas = computed(() => ({
      basic: [
        { key: 'id', title: t('destinationNat.field.ruleNumber'), type: 'number', min: 1, max: 999999, required: true, help: t('destinationNat.help.ruleNumber') },
        { key: 'description', title: t('destinationNat.field.description'), type: 'text', help: t('destinationNat.help.description') },
        { key: 'protocol', title: t('destinationNat.field.protocol'), type: 'select', default: 'all', help: t('destinationNat.help.protocol'),
          options: protocols.value.length ? protocols.value.map(p => ({ value: p, label: p })) : [] },
        { key: 'packetType', title: t('destinationNat.field.packetType'), type: 'select', help: t('destinationNat.help.packetType'),
          options: PACKET_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
        { key: 'log', title: t('destinationNat.field.log'), type: 'checkbox', defaultValue: false, help: t('destinationNat.help.log') },
        { key: 'exclude', title: t('destinationNat.field.exclude'), type: 'checkbox', defaultValue: false, help: t('destinationNat.help.exclude') },
        { key: 'disable', title: t('destinationNat.field.disable'), type: 'checkbox', defaultValue: false, help: t('destinationNat.help.disable') },
      ],
      source: [
        { key: 'sourcePort', title: t('destinationNat.field.port'), type: 'text', placeholder: t('destinationNat.placeholder.port'), help: t('destinationNat.help.sourcePort') },
      ],
      destination: [
        { key: 'destinationPort', title: t('destinationNat.field.port'), type: 'text', placeholder: t('destinationNat.placeholder.port'), help: t('destinationNat.help.destinationPort') },
      ],
      inbound: [
        { key: 'inboundInterfaceName', title: t('destinationNat.field.interfaceName'), type: 'select', help: t('destinationNat.help.inboundInterfaceName'),
          options: ['any', ...interfaces.value].map(n => ({ value: n, label: n })) },
        { key: 'inboundInterfaceGroup', title: t('destinationNat.field.interfaceGroup'), type: 'select', help: t('destinationNat.help.inboundInterfaceGroup'),
          options: interfaceGroups.value.map(g => ({ value: g, label: g })) },
      ],
      translation: [
        { key: 'translationAddress', title: t('destinationNat.field.translationAddress'), type: 'text', placeholder: t('destinationNat.placeholder.translationAddress'), help: t('destinationNat.help.translationAddress') },
        { key: 'translationPort', title: t('destinationNat.field.translationPort'), type: 'text', placeholder: t('destinationNat.placeholder.translationPort'), help: t('destinationNat.help.translationPort') },
        { key: 'translationRedirect', title: t('destinationNat.field.redirectToLocalhost'), type: 'checkbox', defaultValue: false, help: t('destinationNat.help.redirectToLocalhost') },
        { key: 'translationRedirectPort', title: t('destinationNat.field.redirectPort'), type: 'number', min: 1, max: 65535, placeholder: t('destinationNat.placeholder.redirectPort'), help: t('destinationNat.help.redirectPort') },
        { key: 'translationAddressMapping', title: t('destinationNat.field.addressMapping'), type: 'select', help: t('destinationNat.help.addressMapping'),
          options: [
            { value: 'persistent', label: t('destinationNat.mapping.persistent') },
            { value: 'random', label: t('destinationNat.mapping.random') },
          ] },
        { key: 'translationPortMapping', title: t('destinationNat.field.portMapping'), type: 'select', help: t('destinationNat.help.portMapping'),
          options: [
            { value: 'random', label: t('destinationNat.mapping.randomPort') },
            { value: 'none', label: t('destinationNat.mapping.nonePort') },
          ] },
        { key: 'loadBalanceHash', title: t('destinationNat.field.loadBalanceHash'), type: 'select', help: t('destinationNat.help.loadBalanceHash'),
          options: HASH_OPTIONS.map(o => ({ value: o.value, label: o.label })) },
      ],
    }));

    const columns = computed(() => [
      { key: 'id', title: t('destinationNat.column.ruleNumber') },
      { key: 'description', title: t('destinationNat.column.description') },
      { key: 'protocol', title: t('destinationNat.column.protocol') },
      { key: 'sourceValue', title: t('destinationNat.column.sourceAddress'), render: (val, row) => {
        if (row.sourceGroupType === 'address-group') return row.sourceGroupValue || '';
        if (row.sourceGroupType === 'network-group') return row.sourceGroupValue || '';
        if (row.sourceGroupType === 'domain-group') return row.sourceGroupValue || '';
        return val || '';
      }},
      { key: 'destinationValue', title: t('destinationNat.column.destinationAddress'), render: (val, row) => {
        if (row.destinationGroupType === 'address-group') return row.destinationGroupValue || '';
        if (row.destinationGroupType === 'network-group') return row.destinationGroupValue || '';
        if (row.destinationGroupType === 'domain-group') return row.destinationGroupValue || '';
        return val || '';
      }},
      { key: 'inboundInterfaceName', title: t('destinationNat.column.inboundInterface') },
      { key: 'translationAddress', title: t('destinationNat.column.translationAddress') },
      { key: 'log', title: t('destinationNat.column.log') },
      { key: 'disable', title: t('destinationNat.column.disable') },
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
        fetchSuggestions('nat destination rule 1 inbound-interface', 'group'),
        fetchSuggestions('nat destination rule 1', 'protocol'),
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
        showError(t('destinationNat.loadFailed'), e);
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
      if (trans.address) rule.translationAddress = trans.address;
      if (trans.port) rule.translationPort = trans.port;
      if (trans.redirect) {
        rule.translationRedirect = true;
        if (typeof trans.redirect === 'object' && trans.redirect.port) {
          rule.translationRedirectPort = parseInt(trans.redirect.port) || null;
        }
      }
      if (trans.options) {
        const opts = trans.options;
        if (opts['address-mapping']) rule.translationAddressMapping = Object.keys(opts['address-mapping'])[0] || 'random';
        if (opts['port-mapping']) rule.translationPortMapping = Object.keys(opts['port-mapping'])[0] || 'none';
      }

      const lb = attrs['load-balance'] || {};
      if (lb.backend) {
        rule.loadBalanceBackends = Object.entries(lb.backend).map(([addr, attrs]) => ({
          address: addr,
          weight: attrs && attrs.weight ? parseInt(attrs.weight) : 1,
        }));
      } else {
        rule.loadBalanceBackends = [];
      }
      if (lb.hash) {
        const hashes = Object.keys(lb.hash);
        rule.loadBalanceHash = hashes.length ? hashes[0] : '';
      } else {
        rule.loadBalanceHash = '';
      }

      if (attrs['inbound-interface']) {
        const ii = attrs['inbound-interface'];
        rule.inboundInterfaceName = ii.name || '';
        rule.inboundInterfaceGroup = ii.group || '';
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
      if (rule.translationAddress) trans.address = rule.translationAddress;
      if (rule.translationPort) trans.port = rule.translationPort;
      if (rule.translationRedirect) {
        if (rule.translationRedirectPort) {
          trans.redirect = { port: rule.translationRedirectPort };
        } else {
          trans.redirect = '';
        }
      }
      const transOptions = {};
      if (rule.translationAddressMapping) transOptions['address-mapping'] = { [rule.translationAddressMapping]: '' };
      if (rule.translationPortMapping) transOptions['port-mapping'] = { [rule.translationPortMapping]: '' };
      if (Object.keys(transOptions).length) trans.options = transOptions;
      if (Object.keys(trans).length) value.translation = trans;

      const lb = {};
      if (rule.loadBalanceBackends && rule.loadBalanceBackends.length) {
        const backends = {};
        rule.loadBalanceBackends.forEach(b => {
          if (b.address) {
            if (b.weight && b.weight !== 1) {
              backends[b.address] = { weight: b.weight };
            } else {
              backends[b.address] = '';
            }
          }
        });
        lb.backend = backends;
      }
      if (rule.loadBalanceHash) {
        lb.hash = { [rule.loadBalanceHash]: '' };
      }
      if (Object.keys(lb).length) value['load-balance'] = lb;

      if (rule.inboundInterfaceName || rule.inboundInterfaceGroup) {
        const iface = {};
        if (rule.inboundInterfaceName) iface.name = rule.inboundInterfaceName;
        if (rule.inboundInterfaceGroup) iface.group = rule.inboundInterfaceGroup;
        value['inbound-interface'] = iface;
      }

      return value;
    }

    // Backend table functions
    function openBackendModal(index) {
      if (index >= 0) {
        const row = loadBalanceBackends.value[index];
        editingBackend.value = { ...row };
        editingBackendIndex.value = index;
      } else {
        editingBackend.value = { address: '', weight: 1 };
        editingBackendIndex.value = -1;
      }
      backendModalKey.value++;
      backendModalVisible.value = true;
    }

    function saveBackend() {
      const backend = editingBackend.value;
      if (!backend.address) return showError({ message: t('destinationNat.backendAddressRequired') });
      if (!backend.weight || backend.weight < 1 || backend.weight > 100) {
        return showError({ message: t('destinationNat.weightRange') });
      }
      if (editingBackendIndex.value >= 0) {
        loadBalanceBackends.value[editingBackendIndex.value] = { ...backend };
      } else {
        loadBalanceBackends.value.push({ ...backend });
      }
      backendModalVisible.value = false;
    }

    function deleteBackend(index) {
      loadBalanceBackends.value.splice(index, 1);
    }

    let optionsLoaded = false;

    async function openModal(index) {
      if (!optionsLoaded) {
        await loadDynamicOptions();
        optionsLoaded = true;
      }
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
        loadBalanceBackends.value = row.loadBalanceBackends ? [...row.loadBalanceBackends] : [];
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
        loadBalanceBackends.value = [];
      }
      modalKey.value++;
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: t('destinationNat.ruleNumberRequired') });

        const portFields = ['sourcePort', 'destinationPort', 'translationPort'];
        for (const field of portFields) {
          if (rule[field] && rule.protocol && !['tcp', 'udp', 'tcp_udp'].includes(rule.protocol)) {
            return showError({ message: t('destinationNat.portProtocolError') });
          }
        }

        // Sync backend table data to editingRule
        rule.loadBalanceBackends = [...loadBalanceBackends.value];

        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await load();
      } catch (error) {
        showError(t('error.saveFailed'), error);
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
          showError(t('destinationNat.deleteRuleFailed'), e);
        }
      }
      pendingDeleteNames.value = [];
      await load();
    }

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

    onMounted(async () => { load(); await loadDynamicOptions(); optionsLoaded = true; onMenuRefresh(load); });
    watch(() => route.path, async () => { load(); await loadDynamicOptions(); optionsLoaded = true; });

    return {t,
      
      path, writeDisabled, rules, loading, modalVisible, modalKey, editingRule, editingOriginalId,
      deleteModalVisible, pendingDeleteNames,
      tabs, activeTab, tabSchemas, columns, openModal, saveRule, deleteRule, confirmRemove, load,
      GROUP_TYPE_OPTIONS, addressGroups, networkGroups, domainGroups, macGroups, portGroups,
      loadBalanceBackends, backendColumns, backendModalVisible, backendModalKey,
      editingBackend, editingBackendIndex, openBackendModal, saveBackend, deleteBackend,
      handleSourceTypeChange, handleDestinationTypeChange,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, SourceDestMatchCards, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule" />
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? $t('destinationNat.editRule') : $t('destinationNat.createRule')" width="820px" :key="modalKey" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template #source>
            <SourceDestMatchCards
              :title="$t('destinationNat.sourceAddress')"
              :groupOptions="GROUP_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))"
              :placeholder="$t('destinationNat.placeholder.ipOrGroup')"
              :macPlaceholder="$t('destinationNat.placeholder.macGroup')"
              :portGroupPlaceholder="$t('destinationNat.placeholder.portGroup')"
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
            <ConfigForm v-model="editingRule" :schema="tabSchemas.source" :showAdvanced="true" :formKey="'destination_nat_rule_source'" />
          </template>
          <template #destination>
            <SourceDestMatchCards
              :title="$t('destinationNat.destinationAddress')"
              :groupOptions="GROUP_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))"
              :placeholder="$t('destinationNat.placeholder.ipOrGroup')"
              :macPlaceholder="$t('destinationNat.placeholder.macGroup')"
              :portGroupPlaceholder="$t('destinationNat.placeholder.portGroup')"
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
            <ConfigForm v-model="editingRule" :schema="tabSchemas.destination" :showAdvanced="true" :formKey="'destination_nat_rule_destination'" />
          </template>
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.basic" :showAdvanced="true" :formKey="'destination_nat_rule_basic'" />
          </template>
          <template #inbound>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.inbound" :showAdvanced="true" :formKey="'destination_nat_rule_inbound'" />
          </template>
          <template #translation>
            <ConfigForm v-model="editingRule" :schema="tabSchemas.translation" :showAdvanced="true" :formKey="'destination_nat_rule_translation'" />
            <div style="margin-top:16px;">
              <div style="font-weight:bold; font-size:14px; margin-bottom:8px;">{{ $t('destinationNat.loadBalanceBackends') }}</div>
              <DataTable :columns="backendColumns" :data="loadBalanceBackends" rowKey="address"
                         :actions="['create', 'edit', 'delete']" :disabled="writeDisabled"
                         @create="openBackendModal(-1)" @edit="openBackendModal" @delete="deleteBackend" />
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="backendModalVisible" :title="editingBackendIndex >= 0 ? $t('destinationNat.editBackend') : $t('destinationNat.addBackend')" width="400px" :key="backendModalKey" @confirm="saveBackend">
        <div style="padding:16px;">
          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:6px; font-size:13px; color:#666;">{{ $t('destinationNat.backendAddress') }}</label>
            <input type="text" v-model="editingBackend.address" :placeholder="$t('destinationNat.placeholder.backendAddress')"
                   style="width:100%; border:1px solid #d9d9d9; border-radius:2px; padding:6px 8px; font-size:13px;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:6px; font-size:13px; color:#666;">{{ $t('destinationNat.weightRangeLabel') }}</label>
            <input type="number" v-model.number="editingBackend.weight" min="1" max="100" placeholder="1"
                   style="width:100%; border:1px solid #d9d9d9; border-radius:2px; padding:6px 8px; font-size:13px;" />
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ $t('destinationNat.confirmDelete') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="id in pendingDeleteNames" :key="id" style="padding:2px 0;">{{ id }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
