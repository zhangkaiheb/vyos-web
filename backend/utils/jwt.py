#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minimal JWT-compatible implementation using only standard library.
Supports HS256 encode/decode with expiration validation.
"""

import base64
import hmac
import hashlib
import json
import datetime


class ExpiredSignatureError(Exception):
    pass


class InvalidTokenError(Exception):
    pass


def _b64encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _b64decode(data):
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)


def encode(payload, key, algorithm='HS256'):
    if algorithm != 'HS256':
        raise ValueError('Only HS256 is supported')
    header = {'alg': algorithm, 'typ': 'JWT'}
    segments = [
        _b64encode(json.dumps(header, separators=(',', ':')).encode('utf-8')),
        _b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8')),
    ]
    signing_input = '.'.join(segments)
    signature = hmac.new(key.encode('utf-8'), signing_input.encode('utf-8'),
                         hashlib.sha256).digest()
    segments.append(_b64encode(signature))
    return '.'.join(segments)


def decode(token, key, algorithms=None, options=None):
    try:
        header_b64, payload_b64, signature_b64 = token.split('.')
    except ValueError:
        raise InvalidTokenError('Invalid token format')

    signing_input = f'{header_b64}.{payload_b64}'
    expected_sig = hmac.new(key.encode('utf-8'), signing_input.encode('utf-8'),
                            hashlib.sha256).digest()
    try:
        actual_sig = _b64decode(signature_b64)
    except Exception:
        raise InvalidTokenError('Invalid signature encoding')

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise InvalidTokenError('Signature verification failed')

    try:
        payload = json.loads(_b64decode(payload_b64).decode('utf-8'))
    except Exception:
        raise InvalidTokenError('Invalid payload')

    exp = payload.get('exp')
    if exp:
        try:
            if datetime.datetime.utcnow().timestamp() > exp:
                raise ExpiredSignatureError('Token expired')
        except TypeError:
            pass
    return payload
