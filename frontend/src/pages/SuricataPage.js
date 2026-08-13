import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, monitorApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import DataTable from '/src/components/Table/DataTable.js';

const EVE_FILETYPE_OPTIONS = ['regular', 'syslog'];
const EVE_TYPE_OPTIONS = [
  'alert', 'anomaly', 'drop', 'file', 'flow', 'netflow',
  'dcerpc', 'dhcp', 'dnp3', 'dns', 'files', 'ftp', 'http', 'http2',
  'ikev2', 'krb5', 'mqtt', 'nfs', 'rdp', 'rfb', 'sip', 'smb',
  'smtp', 'snmp', 'ssh', 'tftp', 'tls',
];

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

function joinMembers(val) {
  return toArray(val).join('\n');
}

function splitMembers(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}



function suricataToForm(data = {}) {
  const logEve = data.log?.eve || {};
  return {
    interface: toArray(data.interface),
    log: {
      eve: {
        filename: logEve.filename !== undefined ? String(logEve.filename) : '',
        filetype: logEve.filetype || 'regular',
        type: toArray(logEve.type),
      },
    },
    address_groups: Object.entries(data['address-group'] || {}).map(([name, g]) => ({
      _name: name,
      name,
      addresses: toArray(g.address),
      groups: toArray(g.group),
    })),
    port_groups: Object.entries(data['port-group'] || {}).map(([name, g]) => ({
      _name: name,
      name,
      ports: toArray(g.port),
      groups: toArray(g.group),
    })),
  };
}

function suricataToConfig(form) {
  const result = {};
  if (form.interface?.length) result.interface = [...form.interface];

  const eve = {};
  if (isPresent(form.log?.eve?.filename)) eve.filename = String(form.log.eve.filename);
  if (isPresent(form.log?.eve?.filetype)) eve.filetype = String(form.log.eve.filetype);
  if (form.log?.eve?.type?.length) eve.type = [...form.log.eve.type];
  if (Object.keys(eve).length) result.log = { eve };

  const addressGroups = {};
  for (const g of form.address_groups || []) {
    if (!g.name) continue;
    const item = {};
    if (g.addresses?.length) item.address = [...g.addresses];
    if (g.groups?.length) item.group = [...g.groups];
    if (Object.keys(item).length) addressGroups[g.name] = item;
  }
  if (Object.keys(addressGroups).length) result['address-group'] = addressGroups;

  const portGroups = {};
  for (const g of form.port_groups || []) {
    if (!g.name) continue;
    const item = {};
    if (g.ports?.length) item.port = [...g.ports];
    if (g.groups?.length) item.group = [...g.groups];
    if (Object.keys(item).length) portGroups[g.name] = item;
  }
  if (Object.keys(portGroups).length) result['port-group'] = portGroups;

  return result;
}

function defaultAddressGroup() {
  return { name: '', addresses: [], groups: [] };
}

function defaultPortGroup() {
  return { name: '', ports: [], groups: [] };
}

export default defineComponent({
  name: 'SuricataPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();

    function validateName(name) {
      if (!name || !String(name).trim()) return t('suricata.validation.nameRequired');
      if (!/^[a-zA-Z0-9_-]+$/.test(String(name))) return t('suricata.validation.nameFormat');
      return '';
    }

    function validateIPv4(value) {
      if (!value) return '';
      const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!re.test(value)) return t('suricata.validation.ipv4Format');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('suricata.validation.ipv6Format');
      return '';
    }

    function validateIPPrefix(value) {
      if (!value) return '';
      const parts = value.split('/');
      if (parts.length !== 2) return t('suricata.validation.ipPrefixFormat');
      const v4 = validateIPv4(parts[0]);
      const v6 = validateIPv6(parts[0]);
      if (v4 && v6) return v4;
      const p = parseInt(parts[1], 10);
      if (isNaN(p)) return t('suricata.validation.prefixLengthFormat');
      if (!v4 && (p < 0 || p > 32)) return t('suricata.validation.ipv4PrefixRange');
      if (!v6 && (p < 0 || p > 128)) return t('suricata.validation.ipv6PrefixRange');
      return '';
    }

    function validateAddressEntry(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const item = raw.startsWith('!') ? raw.slice(1).trim() : raw;
      if (!item) return t('suricata.validation.addressNotEmpty');
      if (item.includes('/')) {
        const err = validateIPPrefix(item);
        if (err) return err;
      } else {
        const v4 = validateIPv4(item);
        const v6 = validateIPv6(item);
        if (v4 && v6) return v4;
      }
      return '';
    }

    function validatePortEntry(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const item = raw.startsWith('!') ? raw.slice(1).trim() : raw;
      if (!item) return t('suricata.validation.portNotEmpty');
      if (/^\d+-\d+$/.test(item)) {
        const [a, b] = item.split('-').map(Number);
        if (isNaN(a) || isNaN(b) || a < 1 || b > 65535 || a > b) return t('suricata.validation.portRangeFormat');
        return '';
      }
      const n = Number(item);
      if (isNaN(n) || n < 1 || n > 65535) return t('suricata.validation.portFormat');
      return '';
    }

    function validateAddressGroupEntries(text) {
      for (const line of splitMembers(text)) {
        const err = validateAddressEntry(line);
        if (err) return err;
      }
      return '';
    }

    function validatePortGroupEntries(text) {
      for (const line of splitMembers(text)) {
        const err = validatePortEntry(line);
        if (err) return err;
      }
      return '';
    }

    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(suricataToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);
    const commandPath = 'service suricata';

    const addressGroupColumns = [
      { key: 'name', title: t('suricata.columns.name') },
      { key: 'addresses', title: t('suricata.columns.addressCount') },
      { key: 'groups', title: t('suricata.columns.groupCount') },
    ];
    const portGroupColumns = [
      { key: 'name', title: t('suricata.columns.name') },
      { key: 'ports', title: t('suricata.columns.portCount') },
      { key: 'groups', title: t('suricata.columns.groupCount') },
    ];

    const addressGroupRows = computed(() => (config.value.address_groups || []).map(g => ({
      _name: g.name,
      name: g.name,
      addresses: (g.addresses || []).length,
      groups: (g.groups || []).length,
    })));
    const portGroupRows = computed(() => (config.value.port_groups || []).map(g => ({
      _name: g.name,
      name: g.name,
      ports: (g.ports || []).length,
      groups: (g.groups || []).length,
    })));

    const showAddressModal = ref(false);
    const showPortModal = ref(false);
    const editingAddress = ref(defaultAddressGroup());
    const editingPort = ref(defaultPortGroup());
    const addressModalTitle = ref('');
    const portModalTitle = ref('');
    const addressAddressText = ref('');
    const addressGroupText = ref('');
    const portPortText = ref('');
    const portGroupText = ref('');

    const deleteAddressModalVisible = ref(false);
    const pendingDeleteAddressNames = ref([]);
    const deletePortModalVisible = ref(false);
    const pendingDeletePortNames = ref([]);

    async function loadInterfaces() {
      try {
        const res = await monitorApi.interfaces();
        interfaces.value = (res.interfaces || []).slice().sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service suricata', true);
        config.value = suricataToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function openAddressCreate() {
      editingAddress.value = defaultAddressGroup();
      addressAddressText.value = '';
      addressGroupText.value = '';
      addressModalTitle.value = t('suricata.modal.createAddressGroup');
      showAddressModal.value = true;
    }

    function openAddressEdit(row) {
      const found = config.value.address_groups.find(g => g.name === row.name);
      if (!found) return;
      editingAddress.value = { ...found };
      addressAddressText.value = joinMembers(found.addresses);
      addressGroupText.value = joinMembers(found.groups);
      addressModalTitle.value = t('suricata.modal.editAddressGroup');
      showAddressModal.value = true;
    }

    function deleteAddressGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.address_groups.find(g => g.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      pendingDeleteAddressNames.value = names;
      deleteAddressModalVisible.value = true;
    }

    function confirmRemoveAddress() {
      deleteAddressModalVisible.value = false;
      config.value.address_groups = config.value.address_groups.filter(g => !pendingDeleteAddressNames.value.includes(g.name));
      pendingDeleteAddressNames.value = [];
    }

    function saveAddressGroup() {
      const err = validateName(editingAddress.value.name);
      if (err) return showError({ message: err });
      const addrErr = validateAddressGroupEntries(addressAddressText.value);
      if (addrErr) return showError({ message: addrErr });
      const addresses = splitMembers(addressAddressText.value);
      const groups = splitMembers(addressGroupText.value);
      const existing = config.value.address_groups.findIndex(g => g._name === editingAddress.value._name);
      const item = { _name: editingAddress.value.name, name: editingAddress.value.name, addresses, groups };
      if (existing >= 0) {
        config.value.address_groups[existing] = item;
      } else {
        if (config.value.address_groups.some(g => g.name === item.name)) {
          return showError({ message: t('suricata.error.addressGroupExists') });
        }
        config.value.address_groups.push(item);
      }
      showAddressModal.value = false;
    }

    function openPortCreate() {
      editingPort.value = defaultPortGroup();
      portPortText.value = '';
      portGroupText.value = '';
      portModalTitle.value = t('suricata.modal.createPortGroup');
      showPortModal.value = true;
    }

    function openPortEdit(row) {
      const found = config.value.port_groups.find(g => g.name === row.name);
      if (!found) return;
      editingPort.value = { ...found };
      portPortText.value = joinMembers(found.ports);
      portGroupText.value = joinMembers(found.groups);
      portModalTitle.value = t('suricata.modal.editPortGroup');
      showPortModal.value = true;
    }

    function deletePortGroup(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?.name];
      const names = keys.map(k => config.value.port_groups.find(g => g.name === k)?.name).filter(Boolean);
      if (!names.length) return;
      pendingDeletePortNames.value = names;
      deletePortModalVisible.value = true;
    }

    function confirmRemovePort() {
      deletePortModalVisible.value = false;
      config.value.port_groups = config.value.port_groups.filter(g => !pendingDeletePortNames.value.includes(g.name));
      pendingDeletePortNames.value = [];
    }

    function savePortGroup() {
      const err = validateName(editingPort.value.name);
      if (err) return showError({ message: err });
      const portErr = validatePortGroupEntries(portPortText.value);
      if (portErr) return showError({ message: portErr });
      const ports = splitMembers(portPortText.value);
      const groups = splitMembers(portGroupText.value);
      const existing = config.value.port_groups.findIndex(g => g._name === editingPort.value._name);
      const item = { _name: editingPort.value.name, name: editingPort.value.name, ports, groups };
      if (existing >= 0) {
        config.value.port_groups[existing] = item;
      } else {
        if (config.value.port_groups.some(g => g.name === item.name)) {
          return showError({ message: t('suricata.error.portGroupExists') });
        }
        config.value.port_groups.push(item);
      }
      showPortModal.value = false;
    }

    async function save() {
      saving.value = true;
      try {
        const value = suricataToConfig(config.value);
        const paths = [
          'service suricata interface',
          'service suricata log',
          'service suricata address-group',
          'service suricata port-group',
        ];
        for (const p of paths) {
          try { await configApi.delete(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configApi.set('service suricata', value);
        }
        configStore.markPending();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t, loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      addressGroupColumns, portGroupColumns, addressGroupRows, portGroupRows,
      showAddressModal, showPortModal, editingAddress, editingPort,
      addressModalTitle, portModalTitle, addressAddressText, addressGroupText,
      portPortText, portGroupText,
      deleteAddressModalVisible, pendingDeleteAddressNames, deletePortModalVisible, pendingDeletePortNames,
      load, save, openAddressCreate, openAddressEdit, deleteAddressGroup, saveAddressGroup, confirmRemoveAddress,
      openPortCreate, openPortEdit, deletePortGroup, savePortGroup, confirmRemovePort,
      EVE_FILETYPE_OPTIONS, EVE_TYPE_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton, DraggableModal, DualListSelector, DataTable },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('suricata.status.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('suricata.tabs.basic') },
        { key: 'address-groups', title: t('suricata.tabs.addressGroups') },
        { key: 'port-groups', title: t('suricata.tabs.portGroups') }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label">{{ t('suricata.labels.interfaces') }}</label>
            <DualListSelector v-model="config.interface" :options="interfaces" :title-left="t('suricata.selector.available')" :title-right="t('suricata.selector.selected')" />
          </div>
          <div class="form-group">
            <div class="form-group-title">{{ t('suricata.labels.eveLog') }}</div>
            <div class="form-group-content">
              <div class="form-row">
                <label class="form-label">{{ t('suricata.labels.filename') }}</label>
                <input class="form-control" v-model="config.log.eve.filename" placeholder="eve.json" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('suricata.labels.filetype') }}</label>
                <select class="form-control" v-model="config.log.eve.filetype">
                  <option v-for="opt in EVE_FILETYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('suricata.labels.logType') }}</label>
                <DualListSelector v-model="config.log.eve.type" :options="EVE_TYPE_OPTIONS" :title-left="t('suricata.selector.available')" :title-right="t('suricata.selector.selected')" />
              </div>
            </div>
          </div>
        </template>

        <template #address-groups>
          <div class="data-table-wrapper">
            <DataTable :columns="addressGroupColumns" :data="addressGroupRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openAddressCreate" @edit="openAddressEdit" @delete="deleteAddressGroup" @refresh="load" />
          </div>
        </template>

        <template #port-groups>
          <div class="data-table-wrapper">
            <DataTable :columns="portGroupColumns" :data="portGroupRows" row-key="name" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openPortCreate" @edit="openPortEdit" @delete="deletePortGroup" @refresh="load" />
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="showAddressModal" :title="addressModalTitle" @confirm="saveAddressGroup" @close="showAddressModal = false">
        <div class="form-row"><label class="form-label">{{ t('suricata.labels.name') }}</label><input class="form-control" v-model="editingAddress.name" :placeholder="t('suricata.placeholders.addressGroupName')" /></div>
        <div class="form-row">
          <label class="form-label">{{ t('suricata.labels.addressList') }}</label>
          <textarea class="form-control" v-model="addressAddressText" rows="5" :placeholder="t('suricata.placeholders.addressList')"></textarea>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('suricata.labels.refAddressGroups') }}</label>
          <textarea class="form-control" v-model="addressGroupText" rows="3" :placeholder="t('suricata.placeholders.refAddressGroups')"></textarea>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showPortModal" :title="portModalTitle" @confirm="savePortGroup" @close="showPortModal = false">
        <div class="form-row"><label class="form-label">{{ t('suricata.labels.name') }}</label><input class="form-control" v-model="editingPort.name" :placeholder="t('suricata.placeholders.portGroupName')" /></div>
        <div class="form-row">
          <label class="form-label">{{ t('suricata.labels.portList') }}</label>
          <textarea class="form-control" v-model="portPortText" rows="5" :placeholder="t('suricata.placeholders.portList')"></textarea>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('suricata.labels.refPortGroups') }}</label>
          <textarea class="form-control" v-model="portGroupText" rows="3" :placeholder="t('suricata.placeholders.refPortGroups')"></textarea>
        </div>
      </DraggableModal>

      <!-- Confirm delete address group modal -->
      <DraggableModal v-model:visible="deleteAddressModalVisible" :title="t('suricata.modal.confirmDelete')" @confirm="confirmRemoveAddress">
        <p>{{ t('suricata.confirm.deleteAddressGroup') }}</p>
        <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <div v-for="name in pendingDeleteAddressNames" :key="name">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- Confirm delete port group modal -->
      <DraggableModal v-model:visible="deletePortModalVisible" :title="t('suricata.modal.confirmDelete')" @confirm="confirmRemovePort">
        <p>{{ t('suricata.confirm.deletePortGroup') }}</p>
        <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <div v-for="name in pendingDeletePortNames" :key="name">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
