import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export default defineComponent({
  name: 'DnsServerPage',
  components: { DataTable, DraggableModal },
  setup() {
    const auth = useAuthStore();
    const config = useConfigStore();
    const loading = ref(false);
    const dnsServers = ref([]);
    const editingServer = ref(null);
    const showEditModal = ref(false);
    const showDeleteModal = ref(false);
    const deleteTargetKeys = ref([]);
    const interfaces = ref([]);
    const inputMode = ref('address'); // 'address' or 'interface'

    const columns = [
      { key: 'address', title: 'DNS 服务器地址/接口', width: 300 },
      { key: 'type', title: '类型', width: 120 },
    ];

    const isIPv4 = (addr) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr);
    const isIPv6 = (addr) => /^[0-9a-fA-F:]+$/.test(addr) && addr.includes(':');
    const isInterface = (addr) => /^[a-z]/.test(addr) && !isIPv4(addr) && !isIPv6(addr);

    const getType = (addr) => {
      if (isIPv4(addr)) return 'IPv4';
      if (isIPv6(addr)) return 'IPv6';
      if (isInterface(addr)) return 'DHCP 接口';
      return '未知';
    };

    const loadInterfaces = async () => {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (err) {
        console.error('加载接口列表失败:', err);
      }
    };

    const loadData = async () => {
      loading.value = true;
      try {
        const res = await configApi.get('system', true);
        const systemCfg = res.data || {};
        const nameServerCfg = systemCfg['name-server'];
        const servers = [];

        if (nameServerCfg !== undefined) {
          // name-server is a multi-node leaf, could be string, array, or object
          const addresses = [];
          if (Array.isArray(nameServerCfg)) {
            addresses.push(...nameServerCfg);
          } else if (typeof nameServerCfg === 'object' && nameServerCfg !== null) {
            addresses.push(...Object.keys(nameServerCfg));
          } else if (typeof nameServerCfg === 'string') {
            addresses.push(nameServerCfg);
          }
          for (const addr of addresses) {
            servers.push({
              id: String(addr),
              address: String(addr),
              type: getType(String(addr)),
            });
          }
        }

        dnsServers.value = servers;
      } catch (err) {
        console.error('加载 DNS 服务器失败:', err);
      } finally {
        loading.value = false;
      }
    };

    const handleCreate = () => {
      editingServer.value = { address: '', interface: '', type: 'IPv4' };
      inputMode.value = 'address';
      showEditModal.value = true;
    };

    const handleEdit = (row) => {
      editingServer.value = { ...row };
      inputMode.value = isInterface(row.address) ? 'interface' : 'address';
      showEditModal.value = true;
    };

    const handleDelete = async (selectedKeys) => {
      if (!selectedKeys || !selectedKeys.length) return;
      deleteTargetKeys.value = selectedKeys;
      showDeleteModal.value = true;
    };

    const confirmDelete = async () => {
      loading.value = true;
      try {
        for (const addr of deleteTargetKeys.value) {
          await configApi.delete(`system name-server ${addr}`);
        }
        config.markPending();
        showDeleteModal.value = false;
        deleteTargetKeys.value = [];
        await loadData();
      } catch (err) {
        console.error('删除 DNS 服务器失败:', err);
        alert('删除失败: ' + (err.message || '未知错误'));
      } finally {
        loading.value = false;
      }
    };

    const handleSave = async () => {
      const value = inputMode.value === 'address' 
        ? editingServer.value.address.trim() 
        : editingServer.value.interface;
      
      if (!value) {
        alert(inputMode.value === 'address' ? '请输入 DNS 服务器地址' : '请选择接口');
        return;
      }

      loading.value = true;
      try {
        await configApi.set('system name-server', value);
        config.markPending();
        showEditModal.value = false;
        await loadData();
      } catch (err) {
        console.error('保存 DNS 服务器失败:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadData();
      loadInterfaces();
      onMenuRefresh(loadData);
    });

    return {
      loading,
      dnsServers,
      columns,
      editingServer,
      showEditModal,
      showDeleteModal,
      deleteTargetKeys,
      interfaces,
      inputMode,
      handleCreate,
      handleEdit,
      handleDelete,
      confirmDelete,
      handleSave,
      loadData,
    };
  },
  template: `
    <div>
      <DataTable
        :columns="columns"
        :data="dnsServers"
        :loading="loading"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="handleCreate"
        @edit="handleEdit"
        @delete="handleDelete"
        @refresh="loadData"
      />

      <!-- 删除确认对话框 -->
      <DraggableModal v-model:visible="showDeleteModal" title="确认删除" @confirm="confirmDelete" @close="showDeleteModal = false" width="400px">
        <div style="padding: 20px 0;">
          确定要删除选中的 {{ deleteTargetKeys.length }} 个 DNS 服务器吗？
        </div>
      </DraggableModal>

      <!-- 编辑对话框 -->
      <DraggableModal v-model:visible="showEditModal" :title="editingServer && editingServer.address ? '编辑 DNS 服务器' : '添加 DNS 服务器'" @confirm="handleSave" @close="showEditModal = false" width="500px">
        <div class="form-row">
          <label class="form-label">类型</label>
          <div style="flex:1; display:flex; gap:12px; padding-top:4px;">
            <label style="cursor:pointer;"><input type="radio" value="address" v-model="inputMode" /> DNS 服务器地址</label>
            <label style="cursor:pointer;"><input type="radio" value="interface" v-model="inputMode" /> DHCP 接口</label>
          </div>
        </div>
        <div v-if="inputMode === 'address'" class="form-row">
          <label class="form-label">服务器地址 *</label>
          <input class="form-control" v-model="editingServer.address" placeholder="例如: 8.8.8.8, 2001:4860:4860::8888" />
        </div>
        <div v-if="inputMode === 'interface'" class="form-row">
          <label class="form-label">接口 *</label>
          <select class="form-control" v-model="editingServer.interface">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </DraggableModal>

    </div>
  `,
});
