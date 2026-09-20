# VyOS Web

Ein webbasiertes Konfigurationssystem für VyOS, das eine visuelle Verwaltung gängiger Befehlszeilen-Konfigurationen ermöglicht und dabei die Konsistenz mit der nativen VyOS-Befehlsstruktur wahrt.

## Projektübersicht

VyOS Web Config bietet eine vollständige Frontend- und Backend-Implementierung:
- Frontend basierend auf Vue 3 (native Browser-ESM)
- Backend basierend auf Python WSGI (Apache + mod_wsgi in der Produktion)
- Konfigurations-Lese-/Schreibzugriff über native VyOS-Konfigurationsmechanismen
- Unterstützt Zugriffskontrolle, Audit & Logging, Hilfe-Dokumentation, Online-Updates und mehr

Dieses Projekt wird in einem separaten Verzeichnis bereitgestellt, um Änderungen an bestehenden Systemdateien zu vermeiden.

## Hauptfunktionen

- Menü- und Konfigurationspfade folgen der VyOS-Konfigurationshierarchie
- Abdeckung: Systemverwaltung, Netzwerk, Routing, Firewall, NAT, Dienste, VPN, Logging und mehr
- Konfigurationssitzungen: Commit, Confirm Commit, Rollback, Vergleich, Import/Export
- Benutzer- und Zugriffskontrolle (Seitensichtbarkeit, Lese-/Schreibrechte)
- Monitoring- und Logging-Schnittstellen (inkl. SSE/Echtzeit-Streaming)
- Lokale Hilfe-Dokumentation und mehrsprachige Ressourcenverzeichnisse
- Versionsverwaltung der Webanwendung und Update-APIs

## Technologie-Stack

### Frontend
- Vue 3
- Vue Router 4
- Vue I18n 9
- Axios
- Native Modulladung (kein Bundler)

### Backend
- Python 3
- WSGI-Anwendung
- Apache + mod_wsgi (Produktion)
- Wichtige Abhängigkeiten: PyJWT, paramiko, cryptography, requests, openpyxl, vyos

## Architektur

- Frontend-Einstieg: `frontend/index.html` + `frontend/src/main.js`
- Backend-Einstieg: `backend/app.py`
- WSGI-Einstieg: `backend/app.wsgi`
- Entwicklungsserver: `scripts/run_server.py`
- Monitoring/Push-Service: `backend/websocket_server.py`
- Menü-Datengenerierung: `backend/data/generate_menu.py`

Das Backend ist in Services unterteilt (`backend/services/`) mit einheitlicher API-Routen;
das Frontend nutzt Seitenkomponenten und gemeinsame Formular-/Modal-Komponenten.

## Schnellstart

> Empfohlen für VyOS oder Umgebungen mit VyOS-Laufzeitabhängigkeiten.

### 1) Installation (Produktionsmodus)

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh
```

Das Installationsskript führt Folgendes aus:
- Verzeichnisinitialisierung
- Python venv und Abhängigkeiten installieren
- Apache-Site und mod_wsgi konfigurieren
- Selbstsignierte Zertifikate generieren (falls fehlend)
- Datenbank initialisieren

Nach Abschluss zugänglich unter:
- `https://<vyos-ip>/`

### 2) Entwicklungsmodus

Terminal 1: Webserver starten

```bash
cd /opt/vyos-web-config
python3 scripts/run_server.py --host 0.0.0.0 --port 8080
```

Terminal 2: WebSocket-Monitoring-Service starten

```bash
cd /opt/vyos-web-config
python3 backend/websocket_server.py
```

Alternativ mit dem Dev-Flag des Installationsskripts:

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh --dev
```

## Verzeichnisstruktur

```text
/opt/vyos-web-config
├─ frontend/                # Frontend: Seiten und Komponenten
│  ├─ index.html
│  └─ src/
├─ backend/                 # Backend: WSGI-Anwendung
│  ├─ app.py
│  ├─ app.wsgi
│  ├─ services/
│  ├─ routes/
│  ├─ utils/
│  ├─ tests/
│  └─ data/
├─ scripts/                 # Installations-, Laufzeit-, Dokumentations-Skripte
├─ docs/                    # Lokale Hilfe-Dokumentation (mehrsprachig)
├─ apache/                  # Apache-Site-Konfiguration und Zertifikate
└─ config/                  # Projektkonfigurationsdateien
```

## Entwicklungshinweise

- Nach Menüstrukturänderungen: Menügenerierungsskript und Menüdaten synchronisieren
- Beim Hinzufügen neuer Seiten auch vervollständigen:
  - Menü-Routing
  - Berechtigungssichtbarkeit
  - Hilfe-Dokumentation
  - Chinesische und englische Lokalisierung
- Backend-Konfigurations-APIs nutzen VyOS C-Erweiterungen; paralleles Lesen/Schreiben während der Entwicklung vermeiden

## Sicherheitshinweise

- Selbstsignierte Zertifikate in der Produktion ersetzen
- Authentifizierung basiert auf Systembenutzern; Prinzip der minimalen Berechtigungen anwenden
- Verwaltungsoberfläche nur in kontrollierten Netzwerken freigeben und mit ACL/Firewall-Regeln absichern

## Lizenz

Keine Open-Source-Lizenz angegeben.
Bei externer Veröffentlichung bitte eine LICENSE-Datei hinzufügen und Nutzungsbedingungen klären.
