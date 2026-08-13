import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'ProtocolPage',
  setup() {
    const { t } = useI18n();
    const protocols = ref([]);
    const loading = ref(false);
    const quickFilter = ref('');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.protocols();
        protocols.value = res.protocols || [];
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    const filtered = computed(() => {
      if (!quickFilter.value) return protocols.value;
      const q = quickFilter.value.toLowerCase();
      return protocols.value.filter(p =>
        p.name.toLowerCase().includes(q) ||
        String(p.number).includes(q) ||
        (p.aliases || []).some(a => a.toLowerCase().includes(q))
      );
    });

    return {
      t,
      protocols, loading, quickFilter, filtered, load,
      columns: [
        { key: 'number', title: t('protocol.columns.number') },
        { key: 'name', title: t('protocol.columns.name') },
        { key: 'aliases', title: t('protocol.columns.aliases') },
        { key: 'description', title: t('protocol.columns.description') },
      ],
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left"><h3>{{ t('protocol.title') }}</h3></div>
        <div class="toolbar-right">
          <input v-model="quickFilter" :placeholder="t('protocol.search.placeholder')" />
          <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="filtered" :loading="loading" :selectable="false" :actions="[]">
        <template #aliases="{ value }">{{ (value || []).join(', ') }}</template>
      </DataTable>
      <div style="padding:8px;color:#666;font-size:12px;">{{ t('protocol.data.source') }}: /etc/protocols</div>
    </div>
  `,
  components: { DataTable },
});
