import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

const HEADERS = ['PID', 'USER', 'PR', 'NI', 'VIRT', 'RES', 'SHR', 'S', '%CPU', '%MEM', 'TIME+', 'COMMAND'];
const KEY_MAP = ['pid', 'user', 'pr', 'ni', 'virt', 'res', 'shr', 's', 'cpu', 'mem', 'time', 'command'];

function parseSummary(output, t) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('PID')) break;
    if (trimmed.startsWith('top -')) {
      result.push({ key: t('processMonitor.summary.systemInfo'), value: trimmed.replace(/^top\s+-\s*/, '') });
      continue;
    }
    const idx = trimmed.indexOf(':');
    if (idx > 0) {
      result.push({ key: trimmed.slice(0, idx).trim(), value: trimmed.slice(idx + 1).trim() });
    }
  }
  return result;
}

function parseProcessTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let headerLine = '';
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PID') && lines[i].includes('COMMAND')) {
      headerLine = lines[i];
      headerIdx = i;
      break;
    }
  }
  if (!headerLine) return [];

  const starts = [];
  let searchFrom = 0;
  for (const h of HEADERS) {
    const idx = headerLine.indexOf(h, searchFrom);
    if (idx < 0) return [];
    starts.push(idx);
    searchFrom = idx + h.length;
  }

  const rows = [];
  let id = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const padded = line.padEnd(starts[starts.length - 1] + 60, ' ');
    const row = { id: ++id };
    for (let j = 0; j < HEADERS.length; j++) {
      const start = starts[j];
      const end = j < HEADERS.length - 1 ? starts[j + 1] : padded.length;
      row[KEY_MAP[j]] = padded.slice(start, end).trim();
    }
    rows.push(row);
  }
  return rows;
}

export default defineComponent({
  name: 'ProcessMonitorPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const activeTab = ref('summary');
    const summaryRows = ref([]);
    const processRows = ref([]);

    const tabs = [
      { key: 'summary', title: t('processMonitor.tabs.summary') },
      { key: 'processes', title: t('processMonitor.tabs.processes') },
    ];

    const infoColumns = [
      { key: 'key', title: t('processMonitor.columns.item') },
      { key: 'value', title: t('processMonitor.columns.value') },
    ];

    const processColumns = [
      { key: 'pid', title: 'PID' },
      { key: 'user', title: t('processMonitor.columns.user') },
      { key: 'pr', title: 'PR' },
      { key: 'ni', title: 'NI' },
      { key: 'virt', title: 'VIRT' },
      { key: 'res', title: 'RES' },
      { key: 'shr', title: 'SHR' },
      { key: 's', title: 'S' },
      { key: 'cpu', title: '%CPU' },
      { key: 'mem', title: '%MEM' },
      { key: 'time', title: 'TIME+' },
      { key: 'command', title: 'COMMAND' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('system processes extensive');
        const output = res.output || '';
        summaryRows.value = parseSummary(output, t);
        processRows.value = parseProcessTable(output);
      } catch (e) {
        showError(e);
        summaryRows.value = [];
        processRows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {
      loading,
      activeTab,
      tabs,
      summaryRows,
      processRows,
      infoColumns,
      processColumns,
      load,
      t,
    };
  },
  components: { DataTable, ToolbarButton, HelpButton, TabGroup },
  template: `
    <div class="page-container process-monitor-page">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <ToolbarButton icon="refresh" @click="load">{{ t('processMonitor.buttons.refresh') }}</ToolbarButton>
          <HelpButton routePath="/monitor/system-status/process-monitor" />
        </div>
      </div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #summary>
          <DataTable :columns="infoColumns" :data="summaryRows" :selectable="false" :actions="[]" rowKey="key" />
        </template>
        <template #processes>
          <DataTable
            :columns="processColumns"
            :data="processRows"
            :loading="loading"
            :selectable="false"
            :actions="[]"
            rowKey="id"
          />
        </template>
      </TabGroup>
    </div>
  `,
});
