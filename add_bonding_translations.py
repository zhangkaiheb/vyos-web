#!/usr/bin/env python3
import json

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Get zh-CN bonding as reference
ref = data['zh-CN']['interface']['bonding']

# zh-TW translations
zh_TW = {
    "name": "介面名稱", "description": "描述", "mode": "模式", "member_count": "成員數",
    "mtu": "MTU", "disable": "停用", "actions": "操作",
    "name_placeholder": "如 bond0", "name_help": "Bonding 介面名稱",
    "description_placeholder": "介面描述",
    "mac": "MAC 位址", "mac_placeholder": "如 00:11:22:33:44:55", "mac_help": "硬體 MAC 位址",
    "mode_help": "Bonding 模式", "hash_policy": "雜湊策略", "hash_policy_help": "雜湊策略",
    "lacp_rate": "LACP 速率", "lacp_rate_help": "LACP 速率",
    "members": "成員介面", "members_placeholder": "選擇成員介面", "members_help": "Bonding 成員介面",
    "primary": "主介面", "primary_placeholder": "選擇主介面", "primary_help": "主介面",
    "min_links": "最小連結數", "min_links_placeholder": "0-16", "min_links_help": "最小活動連結數",
    "mii_mon_interval": "MII 監控間隔", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "MII 監控間隔(毫秒)",
    "mtu_placeholder": "68-16000", "mtu_help": "最大傳輸單元",
    "system_mac": "系統 MAC", "system_mac_placeholder": "如 00:11:22:33:44:55", "system_mac.help": "系統 MAC 位址",
    "disable_interface": "停用介面", "disable_interface_help": "管理性停用介面",
    "disable_link_detect": "停用連結偵測", "disable_link_detect_help": "停用連結偵測",
    "arp_interval": "ARP 間隔", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "ARP 監控間隔(毫秒)",
    "arp_targets": "ARP 目標", "arp_targets_placeholder": "每行一個 IP 位址", "arp_targets_help": "ARP 監控目標位址",
    "dhcp": {
        "client_id": "DHCP 客戶端 ID", "client_id_placeholder": "客戶端 ID", "client_id_help": "DHCP 客戶端識別符",
        "default_route_distance": "預設路由距離", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "DHCP 預設路由距離",
        "host_name": "主機名稱", "host_name_placeholder": "主機名稱", "host_name_help": "DHCP 主機名稱",
        "use_mtu": "使用 MTU", "use_mtu.help": "使用 MTU 進行 DHCP",
        "no_default_route": "無預設路由", "no_default_route.help": "不設定預設路由",
        "reject": "拒絕", "reject_placeholder": "每行一個 IP 位址", "reject.help": "拒絕來自這些位址的 DHCP 提供",
        "user_class": "使用者類別", "user_class_placeholder": "使用者類別", "user_class.help": "DHCP 使用者類別",
        "vendor_class_id": "供應商類別 ID", "vendor_class_id_placeholder": "供應商類別 ID", "vendor_class_id.help": "DHCP 供應商類別識別符"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "DHCPv6 唯一識別符",
        "no_release": "不釋放", "no_release.help": "不釋放 DHCPv6 位址",
        "no_request_dns": "不請求 DNS", "no_request_dns.help": "不請求 DNS 伺服器",
        "no_request_domain": "不請求網域名稱", "no_request_domain.help": "不請求網域名稱搜尋清單",
        "parameters_only": "僅參數", "parameters_only.help": "僅獲取參數，不獲取位址",
        "rapid_commit": "快速提交", "rapid_commit.help": "啟用快速提交",
        "temporary": "臨時", "temporary.help": "請求臨時位址"
    },
    "eapol": {
        "ca_certificate": "CA 憑證", "ca_certificate_placeholder": "CA 憑證路徑", "ca_certificate.help": "EAPoL CA 憑證",
        "certificate": "憑證", "certificate_placeholder": "憑證路徑", "certificate.help": "EAPoL 客戶端憑證",
        "passphrase": "密碼", "passphrase_placeholder": "密碼", "passphrase.help": "憑證密碼"
    },
    "evpn": {
        "es_df_pref": "ES DF 優先順序", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "EVPN  DF 優先順序",
        "es_id": "ES ID", "es_id_placeholder": "ES ID", "es_id.help": "EVPN 乙太網段 ID",
        "es_sys_mac": "ES 系統 MAC", "es_sys_mac_placeholder": "如 00:11:22:33:44:55", "es_sys_mac.help": "EVPN 乙太網段系統 MAC",
        "uplink": "上行連結", "uplink.help": "EVPN 上行連結"
    },
    "ip": {
        "adjust_mss": "調整 MSS", "adjust_mss_placeholder": "選擇 MSS 調整方式", "adjust_mss.help": "調整 TCP MSS",
        "arp_cache_timeout": "ARP 快取逾時", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "ARP 快取逾時(秒)",
        "disable_arp_filter": "停用 ARP 過濾", "disable_arp_filter.help": "停用 ARP 過濾",
        "disable_forwarding": "停用轉發", "disable_forwarding.help": "停用 IP 轉發",
        "enable_arp_accept": "啟用 ARP 接受", "enable_arp_accept.help": "接受非本地位址的 ARP",
        "enable_arp_announce": "啟用 ARP 通告", "enable_arp_announce.help": "通告本地位址的 ARP",
        "enable_arp_ignore": "啟用 ARP 忽略", "enable_arp_ignore.help": "忽略非目標介面的 ARP",
        "enable_directed_broadcast": "啟用定向廣播", "enable_directed_broadcast.help": "啟用定向廣播",
        "enable_proxy_arp": "啟用代理 ARP", "enable_proxy_arp.help": "啟用代理 ARP",
        "proxy_arp_pvlan": "代理 ARP PVLAN", "proxy_arp_pvlan.help": "私有 VLAN 代理 ARP",
        "source_validation": "來源驗證", "source_validation_placeholder": "選擇來源驗證模式", "source_validation.help": "反向路徑來源驗證 (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "接受 DAD", "accept_dad.help": "接受 DAD 模式",
        "autoconf": "自動設定", "autoconf.help": "啟用 IPv6 自動設定",
        "eui64": "EUI-64", "eui64_placeholder": "介面 ID", "eui64.help": "EUI-64 介面識別符",
        "no_default_link_local": "無預設連結本機", "no_default_link_local.help": "不自動設定連結本地位址",
        "adjust_mss": "調整 MSS", "adjust_mss_placeholder": "選擇 MSS 調整方式", "adjust_mss.help": "調整 TCP MSS",
        "base_reachable_time": "基礎可達時間", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "基礎可達時間(秒)",
        "disable_forwarding": "停用轉發", "disable_forwarding.help": "停用 IPv6 轉發",
        "dup_addr_detect_transmits": "重複位址偵測傳輸", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "重複位址偵測傳輸次數",
        "source_validation": "來源驗證", "source_validation_placeholder": "選擇來源驗證模式", "source_validation.help": "反向路徑來源驗證 (RFC3704)"
    },
    "nameRequired": "請輸入介面名稱",
    "selectInterfaceFirst": "請選擇要刪除的介面"
}

# en translations
en = {
    "name": "Interface Name", "description": "Description", "mode": "Mode", "member_count": "Members",
    "mtu": "MTU", "disable": "Disable", "actions": "Actions",
    "name_placeholder": "e.g. bond0", "name_help": "Bonding interface name",
    "description_placeholder": "Interface description",
    "mac": "MAC Address", "mac_placeholder": "e.g. 00:11:22:33:44:55", "mac_help": "Hardware MAC address",
    "mode_help": "Bonding mode", "hash_policy": "Hash Policy", "hash_policy_help": "Hash policy",
    "lacp_rate": "LACP Rate", "lacp_rate_help": "LACP rate",
    "members": "Member Interfaces", "members_placeholder": "Select member interfaces", "members_help": "Bonding member interfaces",
    "primary": "Primary", "primary_placeholder": "Select primary interface", "primary_help": "Primary interface",
    "min_links": "Min Links", "min_links_placeholder": "0-16", "min_links_help": "Minimum active links",
    "mii_mon_interval": "MII Monitor Interval", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "MII monitor interval (ms)",
    "mtu_placeholder": "68-16000", "mtu_help": "Maximum transmission unit",
    "system_mac": "System MAC", "system_mac_placeholder": "e.g. 00:11:22:33:44:55", "system_mac.help": "System MAC address",
    "disable_interface": "Disable Interface", "disable_interface_help": "Administratively disable interface",
    "disable_link_detect": "Disable Link Detect", "disable_link_detect_help": "Disable link detection",
    "arp_interval": "ARP Interval", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "ARP monitor interval (ms)",
    "arp_targets": "ARP Targets", "arp_targets_placeholder": "One IP address per line", "arp_targets_help": "ARP monitor target addresses",
    "dhcp": {
        "client_id": "DHCP Client ID", "client_id_placeholder": "Client ID", "client_id_help": "DHCP client identifier",
        "default_route_distance": "Default Route Distance", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "DHCP default route distance",
        "host_name": "Host Name", "host_name_placeholder": "Host name", "host_name_help": "DHCP host name",
        "use_mtu": "Use MTU", "use_mtu.help": "Use MTU for DHCP",
        "no_default_route": "No Default Route", "no_default_route.help": "Do not set default route",
        "reject": "Reject", "reject_placeholder": "One IP address per line", "reject.help": "Reject DHCP offers from these addresses",
        "user_class": "User Class", "user_class_placeholder": "User class", "user_class.help": "DHCP user class",
        "vendor_class_id": "Vendor Class ID", "vendor_class_id_placeholder": "Vendor class ID", "vendor_class_id.help": "DHCP vendor class identifier"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "DHCPv6 unique identifier",
        "no_release": "No Release", "no_release.help": "Do not release DHCPv6 address",
        "no_request_dns": "No Request DNS", "no_request_dns.help": "Do not request DNS servers",
        "no_request_domain": "No Request Domain", "no_request_domain.help": "Do not request domain search list",
        "parameters_only": "Parameters Only", "parameters_only.help": "Only get parameters, no addresses",
        "rapid_commit": "Rapid Commit", "rapid_commit.help": "Enable rapid commit",
        "temporary": "Temporary", "temporary.help": "Request temporary address"
    },
    "eapol": {
        "ca_certificate": "CA Certificate", "ca_certificate_placeholder": "CA certificate path", "ca_certificate.help": "EAPoL CA certificate",
        "certificate": "Certificate", "certificate_placeholder": "Certificate path", "certificate.help": "EAPoL client certificate",
        "passphrase": "Passphrase", "passphrase_placeholder": "Passphrase", "passphrase.help": "Certificate passphrase"
    },
    "evpn": {
        "es_df_pref": "ES DF Preference", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "EVPN DF preference",
        "es_id": "ES ID", "es_id_placeholder": "ES ID", "es_id.help": "EVPN ethernet segment ID",
        "es_sys_mac": "ES System MAC", "es_sys_mac_placeholder": "e.g. 00:11:22:33:44:55", "es_sys_mac.help": "EVPN ethernet segment system MAC",
        "uplink": "Uplink", "uplink.help": "EVPN uplink"
    },
    "ip": {
        "adjust_mss": "Adjust MSS", "adjust_mss_placeholder": "Select MSS adjustment", "adjust_mss.help": "Adjust TCP MSS",
        "arp_cache_timeout": "ARP Cache Timeout", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "ARP cache timeout (seconds)",
        "disable_arp_filter": "Disable ARP Filter", "disable_arp_filter.help": "Disable ARP filtering",
        "disable_forwarding": "Disable Forwarding", "disable_forwarding.help": "Disable IP forwarding",
        "enable_arp_accept": "Enable ARP Accept", "enable_arp_accept.help": "Accept ARP for non-local addresses",
        "enable_arp_announce": "Enable ARP Announce", "enable_arp_announce.help": "Announce ARP for local addresses",
        "enable_arp_ignore": "Enable ARP Ignore", "enable_arp_ignore.help": "Ignore ARP for non-target interfaces",
        "enable_directed_broadcast": "Enable Directed Broadcast", "enable_directed_broadcast.help": "Enable directed broadcast",
        "enable_proxy_arp": "Enable Proxy ARP", "enable_proxy_arp.help": "Enable proxy ARP",
        "proxy_arp_pvlan": "Proxy ARP PVLAN", "proxy_arp_pvlan.help": "Private VLAN proxy ARP",
        "source_validation": "Source Validation", "source_validation_placeholder": "Select source validation mode", "source_validation.help": "Reverse path source validation (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "Accept DAD", "accept_dad.help": "Accept DAD mode",
        "autoconf": "Autoconf", "autoconf.help": "Enable IPv6 autoconfiguration",
        "eui64": "EUI-64", "eui64_placeholder": "Interface ID", "eui64.help": "EUI-64 interface identifier",
        "no_default_link_local": "No Default Link-Local", "no_default_link_local.help": "Do not auto-configure link-local address",
        "adjust_mss": "Adjust MSS", "adjust_mss_placeholder": "Select MSS adjustment", "adjust_mss.help": "Adjust TCP MSS",
        "base_reachable_time": "Base Reachable Time", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "Base reachable time (seconds)",
        "disable_forwarding": "Disable Forwarding", "disable_forwarding.help": "Disable IPv6 forwarding",
        "dup_addr_detect_transmits": "DAD Transmits", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "Duplicate address detection transmits",
        "source_validation": "Source Validation", "source_validation_placeholder": "Select source validation mode", "source_validation.help": "Reverse path source validation (RFC3704)"
    },
    "nameRequired": "Please enter interface name",
    "selectInterfaceFirst": "Please select interfaces to delete"
}

# ru translations
ru = {
    "name": "Имя интерфейса", "description": "Описание", "mode": "Режим", "member_count": "Кол-во участников",
    "mtu": "MTU", "disable": "Отключить", "actions": "Действия",
    "name_placeholder": "напр. bond0", "name_help": "Имя интерфейса bonding",
    "description_placeholder": "Описание интерфейса",
    "mac": "MAC-адрес", "mac_placeholder": "напр. 00:11:22:33:44:55", "mac_help": "Аппаратный MAC-адрес",
    "mode_help": "Режим bonding", "hash_policy": "Политика хеширования", "hash_policy_help": "Политика хеширования",
    "lacp_rate": "Частота LACP", "lacp_rate_help": "Частота LACP",
    "members": "Интерфейсы-участники", "members_placeholder": "Выберите интерфейсы", "members_help": "Интерфейсы-участники bonding",
    "primary": "Основной", "primary_placeholder": "Выберите основной интерфейс", "primary_help": "Основной интерфейс",
    "min_links": "Мин. ссылок", "min_links_placeholder": "0-16", "min_links_help": "Минимальное количество активных ссылок",
    "mii_mon_interval": "Интервал мониторинга MII", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "Интервал мониторинга MII (мс)",
    "mtu_placeholder": "68-16000", "mtu_help": "Максимальный размер передаваемых данных",
    "system_mac": "Системный MAC", "system_mac_placeholder": "напр. 00:11:22:33:44:55", "system_mac.help": "Системный MAC-адрес",
    "disable_interface": "Отключить интерфейс", "disable_interface_help": "Административно отключить интерфейс",
    "disable_link_detect": "Отключить обнаружение канала", "disable_link_detect_help": "Отключить обнаружение канала",
    "arp_interval": "Интервал ARP", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "Интервал мониторинга ARP (мс)",
    "arp_targets": "Цели ARP", "arp_targets_placeholder": "Один IP-адрес на строку", "arp_targets_help": "Целевые адреса мониторинга ARP",
    "dhcp": {
        "client_id": "ID клиента DHCP", "client_id_placeholder": "ID клиента", "client_id_help": "Идентификатор клиента DHCP",
        "default_route_distance": "Расстояние маршрута по умолчанию", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "Расстояние маршрута DHCP по умолчанию",
        "host_name": "Имя хоста", "host_name_placeholder": "Имя хоста", "host_name_help": "Имя хоста DHCP",
        "use_mtu": "Использовать MTU", "use_mtu.help": "Использовать MTU для DHCP",
        "no_default_route": "Без маршрута по умолчанию", "no_default_route.help": "Не устанавливать маршрут по умолчанию",
        "reject": "Отклонить", "reject_placeholder": "Один IP-адрес на строку", "reject.help": "Отклонить предложения DHCP с этих адресов",
        "user_class": "Класс пользователя", "user_class_placeholder": "Класс пользователя", "user_class.help": "Класс пользователя DHCP",
        "vendor_class_id": "ID класса вендора", "vendor_class_id_placeholder": "ID класса вендора", "vendor_class_id.help": "Идентификатор класса вендора DHCP"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "Уникальный идентификатор DHCPv6",
        "no_release": "Не освобождать", "no_release.help": "Не освобождать адрес DHCPv6",
        "no_request_dns": "Не запрашивать DNS", "no_request_dns.help": "Не запрашивать DNS-серверы",
        "no_request_domain": "Не запрашивать домен", "no_request_domain.help": "Не запрашивать список поиска доменов",
        "parameters_only": "Только параметры", "parameters_only.help": "Получать только параметры, без адресов",
        "rapid_commit": "Быстрая фиксация", "rapid_commit.help": "Включить быструю фиксацию",
        "temporary": "Временный", "temporary.help": "Запросить временный адрес"
    },
    "eapol": {
        "ca_certificate": "Сертификат CA", "ca_certificate_placeholder": "Путь к сертификату CA", "ca_certificate.help": "Сертификат CA EAPoL",
        "certificate": "Сертификат", "certificate_placeholder": "Путь к сертификату", "certificate.help": "Клиентский сертификат EAPoL",
        "passphrase": "Парольная фраза", "passphrase_placeholder": "Парольная фраза", "passphrase.help": "Парольная фраза сертификата"
    },
    "evpn": {
        "es_df_pref": "Предпочтение ES DF", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "Предпочтение EVPN DF",
        "es_id": "ES ID", "es_id_placeholder": "ES ID", "es_id.help": "ID сегмента Ethernet EVPN",
        "es_sys_mac": "Системный MAC ES", "es_sys_mac_placeholder": "напр. 00:11:22:33:44:55", "es_sys_mac.help": "Системный MAC сегмента Ethernet EVPN",
        "uplink": "Восходящий канал", "uplink.help": "Восходящий канал EVPN"
    },
    "ip": {
        "adjust_mss": "Настроить MSS", "adjust_mss_placeholder": "Выберите настройку MSS", "adjust_mss.help": "Настроить TCP MSS",
        "arp_cache_timeout": "Тайм-аут кэша ARP", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "Тайм-аут кэша ARP (сек)",
        "disable_arp_filter": "Отключить фильтр ARP", "disable_arp_filter.help": "Отключить фильтрацию ARP",
        "disable_forwarding": "Отключить пересылку", "disable_forwarding.help": "Отключить пересылку IP",
        "enable_arp_accept": "Включить приём ARP", "enable_arp_accept.help": "Принимать ARP для нелокальных адресов",
        "enable_arp_announce": "Включить объявление ARP", "enable_arp_announce.help": "Объявлять ARP для локальных адресов",
        "enable_arp_ignore": "Включить игнорирование ARP", "enable_arp_ignore.help": "Игнорировать ARP для нецелевых интерфейсов",
        "enable_directed_broadcast": "Включить направленную трансляцию", "enable_directed_broadcast.help": "Включить направленную трансляцию",
        "enable_proxy_arp": "Включить прокси ARP", "enable_proxy_arp.help": "Включить прокси ARP",
        "proxy_arp_pvlan": "Прокси ARP PVLAN", "proxy_arp_pvlan.help": "Прокси ARP для частной VLAN",
        "source_validation": "Проверка источника", "source_validation_placeholder": "Выберите режим проверки источника", "source_validation.help": "Проверка источника обратного пути (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "Принять DAD", "accept_dad.help": "Режим принятия DAD",
        "autoconf": "Автоконфигурация", "autoconf.help": "Включить автоконфигурацию IPv6",
        "eui64": "EUI-64", "eui64_placeholder": "ID интерфейса", "eui64.help": "Идентификатор интерфейса EUI-64",
        "no_default_link_local": "Без link-local по умолчанию", "no_default_link_local.help": "Не автонастраивать link-local адрес",
        "adjust_mss": "Настроить MSS", "adjust_mss_placeholder": "Выберите настройку MSS", "adjust_mss.help": "Настроить TCP MSS",
        "base_reachable_time": "Базовое время доступности", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "Базовое время доступности (сек)",
        "disable_forwarding": "Отключить пересылку", "disable_forwarding.help": "Отключить пересылку IPv6",
        "dup_addr_detect_transmits": "Передачи DAD", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "Количество передач обнаружения дубликатов",
        "source_validation": "Проверка источника", "source_validation_placeholder": "Выберите режим проверки источника", "source_validation.help": "Проверка источника обратного пути (RFC3704)"
    },
    "nameRequired": "Введите имя интерфейса",
    "selectInterfaceFirst": "Выберите интерфейсы для удаления"
}

# de translations
de = {
    "name": "Schnittstellenname", "description": "Beschreibung", "mode": "Modus", "member_count": "Mitglieder",
    "mtu": "MTU", "disable": "Deaktivieren", "actions": "Aktionen",
    "name_placeholder": "z.B. bond0", "name_help": "Bonding-Schnittstellenname",
    "description_placeholder": "Schnittstellenbeschreibung",
    "mac": "MAC-Adresse", "mac_placeholder": "z.B. 00:11:22:33:44:55", "mac_help": "Hardware-MAC-Adresse",
    "mode_help": "Bonding-Modus", "hash_policy": "Hash-Richtlinie", "hash_policy_help": "Hash-Richtlinie",
    "lacp_rate": "LACP-Rate", "lacp_rate_help": "LACP-Rate",
    "members": "Mitgliedsschnittstellen", "members_placeholder": "Mitgliedsschnittstellen auswählen", "members_help": "Bonding-Mitgliedsschnittstellen",
    "primary": "Primär", "primary_placeholder": "Primärschnittstelle auswählen", "primary_help": "Primärschnittstelle",
    "min_links": "Min. Verbindungen", "min_links_placeholder": "0-16", "min_links_help": "Mindestanzahl aktiver Verbindungen",
    "mii_mon_interval": "MII-Überwachungsintervall", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "MII-Überwachungsintervall (ms)",
    "mtu_placeholder": "68-16000", "mtu_help": "Maximale Übertragungseinheit",
    "system_mac": "System-MAC", "system_mac_placeholder": "z.B. 00:11:22:33:44:55", "system_mac.help": "System-MAC-Adresse",
    "disable_interface": "Schnittstelle deaktivieren", "disable_interface_help": "Schnittstelle administrativ deaktivieren",
    "disable_link_detect": "Link-Erkennung deaktivieren", "disable_link_detect_help": "Link-Erkennung deaktivieren",
    "arp_interval": "ARP-Intervall", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "ARP-Überwachungsintervall (ms)",
    "arp_targets": "ARP-Ziele", "arp_targets_placeholder": "Eine IP-Adresse pro Zeile", "arp_targets_help": "ARP-Überwachungszieladressen",
    "dhcp": {
        "client_id": "DHCP-Client-ID", "client_id_placeholder": "Client-ID", "client_id_help": "DHCP-Client-Kennung",
        "default_route_distance": "Standard-Route-Entfernung", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "DHCP-Standard-Route-Entfernung",
        "host_name": "Hostname", "host_name_placeholder": "Hostname", "host_name_help": "DHCP-Hostname",
        "use_mtu": "MTU verwenden", "use_mtu.help": "MTU für DHCP verwenden",
        "no_default_route": "Keine Standard-Route", "no_default_route.help": "Keine Standard-Route setzen",
        "reject": "Ablehnen", "reject_placeholder": "Eine IP-Adresse pro Zeile", "reject.help": "DHCP-Angebote von diesen Adressen ablehnen",
        "user_class": "Benutzerklasse", "user_class_placeholder": "Benutzerklasse", "user_class.help": "DHCP-Benutzerklasse",
        "vendor_class_id": "Herstellerklassen-ID", "vendor_class_id_placeholder": "Herstellerklassen-ID", "vendor_class_id.help": "DHCP-Herstellerklassenkennung"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "DHCPv6-eindeutige Kennung",
        "no_release": "Nicht freigeben", "no_release.help": "DHCPv6-Adresse nicht freigeben",
        "no_request_dns": "DNS nicht anfordern", "no_request_dns.help": "DNS-Server nicht anfordern",
        "no_request_domain": "Domain nicht anfordern", "no_request_domain.help": "Domain-Suchliste nicht anfordern",
        "parameters_only": "Nur Parameter", "parameters_only.help": "Nur Parameter, keine Adressen abrufen",
        "rapid_commit": "Rapid Commit", "rapid_commit.help": "Rapid Commit aktivieren",
        "temporary": "Temporär", "temporary.help": "Temporäre Adresse anfordern"
    },
    "eapol": {
        "ca_certificate": "CA-Zertifikat", "ca_certificate_placeholder": "CA-Zertifikatpfad", "ca_certificate.help": "EAPoL-CA-Zertifikat",
        "certificate": "Zertifikat", "certificate_placeholder": "Zertifikatpfad", "certificate.help": "EAPoL-Client-Zertifikat",
        "passphrase": "Passphrase", "passphrase_placeholder": "Passphrase", "passphrase.help": "Zertifikat-Passphrase"
    },
    "evpn": {
        "es_df_pref": "ES-DF-Priorität", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "EVPN-DF-Priorität",
        "es_id": "ES-ID", "es_id_placeholder": "ES-ID", "es_id.help": "EVPN-Ethernet-Segment-ID",
        "es_sys_mac": "ES-System-MAC", "es_sys_mac_placeholder": "z.B. 00:11:22:33:44:55", "es_sys_mac.help": "EVPN-Ethernet-Segment-System-MAC",
        "uplink": "Uplink", "uplink.help": "EVPN-Uplink"
    },
    "ip": {
        "adjust_mss": "MSS anpassen", "adjust_mss_placeholder": "MSS-Anpassung auswählen", "adjust_mss.help": "TCP-MSS anpassen",
        "arp_cache_timeout": "ARP-Cache-Timeout", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "ARP-Cache-Timeout (Sekunden)",
        "disable_arp_filter": "ARP-Filter deaktivieren", "disable_arp_filter.help": "ARP-Filterung deaktivieren",
        "disable_forwarding": "Weiterleitung deaktivieren", "disable_forwarding.help": "IP-Weiterleitung deaktivieren",
        "enable_arp_accept": "ARP-Akzeptanz aktivieren", "enable_arp_accept.help": "ARP für nicht-lokale Adressen akzeptieren",
        "enable_arp_announce": "ARP-Ankündigung aktivieren", "enable_arp_announce.help": "ARP für lokale Adressen ankündigen",
        "enable_arp_ignore": "ARP-Ignorierung aktivieren", "enable_arp_ignore.help": "ARP für Nicht-Zielschnittstellen ignorieren",
        "enable_directed_broadcast": "Gerichteten Broadcast aktivieren", "enable_directed_broadcast.help": "Gerichteten Broadcast aktivieren",
        "enable_proxy_arp": "Proxy-ARP aktivieren", "enable_proxy_arp.help": "Proxy-ARP aktivieren",
        "proxy_arp_pvlan": "Proxy-ARP PVLAN", "proxy_arp_pvlan.help": "Private-VLAN-Proxy-ARP",
        "source_validation": "Quellvalidierung", "source_validation_placeholder": "Quellvalidierungsmodus auswählen", "source_validation.help": "Reverse-Path-Quellvalidierung (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "DAD akzeptieren", "accept_dad.help": "DAD-Modus akzeptieren",
        "autoconf": "Autokonfiguration", "autoconf.help": "IPv6-Autokonfiguration aktivieren",
        "eui64": "EUI-64", "eui64_placeholder": "Schnittstellen-ID", "eui64.help": "EUI-64-Schnittstellenkennung",
        "no_default_link_local": "Kein Standard-Link-Local", "no_default_link_local.help": "Link-Local-Adresse nicht automatisch konfigurieren",
        "adjust_mss": "MSS anpassen", "adjust_mss_placeholder": "MSS-Anpassung auswählen", "adjust_mss.help": "TCP-MSS anpassen",
        "base_reachable_time": "Basis-Erreichbarkeitszeit", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "Basis-Erreichbarkeitszeit (Sekunden)",
        "disable_forwarding": "Weiterleitung deaktivieren", "disable_forwarding.help": "IPv6-Weiterleitung deaktivieren",
        "dup_addr_detect_transmits": "DAD-Übertragungen", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "Übertragungen zur Duplikaterkennung",
        "source_validation": "Quellvalidierung", "source_validation_placeholder": "Quellvalidierungsmodus auswählen", "source_validation.help": "Reverse-Path-Quellvalidierung (RFC3704)"
    },
    "nameRequired": "Bitte Schnittstellennamen eingeben",
    "selectInterfaceFirst": "Bitte Schnittstellen zum Löschen auswählen"
}

# fr translations
fr = {
    "name": "Nom de l'interface", "description": "Description", "mode": "Mode", "member_count": "Membres",
    "mtu": "MTU", "disable": "Désactiver", "actions": "Actions",
    "name_placeholder": "ex. bond0", "name_help": "Nom de l'interface bonding",
    "description_placeholder": "Description de l'interface",
    "mac": "Adresse MAC", "mac_placeholder": "ex. 00:11:22:33:44:55", "mac_help": "Adresse MAC matérielle",
    "mode_help": "Mode de bonding", "hash_policy": "Politique de hachage", "hash_policy_help": "Politique de hachage",
    "lacp_rate": "Taux LACP", "lacp_rate_help": "Taux LACP",
    "members": "Interfaces membres", "members_placeholder": "Sélectionner les interfaces", "members_help": "Interfaces membres du bonding",
    "primary": "Primaire", "primary_placeholder": "Sélectionner l'interface primaire", "primary_help": "Interface primaire",
    "min_links": "Liens min.", "min_links_placeholder": "0-16", "min_links_help": "Nombre minimum de liens actifs",
    "mii_mon_interval": "Intervalle de surveillance MII", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "Intervalle de surveillance MII (ms)",
    "mtu_placeholder": "68-16000", "mtu_help": "Unité maximale de transmission",
    "system_mac": "MAC système", "system_mac_placeholder": "ex. 00:11:22:33:44:55", "system_mac.help": "Adresse MAC système",
    "disable_interface": "Désactiver l'interface", "disable_interface_help": "Désactiver l'interface administrativement",
    "disable_link_detect": "Désactiver la détection de lien", "disable_link_detect_help": "Désactiver la détection de lien",
    "arp_interval": "Intervalle ARP", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "Intervalle de surveillance ARP (ms)",
    "arp_targets": "Cibles ARP", "arp_targets_placeholder": "Une adresse IP par ligne", "arp_targets_help": "Adresses cibles de surveillance ARP",
    "dhcp": {
        "client_id": "ID client DHCP", "client_id_placeholder": "ID client", "client_id_help": "Identifiant client DHCP",
        "default_route_distance": "Distance route par défaut", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "Distance route par défaut DHCP",
        "host_name": "Nom d'hôte", "host_name_placeholder": "Nom d'hôte", "host_name_help": "Nom d'hôte DHCP",
        "use_mtu": "Utiliser MTU", "use_mtu.help": "Utiliser MTU pour DHCP",
        "no_default_route": "Pas de route par défaut", "no_default_route.help": "Ne pas définir de route par défaut",
        "reject": "Rejeter", "reject_placeholder": "Une adresse IP par ligne", "reject.help": "Rejeter les offres DHCP de ces adresses",
        "user_class": "Classe utilisateur", "user_class_placeholder": "Classe utilisateur", "user_class.help": "Classe utilisateur DHCP",
        "vendor_class_id": "ID classe fournisseur", "vendor_class_id_placeholder": "ID classe fournisseur", "vendor_class_id.help": "Identifiant classe fournisseur DHCP"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "Identifiant unique DHCPv6",
        "no_release": "Ne pas libérer", "no_release.help": "Ne pas libérer l'adresse DHCPv6",
        "no_request_dns": "Ne pas demander DNS", "no_request_dns.help": "Ne pas demander de serveurs DNS",
        "no_request_domain": "Ne pas demander de domaine", "no_request_domain.help": "Ne pas demander de liste de recherche de domaine",
        "parameters_only": "Paramètres uniquement", "parameters_only.help": "Obtenir uniquement les paramètres, pas d'adresses",
        "rapid_commit": "Commit rapide", "rapid_commit.help": "Activer le commit rapide",
        "temporary": "Temporaire", "temporary.help": "Demander une adresse temporaire"
    },
    "eapol": {
        "ca_certificate": "Certificat CA", "ca_certificate_placeholder": "Chemin du certificat CA", "ca_certificate.help": "Certificat CA EAPoL",
        "certificate": "Certificat", "certificate_placeholder": "Chemin du certificat", "certificate.help": "Certificat client EAPoL",
        "passphrase": "Phrase de passe", "passphrase_placeholder": "Phrase de passe", "passphrase.help": "Phrase de passe du certificat"
    },
    "evpn": {
        "es_df_pref": "Préférence ES DF", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "Préférence EVPN DF",
        "es_id": "ID ES", "es_id_placeholder": "ID ES", "es_id.help": "ID de segment Ethernet EVPN",
        "es_sys_mac": "MAC système ES", "es_sys_mac_placeholder": "ex. 00:11:22:33:44:55", "es_sys_mac.help": "MAC système de segment Ethernet EVPN",
        "uplink": "Liaison montante", "uplink.help": "Liaison montante EVPN"
    },
    "ip": {
        "adjust_mss": "Ajuster MSS", "adjust_mss_placeholder": "Sélectionner l'ajustement MSS", "adjust_mss.help": "Ajuster TCP MSS",
        "arp_cache_timeout": "Délai cache ARP", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "Délai du cache ARP (secondes)",
        "disable_arp_filter": "Désactiver filtre ARP", "disable_arp_filter.help": "Désactiver le filtrage ARP",
        "disable_forwarding": "Désactiver transfert", "disable_forwarding.help": "Désactiver le transfert IP",
        "enable_arp_accept": "Activer acceptation ARP", "enable_arp_accept.help": "Accepter ARP pour adresses non locales",
        "enable_arp_announce": "Activer annonce ARP", "enable_arp_announce.help": "Annoncer ARP pour adresses locales",
        "enable_arp_ignore": "Activer ignorance ARP", "enable_arp_ignore.help": "Ignorer ARP pour interfaces non cibles",
        "enable_directed_broadcast": "Activer broadcast dirigé", "enable_directed_broadcast.help": "Activer le broadcast dirigé",
        "enable_proxy_arp": "Activer proxy ARP", "enable_proxy_arp.help": "Activer proxy ARP",
        "proxy_arp_pvlan": "Proxy ARP PVLAN", "proxy_arp_pvlan.help": "Proxy ARP pour VLAN privée",
        "source_validation": "Validation source", "source_validation_placeholder": "Sélectionner mode de validation source", "source_validation.help": "Validation source reverse path (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "Accepter DAD", "accept_dad.help": "Mode d'acceptation DAD",
        "autoconf": "Configuration auto", "autoconf.help": "Activer configuration automatique IPv6",
        "eui64": "EUI-64", "eui64_placeholder": "ID d'interface", "eui64.help": "Identifiant d'interface EUI-64",
        "no_default_link_local": "Pas de link-local par défaut", "no_default_link_local.help": "Ne pas configurer automatiquement l'adresse link-local",
        "adjust_mss": "Ajuster MSS", "adjust_mss_placeholder": "Sélectionner l'ajustement MSS", "adjust_mss.help": "Ajuster TCP MSS",
        "base_reachable_time": "Temps de base atteignable", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "Temps de base atteignable (secondes)",
        "disable_forwarding": "Désactiver transfert", "disable_forwarding.help": "Désactiver le transfert IPv6",
        "dup_addr_detect_transmits": "Transmissions DAD", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "Transmissions de détection de doublons",
        "source_validation": "Validation source", "source_validation_placeholder": "Sélectionner mode de validation source", "source_validation.help": "Validation source reverse path (RFC3704)"
    },
    "nameRequired": "Veuillez entrer le nom de l'interface",
    "selectInterfaceFirst": "Veuillez sélectionner les interfaces à supprimer"
}

# ko translations
ko = {
    "name": "인터페이스 이름", "description": "설명", "mode": "모드", "member_count": "멤버 수",
    "mtu": "MTU", "disable": "비활성화", "actions": "작업",
    "name_placeholder": "예: bond0", "name_help": "본딩 인터페이스 이름",
    "description_placeholder": "인터페이스 설명",
    "mac": "MAC 주소", "mac_placeholder": "예: 00:11:22:33:44:55", "mac_help": "하드웨어 MAC 주소",
    "mode_help": "본딩 모드", "hash_policy": "해시 정책", "hash_policy_help": "해시 정책",
    "lacp_rate": "LACP 속도", "lacp_rate_help": "LACP 속도",
    "members": "멤버 인터페이스", "members_placeholder": "멤버 인터페이스 선택", "members_help": "본딩 멤버 인터페이스",
    "primary": "기본", "primary_placeholder": "기본 인터페이스 선택", "primary_help": "기본 인터페이스",
    "min_links": "최소 링크", "min_links_placeholder": "0-16", "min_links_help": "최소 활성 링크 수",
    "mii_mon_interval": "MII 모니터링 간격", "mii_mon_interval_placeholder": "0-1000", "mii_mon_interval_help": "MII 모니터링 간격 (ms)",
    "mtu_placeholder": "68-16000", "mtu_help": "최대 전송 단위",
    "system_mac": "시스템 MAC", "system_mac_placeholder": "예: 00:11:22:33:44:55", "system_mac.help": "시스템 MAC 주소",
    "disable_interface": "인터페이스 비활성화", "disable_interface_help": "관리적으로 인터페이스 비활성화",
    "disable_link_detect": "링크 감지 비활성화", "disable_link_detect_help": "링크 감지 비활성화",
    "arp_interval": "ARP 간격", "arp_interval_placeholder": "0-4294967295", "arp_interval_help": "ARP 모니터링 간격 (ms)",
    "arp_targets": "ARP 대상", "arp_targets_placeholder": "한 줄에 하나의 IP 주소", "arp_targets_help": "ARP 모니터링 대상 주소",
    "dhcp": {
        "client_id": "DHCP 클라이언트 ID", "client_id_placeholder": "클라이언트 ID", "client_id_help": "DHCP 클라이언트 식별자",
        "default_route_distance": "기본 경로 거리", "default_route_distance_placeholder": "1-255", "default_route_distance.help": "DHCP 기본 경로 거리",
        "host_name": "호스트 이름", "host_name_placeholder": "호스트 이름", "host_name_help": "DHCP 호스트 이름",
        "use_mtu": "MTU 사용", "use_mtu.help": "DHCP에 MTU 사용",
        "no_default_route": "기본 경로 없음", "no_default_route.help": "기본 경로를 설정하지 않음",
        "reject": "거부", "reject_placeholder": "한 줄에 하나의 IP 주소", "reject.help": "이 주소에서의 DHCP 제공 거부",
        "user_class": "사용자 클래스", "user_class_placeholder": "사용자 클래스", "user_class.help": "DHCP 사용자 클래스",
        "vendor_class_id": "공급업체 클래스 ID", "vendor_class_id_placeholder": "공급업체 클래스 ID", "vendor_class_id.help": "DHCP 공급업체 클래스 식별자"
    },
    "dhcpv6": {
        "duid": "DUID", "duid_placeholder": "DUID", "duid.help": "DHCPv6 고유 식별자",
        "no_release": "해제 안 함", "no_release.help": "DHCPv6 주소를 해제하지 않음",
        "no_request_dns": "DNS 요청 안 함", "no_request_dns.help": "DNS 서버를 요청하지 않음",
        "no_request_domain": "도메인 요청 안 함", "no_request_domain.help": "도메인 검색 목록을 요청하지 않음",
        "parameters_only": "매개변수만", "parameters_only.help": "매개변수만 가져오고 주소는 가져오지 않음",
        "rapid_commit": "빠른 커밋", "rapid_commit.help": "빠른 커밋 활성화",
        "temporary": "임시", "temporary.help": "임시 주소 요청"
    },
    "eapol": {
        "ca_certificate": "CA 인증서", "ca_certificate_placeholder": "CA 인증서 경로", "ca_certificate.help": "EAPoL CA 인증서",
        "certificate": "인증서", "certificate_placeholder": "인증서 경로", "certificate.help": "EAPoL 클라이언트 인증서",
        "passphrase": "암호", "passphrase_placeholder": "암호", "passphrase.help": "인증서 암호"
    },
    "evpn": {
        "es_df_pref": "ES DF 우선순위", "es_df_pref_placeholder": "1-65535", "es_df_pref.help": "EVPN DF 우선순위",
        "es_id": "ES ID", "es_id_placeholder": "ES ID", "es_id.help": "EVPN 이더넷 세그먼트 ID",
        "es_sys_mac": "ES 시스템 MAC", "es_sys_mac_placeholder": "예: 00:11:22:33:44:55", "es_sys_mac.help": "EVPN 이더넷 세그먼트 시스템 MAC",
        "uplink": "업링크", "uplink.help": "EVPN 업링크"
    },
    "ip": {
        "adjust_mss": "MSS 조정", "adjust_mss_placeholder": "MSS 조정 선택", "adjust_mss.help": "TCP MSS 조정",
        "arp_cache_timeout": "ARP 캐시 타임아웃", "arp_cache_timeout_placeholder": "1-86400", "arp_cache_timeout.help": "ARP 캐시 타임아웃 (초)",
        "disable_arp_filter": "ARP 필터 비활성화", "disable_arp_filter.help": "ARP 필터링 비활성화",
        "disable_forwarding": "포워딩 비활성화", "disable_forwarding.help": "IP 포워딩 비활성화",
        "enable_arp_accept": "ARP 수락 활성화", "enable_arp_accept.help": "비로컬 주소에 대한 ARP 수락",
        "enable_arp_announce": "ARP 공지 활성화", "enable_arp_announce.help": "로컬 주소에 대한 ARP 공지",
        "enable_arp_ignore": "ARP 무시 활성화", "enable_arp_ignore.help": "비대상 인터페이스에 대한 ARP 무시",
        "enable_directed_broadcast": "지정 브로드캐스트 활성화", "enable_directed_broadcast.help": "지정 브로드캐스트 활성화",
        "enable_proxy_arp": "프록시 ARP 활성화", "enable_proxy_arp.help": "프록시 ARP 활성화",
        "proxy_arp_pvlan": "프록시 ARP PVLAN", "proxy_arp_pvlan.help": "프라이빗 VLAN 프록시 ARP",
        "source_validation": "소스 검증", "source_validation_placeholder": "소스 검증 모드 선택", "source_validation.help": "역방향 경로 소스 검증 (RFC3704)"
    },
    "ipv6": {
        "accept_dad": "DAD 수락", "accept_dad.help": "DAD 모드 수락",
        "autoconf": "자동 구성", "autoconf.help": "IPv6 자동 구성 활성화",
        "eui64": "EUI-64", "eui64_placeholder": "인터페이스 ID", "eui64.help": "EUI-64 인터페이스 식별자",
        "no_default_link_local": "기본 링크 로컬 없음", "no_default_link_local.help": "링크 로컬 주소를 자동 구성하지 않음",
        "adjust_mss": "MSS 조정", "adjust_mss_placeholder": "MSS 조정 선택", "adjust_mss.help": "TCP MSS 조정",
        "base_reachable_time": "기본 도달 가능 시간", "base_reachable_time_placeholder": "1-86400", "base_reachable_time.help": "기본 도달 가능 시간 (초)",
        "disable_forwarding": "포워딩 비활성화", "disable_forwarding.help": "IPv6 포워딩 비활성화",
        "dup_addr_detect_transmits": "DAD 전송", "dup_addr_detect_transmits_placeholder": "0+", "dup_addr_detect_transmits.help": "중복 주소 감지 전송 횟수",
        "source_validation": "소스 검증", "source_validation_placeholder": "소스 검증 모드 선택", "source_validation.help": "역방향 경로 소스 검증 (RFC3704)"
    },
    "nameRequired": "인터페이스 이름을 입력하세요",
    "selectInterfaceFirst": "삭제할 인터페이스를 선택하세요"
}

# Apply translations
translations = {
    'zh-TW': zh_TW,
    'en': en,
    'ru': ru,
    'de': de,
    'fr': fr,
    'ko': ko,
}

for lang, trans in translations.items():
    if lang not in data:
        data[lang] = {}
    if 'interface' not in data[lang]:
        data[lang]['interface'] = {}
    data[lang]['interface']['bonding'] = trans

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! Added bonding translations for all 6 languages.")
