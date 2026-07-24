#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VyOS Web Backend Application
WSGI compatible backend using standard Python libraries.
"""

import json
import os
import sys
import re
import traceback
from datetime import datetime
from urllib.parse import parse_qs, urlparse

# Add project path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, '/usr/libexec/vyos')

from services.auth_service import AuthService
from services.config_service import ConfigService
from services.monitor_service import MonitorService
from services.log_service import LogService
from services.users_service import UsersService
from services.system_service import SystemService
from services.interface_service import InterfaceService
from services.collector import start_collector
from utils.response import json_response, sse_response, error_response
from utils.auth_middleware import AuthMiddleware


# Start background collectors on module load.
start_collector()


class VyOSWebApp:
    def __init__(self):
        self.auth_service = AuthService()
        self.config_service = ConfigService()
        self.monitor_service = MonitorService()
        self.log_service = LogService()
        self.users_service = UsersService()
        self.system_service = SystemService()
        self.interface_service = InterfaceService()
        self.auth_middleware = AuthMiddleware(self.auth_service)
        self.routes = self._register_routes()

    def _register_routes(self):
        return {
            'POST': {
                '/api/auth/login': self.handle_login,
                '/api/auth/logout': self.handle_logout,
                '/api/config/commit': self.handle_config_commit,
                '/api/config/save': self.handle_config_save,
                '/api/config/rollback': self.handle_config_rollback,
                '/api/config/compare': self.handle_config_compare,
                '/api/config/load': self.handle_config_load,
                '/api/config/merge': self.handle_config_merge,
                '/api/config/import': self.handle_config_import,
                '/api/config/export': self.handle_config_export,
                '/api/firewall/import': self.handle_firewall_import,
                '/api/firewall/move-rule': self.handle_firewall_move_rule,
                '/api/firewall/copy-rule': self.handle_firewall_copy_rule,
                '/api/firewall/clear-counters': self.handle_firewall_clear_counters,
                '/api/config/discard': self.handle_config_discard,
                '/api/users': self.handle_create_user,
                '/api/users/:username/password': self.handle_update_password,
                '/api/access-control': self.handle_create_acl,
                '/api/system/ping': self.handle_system_ping,
                '/api/system/traceroute': self.handle_system_traceroute,
                '/api/system/mtr': self.handle_system_mtr,
                '/api/system/tcpdump': self.handle_system_tcpdump,
                '/api/system/reboot': self.handle_system_reboot,
                '/api/system/poweroff': self.handle_system_poweroff,
                '/api/system/reset': self.handle_system_reset,
                '/api/system/date': self.handle_system_date,
                '/api/system/terminal': self.handle_system_terminal,
                '/api/system/shell': self.handle_system_shell,
                '/api/system/image/add': self.handle_image_add,
                '/api/system/image/delete': self.handle_image_delete,
                '/api/system/image/default': self.handle_image_default,
                '/api/system/update/container': self.handle_update_container,
                '/api/system/update/geoip': self.handle_update_geoip,
                '/api/system/update/suricata': self.handle_update_suricata,
                '/api/system/update/webproxy': self.handle_update_webproxy,
                '/api/system/generate': self.handle_generate_command,
                '/api/references': self.handle_add_reference,
                '/api/conntrack-log-config': self.handle_set_conntrack_log_config,
                '/api/webapp/version': self.handle_webapp_version,
                '/api/webapp/check-update': self.handle_webapp_check_update,
                '/api/op-mode': self.handle_op_mode_execute,
                '/api/op-mode/clear': self.handle_op_mode_clear,
                '/api/op-mode/restart': self.handle_op_mode_restart,
                '/api/op-mode/update': self.handle_op_mode_update,
                '/api/op-mode/generate': self.handle_op_mode_generate,
                '/api/webapp/update': self.handle_webapp_update,
                '/api/webapp/rollback': self.handle_webapp_rollback,
            },
            'GET': {
                '/api/auth/user': self.handle_get_user,
                '/api/menu': self.handle_get_menu,
                '/api/config': self.handle_get_config,
                '/api/config/commands': self.handle_get_commands,
                '/api/config/suggestions': self.handle_get_suggestions,
                '/api/monitor': self.handle_monitor,
                '/api/logs': self.handle_logs,
                '/api/system/info': self.handle_system_info,
                '/api/system/revisions': self.handle_revisions,
                '/api/system/interfaces': self.handle_system_interfaces,
                '/api/interfaces/ethernet': self.handle_ethernet_interfaces,
                '/api/system/images': self.handle_list_images,
                '/api/firewall/protocols': self.handle_firewall_protocols,
                '/api/firewall/rule-stats': self.handle_firewall_rule_stats,
                '/api/firewall/export': self.handle_firewall_export,
                '/api/firewall/references': self.handle_firewall_references,
                '/api/op-mode/show': self.handle_op_mode_show,
                '/api/conntrack-log-config': self.handle_get_conntrack_log_config,
                '/api/help': self.handle_help,
                '/api/monitor/history': self.handle_monitor_history,
                '/api/monitor/stream': self.handle_monitor_stream,
                '/api/config/session-changed': self.handle_session_changed,
                '/api/users': self.handle_list_users,
                '/api/users/:username': self.handle_get_user_detail,
                '/api/access-control': self.handle_list_acl,
                '/api/quotas': self.handle_list_quotas,
                '/api/quotas/:type': self.handle_get_quota,
                '/api/references': self.handle_get_references,
                '/api/references/check': self.handle_check_references,
                '/api/webapp/version': self.handle_webapp_version,
                '/api/webapp/history': self.handle_webapp_history,
            },
            'PUT': {
                '/api/config': self.handle_set_config,
                '/api/users/:username': self.handle_update_user,
                '/api/access-control/:id': self.handle_update_acl,
                '/api/users/:username/preferences': self.handle_save_preferences,
                '/api/quotas/:type': self.handle_set_quota,
            },
            'DELETE': {
                '/api/config': self.handle_delete_config,
                '/api/users/:username': self.handle_delete_user,
                '/api/access-control/:id': self.handle_delete_acl,
                '/api/references': self.handle_remove_reference,
            },
        }

    def __call__(self, environ, start_response):
        try:
            return self.handle_request(environ, start_response)
        except Exception as e:
            traceback.print_exc()
            return error_response(start_response, 500, str(e))

    def handle_request(self, environ, start_response):
        method = environ.get('REQUEST_METHOD', 'GET')
        path = environ.get('PATH_INFO', '')
        if not path:
            path = '/'

        # Static files for frontend (if served from same Apache)
        if method == 'GET' and path.startswith('/'):
            pass  # Let Apache handle static files

        # API routes
        if not path.startswith('/api/'):
            return error_response(start_response, 404, 'Not Found')

        # CORS headers
        headers = [
            ('Content-Type', 'application/json; charset=utf-8'),
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type, Authorization'),
        ]

        if method == 'OPTIONS':
            start_response('200 OK', headers)
            return [b'']

        routes = self.routes.get(method, {})
        handler, path_params = self._match_route(routes, path)

        if not handler:
            return error_response(start_response, 404, f'Route not found: {method} {path}')

        # Authentication check (except login)
        if path not in ['/api/auth/login']:
            auth_result = self.auth_middleware.check_auth(environ)
            if not auth_result['success']:
                return error_response(start_response, 401, auth_result['message'])
            environ['user'] = auth_result['user']

        # Parse request body
        body = self._get_request_body(environ)
        body['_path_params'] = path_params

        try:
            result = handler(environ, body)
            if hasattr(result, '__iter__') and not isinstance(result, (dict, list, bytes, str)):
                return sse_response(start_response, result)
            return json_response(start_response, 200, result, headers)
        except Exception as e:
            traceback.print_exc()
            return error_response(start_response, 500, str(e))

    def _match_route(self, routes, path):
        if path in routes:
            return routes[path], {}
        path_parts = path.rstrip('/').split('/')
        for route, handler in routes.items():
            route_parts = route.rstrip('/').split('/')
            if len(route_parts) != len(path_parts):
                continue
            params = {}
            matched = True
            for rp, pp in zip(route_parts, path_parts):
                if rp.startswith(':') and rp[1:]:
                    params[rp[1:]] = pp
                elif rp != pp:
                    matched = False
                    break
            if matched:
                return handler, params
        return None, {}

    def _get_request_body(self, environ):
        try:
            length = int(environ.get('CONTENT_LENGTH', 0))
            if length > 0:
                body = environ['wsgi.input'].read(length)
                return json.loads(body.decode('utf-8'))
        except Exception:
            pass
        return {}

    def handle_login(self, environ, body):
        username = body.get('username', '')
        password = body.get('password', '')
        ip_address = environ.get('REMOTE_ADDR', '')
        return self.auth_service.login(username, password, ip_address)

    def handle_logout(self, environ, body):
        token = self.auth_middleware.get_token(environ)
        return self.auth_service.logout(token)

    def handle_get_user(self, environ, body):
        user = environ.get('user', {})
        return {'success': True, 'user': user}

    def handle_get_menu(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.get_menu(user)

    def handle_get_config(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        session = query.get('session', [''])[0] in ('1', 'true', 'yes')
        if session:
            return self.config_service.get_session_config(path)
        return self.config_service.get_config(path)

    def handle_set_config(self, environ, body):
        user = environ.get('user', {})
        path = body.get('path', '')
        value = body.get('value')
        return self.config_service.set_config(user, path, value)

    def handle_delete_config(self, environ, body):
        user = environ.get('user', {})
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.delete_config(user, path)

    def handle_config_commit(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.commit_config(user)

    def handle_config_save(self, environ, body):
        user = environ.get('user', {})
        password = body.get('password', '')
        return self.config_service.save_config(user, password)

    def handle_config_rollback(self, environ, body):
        user = environ.get('user', {})
        revision = body.get('revision')
        return self.config_service.rollback_config(user, revision)

    def handle_config_compare(self, environ, body):
        left = body.get('left', '')
        right = body.get('right', '')
        return self.config_service.compare_config(left, right)

    def handle_config_discard(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.discard_config(user)

    def handle_config_load(self, environ, body):
        user = environ.get('user', {})
        source = body.get('source', '')
        password = body.get('password', '')
        return self.config_service.load_config(user, source, password)

    def handle_config_merge(self, environ, body):
        user = environ.get('user', {})
        source = body.get('source', '')
        return self.config_service.merge_config(user, source)

    def handle_config_import(self, environ, body):
        user = environ.get('user', {})
        config_type = body.get('type', '')
        data = body.get('data', '')
        password = body.get('password', '')
        path = body.get('path', '')
        return self.config_service.import_config(user, config_type, data, password, path)

    def handle_config_export(self, environ, body):
        user = environ.get('user', {})
        password = body.get('password', '')
        include_sensitive = body.get('include_sensitive', True)
        return self.config_service.export_config(user, password, include_sensitive)

    def handle_get_commands(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.get_commands(path)

    def handle_get_suggestions(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        field = query.get('field', [''])[0]
        return self.config_service.get_suggestions(path, field)

    def handle_monitor(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        widget_type = query.get('type', [''])[0]
        interface = query.get('interface', [''])[0]
        duration = query.get('duration', ['24h'])[0]
        return self.monitor_service.get_data(widget_type, interface, duration)

    def handle_logs(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        log_type = query.get('type', [''])[0]
        page = int(query.get('page', ['1'])[0])
        page_size = int(query.get('page_size', ['20'])[0])
        keyword = query.get('keyword', [None])[0]
        start_time = query.get('start_time', [None])[0]
        end_time = query.get('end_time', [None])[0]
        level = query.get('level', [None])[0]
        return self.log_service.get_logs(log_type, page, page_size, keyword, start_time, end_time, level)

    def handle_system_info(self, environ, body):
        return self.config_service.get_system_info()

    def handle_revisions(self, environ, body):
        return self.config_service.get_revisions()

    def handle_firewall_protocols(self, environ, body):
        return self.config_service.get_firewall_protocols()

    def handle_firewall_rule_stats(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.get_firewall_rule_stats(path)

    def handle_firewall_import(self, environ, body):
        user = environ.get('user', {})
        path = body.get('path', '')
        rows = body.get('rows', [])
        return self.config_service.import_config(user, 'firewall-rules', rows, path=path)

    def handle_firewall_move_rule(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.move_firewall_rule(
            user, body.get('path', ''), body.get('from'), body.get('to')
        )

    def handle_firewall_copy_rule(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.copy_firewall_rule(
            user, body.get('path', ''), body.get('from'), body.get('to')
        )

    def handle_firewall_clear_counters(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.clear_firewall_counters(user, body.get('path', ''))

    def handle_firewall_export(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.get_config(path)

    def handle_firewall_references(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.check_references_before_delete(path)

    def handle_monitor_history(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        metric_type = query.get('type', [''])[0]
        metric = query.get('metric', [''])[0]
        duration = query.get('duration', ['24h'])[0]
        interface = query.get('interface', [None])[0]
        return self.monitor_service.get_history(metric_type, metric, duration, interface)

    def handle_monitor_stream(self, environ, body):
        """Server-Sent Events stream for real-time monitor widgets."""
        import time
        query = parse_qs(environ.get('QUERY_STRING', ''))
        widget_type = query.get('type', ['cpu'])[0]
        interface = query.get('interface', [''])[0]
        interval = int(query.get('interval', ['2'])[0])

        def event_generator():
            while True:
                data = self.monitor_service.get_data(widget_type, interface, '')
                yield {'type': widget_type, 'timestamp': datetime.utcnow().isoformat(), **data}
                time.sleep(interval)

        return event_generator()

    def handle_session_changed(self, environ, body):
        return self.config_service.session_changed()

    def handle_system_interfaces(self, environ, body):
        return self.monitor_service.get_data('interface-list', '', '')

    def handle_ethernet_interfaces(self, environ, body):
        return self.interface_service.get_ethernet_interfaces()

    # ---------- users ----------

    def handle_list_users(self, environ, body):
        return self.users_service.list_users()

    def handle_get_user_detail(self, environ, body):
        username = body.get('_path_params', {}).get('username')
        return self.users_service.get_user(username)

    def handle_create_user(self, environ, body):
        return self.users_service.create_user(body)

    def handle_update_user(self, environ, body):
        username = body.get('_path_params', {}).get('username')
        return self.users_service.update_user(username, body)

    def handle_delete_user(self, environ, body):
        username = body.get('_path_params', {}).get('username')
        return self.users_service.delete_user(username)

    def handle_update_password(self, environ, body):
        username = body.get('_path_params', {}).get('username')
        password = body.get('password', '')
        return self.users_service.update_password(username, password)

    def handle_save_preferences(self, environ, body):
        username = body.get('_path_params', {}).get('username')
        return self.users_service.save_preferences(username, body)

    # ---------- access control ----------

    def handle_list_acl(self, environ, body):
        return self.users_service.list_acl_tables()

    def handle_create_acl(self, environ, body):
        return self.users_service.create_acl_table(body)

    def handle_update_acl(self, environ, body):
        table_id = body.get('_path_params', {}).get('id')
        return self.users_service.update_acl_table(int(table_id), body)

    def handle_delete_acl(self, environ, body):
        table_id = body.get('_path_params', {}).get('id')
        return self.users_service.delete_acl_table(int(table_id))

    # ---------- system tools ----------

    def handle_system_ping(self, environ, body):
        return self.system_service.ping(body.get('host', ''), body.get('count', 4))

    def handle_system_traceroute(self, environ, body):
        return self.system_service.traceroute(body.get('host', ''))

    def handle_system_mtr(self, environ, body):
        return self.system_service.mtr(body.get('host', ''), body.get('count', 10))

    def handle_system_tcpdump(self, environ, body):
        return self.system_service.tcpdump(body.get('interface', ''), body.get('count', 10),
                                           body.get('filter', ''))

    def handle_system_reboot(self, environ, body):
        return self.system_service.reboot()

    def handle_system_poweroff(self, environ, body):
        return self.system_service.poweroff()

    def handle_system_reset(self, environ, body):
        return self.system_service.reset_config()

    def handle_system_date(self, environ, body):
        return self.system_service.set_date(body.get('date', ''))

    def handle_system_terminal(self, environ, body):
        return self.system_service.set_terminal(
            key=body.get('key'), length=body.get('length'),
            pager=body.get('pager'), width=body.get('width')
        )

    def handle_system_shell(self, environ, body):
        return self.system_service.shell(body.get('command', ''))

    # ---------- image management ----------

    def handle_list_images(self, environ, body):
        return self.system_service.list_images()

    def handle_image_add(self, environ, body):
        return self.system_service.add_image(body.get('source', ''))

    def handle_image_delete(self, environ, body):
        return self.system_service.delete_image(body.get('name', ''))

    def handle_image_default(self, environ, body):
        return self.system_service.set_default_image(body.get('name', ''))

    # ---------- update commands ----------

    def handle_update_container(self, environ, body):
        return self.system_service.update_container(body.get('name'), body.get('vrf'))

    def handle_update_geoip(self, environ, body):
        return self.system_service.update_geoip()

    def handle_update_suricata(self, environ, body):
        return self.system_service.update_suricata()

    def handle_update_webproxy(self, environ, body):
        return self.system_service.update_webproxy(body.get('vrf'))

    # ---------- generate commands ----------

    def handle_generate_command(self, environ, body):
        return self.system_service.generate_command(body.get('type', ''), body.get('args', {}))

    # ---------- quotas ----------

    def handle_list_quotas(self, environ, body):
        return self.config_service.list_quotas()

    def handle_get_quota(self, environ, body):
        table_type = body.get('_path_params', {}).get('type', '')
        return self.config_service.get_quota(table_type)

    def handle_set_quota(self, environ, body):
        user = environ.get('user', {})
        table_type = body.get('_path_params', {}).get('type', '')
        return self.config_service.set_quota(user, table_type, body.get('max_entries', 1024))

    # ---------- references ----------

    def handle_get_references(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        direction = query.get('direction', ['outgoing'])[0]
        return self.config_service.get_references(path, direction)

    def handle_check_references(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.check_references_before_delete(path)

    def handle_add_reference(self, environ, body):
        return self.config_service.add_reference(
            body.get('source_path', ''), body.get('target_path', ''), body.get('relationship', 'uses')
        )

    def handle_remove_reference(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        source = query.get('source_path', [''])[0]
        target = query.get('target_path', [None])[0]
        return self.config_service.remove_reference(source, target)

    # ---------- conntrack log config ----------

    def handle_get_conntrack_log_config(self, environ, body):
        return self.config_service.get_conntrack_log_config()

    def handle_help(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        path = query.get('path', [''])[0]
        return self.config_service.get_help(path)

    def handle_set_conntrack_log_config(self, environ, body):
        user = environ.get('user', {})
        return self.config_service.set_conntrack_log_config(
            user, body.get('enabled', False), body.get('level', 'info'),
            body.get('tcp', False), body.get('udp', False),
            body.get('icmp', False), body.get('other', False)
        )

    # ---------- webapp upgrade ----------

    def handle_webapp_version(self, environ, body):
        return self.system_service.webapp_version()

    def handle_webapp_check_update(self, environ, body):
        return self.system_service.webapp_check_update()

    def handle_webapp_update(self, environ, body):
        return self.system_service.webapp_update(body.get('url', ''), body.get('file_path', ''))

    def handle_webapp_rollback(self, environ, body):
        return self.system_service.webapp_rollback()

    def handle_webapp_history(self, environ, body):
        return self.system_service.webapp_history()

    # ---------- op-mode ----------

    def handle_op_mode_execute(self, environ, body):
        return self.system_service.op_mode('execute', body.get('command', ''), body.get('args', {}))

    def handle_op_mode_show(self, environ, body):
        query = parse_qs(environ.get('QUERY_STRING', ''))
        command = query.get('command', [''])[0]
        return self.system_service.op_mode('show', command)

    def handle_op_mode_clear(self, environ, body):
        return self.system_service.op_mode('clear', body.get('command', ''))

    def handle_op_mode_restart(self, environ, body):
        return self.system_service.op_mode('restart', body.get('command', ''))

    def handle_op_mode_update(self, environ, body):
        return self.system_service.op_mode('update', body.get('command', ''))

    def handle_op_mode_generate(self, environ, body):
        return self.system_service.generate_command(body.get('command', ''), body.get('args', {}))


application = VyOSWebApp()
