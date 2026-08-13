#!/usr/bin/env python3
"""Remove ALL stray </span> and <span> tags from HTML help docs."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

def fix_all_spans(content):
    """Remove all span tags from the document."""
    # Remove </span>
    content = content.replace('</span>', '')
    # Remove <span...> (with any attributes)
    content = re.sub(r'<span[^>]*>', '', content)
    return content


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_all_spans(original)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            fixed_count += 1
            print(f"Fixed: {filename}")

print(f"\nTotal fixed: {fixed_count} files")
