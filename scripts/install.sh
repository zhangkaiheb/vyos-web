#!/bin/bash
set -e

# Install VyOS Web Config
# Run as root or with sudo

INSTALL_DIR=/opt/vyos-web-config
VENV_DIR=$INSTALL_DIR/venv
APACHE_USER=www-data
APP_USER=vyos
APP_GROUP=users

usage() {
    echo "Usage: $0 [--dev]"
    echo "  --dev   Start the development server instead of Apache."
    exit 1
}

DEV_MODE=false
if [ "$1" == "--dev" ]; then
    DEV_MODE=true
elif [ -n "$1" ]; then
    usage
fi

echo "Installing VyOS Web Config..."

# Create required directories
mkdir -p "$INSTALL_DIR/frontend"
mkdir -p "$INSTALL_DIR/backend/data"
mkdir -p "$INSTALL_DIR/backend/routes"
mkdir -p "$INSTALL_DIR/apache"
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/docs"
mkdir -p "$INSTALL_DIR/config"

# Install system packages (VyOS/Debian based)
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y apache2 libapache2-mod-wsgi-py3 python3-pip python3-venv openssl
fi

# Create Python virtual environment and install backend dependencies
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$INSTALL_DIR/backend/requirements.txt" || true

# Link system VyOS packages into venv so they remain available
if [ -d /usr/lib/python3/dist-packages ]; then
    "$VENV_DIR/bin/python" - <<'PY'
import sys, os
src = '/usr/lib/python3/dist-packages'
dst = os.path.join(sys.prefix, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
for name in os.listdir(src):
    target = os.path.join(dst, name)
    source = os.path.join(src, name)
    if not os.path.exists(target):
        try:
            os.symlink(source, target)
        except Exception:
            pass
PY
fi

# Generate self-signed SSL certificate if missing
CERT_FILE="$INSTALL_DIR/apache/cert.pem"
KEY_FILE="$INSTALL_DIR/apache/key.pem"
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=US/ST=VyOS/L=VyOS/O=VyOS/CN=vyos-web-config.local"
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
fi

# Initialize database
python3 "$INSTALL_DIR/backend/utils/database.py"

# Set ownership and permissions
chown -R "$APP_USER:$APP_GROUP" "$INSTALL_DIR"
chown -R "$APACHE_USER:$APACHE_USER" "$INSTALL_DIR/logs"
chmod 755 "$INSTALL_DIR"
chmod 750 "$INSTALL_DIR/backend/data"
chmod 640 "$INSTALL_DIR/backend/data/vyos_web_config.db" 2>/dev/null || true
chmod 755 "$INSTALL_DIR/backend/app.wsgi"
chmod 755 "$INSTALL_DIR/scripts/run_server.py"

if [ "$DEV_MODE" == true ]; then
    echo "Starting development server on http://0.0.0.0:8080"
    echo "Run the WebSocket monitor server in another terminal:"
    echo "  python3 $INSTALL_DIR/backend/websocket_server.py"
    exec python3 "$INSTALL_DIR/scripts/run_server.py" --host 0.0.0.0 --port 8080
fi

# Install Apache configuration
if [ -d /etc/apache2/sites-available ]; then
    cp "$INSTALL_DIR/apache/vyos-web-config.conf" /etc/apache2/sites-available/

    a2ensite vyos-web-config
    a2enmod ssl
    a2enmod wsgi
    a2enmod rewrite
    a2enmod proxy
    a2enmod proxy_http
    a2enmod proxy_wstunnel
    a2dissite 000-default 2>/dev/null || true

    # Allow Apache to bind to port 443
    if command -v semanage >/dev/null 2>&1; then
        semanage port -a -t http_port_t -p tcp 443 2>/dev/null || true
    fi

    # Restart Apache to apply changes
    systemctl enable apache2 || true
    systemctl restart apache2 || apache2ctl restart || true
fi

echo "Installation complete."
echo "Access the application at https://<vyos-ip>/"
echo "To start the WebSocket monitor server, run:"
echo "  python3 $INSTALL_DIR/backend/websocket_server.py"
