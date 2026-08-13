# 系统故障排除

## 概述

系统故障排除页面提供网络诊断工具，帮助排查网络问题。

## 可用工具

### Ping
测试与目标主机的网络连通性。

```bash
ping <目标IP或域名>
```

### Traceroute
追踪数据包到达目标主机的路由路径。

```bash
traceroute <目标IP或域名>
```

### TCPDump
抓取网络接口上的数据包进行分析。

```bash
sudo tcpdump -i <接口名> -n
```

## 注意事项

- 使用这些工具可能需要管理员权限
- TCPDump 会消耗系统资源，建议在排查问题时使用
- 生产环境中谨慎使用 Reboot 和 Poweroff 操作
