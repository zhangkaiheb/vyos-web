#!/usr/bin/env python3
"""Wrap VyOS CLI commands (set/delete/run/show) in code blocks in HTML help docs."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

def fix_command_blocks(content):
    """Find lines that look like VyOS CLI commands and wrap them in <code> or <pre><code>."""
    lines = content.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Check if this line is a VyOS command (starts with set/delete/run/show)
        is_cmd = bool(re.match(r'^(set|delete|run|show)\s+', stripped))

        if is_cmd:
            # Collect consecutive command lines
            cmd_lines = []
            while i < len(lines) and re.match(r'^\s*(set|delete|run|show)\s+', lines[i].strip()):
                cmd_lines.append(lines[i].strip())
                i += 1

            # If multiple consecutive commands, use <pre><code>
            if len(cmd_lines) > 1:
                escaped = '\n'.join(cmd_lines)
                # Escape HTML entities
                escaped = escaped.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                result.append(f'<pre><code>{escaped}</code></pre>')
            else:
                # Single command, use <code>
                escaped = cmd_lines[0].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                result.append(f'<code>{escaped}</code>')
        else:
            result.append(line)
            i += 1

    return '\n'.join(result)


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_command_blocks(original)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            fixed_count += 1
            print(f"Fixed: {filename}")

print(f"\nTotal fixed: {fixed_count} files")
