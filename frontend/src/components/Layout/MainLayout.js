import { defineComponent, computed, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useConfigStore } from '/src/stores/config.js';
import TopMenu from '/src/components/Menu/TopMenu.js';
import CommitBar from '/src/components/Layout/CommitBar.js';
import ErrorDisplay from '/src/components/Layout/ErrorDisplay.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import { emitMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'MainLayout',
  setup() {
    const auth = useAuthStore();
    const config = useConfigStore();
    const route = useRoute();

    const breadcrumbs = computed(() => {
      const target = route.path;
      function findPath(items) {
        for (const item of items) {
          if (item.route && (target === item.route || target.startsWith(item.route + '/'))) {
            return [item.label];
          }
          if (item.children) {
            const childPath = findPath(item.children);
            if (childPath) return [item.label, ...childPath];
          }
        }
        return null;
      }
      return findPath(auth.menu) || [];
    });

    function refreshCurrentPage() {
      emitMenuRefresh(route.path);
    }

    const pageTitle = computed(() => auth.hostname || 'VyOS');
    watch(pageTitle, (val) => { document.title = val; }, { immediate: true });

    return { auth, config, breadcrumbs, refreshCurrentPage, pageTitle, route };
  },
  template: `
    <div class="main-layout">
      <header class="top-header">
        <div style="display:flex;align-items:center;flex:1;">
          <div class="logo">{{ pageTitle }}</div>
          <TopMenu />
        </div>
      </header>
      <CommitBar />
      <div class="breadcrumb">
        <div class="breadcrumb-path">
          <span v-for="(b, i) in breadcrumbs" :key="i" class="breadcrumb-item">
            <span v-if="i === breadcrumbs.length - 1" class="breadcrumb-last" @click="refreshCurrentPage" title="刷新">{{ b }}</span>
            <span v-else>{{ b }}</span>
            <span v-if="i < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
          </span>
        </div>
        <HelpButton v-if="breadcrumbs.length" :title="(breadcrumbs[breadcrumbs.length - 1] || '') + ' Help'" :routePath="route.path" />
      </div>
      <div class="content-area">
        <main class="main-content">
          <router-view />
        </main>
      </div>
      <ErrorDisplay />
    </div>
  `,
  components: { TopMenu, CommitBar, ErrorDisplay, HelpButton },
});
