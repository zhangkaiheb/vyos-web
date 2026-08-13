#!/usr/bin/env python3
"""
完整的HTML翻译脚本：将英文HTML文档翻译成中文
使用全面的翻译字典，翻译所有文本内容
"""

import os
import re
from html.parser import HTMLParser

# 全面的翻译字典
TRANSLATIONS = {
    # 通用标题和术语
    "Server": "服务器",
    "Client": "客户端",
    "Configuration": "配置",
    "Configuring": "配置",
    "Monitoring": "监控",
    "Troubleshooting": "故障排除",
    "Advanced Options": "高级选项",
    "Authentication": "认证",
    "Certificate": "证书",
    "Certificates": "证书",
    "Example": "示例",
    "Examples": "示例",
    "Operation": "操作",
    "Overview": "概述",
    "Scripting": "脚本",
    
    # VPN相关
    "SSTP Server": "SSTP服务器",
    "PPTP-Server": "PPTP服务器",
    "L2TP": "L2TP",
    "Configuring SSTP Server": "配置SSTP服务器",
    "Configuring PPTP Server": "配置PPTP服务器",
    "Configuring L2TP Server": "配置L2TP服务器",
    "Configuring RADIUS authentication": "配置RADIUS认证",
    "Configuring IPsec": "配置IPsec",
    "Configuring SSTP client": "配置SSTP客户端",
    "Configuring LNS (L2TP Network Server)": "配置LNS（L2TP网络服务器）",
    
    # 系统相关
    "Syslog": "系统日志",
    "Syslog configuration": "系统日志配置",
    "Syslog facilities": "系统日志设施",
    "Severity levels": "严重性级别",
    "Display logs": "显示日志",
    "Global settings": "全局设置",
    "Local logging": "本地日志",
    "Console logging": "控制台日志",
    "Remote logging": "远程日志",
    "TLS-encrypted remote logging": "TLS加密远程日志",
    "Security recommendations": "安全建议",
    
    # VRF相关
    "VRF": "VRF",
    "L3VPN VRFs": "L3VPN VRF",
    "VRF Route Leaking": "VRF路由泄漏",
    "VRF and NAT": "VRF和NAT",
    "VRF default routing table": "VRF默认路由表",
    "VRF red routing table": "VRF red路由表",
    "VRF blue routing table": "VRF blue路由表",
    
    # 接口相关
    "Interfaces": "接口",
    "Routing": "路由",
    "Services": "服务",
    "Nexthop Tracking": "下一跳跟踪",
    "Zebra/Kernel route filtering": "Zebra/内核路由过滤",
    
    # RADIUS相关
    "RADIUS source address": "RADIUS源地址",
    "RADIUS advanced options": "RADIUS高级选项",
    "Allocation clients ip addresses by RADIUS": "通过RADIUS分配客户端IP地址",
    "Renaming clients interfaces by RADIUS": "通过RADIUS重命名客户端接口",
    
    # IPv6相关
    "IPv6": "IPv6",
    "IPv6 Advanced Options": "IPv6高级选项",
    
    # 认证相关
    "Authentication Advanced Options": "认证高级选项",
    "Client IP Pool Advanced Options": "客户端IP池高级选项",
    "PPP Advanced Options": "PPP高级选项",
    "Global Advanced options": "全局高级选项",
    
    # 通用短语和句子
    "Set authentication backend": "设置认证后端",
    "The configured authentication backend is used for all queries": "配置的认证后端用于所有查询",
    "All authentication queries are handled by a configured RADIUS server": "所有认证查询由配置的RADIUS服务器处理",
    "All authentication queries are handled locally": "所有认证查询在本地处理",
    "Authentication disabled": "认证已禁用",
    "Create": "创建",
    "for local authentication on this system": "用于本系统的本地认证",
    "The users password will be set to": "用户密码将设置为",
    "Use this command to define": "使用此命令定义",
    "Specifies single": "指定单个",
    "IP address to be used as local address of PPP interfaces": "IP地址用作PPP接口的本地地址",
    "Name of installed certificate authority certificate": "已安装的证书颁发机构证书名称",
    "Name of installed server certificate": "已安装的服务器证书名称",
    
    # 描述性文本
    "is a form of": "是一种",
    "tunnel that provides a mechanism to transport PPP traffic through an SSL/TLS channel": "隧道，提供通过SSL/TLS通道传输PPP流量的机制",
    "SSL/TLS provides transport-level security with key negotiation, encryption and traffic integrity checking": "SSL/TLS提供传输级安全，包括密钥协商、加密和流量完整性检查",
    "The use of SSL/TLS over TCP port 443 allows SSTP to pass through virtually all firewalls and proxy servers except for authenticated web proxies": "在TCP端口443上使用SSL/TLS允许SSTP通过几乎所有防火墙和代理服务器，除了经过身份验证的Web代理",
    "SSTP is available for Linux, BSD, and Windows": "SSTP适用于Linux、BSD和Windows",
    "VyOS utilizes": "VyOS利用",
    "to provide SSTP server functionality": "提供SSTP服务器功能",
    "We support both local and RADIUS authentication": "我们支持本地和RADIUS认证",
    "As SSTP provides PPP via a SSL/TLS channel the use of either publicly signed certificates or private PKI is required": "由于SSTP通过SSL/TLS通道提供PPP，因此需要使用公共签名证书或私有PKI",
    
    # 证书相关
    "Using our documentation chapter": "使用我们的文档章节",
    "generate and install CA and Server certificate": "生成并安装CA和服务器证书",
    
    # 配置说明
    "Set mode for IPsec authentication between VyOS and L2TP clients": "设置VyOS和L2TP客户端之间IPsec认证的模式",
    "Set predefined shared secret phrase": "设置预定义共享密钥短语",
    "If a local firewall policy is in place on your external interface you will need to allow the ports below": "如果外部接口上存在本地防火墙策略，则需要允许以下端口",
    "As well as the below to allow NAT-traversal (when NAT is detected by the VPN client, ESP is encapsulated in UDP for NAT-traversal)": "以及以下允许NAT遍历的设置（当VPN客户端检测到NAT时，ESP封装在UDP中用于NAT遍历）",
    "To allow VPN-clients access via your external address, a NAT rule is required": "要允许VPN客户端通过外部地址访问，需要NAT规则",
    
    # 列表项
    "Global settings": "全局设置",
    "Local logging": "本地日志",
    "Console logging": "控制台日志",
    "Remote logging": "远程日志",
    "TLS-encrypted remote logging": "TLS加密远程日志",
    
    # 注意事项
    "Note": "注意",
    "Warning": "警告",
    "Hint": "提示",
    "Important": "重要",
    
    # 表格标题
    "Facility code": "设施代码",
    "Keyword": "关键字",
    "Description": "描述",
    "Value": "值",
    "Severity": "严重性",
    
    # 协议和设施描述
    "All facilities": "所有设施",
    "Kernel messages": "内核消息",
    "User-level messages": "用户级消息",
    "Mail system": "邮件系统",
    "System daemons": "系统守护进程",
    "Security/authentication messages": "安全/认证消息",
    "Messages generated internally by syslog": "系统日志内部生成的消息",
    "Line printer subsystem": "行式打印机子系统",
    "Network news subsystem": "网络新闻子系统",
    "UUCP subsystem": "UUCP子系统",
    "Clock daemon": "时钟守护进程",
    "FTP daemon": "FTP守护进程",
    "NTP subsystem": "NTP子系统",
    "Log audit": "日志审计",
    "Log alert": "日志警报",
    "local use": "本地使用",
    
    # 严重性级别描述
    "Log everything": "记录所有内容",
    "Emergency": "紧急",
    "System is unusable - a panic condition": "系统不可用 - 恐慌状态",
    "Alert": "警报",
    "Action must be taken immediately": "必须立即采取行动",
    "Critical": "严重",
    "Critical conditions": "严重情况",
    "Error": "错误",
    "Error conditions": "错误情况",
    "Warning conditions": "警告情况",
    "Notice": "通知",
    "Normal but significant conditions": "正常但重要的情况",
    "Informational": "信息",
    "Informational messages": "信息性消息",
    "Debug": "调试",
    "Debug-level messages": "调试级别消息",
    
    # 通用动词和短语
    "Configure": "配置",
    "Enable": "启用",
    "Disable": "禁用",
    "Specifies": "指定",
    "Defines": "定义",
    "Sets": "设置",
    "Creates": "创建",
    "Deletes": "删除",
    "Displays": "显示",
    "Shows": "显示",
    "Lists": "列出",
    "Allows": "允许",
    "Denies": "拒绝",
    "Requires": "需要",
    "Optional": "可选",
    "Required": "必需",
    "Default": "默认",
    "default": "默认",
    
    # 网络和接口
    "interface": "接口",
    "address": "地址",
    "protocol": "协议",
    "port": "端口",
    "network": "网络",
    "subnet": "子网",
    "gateway": "网关",
    "route": "路由",
    "routing": "路由",
    "firewall": "防火墙",
    "NAT": "NAT",
    "VPN": "VPN",
    "tunnel": "隧道",
    "connection": "连接",
    "session": "会话",
    "bandwidth": "带宽",
    "throughput": "吞吐量",
    
    # 安全相关
    "encryption": "加密",
    "authentication": "认证",
    "authorization": "授权",
    "certificate": "证书",
    "key": "密钥",
    "password": "密码",
    "secret": "密钥",
    "secure": "安全",
    "insecure": "不安全",
    "vulnerable": "易受攻击",
    
    # 系统和日志
    "system": "系统",
    "log": "日志",
    "logging": "日志记录",
    "message": "消息",
    "event": "事件",
    "error": "错误",
    "warning": "警告",
    "info": "信息",
    "debug": "调试",
    
    # 时间和日期
    "timeout": "超时",
    "interval": "间隔",
    "duration": "持续时间",
    "time": "时间",
    "date": "日期",
    "timestamp": "时间戳",
    
    # 状态和条件
    "active": "活动",
    "inactive": "非活动",
    "enabled": "已启用",
    "disabled": "已禁用",
    "connected": "已连接",
    "disconnected": "已断开",
    "up": " up",
    "down": "down",
    "running": "运行中",
    "stopped": "已停止",
    
    # 文件和路径
    "file": "文件",
    "directory": "目录",
    "path": "路径",
    "location": "位置",
    
    # 用户和权限
    "user": "用户",
    "username": "用户名",
    "group": "组",
    "permission": "权限",
    "access": "访问",
    "role": "角色",
    
    # 性能和监控
    "performance": "性能",
    "statistics": "统计",
    "metrics": "指标",
    "counter": "计数器",
    "rate": "速率",
    "limit": "限制",
    "threshold": "阈值",
    
    # 错误处理
    "failure": "失败",
    "success": "成功",
    "retry": "重试",
    "recover": "恢复",
    "restore": "恢复",
    
    # 常见短语
    "This command": "此命令",
    "This option": "此选项",
    "This feature": "此功能",
    "This setting": "此设置",
    "The following": "以下",
    "For example": "例如",
    "In addition": "此外",
    "However": "但是",
    "Therefore": "因此",
    "Otherwise": "否则",
    "If configured": "如果配置",
    "If enabled": "如果启用",
    "If disabled": "如果禁用",
    "By default": "默认情况下",
    "When enabled": "启用时",
    "When disabled": "禁用时",
    
    # 操作说明
    "Use this command": "使用此命令",
    "To configure": "要配置",
    "To enable": "要启用",
    "To disable": "要禁用",
    "To create": "要创建",
    "To delete": "要删除",
    "To display": "要显示",
    "To view": "要查看",
    "To check": "要检查",
    "To verify": "要验证",
    "To test": "要测试",
    
    # 条件和结果
    "will be": "将",
    "can be": "可以",
    "must be": "必须",
    "should be": "应该",
    "may be": "可能",
    "is used": "用于",
    "are used": "用于",
    "is required": "是必需的",
    "are required": "是必需的",
    "is optional": "是可选的",
    "are optional": "是可选的",
    
    # 数量和范围
    "maximum": "最大",
    "minimum": "最小",
    "range": "范围",
    "number": "数量",
    "count": "计数",
    "total": "总计",
    "average": "平均",
    
    # 方向和位置
    "source": "源",
    "destination": "目的",
    "inbound": "入站",
    "outbound": "出站",
    "incoming": "传入",
    "outgoing": "传出",
    "local": "本地",
    "remote": "远程",
    "internal": "内部",
    "external": "外部",
    
    # 动作和状态
    "start": "启动",
    "stop": "停止",
    "restart": "重启",
    "reload": "重新加载",
    "reset": "重置",
    "clear": "清除",
    "add": "添加",
    "remove": "移除",
    "update": "更新",
    "modify": "修改",
    "change": "更改",
    "set": "设置",
    "get": "获取",
    "show": "显示",
    "display": "显示",
    "list": "列出",
    "create": "创建",
    "delete": "删除",
    "edit": "编辑",
    "save": "保存",
    "load": "加载",
    "import": "导入",
    "export": "导出",
    "backup": "备份",
    "restore": "恢复",
    
    # 连接和通信
    "connect": "连接",
    "disconnect": "断开连接",
    "send": "发送",
    "receive": "接收",
    "transmit": "传输",
    "forward": "转发",
    "route": "路由",
    "bridge": "桥接",
    "tunnel": "隧道",
    "encapsulate": "封装",
    "decapsulate": "解封装",
    
    # 安全和加密
    "encrypt": "加密",
    "decrypt": "解密",
    "sign": "签名",
    "verify": "验证",
    "authenticate": "认证",
    "authorize": "授权",
    "validate": "验证",
    "check": "检查",
    "test": "测试",
    "scan": "扫描",
    "detect": "检测",
    "prevent": "防止",
    "block": "阻止",
    "allow": "允许",
    "deny": "拒绝",
    "accept": "接受",
    "reject": "拒绝",
    
    # 网络和协议
    "TCP": "TCP",
    "UDP": "UDP",
    "HTTP": "HTTP",
    "HTTPS": "HTTPS",
    "SSH": "SSH",
    "SSL": "SSL",
    "TLS": "TLS",
    "IP": "IP",
    "IPv4": "IPv4",
    "IPv6": "IPv6",
    "DNS": "DNS",
    "DHCP": "DHCP",
    "NTP": "NTP",
    "SNMP": "SNMP",
    "SMTP": "SMTP",
    "POP3": "POP3",
    "IMAP": "IMAP",
    "FTP": "FTP",
    "SFTP": "SFTP",
    "TFTP": "TFTP",
    
    # 接口类型
    "ethernet": "以太网",
    "wireless": "无线",
    "bridge": "桥接",
    "bonding": "绑定",
    "vlan": "VLAN",
    "tunnel": "隧道",
    "loopback": "环回",
    "virtual": "虚拟",
    "physical": "物理",
    "logical": "逻辑",
    
    # 路由协议
    "BGP": "BGP",
    "OSPF": "OSPF",
    "RIP": "RIP",
    "IS-IS": "IS-IS",
    "EIGRP": "EIGRP",
    "static": "静态",
    "dynamic": "动态",
    "default": "默认",
    
    # VPN类型
    "IPsec": "IPsec",
    "L2TP": "L2TP",
    "PPTP": "PPTP",
    "SSTP": "SSTP",
    "OpenVPN": "OpenVPN",
    "WireGuard": "WireGuard",
    "IKE": "IKE",
    "ESP": "ESP",
    "AH": "AH",
    
    # 防火墙和NAT
    "firewall": "防火墙",
    "NAT": "NAT",
    "SNAT": "SNAT",
    "DNAT": "DNAT",
    "masquerade": "伪装",
    "port forwarding": "端口转发",
    "access list": "访问列表",
    "access control": "访问控制",
    "rule": "规则",
    "policy": "策略",
    "zone": "区域",
    
    # 服务和守护进程
    "service": "服务",
    "daemon": "守护进程",
    "process": "进程",
    "task": "任务",
    "job": "作业",
    "cron": "cron",
    "scheduler": "调度器",
    
    # 存储和文件
    "file": "文件",
    "directory": "目录",
    "folder": "文件夹",
    "path": "路径",
    "location": "位置",
    "storage": "存储",
    "disk": "磁盘",
    "memory": "内存",
    "cache": "缓存",
    "buffer": "缓冲区",
    
    # 用户和权限
    "user": "用户",
    "group": "组",
    "role": "角色",
    "permission": "权限",
    "access": "访问",
    "privilege": "特权",
    "authentication": "认证",
    "authorization": "授权",
    "account": "账户",
    "password": "密码",
    "credential": "凭据",
    
    # 日志和监控
    "log": "日志",
    "logging": "日志记录",
    "syslog": "系统日志",
    "message": "消息",
    "event": "事件",
    "alert": "警报",
    "notification": "通知",
    "monitor": "监控",
    "monitoring": "监控",
    "statistics": "统计",
    "metrics": "指标",
    "counter": "计数器",
    "gauge": "仪表",
    "timer": "计时器",
    
    # 性能和优化
    "performance": "性能",
    "throughput": "吞吐量",
    "latency": "延迟",
    "delay": "延迟",
    "jitter": "抖动",
    "bandwidth": "带宽",
    "rate": "速率",
    "speed": "速度",
    "efficiency": "效率",
    "optimization": "优化",
    "tuning": "调优",
    
    # 错误和故障排除
    "error": "错误",
    "fault": "故障",
    "failure": "失败",
    "issue": "问题",
    "problem": "问题",
    "bug": "错误",
    "defect": "缺陷",
    "troubleshooting": "故障排除",
    "diagnostic": "诊断",
    "debug": "调试",
    "trace": "跟踪",
    "dump": "转储",
    "core": "核心",
    
    # 配置和管理
    "configuration": "配置",
    "setting": "设置",
    "option": "选项",
    "parameter": "参数",
    "value": "值",
    "property": "属性",
    "attribute": "属性",
    "feature": "功能",
    "function": "功能",
    "capability": "能力",
    "management": "管理",
    "administration": "管理",
    "operation": "操作",
    "maintenance": "维护",
    
    # 网络和通信
    "network": "网络",
    "connection": "连接",
    "session": "会话",
    "channel": "通道",
    "link": "链路",
    "path": "路径",
    "route": "路由",
    "circuit": "电路",
    "socket": "套接字",
    "endpoint": "端点",
    "node": "节点",
    "host": "主机",
    "server": "服务器",
    "client": "客户端",
    "peer": "对等体",
    "neighbor": "邻居",
    
    # 数据和流量
    "data": "数据",
    "traffic": "流量",
    "packet": "数据包",
    "frame": "帧",
    "segment": "段",
    "datagram": "数据报",
    "message": "消息",
    "request": "请求",
    "response": "响应",
    "reply": "回复",
    "acknowledgment": "确认",
    
    # 安全和加密
    "security": "安全",
    "encryption": "加密",
    "decryption": "解密",
    "cipher": "密码",
    "algorithm": "算法",
    "hash": "哈希",
    "digest": "摘要",
    "signature": "签名",
    "certificate": "证书",
    "key": "密钥",
    "token": "令牌",
    "credential": "凭据",
    "secret": "密钥",
    "password": "密码",
    "passphrase": "密码短语",
    
    # 状态和条件
    "state": "状态",
    "status": "状态",
    "condition": "条件",
    "mode": "模式",
    "phase": "阶段",
    "stage": "阶段",
    "step": "步骤",
    "level": "级别",
    "priority": "优先级",
    "severity": "严重性",
    "urgency": "紧急性",
    
    # 时间和调度
    "time": "时间",
    "date": "日期",
    "timestamp": "时间戳",
    "duration": "持续时间",
    "interval": "间隔",
    "period": "周期",
    "frequency": "频率",
    "schedule": "调度",
    "timer": "计时器",
    "timeout": "超时",
    "deadline": "截止时间",
    
    # 数量和测量
    "count": "计数",
    "number": "数量",
    "amount": "数量",
    "quantity": "数量",
    "size": "大小",
    "length": "长度",
    "width": "宽度",
    "height": "高度",
    "depth": "深度",
    "weight": "重量",
    "volume": "体积",
    "capacity": "容量",
    "limit": "限制",
    "threshold": "阈值",
    "maximum": "最大值",
    "minimum": "最小值",
    "average": "平均值",
    "total": "总计",
    "sum": "总和",
    "rate": "速率",
    "ratio": "比率",
    "percentage": "百分比",
    "proportion": "比例",
    
    # 动作和操作
    "action": "动作",
    "operation": "操作",
    "function": "功能",
    "method": "方法",
    "procedure": "过程",
    "process": "过程",
    "task": "任务",
    "job": "作业",
    "work": "工作",
    "activity": "活动",
    "event": "事件",
    "incident": "事件",
    "occurrence": "发生",
    
    # 位置和方向
    "location": "位置",
    "position": "位置",
    "place": "位置",
    "area": "区域",
    "zone": "区域",
    "region": "区域",
    "domain": "域",
    "scope": "范围",
    "range": "范围",
    "extent": "范围",
    "boundary": "边界",
    "border": "边界",
    "edge": "边缘",
    "source": "源",
    "destination": "目的",
    "origin": "起点",
    "target": "目标",
    "direction": "方向",
    "path": "路径",
    "route": "路径",
    "way": "方式",
    
    # 关系和依赖
    "relationship": "关系",
    "dependency": "依赖",
    "association": "关联",
    "connection": "连接",
    "link": "链接",
    "binding": "绑定",
    "mapping": "映射",
    "correlation": "相关",
    "comparison": "比较",
    "contrast": "对比",
    
    # 文档和参考
    "document": "文档",
    "documentation": "文档",
    "manual": "手册",
    "guide": "指南",
    "reference": "参考",
    "specification": "规范",
    "standard": "标准",
    "policy": "策略",
    "procedure": "过程",
    "instruction": "说明",
    "direction": "指示",
    "recommendation": "建议",
    "suggestion": "建议",
    "advice": "建议",
    "tip": "提示",
    "note": "注意",
    "warning": "警告",
    "caution": "警告",
    "important": "重要",
    "notice": "注意",
    "information": "信息",
    "description": "描述",
    "explanation": "解释",
    "definition": "定义",
    "meaning": "含义",
    "interpretation": "解释",
    "understanding": "理解",
    "knowledge": "知识",
    "information": "信息",
    "data": "数据",
    "fact": "事实",
    "detail": "细节",
    "specific": "具体",
    "general": "一般",
    "overview": "概述",
    "summary": "总结",
    "conclusion": "结论",
    "result": "结果",
    "outcome": "结果",
    "effect": "效果",
    "impact": "影响",
    "consequence": "后果",
    "implication": "含义",
}


def translate_text(text):
    """翻译文本内容"""
    if not text or not text.strip():
        return text
    
    # 检查是否包含VyOS命令（以set/delete/run/show开头）
    lines = text.split('\n')
    is_command_block = False
    for line in lines:
        stripped = line.strip()
        if stripped and (stripped.startswith('set ') or stripped.startswith('delete ') or 
                        stripped.startswith('run ') or stripped.startswith('show ') or
                        stripped.startswith('vyos@') or stripped.startswith('#')):
            is_command_block = True
            break
    
    # 如果是命令块，不翻译
    if is_command_block:
        return text
    
    # 检查是否是文件路径或URL
    if text.strip().startswith('/') or text.strip().startswith('http://') or text.strip().startswith('https://'):
        return text
    
    # 应用翻译
    result = text
    
    # 按长度降序排序，优先翻译较长的短语
    sorted_keys = sorted(TRANSLATIONS.keys(), key=len, reverse=True)
    
    for key in sorted_keys:
        if key in result:
            result = result.replace(key, TRANSLATIONS[key])
    
    return result


class HTMLTranslator(HTMLParser):
    """HTML解析器，用于翻译HTML内容"""
    
    def __init__(self):
        super().__init__()
        self.result = []
        self.current_tag = None
        self.tag_stack = []
        self.skip_translation = False
        self.in_code_block = False
        self.in_pre = False
        self.in_style = False
        self.in_script = False
        
    def handle_starttag(self, tag, attrs):
        """处理开始标签"""
        self.tag_stack.append(tag)
        
        # 检查是否在代码块或样式/脚本中
        if tag in ['pre', 'code']:
            self.in_code_block = True
        if tag == 'pre':
            self.in_pre = True
        if tag == 'style':
            self.in_style = True
        if tag == 'script':
            self.in_script = True
            
        # 构建标签
        attr_str = ''
        for name, value in attrs:
            if name == 'lang' and value == 'en':
                attr_str += f' {name}="zh"'
            elif value is None:
                attr_str += f' {name}'
            else:
                attr_str += f' {name}="{value}"'
        
        self.result.append(f'<{tag}{attr_str}>')
        
    def handle_endtag(self, tag):
        """处理结束标签"""
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
            
        if tag in ['pre', 'code']:
            self.in_code_block = False
        if tag == 'pre':
            self.in_pre = False
        if tag == 'style':
            self.in_style = False
        if tag == 'script':
            self.in_script = False
            
        self.result.append(f'</{tag}>')
        
    def handle_data(self, data):
        """处理文本数据"""
        # 如果在代码块、样式或脚本中，不翻译
        if self.in_code_block or self.in_pre or self.in_style or self.in_script:
            self.result.append(data)
        else:
            # 翻译文本
            translated = translate_text(data)
            self.result.append(translated)
            
    def handle_entityref(self, name):
        """处理实体引用"""
        self.result.append(f'&{name};')
        
    def handle_charref(self, name):
        """处理字符引用"""
        self.result.append(f'&#{name};')
        
    def handle_comment(self, data):
        """处理注释"""
        self.result.append(f'<!--{data}-->')
        
    def handle_decl(self, decl):
        """处理声明"""
        self.result.append(f'<!{decl}>')
        
    def handle_pi(self, data):
        """处理处理指令"""
        self.result.append(f'<?{data}>')
        
    def get_result(self):
        """获取翻译后的HTML"""
        return ''.join(self.result)


def translate_html_file(input_path, output_path):
    """翻译单个HTML文件"""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 使用正则表达式替换lang属性
        html_content = re.sub(r'lang="en"', 'lang="zh"', html_content)
        html_content = re.sub(r"lang='en'", "lang='zh'", html_content)
        
        # 解析和翻译HTML
        parser = HTMLTranslator()
        parser.feed(html_content)
        translated_content = parser.get_result()
        
        # 写入输出文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(translated_content)
            
        return True
    except Exception as e:
        print(f"Error translating {input_path}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主函数"""
    input_dir = '/opt/vyos-web-config/docs/en'
    output_dir = '/opt/vyos-web-config/docs/zh'
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取所有HTML文件
    html_files = [f for f in os.listdir(input_dir) if f.endswith('.html')]
    
    print(f"Found {len(html_files)} HTML files to translate")
    
    success_count = 0
    for filename in sorted(html_files):
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        print(f"Translating: {filename}")
        if translate_html_file(input_path, output_path):
            success_count += 1
    
    print(f"\nTranslation complete: {success_count}/{len(html_files)} files translated successfully")


if __name__ == '__main__':
    main()
