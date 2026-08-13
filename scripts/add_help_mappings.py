#!/usr/bin/env python3
"""Add missing help doc mappings for all routes in menu.json."""

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPPING_FILE = os.path.join(BASE_DIR, 'backend', 'data', 'help_mapping.json')

with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
    mapping = json.load(f)

# Sub-route → parent doc mapping
# These sub-pages share the same help doc as their parent
SUB_ROUTE_MAP = {
    # Firewall IPv4 sub-routes → firewall_ipv4.html
    '/firewall/ipv4/forward': 'firewall_ipv4.html',
    '/firewall/ipv4/input': 'firewall_ipv4.html',
    '/firewall/ipv4/output': 'firewall_ipv4.html',
    '/firewall/ipv4/prerouting': 'firewall_ipv4.html',
    '/firewall/ipv4/name': 'firewall_ipv4.html',

    # Firewall IPv6 sub-routes → firewall_ipv6.html
    '/firewall/ipv6/forward': 'firewall_ipv6.html',
    '/firewall/ipv6/input': 'firewall_ipv6.html',
    '/firewall/ipv6/output': 'firewall_ipv6.html',
    '/firewall/ipv6/prerouting': 'firewall_ipv6.html',
    '/firewall/ipv6/name': 'firewall_ipv6.html',

    # Firewall bridge sub-routes → firewall_bridge.html
    '/firewall/bridge/forward': 'firewall_bridge.html',
    '/firewall/bridge/input': 'firewall_bridge.html',
    '/firewall/bridge/output': 'firewall_bridge.html',

    # Firewall group sub-routes → firewall_group.html
    '/firewall/group/address-group': 'firewall_group.html',
    '/firewall/group/network-group': 'firewall_group.html',
    '/firewall/group/port-group': 'firewall_group.html',
    '/firewall/group/domain-group': 'firewall_group.html',
    '/firewall/group/interface-group': 'firewall_group.html',
    '/firewall/group/mac-group': 'firewall_group.html',
    '/firewall/group/ipv6-address-group': 'firewall_group.html',
    '/firewall/group/ipv6-network-group': 'firewall_group.html',
    '/firewall/group/dynamic-group': 'firewall_group.html',

    # Firewall protocol → firewall.html
    '/firewall/protocol': 'firewall.html',

    # Load balancing → use existing docs
    '/load-balancing/haproxy': 'high-availability.html',
    '/load-balancing/wan': 'high-availability.html',

    # Logs → use system docs
    '/logs/audit': 'system_syslog.html',
    '/logs/conntrack': 'system_conntrack.html',
    '/logs/firewall': 'firewall.html',
    '/logs/system': 'system_syslog.html',

    # Monitor dashboard
    '/monitor/dashboard': 'index.md',
    '/monitor/interface-traffic': 'monitor_interfaces.md',
    '/monitor/interface-traffic/interface-stats': 'monitor_interfaces.md',

    # Monitor DHCP
    '/monitor/dhcp/leases': 'service_dhcp_server.html',
    '/monitor/dhcp/static-mappings': 'service_dhcp_server.html',
    '/monitor/dhcp/statistics': 'service_dhcp_server.html',
    '/monitor/dhcp/dhcpv6-leases': 'service_dhcp_server.html',
    '/monitor/dhcp/dhcpv6-static-mappings': 'service_dhcp_server.html',

    # Monitor DNS
    '/monitor/dns/dynamic-status': 'service_dns.html',
    '/monitor/dns/forwarding-statistics': 'service_dns.html',

    # Monitor IPsec
    '/monitor/ipsec/connections': 'vpn_ipsec.html',
    '/monitor/ipsec/security-associations': 'vpn_ipsec.html',

    # Monitor network
    '/monitor/network/active-connections': 'system_conntrack.html',
    '/monitor/network/arp': 'protocols_arp.html',
    '/monitor/network/route': 'protocols_static.html',
    '/monitor/network/zebra': 'protocols_static.html',

    # Monitor PPTP
    '/monitor/pptp/sessions': 'vpn_pptp.html',
    '/monitor/pptp/statistics': 'vpn_pptp.html',

    # Monitor SSH
    '/monitor/ssh/fingerprints': 'service_ssh.html',

    # Monitor system
    '/monitor/system-status/memory-cache': 'monitor_memory.md',
    '/monitor/system-status/process-monitor': 'monitor_cpu.md',

    # NAT64/66 sub-routes
    '/nat64/source': 'nat_nat64.html',
    '/nat66/destination': 'nat_nat66.html',
    '/nat66/source': 'nat_nat66.html',

    # Policy IPv6 sub-routes → parent docs
    '/policy/access-list6': 'policy_access_list.html',
    '/policy/local-route6': 'policy_local-route.html',
    '/policy/prefix-list6': 'policy_prefix_list.html',
    '/policy/route6': 'policy_route.html',

    # Policy protocols sub-routes → protocols docs
    '/policy/protocols/babel': 'protocols_babel.html',
    '/policy/protocols/bfd': 'protocols_bfd.html',
    '/policy/protocols/bgp': 'protocols_bgp.html',
    '/policy/protocols/failover': 'protocols_failover.html',
    '/policy/protocols/igmp-proxy': 'protocols_igmp-proxy.html',
    '/policy/protocols/isis': 'protocols_isis.html',
    '/policy/protocols/mpls': 'protocols_mpls.html',
    '/policy/protocols/nhrp': 'protocols_nhrp.html',
    '/policy/protocols/ospf': 'protocols_ospf.html',
    '/policy/protocols/ospfv3': 'protocols_ospfv3.html',
    '/policy/protocols/pim': 'protocols_pim.html',
    '/policy/protocols/pim6': 'protocols_pim6.html',
    '/policy/protocols/rip': 'protocols_rip.html',
    '/policy/protocols/ripng': 'protocols_ripng.html',
    '/policy/protocols/rpki': 'protocols_rpki.html',
    '/policy/protocols/segment-routing': 'protocols_segment-routing.html',
    '/policy/protocols/static': 'protocols_static.html',

    # Service sub-routes
    '/service/conntrack-sync': 'service_config-sync.html',
    '/service/dhcpv6-relay': 'service_dhcp-relay.html',
    '/service/dhcpv6-server': 'service_dhcp_server.html',
    '/service/ids-ddos-protection': 'service_suricata.html',

    # System container sub-routes
    '/system/container/name': 'container_name.html',
    '/system/container/network': 'container_network.html',
    '/system/container/registry': 'container_registry.html',

    # System control panel / import-export
    '/system/control-panel': 'index.md',
    '/system/import-export': 'index.md',

    # System interfaces sub-routes → interfaces docs
    '/system/interfaces/ethernet': 'interfaces_ethernet.html',
    '/system/interfaces/bonding': 'interfaces_bonding.html',
    '/system/interfaces/bridge': 'interfaces_bridge.html',
    '/system/interfaces/dummy': 'interfaces_ethernet.html',
    '/system/interfaces/geneve': 'interfaces_geneve.html',
    '/system/interfaces/input': 'interfaces_ethernet.html',
    '/system/interfaces/l2tpv3': 'interfaces_l2tpv3.html',
    '/system/interfaces/loopback': 'interfaces_loopback.html',
    '/system/interfaces/macsec': 'interfaces_macsec.html',
    '/system/interfaces/openvpn': 'interfaces_openvpn.html',
    '/system/interfaces/pppoe': 'interfaces_pppoe.html',
    '/system/interfaces/pseudo-ethernet': 'interfaces_pseudo-ethernet.html',
    '/system/interfaces/tunnel': 'interfaces_tunnel.html',
    '/system/interfaces/virtual-ethernet': 'interfaces_virtual-ethernet.html',
    '/system/interfaces/vti': 'interfaces_vti.html',
    '/system/interfaces/vxlan': 'interfaces_vxlan.html',
    '/system/interfaces/wireguard': 'interfaces_wireguard.html',

    # System IP/IPv6
    '/system/ip': 'system.html',
    '/system/ipv6': 'system.html',

    # System maintenance sub-routes
    '/system/maintenance/ping': 'system_troubleshooting.md',
    '/system/maintenance/poweroff': 'system_troubleshooting.md',
    '/system/maintenance/reboot': 'system_troubleshooting.md',
    '/system/maintenance/tcpdump': 'system_troubleshooting.md',
    '/system/maintenance/traceroute': 'system_troubleshooting.md',

    # System name-server
    '/system/name-server': 'system_dns.html',

    # System netns
    '/system/netns': 'vrf.html',

    # System PKI
    '/system/pki': 'vpn_ipsec.html',

    # System settings sub-routes
    '/system/settings/high-availability': 'high-availability.html',
    '/system/settings/host-name': 'system_hostname.html',
    '/system/settings/login': 'system_login.html',
    '/system/settings/ntp': 'system_ntp.html',
    '/system/settings/syslog': 'system_syslog.html',
    '/system/settings/task-scheduler': 'system_task-scheduler.html',

    # System table-size / users / vrf / webapp
    '/system/table-size': 'system.html',
    '/system/users': 'users.md',
    '/system/vrf': 'vrf.html',
    '/system/webapp': 'webapp.md',

    # VPN VTI
    '/vpn/vti': 'vpn_ipsec.html',

    # VPP routes → use vpn/ipsec as fallback
    '/vpp/acl': 'vpn_ipsec.html',
    '/vpp/interfaces': 'interfaces_ethernet.html',
    '/vpp/ipfix': 'system.html',
    '/vpp/kernel-interfaces': 'interfaces_ethernet.html',
    '/vpp/nat': 'nat.html',
    '/vpp/nat44': 'nat.html',
    '/vpp/settings': 'system.html',
    '/vpp/sflow': 'system.html',
}

added = 0
for route, doc in SUB_ROUTE_MAP.items():
    if route not in mapping:
        mapping[route] = doc
        added += 1
        print(f"  ADD: {route} -> {doc}")

with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
    json.dump(mapping, f, indent=2, ensure_ascii=False)

print(f"\nAdded {added} mappings. Total: {len(mapping)}")
