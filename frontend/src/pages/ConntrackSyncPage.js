import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import DataTable from '/src/components/Table/DataTable.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const ACCEPT_PROTOCOL_OPTIONS = ['tcp', 'udp', 'icmp', 'icmp6', 'sctp', 'dccp'];
const EXPECT_SYNC_OPTIONS = ['all', 'ftp', 'h323', 'nfs', 'sip', 'sqlnet'];

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

function validateIPv4(value) {
  if (!value) return '';
  const re = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!re.test(value)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIPPrefix(value) {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 2) return 'IP 子网格式应为 地址/长度';
  const v4 = validateIPv4(parts[0]);
  const v6 = validateIPv6(parts[0]);
  if (v4 && v6) return v4;
  const p = parseInt(parts[1], 10);
  if (isNaN(p)) return '前缀长度格式错误';
  if (!v4 && (p < 0 || p > 32)) return 'IPv4 前缀长度范围为 0-32';
  if (!v6 && (p < 0 || p > 128)) return 'IPv6 前缀长度范围为 0-128';
  return '';
}

function validateAddressOrPrefix(value) {
  if (!value) return '地址不能为空';
  if (value.includes('/')) return validateIPPrefix(value);
  const v4 = validateIPv4(value);
  const v6 = validateIPv6(value);
  if (v4 && v6) return '请输入有效的 IPv4/IPv6 地址或前缀';
  return '';
}

function validateIPv4Only(value) {
  if (!value) return '地址不能为空';
  return validateIPv4(value);
}

function validateQueueSize(value, name) {
  if (value === '' || value === undefined || value === null) return '';
  const n = Number(value);
  if (isNaN(n) || n < 0 || n > 4294967295) return `${name} 范围为 0-4294967295`;
  return '';
}

function validateMcastGroup(value) {
  if (!value) return '组播地址不能为空';
  return validateIPv4(value);
}

function validateInterface(value) {
  if (!value || !String(value).trim()) return '接口不能为空';
  return '';
}

function parseMultiText(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function conntrackSyncToForm(data = {}) {
  const failover = data['failover-mechanism'] || {};
  return {
    acceptProtocol: toArray(data['accept-protocol']),
    disableExternalCache: data['disable-external-cache'] !== undefined,
    disableSyslog: data['disable-syslog'] !== undefined,
    eventListenQueueSize: data['event-listen-queue-size'] !== undefined ? String(data['event-listen-queue-size']) : '8',
    expectSync: toArray(data['expect-sync']),
    ignoreAddress: toArray(data['ignore-address']),
    interfaces: toArray(data['interface']),
    listenAddress: toArray(data['listen-address']),
    mcastGroup: data['mcast-group'] !== undefined ? String(data['mcast-group']) : '225.0.0.50',
    startupResync: data['startup-resync'] !== undefined,
    syncQueueSize: data['sync-queue-size'] !== undefined ? String(data['sync-queue-size']) : '1',
    failoverVrrpSyncGroup: failover.vrrp && failover.vrrp['sync-group'] ? String(failover.vrrp['sync-group']) : '',
  };
}

function conntrackSyncToConfig(form) {
  const result = {};
  if (form.acceptProtocol && form.acceptProtocol.length) {
    result['accept-protocol'] = form.acceptProtocol;
  }
  if (form.disableExternalCache) result['disable-external-cache'] = {};
  if (form.disableSyslog) result['disable-syslog'] = {};
  if (isPresent(form.eventListenQueueSize)) result['event-listen-queue-size'] = String(form.eventListenQueueSize);
  if (form.expectSync && form.expectSync.length) {
    result['expect-sync'] = form.expectSync;
  }
  if (form.ignoreAddress && form.ignoreAddress.length) {
    result['ignore-address'] = form.ignoreAddress;
  }
  if (form.interfaces && form.interfaces.length) {
    result['interface'] = form.interfaces;
  }
  if (form.listenAddress && form.listenAddress.length) {
    result['listen-address'] = form.listenAddress;
  }
  if (isPresent(form.mcastGroup)) result['mcast-group'] = String(form.mcastGroup);
  if (form.startupResync) result['startup-resync'] = {};
  if (isPresent(form.syncQueueSize)) result['sync-queue-size'] = String(form.syncQueueSize);
  if (isPresent(form.failoverVrrpSyncGroup)) {
    result['failover-mechanism'] = { vrrp: { 'sync-group': String(form.failoverVrrpSyncGroup) } };
  }
  return result;
}

export default defineComponent({
  name: 'ConntrackSyncPage',
  setup() {
    const config = ref(conntrackSyncToForm());
    const saving = ref(false);
    const saved = ref(false);

    const commandPath = 'service conntrack-sync';
    const activeTab = ref('protocol');

    const addressRows = computed(() => (config.value.ignoreAddress || []).map((addr, idx) => ({
      _key: String(idx),
      address: addr,
    })));

    const interfaceRows = computed(() => (config.value.interfaces || []).map((iface, idx) => ({
      _key: String(idx),
      interface: iface,
    })));

    const listenRows = computed(() => (config.value.listenAddress || []).map((addr, idx) => ({
      _key: String(idx),
      address: addr,
    })));

    const addressColumns = [
      { key: 'address', title: '忽略地址', title_en: 'Ignore Address' },
    ];
    const interfaceColumns = [
      { key: 'interface', title: '同步接口', title_en: 'Interface' },
    ];
    const listenColumns = [
      { key: 'address', title: '监听地址', title_en: 'Listen Address' },
    ];

    const showAddressModal = ref(false);
    const showInterfaceModal = ref(false);
    const showListenModal = ref(false);

    const addressEdit = ref({ address: '' });
    const interfaceEdit = ref({ interface: '' });
    const listenEdit = ref({ address: '' });

    function load() {
      configApi.get('service conntrack-sync', true)
        .then(res => {
          config.value = conntrackSyncToForm(res.data || {});
        })
        .catch(e => showError(e));
    }

    function save() {
      const err = validateForm();
      if (err) {
        showError({ message: err });
        return;
      }
      const payload = conntrackSyncToConfig(config.value);
      saving.value = true;
      configApi.set('service conntrack-sync', payload)
        .then(() => {
          saved.value = true;
          setTimeout(() => saved.value = false, 2000);
        })
        .catch(e => showError(e))
        .finally(() => saving.value = false);
    }

    function openAddressCreate() {
      addressEdit.value = { address: '' };
      showAddressModal.value = true;
    }

    function openAddressEdit(row) {
      addressEdit.value = { address: row.address };
      showAddressModal.value = true;
    }

    function saveAddress() {
      const err = validateAddressOrPrefix(addressEdit.value.address);
      if (err) return showError({ message: err });
      const list = [...(config.value.ignoreAddress || [])];
      const val = String(addressEdit.value.address).trim();
      const idx = list.indexOf(val);
      if (idx >= 0) {
        list[idx] = val;
      } else {
        list.push(val);
      }
      config.value.ignoreAddress = list;
      showAddressModal.value = false;
    }

    function deleteAddresses(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?._key];
      if (!keys.length) return;
      const set = new Set(keys);
      config.value.ignoreAddress = (config.value.ignoreAddress || []).filter((_, idx) => !set.has(String(idx)));
    }

    function openInterfaceCreate() {
      interfaceEdit.value = { interface: '' };
      showInterfaceModal.value = true;
    }

    function openInterfaceEdit(row) {
      interfaceEdit.value = { interface: row.interface };
      showInterfaceModal.value = true;
    }

    function saveInterface() {
      const err = validateInterface(interfaceEdit.value.interface);
      if (err) return showError({ message: err });
      const list = [...(config.value.interfaces || [])];
      const val = String(interfaceEdit.value.interface).trim();
      const idx = list.indexOf(val);
      if (idx >= 0) {
        list[idx] = val;
      } else {
        list.push(val);
      }
      config.value.interfaces = list;
      showInterfaceModal.value = false;
    }

    function deleteInterfaces(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?._key];
      if (!keys.length) return;
      const set = new Set(keys);
      config.value.interfaces = (config.value.interfaces || []).filter((_, idx) => !set.has(String(idx)));
    }

    function openListenCreate() {
      listenEdit.value = { address: '' };
      showListenModal.value = true;
    }

    function openListenEdit(row) {
      listenEdit.value = { address: row.address };
      showListenModal.value = true;
    }

    function saveListen() {
      const err = validateIPv4Only(listenEdit.value.address);
      if (err) return showError({ message: err });
      const list = [...(config.value.listenAddress || [])];
      const val = String(listenEdit.value.address).trim();
      const idx = list.indexOf(val);
      if (idx >= 0) {
        list[idx] = val;
      } else {
        list.push(val);
      }
      config.value.listenAddress = list;
      showListenModal.value = false;
    }

    function deleteListens(rows) {
      const keys = Array.isArray(rows) ? rows : [rows?._key];
      if (!keys.length) return;
      const set = new Set(keys);
      config.value.listenAddress = (config.value.listenAddress || []).filter((_, idx) => !set.has(String(idx)));
    }

    function validateForm() {
      const err = validateQueueSize(config.value.eventListenQueueSize, '事件监听队列大小');
      if (err) return err;
      const err2 = validateQueueSize(config.value.syncQueueSize, '同步队列大小');
      if (err2) return err2;
      const err3 = validateMcastGroup(config.value.mcastGroup);
      if (err3) return err3;
      if (isPresent(config.value.failoverVrrpSyncGroup)) {
        if (!String(config.value.failoverVrrpSyncGroup).trim()) return 'VRRP 同步组不能为空';
      }
      return '';
    }

    onMounted(load);

    return {
      config,
      saving,
      saved,
      commandPath,
      activeTab,
      addressRows,
      interfaceRows,
      listenRows,
      addressColumns,
      interfaceColumns,
      listenColumns,
      showAddressModal,
      showInterfaceModal,
      showListenModal,
      addressEdit,
      interfaceEdit,
      listenEdit,
      save,
      load,
      openAddressCreate,
      openAddressEdit,
      saveAddress,
      deleteAddresses,
      openInterfaceCreate,
      openInterfaceEdit,
      saveInterface,
      deleteInterfaces,
      openListenCreate,
      openListenEdit,
      saveListen,
      deleteListens,
      validateForm,
      ACCEPT_PROTOCOL_OPTIONS,
      EXPECT_SYNC_OPTIONS,
    };
  },
  components: { ToolbarButton, DraggableModal, DataTable, TabGroup },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>

      <TabGroup v-model="activeTab" :tabs="[
        { key: 'protocol', title: '同步协议' },
        { key: 'basic', title: '基本设置' },
        { key: 'interfaces', title: '地址与接口' }
      ]">
        <template #protocol>
          <div class="form-row">
            <label class="form-label">接受协议</label>
            <div class="form-control checkbox-group">
              <label v-for="p in ACCEPT_PROTOCOL_OPTIONS" :key="p" class="checkbox-item">
                <input type="checkbox" :value="p" v-model="config.acceptProtocol" /> {{ p }}
              </label>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">期望同步</label>
            <div class="form-control checkbox-group">
              <label v-for="p in EXPECT_SYNC_OPTIONS" :key="p" class="checkbox-item">
                <input type="checkbox" :value="p" v-model="config.expectSync" /> {{ p }}
              </label>
            </div>
          </div>
        </template>

        <template #basic>
          <div class="form-row">
            <label class="form-label">事件监听队列大小</label>
            <input class="form-control" type="number" v-model="config.eventListenQueueSize" min="0" max="4294967295" />
          </div>
          <div class="form-row">
            <label class="form-label">同步队列大小</label>
            <input class="form-control" type="number" v-model="config.syncQueueSize" min="0" max="4294967295" />
          </div>
          <div class="form-row">
            <label class="form-label">组播组</label>
            <input class="form-control" v-model="config.mcastGroup" placeholder="225.0.0.50" />
          </div>
          <div class="form-row">
            <label class="form-label">VRRP 同步组</label>
            <input class="form-control" v-model="config.failoverVrrpSyncGroup" placeholder="VRRP sync group" />
          </div>
          <div class="form-row">
            <label class="form-label">选项</label>
            <div class="form-control checkbox-group">
              <label class="checkbox-item"><input type="checkbox" v-model="config.disableExternalCache" /> 禁用外部缓存</label>
              <label class="checkbox-item"><input type="checkbox" v-model="config.disableSyslog" /> 禁用 Syslog</label>
              <label class="checkbox-item"><input type="checkbox" v-model="config.startupResync" /> 启动时全量同步</label>
            </div>
          </div>
        </template>

        <template #interfaces>
          <div class="form-row-block">
            <h4>忽略地址</h4>
            <div class="data-table-wrapper">
              <DataTable :columns="addressColumns" :data="addressRows" row-key="_key" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openAddressCreate" @edit="openAddressEdit" @delete="deleteAddresses" @refresh="load"></DataTable>
            </div>
          </div>
          <div class="form-row-block">
            <h4>同步接口</h4>
            <div class="data-table-wrapper">
              <DataTable :columns="interfaceColumns" :data="interfaceRows" row-key="_key" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openInterfaceCreate" @edit="openInterfaceEdit" @delete="deleteInterfaces" @refresh="load"></DataTable>
            </div>
          </div>
          <div class="form-row-block">
            <h4>监听地址</h4>
            <div class="data-table-wrapper">
              <DataTable :columns="listenColumns" :data="listenRows" row-key="_key" :selectable="true"
                :actions="['create','edit','delete','refresh']"
                @create="openListenCreate" @edit="openListenEdit" @delete="deleteListens" @refresh="load"></DataTable>
            </div>
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="showAddressModal" title="忽略地址">
        <div class="form-row"><label class="form-label">地址/前缀</label><input class="form-control" v-model="addressEdit.address" placeholder="x.x.x.x 或 x.x.x.x/x 或 IPv6" /></div>
        <template #footer>
          <ToolbarButton @click="showAddressModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveAddress">保存</ToolbarButton>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="showInterfaceModal" title="同步接口">
        <div class="form-row"><label class="form-label">接口</label><input class="form-control" v-model="interfaceEdit.interface" placeholder="eth0" /></div>
        <template #footer>
          <ToolbarButton @click="showInterfaceModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveInterface">保存</ToolbarButton>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="showListenModal" title="监听地址">
        <div class="form-row"><label class="form-label">IPv4 地址</label><input class="form-control" v-model="listenEdit.address" placeholder="x.x.x.x" /></div>
        <template #footer>
          <ToolbarButton @click="showListenModal = false">取消</ToolbarButton>
          <ToolbarButton icon="save" primary @click="saveListen">保存</ToolbarButton>
        </template>
      </DraggableModal>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
