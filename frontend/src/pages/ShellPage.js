import { defineComponent, ref, onMounted, nextTick } from '/src/utils/vue-import.js';
import { systemApi } from '/src/api/index.js';

export default defineComponent({
  name: 'ShellPage',
  setup() {
    const command = ref('');
    const history = ref([]);
    const output = ref([]);
    const loading = ref(false);
    const outputEl = ref(null);

    const prompt = 'vyos@router:~$ ';

    async function execute() {
      const cmd = command.value.trim();
      if (!cmd) return;
      history.value.push(cmd);
      output.value.push({ type: 'cmd', text: prompt + cmd });
      command.value = '';
      loading.value = true;
      try {
        const res = await systemApi.shell(cmd);
        const lines = (res.output || '').split(/\r?\n/).filter(l => l !== '');
        for (const line of lines) {
          output.value.push({ type: 'out', text: line });
        }
      } catch (e) {
        output.value.push({ type: 'err', text: e.message });
      } finally {
        loading.value = false;
        await nextTick();
        if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight;
      }
    }

    function clear() {
      output.value = [];
    }

    onMounted(() => {
      output.value.push({ type: 'out', text: 'VyOS Web Shell. Type a command and press Enter.' });
    });

    return { command, output, loading, outputEl, execute, clear, prompt };
  },
  template: `
    <div style="display:flex;flex-direction:column;height:calc(100vh - 160px);">
      <div class="toolbar">
        <div class="toolbar-left">
          <span>Web Shell</span>
        </div>
        <div class="toolbar-right">
          <button @click="clear">Clear</button>
        </div>
      </div>
      <div ref="outputEl" style="flex:1;background:#000;color:#0f0;font-family:monospace;padding:12px;overflow:auto;white-space:pre-wrap;">
        <div v-for="(line, i) in output" :key="i" :style="{ color: line.type === 'err' ? '#f55' : line.type === 'cmd' ? '#ff0' : '#0f0' }">
          {{ line.text }}
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:8px;background:#f0f0f0;">
        <span style="font-family:monospace;">{{ prompt }}</span>
        <input v-model="command" @keydown.enter="execute" style="flex:1;font-family:monospace;" :disabled="loading" />
        <button class="primary" @click="execute" :disabled="loading">Execute</button>
      </div>
    </div>
  `,
});
