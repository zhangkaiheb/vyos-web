import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'DnsServerPage',
  components: { DataTable, DraggableModal },
  setup() {
    const { t } = useI18n();
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
      { key: 'address', title: t('dnsserver.columns.address'), width: 300 },
      { key: 'type', title: t('dnsserver.columns.type'), width: 120 },
    ];

    const isIPv4 = (addr) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(addr);
    const isIPv6 = (addr) => /^[0-9a-fA-F:]+$/.test(addr) && addr.includes(':');
    const isInterface = (addr) => /^[a-z]/.test(addr) && !isIPv4(addr) && !isIPv6(addr);

    const getType = (addr) => {
      if (isIPv4(addr)) return 'IPv4';
      if (isIPv6(addr)) return 'IPv6';
      if (isInterface(addr)) return t('dnsserver.type.dhcpInterface');
      return t('dnsserver.type.unknown');
    };

    const loadInterfaces = async () => {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (err) {
        console.error('Failed to load interfaces:', err);
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
        console.error('Failed to load DNS servers:', err);
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
          await config.deleteConfig(`system name-server ${addr}`);
        }
        config.markPending();
        await config.checkSessionChanged();
        showDeleteModal.value = false;
        deleteTargetKeys.value = [];
        await loadData();
      } catch (err) {
        console.error('Failed to delete DNS server:', err);
        showError({ message: t('dnsserver.messages.deleteFailed') + ': ' + (err.message || t('dnsserver.type.unknown')) });
      } finally {
        loading.value = false;
      }
    };

    const handleSave = async () => {
      const value = inputMode.value === 'address'
        ? editingServer.value.address.trim()
        : editingServer.value.interface;

      if (!value) {
        showError({ message: inputMode.value === 'address' ? t('dnsserver.messages.enterAddress') : t('dnsserver.messages.selectInterface') });
        return;
      }

      loading.value = true;
      try {
        await config.setConfig('system name-server', value);
        config.markPending();
        await config.checkSessionChanged();
        showEditModal.value = false;
        await loadData();
      } catch (err) {
        console.error('Failed to save DNS server:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadData();
      loadInterfaces();
      window.addEventListener('config-committed', loadData);
      onMenuRefresh(loadData);
    });

    return {t,
      
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

      <!-- Delete confirmation dialog -->
      <DraggableModal v-model:visible="showDeleteModal" :title="t('dnsserver.modals.confirmDelete')" header-icon="delete" @confirm="confirmDelete" @close="showDeleteModal = false" width="400px">
        <div style="padding: 20px 0;">
          {{ t('dnsserver.modals.deleteConfirm', { count: deleteTargetKeys.length }) }}
        </div>
      </DraggableModal>

      <!-- Edit dialog -->
      <DraggableModal v-model:visible="showEditModal" :title="editingServer && editingServer.address ? t('dnsserver.modals.edit') : t('dnsserver.modals.add')" @confirm="handleSave" @close="showEditModal = false" width="500px">
        <div class="form-row">
          <label class="form-label">{{ t('dnsserver.form.type') }}</label>
          <div style="flex:1; display:flex; gap:12px; padding-top:4px;">
            <label style="cursor:pointer;"><input type="radio" value="address" v-model="inputMode" /> {{ t('dnsserver.form.addressLabel') }}</label>
            <label style="cursor:pointer;"><input type="radio" value="interface" v-model="inputMode" /> {{ t('dnsserver.form.dhcpInterface') }}</label>
          </div>
        </div>
        <div v-if="inputMode === 'address'" class="form-row">
          <label class="form-label">{{ t('dnsserver.form.serverAddress') }}</label>
          <input class="form-control" v-model="editingServer.address" :placeholder="t('dnsserver.form.addressPlaceholder')" />
        </div>
        <div v-if="inputMode === 'interface'" class="form-row">
          <label class="form-label">{{ t('dnsserver.form.interface') }}</label>
          <select class="form-control" v-model="editingServer.interface">
            <option value="">{{ t('dnsserver.form.selectInterface') }}</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
      </DraggableModal>

    </div>
  `,
});
