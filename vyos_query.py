#!/usr/bin/env python3
import os
import pty
import select
import re
import sys
import time
import argparse
import termios
import tty


class VyOSTraverser:
    def __init__(self, debug=False):
        self.master_fd = None
        self.child_pid = None
        self.debug = debug
        self.conf_prompt_re = re.compile(r'vyos@[^#]+#', re.MULTILINE)
        self.ansi_escape = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')

    def _debug(self, msg):
        if self.debug:
            print(f"[DEBUG] {msg}", file=sys.stderr)

    def connect(self):
        self._debug("启动 vbash 进程...")
        self.child_pid, self.master_fd = pty.fork()

        if self.child_pid == 0:
            os.environ['TERM'] = 'xterm'
            os.environ['COLUMNS'] = '300'
            os.environ['LINES'] = '100'
            os.execv('/bin/vbash', ['/bin/vbash', '--login', '-i'])

        #time.sleep(0.03)
        self._drain_read()

        self.orig_attr = termios.tcgetattr(self.master_fd)
        tty.setcbreak(self.master_fd, termios.TCSANOW)
        self._debug("已设置 cbreak 字符模式")

        self._debug("进入配置模式...")
        self._send_line("configure")
        self._wait_prompt()
        self._debug("配置模式就绪")

    def _send(self, data):
        os.write(self.master_fd, data.encode('utf-8'))
        #time.sleep(0.05)

    def _send_line(self, line):
        os.write(self.master_fd, (line + "\n").encode('utf-8'))
        #time.sleep(0.15)

    def _drain_read(self):
        data = b""
        while True:
            r, _, _ = select.select([self.master_fd], [], [], 0.05)
            if not r:
                break
            try:
                chunk = os.read(self.master_fd, 32768)
                if not chunk:
                    break
                data += chunk
            except OSError:
                break
        return data.decode('utf-8', errors='ignore')

    def _wait_prompt(self, timeout=10):
        output = ""
        deadline = time.time() + timeout
        while time.time() < deadline:
            output += self._drain_read()
            clean = self.ansi_escape.sub('', output)
            if self.conf_prompt_re.search(clean):
                return output
            #time.sleep(0.05)
        return output

    def get_completion(self, path):
        cmd = f"set {path}"
        self._debug(f"查询: {cmd}")

        # 清空命令行
        self._send("\x15")
        #time.sleep(0.1)
        self._drain_read()

        # 输入命令前缀 + 空格
        for ch in (cmd + " "):
            self._send(ch)
        #time.sleep(0.2)
        self._drain_read()

        # 发送问号触发补全
        os.write(self.master_fd, b'?')
        #time.sleep(0.3)

        # 读取完整补全输出
        all_output = ""
        for _ in range(20):
            #time.sleep(0.1)
            chunk = self._drain_read()
            if chunk:
                all_output += chunk

        # Ctrl+C 取消命令，回到干净提示符
        self._send("\x03")
        #time.sleep(0.2)
        self._drain_read()

        # 解析选项
        options = self._parse_options_raw(all_output)
        # 格式化输出块
        block = self._format_block(all_output, cmd)
        return block, options

    def _parse_options_raw(self, raw):
        """从原始终端输出中解析选项列表，正确剥离 +> / > 前缀"""
        clean = self.ansi_escape.sub('', raw)
        lines = clean.split('\n')
        options = []
        in_comp = False

        for line in lines:
            line = line.rstrip('\r')
            if "Possible completions:" in line:
                in_comp = True
                continue
            if not in_comp:
                continue
            if re.match(r'^\s*vyos@.*#', line):
                break
            if line.strip() == '[edit]':
                break
            if not line.strip():
                continue

            stripped = line.lstrip()
            # 剥离前缀符号：+> 或 >
            if stripped.startswith('+> '):
                opt_str = stripped[3:].strip()
            elif stripped.startswith('> '):
                opt_str = stripped[2:].strip()
            else:
                opt_str = stripped.strip()

            # 提取第一个单词作为选项名
            match = re.match(r'^(\S+)', opt_str)
            if match:
                opt = match.group(1)
                options.append(opt)

        return options

    def _format_block(self, raw, cmd):
        """整理成和示例完全一致的输出格式"""
        clean = self.ansi_escape.sub('', raw)
        lines = clean.split('\n')
        result = [f"vyos@vyos# {cmd}"]
        in_comp = False

        for line in lines:
            line = line.rstrip('\r')
            if "Possible completions:" in line:
                in_comp = True
                result.append("Possible completions:")
                continue
            if not in_comp:
                continue
            if re.match(r'^\s*vyos@.*#', line):
                break
            if line.strip() == '[edit]':
                break
            # 保留原始缩进和内容
            result.append(line)

        # 去掉末尾空行，补上 [edit]
        while result and result[-1].strip() == '':
            result.pop()
        result.append("")
        result.append("[edit]")
        return '\n'.join(result)

    def _fill_value(self, option_str):
        """
        将包含占位符的选项替换为合法示例值
        支持纯占位符 <text> / <number>，也支持带单位的形式 <number>kbit / <number>%
        """
        mapping = {
            '<text>': 'test01',
            '<number>': '100',
            '<ipv4>': '192.168.1.1',
            '<ipv6>': '2001:db8::1',
            '<ipv4net>': '192.168.1.0/24',
            '<ipv6net>': '2001:db8::/32',
            '<mac>': '00:11:22:33:44:55',
            '<port>': '8080',
        }
        result = option_str
        for ph, val in mapping.items():
            if ph in result:
                result = result.replace(ph, val)
        # 兜底：未知占位符统一用 test01
        if '<' in result and '>' in result:
            result = 'test01'
        return result

    def traverse(self, path):
        block, options = self.get_completion(path)
        print(block)
        print()

        # 到达叶子节点
        if '<Enter>' in options:
            return

        # 分类：纯枚举项（不含 <>）、占位符项（含 <>）
        concrete = []
        placeholder_opts = []
        for opt in options:
            if opt == '<Enter>':
                continue
            if '<' in opt:
                placeholder_opts.append(opt)
            else:
                concrete.append(opt)

        if concrete:
            # 有具体枚举值，逐个深度遍历
            for opt in concrete:
                new_path = f"{path} {opt}" if path else opt
                self.traverse(new_path)
        elif placeholder_opts:
            # 只有占位符选项，每个都填充示例值后继续遍历
            for opt in placeholder_opts:
                val = self._fill_value(opt)
                new_path = f"{path} {val}" if path else val
                self.traverse(new_path)

    def close(self):
        if self.master_fd and self.orig_attr:
            try:
                termios.tcsetattr(self.master_fd, termios.TCSANOW, self.orig_attr)
            except Exception:
                pass
        if self.master_fd:
            try:
                self._send_line("exit")
                #time.sleep(0.3)
                os.close(self.master_fd)
            except Exception:
                pass
        if self.child_pid:
            try:
                os.waitpid(self.child_pid, 0)
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description='VyOS 命令行深度遍历工具')
    parser.add_argument('path', help='起始遍历路径，如 qos 或 "qos interface"')
    parser.add_argument('--debug', action='store_true', help='开启调试输出')
    args = parser.parse_args()

    t = VyOSTraverser(debug=args.debug)
    try:
        t.connect()
        t.traverse(args.path.strip())
    except KeyboardInterrupt:
        print("\n已中断")
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        t.close()


if __name__ == '__main__':
    main()
