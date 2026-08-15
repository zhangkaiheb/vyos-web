import { createRouter as createVueRouter, createWebHistory } from '/src/utils/vue-router-import.js';
import GenericTablePage from '/src/pages/GenericTablePage.js';
import GenericConfigPage from '/src/pages/GenericConfigPage.js';
import RuleTablePage from '/src/pages/RuleTablePage.js';
import EthernetPage from '/src/pages/EthernetPage.js';
import MonitorDashboard from '/src/pages/MonitorDashboard.js';
import MonitorWidget from '/src/pages/MonitorWidget.js';
import LogPage from '/src/pages/LogPage.js';
import UserPage from '/src/pages/UserPage.js';
import ProtocolPage from '/src/pages/ProtocolPage.js';
import FirewallGlobalOptionsPage from '/src/pages/FirewallGlobalOptionsPage.js';
import FirewallGroupPage from '/src/pages/FirewallGroupPage.js';
import FirewallZonePage from '/src/pages/FirewallZonePage.js';
import FirewallFlowtablePage from '/src/pages/FirewallFlowtablePage.js';
import SettingsPage from '/src/pages/SettingsPage.js';
import ToolPage from '/src/pages/ToolPage.js';
import ImportExportPage from '/src/pages/ImportExportPage.js';
import WebAppPage from '/src/pages/WebAppPage.js';
import ShellPage from '/src/pages/ShellPage.js';
import IpsecPage from '/src/pages/IpsecPage.js';
import IpsecConnectionsPage from '/src/pages/IpsecConnectionsPage.js';
import IpsecSaPage from '/src/pages/IpsecSaPage.js';
import L2tpPage from '/src/pages/L2tpPage.js';
import PptpPage from '/src/pages/PptpPage.js';
import SstpPage from '/src/pages/SstpPage.js';
import DhcpServerPage from '/src/pages/DhcpServerPage.js';
import DhcpRelayPage from '/src/pages/DhcpRelayPage.js';
import PptpSessionsPage from '/src/pages/PptpSessionsPage.js';
import PptpStatisticsPage from '/src/pages/PptpStatisticsPage.js';
import DhcpLeasesPage from '/src/pages/DhcpLeasesPage.js';
import DhcpStaticMappingsPage from '/src/pages/DhcpStaticMappingsPage.js';
import DhcpStatisticsPage from '/src/pages/DhcpStatisticsPage.js';
import Dhcpv6ServerPage from '/src/pages/Dhcpv6ServerPage.js';
import Dhcpv6RelayPage from '/src/pages/Dhcpv6RelayPage.js';
import Dhcpv6LeasesPage from '/src/pages/Dhcpv6LeasesPage.js';
import Dhcpv6StaticMappingsPage from '/src/pages/Dhcpv6StaticMappingsPage.js';
import DnsPage from '/src/pages/DnsPage.js';
import DnsDynamicStatusPage from '/src/pages/DnsDynamicStatusPage.js';
import DnsForwardingStatisticsPage from '/src/pages/DnsForwardingStatisticsPage.js';
import NtpPage from '/src/pages/NtpPage.js';
import NetnsPage from '/src/pages/NetnsPage.js';
import VrfPage from '/src/pages/VrfPage.js';
import HighAvailabilityPage from '/src/pages/HighAvailabilityPage.js';
import SshPage from '/src/pages/SshPage.js';
import HttpsPage from '/src/pages/HttpsPage.js';
import LldpPage from '/src/pages/LldpPage.js';
import IdsDdosPage from '/src/pages/IdsDdosPage.js';
import SuricataPage from '/src/pages/SuricataPage.js';
import WebProxyPage from '/src/pages/WebProxyPage.js';
import SnmpPage from '/src/pages/SnmpPage.js';
import SshFingerprintsPage from '/src/pages/SshFingerprintsPage.js';
import ArpPage from '/src/pages/ArpPage.js';
import RoutePage from '/src/pages/RoutePage.js';
import ZebraPage from '/src/pages/ZebraPage.js';
import ActiveConnectionsPage from '/src/pages/ActiveConnectionsPage.js';
import MemoryCachePage from '/src/pages/MemoryCachePage.js';
import ProcessMonitorPage from '/src/pages/ProcessMonitorPage.js';
import InterfaceStatsPage from '/src/pages/InterfaceStatsPage.js';
import ControlPanelPage from '/src/pages/ControlPanelPage.js';
import ConfigSyncPage from '/src/pages/ConfigSyncPage.js';
import ConntrackSyncPage from '/src/pages/ConntrackSyncPage.js';
import StaticRoutePage from '/src/pages/StaticRoutePage.js';
import PolicyRoutePage from '/src/pages/PolicyRoutePage.js';
import LocalRoutePage from '/src/pages/LocalRoutePage.js';
import AccessListPage from '/src/pages/AccessListPage.js';
import AccessListv6Page from '/src/pages/AccessListv6Page.js';
import ConfigManagementPage from '/src/pages/ConfigManagementPage.js';
import ConfigManagementSettingsPage from '/src/pages/ConfigManagementSettingsPage.js';
import BgpPage from '/src/pages/BgpPage.js';
import OspfPage from '/src/pages/OspfPage.js';
import OspfV3Page from '/src/pages/OspfV3Page.js';
import IsisPage from '/src/pages/IsisPage.js';
import RipPage from '/src/pages/RipPage.js';
import RipNgPage from '/src/pages/RipNgPage.js';
import PimPage from '/src/pages/PimPage.js';
import Pim6Page from '/src/pages/Pim6Page.js';
import BabelPage from '/src/pages/BabelPage.js';
import BfdPage from '/src/pages/BfdPage.js';
import FailoverPage from '/src/pages/FailoverPage.js';
import IgmpProxyPage from '/src/pages/IgmpProxyPage.js';
import MplsPage from '/src/pages/MplsPage.js';
import NhrpPage from '/src/pages/NhrpPage.js';
import RpkiPage from '/src/pages/RpkiPage.js';
import SegmentRoutingPage from '/src/pages/SegmentRoutingPage.js';
import AsPathListPage from '/src/pages/AsPathListPage.js';
import CommunityListPage from '/src/pages/CommunityListPage.js';
import ExtcommunityListPage from '/src/pages/ExtcommunityListPage.js';
import LargeCommunityListPage from '/src/pages/LargeCommunityListPage.js';
import PrefixListPage from '/src/pages/PrefixListPage.js';
import PrefixList6Page from '/src/pages/PrefixList6Page.js';
import RouteMapPage from '/src/pages/RouteMapPage.js';
import PkiPage from '/src/pages/PkiPage.js';
import ConntrackPage from '/src/pages/ConntrackPage.js';
import SourceNatPage from '/src/pages/SourceNatPage.js';
import DestinationNatPage from '/src/pages/DestinationNatPage.js';
import StaticNatPage from '/src/pages/StaticNatPage.js';
import CgnatPage from '/src/pages/CgnatPage.js';
import Nat64SourcePage from '/src/pages/Nat64SourcePage.js';
import Nat66DestinationPage from '/src/pages/Nat66DestinationPage.js';
import Nat66SourcePage from '/src/pages/Nat66SourcePage.js';
import FirewallIpv6Page from '/src/pages/FirewallIpv6Page.js';
import QosInterfacePage from '/src/pages/QosInterfacePage.js';
import QosPolicyPage from '/src/pages/QosPolicyPage.js';
import QosTrafficMatchGroupPage from '/src/pages/QosTrafficMatchGroupPage.js';
import TunnelPage from '/src/pages/TunnelPage.js';
import OpenVpnPage from '/src/pages/OpenVpnPage.js';
import BondingPage from '/src/pages/BondingPage.js';
import BridgePage from '/src/pages/BridgePage.js';
import PPPoEPage from '/src/pages/PPPoEPage.js';
import WireGuardPage from '/src/pages/WireGuardPage.js';
import VxlanPage from '/src/pages/VxlanPage.js';
import LoopbackPage from '/src/pages/LoopbackPage.js';
import GenevePage from '/src/pages/GenevePage.js';
import L2tpv3Page from '/src/pages/L2tpv3Page.js';
import VirtualEthernetPage from '/src/pages/VirtualEthernetPage.js';
import VtiPage from '/src/pages/VtiPage.js';
import MacSecPage from '/src/pages/MacSecPage.js';
import PseudoEthernetPage from '/src/pages/PseudoEthernetPage.js';
import InputPage from '/src/pages/InputPage.js';
import WanPage from '/src/pages/WanPage.js';
import HaproxyPage from '/src/pages/HaproxyPage.js';
import OpenConnectPage from '/src/pages/OpenConnectPage.js';
import VppAclPage from '/src/pages/VppAclPage.js';
import VppInterfacesPage from '/src/pages/VppInterfacesPage.js';
import VppIpfixPage from '/src/pages/VppIpfixPage.js';
import VppKernelInterfacesPage from '/src/pages/VppKernelInterfacesPage.js';
import VppNatPage from '/src/pages/VppNatPage.js';
import VppNat44Page from '/src/pages/VppNat44Page.js';
import VppSettingsPage from '/src/pages/VppSettingsPage.js';
import VppSflowPage from '/src/pages/VppSflowPage.js';
import ContainerNamePage from '/src/pages/ContainerNamePage.js';
import ContainerNetworkPage from '/src/pages/ContainerNetworkPage.js';
import ContainerRegistryPage from '/src/pages/ContainerRegistryPage.js';
import SystemLoginPage from '/src/pages/SystemLoginPage.js';
import HostNamePage from '/src/pages/HostNamePage.js';
import SyslogPage from '/src/pages/SyslogPage.js';
import TaskSchedulerPage from '/src/pages/TaskSchedulerPage.js';
import SystemIpPage from '/src/pages/SystemIpPage.js';
import SystemIpv6Page from '/src/pages/SystemIpv6Page.js';
import DnsServerPage from '/src/pages/DnsServerPage.js';
import FeatureVisibilityPage from '/src/pages/FeatureVisibilityPage.js';

const componentMap = {
  TablePage: GenericTablePage,
  ConfigPage: GenericConfigPage,
  RuleTablePage,
  EthernetPage,
  MonitorDashboard,
  MonitorWidget,
  LogPage,
  UserPage,
  ProtocolPage,
  FirewallGlobalOptionsPage,
  FirewallGroupPage,
  FirewallZonePage,
  FirewallFlowtablePage,
  SstpPage,
  SettingsPage,
  ToolPage,
  ImportExportPage,
  WebAppPage,
  ShellPage,
  IpsecPage,
  IpsecConnectionsPage,
  IpsecSaPage,
  L2tpPage,
  PptpPage,
  DhcpServerPage,
  DhcpRelayPage,
  PptpSessionsPage,
  PptpStatisticsPage,
  DhcpLeasesPage,
  DhcpStaticMappingsPage,
  DhcpStatisticsPage,
  Dhcpv6ServerPage,
  Dhcpv6RelayPage,
  Dhcpv6LeasesPage,
  Dhcpv6StaticMappingsPage,
  DnsPage,
  DnsDynamicStatusPage,
  DnsForwardingStatisticsPage,
  NtpPage,
  NetnsPage,
  VrfPage,
  HighAvailabilityPage,
  SshPage,
  HttpsPage,
  LldpPage,
  IdsDdosPage,
  SuricataPage,
  WebProxyPage,
  SnmpPage,
  SshFingerprintsPage,
  ArpPage,
  RoutePage,
  ZebraPage,
  ActiveConnectionsPage,
  MemoryCachePage,
  ProcessMonitorPage,
  InterfaceStatsPage,
  ControlPanelPage,
  ConfigSyncPage,
  ConntrackSyncPage,
  StaticRoutePage,
  PolicyRoutePage,
  LocalRoutePage,
  AccessListPage,
  AccessListv6Page,
  ConfigManagementPage,
  ConfigManagementSettingsPage,
  BgpPage,
  OspfPage,
  OspfV3Page,
  IsisPage,
  RipPage,
  RipNgPage,
  PimPage,
  Pim6Page,
  BabelPage,
  BfdPage,
  FailoverPage,
  IgmpProxyPage,
  MplsPage,
  NhrpPage,
  RpkiPage,
  SegmentRoutingPage,
  AsPathListPage,
  CommunityListPage,
  ExtcommunityListPage,
  LargeCommunityListPage,
  PrefixListPage,
  PrefixList6Page,
  RouteMapPage,
  PkiPage,
  ConntrackPage,
  SourceNatPage,
  DestinationNatPage,
  StaticNatPage,
  CgnatPage,
  Nat64SourcePage,
  Nat66DestinationPage,
  Nat66SourcePage,
  FirewallIpv6Page,
  QosInterfacePage,
  QosPolicyPage,
  QosTrafficMatchGroupPage,
  TunnelPage,
  OpenVpnPage,
  BondingPage,
  BridgePage,
  PPPoEPage,
  WireGuardPage,
  VxlanPage,
  LoopbackPage,
  GenevePage,
  L2tpv3Page,
  VirtualEthernetPage,
  VtiPage,
  MacSecPage,
  PseudoEthernetPage,
  InputPage,
  WanPage,
  HaproxyPage,
  OpenConnectPage,
  VppAclPage,
  VppInterfacesPage,
  VppIpfixPage,
  VppKernelInterfacesPage,
  VppNatPage,
  VppNat44Page,
  VppSettingsPage,
  VppSflowPage,
  ContainerNamePage,
  ContainerNetworkPage,
  ContainerRegistryPage,
  SystemLoginPage,
  HostNamePage,
  SyslogPage,
  TaskSchedulerPage,
  SystemIpPage,
  SystemIpv6Page,
  DnsServerPage,
  FeatureVisibilityPage,
};

function buildRoutes(menu, parentPath = '') {
  const routes = [];
  for (const item of menu) {
    if (item.route) {
      const comp = componentMap[item.component] || GenericConfigPage;
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
