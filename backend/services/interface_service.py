#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interface service: retrieve and parse Ethernet interface details from VyOS.
"""

import json
import re
import subprocess
import traceback

import vyos.config


def _run_op_mode_interfaces(intf_type='ethernet', intf_name=''):
    """Call VyOS op_mode interfaces.show and return raw list of dicts."""
    cmd = [
        'python3', '-c',
        "import sys, json; sys.path.insert(0, '/usr/libexec/vyos/op_mode'); "
        "import interfaces; "
        f"print(json.dumps(interfaces.show(intf_type='{intf_type}', intf_name='{intf_name}', "
        f"vif=False, vrrp=False, raw=True)))"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
    except Exception:
        traceback.print_exc()
    return []


def _parse_ethtool_speed(ifname):
    """Return link speed string from ethtool (e.g. '1000Mb/s') or ''."""
    try:
        result = subprocess.run(['ethtool', ifname], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            m = re.search(r'Speed:\s*(\S+)', result.stdout)
            if m:
                return m.group(1)
    except Exception:
        pass
    return ''


def _get_interface_config(path):
    """Return VyOS config dict at path (effective)."""
    try:
        cfg = vyos.config.Config()
        return cfg.get_config_dict(path, effective=True, get_first_key=True)
    except Exception:
        return {}


def _get_session_interface_config(path):
    """Return VyOS session (proposed) config dict at path."""
    try:
        cfg = vyos.config.Config()
        return cfg.get_config_dict(path, effective=False, get_first_key=True)
    except Exception:
        return {}


def _get_deleted_ethernet_interfaces():
    """Parse session config to find deleted ethernet interfaces.
    
    Returns a set of interface names that have been deleted in the current session.
    """
    deleted = set()
    try:
        import vyos.configsession
        import os
        session_id = str(os.getpid())
        session = vyos.configsession.ConfigSession(session_id, app='vyos-web-config')
        raw = session.show_config([], format='raw') or ''
        for line in raw.split('\n'):
            line = line.strip()
            # Match: delete interfaces ethernet <name>
            if line.startswith('delete interfaces ethernet '):
                parts = line.split()
                if len(parts) >= 4:
                    deleted.add(parts[3])
    except Exception:
        pass
    return deleted


def _format_addresses(addr_info):
    """Format addr_info entries into ipv4/ipv6 address strings."""
    ipv4 = []
    ipv6 = []
    for entry in addr_info or []:
        family = entry.get('family')
        local = entry.get('local')
        prefix = entry.get('prefixlen')
        if not local:
            continue
        text = f"{local}/{prefix}" if prefix is not None else local
        if family == 'inet':
            ipv4.append(text)
        elif family == 'inet6':
            ipv6.append(text)
    return ', '.join(ipv4), ', '.join(ipv6)


def _detect_address_mode(iface_config):
    """Detect address mode from config: dhcp, dhcpv6, static or combinations."""
    addresses = iface_config.get('address', [])
    if not isinstance(addresses, list):
        addresses = [addresses] if addresses else []

    has_dhcp = 'dhcp' in addresses
    has_dhcpv6 = 'dhcpv6' in addresses
    has_static = any(a not in ('dhcp', 'dhcpv6') for a in addresses)

    modes = []
    if has_dhcp:
        modes.append('dhcp')
    if has_dhcpv6:
        modes.append('dhcpv6')
    if has_static:
        modes.append('static')

    return ','.join(modes) if modes else ''


def _collect_vifs(iface_config):
    """Return comma-separated VLAN IDs for vif and vif-s."""
    vif = sorted(str(k) for k in iface_config.get('vif', {}).keys())
    vif_s = sorted(str(k) for k in iface_config.get('vif-s', {}).keys())
    return ', '.join(vif), ', '.join(vif_s)


def _detect_interface_type(ifname):
    """Classify interface as ethernet, vlan or qinq based on name."""
    dot_count = ifname.count('.')
    if dot_count == 0:
        return '以太网'
    if dot_count == 1:
        return 'VLAN'
    return 'QinQ'


class InterfaceService:
    """Service for retrieving and parsing network interface details."""

    def get_ethernet_interfaces(self):
        """Return enriched Ethernet interface list for the web table."""
        try:
            op_data = _run_op_mode_interfaces('ethernet')
            cfg_data = _get_interface_config(['interfaces', 'ethernet'])
            deleted_ifaces = _get_deleted_ethernet_interfaces()

            rows = []
            for item in op_data:
                name = item.get('ifname', '')
                if not name:
                    continue

                # Skip interfaces deleted in current session
                if name in deleted_ifaces:
                    continue

                iface_cfg = cfg_data.get(name, {})

                ipv4, ipv6 = _format_addresses(item.get('addr_info', []))
                mode = _detect_address_mode(iface_cfg)
                vif, vif_s = _collect_vifs(iface_cfg)

                rows.append({
                    'id': name,
                    'name': name,
                    'type': _detect_interface_type(name),
                    'address_mode': mode,
                    'ipv4_address': ipv4,
                    'ipv6_address': ipv6,
                    'mac': item.get('address') or iface_cfg.get('hw-id') or iface_cfg.get('mac') or '',
                    'mtu': item.get('mtu', ''),
                    'speed': _parse_ethtool_speed(name),
                    'vrf': iface_cfg.get('vrf', ''),
                    'vif': vif,
                    'vif_s': vif_s,
                    'description': item.get('description') or iface_cfg.get('description', ''),
                    'operstate': item.get('operstate', ''),
                    '_config': iface_cfg,
                })

            return {'success': True, 'interfaces': rows}
        except Exception as e:
            traceback.print_exc()
            return {'success': False, 'code': 'INTERFACE_ERROR', 'message': str(e)}

    def get_ethernet_interface_detail(self, ifname):
        """Return single Ethernet interface details including raw config."""
        try:
            op_data = _run_op_mode_interfaces('ethernet', ifname)
            cfg_data = _get_interface_config(['interfaces', 'ethernet'])
            item = op_data[0] if op_data else {}
            iface_cfg = cfg_data.get(ifname, {})
            ipv4, ipv6 = _format_addresses(item.get('addr_info', []))
            mode = _detect_address_mode(iface_cfg)
            vif, vif_s = _collect_vifs(iface_cfg)
            return {
                'success': True,
                'interface': {
                    'id': ifname,
                    'name': ifname,
                    'type': _detect_interface_type(ifname),
                    'address_mode': mode,
                    'ipv4_address': ipv4,
                    'ipv6_address': ipv6,
                    'mac': item.get('address') or iface_cfg.get('hw-id') or iface_cfg.get('mac') or '',
                    'mtu': item.get('mtu', ''),
                    'speed': _parse_ethtool_speed(ifname),
                    'vrf': iface_cfg.get('vrf', ''),
                    'vif': vif,
                    'vif_s': vif_s,
                    'description': item.get('description') or iface_cfg.get('description', ''),
                    'operstate': item.get('operstate', ''),
                    '_config': iface_cfg,
                }
            }
        except Exception as e:
            traceback.print_exc()
            return {'success': False, 'code': 'INTERFACE_ERROR', 'message': str(e)}
