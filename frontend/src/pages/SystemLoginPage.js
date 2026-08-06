import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
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

function loginToForm(data = {}) {
  const banner = data.banner || {};
  const users = [];
  const userData = data.user || {};
  for (const [name, attrs] of Object.entries(userData)) {
    const auth = attrs.authentication || {};
    const otp = auth.otp || {};
    const publicKeys = [];
    const pubKeyData = auth['public-keys'] || {};
    for (const [keyId, keyAttrs] of Object.entries(pubKeyData)) {
      publicKeys.push({
        _key: keyId,
        key_id: keyId,
        type: keyAttrs.type || '',
        key: keyAttrs.key || '',
        options: keyAttrs.options || '',
      });
    }
    users.push({
      _key: name,
      name,
      'full-name': attrs['full-name'] || '',
      'home-directory': attrs['home-directory'] || '',
      operator: attrs.operator !== undefined,
      disable: attrs.disable !== undefined,
      authentication: {
        'encrypted-password': auth['encrypted-password'] || '',
        'plaintext-password': auth['plaintext-password'] || '',
        otp: {
          key: otp.key || '',
          'rate-limit': otp['rate-limit'] || '3',
          'rate-time': otp['rate-time'] || '30',
          'window-size': otp['window-size'] || '3',
        },
        principal: toArray(auth.principal),
        'public-keys': publicKeys,
      },
    });
  }

  const operatorGroups = [];
  const opGroupData = data['operator-group'] || {};
  for (const [name, attrs] of Object.entries(opGroupData)) {
    const cmdPolicy = attrs['command-policy'] || {};
    operatorGroups.push({
      _key: name,
      name,
      'command-policy': {
        allow: toArray(cmdPolicy.allow),
      },
    });
  }

  const radius = data.radius || {};
  const radiusServers = [];
  const radiusServerData = radius.server || {};
  for (const [addr, attrs] of Object.entries(radiusServerData)) {
    radiusServers.push({
      _key: addr,
      address: addr,
      key: attrs.key || '',
      port: attrs.port || '1812',
      priority: attrs.priority || '255',
      timeout: attrs.timeout || '2',
      disable: attrs.disable !== undefined,
    });
  }

  const tacacs = data.tacacs || {};
  const tacacsServers = [];
  const tacacsServerData = tacacs.server || {};
  for (const [addr, attrs] of Object.entries(tacacsServerData)) {
    tacacsServers.push({
      _key: addr,
      address: addr,
      key: attrs.key || '',
      port: attrs.port || '49',
      disable: attrs.disable !== undefined,
    });
  }

  return {
    basic: {
      'pre-login': banner['pre-login'] || '',
      'post-login': banner['post-login'] || '',
      'max-login-session': data['max-login-session'] || '',
      timeout: data.timeout || '',
    },
    users,
    operator_groups: operatorGroups,
    radius: {
      'security-mode': radius['security-mode'] || 'optional',
      'source-address': radius['source-address'] || '',
      vrf: radius.vrf || '',
      servers: radiusServers,
    },
    tacacs: {
      'security-mode': tacacs['security-mode'] || 'optional',
      'source-address': tacacs['source-address'] || '',
      timeout: tacacs.timeout || '2',
      vrf: tacacs.vrf || '',
      servers: tacacsServers,
    },
  };
}

function formToLogin(form) {
  const result = {};

  // Banner
  const banner = {};
  if (isPresent(form.basic['pre-login'])) banner['pre-login'] = String(form.basic['pre-login']);
  if (isPresent(form.basic['post-login'])) banner['post-login'] = String(form.basic['post-login']);
  if (Object.keys(banner).length) result.banner = banner;

  // Max login session
  if (isPresent(form.basic['max-login-session'])) result['max-login-session'] = String(form.basic['max-login-session']);

  // Timeout
  if (isPresent(form.basic.timeout)) result.timeout = String(form.basic.timeout);

  // Users
  const userObj = {};
  for (const user of form.users || []) {
    if (!user.name) continue;
    const userAttrs = {};
    if (isPresent(user['full-name'])) userAttrs['full-name'] = String(user['full-name']);
    if (isPresent(user['home-directory'])) userAttrs['home-directory'] = String(user['home-directory']);
    if (user.operator) userAttrs.operator = '';
    if (user.disable) userAttrs.disable = '';

    const auth = {};
    const authData = user.authentication || {};
    if (isPresent(authData['encrypted-password'])) auth['encrypted-password'] = String(authData['encrypted-password']);
    if (isPresent(authData['plaintext-password'])) auth['plaintext-password'] = String(authData['plaintext-password']);

    const otp = authData.otp || {};
    const otpObj = {};
    if (isPresent(otp.key)) otpObj.key = String(otp.key);
    if (isPresent(otp['rate-limit'])) otpObj['rate-limit'] = String(otp['rate-limit']);
    if (isPresent(otp['rate-time'])) otpObj['rate-time'] = String(otp['rate-time']);
    if (isPresent(otp['window-size'])) otpObj['window-size'] = String(otp['window-size']);
    if (Object.keys(otpObj).length) auth.otp = otpObj;

    if (authData.principal?.length) auth.principal = [...authData.principal];

    const pubKeys = {};
    for (const pk of authData['public-keys'] || []) {
      if (!pk.key_id) continue;
      const pkAttrs = {};
      if (isPresent(pk.type)) pkAttrs.type = String(pk.type);
      if (isPresent(pk.key)) pkAttrs.key = String(pk.key);
      if (isPresent(pk.options)) pkAttrs.options = String(pk.options);
      pubKeys[pk.key_id] = pkAttrs;
    }
    if (Object.keys(pubKeys).length) auth['public-keys'] = pubKeys;

    if (Object.keys(auth).length) userAttrs.authentication = auth;
    userObj[user.name] = userAttrs;
  }
  if (Object.keys(userObj).length) result.user = userObj;

  // Operator groups
  const opGroupObj = {};
  for (const group of form.operator_groups || []) {
    if (!group.name) continue;
    const groupAttrs = {};
    const cmdPolicy = group['command-policy'] || {};
    if (cmdPolicy.allow?.length) {
      groupAttrs['command-policy'] = { allow: [...cmdPolicy.allow] };
    }
    opGroupObj[group.name] = groupAttrs;
  }
  if (Object.keys(opGroupObj).length) result['operator-group'] = opGroupObj;

  // RADIUS
  const radius = {};
  if (isPresent(form.radius['security-mode'])) radius['security-mode'] = String(form.radius['security-mode']);
  if (isPresent(form.radius['source-address'])) radius['source-address'] = String(form.radius['source-address']);
  if (isPresent(form.radius.vrf)) radius.vrf = String(form.radius.vrf);

  const radiusServerObj = {};
  for (const srv of form.radius.servers || []) {
    if (!srv.address) continue;
    const srvAttrs = {};
    if (isPresent(srv.key)) srvAttrs.key = String(srv.key);
    if (isPresent(srv.port)) srvAttrs.port = String(srv.port);
    if (isPresent(srv.priority)) srvAttrs.priority = String(srv.priority);
    if (isPresent(srv.timeout)) srvAttrs.timeout = String(srv.timeout);
    if (srv.disable) srvAttrs.disable = '';
    radiusServerObj[srv.address] = srvAttrs;
  }
  if (Object.keys(radiusServerObj).length) radius.server = radiusServerObj;
  if (Object.keys(radius).length) result.radius = radius;

  // TACACS
  const tacacs = {};
  if (isPresent(form.tacacs['security-mode'])) tacacs['security-mode'] = String(form.tacacs['security-mode']);
  if (isPresent(form.tacacs['source-address'])) tacacs['source-address'] = String(form.tacacs['source-address']);
  if (isPresent(form.tacacs.timeout)) tacacs.timeout = String(form.tacacs.timeout);
  if (isPresent(form.tacacs.vrf)) tacacs.vrf = String(form.tacacs.vrf);

  const tacacsServerObj = {};
  for (const srv of form.tacacs.servers || []) {
    if (!srv.address) continue;
    const srvAttrs = {};
    if (isPresent(srv.key)) srvAttrs.key = String(srv.key);
    if (isPresent(srv.port)) srvAttrs.port = String(srv.port);
    if (srv.disable) srvAttrs.disable = '';
    tacacsServerObj[srv.address] = srvAttrs;
  }
  if (Object.keys(tacacsServerObj).length) tacacs.server = tacacsServerObj;
  if (Object.keys(tacacs).length) result.tacacs = tacacs;

  return result;
}

export default defineComponent({
  name: 'SystemLoginPage',
  components: { ConfigForm, DataTable, DraggableModal, ToolbarButton, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('basic');

    const config = ref(loginToForm());

    // User management
    const selectedUsers = ref([]);
    const showUserModal = ref(false);
    const editingUser = ref(null);
    const editingUserIndex = ref(-1);

    // Public keys
    const selectedPubKeys = ref([]);
    const showPubKeyModal = ref(false);
    const editingPubKey = ref(null);
    const editingPubKeyIndex = ref(-1);

    // Operator groups
    const selectedOpGroups = ref([]);
    const showOpGroupModal = ref(false);
    const editingOpGroup = ref(null);
    const editingOpGroupIndex = ref(-1);

    // RADIUS servers
    const selectedRadiusServers = ref([]);
    const showRadiusServerModal = ref(false);
    const editingRadiusServer = ref(null);
    const editingRadiusServerIndex = ref(-1);

    // TACACS servers
    const selectedTacacsServers = ref([]);
    const showTacacsServerModal = ref(false);
    const editingTacacsServer = ref(null);
    const editingTacacsServerIndex = ref(-1);

    const commandPath = computed(() => 'system login');

    const opGroupAllowText = computed(() => {
      if (!editingOpGroup.value?.['command-policy']?.allow) return '';
      return editingOpGroup.value['command-policy'].allow.join('\n');
    });
    function onOpGroupAllowInput(e) {
      if (editingOpGroup.value?.['command-policy']) {
        editingOpGroup.value['command-policy'].allow = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }

    // Principal text helpers
    const principalText = computed(() => {
      if (!editingUser.value?.authentication?.principal) return '';
      return editingUser.value.authentication.principal.join('\n');
    });
    function onPrincipalInput(e) {
      if (editingUser.value?.authentication) {
        editingUser.value.authentication.principal = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }

    const userColumns = [
      { key: 'name', title: '用户名', width: 120 },
      { key: 'full-name', title: '全名', width: 150 },
      { key: 'home-directory', title: '主目录', width: 150 },
      { key: 'operator', title: '操作员', width: 80, render: v => v ? '✓' : '' },
      { key: 'disable', title: '禁用', width: 80, render: v => v ? '✓' : '' },
      { key: 'has_otp', title: 'OTP', width: 60, render: (v, row) => row.authentication?.otp?.key ? '✓' : '' },
      { key: 'has_public_keys', title: '公钥', width: 60, render: (v, row) => (row.authentication?.['public-keys']?.length || 0) > 0 ? '✓' : '' },
    ];

    const pubKeyColumns = [
      { key: 'key_id', title: '密钥ID', width: 120 },
      { key: 'type', title: '类型', width: 150 },
      { key: 'key', title: '密钥', width: 200 },
      { key: 'options', title: '选项', width: 150 },
    ];

    const opGroupColumns = [
      { key: 'name', title: '组名', width: 150 },
      { key: 'command_policy_allow', title: '允许命令', width: 300, render: (v, row) => (row['command-policy']?.allow || []).join(', ') },
    ];

    const radiusServerColumns = [
      { key: 'address', title: '地址', width: 150 },
      { key: 'port', title: '端口', width: 80 },
      { key: 'priority', title: '优先级', width: 80 },
      { key: 'timeout', title: '超时', width: 80 },
      { key: 'disable', title: '禁用', width: 80, render: v => v ? '✓' : '' },
    ];

    const tacacsServerColumns = [
      { key: 'address', title: '地址', width: 150 },
      { key: 'port', title: '端口', width: 80 },
      { key: 'disable', title: '禁用', width: 80, render: v => v ? '✓' : '' },
    ];

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('system login', true);
        config.value = loginToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('system login');
        const payload = formToLogin(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('system login', payload);
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

    // User management
    function createUser() {
      editingUserIndex.value = -1;
      editingUser.value = {
        name: '',
        'full-name': '',
        'home-directory': '',
        operator: false,
        disable: false,
        authentication: {
          'encrypted-password': '',
          'plaintext-password': '',
          otp: { key: '', 'rate-limit': '3', 'rate-time': '30', 'window-size': '3' },
          principal: [],
          'public-keys': [],
        },
      };
      showUserModal.value = true;
    }

    function editUser() {
      if (!selectedUsers.value.length) return alert('请选择要编辑的用户');
      const row = config.value.users.find(u => u.name === selectedUsers.value[0]);
      if (!row) return alert('未找到选中的用户');
      editingUserIndex.value = config.value.users.indexOf(row);
      editingUser.value = JSON.parse(JSON.stringify(row));
      showUserModal.value = true;
    }

    function removeUser() {
      if (!selectedUsers.value.length) return alert('请选择要删除的用户');
      config.value.users = config.value.users.filter(u => !selectedUsers.value.includes(u.name));
      selectedUsers.value = [];
    }

    function saveUser() {
      if (!editingUser.value.name) return alert('请输入用户名');
      const users = config.value.users;
      if (editingUserIndex.value >= 0) {
        users.splice(editingUserIndex.value, 1, { ...editingUser.value });
      } else {
        users.push({ ...editingUser.value });
      }
      config.value.users = users;
      showUserModal.value = false;
    }

    // Public keys
    function createPubKey() {
      editingPubKeyIndex.value = -1;
      editingPubKey.value = { key_id: '', type: '', key: '', options: '' };
      showPubKeyModal.value = true;
    }

    function editPubKey() {
      if (!selectedPubKeys.value.length) return alert('请选择要编辑的公钥');
      const row = editingUser.value.authentication['public-keys'].find(pk => pk.key_id === selectedPubKeys.value[0]);
      if (!row) return alert('未找到选中的公钥');
      editingPubKeyIndex.value = editingUser.value.authentication['public-keys'].indexOf(row);
      editingPubKey.value = JSON.parse(JSON.stringify(row));
      showPubKeyModal.value = true;
    }

    function removePubKey() {
      if (!selectedPubKeys.value.length) return alert('请选择要删除的公钥');
      editingUser.value.authentication['public-keys'] = editingUser.value.authentication['public-keys'].filter(pk => !selectedPubKeys.value.includes(pk.key_id));
      selectedPubKeys.value = [];
    }

    function savePubKey() {
      if (!editingPubKey.value.key_id) return alert('请输入密钥ID');
      const pubKeys = editingUser.value.authentication['public-keys'];
      if (editingPubKeyIndex.value >= 0) {
        pubKeys.splice(editingPubKeyIndex.value, 1, { ...editingPubKey.value });
      } else {
        pubKeys.push({ ...editingPubKey.value });
      }
      showPubKeyModal.value = false;
    }

    // Operator groups
    function createOpGroup() {
      editingOpGroupIndex.value = -1;
      editingOpGroup.value = { name: '', 'command-policy': { allow: [] } };
      showOpGroupModal.value = true;
    }

    function editOpGroup() {
      if (!selectedOpGroups.value.length) return alert('请选择要编辑的组');
      const row = config.value.operator_groups.find(g => g.name === selectedOpGroups.value[0]);
      if (!row) return alert('未找到选中的组');
      editingOpGroupIndex.value = config.value.operator_groups.indexOf(row);
      editingOpGroup.value = JSON.parse(JSON.stringify(row));
      showOpGroupModal.value = true;
    }

    function removeOpGroup() {
      if (!selectedOpGroups.value.length) return alert('请选择要删除的组');
      config.value.operator_groups = config.value.operator_groups.filter(g => !selectedOpGroups.value.includes(g.name));
      selectedOpGroups.value = [];
    }

    function saveOpGroup() {
      if (!editingOpGroup.value.name) return alert('请输入组名');
      const groups = config.value.operator_groups;
      if (editingOpGroupIndex.value >= 0) {
        groups.splice(editingOpGroupIndex.value, 1, { ...editingOpGroup.value });
      } else {
        groups.push({ ...editingOpGroup.value });
      }
      config.value.operator_groups = groups;
      showOpGroupModal.value = false;
    }

    // RADIUS servers
    function createRadiusServer() {
      editingRadiusServerIndex.value = -1;
      editingRadiusServer.value = { address: '', key: '', port: '1812', priority: '255', timeout: '2', disable: false };
      showRadiusServerModal.value = true;
    }

    function editRadiusServer() {
      if (!selectedRadiusServers.value.length) return alert('请选择要编辑的服务器');
      const row = config.value.radius.servers.find(s => s.address === selectedRadiusServers.value[0]);
      if (!row) return alert('未找到选中的服务器');
      editingRadiusServerIndex.value = config.value.radius.servers.indexOf(row);
      editingRadiusServer.value = JSON.parse(JSON.stringify(row));
      showRadiusServerModal.value = true;
    }

    function removeRadiusServer() {
      if (!selectedRadiusServers.value.length) return alert('请选择要删除的服务器');
      config.value.radius.servers = config.value.radius.servers.filter(s => !selectedRadiusServers.value.includes(s.address));
      selectedRadiusServers.value = [];
    }

    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return alert('请输入服务器地址');
      const servers = config.value.radius.servers;
      if (editingRadiusServerIndex.value >= 0) {
        servers.splice(editingRadiusServerIndex.value, 1, { ...editingRadiusServer.value });
      } else {
        servers.push({ ...editingRadiusServer.value });
      }
      config.value.radius.servers = servers;
      showRadiusServerModal.value = false;
    }

    // TACACS servers
    function createTacacsServer() {
      editingTacacsServerIndex.value = -1;
      editingTacacsServer.value = { address: '', key: '', port: '49', disable: false };
      showTacacsServerModal.value = true;
    }

    function editTacacsServer() {
      if (!selectedTacacsServers.value.length) return alert('请选择要编辑的服务器');
      const row = config.value.tacacs.servers.find(s => s.address === selectedTacacsServers.value[0]);
      if (!row) return alert('未找到选中的服务器');
      editingTacacsServerIndex.value = config.value.tacacs.servers.indexOf(row);
      editingTacacsServer.value = JSON.parse(JSON.stringify(row));
      showTacacsServerModal.value = true;
    }

    function removeTacacsServer() {
      if (!selectedTacacsServers.value.length) return alert('请选择要删除的服务器');
      config.value.tacacs.servers = config.value.tacacs.servers.filter(s => !selectedTacacsServers.value.includes(s.address));
      selectedTacacsServers.value = [];
    }

    function saveTacacsServer() {
      if (!editingTacacsServer.value.address) return alert('请输入服务器地址');
      const servers = config.value.tacacs.servers;
      if (editingTacacsServerIndex.value >= 0) {
        servers.splice(editingTacacsServerIndex.value, 1, { ...editingTacacsServer.value });
      } else {
        servers.push({ ...editingTacacsServer.value });
      }
      config.value.tacacs.servers = servers;
      showTacacsServerModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, activeTab, commandPath,
      principalText, onPrincipalInput, opGroupAllowText, onOpGroupAllowInput,
      userColumns, selectedUsers, showUserModal, editingUser,
      pubKeyColumns, selectedPubKeys, showPubKeyModal, editingPubKey,
      opGroupColumns, selectedOpGroups, showOpGroupModal, editingOpGroup,
      radiusServerColumns, selectedRadiusServers, showRadiusServerModal, editingRadiusServer,
      tacacsServerColumns, selectedTacacsServers, showTacacsServerModal, editingTacacsServer,
      load, save,
      createUser, editUser, removeUser, saveUser,
      createPubKey, editPubKey, removePubKey, savePubKey,
      createOpGroup, editOpGroup, removeOpGroup, saveOpGroup,
      createRadiusServer, editRadiusServer, removeRadiusServer, saveRadiusServer,
      createTacacsServer, editTacacsServer, removeTacacsServer, saveTacacsServer,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'users', title: '用户管理' },
        { key: 'operator_groups', title: 'Operator组' },
        { key: 'radius', title: 'RADIUS' },
        { key: 'tacacs', title: 'TACACS+' },
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" title="登录前显示的横幅消息">登录前横幅</label>
            <textarea class="form-control" v-model="config.basic['pre-login']" rows="3" placeholder="登录前显示的横幅消息" />
          </div>
          <div class="form-row">
            <label class="form-label" title="登录后显示的横幅消息">登录后横幅</label>
            <textarea class="form-control" v-model="config.basic['post-login']" rows="3" placeholder="登录后显示的横幅消息" />
          </div>
          <div class="form-row">
            <label class="form-label" title="最大登录会话数 (1-65536)">最大登录会话</label>
            <input class="form-control" type="number" min="1" max="65536" v-model="config.basic['max-login-session']" />
          </div>
          <div class="form-row">
            <label class="form-label" title="会话超时时间（秒，5-604800）">会话超时</label>
            <input class="form-control" type="number" min="5" max="604800" v-model="config.basic.timeout" />
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #users>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">添加用户</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUsers.length || selectedUsers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUsers.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.users" rowKey="name" :externalToolbar="true" @selection-change="selectedUsers = $event" :selectable="true" />
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #operator_groups>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createOpGroup">添加组</ToolbarButton>
            <ToolbarButton icon="edit" @click="editOpGroup" :disabled="!selectedOpGroups.length || selectedOpGroups.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeOpGroup" :disabled="!selectedOpGroups.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="opGroupColumns" :data="config.operator_groups" rowKey="name" :externalToolbar="true" @selection-change="selectedOpGroups = $event" :selectable="true" />
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #radius>
          <div class="form-row">
            <label class="form-label" title="RADIUS 安全模式">安全模式</label>
            <select class="form-control" v-model="config.radius['security-mode']">
              <option value="mandatory">强制</option>
              <option value="optional">可选</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" title="RADIUS 源地址">源地址</label>
            <input class="form-control" type="text" v-model="config.radius['source-address']" placeholder="IP 地址" />
          </div>
          <div class="form-row">
            <label class="form-label" title="RADIUS VRF">VRF</label>
            <input class="form-control" type="text" v-model="config.radius.vrf" placeholder="VRF 名称" />
          </div>
          <div style="font-weight:bold;margin:16px 0 8px;">RADIUS 服务器</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">添加服务器</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServers.length || selectedRadiusServers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServers.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.radius.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedRadiusServers = $event" :selectable="true" />
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #tacacs>
          <div class="form-row">
            <label class="form-label" title="TACACS+ 安全模式">安全模式</label>
            <select class="form-control" v-model="config.tacacs['security-mode']">
              <option value="mandatory">强制</option>
              <option value="optional">可选</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" title="TACACS+ 源地址">源地址</label>
            <input class="form-control" type="text" v-model="config.tacacs['source-address']" placeholder="IPv4 地址" />
          </div>
          <div class="form-row">
            <label class="form-label" title="TACACS+ 超时（秒，1-240）">超时</label>
            <input class="form-control" type="number" min="1" max="240" v-model="config.tacacs.timeout" />
          </div>
          <div class="form-row">
            <label class="form-label" title="TACACS+ VRF">VRF</label>
            <input class="form-control" type="text" v-model="config.tacacs.vrf" placeholder="VRF 名称" />
          </div>
          <div style="font-weight:bold;margin:16px 0 8px;">TACACS+ 服务器</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createTacacsServer">添加服务器</ToolbarButton>
            <ToolbarButton icon="edit" @click="editTacacsServer" :disabled="!selectedTacacsServers.length || selectedTacacsServers.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeTacacsServer" :disabled="!selectedTacacsServers.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="tacacsServerColumns" :data="config.tacacs.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedTacacsServers = $event" :selectable="true" />
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

      </TabGroup>


      <!-- User edit modal -->
      <DraggableModal v-model:visible="showUserModal" :title="editingUser && editingUser._key ? '编辑用户' : '添加用户'" @confirm="saveUser" @close="showUserModal = false" width="800px">
        <div class="form-row">
          <label class="form-label">用户名</label>
          <input class="form-control" v-model="editingUser.name" :disabled="editingUser._key" placeholder="用户名" />
        </div>
        <div class="form-row">
          <label class="form-label">全名</label>
          <input class="form-control" v-model="editingUser['full-name']" placeholder="全名" />
        </div>
        <div class="form-row">
          <label class="form-label">主目录</label>
          <input class="form-control" v-model="editingUser['home-directory']" placeholder="/home/username" />
        </div>
        <div class="form-row">
          <label class="form-label">操作员</label>
          <input type="checkbox" v-model="editingUser.operator" />
        </div>
        <div class="form-row">
          <label class="form-label">禁用</label>
          <input type="checkbox" v-model="editingUser.disable" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">认证设置</div>
        <div class="form-row">
          <label class="form-label">明文密码</label>
          <input class="form-control" type="text" v-model="editingUser.authentication['plaintext-password']" placeholder="明文密码" />
        </div>
        <div class="form-row">
          <label class="form-label">加密密码</label>
          <input class="form-control" type="text" v-model="editingUser.authentication['encrypted-password']" placeholder="加密密码" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">OTP 设置</div>
        <div class="form-row">
          <label class="form-label">OTP 密钥</label>
          <input class="form-control" v-model="editingUser.authentication.otp.key" placeholder="Base32 编码的密钥" />
        </div>
        <div class="form-row">
          <label class="form-label">速率限制 (1-10)</label>
          <input class="form-control" type="number" min="1" max="10" v-model="editingUser.authentication.otp['rate-limit']" />
        </div>
        <div class="form-row">
          <label class="form-label">速率时间 (15-600)</label>
          <input class="form-control" type="number" min="15" max="600" v-model="editingUser.authentication.otp['rate-time']" />
        </div>
        <div class="form-row">
          <label class="form-label">窗口大小 (1-21)</label>
          <input class="form-control" type="number" min="1" max="21" v-model="editingUser.authentication.otp['window-size']" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">Principal</div>
        <div class="form-row">
          <label class="form-label">Principal 列表</label>
          <textarea class="form-control" :value="principalText" @input="onPrincipalInput" rows="3" placeholder="每行一个 principal" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">公钥</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPubKey">添加公钥</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPubKey" :disabled="!selectedPubKeys.length || selectedPubKeys.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePubKey" :disabled="!selectedPubKeys.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="pubKeyColumns" :data="editingUser.authentication['public-keys']" rowKey="key_id" :externalToolbar="true" @selection-change="selectedPubKeys = $event" :selectable="true" />
      </DraggableModal>

      <!-- Public key edit modal -->
      <DraggableModal v-model:visible="showPubKeyModal" :title="editingPubKey && editingPubKey._key ? '编辑公钥' : '添加公钥'" @confirm="savePubKey" @close="showPubKeyModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">密钥 ID</label>
          <input class="form-control" v-model="editingPubKey.key_id" :disabled="editingPubKey._key" placeholder="密钥标识符" />
        </div>
        <div class="form-row">
          <label class="form-label">类型</label>
          <select class="form-control" v-model="editingPubKey.type">
            <option value="">未选择</option>
            <option value="ssh-dss">ssh-dss</option>
            <option value="ssh-rsa">ssh-rsa</option>
            <option value="ecdsa-sha2-nistp256">ecdsa-sha2-nistp256</option>
            <option value="ecdsa-sha2-nistp384">ecdsa-sha2-nistp384</option>
            <option value="ecdsa-sha2-nistp521">ecdsa-sha2-nistp521</option>
            <option value="ssh-ed25519">ssh-ed25519</option>
            <option value="sk-ecdsa-sha2-nistp256@openssh.com">sk-ecdsa-sha2-nistp256@openssh.com</option>
            <option value="sk-ssh-ed25519@openssh.com">sk-ssh-ed25519@openssh.com</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">密钥</label>
          <textarea class="form-control" v-model="editingPubKey.key" rows="4" placeholder="Base64 编码的公钥" />
        </div>
        <div class="form-row">
          <label class="form-label">选项</label>
          <input class="form-control" v-model="editingPubKey.options" placeholder="SSH 选项" />
        </div>
      </DraggableModal>

      <!-- Operator group edit modal -->
      <DraggableModal v-model:visible="showOpGroupModal" :title="editingOpGroup && editingOpGroup._key ? '编辑 Operator 组' : '添加 Operator 组'" @confirm="saveOpGroup" @close="showOpGroupModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">组名</label>
          <input class="form-control" v-model="editingOpGroup.name" :disabled="editingOpGroup._key" placeholder="组名" />
        </div>
        <div class="form-row">
          <label class="form-label">允许的命令</label>
          <textarea class="form-control" :value="opGroupAllowText" @input="onOpGroupAllowInput" rows="5" placeholder="每行一个允许执行的命令路径" />
        </div>
      </DraggableModal>

      <!-- RADIUS server edit modal -->
      <DraggableModal v-model:visible="showRadiusServerModal" :title="editingRadiusServer && editingRadiusServer._key ? '编辑 RADIUS 服务器' : '添加 RADIUS 服务器'" @confirm="saveRadiusServer" @close="showRadiusServerModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">地址</label>
          <input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._key" placeholder="IP 地址" />
        </div>
        <div class="form-row">
          <label class="form-label">密钥</label>
          <input class="form-control" v-model="editingRadiusServer.key" placeholder="共享密钥" />
        </div>
        <div class="form-row">
          <label class="form-label">端口 (1-65535)</label>
          <input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" />
        </div>
        <div class="form-row">
          <label class="form-label">优先级 (1-255)</label>
          <input class="form-control" type="number" min="1" max="255" v-model="editingRadiusServer.priority" />
        </div>
        <div class="form-row">
          <label class="form-label">超时 (1-240)</label>
          <input class="form-control" type="number" min="1" max="240" v-model="editingRadiusServer.timeout" />
        </div>
        <div class="form-row">
          <label class="form-label">禁用</label>
          <input type="checkbox" v-model="editingRadiusServer.disable" />
        </div>
      </DraggableModal>

      <!-- TACACS server edit modal -->
      <DraggableModal v-model:visible="showTacacsServerModal" :title="editingTacacsServer && editingTacacsServer._key ? '编辑 TACACS+ 服务器' : '添加 TACACS+ 服务器'" @confirm="saveTacacsServer" @close="showTacacsServerModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">地址</label>
          <input class="form-control" v-model="editingTacacsServer.address" :disabled="editingTacacsServer._key" placeholder="IP 地址" />
        </div>
        <div class="form-row">
          <label class="form-label">密钥</label>
          <input class="form-control" v-model="editingTacacsServer.key" placeholder="共享密钥" />
        </div>
        <div class="form-row">
          <label class="form-label">端口 (1-65535)</label>
          <input class="form-control" type="number" min="1" max="65535" v-model="editingTacacsServer.port" />
        </div>
        <div class="form-row">
          <label class="form-label">禁用</label>
          <input type="checkbox" v-model="editingTacacsServer.disable" />
        </div>
      </DraggableModal>

    </div>
  `,
});
