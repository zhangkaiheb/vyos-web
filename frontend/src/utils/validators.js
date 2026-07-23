const IPv4_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
const IPv4_CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const IPv4_RANGE_RE = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;
const IPv6_RE = /^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
const MAC_RE = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;

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
  return validIPv4CIDR(ip) || validIPv4Range(ip) || validIP(ip);
}

function validPort(p) {
  const n = parseInt(p);
  return n >= 1 && n <= 65535;
}

function validMAC(mac) {
  return MAC_RE.test(mac);
}

export function validateField(value, rule) {
  if (rule.required && (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0))) {
    return '此项为必填项';
  }
  if (value === '' || value === undefined || value === null) return '';
  if (rule.type === 'ip' && !validIP(value)) return '请输入有效的IP地址';
  if (rule.type === 'ip-segment' && !validIPOrSegment(value)) return '请输入有效的IP地址、CIDR 或 IP 范围';
  if (rule.type === 'ipv4' && !validIPv4(value)) return '请输入有效的IPv4地址';
  if (rule.type === 'ipv4-cidr' && !validIPv4CIDR(value)) return '请输入有效的IPv4网段';
  if (rule.type === 'ipv4-range' && !validIPv4Range(value)) return '请输入有效的IPv4范围，如 192.168.1.1-192.168.1.100';
  if (rule.type === 'ipv6' && !validIPv6(value)) return '请输入有效的IPv6地址';
  if (rule.type === 'mac' && !validMAC(value)) return '请输入有效的MAC地址';
  if (rule.type === 'port' && !validPort(value)) return '端口号范围为1-65535';
  if (rule.min !== undefined && parseFloat(value) < rule.min) return `最小值为 ${rule.min}`;
  if (rule.max !== undefined && parseFloat(value) > rule.max) return `最大值为 ${rule.max}`;
  if (rule.pattern && !new RegExp(rule.pattern).test(String(value))) return rule.patternMessage || '格式不正确';
  return '';
}

export { validIPv4, validIPv4CIDR, validIPv4Range, validIPv6, validIP, validIPOrSegment, validPort, validMAC };
