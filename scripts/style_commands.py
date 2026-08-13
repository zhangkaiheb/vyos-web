#!/usr/bin/env python3
"""Style command blocks in HTML help docs to match VyOS docs website style."""

import os
import re

DOCS_DIR = '/opt/vyos-web-config/docs'

# CSS to inject into each HTML file
COMMAND_CSS = """
<style>
  /* VyOS-style command blocks */
  .vyos-cmd {
    background: #f8f9fa;
    border-left: 3px solid #e67e22;
    border-radius: 0 4px 4px 0;
    padding: 8px 12px;
    margin: 8px 0;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    color: #333;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .vyos-cmd::before {
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
  /* Pre blocks for multi-line commands */
  pre.vyos-cmd-block {
    background: #f8f9fa;
    border-left: 3px solid #e67e22;
    border-radius: 0 4px 4px 0;
    padding: 12px;
    margin: 12px 0;
    overflow-x: auto;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #333;
  }
  pre.vyos-cmd-block code {
    background: none;
    padding: 0;
    color: #333;
  }
  pre.vyos-cmd-block code::before {
    content: "$ ";
    color: #e67e22;
    font-weight: bold;
  }
</style>
"""

def style_commands(content):
    """Replace <code>command</code> with styled divs."""
    # Replace single-line command code blocks: <code>set ...</code>
    content = re.sub(
        r'<code>((?:set|delete|run|show)[^<]*)</code>',
        r'<div class="vyos-cmd">\1</div>',
        content
    )
    # Replace multi-line pre code blocks: <pre><code>set...\nset...</code></pre>
    content = re.sub(
        r'<pre><code>((?:set|delete|run|show)[^<]*)</code></pre>',
        r'<pre class="vyos-cmd-block"><code>\1</code></pre>',
        content
    )
    return content


def inject_css(content):
    """Inject command CSS before </head> or at the beginning of body."""
    if '</head>' in content:
        return content.replace('</head>', COMMAND_CSS + '</head>')
    elif '<body>' in content:
        return content.replace('<body>', '<body>' + COMMAND_CSS)
    else:
        return COMMAND_CSS + content


fixed_count = 0
for filename in sorted(os.listdir(DOCS_DIR)):
    if filename.endswith('.html'):
        filepath = os.path.join(DOCS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = style_commands(original)
        fixed = inject_css(fixed)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            fixed_count += 1
            print(f"Styled: {filename}")

print(f"\nTotal styled: {fixed_count} files")
