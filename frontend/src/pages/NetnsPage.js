import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'NetnsPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const netnsList = ref([]);
    const loading = ref(false);
    const selectedNames = ref([]);

    const modalVisible = ref(false);
    const editingNetns = ref(null);
    const editingOriginalName = ref('');

    const path = computed(() => 'netns');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
    ];

    const schema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: ns01' },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, false);
        console.log('Netns API response:', res);
        const raw = res.data || {};
        // API 返回 { name: { ns01: {...}, ns02: {...} } }
        const nameData = raw.name || raw;
        console.log('Netns name data:', nameData);
        const result = [];
        for (const [name, attrs] of Object.entries(nameData)) {
          if (typeof attrs === 'object' && attrs !== null) {
            result.push({
              id: name,
              name,
              description: attrs.description || '',
            });
          }
        }
        console.log('Netns parsed result:', result);
        result.sort((a, b) => a.name.localeCompare(b.name));
        netnsList.value = result;
        if (selectedNames.value.length && !result.some(n => n.name === selectedNames.value[0])) {
          selectedNames.value = [];
        }
      } catch (e) {
        console.error('Netns load error:', e);
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    watch(() => route.path, () => {
      selectedNames.value = [];
      load();
    });

    function emptyNetns() { return { name: '', description: '' }; }

    function create() {
      editingNetns.value = emptyNetns();
      editingOriginalName.value = '';
      modalVisible.value = true;
    }

    function edit() {
      if (!selectedNames.value.length) return showError({ message: '请选择一个网络命名空间' });
      if (selectedNames.value.length > 1) return showError({ message: '请选择一个网络命名空间' });
      const netns = netnsList.value.find(n => n.name === selectedNames.value[0]);
      if (!netns) return;
      editingNetns.value = { name: netns.name, description: netns.description };
      editingOriginalName.value = netns.name;
      modalVisible.value = true;
    }

    async function remove() {
      if (!selectedNames.value.length) return showError({ message: '请选择一个网络命名空间' });
      if (!confirm('确认删除选中的网络命名空间？')) return;
      for (const name of selectedNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedNames.value = [];
      await load();
    }

    async function save() {
      if (!editingNetns.value.name) return showError({ message: '请输入名称' });
      const original = editingOriginalName.value;
      if (!original && netnsList.value.some(n => n.name === editingNetns.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = {};
      if (editingNetns.value.description) value.description = editingNetns.value.description;
      try {
        if (original && original !== editingNetns.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          await configStore.setConfig(`${path.value} ${editingNetns.value.name}`, value);
        } else {
          await configStore.setConfig(`${path.value} ${editingNetns.value.name}`, value);
        }
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      netnsList, loading, selectedNames,
      modalVisible, editingNetns, editingOriginalName,
      columns, schema, path, writeDisabled,
      load, create, edit, remove, save,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selectedNames.length || selectedNames.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selectedNames.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="columns" :data="netnsList" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalName ? '编辑' : '创建'" width="500px" @confirm="save">
        <ConfigForm v-model="editingNetns" :schema="schema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
});
