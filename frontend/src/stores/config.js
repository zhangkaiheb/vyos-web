import { ref } from '/src/utils/vue-import.js';
import { defineStore } from '/src/stores/pinia.js';
import { configApi } from '/src/api/index.js';

export const useConfigStore = defineStore('config', () => {
  const sessionChanged = ref(false);
  const pendingChanges = ref(false);
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

  function markPending() {
    pendingChanges.value = true;
  }

  function clearPending() {
    pendingChanges.value = false;
  }

  async function commit() {
    const res = await configApi.commit();
    pendingChanges.value = false;
    return res;
  }

  async function discard() {
    const res = await configApi.discard();
    pendingChanges.value = false;
    return res;
  }

  async function save() {
    const res = await configApi.save();
    pendingChanges.value = false;
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
    sessionChanged, pendingChanges, commands,
    getConfig, setConfig, deleteConfig,
    markPending, clearPending,
    commit, discard, save, checkSessionChanged, loadCommands,
  };
});
