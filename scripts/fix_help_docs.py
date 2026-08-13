#!/usr/bin/env python3
"""Fix failed help doc mappings and re-fetch with correct URLs."""

import json
import os
import re
import urllib.request
import ssl
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, 'docs')
MAPPING_FILE = os.path.join(BASE_DIR, 'backend', 'data', 'help_mapping.json')

# Correct URL mappings for the 6 failed pages
FIXES = {
    '/protocols/nhrp': '/vpn/dmvpn.html',
    '/service/l2tp': '/vpn/l2tp.html',
    '/service/sstp': '/vpn/sstp.html',
    '/system/ntp': '/service/ntp.html',
    '/vpn/openvpn': '/interfaces/openvpn.html',
    '/vpn/wireguard': '/interfaces/wireguard.html',
}

VYOS_BASE = 'https://docs.vyos.io/en/rolling/configuration'

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; margin: 0; padding: 12px; }}
  h1 {{ font-size: 20px; color: #1a1a2e; border-bottom: 2px solid #4361ee; padding-bottom: 8px; margin-top: 0; }}
  h2 {{ font-size: 17px; color: #16213e; margin-top: 20px; border-left: 3px solid #4361ee; padding-left: 10px; }}
  h3 {{ font-size: 15px; color: #0f3460; margin-top: 16px; }}
  h4 {{ font-size: 14px; color: #533483; margin-top: 12px; }}
  p {{ margin: 8px 0; }}
  code {{ background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 13px; color: #c0392b; }}
  pre {{ background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 13px; line-height: 1.5; }}
  pre code {{ background: none; padding: 0; color: #333; }}
  ul, ol {{ padding-left: 20px; }}
  li {{ margin: 4px 0; }}
  .note, .warning, .tip {{ padding: 10px 14px; margin: 12px 0; border-radius: 0 4px 4px 0; }}
  .note {{ background: #fff3cd; border-left: 4px solid #ffc107; }}
  .note strong {{ color: #856404; }}
  .warning {{ background: #f8d7da; border-left: 4px solid #dc3545; }}
  .warning strong {{ color: #721c24; }}
  .tip {{ background: #d4edda; border-left: 4px solid #28a745; }}
  .tip strong {{ color: #155724; }}
  a {{ color: #4361ee; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
  th, td {{ border: 1px solid #dee2e6; padding: 8px 12px; text-align: left; }}
  th {{ background: #f8f9fa; font-weight: 600; }}
  hr {{ border: none; border-top: 1px solid #e9ecef; margin: 16px 0; }}
  img {{ max-width: 100%; height: auto; }}
  blockquote {{ border-left: 3px solid #4361ee; margin: 12px 0; padding: 8px 16px; background: #f8f9fa; }}
</style>
</head>
<body>
{content}
</body>
</html>"""


def fetch_page(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    })
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def extract_main_content(html):
    match = re.search(r'<div[^>]*role="main"[^>]*>(.*?)</div>\s*(?:<div[^>]*class="related"|<footer)', html, re.DOTALL)
    if match:
        content = match.group(1)
    else:
        match = re.search(r'<div[^>]*class="body"[^>]*>(.*?)</div>\s*(?:<div[^>]*class="related"|<footer)', html, re.DOTALL)
        if match:
            content = match.group(1)
        else:
            match = re.search(r'<h1.*?</h1>(.*?)(?:<footer|<nav[^>]*class="related")', html, re.DOTALL)
            if match:
                h1_match = re.search(r'<h1[^>]*>.*?</h1>', html)
                if h1_match:
                    content = '<h1>' + h1_match.group(0) + match.group(1)
                else:
                    content = match.group(0)
            else:
                content = html
    content = re.sub(r'<a class="headerlink"[^>]*>.*?</a>', '', content)
    content = re.sub(r'\[\]', '', content)
    content = re.sub(r'<span class="brackets">.*?</span>', '', content)
    content = re.sub(r'<span class="fn-backref">.*?</span>', '', content)
    content = re.sub(r'<div[^>]*class="related-pages".*?</div>', '', content, flags=re.DOTALL)
    return content.strip()


def process_html(content):
    content = re.sub(r'src="(/_images/[^"]*)"', r'src="https://docs.vyos.io\1"', content)
    content = re.sub(r'href="([^"#]*\.html)"', r'href="https://docs.vyos.io/en/rolling/configuration/\1"', content)
    content = re.sub(r'<p>\s*</p>', '', content)
    return content


def main():
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    for route, vyos_path in FIXES.items():
        url = VYOS_BASE + vyos_path
        filename = mapping.get(route, '')
        if not filename:
            safe = route.strip('/').replace('/', '_')
            filename = f'{safe}.html'
            mapping[route] = filename

        # Ensure .html extension
        if filename.endswith('.md'):
            filename = filename.replace('.md', '.html')
            mapping[route] = filename

        filepath = os.path.join(DOCS_DIR, filename)

        # Remove old .md file if exists
        old_md = filepath.replace('.html', '.md')
        if os.path.exists(old_md):
            os.remove(old_md)
            print(f"  Removed old: {old_md}")

        print(f"  FETCH: {route} -> {url}")
        html = fetch_page(url)
        if html is None:
            print(f"  FAILED: {route}")
            continue

        content = extract_main_content(html)
        content = process_html(content)

        if not content or len(content) < 50:
            print(f"  WARN: Empty content for {route}")
            continue

        full_html = HTML_TEMPLATE.format(content=content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(full_html)

        print(f"  OK: {route} -> {filename} ({len(content)} chars)")

    # Also fix remaining .md references in mapping that should be .html
    for route in list(mapping.keys()):
        fname = mapping[route]
        if fname.endswith('.md') and route not in ['/', '/login', '/dashboard', '/monitor', '/monitor/cpu', '/monitor/memory', '/monitor/interfaces', '/monitor/conntrack', '/logs', '/users', '/settings', '/webapp', '/shell', '/system/maintenance', '/system/troubleshooting']:
            html_name = fname.replace('.md', '.html')
            md_path = os.path.join(DOCS_DIR, fname)
            html_path = os.path.join(DOCS_DIR, html_name)
            if os.path.exists(md_path) and not os.path.exists(html_path):
                os.rename(md_path, html_path)
                mapping[route] = html_name
                print(f"  RENAMED: {fname} -> {html_name} for {route}")

    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

    print("\nDone!")


if __name__ == '__main__':
    main()
