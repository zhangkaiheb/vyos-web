#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monitoring service: CPU, memory, conntrack, interface traffic, and VyOS op-mode wrappers.
"""

import json
import os
import re
import subprocess
import time
import traceback
from datetime import datetime, timedelta

from utils.database import get_db_connection


def _run_op_show(args):
    cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'show'] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return '', str(e), 1


def _run_op_mode(script, func, args=None):
    """Call a VyOS op-mode Python script under /usr/libexec/vyos/op_mode."""
    cmd = ['python3', '-c',
           f"import sys; sys.path.insert(0, '/usr/libexec/vyos/op_mode'); "
           f"import {script}; print(json.dumps({script}.{func}(**({json.dumps(args or {})}))))"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            try:
                return json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                return {'stdout': result.stdout, 'stderr': result.stderr, 'rc': result.returncode}
        return {'stdout': result.stdout, 'stderr': result.stderr, 'rc': result.returncode}
    except Exception as e:
        return {'stdout': '', 'stderr': str(e), 'rc': 1}


def _parse_cpu_usage():
    stdout, stderr, rc = _run_op_show(['cpu'])
    if rc != 0:
        return 0.0
    for line in stdout.splitlines():
        if 'average' in line.lower() or 'cpu' in line.lower():
            m = re.search(r'(\d+(?:\.\d+)?)\s*%', line)
            if m:
                return float(m.group(1))
    return 0.0


def _parse_memory_usage():
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = f.read()
        total = re.search(r'MemTotal:\s+(\d+)', meminfo)
        available = re.search(r'MemAvailable:\s+(\d+)', meminfo)
        if total and available:
            total_kb = int(total.group(1))
            avail_kb = int(available.group(1))
            used_kb = total_kb - avail_kb
            return round(used_kb / total_kb * 100, 2)
    except Exception:
        pass
    return 0.0


def _parse_memory_detail():
    try:
        data = _run_op_mode('memory', 'show', {'raw': True})
        if isinstance(data, dict) and 'total' in data:
            return data
    except Exception:
        pass
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = f.read()
        keys = ['MemTotal', 'MemFree', 'MemAvailable', 'Buffers', 'Cached', 'SwapTotal', 'SwapFree']
        result = {}
        for key in keys:
            m = re.search(rf'{key}:\s+(\d+)', meminfo)
            result[key.lower()] = int(m.group(1)) * 1024 if m else 0
        return result
    except Exception:
        return {}


def _parse_conntrack_count():
    try:
        with open('/proc/sys/net/netfilter/nf_conntrack_count', 'r') as f:
            return int(f.read().strip())
    except Exception:
        pass
    return 0


def _parse_conntrack_max():
    try:
        with open('/proc/sys/net/netfilter/nf_conntrack_max', 'r') as f:
            return int(f.read().strip())
    except Exception:
        return 0


def _read_interface_counters():
    """Return dict of interface counters from /sys/class/net/<iface>/statistics."""
    counters = {}
    base = '/sys/class/net'
    try:
        for iface in os.listdir(base):
            stats_dir = os.path.join(base, iface, 'statistics')
            if not os.path.isdir(stats_dir):
                continue
            entry = {}
            for name in ['rx_bytes', 'tx_bytes', 'rx_packets', 'tx_packets',
                         'rx_errors', 'tx_errors', 'rx_dropped', 'tx_dropped']:
                path = os.path.join(stats_dir, name)
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        entry[name] = int(f.read().strip())
                else:
                    entry[name] = 0
            counters[iface] = entry
    except Exception:
        pass
    return counters


def _record_history(metric_type, metric, value, interface=None, unit=''):
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO monitoring_history (type, metric, value, interface, unit, timestamp)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (metric_type, metric, value, interface, unit))
        conn.commit()
        conn.close()
    except Exception:
        pass


def _cleanup_history():
    """Remove monitoring history older than 7 days."""
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)
        conn = get_db_connection()
        conn.execute('DELETE FROM monitoring_history WHERE timestamp < ?', (cutoff,))
        conn.commit()
        conn.close()
    except Exception:
        pass


class MonitorService:
    def __init__(self):
        self._last_interface_counters = {}
        self._last_interface_time = None

    def get_data(self, widget_type, interface, duration):
        try:
            _cleanup_history()
            if widget_type == 'cpu':
                value = _parse_cpu_usage()
                _record_history('cpu', 'usage', value, unit='%')
                return {'success': True, 'type': 'cpu', 'value': value, 'unit': '%'}
            elif widget_type == 'memory':
                value = _parse_memory_usage()
                detail = _parse_memory_detail()
                _record_history('memory', 'usage', value, unit='%')
                return {'success': True, 'type': 'memory', 'value': value, 'unit': '%', 'detail': detail}
            elif widget_type == 'conntrack':
                value = _parse_conntrack_count()
                max_val = _parse_conntrack_max()
                _record_history('conntrack', 'count', value, unit='')
                return {'success': True, 'type': 'conntrack', 'value': value,
                        'max': max_val, 'unit': ''}
            elif widget_type == 'interface-traffic':
                rates = self._get_interface_rates(interface)
                if interface:
                    _record_history('interface-traffic', 'rx', rates.get('rx', 0), interface=interface, unit='bps')
                    _record_history('interface-traffic', 'tx', rates.get('tx', 0), interface=interface, unit='bps')
                return {'success': True, 'type': 'interface-traffic', 'interface': interface, 'data': rates}
            elif widget_type == 'interface-list':
                return {'success': True, 'interfaces': list(_read_interface_counters().keys())}
            else:
                return self._op_mode_data(widget_type, interface, duration)
        except Exception as e:
            traceback.print_exc()
            return {'success': False, 'code': 'MONITOR_ERROR', 'message': str(e)}

    def _get_interface_rates(self, interface=None):
        now = time.time()
        current = _read_interface_counters()
        rates = {}
        if self._last_interface_time is None or not self._last_interface_counters:
            rates = {iface: {'rx': 0, 'tx': 0, 'rx_bytes': data['rx_bytes'], 'tx_bytes': data['tx_bytes']}
                     for iface, data in current.items()}
        else:
            delta = max(now - self._last_interface_time, 0.001)
            for iface, data in current.items():
                prev = self._last_interface_counters.get(iface, {})
                rx_bytes = data.get('rx_bytes', 0)
                tx_bytes = data.get('tx_bytes', 0)
                prev_rx = prev.get('rx_bytes', rx_bytes)
                prev_tx = prev.get('tx_bytes', tx_bytes)
                rx_diff = max(rx_bytes - prev_rx, 0)
                tx_diff = max(tx_bytes - prev_tx, 0)
                rates[iface] = {
                    'rx': round(rx_diff * 8 / delta, 2),
                    'tx': round(tx_diff * 8 / delta, 2),
                    'rx_bytes': rx_bytes,
                    'tx_bytes': tx_bytes,
                }
        self._last_interface_counters = current
        self._last_interface_time = now
        if interface:
            return rates.get(interface, {'rx': 0, 'tx': 0})
        return rates

    def _op_mode_data(self, widget_type, interface, duration):
        """Dispatch to VyOS op-mode scripts for advanced widget types."""
        if widget_type in ('interfaces', 'interfaces-detail'):
            data = _run_op_mode('interfaces', 'show', {'raw': True, 'intf_name': interface or '',
                                                       'intf_type': '', 'vif': False, 'vrrp': False})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'interfaces-counters':
            data = _run_op_mode('interfaces', 'show_counters', {'raw': True, 'intf_name': interface or '',
                                                                'intf_type': '', 'vif': False, 'vrrp': False})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'firewall':
            data = _run_op_mode('firewall', 'show', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'firewall-summary':
            data = _run_op_mode('firewall', 'show_summary', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'nat':
            data = _run_op_mode('nat', 'show', {'raw': True, 'family': 'inet'})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'nat66':
            data = _run_op_mode('nat', 'show', {'raw': True, 'family': 'inet6'})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'conntrack-table':
            data = _run_op_mode('conntrack', 'show', {'raw': True, 'family': 'inet'})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'bgp':
            data = _run_op_mode('bgp', 'show_summary', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'lldp':
            data = _run_op_mode('lldp', 'show_neighbors', {'raw': True, 'interface': interface or '',
                                                           'detail': False})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'ipsec':
            data = _run_op_mode('ipsec', 'show_sa', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'version':
            data = _run_op_mode('version', 'show', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'container':
            data = _run_op_mode('container', 'show', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        elif widget_type == 'route':
            data = _run_op_mode('route', 'show', {'raw': True})
            return {'success': True, 'type': widget_type, 'data': data}
        else:
            return {'success': False, 'code': 'UNKNOWN_WIDGET', 'message': '未知的监控类型'}

    def get_history(self, metric_type, metric, duration='24h', interface=None):
        try:
            delta = timedelta(hours=24)
            if duration == '1h':
                delta = timedelta(hours=1)
            elif duration == '12h':
                delta = timedelta(hours=12)
            elif duration == '1d':
                delta = timedelta(days=1)
            elif duration == '1w':
                delta = timedelta(weeks=1)
            elif duration == '30d':
                delta = timedelta(days=30)
            start = datetime.utcnow() - delta
            conn = get_db_connection()
            cursor = conn.execute('''
                SELECT timestamp, value FROM monitoring_history
                WHERE type = ? AND metric = ? AND interface IS ? AND timestamp >= ?
                ORDER BY timestamp ASC
            ''', (metric_type, metric, interface, start))
            rows = [{'timestamp': r['timestamp'], 'value': r['value']} for r in cursor.fetchall()]
            conn.close()
            return {'success': True, 'type': metric_type, 'metric': metric, 'duration': duration,
                    'interface': interface, 'data': rows}
        except Exception as e:
            return {'success': False, 'code': 'HISTORY_ERROR', 'message': str(e)}

    def collect_all(self):
        """Convenience method to collect and store current metrics."""
        _cleanup_history()
        self.get_data('cpu', '', '')
        self.get_data('memory', '', '')
        self.get_data('conntrack', '', '')
        self._get_interface_rates()
