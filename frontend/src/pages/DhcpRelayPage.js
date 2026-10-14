import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

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

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('dhcprelay.validation.ipv4Format');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('dhcprelay.validation.ipv4Format');
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
    const { t } = useI18n();
    const configStore = useConfigStore();
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
        const err = validateIPv4(ip, t);
        if (err) return showError({ message: t('dhcprelay.validation.serverAddressInvalid', { ip }) });
      }
      if (isPresent(config.value.relay_options?.hop_count)) {
        const hop = parseInt(config.value.relay_options.hop_count, 10);
        if (isNaN(hop) || hop < 1 || hop > 255) return showError({ message: t('dhcprelay.validation.hopCountRange') });
      }
      if (isPresent(config.value.relay_options?.max_size)) {
        const size = parseInt(config.value.relay_options.max_size, 10);
        if (isNaN(size) || size < 64 || size > 1400) return showError({ message: t('dhcprelay.validation.maxSizeRange') });
      }

      saving.value = true;
      try {
        await configStore.setConfig('service dhcp-relay', dhcpRelayToConfig(config.value));
        configStore.markPending();
        await configStore.checkSessionChanged();
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
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      load, save, RELAY_AGENTS_PACKETS_OPTIONS,
    };
  },
  components: { TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('dhcprelay.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('dhcprelay.tabs.basic') },
        { key: 'relay-options', title: t('dhcprelay.tabs.relayOptions') }
      ]">

        <template #basic>
          <div class="form-row"><label class="form-label">{{ t('dhcprelay.labels.disable') }}</label><input type="checkbox" v-model="config.disable" :title="t('dhcprelay.tips.disable')" /></div>
          <div class="form-row">
            <label class="form-label">{{ t('dhcprelay.labels.interface') }}</label>
            <select class="form-control" v-model="config.interface" :title="t('dhcprelay.tips.interface')">
              <option value="">{{ t('dhcprelay.options.notSelected') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('dhcprelay.labels.listenInterface') }}</label>
            <select class="form-control" v-model="config.listen_interface" :title="t('dhcprelay.tips.listenInterface')">
              <option value="">{{ t('dhcprelay.options.notSelected') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('dhcprelay.labels.upstreamInterface') }}</label>
            <select class="form-control" v-model="config.upstream_interface" :title="t('dhcprelay.tips.upstreamInterface')">
              <option value="">{{ t('dhcprelay.options.notSelected') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('dhcprelay.labels.dhcpServer') }}</label>
            <textarea class="form-control" v-model="config.servers" rows="3" :placeholder="t('dhcprelay.placeholders.dhcpServer')" :title="t('dhcprelay.tips.dhcpServer')" />
          </div>
        </template>

        <template #relay-options>
          <div class="form-row"><label class="form-label">{{ t('dhcprelay.labels.hopCount') }}</label><input type="number" min="1" max="255" class="form-control" v-model="config.relay_options.hop_count" :placeholder="t('dhcprelay.placeholders.hopCount')" :title="t('dhcprelay.tips.hopCount')" /></div>
          <div class="form-row"><label class="form-label">{{ t('dhcprelay.labels.maxPacketSize') }}</label><input type="number" min="64" max="1400" class="form-control" v-model="config.relay_options.max_size" :placeholder="t('dhcprelay.placeholders.maxSize')" :title="t('dhcprelay.tips.maxSize')" /></div>
          <div class="form-row"><label class="form-label">{{ t('dhcprelay.labels.relayAgentsPackets') }}</label>
            <select class="form-control" v-model="config.relay_options.relay_agents_packets" :title="t('dhcprelay.tips.relayAgentsPackets')">
              <option value="">{{ t('dhcprelay.options.notSelectedDefaultForward') }}</option>
              <option v-for="o in RELAY_AGENTS_PACKETS_OPTIONS" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
        </template>
      </TabGroup>

      <div style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>
    </div>
  `,
});
