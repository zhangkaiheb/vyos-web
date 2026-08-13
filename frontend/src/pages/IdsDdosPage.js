import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

const DIRECTION_OPTIONS = ['in', 'out', 'in-out'];
const MODE_OPTIONS = ['mirror', 'netflow', 'pcap', 'sflow'];

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

function inRange(value, min, max) {
  const n = parseFloat(value);
  return !isNaN(n) && n >= min && n <= max;
}

function idsDdosToForm(data = {}) {
  const threshold = data.threshold || {};
  const sflow = data.sflow || {};
  return {
    alert_script: data['alert-script'] || '',
    ban_time: data['ban-time'] !== undefined ? String(data['ban-time']) : '1900',
    direction: toArray(data.direction),
    excluded_network: joinMembers(data['excluded-network']),
    listen_interface: joinMembers(data['listen-interface']),
    mode: data.mode || '',
    network: joinMembers(data.network),
    sflow: {
      port: sflow.port !== undefined ? String(sflow.port) : '',
      collector: joinMembers(sflow.collector),
    },
    threshold: {
      tcp: threshold.tcp?.['packets-per-second'] !== undefined ? String(threshold.tcp['packets-per-second']) : '',
      udp: threshold.udp?.['packets-per-second'] !== undefined ? String(threshold.udp['packets-per-second']) : '',
      icmp: threshold.icmp?.['packets-per-second'] !== undefined ? String(threshold.icmp['packets-per-second']) : '',
      general: threshold.general?.['packets-per-second'] !== undefined ? String(threshold.general['packets-per-second']) : '',
    },
  };
}

function idsDdosToConfig(form) {
  const result = {};
  if (isPresent(form.alert_script)) result['alert-script'] = String(form.alert_script);
  if (isPresent(form.ban_time)) result['ban-time'] = String(form.ban_time);
  const direction = toArray(form.direction).filter(Boolean);
  if (direction.length) result.direction = direction;
  const excludedNetwork = splitMembers(form.excluded_network);
  if (excludedNetwork.length) result['excluded-network'] = excludedNetwork;
  const listenInterface = splitMembers(form.listen_interface);
  if (listenInterface.length) result['listen-interface'] = listenInterface;
  if (isPresent(form.mode)) result.mode = String(form.mode);
  const network = splitMembers(form.network);
  if (network.length) result.network = network;

  const sflow = {};
  if (isPresent(form.sflow?.port)) sflow.port = String(form.sflow.port);
  const collectors = splitMembers(form.sflow?.collector);
  if (collectors.length) sflow.collector = collectors;
  if (Object.keys(sflow).length) result.sflow = sflow;

  const threshold = {};
  for (const proto of ['tcp', 'udp', 'icmp', 'general']) {
    const val = form.threshold?.[proto];
    if (isPresent(val)) {
      threshold[proto] = { 'packets-per-second': String(val) };
    }
  }
  if (Object.keys(threshold).length) result.threshold = threshold;

  return result;
}

export default defineComponent({
  name: 'IdsDdosPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(idsDdosToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);
    const commandPath = 'service ids ddos-protection';

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    function appendListenInterface(iface) {
      if (!iface) return;
      const current = splitMembers(config.value.listen_interface);
      if (!current.includes(iface)) {
        config.value.listen_interface = [...current, iface].join('\n');
      }
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service ids ddos-protection', true);
        config.value = idsDdosToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (isPresent(config.value.sflow?.port) && !inRange(config.value.sflow.port, 1, 65535)) {
        return showError({ message: t('idsddos.errors.sflowPortRange') });
      }
      for (const proto of ['tcp', 'udp', 'icmp', 'general']) {
        const val = config.value.threshold?.[proto];
        if (isPresent(val) && Number(val) < 0) {
          return showError({ message: t('idsddos.errors.thresholdNegative', { proto }) });
        }
      }

      saving.value = true;
      try {
        await configStore.setConfig('service ids ddos-protection', idsDdosToConfig(config.value));
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
      t,
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      load, save, appendListenInterface,
      DIRECTION_OPTIONS, MODE_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('idsddos.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('idsddos.tabs.basic') },
        { key: 'network', title: t('idsddos.tabs.network') },
        { key: 'threshold', title: t('idsddos.tabs.threshold') },
        { key: 'sflow', title: t('idsddos.tabs.sflow') }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.alertScript') }}</label><input class="form-control" v-model="config.alert_script" :placeholder="t('idsddos.placeholders.alertScript')" :title="t('idsddos.titles.alertScript')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.banTime') }}</label><input type="number" min="0" class="form-control" v-model="config.ban_time" placeholder="1900" :title="t('idsddos.titles.banTime')" /></div>
          <div class="form-row">
            <label class="form-label">{{ t('idsddos.labels.direction') }}</label>
            <div style="display:flex;gap:16px;align-items:center;">
              <label v-for="d in DIRECTION_OPTIONS" :key="d" style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" :value="d" v-model="config.direction" /> {{ d }}
              </label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('idsddos.labels.mode') }}</label>
            <select class="form-control" v-model="config.mode" :title="t('idsddos.titles.mode')">
              <option value="">{{ t('idsddos.options.notSet') }}</option>
              <option v-for="m in MODE_OPTIONS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('idsddos.labels.listenInterface') }}</label>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <select class="form-control" @change="appendListenInterface($event.target.value); $event.target.value = ''" :title="t('idsddos.titles.listenInterface')">
                <option value="">{{ t('idsddos.options.selectInterface') }}</option>
                <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
              </select>
              <textarea class="form-control" v-model="config.listen_interface" rows="3" :placeholder="t('idsddos.placeholders.listenInterface')" :title="t('idsddos.titles.listenInterfaceList')" />
            </div>
          </div>
        </template>

        <template #network>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.network') }}</label><textarea class="form-control" v-model="config.network" rows="5" :placeholder="t('idsddos.placeholders.network')" :title="t('idsddos.titles.network')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.excludedNetwork') }}</label><textarea class="form-control" v-model="config.excluded_network" rows="5" :placeholder="t('idsddos.placeholders.network')" :title="t('idsddos.titles.excludedNetwork')" /></div>
        </template>

        <template #threshold>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.tcpRate') }}</label><input type="number" min="0" class="form-control" v-model="config.threshold.tcp" placeholder="packets-per-second" :title="t('idsddos.titles.tcpRate')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.udpRate') }}</label><input type="number" min="0" class="form-control" v-model="config.threshold.udp" placeholder="packets-per-second" :title="t('idsddos.titles.udpRate')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.icmpRate') }}</label><input type="number" min="0" class="form-control" v-model="config.threshold.icmp" placeholder="packets-per-second" :title="t('idsddos.titles.icmpRate')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.generalRate') }}</label><input type="number" min="0" class="form-control" v-model="config.threshold.general" placeholder="packets-per-second" :title="t('idsddos.titles.generalRate')" /></div>
        </template>

        <template #sflow>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="config.sflow.port" :placeholder="t('idsddos.placeholders.sflowPort')" :title="t('idsddos.titles.sflowPort')" /></div>
          <div class="form-row"><label class="form-label">{{ t('idsddos.labels.collector') }}</label><textarea class="form-control" v-model="config.sflow.collector" rows="3" :placeholder="t('idsddos.placeholders.collector')" :title="t('idsddos.titles.collector')" /></div>
        </template>
      </TabGroup>
    </div>
  `,
});
