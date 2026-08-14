import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

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
  name: 'DnsDynamicStatusPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const rows = ref([]);

    const columns = [
      { key: 'hostname', title: t('dnsDynamicStatus.table.hostname') },
      { key: 'ipv4_address', title: t('dnsDynamicStatus.table.ipv4Address') },
      { key: 'ipv4_status', title: t('dnsDynamicStatus.table.ipv4Status') },
      { key: 'ipv6_address', title: t('dnsDynamicStatus.table.ipv6Address') },
      { key: 'ipv6_status', title: t('dnsDynamicStatus.table.ipv6Status') },
      { key: 'last_update', title: t('dnsDynamicStatus.table.lastUpdate') },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('dns dynamic status');
        rows.value = parseFixedTable(res.output || '');
      } catch (e) {
        showError(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, rows, columns, load, t };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="data-table-wrapper">
        <DataTable :columns="columns" :data="rows" row-key="hostname" :selectable="false" :external-toolbar="true" />
      </div>
    </div>
  `,
});
