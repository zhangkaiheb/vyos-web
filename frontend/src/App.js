import { defineComponent, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { updateRouterMenu } from '/src/router/index.js';
import LoginPage from '/src/pages/LoginPage.js';
import MainLayout from '/src/components/Layout/MainLayout.js';

export default defineComponent({
  name: 'App',
  setup() {
    const auth = useAuthStore();
    const isLoggedIn = computed(() => auth.isLoggedIn);

    onMounted(() => {
      const token = localStorage.getItem('vyos_token');
      if (token && !auth.user) {
        auth.fetchUser();
      }
    });

    watch(() => auth.menu, (menu) => {
      if (menu && menu.length) updateRouterMenu(menu);
    }, { immediate: true });

    return { isLoggedIn };
  },
  template: `
    <LoginPage v-if="!isLoggedIn" />
    <MainLayout v-else />
  `,
  components: { LoginPage, MainLayout },
});
