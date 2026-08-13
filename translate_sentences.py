#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
from html.parser import HTMLParser

# 完整翻译字典 - 包含常见短语和句子
TRANSLATIONS = {
    # 标题和章节
    "Container": "容器",
    "Configuration": "配置",
    "Certificates": "证书",
    "Firewall": "防火墙",
    "VRF": "VRF",
    "SSTP Server": "SSTP服务器",
    "Configuring SSTP Server": "配置SSTP服务器",
    "Configuring RADIUS authentication": "配置RADIUS认证",
    "RADIUS source address": "RADIUS源地址",
    "RADIUS advanced options": "RADIUS高级选项",
    
    # 完整句子 - Container
    "The VyOS container implementation is based on": "VyOS容器实现基于",
    "as a daemonless container engine.": "作为无守护进程的容器引擎。",
    "Sets the image name in the hub registry": "设置hub注册表中的镜像名称",
    "If a registry is not specified, Docker.io will be used as the container registry unless an alternative registry is specified using": "如果未指定注册表，将使用Docker.io作为容器注册表，除非使用以下命令指定了备用注册表",
    "or the registry is included in the image name": "或者注册表包含在镜像名称中",
    "Override the default entrypoint from the image for a container.": "覆盖容器的镜像默认入口点。",
    "Override the default command from the image for a container.": "覆盖容器的镜像默认命令。",
    "Set the command arguments for a container.": "设置容器的命令参数。",
    "Set the host name for a container.": "设置容器的主机名。",
    "The container and the host share the same process namespace.": "容器和主机共享相同的进程命名空间。",
    "This means that processes running on the host are visible inside the container, and processes inside the container are visible on the host.": "这意味着在主机上运行的进程在容器内可见，容器内的进程在主机上可见。",
    "The command translates to": "该命令转换为",
    "when the container is created.": "当容器创建时。",
    "Allow host networking in a container.": "允许容器中的主机网络。",
    "The network stack of the container is not isolated from the host and will use the host IP.": "容器的网络堆栈不与主机隔离，将使用主机IP。",
    "cannot be used with": "不能与",
    "Attaches user-defined network to a container.": "将用户定义的网络附加到容器。",
    "Only one network must be specified and must already exist.": "必须指定一个网络，且该网络必须已存在。",
    "Optionally set a specific static IPv4 or IPv6 address for the container.": "可选地为容器设置特定的静态IPv4或IPv6地址。",
    "This address must be within the named network prefix.": "此地址必须在指定网络前缀内。",
    "The first IP in the container network is reserved by the engine and cannot be used": "容器网络中的第一个IP由引擎保留，不能使用",
    "Optionally set a custom name server.": "可选地设置自定义名称服务器。",
    "If a container network is used with DNS enabled, this setting will not have any effect.": "如果使用了启用DNS的容器网络，此设置将不起作用。",
    "Set a container description": "设置容器描述",
    "Add custom environment variables.": "添加自定义环境变量。",
    "Multiple environment variables are allowed.": "允许多个环境变量。",
    "The following commands translate to": "以下命令转换为",
    "when the container is created": "当容器创建时",
    "Publish a port for the container.": "为容器发布端口。",
    "Port publishing cannot be used with": "端口发布不能与",
    "For this purpose, a workaround using destination NAT and static IP assignment for the container is available.": "为此，可以使用目标NAT和为容器分配静态IP的解决方法。",
    "Mount a volume into the container": "将卷挂载到容器",
    "Volume is either mounted read-only or read-write.": "卷可以挂载为只读或读写。",
    
    # VRF
    "devices combined with ip rules": "设备与IP规则结合",
    "provides the ability to create virtual routing and forwarding domains": "提供了创建虚拟路由和转发域的能力",
    "(aka VRFs, VRF-lite to be specific) in the Linux network stack.": "（即VRF，具体来说是VRF-lite）在Linux网络堆栈中。",
    "One use case is the multi-tenancy problem where each tenant has their own unique routing tables": "一个用例是多租户问题，每个租户都有自己唯一的路由表",
    "and in the very least need different default gateways.": "并且至少需要不同的默认网关。",
    "A VRF device is created with an associated routing table.": "创建VRF设备时关联一个路由表。",
    "Network interfaces are then enslaved to a VRF device.": "然后将网络接口绑定到VRF设备。",
    "Create a new VRF instance with": "创建新的VRF实例",
    "The name used when placing individual interfaces into the VRF.": "将单个接口放入VRF时使用的名称。",
    "A routing table ID can not be modified once it is assigned.": "路由表ID一旦分配就不能修改。",
    "It can only be changed by deleting and re-adding the VRF instance.": "只能通过删除并重新添加VRF实例来更改。",
    "By default the scope of the port bindings for unbound sockets is restricted to the default VRF.": "默认情况下，未绑定套接字的端口绑定范围限制为默认VRF。",
    "That is, it will not be matched by packets arriving on interfaces enslaved to a VRF": "也就是说，它不会匹配到达绑定到VRF的接口上的数据包",
    "and processes may bind to the same port if they bind to a VRF.": "并且如果进程绑定到VRF，则可以绑定到相同的端口。",
    "TCP & UDP services running in the default VRF context (ie., not bound to any VRF device)": "在默认VRF上下文中运行的TCP和UDP服务（即，未绑定到任何VRF设备）",
    "can work across all VRF domains by enabling this option.": "通过启用此选项可以跨所有VRF域工作。",
    
    # Firewall
    "Due to a boot-time race condition, all interfaces initialize before the firewall.": "由于启动时的竞争条件，所有接口在防火墙之前初始化。",
    "This temporarily leaves the system open to all traffic and poses a security risk.": "这暂时使系统对所有流量开放，并构成安全风险。",
    "VyOS uses Netfilter.": "VyOS使用Netfilter。",
    "The Netfilter project developed": "Netfilter项目开发了",
    "and its successor": "及其后继者",
    "for the Linux kernel to process packet data flows directly.": "用于Linux内核直接处理数据包数据流。",
    "This extends the concept of zone-based security to let you manipulate data": "这扩展了基于区域的安全概念，让您可以操作数据",
    "at multiple stages after the network interface and driver accept it,": "在网络接口和驱动程序接受它之后的多个阶段，",
    "and before sending it to its destination (for example, a web server or another device).": "并在将其发送到目的地之前（例如，Web服务器或其他设备）。",
    "The following is a simplified traffic flow diagram based on Netfilter packet flow.": "以下是基于Netfilter数据包流的简化流量流程图。",
    "This diagram provides an overview of how packets are processed and the possible paths traffic can take.": "此图概述了数据包的处理方式以及流量可以采取的可能路径。",
    "The main points regarding packet flow and terminology in VyOS firewall are:": "关于VyOS防火墙中数据包流和术语的主要要点是：",
    
    # SSTP
    "is a form of": "是一种",
    "that provides a mechanism to transport": "提供了传输机制",
    "through an SSL/TLS channel.": "通过SSL/TLS通道。",
    "SSL/TLS provides transport-level security": "SSL/TLS提供传输级安全性",
    "with key negotiation, encryption and traffic integrity checking.": "具有密钥协商、加密和流量完整性检查。",
    "The use of SSL/TLS over TCP port 443 allows": "在TCP端口443上使用SSL/TLS允许",
    "to pass through virtually all firewalls and proxy servers": "几乎可以通过所有防火墙和代理服务器",
    "except for authenticated web proxies.": "除了认证的Web代理。",
    "is available for Linux, BSD, and Windows.": "适用于Linux、BSD和Windows。",
    "utilizes": "利用",
    "to provide": "提供",
    "server functionality.": "服务器功能。",
    "We support both local and RADIUS authentication.": "我们支持本地和RADIUS认证。",
    "As SSTP provides PPP via a SSL/TLS channel the use of either publicly signed certificates or private PKI is required.": "由于SSTP通过SSL/TLS通道提供PPP，因此需要使用公开签名的证书或私有PKI。",
    
    # 认证相关
    "Set authentication backend.": "设置认证后端。",
    "The configured authentication backend is used for all queries.": "配置的认证后端用于所有查询。",
    "All authentication queries are handled by a configured RADIUS server.": "所有认证查询由配置的RADIUS服务器处理。",
    "All authentication queries are handled locally.": "所有认证查询在本地处理。",
    "for local authentication on this system.": "用于此系统上的本地认证。",
    "The users password will be set to": "用户密码将设置为",
    "Use this command to define the first IP address of a pool of addresses to be given to SSTP clients.": "使用此命令定义要提供给SSTP客户端的地址池的第一个IP地址。",
    "it must be within a /24 subnet.": "它必须在/24子网内。",
    "is used there is possibility to set host/netmask.": "使用则可以设置主机/子网掩码。",
    "Use this command to define default address pool name.": "使用此命令定义默认地址池名称。",
    "IP address to be used as local address of PPP interfaces.": "IP地址用作PPP接口的本地地址。",
    "Name of installed certificate authority certificate.": "已安装的证书颁发机构证书的名称。",
    "Name of installed server certificate.": "已安装的服务器证书的名称。",
    
    # RADIUS
    "To enable RADIUS based authentication, the authentication mode needs to be changed within the configuration.": "要启用基于RADIUS的认证，需要在配置中更改认证模式。",
    "Previous settings like the local users still exist within the configuration, however they are not used if the mode has been changed from local to radius.": "先前的设置（如本地用户）仍然存在于配置中，但如果模式已从本地更改为radius，则不使用它们。",
    "Once changed back to local, it will use all local accounts again.": "一旦改回本地，它将再次使用所有本地帐户。",
    "and its required shared": "及其所需的共享",
    "for communicating with the RADIUS server.": "用于与RADIUS服务器通信。",
    "Since the RADIUS server would be a single point of failure, multiple RADIUS servers can be setup and will be used subsequentially.": "由于RADIUS服务器将是单点故障，因此可以设置多个RADIUS服务器并依次使用。",
    "Some RADIUS severs use an access control list which allows or denies queries,": "某些RADIUS服务器使用允许或拒绝查询的访问控制列表，",
    "make sure to add your VyOS router to the allowed client list.": "确保将VyOS路由器添加到允许的客户端列表。",
    "Source IPv4 address used in all RADIUS server queries.": "所有RADIUS服务器查询中使用的源IPv4地址。",
    "must be configured to that of an interface.": "必须配置为接口的地址。",
    "Best practice would be a loopback or dummy interface.": "最佳实践是环回或虚拟接口。",
    "and its required port for authentication requests.": "及其认证请求所需的端口。",
    "in seconds.": "（以秒为单位）。",
    
    # 通用术语
    "Note": "注意",
    "Warning": "警告",
    "Tip": "提示",
    "Important": "重要",
    "Example": "示例",
    "Examples": "示例",
    "Description": "描述",
    "Parameters": "参数",
    "Options": "选项",
    "Settings": "设置",
    "Values": "值",
    "Default": "默认",
    "Required": "必需",
    "Optional": "可选",
    "Valid": "有效",
    "Invalid": "无效",
    "Success": "成功",
    "Failed": "失败",
    "Active": "活动",
    "Inactive": "非活动",
    "Enabled": "已启用",
    "Disabled": "已禁用",
    "Allow": "允许",
    "Deny": "拒绝",
    "Accept": "接受",
    "Drop": "丢弃",
    "Reject": "拒绝",
    "Log": "日志",
    "Logging": "日志",
    "Debug": "调试",
    "Info": "信息",
    "Error": "错误",
    "Critical": "严重",
    
    # 动词
    "Create": "创建",
    "Delete": "删除",
    "Add": "添加",
    "Remove": "移除",
    "Edit": "编辑",
    "Modify": "修改",
    "Update": "更新",
    "Save": "保存",
    "Load": "加载",
    "Import": "导入",
    "Export": "导出",
    "Backup": "备份",
    "Restore": "恢复",
    "Reset": "重置",
    "Clear": "清除",
    "Show": "显示",
    "Display": "显示",
    "View": "查看",
    "Check": "检查",
    "Verify": "验证",
    "Test": "测试",
    "Validate": "验证",
    "Apply": "应用",
    "Commit": "提交",
    "Rollback": "回滚",
    "Revert": "还原",
    "Compare": "比较",
    "Merge": "合并",
    "Split": "拆分",
    "Join": "加入",
    "Connect": "连接",
    "Disconnect": "断开",
    "Bind": "绑定",
    "Unbind": "解绑",
    "Attach": "附加",
    "Detach": "分离",
    "Mount": "挂载",
    "Unmount": "卸载",
    "Read": "读取",
    "Write": "写入",
    "Execute": "执行",
    "Run": "运行",
    "Install": "安装",
    "Uninstall": "卸载",
    "Upgrade": "升级",
    "Downgrade": "降级",
    
    # 名词
    "Server": "服务器",
    "Client": "客户端",
    "Authentication": "认证",
    "Certificate": "证书",
    "Connection": "连接",
    "Protocol": "协议",
    "Service": "服务",
    "System": "系统",
    "Policy": "策略",
    "Rule": "规则",
    "Address": "地址",
    "Port": "端口",
    "Gateway": "网关",
    "Route": "路由",
    "Routing": "路由",
    "Table": "表",
    "Packet": "数据包",
    "Traffic": "流量",
    "Data": "数据",
    "Process": "进程",
    "Daemon": "守护进程",
    "Host": "主机",
    "Hostname": "主机名",
    "Domain": "域",
    "Zone": "区域",
    "Group": "组",
    "User": "用户",
    "Password": "密码",
    "Key": "密钥",
    "Pool": "池",
    "Range": "范围",
    "Network": "网络",
    "Interface": "接口",
    "Container": "容器",
    "Image": "镜像",
    "Volume": "卷",
    "Environment": "环境",
    "Variable": "变量",
    "Name": "名称",
    "Type": "类型",
    "Mode": "模式",
    "Format": "格式",
    "Size": "大小",
    "Length": "长度",
    "Width": "宽度",
    "Height": "高度",
    "Weight": "权重",
    "Priority": "优先级",
    "Level": "级别",
    "Layer": "层",
    "Stage": "阶段",
    "Phase": "阶段",
    "Step": "步骤",
    "Action": "动作",
    "Event": "事件",
    "Trigger": "触发器",
    "Condition": "条件",
    "Match": "匹配",
    "Filter": "过滤器",
    "Pattern": "模式",
    "Expression": "表达式",
    "Operator": "运算符",
    "Function": "函数",
    "Method": "方法",
    "Property": "属性",
    "Attribute": "属性",
    "Field": "字段",
    "Column": "列",
    "Row": "行",
    "Cell": "单元格",
    "Header": "标题",
    "Footer": "页脚",
    "Title": "标题",
    "Label": "标签",
    "Tag": "标签",
    "Category": "类别",
    "Class": "类",
    "Object": "对象",
    "Item": "项",
    "Entry": "条目",
    "Record": "记录",
    "File": "文件",
    "Directory": "目录",
    "Folder": "文件夹",
    "Path": "路径",
    "Location": "位置",
    "Source": "源",
    "Destination": "目的",
    "Target": "目标",
    "Origin": "源",
    
    # 形容词
    "Default": "默认",
    "Required": "必需",
    "Optional": "可选",
    "Valid": "有效",
    "Invalid": "无效",
    "Success": "成功",
    "Failed": "失败",
    "Active": "活动",
    "Inactive": "非活动",
    "Enabled": "已启用",
    "Disabled": "已禁用",
    "Allow": "允许",
    "Deny": "拒绝",
    "Accept": "接受",
    "Drop": "丢弃",
    "Reject": "拒绝",
    
    # 常用短语
    "is used to": "用于",
    "can be used to": "可以用于",
    "allows you to": "允许您",
    "enables you to": "使您能够",
    "provides the ability to": "提供了",
    "has the ability to": "具有",
    "is able to": "能够",
    "is capable of": "能够",
    "is responsible for": "负责",
    "is designed to": "旨在",
    "is intended to": "旨在",
    "is meant to": "旨在",
    "is required to": "需要",
    "is necessary to": "有必要",
    "is optional to": "可选",
    "is recommended to": "建议",
    "is suggested to": "建议",
    "is preferred to": "优先",
    "is preferred over": "优先于",
    "should be": "应该",
    "must be": "必须",
    "can be": "可以",
    "may be": "可能",
    "will be": "将",
    "would be": "将",
    "could be": "可能",
    "might be": "可能",
    "shall be": "应",
}

class HTMLTranslator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.in_code_block = False
        self.in_pre = False
        self.in_style = False
        self.in_script = False
        self.tag_stack = []
        
    def handle_starttag(self, tag, attrs):
        self.tag_stack.append(tag)
        
        if tag in ['pre', 'code']:
            self.in_code_block = True
        if tag == 'pre':
            self.in_pre = True
        if tag == 'style':
            self.in_style = True
        if tag == 'script':
            self.in_script = True
            
        # Build tag with attributes
        attrs_str = ''
        for name, value in attrs:
            # Replace lang="en" with lang="zh"
            if name == 'lang' and value == 'en':
                value = 'zh'
            if value is None:
                attrs_str += f' {name}'
            else:
                attrs_str += f' {name}="{value}"'
        
        self.result.append(f'<{tag}{attrs_str}>')
        
    def handle_endtag(self, tag):
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
        # Don't translate code blocks, styles, scripts
        if self.in_code_block or self.in_pre or self.in_style or self.in_script:
            self.result.append(data)
            return
            
        # Check if this is a VyOS command block
        lines = data.split('\n')
        is_command_block = False
        for line in lines:
            stripped = line.strip()
            if stripped and (stripped.startswith('set ') or stripped.startswith('delete ') or 
                           stripped.startswith('run ') or stripped.startswith('show ') or
                           stripped.startswith('vyos@') or stripped.startswith('#')):
                is_command_block = True
                break
        
        if is_command_block:
            self.result.append(data)
            return
        
        # Check for file paths or URLs
        if data.strip().startswith('/') or data.strip().startswith('http://') or data.strip().startswith('https://'):
            self.result.append(data)
            return
        
        # Translate using sentence-based approach
        translated = self.translate_text(data)
        self.result.append(translated)
    
    def translate_text(self, text):
        if not text or not text.strip():
            return text
        
        # Apply sentence translations
        result = text
        for eng, zh in sorted(SENTENCE_TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True):
            if eng in result:
                result = result.replace(eng, zh)
        
        return result
    
    def get_result(self):
        return ''.join(self.result)

def translate_html_file(input_path, output_path):
    """Translate a single HTML file"""
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace lang="en" with lang="zh"
    content = re.sub(r'lang="en"', 'lang="zh"', content)
    
    parser = HTMLTranslator()
    parser.feed(content)
    translated_content = parser.get_result()
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(translated_content)
    
    print(f"Translated: {os.path.basename(input_path)}")

def main():
    input_dir = '/opt/vyos-web-config/docs/en'
    output_dir = '/opt/vyos-web-config/docs/zh'
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all HTML files
    html_files = [f for f in os.listdir(input_dir) if f.endswith('.html')]
    
    print(f"Found {len(html_files)} HTML files to translate")
    
    for filename in sorted(html_files):
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        translate_html_file(input_path, output_path)
    
    print(f"\nTranslation complete! Translated {len(html_files)} files.")

if __name__ == '__main__':
    main()
