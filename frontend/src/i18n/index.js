import { ref, computed } from '/src/utils/vue-import.js';

const MODULES = ['common', 'firewall', 'interfaces', 'system', 'monitor', 'logs', 'user'];
const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ru', 'de', 'fr', 'ko'];

const localeNames = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
  'ru': 'Русский',
  'de': 'Deutsch',
  'fr': 'Français',
  'ko': '한국어',
};

const defaultMessages = {
  'zh-CN': {
    app: { title: 'VyOS', login: '登录', logout: '注销', submit: '提交', cancel: '取消', save: '保存', delete: '删除', edit: '编辑', create: '创建', move: '移动', moveUp: '上移', moveDown: '下移', copy: '复制', refresh: '刷新', search: '搜索', columnSetting: '列设定', filter: '筛选', advanced: '高级选项', commands: '命令行', close: '关闭', confirm: '确定', loading: '加载中', actions: '操作' },
    login: { username: '用户名', password: '密码', remember: '记住我', language: '语言' },
    menu: { monitor: '监控', logs: '日志', firewall: '防火墙', interfaces: '网络接口', nat: '网络地址转换', policy: '路由策略与协议', qos: '服务质量', service: '系统服务', system: '系统参数', vpn: '虚拟专用网络', 'load-balancing': '负载均衡' },
    table: { total: '共 {total} 条', page: '第 {page}/{pages} 页', itemsPerPage: '每页条数', noData: '暂无数据' },
    config: { commit: '提交配置', discard: '丢弃变更', save: '保存配置', load: '加载配置', compare: '对比配置', rollback: '回滚配置', import: '导入', export: '导出', commands: '对应命令行', copy: '复制' },
    errors: { required: '此项为必填项', invalid_ipv4: '请输入有效的IPv4地址', invalid_ipv6: '请输入有效的IPv6地址', invalid_mac: '请输入有效的MAC地址', invalid_port: '端口号范围为1-65535' },
    msg: { saved: '保存成功', deleted: '删除成功', confirmDelete: '确认删除选中的项？', noSelection: '请选择一行' },
  },
  'en': {
    app: { title: 'VyOS', login: 'Login', logout: 'Logout', submit: 'Submit', cancel: 'Cancel', save: 'Save', delete: 'Delete', edit: 'Edit', create: 'Create', move: 'Move', moveUp: 'Move Up', moveDown: 'Move Down', copy: 'Copy', refresh: 'Refresh', search: 'Search', columnSetting: 'Column Setting', filter: 'Filter', advanced: 'Advanced Options', commands: 'CLI Commands', close: 'Close', confirm: 'Confirm', loading: 'Loading', actions: 'Actions' },
    login: { username: 'Username', password: 'Password', remember: 'Remember me', language: 'Language' },
    menu: { monitor: 'Monitor', logs: 'Logs', firewall: 'Firewall', interfaces: 'Interfaces', nat: 'NAT', policy: 'Policy & Protocols', qos: 'QoS', service: 'Services', system: 'System', vpn: 'VPN', 'load-balancing': 'Load Balancing' },
    table: { total: 'Total {total}', page: 'Page {page}/{pages}', itemsPerPage: 'Items per page', noData: 'No data' },
    config: { commit: 'Commit', discard: 'Discard', save: 'Save Config', load: 'Load Config', compare: 'Compare', rollback: 'Rollback', import: 'Import', export: 'Export', commands: 'CLI Commands', copy: 'Copy' },
    errors: { required: 'This field is required', invalid_ipv4: 'Invalid IPv4 address', invalid_ipv6: 'Invalid IPv6 address', invalid_mac: 'Invalid MAC address', invalid_port: 'Port range is 1-65535' },
    msg: { saved: 'Saved successfully', deleted: 'Deleted successfully', confirmDelete: 'Confirm delete selected items?', noSelection: 'Please select a row' },
  },
};

const loadedMessages = {};
for (const loc of LOCALES) {
  loadedMessages[loc] = JSON.parse(JSON.stringify(defaultMessages[loc] || defaultMessages['en']));
}

const locale = ref(localStorage.getItem('locale') || 'zh-CN');
const loadState = ref({ loading: false, error: '' });

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export async function loadLocales() {
  loadState.value.loading = true;
  loadState.value.error = '';
  try {
    const results = await Promise.all(MODULES.map(async (module) => {
      try {
        const res = await fetch(`/src/i18n/locales/${module}.json`);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    }));
    for (const data of results) {
      if (!data) continue;
      for (const loc of LOCALES) {
        if (data[loc]) {
          loadedMessages[loc] = loadedMessages[loc] || {};
          deepMerge(loadedMessages[loc], data[loc]);
        }
      }
    }
  } catch (e) {
    loadState.value.error = e.message;
  } finally {
    loadState.value.loading = false;
  }
}

const message = computed(() => loadedMessages[locale.value] || loadedMessages['en'] || loadedMessages['zh-CN']);

function t(key, params = {}) {
  const keys = key.split('.');
  let value = message.value;
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export function createI18n() {
  return {
    install(app) {
      app.config.globalProperties.$i18n = { locale, t, locales: LOCALES, localeNames, loadState };
      app.config.globalProperties.$t = t;
      app.provide('i18n', { locale, t, locales: LOCALES, localeNames, loadState });
    },
  };
}

export { locale, t, LOCALES, localeNames, loadState };
