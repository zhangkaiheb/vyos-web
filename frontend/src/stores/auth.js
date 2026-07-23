import { ref, computed } from '/src/utils/vue-import.js';
import { defineStore } from '/src/stores/pinia.js';
import { authApi, menuApi } from '/src/api/index.js';
import { locale } from '/src/i18n/index.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('vyos_token') || '');
  const user = ref(null);
  const menu = ref([]);
  const loading = ref(false);

  const isLoggedIn = computed(() => !!token.value && !!user.value);

  async function login(username, password) {
    loading.value = true;
    try {
      const res = await authApi.login(username, password);
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem('vyos_token', res.token);
      if (res.user.language) {
        locale.value = res.user.language;
        localStorage.setItem('locale', res.user.language);
      }
      await loadMenu();
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try { await authApi.logout(); } catch (e) {}
    token.value = '';
    user.value = null;
    menu.value = [];
    localStorage.removeItem('vyos_token');
  }

  async function fetchUser() {
    try {
      const res = await authApi.user();
      user.value = res.user;
      if (res.user.language) {
        locale.value = res.user.language;
        localStorage.setItem('locale', res.user.language);
      }
      await loadMenu();
    } catch (e) {
      logout();
    }
  }

  async function loadMenu() {
    try {
      const res = await menuApi.get();
      menu.value = res.menu;
    } catch (e) {
      menu.value = [];
    }
  }

  return { token, user, menu, loading, isLoggedIn, login, logout, fetchUser, loadMenu };
});
