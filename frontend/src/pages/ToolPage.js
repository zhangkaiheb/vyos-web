import { defineComponent, ref, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { systemApi } from '/src/api/index.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'ToolPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const tool = computed(() => route.path.split('/').pop());
    const host = ref('8.8.8.8');
    const iface = ref('eth0');
    const count = ref(4);
    const options = ref('');
    const output = ref('');
    const loading = ref(false);
    const dateValue = ref('');
    const terminal = ref({ key: '', length: 0, pager: '', width: 0 });

    async function run() {
      loading.value = true;
      output.value = '';
      try {
        let res;
        if (tool.value === 'ping') res = await systemApi.ping(host.value, count.value);
        else if (tool.value === 'traceroute') res = await systemApi.traceroute(host.value);
        else if (tool.value === 'mtr') res = await systemApi.mtr(host.value, count.value, true);
        else if (tool.value === 'tcpdump') res = await systemApi.tcpdump(iface.value, count.value, options.value);
        else if (tool.value === 'reboot') {
          if (!confirm(t('tool.confirmReboot'))) return;
          res = await systemApi.reboot();
        } else if (tool.value === 'poweroff') {
          if (!confirm(t('tool.confirmPoweroff'))) return;
          res = await systemApi.poweroff();
        } else if (tool.value === 'reset') {
          if (!confirm(t('tool.confirmReset'))) return;
          res = await systemApi.reset();
        } else if (tool.value === 'date') {
          res = await systemApi.date(dateValue.value);
        } else if (tool.value === 'terminal') {
          res = await systemApi.terminal(terminal.value);
        }
        output.value = res?.output || res?.message || JSON.stringify(res);
      } catch (e) {
        output.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    return { tool, host, iface, count, options, output, loading, dateValue, terminal, run, t };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left" style="gap:8px;">
          <input v-if="['ping','traceroute','mtr'].includes(tool)" v-model="host" :placeholder="$t('system.host')" />
          <input v-if="tool === 'tcpdump'" v-model="iface" :placeholder="$t('system.interface')" />
          <input v-if="['ping','mtr','tcpdump'].includes(tool)" v-model.number="count" style="width:60px;" />
          <input v-if="tool === 'tcpdump'" v-model="options" :placeholder="$t('system.options')" />
          <input v-if="tool === 'date'" v-model="dateValue" placeholder="MMDDhhmmCCYY" />
          <template v-if="tool === 'terminal'">
            <input v-model="terminal.key" placeholder="key" />
            <input v-model.number="terminal.length" placeholder="length" />
            <input v-model="terminal.pager" placeholder="pager" />
            <input v-model.number="terminal.width" placeholder="width" />
          </template>
          <ToolbarButton icon="execute" primary @click="run" :disabled="loading">{{ $t('app.confirm') }}</ToolbarButton>
        </div>
      </div>
      <div class="page-section">
        <pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;min-height:200px;white-space:pre-wrap;">{{ output || t('tool.clickToExecute') }}</pre>
      </div>
    </div>
  `,
});
