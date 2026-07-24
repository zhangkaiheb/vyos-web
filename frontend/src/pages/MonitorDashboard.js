import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick } from '/src/utils/vue-import.js';
import { monitorApi } from '/src/api/index.js';

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

export default defineComponent({
  name: 'MonitorDashboard',
  setup() {
    const widgets = ref([
      { id: 'cpu', title: 'CPU', type: 'cpu', metric: 'usage', duration: '24h', data: [], value: 0 },
      { id: 'memory', title: 'Memory', type: 'memory', metric: 'usage', duration: '24h', data: [], value: 0 },
      { id: 'conntrack', title: 'Conntrack', type: 'conntrack', metric: 'count', duration: '1d', data: [], value: 0 },
    ]);
    const interfaces = ref([]);
    const selectedInterface = ref('');
    const canvases = ref({});
    const timer = ref(null);

    async function fetchInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = res.interfaces || [];
        if (interfaces.value.length && !selectedInterface.value) {
          selectedInterface.value = interfaces.value[0];
        }
      } catch (e) {}
    }

    async function fetchWidget(w) {
      try {
        const iface = w.interface || (w.type === 'interface-traffic' ? selectedInterface.value : '');
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
      const label = `${w.title}: ${w.value}${w.type === 'cpu' || w.type === 'memory' ? '%' : ''}`;
      drawLineChart(c, w.data, label);
    }

    function addInterfaceWidget() {
      if (!selectedInterface.value) return;
      const id = 'if-' + selectedInterface.value + '-' + Date.now();
      widgets.value.push({
        id,
        title: `Interface ${selectedInterface.value}`,
        type: 'interface-traffic',
        metric: 'traffic',
        duration: '24h',
        interface: selectedInterface.value,
        data: [],
        value: 0,
      });
      const w = widgets.value[widgets.value.length - 1];
      fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
    }

    function addWidget(type) {
      const id = type + '-' + Date.now();
      const w = { id, title: type.toUpperCase(), type, metric: type === 'conntrack' ? 'count' : 'usage', duration: '24h', data: [], value: 0 };
      widgets.value.push(w);
      fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
    }

    function removeWidget(w) {
      widgets.value = widgets.value.filter(x => x.id !== w.id);
    }

    function configureWidget(w) {
      const duration = prompt('Duration (1h/12h/1d/1w/24h):', w.duration);
      if (duration) {
        w.duration = duration;
        fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
      }
    }

    watch(widgets, () => {
      nextTick(() => widgets.value.forEach(drawWidget));
    }, { deep: true });

    onMounted(() => {
      loadAll();
      timer.value = setInterval(loadAll, 30000);
    });
    onUnmounted(() => {
      if (timer.value) clearInterval(timer.value);
    });

    return { widgets, interfaces, selectedInterface, canvases, addInterfaceWidget, addWidget, removeWidget, configureWidget };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <select v-model="selectedInterface">
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
          <ToolbarButton icon="addWidget" @click="addInterfaceWidget">{{ $t('monitor.addWidget') }} (Interface)</ToolbarButton>
          <ToolbarButton icon="addWidget" @click="addWidget('cpu')">CPU</ToolbarButton>
          <ToolbarButton icon="addWidget" @click="addWidget('memory')">Memory</ToolbarButton>
          <ToolbarButton icon="addWidget" @click="addWidget('conntrack')">Conntrack</ToolbarButton>
        </div>
      </div>
      <div class="widget-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:16px;">
        <div v-for="w in widgets" :key="w.id" class="widget-card" style="border:1px solid #ddd;border-radius:4px;background:#fff;">
          <div class="widget-header" style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(#f0f0f0,#e0e0e0);padding:8px;">
            <span>{{ w.title }}</span>
            <div style="display:flex;gap:4px;">
              <select v-model="w.duration" @change="configureWidget(w)" style="font-size:12px;">
                <option value="1h">1h</option>
                <option value="12h">12h</option>
                <option value="1d">1d</option>
                <option value="1w">1w</option>
                <option value="24h">24h</option>
              </select>
              <button style="padding:2px 6px;" @click="configureWidget(w)">⚙</button>
              <button style="padding:2px 6px;" @click="removeWidget(w)">×</button>
            </div>
          </div>
          <div class="widget-body" style="padding:8px;">
            <canvas :ref="el => { if(el) canvases[w.id] = el }" style="width:100%;height:160px;background:#fff;"></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
});
