#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
User and access control management service.
Note: passwords are managed via Linux PAM/useradd/usermod; we only store restrictions and ACL.
"""

import json
import re
import subprocess
from utils.database import get_db_connection


IPv4_RE = re.compile(r'^(\d{1,3}\.){3}\d{1,3}(/\d{1,2})?$')
IPv4_RANGE_RE = re.compile(r'^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$')
IPv6_RE = re.compile(r'^([0-9a-fA-F:]+)(/\d{1,3})?$')
MAC_RE = re.compile(r'^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$')


def _valid_ipv4(ip):
    if not IPv4_RE.match(ip):
        return False
    return all(int(n) <= 255 for n in ip.split('/')[0].split('.'))


def _valid_ipv4_range(range_str):
    if not IPv4_RANGE_RE.match(range_str):
        return False
    start, end = range_str.split('-')
    if not _valid_ipv4(start) or not _valid_ipv4(end):
        return False
    start_parts = [int(x) for x in start.split('.')]
    end_parts = [int(x) for x in end.split('.')]
    for i in range(4):
        if start_parts[i] > end_parts[i]:
            return False
        if start_parts[i] < end_parts[i]:
            return True
    return True


def _valid_ipv6(ip):
    return bool(IPv6_RE.match(ip))


def _valid_ip_or_segment(ip):
    return _valid_ipv4(ip) or _valid_ipv6(ip) or _valid_ipv4_range(ip)


def _valid_mac(mac):
    return bool(MAC_RE.match(mac))


def _validate_user_restrictions(allowed_ips, allowed_macs):
    if len(allowed_ips) > 8:
        return False, '允许IP最多8个'
    if len(allowed_macs) > 8:
        return False, '允许MAC最多8个'
    for ip in allowed_ips:
        if not _valid_ip_or_segment(ip):
            return False, f'无效的IP或IP段: {ip}'
    for mac in allowed_macs:
        if not _valid_mac(mac):
            return False, f'无效的MAC地址: {mac}'
    return True, ''


class UsersService:
    def list_users(self):
        conn = get_db_connection()
        try:
            cursor = conn.execute('''
                SELECT u.username, u.allowed_ips, u.allowed_macs,
                       u.access_control_table_id, u.enabled, u.created_at, u.updated_at,
                       COALESCE(p.language, 'zh-CN') as language,
                       COALESCE(p.theme, 'dark') as theme
                FROM users u
                LEFT JOIN user_preferences p ON u.username = p.user_id
            ''')
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                d['allowed_ips'] = json.loads(d.get('allowed_ips', '[]'))
                d['allowed_macs'] = json.loads(d.get('allowed_macs', '[]'))
                rows.append(d)
            return {'success': True, 'users': rows}
        finally:
            conn.close()

    def get_user(self, username):
        from services.auth_service import AuthService
        user = AuthService().get_user(username)
        return {'success': True, 'user': user}

    def create_user(self, data):
        username = data.get('username', '')
        password = data.get('password', '')
        if not username:
            return {'success': False, 'message': '用户名不能为空'}
        try:
            subprocess.run(['sudo', 'useradd', '-m', username], check=True)
            if password:
                subprocess.run(['sudo', 'chpasswd'], input=f'{username}:{password}\n',
                               text=True, check=True)
        except subprocess.CalledProcessError as e:
            return {'success': False, 'message': f'创建系统用户失败: {e}'}
        return self.update_user(username, data, create=True)

    def update_user(self, username, data, create=False):
        allowed_ips = data.get('allowed_ips', [])[:8]
        allowed_macs = data.get('allowed_macs', [])[:8]
        ok, msg = _validate_user_restrictions(allowed_ips, allowed_macs)
        if not ok:
            return {'success': False, 'message': msg}
        allowed_ips = json.dumps(allowed_ips)
        allowed_macs = json.dumps(allowed_macs)
        acl_id = data.get('access_control_table_id', 3)
        enabled = 1 if data.get('enabled', True) else 0
        conn = get_db_connection()
        try:
            if create:
                conn.execute('''
                    INSERT OR IGNORE INTO users (username, allowed_ips, allowed_macs,
                                                 access_control_table_id, enabled)
                    VALUES (?, ?, ?, ?, ?)
                ''', (username, allowed_ips, allowed_macs, acl_id, enabled))
            else:
                conn.execute('''
                    UPDATE users SET allowed_ips=?, allowed_macs=?,
                                     access_control_table_id=?, enabled=?,
                                     updated_at=CURRENT_TIMESTAMP
                    WHERE username=?
                ''', (allowed_ips, allowed_macs, acl_id, enabled, username))
            conn.execute('''
                INSERT OR REPLACE INTO user_preferences (user_id, language, theme)
                VALUES (?, COALESCE((SELECT language FROM user_preferences WHERE user_id=?), 'zh-CN'),
                        COALESCE((SELECT theme FROM user_preferences WHERE user_id=?), 'dark'))
            ''', (username, username, username))
            conn.commit()
            return {'success': True, 'message': '用户已保存'}
        finally:
            conn.close()

    def delete_user(self, username):
        try:
            subprocess.run(['sudo', 'userdel', '-r', username], check=False)
        except Exception:
            pass
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM users WHERE username=?', (username,))
            conn.execute('DELETE FROM user_preferences WHERE user_id=?', (username,))
            conn.execute('DELETE FROM user_sessions WHERE user_id=?', (username,))
            conn.commit()
            return {'success': True, 'message': '用户已删除'}
        finally:
            conn.close()

    def update_password(self, username, password):
        if not password:
            return {'success': False, 'message': '密码不能为空'}
        try:
            subprocess.run(['sudo', 'chpasswd'], input=f'{username}:{password}\n',
                           text=True, check=True)
            return {'success': True, 'message': '密码已更新'}
        except subprocess.CalledProcessError as e:
            return {'success': False, 'message': f'更新密码失败: {e}'}

    # ---------- access control tables ----------

    def list_acl_tables(self):
        conn = get_db_connection()
        try:
            cursor = conn.execute('SELECT * FROM access_control_tables')
            tables = [dict(r) for r in cursor.fetchall()]
            for t in tables:
                t['items'] = []
                cur = conn.execute('''
                    SELECT * FROM access_control_items WHERE access_control_table_id=?
                ''', (t['id'],))
                t['items'] = [dict(r) for r in cur.fetchall()]
            return {'success': True, 'tables': tables}
        finally:
            conn.close()

    def create_acl_table(self, data):
        name = data.get('name', '')
        description = data.get('description', '')
        conn = get_db_connection()
        try:
            cur = conn.execute('''
                INSERT INTO access_control_tables (name, description, is_builtin)
                VALUES (?, ?, 0)
            ''', (name, description))
            table_id = cur.lastrowid
            for item in data.get('items', []):
                conn.execute('''
                    INSERT INTO access_control_items
                    (access_control_table_id, level1, level2, level3, permission)
                    VALUES (?, ?, ?, ?, ?)
                ''', (table_id, item.get('level1', ''), item.get('level2', ''),
                      item.get('level3', ''), item.get('permission', '')))
            conn.commit()
            return {'success': True, 'id': table_id}
        finally:
            conn.close()

    def update_acl_table(self, table_id, data):
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE access_control_tables SET name=?, description=?,
                    updated_at=CURRENT_TIMESTAMP WHERE id=?
            ''', (data.get('name', ''), data.get('description', ''), table_id))
            conn.execute('DELETE FROM access_control_items WHERE access_control_table_id=?', (table_id,))
            for item in data.get('items', []):
                conn.execute('''
                    INSERT INTO access_control_items
                    (access_control_table_id, level1, level2, level3, permission)
                    VALUES (?, ?, ?, ?, ?)
                ''', (table_id, item.get('level1', ''), item.get('level2', ''),
                      item.get('level3', ''), item.get('permission', '')))
            conn.commit()
            return {'success': True, 'message': '访问控制表已更新'}
        finally:
            conn.close()

    def delete_acl_table(self, table_id):
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM access_control_items WHERE access_control_table_id=?', (table_id,))
            conn.execute('DELETE FROM access_control_tables WHERE id=? AND is_builtin=0', (table_id,))
            conn.commit()
            return {'success': True, 'message': '访问控制表已删除'}
        finally:
            conn.close()

    def save_preferences(self, username, data):
        language = data.get('language', 'zh-CN')
        theme = data.get('theme', 'dark')
        conn = get_db_connection()
        try:
            conn.execute('''
                INSERT OR REPLACE INTO user_preferences (user_id, language, theme)
                VALUES (?, ?, ?)
            ''', (username, language, theme))
            conn.commit()
            return {'success': True, 'message': '偏好已保存'}
        finally:
            conn.close()
