#!/usr/bin/env python3
import os
import pty
import select
import time
import sys
import re
import struct
import termios
import fcntl

def run_queries(commands):
    master, slave = pty.openpty()
    # 设置终端宽度为 200 列
    winsize = struct.pack('HHHH', 24, 200, 0, 0)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        os.execv('/bin/vbash', ['vbash'])
        os._exit(1)
    os.close(slave)

    def read_chunk(timeout=0.5):
        out = []
        start = time.time()
        while time.time() - start < timeout:
            ready, _, _ = select.select([master], [], [], 0.1)
            if ready:
                try:
                    data = os.read(master, 8192)
                except OSError:
                    break
                if not data:
                    break
                out.append(data.decode('utf-8', errors='replace'))
            else:
                if out:
                    break
        return ''.join(out)

    def read_cmd_output(timeout=8):
        out = []
        start = time.time()
        while time.time() - start < timeout:
            chunk = read_chunk(0.5)
            if not chunk:
                continue
            out.append(chunk)
            if re.search(r'Press\s+RETURN\s+to\s+continue', chunk, re.I) or \
               re.search(r'--More--', chunk) or \
               re.search(r':o\s+next\s+tag', chunk):
                time.sleep(0.5)
                os.write(master, b'\r')
                time.sleep(1.0)
                start = time.time()
                timeout = 15
            elif re.search(r'vyos@vyos#[\s\u001b\[0m]*$', chunk):
                time.sleep(0.3)
                break
        return ''.join(out)

    def send(cmd):
        os.write(master, (cmd + '\r').encode())
        time.sleep(0.15)

    time.sleep(0.5)
    read_cmd_output(2)

    send('configure')
    read_cmd_output(2)

    for cmd in commands:
        cmd = cmd.strip()
        if not cmd:
            continue
        print(f'\n>>> {cmd}', flush=True)
        send(cmd)
        text = read_cmd_output(10)
        text = re.sub(r'\x1b\[[0-9;?]*[A-Za-z]', '', text)
        text = re.sub(r'Press\s+RETURN\s+to\s+continue\s*\n?', '', text, flags=re.I)
        text = re.sub(r'--More--\s*\n?', '', text)
        text = re.sub(r':o\s+next\s+tag\s*\(press\s+RETURN\)\s*\n?', '', text, flags=re.I)
        print(text, end='', flush=True)

    send('exit')
    time.sleep(0.3)
    print(read_cmd_output(2), end='', flush=True)
    os.close(master)
    os.waitpid(pid, 0)


def run_traverse(base_path, max_depth=20):
    """递归遍历命令行树，输出完整的命令路径和取值范围"""
    master, slave = pty.openpty()
    # 设置终端宽度为 200 列
    winsize = struct.pack('HHHH', 24, 200, 0, 0)
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize)
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        os.execv('/bin/vbash', ['vbash'])
        os._exit(1)
    os.close(slave)

    def clean_ansi(text):
        """移除所有 ANSI 转义序列并处理终端控制字符"""
        # 移除 ANSI 转义序列
        text = re.sub(r'\x1b\[[0-9;?]*[A-Za-z]', '', text)
        text = re.sub(r'\x1b\][^\x07]*\x07', '', text)
        text = re.sub(r'\x1b[^[\]()]*.', '', text)
        text = re.sub(r'\x1b\([A-B0-2]', '', text)  # 处理字符集切换
        
        # 先处理回车符 \r（必须在移除控制字符之前）
        # 模拟终端覆盖行为：\r 将光标移到行首，后续字符覆盖该行开头的内容
        def process_cr(line):
            if '\r' not in line:
                return line
            result = []
            pos = 0
            for ch in line:
                if ch == '\r':
                    pos = 0
                else:
                    if pos < len(result):
                        result[pos] = ch
                    else:
                        result.append(ch)
                    pos += 1
            return ''.join(result)
        
        lines = text.split('\n')
        lines = [process_cr(line) for line in lines]
        text = '\n'.join(lines)
        
        # 移除其他控制字符（除了 \n）
        text = re.sub(r'[\x00-\x08\x0b-\x1f]', '', text)
        
        return text

    def read_until_prompt(timeout=10):
        """读取直到命令提示符出现，处理分页"""
        out = []
        start = time.time()
        last_data_time = time.time()
        
        while time.time() - start < timeout:
            ready, _, _ = select.select([master], [], [], 0.1)
            if ready:
                try:
                    data = os.read(master, 16384)
                    if data:
                        text = data.decode('utf-8', errors='replace')
                        out.append(text)
                        last_data_time = time.time()
                        
                        # 处理分页提示
                        if 'Press RETURN to continue' in text or '--More--' in text:
                            os.write(master, b' ')
                            time.sleep(0.1)
                            continue
                        
                        # 检查是否到达提示符（先清理 ANSI 代码）
                        full_text = clean_ansi(''.join(out))
                        # 匹配 vyos@vyos# 或 vyos@vyos$ 结尾，前面可能有 [edit]
                        if re.search(r'vyos@vyos[#\$]\s*$', full_text):
                            # 再等一小段时间确保输出完整
                            time.sleep(0.1)
                            ready2, _, _ = select.select([master], [], [], 0.05)
                            if ready2:
                                try:
                                    more = os.read(master, 8192)
                                    if more:
                                        out.append(more.decode('utf-8', errors='replace'))
                                except:
                                    pass
                            break
                except OSError:
                    break
            else:
                # 如果超过 3 秒没有新数据，也退出
                if time.time() - last_data_time > 3:
                    break
        
        return clean_ansi(''.join(out))

    def send(cmd):
        # Send Ctrl+U to clear the line first, then send the command
        os.write(master, b'\x15')  # Ctrl+U clears from cursor to beginning of line
        time.sleep(0.1)
        os.write(master, (cmd + '\r').encode())
        time.sleep(0.2)

    def clean_output(text):
        """清理输出，移除分页提示"""
        text = re.sub(r'Press\s+RETURN\s+to\s+continue\s*\n?', '', text, flags=re.I)
        text = re.sub(r'--More--\s*\n?', '', text)
        text = re.sub(r':o\s+next\s+tag\s*\(press\s+RETURN\)\s*\n?', '', text, flags=re.I)
        return text

    def query_completions(path):
        """查询指定路径的补全选项"""
        if path:
            cmd = f'set {path} ?'
        else:
            cmd = 'set ?'
        
        send(cmd)
        time.sleep(0.3)
        
        # 读取完整输出
        text = read_until_prompt(15)
        text = clean_output(text)
        
        # 解析输出，提取 completions 部分
        lines = text.split('\n')
        clean_lines = []
        in_completions = False
        
        for line in lines:
            line = line.rstrip()
            
            # 跳过空行
            if not line.strip():
                continue
            # 跳过提示符行
            if re.search(r'vyos@vyos[#\$]', line):
                continue
            if '[edit]' in line:
                continue
            
            # 检测 completions 开始
            if 'Possible completions:' in line:
                in_completions = True
                continue
            
            if not in_completions:
                continue
            
            # 跳过错误信息
            if 'is not valid' in line or 'Set failed' in line:
                continue
            
            clean_lines.append(line)
        
        return clean_lines

    def parse_completions(lines):
        """解析补全输出，返回 (sub_commands, leaf_values)
        
        格式说明：
        - +> name : 有子配置的节点（可继续递归）
        -  > name : 无子配置的节点（叶子节点）
        -    name : 无前缀，表示叶子值/参数
        - 描述可能跨越多行（下一行缩进很深，约20+空格）
        """
        sub_commands = []
        leaf_values = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            
            if not stripped or '<Enter>' in stripped:
                i += 1
                continue
            
            # 匹配有子配置的命令: +> name
            m = re.match(r'^\s*\+>\s+(\S+)\s*(.*)', line)
            if m:
                name = m.group(1)
                desc = m.group(2).strip()
                
                # 检查后续行是否是描述延续
                while i + 1 < len(lines):
                    next_line = lines[i + 1]
                    next_stripped = next_line.strip()
                    
                    if not next_stripped:
                        break
                    
                    # 如果有 +> 或 > 前缀，是新命令
                    if re.match(r'^\s*(\+>|>)\s+', next_line):
                        break
                    
                    # 计算缩进空格数
                    indent = len(next_line) - len(next_line.lstrip())
                    
                    # 如果缩进很深（>=18空格），且没有看起来像新命令的格式，是描述延续
                    if indent >= 18:
                        if re.match(r'^\s{3,16}\S+\s{2,}\S', next_line):
                            break
                        desc += ' ' + next_stripped
                        i += 1
                    else:
                        break
                
                sub_commands.append((name, desc, True))
                i += 1
                continue
            
            # 匹配无子配置的命令: > name (作为叶子节点)
            m = re.match(r'^\s*>\s+(\S+)\s*(.*)', line)
            if m:
                name = m.group(1)
                desc = m.group(2).strip()
                
                # 检查后续行是否是描述延续
                while i + 1 < len(lines):
                    next_line = lines[i + 1]
                    next_stripped = next_line.strip()
                    
                    if not next_stripped:
                        break
                    
                    if re.match(r'^\s*(\+>|>)\s+', next_line):
                        break
                    
                    indent = len(next_line) - len(next_line.lstrip())
                    
                    if indent >= 18:
                        if re.match(r'^\s{3,16}\S+\s{2,}\S', next_line):
                            break
                        desc += ' ' + next_stripped
                        i += 1
                    else:
                        break
                
                leaf_values.append((name, desc))
                i += 1
                continue
            
            # 匹配无前缀的命令/叶子值
            # 格式: 缩进(3-16空格) + 关键字 + 多个空格 + 描述
            m = re.match(r'^\s{3,16}(\S+)\s{2,}(.*)', line)
            if m:
                name = m.group(1)
                desc = m.group(2).strip()
                
                # 检查后续行是否是描述延续
                while i + 1 < len(lines):
                    next_line = lines[i + 1]
                    next_stripped = next_line.strip()
                    
                    if not next_stripped:
                        break
                    
                    if re.match(r'^\s*(\+>|>)\s+', next_line):
                        break
                    
                    indent = len(next_line) - len(next_line.lstrip())
                    
                    if indent >= 18:
                        if re.match(r'^\s{3,16}\S+\s{2,}\S', next_line):
                            break
                        desc += ' ' + next_stripped
                        i += 1
                    else:
                        break
                
                leaf_values.append((name, desc))
                i += 1
                continue
            
            # 其他情况：可能是描述延续行（没有关键字，只有描述文本）
            indent = len(line) - len(line.lstrip())
            if stripped and indent >= 18:
                if sub_commands:
                    old_name, old_desc, old_has_config = sub_commands[-1]
                    sub_commands[-1] = (old_name, old_desc + ' ' + stripped, old_has_config)
                elif leaf_values:
                    old_name, old_desc = leaf_values[-1]
                    leaf_values[-1] = (old_name, old_desc + ' ' + stripped)
            
            i += 1
        
        return sub_commands, leaf_values

    visited = set()
    traverse_start_time = time.time()
    TRAVERSE_TIMEOUT = 3000

    def generate_fictional_value(pattern):
        """根据占位符模式生成虚构值"""
        p = pattern.strip('<>')
        if re.match(r'^x\.x\.x\.x/x$', p, re.I):
            return '8.8.8.0/24'
        if re.match(r'^[xA]\.[xB]\.[xC]\.[xD]$', p, re.I):
            return '8.8.8.8'
        if ':' in p:
            return '::1'
        m = re.match(r'^(\d+)-(\d+)$', p)
        if m:
            low, high = int(m.group(1)), int(m.group(2))
            return str(min(low + 1, high))
        return 'test'

    def traverse(path, depth, indent=0):
        if depth > max_depth:
            return
        if path in visited:
            return
        if time.time() - traverse_start_time > TRAVERSE_TIMEOUT:
            print(f'\n[超时] 遍历已运行 {TRAVERSE_TIMEOUT} 秒，停止遍历', flush=True)
            return
        visited.add(path)

        lines = query_completions(path)
        sub_cmds, leaves = parse_completions(lines)

        prefix = '  ' * indent

        # 输出叶子值
        for pattern, desc in leaves:
            full_path = f'set {path} {pattern}' if path else f'set {pattern}'
            print(f'{prefix}  VALUE: {full_path}', flush=True)
            if desc:
                print(f'{prefix}         {desc}', flush=True)
            
            # 如果是占位符，生成虚构值并递归遍历
            is_placeholder = pattern.startswith('<') and pattern.endswith('>')
            if is_placeholder:
                fictional = generate_fictional_value(pattern)
                fictional_path = f'{path} {fictional}' if path else fictional
                marker = f'[~{pattern}]'
                print(f'{prefix}{marker} {fictional_path}', flush=True)
                if desc:
                    print(f'{prefix}    {desc}', flush=True)
                traverse(fictional_path, depth + 1, indent + 1)

        # 递归遍历子命令
        for name, desc, has_config in sub_cmds:
            full_path = f'{path} {name}' if path else name
            marker = '[*]' if has_config else '[ ]'

            is_placeholder = name.startswith('<') and name.endswith('>')
            if is_placeholder:
                fictional = generate_fictional_value(name)
                full_path = f'{path} {fictional}' if path else fictional
                marker = f'[~{name}]'
                print(f'{prefix}{marker} {full_path}', flush=True)
                if desc:
                    print(f'{prefix}    {desc}', flush=True)
                traverse(full_path, depth + 1, indent + 1)
            else:
                print(f'{prefix}{marker} {full_path}', flush=True)
                if desc:
                    print(f'{prefix}    {desc}', flush=True)
                traverse(full_path, depth + 1, indent + 1)

    # 初始化
    time.sleep(0.5)
    read_until_prompt(3)

    send('configure')
    read_until_prompt(3)

    print(f'\n=== 递归遍历: set {base_path} ===\n', flush=True)
    traverse(base_path, 0)

    send('exit')
    time.sleep(0.3)
    read_until_prompt(2)
    os.close(master)
    os.waitpid(pid, 0)


if len(sys.argv) > 1 and sys.argv[1] == '-f':
    with open(sys.argv[2], 'r') as f:
        commands = f.read().splitlines()
    run_queries(commands)
elif len(sys.argv) > 1 and sys.argv[1] == '-t':
    base_path = sys.argv[2] if len(sys.argv) > 2 else ''
    max_depth = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    run_traverse(base_path, max_depth)
else:
    commands = sys.argv[1:]
    if not commands:
        commands = ['set policy route test rule 1 ?']
    run_queries(commands)
