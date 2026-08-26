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
        self.visited_paths = set()
        self.conf_prompt_re = re.compile(r'vyos@[^#]+#', re.MULTILINE)
        # Match ANSI/VT100 escape sequences, including private modes like ESC[?1l
        # and single-character escapes like ESC> that may leak into captured output.
        self.ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        # Remove other non-printable control chars that may survive ANSI stripping.
        self.ctrl_chars = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
        # Conservative token shape to avoid traversing garbage tokens.
        self.valid_opt_re = re.compile(r'^[A-Za-z0-9_./:-]+$|^<[^>]+>$')

    def _strip_controls(self, text):
        text = self.ansi_escape.sub('', str(text or ''))
        text = self.ctrl_chars.sub('', text)
        return text

    def _normalize_path(self, path):
        clean = self._strip_controls(path)
        return ' '.join(clean.split())

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

    def _collect_completion_output(self, max_wait=2.5, idle_rounds_needed=4):
        """Collect completion output robustly for slow nodes.

        Behavior:
        - Before seeing "Possible completions:", do not early-exit on idle; wait until timeout.
        - After header appears, exit when stream becomes idle for a short period.
        """
        all_output = ""
        deadline = time.time() + max_wait
        idle_rounds = 0
        saw_header = False

        while time.time() < deadline:
            chunk = self._drain_read()
            if chunk:
                all_output += chunk
                idle_rounds = 0
                if 'Possible completions:' in self._strip_controls(all_output):
                    saw_header = True
            else:
                idle_rounds += 1
                # Only early-exit on idle after header has appeared.
                if saw_header and idle_rounds >= idle_rounds_needed:
                    break
            time.sleep(0.05)

        return all_output

    def _query_completion_once(self, cmd, max_wait=3.0):
        # 清空命令行
        self._send("\x15")
        self._drain_read()

        # 输入命令前缀 + 空格，再触发 ?
        for ch in (cmd + " "):
            self._send(ch)
        os.write(self.master_fd, b'?')
        return self._collect_completion_output(max_wait=max_wait)

    def _query_completion_tab_fallback(self, cmd, max_wait=4.0):
        """Fallback completion trigger using TAB TAB for nodes that may not answer to '?' promptly."""
        self._send("\x15")
        self._drain_read()
        for ch in (cmd + " "):
            self._send(ch)
        self._send("\t\t")
        return self._collect_completion_output(max_wait=max_wait)

    def get_completion(self, path):
        path = self._normalize_path(path)
        cmd = f"set {path}"
        self._debug(f"查询: {cmd}")

        # 渐进式重试，适配慢节点
        all_output = ""
        for wait_sec in (4.0, 7.0, 10.0):
            attempt_output = self._query_completion_once(cmd, max_wait=wait_sec)
            all_output = attempt_output or all_output
            if 'Possible completions:' in self._strip_controls(attempt_output):
                break
            self._debug(f"未捕获补全头，重试: {cmd} (wait={wait_sec}s)")

        # Fallback: try TAB TAB completion trigger once.
        if 'Possible completions:' not in self._strip_controls(all_output):
            self._debug(f"问号补全未命中，尝试TAB补全: {cmd}")
            tab_output = self._query_completion_tab_fallback(cmd, max_wait=10.0)
            if 'Possible completions:' in self._strip_controls(tab_output):
                all_output = tab_output

        # Ctrl+C 取消命令，回到干净提示符
        self._send("\x03")
        #time.sleep(0.2)
        self._drain_read()

        # 解析选项
        options = self._parse_options_raw(all_output)
        # 格式化输出块
        block = self._format_block(all_output, cmd)
        return block, options

    def _guess_probe_value(self, path):
        """When a node returns no completions, guess one representative value to probe deeper."""
        tokens = self._normalize_path(path).split()
        if not tokens:
            return ''
        last = tokens[-1]
        # Key-like nodes that usually need one value to reveal subtree
        if last == 'interface':
            return 'eth0'
        if last == 'neighbor':
            return '1.1.1.1'
        if last == 'peer-group':
            return 'test01'
        if last == 'listen':
            return '1.1.1.0/24'
        return ''

    def _parse_options_raw(self, raw):
        """从原始终端输出中解析选项列表，正确剥离 +> / > 前缀"""
        clean = self._strip_controls(raw)
        lines = clean.split('\n')
        options = []
        seen = set()
        in_comp = False

        # Real completion rows look like:
        #   > token    description
        #   +> token   description
        #   token      description
        # or token-only rows such as <Enter>
        opt_line_re = re.compile(r'^(?:\+>\s*|>\s*|\+\s+)?(?P<opt><[^>]+>|[A-Za-z0-9_./:-]+)(?:(?:\s{2,}|\t+).*)?$')

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
            # Ignore bare continuation prompt marker line.
            if line.strip() == '>':
                continue
            if not line.strip():
                continue

            expanded = line.expandtabs(8)
            leading_ws = len(expanded) - len(expanded.lstrip())
            stripped = expanded.lstrip()
            has_marker = stripped.startswith('+>') or stripped.startswith('>') or stripped.startswith('+ ')

            # Description continuation lines are deeply indented and do not start with markers.
            if not has_marker and leading_ws > 6:
                continue

            m = opt_line_re.match(stripped)
            if not m:
                continue

            opt = self._normalize_path(m.group('opt'))
            if not opt:
                continue
            if opt in ('+', '-', '|'):
                continue
            if not self.valid_opt_re.match(opt):
                self._debug(f"忽略疑似噪声候选: {repr(opt)}")
                continue
            if opt not in seen:
                seen.add(opt)
                options.append(opt)

        return options

    def _format_block(self, raw, cmd):
        """整理成和示例完全一致的输出格式"""
        clean = self._strip_controls(raw)
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
            # Skip continuation prompt marker that is not a completion item.
            if line.strip() == '>':
                continue
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
        result = self._normalize_path(option_str)

        # Numeric range placeholders, e.g. <1-256> / <0-65535>
        m = re.fullmatch(r'<\s*(-?\d+)\s*-\s*(-?\d+)\s*>', result)
        if m:
            lo = int(m.group(1))
            hi = int(m.group(2))
            return str(lo if lo <= hi else hi)

        # Common CLI placeholder variants, e.g. <x.x.x.x/x>, <a.b.c.d/m>
        lower = result.lower()
        if re.search(r'<[^>]*x\.x\.x\.x\s*/\s*x[^>]*>', lower):
            return '1.1.1.1/24'
        if re.search(r'<[^>]*ipv4[^>]*(prefix|network|net|/)?.*>', lower) and '/' in lower:
            return '1.1.1.1/24'
        if re.search(r'<[^>]*ipv6[^>]*(prefix|network|net|/)?.*>', lower) and '/' in lower:
            return '2001:db8::/64'

        for ph, val in mapping.items():
            if ph in result:
                result = result.replace(ph, val)
        # 兜底：未知占位符统一用 test01
        if '<' in result and '>' in result:
            result = 'test01'
        return result

    def _choose_representative_value(self, concrete_opts):
        """Choose one representative concrete value to avoid traversing huge sibling sets."""
        if not concrete_opts:
            return ''
        preferred = ['eth0', 'lo', 'br0', 'vti0']
        for p in preferred:
            if p in concrete_opts:
                return p
        return concrete_opts[0]

    def traverse(self, path):
        path = self._normalize_path(path)
        if path in self.visited_paths:
            self._debug(f"跳过已访问路径: {path}")
            return
        self.visited_paths.add(path)

        block, options = self.get_completion(path)
        print(block)
        print()

        # 到达叶子节点
        if '<Enter>' in options:
            return

        # Some nodes don't return completion list until a key/value is provided.
        # Probe one representative value and continue if that path reveals children.
        if not options:
            probe = self._guess_probe_value(path)
            if probe:
                probe_path = self._normalize_path(f"{path} {probe}")
                if probe_path not in self.visited_paths:
                    print(f"[probe] {path} -> {probe_path}")
                    print()
                    self._debug(f"空补全探测: {path} -> {probe_path}")
                    self.traverse(probe_path)
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

        # If placeholders exist, this level is usually "name/value selector" (e.g. interface).
        # Traverse only one representative branch to avoid redundant explosion.
        if placeholder_opts:
            sample = self._choose_representative_value(concrete)
            if sample:
                new_path = self._normalize_path(f"{path} {sample}" if path else sample)
            else:
                sample = self._fill_value(placeholder_opts[0])
                new_path = self._normalize_path(f"{path} {sample}" if path else sample)
            self.traverse(new_path)
        elif concrete:
            # 有具体枚举值，逐个深度遍历
            for opt in concrete:
                new_path = self._normalize_path(f"{path} {opt}" if path else opt)
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
