import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DataTable from '/src/components/Table/DataTable.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const MODE_OPTIONS = ['load', 'set'];

const SECTION_TYPES = {
  firewall: [],
  nat: [],
  nat66: [],
  pki: [],
  policy: [],
  vpn: [],
  vrf: [],
  interfaces: ['bonding', 'bridge', 'dummy', 'ethernet', 'geneve', 'input', 'l2tpv3', 'loopback', 'macsec', 'openvpn', 'pppoe', 'pseudo-ethernet', 'sstpc', 'tunnel', 'virtual-ethernet', 'vti', 'vxlan', 'wireguard', 'wireless', 'wwan'],
  protocols: ['babel', 'bfd', 'bgp', 'failover', 'igmp-proxy', 'isis', 'mpls', 'nhrp', 'ospf', 'ospfv3', 'pim', 'pim6', 'rip', 'ripng', 'rpki', 'segment-routing', 'static'],
  qos: ['interface', 'policy'],
  service: ['console-server', 'dhcp-relay', 'dhcp-server', 'dhcpv6-relay', 'dhcpv6-server', 'dns', 'lldp', 'mdns', 'monitoring', 'ndp-proxy', 'ntp', 'snmp', 'tftp-server', 'webproxy'],
  system: ['conntrack', 'flow-accounting', 'option', 'sflow', 'static-host-mapping', 'sysctl', 'time-zone'],
};

const SECTION_NAMES = Object.keys(SECTION_TYPES);

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function validateRequired(value, msg) {
  if (!isPresent(value)) return msg;
  return '';
}

function validateIPv4(value) {
  if (!value) return '';
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!re.test(value)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateFQDN(value) {
  if (!value) return '';
  const re = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,63}$/;
  if (!re.test(value)) return '域名格式错误';
  return '';
}

function validateHostOrIP(value) {
  if (!value) return '';
  if (!validateIPv4(value) || !validateIPv6(value) || !validateFQDN(value)) return '';
  return '请输入有效的 IPv4/IPv6 地址或域名';
}

function validateRange(value, min, max, name) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < min || n > max) return `${name} 范围为 ${min}-${max}`;
  return '';
}

function sectionRowKey(item) {
  return `${item.section}-${item.sub || ''}`;
}

function configSyncToForm(data = {}) {
  const secondary = data.secondary || {};
  const sections = [];
  for (const [section, value] of Object.entries(data.section || {})) {
    if (!SECTION_NAMES.includes(section)) continue;
    if (typeof value !== 'object' || value === null) continue;
    const subs = Object.keys(value).filter(k => SECTION_TYPES[section].includes(k));
    if (!subs.length && SECTION_TYPES[section].length === 0) {
      sections.push({ section, sub: '' });
    } else {
      for (const sub of subs) {
        sections.push({ section, sub });
      }
    }
  }
  return {
    mode: data.mode || 'set',
    secondary: {
      address: secondary.address || '',
      key: secondary.key || '',
      port: secondary.port !== undefined ? String(secondary.port) : '443',
      timeout: secondary.timeout !== undefined ? String(secondary.timeout) : '60',
    },
    sections,
  };
}

function configSyncToConfig(form) {
  const result = {};
  if (isPresent(form.mode)) result.mode = String(form.mode);
  const secondary = {};
  if (isPresent(form.secondary?.address)) secondary.address = String(form.secondary.address);
  if (isPresent(form.secondary?.key)) secondary.key = String(form.secondary.key);
  if (isPresent(form.secondary?.port)) secondary.port = String(form.secondary.port);
  if (isPresent(form.secondary?.timeout)) secondary.timeout = String(form.secondary.timeout);
  if (Object.keys(secondary).length) result.secondary = secondary;
  const section = {};
  for (const item of form.sections || []) {
    if (!SECTION_NAMES.includes(item.section)) continue;
    const subs = SECTION_TYPES[item.section];
    if (!subs.length) {
      section[item.section] = {};
    } else if (item.sub && subs.includes(item.sub)) {
      if (!section[item.section]) section[item.section] = {};
      section[item.section][item.sub] = {};
    }
  }
  if (Object.keys(section).length) result.section = section;
  return result;
}

function defaultSection() {
  return { section: '', sub: '' };
}

export default defineComponent({
  name: 'ConfigSyncPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configSyncToForm());
    const commandPath = 'service config-sync';
    const activeTab = ref('basic');

    const sectionColumns = [
      { key: 'section', title: '配置段' },
      { key: 'sub', title: '子类型' },
    ];

    const sectionRows = computed(() => (config.value.sections || []).map(item => ({
      _key: sectionRowKey(item),
      section: item.section,
      sub: item.sub || '-',
    })));

    const sectionOptions = computed(() => SECTION_NAMES);
    const subOptions = computed(() => {
      if (!editing.value.section) return [];
      return SECTION_TYPES[editing.value.section] || [];
    });

    const showModal = ref(false);
    const modalTitle = ref('');
    const editing = ref(defaultSection());
    const editingKey = ref('');

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service config-sync', true);
        config.value = configSyncToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    function openCreate() {
      editing.value = defaultSection();
      editingKey.value = '';
      modalTitle.value = '添加配置段';
      showModal.value = true;
    }

    function openEdit(row) {
      const found = config.value.sections.find(s => sectionRowKey(s) === row._key);
      if (!found) return;
      editing.value = { ...found };
      editingKey.value = row._key;
      modalTitle.value = '编辑配置段';
      showModal.value = true;
    }

    function saveSection() {
      const item = editing.value;
      const err = validateRequired(item.section, '请选择配置段')
        || (SECTION_TYPES[item.section]?.length && !item.sub ? '请选择子类型' : '');
      if (err) return alert(err);
      const list = config.value.sections;
      const key = sectionRowKey(item);
      const idx = list.findIndex(s => sectionRowKey(s) === editingKey.value);
      if (idx >= 0) {
        if (list.some((s, i) => i !== idx && sectionRowKey(s) === key)) {
          return alert('该配置段已存在');
        }
        list[idx] = { section: item.section, sub: item.sub || '' };
      } else {
        if (list.some(s => sectionRowKey(s) === key)) {
          return alert('该配置段已存在');
        }
        list.push({ section: item.section, sub: item.sub || '' });
      }
      showModal.value = false;
    }

    function deleteSections(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?._key];
      if (!keys.length) return;
      const names = keys.map(k => {
        const found = config.value.sections.find(s => sectionRowKey(s) === k);
        return found ? (found.sub ? `${found.section} / ${found.sub}` : found.section) : '';
      }).filter(Boolean);
      if (!names.length) return;
      if (!confirm(`确认删除配置段 ${names.map(n => `"${n}"`).join(', ')}？`)) return;
      config.value.sections = config.value.sections.filter(s => !keys.includes(sectionRowKey(s)));
    }

    function validate() {
      const c = config.value;
      const err = validateRequired(c.mode, '请选择同步模式')
        || validateRequired(c.secondary.address, '请输入从服务器地址')
        || validateHostOrIP(c.secondary.address)
        || validateRequired(c.secondary.key, '请输入 HTTP API key')
        || validateRange(c.secondary.port, 1, 65535, '端口')
        || validateRange(c.secondary.timeout, 1, 3600, '超时时间');
      if (err) return err;
      return '';
    }

    async function save() {
      const err = validate();
      if (err) return alert(err);
      saving.value = true;
      saved.value = false;
      try {
        const value = configSyncToConfig(config.value);
        const paths = ['service config-sync'];
        for (const p of paths) {
          try { await configApi.delete(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configApi.set('service config-sync', value);
        }
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
      loading, saving, saved, config, commandPath, activeTab,
      sectionColumns, sectionRows, sectionOptions, subOptions,
      showModal, modalTitle, editing,
      MODE_OPTIONS,
      load, save, openCreate, openEdit, saveSection, deleteSections,
    };
  },
  components: { ToolbarButton, DraggableModal, DataTable, CommandPreview, TabGroup },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'secondary', title: '从服务器' },
        { key: 'sections', title: '同步配置段' }
      ]">
        <template #basic>
          <div class="form-row"><label class="form-label">同步模式</label><select class="form-control" v-model="config.mode"><option v-for="m in MODE_OPTIONS" :key="m" :value="m">{{ m }}</option></select></div>
        </template>

        <template #secondary>
          <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="config.secondary.address" placeholder="IPv4 / IPv6 / 域名" /></div>
          <div class="form-row"><label class="form-label">HTTP API Key</label><input class="form-control" v-model="config.secondary.key" placeholder="API key" /></div>
          <div class="form-row"><label class="form-label">端口</label><input type="number" min="1" max="65535" class="form-control" v-model="config.secondary.port" placeholder="443" /></div>
          <div class="form-row"><label class="form-label">超时时间 (秒)</label><input type="number" min="1" max="3600" class="form-control" v-model="config.secondary.timeout" placeholder="60" /></div>
        </template>

        <template #sections>
          <div class="data-table-wrapper">
            <DataTable :columns="sectionColumns" :data="sectionRows" row-key="_key" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openCreate" @edit="openEdit" @delete="deleteSections" @refresh="load"></DataTable>
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="showModal" :title="modalTitle">
        <div class="form-row"><label class="form-label">配置段</label><select class="form-control" v-model="editing.section" @change="editing.sub = ''"><option value="">请选择</option><option v-for="s in sectionOptions" :key="s" :value="s">{{ s }}</option></select></div>
        <div class="form-row" v-if="subOptions.length"><label class="form-label">子类型</label><select class="form-control" v-model="editing.sub"><option value="">请选择</option><option v-for="s in subOptions" :key="s" :value="s">{{ s }}</option></select></div>
        <template #footer>
          <ToolbarButton @click="showModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveSection">保存</ToolbarButton>
        </template>
      </DraggableModal>

      <CommandPreview :path="commandPath"></CommandPreview>
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
