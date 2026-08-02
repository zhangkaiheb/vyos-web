import { defineComponent, ref, computed, onMounted, onUnmounted, watch, nextTick } from '/src/utils/vue-import.js';
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

function formatBitrate(bps) {
  if (bps >= 1000000) return (bps / 1000000).toFixed(2) + ' Mbps';
  if (bps >= 1000) return Math.round(bps / 1000) + ' Kbps';
  return Math.round(bps) + ' bps';
}

function formatTimeLabel(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatNumber(num) {
  return Number(num).toLocaleString();
}

function drawTrafficChartBase(canvas, hoverIndex) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 400;
  const cssHeight = canvas.clientHeight || 260;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const options = canvas._trafficOptions || {};
  const rxData = canvas._trafficRx || [];
  const txData = canvas._trafficTx || [];
  const { title = '接口流量', iface = '' } = options;
  const datasets = [
    { data: rxData, label: `${iface}上行流量`, color: '#5B9BD5', key: 'rx' },
    { data: txData, label: `${iface}下行流量`, color: '#888888', key: 'tx' },
  ];

  const hasData = datasets.some(d => d.data.length > 0);
  if (!hasData) {
    ctx.fillStyle = '#999';
    ctx.font = '14px sans-serif';
    ctx.fillText('No data', cssWidth / 2 - 20, cssHeight / 2);
    return;
  }

  const margin = { top: 36, right: 16, bottom: 56, left: 76 };
  const chartWidth = cssWidth - margin.left - margin.right;
  const chartHeight = cssHeight - margin.top - margin.bottom;

  // Interface label
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`接口: ${iface}`, cssWidth - 12, 10);

  // Collect values
  const allValues = datasets.flatMap(d => d.data.map(p => parseFloat(p.value) || 0));
  let maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  // Round max to nice value
  const exponent = Math.floor(Math.log10(maxVal));
  const fraction = maxVal / Math.pow(10, exponent);
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  maxVal = niceFraction * Math.pow(10, exponent);

  // Grid lines and Y-axis labels
  const yTicks = 5;
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= yTicks; i++) {
    const y = margin.top + chartHeight - (i / yTicks) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();
    const val = (i / yTicks) * maxVal;
    ctx.fillText(formatBitrate(val), margin.left - 6, y);
  }

  // Y-axis label (vertical characters)
  ctx.save();
  ctx.translate(10, margin.top + chartHeight / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  const yLabel = '比特每秒';
  const charHeight = 14;
  yLabel.split('').forEach((char, i) => {
    const y = (i - (yLabel.length - 1) / 2) * charHeight;
    ctx.fillText(char, 0, y);
  });
  ctx.restore();

  // X-axis labels
  const len = Math.max(...datasets.map(d => d.data.length), 1);
  const xLabelsCount = Math.min(len, 6);
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < xLabelsCount; i++) {
    const idx = Math.round((i / (xLabelsCount - 1 || 1)) * (len - 1));
    const x = margin.left + (idx / (len - 1 || 1)) * chartWidth;
    const dataPoint = datasets[0].data[idx] || datasets[1].data[idx];
    if (dataPoint) {
      ctx.fillText(formatTimeLabel(dataPoint.timestamp), x, margin.top + chartHeight + 6);
    }
  }

  // Draw lines
  datasets.forEach((ds) => {
    const values = ds.data.map(d => parseFloat(d.value) || 0);
    if (values.length < 2) return;
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = margin.left + (i / (len - 1 || 1)) * chartWidth;
      const y = margin.top + chartHeight - ((v - minVal) / range) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Hover points and vertical line
  if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < len) {
    const hx = margin.left + (hoverIndex / (len - 1 || 1)) * chartWidth;
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, margin.top);
    ctx.lineTo(hx, margin.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    datasets.forEach((ds) => {
      const point = ds.data[hoverIndex];
      if (!point) return;
      const v = parseFloat(point.value) || 0;
      const x = hx;
      const y = margin.top + chartHeight - ((v - minVal) / range) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ds.color;
      ctx.stroke();
    });
  }

  // Legend at bottom
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let legendX = cssWidth / 2;
  const totalLegendWidth = datasets.reduce((sum, ds) => {
    return sum + ctx.measureText(ds.label).width + 24;
  }, 0);
  legendX = (cssWidth - totalLegendWidth) / 2;
  datasets.forEach((ds) => {
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, cssHeight - 24);
    ctx.lineTo(legendX + 16, cssHeight - 24);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillText(ds.label, legendX + 22, cssHeight - 24);
    legendX += ctx.measureText(ds.label).width + 44;
  });
}

function drawTrafficTooltip(canvas, idx) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const options = canvas._trafficOptions || {};
  const rxData = canvas._trafficRx || [];
  const txData = canvas._trafficTx || [];
  const iface = options.iface || '';
  const cssWidth = canvas.clientWidth || 400;

  const lines = [];
  const tsPoint = rxData[idx] || txData[idx];
  if (tsPoint && tsPoint.timestamp) {
    lines.push(formatTimeLabel(tsPoint.timestamp));
  }
  if (rxData[idx]) {
    lines.push(`${iface}上行流量 ${formatBitrate(parseFloat(rxData[idx].value) || 0)}`);
  }
  if (txData[idx]) {
    lines.push(`${iface}下行流量 ${formatBitrate(parseFloat(txData[idx].value) || 0)}`);
  }
  if (!lines.length) return;

  ctx.font = '12px sans-serif';
  const padding = 8;
  const lineHeight = 18;
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  let x = cssWidth / 2 - boxWidth / 2;
  let y = 40;
  if (x < 10) x = 10;
  if (x + boxWidth > cssWidth - 10) x = cssWidth - boxWidth - 10;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x, y, boxWidth, boxHeight);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + i * lineHeight + lineHeight / 2);
  });
}

function drawTrafficChart(canvas, rxData, txData, options = {}) {
  if (!canvas) return;
  canvas._trafficOptions = options;
  canvas._trafficRx = rxData || [];
  canvas._trafficTx = txData || [];
  canvas._hoverIndex = null;

  drawTrafficChartBase(canvas, null);

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cssWidth = canvas.clientWidth || 400;
    const margin = { top: 36, right: 16, bottom: 56, left: 76 };
    const chartWidth = cssWidth - margin.left - margin.right;
    const len = Math.max(canvas._trafficRx.length, canvas._trafficTx.length, 1);
    if (x < margin.left || x > margin.left + chartWidth || len < 2) {
      canvas._hoverIndex = null;
      drawTrafficChartBase(canvas, null);
      return;
    }
    const idx = Math.min(len - 1, Math.max(0, Math.round(((x - margin.left) / chartWidth) * (len - 1))));
    canvas._hoverIndex = idx;
    drawTrafficChartBase(canvas, idx);
    drawTrafficTooltip(canvas, idx);
  };

  canvas.onmouseleave = () => {
    canvas._hoverIndex = null;
    drawTrafficChartBase(canvas, null);
  };
}

function drawMetricChartBase(canvas, hoverIndex) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 400;
  const cssHeight = canvas.clientHeight || 260;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const options = canvas._metricOptions || {};
  const data = canvas._metricData || [];
  const { title = '', valueLabel = '', color = '#5B9BD5', durationLabel = '' } = options;

  if (!data || !data.length) {
    ctx.fillStyle = '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', cssWidth / 2, cssHeight / 2);
    return;
  }

  const margin = { top: 36, right: 16, bottom: 56, left: 76 };
  const chartWidth = cssWidth - margin.left - margin.right;
  const chartHeight = cssHeight - margin.top - margin.bottom;

  // Duration label (top right)
  if (durationLabel) {
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(durationLabel, cssWidth - 12, 10);
  }

  // Value label (top left)
  if (valueLabel) {
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(valueLabel, 12, 10);
  }

  const values = data.map(d => parseFloat(d.value) || 0);
  let maxVal = Math.max(...values, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  // Round max to nice value
  const exponent = Math.floor(Math.log10(maxVal));
  const fraction = maxVal / Math.pow(10, exponent);
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  maxVal = niceFraction * Math.pow(10, exponent);

  // Grid lines and Y-axis labels
  const yTicks = 5;
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= yTicks; i++) {
    const y = margin.top + chartHeight - (i / yTicks) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartWidth, y);
    ctx.stroke();
    const val = (i / yTicks) * maxVal;
    ctx.fillText(formatNumber(Math.round(val)), margin.left - 6, y);
  }

  // Y-axis label (vertical characters)
  ctx.save();
  ctx.translate(10, margin.top + chartHeight / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  const yLabel = '数量';
  const charHeight = 14;
  yLabel.split('').forEach((char, i) => {
    const y = (i - (yLabel.length - 1) / 2) * charHeight;
    ctx.fillText(char, 0, y);
  });
  ctx.restore();

  // X-axis labels
  const len = data.length;
  const xLabelsCount = Math.min(len, 6);
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < xLabelsCount; i++) {
    const idx = Math.round((i / (xLabelsCount - 1 || 1)) * (len - 1));
    const x = margin.left + (idx / (len - 1 || 1)) * chartWidth;
    const point = data[idx];
    if (point) {
      ctx.fillText(formatTimeLabel(point.timestamp), x, margin.top + chartHeight + 6);
    }
  }

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = margin.left + (i / (len - 1 || 1)) * chartWidth;
    const y = margin.top + chartHeight - ((v - minVal) / range) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Hover point and vertical line
  if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < len) {
    const hx = margin.left + (hoverIndex / (len - 1 || 1)) * chartWidth;
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, margin.top);
    ctx.lineTo(hx, margin.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    const point = data[hoverIndex];
    if (point) {
      const v = parseFloat(point.value) || 0;
      const y = margin.top + chartHeight - ((v - minVal) / range) * chartHeight;
      ctx.beginPath();
      ctx.arc(hx, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  // Legend at bottom
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const legendLabel = title || '数量';
  const legendText = `${legendLabel}数量`;
  const legendLineLen = 16;
  const legendGap = 6;
  const textWidth = ctx.measureText(legendText).width;
  const totalLegendWidth = legendLineLen + legendGap + textWidth;
  const legendX = (cssWidth - totalLegendWidth) / 2;
  const legendY = cssHeight - 24;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + legendLineLen, legendY);
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.fillText(legendText, legendX + legendLineLen + legendGap, legendY);
}

function drawMetricChartTooltip(canvas, idx) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const options = canvas._metricOptions || {};
  const data = canvas._metricData || [];
  const cssWidth = canvas.clientWidth || 400;

  const point = data[idx];
  if (!point) return;

  const lines = [];
  if (point.timestamp) {
    lines.push(formatTimeLabel(point.timestamp));
  }
  lines.push(`${options.title || ''}: ${formatNumber(parseFloat(point.value) || 0)}`);

  ctx.font = '12px sans-serif';
  const padding = 8;
  const lineHeight = 18;
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  let x = cssWidth / 2 - boxWidth / 2;
  let y = 40;
  if (x < 10) x = 10;
  if (x + boxWidth > cssWidth - 10) x = cssWidth - boxWidth - 10;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x, y, boxWidth, boxHeight);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + i * lineHeight + lineHeight / 2);
  });
}

function drawMetricChart(canvas, data, options = {}) {
  if (!canvas) return;
  canvas._metricOptions = options;
  canvas._metricData = data || [];
  canvas._metricHoverIndex = null;

  drawMetricChartBase(canvas, null);

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cssWidth = canvas.clientWidth || 400;
      const margin = { top: 36, right: 16, bottom: 56, left: 76 };
    const chartWidth = cssWidth - margin.left - margin.right;
    const len = canvas._metricData.length;
    if (x < margin.left || x > margin.left + chartWidth || len < 2) {
      canvas._metricHoverIndex = null;
      drawMetricChartBase(canvas, null);
      return;
    }
    const idx = Math.min(len - 1, Math.max(0, Math.round(((x - margin.left) / chartWidth) * (len - 1))));
    canvas._metricHoverIndex = idx;
    drawMetricChartBase(canvas, idx);
    drawMetricChartTooltip(canvas, idx);
  };

  canvas.onmouseleave = () => {
    canvas._metricHoverIndex = null;
    drawMetricChartBase(canvas, null);
  };
}

function drawGauge(canvas, value, label) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth || 300;
  const height = canvas.height = canvas.clientHeight || 260;
  ctx.clearRect(0, 0, width, height);

  const clamped = Math.max(0, Math.min(100, value));
  const centerX = width / 2;
  const centerY = 190;
  const radius = Math.min((width - 40) / 2, 130);
  const lineWidth = 20;

  function drawArcSegment(startRatio, endRatio, color) {
    const startAngle = Math.PI + startRatio * Math.PI;
    const endAngle = Math.PI + endRatio * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  drawArcSegment(0, 0.6, '#52c41a');
  drawArcSegment(0.6, 0.8, '#faad14');
  drawArcSegment(0.8, 1, '#f5222d');

  // Ticks and numbers
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 50; i++) {
    const ratio = i / 50;
    const angle = Math.PI + ratio * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const isMajor = i % 5 === 0;
    const inner = radius - (isMajor ? 10 : 6);
    const outer = radius - 1;
    ctx.beginPath();
    ctx.moveTo(cos * inner, sin * inner);
    ctx.lineTo(cos * outer, sin * outer);
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.strokeStyle = isMajor ? '#666' : '#999';
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.fillText(String(Math.round(ratio * 100)), cos * (radius + 14), sin * (radius + 14));
    }
  }
  ctx.restore();

  // Needle
  const angle = Math.PI + (clamped / 100) * Math.PI;
  const needleLen = radius - 10;
  const nx = centerX + Math.cos(angle) * needleLen;
  const ny = centerY + Math.sin(angle) * needleLen;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333';
  ctx.stroke();

  // Center pin
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Value text at bottom
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${clamped.toFixed(2)}%`, centerX, 232);
}

const STORAGE_KEY = 'monitorDashboardLayout';

const DEFAULT_WIDGETS = [
  { id: 'cpu', title: 'CPU 使用率', type: 'cpu', metric: 'usage', duration: '24h', interface: '', data: [], value: 0 },
  { id: 'memory', title: '内存 使用率', type: 'memory', metric: 'usage', duration: '24h', interface: '', data: [], value: 0 },
  { id: 'conntrack', title: 'Conntrack 数量', type: 'conntrack', metric: 'count', duration: '24h', interface: '', data: [], value: 0 },
  { id: 'conntrack-ipv6', title: 'IPv6 Conntrack 数量', type: 'conntrack-ipv6', metric: 'count', duration: '24h', interface: '', data: [], value: 0 },
];

const AVAILABLE_WIDGETS = [
  { type: 'cpu', title: 'CPU 使用率', metric: 'usage', duration: '24h', multi: false },
  { type: 'memory', title: '内存 使用率', metric: 'usage', duration: '24h', multi: false },
  { type: 'conntrack', title: 'Conntrack 数量', metric: 'count', duration: '24h', multi: false },
  { type: 'conntrack-ipv6', title: 'IPv6 Conntrack 数量', metric: 'count', duration: '24h', multi: false },
  { type: 'interface-traffic', title: '接口流量', metric: 'bps', duration: '1h', multi: true },
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
    const historyModalVisible = ref(false);
    const historyWidget = ref(null);
    const historyCanvas = ref(null);
    const editModalVisible = ref(false);
    const editingWidget = ref(null);
    const editSelectedInterface = ref('');
    let dragIndex = null;

    function formatTimestamp(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString();
    }

    const historyTimeRange = computed(() => {
      const w = historyWidget.value;
      if (!w || !w.data || !w.data.length) return { start: '-', end: '-' };
      return {
        start: formatTimestamp(w.data[0].timestamp),
        end: formatTimestamp(w.data[w.data.length - 1].timestamp),
      };
    });

    function loadLayout() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          widgets.value = parsed.map(w => {
            let metric = w.metric;
            let duration = w.duration;
            if (w.type === 'interface-traffic') {
              metric = 'bps';
              if (!['1h', '24h', '30d'].includes(duration)) {
                duration = '1h';
              }
            } else if (w.type === 'conntrack' || w.type === 'conntrack-ipv6') {
              if (duration === '1d') duration = '24h';
              if (!['1h', '24h', '30d'].includes(duration)) {
                duration = '24h';
              }
            }
            return {
              ...w,
              metric: metric || '',
              duration: duration || w.duration,
              data: [],
              value: 0,
            };
          });
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
        if (w.type === 'interface-traffic') {
          const [rxRes, txRes] = await Promise.all([
            monitorApi.history('interface-traffic', 'rx', w.duration, iface || null),
            monitorApi.history('interface-traffic', 'tx', w.duration, iface || null),
          ]);
          w.data = { rx: rxRes.data || [], tx: txRes.data || [] };
          const rxLast = w.data.rx.length ? w.data.rx[w.data.rx.length - 1].value : 0;
          const txLast = w.data.tx.length ? w.data.tx[w.data.tx.length - 1].value : 0;
          w.value = (parseFloat(rxLast) || 0) + (parseFloat(txLast) || 0);
          return;
        }
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
      if (w.type === 'cpu' || w.type === 'memory') {
        drawGauge(c, w.value, w.title);
      } else if (w.type === 'interface-traffic') {
        const durationMap = { '1h': '过去60分钟', '24h': '24小时', '30d': '30天' };
        drawTrafficChart(c, w.data?.rx, w.data?.tx, {
          title: '接口流量',
          iface: w.interface || '',
          durationLabel: durationMap[w.duration] || w.duration,
        });
      } else if (w.type === 'conntrack' || w.type === 'conntrack-ipv6') {
        drawMetricChart(c, w.data, {
          title: w.title,
          color: '#5B9BD5',
          valueLabel: `${w.title}: ${formatNumber(w.value)}`,
        });
      } else {
        let label = `${w.title}: ${w.value}`;
        drawLineChart(c, w.data, label);
      }
    }

    function showHistory(w) {
      historyWidget.value = w;
      historyModalVisible.value = true;
    }

    async function changeHistoryDuration() {
      const w = historyWidget.value;
      if (!w) return;
      await fetchWidget(w);
      saveLayout();
      drawHistory();
      await nextTick();
      widgets.value.forEach(drawWidget);
    }

    function drawHistory() {
      const w = historyWidget.value;
      if (!w || !historyCanvas.value) return;
      let label = `${w.title} 历史`;
      if (w.type === 'cpu' || w.type === 'memory') label += ` (${w.value}%)`;
      else if (w.type === 'interface-traffic') label += ` (${w.value} bps)`;
      drawLineChart(historyCanvas.value, w.data, label);
    }

    watch(historyModalVisible, (visible) => {
      if (visible) nextTick().then(drawHistory);
    });

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
          metric: item.metric || 'bps',
          duration: item.duration || '1h',
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

    function openEditModal(w) {
      editingWidget.value = w;
      editSelectedInterface.value = w.interface || '';
      editModalVisible.value = true;
    }

    function saveEdit() {
      const w = editingWidget.value;
      if (!w) return;
      const iface = editSelectedInterface.value;
      if (iface) {
        w.interface = iface;
        w.title = `接口流量 ${iface}`;
        saveLayout();
        fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
      }
      editModalVisible.value = false;
      editingWidget.value = null;
    }

    function configureWidget(w) {
      if (w.type === 'interface-traffic' && w.interface) {
        w.title = `接口流量 ${w.interface}`;
      }
      saveLayout();
      fetchWidget(w).then(() => nextTick().then(() => drawWidget(w)));
    }

    function refreshWidget(w) {
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
      refreshWidget,
      onDragStart,
      onDragOver,
      onDrop,
      isWidgetAdded,
      historyModalVisible,
      historyWidget,
      historyCanvas,
      showHistory,
      changeHistoryDuration,
      historyTimeRange,
      editModalVisible,
      editSelectedInterface,
      openEditModal,
      saveEdit,
    };
  },
  components: { DraggableModal, ToolbarButton },
  template: `
    <div>
      <div class="toolbar compact-toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <ToolbarButton icon="addWidget" @click="modalVisible = true">控件</ToolbarButton>
        </div>
      </div>
      <div class="widget-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:16px;">
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
          <div class="widget-header" :class="{ 'traffic-header': w.type === 'interface-traffic' }" style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(#f0f0f0,#e0e0e0);padding:8px;">
            <span>{{ w.type === 'interface-traffic' ? '接口流量' : w.title }}</span>
            <div class="widget-actions">
              <template v-if="w.type !== 'interface-traffic'">
                <select v-if="w.type !== 'cpu' && w.type !== 'memory'" v-model="w.duration" @change="configureWidget(w)" style="font-size:12px;">
                  <option value="1h">1h</option>
                  <option value="12h">12h</option>
                  <option value="1d">1d</option>
                  <option value="1w">1w</option>
                  <option value="24h">24h</option>
                </select>
                <button v-if="w.type === 'cpu' || w.type === 'memory'" class="widget-action-text" @click="showHistory(w)">历史</button>
              </template>
              <button class="widget-action-btn widget-action-refresh" title="刷新" @click="refreshWidget(w)">↻</button>
              <button v-if="w.type === 'interface-traffic'" class="widget-action-btn widget-action-edit" title="编辑" @click="openEditModal(w)">✎</button>
              <button class="widget-action-btn widget-action-close" title="关闭" @click="removeWidget(w)">✕</button>
            </div>
          </div>
          <div class="widget-body" :class="{ 'traffic-body': w.type === 'interface-traffic' }" style="padding:8px;">
            <canvas :ref="el => { if(el) canvases[w.id] = el }" :style="{ width: '100%', height: (w.type === 'cpu' || w.type === 'memory') ? '260px' : '280px', background: '#fff' }"></canvas>
            <div v-if="w.type === 'interface-traffic'" class="traffic-duration-bar" style="display:flex;justify-content:center;gap:16px;margin-top:8px;padding-top:4px;border-top:1px solid #eee;">
              <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <input type="radio" v-model="w.duration" value="1h" @change="configureWidget(w)"> 过去60分钟
              </label>
              <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <input type="radio" v-model="w.duration" value="24h" @change="configureWidget(w)"> 24小时
              </label>
              <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <input type="radio" v-model="w.duration" value="30d" @change="configureWidget(w)"> 30天
              </label>
            </div>
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
      <DraggableModal v-model:visible="historyModalVisible" :title="historyWidget ? historyWidget.title + ' 历史' : '历史'" width="720px" @confirm="historyModalVisible = false">
        <div style="padding:8px 0;">
          <div v-if="historyWidget" style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <select v-model="historyWidget.duration" @change="changeHistoryDuration" style="font-size:12px;">
              <option value="1h">1h</option>
              <option value="12h">12h</option>
              <option value="1d">1d</option>
              <option value="1w">1w</option>
              <option value="24h">24h</option>
            </select>
          </div>
          <canvas ref="historyCanvas" style="width:100%;height:300px;background:#fff;"></canvas>
          <div v-if="historyWidget && historyWidget.data && historyWidget.data.length" style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#666;">
            <span>开始: {{ historyTimeRange.start }}</span>
            <span>结束: {{ historyTimeRange.end }}</span>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="editModalVisible" title="编辑接口" width="360px" @confirm="saveEdit">
        <div style="padding:16px 0;">
          <label style="display:block;font-size:12px;color:#666;margin-bottom:4px;">选择接口</label>
          <select v-model="editSelectedInterface" style="width:100%;padding:6px;font-size:14px;border:1px solid #ccc;border-radius:4px;">
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </DraggableModal>
    </div>
  `,
});
