import { reactive } from '/src/utils/vue-import.js';

const stores = new Map();

export function defineStore(id, setup) {
  return function useStore() {
    if (!stores.has(id)) {
      const state = reactive(setup());
      stores.set(id, state);
    }
    return stores.get(id);
  };
}

export function createPinia() {
  return {
    install(app) {
      app.config.globalProperties.$pinia = stores;
    },
  };
}
