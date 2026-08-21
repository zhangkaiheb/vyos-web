/**
 * DHCPv6 公共模块 - 所有页面统一使用 VirtualEthernet 格式
 *
 * 统一规范：
 * - 配置键名：下划线格式（no_release, no_request_dns 等）
 * - 布尔值：true（非空字符串）
 * - PD 字段：dhcpv6_pd_instances（JSON 格式）
 */

// ==================== Schema ====================

/**
 * 生成 DHCPv6 基础 schema（7 个通用字段）
 * @param {string} prefix - i18n 键前缀，如 'ethernet.dhcpv6' 或 'interface.bonding.dhcpv6'
 * @param {function} t - i18n 翻译函数
 * @param {object} options - 可选配置
 * @param {boolean} options.withPd - 是否包含 PD 字段
 * @param {string} options.pdKey - PD 字段 key（默认 'dhcpv6_pd_instances'）
 * @param {string} options.pdTitle - PD 字段标题 i18n key
 * @param {string} options.pdPlaceholder - PD placeholder i18n key
 * @param {string} options.pdHelp - PD help i18n key
 * @returns {Array} schema 字段数组
 */
export function buildDhcpv6BaseSchema(prefix, t, options = {}) {
  const {
    withPd = false,
    pdKey = 'dhcpv6_pd_instances',
    pdTitle,
    pdPlaceholder,
    pdHelp,
  } = options;

  const schema = [
    { key: 'dhcpv6_duid', title: t(`${prefix}.duid`), type: 'text', placeholder: t(`${prefix}.duid_placeholder`), help: t(`${prefix}.duid_help`) },
    { key: 'dhcpv6_no_release', title: t(`${prefix}.no_release`), type: 'checkbox', help: t(`${prefix}.no_release_help`) },
    { key: 'dhcpv6_no_request_dns', title: t(`${prefix}.no_request_dns`), type: 'checkbox', help: t(`${prefix}.no_request_dns_help`) },
    { key: 'dhcpv6_no_request_domain_name', title: t(`${prefix}.no_request_domain_name`), type: 'checkbox', help: t(`${prefix}.no_request_domain_name_help`) },
    { key: 'dhcpv6_parameters_only', title: t(`${prefix}.parameters_only`), type: 'checkbox', help: t(`${prefix}.parameters_only_help`) },
    { key: 'dhcpv6_rapid_commit', title: t(`${prefix}.rapid_commit`), type: 'checkbox', help: t(`${prefix}.rapid_commit_help`) },
    { key: 'dhcpv6_temporary', title: t(`${prefix}.temporary`), type: 'checkbox', help: t(`${prefix}.temporary_help`) }
  ];

  if (withPd && pdTitle) {
    schema.push({
      key: pdKey,
      title: t(pdTitle),
      type: 'textarea',
      placeholder: t(pdPlaceholder || `${prefix}.pd_instances_placeholder`),
      help: t(pdHelp || `${prefix}.pd_instances_help`),
    });
  }

  return schema;
}

// ==================== configToForm ====================

/**
 * 从配置对象读取 DHCPv6 字段到表单（统一使用下划线键名）
 * @param {object} dhcpv6Cfg - 配置中的 dhcpv6-options 对象
 * @returns {object} 表单字段值
 */
export function dhcpv6ConfigToForm(dhcpv6Cfg) {
  if (!dhcpv6Cfg) {
    return {
      dhcpv6_duid: '',
      dhcpv6_no_release: false,
      dhcpv6_no_request_dns: false,
      dhcpv6_no_request_domain_name: false,
      dhcpv6_parameters_only: false,
      dhcpv6_rapid_commit: false,
      dhcpv6_temporary: false,
    };
  }

  // 统一使用下划线键名
  return {
    dhcpv6_duid: dhcpv6Cfg.duid || '',
    dhcpv6_no_release: !!dhcpv6Cfg.no_release,
    dhcpv6_no_request_dns: !!dhcpv6Cfg.no_request_dns,
    dhcpv6_no_request_domain_name: !!dhcpv6Cfg.no_request_domain_name,
    dhcpv6_parameters_only: !!dhcpv6Cfg.parameters_only,
    dhcpv6_rapid_commit: !!dhcpv6Cfg.rapid_commit,
    dhcpv6_temporary: !!dhcpv6Cfg.temporary,
  };
}

// ==================== formToConfig ====================

/**
 * 将表单 DHCPv6 字段写入配置对象（统一使用下划线键名 + true 布尔值）
 * @param {object} form - 表单数据
 * @returns {object|null} dhcpv6-options 配置对象，无字段时返回 null
 */
export function dhcpv6FormToConfig(form) {
  const dhcpv6 = {};
  if (form.dhcpv6_duid) dhcpv6.duid = form.dhcpv6_duid;
  if (form.dhcpv6_no_release) dhcpv6.no_release = true;
  if (form.dhcpv6_no_request_dns) dhcpv6.no_request_dns = true;
  if (form.dhcpv6_no_request_domain_name) dhcpv6.no_request_domain_name = true;
  if (form.dhcpv6_parameters_only) dhcpv6.parameters_only = true;
  if (form.dhcpv6_rapid_commit) dhcpv6.rapid_commit = true;
  if (form.dhcpv6_temporary) dhcpv6.temporary = true;

  return Object.keys(dhcpv6).length ? dhcpv6 : null;
}

// ==================== commandText ====================

/**
 * 生成 DHCPv6 set 命令文本
 * @param {object} data - 表单/配置数据对象
 * @param {string} interfaceType - 接口类型
 * @param {string} name - 接口名称
 * @returns {string[]} 命令数组
 */
export function dhcpv6ToCommands(data, interfaceType, name) {
  const basePath = `set interfaces ${interfaceType} ${name} dhcpv6-options`;
  const lines = [];

  if (data.dhcpv6_duid) lines.push(`${basePath} duid ${data.dhcpv6_duid}`);
  if (data.dhcpv6_no_release) lines.push(`${basePath} no-release`);
  if (data.dhcpv6_no_request_dns) lines.push(`${basePath} no-request-dns`);
  if (data.dhcpv6_no_request_domain_name) lines.push(`${basePath} no-request-domain-name`);
  if (data.dhcpv6_parameters_only) lines.push(`${basePath} parameters-only`);
  if (data.dhcpv6_rapid_commit) lines.push(`${basePath} rapid-commit`);
  if (data.dhcpv6_temporary) lines.push(`${basePath} temporary`);

  return lines;
}

// ==================== Default Values ====================

/**
 * DHCPv6 表单默认值
 */
export const DHCPV6_DEFAULTS = {
  dhcpv6_duid: '',
  dhcpv6_no_release: false,
  dhcpv6_no_request_dns: false,
  dhcpv6_no_request_domain_name: false,
  dhcpv6_parameters_only: false,
  dhcpv6_rapid_commit: false,
  dhcpv6_temporary: false,
};
