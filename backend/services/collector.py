#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Background collector for monitoring metrics, conntrack logs and firewall logs.
Started once when the WSGI module loads.
"""

import threading
import time
import traceback

from services.monitor_service import MonitorService
from services.log_service import LogService


class BackgroundCollector:
    def __init__(self):
        self._monitor = MonitorService()
        self._logs = LogService()
        self._stop_event = threading.Event()
        self._thread = None

    def start(self):
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=2)

    def _run(self):
        """Main loop: collect metrics every 60s, logs every 30s, cleanup hourly."""
        last_metrics = 0
        last_logs = 0
        last_cleanup = 0
        while not self._stop_event.is_set():
            try:
                now = time.time()
                if now - last_metrics >= 60:
                    self._monitor.collect_all()
                    last_metrics = now
                if now - last_logs >= 30:
                    cfg = self._logs.get_conntrack_log_config()
                    if cfg.get('success') and cfg.get('conntrack_enabled'):
                        self._logs.collect_conntrack_events(protocols=cfg)
                    self._logs.collect_firewall_events()
                    last_logs = now
                if now - last_cleanup >= 3600:
                    self._logs.cleanup_logs()
                    last_cleanup = now
            except Exception:
                traceback.print_exc()
            time.sleep(1)


_collector = BackgroundCollector()


def start_collector():
    _collector.start()


def stop_collector():
    _collector.stop()
