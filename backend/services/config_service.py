#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VyOS configuration service.
Wraps vyos.config.Config (read) and vyos.configsession.ConfigSession (write).
"""

import base64
import glob
import json
import os
import re
import subprocess
import tempfile
import time
import traceback
from datetime import datetime
from functools import wraps

import vyos.config
import vyos.configsession
from utils.database import get_db_connection

CONFIG_SESSIONS = {}
APP_NAME = "vyos-web-config"

# Cache for session_changed to avoid expensive Config() creation on every poll
_SESSION_CHANGED_CACHE = {'value': False, 'timestamp': 0}
_SESSION_CHANGED_CACHE_TTL = 3  # seconds

# Sensitive path patterns that may contain secrets
SENSITIVE_PATHS = [
    'pki', 'vpn', 'interfaces openvpn', 'interfaces wireguard',
    'interfaces pppoe', 'service https', 'service ssh', 'system login',
]


def _get_config_session(session_id=None):
    """Get or create a VyOS ConfigSession for the process."""
    if session_id is None:
        session_id = str(os.getpid())
    if session_id not in CONFIG_SESSIONS:
        CONFIG_SESSIONS[session_id] = vyos.configsession.ConfigSession(session_id, app=APP_NAME)
    return CONFIG_SESSIONS[session_id]


def _path_to_list(path):
    if isinstance(path, list):
        return [str(p) for p in path]
    if not path or path == '/':
        return []
    # Handle both space-separated and comma-separated paths
    # URLSearchParams converts arrays to comma-separated strings
    return re.split(r'[\s,]+', str(path).strip())


def _list_to_path(path_list):
    return ' '.join(path_list)


def _run_op_show(args):
    cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'show'] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return '', str(e), 1


def _run_op_mode(script, func, args=None, raw=True):
    """Call a VyOS op-mode Python script under /usr/libexec/vyos/op_mode."""
    cmd = ['python3', '-c',
           f"import sys, json; sys.path.insert(0, '/usr/libexec/vyos/op_mode'); "
           f"import {script}; print(json.dumps({script}.{func}(**({json.dumps(args or {})}))))"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
        return {'stdout': result.stdout, 'stderr': result.stderr, 'rc': result.returncode}
    except Exception as e:
        return {'stdout': '', 'stderr': str(e), 'rc': 1}


def _log_action(username, action, target, data, success=True, error_message='', ip_address='', command=''):
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO audit_log (user_id, action, target, data, timestamp, ip_address, success, error_message, command)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
        ''', (username, action, target, json.dumps(data), ip_address, 1 if success else 0, error_message, command))
        conn.commit()
        conn.close()
    except Exception:
        pass


def _structured_error(code, message, detail='', suggestion='', trace=''):
    return {
        'success': False,
        'code': code,
        'message': message,
        'detail': detail,
        'suggestion': suggestion,
        'trace': trace,
    }


def _encrypt_config(plaintext, password):
    """Encrypt config text with a password using PBKDF2+AES-256-GCM."""
    if not password:
        return plaintext
    try:
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        # Fallback to openssl if cryptography is unavailable
        return _encrypt_openssl(plaintext, password)
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    key = kdf.derive(password.encode('utf-8'))
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    payload = base64.b64encode(salt + nonce + ciphertext).decode('ascii')
    return f'$aes256gcm${payload}'


def _decrypt_config(ciphertext, password):
    """Decrypt config text with a password."""
    if not ciphertext:
        return ''
    if not ciphertext.startswith('$aes256gcm$'):
        return ciphertext
    if not password:
        raise ValueError('需要密码解密配置')
    payload = base64.b64decode(ciphertext[len('$aes256gcm$'):])
    salt, nonce, encrypted = payload[:16], payload[16:28], payload[28:]
    try:
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
        key = kdf.derive(password.encode('utf-8'))
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, encrypted, None)
        return plaintext.decode('utf-8')
    except Exception as e:
        raise ValueError(f'解密失败: {e}')


def _encrypt_openssl(plaintext, password):
    """Fallback encryption using openssl."""
    cmd = ['openssl', 'enc', '-aes-256-cbc', '-salt', '-a', '-pass', f'pass:{password}']
    result = subprocess.run(cmd, input=plaintext, capture_output=True, text=True)
    if result.returncode != 0:
        raise ValueError(f'openssl encryption failed: {result.stderr}')
    return f'$openssl-aes256cbc${result.stdout.strip()}'


def _decrypt_openssl(ciphertext, password):
    """Fallback decryption using openssl."""
    payload = ciphertext[len('$openssl-aes256cbc$'):]
    cmd = ['openssl', 'enc', '-aes-256-cbc', '-d', '-a', '-pass', f'pass:{password}']
    result = subprocess.run(cmd, input=payload, capture_output=True, text=True)
    if result.returncode != 0:
        raise ValueError(f'openssl decryption failed: {result.stderr}')
    return result.stdout


def _handle_config_exception(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except vyos.configsession.ConfigSessionError as e:
            return _structured_error(
                'CONFIG_SESSION_ERROR', str(e), str(e),
                suggestion='请根据 VyOS 命令行返回的报错信息修正配置后重新提交',
                trace=traceback.format_exc()
            )
        except ValueError as e:
            return _structured_error(
                'VALIDATION_ERROR', str(e), str(e),
                suggestion='请检查输入参数格式',
                trace=traceback.format_exc()
            )
        except Exception as e:
            traceback.print_exc()
            return _structured_error(
                'INTERNAL_ERROR', str(e), str(e),
                suggestion='请稍后重试或查看系统日志',
                trace=traceback.format_exc()
            )
    return wrapper


class ConfigService:
    def __init__(self):
        self.menu = self._load_menu()

    def _load_menu(self):
        menu_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'menu.json')
        if os.path.exists(menu_path):
            with open(menu_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    # ---------- read operations ----------

    def _get_config_data(self, cfg, path_list, effective=True):
        """Return config data at path. For leaf nodes return the scalar value."""
        if not path_list:
            return cfg.get_cached_root_dict(effective=effective)
        try:
            return cfg.get_config_dict(path_list, effective=effective, get_first_key=True)
        except TypeError as e:
            if 'not of type dict' in str(e):
                try:
                    return cfg.return_value(path_list)
                except Exception:
                    return None
            raise

    def get_config(self, path):
        """Return config dict at path (effective/running config)."""
        try:
            cfg = vyos.config.Config()
            path_list = _path_to_list(path)
            data = self._get_config_data(cfg, path_list, effective=True)
            return {'success': True, 'path': path, 'data': data}
        except Exception as e:
            return _structured_error('CONFIG_GET_ERROR', str(e), traceback.format_exc(),
                                     suggestion='请检查配置路径是否正确')

    def get_session_config(self, path):
        """Return session (proposed) config at path."""
        try:
            cfg = vyos.config.Config()
            path_list = _path_to_list(path)
            data = self._get_config_data(cfg, path_list, effective=False)
            return {'success': True, 'path': path, 'data': data}
        except Exception as e:
            return _structured_error('CONFIG_GET_ERROR', str(e), traceback.format_exc(),
                                     suggestion='请检查配置路径是否正确')

    def get_commands(self, path):
        """Return CLI commands corresponding to a config path."""
        path_list = _path_to_list(path)
        commands = []
        if path_list:
            commands.append('show ' + _list_to_path(path_list))
        return {'success': True, 'path': path, 'commands': commands}

    def get_menu(self, user):
        username = user.get('username', '')
        menu = self._filter_menu_by_acl(username, self.menu)
        return {'success': True, 'menu': menu}

    def _filter_menu_by_acl(self, username, menu):
        if not username:
            return []
        from services.auth_service import AuthService
        auth = AuthService()
        result = []
        for l1 in menu:
            l1_id = l1.get('id')
            l2_items = []
            for l2 in l1.get('children', []):
                l2_id = l2.get('id')
                l3_items = []
                for l3 in l2.get('children', []):
                    l3_id = l3.get('id')
                    if auth.check_permission(username, l1_id, l2_id, l3_id, 'read'):
                        item = dict(l3)
                        item['permission'] = 'readwrite' if auth.check_permission(username, l1_id, l2_id, l3_id, 'write') else 'read'
                        l3_items.append(item)
                if l3_items or auth.check_permission(username, l1_id, l2_id, None, 'read'):
                    l2_copy = dict(l2)
                    l2_copy['permission'] = 'readwrite' if auth.check_permission(username, l1_id, l2_id, None, 'write') else 'read'
                    l2_copy['children'] = l3_items
                    l2_items.append(l2_copy)
            if l2_items or auth.check_permission(username, l1_id, None, None, 'read'):
                l1_copy = dict(l1)
                l1_copy['permission'] = 'readwrite' if auth.check_permission(username, l1_id, None, None, 'write') else 'read'
                l1_copy['children'] = l2_items
                result.append(l1_copy)
        return result

    def get_firewall_protocols(self):
        protocols = []
        try:
            with open('/etc/protocols', 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    parts = line.split()
                    if len(parts) >= 3:
                        protocols.append({
                            'name': parts[0],
                            'number': int(parts[1]),
                            'aliases': parts[2:],
                            'description': ''
                        })
        except Exception as e:
            return _structured_error('PROTOCOL_READ_ERROR', str(e))
        return {'success': True, 'protocols': protocols}

    def get_firewall_rule_stats(self, path):
        path_list = _path_to_list(path)
        stats = []
        try:
            stdout, stderr, rc = _run_op_show(['firewall'] + path_list + ['statistics'])
            if rc == 0:
                for line in stdout.splitlines():
                    m = re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)', line)
                    if m:
                        stats.append({
                            'rule': m.group(1),
                            'packets': int(m.group(2)),
                            'bytes': int(m.group(3)),
                            'description': m.group(4).strip(),
                        })
            if not stats:
                # Fallback: try nft list chain counters
                try:
                    family = 'ip6' if any('ipv6' in p for p in path_list) else 'ip'
                    chain_args = path_list[1:] if path_list and path_list[0] in ('ipv4', 'ipv6') else path_list
                    chain_name = '_'.join(chain_args).upper()
                    cmd_line = f'sudo nft list chain {family} vyos_filter {chain_name}'
                    result = subprocess.run(cmd_line, shell=True, capture_output=True, text=True, timeout=15)
                    if result.returncode == 0:
                        for line in result.stdout.splitlines():
                            cm = re.search(r'comment "(\d+)".*?counter packets (\d+) bytes (\d+)', line)
                            if cm:
                                stats.append({
                                    'rule': cm.group(1),
                                    'packets': int(cm.group(2)),
                                    'bytes': int(cm.group(3)),
                                    'description': ''
                                })
                except Exception:
                    pass
        except Exception as e:
            return _structured_error('FIREWALL_STATS_ERROR', str(e), traceback.format_exc())
        return {'success': True, 'stats': stats}

    def get_system_info(self):
        try:
            version = _run_op_mode('version', 'show', {'raw': True})
            if isinstance(version, dict):
                version = version.get('stdout', '') if 'stdout' in version else version
            uptime = _run_op_mode('uptime', 'show', {'raw': True})
            hostname = os.uname().nodename
            return {
                'success': True,
                'hostname': hostname,
                'version': version,
                'uptime': uptime,
                'platform': os.uname().machine
            }
        except Exception as e:
            return _structured_error('SYSTEM_INFO_ERROR', str(e), traceback.format_exc())

    def get_revisions(self):
        try:
            revisions = []
            commits_file = '/config/archive/commits'
            if not os.path.exists(commits_file):
                return {'success': True, 'revisions': revisions}

            with open(commits_file, 'r') as f:
                lines = f.readlines()

            for idx, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                # Format: |timestamp|user|source|action|
                parts = line.split('|')
                if len(parts) >= 5:
                    timestamp = int(parts[1])
                    user = parts[2]
                    source = parts[3]
                    action = parts[4]

                    revisions.append({
                        'index': idx,
                        'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                        'user': user,
                        'source': source,
                        'action': action
                    })

            return {'success': True, 'revisions': revisions}
        except Exception as e:
            return _structured_error('REVISION_ERROR', str(e), traceback.format_exc())

    # ---------- write operations ----------

    @_handle_config_exception
    def set_config(self, user, path, value):
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        session = _get_config_session()
        cfg = vyos.config.Config()
        try:
            exists = cfg.exists(path_list)
        except Exception:
            exists = False
        if not exists:
            quota_error = self._check_quota(path_list)
            if quota_error:
                return quota_error
        if isinstance(value, dict):
            try:
                session.delete(path_list)
            except vyos.configsession.ConfigSessionError:
                pass
            self._set_config_dict(session, path_list, value)
        elif isinstance(value, list):
            try:
                session.delete(path_list)
            except vyos.configsession.ConfigSessionError:
                pass
            for v in value:
                session.set(path_list, v)
        else:
            session.set(path_list, value)
        _log_action(username, 'set', _list_to_path(path_list), {'value': value})
        return {'success': True, 'message': '配置已设置'}

    @_handle_config_exception
    def delete_config(self, user, path):
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        # Check references before delete
        refs = self._get_references_for_path(_list_to_path(path_list))
        if refs and not user.get('force_delete'):
            return _structured_error(
                'REFERENCE_EXISTS',
                '该配置项仍被其他配置引用，无法删除',
                detail={'references': refs},
                suggestion='请先移除引用该配置项的规则或启用强制删除'
            )
        session = _get_config_session()
        session.delete(path_list)
        _log_action(username, 'delete', _list_to_path(path_list), {})
        return {'success': True, 'message': '配置已删除'}

    @_handle_config_exception
    def commit_config(self, user):
        username = user.get('username', 'unknown')
        session = _get_config_session()
        out = session.commit()
        _log_action(username, 'commit', '', {'output': out})
        return {'success': True, 'message': '配置提交成功', 'output': out}

    @_handle_config_exception
    def commit_config_with_comment(self, user, comment):
        username = user.get('username', 'unknown')
        session = _get_config_session()
        out = session.commit(comment=comment)
        _log_action(username, 'commit', comment, {'output': out})
        return {'success': True, 'message': '配置提交成功', 'output': out}

    @_handle_config_exception
    def commit_confirm(self, user, minutes=10, comment=''):
        username = user.get('username', 'unknown')
        cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'commit-confirm']
        if comment:
            cmd.extend(['comment', comment])
        result = subprocess.run(cmd, capture_output=True, text=True)
        _log_action(username, 'commit-confirm', str(minutes), {'output': result.stdout, 'comment': comment})
        if result.returncode == 0:
            return {'success': True, 'message': f'配置已提交，{minutes}分钟后自动回滚', 'output': result.stdout}
        return _structured_error('COMMIT_CONFIRM_ERROR', result.stdout or result.stderr)

    @_handle_config_exception
    def confirm(self, user):
        username = user.get('username', 'unknown')
        cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'confirm']
        result = subprocess.run(cmd, capture_output=True, text=True)
        _log_action(username, 'confirm', '', {'output': result.stdout})
        if result.returncode == 0:
            return {'success': True, 'message': '确认成功，取消自动回滚', 'output': result.stdout}
        return _structured_error('CONFIRM_ERROR', result.stdout or result.stderr)

    @_handle_config_exception
    def rollback_soft(self, user, revision):
        username = user.get('username', 'unknown')
        cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'rollback-soft', str(revision)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        _log_action(username, 'rollback-soft', str(revision), {'output': result.stdout})
        if result.returncode == 0:
            return {'success': True, 'message': f'软回滚到版本 {revision} 成功，请比较差异后决定是否 commit', 'output': result.stdout}
        return _structured_error('ROLLBACK_SOFT_ERROR', result.stdout or result.stderr,
                                 suggestion='请检查版本号是否有效')

    @_handle_config_exception
    def discard_config(self, user):
        username = user.get('username', 'unknown')
        session = _get_config_session()
        session.discard()
        _log_action(username, 'discard', '', {})
        return {'success': True, 'message': '未提交变更已丢弃'}

    @_handle_config_exception
    def save_config(self, user, password=''):
        username = user.get('username', 'unknown')
        session = _get_config_session()
        tmp_path = '/tmp/vyos_web_config_save.tmp'
        out = session.save_config(tmp_path)
        _log_action(username, 'save', '', {'output': out})
        return {'success': True, 'message': '配置已保存', 'output': out}

    @_handle_config_exception
    def save_config_to_file(self, user, target, target_type='system'):
        username = user.get('username', 'unknown')
        session = _get_config_session()

        if target_type == 'system':
            # 保存到系统默认配置文件
            out = session.save_config()
            _log_action(username, 'save', 'system', {'output': out})
            return {'success': True, 'message': '配置已保存到系统文件', 'output': out}
        else:
            # 保存到指定文件或远程位置
            # 对于远程协议，需要使用 vyos-op-cmd-wrapper
            if target_type in ['scp', 'sftp', 'ftp', 'tftp', 'http', 'https']:
                cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'save', f'{target_type}://{target}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                _log_action(username, 'save', target, {'output': result.stdout, 'type': target_type})
                if result.returncode == 0:
                    return {'success': True, 'message': f'配置已保存到 {target_type}://{target}', 'output': result.stdout}
                return _structured_error('SAVE_FILE_ERROR', result.stdout or result.stderr)
            else:
                # 本地文件
                out = session.save_config(target)
                _log_action(username, 'save', target, {'output': out})
                return {'success': True, 'message': f'配置已保存到 {target}', 'output': out}

    @_handle_config_exception
    def load_config_from_file(self, user, source, source_type='system'):
        username = user.get('username', 'unknown')
        session = _get_config_session()

        if source_type == 'system':
            # 从系统默认配置文件加载
            out = session.migrate_and_load_config()
            _log_action(username, 'load', 'system', {'output': out})
            return {'success': True, 'message': '已从系统文件加载配置', 'output': out}
        else:
            # 从指定文件或远程位置加载
            if source_type in ['scp', 'sftp', 'ftp', 'tftp', 'http', 'https']:
                cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'load', f'{source_type}://{source}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                _log_action(username, 'load', source, {'output': result.stdout, 'type': source_type})
                if result.returncode == 0:
                    return {'success': True, 'message': f'已从 {source_type}://{source} 加载配置', 'output': result.stdout}
                return _structured_error('LOAD_FILE_ERROR', result.stdout or result.stderr)
            else:
                # 本地文件
                out = session.migrate_and_load_config(source)
                _log_action(username, 'load', source, {'output': out})
                return {'success': True, 'message': f'已从 {source} 加载配置', 'output': out}

    @_handle_config_exception
    def merge_config_from_file(self, user, source, source_type='local'):
        username = user.get('username', 'unknown')

        if source_type in ['scp', 'sftp', 'ftp', 'tftp', 'http', 'https']:
            cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'merge', f'{source_type}://{source}']
            result = subprocess.run(cmd, capture_output=True, text=True)
            _log_action(username, 'merge', source, {'output': result.stdout, 'type': source_type})
            if result.returncode == 0:
                return {'success': True, 'message': f'已从 {source_type}://{source} 合并配置', 'output': result.stdout}
            return _structured_error('MERGE_FILE_ERROR', result.stdout or result.stderr)
        else:
            # 本地文件 - 使用 load 命令实现合并
            session = _get_config_session()
            out = session.migrate_and_load_config(source)
            _log_action(username, 'merge', source, {'output': out})
            return {'success': True, 'message': f'已从 {source} 合并配置', 'output': out}

    @_handle_config_exception
    def add_comment(self, user, path, text):
        username = user.get('username', 'unknown')
        session = _get_config_session()

        if path:
            # 为特定配置路径添加注释
            path_list = _path_to_list(path)
            session.set(path_list + ['comment'], value=text)
            _log_action(username, 'comment', path, {'text': text})
            return {'success': True, 'message': f'已为 {path} 添加注释'}
        else:
            # 为整个配置添加注释（顶层）
            # VyOS 不支持直接为根配置添加注释，需要指定具体路径
            return _structured_error('COMMENT_ERROR', '请指定配置路径')

    @_handle_config_exception
    def rename_config(self, user, path, old_name, new_name):
        username = user.get('username', 'unknown')
        session = _get_config_session()

        if not path:
            return _structured_error('RENAME_ERROR', '请指定配置路径')
        if not old_name:
            return _structured_error('RENAME_ERROR', '请指定旧名称')
        if not new_name:
            return _structured_error('RENAME_ERROR', '请指定新名称')

        # 构建 rename 命令路径
        path_list = _path_to_list(path)
        # 使用 ConfigSession 的 rename 方法
        session.rename(path_list + [old_name], path_list + [new_name])
        _log_action(username, 'rename', path, {'old': old_name, 'new': new_name})
        return {'success': True, 'message': f'已将 {old_name} 重命名为 {new_name}'}

    @_handle_config_exception
    def load_config(self, user, source, password=''):
        username = user.get('username', 'unknown')
        if source.startswith('$') or source.startswith('U2FsdGVkX1'):
            source = _decrypt_config(source, password)
        fd, tmp_path = tempfile.mkstemp(prefix='vyos_load_', suffix='.cfg')
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(source)
            session = _get_config_session()
            out = session.migrate_and_load_config(tmp_path)
            _log_action(username, 'load', '', {'output': out})
            return {'success': True, 'message': '配置已加载', 'output': out}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @_handle_config_exception
    def merge_config(self, user, source):
        return self.load_config(user, source)

    @_handle_config_exception
    def rollback_config(self, user, revision):
        username = user.get('username', 'unknown')
        cmd = ['/opt/vyatta/bin/vyatta-op-cmd-wrapper', 'rollback', str(revision)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        _log_action(username, 'rollback', str(revision), {'output': result.stdout})
        if result.returncode == 0:
            return {'success': True, 'message': '回滚成功', 'output': result.stdout}
        return _structured_error('ROLLBACK_ERROR', result.stdout or result.stderr,
                                 suggestion='请检查版本号是否有效')

    def compare_config(self, left, right):
        try:
            cfg = vyos.config.Config()
            running = cfg.get_cached_root_dict(effective=True)
            session = cfg.get_cached_root_dict(effective=False)
            return {'success': True, 'left': running, 'right': session}
        except Exception as e:
            return _structured_error('COMPARE_ERROR', str(e), traceback.format_exc())

    def import_config(self, user, config_type, data, password='', path=''):
        try:
            if config_type == 'firewall-rules':
                return self._import_firewall_rules(user, path, data)
            elif config_type == 'full':
                return self._import_full_config(user, data, password)
            return _structured_error('UNSUPPORTED_IMPORT', '不支持的导入类型')
        except Exception as e:
            return _structured_error('IMPORT_ERROR', str(e), traceback.format_exc())

    def _import_firewall_rules(self, user, path, data):
        """Import firewall rules from CSV/Excel rows into the VyOS session."""
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        session = _get_config_session()
        imported = 0
        errors = []

        for row in data:
            rule_number = row.get('rule') or row.get('rule_number')
            if rule_number is None:
                continue
            rule_path = path_list + ['rule', str(rule_number)]
            rule_value = {}
            # Map flat CSV columns to VyOS nested dict
            for k, v in row.items():
                if v is None or v == '':
                    continue
                key = k.strip().lower().replace('_', '-')
                if key in ('rule', 'rule-number', 'id'):
                    continue
                if key == 'source-address':
                    rule_value.setdefault('source', {})['address'] = v
                elif key == 'source-port':
                    rule_value.setdefault('source', {})['port'] = v
                elif key == 'destination-address':
                    rule_value.setdefault('destination', {})['address'] = v
                elif key == 'destination-port':
                    rule_value.setdefault('destination', {})['port'] = v
                elif key == 'inbound-interface':
                    rule_value['inbound-interface'] = {'name': v}
                elif key == 'outbound-interface':
                    rule_value['outbound-interface'] = {'name': v}
                elif key == 'log':
                    if str(v).lower() in ('yes', 'enable', 'true', '1'):
                        rule_value['log'] = ''
                elif key == 'disable':
                    if str(v).lower() in ('yes', 'enable', 'true', '1'):
                        rule_value['disable'] = ''
                else:
                    rule_value[key] = v
            try:
                self._set_config_dict(session, rule_path, rule_value)
                imported += 1
            except Exception as e:
                errors.append({'rule': rule_number, 'error': str(e)})
        _log_action(username, 'import_firewall_rules', _list_to_path(path_list),
                    {'imported': imported, 'errors': errors})
        if errors:
            return _structured_error(
                'IMPORT_PARTIAL', '部分规则导入失败',
                detail={'imported': imported, 'errors': errors},
                suggestion='请检查失败规则的字段格式'
            )
        return {'success': True, 'message': '导入成功', 'imported': imported}

    @_handle_config_exception
    def move_firewall_rule(self, user, path, from_rule, to_rule):
        """Move a firewall rule from one number to another."""
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        session = _get_config_session()
        src_path = path_list + ['rule', str(from_rule)]
        dst_path = path_list + ['rule', str(to_rule)]
        cfg = vyos.config.Config()
        try:
            rule_data = cfg.get_config_dict(src_path, effective=False, get_first_key=True)
        except Exception:
            rule_data = {}
        if not rule_data:
            return _structured_error('RULE_NOT_FOUND', f'规则 {from_rule} 不存在')
        session.delete(src_path)
        self._set_config_dict(session, dst_path, rule_data)
        _log_action(username, 'move_firewall_rule', _list_to_path(path_list),
                    {'from': from_rule, 'to': to_rule})
        return {'success': True, 'message': f'规则已从 {from_rule} 移动到 {to_rule}'}

    @_handle_config_exception
    def copy_firewall_rule(self, user, path, from_rule, to_rule):
        """Copy a firewall rule to a new number."""
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        session = _get_config_session()
        src_path = path_list + ['rule', str(from_rule)]
        dst_path = path_list + ['rule', str(to_rule)]
        cfg = vyos.config.Config()
        try:
            rule_data = cfg.get_config_dict(src_path, effective=False, get_first_key=True)
        except Exception:
            rule_data = {}
        if not rule_data:
            return _structured_error('RULE_NOT_FOUND', f'规则 {from_rule} 不存在')
        self._set_config_dict(session, dst_path, rule_data)
        _log_action(username, 'copy_firewall_rule', _list_to_path(path_list),
                    {'from': from_rule, 'to': to_rule})
        return {'success': True, 'message': f'规则已从 {from_rule} 复制到 {to_rule}'}

    def _set_config_dict(self, session, path, value):
        """Recursively set a config dict using session.set for leafless nodes."""
        if isinstance(value, dict):
            for k, v in value.items():
                self._set_config_dict(session, path + [k], v)
        elif isinstance(value, list):
            for v in value:
                self._set_config_dict(session, path, v)
        elif value == '' or value is None or value is True:
            session.set(path)
        else:
            session.set(path, str(value))

    @_handle_config_exception
    def clear_firewall_counters(self, user, path):
        """Clear firewall counters for a given chain/path."""
        username = user.get('username', 'unknown')
        path_list = _path_to_list(path)
        # Try VyOS op-mode wrapper first
        stdout, stderr, rc = _run_op_show(['firewall'] + path_list + ['clear-counters'])
        if rc != 0:
            # Fallback: reset all nft counters
            result = subprocess.run(['sudo', 'nft', 'reset', 'counters'],
                                    capture_output=True, text=True, timeout=15)
            rc = result.returncode
            stderr = result.stderr
            stdout = result.stdout
        if rc != 0:
            return _structured_error('CLEAR_COUNTERS_ERROR', stderr or '清空计数器失败')
        _log_action(username, 'clear_firewall_counters', _list_to_path(path_list), {})
        return {'success': True, 'message': '计数器已清空', 'output': stdout}

    def _import_full_config(self, user, data, password):
        if data.startswith('$') or data.startswith('U2FsdGVkX1'):
            data = _decrypt_config(data, password)
        return self.load_config(user, data)

    def export_config(self, user, password='', include_sensitive=True):
        try:
            cfg = vyos.config.Config()
            data = cfg.show_config([], default='', effective=True)
            if not include_sensitive:
                for pattern in SENSITIVE_PATHS:
                    data = re.sub(rf'(^|\n)({re.escape(pattern)} [^\n]+(\n(?!set )[^\n]+)*)', '', data)
            encrypted = _encrypt_config(data, password)
            return {'success': True, 'config': encrypted, 'encrypted': bool(password)}
        except Exception as e:
            return _structured_error('EXPORT_ERROR', str(e), traceback.format_exc())

    def session_changed(self):
        """Check if config session has changed, with caching to avoid expensive Config() creation."""
        now = time.time()
        cache = _SESSION_CHANGED_CACHE
        if now - cache['timestamp'] < _SESSION_CHANGED_CACHE_TTL:
            return {'success': True, 'changed': cache['value']}
        try:
            cfg = vyos.config.Config()
            changed = cfg.session_changed()
            cache['value'] = changed
            cache['timestamp'] = now
            return {'success': True, 'changed': changed}
        except Exception as e:
            return _structured_error('SESSION_CHANGED_ERROR', str(e), traceback.format_exc())

    # ---------- quotas ----------

    def _path_to_quota_info(self, path_list):
        """Map a config path to (quota_type, parent_path_for_counting)."""
        if len(path_list) < 2:
            return None, None
        # firewall ipv4 forward filter rule N -> firewall-rule, parent = ... rule
        if path_list[0] == 'firewall' and 'rule' in path_list:
            idx = path_list.index('rule')
            return 'firewall-rule', path_list[:idx + 1]
        if path_list[0] == 'nat' and 'rule' in path_list:
            idx = path_list.index('rule')
            return 'nat-rule', path_list[:idx + 1]
        if path_list[0] == 'firewall' and path_list[1] == 'group':
            return 'firewall-group', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'policy' and path_list[1] in ('route', 'route6'):
            return 'policy-route', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'policy' and path_list[1] in ('prefix-list', 'prefix-list6'):
            return 'prefix-list', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'policy' and path_list[1] == 'route-map':
            return 'route-map', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'policy' and path_list[1] in ('access-list', 'access-list6'):
            return 'access-list', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'policy' and path_list[1] == 'community-list':
            return 'community-list', path_list[:3] if len(path_list) >= 3 else path_list
        if path_list[0] == 'system' and path_list[1] == 'netns':
            return 'netns', path_list[:2]
        if path_list[0] == 'system' and path_list[1] == 'vrf':
            return 'vrf', path_list[:2]
        if path_list[0] == 'system' and path_list[1] == 'container':
            return 'container', path_list[:2]
        return None, None

    def _check_quota(self, path_list):
        """Check whether creating the given path would exceed quota."""
        quota_type, parent_path = self._path_to_quota_info(path_list)
        if not quota_type or not parent_path:
            return None
        try:
            conn = get_db_connection()
            row = conn.execute('SELECT max_entries FROM quotas WHERE table_type = ?', (quota_type,)).fetchone()
            conn.close()
            if not row:
                return None
            max_entries = row['max_entries']
            cfg = vyos.config.Config()
            try:
                existing = cfg.get_config_dict(parent_path, effective=False, get_first_key=True)
            except Exception:
                existing = {}
            if isinstance(existing, dict):
                count = len(existing)
                if count >= max_entries:
                    return _structured_error(
                        'QUOTA_EXCEEDED',
                        f'{quota_type} 已达到最大条目数 {max_entries}',
                        suggestion='请删除无用条目或提高表项规格后再创建'
                    )
        except Exception:
            pass
        return None

    def get_quota(self, table_type):
        try:
            conn = get_db_connection()
            row = conn.execute('SELECT * FROM quotas WHERE table_type = ?', (table_type,)).fetchone()
            conn.close()
            if row:
                return {'success': True, 'table_type': table_type, 'max_entries': row['max_entries']}
            return _structured_error('QUOTA_NOT_FOUND', f'未找到 {table_type} 的配额设置')
        except Exception as e:
            return _structured_error('QUOTA_ERROR', str(e), traceback.format_exc())

    def set_quota(self, user, table_type, max_entries):
        try:
            max_entries = int(max_entries)
            if not 1 <= max_entries <= 65535:
                return _structured_error('QUOTA_RANGE_ERROR', '配额范围必须在 1-65535 之间')
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO quotas (table_type, max_entries) VALUES (?, ?)
                ON CONFLICT(table_type) DO UPDATE SET max_entries=excluded.max_entries,
                    updated_at=CURRENT_TIMESTAMP
            ''', (table_type, max_entries))
            conn.commit()
            conn.close()
            _log_action(user.get('username', 'unknown'), 'set_quota', table_type, {'max_entries': max_entries})
            return {'success': True, 'table_type': table_type, 'max_entries': max_entries}
        except Exception as e:
            return _structured_error('QUOTA_ERROR', str(e), traceback.format_exc())

    def list_quotas(self):
        try:
            conn = get_db_connection()
            rows = [dict(r) for r in conn.execute('SELECT * FROM quotas ORDER BY table_type')]
            conn.close()
            return {'success': True, 'quotas': rows}
        except Exception as e:
            return _structured_error('QUOTA_ERROR', str(e), traceback.format_exc())

    # ---------- references ----------

    def get_references(self, path, direction='outgoing'):
        try:
            conn = get_db_connection()
            if direction == 'incoming':
                rows = conn.execute('''
                    SELECT * FROM "references" WHERE target_path = ? ORDER BY timestamp DESC
                ''', (path,)).fetchall()
            elif direction == 'all':
                rows = conn.execute('''
                    SELECT * FROM "references" WHERE source_path = ? OR target_path = ? ORDER BY timestamp DESC
                ''', (path, path)).fetchall()
            else:
                rows = conn.execute('''
                    SELECT * FROM "references" WHERE source_path = ? ORDER BY timestamp DESC
                ''', (path,)).fetchall()
            conn.close()
            return {'success': True, 'path': path, 'direction': direction,
                    'references': [dict(r) for r in rows]}
        except Exception as e:
            return _structured_error('REFERENCE_ERROR', str(e), traceback.format_exc())

    def add_reference(self, source_path, target_path, relationship='uses'):
        try:
            conn = get_db_connection()
            conn.execute('''
                INSERT OR IGNORE INTO "references" (source_path, target_path, relationship)
                VALUES (?, ?, ?)
            ''', (source_path, target_path, relationship))
            conn.commit()
            conn.close()
            return {'success': True}
        except Exception as e:
            return _structured_error('REFERENCE_ERROR', str(e), traceback.format_exc())

    def remove_reference(self, source_path, target_path=None):
        try:
            conn = get_db_connection()
            if target_path:
                conn.execute('''
                    DELETE FROM "references" WHERE source_path = ? AND target_path = ?
                ''', (source_path, target_path))
            else:
                conn.execute('DELETE FROM "references" WHERE source_path = ?', (source_path,))
            conn.commit()
            conn.close()
            return {'success': True}
        except Exception as e:
            return _structured_error('REFERENCE_ERROR', str(e), traceback.format_exc())

    def check_references_before_delete(self, path):
        refs = self._get_references_for_path(path)
        return {'success': True, 'can_delete': not refs, 'references': refs}

    def _get_references_for_path(self, path):
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT * FROM "references" WHERE target_path = ? OR target_path LIKE ?
        ''', (path, path + ' %')).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ---------- dynamic suggestions ----------

    def get_suggestions(self, path, field):
        """Return suggestion list for a dynamic form field based on config path/field."""
        path_list = _path_to_list(path or '')
        try:
            suggestions = []
            parent_key = path_list[-1] if path_list else ''
            grandparent = path_list[-2] if len(path_list) > 1 else ''

            # Interface names
            if field == 'name' and parent_key in ('inbound-interface', 'outbound-interface'):
                suggestions = self._list_interfaces()
            # Interface groups
            elif field == 'group' and parent_key in ('inbound-interface', 'outbound-interface'):
                suggestions = self._list_config_keys(['firewall', 'group', 'interface-group'])
            # Firewall groups
            elif field == 'address-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'address-group'])
            elif field == 'network-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'network-group'])
            elif field == 'port-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'port-group'])
            elif field == 'domain-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'domain-group'])
            elif field == 'mac-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'mac-group'])
            elif field == 'dynamic-address-group':
                suggestions = self._list_config_keys(['firewall', 'group', 'dynamic-group'])
            # Firewall chain targets (jump-target)
            elif field == 'jump-target':
                suggestions = self._list_firewall_chains(path_list)
            # Flowtable offload targets
            elif field == 'offload-target':
                suggestions = self._list_config_keys(['firewall', 'flowtable'])
            # Protocols
            elif field == 'protocol':
                suggestions = self._list_protocols()
            # Mark / connection-mark plain text suggestions from current marks
            elif field in ('mark', 'connection-mark'):
                suggestions = []

            return {'success': True, 'path': path, 'field': field, 'suggestions': suggestions}
        except Exception as e:
            return _structured_error('SUGGESTIONS_ERROR', str(e), traceback.format_exc())

    def _list_interfaces(self):
        try:
            stdout, stderr, rc = _run_op_show(['interfaces'])
            if rc == 0:
                # Parse lines like "eth0        ..." or "Codes: ..."
                names = set()
                for line in stdout.splitlines():
                    parts = line.split()
                    if not parts:
                        continue
                    name = parts[0]
                    if name.startswith(('eth', 'br', 'bond', 'lo', 'tun', 'vtun', 'wg', 'ppp', 'pppoe', 'vxlan', 'dum', 'ifb', 'wlan')):
                        names.add(name)
                return sorted(names)
        except Exception:
            pass
        return []

    def _list_config_keys(self, config_path):
        try:
            cfg = vyos.config.Config()
            data = cfg.get_config_dict(config_path, effective=True, get_first_key=True)
            if isinstance(data, dict):
                return sorted(data.keys())
        except Exception:
            pass
        return []

    def _list_firewall_chains(self, path_list):
        """List available firewall chains for jump target."""
        chains = []
        try:
            cfg = vyos.config.Config()
            # Custom chains under firewall ipv4 name / ipv6 name / bridge name
            for family in ['ipv4', 'ipv6', 'bridge']:
                try:
                    data = cfg.get_config_dict(['firewall', family, 'name'], effective=True, get_first_key=True)
                    if isinstance(data, dict):
                        chains.extend(data.keys())
                except Exception:
                    pass
        except Exception:
            pass
        return sorted(set(chains))

    def _list_protocols(self):
        protocols = ['all', 'tcp_udp', 'icmp', 'tcp', 'udp']
        try:
            with open('/etc/protocols', 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    parts = line.split()
                    if parts and parts[0] not in protocols:
                        protocols.append(parts[0])
        except Exception:
            pass
        return protocols

    # ---------- help documentation ----------

    def get_help(self, path):
        """Return help markdown content for a given frontend route path."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            docs_dir = os.path.join(base_dir, 'docs')
            mapping_file = os.path.join(base_dir, 'backend', 'data', 'help_mapping.json')

            # Try mapping file first
            mapped_file = None
            if os.path.exists(mapping_file):
                try:
                    with open(mapping_file, 'r', encoding='utf-8') as f:
                        mapping = json.load(f)
                    mapped = mapping.get(path)
                    if mapped:
                        mapped_file = os.path.join(docs_dir, mapped)
                except Exception:
                    pass

            # Fallback: docs/{sanitized_path}.md
            if not mapped_file or not os.path.exists(mapped_file):
                safe_path = re.sub(r'[^\w\-/.]', '_', path).strip('/').replace('/', '_')
                if not safe_path:
                    safe_path = 'index'
                mapped_file = os.path.join(docs_dir, f'{safe_path}.md')

            if os.path.exists(mapped_file) and os.path.isfile(mapped_file):
                with open(mapped_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                return {'success': True, 'path': path, 'content': content}

            # Final fallback: return a default hint with the expected file path
            return {
                'success': True,
                'path': path,
                'content': f'暂无 {path} 的帮助文档。\n可在 {mapped_file} 添加 Markdown 格式的帮助内容。'
            }
        except Exception as e:
            return _structured_error('HELP_ERROR', str(e), traceback.format_exc())

    # ---------- conntrack log config ----------

    def get_conntrack_log_config(self):
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
            return _structured_error('CONNTRACK_LOG_CONFIG_ERROR', str(e), traceback.format_exc())

    def set_conntrack_log_config(self, user, enabled, level='info',
                                  tcp=False, udp=False, icmp=False, other=False):
        try:
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO firewall_log_config (id, conntrack_enabled, conntrack_level,
                    conntrack_tcp, conntrack_udp, conntrack_icmp, conntrack_other)
                VALUES (1, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    conntrack_enabled=excluded.conntrack_enabled,
                    conntrack_level=excluded.conntrack_level,
                    conntrack_tcp=excluded.conntrack_tcp,
                    conntrack_udp=excluded.conntrack_udp,
                    conntrack_icmp=excluded.conntrack_icmp,
                    conntrack_other=excluded.conntrack_other,
                    updated_at=CURRENT_TIMESTAMP
            ''', (1 if enabled else 0, level,
                 1 if tcp else 0, 1 if udp else 0, 1 if icmp else 0, 1 if other else 0))
            conn.commit()
            conn.close()
            _log_action(user.get('username', 'unknown'), 'set_conntrack_log', '',
                        {'enabled': enabled, 'level': level,
                         'tcp': tcp, 'udp': udp, 'icmp': icmp, 'other': other})
            return {
                'success': True, 'conntrack_enabled': enabled, 'conntrack_level': level,
                'conntrack_tcp': tcp, 'conntrack_udp': udp,
                'conntrack_icmp': icmp, 'conntrack_other': other,
            }
        except Exception as e:
            return _structured_error('CONNTRACK_LOG_CONFIG_ERROR', str(e), traceback.format_exc())
