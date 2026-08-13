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
      neighbor: { 'table-size': '8192' },
      multipath: { 'layer4-hashing': false },
      nht: { 'no-resolve-via-default': false },
      protocol: {},
    });

    const commandPath = computed(() => 'system ipv6');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('system ipv6', true);
        const d = res.data || {};
        const c = {
          'disable-forwarding': false,
          'strict-dad': false,
          neighbor: { 'table-size': '8192' },
          multipath: { 'layer4-hashing': false },
          nht: { 'no-resolve-via-default': false },
          protocol: {},
        };
        if (d['disable-forwarding']) c['disable-forwarding'] = true;
        if (d['strict-dad']) c['strict-dad'] = true;
        if (d.neighbor) c.neighbor['table-size'] = d.neighbor['table-size'] || '8192';
        if (d.multipath) c.multipath['layer4-hashing'] = !!d.multipath['layer4-hashing'];
        if (d.nht) c.nht['no-resolve-via-default'] = !!d.nht['no-resolve-via-default'];
        if (d.protocol) {
          for (const [proto, val] of Object.entries(d.protocol)) {
            c.protocol[proto] = val?.['route-map'] || '';
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
        await configApi.delete('system ipv6');
        const c = config.value;
        if (c['disable-forwarding']) await configApi.set('system ipv6 disable-forwarding');
        if (c['strict-dad']) await configApi.set('system ipv6 strict-dad');
        await configApi.set('system ipv6 neighbor table-size', c.neighbor['table-size']);
        if (c.multipath['layer4-hashing']) {
          await configApi.set('system ipv6 multipath layer4-hashing');
        }
        if (c.nht['no-resolve-via-default']) {
          await configApi.set('system ipv6 nht no-resolve-via-default');
        }
        for (const [proto, rm] of Object.entries(c.protocol)) {
          if (rm) await configApi.set(`system ipv6 protocol ${proto} route-map`, rm);
        }
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('systemIpv6.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
      TABS, PROTOCOLS, NEIGHBOR_SIZES,
      load, save,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #basic>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.disableIpv6Forwarding') }}</label>
            <input type="checkbox" v-model="config['disable-forwarding']" />
            <span class="form-hint">{{ t('systemIpv6.hints.disableIpv6Forwarding') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.strictDad') }}</label>
            <input type="checkbox" v-model="config['strict-dad']" />
            <span class="form-hint">{{ t('systemIpv6.hints.strictDad') }}</span>
          </div>
        </template>
        <template #neighbor>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.neighborTableSize') }}</label>
            <select v-model="config.neighbor['table-size']" class="form-control" style="width:150px">
              <option v-for="s in NEIGHBOR_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="form-hint">{{ t('systemIpv6.hints.neighborTableSize') }}</span>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.layer4Hash') }}</label>
            <input type="checkbox" v-model="config.multipath['layer4-hashing']" />
            <span class="form-hint">{{ t('systemIpv6.hints.layer4Hash') }}</span>
          </div>
        </template>
        <template #nht>
          <div class="form-row">
            <label class="form-label">{{ t('systemIpv6.labels.resolveViaDefault') }}</label>
            <input type="checkbox" v-model="config.nht['no-resolve-via-default']" />
            <span class="form-hint">{{ t('systemIpv6.hints.resolveViaDefault') }}</span>
          </div>
        </template>
        <template #protocol>
          <div v-for="proto in PROTOCOLS" :key="proto" class="form-row">
            <label class="form-label">{{ proto }}</label>
            <input class="form-control" v-model="config.protocol[proto]" :placeholder="t('systemIpv6.placeholders.routeMapName')" />
          </div>
        </template>
      </TabGroup>
    </div>
  `,
});
