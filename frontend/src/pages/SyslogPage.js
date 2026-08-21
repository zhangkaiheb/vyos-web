import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

const FACILITIES = [
  'all', 'auth', 'authpriv', 'cron', 'daemon', 'kern', 'lpr',
  'mail', 'mark', 'news', 'syslog', 'user', 'uucp',
  'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7',
];
const LEVELS = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug', 'all'];

export default defineComponent({
  name: 'SyslogPage',
  components: { ToolbarButton, TabGroup, DraggableModal },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const loading = ref(false);
    const saving = ref(false);
    const activeTab = ref('global');
    const deleteRemoteHostModalVisible = ref(false);
    const pendingDeleteRemoteHostName = ref('');

    const TABS = computed(() => [
      { key: 'global', title: t('syslog.globalSettings') },
      { key: 'console', title: t('syslog.console') },
      { key: 'local', title: t('syslog.localLog') },
      { key: 'remote', title: t('syslog.remoteHost') },
    ]);

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
        showError(e.message || t('syslog.loadFailed'));
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
      const host = prompt(t('syslog.enterRemoteHost'));
      if (host && !config.value.remote[host]) {
        config.value.remote[host] = { port: 514, protocol: 'udp', 'source-address': '', facilities: {} };
      }
    }

    function removeRemoteHost(host) {
      pendingDeleteRemoteHostName.value = host;
      deleteRemoteHostModalVisible.value = true;
    }

    function confirmDeleteRemoteHost() {
      deleteRemoteHostModalVisible.value = false;
      delete config.value.remote[pendingDeleteRemoteHostName.value];
      pendingDeleteRemoteHostName.value = '';
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
        await configStore.deleteConfig('system syslog');
        const c = config.value;
        for (const [fac, level] of Object.entries(c.console)) {
          await configStore.setConfig(`system syslog console facility ${fac} level`, level);
        }
        for (const [fac, level] of Object.entries(c.local)) {
          await configStore.setConfig(`system syslog local facility ${fac} level`, level);
        }
        if (c.marker.disable) await configStore.setConfig('system syslog marker disable');
        await configStore.setConfig('system syslog marker interval', String(c.marker.interval));
        if (c['preserve-fqdn']) await configStore.setConfig('system syslog preserve-fqdn');
        for (const [host, r] of Object.entries(c.remote)) {
          await configStore.setConfig(`system syslog remote ${host} port`, String(r.port));
          await configStore.setConfig(`system syslog remote ${host} protocol`, r.protocol);
          if (r['source-address']) await configStore.setConfig(`system syslog remote ${host} source-address`, r['source-address']);
          for (const [fac, level] of Object.entries(r.facilities)) {
            await configStore.setConfig(`system syslog remote ${host} facility ${fac} level`, level);
          }
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('syslog.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); window.addEventListener('config-committed', load); });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
      deleteRemoteHostModalVisible, pendingDeleteRemoteHostName,
      TABS, FACILITIES, LEVELS,
      load, save,
      setFacility, removeFacility,
      addRemoteHost, removeRemoteHost, confirmDeleteRemoteHost,
      setRemoteFacility, removeRemoteFacility,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="TABS">
        <template #global>
          <div class="form-row">
            <label class="form-label">{{ $t('syslog.preserveFqdn') }}</label>
            <input type="checkbox" v-model="config['preserve-fqdn']" />
            <span class="form-hint">{{ $t('syslog.preserveFqdnHint') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('syslog.markerInterval') }}</label>
            <input class="form-control" type="number" v-model.number="config.marker.interval" min="1" max="65535" style="width:120px" />
            <span class="form-hint">{{ $t('syslog.markerIntervalHint') }}</span>
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('syslog.markerDisable') }}</label>
            <input type="checkbox" v-model="config.marker.disable" />
            <span class="form-hint">{{ $t('syslog.markerDisableHint') }}</span>
          </div>
        </template>
        <template #console>
          <table class="data-table">
            <thead><tr><th>{{ $t('syslog.facility') }}</th><th>{{ $t('syslog.level') }}</th><th>{{ $t('syslog.actions') }}</th></tr></thead>
            <tbody>
              <tr v-for="fac in FACILITIES" :key="fac">
                <td>{{ fac }}</td>
                <td>
                  <select v-if="config.console[fac]" v-model="config.console[fac]" class="form-control" style="width:120px">
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <span v-else style="color:#999">{{ $t('syslog.notConfigured') }}</span>
                </td>
                <td>
                  <a v-if="!config.console[fac]" @click="setFacility(config.console, fac, 'err')" style="color:#1890ff">{{ $t('syslog.add') }}</a>
                  <a v-else @click="removeFacility(config.console, fac)" style="color:#ff4d4f">{{ $t('syslog.delete') }}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <template #local>
          <table class="data-table">
            <thead><tr><th>{{ $t('syslog.facility') }}</th><th>{{ $t('syslog.level') }}</th><th>{{ $t('syslog.actions') }}</th></tr></thead>
            <tbody>
              <tr v-for="fac in FACILITIES" :key="fac">
                <td>{{ fac }}</td>
                <td>
                  <select v-if="config.local[fac]" v-model="config.local[fac]" class="form-control" style="width:120px">
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <span v-else style="color:#999">{{ $t('syslog.notConfigured') }}</span>
                </td>
                <td>
                  <a v-if="!config.local[fac]" @click="setFacility(config.local, fac, 'err')" style="color:#1890ff">{{ $t('syslog.add') }}</a>
                  <a v-else @click="removeFacility(config.local, fac)" style="color:#ff4d4f">{{ $t('syslog.delete') }}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <template #remote>
          <div style="margin-bottom:12px">
            <ToolbarButton icon="plus" @click="addRemoteHost">{{ $t('syslog.addRemoteHost') }}</ToolbarButton>
          </div>
          <div v-for="(r, host) in config.remote" :key="host" style="border:1px solid #e8e8e8;border-radius:4px;padding:12px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>{{ host }}</strong>
              <a @click="removeRemoteHost(host)" style="color:#ff4d4f">{{ $t('syslog.deleteHost') }}</a>
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('syslog.port') }}</label>
              <input class="form-control" type="number" v-model.number="r.port" min="1" max="65535" style="width:100px" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('syslog.protocol') }}</label>
              <select v-model="r.protocol" class="form-control" style="width:100px">
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('syslog.sourceAddress') }}</label>
              <input class="form-control" v-model="r['source-address']" :placeholder="$t('syslog.sourceAddressPlaceholder')" />
            </div>
            <table class="data-table" style="margin-top:8px">
              <thead><tr><th>{{ $t('syslog.facility') }}</th><th>{{ $t('syslog.level') }}</th><th>{{ $t('syslog.actions') }}</th></tr></thead>
              <tbody>
                <tr v-for="fac in FACILITIES" :key="fac">
                  <td>{{ fac }}</td>
                  <td>
                    <select v-if="r.facilities[fac]" v-model="r.facilities[fac]" class="form-control" style="width:120px">
                      <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                    </select>
                    <span v-else style="color:#999">{{ $t('syslog.notConfigured') }}</span>
                  </td>
                  <td>
                    <a v-if="!r.facilities[fac]" @click="setRemoteFacility(host, fac, 'err')" style="color:#1890ff">{{ $t('syslog.add') }}</a>
                    <a v-else @click="removeRemoteFacility(host, fac)" style="color:#ff4d4f">{{ $t('syslog.delete') }}</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </TabGroup>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" @click="save" :disabled="saving || loading">{{ saving ? $t('syslog.saving') : $t('syslog.confirm') }}</ToolbarButton>
        </div>
      </div>
      <DraggableModal v-model:visible="deleteRemoteHostModalVisible" :title="$t('syslog.confirmDelete')" width="400px" @confirm="confirmDeleteRemoteHost">
        <div>{{ $t('syslog.confirmDeleteRemoteHost') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteRemoteHostName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
