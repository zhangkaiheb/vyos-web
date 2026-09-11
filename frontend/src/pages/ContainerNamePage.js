import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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

const CONTAINER_CAPABILITY_OPTIONS = [
  'net-admin',
  'net-bind-service',
  'net-raw',
  'mknod',
  'setpcap',
  'sys-admin',
  'sys-module',
  'sys-nice',
  'sys-time',
];

const CONTAINER_LOG_DRIVER_OPTIONS = ['k8s-file', 'journald', 'none'];
const CONTAINER_VOLUME_MODE_OPTIONS = ['rw', 'ro'];
const CONTAINER_VOLUME_PROPAGATION_OPTIONS = ['shared', 'slave', 'private', 'rshared', 'rslave', 'rprivate'];

export default defineComponent({
  name: 'ContainerNamePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const containerList = ref([]);
    const selectedContainers = ref([]);
    const showEditModal = ref(false);
    const editingContainer = ref(null);

    const columns = [
      { key: 'name', title: t('container.columns.name'), dataIndex: 'name', width: 150 },
      { key: 'image', title: t('container.columns.image'), dataIndex: 'image', width: 200 },
      { key: 'description', title: t('container.columns.description'), dataIndex: 'description', width: 200 },
      { key: 'disable', title: t('container.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'restart', title: t('container.columns.restart'), dataIndex: 'restart', width: 120 },
      { key: 'memory', title: t('container.columns.memory'), dataIndex: 'memory', width: 100 },
      { key: 'cpu_quota', title: t('container.columns.cpuQuota'), dataIndex: 'cpu_quota', width: 100 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Sub-table columns
    const environmentColumns = [
      { key: 'name', title: t('container.subColumns.name'), dataIndex: 'name', width: 150 },
      { key: 'value', title: t('container.subColumns.value'), dataIndex: 'value', width: 250 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const labelColumns = [
      { key: 'name', title: t('container.subColumns.name'), dataIndex: 'name', width: 150 },
      { key: 'value', title: t('container.subColumns.value'), dataIndex: 'value', width: 250 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const sysctlColumns = [
      { key: 'name', title: t('container.subColumns.parameter'), dataIndex: 'name', width: 200 },
      { key: 'value', title: t('container.subColumns.value'), dataIndex: 'value', width: 200 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tmpfsColumns = [
      { key: 'name', title: t('container.subColumns.path'), dataIndex: 'name', width: 200 },
      { key: 'destination', title: t('container.subColumns.destination'), dataIndex: 'destination', width: 220 },
      { key: 'size', title: t('container.subColumns.size'), dataIndex: 'size', width: 150 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const deviceColumns = [
      { key: 'name', title: t('container.subColumns.name'), dataIndex: 'name', width: 120 },
      { key: 'source', title: t('container.subColumns.sourceDevice'), dataIndex: 'source', width: 200 },
      { key: 'destination', title: t('container.subColumns.destinationDevice'), dataIndex: 'destination', width: 200 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const networkColumns = [
      { key: 'name', title: t('container.subColumns.network'), dataIndex: 'name', width: 150 },
      { key: 'address', title: t('container.subColumns.address'), dataIndex: 'address', width: 200 },
      { key: 'mac', title: t('container.subColumns.mac'), dataIndex: 'mac', width: 170 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const portColumns = [
      { key: 'name', title: t('container.subColumns.name'), dataIndex: 'name', width: 120 },
      { key: 'source', title: t('container.subColumns.sourcePort'), dataIndex: 'source', width: 100 },
      { key: 'destination', title: t('container.subColumns.destinationPort'), dataIndex: 'destination', width: 100 },
      { key: 'listen_address', title: t('container.subColumns.listenAddress'), dataIndex: 'listen_address', width: 180 },
      { key: 'protocol', title: t('container.subColumns.protocol'), dataIndex: 'protocol', width: 80 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const volumeColumns = [
      { key: 'name', title: t('container.subColumns.name'), dataIndex: 'name', width: 120 },
      { key: 'source', title: t('container.subColumns.source'), dataIndex: 'source', width: 200 },
      { key: 'destination', title: t('container.subColumns.destination'), dataIndex: 'destination', width: 200 },
      { key: 'mode', title: t('container.subColumns.mode'), dataIndex: 'mode', width: 90 },
      { key: 'propagation', title: t('container.subColumns.propagation'), dataIndex: 'propagation', width: 110 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Sub-item selection states
    const selectedEnvironments = ref([]);
    const selectedLabels = ref([]);
    const selectedSysctls = ref([]);
    const selectedTmpfs = ref([]);
    const selectedDevices = ref([]);
    const selectedNetworks = ref([]);
    const selectedPorts = ref([]);
    const selectedVolumes = ref([]);

    // Sub-item modals
    const showEnvironmentModal = ref(false);
    const editingEnvironment = ref(null);
    const showLabelModal = ref(false);
    const editingLabel = ref(null);
    const showSysctlModal = ref(false);
    const editingSysctl = ref(null);
    const showTmpfsModal = ref(false);
    const editingTmpfs = ref(null);
    const showDeviceModal = ref(false);
    const editingDevice = ref(null);
    const showNetworkModal = ref(false);
    const editingNetwork = ref(null);
    const showPortModal = ref(false);
    const editingPort = ref(null);
    const showVolumeModal = ref(false);
    const editingVolume = ref(null);

    const commandPath = computed(() => 'container name');

    function containerToForm(name, data = {}) {
      const env = data.environment || {};
      const label = data.label || {};
      const sysctl = data.sysctl || {};
      const tmpfs = data.tmpfs || {};
      const device = data.device || {};
      const network = data.network || {};
      const port = data.port || {};
      const volume = data.volume || {};
      const hc = data['health-check'] || {};

      return {
        _name: name,
        name: name,
        image: data.image || '',
        description: data.description || '',
        host_name: data['host-name'] || '',
        command: data.command || '',
        entrypoint: data.entrypoint || '',
        arguments: joinLines(data.arguments),
        cpu_quota: data['cpu-quota'] || '0',
        memory: data.memory || '512',
        shared_memory: data['shared-memory'] || '64',
        uid: data.uid || '',
        gid: data.gid || '',
        log_driver: data['log-driver'] || 'journald',
        restart: data.restart || 'on-failure',
        privileged: data.privileged !== undefined,
        allow_host_networks: data['allow-host-networks'] !== undefined,
        allow_host_pid: data['allow-host-pid'] !== undefined,
        disable: data.disable !== undefined,
        capability: toArray(data.capability).map(c => {
          const value = typeof c === 'string' ? c : (c?.capability || '');
          return String(value || '').trim();
        }).filter(Boolean),
        environment: Object.entries(env).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        label: Object.entries(label).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        name_server: toArray(data['name-server']).map(s => {
          const value = typeof s === 'string' ? s : (s?.server || '');
          return String(value || '').trim();
        }).filter(Boolean),
        name_server_text: joinLines(data['name-server']),
        sysctl: Object.entries(sysctl).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        tmpfs: Object.entries(tmpfs).map(([k, v]) => ({ _name: k, name: k, destination: v.destination || '', size: v.size || '' })),
        device: Object.entries(device).map(([k, v]) => ({ _name: k, name: k, source: v.source || '', destination: v.destination || '' })),
        network: Object.entries(network).map(([k, v]) => ({ _name: k, name: k, address: v.address || '', mac: v.mac || 'auto' })),
        port: Object.entries(port).map(([k, v]) => ({ _name: k, name: k, source: v.source || '', destination: v.destination || '', listen_address: v['listen-address'] || '', protocol: v.protocol || 'tcp' })),
        volume: Object.entries(volume).map(([k, v]) => ({
          _name: k,
          name: k,
          source: v.source || '',
          destination: v.destination || '',
          mode: v.mode || (v.readonly !== undefined ? 'ro' : 'rw'),
          propagation: v.propagation || 'rprivate',
        })),
        health_check: {
          command: hc.command || '',
          interval: hc.interval || '',
          retry: hc.retry || '0',
          timeout: hc.timeout || '',
        },
      };
    }

    function formToContainer(form) {
      const result = {};
      if (isPresent(form.image)) result.image = String(form.image);
      if (isPresent(form.description)) result.description = String(form.description);
      if (isPresent(form.host_name)) result['host-name'] = String(form.host_name);
      if (isPresent(form.command)) result.command = String(form.command);
      if (isPresent(form.entrypoint)) result.entrypoint = String(form.entrypoint);
      const args = splitLines(form.arguments);
      if (args.length) result.arguments = args;
      if (form.cpu_quota && form.cpu_quota !== '0') result['cpu-quota'] = String(form.cpu_quota);
      if (form.memory && form.memory !== '512') result.memory = String(form.memory);
      if (form.shared_memory && form.shared_memory !== '64') result['shared-memory'] = String(form.shared_memory);
      if (isPresent(form.uid)) result.uid = String(form.uid);
      if (isPresent(form.gid)) result.gid = String(form.gid);
      if (form.log_driver && form.log_driver !== 'journald') result['log-driver'] = String(form.log_driver);
      if (form.restart && form.restart !== 'on-failure') result.restart = String(form.restart);
      if (form.privileged) result.privileged = '';
      if (form.allow_host_networks) result['allow-host-networks'] = '';
      if (form.allow_host_pid) result['allow-host-pid'] = '';
      if (form.disable) result.disable = '';

      if (form.capability && form.capability.length) {
        result.capability = form.capability
          .map(c => (typeof c === 'string' ? c : c.capability))
          .filter(Boolean)
          .map(String);
      }
      const parsedNameServers = splitLines(form.name_server_text);
      if (parsedNameServers.length) {
        result['name-server'] = parsedNameServers;
      }

      if (form.environment && form.environment.length) {
        const env = {};
        for (const e of form.environment) {
          if (!e.name) continue;
          env[e.name] = isPresent(e.value) ? { value: String(e.value) } : {};
        }
        if (Object.keys(env).length) result.environment = env;
      }

      if (form.label && form.label.length) {
        const label = {};
        for (const l of form.label) {
          if (!l.name) continue;
          label[l.name] = isPresent(l.value) ? { value: String(l.value) } : {};
        }
        if (Object.keys(label).length) result.label = label;
      }

      if (form.sysctl && form.sysctl.length) {
        const sysctl = {};
        for (const s of form.sysctl) {
          if (!s.name) continue;
          sysctl[s.name] = isPresent(s.value) ? { value: String(s.value) } : {};
        }
        if (Object.keys(sysctl).length) result.sysctl = sysctl;
      }

      if (form.tmpfs && form.tmpfs.length) {
        const tmpfs = {};
        for (const t of form.tmpfs) {
          if (!t.name) continue;
          const obj = {};
          if (isPresent(t.destination)) obj.destination = String(t.destination);
          if (isPresent(t.size)) obj.size = String(t.size);
          tmpfs[t.name] = obj;
        }
        if (Object.keys(tmpfs).length) result.tmpfs = tmpfs;
      }

      if (form.device && form.device.length) {
        const device = {};
        for (const d of form.device) {
          if (!d.name) continue;
          const obj = {};
          if (isPresent(d.source)) obj.source = String(d.source);
          if (isPresent(d.destination)) obj.destination = String(d.destination);
          device[d.name] = obj;
        }
        if (Object.keys(device).length) result.device = device;
      }

      if (form.network && form.network.length) {
        const network = {};
        for (const n of form.network) {
          if (!n.name) continue;
          const obj = {};
          if (isPresent(n.address)) obj.address = String(n.address);
          if (isPresent(n.mac)) obj.mac = String(n.mac);
          network[n.name] = obj;
        }
        if (Object.keys(network).length) result.network = network;
      }

      if (form.port && form.port.length) {
        const port = {};
        for (const p of form.port) {
          if (!p.name) continue;
          const obj = {};
          if (isPresent(p.source)) obj.source = String(p.source);
          if (isPresent(p.destination)) obj.destination = String(p.destination);
          if (isPresent(p.listen_address)) obj['listen-address'] = String(p.listen_address);
          if (p.protocol && p.protocol !== 'tcp') obj.protocol = String(p.protocol);
          port[p.name] = obj;
        }
        if (Object.keys(port).length) result.port = port;
      }

      if (form.volume && form.volume.length) {
        const volume = {};
        for (const v of form.volume) {
          if (!v.name) continue;
          const obj = {};
          if (isPresent(v.source)) obj.source = String(v.source);
          if (isPresent(v.destination)) obj.destination = String(v.destination);
          if (v.mode && v.mode !== 'rw') obj.mode = String(v.mode);
          if (v.propagation && v.propagation !== 'rprivate') obj.propagation = String(v.propagation);
          volume[v.name] = obj;
        }
        if (Object.keys(volume).length) result.volume = volume;
      }

      const hc = form.health_check || {};
      const healthCheck = {};
      if (isPresent(hc.command)) healthCheck.command = String(hc.command);
      if (isPresent(hc.interval)) healthCheck.interval = String(hc.interval);
      if (hc.retry && hc.retry !== '0') healthCheck.retry = String(hc.retry);
      if (isPresent(hc.timeout)) healthCheck.timeout = String(hc.timeout);
      if (Object.keys(healthCheck).length) result['health-check'] = healthCheck;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('container name', true);
        const data = res.data || {};
        containerList.value = Object.entries(data).map(([name, cfg]) => containerToForm(name, cfg));
      } catch (e) {
        showError(e.message || t('container.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function saveConfig() {
      saving.value = true;
      try {
        await configStore.deleteConfig('container name');
        const payload = {};
        for (const c of containerList.value) {
          if (!c.name) continue;
          payload[c.name] = formToContainer(c);
        }
        if (Object.keys(payload).length) {
          await configStore.setConfig('container name', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('container.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createContainer() {
      editingContainer.value = {
        _name: '', name: '', image: '', description: '', host_name: '', command: '', entrypoint: '',
        arguments: '', cpu_quota: '0', memory: '512', shared_memory: '64', uid: '', gid: '',
        log_driver: 'journald', restart: 'on-failure', privileged: false, allow_host_networks: false,
        allow_host_pid: false, disable: false, capability: [], environment: [], label: [],
        name_server: [], name_server_text: '', sysctl: [], tmpfs: [], device: [], network: [], port: [], volume: [],
        health_check: { command: '', interval: '', retry: '0', timeout: '' },
      };
      showEditModal.value = true;
    }

    function editContainer() {
      if (!selectedContainers.value.length) return showError({ message: t('container.selectContainerFirst') });
      const row = containerList.value.find(c => c.name === selectedContainers.value[0]);
      if (!row) return showError({ message: t('container.containerNotFound') });
      editingContainer.value = JSON.parse(JSON.stringify(row));
      showEditModal.value = true;
    }

    function removeContainer() {
      if (!selectedContainers.value.length) return showError({ message: t('container.selectContainerFirst') });
      containerList.value = containerList.value.filter(c => c.name !== selectedContainers.value[0]);
      selectedContainers.value = [];
    }

    function saveContainer() {
      if (!editingContainer.value.name) return showError({ message: t('container.nameRequired') });
      const list = containerList.value;
      const idx = list.findIndex(c => c._name === editingContainer.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingContainer.value });
      else list.push({ ...editingContainer.value });
      containerList.value = list;
      showEditModal.value = false;
    }

    function editContainerByRecord(record) {
      editingContainer.value = JSON.parse(JSON.stringify(record));
      showEditModal.value = true;
    }

    function removeContainerByRecord(record) {
      containerList.value = containerList.value.filter(c => c.name !== record.name);
    }

    // Sub-item CRUD helpers
    function createSubItem(modalRef, editingRef, defaults) {
      editingRef.value = { ...defaults };
      modalRef.value = true;
    }

    function editSubItem(selectedRef, list, modalRef, editingRef, keyField) {
      if (!selectedRef.value.length) return showError({ message: t('container.selectItemFirst') });
      const row = list.find(item => item[keyField] === selectedRef.value[0]);
      if (!row) return showError({ message: t('container.itemNotFound') });
      editingRef.value = JSON.parse(JSON.stringify(row));
      modalRef.value = true;
    }

    function removeSubItem(selectedRef, listKey, keyField) {
      if (!selectedRef.value.length) return showError({ message: t('container.selectItemFirst') });
      editingContainer.value[listKey] = editingContainer.value[listKey].filter(item => item[keyField] !== selectedRef.value[0]);
      selectedRef.value = [];
    }

    function saveSubItem(modalRef, editingRef, listKey, keyField, validateField) {
      if (!editingRef.value[validateField]) return showError({ message: t('container.fieldRequired') + validateField });
      const list = editingContainer.value[listKey];
      const idx = list.findIndex(item => item['_' + keyField] === editingRef.value['_' + keyField]);
      if (idx >= 0) list.splice(idx, 1, { ...editingRef.value });
      else list.push({ ...editingRef.value });
      editingContainer.value[listKey] = list;
      modalRef.value = false;
    }

    function editSubByRecord(record, editingRef, modalRef) {
      editingRef.value = JSON.parse(JSON.stringify(record));
      modalRef.value = true;
    }

    function removeSubByRecord(record, listKey, keyField) {
      editingContainer.value[listKey] = editingContainer.value[listKey].filter(item => item[keyField] !== record[keyField]);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, saved, containerList, columns, commandPath,
      selectedContainers, showEditModal, editingContainer,
      environmentColumns, labelColumns,
      sysctlColumns, tmpfsColumns, deviceColumns, networkColumns, portColumns, volumeColumns,
      selectedEnvironments, selectedLabels,
      selectedSysctls, selectedTmpfs, selectedDevices, selectedNetworks, selectedPorts, selectedVolumes,
      showEnvironmentModal, editingEnvironment,
      showLabelModal, editingLabel,
      showSysctlModal, editingSysctl, showTmpfsModal, editingTmpfs,
      showDeviceModal, editingDevice, showNetworkModal, editingNetwork,
      showPortModal, editingPort, showVolumeModal, editingVolume,
      CONTAINER_CAPABILITY_OPTIONS, CONTAINER_LOG_DRIVER_OPTIONS,
      CONTAINER_VOLUME_MODE_OPTIONS, CONTAINER_VOLUME_PROPAGATION_OPTIONS,
      load, saveConfig,
      createContainer, editContainer, removeContainer, saveContainer,
      editContainerByRecord, removeContainerByRecord,
      // Environment
      createEnvironment: () => createSubItem(showEnvironmentModal, editingEnvironment, { _name: '', name: '', value: '' }),
      editEnvironment: () => editSubItem(selectedEnvironments, editingContainer.value?.environment || [], showEnvironmentModal, editingEnvironment, 'name'),
      removeEnvironment: () => removeSubItem(selectedEnvironments, 'environment', 'name'),
      saveEnvironment: () => saveSubItem(showEnvironmentModal, editingEnvironment, 'environment', 'name', 'name'),
      editEnvironmentByRecord: (r) => editSubByRecord(r, editingEnvironment, showEnvironmentModal),
      removeEnvironmentByRecord: (r) => removeSubByRecord(r, 'environment', 'name'),
      // Label
      createLabel: () => createSubItem(showLabelModal, editingLabel, { _name: '', name: '', value: '' }),
      editLabel: () => editSubItem(selectedLabels, editingContainer.value?.label || [], showLabelModal, editingLabel, 'name'),
      removeLabel: () => removeSubItem(selectedLabels, 'label', 'name'),
      saveLabel: () => saveSubItem(showLabelModal, editingLabel, 'label', 'name', 'name'),
      editLabelByRecord: (r) => editSubByRecord(r, editingLabel, showLabelModal),
      removeLabelByRecord: (r) => removeSubByRecord(r, 'label', 'name'),
      // Sysctl
      createSysctl: () => createSubItem(showSysctlModal, editingSysctl, { _name: '', name: '', value: '' }),
      editSysctl: () => editSubItem(selectedSysctls, editingContainer.value?.sysctl || [], showSysctlModal, editingSysctl, 'name'),
      removeSysctl: () => removeSubItem(selectedSysctls, 'sysctl', 'name'),
      saveSysctl: () => saveSubItem(showSysctlModal, editingSysctl, 'sysctl', 'name', 'name'),
      editSysctlByRecord: (r) => editSubByRecord(r, editingSysctl, showSysctlModal),
      removeSysctlByRecord: (r) => removeSubByRecord(r, 'sysctl', 'name'),
      // Tmpfs
      createTmpfs: () => createSubItem(showTmpfsModal, editingTmpfs, { _name: '', name: '', destination: '', size: '' }),
      editTmpfs: () => editSubItem(selectedTmpfs, editingContainer.value?.tmpfs || [], showTmpfsModal, editingTmpfs, 'name'),
      removeTmpfs: () => removeSubItem(selectedTmpfs, 'tmpfs', 'name'),
      saveTmpfs: () => saveSubItem(showTmpfsModal, editingTmpfs, 'tmpfs', 'name', 'name'),
      editTmpfsByRecord: (r) => editSubByRecord(r, editingTmpfs, showTmpfsModal),
      removeTmpfsByRecord: (r) => removeSubByRecord(r, 'tmpfs', 'name'),
      // Device
      createDevice: () => createSubItem(showDeviceModal, editingDevice, { _name: '', name: '', source: '', destination: '' }),
      editDevice: () => editSubItem(selectedDevices, editingContainer.value?.device || [], showDeviceModal, editingDevice, 'name'),
      removeDevice: () => removeSubItem(selectedDevices, 'device', 'name'),
      saveDevice: () => saveSubItem(showDeviceModal, editingDevice, 'device', 'name', 'name'),
      editDeviceByRecord: (r) => editSubByRecord(r, editingDevice, showDeviceModal),
      removeDeviceByRecord: (r) => removeSubByRecord(r, 'device', 'name'),
      // Network
      createNetwork: () => createSubItem(showNetworkModal, editingNetwork, { _name: '', name: '', address: '', mac: 'auto' }),
      editNetwork: () => editSubItem(selectedNetworks, editingContainer.value?.network || [], showNetworkModal, editingNetwork, 'name'),
      removeNetwork: () => removeSubItem(selectedNetworks, 'network', 'name'),
      saveNetwork: () => saveSubItem(showNetworkModal, editingNetwork, 'network', 'name', 'name'),
      editNetworkByRecord: (r) => editSubByRecord(r, editingNetwork, showNetworkModal),
      removeNetworkByRecord: (r) => removeSubByRecord(r, 'network', 'name'),
      // Port
      createPort: () => createSubItem(showPortModal, editingPort, { _name: '', name: '', source: '', destination: '', listen_address: '', protocol: 'tcp' }),
      editPort: () => editSubItem(selectedPorts, editingContainer.value?.port || [], showPortModal, editingPort, 'name'),
      removePort: () => removeSubItem(selectedPorts, 'port', 'name'),
      savePort: () => saveSubItem(showPortModal, editingPort, 'port', 'name', 'name'),
      editPortByRecord: (r) => editSubByRecord(r, editingPort, showPortModal),
      removePortByRecord: (r) => removeSubByRecord(r, 'port', 'name'),
      // Volume
      createVolume: () => createSubItem(showVolumeModal, editingVolume, { _name: '', name: '', source: '', destination: '', mode: 'rw', propagation: 'rprivate' }),
      editVolume: () => editSubItem(selectedVolumes, editingContainer.value?.volume || [], showVolumeModal, editingVolume, 'name'),
      removeVolume: () => removeSubItem(selectedVolumes, 'volume', 'name'),
      saveVolume: () => saveSubItem(showVolumeModal, editingVolume, 'volume', 'name', 'name'),
      editVolumeByRecord: (r) => editSubByRecord(r, editingVolume, showVolumeModal),
      removeVolumeByRecord: (r) => removeSubByRecord(r, 'volume', 'name'),
    };
  },
  template: `
    <div class="page-container">
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createContainer">{{ t('container.buttons.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editContainer" :disabled="!selectedContainers.length || selectedContainers.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeContainer" :disabled="!selectedContainers.length">{{ t('container.buttons.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="columns" :data="containerList" rowKey="name" :externalToolbar="true" @selection-change="selectedContainers = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'disable'">
            <span>{{ record.disable ? t('container.yes') : t('container.no') }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editContainerByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
            <a @click="removeContainerByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <!-- Edit Modal -->
      <DraggableModal v-model:visible="showEditModal" :title="editingContainer && editingContainer._name ? t('container.modal.editContainer') + editingContainer._name : t('container.modal.createContainer')" @confirm="saveContainer" @close="showEditModal = false" width="900px">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.name" :disabled="editingContainer._name !== ''" :title="t('container.form.nameHelp')" /><div class="form-hint">{{ t('container.form.nameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.image') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.image" :title="t('container.form.imageHelp')" /><div class="form-hint">{{ t('container.form.imageHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.description') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.description" :title="t('container.form.descriptionHelp')" /><div class="form-hint">{{ t('container.form.descriptionHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.hostName') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.host_name" :title="t('container.form.hostNameHelp')" /><div class="form-hint">{{ t('container.form.hostNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.command') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.command" :title="t('container.form.commandHelp')" /><div class="form-hint">{{ t('container.form.commandHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.entrypoint') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.entrypoint" :title="t('container.form.entrypointHelp')" /><div class="form-hint">{{ t('container.form.entrypointHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.arguments') }}</label><div class="form-control"><textarea class="form-control" v-model="editingContainer.arguments" rows="3" :placeholder="t('container.form.argumentsPlaceholder')" :title="t('container.form.argumentsHelp')" /><div class="form-hint">{{ t('container.form.argumentsHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.cpuQuota') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.cpu_quota" :title="t('container.form.cpuQuotaHelp')" /><div class="form-hint">{{ t('container.form.cpuQuotaHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.memory') }}</label><div class="form-control"><input class="form-control" type="number" min="0" max="16384" v-model="editingContainer.memory" :title="t('container.form.memoryHelp')" /><div class="form-hint">{{ t('container.form.memoryHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.sharedMemory') }}</label><div class="form-control"><input class="form-control" type="number" min="0" max="8192" v-model="editingContainer.shared_memory" :title="t('container.form.sharedMemoryHelp')" /><div class="form-hint">{{ t('container.form.sharedMemoryHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">UID</label><div class="form-control"><input class="form-control" type="number" min="0" max="65535" v-model="editingContainer.uid" :title="t('container.form.uidHelp')" /><div class="form-hint">{{ t('container.form.uidHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">GID</label><div class="form-control"><input class="form-control" type="number" min="0" max="65535" v-model="editingContainer.gid" :title="t('container.form.gidHelp')" /><div class="form-hint">{{ t('container.form.gidHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.logDriver') }}</label>
          <div class="form-control">
            <select class="form-control" v-model="editingContainer.log_driver" :title="t('container.form.logDriverHelp')">
              <option v-for="driver in CONTAINER_LOG_DRIVER_OPTIONS" :key="driver" :value="driver">{{ driver }}</option>
            </select>
            <div class="form-hint">{{ t('container.form.logDriverHint') }}</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">{{ t('container.form.restartPolicy') }}</label>
          <div class="form-control">
            <select class="form-control" v-model="editingContainer.restart" :title="t('container.form.restartPolicyHelp')">
              <option value="no">{{ t('container.restart.no') }}</option>
              <option value="on-failure">{{ t('container.restart.onFailure') }}</option>
              <option value="always">{{ t('container.restart.always') }}</option>
            </select>
            <div class="form-hint">{{ t('container.form.restartPolicyHint') }}</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">{{ t('container.form.privileged') }}</label><div class="form-control"><input type="checkbox" v-model="editingContainer.privileged" :title="t('container.form.privilegedHelp')" /><div class="form-hint">{{ t('container.form.privilegedHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.allowHostNetworks') }}</label><div class="form-control"><input type="checkbox" v-model="editingContainer.allow_host_networks" :title="t('container.form.allowHostNetworksHelp')" /><div class="form-hint">{{ t('container.form.allowHostNetworksHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.allowHostPid') }}</label><div class="form-control"><input type="checkbox" v-model="editingContainer.allow_host_pid" :title="t('container.form.allowHostPidHelp')" /><div class="form-hint">{{ t('container.form.allowHostPidHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.disable') }}</label><div class="form-control"><input type="checkbox" v-model="editingContainer.disable" :title="t('container.form.disableHelp')" /><div class="form-hint">{{ t('container.form.disableHint') }}</div></div></div>

        <!-- Health Check -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.healthCheck') }}</div>
        <div class="form-row"><label class="form-label">{{ t('container.form.healthCheckCommand') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.health_check.command" :title="t('container.form.healthCheckCommandHelp')" /><div class="form-hint">{{ t('container.form.healthCheckCommandHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.interval') }}</label><div class="form-control"><input class="form-control" v-model="editingContainer.health_check.interval" :placeholder="t('container.form.intervalPlaceholder')" :title="t('container.form.intervalHelp')" /><div class="form-hint">{{ t('container.form.intervalHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.retryCount') }}</label><div class="form-control"><input class="form-control" type="number" min="0" max="255" v-model="editingContainer.health_check.retry" :title="t('container.form.retryCountHelp')" /><div class="form-hint">{{ t('container.form.retryCountHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.timeout') }}</label><div class="form-control"><input class="form-control" type="number" min="1" max="16384" v-model="editingContainer.health_check.timeout" :title="t('container.form.timeoutHelp')" /><div class="form-hint">{{ t('container.form.timeoutHint') }}</div></div></div>

        <!-- Capability -->
        <div style="font-weight:bold;margin:16px 0 8px;">Capabilities</div>
        <div class="form-row">
          <label class="form-label">{{ t('container.subColumns.capability') }}</label>
          <div class="form-control">
            <div :title="t('container.form.capabilityHelp')" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 10px;height:auto;padding:8px;">
              <label v-for="cap in CONTAINER_CAPABILITY_OPTIONS" :key="cap" style="display:flex;align-items:center;gap:6px;font-weight:normal;">
                <input type="checkbox" :value="cap" v-model="editingContainer.capability" />
                <span>{{ cap }}</span>
              </label>
            </div>
            <div class="form-hint" style="line-height:1.6;">{{ t('container.form.capabilityDetailHint') }}</div>
          </div>
        </div>

        <!-- Environment -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.environment') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createEnvironment">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editEnvironment" :disabled="!selectedEnvironments.length || selectedEnvironments.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeEnvironment" :disabled="!selectedEnvironments.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="environmentColumns" :data="editingContainer.environment" rowKey="name" :externalToolbar="true" @selection-change="selectedEnvironments = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editEnvironmentByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeEnvironmentByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Label -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.label') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createLabel">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editLabel" :disabled="!selectedLabels.length || selectedLabels.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeLabel" :disabled="!selectedLabels.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="labelColumns" :data="editingContainer.label" rowKey="name" :externalToolbar="true" @selection-change="selectedLabels = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editLabelByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeLabelByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Name Server -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.dnsServer') }}</div>
        <div class="form-row">
          <label class="form-label">{{ t('container.form.dnsServer') }}</label>
          <div class="form-control">
            <textarea
              class="form-control"
              v-model="editingContainer.name_server_text"
              rows="4"
              placeholder="x.x.x.x\n2001:db8::1"
              :title="t('container.form.dnsServerHelp')"
            />
            <div class="form-hint">{{ t('container.form.dnsServerHelp') }}</div>
          </div>
        </div>

        <!-- Sysctl -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.sysctl') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createSysctl">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editSysctl" :disabled="!selectedSysctls.length || selectedSysctls.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeSysctl" :disabled="!selectedSysctls.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="sysctlColumns" :data="editingContainer.sysctl" rowKey="name" :externalToolbar="true" @selection-change="selectedSysctls = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editSysctlByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeSysctlByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Tmpfs -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.tmpfs') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createTmpfs">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editTmpfs" :disabled="!selectedTmpfs.length || selectedTmpfs.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeTmpfs" :disabled="!selectedTmpfs.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="tmpfsColumns" :data="editingContainer.tmpfs" rowKey="name" :externalToolbar="true" @selection-change="selectedTmpfs = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editTmpfsByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeTmpfsByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Device -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.device') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createDevice">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editDevice" :disabled="!selectedDevices.length || selectedDevices.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeDevice" :disabled="!selectedDevices.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="deviceColumns" :data="editingContainer.device" rowKey="name" :externalToolbar="true" @selection-change="selectedDevices = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editDeviceByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeDeviceByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Network -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.network') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createNetwork">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editNetwork" :disabled="!selectedNetworks.length || selectedNetworks.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeNetwork" :disabled="!selectedNetworks.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="networkColumns" :data="editingContainer.network" rowKey="name" :externalToolbar="true" @selection-change="selectedNetworks = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editNetworkByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeNetworkByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Port -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.portMapping') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPort">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPort" :disabled="!selectedPorts.length || selectedPorts.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePort" :disabled="!selectedPorts.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="portColumns" :data="editingContainer.port" rowKey="name" :externalToolbar="true" @selection-change="selectedPorts = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editPortByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removePortByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>

        <!-- Volume -->
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('container.sections.volumeMount') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createVolume">{{ t('container.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editVolume" :disabled="!selectedVolumes.length || selectedVolumes.length > 1">{{ t('container.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeVolume" :disabled="!selectedVolumes.length">{{ t('container.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="volumeColumns" :data="editingContainer.volume" rowKey="name" :externalToolbar="true" @selection-change="selectedVolumes = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editVolumeByRecord(record)" style="margin-right:8px">{{ t('container.buttons.edit') }}</a>
              <a @click="removeVolumeByRecord(record)" style="color:#ff4d4f">{{ t('container.buttons.delete') }}</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <!-- Environment Modal -->
      <DraggableModal v-model:visible="showEnvironmentModal" :title="editingEnvironment && editingEnvironment._name ? t('container.modal.editEnvironment') : t('container.modal.addEnvironment')" @confirm="saveEnvironment" @close="showEnvironmentModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingEnvironment.name" :disabled="editingEnvironment._name !== ''" :title="t('container.form.environmentNameHelp')" /><div class="form-hint">{{ t('container.form.environmentNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.value') }}</label><div class="form-control"><input class="form-control" v-model="editingEnvironment.value" :title="t('container.form.environmentValueHelp')" /><div class="form-hint">{{ t('container.form.environmentValueHint') }}</div></div></div>
      </DraggableModal>

      <!-- Label Modal -->
      <DraggableModal v-model:visible="showLabelModal" :title="editingLabel && editingLabel._name ? t('container.modal.editLabel') : t('container.modal.addLabel')" @confirm="saveLabel" @close="showLabelModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingLabel.name" :disabled="editingLabel._name !== ''" :title="t('container.form.labelNameHelp')" /><div class="form-hint">{{ t('container.form.labelNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.value') }}</label><div class="form-control"><input class="form-control" v-model="editingLabel.value" :title="t('container.form.labelValueHelp')" /><div class="form-hint">{{ t('container.form.labelValueHint') }}</div></div></div>
      </DraggableModal>

      <!-- Sysctl Modal -->
      <DraggableModal v-model:visible="showSysctlModal" :title="editingSysctl && editingSysctl._name ? t('container.modal.editSysctl') : t('container.modal.addSysctl')" @confirm="saveSysctl" @close="showSysctlModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.parameterName') }}</label><div class="form-control"><input class="form-control" v-model="editingSysctl.name" :disabled="editingSysctl._name !== ''" :title="t('container.form.sysctlNameHelp')" /><div class="form-hint">{{ t('container.form.sysctlNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.value') }}</label><div class="form-control"><input class="form-control" v-model="editingSysctl.value" :title="t('container.form.sysctlValueHelp')" /><div class="form-hint">{{ t('container.form.sysctlValueHint') }}</div></div></div>
      </DraggableModal>

      <!-- Tmpfs Modal -->
      <DraggableModal v-model:visible="showTmpfsModal" :title="editingTmpfs && editingTmpfs._name ? t('container.modal.editTmpfs') : t('container.modal.addTmpfs')" @confirm="saveTmpfs" @close="showTmpfsModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingTmpfs.name" :disabled="editingTmpfs._name !== ''" :title="t('container.form.tmpfsNameHelp')" /><div class="form-hint">{{ t('container.form.tmpfsNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.destination') }}</label><div class="form-control"><input class="form-control" v-model="editingTmpfs.destination" :title="t('container.form.tmpfsDestinationHelp')" /><div class="form-hint">{{ t('container.form.tmpfsDestinationHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.size') }}</label><div class="form-control"><input class="form-control" type="number" min="1" max="65536" v-model="editingTmpfs.size" :title="t('container.form.tmpfsSizeHelp')" /><div class="form-hint">{{ t('container.form.tmpfsSizeHint') }}</div></div></div>
      </DraggableModal>

      <!-- Device Modal -->
      <DraggableModal v-model:visible="showDeviceModal" :title="editingDevice && editingDevice._name ? t('container.modal.editDevice') : t('container.modal.addDevice')" @confirm="saveDevice" @close="showDeviceModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingDevice.name" :disabled="editingDevice._name !== ''" :title="t('container.form.deviceNameHelp')" /><div class="form-hint">{{ t('container.form.deviceNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.sourceDevice') }}</label><div class="form-control"><input class="form-control" v-model="editingDevice.source" placeholder="/dev/x" :title="t('container.form.sourceDeviceHelp')" /><div class="form-hint">{{ t('container.form.sourceDeviceHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.destinationDevice') }}</label><div class="form-control"><input class="form-control" v-model="editingDevice.destination" placeholder="/dev/x" :title="t('container.form.destinationDeviceHelp')" /><div class="form-hint">{{ t('container.form.destinationDeviceHint') }}</div></div></div>
      </DraggableModal>

      <!-- Network Modal -->
      <DraggableModal v-model:visible="showNetworkModal" :title="editingNetwork && editingNetwork._name ? t('container.modal.editNetwork') : t('container.modal.addNetwork')" @confirm="saveNetwork" @close="showNetworkModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.networkName') }}</label><div class="form-control"><input class="form-control" v-model="editingNetwork.name" :disabled="editingNetwork._name !== ''" :title="t('container.form.networkNameHelp')" /><div class="form-hint">{{ t('container.form.networkNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.ipAddress') }}</label><div class="form-control"><input class="form-control" v-model="editingNetwork.address" :title="t('container.form.ipAddressHelp')" /><div class="form-hint">{{ t('container.form.ipAddressHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.macAddress') }}</label><div class="form-control"><input class="form-control" v-model="editingNetwork.mac" placeholder="auto / xx:xx:xx:xx:xx:xx" :title="t('container.form.macAddressHelp')" /><div class="form-hint">{{ t('container.form.macAddressHint') }}</div></div></div>
      </DraggableModal>

      <!-- Port Modal -->
      <DraggableModal v-model:visible="showPortModal" :title="editingPort && editingPort._name ? t('container.modal.editPort') : t('container.modal.addPort')" @confirm="savePort" @close="showPortModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingPort.name" :disabled="editingPort._name !== ''" :title="t('container.form.portNameHelp')" /><div class="form-hint">{{ t('container.form.portNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.sourcePort') }}</label><div class="form-control"><input class="form-control" v-model="editingPort.source" placeholder="1-65535 or start-end" :title="t('container.form.sourcePortHelp')" /><div class="form-hint">{{ t('container.form.sourcePortHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.destinationPort') }}</label><div class="form-control"><input class="form-control" v-model="editingPort.destination" placeholder="1-65535 or start-end" :title="t('container.form.destinationPortHelp')" /><div class="form-hint">{{ t('container.form.destinationPortHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.listenAddress') }}</label><div class="form-control"><input class="form-control" v-model="editingPort.listen_address" placeholder="x.x.x.x / h:h:h:h:h:h:h:h" :title="t('container.form.listenAddressHelp')" /><div class="form-hint">{{ t('container.form.listenAddressHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.protocol') }}</label>
          <div class="form-control">
            <select class="form-control" v-model="editingPort.protocol" :title="t('container.form.protocolHelp')">
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
            <div class="form-hint">{{ t('container.form.protocolHint') }}</div>
          </div>
        </div>
      </DraggableModal>

      <!-- Volume Modal -->
      <DraggableModal v-model:visible="showVolumeModal" :title="editingVolume && editingVolume._name ? t('container.modal.editVolume') : t('container.modal.addVolume')" @confirm="saveVolume" @close="showVolumeModal = false">
        <div class="form-row"><label class="form-label">{{ t('container.form.name') }}</label><div class="form-control"><input class="form-control" v-model="editingVolume.name" :disabled="editingVolume._name !== ''" :title="t('container.form.volumeNameHelp')" /><div class="form-hint">{{ t('container.form.volumeNameHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.source') }}</label><div class="form-control"><input class="form-control" v-model="editingVolume.source" :title="t('container.form.sourceVolumeHelp')" /><div class="form-hint">{{ t('container.form.sourceVolumeHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.destination') }}</label><div class="form-control"><input class="form-control" v-model="editingVolume.destination" :title="t('container.form.destinationMountHelp')" /><div class="form-hint">{{ t('container.form.destinationMountHint') }}</div></div></div>
        <div class="form-row"><label class="form-label">{{ t('container.form.mode') }}</label>
          <div class="form-control">
            <select class="form-control" v-model="editingVolume.mode" :title="t('container.form.modeHelp')">
              <option v-for="mode in CONTAINER_VOLUME_MODE_OPTIONS" :key="mode" :value="mode">{{ mode }}</option>
            </select>
            <div class="form-hint">{{ t('container.form.modeHint') }}</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">{{ t('container.form.propagation') }}</label>
          <div class="form-control">
            <select class="form-control" v-model="editingVolume.propagation" :title="t('container.form.propagationHelp')">
              <option v-for="item in CONTAINER_VOLUME_PROPAGATION_OPTIONS" :key="item" :value="item">{{ item }}</option>
            </select>
            <div class="form-hint">{{ t('container.form.propagationHint') }}</div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
