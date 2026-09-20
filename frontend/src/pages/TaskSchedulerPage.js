import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'TaskSchedulerPage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const tasks = ref([]);
    const selected = ref([]);
    const showModal = ref(false);
    const editingTask = ref(null);
    const deleteModalVisible = ref(false);
    const pendingDeleteName = ref('');

    const taskSchema = [
      { key: 'name', title: t('taskScheduler.form.name'), type: 'text', required: true, help: t('taskScheduler.form.nameHelp') },
      { key: 'crontab-spec', title: t('taskScheduler.form.crontabSpec'), type: 'text', help: t('taskScheduler.form.crontabSpecHelp') },
      { key: 'executable-path', title: t('taskScheduler.form.executablePath'), type: 'text', help: t('taskScheduler.form.executablePathHelp') },
      { key: 'executable-arguments', title: t('taskScheduler.form.executableArguments'), type: 'text', help: t('taskScheduler.form.executableArgumentsHelp') },
      { key: 'interval', title: t('taskScheduler.form.interval'), type: 'text', help: t('taskScheduler.form.intervalHelp') },
    ];

    const taskColumns = [
      { key: 'name', title: t('taskScheduler.columns.name') },
      { key: 'crontab_spec', title: t('taskScheduler.columns.crontabSpec') },
      { key: 'executable_path', title: t('taskScheduler.columns.executablePath') },
      { key: 'executable_arguments', title: t('taskScheduler.columns.executableArguments') },
      { key: 'interval', title: t('taskScheduler.columns.interval') },
    ];

    const commandPath = computed(() => 'system task-scheduler');

    function taskToForm(task) {
      return {
        name: task.name,
        'crontab-spec': task.crontab_spec || '',
        'executable-path': task.executable_path || '',
        'executable-arguments': task.executable_arguments || '',
        interval: task.interval || '',
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
      try {
        const res = await configApi.get('system task-scheduler', true);
        const d = res.data || {};
        tasks.value = Object.entries(d.task || {}).map(([name, task]) => ({
          name,
          crontab_spec: task['crontab-spec'] || '',
          executable_path: task.executable?.path || '',
          executable_arguments: task.executable?.arguments || '',
          interval: task.interval || '',
        }));
      } catch (e) {
        showError(e.message || t('taskScheduler.errors.loadFailed'));
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
      pendingDeleteName.value = record.name;
      deleteModalVisible.value = true;
    }

    function confirmRemoveTask() {
      deleteModalVisible.value = false;
      const idx = tasks.value.findIndex(item => item.name === pendingDeleteName.value);
      if (idx >= 0) tasks.value.splice(idx, 1);
      pendingDeleteName.value = '';
    }

    function saveTask(form) {
      const task = formToTask(form);
      const idx = tasks.value.findIndex(x => x.name === task.name);
      if (idx >= 0) {
        tasks.value.splice(idx, 1, task);
      } else {
        tasks.value.push(task);
      }
      showModal.value = false;
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('system task-scheduler');
        for (const task of tasks.value) {
          if (task.crontab_spec) {
            await configStore.setConfig(`system task-scheduler task ${task.name} crontab-spec`, task.crontab_spec);
          }
          if (task.executable_path) {
            await configStore.setConfig(`system task-scheduler task ${task.name} executable path`, task.executable_path);
          }
          if (task.executable_arguments) {
            await configStore.setConfig(`system task-scheduler task ${task.name} executable arguments`, task.executable_arguments);
          }
          if (task.interval) {
            await configStore.setConfig(`system task-scheduler task ${task.name} interval`, task.interval);
          }
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('taskScheduler.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {t,
      
      loading, saving, tasks, selected, showModal, editingTask,
      deleteModalVisible, pendingDeleteName,
      taskSchema, taskColumns, commandPath,
      load, save,
      createTask, editTaskByRecord, removeTaskByRecord, confirmRemoveTask, saveTask,
    };
  },
  template: `
    <div class="page-container">
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
          <ToolbarButton icon="refresh" @click="load">{{ t('taskScheduler.buttons.refresh') }}</ToolbarButton>
        </template>
      </DataTable>
      <DraggableModal v-model:visible="showModal" :title="editingTask?.name ? t('taskScheduler.buttons.edit') : t('taskScheduler.buttons.create')" width="600px">
        <ConfigForm
          v-if="showModal"
          :schema="taskSchema"
          :modelValue="editingTask"
          @update:modelValue="editingTask = $event"
          @save="saveTask"
          @cancel="showModal = false"
        />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('taskScheduler.modal.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveTask">
        <div>{{ t('taskScheduler.modal.confirmDeleteMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
