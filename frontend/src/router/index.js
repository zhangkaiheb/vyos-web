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
