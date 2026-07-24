import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { userApi, quotasApi, configApi, conntrackLogApi } from '/src/api/index.js';
import { locale, localeNames, LOCALES } from '/src/i18n/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export default defineComponent({
  name: 'SettingsPage',
  setup() {
    const user = ref(null);
    const lang = ref(locale.value);
    const commitMode = ref('manual');
    const conntrackLog = ref({ tcp: false, udp: false, icmp: false, other: false });
    const quotas = ref({});
    const message = ref('');

    onMounted(async () => {
      const token = localStorage.getItem('vyos_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const res = await userApi.get(payload.username);
          user.value = res.user;
        } catch (e) {}
      }
      try {
        const q = await quotasApi.get();
        const map = {};
        (q.quotas || []).forEach(item => { map[item.table_type] = item.max_entries; });
        quotas.value = map;
      } catch (e) {}
      try {
        const cfg = await configApi.get('system settings');
        commitMode.value = cfg.data?.commit_mode || 'manual';
      } catch (e) {}
      try {
        const cfg = await conntrackLogApi.get();
        conntrackLog.value = {
          tcp: cfg.conntrack_tcp || false,
          udp: cfg.conntrack_udp || false,
          icmp: cfg.conntrack_icmp || false,
          other: cfg.conntrack_other || false,
        };
      } catch (e) {}
    });

    async function save() {
      try {
        const token = localStorage.getItem('vyos_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          locale.value = lang.value;
          localStorage.setItem('locale', lang.value);
          await userApi.preferences(payload.username, { language: lang.value, theme: 'light' });
        }
        await configApi.set('system settings', { commit_mode: commitMode.value });
        await conntrackLogApi.set({ enabled: Object.values(conntrackLog.value).some(Boolean), ...conntrackLog.value });
        for (const [type, maxEntries] of Object.entries(quotas.value)) {
          await quotasApi.set({ type, max_entries: maxEntries });
        }
        message.value = '已保存';
      } catch (e) {
        showError(e);
      }
    }

    return { user, lang, commitMode, conntrackLog, quotas, message, save, localeNames, LOCALES };
  },
  template: `
    <div>
      <div class="toolbar"><div class="toolbar-left"><h3>{{ $t('system.settings') }}</h3></div></div>
      <div class="page-section">
      <div v-if="message" class="alert alert-success">{{ message }}</div>
      <div class="form-row">
        <label class="form-label">{{ $t('system.language') }}</label>
        <select class="form-control" v-model="lang">
          <option v-for="l in LOCALES" :key="l" :value="l">{{ localeNames[l] }}</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">{{ $t('system.commitMode') }}</label>
        <select class="form-control" v-model="commitMode">
          <option value="manual">{{ $t('system.manual') }}</option>
          <option value="auto">{{ $t('system.auto') }}</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">{{ $t('system.conntrackLog') }}</label>
        <div class="form-control" style="display:flex;gap:16px;align-items:center;">
          <label><input type="checkbox" v-model="conntrackLog.tcp" /> TCP</label>
          <label><input type="checkbox" v-model="conntrackLog.udp" /> UDP</label>
          <label><input type="checkbox" v-model="conntrackLog.icmp" /> ICMP</label>
          <label><input type="checkbox" v-model="conntrackLog.other" /> Other</label>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">{{ $t('system.tableQuotas') }}</label>
        <div class="form-control">
          <div v-for="(v, k) in quotas" :key="k" style="display:flex;gap:8px;margin-bottom:6px;">
            <span style="min-width:180px;">{{ k }}</span>
            <input type="number" v-model.number="quotas[k]" style="flex:1;" />
          </div>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label"></label>
        <ToolbarButton icon="save" primary @click="save">{{ $t('app.save') }}</ToolbarButton>
      </div>
      </div>
    </div>
  `,
  components: { DraggableModal },
});
