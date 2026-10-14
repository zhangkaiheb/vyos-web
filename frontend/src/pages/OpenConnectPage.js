import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'OpenConnectPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const config = ref({
      listen_address: '',
      listen_ports: { tcp: '443', udp: '443' },
      tls_version_min: '1.2',
      http_security_headers: false,
      ssl: { ca_certificate: '', certificate: '', passphrase: '' },
      authentication: {
        mode: '',
        identity_based_config: {
          default_config: '',
          directory: '',
          disable: false,
          mode: '',
        },
        local_users: [],
        radius: {
          groupconfig: '',
          source_address: '',
          timeout: '2',
          servers: [],
        },
        certificate_user_identifier_field: '',
      },
      network_settings: {
        client_ip_subnet: '',
        client_ipv6_pool: { mask: '64', prefix: '' },
        name_servers: '',
        push_routes: '',
        split_dns: '',
        tunnel_all_dns: false,
      },
    });

    const activeTab = ref('basic');
    const networkSubTab = ref('clientIp');

    const userColumns = [
      { key: 'username', title: t('openconnect.columns.username'), dataIndex: 'username', width: 150 },
      { key: 'password', title: t('openconnect.columns.password'), dataIndex: 'password', width: 150 },
      { key: 'otp', title: 'OTP', dataIndex: 'otp', width: 80 },
      { key: 'actions', title: t('openconnect.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const radiusServerColumns = [
      { key: 'address', title: t('openconnect.columns.address'), dataIndex: 'address', width: 150 },
      { key: 'key', title: t('openconnect.columns.key'), dataIndex: 'key', width: 150 },
      { key: 'port', title: t('openconnect.columns.port'), dataIndex: 'port', width: 80 },
      { key: 'disable', title: t('openconnect.columns.disable'), dataIndex: 'disable', width: 60 },
      { key: 'actions', title: t('openconnect.columns.actions'), dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedUsers = ref([]);
    const selectedRadiusServers = ref([]);

    const showUserModal = ref(false);
    const editingUser = ref(null);
    const showRadiusModal = ref(false);
    const editingRadiusServer = ref(null);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'listen': return 'vpn openconnect listen-address';
        case 'ssl': return 'vpn openconnect ssl';
        case 'auth': return 'vpn openconnect authentication';
        case 'network': return 'vpn openconnect network-settings';
        default: return 'vpn openconnect';
      }
    });

    function openconnectToForm(data = {}) {
      const auth = data.authentication || {};
      const localUsers = auth['local-users'] || {};
      const radiusServers = auth.radius?.server || {};
      const net = data['network-settings'] || {};

      return {
        listen_address: data['listen-address'] || '',
        listen_ports: {
          tcp: data['listen-ports']?.tcp || '443',
          udp: data['listen-ports']?.udp || '443',
        },
        tls_version_min: data['tls-version-min'] || '1.2',
        http_security_headers: data['http-security-headers'] !== undefined,
        ssl: {
          ca_certificate: data.ssl?.['ca-certificate'] || '',
          certificate: data.ssl?.certificate || '',
          passphrase: data.ssl?.passphrase || '',
        },
        authentication: {
          mode: auth.mode || '',
          identity_based_config: {
            default_config: auth['identity-based-config']?.['default-config'] || '',
            directory: auth['identity-based-config']?.directory || '',
            disable: auth['identity-based-config']?.disable !== undefined,
            mode: auth['identity-based-config']?.mode || '',
          },
          local_users: Object.entries(localUsers).map(([username, u]) => ({
            _username: username,
            username,
            password: u.password || '',
            disable: u.disable !== undefined,
            otp: {
              interval: u.otp?.interval || '30',
              key: u.otp?.key || '',
              otp_length: u.otp?.['otp-length'] || '6',
              token_type: u.otp?.['token-type'] || 'hotp-time',
            },
            has_otp: u.otp !== undefined,
          })),
          radius: {
            groupconfig: auth.radius?.groupconfig || '',
            source_address: auth.radius?.['source-address'] || '',
            timeout: auth.radius?.timeout || '2',
            servers: Object.entries(radiusServers).map(([address, s]) => ({
              _address: address,
              address,
              key: s.key || '',
              port: s.port || '1812',
              disable: s.disable !== undefined,
            })),
          },
          certificate_user_identifier_field: auth.mode === 'certificate'
            ? auth.certificate?.['user-identifier-field'] || ''
            : '',
        },
        network_settings: {
          client_ip_subnet: net['client-ip-settings']?.subnet || '',
          client_ipv6_pool: {
            mask: net['client-ipv6-pool']?.mask || '64',
            prefix: net['client-ipv6-pool']?.prefix || '',
          },
          name_servers: joinLines(net['name-server']),
          push_routes: joinLines(net['push-route']),
          split_dns: joinLines(net['split-dns']),
          tunnel_all_dns: net['tunnel-all-dns'] === 'yes',
        },
      };
    }

    function formToOpenconnect(form) {
      const result = {};
      if (isPresent(form.listen_address)) result['listen-address'] = String(form.listen_address);
      if (isPresent(form.listen_ports?.tcp) && form.listen_ports.tcp !== '443') {
        result['listen-ports'] = result['listen-ports'] || {};
        result['listen-ports'].tcp = String(form.listen_ports.tcp);
      }
      if (isPresent(form.listen_ports?.udp) && form.listen_ports.udp !== '443') {
        result['listen-ports'] = result['listen-ports'] || {};
        result['listen-ports'].udp = String(form.listen_ports.udp);
      }
      if (form.tls_version_min && form.tls_version_min !== '1.2') {
        result['tls-version-min'] = String(form.tls_version_min);
      }
      if (form.http_security_headers) result['http-security-headers'] = '';

      const ssl = {};
      if (isPresent(form.ssl?.ca_certificate)) ssl['ca-certificate'] = String(form.ssl.ca_certificate);
      if (isPresent(form.ssl?.certificate)) ssl.certificate = String(form.ssl.certificate);
      if (isPresent(form.ssl?.passphrase)) ssl.passphrase = String(form.ssl.passphrase);
      if (Object.keys(ssl).length) result.ssl = ssl;

      const auth = {};
      if (isPresent(form.authentication?.mode)) auth.mode = String(form.authentication.mode);

      const ibc = form.authentication?.identity_based_config || {};
      if (isPresent(ibc.default_config) || isPresent(ibc.directory) || ibc.disable || isPresent(ibc.mode)) {
        auth['identity-based-config'] = {};
        if (isPresent(ibc.default_config)) auth['identity-based-config']['default-config'] = String(ibc.default_config);
        if (isPresent(ibc.directory)) auth['identity-based-config'].directory = String(ibc.directory);
        if (ibc.disable) auth['identity-based-config'].disable = '';
        if (isPresent(ibc.mode)) auth['identity-based-config'].mode = String(ibc.mode);
      }

      const users = {};
      for (const u of form.authentication?.local_users || []) {
        if (!u.username) continue;
        const user = {};
        if (u.disable) user.disable = '';
        if (isPresent(u.password)) user.password = String(u.password);
        if (u.has_otp) {
          user.otp = {};
          if (isPresent(u.otp?.interval) && u.otp.interval !== '30') user.otp.interval = String(u.otp.interval);
          if (isPresent(u.otp?.key)) user.otp.key = String(u.otp.key);
          if (isPresent(u.otp?.otp_length) && u.otp.otp_length !== '6') user.otp['otp-length'] = String(u.otp.otp_length);
          if (isPresent(u.otp?.token_type) && u.otp.token_type !== 'hotp-time') user.otp['token-type'] = String(u.otp.token_type);
        }
        users[u.username] = user;
      }
      if (Object.keys(users).length) auth['local-users'] = users;

      const radius = {};
      const servers = {};
      for (const s of form.authentication?.radius?.servers || []) {
        if (!s.address) continue;
        const srv = {};
        if (s.disable) srv.disable = '';
        if (isPresent(s.key)) srv.key = String(s.key);
        if (isPresent(s.port) && s.port !== '1812') srv.port = String(s.port);
        servers[s.address] = srv;
      }
      if (Object.keys(servers).length) radius.server = servers;
      if (isPresent(form.authentication?.radius?.groupconfig)) radius.groupconfig = String(form.authentication.radius.groupconfig);
      if (isPresent(form.authentication?.radius?.source_address)) radius['source-address'] = String(form.authentication.radius.source_address);
      if (isPresent(form.authentication?.radius?.timeout) && form.authentication.radius.timeout !== '2') {
        radius.timeout = String(form.authentication.radius.timeout);
      }
      if (Object.keys(radius).length) auth.radius = radius;

      if (auth.mode === 'certificate' && isPresent(form.authentication?.certificate_user_identifier_field)) {
        auth.certificate = { 'user-identifier-field': String(form.authentication.certificate_user_identifier_field) };
      }

      if (Object.keys(auth).length) result.authentication = auth;

      const net = {};
      if (isPresent(form.network_settings?.client_ip_subnet)) {
        net['client-ip-settings'] = { subnet: String(form.network_settings.client_ip_subnet) };
      }
      const ipv6Pool = {};
      if (isPresent(form.network_settings?.client_ipv6_pool?.prefix)) ipv6Pool.prefix = String(form.network_settings.client_ipv6_pool.prefix);
      if (isPresent(form.network_settings?.client_ipv6_pool?.mask) && form.network_settings.client_ipv6_pool.mask !== '64') {
        ipv6Pool.mask = String(form.network_settings.client_ipv6_pool.mask);
      }
      if (Object.keys(ipv6Pool).length) net['client-ipv6-pool'] = ipv6Pool;
      const nameServers = splitLines(form.network_settings?.name_servers);
      if (nameServers.length) net['name-server'] = nameServers;
      const pushRoutes = splitLines(form.network_settings?.push_routes);
      if (pushRoutes.length) net['push-route'] = pushRoutes;
      const splitDns = splitLines(form.network_settings?.split_dns);
      if (splitDns.length) net['split-dns'] = splitDns;
      if (form.network_settings?.tunnel_all_dns) net['tunnel-all-dns'] = 'yes';

      if (Object.keys(net).length) result['network-settings'] = net;

      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpn openconnect', true);
        config.value = openconnectToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('openconnect.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToOpenconnect(config.value);
        await configStore.setConfig('vpn openconnect', payload);
        configStore.markPending();
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e.message || t('openconnect.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    function createUser() {
      editingUser.value = { username: '', password: '', disable: false, has_otp: false, otp: { interval: '30', key: '', otp_length: '6', token_type: 'hotp-time' } };
      showUserModal.value = true;
    }

    function editUser() {
      if (!selectedUsers.value.length) return showError({ message: t('openconnect.errors.selectUserToEdit') });
      const row = config.value.authentication.local_users.find(u => u.username === selectedUsers.value[0]);
      if (!row) return showError({ message: t('openconnect.errors.userNotFound') });
      editingUser.value = JSON.parse(JSON.stringify(row));
      showUserModal.value = true;
    }

    function removeUser() {
      if (!selectedUsers.value.length) return showError({ message: t('openconnect.errors.selectUserToDelete') });
      config.value.authentication.local_users = config.value.authentication.local_users.filter(u => u.username !== selectedUsers.value[0]);
      selectedUsers.value = [];
    }

    function saveUser() {
      if (!editingUser.value.username) return showError({ message: t('openconnect.errors.usernameRequired') });
      const list = config.value.authentication.local_users;
      const idx = list.findIndex(u => u._username === editingUser.value._username);
      if (idx >= 0) list.splice(idx, 1, { ...editingUser.value });
      else list.push({ ...editingUser.value });
      config.value.authentication.local_users = list;
      showUserModal.value = false;
    }

    function createRadiusServer() {
      editingRadiusServer.value = { address: '', key: '', port: '1812', disable: false };
      showRadiusModal.value = true;
    }

    function editRadiusServer() {
      if (!selectedRadiusServers.value.length) return showError({ message: t('openconnect.errors.selectServerToEdit') });
      const row = config.value.authentication.radius.servers.find(s => s.address === selectedRadiusServers.value[0]);
      if (!row) return showError({ message: t('openconnect.errors.serverNotFound') });
      editingRadiusServer.value = JSON.parse(JSON.stringify(row));
      showRadiusModal.value = true;
    }

    function removeRadiusServer() {
      if (!selectedRadiusServers.value.length) return showError({ message: t('openconnect.errors.selectServerToDelete') });
      config.value.authentication.radius.servers = config.value.authentication.radius.servers.filter(s => s.address !== selectedRadiusServers.value[0]);
      selectedRadiusServers.value = [];
    }

    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return showError({ message: t('openconnect.errors.serverAddressRequired') });
      const list = config.value.authentication.radius.servers;
      const idx = list.findIndex(s => s._address === editingRadiusServer.value._address);
      if (idx >= 0) list.splice(idx, 1, { ...editingRadiusServer.value });
      else list.push({ ...editingRadiusServer.value });
      config.value.authentication.radius.servers = list;
      showRadiusModal.value = false;
    }

    function editUserByRecord(record) {
      editingUser.value = JSON.parse(JSON.stringify(record));
      showUserModal.value = true;
    }

    function removeUserByRecord(record) {
      config.value.authentication.local_users = config.value.authentication.local_users.filter(u => u.username !== record.username);
    }

    function editRadiusByRecord(record) {
      editingRadiusServer.value = JSON.parse(JSON.stringify(record));
      showRadiusModal.value = true;
    }

    function removeRadiusByRecord(record) {
      config.value.authentication.radius.servers = config.value.authentication.radius.servers.filter(s => s.address !== record.address);
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {
      t, loading, saving, config, activeTab, commandPath,
      userColumns, radiusServerColumns,
      selectedUsers, selectedRadiusServers,
      showUserModal, editingUser, showRadiusModal, editingRadiusServer,
      load, save,
      createUser, editUser, removeUser, saveUser,
      createRadiusServer, editRadiusServer, removeRadiusServer, saveRadiusServer,
    };
  },
  template: `
    <div class="page-container">
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('openconnect.tabs.basic') },
        { key: 'listen', title: t('openconnect.tabs.listen') },
        { key: 'ssl', title: 'SSL' },
        { key: 'auth', title: t('openconnect.tabs.auth') },
        { key: 'network', title: t('openconnect.tabs.network') }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.tlsVersionMin') }}</label>
          <select class="form-control" v-model="config.tls_version_min" :title="t('openconnect.tips.tlsVersionMin')">
            <option value="1.0">TLS 1.0</option>
            <option value="1.1">TLS 1.1</option>
            <option value="1.2">TLS 1.2 ({{ t('openconnect.options.default') }})</option>
            <option value="1.3">TLS 1.3</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.httpSecurityHeaders') }}</label><input type="checkbox" v-model="config.http_security_headers" :title="t('openconnect.tips.httpSecurityHeaders')" /></div>
      </template>

      <template #listen>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.listenAddress') }}</label><input class="form-control" v-model="config.listen_address" placeholder="x.x.x.x" :title="t('openconnect.tips.listenAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.tcpPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="config.listen_ports.tcp" :title="t('openconnect.tips.tcpPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.udpPort') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="config.listen_ports.udp" :title="t('openconnect.tips.udpPort')" /></div>
      </template>

      <template #ssl>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.caCertificate') }}</label><input class="form-control" v-model="config.ssl.ca_certificate" :title="t('openconnect.tips.caCertificate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.certificate') }}</label><input class="form-control" v-model="config.ssl.certificate" :title="t('openconnect.tips.certificate')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.passphrase') }}</label><input class="form-control" v-model="config.ssl.passphrase" :title="t('openconnect.tips.passphrase')" /></div>
      </template>

      <template #auth>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.authMode') }}</label>
          <select class="form-control" v-model="config.authentication.mode" :title="t('openconnect.tips.authMode')">
            <option value="">{{ t('openconnect.options.none') }}</option>
            <option value="certificate">{{ t('openconnect.options.certificateAuth') }}</option>
            <option value="local">{{ t('openconnect.options.localAuth') }}</option>
            <option value="radius">{{ t('openconnect.options.radiusAuth') }}</option>
          </select>
        </div>

        <div v-if="config.authentication.mode === 'certificate'">
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.userIdentifierField') }}</label>
            <select class="form-control" v-model="config.authentication.certificate_user_identifier_field" :title="t('openconnect.tips.userIdentifierField')">
              <option value="">{{ t('openconnect.options.none') }}</option>
              <option value="cn">CN (Common Name)</option>
              <option value="uid">UID</option>
            </select>
          </div>
        </div>

        <div v-if="config.authentication.mode === 'local' || config.authentication.mode === ''">
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('openconnect.sections.localUsers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">{{ t('openconnect.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUsers.length || selectedUsers.length > 1">{{ t('openconnect.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUsers.length">{{ t('openconnect.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.authentication.local_users" rowKey="username" :externalToolbar="true" @selection-change="selectedUsers = $event" :selectable="true">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editUserByRecord(record)" style="margin-right:8px">{{ t('openconnect.buttons.edit') }}</a>
                <a @click="removeUserByRecord(record)" style="color:#ff4d4f">{{ t('openconnect.buttons.delete') }}</a>
              </template>
            </template>
          </DataTable>
        </div>

        <div v-if="config.authentication.mode === 'radius'">
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.groupConfig') }}</label><input class="form-control" v-model="config.authentication.radius.groupconfig" :title="t('openconnect.tips.groupConfig')" /></div>
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.sourceAddress') }}</label><input class="form-control" v-model="config.authentication.radius.source_address" placeholder="x.x.x.x" :title="t('openconnect.tips.sourceAddress')" /></div>
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.timeout') }}</label><input class="form-control" type="number" min="1" max="240" v-model="config.authentication.radius.timeout" :title="t('openconnect.tips.timeout')" /></div>

          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('openconnect.sections.radiusServers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">{{ t('openconnect.buttons.add') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServers.length || selectedRadiusServers.length > 1">{{ t('openconnect.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServers.length">{{ t('openconnect.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.authentication.radius.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedRadiusServers = $event" :selectable="true">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editRadiusByRecord(record)" style="margin-right:8px">{{ t('openconnect.buttons.edit') }}</a>
                <a @click="removeRadiusByRecord(record)" style="color:#ff4d4f">{{ t('openconnect.buttons.delete') }}</a>
              </template>
            </template>
          </DataTable>
        </div>

        <div class="form-group" style="margin-top:24px;">
          <div class="form-group-title">{{ t('openconnect.sections.identityBasedConfig') }}</div>
          <div class="form-group-content">
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.defaultConfig') }}</label><input class="form-control" v-model="config.authentication.identity_based_config.default_config" :title="t('openconnect.tips.defaultConfig')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.configDirectory') }}</label><input class="form-control" v-model="config.authentication.identity_based_config.directory" :title="t('openconnect.tips.configDirectory')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.mode') }}</label>
              <select class="form-control" v-model="config.authentication.identity_based_config.mode" :title="t('openconnect.tips.mode')">
                <option value="">{{ t('openconnect.options.none') }}</option>
                <option value="user">{{ t('openconnect.options.matchByUsername') }}</option>
                <option value="group">{{ t('openconnect.options.matchByRadiusGroup') }}</option>
              </select>
            </div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.disable') }}</label><input type="checkbox" v-model="config.authentication.identity_based_config.disable" :title="t('openconnect.tips.disableIdentityBasedConfig')" /></div>
          </div>
        </div>
      </template>

      <template #network>
        <div class="form-group">
          <div class="form-group-title">{{ t('openconnect.sections.clientIpSettings') }}</div>
          <div class="form-group-content">
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.subnet') }}</label><input class="form-control" v-model="config.network_settings.client_ip_subnet" placeholder="x.x.x.x/x" :title="t('openconnect.tips.subnet')" /></div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-group-title">{{ t('openconnect.sections.clientIpv6Pool') }}</div>
          <div class="form-group-content">
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.prefix') }}</label><input class="form-control" v-model="config.network_settings.client_ipv6_pool.prefix" placeholder="h:h:h:h:h:h:h:h/x" :title="t('openconnect.tips.prefix')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.maskLength') }}</label><input class="form-control" type="number" min="48" max="128" v-model="config.network_settings.client_ipv6_pool.mask" :title="t('openconnect.tips.maskLength')" /></div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-group-title">{{ t('openconnect.sections.dnsSettings') }}</div>
          <div class="form-group-content">
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.dnsServer') }}</label><textarea class="form-control" v-model="config.network_settings.name_servers" rows="3" :placeholder="t('openconnect.placeholders.dnsServer')" :title="t('openconnect.tips.dnsServer')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.pushRoutes') }}</label><textarea class="form-control" v-model="config.network_settings.push_routes" rows="3" :placeholder="t('openconnect.placeholders.pushRoutes')" :title="t('openconnect.tips.pushRoutes')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.splitDns') }}</label><textarea class="form-control" v-model="config.network_settings.split_dns" rows="3" :placeholder="t('openconnect.placeholders.splitDns')" :title="t('openconnect.tips.splitDns')" /></div>
            <div class="form-row"><label class="form-label">{{ t('openconnect.labels.tunnelAllDns') }}</label><input type="checkbox" v-model="config.network_settings.tunnel_all_dns" :title="t('openconnect.tips.tunnelAllDns')" /></div>
          </div>
        </div>
      </template>
      </TabGroup>

      <div style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="save">{{ saving ? t('app.loading') : t('app.confirm') }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showUserModal" :title="editingUser && editingUser._username ? t('openconnect.modals.editUser') : t('openconnect.modals.createUser')" @confirm="saveUser" @close="showUserModal = false" width="600px">
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.username') }}</label><input class="form-control" v-model="editingUser.username" :disabled="editingUser._username" :title="t('openconnect.tips.username')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.password') }}</label><input class="form-control" type="password" v-model="editingUser.password" :title="t('openconnect.tips.password')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.disable') }}</label><input type="checkbox" v-model="editingUser.disable" :title="t('openconnect.tips.disableUser')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.enableOtp') }}</label><input type="checkbox" v-model="editingUser.has_otp" :title="t('openconnect.tips.enableOtp')" /></div>
        <div v-if="editingUser.has_otp">
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.otpKey') }}</label><input class="form-control" v-model="editingUser.otp.key" :title="t('openconnect.tips.otpKey')" /></div>
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.otpLength') }}</label>
            <select class="form-control" v-model="editingUser.otp.otp_length" :title="t('openconnect.tips.otpLength')">
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.tokenInterval') }}</label><input class="form-control" type="number" min="5" max="86400" v-model="editingUser.otp.interval" :title="t('openconnect.tips.tokenInterval')" /></div>
          <div class="form-row"><label class="form-label">{{ t('openconnect.labels.tokenType') }}</label>
            <select class="form-control" v-model="editingUser.otp.token_type" :title="t('openconnect.tips.tokenType')">
              <option value="hotp-time">{{ t('openconnect.options.hotpTime') }}</option>
              <option value="hotp-event">{{ t('openconnect.options.hotpEvent') }}</option>
            </select>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showRadiusModal" :title="editingRadiusServer && editingRadiusServer._address ? t('openconnect.modals.editRadiusServer') : t('openconnect.modals.addRadiusServer')" @confirm="saveRadiusServer" @close="showRadiusModal = false">
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.address') }}</label><input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._address" placeholder="x.x.x.x" :title="t('openconnect.tips.radiusServerAddress')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.sharedKey') }}</label><input class="form-control" v-model="editingRadiusServer.key" :title="t('openconnect.tips.sharedKey')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.port') }}</label><input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" :title="t('openconnect.tips.radiusPort')" /></div>
        <div class="form-row"><label class="form-label">{{ t('openconnect.labels.disable') }}</label><input type="checkbox" v-model="editingRadiusServer.disable" :title="t('openconnect.tips.disableServer')" /></div>
      </DraggableModal>
    </div>
  `,
});
