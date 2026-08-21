import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
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
  name: 'VppInterfacesPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('bonding');

    const config = ref({
      bonding: [],
      bridge: [],
      gre: [],
      ipip: [],
      loopback: [],
      vxlan: [],
      xconnect: [],
    });

    const bondingColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'mode', title: t('vppInterfaces.mode'), dataIndex: 'mode', width: 120 },
      { key: 'hash_policy', title: t('vppInterfaces.hash_policy'), dataIndex: 'hash_policy', width: 120 },
      { key: 'member_interfaces', title: t('vppInterfaces.member_interfaces'), dataIndex: 'member_interfaces', width: 200 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const bridgeColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'member_interfaces', title: t('vppInterfaces.member_interfaces'), dataIndex: 'member_interfaces', width: 300 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const greColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'mode', title: t('vppInterfaces.mode'), dataIndex: 'mode', width: 120 },
      { key: 'remote', title: t('vppInterfaces.remote'), dataIndex: 'remote', width: 150 },
      { key: 'source_address', title: t('vppInterfaces.source_address'), dataIndex: 'source_address', width: 150 },
      { key: 'tunnel_type', title: t('vppInterfaces.tunnel_type'), dataIndex: 'tunnel_type', width: 120 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const ipipColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'remote', title: t('vppInterfaces.remote'), dataIndex: 'remote', width: 150 },
      { key: 'source_address', title: t('vppInterfaces.source_address'), dataIndex: 'source_address', width: 150 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const loopbackColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 300 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const vxlanColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'remote', title: t('vppInterfaces.remote'), dataIndex: 'remote', width: 150 },
      { key: 'source_address', title: t('vppInterfaces.source_address'), dataIndex: 'source_address', width: 150 },
      { key: 'vni', title: t('vppInterfaces.vni'), dataIndex: 'vni', width: 100 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const xconnectColumns = computed(() => [
      { key: 'name', title: t('vppInterfaces.name'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('vppInterfaces.description'), dataIndex: 'description', width: 200 },
      { key: 'member_interfaces', title: t('vppInterfaces.member_interfaces'), dataIndex: 'member_interfaces', width: 300 },
      { key: 'actions', title: t('vppInterfaces.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const selectedItems = ref([]);
    const showModal = ref(false);
    const editingItem = ref(null);

    const commandPath = computed(() => {
      return `vpp interfaces ${activeTab.value}`;
    });

    function interfacesToForm(data = {}) {
      return {
        bonding: Object.entries(data.bonding || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          mode: item.mode || '802.3ad',
          hash_policy: item['hash-policy'] || 'layer2',
          kernel_interface: item['kernel-interface'] || '',
          mac: item.mac || '',
          member_interfaces: item['member-interface'] ? Object.keys(item['member-interface']).join('\n') : '',
        })),
        bridge: Object.entries(data.bridge || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          member_interfaces: item.member ? Object.entries(item.member).map(([iface, attrs]) => ({
            interface: iface,
            bvi: attrs.bvi !== undefined,
          })) : [],
        })),
        gre: Object.entries(data.gre || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          mode: item.mode || 'point-to-point',
          remote: item.remote || '',
          source_address: item['source-address'] || '',
          tunnel_type: item['tunnel-type'] || 'l3',
          kernel_interface: item['kernel-interface'] || '',
        })),
        ipip: Object.entries(data.ipip || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          remote: item.remote || '',
          source_address: item['source-address'] || '',
          kernel_interface: item['kernel-interface'] || '',
        })),
        loopback: Object.entries(data.loopback || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          kernel_interface: item['kernel-interface'] || '',
        })),
        vxlan: Object.entries(data.vxlan || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          remote: item.remote || '',
          source_address: item['source-address'] || '',
          vni: item.vni || '',
          kernel_interface: item['kernel-interface'] || '',
        })),
        xconnect: Object.entries(data.xconnect || {}).map(([name, item]) => ({
          _name: name,
          name,
          description: item.description || '',
          member_interfaces: item['member-interface'] ? Object.keys(item['member-interface']).join('\n') : '',
        })),
      };
    }

    function formToInterfaces(form) {
      const result = {};

      const bonding = {};
      for (const item of form.bonding || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (item.mode && item.mode !== '802.3ad') obj.mode = String(item.mode);
        if (item.hash_policy && item.hash_policy !== 'layer2') obj['hash-policy'] = String(item.hash_policy);
        if (isPresent(item.kernel_interface)) obj['kernel-interface'] = String(item.kernel_interface);
        if (isPresent(item.mac)) obj.mac = String(item.mac);
        const members = splitLines(item.member_interfaces);
        if (members.length) {
          obj['member-interface'] = {};
          for (const m of members) obj['member-interface'][m] = {};
        }
        bonding[item.name] = obj;
      }
      if (Object.keys(bonding).length) result.bonding = bonding;

      const bridge = {};
      for (const item of form.bridge || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (item.member_interfaces && item.member_interfaces.length) {
          obj.member = {};
          for (const m of item.member_interfaces) {
            obj.member[m.interface] = m.bvi ? { bvi: '' } : {};
          }
        }
        bridge[item.name] = obj;
      }
      if (Object.keys(bridge).length) result.bridge = bridge;

      const gre = {};
      for (const item of form.gre || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (item.mode && item.mode !== 'point-to-point') obj.mode = String(item.mode);
        if (isPresent(item.remote)) obj.remote = String(item.remote);
        if (isPresent(item.source_address)) obj['source-address'] = String(item.source_address);
        if (item.tunnel_type && item.tunnel_type !== 'l3') obj['tunnel-type'] = String(item.tunnel_type);
        if (isPresent(item.kernel_interface)) obj['kernel-interface'] = String(item.kernel_interface);
        gre[item.name] = obj;
      }
      if (Object.keys(gre).length) result.gre = gre;

      const ipip = {};
      for (const item of form.ipip || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (isPresent(item.remote)) obj.remote = String(item.remote);
        if (isPresent(item.source_address)) obj['source-address'] = String(item.source_address);
        if (isPresent(item.kernel_interface)) obj['kernel-interface'] = String(item.kernel_interface);
        ipip[item.name] = obj;
      }
      if (Object.keys(ipip).length) result.ipip = ipip;

      const loopback = {};
      for (const item of form.loopback || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (isPresent(item.kernel_interface)) obj['kernel-interface'] = String(item.kernel_interface);
        loopback[item.name] = obj;
      }
      if (Object.keys(loopback).length) result.loopback = loopback;

      const vxlan = {};
      for (const item of form.vxlan || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        if (isPresent(item.remote)) obj.remote = String(item.remote);
        if (isPresent(item.source_address)) obj['source-address'] = String(item.source_address);
        if (isPresent(item.vni)) obj.vni = String(item.vni);
        if (isPresent(item.kernel_interface)) obj['kernel-interface'] = String(item.kernel_interface);
        vxlan[item.name] = obj;
      }
      if (Object.keys(vxlan).length) result.vxlan = vxlan;

      const xconnect = {};
      for (const item of form.xconnect || []) {
        if (!item.name) continue;
        const obj = {};
        if (isPresent(item.description)) obj.description = String(item.description);
        const members = splitLines(item.member_interfaces);
        if (members.length) {
          obj['member-interface'] = {};
          for (const m of members) obj['member-interface'][m] = {};
        }
        xconnect[item.name] = obj;
      }
      if (Object.keys(xconnect).length) result.xconnect = xconnect;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpp interfaces', true);
        config.value = interfacesToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('vppInterfaces.load_failed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('vpp interfaces');
        const payload = formToInterfaces(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('vpp interfaces', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('vppInterfaces.save_failed'));
      } finally {
        saving.value = false;
      }
    }

    function createItem() {
      const type = activeTab.value;
      const defaults = {
        bonding: { name: '', description: '', mode: '802.3ad', hash_policy: 'layer2', kernel_interface: '', mac: '', member_interfaces: '' },
        bridge: { name: '', description: '', member_interfaces: [] },
        gre: { name: '', description: '', mode: 'point-to-point', remote: '', source_address: '', tunnel_type: 'l3', kernel_interface: '' },
        ipip: { name: '', description: '', remote: '', source_address: '', kernel_interface: '' },
        loopback: { name: '', description: '', kernel_interface: '' },
        vxlan: { name: '', description: '', remote: '', source_address: '', vni: '', kernel_interface: '' },
        xconnect: { name: '', description: '', member_interfaces: '' },
      };
      editingItem.value = defaults[type] || {};
      showModal.value = true;
    }

    function editItem() {
      if (!selectedItems.value.length) return showError({ message: t('vppInterfaces.select_to_edit') });
      const type = activeTab.value;
      const row = config.value[type].find(i => i.name === selectedItems.value[0]);
      if (!row) return showError({ message: t('vppInterfaces.item_not_found') });
      editingItem.value = JSON.parse(JSON.stringify(row));
      showModal.value = true;
    }

    function removeItem() {
      if (!selectedItems.value.length) return showError({ message: t('vppInterfaces.select_to_delete') });
      const type = activeTab.value;
      config.value[type] = config.value[type].filter(i => i.name !== selectedItems.value[0]);
      selectedItems.value = [];
    }

    function saveItem() {
      if (!editingItem.value.name) return showError({ message: t('vppInterfaces.enter_name') });
      const type = activeTab.value;
      const list = config.value[type];
      const idx = list.findIndex(i => i._name === editingItem.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingItem.value });
      else list.push({ ...editingItem.value });
      config.value[type] = list;
      showModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, config, activeTab, commandPath,
      bondingColumns, bridgeColumns, greColumns, ipipColumns, loopbackColumns, vxlanColumns, xconnectColumns,
      selectedItems, showModal, editingItem,
      load, save, createItem, editItem, removeItem, saveItem,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'bonding', title: t('vppInterfaces.tab_bonding') },
        { key: 'bridge', title: t('vppInterfaces.tab_bridge') },
        { key: 'gre', title: t('vppInterfaces.tab_gre') },
        { key: 'ipip', title: t('vppInterfaces.tab_ipip') },
        { key: 'loopback', title: t('vppInterfaces.tab_loopback') },
        { key: 'vxlan', title: t('vppInterfaces.tab_vxlan') },
        { key: 'xconnect', title: t('vppInterfaces.tab_xconnect') }
      ]">

      <template #bonding>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="bondingColumns" :data="config.bonding" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #bridge>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="bridgeColumns" :data="config.bridge" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #gre>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="greColumns" :data="config.gre" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #ipip>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="ipipColumns" :data="config.ipip" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #loopback>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="loopbackColumns" :data="config.loopback" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #vxlan>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="vxlanColumns" :data="config.vxlan" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>

      <template #xconnect>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createItem">{{ t('vppInterfaces.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editItem" :disabled="!selectedItems.length || selectedItems.length > 1">{{ t('vppInterfaces.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeItem" :disabled="!selectedItems.length">{{ t('vppInterfaces.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="xconnectColumns" :data="config.xconnect" rowKey="name" :externalToolbar="true" @selection-change="selectedItems = $event" :selectable="true" />
      </template>
      </TabGroup>

      <DraggableModal v-model:visible="showModal" :title="editingItem && editingItem._name ? t('vppInterfaces.edit') : t('vppInterfaces.create_new')" @confirm="saveItem" @close="showModal = false" width="700px">
        <div v-if="activeTab === 'bonding'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="bondN" :title="t('vppInterfaces.bonding_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.mode') }}</label>
            <select class="form-control" v-model="editingItem.mode" :title="t('vppInterfaces.bonding_mode')">
              <option value="802.3ad">802.3ad</option>
              <option value="active-backup">Active-Backup</option>
              <option value="broadcast">Broadcast</option>
              <option value="round-robin">Round-Robin</option>
              <option value="xor-hash">XOR-Hash</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.hash_policy') }}</label>
            <select class="form-control" v-model="editingItem.hash_policy" :title="t('vppInterfaces.hash_policy')">
              <option value="layer2">Layer2</option>
              <option value="layer2+3">Layer2+3</option>
              <option value="layer3+4">Layer3+4</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.kernel_interface') }}</label><input class="form-control" v-model="editingItem.kernel_interface" placeholder="vpptunN" :title="t('vppInterfaces.kernel_interface')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.mac_address') }}</label><input class="form-control" v-model="editingItem.mac" placeholder="xx:xx:xx:xx:xx:xx" :title="t('vppInterfaces.mac_address')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.member_interfaces') }}</label><textarea class="form-control" v-model="editingItem.member_interfaces" rows="3" :placeholder="t('vppInterfaces.one_per_line')" :title="t('vppInterfaces.member_interfaces')" /></div>
        </div>
        <div v-if="activeTab === 'bridge'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="brN" :title="t('vppInterfaces.bridge_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
        </div>
        <div v-if="activeTab === 'gre'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="greN" :title="t('vppInterfaces.gre_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.mode') }}</label>
            <select class="form-control" v-model="editingItem.mode" :title="t('vppInterfaces.gre_mode')">
              <option value="point-to-point">Point-to-Point</option>
              <option value="point-to-multipoint">Point-to-Multipoint</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.remote_address') }}</label><input class="form-control" v-model="editingItem.remote" placeholder="x.x.x.x" :title="t('vppInterfaces.remote_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.source_address') }}</label><input class="form-control" v-model="editingItem.source_address" placeholder="x.x.x.x" :title="t('vppInterfaces.source_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.tunnel_type') }}</label>
            <select class="form-control" v-model="editingItem.tunnel_type" :title="t('vppInterfaces.tunnel_type')">
              <option value="erspan">ERSPAN</option>
              <option value="l3">L3</option>
              <option value="teb">TEB</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.kernel_interface') }}</label><input class="form-control" v-model="editingItem.kernel_interface" placeholder="vpptunN" :title="t('vppInterfaces.kernel_interface')" /></div>
        </div>
        <div v-if="activeTab === 'ipip'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="ipipN" :title="t('vppInterfaces.ipip_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.remote_address') }}</label><input class="form-control" v-model="editingItem.remote" placeholder="x.x.x.x" :title="t('vppInterfaces.remote_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.source_address') }}</label><input class="form-control" v-model="editingItem.source_address" placeholder="x.x.x.x" :title="t('vppInterfaces.source_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.kernel_interface') }}</label><input class="form-control" v-model="editingItem.kernel_interface" placeholder="vpptunN" :title="t('vppInterfaces.kernel_interface')" /></div>
        </div>
        <div v-if="activeTab === 'loopback'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="loN" :title="t('vppInterfaces.loopback_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.kernel_interface') }}</label><input class="form-control" v-model="editingItem.kernel_interface" placeholder="vpptunN" :title="t('vppInterfaces.kernel_interface')" /></div>
        </div>
        <div v-if="activeTab === 'vxlan'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="vxlanN" :title="t('vppInterfaces.vxlan_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.remote_address') }}</label><input class="form-control" v-model="editingItem.remote" placeholder="x.x.x.x" :title="t('vppInterfaces.remote_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.source_address') }}</label><input class="form-control" v-model="editingItem.source_address" placeholder="x.x.x.x" :title="t('vppInterfaces.source_ip')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.vni') }}</label><input class="form-control" type="number" min="0" max="16777214" v-model="editingItem.vni" title="VXLAN Network Identifier" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.kernel_interface') }}</label><input class="form-control" v-model="editingItem.kernel_interface" placeholder="vpptapN" :title="t('vppInterfaces.kernel_interface')" /></div>
        </div>
        <div v-if="activeTab === 'xconnect'">
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.name') }}</label><input class="form-control" v-model="editingItem.name" :disabled="editingItem._name" placeholder="xconN" :title="t('vppInterfaces.xconnect_name_help')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.description') }}</label><input class="form-control" v-model="editingItem.description" :title="t('vppInterfaces.description')" /></div>
          <div class="form-row"><label class="form-label">{{ t('vppInterfaces.member_interfaces') }}</label><textarea class="form-control" v-model="editingItem.member_interfaces" rows="3" :placeholder="t('vppInterfaces.one_per_line')" :title="t('vppInterfaces.member_interfaces')" /></div>
        </div>
      </DraggableModal>
    </div>
  `,
});
