import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { configApi, monitorApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { useVisibilityStore } from '/src/stores/visibility.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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
  { value: 'plaintext-password', label: 'plaintext-password' },
  { value: 'ah', label: 'ah' },
];

const VRRP_VERSION_OPTIONS = [
  { value: '2', label: 'VRRPv2' },
  { value: '3', label: 'VRRPv3' },
];
const GLOBAL_VRRP_VERSION_OPTIONS = [
  { value: '', label: '' },
  ...VRRP_VERSION_OPTIONS,
];

// TABS will be computed in setup() using t()

export default defineComponent({
  name: 'HighAvailabilityPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const virtualServers = ref([]);
    const vrrpGroups = ref([]);
    const vrrpSyncGroups = ref([]);
    const vrrpGlobal = ref({});
    const trackInterfaceOptions = ref([]);
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
    const vrrpModalTab = ref('basic');
    const vrrpModalTitle = computed(() => (editingOriginalVRRP.value ? '编辑VRRP组' : '创建VRRP组'));

    // Sync Group modal
    const syncModalVisible = ref(false);
    const editingSync = ref(null);
    const editingOriginalSync = ref('');
    const syncModalTitle = computed(() => (editingOriginalSync.value ? '编辑VRRP同步组' : '创建VRRP同步组'));

    // Real Server modal
    const rsModalVisible = ref(false);
    const editingRS = ref(null);
    const editingOriginalRS = ref('');
    const selectedRS = ref([]);

    // Delete confirmation modals
    const vsDeleteModalVisible = ref(false);
    const pendingDeleteVSNames = ref([]);
    const rsDeleteModalVisible = ref(false);
    const pendingDeleteRSNames = ref([]);
    const vrrpDeleteModalVisible = ref(false);
    const pendingDeleteVRRPNames = ref([]);
    const syncDeleteModalVisible = ref(false);
    const pendingDeleteSyncNames = ref([]);

    const visibilityStore = useVisibilityStore();
    onMounted(() => { visibilityStore.load(); });

    const path = computed(() => 'high-availability');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const activeTab = ref('');

    const TABS = computed(() => {
      const tabs = [
        { key: 'virtual-server', title: t('highAvailability.tabs.virtualServer'), hidden: !visibilityStore.isVisible('ha-virtual-server') },
        { key: 'vrrp-group', title: t('highAvailability.tabs.vrrpGroup') },
        { key: 'vrrp-sync', title: t('highAvailability.tabs.vrrpSync') },
        { key: 'vrrp-global', title: t('highAvailability.tabs.vrrpGlobal') },
      ].filter(tab => !tab.hidden);
      
      // Set default activeTab to first visible tab
      if (!activeTab.value && tabs.length) {
        activeTab.value = tabs[0].key;
      }
      
      return tabs;
    });

    const vsColumns = computed(() => [
      { key: 'name', title: t('highAvailability.columns.name') },
      { key: 'address', title: t('highAvailability.columns.address') },
      { key: 'port', title: t('highAvailability.columns.port') },
      { key: 'protocol', title: t('highAvailability.columns.protocol') },
      { key: 'algorithm', title: t('highAvailability.columns.algorithm') },
      { key: 'realServerCount', title: t('highAvailability.columns.realServerCount') },
    ]);

    const vrrpGroupColumns = computed(() => [
      { key: 'name', title: t('highAvailability.columns.name') },
      { key: 'description', title: '描述' },
      { key: 'vrid', title: t('highAvailability.columns.vrid') },
      { key: 'interface', title: t('highAvailability.columns.interface') },
      { key: 'priority', title: t('highAvailability.columns.priority') },
      { key: 'advertiseInterval', title: '通告间隔' },
      { key: 'preemptDelay', title: '抢占延迟' },
      { key: 'noPreempt', title: '禁用抢占', render: (val) => val ? t('app.yes') : '' },
      { key: 'addressCount', title: t('highAvailability.columns.addressCount') },
      { key: 'disable', title: '禁用', render: (val) => val ? t('app.yes') : '' },
    ]);

    const syncGroupColumns = computed(() => [
      { key: 'name', title: t('highAvailability.columns.name') },
      { key: 'membersDisplay', title: '成员' },
      { key: 'memberCount', title: t('highAvailability.columns.memberCount') },
    ]);

    const syncMemberOptions = computed(() =>
      vrrpGroups.value
        .map(g => g.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    );

    const vsSchema = computed(() => [
      { key: 'name', title: t('highAvailability.vsSchema.name.title'), type: 'text', required: true, placeholder: t('highAvailability.vsSchema.name.placeholder') },
      { key: 'address', title: t('highAvailability.vsSchema.address.title'), type: 'text', required: true, placeholder: t('highAvailability.vsSchema.address.placeholder') },
      { key: 'port', title: t('highAvailability.vsSchema.port.title'), type: 'number', min: 0, max: 65535, placeholder: t('highAvailability.vsSchema.port.placeholder') },
      { key: 'protocol', title: t('highAvailability.vsSchema.protocol.title'), type: 'select', options: PROTOCOL_OPTIONS, defaultValue: 'tcp' },
      { key: 'algorithm', title: t('highAvailability.vsSchema.algorithm.title'), type: 'select', options: ALGORITHM_OPTIONS, defaultValue: 'least-connection', help: t('highAvailability.vsSchema.algorithm.help') },
      { key: 'forwardMethod', title: t('highAvailability.vsSchema.forwardMethod.title'), type: 'select', options: FORWARD_METHOD_OPTIONS, defaultValue: 'nat', help: t('highAvailability.vsSchema.forwardMethod.help') },
      { key: 'delayLoop', title: t('highAvailability.vsSchema.delayLoop.title'), type: 'number', min: 1, max: 600, placeholder: t('highAvailability.vsSchema.delayLoop.placeholder'), defaultValue: 10, help: t('highAvailability.vsSchema.delayLoop.help') },
      { key: 'persistenceTimeout', title: t('highAvailability.vsSchema.persistenceTimeout.title'), type: 'number', min: 1, max: 86400, placeholder: t('highAvailability.vsSchema.persistenceTimeout.placeholder'), defaultValue: 300, help: t('highAvailability.vsSchema.persistenceTimeout.help') },
      { key: 'fwmark', title: t('highAvailability.vsSchema.fwmark.title'), type: 'number', min: 1, max: 2147483647, placeholder: t('highAvailability.vsSchema.fwmark.placeholder') },
    ]);

    const vrrpModalTabs = computed(() => [
      { key: 'basic', title: '基本' },
      { key: 'garp', title: 'GARP' },
      { key: 'health-check', title: '健康检查' },
      { key: 'track', title: '跟踪' },
      { key: 'transition-script', title: '切换脚本' },
    ]);

    const vrrpGroupInterfaceOptions = computed(() => ['', ...trackInterfaceOptions.value]);

    const vrrpGroupBasicSchema = computed(() => [
      { key: 'name', title: t('highAvailability.vrrpGroupSchema.name.title'), type: 'text', required: true, placeholder: t('highAvailability.vrrpGroupSchema.name.placeholder'), disabled: !!editingOriginalVRRP.value },
      { key: 'description', title: t('highAvailability.vrrpGroupSchema.description.title'), type: 'text' },
      { key: 'vrid', title: t('highAvailability.vrrpGroupSchema.vrid.title'), type: 'number', min: 1, max: 255, required: true, placeholder: t('highAvailability.vrrpGroupSchema.vrid.placeholder') },
      { key: 'interface', title: t('highAvailability.vrrpGroupSchema.interface.title'), type: 'select', required: true, options: vrrpGroupInterfaceOptions.value, placeholder: t('highAvailability.vrrpGroupSchema.interface.placeholder') },
      { key: 'addressesText', title: '虚拟地址（每行一个）', type: 'textarea', placeholder: 'IPv4/IPv6 地址 接口', help: '格式: 地址 接口，例如 59.10.1.1/24 eth2' },
      { key: 'excludedAddressesText', title: '排除地址（每行一个）', type: 'textarea', placeholder: 'IPv4/IPv6 地址 接口', help: '格式: 地址 接口，例如 1.1.1.1/24 eth2' },
      { key: 'priority', title: t('highAvailability.vrrpGroupSchema.priority.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGroupSchema.priority.help') },
      { key: 'advertiseInterval', title: t('highAvailability.vrrpGroupSchema.advertiseInterval.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGroupSchema.advertiseInterval.help') },
      { key: 'preemptDelay', title: t('highAvailability.vrrpGroupSchema.preemptDelay.title'), type: 'number', min: 0, max: 1000, help: t('highAvailability.vrrpGroupSchema.preemptDelay.help') },
      { key: 'helloSourceAddress', title: t('highAvailability.vrrpGroupSchema.helloSourceAddress.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.helloSourceAddress.placeholder') },
      { key: 'peerAddress', title: t('highAvailability.vrrpGroupSchema.peerAddress.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.peerAddress.placeholder') },
      { key: 'disable', title: t('highAvailability.vrrpGroupSchema.disable.title'), type: 'checkbox' },
      { key: 'noPreempt', title: t('highAvailability.vrrpGroupSchema.noPreempt.title'), type: 'checkbox' },
      { key: 'rfc3768Compatibility', title: t('highAvailability.vrrpGroupSchema.rfc3768Compatibility.title'), type: 'checkbox', help: t('highAvailability.vrrpGroupSchema.rfc3768Compatibility.help') },
      { key: 'authType', title: t('highAvailability.vrrpGroupSchema.authType.title'), type: 'select', options: AUTH_TYPE_OPTIONS, help: t('highAvailability.vrrpGroupSchema.authType.help') },
      { key: 'authPassword', title: t('highAvailability.vrrpGroupSchema.authPassword.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.authPassword.placeholder') },
    ]);

    const vrrpGroupGarpSchema = computed(() => [
      { key: 'garpInterval', title: t('highAvailability.vrrpGroupSchema.garpInterval.title'), type: 'number', min: 0, max: 1000, help: t('highAvailability.vrrpGroupSchema.garpInterval.help') },
      { key: 'garpMasterDelay', title: t('highAvailability.vrrpGroupSchema.garpMasterDelay.title'), type: 'number', min: 1, max: 1000, help: t('highAvailability.vrrpGroupSchema.garpMasterDelay.help') },
      { key: 'garpMasterRefresh', title: t('highAvailability.vrrpGroupSchema.garpMasterRefresh.title'), type: 'number', min: 0, max: 255, help: t('highAvailability.vrrpGroupSchema.garpMasterRefresh.help') },
      { key: 'garpMasterRefreshRepeat', title: t('highAvailability.vrrpGroupSchema.garpMasterRefreshRepeat.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGroupSchema.garpMasterRefreshRepeat.help') },
      { key: 'garpMasterRepeat', title: t('highAvailability.vrrpGroupSchema.garpMasterRepeat.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGroupSchema.garpMasterRepeat.help') },
    ]);

    const vrrpGroupHealthCheckSchema = computed(() => [
      { key: 'healthCheckFailureCount', title: t('highAvailability.vrrpGroupSchema.healthCheckFailureCount.title'), type: 'text', help: t('highAvailability.vrrpGroupSchema.healthCheckFailureCount.help') },
      { key: 'healthCheckInterval', title: t('highAvailability.vrrpGroupSchema.healthCheckInterval.title'), type: 'text', help: t('highAvailability.vrrpGroupSchema.healthCheckInterval.help') },
      { key: 'healthCheckPing', title: t('highAvailability.vrrpGroupSchema.healthCheckPing.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.healthCheckPing.placeholder') },
      { key: 'healthCheckScript', title: t('highAvailability.vrrpGroupSchema.healthCheckScript.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.healthCheckScript.placeholder') },
    ]);

    const vrrpGroupTrackSchema = computed(() => [
      { key: 'trackInterfaces', title: '跟踪接口', type: 'multi-select', options: trackInterfaceOptions.value, help: '可多选接口' },
      { key: 'trackExcludeInterface', title: t('highAvailability.vrrpGroupSchema.trackExcludeInterface.title'), type: 'checkbox', help: t('highAvailability.vrrpGroupSchema.trackExcludeInterface.help') },
    ]);

    const vrrpGroupTransitionScriptSchema = computed(() => [
      { key: 'transitionScriptBackup', title: t('highAvailability.vrrpGroupSchema.transitionScriptBackup.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.transitionScriptBackup.placeholder') },
      { key: 'transitionScriptFault', title: t('highAvailability.vrrpGroupSchema.transitionScriptFault.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.transitionScriptFault.placeholder') },
      { key: 'transitionScriptMaster', title: t('highAvailability.vrrpGroupSchema.transitionScriptMaster.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.transitionScriptMaster.placeholder') },
      { key: 'transitionScriptStop', title: t('highAvailability.vrrpGroupSchema.transitionScriptStop.title'), type: 'text', placeholder: t('highAvailability.vrrpGroupSchema.transitionScriptStop.placeholder') },
    ]);

    const syncGroupSchema = computed(() => [
      { key: 'name', title: t('highAvailability.syncGroupSchema.name.title'), type: 'text', required: true, placeholder: t('highAvailability.syncGroupSchema.name.placeholder') },
      { key: 'members', title: '成员', type: 'multi-select', options: syncMemberOptions.value, required: true, help: '可多选' },
    ]);

    const vrrpGlobalSchema = computed(() => [
      { key: 'startupDelay', title: t('highAvailability.vrrpGlobalSchema.startupDelay.title'), type: 'number', min: 1, max: 600, placeholder: t('highAvailability.vrrpGlobalSchema.startupDelay.placeholder'), help: t('highAvailability.vrrpGlobalSchema.startupDelay.help') },
      { key: 'version', title: t('highAvailability.vrrpGlobalSchema.version.title'), type: 'select', options: GLOBAL_VRRP_VERSION_OPTIONS, help: t('highAvailability.vrrpGlobalSchema.version.help') },
      { key: 'garpInterval', title: t('highAvailability.vrrpGlobalSchema.garpInterval.title'), type: 'number', min: 0, max: 1000, help: t('highAvailability.vrrpGlobalSchema.garpInterval.help') },
      { key: 'garpMasterDelay', title: t('highAvailability.vrrpGlobalSchema.garpMasterDelay.title'), type: 'number', min: 1, max: 1000, help: t('highAvailability.vrrpGlobalSchema.garpMasterDelay.help') },
      { key: 'garpMasterRefresh', title: t('highAvailability.vrrpGlobalSchema.garpMasterRefresh.title'), type: 'number', min: 0, max: 255, help: t('highAvailability.vrrpGlobalSchema.garpMasterRefresh.help') },
      { key: 'garpMasterRefreshRepeat', title: t('highAvailability.vrrpGlobalSchema.garpMasterRefreshRepeat.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGlobalSchema.garpMasterRefreshRepeat.help') },
      { key: 'garpMasterRepeat', title: t('highAvailability.vrrpGlobalSchema.garpMasterRepeat.title'), type: 'number', min: 1, max: 255, help: t('highAvailability.vrrpGlobalSchema.garpMasterRepeat.help') },
    ]);

    const rsColumns = computed(() => [
      { key: 'name', title: t('highAvailability.columns.name') },
      { key: 'port', title: t('highAvailability.columns.port') },
      { key: 'connectionTimeout', title: t('highAvailability.columns.connectionTimeout') },
      { key: 'healthCheckScript', title: t('highAvailability.columns.healthCheckScript') },
    ]);

    const rsSchema = computed(() => [
      { key: 'name', title: t('highAvailability.rsSchema.name.title'), type: 'text', required: true, placeholder: t('highAvailability.rsSchema.name.placeholder') },
      { key: 'port', title: t('highAvailability.rsSchema.port.title'), type: 'number', min: 0, max: 65535, placeholder: t('highAvailability.rsSchema.port.placeholder') },
      { key: 'connectionTimeout', title: t('highAvailability.rsSchema.connectionTimeout.title'), type: 'number', min: 1, max: 86400, placeholder: t('highAvailability.rsSchema.connectionTimeout.placeholder'), help: t('highAvailability.rsSchema.connectionTimeout.help') },
      { key: 'healthCheckScript', title: t('highAvailability.rsSchema.healthCheckScript.title'), type: 'text', placeholder: t('highAvailability.rsSchema.healthCheckScript.placeholder') },
    ]);

    async function loadTrackInterfaceOptions() {
      const normalizeSuggestionInterfaces = (items = []) => {
        return items
          .map(v => String(v || '').trim())
          .filter(Boolean)
          .map(v => v.split(/\s+/)[0])
          .filter(v => v && !v.startsWith('<') && /^[a-zA-Z][a-zA-Z0-9_.:-]*$/.test(v));
      };

      try {
        const res = await configApi.suggestions('high-availability vrrp group vg01 track', 'interface');
        const list = normalizeSuggestionInterfaces(res?.suggestions || []);
        const uniqueSorted = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
        if (uniqueSorted.length) {
          trackInterfaceOptions.value = uniqueSorted;
          return;
        }
      } catch (e) {
        // Fallback to ethernet list when CLI suggestions are unavailable.
      }

      try {
        const ifRes = await monitorApi.interfaces();
        const ifaces = ifRes?.interfaces || [];
        trackInterfaceOptions.value = ifaces
          .map(iface => (typeof iface === 'string' ? iface : iface?.name))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      } catch (e) {
        trackInterfaceOptions.value = [];
      }
    }

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
        const syncData = vrrpData['sync-group'] || vrrpData.sync_group || {};
        const syncResult = [];
        for (const [name, attrs] of Object.entries(syncData)) {
          const members = attrs.member || attrs.members || [];
          const memberList = Array.isArray(members) ? members : Object.keys(members);
          syncResult.push({
            id: name,
            name,
            membersDisplay: memberList.join(', '),
            memberCount: memberList.length,
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
          version: globalData.version ?? '',
          garpInterval: garpData.interval ?? '',
          garpMasterDelay: garpData['master-delay'] ?? '',
          garpMasterRefresh: garpData['master-refresh'] ?? '',
          garpMasterRefreshRepeat: garpData['master-refresh-repeat'] ?? '',
          garpMasterRepeat: garpData['master-repeat'] ?? '',
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

    async function handleCommittedRefresh() {
      await load();
      // Commit result may become visible slightly later in active config.
      setTimeout(() => { load(); }, 500);
    }

    onMounted(() => {
      load();
      loadTrackInterfaceOptions();
      onMenuRefresh(load);
      window.addEventListener('config-committed', handleCommittedRefresh);
    });
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
      if (!selectedVS.value.length) return showError({ message: t('highAvailability.messages.selectVS') });
      if (selectedVS.value.length > 1) return showError({ message: t('highAvailability.messages.selectVS') });
      const vs = virtualServers.value.find(n => n.name === selectedVS.value[0]);
      if (!vs) return;
      editingVS.value = flattenVSData(vs.name, vs._raw || {});
      editingOriginalVS.value = vs.name;
      vsModalVisible.value = true;
    }

    function removeVS() {
      if (!selectedVS.value.length) return showError({ message: t('highAvailability.messages.selectVS') });
      pendingDeleteVSNames.value = [...selectedVS.value];
      vsDeleteModalVisible.value = true;
    }

    async function confirmRemoveVS() {
      vsDeleteModalVisible.value = false;
      for (const name of pendingDeleteVSNames.value) {
        await configStore.deleteConfig(`${path.value} virtual-server ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedVS.value = [];
      pendingDeleteVSNames.value = [];
      await load();
    }

    async function saveVS() {
      if (!editingVS.value.name) return showError({ message: t('highAvailability.messages.enterName') });
      if (!editingVS.value.address) return showError({ message: t('highAvailability.messages.enterAddress') });
      const original = editingOriginalVS.value;
      if (!original && virtualServers.value.some(n => n.name === editingVS.value.name)) {
        return showError({ message: t('highAvailability.messages.nameExists') });
      }
      const value = unflattenVSData(editingVS.value);
      try {
        if (original && original !== editingVS.value.name) {
          await configStore.deleteConfig(`${path.value} virtual-server ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} virtual-server ${editingVS.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} virtual-server ${editingVS.value.name}`, value);
          configStore.markPending();
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
      if (!selectedRS.value.length) return showError({ message: t('highAvailability.messages.selectRS') });
      if (selectedRS.value.length > 1) return showError({ message: t('highAvailability.messages.selectRS') });
      const rs = editingVS.value.realServers.find(r => r.name === selectedRS.value[0]);
      if (!rs) return;
      editingRS.value = { ...rs };
      editingOriginalRS.value = rs.name;
      rsModalVisible.value = true;
    }

    function removeRealServer() {
      if (!selectedRS.value.length) return showError({ message: t('highAvailability.messages.selectRS') });
      pendingDeleteRSNames.value = [...selectedRS.value];
      rsDeleteModalVisible.value = true;
    }

    function confirmRemoveRS() {
      rsDeleteModalVisible.value = false;
      editingVS.value.realServers = editingVS.value.realServers.filter(r => !pendingDeleteRSNames.value.includes(r.name));
      selectedRS.value = [];
      pendingDeleteRSNames.value = [];
    }

    function saveRS() {
      if (!editingRS.value.name) return showError({ message: t('highAvailability.messages.enterName') });
      const original = editingOriginalRS.value;
      if (!original && editingVS.value.realServers.some(r => r.name === editingRS.value.name)) {
        return showError({ message: t('highAvailability.messages.nameExists') });
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
        name: '', vrid: '', interface: '', priority: '',
        advertiseInterval: '', preemptDelay: '',
        helloSourceAddress: '', peerAddress: '', description: '',
        addressesText: '', excludedAddressesText: '',
        disable: false, noPreempt: false, rfc3768Compatibility: false,
        authType: '', authPassword: '',
        garpInterval: '', garpMasterDelay: '', garpMasterRefresh: '',
        garpMasterRefreshRepeat: '', garpMasterRepeat: '',
        healthCheckFailureCount: '', healthCheckInterval: '',
        healthCheckPing: '', healthCheckScript: '',
        trackInterfaces: [],
        trackExcludeInterface: false,
        transitionScriptBackup: '', transitionScriptFault: '',
        transitionScriptMaster: '', transitionScriptStop: '',
        addresses: [],
      };
    }

    function flattenVRRPGroupData(name, attrs) {
      const extractInterfaceName = (node) => {
        if (!node || typeof node !== 'object' || Array.isArray(node)) return '';
        const ifNode = node.interface;
        if (typeof ifNode === 'string') return ifNode;
        if (Array.isArray(ifNode)) return String(ifNode[0] || '').trim();
        if (ifNode && typeof ifNode === 'object') {
          const ifKeys = Object.keys(ifNode);
          if (ifKeys.length === 1 && Object.keys(ifNode[ifKeys[0]] || {}).length === 0) return ifKeys[0];
        }
        return '';
      };
      const formatAddressMap = (mapObj) => {
        if (!mapObj || typeof mapObj !== 'object') return [];
        return Object.entries(mapObj).map(([addr, node]) => {
          const iface = extractInterfaceName(node);
          return iface ? `${addr} ${iface}` : addr;
        });
      };

      const addresses = attrs.address || {};
      const addressList = formatAddressMap(addresses);
      const excludedAddresses = attrs['excluded-address'] || {};
      const excludedAddressList = formatAddressMap(excludedAddresses);
      const auth = attrs.authentication || {};
      const garp = attrs.garp || {};
      const healthCheck = attrs['health-check'] || {};
      const track = attrs.track || {};
      const transitionScript = attrs['transition-script'] || {};
      
      return {
        name,
        vrid: attrs.vrid || '',
        interface: attrs.interface || '',
        priority: attrs.priority ?? '',
        advertiseInterval: attrs['advertise-interval'] ?? '',
        preemptDelay: attrs['preempt-delay'] ?? '',
        helloSourceAddress: attrs['hello-source-address'] || '',
        peerAddress: attrs['peer-address'] || '',
        description: attrs.description || '',
        addressesText: addressList.join('\n'),
        excludedAddressesText: excludedAddressList.join('\n'),
        disable: !!attrs.disable,
        noPreempt: !!attrs['no-preempt'],
        rfc3768Compatibility: !!attrs['rfc3768-compatibility'],
        authType: auth.type === 'pass' ? 'plaintext-password' : (auth.type || ''),
        authPassword: auth.password || '',
        garpInterval: garp.interval ?? '',
        garpMasterDelay: garp['master-delay'] ?? '',
        garpMasterRefresh: garp['master-refresh'] ?? '',
        garpMasterRefreshRepeat: garp['master-refresh-repeat'] ?? '',
        garpMasterRepeat: garp['master-repeat'] ?? '',
        healthCheckFailureCount: healthCheck['failure-count'] ?? '',
        healthCheckInterval: healthCheck.interval ?? '',
        healthCheckPing: healthCheck.ping || '',
        healthCheckScript: healthCheck.script || '',
        trackInterfaces: Array.isArray(track.interface)
          ? [...track.interface]
          : (track.interface && typeof track.interface === 'object'
              ? Object.keys(track.interface)
              : (track.interface ? [track.interface] : [])),
        trackExcludeInterface: !!track['exclude-vrrp-interface'],
        transitionScriptBackup: transitionScript.backup || '',
        transitionScriptFault: transitionScript.fault || '',
        transitionScriptMaster: transitionScript.master || '',
        transitionScriptStop: transitionScript.stop || '',
        _raw: attrs,
      };
    }

    function unflattenVRRPGroupData(v) {
      const result = {};
      if (v.vrid) result.vrid = v.vrid;
      if (v.interface) result.interface = v.interface;
      if (v.priority !== '' && v.priority !== null && v.priority !== undefined) result.priority = v.priority;
      if (v.advertiseInterval !== '' && v.advertiseInterval !== null && v.advertiseInterval !== undefined) result['advertise-interval'] = v.advertiseInterval;
      if (v.preemptDelay !== '' && v.preemptDelay !== null && v.preemptDelay !== undefined) result['preempt-delay'] = v.preemptDelay;
      if (v.helloSourceAddress) result['hello-source-address'] = v.helloSourceAddress;
      if (v.peerAddress) result['peer-address'] = v.peerAddress;
      if (v.description) result.description = v.description;
      if (v.disable) result.disable = {};
      if (v.noPreempt) result['no-preempt'] = {};
      if (v.rfc3768Compatibility) result['rfc3768-compatibility'] = {};

      // Authentication
      if (v.authType || v.authPassword) {
        result.authentication = {};
        if (v.authType) result.authentication.type = v.authType === 'pass' ? 'plaintext-password' : v.authType;
        if (v.authPassword) result.authentication.password = v.authPassword;
      }

      // GARP
      const garp = {};
      if (v.garpInterval !== '' && v.garpInterval !== null && v.garpInterval !== undefined) garp.interval = v.garpInterval;
      if (v.garpMasterDelay !== '' && v.garpMasterDelay !== null && v.garpMasterDelay !== undefined) garp['master-delay'] = v.garpMasterDelay;
      if (v.garpMasterRefresh !== '' && v.garpMasterRefresh !== null && v.garpMasterRefresh !== undefined) garp['master-refresh'] = v.garpMasterRefresh;
      if (v.garpMasterRefreshRepeat !== '' && v.garpMasterRefreshRepeat !== null && v.garpMasterRefreshRepeat !== undefined) garp['master-refresh-repeat'] = v.garpMasterRefreshRepeat;
      if (v.garpMasterRepeat !== '' && v.garpMasterRepeat !== null && v.garpMasterRepeat !== undefined) garp['master-repeat'] = v.garpMasterRepeat;
      if (Object.keys(garp).length) result.garp = garp;

      // Health check
      const healthCheck = {};
      if (v.healthCheckFailureCount !== '' && v.healthCheckFailureCount !== null && v.healthCheckFailureCount !== undefined) healthCheck['failure-count'] = v.healthCheckFailureCount;
      if (v.healthCheckInterval !== '' && v.healthCheckInterval !== null && v.healthCheckInterval !== undefined) healthCheck.interval = v.healthCheckInterval;
      if (v.healthCheckPing) healthCheck.ping = v.healthCheckPing;
      if (v.healthCheckScript) healthCheck.script = v.healthCheckScript;
      if (Object.keys(healthCheck).length) result['health-check'] = healthCheck;

      // Track
      if (v.trackExcludeInterface || (Array.isArray(v.trackInterfaces) && v.trackInterfaces.length)) {
        result.track = {};
        if (v.trackExcludeInterface) result.track['exclude-vrrp-interface'] = {};
        if (Array.isArray(v.trackInterfaces) && v.trackInterfaces.length) {
          const trackIf = {};
          for (const iface of v.trackInterfaces) {
            if (iface) trackIf[iface] = {};
          }
          if (Object.keys(trackIf).length) result.track.interface = trackIf;
        }
      }

      // Transition script
      const transitionScript = {};
      if (v.transitionScriptBackup) transitionScript.backup = v.transitionScriptBackup;
      if (v.transitionScriptFault) transitionScript.fault = v.transitionScriptFault;
      if (v.transitionScriptMaster) transitionScript.master = v.transitionScriptMaster;
      if (v.transitionScriptStop) transitionScript.stop = v.transitionScriptStop;
      if (Object.keys(transitionScript).length) result['transition-script'] = transitionScript;

      // Addresses
      const parseAddressLines = (text) => {
        const map = {};
        const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
        for (const line of lines) {
          const [address, iface] = line.split(/\s+/, 2);
          if (!address) continue;
          map[address] = iface ? { interface: iface } : {};
        }
        return map;
      };

      const addressMap = parseAddressLines(v.addressesText);
      const addressList = Object.keys(addressMap);
      if (addressList.length) {
        result.address = addressMap;
      }

      // Excluded addresses
      const excludedAddressMap = parseAddressLines(v.excludedAddressesText);
      const excludedAddressList = Object.keys(excludedAddressMap);
      if (excludedAddressList.length) {
        result['excluded-address'] = excludedAddressMap;
      }
      return result;
    }

    function createVRRPGroup() {
      editingVRRP.value = emptyVRRPGroup();
      editingOriginalVRRP.value = '';
      vrrpModalTab.value = 'basic';
      vrrpModalVisible.value = true;
    }

    function editVRRPGroup() {
      if (!selectedVRRPGroup.value.length) return showError({ message: t('highAvailability.messages.selectVRRPGroup') });
      if (selectedVRRPGroup.value.length > 1) return showError({ message: t('highAvailability.messages.selectVRRPGroup') });
      const group = vrrpGroups.value.find(n => n.name === selectedVRRPGroup.value[0]);
      if (!group) return;
      editingVRRP.value = flattenVRRPGroupData(group.name, group._raw || {});
      editingOriginalVRRP.value = group.name;
      vrrpModalTab.value = 'basic';
      vrrpModalVisible.value = true;
    }

    function removeVRRPGroup() {
      if (!selectedVRRPGroup.value.length) return showError({ message: t('highAvailability.messages.selectVRRPGroup') });
      pendingDeleteVRRPNames.value = [...selectedVRRPGroup.value];
      vrrpDeleteModalVisible.value = true;
    }

    async function confirmRemoveVRRPGroup() {
      vrrpDeleteModalVisible.value = false;
      for (const name of pendingDeleteVRRPNames.value) {
        await configStore.deleteConfig(`${path.value} vrrp group ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedVRRPGroup.value = [];
      pendingDeleteVRRPNames.value = [];
      await load();
    }

    async function saveVRRPGroup() {
      if (!editingVRRP.value.name) return showError({ message: t('highAvailability.messages.enterName') });
      if (!editingVRRP.value.vrid) return showError({ message: t('highAvailability.messages.enterVRID') });
      if (!editingVRRP.value.interface) return showError({ message: t('highAvailability.messages.enterInterface') });
      const original = editingOriginalVRRP.value;
      if (!original && vrrpGroups.value.some(n => n.name === editingVRRP.value.name)) {
        return showError({ message: t('highAvailability.messages.nameExists') });
      }
      const value = unflattenVRRPGroupData(editingVRRP.value);
      try {
        if (original && original !== editingVRRP.value.name) {
          await configStore.deleteConfig(`${path.value} vrrp group ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} vrrp group ${editingVRRP.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} vrrp group ${editingVRRP.value.name}`, value);
          configStore.markPending();
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
      return { name: '', members: [] };
    }

    function flattenSyncGroupData(name, attrs) {
      const members = attrs.member || [];
      const memberList = Array.isArray(members) ? members : Object.keys(members);
      return {
        name,
        members: memberList,
        _raw: attrs,
      };
    }

    function unflattenSyncGroupData(s) {
      const result = {};
      if (Array.isArray(s.members) && s.members.length) {
        result.member = s.members.filter(Boolean);
      }
      return result;
    }

    function createSyncGroup() {
      editingSync.value = emptySyncGroup();
      editingOriginalSync.value = '';
      syncModalVisible.value = true;
    }

    function editSyncGroup() {
      if (!selectedSyncGroup.value.length) return showError({ message: t('highAvailability.messages.selectSyncGroup') });
      if (selectedSyncGroup.value.length > 1) return showError({ message: t('highAvailability.messages.selectSyncGroup') });
      const group = vrrpSyncGroups.value.find(n => n.name === selectedSyncGroup.value[0]);
      if (!group) return;
      editingSync.value = flattenSyncGroupData(group.name, group._raw || {});
      editingOriginalSync.value = group.name;
      syncModalVisible.value = true;
    }

    function removeSyncGroup() {
      if (!selectedSyncGroup.value.length) return showError({ message: t('highAvailability.messages.selectSyncGroup') });
      pendingDeleteSyncNames.value = [...selectedSyncGroup.value];
      syncDeleteModalVisible.value = true;
    }

    async function confirmRemoveSyncGroup() {
      syncDeleteModalVisible.value = false;
      for (const name of pendingDeleteSyncNames.value) {
        await configStore.deleteConfig(`${path.value} vrrp sync-group ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedSyncGroup.value = [];
      pendingDeleteSyncNames.value = [];
      await load();
    }

    async function saveSyncGroup() {
      if (!editingSync.value.name) return showError({ message: t('highAvailability.messages.enterName') });
      if (!Array.isArray(editingSync.value.members) || !editingSync.value.members.length) {
        return showError({ message: t('highAvailability.messages.enterMembers') });
      }
      const original = editingOriginalSync.value;
      if (!original && vrrpSyncGroups.value.some(n => n.name === editingSync.value.name)) {
        return showError({ message: t('highAvailability.messages.nameExists') });
      }
      const value = unflattenSyncGroupData(editingSync.value);
      try {
        if (original && original !== editingSync.value.name) {
          await configStore.deleteConfig(`${path.value} vrrp sync-group ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} vrrp sync-group ${editingSync.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} vrrp sync-group ${editingSync.value.name}`, value);
          configStore.markPending();
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
      if (vrrpGlobal.value.garpInterval !== '' && vrrpGlobal.value.garpInterval !== null && vrrpGlobal.value.garpInterval !== undefined) garp.interval = vrrpGlobal.value.garpInterval;
      if (vrrpGlobal.value.garpMasterDelay !== '' && vrrpGlobal.value.garpMasterDelay !== null && vrrpGlobal.value.garpMasterDelay !== undefined) garp['master-delay'] = vrrpGlobal.value.garpMasterDelay;
      if (vrrpGlobal.value.garpMasterRefresh !== '' && vrrpGlobal.value.garpMasterRefresh !== null && vrrpGlobal.value.garpMasterRefresh !== undefined) garp['master-refresh'] = vrrpGlobal.value.garpMasterRefresh;
      if (vrrpGlobal.value.garpMasterRefreshRepeat !== '' && vrrpGlobal.value.garpMasterRefreshRepeat !== null && vrrpGlobal.value.garpMasterRefreshRepeat !== undefined) garp['master-refresh-repeat'] = vrrpGlobal.value.garpMasterRefreshRepeat;
      if (vrrpGlobal.value.garpMasterRepeat !== '' && vrrpGlobal.value.garpMasterRepeat !== null && vrrpGlobal.value.garpMasterRepeat !== undefined) garp['master-repeat'] = vrrpGlobal.value.garpMasterRepeat;
      
      if (Object.keys(garp).length) value.garp = garp;

      try {
        await configStore.setConfig(`${path.value} vrrp global-parameters`, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      t,
      virtualServers, vrrpGroups, vrrpSyncGroups, vrrpGlobal, loading,
      selectedVS, selectedVRRPGroup, selectedSyncGroup,
      vsModalVisible, editingVS, editingOriginalVS,
      vrrpModalVisible, editingVRRP, editingOriginalVRRP,
      syncModalVisible, editingSync, editingOriginalSync,
      rsModalVisible, editingRS, editingOriginalRS, selectedRS,
      vsDeleteModalVisible, pendingDeleteVSNames,
      rsDeleteModalVisible, pendingDeleteRSNames,
      vrrpDeleteModalVisible, pendingDeleteVRRPNames,
      syncDeleteModalVisible, pendingDeleteSyncNames,
      vrrpModalTitle,
      syncModalTitle,
      vsColumns, vrrpGroupColumns, syncGroupColumns, rsColumns,
      vsSchema, syncGroupSchema, vrrpGlobalSchema, rsSchema,
      vrrpModalTab, vrrpModalTabs,
      vrrpGroupBasicSchema, vrrpGroupGarpSchema, vrrpGroupHealthCheckSchema, vrrpGroupTrackSchema, vrrpGroupTransitionScriptSchema,
      path, writeDisabled, activeTab, TABS,
      ALGORITHM_OPTIONS, FORWARD_METHOD_OPTIONS, PROTOCOL_OPTIONS, AUTH_TYPE_OPTIONS, VRRP_VERSION_OPTIONS,
      load,
      createVS, editVS, removeVS, confirmRemoveVS, saveVS,
      addRealServer, editRealServer, removeRealServer, confirmRemoveRS, saveRS,
      createVRRPGroup, editVRRPGroup, removeVRRPGroup, confirmRemoveVRRPGroup, saveVRRPGroup,
      createSyncGroup, editSyncGroup, removeSyncGroup, confirmRemoveSyncGroup, saveSyncGroup,
      saveVRRPGlobal,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="TABS">
          <template #virtual-server>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createVS" :disabled="writeDisabled">{{ t('highAvailability.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editVS" :disabled="writeDisabled || !selectedVS.length || selectedVS.length > 1">{{ t('highAvailability.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeVS" :disabled="writeDisabled || !selectedVS.length">{{ t('highAvailability.buttons.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ t('highAvailability.buttons.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="vsColumns" :data="virtualServers" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedVS = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-group>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createVRRPGroup" :disabled="writeDisabled">{{ t('highAvailability.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editVRRPGroup" :disabled="writeDisabled || !selectedVRRPGroup.length || selectedVRRPGroup.length > 1">{{ t('highAvailability.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeVRRPGroup" :disabled="writeDisabled || !selectedVRRPGroup.length">{{ t('highAvailability.buttons.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ t('highAvailability.buttons.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="vrrpGroupColumns" :data="vrrpGroups" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedVRRPGroup = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-sync>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createSyncGroup" :disabled="writeDisabled">{{ t('highAvailability.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editSyncGroup" :disabled="writeDisabled || !selectedSyncGroup.length || selectedSyncGroup.length > 1">{{ t('highAvailability.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeSyncGroup" :disabled="writeDisabled || !selectedSyncGroup.length">{{ t('highAvailability.buttons.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ t('highAvailability.buttons.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="syncGroupColumns" :data="vrrpSyncGroups" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedSyncGroup = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #vrrp-global>
            <ConfigForm v-model="vrrpGlobal" :schema="vrrpGlobalSchema" :disabled="writeDisabled" :showAdvanced="true" />
            <div style="text-align:right;padding:16px 0;">
              <ToolbarButton icon="save" primary :disabled="writeDisabled" @click="saveVRRPGlobal">
                {{ t('app.confirm') }}
              </ToolbarButton>
            </div>
          </template>
      </TabGroup>

      <!-- Virtual Server Modal -->
      <DraggableModal v-model:visible="vsModalVisible" :title="t('highAvailability.modals.virtualServer')" width="800px" @confirm="saveVS">
        <ConfigForm v-model="editingVS" :schema="vsSchema" :disabled="writeDisabled" :showAdvanced="true" />
        <div style="margin-top:20px;">
          <div class="form-section-title">{{ t('highAvailability.modals.realServer') }}</div>
          <div class="toolbar">
            <div class="toolbar-left">
              <ToolbarButton icon="create" @click="addRealServer" :disabled="writeDisabled">{{ t('highAvailability.buttons.create') }}</ToolbarButton>
              <ToolbarButton icon="edit" @click="editRealServer" :disabled="writeDisabled || !selectedRS.length || selectedRS.length > 1">{{ t('highAvailability.buttons.edit') }}</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeRealServer" :disabled="writeDisabled || !selectedRS.length">{{ t('highAvailability.buttons.delete') }}</ToolbarButton>
            </div>
          </div>
          <DataTable :columns="rsColumns" :data="editingVS?.realServers || []" :loading="false" :disabled="writeDisabled"
                     @selection-change="selectedRS = $event" :selectable="true" :externalToolbar="true" row-key="name">
          </DataTable>
        </div>
      </DraggableModal>
      
      <!-- Real Server Modal -->
      <DraggableModal v-model:visible="rsModalVisible" :title="editingOriginalRS ? t('highAvailability.modals.edit') : t('highAvailability.modals.create')" width="500px" @confirm="saveRS">
        <ConfigForm v-model="editingRS" :schema="rsSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>
      
      <!-- VRRP Group Modal -->
      <DraggableModal v-model:visible="vrrpModalVisible" :title="vrrpModalTitle" width="600px" @confirm="saveVRRPGroup">
        <TabGroup v-model="vrrpModalTab" :tabs="vrrpModalTabs">
          <template #basic>
            <ConfigForm v-model="editingVRRP" :schema="vrrpGroupBasicSchema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #garp>
            <ConfigForm v-model="editingVRRP" :schema="vrrpGroupGarpSchema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #health-check>
            <ConfigForm v-model="editingVRRP" :schema="vrrpGroupHealthCheckSchema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #track>
            <ConfigForm v-model="editingVRRP" :schema="vrrpGroupTrackSchema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #transition-script>
            <ConfigForm v-model="editingVRRP" :schema="vrrpGroupTransitionScriptSchema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </DraggableModal>
      
      <!-- Sync Group Modal -->
      <DraggableModal v-model:visible="syncModalVisible" :title="syncModalTitle" width="500px" @confirm="saveSyncGroup">
        <ConfigForm v-model="editingSync" :schema="syncGroupSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- Virtual Server Delete Confirmation Modal -->
      <DraggableModal v-model:visible="vsDeleteModalVisible" :title="t('highAvailability.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveVS">
        <div>{{ t('highAvailability.messages.confirmDeleteVS') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteVSNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- Real Server Delete Confirmation Modal -->
      <DraggableModal v-model:visible="rsDeleteModalVisible" :title="t('highAvailability.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveRS">
        <div>{{ t('highAvailability.messages.confirmDeleteRS') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRSNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- VRRP Group Delete Confirmation Modal -->
      <DraggableModal v-model:visible="vrrpDeleteModalVisible" :title="t('highAvailability.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveVRRPGroup">
        <div>{{ t('highAvailability.messages.confirmDeleteVRRP') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteVRRPNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- Sync Group Delete Confirmation Modal -->
      <DraggableModal v-model:visible="syncDeleteModalVisible" :title="t('highAvailability.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmRemoveSyncGroup">
        <div>{{ t('highAvailability.messages.confirmDeleteSync') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteSyncNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
