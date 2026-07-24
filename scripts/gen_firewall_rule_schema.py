#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate firewall rule form schema from VyOS node.def templates."""

import json
import os
import re

BASE = '/opt/vyatta/share/vyatta-cfg/templates/firewall/ipv4/forward/filter/rule/node.tag'
OUT = '/opt/vyos-web-config/frontend/src/data/firewallRuleSchema.js'


def parse_node_def(path):
    props = {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception:
        return props
    for line in lines:
        line = line.rstrip('\n')
        if line.startswith('type:'):
            props['type'] = line.split(':', 1)[1].strip()
        elif line.startswith('multi:'):
            props['multi'] = True
        elif line.startswith('help:'):
            props['help'] = line.split(':', 1)[1].strip()
        elif line.startswith('val_help:'):
            rest = line.split(':', 1)[1].strip()
            m = re.match(r'(.+?)\s*;\s*(.*)', rest)
            if m:
                props.setdefault('val_help', []).append(
                    {'value': m.group(1).strip(), 'desc': m.group(2).strip()})
        elif line.startswith('allowed:'):
            props['allowed_raw'] = line.split(':', 1)[1].strip()
        elif 'syntax:expression:' in line:
            props['syntax'] = line
            m = re.search(r"--regex\s+['\"](.+?)['\"]", line)
            if m:
                props['regex'] = m.group(1)
    return props


def parse_allowed(raw):
    options = []
    if not raw:
        return options
    tokens = re.findall(r'echo\s+["\']([^"\']+)["\']', raw)
    for t in tokens:
        if t.strip() in ('', ' '):
            continue
        for opt in t.split():
            if opt:
                options.append(opt)
    return options


def val_help_options(help_items):
    """Extract option values from val_help entries (e.g. 'ftp; ...')."""
    # Generic type placeholders that should not be treated as enum options
    TYPE_NAMES = {
        'txt', 'ipv4', 'ipv4net', 'ipv4range', 'ipv6', 'ipv6net', 'ipv6range',
        'macaddr', 'mac', 'number', 'u32', 'bool',
    }
    opts = []
    for item in help_items or []:
        val = item.get('value', '').strip()
        if not val:
            continue
        # Skip template placeholders like '<start-end>', '<number>s', 'u32:1-65535'
        if val.startswith('<') or val.endswith('>') or 'u32:' in val or ';' in val:
            continue
        # Strip optional leading '!' for exclusion variants
        bare = val[1:] if val.startswith('!') else val
        if bare.lower() in TYPE_NAMES:
            continue
        # Only include values that look like real enum identifiers
        if re.match(r'^[a-zA-Z0-9_*-]+$', val):
            opts.append(val)
    return opts


def detect_validator_type(node_def):
    """Map VyOS exec validators to frontend validation types."""
    syntax = node_def.get('syntax', '')
    val_help = node_def.get('val_help', [])
    # Direct validator references in syntax:expression
    if re.search(r'ipv4-address-exclude|ipv4-address', syntax):
        has_range = any('range' in (v.get('value', '') or '') for v in val_help)
        has_prefix = any('prefix' in (v.get('value', '') or '') for v in val_help)
        if has_range or has_prefix:
            return 'ip-segment'
        return 'ipv4'
    if re.search(r'ipv6-address-exclude|ipv6-address', syntax):
        has_range = any('range' in (v.get('value', '') or '') for v in val_help)
        has_prefix = any('prefix' in (v.get('value', '') or '') for v in val_help)
        if has_range or has_prefix:
            return 'ip-segment'
        return 'ipv6'
    if re.search(r'mac-address', syntax):
        return 'mac'
    if re.search(r'port-multi|numeric-range', syntax):
        return 'port'
    if re.search(r'numeric-range', syntax):
        return 'number'
    # Infer from val_help
    values = [v.get('value', '') for v in val_help]
    if any('ipv4' in v for v in values):
        if any('range' in v for v in values) or any('prefix' in v for v in values):
            return 'ip-segment'
        return 'ipv4'
    if any('ipv6' in v for v in values):
        if any('range' in v for v in values) or any('prefix' in v for v in values):
            return 'ip-segment'
        return 'ipv6'
    if any('mac' in v for v in values):
        return 'mac'
    return None


def u32_range(help_items):
    for item in help_items:
        val = item.get('value', '')
        m = re.search(r'u32:(\d+)-(\d+)', val)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None, None


def build_schema(dir_path, path_prefix=None):
    if path_prefix is None:
        path_prefix = []
    entries = []
    try:
        items = sorted(os.listdir(dir_path))
    except Exception:
        return entries

    for name in items:
        full = os.path.join(dir_path, name)
        if name == 'node.def':
            continue
        if name == 'node.tag':
            child_entries = build_schema(full, path_prefix)
            entries.extend(child_entries)
            continue
        if not os.path.isdir(full):
            continue

        node_def = parse_node_def(os.path.join(full, 'node.def'))
        children = build_schema(full, path_prefix + [name])
        entry = {
            'key': name,
            'title': name.replace('-', ' ').title(),
        }
        if node_def.get('help'):
            entry['help'] = node_def['help']

        if children:
            entry['type'] = 'group'
            entry['children'] = children
        else:
            raw_allowed = node_def.get('allowed_raw', '')
            opts = parse_allowed(raw_allowed)
            is_dynamic = (
                'cli-shell-api' in raw_allowed or
                re.search(r'\$\{[^}]+\}', raw_allowed) is not None or
                'sh -c' in raw_allowed
            )
            only_u32 = (
                node_def.get('type') == 'u32' or
                (node_def.get('type') == 'txt' and
                 all(re.search(r'u32:\d+-\d+', v.get('value', '')) for v in node_def.get('val_help', [])) and
                 node_def.get('val_help'))
            )

            # Merge static allowed options with val_help examples (e.g. rtsp)
            vh_opts = val_help_options(node_def.get('val_help', []))
            all_opts = list(dict.fromkeys(opts + [o for o in vh_opts if o not in opts]))

            if node_def.get('multi'):
                if all_opts and not is_dynamic:
                    entry['type'] = 'multi-select'
                    entry['options'] = all_opts
                else:
                    entry['type'] = 'textarea'
                    entry['placeholder'] = '每行一个值'
                    entry['multi'] = True
                    if is_dynamic:
                        entry['dynamic'] = True
            elif all_opts and not is_dynamic:
                entry['type'] = 'select'
                entry['options'] = all_opts
            elif is_dynamic:
                entry['type'] = 'text'
                entry['dynamic'] = True
                if all_opts:
                    entry['suggestions'] = all_opts
            elif only_u32:
                entry['type'] = 'number'
                mn, mx = u32_range(node_def.get('val_help', []))
                if mn is not None:
                    entry['min'] = mn
                    entry['max'] = mx
            elif node_def.get('type') == 'txt':
                entry['type'] = 'text'
            else:
                # valueless or unknown
                entry['type'] = 'checkbox'
                entry['valueless'] = True

            # Attach validation type from VyOS validators
            validate_type = detect_validator_type(node_def)
            if validate_type:
                entry['validate'] = validate_type

            if 'regex' in node_def:
                entry['regex'] = node_def['regex']
                entry['pattern'] = node_def['regex']
                entry['patternMessage'] = '格式不符合 VyOS 要求'

        entries.append(entry)
    return entries


def clean_schema(entries):
    """Post-process to add Chinese titles and mark advanced groups."""
    title_map = {
        'action': '动作',
        'add-address-to-group': '动态地址组',
        'connection-mark': '连接标记',
        'connection-status': '连接状态',
        'conntrack-helper': '连接跟踪助手',
        'description': '描述',
        'destination': '目的',
        'destination-address': '目的地址',
        'disable': '禁用',
        'dscp': 'DSCP',
        'dscp-exclude': 'DSCP 排除',
        'fragment': '分片',
        'geoip': 'GeoIP',
        'group': '组',
        'icmp': 'ICMP',
        'inbound-interface': '入接口',
        'inverse-match': '反向匹配',
        'ipsec': 'IPsec',
        'jump-target': '跳转目标',
        'nat': 'NAT',
        'match-frag': '匹配分片',
        'match-non-frag': '匹配非分片',
        'limit': '限速',
        'log': '日志',
        'log-options': '日志选项',
        'mac-address': 'MAC 地址',
        'mark': '防火墙标记',
        'offload-target': '卸载目标',
        'outbound-interface': '出接口',
        'packet-length': '包长度',
        'packet-length-exclude': '包长度排除',
        'packet-type': '包类型',
        'protocol': '协议',
        'queue': '队列',
        'queue-options': '队列选项',
        'recent': '近期匹配',
        'source': '源',
        'source-address': '源地址',
        'state': '连接状态',
        'synproxy': 'SYN 代理',
        'tcp': 'TCP 选项',
        'time': '时间',
        'ttl': 'TTL',
        'address': '地址',
        'address-mask': '地址掩码',
        'fqdn': 'FQDN',
        'country-code': '国家代码',
        'port': '端口',
        'address-group': '地址组',
        'network-group': '网络组',
        'port-group': '端口组',
        'domain-group': '域名组',
        'mac-group': 'MAC 组',
        'dynamic-address-group': '动态地址组',
        'name': '名称',
        'flags': '标志',
        'mss': 'MSS',
        'window-scale': '窗口缩放',
        'count': '计数',
        'startdate': '开始日期',
        'starttime': '开始时间',
        'stopdate': '结束日期',
        'stoptime': '结束时间',
        'weekdays': '工作日',
        'eq': '等于',
        'gt': '大于',
        'lt': '小于',
        'burst': '突发',
        'rate': '速率',
        'type-name': '类型名称',
        'match-ipsec': '匹配 IPsec',
        'match-none': '匹配非 IPsec',
        'level': '级别',
        'group_name': '日志组',
        'queue-threshold': '队列阈值',
        'snapshot-length': '快照长度',
        'timeout': '超时',
    }

    advanced_keys = {
        'add-address-to-group', 'connection-mark', 'connection-status',
        'conntrack-helper', 'dscp', 'dscp-exclude', 'fragment', 'icmp',
        'ipsec', 'jump-target', 'limit', 'log-options', 'mark',
        'offload-target', 'packet-length', 'packet-length-exclude',
        'packet-type', 'queue', 'queue-options', 'recent', 'state',
        'synproxy', 'tcp', 'time', 'ttl',
    }

    def walk(items):
        for e in items:
            if e['key'] in title_map:
                e['title'] = title_map[e['key']]
            if e.get('type') == 'group':
                if e['key'] in advanced_keys:
                    e['advanced'] = True
                walk(e.get('children', []))
            elif e['key'] in advanced_keys:
                e['advanced'] = True
    walk(entries)
    return entries


def main():
    schema = build_schema(BASE)
    schema = clean_schema(schema)
    js = 'export const FIREWALL_RULE_SCHEMA = ' + json.dumps(schema, ensure_ascii=False, indent=2) + ';\n'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f'Generated {OUT} with {len(schema)} top-level fields')


if __name__ == '__main__':
    main()
