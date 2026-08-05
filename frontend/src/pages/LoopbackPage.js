import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 200 },
  { key: 'address', title: 'IP 地址', width: 200 },
  { key: 'actions', title: '操作', width: 100 },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (严格)' },
  { value: 'loose', label: 'loose (宽松)' },
  { value: 'disable', label: 'disable (禁用)' },
];

export default defineComponent({
  name: 'LoopbackPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const loopbacks = ref([]);
    const modalVisible = ref(false);
    const editingLoopback = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, value: 'lo', disabled: true, help: 'Loopback 接口固定为 lo' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个 IP 地址或 CIDR', help: 'IP 地址列表 (支持 IPv4/IPv6)' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像出方向流量到目标接口' },
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像入方向流量到目标接口' },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingLoopback.value) return '';
      const l = editingLoopback.value;
      const name = l.name || 'lo';
      const lines = [];

      if (l.description) lines.push(`set interfaces loopback ${name} description "${l.description}"`);
      if (l.address) {
        l.address.split('\n').filter(Boolean).forEach(addr => {
          lines.push(`set interfaces loopback ${name} address ${addr.trim()}`);
        });
      }
      if (l.ip_source_validation) lines.push(`set interfaces loopback ${name} ip source-validation ${l.ip_source_validation}`);
      if (l.mirror_egress) lines.push(`set interfaces loopback ${name} mirror egress ${l.mirror_egress}`);
      if (l.mirror_ingress) lines.push(`set interfaces loopback ${name} mirror ingress ${l.mirror_ingress}`);
      if (l.redirect) lines.push(`set interfaces loopback ${name} redirect ${l.redirect}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: 'lo', description: '', address: '',
        ip_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '',
      };
    }

    function loopbackToForm(l) {
      return {
        name: l.name || 'lo',
        description: l.description || '',
        address: Array.isArray(l.address) ? l.address.join('\n') : (l.address || ''),
        ip_source_validation: l.ip?.source_validation || '',
        mirror_egress: l.mirror?.egress || '',
        mirror_ingress: l.mirror?.ingress || '',
        redirect: l.redirect || '',
      };
    }

    function formToLoopback(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) {
        result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      }
      const ip = {};
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;
      if (form.redirect) result.redirect = form.redirect;
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces loopback' });
        const cfg = res.data || {};
        loopbacks.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          address: Array.isArray(val.address) ? val.address.join(', ') : (val.address || ''),
          description: val.description || '',
        }));

        // Load interface options
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function showError(err) {
      alert(`错误码: ${err.code || 'ERROR'}\n错误信息: ${err.message || err}`);
    }

    function openModal() {
      const raw = loopbacks.value.find(l => l.name === 'lo');
      if (raw) {
        editingLoopback.value = loopbackToForm(raw);
      } else {
        editingLoopback.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingLoopback.value;
        const config = formToLoopback(form);
        console.log('[Loopback] 保存配置:', JSON.stringify(config, null, 2));

        const path = 'interfaces loopback lo';
        await api.put('/config', { path, value: config });

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, loopbacks, modalVisible, editingLoopback, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, ipSchema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="loopbacks"
        :loading="loading"
        :selectable="false"
        :actions="['edit', 'refresh']"
        @edit="openModal"
        @refresh="load"
      />

      <DraggableModal v-model:visible="modalVisible" title="编辑 Loopback 接口" width="800px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingLoopback" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingLoopback" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingLoopback" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingLoopback" />
            </template>
            <template #command>
              <pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre>
            </template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="save">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
