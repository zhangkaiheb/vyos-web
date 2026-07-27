import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';

const HEADERS = ['Proto', 'Recv-Q', 'Send-Q', 'Local Address', 'Foreign Address', 'State', 'PID/Program name'];
const KEY_MAP = ['proto', 'recv_q', 'send_q', 'local_address', 'foreign_address', 'state', 'pid_program'];

function parseIpPorts(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let headerLine = '';
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Proto') && lines[i].includes('Local Address')) {
      headerLine = lines[i];
      headerIdx = i;
      break;
    }
  }
  if (!headerLine) return [];

  const starts = [];
  let searchFrom = 0;
  for (const h of HEADERS) {
    const idx = headerLine.indexOf(h, searchFrom);
    if (idx < 0) return [];
    starts.push(idx);
    searchFrom = idx + h.length;
  }

  const rows = [];
  let id = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^Active Internet connections/.test(line.trim())) continue;
    const padded = line.padEnd(starts[starts.length - 1] + 30, ' ');
    const row = { id: ++id };
    for (let j = 0; j < HEADERS.length; j++) {
      const start = starts[j];
      const end = j < HEADERS.length - 1 ? starts[j + 1] : padded.length;
      row[KEY_MAP[j]] = padded.slice(start, end).trim();
    }
    rows.push(row);
  }
  return rows;
}

export default defineComponent({
  name: 'ActiveConnectionsPage',
  setup() {
    const loading = ref(false);
    const rows = ref([]);
    const protocolFilter = ref('');
    const stateFilter = ref('');

    const columns = [
      { key: 'proto', title: '协议' },
      { key: 'recv_q', title: '接收队列' },
      { key: 'send_q', title: '发送队列' },
      { key: 'local_address', title: '本地地址' },
      { key: 'foreign_address', title: '外部地址' },
      { key: 'state', title: '状态' },
      { key: 'pid_program', title: 'PID/程序' },
    ];

    const protocolOptions = [
      { value: '', label: '全部协议' },
      { value: 'tcp', label: 'TCP' },
      { value: 'tcp6', label: 'TCP6' },
      { value: 'udp', label: 'UDP' },
      { value: 'udp6', label: 'UDP6' },
    ];

    const stateOptions = computed(() => {
      const states = new Set();
      rows.value.forEach(r => {
        const s = r.state || '';
        states.add(s);
      });
      const opts = [{ value: '', label: '全部状态' }];
      Array.from(states).sort().forEach(s => {
        opts.push({ value: s, label: s || '无' });
      });
      return opts;
    });

    const filteredRows = computed(() => {
      return rows.value.filter(r => {
        const protoOk = !protocolFilter.value || r.proto === protocolFilter.value;
        const stateOk = !stateFilter.value || (r.state || '') === stateFilter.value;
        return protoOk && stateOk;
      });
    });

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('ip ports');
        rows.value = parseIpPorts(res.output || '');
      } catch (e) {
        showError(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {
      loading,
      rows,
      filteredRows,
      columns,
      protocolFilter,
      stateFilter,
      protocolOptions,
      stateOptions,
      load,
    };
  },
  components: { DataTable, ToolbarButton, HelpButton },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <select v-model="protocolFilter" title="协议过滤">
            <option v-for="opt in protocolOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="stateFilter" title="状态过滤">
            <option v-for="opt in stateOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          <HelpButton routePath="/monitor/network/active-connections" />
        </div>
      </div>
      <DataTable
        :columns="columns"
        :data="filteredRows"
        :loading="loading"
        :selectable="false"
        :actions="[]"
        rowKey="id"
      />
    </div>
  `,
});
