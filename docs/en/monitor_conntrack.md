# 连接跟踪监控

## 概述

连接跟踪（Conntrack）监控页面显示系统的网络连接跟踪表信息。

## 监控指标

- **总连接数**：当前跟踪的连接总数
- **连接详情**：协议、源/目的地址、端口、状态、超时时间

## 操作命令

```bash
# 查看连接跟踪统计
show conntrack statistics

# 查看连接跟踪表
show conntrack table

# 按协议筛选
show conntrack table ipv4 tcp
```
