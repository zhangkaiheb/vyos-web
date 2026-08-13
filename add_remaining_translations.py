#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

# 读取 common.json
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 添加 dhcpStaticMappings 翻译键
dhcp_static_mappings = {
    "title": "DHCP 静态映射",
    "filterByPool": "按地址池过滤",
    "allPools": "全部地址池",
    "sort": "排序",
    "defaultSort": "默认排序",
    "rawOutput": "原始输出",
    "columns": {
        "pool": "地址池",
        "subnet": "子网",
        "name": "名称",
        "ipAddress": "IP 地址",
        "macAddress": "MAC 地址",
        "duid": "DUID",
        "description": "描述"
    }
}

# 添加 dhcpv6StaticMappings 翻译键
dhcpv6_static_mappings = {
    "title": "DHCPv6 静态映射",
    "filterByPool": "按地址池过滤",
    "allPools": "全部地址池",
    "sort": "排序",
    "defaultSort": "默认排序",
    "rawOutput": "原始输出",
    "columns": {
        "pool": "地址池",
        "subnet": "子网",
        "name": "名称",
        "ipAddress": "IP 地址",
        "macAddress": "MAC 地址",
        "duid": "DUID",
        "description": "描述"
    }
}

# 添加 containerNetwork 翻译键
container_network = {
    "title": "容器网络",
    "create": "创建",
    "edit": "编辑",
    "delete": "删除",
    "name": "名称",
    "description": "描述",
    "type": "类型",
    "gateway": "网关",
    "prefix": "前缀",
    "mtu": "MTU",
    "vrf": "VRF",
    "actions": "操作",
    "editNetwork": "编辑网络",
    "newNetwork": "新建网络",
    "networkName": "网络名称",
    "networkType": "网络类型",
    "bridgeDefault": "Bridge (默认)",
    "macvlan": "MACVLAN",
    "disableDns": "禁用 DNS",
    "disableDnsPlugin": "禁用 DNS 插件",
    "gatewayAddress": "网关地址",
    "gatewayAddressPlaceholder": "每行一个网关地址",
    "prefixLabel": "前缀",
    "prefixPlaceholder": "每行一个前缀，如 192.168.0.0/24",
    "prefixHelp": "分配给网络的前缀",
    "macvlanSettings": "MACVLAN 设置",
    "mode": "模式",
    "macvlanMode": "MACVLAN 模式",
    "parentInterface": "父接口",
    "parentNetworkInterface": "父网络接口",
    "selectNetworkToEdit": "请选择要编辑的网络",
    "networkNotFound": "未找到选中的网络",
    "selectNetworkToDelete": "请选择要删除的网络",
    "enterNetworkName": "请输入网络名称",
    "loadFailed": "加载失败",
    "saveFailed": "保存失败"
}

# 添加 vppInterfaces 翻译键
vpp_interfaces = {
    "tabs": {
        "bonding": "Bonding",
        "bridge": "Bridge",
        "gre": "GRE",
        "ipip": "IPIP",
        "loopback": "Loopback",
        "vxlan": "VXLAN",
        "xconnect": "XConnect"
    },
    "create": "创建",
    "edit": "编辑",
    "delete": "删除",
    "editItem": "编辑",
    "newItem": "新建",
    "name": "名称",
    "description": "描述",
    "mode": "模式",
    "hashPolicy": "哈希策略",
    "memberInterfaces": "成员接口",
    "actions": "操作",
    "remote": "远端",
    "sourceAddress": "源地址",
    "tunnelType": "隧道类型",
    "vni": "VNI",
    "bondingName": "Bonding接口名称",
    "bridgeName": "Bridge接口名称",
    "greName": "GRE接口名称",
    "ipipName": "IPIP接口名称",
    "loopbackName": "Loopback接口名称",
    "vxlanName": "VXLAN接口名称",
    "xconnectName": "XConnect接口名称",
    "bondingMode": "Bonding模式",
    "hashPolicyLabel": "哈希策略",
    "kernelInterface": "内核接口",
    "macAddress": "MAC地址",
    "memberInterfacesPlaceholder": "每行一个接口",
    "remoteAddress": "远端地址",
    "remoteIp": "远端IP地址",
    "sourceIp": "源IP地址",
    "tunnelTypeLabel": "隧道类型",
    "greMode": "GRE模式",
    "vniLabel": "VXLAN Network Identifier",
    "selectItemToEdit": "请选择要编辑的项目",
    "itemNotFound": "未找到选中的项目",
    "selectItemToDelete": "请选择要删除的项目",
    "enterName": "请输入名称",
    "loadFailed": "加载失败",
    "saveFailed": "保存失败"
}

# 添加 vppAcl 翻译键
vpp_acl = {
    "tabs": {
        "ipAcl": "IP ACL",
        "macIpAcl": "MAC-IP ACL"
    },
    "ipAclList": "IP ACL列表",
    "macIpAclList": "MAC-IP ACL列表",
    "ruleManagement": "规则管理",
    "create": "创建",
    "edit": "编辑",
    "delete": "删除",
    "addRule": "添加规则",
    "name": "名称",
    "description": "描述",
    "ruleCount": "规则数",
    "actions": "操作",
    "ruleNumber": "规则号",
    "action": "动作",
    "protocol": "协议",
    "sourceAddress": "源地址",
    "destAddress": "目的地址",
    "macAddress": "MAC地址",
    "ipPrefix": "IP前缀",
    "editIpAcl": "编辑IP ACL",
    "newIpAcl": "新建IP ACL",
    "editRule": "编辑规则",
    "addRuleModal": "添加规则",
    "editMacIpAcl": "编辑MAC-IP ACL",
    "newMacIpAcl": "新建MAC-IP ACL",
    "aclName": "ACL名称",
    "aclDescription": "ACL描述",
    "ruleNumberLabel": "规则编号",
    "ruleAction": "规则动作",
    "ipProtocol": "IP协议",
    "sourceIpPrefix": "源IP前缀",
    "sourcePort": "源端口",
    "destIpPrefix": "目的IP前缀",
    "destPort": "目的端口",
    "macAddressLabel": "MAC地址",
    "macMask": "MAC掩码",
    "ipPrefixLabel": "IP前缀",
    "permit": "允许",
    "deny": "拒绝",
    "permitReflect": "允许并反射",
    "all": "所有",
    "selectAclToEdit": "请选择要编辑的ACL",
    "aclNotFound": "未找到选中的ACL",
    "selectAclToDelete": "请选择要删除的ACL",
    "enterAclName": "请输入ACL名称",
    "selectRuleToEdit": "请选择要编辑的规则",
    "ruleNotFound": "未找到选中的规则",
    "selectRuleToDelete": "请选择要删除的规则",
    "enterRuleNumber": "请输入规则号",
    "loadFailed": "加载失败",
    "saveFailed": "保存失败"
}

# 添加 https 翻译键
https = {
    "tabs": {
        "basic": "基本",
        "certificates": "证书",
        "api": "API",
        "allowClient": "允许客户端"
    },
    "port": "端口",
    "portPlaceholder": "1-65535，默认 443",
    "portHelp": "默认：443，范围：1-65535",
    "listenAddress": "监听地址",
    "listenAddressPlaceholder": "每行一个 IPv4/IPv6 地址",
    "listenAddressHelp": "HTTPS 监听地址列表",
    "tlsVersion": "TLS 版本",
    "tlsVersionHelp": "默认：1.2, 1.3",
    "enableHttpRedirect": "启用 HTTP 重定向",
    "enableHttpRedirectHelp": "将 HTTP 请求重定向到 HTTPS",
    "requestBodySizeLimit": "请求体大小限制 (MB)",
    "requestBodySizeLimitPlaceholder": "默认 1",
    "requestBodySizeLimitHelp": "默认：1 MB",
    "vrf": "VRF",
    "vrfPlaceholder": "VRF 名称",
    "vrfHelp": "绑定的 VRF 实例名称",
    "certificate": "证书",
    "certificatePlaceholder": "PKI 证书名称",
    "certificateHelp": "PKI 中的服务器证书名称",
    "caCertificate": "CA 证书",
    "caCertificatePlaceholder": "PKI CA 证书名称",
    "caCertificateHelp": "PKI 中的 CA 证书名称",
    "dhParams": "DH 参数",
    "dhParamsPlaceholder": "PKI DH 参数名称",
    "dhParamsHelp": "PKI 中的 Diffie-Hellman 参数名称",
    "strictMode": "严格模式",
    "strictModeHelp": "启用 API 严格路径检查",
    "debugMode": "调试模式",
    "debugModeHelp": "启用 API 调试输出",
    "corsAllowOrigin": "CORS 允许 Origin",
    "corsAllowOriginPlaceholder": "每行一个 Origin，例如 https://example.com",
    "corsAllowOriginHelp": "对应命令：set service https api cors allow-origin <origin>",
    "graphqlIntrospection": "GraphQL 内省",
    "graphqlIntrospectionHelp": "启用 GraphQL 内省查询",
    "graphqlAuthentication": "GraphQL 认证",
    "graphqlAuthenticationHelp": "启用 GraphQL 认证",
    "authType": "认证类型",
    "authTypeHelp": "认证类型，默认 key",
    "tokenExpiration": "Token 过期时间 (秒)",
    "tokenExpirationPlaceholder": "60-31536000，默认 3600",
    "tokenExpirationHelp": "默认：3600，范围：60-31536000",
    "secretLength": "Secret 长度 (字节)",
    "secretLengthPlaceholder": "16-65535，默认 32",
    "secretLengthHelp": "默认：32，范围：16-65535",
    "allowClientAddress": "允许客户端地址",
    "allowClientAddressPlaceholder": "每行一个 IPv4/IPv6 地址",
    "allowClientAddressHelp": "允许访问 HTTPS 服务的客户端地址列表",
    "apiKey": "API Key",
    "apiKeyId": "ID",
    "apiKeyValue": "Key",
    "apiKeyIdPlaceholder": "API Key ID",
    "apiKeyValuePlaceholder": "API Key 明文",
    "saving": "保存中...",
    "confirm": "确定",
    "saved": "已保存",
    "authTypeOptions": {
        "apiKeys": "API Keys（默认）",
        "jwtToken": "JWT Token"
    },
    "validation": {
        "ipv4FormatError": "IPv4 地址格式错误",
        "ipv6FormatError": "IPv6 地址格式错误",
        "ipFormatError": "IP 地址格式错误",
        "apiKeyIdRequired": "请输入 API Key ID",
        "apiKeyIdFormatError": "API Key ID 只能包含字母、数字、下划线和连字符",
        "portRangeError": "端口范围为 1-65535，默认 443",
        "listenAddressFormatError": "监听地址格式错误",
        "requestBodySizeLimitError": "请求体大小限制必须为正整数，默认 1 MB",
        "allowClientAddressFormatError": "允许客户端地址格式错误",
        "tokenExpirationRangeError": "GraphQL Token 过期时间范围为 60-31536000 秒，默认 3600",
        "secretLengthRangeError": "GraphQL Secret 长度范围为 16-65535 字节，默认 32",
        "apiKeyIdDuplicate": "API Key ID 重复",
        "apiKeyIdExists": "API Key ID 已存在"
    }
}

# 添加 igmpProxy 翻译键
igmp_proxy = {
    "tabs": {
        "basicSettings": "基本设置",
        "interfaces": "接口"
    },
    "globalSettings": "全局设置",
    "disableInstance": "禁用实例",
    "disableQuickLeave": "禁用快速离开",
    "interfaceName": "接口名称",
    "role": "角色",
    "threshold": "阈值",
    "selectRole": "请选择",
    "upstream": "上游 (upstream)",
    "downstream": "下游 (downstream)",
    "pleaseSelectInterface": "请选择接口",
    "pleaseSelectRole": "请选择角色",
    "saving": "保存中...",
    "confirm": "确定",
    "saved": "已保存",
    "editInterface": "编辑 IGMP 代理接口",
    "addInterface": "添加 IGMP 代理接口",
    "confirmDelete": "确认删除",
    "confirmDeleteMessage": "确认删除以下接口？"
}

# 添加 interfaceStats 翻译键
interface_stats = {
    "tabs": {
        "physical": "物理接口",
        "virtual": "非物理接口"
    },
    "interface": "接口",
    "rxPackets": "RX 包",
    "txPackets": "TX 包",
    "rxBytes": "RX 字节",
    "txBytes": "TX 字节",
    "rxErrors": "RX 错误",
    "txErrors": "TX 错误",
    "rxDropped": "RX 丢弃",
    "txDropped": "TX 丢弃",
    "multicast": "组播",
    "collisions": "冲突",
    "rxOverruns": "RX 溢出",
    "txOverruns": "TX 溢出",
    "refresh": "刷新",
    "fetchFailed": "获取接口统计失败"
}

# 添加 firewall 翻译键（补充 RuleTablePage 需要的）
firewall_tabs = {
    "basic": "基本",
    "source": "源/入接口",
    "destination": "目的/出接口",
    "time": "时间",
    "tcp": "TCP 选项",
    "log": "日志",
    "dynamic": "动态地址组",
    "advanced": "高级"
}

firewall_columns = {
    "rule": "规则编号",
    "description": "描述",
    "action": "动作",
    "protocol": "协议",
    "source": "源",
    "destination": "目的",
    "inboundInterface": "入接口",
    "outboundInterface": "出接口",
    "packets": "Packets",
    "bytes": "Bytes",
    "log": "日志",
    "disable": "禁用"
}

# 为所有7种语言添加翻译键
languages = ['zh-CN', 'zh-TW', 'en', 'ru', 'de', 'fr', 'ko']

for lang in languages:
    if lang not in data:
        data[lang] = {}
    
    # 添加 dhcpStaticMappings
    if 'dhcpStaticMappings' not in data[lang]:
        data[lang]['dhcpStaticMappings'] = dhcp_static_mappings
    
    # 添加 dhcpv6StaticMappings
    if 'dhcpv6StaticMappings' not in data[lang]:
        data[lang]['dhcpv6StaticMappings'] = dhcpv6_static_mappings
    
    # 添加 containerNetwork
    if 'containerNetwork' not in data[lang]:
        data[lang]['containerNetwork'] = container_network
    
    # 添加 vppInterfaces
    if 'vppInterfaces' not in data[lang]:
        data[lang]['vppInterfaces'] = vpp_interfaces
    
    # 添加 vppAcl
    if 'vppAcl' not in data[lang]:
        data[lang]['vppAcl'] = vpp_acl
    
    # 添加 https
    if 'https' not in data[lang]:
        data[lang]['https'] = https
    
    # 添加 igmpProxy
    if 'igmpProxy' not in data[lang]:
        data[lang]['igmpProxy'] = igmp_proxy
    
    # 添加 interfaceStats
    if 'interfaceStats' not in data[lang]:
        data[lang]['interfaceStats'] = interface_stats
    
    # 添加 firewall.tabs 和 firewall.columns
    if 'firewall' not in data[lang]:
        data[lang]['firewall'] = {}
    if 'tabs' not in data[lang]['firewall']:
        data[lang]['firewall']['tabs'] = firewall_tabs
    if 'columns' not in data[lang]['firewall']:
        data[lang]['firewall']['columns'] = firewall_columns

# 写回文件
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("翻译键添加完成！")
print(f"已为 {len(languages)} 种语言添加以下翻译键：")
print("- dhcpStaticMappings")
print("- dhcpv6StaticMappings")
print("- containerNetwork")
print("- vppInterfaces")
print("- vppAcl")
print("- https")
print("- igmpProxy")
print("- interfaceStats")
print("- firewall.tabs")
print("- firewall.columns")
