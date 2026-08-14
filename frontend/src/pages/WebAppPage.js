import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { webappApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'WebAppPage',
  setup() {
    const { t } = useI18n();
    const version = ref(null);
    const history = ref([]);
    const updateSource = ref('');
    const updateFile = ref(null);
    const updateMode = ref('url');
    const message = ref('');
    const activeTab = ref('update');

    const tabs = [
      { key: 'update', title: t('webApp.title') },
      { key: 'history', title: t('webApp.history') },
    ];

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
        message.value = res.has_update ? t('webApp.hasNewVersion', { version: res.latest_version }) : t('webApp.latestVersion');
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
      if (!confirm(t('webApp.confirmRollback'))) return;
      try {
        const res = await webappApi.rollback();
        message.value = res.message;
        await loadVersion();
        await loadHistory();
      } catch (e) {
        showError(e);
      }
    }

    return { version, history, updateSource, updateFile, updateMode, message, activeTab, tabs, check, update, rollback, t };
  },
  template: `
    <div>
      <div v-if="message" class="alert alert-info">{{ message }}</div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #update>
          <div style="padding:16px 0;">
            <div class="form-row"><label class="form-label">{{ t('webApp.version') }}</label><div class="form-control">{{ version?.version }} (build {{ version?.build }}, commit {{ version?.commit }})</div></div>
            <div class="form-row"><label class="form-label">{{ t('webApp.updateMode') }}</label>
              <div class="form-control" style="display:flex;gap:12px;">
                <label><input type="radio" value="url" v-model="updateMode" /> URL</label>
                <label><input type="radio" value="file" v-model="updateMode" /> {{ t('webApp.updateFile') }}</label>
              </div>
            </div>
            <div class="form-row" v-if="updateMode === 'url'"><label class="form-label">{{ t('webApp.updateUrl') }}</label><input class="form-control" v-model="updateSource" /></div>
            <div class="form-row" v-else><label class="form-label">{{ t('webApp.updateFile') }}</label><input type="file" @change="updateFile = $event.target.files[0]" /></div>
            <div class="form-row"><label class="form-label"></label>
              <div style="display:flex;gap:8px;">
                <ToolbarButton icon="checkUpdate" @click="check">{{ t('webApp.checkUpdate') }}</ToolbarButton>
                <ToolbarButton icon="update" primary @click="update">{{ t('webApp.update') }}</ToolbarButton>
                <ToolbarButton icon="rollback" @click="rollback">{{ t('webApp.rollback') }}</ToolbarButton>
              </div>
            </div>
          </div>
        </template>
        <template #history>
          <table class="data-table" style="margin-top:16px;">
            <thead><tr><th>{{ t('webApp.columns.version') }}</th><th>{{ t('webApp.columns.time') }}</th><th>{{ t('webApp.columns.action') }}</th><th>{{ t('webApp.columns.status') }}</th></tr></thead>
            <tbody>
              <tr v-for="h in history" :key="h.version + h.timestamp">
                <td>{{ h.version }}</td><td>{{ h.timestamp }}</td><td>{{ h.action }}</td><td>{{ h.status }}</td>
              </tr>
              <tr v-if="!history.length"><td colspan="4" class="text-center">{{ t('webApp.noHistory') }}</td></tr>
            </tbody>
          </table>
        </template>
      </TabGroup>
    </div>
  `,
  components: { TabGroup, ToolbarButton },
});
