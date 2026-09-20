#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interface service: retrieve and parse Ethernet interface details from VyOS.
"""

import json
import logging
import os
import re
import subprocess
import traceback

from services.config_reader_client import read_config as _daemon_read_config

_logger = logging.getLogger('interface_service')


def _read_config_subprocess(path_list, effective=True):
    """Read VyOS config via persistent daemon subprocess.
    
    This is a drop-in replacement for the old subprocess-per-call approach.
    The persistent daemon holds a Config instance and serves read requests
    via Unix socket IPC, avoiding the ~10s Config() initialization overhead.
    
    Args:
        path_list: List of config path components (e.g., ['interfaces', 'ethernet'])
        effective: If True, read effective/running config; if False, read session config
    
    Returns:
        Dict of config data, or empty dict on error
    """
    _logger.info(f'[_read_config_subprocess] path={path_list}, effective={effective}')
    try:
        data = _daemon_read_config(path_list, effective)
        _logger.info(f'[_read_config_subprocess] SUCCESS: got {len(data) if isinstance(data, dict) else "non-dict"} keys')
        return data
    except Exception as e:
        _logger.error(f'[_read_config_subprocess] EXCEPTION: {e}', exc_info=True)
        return {}


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
        # Pass clean environment to avoid SIGSEGV from polluted os.environ
        clean_env = {
            'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'HOME': os.environ.get('HOME', '/root'),
            'USER': os.environ.get('USER', 'root'),
        }
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=clean_env)
        _logger.info(f'[_run_op_mode_interfaces] returncode={result.returncode}, stdout_len={len(result.stdout)}, stderr_len={len(result.stderr)}')
        if result.stderr:
            _logger.warning(f'[_run_op_mode_interfaces] stderr: {result.stderr[:500]}')
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
        else:
            _logger.error(f'[_run_op_mode_interfaces] Failed: rc={result.returncode}, stdout={result.stdout[:200]}, stderr={result.stderr[:200]}')
    except Exception as e:
        _logger.error(f'[_run_op_mode_interfaces] Exception: {e}', exc_info=True)
    return []


def _batch_parse_ethtool_speed(ifnames):
    """Return dict of {ifname: speed_string} for all interfaces in a single subprocess call."""
    if not ifnames:
        return {}
    try:
        # Use a single Python subprocess to query all interfaces at once
        names_json = json.dumps(ifnames)
        cmd = [
            'python3', '-c',
            f"""
import sys, json, subprocess, re
ifnames = {names_json}
result = {{}}
for name in ifnames:
    try:
        r = subprocess.run(['/usr/sbin/ethtool', name], capture_output=True, text=True, timeout=5)
        if r.returncode == 0:
            m = re.search(r'Speed:\\s*(\\S+)', r.stdout)
            if m:
                speed = m.group(1)
                if speed != 'Unknown!':
                    result[name] = speed
    except Exception:
        pass
print(json.dumps(result))
"""
        ]
        clean_env = {
            'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'HOME': os.environ.get('HOME', '/root'),
            'USER': os.environ.get('USER', 'root'),
        }
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=clean_env)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout.strip())
    except Exception:
        pass
    return {}


def _parse_ethtool_speed(ifname):
    """Return link speed string from ethtool (e.g. '1000Mb/s') or ''."""
    try:
        result = subprocess.run(['/usr/sbin/ethtool', ifname], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            m = re.search(r'Speed:\s*(\S+)', result.stdout)
            if m:
                return m.group(1)
    except Exception:
        pass
    return ''


def _get_interface_config(path):
    """Return VyOS config dict at path (effective)."""
    return _read_config_subprocess(path, effective=True)


def _get_session_interface_config(path):
    """Return VyOS session (proposed) config dict at path."""
    return _read_config_subprocess(path, effective=False)


def _get_deleted_ethernet_interfaces(user=None):
    """Parse session config to find deleted ethernet interfaces.

    Uses the token-based global config session when a user dict (with _token)
    is provided; otherwise falls back to a safe subprocess-based probe that
    does not create a new ConfigSession in this process.

    Returns a set of interface names that have been deleted in the current session.
    """
    deleted = set()
    try:
        _logger.info(f'[_get_deleted_ethernet_interfaces] START: user_has_token={bool(user and user.get("_token"))}')
        raw = None
        if user and user.get('_token'):
            # Use token session via config_service so we don't spawn a second
            # ConfigSession in this process (which would corrupt env state)
            from services.config_service import _get_config_session, _get_token
            token = _get_token(user)
            _logger.info(f'[_get_deleted_ethernet_interfaces] Getting session for token={token[:20]}...')
            session = _get_config_session(token)
            _logger.info(f'[_get_deleted_ethernet_interfaces] Got session: id={id(session)}')
            # Verify session env
            try:
                session_env = session._ConfigSession__session_env
                _logger.info(f'[_get_deleted_ethernet_interfaces] Session env id={id(session_env)}, is dict: {isinstance(session_env, dict)}, keys count={len(session_env)}')
            except Exception as e:
                _logger.error(f'[_get_deleted_ethernet_interfaces] Cannot access session env: {e}')
            
            _logger.info(f'[_get_deleted_ethernet_interfaces] Calling show_config...')
            try:
                raw = session.show_config([], format='raw') or ''
                _logger.info(f'[_get_deleted_ethernet_interfaces] show_config returned {len(raw)} chars')
            except Exception as e:
                _logger.warning(f'[_get_deleted_ethernet_interfaces] show_config failed (session may be expired): {e}')
                raw = None
        else:
            # Fallback: run a subprocess to inspect the session via CLI so
            # this process's global os.environ stays untouched.
            _logger.info(f'[_get_deleted_ethernet_interfaces] No token, using CLI fallback')
            cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'show', 'configuration', 'commands']
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if result.returncode == 0:
                    raw = result.stdout
                    _logger.info(f'[_get_deleted_ethernet_interfaces] CLI returned {len(raw)} chars')
                else:
                    _logger.warning(f'[_get_deleted_ethernet_interfaces] CLI failed: rc={result.returncode}, stderr={result.stderr[:200]}')
            except Exception as e:
                _logger.error(f'[_get_deleted_ethernet_interfaces] CLI exception: {e}')
                raw = None
        if raw:
            for line in raw.split('\n'):
                line = line.strip()
                # Match: delete interfaces ethernet <name>
                if line.startswith('delete interfaces ethernet '):
                    parts = line.split()
                    if len(parts) >= 4:
                        deleted.add(parts[3])
            _logger.info(f'[_get_deleted_ethernet_interfaces] Found {len(deleted)} deleted interfaces: {deleted}')
        else:
            _logger.info(f'[_get_deleted_ethernet_interfaces] No raw config data, returning empty set')
    except Exception as e:
        _logger.error(f'[_get_deleted_ethernet_interfaces] FAILED: {e}', exc_info=True)
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
    """Return lists of VLAN IDs for vif and vif-s."""
    vif = sorted(str(k) for k in iface_config.get('vif', {}).keys())
    vif_s = sorted(str(k) for k in iface_config.get('vif-s', {}).keys())
    return vif, vif_s


def _detect_interface_type(ifname):
    """Classify interface as ethernet, vlan or qinq based on name."""
    dot_count = ifname.count('.')
    if dot_count == 0:
        return 'ethernet'
    if dot_count == 1:
        return 'vlan'
    return 'qinq'


def _get_bridge_members():
    """Return set of interface names that are bridge members (L2).
    
    Bridge configuration structure:
    interfaces bridge <br-name> member interface <iface-name>
    
    Returns:
        Set of interface names that are members of any bridge
    """
    try:
        bridge_cfg = _read_config_subprocess(['interfaces', 'bridge'], effective=True)
        members = set()
        for br_name, br_cfg in bridge_cfg.items():
            if not isinstance(br_cfg, dict):
                continue
            member_section = br_cfg.get('member', {})
            if not isinstance(member_section, dict):
                continue
            iface_section = member_section.get('interface', {})
            if isinstance(iface_section, dict):
                for iface_name in iface_section.keys():
                    members.add(iface_name)
        _logger.info(f'[_get_bridge_members] Found {len(members)} bridge members: {members}')
        return members
    except Exception as e:
        _logger.error(f'[_get_bridge_members] ERROR: {e}', exc_info=True)
        return set()


class InterfaceService:
    """Service for retrieving and parsing network interface details."""

    def get_ethernet_interfaces(self, user=None):
        """Return enriched Ethernet interface list for the web table."""
        try:
            op_data = _run_op_mode_interfaces('ethernet')
            cfg_data = _get_interface_config(['interfaces', 'ethernet'])
            deleted_ifaces = _get_deleted_ethernet_interfaces(user)
            bridge_members = _get_bridge_members()

            # Batch query ethtool speed for all interfaces at once
            all_names = [item.get('ifname', '') for item in op_data if item.get('ifname', '')]
            speed_map = _batch_parse_ethtool_speed(all_names)
            _logger.info(f'[get_ethernet_interfaces] op_data count={len(op_data)}, cfg_data keys={list(cfg_data.keys())}, deleted={deleted_ifaces}, bridge_members={bridge_members}')

            rows = []
            for item in op_data:
                name = item.get('ifname', '')
                if not name:
                    continue

                # Skip interfaces deleted in current session
                if name in deleted_ifaces:
                    _logger.info(f'[get_ethernet_interfaces] Skip deleted: {name}')
                    continue

                # Get config for this interface
                # For VLAN/QinQ interfaces, get nested config from parent
                iface_cfg = cfg_data.get(name, {})
                if not iface_cfg and '.' in name:
                    # VLAN/QinQ: get config from parent's vif/vif-s
                    parts = name.split('.')
                    parent_name = parts[0]
                    parent_cfg = cfg_data.get(parent_name, {})
                    _logger.info(f'[get_ethernet_interfaces] VLAN/QinQ lookup: {name}, parent={parent_name}, parent_cfg_keys={list(parent_cfg.keys())}')
                    if len(parts) == 2:
                        # VLAN: eth1.10 → parent_cfg.vif.10
                        iface_cfg = parent_cfg.get('vif', {}).get(parts[1], {})
                        _logger.info(f'[get_ethernet_interfaces] VLAN config: vif.{parts[1]} = {iface_cfg}')
                    elif len(parts) == 3:
                        # QinQ: eth1.20.30 → parent_cfg.vif-s.20.vif-c.30
                        iface_cfg = parent_cfg.get('vif-s', {}).get(parts[1], {}).get('vif-c', {}).get(parts[2], {})
                        _logger.info(f'[get_ethernet_interfaces] QinQ config: vif-s.{parts[1]}.vif-c.{parts[2]} = {iface_cfg}')

                ipv4, ipv6 = _format_addresses(item.get('addr_info', []))
                address_mode = _detect_address_mode(iface_cfg)
                vif, vif_s = _collect_vifs(iface_cfg)
                
                # Determine interface mode: L2 if bridge member, L3 otherwise
                interface_mode = 'L2' if name in bridge_members else 'L3'

                rows.append({
                    'id': name,
                    'name': name,
                    'type': _detect_interface_type(name),
                    'mode': interface_mode,
                    'address_mode': address_mode,
                    'ipv4_address': ipv4,
                    'ipv6_address': ipv6,
                    'mac': item.get('address') or iface_cfg.get('hw-id') or iface_cfg.get('mac') or '',
                    'mtu': item.get('mtu', ''),
                    'speed': speed_map.get(name, ''),
                    'vrf': iface_cfg.get('vrf', ''),
                    'vif': vif,
                    'vif_s': vif_s,
                    'description': item.get('description') or iface_cfg.get('description', ''),
                    'operstate': item.get('operstate', ''),
                    '_config': iface_cfg,
                })

            _logger.info(f'[get_ethernet_interfaces] Returning {len(rows)} interfaces')
            return {'success': True, 'interfaces': rows}
        except Exception as e:
            _logger.error(f'[get_ethernet_interfaces] ERROR: {e}', exc_info=True)
            traceback.print_exc()
            return {'success': False, 'code': 'INTERFACE_ERROR', 'message': str(e)}

    def get_ethernet_interface_detail(self, ifname, user=None):
        """Return single Ethernet interface details including raw config."""
        try:
            op_data = _run_op_mode_interfaces('ethernet', ifname)
            cfg_data = _get_interface_config(['interfaces', 'ethernet'])
            deleted_ifaces = _get_deleted_ethernet_interfaces(user)
            if ifname in deleted_ifaces:
                return {'success': False, 'code': 'INTERFACE_NOT_FOUND', 'message': f'接口 {ifname} 已删除'}
            item = op_data[0] if op_data else {}
            
            # Get config for this interface
            # For VLAN/QinQ interfaces, get nested config from parent
            iface_cfg = cfg_data.get(ifname, {})
            if not iface_cfg and '.' in ifname:
                # VLAN/QinQ: get config from parent's vif/vif-s
                parts = ifname.split('.')
                parent_name = parts[0]
                parent_cfg = cfg_data.get(parent_name, {})
                if len(parts) == 2:
                    # VLAN: eth1.10 → parent_cfg.vif.10
                    iface_cfg = parent_cfg.get('vif', {}).get(parts[1], {})
                elif len(parts) == 3:
                    # QinQ: eth1.20.30 → parent_cfg.vif-s.20.vif-c.30
                    iface_cfg = parent_cfg.get('vif-s', {}).get(parts[1], {}).get('vif-c', {}).get(parts[2], {})
            
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
