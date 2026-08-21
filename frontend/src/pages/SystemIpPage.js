import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const TAB_KEYS = ['basic', 'arp', 'multipath', 'nht', 'protocol', 'tcp'];

const PROTOCOLS = ['any', 'babel', 'bgp', 'eigrp', 'isis', 'ospf', 'rip', 'static'];
const ARP_SIZES = ['1024', '2048', '4096', '8192', '16384', '32768'];

export default defineComponent({
  name: 'SystemIpPage',
  components: { TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('basic');

    const tabs = computed(() => TAB_KEYS.map(key => ({ key, title: t(`systemIp.tabs.${key}`) })));

    const config = ref({
      'disable-forwarding': false,
      arp: { 'table-size': '8192' },
      multipath: { 'ignore-unreachable-nexthops': false, 'layer4-hashing': false },
      nht: { 'no-resolve-via-default': false },
      protocol: {},
      tcp: { mss: { base: 1024, floor: 48, probing: '' } },
      'import-table': [],
    });

    const commandPath = computed(() => 'system ip');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('system ip', true);
        const d = res.data || {};
        const c = {
          'disable-forwarding': false,
          arp: { 'table-size': '8192' },
          multipath: { 'ignore-unreachable-nexthops': false, 'layer4-hashing': false },
          nht: { 'no-resolve-via-default': false },
          protocol: {},
          tcp: { mss: { base: 1024, floor: 48, probing: '' } },
          'import-table': [],
        };
        if (d['disable-forwarding']) c['disable-forwarding'] = true;
        if (d.arp) c.arp['table-size'] = d.arp['table-size'] || '8192';
        if (d.multipath) {
          c.multipath['ignore-unreachable-nexthops'] = !!d.multipath['ignore-unreachable-nexthops'];
          c.multipath['layer4-hashing'] = !!d.multipath['layer4-hashing'];
        }
        if (d.nht) c.nht['no-resolve-via-default'] = !!d.nht['no-resolve-via-default'];
        if (d.protocol) {
          for (const [proto, val] of Object.entries(d.protocol)) {
            c.protocol[proto] = val?.['route-map'] || '';
          }
        }
        if (d.tcp?.mss) {
          c.tcp.mss.base = d.tcp.mss.base || 1024;
          c.tcp.mss.floor = d.tcp.mss.floor || 48;
          c.tcp.mss.probing = d.tcp.mss.probing || '';
        }
        if (d['import-table']) {
          c['import-table'] = Object.entries(d['import-table']).map(([num, val]) => ({
            number: num,
            distance: val?.distance || '',
            'route-map': val?.['route-map'] || '',
          }));
        }
        config.value = c;
      } catch (e) {
        showError(e.message || t('systemIp.messages.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    function addImportTable() {
      const num = prompt(t('systemIp.messages.enterRouteTableNumber'));
      if (num && !config.value['import-table'].find(item => item.number === num)) {
        config.value['import-table'].push({ number: num, distance: '', 'route-map': '' });
      }
    }

    function removeImportTable(item) {
      const idx = config.value['import-table'].indexOf(item);
      if (idx >= 0) config.value['import-table'].splice(idx, 1);
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('system ip');
        const c = config.value;
        if (c['disable-forwarding']) await configStore.setConfig('system ip disable-forwarding');
        await configStore.setConfig('system ip arp table-size', c.arp['table-size']);
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

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
      tabs, PROTOCOLS, ARP_SIZES,
      load, save, addImportTable, removeImportTable,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #basic>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.disableForwarding') }}</label>
            <input type="checkbox" v-model="config['disable-forwarding']" />
            <span class="form-hint">{{ t('systemIp.hints.disableForwarding') }}</span>
          </div>
        </template>
        <template #arp>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.arpTableSize') }}</label>
            <select v-model="config.arp['table-size']" class="form-control" style="width:150px">
              <option v-for="s in ARP_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="form-hint">{{ t('systemIp.hints.arpTableSize') }}</span>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.ignoreUnreachableNexthops') }}</label>
            <input type="checkbox" v-model="config.multipath['ignore-unreachable-nexthops']" />
            <span class="form-hint">{{ t('systemIp.hints.ignoreUnreachableNexthops') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.layer4Hashing') }}</label>
            <input type="checkbox" v-model="config.multipath['layer4-hashing']" />
            <span class="form-hint">{{ t('systemIp.hints.layer4Hashing') }}</span>
          </div>
        </template>
        <template #nht>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.noResolveViaDefault') }}</label>
            <input type="checkbox" v-model="config.nht['no-resolve-via-default']" />
            <span class="form-hint">{{ t('systemIp.hints.noResolveViaDefault') }}</span>
          </div>
        </template>
        <template #protocol>
          <div v-for="proto in PROTOCOLS" :key="proto" class="form-row">
            <label class="form-label">{{ proto }}</label>
            <input class="form-control" v-model="config.protocol[proto]" :placeholder="t('systemIp.placeholders.routeMapName')" />
          </div>
        </template>
        <template #tcp>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssBase') }}</label>
            <input class="form-control" type="number" v-model.number="config.tcp.mss.base" min="48" max="1460" style="width:120px" />
            <span class="form-hint">{{ t('systemIp.hints.mssBase') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssFloor') }}</label>
            <input class="form-control" type="number" v-model.number="config.tcp.mss.floor" min="48" max="1460" style="width:120px" />
            <span class="form-hint">{{ t('systemIp.hints.mssFloor') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIp.labels.mssProbing') }}</label>
            <select v-model="config.tcp.mss.probing" class="form-control" style="width:200px">
              <option value="">{{ t('systemIp.options.disabled') }}</option>
              <option value="on-icmp-black-hole">{{ t('systemIp.options.onIcmpBlackHole') }}</option>
              <option value="force">{{ t('systemIp.options.force') }}</option>
            </select>
          </div>
        </template>
      </TabGroup>
      <div style="margin-top:16px">
        <h4>{{ t('systemIp.labels.importRouteTable') }}</h4>
        <ToolbarButton icon="plus" @click="addImportTable">{{ t('systemIp.buttons.addRouteTable') }}</ToolbarButton>
        <table class="data-table" style="margin-top:8px">
          <thead><tr><th>{{ t('systemIp.labels.tableNumber') }}</th><th>Distance</th><th>Route-map</th><th>{{ t('systemIp.labels.actions') }}</th></tr></thead>
          <tbody>
            <tr v-for="item in config['import-table']" :key="item.number">
              <td>{{ item.number }}</td>
              <td><input class="form-control" type="number" v-model.number="item.distance" min="1" max="255" style="width:80px" /></td>
              <td><input class="form-control" v-model="item['route-map']" /></td>
              <td><a @click="removeImportTable(item)" style="color:#ff4d4f">{{ t('systemIp.buttons.delete') }}</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
});
