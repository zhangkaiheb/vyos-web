import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
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
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);

    const zoneColumns = computed(() => [
      { key: 'name', title: t('firewall.zone.zoneName'), dataIndex: 'name', width: 120 },
      { key: 'description', title: t('rule.description'), dataIndex: 'description', width: 200 },
      { key: 'default_action', title: t('firewall.zone.defaultAction'), dataIndex: 'default_action', width: 100 },
      { key: 'default_firewall', title: t('firewall.zone.defaultFirewall'), dataIndex: 'default_firewall', width: 150 },
      { key: 'default_log', title: t('firewall.zone.defaultLog'), dataIndex: 'default_log', width: 80 },
      { key: 'local_zone', title: t('firewall.zone.localZone'), dataIndex: 'local_zone', width: 80 },
      { key: 'member_interfaces', title: t('firewall.zone.memberInterfaces'), dataIndex: 'member_interfaces', width: 200 },
      { key: 'member_vrfs', title: t('firewall.zone.memberVrfs'), dataIndex: 'member_vrfs', width: 120 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const fromColumns = computed(() => [
      { key: 'zone', title: t('firewall.zone.sourceZone'), dataIndex: 'zone', width: 120 },
      { key: 'firewall_name', title: t('firewall.zone.ipv4Ruleset'), dataIndex: 'firewall_name', width: 150 },
      { key: 'firewall_ipv6_name', title: t('firewall.zone.ipv6Ruleset'), dataIndex: 'firewall_ipv6_name', width: 150 },
      { key: 'actions', title: t('app.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ]);

    const zones = ref([]);
    const selected = ref([]);
    const showZoneModal = ref(false);
    const editingZone = ref(null);
    const showFromModal = ref(false);
    const editingFrom = ref(null);

    const zoneSchema = computed(() => [
      { key: 'name', title: t('firewall.zone.zoneName'), type: 'text', required: true, help: t('firewall.zone.zoneNameHelp') },
      { key: 'description', title: t('rule.description'), type: 'text', help: t('firewall.zone.descriptionHelp') },
      { key: 'default_action', title: t('firewall.zone.defaultAction'), type: 'select', options: [
        { value: 'drop', label: t('firewall.zone.dropDefault') },
        { value: 'reject', label: t('firewall.zone.rejectNotify') },
      ], help: t('firewall.zone.defaultActionHelp') },
      { key: 'default_firewall_name', title: t('firewall.zone.defaultIpv4Ruleset'), type: 'text', help: t('firewall.zone.defaultIpv4RulesetHelp') },
      { key: 'default_firewall_ipv6_name', title: t('firewall.zone.defaultIpv6Ruleset'), type: 'text', help: t('firewall.zone.defaultIpv6RulesetHelp') },
      { key: 'default_log', title: t('firewall.zone.defaultLog'), type: 'checkbox', help: t('firewall.zone.defaultLogHelp') },
      { key: 'local_zone', title: t('firewall.zone.localZone'), type: 'checkbox', help: t('firewall.zone.localZoneHelp') },
    ]);

    const fromSchema = computed(() => [
      { key: 'zone', title: t('firewall.zone.sourceZone'), type: 'text', required: true, help: t('firewall.zone.sourceZoneHelp') },
      { key: 'firewall_name', title: t('firewall.zone.ipv4Ruleset'), type: 'text', help: t('firewall.zone.ipv4RulesetHelp') },
      { key: 'firewall_ipv6_name', title: t('firewall.zone.ipv6Ruleset'), type: 'text', help: t('firewall.zone.ipv6RulesetHelp') },
    ]);

    const intraSchema = computed(() => [
      { key: 'action', title: t('rule.action'), type: 'select', options: [
        { value: 'accept', label: t('rule.actionAccept') },
        { value: 'drop', label: t('rule.actionDrop') },
      ], help: t('firewall.zone.intraZoneActionHelp') },
      { key: 'firewall_name', title: t('firewall.zone.ipv4Ruleset'), type: 'text', help: t('firewall.zone.ipv4RulesetHelp') },
      { key: 'firewall_ipv6_name', title: t('firewall.zone.ipv6Ruleset'), type: 'text', help: t('firewall.zone.ipv6RulesetHelp') },
    ]);

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
      try {
        const res = await configApi.get('firewall zone', true);
        zones.value = zoneToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('firewall.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToZone(zones.value);
        await configStore.setConfig('firewall zone', payload);
        configStore.markPending();
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e.message || t('firewall.saveFailed'));
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
      if (!selected.value.length) return showError({ message: t('firewall.zone.selectZoneToEdit') });
      const row = zones.value.find(z => z.name === selected.value[0]);
      if (!row) return showError({ message: t('firewall.zone.zoneNotFound') });
      editingZone.value = JSON.parse(JSON.stringify(row));
      showZoneModal.value = true;
    }

    function removeZone() {
      if (!selected.value.length) return showError({ message: t('firewall.zone.selectZoneToDelete') });
      zones.value = zones.value.filter(z => z.name !== selected.value[0]);
      selected.value = [];
    }

    function saveZone() {
      if (!editingZone.value.name) return showError({ message: t('firewall.zone.enterZoneName') });
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
      if (!editingZone.value.from_zones.length) return showError({ message: t('firewall.zone.addSourceZoneFirst') });
      const first = editingZone.value.from_zones[0];
      editingFrom.value = JSON.parse(JSON.stringify(first));
      showFromModal.value = true;
    }

    function saveFrom() {
      if (!editingFrom.value.zone) return showError({ message: t('firewall.zone.enterSourceZoneName') });
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
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {t,
      
      loading, saving, zones, selected,
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
      <div class="toolbar">
        <ToolbarButton icon="create" @click="createZone">{{ $t('app.create') }}</ToolbarButton>
        <ToolbarButton icon="edit" @click="editZone" :disabled="!selected.length || selected.length > 1">{{ $t('app.edit') }}</ToolbarButton>
        <ToolbarButton icon="delete" @click="removeZone" :disabled="!selected.length">{{ $t('app.delete') }}</ToolbarButton>
      </div>

      <DataTable :columns="zoneColumns" :data="zones" rowKey="name" :externalToolbar="true" @selection-change="selected = $event" :selectable="true" :loading="loading">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'default_log'">
            <span>{{ record.default_log ? $t('app.yes') : $t('app.no') }}</span>
          </template>
          <template v-if="column.key === 'local_zone'">
            <span>{{ record.local_zone ? $t('app.yes') : $t('app.no') }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a @click="editZoneByRecord(record)">{{ $t('app.edit') }}</a>
            <a @click="removeZoneByRecord(record)" style="color:#ff4d4f;margin-left:8px">{{ $t('app.delete') }}</a>
          </template>
        </template>
      </DataTable>

      <DraggableModal v-model:visible="showZoneModal" :title="editingZone && editingZone._name ? $t('firewall.zone.editZone') : $t('firewall.zone.createZone')" @confirm="saveZone" @close="showZoneModal = false" width="700px">
        <ConfigForm :schema="zoneSchema" v-model="editingZone" />

        <div style="font-weight:bold;margin:16px 0 8px;">{{ $t('firewall.zone.memberInterfaces') }}</div>
        <div class="form-row"><label class="form-label">{{ $t('firewall.zone.interface') }}</label><input class="form-control" v-model="editingZone.member_interfaces" :placeholder="$t('firewall.zone.interfacePlaceholder')" :title="$t('firewall.zone.interfaceTitle')" /></div>
        <div class="form-row"><label class="form-label">VRF</label><input class="form-control" v-model="editingZone.member_vrfs" :placeholder="$t('firewall.zone.vrfPlaceholder')" :title="$t('firewall.zone.vrfTitle')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ $t('firewall.zone.intraZoneFiltering') }}</div>
        <div class="form-row"><label class="form-label">{{ $t('rule.action') }}</label>
          <select class="form-control" v-model="editingZone.intra_action" :title="$t('firewall.zone.intraZoneActionTitle')">
            <option value="">{{ $t('firewall.zone.notSet') }}</option>
            <option value="accept">{{ $t('rule.actionAccept') }}</option>
            <option value="drop">{{ $t('rule.actionDrop') }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ $t('firewall.zone.ipv4Ruleset') }}</label><input class="form-control" v-model="editingZone.intra_firewall_name" :title="$t('firewall.zone.intraIpv4RulesetTitle')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('firewall.zone.ipv6Ruleset') }}</label><input class="form-control" v-model="editingZone.intra_firewall_ipv6_name" :title="$t('firewall.zone.intraIpv6RulesetTitle')" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">{{ $t('firewall.zone.sourceZoneFirewall') }}</div>
        <div class="toolbar" style="margin-bottom:8px;">
          <ToolbarButton icon="create" @click="createFrom">{{ $t('app.add') }}</ToolbarButton>
        </div>
        <DataTable :columns="fromColumns" :data="editingZone.from_zones" rowKey="zone" :externalToolbar="true" :selectable="false">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'actions'">
              <a @click="editFromByRecord(record)" style="margin-right:8px">{{ $t('app.edit') }}</a>
              <a @click="removeFrom(index)" style="color:#ff4d4f">{{ $t('app.delete') }}</a>
            </template>
          </template>
        </DataTable>
      </DraggableModal>

      <DraggableModal v-model:visible="showFromModal" :title="editingFrom && editingFrom._zone ? $t('firewall.zone.editSourceZone') : $t('firewall.zone.addSourceZone')" @confirm="saveFrom" @close="showFromModal = false">
        <ConfigForm :schema="fromSchema" v-model="editingFrom" />
      </DraggableModal>
    </div>
  `,
});
