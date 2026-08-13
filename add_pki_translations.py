#!/usr/bin/env python3
import json

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# zh-CN pki translations
zh_CN = {
    "tabs": {
        "ca": "证书颁发机构 (CA)",
        "certificate": "证书",
        "dh": "DH 参数",
        "keyPair": "密钥对",
        "openssh": "OpenSSH 密钥",
        "openvpn": "OpenVPN 密钥",
        "x509": "X509 默认值"
    },
    "columns": {
        "name": "名称",
        "description": "描述",
        "certificate": "证书",
        "crl": "CRL",
        "privateKey": "私钥",
        "publicKey": "公钥",
        "passwordProtected": "受密码保护",
        "parameters": "参数",
        "key": "密钥",
        "version": "版本",
        "acmeDomains": "ACME 域名"
    },
    "labels": {
        "certificatePem": "证书 (PEM 格式)",
        "crlPem": "证书吊销列表 (PEM 格式)",
        "privateKeyPem": "私钥 (PEM 格式)",
        "publicKeyPem": "公钥 (PEM 格式)",
        "passwordProtected": "私钥受密码保护",
        "acmeEmail": "ACME 邮箱",
        "acmeListenAddress": "ACME 监听地址",
        "acmeRsaKeySize": "ACME RSA 密钥大小",
        "acmeUrl": "ACME URL",
        "acmeDomainNames": "ACME 域名 (逗号分隔)",
        "dhParametersPem": "DH 参数 (PEM 格式)",
        "sharedKeyData": "共享密钥数据",
        "country": "国家",
        "locality": "地区",
        "organization": "组织",
        "state": "省份"
    },
    "placeholders": {
        "caName": "例如: ca01",
        "certName": "例如: cert01",
        "dhName": "例如: dh01",
        "keyName": "例如: key01",
        "sshName": "例如: ssh01",
        "vpnName": "例如: vpn01",
        "ipv4Address": "IPv4 地址",
        "openvpnKeyData": "OpenVPN 共享密钥数据",
        "versionNumber": "例如: 1",
        "countryCode": "例如: CN, US, GB",
        "localityExample": "例如: Beijing, Shanghai",
        "organizationExample": "例如: My Organization",
        "stateExample": "例如: Beijing, Guangdong"
    },
    "help": {
        "default2048": "默认: 2048",
        "defaultLetsEncrypt": "默认: Let's Encrypt"
    }
}

# Apply to all languages
translations = {
    'zh-CN': zh_CN,
    'zh-TW': {
        "tabs": {
            "ca": "憑證頒發機構 (CA)",
            "certificate": "憑證",
            "dh": "DH 參數",
            "keyPair": "金鑰對",
            "openssh": "OpenSSH 金鑰",
            "openvpn": "OpenVPN 金鑰",
            "x509": "X509 預設值"
        },
        "columns": {
            "name": "名稱",
            "description": "描述",
            "certificate": "憑證",
            "crl": "CRL",
            "privateKey": "私鑰",
            "publicKey": "公鑰",
            "passwordProtected": "受密碼保護",
            "parameters": "參數",
            "key": "金鑰",
            "version": "版本",
            "acmeDomains": "ACME 網域"
        },
        "labels": {
            "certificatePem": "憑證 (PEM 格式)",
            "crlPem": "憑證吊銷清單 (PEM 格式)",
            "privateKeyPem": "私鑰 (PEM 格式)",
            "publicKeyPem": "公鑰 (PEM 格式)",
            "passwordProtected": "私鑰受密碼保護",
            "acmeEmail": "ACME 電子郵件",
            "acmeListenAddress": "ACME 監聽位址",
            "acmeRsaKeySize": "ACME RSA 金鑰大小",
            "acmeUrl": "ACME URL",
            "acmeDomainNames": "ACME 網域 (逗號分隔)",
            "dhParametersPem": "DH 參數 (PEM 格式)",
            "sharedKeyData": "共用金鑰資料",
            "country": "國家",
            "locality": "地區",
            "organization": "組織",
            "state": "省份"
        },
        "placeholders": {
            "caName": "例如: ca01",
            "certName": "例如: cert01",
            "dhName": "例如: dh01",
            "keyName": "例如: key01",
            "sshName": "例如: ssh01",
            "vpnName": "例如: vpn01",
            "ipv4Address": "IPv4 位址",
            "openvpnKeyData": "OpenVPN 共用金鑰資料",
            "versionNumber": "例如: 1",
            "countryCode": "例如: CN, US, GB",
            "localityExample": "例如: Beijing, Shanghai",
            "organizationExample": "例如: My Organization",
            "stateExample": "例如: Beijing, Guangdong"
        },
        "help": {
            "default2048": "預設: 2048",
            "defaultLetsEncrypt": "預設: Let's Encrypt"
        }
    },
    'en': {
        "tabs": {
            "ca": "Certificate Authority (CA)",
            "certificate": "Certificate",
            "dh": "DH Parameters",
            "keyPair": "Key Pair",
            "openssh": "OpenSSH Key",
            "openvpn": "OpenVPN Key",
            "x509": "X509 Defaults"
        },
        "columns": {
            "name": "Name",
            "description": "Description",
            "certificate": "Certificate",
            "crl": "CRL",
            "privateKey": "Private Key",
            "publicKey": "Public Key",
            "passwordProtected": "Password Protected",
            "parameters": "Parameters",
            "key": "Key",
            "version": "Version",
            "acmeDomains": "ACME Domains"
        },
        "labels": {
            "certificatePem": "Certificate (PEM format)",
            "crlPem": "Certificate Revocation List (PEM format)",
            "privateKeyPem": "Private Key (PEM format)",
            "publicKeyPem": "Public Key (PEM format)",
            "passwordProtected": "Private key password protected",
            "acmeEmail": "ACME Email",
            "acmeListenAddress": "ACME Listen Address",
            "acmeRsaKeySize": "ACME RSA Key Size",
            "acmeUrl": "ACME URL",
            "acmeDomainNames": "ACME Domains (comma separated)",
            "dhParametersPem": "DH Parameters (PEM format)",
            "sharedKeyData": "Shared Key Data",
            "country": "Country",
            "locality": "Locality",
            "organization": "Organization",
            "state": "State"
        },
        "placeholders": {
            "caName": "e.g.: ca01",
            "certName": "e.g.: cert01",
            "dhName": "e.g.: dh01",
            "keyName": "e.g.: key01",
            "sshName": "e.g.: ssh01",
            "vpnName": "e.g.: vpn01",
            "ipv4Address": "IPv4 address",
            "openvpnKeyData": "OpenVPN shared key data",
            "versionNumber": "e.g.: 1",
            "countryCode": "e.g.: CN, US, GB",
            "localityExample": "e.g.: Beijing, Shanghai",
            "organizationExample": "e.g.: My Organization",
            "stateExample": "e.g.: Beijing, Guangdong"
        },
        "help": {
            "default2048": "Default: 2048",
            "defaultLetsEncrypt": "Default: Let's Encrypt"
        }
    },
    'ru': {
        "tabs": {
            "ca": "Центр сертификации (CA)",
            "certificate": "Сертификат",
            "dh": "Параметры DH",
            "keyPair": "Пара ключей",
            "openssh": "Ключ OpenSSH",
            "openvpn": "Ключ OpenVPN",
            "x509": "Настройки X509 по умолчанию"
        },
        "columns": {
            "name": "Имя",
            "description": "Описание",
            "certificate": "Сертификат",
            "crl": "CRL",
            "privateKey": "Закрытый ключ",
            "publicKey": "Открытый ключ",
            "passwordProtected": "Защищено паролем",
            "parameters": "Параметры",
            "key": "Ключ",
            "version": "Версия",
            "acmeDomains": "Домены ACME"
        },
        "labels": {
            "certificatePem": "Сертификат (формат PEM)",
            "crlPem": "Список отзыва сертификатов (формат PEM)",
            "privateKeyPem": "Закрытый ключ (формат PEM)",
            "publicKeyPem": "Открытый ключ (формат PEM)",
            "passwordProtected": "Закрытый ключ защищен паролем",
            "acmeEmail": "Email ACME",
            "acmeListenAddress": "Адрес прослушивания ACME",
            "acmeRsaKeySize": "Размер ключа RSA ACME",
            "acmeUrl": "URL ACME",
            "acmeDomainNames": "Домены ACME (через запятую)",
            "dhParametersPem": "Параметры DH (формат PEM)",
            "sharedKeyData": "Данные общего ключа",
            "country": "Страна",
            "locality": "Местоположение",
            "organization": "Организация",
            "state": "Регион"
        },
        "placeholders": {
            "caName": "напр.: ca01",
            "certName": "напр.: cert01",
            "dhName": "напр.: dh01",
            "keyName": "напр.: key01",
            "sshName": "напр.: ssh01",
            "vpnName": "напр.: vpn01",
            "ipv4Address": "IPv4 адрес",
            "openvpnKeyData": "Данные общего ключа OpenVPN",
            "versionNumber": "напр.: 1",
            "countryCode": "напр.: CN, US, GB",
            "localityExample": "напр.: Beijing, Shanghai",
            "organizationExample": "напр.: My Organization",
            "stateExample": "напр.: Beijing, Guangdong"
        },
        "help": {
            "default2048": "По умолчанию: 2048",
            "defaultLetsEncrypt": "По умолчанию: Let's Encrypt"
        }
    },
    'de': {
        "tabs": {
            "ca": "Zertifizierungsstelle (CA)",
            "certificate": "Zertifikat",
            "dh": "DH-Parameter",
            "keyPair": "Schlüsselpaar",
            "openssh": "OpenSSH-Schlüssel",
            "openvpn": "OpenVPN-Schlüssel",
            "x509": "X509-Standardeinstellungen"
        },
        "columns": {
            "name": "Name",
            "description": "Beschreibung",
            "certificate": "Zertifikat",
            "crl": "CRL",
            "privateKey": "Privater Schlüssel",
            "publicKey": "Öffentlicher Schlüssel",
            "passwordProtected": "Passwortgeschützt",
            "parameters": "Parameter",
            "key": "Schlüssel",
            "version": "Version",
            "acmeDomains": "ACME-Domänen"
        },
        "labels": {
            "certificatePem": "Zertifikat (PEM-Format)",
            "crlPem": "Zertifikatssperrliste (PEM-Format)",
            "privateKeyPem": "Privater Schlüssel (PEM-Format)",
            "publicKeyPem": "Öffentlicher Schlüssel (PEM-Format)",
            "passwordProtected": "Privater Schlüssel passwortgeschützt",
            "acmeEmail": "ACME-E-Mail",
            "acmeListenAddress": "ACME-Lauschadresse",
            "acmeRsaKeySize": "ACME-RSA-Schlüsselgröße",
            "acmeUrl": "ACME-URL",
            "acmeDomainNames": "ACME-Domänen (durch Komma getrennt)",
            "dhParametersPem": "DH-Parameter (PEM-Format)",
            "sharedKeyData": "Gemeinsame Schlüsseldaten",
            "country": "Land",
            "locality": "Ort",
            "organization": "Organisation",
            "state": "Bundesland"
        },
        "placeholders": {
            "caName": "z.B.: ca01",
            "certName": "z.B.: cert01",
            "dhName": "z.B.: dh01",
            "keyName": "z.B.: key01",
            "sshName": "z.B.: ssh01",
            "vpnName": "z.B.: vpn01",
            "ipv4Address": "IPv4-Adresse",
            "openvpnKeyData": "OpenVPN gemeinsame Schlüsseldaten",
            "versionNumber": "z.B.: 1",
            "countryCode": "z.B.: CN, US, GB",
            "localityExample": "z.B.: Beijing, Shanghai",
            "organizationExample": "z.B.: My Organization",
            "stateExample": "z.B.: Beijing, Guangdong"
        },
        "help": {
            "default2048": "Standard: 2048",
            "defaultLetsEncrypt": "Standard: Let's Encrypt"
        }
    },
    'fr': {
        "tabs": {
            "ca": "Autorité de certification (CA)",
            "certificate": "Certificat",
            "dh": "Paramètres DH",
            "keyPair": "Paire de clés",
            "openssh": "Clé OpenSSH",
            "openvpn": "Clé OpenVPN",
            "x509": "Valeurs par défaut X509"
        },
        "columns": {
            "name": "Nom",
            "description": "Description",
            "certificate": "Certificat",
            "crl": "CRL",
            "privateKey": "Clé privée",
            "publicKey": "Clé publique",
            "passwordProtected": "Protégé par mot de passe",
            "parameters": "Paramètres",
            "key": "Clé",
            "version": "Version",
            "acmeDomains": "Domaines ACME"
        },
        "labels": {
            "certificatePem": "Certificat (format PEM)",
            "crlPem": "Liste de révocation de certificats (format PEM)",
            "privateKeyPem": "Clé privée (format PEM)",
            "publicKeyPem": "Clé publique (format PEM)",
            "passwordProtected": "Clé privée protégée par mot de passe",
            "acmeEmail": "E-mail ACME",
            "acmeListenAddress": "Adresse d'écoute ACME",
            "acmeRsaKeySize": "Taille de clé RSA ACME",
            "acmeUrl": "URL ACME",
            "acmeDomainNames": "Domaines ACME (séparés par des virgules)",
            "dhParametersPem": "Paramètres DH (format PEM)",
            "sharedKeyData": "Données de clé partagée",
            "country": "Pays",
            "locality": "Localité",
            "organization": "Organisation",
            "state": "État"
        },
        "placeholders": {
            "caName": "ex.: ca01",
            "certName": "ex.: cert01",
            "dhName": "ex.: dh01",
            "keyName": "ex.: key01",
            "sshName": "ex.: ssh01",
            "vpnName": "ex.: vpn01",
            "ipv4Address": "Adresse IPv4",
            "openvpnKeyData": "Données de clé partagée OpenVPN",
            "versionNumber": "ex.: 1",
            "countryCode": "ex.: CN, US, GB",
            "localityExample": "ex.: Beijing, Shanghai",
            "organizationExample": "ex.: My Organization",
            "stateExample": "ex.: Beijing, Guangdong"
        },
        "help": {
            "default2048": "Par défaut: 2048",
            "defaultLetsEncrypt": "Par défaut: Let's Encrypt"
        }
    },
    'ko': {
        "tabs": {
            "ca": "인증 기관 (CA)",
            "certificate": "인증서",
            "dh": "DH 매개변수",
            "keyPair": "키 쌍",
            "openssh": "OpenSSH 키",
            "openvpn": "OpenVPN 키",
            "x509": "X509 기본값"
        },
        "columns": {
            "name": "이름",
            "description": "설명",
            "certificate": "인증서",
            "crl": "CRL",
            "privateKey": "개인 키",
            "publicKey": "공개 키",
            "passwordProtected": "비밀번호 보호",
            "parameters": "매개변수",
            "key": "키",
            "version": "버전",
            "acmeDomains": "ACME 도메인"
        },
        "labels": {
            "certificatePem": "인증서 (PEM 형식)",
            "crlPem": "인증서 취소 목록 (PEM 형식)",
            "privateKeyPem": "개인 키 (PEM 형식)",
            "publicKeyPem": "공개 키 (PEM 형식)",
            "passwordProtected": "개인 키 비밀번호 보호",
            "acmeEmail": "ACME 이메일",
            "acmeListenAddress": "ACME 수신 주소",
            "acmeRsaKeySize": "ACME RSA 키 크기",
            "acmeUrl": "ACME URL",
            "acmeDomainNames": "ACME 도메인 (쉼표로 구분)",
            "dhParametersPem": "DH 매개변수 (PEM 형식)",
            "sharedKeyData": "공유 키 데이터",
            "country": "국가",
            "locality": "지역",
            "organization": "조직",
            "state": "주"
        },
        "placeholders": {
            "caName": "예: ca01",
            "certName": "예: cert01",
            "dhName": "예: dh01",
            "keyName": "예: key01",
            "sshName": "예: ssh01",
            "vpnName": "예: vpn01",
            "ipv4Address": "IPv4 주소",
            "openvpnKeyData": "OpenVPN 공유 키 데이터",
            "versionNumber": "예: 1",
            "countryCode": "예: CN, US, GB",
            "localityExample": "예: Beijing, Shanghai",
            "organizationExample": "예: My Organization",
            "stateExample": "예: Beijing, Guangdong"
        },
        "help": {
            "default2048": "기본값: 2048",
            "defaultLetsEncrypt": "기본값: Let's Encrypt"
        }
    }
}

for lang, trans in translations.items():
    if lang not in data:
        data[lang] = {}
    data[lang]['pki'] = trans

with open('/opt/vyos-web-config/frontend/src/i18n/locales/common.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! Added pki translations for all 7 languages.")
