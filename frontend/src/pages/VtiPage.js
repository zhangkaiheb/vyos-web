import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'vrf', title: 'VRF', width: 100 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', label: 'strict (严格)' },
  { value: 'loose', label: 'loose (宽松)' },
  { value: 'disable', label: 'disable (禁用)' },
];

const ACCEPT_DAD_OPTIONS = [
  { value: '0', label: '0 (禁用 DAD)' },
  { value: '1', label: '1 (启用 DAD - 默认)' },
  { value: '2', label: '2 (启用 DAD - MAC 重复时禁用 IPv6)' },
];

export default defineComponent({
  name: 'VtiPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const vtis = ref([]);
    const modalVisible = ref(false);
    const editingVti = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVti = ref([]);

    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 vti0, vti1', help: '格式: vtiN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个 IPv4/IPv6 地址或 CIDR', help: '接口 IP 地址 (支持多行)' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ip_arp_cache_timeout', title: 'ARP 缓存超时', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: 'ARP 缓存条目超时 (秒, 默认: 30)' },
      { key: 'ip_disable_arp_filter', title: '禁用 ARP 过滤', type: 'checkbox', help: '禁用 ARP 过滤' },
      { key: 'ip_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IP 转发' },
      { key: 'ip_enable_arp_accept', title: '启用 ARP 接受', type: 'checkbox', help: '启用 ARP 接受' },
      { key: 'ip_enable_arp_announce', title: '启用 ARP 通告', type: 'checkbox', help: '启用 ARP 通告' },
      { key: 'ip_enable_arp_ignore', title: '启用 ARP 忽略', type: 'checkbox', help: '启用 ARP 忽略' },
      { key: 'ip_enable_directed_broadcast', title: '启用定向广播', type: 'checkbox', help: '启用定向广播转发' },
      { key: 'ip_enable_proxy_arp', title: '启用代理 ARP', type: 'checkbox', help: '启用代理 ARP' },
      { key: 'ip_proxy_arp_pvlan', title: '私有 VLAN 代理 ARP', type: 'checkbox', help: '启用私有 VLAN 代理 ARP' },
      { key: 'ip_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const ipv6Schema = computed(() => [
      { key: 'ipv6_accept_dad', title: '接受 DAD', type: 'select', options: ACCEPT_DAD_OPTIONS, help: '重复地址检测 (默认: 1)' },
      { key: 'ipv6_autoconf', title: '自动配置', type: 'checkbox', help: '使用 SLAAC 获取 IPv6 地址' },
      { key: 'ipv6_eui64', title: 'EUI-64 前缀', type: 'text', placeholder: 'IPv6 前缀', help: '基于 MAC 的 EUI-64 地址前缀' },
      { key: 'ipv6_no_default_link_local', title: '无默认链路本地地址', type: 'checkbox', help: '移除默认链路本地地址' },
      { key: 'ipv6_adjust_mss', title: '调整 MSS', type: 'text', placeholder: 'clamp-mss-to-pmtu 或 536-65535', help: 'TCP MSS 值' },
      { key: 'ipv6_base_reachable_time', title: '基础可达时间', type: 'number', min: 1, max: 86400, placeholder: '1-86400', help: '基础可达时间 (秒, 默认: 30)' },
      { key: 'ipv6_disable_forwarding', title: '禁用转发', type: 'checkbox', help: '禁用 IPv6 转发' },
      { key: 'ipv6_dup_addr_detect_transmits', title: 'DAD 传输次数', type: 'number', min: 0, max: 100, placeholder: '0-100', help: 'DAD 期间发送的 NS 消息数 (默认: 1, 0=禁用)' },
      { key: 'ipv6_source_validation', title: '源验证', type: 'select', options: SOURCE_VALIDATION_OPTIONS, placeholder: '选择源验证模式', help: '反向路径源验证 (RFC3704)' },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: '镜像出方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像出方向流量到目标接口' },
      { key: 'mirror_ingress', title: '镜像入方向', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '镜像入方向流量到目标接口' },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: '重定向目标', type: 'select', options: interfaceOptions.value, placeholder: '选择目标接口', help: '重定向入站数据包到目标接口' },
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    const commandText = computed(() => {
      if (!editingVti.value) return '';
      const v = editingVti.value;
      const name = v.name || 'vtiN';
      const lines = [];

      if (v.description) lines.push(`set interfaces vti ${name} description "${v.description}"`);
      if (v.address) {
        v.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces vti ${name} address ${a.trim()}`);
        });
      }
      if (v.mtu) lines.push(`set interfaces vti ${name} mtu ${v.mtu}`);
      if (v.disable) lines.push(`set interfaces vti ${name} disable`);

      if (v.ip_adjust_mss) lines.push(`set interfaces vti ${name} ip adjust-mss ${v.ip_adjust_mss}`);
      if (v.ip_arp_cache_timeout) lines.push(`set interfaces vti ${name} ip arp-cache-timeout ${v.ip_arp_cache_timeout}`);
      if (v.ip_disable_arp_filter) lines.push(`set interfaces vti ${name} ip disable-arp-filter`);
      if (v.ip_disable_forwarding) lines.push(`set interfaces vti ${name} ip disable-forwarding`);
      if (v.ip_enable_arp_accept) lines.push(`set interfaces vti ${name} ip enable-arp-accept`);
      if (v.ip_enable_arp_announce) lines.push(`set interfaces vti ${name} ip enable-arp-announce`);
      if (v.ip_enable_arp_ignore) lines.push(`set interfaces vti ${name} ip enable-arp-ignore`);
      if (v.ip_enable_directed_broadcast) lines.push(`set interfaces vti ${name} ip enable-directed-broadcast`);
      if (v.ip_enable_proxy_arp) lines.push(`set interfaces vti ${name} ip enable-proxy-arp`);
      if (v.ip_proxy_arp_pvlan) lines.push(`set interfaces vti ${name} ip proxy-arp-pvlan`);
      if (v.ip_source_validation) lines.push(`set interfaces vti ${name} ip source-validation ${v.ip_source_validation}`);

      if (v.ipv6_accept_dad && v.ipv6_accept_dad !== '1') lines.push(`set interfaces vti ${name} ipv6 accept-dad ${v.ipv6_accept_dad}`);
      if (v.ipv6_autoconf) lines.push(`set interfaces vti ${name} ipv6 address autoconf`);
      if (v.ipv6_eui64) lines.push(`set interfaces vti ${name} ipv6 address eui64 ${v.ipv6_eui64}`);
      if (v.ipv6_no_default_link_local) lines.push(`set interfaces vti ${name} ipv6 address no-default-link-local`);
      if (v.ipv6_adjust_mss) lines.push(`set interfaces vti ${name} ipv6 adjust-mss ${v.ipv6_adjust_mss}`);
      if (v.ipv6_base_reachable_time) lines.push(`set interfaces vti ${name} ipv6 base-reachable-time ${v.ipv6_base_reachable_time}`);
      if (v.ipv6_disable_forwarding) lines.push(`set interfaces vti ${name} ipv6 disable-forwarding`);
      if (v.ipv6_dup_addr_detect_transmits !== '' && v.ipv6_dup_addr_detect_transmits !== null && v.ipv6_dup_addr_detect_transmits !== undefined) lines.push(`set interfaces vti ${name} ipv6 dup-addr-detect-transmits ${v.ipv6_dup_addr_detect_transmits}`);
      if (v.ipv6_source_validation) lines.push(`set interfaces vti ${name} ipv6 source-validation ${v.ipv6_source_validation}`);

      if (v.mirror_egress) lines.push(`set interfaces vti ${name} mirror egress ${v.mirror_egress}`);
      if (v.mirror_ingress) lines.push(`set interfaces vti ${name} mirror ingress ${v.mirror_ingress}`);

      if (v.redirect) lines.push(`set interfaces vti ${name} redirect ${v.redirect}`);
      if (v.vrf) lines.push(`set interfaces vti ${name} vrf ${v.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'ip', title: 'IPv4 参数' },
      { key: 'ipv6', title: 'IPv6 参数' },
      { key: 'mirror', title: '流量镜像' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', mtu: '', disable: false,
        ip_adjust_mss: '', ip_arp_cache_timeout: '', ip_disable_arp_filter: false,
        ip_disable_forwarding: false, ip_enable_arp_accept: false, ip_enable_arp_announce: false,
        ip_enable_arp_ignore: false, ip_enable_directed_broadcast: false,
        ip_enable_proxy_arp: false, ip_proxy_arp_pvlan: false, ip_source_validation: '',
        ipv6_accept_dad: '1', ipv6_autoconf: false, ipv6_eui64: '', ipv6_no_default_link_local: false,
        ipv6_adjust_mss: '', ipv6_base_reachable_time: '', ipv6_disable_forwarding: false,
        ipv6_dup_addr_detect_transmits: '', ipv6_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '', vrf: '',
      };
    }

    function vtiToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        address: Array.isArray(v.address) ? v.address.join('\n') : (v.address || ''),
        mtu: v.mtu || '',
        disable: !!v.disable,
        ip_adjust_mss: v.ip?.adjust_mss || '',
        ip_arp_cache_timeout: v.ip?.arp_cache_timeout || '',
        ip_disable_arp_filter: !!v.ip?.disable_arp_filter,
        ip_disable_forwarding: !!v.ip?.disable_forwarding,
        ip_enable_arp_accept: !!v.ip?.enable_arp_accept,
        ip_enable_arp_announce: !!v.ip?.enable_arp_announce,
        ip_enable_arp_ignore: !!v.ip?.enable_arp_ignore,
        ip_enable_directed_broadcast: !!v.ip?.enable_directed_broadcast,
        ip_enable_proxy_arp: !!v.ip?.enable_proxy_arp,
        ip_proxy_arp_pvlan: !!v.ip?.proxy_arp_pvlan,
        ip_source_validation: v.ip?.source_validation || '',
        ipv6_accept_dad: v.ipv6?.accept_dad || '1',
        ipv6_autoconf: !!v.ipv6?.address?.autoconf,
        ipv6_eui64: v.ipv6?.address?.eui64 || '',
        ipv6_no_default_link_local: !!v.ipv6?.address?.no_default_link_local,
        ipv6_adjust_mss: v.ipv6?.adjust_mss || '',
        ipv6_base_reachable_time: v.ipv6?.base_reachable_time || '',
        ipv6_disable_forwarding: !!v.ipv6?.disable_forwarding,
        ipv6_dup_addr_detect_transmits: v.ipv6?.dup_addr_detect_transmits !== undefined ? v.ipv6.dup_addr_detect_transmits : '',
        ipv6_source_validation: v.ipv6?.source_validation || '',
        mirror_egress: v.mirror?.egress || '',
        mirror_ingress: v.mirror?.ingress || '',
        redirect: v.redirect || '',
        vrf: v.vrf || '',
      };
    }

    function formToVti(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.disable) result.disable = true;

      const ip = {};
      if (form.ip_adjust_mss) ip.adjust_mss = form.ip_adjust_mss;
      if (form.ip_arp_cache_timeout) ip.arp_cache_timeout = Number(form.ip_arp_cache_timeout);
      if (form.ip_disable_arp_filter) ip.disable_arp_filter = true;
      if (form.ip_disable_forwarding) ip.disable_forwarding = true;
      if (form.ip_enable_arp_accept) ip.enable_arp_accept = true;
      if (form.ip_enable_arp_announce) ip.enable_arp_announce = true;
      if (form.ip_enable_arp_ignore) ip.enable_arp_ignore = true;
      if (form.ip_enable_directed_broadcast) ip.enable_directed_broadcast = true;
      if (form.ip_enable_proxy_arp) ip.enable_proxy_arp = true;
      if (form.ip_proxy_arp_pvlan) ip.proxy_arp_pvlan = true;
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;

      const ipv6 = {};
      if (form.ipv6_accept_dad && form.ipv6_accept_dad !== '1') ipv6.accept_dad = form.ipv6_accept_dad;
      if (form.ipv6_autoconf || form.ipv6_eui64 || form.ipv6_no_default_link_local) {
        const addr = {};
        if (form.ipv6_autoconf) addr.autoconf = true;
        if (form.ipv6_eui64) addr.eui64 = form.ipv6_eui64;
        if (form.ipv6_no_default_link_local) addr.no_default_link_local = true;
        ipv6.address = addr;
      }
      if (form.ipv6_adjust_mss) ipv6.adjust_mss = form.ipv6_adjust_mss;
      if (form.ipv6_base_reachable_time) ipv6.base_reachable_time = Number(form.ipv6_base_reachable_time);
      if (form.ipv6_disable_forwarding) ipv6.disable_forwarding = true;
      if (form.ipv6_dup_addr_detect_transmits !== '' && form.ipv6_dup_addr_detect_transmits !== null && form.ipv6_dup_addr_detect_transmits !== undefined) ipv6.dup_addr_detect_transmits = Number(form.ipv6_dup_addr_detect_transmits);
      if (form.ipv6_source_validation) ipv6.source_validation = form.ipv6_source_validation;
      if (Object.keys(ipv6).length) result.ipv6 = ipv6;

      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;

      if (form.redirect) result.redirect = form.redirect;
      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces vti' });
        const cfg = res.data || {};
        vtis.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          mtu: val.mtu || '',
          vrf: val.vrf || '',
          disable: !!val.disable,
          description: val.description || '',
        }));

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

    function openModal(index = -1) {
      if (index >= 0) {
        editingVti.value = vtiToForm(vtis.value[index]);
      } else {
        editingVti.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingVti.value;
        if (!form.name) { alert('请输入接口名称'); return; }
        const config = formToVti(form);
        console.log('[VTI] 保存配置:', JSON.stringify(config, null, 2));
        await api.put('/config', { path: `interfaces vti ${form.name}`, value: config });
        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedVti.value.length) { alert('请先选择要删除的 VTI 接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedVti.value.length} 个 VTI 接口?`)) return;
      try {
        for (const v of selectedVti.value) {
          await api.delete('/config', { path: `interfaces vti ${v.name}` });
        }
        selectedVti.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, vtis, selected: selectedVti, modalVisible, editingVti, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, ipSchema, ipv6Schema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="vtis"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />
      <DraggableModal v-model:visible="modalVisible" :title="editingVti?.name ? '编辑 VTI 接口' : '创建 VTI 接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic><ConfigForm :schema="basicSchema" :model="editingVti" /></template>
            <template #ip><ConfigForm :schema="ipSchema" :model="editingVti" /></template>
            <template #ipv6><ConfigForm :schema="ipv6Schema" :model="editingVti" /></template>
            <template #mirror><ConfigForm :schema="mirrorSchema" :model="editingVti" /></template>
            <template #other><ConfigForm :schema="otherSchema" :model="editingVti" /></template>
            <template #command><pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;">{{ commandText }}</pre></template>
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
