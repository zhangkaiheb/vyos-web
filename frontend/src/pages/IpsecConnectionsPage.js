import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function parseConnections(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  let headerIdx = -1;
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^Connection\s+State/.test(lines[i])) {
      headerIdx = i;
    } else if (headerIdx !== -1 && i === headerIdx + 1 && /^[-\s]+$/.test(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (headerIdx === -1 || sepIdx === -1) return result;

  const header = lines[headerIdx];
  const sep = lines[sepIdx];
  const columns = [
    { key: 'connection', title: 'Connection' },
    { key: 'state', title: 'State' },
    { key: 'type', title: 'Type' },
    { key: 'remote_address', title: 'Remote address' },
    { key: 'local_ts', title: 'Local TS' },
    { key: 'remote_ts', title: 'Remote TS' },
    { key: 'local_id', title: 'Local id' },
    { key: 'remote_id', title: 'Remote id' },
    { key: 'proposal', title: 'Proposal' },
  ];

  const ranges = [];
  let start = null;
  for (let i = 0; i < sep.length; i++) {
    if (sep[i] === '-') {
      if (start === null) start = i;
    } else if (start !== null) {
      ranges.push({ start, end: i });
      start = null;
    }
  }
  if (start !== null) ranges.push({ start, end: sep.length });

  if (ranges.length < columns.length) return result;

  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const row = {};
    columns.forEach((col, idx) => {
      const r = ranges[idx] || { start: 0, end: line.length };
      row[col.key] = line.slice(r.start, r.end).trim();
    });
    if (row.connection) result.push(row);
  }
  return result;
}

export default defineComponent({
  name: 'IpsecConnectionsPage',
  setup() {
    const loading = ref(false);
    const connections = ref([]);
    const rawOutput = ref('');

    const columns = [
      { key: 'connection', title: '连接' },
      { key: 'state', title: '状态' },
      { key: 'type', title: '类型' },
      { key: 'remote_address', title: '远端地址' },
      { key: 'local_ts', title: '本地 TS' },
      { key: 'remote_ts', title: '远端 TS' },
      { key: 'local_id', title: '本地 ID' },
      { key: 'remote_id', title: '远端 ID' },
      { key: 'proposal', title: '提议' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('vpn ipsec connections');
        rawOutput.value = res.output || '';
        connections.value = parseConnections(rawOutput.value);
      } catch (e) {
        showError(e);
        connections.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, connections, columns, load };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left"><h3>IPsec 连接</h3></div>
        <div class="toolbar-right">
          <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="connections" :loading="loading" :selectable="false" :actions="[]" />
      <div v-if="rawOutput" style="margin-top:16px;">
        <div style="font-weight:bold;margin-bottom:4px;">原始输出</div>
        <pre style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;overflow:auto;">{{ rawOutput }}</pre>
      </div>
    </div>
  `,
});
