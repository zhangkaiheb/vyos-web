#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Development server for VyOS Web Config.
Production should use Apache + mod_wsgi.
"""

import os
import sys
import ssl
import subprocess
import argparse
import threading
from wsgiref.simple_server import make_server, WSGIServer, WSGIRequestHandler
from socketserver import ThreadingMixIn

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))
sys.path.insert(0, '/usr/libexec/vyos')
sys.path.insert(0, '/usr/lib/python3/dist-packages')

from backend.app import application


class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    allow_reuse_address = True


API_LOCK = threading.Lock()


def generate_self_signed_cert(cert_dir):
    """Generate a self-signed certificate using openssl."""
    cert_path = os.path.join(cert_dir, 'cert.pem')
    key_path = os.path.join(cert_dir, 'key.pem')
    if os.path.isfile(cert_path) and os.path.isfile(key_path):
        print(f'Reusing existing certificate: {cert_path}')
        return cert_path, key_path
    os.makedirs(cert_dir, exist_ok=True)
    hostname = 'localhost'
    try:
        hostname = os.uname().nodename or 'localhost'
    except Exception:
        pass
    cmd = [
        'openssl', 'req', '-x509', '-nodes', '-days', '365',
        '-newkey', 'rsa:2048',
        '-keyout', key_path,
        '-out', cert_path,
        '-subj', f'/CN={hostname}',
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        os.chmod(key_path, 0o600)
        os.chmod(cert_path, 0o644)
        print(f'Generated self-signed certificate: {cert_path}')
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f'Warning: Failed to generate certificate: {e}', file=sys.stderr)
        return None, None
    return cert_path, key_path


def start_https_server(host, port, cert_file, key_file, app):
    """Start an HTTPS server in the current thread."""
    httpd = make_server(host, port, app, server_class=ThreadingWSGIServer, handler_class=WSGIRequestHandler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print(f'Serving on https://{host}:{port}')
    httpd.serve_forever()


def static_app(environ, start_response):
    """Serve static files from frontend directory."""
    path = environ.get('PATH_INFO', '/')
    if path == '/':
        path = '/index.html'
    static_root = os.path.join(BASE_DIR, 'frontend')
    file_path = os.path.join(static_root, path.lstrip('/'))
    if os.path.isfile(file_path):
        content_type = 'text/html'
        if file_path.endswith('.js'):
            content_type = 'application/javascript'
        elif file_path.endswith('.css'):
            content_type = 'text/css'
        elif file_path.endswith('.json'):
            content_type = 'application/json'
        headers = [
            ('Content-Type', content_type),
            ('Cache-Control', 'no-store, no-cache, must-revalidate'),
            ('Pragma', 'no-cache'),
            ('Expires', '0'),
        ]
        start_response('200 OK', headers)
        with open(file_path, 'rb') as f:
            return [f.read()]
    # SPA fallback: serve index.html for unknown paths
    index_path = os.path.join(static_root, 'index.html')
    start_response('200 OK', [
        ('Content-Type', 'text/html'),
        ('Cache-Control', 'no-store, no-cache, must-revalidate'),
        ('Pragma', 'no-cache'),
        ('Expires', '0'),
    ])
    with open(index_path, 'rb') as f:
        return [f.read()]


def combined_app(environ, start_response):
    path = environ.get('PATH_INFO', '')
    if path.startswith('/api/config/session-changed'):
        # Lightweight check — bypass the config lock and use cached result
        return application(environ, start_response)
    if path.startswith('/api/config'):
        # The VyOS Config object and ConfigSession are backed by C extensions
        # that are not thread-safe (even for reads). Serialize all config
        # requests to avoid segmentation faults under concurrent access.
        with API_LOCK:
            return application(environ, start_response)
    if path.startswith('/api/'):
        return application(environ, start_response)
    return static_app(environ, start_response)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--ssl', action='store_true', help='Enable HTTPS with auto-generated self-signed certificate')
    parser.add_argument('--ssl-cert', help='SSL certificate file path')
    parser.add_argument('--ssl-key', help='SSL private key file path')
    parser.add_argument('--ssl-port', type=int, default=8443, help='HTTPS port (default: 8443)')
    args = parser.parse_args()

    # Start HTTP server
    httpd = make_server(args.host, args.port, combined_app, server_class=ThreadingWSGIServer, handler_class=WSGIRequestHandler)
    print(f'Serving on http://{args.host}:{args.port}')

    # Start HTTPS server if SSL is enabled
    if args.ssl or args.ssl_cert:
        cert_file = args.ssl_cert
        key_file = args.ssl_key

        if not cert_file or not key_file:
            # Auto-generate certificate
            cert_dir = os.path.join(BASE_DIR, 'apache')
            cert_file, key_file = generate_self_signed_cert(cert_dir)

        if cert_file and key_file:
            # Start HTTPS server in background thread
            https_thread = threading.Thread(
                target=start_https_server,
                args=(args.host, args.ssl_port, cert_file, key_file, combined_app),
                daemon=True
            )
            https_thread.start()
        else:
            print('Warning: Failed to setup HTTPS, running HTTP only', file=sys.stderr)

    httpd.serve_forever()
