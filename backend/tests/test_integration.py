#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Integration tests for VyOS Web Config backend API.

Run with: python3 -m unittest discover -s backend/tests -v
"""

import io
import json
import os
import shutil
import sys
import tempfile
import unittest

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(PROJECT_DIR)

# Ensure project paths are available before patching database path.
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, '/usr/libexec/vyos')

# Patch database path to a temporary test database before importing services.
import utils.database  # noqa: E402

TEST_DB_FD, TEST_DB_PATH = tempfile.mkstemp(suffix='.db')
os.close(TEST_DB_FD)
utils.database.DB_PATH = TEST_DB_PATH

# Now import the WSGI application.
from app import application  # noqa: E402


def _to_bytes(body):
    if isinstance(body, bytes):
        return body
    if isinstance(body, str):
        return body.encode('utf-8')
    return json.dumps(body).encode('utf-8')


class TestClient:
    """Minimal WSGI test client."""

    def __init__(self, app):
        self.app = app

    def request(self, method, path, body=None, headers=None, query_string=''):
        body = _to_bytes(body or b'')
        environ = {
            'REQUEST_METHOD': method,
            'PATH_INFO': path,
            'QUERY_STRING': query_string,
            'CONTENT_TYPE': 'application/json',
            'CONTENT_LENGTH': str(len(body)),
            'wsgi.input': io.BytesIO(body),
            'wsgi.errors': sys.stderr,
            'REMOTE_ADDR': '127.0.0.1',
        }
        if headers:
            for key, value in headers.items():
                environ['HTTP_' + key.upper().replace('-', '_')] = value

        response_status = []
        response_headers = []

        def start_response(status, headers):
            response_status.append(status)
            response_headers.extend(headers)

        result = self.app(environ, start_response)
        data = b''.join(result) if not isinstance(result, bytes) else result
        return {
            'status': response_status[0] if response_status else '500',
            'headers': response_headers,
            'body': data,
        }

    def json(self, method, path, body=None, headers=None, query_string=''):
        res = self.request(method, path, body, headers, query_string)
        try:
            res['json'] = json.loads(res['body'].decode('utf-8'))
        except Exception:
            res['json'] = None
        return res


class IntegrationTestBase(unittest.TestCase):
    client = TestClient(application)
    token = None

    def setUp(self):
        # Authenticate once for tests that need a valid token.
        if IntegrationTestBase.token is None:
            res = self.client.json(
                'POST', '/api/auth/login',
                body=json.dumps({'username': 'vyos', 'password': 'vyos'})
            )
            if res['json'] and res['json'].get('success'):
                IntegrationTestBase.token = res['json']['token']
            else:
                self.fail(f'Unable to authenticate for tests: {res}')

    def auth_headers(self):
        return {'Authorization': f'Bearer {self.token}'}


class AuthTests(IntegrationTestBase):
    def test_login_success(self):
        res = self.client.json(
            'POST', '/api/auth/login',
            body=json.dumps({'username': 'vyos', 'password': 'vyos'})
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIn('token', res['json'])

    def test_login_failure(self):
        res = self.client.json(
            'POST', '/api/auth/login',
            body=json.dumps({'username': '__nonexistent_user__', 'password': 'wrong'})
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertFalse(res['json']['success'])

    def test_get_user_requires_auth(self):
        res = self.client.json('GET', '/api/auth/user')
        self.assertEqual(res['status'], '401 Unauthorized')

    def test_get_user_with_auth(self):
        res = self.client.json('GET', '/api/auth/user', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIn('user', res['json'])


class HelpTests(IntegrationTestBase):
    def test_help_firewall_ipv4(self):
        res = self.client.json(
            'GET', '/api/help', headers=self.auth_headers(),
            query_string='path=/firewall/ipv4'
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIn('content', res['json'])

    def test_help_unknown_path(self):
        res = self.client.json(
            'GET', '/api/help', headers=self.auth_headers(),
            query_string='path=/nonexistent/page'
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])


class ConntrackLogTests(IntegrationTestBase):
    def test_get_conntrack_log_config(self):
        res = self.client.json(
            'GET', '/api/conntrack-log-config', headers=self.auth_headers()
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIn('conntrack_enabled', res['json'])

    def test_set_conntrack_log_config(self):
        payload = {
            'enabled': True,
            'level': 'debug',
            'tcp': True,
            'udp': False,
            'icmp': True,
            'other': False,
        }
        res = self.client.json(
            'POST', '/api/conntrack-log-config',
            body=json.dumps(payload), headers=self.auth_headers()
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])

        res2 = self.client.json(
            'GET', '/api/conntrack-log-config', headers=self.auth_headers()
        )
        data = res2['json']
        self.assertTrue(data['conntrack_enabled'])
        self.assertTrue(data['conntrack_tcp'])
        self.assertTrue(data['conntrack_icmp'])
        self.assertFalse(data['conntrack_udp'])


class MenuTests(IntegrationTestBase):
    def test_get_menu(self):
        res = self.client.json('GET', '/api/menu', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIsInstance(res['json'].get('menu'), list)


class UserAclTests(IntegrationTestBase):
    def test_list_users(self):
        res = self.client.json('GET', '/api/users', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])

    def test_list_acl_tables(self):
        res = self.client.json('GET', '/api/access-control', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])


class LogTests(IntegrationTestBase):
    def test_get_audit_logs(self):
        res = self.client.json(
            'GET', '/api/logs', headers=self.auth_headers(),
            query_string='type=audit&page=1&page_size=10'
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIn('data', res['json'])


class FirewallProtocolTests(IntegrationTestBase):
    def test_get_protocols(self):
        res = self.client.json(
            'GET', '/api/firewall/protocols', headers=self.auth_headers()
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])


class QuotaTests(IntegrationTestBase):
    def test_list_quotas(self):
        res = self.client.json('GET', '/api/quotas', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])

    def test_update_quota(self):
        res = self.client.json(
            'PUT', '/api/quotas/firewall-rule',
            body=json.dumps({'max_entries': 2048}),
            headers=self.auth_headers()
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])


class SystemInfoTests(IntegrationTestBase):
    def test_get_system_info(self):
        res = self.client.json('GET', '/api/system/info', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertIn('success', res['json'])


class EthernetInterfaceTests(IntegrationTestBase):
    def test_get_ethernet_interfaces(self):
        res = self.client.json('GET', '/api/interfaces/ethernet', headers=self.auth_headers())
        self.assertEqual(res['status'], '200 OK')
        self.assertTrue(res['json']['success'])
        self.assertIsInstance(res['json'].get('interfaces'), list)


class ConfigTests(IntegrationTestBase):
    def test_get_config_requires_auth(self):
        res = self.client.json('GET', '/api/config', query_string='path=firewall')
        self.assertEqual(res['status'], '401 Unauthorized')

    def test_get_config_firewall(self):
        res = self.client.json(
            'GET', '/api/config', headers=self.auth_headers(),
            query_string='path=firewall'
        )
        self.assertEqual(res['status'], '200 OK')
        self.assertIn('success', res['json'])


class ImportExportPageSmokeTest(IntegrationTestBase):
    def test_export_config_endpoint(self):
        res = self.client.json(
            'POST', '/api/config/export',
            body=json.dumps({'password': 'test123'}),
            headers=self.auth_headers()
        )
        self.assertEqual(res['status'], '200 OK')
        # Export may succeed or fail depending on VyOS environment; just ensure
        # the response is well-formed.
        self.assertIn('success', res['json'])


class StaticFrontendTests(unittest.TestCase):
    def test_static_not_served_by_wsgi(self):
        res = TestClient(application).request('GET', '/')
        self.assertEqual(res['status'], '404 Not Found')


def load_tests(loader, tests, pattern):
    """Custom load_tests to ensure test order is predictable."""
    suite = unittest.TestSuite()
    for test_class in [
        AuthTests,
        HelpTests,
        ConntrackLogTests,
        MenuTests,
        UserAclTests,
        LogTests,
        FirewallProtocolTests,
        QuotaTests,
        SystemInfoTests,
        EthernetInterfaceTests,
        ConfigTests,
        ImportExportPageSmokeTest,
        StaticFrontendTests,
    ]:
        suite.addTests(loader.loadTestsFromTestCase(test_class))
    return suite


def _cleanup_test_db():
    if os.path.exists(TEST_DB_PATH):
        try:
            os.unlink(TEST_DB_PATH)
        except Exception:
            pass


import atexit  # noqa: E402
atexit.register(_cleanup_test_db)


if __name__ == '__main__':
    unittest.main(verbosity=2)
