#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
System maintenance and webapp upgrade service.
"""

import json
import os
import pty
import re
import select
import subprocess
import time

from utils.database import get_db_connection
from services.notification_service import NotificationService


BASE_DIR = '/opt/vyos-web-config'
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')


def _run_command(cmd, input_text=None, timeout=30):
    try:
        result = subprocess.run(cmd, input=input_text, capture_output=True, text=True, timeout=timeout)
        if result.returncode == 0:
            return {
                'success': True,
                'output': result.stdout,
                'returncode': result.returncode
            }
        else:
            return {
                'success': False,
                'message': result.stderr.strip() or f'Command failed with return code {result.returncode}',
                'output': result.stdout + result.stderr,
                'returncode': result.returncode
            }
    except Exception as e:
        return {'success': False, 'message': str(e), 'output': str(e), 'returncode': -1}


def _run_interactive_command(cmd, input_lines=None, timeout=60, idle_threshold=5.0):
    """Run an interactive command using PTY with proper output capture."""
    if input_lines is None:
        input_lines = []

    import pty
    import select as select_mod

    master_fd, slave_fd = pty.openpty()
    try:
        proc = subprocess.Popen(
            cmd,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            close_fds=True,
            preexec_fn=os.setsid,  # Detach from controlling terminal
        )
        os.close(slave_fd)

        output_chunks = []
        input_idx = 0
        start_time = time.time()
        idle_start = time.time()
        IDLE_THRESHOLD = idle_threshold  # seconds of no output before sending next input

        while proc.poll() is None:
            if time.time() - start_time > timeout:
                proc.kill()
                proc.wait()
                return {
                    'success': False,
                    'message': f'Command timed out after {timeout}s',
                    'output': ''.join(output_chunks),
                    'returncode': -1
                }

            ready, _, _ = select_mod.select([master_fd], [], [], 0.5)
            if ready:
                try:
                    data = os.read(master_fd, 1024)
                    if data:
                        output_chunks.append(data.decode('utf-8', errors='replace'))
                        idle_start = time.time()
                except OSError:
                    break

            # If idle for IDLE_THRESHOLD seconds, send next input line
            if input_idx < len(input_lines) and (time.time() - idle_start) > IDLE_THRESHOLD:
                line = input_lines[input_idx]
                try:
                    os.write(master_fd, (line + '\n').encode('utf-8'))
                    input_idx += 1
                    idle_start = time.time()
                except OSError:
                    break

        # Drain remaining output
        try:
            while True:
                ready, _, _ = select_mod.select([master_fd], [], [], 0.5)
                if ready:
                    try:
                        data = os.read(master_fd, 1024)
                        if data:
                            output_chunks.append(data.decode('utf-8', errors='replace'))
                        else:
                            break
                    except OSError:
                        break
                else:
                    break
        except OSError:
            pass

        proc.wait()
        full_output = ''.join(output_chunks)

        if proc.returncode == 0:
            return {
                'success': True,
                'output': full_output,
                'returncode': proc.returncode
            }
        else:
            return {
                'success': False,
                'message': f'Command failed with return code {proc.returncode}',
                'output': full_output,
                'returncode': proc.returncode
            }
    except Exception as e:
        return {'success': False, 'message': str(e), 'output': str(e), 'returncode': -1}
    finally:
        try:
            os.close(master_fd)
        except OSError:
            pass


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
        
        cmd_parts = command.split()
        # Security: only allow alphanumerics, hyphens, slashes, dots, colons, and question marks
        for part in cmd_parts:
            if not re.match(r'^[\w\.\-/:?]+$', part):
                return {'success': False, 'message': '命令包含非法字符'}
        
        # Handle help command (?)
        if command.strip() == '?':
            return {
                'success': True,
                'output': '可用命令:\n  show <command>     - 显示系统信息\n  clear <command>    - 清除统计信息\n  restart <service>  - 重启服务\n  configure          - 进入配置模式\n  exit               - 退出\n  help               - 显示帮助\n  ?                  - 显示帮助',
                'returncode': 0
            }
        
        # Use vyatta-op-cmd-wrapper for VyOS commands
        vyos_commands = ['show', 'clear', 'restart', 'update', 'execute', 'reset', 'add', 'delete', 'set', 'get', 'run', 'configure', 'exit', 'help']
        if cmd_parts[0] in vyos_commands:
            result = _run_command(['/opt/vyatta/bin/vyatta-op-cmd-wrapper'] + cmd_parts, timeout=30)
            # For help commands (?), always return success since the wrapper doesn't support ? syntax
            if '?' in command:
                result['success'] = True
                if not result.get('output'):
                    result['output'] = '帮助信息不可用，请使用 --help 参数'
            return result
        
        # For other commands, execute directly
        return _run_command(cmd_parts, timeout=30)

    def reset_config(self):
        """Reset configuration to factory defaults."""
        return _run_command(['sudo', '/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'reset', 'configuration'])

    def reboot(self):
        try:
            NotificationService().add(
                'reboot',
                '系统重启',
                '系统正在重启',
                {}
            )
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

    def generate_command(self, command_type, args=None, user=None, config_service=None):
        """Run generate commands: firewall-rule-resequence, ipsec, openvpn, wireguard, pki, ssh, etc."""
        args = args or {}
        handlers = {
            'firewall-rule-resequence': lambda: self._generate_firewall_resequence(args),
            'wireguard': lambda: self._generate_wireguard(args),
            'openvpn': lambda: self._generate_openvpn(args),
            'ipsec': lambda: self._generate_ipsec(args),
            'pki': lambda: self._generate_pki(args, user=user, config_service=config_service),
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

    def _generate_pki(self, args, user=None, config_service=None):
        """Generate PKI materials."""
        cert_type = args.get('type', 'ca')
        input_text = args.get('input', '')
        cmd_args = args.get('args', [])
        input_lines = input_text.split('\n') if input_text else []

        # Parse command args to detect action
        filename = None
        install_name = None
        action = 'generate'
        if 'file' in cmd_args:
            idx = cmd_args.index('file')
            if idx + 1 < len(cmd_args):
                filename = cmd_args[idx + 1]
                action = 'file'
        elif 'install' in cmd_args:
            idx = cmd_args.index('install')
            if idx + 1 < len(cmd_args):
                install_name = cmd_args[idx + 1]
                action = 'install'

        # Validate filename for file action
        if action == 'file':
            if not filename or not filename.strip():
                return {'success': False, 'message': '文件名为必填项', 'output': '', 'returncode': -1}
            cert_filename = filename if filename.endswith('.pem') else filename + '.pem'
            pki_dir = '/config/auth'
            cert_path = os.path.join(pki_dir, cert_filename)
            if os.path.exists(cert_path):
                return {'success': False, 'message': f'文件 {cert_filename} 已存在，请使用其他文件名', 'output': '', 'returncode': -1}
            key_filename = cert_filename[:-4] + '.key'
            key_path = os.path.join(pki_dir, key_filename)
            if os.path.exists(key_path):
                return {'success': False, 'message': f'文件 {key_filename} 已存在，请使用其他文件名', 'output': '', 'returncode': -1}

        # Validate install name
        if action == 'install':
            if not install_name or not install_name.strip():
                return {'success': False, 'message': '安装名称为必填项', 'output': '', 'returncode': -1}

        # For file action, use Python PKI API directly
        if action == 'file':
            return self._generate_pki_python(cert_type, input_lines, filename)

        # For install action, use Python PKI API + set VyOS config
        if action == 'install':
            return self._install_pki(cert_type, input_lines, install_name)

        # For generate action, use Python PKI API and return content
        if action == 'generate':
            return self._generate_pki_content(cert_type, input_lines)

        # For generate action, use PTY interactive command
        cmd_parts = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'generate', 'pki', cert_type]
        import logging
        _pki_logger = logging.getLogger('pki')
        _pki_logger.info(f'[PKI] Running: {" ".join(cmd_parts)} with {len(input_lines)} inputs')
        return _run_interactive_command(cmd_parts, input_lines=input_lines, timeout=120)

    def _generate_pki_content(self, cert_type, input_lines):
        """Generate PKI using Python API and return content."""
        try:
            import sys
            sys.path.insert(0, '/usr/lib/python3/dist-packages')
            from vyos.pki import (
                create_private_key, create_certificate_request,
                create_certificate, encode_certificate, encode_private_key
            )
        except ImportError as e:
            return {'success': False, 'message': f'无法导入 VyOS PKI 模块: {e}', 'output': '', 'returncode': -1}

        # Parse input lines - frontend sends 9 inputs for CA:
        # p0=keyType, p1=keyBits, p2=country, p3=state, p4=locality,
        # p5=organization, p6=commonName, p7=validityDays, p8=encryptKey(y/N)
        p = {}
        for i, line in enumerate(input_lines):
            p[f'p{i}'] = line.strip() if line else ''

        key_type = p.get('p0', 'rsa') or 'rsa'
        key_size = int(p.get('p1', '2048') or '2048')
        country = p.get('p2', 'CN') or 'CN'
        state = p.get('p3', '') or ''
        locality = p.get('p4', '') or ''
        organization = p.get('p5', '') or ''
        common_name = p.get('p6', 'vyos.io') or 'vyos.io'
        valid_days = int(p.get('p7', '1825') or '1825')
        encrypt_key = (p.get('p8', 'N') or 'N').lower() in ('y', 'yes', 'true', '1')
        passphrase = p.get('p9', '') if encrypt_key else None

        try:
            private_key = create_private_key(key_type, key_size)
            subject = {
                'country': country, 'state': state, 'locality': locality,
                'organization': organization, 'common_name': common_name,
            }
            cert_req = create_certificate_request(subject, private_key, None)
            cert = create_certificate(cert_req, cert_req, private_key, valid_days, None, True, False)
            cert_pem = encode_certificate(cert)
            key_pem = encode_private_key(private_key, passphrase=passphrase)

            # encode_certificate/encode_private_key already return full PEM with headers
            return {
                'success': True,
                'output': cert_pem,
                'returncode': 0,
                'certContent': cert_pem,
                'keyContent': key_pem,
            }
        except Exception as e:
            return {'success': False, 'message': f'生成失败: {e}', 'output': str(e), 'returncode': -1}

    def _generate_pki_python(self, cert_type, input_lines, filename):
        """Generate PKI using Python API and write to files."""
        try:
            import sys
            sys.path.insert(0, '/usr/lib/python3/dist-packages')
            from vyos.pki import (
                create_private_key, create_certificate_request,
                create_certificate, encode_certificate, encode_private_key
            )
        except ImportError as e:
            return {'success': False, 'message': f'无法导入 VyOS PKI 模块: {e}', 'output': '', 'returncode': -1}

        # Parse input lines - frontend sends 9 inputs for CA:
        # p0=keyType, p1=keyBits, p2=country, p3=state, p4=locality,
        # p5=organization, p6=commonName, p7=validityDays, p8=encryptKey(y/N)
        p = {}
        for i, line in enumerate(input_lines):
            p[f'p{i}'] = line.strip() if line else ''

        key_type = p.get('p0', 'rsa') or 'rsa'
        key_size = int(p.get('p1', '2048') or '2048')
        country = p.get('p2', 'CN') or 'CN'
        state = p.get('p3', '') or ''
        locality = p.get('p4', '') or ''
        organization = p.get('p5', '') or ''
        common_name = p.get('p6', 'vyos.io') or 'vyos.io'
        valid_days = int(p.get('p7', '1825') or '1825')
        encrypt_key = (p.get('p8', 'N') or 'N').lower() in ('y', 'yes', 'true', '1')
        passphrase = p.get('p9', '') if encrypt_key else None

        try:
            private_key = create_private_key(key_type, key_size)
            subject = {
                'country': country, 'state': state, 'locality': locality,
                'organization': organization, 'common_name': common_name,
            }
            cert_req = create_certificate_request(subject, private_key, None)
            cert = create_certificate(cert_req, cert_req, private_key, valid_days, None, True, False)
            cert_pem = encode_certificate(cert)
            key_pem = encode_private_key(private_key, passphrase=passphrase)

            pki_dir = '/config/auth'
            os.makedirs(pki_dir, exist_ok=True)

            cert_filename = filename if filename.endswith('.pem') else filename + '.pem'
            cert_path = os.path.join(pki_dir, cert_filename)
            key_filename = cert_filename[:-4] + '.key'
            key_path = os.path.join(pki_dir, key_filename)
            with open(cert_path, 'w') as f:
                f.write(cert_pem)
            with open(key_path, 'w') as f:
                f.write(key_pem)
            return {
                'success': True,
                'output': f'证书已写入: {cert_path}\n私钥已写入: {key_path}',
                'returncode': 0,
                'generatedFiles': [cert_filename, key_filename]
            }
        except Exception as e:
            return {'success': False, 'message': f'生成失败: {e}', 'output': str(e), 'returncode': -1}

    def _install_pki(self, cert_type, input_lines, install_name):
        """Generate PKI via pki.py script (non-interactive, same as CLI: run generate pki ca install <name>)."""
        import logging
        _pki_logger = logging.getLogger('pki_install')

        # Actual command: /usr/libexec/vyos/op_mode/pki.py generate_pki --pki-type ca --name <name> --install
        cmd = [
            '/usr/libexec/vyos/op_mode/pki.py',
            'generate_pki',
            '--pki-type', cert_type,
            '--name', install_name,
            '--install'
        ]
        _pki_logger.info(f'[PKI install] Running: {" ".join(cmd)}')

        return _run_command(cmd, timeout=120)

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
