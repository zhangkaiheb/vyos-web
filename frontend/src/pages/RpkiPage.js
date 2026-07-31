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

function validateInterval(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
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
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);

    const cacheModalVisible = ref(false);
    const editingCacheIndex = ref(-1);
    const cacheForm = ref({ address: '', port: '', preference: '' });

    const cacheColumns = [
      { key: 'address', title: '缓存服务器地址' },
      { key: 'port', title: '端口' },
      { key: 'preference', title: '优先级' },
    ];

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
        const err = validateInterval(config.value['expire-interval'], 1, 7200, '过期间隔');
        if (err) return alert(err);
      }
      if (config.value['polling-period']) {
        const err = validateInterval(config.value['polling-period'], 1, 3600, '轮询周期');
        if (err) return alert(err);
      }
      if (config.value['retry-interval']) {
        const err = validateInterval(config.value['retry-interval'], 1, 3600, '重试间隔');
        if (err) return alert(err);
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols rpki', payload);
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        cacheModalVisible.value = false;
        await load();
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
      if (!cacheForm.value.address) return alert('请输入缓存服务器地址');
      const err = validateIPv4(cacheForm.value.address);
      if (err) return alert(err);
      if (editingCacheIndex.value >= 0) {
        config.value.caches.splice(editingCacheIndex.value, 1, JSON.parse(JSON.stringify(cacheForm.value)));
      } else {
        config.value.caches.push(JSON.parse(JSON.stringify(cacheForm.value)));
      }
      cacheModalVisible.value = false;
    }

    function deleteCache(index) {
      if (confirm('确定删除此缓存服务器？')) config.value.caches.splice(index, 1);
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      cacheModalVisible, editingCacheIndex, cacheForm,
      cacheColumns, commandPath,
      openCacheModal, deleteCache,
      saveCache, save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'cache', title: '缓存服务器' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">RPKI 参数</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">过期间隔</label>
                  <input type="number" class="form-control" v-model="config['expire-interval']" min="1" max="7200" placeholder="默认: 7200 秒" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">轮询周期</label>
                  <input type="number" class="form-control" v-model="config['polling-period']" min="1" max="3600" placeholder="默认: 300 秒" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">重试间隔</label>
                  <input type="number" class="form-control" v-model="config['retry-interval']" min="1" max="3600" placeholder="默认: 600 秒" style="width:100%;" />
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

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Cache Modal -->
      <DraggableModal v-model:visible="cacheModalVisible" :title="editingCacheIndex >= 0 ? '编辑 RPKI 缓存' : '添加 RPKI 缓存'" width="500px" @confirm="saveCache">
        <div class="form-row">
          <label class="form-label">缓存服务器地址 *</label>
          <input type="text" class="form-control" v-model="cacheForm.address" placeholder="IPv4 地址" style="width:100%;" :disabled="editingCacheIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">端口</label>
          <input type="number" class="form-control" v-model="cacheForm.port" min="1" max="65535" placeholder="端口号" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">优先级</label>
          <input type="number" class="form-control" v-model="cacheForm.preference" min="1" max="255" placeholder="1-255" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
