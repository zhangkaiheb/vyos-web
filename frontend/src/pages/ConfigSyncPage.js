import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DataTable from '/src/components/Table/DataTable.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

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
    const { t } = useI18n();
    const configStore = useConfigStore();

    function validateIPv4(value) {
      if (!value) return '';
      const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!re.test(value)) return t('configSync.validation.ipv4');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('configSync.validation.ipv6');
      return '';
    }

    function validateFQDN(value) {
      if (!value) return '';
      const re = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9_\-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,63}$/;
      if (!re.test(value)) return t('configSync.validation.fqdn');
      return '';
    }

    function validateHostOrIP(value) {
      if (!value) return '';
      if (!validateIPv4(value) || !validateIPv6(value) || !validateFQDN(value)) return '';
      return t('configSync.validation.hostOrIP');
    }

    function validateRange(value, min, max, name) {
      if (value === '' || value === undefined || value === null) return '';
      const n = Number(value);
      if (isNaN(n) || n < min || n > max) return t('configSync.validation.range', { name, min, max });
      return '';
    }

    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configSyncToForm());
    const commandPath = 'service config-sync';
    const activeTab = ref('basic');

    const sectionColumns = [
      { key: 'section', title: t('configSync.column.section') },
      { key: 'sub', title: t('configSync.column.sub') },
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

    const deleteModalVisible = ref(false);
    const pendingDeleteKeys = ref([]);
    const pendingDeleteNames = ref([]);

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
      modalTitle.value = t('configSync.modal.addSection');
      showModal.value = true;
    }

    function openEdit(row) {
      const found = config.value.sections.find(s => sectionRowKey(s) === row._key);
      if (!found) return;
      editing.value = { ...found };
      editingKey.value = row._key;
      modalTitle.value = t('configSync.modal.editSection');
      showModal.value = true;
    }

    function saveSection() {
      const item = editing.value;
      const err = validateRequired(item.section, t('configSync.validation.sectionRequired'))
        || (SECTION_TYPES[item.section]?.length && !item.sub ? t('configSync.validation.subRequired') : '');
      if (err) return showError({ message: err });
      const list = config.value.sections;
      const key = sectionRowKey(item);
      const idx = list.findIndex(s => sectionRowKey(s) === editingKey.value);
      if (idx >= 0) {
        if (list.some((s, i) => i !== idx && sectionRowKey(s) === key)) {
          return showError({ message: t('configSync.error.sectionExists') });
        }
        list[idx] = { section: item.section, sub: item.sub || '' };
      } else {
        if (list.some(s => sectionRowKey(s) === key)) {
          return showError({ message: t('configSync.error.sectionExists') });
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
      pendingDeleteKeys.value = keys;
      pendingDeleteNames.value = names;
      deleteModalVisible.value = true;
    }

    function confirmDeleteSections() {
      deleteModalVisible.value = false;
      config.value.sections = config.value.sections.filter(s => !pendingDeleteKeys.value.includes(sectionRowKey(s)));
      pendingDeleteKeys.value = [];
      pendingDeleteNames.value = [];
    }

    function validate() {
      const c = config.value;
      const err = validateRequired(c.mode, t('configSync.validation.modeRequired'))
        || validateRequired(c.secondary.address, t('configSync.validation.addressRequired'))
        || validateHostOrIP(c.secondary.address)
        || validateRequired(c.secondary.key, t('configSync.validation.keyRequired'))
        || validateRange(c.secondary.port, 1, 65535, t('configSync.label.port'))
        || validateRange(c.secondary.timeout, 1, 3600, t('configSync.label.timeout'));
      if (err) return err;
      return '';
    }

    async function save() {
      const err = validate();
      if (err) return showError({ message: err });
      saving.value = true;
      saved.value = false;
      try {
        const value = configSyncToConfig(config.value);
        const paths = ['service config-sync'];
        for (const p of paths) {
          try { await configStore.deleteConfig(p); } catch (_) {}
        }
        if (Object.keys(value).length) {
          await configStore.setConfig('service config-sync', value);
        }
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

    return {t,
      
      loading, saving, saved, config, commandPath, activeTab,
      sectionColumns, sectionRows, sectionOptions, subOptions,
      showModal, modalTitle, editing,
      deleteModalVisible, pendingDeleteNames,
      MODE_OPTIONS,
      load, save, openCreate, openEdit, saveSection, deleteSections, confirmDeleteSections,
    };
  },
  components: { ToolbarButton, DraggableModal, DataTable, TabGroup },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('configSync.alert.saved') }}</div>

      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('configSync.tabs.basic') },
        { key: 'secondary', title: t('configSync.tabs.secondary') },
        { key: 'sections', title: t('configSync.tabs.sections') }
      ]">
        <template #basic>
          <div class="form-row"><label class="form-label">{{ t('configSync.label.syncMode') }}</label><select class="form-control" v-model="config.mode"><option v-for="m in MODE_OPTIONS" :key="m" :value="m">{{ m }}</option></select></div>
        </template>

        <template #secondary>
          <div class="form-row"><label class="form-label">{{ t('configSync.label.address') }}</label><input class="form-control" v-model="config.secondary.address" :placeholder="t('configSync.placeholder.address')" /></div>
          <div class="form-row"><label class="form-label">{{ t('configSync.label.httpApiKey') }}</label><input class="form-control" v-model="config.secondary.key" :placeholder="t('configSync.placeholder.apiKey')" /></div>
          <div class="form-row"><label class="form-label">{{ t('configSync.label.port') }}</label><input type="number" min="1" max="65535" class="form-control" v-model="config.secondary.port" placeholder="443" /></div>
          <div class="form-row"><label class="form-label">{{ t('configSync.label.timeout') }}</label><input type="number" min="1" max="3600" class="form-control" v-model="config.secondary.timeout" placeholder="60" /></div>
        </template>

        <template #sections>
          <div class="data-table-wrapper">
            <DataTable :columns="sectionColumns" :data="sectionRows" row-key="_key" :selectable="true"
              :actions="['create','edit','delete','refresh']"
              @create="openCreate" @edit="openEdit" @delete="deleteSections" @refresh="load"></DataTable>
          </div>
        </template>
      </TabGroup>

      <div v-if="activeTab === 'basic' || activeTab === 'secondary'" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showModal" :title="modalTitle">
        <div class="form-row"><label class="form-label">{{ t('configSync.label.section') }}</label><select class="form-control" v-model="editing.section" @change="editing.sub = ''"><option value="">{{ t('configSync.placeholder.select') }}</option><option v-for="s in sectionOptions" :key="s" :value="s">{{ s }}</option></select></div>
        <div class="form-row" v-if="subOptions.length"><label class="form-label">{{ t('configSync.label.sub') }}</label><select class="form-control" v-model="editing.sub"><option value="">{{ t('configSync.placeholder.select') }}</option><option v-for="s in subOptions" :key="s" :value="s">{{ s }}</option></select></div>
        <template #footer>
          <ToolbarButton @click="showModal = false">{{ t('configSync.button.cancel') }}</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveSection">{{ t('configSync.button.save') }}</ToolbarButton>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteModalVisible" :title="t('configSync.modal.confirmDelete')" width="400px" @confirm="confirmDeleteSections">
        <div>{{ t('configSync.message.confirmDeleteSections') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
