import { ref } from '/src/utils/vue-import.js';
import { defineStore } from '/src/stores/pinia.js';
import { configApi } from '/src/api/index.js';

export const useConfigStore = defineStore('config', () => {
  const sessionChanged = ref(false);
  const commands = ref([]);

  async function getConfig(path, session = false) {
    return configApi.get(path, session);
  }

  async function setConfig(path, value) {
    return configApi.set(path, value);
  }

  async function deleteConfig(path) {
    return configApi.delete(path);
  }

  async function commit() {
    const res = await configApi.commit();
    await checkSessionChanged();
    return res;
  }

  async function discard() {
    const res = await configApi.discard();
    await checkSessionChanged();
    return res;
  }

  async function checkSessionChanged() {
    try {
      const res = await configApi.sessionChanged();
      sessionChanged.value = res.changed;
    } catch (e) {
      sessionChanged.value = false;
    }
  }

  async function loadCommands(path) {
    try {
      const res = await configApi.commands(path);
      commands.value = res.commands || [];
    } catch (e) {
      commands.value = [];
    }
  }

  return {
    sessionChanged, commands,
    getConfig, setConfig, deleteConfig,
    commit, discard, checkSessionChanged, loadCommands,
  };
});
