#!/usr/bin/env python3
"""Add CSS styles for VyOS command blocks (div.cmd, div.cfgcmd-heading, etc.)."""

import os

DOCS_DIR = '/opt/vyos-web-config/docs'

VYOS_CMD_CSS = """
<style>
  /* VyOS command block styling */
  .cmd { margin: 10px 0; }
  .cmd-cfg { }
  .cfgcmd-heading {
    background: #f8f9fa;
    border-left: 3px solid #e67e22;
    border-radius: 0 4px 4px 0;
    padding: 8px 12px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    color: #333;
    margin-bottom: 4px;
  }
  .cfgcmd-heading::before {
    content: "$ ";
    color: #e67e22;
    font-weight: bold;
  }
  .cfgcmd-heading .cmdlink {
    display: none;
  }
  .cfgcmd-body {
    padding-left: 16px;
    margin-bottom: 12px;
  }
  /* Highlight/pre blocks for commands */
  .highlight {
    background: #f8f9fa;
    border-left: 3px solid #e67e22;
    border-radius: 0 4px 4px 0;
    padding: 8px 12px;
    margin: 8px 0;
  }
  .highlight pre {
    margin: 0;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    color: #333;
    background: none;
    border: none;
    padding: 0;
  }
  .highlight pre::before {
    content: "$ ";
    color: #e67e22;
    font-weight: bold;
  }
  /* Inline code */
  code {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    color: #c0392b;
  }
  /* Strong/bold in commands */
  .cfgcmd-heading strong {
    color: #333;
    font-weight: 600;
  }
</style>
"""


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        # Check if file has VyOS command divs
        if 'cmd-cfg' in original or 'cfgcmd-heading' in original or '.highlight' in original:
            if '</head>' in original:
                fixed = original.replace('</head>', VYOS_CMD_CSS + '</head>')
            elif '<body>' in original:
                fixed = original.replace('<body>', '<body>' + VYOS_CMD_CSS)
            else:
                fixed = VYOS_CMD_CSS + original

            if fixed != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                fixed_count += 1
                print(f"Styled: {filename}")

print(f"\nTotal styled: {fixed_count} files")
