#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VyOS configuration service.
Wraps vyos.config.Config (read) and vyos.configsession.ConfigSession (write).
"""

import base64
import glob
import json
import logging
import os
import re
import subprocess
import tempfile
import threading
import time
import traceback
from datetime import datetime
from functools import wraps

from utils.database import get_db_connection
from services.config_reader_client import read_config as _daemon_read_config
from services.config_reader_client import reload_config as _daemon_reload_config

_logger = logging.getLogger('config_service')

# Token-based config session management
# Each login token gets its own independent ConfigSession
# {token: {'session': ConfigSession, 'username': str, 'last_active': float}}
TOKEN_CONFIG_SESSIONS = {}
_TOKEN_SESSIONS_LOCK = threading.Lock()
_CONFIG_ENV_LOCK = threading.Lock()
APP_NAME = "vyos-web-config"
SESSION_TIMEOUT = 1800  # 30 minutes
HEARTBEAT_INTERVAL = 300  # 5 minutes - keep sessions alive

# Cache for session_changed to avoid expensive Config() creation on every poll
_SESSION_CHANGED_CACHE = {'value': False, 'timestamp': 0}
_SESSION_CHANGED_CACHE_TTL = 3  # seconds


class _SafeConfigEnv:
    """Context manager to safely use vyos.config.Config() without corrupting
    the global os.environ that ConfigSession instances depend on.

    vyos.config.Config() mutates os.environ on construction. Since
    ConfigSession.__init__ stores a reference to os.environ (not a copy),
    those mutations break existing sessions. We swap the os.environ object
    reference (not mutate in-place) to avoid triggering putenv/unsetenv
    syscalls that would create a window of empty process environment.
    """

    def __init__(self):
        self._old_environ = None

    def __enter__(self):
        # Lock so concurrent threads don't interleave env swap
        _CONFIG_ENV_LOCK.acquire()
        # Save the current os.environ reference and replace with a copy.
        # Config() will mutate this copy; the original reference is preserved.
        self._old_environ = os.environ
        _logger.debug(f'[SafeConfigEnv] ENTER: saved os.environ id={id(os.environ)}, replacing with new dict id={id(dict(os.environ))}')
        os.environ = dict(os.environ)
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            # Restore os.environ to the original object reference.
            # No clear()/update() — that would trigger putenv/unsetenv syscalls
            # and create a window where the process env is empty, which can
            # break ConfigSession.__run_command subprocess calls.
            _logger.debug(f'[SafeConfigEnv] EXIT: restoring os.environ id={id(self._old_environ)}, current id={id(os.environ)}')
            os.environ = self._old_environ
        finally:
            _CONFIG_ENV_LOCK.release()


def _get_token(user):
    """Extract token from user dict. Falls back to PID for backward compat."""
    return user.get('_token', str(os.getpid()))


def _create_config_session(token):
    """Create a new VyOS ConfigSession for the given token."""
    session_id = f"web-{token[:32]}"
    _logger.info(f'[ConfigSession] Creating new session: session_id={session_id}')
    # CRITICAL: ConfigSession stores a reference to os.environ and modifies it
    # during operations (session.set, show_config, etc.). If we use the global
    # os.environ, these modifications corrupt the session for subsequent calls.
    #
    # Solution: Create an isolated copy of os.environ for each session.
    # The session will modify its own copy, leaving the global os.environ intact.
    with _CONFIG_ENV_LOCK:
        # Save original os.environ
        original_environ = os.environ
        # Create isolated copy for this session
        session_environ = dict(original_environ)
        # Temporarily replace os.environ with the isolated copy
        os.environ = session_environ
        try:
            import vyos.configsession
            session = vyos.configsession.ConfigSession(session_id, app=APP_NAME)
            # Verify the session is using our isolated copy
            session_env_attr = session._ConfigSession__session_env
            _logger.info(f'[ConfigSession] Created: session.__session_env id={id(session_env_attr)}, is session_environ: {session_env_attr is session_environ}')
        except Exception as e:
            _logger.error(f'[ConfigSession] FAILED to create: {e}', exc_info=True)
            raise
        finally:
            # Restore global os.environ. The session keeps its reference to session_environ.
            os.environ = original_environ
            _logger.info(f'[ConfigSession] Restored os.environ id={id(os.environ)}, session env id={id(session_environ)}')
    return session


def _get_config_session(token, _retry=False):
    """Get or create a VyOS ConfigSession for the given token (lazy creation)."""
    with _TOKEN_SESSIONS_LOCK:
        if token not in TOKEN_CONFIG_SESSIONS:
            session = _create_config_session(token)
            TOKEN_CONFIG_SESSIONS[token] = {
                'session': session,
                'username': '',
                'last_active': time.time()
            }
            _logger.info(f'[ConfigSession] Registered token session: token={token[:20]}..., sessions count={len(TOKEN_CONFIG_SESSIONS)}')
        else:
            _logger.debug(f'[ConfigSession] Reusing existing session: token={token[:20]}...')
        TOKEN_CONFIG_SESSIONS[token]['last_active'] = time.time()
        return TOKEN_CONFIG_SESSIONS[token]['session']


def _invalidate_and_recreate_session(token):
    """Invalidate expired session and create a new one. Called when session operations fail."""
    with _TOKEN_SESSIONS_LOCK:
        if token in TOKEN_CONFIG_SESSIONS:
            _logger.warning(f'[ConfigSession] Invalidating expired session: token={token[:20]}...')
            del TOKEN_CONFIG_SESSIONS[token]
    return _get_config_session(token)


def _heartbeat_sessions():
    """Background thread to keep all active config sessions alive."""
    _logger.info(f'[Heartbeat] Started with interval={HEARTBEAT_INTERVAL}s')
    while True:
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            with _TOKEN_SESSIONS_LOCK:
                tokens = list(TOKEN_CONFIG_SESSIONS.keys())
            for token in tokens:
                try:
                    with _TOKEN_SESSIONS_LOCK:
                        session = TOKEN_CONFIG_SESSIONS.get(token, {}).get('session')
                    if session:
                        # Perform a lightweight operation to keep session alive
                        session.show_config([], format='raw')
                        _logger.debug(f'[Heartbeat] Kept session alive: token={token[:20]}...')
                except Exception as e:
                    _logger.warning(f'[Heartbeat] Failed to keep session alive: token={token[:20]}..., error={e}')
        except Exception as e:
            _logger.error(f'[Heartbeat] Heartbeat loop error: {e}', exc_info=True)


# Start heartbeat thread when module is imported
_heartbeat_thread = threading.Thread(target=_heartbeat_sessions, daemon=True)
_heartbeat_thread.start()


def _update_session_username(token, username):
    """Update the username associated with a token session."""
    with _TOKEN_SESSIONS_LOCK:
        if token in TOKEN_CONFIG_SESSIONS:
            TOKEN_CONFIG_SESSIONS[token]['username'] = username


def close_token_session(token):
    """Close and clean up a token's config session (called on logout)."""
    with _TOKEN_SESSIONS_LOCK:
        if token in TOKEN_CONFIG_SESSIONS:
            session_info = TOKEN_CONFIG_SESSIONS.pop(token)
            session = session_info['session']
            try:
                session.discard()
            except Exception:
                pass
            del session


def _cleanup_expired_sessions():
    """Background worker: clean up expired config sessions."""
    while True:
        try:
            now = time.time()
            with _TOKEN_SESSIONS_LOCK:
                expired = [
                    t for t, info in TOKEN_CONFIG_SESSIONS.items()
                    if now - info['last_active'] > SESSION_TIMEOUT
                ]
                for token in expired:
                    session_info = TOKEN_CONFIG_SESSIONS.pop(token)
                    session = session_info['session']
                    try:
                        session.discard()
                    except Exception:
                        pass
                    del session
        except Exception:
            pass
        time.sleep(300)  # Check every 5 minutes


# Start background cleanup thread (daemon so it exits with the process)
_cleanup_thread = threading.Thread(target=_cleanup_expired_sessions, daemon=True)
_cleanup_thread.start()

# Sensitive path patterns that may contain secrets
SENSITIVE_PATHS = [
    'pki', 'vpn', 'interfaces openvpn', 'interfaces wireguard',
    'interfaces pppoe', 'service https', 'service ssh', 'system login',
]





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


def _read_working_config_subprocess(path_list):
    """Read VyOS working (session) config in a subprocess.
    
    Returns (tree_dict, raw_text) where raw_text contains diff markers (+, -, >).
    """
    try:
        _logger.info(f'[_read_working_config_subprocess] START: path={path_list}')
        path_str = ' '.join(path_list) if path_list else ''
        cmd = [
            'python3', '-c',
            f"""
import sys, json, subprocess
try:
    args = ['/opt/vyatta/sbin/vyatta-cfg-cmd-wrapper', 'show', 'configuration', 'commands']
    if '{path_str}':
        args.extend('{path_str}'.split())
    result = subprocess.run(args, capture_output=True, text=True, timeout=15)
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(json.dumps({{'error': result.stderr}}), file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(json.dumps({{'error': str(e)}}), file=sys.stderr)
    sys.exit(1)
"""
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0 and result.stdout.strip():
            raw_text = result.stdout.strip()
            working_dict = _parse_vyos_tree(raw_text)
            _logger.info(f'[_read_working_config_subprocess] SUCCESS: got {len(working_dict) if isinstance(working_dict, dict) else "non-dict"} keys')
            return working_dict, raw_text
        else:
            _logger.warning(f'[_read_working_config_subprocess] FAILED: rc={result.returncode}, stderr={result.stderr[:200]}')
            return {}, ''
    except Exception as e:
        _logger.error(f'[_read_working_config_subprocess] EXCEPTION: {e}', exc_info=True)
        return {}, ''


def _parse_vyos_tree(text):
    """Parse VyOS tree-format config into a nested dict.
    
    Handles space-separated keys in block openings:
        address-group group01 {
            address 1.1.1.1
        }
    -> {'address-group': {'group01': {'address': '1.1.1.1'}}}
    """
    result = {}
    stack = [result]
    indent_stack = [-1]
    
    for line in text.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
        
        indent = len(line) - len(line.lstrip())
        
        # Pop stack to correct level
        while len(indent_stack) > 1 and indent <= indent_stack[-1]:
            stack.pop()
            indent_stack.pop()
        
        current = stack[-1]
        
        if stripped == '}':
            if len(stack) > 1:
                stack.pop()
                indent_stack.pop()
            continue
        
        if stripped.endswith('{'):
            # Block opening - may contain multiple space-separated keys
            keys_str = stripped[:-1].strip()
            keys = keys_str.split()
            
            # Navigate/create nested dicts for all keys
            for key in keys:
                if key not in current:
                    current[key] = {}
                elif isinstance(current[key], str):
                    current[key] = {'_value': current[key]}
                elif not isinstance(current[key], dict):
                    current[key] = {}
                current = current[key]
            
            stack.append(current)
            indent_stack.append(indent)
        else:
            # Leaf node: may have multiple space-separated keys before value
            # e.g., "address-group group01" (tag node, no value)
            # or "address 1.1.1.1" (key + value)
            parts = stripped.split()
            if len(parts) >= 2:
                # Could be "key1 key2 value" or "key value"
                # Last part is the value, rest are nested keys
                value = parts[-1]
                path_keys = parts[:-1]
                
                for key in path_keys[:-1]:
                    if key not in current:
                        current[key] = {}
                    elif isinstance(current[key], str):
                        current[key] = {'_value': current[key]}
                    elif not isinstance(current[key], dict):
                        current[key] = {}
                    current = current[key]
                
                last_key = path_keys[-1]
                if last_key in current:
                    existing = current[last_key]
                    if isinstance(existing, dict):
                        existing['_value'] = value
                    elif isinstance(existing, list):
                        existing.append(value)
                    else:
                        current[last_key] = [existing, value]
                else:
                    current[last_key] = value
            else:
                # Single key, no value (e.g., "resolver-cache")
                key = parts[0]
                if key not in current:
                    current[key] = ''
    
    return result


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
        except Exception as e:
            import vyos.configsession as _vcs
            if isinstance(e, _vcs.ConfigSessionError):
                return _structured_error(
                    'CONFIG_SESSION_ERROR', str(e), str(e),
                    suggestion='请根据 VyOS 命令行返回的报错信息修正配置后重新提交',
                    trace=traceback.format_exc()
                )
            if isinstance(e, ValueError):
                return _structured_error(
                    'VALIDATION_ERROR', str(e), str(e),
                    suggestion='请检查输入参数格式',
                    trace=traceback.format_exc()
                )
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
            path_list = _path_to_list(path)
            data = _read_config_subprocess(path_list, effective=True)
            return {'success': True, 'path': path, 'data': data}
        except Exception as e:
            return _structured_error('CONFIG_GET_ERROR', str(e), traceback.format_exc(),
                                     suggestion='请检查配置路径是否正确')

    def get_session_config(self, path):
        """Return session (proposed) config at path."""
        try:
            path_list = _path_to_list(path)
            data = _read_config_subprocess(path_list, effective=False)
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
        menu = self._filter_menu_by_visibility(menu)
        return {'success': True, 'menu': menu}

    def _get_visible_features(self):
        """Get set of visible feature keys from database."""
        try:
            conn = get_db_connection()
            rows = conn.execute('SELECT feature_key FROM feature_visibility WHERE is_visible = 1').fetchall()
            conn.close()
            return {row['feature_key'] for row in rows}
        except Exception:
            return set()

    def _filter_menu_by_visibility(self, menu):
        """Filter menu items based on feature visibility settings."""
        visible = self._get_visible_features()

        result = []
        for l1 in menu:
            l2_items = []
            for l2 in l1.get('children', []):
                l3_items = []
                for l3 in l2.get('children', []):
                    if self._should_hide_item(l3, visible):
                        continue
                    l3_items.append(l3)
                if l3_items:
                    l2_copy = dict(l2)
                    l2_copy['children'] = l3_items
                    l2_items.append(l2_copy)
                elif not self._should_hide_item(l2, visible):
                    l2_items.append(l2)
            if l2_items:
                l1_copy = dict(l1)
                l1_copy['children'] = l2_items
                result.append(l1_copy)
            elif not self._should_hide_item(l1, visible):
                result.append(l1)
        return result

    def _should_hide_item(self, item, visible_features):
        """Check if a menu item should be hidden based on feature visibility.
        Uses the featureKey field from menu.json."""
        feature_key = item.get('featureKey')
        if feature_key:
            return feature_key not in visible_features
        return False

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

    def _is_session_expired_error(self, e):
        """Check if an exception indicates the config session has expired."""
        msg = str(e)
        return 'without config session' in msg or 'ConfigSessionError' in type(e).__name__

    @_handle_config_exception
    def set_config(self, user, path, value):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        path_list = _path_to_list(path)
        _logger.info(f'[set_config] START: user={username}, path={path}, token={token[:20]}..., value_type={type(value).__name__}')

        # Retry loop: if session becomes invalid during operation, recreate and retry once
        for attempt in range(2):
            try:
                session = _get_config_session(token)
                _logger.info(f'[set_config] Got session: id={id(session)}, attempt={attempt+1}')

                if isinstance(value, dict):
                    # Directly set form values without merging with active config
                    # VyOS will automatically overwrite existing values
                    self._set_config_dict(session, path_list, value, token=token)
                    _logger.info(f'[set_config] Set config dict')
                elif isinstance(value, list):
                    for v in value:
                        session.set(path_list, v)
                else:
                    session.set(path_list, value)

                _logger.info(f'[set_config] SUCCESS: path={path}')
                _log_action(username, 'set', _list_to_path(path_list), {'value': value})
                return {'success': True, 'message': '配置已设置'}

            except Exception as e:
                import vyos.configsession as _vcs
                if isinstance(e, _vcs.ConfigSessionError):
                    if attempt == 0 and self._is_session_expired_error(e):
                        _logger.warning(f'[set_config] Session expired, invalidating and retrying...')
                        _invalidate_and_recreate_session(token)
                        continue
                raise

        # Should not reach here
        return {'success': False, 'message': '配置设置失败'}

    @_handle_config_exception
    def delete_config(self, user, path):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        path_list = _path_to_list(path)
        _logger.info(f'[delete_config] START: user={username}, path={path}, token={token[:20]}...')
        # Check references before delete
        refs = self._get_references_for_path(_list_to_path(path_list))
        if refs and not user.get('force_delete'):
            return _structured_error(
                'REFERENCE_EXISTS',
                '该配置项仍被其他配置引用，无法删除',
                detail={'references': refs},
                suggestion='请先移除引用该配置项的规则或启用强制删除'
            )
        session = _get_config_session(token)
        _logger.info(f'[delete_config] Got session: id={id(session)}')
        try:
            session.delete(path_list)
        except Exception as e:
            if self._is_session_expired_error(e):
                _logger.warning(f'[delete_config] Session expired during delete, recreating...')
                _invalidate_and_recreate_session(token)
                session = _get_config_session(token)
                session.delete(path_list)
            else:
                raise
        _logger.info(f'[delete_config] SUCCESS: path={path}')
        _log_action(username, 'delete', _list_to_path(path_list), {})
        return {'success': True, 'message': '配置已删除'}

    @_handle_config_exception
    def commit_config(self, user):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        session = _get_config_session(token)
        out = session.commit()
        _log_action(username, 'commit', '', {'output': out})
        # Reload daemon config after commit
        _daemon_reload_config()
        return {'success': True, 'message': '配置提交成功', 'output': out}

    @_handle_config_exception
    def commit_config_with_comment(self, user, comment):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        session = _get_config_session(token)
        out = session.commit(comment=comment)
        _log_action(username, 'commit', comment, {'output': out})
        # Reload daemon config after commit
        _daemon_reload_config()
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
        token = _get_token(user)
        # Only discard if session exists
        with _TOKEN_SESSIONS_LOCK:
            if token not in TOKEN_CONFIG_SESSIONS:
                return {'success': True, 'message': '没有未提交的变更'}
            session = TOKEN_CONFIG_SESSIONS[token]['session']
            TOKEN_CONFIG_SESSIONS[token]['last_active'] = time.time()
        session.discard()
        _log_action(username, 'discard', '', {})
        return {'success': True, 'message': '未提交变更已丢弃'}

    @_handle_config_exception
    def save_config(self, user, password=''):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        session = _get_config_session(token)
        tmp_path = '/tmp/vyos_web_config_save.tmp'
        out = session.save_config(tmp_path)
        _log_action(username, 'save', '', {'output': out})
        return {'success': True, 'message': '配置已保存', 'output': out}

    @_handle_config_exception
    def save_config_to_file(self, user, target, target_type='system'):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        session = _get_config_session(token)

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
        token = _get_token(user)
        session = _get_config_session(token)

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
            token = _get_token(user)
            session = _get_config_session(token)
            out = session.migrate_and_load_config(source)
            _log_action(username, 'merge', source, {'output': out})
            return {'success': True, 'message': f'已从 {source} 合并配置', 'output': out}

    @_handle_config_exception
    def add_comment(self, user, path, text):
        username = user.get('username', 'unknown')
        token = _get_token(user)
        session = _get_config_session(token)

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
        token = _get_token(user)
        session = _get_config_session(token)

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
        token = _get_token(user)
        if source.startswith('$') or source.startswith('U2FsdGVkX1'):
            source = _decrypt_config(source, password)
        fd, tmp_path = tempfile.mkstemp(prefix='vyos_load_', suffix='.cfg')
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(source)
            session = _get_config_session(token)
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

    def compare_config(self, user, left='working', right='active', path=''):
        """Compare working config against active config and return VyOS-style diff.
        
        Uses ConfigSession.diff() to get diff from the user's session, falling back
        to vyatta-cfg-cmd-wrapper for CLI sessions.
        """
        try:
            token = _get_token(user)
            _logger.info(f'[compare_config] START: token={token[:20]}..., path={path}')

            path_list = path.split() if path else []

            # Try using ConfigSession first (same session as PKI install etc.)
            try:
                session = _get_config_session(token)
                diff_output = session.diff()
                _logger.info(f'[compare_config] ConfigSession.diff() returned: {repr(diff_output[:200]) if diff_output else "empty"}')
                if diff_output:
                    # Parse diff output - it may be a string with + / - markers
                    diff_lines = []
                    for line in diff_output.split('\n'):
                        stripped = line.strip()
                        if stripped and stripped[0] in ('+', '-', '>'):
                            diff_lines.append(line.rstrip())
                    if path_list:
                        # Filter to only lines under the specified path
                        path_prefix = ' '.join(path_list)
                        filtered = []
                        in_section = False
                        section_indent = -1
                        for line in diff_lines:
                            stripped = line.strip()
                            indent = len(line) - len(line.lstrip()) if stripped else 999
                            if stripped.startswith(path_prefix + ' ') or stripped == path_prefix + ' {':
                                in_section = True
                                section_indent = indent
                                filtered.append(line)
                                continue
                            if in_section:
                                if indent <= section_indent and not stripped.startswith('{'):
                                    in_section = False
                                    continue
                                filtered.append(line)
                        diff_lines = filtered
                    _logger.info(f'[compare_config] SUCCESS via ConfigSession: found {len(diff_lines)} diff lines')
                    return {'success': True, 'diff': diff_lines}
            except Exception as e:
                _logger.warning(f'[compare_config] ConfigSession.diff() failed: {e}, falling back to vyatta-cfg-cmd-wrapper')

            # Fallback: use vyatta-cfg-cmd-wrapper for CLI sessions
            cmd = ['/opt/vyatta/sbin/vyatta-cfg-cmd-wrapper', 'show', 'configuration', 'commands']
            if path_list:
                cmd.extend(path_list)

            _logger.info(f'[compare_config] Running: {" ".join(cmd)}')
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode != 0:
                _logger.warning(f'[compare_config] Command failed: rc={result.returncode}, stderr={result.stderr[:200]}')
                return {'success': True, 'diff': []}

            raw_text = result.stdout
            if not raw_text or not raw_text.strip():
                _logger.info(f'[compare_config] No working config changes')
                return {'success': True, 'diff': []}

            # Extract lines with diff markers (+, -, >)
            diff_lines = []
            if path_list:
                path_prefix = ' '.join(path_list)
                in_section = False
                section_indent = -1
                for line in raw_text.split('\n'):
                    stripped = line.strip()
                    indent = len(line) - len(line.lstrip()) if stripped else 999

                    if not stripped:
                        continue

                    if stripped.startswith(path_prefix + ' ') or stripped == path_prefix + ' {':
                        in_section = True
                        section_indent = indent
                        if stripped[0] in ('+', '-', '>'):
                            diff_lines.append(line.rstrip())
                        continue

                    if in_section:
                        if indent <= section_indent and not stripped.startswith('{'):
                            in_section = False
                            continue
                        if stripped[0] in ('+', '-', '>'):
                            diff_lines.append(line.rstrip())
            else:
                for line in raw_text.split('\n'):
                    stripped = line.strip()
                    if stripped and stripped[0] in ('+', '-', '>'):
                        diff_lines.append(line.rstrip())

            _logger.info(f'[compare_config] SUCCESS: found {len(diff_lines)} diff lines')
            return {'success': True, 'diff': diff_lines}
        except Exception as e:
            _logger.error(f'[compare_config] FAILED: {e}', exc_info=True)
            return _structured_error('COMPARE_ERROR', str(e), traceback.format_exc())

    def _compute_diff(self, old_dict, new_dict, prefix=''):
        """Compute VyOS CLI-style diff lines between two config dicts."""
        diff_lines = []
        all_keys = set(list(old_dict.keys()) + list(new_dict.keys()))
        for key in sorted(all_keys):
            path = f'{prefix} {key}' if prefix else key
            if key not in old_dict:
                self._add_diff_lines(new_dict[key], path, '+', diff_lines)
            elif key not in new_dict:
                self._add_diff_lines(old_dict[key], path, '-', diff_lines)
            else:
                old_val = old_dict[key]
                new_val = new_dict[key]
                if isinstance(old_val, dict) and isinstance(new_val, dict):
                    diff_lines.extend(self._compute_diff(old_val, new_val, path))
                elif isinstance(old_val, list) and isinstance(new_val, list):
                    old_set = set(old_val)
                    new_set = set(new_val)
                    for v in sorted(old_set - new_set):
                        diff_lines.append(f'-{path} {v}')
                    for v in sorted(new_set - old_set):
                        diff_lines.append(f'+{path} {v}')
                elif old_val != new_val:
                    self._add_diff_lines(old_val, path, '-', diff_lines)
                    self._add_diff_lines(new_val, path, '+', diff_lines)
        return diff_lines

    def _add_diff_lines(self, value, path, prefix, diff_lines):
        """Add diff lines for a value with prefix (+/-)."""
        if isinstance(value, dict):
            for k, v in value.items():
                self._add_diff_lines(v, f'{path} {k}', prefix, diff_lines)
        elif isinstance(value, list):
            for v in value:
                diff_lines.append(f'{prefix}{path} {v}')
        else:
            if value == '' or value is None:
                diff_lines.append(f'{prefix}{path}')
            else:
                diff_lines.append(f'{prefix}{path} {value}')

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
        token = _get_token(user)
        path_list = _path_to_list(path)
        session = _get_config_session(token)
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
        token = _get_token(user)
        path_list = _path_to_list(path)
        session = _get_config_session(token)
        src_path = path_list + ['rule', str(from_rule)]
        dst_path = path_list + ['rule', str(to_rule)]
        rule_data = _read_config_subprocess(src_path, effective=False)
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
        token = _get_token(user)
        path_list = _path_to_list(path)
        session = _get_config_session(token)
        src_path = path_list + ['rule', str(from_rule)]
        dst_path = path_list + ['rule', str(to_rule)]
        rule_data = _read_config_subprocess(src_path, effective=False)
        if not rule_data:
            return _structured_error('RULE_NOT_FOUND', f'规则 {from_rule} 不存在')
        self._set_config_dict(session, dst_path, rule_data)
        _log_action(username, 'copy_firewall_rule', _list_to_path(path_list),
                    {'from': from_rule, 'to': to_rule})
        return {'success': True, 'message': f'规则已从 {from_rule} 复制到 {to_rule}'}

    def _parse_show_config(self, raw_output, path_list):
        """Parse VyOS 'show config' output into a nested dict.
        
        Input format (from session.show_config - diff output with +/- markers):
            + description test-br1
            - description old-desc
        
        When parsing diff output:
        - Keep both + and - lines to reconstruct full working config state
        - + lines override - lines for the same key (new value wins)
        
        Output:
            {'description': 'test-br1'}
        """
        _logger.info(f'[_parse_show_config] START: path={_list_to_path(path_list)}, raw_length={len(raw_output or "")}')
        result = {}
        if not raw_output or not raw_output.strip():
            _logger.info(f'[_parse_show_config] Empty output, returning {{}}')
            return result
        
        lines = raw_output.strip().split('\n')
        _logger.info(f'[_parse_show_config] Parsing {len(lines)} lines')
        # Stack: (current_dict, indent_level)
        stack = [(result, -1)]
        
        # First pass: collect all lines grouped by their effective path
        # This helps us handle + and - lines for the same key correctly
        parsed_entries = []  # List of (indent, key_path_parts, value, is_add)
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            
            # Handle diff prefix markers
            # + lines are new/modified values - keep them
            # - lines are old values being removed - skip them entirely
            if stripped.startswith('+'):
                stripped = stripped[1:].lstrip()
                if not stripped:
                    continue
            elif stripped.startswith('-'):
                # Skip old values being removed
                continue
            
            # Closing brace: pop back to parent
            if stripped == '}':
                if len(stack) > 1:
                    stack.pop()
                continue
            
            indent = len(line) - len(line.lstrip())
            # Account for the diff marker offsetting indent by 1 char
            if line.lstrip().startswith(('+', '-')):
                indent += 1
            
            # Pop stack entries that are at same or deeper indent
            while len(stack) > 1 and stack[-1][1] >= indent:
                stack.pop()
            
            current_dict = stack[-1][0]
            
            # Parse: "key value {" or "key value" or "key {"
            # Apply same key mangling as get_config_dict: convert hyphens to underscores
            if stripped.endswith('{'):
                inner = stripped[:-1].strip()
                parts = inner.split(None, 1)
                key = parts[0].replace('-', '_')
                node = parts[1].replace('-', '_') if len(parts) > 1 else None
                
                if node:
                    if key not in current_dict or not isinstance(current_dict[key], dict):
                        current_dict[key] = {}
                    nested = current_dict[key]
                    if node not in nested or not isinstance(nested.get(node), dict):
                        nested[node] = {}
                    stack.append((nested[node], indent))
                else:
                    if key not in current_dict or not isinstance(current_dict.get(key), dict):
                        current_dict[key] = {}
                    stack.append((current_dict[key], indent))
            else:
                parts = stripped.split(None, 1)
                key = parts[0].replace('-', '_')
                value = parts[1] if len(parts) > 1 else None
                
                if value:
                    if key in current_dict:
                        if isinstance(current_dict[key], list):
                            current_dict[key].append(value)
                        else:
                            current_dict[key] = [current_dict[key], value]
                    else:
                        current_dict[key] = value
                else:
                    if key not in current_dict:
                        current_dict[key] = {}
        
        _logger.info(f'[_parse_show_config] Result keys: {list(result.keys())}')
        return result

    def _deep_merge(self, base, override):
        """Deep merge two dicts. override values take precedence.
        For list values, override replaces base (not concatenated).
        """
        if not isinstance(base, dict) or not isinstance(override, dict):
            _logger.info(f'[_deep_merge] Non-dict input: base_type={type(base).__name__}, override_type={type(override).__name__}, returning override')
            return override
        result = dict(base)
        for k, v in override.items():
            if k in result and isinstance(result[k], dict) and isinstance(v, dict):
                _logger.info(f'[_deep_merge] Deep merging key="{k}"')
                result[k] = self._deep_merge(result[k], v)
            else:
                _logger.info(f'[_deep_merge] Override key="{k}", base_type={type(result.get(k)).__name__}, override_type={type(v).__name__}')
                result[k] = v
        return result

    def _set_config_dict(self, session, path, value, token=None, max_retries=2):
        """Recursively set a config dict using session.set for leafless nodes.
        
        Args:
            session: ConfigSession instance
            path: List of path components
            value: Value to set
            token: User token for session recreation (optional)
            max_retries: Maximum retry attempts for session errors
        """
        if isinstance(value, dict):
            if not value:
                # Empty dict means a leafless node (e.g., "vif 10", "ipv6", "disable")
                _logger.info(f'[_set_config_dict] Empty dict -> session.set({_list_to_path(path)})')
                self._session_set_with_retry(session, path, None, token, max_retries)
            else:
                _logger.info(f'[_set_config_dict] Dict with keys={list(value.keys())} at {_list_to_path(path)}')
                for k, v in value.items():
                    self._set_config_dict(session, path + [k], v, token, max_retries)
        elif isinstance(value, list):
            _logger.info(f'[_set_config_dict] List with {len(value)} items at {_list_to_path(path)}')
            for v in value:
                self._set_config_dict(session, path, v, token, max_retries)
        elif value == '' or value is None or value is True:
            _logger.info(f'[_set_config_dict] Empty/None/True -> session.set({_list_to_path(path)})')
            self._session_set_with_retry(session, path, None, token, max_retries)
        else:
            _logger.info(f'[_set_config_dict] session.set({_list_to_path(path)}, "{value}")')
            self._session_set_with_retry(session, path, str(value), token, max_retries)

    def _session_set_with_retry(self, session, path, value, token=None, max_retries=2):
        """Call session.set with retry logic for session errors."""
        for attempt in range(max_retries):
            try:
                if value is None:
                    session.set(path)
                else:
                    session.set(path, value)
                return  # Success
            except Exception as e:
                import vyos.configsession as _vcs
                if isinstance(e, _vcs.ConfigSessionError):
                    if attempt < max_retries - 1 and self._is_session_expired_error(e) and token:
                        _logger.warning(f'[_session_set_with_retry] Session expired, recreating (attempt {attempt+1}/{max_retries})...')
                        session = _invalidate_and_recreate_session(token)
                        continue
                raise  # Re-raise if not retryable or max retries reached

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
            data = _read_config_subprocess([], effective=True)
            # Convert dict to show_config format
            if isinstance(data, dict):
                import io
                output = io.StringIO()
                def _dict_to_config(d, prefix=''):
                    for k, v in sorted(d.items()):
                        path = f'{prefix} {k}' if prefix else k
                        if isinstance(v, dict):
                            _dict_to_config(v, path)
                        elif isinstance(v, list):
                            for item in v:
                                output.write(f'{path} {item}\n')
                        else:
                            output.write(f'{path} {v}\n' if v else f'{path}\n')
                _dict_to_config(data)
                data = output.getvalue()
            else:
                data = str(data) if data else ''
            
            if not include_sensitive:
                for pattern in SENSITIVE_PATHS:
                    data = re.sub(rf'(^|\n)({re.escape(pattern)} [^\n]+(\n(?!set )[^\n]+)*)', '', data)
            encrypted = _encrypt_config(data, password)
            return {'success': True, 'config': encrypted, 'encrypted': bool(password)}
        except Exception as e:
            return _structured_error('EXPORT_ERROR', str(e), traceback.format_exc())

    def export_config_file(self, user, password='', include_sensitive=True):
        """Export config as file bytes. Returns (content_bytes, filename, content_type)."""
        try:
            data = _read_config_subprocess([], effective=True)
            # Convert dict to show_config format
            if isinstance(data, dict):
                import io
                output = io.StringIO()
                def _dict_to_config(d, prefix=''):
                    for k, v in sorted(d.items()):
                        path = f'{prefix} {k}' if prefix else k
                        if isinstance(v, dict):
                            _dict_to_config(v, path)
                        elif isinstance(v, list):
                            for item in v:
                                output.write(f'{path} {item}\n')
                        else:
                            output.write(f'{path} {v}\n' if v else f'{path}\n')
                _dict_to_config(data)
                data = output.getvalue()
            else:
                data = str(data) if data else ''
            
            if not include_sensitive:
                for pattern in SENSITIVE_PATHS:
                    data = re.sub(rf'(^|\n)({re.escape(pattern)} [^\n]+(\n(?!set )[^\n]+)*)', '', data)
            encrypted = _encrypt_config(data, password)
            if password:
                # Create password-protected zip using subprocess
                import subprocess
                import tempfile
                import os
                with tempfile.NamedTemporaryFile(mode='w', suffix='.boot', delete=False) as f:
                    f.write(encrypted)
                    tmp_path = f.name
                zip_path = tmp_path + '.zip'
                try:
                    subprocess.run(
                        ['zip', '-P', password, '-j', zip_path, tmp_path],
                        check=True, capture_output=True
                    )
                    with open(zip_path, 'rb') as zf:
                        content = zf.read()
                    return content, 'vyos_config.zip', 'application/zip'
                finally:
                    os.unlink(tmp_path)
                    if os.path.exists(zip_path):
                        os.unlink(zip_path)
            else:
                return encrypted.encode('utf-8'), 'vyos_config.boot', 'text/plain'
        except Exception as e:
            raise RuntimeError(str(e))

    def session_changed(self, user=None):
        """Check if config session has changed, with caching to avoid expensive Config() creation."""
        now = time.time()
        cache = _SESSION_CHANGED_CACHE
        if now - cache['timestamp'] < _SESSION_CHANGED_CACHE_TTL:
            return {'success': True, 'changed': cache['value']}
        try:
            token = _get_token(user) if user else None
            # Only check if a session already exists for this token
            with _TOKEN_SESSIONS_LOCK:
                if token is None or token not in TOKEN_CONFIG_SESSIONS:
                    cache['value'] = False
                    cache['timestamp'] = now
                    return {'success': True, 'changed': False}
                session = TOKEN_CONFIG_SESSIONS[token]['session']
                TOKEN_CONFIG_SESSIONS[token]['last_active'] = now
            # Get session config
            session_text = session.show_config([], format='raw') or ''
            # Get running config from config.boot
            try:
                with open('/config/config.boot', 'r') as f:
                    running_text = f.read()
            except Exception:
                running_text = ''
            changed = running_text != session_text
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
            existing = _read_config_subprocess(parent_path, effective=False)
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
            # Firewall groups - direct read via daemon (fast IPC)
            elif field in ('address-group', 'network-group', 'port-group', 'domain-group', 'mac-group', 'dynamic-address-group'):
                if field == 'address-group':
                    if 'add-address-to-group' in path_list:
                        # Dynamic address groups
                        data = _read_config_subprocess(['firewall', 'group', 'dynamic-group'], effective=True)
                        if isinstance(data, dict):
                            if 'ipv6' in path_list:
                                ipv6_groups = data.get('ipv6_address_group', {})
                                suggestions = sorted(ipv6_groups.keys()) if isinstance(ipv6_groups, dict) else []
                            else:
                                ipv4_groups = data.get('address_group', {})
                                suggestions = sorted(ipv4_groups.keys()) if isinstance(ipv4_groups, dict) else []
                    elif 'ipv6' in path_list:
                        suggestions = self._list_config_keys(['firewall', 'group', 'ipv6-address-group'])
                    else:
                        suggestions = self._list_config_keys(['firewall', 'group', 'address-group'])
                elif field == 'network-group':
                    if 'ipv6' in path_list:
                        suggestions = self._list_config_keys(['firewall', 'group', 'ipv6-network-group'])
                    else:
                        suggestions = self._list_config_keys(['firewall', 'group', 'network-group'])
                elif field == 'port-group':
                    suggestions = self._list_config_keys(['firewall', 'group', 'port-group'])
                elif field == 'domain-group':
                    suggestions = self._list_config_keys(['firewall', 'group', 'domain-group'])
                elif field == 'mac-group':
                    suggestions = self._list_config_keys(['firewall', 'group', 'mac-group'])
                elif field == 'dynamic-address-group':
                    data = _read_config_subprocess(['firewall', 'group', 'dynamic-group'], effective=True)
                    if isinstance(data, dict):
                        if 'ipv6' in path_list:
                            ipv6_groups = data.get('ipv6_address_group', {})
                            suggestions = sorted(ipv6_groups.keys()) if isinstance(ipv6_groups, dict) else []
                        else:
                            ipv4_groups = data.get('address_group', {})
                            suggestions = sorted(ipv4_groups.keys()) if isinstance(ipv4_groups, dict) else []
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
            data = _read_config_subprocess(config_path, effective=True)
            if isinstance(data, dict):
                return sorted(data.keys())
        except Exception:
            pass
        return []

    def _list_firewall_chains(self, path_list):
        """List available firewall chains for jump target."""
        chains = []
        try:
            # Custom chains under firewall ipv4 name / ipv6 name / bridge name
            for family in ['ipv4', 'ipv6', 'bridge']:
                try:
                    data = _read_config_subprocess(['firewall', family, 'name'], effective=True)
                    if isinstance(data, dict):
                        chains.extend(data.keys())
                except Exception:
                    pass
        except Exception:
            pass
        return sorted(set(chains))

    def _list_protocols(self):
        """Get protocol completions from VyOS CLI for policy route rules."""
        protocols = []
        try:
            # Use VyOS configd to get protocol completions
            # This mimics the CLI tab-completion behavior
            cmd = ['/opt/vyatta/bin/vyatta-cfg-cmd-wrapper', 'list',
                   'policy route pr01 rule 1 protocol']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip():
                for line in result.stdout.strip().splitlines():
                    line = line.strip()
                    if line and not line.startswith('Possible'):
                        # Extract protocol name (first word)
                        parts = line.split()
                        if parts:
                            proto = parts[0]
                            # Skip numeric protocols and special entries
                            if proto not in protocols and not proto.startswith('!'):
                                protocols.append(proto)
        except Exception:
            pass

        # Fallback to common protocols if CLI fails
        if not protocols:
            protocols = ['all', 'tcp_udp', 'tcp', 'udp', 'icmp', 'gre', 'esp', 'ah', 'sctp']
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
        return sorted(protocols)

    # ---------- help documentation ----------

    def get_help(self, path, lang='en'):
        """Return help content (html or markdown) for a given frontend route path and language."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            docs_dir = os.path.join(base_dir, 'docs')
            mapping_file = os.path.join(base_dir, 'backend', 'data', 'help_mapping.json')

            # Supported languages
            supported_langs = ['en', 'zh', 'ru', 'fr', 'de', 'ko']
            if lang not in supported_langs:
                lang = 'en'

            # Try mapping file first
            mapped_filename = None
            if os.path.exists(mapping_file):
                try:
                    with open(mapping_file, 'r', encoding='utf-8') as f:
                        mapping = json.load(f)
                    mapped_filename = mapping.get(path)
                except Exception:
                    pass

            # Fallback: derive filename from path
            if not mapped_filename:
                safe_path = re.sub(r'[^\w\-/.]', '_', path).strip('/').replace('/', '_')
                mapped_filename = f'{safe_path}.html'

            # Try language-specific file first, then fallback to English
            lang_dirs = [lang, 'en']
            for ldir in lang_dirs:
                mapped_file = os.path.join(docs_dir, ldir, mapped_filename)
                if os.path.exists(mapped_file) and os.path.isfile(mapped_file):
                    with open(mapped_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    fmt = 'html' if mapped_file.endswith('.html') else 'md'
                    return {'success': True, 'path': path, 'content': content, 'format': fmt, 'lang': ldir}

            # Final fallback
            return {
                'success': True,
                'path': path,
                'content': f'暂无 {path} 的帮助文档。\n可在 {docs_dir}/en/{mapped_filename} 添加 HTML 格式的帮助内容。',
                'format': 'md',
                'lang': lang
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

    # ---------- feature visibility ----------

    def get_feature_visibility(self):
        try:
            conn = get_db_connection()
            rows = conn.execute('SELECT * FROM feature_visibility ORDER BY category, feature_key').fetchall()
            conn.close()
            features = []
            for row in rows:
                features.append({
                    'id': row['id'],
                    'feature_key': row['feature_key'],
                    'feature_label': row['feature_label'],
                    'feature_label_en': row['feature_label_en'],
                    'category': row['category'],
                    'category_label': row['category_label'],
                    'category_label_en': row['category_label_en'],
                    'is_visible': bool(row['is_visible']),
                })
            return {'success': True, 'features': features}
        except Exception as e:
            return _structured_error('FEATURE_VISIBILITY_ERROR', str(e), traceback.format_exc())

    def update_feature_visibility(self, user, feature_key, is_visible):
        try:
            conn = get_db_connection()
            conn.execute('''
                UPDATE feature_visibility SET is_visible = ?, updated_at = CURRENT_TIMESTAMP
                WHERE feature_key = ?
            ''', (1 if is_visible else 0, feature_key))
            conn.commit()
            conn.close()
            _log_action(user.get('username', 'unknown'), 'update_feature_visibility', feature_key,
                        {'is_visible': is_visible})
            return {'success': True, 'feature_key': feature_key, 'is_visible': is_visible}
        except Exception as e:
            return _structured_error('FEATURE_VISIBILITY_UPDATE_ERROR', str(e), traceback.format_exc())

    def update_feature_visibility_batch(self, user, updates):
        try:
            conn = get_db_connection()
            for item in updates:
                conn.execute('''
                    UPDATE feature_visibility SET is_visible = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE feature_key = ?
                ''', (1 if item.get('is_visible', False) else 0, item['feature_key']))
            conn.commit()
            conn.close()
            _log_action(user.get('username', 'unknown'), 'update_feature_visibility_batch', '',
                        {'updates': updates})
            return {'success': True, 'count': len(updates)}
        except Exception as e:
            return _structured_error('FEATURE_VISIBILITY_BATCH_ERROR', str(e), traceback.format_exc())
