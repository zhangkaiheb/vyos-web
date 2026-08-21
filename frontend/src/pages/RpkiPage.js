import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

function toArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function isPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('rpki.validation.ipv4');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('rpki.validation.ipv4');
  return '';
}

function validateInterval(value, min, max, nameKey, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return t('rpki.validation.interval', { name: t(nameKey), min, max });
  return '';
}

function configToForm(data = {}) {
  const caches = [];
  const cacheData = data.cache || {};
  for (const [addr, attrs] of Object.entries(cacheData)) {
    caches.push({
      address: addr,
      port: attrs.port || '',
      'preference': attrs.preference || '',
    });
  }

  return {
    caches,
    'expire-interval': data['expire-interval'] || '',
    'polling-period': data['polling-period'] || '',
    'retry-interval': data['retry-interval'] || '',
  };
}

function configToConfig(form) {
  const result = {};

  if (form.caches?.length) {
    result.cache = {};
    for (const cache of form.caches) {
      if (!cache.address) continue;
      const attrs = {};
      if (isPresent(cache.port)) attrs.port = String(cache.port);
      if (isPresent(cache.preference)) attrs.preference = String(cache.preference);
      result.cache[cache.address] = attrs;
    }
  }

  if (isPresent(form['expire-interval'])) result['expire-interval'] = String(form['expire-interval']);
  if (isPresent(form['polling-period'])) result['polling-period'] = String(form['polling-period']);
  if (isPresent(form['retry-interval'])) result['retry-interval'] = String(form['retry-interval']);

  return result;
}

export default defineComponent({
  name: 'RpkiPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

    const cacheModalVisible = ref(false);
    const editingCacheIndex = ref(-1);
    const cacheForm = ref({ address: '', port: '', preference: '' });

    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);

    const cacheColumns = computed(() => [
      { key: 'address', title: t('rpki.columns.address') },
      { key: 'port', title: t('rpki.columns.port') },
      { key: 'preference', title: t('rpki.columns.preference') },
    ]);

    const tabs = computed(() => [
      { key: 'basic', title: t('rpki.tabs.basic') },
      { key: 'cache', title: t('rpki.tabs.cache') },
    ]);

    const cacheModalTitle = computed(() => editingCacheIndex.value >= 0 ? t('rpki.modals.editCache') : t('rpki.modals.addCache'));

    const commandPath = computed(() => {
      if (activeTab.value === 'cache') return 'protocols rpki cache';
      return 'protocols rpki';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'rpki']);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (config.value['expire-interval']) {
        const err = validateInterval(config.value['expire-interval'], 1, 7200, 'rpki.labels.expireInterval', t);
        if (err) return showError({ message: err });
      }
      if (config.value['polling-period']) {
        const err = validateInterval(config.value['polling-period'], 1, 3600, 'rpki.labels.pollingPeriod', t);
        if (err) return showError({ message: err });
      }
      if (config.value['retry-interval']) {
        const err = validateInterval(config.value['retry-interval'], 1, 3600, 'rpki.labels.retryInterval', t);
        if (err) return showError({ message: err });
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols rpki', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        cacheModalVisible.value = false;
        await configStore.checkSessionChanged(); await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openCacheModal(index = -1) {
      editingCacheIndex.value = index;
      if (index >= 0) {
        cacheForm.value = JSON.parse(JSON.stringify(config.value.caches[index]));
      } else {
        cacheForm.value = { address: '', port: '', preference: '' };
      }
      cacheModalVisible.value = true;
    }

    function saveCache() {
      if (!cacheForm.value.address) return showError({ message: t('rpki.errors.addressRequired') });
      const err = validateIPv4(cacheForm.value.address, t);
      if (err) return showError({ message: err });
      if (editingCacheIndex.value >= 0) {
        config.value.caches.splice(editingCacheIndex.value, 1, JSON.parse(JSON.stringify(cacheForm.value)));
      } else {
        config.value.caches.push(JSON.parse(JSON.stringify(cacheForm.value)));
      }
      cacheModalVisible.value = false;
    }

    function deleteCache(index) {
      pendingDeleteNames.value = [config.value.caches[index].address];
      deleteModalVisible.value = true;
    }

    function confirmDeleteCache() {
      const index = config.value.caches.findIndex(c => c.address === pendingDeleteNames.value[0]);
      if (index >= 0) {
        config.value.caches.splice(index, 1);
      }
      deleteModalVisible.value = false;
      pendingDeleteNames.value = [];
    }

    onMounted(() => {
      load();
      window.addEventListener('config-committed', load);
      onMenuRefresh(load);
    });

    return {
      t, loading, saving, saved, config, activeTab, writeDisabled,
      cacheModalVisible, editingCacheIndex, cacheForm,
      deleteModalVisible, pendingDeleteNames,
      cacheColumns, tabs, cacheModalTitle, commandPath,
      openCacheModal, deleteCache, confirmDeleteCache,
      saveCache, save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('rpki.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="tabs">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('rpki.sections.parameters') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('rpki.labels.expireInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['expire-interval']" min="1" max="7200" :placeholder="t('rpki.placeholders.expireInterval')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('rpki.labels.pollingPeriod') }}</label>
                  <input type="number" class="form-control" v-model="config['polling-period']" min="1" max="3600" :placeholder="t('rpki.placeholders.pollingPeriod')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('rpki.labels.retryInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['retry-interval']" min="1" max="3600" :placeholder="t('rpki.placeholders.retryInterval')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #cache>
          <DataTable :columns="cacheColumns" :data="config.caches" :loading="loading" :disabled="writeDisabled"
                     rowKey="address" :actions="['create', 'edit', 'delete']"
                     @create="openCacheModal(-1)" @edit="openCacheModal" @delete="deleteCache" />
        </template>
      </TabGroup>

      <!-- Cache Modal -->
      <DraggableModal v-model:visible="cacheModalVisible" :title="cacheModalTitle" width="500px" @confirm="saveCache">
        <div class="form-row">
          <label class="form-label">{{ t('rpki.labels.addressRequired') }}</label>
          <input type="text" class="form-control" v-model="cacheForm.address" :placeholder="t('rpki.placeholders.ipv4')" style="width:100%;" :disabled="editingCacheIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('rpki.columns.port') }}</label>
          <input type="number" class="form-control" v-model="cacheForm.port" min="1" max="65535" :placeholder="t('rpki.placeholders.port')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('rpki.columns.preference') }}</label>
          <input type="number" class="form-control" v-model="cacheForm.preference" min="1" max="255" :placeholder="t('rpki.placeholders.preference')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('rpki.modals.confirmDelete')" width="400px" @confirm="confirmDeleteCache">
        <div>{{ t('rpki.messages.confirmDeleteCache') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
