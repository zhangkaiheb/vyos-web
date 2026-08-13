# 防火墙全局选项配置

## 概述

部分防火墙设置是全局的，会影响整个系统。本节介绍可以使用 VyOS CLI 配置的全局选项。

配置命令涵盖：

```
set firewall global-options ...
```

## 配置项说明

### all-ping

```
set firewall global-options all-ping [enable | disable]
```

默认情况下，当 VyOS 收到发往自身的 ICMP echo 请求数据包时，会回复 ICMP echo 应答，除非防火墙阻止了它。

可以设置防火墙规则来接受、丢弃或拒绝入站、出站或本地的 ICMP 流量。也可以使用 **firewall global-options all-ping** 命令。此命令仅影响本地流量（发往 VyOS 系统的数据包），不影响入站或出站流量。

> **注意：** **firewall global-options all-ping** 仅影响本地流量，始终以最具限制性的方式运行。

- `enable`：VyOS 会回复每个发往自身的 ICMP echo 请求，但仅在没有其他规则丢弃或拒绝本地 echo 请求时才会回复。如果存在冲突，VyOS 不会回复 ICMP echo 请求。
- `disable`：VyOS 不会回复任何发往自身的 ICMP echo 请求，无论它们来自何处或哪些特定规则接受了它们。

### apply-to-bridged-traffic

```
set firewall global-options apply-to-bridged-traffic [ipv4 | ipv6]
```

将 IPv4 或 IPv6 防火墙规则应用于桥接流量。

### broadcast-ping

```
set firewall global-options broadcast-ping [enable | disable]
```

启用或禁用对 ICMP 广播消息的响应。系统会修改以下参数：

- `net.ipv4.icmp_echo_ignore_broadcasts`

### ip-src-route / ipv6-src-route

```
set firewall global-options ip-src-route [enable | disable]
set firewall global-options ipv6-src-route [enable | disable]
```

设置 VyOS 是否接受带有源路由选项的数据包。以下 sysctl 参数将被修改：

- `net.ipv4.conf.all.accept_source_route`
- `net.ipv6.conf.all.accept_source_route`

### receive-redirects / ipv6-receive-redirects

```
set firewall global-options receive-redirects [enable | disable]
set firewall global-options ipv6-receive-redirects [enable | disable]
```

允许 VyOS 接受 ICMPv4 和 ICMPv6 重定向消息。以下 sysctl 参数将被修改：

- `net.ipv4.conf.all.accept_redirects`
- `net.ipv6.conf.all.accept_redirects`

### send-redirects

```
set firewall global-options send-redirects [enable | disable]
```

允许 VyOS 发送 ICMPv4 重定向消息。以下 sysctl 参数将被修改：

- `net.ipv4.conf.all.send_redirects`

### log-martians

```
set firewall global-options log-martians [enable | disable]
```

允许 VyOS 记录无效的 IPv4 数据包（martian 数据包）。以下 sysctl 参数将被修改：

- `net.ipv4.conf.all.log_martians`

### source-validation

```
set firewall global-options source-validation [strict | loose | disable]
```

设置 IPv4 源验证模式。以下 sysctl 参数将被修改：

- `net.ipv4.conf.all.rp_filter`

### syn-cookies

```
set firewall global-options syn-cookies [enable | disable]
```

允许 VyOS 使用 IPv4 TCP SYN Cookies。以下 sysctl 参数将被修改：

- `net.ipv4.tcp_syncookies`

### twa-hazards-protection

```
set firewall global-options twa-hazards-protection [enable | disable]
```

启用或禁用 VyOS [RFC 1337](https://datatracker.ietf.org/doc/html/rfc1337.html) 一致性。以下 sysctl 参数将被修改：

- `net.ipv4.tcp_rfc1337`

## 状态策略

### established

```
set firewall global-options state-policy established action [accept | drop | reject]
set firewall global-options state-policy established log
set firewall global-options state-policy established log-level [emerg | alert | crit | err | warn | notice | info | debug]
```

设置已建立连接的全局策略。

### invalid

```
set firewall global-options state-policy invalid action [accept | drop | reject]
set firewall global-options state-policy invalid log
set firewall global-options state-policy invalid log-level [emerg | alert | crit | err | warn | notice | info | debug]
```

设置无效数据包的全局策略。

### related

```
set firewall global-options state-policy related action [accept | drop | reject]
set firewall global-options state-policy related log
set firewall global-options state-policy related log-level [emerg | alert | crit | err | warn | notice | info | debug]
```

设置相关连接的全局策略。

## 超时设置

VyOS 支持按连接类型设置超时时间。可以为通用连接、ICMP 连接、UDP 连接或各种状态下的 TCP 连接设置超时值。

```
set firewall global-options timeout icmp <1-21474836>
set firewall global-options timeout other <1-21474836>
set firewall global-options timeout tcp close <1-21474836>
set firewall global-options timeout tcp close-wait <1-21474836>
set firewall global-options timeout tcp established <1-21474836>
set firewall global-options timeout tcp fin-wait <1-21474836>
set firewall global-options timeout tcp last-ack <1-21474836>
set firewall global-options timeout tcp syn-recv <1-21474836>
set firewall global-options timeout tcp syn-sent <1-21474836>
set firewall global-options timeout tcp time-wait <1-21474836>
set firewall global-options timeout udp other <1-21474836>
set firewall global-options timeout udp stream <1-21474836>
```

设置协议或状态的超时时间（秒）。
