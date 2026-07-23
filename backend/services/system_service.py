#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
System maintenance and webapp upgrade service.
"""

import json
import os
import re
import subprocess
import time

from utils.database import get_db_connection


BASE_DIR = '/opt/vyos-web-config'
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')


def _run_command(cmd, input_text=None, timeout=30):
    try:
        result = subprocess.run(cmd, input=input_text, capture_output=True, text=True, timeout=timeout)
        return {
            'success': result.returncode == 0,
            'output': result.stdout + result.stderr,
            'returncode': result.returncode
        }
    except Exception as e:
        return {'success': False, 'output': str(e), 'returncode': -1}


def _write_webapp_history(version, build, commit, action, source='', backup_path='', success=True, error_message=''):
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO webapp_history (version, build, "commit", action, source, backup_path, success, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (version, build, commit, action, source, backup_path, 1 if success else 0, error_message))
        conn.commit()
        conn.close()
    except Exception:
        pass


class SystemService:
    def ping(self, host, count=4):
        if not host:
            return {'success': False, 'message': '目标地址不能为空'}
        return _run_command(['ping', '-c', str(count), '-W', '2', host], timeout=count * 3)

    def traceroute(self, host):
        if not host:
            return {'success': False, 'message': '目标地址不能为空'}
        return _run_command(['traceroute', '-n', host], timeout=30)

    def mtr(self, host, count=10):
        if not host:
            return {'success': False, 'message': '目标地址不能为空'}
        try:
            result = subprocess.run(
                ['mtr', '-n', '-r', '-c', str(count), host],
                capture_output=True, text=True, timeout=60
            )
            return {'success': True, 'output': result.stdout + result.stderr,
                    'returncode': result.returncode}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def tcpdump(self, interface, count=10, filter_expr=''):
        iface = interface or 'any'
        cmd = ['sudo', 'tcpdump', '-i', iface, '-c', str(count), '-nn']
        if filter_expr:
            cmd.extend(filter_expr.split())
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return {'success': True, 'output': result.stdout + result.stderr,
                    'returncode': result.returncode}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def set_date(self, date_str):
        """Set system date. Supported formats: MMDDhhmm, MMDDhhmmYY, MMDDhhmmCCYY, MMDDhhmmCCYY.ss"""
        if not re.match(r'^\d{8,14}(\.\d{2})?$', date_str):
            return {'success': False, 'message': '日期格式不正确，应为 MMDDhhmm[YY|CCYY][.ss]'}
        return _run_command(['sudo', 'date', date_str])

    def set_terminal(self, key=None, length=None, pager=None, width=None):
        """Set terminal options (key/length/pager/width)."""
        results = {}
        if key is not None:
            results['key'] = _run_command(['set', 'terminal', 'key', str(key)])
        if length is not None:
            results['length'] = _run_command(['set', 'terminal', 'length', str(length)])
        if pager is not None:
            results['pager'] = _run_command(['set', 'terminal', 'pager', str(pager)])
        if width is not None:
            results['width'] = _run_command(['set', 'terminal', 'width', str(width)])
        return {'success': True, 'results': results}

    def shell(self, command):
        """Execute a non-interactive shell command and return output."""
        if not command or not isinstance(command, str):
            return {'success': False, 'message': '命令不能为空'}
        # Basic safety: reject obvious interactive or dangerous operators
        unsafe = [';', '&&', '||', '`', '$(']
        if any(u in command for u in unsafe):
            return {'success': False, 'message': '命令包含不安全的字符或操作符'}
        return _run_command(command.split(), timeout=30)

    def reset_config(self):
        """Reset configuration to factory defaults."""
        return _run_command(['sudo', '/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'reset', 'configuration'])

    def reboot(self):
        try:
            subprocess.Popen(['sudo', '/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'reboot', 'now'])
            return {'success': True, 'message': '系统正在重启'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def poweroff(self):
        try:
            subprocess.Popen(['sudo', '/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'poweroff', 'now'])
            return {'success': True, 'message': '系统正在关机'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # ---------- image management ----------

    def list_images(self):
        result = _run_command(['python3', '/usr/libexec/vyos/op_mode/image_manager.py', 'list'])
        try:
            data = json.loads(result['output'])
            return {'success': result['success'], 'images': data}
        except Exception:
            return {'success': result['success'], 'output': result['output']}

    def add_image(self, source):
        if not source:
            return {'success': False, 'message': '镜像来源不能为空'}
        if source.startswith('http://') or source.startswith('https://'):
            return _run_command(['python3', '/usr/libexec/vyos/op_mode/image_manager.py', 'add', source], timeout=300)
        if not os.path.exists(source):
            return {'success': False, 'message': '本地镜像文件不存在'}
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/image_manager.py', 'add', source], timeout=300)

    def delete_image(self, image_name):
        if not image_name:
            return {'success': False, 'message': '镜像名称不能为空'}
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/image_manager.py', 'delete', image_name], timeout=120)

    def set_default_image(self, image_name):
        if not image_name:
            return {'success': False, 'message': '镜像名称不能为空'}
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/image_manager.py', 'set', image_name], timeout=60)

    # ---------- update commands ----------

    def update_container(self, name=None, vrf=None):
        cmd = ['python3', '/usr/libexec/vyos/op_mode/container.py', 'update']
        if name:
            cmd.append(name)
        if vrf:
            cmd.extend(['vrf', vrf])
        return _run_command(cmd, timeout=300)

    def update_geoip(self):
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/update_geoip.py'], timeout=300)

    def update_suricata(self):
        return _run_command(['sudo', 'python3', '/usr/libexec/vyos/op_mode/update_suricata.py'], timeout=300)

    def update_webproxy(self, vrf=None):
        cmd = ['python3', '/usr/libexec/vyos/op_mode/update_webproxy.py']
        if vrf:
            cmd.extend(['vrf', vrf])
        return _run_command(cmd, timeout=300)

    # ---------- op-mode commands ----------

    def op_mode(self, action, command, args=None):
        """Run a generic op-mode command via vyatta-op-cmd-wrapper."""
        args = args or {}
        allowed_actions = {'show', 'clear', 'restart', 'update', 'execute'}
        if action not in allowed_actions:
            return {'success': False, 'message': f'不支持的操作: {action}'}
        if not command or not isinstance(command, str):
            return {'success': False, 'message': '命令不能为空'}
        cmd_parts = command.split()
        # Security: only allow alphanumerics, hyphens, slashes and dots in command words
        for part in cmd_parts:
            if not re.match(r'^[\w\.\-/]+$', part):
                return {'success': False, 'message': '命令包含非法字符'}
        if action == 'execute':
            return _run_command(cmd_parts, timeout=30)
        return _run_command(['/opt/vyatta/bin/vyatta-op-cmd-wrapper', action] + cmd_parts, timeout=30)

    # ---------- generate commands ----------

    def generate_command(self, command_type, args=None):
        """Run generate commands: firewall-rule-resequence, ipsec, openvpn, wireguard, pki, ssh, etc."""
        args = args or {}
        handlers = {
            'firewall-rule-resequence': lambda: self._generate_firewall_resequence(args),
            'wireguard': lambda: self._generate_wireguard(args),
            'openvpn': lambda: self._generate_openvpn(args),
            'ipsec': lambda: self._generate_ipsec(args),
            'pki': lambda: self._generate_pki(args),
            'ssh': lambda: self._generate_ssh(args),
            'tech-support': lambda: self._generate_tech_support(args),
        }
        handler = handlers.get(command_type)
        if not handler:
            return {'success': False, 'message': f'不支持的生成命令: {command_type}'}
        return handler()

    def _generate_firewall_resequence(self, args):
        path = args.get('path', '')
        start = args.get('start', 10)
        step = args.get('step', 10)
        script = '/usr/libexec/vyos/op_mode/generate_firewall_rule-resequence.py'
        if not os.path.exists(script):
            return _run_command(['generate', 'firewall', 'rule-resequence', path, str(start), str(step)])
        return _run_command(['python3', script, path, str(start), str(step)])

    def _generate_wireguard(self, args):
        interface = args.get('interface', '')
        return _run_command(['generate', 'wireguard', 'key-pair', 'interface', interface], timeout=30)

    def _generate_openvpn(self, args):
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/generate_ovpn_client_file.py'], timeout=60)

    def _generate_ipsec(self, args):
        return _run_command(['generate', 'ipsec', 'profile', args.get('profile', '')], timeout=30)

    def _generate_pki(self, args):
        cert_type = args.get('type', 'certificate')
        return _run_command(['generate', 'pki', cert_type, args.get('name', '')], timeout=60)

    def _generate_ssh(self, args):
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/generate_ssh_server_key.py'], timeout=30)

    def _generate_tech_support(self, args):
        return _run_command(['python3', '/usr/libexec/vyos/op_mode/generate_tech-support_archive.py'], timeout=120)

    # ---------- webapp upgrade ----------

    def webapp_version(self):
        version_file = os.path.join(BASE_DIR, 'version.json')
        version = {'version': '1.0.0', 'build': '20260723', 'commit': 'unknown'}
        if os.path.exists(version_file):
            try:
                with open(version_file, 'r') as f:
                    version.update(json.load(f))
            except Exception:
                pass
        return {'success': True, 'version': version}

    def webapp_check_update(self):
        # Placeholder: in production, fetch from a configured update server
        return {'success': True, 'has_update': False, 'latest_version': '1.0.0'}

    def webapp_update(self, url='', file_path=''):
        version = self.webapp_version().get('version', {})
        old_version = version.get('version', 'unknown')
        old_build = version.get('build', 'unknown')
        old_commit = version.get('commit', 'unknown')

        if not url and not file_path:
            return {'success': False, 'message': '升级 URL 或本地文件路径不能为空'}

        try:
            os.makedirs(BACKUP_DIR, exist_ok=True)
            backup_name = f'webapp-backup-{old_version}-{int(time.time())}.tar.gz'
            backup_path = os.path.join(BACKUP_DIR, backup_name)
            # Backup current backend and frontend excluding data
            result = subprocess.run(
                ['sudo', 'tar', '-czf', backup_path, '-C', BASE_DIR,
                 '--exclude=data/*.db', '--exclude=backups', 'backend', 'frontend', 'version.json'],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                _write_webapp_history(old_version, old_build, old_commit, 'backup_failed', url or file_path,
                                      '', False, result.stderr)
                return {'success': False, 'message': f'备份失败: {result.stderr}'}

            update_tmp = os.path.join('/tmp', f'webapp-update-{int(time.time())}.tar.gz')
            if url:
                import urllib.request
                urllib.request.urlretrieve(url, update_tmp)
            else:
                update_tmp = file_path

            # Verify and extract
            result = subprocess.run(
                ['sudo', 'tar', '-tzf', update_tmp],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode != 0:
                _write_webapp_history(old_version, old_build, old_commit, 'verify_failed', url or file_path,
                                      backup_path, False, result.stderr)
                return {'success': False, 'message': f'升级包校验失败: {result.stderr}'}

            result = subprocess.run(
                ['sudo', 'tar', '-xzf', update_tmp, '-C', BASE_DIR,
                 '--exclude=backend/data', '--exclude=backups'],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                _write_webapp_history(old_version, old_build, old_commit, 'update_failed', url or file_path,
                                      backup_path, False, result.stderr)
                return {'success': False, 'message': f'升级失败: {result.stderr}'}

            new_version = self.webapp_version().get('version', {})
            _write_webapp_history(new_version.get('version', old_version),
                                  new_version.get('build', old_build),
                                  new_version.get('commit', old_commit),
                                  'update', url or file_path, backup_path)
            return {'success': True, 'message': '升级完成，请刷新页面', 'backup_path': backup_path}
        except Exception as e:
            _write_webapp_history(old_version, old_build, old_commit, 'update_failed', url or file_path,
                                  '', False, str(e))
            return {'success': False, 'message': str(e)}

    def webapp_rollback(self):
        try:
            conn = get_db_connection()
            row = conn.execute('''
                SELECT * FROM webapp_history WHERE action IN ('update') AND success = 1
                ORDER BY timestamp DESC LIMIT 1
            ''').fetchone()
            conn.close()
            if not row or not row['backup_path'] or not os.path.exists(row['backup_path']):
                return {'success': False, 'message': '未找到可用的回滚备份'}
            backup_path = row['backup_path']
            result = subprocess.run(
                ['sudo', 'tar', '-xzf', backup_path, '-C', BASE_DIR,
                 '--exclude=backend/data', '--exclude=backups'],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                return {'success': False, 'message': f'回滚失败: {result.stderr}'}
            _write_webapp_history(row['version'], row['build'], row['commit'], 'rollback', backup_path)
            return {'success': True, 'message': '回滚完成，请刷新页面'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def webapp_history(self):
        try:
            conn = get_db_connection()
            rows = [dict(r) for r in conn.execute(
                'SELECT * FROM webapp_history ORDER BY timestamp DESC LIMIT 50'
            ).fetchall()]
            conn.close()
            return {'success': True, 'history': rows}
        except Exception as e:
            return {'success': False, 'message': str(e)}
