import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

const LEAP_SECOND_OPTIONS = ['ignore', 'smear', 'system', 'timezone'];

const ALLOW_CLIENT_OPTIONS = [
  '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16',
  '::1/128', 'fc00::/7', 'fe80::/10',
];

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

function firstValue(val) {
  const arr = toArray(val);
  return arr.length ? String(arr[0]) : '';
}

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  if (!validateIPv4(value)) return '';
  if (!validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function validateIPPrefix(value) {
  if (!value) return '';
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = parseInt(prefix, 10);
    if (isNaN(p)) return '前缀必须为数字';
    const v4Err = validateIPv4(ip);
    const v6Err = validateIPv6(ip);
    if (!v4Err && (p < 0 || p > 32)) return 'IPv4 前缀范围 0-32';
    if (!v6Err && (p < 0 || p > 128)) return 'IPv6 前缀范围 0-128';
    if (v4Err && v6Err) return 'IP 地址或前缀格式错误';
    return '';
  }
  return validateIP(value);
}

function ntpToForm(data = {}) {
  const servers = [];
  const serverData = data.server || {};
  for (const [name, attrs] of Object.entries(serverData)) {
    servers.push({
      name,
      prefer: attrs.prefer !== undefined,
      noselect: attrs.noselect !== undefined,
      pool: attrs.pool !== undefined,
      nts: attrs.nts !== undefined,
    });
  }
  return {
    leap_second: data['leap-second'] || 'timezone',
    interface: firstValue(data.interface),
    listen_address: toArray(data['listen-address']),
    allow_client: toArray(data['allow-client']?.address),
    vrf: data.vrf || '',
    servers,
  };
}

function ntpToConfig(form) {
  const result = {};
  if (isPresent(form.leap_second)) result['leap-second'] = String(form.leap_second);
  if (isPresent(form.interface)) result.interface = String(form.interface);

  if (form.listen_address?.length) result['listen-address'] = [...form.listen_address];

  if (form.allow_client?.length) result['allow-client'] = { address: [...form.allow_client] };

  if (isPresent(form.vrf)) result.vrf = String(form.vrf);

  const serverObj = {};
  for (const s of form.servers || []) {
    if (!s.name) continue;
    const attrs = {};
    if (s.prefer) attrs.prefer = '';
    if (s.noselect) attrs.noselect = '';
    if (s.pool) attrs.pool = '';
    if (s.nts) attrs.nts = '';
    serverObj[s.name] = attrs;
  }
  if (Object.keys(serverObj).length) result.server = serverObj;

  return result;
}

export default defineComponent({
  name: 'NtpPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(ntpToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    const modalVisible = ref(false);
    const editingIndex = ref(-1);
    const serverForm = ref({ name: '', prefer: false, noselect: false, pool: false, nts: false });

    const localAddresses = computed(() => {
      const addresses = new Set();
      for (const iface of interfaces.value) {
        for (const ip of toArray(iface.ipv4_address)) {
          addresses.add(String(ip).split('/')[0]);
        }
        for (const ip of toArray(iface.ipv6_address)) {
          addresses.add(String(ip).split('/')[0]);
        }
      }
      addresses.add('127.0.0.1');
      addresses.add('::1');
      return Array.from(addresses).filter(Boolean).sort();
    });

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = res.interfaces || [];
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => {
      if (activeTab.value === 'server') return 'service ntp server';
      return 'service ntp';
    });

    const serverColumns = [
      { key: 'name', title: '地址' },
      { key: 'prefer', title: '首选', render: v => v ? '✓' : '' },
      { key: 'noselect', title: '不选用', render: v => v ? '✓' : '' },
      { key: 'pool', title: '池', render: v => v ? '✓' : '' },
      { key: 'nts', title: 'NTS', render: v => v ? '✓' : '' },
    ];

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service ntp', true);
        config.value = ntpToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      for (const ip of config.value.listen_address || []) {
        const err = validateIP(ip);
        if (err) return alert(`监听地址 ${ip}：${err}`);
      }

      for (const item of config.value.allow_client || []) {
        const err = validateIPPrefix(item);
        if (err) return alert(`允许客户端 ${item}：${err}`);
      }

      saving.value = true;
      try {
        await configApi.set('service ntp', ntpToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createServer() {
      editingIndex.value = -1;
      serverForm.value = { name: '', prefer: false, noselect: false, pool: false, nts: false };
      modalVisible.value = true;
    }

    function editServer(row) {
      editingIndex.value = config.value.servers.findIndex(s => s.name === row.name);
      serverForm.value = { ...row };
      modalVisible.value = true;
    }

    function deleteServer(selectedNames) {
      if (!selectedNames.length) return;
      if (!confirm('确认删除选中的 NTP 服务器？')) return;
      const toDelete = new Set(selectedNames);
      config.value.servers = config.value.servers.filter(s => !toDelete.has(s.name));
    }

    function saveServer() {
      const name = String(serverForm.value.name || '').trim();
      if (!name) return alert('请输入 NTP 服务器地址');

      const duplicate = config.value.servers.find((s, i) => s.name === name && i !== editingIndex.value);
      if (duplicate) return alert('该地址已存在');

      const newServer = {
        name,
        prefer: !!serverForm.value.prefer,
        noselect: !!serverForm.value.noselect,
        pool: !!serverForm.value.pool,
        nts: !!serverForm.value.nts,
      };

      if (editingIndex.value >= 0) {
        config.value.servers.splice(editingIndex.value, 1, newServer);
      } else {
        config.value.servers.push(newServer);
      }
      modalVisible.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, localAddresses, commandPath,
      serverColumns, modalVisible, serverForm,
      load, save, createServer, editServer, deleteServer, saveServer,
      LEAP_SECOND_OPTIONS, ALLOW_CLIENT_OPTIONS,
    };
  },
  components: { DualListSelector, TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'server', title: 'NTP服务器' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" title="NTP 闰秒处理方式，默认 timezone">闰秒处理</label>
            <div style="flex:1;">
              <select class="form-control" v-model="config.leap_second" title="NTP 闰秒处理方式，默认 timezone">
                <option v-for="o in LEAP_SECOND_OPTIONS" :key="o" :value="o">{{ o }}</option>
              </select>
              <div class="form-hint">默认：timezone（使用 UTC 时区数据库判断下一次闰秒）</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">接口</label>
            <select class="form-control" v-model="config.interface" title="NTP 服务绑定的接口">
              <option value="">未选择</option>
              <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">{{ iface.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" title="NTP 服务监听的本地地址">监听地址</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.listen_address" :options="localAddresses" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="允许访问 NTP 服务的客户端地址或网络">允许客户端</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.allow_client" :options="ALLOW_CLIENT_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">VRF</label>
            <input type="text" class="form-control" v-model="config.vrf" placeholder="VRF 名称" title="NTP 服务所属 VRF" />
          </div>
        </template>

        <template #server>
          <DataTable :columns="serverColumns" :data="config.servers" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="createServer" @edit="editServer" @delete="deleteServer" />
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="modalVisible" :title="editingIndex >= 0 ? '编辑 NTP 服务器' : '添加 NTP 服务器'" width="500px" @confirm="saveServer">
        <div class="form-row">
          <label class="form-label">地址</label>
          <input type="text" class="form-control" v-model="serverForm.name" placeholder="NTP 服务器地址" />
        </div>
        <div class="form-row">
          <label class="form-label">首选</label>
          <input type="checkbox" v-model="serverForm.prefer" title="优先使用此服务器" />
        </div>
        <div class="form-row">
          <label class="form-label">不选用</label>
          <input type="checkbox" v-model="serverForm.noselect" title="不选用此服务器" />
        </div>
        <div class="form-row">
          <label class="form-label">池</label>
          <input type="checkbox" v-model="serverForm.pool" title="此地址为 NTP 服务器池" />
        </div>
        <div class="form-row">
          <label class="form-label">NTS</label>
          <input type="checkbox" v-model="serverForm.nts" title="使用 Network Time Security" />
        </div>
      </DraggableModal>
    </div>
  `,
});
