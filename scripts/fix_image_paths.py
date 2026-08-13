#!/usr/bin/env python3
"""Fix image paths in existing HTML help docs."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

def fix_image_paths(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix relative image URLs: ../../_images/ or ../_images/ or /_images/
    content = re.sub(
        r'src="(?:\.\./)*_images/([^"]*)"',
        r'src="https://docs.vyos.io/en/rolling/_images/\1"',
        content
    )

    # Fix relative image URLs in href (for linked images)
    content = re.sub(
        r'href="(?:\.\./)*_images/([^"]*)"',
        r'href="https://docs.vyos.io/en/rolling/_images/\1"',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

fixed_count = 0
for filename in os.listdir(DOCS_DIR):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        if fix_image_paths(filepath):
            fixed_count += 1
            print(f"Fixed: {filename}")

print(f"\nTotal fixed: {fixed_count} files")
