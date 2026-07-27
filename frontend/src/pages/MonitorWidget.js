import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { monitorApi, opModeApi } from '/src/api/index.js';
import DataTable from '/src/components/Table/DataTable.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function drawLineChart(canvas, data, label, color = '#5B9BD5') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth || 600;
  const height = canvas.height = canvas.clientHeight || 240;
  ctx.clearRect(0, 0, width, height);
  if (!data || !data.length) {
    ctx.fillStyle = '#999';
    ctx.fillText('No data', 10, height / 2);
    return;
  }
  const values = data.map(d => parseFloat(d.value) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * (height - 30) - 15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.font = '14px sans-serif';
  ctx.fillText(label, 10, 20);
}

function isSeparator(line) {
  return /^\s*-+(\s+-+)*\s*$/.test(line);
}

function parseFixedTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));

  function parseDashSegments(headerLine, sepLine, startIdx) {
    const segments = [];
    const dashRe = /-+/g;
    let m;
    while ((m = dashRe.exec(sepLine)) !== null) {
      segments.push({ start: m.index, end: m.index + m[0].length });
    }
    const colNames = segments.map(seg => headerLine.slice(seg.start, seg.end).trim().toLowerCase().replace(/\s+/g, '_'));
    const result = [];
    for (let i = startIdx; i < lines.length; i++) {
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

  function parseHeaderGaps(headerLine, startIdx) {
    const starts = [];
    const n = headerLine.length;
    if (n && headerLine[0] !== ' ') starts.push(0);
    let i = 0;
    while (i < n) {
      if (headerLine[i] === ' ') {
        let j = i;
        while (j < n && headerLine[j] === ' ') j++;
        if (j - i >= 2) {
          if (j < n) starts.push(j);
          i = j;
          continue;
        }
        i++;
        continue;
      }
      i++;
    }
    const cols = starts.map((s, idx) => {
      const e = starts[idx + 1] !== undefined ? starts[idx + 1] : headerLine.length;
      return { start: s, name: headerLine.slice(s, e).trim() };
    });
    const result = [];
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const row = {};
      let hasData = false;
      cols.forEach((col, idx) => {
        const end = cols[idx + 1] ? cols[idx + 1].start : line.length;
        const value = col.start < line.length ? line.slice(col.start, end).trim() : '';
        row[col.name.toLowerCase().replace(/\s+/g, '_')] = value;
        if (value) hasData = true;
      });
      if (hasData) result.push(row);
    }
    return result;
  }

  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isSeparator(lines[i])) {
      sepIdx = i;
      break;
    }
  }

  if (sepIdx > 0) {
    const headerIdx = sepIdx - 1;
    const startIdx = sepIdx + 1;
    if (lines[sepIdx].trim().indexOf(' ') === -1) {
      return parseHeaderGaps(lines[headerIdx], startIdx);
    }
    return parseDashSegments(lines[headerIdx], lines[sepIdx], startIdx);
  }

  const headerIdx = lines.findIndex(l => l.trim());
  if (headerIdx === -1) return [];
  return parseHeaderGaps(lines[headerIdx], headerIdx + 1);
}

const CONNTRACK_COLUMNS = [
  { key: 'id', title: 'Id' },
  { key: 'original_src', title: 'Original src' },
  { key: 'original_dst', title: 'Original dst' },
  { key: 'reply_src', title: 'Reply src' },
  { key: 'reply_dst', title: 'Reply dst' },
  { key: 'protocol', title: 'Protocol' },
  { key: 'state', title: 'State' },
  { key: 'timeout', title: 'Timeout' },
  { key: 'mark', title: 'Mark' },
  { key: 'zone', title: 'Zone' },
];

export default defineComponent({
  name: 'MonitorWidget',
  setup() {
    const route = useRoute();
    const type = computed(() => {
      const parts = route.path.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'monitor') {
        if (parts[1] === 'interface-traffic') return 'interface-traffic';
        if (parts[1] === 'conntrack') return 'conntrack';
      }
      return parts[parts.length - 1];
    });
    const title = computed(() => route.meta?.menuItem?.label || type.value);
    const isConntrack = computed(() => type.value === 'conntrack');
    const isInterface = computed(() => type.value === 'interface-traffic');
    const duration = ref('24h');
    const data = ref([]);
    const value = ref(0);
    const interfaces = ref([]);
    const selectedInterface = ref('');
    const canvas = ref(null);
    const timer = ref(null);
    const eventSource = ref(null);

    const activeTab = ref('ipv4');
    const ipv4Data = ref([]);
    const ipv6Data = ref([]);
    const ipv4Count = computed(() => ipv4Data.value.length);
    const ipv6Count = computed(() => ipv6Data.value.length);
    const tableLoading = ref(false);

    async function fetchInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = res.interfaces || [];
        if (interfaces.value.length && !selectedInterface.value) {
          selectedInterface.value = interfaces.value[0];
        }
      } catch (e) {}
    }

    async function loadConntrack() {
      tableLoading.value = true;
      try {
        const [r4, r6] = await Promise.all([
          opModeApi.show('conntrack table ipv4').catch(() => ({ output: '' })),
          opModeApi.show('conntrack table ipv6').catch(() => ({ output: '' })),
        ]);
        ipv4Data.value = parseFixedTable(r4.output || '');
        ipv6Data.value = parseFixedTable(r6.output || '');
      } catch (e) {
        ipv4Data.value = [];
        ipv6Data.value = [];
      }
      tableLoading.value = false;
    }

    async function load() {
      if (isConntrack.value) {
        await loadConntrack();
        return;
      }
      const t = type.value;
      const metric = t === 'conntrack' ? 'count' : 'usage';
      const iface = isInterface.value ? selectedInterface.value : '';
      try {
        const res = await monitorApi.get(t, iface, duration.value);
        if (res.value !== undefined) value.value = res.value;
        const hist = await monitorApi.history(t, metric, duration.value, iface || null);
        data.value = hist.data || [];
      } catch (e) {
        data.value = [];
      }
      const label = `${title.value}: ${value.value}${t === 'cpu' || t === 'memory' ? '%' : ''}`;
      drawLineChart(canvas.value, data.value, label);
    }

    function startStream() {
      if (eventSource.value) { eventSource.value.close(); }
      if (isConntrack.value) return;
      const params = new URLSearchParams({ type: type.value, interval: '2' });
      if (isInterface.value && selectedInterface.value) params.set('interface', selectedInterface.value);
      eventSource.value = new EventSource(`/api/monitor/stream?${params.toString()}`);
      eventSource.value.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.value !== undefined) value.value = msg.value;
          if (msg.data) value.value = msg.data;
        } catch (err) {}
      };
    }

    onMounted(async () => {
      if (isInterface.value) await fetchInterfaces();
      await load();
      startStream();
      timer.value = setInterval(load, 30000);
    });
    onUnmounted(() => {
      if (timer.value) clearInterval(timer.value);
      if (eventSource.value) eventSource.value.close();
    });
    watch([type, duration, selectedInterface], () => { load(); startStream(); });

    return {
      title,
      type,
      duration,
      value,
      canvas,
      interfaces,
      selectedInterface,
      isInterface,
      isConntrack,
      load,
      activeTab,
      ipv4Data,
      ipv6Data,
      ipv4Count,
      ipv6Count,
      tableLoading,
      loadConntrack,
      conntrackColumns: CONNTRACK_COLUMNS,
    };
  },
  components: { DataTable, TabGroup, ToolbarButton },
  template: `
    <div>
      <div class="toolbar compact-toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <span>{{ title }}</span>
          <select v-if="isInterface" v-model="selectedInterface">
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
          <select v-if="!isConntrack" v-model="duration" @change="load">
            <option value="1h">1h</option>
            <option value="12h">12h</option>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
            <option value="24h">24h</option>
          </select>
          <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
        </div>
      </div>
      <div v-if="isConntrack" style="padding:16px;">
        <TabGroup :tabs="[{ key: 'ipv4', title: 'IPv4' }, { key: 'ipv6', title: 'IPv6' }]" v-model="activeTab">
          <template #ipv4>
            <DataTable
              :columns="conntrackColumns"
              :data="ipv4Data"
              :selectable="false"
              :actions="['refresh']"
              :loading="tableLoading"
              tableKey="conntrack-ipv4"
              rowKey="id"
              @refresh="loadConntrack"
            >
              <template #toolbar-left-extra>
                <span style="display:flex;align-items:center;gap:16px;margin-left:8px;">
                  <span>总数：{{ ipv4Count }}</span>
                </span>
              </template>
            </DataTable>
          </template>
          <template #ipv6>
            <DataTable
              :columns="conntrackColumns"
              :data="ipv6Data"
              :selectable="false"
              :actions="['refresh']"
              :loading="tableLoading"
              tableKey="conntrack-ipv6"
              rowKey="id"
              @refresh="loadConntrack"
            >
              <template #toolbar-left-extra>
                <span style="display:flex;align-items:center;gap:16px;margin-left:8px;">
                  <span>总数：{{ ipv6Count }}</span>
                </span>
              </template>
            </DataTable>
          </template>
        </TabGroup>
      </div>
      <div v-else style="padding:16px;">
        <canvas ref="canvas" style="width:100%;height:400px;background:#fff;border:1px solid #ddd;border-radius:4px;"></canvas>
      </div>
    </div>
  `,
});
