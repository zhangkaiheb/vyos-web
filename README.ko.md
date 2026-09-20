# VyOS Web

VyOS를 위한 웹 기반 구성 시스템으로, 일반적인 명령줄 구성을 시각적으로 관리하면서도 VyOS 네이티브 명령 구조와의 일관성을 유지합니다.

## 프로젝트 개요

VyOS Web Config는 완전한 프론트엔드와 백엔드 구현을 제공합니다:
- Vue 3 기반 프론트엔드 (네이티브 브라우저 ESM)
- Python WSGI 기반 백엔드 (프로덕션 환경에서 Apache + mod_wsgi)
- VyOS 네이티브 구성 기능을 통한 구성 읽기/쓰기
- 접근 제어, 감사 및 로깅, 도움말 문서 매핑, 온라인 업데이트 등 지원

이 프로젝트는 기존 시스템 핵심 파일을 수정하지 않기 위해 독립 디렉토리에 웹 관리 인터페이스를 배포하는 데 사용됩니다.

## 주요 기능

- 메뉴 및 구성 경로가 VyOS 구성 계층 구조와 밀접하게 연결됨
- 시스템 관리, 네트워킹, 라우팅, 방화벽, NAT, 서비스, VPN, 로깅 등 모듈 커버리지
- 구성 세션 기능: commit, confirm commit, rollback, compare, import/export
- 사용자 및 접근 제어 (페이지 가시성 및 읽기/쓰기 권한 포함)
- 모니터링 및 로깅 인터페이스 (SSE/실시간 스트리밍 포함)
- 로컬 도움말 문서 매핑 및 다국어 리소스 디렉토리
- 웹 애플리케이션 버전 관리 및 업데이트 관련 API

## 기술 스택

### 프론트엔드
- Vue 3
- Vue Router 4
- Vue I18n 9
- Axios
- 네이티브 모듈 로딩 (번들러 의존성 없음)

### 백엔드
- Python 3
- WSGI 애플리케이션
- Apache + mod_wsgi (프로덕션)
- 주요 의존성: PyJWT, paramiko, cryptography, requests, openpyxl, vyos

## 아키텍처

- 프론트엔드 진입점: `frontend/index.html` + `frontend/src/main.js`
- 백엔드 진입점: `backend/app.py`
- WSGI 진입점: `backend/app.wsgi`
- 개발 서버: `scripts/run_server.py`
- 모니터링/푸시 서비스: `backend/websocket_server.py`
- 메뉴 데이터 생성: `backend/data/generate_menu.py`

백엔드는 서비스별로 분리되어 (`backend/services/`) 통일된 API 라우트를 통해 기능을 제공하며,
프론트엔드는 페이지 컴포넌트와 공통 폼/모달 컴포넌트를 통해 상호작용을 구성합니다.

## 빠른 시작

> VyOS 또는 VyOS 런타임 의존성이 있는 환경에서 사용하는 것을 권장합니다.

### 1) 설치 (프로덕션 모드)

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh
```

설치 스크립트는 다음을 수행합니다:
- 디렉토리 초기화
- Python venv 및 의존성 설치
- Apache 사이트 및 mod_wsgi 구성
- 자체 서명 인증서 생성 (없는 경우)
- 데이터베이스 초기화

완료 후 다음 주소로 접근:
- `https://<vyos-ip>/`

### 2) 개발 모드

터미널 1: 웹 서버 시작

```bash
cd /opt/vyos-web-config
python3 scripts/run_server.py --host 0.0.0.0 --port 8080
```

터미널 2: 모니터링 WebSocket 서비스 시작

```bash
cd /opt/vyos-web-config
python3 backend/websocket_server.py
```

또는 설치 스크립트의 개발 모드를 사용할 수 있습니다:

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh --dev
```

## 디렉토리 구조

```text
/opt/vyos-web-config
├─ frontend/                # 프론트엔드 페이지 및 컴포넌트
│  ├─ index.html
│  └─ src/
├─ backend/                 # 백엔드 WSGI 애플리케이션
│  ├─ app.py
│  ├─ app.wsgi
│  ├─ services/
│  ├─ routes/
│  ├─ utils/
│  ├─ tests/
│  └─ data/
├─ scripts/                 # 설치, 실행, 문서 매핑 스크립트
├─ docs/                    # 로컬 도움말 문서 (다국어)
├─ apache/                  # Apache 사이트 구성 및 인증서 위치
└─ config/                  # 프로젝트 구성 파일
```

## 개발 가이드

- 메뉴 구조를 수정한 후 메뉴 생성 스립트와 최종 메뉴 데이터를 동기화하세요
- 새 페이지를 추가할 때 다음도 함께 완료하는 것을 권장합니다:
  - 메뉴 라우팅
  - 권한 가시성 구성
  - 도움말 문서 매핑
  - 중국어 및 영어 현지화 문자열
- 백엔드 구성 관련 API는 VyOS C 확장 동시 접근을 포함하므로, 개발 중 동시 읽기/쓰기로 인한 불안정한 동작을 피하세요

## 보안 참고사항

- 프로덕션 환경에서는 기본 자체 서명 인증서를 교체하세요
- 인증은 시스템 사용자 체계에 의존하므로 최소 권한 원칙으로 계정을 구성하세요
- 관리 인터페이스는 제어된 네트워크에서만 노출하고 ACL/방화벽 정책으로 소스를 제한하는 것을 권장합니다

## 라이선스

현재 저장소에는 오픈소스 라이선스가 선언되어 있지 않습니다.
외부 배포 시 LICENSE 파일을 추가하고 권한 조건을 명시하세요.
