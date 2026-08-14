import { defineComponent, ref } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useI18n } from '/src/i18n/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'ImportExportPage',
  setup() {
    const { t } = useI18n();
    const password = ref('');
    const importFile = ref(null);
    const message = ref('');
    const error = ref('');

    function setMessage(text, isError = false) {
      message.value = isError ? '' : text;
      error.value = isError ? text : '';
    }

    async function doExport() {
      try {
        const { blob, filename } = await configApi.exportFile(password.value);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        setMessage(t('importExport.message.exportSuccess'));
      } catch (e) {
        showError(e);
      }
    }

    async function doImport() {
      if (!importFile.value) return setMessage(t('importExport.message.selectFile'), true);
      try {
        const text = await importFile.value.text();
        await configApi.load(text, password.value);
        setMessage(t('importExport.message.importSuccess'));
        importFile.value = null;
      } catch (e) {
        showError(e);
      }
    }

    return { t, password, importFile, message, error, doExport, doImport };
  },
  template: `
    <div>
      <div v-if="message" class="alert alert-info">{{ message }}</div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div class="form-row"><label class="form-label">{{ t('importExport.label.password') }}</label><input class="form-control" type="password" v-model="password" /></div>
      <div class="form-row"><label class="form-label">{{ t('importExport.label.importFile') }}</label><input type="file" @change="importFile = $event.target.files[0]" /></div>
      <div class="form-row"><label class="form-label"></label>
        <div style="display:flex;gap:8px;">
          <ToolbarButton icon="export" primary @click="doExport">{{ $t('config.export') }}</ToolbarButton>
          <ToolbarButton icon="import" @click="doImport">{{ $t('config.import') }}</ToolbarButton>
        </div>
      </div>
    </div>
  `,
  components: { ToolbarButton },
});
