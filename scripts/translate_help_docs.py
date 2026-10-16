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

API_KEY = os.environ.get('DASHSCOPE_API_KEY', '')
API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

if not API_KEY:
    print('Error: DASHSCOPE_API_KEY environment variable is not set.')
    print('Usage: DASHSCOPE_API_KEY=sk-xxx python3 translate_help_docs.py')
    sys.exit(1)

LANGUAGES = {
    'zh': 'Chinese (Simplified)',
    'ko': 'Korean',
    'ru': 'Russian',
    'fr': 'French',
    'de': 'German'
}


def translate_file_with_qwen(html_content, target_lang):
    """Translate entire HTML file content using Qwen API."""
    if target_lang == 'Chinese (Simplified)':
        lang_instruction = "Translate ALL visible text to Chinese (Simplified). Ensure complete translation - no English text should remain except for technical terms, commands, and code."
    else:
        lang_instruction = f"Translate ALL visible text to {target_lang}. Ensure complete translation - no English text should remain except for technical terms, commands, and code."

    prompt = f"""You are a professional technical translator specializing in network equipment documentation.

{lang_instruction}

CRITICAL RULES:
1. Translate ALL visible text content completely - headings, paragraphs, list items, table cells, links, strong/em text
2. Keep ALL HTML tags, attributes, CSS styles, class names, IDs, structure exactly as they are
3. Keep ALL VyOS CLI commands in ENGLISH (set, delete, run, show commands and their parameters)
4. Keep ALL technical terms that are commonly used in English in networking (ICMP, TCP, UDP, IPv4, IPv6, sysctl, etc.)
5. Keep ALL placeholders like <name>, <text>, <interface>, <1-999999>, <0-65535> etc. as-is
6. Keep ALL URLs, file paths, IP addresses, port numbers, RFC references as-is
7. Keep ALL CSS property names and values as-is
8. Keep ALL JavaScript code as-is
9. Change lang="en" to lang="{target_lang[:2]}"
10. Return ONLY the translated HTML, no explanations or markdown code blocks

IMPORTANT: Every single piece of visible text must be translated. Do not leave any English text untranslated except for the items listed above.

Here is the HTML to translate:

{html_content}"""

    payload = json.dumps({
        'model': 'qwen-plus',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
        'max_tokens': 16000
    }).encode('utf-8')

    req = urllib.request.Request(API_URL, data=payload, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {API_KEY}')

    with urllib.request.urlopen(req, timeout=300) as response:
        data = json.loads(response.read().decode())
        return data['choices'][0]['message']['content'].strip()


def main():
    # Allow specifying language via command line argument
    target_lang = sys.argv[1] if len(sys.argv) > 1 else None

    html_files = sorted([f for f in os.listdir(EN_DIR) if f.endswith('.html')])
    print(f"Found {len(html_files)} HTML files to translate", flush=True)

    # Only translate languages that need it
    langs_to_process = []
    for lang_code, lang_name in LANGUAGES.items():
        if target_lang and lang_code != target_lang:
            continue

        target_dir = os.path.join(DOCS_DIR, lang_code)
        os.makedirs(target_dir, exist_ok=True)

        # Force re-translation for Chinese due to quality issues
        if lang_code == 'zh':
            langs_to_process.append((lang_code, lang_name))
            print(f"  -> {lang_name} needs re-translation (forced)", flush=True)
            continue

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
                time.sleep(2)  # Rate limiting

            except Exception as e:
                print(f"  [{i+1}/{len(html_files)}] {filename}: ERROR - {e}", flush=True)

        print(f"\n  Completed {lang_name}", flush=True)

    print("\nAll translations complete!", flush=True)


if __name__ == '__main__':
    main()
