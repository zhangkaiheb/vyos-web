import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'TaskSchedulerPage',
  components: { DataTable, DraggableModal, ConfigForm, CommandPreview, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const tasks = ref([]);
    const selected = ref([]);
    const showModal = ref(false);
    const editingTask = ref(null);

    const taskSchema = [
      { key: 'name', title: '任务名称', type: 'text', required: true, help: '定时任务名称' },
      { key: 'crontab-spec', title: 'Crontab 表达式', type: 'text', help: 'UNIX crontab 时间规范字符串（如: 0 * * * *）' },
      { key: 'executable-path', title: '可执行文件路径', type: 'text', help: '可执行文件的路径' },
      { key: 'executable-arguments', title: '参数', type: 'text', help: '传递给可执行文件的参数' },
      { key: 'interval', title: '执行间隔', type: 'text', help: '执行间隔（如: 30, 30m, 2h, 1d；纯数字表示分钟）' },
    ];

    const taskColumns = [
      { key: 'name', title: '任务名称' },
      { key: 'crontab_spec', title: 'Crontab 表达式' },
      { key: 'executable_path', title: '可执行文件' },
      { key: 'executable_arguments', title: '参数' },
      { key: 'interval', title: '执行间隔' },
    ];

    const commandPath = computed(() => 'system task-scheduler');

    function taskToForm(t) {
      return {
        name: t.name,
        'crontab-spec': t.crontab_spec || '',
        'executable-path': t.executable_path || '',
        'executable-arguments': t.executable_arguments || '',
        interval: t.interval || '',
      };
    }

    function formToTask(f) {
      return {
        name: f.name,
        crontab_spec: f['crontab-spec'] || '',
        executable_path: f['executable-path'] || '',
        executable_arguments: f['executable-arguments'] || '',
        interval: f.interval || '',
      };
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('system task-scheduler', true);
        const d = res.data || {};
        tasks.value = Object.entries(d.task || {}).map(([name, t]) => ({
          name,
          crontab_spec: t['crontab-spec'] || '',
          executable_path: t.executable?.path || '',
          executable_arguments: t.executable?.arguments || '',
          interval: t.interval || '',
        }));
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function createTask() {
      editingTask.value = taskToForm({ name: '' });
      showModal.value = true;
    }

    function editTaskByRecord(record) {
      editingTask.value = taskToForm(record);
      showModal.value = true;
    }

    function removeTaskByRecord(record) {
      if (confirm(`确认删除定时任务 "${record.name}"？`)) {
        const idx = tasks.value.findIndex(t => t.name === record.name);
        if (idx >= 0) tasks.value.splice(idx, 1);
      }
    }

    function saveTask(form) {
      const t = formToTask(form);
      const idx = tasks.value.findIndex(x => x.name === t.name);
      if (idx >= 0) {
        tasks.value.splice(idx, 1, t);
      } else {
        tasks.value.push(t);
      }
      showModal.value = false;
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('system task-scheduler');
        for (const t of tasks.value) {
          if (t.crontab_spec) {
            await configApi.set(`system task-scheduler task ${t.name} crontab-spec`, t.crontab_spec);
          }
          if (t.executable_path) {
            await configApi.set(`system task-scheduler task ${t.name} executable path`, t.executable_path);
          }
          if (t.executable_arguments) {
            await configApi.set(`system task-scheduler task ${t.name} executable arguments`, t.executable_arguments);
          }
          if (t.interval) {
            await configApi.set(`system task-scheduler task ${t.name} interval`, t.interval);
          }
        }
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {
      loading, saving, saved, tasks, selected, showModal, editingTask,
      taskSchema, taskColumns, commandPath,
      load, save,
      createTask, editTaskByRecord, removeTaskByRecord, saveTask,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <DataTable
        :columns="taskColumns"
        :data="tasks"
        :loading="loading"
        :actions="['create', 'edit', 'delete', 'refresh']"
        v-model:selected="selected"
        rowKey="name"
        @create="createTask"
        @edit="editTaskByRecord"
        @remove="removeTaskByRecord"
      >
        <template #toolbar-left>
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
        </template>
      </DataTable>
      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>
      <DraggableModal v-model:visible="showModal" :title="editingTask?.name ? '编辑定时任务' : '新建定时任务'" width="600px">
        <ConfigForm
          v-if="showModal"
          :schema="taskSchema"
          :modelValue="editingTask"
          @update:modelValue="editingTask = $event"
          @save="saveTask"
          @cancel="showModal = false"
        />
      </DraggableModal>
    </div>
  `,
});
