# VrfPage.js 国际化修改摘要

## 修改文件
`/opt/vyos-web-config/frontend/src/pages/VrfPage.js`

## 主要修改

### 1. 导入 useI18n
```javascript
import { useI18n } from '/src/i18n/index.js';
```

### 2. 初始化 t 函数
在 setup() 中添加：
```javascript
const { t } = useI18n();
```

### 3. 将 TABS 常量改为 computed
```javascript
const TABS = computed(() => [
  { key: 'basic', title: t('vrf.tabs.basic') },
  { key: 'ip', title: 'IPv4' },
  { key: 'ipv6', title: 'IPv6' },
]);
```

### 4. 返回 t 函数
在 return 语句中添加 `t` 以便模板使用

## 使用的翻译键列表

### 列标题 (vrf.columns.*)
- `vrf.columns.name` - 名称
- `vrf.columns.description` - 描述
- `vrf.columns.table` - 路由表 ID

### 表单字段 (vrf.form.*)
- `vrf.form.name` - 名称
- `vrf.form.namePlaceholder` - 例如: vrf01
- `vrf.form.description` - 描述
- `vrf.form.disable` - 禁用
- `vrf.form.table` - 路由表 ID
- `vrf.form.tableHelp` - 关联的路由表 ID
- `vrf.form.disableIpForwarding` - 禁用 IP 转发
- `vrf.form.disableIpv6Forwarding` - 禁用 IPv6 转发
- `vrf.form.nhtNoResolveViaDefault` - 不通过默认路由解析下一跳
- `vrf.form.protocolFilter` - 协议过滤
- `vrf.form.selectProtocol` - 请选择协议
- `vrf.form.routeMapPlaceholder` - Route-map 名称

### 标签页 (vrf.tabs.*)
- `vrf.tabs.basic` - 基本

### 按钮 (vrf.buttons.*)
- `vrf.buttons.create` - 创建
- `vrf.buttons.edit` - 编辑
- `vrf.buttons.delete` - 删除
- `vrf.buttons.refresh` - 刷新
- `vrf.buttons.addProtocol` - 添加协议

### 提示信息 (vrf.messages.*)
- `vrf.messages.selectOne` - 请选择一个 VRF
- `vrf.messages.enterName` - 请输入名称
- `vrf.messages.nameExists` - 名称已存在

### 模态框 (vrf.modals.*)
- `vrf.modals.confirmDelete` - 确认删除
- `vrf.modals.deleteConfirmMessage` - 确认删除以下 VRF？

## 总计
- 共使用 **25 个**翻译键
- 所有硬编码的中文文本已替换为 t() 函数调用
- 仅保留一处中文注释（API 返回说明）
