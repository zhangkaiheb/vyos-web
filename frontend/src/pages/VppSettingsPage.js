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

export default defineComponent({
  name: 'VppSettingsPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('buffers');

    const config = ref({
      buffers: { buffers_per_numa: '', data_size: '2048', page_size: '2M' },
      cpu: { corelist_workers: '', main_core: '', skip_cores: '', workers: '' },
      interface_list: [],
      ipsec: { interface_type: 'ipsec', netlink_batch_delay_ms: '', netlink_batch_size: '', netlink_rx_buffer_size: '' },
      ipv6: { hash_buckets: '65536', heap_size: '32M' },
      l2learn: { limit: '4194304' },
      lcp: { ignore_kernel_routes: false, netlink_batch_delay_ms: '', netlink_batch_size: '', netlink_rx_buffer_size: '' },
      logging: { default_log_level: '' },
      memory: { main_heap_page_size: '2M', main_heap_size: '3G' },
      nat44: { session_limit: '64512', workers: '', timeouts: { icmp: '60', tcp_established: '7440', tcp_transitory: '240', udp: '300' } },
      physmem: { max_size: '' },
      statseg: { page_size: '2M', size: '128M' },
      unix: { poll_sleep_usec: '0' },
    });

    const interfaceColumns = [
      { key: 'interface', title: t('vpp.columns.interface'), dataIndex: 'interface', width: 150 },
      { key: 'rx_mode', title: t('vpp.columns.rxMode'), dataIndex: 'rx_mode', width: 100 },
      { key: 'dpdk_num_rx_desc', title: t('vpp.columns.rxDesc'), dataIndex: 'dpdk_num_rx_desc', width: 100 },
      { key: 'dpdk_num_rx_queues', title: t('vpp.columns.rxQueue'), dataIndex: 'dpdk_num_rx_queues', width: 80 },
      { key: 'dpdk_num_tx_desc', title: t('vpp.columns.txDesc'), dataIndex: 'dpdk_num_tx_desc', width: 100 },
      { key: 'dpdk_num_tx_queues', title: t('vpp.columns.txQueue'), dataIndex: 'dpdk_num_tx_queues', width: 80 },
      { key: 'dpdk_promisc', title: t('vpp.columns.promisc'), dataIndex: 'dpdk_promisc', width: 60 },
      { key: 'actions', title: t('vpp.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedInterfaces = ref([]);
    const showInterfaceModal = ref(false);
    const editingInterface = ref(null);

    const commandPath = computed(() => {
      return `vpp settings ${activeTab.value}`;
    });

    function settingsToForm(data = {}) {
      const buffers = data.buffers || {};
      const cpu = data.cpu || {};
      const iface = data.interface || {};
      const ipsec = data.ipsec || {};
      const ipv6 = data.ipv6 || {};
      const l2learn = data.l2learn || {};
      const lcp = data.lcp || {};
      const logging = data.logging || {};
      const memory = data.memory || {};
      const nat44 = data.nat44 || {};
      const physmem = data.physmem || {};
      const statseg = data.statseg || {};
      const unix = data.unix || {};
      const nat44Timeouts = nat44.timeout || {};

      return {
        buffers: {
          buffers_per_numa: buffers['buffers-per-numa'] || '',
          data_size: buffers['data-size'] || '2048',
          page_size: buffers['page-size'] || '2M',
        },
        cpu: {
          corelist_workers: joinLines(cpu['corelist-workers']),
          main_core: cpu['main-core'] || '',
          skip_cores: cpu['skip-cores'] || '',
          workers: cpu.workers || '',
        },
        interface_list: Object.entries(iface).map(([name, attrs]) => ({
          _interface: name,
          interface: name,
          rx_mode: attrs['rx-mode'] || '',
          dpdk_num_rx_desc: attrs.dpdk?.['num-rx-desc'] || '1024',
          dpdk_num_rx_queues: attrs.dpdk?.['num-rx-queues'] || '',
          dpdk_num_tx_desc: attrs.dpdk?.['num-tx-desc'] || '1024',
          dpdk_num_tx_queues: attrs.dpdk?.['num-tx-queues'] || '',
          dpdk_promisc: attrs.dpdk?.promisc !== undefined,
        })),
        ipsec: {
          interface_type: ipsec['interface-type'] || 'ipsec',
          netlink_batch_delay_ms: ipsec['netlink-batch-delay-ms'] || '',
          netlink_batch_size: ipsec['netlink-batch-size'] || '',
          netlink_rx_buffer_size: ipsec['netlink-rx-buffer-size'] || '',
        },
        ipv6: {
          hash_buckets: ipv6['hash-buckets'] || '65536',
          heap_size: ipv6['heap-size'] || '32M',
        },
        l2learn: { limit: l2learn.limit || '4194304' },
        lcp: {
          ignore_kernel_routes: lcp['ignore-kernel-routes'] !== undefined,
          netlink_batch_delay_ms: lcp['netlink-batch-delay-ms'] || '',
          netlink_batch_size: lcp['netlink-batch-size'] || '',
          netlink_rx_buffer_size: lcp['netlink-rx-buffer-size'] || '',
        },
        logging: { default_log_level: logging['default-log-level'] || '' },
        memory: {
          main_heap_page_size: memory['main-heap-page-size'] || '2M',
          main_heap_size: memory['main-heap-size'] || '3G',
        },
        nat44: {
          session_limit: nat44['session-limit'] || '64512',
          workers: joinLines(nat44.workers),
          timeouts: {
            icmp: nat44Timeouts.icmp || '60',
            tcp_established: nat44Timeouts['tcp-established'] || '7440',
            tcp_transitory: nat44Timeouts['tcp-transitory'] || '240',
            udp: nat44Timeouts.udp || '300',
          },
        },
        physmem: { max_size: physmem['max-size'] || '' },
        statseg: {
          page_size: statseg['page-size'] || '2M',
          size: statseg.size || '128M',
        },
        unix: { poll_sleep_usec: unix['poll-sleep-usec'] || '0' },
      };
    }

    function formToSettings(form) {
      const result = {};

      // Buffers
      const buffers = {};
      if (isPresent(form.buffers.buffers_per_numa)) buffers['buffers-per-numa'] = String(form.buffers.buffers_per_numa);
      if (isPresent(form.buffers.data_size)) buffers['data-size'] = String(form.buffers.data_size);
      if (form.buffers.page_size && form.buffers.page_size !== '2M') buffers['page-size'] = String(form.buffers.page_size);
      if (Object.keys(buffers).length) result.buffers = buffers;

      // CPU
      const cpu = {};
      const corelistWorkers = splitLines(form.cpu.corelist_workers);
      if (corelistWorkers.length) cpu['corelist-workers'] = corelistWorkers;
      if (isPresent(form.cpu.main_core)) cpu['main-core'] = String(form.cpu.main_core);
      if (isPresent(form.cpu.skip_cores)) cpu['skip-cores'] = String(form.cpu.skip_cores);
      if (isPresent(form.cpu.workers)) cpu.workers = String(form.cpu.workers);
      if (Object.keys(cpu).length) result.cpu = cpu;

      // Interface
      const iface = {};
      for (const item of form.interface_list || []) {
        if (!item.interface) continue;
        const obj = {};
        if (isPresent(item.rx_mode)) obj['rx-mode'] = String(item.rx_mode);
        const dpdk = {};
        if (isPresent(item.dpdk_num_rx_desc)) dpdk['num-rx-desc'] = String(item.dpdk_num_rx_desc);
        if (isPresent(item.dpdk_num_rx_queues)) dpdk['num-rx-queues'] = String(item.dpdk_num_rx_queues);
        if (isPresent(item.dpdk_num_tx_desc)) dpdk['num-tx-desc'] = String(item.dpdk_num_tx_desc);
        if (isPresent(item.dpdk_num_tx_queues)) dpdk['num-tx-queues'] = String(item.dpdk_num_tx_queues);
        if (item.dpdk_promisc) dpdk.promisc = '';
        if (Object.keys(dpdk).length) obj.dpdk = dpdk;
        iface[item.interface] = obj;
      }
      if (Object.keys(iface).length) result.interface = iface;

      // IPsec
      const ipsec = {};
      if (form.ipsec.interface_type && form.ipsec.interface_type !== 'ipsec') ipsec['interface-type'] = String(form.ipsec.interface_type);
      if (isPresent(form.ipsec.netlink_batch_delay_ms)) ipsec['netlink-batch-delay-ms'] = String(form.ipsec.netlink_batch_delay_ms);
      if (isPresent(form.ipsec.netlink_batch_size)) ipsec['netlink-batch-size'] = String(form.ipsec.netlink_batch_size);
      if (isPresent(form.ipsec.netlink_rx_buffer_size)) ipsec['netlink-rx-buffer-size'] = String(form.ipsec.netlink_rx_buffer_size);
      if (Object.keys(ipsec).length) result.ipsec = ipsec;

      // IPv6
      const ipv6 = {};
      if (isPresent(form.ipv6.hash_buckets)) ipv6['hash-buckets'] = String(form.ipv6.hash_buckets);
      if (isPresent(form.ipv6.heap_size)) ipv6['heap-size'] = String(form.ipv6.heap_size);
      if (Object.keys(ipv6).length) result.ipv6 = ipv6;

      // L2Learn
      if (isPresent(form.l2learn.limit)) result.l2learn = { limit: String(form.l2learn.limit) };

      // LCP
      const lcp = {};
      if (form.lcp.ignore_kernel_routes) lcp['ignore-kernel-routes'] = '';
      if (isPresent(form.lcp.netlink_batch_delay_ms)) lcp['netlink-batch-delay-ms'] = String(form.lcp.netlink_batch_delay_ms);
      if (isPresent(form.lcp.netlink_batch_size)) lcp['netlink-batch-size'] = String(form.lcp.netlink_batch_size);
      if (isPresent(form.lcp.netlink_rx_buffer_size)) lcp['netlink-rx-buffer-size'] = String(form.lcp.netlink_rx_buffer_size);
      if (Object.keys(lcp).length) result.lcp = lcp;

      // Logging
      if (isPresent(form.logging.default_log_level)) result.logging = { 'default-log-level': String(form.logging.default_log_level) };

      // Memory
      const memory = {};
      if (form.memory.main_heap_page_size && form.memory.main_heap_page_size !== '2M') memory['main-heap-page-size'] = String(form.memory.main_heap_page_size);
      if (isPresent(form.memory.main_heap_size)) memory['main-heap-size'] = String(form.memory.main_heap_size);
      if (Object.keys(memory).length) result.memory = memory;

      // NAT44
      const nat44 = {};
      if (isPresent(form.nat44.session_limit)) nat44['session-limit'] = String(form.nat44.session_limit);
      const nat44Workers = splitLines(form.nat44.workers);
      if (nat44Workers.length) nat44.workers = nat44Workers;
      const nat44Timeout = {};
      if (isPresent(form.nat44.timeouts.icmp)) nat44Timeout.icmp = String(form.nat44.timeouts.icmp);
      if (isPresent(form.nat44.timeouts.tcp_established)) nat44Timeout['tcp-established'] = String(form.nat44.timeouts.tcp_established);
      if (isPresent(form.nat44.timeouts.tcp_transitory)) nat44Timeout['tcp-transitory'] = String(form.nat44.timeouts.tcp_transitory);
      if (isPresent(form.nat44.timeouts.udp)) nat44Timeout.udp = String(form.nat44.timeouts.udp);
      if (Object.keys(nat44Timeout).length) nat44.timeout = nat44Timeout;
      if (Object.keys(nat44).length) result.nat44 = nat44;

      // Physmem
      if (isPresent(form.physmem.max_size)) result.physmem = { 'max-size': String(form.physmem.max_size) };

      // Statseg
      const statseg = {};
      if (form.statseg.page_size && form.statseg.page_size !== '2M') statseg['page-size'] = String(form.statseg.page_size);
      if (isPresent(form.statseg.size)) statseg.size = String(form.statseg.size);
      if (Object.keys(statseg).length) result.statseg = statseg;

      // Unix
      if (isPresent(form.unix.poll_sleep_usec)) result.unix = { 'poll-sleep-usec': String(form.unix.poll_sleep_usec) };

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpp settings', true);
        config.value = settingsToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('vpp.error.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp settings');
        const payload = formToSettings(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp settings', payload);
        }
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('vpp.error.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createInterface() {
      editingInterface.value = { interface: '', rx_mode: '', dpdk_num_rx_desc: '1024', dpdk_num_rx_queues: '', dpdk_num_tx_desc: '1024', dpdk_num_tx_queues: '', dpdk_promisc: false };
      showInterfaceModal.value = true;
    }

    function editInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vpp.error.selectInterfaceToEdit') });
      const row = config.value.interface_list.find(i => i.interface === selectedInterfaces.value[0]);
      if (!row) return showError({ message: t('vpp.error.interfaceNotFound') });
      editingInterface.value = JSON.parse(JSON.stringify(row));
      showInterfaceModal.value = true;
    }

    function removeInterface() {
      if (!selectedInterfaces.value.length) return showError({ message: t('vpp.error.selectInterfaceToDelete') });
      config.value.interface_list = config.value.interface_list.filter(i => i.interface !== selectedInterfaces.value[0]);
      selectedInterfaces.value = [];
    }

    function saveInterface() {
      if (!editingInterface.value.interface) return showError({ message: t('vpp.error.enterInterfaceName') });
      const list = config.value.interface_list;
      const idx = list.findIndex(i => i._interface === editingInterface.value._interface);
      if (idx >= 0) list.splice(idx, 1, { ...editingInterface.value });
      else list.push({ ...editingInterface.value });
      config.value.interface_list = list;
      showInterfaceModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, config, activeTab, commandPath,
      interfaceColumns, selectedInterfaces, showInterfaceModal, editingInterface,
      load, save,
      createInterface, editInterface, removeInterface, saveInterface,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'buffers', title: t('vpp.tabs.buffers') },
        { key: 'cpu', title: t('vpp.tabs.cpu') },
        { key: 'interface', title: t('vpp.tabs.interface') },
        { key: 'ipsec', title: t('vpp.tabs.ipsec') },
        { key: 'ipv6', title: t('vpp.tabs.ipv6') },
        { key: 'l2learn', title: t('vpp.tabs.l2learn') },
        { key: 'lcp', title: t('vpp.tabs.lcp') },
        { key: 'logging', title: t('vpp.tabs.logging') },
        { key: 'memory', title: t('vpp.tabs.memory') },
        { key: 'nat44', title: t('vpp.tabs.nat44') },
        { key: 'physmem', title: t('vpp.tabs.physmem') },
        { key: 'statseg', title: t('vpp.tabs.statseg') },
        { key: 'unix', title: t('vpp.tabs.unix') }
      ]">

      <template #buffers>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.buffersPerNuma') }}</label><input class="form-control" v-model="config.buffers.buffers_per_numa" :placeholder="t('vpp.placeholders.buffersPerNuma')" :title="t('vpp.titles.buffersPerNuma')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dataSize') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.buffers.data_size" :title="t('vpp.titles.dataSize')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.pageSize') }}</label>
          <select class="form-control" v-model="config.buffers.page_size" :title="t('vpp.titles.pageSize')">
            <option value="4K">4K</option>
            <option value="2M">2M ({{ t('vpp.default') }})</option>
            <option value="1G">1G</option>
          </select>
        </div>
      </template>

      <template #cpu>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.corelistWorkers') }}</label><textarea class="form-control" v-model="config.cpu.corelist_workers" rows="3" :placeholder="t('vpp.placeholders.corelistWorkers')" :title="t('vpp.titles.corelistWorkers')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.mainCore') }}</label><input class="form-control" type="number" min="0" max="512" v-model="config.cpu.main_core" :title="t('vpp.titles.mainCore')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.skipCores') }}</label><input class="form-control" type="number" min="1" max="512" v-model="config.cpu.skip_cores" :title="t('vpp.titles.skipCores')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.workersCount') }}</label><input class="form-control" type="number" min="0" max="512" v-model="config.cpu.workers" :title="t('vpp.titles.workersCount')" /></div>
      </template>

      <template #interface>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createInterface">{{ t('vpp.buttons.add') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editInterface" :disabled="!selectedInterfaces.length || selectedInterfaces.length > 1">{{ t('vpp.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeInterface" :disabled="!selectedInterfaces.length">{{ t('vpp.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="interfaceColumns" :data="config.interface_list" rowKey="interface" :externalToolbar="true" @selection-change="selectedInterfaces = $event" :selectable="true" />
      </template>

      <template #ipsec>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.interfaceType') }}</label>
          <select class="form-control" v-model="config.ipsec.interface_type" :title="t('vpp.titles.interfaceType')">
            <option value="ipsec">IPsec ({{ t('vpp.default') }})</option>
            <option value="ipip">IPIP</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkBatchDelay') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.ipsec.netlink_batch_delay_ms" :title="t('vpp.titles.netlinkBatchDelay')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkBatchSize') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.ipsec.netlink_batch_size" :title="t('vpp.titles.netlinkBatchSize')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkRxBufferSize') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.ipsec.netlink_rx_buffer_size" :title="t('vpp.titles.netlinkRxBufferSize')" /></div>
      </template>

      <template #ipv6>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.hashBuckets') }}</label><input class="form-control" type="number" min="1" max="4294967295" v-model="config.ipv6.hash_buckets" :title="t('vpp.titles.hashBuckets')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.heapSize') }}</label><input class="form-control" v-model="config.ipv6.heap_size" :placeholder="t('vpp.placeholders.heapSize')" :title="t('vpp.titles.heapSize')" /></div>
      </template>

      <template #l2learn>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.l2learnLimit') }}</label><input class="form-control" type="number" min="1" max="4294967295" v-model="config.l2learn.limit" :title="t('vpp.titles.l2learnLimit')" /></div>
      </template>

      <template #lcp>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.ignoreKernelRoutes') }}</label><input type="checkbox" v-model="config.lcp.ignore_kernel_routes" :title="t('vpp.titles.ignoreKernelRoutes')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkBatchDelay') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.lcp.netlink_batch_delay_ms" :title="t('vpp.titles.netlinkBatchDelay')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkBatchSize') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.lcp.netlink_batch_size" :title="t('vpp.titles.netlinkBatchSize')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.netlinkRxBufferSize') }}</label><input class="form-control" type="number" min="0" max="4294967295" v-model="config.lcp.netlink_rx_buffer_size" :title="t('vpp.titles.netlinkRxBufferSize')" /></div>
      </template>

      <template #logging>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.defaultLogLevel') }}</label>
          <select class="form-control" v-model="config.logging.default_log_level" :title="t('vpp.titles.defaultLogLevel')">
            <option value="">{{ t('vpp.notSet') }}</option>
            <option value="alert">Alert</option>
            <option value="crit">Crit</option>
            <option value="debug">Debug</option>
            <option value="disabled">Disabled</option>
            <option value="emerg">Emerg</option>
            <option value="error">Error</option>
            <option value="info">Info</option>
            <option value="notice">Notice</option>
            <option value="warn">Warn</option>
          </select>
        </div>
      </template>

      <template #memory>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.mainHeapPageSize') }}</label>
          <select class="form-control" v-model="config.memory.main_heap_page_size" :title="t('vpp.titles.mainHeapPageSize')">
            <option value="4K">4K</option>
            <option value="2M">2M ({{ t('vpp.default') }})</option>
            <option value="1G">1G</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.mainHeapSize') }}</label><input class="form-control" v-model="config.memory.main_heap_size" :placeholder="t('vpp.placeholders.mainHeapSize')" :title="t('vpp.titles.mainHeapSize')" /></div>
      </template>

      <template #nat44>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.sessionLimit') }}</label><input class="form-control" type="number" min="1" max="4294967295" v-model="config.nat44.session_limit" :title="t('vpp.titles.sessionLimit')" /></div>
        <div class="form-row"><label class="form-label">Workers</label><textarea class="form-control" v-model="config.nat44.workers" rows="2" :placeholder="t('vpp.placeholders.nat44Workers')" :title="t('vpp.titles.nat44Workers')" /></div>
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('vpp.labels.timeoutSettings') }}</div>
        <div class="form-row"><label class="form-label">ICMP</label><input class="form-control" type="number" v-model="config.nat44.timeouts.icmp" :title="t('vpp.titles.icmpTimeout')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.tcpEstablished') }}</label><input class="form-control" type="number" v-model="config.nat44.timeouts.tcp_established" :title="t('vpp.titles.tcpEstablished')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.tcpTransitory') }}</label><input class="form-control" type="number" v-model="config.nat44.timeouts.tcp_transitory" :title="t('vpp.titles.tcpTransitory')" /></div>
        <div class="form-row"><label class="form-label">UDP</label><input class="form-control" type="number" v-model="config.nat44.timeouts.udp" :title="t('vpp.titles.udpTimeout')" /></div>
      </template>

      <template #physmem>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.maxSize') }}</label><input class="form-control" v-model="config.physmem.max_size" :placeholder="t('vpp.placeholders.maxSize')" :title="t('vpp.titles.maxSize')" /></div>
      </template>

      <template #statseg>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.pageSize') }}</label>
          <select class="form-control" v-model="config.statseg.page_size" :title="t('vpp.titles.statsegPageSize')">
            <option value="4K">4K</option>
            <option value="2M">2M ({{ t('vpp.default') }})</option>
            <option value="1G">1G</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.size') }}</label><input class="form-control" v-model="config.statseg.size" :placeholder="t('vpp.placeholders.statsegSize')" :title="t('vpp.titles.statsegSize')" /></div>
      </template>

      <template #unix>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.pollSleep') }}</label><input class="form-control" type="number" min="0" max="500000" v-model="config.unix.poll_sleep_usec" :title="t('vpp.titles.pollSleep')" /></div>
      </template>
      </TabGroup>

      <DraggableModal v-model:visible="showInterfaceModal" :title="editingInterface && editingInterface._interface ? t('vpp.modal.editInterface') : t('vpp.modal.addInterface')" @confirm="saveInterface" @close="showInterfaceModal = false" width="700px">
        <div class="form-row"><label class="form-label">{{ t('vpp.columns.interface') }}</label><input class="form-control" v-model="editingInterface.interface" :disabled="editingInterface._interface" :placeholder="t('vpp.placeholders.interfaceName')" :title="t('vpp.titles.interfaceName')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.rxMode') }}</label>
          <select class="form-control" v-model="editingInterface.rx_mode" :title="t('vpp.titles.rxMode')">
            <option value="">{{ t('vpp.notSet') }}</option>
            <option value="polling">Polling</option>
            <option value="interrupt">Interrupt</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dpdkRxDesc') }}</label><input class="form-control" type="number" min="256" max="16384" v-model="editingInterface.dpdk_num_rx_desc" :title="t('vpp.titles.dpdkRxDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dpdkRxQueues') }}</label><input class="form-control" type="number" min="1" max="8192" v-model="editingInterface.dpdk_num_rx_queues" :title="t('vpp.titles.dpdkRxQueues')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dpdkTxDesc') }}</label><input class="form-control" type="number" min="256" max="8192" v-model="editingInterface.dpdk_num_tx_desc" :title="t('vpp.titles.dpdkTxDesc')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dpdkTxQueues') }}</label><input class="form-control" type="number" min="1" max="8192" v-model="editingInterface.dpdk_num_tx_queues" :title="t('vpp.titles.dpdkTxQueues')" /></div>
        <div class="form-row"><label class="form-label">{{ t('vpp.labels.dpdkPromisc') }}</label><input type="checkbox" v-model="editingInterface.dpdk_promisc" :title="t('vpp.titles.dpdkPromisc')" /></div>
      </DraggableModal>
    </div>
  `,
});
