# VyOS Web

Un système de configuration web pour VyOS, conçu pour fournir une gestion visuelle des configurations en ligne de commande courantes tout en maintenant la cohérence avec la structure de commandes native de VyOS.

## Aperçu du projet

VyOS Web Config fournit une implémentation complète frontend et backend :
- Frontend basé sur Vue 3 (ESM natif dans le navigateur)
- Backend basé sur Python WSGI (Apache + mod_wsgi en production)
- Lecture/écriture de configuration via les mécanismes natifs de VyOS
- Prise en charge du contrôle d'accès, de l'audit et des journaux, de la documentation d'aide, des mises à jour en ligne, etc.

Ce projet est déployé dans un répertoire indépendant pour éviter de modifier les fichiers système existants.

## Fonctionnalités principales

- Menus et chemins de configuration suivant la hiérarchie de configuration VyOS
- Couvre : gestion système, réseau, routage, pare-feu, NAT, services, VPN, journalisation et plus
- Sessions de configuration : commit, confirm commit, rollback, comparaison, import/export
- Gestion des utilisateurs et des accès (visibilité des pages, droits de lecture/écriture)
- Interfaces de monitoring et de journalisation (y compris SSE/streaming en temps réel)
- Documentation d'aide locale et répertoires de ressources multilingues
- Gestion des versions de l'application web et APIs de mise à jour

## Stack technique

### Frontend
- Vue 3
- Vue Router 4
- Vue I18n 9
- Axios
- Chargement de modules natif (sans bundler)

### Backend
- Python 3
- Application WSGI
- Apache + mod_wsgi (production)
- Dépendances clés : PyJWT, paramiko, cryptography, requests, openpyxl, vyos

## Architecture

- Point d'entrée frontend : `frontend/index.html` + `frontend/src/main.js`
- Point d'entrée backend : `backend/app.py`
- Point d'entrée WSGI : `backend/app.wsgi`
- Serveur de développement : `scripts/run_server.py`
- Service de monitoring/push : `backend/websocket_server.py`
- Génération des données de menu : `backend/data/generate_menu.py`

Le backend est organisé en services (`backend/services/`) avec des routes API unifiées ;
le frontend utilise des composants de page et des composants communs de formulaires/modales.

## Démarrage rapide

> Recommandé pour VyOS ou les environnements avec les dépendances d'exécution VyOS.

### 1) Installation (mode production)

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh
```

Le script d'installation effectuera :
- Initialisation des répertoires
- Installation de Python venv et des dépendances
- Configuration du site Apache et de mod_wsgi
- Génération de certificats auto-signés (si manquants)
- Initialisation de la base de données

Après installation, accessible via :
- `https://<vyos-ip>/`

### 2) Mode développement

Terminal 1 : démarrer le serveur web

```bash
cd /opt/vyos-web-config
python3 scripts/run_server.py --host 0.0.0.0 --port 8080
```

Terminal 2 : démarrer le service WebSocket de monitoring

```bash
cd /opt/vyos-web-config
python3 backend/websocket_server.py
```

Ou utilisez le flag dev du script d'installation :

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh --dev
```

## Structure des répertoires

```text
/opt/vyos-web-config
├─ frontend/                # Frontend : pages et composants
│  ├─ index.html
│  └─ src/
├─ backend/                 # Backend : application WSGI
│  ├─ app.py
│  ├─ app.wsgi
│  ├─ services/
│  ├─ routes/
│  ├─ utils/
│  ├─ tests/
│  └─ data/
├─ scripts/                 # Scripts d'installation, d'exécution, de mappage de documentation
├─ docs/                    # Documentation d'aide locale (multilingue)
├─ apache/                  # Configuration du site Apache et certificats
─ config/                  # Fichiers de configuration du projet
```

## Conseils de développement

- Après modification de la structure du menu, synchroniser le script de génération et les données de menu
- Lors de l'ajout de nouvelles pages, compléter également :
  - Routage du menu
  - Configuration de visibilité des permissions
  - Mappage de la documentation d'aide
  - Localisation chinoise et anglaise
- Les APIs de configuration du backend utilisent les extensions C de VyOS ; éviter la lecture/écriture concurrente pendant le développement

## Notes de sécurité

- Remplacer les certificats auto-signés par défaut en production
- L'authentification repose sur les utilisateurs système ; appliquer le principe du moindre privilège
- Il est recommandé de restreindre l'accès à l'interface de gestion via ACL/pare-feu

## Licence

Aucune licence open source n'est actuellement déclarée.
Pour une publication externe, veuillez ajouter un fichier LICENSE et clarifier les conditions d'utilisation.
