import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

function parseSa(output) {
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

  const sep = lines[sepIdx];
  const columns = [
    { key: 'connection', title: 'Connection' },
    { key: 'state', title: 'State' },
    { key: 'uptime', title: 'Uptime' },
    { key: 'bytes', title: 'Bytes In/Out' },
    { key: 'packets', title: 'Packets In/Out' },
    { key: 'remote_address', title: 'Remote address' },
    { key: 'remote_id', title: 'Remote ID' },
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
  name: 'IpsecSaPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const saList = ref([]);

    const columns = [
      { key: 'connection', title: t('ipsecSa.columns.connection') },
      { key: 'state', title: t('ipsecSa.columns.state') },
      { key: 'uptime', title: t('ipsecSa.columns.uptime') },
      { key: 'bytes', title: t('ipsecSa.columns.bytes') },
      { key: 'packets', title: t('ipsecSa.columns.packets') },
      { key: 'remote_address', title: t('ipsecSa.columns.remoteAddress') },
      { key: 'remote_id', title: t('ipsecSa.columns.remoteId') },
      { key: 'proposal', title: t('ipsecSa.columns.proposal') },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('vpn ipsec sa');
        saList.value = parseSa(res.output || '');
      } catch (e) {
        showError(e);
        saList.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, saList, columns, load, t };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="saList" :loading="loading" :selectable="false" :actions="[]" />
    </div>
  `,
});
