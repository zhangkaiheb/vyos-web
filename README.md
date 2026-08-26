# VyOS Web Config

一个面向 VyOS 的 Web 配置系统，目标是将常用命令行配置能力以可视化方式提供出来，同时保持与 VyOS 原生命令结构的一致性。

## 项目简介

VyOS Web Config 提供了完整的前后端实现：
- 前端基于 Vue 3（浏览器原生 ESM 方式）
- 后端基于 Python WSGI（生产环境使用 Apache + mod_wsgi）
- 配置读写对接 VyOS 原生配置能力
- 支持权限控制、审计与日志、帮助文档映射、在线更新等能力

该项目主要用于在独立目录中部署 Web 管理面，避免修改系统原有核心文件。

## 主要特性

- 菜单与配置路径贴近 VyOS 配置层级
- 覆盖系统管理、网络、路由、防火墙、NAT、服务、VPN、日志等模块
- 配置会话相关能力：提交、确认提交、回滚、比较、导入导出
- 用户与访问控制（含页面可见性与读写权限）
- 监控与日志接口（含 SSE/实时流相关能力）
- 本地帮助文档映射与多语言资源目录
- Web 应用版本管理与更新相关接口

## 技术栈

### 前端
- Vue 3
- Vue Router 4
- Vue I18n 9
- Axios
- 原生模块加载（无打包器依赖）

### 后端
- Python 3
- WSGI 应用
- Apache + mod_wsgi（生产）
- 关键依赖：PyJWT、paramiko、cryptography、requests、openpyxl、vyos

## 架构说明

- 前端入口：`frontend/index.html` + `frontend/src/main.js`
- 后端入口：`backend/app.py`
- WSGI 入口：`backend/app.wsgi`
- 开发服务器：`scripts/run_server.py`
- 监控/推送服务：`backend/websocket_server.py`
- 菜单数据生成：`backend/data/generate_menu.py`

后端按服务拆分（`backend/services/`），通过统一 API 路由对外提供能力；
前端通过页面组件与通用表单/弹窗组件组织交互。

## 快速开始

> 建议在 VyOS 或具备 VyOS 运行依赖的环境中使用。

### 1) 安装（生产模式）

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh
```

安装脚本会完成：
- 目录初始化
- Python venv 与依赖安装
- Apache 站点与 mod_wsgi 配置
- 自签名证书生成（如缺失）
- 数据库初始化

完成后可通过：
- `https://<vyos-ip>/` 访问 Web 页面

### 2) 开发模式启动

终端 1：启动 Web 服务

```bash
cd /opt/vyos-web-config
python3 scripts/run_server.py --host 0.0.0.0 --port 8080
```

终端 2：启动监控 WebSocket 服务

```bash
cd /opt/vyos-web-config
python3 backend/websocket_server.py
```

也可以使用安装脚本的开发参数：

```bash
cd /opt/vyos-web-config
sudo bash scripts/install.sh --dev
```

## 目录结构

```text
/opt/vyos-web-config
├─ frontend/                # 前端页面与组件
│  ├─ index.html
│  └─ src/
├─ backend/                 # 后端 WSGI 应用
│  ├─ app.py
│  ├─ app.wsgi
│  ├─ services/
│  ├─ routes/
│  ├─ utils/
│  ├─ tests/
│  └─ data/
├─ scripts/                 # 安装、运行、文档映射等脚本
├─ docs/                    # 本地帮助文档（多语言）
├─ apache/                  # Apache 站点配置与证书位置
└─ config/                  # 项目相关配置文件
```

## 开发建议

- 菜单结构调整后，注意同步更新菜单生成脚本与最终菜单数据
- 新增页面时，建议同时补齐：
  - 菜单路由
  - 权限可见性配置
  - 帮助文档映射
  - 中英文本地化文案
- 后端配置相关 API 涉及 VyOS C 扩展并发访问，开发时应避免并发读写导致的不稳定行为

## 安全说明

- 生产环境请替换默认自签名证书
- 鉴权依赖系统用户体系，请结合最小权限原则配置账号
- 建议在受控网络中暴露管理面，并配合 ACL/防火墙策略限制来源

## 许可证

当前仓库未声明开源许可证。
如需对外发布，请补充 LICENSE 文件并明确授权条款。
