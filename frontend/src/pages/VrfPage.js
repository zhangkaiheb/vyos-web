import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

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

const TABS = [
  { key: 'basic', title: '基本' },
  { key: 'ip', title: 'IPv4' },
  { key: 'ipv6', title: 'IPv6' },
];

export default defineComponent({
  name: 'VrfPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const vrfList = ref([]);
    const loading = ref(false);
    const selectedNames = ref([]);

    const modalVisible = ref(false);
    const editingVrf = ref(null);
    const editingOriginalName = ref('');
    const activeTab = ref('basic');

    const path = computed(() => 'vrf');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const columns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
      { key: 'table', title: '路由表 ID' },
      { key: 'vni', title: 'VNI' },
    ];

    const basicSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: vrf01' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'disable', title: '禁用', type: 'checkbox' },
      { key: 'table', title: '路由表 ID', type: 'number', min: 100, max: 65535, placeholder: '100-65535', help: '关联的路由表 ID' },
      { key: 'vni', title: 'VNI', type: 'number', placeholder: 'Virtual Network Identifier' },
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
        // API 返回 { name: { vrf01: {...}, vrf02: {...} } }
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

    onMounted(load);
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
      if (!selectedNames.value.length) return showError({ message: '请选择一个 VRF' });
      if (selectedNames.value.length > 1) return showError({ message: '请选择一个 VRF' });
      const vrf = vrfList.value.find(n => n.name === selectedNames.value[0]);
      if (!vrf) return;
      editingVrf.value = flattenVrfData(vrf.name, vrf._raw || {});
      editingOriginalName.value = vrf.name;
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function remove() {
      if (!selectedNames.value.length) return showError({ message: '请选择一个 VRF' });
      if (!confirm('确认删除选中的 VRF？')) return;
      for (const name of selectedNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedNames.value = [];
      await load();
    }

    async function save() {
      if (!editingVrf.value.name) return showError({ message: '请输入名称' });
      const original = editingOriginalName.value;
      if (!original && vrfList.value.some(n => n.name === editingVrf.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = unflattenVrfData(editingVrf.value);
      try {
        if (original && original !== editingVrf.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          await configStore.setConfig(`${path.value} ${editingVrf.value.name}`, value);
        } else {
          await configStore.setConfig(`${path.value} ${editingVrf.value.name}`, value);
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
      vrfList, loading, selectedNames,
      modalVisible, editingVrf, editingOriginalName, activeTab,
      columns, tabSchemas, path, writeDisabled, PROTOCOL_OPTIONS, TABS,
      load, create, edit, remove, save,
      addIpProtocol, removeIpProtocol, addIpv6Protocol, removeIpv6Protocol,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="create" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="edit" :disabled="writeDisabled || !selectedNames.length || selectedNames.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="remove" :disabled="writeDisabled || !selectedNames.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="columns" :data="vrfList" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
        <CommandPreview :path="path" />
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalName ? '编辑' : '创建'" width="800px" @confirm="save">
        <TabGroup v-model="activeTab" :tabs="TABS">
          <template #basic>
            <ConfigForm v-model="editingVrf" :schema="tabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #ip>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">禁用 IP 转发</label>
                <input type="checkbox" v-model="editingVrf.ipDisableForwarding" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">不通过默认路由解析下一跳</label>
                <input type="checkbox" v-model="editingVrf.ipNhtNoResolveViaDefault" style="margin-left:8px;" />
              </div>
              <div class="form-section-title">协议过滤</div>
              <div v-for="(proto, index) in editingVrf.ipProtocols" :key="index" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <select class="form-control" v-model="proto.protocol" style="flex:1;">
                  <option value="">请选择协议</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input type="text" class="form-control" v-model="proto.routeMap" placeholder="Route-map 名称" style="flex:1;" />
                <ToolbarButton icon="delete" @click="removeIpProtocol(index)" :disabled="writeDisabled">删除</ToolbarButton>
              </div>
              <ToolbarButton icon="create" @click="addIpProtocol" :disabled="writeDisabled">添加协议</ToolbarButton>
            </div>
          </template>
          <template #ipv6>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">禁用 IPv6 转发</label>
                <input type="checkbox" v-model="editingVrf.ipv6DisableForwarding" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">不通过默认路由解析下一跳</label>
                <input type="checkbox" v-model="editingVrf.ipv6NhtNoResolveViaDefault" style="margin-left:8px;" />
              </div>
              <div class="form-section-title">协议过滤</div>
              <div v-for="(proto, index) in editingVrf.ipv6Protocols" :key="index" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <select class="form-control" v-model="proto.protocol" style="flex:1;">
                  <option value="">请选择协议</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input type="text" class="form-control" v-model="proto.routeMap" placeholder="Route-map 名称" style="flex:1;" />
                <ToolbarButton icon="delete" @click="removeIpv6Protocol(index)" :disabled="writeDisabled">删除</ToolbarButton>
              </div>
              <ToolbarButton icon="create" @click="addIpv6Protocol" :disabled="writeDisabled">添加协议</ToolbarButton>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
});
