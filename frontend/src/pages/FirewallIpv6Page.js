import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import { FIREWALL_RULE_SCHEMA_IPV6 } from '/src/data/firewallRuleSchemaIpv6.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const RULE_NUMBER_FIELD = { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 999999 };

function resolveRulePaths(routePath) {
  const parts = routePath.replace(/^\//, '').split('/').filter(Boolean);
  if (parts[0] === 'firewall' && parts[1] === 'ipv6') {
    const type = parts[2];
    if (['forward', 'input', 'output', 'prerouting'].includes(type)) {
      return {
        base: `firewall ipv6 ${type} filter`,
        rule: `firewall ipv6 ${type} filter rule`,
        op: `ipv6 ${type} filter`,
      };
    }
    if (type === 'name') {
      return {
        base: 'firewall ipv6 name',
        rule: 'firewall ipv6 name',
        op: 'ipv6 name',
      };
    }
  }
  const base = parts.join(' ');
  return { base, rule: `${base} rule`, op: base };
}

function formatEndpoint(ep) {
  if (!ep || typeof ep !== 'object') return '';
  const parts = [];
  if (ep.address) parts.push(ep.address);
  if (ep.port) parts.push(`:${ep.port}`);
  if (ep['mac-address']) parts.push(`MAC:${ep['mac-address']}`);
  if (ep.group?.['address-group']) parts.push(`AG:${ep.group['address-group']}`);
  if (ep.group?.['network-group']) parts.push(`NG:${ep.group['network-group']}`);
  if (ep.group?.['port-group']) parts.push(`PG:${ep.group['port-group']}`);
  if (ep.group?.['dynamic-address-group']) parts.push(`DG:${ep.group['dynamic-address-group']}`);
  if (ep.group?.['domain-group']) parts.push(`DOM:${ep.group['domain-group']}`);
  if (ep.group?.['mac-group']) parts.push(`MG:${ep.group['mac-group']}`);
  if (ep.geoip?.['country-code']) parts.push(`GEO:${ep.geoip['country-code']}`);
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

export default defineComponent({
  name: 'FirewallIpv6Page',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref([]);
    const stats = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const moveModalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
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

    const ruleSchema = [RULE_NUMBER_FIELD, ...FIREWALL_RULE_SCHEMA_IPV6];

    const tabs = [
      { key: 'basic', title: '基本' },
      { key: 'source', title: '源/入接口' },
      { key: 'destination', title: '目的/出接口' },
      { key: 'time', title: '时间' },
      { key: 'tcp', title: 'TCP 选项' },
      { key: 'log', title: '日志' },
      { key: 'dynamic', title: '动态地址组' },
      { key: 'advanced', title: '高级' },
    ];
    const activeTab = ref('basic');

    const tabSchemas = computed(() => {
      const map = new Map(FIREWALL_RULE_SCHEMA_IPV6.map(f => [f.key, f]));
      const get = (key) => map.get(key);
      return {
        basic: [
          RULE_NUMBER_FIELD,
          get('action'),
          get('description'),
          get('protocol'),
          get('disable'),
          get('state'),
        ].filter(Boolean),
        source: [get('source'), get('inbound-interface')].filter(Boolean),
        destination: [get('destination'), get('outbound-interface')].filter(Boolean),
        time: [get('time')].filter(Boolean),
        tcp: [get('tcp')].filter(Boolean),
        log: [get('log'), get('log-options')].filter(Boolean),
        dynamic: [get('add-address-to-group')].filter(Boolean),
        advanced: [
          get('connection-status'),
          get('conntrack-helper'),
          get('icmpv6'),
          get('fragment'),
          get('ipsec'),
          get('dscp'),
          get('dscp-exclude'),
          get('packet-length'),
          get('packet-length-exclude'),
          get('packet-type'),
          get('mark'),
          get('connection-mark'),
          get('queue'),
          get('queue-options'),
          get('limit'),
          get('offload-target'),
          get('jump-target'),
          get('recent'),
          get('hop-limit'),
          get('synproxy'),
        ].filter(Boolean),
      };
    });

    const columns = ref([
      { key: 'rule', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'action', title: '动作' },
      { key: 'protocol', title: '协议' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'inbound-interface', title: '入接口' },
      { key: 'outbound-interface', title: '出接口' },
      { key: 'packets', title: 'Packets' },
      { key: 'bytes', title: 'Bytes' },
      { key: 'log', title: '日志' },
      { key: 'disable', title: '禁用' },
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

    async function load() {
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
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(handleMenuRefresh);
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
      editingItem.value = {};
      editingOriginalId.value = null;
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert('请选择一行');
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      editingItem.value = JSON.parse(JSON.stringify(row));
      editingOriginalId.value = row.id || null;
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的规则？')) return;
      for (const id of selected.value) {
        await configStore.deleteConfig(`${rulePath.value} ${id}`);
      }
      await configStore.checkSessionChanged();
      await load();
    }

    async function save() {
      const targetRule = editingItem.value.rule;
      if (!targetRule) return alert('请输入规则编号');
      const originalId = editingOriginalId.value;
      const value = buildSaveValue(ruleSchema, editingItem.value);
      try {
        if (originalId && String(originalId) !== String(targetRule)) {
          await configStore.deleteConfig(`${rulePath.value} ${originalId}`);
        }
        await configStore.setConfig(`${rulePath.value} ${targetRule}`, value);
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
      a.download = `firewall_ipv6_rules_${Date.now()}.csv`;
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
      if (!importFile.value) return alert('请选择文件');
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
      if (!selected.value.length) return alert('请选择一行');
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
        case 'top': return minId > 1 ? minId - 1 : null;
        case 'bottom': return maxId + 1;
        case 'before': if (!moveTargetId.value) return null; return parseInt(moveTargetId.value) - 1;
        case 'after': if (!moveTargetId.value) return null; return parseInt(moveTargetId.value) + 1;
        default: return null;
      }
    }

    async function moveRule() {
      if (!selected.value.length) return;
      const currentId = parseInt(selected.value[0]);
      const ids = data.value.map(r => parseInt(r.rule)).filter(Boolean);
      const targetId = resolveMoveTarget();
      if (targetId === null || isNaN(targetId)) return alert('无法移动到该位置，请检查目标编号');
      if (ids.includes(targetId)) return alert(`规则 ${targetId} 已存在，请选择其他位置`);
      try {
        await firewallApi.moveRule(configBase.value, currentId, targetId);
        moveModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      }
    }

    async function copyRule() {
      if (!selected.value.length) return alert('请选择一行');
      const target = prompt('输入新规则编号');
      if (!target) return;
      try {
        await firewallApi.copyRule(configBase.value, selected.value[0], target);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data: tableData, loading, columns, modalVisible, moveModalVisible, editingItem, selected, path, writeDisabled, moveOption, moveTargetId, importFile,
      importModalVisible, importPreview, importHeaders, importFileName,
      dataTableRef, searchText, tabs, activeTab, tabSchemas,
      load, create, edit, remove, save, clearStats, exportExcel, openImport, onImportFileChange, confirmImport, openMove, moveRule, copyRule, ruleSchema,
      formatEndpoint, formatInterface,
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
          <input class="toolbar-search" v-model="searchText" @input="dataTableRef?.setQuickFilter($event.target.value)" placeholder="搜索..." />
          <ToolbarButton icon="filter" @click="dataTableRef?.openFilter()">{{ $t('app.filter') }}</ToolbarButton>
          <ToolbarButton icon="columnSetting" @click="dataTableRef?.openColumnSetting()">{{ $t('app.columnSetting') }}</ToolbarButton>
          <ToolbarButton icon="export" @click="exportExcel">{{ $t('firewall.exportExcel') }}</ToolbarButton>
          <ToolbarButton icon="import" @click="openImport" :disabled="writeDisabled">{{ $t('firewall.importExcel') }}</ToolbarButton>
        </div>
      </div>
      <DataTable ref="dataTableRef" :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true">
        <template #source="{ row }">
          {{ formatEndpoint(row.source) }}
        </template>
        <template #destination="{ row }">
          {{ formatEndpoint(row.destination) }}
        </template>
        <template #inbound-interface="{ row }">
          {{ formatInterface(row['inbound-interface']) }}
        </template>
        <template #outbound-interface="{ row }">
          {{ formatInterface(row['outbound-interface']) }}
        </template>
        <template #log="{ row }">
          {{ row.log !== undefined ? '是' : '' }}
        </template>
        <template #disable="{ row }">
          {{ row.disable !== undefined ? '是' : '' }}
        </template>
      </DataTable>
      <CommandPreview :path="configBase" />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? '编辑 IPv6 规则' : '创建 IPv6 规则'" width="820px" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="editingItem" :schema="tabSchemas[tab.key]" :disabled="writeDisabled" :showAdvanced="true" :formKey="'firewall_ipv6_rule_' + path + '_' + tab.key" :suggestionPath="rulePath" />
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="moveModalVisible" title="移动规则" @confirm="moveRule">
        <div class="form-row">
          <label class="form-label">当前规则</label>
          <div class="form-control">{{ selected[0] }}</div>
        </div>
        <div class="form-row">
          <label class="form-label">移动到</label>
          <div class="form-control radio-group">
            <label class="radio-item"><input type="radio" v-model="moveOption" value="top" /> 置顶</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="bottom" /> 置底</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="before" /> 之前</label>
            <label class="radio-item"><input type="radio" v-model="moveOption" value="after" /> 之后</label>
          </div>
        </div>
        <div class="form-row" v-if="moveOption === 'before' || moveOption === 'after'">
          <label class="form-label">目标规则编号</label>
          <input class="form-control" v-model="moveTargetId" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="importModalVisible" title="导入 Excel" width="800px" @confirm="confirmImport">
        <div class="form-row">
          <label class="form-label">选择文件</label>
          <input type="file" @change="onImportFileChange" />
        </div>
        <div v-if="importFileName" style="margin-bottom:8px;color:#666;">已选择：{{ importFileName }}</div>
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
          <div v-if="importPreview.length >= 10" style="padding:8px;color:#999;text-align:center;">仅显示前 10 行预览</div>
        </div>
        <div v-else style="padding:20px;color:#999;text-align:center;">请选择文件以预览内容</div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
