#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Persistent config reader daemon.

Holds a vyos.config.Config instance and serves read requests via Unix domain socket.
This avoids the ~10s Config() initialization overhead on every read request.

Run as a subprocess of the main Flask app. The main process communicates via
Unix socket at /tmp/vyos-config-reader.sock.
"""

import json
import logging
import os
import socket
import sys
import time
import threading

sys.path.insert(0, '/usr/libexec/vyos')

import vyos.config

SOCKET_PATH = '/tmp/vyos-config-reader.sock'
LOG_FILE = '/tmp/vyos-config-reader.log'

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s [config_reader_daemon] %(levelname)s: %(message)s'
)
_logger = logging.getLogger('config_reader_daemon')


class ConfigReaderDaemon:
    def __init__(self):
        self.config = None
        self.running = False
        self._config_mtime = 0
        # Monitor the active config directory (updated on commit, not just save)
        self._config_path = '/opt/vyatta/config/active'

    def _init_config(self):
        """Initialize or reload Config instance."""
        try:
            _logger.info('Initializing Config instance')
            self.config = vyos.config.Config()
            # Record the active config directory modification time
            try:
                self._config_mtime = os.path.getmtime(self._config_path)
            except Exception:
                self._config_mtime = 0
            _logger.info('Config instance initialized successfully')
            return True
        except Exception as e:
            _logger.error(f'Failed to initialize Config: {e}', exc_info=True)
            return False

    def _ensure_config_fresh(self):
        """Reload Config if active config directory has been modified (commit/save)."""
        try:
            current_mtime = os.path.getmtime(self._config_path)
            if current_mtime != self._config_mtime:
                _logger.info('Config changed (commit/save detected), reloading')
                self._init_config()
        except Exception:
            # If we can't check mtime, reload to be safe
            _logger.info('Cannot check config mtime, reloading')
            self._init_config()

    def _handle_read(self, request):
        """Handle read_config request."""
        path_list = request.get('path_list', [])
        effective = request.get('effective', True)
        try:
            self._ensure_config_fresh()
            if not path_list:
                data = self.config.get_cached_root_dict(effective=effective)
            else:
                data = self.config.get_config_dict(
                    path_list,
                    effective=effective,
                    key_mangling=('-', '_'),
                    get_first_key=True,
                    no_tag_node_value_mangle=True
                )
            if isinstance(data, dict):
                _logger.info(f'Read OK: path={path_list}, keys={len(data)}')
            return {'success': True, 'data': data}
        except Exception as e:
            _logger.error(f'Read error: {e}', exc_info=True)
            return {'success': False, 'error': str(e)}

    def _handle_reload(self, request):
        """Handle reload_config request (after commit/save)."""
        _logger.info('Reloading Config instance')
        success = self._init_config()
        return {'success': success}

    def _handle_request(self, request):
        """Route request to appropriate handler."""
        cmd = request.get('cmd')
        if cmd == 'read':
            return self._handle_read(request)
        elif cmd == 'reload':
            return self._handle_reload(request)
        elif cmd == 'ping':
            return {'success': True, 'pong': True}
        else:
            return {'success': False, 'error': f'Unknown command: {cmd}'}

    def _handle_client(self, conn):
        """Handle a single client connection."""
        try:
            buffer = b''
            while self.running:
                data = conn.recv(4096)
                if not data:
                    break
                buffer += data

                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    if line.strip():
                        try:
                            request = json.loads(line.decode('utf-8'))
                            response = self._handle_request(request)
                            response_json = json.dumps(response) + '\n'
                            conn.sendall(response_json.encode('utf-8'))
                        except Exception as e:
                            _logger.error(f'Error processing request: {e}', exc_info=True)
                            error_response = {'success': False, 'error': str(e)}
                            conn.sendall((json.dumps(error_response) + '\n').encode('utf-8'))
        except Exception as e:
            _logger.error(f'Client handler error: {e}', exc_info=True)
        finally:
            conn.close()

    def run(self):
        """Main daemon loop."""
        # Remove stale socket
        if os.path.exists(SOCKET_PATH):
            os.remove(SOCKET_PATH)

        # Initialize Config
        if not self._init_config():
            _logger.error('Failed to initialize Config, exiting')
            sys.exit(1)

        # Create socket server
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(SOCKET_PATH)
        server.listen(16)
        server.settimeout(1.0)

        self.running = True
        _logger.info(f'Daemon listening on {SOCKET_PATH}')

        try:
            while self.running:
                try:
                    conn, _ = server.accept()
                    # Handle each client in a separate thread for concurrency
                    t = threading.Thread(target=self._handle_client, args=(conn,), daemon=True)
                    t.start()
                except socket.timeout:
                    continue
                except Exception as e:
                    _logger.error(f'Server error: {e}', exc_info=True)
        finally:
            server.close()
            if os.path.exists(SOCKET_PATH):
                os.remove(SOCKET_PATH)
            _logger.info('Daemon shutdown complete')


if __name__ == '__main__':
    daemon = ConfigReaderDaemon()
    daemon.run()
