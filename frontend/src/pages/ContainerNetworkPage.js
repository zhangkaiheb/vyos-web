import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'ContainerNetworkPage',
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);

    const networkList = ref([]);
    const showEditModal = ref(false);
    const editingNetwork = ref(null);

    const columns = computed(() => [
      { key: 'name', title: t('containerNetwork.name'), dataIndex: 'name', width: 150 },
      { key: 'description', title: t('containerNetwork.description'), dataIndex: 'description', width: 200 },
      { key: 'type', title: t('containerNetwork.type'), dataIndex: 'type', width: 100 },
      { key: 'gateway', title: t('containerNetwork.gateway'), dataIndex: 'gateway', width: 180 },
      { key: 'prefix', title: t('containerNetwork.prefix'), dataIndex: 'prefix', width: 180 },
      { key: 'mtu', title: 'MTU', dataIndex: 'mtu', width: 80 },
      { key: 'vrf', title: 'VRF', dataIndex: 'vrf', width: 100 },
      { key: 'actions', title: t('containerNetwork.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const commandPath = computed(() => 'container network');

    function networkToForm(name, data = {}) {
      return {
        _name: name,
        name: name,
        description: data.description || '',
        gateway: joinLines(data.gateway),
        mtu: data.mtu || '',
        no_name_server: data['no-name-server'] !== undefined,
        prefix: joinLines(data.prefix),
        type: data.type || 'bridge',
        macvlan: {
          mode: data.macvlan?.mode || '',
          parent: data.macvlan?.parent || '',
        },
        vrf: data.vrf || '',
      };
    }

    function formToNetwork(form) {
      const result = {};
      if (isPresent(form.description)) result.description = String(form.description);
      const gateways = splitLines(form.gateway);
      if (gateways.length) result.gateway = gateways;
      if (isPresent(form.mtu)) result.mtu = String(form.mtu);
      if (form.no_name_server) result['no-name-server'] = '';
      const prefixes = splitLines(form.prefix);
      if (prefixes.length) result.prefix = prefixes;
      if (form.type && form.type !== 'bridge') result.type = String(form.type);
      if (form.type === 'macvlan') {
        const macvlan = {};
        if (isPresent(form.macvlan?.mode)) macvlan.mode = String(form.macvlan.mode);
        if (isPresent(form.macvlan?.parent)) macvlan.parent = String(form.macvlan.parent);
        if (Object.keys(macvlan).length) result.macvlan = macvlan;
      }
      if (isPresent(form.vrf)) result.vrf = String(form.vrf);
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('container network', true);
        const data = res.data || {};
        networkList.value = Object.entries(data).map(([name, cfg]) => networkToForm(name, cfg));
      } catch (e) {
        showError(e.message || t('containerNetwork.load_failed'));
      } finally {
        loading.value = false;
      }
    }

    async function saveConfig() {
      saving.value = true;
      try {
        await configApi.delete('container network');
        const payload = {};
        for (const n of networkList.value) {
          if (!n.name) continue;
          payload[n.name] = formToNetwork(n);
        }
        if (Object.keys(payload).length) {
          await configApi.set('container network', payload);
        }
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('containerNetwork.save_failed'));
      } finally {
        saving.value = false;
      }
    }

    function createNetwork() {
      editingNetwork.value = {
        _name: '', name: '', description: '', gateway: '', mtu: '',
        no_name_server: false, prefix: '', type: 'bridge',
        macvlan: { mode: '', parent: '' }, vrf: '',
      };
      showEditModal.value = true;
    }

    function editNetwork() {
      if (!selectedNetworks.value.length) return showError({ message: t('containerNetwork.select_to_edit') });
      const row = networkList.value.find(n => n.name === selectedNetworks.value[0]);
      if (!row) return showError({ message: t('containerNetwork.not_found') });
      editingNetwork.value = JSON.parse(JSON.stringify(row));
      showEditModal.value = true;
    }

    function removeNetwork() {
      if (!selectedNetworks.value.length) return showError({ message: t('containerNetwork.select_to_delete') });
      networkList.value = networkList.value.filter(n => n.name !== selectedNetworks.value[0]);
      selectedNetworks.value = [];
    }

    function saveNetwork() {
      if (!editingNetwork.value.name) return showError({ message: t('containerNetwork.enter_name') });
      const list = networkList.value;
      const idx = list.findIndex(n => n._name === editingNetwork.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingNetwork.value });
      else list.push({ ...editingNetwork.value });
      networkList.value = list;
      showEditModal.value = false;
    }

    function editNetworkByRecord(record) {
      editingNetwork.value = JSON.parse(JSON.stringify(record));
      showEditModal.value = true;
    }

    function removeNetworkByRecord(record) {
      networkList.value = networkList.value.filter(n => n.name !== record.name);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    const modalTitle = computed(() => {
      if (!editingNetwork.value) return '';
      return editingNetwork.value._name
        ? t('containerNetwork.edit_network') + ': ' + editingNetwork.value._name
        : t('containerNetwork.new_network');
    });

    return {
      t,
      loading, saving, networkList, columns, commandPath, modalTitle,
      selectedNetworks, showEditModal, editingNetwork,
      load, saveConfig,
      createNetwork, editNetwork, removeNetwork, saveNetwork,
      editNetworkByRecord, removeNetworkByRecord,
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createNetwork">{{ t('containerNetwork.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editNetwork" :disabled="!selectedNetworks.length || selectedNetworks.length > 1">{{ t('containerNetwork.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeNetwork" :disabled="!selectedNetworks.length">{{ t('containerNetwork.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="columns" :data="networkList" rowKey="name" :externalToolbar="true" @selection-change="selectedNetworks = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'gateway'">
            <span>{{ (record.gateway || '').replace(/\\n/g, ', ') }}</span>
          </template>
          <template v-if="column.key === 'prefix'">
            <span>{{ (record.prefix || '').replace(/\\n/g, ', ') }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editNetworkByRecord(record)" style="margin-right:8px">{{ t('containerNetwork.edit') }}</a>
            <a @click="removeNetworkByRecord(record)" style="color:#ff4d4f">{{ t('containerNetwork.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <!-- Edit Modal -->
      <DraggableModal v-model:visible="showEditModal" :title="modalTitle" @confirm="saveNetwork" @close="showEditModal = false" width="700px">
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.name') }}</label><input class="form-control" v-model="editingNetwork.name" :disabled="editingNetwork._name" :title="t('containerNetwork.name_title')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.description') }}</label><input class="form-control" v-model="editingNetwork.description" :title="t('containerNetwork.description_title')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.type') }}</label>
          <select class="form-control" v-model="editingNetwork.type" :title="t('containerNetwork.type_title')">
            <option value="bridge">{{ t('containerNetwork.bridge_default') }}</option>
            <option value="macvlan">MACVLAN</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">MTU</label><input class="form-control" type="number" min="68" max="16000" v-model="editingNetwork.mtu" :title="t('containerNetwork.mtu_title')" /></div>
        <div class="form-row"><label class="form-label">VRF</label><input class="form-control" v-model="editingNetwork.vrf" :title="t('containerNetwork.vrf_title')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.disable_dns') }}</label><input type="checkbox" v-model="editingNetwork.no_name_server" :title="t('containerNetwork.disable_dns_title')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.gateway_address') }}</label><textarea class="form-control" v-model="editingNetwork.gateway" rows="3" :placeholder="t('containerNetwork.gateway_placeholder')" :title="t('containerNetwork.gateway_title')" /></div>
        <div class="form-row"><label class="form-label">{{ t('containerNetwork.prefix') }}</label><textarea class="form-control" v-model="editingNetwork.prefix" rows="3" :placeholder="t('containerNetwork.prefix_placeholder')" :title="t('containerNetwork.prefix_title')" /></div>

        <div v-if="editingNetwork.type === 'macvlan'">
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('containerNetwork.macvlan_settings') }}</div>
          <div class="form-row"><label class="form-label">{{ t('containerNetwork.mode') }}</label>
            <select class="form-control" v-model="editingNetwork.macvlan.mode" :title="t('containerNetwork.mode_title')">
              <option value="bridge">Bridge</option>
              <option value="private">Private</option>
              <option value="vepa">VEPA</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('containerNetwork.parent_interface') }}</label><input class="form-control" v-model="editingNetwork.macvlan.parent" :title="t('containerNetwork.parent_interface_title')" /></div>
        </div>
      </DraggableModal>
    </div>
  `,
});
