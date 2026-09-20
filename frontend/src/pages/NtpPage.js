import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

const LEAP_SECOND_OPTIONS = ['ignore', 'smear', 'system', 'timezone'];

const ALLOW_CLIENT_OPTIONS = [
  '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16',
  '::1/128', 'fc00::/7', 'fe80::/10',
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

function firstValue(val) {
  const arr = toArray(val);
  return arr.length ? String(arr[0]) : '';
}

function ntpToForm(data = {}) {
  const servers = [];
  const serverData = data.server || {};
  for (const [name, attrs] of Object.entries(serverData)) {
    servers.push({
      name,
      prefer: attrs.prefer !== undefined,
      noselect: attrs.noselect !== undefined,
      pool: attrs.pool !== undefined,
      nts: attrs.nts !== undefined,
    });
  }
  return {
    leap_second: data['leap-second'] || 'timezone',
    interface: firstValue(data.interface),
    listen_address: toArray(data['listen-address']),
    allow_client: toArray(data['allow-client']?.address),
    vrf: data.vrf || '',
    servers,
  };
}

function ntpToConfig(form) {
  const result = {};
  if (isPresent(form.leap_second)) result['leap-second'] = String(form.leap_second);
  if (isPresent(form.interface)) result.interface = String(form.interface);

  if (form.listen_address?.length) result['listen-address'] = [...form.listen_address];

  if (form.allow_client?.length) result['allow-client'] = { address: [...form.allow_client] };

  if (isPresent(form.vrf)) result.vrf = String(form.vrf);

  const serverObj = {};
  for (const s of form.servers || []) {
    if (!s.name) continue;
    const attrs = {};
    if (s.prefer) attrs.prefer = '';
    if (s.noselect) attrs.noselect = '';
    if (s.pool) attrs.pool = '';
    if (s.nts) attrs.nts = '';
    serverObj[s.name] = attrs;
  }
  if (Object.keys(serverObj).length) result.server = serverObj;

  return result;
}

export default defineComponent({
  name: 'NtpPage',
  setup() {
    const configStore = useConfigStore();
    const { t } = useI18n();

    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('ntp.validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('ntp.validation.ipv4Format');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('ntp.validation.ipv6Format');
      return '';
    }

    function validateIP(value) {
      if (!value) return '';
      if (!validateIPv4(value)) return '';
      if (!validateIPv6(value)) return '';
      return t('ntp.validation.ipFormat');
    }

    function validateIPPrefix(value) {
      if (!value) return '';
      if (value.includes('/')) {
        const [ip, prefix] = value.split('/');
        const p = parseInt(prefix, 10);
        if (isNaN(p)) return t('ntp.validation.prefixMustBeNumber');
        const v4Err = validateIPv4(ip);
        const v6Err = validateIPv6(ip);
        if (!v4Err && (p < 0 || p > 32)) return t('ntp.validation.ipv4PrefixRange');
        if (!v6Err && (p < 0 || p > 128)) return t('ntp.validation.ipv6PrefixRange');
        if (v4Err && v6Err) return t('ntp.validation.ipOrPrefixFormat');
        return '';
      }
      return validateIP(value);
    }

    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(ntpToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const modalVisible = ref(false);
    const editingIndex = ref(-1);
    const serverForm = ref({ name: '', prefer: false, noselect: false, pool: false, nts: false });
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const localAddresses = computed(() => {
      const addresses = new Set();
      for (const iface of interfaces.value) {
        for (const ip of toArray(iface.ipv4_address)) {
          addresses.add(String(ip).split('/')[0]);
        }
        for (const ip of toArray(iface.ipv6_address)) {
          addresses.add(String(ip).split('/')[0]);
        }
      }
      addresses.add('127.0.0.1');
      addresses.add('::1');
      return Array.from(addresses).filter(Boolean).sort();
    });

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = res.interfaces || [];
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      if (activeTab.value === 'server') return 'service ntp server';
      return 'service ntp';
    });

    const serverColumns = [
      { key: 'name', title: t('ntp.columns.address') },
      { key: 'prefer', title: t('ntp.columns.prefer'), render: v => v ? '✓' : '' },
      { key: 'noselect', title: t('ntp.columns.noselect'), render: v => v ? '✓' : '' },
      { key: 'pool', title: t('ntp.columns.pool'), render: v => v ? '✓' : '' },
      { key: 'nts', title: 'NTS', render: v => v ? '✓' : '' },
    ];

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service ntp', true);
        config.value = ntpToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      for (const ip of config.value.listen_address || []) {
        const err = validateIP(ip);
        if (err) return showError({ message: t('ntp.validation.listenAddressError', { ip, err }) });
      }

      for (const item of config.value.allow_client || []) {
        const err = validateIPPrefix(item);
        if (err) return showError({ message: t('ntp.validation.allowClientError', { item, err }) });
      }

      saving.value = true;
      try {
        await configStore.setConfig('service ntp', ntpToConfig(config.value));
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createServer() {
      editingIndex.value = -1;
      serverForm.value = { name: '', prefer: false, noselect: false, pool: false, nts: false };
      modalVisible.value = true;
    }

    function editServer(row) {
      editingIndex.value = config.value.servers.findIndex(s => s.name === row.name);
      serverForm.value = { ...row };
      modalVisible.value = true;
    }

    function deleteServer(selectedNames) {
      if (!selectedNames.length) return;
      pendingDeleteNames.value = [...selectedNames];
      deleteModalVisible.value = true;
    }

    function confirmDeleteServer() {
      deleteModalVisible.value = false;
      const toDelete = new Set(pendingDeleteNames.value);
      config.value.servers = config.value.servers.filter(s => !toDelete.has(s.name));
      pendingDeleteNames.value = [];
    }

    function saveServer() {
      const name = String(serverForm.value.name || '').trim();
      if (!name) return showError({ message: t('ntp.validation.enterServerAddress') });

      const duplicate = config.value.servers.find((s, i) => s.name === name && i !== editingIndex.value);
      if (duplicate) return showError({ message: t('ntp.validation.addressAlreadyExists') });

      const newServer = {
        name,
        prefer: !!serverForm.value.prefer,
        noselect: !!serverForm.value.noselect,
        pool: !!serverForm.value.pool,
        nts: !!serverForm.value.nts,
      };

      if (editingIndex.value >= 0) {
        config.value.servers.splice(editingIndex.value, 1, newServer);
      } else {
        config.value.servers.push(newServer);
      }
      modalVisible.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, localAddresses, commandPath,
      serverColumns, modalVisible, serverForm, deleteModalVisible, pendingDeleteNames,
      load, save, createServer, editServer, deleteServer, confirmDeleteServer, saveServer,
      LEAP_SECOND_OPTIONS, ALLOW_CLIENT_OPTIONS,
    };
  },
  components: { DualListSelector, TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('ntp.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('ntp.tabs.basic') },
        { key: 'server', title: t('ntp.tabs.server') }
      ]">
        <template v-slot:basic>
          <div class="form-row">
            <label class="form-label" :title="t('ntp.labels.leapSecondTitle')">{{ t('ntp.labels.leapSecond') }}</label>
            <div style="flex:1;">
              <select class="form-control" v-model="config.leap_second" :title="t('ntp.labels.leapSecondTitle')">
                <option v-for="o in LEAP_SECOND_OPTIONS" :key="o" :value="o">{{ o }}</option>
              </select>
              <div class="form-hint">{{ t('ntp.hints.leapSecondDefault') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('ntp.labels.interface') }}</label>
            <select class="form-control" v-model="config.interface" :title="t('ntp.labels.interfaceTitle')">
              <option value="">{{ t('ntp.labels.notSelected') }}</option>
              <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ntp.labels.listenAddressTitle')">{{ t('ntp.labels.listenAddress') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.listen_address" :options="localAddresses" :title-left="t('ntp.labels.available')" :title-right="t('ntp.labels.selected')" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ntp.labels.allowClientTitle')">{{ t('ntp.labels.allowClient') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.allow_client" :options="ALLOW_CLIENT_OPTIONS" :title-left="t('ntp.labels.available')" :title-right="t('ntp.labels.selected')" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">VRF</label>
            <input type="text" class="form-control" v-model="config.vrf" :placeholder="t('ntp.placeholders.vrfName')" :title="t('ntp.labels.vrfTitle')" />
          </div>
        </template>
        <template v-slot:server>
          <DataTable :columns="serverColumns" :data="config.servers" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="createServer" @edit="editServer" @delete="deleteServer" />
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="modalVisible" :title="editingIndex >= 0 ? t('ntp.modals.editServer') : t('ntp.modals.addServer')" width="500px" @confirm="saveServer">
        <div class="form-row">
          <label class="form-label">{{ t('ntp.labels.address') }}</label>
          <input type="text" class="form-control" v-model="serverForm.name" :placeholder="t('ntp.placeholders.serverAddress')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ntp.labels.prefer') }}</label>
          <input type="checkbox" v-model="serverForm.prefer" :title="t('ntp.labels.preferTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ntp.labels.noselect') }}</label>
          <input type="checkbox" v-model="serverForm.noselect" :title="t('ntp.labels.noselectTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('ntp.labels.pool') }}</label>
          <input type="checkbox" v-model="serverForm.pool" :title="t('ntp.labels.poolTitle')" />
        </div>
        <div class="form-row">
          <label class="form-label">NTS</label>
          <input type="checkbox" v-model="serverForm.nts" :title="t('ntp.labels.ntsTitle')" />
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('ntp.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteServer">
        <div>{{ t('ntp.messages.confirmDeleteServers') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
