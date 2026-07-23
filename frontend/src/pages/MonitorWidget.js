import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { monitorApi } from '/src/api/index.js';

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

export default defineComponent({
  name: 'MonitorWidget',
  setup() {
    const route = useRoute();
    const type = computed(() => route.path.split('/').pop());
    const title = computed(() => route.meta?.menuItem?.label || type.value);
    const duration = ref('24h');
    const data = ref([]);
    const value = ref(0);
    const interfaces = ref([]);
    const selectedInterface = ref('');
    const canvas = ref(null);
    const timer = ref(null);
    const eventSource = ref(null);

    const isInterface = computed(() => type.value === 'interface-traffic');

    async function fetchInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = res.interfaces || [];
        if (interfaces.value.length && !selectedInterface.value) {
          selectedInterface.value = interfaces.value[0];
        }
      } catch (e) {}
    }

    async function load() {
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
      load();
      startStream();
      timer.value = setInterval(load, 30000);
    });
    onUnmounted(() => {
      if (timer.value) clearInterval(timer.value);
      if (eventSource.value) eventSource.value.close();
    });
    watch([type, duration, selectedInterface], () => { load(); startStream(); });

    return { title, duration, value, canvas, interfaces, selectedInterface, isInterface, load };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <span>{{ title }}</span>
          <select v-if="isInterface" v-model="selectedInterface">
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
          <select v-model="duration" @change="load">
            <option value="1h">1h</option>
            <option value="12h">12h</option>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
            <option value="24h">24h</option>
          </select>
          <button @click="load">{{ $t('app.refresh') }}</button>
        </div>
      </div>
      <div style="padding:16px;">
        <canvas ref="canvas" style="width:100%;height:400px;background:#fff;border:1px solid #ddd;border-radius:4px;"></canvas>
      </div>
    </div>
  `,
});
