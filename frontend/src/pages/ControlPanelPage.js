import { defineComponent, ref, computed, onMounted, nextTick } from '/src/utils/vue-import.js';
import { opModeApi, systemApi } from '/src/api/index.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

function isSeparator(line) {
  return /^\s*-+(\s+-+)*\s*$/.test(line);
}

function parseFixedTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));

  function headerStarts(header) {
    const starts = [];
    const n = header.length;
    if (n && header[0] !== ' ') starts.push(0);
    let i = 0;
    while (i < n) {
      if (header[i] === ' ') {
        let j = i;
        while (j < n && header[j] === ' ') j++;
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
    return starts;
  }

  function lineRegions(line) {
    const regions = [];
    const n = line.length;
    let i = 0;
    while (i < n) {
      if (line[i] === ' ') {
        let j = i;
        while (j < n && line[j] === ' ') j++;
        if (j - i >= 2) { i = j; continue; }
        i++;
        continue;
      }
      const start = i;
      while (i < n) {
        if (line[i] === ' ') {
          let j = i;
          while (j < n && line[j] === ' ') j++;
          if (j - i >= 2) break;
          i = j;
          continue;
        }
        i++;
      }
      regions.push({ start, end: i, text: line.slice(start, i).trim() });
    }
    return regions;
  }

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
    const starts = headerStarts(headerLine);
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

  function parseTokens(headerLine, startIdx) {
    const headerTokens = [];
    const tokenRe = /\S+/g;
    let mm;
    while ((mm = tokenRe.exec(headerLine)) !== null) {
      headerTokens.push({ text: mm[0], start: mm.index, end: mm.index + mm[0].length });
    }
    const dataLines = lines.slice(startIdx).filter(l => l.trim());
    if (!dataLines.length || !headerTokens.length) return [];
    const firstRegions = lineRegions(dataLines[0]);
    const groups = firstRegions.map(() => []);
    headerTokens.forEach(t => {
      const tc = (t.start + t.end) / 2;
      let best = -1;
      let bestDist = Infinity;
      firstRegions.forEach((r, idx) => {
        const rc = (r.start + r.end) / 2;
        const dist = Math.abs(tc - rc);
        if (dist < bestDist) { bestDist = dist; best = idx; }
      });
      if (best >= 0) groups[best].push(t);
    });
    const colNames = groups.map(g => g.sort((a, b) => a.start - b.start).map(t => t.text).join(' '));
    const result = [];
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      let values = lineRegions(line).map(r => r.text);
      if (values.length !== colNames.length) {
        values = line.trim().split(/\s+/);
      }
      const row = {};
      let hasData = false;
      colNames.forEach((name, idx) => {
        const value = values[idx] !== undefined ? values[idx] : '';
        row[name.toLowerCase().replace(/\s+/g, '_')] = value;
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

  let headerIdx;
  let startIdx;
  if (sepIdx > 0) {
    headerIdx = sepIdx - 1;
    startIdx = sepIdx + 1;
    if (lines[sepIdx].trim().indexOf(' ') === -1) {
      return parseTokens(lines[headerIdx], startIdx);
    }
    return parseDashSegments(lines[headerIdx], lines[sepIdx], startIdx);
  }
  headerIdx = lines.findIndex(l => l.trim());
  if (headerIdx === -1) return [];
  startIdx = headerIdx + 1;
  return parseHeaderGaps(lines[headerIdx], startIdx);
}

function parseKeyValue(output) {
  const result = {};
  for (const line of String(output || '').split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      const value = line.slice(idx + 1).trim();
      if (key) result[key] = value;
    }
  }
  return result;
}

function parseMemory(output) {
  const result = {};
  const text = String(output || '');
  const m = text.match(/Total:\s*([^\n]+?)\s+Free:\s*([^\n]+?)\s+Used:\s*([^\n]+?)(?:\s|$)/);
  if (m) {
    result.total = m[1].trim();
    result.free = m[2].trim();
    result.used = m[3].trim();
  }
  return result;
}

function parseCpu(output) {
  const blocks = String(output || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  let model = '';
  let currentMhz = '';
  let totalCores = 0;
  let sockets = 0;
  for (const block of blocks) {
    const info = parseKeyValue(block);
    if (!model && info.model) model = info.model;
    if (!currentMhz && info.current_mhz) currentMhz = info.current_mhz;
    const cores = parseInt(info.cores, 10);
    if (!isNaN(cores)) totalCores += cores;
    sockets++;
  }
  return { model, cores: totalCores, sockets, current_mhz: currentMhz };
}

function parseDisk(output) {
  const lines = String(output || '').split('\n');
  const info = {};
  for (const line of lines) {
    if (line.startsWith('Disk /dev/')) {
      const m = line.match(/Disk \/dev\/[^:]+:\s*([^,]+)/);
      if (m) info.size = m[1].trim();
    } else if (line.startsWith('Disk model:')) {
      info.model = line.slice(line.indexOf(':') + 1).trim();
    }
  }
  info.partitions = parseFixedTable(output);
  return info;
}

function parseScsi(output) {
  const result = [];
  const re = /^(\[[^\]]+\])\s+(\S+)\s+(.+?)\s+(\S+(?:\.\d+)?)\s+(\/dev\/\S+)$/;
  for (const line of String(output || '').split('\n')) {
    const trimmed = line.trim();
    const m = trimmed.match(re);
    if (m) {
      const middle = m[3].trim().split(/\s{2,}/);
      result.push({
        address: m[1],
        type: m[2],
        vendor: middle[0] || '',
        product: middle.slice(1).join(' ') || '',
        revision: m[4],
        device: m[5],
      });
    }
  }
  return result;
}

const STORAGE_KEY = 'controlPanelLayout';

const WIDGET_CATEGORIES = [
  { key: 'system', title: '系统信息' },
  { key: 'users', title: '用户' },
  { key: 'hardware', title: '硬件' },
  { key: 'tools', title: '工具' },
];

const WIDGET_ORDER = [
  'cpu', 'memory', 'disk', 'login', 'version', 'date',
  'users', 'storageScsi', 'storageNvme', 'storageSmart',
  'usb', 'image', 'systemLoginUsers', 'webshell',
];

const WIDGET_META = {
  cpu: { title: 'CPU', category: 'system', wide: false },
  memory: { title: '内存', category: 'system', wide: false },
  disk: { title: '磁盘', category: 'system', wide: false },
  login: { title: '当前登录', category: 'system', wide: false },
  version: { title: '系统版本', category: 'system', wide: false },
  date: { title: '系统时间', category: 'system', wide: false },
  users: { title: '当前用户', category: 'users', wide: false },
  storageScsi: { title: 'SCSI 存储设备', category: 'hardware', wide: false },
  storageNvme: { title: 'NVMe 存储设备', category: 'hardware', wide: false },
  storageSmart: { title: 'SMART 信息', category: 'hardware', wide: false },
  usb: { title: 'USB 设备', category: 'hardware', wide: false },
  image: { title: '系统镜像', category: 'system', wide: false },
  systemLoginUsers: { title: '系统登录用户', category: 'users', wide: true },
  webshell: { title: 'Web Shell', category: 'tools', wide: false },
};

const WidgetHeader = defineComponent({
  name: 'WidgetHeader',
  props: {
    title: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
  },
  emits: ['refresh', 'toggle', 'close'],
  template: `
    <div class="widget-header">
      <span class="widget-title">{{ title }}</span>
      <div class="widget-actions">
        <span v-if="loading" class="widget-loading">加载中...</span>
        <button class="widget-action-btn widget-action-refresh" title="刷新" @click.stop="$emit('refresh')">↻</button>
        <button class="widget-action-btn widget-action-toggle" :title="collapsed ? '展开' : '折叠'" @click.stop="$emit('toggle')">{{ collapsed ? '▶' : '▼' }}</button>
        <button class="widget-action-btn widget-action-close" title="关闭" @click.stop="$emit('close')">✕</button>
      </div>
    </div>
  `,
});

function createDefaultData(key, wide) {
  if (key === 'usb' || key === 'date') return '';
  if (key === 'webshell') return [];
  return wide ? [] : {};
}

function createDefaultWidgets() {
  const result = {};
  for (const key of WIDGET_ORDER) {
    const meta = WIDGET_META[key];
    result[key] = {
      title: meta.title,
      loading: false,
      error: '',
      data: createDefaultData(key, meta.wide),
      raw: '',
      visible: true,
      collapsed: false,
      category: meta.category,
      wide: meta.wide,
    };
  }
  return result;
}

export default defineComponent({
  name: 'ControlPanelPage',
  setup() {
    const widgets = ref(createDefaultWidgets());
    const widgetOrder = ref([...WIDGET_ORDER]);

    const widgetItems = [
      { key: 'cpu', command: 'system cpu', parser: parseCpu },
      { key: 'memory', command: 'system memory', parser: parseMemory },
      { key: 'disk', command: 'disk sda format', parser: parseDisk },
      { key: 'login', command: 'login', parser: parseKeyValue },
      { key: 'version', command: 'version', parser: parseKeyValue },
      { key: 'users', command: 'users', parser: parseFixedTable },
      { key: 'date', command: 'date', parser: (raw) => raw.trim() },
      { key: 'storageScsi', command: 'hardware storage scsi', parser: parseScsi },
      { key: 'storageNvme', command: 'hardware storage nvme', parser: parseFixedTable },
      { key: 'storageSmart', command: 'hardware storage smart sda', parser: parseKeyValue },
      { key: 'usb', command: 'hardware usb', parser: (raw) => raw.trim() },
      { key: 'image', command: 'system image details', parser: parseFixedTable },
      { key: 'systemLoginUsers', command: 'system login users', parser: parseFixedTable },
    ];

    const modalVisible = ref(false);
    const searchKeyword = ref('');
    let dragIndex = null;

    // Webshell state
    const webshellOutput = ref([]);
    const webshellLoading = ref(false);
    const webshellOutputEl = ref(null);
    const webshellPrompt = 'vyos@vyos:~$ ';
    const webshellInput = ref('');
    const webshellInputEl = ref(null);

    async function webshellExecute() {
      const cmd = webshellInput.value.trim();
      if (!cmd) return;
      // Add command line to output
      webshellOutput.value.push({ type: 'cmd', text: webshellPrompt + cmd });
      webshellLoading.value = true;
      try {
        const token = localStorage.getItem('vyos_token') || '';
        const res = await fetch('/api/system/shell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ command: cmd }),
        });
        const json = await res.json().catch(() => ({}));
        const output = json.output || json.message || '';
        if (output) {
          const lines = output.split(/\r?\n/);
          for (const line of lines) {
            webshellOutput.value.push({ type: 'out', text: line });
          }
        }
      } catch (e) {
        webshellOutput.value.push({ type: 'err', text: e.message });
      } finally {
        webshellLoading.value = false;
        webshellInput.value = '';
        await nextTick();
        if (webshellOutputEl.value) webshellOutputEl.value.scrollTop = webshellOutputEl.value.scrollHeight;
        if (webshellInputEl.value) webshellInputEl.value.focus();
      }
    }

    function webshellClear() {
      webshellOutput.value = [];
      webshellInput.value = '';
      if (webshellInputEl.value) webshellInputEl.value.focus();
    }

    function saveLayout() {
      try {
        const payload = {
          order: widgetOrder.value,
          states: widgetOrder.value.reduce((acc, key) => {
            const w = widgets.value[key];
            acc[key] = { visible: w.visible, collapsed: w.collapsed };
            return acc;
          }, {}),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}
    }

    function loadLayout() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const payload = JSON.parse(saved);
          const order = Array.isArray(payload.order) ? payload.order : [];
          const states = payload.states || {};
          const merged = [];
          for (const key of order) {
            if (WIDGET_ORDER.includes(key)) merged.push(key);
          }
          for (const key of WIDGET_ORDER) {
            if (!merged.includes(key)) merged.push(key);
          }
          widgetOrder.value = merged;
          for (const key of WIDGET_ORDER) {
            if (states[key]) {
              widgets.value[key].visible = states[key].visible !== false;
              widgets.value[key].collapsed = !!states[key].collapsed;
            }
          }
        }
      } catch (e) {}
    }

    const visibleOrder = computed(() => {
      return widgetOrder.value.filter(k => widgets.value[k] && widgets.value[k].visible);
    });

    const availableWidgets = computed(() => {
      return WIDGET_ORDER.filter(k => widgets.value[k] && !widgets.value[k].visible)
        .map(k => ({ key: k, title: widgets.value[k].title, category: widgets.value[k].category }));
    });

    const filteredWidgets = computed(() => {
      const kw = searchKeyword.value.trim().toLowerCase();
      if (!kw) return availableWidgets.value;
      return availableWidgets.value.filter(w => w.title.toLowerCase().includes(kw));
    });

    const categorizedWidgets = computed(() => {
      const result = [];
      for (const cat of WIDGET_CATEGORIES) {
        const items = filteredWidgets.value.filter(w => w.category === cat.key);
        if (items.length) result.push({ ...cat, items });
      }
      return result;
    });

    async function fetchWidget(key, command, parser) {
      const w = widgets.value[key];
      w.loading = true;
      w.error = '';
      try {
        const res = await opModeApi.show(command);
        w.raw = res.output || '';
        w.data = parser ? parser(w.raw) : w.raw;
      } catch (e) {
        w.error = e.message || '加载失败';
        w.raw = '';
        w.data = parser ? createDefaultData(key, widgets.value[key].wide) : '';
      } finally {
        w.loading = false;
      }
    }

    async function loadAll() {
      for (const item of widgetItems) {
        await fetchWidget(item.key, item.command, item.parser);
      }
    }

    function refreshWidget(key) {
      const item = widgetItems.find(i => i.key === key);
      if (item) fetchWidget(item.key, item.command, item.parser);
    }

    function closeWidget(key) {
      widgets.value[key].visible = false;
      saveLayout();
    }

    function toggleCollapse(key) {
      widgets.value[key].collapsed = !widgets.value[key].collapsed;
      saveLayout();
    }

    function addWidget(key) {
      widgets.value[key].visible = true;
      widgets.value[key].collapsed = false;
      saveLayout();
      modalVisible.value = false;
      searchKeyword.value = '';
      const item = widgetItems.find(i => i.key === key);
      if (item) fetchWidget(item.key, item.command, item.parser);
    }

    function onDragStart(index) {
      dragIndex = index;
    }

    function onDragOver(e) {
      e.preventDefault();
    }

    function onDrop(index) {
      if (dragIndex === null || dragIndex === index) return;
      const list = [...visibleOrder.value];
      const [moved] = list.splice(dragIndex, 1);
      list.splice(index, 0, moved);
      widgetOrder.value = widgetOrder.value.map(k => (!widgets.value[k].visible ? k : list.shift()));
      dragIndex = null;
      saveLayout();
    }

    onMounted(() => {
      loadLayout();
      loadAll();
    });

    return {
      widgets,
      widgetOrder,
      visibleOrder,
      widgetItems,
      loadAll,
      refreshWidget,
      closeWidget,
      toggleCollapse,
      addWidget,
      modalVisible,
      searchKeyword,
      availableWidgets,
      filteredWidgets,
      categorizedWidgets,
      WIDGET_CATEGORIES,
      onDragStart,
      onDragOver,
      onDrop,
      webshellOutput,
      webshellLoading,
      webshellOutputEl,
      webshellPrompt,
      webshellExecute,
      webshellClear,
      webshellInput,
      webshellInputEl,
    };
  },
  components: { ToolbarButton, DraggableModal, WidgetHeader },
  template: `
    <div class="page-container">
      <div class="toolbar compact-toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="addWidget" @click="modalVisible = true">添加模块</ToolbarButton>
          <ToolbarButton icon="refresh" @click="loadAll">刷新全部</ToolbarButton>
        </div>
      </div>
      <div class="widget-grid">
        <div
          v-for="(key, index) in visibleOrder"
          :key="key"
          class="widget-card"
          :class="{'widget-wide': widgets[key].wide}"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover="onDragOver($event)"
          @drop="onDrop(index)"
        >
          <WidgetHeader
            :title="widgets[key].title"
            :loading="widgets[key].loading"
            :collapsed="widgets[key].collapsed"
            @refresh="refreshWidget(key)"
            @toggle="toggleCollapse(key)"
            @close="closeWidget(key)"
          ></WidgetHeader>
          <div v-show="!widgets[key].collapsed" class="widget-body">
            <div v-if="widgets[key].error" class="widget-error">{{ widgets[key].error }}</div>

            <template v-if="key === 'cpu'">
              <table class="widget-kv">
                <tbody>
                <tr><td class="widget-kv-key">型号</td><td class="widget-kv-value">{{ widgets.cpu.data.model || '-' }}</td></tr>
                <tr><td class="widget-kv-key">插槽数</td><td class="widget-kv-value">{{ widgets.cpu.data.sockets || '-' }}</td></tr>
                <tr><td class="widget-kv-key">核心总数</td><td class="widget-kv-value">{{ widgets.cpu.data.cores || '-' }}</td></tr>
                <tr><td class="widget-kv-key">当前主频</td><td class="widget-kv-value">{{ widgets.cpu.data.current_mhz ? widgets.cpu.data.current_mhz + ' MHz' : '-' }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'memory'">
              <table class="widget-kv">
                <tbody>
                <tr><td class="widget-kv-key">总量</td><td class="widget-kv-value">{{ widgets.memory.data.total || '-' }}</td></tr>
                <tr><td class="widget-kv-key">已用</td><td class="widget-kv-value">{{ widgets.memory.data.used || '-' }}</td></tr>
                <tr><td class="widget-kv-key">空闲</td><td class="widget-kv-value">{{ widgets.memory.data.free || '-' }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'disk'">
              <table class="widget-kv">
                <tbody>
                <tr><td class="widget-kv-key">总容量</td><td class="widget-kv-value">{{ widgets.disk.data.size || '-' }}</td></tr>
                <tr><td class="widget-kv-key">型号</td><td class="widget-kv-value">{{ widgets.disk.data.model || '-' }}</td></tr>
                <tr><td class="widget-kv-key">分区数</td><td class="widget-kv-value">{{ (widgets.disk.data.partitions || []).length }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'login'">
              <table class="widget-kv">
                <tbody>
                <tr v-for="(value, k) in widgets.login.data" :key="k"><td class="widget-kv-key">{{ k }}</td><td class="widget-kv-value">{{ value }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'version'">
              <table class="widget-kv">
                <tbody>
                <tr><td class="widget-kv-key">Version</td><td class="widget-kv-value">{{ widgets.version.data.version || '-' }}</td></tr>
                <tr><td class="widget-kv-key">Release train</td><td class="widget-kv-value">{{ widgets.version.data.release_train || '-' }}</td></tr>
                <tr><td class="widget-kv-key">Architecture</td><td class="widget-kv-value">{{ widgets.version.data.architecture || '-' }}</td></tr>
                <tr><td class="widget-kv-key">System type</td><td class="widget-kv-value">{{ widgets.version.data.system_type || '-' }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'date'">
              <div class="widget-value">{{ widgets.date.data || '-' }}</div>
            </template>

            <template v-else-if="key === 'users'">
              <table class="widget-table">
                <thead><tr><th>NAME</th><th>LINE</th><th>TIME</th><th>COMMENT</th></tr></thead>
                <tbody><tr v-for="(row, idx) in widgets.users.data" :key="idx"><td>{{ row.name }}</td><td>{{ row.line }}</td><td>{{ row.time }}</td><td>{{ row.comment }}</td></tr></tbody>
              </table>
            </template>

            <template v-else-if="key === 'storageScsi'">
              <table class="widget-table">
                <thead><tr><th>地址</th><th>类型</th><th>厂商</th><th>产品</th><th>版本</th><th>设备</th></tr></thead>
                <tbody><tr v-for="(row, idx) in widgets.storageScsi.data" :key="idx"><td>{{ row.address }}</td><td>{{ row.type }}</td><td>{{ row.vendor }}</td><td>{{ row.product }}</td><td>{{ row.revision }}</td><td>{{ row.device }}</td></tr></tbody>
              </table>
            </template>

            <template v-else-if="key === 'storageNvme'">
              <div v-if="!widgets.storageNvme.data.length" class="widget-empty">无 NVMe 设备</div>
              <table v-else class="widget-table">
                <thead><tr><th v-for="(col, cidx) in Object.keys(widgets.storageNvme.data[0])" :key="cidx">{{ col }}</th></tr></thead>
                <tbody><tr v-for="(row, idx) in widgets.storageNvme.data" :key="idx"><td v-for="(col, cidx) in Object.keys(widgets.storageNvme.data[0])" :key="cidx">{{ row[col] }}</td></tr></tbody>
              </table>
            </template>

            <template v-else-if="key === 'storageSmart'">
              <table class="widget-kv">
                <tbody>
                <tr><td class="widget-kv-key">Vendor</td><td class="widget-kv-value">{{ widgets.storageSmart.data.vendor || '-' }}</td></tr>
                <tr><td class="widget-kv-key">Product</td><td class="widget-kv-value">{{ widgets.storageSmart.data.product || '-' }}</td></tr>
                <tr><td class="widget-kv-key">User Capacity</td><td class="widget-kv-value">{{ widgets.storageSmart.data.user_capacity || '-' }}</td></tr>
                <tr><td class="widget-kv-key">Current Temperature</td><td class="widget-kv-value">{{ widgets.storageSmart.data.current_drive_temperature || '-' }}</td></tr>
                </tbody>
              </table>
            </template>

            <template v-else-if="key === 'usb'">
              <pre class="widget-pre">{{ widgets.usb.data || '无数据' }}</pre>
            </template>

            <template v-else-if="key === 'image'">
              <table class="widget-table">
                <thead><tr><th>名称</th><th>版本</th><th>只读存储</th><th>读写存储</th><th>总存储</th></tr></thead>
                <tbody><tr v-for="(row, idx) in widgets.image.data" :key="idx"><td>{{ row.name }}</td><td>{{ row.version }}</td><td>{{ row.storage_read_only }}</td><td>{{ row.storage_read_write }}</td><td>{{ row.storage_total }}</td></tr></tbody>
              </table>
            </template>

            <template v-else-if="key === 'systemLoginUsers'">
              <table class="widget-table">
                <thead><tr><th>用户名</th><th>类型</th><th>锁定</th><th>Tty</th><th>来源</th><th>最后登录</th></tr></thead>
                <tbody><tr v-for="(row, idx) in widgets.systemLoginUsers.data" :key="idx"><td>{{ row.username }}</td><td>{{ row.type }}</td><td>{{ row.locked }}</td><td>{{ row.tty }}</td><td>{{ row.from }}</td><td>{{ row.last_login }}</td></tr></tbody>
              </table>
            </template>

            <template v-else-if="key === 'webshell'">
              <div style="display:flex;flex-direction:column;height:360px;">
                <div ref="webshellOutputEl" style="flex:1;background:#1e1e1e;color:#d4d4d4;font-family:'Cascadia Code','Fira Code','Consolas',monospace;font-size:13px;padding:8px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;border-radius:4px 4px 0 0;">
                  <div v-for="(line, i) in webshellOutput" :key="i" :style="{ color: line.type === 'err' ? '#f14c4c' : line.type === 'cmd' ? '#dcdcaa' : '#d4d4d4' }">{{ line.text }}</div>
                </div>
                <div style="display:flex;align-items:center;background:#1e1e1e;padding:4px 8px;border-radius:0 0 4px 4px;cursor:text;" @click="$event.currentTarget.querySelector('input').focus()">
                  <span style="color:#6a9955;font-family:monospace;font-size:13px;white-space:nowrap;">{{ webshellPrompt }}</span>
                  <input v-model="webshellInput" @keyup.enter="webshellExecute" @wheel="webshellOutputEl && (webshellOutputEl.scrollTop += $event.deltaY)" style="flex:1;background:transparent;border:none;outline:none;color:#d4d4d4;font-family:monospace;font-size:13px;" :disabled="webshellLoading" />
                  <span style="display:inline-block;width:7px;height:15px;background:#d4d4d4;vertical-align:text-bottom;animation:blink 1s step-end infinite;"></span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <DraggableModal v-model:visible="modalVisible" title="添加模块" width="560px" @confirm="modalVisible = false">
        <div class="widget-add-search">
          <input v-model="searchKeyword" type="text" placeholder="搜索模块..." />
        </div>
        <div class="widget-add-groups">
          <div v-for="cat in categorizedWidgets" :key="cat.key" class="widget-add-group">
            <div class="widget-add-group-title">{{ cat.title }}</div>
            <div class="widget-add-grid">
              <div
                v-for="item in cat.items"
                :key="item.key"
                class="widget-add-item"
                @click="addWidget(item.key)"
              >
                <span class="widget-add-icon">▦</span>
                <span class="widget-add-name">{{ item.title }}</span>
              </div>
            </div>
          </div>
          <div v-if="!filteredWidgets.length" class="widget-add-empty">未找到匹配的模块</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
