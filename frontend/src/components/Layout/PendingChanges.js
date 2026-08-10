import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { emitMenuRefresh } from '/src/utils/eventBus.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export default defineComponent({
  name: 'PendingChanges',
  components: { DraggableModal },
  emits: ['discard', 'save', 'commit'],
  setup() {
    const config = useConfigStore();
    const route = useRoute();
    const showDiffModal = ref(false);
    const diffLoading = ref(false);
    const diff = ref([]);
    const message = ref('');
    const submitting = ref(false);
    const saving = ref(false);
    const committed = ref(false);
    const submitted = ref(false);
    const saved = ref(false);

    onMounted(() => {
      // No automatic check - only track changes from user actions
    });

    async function loadDiff() {
      diffLoading.value = true;
      try {
        const res = await configApi.compare('working', 'active');
        diff.value = res.diff || res.lines || [];
      } catch (e) {
        diff.value = [];
      } finally {
        diffLoading.value = false;
      }
    }

    async function openDiff() {
      showDiffModal.value = true;
      committed.value = false;
      submitted.value = false;
      saved.value = false;
      await loadDiff();
    }

    async function commit() {
      submitting.value = true;
      try {
        await config.commit();
        message.value = '变更已提交';
        committed.value = true;
        submitted.value = true;
        // Do NOT auto-close modal
      } catch (e) {
        message.value = e.message;
        showError(e);
      } finally {
        submitting.value = false;
      }
    }

    async function discard() {
      try {
        await config.discard();
        message.value = '变更已丢弃';
        // Do NOT auto-close modal
        // Refresh current page to update data
        if (route.path) {
          emitMenuRefresh(route.path);
        }
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    async function save() {
      saving.value = true;
      try {
        await config.save();
        message.value = '变更已保存';
        saved.value = true;
        // Do NOT auto-close modal
        // Refresh current page to update data
        if (route.path) {
          emitMenuRefresh(route.path);
        }
      } catch (e) {
        message.value = e.message;
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    return { config, showDiffModal, diffLoading, diff, message, submitting, saving, committed, submitted, saved, openDiff, commit, discard, save };
  },
  template: `
    <div class="pending-changes-icon" title="未提交的变更" @click="openDiff">
      <span :class="['pending-icon', { flashing: config.pendingChanges }]">⚙</span>
    </div>
    <DraggableModal title="未提交的变更" :visible="showDiffModal" width="700px" @update:visible="showDiffModal = $event" @close="showDiffModal = false">
      <template #footer>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <ToolbarButton icon="diff" :disabled="submitting || submitted" @click="openDiff">查看差异</ToolbarButton>
          <ToolbarButton icon="save" :disabled="saving || !committed || saved" @click="save">{{ saving ? '保存中...' : '保存变更' }}</ToolbarButton>
          <ToolbarButton icon="commit" primary :disabled="submitting || submitted" @click="commit">{{ submitting ? '提交中...' : '提交变更' }}</ToolbarButton>
          <ToolbarButton icon="discard" :disabled="committed || submitting" @click="discard">丢弃变更</ToolbarButton>
        </div>
      </template>
      <div v-if="diffLoading" style="text-align:center;padding:20px;color:#999;">加载中<span class="dot1">.</span><span class="dot2">.</span><span class="dot3">.</span></div>
      <div v-else-if="diff.length" class="commit-diff-modal">
        <div v-for="(line, i) in diff" :key="i" :class="{ 'diff-add': line.startsWith('+'), 'diff-del': line.startsWith('-') }">{{ line }}</div>
      </div>
      <div v-else style="text-align:center;padding:20px;color:#999;">暂无差异数据</div>
      <div v-if="message" style="text-align:center;padding:8px;color:#d48806;font-size:12px;">{{ message }}</div>
    </DraggableModal>
  `,
});
