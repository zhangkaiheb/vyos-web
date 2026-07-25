import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh, offMenuRefresh } from '/src/utils/eventBus.js';

const DYNAMIC_SUB_TYPES = [
  { key: 'address-group', title: 'IPv4 动态地址组', memberTitle: '地址组', memberKey: null },
  { key: 'ipv6-address-group', title: 'IPv6 动态地址组', memberTitle: '地址组', memberKey: null },
];

const GROUP_META = {
  'address-group': {
    title: '地址组',
    memberKey: 'address',
    memberTitle: '地址',
    memberValidate: 'ip-segment',
    memberPlaceholder: '每行一个值，支持单个 IPv4 地址或地址段（如 1.1.1.1 或 1.1.1.1-1.1.1.10）',
    includeKey: 'include',
    hasDescription: true,
  },
  'domain-group': {
    title: '域名组',
    memberKey: 'address',
    memberTitle: '域名',
    memberPlaceholder: '每行一个域名（如 example.com）',
    includeKey: null,
    hasDescription: true,
  },
  'interface-group': {
    title: '接口组',
    memberKey: 'interface',
    memberTitle: '接口',
    memberPlaceholder: '每行一个接口名（如 eth0 或 eth1.10）',
    dynamicSuggestions: true,
    includeKey: 'include',
    hasDescription: true,
  },
  'ipv6-address-group': {
    title: 'IPv6 地址组',
    memberKey: 'address',
    memberTitle: '地址',
    memberValidate: 'ipv6',
    memberPlaceholder: '每行一个值，支持单个 IPv6 地址或地址段（如 2001::1 或 2001::1-2001::ff）',
    includeKey: 'include',
    hasDescription: true,
  },
  'ipv6-network-group': {
    title: 'IPv6 网络组',
    memberKey: 'network',
    memberTitle: '网络',
    memberValidate: 'ipv6-prefix',
    memberPlaceholder: '每行一个 IPv6 网络（如 2001::/64）',
    includeKey: 'include',
    hasDescription: true,
  },
  'mac-group': {
    title: 'MAC 组',
    memberKey: 'mac-address',
    memberTitle: 'MAC 地址',
    memberValidate: 'mac',
    memberPlaceholder: '每行一个 MAC 地址（如 00:11:22:33:44:55）',
    includeKey: null,
    hasDescription: true,
  },
  'network-group': {
    title: '网络组',
    memberKey: 'network',
    memberTitle: '网络',
    memberValidate: 'ipv4-prefix',
    memberPlaceholder: '每行一个 IPv4 网络（如 192.168.1.0/24）',
    includeKey: 'include',
    hasDescription: true,
  },
  'port-group': {
    title: '端口组',
    memberKey: 'port',
    memberTitle: '端口',
    memberValidate: 'port',
    memberPlaceholder: '每行一个端口或端口段（如 80 或 1000-2000）',
    includeKey: 'include',
    hasDescription: true,
  },
  'dynamic-group': {
    title: '动态组',
    isDynamic: true,
  },
};

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function joinMembers(val) {
  return toArray(val).join('\n');
}

function splitMembers(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function buildSaveValue(item, meta) {
  const result = {};
  if (meta.hasDescription && item.description) {
    result.description = item.description;
  }
  if (meta.memberKey) {
    const members = splitMembers(item.members);
    if (members.length) result[meta.memberKey] = members;
  }
  if (meta.includeKey) {
    const includes = toArray(item.includes);
    if (includes.length) result[meta.includeKey] = includes;
  }
  return result;
}

export default defineComponent({
  name: 'FirewallGroupPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
    const activeDynamicTab = ref(DYNAMIC_SUB_TYPES[0].key);
    const availableIncludes = ref([]);

    const groupType = computed(() => {
      const parts = route.path.replace(/^\//, '').split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    });

    const meta = computed(() => GROUP_META[groupType.value] || {});
    const isDynamic = computed(() => !!meta.value.isDynamic);
    const basePath = computed(() => `firewall group ${groupType.value}`);
    const includePath = computed(() => {
      if (isDynamic.value) return `firewall group dynamic-group ${activeDynamicTab.value}`;
      return `firewall group ${groupType.value}`;
    });
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const dynamicBasePath = computed(() => `${basePath.value} ${activeDynamicTab.value}`);

    const columns = computed(() => {
      const cols = [{ key: 'name', title: '名称' }];
      if (meta.value.hasDescription) cols.push({ key: 'description', title: '描述' });
      if (meta.value.memberKey) cols.push({ key: 'members', title: meta.value.memberTitle });
      if (meta.value.includeKey) cols.push({ key: 'includes', title: '包含组' });
      return cols;
    });

    const dynamicColumns = computed(() => [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
    ]);

    const tableData = computed(() => {
      return data.value.map(item => {
        const row = { ...item };
        if (meta.value.memberKey) {
          row.members = toArray(item[meta.value.memberKey]).join(', ');
        }
        if (meta.value.includeKey) {
          row.includes = toArray(item[meta.value.includeKey]).join(', ');
        }
        return row;
      });
    });

    async function load() {
      loading.value = true;
      try {
        const path = isDynamic.value ? dynamicBasePath.value : basePath.value;
        const res = await configStore.getConfig(path, true);
        const d = res.data || {};
        data.value = Object.entries(d).map(([k, v]) => ({ id: k, name: k, ...v }));
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function loadIncludes() {
      if (!meta.value.includeKey) {
        availableIncludes.value = [];
        return;
      }
      try {
        const res = await configStore.getConfig(includePath.value, true);
        const d = res.data || {};
        availableIncludes.value = Object.keys(d);
      } catch (e) {
        availableIncludes.value = [];
      }
    }

    onMounted(() => {
      load();
      loadIncludes();
      onMenuRefresh(handleMenuRefresh);
    });
    onUnmounted(() => {
      offMenuRefresh(handleMenuRefresh);
    });
    watch(() => route.path, () => {
      activeDynamicTab.value = DYNAMIC_SUB_TYPES[0].key;
      load();
      loadIncludes();
    });
    watch(activeDynamicTab, () => {
      load();
      loadIncludes();
    });

    function handleMenuRefresh(event) {
      if (event.detail?.route === route.path) {
        load();
      }
    }

    function create() {
      editingItem.value = { includes: [] };
      loadIncludes();
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert('请选择一行');
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      const item = { ...row };
      if (meta.value.memberKey) {
        item.members = joinMembers(row[meta.value.memberKey]);
      }
      if (meta.value.includeKey) {
        item.includes = toArray(row[meta.value.includeKey]);
      }
      editingItem.value = item;
      loadIncludes();
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的组？')) return;
      const path = isDynamic.value ? dynamicBasePath.value : basePath.value;
      for (const id of selected.value) {
        await configStore.deleteConfig(`${path} ${id}`);
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      await load();
    }

    async function save() {
      const id = editingItem.value.name;
      if (!id) return alert('请输入名称');
      const path = isDynamic.value ? dynamicBasePath.value : basePath.value;
      const value = buildSaveValue(editingItem.value, meta.value);
      try {
        await configStore.setConfig(`${path} ${id}`, value);
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    const formSchema = computed(() => {
      const schema = [];
      schema.push({ key: 'name', title: '名称', type: 'text' });
      if (meta.value.hasDescription) {
        schema.push({ key: 'description', title: '描述', type: 'text' });
      }
      if (meta.value.memberKey) {
        schema.push({
          key: 'members',
          title: meta.value.memberTitle,
          type: 'textarea',
          placeholder: meta.value.memberPlaceholder || '每行一个值',
          multi: true,
          validate: meta.value.memberValidate,
          dynamic: meta.value.dynamicSuggestions,
        });
      }
      if (meta.value.includeKey) {
        const currentName = editingItem.value?.name || '';
        const selected = toArray(editingItem.value?.includes);
        const options = Array.from(new Set([
          ...availableIncludes.value.filter(n => n !== currentName),
          ...selected,
        ]));
        schema.push({
          key: 'includes',
          title: '包含组',
          type: 'dual-list',
          options,
          titleLeft: '可选组',
          titleRight: '已选组',
        });
      }
      return schema;
    });

    const dynamicFormSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text' },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    return {
      data: tableData,
      loading,
      columns,
      dynamicColumns,
      modalVisible,
      editingItem,
      selected,
      groupType,
      meta,
      isDynamic,
      activeDynamicTab,
      DYNAMIC_SUB_TYPES,
      writeDisabled,
      formSchema,
      dynamicFormSchema,
      load,
      create,
      edit,
      remove,
      save,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selected.length || selected.length > 1">{{ $t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selected.length">{{ $t('app.delete') }}</ToolbarButton>
        </div>
      </div>
      <template v-if="isDynamic">
        <TabGroup v-model="activeDynamicTab" :tabs="DYNAMIC_SUB_TYPES">
          <template v-for="tab in DYNAMIC_SUB_TYPES" :key="tab.key" #[tab.key]>
            <DataTable :columns="dynamicColumns" :data="data" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selected = $event" :selectable="true" :externalToolbar="true" />
          </template>
        </TabGroup>
      </template>
      <DataTable v-else :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? '编辑组' : '创建组'" width="600px" @confirm="save">
        <ConfigForm v-model="editingItem" :schema="isDynamic ? dynamicFormSchema : formSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
