#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import requests
import time

API_KEY = "sk-c14b3519b9c34ed6bf2b200639c5c76f"
API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"

def translate_text(text, target_lang):
    lang_map = {
        'zh-TW': '繁体中文',
        'en': '英文',
        'ru': '俄文',
        'de': '德文',
        'fr': '法文',
        'ko': '韩文'
    }
    target = lang_map.get(target_lang, target_lang)

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "qwen-turbo",
        "messages": [
            {"role": "system", "content": f"你是一个专业的网络配置界面翻译专家。将以下简体中文翻译成{target}。只返回翻译结果，不要解释。保持JSON格式不变。保留技术术语如 DHCP, DHCPv6, ACL, GRE, IPIP, VXLAN, MAC, IP, MTU, VRF, TLS, API, CORS, GraphQL, JWT 等不翻译。"},
            {"role": "user", "content": text}
        ],
        "temperature": 0.1
    }

    try:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=180)
        resp.raise_for_status()
        result = resp.json()
        return result['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"翻译失败: {e}")
        return None

def translate_dict(d, target_lang):
    """递归翻译字典"""
    if isinstance(d, str):
        translated = translate_text(d, target_lang)
        return translated if translated else d
    elif isinstance(d, dict):
        result = {}
        for k, v in d.items():
            result[k] = translate_dict(v, target_lang)
        return result
    elif isinstance(d, list):
        return [translate_dict(item, target_lang) for item in d]
    else:
        return d

# 读取 common.json
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 中文源数据
zh_cn = data.get('zh-CN', {})

# 需要翻译的键
keys_to_translate = [
    'dhcpStaticMappings', 'dhcpv6StaticMappings', 'containerNetwork',
    'vppInterfaces', 'vppAcl', 'https', 'igmpProxy', 'interfaceStats'
]

# 翻译目标语言
target_langs = ['zh-TW', 'en', 'ru', 'de', 'fr', 'ko']

for lang in target_langs:
    print(f"\n=== 开始翻译 {lang} ===")
    if lang not in data:
        data[lang] = {}

    for key in keys_to_translate:
        if key in zh_cn:
            source = zh_cn[key]
            print(f"翻译 {key}...")
            translated = translate_dict(source, lang)
            data[lang][key] = translated
            time.sleep(0.5)

    # 翻译 firewall.tabs 和 firewall.columns
    if 'firewall' in zh_cn:
        if 'firewall' not in data[lang]:
            data[lang]['firewall'] = {}
        if 'tabs' in zh_cn['firewall']:
            print(f"翻译 firewall.tabs...")
            data[lang]['firewall']['tabs'] = translate_dict(zh_cn['firewall']['tabs'], lang)
            time.sleep(0.5)
        if 'columns' in zh_cn['firewall']:
            print(f"翻译 firewall.columns...")
            data[lang]['firewall']['columns'] = translate_dict(zh_cn['firewall']['columns'], lang)
            time.sleep(0.5)

    print(f"=== {lang} 翻译完成 ===")

# 写回文件
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n所有翻译完成！")
