#!/usr/bin/env python3
# -*- coding: utf-8 -*-
try:
    from utils import jwt
except ImportError:
    import jwt
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'vyos-web-config-secret-key-change-in-production')


class AuthMiddleware:
    def __init__(self, auth_service):
        self.auth_service = auth_service

    def get_token(self, environ):
        auth_header = environ.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        return ''

    def check_auth(self, environ):
        token = self.get_token(environ)
        if not token:
            return {'success': False, 'message': 'Missing authentication token'}
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            username = payload.get('username')
            user = self.auth_service.get_user(username)
            if not user:
                return {'success': False, 'message': 'User not found'}
            return {'success': True, 'user': user}
        except jwt.ExpiredSignatureError:
            return {'success': False, 'message': 'Token expired'}
        except jwt.InvalidTokenError:
            return {'success': False, 'message': 'Invalid token'}

    def generate_token(self, username):
        import datetime
        now = datetime.datetime.utcnow()
        payload = {
            'username': username,
            'exp': (now + datetime.timedelta(hours=8)).timestamp(),
            'iat': now.timestamp(),
        }
        return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
