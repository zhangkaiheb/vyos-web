import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick } from '/src/utils/vue-import.js';
import { monitorApi } from '/src/api/index.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function drawLineChart(canvas, data, label, color = '#5B9BD5') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth || 300;
  const height = canvas.height = canvas.clientHeight || 160;
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
    const y = height - ((v - min) / range) * (height - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.font = '12px sans-serif';
  ctx.fillText(label, 8, 16);
}

const STORAGE_KEY = 'monitorDashboardLayout';

const DEFAULT_WIDGETS = [
  { id: 'cpu', title: 'CPU 使用率', type: 'cpu', metric: 'usage', duration: '24h', interface: '', data: [], value: 0 },
  { id: 'memory', title: '内存 使用率', type: 'memory', metric: 'usage', duration: '24h', interface: '', data: [], value: 0 },
  { id: 'conntrack', title: 'Conntrack 数量', type: 'conntrack', metric: 'count', duration: '1d', interface: '', data: [], value: 0 },
];

const AVAILABLE_WIDGETS = [
  { type: 'cpu', title: 'CPU 使用率', metric: 'usage', duration: '24h', multi: false },
  { type: 'memory', title: '内存 使用率', metric: 'usage', duration: '24h', multi: false },
  { type: 'conntrack', title: 'Conntrack 数量', metric: 'count', duration: '1d', multi: false },
  { type: 'interface-traffic', title: '接口流量', metric: 'traffic', duration: '24h', multi: true },
];

export default defineComponent({
  name: 'MonitorDashboard',
  setup() {
    const widgets = ref([]);
    const interfaces = ref([]);
    const canvases = ref({});
    const timer = ref(null);
    const modalVisible = ref(false);
    const selectedAddInterface = ref('');
    let dragIndex = null;

    function loadLayout() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          widgets.value = parsed.map(w => ({ ...w, data: [], value: 0 }));
          return;
        }
      } catch (e) {}
      widgets.value = DEFAULT_WIDGETS.map(w => ({ ...w }));
    }

    function saveLayout() {
      try {
        const payload = widgets.value.map(w => ({
          id: w.id,
          title: w.title,
          type: w.type,
          metric: w.metric,
          duration: w.duration,
          interface: w.interface || '',
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}
    }

    async function fetchInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = res.interfaces || [];
        if (interfaces.value.length && !selectedAddInterface.value) {
          selectedAddInterface.value = interfaces.value[0];
        }
      } catch (e) {}
    }

    async function fetchWidget(w) {
      try {
        const iface = w.interface || '';
        const res = await monitorApi.get(w.type, iface, w.duration);
        if (res.value !== undefined) w.value = res.value;
        const hist = await monitorApi.history(w.type, w.metric, w.duration, iface || null);
        w.data = hist.data || [];
      } catch (e) {}
    }

    async function loadAll() {
      await fetchInterfaces();
      for (const w of widgets.value) {
        await fetchWidget(w);
      }
      await nextTick();
      widgets.value.forEach(w => drawWidget(w));
    }

    function drawWidget(w) {
      const c = canvases.value[w.id];
      if (!c) return;
      let label = `${w.title}: ${w.value}`;
      if (w.type === 'cpu' || w.type === 'memory') label += '%';
      else if (w.type === 'interface-traffic') label += ' bps';
      drawLineChart(c, w.data, label);
    }

    function canAddWidget(item) {
      if (item.multi) return true;
      return !widgets.value.some(w => w.type === item.type);
    }

    function isWidgetAdded(item) {
      if (item.multi) return false;
      return widgets.value.some(w => w.type === item.type);
    }

    function addWidget(item) {
      if (!canAddWidget(item)) return;
      if (item.type === 'interface-traffic') {
        const iface = selectedAddInterface.value;
        if (!iface) return;
        const id = `if-${iface}-${Date.now()}`;
        widgets.value.push({
          id,
          title: `接口流量 ${iface}`,
          type: 'interface-traffic',
          metric: 'traffic',
          duration: item.duration,
          interface: iface,
          data: [],
          value: 0,
        });
      } else {
        const id = `${item.type}-${Date.now()}`;
        widgets.value.push({
          id,
          title: item.title,
          type: item.type,
          metric: item.metric,
          duration: item.duration,
          interface: '',
          data: [],
          value: 0,
        });
      }
      saveLayout();
      const w = widgets.value[widgets.value.length - 1];
      fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
    }

    function removeWidget(w) {
      widgets.value = widgets.value.filter(x => x.id !== w.id);
      saveLayout();
    }

    function configureWidget(w) {
      if (w.type === 'interface-traffic' && w.interface) {
        w.title = `接口流量 ${w.interface}`;
      }
      saveLayout();
      fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
    }

    function onDragStart(index) {
      dragIndex = index;
    }

    function onDragOver(e, index) {
      e.preventDefault();
    }

    function onDrop(index) {
      if (dragIndex === null || dragIndex === index) return;
      const list = [...widgets.value];
      const [moved] = list.splice(dragIndex, 1);
      list.splice(index, 0, moved);
      widgets.value = list;
      dragIndex = null;
      saveLayout();
    }

    watch(widgets, () => {
      nextTick(() => widgets.value.forEach(drawWidget));
    }, { deep: true });

    onMounted(() => {
      loadLayout();
      loadAll();
      timer.value = setInterval(loadAll, 30000);
    });
    onUnmounted(() => {
      if (timer.value) clearInterval(timer.value);
    });

    return {
      widgets,
      interfaces,
      canvases,
      modalVisible,
      selectedAddInterface,
      AVAILABLE_WIDGETS,
      addWidget,
      removeWidget,
      configureWidget,
      onDragStart,
      onDragOver,
      onDrop,
      isWidgetAdded,
    };
  },
  components: { DraggableModal, ToolbarButton },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <ToolbarButton icon="addWidget" @click="modalVisible = true">控件</ToolbarButton>
        </div>
      </div>
      <div class="widget-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:16px;">
        <div
          v-for="(w, index) in widgets"
          :key="w.id"
          class="widget-card"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover="onDragOver($event, index)"
          @drop="onDrop(index)"
          style="border:1px solid #ddd;border-radius:4px;background:#fff;cursor:move;"
        >
          <div class="widget-header" style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(#f0f0f0,#e0e0e0);padding:8px;">
            <span>{{ w.title }}</span>
            <div style="display:flex;gap:4px;align-items:center;">
              <select v-if="w.type === 'interface-traffic'" v-model="w.interface" @change="configureWidget(w)" style="font-size:12px;max-width:120px;">
                <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
              </select>
              <select v-model="w.duration" @change="configureWidget(w)" style="font-size:12px;">
                <option value="1h">1h</option>
                <option value="12h">12h</option>
                <option value="1d">1d</option>
                <option value="1w">1w</option>
                <option value="24h">24h</option>
              </select>
              <button style="padding:2px 6px;" @click="removeWidget(w)">×</button>
            </div>
          </div>
          <div class="widget-body" style="padding:8px;">
            <canvas :ref="el => { if(el) canvases[w.id] = el }" style="width:100%;height:160px;background:#fff;"></canvas>
          </div>
        </div>
      </div>
      <DraggableModal v-model:visible="modalVisible" title="添加控件" width="520px" @confirm="modalVisible = false">
        <div style="padding:8px 0;">
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;">
            <div
              v-for="item in AVAILABLE_WIDGETS"
              :key="item.type"
              @click="addWidget(item)"
              :style="{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: isWidgetAdded(item) ? 'not-allowed' : 'pointer',
                background: isWidgetAdded(item) ? '#f0f0f0' : '#fff',
                opacity: isWidgetAdded(item) ? 0.6 : 1,
              }"
            >
              <div style="font-weight:bold;margin-bottom:4px;">{{ item.title }}</div>
              <div style="font-size:12px;color:#666;">
                {{ item.multi ? '可添加多个' : '仅可添加一个' }}
              </div>
            </div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
