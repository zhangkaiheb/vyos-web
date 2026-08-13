#!/usr/bin/env python3
import json

# 读取现有的 common.json
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 定义 PptpPage 需要的翻译键
translations = {
    "zh-CN": {
        "pptp": {
            "columns": {
                "name": "名称",
                "nextPool": "下一池",
                "range": "范围",
                "prefix": "前缀",
                "delegate": "委托前缀",
                "username": "用户名",
                "staticIp": "静态 IP",
                "staticIp6": "静态 IPv6",
                "subnet": "子网",
                "address": "地址",
                "port": "端口",
                "disable": "禁用",
                "disableAccounting": "禁用计费"
            },
            "validation": {
                "selectIpPoolFirst": "请先选择一个 IP 池",
                "ipPoolNotFound": "未找到 IP 池",
                "selectIpv6PoolFirst": "请先选择一个 IPv6 池",
                "ipv6PoolNotFound": "未找到 IPv6 池",
                "selectUserFirst": "请先选择一个用户",
                "userNotFound": "未找到用户",
                "selectServerFirst": "请先选择一个服务器",
                "serverNotFound": "未找到服务器",
                "mtuRange": "MTU 范围为 68-1500",
                "ipv4PoolError": "IPv4 池",
                "ipv6PoolError": "IPv6 池"
            },
            "tabs": {
                "basic": "基本",
                "pools": "地址池",
                "auth": "认证",
                "dns": "DNS/WINS",
                "advanced": "高级"
            },
            "form": {
                "description": "描述",
                "gatewayAddress": "网关地址",
                "outsideAddress": "外部地址",
                "mtu": "MTU",
                "maxConcurrentSessions": "最大并发会话数",
                "defaultPool": "默认池",
                "defaultIpv6Pool": "默认 IPv6 池",
                "nameServers": "名称服务器",
                "winsServers": "WINS 服务器",
                "authMode": "认证模式",
                "authProtocols": "认证协议",
                "nasIdentifier": "NAS 标识符",
                "timeout": "超时",
                "shaper": "整形器",
                "log": "日志",
                "snmp": "SNMP",
                "onUp": "上线脚本",
                "onDown": "下线脚本",
                "onChange": "变更脚本",
                "burst": "突发",
                "rate": "速率",
                "ccp": "CCP",
                "mppe": "MPPE"
            },
            "buttons": {
                "manageIpPools": "管理 IPv4 池",
                "manageIpv6Pools": "管理 IPv6 池",
                "manageUsers": "管理用户",
                "manageServers": "管理服务器",
                "addIpPool": "添加 IPv4 池",
                "addIpv6Pool": "添加 IPv6 池",
                "addUser": "添加用户",
                "addServer": "添加服务器",
                "editIpPool": "编辑 IPv4 池",
                "editIpv6Pool": "编辑 IPv6 池",
                "editUser": "编辑用户",
                "editServer": "编辑服务器"
            },
            "modal": {
                "ipPoolConfig": "IP 池配置",
                "ipv6PoolConfig": "IPv6 池配置",
                "userConfig": "用户配置",
                "serverConfig": "服务器配置"
            }
        }
    },
    "en": {
        "pptp": {
            "columns": {
                "name": "Name",
                "nextPool": "Next Pool",
                "range": "Range",
                "prefix": "Prefix",
                "delegate": "Delegate Prefix",
                "username": "Username",
                "staticIp": "Static IP",
                "staticIp6": "Static IPv6",
                "subnet": "Subnet",
                "address": "Address",
                "port": "Port",
                "disable": "Disable",
                "disableAccounting": "Disable Accounting"
            },
            "validation": {
                "selectIpPoolFirst": "Please select an IP pool first",
                "ipPoolNotFound": "IP pool not found",
                "selectIpv6PoolFirst": "Please select an IPv6 pool first",
                "ipv6PoolNotFound": "IPv6 pool not found",
                "selectUserFirst": "Please select a user first",
                "userNotFound": "User not found",
                "selectServerFirst": "Please select a server first",
                "serverNotFound": "Server not found",
                "mtuRange": "MTU range is 68-1500",
                "ipv4PoolError": "IPv4 Pool",
                "ipv6PoolError": "IPv6 Pool"
            },
            "tabs": {
                "basic": "Basic",
                "pools": "Pools",
                "auth": "Authentication",
                "dns": "DNS/WINS",
                "advanced": "Advanced"
            },
            "form": {
                "description": "Description",
                "gatewayAddress": "Gateway Address",
                "outsideAddress": "Outside Address",
                "mtu": "MTU",
                "maxConcurrentSessions": "Max Concurrent Sessions",
                "defaultPool": "Default Pool",
                "defaultIpv6Pool": "Default IPv6 Pool",
                "nameServers": "Name Servers",
                "winsServers": "WINS Servers",
                "authMode": "Authentication Mode",
                "authProtocols": "Authentication Protocols",
                "nasIdentifier": "NAS Identifier",
                "timeout": "Timeout",
                "shaper": "Shaper",
                "log": "Log",
                "snmp": "SNMP",
                "onUp": "On Up Script",
                "onDown": "On Down Script",
                "onChange": "On Change Script",
                "burst": "Burst",
                "rate": "Rate",
                "ccp": "CCP",
                "mppe": "MPPE"
            },
            "buttons": {
                "manageIpPools": "Manage IPv4 Pools",
                "manageIpv6Pools": "Manage IPv6 Pools",
                "manageUsers": "Manage Users",
                "manageServers": "Manage Servers",
                "addIpPool": "Add IPv4 Pool",
                "addIpv6Pool": "Add IPv6 Pool",
                "addUser": "Add User",
                "addServer": "Add Server",
                "editIpPool": "Edit IPv4 Pool",
                "editIpv6Pool": "Edit IPv6 Pool",
                "editUser": "Edit User",
                "editServer": "Edit Server"
            },
            "modal": {
                "ipPoolConfig": "IP Pool Configuration",
                "ipv6PoolConfig": "IPv6 Pool Configuration",
                "userConfig": "User Configuration",
                "serverConfig": "Server Configuration"
            }
        }
    }
}

# 为每种语言添加翻译
for lang in ["zh-CN", "en"]:
    if lang in data:
        data[lang]["pptp"] = translations[lang]["pptp"]

# 保存回文件
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✓ PPTP translations added successfully")
