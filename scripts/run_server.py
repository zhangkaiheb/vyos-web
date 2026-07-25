#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Development server for VyOS Web Config.
Production should use Apache + mod_wsgi.
"""

import os
import sys
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
    if path.startswith('/api/'):
        method = environ.get('REQUEST_METHOD', 'GET')
        # The VyOS ConfigSession instance is shared within this process.
        # Read operations can run concurrently, but write operations must be serialized.
        if method in ('POST', 'PUT', 'DELETE'):
            with API_LOCK:
                return application(environ, start_response)
        return application(environ, start_response)
    return static_app(environ, start_response)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    httpd = make_server(args.host, args.port, combined_app, server_class=ThreadingWSGIServer, handler_class=WSGIRequestHandler)
    print(f'Serving on http://{args.host}:{args.port}')
    httpd.serve_forever()
