import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

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

export default defineComponent({
  name: 'FirewallZonePage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);

    const zoneColumns = [
      { key: 'name', title: '区域名称', dataIndex: 'name', width: 120 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'default_action', title: '默认动作', dataIndex: 'default_action', width: 100 },
      { key: 'default_firewall', title: '默认防火墙', dataIndex: 'default_firewall', width: 150 },
      { key: 'default_log', title: '默认日志', dataIndex: 'default_log', width: 80 },
      { key: 'local_zone', title: '本地区域', dataIndex: 'local_zone', width: 80 },
      { key: 'member_interfaces', title: '成员接口', dataIndex: 'member_interfaces', width: 200 },
      { key: 'member_vrfs', title: '成员 VRF', dataIndex: 'member_vrfs', width: 120 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const fromColumns = [
      { key: 'zone', title: '来源区域', dataIndex: 'zone', width: 120 },
      { key: 'firewall_name', title: 'IPv4 规则集', dataIndex: 'firewall_name', width: 150 },
      { key: 'firewall_ipv6_name', title: 'IPv6 规则集', dataIndex: 'firewall_ipv6_name', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const zones = ref([]);
    const selected = ref([]);
    const showZoneModal = ref(false);
    const editingZone = ref(null);
    const showFromModal = ref(false);
    const editingFrom = ref(null);

    const zoneSchema = [
      { key: 'name', title: '区域名称', type: 'text', required: true, help: '区域名称' },
      { key: 'description', title: '描述', type: 'text', help: '区域描述' },
      { key: 'default_action', title: '默认动作', type: 'select', options: [
        { value: 'drop', label: '丢弃 (默认)' },
        { value: 'reject', label: '拒绝并通知源' },
      ], help: '进入此区域的流量的默认操作' },
      { key: 'default_firewall_name', title: '默认 IPv4 规则集', type: 'text', help: '进入此区域的默认 IPv4 防火墙规则集' },
      { key: 'default_firewall_ipv6_name', title: '默认 IPv6 规则集', type: 'text', help: '进入此区域的默认 IPv6 防火墙规则集' },
      { key: 'default_log', title: '默认日志', type: 'checkbox', help: '记录命中默认操作的数据包' },
      { key: 'local_zone', title: '本地区域', type: 'checkbox', help: '将此区域设为本地区域' },
    ];

    const fromSchema = [
      { key: 'zone', title: '来源区域', type: 'text', required: true, help: '来源区域名称' },
      { key: 'firewall_name', title: 'IPv4 规则集', type: 'text', help: 'IPv4 防火墙规则集名称' },
      { key: 'firewall_ipv6_name', title: 'IPv6 规则集', type: 'text', help: 'IPv6 防火墙规则集名称' },
    ];

    const intraSchema = [
      { key: 'action', title: '动作', type: 'select', options: [
        { value: 'accept', label: '接受' },
        { value: 'drop', label: '丢弃' },
      ], help: '区域内流量的操作' },
      { key: 'firewall_name', title: 'IPv4 规则集', type: 'text', help: 'IPv4 防火墙规则集名称' },
      { key: 'firewall_ipv6_name', title: 'IPv6 规则集', type: 'text', help: 'IPv6 防火墙规则集名称' },
    ];

    const commandPath = computed(() => 'firewall zone');

    function zoneToForm(data = {}) {
      const result = [];
      for (const [name, zone] of Object.entries(data)) {
        const fromZones = zone.from || {};
        const member = zone.member || {};
        const intra = zone['intra-zone-filtering'] || {};
        const defaultFw = zone['default-firewall'] || {};

        result.push({
          _name: name,
          name,
          description: zone.description || '',
          default_action: zone['default-action'] || 'drop',
          default_firewall_name: defaultFw.name || '',
          default_firewall_ipv6_name: defaultFw['ipv6-name'] || '',
          default_log: zone['default-log'] !== undefined,
          local_zone: zone['local-zone'] !== undefined,
          member_interfaces: toArray(member.interface).join(', '),
          member_vrfs: toArray(member.vrf).join(', '),
          from_zones: Object.entries(fromZones).map(([z, f]) => ({
            _zone: z,
            zone: z,
            firewall_name: f.firewall?.name || '',
            firewall_ipv6_name: f.firewall?.['ipv6-name'] || '',
          })),
          intra_action: intra.action || '',
          intra_firewall_name: intra.firewall?.name || '',
          intra_firewall_ipv6_name: intra.firewall?.['ipv6-name'] || '',
        });
      }
      return result;
    }

    function formToZone(zonesData) {
      const result = {};
      for (const z of zonesData) {
        if (!z.name) continue;
        const zone = {};
        if (z.description) zone.description = String(z.description);
        if (z.default_action && z.default_action !== 'drop') zone['default-action'] = String(z.default_action);
        const defaultFw = {};
        if (isPresent(z.default_firewall_name)) defaultFw.name = String(z.default_firewall_name);
        if (isPresent(z.default_firewall_ipv6_name)) defaultFw['ipv6-name'] = String(z.default_firewall_ipv6_name);
        if (Object.keys(defaultFw).length) zone['default-firewall'] = defaultFw;
        if (z.default_log) zone['default-log'] = '';
        if (z.local_zone) zone['local-zone'] = '';

        const member = {};
        const interfaces = z.member_interfaces ? String(z.member_interfaces).split(',').map(s => s.trim()).filter(Boolean) : [];
        if (interfaces.length) member.interface = interfaces;
        const vrfs = z.member_vrfs ? String(z.member_vrfs).split(',').map(s => s.trim()).filter(Boolean) : [];
        if (vrfs.length) member.vrf = vrfs;
        if (Object.keys(member).length) zone.member = member;

        const fromZones = {};
        for (const f of z.from_zones || []) {
          if (!f.zone) continue;
          const fw = {};
          if (isPresent(f.firewall_name)) fw.name = String(f.firewall_name);
          if (isPresent(f.firewall_ipv6_name)) fw['ipv6-name'] = String(f.firewall_ipv6_name);
          fromZones[f.zone] = Object.keys(fw).length ? { firewall: fw } : {};
        }
        if (Object.keys(fromZones).length) zone.from = fromZones;

        const intra = {};
        if (z.intra_action) intra.action = String(z.intra_action);
        const intraFw = {};
        if (isPresent(z.intra_firewall_name)) intraFw.name = String(z.intra_firewall_name);
        if (isPresent(z.intra_firewall_ipv6_name)) intraFw['ipv6-name'] = String(z.intra_firewall_ipv6_name);
        if (Object.keys(intraFw).length) intra.firewall = intraFw;
        if (Object.keys(intra).length) zone['intra-zone-filtering'] = intra;

        result[z.name] = zone;
      }
      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('firewall zone', true);
        zones.value = zoneToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToZone(zones.value);
        await configApi.set('firewall zone', payload);
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createZone() {
      editingZone.value = {
        name: '', description: '', default_action: 'drop',
        default_firewall_name: '', default_firewall_ipv6_name: '',
        default_log: false, local_zone: false,
        member_interfaces: '', member_vrfs: '',
        from_zones: [], intra_action: '', intra_firewall_name: '', intra_firewall_ipv6_name: '',
      };
      showZoneModal.value = true;
    }

    function editZone() {
      if (!selected.value.length) return alert('请选择要编辑的区域');
      const row = zones.value.find(z => z.name === selected.value[0]);
      if (!row) return alert('未找到选中的区域');
      editingZone.value = JSON.parse(JSON.stringify(row));
      showZoneModal.value = true;
    }

    function removeZone() {
      if (!selected.value.length) return alert('请选择要删除的区域');
      zones.value = zones.value.filter(z => z.name !== selected.value[0]);
      selected.value = [];
    }

    function saveZone() {
      if (!editingZone.value.name) return alert('请输入区域名称');
      const list = zones.value;
      const idx = list.findIndex(z => z._name === editingZone.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingZone.value });
      else list.push({ ...editingZone.value });
      zones.value = list;
      showZoneModal.value = false;
    }

    function createFrom() {
      editingFrom.value = { zone: '', firewall_name: '', firewall_ipv6_name: '' };
      showFromModal.value = true;
    }

    function editFrom() {
      if (!editingZone.value.from_zones.length) return alert('请先添加来源区域');
      const first = editingZone.value.from_zones[0];
      editingFrom.value = JSON.parse(JSON.stringify(first));
      showFromModal.value = true;
    }

    function saveFrom() {
      if (!editingFrom.value.zone) return alert('请输入来源区域名称');
      const list = editingZone.value.from_zones;
      const idx = list.findIndex(f => f._zone === editingFrom.value._zone);
      if (idx >= 0) list.splice(idx, 1, { ...editingFrom.value });
      else list.push({ ...editingFrom.value });
      editingZone.value.from_zones = list;
      showFromModal.value = false;
    }

    function removeFrom(idx) {
      editingZone.value.from_zones.splice(idx, 1);
    }

    function editZoneByRecord(record) {
      editingZone.value = JSON.parse(JSON.stringify(record));
      showZoneModal.value = true;
    }

    function removeZoneByRecord(record) {
      zones.value = zones.value.filter(z => z.name !== record.name);
    }

    function editFromByRecord(record) {
      editingFrom.value = JSON.parse(JSON.stringify(record));
      showFromModal.value = true;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, zones, selected,
      showZoneModal, editingZone, showFromModal, editingFrom,
      zoneColumns, fromColumns, zoneSchema, fromSchema, intraSchema,
      commandPath,
      load, save,
      createZone, editZone, removeZone, saveZone,
      createFrom, editFrom, saveFrom, removeFrom,
      editZoneByRecord, removeZoneByRecord, editFromByRecord,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <div class="toolbar">
        <ToolbarButton icon="create" @click="createZone">创建</ToolbarButton>
        <ToolbarButton icon="edit" @click="editZone" :disabled="!selected.length || selected.length > 1">编辑</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeZone" :disabled="!selected.length">删除</ToolbarButton>
      </div>

      <DataTable :columns="zoneColumns" :data="zones" rowKey="name" :externalToolbar="true" @selection-change="selected = $event" :selectable="true" :loading="loading">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'default_log'">
            <span>{{ record.default_log ? '是' : '否' }}</span>
          </template>
          <template v-if="column.key === 'local_zone'">
            <span>{{ record.local_zone ? '是' : '否' }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editZoneByRecord(record)">编辑</a>
            <a @click="removeZoneByRecord(record)" style="color:#ff4d4f;margin-left:8px">删除</a>
          </template>
        </template>
      </DataTable>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showZoneModal" :title="editingZone && editingZone._name ? '编辑区域' : '新建区域'" @confirm="saveZone" @close="showZoneModal = false" width="700px">
        <ConfigForm :schema="zoneSchema" v-model="editingZone" />

        <div style="font-weight:bold;margin:16px 0 8px;">成员接口</div>
        <div class="form-row"><label class="form-label">接口</label><input class="form-control" v-model="editingZone.member_interfaces" placeholder="逗号分隔，如 eth0, eth1" title="与区域关联的接口" /></div>
        <div class="form-row"><label class="form-label">VRF</label><input class="form-control" v-model="editingZone.member_vrfs" placeholder="逗号分隔" title="与区域关联的 VRF" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">区域内过滤</div>
        <div class="form-row"><label class="form-label">动作</label>
          <select class="form-control" v-model="editingZone.intra_action" title="区域内流量的操作">
            <option value="">未设置</option>
            <option value="accept">接受</option>
            <option value="drop">丢弃</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">IPv4 规则集</label><input class="form-control" v-model="editingZone.intra_firewall_name" title="区域内 IPv4 防火墙规则集" /></div>
        <div class="form-row"><label class="form-label">IPv6 规则集</label><input class="form-control" v-model="editingZone.intra_firewall_ipv6_name" title="区域内 IPv6 防火墙规则集" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">来源区域防火墙</div>
        <div class="toolbar" style="margin-bottom:8px;">
          <ToolbarButton icon="create" @click="createFrom">添加</ToolbarButton>
        </div>
        <DataTable :columns="fromColumns" :data="editingZone.from_zones" rowKey="zone" :externalToolbar="true" :selectable="false">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'actions'">
              <a @click="editFromByRecord(record)" style="margin-right:8px">编辑</a>
              <a @click="removeFrom(index)" style="color:#ff4d4f">删除</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <DraggableModal v-model:visible="showFromModal" :title="editingFrom && editingFrom._zone ? '编辑来源区域' : '添加来源区域'" @confirm="saveFrom" @close="showFromModal = false">
        <ConfigForm :schema="fromSchema" v-model="editingFrom" />
      </DraggableModal>
    </div>
  `,
});
