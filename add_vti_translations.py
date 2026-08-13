#!/usr/bin/env python3
import json

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# zh-CN vti translations
zh_CN = {
    "name": "接口名称",
    "description": "描述",
    "mtu": "MTU",
    "vrf": "VRF",
    "disable": "禁用",
    "actions": "操作",
    "name_placeholder": "如 vti0",
    "name_help": "VTI 接口名称",
    "description_placeholder": "接口描述",
    "mtu_placeholder": "68-16000",
    "mtu_help": "最大传输单元",
    "vrf_placeholder": "VRF 名称",
    "disable_interface": "禁用接口",
    "disable_interface_help": "管理性禁用接口",
    "nameRequired": "请输入接口名称",
    "selectFirst": "请先选择要删除的 VTI 接口"
}

# Apply to all languages
translations = {
    'zh-CN': zh_CN,
    'zh-TW': {
        "name": "介面名稱",
        "description": "描述",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "停用",
        "actions": "操作",
        "name_placeholder": "如 vti0",
        "name_help": "VTI 介面名稱",
        "description_placeholder": "介面描述",
        "mtu_placeholder": "68-16000",
        "mtu_help": "最大傳輸單元",
        "vrf_placeholder": "VRF 名稱",
        "disable_interface": "停用介面",
        "disable_interface_help": "管理性停用介面",
        "nameRequired": "請輸入介面名稱",
        "selectFirst": "請先選擇要刪除的 VTI 介面"
    },
    'en': {
        "name": "Interface Name",
        "description": "Description",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "Disable",
        "actions": "Actions",
        "name_placeholder": "e.g. vti0",
        "name_help": "VTI interface name",
        "description_placeholder": "Interface description",
        "mtu_placeholder": "68-16000",
        "mtu_help": "Maximum transmission unit",
        "vrf_placeholder": "VRF name",
        "disable_interface": "Disable Interface",
        "disable_interface_help": "Administratively disable interface",
        "nameRequired": "Please enter interface name",
        "selectFirst": "Please select VTI interfaces to delete"
    },
    'ru': {
        "name": "Имя интерфейса",
        "description": "Описание",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "Отключить",
        "actions": "Действия",
        "name_placeholder": "напр. vti0",
        "name_help": "Имя интерфейса VTI",
        "description_placeholder": "Описание интерфейса",
        "mtu_placeholder": "68-16000",
        "mtu_help": "Максимальный размер передаваемых данных",
        "vrf_placeholder": "Имя VRF",
        "disable_interface": "Отключить интерфейс",
        "disable_interface_help": "Административно отключить интерфейс",
        "nameRequired": "Введите имя интерфейса",
        "selectFirst": "Выберите интерфейсы VTI для удаления"
    },
    'de': {
        "name": "Schnittstellenname",
        "description": "Beschreibung",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "Deaktivieren",
        "actions": "Aktionen",
        "name_placeholder": "z.B. vti0",
        "name_help": "VTI-Schnittstellenname",
        "description_placeholder": "Schnittstellenbeschreibung",
        "mtu_placeholder": "68-16000",
        "mtu_help": "Maximale Übertragungseinheit",
        "vrf_placeholder": "VRF-Name",
        "disable_interface": "Schnittstelle deaktivieren",
        "disable_interface_help": "Schnittstelle administrativ deaktivieren",
        "nameRequired": "Bitte Schnittstellennamen eingeben",
        "selectFirst": "Bitte VTI-Schnittstellen zum Löschen auswählen"
    },
    'fr': {
        "name": "Nom de l'interface",
        "description": "Description",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "Désactiver",
        "actions": "Actions",
        "name_placeholder": "ex. vti0",
        "name_help": "Nom de l'interface VTI",
        "description_placeholder": "Description de l'interface",
        "mtu_placeholder": "68-16000",
        "mtu_help": "Unité maximale de transmission",
        "vrf_placeholder": "Nom VRF",
        "disable_interface": "Désactiver l'interface",
        "disable_interface_help": "Désactiver l'interface administrativement",
        "nameRequired": "Veuillez entrer le nom de l'interface",
        "selectFirst": "Veuillez sélectionner les interfaces VTI à supprimer"
    },
    'ko': {
        "name": "인터페이스 이름",
        "description": "설명",
        "mtu": "MTU",
        "vrf": "VRF",
        "disable": "비활성화",
        "actions": "작업",
        "name_placeholder": "예: vti0",
        "name_help": "VTI 인터페이스 이름",
        "description_placeholder": "인터페이스 설명",
        "mtu_placeholder": "68-16000",
        "mtu_help": "최대 전송 단위",
        "vrf_placeholder": "VRF 이름",
        "disable_interface": "인터페이스 비활성화",
        "disable_interface_help": "관리적으로 인터페이스 비활성화",
        "nameRequired": "인터페이스 이름을 입력하세요",
        "selectFirst": "삭제할 VTI 인터페이스를 선택하세요"
    }
}

for lang, trans in translations.items():
    if lang not in data:
        data[lang] = {}
    if 'interface' not in data[lang]:
        data[lang]['interface'] = {}
    data[lang]['interface']['vti'] = trans

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! Added vti translations for all 7 languages.")
