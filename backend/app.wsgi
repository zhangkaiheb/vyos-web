#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys

# Add backend directory and VyOS libexec to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, '/usr/libexec/vyos')
sys.path.insert(0, '/usr/lib/python3/dist-packages')

# Ensure VyOS environment
os.environ.setdefault('VYOS_LIBEXEC_DIR', '/usr/libexec/vyos')
os.environ.setdefault('PYTHONPATH', '/usr/libexec/vyos')

from app import VyOSWebApp

application = VyOSWebApp()
