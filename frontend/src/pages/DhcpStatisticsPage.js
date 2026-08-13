import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

function parseTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  let headerIdx = -1;
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Pool\s+Size\s+Leases/.test(lines[i])) {
      headerIdx = i;
    } else if (headerIdx !== -1 && i === headerIdx + 1 && /^\s*[-]+\s+[-]+/.test(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (headerIdx === -1 || sepIdx === -1) return result;

  const headerLine = lines[headerIdx];
  const colStarts = [];
  const colNames = [];
  let lastWordStart = -1;
  for (let i = 0; i < headerLine.length; i++) {
    const c = headerLine[i];
    if (c !== ' ' && lastWordStart === -1) {
      lastWordStart = i;
    }
    if ((c === ' ' || i === headerLine.length - 1) && lastWordStart !== -1) {
      if (i === headerLine.length - 1 && c !== ' ') i++;
      colStarts.push(lastWordStart);
      colNames.push(headerLine.slice(lastWordStart, i).trim().toLowerCase().replace(/\s+/g, '_'));
      lastWordStart = -1;
    }
  }

  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const row = {};
    let hasData = false;
    colStarts.forEach((start, idx) => {
      const end = idx + 1 < colStarts.length ? colStarts[idx + 1] : line.length;
      const value = line.slice(start, end).trim();
      row[colNames[idx]] = value;
      if (value) hasData = true;
    });
    if (hasData) result.push(row);
  }
  return result;
}

export default defineComponent({
  name: 'DhcpStatisticsPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const stats = ref([]);
    const filterPool = ref('');

    const columns = computed(() => [
      { key: 'pool', title: t('dhcpStatistics.columns.pool') },
      { key: 'size', title: t('dhcpStatistics.columns.size') },
      { key: 'leases', title: t('dhcpStatistics.columns.leases') },
      { key: 'available', title: t('dhcpStatistics.columns.available') },
      { key: 'usage', title: t('dhcpStatistics.columns.usage') },
    ]);

    const poolOptions = computed(() => {
      const pools = new Set();
      stats.value.forEach(s => { if (s.pool) pools.add(s.pool); });
      return Array.from(pools).sort();
    });

    const filteredStats = computed(() => {
      if (!filterPool.value) return stats.value;
      return stats.value.filter(s => s.pool === filterPool.value);
    });

    async function load() {
      loading.value = true;
      try {
        let command = 'dhcp server statistics';
        if (filterPool.value) command += ' pool ' + filterPool.value;
        const res = await opModeApi.show(command);
        stats.value = parseTable(res.output || '');
      } catch (e) {
        showError(e);
        stats.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { t,
      loading, stats, columns, load, filterPool, poolOptions, filteredStats };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="filteredStats" :loading="loading" :selectable="false" :actions="[]" @refresh="load">
        <template #toolbar-right-extra>
          <select v-model="filterPool" @change="load" :title="t('dhcpStatistics.filterByPool')">
            <option value="">{{ t('dhcpStatistics.allPools') }}</option>
            <option v-for="p in poolOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">{{ t('dhcpStatistics.refresh') }}</ToolbarButton>
        </template>
      </DataTable>
    </div>
  `,
});
