import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6Prefix(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+\/\d{1,3}$/.test(value)) return 'IPv6 前缀格式错误 (例如: 2001:db8::/32)';
  return '';
}

function validateAreaId(value) {
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    const n = parseInt(value, 10);
    if (n < 0 || n > 4294967295) return '区域 ID 必须在 0-4294967295 之间';
  } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return '区域 ID 格式错误 (数字或点分十进制)';
  }
  return '';
}

function validateCost(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 65535) return '成本必须在 1-65535 之间';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

function validatePriority(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 255) return '优先级必须在 0-255 之间';
  return '';
}

function validateMetric(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 16777214) return '度量值必须在 0-16777214 之间';
  return '';
}

function validateMetricType(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || (n !== 1 && n !== 2)) return '度量类型必须为 1 或 2';
  return '';
}

function validateDistance(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 255) return '管理距离必须在 1-255 之间';
  return '';
}

function validateAutoCost(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4000000) return '参考带宽必须在 1-4000000 Kbit/s 之间';
  return '';
}

function validateGracePeriod(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 1800) return '宽限期必须在 1-1800 之间';
  return '';
}

function validateInstanceId(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > 255) return '实例 ID 必须在 0-255 之间';
  return '';
}

function validateMtu(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 128 || n > 65535) return 'MTU 必须在 128-65535 之间';
  return '';
}

// OSPFv3 配置转换
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
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

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
      { key: 'id', title: '区域 ID' },
      { key: 'area-type', title: '区域类型' },
      { key: 'ranges', title: '范围数量', render: (row) => row.ranges?.length || 0 },
    ];

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'area', title: '区域' },
      { key: 'cost', title: '成本' },
      { key: 'network', title: '网络类型' },
    ];

    const redistributeColumns = [
      { key: 'protocol', title: '协议' },
      { key: 'metric', title: '度量值' },
      { key: 'metric-type', title: '度量类型' },
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
      { value: '', label: '默认' },
      { value: 'stub', label: 'Stub' },
      { value: 'nssa', label: 'NSSA' },
      { value: 'stub no-summary', label: 'Stub No Summary' },
      { value: 'nssa no-summary', label: 'NSSA No Summary' },
    ];

    const NETWORK_TYPE_OPTIONS = [
      { value: '', label: '默认' },
      { value: 'broadcast', label: 'Broadcast' },
      { value: 'non-broadcast', label: 'Non-Broadcast' },
      { value: 'point-to-point', label: 'Point-to-Point' },
      { value: 'point-to-multipoint', label: 'Point-to-Multipoint' },
    ];

    const REDISTRIBUTE_PROTOCOL_OPTIONS = [
      { value: 'babel', label: 'Babel' },
      { value: 'bgp', label: 'BGP' },
      { value: 'connected', label: 'Connected' },
      { value: 'isis', label: 'IS-IS' },
      { value: 'kernel', label: 'Kernel' },
      { value: 'ripng', label: 'RIPng' },
      { value: 'static', label: 'Static' },
    ];

    async function load() {
      loading.value = true;
      try {
        const data = await configApi.get(['protocols', 'ospfv3']);
        config.value = configToForm(data);
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (config.value['router-id']) {
        const err = validateIPv4(config.value['router-id']);
        if (err) return alert(`路由器 ID：${err}`);
      }
      if (config.value['auto-cost']?.['reference-bandwidth']) {
        const err = validateAutoCost(config.value['auto-cost']['reference-bandwidth']);
        if (err) return alert(`参考带宽：${err}`);
      }

      for (let i = 0; i < config.value.areas.length; i++) {
        const area = config.value.areas[i];
        if (area.id) {
          const err = validateAreaId(area.id);
          if (err) return alert(`区域 ${i + 1}：${err}`);
        }
        for (let j = 0; j < area.ranges.length; j++) {
          const err = validateIPv6Prefix(area.ranges[j].range);
          if (err) return alert(`区域 ${area.id || i + 1} 范围 ${j + 1}：${err}`);
        }
      }

      for (let i = 0; i < config.value.interfaces.length; i++) {
        const iface = config.value.interfaces[i];
        if (iface.cost) {
          const err = validateCost(iface.cost);
          if (err) return alert(`接口 ${iface.name || i + 1}：成本 ${err}`);
        }
        if (iface.priority) {
          const err = validatePriority(iface.priority);
          if (err) return alert(`接口 ${iface.name || i + 1}：优先级 ${err}`);
        }
        if (iface['instance-id']) {
          const err = validateInstanceId(iface['instance-id']);
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
        if (iface.ifmtu) {
          const err = validateMtu(iface.ifmtu);
          if (err) return alert(`接口 ${iface.name || i + 1}：${err}`);
        }
      }

      if (config.value.distance?.global) {
        const err = validateDistance(config.value.distance.global);
        if (err) return alert(`距离：${err}`);
      }

      if (config.value['graceful-restart']?.['grace-period']) {
        const err = validateGracePeriod(config.value['graceful-restart']['grace-period']);
        if (err) return alert(`宽限期：${err}`);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols ospfv3', payload);
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
      if (!areaForm.value.id) return alert('请输入区域 ID');
      const err = validateAreaId(areaForm.value.id);
      if (err) return alert(err);
      for (const range of areaForm.value.ranges) {
        const rErr = validateIPv6Prefix(range.range);
        if (rErr) return alert(rErr);
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
      if (!interfaceForm.value.name) return alert('请输入接口名称');
      if (interfaceForm.value.cost) {
        const err = validateCost(interfaceForm.value.cost);
        if (err) return alert(err);
      }
      if (interfaceForm.value.priority) {
        const err = validatePriority(interfaceForm.value.priority);
        if (err) return alert(err);
      }
      if (interfaceForm.value['instance-id']) {
        const err = validateInstanceId(interfaceForm.value['instance-id']);
        if (err) return alert(err);
      }
      if (interfaceForm.value.ifmtu) {
        const err = validateMtu(interfaceForm.value.ifmtu);
        if (err) return alert(err);
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
      if (!redistributeForm.value.protocol) return alert('请选择协议');
      if (redistributeForm.value.metric) {
        const err = validateMetric(redistributeForm.value.metric);
        if (err) return alert(err);
      }
      if (redistributeForm.value['metric-type']) {
        const err = validateMetricType(redistributeForm.value['metric-type']);
        if (err) return alert(err);
      }
      if (editingRedistributeIndex.value >= 0) {
        config.value.redistributes.splice(editingRedistributeIndex.value, 1, JSON.parse(JSON.stringify(redistributeForm.value)));
      } else {
        config.value.redistributes.push(JSON.parse(JSON.stringify(redistributeForm.value)));
      }
      redistributeModalVisible.value = false;
    }

    function deleteArea(index) {
      if (confirm('确定删除此区域？')) config.value.areas.splice(index, 1);
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) config.value.interfaces.splice(index, 1);
    }

    function deleteRedistribute(index) {
      if (confirm('确定删除此重分发配置？')) config.value.redistributes.splice(index, 1);
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      areaModalVisible, editingAreaIndex, areaForm,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      redistributeModalVisible, editingRedistributeIndex, redistributeForm,
      areaColumns, interfaceColumns, redistributeColumns,
      AREA_TYPE_OPTIONS, NETWORK_TYPE_OPTIONS, REDISTRIBUTE_PROTOCOL_OPTIONS, commandPath,
      openAreaModal, openInterfaceModal, openRedistributeModal,
      deleteArea, deleteInterface, deleteRedistribute,
      addAreaRange, removeAreaRange, saveArea,
      saveInterface, saveRedistribute,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'areas', title: '区域' },
        { key: 'interfaces', title: '接口' },
        { key: 'redistribute', title: '重分发' },
        { key: 'default-info', title: '默认信息' },
        { key: 'distance', title: '管理距离' },
        { key: 'graceful-restart', title: '优雅重启' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">路由器 ID</label>
                  <input type="text" class="form-control" v-model="config['router-id']"
                         placeholder="例如: 1.1.1.1" style="width:100%;"
                         title="OSPFv3 路由器标识符 (IPv4 地址格式)" />
                </div>
                <div class="form-row">
                  <label class="form-label">参考带宽</label>
                  <input type="number" class="form-control" v-model="config['auto-cost']['reference-bandwidth']"
                         min="1" max="4000000" placeholder="1-4000000 Kbit/s" style="width:100%;"
                         title="auto-cost 参考带宽 (1-4000000 Kbit/s)" />
                </div>
                <div class="form-row">
                  <label class="form-label">记录邻接关系变化</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['log-adjacency-changes']" /></label>
                </div>
                <div v-if="config['log-adjacency-changes']" class="form-row">
                  <label class="form-label">记录详细邻接变化</label>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">默认信息通告</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">始终通告默认路由</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['default-information'].originate.always" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">度量值</label>
                  <input type="number" class="form-control" v-model="config['default-information'].originate.metric"
                         min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">度量类型</label>
                  <select class="form-control" v-model="config['default-information'].originate['metric-type']" style="width:100%;">
                    <option value="">默认 (2)</option>
                    <option value="1">类型 1</option>
                    <option value="2">类型 2</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label">路由映射</label>
                  <input type="text" class="form-control" v-model="config['default-information'].originate['route-map']"
                         placeholder="路由映射名称" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #distance>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">管理距离</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">全局距离</label>
                  <input type="number" class="form-control" v-model="config.distance.global"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">OSPFv3 距离</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">外部路由</label>
                  <input type="number" class="form-control" v-model="config.distance.ospfv3.external"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">区域间路由</label>
                  <input type="number" class="form-control" v-model="config.distance.ospfv3['inter-area']"
                         min="1" max="255" placeholder="1-255" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">区域内路由</label>
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
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">优雅重启</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">宽限期</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart']['grace-period']"
                         min="1" max="1800" placeholder="1-1800 秒" style="width:100%;" />
                </div>
              </div>
            </div>
            <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">Helper 设置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">启用 Helper 支持</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper.enable" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">禁用严格 LSA 检查</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper['lsa-check-disable']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">仅支持计划内重启</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['graceful-restart'].helper['planned-only']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">支持的宽限时间</label>
                  <input type="number" class="form-control" v-model="config['graceful-restart'].helper['supported-grace-time']"
                         min="1" max="1800" placeholder="1-1800 秒" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Area Modal -->
      <DraggableModal v-model:visible="areaModalVisible" :title="editingAreaIndex >= 0 ? '编辑 OSPFv3 区域' : '添加 OSPFv3 区域'" width="600px" @confirm="saveArea">
        <div class="form-row">
          <label class="form-label">区域 ID *</label>
          <input type="text" class="form-control" v-model="areaForm.id"
                 placeholder="例如: 0 或 0.0.0.0" style="width:100%;" :disabled="editingAreaIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">区域类型</label>
          <select class="form-control" v-model="areaForm['area-type']" style="width:100%;">
            <option v-for="opt in AREA_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">导出列表</label>
          <input type="text" class="form-control" v-model="areaForm['export-list']" placeholder="访问列表名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">导入列表</label>
          <input type="text" class="form-control" v-model="areaForm['import-list']" placeholder="访问列表名称" style="width:100%;" />
        </div>

        <h4 style="margin-top:20px;">范围 (IPv6 前缀)</h4>
        <div v-for="(range, idx) in areaForm.ranges" :key="idx" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
          <input type="text" class="form-control" v-model="range.range"
                 placeholder="例如: 2001:db8::/32" style="flex:1;" />
          <label style="white-space:nowrap;">
            <input type="checkbox" v-model="range.advertise" />
            通告
          </label>
          <label style="white-space:nowrap;">
            <input type="checkbox" v-model="range['not-advertise']" />
            不通告
          </label>
          <ToolbarButton size="small" danger @click="removeAreaRange(idx)">删除</ToolbarButton>
        </div>
        <ToolbarButton size="small" @click="addAreaRange">添加范围</ToolbarButton>
      </DraggableModal>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 OSPFv3 接口' : '添加 OSPFv3 接口'" width="600px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <input type="text" class="form-control" v-model="interfaceForm.name"
                 placeholder="例如: eth0" style="width:100%;" :disabled="editingInterfaceIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">区域</label>
          <input type="text" class="form-control" v-model="interfaceForm.area" placeholder="例如: 0" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">成本</label>
          <input type="number" class="form-control" v-model="interfaceForm.cost" min="1" max="65535" placeholder="1-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">网络类型</label>
          <select class="form-control" v-model="interfaceForm.network" style="width:100%;">
            <option v-for="opt in NETWORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Hello 间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['hello-interval']" min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">死亡间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['dead-interval']" min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">重传间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm['retransmit-interval']" min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">发送延迟</label>
          <input type="number" class="form-control" v-model="interfaceForm['transmit-delay']" min="1" max="65535" placeholder="1-65535 秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">优先级</label>
          <input type="number" class="form-control" v-model="interfaceForm.priority" min="0" max="255" placeholder="0-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">实例 ID</label>
          <input type="number" class="form-control" v-model="interfaceForm['instance-id']" min="0" max="255" placeholder="0-255" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">接口 MTU</label>
          <input type="number" class="form-control" v-model="interfaceForm.ifmtu" min="128" max="65535" placeholder="128-65535" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.bfd" />
            启用 BFD
          </label>
        </div>
        <div v-if="interfaceForm.bfd" class="form-row">
          <label class="form-label">BFD 配置文件</label>
          <input type="text" class="form-control" v-model="interfaceForm['bfd-profile']" placeholder="BFD 配置文件名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm.passive" />
            被动模式
          </label>
        </div>
        <div class="form-row">
          <label class="form-label">
            <input type="checkbox" v-model="interfaceForm['mtu-ignore']" />
            忽略 MTU 不匹配
          </label>
        </div>
      </DraggableModal>

      <!-- Redistribute Modal -->
      <DraggableModal v-model:visible="redistributeModalVisible" :title="editingRedistributeIndex >= 0 ? '编辑 OSPFv3 重分发' : '添加 OSPFv3 重分发'" width="600px" @confirm="saveRedistribute">
        <div class="form-row">
          <label class="form-label">协议 *</label>
          <select class="form-control" v-model="redistributeForm.protocol" style="width:100%;" :disabled="editingRedistributeIndex >= 0">
            <option v-for="opt in REDISTRIBUTE_PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">度量值</label>
          <input type="number" class="form-control" v-model="redistributeForm.metric" min="0" max="16777214" placeholder="0-16777214" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">度量类型</label>
          <select class="form-control" v-model="redistributeForm['metric-type']" style="width:100%;">
            <option value="">默认 (2)</option>
            <option value="1">类型 1</option>
            <option value="2">类型 2</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">路由映射</label>
          <input type="text" class="form-control" v-model="redistributeForm['route-map']" placeholder="路由映射名称" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
