import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 200 },
  { key: 'redirect', title: '重定向目标', width: 120 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

export default defineComponent({
  name: 'InputPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const items = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedItems = ref([]);

    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 ifb0, ifb1', help: '格式: ifbN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const m = editingItem.value;
      const name = m.name || 'ifbN';
      const lines = [];

      if (m.description) lines.push(`set interfaces input ${name} description "${m.description}"`);
      if (m.redirect) lines.push(`set interfaces input ${name} redirect ${m.redirect}`);
      if (m.disable) lines.push(`set interfaces input ${name} disable`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', redirect: '', disable: false,
      };
    }

    function itemToForm(m) {
      return {
        name: m.name || '',
        description: m.description || '',
        redirect: m.redirect || '',
        disable: !!m.disable,
      };
    }

    function formToItem(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.redirect) result.redirect = form.redirect;
      if (form.disable) result.disable = true;
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces input' });
        const cfg = res.data || {};
        items.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          redirect: val.redirect || '',
          disable: !!val.disable,
          description: val.description || '',
        }));

        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function showError(err) {
      alert(`错误码: ${err.code || 'ERROR'}\n错误信息: ${err.message || err}`);
    }

    function openModal(index = -1) {
      if (index >= 0) {
        editingItem.value = itemToForm(items.value[index]);
      } else {
        editingItem.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingItem.value;
        if (!form.name) { alert('请输入接口名称'); return; }
        const config = formToItem(form);
        await api.put('/config', { path: `interfaces input ${form.name}`, value: config });
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedItems.value.length) { alert('请先选择要删除的 input 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedItems.value.length} 个 input 接口?`)) return;
      try {
        for (const m of selectedItems.value) {
          await api.delete('/config', { path: `interfaces input ${m.name}` });
        }
        selectedItems.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, items, selected: selectedItems, modalVisible, editingItem, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="items"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? '编辑 input 接口' : '创建 input 接口'" width="700px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingItem" /></template>
            <template #command><pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="save">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
