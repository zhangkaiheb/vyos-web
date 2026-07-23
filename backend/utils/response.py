#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json


def json_response(start_response, status_code, data, headers=None):
    status = f'{status_code} OK'
    if status_code == 201:
        status = '201 Created'
    elif status_code == 204:
        status = '204 No Content'
    
    response_headers = [('Content-Type', 'application/json; charset=utf-8')]
    if headers:
        response_headers.extend(headers)
    
    start_response(status, response_headers)
    return [json.dumps(data, ensure_ascii=False).encode('utf-8')]


def sse_response(start_response, generator):
    """Server-Sent Events response from a generator yielding dicts."""
    response_headers = [
        ('Content-Type', 'text/event-stream; charset=utf-8'),
        ('Cache-Control', 'no-cache'),
        ('Connection', 'keep-alive'),
    ]
    start_response('200 OK', response_headers)

    def wrap():
        for data in generator:
            if isinstance(data, dict):
                text = json.dumps(data, ensure_ascii=False)
            else:
                text = str(data)
            yield f'data: {text}\n\n'.encode('utf-8')

    return wrap()


def error_response(start_response, status_code, message):
    status_map = {
        400: '400 Bad Request',
        401: '401 Unauthorized',
        403: '403 Forbidden',
        404: '404 Not Found',
        405: '405 Method Not Allowed',
        500: '500 Internal Server Error',
    }
    status = status_map.get(status_code, f'{status_code} Error')
    
    response_headers = [('Content-Type', 'application/json; charset=utf-8')]
    start_response(status, response_headers)
    
    data = {
        'success': False,
        'code': status_code,
        'message': message,
        'detail': '',
        'suggestion': 'Please check your request and try again.',
    }
    return [json.dumps(data, ensure_ascii=False).encode('utf-8')]
