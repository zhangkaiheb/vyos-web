import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { webappApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';

export default defineComponent({
  name: 'WebAppPage',
  setup() {
    const version = ref(null);
    const history = ref([]);
    const updateSource = ref('');
    const updateFile = ref(null);
    const updateMode = ref('url');
    const message = ref('');

    onMounted(async () => {
      await loadVersion();
      await loadHistory();
    });

    async function loadVersion() {
      try {
        const res = await webappApi.version();
        version.value = res.version;
      } catch (e) {
        showError(e);
      }
    }

    async function loadHistory() {
      try {
        const res = await webappApi.history();
        history.value = res.history || [];
      } catch (e) {}
    }

    async function check() {
      try {
        const res = await webappApi.checkUpdate();
        message.value = res.has_update ? `有新版本 ${res.latest_version}` : '当前已是最新版本';
      } catch (e) {
        showError(e);
      }
    }

    async function update() {
      try {
        let source = updateSource.value;
        if (updateMode.value === 'file' && updateFile.value) {
          source = await updateFile.value.text();
        }
        if (!source) return;
        const res = await webappApi.update(source);
        message.value = res.message;
        await loadHistory();
      } catch (e) {
        showError(e);
      }
    }

    async function rollback() {
      if (!confirm('确认回滚到上一版本？')) return;
      try {
        const res = await webappApi.rollback();
        message.value = res.message;
        await loadVersion();
        await loadHistory();
      } catch (e) {
        showError(e);
      }
    }

    return { version, history, updateSource, updateFile, updateMode, message, check, update, rollback };
  },
  template: `
    <div>
      <div v-if="message" class="alert alert-info">{{ message }}</div>
      <div class="toolbar"><div class="toolbar-left"><h3>{{ $t('webapp.title') }}</h3></div></div>
      <div class="form-row"><label class="form-label">{{ $t('webapp.version') }}</label><div class="form-control">{{ version?.version }} (build {{ version?.build }}, commit {{ version?.commit }})</div></div>
      <div class="form-row"><label class="form-label">{{ $t('webapp.updateMode') }}</label>
        <div class="form-control" style="display:flex;gap:12px;">
          <label><input type="radio" value="url" v-model="updateMode" /> URL</label>
          <label><input type="radio" value="file" v-model="updateMode" /> {{ $t('webapp.updateFile') }}</label>
        </div>
      </div>
      <div class="form-row" v-if="updateMode === 'url'"><label class="form-label">{{ $t('webapp.updateUrl') }}</label><input class="form-control" v-model="updateSource" /></div>
      <div class="form-row" v-else><label class="form-label">{{ $t('webapp.updateFile') }}</label><input type="file" @change="updateFile = $event.target.files[0]" /></div>
      <div class="form-row"><label class="form-label"></label>
        <div style="display:flex;gap:8px;">
          <button @click="check">{{ $t('webapp.checkUpdate') }}</button>
          <button class="primary" @click="update">{{ $t('webapp.update') }}</button>
          <button @click="rollback">{{ $t('webapp.rollback') }}</button>
        </div>
      </div>
      <hr style="margin:20px 0;" />
      <div class="toolbar"><div class="toolbar-left"><h3>{{ $t('webapp.history') }}</h3></div></div>
      <table class="data-table">
        <thead><tr><th>版本</th><th>时间</th><th>操作</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="h in history" :key="h.version + h.timestamp">
            <td>{{ h.version }}</td><td>{{ h.timestamp }}</td><td>{{ h.action }}</td><td>{{ h.status }}</td>
          </tr>
          <tr v-if="!history.length"><td colspan="4" class="text-center">暂无历史</td></tr>
        </tbody>
      </table>
    </div>
  `,
});
