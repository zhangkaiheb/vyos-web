#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sqlite3
import os

DB_PATH = os.environ.get(
    'VYOS_WEB_DB_PATH',
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'vyos_web_config.db')
)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                allowed_ips TEXT DEFAULT '[]',
                allowed_macs TEXT DEFAULT '[]',
                access_control_table_id INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Access control tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_control_tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                is_builtin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Access control table items
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_control_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                access_control_table_id INTEGER NOT NULL,
                level1 TEXT NOT NULL,
                level2 TEXT,
                level3 TEXT,
                permission TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Audit log
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT,
                data TEXT,
                command TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                success INTEGER DEFAULT 1,
                error_message TEXT
            )
        ''')
        
        # User sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT
            )
        ''')
        
        # User preferences
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT PRIMARY KEY,
                language TEXT DEFAULT 'zh-CN',
                theme TEXT DEFAULT 'dark',
                last_login TIMESTAMP,
                menu_expanded TEXT
            )
        ''')
        
        # Monitoring history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS monitoring_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                metric TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                interface TEXT,
                unit TEXT
            )
        ''')
        
        # Conntrack logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conntrack_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                protocol TEXT NOT NULL,
                event TEXT NOT NULL,
                src_ip TEXT,
                src_port INTEGER,
                dst_ip TEXT,
                dst_port INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                interface TEXT,
                zone TEXT
            )
        ''')
        
        # Firewall logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS firewall_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id INTEGER,
                chain TEXT,
                action TEXT,
                protocol TEXT,
                src_ip TEXT,
                src_port INTEGER,
                dst_ip TEXT,
                dst_port INTEGER,
                in_interface TEXT,
                out_interface TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                log_group TEXT,
                log_level TEXT,
                packet_length INTEGER,
                payload TEXT
            )
        ''')

        # Conntrack log configuration (toggle)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS firewall_log_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                conntrack_enabled INTEGER DEFAULT 0,
                conntrack_level TEXT DEFAULT 'info',
                conntrack_tcp INTEGER DEFAULT 0,
                conntrack_udp INTEGER DEFAULT 0,
                conntrack_icmp INTEGER DEFAULT 0,
                conntrack_other INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Migrate existing tables to add per-protocol columns
        for col in ['conntrack_tcp', 'conntrack_udp', 'conntrack_icmp', 'conntrack_other']:
            try:
                cursor.execute(f'ALTER TABLE firewall_log_config ADD COLUMN {col} INTEGER DEFAULT 0')
            except Exception:
                pass
        cursor.execute('''
            INSERT OR IGNORE INTO firewall_log_config (id, conntrack_enabled, conntrack_level)
            VALUES (1, 0, 'info')
        ''')

        # Table entry quotas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quotas (
                table_type TEXT PRIMARY KEY,
                max_entries INTEGER DEFAULT 1024,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        _init_default_quotas(cursor)

        # Reference relationships between config paths
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS "references" (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                target_path TEXT NOT NULL,
                relationship TEXT DEFAULT 'uses',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_references_source ON "references" (source_path)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_references_target ON "references" (target_path)
        ''')

        # Webapp upgrade history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS webapp_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL,
                build TEXT,
                "commit" TEXT,
                action TEXT NOT NULL,
                source TEXT,
                backup_path TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success INTEGER DEFAULT 1,
                error_message TEXT
            )
        ''')

        # Builtin ACLs
        cursor.execute('''
            INSERT OR IGNORE INTO access_control_tables (id, name, description, is_builtin)
            VALUES (1, '只读', '只能查看所有配置', 1),
                   (2, '只写', '只能修改所有配置', 1),
                   (3, '读写', '可查看和修改所有配置', 1)
        ''')

        _init_builtin_acl_items(cursor)

        conn.commit()
    finally:
        conn.close()


def _init_default_quotas(cursor):
    default_types = [
        'firewall-rule', 'nat-rule', 'firewall-group', 'netns', 'vrf',
        'container', 'policy-route', 'prefix-list', 'route-map',
        'access-list', 'community-list'
    ]
    for table_type in default_types:
        cursor.execute('''
            INSERT OR IGNORE INTO quotas (table_type, max_entries)
            VALUES (?, 1024)
        ''', (table_type,))


def _init_builtin_acl_items(cursor):
    import json
    import os
    menu_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'menu.json')
    if not os.path.exists(menu_path):
        return
    with open(menu_path, 'r', encoding='utf-8') as f:
        menu = json.load(f)

    permissions = {1: 'read', 2: 'write', 3: 'readwrite'}
    items = []

    def walk(menu_list, l1='', l2=''):
        for item in menu_list:
            cid = item.get('id', '')
            children = item.get('children', [])
            route = item.get('route')
            if l1 == '':
                items.append((cid, '', ''))
                walk(children, cid, '')
            elif l2 == '':
                items.append((l1, cid, ''))
                walk(children, l1, cid)
            else:
                items.append((l1, l2, cid))
                walk(children, l1, l2)

    walk(menu)

    # For builtin ACLs, ensure every menu item has an entry so newly added
    # menu items become visible automatically after deployment.
    existing = set()
    try:
        cur = cursor.execute('''
            SELECT access_control_table_id, level1, level2, level3
            FROM access_control_items
            WHERE access_control_table_id IN (1, 2, 3)
        ''')
        for row in cur.fetchall():
            existing.add((row[0], row[1], row[2] or '', row[3] or ''))
    except Exception:
        pass

    for acl_id, perm in permissions.items():
        for l1, l2, l3 in items:
            key = (acl_id, l1, l2 or '', l3 or '')
            if key in existing:
                continue
            cursor.execute('''
                INSERT OR IGNORE INTO access_control_items
                (access_control_table_id, level1, level2, level3, permission)
                VALUES (?, ?, ?, ?, ?)
            ''', key + (perm,))


if __name__ == '__main__':
    init_db()
