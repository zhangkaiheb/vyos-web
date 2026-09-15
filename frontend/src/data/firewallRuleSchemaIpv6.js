export const FIREWALL_RULE_SCHEMA_IPV6 = [
  {
    "key": "action",
    "title": "动作",
    "help": "firewall.rule.help.ipv6.action",
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
    "help": "firewall.rule.help.ipv6.add-address-to-group",
    "type": "group",
    "children": [
      {
        "key": "destination-address",
        "title": "目的地址",
        "help": "firewall.rule.help.ipv6.destination-address",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.ipv6.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "firewall.rule.help.ipv6.timeout",
            "type": "text"
          }
        ]
      },
      {
        "key": "source-address",
        "title": "源地址",
        "help": "firewall.rule.help.ipv6.source-address",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.ipv6.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "firewall.rule.help.ipv6.timeout",
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
    "help": "firewall.rule.help.ipv6.connection-mark",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "connection-status",
    "title": "连接状态",
    "help": "firewall.rule.help.ipv6.connection-status",
    "type": "group",
    "children": [
      {
        "key": "nat",
        "title": "NAT",
        "help": "firewall.rule.help.ipv6.nat",
        "type": "select",
        "options": [
          "destination",
          "source"
        ],
        "default": ""
      }
    ],
    "advanced": true
  },
  {
    "key": "conntrack-helper",
    "title": "连接跟踪助手",
    "help": "firewall.rule.help.ipv6.conntrack-helper",
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
    "help": "firewall.rule.help.ipv6.description",
    "type": "text"
  },
  {
    "key": "destination",
    "title": "目的",
    "help": "firewall.rule.help.ipv6.destination",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "firewall.rule.help.ipv6.address",
        "type": "text",
        "validate": "ipv6"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "firewall.rule.help.ipv6.fqdn",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "firewall.rule.help.ipv6.geoip",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "firewall.rule.help.ipv6.country-code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "firewall.rule.help.ipv6.inverse-match",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.ipv6.group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.ipv6.address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "firewall.rule.help.ipv6.domain-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "firewall.rule.help.ipv6.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "firewall.rule.help.ipv6.mac-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "firewall.rule.help.ipv6.network-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "firewall.rule.help.ipv6.port-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "firewall.rule.help.ipv6.mac-address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "firewall.rule.help.ipv6.port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "disable",
    "title": "禁用",
    "help": "firewall.rule.help.ipv6.disable",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "dscp",
    "title": "DSCP",
    "help": "firewall.rule.help.ipv6.dscp",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "dscp-exclude",
    "title": "DSCP 排除",
    "help": "firewall.rule.help.ipv6.dscp-exclude",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "fragment",
    "title": "分片",
    "help": "firewall.rule.help.ipv6.fragment",
    "type": "group",
    "children": [
      {
        "key": "match-frag",
        "title": "匹配分片",
        "help": "firewall.rule.help.ipv6.match-frag",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-non-frag",
        "title": "匹配非分片",
        "help": "firewall.rule.help.ipv6.match-non-frag",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "hop-limit",
    "title": "Hop 限制",
    "help": "firewall.rule.help.ipv6.hop-limit",
    "type": "group",
    "children": [
      {
        "key": "eq",
        "title": "等于",
        "help": "firewall.rule.help.ipv6.eq",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "gt",
        "title": "大于",
        "help": "firewall.rule.help.ipv6.gt",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "lt",
        "title": "小于",
        "help": "firewall.rule.help.ipv6.lt",
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
    "help": "firewall.rule.help.ipv6.icmpv6",
    "type": "group",
    "children": [
      {
        "key": "code",
        "title": "Code",
        "help": "firewall.rule.help.ipv6.icmpv6-code",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type",
        "title": "Type",
        "help": "firewall.rule.help.ipv6.icmpv6-type",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type-name",
        "title": "类型名称",
        "help": "firewall.rule.help.ipv6.icmpv6-type-name",
        "type": "select",
        "default": "",
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
        ],
        "default": ""
      }
    ],
    "advanced": true
  },
  {
    "key": "inbound-interface",
    "title": "入接口",
    "help": "firewall.rule.help.ipv6.inbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.ipv6.interface-group",
        "type": "select",
        "dynamic": true,
        "default": "",
        "noAutoFill": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "firewall.rule.help.ipv6.interface-name",
        "type": "select",
        "dynamic": true,
        "suggestions": [
          "txt*"
        ],
        "default": "",
        "noAutoFill": true
      }
    ]
  },
  {
    "key": "ipsec",
    "title": "IPsec",
    "help": "firewall.rule.help.ipv6.ipsec",
    "type": "group",
    "children": [
      {
        "key": "match-ipsec",
        "title": "匹配 IPsec",
        "help": "firewall.rule.help.ipv6.match-ipsec",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-none",
        "title": "匹配非 IPsec",
        "help": "firewall.rule.help.ipv6.match-none",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "jump-target",
    "title": "跳转目标",
    "help": "firewall.rule.help.ipv6.jump-target",
    "type": "text",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "limit",
    "title": "限速",
    "help": "firewall.rule.help.ipv6.limit",
    "type": "group",
    "children": [
      {
        "key": "burst",
        "title": "突发",
        "help": "firewall.rule.help.ipv6.burst",
        "type": "number",
        "min": 0,
        "max": 4294967295
      },
      {
        "key": "rate",
        "title": "速率",
        "help": "firewall.rule.help.ipv6.rate",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "log",
    "title": "日志",
    "help": "firewall.rule.help.ipv6.log",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "log-options",
    "title": "日志选项",
    "help": "firewall.rule.help.ipv6.log-options",
    "type": "group",
    "showWhen": { "log": true },
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.ipv6.log-group",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "level",
        "title": "级别",
        "help": "firewall.rule.help.ipv6.level",
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
        ],
        "noAutoFill": true,
        "default": ""
      },
      {
        "key": "queue-threshold",
        "title": "队列阈值",
        "help": "firewall.rule.help.ipv6.queue-threshold",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "snapshot-length",
        "title": "快照长度",
        "help": "firewall.rule.help.ipv6.snapshot-length",
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
    "help": "firewall.rule.help.ipv6.mark",
    "type": "text",
    "advanced": true
  },
  {
    "key": "offload-target",
    "title": "卸载目标",
    "help": "firewall.rule.help.ipv6.offload-target",
    "type": "text",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "outbound-interface",
    "title": "出接口",
    "help": "firewall.rule.help.ipv6.outbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.ipv6.interface-group",
        "type": "select",
        "dynamic": true,
        "default": "",
        "noAutoFill": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "firewall.rule.help.ipv6.interface-name",
        "type": "select",
        "dynamic": true,
        "suggestions": [
          "txt*"
        ],
        "default": "",
        "noAutoFill": true
      }
    ]
  },
  {
    "key": "packet-length",
    "title": "包长度",
    "help": "firewall.rule.help.ipv6.packet-length",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-length-exclude",
    "title": "包长度排除",
    "help": "firewall.rule.help.ipv6.packet-length-exclude",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-type",
    "title": "包类型",
    "help": "firewall.rule.help.ipv6.packet-type",
    "type": "select",
    "options": [
      "broadcast",
      "host",
      "multicast",
      "other"
    ],
    "default": "",
    "advanced": true
  },
  {
    "key": "protocol",
    "title": "协议",
    "help": "firewall.rule.help.ipv6.protocol",
    "type": "select",
    "dynamic": true,
    "suggestions": [
      "all",
      "tcp_udp"
    ]
  },
  {
    "key": "queue",
    "title": "队列",
    "help": "firewall.rule.help.ipv6.queue",
    "type": "number",
    "min": 0,
    "max": 65535,
    "advanced": true
  },
  {
    "key": "queue-options",
    "title": "队列选项",
    "help": "firewall.rule.help.ipv6.queue-options",
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
    "help": "firewall.rule.help.ipv6.recent",
    "type": "group",
    "children": [
      {
        "key": "count",
        "title": "计数",
        "help": "firewall.rule.help.ipv6.recent-count",
        "type": "number",
        "min": 1,
        "max": 255
      },
      {
        "key": "time",
        "title": "时间",
        "help": "firewall.rule.help.ipv6.recent-time",
        "type": "select",
        "options": [
          "second",
          "minute",
          "hour"
        ],
        "default": "",
        "advanced": true
      }
    ],
    "advanced": true
  },
  {
    "key": "source",
    "title": "源",
    "help": "firewall.rule.help.ipv6.source",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "firewall.rule.help.ipv6.address",
        "type": "text",
        "validate": "ipv6"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "firewall.rule.help.ipv6.fqdn",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "firewall.rule.help.ipv6.geoip",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "firewall.rule.help.ipv6.country-code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "firewall.rule.help.ipv6.inverse-match",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.ipv6.group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.ipv6.address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "firewall.rule.help.ipv6.domain-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "firewall.rule.help.ipv6.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "firewall.rule.help.ipv6.mac-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "firewall.rule.help.ipv6.network-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "firewall.rule.help.ipv6.port-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "firewall.rule.help.ipv6.mac-address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "firewall.rule.help.ipv6.port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "state",
    "title": "连接状态",
    "help": "firewall.rule.help.ipv6.state",
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
    "help": "firewall.rule.help.ipv6.synproxy",
    "type": "group",
    "children": [
      {
        "key": "tcp",
        "title": "TCP 选项",
        "help": "firewall.rule.help.ipv6.tcp-synproxy",
        "type": "group",
        "children": [
          {
            "key": "mss",
            "title": "MSS",
            "help": "firewall.rule.help.ipv6.tcp-mss",
            "type": "number",
            "min": 501,
            "max": 65535
          },
          {
            "key": "window-scale",
            "title": "窗口缩放",
            "help": "firewall.rule.help.ipv6.window-scale",
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
    "help": "firewall.rule.help.ipv6.tcp",
    "type": "group",
    "children": [
      {
        "key": "flags",
        "title": "标志",
        "help": "firewall.rule.help.ipv6.flags",
        "type": "group",
        "children": [
          {
            "key": "ack",
            "title": "Ack",
            "help": "firewall.rule.help.ipv6.ack",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "cwr",
            "title": "Cwr",
            "help": "firewall.rule.help.ipv6.cwr",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "ecn",
            "title": "Ecn",
            "help": "firewall.rule.help.ipv6.ecn",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "fin",
            "title": "Fin",
            "help": "firewall.rule.help.ipv6.fin",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "psh",
            "title": "Psh",
            "help": "firewall.rule.help.ipv6.psh",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "rst",
            "title": "Rst",
            "help": "firewall.rule.help.ipv6.rst",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "syn",
            "title": "Syn",
            "help": "firewall.rule.help.ipv6.syn",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          },
          {
            "key": "urg",
            "title": "Urg",
            "help": "firewall.rule.help.ipv6.urg",
            "type": "tri-state",
            "options": [
              { "value": "", "label": "" },
              { "value": "set", "label": "Set" },
              { "value": "not", "label": "Not" }
            ]
          }
        ]
      },
      {
        "key": "mss",
        "title": "MSS",
        "help": "firewall.rule.help.ipv6.tcp-mss",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "time",
    "title": "时间",
    "help": "firewall.rule.help.ipv6.time-rule",
    "type": "group",
    "children": [
      {
        "key": "startdate",
        "title": "开始日期",
        "help": "firewall.rule.help.ipv6.startdate",
        "type": "date",
        "placeholder": "YYYY-MM-DD"
      },
      {
        "key": "starttime",
        "title": "开始时间",
        "help": "firewall.rule.help.ipv6.starttime",
        "type": "time",
        "placeholder": "hh:mm:ss"
      },
      {
        "key": "stopdate",
        "title": "结束日期",
        "help": "firewall.rule.help.ipv6.stopdate",
        "type": "date",
        "placeholder": "YYYY-MM-DD"
      },
      {
        "key": "stoptime",
        "title": "结束时间",
        "help": "firewall.rule.help.ipv6.stoptime",
        "type": "time",
        "placeholder": "hh:mm:ss"
      },
      {
        "key": "weekdays",
        "title": "工作日",
        "help": "firewall.rule.help.ipv6.weekdays",
        "type": "multiselect",
        "options": [
          { "value": "Monday", "label": "周一" },
          { "value": "Tuesday", "label": "周二" },
          { "value": "Wednesday", "label": "周三" },
          { "value": "Thursday", "label": "周四" },
          { "value": "Friday", "label": "周五" },
          { "value": "Saturday", "label": "周六" },
          { "value": "Sunday", "label": "周日" }
        ]
      }
    ],
    "advanced": true
  }
];
