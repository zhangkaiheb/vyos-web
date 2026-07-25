import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const RELAY_AGENTS_PACKETS_OPTIONS = ['append', 'replace', 'forward', 'discard'];

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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function firstValue(val) {
  const arr = toArray(val);
  return arr.length ? String(arr[0]) : '';
}

function dhcpRelayToForm(data = {}) {
  const relayOptions = data['relay-options'] || {};
  return {
    disable: data.disable !== undefined,
    interface: firstValue(data.interface),
    listen_interface: firstValue(data['listen-interface']),
    upstream_interface: firstValue(data['upstream-interface']),
    servers: joinMembers(data.server),
    relay_options: {
      hop_count: relayOptions['hop-count'] !== undefined ? String(relayOptions['hop-count']) : '',
      max_size: relayOptions['max-size'] !== undefined ? String(relayOptions['max-size']) : '',
      relay_agents_packets: relayOptions['relay-agents-packets'] || '',
    },
  };
}

function dhcpRelayToConfig(form) {
  const result = {};
  if (form.disable) result.disable = '';
  if (isPresent(form.interface)) result.interface = String(form.interface);
  if (isPresent(form.listen_interface)) result['listen-interface'] = String(form.listen_interface);
  if (isPresent(form.upstream_interface)) result['upstream-interface'] = String(form.upstream_interface);
  const servers = splitMembers(form.servers);
  if (servers.length) result.server = servers;

  const relayOptions = {};
  if (isPresent(form.relay_options?.hop_count)) relayOptions['hop-count'] = String(form.relay_options.hop_count);
  if (isPresent(form.relay_options?.max_size)) relayOptions['max-size'] = String(form.relay_options.max_size);
  if (isPresent(form.relay_options?.relay_agents_packets)) relayOptions['relay-agents-packets'] = String(form.relay_options.relay_agents_packets);

  if (Object.keys(relayOptions).length) {
    result['relay-options'] = relayOptions;
  }
  return result;
}

export default defineComponent({
  name: 'DhcpRelayPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dhcpRelayToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      if (activeTab.value === 'relay-options') return 'service dhcp-relay relay-options';
      return 'service dhcp-relay';
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dhcp-relay', true);
        config.value = dhcpRelayToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const servers = splitMembers(config.value.servers);
      for (const ip of servers) {
        const err = validateIPv4(ip);
        if (err) return alert(`DHCP 服务器地址 ${ip} 格式错误`);
      }
      if (isPresent(config.value.relay_options?.hop_count)) {
        const hop = parseInt(config.value.relay_options.hop_count, 10);
        if (isNaN(hop) || hop < 1 || hop > 255) return alert('Hop Count 范围为 1-255');
      }
      if (isPresent(config.value.relay_options?.max_size)) {
        const size = parseInt(config.value.relay_options.max_size, 10);
        if (isNaN(size) || size < 64 || size > 1400) return alert('最大报文大小范围为 64-1400 字节，默认 576');
      }

      saving.value = true;
      try {
        await configApi.set('service dhcp-relay', dhcpRelayToConfig(config.value));
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
      load, save, RELAY_AGENTS_PACKETS_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'relay-options', title: '中继选项' }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="config.disable" title="禁用 DHCP 中继实例" /></div>
          <div class="form-row">
            <label class="form-label">接口</label>
            <select class="form-control" v-model="config.interface" title="接口用于 DHCP 中继">
              <option value="">未选择</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">监听接口</label>
            <select class="form-control" v-model="config.listen_interface" title="DHCP Relay Agent 监听请求的接口">
              <option value="">未选择</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">上游接口</label>
            <select class="form-control" v-model="config.upstream_interface" title="DHCP Relay Agent 转发请求的接口">
              <option value="">未选择</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">DHCP 服务器</label>
            <textarea class="form-control" v-model="config.servers" rows="3" placeholder="每行一个 DHCP 服务器 IPv4 地址" title="DHCP 服务器地址列表" />
          </div>
        </template>

        <template #relay-options>
          <div class="form-row"><label class="form-label">最大跳数 (Hop Count)</label><input type="number" min="1" max="255" class="form-control" v-model="config.relay_options.hop_count" placeholder="1-255，默认 10" title="报文最大跳数，默认 10" /></div>
          <div class="form-row"><label class="form-label">最大报文大小</label><input type="number" min="64" max="1400" class="form-control" v-model="config.relay_options.max_size" placeholder="64-1400，默认 576" title="最大报文大小（字节），范围 64-1400，默认 576" /></div>
          <div class="form-row"><label class="form-label">Relay Agent 选项处理策略</label>
            <select class="form-control" v-model="config.relay_options.relay_agents_packets" title="已携带 Relay Agent 选项的报文处理策略，默认 forward">
              <option value="">未选择（默认 forward）</option>
              <option v-for="o in RELAY_AGENTS_PACKETS_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
