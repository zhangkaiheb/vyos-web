import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

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
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
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

    const userColumns = [
      { key: 'username', title: '用户名', dataIndex: 'username', width: 150 },
      { key: 'password', title: '密码', dataIndex: 'password', width: 150 },
      { key: 'otp', title: 'OTP', dataIndex: 'otp', width: 80 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const radiusServerColumns = [
      { key: 'address', title: '地址', dataIndex: 'address', width: 150 },
      { key: 'key', title: '密钥', dataIndex: 'key', width: 150 },
      { key: 'port', title: '端口', dataIndex: 'port', width: 80 },
      { key: 'disable', title: '禁用', dataIndex: 'disable', width: 60 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
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
      saved.value = false;
      try {
        const res = await configApi.get('vpn openconnect', true);
        config.value = openconnectToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        const payload = formToOpenconnect(config.value);
        await configApi.set('vpn openconnect', payload);
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createUser() {
      editingUser.value = { username: '', password: '', disable: false, has_otp: false, otp: { interval: '30', key: '', otp_length: '6', token_type: 'hotp-time' } };
      showUserModal.value = true;
    }

    function editUser() {
      if (!selectedUsers.value.length) return alert('请选择要编辑的用户');
      const row = config.value.authentication.local_users.find(u => u.username === selectedUsers.value[0]);
      if (!row) return alert('未找到选中的用户');
      editingUser.value = JSON.parse(JSON.stringify(row));
      showUserModal.value = true;
    }

    function removeUser() {
      if (!selectedUsers.value.length) return alert('请选择要删除的用户');
      config.value.authentication.local_users = config.value.authentication.local_users.filter(u => u.username !== selectedUsers.value[0]);
      selectedUsers.value = [];
    }

    function saveUser() {
      if (!editingUser.value.username) return alert('请输入用户名');
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
      if (!selectedRadiusServers.value.length) return alert('请选择要编辑的服务器');
      const row = config.value.authentication.radius.servers.find(s => s.address === selectedRadiusServers.value[0]);
      if (!row) return alert('未找到选中的服务器');
      editingRadiusServer.value = JSON.parse(JSON.stringify(row));
      showRadiusModal.value = true;
    }

    function removeRadiusServer() {
      if (!selectedRadiusServers.value.length) return alert('请选择要删除的服务器');
      config.value.authentication.radius.servers = config.value.authentication.radius.servers.filter(s => s.address !== selectedRadiusServers.value[0]);
      selectedRadiusServers.value = [];
    }

    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return alert('请输入服务器地址');
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
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, activeTab, commandPath,
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
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'listen', title: '监听' },
        { key: 'ssl', title: 'SSL' },
        { key: 'auth', title: '认证' },
        { key: 'network', title: '网络设置' }
      ]">

      <template #basic>
        <div class="form-row"><label class="form-label">TLS 最低版本</label>
          <select class="form-control" v-model="config.tls_version_min" title="最低 TLS 版本，默认 1.2">
            <option value="1.0">TLS 1.0</option>
            <option value="1.1">TLS 1.1</option>
            <option value="1.2">TLS 1.2 (默认)</option>
            <option value="1.3">TLS 1.3</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">HTTP 安全头</label><input type="checkbox" v-model="config.http_security_headers" title="启用 HTTP 安全响应头" /></div>
      </template>

      <template #listen>
        <div class="form-row"><label class="form-label">监听地址</label><input class="form-control" v-model="config.listen_address" placeholder="x.x.x.x" title="监听连接的 IPv4 地址" /></div>
        <div class="form-row"><label class="form-label">TCP 端口</label><input class="form-control" type="number" min="1" max="65535" v-model="config.listen_ports.tcp" title="TCP 监听端口，默认 443" /></div>
        <div class="form-row"><label class="form-label">UDP 端口</label><input class="form-control" type="number" min="1" max="65535" v-model="config.listen_ports.udp" title="UDP 监听端口，默认 443" /></div>
      </template>

      <template #ssl>
        <div class="form-row"><label class="form-label">CA 证书</label><input class="form-control" v-model="config.ssl.ca_certificate" title="PKI 配置中的 CA 证书链" /></div>
        <div class="form-row"><label class="form-label">证书</label><input class="form-control" v-model="config.ssl.certificate" title="PKI 配置中的证书名称" /></div>
        <div class="form-row"><label class="form-label">密码短语</label><input class="form-control" v-model="config.ssl.passphrase" title="私钥解密密码短语" /></div>
      </template>

      <template #auth>
        <div class="form-row"><label class="form-label">认证模式</label>
          <select class="form-control" v-model="config.authentication.mode" title="认证模式">
            <option value="">未选择</option>
            <option value="certificate">证书认证</option>
            <option value="local">本地用户认证</option>
            <option value="radius">RADIUS 认证</option>
          </select>
        </div>

        <div v-if="config.authentication.mode === 'certificate'">
          <div class="form-row"><label class="form-label">用户标识字段</label>
            <select class="form-control" v-model="config.authentication.certificate_user_identifier_field" title="证书中用于标识用户的字段">
              <option value="">未选择</option>
              <option value="cn">CN (Common Name)</option>
              <option value="uid">UID</option>
            </select>
          </div>
        </div>

        <div v-if="config.authentication.mode === 'local' || config.authentication.mode === ''">
          <div style="font-weight:bold;margin:16px 0 8px;">本地用户</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUsers.length || selectedUsers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUsers.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.authentication.local_users" rowKey="username" :externalToolbar="true" @selection-change="selectedUsers = $event" :selectable="true">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editUserByRecord(record)" style="margin-right:8px">编辑</a>
                <a @click="removeUserByRecord(record)" style="color:#ff4d4f">删除</a>
              </template>
            </template>
          </DataTable>
        </div>

        <div v-if="config.authentication.mode === 'radius'">
          <div class="form-row"><label class="form-label">组配置</label><input class="form-control" v-model="config.authentication.radius.groupconfig" title="RADIUS 组配置覆盖" /></div>
          <div class="form-row"><label class="form-label">源地址</label><input class="form-control" v-model="config.authentication.radius.source_address" placeholder="x.x.x.x" title="发起连接的 IPv4 源地址" /></div>
          <div class="form-row"><label class="form-label">超时</label><input class="form-control" type="number" min="1" max="240" v-model="config.authentication.radius.timeout" title="会话超时，默认 2" /></div>

          <div style="font-weight:bold;margin:16px 0 8px;">RADIUS 服务器</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">添加</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServers.length || selectedRadiusServers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServers.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.authentication.radius.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedRadiusServers = $event" :selectable="true">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <a @click="editRadiusByRecord(record)" style="margin-right:8px">编辑</a>
                <a @click="removeRadiusByRecord(record)" style="color:#ff4d4f">删除</a>
              </template>
            </template>
          </DataTable>
        </div>

        <div style="font-weight:bold;margin:16px 0 8px;">基于身份的配置</div>
        <div class="form-row"><label class="form-label">默认配置</label><input class="form-control" v-model="config.authentication.identity_based_config.default_config" title="默认配置文件名，必须在 /config/auth 下" /></div>
        <div class="form-row"><label class="form-label">配置目录</label><input class="form-control" v-model="config.authentication.identity_based_config.directory" title="配置文件目录，必须在 /config/auth 下" /></div>
        <div class="form-row"><label class="form-label">模式</label>
          <select class="form-control" v-model="config.authentication.identity_based_config.mode" title="配置文件匹配模式">
            <option value="">未选择</option>
            <option value="user">按用户名匹配</option>
            <option value="group">按 RADIUS 组属性匹配</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="config.authentication.identity_based_config.disable" title="禁用基于身份的配置" /></div>
      </template>

      <template #network>
        <div style="font-weight:bold;margin-bottom:8px;">客户端 IP 设置</div>
        <div class="form-row"><label class="form-label">子网</label><input class="form-control" v-model="config.network_settings.client_ip_subnet" placeholder="x.x.x.x/x" title="客户端 IP 子网（CIDR）" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">客户端 IPv6 池</div>
        <div class="form-row"><label class="form-label">前缀</label><input class="form-control" v-model="config.network_settings.client_ipv6_pool.prefix" placeholder="h:h:h:h:h:h:h:h/x" title="分配给客户端的 IPv6 地址池" /></div>
        <div class="form-row"><label class="form-label">掩码长度</label><input class="form-control" type="number" min="48" max="128" v-model="config.network_settings.client_ipv6_pool.mask" title="单个客户端前缀长度，默认 64" /></div>

        <div style="font-weight:bold;margin:16px 0 8px;">DNS 设置</div>
        <div class="form-row"><label class="form-label">DNS 服务器</label><textarea class="form-control" v-model="config.network_settings.name_servers" rows="3" placeholder="每行一个 DNS 地址" title="域名服务器地址" /></div>
        <div class="form-row"><label class="form-label">推送路由</label><textarea class="form-control" v-model="config.network_settings.push_routes" rows="3" placeholder="每行一个路由，如 10.0.0.0/8" title="推送给客户端的路由" /></div>
        <div class="form-row"><label class="form-label">分离 DNS</label><textarea class="form-control" v-model="config.network_settings.split_dns" rows="3" placeholder="每行一个域名" title="使用 VPN DNS 的域名" /></div>
        <div class="form-row"><label class="form-label">隧道所有 DNS</label><input type="checkbox" v-model="config.network_settings.tunnel_all_dns" title="将所有 DNS 查询通过 VPN 隧道" /></div>
      </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showUserModal" :title="editingUser && editingUser._username ? '编辑本地用户' : '新建本地用户'" @confirm="saveUser" @close="showUserModal = false" width="600px">
        <div class="form-row"><label class="form-label">用户名</label><input class="form-control" v-model="editingUser.username" :disabled="editingUser._username" title="认证用户名" /></div>
        <div class="form-row"><label class="form-label">密码</label><input class="form-control" type="password" v-model="editingUser.password" title="认证密码" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingUser.disable" title="禁用该用户" /></div>
        <div class="form-row"><label class="form-label">启用 OTP</label><input type="checkbox" v-model="editingUser.has_otp" title="启用双因素 OTP 认证" /></div>
        <div v-if="editingUser.has_otp">
          <div class="form-row"><label class="form-label">OTP 密钥</label><input class="form-control" v-model="editingUser.otp.key" title="OTP 密钥（十六进制）" /></div>
          <div class="form-row"><label class="form-label">OTP 长度</label>
            <select class="form-control" v-model="editingUser.otp.otp_length" title="OTP 代码位数，默认 6">
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">令牌间隔</label><input class="form-control" type="number" min="5" max="86400" v-model="editingUser.otp.interval" title="令牌间隔（秒），默认 30" /></div>
          <div class="form-row"><label class="form-label">令牌类型</label>
            <select class="form-control" v-model="editingUser.otp.token_type" title="令牌类型">
              <option value="hotp-time">基于时间 (HOTP-Time)</option>
              <option value="hotp-event">基于事件 (HOTP-Event)</option>
            </select>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="showRadiusModal" :title="editingRadiusServer && editingRadiusServer._address ? '编辑 RADIUS 服务器' : '添加 RADIUS 服务器'" @confirm="saveRadiusServer" @close="showRadiusModal = false">
        <div class="form-row"><label class="form-label">地址</label><input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._address" placeholder="x.x.x.x" title="RADIUS 服务器 IPv4 地址" /></div>
        <div class="form-row"><label class="form-label">共享密钥</label><input class="form-control" v-model="editingRadiusServer.key" title="共享密钥" /></div>
        <div class="form-row"><label class="form-label">端口</label><input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" title="端口，默认 1812" /></div>
        <div class="form-row"><label class="form-label">禁用</label><input type="checkbox" v-model="editingRadiusServer.disable" title="禁用该服务器" /></div>
      </DraggableModal>
    </div>
  `,
});
