#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re
import subprocess
import uuid
import datetime
try:
    import pam
except ImportError:
    pam = None

from utils.database import get_db_connection, init_db
from utils.auth_middleware import AuthMiddleware
from services.notification_service import NotificationService


class AuthService:
    def __init__(self):
        init_db()
        self.pam_auth = pam.pam() if pam else None
        self.notification_service = NotificationService()

    def _pam_authenticate(self, username, password):
        if self.pam_auth:
            return self.pam_auth.authenticate(username, password, service='login')
        # Fallback using python-pam not available: use su or shadow check via sudo
        try:
            result = subprocess.run(
                ['sudo', 'bash', '-c', f'echo {password} | su - {username} -c "exit 0"'],
                capture_output=True, text=True, timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False

    def login(self, username, password, ip_address=''):
        # PAM authentication
        if not self._pam_authenticate(username, password):
            self._log_action(username, 'login', '', {}, ip_address, False, 'PAM authentication failed')
            self.notification_service.add(
                'login_failed',
                '登录失败',
                f'用户 {username} 从 {ip_address} 登录失败',
                {'username': username, 'ip_address': ip_address}
            )
            return {'success': False, 'message': '用户名或密码错误'}
        
        # Get user from database
        user = self.get_user(username)
        if not user:
            # Create default user entry
            self._ensure_user_exists(username)
            user = self.get_user(username)
        
        if not user.get('enabled'):
            return {'success': False, 'message': '用户已禁用'}
        
        # Check IP restrictions
        allowed_ips = user.get('allowed_ips', [])
        if allowed_ips and not self._check_ip_allowed(ip_address, allowed_ips):
            self._log_action(username, 'login', '', {}, ip_address, False, 'IP address not allowed')
            return {'success': False, 'message': f'IP地址 {ip_address} 不允许登录'}
        
        # Check MAC restrictions
        allowed_macs = user.get('allowed_macs', [])
        if allowed_macs:
            mac = self._get_mac_by_ip(ip_address)
            if mac and mac not in allowed_macs:
                self._log_action(username, 'login', '', {}, ip_address, False, 'MAC address not allowed')
                return {'success': False, 'message': f'MAC地址 {mac} 不允许登录'}
        
        # Generate token
        auth_middleware = AuthMiddleware(self)
        token = auth_middleware.generate_token(username)
        
        # Save session
        self._save_session(username, token, ip_address)
        
        # Update last login
        self._update_last_login(username)
        
        # Log action
        self._log_action(username, 'login', 'auth', {}, ip_address, True, '')

        # Add notification
        self.notification_service.add(
            'login',
            '用户登录',
            f'用户 {username} 从 {ip_address} 登录',
            {'username': username, 'ip_address': ip_address}
        )

        return {
            'success': True,
            'token': token,
            'user': user,
        }

    def logout(self, token):
        if token:
            conn = get_db_connection()
            try:
                row = conn.execute(
                    'SELECT user_id FROM user_sessions WHERE id = ?', (token,)
                ).fetchone()
                username = row['user_id'] if row else ''
                conn.execute('DELETE FROM user_sessions WHERE id = ?', (token,))
                conn.commit()
            finally:
                conn.close()
            if username:
                self.notification_service.add(
                    'logout',
                    '用户退出',
                    f'用户 {username} 已退出登录',
                    {'username': username}
                )
        return {'success': True}

    def get_user(self, username):
        conn = get_db_connection()
        try:
            cursor = conn.execute('''
                SELECT u.*, p.language, p.theme
                FROM users u
                LEFT JOIN user_preferences p ON u.username = p.user_id
                WHERE u.username = ?
            ''', (username,))
            row = cursor.fetchone()
            if row:
                user = dict(row)
                user['allowed_ips'] = json.loads(user.get('allowed_ips', '[]'))
                user['allowed_macs'] = json.loads(user.get('allowed_macs', '[]'))
                return user
            return None
        finally:
            conn.close()

    def _ensure_user_exists(self, username):
        conn = get_db_connection()
        try:
            conn.execute('''
                INSERT OR IGNORE INTO users (username, allowed_ips, allowed_macs, access_control_table_id)
                VALUES (?, '[]', '[]', 3)
            ''', (username,))
            conn.execute('''
                INSERT OR IGNORE INTO user_preferences (user_id, language, theme)
                VALUES (?, 'zh-CN', 'dark')
            ''', (username,))
            conn.commit()
        finally:
            conn.close()

    def _check_ip_allowed(self, ip, allowed_ips):
        for allowed in allowed_ips:
            if '-' in allowed:
                if self._ip_in_range(ip, allowed):
                    return True
            elif '/' in allowed:
                if self._ip_in_cidr(ip, allowed):
                    return True
            elif ip == allowed:
                return True
        return False

    def _ip_in_cidr(self, ip, cidr):
        import ipaddress
        try:
            network = ipaddress.ip_network(cidr, strict=False)
            address = ipaddress.ip_address(ip)
            return address in network
        except Exception:
            return False

    def _ip_in_range(self, ip, range_str):
        import ipaddress
        try:
            start, end = range_str.split('-')
            address = ipaddress.ip_address(ip)
            start_addr = ipaddress.ip_address(start)
            end_addr = ipaddress.ip_address(end)
            return start_addr <= address <= end_addr
        except Exception:
            return False

    def _get_mac_by_ip(self, ip):
        try:
            result = subprocess.run(['ip', 'neigh', 'show', ip], capture_output=True, text=True)
            match = re.search(r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})', result.stdout)
            if match:
                return match.group(1).lower()
        except Exception:
            pass
        return None

    def _save_session(self, username, token, ip_address):
        conn = get_db_connection()
        try:
            expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
            conn.execute('''
                INSERT OR REPLACE INTO user_sessions (id, user_id, expires_at, ip_address)
                VALUES (?, ?, ?, ?)
            ''', (token, username, expires_at, ip_address))
            conn.commit()
        finally:
            conn.close()

    def _update_last_login(self, username):
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE username = ?
            ''', (username,))
            conn.execute('''
                UPDATE user_preferences SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?
            ''', (username,))
            conn.commit()
        finally:
            conn.close()

    def _log_action(self, username, action, target, data, ip_address, success, error_message):
        conn = get_db_connection()
        try:
            conn.execute('''
                INSERT INTO audit_log (user_id, action, target, data, ip_address, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (username, action, target, json.dumps(data), ip_address, 1 if success else 0, error_message))
            conn.commit()
        finally:
            conn.close()

    def check_permission(self, username, level1, level2=None, level3=None, required='read'):
        user = self.get_user(username)
        if not user:
            return False
        
        acl_id = user.get('access_control_table_id', 3)
        conn = get_db_connection()
        try:
            cursor = conn.execute('''
                SELECT permission FROM access_control_items
                WHERE access_control_table_id = ? AND level1 = ? AND level2 = ? AND level3 = ?
            ''', (acl_id, level1, level2 or '', level3 or ''))
            row = cursor.fetchone()
            if not row:
                return False
            
            permission = row['permission']
            if required == 'read':
                return permission in ['read', 'readwrite']
            elif required == 'write':
                return permission in ['write', 'readwrite']
            return False
        finally:
            conn.close()
