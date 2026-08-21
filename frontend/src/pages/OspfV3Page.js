import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
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

// OSPFv3 config conversion
function configToForm(data = {}) {
  const areas = [];
  const areaData = data.area || {};
  for (const [areaId, attrs] of Object.entries(areaData)) {
    const ranges = [];
    const rangeData = attrs.range || {};
    for (const [range, rangeAttrs] of Object.entries(rangeData)) {
      ranges.push({
        range,
        advertise: !!rangeAttrs.advertise,
        'not-advertise': !!rangeAttrs['not-advertise'],
      });
    }

    areas.push({
      id: areaId,
      'area-type': attrs['area-type'] || '',
      'export-list': attrs['export-list'] || '',
      'import-list': attrs['import-list'] || '',
      ranges,
    });
  }

  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    interfaces.push({
      name: ifName,
      area: attrs.area || '',
      cost: attrs.cost || '',
      'dead-interval': attrs['dead-interval'] || '',
      'hello-interval': attrs['hello-interval'] || '',
      ifmtu: attrs.ifmtu || '',
      'instance-id': attrs['instance-id'] || '',
      'mtu-ignore': !!attrs['mtu-ignore'],
      network: attrs.network || '',
      passive: !!attrs.passive,
      priority: attrs.priority || '',
      'retransmit-interval': attrs['retransmit-interval'] || '',
      'transmit-delay': attrs['transmit-delay'] || '',
      bfd: !!attrs.bfd,
      'bfd-profile': attrs.bfd?.profile || '',
    });
  }

  const redistributes = [];
  const redistributeData = data.redistribute || {};
  for (const [proto, attrs] of Object.entries(redistributeData)) {
    redistributes.push({
      protocol: proto,
      metric: attrs.metric || '',
      'metric-type': attrs['metric-type'] || '',
      'route-map': attrs['route-map'] || '',
    });
  }

  const defInfo = data['default-information'] || {};
  const defOrig = defInfo.originate || {};

  const distData = data.distance || {};
  const distOspfv3 = distData.ospfv3 || {};

  const grData = data['graceful-restart'] || {};
  const grHelper = grData.helper || {};
  const grHelperEnable = grHelper.enable || {};

  return {
    'router-id': data.parameters?.['router-id'] || '',
    'auto-cost': { 'reference-bandwidth': data['auto-cost']?.['reference-bandwidth'] || '' },
    'log-adjacency-changes': !!data['log-adjacency-changes'],
    'log-adjacency-changes-detail': !!data['log-adjacency-changes']?.detail,
    areas,
    interfaces,
    redistributes,
    'default-information': {
      originate: {
        always: !!defOrig.always,
        metric: defOrig.metric || '',
        'metric-type': defOrig['metric-type'] || '',
        'route-map': defOrig['route-map'] || '',
      },
    },
    distance: {
      global: distData.global || '',
      ospfv3: {
        external: distOspfv3.external || '',
        'inter-area': distOspfv3['inter-area'] || '',
        'intra-area': distOspfv3['intra-area'] || '',
      },
    },
    'graceful-restart': {
      'grace-period': grData['grace-period'] || '',
      helper: {
        enable: !!grHelper.enable,
        'lsa-check-disable': !!grHelper['lsa-check-disable'],
        'planned-only': !!grHelper['planned-only'],
        'supported-grace-time': grHelper['supported-grace-time'] || '',
        routerIds: Object.keys(grHelperEnable),
      },
    },
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['router-id'])) {
    result.parameters = { 'router-id': String(form['router-id']) };
  }

  if (isPresent(form['auto-cost']?.['reference-bandwidth'])) {
    result['auto-cost'] = { 'reference-bandwidth': String(form['auto-cost']['reference-bandwidth']) };
  }

  if (form['log-adjacency-changes']) {
    result['log-adjacency-changes'] = form['log-adjacency-changes-detail'] ? { detail: {} } : {};
  }

  // Areas
  if (form.areas?.length) {
    result.area = {};
    for (const area of form.areas) {
      if (!area.id) continue;
      const attrs = {};
      if (isPresent(area['area-type'])) attrs['area-type'] = area['area-type'];
      if (isPresent(area['export-list'])) attrs['export-list'] = area['export-list'];
      if (isPresent(area['import-list'])) attrs['import-list'] = area['import-list'];

      if (area.ranges?.length) {
        attrs.range = {};
        for (const range of area.ranges) {
          if (!range.range) continue;
          const rangeAttrs = {};
          if (range.advertise) rangeAttrs.advertise = {};
          if (range['not-advertise']) rangeAttrs['not-advertise'] = {};
          attrs.range[range.range] = rangeAttrs;
        }
      }

      result.area[area.id] = attrs;
    }
  }

  // Interfaces
  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};
      if (isPresent(iface.area)) attrs.area = iface.area;
      if (isPresent(iface.cost)) attrs.cost = String(iface.cost);
      if (isPresent(iface['dead-interval'])) attrs['dead-interval'] = String(iface['dead-interval']);
      if (isPresent(iface['hello-interval'])) attrs['hello-interval'] = String(iface['hello-interval']);
      if (isPresent(iface.ifmtu)) attrs.ifmtu = String(iface.ifmtu);
      if (isPresent(iface['instance-id'])) attrs['instance-id'] = String(iface['instance-id']);
      if (iface['mtu-ignore']) attrs['mtu-ignore'] = {};
      if (isPresent(iface.network)) attrs.network = iface.network;
      if (iface.passive) attrs.passive = {};
      if (isPresent(iface.priority)) attrs.priority = String(iface.priority);
      if (isPresent(iface['retransmit-interval'])) attrs['retransmit-interval'] = String(iface['retransmit-interval']);
      if (isPresent(iface['transmit-delay'])) attrs['transmit-delay'] = String(iface['transmit-delay']);
      if (iface.bfd) attrs.bfd = iface['bfd-profile'] ? { profile: iface['bfd-profile'] } : {};

      result.interface[iface.name] = attrs;
    }
  }

  // Redistributes
  if (form.redistributes?.length) {
    result.redistribute = {};
    for (const redist of form.redistributes) {
      if (!redist.protocol) continue;
      const attrs = {};
      if (isPresent(redist.metric)) attrs.metric = String(redist.metric);
      if (isPresent(redist['metric-type'])) attrs['metric-type'] = String(redist['metric-type']);
      if (isPresent(redist['route-map'])) attrs['route-map'] = redist['route-map'];
      result.redistribute[redist.protocol] = attrs;
    }
  }

  // Default information
  if (form['default-information']?.originate) {
    const orig = form['default-information'].originate;
    if (orig.always || orig.metric || orig['metric-type'] || orig['route-map']) {
      result['default-information'] = { originate: {} };
      if (orig.always) result['default-information'].originate.always = {};
      if (isPresent(orig.metric)) result['default-information'].originate.metric = String(orig.metric);
      if (isPresent(orig['metric-type'])) result['default-information'].originate['metric-type'] = String(orig['metric-type']);
      if (isPresent(orig['route-map'])) result['default-information'].originate['route-map'] = orig['route-map'];
    }
  }

  // Distance
  if (form.distance) {
    const dist = {};
    if (isPresent(form.distance.global)) dist.global = String(form.distance.global);
    if (form.distance.ospfv3) {
      const ospfv3 = {};
      if (isPresent(form.distance.ospfv3.external)) ospfv3.external = String(form.distance.ospfv3.external);
      if (isPresent(form.distance.ospfv3['inter-area'])) ospfv3['inter-area'] = String(form.distance.ospfv3['inter-area']);
      if (isPresent(form.distance.ospfv3['intra-area'])) ospfv3['intra-area'] = String(form.distance.ospfv3['intra-area']);
      if (Object.keys(ospfv3).length) dist.ospfv3 = ospfv3;
    }
    if (Object.keys(dist).length) result.distance = dist;
  }

  // Graceful restart
  if (form['graceful-restart']) {
    const gr = {};
    if (isPresent(form['graceful-restart']['grace-period'])) {
      gr['grace-period'] = String(form['graceful-restart']['grace-period']);
    }
    const helper = form['graceful-restart'].helper;
    if (helper) {
      const h = {};
      if (helper.enable) h.enable = {};
      if (helper['lsa-check-disable']) h['lsa-check-disable'] = {};
      if (helper['planned-only']) h['planned-only'] = {};
      if (isPresent(helper['supported-grace-time'])) h['supported-grace-time'] = String(helper['supported-grace-time']);
      if (helper.routerIds?.length) {
        h.enable = {};
        for (const rid of helper.routerIds) {
          h.enable[rid] = {};
        }
      }
      if (Object.keys(h).length) gr.helper = h;
    }
    if (Object.keys(gr).length) result['graceful-restart'] = gr;
  }

  return result;
}

export default defineComponent({
  name: 'OspfV3Page',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('validation.ipv4Format');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('validation.ipv4Format');
      return '';
    }

    function validateIPv6Prefix(value) {
      if (!value) return '';
      if (!/^[0-9a-fA-F:]+\/\d{1,3}$/.test(value)) return t('validation.ipv6PrefixFormat');
      return '';
    }

    function validateAreaId(value) {
      if (!value) return '';
      if (/^\d+$/.test(value)) {
        const n = parseInt(value, 10);
        if (n < 0 || n > 4294967295) return t('validation.areaIdRange');
      } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return t('validation.areaIdFormat');
      }
      return '';
    }

    function validateCost(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('validation.costRange');
      return '';
    }

    function validatePriority(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 255) return t('validation.priorityRange');
      return '';
    }

    function validateMetric(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 16777214) return t('validation.metricRange');
      return '';
    }

    function validateMetricType(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || (n !== 1 && n !== 2)) return t('validation.metricTypeInvalid');
      return '';
    }

    function validateDistance(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 255) return t('validation.distanceRange');
      return '';
    }

    function validateAutoCost(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 4000000) return t('validation.autoCostRange');
      return '';
    }

    function validateGracePeriod(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 1800) return t('validation.gracePeriodRange');
      return '';
    }

    function validateInstanceId(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0 || n > 255) return t('validation.instanceIdRange');
      return '';
    }

    function validateMtu(value) {
      if (!value) return '';
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 128 || n > 65535) return t('validation.mtuRange');
      return '';
    }

    // Area modal
    const areaModalVisible = ref(false);
    const editingAreaIndex = ref(-1);
    const areaForm = ref({ id: '', 'area-type': '', 'export-list': '', 'import-list': '', ranges: [] });

    // Interface modal
    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({
      name: '', area: '', cost: '', 'dead-interval': '', 'hello-interval': '',
      ifmtu: '', 'instance-id': '', 'mtu-ignore': false, network: '',
      passive: false, priority: '', 'retransmit-interval': '', 'transmit-delay': '',
      bfd: false, 'bfd-profile': '',
    });

    // Redistribute modal
    const redistributeModalVisible = ref(false);
    const editingRedistributeIndex = ref(-1);
    const redistributeForm = ref({ protocol: '', metric: '', 'metric-type': '', 'route-map': '' });

    const areaColumns = [
      { key: 'id', title: t('routing.ospfv3.area.id') },
      { key: 'area-type', title: t('routing.ospfv3.area.type') },
      { key: 'ranges', title: t('routing.ospfv3.area.rangeCount'), render: (row) => row.ranges?.length || 0 },
    ];

    const interfaceColumns = [
      { key: 'name', title: t('routing.ospfv3.interface.name') },
      { key: 'area', title: t('routing.ospfv3.area.title') },
      { key: 'cost', title: t('routing.ospfv3.interface.cost') },
      { key: 'network', title: t('routing.ospfv3.interface.networkType') },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: t('routing.ospfv3.redistribute.protocol') },
      { key: 'metric', title: t('routing.ospfv3.redistribute.metric') },
      { key: 'metric-type', title: t('routing.ospfv3.redistribute.metricType') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'areas') return 'protocols ospfv3 area';
      if (activeTab.value === 'interfaces') return 'protocols ospfv3 interface';
      if (activeTab.value === 'redistribute') return 'protocols ospfv3 redistribute';
      if (activeTab.value === 'default-info') return 'protocols ospfv3 default-information originate';
      if (activeTab.value === 'distance') return 'protocols ospfv3 distance';
      if (activeTab.value === 'graceful-restart') return 'protocols ospfv3 graceful-restart';
      return 'protocols ospfv3';
    });

    const AREA_TYPE_OPTIONS = [
      { value: '', label: t('common.default') },
      { value: 'stub', label: t('ospfv3.areaType.stub') },
      { value: 'nssa', label: t('ospfv3.areaType.nssa') },
      { value: 'stub no-summary', label: t('ospfv3.areaType.stubNoSummary') },
      { value: 'nssa no-summary', label: t('ospfv3.areaType.nssaNoSummary') },
    ];

    const NETWORK_TYPE_OPTIONS = [
      { value: '', label: t('common.default') },
      { value: 'broadcast', label: t('ospfv3.networkType.broadcast') },
      { value: 'non-broadcast', label: t('ospfv3.networkType.nonBroadcast') },
      { value: 'point-to-point', label: t('ospfv3.networkType.pointToPoint') },
      { value: 'point-to-multipoint', label: t('ospfv3.networkType.pointToMultipoint') },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: t('ospfv3.protocol.babel') },
      { value: 'bgp', label: t('ospfv3.protocol.bgp') },
      { value: 'connected', label: t('ospfv3.protocol.connected') },
      { value: 'isis', label: t('ospfv3.protocol.isis') },
      { value: 'kernel', label: t('ospfv3.protocol.kernel') },
      { value: 'ripng', label: t('ospfv3.protocol.ripng') },
      { value: 'static', label: t('ospfv3.protocol.static') },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'ospfv3']);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function save() {
      if (config.value['router-id']) {
        const err = validateIPv4(config.value['router-id']);
        if (err) return showError({ message: t('routing.ospfv3.error.routerId', { error: err }) });
      }
      if (config.value['auto-cost']?.['reference-bandwidth']) {
        const err = validateAutoCost(config.value['auto-cost']['reference-bandwidth']);
        if (err) return showError({ message: t('routing.ospfv3.error.autoCost', { error: err }) });
      }

      for (let i = 0; i < config.value.areas.length; i++) {
        const area = config.value.areas[i];
        if (area.id) {
          const err = validateAreaId(area.id);
          if (err) return showError({ message: t('routing.ospfv3.error.area', { index: i + 1, error: err }) });
        }
        for (let j = 0; j < area.ranges.length; j++) {
          const err = validateIPv6Prefix(area.ranges[j].range);
          if (err) return showError({ message: t('routing.ospfv3.error.areaRange', { id: area.id || (i + 1), index: j + 1, error: err }) });
        }
      }

      for (let i = 0; i < config.value.interfaces.length; i++) {
        const iface = config.value.interfaces[i];
        if (iface.cost) {
          const err = validateCost(iface.cost);
          if (err) return showError({ message: t('routing.ospfv3.error.interfaceCost', { name: iface.name || (i + 1), error: err }) });
        }
        if (iface.priority) {
          const err = validatePriority(iface.priority);
          if (err) return showError({ message: t('routing.ospfv3.error.interfacePriority', { name: iface.name || (i + 1), error: err }) });
        }
        if (iface['instance-id']) {
          const err = validateInstanceId(iface['instance-id']);
          if (err) return showError({ message: t('routing.ospfv3.error.interface', { name: iface.name || (i + 1), error: err }) });
        }
        if (iface.ifmtu) {
          const err = validateMtu(iface.ifmtu);
          if (err) return showError({ message: t('routing.ospfv3.error.interface', { name: iface.name || (i + 1), error: err }) });
        }
      }

      if (config.value.distance?.global) {
        const err = validateDistance(config.value.distance.global);
        if (err) return showError({ message: t('routing.ospfv3.error.distance', { error: err }) });
      }

      if (config.value['graceful-restart']?.['grace-period']) {
        const err = validateGracePeriod(config.value['graceful-restart']['grace-period']);
        if (err) return showError({ message: t('routing.ospfv3.error.gracePeriod', { error: err }) });
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols ospfv3', payload);
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        areaModalVisible.value = false;
        interfaceModalVisible.value = false;
        redistributeModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openAreaModal(index = -1) {
      editingAreaIndex.value = index;
      if (index >= 0) {
        areaForm.value = JSON.parse(JSON.stringify(config.value.areas[index]));
      } else {
        areaForm.value = { id: '', 'area-type': '', 'export-list': '', 'import-list': '', ranges: [] };
      }
      areaModalVisible.value = true;
    }

    function addAreaRange() {
      areaForm.value.ranges.push({ range: '', advertise: false, 'not-advertise': false });
    }

    function removeAreaRange(idx) {
      areaForm.value.ranges.splice(idx, 1);
    }

    function saveArea() {
      if (!areaForm.value.id) return showError({ message: t('routing.ospfv3.error.areaIdRequired') });
      const err = validateAreaId(areaForm.value.id);
      if (err) return showError({ message: err });
      for (const range of areaForm.value.ranges) {
        const rErr = validateIPv6Prefix(range.range);
        if (rErr) return showError({ message: rErr });
      }
      if (editingAreaIndex.value >= 0) {
        config.value.areas.splice(editingAreaIndex.value, 1, JSON.parse(JSON.stringify(areaForm.value)));
      } else {
        config.value.areas.push(JSON.parse(JSON.stringify(areaForm.value)));
      }
      areaModalVisible.value = false;
    }

    function openInterfaceModal(index = -1) {
      editingInterfaceIndex.value = index;
      if (index >= 0) {
        interfaceForm.value = JSON.parse(JSON.stringify(config.value.interfaces[index]));
      } else {
        interfaceForm.value = {
          name: '', area: '', cost: '', 'dead-interval': '', 'hello-interval': '',
          ifmtu: '', 'instance-id': '', 'mtu-ignore': false, network: '',
          passive: false, priority: '', 'retransmit-interval': '', 'transmit-delay': '',
          bfd: false, 'bfd-profile': '',
        };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('routing.ospfv3.error.interfaceNameRequired') });
      if (interfaceForm.value.cost) {
        const err = validateCost(interfaceForm.value.cost);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value.priority) {
        const err = validatePriority(interfaceForm.value.priority);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value['instance-id']) {
        const err = validateInstanceId(interfaceForm.value['instance-id']);
        if (err) return showError({ message: err });
      }
      if (interfaceForm.value.ifmtu) {
        const err = validateMtu(interfaceForm.value.ifmtu);
        if (err) return showError({ message: err });
      }
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function openRedistributeModal(index = -1) {
      editingRedistributeIndex.value = index;
      if (index >= 0) {
        redistributeForm.value = JSON.parse(JSON.stringify(config.value.redistributes[index]));
      } else {
        redistributeForm.value = { protocol: '', metric: '', 'metric-type': '', 'route-map': '' };
      }
      redistributeModalVisible.value = true;
    }

    function saveRedistribute() {
      if (!redistributeForm.value.protocol) return showError({ message: t('routing.ospfv3.error.protocolRequired') });
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return showError({ message: err });
      }
      if (redistributeForm.value['metric-type']) {
        const err = validateMetricType(redistributeForm.value['metric-type']);
        if (err) return showError({ message: err });
      }
      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, JSON.parse(JSON.stringify(redistributeForm.value)));
      } else {
        config.value.redistributes.push(JSON.parse(JSON.stringify(redistributeForm.value)));
      }
      redistributeModalVisible.value = false;
    }

    // Delete confirmation modals
    const deleteAreaModalVisible = ref(false);
    const pendingDeleteAreaNames = ref([]);

    const deleteInterfaceModalVisible = ref(false);
    const pendingDeleteInterfaceNames = ref([]);

    const deleteRedistributeModalVisible = ref(false);
    const pendingDeleteRedistributeNames = ref([]);

    function deleteArea(index) {
      pendingDeleteAreaNames.value = [config.value.areas[index].id];
      deleteAreaModalVisible.value = true;
    }

    function confirmDeleteArea() {
      const index = config.value.areas.findIndex(a => a.id === pendingDeleteAreaNames.value[0]);
      if (index >= 0) {
        config.value.areas.splice(index, 1);
      }
      deleteAreaModalVisible.value = false;
      pendingDeleteAreaNames.value = [];
    }

    function deleteInterface(index) {
      pendingDeleteInterfaceNames.value = [config.value.interfaces[index].name];
      deleteInterfaceModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      const index = config.value.interfaces.findIndex(a => a.name === pendingDeleteInterfaceNames.value[0]);
      if (index >= 0) {
        config.value.interfaces.splice(index, 1);
      }
      deleteInterfaceModalVisible.value = false;
      pendingDeleteInterfaceNames.value = [];
    }

    function deleteRedistribute(index) {
      pendingDeleteRedistributeNames.value = [config.value.redistributes[index].protocol];
      deleteRedistributeModalVisible.value = true;
    }

    function confirmDeleteRedistribute() {
      const index = config.value.redistributes.findIndex(a => a.protocol === pendingDeleteRedistributeNames.value[0]);
      if (index >= 0) {
        config.value.redistributes.splice(index, 1);
      }
      deleteRedistributeModalVisible.value = false;
      pendingDeleteRedistributeNames.value = [];
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaces,
      areaModalVisible, editingAreaIndex, areaForm,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      areaColumns, interfaceColumns, redistributeColumns,
      AREA_TYPE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, commandPath,
      openAreaModal, openInterfaceModal, openRedistributeModal,
      deleteArea, deleteInterface, deleteRedistribute,
      confirmDeleteArea, confirmDeleteInterface, confirmDeleteRedistribute,
      deleteAreaModalVisible, pendingDeleteAreaNames,
      deleteInterfaceModalVisible, pendingDeleteInterfaceNames,
      deleteRedistributeModalVisible, pendingDeleteRedistributeNames,
      addAreaRange, removeAreaRange, saveArea,
      saveInterface, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('common.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('routing.ospfv3.tab.basic') },
        { key: 'areas', title: t('routing.ospfv3.tab.areas') },
        { key: 'interfaces', title: t('routing.ospfv3.tab.interfaces') },
        { key: 'redistribute', title: t('routing.ospfv3.tab.redistribute') },
        { key: 'default-info', title: t('routing.ospfv3.tab.defaultInfo') },
        { key: 'distance', title: t('routing.ospfv3.tab.distance') },
        { key: 'graceful-restart', title: t('routing.ospfv3.tab.gracefulRestart') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.basic.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.basic.routerId') }}</label>
                  <input type="text" class="form-control" v-model="config['router-id']"
                         :placeholder="t('routing.ospfv3.basic.routerIdPlaceholder')" style="width:100%;"
                         :title="t('routing.ospfv3.basic.routerIdTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.basic.referenceBandwidth') }}</label>
                  <input type="number" class="form-control" v-model="config['auto-cost']['reference-bandwidth']"
                         min="1" max="4000000" :placeholder="t('routing.ospfv3.basic.referenceBandwidthPlaceholder')" style="width:100%;"
                         :title="t('routing.ospfv3.basic.referenceBandwidthTitle')" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.basic.logAdjacencyChanges') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div v-if="config['log-adjacency-changes']" class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.basic.logAdjacencyChangesDetail') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes-detail']" /></label>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #areas>
          <DataTable :columns="areaColumns" :data="config.areas" :loading="loading" :disabled="writeDisabled"
                     rowKey="id" :actions="['create', 'edit', 'delete']"
                     @create="openAreaModal(-1)" @edit="openAreaModal" @delete="deleteArea" />
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #redistribute>
          <DataTable :columns="redistributeColumns" :data="config.redistributes" :loading="loading" :disabled="writeDisabled"
                     rowKey="protocol" :actions="['create', 'edit', 'delete']"
                     @create="openRedistributeModal(-1)" @edit="openRedistributeModal" @delete="deleteRedistribute" />
        </template>

        <template #default-info>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.defaultInfo.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.defaultInfo.alwaysOriginate') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.defaultInfo.metric') }}</label>
                  <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.defaultInfo.metricType') }}</label>
                  <select class="form-control" v-model="config['default-information'].originate['metric-type']" style="width:100%;">
                    <option value="">{{ t('routing.ospfv3.defaultInfo.metricTypeDefault') }}</option>
                    <option value="1">{{ t('routing.ospfv3.defaultInfo.metricType1') }}</option>
                    <option value="2">{{ t('routing.ospfv3.defaultInfo.metricType2') }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.defaultInfo.routeMap') }}</label>
                  <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                         :placeholder="t('routing.ospfv3.defaultInfo.routeMapPlaceholder')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #distance>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.distance.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.distance.global') }}</label>
                  <input type="number" class="form-control" v-model="config.distance.global"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.distance.ospfv3Distance') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.distance.external') }}</label>
                  <input type="number" class="form-control" v-model="config.distance.ospfv3.external"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.distance.interArea') }}</label>
                  <input type="number" class="form-control" v-model="config.distance.ospfv3['inter-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.distance.intraArea') }}</label>
                  <input type="number" class="form-control" v-model="config.distance.ospfv3['intra-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #graceful-restart>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.gracefulRestart.title') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.gracefulRestart.gracePeriod') }}</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart']['grace-period']"
                         min="1" max="1800" :placeholder="t('routing.ospfv3.gracefulRestart.gracePeriodPlaceholder')" style="width:100%;" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('routing.ospfv3.gracefulRestart.helperSettings') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.gracefulRestart.helperEnable') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper.enable" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.gracefulRestart.helperLsaCheckDisable') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper['lsa-check-disable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.gracefulRestart.helperPlannedOnly') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper['planned-only']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('routing.ospfv3.gracefulRestart.helperSupportedGraceTime') }}</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart'].helper['supported-grace-time']"
                         min="1" max="1800" :placeholder="t('routing.ospfv3.gracefulRestart.gracePeriodPlaceholder')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Area Modal -->
      <DraggableModal v-model:visible="areaModalVisible" :title="editingAreaIndex >= 0 ? t('routing.ospfv3.modal.editArea') : t('routing.ospfv3.modal.addArea')" width="600px" @confirm="saveArea">
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.areaId') }} *</label>
          <input type="text" class="form-control" v-model="areaForm.id"
                 :placeholder="t('routing.ospfv3.modal.areaIdPlaceholder')" style="width:100%;" :disabled="editingAreaIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.areaType') }}</label>
          <select class="form-control" v-model="areaForm['area-type']" style="width:100%;">
            <option v-for="opt in AREA_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.exportList') }}</label>
          <input type="text" class="form-control" v-model="areaForm['export-list']" :placeholder="t('routing.ospfv3.modal.accessListPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.importList') }}</label>
          <input type="text" class="form-control" v-model="areaForm['import-list']" :placeholder="t('routing.ospfv3.modal.accessListPlaceholder')" style="width:100%;" />
        </div>

        <h4 style="margin-top:20px;">{{ t('routing.ospfv3.modal.ranges') }}</h4>
        <div v-for="(range, idx) in areaForm.ranges" :key="idx" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
          <input type="text" class="form-control" v-model="range.range"
                 :placeholder="t('routing.ospfv3.modal.rangePlaceholder')" style="flex:1;" />
          <label style="white-space:nowrap;">
            <input type="checkbox" v-model="range.advertise" />
            {{ t('routing.ospfv3.modal.advertise') }}
          </label>
          <label style="white-space:nowrap;">
            <input type="checkbox" v-model="range['not-advertise']" />
            {{ t('routing.ospfv3.modal.notAdvertise') }}
          </label>
          <ToolbarButton size="small" danger @click="removeAreaRange(idx)">{{ t('common.delete') }}</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addAreaRange">{{ t('routing.ospfv3.modal.addRange') }}</ToolbarButton>
      </DraggableModal>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('routing.ospfv3.modal.editInterface') : t('routing.ospfv3.modal.addInterface')" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.interfaceName') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('routing.ospfv3.modal.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.area') }}</label>
          <input type="text" class="form-control" v-model="interfaceForm.area" :placeholder="t('routing.ospfv3.modal.areaPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.cost') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost" min="1" max="65535" placeholder="1-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.networkType') }}</label>
          <select class="form-control" v-model="interfaceForm.network" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']" min="1" max="65535" :placeholder="t('routing.ospfv3.modal.secondsPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.deadInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['dead-interval']" min="1" max="65535" :placeholder="t('routing.ospfv3.modal.secondsPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.retransmitInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['retransmit-interval']" min="1" max="65535" :placeholder="t('routing.ospfv3.modal.secondsPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.transmitDelay') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['transmit-delay']" min="1" max="65535" :placeholder="t('routing.ospfv3.modal.secondsPlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.priority') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.priority" min="0" max="255" placeholder="0-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.instanceId') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['instance-id']" min="0" max="255" placeholder="0-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.interfaceMtu') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.ifmtu" min="128" max="65535" placeholder="128-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.bfd" />
            {{ t('routing.ospfv3.modal.enableBfd') }}
          </label>
        </div>
        <div v-if="interfaceForm.bfd" class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.bfdProfile') }}</label>
          <input type="text" class="form-control" v-model="interfaceForm['bfd-profile']" :placeholder="t('routing.ospfv3.modal.bfdProfilePlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.passive" />
            {{ t('routing.ospfv3.modal.passiveMode') }}
          </label>
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm['mtu-ignore']" />
            {{ t('routing.ospfv3.modal.ignoreMtuMismatch') }}
          </label>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? t('routing.ospfv3.modal.editRedistribute') : t('routing.ospfv3.modal.addRedistribute')" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.protocol') }} *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.metric') }}</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.metricType') }}</label>
          <select class="form-control" v-model="redistributeForm['metric-type']" style="width:100%;">
            <option value="">{{ t('routing.ospfv3.defaultInfo.metricTypeDefault') }}</option>
            <option value="1">{{ t('routing.ospfv3.defaultInfo.metricType1') }}</option>
            <option value="2">{{ t('routing.ospfv3.defaultInfo.metricType2') }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('routing.ospfv3.modal.routeMap') }}</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" :placeholder="t('routing.ospfv3.modal.routeMapPlaceholder')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deleteAreaModalVisible" :title="t('common.confirmDelete')" width="400px" @confirm="confirmDeleteArea">
        <div>{{ t('routing.ospfv3.confirm.deleteArea') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteAreaNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('common.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('routing.ospfv3.confirm.deleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteInterfaceNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteRedistributeModalVisible" :title="t('common.confirmDelete')" width="400px" @confirm="confirmDeleteRedistribute">
        <div>{{ t('routing.ospfv3.confirm.deleteRedistribute') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteRedistributeNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
