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
import SettingsPage from '/src/pages/SettingsPage.js';
import ToolPage from '/src/pages/ToolPage.js';
import ImportExportPage from '/src/pages/ImportExportPage.js';
import WebAppPage from '/src/pages/WebAppPage.js';
import ShellPage from '/src/pages/ShellPage.js';

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
  SettingsPage,
  ToolPage,
  ImportExportPage,
  WebAppPage,
  ShellPage,
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
