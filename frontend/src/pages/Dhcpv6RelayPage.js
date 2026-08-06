import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function listenInterfacesToForm(items = {}) {
  return Object.entries(items).map(([name, item]) => ({
    _name: name,
    name,
    address: item?.address || '',
  }));
}

function listenInterfacesToConfig(formItems) {
  const result = {};
  for (const item of formItems || []) {
    if (!item.name) continue;
    const entry = {};
    if (isPresent(item.address)) entry.address = item.address;
    result[item.name] = entry;
  }
  return result;
}

function upstreamInterfacesToForm(items = {}) {
  return Object.entries(items).map(([name, item]) => ({
    _name: name,
    name,
    addresses: toArray(item?.address),
  }));
}

function upstreamInterfacesToConfig(formItems) {
  const result = {};
  for (const item of formItems || []) {
    if (!item.name) continue;
    const addrs = toArray(item.addresses || []).filter(Boolean);
    if (addrs.length) result[item.name] = { address: addrs };
    else result[item.name] = {};
  }
  return result;
}

function dhcpv6RelayToForm(data = {}) {
  return {
    disable: data.disable !== undefined,
    max_hop_count: data['max-hop-count'] !== undefined ? String(data['max-hop-count']) : '10',
    use_interface_id_option: data['use-interface-id-option'] !== undefined,
    listen_interfaces: listenInterfacesToForm(data['listen-interface']),
    upstream_interfaces: upstreamInterfacesToForm(data['upstream-interface']),
  };
}

function dhcpv6RelayToConfig(form) {
  const result = {};
  if (form.disable) result.disable = '';
  if (isPresent(form.max_hop_count)) result['max-hop-count'] = parseInt(form.max_hop_count, 10);
  if (form.use_interface_id_option) result['use-interface-id-option'] = '';

  const listen = listenInterfacesToConfig(form.listen_interfaces || []);
  if (Object.keys(listen).length) result['listen-interface'] = listen;

  const upstream = upstreamInterfacesToConfig(form.upstream_interfaces || []);
  if (Object.keys(upstream).length) result['upstream-interface'] = upstream;

  return result;
}

export default defineComponent({
  name: 'Dhcpv6RelayPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(dhcpv6RelayToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    const commandPath = computed(() => 'service dhcpv6-relay');

    const listenColumns = [
      { key: 'name', title: '接口' },
      { key: 'address', title: '监听地址' },
    ];

    const selectedListen = ref([]);
    const showListenModal = ref(false);
    const editingListen = ref({});

    const upstreamColumns = [
      { key: 'name', title: '接口' },
      { key: 'addresses', title: '上游服务器地址', render: v => toArray(v).join(', ') },
    ];

    const selectedUpstream = ref([]);
    const showUpstreamModal = ref(false);
    const editingUpstream = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service dhcpv6-relay', true);
        config.value = dhcpv6RelayToForm(res.data || {});
        await loadInterfaces();
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const hop = parseInt(config.value.max_hop_count, 10);
      if (isNaN(hop) || hop < 1 || hop > 255) return alert('最大跳数范围为 1-255');

      const listenNames = new Set();
      for (const item of config.value.listen_interfaces || []) {
        if (!item.name) return alert('监听接口名称不能为空');
        if (listenNames.has(item.name)) return alert(`监听接口 ${item.name} 重复`);
        listenNames.add(item.name);
        if (isPresent(item.address)) {
          const err = validateIPv6(item.address);
          if (err) return alert(`监听接口 ${item.name} ${err}`);
        }
      }

      const upstreamNames = new Set();
      for (const item of config.value.upstream_interfaces || []) {
        if (!item.name) return alert('上游接口名称不能为空');
        if (upstreamNames.has(item.name)) return alert(`上游接口 ${item.name} 重复`);
        upstreamNames.add(item.name);
        const addrs = toArray(item.addresses || []).filter(Boolean);
        if (!addrs.length) return alert(`上游接口 ${item.name} 至少需要配置一个服务器地址`);
        for (const addr of addrs) {
          const err = validateIPv6(addr);
          if (err) return alert(`上游接口 ${item.name} 地址 ${addr}：${err}`);
        }
      }

      saving.value = true;
      try {
        await configApi.set('service dhcpv6-relay', dhcpv6RelayToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createListen() {
      editingListen.value = { name: '', address: '' };
      showListenModal.value = true;
    }

    function editListen() {
      if (!selectedListen.value.length) return alert('请选择要编辑的监听接口');
      const row = (config.value.listen_interfaces || []).find(i => i._name === selectedListen.value[0]);
      if (!row) return alert('未找到选中的监听接口');
      editingListen.value = JSON.parse(JSON.stringify(row));
      showListenModal.value = true;
    }

    function removeListen() {
      if (!selectedListen.value.length) return alert('请选择要删除的监听接口');
      config.value.listen_interfaces = (config.value.listen_interfaces || []).filter(i => i._name !== selectedListen.value[0]);
      selectedListen.value = [];
    }

    function saveListen() {
      if (!editingListen.value.name) return alert('请选择接口');
      const list = config.value.listen_interfaces || [];
      const idx = list.findIndex(i => i._name === editingListen.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingListen.value)));
      } else {
        if (list.some(i => i.name === editingListen.value.name)) return alert('该监听接口已存在');
        list.push(JSON.parse(JSON.stringify(editingListen.value)));
      }
      config.value.listen_interfaces = [...list];
      selectedListen.value = [];
      showListenModal.value = false;
    }

    function createUpstream() {
      editingUpstream.value = { name: '', addresses: [] };
      showUpstreamModal.value = true;
    }

    function editUpstream() {
      if (!selectedUpstream.value.length) return alert('请选择要编辑的上游接口');
      const row = (config.value.upstream_interfaces || []).find(i => i._name === selectedUpstream.value[0]);
      if (!row) return alert('未找到选中的上游接口');
      editingUpstream.value = JSON.parse(JSON.stringify(row));
      showUpstreamModal.value = true;
    }

    function removeUpstream() {
      if (!selectedUpstream.value.length) return alert('请选择要删除的上游接口');
      config.value.upstream_interfaces = (config.value.upstream_interfaces || []).filter(i => i._name !== selectedUpstream.value[0]);
      selectedUpstream.value = [];
    }

    function saveUpstream() {
      if (!editingUpstream.value.name) return alert('请选择接口');
      const addrs = toArray(editingUpstream.value.addresses || []).filter(Boolean);
      if (!addrs.length) return alert('上游接口至少需要配置一个服务器地址');
      for (const addr of addrs) {
        const err = validateIPv6(addr);
        if (err) return alert(`地址 ${addr}：${err}`);
      }
      const list = config.value.upstream_interfaces || [];
      const idx = list.findIndex(i => i._name === editingUpstream.value._name);
      if (idx >= 0) {
        list.splice(idx, 1, JSON.parse(JSON.stringify(editingUpstream.value)));
      } else {
        if (list.some(i => i.name === editingUpstream.value.name)) return alert('该上游接口已存在');
        list.push(JSON.parse(JSON.stringify(editingUpstream.value)));
      }
      config.value.upstream_interfaces = [...list];
      selectedUpstream.value = [];
      showUpstreamModal.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, interfaces, commandPath,
      listenColumns, selectedListen, showListenModal, editingListen,
      upstreamColumns, selectedUpstream, showUpstreamModal, editingUpstream,
      load, save,
      createListen, editListen, removeListen, saveListen,
      createUpstream, editUpstream, removeUpstream, saveUpstream,
      validateIPv6,
    };
  },
  components: { DataTable, DraggableModal, DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'relay-options', title: '中继选项' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" title="禁用 DHCPv6 中继实例">禁用</label>
            <input type="checkbox" v-model="config.disable" title="禁用 DHCPv6 中继实例" />
          </div>

          <div style="margin-top:16px;">
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createListen">创建监听接口</ToolbarButton>
              <ToolbarButton icon="edit" @click="editListen" :disabled="!selectedListen.length || selectedListen.length > 1">编辑监听接口</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeListen" :disabled="!selectedListen.length">删除监听接口</ToolbarButton>
            </div>
            <DataTable :columns="listenColumns" :data="config.listen_interfaces" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedListen = $event" />
          </div>

          <div style="margin-top:16px;">
            <div class="toolbar">
              <ToolbarButton icon="create" @click="createUpstream">创建上游接口</ToolbarButton>
              <ToolbarButton icon="edit" @click="editUpstream" :disabled="!selectedUpstream.length || selectedUpstream.length > 1">编辑上游接口</ToolbarButton>
              <ToolbarButton icon="delete" @click="removeUpstream" :disabled="!selectedUpstream.length">删除上游接口</ToolbarButton>
            </div>
            <DataTable :columns="upstreamColumns" :data="config.upstream_interfaces" row-key="name" :externalToolbar="true" :selectable="true" @selection-change="selectedUpstream = $event" />
          </div>
        </template>

        <template #relay-options>
          <div class="form-row">
            <label class="form-label" title="报文最大跳数，范围 1-255，默认 10">最大跳数</label>
            <div style="flex:1;">
              <input type="number" min="1" max="255" class="form-control" v-model="config.max_hop_count" placeholder="1-255，默认 10" title="最大跳数" />
              <div class="form-hint">范围：1-255，默认 10</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="设置 DHCPv6 interface-ID 选项">使用接口 ID 选项</label>
            <input type="checkbox" v-model="config.use_interface_id_option" title="使用接口 ID 选项" />
          </div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showListenModal" title="监听接口" width="420px" @confirm="saveListen" @close="showListenModal = false">
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingListen.name" :disabled="!!editingListen._name">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">监听地址</label>
          <input type="text" class="form-control" v-model="editingListen.address" placeholder="可选，留空表示监听接口上所有地址" />
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showUpstreamModal" title="上游接口" width="520px" @confirm="saveUpstream" @close="showUpstreamModal = false">
        <div class="form-row">
          <label class="form-label">接口</label>
          <select class="form-control" v-model="editingUpstream.name" :disabled="!!editingUpstream._name">
            <option value="">请选择接口</option>
            <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">上游服务器地址</label>
          <div style="flex:1;max-width:600px;">
            <DualListSelector v-model="editingUpstream.addresses" :options="[]" title-left="可选" title-right="已选" allow-custom custom-placeholder="输入 IPv6 地址后按回车" :custom-validator="validateIPv6" />
            <div class="form-hint">点击 + 号添加 IPv6 地址，至少填写一个</div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
