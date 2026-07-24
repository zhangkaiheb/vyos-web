import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function parseSessions(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  let headerIdx = -1;
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*ifname\s*\|/.test(lines[i])) {
      headerIdx = i;
    } else if (headerIdx !== -1 && i === headerIdx + 1 && /^\s*[-+]+\s*$/.test(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (headerIdx === -1 || sepIdx === -1) return result;

  const columns = [
    { key: 'ifname', title: 'ifname' },
    { key: 'username', title: 'username' },
    { key: 'ip', title: 'ip' },
    { key: 'ip6', title: 'ip6' },
    { key: 'ip6_dp', title: 'ip6-dp' },
    { key: 'calling_sid', title: 'calling-sid' },
    { key: 'rate_limit', title: 'rate-limit' },
    { key: 'state', title: 'state' },
    { key: 'uptime', title: 'uptime' },
    { key: 'rx_bytes', title: 'rx-bytes' },
    { key: 'tx_bytes', title: 'tx-bytes' },
  ];

  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*[-+]+\s*$/.test(line)) continue;
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 2) continue;
    const row = {};
    columns.forEach((col, idx) => {
      row[col.key] = parts[idx] || '';
    });
    if (row.ifname) result.push(row);
  }
  return result;
}

export default defineComponent({
  name: 'PptpSessionsPage',
  setup() {
    const loading = ref(false);
    const sessions = ref([]);
    const rawOutput = ref('');

    const columns = [
      { key: 'ifname', title: '接口' },
      { key: 'username', title: '用户名' },
      { key: 'ip', title: 'IP' },
      { key: 'ip6', title: 'IPv6' },
      { key: 'ip6_dp', title: 'IPv6-PD' },
      { key: 'calling_sid', title: 'Calling-SID' },
      { key: 'rate_limit', title: '速率限制' },
      { key: 'state', title: '状态' },
      { key: 'uptime', title: '运行时间' },
      { key: 'rx_bytes', title: '接收字节' },
      { key: 'tx_bytes', title: '发送字节' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('pptp-server sessions');
        rawOutput.value = res.output || '';
        sessions.value = parseSessions(rawOutput.value);
      } catch (e) {
        showError(e);
        sessions.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, sessions, columns, load, rawOutput };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left"><h3>PPTP 会话</h3></div>
        <div class="toolbar-right">
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="sessions" :loading="loading" :selectable="false" :actions="[]" />
      <div v-if="rawOutput" style="margin-top:16px;">
        <div style="font-weight:bold;margin-bottom:4px;">原始输出</div>
        <pre style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;overflow:auto;">{{ rawOutput }}</pre>
      </div>
    </div>
  `,
});
