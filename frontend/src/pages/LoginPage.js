import { defineComponent, ref } from '/src/utils/vue-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { locale, localeNames, LOCALES } from '/src/i18n/index.js';

export default defineComponent({
  name: 'LoginPage',
  setup() {
    const auth = useAuthStore();
    const username = ref('vyos');
    const password = ref('');
    const error = ref('');
    const lang = ref(locale.value);

    function changeLanguage() {
      locale.value = lang.value;
      localStorage.setItem('locale', lang.value);
    }

    async function submit() {
      error.value = '';
      try {
        await auth.login(username.value, password.value);
      } catch (e) {
        error.value = e.message;
      }
    }

    return { username, password, error, submit, loading: auth.loading, lang, localeNames, LOCALES, changeLanguage };
  },
  template: `
    <div class="login-page">
      <div class="login-box">
        <div class="login-title">VyOS Web Config</div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <form class="login-form" @submit.prevent="submit">
          <div class="form-row">
            <label class="form-label">{{ $t('login.username') }}</label>
            <input v-model="username" required />
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('login.password') }}</label>
            <input type="password" v-model="password" required />
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('login.language') }}</label>
            <select v-model="lang" @change="changeLanguage">
              <option v-for="l in LOCALES" :key="l" :value="l">{{ localeNames[l] }}</option>
            </select>
          </div>
          <button type="submit" class="primary" :disabled="loading">{{ $t('app.login') }}</button>
        </form>
      </div>
    </div>
  `,
});
