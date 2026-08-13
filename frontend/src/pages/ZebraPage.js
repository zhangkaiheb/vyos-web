import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

function isSeparator(line) {
  return /^\s*-+(\s+-+)*\s*$/.test(line);
}

function parseAlignedTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];
  const headers = lines[headerIdx].trim().split(/\s{2,}/).filter(Boolean).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const result = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s{2,}/).filter(Boolean);
    if (parts.length < headers.length) continue;
    const row = { id: i };
    headers.forEach((key, idx) => {
      row[key] = parts[idx] || '';
    });
    result.push(row);
  }
  return result;
}

function parseKeyValueLines(output, skipPrefix) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (skipPrefix && trimmed.startsWith(skipPrefix)) continue;
    const match = line.match(/^\s*(\S.*?)\s{2,}(.*)$/);
    if (match && match[2].trim()) {
      result.push({ key: match[1].trim(), value: match[2].trim().replace(/^:\s*/, '') });
    }
  }
  return result;
}

function parseOverview(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const info = [];
  const vrfRows = [];
  let inVrfTable = false;
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      inVrfTable = false;
      continue;
    }
    if (trimmed.startsWith('VRF') && /Installs/.test(trimmed)) {
      inVrfTable = true;
      continue;
    }
    if (inVrfTable) {
      const parts = trimmed.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 6) {
        vrfRows.push({
          id: parts[0],
          vrf: parts[0],
          route_installs: parts[1],
          route_removals: parts[2],
          neighbor_updates: parts[3],
          lsp_installs: parts[4],
          lsp_removals: parts[5],
        });
      }
      continue;
    }
    if (/^Route\b/.test(trimmed)) continue;
    const match = line.match(/^\s*(\S.*?)\s{2,}(.*)$/);
    if (match && match[2].trim()) {
      info.push({ key: match[1].trim(), value: match[2].trim() });
    }
  }
  return { info, vrfRows };
}

function parseDplane(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Zebra dataplane')) continue;
    const match = line.match(/^\s*(\S.*?)\s{2,}(.*)$/);
    if (match && match[2].trim()) {
      result.push({ key: match[1].trim(), value: match[2].trim().replace(/^:\s*/, '') });
    }
  }
  return result;
}

export default defineComponent({
  name: 'ZebraPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const activeTab = ref('overview');

    const outputs = ref({ overview: '', clients: '', dplane: '', router: '' });

    const overviewInfo = ref([]);
    const overviewVrf = ref([]);
    const clientRows = ref([]);
    const dplaneInfo = ref([]);
    const routerRows = ref([]);

    const tabs = [
      { key: 'overview', title: t('zebra.tabs.overview') },
      { key: 'clients', title: t('zebra.tabs.clients') },
      { key: 'dplane', title: t('zebra.tabs.dplane') },
      { key: 'router', title: t('zebra.tabs.router') },
    ];

    const infoColumns = [
      { key: 'key', title: t('zebra.columns.key') },
      { key: 'value', title: t('zebra.columns.value') },
    ];

    const clientColumns = [
      { key: 'name', title: t('zebra.columns.name') },
      { key: 'connect_time', title: t('zebra.columns.connectTime') },
      { key: 'last_read', title: t('zebra.columns.lastRead') },
      { key: 'last_write', title: t('zebra.columns.lastWrite') },
      { key: 'ipv4_routes', title: t('zebra.columns.ipv4Routes') },
      { key: 'ipv6_routes', title: t('zebra.columns.ipv6Routes') },
    ];

    const vrfColumns = [
      { key: 'vrf', title: 'VRF' },
      { key: 'route_installs', title: t('zebra.columns.routeInstalls') },
      { key: 'route_removals', title: t('zebra.columns.routeRemovals') },
      { key: 'neighbor_updates', title: t('zebra.columns.neighborUpdates') },
      { key: 'lsp_installs', title: t('zebra.columns.lspInstalls') },
      { key: 'lsp_removals', title: t('zebra.columns.lspRemovals') },
    ];

    const routerColumns = [
      { key: 'vrf', title: 'VRF' },
      { key: 'ns_id', title: 'NS ID' },
      { key: 'vrf_id', title: 'VRF ID' },
      { key: 'afi', title: 'AFI' },
      { key: 'safi', title: 'SAFI' },
      { key: 'table', title: 'Table' },
      { key: 'count', title: 'Count' },
    ];

    async function fetchCommand(key, command) {
      const res = await opModeApi.show(command);
      outputs.value[key] = res.output || '';
      return res.output || '';
    }

    function parseAll() {
      const overview = parseOverview(outputs.value.overview);
      overviewInfo.value = overview.info;
      overviewVrf.value = overview.vrfRows;
      clientRows.value = parseAlignedTable(outputs.value.clients);
      dplaneInfo.value = parseDplane(outputs.value.dplane);
      routerRows.value = parseAlignedTable(outputs.value.router);
    }

    async function load() {
      loading.value = true;
      try {
        await Promise.all([
          fetchCommand('overview', 'zebra'),
          fetchCommand('clients', 'zebra client summary'),
          fetchCommand('dplane', 'zebra dplane'),
          fetchCommand('router', 'zebra router table summary'),
        ]);
        parseAll();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {
      t,
      loading,
      activeTab,
      tabs,
      overviewInfo,
      overviewVrf,
      clientRows,
      dplaneInfo,
      routerRows,
      infoColumns,
      clientColumns,
      vrfColumns,
      routerColumns,
      load,
    };
  },
  components: { DataTable, ToolbarButton, HelpButton, TabGroup },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <ToolbarButton icon="refresh" @click="load">{{ t('zebra.buttons.refresh') }}</ToolbarButton>
          <HelpButton routePath="/monitor/network/zebra" />
        </div>
      </div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #overview>
          <div class="zebra-overview">
            <h4>{{ t('zebra.sections.basicInfo') }}</h4>
            <DataTable :columns="infoColumns" :data="overviewInfo" :selectable="false" :actions="[]" rowKey="key" />
            <h4>{{ t('zebra.sections.vrfStats') }}</h4>
            <DataTable :columns="vrfColumns" :data="overviewVrf" :selectable="false" :actions="[]" rowKey="id" />
          </div>
        </template>
        <template #clients>
          <DataTable :columns="clientColumns" :data="clientRows" :selectable="false" :actions="[]" rowKey="id" />
        </template>
        <template #dplane>
          <DataTable :columns="infoColumns" :data="dplaneInfo" :selectable="false" :actions="[]" rowKey="key" />
        </template>
        <template #router>
          <DataTable :columns="routerColumns" :data="routerRows" :selectable="false" :actions="[]" rowKey="id" />
        </template>
      </TabGroup>
    </div>
  `,
});
