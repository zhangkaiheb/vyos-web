# VyOS Web Config - Agent Development Guide

## Project Overview

VyOS Web Config 是基于 Vue.js + Python 的 VyOS 路由器 Web 管理界面。后端使用原生 Python WSGI（无 Flask/Django 框架），前端使用 Vue 3 CDN 模式（无构建工具）。

## Project Structure

```
/opt/vyos-web-config/
├── backend/
│   ├── app.py                    # WSGI 应用入口，路由注册，请求处理管道
│   ├── websocket_server.py       # WebSocket 服务（终端等）
│   ├── services/
│   │   ├── auth_service.py       # 认证服务
│   │   ├── config_service.py     # 配置读写服务（核心）
│   │   ├── config_reader_client.py  # 配置读取守护进程客户端
│   │   ├── config_reader_daemon.py  # 配置读取守护进程（持久化 Config 实例，mtime 变化检测）
│   │   ├── interface_service.py  # 网络接口服务
│   │   ├── monitor_service.py    # 监控服务
│   │   ├── log_service.py        # 日志服务
│   │   ├── users_service.py      # 用户管理
│   │   ├── system_service.py     # 系统服务
│   │   ├── notification_service.py # 通知服务
│   │   └── collector.py          # 后台数据采集器
│   ├── utils/
│   │   ├── auth_middleware.py    # JWT 认证中间件
│   │   ├── database.py           # SQLite 数据库工具
│   │   ├── jwt.py                # JWT 工具
│   │   └── response.py           # 响应工具（json_response, sse_response）
│   └── data/
│       └── generate_menu.py      # 菜单生成
├── frontend/
│   ├── index.html                # 入口 HTML（含版本号用于缓存控制）
│   └── src/
│       ├── main.js               # Vue 应用入口
│       ├── App.js                # 根组件（路由、布局）
│       ├── api/index.js          # API 请求层（fetch 封装）
│       ├── stores/               # 状态管理（config.js, auth.js, visibility.js）
│       ├── pages/                # 页面组件（140+ 个）
│       ├── components/
│       │   ├── Form/             # ConfigForm, DualListSelector, DatePicker, TimePicker
│       │   ├── Table/            # DataTable
│       │   ├── Modal/            # DraggableModal
│       │   ├── Layout/           # TabGroup, ErrorDisplay
│       │   ├── Menu/             # 菜单组件
│       │   ── Button/           # ToolbarButton
│       ├── data/                 # Schema 定义（firewallRuleSchema.js 等）
│       ├── i18n/
│       │   ├── index.js          # i18n 初始化
│       │   └── locales/          # 语言文件（JSON，按功能模块分）
│       ├── styles/main.css       # 全局样式
│       ── utils/                # 工具函数（vue-import.js, validators.js, eventBus.js）
├── scripts/
│   └── run_server.py             # 开发服务器启动脚本
└── AGENTS.md                     # 本文件
```

## Critical Constraints

### 1. 禁止顶层导入 vyos.config / vyos.configsession

`vyos.config` 和 `vyos.configsession` 是 C 扩展模块，构造时会修改 `os.environ`。在多线程 WSGI 服务器中，这会导致：
- 已有 ConfigSession 实例的 `__session_env` 被破坏
- 子进程继承被污染的环境变量后 SIGSEGV 崩溃

**规则：**
- 这两个模块**只能**在函数内部延迟导入
- 导入时必须使用 `_SafeConfigEnv` 上下文管理器（在 config_service.py 中定义）
- 示例：
  ```python
  # 错误 - 顶层导入
  import vyos.config
  import vyos.configsession

  # 正确 - 函数内延迟导入
  def create_session():
      import vyos.configsession
      with _SafeConfigEnv():
          session = vyos.configsession.ConfigSession(APP_NAME)
  ```

### 2. 子进程必须传递干净的环境变量

Flask 进程的 `os.environ` 被 ConfigSession 污染后，子进程继承会导致崩溃（SIGSEGV, returncode=-11）。

**规则：**
- 所有 `subprocess.run()` 调用必须传递 `env=clean_env`
- `clean_env` 定义：
  ```python
  clean_env = {
      'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      'HOME': os.environ.get('HOME', '/root'),
      'USER': os.environ.get('USER', 'root'),
  }
  ```

### 3. 使用完整路径调用系统命令

许多系统命令不在默认 PATH 中。

**规则：**
- `ethtool` → `/usr/sbin/ethtool`
- `vyatta-op-cmd-wrapper` → `/opt/vyatta/bin/vyatta-op-cmd-wrapper`

### 4. 配置读取使用守护进程

不要为每次配置读取启动新的 Python 子进程（`vyos.config.Config()` 初始化需 ~10 秒）。

**规则：**
- 使用 `config_reader_client.py` 的 `read_config()` 和 `reload_config()`
- 守护进程通过 Unix socket (`/tmp/vyos-config-reader.sock`) 通信
- 守护进程在 `app.py` 的 `VyOSWebApp.__init__()` 中启动，`__del__()` 中停止
- 配置提交后必须调用 `reload_config()` 刷新守护进程的缓存

## Backend Conventions

### Route Registration

路由在 `app.py` 的 `_register_routes()` 方法中注册，按 HTTP 方法分组：

```python
def _register_routes(self):
    return {
        'GET': { '/api/...': self.handle_xxx, ... },
        'POST': { '/api/...': self.handle_xxx, ... },
        'PUT': { '/api/...': self.handle_xxx, ... },
        'DELETE': { '/api/...': self.handle_xxx, ... },
    }
```

### Service Layer

- 每个服务类放在 `backend/services/` 下
- 服务类使用模块级 logger：`_logger = logging.getLogger('service_name')`
- 服务方法返回 dict，由 `app.py` 统一包装为 JSON 响应
- 异常处理：捕获异常后返回 `error_response(str(e))` 或 `json_response({'success': False, 'error': str(e)})`

### ConfigSession 管理

- 使用 token-based 全局管理（`TOKEN_CONFIG_SESSIONS` 字典）
- 每个登录 token 对应一个独立的 ConfigSession
- Session 超时 30 分钟，心跳间隔 5 分钟
- 通过 `auth_middleware.py` 的 `attach_user()` 将 token 注入 `request['user']`

### 配置读取模式

```python
# 读取运行配置（effective）
from services.config_reader_client import read_config
data = read_config(['interfaces', 'ethernet'], effective=True)

# 读取会话配置（proposed/uncommitted）
data = read_config(['interfaces', 'ethernet'], effective=False)
```

### 批量操作优化

- 批量读取整个配置子树，而非逐条读取
- 批量 ethtool 查询：单次子进程查询所有接口速率
- 防火墙组配置：单次读取整个 `firewall group` 子树
- 使用 30 秒缓存避免重复子进程调用

## Frontend Conventions

### Page Component Pattern

页面组件使用 Vue 3 `defineComponent`，标准结构：

```javascript
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { interfaceApi } from '/src/api/index.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'XxxPage',
  setup() {
    const route = useRoute();
    const { t } = useI18n();
    const configStore = useConfigStore();

    const tableData = ref([]);
    const showModal = ref(false);
    const editingItem = ref(null);

    async function loadData() {
      const res = await interfaceApi.ethernet();
      tableData.value = res.interfaces || [];
    }

    onMounted(() => { loadData(); });

    return { tableData, showModal, editingItem, loadData, t };
  },
  components: { DataTable, DraggableModal, ConfigForm },
  template: `...`
});
```

### ConfigForm Schema

表单字段通过 schema 数组定义，支持以下类型：

| type | 说明 |
|------|------|
| `text` | 文本输入 |
| `select` | 下拉选择（options 数组） |
| `checkbox` | 复选框 |
| `radio` | 单选按钮 |
| `number` | 数字输入 |
| `port` | 端口输入 |
| `textarea` | 多行文本（multi 模式为数组） |
| `group` | 嵌套字段组（children 数组） |
| `dual-list` | 双列表选择器 |
| `multi-select` | 多选下拉框 |
| `date-picker` | 日期选择 |
| `time-picker` | 时间选择 |
| `match-type` | 匹配类型卡片 |

Schema 字段常用属性：
- `key`: 字段标识
- `title`: 显示标题
- `help`: i18n 帮助文本 key
- `type`: 字段类型
- `default`: 默认值
- `placeholder`: 占位文本
- `disabled`: 是否禁用
- `dynamic`: 是否动态加载 suggestions
- `noAutoFill`: 是否禁止自动填充第一个选项
- `suggestions`: 静态候选值列表
- `options`: 下拉选项（`{value, label}` 或字符串数组）
- `children`: 嵌套子字段（group 类型）
- `depState`: 依赖状态（用于强制 Vue 重新渲染）

### DataTable

通用表格组件，props：
- `columns`: 列定义数组（`{key, title, sortable, width}`）
- `data`: 数据数组
- `selection`: 是否显示选择列
- `selectable`: 是否启用选择
- `externalToolbar`: 是否使用外部工具栏
- `pageSize`: 每页条数
- `searchPlaceholder`: 搜索框占位文本
- `:key`: 绑定路由路径等唯一标识，路由切换时强制重建组件以重置选择状态

**选择事件**：使用 `@selection-change="selected = $event"` 而非 `v-model:selected`。

**路由切换重置选择**：当多个路由共用同一组件（如 IPv4/IPv6 转发规则页），需在 DataTable 上绑定 `:key="path"` 以在路由切换时强制重建，避免选择状态残留。

### DraggableModal

可拖拽弹窗组件，props：
- `title`: 弹窗标题
- `visible`: 显示状态（v-model:visible）
- `width`: 宽度（默认 600px）
- `hideFooter`: 隐藏底部按钮
- `zIndex`: 层级
- `headerIcon`: 标题栏图标类型（如 `"delete"` 显示橙色删除图标）

Slots:
- `header-prefix`: 标题栏前缀内容（如警示图标）

Events: `update:visible`, `close`, `confirm`

**注意：** 遮罩层使用 `@mousedown.stop` 阻止点击穿透，弹窗容器使用 `@click.stop` 阻止内部点击冒泡。

### TabGroup

Tab 切换组件，只渲染当前激活的 tab panel（性能优化）。

### i18n

- 语言文件在 `frontend/src/i18n/locales/` 下，按功能模块分 JSON 文件（共 123 个）
- 7 种语言：zh-CN, en, zh-TW, ru, de, fr, ko
- 使用 `useI18n()` 获取 `t()` 函数
- 帮助文本 key 格式：`module.section.help.field_name`（如 `firewall.rule.help.action`）
- 新增字段时需同时更新对应 locale JSON 文件

#### ConfigForm 自动翻译机制

`ConfigForm.js` 的 `translateField()` 函数自动翻译 schema 中的 `title`、`placeholder`、`help` 和 `options.label`：
- 当值包含 `.` 时，视为 i18n key 并调用 `t()` 翻译
- 如果 `t()` 返回原始 key（说明 locale 中不存在），则保留原始 key 显示
- **常见 bug**：列标题或表单标签显示原始 i18n key（如 `ethernet.columns.mode`），说明该 key 在 locale 文件中缺失

#### 后端返回值的翻译

后端 API 返回的数据值（如接口类型）应使用英文标识符，由前端负责翻译：
- 后端 `_detect_interface_type()` 返回 `ethernet`/`vlan`/`qinq`（非中文）
- 前端 DataTable 列定义使用 `render: (val) => t(\`ethernet.type.${val}\`)` 翻译
- 这样不同语言环境下能正确显示对应翻译

#### 翻译覆盖率

当前翻译覆盖率（截至 2026-09-20）：
- ru: ~85.6%, ko: ~85.4%, de: ~82.2%, fr: ~81.0%
- 剩余未翻译主要是数字、范围、IP 地址和技术缩写（如 BGP、NAT、SSH），这些在技术文档中通常保持英文

### API Layer

前端 API 在 `frontend/src/api/index.js` 中封装：
- 自动添加 JWT token 到 `Authorization: Bearer` 头
- 401 响应自动触发登出
- 提供 `get/post/put/delete` 基础方法
- 各模块 API 对象（`configApi`, `interfaceApi` 等）

### Cache Control

`index.html` 中的脚本标签带版本号：
```html
<script type="module" src="/src/main.js?v=20260916"></script>
```
修改前端代码后需更新版本号以强制浏览器刷新缓存。

## VLAN/QinQ Naming Conventions

- VLAN 接口命名：`ethX.Y`（如 `eth1.10`）
- QinQ 接口命名：`ethX.Y.Z`（如 `eth1.20.30`）
- VLAN 配置路径：`interfaces ethernet ethX vif Y`
- QinQ 配置路径：`interfaces ethernet ethX vif-s Y vif-c Z`
- VIF/VIF-S 字段支持连续 ID 合并为范围（如 `23,24,25` → `23-25`）
- VIF/VIF-S 输入支持多行输入和范围输入（如 `20-23` 展开为 `20,21,22,23`）

## UI/UX Preferences

- 表单控件垂直排列（非水平）
- 确定按钮在底部
- 下拉框用于多值选项，复选框用于启用/禁用，单选按钮用于 select 选项
- 帮助信息仅在选择相关选项时显示
- 配置差异显示使用 VyOS CLI 风格（`-` 前缀表示删除）
- 一级菜单字体稍大
- 参考现有页面模式开发新页面
- TabGroup 与外部容器间距 8px
- 错误提示弹窗：蓝色标题栏 + 黄色警示图标 + 关闭按钮（无确定/取消）
- 删除确认弹窗：橙色删除图标在标题栏 + 左对齐标题 + 规则集名称 + 警告说明

## Custom Firewall Rule Pages (自定义规则页面)

三层结构：防火墙类型 → 规则集 → 规则

### 页面文件
- `FirewallIpv4NameRulePage.js` - IPv4 自定义规则
- `FirewallIpv6NameRulePage.js` - IPv6 自定义规则
- `FirewallBridgeNameRulePage.js` 桥接自定义规则

### 配置路径
- IPv4: `firewall ipv4 name {name} rule`
- IPv6: `firewall ipv6 name {name} rule`
- Bridge: `firewall bridge name {name} rule`

### 关键实现
- 名称下拉框在工具栏（创建/删除按钮右侧）
- 创建/删除按钮带下拉菜单（三角箭头样式与一级菜单一致）
- 下拉菜单互斥：点击一个时关闭另一个
- 删除确认使用 DraggableModal，显示规则集名称和警告说明
- `loadNameList` 使用 `false` 参数读取 running config
- `get_config_dict` 返回的 key 使用 `_` 而非 `-`（key_mangling）
- DataTable 绑定 `:key="selectedName"` 以在切换规则集时重置选择

## Lessons Learned

### ConfigReaderDaemon
- 使用 `/opt/vyatta/config/active` 目录 mtime 检测配置变化（commit 后立即更新）
- 避免 TTL 缓存导致的延迟（最长 30 秒）
- Web 端 commit 后调用 `reload_config()` 立即刷新

### Firewall Options Pages
- `loadNameList` 必须使用 `false` 参数读取 running config（而非 session config）
- `get_config_dict` 的 key_mangling 将 `-` 转换为 `_`（如 `default-action` → `default_action`）
- 桥接防火墙预路由规则重复问题：检查 menu.json 而非 generate_menu.py
- `firewall.options.*` 翻译键（如 `forward`、`defaultAction`、`rulesetLabel`）必须存在于 locale 文件中，否则页面显示原始 key
- 防火墙选项页面使用 `FirewallIpv4OptionsPage.js`、`FirewallIpv6OptionsPage.js`、`FirewallBridgeOptionsPage.js`

### Custom Rule Pages
- 名称标签使用 `firewall.options.rulesetLabel` 翻译（避免影响选项页面的 `nameName`）
- 下拉菜单容器：外层 `position:relative`，内层负责边框和 `overflow:hidden`，下拉菜单在内层外
- 三角箭头样式：`font-size:14px`, `transform: scaleX(1.4)`, 无边框背景
- 按钮右边距 `padding-right:4px`，三角箭头 `padding:0 2px 0 0`

### i18n
- 翻译 key 路径必须完整（如 `firewall.options.createName` 而非 `firewall.createName`）
- 新增翻译需同时更新所有 7 种语言文件
- 使用 `rulesetLabel` 而非修改 `nameName` 以避免影响其他页面
- 列标题显示原始 i18n key（如 `ethernet.columns.mode`）= locale 文件中缺少该 key
- 后端返回数据值应使用英文标识符（如 `ethernet`/`vlan`/`qinq`），前端负责翻译
- 翻译 key 缺失时 `t()` 返回原始 key 字符串，不会报错
- 新增页面/字段时必须同步添加所有语言的翻译，否则会出现 key 泄漏

### 后端返回值国际化
- 后端服务函数（如 `_detect_interface_type`）不要硬编码中文返回值
- 应返回英文标识符，由前端 `render` 函数通过 `t()` 翻译
- 这样多语言环境下才能正确显示

## Development Workflow

1. **后端修改**：修改 Python 文件后需重启 WSGI 应用
   ```bash
   # 找到并杀掉旧进程
   ps aux | grep run_server | grep -v grep
   kill <PID>
   # 重新启动
   cd /opt/vyos-web-config && nohup python3 scripts/run_server.py --host 0.0.0.0 --port 8080 --ssl --ssl-port 8443 > /tmp/wsgi.log 2>&1 &
   ```

2. **前端修改**：修改 JS/CSS 文件后需更新 `index.html` 中的版本号

3. **日志查看**：
   ```bash
   tail -f /tmp/wsgi.log
   ```

4. **API 测试**：
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"vyos","password":"vyos"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
   curl -s http://localhost:8080/api/... -H "Authorization: Bearer $TOKEN"
   ```

## Adding a New Feature Page

1. 创建 `frontend/src/pages/XxxPage.js`
2. 创建 `frontend/src/i18n/locales/xxx.json`（i18n 文件）
3. 在 `backend/app.py` 中注册 API 路由
4. 如需后端服务，创建 `backend/services/xxx_service.py`
5. 在菜单配置中添加入口

## Performance Guidelines

- 配置读取走守护进程（~50-100ms），不要直接 `subprocess` 调用 `vyos.config`
- 批量读取配置子树，避免多次单独读取
- 使用缓存（30 秒 TTL）减少重复查询
- TabGroup 只渲染当前激活 tab
- 防火墙组 suggestions 使用 `Promise.all` 并行加载
- 子进程调用设置合理超时（5-30 秒）
