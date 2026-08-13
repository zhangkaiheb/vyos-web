#!/usr/bin/env python3
"""Remove stray </span> and <span> tags from command lines in HTML help docs."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

def fix_span_tags(content):
    """Remove span tags that appear inside <code> blocks on command lines."""
    lines = content.split('\n')
    result = []
    for line in lines:
        # If line is inside a code block and contains span tags, strip them
        if '<code>' in line or '<pre>' in line:
            # Remove </span> and <span...> tags
            line = re.sub(r'</span>', '', line)
            line = re.sub(r'<span[^>]*>', '', line)
        result.append(line)
    return '\n'.join(result)


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_span_tags(original)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            fixed_count += 1
            print(f"Fixed: {filename}")

print(f"\nTotal fixed: {fixed_count} files")
