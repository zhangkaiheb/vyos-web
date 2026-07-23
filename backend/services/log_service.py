#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Log service: audit log, conntrack log, firewall log, system log, and periodic collection.
"""

import json
import os
import re
import subprocess
from datetime import datetime, timedelta

from utils.database import get_db_connection


class LogService:
    def get_conntrack_log_config(self):
        """Return conntrack log configuration from SQLite."""
        try:
            conn = get_db_connection()
            row = conn.execute('SELECT * FROM firewall_log_config WHERE id = 1').fetchone()
            conn.close()
            if row:
                return {
                    'success': True,
                    'conntrack_enabled': bool(row['conntrack_enabled']),
                    'conntrack_level': row['conntrack_level'],
                    'conntrack_tcp': bool(row['conntrack_tcp']) if 'conntrack_tcp' in row.keys() else False,
                    'conntrack_udp': bool(row['conntrack_udp']) if 'conntrack_udp' in row.keys() else False,
                    'conntrack_icmp': bool(row['conntrack_icmp']) if 'conntrack_icmp' in row.keys() else False,
                    'conntrack_other': bool(row['conntrack_other']) if 'conntrack_other' in row.keys() else False,
                }
            return {
                'success': True, 'conntrack_enabled': False, 'conntrack_level': 'info',
                'conntrack_tcp': False, 'conntrack_udp': False,
                'conntrack_icmp': False, 'conntrack_other': False,
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}


    def get_logs(self, log_type, page, page_size, keyword=None, start_time=None, end_time=None, level=None):
        offset = (page - 1) * page_size
        try:
            conn = get_db_connection()
            if log_type == 'audit':
                rows, total = self._query_table(conn, 'audit_log', page_size, offset,
                                                keyword, start_time, end_time, level)
            elif log_type == 'conntrack':
                rows, total = self._query_table(conn, 'conntrack_log', page_size, offset,
                                                keyword, start_time, end_time, level)
            elif log_type == 'firewall':
                rows, total = self._query_table(conn, 'firewall_log', page_size, offset,
                                                keyword, start_time, end_time, level)
            elif log_type == 'system':
                return self._get_system_logs(page, page_size, keyword, start_time, end_time, level)
            else:
                return {'success': False, 'code': 'UNKNOWN_LOG_TYPE', 'message': '未知的日志类型'}
            conn.close()
            return {
                'success': True,
                'type': log_type,
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
                'data': rows,
            }
        except Exception as e:
            return {'success': False, 'code': 'LOG_ERROR', 'message': str(e)}

    def _query_table(self, conn, table, limit, offset, keyword, start_time, end_time, level):
        where = []
        params = []
        if keyword:
            if table == 'audit_log':
                where.append('(user_id LIKE ? OR action LIKE ? OR target LIKE ? OR error_message LIKE ?)')
                params.extend([f'%{keyword}%'] * 4)
            elif table == 'conntrack_log':
                where.append('(protocol LIKE ? OR event LIKE ? OR src_ip LIKE ? OR dst_ip LIKE ? OR interface LIKE ?)')
                params.extend([f'%{keyword}%'] * 5)
            elif table == 'firewall_log':
                where.append('(chain LIKE ? OR action LIKE ? OR protocol LIKE ? OR src_ip LIKE ? OR dst_ip LIKE ? OR log_level LIKE ?)')
                params.extend([f'%{keyword}%'] * 6)
        if start_time:
            where.append('timestamp >= ?')
            params.append(start_time)
        if end_time:
            where.append('timestamp <= ?')
            params.append(end_time)
        if level:
            if table == 'firewall_log':
                where.append('log_level = ?')
            elif table == 'audit_log':
                where.append('success = ?')
            else:
                where.append('event = ?')
            params.append(level)
        where_sql = 'WHERE ' + ' AND '.join(where) if where else ''
        count_sql = f'SELECT COUNT(*) as c FROM {table} {where_sql}'
        total = conn.execute(count_sql, params).fetchone()['c']
        query_sql = f'SELECT * FROM {table} {where_sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        cursor = conn.execute(query_sql, params + [limit, offset])
        rows = [dict(r) for r in cursor.fetchall()]
        return rows, total

    def _get_system_logs(self, page, page_size, keyword=None, start_time=None, end_time=None, level=None):
        try:
            since = None
            if start_time:
                try:
                    since = datetime.fromisoformat(start_time).strftime('%Y-%m-%d %H:%M:%S')
                except Exception:
                    pass
            cmd = ['journalctl', '--no-pager', '-n', str(page_size * page), '--output', 'json']
            if since:
                cmd += ['--since', since]
            if end_time:
                try:
                    until = datetime.fromisoformat(end_time).strftime('%Y-%m-%d %H:%M:%S')
                    cmd += ['--until', until]
                except Exception:
                    pass
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            logs = []
            for line in result.stdout.strip().splitlines():
                try:
                    entry = json.loads(line)
                    message = entry.get('MESSAGE', '')
                    priority = entry.get('PRIORITY', '')
                    if keyword and keyword.lower() not in message.lower():
                        continue
                    if level and str(priority) != str(level):
                        continue
                    logs.append({
                        'timestamp': entry.get('__REALTIME_TIMESTAMP', ''),
                        'message': message,
                        'priority': priority,
                        'unit': entry.get('_SYSTEMD_UNIT', ''),
                    })
                except Exception:
                    pass
            total = len(logs)
            offset = (page - 1) * page_size
            return {
                'success': True,
                'type': 'system',
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
                'data': logs[offset:offset + page_size],
            }
        except Exception as e:
            return {'success': False, 'code': 'SYSTEM_LOG_ERROR', 'message': str(e)}

    def add_conntrack_log(self, protocol, event, src_ip='', src_port=0, dst_ip='', dst_port=0,
                          interface='', zone=''):
        try:
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO conntrack_log (protocol, event, src_ip, src_port, dst_ip, dst_port, interface, zone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (protocol, event, src_ip, src_port, dst_ip, dst_port, interface, zone))
            conn.commit()
            conn.close()
        except Exception:
            pass

    def add_firewall_log(self, rule_id, chain, action, protocol, src_ip='', src_port=0,
                         dst_ip='', dst_port=0, in_interface='', out_interface='',
                         log_group='', log_level='', packet_length=0, payload=''):
        try:
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO firewall_log (rule_id, chain, action, protocol, src_ip, src_port,
                                          dst_ip, dst_port, in_interface, out_interface,
                                          log_group, log_level, packet_length, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (rule_id, chain, action, protocol, src_ip, src_port, dst_ip, dst_port,
                  in_interface, out_interface, log_group, log_level, packet_length, payload))
            conn.commit()
            conn.close()
        except Exception:
            pass

    def collect_conntrack_events(self, protocols=None):
        """Collect current conntrack entries and store them as events."""
        protocols = protocols or {}
        enabled = {
            'tcp': protocols.get('conntrack_tcp', False),
            'udp': protocols.get('conntrack_udp', False),
            'icmp': protocols.get('conntrack_icmp', False),
        }
        other_enabled = protocols.get('conntrack_other', False)
        if not any(enabled.values()) and not other_enabled:
            return 0
        try:
            result = subprocess.run(
                ['sudo', 'conntrack', '--dump', '--family', 'inet'],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                return 0
            inserted = 0
            for line in result.stdout.splitlines():
                try:
                    proto_match = re.match(r'(\w+)\s+(\d+)\s+', line)
                    if not proto_match:
                        continue
                    protocol = proto_match.group(1).lower()
                    if protocol in enabled:
                        if not enabled[protocol]:
                            continue
                    elif not other_enabled:
                        continue
                    m = re.search(r'src=(\S+)\s+dst=(\S+)', line)
                    if not m:
                        continue
                    src_ip = m.group(1)
                    dst_ip = m.group(2)
                    sport_match = re.search(r'sport=(\d+)', line)
                    dport_match = re.search(r'dport=(\d+)', line)
                    src_port = int(sport_match.group(1)) if sport_match else 0
                    dst_port = int(dport_match.group(1)) if dport_match else 0
                    self.add_conntrack_log(protocol, 'established', src_ip, src_port, dst_ip, dst_port)
                    inserted += 1
                except Exception:
                    pass
            return inserted
        except Exception:
            return 0

    def collect_firewall_events(self):
        """Collect recent firewall log lines from journalctl."""
        try:
            result = subprocess.run(
                ['journalctl', '--no-pager', '-n', '200', '-k', '--output', 'json'],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                return 0
            inserted = 0
            for line in result.stdout.splitlines():
                try:
                    entry = json.loads(line)
                    message = entry.get('MESSAGE', '')
                    if 'RULE' not in message and 'DROP' not in message and 'REJECT' not in message:
                        continue
                    m = re.search(r'IN=(\S+)\s+OUT=(\S+).*SRC=(\S+)\s+DST=(\S+).*PROTO=(\S+).*SPT=(\d+)\s+DPT=(\d+)', message)
                    if m:
                        self.add_firewall_log(
                            rule_id=0, chain=m.group(1), action='drop', protocol=m.group(5),
                            src_ip=m.group(3), src_port=int(m.group(6)),
                            dst_ip=m.group(4), dst_port=int(m.group(7)),
                            in_interface=m.group(1), out_interface=m.group(2),
                            log_level='info', payload=message[:500]
                        )
                        inserted += 1
                except Exception:
                    pass
            return inserted
        except Exception:
            return 0

    def cleanup_logs(self, days=7):
        """Remove conntrack and firewall logs older than specified days."""
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            conn = get_db_connection()
            conn.execute('DELETE FROM conntrack_log WHERE timestamp < ?', (cutoff,))
            conn.execute('DELETE FROM firewall_log WHERE timestamp < ?', (cutoff,))
            conn.commit()
            conn.close()
        except Exception:
            pass
