# 删除确认弹窗开发规范

## 概述

所有页面的删除操作统一使用 `DraggableModal` 弹窗进行确认，禁止使用浏览器原生 `confirm()` 对话框。弹窗中需显示待删除项目的名称列表。

## 标准实现模式

### 1. 添加响应式变量

```javascript
const deleteModalVisible = ref(false);
const pendingDeleteNames = ref([]);
```

如果页面有多个不同的删除操作（如列表+规则），每个操作需要独立的变量对：

```javascript
const listDeleteModalVisible = ref(false);
const pendingDeleteListNames = ref([]);
const ruleDeleteModalVisible = ref(false);
const pendingDeleteRuleNumbers = ref([]);
```

### 2. 修改删除函数（只打开弹窗）

```javascript
async function remove() {
  if (!selectedNames.value.length) return showError({ message: '请选择一项' });
  pendingDeleteNames.value = [...selectedNames.value];
  deleteModalVisible.value = true;
}
```

### 3. 新增确认删除函数（执行实际删除）

```javascript
async function confirmRemove() {
  deleteModalVisible.value = false;
  for (const name of pendingDeleteNames.value) {
    await configStore.deleteConfig(`${path.value} name ${name}`);
    configStore.markPending();
  }
  await configStore.checkSessionChanged();
  selectedNames.value = [];
  pendingDeleteNames.value = [];
  await load();
}
```

### 4. 在 return 中导出

```javascript
return {
  // ... 其他变量
  deleteModalVisible, pendingDeleteNames, confirmRemove,
};
```

### 5. 在模板中添加 DraggableModal

```html
<DraggableModal v-model:visible="deleteModalVisible" title="确认删除" width="400px" @confirm="confirmRemove">
  <div>确认删除以下项目？</div>
  <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
    <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
  </div>
</DraggableModal>
```

## 导入要求

确保文件顶部已导入 DraggableModal：

```javascript
import DraggableModal from '/src/components/Modal/DraggableModal.js';
```

并在 components 中注册：

```javascript
components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
```

## 注意事项

1. **禁止使用 `confirm()`**：所有删除操作不得使用浏览器原生 `confirm()` 对话框
2. **保留非删除操作的 confirm()**：系统重启、关闭、重置、回滚等操作可保留 `confirm()`
3. **保持 markPending() 调用**：确认删除函数中必须保留 `configStore.markPending()` 调用
4. **保持 checkSessionChanged() 调用**：删除完成后调用 `configStore.checkSessionChanged()` 刷新操作图标状态
5. **多个删除操作独立变量**：同一页面有多个删除操作时，每个操作使用独立的变量对
6. **提示文字要具体**：弹窗中的提示文字应说明删除的是什么（如"确认删除以下网络命名空间？"）

## 完整示例（NetnsPage.js）

```javascript
import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
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
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const editingNetns = ref(null);
    const editingOriginalName = ref('');

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
    ];

    const schema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        const raw = res.data || {};
        netnsList.value = Object.entries(raw).map(([name, attrs]) => ({
          id: name, name, description: attrs.description || '',
        }));
      } catch (e) { showError(e); }
      finally { loading.value = false; }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    function create() { editingNetns.value = { name: '', description: '' }; editingOriginalName.value = ''; modalVisible.value = true; }
    function edit() {
      if (!selectedNames.value.length) return showError({ message: '请选择一个网络命名空间' });
      const row = netnsList.value.find(n => n.name === selectedNames.value[0]);
      editingNetns.value = { name: row.name, description: row.description };
      editingOriginalName.value = row.name;
      modalVisible.value = true;
    }

    async function remove() {
      if (!selectedNames.value.length) return showError({ message: '请选择一个网络命名空间' });
      pendingDeleteNames.value = [...selectedNames.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} name ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedNames.value = [];
      pendingDeleteNames.value = [];
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
          await configStore.deleteConfig(`${path.value} name ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} name ${editingNetns.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} name ${editingNetns.value.name}`, value);
          configStore.markPending();
        }
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) { showError(e); }
    }

    return {
      netnsList, loading, selectedNames,
      modalVisible, deleteModalVisible, editingNetns, editingOriginalName, pendingDeleteNames,
      columns, schema, path, writeDisabled,
      load, create, edit, remove, confirmRemove, save,
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
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalName ? '编辑' : '创建'" width="500px" @confirm="save">
        <ConfigForm v-model="editingNetns" :schema="schema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" title="确认删除" width="400px" @confirm="confirmRemove">
        <div>确认删除以下网络命名空间？</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
});
```

## 已修改文件清单（截至 2026-08-10）

以下文件已完成删除确认弹窗改造：

### 列表+规则类页面
- AccessListPage.js, AccessListv6Page.js
- AsPathListPage.js
- CommunityListPage.js
- ExtcommunityListPage.js
- LargeCommunityListPage.js
- PrefixListPage.js, PrefixList6Page.js
- RouteMapPage.js
- PolicyRoutePage.js

### 网络接口类页面
- BondingPage.js, BridgePage.js, EthernetPage.js
- GenevePage.js, InputPage.js, L2tpv3Page.js
- LoopbackPage.js, MacSecPage.js, PPPoEPage.js
- PseudoEthernetPage.js, VirtualEthernetPage.js
- VrfPage.js, VtiPage.js, VxlanPage.js
- WireGuardPage.js, NetnsPage.js

### 防火墙类页面
- FirewallGroupPage.js, FirewallIpv6Page.js

### NAT类页面
- CgnatPage.js, DestinationNatPage.js
- Nat64SourcePage.js, Nat66SourcePage.js
- StaticNatPage.js

### 路由协议类页面
- BabelPage.js, BfdPage.js, BgpPage.js
- IsisPage.js, MplsPage.js, NhrpPage.js
- OspfPage.js, OspfV3Page.js, PimPage.js
- Pim6Page.js, RipPage.js, RipNgPage.js
- SegmentRoutingPage.js, IgmpProxyPage.js
- FailoverPage.js, RpkiPage.js

### 其他配置页面
- ConfigManagementPage.js, ConfigManagementSettingsPage.js
- ConfigSyncPage.js, HaproxyPage.js
- HighAvailabilityPage.js, IpsecPage.js
- NtpPage.js, OpenVpnPage.js, PkiPage.js
- QosInterfacePage.js, QosTrafficMatchGroupPage.js
- SuricataPage.js, SyslogPage.js
- TaskSchedulerPage.js, UserPage.js
- WebProxyPage.js, GenericTablePage.js
- RuleTablePage.js, LocalRoutePage.js
