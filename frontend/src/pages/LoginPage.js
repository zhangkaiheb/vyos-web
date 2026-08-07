import { defineComponent, ref } from '/src/utils/vue-import.js';
import { useRouter } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';

export default defineComponent({
  name: 'LoginPage',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const username = ref('vyos');
    const password = ref('');
    const error = ref('');

    async function submit() {
      error.value = '';
      try {
        await auth.login(username.value, password.value);
        router.replace('/');
      } catch (e) {
        error.value = e.message;
      }
    }

    return { username, password, error, submit, loading: auth.loading };
  },
  template: `
    <div class="login-page">
      <div class="login-box">
        <div class="login-title">VyOS</div>
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
          <button type="submit" class="primary" :disabled="loading">{{ $t('app.login') }}</button>
        </form>
      </div>
    </div>
  `,
});
