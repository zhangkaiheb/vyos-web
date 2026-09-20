import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';

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
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('configManagementSettings.validation.ipv4');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('configManagementSettings.validation.ipv4');
  return '';
}

function validateIPv6(value, t) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return t('configManagementSettings.validation.ipv6');
  return '';
}

function validateIP(value, t) {
  if (!value) return '';
  if (!validateIPv4(value, t)) return '';
  if (!validateIPv6(value, t)) return '';
  return t('configManagementSettings.validation.ip');
}

function validateURL(value, t) {
  if (!value) return '';
  const patterns = [
    /^https?:\/\/.+/,
    /^ftp:\/\/.+/,
    /^sftp:\/\/.+/,
    /^scp:\/\/.+/,
    /^tftp:\/\/.+/,
    /^git\+https:\/\/.+/,
  ];
  if (!patterns.some(p => p.test(value))) return t('configManagementSettings.validation.url');
  return '';
}

function configToForm(data = {}) {
  const locations = [];
  const locData = data['commit-archive']?.location || {};
  for (const [url] of Object.entries(locData)) {
    locations.push({ url });
  }
  return {
    locations,
    source_address: data['commit-archive']?.['source-address'] || '',
    commit_revisions: data['commit-revisions'] || '',
  };
}

function configToConfig(form) {
  const result = {};

  const locationObj = {};
  for (const loc of form.locations || []) {
    if (loc.url) locationObj[loc.url] = {};
  }
  if (Object.keys(locationObj).length) {
    result['commit-archive'] = { location: locationObj };
  }

  if (isPresent(form.source_address)) {
    if (!result['commit-archive']) result['commit-archive'] = {};
    result['commit-archive']['source-address'] = String(form.source_address);
  }

  if (isPresent(form.commit_revisions)) {
    result['commit-revisions'] = String(form.commit_revisions);
  }

  return result;
}

export default defineComponent({
  name: 'ConfigManagementSettingsPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('archive');
    const writeDisabled = ref(false);

    const modalVisible = ref(false);
    const editingIndex = ref(-1);
    const locationForm = ref({ url: '' });
    const deleteModalVisible = ref(false);
    const pendingDeleteUrls = ref([]);

    const locationColumns = computed(() => [
      { key: 'url', title: t('configManagementSettings.columns.url') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'revisions') return 'system config-management commit-revisions';
      if (activeTab.value === 'source') return 'system config-management commit-archive source-address';
      return 'system config-management commit-archive location';
    });

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('system config-management', true);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      // Validate locations
      for (const loc of config.value.locations || []) {
        const err = validateURL(loc.url, t);
        if (err) return showError({ message: t('configManagementSettings.errors.locationError', { url: loc.url, error: err }) });
      }

      // Validate source address
      if (config.value.source_address) {
        const err = validateIP(config.value.source_address, t);
        if (err) return showError({ message: t('configManagementSettings.errors.sourceAddressError', { address: config.value.source_address, error: err }) });
      }

      // Validate commit revisions
      if (config.value.commit_revisions !== '') {
        const n = parseInt(config.value.commit_revisions, 10);
        if (isNaN(n) || n < 1 || n > 65535) return showError({ message: t('configManagementSettings.errors.revisionsRange') });
      }

      saving.value = true;
      try {
        await configStore.setConfig('system config-management', configToConfig(config.value));
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function createLocation() {
      editingIndex.value = -1;
      locationForm.value = { url: '' };
      modalVisible.value = true;
    }

    function editLocation(row) {
      editingIndex.value = config.value.locations.findIndex(l => l.url === row.url);
      locationForm.value = { url: row.url };
      modalVisible.value = true;
    }

    function deleteLocations(selectedUrls) {
      if (!selectedUrls.length) return;
      pendingDeleteUrls.value = [...selectedUrls];
      deleteModalVisible.value = true;
    }

    function confirmDeleteLocations() {
      deleteModalVisible.value = false;
      const toDelete = new Set(pendingDeleteUrls.value);
      config.value.locations = config.value.locations.filter(l => !toDelete.has(l.url));
      pendingDeleteUrls.value = [];
    }

    function saveLocation() {
      const url = String(locationForm.value.url || '').trim();
      if (!url) return showError({ message: t('configManagementSettings.errors.urlRequired') });

      const err = validateURL(url, t);
      if (err) return showError({ message: err });

      const duplicate = config.value.locations.find((l, i) => l.url === url && i !== editingIndex.value);
      if (duplicate) return showError({ message: t('configManagementSettings.errors.urlDuplicate') });

      const newLoc = { url };

      if (editingIndex.value >= 0) {
        config.value.locations.splice(editingIndex.value, 1, newLoc);
      } else {
        config.value.locations.push(newLoc);
      }
      modalVisible.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t, loading, saving, saved, config, activeTab, writeDisabled,
      locationColumns, modalVisible, locationForm, commandPath,
      deleteModalVisible, pendingDeleteUrls,
      load, save, createLocation, editLocation, deleteLocations, confirmDeleteLocations, saveLocation,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('configManagementSettings.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'archive', title: t('configManagementSettings.tabs.archive') },
        { key: 'source', title: t('configManagementSettings.tabs.source') },
        { key: 'revisions', title: t('configManagementSettings.tabs.revisions') }
      ]">

        <template #archive>
          <DataTable :columns="locationColumns" :data="config.locations" :loading="loading" :disabled="writeDisabled"
                     rowKey="url" :actions="['create', 'edit', 'delete']"
                     @create="createLocation" @edit="editLocation" @delete="deleteLocations" />
        </template>

        <template #source>
          <div class="form-row">
            <label class="form-label">{{ t('configManagementSettings.labels.sourceAddress') }}</label>
            <input type="text" class="form-control" v-model="config.source_address"
                   :placeholder="t('configManagementSettings.placeholders.sourceAddress')" style="max-width:400px;"
                   :title="t('configManagementSettings.tips.sourceAddress')" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div class="form-hint">{{ t('configManagementSettings.hints.sourceAddress') }}</div>
          </div>
        </template>

        <template #revisions>
          <div class="form-row">
            <label class="form-label">{{ t('configManagementSettings.labels.commitRevisions') }}</label>
            <input type="number" class="form-control" v-model="config.commit_revisions"
                   min="1" max="65535" placeholder="100" style="width:200px;"
                   :title="t('configManagementSettings.tips.commitRevisions')" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div class="form-hint">{{ t('configManagementSettings.hints.commitRevisions') }}</div>
          </div>
        </template>
      </TabGroup>

      <DraggableModal v-model:visible="modalVisible" :title="editingIndex >= 0 ? t('configManagementSettings.modals.editLocation') : t('configManagementSettings.modals.addLocation')" width="600px" @confirm="saveLocation">
        <div class="form-row">
          <label class="form-label">URL</label>
          <input type="text" class="form-control" v-model="locationForm.url"
                 placeholder="http://user:pass@host/path" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <div class="form-hint">{{ t('configManagementSettings.hints.urlFormats') }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('configManagementSettings.modals.confirmDelete')" header-icon="delete" width="400px" @confirm="confirmDeleteLocations">
        <div>{{ t('configManagementSettings.messages.confirmDeleteLocations') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="url in pendingDeleteUrls" :key="url" style="padding:2px 0;">{{ url }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
