import { defineComponent, ref, watch, onMounted, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

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

    const schema = computed(() => {
      const meta = route.meta?.menuItem;
      if (meta?.schema) return meta.schema;
      return Object.keys(data.value).map(k => ({ key: k, title: k }));
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configStore.getConfig(path.value, true);
        data.value = res.data || {};
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      try {
        await configStore.setConfig(path.value, data.value);
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
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="primary" @click="save" :disabled="writeDisabled">{{ $t('app.save') }}</button>
          <button @click="load">{{ $t('app.refresh') }}</button>
        </div>
        <div class="toolbar-right">
          <HelpButton :title="(route.meta?.menuItem?.label || '') + ' Help'" :routePath="route.path" />
        </div>
      </div>
      <div class="page-section">
        <div v-if="saved" class="alert alert-success">{{ $t('msg.saved') }}</div>
        <CommandPreview :path="path" />
        <ConfigForm v-model="data" :schema="schema" :disabled="writeDisabled" />
      </div>
    </div>
  `,
  components: { ConfigForm, HelpButton, CommandPreview },
});
