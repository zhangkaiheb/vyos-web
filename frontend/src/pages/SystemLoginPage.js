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
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
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
      { key: 'name', title: t('system.login.columns.username'), width: 120 },
      { key: 'full-name', title: t('system.login.columns.fullName'), width: 150 },
      { key: 'home-directory', title: t('system.login.columns.homeDirectory'), width: 150 },
      { key: 'operator', title: t('system.login.columns.operator'), width: 80, render: v => v ? '✓' : '' },
      { key: 'disable', title: t('system.login.columns.disable'), width: 80, render: v => v ? '✓' : '' },
      { key: 'has_otp', title: 'OTP', width: 60, render: (v, row) => row.authentication?.otp?.key ? '✓' : '' },
      { key: 'has_public_keys', title: t('system.login.columns.publicKeys'), width: 60, render: (v, row) => (row.authentication?.['public-keys']?.length || 0) > 0 ? '✓' : '' },
    ];

    const pubKeyColumns = [
      { key: 'key_id', title: t('system.login.columns.keyId'), width: 120 },
      { key: 'type', title: t('system.login.columns.type'), width: 150 },
      { key: 'key', title: t('system.login.columns.key'), width: 200 },
      { key: 'options', title: t('system.login.columns.options'), width: 150 },
    ];

    const opGroupColumns = [
      { key: 'name', title: t('system.login.columns.groupName'), width: 150 },
      { key: 'command_policy_allow', title: t('system.login.columns.allowCommands'), width: 300, render: (v, row) => (row['command-policy']?.allow || []).join(', ') },
    ];

    const radiusServerColumns = [
      { key: 'address', title: t('system.login.columns.address'), width: 150 },
      { key: 'port', title: t('system.login.columns.port'), width: 80 },
      { key: 'priority', title: t('system.login.columns.priority'), width: 80 },
      { key: 'timeout', title: t('system.login.columns.timeout'), width: 80 },
      { key: 'disable', title: t('system.login.columns.disable'), width: 80, render: v => v ? '✓' : '' },
    ];

    const tacacsServerColumns = [
      { key: 'address', title: t('system.login.columns.address'), width: 150 },
      { key: 'port', title: t('system.login.columns.port'), width: 80 },
      { key: 'disable', title: t('system.login.columns.disable'), width: 80, render: v => v ? '✓' : '' },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('system login', true);
        config.value = loginToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('system.login.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configStore.deleteConfig('system login');
        const payload = formToLogin(config.value);
        if (Object.keys(payload).length) {
          await configStore.setConfig('system login', payload);
        }
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e.message || t('system.login.saveFailed'));
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
      if (!selectedUsers.value.length) return showError({ message: t('system.login.selectUserFirst') });
      const row = config.value.users.find(u => u.name === selectedUsers.value[0]);
      if (!row) return showError({ message: t('system.login.userNotFound') });
      editingUserIndex.value = config.value.users.indexOf(row);
      editingUser.value = JSON.parse(JSON.stringify(row));
      showUserModal.value = true;
    }

    function removeUser() {
      if (!selectedUsers.value.length) return showError({ message: t('system.login.selectUserFirst') });
      config.value.users = config.value.users.filter(u => !selectedUsers.value.includes(u.name));
      selectedUsers.value = [];
    }

    function saveUser() {
      if (!editingUser.value.name) return showError({ message: t('system.login.usernameRequired') });
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
      if (!selectedPubKeys.value.length) return showError({ message: t('system.login.selectPubKeyFirst') });
      const row = editingUser.value.authentication['public-keys'].find(pk => pk.key_id === selectedPubKeys.value[0]);
      if (!row) return showError({ message: t('system.login.pubKeyNotFound') });
      editingPubKeyIndex.value = editingUser.value.authentication['public-keys'].indexOf(row);
      editingPubKey.value = JSON.parse(JSON.stringify(row));
      showPubKeyModal.value = true;
    }

    function removePubKey() {
      if (!selectedPubKeys.value.length) return showError({ message: t('system.login.selectPubKeyFirst') });
      editingUser.value.authentication['public-keys'] = editingUser.value.authentication['public-keys'].filter(pk => !selectedPubKeys.value.includes(pk.key_id));
      selectedPubKeys.value = [];
    }

    function savePubKey() {
      if (!editingPubKey.value.key_id) return showError({ message: t('system.login.keyIdRequired') });
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
      if (!selectedOpGroups.value.length) return showError({ message: t('system.login.selectOpGroupFirst') });
      const row = config.value.operator_groups.find(g => g.name === selectedOpGroups.value[0]);
      if (!row) return showError({ message: t('system.login.opGroupNotFound') });
      editingOpGroupIndex.value = config.value.operator_groups.indexOf(row);
      editingOpGroup.value = JSON.parse(JSON.stringify(row));
      showOpGroupModal.value = true;
    }

    function removeOpGroup() {
      if (!selectedOpGroups.value.length) return showError({ message: t('system.login.selectOpGroupFirst') });
      config.value.operator_groups = config.value.operator_groups.filter(g => !selectedOpGroups.value.includes(g.name));
      selectedOpGroups.value = [];
    }

    function saveOpGroup() {
      if (!editingOpGroup.value.name) return showError({ message: t('system.login.groupNameRequired') });
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
      if (!selectedRadiusServers.value.length) return showError({ message: t('system.login.selectServerFirst') });
      const row = config.value.radius.servers.find(s => s.address === selectedRadiusServers.value[0]);
      if (!row) return showError({ message: t('system.login.serverNotFound') });
      editingRadiusServerIndex.value = config.value.radius.servers.indexOf(row);
      editingRadiusServer.value = JSON.parse(JSON.stringify(row));
      showRadiusServerModal.value = true;
    }

    function removeRadiusServer() {
      if (!selectedRadiusServers.value.length) return showError({ message: t('system.login.selectServerFirst') });
      config.value.radius.servers = config.value.radius.servers.filter(s => !selectedRadiusServers.value.includes(s.address));
      selectedRadiusServers.value = [];
    }

    function saveRadiusServer() {
      if (!editingRadiusServer.value.address) return showError({ message: t('system.login.serverAddressRequired') });
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
      if (!selectedTacacsServers.value.length) return showError({ message: t('system.login.selectServerFirst') });
      const row = config.value.tacacs.servers.find(s => s.address === selectedTacacsServers.value[0]);
      if (!row) return showError({ message: t('system.login.serverNotFound') });
      editingTacacsServerIndex.value = config.value.tacacs.servers.indexOf(row);
      editingTacacsServer.value = JSON.parse(JSON.stringify(row));
      showTacacsServerModal.value = true;
    }

    function removeTacacsServer() {
      if (!selectedTacacsServers.value.length) return showError({ message: t('system.login.selectServerFirst') });
      config.value.tacacs.servers = config.value.tacacs.servers.filter(s => !selectedTacacsServers.value.includes(s.address));
      selectedTacacsServers.value = [];
    }

    function saveTacacsServer() {
      if (!editingTacacsServer.value.address) return showError({ message: t('system.login.serverAddressRequired') });
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
      window.addEventListener('config-committed', load);
    });

    return {t,
      
      loading, saving, config, activeTab, commandPath,
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
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('system.login.tabs.basic') },
        { key: 'users', title: t('system.login.tabs.users') },
        { key: 'operator_groups', title: t('system.login.tabs.operatorGroups') },
        { key: 'radius', title: 'RADIUS' },
        { key: 'tacacs', title: 'TACACS+' },
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.preLoginBannerHelp')">{{ t('system.login.preLoginBanner') }}</label>
            <textarea class="form-control" v-model="config.basic['pre-login']" rows="3" :placeholder="t('system.login.preLoginBannerHelp')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.postLoginBannerHelp')">{{ t('system.login.postLoginBanner') }}</label>
            <textarea class="form-control" v-model="config.basic['post-login']" rows="3" :placeholder="t('system.login.postLoginBannerHelp')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.maxLoginSessionHelp')">{{ t('system.login.maxLoginSession') }}</label>
            <input class="form-control" type="number" min="1" max="65536" v-model="config.basic['max-login-session']" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.sessionTimeoutHelp')">{{ t('system.login.sessionTimeout') }}</label>
            <input class="form-control" type="number" min="5" max="604800" v-model="config.basic.timeout" />
          </div>
        </template>

        <template #users>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createUser">{{ t('system.login.buttons.addUser') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editUser" :disabled="!selectedUsers.length || selectedUsers.length > 1">{{ t('system.login.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeUser" :disabled="!selectedUsers.length">{{ t('system.login.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="userColumns" :data="config.users" rowKey="name" :externalToolbar="true" @selection-change="selectedUsers = $event" :selectable="true" />
        </template>

        <template #operator_groups>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createOpGroup">{{ t('system.login.buttons.addGroup') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editOpGroup" :disabled="!selectedOpGroups.length || selectedOpGroups.length > 1">{{ t('system.login.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeOpGroup" :disabled="!selectedOpGroups.length">{{ t('system.login.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="opGroupColumns" :data="config.operator_groups" rowKey="name" :externalToolbar="true" @selection-change="selectedOpGroups = $event" :selectable="true" />
        </template>

        <template #radius>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.radiusSecurityModeHelp')">{{ t('system.login.radiusSecurityMode') }}</label>
            <select class="form-control" v-model="config.radius['security-mode']">
              <option value="mandatory">{{ t('system.login.mandatory') }}</option>
              <option value="optional">{{ t('system.login.optional') }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.radiusSourceAddressHelp')">{{ t('system.login.sourceAddress') }}</label>
            <input class="form-control" type="text" v-model="config.radius['source-address']" :placeholder="t('system.login.ipAddress')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.radiusVrfHelp')">VRF</label>
            <input class="form-control" type="text" v-model="config.radius.vrf" :placeholder="t('system.login.vrfName')" />
          </div>
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('system.login.radiusServers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createRadiusServer">{{ t('system.login.buttons.addServer') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editRadiusServer" :disabled="!selectedRadiusServers.length || selectedRadiusServers.length > 1">{{ t('system.login.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeRadiusServer" :disabled="!selectedRadiusServers.length">{{ t('system.login.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="radiusServerColumns" :data="config.radius.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedRadiusServers = $event" :selectable="true" />
        </template>

        <template #tacacs>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.tacacsSecurityModeHelp')">{{ t('system.login.tacacsSecurityMode') }}</label>
            <select class="form-control" v-model="config.tacacs['security-mode']">
              <option value="mandatory">{{ t('system.login.mandatory') }}</option>
              <option value="optional">{{ t('system.login.optional') }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.tacacsSourceAddressHelp')">{{ t('system.login.sourceAddress') }}</label>
            <input class="form-control" type="text" v-model="config.tacacs['source-address']" :placeholder="t('system.login.ipv4Address')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.tacacsTimeoutHelp')">{{ t('system.login.timeout') }}</label>
            <input class="form-control" type="number" min="1" max="240" v-model="config.tacacs.timeout" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('system.login.tacacsVrfHelp')">VRF</label>
            <input class="form-control" type="text" v-model="config.tacacs.vrf" :placeholder="t('system.login.vrfName')" />
          </div>
          <div style="font-weight:bold;margin:16px 0 8px;">{{ t('system.login.tacacsServers') }}</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createTacacsServer">{{ t('system.login.buttons.addServer') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editTacacsServer" :disabled="!selectedTacacsServers.length || selectedTacacsServers.length > 1">{{ t('system.login.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeTacacsServer" :disabled="!selectedTacacsServers.length">{{ t('system.login.buttons.delete') }}</ToolbarButton>
          </div>
          <DataTable :columns="tacacsServerColumns" :data="config.tacacs.servers" rowKey="address" :externalToolbar="true" @selection-change="selectedTacacsServers = $event" :selectable="true" />
        </template>

      </TabGroup>

      <div v-if="activeTab === 'basic' || activeTab === 'radius' || activeTab === 'tacacs'" style="margin-top:16px;text-align:center;">
        <ToolbarButton icon="save" primary :disabled="saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>

      <!-- User edit modal -->
      <DraggableModal v-model:visible="showUserModal" :title="editingUser && editingUser._key ? t('system.login.modal.editUser') : t('system.login.modal.addUser')" @confirm="saveUser" @close="showUserModal = false" width="800px">
        <div class="form-row">
          <label class="form-label">{{ t('system.login.username') }}</label>
          <input class="form-control" v-model="editingUser.name" :disabled="editingUser._key" :placeholder="t('system.login.username')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.fullName') }}</label>
          <input class="form-control" v-model="editingUser['full-name']" :placeholder="t('system.login.fullName')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.homeDirectory') }}</label>
          <input class="form-control" v-model="editingUser['home-directory']" placeholder="/home/username" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.operator') }}</label>
          <input type="checkbox" v-model="editingUser.operator" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.disable') }}</label>
          <input type="checkbox" v-model="editingUser.disable" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('system.login.authSettings') }}</div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.plaintextPassword') }}</label>
          <input class="form-control" type="text" v-model="editingUser.authentication['plaintext-password']" :placeholder="t('system.login.plaintextPassword')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.encryptedPassword') }}</label>
          <input class="form-control" type="text" v-model="editingUser.authentication['encrypted-password']" :placeholder="t('system.login.encryptedPassword')" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('system.login.otpSettings') }}</div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.otpKey') }}</label>
          <input class="form-control" v-model="editingUser.authentication.otp.key" :placeholder="t('system.login.otpKeyPlaceholder')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.rateLimit') }}</label>
          <input class="form-control" type="number" min="1" max="10" v-model="editingUser.authentication.otp['rate-limit']" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.rateTime') }}</label>
          <input class="form-control" type="number" min="15" max="600" v-model="editingUser.authentication.otp['rate-time']" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.windowSize') }}</label>
          <input class="form-control" type="number" min="1" max="21" v-model="editingUser.authentication.otp['window-size']" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">Principal</div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.principalList') }}</label>
          <textarea class="form-control" :value="principalText" @input="onPrincipalInput" rows="3" :placeholder="t('system.login.principalPlaceholder')" />
        </div>
        <div style="font-weight:bold;margin:16px 0 8px;">{{ t('system.login.publicKeys') }}</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createPubKey">{{ t('system.login.buttons.addPubKey') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="editPubKey" :disabled="!selectedPubKeys.length || selectedPubKeys.length > 1">{{ t('system.login.buttons.edit') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="removePubKey" :disabled="!selectedPubKeys.length">{{ t('system.login.buttons.delete') }}</ToolbarButton>
        </div>
        <DataTable :columns="pubKeyColumns" :data="editingUser.authentication['public-keys']" rowKey="key_id" :externalToolbar="true" @selection-change="selectedPubKeys = $event" :selectable="true" />
      </DraggableModal>

      <!-- Public key edit modal -->
      <DraggableModal v-model:visible="showPubKeyModal" :title="editingPubKey && editingPubKey._key ? t('system.login.modal.editPubKey') : t('system.login.modal.addPubKey')" @confirm="savePubKey" @close="showPubKeyModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">{{ t('system.login.keyId') }}</label>
          <input class="form-control" v-model="editingPubKey.key_id" :disabled="editingPubKey._key" :placeholder="t('system.login.keyIdPlaceholder')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.type') }}</label>
          <select class="form-control" v-model="editingPubKey.type">
            <option value="">{{ t('system.login.notSelected') }}</option>
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
          <label class="form-label">{{ t('system.login.key') }}</label>
          <textarea class="form-control" v-model="editingPubKey.key" rows="4" :placeholder="t('system.login.keyPlaceholder')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.options') }}</label>
          <input class="form-control" v-model="editingPubKey.options" :placeholder="t('system.login.optionsPlaceholder')" />
        </div>
      </DraggableModal>

      <!-- Operator group edit modal -->
      <DraggableModal v-model:visible="showOpGroupModal" :title="editingOpGroup && editingOpGroup._key ? t('system.login.modal.editOpGroup') : t('system.login.modal.addOpGroup')" @confirm="saveOpGroup" @close="showOpGroupModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">{{ t('system.login.groupName') }}</label>
          <input class="form-control" v-model="editingOpGroup.name" :disabled="editingOpGroup._key" :placeholder="t('system.login.groupName')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.allowCommands') }}</label>
          <textarea class="form-control" :value="opGroupAllowText" @input="onOpGroupAllowInput" rows="5" :placeholder="t('system.login.allowCommandsPlaceholder')" />
        </div>
      </DraggableModal>

      <!-- RADIUS server edit modal -->
      <DraggableModal v-model:visible="showRadiusServerModal" :title="editingRadiusServer && editingRadiusServer._key ? t('system.login.modal.editRadiusServer') : t('system.login.modal.addRadiusServer')" @confirm="saveRadiusServer" @close="showRadiusServerModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">{{ t('system.login.address') }}</label>
          <input class="form-control" v-model="editingRadiusServer.address" :disabled="editingRadiusServer._key" :placeholder="t('system.login.ipAddress')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.key') }}</label>
          <input class="form-control" v-model="editingRadiusServer.key" :placeholder="t('system.login.sharedSecret')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.port') }}</label>
          <input class="form-control" type="number" min="1" max="65535" v-model="editingRadiusServer.port" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.priority') }}</label>
          <input class="form-control" type="number" min="1" max="255" v-model="editingRadiusServer.priority" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.timeout') }}</label>
          <input class="form-control" type="number" min="1" max="240" v-model="editingRadiusServer.timeout" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.disable') }}</label>
          <input type="checkbox" v-model="editingRadiusServer.disable" />
        </div>
      </DraggableModal>

      <!-- TACACS server edit modal -->
      <DraggableModal v-model:visible="showTacacsServerModal" :title="editingTacacsServer && editingTacacsServer._key ? t('system.login.modal.editTacacsServer') : t('system.login.modal.addTacacsServer')" @confirm="saveTacacsServer" @close="showTacacsServerModal = false" width="600px">
        <div class="form-row">
          <label class="form-label">{{ t('system.login.address') }}</label>
          <input class="form-control" v-model="editingTacacsServer.address" :disabled="editingTacacsServer._key" :placeholder="t('system.login.ipAddress')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.key') }}</label>
          <input class="form-control" v-model="editingTacacsServer.key" :placeholder="t('system.login.sharedSecret')" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.port') }}</label>
          <input class="form-control" type="number" min="1" max="65535" v-model="editingTacacsServer.port" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('system.login.disable') }}</label>
          <input type="checkbox" v-model="editingTacacsServer.disable" />
        </div>
      </DraggableModal>

    </div>
  `,
});
