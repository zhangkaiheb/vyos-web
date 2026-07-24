import { defineComponent, ref, computed, watch, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { logApi } from '/src/api/index.js';

export default defineComponent({
  name: 'LogPage',
  setup() {
    const route = useRoute();
    const data = ref([]);
    const page = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const totalPages = ref(1);
    const loading = ref(false);
    const filters = ref({ keyword: '', level: '', start_time: '', end_time: '' });

    const logType = computed(() => route.path.split('/').pop() || 'system');
    const logTypes = ['all', 'audit', 'system', 'firewall', 'conntrack'];

    async function load() {
      loading.value = true;
      try {
        const query = { page: page.value, page_size: pageSize.value };
        if (filters.value.keyword) query.keyword = filters.value.keyword;
        if (filters.value.level) query.level = filters.value.level;
        if (filters.value.start_time) query.start_time = filters.value.start_time;
        if (filters.value.end_time) query.end_time = filters.value.end_time;
        const res = await logApi.get(logType.value, page.value, pageSize.value, query);
        data.value = res.data || [];
        total.value = res.total || 0;
        totalPages.value = res.total_pages || 1;
      } catch (e) {
        data.value = [];
      } finally {
        loading.value = false;
      }
    }

    function applyFilters() {
      page.value = 1;
      load();
    }

    onMounted(load);
    watch(() => route.path, () => { page.value = 1; filters.value = { keyword: '', level: '', start_time: '', end_time: '' }; load(); });

    return { data, page, pageSize, total, totalPages, loading, load, logType, logTypes, filters, applyFilters };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left" style="gap:8px;flex-wrap:wrap;">
          <select v-model="logType" @change="$router.push('/logs/' + logType)">
            <option v-for="t in logTypes" :key="t" :value="t">{{ $t('logs.' + t) || t }}</option>
          </select>
          <input v-model="filters.keyword" placeholder="关键字" @keydown.enter="applyFilters" />
          <select v-model="filters.level" @change="applyFilters">
            <option value="">{{ $t('logs.level') }}</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warning">WARNING</option>
            <option value="error">ERROR</option>
          </select>
          <input type="datetime-local" v-model="filters.start_time" />
          <input type="datetime-local" v-model="filters.end_time" />
          <ToolbarButton icon="search" primary @click="applyFilters">{{ $t('app.search') }}</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
        </div>
        <div class="toolbar-right">
          每页 <input v-model.number="pageSize" style="width:50px;" @change="page=1;load()" /> 条
        </div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>时间</th><th>用户/单元</th><th>级别</th><th>操作/消息</th><th>详情</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in data" :key="row.id || row.timestamp">
              <td>{{ row.timestamp }}</td>
              <td>{{ row.user_id || row.unit || '-' }}</td>
              <td>{{ row.level || '-' }}</td>
              <td>{{ row.action || row.message || '-' }}</td>
              <td>{{ row.target || row.error_message || JSON.stringify(row.data || '') }}</td>
            </tr>
            <tr v-if="!data.length"><td colspan="5" class="text-center">暂无日志</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button @click="page=1;load()" :disabled="page===1">首页</button>
        <button @click="page--;load()" :disabled="page===1">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button @click="page++;load()" :disabled="page===totalPages">下一页</button>
        <button @click="page=totalPages;load()" :disabled="page===totalPages">末页</button>
        <span style="margin-left:12px;">共 {{ total }} 条</span>
      </div>
    </div>
  `,
});
