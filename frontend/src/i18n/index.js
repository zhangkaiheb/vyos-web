import { ref, computed, watch, reactive } from '/src/utils/vue-import.js';

// Essential modules needed for login and basic UI (loaded first)
const ESSENTIAL_MODULES = ['common', 'system', 'user', 'settings', 'firewall'];
// All modules including optional ones (loaded in background after login)
const OPTIONAL_MODULES = ['firewall', 'interfaces', 'bridge', 'systemIp', 'systemIpv6', 'monitor', 'monitorDashboard', 'monitorWidget', 'logs', 'arp', 'pim', 'pim6', 'wan', 'pseudoEthernet', 'dummy', 'highAvailability', 'bgp', 'routeMap', 'configManagement', 'configManagementSettings', 'policyRoute', 'ipsec', 'ipsecConnections', 'ipsecSa', 'qosMatch', 'qosPolicy', 'qosInterface', 'pptp', 'pptpSessions', 'pptpStatistics', 'vppIpfix', 'vppSflow', 'failover', 'conntrackSync', 'containerRegistry', 'prefixList', 'prefixList6', 'extcommunityList', 'largeCommunityList', 'communityList', 'controlPanel', 'babel', 'asPathList', 'localRoute', 'ospf', 'ospfv3', 'isis', 'taskScheduler', 'configSync', 'input', 'openvpn', 'segmentRouting', 'dhcp', 'dhcpLeases', 'dhcpStatistics', 'dhcprelay', 'dhcpv6', 'dhcpv6Leases', 'dhcpv6relay', 'zebra', 'virtualEthernet', 'importExport', 'dnsServer', 'activeConnections', 'memoryCache', 'webApp', 'dnsForwardingStatistics', 'processMonitor', 'suricata', 'sshFingerprints', 'dnsDynamicStatus', 'haproxy', 'tool', 'rip', 'ripng', 'l2tp', 'l2tpv3', 'geneve', 'pppoe', 'netns', 'vrf', 'genericConfig', 'staticRoute', 'wireguard', 'sstp', 'accessList', 'accessListv6', 'bfd', 'cgnat', 'containerName', 'containerNetwork', 'hostName', 'https', 'idsDdos', 'igmpProxy', 'interfaceStats', 'lldp', 'log', 'macSec', 'mpls', 'sourceNat', 'destinationNat', 'staticNat', 'nat66', 'nat64', 'nhrp', 'ntp', 'openConnect', 'pki', 'protocol', 'routing', 'rpki', 'snmp', 'ssh', 'vppAcl', 'vppInterfaces', 'vppNat', 'vppSettings', 'webProxy'];
const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ru', 'de', 'fr', 'ko'];

const localeNames = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
  'ru': 'Русский',
  'de': 'Deutsch',
  'fr': 'Français',
  'ko': '한국어',
};

const defaultMessages = {
  'zh-CN': {
    app: { title: 'VyOS', login: '登录', logout: '注销', submit: '提交', cancel: '取消', save: '保存', delete: '删除', edit: '编辑', create: '创建', move: '移动', moveUp: '上移', moveDown: '下移', copy: '复制', refresh: '刷新', search: '搜索', columnSetting: '列设定', filter: '筛选', advanced: '高级选项', commands: '命令行', close: '关闭', confirm: '确定', loading: '加载中', actions: '操作' },
    login: { username: '用户名', password: '密码', remember: '记住我', language: '语言' },
    menu: { monitor: '监控', logs: '日志', firewall: '防火墙', interfaces: '网络接口', nat: '网络地址转换', policy: '路由策略与协议', qos: '服务质量', service: '系统服务', system: '系统参数', vpn: '虚拟专用网络', 'load-balancing': '负载均衡' },
    table: { total: '共 {total} 条', page: '第 {page}/{pages} 页', itemsPerPage: '每页条数', noData: '暂无数据' },
    config: { commit: '提交配置', discard: '丢弃变更', save: '保存配置', load: '加载配置', compare: '对比配置', rollback: '回滚配置', import: '导入', export: '导出', commands: '对应命令行', copy: '复制' },
    errors: { required: '此项为必填项', invalid_ipv4: '请输入有效的IPv4地址', invalid_ipv6: '请输入有效的IPv6地址', invalid_mac: '请输入有效的MAC地址', invalid_port: '端口号范围为1-65535' },
    msg: { saved: '保存成功', deleted: '删除成功', confirmDelete: '确认删除选中的项？', noSelection: '请选择一行' },
    common: { saving: '保存中', save: '保存' },
    featureVisibility: { title: '功能可见性', visible: '可见', hidden: '隐藏' },
    mpls: {
      columns: { interfaceName: '接口名称', helloInterval: 'Hello 间隔', helloHoldtime: 'Hello 保持时间' },
      tabs: { basic: '基本设置', interfaces: '接口', ldp: 'LDP', parameters: '参数' },
      sections: { mplsConfig: 'MPLS 配置', ldpBasic: 'LDP 基本设置', ldpInterfaces: 'LDP 接口' },
      descriptions: { mplsConfig: 'MPLS 基本配置请在接口和 LDP 标签页中完成。' },
      labels: { routerId: '路由器 ID', targetedHello: '目标 Hello', maximumLabels: '最大标签数', rangeSize: '标签范围大小', interfaceNameRequired: '接口名称 *', helloInterval: 'Hello 间隔', helloHoldtime: 'Hello 保持时间' },
      placeholders: { routerId: '例如: 1.1.1.1', labelRange: '1-1048575', selectInterface: '请选择接口', helloInterval: '默认: 5 秒', helloHoldtime: '默认: 15 秒' },
      buttons: { addInterface: '添加接口' },
      modals: { editMplsInterface: '编辑 MPLS 接口', addMplsInterface: '添加 MPLS 接口', editLdpInterface: '编辑 LDP 接口', addLdpInterface: '添加 LDP 接口', confirmDelete: '确认删除' },
      messages: { selectInterface: '请选择接口', confirmDeleteInterface: '确认删除以下接口？', confirmDeleteLdpInterface: '确认删除以下 LDP 接口？' },
      alerts: { saved: '已保存' }
    },
    bfd: {
      columns: { address: '对端地址', sourceAddress: '源地址', multiplier: '乘数', receiveInterval: '接收间隔', transmitInterval: '发送间隔', profile: '配置文件', name: '名称' },
      tabs: { peer: '对端', profile: '配置文件' },
      labels: { peerAddressRequired: '对端地址 *', sourceAddress: '源地址', multiplier: '乘数', receiveInterval: '接收间隔', transmitInterval: '发送间隔', profile: '配置文件', nameRequired: '名称 *' },
      placeholders: { ipv4: 'IPv4 地址', multiplier: '2-50', intervalMs: '50-1000 毫秒', profileName: '配置文件名称' },
      modals: { editPeer: '编辑 BFD 对端', addPeer: '添加 BFD 对端', editProfile: '编辑 BFD 配置文件', addProfile: '添加 BFD 配置文件', confirmDelete: '确认删除' },
      messages: { confirmDeletePeer: '确认删除以下对端？', confirmDeleteProfile: '确认删除以下配置文件？' },
      errors: { peerAddressRequired: '请输入对端地址', profileNameRequired: '请输入配置文件名称' },
      validation: { ipv4: 'IPv4 地址格式错误', interval: '{name}必须在 {min}-{max} 之间' },
      alerts: { saved: '已保存' }
    },
    pim: {
      tabs: { basic: '基本设置', interfaces: '接口', rp: 'RP 地址', ssm: 'SSM', spt: 'SPT 切换', advanced: '高级选项' },
      columns: { interfaceName: '接口名称', drPriority: 'DR 优先级', helloInterval: 'Hello 间隔', passive: '被动', rpAddress: 'RP 地址', groupAddress: '组地址' },
      labels: { basicConfig: '基本配置', joinPruneInterval: 'Join/Prune 间隔', keepAliveTimer: 'Keep-Alive 定时器', enableEcmp: '启用 PIM ECMP', enableEcmpRebalance: '启用 PIM ECMP Rebalance', rpKeepAliveTimer: 'RP Keep-Alive 定时器', igmpWatermarkWarning: 'IGMP Watermark Warning', ssmConfig: 'SSM 配置', ssmPrefixList: 'SSM 前缀列表', sptSwitchover: 'SPT 切换', neverSwitchToSpt: '永不切换到 SPT (infinity-and-beyond)', prefixList: '前缀列表', advancedOptions: '高级选项', disableIpv6Secondary: '禁用 IPv6 辅助地址 (no-v6-secondary)', packets: '数据包处理数', registerSuppressTime: 'Register Suppress 时间', registerAcceptList: 'Register Accept 前缀列表', interfaceName: '接口名称', drPriority: 'DR 优先级', helloInterval: 'Hello 间隔', sourceAddress: '源地址', noBsm: '不处理 Bootstrap 消息 (no-bsm)', noUnicastBsm: '不处理单播 Bootstrap 消息 (no-unicast-bsm)', passiveMode: '被动模式 (passive)', bfd: 'BFD', enableBfd: '启用 BFD', bfdProfile: 'BFD Profile', igmp: 'IGMP', disableIgmp: '禁用 IGMP', igmpVersion: 'IGMP 版本', queryInterval: '查询间隔', maxResponseTime: '最大响应时间', igmpJoinGroups: 'IGMP Join 组播组', multicastGroupAddress: '组播组地址', actions: '操作', rpAddressRequired: 'RP 地址 *', groupAddressRange: '组地址范围', addGroupAddress: '添加组地址' },
      placeholders: { joinPruneInterval: '默认: 60 秒', keepAliveTimer: 'Keep-Alive 定时器', rpKeepAliveTimer: 'RP Keep-Alive 定时器', groupRestrictionWarning: '组限制警告', ssmPrefixListName: 'SSM 前缀列表名称', prefixListName: '前缀列表名称', packets: '默认: 3', registerSuppressTime: 'Register 抑制时间', registerAcceptList: '仅接受指定前缀列表的 Register', selectInterface: '请选择接口', drPriority: '1-4294967295', helloInterval: 'Hello 间隔 (秒)', ipv4SourceAddress: 'IPv4 源地址', bfdProfileName: 'BFD Profile 名称', queryInterval: 'IGMP 查询间隔 (秒)', maxResponseTime: 'IGMP 最大响应时间 (秒)', multicastGroupAddress: '例如: 224.0.0.1', rpAddress: '例如: 10.0.0.1', groupAddress: '例如: 224.0.0.0/4' },
      buttons: { addJoin: '添加 Join', edit: '编辑', delete: '删除', add: '添加' },
      modals: { editPimInterface: '编辑 PIM 接口', addPimInterface: '添加 PIM 接口', editIgmpJoin: '编辑 IGMP Join', addIgmpJoin: '添加 IGMP Join', editRpAddress: '编辑 RP 地址', addRpAddress: '添加 RP 地址', confirmDelete: '确认删除' },
      messages: { saved: '已保存', enterInterfaceName: '请输入接口名称', enterMulticastGroupAddress: '请输入组播组地址', enterRpAddress: '请输入 RP 地址', confirmDeleteInterface: '确认删除以下接口？', confirmDeleteIgmpJoin: '确认删除以下 IGMP Join？', confirmDeleteRpAddress: '确认删除以下 RP 地址？' },
      errors: { ipv4Format: 'IPv4 地址格式错误', ipv4PrefixFormat: 'IPv4 前缀格式错误 (例如: 224.0.0.0/4)', prefixLengthRange: '前缀长度必须在 0-32 之间', timerRange: '{name}必须在 {min}-{max} 之间', priorityRange: '优先级必须在 1-4294967295 之间', interfaceError: '接口 {name}：{error}', igmpJoinError: '接口 {name} IGMP Join：{error}', rpAddressError: 'RP 地址：{error}', rpGroupError: 'RP {address} 组地址：{error}' },
      options: { defaultVersion: '默认 (3)', version1: '版本 1', version2: '版本 2', version3: '版本 3' }
    },
    rpki: {
      columns: { address: '缓存服务器地址', port: '端口', preference: '优先级' },
      tabs: { basic: '基本设置', cache: '缓存服务器' },
      sections: { parameters: 'RPKI 参数' },
      labels: { expireInterval: '过期间隔', pollingPeriod: '轮询周期', retryInterval: '重试间隔', addressRequired: '缓存服务器地址 *' },
      placeholders: { expireInterval: '默认: 7200 秒', pollingPeriod: '默认: 300 秒', retryInterval: '默认: 600 秒', ipv4: 'IPv4 地址', port: '端口号', preference: '1-255' },
      modals: { editCache: '编辑 RPKI 缓存', addCache: '添加 RPKI 缓存', confirmDelete: '确认删除' },
      messages: { confirmDeleteCache: '确认删除以下缓存服务器？' },
      errors: { addressRequired: '请输入缓存服务器地址' },
      validation: { ipv4: 'IPv4 地址格式错误', interval: '{name}必须在 {min}-{max} 之间' },
      alerts: { saved: '已保存' }
    },
    bgp: {
      tabs: { basic: '基本设置', neighbors: '邻居', peerGroups: 'Peer Groups', addressFamily: '地址族', bmp: 'BMP', listen: '监听', network: '网络', aggregate: '聚合', redistribute: '重分发', interface: '接口', ipv6Network: 'IPv6 网络', ipv6Aggregate: 'IPv6 聚合', ipv6Redistribute: 'IPv6 重分发', ipv6Distance: 'IPv6 距离', ipv4Flowspec: 'IPv4 Flowspec', ipv4LabeledUnicast: 'IPv4 Labeled Unicast', ipv4Multicast: 'IPv4 组播', ipv4Vpn: 'IPv4 VPN', ipv6Flowspec: 'IPv6 Flowspec', ipv6LabeledUnicast: 'IPv6 Labeled Unicast', ipv6Multicast: 'IPv6 组播', ipv6Vpn: 'IPv6 VPN', l2vpnEvpn: 'L2VPN EVPN', sid: 'SID', srv6: 'SRv6' },
      section: { basicSettings: '基本设置', eadEsConfig: 'EAD-ES 配置', advertiseConfig: 'Advertise 配置', network: '网络', sidConfig: 'SID 配置' },
      label: { advertisePip: '通告 PIP (advertise-pip)', advertiseSviIp: '通告 SVI IP (advertise-svi-ip)', disableEadEviRx: '禁用 EAD EVI 接收 (disable-ead-evi-rx)', disableEadEviTx: '禁用 EAD EVI 发送 (disable-ead-evi-tx)', rtAutoDerive: '自动推导 RT (rt-auto-derive)', floodingDisable: '禁用泛洪 (flooding disable)', advertiseIpv4Unicast: '通告 IPv4 Unicast', advertiseIpv6Unicast: '通告 IPv6 Unicast', rtCount: '个 RT', enableVpnSid: '启用 VPN SID (当前 VRF 与 VPN 之间)', neighborAddress: '邻居地址', remoteAsn: '远程 ASN', description: '描述', localRole: '本地角色', ebgpMultihop: 'EBGP 多跳', advertisementInterval: '广告间隔', updateSource: '更新源', port: '端口', localAsn: '本地 ASN', password: '密码', connectTimer: '连接定时器', holdTimer: '保持定时器', keepaliveTimer: 'Keepalive 定时器', ttlSecurityHops: 'TTL 安全跳数', shutdown: '关闭 (Shutdown)', passiveMode: '被动模式 (Passive)', enforceFirstAs: '强制首 AS (Enforce First AS)', overrideCapability: '覆盖能力协商', disableConnectedCheck: '禁用直连检查', disableCapabilityNegotiation: '禁用能力协商', gracefulRestart: '优雅重启 (Graceful Restart)', restartTimer: '优雅重启时间', stalepathTimer: '陈旧路径时间', preserveFwState: '保留防火墙状态', enableBfd: '启用 BFD', checkControlPlaneFailure: '检查控制平面故障', capabilityNegotiation: '能力协商', dynamicCapability: '动态能力', extendedNexthop: '扩展下一跳', softwareVersion: '软件版本', pathAttribute: '路径属性', discard: '丢弃', treatAsWithdraw: '视为撤回', name: '名称', updateSourceInterface: '更新源接口', address: '地址', maxRetryInterval: '最大重试间隔 (ms)', minRetryInterval: '最小重试间隔 (ms)', enableMirror: '启用镜像 (Mirror)', monitorConfig: '监控配置', range: '范围', networkLabel: '网络', backdoorRoute: '后门路由 (Backdoor)', routeMap: '路由映射', aggregateNetwork: '聚合网络', summaryOnly: '仅汇总 (Summary Only)', interfaceName: '接口名称', enableMplsForwarding: '启用 MPLS 转发', protocol: '协议', metric: '度量值', ipv6NetworkLabel: 'IPv6 网络', pathLimit: '路径限制 (0-255)', ipv6AggregateNetwork: 'IPv6 聚合网络', prefix: '前缀', adminDistance: '管理距离 * (1-255)', mplsLabel: 'MPLS 标签 (0-1048575)', routeDistinguisherLabel: '路由区分器 (ASN:NN 或 IP:NN)', direction: '方向 *' },
      placeholder: { routeDistinguisher: '例如: 1:1 或 1.1.1.1:100', macVrfSoo: '例如: 1:1 或 1.1.1.1:100', routeMapName: 'Route-map 名称', srv6Locator: '例如: MYLOCATOR', ipv4OrIpv6Address: 'IPv4 或 IPv6 地址', secondsRange: '{min}-{max} 秒', timerRange: '{min}-{max} 秒', interfaceOrIp: '接口名或 IP 地址', exampleInterface: '例如: eth0', bfdProfileName: 'BFD 配置文件名称', commaSeparatedList: '逗号分隔的属性列表', exampleNetwork: '例如: 2.2.2.0/24', exampleIpv6Network: '例如: 2001:db8::/32', examplePrefix: '例如: 2002::00/64', defaultPort: '1-65535 (默认: 5000)', defaultMaxRetry: '100-4294967295 (默认: 2000)', defaultMinRetry: '正整数 (默认: 1000)', selectInterface: '请选择接口' },
      title: { srv6Locator: 'SRv6 Locator 名称', enableVpnSid: '启用 VPN SID', neighborAsn: '邻居 AS 号 (1-4294967294)', ebgpMultihop: 'EBGP 多跳数 (1-255)', advertisementInterval: '最小路由更新广告间隔 (0-600 秒)', bgpPort: 'BGP 端口 (1-65535)', localAsn: '本地 AS 号 (1-4294967294)', connectTimer: 'BGP 连接定时器 (0=禁用, 1-65535 秒)', holdTimer: 'BGP 保持定时器 (0=禁用, 1-65535 秒)', keepaliveTimer: 'BGP Keepalive 定时器 (1-65535 秒)', ttlSecurityHops: 'TTL 安全机制最大跳数 (1-254)', restartTimer: '优雅重启时间 (1-4095 秒)', stalepathTimer: '陈旧路径保留时间 (1-4095 秒)', bmpPort: 'BMP 连接端口 (1-65535, 默认: 5000)', bmpMaxRetry: '最大连接重试间隔 (100-4294967295 ms, 默认: 2000)', bmpMinRetry: '最小连接重试间隔 (毫秒, 默认: 1000)', metric: '重分发路由的度量值 (0-16777214)' },
      modal: { editNeighbor: '编辑 BGP 邻居', addNeighbor: '添加 BGP 邻居', editPeerGroup: '编辑 Peer Group', addPeerGroup: '添加 Peer Group', editBmp: '编辑 BMP 目标', addBmp: '添加 BMP 目标', editListen: '编辑监听范围', addListen: '添加监听范围', editNetwork: '编辑网络', addNetwork: '添加网络', editAggregate: '编辑聚合', addAggregate: '添加聚合', editInterface: '编辑接口', addInterface: '添加接口', editRedistribute: '编辑重分发', addRedistribute: '添加重分发', editIpv6Network: '编辑 IPv6 网络', addIpv6Network: '添加 IPv6 网络', editIpv6Aggregate: '编辑 IPv6 聚合', addIpv6Aggregate: '添加 IPv6 聚合', editIpv6Redistribute: '编辑 IPv6 重分发', addIpv6Redistribute: '添加 IPv6 重分发', editDistancePrefix: '编辑前缀管理距离', addDistancePrefix: '添加前缀管理距离', editEvpnRt: '编辑 EVPN Route Target', addEvpnRt: '添加 EVPN Route Target', editEvpnVni: '编辑 EVPN VNI', addEvpnVni: '添加 EVPN VNI', editVniRt: '编辑 VNI Route Target', addVniRt: '添加 VNI Route Target' },
      button: { manage: '管理', addRouteTarget: '添加 Route Target', delete: '删除' },
      message: { configuredRouteTargets: '已配置的 Route Targets', noConfig: '暂无配置' }
    },
    sstp: {
      columns: { username: '用户名', password: '密码', staticIp: '静态 IP', disable: '禁用', actions: '操作', address: '地址', key: '密钥', port: '端口', name: '名称', nextPool: '下一个池', range: '范围', delegatePrefix: '委派前缀', clientPrefix: '客户端前缀' },
      tabs: { basic: '基本', auth: '认证', pool: 'IP 池', ppp: 'PPP 选项', ssl: 'SSL', network: '网络' },
      labels: { description: '描述', port: '端口', mtu: 'MTU', gatewayAddress: '网关地址', hostName: '主机名', threadCount: '线程数', maxConcurrentSessions: '最大并发会话', authMode: '认证模式', authProtocols: '认证协议', sourceAddress: '源地址', accountingInterval: '计费间隔', accountingJitter: '计费抖动', accountingTimeout: '计费超时', maxRetry: '最大重试', nasIdentifier: 'NAS 标识符', nasIpAddress: 'NAS IP 地址', preallocateVif: '预分配 VIF', rateLimitAttribute: '限速属性', enableRateLimit: '启用限速', rateLimitMultiplier: '限速乘数', rateLimitVendor: '限速厂商', coaKey: 'CoA 密钥', coaPort: 'CoA 端口', coaServer: 'CoA 服务器', defaultIpPool: '默认 IP 池', defaultIpv6Pool: '默认 IPv6 池', disableCcp: '禁用 CCP', interfaceCache: '接口缓存', ipv4Negotiation: 'IPv4 协商', ipv6Negotiation: 'IPv6 协商', acceptPeerInterfaceId: '接受对端接口 ID', ipv6InterfaceId: 'IPv6 接口 ID', ipv6PeerInterfaceId: 'IPv6 对端接口 ID', lcpEchoFailure: 'LCP 回显失败', lcpEchoInterval: 'LCP 回显间隔', lcpEchoTimeout: 'LCP 回显超时', minMtu: '最小 MTU', mppe: 'MPPE', mru: 'MRU', caCertificate: 'CA 证书', certificate: '证书', dnsServer: 'DNS 服务器', winsServer: 'WINS 服务器', fwmark: '防火墙标记', burst: '突发计数', connectionLimit: '连接限制', timeout: '超时', logLevel: '日志级别', snmpMasterAgent: 'SNMP 主代理', onChangeScript: '变更脚本', onDownScript: '断开脚本', onPreUpScript: '预启动脚本', onUpScript: '启动脚本', username: '用户名', password: '密码', staticIp: '静态 IP', disable: '禁用', downloadLimit: '下载限速', uploadLimit: '上传限速', address: '地址', sharedKey: '共享密钥', acctPort: '计费端口', backup: '备份', disableAccounting: '禁用计费', failTime: '故障时间', priority: '优先级', name: '名称', nextPool: '下一个池', range: '范围' },
      tips: { description: 'SSTP 服务器描述', port: 'SSTP 连接端口，默认 443', mtu: '最大传输单元，默认 1500', gatewayAddress: '发送给客户端的默认网关', hostName: '仅允许连接到具有相同 TLS SNI 的指定主机', threadCount: '工作线程数，默认 all', maxConcurrentSessions: '最大并发会话启动尝试数', authMode: '认证模式', sourceAddress: '发起连接的 IPv4 源地址', accountingInterval: '发送计费信息间隔（秒）', accountingJitter: '计费信息最大抖动值（秒）', accountingTimeout: '中间更新包超时，0 保持活跃（默认 3）', maxRetry: '发送 Access-Request/Accounting-Request 查询的最大次数（默认 3）', nasIdentifier: '发送到 RADIUS 的 NAS-Identifier 属性', nasIpAddress: '发送到 RADIUS 的 NAS-IP-Address 属性', preallocateVif: '在 Access-Request 中启用 NAS-Port-Id 属性', rateLimitAttribute: '包含速率信息的 RADIUS 属性（默认 Filter-Id）', enableRateLimit: '通过 RADIUS 启用带宽整形', rateLimitMultiplier: '整形乘数（默认 1）', rateLimitVendor: '厂商字典', coaKey: '动态授权扩展服务器共享密钥', coaPort: '连接端口（默认 1700）', coaServer: '动态授权服务器 IPv4 地址', defaultIpPool: '默认客户端 IP 池名称', defaultIpv6Pool: '默认客户端 IPv6 池名称', disableCcp: '禁用压缩控制协议 (CCP)', interfaceCache: '缓存的接口数量', ipv4Negotiation: 'IPv4 (IPCP) 协商算法', ipv6Negotiation: 'IPv6 (IPCP6) 协商算法，默认拒绝', acceptPeerInterfaceId: '接受对端接口标识符', ipv6InterfaceId: 'IPv6 接口标识符', ipv6PeerInterfaceId: '对端 IPv6 接口标识符', lcpEchoFailure: '最大无响应回显请求数，默认 3', lcpEchoInterval: 'LCP 回显请求/秒，默认 30', lcpEchoTimeout: '等待对端活动的超时时间（秒），默认 0', minMtu: '最小可接受 MTU', mppe: 'MPPE 协商偏好', mru: '首选 MRU', caCertificate: 'PKI 配置中的 CA 证书链', certificate: 'PKI 配置中的证书名称', dnsServer: '域名服务器地址', winsServer: 'WINS 服务器地址', fwmark: '排除整形的防火墙标记值', burst: '突发计数', connectionLimit: '可接受的连接速率', timeout: '超时时间（秒）', logLevel: '日志级别，默认 3', snmpMasterAgent: '启用 SNMP 主代理模式', onChangeScript: 'RADIUS CoA 处理时运行的脚本', onDownScript: '会话接口终止时运行的脚本', onPreUpScript: '会话接口启动前运行的脚本', onUpScript: '会话接口完全配置并启动后运行的脚本', username: '认证用户名', password: '认证密码', staticIp: '静态客户端 IP 地址', disableUser: '禁用该用户', downloadLimit: '下载带宽限制 (kbits/sec)', uploadLimit: '上传带宽限制 (kbits/sec)', radiusServerAddress: 'RADIUS 服务器 IPv4 地址', sharedKey: '共享密钥', radiusPort: '端口，默认 1812', radiusSourceAddress: '发起连接的源地址', acctPort: '计费端口，默认 1813', backup: '其他服务器不可用时使用备份服务器', disableAccounting: '禁用计费', failTime: '故障后标记服务器不可用的秒数（默认 0）', priority: '服务器优先级', radiusTimeout: '会话超时，默认 2', disableServer: '禁用该服务器', ipPoolName: 'IP 池名称', nextPool: '下一个 IP 池名称', ipRange: 'IP 地址范围', ipv6PoolName: 'IPv6 池名称', ipv6DelegatePrefix: 'IPv6 委派前缀', delegatePrefixLength: '委派前缀长度', ipv6Prefix: 'IPv6 前缀', clientPrefixLength: '客户端前缀长度' },
      options: { threadCount: { all: '所有 CPU 核心 (默认)', half: '一半 CPU 核心' }, authMode: { local: '本地认证 (默认)', radius: 'RADIUS 认证', noauth: '禁用认证' }, negotiation: { deny: '拒绝', allow: '允许（仅客户端请求时）', prefer: '优先（默认）', require: '必须' }, logLevel: { off: '关闭日志', error: '仅错误', errorWarning: '错误和警告', default: '错误、警告和基本信息 (默认)', verbose: '错误、警告和完整信息', debug: '所有消息（含调试）' } },
      sections: { localUsers: '本地用户', radiusGlobal: 'RADIUS 全局设置', dynamicAuthor: '动态授权 (CoA)', radiusServers: 'RADIUS 服务器', clientIpPool: '客户端 IP 池', clientIpv6Pool: '客户端 IPv6 池', delegatePrefix: '委派前缀 (DHCPv6-PD)', clientPrefixPool: '客户端前缀池' },
      buttons: { create: '创建', edit: '编辑', delete: '删除', add: '添加', addDelegatePrefix: '+ 添加委派前缀', addClientPrefix: '+ 添加客户端前缀' },
      modals: { editUser: '编辑本地用户', createUser: '新建本地用户', editRadiusServer: '编辑 RADIUS 服务器', addRadiusServer: '添加 RADIUS 服务器', editIpPool: '编辑 IP 池', createIpPool: '新建 IP 池', editIpv6Pool: '编辑 IPv6 池', createIpv6Pool: '新建 IPv6 池' },
      errors: { loadFailed: '加载失败', saveFailed: '保存失败', selectUserToEdit: '请选择要编辑的用户', userNotFound: '未找到选中的用户', selectUserToDelete: '请选择要删除的用户', usernameRequired: '请输入用户名', selectServerToEdit: '请选择要编辑的服务器', serverNotFound: '未找到选中的服务器', selectServerToDelete: '请选择要删除的服务器', serverAddressRequired: '请输入服务器地址', selectIpPoolToEdit: '请选择要编辑的 IP 池', ipPoolNotFound: '未找到选中的 IP 池', selectIpPoolToDelete: '请选择要删除的 IP 池', ipPoolNameRequired: '请输入 IP 池名称', selectIpv6PoolToEdit: '请选择要编辑的 IPv6 池', ipv6PoolNotFound: '未找到选中的 IPv6 池', selectIpv6PoolToDelete: '请选择要删除的 IPv6 池', ipv6PoolNameRequired: '请输入 IPv6 池名称' },
      placeholders: { dnsServer: '每行一个 DNS 地址', winsServer: '每行一个 WINS 地址', connectionLimit: '如 1/min, 60/sec', ipv6InterfaceId: 'random 或 x:x:x:x', ipRange: '如 192.168.1.100-192.168.1.200' }
    },
    veth: {
      columns: { name: '接口名称', description: '描述', peerName: '对端接口', mtu: 'MTU', netns: '网络命名空间', vifCount: 'VIF 数量', disable: '禁用', actions: '操作' },
      tabs: { basic: '基本配置', dhcp: 'DHCP', dhcpv6: 'DHCPv6', vif: 'VLAN 子接口', other: '其他', command: '命令预览' },
      labels: { name: '接口名称', description: '描述', address: 'IP 地址', peerName: '对端接口', mtu: 'MTU', netns: '网络命名空间', disable: '禁用接口', dhcpClientId: '客户端 ID', dhcpDefaultRouteDistance: '默认路由距离', dhcpHostName: '主机名', dhcpMtu: '使用 DHCP MTU', dhcpNoDefaultRoute: '不安装默认路由', dhcpReject: '拒绝地址', dhcpUserClass: '用户类别', dhcpVendorClassId: '厂商类别 ID', dhcpv6Duid: 'DUID', dhcpv6NoRelease: '不发送 Release', dhcpv6NoRequestDns: '不请求 DNS', dhcpv6NoRequestDomainName: '不请求域名', dhcpv6ParametersOnly: '仅获取参数', dhcpv6PdInstances: '前缀委派实例', dhcpv6PdLength: '前缀长度', dhcpv6RapidCommit: '快速提交', dhcpv6Temporary: '临时地址', vif: 'VIF (VLAN)', vifS: 'VIF-S (QinQ)', vrf: 'VRF 实例' },
      placeholders: { name: '如 veth0, veth1', description: '接口描述', address: '每行一个 IPv4/IPv6 地址或 CIDR', peerName: '对端虚拟以太网接口名称', mtu: '68-16000', netns: '命名空间名称', dhcpClientId: 'DHCP 选项字符串', dhcpDefaultRouteDistance: '1-255', dhcpHostName: '主机名', dhcpReject: '每行一个 IP 或子网', dhcpUserClass: 'DHCP 选项字符串', dhcpVendorClassId: 'DHCP 选项字符串', dhcpv6Duid: 'DHCP 唯一标识符', dhcpv6PdInstances: 'JSON 格式，例如 {"0": {"interface": "eth0", "length": 64}}', dhcpv6PdLength: '32-64', vif: 'VLAN ID（每行一个，支持范围如 20-23）', vifS: 'QinQ 外层 VLAN ID（每行一个，支持范围如 20-23）', vrf: 'VRF 实例名称' },
      help: { name: '格式: vethN', address: '接口 IP 地址 (支持多行)', peerName: '虚拟以太网对端接口名称', mtu: '最大传输单元 (默认: 1500)', netns: '网络命名空间名称', disable: '管理性禁用接口', dhcpClientId: '用于向 DHCP 服务器标识客户端', dhcpDefaultRouteDistance: '默认路由的距离 (默认: 210)', dhcpHostName: '覆盖系统主机名', dhcpMtu: '使用 DHCP 服务器提供的 MTU', dhcpNoDefaultRoute: '不安装默认路由', dhcpReject: '拒绝 DHCP 租约的地址', dhcpUserClass: '用户可配置选项', dhcpVendorClassId: '标识厂商客户端类型', dhcpv6Duid: '客户端发送的 DUID', dhcpv6NoRelease: '客户端退出时不发送 release 消息', dhcpv6NoRequestDns: '不请求 DNS 服务器', dhcpv6NoRequestDomainName: '不请求域名', dhcpv6ParametersOnly: '仅获取配置参数，不获取地址', dhcpv6PdInstances: 'DHCPv6 前缀委派实例配置', dhcpv6PdLength: '前缀委派长度 (默认: 64)', dhcpv6RapidCommit: '等待立即回复而非通告', dhcpv6Temporary: 'IPv6 临时地址', vif: 'VLAN 接口 ID（每行一个，支持范围如 20-23）', vifS: 'QinQ 外层 VLAN ID（每行一个，支持范围如 20-23）', vrf: 'VRF 实例名称' },
      modals: { editVeth: '编辑虚拟以太网接口', createVeth: '创建虚拟以太网接口', confirmDelete: '确认删除' },
      messages: { confirmDelete: '确认删除以下虚拟以太网接口？', noConfig: '# 未配置任何参数', enterName: '请输入接口名称', selectToDelete: '请先选择要删除的虚拟以太网接口', errorCode: '错误码: {code}', errorMessage: '错误信息: {message}' },
      buttons: { cancel: '取消', confirm: '确定' }
    },
  },
  'en': {
    app: { title: 'VyOS', login: 'Login', logout: 'Logout', submit: 'Submit', cancel: 'Cancel', save: 'Save', delete: 'Delete', edit: 'Edit', create: 'Create', move: 'Move', moveUp: 'Move Up', moveDown: 'Move Down', copy: 'Copy', refresh: 'Refresh', search: 'Search', columnSetting: 'Column Setting', filter: 'Filter', advanced: 'Advanced Options', commands: 'CLI Commands', close: 'Close', confirm: 'Confirm', loading: 'Loading', actions: 'Actions' },
    login: { username: 'Username', password: 'Password', remember: 'Remember me', language: 'Language' },
    menu: { monitor: 'Monitor', logs: 'Logs', firewall: 'Firewall', interfaces: 'Interfaces', nat: 'NAT', policy: 'Policy & Protocols', qos: 'QoS', service: 'Services', system: 'System', vpn: 'VPN', 'load-balancing': 'Load Balancing' },
    table: { total: 'Total {total}', page: 'Page {page}/{pages}', itemsPerPage: 'Items per page', noData: 'No data' },
    config: { commit: 'Commit', discard: 'Discard', save: 'Save Config', load: 'Load Config', compare: 'Compare', rollback: 'Rollback', import: 'Import', export: 'Export', commands: 'CLI Commands', copy: 'Copy' },
    errors: { required: 'This field is required', invalid_ipv4: 'Invalid IPv4 address', invalid_ipv6: 'Invalid IPv6 address', invalid_mac: 'Invalid MAC address', invalid_port: 'Port range is 1-65535' },
    msg: { saved: 'Saved successfully', deleted: 'Deleted successfully', confirmDelete: 'Confirm delete selected items?', noSelection: 'Please select a row' },
    common: { saving: 'Saving', save: 'Save' },
    featureVisibility: { title: 'Feature Visibility', visible: 'Visible', hidden: 'Hidden' },
    mpls: {
      columns: { interfaceName: 'Interface Name', helloInterval: 'Hello Interval', helloHoldtime: 'Hello Holdtime' },
      tabs: { basic: 'Basic', interfaces: 'Interfaces', ldp: 'LDP', parameters: 'Parameters' },
      sections: { mplsConfig: 'MPLS Configuration', ldpBasic: 'LDP Basic Settings', ldpInterfaces: 'LDP Interfaces' },
      descriptions: { mplsConfig: 'MPLS basic configuration should be completed in the Interfaces and LDP tabs.' },
      labels: { routerId: 'Router ID', targetedHello: 'Targeted Hello', maximumLabels: 'Maximum Labels', rangeSize: 'Label Range Size', interfaceNameRequired: 'Interface Name *', helloInterval: 'Hello Interval', helloHoldtime: 'Hello Holdtime' },
      placeholders: { routerId: 'e.g., 1.1.1.1', labelRange: '1-1048575', selectInterface: 'Select an interface', helloInterval: 'Default: 5 seconds', helloHoldtime: 'Default: 15 seconds' },
      buttons: { addInterface: 'Add Interface' },
      modals: { editMplsInterface: 'Edit MPLS Interface', addMplsInterface: 'Add MPLS Interface', editLdpInterface: 'Edit LDP Interface', addLdpInterface: 'Add LDP Interface', confirmDelete: 'Confirm Delete' },
      messages: { selectInterface: 'Please select an interface', confirmDeleteInterface: 'Confirm delete the following interface?', confirmDeleteLdpInterface: 'Confirm delete the following LDP interface?' },
      alerts: { saved: 'Saved' }
    },
    bfd: {
      columns: { address: 'Peer Address', sourceAddress: 'Source Address', multiplier: 'Multiplier', receiveInterval: 'Receive Interval', transmitInterval: 'Transmit Interval', profile: 'Profile', name: 'Name' },
      tabs: { peer: 'Peer', profile: 'Profile' },
      labels: { peerAddressRequired: 'Peer Address *', sourceAddress: 'Source Address', multiplier: 'Multiplier', receiveInterval: 'Receive Interval', transmitInterval: 'Transmit Interval', profile: 'Profile', nameRequired: 'Name *' },
      placeholders: { ipv4: 'IPv4 Address', multiplier: '2-50', intervalMs: '50-1000 ms', profileName: 'Profile Name' },
      modals: { editPeer: 'Edit BFD Peer', addPeer: 'Add BFD Peer', editProfile: 'Edit BFD Profile', addProfile: 'Add BFD Profile', confirmDelete: 'Confirm Delete' },
      messages: { confirmDeletePeer: 'Confirm delete the following peer?', confirmDeleteProfile: 'Confirm delete the following profile?' },
      errors: { peerAddressRequired: 'Please enter peer address', profileNameRequired: 'Please enter profile name' },
      validation: { ipv4: 'Invalid IPv4 address format', interval: '{name} must be between {min}-{max}' },
      alerts: { saved: 'Saved' }
    },
    rpki: {
      columns: { address: 'Cache Server Address', port: 'Port', preference: 'Preference' },
      tabs: { basic: 'Basic', cache: 'Cache Servers' },
      sections: { parameters: 'RPKI Parameters' },
      labels: { expireInterval: 'Expire Interval', pollingPeriod: 'Polling Period', retryInterval: 'Retry Interval', addressRequired: 'Cache Server Address *' },
      placeholders: { expireInterval: 'Default: 7200 seconds', pollingPeriod: 'Default: 300 seconds', retryInterval: 'Default: 600 seconds', ipv4: 'IPv4 Address', port: 'Port Number', preference: '1-255' },
      modals: { editCache: 'Edit RPKI Cache', addCache: 'Add RPKI Cache', confirmDelete: 'Confirm Delete' },
      messages: { confirmDeleteCache: 'Confirm delete the following cache server?' },
      errors: { addressRequired: 'Please enter cache server address' },
      validation: { ipv4: 'Invalid IPv4 address format', interval: '{name} must be between {min}-{max}' },
      alerts: { saved: 'Saved' }
    },
    pim: {
      tabs: { basic: 'Basic', interfaces: 'Interfaces', rp: 'RP Addresses', ssm: 'SSM', spt: 'SPT Switchover', advanced: 'Advanced Options' },
      columns: { interfaceName: 'Interface Name', drPriority: 'DR Priority', helloInterval: 'Hello Interval', passive: 'Passive', rpAddress: 'RP Address', groupAddress: 'Group Address' },
      labels: { basicConfig: 'Basic Configuration', joinPruneInterval: 'Join/Prune Interval', keepAliveTimer: 'Keep-Alive Timer', enableEcmp: 'Enable PIM ECMP', enableEcmpRebalance: 'Enable PIM ECMP Rebalance', rpKeepAliveTimer: 'RP Keep-Alive Timer', igmpWatermarkWarning: 'IGMP Watermark Warning', ssmConfig: 'SSM Configuration', ssmPrefixList: 'SSM Prefix List', sptSwitchover: 'SPT Switchover', neverSwitchToSpt: 'Never switch to SPT (infinity-and-beyond)', prefixList: 'Prefix List', advancedOptions: 'Advanced Options', disableIpv6Secondary: 'Disable IPv6 Secondary Address (no-v6-secondary)', packets: 'Packet Processing Count', registerSuppressTime: 'Register Suppress Time', registerAcceptList: 'Register Accept Prefix List', interfaceName: 'Interface Name', drPriority: 'DR Priority', helloInterval: 'Hello Interval', sourceAddress: 'Source Address', noBsm: 'Do not process Bootstrap messages (no-bsm)', noUnicastBsm: 'Do not process unicast Bootstrap messages (no-unicast-bsm)', passiveMode: 'Passive mode (passive)', bfd: 'BFD', enableBfd: 'Enable BFD', bfdProfile: 'BFD Profile', igmp: 'IGMP', disableIgmp: 'Disable IGMP', igmpVersion: 'IGMP Version', queryInterval: 'Query Interval', maxResponseTime: 'Max Response Time', igmpJoinGroups: 'IGMP Join Groups', multicastGroupAddress: 'Multicast Group Address', actions: 'Actions', rpAddressRequired: 'RP Address *', groupAddressRange: 'Group Address Range', addGroupAddress: 'Add Group Address' },
      placeholders: { joinPruneInterval: 'Default: 60 seconds', keepAliveTimer: 'Keep-Alive Timer', rpKeepAliveTimer: 'RP Keep-Alive Timer', groupRestrictionWarning: 'Group restriction warning', ssmPrefixListName: 'SSM prefix list name', prefixListName: 'Prefix list name', packets: 'Default: 3', registerSuppressTime: 'Register suppress time', registerAcceptList: 'Only accept Register from specified prefix list', selectInterface: 'Select an interface', drPriority: '1-4294967295', helloInterval: 'Hello interval (seconds)', ipv4SourceAddress: 'IPv4 source address', bfdProfileName: 'BFD Profile name', queryInterval: 'IGMP query interval (seconds)', maxResponseTime: 'IGMP max response time (seconds)', multicastGroupAddress: 'e.g., 224.0.0.1', rpAddress: 'e.g., 10.0.0.1', groupAddress: 'e.g., 224.0.0.0/4' },
      buttons: { addJoin: 'Add Join', edit: 'Edit', delete: 'Delete', add: 'Add' },
      modals: { editPimInterface: 'Edit PIM Interface', addPimInterface: 'Add PIM Interface', editIgmpJoin: 'Edit IGMP Join', addIgmpJoin: 'Add IGMP Join', editRpAddress: 'Edit RP Address', addRpAddress: 'Add RP Address', confirmDelete: 'Confirm Delete' },
      messages: { saved: 'Saved', enterInterfaceName: 'Please enter interface name', enterMulticastGroupAddress: 'Please enter multicast group address', enterRpAddress: 'Please enter RP address', confirmDeleteInterface: 'Confirm delete the following interface?', confirmDeleteIgmpJoin: 'Confirm delete the following IGMP Join?', confirmDeleteRpAddress: 'Confirm delete the following RP address?' },
      errors: { ipv4Format: 'Invalid IPv4 address format', ipv4PrefixFormat: 'Invalid IPv4 prefix format (e.g., 224.0.0.0/4)', prefixLengthRange: 'Prefix length must be between 0-32', timerRange: '{name} must be between {min}-{max}', priorityRange: 'Priority must be between 1-4294967295', interfaceError: 'Interface {name}: {error}', igmpJoinError: 'Interface {name} IGMP Join: {error}', rpAddressError: 'RP address: {error}', rpGroupError: 'RP {address} group address: {error}' },
      options: { defaultVersion: 'Default (3)', version1: 'Version 1', version2: 'Version 2', version3: 'Version 3' }
    },
    bgp: {
      tabs: { basic: 'Basic', neighbors: 'Neighbors', peerGroups: 'Peer Groups', addressFamily: 'Address Family', bmp: 'BMP', listen: 'Listen', network: 'Network', aggregate: 'Aggregate', redistribute: 'Redistribute', interface: 'Interface', ipv6Network: 'IPv6 Network', ipv6Aggregate: 'IPv6 Aggregate', ipv6Redistribute: 'IPv6 Redistribute', ipv6Distance: 'IPv6 Distance', ipv4Flowspec: 'IPv4 Flowspec', ipv4LabeledUnicast: 'IPv4 Labeled Unicast', ipv4Multicast: 'IPv4 Multicast', ipv4Vpn: 'IPv4 VPN', ipv6Flowspec: 'IPv6 Flowspec', ipv6LabeledUnicast: 'IPv6 Labeled Unicast', ipv6Multicast: 'IPv6 Multicast', ipv6Vpn: 'IPv6 VPN', l2vpnEvpn: 'L2VPN EVPN', sid: 'SID', srv6: 'SRv6' },
      section: { basicSettings: 'Basic Settings', eadEsConfig: 'EAD-ES Configuration', advertiseConfig: 'Advertise Configuration', network: 'Network', sidConfig: 'SID Configuration' },
      label: { advertisePip: 'Advertise PIP (advertise-pip)', advertiseSviIp: 'Advertise SVI IP (advertise-svi-ip)', disableEadEviRx: 'Disable EAD EVI Receive (disable-ead-evi-rx)', disableEadEviTx: 'Disable EAD EVI Transmit (disable-ead-evi-tx)', rtAutoDerive: 'Auto Derive RT (rt-auto-derive)', floodingDisable: 'Disable Flooding (flooding disable)', advertiseIpv4Unicast: 'Advertise IPv4 Unicast', advertiseIpv6Unicast: 'Advertise IPv6 Unicast', rtCount: 'RTs', enableVpnSid: 'Enable VPN SID (between current VRF and VPN)', neighborAddress: 'Neighbor Address', remoteAsn: 'Remote ASN', description: 'Description', localRole: 'Local Role', ebgpMultihop: 'EBGP Multihop', advertisementInterval: 'Advertisement Interval', updateSource: 'Update Source', port: 'Port', localAsn: 'Local ASN', password: 'Password', connectTimer: 'Connect Timer', holdTimer: 'Hold Timer', keepaliveTimer: 'Keepalive Timer', ttlSecurityHops: 'TTL Security Hops', shutdown: 'Shutdown', passiveMode: 'Passive Mode', enforceFirstAs: 'Enforce First AS', overrideCapability: 'Override Capability Negotiation', disableConnectedCheck: 'Disable Connected Check', disableCapabilityNegotiation: 'Disable Capability Negotiation', gracefulRestart: 'Graceful Restart', restartTimer: 'Restart Timer', stalepathTimer: 'Stalepath Timer', preserveFwState: 'Preserve Firewall State', enableBfd: 'Enable BFD', checkControlPlaneFailure: 'Check Control Plane Failure', capabilityNegotiation: 'Capability Negotiation', dynamicCapability: 'Dynamic Capability', extendedNexthop: 'Extended Nexthop', softwareVersion: 'Software Version', pathAttribute: 'Path Attribute', discard: 'Discard', treatAsWithdraw: 'Treat as Withdraw', name: 'Name', updateSourceInterface: 'Update Source Interface', address: 'Address', maxRetryInterval: 'Max Retry Interval (ms)', minRetryInterval: 'Min Retry Interval (ms)', enableMirror: 'Enable Mirror', monitorConfig: 'Monitor Configuration', range: 'Range', networkLabel: 'Network', backdoorRoute: 'Backdoor Route', routeMap: 'Route Map', aggregateNetwork: 'Aggregate Network', summaryOnly: 'Summary Only', interfaceName: 'Interface Name', enableMplsForwarding: 'Enable MPLS Forwarding', protocol: 'Protocol', metric: 'Metric', ipv6NetworkLabel: 'IPv6 Network', pathLimit: 'Path Limit (0-255)', ipv6AggregateNetwork: 'IPv6 Aggregate Network', prefix: 'Prefix', adminDistance: 'Administrative Distance * (1-255)', mplsLabel: 'MPLS Label (0-1048575)', routeDistinguisherLabel: 'Route Distinguisher (ASN:NN or IP:NN)', direction: 'Direction *' },
      placeholder: { routeDistinguisher: 'e.g., 1:1 or 1.1.1.1:100', macVrfSoo: 'e.g., 1:1 or 1.1.1.1:100', routeMapName: 'Route-map name', srv6Locator: 'e.g., MYLOCATOR', ipv4OrIpv6Address: 'IPv4 or IPv6 address', secondsRange: '{min}-{max} seconds', timerRange: '{min}-{max} seconds', interfaceOrIp: 'Interface name or IP address', exampleInterface: 'e.g., eth0', bfdProfileName: 'BFD profile name', commaSeparatedList: 'Comma-separated list of attributes', exampleNetwork: 'e.g., 2.2.2.0/24', exampleIpv6Network: 'e.g., 2001:db8::/32', examplePrefix: 'e.g., 2002::00/64', defaultPort: '1-65535 (default: 5000)', defaultMaxRetry: '100-4294967295 (default: 2000)', defaultMinRetry: 'Positive integer (default: 1000)', selectInterface: 'Select an interface' },
      title: { srv6Locator: 'SRv6 Locator name', enableVpnSid: 'Enable VPN SID', neighborAsn: 'Neighbor AS number (1-4294967294)', ebgpMultihop: 'EBGP multihop count (1-255)', advertisementInterval: 'Minimum route update advertisement interval (0-600 seconds)', bgpPort: 'BGP port (1-65535)', localAsn: 'Local AS number (1-4294967294)', connectTimer: 'BGP connect timer (0=disabled, 1-65535 seconds)', holdTimer: 'BGP hold timer (0=disabled, 1-65535 seconds)', keepaliveTimer: 'BGP Keepalive timer (1-65535 seconds)', ttlSecurityHops: 'TTL security maximum hops (1-254)', restartTimer: 'Graceful restart time (1-4095 seconds)', stalepathTimer: 'Stalepath retention time (1-4095 seconds)', bmpPort: 'BMP connection port (1-65535, default: 5000)', bmpMaxRetry: 'Maximum connection retry interval (100-4294967295 ms, default: 2000)', bmpMinRetry: 'Minimum connection retry interval (ms, default: 1000)', metric: 'Metric for redistributed routes (0-16777214)' },
      modal: { editNeighbor: 'Edit BGP Neighbor', addNeighbor: 'Add BGP Neighbor', editPeerGroup: 'Edit Peer Group', addPeerGroup: 'Add Peer Group', editBmp: 'Edit BMP Target', addBmp: 'Add BMP Target', editListen: 'Edit Listen Range', addListen: 'Add Listen Range', editNetwork: 'Edit Network', addNetwork: 'Add Network', editAggregate: 'Edit Aggregate', addAggregate: 'Add Aggregate', editInterface: 'Edit Interface', addInterface: 'Add Interface', editRedistribute: 'Edit Redistribute', addRedistribute: 'Add Redistribute', editIpv6Network: 'Edit IPv6 Network', addIpv6Network: 'Add IPv6 Network', editIpv6Aggregate: 'Edit IPv6 Aggregate', addIpv6Aggregate: 'Add IPv6 Aggregate', editIpv6Redistribute: 'Edit IPv6 Redistribute', addIpv6Redistribute: 'Add IPv6 Redistribute', editDistancePrefix: 'Edit Prefix Administrative Distance', addDistancePrefix: 'Add Prefix Administrative Distance', editEvpnRt: 'Edit EVPN Route Target', addEvpnRt: 'Add EVPN Route Target', editEvpnVni: 'Edit EVPN VNI', addEvpnVni: 'Add EVPN VNI', editVniRt: 'Edit VNI Route Target', addVniRt: 'Add VNI Route Target' },
      button: { manage: 'Manage', addRouteTarget: 'Add Route Target', delete: 'Delete' },
      message: { configuredRouteTargets: 'Configured Route Targets', noConfig: 'No configuration' }
    },
    sstp: {
      columns: { username: 'Username', password: 'Password', staticIp: 'Static IP', disable: 'Disable', actions: 'Actions', address: 'Address', key: 'Key', port: 'Port', name: 'Name', nextPool: 'Next Pool', range: 'Range', delegatePrefix: 'Delegate Prefix', clientPrefix: 'Client Prefix' },
      tabs: { basic: 'Basic', auth: 'Authentication', pool: 'IP Pool', ppp: 'PPP Options', ssl: 'SSL', network: 'Network' },
      labels: { description: 'Description', port: 'Port', mtu: 'MTU', gatewayAddress: 'Gateway Address', hostName: 'Host Name', threadCount: 'Thread Count', maxConcurrentSessions: 'Max Concurrent Sessions', authMode: 'Authentication Mode', authProtocols: 'Authentication Protocols', sourceAddress: 'Source Address', accountingInterval: 'Accounting Interval', accountingJitter: 'Accounting Jitter', accountingTimeout: 'Accounting Timeout', maxRetry: 'Max Retry', nasIdentifier: 'NAS Identifier', nasIpAddress: 'NAS IP Address', preallocateVif: 'Preallocate VIF', rateLimitAttribute: 'Rate Limit Attribute', enableRateLimit: 'Enable Rate Limit', rateLimitMultiplier: 'Rate Limit Multiplier', rateLimitVendor: 'Rate Limit Vendor', coaKey: 'CoA Key', coaPort: 'CoA Port', coaServer: 'CoA Server', defaultIpPool: 'Default IP Pool', defaultIpv6Pool: 'Default IPv6 Pool', disableCcp: 'Disable CCP', interfaceCache: 'Interface Cache', ipv4Negotiation: 'IPv4 Negotiation', ipv6Negotiation: 'IPv6 Negotiation', acceptPeerInterfaceId: 'Accept Peer Interface ID', ipv6InterfaceId: 'IPv6 Interface ID', ipv6PeerInterfaceId: 'IPv6 Peer Interface ID', lcpEchoFailure: 'LCP Echo Failure', lcpEchoInterval: 'LCP Echo Interval', lcpEchoTimeout: 'LCP Echo Timeout', minMtu: 'Min MTU', mppe: 'MPPE', mru: 'MRU', caCertificate: 'CA Certificate', certificate: 'Certificate', dnsServer: 'DNS Server', winsServer: 'WINS Server', fwmark: 'Firewall Mark', burst: 'Burst', connectionLimit: 'Connection Limit', timeout: 'Timeout', logLevel: 'Log Level', snmpMasterAgent: 'SNMP Master Agent', onChangeScript: 'On Change Script', onDownScript: 'On Down Script', onPreUpScript: 'On Pre-Up Script', onUpScript: 'On Up Script', username: 'Username', password: 'Password', staticIp: 'Static IP', disable: 'Disable', downloadLimit: 'Download Limit', uploadLimit: 'Upload Limit', address: 'Address', sharedKey: 'Shared Key', acctPort: 'Accounting Port', backup: 'Backup', disableAccounting: 'Disable Accounting', failTime: 'Fail Time', priority: 'Priority', name: 'Name', nextPool: 'Next Pool', range: 'Range' },
      tips: { description: 'SSTP server description', port: 'SSTP connection port, default 443', mtu: 'Maximum transmission unit, default 1500', gatewayAddress: 'Default gateway sent to clients', hostName: 'Only allow connections to specified host with matching TLS SNI', threadCount: 'Number of worker threads, default all', maxConcurrentSessions: 'Maximum concurrent session start attempts', authMode: 'Authentication mode', sourceAddress: 'IPv4 source address for initiating connections', accountingInterval: 'Interval for sending accounting information (seconds)', accountingJitter: 'Maximum jitter value for accounting information (seconds)', accountingTimeout: 'Interim update packet timeout, 0 to keep alive (default 3)', maxRetry: 'Maximum number of Access-Request/Accounting-Request query attempts (default 3)', nasIdentifier: 'NAS-Identifier attribute sent to RADIUS', nasIpAddress: 'NAS-IP-Address attribute sent to RADIUS', preallocateVif: 'Enable NAS-Port-Id attribute in Access-Request', rateLimitAttribute: 'RADIUS attribute containing rate information (default Filter-Id)', enableRateLimit: 'Enable bandwidth shaping via RADIUS', rateLimitMultiplier: 'Shaping multiplier (default 1)', rateLimitVendor: 'Vendor dictionary', coaKey: 'Dynamic authorization extension server shared key', coaPort: 'Connection port (default 1700)', coaServer: 'Dynamic authorization server IPv4 address', defaultIpPool: 'Default client IP pool name', defaultIpv6Pool: 'Default client IPv6 pool name', disableCcp: 'Disable Compression Control Protocol (CCP)', interfaceCache: 'Number of cached interfaces', ipv4Negotiation: 'IPv4 (IPCP) negotiation algorithm', ipv6Negotiation: 'IPv6 (IPCP6) negotiation algorithm, default deny', acceptPeerInterfaceId: 'Accept peer interface identifier', ipv6InterfaceId: 'IPv6 interface identifier', ipv6PeerInterfaceId: 'Peer IPv6 interface identifier', lcpEchoFailure: 'Maximum unresponsive echo requests, default 3', lcpEchoInterval: 'LCP echo requests/second, default 30', lcpEchoTimeout: 'Timeout for waiting for peer activity (seconds), default 0', minMtu: 'Minimum acceptable MTU', mppe: 'MPPE negotiation preference', mru: 'Preferred MRU', caCertificate: 'CA certificate chain in PKI configuration', certificate: 'Certificate name in PKI configuration', dnsServer: 'Domain name server address', winsServer: 'WINS server address', fwmark: 'Firewall mark value to exclude from shaping', burst: 'Burst count', connectionLimit: 'Acceptable connection rate', timeout: 'Timeout (seconds)', logLevel: 'Log level, default 3', snmpMasterAgent: 'Enable SNMP master agent mode', onChangeScript: 'Script to run during RADIUS CoA processing', onDownScript: 'Script to run when session interface terminates', onPreUpScript: 'Script to run before session interface starts', onUpScript: 'Script to run after session interface is fully configured and started', username: 'Authentication username', password: 'Authentication password', staticIp: 'Static client IP address', disableUser: 'Disable this user', downloadLimit: 'Download bandwidth limit (kbits/sec)', uploadLimit: 'Upload bandwidth limit (kbits/sec)', radiusServerAddress: 'RADIUS server IPv4 address', sharedKey: 'Shared key', radiusPort: 'Port, default 1812', radiusSourceAddress: 'Source address for initiating connections', acctPort: 'Accounting port, default 1813', backup: 'Use backup server when other servers are unavailable', disableAccounting: 'Disable accounting', failTime: 'Seconds to mark server as unavailable after failure (default 0)', priority: 'Server priority', radiusTimeout: 'Session timeout, default 2', disableServer: 'Disable this server', ipPoolName: 'IP pool name', nextPool: 'Next IP pool name', ipRange: 'IP address range', ipv6PoolName: 'IPv6 pool name', ipv6DelegatePrefix: 'IPv6 delegate prefix', delegatePrefixLength: 'Delegate prefix length', ipv6Prefix: 'IPv6 prefix', clientPrefixLength: 'Client prefix length' },
      options: { threadCount: { all: 'All CPU cores (default)', half: 'Half CPU cores' }, authMode: { local: 'Local authentication (default)', radius: 'RADIUS authentication', noauth: 'Disable authentication' }, negotiation: { deny: 'Deny', allow: 'Allow (only when client requests)', prefer: 'Prefer (default)', require: 'Require' }, logLevel: { off: 'Logging off', error: 'Errors only', errorWarning: 'Errors and warnings', default: 'Errors, warnings and basic information (default)', verbose: 'Errors, warnings and full information', debug: 'All messages (including debug)' } },
      sections: { localUsers: 'Local Users', radiusGlobal: 'RADIUS Global Settings', dynamicAuthor: 'Dynamic Authorization (CoA)', radiusServers: 'RADIUS Servers', clientIpPool: 'Client IP Pool', clientIpv6Pool: 'Client IPv6 Pool', delegatePrefix: 'Delegate Prefix (DHCPv6-PD)', clientPrefixPool: 'Client Prefix Pool' },
      buttons: { create: 'Create', edit: 'Edit', delete: 'Delete', add: 'Add', addDelegatePrefix: '+ Add Delegate Prefix', addClientPrefix: '+ Add Client Prefix' },
      modals: { editUser: 'Edit Local User', createUser: 'Create Local User', editRadiusServer: 'Edit RADIUS Server', addRadiusServer: 'Add RADIUS Server', editIpPool: 'Edit IP Pool', createIpPool: 'Create IP Pool', editIpv6Pool: 'Edit IPv6 Pool', createIpv6Pool: 'Create IPv6 Pool' },
      errors: { loadFailed: 'Load failed', saveFailed: 'Save failed', selectUserToEdit: 'Please select a user to edit', userNotFound: 'Selected user not found', selectUserToDelete: 'Please select a user to delete', usernameRequired: 'Please enter username', selectServerToEdit: 'Please select a server to edit', serverNotFound: 'Selected server not found', selectServerToDelete: 'Please select a server to delete', serverAddressRequired: 'Please enter server address', selectIpPoolToEdit: 'Please select an IP pool to edit', ipPoolNotFound: 'Selected IP pool not found', selectIpPoolToDelete: 'Please select an IP pool to delete', ipPoolNameRequired: 'Please enter IP pool name', selectIpv6PoolToEdit: 'Please select an IPv6 pool to edit', ipv6PoolNotFound: 'Selected IPv6 pool not found', selectIpv6PoolToDelete: 'Please select an IPv6 pool to delete', ipv6PoolNameRequired: 'Please enter IPv6 pool name' },
      placeholders: { dnsServer: 'One DNS address per line', winsServer: 'One WINS address per line', connectionLimit: 'e.g., 1/min, 60/sec', ipv6InterfaceId: 'random or x:x:x:x', ipRange: 'e.g., 192.168.1.100-192.168.1.200' }
    },
    veth: {
      columns: { name: 'Interface Name', description: 'Description', peerName: 'Peer Interface', mtu: 'MTU', netns: 'Network Namespace', vifCount: 'VIF Count', disable: 'Disable', actions: 'Actions' },
      tabs: { basic: 'Basic', dhcp: 'DHCP', dhcpv6: 'DHCPv6', vif: 'VLAN Sub-interfaces', other: 'Other', command: 'Command Preview' },
      labels: { name: 'Interface Name', description: 'Description', address: 'IP Address', peerName: 'Peer Interface', mtu: 'MTU', netns: 'Network Namespace', disable: 'Disable Interface', dhcpClientId: 'Client ID', dhcpDefaultRouteDistance: 'Default Route Distance', dhcpHostName: 'Host Name', dhcpMtu: 'Use DHCP MTU', dhcpNoDefaultRoute: 'No Default Route', dhcpReject: 'Reject Addresses', dhcpUserClass: 'User Class', dhcpVendorClassId: 'Vendor Class ID', dhcpv6Duid: 'DUID', dhcpv6NoRelease: 'No Release', dhcpv6NoRequestDns: 'No Request DNS', dhcpv6NoRequestDomainName: 'No Request Domain Name', dhcpv6ParametersOnly: 'Parameters Only', dhcpv6PdInstances: 'Prefix Delegation Instances', dhcpv6PdLength: 'Prefix Length', dhcpv6RapidCommit: 'Rapid Commit', dhcpv6Temporary: 'Temporary Address', vif: 'VIF (VLAN)', vifS: 'VIF-S (QinQ)', vrf: 'VRF Instance' },
      placeholders: { name: 'e.g., veth0, veth1', description: 'Interface description', address: 'One IPv4/IPv6 address or CIDR per line', peerName: 'Peer virtual ethernet interface name', mtu: '68-16000', netns: 'Namespace name', dhcpClientId: 'DHCP option string', dhcpDefaultRouteDistance: '1-255', dhcpHostName: 'Host name', dhcpReject: 'One IP or subnet per line', dhcpUserClass: 'DHCP option string', dhcpVendorClassId: 'DHCP option string', dhcpv6Duid: 'DHCP unique identifier', dhcpv6PdInstances: 'JSON format, e.g., {"eth0": {"interface": "eth0", "address": "1", "sla-id": 0}}', dhcpv6PdLength: '32-64', vif: 'VLAN ID (one per line, supports ranges like 20-23)', vifS: 'QinQ outer VLAN ID (one per line, supports ranges like 20-23)', vrf: 'VRF instance name' },
      help: { name: 'Format: vethN', address: 'Interface IP addresses (multiline supported)', peerName: 'Virtual ethernet peer interface name', mtu: 'Maximum transmission unit (default: 1500)', netns: 'Network namespace name', disable: 'Administratively disable interface', dhcpClientId: 'Identify client to DHCP server', dhcpDefaultRouteDistance: 'Distance for default route (default: 210)', dhcpHostName: 'Override system hostname', dhcpMtu: 'Use MTU from DHCP server', dhcpNoDefaultRoute: 'Do not install default route', dhcpReject: 'Reject addresses from DHCP lease', dhcpUserClass: 'User configurable options', dhcpVendorClassId: 'Identify vendor client type', dhcpv6Duid: 'DUID sent by client', dhcpv6NoRelease: 'Do not send release message on exit', dhcpv6NoRequestDns: 'Do not request DNS server', dhcpv6NoRequestDomainName: 'Do not request domain name', dhcpv6ParametersOnly: 'Only get configuration parameters, not addresses', dhcpv6PdInstances: 'DHCPv6 prefix delegation instance configuration', dhcpv6PdLength: 'Prefix delegation length (default: 64)', dhcpv6RapidCommit: 'Wait for immediate reply instead of advertisement', dhcpv6Temporary: 'IPv6 temporary address', vif: 'VLAN interface ID (one per line, supports ranges like 20-23)', vifS: 'QinQ outer VLAN ID (one per line, supports ranges like 20-23)', vrf: 'VRF instance name' },
      modals: { editVeth: 'Edit Virtual Ethernet Interface', createVeth: 'Create Virtual Ethernet Interface', confirmDelete: 'Confirm Delete' },
      messages: { confirmDelete: 'Confirm delete the following virtual ethernet interfaces?', noConfig: '# No parameters configured', enterName: 'Please enter interface name', selectToDelete: 'Please select virtual ethernet interfaces to delete first', errorCode: 'Error code: {code}', errorMessage: 'Error message: {message}' },
      buttons: { cancel: 'Cancel', confirm: 'Confirm' }
    },
  },
};

const loadedMessages = reactive({});
for (const loc of LOCALES) {
  loadedMessages[loc] = JSON.parse(JSON.stringify(defaultMessages[loc] || defaultMessages['en']));
}

const locale = ref(localStorage.getItem('locale') || 'zh-CN');
const loadState = ref({ loading: false, error: '' });
const loadVersion = ref(0);

watch(locale, (newVal) => {
  localStorage.setItem('locale', newVal);
});

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // If target[key] is a string or other non-object, replace it entirely
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

async function fetchModule(module) {
  try {
    const res = await fetch(`/src/i18n/locales/${module}.json?t=${Date.now()}`);
    if (!res.ok) {
      console.warn(`[i18n] Failed to load ${module}.json: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`[i18n] Error loading ${module}.json:`, e);
    return null;
  }
}

function mergeResults(results) {
  const mergedData = {};
  for (const data of results) {
    if (!data) continue;
    for (const loc of LOCALES) {
      if (data[loc]) {
        if (!mergedData[loc]) mergedData[loc] = {};
        deepMerge(mergedData[loc], data[loc]);
      }
    }
  }
  for (const loc of LOCALES) {
    if (mergedData[loc]) {
      // Build on top of existing loadedMessages (if any) to preserve
      // keys merged from previous calls (e.g. essential -> optional)
      const base = loadedMessages[loc]
        ? JSON.parse(JSON.stringify(loadedMessages[loc]))
        : JSON.parse(JSON.stringify(defaultMessages[loc] || defaultMessages['en']));
      deepMerge(base, mergedData[loc]);
      loadedMessages[loc] = base;
    }
  }
  loadVersion.value++;
}

// Load essential modules first (for login page)
export async function loadEssentialLocales() {
  loadState.value.loading = true;
  loadState.value.error = '';
  try {
    const results = await Promise.all(ESSENTIAL_MODULES.map(fetchModule));
    mergeResults(results);
  } catch (e) {
    loadState.value.error = e.message;
    console.error('[i18n] loadEssentialLocales failed:', e);
  } finally {
    loadState.value.loading = false;
  }
}

// Load all remaining modules in background (after login)
export async function loadOptionalLocales() {
  try {
    const results = await Promise.all(OPTIONAL_MODULES.map(fetchModule));
    mergeResults(results);
  } catch (e) {
    console.error('[i18n] loadOptionalLocales failed:', e);
  }
}

// Backward compatibility: load all at once
export async function loadLocales() {
  loadState.value.loading = true;
  loadState.value.error = '';
  try {
    const allModules = [...ESSENTIAL_MODULES, ...OPTIONAL_MODULES];
    const results = await Promise.all(allModules.map(fetchModule));
    mergeResults(results);
  } catch (e) {
    loadState.value.error = e.message;
    console.error('[i18n] loadLocales failed:', e);
  } finally {
    loadState.value.loading = false;
  }
}

const message = computed(() => {
  // Access loadVersion to establish reactive dependency
  const v = loadVersion.value;
  const result = loadedMessages[locale.value] || loadedMessages['en'] || loadedMessages['zh-CN'];
  return result;
});

function t(key, params = {}) {
  const keys = key.split('.');
  let value = message.value;
  for (const k of keys) {
    value = value?.[k];
  }
  // Debug: log when translation is not found for firewall keys
  if (typeof value !== 'string' && key.startsWith('firewall.')) {
    console.warn('[i18n-debug] Translation not found:', key, '| message keys:', Object.keys(message.value || {}), '| firewall keys:', Object.keys(message.value?.firewall || {}));
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export function createI18n() {
  return {
    install(app) {
      app.config.globalProperties.$i18n = { locale, t, locales: LOCALES, localeNames, loadState };
      app.config.globalProperties.$t = t;
      app.provide('i18n', { locale, t, locales: LOCALES, localeNames, loadState });
    },
  };
}

export function useI18n() {
  return { locale, t, locales: LOCALES, localeNames, loadState };
}

export { locale, t, LOCALES, localeNames, loadState };
