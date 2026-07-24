import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

function parseStatistics(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  const stack = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    const text = line.trim();
    const colonIdx = text.indexOf(':');
    if (colonIdx === -1) continue;

    const key = text.slice(0, colonIdx).trim();
    const value = text.slice(colonIdx + 1).trim();

    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const prefix = stack.map(s => s.key).join('.');
    const fullKey = prefix ? `${prefix}.${key}` : key;
    result.push({ key: fullKey, value });

    if (!value) {
      stack.push({ key, indent });
    }
  }
  return result;
}

export default defineComponent({
  name: 'PptpStatisticsPage',
  setup() {
    const loading = ref(false);
    const stats = ref([]);
    const rawOutput = ref('');

    const columns = [
      { key: 'key', title: '指标' },
      { key: 'value', title: '数值' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('pptp-server statistics');
        rawOutput.value = res.output || '';
        stats.value = parseStatistics(rawOutput.value);
      } catch (e) {
        showError(e);
        stats.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, stats, columns, load, rawOutput };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left"><h3>PPTP 统计</h3></div>
        <div class="toolbar-right">
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="stats" :loading="loading" :selectable="false" :actions="[]" />
      <div v-if="rawOutput" style="margin-top:16px;">
        <div style="font-weight:bold;margin-bottom:4px;">原始输出</div>
        <pre style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;overflow:auto;">{{ rawOutput }}</pre>
      </div>
    </div>
  `,
});
