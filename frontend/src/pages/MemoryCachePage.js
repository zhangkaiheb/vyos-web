import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

const HEADERS = ['OBJS', 'ACTIVE', 'USE', 'OBJ SIZE', 'SLABS', 'OBJ/SLAB', 'CACHE SIZE', 'NAME'];
const KEY_MAP = ['objs', 'active', 'use', 'obj_size', 'slabs', 'obj_per_slab', 'cache_size', 'name'];

function parseSummary(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('OBJS') && trimmed.includes('NAME')) break;
    const idx = trimmed.indexOf(':');
    if (idx > 0) {
      result.push({
        key: trimmed.slice(0, idx).trim(),
        value: trimmed.slice(idx + 1).trim(),
      });
    }
  }
  return result;
}

function parseCacheTable(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  let headerLine = '';
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('OBJS') && lines[i].includes('NAME')) {
      headerLine = lines[i];
      headerIdx = i;
      break;
    }
  }
  if (!headerLine) return [];

  const starts = [];
  let searchFrom = 0;
  for (const h of HEADERS) {
    const idx = headerLine.indexOf(h, searchFrom);
    if (idx < 0) return [];
    starts.push(idx);
    searchFrom = idx + h.length;
  }

  const rows = [];
  let id = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const padded = line.padEnd(starts[starts.length - 1] + 40, ' ');
    const row = { id: ++id };
    for (let j = 0; j < HEADERS.length; j++) {
      const start = starts[j];
      const end = j < HEADERS.length - 1 ? starts[j + 1] : padded.length;
      row[KEY_MAP[j]] = padded.slice(start, end).trim();
    }
    rows.push(row);
  }
  return rows;
}

export default defineComponent({
  name: 'MemoryCachePage',
  setup() {
    const { t } = useI18n();
    const loading = ref(false);
    const activeTab = ref('summary');
    const summaryRows = ref([]);
    const cacheRows = ref([]);

    const tabs = computed(() => [
      { key: 'summary', title: t('memoryCache.tabs.summary') },
      { key: 'cache', title: t('memoryCache.tabs.cache') },
    ]);

    const infoColumns = computed(() => [
      { key: 'key', title: t('memoryCache.columns.key') },
      { key: 'value', title: t('memoryCache.columns.value') },
    ]);

    const cacheColumns = computed(() => [
      { key: 'objs', title: t('memoryCache.columns.objs') },
      { key: 'active', title: t('memoryCache.columns.active') },
      { key: 'use', title: t('memoryCache.columns.use') },
      { key: 'obj_size', title: t('memoryCache.columns.objSize') },
      { key: 'slabs', title: t('memoryCache.columns.slabs') },
      { key: 'obj_per_slab', title: t('memoryCache.columns.objPerSlab') },
      { key: 'cache_size', title: t('memoryCache.columns.cacheSize') },
      { key: 'name', title: t('memoryCache.columns.name') },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await opModeApi.show('system memory cache');
        const output = res.output || '';
        summaryRows.value = parseSummary(output);
        cacheRows.value = parseCacheTable(output);
      } catch (e) {
        showError(e);
        summaryRows.value = [];
        cacheRows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {
      loading,
      activeTab,
      tabs,
      summaryRows,
      cacheRows,
      infoColumns,
      cacheColumns,
      load,
      t,
    };
  },
  components: { DataTable, ToolbarButton, HelpButton, TabGroup },
  template: `
    <div class="page-container memory-cache-page">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <ToolbarButton icon="refresh" @click="load">{{ t('memoryCache.buttons.refresh') }}</ToolbarButton>
          <HelpButton routePath="/monitor/system-status/memory-cache" />
        </div>
      </div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #summary>
          <DataTable :columns="infoColumns" :data="summaryRows" :selectable="false" :actions="[]" rowKey="key" />
        </template>
        <template #cache>
          <DataTable
            :columns="cacheColumns"
            :data="cacheRows"
            :loading="loading"
            :selectable="false"
            :actions="[]"
            rowKey="id"
          />
        </template>
      </TabGroup>
    </div>
  `,
});
