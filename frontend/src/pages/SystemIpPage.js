import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const TAB_KEYS = ['basic', 'arp', 'multipath', 'nht', 'protocol', 'tcp', 'importTable'];

const PROTOCOLS = ['any', 'babel', 'bgp', 'eigrp', 'isis', 'ospf', 'rip', 'static'];
const ARP_SIZES = ['1024', '2048', '4096', '8192', '16384', '32768'];

export default defineComponent({
  name: 'SystemIpPage',
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal, ConfigForm },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('basic');
    const selectedImportTables = ref([]);
    const importTableModalVisible = ref(false);
    const isEditImportTable = ref(false);
    const importTableForm = ref({ number: '', distance: '', 'route-map': '' });
    const routeMapOptions = ref([{ value: '', label: '' }]);

    const tabs = computed(() => TAB_KEYS.map(key => ({ key, title: t(`systemIp.tabs.${key}`) })));
    const importTableColumns = computed(() => [
      { key: 'number', title: t('systemIp.labels.tableNumber') },
      { key: 'distance', title: t('systemIp.labels.distance') },
      { key: 'route-map', title: t('systemIp.labels.routeMap') },
    ]);
    const importTableFormSchema = computed(() => [
      {
        key: 'number',
        title: t('systemIp.labels.tableNumber'),
        type: 'text',
        required: true,
        disabled: isEditImportTable.value,
        help: t('systemIp.hints.tableNumberRange'),
      },
      {
        key: 'distance',
        title: t('systemIp.labels.distance'),
        type: 'number',
        min: 1,
        max: 255,
        help: t('systemIp.hints.distanceRange'),
      },
      {
        key: 'route-map',
        title: t('systemIp.labels.routeMap'),
        type: 'select',
        options: routeMapOptions.value,
        placeholder: t('systemIp.placeholders.routeMapName'),
      },
    ]);

    const config = ref({
      'disable-forwarding': false,
      arp: { 'table-size': '' },
      multipath: { 'ignore-unreachable-nexthops': false, 'layer4-hashing': false },
      nht: { 'no-resolve-via-default': false },
      protocol: {},
      tcp: { mss: { base: '', floor: '', probing: '' } },
      'import-table': [],
    });

    const commandPath = computed(() => 'system ip');

    function normalizeRouteMapOptions(data) {
      const names = Object.keys(data || {}).sort((a, b) => a.localeCompare(b));
      return [{ value: '', label: '' }, ...names.map(name => ({ value: name, label: name }))];
    }

    async function loadRouteMapOptions(useSession = true) {
      try {
        let nextOptions = [{ value: '', label: '' }];
        if (useSession) {
          const sessionRes = await configApi.get('policy route-map', true);
          nextOptions = normalizeRouteMapOptions(sessionRes.data);
        }
        if (!useSession || nextOptions.length === 1) {
          const runningRes = await configApi.get('policy route-map', false);
          nextOptions = normalizeRouteMapOptions(runningRes.data);
        }
        routeMapOptions.value = nextOptions;
      } catch (e) {
        routeMapOptions.value = [{ value: '', label: '' }];
      }
    }

    async function load(useSession = true) {
      loading.value = true;
      try {
        await loadRouteMapOptions(useSession);
        const res = await configApi.get('system ip', useSession);
        const d = res.data || {};
        const readValue = (obj, hyphenKey, underscoreKey = hyphenKey.replace(/-/g, '_')) => {
          if (!obj || typeof obj !== 'object') return undefined;
          if (Object.prototype.hasOwnProperty.call(obj, hyphenKey)) return obj[hyphenKey];
          if (Object.prototype.hasOwnProperty.call(obj, underscoreKey)) return obj[underscoreKey];
          return undefined;
        };
        const c = {
          'disable-forwarding': false,
          arp: { 'table-size': '' },
          multipath: { 'ignore-unreachable-nexthops': false, 'layer4-hashing': false },
          nht: { 'no-resolve-via-default': false },
          protocol: {},
          tcp: { mss: { base: '', floor: '', probing: '' } },
          'import-table': [],
        };
        if (readValue(d, 'disable-forwarding')) c['disable-forwarding'] = true;
        if (d.arp) c.arp['table-size'] = readValue(d.arp, 'table-size') || '';
        if (d.multipath) {
          c.multipath['ignore-unreachable-nexthops'] = !!readValue(d.multipath, 'ignore-unreachable-nexthops');
          c.multipath['layer4-hashing'] = !!readValue(d.multipath, 'layer4-hashing');
        }
        if (d.nht) c.nht['no-resolve-via-default'] = !!readValue(d.nht, 'no-resolve-via-default');
        if (d.protocol && typeof d.protocol === 'object') {
          for (const [proto, val] of Object.entries(d.protocol)) {
            c.protocol[proto] = readValue(val, 'route-map') || '';
          }
        }
        const knownRouteMaps = new Set(routeMapOptions.value.map(opt => String(opt.value || '')));
        for (const rm of Object.values(c.protocol)) {
          const value = String(rm || '').trim();
          if (value && !knownRouteMaps.has(value)) {
            routeMapOptions.value.push({ value, label: value });
            knownRouteMaps.add(value);
          }
        }
        if (d.tcp?.mss) {
          c.tcp.mss.base = readValue(d.tcp.mss, 'base') || '';
          c.tcp.mss.floor = readValue(d.tcp.mss, 'floor') || '';
          c.tcp.mss.probing = d.tcp.mss.probing || '';
        }
        const importTableData = readValue(d, 'import-table');
        if (importTableData && typeof importTableData === 'object') {
          c['import-table'] = Object.entries(importTableData).map(([num, val]) => ({
            number: num,
            distance: readValue(val, 'distance') || '',
            'route-map': readValue(val, 'route-map') || '',
          }));
        }
        config.value = c;
      } catch (e) {
        showError(e.message || t('systemIp.messages.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function openCreateImportTable() {
      isEditImportTable.value = false;
      importTableForm.value = { number: '', distance: '', 'route-map': '' };
      importTableModalVisible.value = true;
    }

    function openEditImportTable() {
      if (selectedImportTables.value.length !== 1) {
        showError({ message: t('msg.noSelection') });
        return;
      }
      const selectedNumber = String(selectedImportTables.value[0]);
      const item = config.value['import-table'].find(x => String(x.number) === selectedNumber);
      if (!item) {
        showError({ message: t('msg.noSelection') });
        return;
      }

      isEditImportTable.value = true;
      importTableForm.value = {
        number: String(item.number || ''),
        distance: item.distance === undefined || item.distance === null ? '' : String(item.distance),
        'route-map': String(item['route-map'] || ''),
      };
      const currentRouteMap = importTableForm.value['route-map'];
      if (currentRouteMap && !routeMapOptions.value.some(opt => opt.value === currentRouteMap)) {
        routeMapOptions.value = [...routeMapOptions.value, { value: currentRouteMap, label: currentRouteMap }];
      }
      importTableModalVisible.value = true;
    }

    function saveImportTableForm() {
      const number = String(importTableForm.value.number || '').trim();
      const distance = String(importTableForm.value.distance || '').trim();
      const routeMap = String(importTableForm.value['route-map'] || '').trim();

      if (!number) {
        showError({ message: t('systemIp.messages.enterRouteTableNumber') });
        return;
      }
      const tableNumber = Number(number);
      if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 252) {
        showError({ message: t('systemIp.messages.enterRouteTableNumber') });
        return;
      }
      if (distance) {
        const d = Number(distance);
        if (!Number.isInteger(d) || d < 1 || d > 255) {
          showError({ message: t('systemIp.messages.distanceRangeInvalid') });
          return;
        }
      }

      const normalizedNumber = String(tableNumber);
      if (!isEditImportTable.value) {
        const exists = config.value['import-table'].some(item => String(item.number) === normalizedNumber);
        if (exists) {
          showError({ message: t('systemIp.messages.routeTableExists') });
          return;
        }
        config.value['import-table'].push({
          number: normalizedNumber,
          distance,
          'route-map': routeMap,
        });
      } else {
        const idx = config.value['import-table'].findIndex(item => String(item.number) === normalizedNumber);
        if (idx === -1) {
          showError({ message: t('msg.noSelection') });
          return;
        }
        config.value['import-table'][idx].distance = distance;
        config.value['import-table'][idx]['route-map'] = routeMap;
      }

      importTableModalVisible.value = false;
    }

    function removeSelectedImportTables() {
      if (!selectedImportTables.value.length) {
        showError({ message: t('msg.noSelection') });
        return;
      }
      const selectedSet = new Set(selectedImportTables.value.map(String));
      config.value['import-table'] = config.value['import-table'].filter(item => !selectedSet.has(String(item.number)));
      selectedImportTables.value = [];
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('system ip');
        const c = config.value;
        if (c['disable-forwarding']) await configStore.setConfig('system ip disable-forwarding');
        if (c.arp['table-size']) await configStore.setConfig('system ip arp table-size', c.arp['table-size']);
        if (c.multipath['ignore-unreachable-nexthops']) {
          await configStore.setConfig('system ip multipath ignore-unreachable-nexthops');
        }
        if (c.multipath['layer4-hashing']) {
          await configStore.setConfig('system ip multipath layer4-hashing');
        }
        if (c.nht['no-resolve-via-default']) {
          await configStore.setConfig('system ip nht no-resolve-via-default');
        }
        for (const [proto, rm] of Object.entries(c.protocol)) {
          if (rm) await configStore.setConfig(`system ip protocol ${proto} route-map`, rm);
        }
        if (c.tcp.mss.base) await configStore.setConfig('system ip tcp mss base', String(c.tcp.mss.base));
        if (c.tcp.mss.floor) await configStore.setConfig('system ip tcp mss floor', String(c.tcp.mss.floor));
        if (c.tcp.mss.probing) await configStore.setConfig('system ip tcp mss probing', c.tcp.mss.probing);
        for (const item of c['import-table']) {
          if (item.distance) await configStore.setConfig(`system ip import-table ${item.number} distance`, item.distance);
          if (item['route-map']) await configStore.setConfig(`system ip import-table ${item.number} route-map`, item['route-map']);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('systemIp.messages.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load(true);
      onMenuRefresh(() => load(true));
      window.addEventListener('config-committed', () => load(false));
    });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
      tabs, PROTOCOLS, ARP_SIZES, importTableColumns, selectedImportTables, routeMapOptions,
      importTableModalVisible, isEditImportTable, importTableForm, importTableFormSchema,
      load, save, openCreateImportTable, openEditImportTable, saveImportTableForm, removeSelectedImportTables,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #basic>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.disableForwarding') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config['disable-forwarding']" />
              <div class="form-hint">{{ t('systemIp.hints.disableForwarding') }}</div>
            </div>
          </div>
        </template>
        <template #arp>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.arpTableSize') }}</label>
            <div style="flex:1;">
              <select v-model="config.arp['table-size']" class="form-control" style="width:150px">
                <option value=""></option>
                <option v-for="s in ARP_SIZES" :key="s" :value="s">{{ s }}</option>
              </select>
              <div class="form-hint">{{ t('systemIp.hints.arpTableSize') }}</div>
            </div>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.ignoreUnreachableNexthops') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config.multipath['ignore-unreachable-nexthops']" />
              <div class="form-hint">{{ t('systemIp.hints.ignoreUnreachableNexthops') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.layer4Hashing') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config.multipath['layer4-hashing']" />
              <div class="form-hint">{{ t('systemIp.hints.layer4Hashing') }}</div>
            </div>
          </div>
        </template>
        <template #nht>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.noResolveViaDefault') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config.nht['no-resolve-via-default']" />
              <div class="form-hint">{{ t('systemIp.hints.noResolveViaDefault') }}</div>
            </div>
          </div>
        </template>
        <template #protocol>
          <div v-for="proto in PROTOCOLS" :key="proto" class="form-row">
            <label class="form-label">{{ proto }}</label>
            <select class="form-control" v-model="config.protocol[proto]">
              <option v-for="opt in routeMapOptions" :key="opt.value || '__empty__'" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </template>
        <template #tcp>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssBase') }}</label>
            <div style="flex:1;">
              <input class="form-control" type="number" v-model.number="config.tcp.mss.base" min="48" max="1460" style="width:120px" />
              <div class="form-hint">{{ t('systemIp.hints.mssBase') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssFloor') }}</label>
            <div style="flex:1;">
              <input class="form-control" type="number" v-model.number="config.tcp.mss.floor" min="48" max="1460" style="width:120px" />
              <div class="form-hint">{{ t('systemIp.hints.mssFloor') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssProbing') }}</label>
            <div style="flex:1;">
              <select v-model="config.tcp.mss.probing" class="form-control" style="width:200px">
                <option value=""></option>
                <option value="on-icmp-black-hole">{{ t('systemIp.options.onIcmpBlackHole') }}</option>
                <option value="force">{{ t('systemIp.options.force') }}</option>
              </select>
              <div class="form-hint">{{ t('systemIp.hints.mssProbing') }}</div>
            </div>
          </div>
        </template>
        <template #importTable>
          <div>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="openCreateImportTable">{{ t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="openEditImportTable" :disabled="selectedImportTables.length !== 1">{{ t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeSelectedImportTables" :disabled="!selectedImportTables.length">{{ t('app.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable
              style="margin-top:8px"
              :columns="importTableColumns"
              :data="config['import-table']"
              row-key="number"
              :selectable="true"
              :actions="[]"
              :externalToolbar="true"
              @selection-change="selectedImportTables = $event"
            >
              <template #distance="{ value }">{{ value || '-' }}</template>
              <template #route-map="{ value }">{{ value || '-' }}</template>
            </DataTable>
          </div>
        </template>
      </TabGroup>

      <div v-if="['basic', 'arp', 'multipath', 'nht', 'protocol', 'tcp'].includes(activeTab)" style="text-align:right;padding:16px 0;">
        <ToolbarButton icon="save" primary :disabled="saving || loading" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <DraggableModal
        v-model:visible="importTableModalVisible"
        :title="isEditImportTable ? t('systemIp.modals.editImportRouteTable') : t('systemIp.modals.createImportRouteTable')"
        @confirm="saveImportTableForm"
      >
        <ConfigForm v-model="importTableForm" :schema="importTableFormSchema" />
      </DraggableModal>
    </div>
  `,
});
