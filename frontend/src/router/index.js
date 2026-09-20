import { createRouter as createVueRouter, createWebHistory } from '/src/utils/vue-router-import.js';
import GenericTablePage from '/src/pages/GenericTablePage.js';
import GenericConfigPage from '/src/pages/GenericConfigPage.js';
import LoginPage from '/src/pages/LoginPage.js';
import ShellPage from '/src/pages/ShellPage.js';
import FeatureVisibilityPage from '/src/pages/FeatureVisibilityPage.js';

// Lazy-loaded page components (imported on demand via dynamic import)
const lazyPages = {
  RuleTablePage: () => import('/src/pages/RuleTablePage.js'),
  FirewallIpv4NameRulePage: () => import('/src/pages/FirewallIpv4NameRulePage.js'),
  FirewallIpv6NameRulePage: () => import('/src/pages/FirewallIpv6NameRulePage.js'),
  FirewallBridgeNameRulePage: () => import('/src/pages/FirewallBridgeNameRulePage.js'),
  EthernetPage: () => import('/src/pages/EthernetPage.js'),
  MonitorDashboard: () => import('/src/pages/MonitorDashboard.js'),
  MonitorWidget: () => import('/src/pages/MonitorWidget.js'),
  LogPage: () => import('/src/pages/LogPage.js'),
  UserPage: () => import('/src/pages/UserPage.js'),
  ProtocolPage: () => import('/src/pages/ProtocolPage.js'),
  FirewallGlobalOptionsPage: () => import('/src/pages/FirewallGlobalOptionsPage.js'),
  FirewallGroupPage: () => import('/src/pages/FirewallGroupPage.js'),
  FirewallZonePage: () => import('/src/pages/FirewallZonePage.js'),
  FirewallFlowtablePage: () => import('/src/pages/FirewallFlowtablePage.js'),
  SettingsPage: () => import('/src/pages/SettingsPage.js'),
  ToolPage: () => import('/src/pages/ToolPage.js'),
  ImportExportPage: () => import('/src/pages/ImportExportPage.js'),
  WebAppPage: () => import('/src/pages/WebAppPage.js'),
  IpsecPage: () => import('/src/pages/IpsecPage.js'),
  IpsecConnectionsPage: () => import('/src/pages/IpsecConnectionsPage.js'),
  IpsecSaPage: () => import('/src/pages/IpsecSaPage.js'),
  L2tpPage: () => import('/src/pages/L2tpPage.js'),
  PptpPage: () => import('/src/pages/PptpPage.js'),
  SstpPage: () => import('/src/pages/SstpPage.js'),
  DhcpServerPage: () => import('/src/pages/DhcpServerPage.js'),
  DhcpRelayPage: () => import('/src/pages/DhcpRelayPage.js'),
  PptpSessionsPage: () => import('/src/pages/PptpSessionsPage.js'),
  PptpStatisticsPage: () => import('/src/pages/PptpStatisticsPage.js'),
  DhcpLeasesPage: () => import('/src/pages/DhcpLeasesPage.js'),
  DhcpStaticMappingsPage: () => import('/src/pages/DhcpStaticMappingsPage.js'),
  DhcpStatisticsPage: () => import('/src/pages/DhcpStatisticsPage.js'),
  Dhcpv6ServerPage: () => import('/src/pages/Dhcpv6ServerPage.js'),
  Dhcpv6RelayPage: () => import('/src/pages/Dhcpv6RelayPage.js'),
  Dhcpv6LeasesPage: () => import('/src/pages/Dhcpv6LeasesPage.js'),
  Dhcpv6StaticMappingsPage: () => import('/src/pages/Dhcpv6StaticMappingsPage.js'),
  DnsPage: () => import('/src/pages/DnsPage.js'),
  DnsDynamicStatusPage: () => import('/src/pages/DnsDynamicStatusPage.js'),
  DnsForwardingStatisticsPage: () => import('/src/pages/DnsForwardingStatisticsPage.js'),
  NtpPage: () => import('/src/pages/NtpPage.js'),
  NetnsPage: () => import('/src/pages/NetnsPage.js'),
  VrfPage: () => import('/src/pages/VrfPage.js'),
  HighAvailabilityPage: () => import('/src/pages/HighAvailabilityPage.js'),
  SshPage: () => import('/src/pages/SshPage.js'),
  HttpsPage: () => import('/src/pages/HttpsPage.js'),
  LldpPage: () => import('/src/pages/LldpPage.js'),
  IdsDdosPage: () => import('/src/pages/IdsDdosPage.js'),
  SuricataPage: () => import('/src/pages/SuricataPage.js'),
  WebProxyPage: () => import('/src/pages/WebProxyPage.js'),
  SnmpPage: () => import('/src/pages/SnmpPage.js'),
  SshFingerprintsPage: () => import('/src/pages/SshFingerprintsPage.js'),
  ArpPage: () => import('/src/pages/ArpPage.js'),
  RoutePage: () => import('/src/pages/RoutePage.js'),
  ZebraPage: () => import('/src/pages/ZebraPage.js'),
  ActiveConnectionsPage: () => import('/src/pages/ActiveConnectionsPage.js'),
  MemoryCachePage: () => import('/src/pages/MemoryCachePage.js'),
  ProcessMonitorPage: () => import('/src/pages/ProcessMonitorPage.js'),
  InterfaceStatsPage: () => import('/src/pages/InterfaceStatsPage.js'),
  ControlPanelPage: () => import('/src/pages/ControlPanelPage.js'),
  ConfigSyncPage: () => import('/src/pages/ConfigSyncPage.js'),
  ConntrackSyncPage: () => import('/src/pages/ConntrackSyncPage.js'),
  StaticRoutePage: () => import('/src/pages/StaticRoutePage.js'),
  PolicyRoutePage: () => import('/src/pages/PolicyRoutePage.js'),
  LocalRoutePage: () => import('/src/pages/LocalRoutePage.js'),
  AccessListPage: () => import('/src/pages/AccessListPage.js'),
  AccessListv6Page: () => import('/src/pages/AccessListv6Page.js'),
  ConfigManagementPage: () => import('/src/pages/ConfigManagementPage.js'),
  ConfigManagementSettingsPage: () => import('/src/pages/ConfigManagementSettingsPage.js'),
  BgpPage: () => import('/src/pages/BgpPage.js'),
  OspfPage: () => import('/src/pages/OspfPage.js'),
  OspfV3Page: () => import('/src/pages/OspfV3Page.js'),
  IsisPage: () => import('/src/pages/IsisPage.js'),
  RipPage: () => import('/src/pages/RipPage.js'),
  RipNgPage: () => import('/src/pages/RipNgPage.js'),
  PimPage: () => import('/src/pages/PimPage.js'),
  Pim6Page: () => import('/src/pages/Pim6Page.js'),
  BabelPage: () => import('/src/pages/BabelPage.js'),
  BfdPage: () => import('/src/pages/BfdPage.js'),
  FailoverPage: () => import('/src/pages/FailoverPage.js'),
  IgmpProxyPage: () => import('/src/pages/IgmpProxyPage.js'),
  MplsPage: () => import('/src/pages/MplsPage.js'),
  NhrpPage: () => import('/src/pages/NhrpPage.js'),
  RpkiPage: () => import('/src/pages/RpkiPage.js'),
  SegmentRoutingPage: () => import('/src/pages/SegmentRoutingPage.js'),
  AsPathListPage: () => import('/src/pages/AsPathListPage.js'),
  CommunityListPage: () => import('/src/pages/CommunityListPage.js'),
  ExtcommunityListPage: () => import('/src/pages/ExtcommunityListPage.js'),
  LargeCommunityListPage: () => import('/src/pages/LargeCommunityListPage.js'),
  PrefixListPage: () => import('/src/pages/PrefixListPage.js'),
  PrefixList6Page: () => import('/src/pages/PrefixList6Page.js'),
  RouteMapPage: () => import('/src/pages/RouteMapPage.js'),
  PkiPage: () => import('/src/pages/PkiPage.js'),
  PkiToolPage: () => import('/src/pages/PkiToolPage.js'),
  ConntrackPage: () => import('/src/pages/ConntrackPage.js'),
  SourceNatPage: () => import('/src/pages/SourceNatPage.js'),
  DestinationNatPage: () => import('/src/pages/DestinationNatPage.js'),
  StaticNatPage: () => import('/src/pages/StaticNatPage.js'),
  CgnatPage: () => import('/src/pages/CgnatPage.js'),
  Nat64SourcePage: () => import('/src/pages/Nat64SourcePage.js'),
  Nat66DestinationPage: () => import('/src/pages/Nat66DestinationPage.js'),
  Nat66SourcePage: () => import('/src/pages/Nat66SourcePage.js'),
  FirewallIpv6Page: () => import('/src/pages/FirewallIpv6Page.js'),
  FirewallIpv6OptionsPage: () => import('/src/pages/FirewallIpv6OptionsPage.js'),
  FirewallIpv4OptionsPage: () => import('/src/pages/FirewallIpv4OptionsPage.js'),
  FirewallBridgeOptionsPage: () => import('/src/pages/FirewallBridgeOptionsPage.js'),
  QosInterfacePage: () => import('/src/pages/QosInterfacePage.js'),
  QosPolicyPage: () => import('/src/pages/QosPolicyPage.js'),
  QosTrafficMatchGroupPage: () => import('/src/pages/QosTrafficMatchGroupPage.js'),
  TunnelPage: () => import('/src/pages/TunnelPage.js'),
  DummyPage: () => import('/src/pages/DummyPage.js'),
  OpenVpnPage: () => import('/src/pages/OpenVpnPage.js'),
  BondingPage: () => import('/src/pages/BondingPage.js'),
  BridgePage: () => import('/src/pages/BridgePage.js'),
  PPPoEPage: () => import('/src/pages/PPPoEPage.js'),
  WireGuardPage: () => import('/src/pages/WireGuardPage.js'),
  VxlanPage: () => import('/src/pages/VxlanPage.js'),
  LoopbackPage: () => import('/src/pages/LoopbackPage.js'),
  GenevePage: () => import('/src/pages/GenevePage.js'),
  L2tpv3Page: () => import('/src/pages/L2tpv3Page.js'),
  VirtualEthernetPage: () => import('/src/pages/VirtualEthernetPage.js'),
  VtiPage: () => import('/src/pages/VtiPage.js'),
  MacSecPage: () => import('/src/pages/MacSecPage.js'),
  PseudoEthernetPage: () => import('/src/pages/PseudoEthernetPage.js'),
  InputPage: () => import('/src/pages/InputPage.js'),
  WanPage: () => import('/src/pages/WanPage.js'),
  HaproxyPage: () => import('/src/pages/HaproxyPage.js'),
  OpenConnectPage: () => import('/src/pages/OpenConnectPage.js'),
  VppAclPage: () => import('/src/pages/VppAclPage.js'),
  VppInterfacesPage: () => import('/src/pages/VppInterfacesPage.js'),
  VppIpfixPage: () => import('/src/pages/VppIpfixPage.js'),
  VppKernelInterfacesPage: () => import('/src/pages/VppKernelInterfacesPage.js'),
  VppNatPage: () => import('/src/pages/VppNatPage.js'),
  VppNat44Page: () => import('/src/pages/VppNat44Page.js'),
  VppSettingsPage: () => import('/src/pages/VppSettingsPage.js'),
  VppSflowPage: () => import('/src/pages/VppSflowPage.js'),
  ContainerNamePage: () => import('/src/pages/ContainerNamePage.js'),
  ContainerNetworkPage: () => import('/src/pages/ContainerNetworkPage.js'),
  ContainerRegistryPage: () => import('/src/pages/ContainerRegistryPage.js'),
  SystemLoginPage: () => import('/src/pages/SystemLoginPage.js'),
  HostNamePage: () => import('/src/pages/HostNamePage.js'),
  SyslogPage: () => import('/src/pages/SyslogPage.js'),
  TaskSchedulerPage: () => import('/src/pages/TaskSchedulerPage.js'),
  SystemIpPage: () => import('/src/pages/SystemIpPage.js'),
  SystemIpv6Page: () => import('/src/pages/SystemIpv6Page.js'),
  DnsServerPage: () => import('/src/pages/DnsServerPage.js'),
};

// Component map: static components + lazy-loaded pages
const componentMap = {
  TablePage: GenericTablePage,
  ConfigPage: GenericConfigPage,
  LoginPage,
  ShellPage,
  FeatureVisibilityPage,
};

function getComponent(componentName) {
  // First check static components
  if (componentMap[componentName]) return componentMap[componentName];
  // Then check lazy-loaded pages
  if (lazyPages[componentName]) return lazyPages[componentName];
  // Fallback
  return GenericConfigPage;
}

function buildRoutes(menu, parentPath = '') {
  const routes = [];
  for (const item of menu) {
    if (item.route) {
      const comp = getComponent(item.component);
      routes.push({
        path: item.route,
        name: item.route,
        component: comp,
        meta: { menuItem: item },
      });
    }
    if (item.children) {
      routes.push(...buildRoutes(item.children, parentPath));
    }
  }
  return routes;
}

// Catch-all placeholder for hard refresh before menu loads
const CatchAllPlaceholder = {
  template: '<div></div>',
};

// Initial static routes; menu-based routes added after menu loaded
const staticRoutes = [
  { path: '/', redirect: '/monitor/dashboard' },
  { path: '/shell', name: '/shell', component: ShellPage, meta: { menuItem: { label: 'Web Shell', label_en: 'Web Shell' } } },
  { path: '/system/feature-visibility', name: '/system/feature-visibility', component: FeatureVisibilityPage, meta: { menuItem: { label: '功能可见性', label_en: 'Feature Visibility', route: '/system/feature-visibility' } } },
  { path: '/:pathMatch(.*)*', name: 'catch-all', component: CatchAllPlaceholder },
];

let router = null;

export function createRouter(menu = []) {
  const routes = [...staticRoutes, ...buildRoutes(menu)];
  router = createVueRouter({
    history: createWebHistory(),
    routes,
  });
  return router;
}

export function updateRouterMenu(menu) {
  if (!router) return;
  const newRoutes = buildRoutes(menu);
  const newRouteNames = new Set(newRoutes.map(r => r.name));

  let changed = false;

  // Remove catch-all placeholder once menu routes are loaded
  if (router.hasRoute('catch-all') && newRouteNames.size > 0) {
    router.removeRoute('catch-all');
    changed = true;
  }

  // Only remove routes that are no longer in the menu
  const currentRoutes = router.getRoutes();
  for (const r of currentRoutes) {
    if (r.meta?.menuItem && r.name !== '/' && !newRouteNames.has(r.name)) {
      router.removeRoute(r.name);
      changed = true;
    }
  }

  // Only add routes that don't exist yet
  for (const r of newRoutes) {
    if (!router.hasRoute(r.name)) {
      router.addRoute(r);
      changed = true;
    }
  }

  // After routes change, check if current path can now be resolved
  if (changed) {
    const currentPath = router.currentRoute.value.fullPath;
    const resolved = router.resolve(currentPath);
    if (resolved.matched && resolved.matched.length > 0) {
      router.replace(currentPath).catch(() => {});
    }
  }
}

export { router };
