import { createApp } from '/src/utils/vue-import.js';
import { createI18n, loadLocales } from '/src/i18n/index.js';
import { createRouter, updateRouterMenu } from '/src/router/index.js';
import { createPinia } from '/src/stores/pinia.js';
import App from '/src/App.js';
import { useAuthStore } from '/src/stores/auth.js';

async function bootstrap() {
  await loadLocales();
  const app = createApp(App);
  app.use(createPinia());

  const auth = useAuthStore();
  const router = createRouter(auth.menu);
  app.use(router);
  app.use(createI18n());
  app.mount('#app');

  // Add routes when menu loaded
  auth.loadMenu().then(() => updateRouterMenu(auth.menu));
}

bootstrap();
