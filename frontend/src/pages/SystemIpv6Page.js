import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

const TABS = [
  { key: 'basic', title: '基本设置' },
  { key: 'neighbor', title: '邻居缓存' },
  { key: 'multipath', title: '多路径' },
  { key: 'nht', title: 'NHT' },
  { key: 'protocol', title: '协议' },
];

const PROTOCOLS = ['any', 'babel', 'bgp', 'eigrp', 'isis', 'ospf', 'rip', 'static'];
const NEIGHBOR_SIZES = ['1024', '2048', '4096', '8192', '16384', '32768'];

export default defineComponent({
  name: 'SystemIpv6Page',
  components: { TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('basic');

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
      saved.value = false;
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
        showError(e.message || '加载失败');
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
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {
      loading, saving, saved, config, activeTab, commandPath,
      TABS, PROTOCOLS, NEIGHBOR_SIZES,
      load, save,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #basic>
          <div class="form-row">
            <label class="form-label">禁用 IPv6 转发</label>
            <input type="checkbox" v-model="config['disable-forwarding']" />
            <span class="form-hint">禁用所有接口的 IPv6 转发</span>
          </div>
          <div class="form-row">
            <label class="form-label">Strict DAD</label>
            <input type="checkbox" v-model="config['strict-dad']" />
            <span class="form-hint">当 DAD 失败时禁用接口 IPv6 操作</span>
          </div>
        </template>
        <template #neighbor>
          <div class="form-row">
            <label class="form-label">邻居表大小</label>
            <select v-model="config.neighbor['table-size']" class="form-control" style="width:150px">
              <option v-for="s in NEIGHBOR_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="form-hint">邻居发现缓存最大条目数（默认: 8192）</span>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">Layer4 哈希</label>
            <input type="checkbox" v-model="config.multipath['layer4-hashing']" />
            <span class="form-hint">使用 Layer 4 信息进行 ECMP 哈希</span>
          </div>
        </template>
        <template #nht>
          <div class="form-row">
            <label class="form-label">不通过默认路由解析</label>
            <input type="checkbox" v-model="config.nht['no-resolve-via-default']" />
            <span class="form-hint">不通过默认路由解析下一跳</span>
          </div>
        </template>
        <template #protocol>
          <div v-for="proto in PROTOCOLS" :key="proto" class="form-row">
            <label class="form-label">{{ proto }}</label>
            <input class="form-control" v-model="config.protocol[proto]" placeholder="Route-map 名称" />
          </div>
        </template>
      </TabGroup>
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>
    </div>
  `,
});
