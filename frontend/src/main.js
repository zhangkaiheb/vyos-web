import { createApp } from '/src/utils/vue-import.js';
import { createI18n, loadLocales } from '/src/i18n/index.js';
import { createRouter, updateRouterMenu } from '/src/router/index.js';
import { createPinia } from '/src/stores/pinia.js';
import App from '/src/App.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useVisibilityStore } from '/src/stores/visibility.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

async function bootstrap() {
  await loadLocales();
  const app = createApp(App);
  app.component('ToolbarButton', ToolbarButton);
  app.use(createPinia());

  const auth = useAuthStore();
  const visibility = useVisibilityStore();
  const router = createRouter(auth.menu);
  app.use(router);
  app.use(createI18n());
  app.mount('#app');

  // Load feature visibility and menu
  Promise.all([
    visibility.load(),
    auth.loadMenu(),
  ]).then(() => {
    updateRouterMenu(auth.menu);
  });
}

bootstrap();
