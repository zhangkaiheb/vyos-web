import { defineComponent, ref, watch, computed } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export default defineComponent({
  name: 'HelpButton',
  props: {
    title: { type: String, default: '帮助' },
    content: { type: String, default: '' },
    routePath: { type: String, default: '' },
  },
  setup(props) {
    const visible = ref(false);
    const loaded = ref('');
    const loading = ref(false);
    const error = ref('');

    async function loadHelp() {
      if (!props.routePath) return;
      loading.value = true;
      error.value = '';
      try {
        const token = localStorage.getItem('vyos_token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/help?path=${encodeURIComponent(props.routePath)}`, { headers });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          loaded.value = json.content || '';
        } else {
          loaded.value = '';
          error.value = json.message || '加载帮助失败';
        }
      } catch (e) {
        loaded.value = '';
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    watch(visible, (v) => {
      if (v) loadHelp();
    });

    const displayContent = computed(() => {
      return props.content || loaded.value;
    });

    return { visible, loading, error, displayContent };
  },
  template: `
    <button class="help-btn" @click="visible = true" title="帮助">?</button>
    <DraggableModal v-model:visible="visible" :title="title">
      <div v-if="loading" style="padding:20px;text-align:center;">加载中...</div>
      <div v-else-if="error" style="color:red;">{{ error }}</div>
      <pre v-else style="white-space:pre-wrap;">{{ displayContent || '暂无帮助文档' }}</pre>
    </DraggableModal>
  `,
  components: { DraggableModal },
});
