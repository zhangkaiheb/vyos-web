# VyOS Web

A web-based configuration system for VyOS, designed to provide visual management of common command-line configurations while maintaining consistency with native VyOS command structures.

## Project Overview

VyOS Web Config provides a complete frontend and backend implementation:
- Frontend based on Vue 3 (native browser ESM)
- Backend based on Python WSGI (Apache + mod_wsgi in production)
- Configuration read/write integrated with native VyOS configuration capabilities
- Supports access control, auditing & logging, help documentation mapping, online updates, and more

This project is primarily used to deploy the web management interface in an independent directory, avoiding modifications to existing system core files.

## Key Features

- Menu and configuration paths closely follow VyOS configuration hierarchy
- Covers system management, networking, routing, firewall, NAT, services, VPN, logging, and more
- Configuration session capabilities: commit, confirm commit, rollback, compare, import/export
- User and access control (including page visibility and read/write permissions)
- Monitoring and logging interfaces (including SSE/real-time streaming)
- Local help documentation mapping and multilingual resource directories
- Web application version management and update-related APIs

## Tech Stack

### Frontend
- Vue 3
- Vue Router 4
- Vue I18n 9
- Axios
- Native module loading (no bundler dependency)

### Backend
- Python 3
- WSGI application
- Apache + mod_wsgi (production)
- Key dependencies: PyJWT, paramiko, cryptography, requests, openpyxl, vyos

## Architecture

- Frontend entry: `frontend/index.html` + `frontend/src/main.js`
- Backend entry: `backend/app.py`
- WSGI entry: `backend/app.wsgi`
- Development server: `scripts/run_server.py`
- Monitoring/push service: `backend/websocket_server.py`
- Menu data generation: `backend/data/generate_menu.py`

The backend is organized by services (`backend/services/`), exposing capabilities through unified API routes;
the frontend organizes interactions through page components and shared form/modal components.

## Quick Start

> Recommended for use on VyOS or environments with VyOS runtime dependencies.

### 1) Installation (Production Mode)

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh
```

The installation script will:
- Initialize directories
- Install Python venv and dependencies
- Configure Apache site and mod_wsgi
- Generate self-signed certificates (if missing)
- Initialize the database

After completion, access via:
- `https://<vyos-ip>/` for the web interface

### 2) Development Mode

Terminal 1: Start the web server

```bash
cd /opt/vyos-web-config
python3 scripts/run_server.py --host 0.0.0.0 --port 8080
```

Terminal 2: Start the monitoring WebSocket service

```bash
cd /opt/vyos-web-config
python3 backend/websocket_server.py
```

Alternatively, use the install script's dev mode:

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh --dev
```

## Directory Structure

```text
/opt/vyos-web-config
├─ frontend/                # Frontend pages and components
│  ├─ index.html
│  └─ src/
├─ backend/                 # Backend WSGI application
│  ├─ app.py
│  ├─ app.wsgi
│  ├─ services/
│  ├─ routes/
│  ├─ utils/
│  ├─ tests/
│  └─ data/
├─ scripts/                 # Installation, runtime, documentation mapping scripts
─ docs/                    # Local help documentation (multilingual)
├─ apache/                  # Apache site configuration and certificate location
└─ config/                  # Project configuration files
```

## Development Guidelines

- After modifying menu structure, ensure the menu generation script and final menu data are synchronized
- When adding new pages, it is recommended to also complete:
  - Menu routing
  - Permission visibility configuration
  - Help documentation mapping
  - Chinese and English localization strings
- Backend configuration-related APIs involve VyOS C extension concurrent access; avoid unstable behavior from concurrent read/write during development

## Security Notes

- Replace default self-signed certificates in production
- Authentication relies on the system user framework; configure accounts with the principle of least privilege
- It is recommended to expose the management interface on a controlled network and restrict sources with ACL/firewall policies

## License

No open-source license is currently declared for this repository.
If publishing externally, please add a LICENSE file and clarify authorization terms.
