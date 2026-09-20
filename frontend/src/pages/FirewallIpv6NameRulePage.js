import { defineComponent, ref, computed, watch, onMounted, onUnmounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { FIREWALL_RULE_SCHEMA_IPV6 } from '/src/data/firewallRuleSchemaIpv6.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const RULE_NUMBER_FIELD = { key: 'rule', title: 'rule.ruleNumber', type: 'number' };

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

function transformTcpFlagsFromVyOS(flags) {
  if (!flags || typeof flags !== 'object') return flags;
  const result = {};
  for (const key of Object.keys(flags)) {
    if (key !== 'not') {
      result[key] = 'set';
    }
  }
  if (flags.not && typeof flags.not === 'object') {
    for (const key of Object.keys(flags.not)) {
      result[key] = 'not';
    }
  }
  return result;
}

function transformDataForForm(data) {
  if (!data || typeof data !== 'object') return data;
  const result = { ...data };
  if (result.inbound_interface) {
    result['inbound-interface'] = result.inbound_interface;
    delete result.inbound_interface;
  }
  if (result.outbound_interface) {
    result['outbound-interface'] = result.outbound_interface;
    delete result.outbound_interface;
  }
  if (result.tcp && result.tcp.flags) {
    result.tcp = { ...result.tcp, flags: transformTcpFlagsFromVyOS(result.tcp.flags) };
  }
  return result;
}

export default defineComponent({
  name: 'FirewallIpv6NameRulePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');

    // Name management
    const nameList = ref([]);
    const selectedName = ref('');
    const showCreateNameModal = ref(false);
    const createNameValue = ref('');
    const deleteNameModalVisible = ref(false);

    // Rule management
    const data = ref([]);
    const stats = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const editingOriginalId = ref(null);
    const selected = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const activeTab = ref('basic');
    const searchText = ref('');
    const dataTableRef = ref(null);

    const nameBasePath = 'firewall ipv6 name';
    const rulePath = computed(() => selectedName.value ? `${nameBasePath} ${selectedName.value} rule` : '');
    const opPath = computed(() => selectedName.value ? `ipv6 name ${selectedName.value}` : '');

    const ruleSchema = [RULE_NUMBER_FIELD, ...FIREWALL_RULE_SCHEMA_IPV6];

    const tabs = computed(() => [
      { key: 'basic', title: t('firewall.tabs.basic') },
      { key: 'source', title: t('firewall.tabs.source') },
      { key: 'destination', title: t('firewall.tabs.destination') },
      { key: 'time', title: t('firewall.tabs.time') },
      { key: 'tcp', title: t('firewall.tabs.tcp') },
      { key: 'log', title: t('firewall.tabs.log') },
      { key: 'dynamic', title: t('firewall.tabs.dynamic') },
      { key: 'advanced', title: t('firewall.tabs.advanced') },
    ]);

    const tabSchemas = computed(() => {
      const map = new Map(FIREWALL_RULE_SCHEMA_IPV6.map(f => [f.key, f]));
      const get = (key) => map.get(key);
      const proto = editingItem.value?.protocol || '';
      const showIcmp = proto === '' || proto === 'all' || proto === 'icmpv6';
      return {
        basic: [RULE_NUMBER_FIELD, get('action'), get('description'), get('protocol'), get('disable'), get('state')].filter(Boolean),
        source: [get('source'), get('inbound-interface')].filter(Boolean),
        destination: [get('destination'), get('outbound-interface')].filter(Boolean),
        time: [get('time')].filter(Boolean),
        tcp: [get('tcp')].filter(Boolean),
        log: [get('log'), get('log-options')].filter(Boolean),
        dynamic: [get('add-address-to-group')].filter(Boolean),
        advanced: [
          get('connection-status'), get('conntrack-helper'),
          ...(showIcmp ? [get('icmpv6')] : []),
          get('fragment'), get('ipsec'), get('dscp'), get('dscp-exclude'),
          get('packet-length'), get('packet-length-exclude'), get('packet-type'),
          get('mark'), get('connection-mark'), get('queue'), get('queue-options'),
          get('limit'), get('offload-target'), get('jump-target'), get('recent'),
          get('ttl'), get('synproxy'), get('set'),
        ].filter(Boolean),
      };
    });

    const columns = computed(() => [
      { key: 'rule', title: t('firewall.columns.rule') },
      { key: 'description', title: t('firewall.columns.description') },
      { key: 'inbound-interface', title: t('firewall.columns.inboundInterface') },
      { key: 'outbound-interface', title: t('firewall.columns.outboundInterface') },
      { key: 'protocol', title: t('firewall.columns.protocol') },
      { key: 'source', title: t('firewall.columns.source') },
      { key: 'destination', title: t('firewall.columns.destination') },
      { key: 'packets', title: t('firewall.columns.packets') },
      { key: 'bytes', title: t('firewall.columns.bytes') },
      { key: 'log', title: t('firewall.columns.log') },
      { key: 'action', title: t('firewall.columns.action') },
      { key: 'disable', title: t('firewall.columns.disable') },
    ]);

    const tableData = computed(() => {
      const statMap = {};
      for (const s of stats.value) statMap[s.rule] = s;
      return data.value.map(r => ({
        ...r,
        packets: statMap[r.rule]?.packets ?? '',
        bytes: statMap[r.rule]?.bytes ?? '',
      }));
    });

    // Load name list
    async function loadNameList() {
      try {
        const res = await configStore.getConfig(nameBasePath, false);
        const d = res.data || {};
        nameList.value = Object.keys(d);
        if (nameList.value.length && !selectedName.value) {
          selectedName.value = nameList.value[0];
        }
      } catch (e) {
        showError(e);
      }
    }

    // Load rules for selected name
    async function loadRules() {
      if (!selectedName.value) {
        data.value = [];
        stats.value = [];
        return;
      }
      loading.value = true;
      try {
        const res = await configStore.getConfig(rulePath.value, false);
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
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      loadNameList().then(() => loadRules());
      onMenuRefresh(handleMenuRefresh);
      window.addEventListener('config-committed', () => { loadNameList(); loadRules(); });
    });
    onUnmounted(() => { offMenuRefresh(handleMenuRefresh); });

    function handleMenuRefresh(event) {
      if (event.detail?.route) {
        loadNameList();
        loadRules();
      }
    }

    watch(selectedName, () => {
      selected.value = [];
      loadRules();
    });

    // Name operations
    function openCreateName() {
      createNameValue.value = '';
      showCreateNameModal.value = true;
    }

    async function confirmCreateName() {
      if (!createNameValue.value.trim()) return showError({ message: t('msg.nameRequired') });
      if (nameList.value.includes(createNameValue.value)) return showError({ message: t('msg.nameExists') });
      try {
        await configStore.setConfig(`${nameBasePath} ${createNameValue.value}`, {});
        configStore.markPending();
        showCreateNameModal.value = false;
        await loadNameList();
        selectedName.value = createNameValue.value;
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    function openDeleteName() {
      if (!selectedName.value) return showError({ message: t('msg.noNameSelected') });
      deleteNameModalVisible.value = true;
    }

    async function confirmDeleteName() {
      try {
        await configStore.deleteConfig(`${nameBasePath} ${selectedName.value}`);
        configStore.markPending();
        deleteNameModalVisible.value = false;
        await loadNameList();
        if (nameList.value.length) {
          selectedName.value = nameList.value[0];
        } else {
          selectedName.value = '';
        }
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    // Rule operations
    function createRule() {
      if (!selectedName.value) return showError({ message: t('msg.noNameSelected') });
      const existingIds = data.value.map(r => parseInt(r.rule)).filter(n => !isNaN(n));
      const nextId = existingIds.length ? Math.max(...existingIds) + 1 : 1;
      editingItem.value = { rule: nextId };
      editingOriginalId.value = null;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function editRule() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      editingItem.value = transformDataForForm(JSON.parse(JSON.stringify(row)));
      editingOriginalId.value = row.id || null;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function removeRule() {
      if (!selected.value.length) return showError({ message: t('msg.noSelection') });
      pendingDeleteNames.value = [...selected.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      for (const id of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${rulePath.value} ${id}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await loadRules();
    }

    async function saveRule() {
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
        await loadRules();
      } catch (e) {
        showError(e);
      }
    }

    return {
      t,
      nameList, selectedName, showCreateNameModal, createNameValue, deleteNameModalVisible,
      data: tableData, loading, columns, modalVisible, editingItem, selected,
      deleteModalVisible, pendingDeleteNames, activeTab, searchText, dataTableRef,
      tabs, tabSchemas, ruleSchema,
      loadNameList, loadRules,
      openCreateName, confirmCreateName, openDeleteName, confirmDeleteName,
      createRule, editRule, removeRule, confirmRemoveRule, saveRule,
      formatEndpoint, formatInterface,
    };
  },
  template: `
    <div class="page-container">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <!-- Create dropdown -->
          <div style="position:relative;display:inline-flex;align-items:center;">
            <div style="display:inline-flex;align-items:center;border:1px solid #d0d0d0;border-radius:2px;overflow:hidden;">
              <ToolbarButton icon="create" @click="createRule" style="border:none;border-radius:0;padding-right:4px;">{{ $t('app.create') }}</ToolbarButton>
              <span style="cursor:pointer;font-size:14px;line-height:1;display:inline-block;transform:scaleX(1.4);position:relative;top:1px;padding:0 2px 0 0;background:#f5f5f5;" @click.stop="$refs.deleteDropdown.style.display='none';$refs.createDropdown.style.display = $refs.createDropdown.style.display === 'block' ? 'none' : 'block'">▾</span>
            </div>
            <div ref="createDropdown" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #d9d9d9;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:100;min-width:120px;" @mouseleave="$refs.createDropdown.style.display='none'">
              <div style="padding:8px 16px;cursor:pointer;white-space:nowrap;" @click="$refs.createDropdown.style.display='none';openCreateName()" @mouseenter="$event.target.style.background='#f5f5f5'" @mouseleave="$event.target.style.background=''">{{ $t('firewall.options.createName') }}</div>
              <div style="padding:8px 16px;cursor:pointer;white-space:nowrap;" @click="$refs.createDropdown.style.display='none';createRule()" @mouseenter="$event.target.style.background='#f5f5f5'" @mouseleave="$event.target.style.background=''">{{ $t('firewall.options.createRule') }}</div>
            </div>
          </div>
          <ToolbarButton icon="edit" @click="editRule" :disabled="!selected.length || selected.length > 1">{{ $t('app.edit') }}</ToolbarButton>
          <!-- Delete dropdown -->
          <div style="position:relative;display:inline-flex;align-items:center;">
            <div style="display:inline-flex;align-items:center;border:1px solid #d0d0d0;border-radius:2px;overflow:hidden;">
              <ToolbarButton icon="delete" @click="removeRule" style="border:none;border-radius:0;padding-right:4px;">{{ $t('app.delete') }}</ToolbarButton>
              <span style="cursor:pointer;font-size:14px;line-height:1;display:inline-block;transform:scaleX(1.4);position:relative;top:1px;padding:0 2px 0 0;background:#f5f5f5;" @click.stop="$refs.createDropdown.style.display='none';$refs.deleteDropdown.style.display = $refs.deleteDropdown.style.display === 'block' ? 'none' : 'block'">▾</span>
            </div>
            <div ref="deleteDropdown" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #d9d9d9;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:100;min-width:120px;" @mouseleave="$refs.deleteDropdown.style.display='none'">
              <div style="padding:8px 16px;cursor:pointer;white-space:nowrap;" @click="$refs.deleteDropdown.style.display='none';openDeleteName()" @mouseenter="$event.target.style.background='#f5f5f5'" @mouseleave="$event.target.style.background=''">{{ $t('firewall.options.deleteName') }}</div>
              <div style="padding:8px 16px;cursor:pointer;white-space:nowrap;" @click="$refs.deleteDropdown.style.display='none';removeRule()" @mouseenter="$event.target.style.background='#f5f5f5'" @mouseleave="$event.target.style.background=''">{{ $t('firewall.options.deleteRule') }}</div>
            </div>
          </div>
          <!-- Name selector -->
          <div style="display:flex;align-items:center;gap:8px;margin-left:12px;">
            <label style="white-space:nowrap;">{{ $t('firewall.options.rulesetLabel') }}:</label>
            <select v-model="selectedName" style="padding:5px 10px;border:1px solid #d9d9d9;border-radius:4px;min-width:160px;height:30px;">
              <option value="">{{ $t('firewall.options.selectName') }}</option>
              <option v-for="n in nameList" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          <input class="toolbar-search" v-model="searchText" @input="dataTableRef?.setQuickFilter($event.target.value)" :placeholder="$t('firewall.search')" />
          <ToolbarButton icon="filter" @click="dataTableRef?.openFilter()">{{ $t('app.filter') }}</ToolbarButton>
          <ToolbarButton icon="columnSetting" @click="dataTableRef?.openColumnSetting()">{{ $t('app.columnSetting') }}</ToolbarButton>
        </div>
      </div>

      <!-- Rule table -->
      <DataTable ref="dataTableRef" :columns="columns" :data="data" :loading="loading"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true">
        <template #source="{ row }">{{ formatEndpoint(row.source) }}</template>
        <template #destination="{ row }">{{ formatEndpoint(row.destination) }}</template>
        <template #inbound-interface="{ row }">{{ formatInterface(row['inbound-interface'] || row.inbound_interface) }}</template>
        <template #outbound-interface="{ row }">{{ formatInterface(row['outbound-interface'] || row.outbound_interface) }}</template>
        <template #log="{ row }">{{ row.log !== undefined ? $t('firewall.yes') : '' }}</template>
        <template #disable="{ row }">{{ row.disable !== undefined ? $t('firewall.yes') : '' }}</template>
      </DataTable>

      <!-- Rule modal -->
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? $t('firewall.options.editRule') : $t('firewall.options.createRule')" width="820px" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="editingItem" :schema="tabSchemas[tab.key]" :showAdvanced="true" :formKey="'firewall_ipv6_name_rule_' + tab.key" :suggestionPath="rulePath" :editMode="!!editingItem?.id" :key="'firewall_ipv6_name_rule_' + tab.key + '_' + (editingItem?.id || 'new')" />
          </template>
        </TabGroup>
      </DraggableModal>

      <!-- Create name modal -->
      <DraggableModal v-model:visible="showCreateNameModal" :title="$t('firewall.options.createName')" width="400px" @confirm="confirmCreateName">
        <div class="form-row">
          <label class="form-label">{{ $t('firewall.options.nameName') }}</label>
          <input class="form-control" v-model="createNameValue" :placeholder="$t('firewall.options.nameName')" />
        </div>
      </DraggableModal>

      <!-- Delete name confirm -->
      <DraggableModal v-model:visible="deleteNameModalVisible" :title="$t('config.confirmDelete')" modal-class="delete-name-modal" width="400px" @confirm="confirmDeleteName">
        <template #header-prefix>
          <svg style="margin-right:4px;width:16px;height:16px;fill:#FF8C00;vertical-align:middle;position:relative;top:1px;" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </template>
        <div style="margin-bottom:8px;">{{ selectedName }}</div>
        <div style="color:#666;">{{ $t('msg.confirmDeleteNameWithRules') }}</div>
      </DraggableModal>

      <!-- Delete rule confirm -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('config.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRule">
        <div>{{ $t('msg.confirmDeleteRules') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
