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

export default defineComponent({
  name: 'VppIpfixPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);

    const config = ref({
      active_timeout: '15',
      inactive_timeout: '120',
      flowprobe_record: ['l3'],
      collectors: [],
      interfaces: [],
    });

    const collectorColumns = computed(() => [
      { key: 'address', title: t('vppIpfix.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'port', title: t('vppIpfix.columns.port'), dataIndex: 'port', width: 80 },
      { key: 'path_mtu', title: 'Path MTU', dataIndex: 'path_mtu', width: 100 },
      { key: 'source_address', title: t('vppIpfix.columns.sourceAddress'), dataIndex: 'source_address', width: 150 },
      { key: 'template_interval', title: t('vppIpfix.columns.templateInterval'), dataIndex: 'template_interval', width: 100 },
      { key: 'udp_checksum', title: t('vppIpfix.columns.udpChecksum'), dataIndex: 'udp_checksum', width: 80 },
      { key: 'actions', title: t('vppIpfix.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const interfaceColumns = computed(() => [
      { key: 'interface', title: t('vppIpfix.columns.interface'), dataIndex: 'interface', width: 150 },
      { key: 'direction', title: t('vppIpfix.columns.direction'), dataIndex: 'direction', width: 100 },
      { key: 'flow_variant', title: t('vppIpfix.columns.flowVariant'), dataIndex: 'flow_variant', width: 100 },
      { key: 'actions', title: t('vppIpfix.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const selectedCollectors = ref([]);
    const selectedInterfaces = ref([]);

    const showCollectorModal = ref(false);
    const editingCollector = ref(null);
    const showInterfaceModal = ref(false);
    const editingInterface = ref(null);

    const commandPath = computed(() => 'vpp ipfix');

    function ipfixToForm(data = {}) {
      const collectors = data.collector || {};
      const interfaces = data.interface || {};
      const flowprobe = data.flowprobe || {};

      return {
        active_timeout: data['active-timeout'] || '15',
        inactive_timeout: data['inactive-timeout'] || '120',
        flowprobe_record: flowprobe.record ? toArray(flowprobe.record) : ['l3'],
        collectors: Object.entries(collectors).map(([address, c]) => ({
          _address: address,
          address,
          port: c.port || '4739',
          path_mtu: c['path-mtu'] || '512',
          source_address: c['source-address'] || '',
          template_interval: c['template-interval'] || '20',
          udp_checksum: c['udp-checksum'] !== undefined,
        })),
        interfaces: Object.entries(interfaces).map(([iface, attrs]) => ({
          _interface: iface,
          interface: iface,
          direction: attrs.direction || 'both',
          flow_variant: attrs['flow-variant'] || 'ipv4',
        })),
      };
    }

    function formToIpfix(form) {
      const result = {};
      if (isPresent(form.active_timeout)) result['active-timeout'] = String(form.active_timeout);
      if (isPresent(form.inactive_timeout)) result['inactive-timeout'] = String(form.inactive_timeout);

      if (form.flowprobe_record && form.flowprobe_record.length) {
        result.flowprobe = { record: form.flowprobe_record };
      }

      const collectors = {};
      for (const c of form.collectors || []) {
        if (!c.address) continue;
        const obj = {};
        if (isPresent(c.port)) obj.port = String(c.port);
        if (isPresent(c.path_mtu)) obj['path-mtu'] = String(c.path_mtu);
        if (isPresent(c.source_address)) obj['source-address'] = String(c.source_address);
        if (isPresent(c.template_interval)) obj['template-interval'] = String(c.template_interval);
        if (c.udp_checksum) obj['udp-checksum'] = '';
        collectors[c.address] = obj;
      }
      if (Object.keys(collectors).length) result.collector = collectors;

      const interfaces = {};
      for (const i of form.interfaces || []) {
        if (!i.interface) continue;
        const obj = {};
        if (isPresent(i.direction)) obj.direction = String(i.direction);
        if (isPresent(i.flow_variant)) obj['flow-variant'] = String(i.flow_variant);
        interfaces[i.interface] = obj;
      }
      if (Object.keys(interfaces).length) result.interface = interfaces;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpp ipfix', true);
        config.value = ipfixToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('vppIpfix.messages.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('vpp ipfix');
        const payload = formToIpfix(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('vpp ipfix', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('vppIpfix.messages.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createCollector() {
      editingCollector.value = { address: '', port: '4739', path_mtu: '512', source_address: '', template_interval: '20', udp_checksum: false };
      showCollectorModal.value = true;
    }

    function editCollector() {
      if (!selectedCollectors.value.length) return showError({ message: t('vppIpfix.messages.selectCollectorToEdit') });
      const row = config.value.collectors.find(c => c.address === selectedCollectors.value[0]);
      if (!row) return showError({ message: t('vppIpfix.messages.collectorNotFound') });
      editingCollector.value = JSON.parse(JSON.stringify(row));
      showCollectorModal.value = true;
    }

    function removeCollector() {
      if (!selectedCollectors.value.length) return showError({ message: t('vppIpfix.messages.selectCollectorToDelete') });
      config.value.collectors = config.value.collectors.filter(c => c.address !== selectedCollectors.value[0]);
      selectedCollectors.value = [];
    }

    function saveCollector() {
      if (!editingCollector.value.address) return showError({ message: t('vppIpfix.messages.enterCollectorAddress') });
      const list = config.value.collectors;
      const idx = list.findIndex(c => c._address === editingCollector.value._address);
      if (idx >= 0) list.splice(idx, 1, { ...editingCollector.value });
      else list.push({ ...editingCollector.value });
      config.value.collectors = list;
      showCollectorModal.value = false;
    }

    function createInterface() {
      editingInterface.value = { interface: '', direction: 'both', flow_variant: 'ipv4' };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vppIpfix.messages.selectInterfaceToEdit') });
      const row = config.value.interfaces.find(i => i.interface === selectedInterfaces.value[0]);
      if (!row) return showError({ message: t('vppIpfix.messages.interfaceNotFound') });
      editingInterface.value = JSON.parse(JSON.stringify(row));
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vppIpfix.messages.selectInterfaceToDelete') });
      config.value.interfaces = config.value.interfaces.filter(i => i.interface !== selectedInterfaces.value[0]);
      selectedInterfaces.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.interface) return showError({ message: t('vppIpfix.messages.enterInterfaceName') });
      const list = config.value.interfaces;
      const idx = list.findIndex(i => i._interface === editingInterface.value._interface);
      if (idx >= 0) list.splice(idx, 1, { ...editingInterface.value });
      else list.push({ ...editingInterface.value });
      config.value.interfaces = list;
      showInterfaceModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t, loading, saving, config, commandPath,
      collectorColumns, interfaceColumns,
      selectedCollectors, selectedInterfaces,
      showCollectorModal, editingCollector, showInterfaceModal, editingInterface,
      load, save,
      createCollector, editCollector, removeCollector, saveCollector,
      createInterface, editInterface, removeInterface, saveInterface,
    };
  },
  template: `
    <div class="page-container">
      <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.activeTimeout') }}</label><input class="form-control" type="number" min="0" max="2147483647" v-model="config.active_timeout" :title="t('vppIpfix.tooltips.activeTimeout')" /></div>
      <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.inactiveTimeout') }}</label><input class="form-control" type="number" min="0" max="2147483647" v-model="config.inactive_timeout" :title="t('vppIpfix.tooltips.inactiveTimeout')" /></div>
      <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.flowprobeRecord') }}</label>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <label><input type="checkbox" value="l2" v-model="config.flowprobe_record" /> L2</label>
          <label><input type="checkbox" value="l3" v-model="config.flowprobe_record" /> L3</label>
          <label><input type="checkbox" value="l4" v-model="config.flowprobe_record" /> L4</label>
        </div>
      </div>

      <div style="font-weight:bold;margin:16px 0 8px;">{{ t('vppIpfix.labels.collectors') }}</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createCollector">{{ t('vppIpfix.buttons.add') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editCollector" :disabled="!selectedCollectors.length || selectedCollectors.length > 1">{{ t('vppIpfix.buttons.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeCollector" :disabled="!selectedCollectors.length">{{ t('vppIpfix.buttons.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="collectorColumns" :data="config.collectors" rowKey="address" :externalToolbar="true" @selection-change="selectedCollectors = $event" :selectable="true" />

      <div style="font-weight:bold;margin:16px 0 8px;">{{ t('vppIpfix.labels.interfaces') }}</div>
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createInterface">{{ t('vppIpfix.buttons.add') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterfaces.length || selectedInterfaces.length > 1">{{ t('vppIpfix.buttons.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterfaces.length">{{ t('vppIpfix.buttons.delete') }}</ToolbarButton>
      </div>
      <DataTable :columns="interfaceColumns" :data="config.interfaces" rowKey="interface" :externalToolbar="true" @selection-change="selectedInterfaces = $event" :selectable="true" />

      <DraggableModal v-model:visible="showCollectorModal" :title="editingCollector && editingCollector._address ? t('vppIpfix.modals.editCollector') : t('vppIpfix.modals.addCollector')" @confirm="saveCollector" @close="showCollectorModal = false">
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.address') }}</label><input class="form-control" v-model="editingCollector.address" :disabled="editingCollector._address" placeholder="x.x.x.x" :title="t('vppIpfix.tooltips.collectorAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingCollector.port" :title="t('vppIpfix.tooltips.collectorPort')" /></div>
        <div class="form-row"><label class="form-label">Path MTU</label><input class="form-control" type="number" min="68" max="1450" v-model="editingCollector.path_mtu" :title="t('vppIpfix.tooltips.pathMtu')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.sourceAddress') }}</label><input class="form-control" v-model="editingCollector.source_address" placeholder="x.x.x.x" :title="t('vppIpfix.tooltips.sourceAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.templateInterval') }}</label><input class="form-control" type="number" min="1" max="300" v-model="editingCollector.template_interval" :title="t('vppIpfix.tooltips.templateInterval')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.udpChecksum') }}</label><input type="checkbox" v-model="editingCollector.udp_checksum" :title="t('vppIpfix.tooltips.udpChecksum')" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showInterfaceModal" :title="editingInterface && editingInterface._interface ? t('vppIpfix.modals.editInterface') : t('vppIpfix.modals.addInterface')" @confirm="saveInterface" @close="showInterfaceModal = false">
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.interface') }}</label><input class="form-control" v-model="editingInterface.interface" :disabled="editingInterface._interface" :title="t('vppIpfix.tooltips.interfaceName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.direction') }}</label>
          <select class="form-control" v-model="editingInterface.direction" :title="t('vppIpfix.tooltips.trafficDirection')">
            <option value="rx">RX</option>
            <option value="tx">TX</option>
            <option value="both">{{ t('vppIpfix.options.bothDefault') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vppIpfix.labels.flowVariant') }}</label>
          <select class="form-control" v-model="editingInterface.flow_variant" :title="t('vppIpfix.tooltips.flowVariant')">
            <option value="l2">L2</option>
            <option value="ipv4">{{ t('vppIpfix.options.ipv4Default') }}</option>
            <option value="ipv6">IPv6</option>
          </select>
        </div>
      </DraggableModal>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" @click="save" :disabled="saving || loading">{{ saving ? t('vppIpfix.buttons.saving') : t('vppIpfix.buttons.confirm') }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
});
