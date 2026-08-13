#!/usr/bin/env python3
"""
HTML翻译脚本：将英文HTML文档翻译成中文
保留HTML结构、标签、属性、CSS样式和代码块
"""

import os
import re
from html.parser import HTMLParser
from html.entities import html5

# 翻译字典 - 常见术语和短语
TRANSLATIONS = {
    # 通用术语
    "Server": "服务器",
    "Client": "客户端",
    "Configuration": "配置",
    "Monitoring": "监控",
    "Troubleshooting": "故障排除",
    "Advanced Options": "高级选项",
    "Authentication": "认证",
    "Certificate": "证书",
    "Certificates": "证书",
    "Example": "示例",
    "Operation": "操作",
    "Overview": "概述",
    
    # VPN相关
    "SSTP Server": "SSTP服务器",
    "PPTP-Server": "PPTP服务器",
    "L2TP": "L2TP",
    "Configuring SSTP Server": "配置SSTP服务器",
    "Configuring PPTP Server": "配置PPTP服务器",
    "Configuring L2TP Server": "配置L2TP服务器",
    "Configuring RADIUS authentication": "配置RADIUS认证",
    "Configuring IPsec": "配置IPsec",
    
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
    
    # VRF相关
    "VRF": "VRF",
    "L3VPN VRFs": "L3VPN VRF",
    "VRF Route Leaking": "VRF路由泄漏",
    
    # 接口相关
    "Interfaces": "接口",
    "Routing": "路由",
    "Services": "服务",
    
    # 通用短语
    "Set authentication backend": "设置认证后端",
    "Create": "创建",
    "for local authentication on this system": "用于本系统的本地认证",
    "The users password will be set to": "用户密码将设置为",
    "Use this command to define": "使用此命令定义",
    "Specifies single": "指定单个",
    "IP address to be used as local address of PPP interfaces": "IP地址用作PPP接口的本地地址",
    "Name of installed certificate authority certificate": "已安装的证书颁发机构证书名称",
    "Name of installed server certificate": "已安装的服务器证书名称",
    
    # 列表项
    "All authentication queries are handled by a configured RADIUS server": "所有认证查询由配置的RADIUS服务器处理",
    "All authentication queries are handled locally": "所有认证查询在本地处理",
    "Authentication disabled": "认证已禁用",
    
    # 注意事项
    "Note": "注意",
    "Warning": "警告",
    "Hint": "提示",
    
    # 表格标题
    "Facility code": "设施代码",
    "Keyword": "关键字",
    "Description": "描述",
    "Value": "值",
    "Severity": "严重性",
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
                        stripped.startswith('run ') or stripped.startswith('show ')):
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
        
    def handle_starttag(self, tag, attrs):
        """处理开始标签"""
        self.tag_stack.append(tag)
        
        # 检查是否在代码块中
        if tag in ['pre', 'code']:
            self.in_code_block = True
        if tag == 'pre':
            self.in_pre = True
            
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
            
        self.result.append(f'</{tag}>')
        
    def handle_data(self, data):
        """处理文本数据"""
        # 如果在代码块中，不翻译
        if self.in_code_block or self.in_pre:
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
    for filename in html_files:
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        print(f"Translating: {filename}")
        if translate_html_file(input_path, output_path):
            success_count += 1
    
    print(f"\nTranslation complete: {success_count}/{len(html_files)} files translated successfully")


if __name__ == '__main__':
    main()
