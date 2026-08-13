#!/usr/bin/env python3
"""Fix double-escaped HTML entities in help docs."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

def fix_double_escape(content):
    """Fix double-escaped entities like &amp;lt; -> &lt; and &amp;gt; -> &gt;"""
    content = content.replace('&amp;lt;', '&lt;')
    content = content.replace('&amp;gt;', '&gt;')
    content = content.replace('&amp;amp;', '&amp;')
    return content


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_double_escape(original)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            fixed_count += 1
            print(f"Fixed: {filename}")

print(f"\nTotal fixed: {fixed_count} files")
