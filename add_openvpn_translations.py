#!/usr/bin/env python3
import json

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# zh-CN openvpn translations
zh_CN = {
    "clientNameRequired": "请输入客户端名称",
    "selectClientFirst": "请选择要删除的客户端",
    "interfaceNameRequired": "请输入接口名称",
    "modeRequired": "请选择模式",
    "selectInterfaceFirst": "请选择要删除的 OpenVPN 接口"
}

# Apply to all languages
translations = {
    'zh-CN': zh_CN,
    'zh-TW': {
        "clientNameRequired": "請輸入客戶端名稱",
        "selectClientFirst": "請選擇要刪除的客戶端",
        "interfaceNameRequired": "請輸入介面名稱",
        "modeRequired": "請選擇模式",
        "selectInterfaceFirst": "請選擇要刪除的 OpenVPN 介面"
    },
    'en': {
        "clientNameRequired": "Please enter client name",
        "selectClientFirst": "Please select clients to delete",
        "interfaceNameRequired": "Please enter interface name",
        "modeRequired": "Please select mode",
        "selectInterfaceFirst": "Please select OpenVPN interfaces to delete"
    },
    'ru': {
        "clientNameRequired": "Введите имя клиента",
        "selectClientFirst": "Выберите клиенты для удаления",
        "interfaceNameRequired": "Введите имя интерфейса",
        "modeRequired": "Выберите режим",
        "selectInterfaceFirst": "Выберите интерфейсы OpenVPN для удаления"
    },
    'de': {
        "clientNameRequired": "Bitte Client-Namen eingeben",
        "selectClientFirst": "Bitte Clients zum Löschen auswählen",
        "interfaceNameRequired": "Bitte Schnittstellennamen eingeben",
        "modeRequired": "Bitte Modus auswählen",
        "selectInterfaceFirst": "Bitte OpenVPN-Schnittstellen zum Löschen auswählen"
    },
    'fr': {
        "clientNameRequired": "Veuillez entrer le nom du client",
        "selectClientFirst": "Veuillez sélectionner les clients à supprimer",
        "interfaceNameRequired": "Veuillez entrer le nom de l'interface",
        "modeRequired": "Veuillez sélectionner le mode",
        "selectInterfaceFirst": "Veuillez sélectionner les interfaces OpenVPN à supprimer"
    },
    'ko': {
        "clientNameRequired": "클라이언트 이름을 입력하세요",
        "selectClientFirst": "삭제할 클라이언트를 선택하세요",
        "interfaceNameRequired": "인터페이스 이름을 입력하세요",
        "modeRequired": "모드를 선택하세요",
        "selectInterfaceFirst": "삭제할 OpenVPN 인터페이스를 선택하세요"
    }
}

for lang, trans in translations.items():
    if lang not in data:
        data[lang] = {}
    data[lang]['openvpn'] = trans

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! Added openvpn translations for all 7 languages.")
