#!/usr/bin/env python3
import json

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Add error message translations for cgnat, nat.destination, and conntrack
translations = {
    'zh-CN': {
        'cgnat': {
            'loadFailed': '加载 CGNAT 配置失败',
            'saveRuleFailed': '保存 CGNAT 规则失败',
            'deleteRuleFailed': '删除 CGNAT 规则失败',
            'savePoolFailed': '保存 CGNAT 池失败',
            'deleteExternalPoolFailed': '删除外部池失败',
            'deleteInternalPoolFailed': '删除内部池失败',
            'setLoggingFailed': '设置日志分配失败'
        },
        'nat': {
            'destination': {
                'loadFailed': '加载目的 NAT 配置失败',
                'saveRuleFailed': '保存目的 NAT 规则失败',
                'deleteRuleFailed': '删除目的 NAT 规则失败'
            }
        },
        'conntrack': {
            'loadFailed': '加载配置失败',
            'saveBasicFailed': '保存基本设置失败',
            'saveTcpFailed': '保存 TCP 设置失败',
            'saveLoggingFailed': '保存日志设置失败',
            'saveModuleFailed': '保存模块设置失败',
            'saveIgnoreRuleFailed': '保存忽略规则失败',
            'deleteIgnoreRuleFailed': '删除忽略规则失败',
            'saveTimeoutRuleFailed': '保存自定义超时规则失败',
            'deleteTimeoutRuleFailed': '删除自定义超时规则失败'
        }
    },
    'zh-TW': {
        'cgnat': {
            'loadFailed': '載入 CGNAT 設定失敗',
            'saveRuleFailed': '儲存 CGNAT 規則失敗',
            'deleteRuleFailed': '刪除 CGNAT 規則失敗',
            'savePoolFailed': '儲存 CGNAT 池失敗',
            'deleteExternalPoolFailed': '刪除外部池失敗',
            'deleteInternalPoolFailed': '刪除內部池失敗',
            'setLoggingFailed': '設定日誌分配失敗'
        },
        'nat': {
            'destination': {
                'loadFailed': '載入目的 NAT 設定失敗',
                'saveRuleFailed': '儲存目的 NAT 規則失敗',
                'deleteRuleFailed': '刪除目的 NAT 規則失敗'
            }
        },
        'conntrack': {
            'loadFailed': '載入設定失敗',
            'saveBasicFailed': '儲存基本設定失敗',
            'saveTcpFailed': '儲存 TCP 設定失敗',
            'saveLoggingFailed': '儲存日誌設定失敗',
            'saveModuleFailed': '儲存模組設定失敗',
            'saveIgnoreRuleFailed': '儲存忽略規則失敗',
            'deleteIgnoreRuleFailed': '刪除忽略規則失敗',
            'saveTimeoutRuleFailed': '儲存自訂逾時規則失敗',
            'deleteTimeoutRuleFailed': '刪除自訂逾時規則失敗'
        }
    },
    'en': {
        'cgnat': {
            'loadFailed': 'Failed to load CGNAT configuration',
            'saveRuleFailed': 'Failed to save CGNAT rule',
            'deleteRuleFailed': 'Failed to delete CGNAT rule',
            'savePoolFailed': 'Failed to save CGNAT pool',
            'deleteExternalPoolFailed': 'Failed to delete external pool',
            'deleteInternalPoolFailed': 'Failed to delete internal pool',
            'setLoggingFailed': 'Failed to set logging allocation'
        },
        'nat': {
            'destination': {
                'loadFailed': 'Failed to load destination NAT configuration',
                'saveRuleFailed': 'Failed to save destination NAT rule',
                'deleteRuleFailed': 'Failed to delete destination NAT rule'
            }
        },
        'conntrack': {
            'loadFailed': 'Failed to load configuration',
            'saveBasicFailed': 'Failed to save basic settings',
            'saveTcpFailed': 'Failed to save TCP settings',
            'saveLoggingFailed': 'Failed to save logging settings',
            'saveModuleFailed': 'Failed to save module settings',
            'saveIgnoreRuleFailed': 'Failed to save ignore rule',
            'deleteIgnoreRuleFailed': 'Failed to delete ignore rule',
            'saveTimeoutRuleFailed': 'Failed to save custom timeout rule',
            'deleteTimeoutRuleFailed': 'Failed to delete custom timeout rule'
        }
    },
    'ru': {
        'cgnat': {
            'loadFailed': 'Не удалось загрузить конфигурацию CGNAT',
            'saveRuleFailed': 'Не удалось сохранить правило CGNAT',
            'deleteRuleFailed': 'Не удалось удалить правило CGNAT',
            'savePoolFailed': 'Не удалось сохранить пул CGNAT',
            'deleteExternalPoolFailed': 'Не удалось удалить внешний пул',
            'deleteInternalPoolFailed': 'Не удалось удалить внутренний пул',
            'setLoggingFailed': 'Не удалось настроить распределение журналов'
        },
        'nat': {
            'destination': {
                'loadFailed': 'Не удалось загрузить конфигурацию NAT назначения',
                'saveRuleFailed': 'Не удалось сохранить правило NAT назначения',
                'deleteRuleFailed': 'Не удалось удалить правило NAT назначения'
            }
        },
        'conntrack': {
            'loadFailed': 'Не удалось загрузить конфигурацию',
            'saveBasicFailed': 'Не удалось сохранить основные настройки',
            'saveTcpFailed': 'Не удалось сохранить настройки TCP',
            'saveLoggingFailed': 'Не удалось сохранить настройки журнала',
            'saveModuleFailed': 'Не удалось сохранить настройки модуля',
            'saveIgnoreRuleFailed': 'Не удалось сохранить правило игнорирования',
            'deleteIgnoreRuleFailed': 'Не удалось удалить правило игнорирования',
            'saveTimeoutRuleFailed': 'Не удалось сохранить пользовательское правило тайм-аута',
            'deleteTimeoutRuleFailed': 'Не удалось удалить пользовательское правило тайм-аута'
        }
    },
    'de': {
        'cgnat': {
            'loadFailed': 'CGNAT-Konfiguration konnte nicht geladen werden',
            'saveRuleFailed': 'CGNAT-Regel konnte nicht gespeichert werden',
            'deleteRuleFailed': 'CGNAT-Regel konnte nicht gelöscht werden',
            'savePoolFailed': 'CGNAT-Pool konnte nicht gespeichert werden',
            'deleteExternalPoolFailed': 'Externer Pool konnte nicht gelöscht werden',
            'deleteInternalPoolFailed': 'Interner Pool konnte nicht gelöscht werden',
            'setLoggingFailed': 'Protokollzuweisung konnte nicht festgelegt werden'
        },
        'nat': {
            'destination': {
                'loadFailed': 'Destination-NAT-Konfiguration konnte nicht geladen werden',
                'saveRuleFailed': 'Destination-NAT-Regel konnte nicht gespeichert werden',
                'deleteRuleFailed': 'Destination-NAT-Regel konnte nicht gelöscht werden'
            }
        },
        'conntrack': {
            'loadFailed': 'Konfiguration konnte nicht geladen werden',
            'saveBasicFailed': 'Grundeinstellungen konnten nicht gespeichert werden',
            'saveTcpFailed': 'TCP-Einstellungen konnten nicht gespeichert werden',
            'saveLoggingFailed': 'Protokolleinstellungen konnten nicht gespeichert werden',
            'saveModuleFailed': 'Moduleinstellungen konnten nicht gespeichert werden',
            'saveIgnoreRuleFailed': 'Ignorierungsregel konnte nicht gespeichert werden',
            'deleteIgnoreRuleFailed': 'Ignorierungsregel konnte nicht gelöscht werden',
            'saveTimeoutRuleFailed': 'Benutzerdefinierte Timeout-Regel konnte nicht gespeichert werden',
            'deleteTimeoutRuleFailed': 'Benutzerdefinierte Timeout-Regel konnte nicht gelöscht werden'
        }
    },
    'fr': {
        'cgnat': {
            'loadFailed': 'Échec du chargement de la configuration CGNAT',
            'saveRuleFailed': 'Échec de l\'enregistrement de la règle CGNAT',
            'deleteRuleFailed': 'Échec de la suppression de la règle CGNAT',
            'savePoolFailed': 'Échec de l\'enregistrement du pool CGNAT',
            'deleteExternalPoolFailed': 'Échec de la suppression du pool externe',
            'deleteInternalPoolFailed': 'Échec de la suppression du pool interne',
            'setLoggingFailed': 'Échec de la définition de l\'allocation des journaux'
        },
        'nat': {
            'destination': {
                'loadFailed': 'Échec du chargement de la configuration NAT de destination',
                'saveRuleFailed': 'Échec de l\'enregistrement de la règle NAT de destination',
                'deleteRuleFailed': 'Échec de la suppression de la règle NAT de destination'
            }
        },
        'conntrack': {
            'loadFailed': 'Échec du chargement de la configuration',
            'saveBasicFailed': 'Échec de l\'enregistrement des paramètres de base',
            'saveTcpFailed': 'Échec de l\'enregistrement des paramètres TCP',
            'saveLoggingFailed': 'Échec de l\'enregistrement des paramètres de journalisation',
            'saveModuleFailed': 'Échec de l\'enregistrement des paramètres du module',
            'saveIgnoreRuleFailed': 'Échec de l\'enregistrement de la règle d\'ignorance',
            'deleteIgnoreRuleFailed': 'Échec de la suppression de la règle d\'ignorance',
            'saveTimeoutRuleFailed': 'Échec de l\'enregistrement de la règle de délai personnalisée',
            'deleteTimeoutRuleFailed': 'Échec de la suppression de la règle de délai personnalisée'
        }
    },
    'ko': {
        'cgnat': {
            'loadFailed': 'CGNAT 구성을 로드하지 못했습니다',
            'saveRuleFailed': 'CGNAT 규칙을 저장하지 못했습니다',
            'deleteRuleFailed': 'CGNAT 규칙을 삭제하지 못했습니다',
            'savePoolFailed': 'CGNAT 풀을 저장하지 못했습니다',
            'deleteExternalPoolFailed': '외부 풀을 삭제하지 못했습니다',
            'deleteInternalPoolFailed': '내부 풀을 삭제하지 못했습니다',
            'setLoggingFailed': '로그 할당을 설정하지 못했습니다'
        },
        'nat': {
            'destination': {
                'loadFailed': '목적 NAT 구성을 로드하지 못했습니다',
                'saveRuleFailed': '목적 NAT 규칙을 저장하지 못했습니다',
                'deleteRuleFailed': '목적 NAT 규칙을 삭제하지 못했습니다'
            }
        },
        'conntrack': {
            'loadFailed': '구성을 로드하지 못했습니다',
            'saveBasicFailed': '기본 설정을 저장하지 못했습니다',
            'saveTcpFailed': 'TCP 설정을 저장하지 못했습니다',
            'saveLoggingFailed': '로그 설정을 저장하지 못했습니다',
            'saveModuleFailed': '모듈 설정을 저장하지 못했습니다',
            'saveIgnoreRuleFailed': '무시 규칙을 저장하지 못했습니다',
            'deleteIgnoreRuleFailed': '무시 규칙을 삭제하지 못했습니다',
            'saveTimeoutRuleFailed': '사용자 정의 시간 초과 규칙을 저장하지 못했습니다',
            'deleteTimeoutRuleFailed': '사용자 정의 시간 초과 규칙을 삭제하지 못했습니다'
        }
    }
}

# Apply translations
for lang, trans in translations.items():
    if lang not in data:
        data[lang] = {}
    
    # Add cgnat translations
    if 'cgnat' in trans:
        data[lang]['cgnat'] = trans['cgnat']
    
    # Add/update nat.destination translations
    if 'nat' in trans and 'destination' in trans['nat']:
        if 'nat' not in data[lang]:
            data[lang]['nat'] = {}
        if 'destination' not in data[lang]['nat']:
            data[lang]['nat']['destination'] = {}
        data[lang]['nat']['destination'].update(trans['nat']['destination'])
    
    # Add conntrack translations
    if 'conntrack' in trans:
        data[lang]['conntrack'] = trans['conntrack']

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! Added error message translations for cgnat, nat.destination, and conntrack.")
