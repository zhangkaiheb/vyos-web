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
    if (/^\s*IPv6 address\s+State\s+Last communication\s+Lease expiration\s+Remaining\s+Type\s+Pool\s+DUID/.test(lines[i])) {
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
  name: 'Dhcpv6LeasesPage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const leases = ref([]);
    const filterPool = ref('');
    const filterState = ref('');
    const sortKey = ref('');

    const columns = computed(() => [
      { key: 'ipv6_address', title: t('dhcpv6Leases.columns.ipv6Address') },
      { key: 'state', title: t('dhcpv6Leases.columns.state') },
      { key: 'last_communication', title: t('dhcpv6Leases.columns.lastCommunication') },
      { key: 'lease_expiration', title: t('dhcpv6Leases.columns.leaseExpiration') },
      { key: 'remaining', title: t('dhcpv6Leases.columns.remaining') },
      { key: 'type', title: t('dhcpv6Leases.columns.type') },
      { key: 'pool', title: t('dhcpv6Leases.columns.pool') },
      { key: 'duid', title: t('dhcpv6Leases.columns.duid') },
    ]);

    const poolOptions = computed(() => {
      const pools = new Set();
      leases.value.forEach(l => { if (l.pool) pools.add(l.pool); });
      return Array.from(pools).sort();
    });

    const filteredLeases = computed(() => leases.value);

    async function load() {
      loading.value = true;
      try {
        let command = 'dhcpv6 server leases';
        if (filterPool.value) command += ' pool ' + filterPool.value;
        if (filterState.value) command += ' state ' + filterState.value;
        if (sortKey.value) command += ' sort ' + sortKey.value;
        const res = await opModeApi.show(command);
        leases.value = parseTable(res.output || '');
      } catch (e) {
        showError(e);
        leases.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {t,

      loading, leases, columns, load,
      filterPool, filterState, sortKey, poolOptions, filteredLeases,
    };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="filteredLeases" :loading="loading" :selectable="false" :actions="[]" @refresh="load">
        <template #toolbar-right-extra>
          <select v-model="filterPool" @change="load" :title="t('dhcpv6Leases.filter.byPool')">
            <option value="">{{ t('dhcpv6Leases.filter.allPools') }}</option>
            <option v-for="p in poolOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="filterState" @change="load" :title="t('dhcpv6Leases.filter.byState')">
            <option value="">{{ t('dhcpv6Leases.filter.defaultState') }}</option>
            <option value="all">{{ t('dhcpv6Leases.filter.all') }}</option>
            <option value="active">active</option>
            <option value="abandoned">abandoned</option>
            <option value="backup">backup</option>
            <option value="expired">expired</option>
            <option value="free">free</option>
            <option value="released">released</option>
            <option value="reset">reset</option>
          </select>
          <select v-model="sortKey" @change="load" :title="t('dhcpv6Leases.sort.title')">
            <option value="">{{ t('dhcpv6Leases.sort.default') }}</option>
            <option value="duid">DUID</option>
            <option value="end">{{ t('dhcpv6Leases.sort.expiration') }}</option>
            <option value="ip">IP</option>
            <option value="last_communication">{{ t('dhcpv6Leases.sort.lastCommunication') }}</option>
            <option value="pool">{{ t('dhcpv6Leases.sort.pool') }}</option>
            <option value="remaining">{{ t('dhcpv6Leases.sort.remaining') }}</option>
            <option value="state">{{ t('dhcpv6Leases.sort.state') }}</option>
            <option value="type">{{ t('dhcpv6Leases.sort.type') }}</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">{{ t('dhcpv6Leases.refresh') }}</ToolbarButton>
        </template>
      </DataTable>
    </div>
  `,
});
