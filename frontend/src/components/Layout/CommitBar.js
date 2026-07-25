import { defineComponent, onMounted, ref, watch } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';

export default defineComponent({
  name: 'CommitBar',
  setup() {
    const config = useConfigStore();
    const message = ref('');
    const diff = ref([]);
    const showDiff = ref(false);

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
        config.checkSessionChanged();
        loadDiff();
      }, 5000);
      return () => clearInterval(timer);
    });

    async function commit() {
      try {
        await config.commit();
        message.value = '配置提交成功';
        showDiff.value = false;
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    async function discard() {
      try {
        await config.discard();
        message.value = '变更已丢弃';
        showDiff.value = false;
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    async function save() {
      try {
        await configApi.save();
        message.value = '配置已保存';
      } catch (e) {
        message.value = e.message;
        showError(e);
      }
    }

    return { config, message, diff, showDiff, commit, discard, save };
  },
  template: `
    <div v-if="config.sessionChanged" class="commit-bar changed">
      <div class="commit-summary">
        <span>存在未提交的变更</span>
        <span v-if="diff.length" style="color:#666;font-size:12px;">（{{ diff.length }} 行差异）</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <ToolbarButton icon="diff" @click="showDiff = !showDiff">{{ showDiff ? '隐藏差异' : '查看差异' }}</ToolbarButton>
        <ToolbarButton icon="save" @click="save">保存配置</ToolbarButton>
        <ToolbarButton icon="commit" primary @click="commit">提交配置</ToolbarButton>
        <ToolbarButton icon="discard" @click="discard">丢弃变更</ToolbarButton>
      </div>
      <span v-if="message" style="color:#d48806;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ message }}</span>
    </div>
    <div v-if="config.sessionChanged && showDiff" class="commit-diff">
      <div v-for="(line, i) in diff" :key="i" :class="{ 'diff-add': line.startsWith('+'), 'diff-del': line.startsWith('-') }">{{ line }}</div>
      <div v-if="!diff.length">暂无差异数据</div>
    </div>
  `,
});
