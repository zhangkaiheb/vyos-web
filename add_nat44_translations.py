#!/usr/bin/env python3
import json

# 读取现有的 common.json
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 定义 VppNat44Page 需要的翻译键
translations = {
    "zh-CN": {
        "nat44": {
            "columns": {
                "name": "名称",
                "translationAddresses": "翻译地址",
                "translationInterfaces": "翻译接口",
                "ruleNumber": "规则号",
                "description": "描述",
                "externalInterface": "外部接口",
                "localAddress": "本地地址",
                "localPort": "本地端口",
                "externalAddress": "外部地址",
                "protocol": "协议"
            },
            "tabs": {
                "addressPool": "地址池",
                "excludeRules": "排除规则",
                "interfaces": "接口",
                "staticRules": "静态规则"
            },
            "modal": {
                "createPool": "新建地址池",
                "editPool": "编辑地址池",
                "createExcludeRule": "新建排除规则",
                "editExcludeRule": "编辑排除规则",
                "createStaticRule": "新建静态规则",
                "editStaticRule": "编辑静态规则"
            },
            "form": {
                "name": "名称",
                "translationAddresses": "翻译地址",
                "translationInterfaces": "翻译接口",
                "twiceNatAddresses": "Twice NAT地址",
                "twiceNatInterfaces": "Twice NAT接口",
                "ruleNumber": "规则号",
                "description": "描述",
                "externalInterface": "外部接口",
                "localAddress": "本地地址",
                "localPort": "本地端口",
                "externalAddress": "外部地址",
                "externalPort": "外部端口",
                "protocol": "协议",
                "insideInterface": "内部接口",
                "outsideInterface": "外部接口",
                "outToInOnly": "仅Out-to-In",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Twice NAT地址"
            },
            "placeholder": {
                "onePerLine": "每行一个",
                "ipv4Range": "每行一个IPv4/范围"
            },
            "protocol": {
                "all": "All (默认)"
            },
            "selectPoolFirst": "请选择要编辑的地址池",
            "poolNotFound": "未找到选中的地址池",
            "nameRequired": "请输入池名称",
            "selectRuleFirst": "请选择要编辑的规则",
            "ruleNotFound": "未找到选中的规则",
            "ruleNumberRequired": "请输入规则号"
        }
    },
    "zh-TW": {
        "nat44": {
            "columns": {
                "name": "名稱",
                "translationAddresses": "翻譯地址",
                "translationInterfaces": "翻譯接口",
                "ruleNumber": "規則號",
                "description": "描述",
                "externalInterface": "外部接口",
                "localAddress": "本地地址",
                "localPort": "本地端口",
                "externalAddress": "外部地址",
                "protocol": "協議"
            },
            "tabs": {
                "addressPool": "地址池",
                "excludeRules": "排除規則",
                "interfaces": "接口",
                "staticRules": "靜態規則"
            },
            "modal": {
                "createPool": "新建地址池",
                "editPool": "編輯地址池",
                "createExcludeRule": "新建排除規則",
                "editExcludeRule": "編輯排除規則",
                "createStaticRule": "新建靜態規則",
                "editStaticRule": "編輯靜態規則"
            },
            "form": {
                "name": "名稱",
                "translationAddresses": "翻譯地址",
                "translationInterfaces": "翻譯接口",
                "twiceNatAddresses": "Twice NAT地址",
                "twiceNatInterfaces": "Twice NAT接口",
                "ruleNumber": "規則號",
                "description": "描述",
                "externalInterface": "外部接口",
                "localAddress": "本地地址",
                "localPort": "本地端口",
                "externalAddress": "外部地址",
                "externalPort": "外部端口",
                "protocol": "協議",
                "insideInterface": "內部接口",
                "outsideInterface": "外部接口",
                "outToInOnly": "僅Out-to-In",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Twice NAT地址"
            },
            "placeholder": {
                "onePerLine": "每行一個",
                "ipv4Range": "每行一個IPv4/範圍"
            },
            "protocol": {
                "all": "All (默認)"
            },
            "selectPoolFirst": "請選擇要編輯的地址池",
            "poolNotFound": "未找到選中的地址池",
            "nameRequired": "請輸入池名稱",
            "selectRuleFirst": "請選擇要編輯的規則",
            "ruleNotFound": "未找到選中的規則",
            "ruleNumberRequired": "請輸入規則號"
        }
    },
    "en": {
        "nat44": {
            "columns": {
                "name": "Name",
                "translationAddresses": "Translation Addresses",
                "translationInterfaces": "Translation Interfaces",
                "ruleNumber": "Rule Number",
                "description": "Description",
                "externalInterface": "External Interface",
                "localAddress": "Local Address",
                "localPort": "Local Port",
                "externalAddress": "External Address",
                "protocol": "Protocol"
            },
            "tabs": {
                "addressPool": "Address Pool",
                "excludeRules": "Exclude Rules",
                "interfaces": "Interfaces",
                "staticRules": "Static Rules"
            },
            "modal": {
                "createPool": "Create Address Pool",
                "editPool": "Edit Address Pool",
                "createExcludeRule": "Create Exclude Rule",
                "editExcludeRule": "Edit Exclude Rule",
                "createStaticRule": "Create Static Rule",
                "editStaticRule": "Edit Static Rule"
            },
            "form": {
                "name": "Name",
                "translationAddresses": "Translation Addresses",
                "translationInterfaces": "Translation Interfaces",
                "twiceNatAddresses": "Twice NAT Addresses",
                "twiceNatInterfaces": "Twice NAT Interfaces",
                "ruleNumber": "Rule Number",
                "description": "Description",
                "externalInterface": "External Interface",
                "localAddress": "Local Address",
                "localPort": "Local Port",
                "externalAddress": "External Address",
                "externalPort": "External Port",
                "protocol": "Protocol",
                "insideInterface": "Inside Interface",
                "outsideInterface": "Outside Interface",
                "outToInOnly": "Out-to-In Only",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Twice NAT Address"
            },
            "placeholder": {
                "onePerLine": "One per line",
                "ipv4Range": "One IPv4/range per line"
            },
            "protocol": {
                "all": "All (Default)"
            },
            "selectPoolFirst": "Please select an address pool to edit",
            "poolNotFound": "Selected address pool not found",
            "nameRequired": "Please enter pool name",
            "selectRuleFirst": "Please select a rule to edit",
            "ruleNotFound": "Selected rule not found",
            "ruleNumberRequired": "Please enter rule number"
        }
    },
    "ru": {
        "nat44": {
            "columns": {
                "name": "Имя",
                "translationAddresses": "Адреса трансляции",
                "translationInterfaces": "Интерфейсы трансляции",
                "ruleNumber": "Номер правила",
                "description": "Описание",
                "externalInterface": "Внешний интерфейс",
                "localAddress": "Локальный адрес",
                "localPort": "Локальный порт",
                "externalAddress": "Внешний адрес",
                "protocol": "Протокол"
            },
            "tabs": {
                "addressPool": "Пул адресов",
                "excludeRules": "Правила исключения",
                "interfaces": "Интерфейсы",
                "staticRules": "Статические правила"
            },
            "modal": {
                "createPool": "Создать пул адресов",
                "editPool": "Редактировать пул адресов",
                "createExcludeRule": "Создать правило исключения",
                "editExcludeRule": "Редактировать правило исключения",
                "createStaticRule": "Создать статическое правило",
                "editStaticRule": "Редактировать статическое правило"
            },
            "form": {
                "name": "Имя",
                "translationAddresses": "Адреса трансляции",
                "translationInterfaces": "Интерфейсы трансляции",
                "twiceNatAddresses": "Адреса Twice NAT",
                "twiceNatInterfaces": "Интерфейсы Twice NAT",
                "ruleNumber": "Номер правила",
                "description": "Описание",
                "externalInterface": "Внешний интерфейс",
                "localAddress": "Локальный адрес",
                "localPort": "Локальный порт",
                "externalAddress": "Внешний адрес",
                "externalPort": "Внешний порт",
                "protocol": "Протокол",
                "insideInterface": "Внутренний интерфейс",
                "outsideInterface": "Внешний интерфейс",
                "outToInOnly": "Только Out-to-In",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Адрес Twice NAT"
            },
            "placeholder": {
                "onePerLine": "По одному в строке",
                "ipv4Range": "По одному IPv4/диапазону в строке"
            },
            "protocol": {
                "all": "Все (по умолчанию)"
            },
            "selectPoolFirst": "Выберите пул адресов для редактирования",
            "poolNotFound": "Выбранный пул адресов не найден",
            "nameRequired": "Введите имя пула",
            "selectRuleFirst": "Выберите правило для редактирования",
            "ruleNotFound": "Выбранное правило не найдено",
            "ruleNumberRequired": "Введите номер правила"
        }
    },
    "de": {
        "nat44": {
            "columns": {
                "name": "Name",
                "translationAddresses": "Übersetzungsadressen",
                "translationInterfaces": "Übersetzungsschnittstellen",
                "ruleNumber": "Regelnummer",
                "description": "Beschreibung",
                "externalInterface": "Externe Schnittstelle",
                "localAddress": "Lokale Adresse",
                "localPort": "Lokaler Port",
                "externalAddress": "Externe Adresse",
                "protocol": "Protokoll"
            },
            "tabs": {
                "addressPool": "Adresspool",
                "excludeRules": "Ausschlussregeln",
                "interfaces": "Schnittstellen",
                "staticRules": "Statische Regeln"
            },
            "modal": {
                "createPool": "Adresspool erstellen",
                "editPool": "Adresspool bearbeiten",
                "createExcludeRule": "Ausschlussregel erstellen",
                "editExcludeRule": "Ausschlussregel bearbeiten",
                "createStaticRule": "Statische Regel erstellen",
                "editStaticRule": "Statische Regel bearbeiten"
            },
            "form": {
                "name": "Name",
                "translationAddresses": "Übersetzungsadressen",
                "translationInterfaces": "Übersetzungsschnittstellen",
                "twiceNatAddresses": "Twice NAT Adressen",
                "twiceNatInterfaces": "Twice NAT Schnittstellen",
                "ruleNumber": "Regelnummer",
                "description": "Beschreibung",
                "externalInterface": "Externe Schnittstelle",
                "localAddress": "Lokale Adresse",
                "localPort": "Lokaler Port",
                "externalAddress": "Externe Adresse",
                "externalPort": "Externer Port",
                "protocol": "Protokoll",
                "insideInterface": "Innen-Schnittstelle",
                "outsideInterface": "Außen-Schnittstelle",
                "outToInOnly": "Nur Out-to-In",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Twice NAT Adresse"
            },
            "placeholder": {
                "onePerLine": "Eine pro Zeile",
                "ipv4Range": "Eine IPv4/Bereich pro Zeile"
            },
            "protocol": {
                "all": "Alle (Standard)"
            },
            "selectPoolFirst": "Bitte wählen Sie einen Adresspool zum Bearbeiten",
            "poolNotFound": "Ausgewählter Adresspool nicht gefunden",
            "nameRequired": "Bitte Poolnamen eingeben",
            "selectRuleFirst": "Bitte wählen Sie eine Regel zum Bearbeiten",
            "ruleNotFound": "Ausgewählte Regel nicht gefunden",
            "ruleNumberRequired": "Bitte Regelnummer eingeben"
        }
    },
    "fr": {
        "nat44": {
            "columns": {
                "name": "Nom",
                "translationAddresses": "Adresses de traduction",
                "translationInterfaces": "Interfaces de traduction",
                "ruleNumber": "Numéro de règle",
                "description": "Description",
                "externalInterface": "Interface externe",
                "localAddress": "Adresse locale",
                "localPort": "Port local",
                "externalAddress": "Adresse externe",
                "protocol": "Protocole"
            },
            "tabs": {
                "addressPool": "Pool d'adresses",
                "excludeRules": "Règles d'exclusion",
                "interfaces": "Interfaces",
                "staticRules": "Règles statiques"
            },
            "modal": {
                "createPool": "Créer un pool d'adresses",
                "editPool": "Modifier le pool d'adresses",
                "createExcludeRule": "Créer une règle d'exclusion",
                "editExcludeRule": "Modifier la règle d'exclusion",
                "createStaticRule": "Créer une règle statique",
                "editStaticRule": "Modifier la règle statique"
            },
            "form": {
                "name": "Nom",
                "translationAddresses": "Adresses de traduction",
                "translationInterfaces": "Interfaces de traduction",
                "twiceNatAddresses": "Adresses Twice NAT",
                "twiceNatInterfaces": "Interfaces Twice NAT",
                "ruleNumber": "Numéro de règle",
                "description": "Description",
                "externalInterface": "Interface externe",
                "localAddress": "Adresse locale",
                "localPort": "Port local",
                "externalAddress": "Adresse externe",
                "externalPort": "Port externe",
                "protocol": "Protocole",
                "insideInterface": "Interface interne",
                "outsideInterface": "Interface externe",
                "outToInOnly": "Out-to-In uniquement",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Adresse Twice NAT"
            },
            "placeholder": {
                "onePerLine": "Un par ligne",
                "ipv4Range": "Une IPv4/plage par ligne"
            },
            "protocol": {
                "all": "Tous (par défaut)"
            },
            "selectPoolFirst": "Veuillez sélectionner un pool d'adresses à modifier",
            "poolNotFound": "Pool d'adresses sélectionné introuvable",
            "nameRequired": "Veuillez entrer le nom du pool",
            "selectRuleFirst": "Veuillez sélectionner une règle à modifier",
            "ruleNotFound": "Règle sélectionnée introuvable",
            "ruleNumberRequired": "Veuillez entrer le numéro de règle"
        }
    },
    "ko": {
        "nat44": {
            "columns": {
                "name": "이름",
                "translationAddresses": "번역 주소",
                "translationInterfaces": "번역 인터페이스",
                "ruleNumber": "규칙 번호",
                "description": "설명",
                "externalInterface": "외부 인터페이스",
                "localAddress": "로컬 주소",
                "localPort": "로컬 포트",
                "externalAddress": "외부 주소",
                "protocol": "프로토콜"
            },
            "tabs": {
                "addressPool": "주소 풀",
                "excludeRules": "제외 규칙",
                "interfaces": "인터페이스",
                "staticRules": "정적 규칙"
            },
            "modal": {
                "createPool": "주소 풀 생성",
                "editPool": "주소 풀 편집",
                "createExcludeRule": "제외 규칙 생성",
                "editExcludeRule": "제외 규칙 편집",
                "createStaticRule": "정적 규칙 생성",
                "editStaticRule": "정적 규칙 편집"
            },
            "form": {
                "name": "이름",
                "translationAddresses": "번역 주소",
                "translationInterfaces": "번역 인터페이스",
                "twiceNatAddresses": "Twice NAT 주소",
                "twiceNatInterfaces": "Twice NAT 인터페이스",
                "ruleNumber": "규칙 번호",
                "description": "설명",
                "externalInterface": "외부 인터페이스",
                "localAddress": "로컬 주소",
                "localPort": "로컬 포트",
                "externalAddress": "외부 주소",
                "externalPort": "외부 포트",
                "protocol": "프로토콜",
                "insideInterface": "내부 인터페이스",
                "outsideInterface": "외부 인터페이스",
                "outToInOnly": "Out-to-In만",
                "selfTwiceNat": "Self Twice NAT",
                "twiceNat": "Twice NAT",
                "twiceNatAddress": "Twice NAT 주소"
            },
            "placeholder": {
                "onePerLine": "한 줄에 하나씩",
                "ipv4Range": "한 줄에 하나의 IPv4/범위"
            },
            "protocol": {
                "all": "모두 (기본값)"
            },
            "selectPoolFirst": "편집할 주소 풀을 선택하세요",
            "poolNotFound": "선택한 주소 풀을 찾을 수 없습니다",
            "nameRequired": "풀 이름을 입력하세요",
            "selectRuleFirst": "편집할 규칙을 선택하세요",
            "ruleNotFound": "선택한 규칙을 찾을 수 없습니다",
            "ruleNumberRequired": "규칙 번호를 입력하세요"
        }
    }
}

# 为每种语言添加翻译
for lang in ["zh-CN", "zh-TW", "en", "ru", "de", "fr", "ko"]:
    if lang in data:
        data[lang]["nat44"] = translations[lang]["nat44"]

# 保存回文件
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("翻译键已添加到 common.json")
