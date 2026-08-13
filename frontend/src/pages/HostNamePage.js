import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'HostNamePage',
  components: { ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const hostName = ref('');

    const commandPath = computed(() => 'system host-name');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('system host-name', true);
        hostName.value = res.data || '';
      } catch (e) {
        showError(e.message || t('hostname.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (!hostName.value.trim()) return showError({ message: t('hostname.errors.hostnameRequired') });
      saving.value = true;
      try {
        await configApi.delete('system host-name');
        await configApi.set('system host-name', hostName.value.trim());
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('hostname.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return { loading, saving, hostName, commandPath, load, save, t };
  },
  template: `
    <div class="page-container">
      <div class="form-row">
        <label class="form-label" :title="t('hostname.labels.titleTip')">{{ t('hostname.labels.name') }}</label>
        <input class="form-control" v-model="hostName" :placeholder="t('hostname.labels.placeholder')" :disabled="loading" />
      </div>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" @click="save" :disabled="saving || loading">{{ saving ? t('hostname.buttons.saving') : t('hostname.buttons.confirm') }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
});
