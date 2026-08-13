#!/usr/bin/env python3
"""
Batch fetch VyOS documentation pages and convert them to HTML help files.
Usage: python3 scripts/generate_help_docs.py
"""

import json
import os
import re
import urllib.request
import ssl
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, 'docs')
MAPPING_FILE = os.path.join(BASE_DIR, 'backend', 'data', 'help_mapping.json')

VYOS_BASE = 'https://docs.vyos.io/en/rolling/configuration'

# Map frontend routes to VyOS doc paths
ROUTE_TO_VYOS = {
    # Firewall
    '/firewall': '/firewall/index.html',
    '/firewall/ipv4': '/firewall/ipv4.html',
    '/firewall/ipv6': '/firewall/ipv6.html',
    '/firewall/group': '/firewall/groups.html',
    '/firewall/zone': '/firewall/zone.html',
    '/firewall/global-options': '/firewall/global-options.html',
    '/firewall/flowtable': '/firewall/flowtables.html',
    '/firewall/bridge': '/firewall/bridge.html',

    # Interfaces
    '/interfaces': '/interfaces/index.html',
    '/interfaces/ethernet': '/interfaces/ethernet.html',
    '/interfaces/bonding': '/interfaces/bonding.html',
    '/interfaces/bridge': '/interfaces/bridge.html',
    '/interfaces/wireguard': '/interfaces/wireguard.html',
    '/interfaces/vxlan': '/interfaces/vxlan.html',
    '/interfaces/loopback': '/interfaces/loopback.html',
    '/interfaces/macsec': '/interfaces/macsec.html',
    '/interfaces/pppoe': '/interfaces/pppoe.html',
    '/interfaces/l2tpv3': '/interfaces/l2tpv3.html',
    '/interfaces/pseudo-ethernet': '/interfaces/pseudo-ethernet.html',
    '/interfaces/virtual-ethernet': '/interfaces/virtual-ethernet.html',
    '/interfaces/geneve': '/interfaces/geneve.html',
    '/interfaces/vti': '/interfaces/vti.html',
    '/interfaces/openvpn': '/interfaces/openvpn.html',
    '/interfaces/sstp': '/interfaces/sstp-client.html',
    '/interfaces/tunnel': '/interfaces/tunnel.html',

    # NAT
    '/nat': '/nat/index.html',
    '/nat/source': '/nat/nat44.html',
    '/nat/destination': '/nat/nat44.html',
    '/nat/static': '/nat/nat44.html',
    '/nat/nat64': '/nat/nat64.html',
    '/nat/nat66': '/nat/nat66.html',
    '/nat/cgnat': '/nat/cgnat.html',

    # Policy
    '/policy': '/policy/index.html',
    '/policy/route': '/policy/route.html',
    '/policy/route-map': '/policy/route-map.html',
    '/policy/access-list': '/policy/access-list.html',
    '/policy/prefix-list': '/policy/prefix-list.html',
    '/policy/local-route': '/policy/local-route.html',
    '/policy/as-path-list': '/policy/as-path-list.html',
    '/policy/community-list': '/policy/community-list.html',
    '/policy/extcommunity-list': '/policy/extcommunity-list.html',
    '/policy/large-community-list': '/policy/large-community-list.html',

    # Protocols
    '/protocols': '/protocols/index.html',
    '/protocols/babel': '/protocols/babel.html',
    '/protocols/bfd': '/protocols/bfd.html',
    '/protocols/bgp': '/protocols/bgp.html',
    '/protocols/isis': '/protocols/isis.html',
    '/protocols/mpls': '/protocols/mpls.html',
    '/protocols/ospf': '/protocols/ospf.html',
    '/protocols/ospfv3': '/protocols/ospf.html',
    '/protocols/pim': '/protocols/pim.html',
    '/protocols/pim6': '/protocols/pim6.html',
    '/protocols/rip': '/protocols/rip.html',
    '/protocols/ripng': '/protocols/rip.html',
    '/protocols/rpki': '/protocols/rpki.html',
    '/protocols/igmp-proxy': '/protocols/igmp-proxy.html',
    '/protocols/segment-routing': '/protocols/segment-routing.html',
    '/protocols/failover': '/protocols/failover.html',
    '/protocols/static': '/protocols/static.html',
    '/protocols/nhrp': '/protocols/nhrp.html',

    # Service
    '/service': '/service/index.html',
    '/service/dhcp-server': '/service/dhcp-server.html',
    '/service/dhcp-relay': '/service/dhcp-relay.html',
    '/service/dns': '/service/dns.html',
    '/service/ntp': '/service/ntp.html',
    '/service/ssh': '/service/ssh.html',
    '/service/snmp': '/service/snmp.html',
    '/service/https': '/service/https.html',
    '/service/lldp': '/service/lldp.html',
    '/service/suricata': '/service/suricata.html',
    '/service/webproxy': '/service/webproxy.html',
    '/service/config-sync': '/service/config-sync.html',
    '/service/pppoe-server': '/service/pppoe-server.html',
    '/service/l2tp': '/service/l2tp.html',
    '/service/pptp': '/service/pppoe-server.html',
    '/service/sstp': '/service/sstp.html',

    # System
    '/system': '/system/index.html',
    '/system/hostname': '/system/host-name.html',
    '/system/login': '/system/login.html',
    '/system/syslog': '/system/syslog.html',
    '/system/ntp': '/system/ntp.html',
    '/system/dns': '/system/name-server.html',
    '/system/task-scheduler': '/system/task-scheduler.html',
    '/system/conntrack': '/system/conntrack.html',

    # VPN
    '/vpn': '/vpn/index.html',
    '/vpn/ipsec': '/vpn/ipsec/index.html',
    '/vpn/openvpn': '/vpn/openvpn.html',
    '/vpn/l2tp': '/vpn/l2tp.html',
    '/vpn/pptp': '/vpn/pptp.html',
    '/vpn/sstp': '/vpn/sstp.html',
    '/vpn/openconnect': '/vpn/openconnect.html',
    '/vpn/wireguard': '/vpn/wireguard.html',

    # High Availability
    '/high-availability': '/highavailability/index.html',

    # Container
    '/container': '/container/index.html',
    '/container/name': '/container/index.html',
    '/container/network': '/container/index.html',
    '/container/registry': '/container/index.html',

    # VRF
    '/vrf': '/vrf/index.html',

    # QoS
    '/qos': '/trafficpolicy/index.html',
    '/qos/policy': '/trafficpolicy/index.html',
    '/qos/interface': '/trafficpolicy/index.html',
    '/qos/traffic-match-group': '/trafficpolicy/index.html',
}

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
    """Fetch a page from VyOS docs."""
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
        print(f"  ERROR fetching {url}: {e}")
        return None


def extract_main_content(html):
    """Extract the main article content from a Sphinx/rst page."""
    # Remove navigation elements
    html = re.sub(r'<nav[^>]*>.*?</nav>', '', html, flags=re.DOTALL)
    html = re.sub(r'<div class="admonition-title">.*?</div>', '', html, flags=re.DOTALL)

    # Try to find the main article/section content
    # Look for the main content area (Sphinx uses role="main" or class="body")
    match = re.search(r'<div[^>]*role="main"[^>]*>(.*?)</div>\s*(?:<div[^>]*class="related"|<footer)', html, re.DOTALL)
    if match:
        content = match.group(1)
    else:
        match = re.search(r'<div[^>]*class="body"[^>]*>(.*?)</div>\s*(?:<div[^>]*class="related"|<footer)', html, re.DOTALL)
        if match:
            content = match.group(1)
        else:
            # Fallback: extract between first <h1> and footer/nav
            match = re.search(r'<h1.*?</h1>(.*?)(?:<footer|<nav[^>]*class="related")', html, re.DOTALL)
            if match:
                h1_match = re.search(r'<h1[^>]*>.*?</h1>', html)
                if h1_match:
                    content = '<h1>' + h1_match.group(0) + match.group(1)
                else:
                    content = match.group(0)
            else:
                content = html

    # Clean up Sphinx-specific artifacts
    content = re.sub(r'<a class="headerlink"[^>]*>.*?</a>', '', content)
    content = re.sub(r'\[\]', '', content)
    content = re.sub(r'<span class="brackets">.*?</span>', '', content)
    content = re.sub(r'<span class="fn-backref">.*?</span>', '', content)

    # Remove "Previous/Next" navigation at the bottom
    content = re.sub(r'<div[^>]*class="related-pages".*?</div>', '', content, flags=re.DOTALL)

    return content.strip()


def process_html(content):
    """Post-process extracted HTML for display in modal."""
    # Fix relative image URLs: ../../_images/ or /_images/
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
    # Fix relative links to point to VyOS docs
    content = re.sub(
        r'href="([^"#]*\.html)"',
        r'href="https://docs.vyos.io/en/rolling/configuration/\1"',
        content
    )
    # Remove empty paragraphs
    content = re.sub(r'<p>\s*</p>', '', content)
    # Remove all span tags (leftover from VyOS docs syntax highlighting)
    content = re.sub(r'</span>', '', content)
    content = re.sub(r'<span[^>]*>', '', content)
    return content


def main():
    os.makedirs(DOCS_DIR, exist_ok=True)

    # Load existing mapping
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    total = len(ROUTE_TO_VYOS)
    success = 0
    failed = 0

    for route, vyos_path in sorted(ROUTE_TO_VYOS.items()):
        url = VYOS_BASE + vyos_path
        filename = mapping.get(route, '')

        if not filename:
            # Generate filename from route
            safe = route.strip('/').replace('/', '_')
            filename = f'{safe}.html'
            mapping[route] = filename

        filepath = os.path.join(DOCS_DIR, filename)

        # Skip if already exists and is HTML
        if os.path.exists(filepath) and filename.endswith('.html'):
            print(f"  SKIP (exists): {route} -> {filename}")
            success += 1
            continue

        print(f"  FETCH: {route} -> {url}")
        html = fetch_page(url)
        if html is None:
            failed += 1
            continue

        content = extract_main_content(html)
        content = process_html(content)

        if not content or len(content) < 50:
            print(f"  WARN: Empty content for {route}")
            failed += 1
            continue

        full_html = HTML_TEMPLATE.format(content=content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(full_html)

        # Update mapping to point to HTML file
        if not filename.endswith('.html'):
            html_filename = filename.replace('.md', '.html')
            mapping[route] = html_filename
            filepath = os.path.join(DOCS_DIR, html_filename)
            os.rename(os.path.join(DOCS_DIR, filename), filepath)

        print(f"  OK: {route} -> {filename} ({len(content)} chars)")
        success += 1
        time.sleep(0.3)  # Rate limiting

    # Save updated mapping
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

    print(f"\nDone: {success} succeeded, {failed} failed out of {total} routes")


if __name__ == '__main__':
    main()
