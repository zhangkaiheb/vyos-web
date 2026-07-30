import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateIPv6(value) {
  if (!value) return '';
  const re = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  if (!re.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIP(value) {
  if (!value) return '';
  if (!validateIPv4(value)) return '';
  if (!validateIPv6(value)) return '';
  return 'IP 地址格式错误';
}

function validateURL(value) {
  if (!value) return '';
  const patterns = [
    /^https?:\/\/.+/,
    /^ftp:\/\/.+/,
    /^sftp:\/\/.+/,
    /^scp:\/\/.+/,
    /^tftp:\/\/.+/,
    /^git\+https:\/\/.+/,
  ];
  if (!patterns.some(p => p.test(value))) return 'URL 格式错误，支持 http/https/ftp/sftp/scp/tftp/git+https';
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
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('archive');
    const writeDisabled = ref(false);

    const modalVisible = ref(false);
    const editingIndex = ref(-1);
    const locationForm = ref({ url: '' });

    const locationColumns = [
      { key: 'url', title: 'URL' },
    ];

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
        const err = validateURL(loc.url);
        if (err) return alert(`提交归档位置 ${loc.url}：${err}`);
      }

      // Validate source address
      if (config.value.source_address) {
        const err = validateIP(config.value.source_address);
        if (err) return alert(`源地址 ${config.value.source_address}：${err}`);
      }

      // Validate commit revisions
      if (config.value.commit_revisions !== '') {
        const n = parseInt(config.value.commit_revisions, 10);
        if (isNaN(n) || n < 1 || n > 65535) return alert('配置修订版本数必须在 1-65535 之间');
      }

      saving.value = true;
      try {
        await configApi.set('system config-management', configToConfig(config.value));
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
      if (!confirm('确认删除选中的提交归档位置？')) return;
      const toDelete = new Set(selectedUrls);
      config.value.locations = config.value.locations.filter(l => !toDelete.has(l.url));
    }

    function saveLocation() {
      const url = String(locationForm.value.url || '').trim();
      if (!url) return alert('请输入提交归档位置 URL');

      const err = validateURL(url);
      if (err) return alert(err);

      const duplicate = config.value.locations.find((l, i) => l.url === url && i !== editingIndex.value);
      if (duplicate) return alert('该 URL 已存在');

      const newLoc = { url };

      if (editingIndex.value >= 0) {
        config.value.locations.splice(editingIndex.value, 1, newLoc);
      } else {
        config.value.locations.push(newLoc);
      }
      modalVisible.value = false;
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      locationColumns, modalVisible, locationForm, commandPath,
      load, save, createLocation, editLocation, deleteLocations, saveLocation,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'archive', title: '提交归档位置' },
        { key: 'source', title: '源地址' },
        { key: 'revisions', title: '修订版本数' }
      ]">

        <template #archive>
          <DataTable :columns="locationColumns" :data="config.locations" :loading="loading" :disabled="writeDisabled"
                     rowKey="url" :actions="['create', 'edit', 'delete']"
                     @create="createLocation" @edit="editLocation" @delete="deleteLocations" />
        </template>

        <template #source>
          <div class="form-row">
            <label class="form-label">源地址</label>
            <input type="text" class="form-control" v-model="config.source_address"
                   placeholder="IPv4 或 IPv6 地址" style="max-width:400px;"
                   title="用于发起连接的源 IP 地址" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div class="form-hint">支持 IPv4 地址（如 192.168.5.200）和 IPv6 地址（如 2002:1:2:3::1）</div>
          </div>
        </template>

        <template #revisions>
          <div class="form-row">
            <label class="form-label">修订版本数</label>
            <input type="number" class="form-control" v-model="config.commit_revisions"
                   min="1" max="65535" placeholder="100" style="width:200px;"
                   title="要保留的配置备份数量（1-65535）" />
          </div>
          <div class="form-row">
            <label class="form-label"></label>
            <div class="form-hint">默认值：100，范围：1-65535</div>
          </div>
        </template>
      </TabGroup>

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="modalVisible" :title="editingIndex >= 0 ? '编辑提交归档位置' : '添加提交归档位置'" width="600px" @confirm="saveLocation">
        <div class="form-row">
          <label class="form-label">URL</label>
          <input type="text" class="form-control" v-model="locationForm.url"
                 placeholder="http://user:pass@host/path" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <div class="form-hint">支持格式：http://、https://、ftp://、sftp://、scp://、tftp://、git+https://</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
