export const FIREWALL_RULE_SCHEMA = [
  {
    "key": "action",
    "title": "动作",
    "help": "firewall.rule.help.action",
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
    "help": "firewall.rule.help.add-address-to-group",
    "type": "group",
    "children": [
      {
        "key": "destination-address",
        "title": "目的地址",
        "help": "firewall.rule.help.destination-address",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.dynamic-addr-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "firewall.rule.help.timeout",
            "type": "text"
          }
        ]
      },
      {
        "key": "source-address",
        "title": "源地址",
        "help": "firewall.rule.help.source-address",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.dynamic-addr-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "timeout",
            "title": "超时",
            "help": "firewall.rule.help.timeout",
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
    "help": "firewall.rule.help.connection-mark",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "connection-status",
    "title": "连接状态",
    "help": "firewall.rule.help.connection-status",
    "type": "group",
    "children": [
      {
        "key": "nat",
        "title": "NAT",
        "help": "firewall.rule.help.nat",
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
    "help": "firewall.rule.help.conntrack-helper",
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
    "help": "firewall.rule.help.description",
    "type": "text"
  },
  {
    "key": "destination",
    "title": "目的",
    "help": "firewall.rule.help.destination",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "firewall.rule.help.address",
        "type": "text",
        "validate": "ip-segment"
      },
      {
        "key": "address-mask",
        "title": "地址掩码",
        "help": "firewall.rule.help.address-mask",
        "type": "text",
        "validate": "ipv4"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "firewall.rule.help.fqdn",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "firewall.rule.help.geoip",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "firewall.rule.help.country-code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "firewall.rule.help.inverse-match",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "firewall.rule.help.domain-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "firewall.rule.help.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "firewall.rule.help.mac-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "firewall.rule.help.network-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "firewall.rule.help.port-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "firewall.rule.help.mac-address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "firewall.rule.help.port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "disable",
    "title": "禁用",
    "help": "firewall.rule.help.disable",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "dscp",
    "title": "DSCP",
    "help": "firewall.rule.help.dscp",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "dscp-exclude",
    "title": "DSCP 排除",
    "help": "firewall.rule.help.dscp-exclude",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "fragment",
    "title": "分片",
    "help": "firewall.rule.help.fragment",
    "type": "group",
    "children": [
      {
        "key": "match-frag",
        "title": "匹配分片",
        "help": "firewall.rule.help.match-frag",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-non-frag",
        "title": "匹配非分片",
        "help": "firewall.rule.help.match-non-frag",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "icmp",
    "title": "ICMP",
    "help": "firewall.rule.help.icmp",
    "type": "group",
    "children": [
      {
        "key": "code",
        "title": "Code",
        "help": "firewall.rule.help.code",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type",
        "title": "Type",
        "help": "firewall.rule.help.type",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "type-name",
        "title": "类型名称",
        "help": "firewall.rule.help.type-name",
        "type": "select",
        "options": [
          "echo-reply",
          "destination-unreachable",
          "source-quench",
          "redirect",
          "echo-request",
          "router-advertisement",
          "router-solicitation",
          "time-exceeded",
          "parameter-problem",
          "timestamp-request",
          "timestamp-reply",
          "info-request",
          "info-reply",
          "address-mask-request",
          "address-mask-reply"
        ]
      }
    ],
    "advanced": true
  },
  {
    "key": "inbound-interface",
    "title": "入接口",
    "help": "firewall.rule.help.inbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.interface-group",
        "type": "select",
        "dynamic": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "firewall.rule.help.interface-name",
        "type": "select",
        "dynamic": true
      }
    ]
  },
  {
    "key": "ipsec",
    "title": "IPsec",
    "help": "firewall.rule.help.ipsec",
    "type": "group",
    "children": [
      {
        "key": "match-ipsec",
        "title": "匹配 IPsec",
        "help": "firewall.rule.help.match-ipsec",
        "type": "checkbox",
        "valueless": true
      },
      {
        "key": "match-none",
        "title": "匹配非 IPsec",
        "help": "firewall.rule.help.match-none",
        "type": "checkbox",
        "valueless": true
      }
    ],
    "advanced": true
  },
  {
    "key": "jump-target",
    "title": "跳转目标",
    "help": "firewall.rule.help.jump-target",
    "type": "select",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "limit",
    "title": "限速",
    "help": "firewall.rule.help.limit",
    "type": "group",
    "children": [
      {
        "key": "burst",
        "title": "突发",
        "help": "firewall.rule.help.burst",
        "type": "number",
        "min": 0,
        "max": 4294967295
      },
      {
        "key": "rate",
        "title": "速率",
        "help": "firewall.rule.help.rate",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "log",
    "title": "日志",
    "help": "firewall.rule.help.log",
    "type": "checkbox",
    "valueless": true
  },
  {
    "key": "log-options",
    "title": "日志选项",
    "help": "firewall.rule.help.log-options",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.log-group",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "level",
        "title": "级别",
        "help": "firewall.rule.help.level",
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
        "help": "firewall.rule.help.queue-threshold",
        "type": "number",
        "min": 0,
        "max": 65535
      },
      {
        "key": "snapshot-length",
        "title": "快照长度",
        "help": "firewall.rule.help.snapshot-length",
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
    "help": "firewall.rule.help.mark",
    "type": "text",
    "advanced": true
  },
  {
    "key": "offload-target",
    "title": "卸载目标",
    "help": "firewall.rule.help.offload-target",
    "type": "select",
    "dynamic": true,
    "advanced": true
  },
  {
    "key": "outbound-interface",
    "title": "出接口",
    "help": "firewall.rule.help.outbound-interface",
    "type": "group",
    "children": [
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.interface-group",
        "type": "select",
        "dynamic": true
      },
      {
        "key": "name",
        "title": "名称",
        "help": "firewall.rule.help.interface-name",
        "type": "select",
        "dynamic": true
      }
    ]
  },
  {
    "key": "packet-length",
    "title": "包长度",
    "help": "firewall.rule.help.packet-length",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-length-exclude",
    "title": "包长度排除",
    "help": "firewall.rule.help.packet-length-exclude",
    "type": "textarea",
    "placeholder": "每行一个值",
    "multi": true,
    "advanced": true
  },
  {
    "key": "packet-type",
    "title": "包类型",
    "help": "firewall.rule.help.packet-type",
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
    "help": "firewall.rule.help.protocol",
    "type": "select",
    "options": [
      "all",
      "tcp_udp",
      "ah",
      "ax.25",
      "dccp",
      "egp",
      "eigrp",
      "encap",
      "esp",
      "etherip",
      "gre",
      "hmp",
      "icmp",
      "icmpv6",
      "igmp",
      "ip",
      "ipcomp",
      "ipencap",
      "ipip",
      "ipv6",
      "ipv6-frag",
      "ipv6-icmp",
      "ipv6-nonxt",
      "ipv6-opts",
      "ipv6-route",
      "iso-tp4",
      "l2tp",
      "mtp",
      "ospf",
      "pim",
      "pup",
      "rdp",
      "rsvp",
      "sctp",
      "st",
      "tcp",
      "udp",
      "udplite",
      "vmtp",
      "vrrp",
      "xns-idp",
      "xtp"
    ]
  },
  {
    "key": "queue",
    "title": "队列",
    "help": "firewall.rule.help.queue",
    "type": "number",
    "min": 0,
    "max": 65535,
    "advanced": true
  },
  {
    "key": "queue-options",
    "title": "队列选项",
    "help": "firewall.rule.help.queue-options",
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
    "help": "firewall.rule.help.recent",
    "type": "group",
    "children": [
      {
        "key": "count",
        "title": "计数",
        "help": "firewall.rule.help.count",
        "type": "number",
        "min": 1,
        "max": 255
      },
      {
        "key": "time",
        "title": "时间",
        "help": "firewall.rule.help.time",
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
    "help": "firewall.rule.help.source",
    "type": "group",
    "children": [
      {
        "key": "address",
        "title": "地址",
        "help": "firewall.rule.help.address",
        "type": "text",
        "validate": "ip-segment"
      },
      {
        "key": "address-mask",
        "title": "地址掩码",
        "help": "firewall.rule.help.address-mask",
        "type": "text",
        "validate": "ipv4"
      },
      {
        "key": "fqdn",
        "title": "FQDN",
        "help": "firewall.rule.help.fqdn",
        "type": "text"
      },
      {
        "key": "geoip",
        "title": "GeoIP",
        "help": "firewall.rule.help.geoip",
        "type": "group",
        "children": [
          {
            "key": "country-code",
            "title": "国家代码",
            "help": "firewall.rule.help.country-code",
            "type": "textarea",
            "placeholder": "每行一个值",
            "multi": true
          },
          {
            "key": "inverse-match",
            "title": "反向匹配",
            "help": "firewall.rule.help.inverse-match",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "group",
        "title": "组",
        "help": "firewall.rule.help.group",
        "type": "group",
        "children": [
          {
            "key": "address-group",
            "title": "地址组",
            "help": "firewall.rule.help.address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "domain-group",
            "title": "域名组",
            "help": "firewall.rule.help.domain-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "dynamic-address-group",
            "title": "动态地址组",
            "help": "firewall.rule.help.dynamic-address-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "mac-group",
            "title": "MAC 组",
            "help": "firewall.rule.help.mac-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "network-group",
            "title": "网络组",
            "help": "firewall.rule.help.network-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          },
          {
            "key": "port-group",
            "title": "端口组",
            "help": "firewall.rule.help.port-group",
            "type": "select",
            "dynamic": true,
            "noAutoFill": true
          }
        ]
      },
      {
        "key": "mac-address",
        "title": "MAC 地址",
        "help": "firewall.rule.help.mac-address",
        "type": "text",
        "validate": "mac"
      },
      {
        "key": "port",
        "title": "端口",
        "help": "firewall.rule.help.port",
        "type": "text",
        "validate": "port"
      }
    ]
  },
  {
    "key": "state",
    "title": "连接状态",
    "help": "firewall.rule.help.state",
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
    "help": "firewall.rule.help.synproxy",
    "type": "group",
    "children": [
      {
        "key": "tcp",
        "title": "TCP 选项",
        "help": "firewall.rule.help.tcp-synproxy",
        "type": "group",
        "children": [
          {
            "key": "mss",
            "title": "MSS",
            "help": "firewall.rule.help.mss",
            "type": "number",
            "min": 501,
            "max": 65535
          },
          {
            "key": "window-scale",
            "title": "窗口缩放",
            "help": "firewall.rule.help.window-scale",
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
    "help": "firewall.rule.help.tcp",
    "type": "group",
    "children": [
      {
        "key": "flags",
        "title": "标志",
        "help": "firewall.rule.help.flags",
        "type": "group",
        "horizontal": true,
        "children": [
          {
            "key": "ack",
            "title": "Ack",
            "help": "firewall.rule.help.ack",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "cwr",
            "title": "Cwr",
            "help": "firewall.rule.help.cwr",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "ecn",
            "title": "Ecn",
            "help": "firewall.rule.help.ecn",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "fin",
            "title": "Fin",
            "help": "firewall.rule.help.fin",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "not",
            "title": "Not",
            "help": "firewall.rule.help.not",
            "type": "group",
            "children": [
              {
                "key": "ack",
                "title": "Ack",
                "help": "firewall.rule.help.ack",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "cwr",
                "title": "Cwr",
                "help": "firewall.rule.help.cwr",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "ecn",
                "title": "Ecn",
                "help": "firewall.rule.help.ecn",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "fin",
                "title": "Fin",
                "help": "firewall.rule.help.fin",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "psh",
                "title": "Psh",
                "help": "firewall.rule.help.psh",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "rst",
                "title": "Rst",
                "help": "firewall.rule.help.rst",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "syn",
                "title": "Syn",
                "help": "firewall.rule.help.syn",
                "type": "checkbox",
                "valueless": true
              },
              {
                "key": "urg",
                "title": "Urg",
                "help": "firewall.rule.help.urg",
                "type": "checkbox",
                "valueless": true
              }
            ]
          },
          {
            "key": "psh",
            "title": "Psh",
            "help": "firewall.rule.help.psh",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "rst",
            "title": "Rst",
            "help": "firewall.rule.help.rst",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "syn",
            "title": "Syn",
            "help": "firewall.rule.help.syn",
            "type": "checkbox",
            "valueless": true
          },
          {
            "key": "urg",
            "title": "Urg",
            "help": "firewall.rule.help.urg",
            "type": "checkbox",
            "valueless": true
          }
        ]
      },
      {
        "key": "mss",
        "title": "MSS",
        "help": "firewall.rule.help.tcp-mss",
        "type": "text"
      }
    ],
    "advanced": true
  },
  {
    "key": "time",
    "title": "时间",
    "help": "firewall.rule.help.time-rule",
    "type": "group",
    "children": [
      {
        "key": "startdate",
        "title": "开始日期",
        "help": "firewall.rule.help.startdate",
        "type": "date",
        "placeholder": "YYYY-MM-DD"
      },
      {
        "key": "starttime",
        "title": "开始时间",
        "help": "firewall.rule.help.starttime",
        "type": "time",
        "placeholder": "hh:mm:ss"
      },
      {
        "key": "stopdate",
        "title": "结束日期",
        "help": "firewall.rule.help.stopdate",
        "type": "date",
        "placeholder": "YYYY-MM-DD"
      },
      {
        "key": "stoptime",
        "title": "结束时间",
        "help": "firewall.rule.help.stoptime",
        "type": "time",
        "placeholder": "hh:mm:ss"
      },
      {
        "key": "weekdays",
        "title": "工作日",
        "help": "firewall.rule.help.weekdays",
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
  },
  {
    "key": "ttl",
    "title": "TTL",
    "help": "firewall.rule.help.ttl",
    "type": "group",
    "children": [
      {
        "key": "eq",
        "title": "等于",
        "help": "firewall.rule.help.eq",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "gt",
        "title": "大于",
        "help": "firewall.rule.help.gt",
        "type": "number",
        "min": 0,
        "max": 255
      },
      {
        "key": "lt",
        "title": "小于",
        "help": "firewall.rule.help.lt",
        "type": "number",
        "min": 0,
        "max": 255
      }
    ],
    "advanced": true
  }
];
