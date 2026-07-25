import { defineComponent, ref, computed, watch } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'CommandPreview',
  props: {
    path: { type: String, default: '' },
  },
  setup(props) {
    const commands = ref([]);
    const error = ref('');
    async function load() {
      if (!props.path) return;
      error.value = '';
      try {
        const res = await configApi.commands(props.path);
        commands.value = res.commands || [];
      } catch (e) {
        console.error('CommandPreview fetch failed for path:', props.path, e);
        error.value = e.message || '加载命令行失败';
        commands.value = [];
      }
    }
    watch(() => props.path, load, { immediate: true });
    const commandText = computed(() => commands.value.join('\n'));
    function copy() {
      navigator.clipboard.writeText(commandText.value);
    }
    return { commands, error, commandText, copy };
  },
  components: { ToolbarButton },
  template: `
    <div v-if="commands.length || error" style="margin-bottom:12px;">
      <div style="font-weight:bold;margin-bottom:4px;display:flex;align-items:center;gap:8px;">
        对应命令行
        <ToolbarButton v-if="commands.length" icon="copy" @click="copy">复制</ToolbarButton>
      </div>
      <pre v-if="commands.length" style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;">{{ commandText }}</pre>
      <div v-if="error" style="color:#c00;font-size:12px;">{{ error }}</div>
    </div>
  `,
});
