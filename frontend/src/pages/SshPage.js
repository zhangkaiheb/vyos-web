import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';

const LOGLEVEL_OPTIONS = [
  { key: 'quiet', labelKey: 'ssh.loglevel.quiet' },
  { key: 'fatal', labelKey: 'ssh.loglevel.fatal' },
  { key: 'error', labelKey: 'ssh.loglevel.error' },
  { key: 'info', labelKey: 'ssh.loglevel.info' },
  { key: 'verbose', labelKey: 'ssh.loglevel.verbose' },
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

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('ssh.validation.ipv4Format');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('ssh.validation.ipv4Format');
  return '';
}

function validateIPv6(value, t) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return t('ssh.validation.ipv6Format');
  return '';
}

function validateIP(value, t) {
  if (!value) return '';
  if (!validateIPv4(value, t)) return '';
  if (!validateIPv6(value, t)) return '';
  return t('ssh.validation.ipFormat');
}

function validateIPPrefix(value, t) {
  if (!value) return '';
  if (value.includes('/')) {
    const [ip, prefix] = value.split('/');
    const p = parseInt(prefix, 10);
    if (isNaN(p)) return t('ssh.validation.prefixMustBeNumber');
    const v4Err = validateIPv4(ip, t);
    const v6Err = validateIPv6(ip, t);
    if (!v4Err && (p < 0 || p > 32)) return t('ssh.validation.ipv4PrefixRange');
    if (!v6Err && (p < 0 || p > 128)) return t('ssh.validation.ipv6PrefixRange');
    if (v4Err && v6Err) return t('ssh.validation.ipOrPrefixFormat');
    return '';
  }
  return validateIP(value, t);
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

function validateRange(value, min, max, nameKey, t) {
  if (!isPresent(value)) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return t('ssh.validation.range', { name: t(nameKey), min, max });
  return '';
}

export default defineComponent({
  name: 'SshPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
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
      let err = validateRange(config.value.port, 1, 65535, 'ssh.fields.port', t);
      if (err) return showError({ message: t('ssh.validation.portDefault', { err }) });

      err = validateRange(config.value.client_keepalive_interval, 1, 65535, 'ssh.fields.clientKeepalive', t);
      if (err) return showError({ message: t('ssh.validation.keepaliveUnit', { err }) });

      err = validateRange(config.value.dynamic_protection?.block_time, 1, 65535, 'ssh.fields.blockTime', t);
      if (err) return showError({ message: t('ssh.validation.blockTimeDefault', { err }) });

      err = validateRange(config.value.dynamic_protection?.detect_time, 1, 65535, 'ssh.fields.detectTime', t);
      if (err) return showError({ message: t('ssh.validation.detectTimeDefault', { err }) });

      err = validateRange(config.value.dynamic_protection?.threshold, 1, 65535, 'ssh.fields.threshold', t);
      if (err) return showError({ message: t('ssh.validation.thresholdDefault', { err }) });

      err = validateRange(config.value.rekey?.data, 1, 65535, 'ssh.fields.rekeyData', t);
      if (err) return showError({ message: t('ssh.validation.rekeyDataUnit', { err }) });

      err = validateRange(config.value.rekey?.time, 1, 65535, 'ssh.fields.rekeyTime', t);
      if (err) return showError({ message: t('ssh.validation.rekeyTimeUnit', { err }) });

      const allowFrom = splitMembers(config.value.dynamic_protection?.allow_from);
      for (const item of allowFrom) {
        err = validateIPPrefix(item, t);
        if (err) return showError({ message: t('ssh.validation.allowFromItem', { item, err }) });
      }

      saving.value = true;
      try {
        await configStore.setConfig('service ssh', sshToConfig(config.value));
        configStore.markPending();
        saved.value = true;
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    const loglevelOptions = LOGLEVEL_OPTIONS.map(o => ({ ...o, label: t(o.labelKey) }));

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      load, save,
      loglevelOptions, CIPHER_OPTIONS, MAC_OPTIONS, HOSTKEY_ALGORITHM_OPTIONS, KEY_EXCHANGE_OPTIONS,
    };
  },
  components: { DualListSelector, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('ssh.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('ssh.tabs.basic') },
        { key: 'crypto', title: t('ssh.tabs.crypto') },
        { key: 'access-control', title: t('ssh.tabs.accessControl') },
        { key: 'dynamic-protection', title: t('ssh.tabs.dynamicProtection') },
        { key: 'rekey', title: t('ssh.tabs.rekey') }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.basic.portTitle')">{{ t('ssh.fields.port') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.port" :placeholder="t('ssh.basic.portPlaceholder')" :title="t('ssh.basic.portTitle')" />
              <div class="form-hint">{{ t('ssh.basic.portHint') }}</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" :title="t('ssh.basic.listenAddressTitle')">{{ t('ssh.fields.listenAddress') }}</label><textarea class="form-control" v-model="config.listen_address" rows="3" :placeholder="t('ssh.basic.listenAddressPlaceholder')" :title="t('ssh.basic.listenAddressTitle')" /></div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.basic.loglevelTitle')">{{ t('ssh.fields.loglevel') }}</label>
            <select class="form-control" v-model="config.loglevel" :title="t('ssh.basic.loglevelTitle')">
              <option v-for="o in loglevelOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.basic.clientKeepaliveTitle')">{{ t('ssh.fields.clientKeepalive') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.client_keepalive_interval" placeholder="1-65535" :title="t('ssh.basic.clientKeepaliveTitle')" />
              <div class="form-hint">{{ t('ssh.basic.clientKeepaliveHint') }}</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" :title="t('ssh.basic.disableHostValidationTitle')">{{ t('ssh.fields.disableHostValidation') }}</label><input type="checkbox" v-model="config.disable_host_validation" :title="t('ssh.basic.disableHostValidationTitle')" /></div>
          <div class="form-row"><label class="form-label" :title="t('ssh.basic.disablePasswordAuthTitle')">{{ t('ssh.fields.disablePasswordAuthentication') }}</label><input type="checkbox" v-model="config.disable_password_authentication" :title="t('ssh.basic.disablePasswordAuthTitle')" /></div>
          <div class="form-row"><label class="form-label" :title="t('ssh.basic.vrfTitle')">VRF</label><input class="form-control" v-model="config.vrf" placeholder="default" :title="t('ssh.basic.vrfTitle')" /></div>
        </template>

        <template #crypto>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.crypto.ciphersTitle')">{{ t('ssh.fields.ciphers') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.ciphers" :options="CIPHER_OPTIONS" :title-left="t('ssh.dualList.available')" :title-right="t('ssh.dualList.selected')" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.crypto.macTitle')">{{ t('ssh.fields.mac') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.mac" :options="MAC_OPTIONS" :title-left="t('ssh.dualList.available')" :title-right="t('ssh.dualList.selected')" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.crypto.hostkeyAlgorithmTitle')">{{ t('ssh.fields.hostkeyAlgorithm') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.hostkey_algorithm" :options="HOSTKEY_ALGORITHM_OPTIONS" :title-left="t('ssh.dualList.available')" :title-right="t('ssh.dualList.selected')" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.crypto.keyExchangeTitle')">{{ t('ssh.fields.keyExchange') }}</label>
            <div style="flex:1;max-width:600px;">
              <DualListSelector v-model="config.key_exchange" :options="KEY_EXCHANGE_OPTIONS" :title-left="t('ssh.dualList.available')" :title-right="t('ssh.dualList.selected')" />
            </div>
          </div>
        </template>

        <template #access-control>
          <div class="form-row"><label class="form-label" :title="t('ssh.accessControl.allowUserTitle')">{{ t('ssh.fields.allowUser') }}</label><textarea class="form-control" v-model="config.access_control.allow_user" rows="3" :placeholder="t('ssh.accessControl.allowUserPlaceholder')" :title="t('ssh.accessControl.allowUserTitle')" /></div>
          <div class="form-row"><label class="form-label" :title="t('ssh.accessControl.allowGroupTitle')">{{ t('ssh.fields.allowGroup') }}</label><textarea class="form-control" v-model="config.access_control.allow_group" rows="3" :placeholder="t('ssh.accessControl.allowGroupPlaceholder')" :title="t('ssh.accessControl.allowGroupTitle')" /></div>
          <div class="form-row"><label class="form-label" :title="t('ssh.accessControl.denyUserTitle')">{{ t('ssh.fields.denyUser') }}</label><textarea class="form-control" v-model="config.access_control.deny_user" rows="3" :placeholder="t('ssh.accessControl.denyUserPlaceholder')" :title="t('ssh.accessControl.denyUserTitle')" /></div>
          <div class="form-row"><label class="form-label" :title="t('ssh.accessControl.denyGroupTitle')">{{ t('ssh.fields.denyGroup') }}</label><textarea class="form-control" v-model="config.access_control.deny_group" rows="3" :placeholder="t('ssh.accessControl.denyGroupPlaceholder')" :title="t('ssh.accessControl.denyGroupTitle')" /></div>
        </template>

        <template #dynamic-protection>
          <div class="form-row"><label class="form-label" :title="t('ssh.dynamicProtection.allowFromTitle')">{{ t('ssh.fields.allowFrom') }}</label><textarea class="form-control" v-model="config.dynamic_protection.allow_from" rows="3" :placeholder="t('ssh.dynamicProtection.allowFromPlaceholder')" :title="t('ssh.dynamicProtection.allowFromTitle')" /></div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.dynamicProtection.blockTimeTitle')">{{ t('ssh.fields.blockTime') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.block_time" :placeholder="t('ssh.dynamicProtection.blockTimePlaceholder')" :title="t('ssh.dynamicProtection.blockTimeTitle')" />
              <div class="form-hint">{{ t('ssh.dynamicProtection.blockTimeHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.dynamicProtection.detectTimeTitle')">{{ t('ssh.fields.detectTime') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.detect_time" :placeholder="t('ssh.dynamicProtection.detectTimePlaceholder')" :title="t('ssh.dynamicProtection.detectTimeTitle')" />
              <div class="form-hint">{{ t('ssh.dynamicProtection.detectTimeHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.dynamicProtection.thresholdTitle')">{{ t('ssh.fields.threshold') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.dynamic_protection.threshold" :placeholder="t('ssh.dynamicProtection.thresholdPlaceholder')" :title="t('ssh.dynamicProtection.thresholdTitle')" />
              <div class="form-hint">{{ t('ssh.dynamicProtection.thresholdHint') }}</div>
            </div>
          </div>
        </template>

        <template #rekey>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.rekey.dataTitle')">{{ t('ssh.fields.rekeyData') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.rekey.data" placeholder="1-65535" :title="t('ssh.rekey.dataTitle')" />
              <div class="form-hint">{{ t('ssh.rekey.dataHint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('ssh.rekey.timeTitle')">{{ t('ssh.fields.rekeyTime') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.rekey.time" placeholder="1-65535" :title="t('ssh.rekey.timeTitle')" />
              <div class="form-hint">{{ t('ssh.rekey.timeHint') }}</div>
            </div>
          </div>
        </template>
      </TabGroup>
    </div>
  `,
});
