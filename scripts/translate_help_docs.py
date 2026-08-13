#!/usr/bin/env python3
"""Translate help docs using Qwen (DashScope) API - whole file approach."""

import os
import re
import json
import time
import sys
import urllib.request

DOCS_DIR = '/opt/vyos-web-config/docs'
EN_DIR = os.path.join(DOCS_DIR, 'en')

API_KEY = 'sk-c14b3519b9c34ed6bf2b200639c5c76f'
API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

LANGUAGES = {
    'zh': 'Chinese (Simplified)',
    'ru': 'Russian',
    'fr': 'French',
    'de': 'German'
}


def translate_file_with_qwen(html_content, target_lang):
    """Translate entire HTML file content using Qwen API."""
    prompt = f"""You are a professional translator. Translate the following HTML document from English to {target_lang}.

RULES:
1. Translate ONLY the visible text content (text between HTML tags like <p>, <h1>, <h2>, <li>, <td>, <th>, <span>, <strong>, <em>, <a> text, <title>, etc.)
2. Keep ALL HTML tags, attributes, CSS styles, class names, IDs exactly as they are
3. Keep ALL VyOS CLI commands (lines starting with set/delete/run/show) in ENGLISH - do not translate them
4. Keep ALL placeholders like <name>, <text>, <interface>, <1-999999>, <0-65535> etc. as-is
5. Keep ALL URLs, file paths, IP addresses, port numbers as-is
6. Keep ALL CSS property names and values as-is
7. Keep ALL JavaScript code as-is
8. Change lang="en" to lang="{target_lang[:2]}"
9. Return ONLY the translated HTML, no explanations

Here is the HTML to translate:

{html_content}"""

    payload = json.dumps({
        'model': 'qwen-turbo',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
        'max_tokens': 16000
    }).encode('utf-8')

    req = urllib.request.Request(API_URL, data=payload, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {API_KEY}')

    with urllib.request.urlopen(req, timeout=180) as response:
        data = json.loads(response.read().decode())
        return data['choices'][0]['message']['content'].strip()


def main():
    html_files = sorted([f for f in os.listdir(EN_DIR) if f.endswith('.html')])
    print(f"Found {len(html_files)} HTML files to translate", flush=True)

    # Only translate languages that need it
    langs_to_process = []
    for lang_code, lang_name in LANGUAGES.items():
        target_dir = os.path.join(DOCS_DIR, lang_code)
        os.makedirs(target_dir, exist_ok=True)
        
        # Check if already properly translated by reading full file
        sample_file = os.path.join(target_dir, 'firewall_ipv4.html')
        needs_translate = True
        if os.path.exists(sample_file):
            with open(sample_file, 'r', encoding='utf-8') as f:
                full_content = f.read()
            # Check for language-specific translated headings (search full file)
            if lang_code == 'zh' and ('IPv4 防火墙' in full_content):
                needs_translate = False
            elif lang_code == 'ru' and 'Настройка межсетевого экрана' in full_content:
                needs_translate = False
            elif lang_code == 'fr' and 'Configuration du pare-feu' in full_content:
                needs_translate = False
            elif lang_code == 'de' and 'Firewall-Konfiguration' in full_content:
                needs_translate = False
        
        if needs_translate:
            langs_to_process.append((lang_code, lang_name))
            print(f"  -> {lang_name} needs translation", flush=True)
        else:
            print(f"  -> {lang_name} already translated, skipping", flush=True)
    
    if not langs_to_process:
        print("All languages already translated!", flush=True)
        return

    for lang_code, lang_name in langs_to_process:
        target_dir = os.path.join(DOCS_DIR, lang_code)
        print(f"\n{'='*50}", flush=True)
        print(f"Translating to {lang_name} ({lang_code})...", flush=True)
        print(f"{'='*50}", flush=True)

        for i, filename in enumerate(html_files):
            src_file = os.path.join(EN_DIR, filename)
            dst_file = os.path.join(target_dir, filename)

            try:
                with open(src_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                translated = translate_file_with_qwen(content, lang_name)
                
                with open(dst_file, 'w', encoding='utf-8') as f:
                    f.write(translated)
                
                print(f"  [{i+1}/{len(html_files)}] {filename} OK", flush=True)
                time.sleep(1)  # Rate limiting
                
            except Exception as e:
                print(f"  [{i+1}/{len(html_files)}] {filename}: ERROR - {e}", flush=True)

        print(f"\n  Completed {lang_name}", flush=True)

    print("\nAll translations complete!", flush=True)


if __name__ == '__main__':
    main()
