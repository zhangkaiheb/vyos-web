
vyos@vyos# run generate pki
Possible completions:
  ca                    Generate CA certificate
  certificate           Generate certificate request
  crl                   Generate CRL for specified CA certificate
  dh                    Generate DH parameters
  key-pair              Generate a key pair
  openvpn               Generate OpenVPN keys
  ssh-key               Generate SSH key
  wireguard             Generate WireGuard keys


[edit]

vyos@vyos# run generate pki ca
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated CA certificate into the specified filename
  install               Commands for installing generated CA certificate into running configuration
  sign                  Sign generated CA certificate with another specified CA certificate


[edit]
vyos@vyos# run generate pki ca
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN CERTIFICATE-----
MIIDozCCAougAwIBAgIUR2GmGcxTJbfYVEGoXgvTZdvmSlowDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAOBgNVBAcMB0Jl
aWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwHdnlvcy5pbzAe
Fw0yNjA4MjgwNTUwMzlaFw0zMTA4MjcwNTUwMzlaMFoxCzAJBgNVBAYTAkNOMRAw
DgYDVQQIDAdIYWlkaWFuMRAwDgYDVQQHDAdCZWlqaW5nMRUwEwYDVQQKDAxFYXN5
bmV0d29ya3MxEDAOBgNVBAMMB3Z5b3MuaW8wggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDpb5VUsTERcCDaE+5n+sPxN7rn+6lQ8wmW/ic2aDfUdFxe1osK
zbfMl7jM16IpZYqFVnlaS1+zOzY6BfEph94hHFlZukky8Hy00tgExFXYgL5ujQqd
rQ+OcN3Ham94alBXJnFi0VPqxuf7FfdPTFPRtXRqJejLJo7VF6T3QYyOYaUwiFvk
3edniJ6FtOeqDUl7Nmmqb9K6VDqZjzn/WloRntB/UyB9pBvoX+NE+sxRRpt7SvH3
rUB+G7rgS1pfzuMcUsMa5C5aTQErrQNwVAX6wciTcz/hVvWrGZtIRdfOOuvf6cjy
+7Q8nDYO6krNZsDOqdMkjRUsIcbhwfjPrUVTAgMBAAGjYTBfMA8GA1UdEwEB/wQF
MAMBAf8wDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEF
BQcDATAdBgNVHQ4EFgQUHfhqj2mEuaBHqpSGLfBeAnFCy9EwDQYJKoZIhvcNAQEL
BQADggEBAJG9B6OuvyTRBX0UnILHgjfQB596MhcT0vB2JlS6IJCB5/b5PYXyjn10
Blb04aUqoS/ajQum9u8sNtvVdpJLC5OjL8Ix0l7f//yBMZxgqyuY08OXPG4zV6Q8
Nlzy+eMxgC8OFLPVXpasOWjwcHgIsoP2wlPfPv70mu3iE/IT/iTwmJh0yGhTknta
cxmpP9KJwcigIcOw8qN+uXOfpAxlzimLpLyEGrgedwPaDg5uYwP2xDOZpyv8BrdE
y3PFRWiLYC2SwOqvtpBXMyY3uAQOvdE6+2M3lBGQBNJtlFs7ZW1TfP2jTZOo73p3
sr6NloNfnCWWuz/Eu23A5d6EO/RzCeM=
-----END CERTIFICATE-----

-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDpb5VUsTERcCDa
E+5n+sPxN7rn+6lQ8wmW/ic2aDfUdFxe1osKzbfMl7jM16IpZYqFVnlaS1+zOzY6
BfEph94hHFlZukky8Hy00tgExFXYgL5ujQqdrQ+OcN3Ham94alBXJnFi0VPqxuf7
FfdPTFPRtXRqJejLJo7VF6T3QYyOYaUwiFvk3edniJ6FtOeqDUl7Nmmqb9K6VDqZ
jzn/WloRntB/UyB9pBvoX+NE+sxRRpt7SvH3rUB+G7rgS1pfzuMcUsMa5C5aTQEr
rQNwVAX6wciTcz/hVvWrGZtIRdfOOuvf6cjy+7Q8nDYO6krNZsDOqdMkjRUsIcbh
wfjPrUVTAgMBAAECggEAUIx2RNEXk2LTkyyJeUuoTRXj4qSOGiaiyn1MXpO7oA2+
yeLR+5pcr7YyyEwn4oztLXFXUnbrwNbPsVnXi3McjORRWIrVM0SUY3jVnV96F8jk
7RSx8xKCaa48eNEbQbu9mTTkryp4AG0+Iv/DZJN74MLyNqZ6G49kfdc4zzDJJV+X
fagcarmyaXv0eidXDxOcBbUycDYabrzL57GbkpiQv+L/IFbO8gCZJGllLq2f18fp
Z19+PftoAm+ypXizIi+0hVqSk99IoQsZlMHDfiINkDgzwsPE0tkviiAqagFGKXXx
tZyPQcDSby5V736ZobG1RyLIeooxRxMIGDXlmPEEYQKBgQD328qFVAaDLZZMIFy3
qedE5V3NxrBL9XPxrxTWeFAickSlxcgWKa27R6GTG2GyjX2yR6Z585ZjSe8Wt6Hq
vkn+WpizrrjUa2dmg2V3F6f4s7NDbUGKXp5lYe3RIFlID1rPgP7Vn1BavRNYePvJ
oD5Ur8sREgEkRveb8OKMpUzdaQKBgQDxGoOJgnDFNNNZgP2zctbl+47Au6Ukf47/
NuV8/wMdjsgwnnFZ4PO89+1ditqeChCUFIvinXCRM0WlqZveClBnc0la21ZiyDTu
Oe9494xKSqL58T4ZJV9mS3vXcbbPbQzbyA8NhMyPxKvJqeUSwPEwuV7dRZJOHaZu
Gitz4GbpWwKBgQCi7z+Ayi3FyhAFVzjcG7rGVamGfliidmaTuC6QlmLHYiqydwQD
Xb6xYHNcyyE8STsaGXPcsz5nYtDjNDAiqpjlthSv+enS6g/9Gd93nHt1SFxNtOLi
3TRvHSNC2GsYrc9anUfokmQ2Yhj3jgCnGMogzbdGL3nEqUpYns+u+XNAEQKBgQDD
E7LN9e6MgVtoFcgwA4EA//LW2nyZ9WOb96zi3+qDZd1wCSKpmCteADPb9ddA+9/C
EIXGS6CiuxtlGMB2fV3k9hCqJMHWlyrMfa/W7mRiT9Vh6eFWszhnKjf/b5B8cD1x
LoOPap2gzX45Yu9npxj/VVz+J6Zi8faRKzdxQGXD9QKBgFerCd8dqrObDQko8NoC
hqI01+ZdnxiDAtneIkG5KoeVDxQ/HxQ0UwMfmIy/mmLfCQ2H8DYYhIp6VmDQm3ie
/VvK9foHZ7mXvQ0I3wjS5qsw/VbFWJuRzuAzuNmoJsXcs9Ep93bql3qfd5BVtGJE
cATj/baZZWeQzyoIXyFp2K4L
-----END PRIVATE KEY-----

[edit]
vyos@vyos#
[edit]
vyos@vyos# run generate pki ca file
Possible completions:
  <filename>            Write generated CA certificate into the specified filename


[edit]
vyos@vyos# run generate pki ca file cafile-test01
Possible completions:
  <Enter>               Execute the current command


[edit]

vyos@vyos# run generate pki ca file cafile-test01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/cafile-test01.pem
File written to /config/auth/cafile-test01.key
[edit]
vyos@vyos#
[edit]




vyos@vyos# run generate pki ca install
Possible completions:
  <CA                   Commands for installing generated CA certificate into running
                        configuration
  name>


[edit]
vyos@vyos# run generate pki ca install cainstall-test02
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki ca install cainstall-test02
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#
[edit]


vyos@vyos# run generate pki ca sign
Possible completions:
  cainstall-test02      Sign generated CA certificate with another specified CA
                        certificate
  ca-inst-test03
  oc-ca


[edit]


vyos@vyos# run generate pki ca sign ca-inst-test03
Do you already have a certificate request? [y/N] n
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN CERTIFICATE-----
MIIDyTCCArGgAwIBAgIUIm3YRzdGzM4ZGOMZMqLhhgOeFHIwDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAOBgNVBAcMB0Jl
aWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwHdnlvcy5pbzAe
Fw0yNjA4MjgwNjA2MzdaFw0zMTA4MjcwNjA2MzdaMFoxCzAJBgNVBAYTAkNOMRAw
DgYDVQQIDAdIYWlkaWFuMRAwDgYDVQQHDAdCZWlqaW5nMRUwEwYDVQQKDAxFYXN5
bmV0d29ya3MxEDAOBgNVBAMMB3Z5b3MuaW8wggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQCuRosFjYz5JakC5qEGwGwic4gOxBzrokJXpq4cajd9aCFyNJkl
1hoUdcwpgXLZxYtaNccYE1J/4dptmtgWRLnVY7ShifriySzfoy34SWvMXY4Ec103
VjBPGYvFXdzj8ROtSlwUeLEDRL8MdemeO/Diui5bfDzNFltN0zB2eLMperweX+4H
PBN90rhnv4OiySXq3V46qkJvFZDj7Y+i40yXhRVxL98RH3w/JdfZ1Rp7/SC7mGf+
7WVG0Ek5MVxaDSkVC4Pm58ASRurdQki0VfFmxKpxoeEotO3xo6NDaF1pidR9vYBN
OakmOWtX8dg74H8EgL/f0K33l6SHNyVUVO2hAgMBAAGjgYYwgYMwEgYDVR0TAQH/
BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0lBBYwFAYIKwYBBQUHAwIG
CCsGAQUFBwMBMB0GA1UdDgQWBBRkByqumLF4drUTboGFlSDvjjgSBTAfBgNVHSME
GDAWgBTwlJFNsdIL09JOAzUk9/nIPQUtujANBgkqhkiG9w0BAQsFAAOCAQEAaNc8
AH9Iy9XQVXiRj6Fx4xWWQj4dxHXn5ZU0rKOb4RUD2qqA8iWtsLP+51PkkL3f8mUB
R+7gUW+DuqRZOQhq51JqCPjCTkuTVQpnc4Myjeuud96UBFKfmTDAkrwNN6nACFb6
Y/noqXWuuhU8bNdDOozs2NGDeNKSpiYyF02NQ+HyQvXILhFYvl+kFgQESOQKed6P
eiWEOuIRR+jRZ/TM3BGIOsH7lJRtT4gtukN6lRSuY6CPPF83QR8uFPbiYgCigoSc
M2b6gtpHoKVOgOSl7K38Z4kW9u8PK+zKUz6rwX6OC3Xz3EilG3Q9ijTu/+qjSJzv
jLXS4ArZgkxM5xOSiw==
-----END CERTIFICATE-----

-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCuRosFjYz5JakC
5qEGwGwic4gOxBzrokJXpq4cajd9aCFyNJkl1hoUdcwpgXLZxYtaNccYE1J/4dpt
mtgWRLnVY7ShifriySzfoy34SWvMXY4Ec103VjBPGYvFXdzj8ROtSlwUeLEDRL8M
demeO/Diui5bfDzNFltN0zB2eLMperweX+4HPBN90rhnv4OiySXq3V46qkJvFZDj
7Y+i40yXhRVxL98RH3w/JdfZ1Rp7/SC7mGf+7WVG0Ek5MVxaDSkVC4Pm58ASRurd
Qki0VfFmxKpxoeEotO3xo6NDaF1pidR9vYBNOakmOWtX8dg74H8EgL/f0K33l6SH
NyVUVO2hAgMBAAECgf9hSK/CYcoYKpW2MNgi1LeIY8XHuGIMh39RPpJi+kgPkVla
T1JOdL4KPdfCM6jROB0aNnr1TZP4HzO3i4CkraivHgFvS37pqjOKg6TdvN6YLoFg
qqWWhl5hSXlkq4jrFWBOk/vi0Zy+nlmnswq+ced+KUBHgYrPUXOWdhXPjIE23Yji
crqZhV5osAY535lAsDMrOsxB25yJSZENBNWDpgHSypvcN9Hu6tFz33Y85g6b4Spj
vbypSlJLCVMs9/VRt4xMnXE8TgVvIqWwISAmo+z6pB/TnJjg0zbW0SOgqI0I6p97
+TiRat6zuvwUEUtuHkEvQ8c1/MJGGx0xs86q9AECgYEA1MJ2sCBV8iasstR0cAUR
43HYs+f9qC3cIDlnqWjV9ZTTefRjo5pZne5E70NtA8oamEDU6P1m5BlVCiu0FAZj
5FWA5RS/pFp5M+KYOgDKzALC01vLytDkPI+rvBnbBJoa0OZfTsB6XNJbS8/Uvf5C
7R4Iqv3e062Eg8lk8L2glAECgYEA0bHQ94EgS3OZA4v5mk3D4mLAilNKesJioCXO
tmpzaRYzNlamLaVCep+UwovL0mKBeX+TveEQTdyesdM/Wg+cS34kznLFSkIE/XCD
F8WYx7BbcraxqxoYhMB2y1PJ0oCPJOje+Tb17z3MqJRHpsGpjf+81iv6wHZRWvvX
Pbjj2aECgYEAkc1yaODABWJbl3HhGaNfzu6GA0RIoKhM4gh08bPWbKXBByJj5gow
v/o5Y35hhudJsm07ey+tA0QY8w9gKRj3+9JcsqC1dHxL8zKl/5nrYEPEH/QYhLUC
tD4BArb1UQIKvn4hcmaVdGb0CdAzisBkPPsIFaZEvet7lJS/h/trwAECgYBujprH
M4xMW5ksFou2ABQr8rbi90EIch4/o09WO8+3cx3zI0IgRMZFEogC/mOq+4aaAVpq
vRO0iYId7Wu0VxCneM19D2PXX/FzkfN8ABEqD2BXnd0UggC1VSgM0ZNR6bgO1Lxi
lsiZp3KU2wDf+bEkjdYI8U0WVgtUtfzorOdsoQKBgQDLzq6m0DwDuUpUrXCQ8280
Mag6kb4ge8DEIqbz/Z8Wsfqx3vfqmuGHKmOPCR93nujfjBh0SW9iF8QbRz2PBzvN
X0Ltr9VxzkDzI0axxXE2Gmnjn0qL2leuITSK82t7R3XnUO2Ql1nFI39dqyBmB4FE
UFaO/ZEk0LbjgGpU4uqC7A==
-----END PRIVATE KEY-----

[edit]
vyos@vyos#



vyos@vyos# run generate pki ca sign ca-inst-test03
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated CA certificate into the specified filename
  install               Commands for installing generated CA certificate into running configuration


[edit]
vyos@vyos# run generate pki ca sign ca-inst-test03 file
Possible completions:
  <filename>            Write generated CA certificate into the specified filename


[edit]
vyos@vyos# run generate pki ca sign ca-inst-test03 file subca-t03
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki ca sign ca-inst-test03 file subca-t03
Do you already have a certificate request? [y/N] y
Paste certificate request and press enter:
^CAborted
[edit]
vyos@vyos# run generate pki ca sign ca-inst-test03 file subca-t03
Do you already have a certificate request? [y/N] n
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/subca-t03.pem
File written to /config/auth/subca-t03.key
[edit]
vyos@vyos#

vyos@vyos# run generate pki ca sign ca-inst-test03 install
Possible completions:
  <certificate          Commands for installing generated CA certificate into running
                        configuration
  name>


[edit]
vyos@vyos# run generate pki ca sign ca-inst-test03 install subca-0301-inst
Do you already have a certificate request? [y/N]
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)

Enter country code: (Default: CN) Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Enter how many days certificate will be valid: (Default: 1825)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#
[edit]







vyos@vyos# run generate pki certificate
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated certificate request and key into the specified filename
  install               Commands for installing generated certificate private key into running configuration
  self-signed           Generate self-signed certificate
  sign                  Sign generated certificate with specified CA certificate


[edit]
vyos@vyos# run generate pki certificate
Enter private key type: [rsa, dsa, ec] (Default: rsa) dsa
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN CERTIFICATE REQUEST-----
MIIEBzCCA60CAQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAO
BgNVBAcMB0JlaWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwH
dnlvcy5pbzCCA0gwggI6BgcqhkjOOAQBMIICLQKCAQEA/qU1Yz+NA0CKdj4Rt0/7
oOQRon+YcDHapD/vUnP9nft2srLtjWyzKGFzID/RfXfII+SZWfAZePME+lxfkFtB
5O94+N10llYsBpajRy2JVYhJmMl+U7CYnQVd+iHKEAjWipbJOaTAR7CJjrP6U8hv
2XkNAHyBIboLr99H13UxNdVapLpW0DdZ0W5J6dCCet0e5Z8PzOfaOH8Rwex9oS8u
IpGS4yrX3xRDF95pT3ifDMTBuorb+5v1YvQOITbm2SakXHGlNT/M92kzqta126JL
WiWfYU6MSBGXx1c7RuYSidzTJ1BaHX185lxtO8oZRHbhRWROglQgFjWbjQ6HrfpM
IQIhAPkOUJ/yzhNGWTSahlYmdZM6jDdB0mEGcNWn9Hd8+2SHAoIBAQDq1SDkqBjq
9o1iYFraSIiegzt8r4ejZtVKXQeX7sGfhDEc35JfpR3gp4nVlr/9LixCGL2FqtpR
DI413Rmhyhe/0UFIj1L9s2GGh3Mlmt7yyFK8DUuiPL9xI0QEef5yMRj5RfnC7Nan
1IoR/ZNcm6NKW3sfhnbILECpWMMD3jm7trA/KJUx3lMS/TDzLKUpf9YXY19kHQbV
eV4yrBWPYMGDzhShcXFIyQHsC683uPv0t7bzY2UndoyEnfN6I8pYeuJ8dwXACsCT
hd3IZ9+q8cqSA1++j8/5TcP0mh7u1Ykbu8rm/vnsYzzdAj1WxDYAXLNByAZ2pk1U
tV94TQe20xfVA4IBBgACggEBAJiSuDBLOwFM2VKzY6bPF5jYgO0zdpPd3lDTOFzN
XGOFRF74BJPWhJBPYX+C5eU1pB7iomdbu/xzuhNyqXXL4TS4m0w8nJ/sNYW673BD
+QMehk3tdBYb0w3CuozcEMUSRBfNr+sCAkWUqdzI81v5ksEZNGS4CW5G+oRLQnU9
WP9by7kj8IL5eb252jUJvq4a11tfEXW0VBkz9joOHK91c2DcoenFATApFUuZEUBF
xKDMRT3mrYCH+wc+s0WsPJeoYk51m8PlWWris6XEH8r5Q5DGttEoeUDHDtz65yqq
Rmm21Bteqi8gNKwsbJDWn6coBqoBW1g53Iu0tmP/ilGwyBWgADALBglghkgBZQME
AwIDRwAwRAIgCfsGvT333vBiiNWK2fDmm24F0GhKlHYYME/PI8iOPl0CIFaZjC2X
bgvTwDhZpBde5nWMuerJfeYtQp36/oooQshX
-----END CERTIFICATE REQUEST-----

-----BEGIN PRIVATE KEY-----
MIICZQIBADCCAjoGByqGSM44BAEwggItAoIBAQD+pTVjP40DQIp2PhG3T/ug5BGi
f5hwMdqkP+9Sc/2d+3aysu2NbLMoYXMgP9F9d8gj5JlZ8Bl48wT6XF+QW0Hk73j4
3XSWViwGlqNHLYlViEmYyX5TsJidBV36IcoQCNaKlsk5pMBHsImOs/pTyG/ZeQ0A
fIEhuguv30fXdTE11VqkulbQN1nRbknp0IJ63R7lnw/M59o4fxHB7H2hLy4ikZLj
KtffFEMX3mlPeJ8MxMG6itv7m/Vi9A4hNubZJqRccaU1P8z3aTOq1rXboktaJZ9h
ToxIEZfHVztG5hKJ3NMnUFodfXzmXG07yhlEduFFZE6CVCAWNZuNDoet+kwhAiEA
+Q5Qn/LOE0ZZNJqGViZ1kzqMN0HSYQZw1af0d3z7ZIcCggEBAOrVIOSoGOr2jWJg
WtpIiJ6DO3yvh6Nm1UpdB5fuwZ+EMRzfkl+lHeCnidWWv/0uLEIYvYWq2lEMjjXd
GaHKF7/RQUiPUv2zYYaHcyWa3vLIUrwNS6I8v3EjRAR5/nIxGPlF+cLs1qfUihH9
k1ybo0pbex+GdsgsQKlYwwPeObu2sD8olTHeUxL9MPMspSl/1hdjX2QdBtV5XjKs
FY9gwYPOFKFxcUjJAewLrze4+/S3tvNjZSd2jISd83ojylh64nx3BcAKwJOF3chn
36rxypIDX76Pz/lNw/SaHu7ViRu7yub++exjPN0CPVbENgBcs0HIBnamTVS1X3hN
B7bTF9UEIgIgR86MRRIluqiaFvi/NFxOBxPb1aVxfNHiIYSq7fKNZI4=
-----END PRIVATE KEY-----

[edit]
vyos@vyos#


vyos@vyos# run generate pki certificate file
Possible completions:
  <filename>            Write generated certificate request and key into the specified
                        filename


[edit]
vyos@vyos# run generate pki certificate file cert-file-01
Possible completions:
  <Enter>               Execute the current command


[edit]

vyos@vyos# run generate pki certificate file cert-file-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/cert-file-01.csr
File written to /config/auth/cert-file-01.key
[edit]
vyos@vyos#
[edit]



vyos@vyos# run generate pki certificate install
Possible completions:
  <certificate          Commands for installing generated certificate private key into
                        running configuration
  name>


[edit]
vyos@vyos# run generate pki certificate install cert-inst-01
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki certificate install cert-inst-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N] y
Enter passphrase: 123456
Certificate request:
-----BEGIN CERTIFICATE REQUEST-----
MIICnzCCAYcCAQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAO
BgNVBAcMB0JlaWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwH
dnlvcy5pbzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOx8cbaJQPC4
K5yhNJS1K25TqbDr5+2aAXQc898YYkhds9AqWg/4H5FnhOT1/GL69LeSeR7JTuxe
eP1BmFxE8cHv8HcCJTeaDglTvDgpLM/yF5ww6u7Yawaj5TvYFQ9SCMw3m/+Hytxm
dUM30i5nvjO+PBoeE4xul5QXwIPykblND3zlL1rRQwEShCrvTrfjIJ+2CQjYK6W0
E3CH51+c3fZfdk1Q2fS9vWx2kDgIEmgfo74gYkso7UDRTycz4pavMzHtCm9p39CH
PdykPH2dA/1wgzJBy/T1hd0nFA5zKDkbDIbyhyNF3i3w4YnsTzdSTRQUc3KTO8lT
ieEU2qKXh7sCAwEAAaAAMA0GCSqGSIb3DQEBCwUAA4IBAQC0IV7ewR60Egu+7K0f
a+Ljl2b7oaffw4opdE6/k8thdGexib6pK+9vVkb/ugOW5DpSMyfyDEwotTFXudI0
h+n4aT932eN6mfOmaW1zvZenzS6O/uLlypvl56N4RffpZUYzzqv9Om+Wb2Dst0U3
vVUSLqCSE4BHntfQJSn0HPK7Eqcog14uHLYnQxJYiA1Ixqi8tjDDHWgyhsJPqId2
Xrwv+ub7lSGj1ykGokWuPbfaQwrp0uS3hs7PRNj6Lsdj3BR6tcA9WOAF0zzxSAfp
agNohVyjmLgiPpL7gsNkyzAcWvI24VhFd9NIYbD9sYEJ4VDUG7qsTTQ4o5kl8Cor
4xwU
-----END CERTIFICATE REQUEST-----


2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#



vyos@vyos# run generate pki certificate install cert-inst-02
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
Certificate request:
-----BEGIN CERTIFICATE REQUEST-----
MIICnzCCAYcCAQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAO
BgNVBAcMB0JlaWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwH
dnlvcy5pbzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANqCju401Xwb
ItMAYhhjanuNZRtg8lOAg4WUguDpI0rD2qWJutIfUy9IBl7DnpHMyB8kpJCdQQdl
8qzW3hMScRtPG52/9IzBsGAbnr69nCKL7PW7ycMx1iWmq5L8As3MUSdCGpBE2Q8E
bRueg6BoQSPRLhG99W8cgEnorA/xj4pEl4gUiuHUHyGAE0f4I60n/8y+nhmz8jUb
uYhSXd+rioopQVAHz8xg4x1PhoZPyUxicfdIrX2J/+zm/0pcnqNXmKrKJkgqxmVz
gAQHIOKb+Zb8lFGAmGuikbdoS8A+JGEvB+N0t2sNbT2VqzF2WqEEAKUtm2YwhcDT
TI3C3ao4/iECAwEAAaAAMA0GCSqGSIb3DQEBCwUAA4IBAQDASHa7/RHo6WiKevL9
QFK5Lkar4ILcccYtKjxErBNE7gOOWb14Y9Odc2FLXJRzFzam2wNroXO7tPnkxB4w
jW7ZJk6YHvPp+e7vpq0VOf8LQXF3v1qpVo94ukfrFlJJG4uOdjTtZH2lnXR5a5GD
ZibArgYmdhe8ruPGM34UAosv5ETiacA+hd2T3Lzn4Mx7Nd7IGFwXOIoyQjyAO2Kc
XjKWosNPiJxUNR3hoirPyK2f7uklhDyZw4ZQe1v3ZURGtnG930Qlz3l6YIt86lSY
S8gyUZGSnidkxddRA+OAEhR2sipo5CIJ32Xk8M+OoMi+3U9ssJW/jzxOQCA4gif/
NC5R
-----END CERTIFICATE REQUEST-----


1 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#

[edit]
vyos@vyos# run generate pki certificate self-signed
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated self-signed certificate into the specified filename
  install               Commands for installing generated self-signed certificate into running configuration


[edit]
vyos@vyos# run generate pki certificate self-signed
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN CERTIFICATE-----
MIIDtzCCAp+gAwIBAgIUf5Q4ZmKEdZpv2r+qFt5GNKVarxQwDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAOBgNVBAcMB0Jl
aWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwHdnlvcy5pbzAe
Fw0yNjA4MjgwNjE2MzRaFw0yNzA4MjgwNjE2MzRaMFoxCzAJBgNVBAYTAkNOMRAw
DgYDVQQIDAdIYWlkaWFuMRAwDgYDVQQHDAdCZWlqaW5nMRUwEwYDVQQKDAxFYXN5
bmV0d29ya3MxEDAOBgNVBAMMB3Z5b3MuaW8wggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDCflAXgFjpTylF4A0kScEaO6ICn5uqEf8dkS512/wz3Dd1nb57
xboXfOOkjGgwxxE6SvwPzcJG5O7H1ftFuaGhz6oWgiKwVpteaD5ktZaQ2DgDdBbx
wsaEF0BXKzNfKCTcS65sYnk+qReQFRnW/9BfkPjEjyzgUn2vhK/efY3v0TKrSvz5
KqXW4QhtPMneVTtpI/E/KuVL8yZMS5d2f9lZyy8pdGsznFhh3tExsU1rywWxSUfq
FRmrI4jxwS0YirzCAhyP9Ou3cxegnST0R7zubDLGBYJdm6Zdk4Lfg8vUc8/fP5NR
cYIOv0OW5n+PD/nAOZrzF5FW90xV7B9433EPAgMBAAGjdTBzMAwGA1UdEwEB/wQC
MAAwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMBMB0GA1UdDgQW
BBTJdOSAOBWWBNwYu9JeF/hpOkf7mjAfBgNVHSMEGDAWgBTJdOSAOBWWBNwYu9Je
F/hpOkf7mjANBgkqhkiG9w0BAQsFAAOCAQEAiHXKuvei2/Ie9gQ8kMckk6ppCqWb
bxFcUhpcBArWjbRDdc7P5ZWsNffLmbjMRaSYSN424kjbcxSF+2ciprVZLiBenEnm
D7rYpYaL7yADsaRFgJ0Kit3S+aCmnXA/oIZ2lzdWCpUGPT+pHIwYUkZ5QuhPnaUR
mVDZAKRbH2FWEO/ZL02WrNLmx+ckWjGwNiurIJpNU+WNvFfyTV22/zRu3IlQ8x/h
HFzzWqN/EiY/dsxIf2B3ewbOwuqqB3LsMS3J5R2CtSHl9YxvfOXaDTR/qpCI2Ya8
Xnule6PnoNOwE7D9Ck6FFTThJvUwbTLkCl00fKpGFKRtLA6vyF6NE2hWww==
-----END CERTIFICATE-----

-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDCflAXgFjpTylF
4A0kScEaO6ICn5uqEf8dkS512/wz3Dd1nb57xboXfOOkjGgwxxE6SvwPzcJG5O7H
1ftFuaGhz6oWgiKwVpteaD5ktZaQ2DgDdBbxwsaEF0BXKzNfKCTcS65sYnk+qReQ
FRnW/9BfkPjEjyzgUn2vhK/efY3v0TKrSvz5KqXW4QhtPMneVTtpI/E/KuVL8yZM
S5d2f9lZyy8pdGsznFhh3tExsU1rywWxSUfqFRmrI4jxwS0YirzCAhyP9Ou3cxeg
nST0R7zubDLGBYJdm6Zdk4Lfg8vUc8/fP5NRcYIOv0OW5n+PD/nAOZrzF5FW90xV
7B9433EPAgMBAAECggEAL8AHNd3i9lTjEy6wy0n4SNJ/MhmxhA2rDr1IJNN/ldPp
Ic06qPSgfYfB8/Is2lzlU+R5AgBIRFOMdC+K41Fx52IuphwJHDYHKyR4vQ0ADEup
ZN+pim2Bg4iZ2UzX7fLTKerCxgVfMw0cpdkoYOqpY+0ZxlhIckKObPssmnlE0a2i
yyjdqdgwZL0nVBOeCO23XyaX2z2JN+kWadausYVD6x/T/NP/et1aLPFRci5Xc/Jk
3VSbzMF28r0LjuAm8iOtEdAT2Mi9QsCPEIzLqP7C9sVfb1mGln7PlviCB05eaY+u
IH7x51DgH5JlqWamgdRRJFnTzVObOft613OpkyNRYQKBgQDydT5CWyUF2XnVeuaS
RkvHDHcMnvM+LQT4ienens2OVDUaADaOXBdyJ3+0vMUliFN+srJe2TeVTeTCauhn
X25i5jQcu54tqfdsVOlj3ee+s1W1vpbD5NL6RDx7lfIXgGUOG6ZBGANMfS9kA9XU
Xixr7j9Ieebuj4SJRSFE/Cvw9wKBgQDNW0D/b0+jB6gc4AZQFl7LMBAYTkm4R/mA
eqvrj+CJs/grTE8CYH7OEjiyb+XsuowqjxC0B8a0wsEcEBhqzkssG67aG5vLE1dM
9eo6fOVClvtHNU2ejhTp/ouMjoTaa1E8ZkA3TLOeqpCmNFQ55oq54ba7XnAcJqU/
sZNvz3QSqQKBgFTnpcPK8y4XOEj/3tp+b27m+JGc4AV38nOuqA1jgwxChM30ISa9
LSC2oEwEhu1bzhFiNoBshMBuJJvIoFYC3z8W6kzdjsji6lgvbAOi49KuLmeUtGsp
KJCncJ6+paaBOeI04IWPCSix9fSKO0lBKUEqj1KsDaig7YK8iKgFvsWFAoGAPJNi
hPbMwwaLLJlYw18V71HqLYFKdbWlf6Sv+fii/3u7BOqpk8XrIdZ2KwyfAkm09wjk
oHZ6wu+AD0sgKMFZo1U3KtdiCXFXGzifM0mMRyxKSyMKFm9K9AtGFtwjjFqDyBFR
d/6ELZWavaxJ/BppaZOPV43v/B3aOQOkviKv1qECgYAwF07wXYY1ouwcLEd/tsRl
yCdteAkWDwlrFSiCnST4e6eGgMKcHW6C8tSmv44oTUZMoYEyglVrpESba4wof5TU
VxiPiH605JpfQR2HSvrpJgCWniZ16foWV3VW6Sz7dtO/w221o3xgCFdLDUFCKhid
Ky0f2gjccW0EZ/60qpvV5w==
-----END PRIVATE KEY-----

[edit]
vyos@vyos#
[edit]

vyos@vyos# run generate pki certificate self-signed file
Possible completions:
  <filename>            Write generated self-signed certificate into the specified
                        filename


[edit]
vyos@vyos# run generate pki certificate self-signed file cert-self-01
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki certificate self-signed file cert-self-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/cert-self-01.pem
File written to /config/auth/cert-self-01.key
[edit]
vyos@vyos#
[edit]

vyos@vyos# run generate pki certificate self-signed install
Possible completions:
  <certificate          Commands for installing generated self-signed certificate into
                        running configuration
  name>


[edit]
vyos@vyos# run generate pki certificate self-signed install cert-self-inst-01
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki certificate self-signed install cert-self-inst-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#





vyos@vyos# run generate pki certificate sign
Possible completions:
  cainstall-test02      Sign generated certificate with specified CA certificate
  ca-inst-test03
  oc-ca


[edit]
vyos@vyos# run generate pki certificate sign ca-inst-test03
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated signed certificate into the specified filename
  install               Commands for installing generated signed certificate into running configuration


[edit]
vyos@vyos# run generate pki certificate sign ca-inst-test03
Do you already have a certificate request? [y/N]
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN CERTIFICATE-----
MIIDtzCCAp+gAwIBAgIUUFc/NLbRX3xz+DGGES8tGdItaucwDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0hhaWRpYW4xEDAOBgNVBAcMB0Jl
aWppbmcxFTATBgNVBAoMDEVhc3luZXR3b3JrczEQMA4GA1UEAwwHdnlvcy5pbzAe
Fw0yNjA4MjgwNjE5MjhaFw0yNzA4MjgwNjE5MjhaMFoxCzAJBgNVBAYTAkNOMRAw
DgYDVQQIDAdIYWlkaWFuMRAwDgYDVQQHDAdCZWlqaW5nMRUwEwYDVQQKDAxFYXN5
bmV0d29ya3MxEDAOBgNVBAMMB3Z5b3MuaW8wggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDAVImvB0RqTMYVU0ZilWMLMvNdJEilnQmRXkHD013fhHhvhHAd
szHd2XVtYipSmUMD8V6Wxjg4SHBIOp8ZtJrzVNWAaSAJRwsnXTWM3+G250BHuDl6
Qu/bXGPRkYWQjf3t7oXM998bANUCbqAPzgGHiIuZmWq8CP2Ju5Xvlff0Cya25PVt
Mdfev29sm6WlaFkXAN4zIs4J7sVx0RV9j33SrkoSdUkGm3+HvkNzeJFj/6w+PEJQ
SdliaUeWQpEyjZg2yDYtfqJFyqQ/hMlg+ioW7YM6sxQCPqruupsJxJ4FGRKKRzEZ
fikg+JBH9+0lFg4Siq372SUeAIB1Zv05DhZ7AgMBAAGjdTBzMAwGA1UdEwEB/wQC
MAAwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMBMB0GA1UdDgQW
BBTDkEwD2mAbhJ7O4TNN3cWlTAg72DAfBgNVHSMEGDAWgBTwlJFNsdIL09JOAzUk
9/nIPQUtujANBgkqhkiG9w0BAQsFAAOCAQEACBSkJ+xTu3UGSYP6f3H6pecFJbQI
WddXeaM6U+Y8ouDkH5A+5LE8BSBlzsEHyxAqzWuFlvLUF55wM77uQXsuIOCY8lBR
B05m6Y0TiR333UXsBajE4boUQySJE+i6bAoI6VGbekaVOoBA5ILgqUpkAogycE2a
UwncLYp5CSKlrSyVZpaDgggm3J8UI4ltEhet/LPZiu096+Z7uYGmkRoVZEhfmWuD
pmrK6ICOzP759q7r/SqFrTnusAZwLaCnegW1ZSO1H4wdL3aMN3rVq4Cn8++8g9Ko
kNjIP+Dm0dC7xpp9AuX1VSLbvHUv5n1frLd4vt4qRCQvt/6nzcaU9Si1xw==
-----END CERTIFICATE-----

-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAVImvB0RqTMYV
U0ZilWMLMvNdJEilnQmRXkHD013fhHhvhHAdszHd2XVtYipSmUMD8V6Wxjg4SHBI
Op8ZtJrzVNWAaSAJRwsnXTWM3+G250BHuDl6Qu/bXGPRkYWQjf3t7oXM998bANUC
bqAPzgGHiIuZmWq8CP2Ju5Xvlff0Cya25PVtMdfev29sm6WlaFkXAN4zIs4J7sVx
0RV9j33SrkoSdUkGm3+HvkNzeJFj/6w+PEJQSdliaUeWQpEyjZg2yDYtfqJFyqQ/
hMlg+ioW7YM6sxQCPqruupsJxJ4FGRKKRzEZfikg+JBH9+0lFg4Siq372SUeAIB1
Zv05DhZ7AgMBAAECggEAE/mTtSRtlBa2KefUsw9t0m9vvBg1HVIyeLEP5n0wzjKN
aZOZK1R9lNttaTddSufVAHdUihc7JolLdAz2ki5iO2xvoh8I7z28KFHzalakNCFP
WUOGYK7MB33QdicFdq5wlYIEznVd7AmJle+UWx/bo85oJUM8RRwv7NqZJ2Ftd6B0
rYkTRlklAUeP32tfjSsLfTcZIDoewdCOICfnPh5oHwIcPcLEBjwGNjDoONQZEKGE
JH2GZJpxXA9vvXvd06d+adGJwWoHJ/6KUtS8SK9CFKUA/TGlvq+mzynAzxRiuGIH
SBp01srCWRfVYoTIYZnDmEuA81u+UGLFbOq526CMMQKBgQDsWSmHThFDJzkXKx32
0hMNdvGpesd/t07RyajhIYtt3Kib+m2ESoA15ePfQDG3aRjCCdgVdfL/0C4poEvr
x/9a2vLSE6fplMKgBLbl9MdrChwSxSTs/yudRMsKDkBxcYdNXiVm/mxhvtKZ+re8
NXlhGz0AX1z1PAIwYdBJluclMQKBgQDQUmulNLgVgAu+4OCoWtemS7tlQ4vOWnlK
MSxYdxvq5gKMh+KxKH/+TtJ1b6Y8vP23OPk7f2IKY+um+yZYGxcQ/BPXaxsO5TWW
17cvjO/mwJPFVwwrs2sB0sKkE4+wzpc3tkmVjb31DIA/l7IU03kzdgyVOcR4F1xA
7lRFKAN7awKBgF6Te1PCgJPfsS+9ODtZavhbXW7VS9mmj6rRSHv2QWYQA4SPHJ3w
dgebW6ktdfeP3bFf4RENZtTJCH/tvhO2r087CCnaZbnJpmwEFvBEGDyUChHUw+b2
YQyIx7rZYx5CMMNb5hmlu9cNVhb5xeZRe6XJEYsBniAgCDw2F/Qqp4oxAoGAUZ24
5sS8yk+cSnA4FD1i95f8FzRbdcEke9jAEvi3S1RJ81zZh6biXnPrKG9RpcI1dK8x
lgnWE1QKYyVKZIJYiyL3cxJXS4KpeCuTbWG+K52PR2VPM1/bsJ8t+rJfPVnzDLSy
J5GctoDrTf7Umiwv8+VwEJbNTm94iUfWZDHFC3kCgYEA5Lg/nddW1Fj9EJkRuu+A
r116s/0rRXf0v5XxAHOcSmiFaGR5XBrdnlzUE9GnD3VLTQwt45HS9TpnetKD/H0t
fIbI5+BFp1jfQ52SCa3VsB+RjZGmu9fp8JAJHU04xUpE0oEelRs+5UiI1/jCaCTR
wLrszfwyv2Fi4vQvjunde1E=
-----END PRIVATE KEY-----

[edit]
vyos@vyos#
[edit]



vyos@vyos# run generate pki certificate sign ca-inst-test03 file
Possible completions:
  <filename>            Write generated signed certificate into the specified filename


[edit]
vyos@vyos# run generate pki certificate sign ca-inst-test03 file ca-inst-03-signed-server01
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki certificate sign ca-inst-test03 file ca-inst-03-signed-server01
Do you already have a certificate request? [y/N]
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/ca-inst-03-signed-server01.pem
File written to /config/auth/ca-inst-03-signed-server01.key
[edit]
vyos@vyos#
[edit]



vyos@vyos# run generate pki certificate sign ca-inst-test03 install
Possible completions:
  <certificate          Commands for installing generated signed certificate into
                        running configuration
  name>


[edit]
vyos@vyos# run generate pki certificate sign ca-inst-test03 install ca-inst-03-signed-inst-server02
Do you already have a certificate request? [y/N]
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Enter country code: (Default: CN)
Enter state: (Default: Haidian)
Enter locality: (Default: Beijing)
Enter organization name: (Default: Easynetworks)
Enter common name: (Default: vyos.io)
Do you want to configure Subject Alternative Names? [y/N]
Enter how many days certificate will be valid: (Default: 365)
Enter certificate type: (client, server) (Default: server)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#
[edit]



vyos@vyos# run generate pki crl
Possible completions:
  cainstall-test02      Generate CRL for specified CA certificate
  ca-inst-test03
  oc-ca


[edit]
vyos@vyos# run generate pki crl cainstall-test02
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated CRL into the specified filename
  install               Commands for installing generated CRL into running configuration


[edit]
vyos@vyos# run generate pki crl cainstall-test02
No revoked certificates to add to the CRL
[edit]
vyos@vyos# run generate pki crl cainstall-test02 file
Possible completions:
  <filename>            Write generated CRL into the specified filename


[edit]
vyos@vyos# run generate pki crl cainstall-test02 file crl-cainstall-test02
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki crl cainstall-test02 file crl-cainstall-test02
No revoked certificates to add to the CRL
[edit]
vyos@vyos#
[edit]
vyos@vyos# run generate pki crl cainstall-test02 install
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki crl cainstall-test02 install
No revoked certificates to add to the CRL
[edit]
vyos@vyos#



vyos@vyos# run generate pki dh
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated DH parameters into the specified filename
  install               Commands for installing generated DH parameters into running configuration


[edit]
vyos@vyos# run generate pki dh
Enter DH parameters key size: (Default: 2048)
Generating parameters...
DH Parameters:
-----BEGIN DH PARAMETERS-----
MIIBCAKCAQEAuSn1GcDvyjkENGi6kNIIJ6QCH048iCGfIEXg33vualy7EmoOeC1r
UMyVdYHwTQPmk7RrL1a2YXk922kQnUT8FoEBbwajABAz6g2P7t0lzCIjXlu44/vG
I/cZaJSbKaApuaAOakfvuU3e5iLbmnukakOruevDK/LJSF+z141V4o4yQAyYQUsp
Xz7lP2oSvA3sUKI6vNggrKQQki9cgs3xSNPIrjGviCy6k2q1D2LnaUPZG3FG/EFd
d3ZLOvP9mb4/7DLvH6M36vh0j7fsJZXbMuvP8sPnVhNMk5o5PU7K3GKEWdizjqBD
+ltPb7pNY9fVhT/bJEQ8AV8pH1KEdiCyhwIBAg==
-----END DH PARAMETERS-----

[edit]
vyos@vyos# run generate pki dh file
Possible completions:
  <filename>            Write generated DH parameters into the specified filename


[edit]
vyos@vyos# run generate pki dh file dh-test1
Enter DH parameters key size: (Default: 2048)
Generating parameters...
File written to /config/auth/dh-test1.pem
[edit]
vyos@vyos# run generate pki dh install

  Incomplete command: generate pki dh install

[edit]
vyos@vyos# run generate pki dh install
Possible completions:
  <DH                   Commands for installing generated DH parameters into running
                        configuration
  name>


[edit]
vyos@vyos# run generate pki dh install dh-install01
Enter DH parameters key size: (Default: 2048)
Generating parameters...
1 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#
[edit]
vyos@vyos#
[edit]
vyos@vyos# compare
[pki]
+ dh dh-install01 {
+     parameters "MIIBCAKCAQEA+/cgBFGNtXVZQycOwF4tVtbUghbFTtsZ1NJDI9XH8yuISwaFNYEYPAURysvydXdteVWmA1RU2yNBraQcm/+9rY6IQ2K3QhAbtT16uNKr3Oye4kiUlVYCSRAXNZFkK4yC2JENTgTVE9S5UnWX2GYvKjP9kKfjqu7xCGh+L8wkumXF8F3EkVvYOlNuUrOyC2Cu48XAkJ2RInaA50w35neiPuTAaMiMhOCWsRpQvgqPjJfQcrtcEdu7Z2tV+hIbdQfA+SSDEImsA+AQT1ZOd3IxZr0h+bsHzmJKp8p1yTPP6oZa5lVqMHlEBcx3tiDwSSM8zp5oINwJqK3FydWhlXSSJwIBAg=="
+ }

[edit]
vyos@vyos#





vyos@vyos# run generate pki key-pair
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated key pair into the specified filename
  install               Commands for installing generated key pair into running configuration


[edit]
vyos@vyos# run generate pki key-pair
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvdnceMPjYhcoTYLY0OMh
ycu6H+QRXldJxeheVSXf+aUqYa7f8rGJkb3vN0iOGCJkPzIJg9k9wn6k3fOgkon8
XOG/Nx98+lFtV2mJ7/zo2+bMixYuNifxgXx7LLu3/Z6t2Qyjsexz2DjZRb9tqs2a
GUGeS4xkWpOXPD6ARaKEPK38gN5PTEywmFOSZB8L6UsAbD+x/ufbGjMiJPWQrSol
F+6BUuQ1tcyAMCXI1VjPGaosTzKpRWJO5QYflNtla5xOYqLOBG7B5Fan2By9jQ9d
qt2xcIPVdkVGQ/1xgIOoO8zrozDjRivR0wZ+KKTI9h+pZ1gDGe3gQObRuCRWMtqj
JwIDAQAB
-----END PUBLIC KEY-----


-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC92dx4w+NiFyhN
gtjQ4yHJy7of5BFeV0nF6F5VJd/5pSphrt/ysYmRve83SI4YImQ/MgmD2T3CfqTd
86CSifxc4b83H3z6UW1XaYnv/Ojb5syLFi42J/GBfHssu7f9nq3ZDKOx7HPYONlF
v22qzZoZQZ5LjGRak5c8PoBFooQ8rfyA3k9MTLCYU5JkHwvpSwBsP7H+59saMyIk
9ZCtKiUX7oFS5DW1zIAwJcjVWM8ZqixPMqlFYk7lBh+U22VrnE5ios4EbsHkVqfY
HL2ND12q3bFwg9V2RUZD/XGAg6g7zOujMONGK9HTBn4opMj2H6lnWAMZ7eBA5tG4
JFYy2qMnAgMBAAECggEAA0GNSnTxnWkQQ+QOm+aJWdCorItY0OlmVoKZu5Qet0Vh
6LL7HEp3NYywYZ5Y8YkFdyAAkcZUDNXnNfdLtbewIFeu098yYYir+2fP+dG4nKzk
rS4ANOWSesoLwsSlbzAdgy94T0Di675t24hg9SD5l51Mfbc2sWb+nQXlZUxYQEIk
C4QWBl2SpR61yepPZqol4Lyj1ooVKjoRvZ8tDWlrbhd9wWq/6+I3FwvI2RsnffRi
EtZtH4RXmcxuVcmHndxj/MZzoMaSEYKxoWLr5+TOYpQUIB53M23b5+5zMs+UWISz
xNn5+FvNTiInSmVtSytV+r8Gx80/jA9QrPBnabJVIQKBgQD1WrFP+F9e9Q50bLtk
wg1KgoR9DJ3Hk0qZz5M9RPkEYjoWLMZXcfiXvTFN/OG8YHYjOtbebpfEkV34iOA4
2u/iDuxjdNPVyPTFscLL2H4uXfsgtEaCfqPPB7LDUVkkdhyFfv2E4SxfZDIiOUSw
15PhMXIcr6C3nkpQr/O4xP0F6wKBgQDGFqiL+rzN1fqpNjpbUMu1QYclpVNBAhJy
igPhZOVSBEyYfl8oXqwObNWHZaywFFW8uvatPlCpua9pDAMNupRQuwPDG2dBubpy
/FFzV3rNDI05OzGitOJM65WVTJjxEuNZ8bJFQ8wM3hlF8fHuE3hjhdb50FSYZOuY
qTJbWz9ctQKBgBAECYsE1YTnTjg/WMQs/p0cg/V9u1bpwHbl2+Cl/fNRTiVgatoO
cIHHMc67cSjQyyVlk90VLwb/zjiJBsnvULVa8AdV+vX7li7JecPAsAvqypfJ7Mhb
5+l9wSeKydzdcOMt9PKVmEXpznP5dQhuKhMLHT3OIRmbVZKKycgH49RdAoGBAJdS
F89W64QSQjmhQ1MelX8RX7xSXxb6Dj2RUQWNneDZh+m2H9sm9yjN2xBji1e3MQfL
i0UspVIClw0YL/z82vAQ7P7OoEKFLvlH5rDF0vlw7TEbFv/ETluUW+CBcxQ16Zd8
G0LuV6I8x/G2sam9FepxA5gynW0NKyyjk+RWAEFBAoGAKx/DL+hxAUrPuYAlJg6O
YuzJn0iBWUIeJIatj4e9FXqzRxe09RQxE/YAAEq59Ej1CB7ZJdk+b1b+poedX7+f
PwKUQKXiteznBMB5+8NTPbjMp5S9E5dMuJsLlHJ159e+XhfiJr29QurP2Lrdm+E+
GWOFamgUQinqu/J+ApqKXI0=
-----END PRIVATE KEY-----

[edit]
vyos@vyos#


vyos@vyos# run generate pki key-pair file
Possible completions:
  <filename>            Write generated key pair into the specified filename


[edit]
vyos@vyos# run generate pki key-pair file kp-file-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/kp-file-01.pem
File written to /config/auth/kp-file-01.key
[edit]
vyos@vyos#
[edit]
vyos@vyos# run generate pki key-pair install
Possible completions:
  <key                  Commands for installing generated key pair into running
                        configuration
  name>


[edit]
vyos@vyos# run generate pki key-pair install kp-inst-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
Do you want to install the public key? [Y/n]
Do you want to install the private key? [Y/n]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#







vyos@vyos# run generate pki openvpn
Possible completions:
  shared-secret         Generate OpenVPN shared secret key


[edit]
vyos@vyos# run generate pki openvpn shared-secret
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated OpenVPN shared secret key into the specified filename
  install               Commands for installing generated OpenVPN shared secret key into running configuration


[edit]
vyos@vyos# run generate pki openvpn shared-secret
-----BEGIN OpenVPN Static key V1-----
b271dc5369f73b3ad682601842a375f7
a6d203a2ce11c5daca8f42169ea81529
d64ed1ba290931ef66e779ae20e10fd3
9f664dc399e4c29d686345770de06104
210836979c518cba20cb2c5a049c04b7
2f13c43f926af7ca39267ab437c0c9e6
3c3c520bcae929de072e89e5d3bbcfec
29d110e70e615ee251c847c77b46912a
c1234dbd39ab0f1990cf03cc92971b53
982d7b5cced81318973179e83e0af4db
edf26e39444b631a17ec9742f0ece636
b332e0e72156d89a96519ee1829043d8
beb73bb4f3567edd9402f3ce77ab5033
8a9156e1d8a70987f21020fcaa2dcf86
53de0e1bf68226c746c3b565c9418333
2facf8daf67b2083fe5cab74314f646a
-----END OpenVPN Static key V1-----
[edit]
vyos@vyos#
[edit]

vyos@vyos#
[edit]
vyos@vyos# run generate pki openvpn shared-secret file ov-file-01
File written to /config/auth/ov-file-01.key
[edit]
vyos@vyos#
[edit]
vyos@vyos# run generate pki openvpn shared-secret install ov-inst-01
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
[edit]
vyos@vyos#
[edit]



vyos@vyos# run generate pki ssh-key
Possible completions:
  <Enter>               Execute the current command
  file                  Write generated SSH keys into the specified filename
  install               Commands for installing generated SSH key into running configuration


[edit]
vyos@vyos# run generate pki ssh-key
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDM+1TZEEi27noVnlX1/4gBoRzqVfhi2oEKUzwVkLqri2f30AsSREk+Oq8rLs4vSe8havm3G96tUx04Vosg9SkkSnijMd0I8SdobbAAr45QMXHGoWrS41Go9ugC63XGyv6klriDff9SwC72Gxa7fwpJwN6F71UjZ73Xs5hAptsOeJRLQ1cFs1ZMoN7RRcdriIXmR7l17oXKf8KzsyTnnAZpO2iqNir1KPs+FqGqjuQcP5n/Eyt+X1xFt2jK64WGebC+d/3L7uSZnSVSbV94sDqbOiIjdLWxxkjEmnSeQNaPAW87taH6ei3Oq6w8K8vXQB65UEfIxawolh1ZAOXjgPnl

-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcnNhAAAA
AwEAAQAAAQEAzPtU2RBItu56FZ5V9f+IAaEc6lX4YtqBClM8FZC6q4tn99ALEkRJPjqvKy7OL0nv
IWr5txverVMdOFaLIPUpJEp4ozHdCPEnaG2wAK+OUDFxxqFq0uNRqPboAut1xsr+pJa4g33/UsAu
9hsWu38KScDehe9VI2e917OYQKbbDniUS0NXBbNWTKDe0UXHa4iF5ke5de6Fyn/Cs7Mk55wGaTto
qjYq9Sj7Phahqo7kHD+Z/xMrfl9cRbdoyuuFhnmwvnf9y+7kmZ0lUm1feLA6mzoiI3S1scZIxJp0
nkDWjwFvO7Wh+notzqusPCvL10AeuVBHyMWsKJYdWQDl44D55QAAA7h78yfHe/MnxwAAAAdzc2gt
cnNhAAABAQDM+1TZEEi27noVnlX1/4gBoRzqVfhi2oEKUzwVkLqri2f30AsSREk+Oq8rLs4vSe8h
avm3G96tUx04Vosg9SkkSnijMd0I8SdobbAAr45QMXHGoWrS41Go9ugC63XGyv6klriDff9SwC72
Gxa7fwpJwN6F71UjZ73Xs5hAptsOeJRLQ1cFs1ZMoN7RRcdriIXmR7l17oXKf8KzsyTnnAZpO2iq
Nir1KPs+FqGqjuQcP5n/Eyt+X1xFt2jK64WGebC+d/3L7uSZnSVSbV94sDqbOiIjdLWxxkjEmnSe
QNaPAW87taH6ei3Oq6w8K8vXQB65UEfIxawolh1ZAOXjgPnlAAAAAwEAAQAAAQAAgQu5NEOMLkj0
Pafwy23pBx2RlqAzlLL631qHTmGkeLAgRA2K6spn/JqgAg+gE8/35pHyTn9n22D32aqiQZ1rc+1u
WqSJrZd5t8SriRhR/9Ug9muoqhtyIsKjozLucrhZQkT2OdHuFlU8kLN9HDezwmV/ByglRqTeX22G
ly0fENFil2kMHwZUpjK3SqSn80dJXdIfa/vKOea2Hdd52BBvyWG8zieddLrudC4Hb4rzy2LPyrfZ
uEh2LG7EdEFq0SvMRrKX+nwioANG9olbM3hp2lW2HDPmULDFNw6Ykh3vOpTeEsy3Fg+Z1AR4LMev
/vOL/XS4ZdP17v2hIvXwSDsBAAAAgCecax8B5CZryNx/qNdTh6WFH32NZP8TczY5GUIumCDc6U3/
aSWKCUk16TaH2hhDSTX/f59v+68AVLmOWW9rEkTsQY5/6tb3GkyJA5nert4S3pV2pNWwJ76l1+Gi
G/BerOlSTcHmyjhzi75+LOUj/px6x13ft9dEV2ATi6C0zSH+AAAAgQDtbxjBQTQCcf7GR1n79c6W
f0kldYYFzrJLcW/oEdhFF1AuEYtD1a9Vd12CR7PYr3DIi1gTHSaDvBtpjMkySC1azT/RKt9Eqz/a
dYeve92jTqiC2gSEP8OpfomXgxhJQ1eT2NPMoeRF6OwJ7dAXoYabjafuJ4cv6QSbmVrAwf/8ZQAA
AIEA3QKc/tFa3tQ722arjAoVKFrpJs9DXX/d+oovw9H+nDqlTNSrS0g5wprday6Wp+DBJeKboVjN
mqh8llJ7exprIIygbCagyMpjzSbKLVwjaxqrMxjc+/Cs+faniLeLSkwq5TM6l1B4ORU2jqy80OR+
rEw3PQGICspeDESrDj4Xb4EAAAAAAQID
-----END OPENSSH PRIVATE KEY-----

[edit]
vyos@vyos#


vyos@vyos# run generate pki ssh-key file sshkey-file-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
File written to /config/auth/sshkey-file-01.pem
File written to /config/auth/sshkey-file-01.key
[edit]
vyos@vyos#
[edit]
vyos@vyos#
[edit]
vyos@vyos# run generate pki ssh-key install sshkey-inst-01
Enter private key type: [rsa, dsa, ec] (Default: rsa)
Enter private key bits: (Default: 2048)
Note: If you plan to use the generated key on this router, do not encrypt the private key.
Do you want to encrypt the private key with a passphrase? [y/N]
2 value(s) installed. Use "compare" to see the pending changes, and "commit" to apply.
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcnNhAAAA
AwEAAQAAAQEAqdBBj+UT/y1xLfeYA1KFqWGEpANCPyXiXRKK8OCS+OvYHIB78r7jLC5h+QoPsdLp
ItLB1jYnO2xeJirjzkytJZnGCtme7NB59n86xg9UxVKhFetFkp6RhFvvJ77y+g/VmP04YTDcfqCp
zDypT3UsPiBAIj7uqH2CX7iBXGgHoxy74FHXBR6ywx0P+91pJXSdTvCXURkGV02j6kfdCdHdhsX1
mbDqbJzvXS6/gbXH25mJT1+TJ+QWMNF1zqhwox3vExqYcQc8gx8Tc2xoqTxSW0xepv/czf6Zwi/E
Z6nm6dQ7GIc/c9/2JVsEF2ylhhX3zXrVAEMOSsP00WGNw7mjbQAAA7gJPDgACTw4AAAAAAdzc2gt
cnNhAAABAQCp0EGP5RP/LXEt95gDUoWpYYSkA0I/JeJdEorw4JL469gcgHvyvuMsLmH5Cg+x0uki
0sHWNic7bF4mKuPOTK0lmcYK2Z7s0Hn2fzrGD1TFUqEV60WSnpGEW+8nvvL6D9WY/ThhMNx+oKnM
PKlPdSw+IEAiPu6ofYJfuIFcaAejHLvgUdcFHrLDHQ/73WkldJ1O8JdRGQZXTaPqR90J0d2GxfWZ
sOpsnO9dLr+BtcfbmYlPX5Mn5BYw0XXOqHCjHe8TGphxBzyDHxNzbGipPFJbTF6m/9zN/pnCL8Rn
qebp1DsYhz9z3/YlWwQXbKWGFffNetUAQw5Kw/TRYY3DuaNtAAAAAwEAAQAAAP8lzzjJ0TeimXuZ
wIcYNkeMbyoZWqBlbwn3rylAeMBArEJyFimC4v2x2KH30UWtUkiWeFawW15g3MAZv3L5fBkRRivS
PqIkGEcPm0R61O8LAFrdhoT3IFdGITIep2VySBRG/BqRiU+O4jbsQpVwG6a+LnAZL+nzmf5tUad7
663Ho0FXMYi66yvNF1BdJnlcQVUgKRoQhHEXr+JO3J6ToFlqp17GhnvQvA6wKXVgQGu5fu+nRcWX
XZoS9w25e8NdhSUR4uoGSf9v7uaAT9DZxJ5M7Mu3FB7bfy5H87l3YCHw4usGFXo5w+A1IzofIQ6L
1Ba2Nmxk8BB/kEMYqNWNi6EAAACBAMD0aJLb47yISj+QeW0EB+ttPqNT4Imedo6d0hVkfi46+ZFA
EuNW03NX6efjdOLInhDG+FsjkDQOUzCsaW/wBLTI5QDZ5EMdFGAONv3btUJmk/TRH/TQwFqwrt7S
jzKHvRe+AI68Yi6vwgvxk+xQHZGUcfLf+xdIR+T2aDlOjD9YAAAAgQDS2i7pXyNncZgdpByMc1xv
+jpzpoXPQgBKWTQUe/9YYzdmpvdAt5ofUzdzJdcDtUzvaIc3JIMCbEw5M9bnvu2oHi2C16Ml9N36
mnuCEMMgtuVwZTfWhiQwqYP7DXTaRkORR/o1TuEl7Fib55mgHRYhIUrum0G0ZECjlH68Dzb2ZQAA
AIEAziyKyg+83EvZw2MkZaFYbv0p48c7m6RxYpI4CfQEQZPS4lp+HPLob9MWFAxUc2oKwacH2mET
2+XneGKC/lewO1MaEYIFq/7YSEzCkIhgoZ14dpwrkcvRQaxI9GK9lnITisePR6GpBj1wvFsjD9nL
lV57pMqucuOxTkY4du0xBGkAAAAAAQID
-----END OPENSSH PRIVATE KEY-----

[edit]
vyos@vyos#
[edit]


vyos@vyos# run generate pki wireguard
Possible completions:
  key-pair              Generate WireGuard public/private key-pair
  preshared-key         Generate WireGuard pre-shared key


[edit]
vyos@vyos# run generate pki wireguard key-pair
Possible completions:
  <Enter>               Execute the current command
  install               Generate CLI commands to install WireGuard key to configuration


[edit]
vyos@vyos# run generate pki wireguard key-pair
Private key: EOzJJiX2Z6z8JQNdIofRsDf6dppFFX7NGLgteCUxSHg=
Public key: APJOcd7gPabt6Az/gTPWDa3fif3+pjc8c/6xQlhhGR8=

[edit]
vyos@vyos# run generate pki wireguard key-pair install
Possible completions:
  interface             WireGuard Interface used in install command


[edit]
vyos@vyos# run generate pki wireguard key-pair install interface
Possible completions:
  <text>                WireGuard Interface used in install command


[edit]
vyos@vyos# run generate pki wireguard key-pair install interface eth3
Possible completions:
  <Enter>               Execute the current command


[edit]
vyos@vyos# run generate pki wireguard key-pair install interface eth3
"eth3" is not a WireGuard interface name!
[edit]
vyos@vyos#


[edit]
vyos@vyos# run generate pki wireguard preshared-key
Pre-shared key: /yRu8E4GXmOU/3frBpKLXRE+XYqEh7uQw5vFyKclKHk=
[edit]
vyos@vyos# run generate pki wireguard preshared-key install
Possible completions:
  interface             WireGuard Interface used in install command


[edit]
vyos@vyos# run generate pki wireguard preshared-key install interface
Possible completions:
  <text>                WireGuard Interface used in install command


[edit]
vyos@vyos# run generate pki wireguard preshared-key install interface eth3
Possible completions:
  peer                  Interface used for install command


[edit]
vyos@vyos# run generate pki wireguard preshared-key install interface eth3 peer
Possible completions:
  <text>                Interface used for install command


[edit]
vyos@vyos# run generate pki wireguard preshared-key install interface eth3 peer eth4
Possible completions:
  <text>                Interface used for install command


[edit]
vyos@vyos# run generate pki wireguard preshared-key install interface eth3 peer eth4
"eth3" is not a WireGuard interface name!
[edit]
vyos@vyos#

















