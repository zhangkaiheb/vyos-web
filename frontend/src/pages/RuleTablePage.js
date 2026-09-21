import { defineComponent, ref, computed, watch, onMounted, onUnmounted, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { FIREWALL_RULE_SCHEMA } from '/src/data/firewallRuleSchema.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const RULE_NUMBER_FIELD = { key: 'rule', title: 'rule.ruleNumber', type: 'number' };

function resolveRulePaths(routePath) {
  const parts = routePath.replace(/^\//, '').split('/').filter(Boolean);
  if (parts[0] === 'firewall') {
    const family = parts[1];
    const type = parts[2];
    if ((family === 'ipv4' || family === 'ipv6') && ['forward', 'input', 'output', 'prerouting'].includes(type)) {
      return {
        base: `firewall ${family} ${type} filter`,
        rule: `firewall ${family} ${type} filter rule`,
        op: `${family} ${type} filter`,
      };
    }
    if (family === 'bridge' && ['forward', 'input', 'output', 'prerouting'].includes(type)) {
      return {
        base: `firewall bridge ${type} filter`,
        rule: `firewall bridge ${type} filter rule`,
        op: `bridge ${type} filter`,
      };
    }
    if (family === 'bridge' && type === 'name') {
      return {
        base: 'firewall bridge name',
        rule: 'firewall bridge name',
        op: 'bridge name',
      };
    }
  }
  if (parts[0] === 'nat' && parts[1]) {
    return { base: `nat ${parts[1]}`, rule: `nat ${parts[1]} rule`, op: `nat ${parts[1]}` };
  }
  if (parts[0] === 'nat64' && parts[1]) {
    return { base: `nat64 ${parts[1]}`, rule: `nat64 ${parts[1]} rule`, op: `nat64 ${parts[1]}` };
  }
  if (parts[0] === 'nat66' && parts[1]) {
    return { base: `nat66 ${parts[1]}`, rule: `nat66 ${parts[1]} rule`, op: `nat66 ${parts[1]}` };
  }
  const base = parts.join(' ');
  return { base, rule: `${base} rule`, op: base };
}

function formatEndpoint(ep) {
  if (!ep || typeof ep !== 'object') return '';
  const parts = [];
  if (ep.address) parts.push(ep.address);
  if (ep.port) parts.push(`:${ep.port}`);
  if (ep['mac-address'] || ep.mac_address) parts.push(`MAC:${ep['mac-address'] || ep.mac_address}`);
  const group = ep.group || {};
  if (group['address-group'] || group.address_group) parts.push(`AG:${group['address-group'] || group.address_group}`);
  if (group['network-group'] || group.network_group) parts.push(`NG:${group['network-group'] || group.network_group}`);
  if (group['port-group'] || group.port_group) parts.push(`PG:${group['port-group'] || group.port_group}`);
  if (group['dynamic-address-group'] || group.dynamic_address_group) parts.push(`DG:${group['dynamic-address-group'] || group.dynamic_address_group}`);
  if (group['domain-group'] || group.domain_group) parts.push(`DM:${group['domain-group'] || group.domain_group}`);
  if (group['mac-group'] || group.mac_group) parts.push(`MG:${group['mac-group'] || group.mac_group}`);
  const geoip = ep.geoip || {};
  if (geoip['country-code'] || geoip.country_code) parts.push(`GEO:${geoip['country-code'] || geoip.country_code}`);
  return parts.join('') || '';
}

function getGroupTooltip(ep, groups) {
  if (!ep || typeof ep !== 'object') return '';
  const group = ep.group || {};
  const groupRefs = [];
  if (group['address-group'] || group.address_group) groupRefs.push(group['address-group'] || group.address_group);
  if (group['network-group'] || group.network_group) groupRefs.push(group['network-group'] || group.network_group);
  if (group['port-group'] || group.port_group) groupRefs.push(group['port-group'] || group.port_group);
  if (group['dynamic-address-group'] || group.dynamic_address_group) groupRefs.push(group['dynamic-address-group'] || group.dynamic_address_group);
  if (group['domain-group'] || group.domain_group) groupRefs.push(group['domain-group'] || group.domain_group);
  if (group['mac-group'] || group.mac_group) groupRefs.push(group['mac-group'] || group.mac_group);
  const tooltips = [];
  for (const name of groupRefs) {
    const members = groups[name];
    if (members) tooltips.push(`${name}: ${members}`);
  }
  return tooltips.join('\n');
}

function formatInterface(iface) {
  if (!iface || typeof iface !== 'object') return '';
  if (iface.name) return iface.name;
  if (iface.group) return `G:${iface.group}`;
  return '';
}

function buildSaveValue(schema, source) {
  const result = {};
  for (const field of schema) {
    if (field.key === 'rule') continue;
    const val = source?.[field.key];
    if (field.type === 'group') {
      const child = buildSaveValue(field.children || [], val || {});
      if (Object.keys(child).length) result[field.key] = child;
    } else if (field.type === 'checkbox' && field.valueless) {
      if (val === true || val === '' || val === 'enable') {
        result[field.key] = '';
      }
    } else if (field.type === 'tri-state') {
      // Tri-state fields are handled separately in transformTcpFlags
      if (val && val !== '') {
        result[field.key] = val;
      }
    } else if (field.type === 'multi-select' || (field.type === 'textarea' && field.multi)) {
      if (Array.isArray(val) && val.length) result[field.key] = val;
    } else {
      if (val !== undefined && val !== null && val !== '') {
        result[field.key] = val;
      }
    }
  }
  return result;
}

// Transform tri-state TCP flags to VyOS format
// Input: { ack: 'set', syn: 'not', fin: '' }
// Output: { ack: '', not: { syn: '' } }
function transformTcpFlagsToVyOS(flags) {
  if (!flags || typeof flags !== 'object') return flags;
  
  const result = {};
  const notFlags = {};
  
  for (const [key, value] of Object.entries(flags)) {
    if (value === 'set') {
      result[key] = '';
    } else if (value === 'not') {
      notFlags[key] = '';
    }
    // Skip empty values (not configured)
  }
  
  if (Object.keys(notFlags).length > 0) {
    result.not = notFlags;
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

// Transform VyOS TCP flags to tri-state format
// Input: { ack: {}, not: { syn: {}, fin: {} } }
// Output: { ack: 'set', syn: 'not', fin: 'not' }
function transformTcpFlagsFromVyOS(flags) {
  if (!flags || typeof flags !== 'object') return flags;
  
  const result = {};
  
  // Process regular flags (set state)
  for (const key of Object.keys(flags)) {
    if (key !== 'not') {
      result[key] = 'set';
    }
  }
  
  // Process 'not' flags
  if (flags.not && typeof flags.not === 'object') {
    for (const key of Object.keys(flags.not)) {
      result[key] = 'not';
    }
  }
  
  return result;
}

// Deep transform TCP flags in the data structure
function transformDataForForm(data) {
  if (!data || typeof data !== 'object') return data;
  
  const result = {};
  
  for (const key of Object.keys(data)) {
    // Convert underscored keys to hyphenated keys for form compatibility
    const newKey = key.replace(/_/g, '-');
    const val = data[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[newKey] = transformDataForForm(val);
    } else {
      result[newKey] = val;
    }
  }
  
  if (result.tcp && result.tcp.flags) {
    result.tcp = {
      ...result.tcp,
      flags: transformTcpFlagsFromVyOS(result.tcp.flags)
    };
  }
  
  return result;
}

function transformDataForSave(data) {
  if (!data || typeof data !== 'object') return data;
  
  const result = { ...data };
  
  if (result.tcp && result.tcp.flags) {
    const transformedFlags = transformTcpFlagsToVyOS(result.tcp.flags);
    result.tcp = {
      ...result.tcp,
      flags: transformedFlags
    };
    // Remove tcp if flags is empty
    if (!result.tcp.flags) {
      delete result.tcp;
    }
  }
  
  return result;
}

export default defineComponent({
  name: 'RuleTablePage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const data = ref([]);
    const stats = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const moveModalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const paths = computed(() => resolveRulePaths(route.path));
    const configBase = computed(() => paths.value.base);
    const rulePath = computed(() => paths.value.rule);
    const opPath = computed(() => paths.value.op);
    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const moveOption = ref('top');
    const moveTargetId = ref('');
    const importFile = ref(null);
    const importModalVisible = ref(false);
    const importPreview = ref([]);
    const importHeaders = ref([]);
    const importFileName = ref('');
    const editingOriginalId = ref(null);
    const dataTableRef = ref(null);
    const searchText = ref('');
    const firewallGroups = ref({});

    const GROUP_CONFIG_PATHS = [
      'firewall group address-group',
      'firewall group ipv6-address-group',
      'firewall group network-group',
      'firewall group ipv6-network-group',
      'firewall group port-group',
      'firewall group domain-group',
      'firewall group mac-group',
      'firewall group dynamic-group address-group',
      'firewall group dynamic-group ipv6-address-group',
    ];

    const ruleSchema = [RULE_NUMBER_FIELD, ...FIREWALL_RULE_SCHEMA];

    const tabs = computed(() => {
      const isInputRule = route.path.includes('/input');
      const isOutputRule = route.path.includes('/output');
      const isPreroutingRule = route.path.includes('/prerouting');
      return [
        { key: 'basic', title: t('firewall.tabs.basic') },
        { key: 'source', title: isOutputRule ? '源' : t('firewall.tabs.source') },
        { key: 'destination', title: (isInputRule || isPreroutingRule) ? '目的' : t('firewall.tabs.destination') },
        { key: 'time', title: t('firewall.tabs.time') },
        { key: 'tcp', title: t('firewall.tabs.tcp') },
        { key: 'log', title: t('firewall.tabs.log') },
        { key: 'dynamic', title: t('firewall.tabs.dynamic') },
        { key: 'advanced', title: t('firewall.tabs.advanced') },
      ];
    });
    const activeTab = ref('basic');

    const tabSchemas = computed(() => {
      const map = new Map(FIREWALL_RULE_SCHEMA.map(f => [f.key, f]));
      const get = (key) => map.get(key);
      const isInputRule = route.path.includes('/input');
      const isOutputRule = route.path.includes('/output');
      const isPreroutingRule = route.path.includes('/prerouting');
      const isBridge = route.path.includes('/bridge');
      const proto = editingItem.value?.protocol || '';
      const showIcmp = proto === '' || proto === 'all' || proto === 'icmp';
      const showIcmpv6 = isBridge && (proto === '' || proto === 'all' || proto === 'icmpv6' || proto === 'ipv6-icmp');
      const destinationFields = [get('destination')];
      if (!isInputRule && !isPreroutingRule) {
        destinationFields.push(get('outbound-interface'));
      }
      const sourceFields = [get('source')];
      if (!isOutputRule) {
        sourceFields.push(get('inbound-interface'));
      }
      // Override action options for prerouting rules
      let actionField = get('action');
      if (isPreroutingRule) {
        actionField = { ...actionField, options: ['accept', 'continue', 'jump', 'reject', 'return', 'drop', 'queue', 'notrack'] };
      }
      const basicFields = [
        RULE_NUMBER_FIELD,
        actionField,
        get('description'),
        get('protocol'),
        get('disable'),
      ];
      if (!isPreroutingRule) {
        basicFields.push(get('state'));
      }
      return {
        basic: basicFields.filter(Boolean),
        source: sourceFields.filter(Boolean),
        destination: destinationFields.filter(Boolean),
        time: [get('time')].filter(Boolean),
        tcp: [get('tcp')].filter(Boolean),
        log: [get('log'), get('log-options')].filter(Boolean),
        dynamic: [get('add-address-to-group')].filter(Boolean),
        advanced: [
          ...(isPreroutingRule ? [] : [get('connection-status'), get('conntrack-helper')]),
          ...(showIcmp ? [get('icmp')] : []),
          ...(showIcmpv6 ? [get('icmpv6')] : []),
          get('fragment'),
          get('ipsec'),
          get('dscp'),
          get('dscp-exclude'),
          ...(isPreroutingRule ? [] : [get('packet-length'), get('packet-length-exclude'), get('packet-type')]),
          get('mark'),
          get('connection-mark'),
          get('queue'),
          get('queue-options'),
          get('limit'),
          ...((isInputRule || isOutputRule) ? [] : [get('offload-target')]),
          get('jump-target'),
          get('recent'),
          get('ttl'),
          ...(isPreroutingRule ? [] : [get('synproxy')]),
          ...(isInputRule ? [] : [get('set')]),
        ].filter(Boolean),
      };
    });

    const columns = computed(() => {
      const isInputRule = route.path.includes('/input');
      const isOutputRule = route.path.includes('/output');
      const isPreroutingRule = route.path.includes('/prerouting');
      const cols = [
        { key: 'rule', title: t('firewall.columns.rule') },
        { key: 'description', title: t('firewall.columns.description') },
      ];
      if (!isOutputRule) {
        cols.push({ key: 'inbound-interface', title: t('firewall.columns.inboundInterface') });
      }
      if (!isInputRule && !isPreroutingRule) {
        cols.push({ key: 'outbound-interface', title: t('firewall.columns.outboundInterface') });
      }
      cols.push(
        { key: 'protocol', title: t('firewall.columns.protocol') },
        { key: 'source', title: t('firewall.columns.source') },
        { key: 'destination', title: t('firewall.columns.destination') },
        { key: 'packets', title: t('firewall.columns.packets') },
        { key: 'bytes', title: t('firewall.columns.bytes') },
        { key: 'log', title: t('firewall.columns.log') },
        { key: 'action', title: t('firewall.columns.action') },
        { key: 'disable', title: t('firewall.columns.disable') },
      );
      return cols;
    });

    const tableData = computed(() => {
      const statMap = {};
      for (const s of stats.value) statMap[s.rule] = s;
      return data.value.map(r => ({
        ...r,
        packets: statMap[r.rule]?.packets ?? '',
        bytes: statMap[r.rule]?.bytes ?? '',
      }));
    });

    async function loadFirewallGroups() {
      try {
        const promises = GROUP_CONFIG_PATHS.map(p =>
          configStore.getConfig(p, true).then(res => ({ path: p, data: res.data || {} })).catch(() => ({ path: p, data: {} }))
        );
        const results = await Promise.all(promises);
        const groups = {};
        for (const r of results) {
          for (const [name, val] of Object.entries(r.data)) {
            const memberData = val?.address || val?.network || val?.port || val?.mac_address || val?.['mac-address'];
            if (memberData) {
              const members = Array.isArray(memberData) ? memberData : Object.keys(memberData);
              groups[name] = members.join(', ');
            }
          }
        }
        firewallGroups.value = groups;
      } catch (e) {
        // Silently ignore group load errors
      }
    }

    async function load() {
      selected.value = [];
      loading.value = true;
      try {
        const res = await configStore.getConfig(rulePath.value, true);
        const d = res.data || {};
        const rows = [];
        for (const [k, v] of Object.entries(d)) {
          rows.push({ id: k, rule: k, ...v });
        }
        data.value = rows;
        try {
          const sres = await firewallApi.ruleStats(opPath.value);
          stats.value = sres.stats || [];
        } catch (e) {
          stats.value = [];
        }
        await loadFirewallGroups();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(handleMenuRefresh);
      window.addEventListener('config-committed', load);
    });
    onUnmounted(() => {
      offMenuRefresh(handleMenuRefresh);
    });
    watch(() => route.path, load);

    function handleMenuRefresh(event) {
      if (event.detail?.route === route.path) {
        load();
      }
    }

    function create() {
      const existingIds = data.value.map(r => parseInt(r.rule)).filter(n => !isNaN(n));
      const nextId = existingIds.length ? Math.max(...existingIds) + 1 : 1;
      editingItem.value = { rule: nextId };
      editingOriginalId.value = null;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      editingItem.value = transformDataForForm(JSON.parse(JSON.stringify(row)));
      editingOriginalId.value = row.id || null;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function remove() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      pendingDeleteNames.value = [...selected.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      for (const id of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${rulePath.value} ${id}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function save() {
      const targetRule = editingItem.value.rule;
      if (!targetRule) return showError({ message: t('msg.ruleNumberRequired') });
      const originalId = editingOriginalId.value;
      const value = buildSaveValue(ruleSchema, editingItem.value);
      try {
        if (originalId && String(originalId) !== String(targetRule)) {
          await configStore.deleteConfig(`${rulePath.value} ${originalId}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${rulePath.value} ${targetRule}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    async function clearStats() {
      try {
        await firewallApi.clearCounters(opPath.value);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function exportExcel() {
      const rows = data.value.map(r => ({
        rule: r.rule, action: r.action, protocol: r.protocol,
        source_address: r.source?.address, source_port: r.source?.port,
        destination_address: r.destination?.address, destination_port: r.destination?.port,
        inbound_interface: r['inbound-interface'], outbound_interface: r['outbound-interface'],
        description: r.description, log: r.log ? 'yes' : 'no', state: r.state,
      }));
      const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `firewall_rules_${Date.now()}.csv`;
      a.click();
    }

    function openImport() {
      importFile.value = null;
      importPreview.value = [];
      importHeaders.value = [];
      importFileName.value = '';
      importModalVisible.value = true;
    }

    async function onImportFileChange(event) {
      const file = event.target.files[0];
      if (!file) {
        importFile.value = null;
        importPreview.value = [];
        importHeaders.value = [];
        importFileName.value = '';
        return;
      }
      importFile.value = file;
      importFileName.value = file.name;
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        importPreview.value = [];
        importHeaders.value = [];
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim());
      importHeaders.value = headers;
      importPreview.value = lines.slice(1, 11).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, i) => row[h] = values[i]);
        return row;
      });
    }

    async function confirmImport() {
      if (!importFile.value) return showError({ message: t('msg.fileRequired') });
      try {
        const text = await importFile.value.text();
        const lines = text.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, i) => row[h] = values[i]);
          return row;
        });
        await firewallApi.importRules(configBase.value, rows);
        importModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function openMove() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      moveOption.value = 'top';
      moveTargetId.value = '';
      moveModalVisible.value = true;
    }

    function resolveMoveTarget() {
      const ids = data.value.map(r => parseInt(r.rule)).filter(Boolean);
      if (!ids.length) return null;
      const minId = Math.min(...ids);
      const maxId = Math.max(...ids);
      switch (moveOption.value) {
        case 'top':
          return minId > 1 ? minId - 1 : null;
        case 'bottom':
          return maxId + 1;
        case 'before':
          if (!moveTargetId.value) return null;
          return parseInt(moveTargetId.value) - 1;
        case 'after':
          if (!moveTargetId.value) return null;
          return parseInt(moveTargetId.value) + 1;
        default:
          return null;
      }
    }

    async function moveRule() {
      if (!selected.value.length) return;
      const currentId = parseInt(selected.value[0]);
      const ids = data.value.map(r => parseInt(r.rule)).filter(Boolean);
      const targetId = resolveMoveTarget();
      if (targetId === null || isNaN(targetId)) return showError({ message: t('msg.moveFailed') });
      if (ids.includes(targetId)) return showError({ message: t('msg.ruleExists', { id: targetId }) });
      try {
        await firewallApi.moveRule(configBase.value, currentId, targetId);
        moveModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      }
    }

    async function copyRule() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      const target = prompt(t('msg.enterNewRuleNumber'));
      if (!target) return;
      try {
        await firewallApi.copyRule(configBase.value, selected.value[0], target);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {t,

      data: tableData, loading, columns, modalVisible, moveModalVisible, editingItem, selected, path, writeDisabled, moveOption, moveTargetId, importFile,
      importModalVisible, importPreview, importHeaders, importFileName,
      dataTableRef, searchText, tabs, activeTab, tabSchemas,
      deleteModalVisible, pendingDeleteNames,
      load, create, edit, remove, confirmRemove, save, clearStats, exportExcel, openImport, onImportFileChange, confirmImport, openMove, moveRule, copyRule, ruleSchema,
      formatEndpoint, formatInterface, getGroupTooltip, firewallGroups,
      rulePath,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selected.length || selected.length > 1">{{ $t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selected.length">{{ $t('app.delete') }}</ToolbarButton>
          <ToolbarButton icon="move" @click="openMove" :disabled="writeDisabled">{{ $t('app.move') }}</ToolbarButton>
          <ToolbarButton icon="copy" @click="copyRule" :disabled="writeDisabled">{{ $t('app.copy') }}</ToolbarButton>
          <ToolbarButton icon="clearCounters" @click="clearStats">{{ $t('firewall.clearCounters') }}</ToolbarButton>
        </div>
        <div class="toolbar-right">
          <input class="toolbar-search" v-model="searchText" @input="dataTableRef?.setQuickFilter($event.target.value)" :placeholder="$t('firewall.search')" />
          <ToolbarButton icon="filter" @click="dataTableRef?.openFilter()">{{ $t('app.filter') }}</ToolbarButton>
          <ToolbarButton icon="columnSetting" @click="dataTableRef?.openColumnSetting()">{{ $t('app.columnSetting') }}</ToolbarButton>
          <ToolbarButton icon="export" @click="exportExcel">{{ $t('firewall.exportExcel') }}</ToolbarButton>
          <ToolbarButton icon="import" @click="openImport" :disabled="writeDisabled">{{ $t('firewall.importExcel') }}</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :key="path" :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true">
        <template #source="{ row }">
          <span :title="getGroupTooltip(row.source, firewallGroups)">{{ formatEndpoint(row.source) }}</span>
        </template>
        <template #destination="{ row }">
          <span :title="getGroupTooltip(row.destination, firewallGroups)">{{ formatEndpoint(row.destination) }}</span>
        </template>
        <template #inbound-interface="{ row }">
          {{ formatInterface(row['inbound-interface'] || row.inbound_interface) }}
        </template>
        <template #outbound-interface="{ row }">
          {{ formatInterface(row['outbound-interface'] || row.outbound_interface) }}
        </template>
        <template #log="{ row }">
          {{ row.log !== undefined ? $t('firewall.yes') : '' }}
        </template>
        <template #disable="{ row }">
          {{ row.disable !== undefined ? $t('firewall.yes') : '' }}
        </template>
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? $t('firewall.editRule') : $t('firewall.createRule')" width="820px" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="editingItem" :schema="tabSchemas[tab.key]" :disabled="writeDisabled" :showAdvanced="true" :formKey="'firewall_rule_' + path + '_' + tab.key" :suggestionPath="rulePath" :editMode="!!editingItem?.id" :key="'firewall_rule_' + path + '_' + tab.key + '_' + (editingItem?.id || 'new')" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="moveModalVisible" :title="$t('firewall.moveRule')" @confirm="moveRule">
        <div class="form-row">
          <label class="form-label">{{ $t('firewall.currentRule') }}</label>
          <div class="form-control">{{ selected[0] }}</div>
        </div>
        <div class="form-row">
          <label class="form-label">{{ $t('firewall.moveTo') }}</label>
          <div class="form-control radio-group">
            <label class="radio-item"><input type="radio" v-model="moveOption" value="top" /> {{ $t('firewall.moveTop') }}</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="bottom" /> {{ $t('firewall.moveBottom') }}</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="before" /> {{ $t('firewall.moveBefore') }}</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="after" /> {{ $t('firewall.moveAfter') }}</label>
          </div>
        </div>
        <div class="form-row" v-if="moveOption === 'before' || moveOption === 'after'">
          <label class="form-label">{{ $t('firewall.targetRuleNumber') }}</label>
          <input class="form-control" v-model="moveTargetId" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="importModalVisible" :title="$t('firewall.importExcel')" width="800px" @confirm="confirmImport">
        <div class="form-row">
          <label class="form-label">{{ $t('firewall.selectFile') }}</label>
          <input type="file" @change="onImportFileChange" />
        </div>
        <div v-if="importFileName" style="margin-bottom:8px;color:#666;">{{ $t('firewall.selected') }}：{{ importFileName }}</div>
        <div v-if="importPreview.length" style="max-height:300px;overflow:auto;border:1px solid #ddd;">
          <table class="data-table">
            <thead>
              <tr><th v-for="h in importHeaders" :key="h">{{ h }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in importPreview" :key="i">
                <td v-for="h in importHeaders" :key="h">{{ row[h] }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="importPreview.length >= 10" style="padding:8px;color:#999;text-align:center;">{{ $t('firewall.previewLimit') }}</div>
        </div>
        <div v-else style="padding:20px;color:#999;text-align:center;">{{ $t('firewall.selectFileToPreview') }}</div>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('config.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemove">
        <div>{{ $t('msg.confirmDeleteRules') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
