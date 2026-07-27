import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function isSeparator(line) {
  return /^\s*-+(\s+-+)*\s*$/.test(line);
}

function parseFixedTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isSeparator(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (sepIdx <= 0) return [];
  const headerLine = lines[sepIdx - 1];
  const sepLine = lines[sepIdx];
  const segments = [];
  const dashRe = /-+/g;
  let m;
  while ((m = dashRe.exec(sepLine)) !== null) {
    segments.push({ start: m.index, end: m.index + m[0].length });
  }
  const colNames = segments.map(seg => headerLine.slice(seg.start, seg.end).trim().toLowerCase().replace(/\s+/g, '_'));

  const result = [];
  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const row = {};
    let hasData = false;
    segments.forEach((seg, idx) => {
      const value = line.slice(seg.start, seg.end).trim();
      row[colNames[idx]] = value;
      if (value) hasData = true;
    });
    if (hasData) result.push(row);
  }
  return result;
}

export default defineComponent({
  name: 'DnsForwardingStatisticsPage',
  setup() {
    const loading = ref(false);
    const rows = ref([]);
    const rawOutput = ref('');

    const columns = [
      { key: 'cache_entries', title: '缓存条目' },
      { key: 'max_cache_entries', title: '最大缓存条目' },
      { key: 'cache_size', title: '缓存大小' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('dns forwarding statistics');
        rawOutput.value = res.output || '';
        rows.value = parseFixedTable(rawOutput.value);
      } catch (e) {
        showError(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, rows, columns, load, rawOutput };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-split">
        <div class="toolbar-left"><h3>DNS 转发统计</h3></div>
        <div class="toolbar-right">
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <div class="data-table-wrapper">
        <DataTable :columns="columns" :data="rows" row-key="cache_entries" :selectable="false" :external-toolbar="true" />
      </div>
      <div v-if="rawOutput" class="page-section">
        <h4>原始输出</h4>
        <pre style="background:#f5f5f5;padding:12px;border:1px solid #d0d0d0;overflow:auto;">{{ rawOutput }}</pre>
      </div>
    </div>
  `,
});
