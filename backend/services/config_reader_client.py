#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Client wrapper for persistent config reader daemon.

Provides the same API as the old _read_config_subprocess function.
Manages daemon lifecycle and Unix socket IPC.
"""

import json
import logging
import os
import socket
import subprocess
import sys
import time
import threading

_logger = logging.getLogger('config_service')

SOCKET_PATH = '/tmp/vyos-config-reader.sock'
DAEMON_SCRIPT = os.path.join(os.path.dirname(__file__), 'config_reader_daemon.py')


class ConfigReaderClient:
    """Singleton client for communicating with config reader daemon."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._daemon_process = None
        self._socket = None
        self._restart_count = 0
        self._max_restarts = 5
        self._restart_delay = 1.0
        self._initialized = True

    def start_daemon(self):
        """Start the daemon subprocess if not already running."""
        if self._is_daemon_running():
            _logger.info('Config reader daemon already running')
            return True

        _logger.info('Starting config reader daemon')
        try:
            self._daemon_process = subprocess.Popen(
                [sys.executable, DAEMON_SCRIPT],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL
            )
            # Wait for socket to appear
            for _ in range(50):  # 5 seconds max
                if os.path.exists(SOCKET_PATH):
                    time.sleep(0.1)  # Give it a moment to start listening
                    return True
                time.sleep(0.1)

            _logger.error('Daemon started but socket did not appear')
            return False
        except Exception as e:
            _logger.error(f'Failed to start daemon: {e}', exc_info=True)
            return False

    def _is_daemon_running(self):
        """Check if daemon process is running."""
        if self._daemon_process is None:
            return False
        return self._daemon_process.poll() is None

    def _ensure_connection(self):
        """Ensure we have a working socket connection."""
        if self._socket is not None:
            # Test connection with ping
            try:
                self._send_request({'cmd': 'ping'})
                return True
            except Exception:
                self._socket.close()
                self._socket = None

        # Create new connection
        try:
            self._socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self._socket.connect(SOCKET_PATH)
            self._socket.settimeout(15.0)
            return True
        except Exception as e:
            _logger.warning(f'Failed to connect to daemon: {e}')
            if self._socket:
                self._socket.close()
                self._socket = None
            return False

    def _send_request(self, request):
        """Send request and receive response."""
        if not self._socket:
            raise ConnectionError('Not connected')

        # Send request
        request_json = json.dumps(request) + '\n'
        self._socket.sendall(request_json.encode('utf-8'))

        # Receive response (read until newline)
        buffer = b''
        while True:
            chunk = self._socket.recv(4096)
            if not chunk:
                raise ConnectionError('Connection closed')
            buffer += chunk
            if b'\n' in buffer:
                response_line, _ = buffer.split(b'\n', 1)
                return json.loads(response_line.decode('utf-8'))

    def _request_with_retry(self, request, max_retries=3):
        """Send request with automatic retry and daemon restart."""
        for attempt in range(max_retries):
            try:
                # Ensure daemon is running
                if not self._is_daemon_running():
                    _logger.warning('Daemon not running, attempting restart')
                    if not self._restart_daemon():
                        raise RuntimeError('Failed to restart daemon')

                # Ensure connection
                if not self._ensure_connection():
                    raise ConnectionError('Cannot connect to daemon')

                # Send request
                return self._send_request(request)

            except Exception as e:
                _logger.warning(f'Request failed (attempt {attempt + 1}/{max_retries}): {e}')
                if self._socket:
                    self._socket.close()
                    self._socket = None

                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))
                else:
                    raise

        raise RuntimeError('Max retries exceeded')

    def _restart_daemon(self):
        """Restart the daemon with exponential backoff."""
        self._restart_count += 1
        if self._restart_count > self._max_restarts:
            _logger.error(f'Max daemon restarts ({self._max_restarts}) exceeded')
            return False

        delay = self._restart_delay * (2 ** (self._restart_count - 1))
        _logger.info(f'Restarting daemon (attempt {self._restart_count}, delay {delay}s)')
        time.sleep(delay)

        # Kill old process if still running
        if self._daemon_process:
            try:
                self._daemon_process.terminate()
                self._daemon_process.wait(timeout=2)
            except Exception:
                try:
                    self._daemon_process.kill()
                except Exception:
                    pass
            self._daemon_process = None

        # Remove stale socket
        if os.path.exists(SOCKET_PATH):
            try:
                os.remove(SOCKET_PATH)
            except Exception:
                pass

        # Start new daemon
        return self.start_daemon()

    def read_config(self, path_list, effective=True):
        """Read config via daemon (same API as old _read_config_subprocess)."""
        request = {
            'cmd': 'read',
            'path_list': path_list,
            'effective': effective
        }

        try:
            response = self._request_with_retry(request)
            if response.get('success'):
                return response.get('data', {})
            else:
                _logger.error(f'Daemon read error: {response.get("error")}')
                return {}
        except Exception as e:
            _logger.error(f'read_config failed: {e}', exc_info=True)
            return {}

    def reload_config(self):
        """Reload config in daemon (call after commit/save)."""
        request = {'cmd': 'reload'}
        try:
            response = self._request_with_retry(request)
            if response.get('success'):
                _logger.info('Daemon config reloaded successfully')
                return True
            else:
                _logger.error(f'Daemon reload error: {response.get("error")}')
                return False
        except Exception as e:
            _logger.error(f'reload_config failed: {e}', exc_info=True)
            return False

    def stop_daemon(self):
        """Stop the daemon subprocess."""
        if self._daemon_process:
            _logger.info('Stopping config reader daemon')
            try:
                self._daemon_process.terminate()
                self._daemon_process.wait(timeout=5)
            except Exception:
                try:
                    self._daemon_process.kill()
                except Exception:
                    pass
            self._daemon_process = None

        if self._socket:
            try:
                self._socket.close()
            except Exception:
                pass
            self._socket = None

        if os.path.exists(SOCKET_PATH):
            try:
                os.remove(SOCKET_PATH)
            except Exception:
                pass


# Global client instance
_client = None
_client_lock = threading.Lock()


def get_client():
    """Get the global ConfigReaderClient instance."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = ConfigReaderClient()
    return _client


def start_daemon():
    """Start the daemon (called from app.py)."""
    return get_client().start_daemon()


def stop_daemon():
    """Stop the daemon (called from app.py on shutdown)."""
    global _client
    if _client:
        _client.stop_daemon()
        _client = None


def read_config(path_list, effective=True):
    """Read config via daemon (convenience function)."""
    return get_client().read_config(path_list, effective)


def reload_config():
    """Reload config in daemon (convenience function)."""
    return get_client().reload_config()
