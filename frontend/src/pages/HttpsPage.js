import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

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

function apiKeysToForm(keysData = {}) {
  const idMap = keysData.id || {};
  return Object.entries(idMap).map(([id, item]) => ({
    _id: id,
    id,
    key: item.key || '',
  }));
}

function apiKeysToConfig(formKeys = []) {
  const result = {};
  for (const k of formKeys) {
    if (!k.id) continue;
    result[k.id] = { key: k.key || '' };
  }
  return Object.keys(result).length ? { id: result } : {};
}

function httpsToForm(data = {}) {
  const certs = data.certificates || {};
  const apiData = data.api || {};
  const graphql = apiData.graphql || {};
  const auth = graphql.authentication || {};
  const tlsVersions = toArray(data['tls-version']).map(String);
  const allowClient = data['allow-client'] || {};
  return {
    port: data.port !== undefined ? String(data.port) : '443',
    listen_address: joinMembers(data['listen-address']),
    tls_version: tlsVersions.length ? tlsVersions : ['1.2', '1.3'],
    enable_http_redirect: data['enable-http-redirect'] !== undefined,
    request_body_size_limit: data['request-body-size-limit'] !== undefined ? String(data['request-body-size-limit']) : '1',
    vrf: data.vrf || '',
    certificates: {
      certificate: certs.certificate || '',
      ca_certificate: certs['ca-certificate'] || '',
      dh_params: certs['dh-params'] || '',
    },
    api: {
      strict: apiData.strict !== undefined,
      debug: apiData.debug !== undefined,
      cors_allow_origin: joinMembers(apiData.cors?.['allow-origin']),
      graphql_introspection: graphql.introspection !== undefined,
      graphql_authentication: {
        enabled: graphql.authentication !== undefined,
        type: auth.type || 'key',
        expiration: auth.expiration !== undefined ? String(auth.expiration) : '3600',
        secret_length: auth['secret-length'] !== undefined ? String(auth['secret-length']) : '32',
      },
      keys: apiKeysToForm(apiData.keys),
    },
    allow_client: joinMembers(allowClient.address),
  };
}

function httpsToConfig(form) {
  const result = {};

  if (isPresent(form.port)) result.port = String(form.port);
  const listenAddresses = splitMembers(form.listen_address);
  if (listenAddresses.length) result['listen-address'] = listenAddresses;
  if (form.tls_version?.length) result['tls-version'] = form.tls_version.map(String);
  if (form.enable_http_redirect) result['enable-http-redirect'] = '';
  if (isPresent(form.request_body_size_limit)) result['request-body-size-limit'] = String(form.request_body_size_limit);
  if (isPresent(form.vrf)) result.vrf = String(form.vrf);

  const certs = {};
  if (isPresent(form.certificates?.certificate)) certs.certificate = String(form.certificates.certificate);
  if (isPresent(form.certificates?.ca_certificate)) certs['ca-certificate'] = String(form.certificates.ca_certificate);
  if (isPresent(form.certificates?.dh_params)) certs['dh-params'] = String(form.certificates.dh_params);
  if (Object.keys(certs).length) result.certificates = certs;

  const api = {};
  if (form.api?.strict) api.strict = '';
  if (form.api?.debug) api.debug = '';

  const corsAllowOrigins = splitMembers(form.api?.cors_allow_origin);
  if (corsAllowOrigins.length) api.cors = { 'allow-origin': corsAllowOrigins };

  const graphql = {};
  if (form.api?.graphql_introspection) graphql.introspection = '';
  if (form.api?.graphql_authentication?.enabled) {
    graphql.authentication = {
      type: form.api.graphql_authentication.type || 'key',
    };
    if (isPresent(form.api.graphql_authentication.expiration)) {
      graphql.authentication.expiration = String(form.api.graphql_authentication.expiration);
    }
    if (isPresent(form.api.graphql_authentication.secret_length)) {
      graphql.authentication['secret-length'] = String(form.api.graphql_authentication.secret_length);
    }
  }
  if (Object.keys(graphql).length) api.graphql = graphql;

  const keys = apiKeysToConfig(form.api?.keys);
  if (Object.keys(keys).length) api.keys = keys;

  if (Object.keys(api).length) result.api = api;

  const allowClientAddresses = splitMembers(form.allow_client);
  if (allowClientAddresses.length) {
    result['allow-client'] = { address: allowClientAddresses };
  }

  return result;
}

export default defineComponent({
  name: 'HttpsPage',
  setup() {
    const { t } = inject('i18n');
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(httpsToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

    const TLS_VERSION_OPTIONS = ['1.0', '1.1', '1.2', '1.3'];
    const API_KEY_COLUMNS = [
      { key: 'id', title: 'ID' },
      { key: 'key', title: 'Key' },
    ];
    const GRAPHQL_AUTH_TYPE_OPTIONS = [
      { key: 'key', label: t('https.auth_type_keys') },
      { key: 'token', label: t('https.auth_type_token') },
    ];

    function validateIPv4(value) {
      if (!value) return '';
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('https.error_ipv4');
      if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('https.error_ipv4');
      return '';
    }

    function validateIPv6(value) {
      if (!value) return '';
      const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
      if (!re.test(value)) return t('https.error_ipv6');
      return '';
    }

    function validateIP(value) {
      if (!value) return '';
      if (!validateIPv4(value)) return '';
      if (!validateIPv6(value)) return '';
      return t('https.error_ip');
    }

    function validateApiKey(key) {
      if (!key || !String(key).trim()) return t('https.error_api_key_id_required');
      if (!/^[a-zA-Z0-9_-]+$/.test(String(key))) return t('https.error_api_key_id_chars');
      return '';
    }

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'certificates': return 'service https certificates';
        case 'api': return 'service https api';
        case 'allow-client': return 'service https allow-client';
        case 'basic':
        default: return 'service https';
      }
    });

    const showKeyModal = ref(false);
    const editingKey = ref({});

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('service https', true);
        config.value = httpsToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      const port = parseInt(config.value.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) return showError({ message: t('https.error_port_range') });

      const listenAddresses = splitMembers(config.value.listen_address);
      for (const ip of listenAddresses) {
        const err = validateIP(ip);
        if (err) return showError({ message: t('https.error_listen_address_format', { ip }) });
      }

      const size = parseInt(config.value.request_body_size_limit, 10);
      if (isNaN(size) || size < 1) return showError({ message: t('https.error_request_body_size') });

      const allowClients = splitMembers(config.value.allow_client);
      for (const ip of allowClients) {
        const err = validateIP(ip);
        if (err) return showError({ message: t('https.error_allow_client_format', { ip }) });
      }

      if (config.value.api.graphql_authentication.enabled) {
        const exp = parseInt(config.value.api.graphql_authentication.expiration, 10);
        if (isNaN(exp) || exp < 60 || exp > 31536000) return showError({ message: t('https.error_graphql_expiration') });
        const secret = parseInt(config.value.api.graphql_authentication.secret_length, 10);
        if (isNaN(secret) || secret < 16 || secret > 65535) return showError({ message: t('https.error_graphql_secret_length') });
      }

      const keyIds = new Set();
      for (const k of config.value.api.keys || []) {
        const err = validateApiKey(k.id);
        if (err) return showError({ message: err });
        if (keyIds.has(k.id)) return showError({ message: t('https.error_api_key_id_duplicate', { id: k.id }) });
        keyIds.add(k.id);
      }

      saving.value = true;
      try {
        await configStore.setConfig('service https', httpsToConfig(config.value));
        configStore.markPending();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createKey() {
      editingKey.value = { id: '', key: '' };
      showKeyModal.value = true;
    }

    function editKey(row) {
      const index = config.value.api.keys.findIndex(k => k.id === row.id);
      editingKey.value = { ...row, _index: index >= 0 ? index : undefined };
      showKeyModal.value = true;
    }

    function removeKey(selectedIds) {
      const ids = new Set(selectedIds);
      config.value.api.keys = config.value.api.keys.filter(k => !ids.has(k.id));
    }

    function saveKey() {
      const err = validateApiKey(editingKey.value.id);
      if (err) return showError({ message: err });
      const list = config.value.api.keys || [];
      const duplicate = list.some((k, idx) => k.id === editingKey.value.id && idx !== editingKey.value._index);
      if (duplicate) return showError({ message: t('https.error_api_key_id_exists', { id: editingKey.value.id }) });
      if (editingKey.value._index !== undefined) {
        list[editingKey.value._index] = { ...editingKey.value };
      } else {
        list.push({ ...editingKey.value });
      }
      delete list[editingKey.value._index !== undefined ? editingKey.value._index : list.length - 1]._index;
      config.value.api.keys = [...list];
      showKeyModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      showKeyModal, editingKey, API_KEY_COLUMNS,
      load, save, TLS_VERSION_OPTIONS, GRAPHQL_AUTH_TYPE_OPTIONS,
      createKey, editKey, removeKey, saveKey,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('https.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('https.tab_basic') },
        { key: 'certificates', title: t('https.tab_certificates') },
        { key: 'api', title: t('https.tab_api') },
        { key: 'allow-client', title: t('https.tab_allow_client') }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" :title="t('https.port_title')">{{ t('https.port_label') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.port" :placeholder="t('https.port_placeholder')" :title="t('https.port_title')" />
              <div class="form-hint">{{ t('https.port_hint') }}</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('https.listen_address_title')">{{ t('https.listen_address_label') }}</label>
            <textarea class="form-control" v-model="config.listen_address" rows="3" :placeholder="t('https.listen_address_placeholder')" :title="t('https.listen_address_title')" />
          </div>
          <div class="form-row">
            <label class="form-label" :title="t('https.tls_version_title')">{{ t('https.tls_version_label') }}</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <label v-for="v in TLS_VERSION_OPTIONS" :key="v"><input type="checkbox" v-model="config.tls_version" :value="v" /> {{ v }}</label>
            </div>
            <div class="form-hint">{{ t('https.tls_version_hint') }}</div>
          </div>
          <div class="form-row"><label class="form-label" :title="t('https.enable_http_redirect_title')">{{ t('https.enable_http_redirect_label') }}</label><input type="checkbox" v-model="config.enable_http_redirect" :title="t('https.enable_http_redirect_title')" /></div>
          <div class="form-row">
            <label class="form-label" :title="t('https.request_body_size_limit_title')">{{ t('https.request_body_size_limit_label') }}</label>
            <div style="flex:1;">
              <input type="number" min="1" class="form-control" v-model="config.request_body_size_limit" :placeholder="t('https.request_body_size_limit_placeholder')" :title="t('https.request_body_size_limit_title')" />
              <div class="form-hint">{{ t('https.request_body_size_limit_hint') }}</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" :title="t('https.vrf_title')">VRF</label><input class="form-control" v-model="config.vrf" :placeholder="t('https.vrf_placeholder')" :title="t('https.vrf_title')" /></div>
        </template>

        <template #certificates>
          <div class="form-row"><label class="form-label" :title="t('https.certificate_title')">{{ t('https.certificate_label') }}</label><input class="form-control" v-model="config.certificates.certificate" :placeholder="t('https.certificate_placeholder')" :title="t('https.certificate_title')" /></div>
          <div class="form-row"><label class="form-label" :title="t('https.ca_certificate_title')">{{ t('https.ca_certificate_label') }}</label><input class="form-control" v-model="config.certificates.ca_certificate" :placeholder="t('https.ca_certificate_placeholder')" :title="t('https.ca_certificate_title')" /></div>
          <div class="form-row"><label class="form-label" :title="t('https.dh_params_title')">{{ t('https.dh_params_label') }}</label><input class="form-control" v-model="config.certificates.dh_params" :placeholder="t('https.dh_params_placeholder')" :title="t('https.dh_params_title')" /></div>
        </template>

        <template #api>
          <div class="form-row"><label class="form-label" :title="t('https.strict_title')">{{ t('https.strict_label') }}</label><input type="checkbox" v-model="config.api.strict" :title="t('https.strict_title')" /></div>
          <div class="form-row"><label class="form-label" :title="t('https.debug_title')">{{ t('https.debug_label') }}</label><input type="checkbox" v-model="config.api.debug" :title="t('https.debug_title')" /></div>
          <div class="form-row">
            <label class="form-label" :title="t('https.cors_allow_origin_title')">{{ t('https.cors_allow_origin_label') }}</label>
            <div style="flex:1;">
              <textarea class="form-control" v-model="config.api.cors_allow_origin" rows="3" :placeholder="t('https.cors_allow_origin_placeholder')" :title="t('https.cors_allow_origin_title')" />
              <div class="form-hint">{{ t('https.cors_allow_origin_hint') }}</div>
            </div>
          </div>

          <div class="form-group" style="margin-top:16px;">
            <div class="form-group-title">GraphQL</div>
            <div class="form-group-content">
              <div class="form-row"><label class="form-label" :title="t('https.graphql_introspection_title')">{{ t('https.graphql_introspection_label') }}</label><input type="checkbox" v-model="config.api.graphql_introspection" :title="t('https.graphql_introspection_title')" /></div>
              <div class="form-row"><label class="form-label" :title="t('https.graphql_authentication_title')">{{ t('https.graphql_authentication_label') }}</label><input type="checkbox" v-model="config.api.graphql_authentication.enabled" :title="t('https.graphql_authentication_title')" /></div>
              <template v-if="config.api.graphql_authentication.enabled">
                <div class="form-row">
                  <label class="form-label" :title="t('https.auth_type_title')">{{ t('https.auth_type_label') }}</label>
                  <select class="form-control" v-model="config.api.graphql_authentication.type" :title="t('https.auth_type_title')">
                    <option v-for="opt in GRAPHQL_AUTH_TYPE_OPTIONS" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-row">
                  <label class="form-label" :title="t('https.expiration_title')">{{ t('https.expiration_label') }}</label>
                  <div style="flex:1;">
                    <input type="number" min="60" max="31536000" class="form-control" v-model="config.api.graphql_authentication.expiration" :placeholder="t('https.expiration_placeholder')" :title="t('https.expiration_title')" />
                    <div class="form-hint">{{ t('https.expiration_hint') }}</div>
                  </div>
                </div>
                <div class="form-row">
                  <label class="form-label" :title="t('https.secret_length_title')">{{ t('https.secret_length_label') }}</label>
                  <div style="flex:1;">
                    <input type="number" min="16" max="65535" class="form-control" v-model="config.api.graphql_authentication.secret_length" :placeholder="t('https.secret_length_placeholder')" :title="t('https.secret_length_title')" />
                    <div class="form-hint">{{ t('https.secret_length_hint') }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="form-group" style="margin-top:16px;">
            <div class="form-group-title">API Keys</div>
            <div class="form-group-content">
              <DataTable :columns="API_KEY_COLUMNS" :data="config.api.keys" row-key="id" :actions="['create', 'edit', 'delete']" @create="createKey" @edit="editKey" @delete="removeKey" />
            </div>
          </div>
        </template>

        <template #allow-client>
          <div class="form-row">
            <label class="form-label" :title="t('https.allow_client_title')">{{ t('https.allow_client_label') }}</label>
            <textarea class="form-control" v-model="config.allow_client" rows="5" :placeholder="t('https.allow_client_placeholder')" :title="t('https.allow_client_title')" />
          </div>
        </template>
      </TabGroup>
      <div class="toolbar" style="margin-top:16px;">
        <div class="toolbar-left">
          <ToolbarButton icon="save" primary @click="save" :disabled="saving || loading || writeDisabled">{{ saving ? t('https.saving') : t('https.confirm') }}</ToolbarButton>
        </div>
      </div>

      <DraggableModal v-model:visible="showKeyModal" :title="t('https.modal_api_key_title')" @confirm="saveKey" @close="showKeyModal = false">
        <div class="form-row"><label class="form-label">ID</label><input class="form-control" v-model="editingKey.id" :placeholder="t('https.api_key_id_placeholder')" title="API Key ID" /></div>
        <div class="form-row"><label class="form-label">Key</label><input class="form-control" v-model="editingKey.key" :placeholder="t('https.api_key_value_placeholder')" :title="t('https.api_key_value_title')" /></div>
      </DraggableModal>
    </div>
  `,
});
