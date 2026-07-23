const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('vyos_token') || '';
}

async function request(method, url, data = null, query = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let fullUrl = API_BASE + url;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) fullUrl += '?' + qs;
  }

  const options = { method, headers };
  if (data !== null) options.body = JSON.stringify(data);

  const res = await fetch(fullUrl, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.code = json.code || res.status;
    err.detail = json.detail || '';
    err.suggestion = json.suggestion || '';
    throw err;
  }
  return json;
}

export const api = {
  get: (url, query) => request('GET', url, null, query),
  post: (url, data) => request('POST', url, data),
  put: (url, data) => request('PUT', url, data),
  delete: (url, query) => request('DELETE', url, null, query),
};

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout', {}),
  user: () => api.get('/auth/user'),
};

export const configApi = {
  get: (path, session = false) => api.get('/config', { path, session: session ? '1' : '0' }),
  set: (path, value) => api.put('/config', { path, value }),
  delete: (path) => api.delete('/config', { path }),
  commit: () => api.post('/config/commit', {}),
  discard: () => api.post('/config/discard', {}),
  save: (password) => api.post('/config/save', { password }),
  load: (source, password) => api.post('/config/load', { source, password }),
  compare: (left, right) => api.post('/config/compare', { left, right }),
  commands: (path) => api.get('/config/commands', { path }),
  sessionChanged: () => api.get('/config/session-changed'),
  export: (password) => api.post('/config/export', { password }),
  import: (type, data, password = '') => api.post('/config/import', { type, data, password }),
  rollback: (revision) => api.post('/config/rollback', { revision }),
};

export const menuApi = {
  get: () => api.get('/menu'),
};

export const monitorApi = {
  get: (type, iface, duration) => api.get('/monitor', { type, interface: iface, duration }),
  history: (type, metric, duration, iface) => api.get('/monitor/history', { type, metric, duration, interface: iface }),
  interfaces: () => api.get('/system/interfaces'),
};

export const logApi = {
  get: (type, page, pageSize, filters = {}) => api.get('/logs', { type, page, page_size: pageSize, ...filters }),
};

export const userApi = {
  list: () => api.get('/users'),
  get: (username) => api.get(`/users/${username}`),
  create: (data) => api.post('/users', data),
  update: (username, data) => api.put(`/users/${username}`, data),
  delete: (username) => api.delete(`/users/${username}`),
  password: (username, password) => api.post(`/users/${username}/password`, { password }),
  preferences: (username, data) => api.put(`/users/${username}/preferences`, data),
};

export const aclApi = {
  list: () => api.get('/access-control'),
  create: (data) => api.post('/access-control', data),
  update: (id, data) => api.put(`/access-control/${id}`, data),
  delete: (id) => api.delete(`/access-control/${id}`),
};

export const systemApi = {
  info: () => api.get('/system/info'),
  ping: (host, count) => api.post('/system/ping', { host, count }),
  traceroute: (host) => api.post('/system/traceroute', { host }),
  mtr: (host, count, report) => api.post('/system/mtr', { host, count, report }),
  tcpdump: (iface, count, options) => api.post('/system/tcpdump', { interface: iface, count, options }),
  reboot: () => api.post('/system/reboot', {}),
  poweroff: () => api.post('/system/poweroff', {}),
  reset: () => api.post('/system/reset', {}),
  date: (value) => api.post('/system/date', { value }),
  terminal: (settings) => api.post('/system/terminal', settings),
  shell: (command) => api.post('/system/shell', { command }),
};

export const firewallApi = {
  protocols: () => api.get('/firewall/protocols'),
  ruleStats: (path) => api.get('/firewall/rule-stats', { path }),
  clearCounters: (path) => api.post('/firewall/clear-counters', { path }),
  importRules: (path, rows) => api.post('/firewall/import', { path, rows }),
  exportRules: (path, format) => api.get('/firewall/export', { path, format }),
  references: (path) => api.get('/firewall/references', { path }),
  moveRule: (path, from, to) => api.post('/firewall/move-rule', { path, from, to }),
  copyRule: (path, from, to) => api.post('/firewall/copy-rule', { path, from, to }),
};

export const opModeApi = {
  execute: (command) => api.post('/op-mode', { command }),
  show: (command) => api.get('/op-mode/show', { command }),
  clear: (command) => api.post('/op-mode/clear', { command }),
  restart: (command) => api.post('/op-mode/restart', { command }),
  update: (command) => api.post('/op-mode/update', { command }),
  generate: (command, params) => api.post('/op-mode/generate', { command, ...params }),
};

export const webappApi = {
  version: () => api.get('/webapp/version'),
  checkUpdate: () => api.post('/webapp/check-update', {}),
  update: (source) => api.post('/webapp/update', { source }),
  rollback: () => api.post('/webapp/rollback', {}),
  history: () => api.get('/webapp/history'),
};

export const imageApi = {
  list: () => api.get('/system/images'),
  add: (source) => api.post('/system/image/add', { source }),
  delete: (name) => api.post('/system/image/delete', { name }),
  setDefault: (name) => api.post('/system/image/default', { name }),
};

export const interfaceApi = {
  ethernet: () => api.get('/interfaces/ethernet'),
};

export const quotasApi = {
  get: () => api.get('/quotas'),
  set: (data) => api.put(`/quotas/${data.type}`, data),
};

export const conntrackLogApi = {
  get: () => api.get('/conntrack-log-config'),
  set: (data) => api.post('/conntrack-log-config', data),
};
