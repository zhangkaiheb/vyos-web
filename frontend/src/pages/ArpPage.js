import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi, monitorApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

function parseArpTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const headerIdx = lines.findIndex(l => l.trim());
  if (headerIdx < 0) return [];
  if (lines[headerIdx + 1] && isSeparator(lines[headerIdx + 1])) {
    return parseFixedTable(output);
  }
  const result = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 5) {
      result.push({
        address: parts[0],
        hwtype: parts[1],
        hwaddress: parts[2],
        flags_mask: parts[3],
        iface: parts[4],
      });
    } else if (parts.length === 4) {
      result.push({
        address: parts[0],
        hwtype: parts[1],
        hwaddress: parts[2],
        flags_mask: '',
        iface: parts[3],
      });
    }
  }
  return result;
}

export default defineComponent({
  name: 'ArpPage',
  setup() {
    const loading = ref(false);
    const rows = ref([]);
    const interfaces = ref([]);
    const selectedInterface = ref('');

    const columns = [
      { key: 'address', title: '地址' },
      { key: 'hwtype', title: '硬件类型' },
      { key: 'hwaddress', title: 'MAC 地址' },
      { key: 'flags_mask', title: '标志掩码' },
      { key: 'iface', title: '接口' },
    ];

    async function fetchInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = res.interfaces || [];
      } catch (e) {}
    }

    async function load() {
      loading.value = true;
      try {
        let command = 'protocols static arp';
        if (selectedInterface.value) {
          command += ' interface ' + selectedInterface.value;
        }
        const res = await opModeApi.show(command);
        rows.value = parseArpTable(res.output || '');
      } catch (e) {
        showError(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(async () => {
      await fetchInterfaces();
      await load();
    });

    return { loading, rows, columns, interfaces, selectedInterface, load };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <select v-model="selectedInterface" @change="load" title="按接口过滤">
            <option value="">全部接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :selectable="false"
        :actions="[]"
        rowKey="address"
      />
    </div>
  `,
});
