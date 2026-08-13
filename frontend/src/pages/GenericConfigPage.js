import { defineComponent, ref, watch, onMounted, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'GenericConfigPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref({});
    const loading = ref(false);
    const saved = ref(false);
    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const isLeaf = ref(false);

    const backendKeyMap = {
      'Rule action': 'firewall.ruleAction',
      'Protocol to match (protocol name, number, or "all")': 'firewall.protocolToMatch',
      'Disable instance': 'firewall.disableInstance',
      'Session state': 'firewall.sessionState',
      'Description': 'firewall.description',
    };

    const schema = computed(() => {
      const meta = route.meta?.menuItem;
      if (isLeaf.value) {
        return [{ key: 'value', title: meta?.label || t('genericConfig.defaultValue'), type: 'text' }];
      }
      if (meta?.schema) return meta.schema;
      return Object.keys(data.value).map(k => {
        const transKey = backendKeyMap[k];
        return { key: k, title: transKey ? t(transKey) : k };
      });
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configStore.getConfig(path.value, true);
        const raw = res.data;
        if (raw !== null && typeof raw !== 'object') {
          isLeaf.value = true;
          data.value = { value: raw };
        } else {
          isLeaf.value = false;
          data.value = raw || {};
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      try {
        const payload = isLeaf.value ? data.value.value : data.value;
        await configStore.setConfig(path.value, payload);
        configStore.markPending();
        saved.value = true;
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });
    watch(() => route.path, load);

    return { data, schema, loading, saved, load, save, route, path, writeDisabled, t };
  },
  template: `
    <div>
      <div class="page-section">
        <div v-if="saved" class="alert alert-success">{{ $t('msg.saved') }}</div>
        <ConfigForm v-model="data" :schema="schema" :disabled="writeDisabled" />
        <div class="page-actions-bottom">
          <ToolbarButton icon="save" primary @click="save" :disabled="writeDisabled">{{ $t('app.save') }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
  components: { ConfigForm },
});
