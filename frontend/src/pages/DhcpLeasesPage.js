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
    if (/^\s*IP Address\s+MAC address\s+State/.test(lines[i])) {
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
  name: 'DhcpLeasesPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const leases = ref([]);
    const rawOutput = ref('');
    const filterPool = ref('');
    const filterOrigin = ref('');
    const sortKey = ref('');

    const columns = computed(() => [
      { key: 'ip_address', title: t('dhcpLeases.columns.ipAddress') },
      { key: 'mac_address', title: t('dhcpLeases.columns.macAddress') },
      { key: 'state', title: t('dhcpLeases.columns.state') },
      { key: 'lease_start', title: t('dhcpLeases.columns.leaseStart') },
      { key: 'lease_expiration', title: t('dhcpLeases.columns.leaseExpiration') },
      { key: 'remaining', title: t('dhcpLeases.columns.remaining') },
      { key: 'pool', title: t('dhcpLeases.columns.pool') },
      { key: 'hostname', title: t('dhcpLeases.columns.hostname') },
      { key: 'origin', title: t('dhcpLeases.columns.origin') },
    ]);

    const poolOptions = computed(() => {
      const pools = new Set();
      leases.value.forEach(l => { if (l.pool) pools.add(l.pool); });
      return Array.from(pools).sort();
    });

    const filteredLeases = computed(() => {
      let rows = leases.value;
      if (filterPool.value) {
        rows = rows.filter(l => l.pool === filterPool.value);
      }
      if (filterOrigin.value) {
        rows = rows.filter(l => l.origin === filterOrigin.value);
      }
      return rows;
    });

    async function load() {
      loading.value = true;
      try {
        let command = 'dhcp server leases';
        if (filterOrigin.value) command += ' origin ' + filterOrigin.value;
        if (filterPool.value) command += ' pool ' + filterPool.value;
        if (sortKey.value) command += ' sort ' + sortKey.value;
        const res = await opModeApi.show(command);
        rawOutput.value = res.output || '';
        leases.value = parseTable(rawOutput.value);
      } catch (e) {
        showError(e);
        leases.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { t,
      loading, leases, columns, load, rawOutput, filterPool, filterOrigin, sortKey, poolOptions, filteredLeases };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="filteredLeases" :loading="loading" :selectable="false" :actions="[]" @refresh="load">
        <template #toolbar-left-extra>
          <select v-model="filterPool" @change="load" :title="t('dhcpLeases.filterByPool')">
            <option value="">{{ t('dhcpLeases.allPools') }}</option>
            <option v-for="p in poolOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="filterOrigin" @change="load" :title="t('dhcpLeases.filterByOrigin')">
            <option value="">{{ t('dhcpLeases.allOrigins') }}</option>
            <option value="local">local</option>
            <option value="remote">remote</option>
          </select>
          <select v-model="sortKey" @change="load" :title="t('dhcpLeases.sort')">
            <option value="">{{ t('dhcpLeases.defaultSort') }}</option>
            <option value="end">{{ t('dhcpLeases.sortByExpiration') }}</option>
            <option value="hostname">{{ t('dhcpLeases.sortByHostname') }}</option>
            <option value="ip">IP</option>
            <option value="mac">MAC</option>
            <option value="pool">{{ t('dhcpLeases.sortByPool') }}</option>
            <option value="remaining">{{ t('dhcpLeases.sortByRemaining') }}</option>
            <option value="start">{{ t('dhcpLeases.sortByStart') }}</option>
            <option value="state">{{ t('dhcpLeases.sortByState') }}</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">{{ t('dhcpLeases.refresh') }}</ToolbarButton>
        </template>
      </DataTable>
    </div>
  `,
});
