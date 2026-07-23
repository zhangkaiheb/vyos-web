# IPv4 防火墙

管理 IPv4 防火墙规则链（forward / input / output filter）。

## 字段说明

- **规则编号**：数字，唯一标识一条规则，数值越小优先级越高。
- **动作**：accept、drop、reject、jump、queue 等。
- **协议**：tcp、udp、icmp 或 /etc/protocols 中的协议名称。
- **源/目的地址**：IP、CIDR 或防火墙地址组名称。
- **源/目的端口**：单个端口或端口范围。
- **接口**：入站/出站接口名称。
- **日志**：启用后匹配的数据包会记录到 SQLite 防火墙日志表。

## 操作

- 添加/编辑：在弹窗中填写字段，保存后提交配置。
- 移动/复制：可调整规则顺序或复制规则。
- 清空计数：重置防火墙计数器。
- 导入/导出：支持 Excel (.xlsx) 和 CSV 格式。

## 命令行对应

```bash
set firewall ipv4 forward filter rule <number> action <action>
set firewall ipv4 forward filter rule <number> source address <address>
```
