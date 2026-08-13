#!/usr/bin/env python3
"""Translate VyOS help docs from English to German."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'
EN_DIR = os.path.join(DOCS_DIR, 'en')
DE_DIR = os.path.join(DOCS_DIR, 'de')

# Translation dictionary for common terms
TRANSLATIONS = {
    # Headings
    'Container': 'Container',
    'Configuration': 'Konfiguration',
    'Operation Commands': 'Operationsbefehle',
    'Example Configuration': 'Beispielkonfiguration',
    'Firewall': 'Firewall',
    'Interfaces': 'Schnittstellen',
    'NAT': 'NAT',
    'Policy': 'Richtlinie',
    'Protocols': 'Protokolle',
    'QoS': 'QoS',
    'Service': 'Dienst',
    'System': 'System',
    'VPN': 'VPN',
    'VRF': 'VRF',
    'High Availability': 'Hochverfügbarkeit',
    
    # Common terms
    'Sets the image name in the hub registry': 'Legt den Image-Namen in der Hub-Registry fest',
    'If a registry is not specified, Docker.io will be used as the container registry unless an alternative registry is specified using': 'Wenn keine Registry angegeben wird, wird Docker.io als Container-Registry verwendet, es sei denn, eine alternative Registry wird angegeben mit',
    'or the registry is included in the image name': 'oder die Registry ist im Image-Namen enthalten',
    'Override the default entrypoint from the image for a container.': 'Überschreibt den Standard-Entrypoint aus dem Image für einen Container.',
    'Override the default command from the image for a container.': 'Überschreibt den Standard-Befehl aus dem Image für einen Container.',
    'Set the command arguments for a container.': 'Legt die Befehlsargumente für einen Container fest.',
    'Set the host name for a container.': 'Legt den Hostnamen für einen Container fest.',
    'The container and the host share the same process namespace.': 'Der Container und der Host teilen sich denselben Prozess-Namespace.',
    'This means that processes running on the host are visible inside the container, and processes inside the container are visible on the host.': 'Das bedeutet, dass Prozesse, die auf dem Host ausgeführt werden, innerhalb des Containers sichtbar sind, und Prozesse innerhalb des Containers auf dem Host sichtbar sind.',
    'The command translates to': 'Der Befehl wird übersetzt zu',
    'when the container is created.': 'wenn der Container erstellt wird.',
    'Allow host networking in a container.': 'Erlaubt Host-Networking in einem Container.',
    'The network stack of the container is not isolated from the host and will use the host IP.': 'Der Netzwerk-Stack des Containers ist nicht vom Host isoliert und verwendet die Host-IP.',
    'Note': 'Hinweis',
    'cannot be used with': 'kann nicht verwendet werden mit',
    'Attaches user-defined network to a container.': 'Fügt ein benutzerdefiniertes Netzwerk zu einem Container hinzu.',
    'Only one network must be specified and must already exist.': 'Es muss genau ein Netzwerk angegeben werden, das bereits existieren muss.',
    'Optionally set a specific static IPv4 or IPv6 address for the container.': 'Legt optional eine bestimmte statische IPv4- oder IPv6-Adresse für den Container fest.',
    'This address must be within the named network prefix.': 'Diese Adresse muss innerhalb des angegebenen Netzwerk-Präfix liegen.',
    'The first IP in the container network is reserved by the engine and cannot be used': 'Die erste IP im Container-Netzwerk wird von der Engine reserviert und kann nicht verwendet werden',
    'Optionally set a custom name server.': 'Legt optional einen benutzerdefinierten Nameserver fest.',
    'If a container network is used with DNS enabled, this setting will not have any effect.': 'Wenn ein Container-Netzwerk mit aktiviertem DNS verwendet wird, hat diese Einstellung keine Auswirkung.',
    'Set a container description': 'Legt eine Container-Beschreibung fest',
    'Add custom environment variables.': 'Fügt benutzerdefinierte Umgebungsvariablen hinzu.',
    'Multiple environment variables are allowed.': 'Mehrere Umgebungsvariablen sind erlaubt.',
    'The following commands translate to': 'Die folgenden Befehle werden übersetzt zu',
    'Publish a port for the container.': 'Veröffentlicht einen Port für den Container.',
    'Port publishing cannot be used with': 'Port-Veröffentlichung kann nicht verwendet werden mit',
    'For this purpose, a workaround using destination NAT and static IP assignment for the container is available.': 'Für diesen Zweck steht eine Problemumgehung mit Destination NAT und statischer IP-Zuweisung für den Container zur Verfügung.',
    'Mount a volume into the container': 'Mountet ein Volume in den Container',
    'Volume is either mounted as rw (read-write - default) or ro (read-only)': 'Volume wird entweder als rw (read-write - Standard) oder ro (read-only) gemountet',
    'Mount a tmpfs': 'Mountet ein tmpfs',
    '(ramdisk)': '(Ramdisk)',
    'filesystem to the given path within the container.': 'Dateisystem auf den angegebenen Pfad innerhalb des Containers.',
    'Size in MB for tmpfs filesystem, maximum size is 64GB or 50% of the systems total available memory.': 'Größe in MB für das tmpfs-Dateisystem, maximale Größe ist 64 GB oder 50% des gesamten verfügbaren Systemspeichers.',
    'Set the User ID or Group ID of the container': 'Legt die User ID oder Group ID des Containers fest',
    'Set the restart behavior of the container.': 'Legt das Neustartverhalten des Containers fest.',
    'Do not restart containers on exit': 'Container beim Beenden nicht neu starten',
    'Restart containers when they exit with a non-zero exit code, retrying indefinitely (default)': 'Container neu starten, wenn sie mit einem Exit-Code ungleich Null beendet werden, unbegrenzt wiederholen (Standard)',
    'Restart containers when they exit, regardless of status, retrying indefinitely': 'Container beim Beenden neu starten, unabhängig vom Status, unbegrenzt wiederholen',
    'This specifies the number of CPU resources the container can use.': 'Gibt die Anzahl der CPU-Ressourcen an, die der Container verwenden kann.',
    'Default is 0 for unlimited.': 'Standard ist 0 für unbegrenzt.',
    'For example, 1.25 limits the container to use up to 1.25 cores worth of CPU time.': 'Beispielsweise begrenzt 1,25 den Container auf die Verwendung von bis zu 1,25 Kernen an CPU-Zeit.',
    'This can be a decimal number with up to three decimal places.': 'Dies kann eine Dezimalzahl mit bis zu drei Dezimalstellen sein.',
    'Constrain the memory available to the container.': 'Beschränkt den für den Container verfügbaren Speicher.',
    'Default is 512 MB. Use 0 MB for unlimited memory.': 'Standard ist 512 MB. Verwenden Sie 0 MB für unbegrenzten Speicher.',
    'Add a host device to the container.': 'Fügt ein Host-Gerät zum Container hinzu.',
    'Set container capabilities or permissions.': 'Legt Container-Fähigkeiten oder Berechtigungen fest.',
    'Network operations (interface, firewall, routing tables)': 'Netzwerkoperationen (Schnittstelle, Firewall, Routing-Tabellen)',
    'Bind a socket to privileged ports (port numbers less than 1024)': 'Bindet einen Socket an privilegierte Ports (Portnummern kleiner als 1024)',
    'Permission to create raw network sockets': 'Berechtigung zum Erstellen von Raw-Netzwerk-Sockets',
    'Capability sets (from bounded or inherited set)': 'Fähigkeitsmengen (aus begrenzter oder geerbter Menge)',
    'Administration operations (quotactl, mount, sethostname, setdomainame)': 'Administrationsoperationen (quotactl, mount, sethostname, setdomainame)',
    'Permission to set system clock': 'Berechtigung zum Festlegen der Systemuhr',
    'Set container sysctl values.': 'Legt Container-Sysctl-Werte fest.',
    'The subset of possible parameters are:': 'Die Teilmenge der möglichen Parameter sind:',
    'Kernel Parameters:': 'Kernel-Parameter:',
    'Parameters beginning with': 'Parameter, die beginnen mit',
    '(only if user-defined network is used)': '(nur wenn benutzerdefiniertes Netzwerk verwendet wird)',
    'Add metadata label for this container.': 'Fügt Metadaten-Label für diesen Container hinzu.',
    'Disable a container.': 'Deaktiviert einen Container.',
    'Container Health checks': 'Container-Gesundheitsprüfungen',
    'By default, no health checks are run, even when defined by the image.': 'Standardmäßig werden keine Gesundheitsprüfungen ausgeführt, auch wenn sie vom Image definiert wurden.',
    'Default health check is run for the container if defined by the image.': 'Standard-Gesundheitsprüfung wird für den Container ausgeführt, wenn vom Image definiert.',
    'Override the default health check command from the image for a container.': 'Überschreibt den Standard-Gesundheitsprüfungsbefehl aus dem Image für einen Container.',
    'Override the default health-check interval.': 'Überschreibt das Standard-Gesundheitsprüfungsintervall.',
    'For example:': 'Zum Beispiel:',
    'Override the default health-check timeout.': 'Überschreibt den Standard-Gesundheitsprüfungs-Timeout.',
    'Number of health check retries before container is considered unhealthy.': 'Anzahl der Gesundheitsprüfungs-Wiederholungen, bevor der Container als ungesund betrachtet wird.',
    'Container Networks': 'Container-Netzwerke',
    'Creates a named container network': 'Erstellt ein benanntes Container-Netzwerk',
    'A brief description what this network is all about.': 'Eine kurze Beschreibung, worum es in diesem Netzwerk geht.',
    'Define IPv4 and/or IPv6 prefix for a given network name.': 'Definiert IPv4- und/oder IPv6-Präfix für einen angegebenen Netzwerknamen.',
    'Both IPv4 and IPv6 can be used in parallel.': 'Sowohl IPv4 als auch IPv6 können parallel verwendet werden.',
    'Configure': 'Konfiguriert',
    'for a given network.': 'für ein angegebenes Netzwerk.',
    'It is the size (in bytes) of the largest ethernet frame sent on this link.': 'Es ist die Größe (in Bytes) des größten Ethernet-Frames, der auf diesem Link gesendet wird.',
    'Disable Domain Name System (DNS) plugin for this network.': 'Deaktiviert das Domain Name System (DNS)-Plugin für dieses Netzwerk.',
    'Bind container network to a given VRF instance.': 'Bindet Container-Netzwerk an eine angegebene VRF-Instanz.',
    'Container Registry': 'Container-Registry',
    'Adds registry to list of unqualified-search-registries.': 'Fügt Registry zur Liste der unqualifizierten Such-Registries hinzu.',
    'By default, for any image that does not include the registry in the image name, VyOS will use docker.io and quay.io as the container registry.': 'Standardmäßig verwendet VyOS für jedes Image, das die Registry nicht im Image-Namen enthält, docker.io und quay.io als Container-Registry.',
    'Disable a given container registry': 'Deaktiviert eine angegebene Container-Registry',
    'Some container registries require credentials to be used.': 'Einige Container-Registries erfordern die Verwendung von Anmeldeinformationen.',
    'Credentials can be defined here and will only be used when adding a container image to the system.': 'Anmeldeinformationen können hier definiert werden und werden nur beim Hinzufügen eines Container-Images zum System verwendet.',
    'Allow registry access over unencrypted HTTP or TLS connections with untrusted certificates.': 'Ermöglicht Registry-Zugriff über unverschlüsselte HTTP- oder TLS-Verbindungen mit nicht vertrauenswürdigen Zertifikaten.',
    'Registry mirror, use': 'Registry-Spiegel, verwenden Sie',
    'If you have mirror': 'Wenn Sie einen Spiegel haben',
    'for docker.io, you can use': 'für docker.io, können Sie verwenden',
    'or run': 'oder ausführen',
    'If': 'Wenn',
    'is your own registry, you can use': 'Ihre eigene Registry ist, können Sie verwenden',
    'Log Configuration': 'Protokollkonfiguration',
    'Set the default log driver for containers.': 'Legt den Standard-Protokolltreiber für Container fest.',
    'Log to a plain text file in Kubernetes-style format.': 'Protokolliert in eine Plain-Text-Datei im Kubernetes-Stilformat.',
    'Log to the system journal': 'Protokolliert in das System-Journal',
    'Disable logging for the container': 'Deaktiviert die Protokollierung für den Container',
    'Current default is journald.': 'Aktueller Standard ist journald.',
    'Pull a new image for container': 'Pullt ein neues Image für Container',
    'Show the list of all active containers.': 'Zeigt die Liste aller aktiven Container an.',
    'Show the local container images.': 'Zeigt die lokalen Container-Images an.',
    'Show logs from a given container': 'Zeigt Protokolle aus einem angegebenen Container an',
    'Show a list available container networks': 'Zeigt eine Liste verfügbarer Container-Netzwerke an',
    'Restart a given container': 'Startet einen angegebenen Container neu',
    'Update container image': 'Aktualisiert Container-Image',
    "Delete a particular container image based on it's image ID.": 'Löscht ein bestimmtes Container-Image basierend auf seiner Image-ID.',
    'You can also delete all container images at once.': 'Sie können auch alle Container-Images auf einmal löschen.',
    'You can not delete a container image if it has more then one tag assigned, this is why there is a': 'Sie können ein Container-Image nicht löschen, wenn ihm mehr als ein Tag zugewiesen ist, deshalb gibt es eine',
    'option to pass down to the container image to also remove those images.': 'Option, die an das Container-Image übergeben wird, um diese Images ebenfalls zu entfernen.',
    'For the sake of demonstration,': 'Zu Demonstrationszwecken,',
    'example #1 in the official documentation': 'Beispiel #1 in der offiziellen Dokumentation',
    'to the declarative VyOS CLI syntax.': 'zur deklarativen VyOS-CLI-Syntax.',
    
    # Firewall translations
    'Warning': 'Warnung',
    'Due to a boot-time race condition, all interfaces initialize before the firewall.': 'Aufgrund einer Boot-Zeit-Race-Condition initialisieren alle Schnittstellen vor der Firewall.',
    'This temporarily leaves the system open to all traffic and poses a security risk.': 'Dies lässt das System vorübergehend für den gesamten Datenverkehr offen und stellt ein Sicherheitsrisiko dar.',
    'VyOS uses Netfilter.': 'VyOS verwendet Netfilter.',
    'The Netfilter project developed': 'Das Netfilter-Projekt entwickelte',
    'and its successor': 'und seinen Nachfolger',
    'for the Linux kernel to process packet data flows directly.': 'für den Linux-Kernel, um Paketdatenflüsse direkt zu verarbeiten.',
    'This extends the concept of zone-based security to let you manipulate data at multiple stages after the network interface and driver accept it, and before sending it to its destination (for example, a web server or another device).': 'Dies erweitert das Konzept der zonenbasierten Sicherheit, um Daten auf mehreren Stufen zu manipulieren, nachdem die Netzwerkschnittstelle und der Treiber sie akzeptiert haben, und bevor sie an ihr Ziel gesendet werden (z. B. einen Webserver oder ein anderes Gerät).',
    'The following is a simplified traffic flow diagram based on Netfilter packet flow.': 'Das Folgende ist ein vereinfachtes Datenflussdiagramm basierend auf dem Netfilter-Paketfluss.',
    'This diagram provides an overview of how packets are processed and the possible paths traffic can take.': 'Dieses Diagramm bietet einen Überblick darüber, wie Pakete verarbeitet werden und welche möglichen Pfade der Datenverkehr nehmen kann.',
    'The main points regarding packet flow and terminology in VyOS firewall are:': 'Die wichtigsten Punkte bezüglich Paketfluss und Terminologie in der VyOS-Firewall sind:',
    'Bridge Port?': 'Bridge-Port?',
    'Choose the appropriate path based on whether the interface where the packet was received is part of a bridge.': 'Wählen Sie den entsprechenden Pfad basierend darauf, ob die Schnittstelle, an der das Paket empfangen wurde, Teil einer Bridge ist.',
    'If the interface where the packet was received is not part of a bridge, the packet is processed at the': 'Wenn die Schnittstelle, an der das Paket empfangen wurde, nicht Teil einer Bridge ist, wird das Paket auf der',
    'IP Layer': 'IP-Ebene',
    'Prerouting': 'Prerouting',
    'The router processes all packets in this stage, regardless of the destination.': 'Der Router verarbeitet alle Pakete in dieser Stufe, unabhängig vom Ziel.',
    'You can perform several actions in this stage, and these actions are also defined in different parts of the VyOS configuration.': 'Sie können in dieser Stufe mehrere Aktionen ausführen, und diese Aktionen werden auch in verschiedenen Teilen der VyOS-Konfiguration definiert.',
    'Order is important.': 'Reihenfolge ist wichtig.',
    'The relevant configuration that applies in this stage includes:': 'Die relevante Konfiguration, die in dieser Stufe angewendet wird, umfasst:',
    'Firewall prerouting': 'Firewall-Prerouting',
    'Rules you define under': 'Regeln, die Sie definieren unter',
    'The system processes all rules in this section before the connection tracking subsystem.': 'Das System verarbeitet alle Regeln in diesem Abschnitt vor dem Connection-Tracking-Subsystem.',
    'Conntrack Ignore': 'Conntrack Ignore',
    'You can configure this section with': 'Sie können diesen Abschnitt konfigurieren mit',
    'For compatibility reasons, this feature is supported, but will be deprecated in the future.': 'Aus Kompatibilitätsgründen wird diese Funktion unterstützt, aber in Zukunft veraltet sein.',
    'Policy Route': 'Policy Route',
    'Destination NAT': 'Destination NAT',
    'Destination is the router?': 'Ziel ist der Router?',
    'Choose the appropriate path based on the destination IP address.': 'Wählen Sie den entsprechenden Pfad basierend auf der Ziel-IP-Adresse.',
    'Transit traffic continues to': 'Transit-Datenverkehr wird fortgesetzt zu',
    'while traffic destined for the router continues to': 'während Datenverkehr, der für den Router bestimmt ist, fortgesetzt wird zu',
    'Input': 'Input',
    'The stage where you filter and control traffic destined for the router itself.': 'Die Stufe, in der Sie Datenverkehr filtern und steuern, der für den Router selbst bestimmt ist.',
    'This is where you enforce all rules for securing the router.': 'Hier setzen Sie alle Regeln zur Sicherung des Routers durch.',
    'This includes IPv4 and IPv6 filtering rules, defined in:': 'Dies umfasst IPv4- und IPv6-Filterregeln, definiert in:',
    'Forward': 'Forward',
    'The stage where you filter and control transit traffic.': 'Die Stufe, in der Sie Transit-Datenverkehr filtern und steuern.',
    'Output': 'Output',
    'The stage where you filter and control traffic that the router originates.': 'Die Stufe, in der Sie Datenverkehr filtern und steuern, der vom Router ausgeht.',
    'Note that this traffic comes from either a new connection that an internal process on the VyOS router (such as NTP) originates or a response to traffic the router receives externally through': 'Beachten Sie, dass dieser Datenverkehr entweder von einer neuen Verbindung stammt, die ein interner Prozess auf dem VyOS-Router (wie NTP) auslöst, oder von einer Antwort auf Datenverkehr, den der Router extern über',
    'receives': 'empfängt',
    '(for example, a response to an SSH login attempt).': '(z. B. eine Antwort auf einen SSH-Anmeldeversuch).',
    'This includes IPv4 and IPv6 rules, and two different sections apply:': 'Dies umfasst IPv4- und IPv6-Regeln, und zwei verschiedene Abschnitte werden angewendet:',
    'Output Prerouting': 'Output Prerouting',
    'As described in': 'Wie beschrieben in',
    'the system processes rules in this section before the connection tracking subsystem.': 'verarbeitet das System Regeln in diesem Abschnitt vor dem Connection-Tracking-Subsystem.',
    'Output Filter': 'Output Filter',
    'Postrouting': 'Postrouting',
    'As in': 'Wie in',
    'you can perform several actions defined in different parts of VyOS configuration in this stage.': 'können Sie in dieser Stufe mehrere Aktionen ausführen, die in verschiedenen Teilen der VyOS-Konfiguration definiert sind.',
    'This includes:': 'Dies umfasst:',
    'Source NAT': 'Source NAT',
    'If the interface where the packet was received is part of a bridge, the packet is processed at the': 'Wenn die Schnittstelle, an der das Paket empfangen wurde, Teil einer Bridge ist, wird das Paket auf der',
    'Bridge Layer': 'Bridge-Ebene',
    'Prerouting (Bridge)': 'Prerouting (Bridge)',
    'The bridge processes all packets it receives in this stage, regardless of the destination.': 'Die Bridge verarbeitet alle Pakete, die sie in dieser Stufe empfängt, unabhängig vom Ziel.',
    'First, you can apply filters here, or you can configure rules that ignore the connection tracking system.': 'Zuerst können Sie hier Filter anwenden, oder Sie können Regeln konfigurieren, die das Connection-Tracking-System ignorieren.',
    'The relevant configuration that applies:': 'Die relevante Konfiguration, die angewendet wird:',
    'Forward (Bridge)': 'Forward (Bridge)',
    'The stage where you filter and control traffic that passes through the bridge:': 'Die Stufe, in der Sie Datenverkehr filtern und steuern, der durch die Bridge läuft:',
    'Input (Bridge)': 'Input (Bridge)',
    'The stage where you filter and control traffic destined for the bridge itself:': 'Die Stufe, in der Sie Datenverkehr filtern und steuern, der für die Bridge selbst bestimmt ist:',
    'Output (Bridge)': 'Output (Bridge)',
    'The stage where you filter and control traffic that the bridge originates:': 'Die Stufe, in der Sie Datenverkehr filtern und steuern, der von der Bridge ausgeht:',
    'The following is the overall structure of the VyOS firewall CLI:': 'Das Folgende ist die Gesamtstruktur der VyOS-Firewall-CLI:',
    'Here is a list of VyOS firewall CLI subcommands and their corresponding pages in the documentation:': 'Hier ist eine Liste der VyOS-Firewall-CLI-Unterbefehle und ihrer entsprechenden Seiten in der Dokumentation:',
    'Configure bridge firewall rules for traffic at the bridge layer.': 'Konfiguriert Bridge-Firewall-Regeln für Datenverkehr auf der Bridge-Ebene.',
    'See the Bridge Firewall Configuration page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite Bridge-Firewall-Konfiguration.',
    'Configure firewall flowtables for stateful connection tracking and rules.': 'Konfiguriert Firewall-Flowtables für zustandsbehaftetes Connection-Tracking und Regeln.',
    'See the Flowtables Firewall Configuration page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite Flowtables-Firewall-Konfiguration.',
    'Configure global firewall options such as': 'Konfiguriert globale Firewall-Optionen wie',
    'and other system-wide firewall settings.': 'und andere systemweite Firewall-Einstellungen.',
    'See the Global Firewall Options page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite Globale Firewall-Optionen.',
    'Organize firewall rules by creating reusable address, network, interface, MAC, port, and domain groups.': 'Organisiert Firewall-Regeln durch Erstellen wiederverwendbarer Adress-, Netzwerk-, Schnittstellen-, MAC-, Port- und Domänengruppen.',
    'Use groups in multiple rules to simplify configuration and maintenance.': 'Verwenden Sie Gruppen in mehreren Regeln, um Konfiguration und Wartung zu vereinfachen.',
    'See the Firewall Groups page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite Firewall-Gruppen.',
    'Configure IPv4-specific firewall rules.': 'Konfiguriert IPv4-spezifische Firewall-Regeln.',
    'See the IPv4 Firewall Configuration page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite IPv4-Firewall-Konfiguration.',
    'Configure IPv6-specific firewall rules.': 'Konfiguriert IPv6-spezifische Firewall-Regeln.',
    'See the IPv6 Firewall Configuration page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite IPv6-Firewall-Konfiguration.',
    'Configure zone-based firewall policies for controlling traffic between different network zones.': 'Konfiguriert zonenbasierte Firewall-Richtlinien zur Steuerung des Datenverkehrs zwischen verschiedenen Netzwerkzonen.',
    'See the Zone-Based Firewall Configuration page for detailed information.': 'Ausführliche Informationen finden Sie auf der Seite Zonenbasierte Firewall-Konfiguration.',
    'For more information on firewall configuration, see the following pages:': 'Weitere Informationen zur Firewall-Konfiguration finden Sie auf den folgenden Seiten:',
    'Global Options Firewall Configuration': 'Konfiguration der globalen Firewall-Optionen',
    'Firewall groups': 'Firewall-Gruppen',
    'Bridge Firewall Configuration': 'Bridge-Firewall-Konfiguration',
    'IPv4 Firewall Configuration': 'IPv4-Firewall-Konfiguration',
    'IPv6 Firewall Configuration': 'IPv6-Firewall-Konfiguration',
    'Flowtables Firewall Configuration': 'Flowtables-Firewall-Konfiguration',
    'For more information on Netfilter hooks and Linux networking packet flows, see the': 'Weitere Informationen zu Netfilter-Hooks und Linux-Netzwerk-Paketflüssen finden Sie in der',
    'documentation.': 'Dokumentation.',
    'Zone-Based firewall': 'Zonenbasierte Firewall',
    'Zone-Based Firewall': 'Zonenbasierte Firewall',
    'With zone-based firewalls, a new concept applies.': 'Bei zonenbasierten Firewalls gilt ein neues Konzept.',
    'In addition to the standard in and out traffic flows, a local flow enables traffic originating from and destined to the router itself.': 'Zusätzlich zu den Standard-Datenflüssen ein und aus ermöglicht ein lokaler Fluss Datenverkehr, der vom Router selbst ausgeht und für den Router selbst bestimmt ist.',
    'This means you must configure additional rules to secure the firewall from the network, in addition to the existing inbound and outbound rules.': 'Das bedeutet, dass Sie zusätzlich zu den vorhandenen eingehenden und ausgehenden Regeln zusätzliche Regeln konfigurieren müssen, um die Firewall vor dem Netzwerk zu sichern.',
    'To configure VyOS with zone-based firewall, see': 'Um VyOS mit zonenbasierter Firewall zu konfigurieren, siehe',
    'As the following example image shows, you must configure rules to allow or block traffic to or from the services running on the device that have open connections on that interface.': 'Wie das folgende Beispielbild zeigt, müssen Sie Regeln konfigurieren, um Datenverkehr zu oder von den Diensten, die auf dem Gerät ausgeführt werden und offene Verbindungen auf dieser Schnittstelle haben, zuzulassen oder zu blockieren.',
}

def translate_html_content(content):
    """Translate HTML content from English to German."""
    result = content
    
    # Replace lang attribute
    result = re.sub(r'lang="zh-CN"', 'lang="de"', result)
    result = re.sub(r'lang="en"', 'lang="de"', result)
    
    # Translate text content between tags
    def replace_text(match):
        prefix = match.group(1)  # >
        text = match.group(2)    # text content
        suffix = match.group(3)  # <
        
        stripped = text.strip()
        
        # Skip empty or whitespace-only
        if not stripped:
            return match.group(0)
        
        # Skip code blocks and commands
        if stripped.startswith('set ') or stripped.startswith('delete ') or stripped.startswith('run ') or stripped.startswith('show ') or stripped.startswith('add '):
            return match.group(0)
        
        # Skip if it's a placeholder
        if stripped.startswith('<') and stripped.endswith('>'):
            return match.group(0)
        
        # Skip numbers and symbols
        if re.match(r'^[\d\s\.\,\-\+\|\<\>\[\]\(\)\{\}\:\/\*\#]+$', stripped):
            return match.group(0)
        
        # Try to find translation
        translated = None
        for eng, ger in TRANSLATIONS.items():
            if stripped == eng:
                translated = ger
                break
        
        if translated:
            # Preserve whitespace
            leading = text[:len(text) - len(text.lstrip())]
            trailing = text[len(text.rstrip()):]
            return prefix + leading + translated + trailing + suffix
        
        return match.group(0)
    
    # Match text between tags
    result = re.sub(r'(>)([^<]+)(<)', replace_text, result)
    
    return result

def main():
    """Main translation function."""
    # Get all HTML files
    html_files = sorted([f for f in os.listdir(EN_DIR) if f.endswith('.html')])
    print(f"Found {len(html_files)} HTML files to translate")
    
    # Create output directory
    os.makedirs(DE_DIR, exist_ok=True)
    
    # Process each file
    for i, filename in enumerate(html_files):
        src_file = os.path.join(EN_DIR, filename)
        dst_file = os.path.join(DE_DIR, filename)
        
        try:
            with open(src_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            translated = translate_html_content(content)
            
            with open(dst_file, 'w', encoding='utf-8') as f:
                f.write(translated)
            
            print(f"  [{i+1}/{len(html_files)}] {filename}")
        except Exception as e:
            print(f"  [{i+1}/{len(html_files)}] {filename}: ERROR - {e}")
    
    print(f"\nTranslation complete! {len(html_files)} files processed.")

if __name__ == '__main__':
    main()
