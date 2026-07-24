import { defineComponent, ref } from '/src/utils/vue-import.js';
import { configApi, firewallApi } from '/src/api/index.js';

export default defineComponent({
  name: 'ImportExportPage',
  setup() {
    const password = ref('');
    const configText = ref('');
    const message = ref('');
    const error = ref('');
    const firewallPath = ref('firewall ipv4 forward filter rule');
    const importFile = ref(null);
    const exportFormat = ref('xlsx');

    function setMessage(text, isError = false) {
      message.value = isError ? '' : text;
      error.value = isError ? text : '';
    }

    async function doExport() {
      try {
        const res = await configApi.export(password.value);
        configText.value = res.config;
        setMessage('导出成功');
      } catch (e) {
        setMessage(e.message, true);
      }
    }

    async function doImport() {
      try {
        await configApi.load(configText.value, password.value);
        setMessage('导入成功');
      } catch (e) {
        setMessage(e.message, true);
      }
    }

    async function exportFirewall() {
      try {
        const res = await firewallApi.exportRules(firewallPath.value, exportFormat.value);
        const blob = exportFormat.value === 'csv'
          ? new Blob(['\ufeff' + res.data], { type: 'text/csv;charset=utf-8;' })
          : new Blob([new Uint8Array(res.data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `firewall_rules_${Date.now()}.${exportFormat.value}`;
        a.click();
        setMessage('规则导出成功');
      } catch (e) {
        setMessage(e.message, true);
      }
    }

    async function importFirewall() {
      if (!importFile.value) return setMessage('请选择文件', true);
      try {
        const text = await importFile.value.text();
        const rows = parseCsv(text);
        await firewallApi.importRules(firewallPath.value, rows);
        setMessage('规则导入成功');
      } catch (e) {
        setMessage(e.message, true);
      }
    }

    function parseCsv(text) {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, i) => row[h] = values[i]);
        return row;
      });
    }

    return { password, configText, message, error, firewallPath, importFile, exportFormat, doExport, doImport, exportFirewall, importFirewall };
  },
  template: `
    <div>
      <div v-if="message" class="alert alert-info">{{ message }}</div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div class="toolbar"><div class="toolbar-left"><h3>整机配置导入/导出</h3></div></div>
      <div class="form-row"><label class="form-label">密码</label><input class="form-control" type="password" v-model="password" /></div>
      <div class="form-row"><label class="form-label">配置内容</label><textarea class="form-control" v-model="configText" rows="10"></textarea></div>
      <div class="form-row"><label class="form-label"></label>
        <div style="display:flex;gap:8px;">
          <ToolbarButton icon="export" primary @click="doExport">{{ $t('config.export') }}</ToolbarButton>
          <ToolbarButton icon="import" @click="doImport">{{ $t('config.import') }}</ToolbarButton>
        </div>
      </div>
      <hr style="margin:20px 0;" />
      <div class="toolbar"><div class="toolbar-left"><h3>防火墙规则导入/导出</h3></div></div>
      <div class="form-row"><label class="form-label">规则路径</label><input class="form-control" v-model="firewallPath" /></div>
      <div class="form-row"><label class="form-label">导出格式</label>
        <select class="form-control" v-model="exportFormat">
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV (.csv)</option>
        </select>
      </div>
      <div class="form-row"><label class="form-label">导入文件</label><input type="file" @change="importFile = $event.target.files[0]" /></div>
      <div class="form-row"><label class="form-label"></label>
        <div style="display:flex;gap:8px;">
          <ToolbarButton icon="export" primary @click="exportFirewall">导出规则</ToolbarButton>
          <ToolbarButton icon="import" @click="importFirewall">导入规则</ToolbarButton>
        </div>
      </div>
    </div>
  `,
});
