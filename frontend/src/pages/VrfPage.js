import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const PROTOCOL_OPTIONS = [
  { value: 'any', label: 'any' },
  { value: 'babel', label: 'Babel' },
  { value: 'bgp', label: 'BGP' },
  { value: 'connected', label: 'Connected' },
  { value: 'eigrp', label: 'EIGRP' },
  { value: 'isis', label: 'IS-IS' },
  { value: 'kernel', label: 'Kernel' },
  { value: 'ospf', label: 'OSPF' },
  { value: 'rip', label: 'RIP' },
  { value: 'static', label: 'Static' },
  { value: 'table', label: 'Table' },
];

const TAB_KEYS = ['basic', 'ip', 'ipv6'];

export default defineComponent({
  name: 'VrfPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const configStore = useConfigStore();
    const vrfList = ref([]);
    const loading = ref(false);
    const selectedNames = ref([]);

    const modalVisible = ref(false);
    const editingVrf = ref(null);
    const editingOriginalName = ref('');
    const activeTab = ref('basic');
    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const path = computed(() => 'vrf');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'name', title: t('vrf.columns.name') },
      { key: 'description', title: t('vrf.columns.description') },
      { key: 'table', title: t('vrf.columns.table') },
      { key: 'vni', title: 'VNI' },
    ];

    const basicSchema = computed(() => [
      { key: 'name', title: t('vrf.form.name'), type: 'text', required: true, placeholder: t('vrf.form.namePlaceholder') },
      { key: 'description', title: t('vrf.form.description'), type: 'text' },
      { key: 'disable', title: t('vrf.form.disable'), type: 'checkbox' },
      { key: 'table', title: t('vrf.form.table'), type: 'number', min: 100, max: 65535, placeholder: '100-65535', help: t('vrf.form.tableHelp') },
      { key: 'vni', title: 'VNI', type: 'number', placeholder: 'Virtual Network Identifier' },
    ]);

    const TABS = computed(() => [
      { key: 'basic', title: t('vrf.tabs.basic') },
      { key: 'ip', title: 'IPv4' },
      { key: 'ipv6', title: 'IPv6' },
    ]);

    const tabSchemas = computed(() => ({
      basic: basicSchema.value,
    }));

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, false);
        console.log('VRF API response:', res);
        const raw = res.data || {};
        // API returns { name: { vrf01: {...}, vrf02: {...} } }
        const nameData = raw.name || raw;
        console.log('VRF name data:', nameData);
        const result = [];
        for (const [name, attrs] of Object.entries(nameData)) {
          if (typeof attrs === 'object' && attrs !== null) {
            result.push({
              id: name,
              name,
              description: attrs.description || '',
              table: attrs.table || '',
              vni: attrs.vni || '',
              _raw: attrs,
            });
          }
        }
        console.log('VRF parsed result:', result);
        result.sort((a, b) => a.name.localeCompare(b.name));
        vrfList.value = result;
        if (selectedNames.value.length && !result.some(n => n.name === selectedNames.value[0])) {
          selectedNames.value = [];
        }
      } catch (e) {
        console.error('VRF load error:', e);
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });
    watch(() => route.path, () => {
      selectedNames.value = [];
      load();
    });

    function emptyVrf() {
      return {
        name: '', description: '', disable: false, table: '', vni: '',
        bindToAll: false,
        ipDisableForwarding: false,
        ipNhtNoResolveViaDefault: false,
        ipProtocols: [],
        ipv6DisableForwarding: false,
        ipv6NhtNoResolveViaDefault: false,
        ipv6Protocols: [],
      };
    }

    function flattenVrfData(name, attrs) {
      const ip = attrs.ip || {};
      const ipv6 = attrs.ipv6 || {};
      const ipProtocols = [];
      const ipv6Protocols = [];
      
      if (ip.protocol) {
        for (const [proto, pattrs] of Object.entries(ip.protocol)) {
          ipProtocols.push({
            protocol: proto,
            routeMap: pattrs['route-map'] || '',
          });
        }
      }
      
      if (ipv6.protocol) {
        for (const [proto, pattrs] of Object.entries(ipv6.protocol)) {
          ipv6Protocols.push({
            protocol: proto,
            routeMap: pattrs['route-map'] || '',
          });
        }
      }

      return {
        name,
        description: attrs.description || '',
        disable: !!attrs.disable,
        table: attrs.table || '',
        vni: attrs.vni || '',
        ipDisableForwarding: !!ip['disable-forwarding'],
        ipNhtNoResolveViaDefault: !!(ip.nht && ip.nht['no-resolve-via-default']),
        ipProtocols,
        ipv6DisableForwarding: !!ipv6['disable-forwarding'],
        ipv6NhtNoResolveViaDefault: !!(ipv6.nht && ipv6.nht['no-resolve-via-default']),
        ipv6Protocols,
      };
    }

    function unflattenVrfData(v) {
      const result = {};
      if (v.description) result.description = v.description;
      if (v.disable) result.disable = {};
      if (v.table) result.table = v.table;
      if (v.vni) result.vni = v.vni;

      const ip = {};
      if (v.ipDisableForwarding) ip['disable-forwarding'] = {};
      if (v.ipNhtNoResolveViaDefault) {
        ip.nht = { 'no-resolve-via-default': {} };
      }
      if (v.ipProtocols?.length) {
        const protocols = {};
        for (const p of v.ipProtocols) {
          if (p.protocol) {
            protocols[p.protocol] = {};
            if (p.routeMap) protocols[p.protocol]['route-map'] = p.routeMap;
          }
        }
        ip.protocol = protocols;
      }
      if (Object.keys(ip).length) result.ip = ip;

      const ipv6 = {};
      if (v.ipv6DisableForwarding) ipv6['disable-forwarding'] = {};
      if (v.ipv6NhtNoResolveViaDefault) {
        ipv6.nht = { 'no-resolve-via-default': {} };
      }
      if (v.ipv6Protocols?.length) {
        const protocols = {};
        for (const p of v.ipv6Protocols) {
          if (p.protocol) {
            protocols[p.protocol] = {};
            if (p.routeMap) protocols[p.protocol]['route-map'] = p.routeMap;
          }
        }
        ipv6.protocol = protocols;
      }
      if (Object.keys(ipv6).length) result.ipv6 = ipv6;

      return result;
    }

    function create() {
      editingVrf.value = emptyVrf();
      editingOriginalName.value = '';
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    function edit() {
      if (!selectedNames.value.length) return showError({ message: t('vrf.messages.selectOne') });
      if (selectedNames.value.length > 1) return showError({ message: t('vrf.messages.selectOne') });
      const vrf = vrfList.value.find(n => n.name === selectedNames.value[0]);
      if (!vrf) return;
      editingVrf.value = flattenVrfData(vrf.name, vrf._raw || {});
      editingOriginalName.value = vrf.name;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function remove() {
      if (!selectedNames.value.length) return showError({ message: t('vrf.messages.selectOne') });
      pendingDeleteNames.value = [...selectedNames.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemove() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedNames.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function save() {
      if (!editingVrf.value.name) return showError({ message: t('vrf.messages.enterName') });
      const original = editingOriginalName.value;
      if (!original && vrfList.value.some(n => n.name === editingVrf.value.name)) {
        return showError({ message: t('vrf.messages.nameExists') });
      }
      const value = unflattenVrfData(editingVrf.value);
      try {
        if (original && original !== editingVrf.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} ${editingVrf.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} ${editingVrf.value.name}`, value);
          configStore.markPending();
        }
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function addIpProtocol() {
      if (!editingVrf.value) return;
      editingVrf.value.ipProtocols.push({ protocol: '', routeMap: '' });
    }

    function removeIpProtocol(index) {
      editingVrf.value.ipProtocols.splice(index, 1);
    }

    function addIpv6Protocol() {
      if (!editingVrf.value) return;
      editingVrf.value.ipv6Protocols.push({ protocol: '', routeMap: '' });
    }

    function removeIpv6Protocol(index) {
      editingVrf.value.ipv6Protocols.splice(index, 1);
    }

    return {
      t,
      vrfList, loading, selectedNames,
      modalVisible, editingVrf, editingOriginalName, activeTab,
      deleteModalVisible, pendingDeleteNames,
      columns, tabSchemas, path, writeDisabled, PROTOCOL_OPTIONS, TABS,
      load, create, edit, remove, confirmRemove, save,
      addIpProtocol, removeIpProtocol, addIpv6Protocol, removeIpv6Protocol,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">{{ t('vrf.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selectedNames.length || selectedNames.length > 1">{{ t('vrf.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selectedNames.length">{{ t('vrf.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('vrf.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="columns" :data="vrfList" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalName ? t('vrf.buttons.edit') : t('vrf.buttons.create')" width="800px" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="TABS">
          <template #basic>
            <ConfigForm v-model="editingVrf" :schema="tabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #ip>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">{{ t('vrf.form.disableIpForwarding') }}</label>
                <input type="checkbox" v-model="editingVrf.ipDisableForwarding" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('vrf.form.nhtNoResolveViaDefault') }}</label>
                <input type="checkbox" v-model="editingVrf.ipNhtNoResolveViaDefault" style="margin-left:8px;" />
              </div>
              <div class="form-section-title">{{ t('vrf.form.protocolFilter') }}</div>
              <div v-for="(proto, index) in editingVrf.ipProtocols" :key="index" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <select class="form-control" v-model="proto.protocol" style="flex:1;">
                  <option value="">{{ t('vrf.form.selectProtocol') }}</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input type="text" class="form-control" v-model="proto.routeMap" :placeholder="t('vrf.form.routeMapPlaceholder')" style="flex:1;" />
                <ToolbarButton icon="delete" @click="removeIpProtocol(index)" :disabled="writeDisabled">{{ t('vrf.buttons.delete') }}</ToolbarButton>
              </div>
              <ToolbarButton icon="create" @click="addIpProtocol" :disabled="writeDisabled">{{ t('vrf.buttons.addProtocol') }}</ToolbarButton>
            </div>
          </template>
          <template #ipv6>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">{{ t('vrf.form.disableIpv6Forwarding') }}</label>
                <input type="checkbox" v-model="editingVrf.ipv6DisableForwarding" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('vrf.form.nhtNoResolveViaDefault') }}</label>
                <input type="checkbox" v-model="editingVrf.ipv6NhtNoResolveViaDefault" style="margin-left:8px;" />
              </div>
              <div class="form-section-title">{{ t('vrf.form.protocolFilter') }}</div>
              <div v-for="(proto, index) in editingVrf.ipv6Protocols" :key="index" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <select class="form-control" v-model="proto.protocol" style="flex:1;">
                  <option value="">{{ t('vrf.form.selectProtocol') }}</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input type="text" class="form-control" v-model="proto.routeMap" :placeholder="t('vrf.form.routeMapPlaceholder')" style="flex:1;" />
                <ToolbarButton icon="delete" @click="removeIpv6Protocol(index)" :disabled="writeDisabled">{{ t('vrf.buttons.delete') }}</ToolbarButton>
              </div>
              <ToolbarButton icon="create" @click="addIpv6Protocol" :disabled="writeDisabled">{{ t('vrf.buttons.addProtocol') }}</ToolbarButton>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('vrf.modals.confirmDelete')" width="400px" @confirm="confirmRemove">
        <div>{{ t('vrf.modals.deleteConfirmMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
