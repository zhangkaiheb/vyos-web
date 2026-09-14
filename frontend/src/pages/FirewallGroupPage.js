import { defineComponent, ref, computed, watch, onMounted, onUnmounted, inject } from '/src/utils/vue-import.js';
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
  { key: 'address-group', titleKey: 'firewall.group.ipv4DynamicAddressGroup', memberTitleKey: 'firewall.group.addressGroup' },
  { key: 'ipv6-address-group', titleKey: 'firewall.group.ipv6DynamicAddressGroup', memberTitleKey: 'firewall.group.addressGroup' },
];

const GROUP_META = {
  'address-group': {
    titleKey: 'firewall.group.addressGroup',
    memberKey: 'address',
    memberTitleKey: 'firewall.group.address',
    memberValidate: 'ip-segment',
    memberPlaceholderKey: 'firewall.group.ipv4AddressPlaceholder',
    includeKey: 'include',
    hasDescription: true,
  },
  'domain-group': {
    titleKey: 'firewall.group.domainGroup',
    memberKey: 'address',
    memberTitleKey: 'firewall.group.domain',
    memberPlaceholderKey: 'firewall.group.domainPlaceholder',
    includeKey: null,
    hasDescription: true,
  },
  'interface-group': {
    titleKey: 'firewall.group.interfaceGroup',
    memberKey: 'interface',
    memberTitleKey: 'firewall.group.interface',
    memberPlaceholderKey: 'firewall.group.interfacePlaceholder',
    dynamicSuggestions: true,
    includeKey: 'include',
    hasDescription: true,
  },
  'ipv6-address-group': {
    titleKey: 'firewall.group.ipv6AddressGroup',
    memberKey: 'address',
    memberTitleKey: 'firewall.group.address',
    memberValidate: 'ipv6',
    memberPlaceholderKey: 'firewall.group.ipv6AddressPlaceholder',
    includeKey: 'include',
    hasDescription: true,
  },
  'ipv6-network-group': {
    titleKey: 'firewall.group.ipv6NetworkGroup',
    memberKey: 'network',
    memberTitleKey: 'firewall.group.network',
    memberValidate: 'ipv6-prefix',
    memberPlaceholderKey: 'firewall.group.ipv6NetworkPlaceholder',
    includeKey: 'include',
    hasDescription: true,
  },
  'mac-group': {
    titleKey: 'firewall.group.macGroup',
    memberKey: 'mac-address',
    memberTitleKey: 'firewall.group.macAddress',
    memberValidate: 'mac',
    memberPlaceholderKey: 'firewall.group.macPlaceholder',
    includeKey: null,
    hasDescription: true,
  },
  'network-group': {
    titleKey: 'firewall.group.networkGroup',
    memberKey: 'network',
    memberTitleKey: 'firewall.group.network',
    memberValidate: 'ipv4-prefix',
    memberPlaceholderKey: 'firewall.group.ipv4NetworkPlaceholder',
    includeKey: 'include',
    hasDescription: true,
  },
  'port-group': {
    titleKey: 'firewall.group.portGroup',
    memberKey: 'port',
    memberTitleKey: 'firewall.group.port',
    memberValidate: 'port',
    memberPlaceholderKey: 'firewall.group.portPlaceholder',
    includeKey: 'include',
    hasDescription: true,
  },
  'dynamic-group': {
    titleKey: 'firewall.group.dynamicGroup',
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
    const { t } = inject('i18n');
    const data = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
    const activeDynamicTab = ref(DYNAMIC_SUB_TYPES[0].key);
    const availableIncludes = ref([]);
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

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

    const resolvedDynamicSubTypes = computed(() =>
      DYNAMIC_SUB_TYPES.map(dt => ({ ...dt, title: t(dt.titleKey), memberTitle: t(dt.memberTitleKey) }))
    );

    const resolvedMeta = computed(() => {
      const m = meta.value;
      return {
        ...m,
        title: m.titleKey ? t(m.titleKey) : '',
        memberTitle: m.memberTitleKey ? t(m.memberTitleKey) : '',
        memberPlaceholder: m.memberPlaceholderKey ? t(m.memberPlaceholderKey) : '',
      };
    });

    const columns = computed(() => {
      const cols = [{ key: 'name', title: t('rule.name') }];
      if (resolvedMeta.value.hasDescription) cols.push({ key: 'description', title: t('rule.description') });
      if (resolvedMeta.value.memberKey) cols.push({ key: 'members', title: resolvedMeta.value.memberTitle });
      if (resolvedMeta.value.includeKey) cols.push({ key: 'includes', title: t('firewall.group.includeGroup') });
      return cols;
    });

    const dynamicColumns = computed(() => [
      { key: 'name', title: t('rule.name') },
      { key: 'description', title: t('rule.description') },
    ]);

    const tableData = computed(() => {
      return data.value.map(item => {
        const row = { ...item };
        if (resolvedMeta.value.memberKey) {
          row.members = toArray(item[resolvedMeta.value.memberKey]).join(', ');
        }
        if (resolvedMeta.value.includeKey) {
          row.includes = toArray(item[resolvedMeta.value.includeKey]).join(', ');
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
      if (!resolvedMeta.value.includeKey) {
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
      window.addEventListener('config-committed', load);
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
      if (!selected.value.length) return showError({ message: t('firewall.selectRow') });
      const row = data.value.find(r => r.id === selected.value[0]) || {};
      const item = { ...row };
      if (resolvedMeta.value.memberKey) {
        item.members = joinMembers(row[resolvedMeta.value.memberKey]);
      }
      if (resolvedMeta.value.includeKey) {
        item.includes = toArray(row[resolvedMeta.value.includeKey]);
      }
      editingItem.value = item;
      loadIncludes();
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return showError({ message: t('firewall.selectRow') });
      pendingDeleteNames.value = selected.value.map(id => {
        const row = data.value.find(r => r.id === id);
        return row ? (row.name || row.id) : id;
      });
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      const path = isDynamic.value ? dynamicBasePath.value : basePath.value;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selected.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function save() {
      const id = editingItem.value.name;
      if (!id) return showError({ message: t('firewall.enterName') });
      const path = isDynamic.value ? dynamicBasePath.value : basePath.value;
      const value = buildSaveValue(editingItem.value, resolvedMeta.value);
      try {
        await configStore.setConfig(`${path} ${id}`, value);
        configStore.markPending();
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    const formSchema = computed(() => {
      const schema = [];
      schema.push({ key: 'name', title: t('rule.name'), type: 'text' });
      if (resolvedMeta.value.hasDescription) {
        schema.push({ key: 'description', title: t('rule.description'), type: 'text' });
      }
      if (resolvedMeta.value.memberKey) {
        schema.push({
          key: 'members',
          title: resolvedMeta.value.memberTitle,
          type: 'textarea',
          placeholder: resolvedMeta.value.memberPlaceholder || t('firewall.group.onePerLine'),
          multi: true,
          validate: resolvedMeta.value.memberValidate,
          dynamic: resolvedMeta.value.dynamicSuggestions,
        });
      }
      if (resolvedMeta.value.includeKey) {
        const currentName = editingItem.value?.name || '';
        const sel = toArray(editingItem.value?.includes);
        const options = Array.from(new Set([
          ...availableIncludes.value.filter(n => n !== currentName),
          ...sel,
        ]));
        schema.push({
          key: 'includes',
          title: t('firewall.group.includeGroup'),
          type: 'dual-list',
          options,
          titleLeft: t('firewall.group.availableGroups'),
          titleRight: t('firewall.group.selectedGroups'),
        });
      }
      return schema;
    });

    const dynamicFormSchema = computed(() => [
      { key: 'name', title: t('rule.name'), type: 'text' },
      { key: 'description', title: t('rule.description'), type: 'text' },
    ]);

    const modalTitle = computed(() =>
      editingItem.value?.id ? t('firewall.group.editGroup') : t('firewall.group.createGroup')
    );

    return {t,
      
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
      resolvedDynamicSubTypes,
      writeDisabled,
      formSchema,
      dynamicFormSchema,
      deleteModalVisible,
      pendingDeleteNames,
      modalTitle,
      load,
      create,
      edit,
      remove,
      confirmRemove,
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
        <TabGroup v-model="activeDynamicTab" :tabs="resolvedDynamicSubTypes">
          <template v-for="tab in resolvedDynamicSubTypes" :key="tab.key" #[tab.key]>
            <DataTable :columns="dynamicColumns" :data="data" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selected = $event" :selectable="true" :externalToolbar="true" />
          </template>
        </TabGroup>
      </template>
      <DataTable v-else :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" :externalToolbar="true" />
      <DraggableModal v-model:visible="modalVisible" :title="modalTitle" width="820px" @confirm="save">
        <ConfigForm v-model="editingItem" :schema="isDynamic ? dynamicFormSchema : formSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="$t('firewall.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ $t('firewall.confirmDeleteGroup') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
