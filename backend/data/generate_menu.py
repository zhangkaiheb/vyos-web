#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate menu.json from the VyOS web config plan."""

import json
import os


def menu_item(id, label, label_en, icon='', children=None, route=None, component=None):
    item = {
        'id': id,
        'label': label,
        'label_en': label_en,
        'icon': icon,
        'children': children or [],
        'route': route,
        'component': component,
    }
    return item


def main():
    menu = [
        menu_item('monitor', '监控', 'Monitor', 'MonitorOutlined', [
            menu_item('dashboard', '监控面板', 'Dashboard', route='/monitor/dashboard', component='MonitorDashboard'),
            menu_item('interface-traffic', '接口流量', 'Interface Traffic', route='/monitor/interface-traffic', component='MonitorWidget', children=[
                menu_item('interface-stats', '接口统计', 'Interface Stats', route='/monitor/interface-traffic/interface-stats', component='InterfaceStatsPage'),
            ]),
            menu_item('conntrack', '连接跟踪', 'Conntrack', route='/monitor/conntrack', component='MonitorWidget'),
            menu_item('network', '网络', 'Network', 'GlobalOutlined', [
                menu_item('arp', 'ARP', 'ARP', route='/monitor/network/arp', component='ArpPage'),
                menu_item('route', '路由', 'Route', route='/monitor/network/route', component='RoutePage'),
                menu_item('zebra', 'Zebra', 'Zebra', route='/monitor/network/zebra', component='ZebraPage'),
                menu_item('active-connections', '活动连接', 'Active Connections', route='/monitor/network/active-connections', component='ActiveConnectionsPage'),
            ]),
            menu_item('system-status', '系统状态', 'System Status', 'DashboardOutlined', [
                menu_item('memory-cache', '内存缓存', 'Memory Cache', route='/monitor/system-status/memory-cache', component='MemoryCachePage'),
                menu_item('process-monitor', '进程监控', 'Process Monitor', route='/monitor/system-status/process-monitor', component='ProcessMonitorPage'),
            ]),
            menu_item('ipsec', 'IPsec', 'IPsec', children=[
                menu_item('connections', 'IPsec 连接', 'IPsec Connections', route='/monitor/ipsec/connections', component='IpsecConnectionsPage'),
                menu_item('security-associations', 'IPsec 安全关联', 'IPsec Security Associations', route='/monitor/ipsec/security-associations', component='IpsecSaPage'),
            ]),
            menu_item('pptp', 'PPTP', 'PPTP', children=[
                menu_item('sessions', 'PPTP 会话', 'PPTP Sessions', route='/monitor/pptp/sessions', component='PptpSessionsPage'),
                menu_item('statistics', 'PPTP 统计', 'PPTP Statistics', route='/monitor/pptp/statistics', component='PptpStatisticsPage'),
            ]),
            menu_item('dhcp', 'DHCP', 'DHCP', children=[
                menu_item('leases', 'DHCP 租约', 'DHCP Leases', route='/monitor/dhcp/leases', component='DhcpLeasesPage'),
                menu_item('static-mappings', 'DHCP 静态映射', 'DHCP Static Mappings', route='/monitor/dhcp/static-mappings', component='DhcpStaticMappingsPage'),
                menu_item('statistics', 'DHCP 统计', 'DHCP Statistics', route='/monitor/dhcp/statistics', component='DhcpStatisticsPage'),
                menu_item('dhcpv6-leases', 'DHCPv6 租约', 'DHCPv6 Leases', route='/monitor/dhcp/dhcpv6-leases', component='Dhcpv6LeasesPage'),
                menu_item('dhcpv6-static-mappings', 'DHCPv6 静态映射', 'DHCPv6 Static Mappings', route='/monitor/dhcp/dhcpv6-static-mappings', component='Dhcpv6StaticMappingsPage'),
            ]),
            menu_item('dns', 'DNS', 'DNS', children=[
                menu_item('dynamic-status', 'Dynamic DNS 状态', 'Dynamic DNS Status', route='/monitor/dns/dynamic-status', component='DnsDynamicStatusPage'),
                menu_item('forwarding-statistics', 'DNS 转发统计', 'DNS Forwarding Statistics', route='/monitor/dns/forwarding-statistics', component='DnsForwardingStatisticsPage'),
            ]),
            menu_item('ssh', 'SSH', 'SSH', children=[
                menu_item('fingerprints', 'SSH 指纹', 'SSH Fingerprints', route='/monitor/ssh/fingerprints', component='SshFingerprintsPage'),
            ]),
        ]),
        menu_item('system', '系统管理', 'System Management', 'SettingOutlined', [
            menu_item('control-panel', '控制面板', 'Control Panel', route='/system/control-panel', component='ControlPanelPage'),
            menu_item('interfaces', '网络接口', 'Interfaces', 'GlobalOutlined', [
                menu_item('ethernet', '以太网', 'Ethernet', route='/system/interfaces/ethernet', component='EthernetPage'),
                menu_item('bonding', '链路聚合', 'Bonding', route='/system/interfaces/bonding', component='TablePage'),
                menu_item('bridge', '桥接', 'Bridge', route='/system/interfaces/bridge', component='TablePage'),
                menu_item('wireguard', 'WireGuard', 'WireGuard', route='/system/interfaces/wireguard', component='TablePage'),
                menu_item('openvpn', 'OpenVPN', 'OpenVPN', route='/system/interfaces/openvpn', component='TablePage'),
                menu_item('vxlan', 'VXLAN', 'VXLAN', route='/system/interfaces/vxlan', component='TablePage'),
                menu_item('pppoe', 'PPPoE', 'PPPoE', route='/system/interfaces/pppoe', component='TablePage'),
                menu_item('tunnel', '隧道', 'Tunnel', route='/system/interfaces/tunnel', component='TablePage'),
                menu_item('dummy', 'Dummy', 'Dummy', route='/system/interfaces/dummy', component='TablePage'),
                menu_item('loopback', 'Loopback', 'Loopback', route='/system/interfaces/loopback', component='TablePage'),
                menu_item('input', 'Input', 'Input', route='/system/interfaces/input', component='ConfigPage'),
            ]),
            menu_item('settings', '系统设置', 'Settings', route='/system/settings', component='SettingsPage'),
            menu_item('host-name', '主机名', 'Host Name', route='/system/host-name', component='ConfigPage'),
            menu_item('name-server', 'DNS服务器', 'Name Server', route='/system/name-server', component='TablePage'),
            menu_item('ntp', 'NTP客户端', 'NTP Client', route='/system/ntp', component='ConfigPage'),
            menu_item('login', '登录设置', 'Login', route='/system/login', component='ConfigPage'),
            menu_item('netns', '网络命名空间', 'Network Namespace', route='/system/netns', component='TablePage'),
            menu_item('vrf', 'VRF', 'VRF', route='/system/vrf', component='TablePage'),
            menu_item('container', '容器', 'Container', children=[
                menu_item('name', '容器', 'Container', route='/system/container/name', component='TablePage'),
                menu_item('network', '容器网络', 'Network', route='/system/container/network', component='TablePage'),
                menu_item('registry', '镜像仓库', 'Registry', route='/system/container/registry', component='TablePage'),
            ]),
            menu_item('pki', 'PKI', 'PKI', route='/system/pki', component='ConfigPage'),
            menu_item('high-availability', '高可用性', 'High Availability', route='/system/high-availability', component='ConfigPage'),
            menu_item('conntrack', '连接跟踪', 'Conntrack', route='/system/conntrack', component='ConfigPage'),
            menu_item('table-size', '表项规格', 'Table Size', route='/system/table-size', component='TablePage'),
            menu_item('maintenance', '维护工具', 'Maintenance', children=[
                menu_item('ping', 'Ping', 'Ping', route='/system/maintenance/ping', component='ToolPage'),
                menu_item('traceroute', '路由追踪', 'Traceroute', route='/system/maintenance/traceroute', component='ToolPage'),
                menu_item('tcpdump', '抓包', 'TCPDump', route='/system/maintenance/tcpdump', component='ToolPage'),
                menu_item('reboot', '重启', 'Reboot', route='/system/maintenance/reboot', component='ToolPage'),
                menu_item('poweroff', '关机', 'Poweroff', route='/system/maintenance/poweroff', component='ToolPage'),
            ]),
            menu_item('users', '用户管理', 'Users', route='/system/users', component='UserPage'),
            menu_item('webapp', 'Web应用升级', 'Web App Upgrade', route='/system/webapp', component='WebAppPage'),
            menu_item('import-export', '导入/导出', 'Import/Export', route='/system/import-export', component='ImportExportPage'),
        ]),
        menu_item('firewall', '防火墙', 'Firewall', 'FireOutlined', [
            menu_item('global-options', '全局选项', 'Global Options', route='/firewall/global-options', component='FirewallGlobalOptionsPage'),
            menu_item('ipv4', 'IPv4防火墙', 'IPv4 Firewall', children=[
                menu_item('forward', '转发规则', 'Forward', route='/firewall/ipv4/forward', component='RuleTablePage'),
                menu_item('input', '输入规则', 'Input', route='/firewall/ipv4/input', component='RuleTablePage'),
                menu_item('output', '输出规则', 'Output', route='/firewall/ipv4/output', component='RuleTablePage'),
                menu_item('prerouting', '预路由规则', 'Prerouting', route='/firewall/ipv4/prerouting', component='RuleTablePage'),
                menu_item('name', '自定义规则', 'Custom', route='/firewall/ipv4/name', component='RuleTablePage'),
            ]),
            menu_item('ipv6', 'IPv6防火墙', 'IPv6 Firewall', children=[
                menu_item('forward', '转发规则', 'Forward', route='/firewall/ipv6/forward', component='RuleTablePage'),
                menu_item('input', '输入规则', 'Input', route='/firewall/ipv6/input', component='RuleTablePage'),
                menu_item('output', '输出规则', 'Output', route='/firewall/ipv6/output', component='RuleTablePage'),
                menu_item('prerouting', '预路由规则', 'Prerouting', route='/firewall/ipv6/prerouting', component='RuleTablePage'),
                menu_item('name', '自定义规则', 'Custom', route='/firewall/ipv6/name', component='RuleTablePage'),
            ]),
            menu_item('bridge', '桥接防火墙', 'Bridge Firewall', children=[
                menu_item('forward', '转发规则', 'Forward', route='/firewall/bridge/forward', component='RuleTablePage'),
                menu_item('input', '输入规则', 'Input', route='/firewall/bridge/input', component='RuleTablePage'),
                menu_item('output', '输出规则', 'Output', route='/firewall/bridge/output', component='RuleTablePage'),
            ]),
            menu_item('group', '防火墙组', 'Firewall Group', children=[
                menu_item('address-group', '地址组', 'Address Group', route='/firewall/group/address-group', component='FirewallGroupPage'),
                menu_item('network-group', '网络组', 'Network Group', route='/firewall/group/network-group', component='FirewallGroupPage'),
                menu_item('port-group', '端口组', 'Port Group', route='/firewall/group/port-group', component='FirewallGroupPage'),
                menu_item('domain-group', '域名组', 'Domain Group', route='/firewall/group/domain-group', component='FirewallGroupPage'),
                menu_item('interface-group', '接口组', 'Interface Group', route='/firewall/group/interface-group', component='FirewallGroupPage'),
                menu_item('mac-group', 'MAC组', 'MAC Group', route='/firewall/group/mac-group', component='FirewallGroupPage'),
                menu_item('ipv6-address-group', 'IPv6地址组', 'IPv6 Address Group', route='/firewall/group/ipv6-address-group', component='FirewallGroupPage'),
                menu_item('ipv6-network-group', 'IPv6网络组', 'IPv6 Network Group', route='/firewall/group/ipv6-network-group', component='FirewallGroupPage'),
                menu_item('dynamic-group', '动态组', 'Dynamic Group', route='/firewall/group/dynamic-group', component='FirewallGroupPage'),
            ]),
            menu_item('zone', '区域策略', 'Zone Policy', route='/firewall/zone', component='TablePage'),
            menu_item('flowtable', '流表', 'Flowtable', route='/firewall/flowtable', component='TablePage'),
            menu_item('protocol', '协议列表', 'Protocol List', route='/firewall/protocol', component='ProtocolPage'),
            menu_item('qos', '服务质量', 'QoS', 'ControlOutlined', [
                menu_item('interface', '接口QoS', 'Interface QoS', route='/qos/interface', component='TablePage'),
                menu_item('policy', 'QoS策略', 'QoS Policy', route='/qos/policy', component='TablePage'),
                menu_item('traffic-match-group', '流量匹配组', 'Traffic Match Group', route='/qos/traffic-match-group', component='TablePage'),
            ]),
            menu_item('load-balancing', '负载均衡', 'Load Balancing', 'ApartmentOutlined', [
                menu_item('wan', 'WAN负载均衡', 'WAN LB', route='/load-balancing/wan', component='ConfigPage'),
                menu_item('reverse-proxy', '反向代理', 'Reverse Proxy', route='/load-balancing/reverse-proxy', component='ConfigPage'),
            ]),
        ]),
        menu_item('nat', '网络地址转换', 'NAT', 'SwapOutlined', [
            menu_item('source', '源NAT', 'Source NAT', route='/nat/source', component='RuleTablePage'),
            menu_item('destination', '目的NAT', 'Destination NAT', route='/nat/destination', component='RuleTablePage'),
            menu_item('static', '静态NAT', 'Static NAT', route='/nat/static', component='RuleTablePage'),
            menu_item('cgnat', 'CGNAT', 'CGNAT', route='/nat/cgnat', component='RuleTablePage'),
            menu_item('nat64', 'NAT64', 'NAT64', children=[
                menu_item('source', '源NAT64', 'Source', route='/nat64/source', component='RuleTablePage'),
            ]),
            menu_item('nat66', 'NAT66', 'NAT66', children=[
                menu_item('source', '源NAT66', 'Source', route='/nat66/source', component='RuleTablePage'),
                menu_item('destination', '目的NAT66', 'Destination', route='/nat66/destination', component='RuleTablePage'),
            ]),
        ]),
        menu_item('policy', '路由', 'Routing', 'NodeIndexOutlined', [
            menu_item('route', '策略路由', 'Policy Route', route='/policy/route', component='TablePage'),
            menu_item('route6', 'IPv6策略路由', 'Policy Route6', route='/policy/route6', component='TablePage'),
            menu_item('local-route', '本地策略路由', 'Local Route', route='/policy/local-route', component='TablePage'),
            menu_item('local-route6', '本地策略路由6', 'Local Route6', route='/policy/local-route6', component='TablePage'),
            menu_item('routing-policy', '路由策略', 'Routing Policy', children=[
                menu_item('access-list', '访问列表', 'Access List', route='/policy/access-list', component='RuleTablePage'),
                menu_item('access-list6', '访问列表6', 'Access List6', route='/policy/access-list6', component='RuleTablePage'),
                menu_item('as-path-list', 'AS路径列表', 'AS Path List', route='/policy/as-path-list', component='TablePage'),
                menu_item('community-list', '团体列表', 'Community List', route='/policy/community-list', component='TablePage'),
                menu_item('extcommunity-list', '扩展团体列表', 'Extcommunity List', route='/policy/extcommunity-list', component='TablePage'),
                menu_item('large-community-list', '大型团体列表', 'Large Community List', route='/policy/large-community-list', component='TablePage'),
                menu_item('prefix-list', '前缀列表', 'Prefix List', route='/policy/prefix-list', component='TablePage'),
                menu_item('prefix-list6', '前缀列表6', 'Prefix List6', route='/policy/prefix-list6', component='TablePage'),
                menu_item('route-map', '路由映射', 'Route Map', route='/policy/route-map', component='RuleTablePage'),
            ]),
            menu_item('protocols', '路由协议', 'Protocols', children=[
                menu_item('bgp', 'BGP', 'BGP', route='/policy/protocols/bgp', component='ConfigPage'),
                menu_item('ospf', 'OSPF', 'OSPF', route='/policy/protocols/ospf', component='ConfigPage'),
                menu_item('ospfv3', 'OSPFv3', 'OSPFv3', route='/policy/protocols/ospfv3', component='ConfigPage'),
                menu_item('static', '静态路由', 'Static', route='/policy/protocols/static', component='ConfigPage'),
                menu_item('isis', 'IS-IS', 'IS-IS', route='/policy/protocols/isis', component='ConfigPage'),
                menu_item('rip', 'RIP', 'RIP', route='/policy/protocols/rip', component='ConfigPage'),
                menu_item('ripng', 'RIPng', 'RIPng', route='/policy/protocols/ripng', component='ConfigPage'),
                menu_item('pim', 'PIM', 'PIM', route='/policy/protocols/pim', component='ConfigPage'),
            ]),
        ]),
        menu_item('service', '系统服务', 'Services', 'CloudServerOutlined', [
            menu_item('dhcp', 'DHCP服务', 'DHCP Service', children=[
                menu_item('dhcp-server', 'DHCP服务器', 'DHCP Server', route='/service/dhcp-server', component='DhcpServerPage'),
                menu_item('dhcp-relay', 'DHCP中继', 'DHCP Relay', route='/service/dhcp-relay', component='DhcpRelayPage'),
                menu_item('dhcpv6-server', 'DHCPv6服务器', 'DHCPv6 Server', route='/service/dhcpv6-server', component='Dhcpv6ServerPage'),
                menu_item('dhcpv6-relay', 'DHCPv6中继', 'DHCPv6 Relay', route='/service/dhcpv6-relay', component='Dhcpv6RelayPage'),
            ]),
            menu_item('dns', 'DNS', 'DNS', route='/service/dns', component='DnsPage'),
            menu_item('ntp', 'NTP', 'NTP', route='/service/ntp', component='NtpPage'),
            menu_item('ssh', 'SSH', 'SSH', route='/service/ssh', component='SshPage'),
            menu_item('https', 'HTTPS', 'HTTPS', route='/service/https', component='HttpsPage'),
            menu_item('snmp', 'SNMP', 'SNMP', route='/service/snmp', component='SnmpPage'),
            menu_item('lldp', 'LLDP', 'LLDP', route='/service/lldp', component='LldpPage'),
            menu_item('ids-ddos-protection', 'IDS DDoS防护', 'IDS DDoS Protection', route='/service/ids-ddos-protection', component='IdsDdosPage'),
            menu_item('webproxy', 'Web代理', 'Web Proxy', route='/service/webproxy', component='WebProxyPage'),
            menu_item('suricata', 'Suricata', 'Suricata', route='/service/suricata', component='SuricataPage'),
            menu_item('conntrack-sync', '连接跟踪同步', 'Conntrack Sync', route='/service/conntrack-sync', component='ConntrackSyncPage'),
            menu_item('config-sync', '配置同步', 'Config Sync', route='/service/config-sync', component='ConfigSyncPage'),
        ]),
        menu_item('vpn', '虚拟专用网络', 'VPN', 'SafetyOutlined', [
            menu_item('ipsec', 'IPsec', 'IPsec', route='/vpn/ipsec', component='IpsecPage'),
            menu_item('openvpn', 'OpenVPN', 'OpenVPN', route='/vpn/openvpn', component='ConfigPage'),
            menu_item('l2tp', 'L2TP', 'L2TP', route='/vpn/l2tp', component='L2tpPage'),
            menu_item('pptp', 'PPTP', 'PPTP', route='/vpn/pptp', component='PptpPage'),
            menu_item('sstp', 'SSTP', 'SSTP', route='/vpn/sstp', component='ConfigPage'),
            menu_item('wireguard', 'WireGuard', 'WireGuard', route='/vpn/wireguard', component='ConfigPage'),
            menu_item('vti', 'VTI', 'VTI', route='/vpn/vti', component='ConfigPage'),
        ]),
        menu_item('logs', '日志', 'Logs', 'FileTextOutlined', [
            menu_item('audit', '操作日志', 'Audit Log', route='/logs/audit', component='LogPage'),
            menu_item('system', '系统日志', 'System Log', route='/logs/system', component='LogPage'),
            menu_item('firewall', '防火墙日志', 'Firewall Log', route='/logs/firewall', component='LogPage'),
            menu_item('conntrack', '连接跟踪日志', 'Conntrack Log', route='/logs/conntrack', component='LogPage'),
        ]),
    ]

    out_path = os.path.join(os.path.dirname(__file__), 'menu.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(menu, f, ensure_ascii=False, indent=2)
    print(f'Generated {out_path}')


if __name__ == '__main__':
    main()
