#!/usr/bin/env python3
import json

# 读取现有的 common.json
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 定义 VppKernelInterfacesPage 需要的翻译键
translations = {
    "zh-CN": {
        "vppKernel": {
            "columns": {
                "name": "名称",
                "description": "描述",
                "address": "地址",
                "rxMode": "RX模式",
                "disable": "禁用",
                "vifCount": "VIF数"
            },
            "modal": {
                "createInterface": "新建内核接口",
                "editInterface": "编辑内核接口",
                "editVif": "编辑VIF",
                "addVif": "添加VIF"
            },
            "form": {
                "name": "名称",
                "description": "描述",
                "address": "地址",
                "mtu": "最大传输单元",
                "rxMode": "RX模式",
                "disable": "禁用"
            },
            "placeholder": {
                "addressPerLine": "每行一个IP/dhcp/dhcpv6"
            },
            "rxMode": {
                "notSet": "未设置"
            },
            "sections": {
                "vifManagement": "VIF管理"
            },
            "buttons": {
                "addVif": "添加VIF"
            },
            "selectInterfaceFirst": "请选择要编辑的接口",
            "interfaceNotFound": "未找到选中的接口",
            "nameRequired": "请输入接口名称",
            "selectVifFirst": "请选择要编辑的VIF",
            "vifNotFound": "未找到选中的VIF",
            "vlanIdRequired": "请输入VLAN ID"
        }
    },
    "zh-TW": {
        "vppKernel": {
            "columns": {
                "name": "名稱",
                "description": "描述",
                "address": "地址",
                "rxMode": "RX模式",
                "disable": "禁用",
                "vifCount": "VIF數"
            },
            "modal": {
                "createInterface": "新建內核接口",
                "editInterface": "編輯內核接口",
                "editVif": "編輯VIF",
                "addVif": "添加VIF"
            },
            "form": {
                "name": "名稱",
                "description": "描述",
                "address": "地址",
                "mtu": "最大傳輸單元",
                "rxMode": "RX模式",
                "disable": "禁用"
            },
            "placeholder": {
                "addressPerLine": "每行一個IP/dhcp/dhcpv6"
            },
            "rxMode": {
                "notSet": "未設置"
            },
            "sections": {
                "vifManagement": "VIF管理"
            },
            "buttons": {
                "addVif": "添加VIF"
            },
            "selectInterfaceFirst": "請選擇要編輯的接口",
            "interfaceNotFound": "未找到選中的接口",
            "nameRequired": "請輸入接口名稱",
            "selectVifFirst": "請選擇要編輯的VIF",
            "vifNotFound": "未找到選中的VIF",
            "vlanIdRequired": "請輸入VLAN ID"
        }
    },
    "en": {
        "vppKernel": {
            "columns": {
                "name": "Name",
                "description": "Description",
                "address": "Address",
                "rxMode": "RX Mode",
                "disable": "Disable",
                "vifCount": "VIF Count"
            },
            "modal": {
                "createInterface": "Create Kernel Interface",
                "editInterface": "Edit Kernel Interface",
                "editVif": "Edit VIF",
                "addVif": "Add VIF"
            },
            "form": {
                "name": "Name",
                "description": "Description",
                "address": "Address",
                "mtu": "Maximum Transmission Unit",
                "rxMode": "RX Mode",
                "disable": "Disable"
            },
            "placeholder": {
                "addressPerLine": "One IP/dhcp/dhcpv6 per line"
            },
            "rxMode": {
                "notSet": "Not Set"
            },
            "sections": {
                "vifManagement": "VIF Management"
            },
            "buttons": {
                "addVif": "Add VIF"
            },
            "selectInterfaceFirst": "Please select an interface to edit",
            "interfaceNotFound": "Selected interface not found",
            "nameRequired": "Please enter interface name",
            "selectVifFirst": "Please select a VIF to edit",
            "vifNotFound": "Selected VIF not found",
            "vlanIdRequired": "Please enter VLAN ID"
        }
    },
    "ru": {
        "vppKernel": {
            "columns": {
                "name": "Имя",
                "description": "Описание",
                "address": "Адрес",
                "rxMode": "Режим RX",
                "disable": "Отключить",
                "vifCount": "Количество VIF"
            },
            "modal": {
                "createInterface": "Создать интерфейс ядра",
                "editInterface": "Редактировать интерфейс ядра",
                "editVif": "Редактировать VIF",
                "addVif": "Добавить VIF"
            },
            "form": {
                "name": "Имя",
                "description": "Описание",
                "address": "Адрес",
                "mtu": "Максимальная единица передачи",
                "rxMode": "Режим RX",
                "disable": "Отключить"
            },
            "placeholder": {
                "addressPerLine": "Один IP/dhcp/dhcpv6 в строке"
            },
            "rxMode": {
                "notSet": "Не установлено"
            },
            "sections": {
                "vifManagement": "Управление VIF"
            },
            "buttons": {
                "addVif": "Добавить VIF"
            },
            "selectInterfaceFirst": "Выберите интерфейс для редактирования",
            "interfaceNotFound": "Выбранный интерфейс не найден",
            "nameRequired": "Введите имя интерфейса",
            "selectVifFirst": "Выберите VIF для редактирования",
            "vifNotFound": "Выбранный VIF не найден",
            "vlanIdRequired": "Введите VLAN ID"
        }
    },
    "de": {
        "vppKernel": {
            "columns": {
                "name": "Name",
                "description": "Beschreibung",
                "address": "Adresse",
                "rxMode": "RX-Modus",
                "disable": "Deaktivieren",
                "vifCount": "VIF-Anzahl"
            },
            "modal": {
                "createInterface": "Kernel-Schnittstelle erstellen",
                "editInterface": "Kernel-Schnittstelle bearbeiten",
                "editVif": "VIF bearbeiten",
                "addVif": "VIF hinzufügen"
            },
            "form": {
                "name": "Name",
                "description": "Beschreibung",
                "address": "Adresse",
                "mtu": "Maximale Übertragungseinheit",
                "rxMode": "RX-Modus",
                "disable": "Deaktivieren"
            },
            "placeholder": {
                "addressPerLine": "Eine IP/dhcp/dhcpv6 pro Zeile"
            },
            "rxMode": {
                "notSet": "Nicht gesetzt"
            },
            "sections": {
                "vifManagement": "VIF-Verwaltung"
            },
            "buttons": {
                "addVif": "VIF hinzufügen"
            },
            "selectInterfaceFirst": "Bitte wählen Sie eine Schnittstelle zum Bearbeiten",
            "interfaceNotFound": "Ausgewählte Schnittstelle nicht gefunden",
            "nameRequired": "Bitte Schnittstellennamen eingeben",
            "selectVifFirst": "Bitte wählen Sie einen VIF zum Bearbeiten",
            "vifNotFound": "Ausgewählter VIF nicht gefunden",
            "vlanIdRequired": "Bitte VLAN ID eingeben"
        }
    },
    "fr": {
        "vppKernel": {
            "columns": {
                "name": "Nom",
                "description": "Description",
                "address": "Adresse",
                "rxMode": "Mode RX",
                "disable": "Désactiver",
                "vifCount": "Nombre de VIF"
            },
            "modal": {
                "createInterface": "Créer une interface noyau",
                "editInterface": "Modifier l'interface noyau",
                "editVif": "Modifier le VIF",
                "addVif": "Ajouter un VIF"
            },
            "form": {
                "name": "Nom",
                "description": "Description",
                "address": "Adresse",
                "mtu": "Unité de transmission maximale",
                "rxMode": "Mode RX",
                "disable": "Désactiver"
            },
            "placeholder": {
                "addressPerLine": "Une IP/dhcp/dhcpv6 par ligne"
            },
            "rxMode": {
                "notSet": "Non défini"
            },
            "sections": {
                "vifManagement": "Gestion des VIF"
            },
            "buttons": {
                "addVif": "Ajouter un VIF"
            },
            "selectInterfaceFirst": "Veuillez sélectionner une interface à modifier",
            "interfaceNotFound": "Interface sélectionnée introuvable",
            "nameRequired": "Veuillez entrer le nom de l'interface",
            "selectVifFirst": "Veuillez sélectionner un VIF à modifier",
            "vifNotFound": "VIF sélectionné introuvable",
            "vlanIdRequired": "Veuillez entrer l'ID VLAN"
        }
    },
    "ko": {
        "vppKernel": {
            "columns": {
                "name": "이름",
                "description": "설명",
                "address": "주소",
                "rxMode": "RX 모드",
                "disable": "비활성화",
                "vifCount": "VIF 수"
            },
            "modal": {
                "createInterface": "커널 인터페이스 생성",
                "editInterface": "커널 인터페이스 편집",
                "editVif": "VIF 편집",
                "addVif": "VIF 추가"
            },
            "form": {
                "name": "이름",
                "description": "설명",
                "address": "주소",
                "mtu": "최대 전송 단위",
                "rxMode": "RX 모드",
                "disable": "비활성화"
            },
            "placeholder": {
                "addressPerLine": "한 줄에 하나의 IP/dhcp/dhcpv6"
            },
            "rxMode": {
                "notSet": "설정되지 않음"
            },
            "sections": {
                "vifManagement": "VIF 관리"
            },
            "buttons": {
                "addVif": "VIF 추가"
            },
            "selectInterfaceFirst": "편집할 인터페이스를 선택하세요",
            "interfaceNotFound": "선택한 인터페이스를 찾을 수 없습니다",
            "nameRequired": "인터페이스 이름을 입력하세요",
            "selectVifFirst": "편집할 VIF를 선택하세요",
            "vifNotFound": "선택한 VIF를 찾을 수 없습니다",
            "vlanIdRequired": "VLAN ID를 입력하세요"
        }
    }
}

# 为每种语言添加翻译
for lang in ["zh-CN", "zh-TW", "en", "ru", "de", "fr", "ko"]:
    if lang in data:
        data[lang]["vppKernel"] = translations[lang]["vppKernel"]

# 保存回文件
with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("翻译键已添加到 common.json")
