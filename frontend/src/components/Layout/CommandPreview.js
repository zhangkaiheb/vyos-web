import { defineComponent, ref, computed, watch } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';

export default defineComponent({
  name: 'CommandPreview',
  props: {
    path: { type: String, default: '' },
  },
  setup(props) {
    const commands = ref([]);
    async function load() {
      if (!props.path) return;
      try {
        const res = await configApi.commands(props.path);
        commands.value = res.commands || [];
      } catch (e) {
        commands.value = [];
      }
    }
    watch(() => props.path, load, { immediate: true });
    const commandText = computed(() => commands.value.join('\n'));
    function copy() {
      navigator.clipboard.writeText(commandText.value);
    }
    return { commands, commandText, copy };
  },
  template: `
    <div v-if="commands.length" style="margin-bottom:12px;">
      <div style="font-weight:bold;margin-bottom:4px;">
        对应命令行
        <button style="margin-left:8px;padding:2px 6px;" @click="copy">复制</button>
      </div>
      <pre style="background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;">{{ commandText }}</pre>
    </div>
  `,
});
