import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

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
    const { t } = useI18n();
    const loading = ref(false);
    const stats = ref([]);

    const columns = [
      { key: 'key', title: t('pptpStatistics.columns.metric') },
      { key: 'value', title: t('pptpStatistics.columns.value') },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('pptp-server statistics');
        stats.value = parseStatistics(res.output || '');
      } catch (e) {
        showError(e);
        stats.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return { loading, stats, columns, load, t };
  },
  components: { DataTable, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="stats" :loading="loading" :selectable="false" :actions="[]" />
    </div>
  `,
});
