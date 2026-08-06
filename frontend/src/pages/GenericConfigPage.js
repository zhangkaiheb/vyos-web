import { defineComponent, ref, watch, onMounted, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';

export default defineComponent({
  name: 'GenericConfigPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref({});
    const loading = ref(false);
    const saved = ref(false);
    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const isLeaf = ref(false);

    const schema = computed(() => {
      const meta = route.meta?.menuItem;
      if (isLeaf.value) {
        return [{ key: 'value', title: meta?.label || '值', type: 'text' }];
      }
      if (meta?.schema) return meta.schema;
      return Object.keys(data.value).map(k => ({ key: k, title: k }));
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
        saved.value = true;
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    onMounted(load);
    watch(() => route.path, load);

    return { data, schema, loading, saved, load, save, route, path, writeDisabled };
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
