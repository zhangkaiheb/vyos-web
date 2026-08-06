import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'HostNamePage',
  components: { CommandPreview, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const hostName = ref('');

    const commandPath = computed(() => 'system host-name');

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('system host-name', true);
        hostName.value = res.data || '';
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (!hostName.value.trim()) return alert('请输入主机名');
      saving.value = true;
      try {
        await configApi.delete('system host-name');
        await configApi.set('system host-name', hostName.value.trim());
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return { loading, saving, saved, hostName, commandPath, load, save };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <div class="form-row">
        <label class="form-label" title="系统主机名（默认: vyos）">主机名</label>
        <input class="form-control" v-model="hostName" placeholder="请输入主机名（默认: vyos）" :disabled="loading" />
      </div>
      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || !hostName.trim()">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>
    </div>
  `,
});
