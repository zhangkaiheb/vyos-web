import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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
        return alert('Sflow 端口范围为 1-65535');
      }
      for (const proto of ['tcp', 'udp', 'icmp', 'general']) {
        const val = config.value.threshold?.[proto];
        if (isPresent(val) && Number(val) < 0) {
          return alert(`阈值 ${proto} 不能为负数`);
        }
      }

      saving.value = true;
      try {
        await configApi.set('service ids ddos-protection', idsDdosToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      load, save, appendListenInterface,
      DIRECTION_OPTIONS, MODE_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'network', title: '网络' },
        { key: 'threshold', title: '阈值' },
        { key: 'sflow', title: 'Sflow' }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">告警脚本</label><input class="form-control" v-model="config.alert_script" placeholder="脚本路径" title="检测到攻击时触发的脚本路径" /></div>
          <div class="form-row"><label class="form-label">封禁时间</label><input type="number" min="0" class="form-control" v-model="config.ban_time" placeholder="1900" title="攻击源封禁时间（秒），默认 1900" /></div>
          <div class="form-row">
            <label class="form-label">方向</label>
            <div style="display:flex;gap:16px;align-items:center;">
              <label v-for="d in DIRECTION_OPTIONS" :key="d" style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" :value="d" v-model="config.direction" /> {{ d }}
              </label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">模式</label>
            <select class="form-control" v-model="config.mode" title="DDoS 防护工作模式">
              <option value="">未选择</option>
              <option v-for="m in MODE_OPTIONS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">监听接口</label>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <select class="form-control" @change="appendListenInterface($event.target.value); $event.target.value = ''" title="选择接口追加到下方">
                <option value="">选择接口追加</option>
                <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
              </select>
              <textarea class="form-control" v-model="config.listen_interface" rows="3" placeholder="每行一个接口名" title="监听接口列表" />
            </div>
          </div>
        </template>

        <template #network>
          <div class="form-row"><label class="form-label">保护网络</label><textarea class="form-control" v-model="config.network" rows="5" placeholder="每行一个 IPv4/IPv6 网络" title="需要保护的 IPv4/IPv6 网络列表" /></div>
          <div class="form-row"><label class="form-label">排除网络</label><textarea class="form-control" v-model="config.excluded_network" rows="5" placeholder="每行一个 IPv4/IPv6 网络" title="不参与防护的 IPv4/IPv6 网络列表" /></div>
        </template>

        <template #threshold>
          <div class="form-row"><label class="form-label">TCP 包速率</label><input type="number" min="0" class="form-control" v-model="config.threshold.tcp" placeholder="packets-per-second" title="TCP 每秒包数阈值" /></div>
          <div class="form-row"><label class="form-label">UDP 包速率</label><input type="number" min="0" class="form-control" v-model="config.threshold.udp" placeholder="packets-per-second" title="UDP 每秒包数阈值" /></div>
          <div class="form-row"><label class="form-label">ICMP 包速率</label><input type="number" min="0" class="form-control" v-model="config.threshold.icmp" placeholder="packets-per-second" title="ICMP 每秒包数阈值" /></div>
          <div class="form-row"><label class="form-label">通用包速率</label><input type="number" min="0" class="form-control" v-model="config.threshold.general" placeholder="packets-per-second" title="通用协议每秒包数阈值" /></div>
        </template>

        <template #sflow>
          <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="config.sflow.port" placeholder="sFlow 端口" title="sFlow 监听端口" /></div>
          <div class="form-row"><label class="form-label">收集器</label><textarea class="form-control" v-model="config.sflow.collector" rows="3" placeholder="每行一个收集器地址" title="sFlow 收集器地址列表" /></div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
