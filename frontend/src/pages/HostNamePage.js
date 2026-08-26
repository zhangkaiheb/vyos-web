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

    function toScalarString(value) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    }

    function unwrapTagNode(node) {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return '';
      const keys = Object.keys(node);
      if (keys.length !== 1) return '';
      const key = keys[0];
      const child = node[key];
      const scalarChild = toScalarString(child);
      if (scalarChild) return scalarChild;
      if (child && typeof child === 'object' && !Array.isArray(child) && Object.keys(child).length === 0) return key;
      return '';
    }

    function extractHostName(data) {
      const scalar = toScalarString(data);
      if (scalar) return scalar;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return '';

      const keysToTry = ['host-name', 'host_name', 'name', 'value'];
      for (const key of keysToTry) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const scalarValue = toScalarString(data[key]);
          if (scalarValue) return scalarValue;
          const tagNodeValue = unwrapTagNode(data[key]);
          if (tagNodeValue) return tagNodeValue;
        }
      }

      return unwrapTagNode(data);
    }

    function extractHostNameFromSystemPayload(data) {
      const direct = extractHostName(data);
      if (direct) return direct;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return '';

      if (Object.prototype.hasOwnProperty.call(data, 'system')) {
        const fromSystem = extractHostName(data.system);
        if (fromSystem) return fromSystem;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'host_name')) {
        const fromHostName = extractHostName(data.host_name);
        if (fromHostName) return fromHostName;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'host-name')) {
        const fromHostName = extractHostName(data['host-name']);
        if (fromHostName) return fromHostName;
      }

      return '';
    }

    const commandPath = computed(() => 'system host-name');

    async function load() {
      loading.value = true;
      try {
        const sessionRes = await configApi.get('system host-name', true);
        console.log('[HostNamePage] session response data:', sessionRes?.data);
        let nextValue = extractHostNameFromSystemPayload(sessionRes.data);
        console.log('[HostNamePage] extracted from session leaf path:', nextValue);

        if (!nextValue) {
          const sessionSystemRes = await configApi.get('system', true);
          console.log('[HostNamePage] session system response data:', sessionSystemRes?.data);
          nextValue = extractHostNameFromSystemPayload(sessionSystemRes.data);
          console.log('[HostNamePage] extracted from session system path:', nextValue);
        }

        if (!nextValue) {
          const runningRes = await configApi.get('system host-name', false);
          console.log('[HostNamePage] running response data:', runningRes?.data);
          nextValue = extractHostNameFromSystemPayload(runningRes.data);
          console.log('[HostNamePage] extracted from running leaf path:', nextValue);
        }

        if (!nextValue) {
          const runningSystemRes = await configApi.get('system', false);
          console.log('[HostNamePage] running system response data:', runningSystemRes?.data);
          nextValue = extractHostNameFromSystemPayload(runningSystemRes.data);
          console.log('[HostNamePage] extracted from running system path:', nextValue);
        }

        hostName.value = nextValue;
        console.log('[HostNamePage] final hostName value:', hostName.value);
      } catch (e) {
        console.error('[HostNamePage] load failed:', e);
        showError(e.message || t('hostname.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const nextHostName = String(hostName.value || '').trim();
      if (!nextHostName) return showError({ message: t('hostname.errors.hostnameRequired') });
      saving.value = true;
      try {
        await configStore.deleteConfig('system host-name');
        await configStore.setConfig('system host-name', nextHostName);
        configStore.markPending();
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e.message || t('hostname.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
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
          <ToolbarButton icon="save" primary @click="save" :disabled="saving || loading">{{ saving ? t('hostname.buttons.saving') : t('hostname.buttons.confirm') }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
});
