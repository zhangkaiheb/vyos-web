const IPv4_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
const IPv4_CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const IPv4_RANGE_RE = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;
const IPv6_RE = /^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
const MAC_RE = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
const NUMBER_RANGE_RE = /^(\d+)(-(\d+))?$/;
const NUMBER_EXCLUDE_RANGE_RE = /^!?(\d+)(-(\d+))?$/;
const RATE_LIMIT_RE = /^\d+\/(second|minute|hour|day)$/;

function validIPv4(ip) {
  if (!IPv4_RE.test(ip)) return false;
  return ip.split('/')[0].split('.').every(n => parseInt(n) <= 255);
}

function validIPv4CIDR(cidr) {
  if (!IPv4_CIDR_RE.test(cidr)) return false;
  const [ip, mask] = cidr.split('/');
  return validIPv4(ip) && parseInt(mask) <= 32;
}

function validIPv4Range(range) {
  if (!IPv4_RANGE_RE.test(range)) return false;
  const [start, end] = range.split('-');
  if (!validIPv4(start) || !validIPv4(end)) return false;
  const startParts = start.split('.').map(n => parseInt(n));
  const endParts = end.split('.').map(n => parseInt(n));
  for (let i = 0; i < 4; i++) {
    if (startParts[i] > endParts[i]) return false;
    if (startParts[i] < endParts[i]) return true;
  }
  return true;
}

function validIPv6(ip) {
  return IPv6_RE.test(ip);
}

function validIP(ip) {
  return validIPv4(ip) || validIPv6(ip);
}

function validIPOrSegment(ip) {
  const val = ip.startsWith('!') ? ip.slice(1) : ip;
  return validIPv4CIDR(val) || validIPv4Range(val) || validIP(val);
}

function validPort(p) {
  const n = parseInt(p);
  return n >= 1 && n <= 65535;
}

function validPortMulti(value) {
  if (!value) return false;
  const items = String(value).split(',').map(s => s.trim()).filter(Boolean);
  if (!items.length) return false;
  for (const item of items) {
    if (item.includes('-')) {
      const [start, end] = item.split('-').map(s => parseInt(s.trim()));
      if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) return false;
    } else if (!isNaN(parseInt(item))) {
      if (!validPort(item)) return false;
    }
    // Named ports from /etc/services are also valid but not verified here
  }
  return true;
}

function validMAC(mac) {
  return MAC_RE.test(mac);
}

function validMACExclude(mac) {
  const val = mac.startsWith('!') ? mac.slice(1) : mac;
  return MAC_RE.test(val);
}

function validNumberRange(value, min, max) {
  const m = String(value).match(NUMBER_RANGE_RE);
  if (!m) return false;
  const start = parseInt(m[1], 10);
  const end = m[3] ? parseInt(m[3], 10) : start;
  if (end < start) return false;
  if (min !== undefined && start < min) return false;
  if (max !== undefined && end > max) return false;
  return true;
}

function validNumberExcludeRange(value, min, max) {
  const val = String(value).startsWith('!') ? String(value).slice(1) : String(value);
  return validNumberRange(val, min, max);
}

function validRateLimit(value) {
  return RATE_LIMIT_RE.test(String(value));
}

function _validateSingle(value, rule) {
  const type = rule.validate || rule.type;
  if (type === 'ip' && !validIP(value)) return { key: 'errors.invalid_ip' };
  if (type === 'ip-segment' && !validIPOrSegment(value)) return { key: 'errors.invalid_ip_segment' };
  if (type === 'ipv4' && !validIPv4(value)) return { key: 'errors.invalid_ipv4' };
  if (type === 'ipv4-cidr' && !validIPv4CIDR(value)) return { key: 'errors.invalid_ipv4_cidr' };
  if (type === 'ipv4-range' && !validIPv4Range(value)) return { key: 'errors.invalid_ipv4_range' };
  if (type === 'ipv6' && !validIPv6(value)) return { key: 'errors.invalid_ipv6' };
  if (type === 'mac' && !validMAC(value)) return { key: 'errors.invalid_mac' };
  if (type === 'mac-exclude' && !validMACExclude(value)) return { key: 'errors.invalid_mac_exclude' };
  if (type === 'port' && !validPortMulti(value)) return { key: 'errors.invalid_port' };
  if (type === 'port-single' && !validPort(value)) return { key: 'errors.invalid_port_single' };
  if (type === 'number-range' && !validNumberRange(value, rule.min, rule.max)) {
    const rangeText = rule.min !== undefined && rule.max !== undefined ? ` (${rule.min}-${rule.max})` : '';
    return { key: 'errors.invalid_number_range', params: { range: rangeText } };
  }
  if (type === 'number-exclude-range' && !validNumberExcludeRange(value, rule.min, rule.max)) {
    const rangeText = rule.min !== undefined && rule.max !== undefined ? ` (${rule.min}-${rule.max})` : '';
    return { key: 'errors.invalid_number_exclude_range', params: { range: rangeText } };
  }
  if (type === 'rate-limit' && !validRateLimit(value)) return { key: 'errors.invalid_rate_limit' };
  if (rule.min !== undefined && parseFloat(value) < rule.min) return { key: 'errors.min_value', params: { min: rule.min } };
  if (rule.max !== undefined && parseFloat(value) > rule.max) return { key: 'errors.max_value', params: { max: rule.max } };
  if (rule.pattern && !new RegExp(rule.pattern).test(String(value))) return { key: 'errors.invalid_format' };
  return '';
}

export function validateField(value, rule) {
  if (rule.required && (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0))) {
    return { key: 'errors.required' };
  }
  if (value === '' || value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    const errors = value.map(v => _validateSingle(String(v), rule)).filter(Boolean);
    return errors.length ? { key: 'errors._array', items: errors } : '';
  }
  return _validateSingle(String(value), rule);
}

export { validIPv4, validIPv4CIDR, validIPv4Range, validIPv6, validIP, validIPOrSegment, validPort, validMAC, validMACExclude, validNumberRange, validNumberExcludeRange, validRateLimit };
