import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'InputPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const items = ref([]);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedItems = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const COLUMNS = computed(() => [
      { key: 'name', title: t('input.columns.name'), width: 120 },
      { key: 'description', title: t('input.columns.description'), width: 200 },
      { key: 'redirect', title: t('input.columns.redirect'), width: 120 },
      { key: 'disable', title: t('input.columns.disable'), width: 80 },
      { key: 'actions', title: t('input.columns.actions'), width: 100 },
    ]);

    const basicSchema = computed(() => [
      { key: 'name', title: t('input.schema.name.title'), type: 'text', required: true, placeholder: t('input.schema.name.placeholder'), help: t('input.schema.name.help') },
      { key: 'description', title: t('input.schema.description.title'), type: 'text', placeholder: t('input.schema.description.placeholder') },
      { key: 'redirect', title: t('input.schema.redirect.title'), type: 'select', options: interfaceOptions.value, placeholder: t('input.schema.redirect.placeholder'), help: t('input.schema.redirect.help') },
      { key: 'disable', title: t('input.schema.disable.title'), type: 'checkbox', help: t('input.schema.disable.help') },
    ]);

    const commandText = computed(() => {
      if (!editingItem.value) return '';
      const m = editingItem.value;
      const name = m.name || 'ifbN';
      const lines = [];

      if (m.description) lines.push(`set interfaces input ${name} description "${m.description}"`);
      if (m.redirect) lines.push(`set interfaces input ${name} redirect ${m.redirect}`);
      if (m.disable) lines.push(`set interfaces input ${name} disable`);

      return lines.length ? lines.join('\n') : t('input.messages.noConfig');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('input.tabs.basic') },
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
      showError({ message: `${t('input.messages.errorPrefix', { code: err.code || 'ERROR' })}\n${t('input.messages.errorMessage', { message: err.message || err })}` });
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
        if (!form.name) { showError({ message: t('input.messages.nameRequired') }); return; }
        const config = formToItem(form);
        await configStore.setConfig(`interfaces input ${form.name}`, config);
        configStore.markPending();
        await configStore.checkSessionChanged();
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedItems.value.length) { showError({ message: t('input.messages.selectToDelete') }); return; }
      pendingDeleteNames.value = selectedItems.value.map(m => m.name);
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      try {
        for (const name of pendingDeleteNames.value) {
          await configStore.deleteConfig(`interfaces input ${name}`);
          configStore.markPending();
        }
        selectedItems.value = [];
        pendingDeleteNames.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      loading, items, selected: selectedItems, modalVisible, editingItem, interfaceOptions, activeTab,
      deleteModalVisible, pendingDeleteNames,
      COLUMNS,
      basicSchema, commandText, modalTabs,
      openModal, save, remove, confirmRemove, load,
      t,
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
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.name ? t('input.modal.edit') : t('input.modal.create')" width="700px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingItem" /></template>
            <template #command><pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre></template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ t('input.buttons.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ t('input.buttons.confirm') }}</button>
        </template>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('input.modal.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('input.modal.confirmDeleteMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
