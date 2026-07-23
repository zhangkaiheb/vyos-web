import { defineComponent, ref, computed, watch, onMounted } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { firewallApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';

export default defineComponent({
  name: 'RuleTablePage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const data = ref([]);
    const stats = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const moveModalVisible = ref(false);
    const editingItem = ref(null);
    const selected = ref([]);
    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');
    const moveTarget = ref('');
    const importFile = ref(null);

    const columns = ref([
      { key: 'rule', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'action', title: '动作' },
      { key: 'protocol', title: '协议' },
      { key: 'source', title: '源' },
      { key: 'destination', title: '目的' },
      { key: 'packets', title: 'Packets' },
      { key: 'bytes', title: 'Bytes' },
      { key: 'log', title: '日志' },
      { key: 'disable', title: '禁用' },
    ]);

    const ruleSchema = [
      { key: 'rule', title: '规则编号', type: 'number' },
      { key: 'description', title: '描述' },
      { key: 'action', title: '动作', type: 'select', options: ['accept','drop','reject','continue','return','jump','queue','offload','synproxy'] },
      { key: 'protocol', title: '协议' },
      { key: 'source', title: '源地址', type: 'textarea' },
      { key: 'destination', title: '目的地址', type: 'textarea' },
      { key: 'log', title: '日志', type: 'select', options: ['', 'enable'] },
      { key: 'disable', title: '禁用', type: 'select', options: ['', 'enable'] },
      { key: 'connection-mark', title: '连接标记', advanced: true },
      { key: 'connection-status', title: '连接状态', advanced: true },
      { key: 'conntrack-helper', title: '连接跟踪助手', advanced: true },
      { key: 'dscp', title: 'DSCP', advanced: true },
      { key: 'dscp-exclude', title: 'DSCP 排除', advanced: true },
      { key: 'fragment', title: '分片', type: 'select', options: ['', 'match-frag', 'match-non-frag'], advanced: true },
      { key: 'icmp', title: 'ICMP', advanced: true },
      { key: 'inbound-interface', title: '入接口', advanced: true },
      { key: 'ipsec', title: 'IPsec', type: 'select', options: ['', 'match-ipsec', 'match-none'], advanced: true },
      { key: 'jump-target', title: '跳转目标', advanced: true },
      { key: 'limit', title: '限速', advanced: true },
      { key: 'mark', title: '标记', advanced: true },
      { key: 'offload-target', title: '卸载目标', advanced: true },
      { key: 'outbound-interface', title: '出接口', advanced: true },
      { key: 'packet-length', title: '包长度', advanced: true },
      { key: 'packet-length-exclude', title: '包长度排除', advanced: true },
      { key: 'packet-type', title: '包类型', advanced: true },
      { key: 'queue', title: '队列', advanced: true },
      { key: 'recent', title: '近期匹配', advanced: true },
      { key: 'state', title: '状态', advanced: true },
      { key: 'synproxy', title: 'SYN代理', advanced: true },
      { key: 'tcp', title: 'TCP选项', advanced: true },
      { key: 'time', title: '时间', advanced: true },
      { key: 'ttl', title: 'TTL', advanced: true },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        const d = res.data || {};
        const rows = [];
        for (const [k, v] of Object.entries(d)) {
          rows.push({ id: k, rule: k, ...v });
        }
        data.value = rows;
        try {
          const sres = await firewallApi.ruleStats(path.value);
          stats.value = sres.stats || [];
        } catch (e) {
          stats.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    watch(() => route.path, load);

    function create() {
      editingItem.value = {};
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert('请选择一行');
      editingItem.value = data.value.find(r => r.id === selected.value[0]) || {};
      modalVisible.value = true;
    }

    async function remove() {
      if (!selected.value.length) return alert('请选择一行');
      if (!confirm('确认删除选中的规则？')) return;
      for (const id of selected.value) {
        await configStore.deleteConfig(`${path.value} ${id}`);
      }
      await configStore.checkSessionChanged();
      await load();
    }

    async function save() {
      const id = editingItem.value.rule;
      try {
        await configStore.setConfig(`${path.value} ${id}`, editingItem.value);
        modalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    async function clearStats() {
      try {
        await firewallApi.clearCounters(path.value);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function exportExcel() {
      const rows = data.value.map(r => ({
        rule: r.rule, action: r.action, protocol: r.protocol,
        source_address: r.source?.address, source_port: r.source?.port,
        destination_address: r.destination?.address, destination_port: r.destination?.port,
        inbound_interface: r['inbound-interface'], outbound_interface: r['outbound-interface'],
        description: r.description, log: r.log ? 'yes' : 'no', state: r.state,
      }));
      const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `firewall_rules_${Date.now()}.csv`;
      a.click();
    }

    async function importExcel() {
      if (!importFile.value) return alert('请选择文件');
      try {
        const text = await importFile.value.text();
        const lines = text.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, i) => row[h] = values[i]);
          return row;
        });
        await firewallApi.importRules(path.value, rows);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function openMove() {
      if (!selected.value.length) return alert('请选择一行');
      moveTarget.value = '';
      moveModalVisible.value = true;
    }

    async function moveRule() {
      if (!moveTarget.value) return;
      try {
        await firewallApi.moveRule(path.value, selected.value[0], moveTarget.value);
        moveModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      }
    }

    async function copyRule() {
      if (!selected.value.length) return alert('请选择一行');
      const target = prompt('输入新规则编号');
      if (!target) return;
      try {
        await firewallApi.copyRule(path.value, selected.value[0], target);
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {
      data, loading, columns, modalVisible, moveModalVisible, editingItem, selected, path, writeDisabled, moveTarget, importFile,
      load, create, edit, remove, save, clearStats, exportExcel, importExcel, openMove, moveRule, copyRule, ruleSchema,
    };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left">
          <button @click="create" :disabled="writeDisabled">{{ $t('app.create') }}</button>
          <button @click="edit" :disabled="writeDisabled">{{ $t('app.edit') }}</button>
          <button class="danger" @click="remove" :disabled="writeDisabled">{{ $t('app.delete') }}</button>
          <button @click="openMove" :disabled="writeDisabled">{{ $t('app.move') }}</button>
          <button @click="copyRule" :disabled="writeDisabled">{{ $t('app.copy') }}</button>
          <button @click="clearStats">{{ $t('firewall.clearCounters') }}</button>
          <button @click="exportExcel">{{ $t('firewall.exportExcel') }}</button>
          <button @click="load">{{ $t('app.refresh') }}</button>
        </div>
        <div class="toolbar-right">
          <input type="file" :disabled="writeDisabled" @change="importFile = $event.target.files[0]" />
          <button @click="importExcel" :disabled="writeDisabled">{{ $t('firewall.importExcel') }}</button>
        </div>
      </div>
      <DataTable :columns="columns" :data="data" :loading="loading" :disabled="writeDisabled"
                 @selection-change="selected = $event" :selectable="true" />
      <DraggableModal v-model:visible="modalVisible" :title="editingItem?.id ? '编辑规则' : '创建规则'" @confirm="save">
        <ConfigForm v-model="editingItem" :schema="ruleSchema" :disabled="writeDisabled" />
      </DraggableModal>
      <DraggableModal v-model:visible="moveModalVisible" title="移动规则" @confirm="moveRule">
        <div class="form-row"><label class="form-label">目标编号</label><input class="form-control" v-model="moveTarget" /></div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm },
});
