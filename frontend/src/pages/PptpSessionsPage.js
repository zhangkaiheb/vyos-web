import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

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
    const { t } = useI18n();
    const loading = ref(false);
    const sessions = ref([]);
    const rawOutput = ref('');

    const columns = [
      { key: 'ifname', title: t('pptpSessions.columns.ifname') },
      { key: 'username', title: t('pptpSessions.columns.username') },
      { key: 'ip', title: 'IP' },
      { key: 'ip6', title: 'IPv6' },
      { key: 'ip6_dp', title: 'IPv6-PD' },
      { key: 'calling_sid', title: 'Calling-SID' },
      { key: 'rate_limit', title: t('pptpSessions.columns.rateLimit') },
      { key: 'state', title: t('pptpSessions.columns.state') },
      { key: 'uptime', title: t('pptpSessions.columns.uptime') },
      { key: 'rx_bytes', title: t('pptpSessions.columns.rxBytes') },
      { key: 'tx_bytes', title: t('pptpSessions.columns.txBytes') },
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

    return { loading, sessions, columns, load, t };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="sessions" :loading="loading" :selectable="false" :actions="[]" />
    </div>
  `,
});
