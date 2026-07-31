import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const ALGORITHM_OPTIONS = [
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'weighted-round-robin', label: 'Weighted Round Robin' },
  { value: 'least-connection', label: 'Least Connection' },
  { value: 'weighted-least-connection', label: 'Weighted Least Connection' },
  { value: 'source-hashing', label: 'Source Hashing' },
  { value: 'destination-hashing', label: 'Destination Hashing' },
  { value: 'locality-based-least-connection', label: 'Locality-Based Least Connection' },
];

const FORWARD_METHOD_OPTIONS = [
  { value: 'direct', label: 'Direct Routing' },
  { value: 'nat', label: 'NAT' },
  { value: 'tunnel', label: 'Tunneling' },
];

const PROTOCOL_OPTIONS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
];

const AUTH_TYPE_OPTIONS = [
  { value: 'pass', label: 'Simple Password' },
  { value: 'ah', label: 'AH (Authentication Header)' },
];

const VRRP_VERSION_OPTIONS = [
  { value: '2', label: 'VRRPv2' },
  { value: '3', label: 'VRRPv3' },
];

const TABS = [
  { key: 'virtual-server', title: '虚拟服务器' },
  { key: 'vrrp-group', title: 'VRRP 组' },
  { key: 'vrrp-sync', title: 'VRRP 同步组' },
  { key: 'vrrp-global', title: 'VRRP 全局参数' },
];

export default defineComponent({
  name: 'HighAvailabilityPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const virtualServers = ref([]);
    const vrrpGroups = ref([]);
    const vrrpSyncGroups = ref([]);
    const vrrpGlobal = ref({});
    const loading = ref(false);
    const selectedVS = ref([]);
    const selectedVRRPGroup = ref([]);
    const selectedSyncGroup = ref([]);

    // Virtual Server modal
    const vsModalVisible = ref(false);
    const editingVS = ref(null);
    const editingOriginalVS = ref('');

    // VRRP Group modal
    const vrrpModalVisible = ref(false);
    const editingVRRP = ref(null);
    const editingOriginalVRRP = ref('');

    // Sync Group modal
    const syncModalVisible = ref(false);
    const editingSync = ref(null);
    const editingOriginalSync = ref('');

    // Real Server modal
    const rsModalVisible = ref(false);
    const editingRS = ref(null);
    const editingOriginalRS = ref('');
    const selectedRS = ref([]);

    const path = computed(() => 'high-availability');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const activeTab = ref('virtual-server');

    const vsColumns = [
      { key: 'name', title: '名称' },
      { key: 'address', title: '虚拟地址' },
      { key: 'port', title: '端口' },
      { key: 'protocol', title: '协议' },
      { key: 'algorithm', title: '算法' },
      { key: 'realServerCount', title: '真实服务器数' },
    ];

    const vrrpGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'vrid', title: 'VRID' },
      { key: 'interface', title: '接口' },
      { key: 'priority', title: '优先级' },
      { key: 'addressCount', title: '虚拟地址数' },
    ];

    const syncGroupColumns = [
      { key: 'name', title: '名称' },
      { key: 'memberCount', title: '成员数' },
    ];

    const vsSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: vs01' },
      { key: 'address', title: '虚拟地址', type: 'text', required: true, placeholder: '1.1.1.1 或 h:h:h:h:h:h:h:h' },
      { key: 'port', title: '端口', type: 'number', min: 0, max: 65535, placeholder: '0-65535' },
      { key: 'protocol', title: '协议', type: 'select', options: PROTOCOL_OPTIONS, defaultValue: 'tcp' },
      { key: 'algorithm', title: '调度算法', type: 'select', options: ALGORITHM_OPTIONS, defaultValue: 'least-connection', help: '默认: least-connection' },
      { key: 'forwardMethod', title: '转发方法', type: 'select', options: FORWARD_METHOD_OPTIONS, defaultValue: 'nat', help: '默认: nat' },
      { key: 'delayLoop', title: '健康检查间隔', type: 'number', min: 1, max: 600, placeholder: '1-600 秒', defaultValue: 10, help: '默认: 10 秒' },
      { key: 'persistenceTimeout', title: '持久连接超时', type: 'number', min: 1, max: 86400, placeholder: '1-86400 秒', defaultValue: 300, help: '默认: 300 秒' },
      { key: 'fwmark', title: '防火墙标记', type: 'number', min: 1, max: 2147483647, placeholder: '1-2147483647' },
    ]);

    const vrrpGroupSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: vg01' },
      { key: 'vrid', title: 'VRID', type: 'number', min: 1, max: 255, required: true, placeholder: '1-255' },
      { key: 'interface', title: '接口', type: 'text', required: true, placeholder: '例如: eth0' },
      { key: 'priority', title: '优先级', type: 'number', min: 1, max: 255, defaultValue: 100, help: '默认: 100, 范围 1-255' },
      { key: 'advertiseInterval', title: '通告间隔', type: 'number', min: 1, max: 255, defaultValue: 1, help: '默认: 1 秒' },
      { key: 'preemptDelay', title: '抢占延迟', type: 'number', min: 0, max: 1000, defaultValue: 0, help: '默认: 0 秒, 范围 0-1000' },
      { key: 'helloSourceAddress', title: 'Hello 源地址', type: 'text', placeholder: 'IPv4/IPv6 地址' },
      { key: 'peerAddress', title: '单播 Peer 地址', type: 'text', placeholder: 'IPv4/IPv6 地址' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'disable', title: '禁用', type: 'checkbox' },
      { key: 'noPreempt', title: '禁用抢占', type: 'checkbox' },
      { key: 'rfc3768Compatibility', title: 'RFC3768 兼容', type: 'checkbox', help: '使用 VRRP 虚拟 MAC 地址' },
      { key: 'authType', title: '认证类型', type: 'select', options: AUTH_TYPE_OPTIONS, help: 'plaintext-password 或 ah' },
      { key: 'authPassword', title: '认证密码', type: 'text', placeholder: '最多 8 个字符' },
      { key: 'garpInterval', title: 'GARP 间隔', type: 'number', min: 0, max: 1000, defaultValue: 0, help: '默认: 0 秒, 范围 0-1000 (微秒精度)' },
      { key: 'garpMasterDelay', title: 'GARP Master 延迟', type: 'number', min: 1, max: 1000, defaultValue: 5, help: '默认: 5 秒, 范围 1-1000' },
      { key: 'garpMasterRefresh', title: 'GARP Master 刷新', type: 'number', min: 0, max: 255, defaultValue: 5, help: '默认: 5 秒, 0=不刷新, 范围 0 或 1-255' },
      { key: 'garpMasterRefreshRepeat', title: 'GARP Master 刷新重复', type: 'number', min: 1, max: 255, defaultValue: 1, help: '默认: 1, 范围 1-255' },
      { key: 'garpMasterRepeat', title: 'GARP Master 重复', type: 'number', min: 1, max: 255, defaultValue: 5, help: '默认: 5, 范围 1-255' },
      { key: 'healthCheckFailureCount', title: '健康检查失败次数', type: 'text', defaultValue: '3', help: '默认: 3' },
      { key: 'healthCheckInterval', title: '健康检查间隔', type: 'text', defaultValue: '60', help: '默认: 60 秒' },
      { key: 'healthCheckPing', title: '健康检查 Ping 目标', type: 'text', placeholder: 'IPv4/IPv6 地址' },
      { key: 'healthCheckScript', title: '健康检查脚本', type: 'text', placeholder: '脚本文件路径' },
      { key: 'trackExcludeInterface', title: '排除接口跟踪', type: 'checkbox', help: '禁用主接口状态跟踪' },
      { key: 'transitionScriptBackup', title: 'Backup 转换脚本', type: 'text', placeholder: '脚本路径' },
      { key: 'transitionScriptFault', title: 'Fault 转换脚本', type: 'text', placeholder: '脚本路径' },
      { key: 'transitionScriptMaster', title: 'Master 转换脚本', type: 'text', placeholder: '脚本路径' },
      { key: 'transitionScriptStop', title: 'Stop 转换脚本', type: 'text', placeholder: '脚本路径' },
    ]);

    const syncGroupSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: sg01' },
      { key: 'members', title: '成员 (逗号分隔)', type: 'text', required: true, placeholder: 'vg01,vg02' },
    ]);

    const vrrpGlobalSchema = computed(() => [
      { key: 'startupDelay', title: '启动延迟', type: 'number', min: 1, max: 600, placeholder: '1-600 秒', help: '范围 1-600 秒' },
      { key: 'version', title: 'VRRP 版本', type: 'select', options: VRRP_VERSION_OPTIONS, defaultValue: '2', help: 'IPv6 始终使用 VRRPv3' },
      { key: 'garpInterval', title: 'GARP 间隔', type: 'number', min: 0, max: 1000, defaultValue: 0, help: '默认: 0, 范围 0-1000 秒 (微秒精度)' },
      { key: 'garpMasterDelay', title: 'GARP Master 延迟', type: 'number', min: 1, max: 1000, defaultValue: 5, help: '默认: 5, 范围 1-1000 秒' },
      { key: 'garpMasterRefresh', title: 'GARP Master 刷新', type: 'number', min: 0, max: 255, defaultValue: 5, help: '默认: 5, 0=不刷新, 范围 0 或 1-255' },
      { key: 'garpMasterRefreshRepeat', title: 'GARP Master 刷新重复', type: 'number', min: 1, max: 255, defaultValue: 1, help: '默认: 1, 范围 1-255' },
      { key: 'garpMasterRepeat', title: 'GARP Master 重复', type: 'number', min: 1, max: 255, defaultValue: 5, help: '默认: 5, 范围 1-255' },
    ]);

    const rsColumns = [
      { key: 'name', title: '名称' },
      { key: 'port', title: '端口' },
      { key: 'connectionTimeout', title: '连接超时' },
      { key: 'healthCheckScript', title: '健康检查脚本' },
    ];

    const rsSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: rs01' },
      { key: 'port', title: '端口', type: 'number', min: 0, max: 65535, placeholder: '0-65535' },
      { key: 'connectionTimeout', title: '连接超时', type: 'number', min: 1, max: 86400, placeholder: '1-86400 秒', help: '默认: 300 秒' },
      { key: 'healthCheckScript', title: '健康检查脚本', type: 'text', placeholder: '脚本文件路径' },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, false);
        const raw = res.data || {};
        
        // Parse virtual-server
        const vsData = raw['virtual-server'] || {};
        const vsResult = [];
        for (const [name, attrs] of Object.entries(vsData)) {
          const realServers = attrs['real-server'] || {};
          vsResult.push({
            id: name,
            name,
            address: attrs.address || '',
            port: attrs.port || '',
            protocol: attrs.protocol || 'tcp',
            algorithm: attrs.algorithm || 'least-connection',
            forwardMethod: attrs['forward-method'] || 'nat',
            delayLoop: attrs['delay-loop'] || 10,
            persistenceTimeout: attrs['persistence-timeout'] || 300,
            fwmark: attrs.fwmark || '',
            realServerCount: Object.keys(realServers).length,
            _raw: attrs,
          });
        }
        vsResult.sort((a, b) => a.name.localeCompare(b.name));
        virtualServers.value = vsResult;

        // Parse VRRP
        const vrrpData = raw.vrrp || {};
        
        // Parse VRRP groups
        const groupData = vrrpData.group || {};
        const groupResult = [];
        for (const [name, attrs] of Object.entries(groupData)) {
          const addresses = attrs.address || {};
          groupResult.push({
            id: name,
            name,
            vrid: attrs.vrid || '',
            interface: attrs.interface || '',
            priority: attrs.priority || 100,
            advertiseInterval: attrs['advertise-interval'] || 1,
            preemptDelay: attrs['preempt-delay'] || 0,
            helloSourceAddress: attrs['hello-source-address'] || '',
            description: attrs.description || '',
            disable: !!attrs.disable,
            noPreempt: !!attrs['no-preempt'],
            rfc3768Compatibility: !!attrs['rfc3768-compatibility'],
            addressCount: Object.keys(addresses).length,
            _raw: attrs,
          });
        }
        groupResult.sort((a, b) => a.name.localeCompare(b.name));
        vrrpGroups.value = groupResult;

        // Parse sync groups
        const syncData = vrrpData['sync-group'] || {};
        const syncResult = [];
        for (const [name, attrs] of Object.entries(syncData)) {
          const members = attrs.member || [];
          syncResult.push({
            id: name,
            name,
            memberCount: Array.isArray(members) ? members.length : Object.keys(members).length,
            _raw: attrs,
          });
        }
        syncResult.sort((a, b) => a.name.localeCompare(b.name));
        vrrpSyncGroups.value = syncResult;

        // Parse global parameters
        const globalData = vrrpData['global-parameters'] || {};
        const garpData = globalData.garp || {};
        vrrpGlobal.value = {
          startupDelay: globalData['startup-delay'] || '',
          version: globalData.version || '2',
          garpInterval: garpData.interval || 0,
          garpMasterDelay: garpData['master-delay'] || 5,
          garpMasterRefresh: garpData['master-refresh'] || 5,
          garpMasterRefreshRepeat: garpData['master-refresh-repeat'] || 1,
          garpMasterRepeat: garpData['master-repeat'] || 5,
        };

        if (selectedVS.value.length && !vsResult.some(n => n.name === selectedVS.value[0])) {
          selectedVS.value = [];
        }
        if (selectedVRRPGroup.value.length && !groupResult.some(n => n.name === selectedVRRPGroup.value[0])) {
          selectedVRRPGroup.value = [];
        }
        if (selectedSyncGroup.value.length && !syncResult.some(n => n.name === selectedSyncGroup.value[0])) {
          selectedSyncGroup.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    watch(() => route.path, () => {
      selectedVS.value = [];
      selectedVRRPGroup.value = [];
      selectedSyncGroup.value = [];
      load();
    });

    // Virtual Server functions
    function emptyVS() {
      return {
        name: '', address: '', port: '', protocol: 'tcp',
        algorithm: 'least-connection', forwardMethod: 'nat',
        delayLoop: 10, persistenceTimeout: 300, fwmark: '',
        realServers: [],
      };
    }

    function flattenVSData(name, attrs) {
      const realServers = attrs['real-server'] || {};
      const realServerList = [];
      for (const [rsName, rsAttrs] of Object.entries(realServers)) {
        const healthCheck = rsAttrs['health-check'] || {};
        realServerList.push({
          name: rsName,
          port: rsAttrs.port || '',
          connectionTimeout: rsAttrs['connection-timeout'] || '',
          healthCheckScript: healthCheck.script || '',
        });
      }
      return {
        name,
        address: attrs.address || '',
        port: attrs.port || '',
        protocol: attrs.protocol || 'tcp',
        algorithm: attrs.algorithm || 'least-connection',
        forwardMethod: attrs['forward-method'] || 'nat',
        delayLoop: attrs['delay-loop'] || 10,
        persistenceTimeout: attrs['persistence-timeout'] || 300,
        fwmark: attrs.fwmark || '',
        realServers: realServerList,
      };
    }

    function unflattenVSData(vs) {
      const result = {};
      if (vs.address) result.address = vs.address;
      if (vs.port) result.port = vs.port;
      if (vs.protocol) result.protocol = vs.protocol;
      if (vs.algorithm) result.algorithm = vs.algorithm;
      if (vs.forwardMethod) result['forward-method'] = vs.forwardMethod;
      if (vs.delayLoop) result['delay-loop'] = vs.delayLoop;
      if (vs.persistenceTimeout) result['persistence-timeout'] = vs.persistenceTimeout;
      if (vs.fwmark) result.fwmark = vs.fwmark;

      if (vs.realServers?.length) {
        const realServers = {};
        for (const rs of vs.realServers) {
          if (rs.name) {
            realServers[rs.name] = {};
            if (rs.port) realServers[rs.name].port = rs.port;
            if (rs.connectionTimeout) realServers[rs.name]['connection-timeout'] = rs.connectionTimeout;
            if (rs.healthCheckScript) {
              realServers[rs.name]['health-check'] = { script: rs.healthCheckScript };
            }
          }
        }
        result['real-server'] = realServers;
      }
      return result;
    }

    function createVS() {
      editingVS.value = emptyVS();
      editingOriginalVS.value = '';
      vsModalVisible.value = true;
    }

    function editVS() {
      if (!selectedVS.value.length) return showError({ message: '请选择一个虚拟服务器' });
      if (selectedVS.value.length > 1) return showError({ message: '请选择一个虚拟服务器' });
      const vs = virtualServers.value.find(n => n.name === selectedVS.value[0]);
      if (!vs) return;
      editingVS.value = flattenVSData(vs.name, vs._raw || {});
      editingOriginalVS.value = vs.name;
      vsModalVisible.value = true;
    }

    async function removeVS() {
      if (!selectedVS.value.length) return showError({ message: '请选择一个虚拟服务器' });
      if (!confirm('确认删除选中的虚拟服务器？')) return;
      for (const name of selectedVS.value) {
        await configStore.deleteConfig(`${path.value} virtual-server ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedVS.value = [];
      await load();
    }

    async function saveVS() {
      if (!editingVS.value.name) return showError({ message: '请输入名称' });
      if (!editingVS.value.address) return showError({ message: '请输入虚拟地址' });
      const original = editingOriginalVS.value;
      if (!original && virtualServers.value.some(n => n.name === editingVS.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = unflattenVSData(editingVS.value);
      try {
        if (original && original !== editingVS.value.name) {
          await configStore.deleteConfig(`${path.value} virtual-server ${original}`);
          await configStore.setConfig(`${path.value} virtual-server ${editingVS.value.name}`, value);
        } else {
          await configStore.setConfig(`${path.value} virtual-server ${editingVS.value.name}`, value);
        }
        vsModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // Real Server functions
    function addRealServer() {
      if (!editingVS.value) return;
      editingRS.value = { name: '', port: '', connectionTimeout: '', healthCheckScript: '' };
      editingOriginalRS.value = '';
      rsModalVisible.value = true;
    }

    function editRealServer() {
      if (!selectedRS.value.length) return showError({ message: '请选择一个真实服务器' });
      if (selectedRS.value.length > 1) return showError({ message: '请选择一个真实服务器' });
      const rs = editingVS.value.realServers.find(r => r.name === selectedRS.value[0]);
      if (!rs) return;
      editingRS.value = { ...rs };
      editingOriginalRS.value = rs.name;
      rsModalVisible.value = true;
    }

    function removeRealServer() {
      if (!selectedRS.value.length) return showError({ message: '请选择一个真实服务器' });
      if (!confirm('确认删除选中的真实服务器？')) return;
      editingVS.value.realServers = editingVS.value.realServers.filter(r => !selectedRS.value.includes(r.name));
      selectedRS.value = [];
    }

    function saveRS() {
      if (!editingRS.value.name) return showError({ message: '请输入名称' });
      const original = editingOriginalRS.value;
      if (!original && editingVS.value.realServers.some(r => r.name === editingRS.value.name)) {
        return showError({ message: '名称已存在' });
      }
      if (original && original !== editingRS.value.name) {
        const idx = editingVS.value.realServers.findIndex(r => r.name === original);
        if (idx >= 0) editingVS.value.realServers[idx] = { ...editingRS.value };
      } else if (original) {
        const idx = editingVS.value.realServers.findIndex(r => r.name === original);
        if (idx >= 0) editingVS.value.realServers[idx] = { ...editingRS.value };
      } else {
        editingVS.value.realServers.push({ ...editingRS.value });
      }
      rsModalVisible.value = false;
      selectedRS.value = [];
    }

    // VRRP Group functions
    function emptyVRRPGroup() {
      return {
        name: '', vrid: '', interface: '', priority: 100,
        advertiseInterval: 1, preemptDelay: 0,
        helloSourceAddress: '', peerAddress: '', description: '',
        disable: false, noPreempt: false, rfc3768Compatibility: false,
        authType: '', authPassword: '',
        garpInterval: 0, garpMasterDelay: 5, garpMasterRefresh: 5,
        garpMasterRefreshRepeat: 1, garpMasterRepeat: 5,
        healthCheckFailureCount: '3', healthCheckInterval: '60',
        healthCheckPing: '', healthCheckScript: '',
        trackExcludeInterface: false,
        transitionScriptBackup: '', transitionScriptFault: '',
        transitionScriptMaster: '', transitionScriptStop: '',
        addresses: [],
      };
    }

    function flattenVRRPGroupData(name, attrs) {
      const addresses = attrs.address || {};
      const addressList = Object.keys(addresses);
      const auth = attrs.authentication || {};
      const garp = attrs.garp || {};
      const healthCheck = attrs['health-check'] || {};
      const track = attrs.track || {};
      const transitionScript = attrs['transition-script'] || {};
      
      return {
        name,
        vrid: attrs.vrid || '',
        interface: attrs.interface || '',
        priority: attrs.priority || 100,
        advertiseInterval: attrs['advertise-interval'] || 1,
        preemptDelay: attrs['preempt-delay'] || 0,
        helloSourceAddress: attrs['hello-source-address'] || '',
        peerAddress: attrs['peer-address'] || '',
        description: attrs.description || '',
        disable: !!attrs.disable,
        noPreempt: !!attrs['no-preempt'],
        rfc3768Compatibility: !!attrs['rfc3768-compatibility'],
        authType: auth.type || '',
        authPassword: auth.password || '',
        garpInterval: garp.interval || 0,
        garpMasterDelay: garp['master-delay'] || 5,
        garpMasterRefresh: garp['master-refresh'] || 5,
        garpMasterRefreshRepeat: garp['master-refresh-repeat'] || 1,
        garpMasterRepeat: garp['master-repeat'] || 5,
        healthCheckFailureCount: healthCheck['failure-count'] || '3',
        healthCheckInterval: healthCheck.interval || '60',
        healthCheckPing: healthCheck.ping || '',
        healthCheckScript: healthCheck.script || '',
        trackExcludeInterface: !!track['exclude-vrrp-interface'],
        transitionScriptBackup: transitionScript.backup || '',
        transitionScriptFault: transitionScript.fault || '',
        transitionScriptMaster: transitionScript.master || '',
        transitionScriptStop: transitionScript.stop || '',
        addresses: addressList,
        _raw: attrs,
      };
    }

    function unflattenVRRPGroupData(v) {
      const result = {};
      if (v.vrid) result.vrid = v.vrid;
      if (v.interface) result.interface = v.interface;
      if (v.priority) result.priority = v.priority;
      if (v.advertiseInterval) result['advertise-interval'] = v.advertiseInterval;
      if (v.preemptDelay) result['preempt-delay'] = v.preemptDelay;
      if (v.helloSourceAddress) result['hello-source-address'] = v.helloSourceAddress;
      if (v.peerAddress) result['peer-address'] = v.peerAddress;
      if (v.description) result.description = v.description;
      if (v.disable) result.disable = {};
      if (v.noPreempt) result['no-preempt'] = {};
      if (v.rfc3768Compatibility) result['rfc3768-compatibility'] = {};

      // Authentication
      if (v.authType || v.authPassword) {
        result.authentication = {};
        if (v.authType) result.authentication.type = v.authType;
        if (v.authPassword) result.authentication.password = v.authPassword;
      }

      // GARP
      const garp = {};
      if (v.garpInterval !== undefined) garp.interval = v.garpInterval;
      if (v.garpMasterDelay) garp['master-delay'] = v.garpMasterDelay;
      if (v.garpMasterRefresh) garp['master-refresh'] = v.garpMasterRefresh;
      if (v.garpMasterRefreshRepeat) garp['master-refresh-repeat'] = v.garpMasterRefreshRepeat;
      if (v.garpMasterRepeat) garp['master-repeat'] = v.garpMasterRepeat;
      if (Object.keys(garp).length) result.garp = garp;

      // Health check
      const healthCheck = {};
      if (v.healthCheckFailureCount) healthCheck['failure-count'] = v.healthCheckFailureCount;
      if (v.healthCheckInterval) healthCheck.interval = v.healthCheckInterval;
      if (v.healthCheckPing) healthCheck.ping = v.healthCheckPing;
      if (v.healthCheckScript) healthCheck.script = v.healthCheckScript;
      if (Object.keys(healthCheck).length) result['health-check'] = healthCheck;

      // Track
      if (v.trackExcludeInterface) result.track = { 'exclude-vrrp-interface': {} };

      // Transition script
      const transitionScript = {};
      if (v.transitionScriptBackup) transitionScript.backup = v.transitionScriptBackup;
      if (v.transitionScriptFault) transitionScript.fault = v.transitionScriptFault;
      if (v.transitionScriptMaster) transitionScript.master = v.transitionScriptMaster;
      if (v.transitionScriptStop) transitionScript.stop = v.transitionScriptStop;
      if (Object.keys(transitionScript).length) result['transition-script'] = transitionScript;

      // Addresses
      if (v.addresses?.length) {
        const addresses = {};
        for (const addr of v.addresses) {
          if (addr) addresses[addr] = {};
        }
        result.address = addresses;
      }
      return result;
    }

    function createVRRPGroup() {
      editingVRRP.value = emptyVRRPGroup();
      editingOriginalVRRP.value = '';
      vrrpModalVisible.value = true;
    }

    function editVRRPGroup() {
      if (!selectedVRRPGroup.value.length) return showError({ message: '请选择一个 VRRP 组' });
      if (selectedVRRPGroup.value.length > 1) return showError({ message: '请选择一个 VRRP 组' });
      const group = vrrpGroups.value.find(n => n.name === selectedVRRPGroup.value[0]);
      if (!group) return;
      editingVRRP.value = flattenVRRPGroupData(group.name, group._raw || {});
      editingOriginalVRRP.value = group.name;
      vrrpModalVisible.value = true;
    }

    async function removeVRRPGroup() {
      if (!selectedVRRPGroup.value.length) return showError({ message: '请选择一个 VRRP 组' });
      if (!confirm('确认删除选中的 VRRP 组？')) return;
      for (const name of selectedVRRPGroup.value) {
        await configStore.deleteConfig(`${path.value} vrrp group ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedVRRPGroup.value = [];
      await load();
    }

    async function saveVRRPGroup() {
      if (!editingVRRP.value.name) return showError({ message: '请输入名称' });
      if (!editingVRRP.value.vrid) return showError({ message: '请输入 VRID' });
      if (!editingVRRP.value.interface) return showError({ message: '请输入接口' });
      const original = editingOriginalVRRP.value;
      if (!original && vrrpGroups.value.some(n => n.name === editingVRRP.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = unflattenVRRPGroupData(editingVRRP.value);
      try {
        if (original && original !== editingVRRP.value.name) {
          await configStore.deleteConfig(`${path.value} vrrp group ${original}`);
          await configStore.setConfig(`${path.value} vrrp group ${editingVRRP.value.name}`, value);
        } else {
          await configStore.setConfig(`${path.value} vrrp group ${editingVRRP.value.name}`, value);
        }
        vrrpModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // Sync Group functions
    function emptySyncGroup() {
      return { name: '', members: '' };
    }

    function flattenSyncGroupData(name, attrs) {
      const members = attrs.member || [];
      const memberList = Array.isArray(members) ? members : Object.keys(members);
      return {
        name,
        members: memberList.join(','),
        _raw: attrs,
      };
    }

    function unflattenSyncGroupData(s) {
      const result = {};
      if (s.members) {
        const memberList = s.members.split(',').map(m => m.trim()).filter(m => m);
        result.member = memberList;
      }
      return result;
    }

    function createSyncGroup() {
      editingSync.value = emptySyncGroup();
      editingOriginalSync.value = '';
      syncModalVisible.value = true;
    }

    function editSyncGroup() {
      if (!selectedSyncGroup.value.length) return showError({ message: '请选择一个同步组' });
      if (selectedSyncGroup.value.length > 1) return showError({ message: '请选择一个同步组' });
      const group = vrrpSyncGroups.value.find(n => n.name === selectedSyncGroup.value[0]);
      if (!group) return;
      editingSync.value = flattenSyncGroupData(group.name, group._raw || {});
      editingOriginalSync.value = group.name;
      syncModalVisible.value = true;
    }

    async function removeSyncGroup() {
      if (!selectedSyncGroup.value.length) return showError({ message: '请选择一个同步组' });
      if (!confirm('确认删除选中的同步组？')) return;
      for (const name of selectedSyncGroup.value) {
        await configStore.deleteConfig(`${path.value} vrrp sync-group ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedSyncGroup.value = [];
      await load();
    }

    async function saveSyncGroup() {
      if (!editingSync.value.name) return showError({ message: '请输入名称' });
      if (!editingSync.value.members) return showError({ message: '请输入成员' });
      const original = editingOriginalSync.value;
      if (!original && vrrpSyncGroups.value.some(n => n.name === editingSync.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = unflattenSyncGroupData(editingSync.value);
      try {
        if (original && original !== editingSync.value.name) {
          await configStore.deleteConfig(`${path.value} vrrp sync-group ${original}`);
          await configStore.setConfig(`${path.value} vrrp sync-group ${editingSync.value.name}`, value);
        } else {
          await configStore.setConfig(`${path.value} vrrp sync-group ${editingSync.value.name}`, value);
        }
        syncModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // VRRP Global functions
    async function saveVRRPGlobal() {
      const value = {};
      if (vrrpGlobal.value.startupDelay) value['startup-delay'] = vrrpGlobal.value.startupDelay;
      if (vrrpGlobal.value.version) value.version = vrrpGlobal.value.version;
      
      const garp = {};
      if (vrrpGlobal.value.garpInterval !== undefined) garp.interval = vrrpGlobal.value.garpInterval;
      if (vrrpGlobal.value.garpMasterDelay !== undefined) garp['master-delay'] = vrrpGlobal.value.garpMasterDelay;
      if (vrrpGlobal.value.garpMasterRefresh !== undefined) garp['master-refresh'] = vrrpGlobal.value.garpMasterRefresh;
      if (vrrpGlobal.value.garpMasterRefreshRepeat !== undefined) garp['master-refresh-repeat'] = vrrpGlobal.value.garpMasterRefreshRepeat;
      if (vrrpGlobal.value.garpMasterRepeat !== undefined) garp['master-repeat'] = vrrpGlobal.value.garpMasterRepeat;
      
      if (Object.keys(garp).length) value.garp = garp;

      try {
        await configStore.setConfig(`${path.value} vrrp global-parameters`, value);
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      virtualServers, vrrpGroups, vrrpSyncGroups, vrrpGlobal, loading,
      selectedVS, selectedVRRPGroup, selectedSyncGroup,
      vsModalVisible, editingVS, editingOriginalVS,
      vrrpModalVisible, editingVRRP, editingOriginalVRRP,
      syncModalVisible, editingSync, editingOriginalSync,
      rsModalVisible, editingRS, editingOriginalRS, selectedRS,
      vsColumns, vrrpGroupColumns, syncGroupColumns, rsColumns,
      vsSchema, vrrpGroupSchema, syncGroupSchema, vrrpGlobalSchema, rsSchema,
      path, writeDisabled, activeTab, TABS,
      ALGORITHM_OPTIONS, FORWARD_METHOD_OPTIONS, PROTOCOL_OPTIONS, AUTH_TYPE_OPTIONS, VRRP_VERSION_OPTIONS,
      load,
      createVS, editVS, removeVS, saveVS,
      addRealServer, editRealServer, removeRealServer, saveRS,
      createVRRPGroup, editVRRPGroup, removeVRRPGroup, saveVRRPGroup,
      createSyncGroup, editSyncGroup, removeSyncGroup, saveSyncGroup,
      saveVRRPGlobal,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <TabGroup v-model="activeTab" :tabs="TABS">
          <template #virtual-server>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createVS" :disabled="writeDisabled">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editVS" :disabled="writeDisabled || !selectedVS.length || selectedVS.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeVS" :disabled="writeDisabled || !selectedVS.length">删除</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="vsColumns" :data="virtualServers" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedVS = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-group>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createVRRPGroup" :disabled="writeDisabled">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editVRRPGroup" :disabled="writeDisabled || !selectedVRRPGroup.length || selectedVRRPGroup.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeVRRPGroup" :disabled="writeDisabled || !selectedVRRPGroup.length">删除</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="vrrpGroupColumns" :data="vrrpGroups" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedVRRPGroup = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-sync>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createSyncGroup" :disabled="writeDisabled">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editSyncGroup" :disabled="writeDisabled || !selectedSyncGroup.length || selectedSyncGroup.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeSyncGroup" :disabled="writeDisabled || !selectedSyncGroup.length">删除</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="syncGroupColumns" :data="vrrpSyncGroups" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedSyncGroup = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-global>
            <ConfigForm v-model="vrrpGlobal" :schema="vrrpGlobalSchema" :disabled="writeDisabled" :showAdvanced="true" />
            <div style="margin-top:20px;">
              <ToolbarButton icon="save" @click="saveVRRPGlobal" :disabled="writeDisabled">保存</ToolbarButton>
            </div>
          </template>
        </TabGroup>
      </div>
      <div class="section">
        <CommandPreview :path="path" />
      </div>
      
      <!-- Virtual Server Modal -->
      <DraggableModal v-model:visible="vsModalVisible" title="虚拟服务器" width="800px" @confirm="saveVS">
        <ConfigForm v-model="editingVS" :schema="vsSchema" :disabled="writeDisabled" :showAdvanced="true" />
        <div style="margin-top:20px;">
          <div class="form-section-title">真实服务器</div>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="addRealServer" :disabled="writeDisabled">创建</ToolbarButton>
              <ToolbarButton icon="edit" @click="editRealServer" :disabled="writeDisabled || !selectedRS.length || selectedRS.length > 1">编辑</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeRealServer" :disabled="writeDisabled || !selectedRS.length">删除</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="rsColumns" :data="editingVS?.realServers || []" :loading="false" :disabled="writeDisabled"
                     @selection-change="selectedRS = $event" :selectable="true" :externalToolbar="true" row-key="name">
          </DataTable>
        </div>
      </DraggableModal>
      
      <!-- Real Server Modal -->
      <DraggableModal v-model:visible="rsModalVisible" :title="editingOriginalRS ? '编辑' : '创建'" width="500px" @confirm="saveRS">
        <ConfigForm v-model="editingRS" :schema="rsSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      
      <!-- VRRP Group Modal -->
      <DraggableModal v-model:visible="vrrpModalVisible" :title="editingOriginalVRRP ? '编辑' : '创建'" width="600px" @confirm="saveVRRPGroup">
        <ConfigForm v-model="editingVRRP" :schema="vrrpGroupSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      
      <!-- Sync Group Modal -->
      <DraggableModal v-model:visible="syncModalVisible" :title="editingOriginalSync ? '编辑' : '创建'" width="500px" @confirm="saveSyncGroup">
        <ConfigForm v-model="editingSync" :schema="syncGroupSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
