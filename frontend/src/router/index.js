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

// Initial static routes; menu-based routes added after menu loaded
const staticRoutes = [
  { path: '/', redirect: '/monitor/dashboard' },
  { path: '/shell', name: '/shell', component: ShellPage, meta: { menuItem: { label: 'Web Shell', label_en: 'Web Shell' } } },
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
  let added = false;
  for (const r of newRoutes) {
    if (!router.hasRoute(r.name)) {
      router.addRoute(r);
      added = true;
    }
  }
  if (added) {
    // Re-resolve current location so dynamically added routes match immediately
    router.replace(router.currentRoute.value.fullPath).catch(() => {});
  }
}

export { router };
