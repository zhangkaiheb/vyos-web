import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';

const COLUMNS = [
  { key: 'name', title: '接口名称', width: 120 },
  { key: 'description', title: '描述', width: 160 },
  { key: 'peer_name', title: '对端接口', width: 120 },
  { key: 'mtu', title: 'MTU', width: 80 },
  { key: 'netns', title: '网络命名空间', width: 120 },
  { key: 'vif_count', title: 'VIF 数量', width: 80 },
  { key: 'disable', title: '禁用', width: 80 },
  { key: 'actions', title: '操作', width: 100 },
];

export default defineComponent({
  name: 'VirtualEthernetPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const loading = ref(false);
    const veths = ref([]);
    const modalVisible = ref(false);
    const editingVeth = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');
    const selectedVeth = ref([]);

    function formatJson(obj) {
      if (!obj) return '';
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return '';
      }
    }

    function safeJsonParse(str) {
      if (!str) return {};
      try {
        return JSON.parse(str);
      } catch {
        return {};
      }
    }

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: '接口名称', type: 'text', required: true, placeholder: '如 veth0, veth1', help: '格式: vethN' },
      { key: 'description', title: '描述', type: 'text', placeholder: '接口描述' },
      { key: 'address', title: 'IP 地址', type: 'textarea', placeholder: '每行一个 IPv4/IPv6 地址或 CIDR', help: '接口 IP 地址 (支持多行)' },
      { key: 'peer_name', title: '对端接口', type: 'text', placeholder: '对端虚拟以太网接口名称', help: '虚拟以太网对端接口名称' },
      { key: 'mtu', title: 'MTU', type: 'number', min: 68, max: 16000, placeholder: '68-16000', help: '最大传输单元 (默认: 1500)' },
      { key: 'netns', title: '网络命名空间', type: 'text', placeholder: '命名空间名称', help: '网络命名空间名称' },
      { key: 'disable', title: '禁用接口', type: 'checkbox', help: '管理性禁用接口' },
    ]);

    const dhcpSchema = computed(() => [
      { key: 'dhcp_client_id', title: '客户端 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '用于向 DHCP 服务器标识客户端' },
      { key: 'dhcp_default_route_distance', title: '默认路由距离', type: 'number', min: 1, max: 255, placeholder: '1-255', help: '默认路由的距离 (默认: 210)' },
      { key: 'dhcp_host_name', title: '主机名', type: 'text', placeholder: '主机名', help: '覆盖系统主机名' },
      { key: 'dhcp_mtu', title: '使用 DHCP MTU', type: 'checkbox', help: '使用 DHCP 服务器提供的 MTU' },
      { key: 'dhcp_no_default_route', title: '不安装默认路由', type: 'checkbox', help: '不安装默认路由' },
      { key: 'dhcp_reject', title: '拒绝地址', type: 'textarea', placeholder: '每行一个 IP 或子网', help: '拒绝 DHCP 租约的地址' },
      { key: 'dhcp_user_class', title: '用户类别', type: 'text', placeholder: 'DHCP 选项字符串', help: '用户可配置选项' },
      { key: 'dhcp_vendor_class_id', title: '厂商类别 ID', type: 'text', placeholder: 'DHCP 选项字符串', help: '标识厂商客户端类型' },
    ]);

    const dhcpv6Schema = computed(() => [
      { key: 'dhcpv6_duid', title: 'DUID', type: 'text', placeholder: 'DHCP 唯一标识符', help: '客户端发送的 DUID' },
      { key: 'dhcpv6_no_release', title: '不发送 Release', type: 'checkbox', help: '客户端退出时不发送 release 消息' },
      { key: 'dhcpv6_no_request_dns', title: '不请求 DNS', type: 'checkbox', help: '不请求 DNS 服务器' },
      { key: 'dhcpv6_no_request_domain_name', title: '不请求域名', type: 'checkbox', help: '不请求域名' },
      { key: 'dhcpv6_parameters_only', title: '仅获取参数', type: 'checkbox', help: '仅获取配置参数，不获取地址' },
      { key: 'dhcpv6_pd_instances', title: '前缀委派实例', type: 'textarea', placeholder: 'JSON 格式，例如 {"eth0": {"interface": "eth0", "address": "1", "sla-id": 0}}', help: 'DHCPv6 前缀委派实例配置' },
      { key: 'dhcpv6_pd_length', title: '前缀长度', type: 'number', min: 32, max: 64, placeholder: '32-64', help: '前缀委派长度 (默认: 64)' },
      { key: 'dhcpv6_rapid_commit', title: '快速提交', type: 'checkbox', help: '等待立即回复而非通告' },
      { key: 'dhcpv6_temporary', title: '临时地址', type: 'checkbox', help: 'IPv6 临时地址' },
    ]);

    const vifSchema = computed(() => [
      { key: 'vif', title: 'VIF (VLAN)', type: 'textarea', placeholder: 'JSON 格式，例如 {"10": {"address": ["192.168.10.1/24"], "description": "VLAN 10", "mtu": 1500}}', help: 'JSON 对象，键为 VLAN ID (0-4094)。每个 VIF 支持: address, description, disable, mtu, mac, dhcp-options, dhcpv6-options, ip, ipv6, mirror, redirect, vrf' },
      { key: 'vif_s', title: 'VIF-S (QinQ)', type: 'textarea', placeholder: 'JSON 格式，例如 {"100": {"vif": {"200": {"address": ["10.0.0.1/24"]}}}}', help: 'QinQ S-VLAN 子接口，键为 S-VLAN ID (0-4094)。每个 VIF-S 支持: address, description, disable, mtu, mac, dhcp-options, dhcpv6-options, ip, ipv6, mirror, redirect, vrf, vif' },
    ]);

    const otherSchema = computed(() => [
      { key: 'vrf', title: 'VRF 实例', type: 'text', placeholder: 'VRF 实例名称', help: 'VRF 实例名称' },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingVeth.value) return '';
      const v = editingVeth.value;
      const name = v.name || 'vethN';
      const lines = [];

      if (v.description) lines.push(`set interfaces virtual-ethernet ${name} description "${v.description}"`);
      if (v.address) {
        v.address.split('\n').filter(Boolean).forEach(a => {
          lines.push(`set interfaces virtual-ethernet ${name} address ${a.trim()}`);
        });
      }
      if (v.peer_name) lines.push(`set interfaces virtual-ethernet ${name} peer-name ${v.peer_name}`);
      if (v.mtu) lines.push(`set interfaces virtual-ethernet ${name} mtu ${v.mtu}`);
      if (v.netns) lines.push(`set interfaces virtual-ethernet ${name} netns ${v.netns}`);
      if (v.disable) lines.push(`set interfaces virtual-ethernet ${name} disable`);

      // DHCP
      if (v.dhcp_client_id) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options client-id ${v.dhcp_client_id}`);
      if (v.dhcp_default_route_distance) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options default-route-distance ${v.dhcp_default_route_distance}`);
      if (v.dhcp_host_name) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options host-name ${v.dhcp_host_name}`);
      if (v.dhcp_mtu) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options mtu`);
      if (v.dhcp_no_default_route) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options no-default-route`);
      if (v.dhcp_reject) {
        v.dhcp_reject.split('\n').filter(Boolean).forEach(r => {
          lines.push(`set interfaces virtual-ethernet ${name} dhcp-options reject ${r.trim()}`);
        });
      }
      if (v.dhcp_user_class) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options user-class ${v.dhcp_user_class}`);
      if (v.dhcp_vendor_class_id) lines.push(`set interfaces virtual-ethernet ${name} dhcp-options vendor-class-id ${v.dhcp_vendor_class_id}`);

      // DHCPv6
      if (v.dhcpv6_duid) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options duid ${v.dhcpv6_duid}`);
      if (v.dhcpv6_no_release) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-release`);
      if (v.dhcpv6_no_request_dns) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-request-dns`);
      if (v.dhcpv6_no_request_domain_name) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options no-request-domain-name`);
      if (v.dhcpv6_parameters_only) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options parameters-only`);
      if (v.dhcpv6_pd_instances) {
        const pd = safeJsonParse(v.dhcpv6_pd_instances);
        Object.entries(pd).forEach(([instanceId, instanceCfg]) => {
          const pdPath = `set interfaces virtual-ethernet ${name} dhcpv6-options pd ${instanceId}`;
          if (instanceCfg.interface) lines.push(`${pdPath} interface ${instanceCfg.interface}`);
          if (instanceCfg.address) lines.push(`${pdPath} address ${instanceCfg.address}`);
          if (instanceCfg['sla-id'] !== undefined) lines.push(`${pdPath} sla-id ${instanceCfg['sla-id']}`);
        });
      }
      if (v.dhcpv6_pd_length) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options pd-length ${v.dhcpv6_pd_length}`);
      if (v.dhcpv6_rapid_commit) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options rapid-commit`);
      if (v.dhcpv6_temporary) lines.push(`set interfaces virtual-ethernet ${name} dhcpv6-options temporary`);

      // VIF
      const vif = safeJsonParse(v.vif);
      if (Object.keys(vif).length) {
        Object.entries(vif).forEach(([vlanId, vlanCfg]) => {
          if (vlanCfg.address) {
            (Array.isArray(vlanCfg.address) ? vlanCfg.address : [vlanCfg.address]).forEach(addr => {
              lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} address ${addr}`);
            });
          }
          if (vlanCfg.description) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} description "${vlanCfg.description}"`);
          if (vlanCfg.disable) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} disable`);
          if (vlanCfg.mtu) lines.push(`set interfaces virtual-ethernet ${name} vif ${vlanId} mtu ${vlanCfg.mtu}`);
        });
      }

      const vifS = safeJsonParse(v.vif_s);
      if (Object.keys(vifS).length) {
        Object.entries(vifS).forEach(([svlanId, svlanCfg]) => {
          if (svlanCfg.address) {
            (Array.isArray(svlanCfg.address) ? svlanCfg.address : [svlanCfg.address]).forEach(addr => {
              lines.push(`set interfaces virtual-ethernet ${name} vif-s ${svlanId} address ${addr}`);
            });
          }
          if (svlanCfg.description) lines.push(`set interfaces virtual-ethernet ${name} vif-s ${svlanId} description "${svlanCfg.description}"`);
        });
      }

      if (v.vrf) lines.push(`set interfaces virtual-ethernet ${name} vrf ${v.vrf}`);

      return lines.length ? lines.join('\n') : '# 未配置任何参数';
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: '基本配置' },
      { key: 'dhcp', title: 'DHCP' },
      { key: 'dhcpv6', title: 'DHCPv6' },
      { key: 'vif', title: 'VLAN 子接口' },
      { key: 'other', title: '其他' },
      { key: 'command', title: '命令预览' },
    ]);

    function getDefaultForm() {
      return {
        name: '', description: '', address: '', peer_name: '', mtu: '', netns: '', disable: false,
        dhcp_client_id: '', dhcp_default_route_distance: '', dhcp_host_name: '',
        dhcp_mtu: false, dhcp_no_default_route: false, dhcp_reject: '',
        dhcp_user_class: '', dhcp_vendor_class_id: '',
        dhcpv6_duid: '', dhcpv6_no_release: false, dhcpv6_no_request_dns: false,
        dhcpv6_no_request_domain_name: false, dhcpv6_parameters_only: false,
        dhcpv6_pd_instances: '', dhcpv6_pd_length: '',
        dhcpv6_rapid_commit: false, dhcpv6_temporary: false,
        vif: '', vif_s: '',
        vrf: '',
      };
    }

    function vethToForm(v) {
      return {
        name: v.name || '',
        description: v.description || '',
        address: Array.isArray(v.address) ? v.address.join('\n') : (v.address || ''),
        peer_name: v.peer_name || '',
        mtu: v.mtu || '',
        netns: v.netns || '',
        disable: !!v.disable,
        dhcp_client_id: v['dhcp-options']?.client_id || '',
        dhcp_default_route_distance: v['dhcp-options']?.default_route_distance || '',
        dhcp_host_name: v['dhcp-options']?.host_name || '',
        dhcp_mtu: !!v['dhcp-options']?.mtu,
        dhcp_no_default_route: !!v['dhcp-options']?.no_default_route,
        dhcp_reject: Array.isArray(v['dhcp-options']?.reject) ? v['dhcp-options'].reject.join('\n') : (v['dhcp-options']?.reject || ''),
        dhcp_user_class: v['dhcp-options']?.user_class || '',
        dhcp_vendor_class_id: v['dhcp-options']?.vendor_class_id || '',
        dhcpv6_duid: v['dhcpv6-options']?.duid || '',
        dhcpv6_no_release: !!v['dhcpv6-options']?.no_release,
        dhcpv6_no_request_dns: !!v['dhcpv6-options']?.no_request_dns,
        dhcpv6_no_request_domain_name: !!v['dhcpv6-options']?.no_request_domain_name,
        dhcpv6_parameters_only: !!v['dhcpv6-options']?.parameters_only,
        dhcpv6_pd_instances: formatJson(v['dhcpv6-options']?.pd || {}),
        dhcpv6_pd_length: v['dhcpv6-options']?.pd_length || '',
        dhcpv6_rapid_commit: !!v['dhcpv6-options']?.rapid_commit,
        dhcpv6_temporary: !!v['dhcpv6-options']?.temporary,
        vif: formatJson(v.vif || {}),
        vif_s: formatJson(v['vif-s'] || {}),
        vrf: v.vrf || '',
      };
    }

    function formToVeth(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      if (form.peer_name) result.peer_name = form.peer_name;
      if (form.mtu) result.mtu = Number(form.mtu);
      if (form.netns) result.netns = form.netns;
      if (form.disable) result.disable = true;

      // DHCP
      const dhcp = {};
      if (form.dhcp_client_id) dhcp.client_id = form.dhcp_client_id;
      if (form.dhcp_default_route_distance) dhcp.default_route_distance = Number(form.dhcp_default_route_distance);
      if (form.dhcp_host_name) dhcp.host_name = form.dhcp_host_name;
      if (form.dhcp_mtu) dhcp.mtu = true;
      if (form.dhcp_no_default_route) dhcp.no_default_route = true;
      if (form.dhcp_reject) {
        dhcp.reject = form.dhcp_reject.split('\n').filter(Boolean).map(s => s.trim());
      }
      if (form.dhcp_user_class) dhcp.user_class = form.dhcp_user_class;
      if (form.dhcp_vendor_class_id) dhcp.vendor_class_id = form.dhcp_vendor_class_id;
      if (Object.keys(dhcp).length) result['dhcp-options'] = dhcp;

      // DHCPv6
      const dhcpv6 = {};
      if (form.dhcpv6_duid) dhcpv6.duid = form.dhcpv6_duid;
      if (form.dhcpv6_no_release) dhcpv6.no_release = true;
      if (form.dhcpv6_no_request_dns) dhcpv6.no_request_dns = true;
      if (form.dhcpv6_no_request_domain_name) dhcpv6.no_request_domain_name = true;
      if (form.dhcpv6_parameters_only) dhcpv6.parameters_only = true;
      if (form.dhcpv6_pd_instances) {
        dhcpv6.pd = safeJsonParse(form.dhcpv6_pd_instances);
      }
      if (form.dhcpv6_pd_length) dhcpv6.pd_length = Number(form.dhcpv6_pd_length);
      if (form.dhcpv6_rapid_commit) dhcpv6.rapid_commit = true;
      if (form.dhcpv6_temporary) dhcpv6.temporary = true;
      if (Object.keys(dhcpv6).length) result['dhcpv6-options'] = dhcpv6;

      // VIF
      const vif = safeJsonParse(form.vif);
      if (Object.keys(vif).length) result.vif = vif;
      const vifS = safeJsonParse(form.vif_s);
      if (Object.keys(vifS).length) result['vif-s'] = vifS;

      if (form.vrf) result.vrf = form.vrf;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces virtual-ethernet' });
        const cfg = res.data || {};
        veths.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          peer_name: val.peer_name || '',
          mtu: val.mtu || '',
          netns: val.netns || '',
          vif_count: val.vif ? Object.keys(val.vif).length : 0,
          disable: !!val.disable,
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

    function openModal(index = -1) {
      if (index >= 0) {
        editingVeth.value = vethToForm(veths.value[index]);
      } else {
        editingVeth.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingVeth.value;
        const name = form.name;
        if (!name) { alert('请输入接口名称'); return; }

        const config = formToVeth(form);
        console.log('[VirtualEthernet] 保存配置:', JSON.stringify(config, null, 2));

        const path = `interfaces virtual-ethernet ${name}`;
        await api.put('/config', { path, value: config });

        modalVisible.value = false;
        await load();
      } catch (err) {
        showError(err);
      }
    }

    async function remove() {
      if (!selectedVeth.value.length) { alert('请先选择要删除的虚拟以太网接口'); return; }
      if (!confirm(`确定删除选中的 ${selectedVeth.value.length} 个虚拟以太网接口?`)) return;
      try {
        for (const v of selectedVeth.value) {
          await api.delete('/config', { path: `interfaces virtual-ethernet ${v.name}` });
        }
        selectedVeth.value = [];
        await load();
      } catch (err) {
        showError(err);
      }
    }

    onMounted(() => { load(); });

    return {
      loading, veths, selected: selectedVeth, modalVisible, editingVeth, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, dhcpSchema, dhcpv6Schema, vifSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, remove, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="veths"
        :loading="loading"
        :selectable="true"
        :actions="['create', 'edit', 'delete', 'refresh']"
        @create="openModal(-1)"
        @edit="openModal"
        @delete="remove"
        @refresh="load"
        @selection-change="selected = $event"
      />

      <DraggableModal v-model:visible="modalVisible" :title="editingVeth?.name ? '编辑虚拟以太网接口' : '创建虚拟以太网接口'" width="900px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingVeth" />
            </template>
            <template #dhcp>
              <ConfigForm :schema="dhcpSchema" :model="editingVeth" />
            </template>
            <template #dhcpv6>
              <ConfigForm :schema="dhcpv6Schema" :model="editingVeth" />
            </template>
            <template #vif>
              <ConfigForm :schema="vifSchema" :model="editingVeth" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingVeth" />
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
