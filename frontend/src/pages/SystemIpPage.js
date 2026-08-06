import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

const TABS = [
  { key: 'basic', title: '基本设置' },
  { key: 'arp', title: 'ARP 缓存' },
  { key: 'multipath', title: '多路径' },
  { key: 'nht', title: 'NHT' },
  { key: 'protocol', title: '协议' },
  { key: 'tcp', title: 'TCP' },
];

const PROTOCOLS = ['any', 'babel', 'bgp', 'eigrp', 'isis', 'ospf', 'rip', 'static'];
const ARP_SIZES = ['1024', '2048', '4096', '8192', '16384', '32768'];

export default defineComponent({
  name: 'SystemIpPage',
  components: { TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('basic');

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
      saved.value = false;
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
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function addImportTable() {
      const num = prompt('请输入路由表编号 (1-252)');
      if (num && !config.value['import-table'].find(t => t.number === num)) {
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
        await configApi.delete('system ip');
        const c = config.value;
        if (c['disable-forwarding']) await configApi.set('system ip disable-forwarding');
        await configApi.set('system ip arp table-size', c.arp['table-size']);
        if (c.multipath['ignore-unreachable-nexthops']) {
          await configApi.set('system ip multipath ignore-unreachable-nexthops');
        }
        if (c.multipath['layer4-hashing']) {
          await configApi.set('system ip multipath layer4-hashing');
        }
        if (c.nht['no-resolve-via-default']) {
          await configApi.set('system ip nht no-resolve-via-default');
        }
        for (const [proto, rm] of Object.entries(c.protocol)) {
          if (rm) await configApi.set(`system ip protocol ${proto} route-map`, rm);
        }
        if (c.tcp.mss.base) await configApi.set('system ip tcp mss base', String(c.tcp.mss.base));
        if (c.tcp.mss.floor) await configApi.set('system ip tcp mss floor', String(c.tcp.mss.floor));
        if (c.tcp.mss.probing) await configApi.set('system ip tcp mss probing', c.tcp.mss.probing);
        for (const t of c['import-table']) {
          if (t.distance) await configApi.set(`system ip import-table ${t.number} distance`, t.distance);
          if (t['route-map']) await configApi.set(`system ip import-table ${t.number} route-map`, t['route-map']);
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
      TABS, PROTOCOLS, ARP_SIZES,
      load, save, addImportTable, removeImportTable,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #basic>
          <div class="form-row">
            <label class="form-label">禁用 IPv4 转发</label>
            <input type="checkbox" v-model="config['disable-forwarding']" />
            <span class="form-hint">禁用所有接口的 IPv4 转发</span>
          </div>
        </template>
        <template #arp>
          <div class="form-row">
            <label class="form-label">ARP 表大小</label>
            <select v-model="config.arp['table-size']" class="form-control" style="width:150px">
              <option v-for="s in ARP_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="form-hint">ARP 缓存最大条目数（默认: 8192）</span>
          </div>
        </template>
        <template #multipath>
          <div class="form-row">
            <label class="form-label">忽略不可达下一跳</label>
            <input type="checkbox" v-model="config.multipath['ignore-unreachable-nexthops']" />
            <span class="form-hint">忽略不在 ARP 表中的下一跳</span>
          </div>
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
        <template #tcp>
          <div class="form-row">
            <label class="form-label">MSS Base</label>
            <input class="form-control" type="number" v-model.number="config.tcp.mss.base" min="48" max="1460" style="width:120px" />
            <span class="form-hint">探测起始 MSS（默认: 1024）</span>
          </div>
          <div class="form-row">
            <label class="form-label">MSS Floor</label>
            <input class="form-control" type="number" v-model.number="config.tcp.mss.floor" min="48" max="1460" style="width:120px" />
            <span class="form-hint">探测最小 MSS（默认: 48）</span>
          </div>
          <div class="form-row">
            <label class="form-label">MSS 探测</label>
            <select v-model="config.tcp.mss.probing" class="form-control" style="width:200px">
              <option value="">禁用</option>
              <option value="on-icmp-black-hole">ICMP 黑洞时探测</option>
              <option value="force">强制探测</option>
            </select>
          </div>
        </template>
      </TabGroup>
      <div style="margin-top:16px">
        <h4>导入路由表</h4>
        <ToolbarButton icon="plus" @click="addImportTable">添加路由表</ToolbarButton>
        <table class="data-table" style="margin-top:8px">
          <thead><tr><th>表编号</th><th>Distance</th><th>Route-map</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="t in config['import-table']" :key="t.number">
              <td>{{ t.number }}</td>
              <td><input class="form-control" type="number" v-model.number="t.distance" min="1" max="255" style="width:80px" /></td>
              <td><input class="form-control" v-model="t['route-map']" /></td>
              <td><a @click="removeImportTable(t)" style="color:#ff4d4f">删除</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>
    </div>
  `,
});
