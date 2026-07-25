import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

const LOGLEVEL_OPTIONS = [
  { key: 'quiet', label: 'quiet（静默）' },
  { key: 'fatal', label: 'fatal（仅致命错误）' },
  { key: 'error', label: 'error（错误和致命错误）' },
  { key: 'info', label: 'info（默认）' },
  { key: 'verbose', label: 'verbose（记录失败登录）' },
];

const CIPHER_OPTIONS = [
  '3des-cbc', 'aes128-cbc', 'aes128-ctr', 'aes128-gcm@openssh.com',
  'aes192-cbc', 'aes192-ctr', 'aes256-cbc', 'aes256-ctr', 'aes256-gcm@openssh.com',
  'chacha20-poly1305@openssh.com', 'rijndael-cbc@lysator.liu.se',
];

const MAC_OPTIONS = [
  'hmac-md5', 'hmac-md5-96', 'hmac-md5-96-etm@openssh.com', 'hmac-md5-etm@openssh.com',
  'hmac-sha1', 'hmac-sha1-96', 'hmac-sha1-96-etm@openssh.com', 'hmac-sha1-etm@openssh.com',
  'hmac-sha2-256', 'hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512', 'hmac-sha2-512-etm@openssh.com',
  'umac-128-etm@openssh.com', 'umac-128@openssh.com', 'umac-64-etm@openssh.com', 'umac-64@openssh.com',
];

const HOSTKEY_ALGORITHM_OPTIONS = [
  'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp256-cert-v01@openssh.com',
  'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp384-cert-v01@openssh.com',
  'ecdsa-sha2-nistp521', 'ecdsa-sha2-nistp521-cert-v01@openssh.com',
  'rsa-sha2-256', 'rsa-sha2-256-cert-v01@openssh.com',
  'rsa-sha2-512', 'rsa-sha2-512-cert-v01@openssh.com',
  'sk-ecdsa-sha2-nistp256-cert-v01@openssh.com', 'sk-ecdsa-sha2-nistp256@openssh.com',
  'sk-ssh-ed25519-cert-v01@openssh.com', 'sk-ssh-ed25519@openssh.com',
  'ssh-dss', 'ssh-dss-cert-v01@openssh.com',
  'ssh-ed25519', 'ssh-ed25519-cert-v01@openssh.com',
  'ssh-rsa', 'ssh-rsa-cert-v01@openssh.com',
  'webauthn-sk-ecdsa-sha2-nistp256@openssh.com',
];

const KEY_EXCHANGE_OPTIONS = [
  'curve25519-sha256', 'curve25519-sha256@libssh.org',
  'diffie-hellman-group-exchange-sha1', 'diffie-hellman-group-exchange-sha256',
  'diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1', 'diffie-hellman-group14-sha256',
  'diffie-hellman-group16-sha512', 'diffie-hellman-group18-sha512',
  'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521',
];

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

function joinMembers(val) {
  return toArray(val).join('\n');
}

function splitMembers(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function firstValue(val) {
  const arr = toArray(val);
  return arr.length ? String(arr[0]) : '';
}

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  if (!validateIPv4(value)) return '';
  if (!validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function validateIPPrefix(value) {
  if (!value) return '';
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = parseInt(prefix, 10);
    if (isNaN(p)) return '前缀必须为数字';
    const v4Err = validateIPv4(ip);
    const v6Err = validateIPv6(ip);
    if (!v4Err && (p < 0 || p > 32)) return 'IPv4 前缀范围 0-32';
    if (!v6Err && (p < 0 || p > 128)) return 'IPv6 前缀范围 0-128';
    if (v4Err && v6Err) return 'IP 地址或前缀格式错误';
    return '';
  }
  return validateIP(value);
}

function sshToForm(data = {}) {
  const accessControl = data['access-control'] || {};
  const allow = accessControl.allow || {};
  const deny = accessControl.deny || {};
  const dynamicProtection = data['dynamic-protection'] || {};
  const rekey = data.rekey || {};
  return {
    port: data.port !== undefined ? String(firstValue(data.port)) : '22',
    listen_address: joinMembers(data['listen-address']),
    loglevel: data.loglevel || 'info',
    client_keepalive_interval: data['client-keepalive-interval'] !== undefined ? String(data['client-keepalive-interval']) : '',
    disable_host_validation: data['disable-host-validation'] !== undefined,
    disable_password_authentication: data['disable-password-authentication'] !== undefined,
    vrf: data.vrf || 'default',
    ciphers: toArray(data.ciphers),
    mac: toArray(data.mac),
    hostkey_algorithm: toArray(data['hostkey-algorithm']),
    key_exchange: toArray(data['key-exchange']),
    access_control: {
      allow_user: joinMembers(allow.user),
      allow_group: joinMembers(allow.group),
      deny_user: joinMembers(deny.user),
      deny_group: joinMembers(deny.group),
    },
    dynamic_protection: {
      allow_from: joinMembers(dynamicProtection['allow-from']),
      block_time: dynamicProtection['block-time'] !== undefined ? String(dynamicProtection['block-time']) : '120',
      detect_time: dynamicProtection['detect-time'] !== undefined ? String(dynamicProtection['detect-time']) : '1800',
      threshold: dynamicProtection.threshold !== undefined ? String(dynamicProtection.threshold) : '30',
    },
    rekey: {
      data: rekey.data !== undefined ? String(rekey.data) : '',
      time: rekey.time !== undefined ? String(rekey.time) : '',
    },
  };
}

function sshToConfig(form) {
  const result = {};

  if (isPresent(form.port)) {
    const port = parseInt(form.port, 10);
    if (!isNaN(port)) result.port = String(port);
  }
  const listenAddresses = splitMembers(form.listen_address);
  if (listenAddresses.length) result['listen-address'] = listenAddresses;
  if (isPresent(form.loglevel)) result.loglevel = String(form.loglevel).toLowerCase();
  if (isPresent(form.client_keepalive_interval)) result['client-keepalive-interval'] = String(form.client_keepalive_interval);
  if (form.disable_host_validation) result['disable-host-validation'] = '';
  if (form.disable_password_authentication) result['disable-password-authentication'] = '';
  if (isPresent(form.vrf)) result.vrf = String(form.vrf);

  if (form.ciphers?.length) result.ciphers = [...form.ciphers];
  if (form.mac?.length) result.mac = [...form.mac];
  if (form.hostkey_algorithm?.length) result['hostkey-algorithm'] = [...form.hostkey_algorithm];
  if (form.key_exchange?.length) result['key-exchange'] = [...form.key_exchange];

  const accessControl = {};
  const allow = {};
  const allowUsers = splitMembers(form.access_control?.allow_user);
  if (allowUsers.length) allow.user = allowUsers;
  const allowGroups = splitMembers(form.access_control?.allow_group);
  if (allowGroups.length) allow.group = allowGroups;
  if (Object.keys(allow).length) accessControl.allow = allow;

  const deny = {};
  const denyUsers = splitMembers(form.access_control?.deny_user);
  if (denyUsers.length) deny.user = denyUsers;
  const denyGroups = splitMembers(form.access_control?.deny_group);
  if (denyGroups.length) deny.group = denyGroups;
  if (Object.keys(deny).length) accessControl.deny = deny;

  if (Object.keys(accessControl).length) result['access-control'] = accessControl;

  const dynamicProtection = {};
  const allowFrom = splitMembers(form.dynamic_protection?.allow_from);
  if (allowFrom.length) dynamicProtection['allow-from'] = allowFrom;
  if (isPresent(form.dynamic_protection?.block_time)) dynamicProtection['block-time'] = String(form.dynamic_protection.block_time);
  if (isPresent(form.dynamic_protection?.detect_time)) dynamicProtection['detect-time'] = String(form.dynamic_protection.detect_time);
  if (isPresent(form.dynamic_protection?.threshold)) dynamicProtection.threshold = String(form.dynamic_protection.threshold);
  if (Object.keys(dynamicProtection).length) result['dynamic-protection'] = dynamicProtection;

  const rekey = {};
  if (isPresent(form.rekey?.data)) rekey.data = String(form.rekey.data);
  if (isPresent(form.rekey?.time)) rekey.time = String(form.rekey.time);
  if (Object.keys(rekey).length) result.rekey = rekey;

  return result;
}

function validateRange(value, min, max, name) {
  if (!isPresent(value)) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name} 范围为 ${min}-${max}`;
  return '';
}

export default defineComponent({
  name: 'SshPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(sshToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'access-control': return 'service ssh access-control';
        case 'dynamic-protection': return 'service ssh dynamic-protection';
        case 'rekey': return 'service ssh rekey';
        case 'basic':
        case 'crypto':
        default: return 'service ssh';
      }
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service ssh', true);
        config.value = sshToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      let err = validateRange(config.value.port, 1, 65535, '端口');
      if (err) return alert(err + '，默认 22');

      err = validateRange(config.value.client_keepalive_interval, 1, 65535, 'Keepalive 间隔');
      if (err) return alert(err + '（秒）');

      err = validateRange(config.value.dynamic_protection?.block_time, 1, 65535, 'Block Time');
      if (err) return alert(err + '，默认 120');

      err = validateRange(config.value.dynamic_protection?.detect_time, 1, 65535, 'Detect Time');
      if (err) return alert(err + '，默认 1800');

      err = validateRange(config.value.dynamic_protection?.threshold, 1, 65535, 'Threshold');
      if (err) return alert(err + '，默认 30');

      err = validateRange(config.value.rekey?.data, 1, 65535, 'Rekey Data');
      if (err) return alert(err + '（MB）');

      err = validateRange(config.value.rekey?.time, 1, 65535, 'Rekey Time');
      if (err) return alert(err + '（分钟）');

      const allowFrom = splitMembers(config.value.dynamic_protection?.allow_from);
      for (const item of allowFrom) {
        err = validateIPPrefix(item);
        if (err) return alert(`Dynamic Protection 允许来源 ${item}：${err}`);
      }

      saving.value = true;
      try {
        await configApi.set('service ssh', sshToConfig(config.value));
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      load, save,
      LOGLEVEL_OPTIONS, CIPHER_OPTIONS, MAC_OPTIONS, HOSTKEY_ALGORITHM_OPTIONS, KEY_EXCHANGE_OPTIONS,
    };
  },
  components: { DualListSelector, TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'crypto', title: '加密算法' },
        { key: 'access-control', title: '访问控制' },
        { key: 'dynamic-protection', title: '动态防护' },
        { key: 'rekey', title: 'Rekey' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" title="SSH 监听端口，默认 22，范围 1-65535">端口</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.port" placeholder="1-65535，默认 22" title="SSH 监听端口，默认 22，范围 1-65535" />
              <div class="form-hint">默认：22，范围：1-65535</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" title="SSH 监听地址列表，每行一个 IPv4/IPv6 地址">监听地址</label><textarea class="form-control" v-model="config.listen_address" rows="3" placeholder="每行一个 IPv4/IPv6 监听地址" title="SSH 监听地址列表" /></div>
          <div class="form-row">
            <label class="form-label" title="SSH 日志级别，默认 info">日志级别</label>
            <select class="form-control" v-model="config.loglevel" title="SSH 日志级别，默认 info">
              <option v-for="o in LOGLEVEL_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" title="向客户端发送 keepalive 消息的间隔，范围 1-65535 秒">客户端 Keepalive 间隔 (秒)</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.client_keepalive_interval" placeholder="1-65535" title="向客户端发送 keepalive 消息的间隔（秒），范围 1-65535" />
              <div class="form-hint">范围：1-65535</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" title="禁用 IP 地址到主机名的解析">禁用主机验证</label><input type="checkbox" v-model="config.disable_host_validation" title="禁用 IP 地址到主机名的解析" /></div>
          <div class="form-row"><label class="form-label" title="禁用基于密码的 SSH 认证">禁用密码认证</label><input type="checkbox" v-model="config.disable_password_authentication" title="禁用基于密码的 SSH 认证" /></div>
          <div class="form-row"><label class="form-label" title="SSH 服务绑定的 VRF，默认 default">VRF</label><input class="form-control" v-model="config.vrf" placeholder="default" title="SSH 服务绑定的 VRF，默认 default" /></div>
        </template>

        <template #crypto>
          <div class="form-row">
            <label class="form-label" title="允许的 SSH 加密算法">加密算法 (Ciphers)</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.ciphers" :options="CIPHER_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="允许的 SSH MAC 算法">MAC 算法</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.mac" :options="MAC_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="允许的主机密钥签名算法">主机密钥算法</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.hostkey_algorithm" :options="HOSTKEY_ALGORITHM_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="允许的密钥交换算法">密钥交换算法</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.key_exchange" :options="KEY_EXCHANGE_OPTIONS" title-left="可选" title-right="已选" />
            </div>
          </div>
        </template>

        <template #access-control>
          <div class="form-row"><label class="form-label" title="允许登录的用户，每行一个">允许用户</label><textarea class="form-control" v-model="config.access_control.allow_user" rows="3" placeholder="每行一个用户名" title="允许 SSH 登录的用户列表" /></div>
          <div class="form-row"><label class="form-label" title="允许登录的组，每行一个">允许组</label><textarea class="form-control" v-model="config.access_control.allow_group" rows="3" placeholder="每行一个组名" title="允许 SSH 登录的组列表" /></div>
          <div class="form-row"><label class="form-label" title="拒绝登录的用户，每行一个">拒绝用户</label><textarea class="form-control" v-model="config.access_control.deny_user" rows="3" placeholder="每行一个用户名" title="拒绝 SSH 登录的用户列表" /></div>
          <div class="form-row"><label class="form-label" title="拒绝登录的组，每行一个">拒绝组</label><textarea class="form-control" v-model="config.access_control.deny_group" rows="3" placeholder="每行一个组名" title="拒绝 SSH 登录的组列表" /></div>
        </template>

        <template #dynamic-protection>
          <div class="form-row"><label class="form-label" title="始终允许连接的源地址，每行一个 IPv4/IPv6 地址或前缀">允许来源</label><textarea class="form-control" v-model="config.dynamic_protection.allow_from" rows="3" placeholder="每行一个 IP 或 CIDR" title="动态防护始终允许的源地址列表" /></div>
          <div class="form-row">
            <label class="form-label" title="阻断源 IP 的时间，默认 120 秒，范围 1-65535">阻断时间 (秒)</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.block_time" placeholder="1-65535，默认 120" title="阻断源 IP 的时间（秒），默认 120" />
              <div class="form-hint">默认：120，范围：1-65535</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="记忆源 IP 的时间，默认 1800 秒，范围 1-65535">检测时间 (秒)</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.detect_time" placeholder="1-65535，默认 1800" title="记忆源 IP 的时间（秒），默认 1800" />
              <div class="form-hint">默认：1800，范围：1-65535</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="攻击阈值，默认 30，范围 1-65535">阈值</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.threshold" placeholder="1-65535，默认 30" title="累计攻击分数超过该值时阻断源 IP，默认 30" />
              <div class="form-hint">默认：30，范围：1-65535</div>
            </div>
          </div>
        </template>

        <template #rekey>
          <div class="form-row">
            <label class="form-label" title="数据量阈值（MB），范围 1-65535">数据阈值 (MB)</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.rekey.data" placeholder="1-65535" title="会话重新密钥化的数据量阈值（MB），范围 1-65535" />
              <div class="form-hint">范围：1-65535（MB）</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="时间阈值（分钟），范围 1-65535">时间阈值 (分钟)</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.rekey.time" placeholder="1-65535" title="会话重新密钥化的时间阈值（分钟），范围 1-65535" />
              <div class="form-hint">范围：1-65535（分钟）</div>
            </div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>
    </div>
  `,
});
