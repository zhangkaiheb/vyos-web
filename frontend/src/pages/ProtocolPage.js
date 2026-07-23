import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';

export default defineComponent({
  name: 'ProtocolPage',
  setup() {
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
      protocols, loading, quickFilter, filtered, load,
      columns: [
        { key: 'number', title: '编号' },
        { key: 'name', title: '名称' },
        { key: 'aliases', title: '别名' },
        { key: 'description', title: '描述' },
      ],
    };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left"><h3>系统协议</h3></div>
        <div class="toolbar-right">
          <input v-model="quickFilter" placeholder="搜索..." />
          <button @click="load">{{ $t('app.refresh') }}</button>
        </div>
      </div>
      <DataTable :columns="columns" :data="filtered" :loading="loading" :selectable="false" :actions="[]">
        <template #aliases="{ value }">{{ (value || []).join(', ') }}</template>
      </DataTable>
      <div style="padding:8px;color:#666;font-size:12px;">数据来源：/etc/protocols</div>
    </div>
  `,
  components: { DataTable },
});
