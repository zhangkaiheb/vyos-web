#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Notification / alarm service.
Stores system events such as reboots, logins and logouts in the SQLite
notifications table and exposes CRUD operations for the frontend.
"""

import json
from datetime import datetime

from utils.database import get_db_connection


class NotificationService:
    def add(self, notification_type, title, message='', data=None):
        """Insert a new notification."""
        conn = get_db_connection()
        try:
            conn.execute('''
                INSERT INTO notifications (type, title, message, data, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (notification_type, title, message, json.dumps(data or {}), datetime.utcnow().isoformat()))
            conn.commit()
        finally:
            conn.close()

    def list(self, limit=100):
        """Return recent notifications ordered newest first."""
        conn = get_db_connection()
        try:
            rows = conn.execute('''
                SELECT id, type, title, message, read, data, timestamp
                FROM notifications
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,)).fetchall()
            return [self._row_to_dict(r) for r in rows]
        finally:
            conn.close()

    def unread_count(self):
        """Return the number of unread notifications."""
        conn = get_db_connection()
        try:
            row = conn.execute('''
                SELECT COUNT(*) AS cnt FROM notifications WHERE read = 0
            ''').fetchone()
            return row['cnt'] if row else 0
        finally:
            conn.close()

    def mark_read(self, notification_id):
        """Mark a single notification as read."""
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE notifications SET read = 1 WHERE id = ?
            ''', (notification_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    def mark_all_read(self):
        """Mark all notifications as read."""
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE notifications SET read = 1 WHERE read = 0
            ''')
            conn.commit()
            return True
        finally:
            conn.close()

    def delete(self, notification_id):
        """Delete a notification."""
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM notifications WHERE id = ?', (notification_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    def delete_all_read(self):
        """Delete all read notifications."""
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM notifications WHERE read = 1')
            conn.commit()
            return True
        finally:
            conn.close()

    def _row_to_dict(self, row):
        data = row['data']
        try:
            data = json.loads(data) if data else {}
        except Exception:
            data = {}
        return {
            'id': row['id'],
            'type': row['type'],
            'title': row['title'],
            'message': row['message'] or '',
            'read': bool(row['read']),
            'data': data,
            'timestamp': row['timestamp'],
        }
