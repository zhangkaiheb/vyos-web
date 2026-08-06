import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const TABS = [
  { key: 'global', title: '全局设置' },
  { key: 'console', title: '控制台' },
  { key: 'local', title: '本地日志' },
  { key: 'remote', title: '远程主机' },
];

const FACILITIES = [
  'all', 'auth', 'authpriv', 'cron', 'daemon', 'kern', 'lpr',
  'mail', 'mark', 'news', 'syslog', 'user', 'uucp',
  'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7',
];
const LEVELS = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug', 'all'];

export default defineComponent({
  name: 'SyslogPage',
  components: { CommandPreview, ToolbarButton, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('global');

    const config = ref({
      'console': {},
      'local': {},
      'marker': { disable: false, interval: 1200 },
      'preserve-fqdn': false,
      'remote': {},
    });

    const commandPath = computed(() => 'system syslog');

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('system syslog', true);
        const d = res.data || {};
        const c = {
          'console': {},
          'local': {},
          'marker': { disable: false, interval: 1200 },
          'preserve-fqdn': false,
          'remote': {},
        };
        if (d.console) {
          for (const [fac, val] of Object.entries(d.console)) {
            c.console[fac] = val?.level || 'err';
          }
        }
        if (d.local) {
          for (const [fac, val] of Object.entries(d.local)) {
            c.local[fac] = val?.level || 'err';
          }
        }
        if (d.marker) {
          c.marker.disable = !!d.marker.disable;
          c.marker.interval = d.marker.interval || 1200;
        }
        if (d['preserve-fqdn']) c['preserve-fqdn'] = true;
        if (d.remote) {
          for (const [host, val] of Object.entries(d.remote)) {
            c.remote[host] = {
              port: val?.port || 514,
              protocol: val?.protocol || 'udp',
              'source-address': val?.['source-address'] || '',
              facilities: {},
            };
            if (val.facility) {
              for (const [fac, fval] of Object.entries(val.facility)) {
                c.remote[host].facilities[fac] = fval?.level || 'err';
              }
            }
          }
        }
        config.value = c;
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    function setFacility(target, fac, level) {
      if (!target[fac]) target[fac] = 'err';
      target[fac] = level;
    }

    function removeFacility(target, fac) {
      delete target[fac];
    }

    function addRemoteHost() {
      const host = prompt('请输入远程主机地址');
      if (host && !config.value.remote[host]) {
        config.value.remote[host] = { port: 514, protocol: 'udp', 'source-address': '', facilities: {} };
      }
    }

    function removeRemoteHost(host) {
      if (confirm(`确认删除远程主机 ${host}？`)) {
        delete config.value.remote[host];
      }
    }

    function setRemoteFacility(host, fac, level) {
      const r = config.value.remote[host];
      if (!r.facilities[fac]) r.facilities[fac] = 'err';
      r.facilities[fac] = level;
    }

    function removeRemoteFacility(host, fac) {
      delete config.value.remote[host].facilities[fac];
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('system syslog');
        const c = config.value;
        for (const [fac, level] of Object.entries(c.console)) {
          await configApi.set(`system syslog console facility ${fac} level`, level);
        }
        for (const [fac, level] of Object.entries(c.local)) {
          await configApi.set(`system syslog local facility ${fac} level`, level);
        }
        if (c.marker.disable) await configApi.set('system syslog marker disable');
        await configApi.set('system syslog marker interval', String(c.marker.interval));
        if (c['preserve-fqdn']) await configApi.set('system syslog preserve-fqdn');
        for (const [host, r] of Object.entries(c.remote)) {
          await configApi.set(`system syslog remote ${host} port`, String(r.port));
          await configApi.set(`system syslog remote ${host} protocol`, r.protocol);
          if (r['source-address']) await configApi.set(`system syslog remote ${host} source-address`, r['source-address']);
          for (const [fac, level] of Object.entries(r.facilities)) {
            await configApi.set(`system syslog remote ${host} facility ${fac} level`, level);
          }
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
      TABS, FACILITIES, LEVELS,
      load, save,
      setFacility, removeFacility,
      addRemoteHost, removeRemoteHost,
      setRemoteFacility, removeRemoteFacility,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #global>
          <div class="form-row">
            <label class="form-label">Preserve FQDN</label>
            <input type="checkbox" v-model="config['preserve-fqdn']" />
            <span class="form-hint">在主机名中始终包含域名部分</span>
          </div>
          <div class="form-row">
            <label class="form-label">Marker 间隔</label>
            <input class="form-control" type="number" v-model.number="config.marker.interval" min="1" max="65535" style="width:120px" />
            <span class="form-hint">标记消息发送间隔（秒，默认: 1200）</span>
          </div>
          <div class="form-row">
            <label class="form-label">Marker 禁用</label>
            <input type="checkbox" v-model="config.marker.disable" />
            <span class="form-hint">禁用标记消息</span>
          </div>
        </template>
        <template #console>
          <table class="data-table">
            <thead><tr><th>Facility</th><th>Level</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="fac in FACILITIES" :key="fac">
                <td>{{ fac }}</td>
                <td>
                  <select v-if="config.console[fac]" v-model="config.console[fac]" class="form-control" style="width:120px">
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <span v-else style="color:#999">未配置</span>
                </td>
                <td>
                  <a v-if="!config.console[fac]" @click="setFacility(config.console, fac, 'err')" style="color:#1890ff">添加</a>
                  <a v-else @click="removeFacility(config.console, fac)" style="color:#ff4d4f">删除</a>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <template #local>
          <table class="data-table">
            <thead><tr><th>Facility</th><th>Level</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="fac in FACILITIES" :key="fac">
                <td>{{ fac }}</td>
                <td>
                  <select v-if="config.local[fac]" v-model="config.local[fac]" class="form-control" style="width:120px">
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <span v-else style="color:#999">未配置</span>
                </td>
                <td>
                  <a v-if="!config.local[fac]" @click="setFacility(config.local, fac, 'err')" style="color:#1890ff">添加</a>
                  <a v-else @click="removeFacility(config.local, fac)" style="color:#ff4d4f">删除</a>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <template #remote>
          <div style="margin-bottom:12px">
            <ToolbarButton icon="plus" @click="addRemoteHost">添加远程主机</ToolbarButton>
          </div>
          <div v-for="(r, host) in config.remote" :key="host" style="border:1px solid #e8e8e8;border-radius:4px;padding:12px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>{{ host }}</strong>
              <a @click="removeRemoteHost(host)" style="color:#ff4d4f">删除主机</a>
            </div>
            <div class="form-row">
              <label class="form-label">端口</label>
              <input class="form-control" type="number" v-model.number="r.port" min="1" max="65535" style="width:100px" />
            </div>
            <div class="form-row">
              <label class="form-label">协议</label>
              <select v-model="r.protocol" class="form-control" style="width:100px">
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">源地址</label>
              <input class="form-control" v-model="r['source-address']" placeholder="源IP地址" />
            </div>
            <table class="data-table" style="margin-top:8px">
              <thead><tr><th>Facility</th><th>Level</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="fac in FACILITIES" :key="fac">
                  <td>{{ fac }}</td>
                  <td>
                    <select v-if="r.facilities[fac]" v-model="r.facilities[fac]" class="form-control" style="width:120px">
                      <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                    </select>
                    <span v-else style="color:#999">未配置</span>
                  </td>
                  <td>
                    <a v-if="!r.facilities[fac]" @click="setRemoteFacility(host, fac, 'err')" style="color:#1890ff">添加</a>
                    <a v-else @click="removeRemoteFacility(host, fac)" style="color:#ff4d4f">删除</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </TabGroup>
      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>
    </div>
  `,
});
