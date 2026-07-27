import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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
    const loading = ref(false);
    const leases = ref([]);
    const rawOutput = ref('');
    const filterPool = ref('');
    const filterState = ref('');
    const sortKey = ref('');

    const columns = [
      { key: 'ipv6_address', title: 'IPv6 地址' },
      { key: 'state', title: '状态' },
      { key: 'last_communication', title: '最后通信' },
      { key: 'lease_expiration', title: '租约到期' },
      { key: 'remaining', title: '剩余时间' },
      { key: 'type', title: '类型' },
      { key: 'pool', title: '地址池' },
      { key: 'duid', title: 'DUID' },
    ];

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

    return {
      loading, leases, columns, load, rawOutput,
      filterPool, filterState, sortKey, poolOptions, filteredLeases,
    };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-split">
        <div class="toolbar-left"><h3>DHCPv6 租约</h3></div>
        <div class="toolbar-right">
          <select v-model="filterPool" @change="load" title="按地址池过滤">
            <option value="">全部地址池</option>
            <option v-for="p in poolOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="filterState" @change="load" title="按状态过滤">
            <option value="">默认状态</option>
            <option value="all">全部</option>
            <option value="active">active</option>
            <option value="abandoned">abandoned</option>
            <option value="backup">backup</option>
            <option value="expired">expired</option>
            <option value="free">free</option>
            <option value="released">released</option>
            <option value="reset">reset</option>
          </select>
          <select v-model="sortKey" @change="load" title="排序">
            <option value="">默认排序</option>
            <option value="duid">DUID</option>
            <option value="end">到期时间</option>
            <option value="ip">IP</option>
            <option value="last_communication">最后通信</option>
            <option value="pool">地址池</option>
            <option value="remaining">剩余时间</option>
            <option value="state">状态</option>
            <option value="type">类型</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="filteredLeases" :loading="loading" :selectable="false" :actions="[]" />
      <div v-if="rawOutput" style="margin-top:16px;">
        <div style="font-weight:bold;margin-bottom:4px;">原始输出</div>
        <pre style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;overflow:auto;">{{ rawOutput }}</pre>
      </div>
    </div>
  `,
});
