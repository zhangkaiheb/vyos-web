import { defineComponent, onMounted, ref, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export default defineComponent({
  name: 'CommitBar',
  components: { DraggableModal },
  setup() {
    const config = useConfigStore();
    const message = ref('');
    const diff = ref([]);
    const showDiffModal = ref(false);
    const diffLoading = ref(false);
    const submitting = ref(false);
    const keepVisible = ref(false);

    async function loadDiff() {
      if (!config.sessionChanged) {
        diff.value = [];
        return;
      }
      try {
        const res = await configApi.compare('working', 'active');
        diff.value = res.diff || res.lines || [];
      } catch (e) {
        diff.value = [];
      }
    }

    watch(() => config.sessionChanged, async (changed) => {
      if (changed) await loadDiff();
      else diff.value = [];
    });

    onMounted(() => {
      config.checkSessionChanged();
      loadDiff();
      const timer = setInterval(() => {
        if (!keepVisible.value) {
          config.checkSessionChanged();
        }
        loadDiff();
      }, 5000);
      return () => clearInterval(timer);
    });

    async function openDiff() {
      showDiffModal.value = true;
      diffLoading.value = true;
      await loadDiff();
      diffLoading.value = false;
    }

    async function commit() {
      submitting.value = true;
      try {
        await configApi.commit();
        message.value = '配置提交成功';
        keepVisible.value = true;
      } catch (e) {
        message.value = e.message;
        showError(e);
      } finally {
        submitting.value = false;
      }
    }

    async function discard() {
      try {
        await configApi.discard();
        message.value = '变更已丢弃';
        keepVisible.value = false;
        await config.checkSessionChanged();
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    async function save() {
      try {
        await configApi.save();
        message.value = '配置已保存';
        keepVisible.value = false;
        await config.checkSessionChanged();
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    return { config, message, diff, showDiffModal, diffLoading, submitting, openDiff, commit, discard, save };
  },
  template: `
    <div v-if="config.sessionChanged || keepVisible" class="commit-bar changed">
      <div class="commit-summary">
        <span>存在未提交的变更</span>
        <span v-if="diff.length" style="color:#666;font-size:12px;">（{{ diff.length }} 行差异）</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <ToolbarButton icon="diff" @click="openDiff">查看差异</ToolbarButton>
        <ToolbarButton icon="save" @click="save">保存变更</ToolbarButton>
        <ToolbarButton icon="commit" primary :disabled="submitting" @click="commit">{{ submitting ? '提交中...' : '提交变更' }}</ToolbarButton>
        <ToolbarButton icon="discard" @click="discard">丢弃变更</ToolbarButton>
      </div>
      <span v-if="message" style="color:#d48806;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ message }}</span>
    </div>
    <DraggableModal title="配置差异" :visible="showDiffModal" width="700px" @update:visible="showDiffModal = $event" @close="showDiffModal = false">
      <template #footer>
        <ToolbarButton icon="cancel" @click="showDiffModal = false">关闭</ToolbarButton>
      </template>
      <div v-if="diffLoading" style="text-align:center;padding:20px;color:#999;">加载中<span class="dot1">.</span><span class="dot2">.</span><span class="dot3">.</span></div>
      <div v-else-if="diff.length" class="commit-diff-modal">
        <div v-for="(line, i) in diff" :key="i" :class="{ 'diff-add': line.startsWith('+'), 'diff-del': line.startsWith('-') }">{{ line }}</div>
      </div>
      <div v-else style="text-align:center;padding:20px;color:#999;">暂无差异数据</div>
    </DraggableModal>
  `,
});
