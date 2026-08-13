import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
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

function joinLines(val) { return toArray(val).join('\n'); }
function splitLines(text) { return String(text || '').split('\n').map(s => s.trim()).filter(Boolean); }

export default defineComponent({
  name: 'VppSflowPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);

    const config = ref({
      header_bytes: '128',
      interfaces: '',
    });

    const commandPath = computed(() => 'vpp sflow');

    function sflowToForm(data = {}) {
      return {
        header_bytes: data['header-bytes'] || '128',
        interfaces: joinLines(data.interface),
      };
    }

    function formToSflow(form) {
      const result = {};
      if (isPresent(form.header_bytes)) result['header-bytes'] = String(form.header_bytes);
      const ifaces = splitLines(form.interfaces);
      if (ifaces.length) result.interface = ifaces;
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get('vpp sflow', true);
        config.value = sflowToForm(res.data || {});
      } catch (e) {
        showError(e.message || t('vppSflow.errors.loadFailed'));
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp sflow');
        const payload = formToSflow(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp sflow', payload);
        }
        configStore.markPending();
        await load();
      } catch (e) {
        showError(e.message || t('vppSflow.errors.saveFailed'));
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, config, commandPath,
      load, save, t,
    };
  },
  template: `
    <div class="page-container">
      <div class="form-row"><label class="form-label">{{ t('vppSflow.labels.headerBytes') }}</label>
        <select class="form-control" v-model="config.header_bytes" :title="t('vppSflow.tips.headerBytes')">
          <option value="64">64</option>
          <option value="96">96</option>
          <option value="128">128 ({{ t('vppSflow.options.default') }})</option>
          <option value="160">160</option>
          <option value="192">192</option>
          <option value="224">224</option>
          <option value="256">256</option>
        </select>
      </div>
      <div class="form-row"><label class="form-label">{{ t('vppSflow.labels.interfaces') }}</label><textarea class="form-control" v-model="config.interfaces" rows="5" :placeholder="t('vppSflow.placeholders.interfaces')" :title="t('vppSflow.tips.interfaces')" /></div>

    </div>
  `,
});
