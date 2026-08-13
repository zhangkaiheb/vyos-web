# 用户管理

## 概述

用户管理页面用于管理系统用户账户。

## 功能

- 创建/删除用户
- 设置用户密码
- 配置用户权限级别
- 管理 SSH 公钥

## 操作命令

```bash
# 创建用户
set system login user <username> authentication plaintext-password <password>
set system login user <username> level admin

# 删除用户
delete system login user <username>
```
