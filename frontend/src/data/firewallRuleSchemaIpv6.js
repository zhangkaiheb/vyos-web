export const FIREWALL_RULE_SCHEMA_IPV6 = [
  {
    "key": "action",
    "title": "动作",
    "help": "Rule action",
    "type": "select",
    "options": [
      "accept",
      "continue",
      "jump",
      "reject",
      "return",
      "drop",
      "queue",
      "offload",
      "synproxy"
    ]
  },
  {
    "key": "add-address-to-group",
    "title": "动态地址组",
    "help": "Add ipv6 address to dynamic ipv6-address-group",
    "type": "group",
    "children": [
      {
        "key": "destination-address",
        "title": "目的地址",
        "help": "Add destination ipv6 addresses to dynamic address-group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "Dynamic address-group",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "Set timeout",
            "type": "text"
          }
        ]
      },
      {
        "key": "source-address",
        "title": "源地址",
        "help": "Add source ipv6 addresses to dynamic address-group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "Dynamic address-group",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "Set timeout",
            "type": "text"
          }
        ]
      }
    ],
    "advanced": true
  },
  {
    "key": "connection-mark",
    "title": "连接标记",
    "help": "Connection mark",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "connection-status",
    "title": "连接状态",
    "help": "Connection status",
    "type": "group",
    "children": [
      {
        "key": "nat",
        "title": "NAT",
        "help": "NAT connection status",
        "type": "select",
        "options": [
          "destination",
          "source"
        ]
      }
    ],
    "advanced": true
  },
  {
    "key": "conntrack-helper",
    "title": "连接跟踪助手",
    "help": "Match related traffic from conntrack helpers",
    "type": "multi-select",
    "options": [
      "ftp",
      "h323",
      "pptp",
      "nfs",
      "sip",
      "tftp",
      "sqlnet",
      "rtsp"
    ],
    "advanced": true
  },
  {
    "key": "description",
    "title": "描述",
    "help": "Description",
    "type": "text"
  },
  {
    "key": "destination",
    "title": "目的",
    "help": "Destination parameters",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "IPv6 address, subnet, or range",
        "type": "text",
        "validate": "ipv6"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "Fully qualified domain name",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "GeoIP options - Data provided by DB-IP.com",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "GeoIP country code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "Inverse match of country-codes",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "Group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "Group of addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "Group of domains",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "Group of dynamic addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "Group of MAC addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "Group of networks",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "Group of ports",
            "type": "text",
            "dynamic": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "MAC address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "Port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "disable",
    "title": "禁用",
    "help": "Disable instance",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "dscp",
    "title": "DSCP",
    "help": "DSCP value",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "dscp-exclude",
    "title": "DSCP 排除",
    "help": "DSCP value not to match",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "fragment",
    "title": "分片",
    "help": "IP fragment match",
    "type": "group",
    "children": [
      {
        "key": "match-frag",
        "title": "匹配分片",
        "help": "Second and further fragments of fragmented packets",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-non-frag",
        "title": "匹配非分片",
        "help": "Head fragments or unfragmented packets",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "hop-limit",
    "title": "Hop 限制",
    "help": "Hop limit",
    "type": "group",
    "children": [
      {
        "key": "eq",
        "title": "等于",
        "help": "Match on equal value",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "gt",
        "title": "大于",
        "help": "Match on greater than value",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "lt",
        "title": "小于",
        "help": "Match on less than value",
        "type": "number",
        "min": 0,
        "max": 255
      }
    ],
    "advanced": true
  },
  {
    "key": "icmpv6",
    "title": "ICMPv6",
    "help": "ICMPv6 type and code information",
    "type": "group",
    "children": [
      {
        "key": "code",
        "title": "Code",
        "help": "ICMPv6 code",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type",
        "title": "Type",
        "help": "ICMPv6 type",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type-name",
        "title": "类型名称",
        "help": "ICMPv6 type-name",
        "type": "select",
        "options": [
          "destination-unreachable",
          "packet-too-big",
          "time-exceeded",
          "parameter-problem",
          "echo-request",
          "echo-reply",
          "multicast-listener-query",
          "multicast-listener-report",
          "multicast-listener-done",
          "router-solicitation",
          "router-advertisement",
          "neighbor-solicitation",
          "neighbor-advertisement",
          "redirect-message",
          "router-renumbering",
          "ni-query",
          "ni-reply",
          "inverse-neighbor-discovery-solicitation",
          "inverse-neighbor-discovery-advertisement",
          "mldv2-multicast-listener-report",
          "home-agent-address-discovery-request",
          "home-agent-address-discovery-reply",
          "mobile-prefix-solicitation",
          "mobile-prefix-advertisement",
          "certification-path-solicitation",
          "certification-path-advertisement",
          "multicast-router-advertisement",
          "multicast-router-solicitation",
          "multicast-router-termination",
          "fmipv6-messages",
          "rpl-control-message",
          "ilnpv6-locator-update",
          "duplicate-address-request",
          "duplicate-address-confirmation",
          "mpl-control-message",
          "extended-echo-request",
          "extended-echo-reply"
        ]
      }
    ],
    "advanced": true
  },
  {
    "key": "inbound-interface",
    "title": "入接口",
    "help": "Match inbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "Match interface-group",
        "type": "text",
        "dynamic": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "Match interface",
        "type": "text",
        "dynamic": true,
        "suggestions": [
          "txt*"
        ]
      }
    ]
  },
  {
    "key": "ipsec",
    "title": "IPsec",
    "help": "Inbound IPsec packets",
    "type": "group",
    "children": [
      {
        "key": "match-ipsec",
        "title": "匹配 IPsec",
        "help": "Inbound IPsec packets",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-none",
        "title": "匹配非 IPsec",
        "help": "Inbound non-IPsec packets",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "jump-target",
    "title": "跳转目标",
    "help": "Set jump target. Action jump must be defined to use this setting",
    "type": "text",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "limit",
    "title": "限速",
    "help": "Rate limit using a token bucket filter",
    "type": "group",
    "children": [
      {
        "key": "burst",
        "title": "突发",
        "help": "Maximum number of packets to allow in excess of rate",
        "type": "number",
        "min": 0,
        "max": 4294967295
      },
      {
        "key": "rate",
        "title": "速率",
        "help": "Maximum average matching rate",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "log",
    "title": "日志",
    "help": "Log packets hitting this rule",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "log-options",
    "title": "日志选项",
    "help": "Log options",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "Set log group",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "level",
        "title": "级别",
        "help": "Set log-level",
        "type": "select",
        "options": [
          "emerg",
          "alert",
          "crit",
          "err",
          "warn",
          "notice",
          "info",
          "debug"
        ]
      },
      {
        "key": "queue-threshold",
        "title": "队列阈值",
        "help": "Number of packets to queue inside the kernel before sending them",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "snapshot-length",
        "title": "快照长度",
        "help": "Length of packet payload to include in netlink message",
        "type": "number",
        "min": 0,
        "max": 9000
      }
    ],
    "advanced": true
  },
  {
    "key": "mark",
    "title": "防火墙标记",
    "help": "Firewall mark",
    "type": "text",
    "advanced": true
  },
  {
    "key": "offload-target",
    "title": "卸载目标",
    "help": "Set flowtable offload target. Action offload must be defined to",
    "type": "text",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "outbound-interface",
    "title": "出接口",
    "help": "Match outbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "Match interface-group",
        "type": "text",
        "dynamic": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "Match interface",
        "type": "text",
        "dynamic": true,
        "suggestions": [
          "txt*"
        ]
      }
    ]
  },
  {
    "key": "packet-length",
    "title": "包长度",
    "help": "Payload size in bytes, including header and data to match",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-length-exclude",
    "title": "包长度排除",
    "help": "Payload size in bytes, including header and data not to match",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-type",
    "title": "包类型",
    "help": "Packet type",
    "type": "select",
    "options": [
      "broadcast",
      "host",
      "multicast",
      "other"
    ],
    "advanced": true
  },
  {
    "key": "protocol",
    "title": "协议",
    "help": "Protocol to match (protocol name, number, or \"all\")",
    "type": "text",
    "dynamic": true,
    "suggestions": [
      "all",
      "tcp_udp"
    ]
  },
  {
    "key": "queue",
    "title": "队列",
    "help": "Queue target to use. Action queue must be defined to use this",
    "type": "number",
    "min": 0,
    "max": 65535,
    "advanced": true
  },
  {
    "key": "queue-options",
    "title": "队列选项",
    "help": "Options used for queue target. Action queue must be defined to",
    "type": "multi-select",
    "options": [
      "bypass",
      "fanout"
    ],
    "advanced": true
  },
  {
    "key": "recent",
    "title": "近期匹配",
    "help": "Parameters for matching recently seen sources",
    "type": "group",
    "children": [
      {
        "key": "count",
        "title": "计数",
        "help": "Source addresses seen more than N times",
        "type": "number",
        "min": 1,
        "max": 255
      },
      {
        "key": "time",
        "title": "时间",
        "help": "Source addresses seen in the last second/minute/hour",
        "type": "select",
        "options": [
          "second",
          "minute",
          "hour"
        ],
        "advanced": true
      }
    ],
    "advanced": true
  },
  {
    "key": "source",
    "title": "源",
    "help": "Source parameters",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "IPv6 address, subnet, or range",
        "type": "text",
        "validate": "ipv6"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "Fully qualified domain name",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "GeoIP options - Data provided by DB-IP.com",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "GeoIP country code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "Inverse match of country-codes",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "Group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "Group of addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "Group of domains",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "Group of dynamic addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "Group of MAC addresses",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "Group of networks",
            "type": "text",
            "dynamic": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "Group of ports",
            "type": "text",
            "dynamic": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "MAC address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "Port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "state",
    "title": "连接状态",
    "help": "Session state",
    "type": "multi-select",
    "options": [
      "established",
      "invalid",
      "new",
      "related"
    ],
    "advanced": true
  },
  {
    "key": "synproxy",
    "title": "SYN 代理",
    "help": "Synproxy options",
    "type": "group",
    "children": [
      {
        "key": "tcp",
        "title": "TCP 选项",
        "help": "TCP synproxy options",
        "type": "group",
        "children": [
          {
            "key": "mss",
            "title": "MSS",
            "help": "TCP Maximum segment size",
            "type": "number",
            "min": 501,
            "max": 65535
          },
          {
            "key": "window-scale",
            "title": "窗口缩放",
            "help": "TCP window scale for synproxy connections",
            "type": "number",
            "min": 1,
            "max": 14
          }
        ],
        "advanced": true
      }
    ],
    "advanced": true
  },
  {
    "key": "tcp",
    "title": "TCP 选项",
    "help": "TCP options to match",
    "type": "group",
    "children": [
      {
        "key": "flags",
        "title": "标志",
        "help": "TCP flags to match",
        "type": "group",
        "children": [
          {
            "key": "ack",
            "title": "Ack",
            "help": "Acknowledge flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "cwr",
            "title": "Cwr",
            "help": "Congestion Window Reduced flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "ecn",
            "title": "Ecn",
            "help": "Explicit Congestion Notification flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "fin",
            "title": "Fin",
            "help": "Finish flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "not",
            "title": "Not",
            "help": "Match flags not set",
            "type": "group",
            "children": [
              {
                "key": "ack",
                "title": "Ack",
                "help": "Acknowledge flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "cwr",
                "title": "Cwr",
                "help": "Congestion Window Reduced flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "ecn",
                "title": "Ecn",
                "help": "Explicit Congestion Notification flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "fin",
                "title": "Fin",
                "help": "Finish flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "psh",
                "title": "Psh",
                "help": "Push flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "rst",
                "title": "Rst",
                "help": "Reset flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "syn",
                "title": "Syn",
                "help": "Synchronise flag",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "urg",
                "title": "Urg",
                "help": "Urgent flag",
                "type": "checkbox",
                "valueless": true
              }
            ]
          },
          {
            "key": "psh",
            "title": "Psh",
            "help": "Push flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "rst",
            "title": "Rst",
            "help": "Reset flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "syn",
            "title": "Syn",
            "help": "Synchronise flag",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "urg",
            "title": "Urg",
            "help": "Urgent flag",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "mss",
        "title": "MSS",
        "help": "Maximum segment size (MSS)",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "time",
    "title": "时间",
    "help": "Time to match rule",
    "type": "group",
    "children": [
      {
        "key": "startdate",
        "title": "开始日期",
        "help": "Date to start matching rule",
        "type": "text"
      },
      {
        "key": "starttime",
        "title": "开始时间",
        "help": "Time of day to start matching rule",
        "type": "text"
      },
      {
        "key": "stopdate",
        "title": "结束日期",
        "help": "Date to stop matching rule",
        "type": "text"
      },
      {
        "key": "stoptime",
        "title": "结束时间",
        "help": "Time of day to stop matching rule",
        "type": "text"
      },
      {
        "key": "weekdays",
        "title": "工作日",
        "help": "Comma separated weekdays to match rule on",
        "type": "text"
      }
    ],
    "advanced": true
  }
];
