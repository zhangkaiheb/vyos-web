import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const TLS_VERSION_OPTIONS = ['1.0', '1.1', '1.2', '1.3'];
const API_KEY_COLUMNS = [
  { key: 'id', title: 'ID' },
  { key: 'key', title: 'Key' },
];
const GRAPHQL_AUTH_TYPE_OPTIONS = [
  { key: 'key', label: 'API Keys（默认）' },
  { key: 'token', label: 'JWT Token' },
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

function validateApiKey(key) {
  if (!key || !String(key).trim()) return '请输入 API Key ID';
  if (!/^[a-zA-Z0-9_-]+$/.test(String(key))) return 'API Key ID 只能包含字母、数字、下划线和连字符';
  return '';
}

export default defineComponent({
  name: 'HttpsPage',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(httpsToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

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
      if (isNaN(port) || port < 1 || port > 65535) return alert('端口范围为 1-65535，默认 443');

      const listenAddresses = splitMembers(config.value.listen_address);
      for (const ip of listenAddresses) {
        const err = validateIP(ip);
        if (err) return alert(`监听地址 ${ip} 格式错误`);
      }

      const size = parseInt(config.value.request_body_size_limit, 10);
      if (isNaN(size) || size < 1) return alert('请求体大小限制必须为正整数，默认 1 MB');

      const allowClients = splitMembers(config.value.allow_client);
      for (const ip of allowClients) {
        const err = validateIP(ip);
        if (err) return alert(`允许客户端地址 ${ip} 格式错误`);
      }

      if (config.value.api.graphql_authentication.enabled) {
        const exp = parseInt(config.value.api.graphql_authentication.expiration, 10);
        if (isNaN(exp) || exp < 60 || exp > 31536000) return alert('GraphQL Token 过期时间范围为 60-31536000 秒，默认 3600');
        const secret = parseInt(config.value.api.graphql_authentication.secret_length, 10);
        if (isNaN(secret) || secret < 16 || secret > 65535) return alert('GraphQL Secret 长度范围为 16-65535 字节，默认 32');
      }

      const keyIds = new Set();
      for (const k of config.value.api.keys || []) {
        const err = validateApiKey(k.id);
        if (err) return alert(err);
        if (keyIds.has(k.id)) return alert(`API Key ID ${k.id} 重复`);
        keyIds.add(k.id);
      }

      saving.value = true;
      try {
        await configApi.set('service https', httpsToConfig(config.value));
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
      if (err) return alert(err);
      const list = config.value.api.keys || [];
      const duplicate = list.some((k, idx) => k.id === editingKey.value.id && idx !== editingKey.value._index);
      if (duplicate) return alert(`API Key ID ${editingKey.value.id} 已存在`);
      if (editingKey.value._index !== undefined) {
        list[editingKey.value._index] = { ...editingKey.value };
      } else {
        list.push({ ...editingKey.value });
      }
      delete list[editingKey.value._index !== undefined ? editingKey.value._index : list.length - 1]._index;
      config.value.api.keys = [...list];
      showKeyModal.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled, commandPath,
      showKeyModal, editingKey, API_KEY_COLUMNS,
      load, save, TLS_VERSION_OPTIONS, GRAPHQL_AUTH_TYPE_OPTIONS,
      createKey, editKey, removeKey, saveKey,
    };
  },
  components: { DataTable, DraggableModal, TabGroup, ToolbarButton },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本' },
        { key: 'certificates', title: '证书' },
        { key: 'api', title: 'API' },
        { key: 'allow-client', title: '允许客户端' }
      ]">

        <template #basic>
          <div class="form-row">
            <label class="form-label" title="HTTPS 监听端口，默认 443，范围 1-65535">端口</label>
            <div style="flex:1;">
              <input type="number" min="1" max="65535" class="form-control" v-model="config.port" placeholder="1-65535，默认 443" title="HTTPS 监听端口，默认 443，范围 1-65535" />
              <div class="form-hint">默认：443，范围：1-65535</div>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label" title="HTTPS 监听地址列表，每行一个 IPv4/IPv6 地址">监听地址</label>
            <textarea class="form-control" v-model="config.listen_address" rows="3" placeholder="每行一个 IPv4/IPv6 地址" title="HTTPS 监听地址列表" />
          </div>
          <div class="form-row">
            <label class="form-label" title="指定可用的 TLS 版本，默认 1.2 和 1.3">TLS 版本</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <label v-for="v in TLS_VERSION_OPTIONS" :key="v"><input type="checkbox" v-model="config.tls_version" :value="v" /> {{ v }}</label>
            </div>
            <div class="form-hint">默认：1.2, 1.3</div>
          </div>
          <div class="form-row"><label class="form-label" title="将 HTTP 请求重定向到 HTTPS">启用 HTTP 重定向</label><input type="checkbox" v-model="config.enable_http_redirect" title="将 HTTP 请求重定向到 HTTPS" /></div>
          <div class="form-row">
            <label class="form-label" title="最大请求体大小，单位 MB，默认 1">请求体大小限制 (MB)</label>
            <div style="flex:1;">
              <input type="number" min="1" class="form-control" v-model="config.request_body_size_limit" placeholder="默认 1" title="最大请求体大小，单位 MB，默认 1" />
              <div class="form-hint">默认：1 MB</div>
            </div>
          </div>
          <div class="form-row"><label class="form-label" title="绑定的 VRF 实例名称">VRF</label><input class="form-control" v-model="config.vrf" placeholder="VRF 名称" title="绑定的 VRF 实例名称" /></div>
        </template>

        <template #certificates>
          <div class="form-row"><label class="form-label" title="PKI 中的服务器证书名称">证书</label><input class="form-control" v-model="config.certificates.certificate" placeholder="PKI 证书名称" title="PKI 中的服务器证书名称" /></div>
          <div class="form-row"><label class="form-label" title="PKI 中的 CA 证书名称">CA 证书</label><input class="form-control" v-model="config.certificates.ca_certificate" placeholder="PKI CA 证书名称" title="PKI 中的 CA 证书名称" /></div>
          <div class="form-row"><label class="form-label" title="PKI 中的 Diffie-Hellman 参数名称">DH 参数</label><input class="form-control" v-model="config.certificates.dh_params" placeholder="PKI DH 参数名称" title="PKI 中的 Diffie-Hellman 参数名称" /></div>
        </template>

        <template #api>
          <div class="form-row"><label class="form-label" title="启用 API 严格路径检查">严格模式</label><input type="checkbox" v-model="config.api.strict" title="启用 API 严格路径检查" /></div>
          <div class="form-row"><label class="form-label" title="启用 API 调试输出">调试模式</label><input type="checkbox" v-model="config.api.debug" title="启用 API 调试输出" /></div>
          <div class="form-row">
            <label class="form-label" title="CORS 允许的 Origin 列表，每行一个">CORS 允许 Origin</label>
            <div style="flex:1;">
              <textarea class="form-control" v-model="config.api.cors_allow_origin" rows="3" placeholder="每行一个 Origin，例如 https://example.com" title="CORS 允许的 Origin 列表" />
              <div class="form-hint">对应命令：set service https api cors allow-origin &lt;origin&gt;</div>
            </div>
          </div>

          <div class="section-title" style="margin-top:16px;">GraphQL</div>
          <div class="form-row"><label class="form-label" title="启用 GraphQL 内省查询">GraphQL 内省</label><input type="checkbox" v-model="config.api.graphql_introspection" title="启用 GraphQL 内省查询" /></div>
          <div class="form-row"><label class="form-label" title="启用 GraphQL 认证">GraphQL 认证</label><input type="checkbox" v-model="config.api.graphql_authentication.enabled" title="启用 GraphQL 认证" /></div>
          <template v-if="config.api.graphql_authentication.enabled">
            <div class="form-row">
              <label class="form-label" title="认证类型，默认 key">认证类型</label>
              <select class="form-control" v-model="config.api.graphql_authentication.type" title="GraphQL 认证类型">
                <option v-for="opt in GRAPHQL_AUTH_TYPE_OPTIONS" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label" title="Token 过期时间，默认 3600 秒，范围 60-31536000">Token 过期时间 (秒)</label>
              <div style="flex:1;">
                <input type="number" min="60" max="31536000" class="form-control" v-model="config.api.graphql_authentication.expiration" placeholder="60-31536000，默认 3600" title="Token 过期时间，默认 3600 秒" />
                <div class="form-hint">默认：3600，范围：60-31536000</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label" title="共享密钥长度，默认 32 字节，范围 16-65535">Secret 长度 (字节)</label>
              <div style="flex:1;">
                <input type="number" min="16" max="65535" class="form-control" v-model="config.api.graphql_authentication.secret_length" placeholder="16-65535，默认 32" title="共享密钥长度，默认 32 字节" />
                <div class="form-hint">默认：32，范围：16-65535</div>
              </div>
            </div>
          </template>

          <div class="section-title" style="margin-top:16px;">API Keys</div>
          <DataTable :columns="API_KEY_COLUMNS" :data="config.api.keys" row-key="id" :actions="['create', 'edit', 'delete']" @create="createKey" @edit="editKey" @delete="removeKey" />
        </template>

        <template #allow-client>
          <div class="form-row">
            <label class="form-label" title="允许访问 HTTPS 服务的客户端 IPv4/IPv6 地址，每行一个">允许客户端地址</label>
            <textarea class="form-control" v-model="config.allow_client" rows="5" placeholder="每行一个 IPv4/IPv6 地址" title="允许访问 HTTPS 服务的客户端地址列表" />
          </div>
        </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showKeyModal" title="API Key" @confirm="saveKey" @close="showKeyModal = false">
        <div class="form-row"><label class="form-label">ID</label><input class="form-control" v-model="editingKey.id" :disabled="editingKey._id" placeholder="API Key ID" title="API Key ID" /></div>
        <div class="form-row"><label class="form-label">Key</label><input class="form-control" v-model="editingKey.key" placeholder="API Key 明文" title="API Key 明文" /></div>
      </DraggableModal>
    </div>
  `,
});
