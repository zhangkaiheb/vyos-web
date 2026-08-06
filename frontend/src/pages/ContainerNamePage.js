import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
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
  name: 'ContainerNamePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const containerList = ref([]);
    const selectedContainers = ref([]);
    const showEditModal = ref(false);
    const editingContainer = ref(null);

    const columns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'image', title: '镜像', dataIndex: 'image', width: 200 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'disable', title: '禁用', dataIndex: 'disable', width: 60 },
      { key: 'restart', title: '重启策略', dataIndex: 'restart', width: 120 },
      { key: 'memory', title: '内存(MB)', dataIndex: 'memory', width: 100 },
      { key: 'cpu_quota', title: 'CPU配额', dataIndex: 'cpu_quota', width: 100 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Sub-table columns
    const capabilityColumns = [
      { key: 'capability', title: 'Capability', dataIndex: 'capability', width: 300 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const environmentColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'value', title: '值', dataIndex: 'value', width: 250 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const labelColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'value', title: '值', dataIndex: 'value', width: 250 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const nameServerColumns = [
      { key: 'server', title: 'DNS服务器', dataIndex: 'server', width: 300 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const sysctlColumns = [
      { key: 'name', title: '参数', dataIndex: 'name', width: 200 },
      { key: 'value', title: '值', dataIndex: 'value', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const tmpfsColumns = [
      { key: 'name', title: '路径', dataIndex: 'name', width: 200 },
      { key: 'size', title: '大小', dataIndex: 'size', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const deviceColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 120 },
      { key: 'source', title: '源设备', dataIndex: 'source', width: 200 },
      { key: 'destination', title: '目标设备', dataIndex: 'destination', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const networkColumns = [
      { key: 'name', title: '网络', dataIndex: 'name', width: 150 },
      { key: 'address', title: '地址', dataIndex: 'address', width: 200 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const portColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 120 },
      { key: 'source', title: '源端口', dataIndex: 'source', width: 100 },
      { key: 'destination', title: '目标端口', dataIndex: 'destination', width: 100 },
      { key: 'protocol', title: '协议', dataIndex: 'protocol', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const volumeColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 120 },
      { key: 'source', title: '源', dataIndex: 'source', width: 200 },
      { key: 'destination', title: '目标', dataIndex: 'destination', width: 200 },
      { key: 'readonly', title: '只读', dataIndex: 'readonly', width: 60 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    // Sub-item selection states
    const selectedCapabilities = ref([]);
    const selectedEnvironments = ref([]);
    const selectedLabels = ref([]);
    const selectedNameServers = ref([]);
    const selectedSysctls = ref([]);
    const selectedTmpfs = ref([]);
    const selectedDevices = ref([]);
    const selectedNetworks = ref([]);
    const selectedPorts = ref([]);
    const selectedVolumes = ref([]);

    // Sub-item modals
    const showCapabilityModal = ref(false);
    const editingCapability = ref(null);
    const showEnvironmentModal = ref(false);
    const editingEnvironment = ref(null);
    const showLabelModal = ref(false);
    const editingLabel = ref(null);
    const showNameServerModal = ref(false);
    const editingNameServer = ref(null);
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
        capability: toArray(data.capability),
        environment: Object.entries(env).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        label: Object.entries(label).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        name_server: toArray(data['name-server']),
        sysctl: Object.entries(sysctl).map(([k, v]) => ({ _name: k, name: k, value: v.value || '' })),
        tmpfs: Object.entries(tmpfs).map(([k, v]) => ({ _name: k, name: k, size: v.size || '' })),
        device: Object.entries(device).map(([k, v]) => ({ _name: k, name: k, source: v.source || '', destination: v.destination || '' })),
        network: Object.entries(network).map(([k, v]) => ({ _name: k, name: k, address: v.address || '' })),
        port: Object.entries(port).map(([k, v]) => ({ _name: k, name: k, source: v.source || '', destination: v.destination || '', protocol: v.protocol || 'tcp' })),
        volume: Object.entries(volume).map(([k, v]) => ({ _name: k, name: k, source: v.source || '', destination: v.destination || '', readonly: v.readonly !== undefined })),
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

      if (form.capability && form.capability.length) result.capability = form.capability;
      if (form.name_server && form.name_server.length) result['name-server'] = form.name_server;

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
          tmpfs[t.name] = isPresent(t.size) ? { size: String(t.size) } : {};
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
          if (v.readonly) obj.readonly = '';
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
      saved.value = false;
      try {
        const res = await configApi.get('container name', true);
        const data = res.data || {};
        containerList.value = Object.entries(data).map(([name, cfg]) => containerToForm(name, cfg));
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function saveConfig() {
      saving.value = true;
      try {
        await configApi.delete('container name');
        const payload = {};
        for (const c of containerList.value) {
          if (!c.name) continue;
          payload[c.name] = formToContainer(c);
        }
        if (Object.keys(payload).length) {
          await configApi.set('container name', payload);
        }
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
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
        name_server: [], sysctl: [], tmpfs: [], device: [], network: [], port: [], volume: [],
        health_check: { command: '', interval: '', retry: '0', timeout: '' },
      };
      showEditModal.value = true;
    }

    function editContainer() {
      if (!selectedContainers.value.length) return alert('请选择要编辑的容器');
      const row = containerList.value.find(c => c.name === selectedContainers.value[0]);
      if (!row) return alert('未找到选中的容器');
      editingContainer.value = JSON.parse(JSON.stringify(row));
      showEditModal.value = true;
    }

    function removeContainer() {
      if (!selectedContainers.value.length) return alert('请选择要删除的容器');
      containerList.value = containerList.value.filter(c => c.name !== selectedContainers.value[0]);
      selectedContainers.value = [];
    }

    function saveContainer() {
      if (!editingContainer.value.name) return alert('请输入容器名称');
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
      if (!selectedRef.value.length) return alert('请选择要编辑的项目');
      const row = list.find(item => item[keyField] === selectedRef.value[0]);
      if (!row) return alert('未找到选中的项目');
      editingRef.value = JSON.parse(JSON.stringify(row));
      modalRef.value = true;
    }

    function removeSubItem(selectedRef, listKey, keyField) {
      if (!selectedRef.value.length) return alert('请选择要删除的项目');
      editingContainer.value[listKey] = editingContainer.value[listKey].filter(item => item[keyField] !== selectedRef.value[0]);
      selectedRef.value = [];
    }

    function saveSubItem(modalRef, editingRef, listKey, keyField, validateField) {
      if (!editingRef.value[validateField]) return alert('请输入' + validateField);
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
    });

    return {
      loading, saving, saved, containerList, columns, commandPath,
      selectedContainers, showEditModal, editingContainer,
      capabilityColumns, environmentColumns, labelColumns, nameServerColumns,
      sysctlColumns, tmpfsColumns, deviceColumns, networkColumns, portColumns, volumeColumns,
      selectedCapabilities, selectedEnvironments, selectedLabels, selectedNameServers,
      selectedSysctls, selectedTmpfs, selectedDevices, selectedNetworks, selectedPorts, selectedVolumes,
      showCapabilityModal, editingCapability, showEnvironmentModal, editingEnvironment,
      showLabelModal, editingLabel, showNameServerModal, editingNameServer,
      showSysctlModal, editingSysctl, showTmpfsModal, editingTmpfs,
      showDeviceModal, editingDevice, showNetworkModal, editingNetwork,
      showPortModal, editingPort, showVolumeModal, editingVolume,
      load, saveConfig,
      createContainer, editContainer, removeContainer, saveContainer,
      editContainerByRecord, removeContainerByRecord,
      // Capability
      createCapability: () => createSubItem(showCapabilityModal, editingCapability, { _capability: '', capability: '' }),
      editCapability: () => editSubItem(selectedCapabilities, editingContainer.value?.capability || [], showCapabilityModal, editingCapability, 'capability'),
      removeCapability: () => removeSubItem(selectedCapabilities, 'capability', 'capability'),
      saveCapability: () => saveSubItem(showCapabilityModal, editingCapability, 'capability', 'capability', 'capability'),
      editCapabilityByRecord: (r) => editSubByRecord(r, editingCapability, showCapabilityModal),
      removeCapabilityByRecord: (r) => removeSubByRecord(r, 'capability', 'capability'),
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
      // NameServer
      createNameServer: () => createSubItem(showNameServerModal, editingNameServer, { _server: '', server: '' }),
      editNameServer: () => editSubItem(selectedNameServers, editingContainer.value?.name_server || [], showNameServerModal, editingNameServer, 'server'),
      removeNameServer: () => removeSubItem(selectedNameServers, 'name_server', 'server'),
      saveNameServer: () => saveSubItem(showNameServerModal, editingNameServer, 'name_server', 'server', 'server'),
      editNameServerByRecord: (r) => editSubByRecord(r, editingNameServer, showNameServerModal),
      removeNameServerByRecord: (r) => removeSubByRecord(r, 'name_server', 'server'),
      // Sysctl
      createSysctl: () => createSubItem(showSysctlModal, editingSysctl, { _name: '', name: '', value: '' }),
      editSysctl: () => editSubItem(selectedSysctls, editingContainer.value?.sysctl || [], showSysctlModal, editingSysctl, 'name'),
      removeSysctl: () => removeSubItem(selectedSysctls, 'sysctl', 'name'),
      saveSysctl: () => saveSubItem(showSysctlModal, editingSysctl, 'sysctl', 'name', 'name'),
      editSysctlByRecord: (r) => editSubByRecord(r, editingSysctl, showSysctlModal),
      removeSysctlByRecord: (r) => removeSubByRecord(r, 'sysctl', 'name'),
      // Tmpfs
      createTmpfs: () => createSubItem(showTmpfsModal, editingTmpfs, { _name: '', name: '', size: '' }),
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
      createNetwork: () => createSubItem(showNetworkModal, editingNetwork, { _name: '', name: '', address: '' }),
      editNetwork: () => editSubItem(selectedNetworks, editingContainer.value?.network || [], showNetworkModal, editingNetwork, 'name'),
      removeNetwork: () => removeSubItem(selectedNetworks, 'network', 'name'),
      saveNetwork: () => saveSubItem(showNetworkModal, editingNetwork, 'network', 'name', 'name'),
      editNetworkByRecord: (r) => editSubByRecord(r, editingNetwork, showNetworkModal),
      removeNetworkByRecord: (r) => removeSubByRecord(r, 'network', 'name'),
      // Port
      createPort: () => createSubItem(showPortModal, editingPort, { _name: '', name: '', source: '', destination: '', protocol: 'tcp' }),
      editPort: () => editSubItem(selectedPorts, editingContainer.value?.port || [], showPortModal, editingPort, 'name'),
      removePort: () => removeSubItem(selectedPorts, 'port', 'name'),
      savePort: () => saveSubItem(showPortModal, editingPort, 'port', 'name', 'name'),
      editPortByRecord: (r) => editSubByRecord(r, editingPort, showPortModal),
      removePortByRecord: (r) => removeSubByRecord(r, 'port', 'name'),
      // Volume
      createVolume: () => createSubItem(showVolumeModal, editingVolume, { _name: '', name: '', source: '', destination: '', readonly: false }),
      editVolume: () => editSubItem(selectedVolumes, editingContainer.value?.volume || [], showVolumeModal, editingVolume, 'name'),
      removeVolume: () => removeSubItem(selectedVolumes, 'volume', 'name'),
      saveVolume: () => saveSubItem(showVolumeModal, editingVolume, 'volume', 'name', 'name'),
      editVolumeByRecord: (r) => editSubByRecord(r, editingVolume, showVolumeModal),
      removeVolumeByRecord: (r) => removeSubByRecord(r, 'volume', 'name'),
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="toolbar">
        <ToolbarButton icon="create" @click="createContainer">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editContainer" :disabled="!selectedContainers.length || selectedContainers.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeContainer" :disabled="!selectedContainers.length">删除</ToolbarButton>
      </div>
      <DataTable :columns="columns" :data="containerList" rowKey="name" :externalToolbar="true" @selection-change="selectedContainers = $event" :selectable="true">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'disable'">
            <span>{{ record.disable ? '是' : '否' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editContainerByRecord(record)" style="margin-right:8px">编辑</a>
            <a @click="removeContainerByRecord(record)" style="color:#ff4d4f">删除</a>
          </template>
        </template>
      </DataTable>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="saveConfig" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <!-- Main Edit Modal -->
      <DraggableModal v-model:visible="showEditModal" :title="editingContainer && editingContainer._name ? '编辑容器: ' + editingContainer._name : '新建容器'" @confirm="saveContainer" @close="showEditModal = false" width="900px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingContainer.name" :disabled="editingContainer._name" title="容器实例名称" /></div>
        <div class="form-row"><label class="form-label">镜像</label><input class="form-control" v-model="editingContainer.image" title="容器镜像" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingContainer.description" title="描述" /></div>
        <div class="form-row"><label class="form-label">主机名</label><input class="form-control" v-model="editingContainer.host_name" title="容器主机名" /></div>
        <div class="form-row"><label class="form-label">命令</label><input class="form-control" v-model="editingContainer.command" title="覆盖默认 CMD" /></div>
        <div class="form-row"><label class="form-label">入口点</label><input class="form-control" v-model="editingContainer.entrypoint" title="覆盖默认 ENTRYPOINT" /></div>
        <div class="form-row"><label class="form-label">参数</label><textarea class="form-control" v-model="editingContainer.arguments" rows="3" placeholder="每行一个参数" title="命令参数" /></div>
        <div class="form-row"><label class="form-label">CPU 配额</label><input class="form-control" v-model="editingContainer.cpu_quota" title="CPU 时间配额，0=无限制" /></div>
        <div class="form-row"><label class="form-label">内存 (MB)</label><input class="form-control" type="number" min="4" v-model="editingContainer.memory" title="可用内存，默认 512MB" /></div>
        <div class="form-row"><label class="form-label">共享内存 (MB)</label><input class="form-control" type="number" min="1" v-model="editingContainer.shared_memory" title="共享内存，默认 64MB" /></div>
        <div class="form-row"><label class="form-label">UID</label><input class="form-control" type="number" min="0" max="65535" v-model="editingContainer.uid" title="运行用户 ID" /></div>
        <div class="form-row"><label class="form-label">GID</label><input class="form-control" type="number" min="0" max="65535" v-model="editingContainer.gid" title="运行组 ID" /></div>
        <div class="form-row"><label class="form-label">日志驱动</label><input class="form-control" v-model="editingContainer.log_driver" title="日志驱动，默认 journald" /></div>
        <div class="form-row"><label class="form-label">重启策略</label>
          <select class="form-control" v-model="editingContainer.restart" title="重启策略">
            <option value="no">不重启</option>
            <option value="on-failure">失败时重启</option>
            <option value="always">总是重启</option>
            <option value="unless-stopped">除非停止</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">特权模式</label><input type="checkbox" v-model="editingContainer.privileged" title="授予容器 root 权限" /></div>
        <div class="form-row"><label class="form-label">共享主机网络</label><input type="checkbox" v-model="editingContainer.allow_host_networks" title="允许共享主机网络" /></div>
        <div class="form-row"><label class="form-label">共享主机 PID</label><input type="checkbox" v-model="editingContainer.allow_host_pid" title="允许共享主机进程命名空间" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingContainer.disable" title="禁用此容器实例" /></div>

        <!-- Health Check -->
        <div style="font-weight:bold;margin:16px 0 8px;">健康检查</div>
        <div class="form-row"><label class="form-label">检查命令</label><input class="form-control" v-model="editingContainer.health_check.command" title="健康检查命令" /></div>
        <div class="form-row"><label class="form-label">间隔</label><input class="form-control" v-model="editingContainer.health_check.interval" placeholder="disable 或 1-16384 秒" title="检查间隔" /></div>
        <div class="form-row"><label class="form-label">重试次数</label><input class="form-control" type="number" min="0" max="255" v-model="editingContainer.health_check.retry" title="重试次数，0=不重试" /></div>
        <div class="form-row"><label class="form-label">超时 (秒)</label><input class="form-control" type="number" min="1" max="16384" v-model="editingContainer.health_check.timeout" title="检查超时时间" /></div>

        <!-- Capability -->
        <div style="font-weight:bold;margin:16px 0 8px;">Capabilities</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createCapability">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editCapability" :disabled="!selectedCapabilities.length || selectedCapabilities.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeCapability" :disabled="!selectedCapabilities.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="capabilityColumns" :data="editingContainer.capability" rowKey="capability" :externalToolbar="true" @selection-change="selectedCapabilities = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editCapabilityByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeCapabilityByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Environment -->
        <div style="font-weight:bold;margin:16px 0 8px;">环境变量</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createEnvironment">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editEnvironment" :disabled="!selectedEnvironments.length || selectedEnvironments.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeEnvironment" :disabled="!selectedEnvironments.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="environmentColumns" :data="editingContainer.environment" rowKey="name" :externalToolbar="true" @selection-change="selectedEnvironments = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editEnvironmentByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeEnvironmentByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Label -->
        <div style="font-weight:bold;margin:16px 0 8px;">标签</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createLabel">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editLabel" :disabled="!selectedLabels.length || selectedLabels.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeLabel" :disabled="!selectedLabels.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="labelColumns" :data="editingContainer.label" rowKey="name" :externalToolbar="true" @selection-change="selectedLabels = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editLabelByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeLabelByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Name Server -->
        <div style="font-weight:bold;margin:16px 0 8px;">DNS 服务器</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createNameServer">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editNameServer" :disabled="!selectedNameServers.length || selectedNameServers.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeNameServer" :disabled="!selectedNameServers.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="nameServerColumns" :data="editingContainer.name_server" rowKey="server" :externalToolbar="true" @selection-change="selectedNameServers = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editNameServerByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeNameServerByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Sysctl -->
        <div style="font-weight:bold;margin:16px 0 8px;">Sysctl 参数</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createSysctl">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editSysctl" :disabled="!selectedSysctls.length || selectedSysctls.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeSysctl" :disabled="!selectedSysctls.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="sysctlColumns" :data="editingContainer.sysctl" rowKey="name" :externalToolbar="true" @selection-change="selectedSysctls = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editSysctlByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeSysctlByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Tmpfs -->
        <div style="font-weight:bold;margin:16px 0 8px;">Tmpfs 挂载</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createTmpfs">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editTmpfs" :disabled="!selectedTmpfs.length || selectedTmpfs.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeTmpfs" :disabled="!selectedTmpfs.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="tmpfsColumns" :data="editingContainer.tmpfs" rowKey="name" :externalToolbar="true" @selection-change="selectedTmpfs = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editTmpfsByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeTmpfsByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Device -->
        <div style="font-weight:bold;margin:16px 0 8px;">设备</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createDevice">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editDevice" :disabled="!selectedDevices.length || selectedDevices.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeDevice" :disabled="!selectedDevices.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="deviceColumns" :data="editingContainer.device" rowKey="name" :externalToolbar="true" @selection-change="selectedDevices = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editDeviceByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeDeviceByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Network -->
        <div style="font-weight:bold;margin:16px 0 8px;">网络</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createNetwork">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editNetwork" :disabled="!selectedNetworks.length || selectedNetworks.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeNetwork" :disabled="!selectedNetworks.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="networkColumns" :data="editingContainer.network" rowKey="name" :externalToolbar="true" @selection-change="selectedNetworks = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editNetworkByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeNetworkByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Port -->
        <div style="font-weight:bold;margin:16px 0 8px;">端口映射</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPort">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPort" :disabled="!selectedPorts.length || selectedPorts.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePort" :disabled="!selectedPorts.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="portColumns" :data="editingContainer.port" rowKey="name" :externalToolbar="true" @selection-change="selectedPorts = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a @click="editPortByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removePortByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>

        <!-- Volume -->
        <div style="font-weight:bold;margin:16px 0 8px;">卷挂载</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createVolume">添加</ToolbarButton>
          <ToolbarButton icon="edit" @click="editVolume" :disabled="!selectedVolumes.length || selectedVolumes.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeVolume" :disabled="!selectedVolumes.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="volumeColumns" :data="editingContainer.volume" rowKey="name" :externalToolbar="true" @selection-change="selectedVolumes = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'readonly'">
              <span>{{ record.readonly ? '是' : '否' }}</span>
            </template>
            <template v-if="column.key === 'actions'">
              <a @click="editVolumeByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeVolumeByRecord(record)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <!-- Capability Modal -->
      <DraggableModal v-model:visible="showCapabilityModal" :title="editingCapability && editingCapability._capability ? '编辑 Capability' : '添加 Capability'" @confirm="saveCapability" @close="showCapabilityModal = false">
        <div class="form-row"><label class="form-label">Capability</label><input class="form-control" v-model="editingCapability.capability" :disabled="editingCapability._capability" title="Linux capability" /></div>
      </DraggableModal>

      <!-- Environment Modal -->
      <DraggableModal v-model:visible="showEnvironmentModal" :title="editingEnvironment && editingEnvironment._name ? '编辑环境变量' : '添加环境变量'" @confirm="saveEnvironment" @close="showEnvironmentModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingEnvironment.name" :disabled="editingEnvironment._name" title="环境变量名称" /></div>
        <div class="form-row"><label class="form-label">值</label><input class="form-control" v-model="editingEnvironment.value" title="环境变量值" /></div>
      </DraggableModal>

      <!-- Label Modal -->
      <DraggableModal v-model:visible="showLabelModal" :title="editingLabel && editingLabel._name ? '编辑标签' : '添加标签'" @confirm="saveLabel" @close="showLabelModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingLabel.name" :disabled="editingLabel._name" title="标签名称" /></div>
        <div class="form-row"><label class="form-label">值</label><input class="form-control" v-model="editingLabel.value" title="标签值" /></div>
      </DraggableModal>

      <!-- NameServer Modal -->
      <DraggableModal v-model:visible="showNameServerModal" :title="editingNameServer && editingNameServer._server ? '编辑 DNS 服务器' : '添加 DNS 服务器'" @confirm="saveNameServer" @close="showNameServerModal = false">
        <div class="form-row"><label class="form-label">DNS 服务器</label><input class="form-control" v-model="editingNameServer.server" :disabled="editingNameServer._server" placeholder="x.x.x.x" title="DNS 服务器地址" /></div>
      </DraggableModal>

      <!-- Sysctl Modal -->
      <DraggableModal v-model:visible="showSysctlModal" :title="editingSysctl && editingSysctl._name ? '编辑 Sysctl' : '添加 Sysctl'" @confirm="saveSysctl" @close="showSysctlModal = false">
        <div class="form-row"><label class="form-label">参数名</label><input class="form-control" v-model="editingSysctl.name" :disabled="editingSysctl._name" title="Sysctl 参数名" /></div>
        <div class="form-row"><label class="form-label">值</label><input class="form-control" v-model="editingSysctl.value" title="Sysctl 参数值" /></div>
      </DraggableModal>

      <!-- Tmpfs Modal -->
      <DraggableModal v-model:visible="showTmpfsModal" :title="editingTmpfs && editingTmpfs._name ? '编辑 Tmpfs' : '添加 Tmpfs'" @confirm="saveTmpfs" @close="showTmpfsModal = false">
        <div class="form-row"><label class="form-label">路径</label><input class="form-control" v-model="editingTmpfs.name" :disabled="editingTmpfs._name" title="挂载路径" /></div>
        <div class="form-row"><label class="form-label">大小</label><input class="form-control" v-model="editingTmpfs.size" title="Tmpfs 大小" /></div>
      </DraggableModal>

      <!-- Device Modal -->
      <DraggableModal v-model:visible="showDeviceModal" :title="editingDevice && editingDevice._name ? '编辑设备' : '添加设备'" @confirm="saveDevice" @close="showDeviceModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingDevice.name" :disabled="editingDevice._name" title="设备名称" /></div>
        <div class="form-row"><label class="form-label">源设备</label><input class="form-control" v-model="editingDevice.source" placeholder="/dev/x" title="源设备路径" /></div>
        <div class="form-row"><label class="form-label">目标设备</label><input class="form-control" v-model="editingDevice.destination" placeholder="/dev/x" title="目标设备路径" /></div>
      </DraggableModal>

      <!-- Network Modal -->
      <DraggableModal v-model:visible="showNetworkModal" :title="editingNetwork && editingNetwork._name ? '编辑网络' : '添加网络'" @confirm="saveNetwork" @close="showNetworkModal = false">
        <div class="form-row"><label class="form-label">网络名称</label><input class="form-control" v-model="editingNetwork.name" :disabled="editingNetwork._name" title="用户定义网络名称" /></div>
        <div class="form-row"><label class="form-label">IP 地址</label><input class="form-control" v-model="editingNetwork.address" title="IP 地址" /></div>
      </DraggableModal>

      <!-- Port Modal -->
      <DraggableModal v-model:visible="showPortModal" :title="editingPort && editingPort._name ? '编辑端口映射' : '添加端口映射'" @confirm="savePort" @close="showPortModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingPort.name" :disabled="editingPort._name" title="端口映射名称" /></div>
        <div class="form-row"><label class="form-label">源端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingPort.source" title="源端口" /></div>
        <div class="form-row"><label class="form-label">目标端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingPort.destination" title="目标端口" /></div>
        <div class="form-row"><label class="form-label">协议</label>
          <select class="form-control" v-model="editingPort.protocol" title="协议">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
        </div>
      </DraggableModal>

      <!-- Volume Modal -->
      <DraggableModal v-model:visible="showVolumeModal" :title="editingVolume && editingVolume._name ? '编辑卷挂载' : '添加卷挂载'" @confirm="saveVolume" @close="showVolumeModal = false">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingVolume.name" :disabled="editingVolume._name" title="卷名称" /></div>
        <div class="form-row"><label class="form-label">源</label><input class="form-control" v-model="editingVolume.source" title="源卷路径" /></div>
        <div class="form-row"><label class="form-label">目标</label><input class="form-control" v-model="editingVolume.destination" title="容器内挂载点" /></div>
        <div class="form-row"><label class="form-label">只读</label><input type="checkbox" v-model="editingVolume.readonly" title="以只读方式挂载" /></div>
      </DraggableModal>
    </div>
  `,
});
