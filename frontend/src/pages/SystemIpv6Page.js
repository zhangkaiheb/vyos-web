import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

const PROTOCOLS = ['any', 'babel', 'bgp', 'eigrp', 'isis', 'ospf', 'rip', 'static'];
const NEIGHBOR_SIZES = ['1024', '2048', '4096', '8192', '16384', '32768'];

export default defineComponent({
  name: 'SystemIpv6Page',
  components: { TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('basic');
    const routeMapOptions = ref([{ value: '', label: '' }]);

    const TABS = computed(() => [
      { key: 'basic', title: t('systemIpv6.tabs.basic') },
      { key: 'neighbor', title: t('systemIpv6.tabs.neighbor') },
      { key: 'multipath', title: t('systemIpv6.tabs.multipath') },
      { key: 'nht', title: t('systemIpv6.tabs.nht') },
      { key: 'protocol', title: t('systemIpv6.tabs.protocol') },
    ]);

    const config = ref({
      'disable-forwarding': false,
      'strict-dad': false,
      neighbor: { 'table-size': '' },
      multipath: { 'layer4-hashing': false },
      nht: { 'no-resolve-via-default': false },
      protocol: {},
    });

    const commandPath = computed(() => 'system ipv6');

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
        const res = await configApi.get('system ipv6', useSession);
        const d = res.data || {};
        const readValue = (obj, hyphenKey, underscoreKey = hyphenKey.replace(/-/g, '_')) => {
          if (!obj || typeof obj !== 'object') return undefined;
          if (Object.prototype.hasOwnProperty.call(obj, hyphenKey)) return obj[hyphenKey];
          if (Object.prototype.hasOwnProperty.call(obj, underscoreKey)) return obj[underscoreKey];
          return undefined;
        };
        const c = {
          'disable-forwarding': false,
          'strict-dad': false,
          neighbor: { 'table-size': '' },
          multipath: { 'layer4-hashing': false },
          nht: { 'no-resolve-via-default': false },
          protocol: {},
        };
        if (readValue(d, 'disable-forwarding')) c['disable-forwarding'] = true;
        if (readValue(d, 'strict-dad')) c['strict-dad'] = true;
        if (d.neighbor) c.neighbor['table-size'] = readValue(d.neighbor, 'table-size') || '';
        if (d.multipath) c.multipath['layer4-hashing'] = !!readValue(d.multipath, 'layer4-hashing');
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
        config.value = c;
      } catch (e) {
        showError(e.message || t('systemIpv6.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('system ipv6');
        const c = config.value;
        if (c['disable-forwarding']) await configStore.setConfig('system ipv6 disable-forwarding');
        if (c['strict-dad']) await configStore.setConfig('system ipv6 strict-dad');
        if (c.neighbor['table-size']) await configStore.setConfig('system ipv6 neighbor table-size', c.neighbor['table-size']);
        if (c.multipath['layer4-hashing']) {
          await configStore.setConfig('system ipv6 multipath layer4-hashing');
        }
        if (c.nht['no-resolve-via-default']) {
          await configStore.setConfig('system ipv6 nht no-resolve-via-default');
        }
        for (const [proto, rm] of Object.entries(c.protocol)) {
          if (rm) await configStore.setConfig(`system ipv6 protocol ${proto} route-map`, rm);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('systemIpv6.errors.saveFailed'));
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
      TABS, PROTOCOLS, NEIGHBOR_SIZES, routeMapOptions,
      load, save,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #basic>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.disableIpv6Forwarding') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config['disable-forwarding']" />
              <div class="form-hint">{{ t('systemIpv6.hints.disableIpv6Forwarding') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.strictDad') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config['strict-dad']" />
              <div class="form-hint">{{ t('systemIpv6.hints.strictDad') }}</div>
            </div>
          </div>
        </template>
        <template #neighbor>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.neighborTableSize') }}</label>
            <div style="flex:1;">
              <select v-model="config.neighbor['table-size']" class="form-control" style="width:150px">
                <option value=""></option>
                <option v-for="s in NEIGHBOR_SIZES" :key="s" :value="s">{{ s }}</option>
              </select>
              <div class="form-hint">{{ t('systemIpv6.hints.neighborTableSize') }}</div>
            </div>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.layer4Hash') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config.multipath['layer4-hashing']" />
              <div class="form-hint">{{ t('systemIpv6.hints.layer4Hash') }}</div>
            </div>
          </div>
        </template>
        <template #nht>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.resolveViaDefault') }}</label>
            <div style="flex:1;">
              <input type="checkbox" v-model="config.nht['no-resolve-via-default']" />
              <div class="form-hint">{{ t('systemIpv6.hints.resolveViaDefault') }}</div>
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
      </TabGroup>

      <div v-if="['basic', 'neighbor', 'multipath', 'nht', 'protocol'].includes(activeTab)" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving || loading" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>
    </div>
  `,
});
