import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';

function isCodesLine(line) {
  return line.startsWith('Codes:') || /^\S\s+-/.test(line);
}

function parseRoutes(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let section = '';
  const rows = [];
  let id = 0;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isCodesLine(line)) continue;

    const secMatch = line.match(/^(VRF .+?)(?:\s+table\s+(\d+))?:$/i) || line.match(/^Table\s+(\d+):$/i);
    if (secMatch) {
      if (secMatch[2]) {
        section = `${secMatch[1]} table ${secMatch[2]}`;
      } else if (/^Table\s+/i.test(line)) {
        section = `Table ${secMatch[1]}`;
      } else {
        section = secMatch[1];
      }
      continue;
    }

    const m = line.match(/^(\S+)\s+(\S+)(?:\s+(\[[^\]]+\]))?\s+(.*)$/);
    if (!m) continue;

    const code = m[1];
    const prefix = m[2];
    const metric = m[3] || '';
    const rest = m[4];

    let type = '';
    let nextHop = '';
    let iface = '';
    let weight = '';
    let uptime = '';

    const viaMatch = rest.match(/^via\s+([^,]+)(?:,\s*([^,]+))?(?:,\s*weight\s+(\d+))?(?:,\s*(.+))?$/);
    if (viaMatch) {
      type = 'via';
      nextHop = viaMatch[1] ? viaMatch[1].trim() : '';
      iface = viaMatch[2] ? viaMatch[2].trim() : '';
      weight = viaMatch[3] || '';
      uptime = viaMatch[4] ? viaMatch[4].trim() : '';
    } else {
      const dcMatch = rest.match(/^is\s+directly\s+connected,\s*([^,]+)(?:,\s*(.+))?$/i);
      if (dcMatch) {
        type = 'directly connected';
        iface = dcMatch[1] ? dcMatch[1].trim() : '';
        uptime = dcMatch[2] ? dcMatch[2].trim() : '';
      } else {
        const parts = rest.split(',').map(p => p.trim());
        if (parts.length > 1) {
          type = parts[0];
          uptime = parts[parts.length - 1];
          iface = parts.slice(1, -1).join(', ');
        } else {
          type = rest;
        }
      }
    }

    rows.push({ id: ++id, section, code, prefix, metric, type, next_hop: nextHop, interface: iface, weight, uptime });
  }
  return rows;
}

export default defineComponent({
  name: 'RoutePage',
  setup() {
    const loading = ref(false);
    const rows = ref([]);
    const rawOutput = ref('');
    const selectedType = ref('');
    const prefix = ref('');

    const typeOptions = [
      { value: '', label: '全部' },
      { value: 'connected', label: '已连接' },
      { value: 'static', label: '静态' },
      { value: 'bgp', label: 'BGP' },
      { value: 'ospf', label: 'OSPF' },
      { value: 'rip', label: 'RIP' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: '内核' },
      { value: 'table all', label: '全部路由表' },
      { value: 'vrf all', label: '全部VRF' },
    ];

    const columns = [
      { key: 'section', title: 'VRF/表' },
      { key: 'code', title: '代码' },
      { key: 'prefix', title: '目标网络' },
      { key: 'metric', title: '度量' },
      { key: 'type', title: '类型' },
      { key: 'next_hop', title: '下一跳' },
      { key: 'interface', title: '接口' },
      { key: 'weight', title: '权重' },
      { key: 'uptime', title: '存活时间' },
    ];

    async function load() {
      loading.value = true;
      try {
        let command = 'ip route';
        const p = prefix.value.trim();
        if (p) {
          command += ' ' + p;
        } else if (selectedType.value) {
          command += ' ' + selectedType.value;
        }
        const res = await opModeApi.show(command);
        if (p) {
          rawOutput.value = res.output || '';
          rows.value = [];
        } else {
          rawOutput.value = '';
          rows.value = parseRoutes(res.output || '');
        }
      } catch (e) {
        showError(e);
        rows.value = [];
        rawOutput.value = '';
      } finally {
        loading.value = false;
      }
    }

    function onTypeChange() {
      prefix.value = '';
      load();
    }

    onMounted(load);

    return { loading, rows, rawOutput, columns, typeOptions, selectedType, prefix, load, onTypeChange };
  },
  components: { DataTable, ToolbarButton, HelpButton },
  template: `
    <div class="page-container">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <select v-model="selectedType" @change="onTypeChange" title="路由类型">
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input v-model="prefix" @keyup.enter="load" placeholder="前缀 / IP" title="按前缀或IP过滤" />
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          <HelpButton routePath="/monitor/network/route" />
        </div>
      </div>
      <DataTable
        v-if="!rawOutput"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :selectable="false"
        :actions="[]"
        rowKey="id"
      />
      <pre v-else class="raw-output">{{ rawOutput }}</pre>
    </div>
  `,
});
