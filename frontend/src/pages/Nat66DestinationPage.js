import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'Nat66DestinationPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat66 destination';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);

    const ruleSchema = [
      { key: 'id', title: '规则编号', type: 'number', min: 1, max: 999999, required: true, help: '范围: 1-999999' },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'protocol', title: '协议', type: 'text', placeholder: 'all, tcp, udp, 协议号(0-255), 或协议名' },
      { key: 'sourceAddress', title: 'IPv6 源地址', type: 'text', placeholder: 'h:h:h:h:h:h:h:h 或 h:h:h:h:h:h:h:h/x' },
      { key: 'sourcePort', title: '源端口', type: 'text', placeholder: '1-65535 或 start-end' },
      { key: 'destinationAddress', title: 'IPv6 目的地址', type: 'text', placeholder: 'h:h:h:h:h:h:h:h 或 h:h:h:h:h:h:h:h/x' },
      { key: 'destinationPort', title: '目的端口', type: 'text', placeholder: '1-65535 或 start-end' },
      { key: 'inboundInterface', title: '入站接口', type: 'text', placeholder: '接口名称' },
      { key: 'translationAddress', title: '翻译地址', type: 'text', placeholder: 'h:h:h:h:h:h:h:h 或 h:h:h:h:h:h:h:h/x' },
      { key: 'translationPort', title: '翻译端口', type: 'text', placeholder: '1-65535 或 start-end' },
      { key: 'log', title: '日志', type: 'checkbox' },
      { key: 'exclude', title: '排除', type: 'checkbox', help: '排除匹配此规则的数据包' },
      { key: 'disable', title: '禁用', type: 'checkbox' },
    ];

    const ruleColumns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'protocol', title: '协议' },
      { key: 'sourceAddress', title: 'IPv6 源地址' },
      { key: 'destinationAddress', title: 'IPv6 目的地址' },
      { key: 'inboundInterface', title: '入站接口' },
      { key: 'translationAddress', title: '翻译地址' },
      { key: 'log', title: '日志' },
      { key: 'disable', title: '禁用' },
    ];

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => ({
            id: parseInt(id) || id,
            ...flattenRule(attrs),
          }));
          rules.value.sort((a, b) => {
            const aId = typeof a.id === 'number' ? a.id : 0;
            const bId = typeof b.id === 'number' ? b.id : 0;
            return aId - bId;
          });
        }
      } catch (e) {
        showError('加载 NAT66 目的配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    function flattenRule(attrs) {
      const rule = {};
      if (attrs.description) rule.description = attrs.description;
      if (attrs.disable) rule.disable = true;
      if (attrs.exclude) rule.exclude = true;
      if (attrs.log) rule.log = true;
      if (attrs.protocol) rule.protocol = attrs.protocol;

      const src = attrs.source || {};
      if (src.address) rule.sourceAddress = src.address;
      if (src.port) rule.sourcePort = src.port;

      const dst = attrs.destination || {};
      if (dst.address) rule.destinationAddress = dst.address;
      if (dst.port) rule.destinationPort = dst.port;

      const trans = attrs.translation || {};
      if (trans.address) rule.translationAddress = trans.address;
      if (trans.port) rule.translationPort = trans.port;

      if (attrs['inbound-interface']) {
        rule.inboundInterface = attrs['inbound-interface'].name || '';
      }

      return rule;
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.disable) value.disable = '';
      if (rule.exclude) value.exclude = '';
      if (rule.log) value.log = '';
      if (rule.protocol) value.protocol = rule.protocol;

      const src = {};
      if (rule.sourceAddress) src.address = rule.sourceAddress;
      if (rule.sourcePort) src.port = rule.sourcePort;
      if (Object.keys(src).length) value.source = src;

      const dst = {};
      if (rule.destinationAddress) dst.address = rule.destinationAddress;
      if (rule.destinationPort) dst.port = rule.destinationPort;
      if (Object.keys(dst).length) value.destination = dst;

      const trans = {};
      if (rule.translationAddress) trans.address = rule.translationAddress;
      if (rule.translationPort) trans.port = rule.translationPort;
      if (Object.keys(trans).length) value.translation = trans;

      if (rule.inboundInterface) {
        value['inbound-interface'] = { name: rule.inboundInterface };
      }

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: 1 };
        editingOriginalId.value = null;
      }
      modalVisible.value = true;
    }

    async function saveRule() {
      try {
        const rule = editingRule.value;
        if (!rule.id) return showError({ message: '请输入规则编号' });
        const value = buildRuleValue(rule);
        if (editingOriginalId.value && editingOriginalId.value !== rule.id) {
          await configStore.deleteConfig(`${path} rule ${editingOriginalId.value}`);
        }
        await configStore.setConfig(`${path} rule ${rule.id}`, value);
        modalVisible.value = false;
        await load();
      } catch (e) {
        showError('保存 NAT66 目的规则失败', e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      if (!confirm('确认删除此 NAT66 目的规则？')) return;
      try {
        await configStore.deleteConfig(`${path} rule ${row.id}`);
        await load();
      } catch (e) {
        showError('删除 NAT66 目的规则失败', e);
      }
    }

    onMounted(load);
    watch(() => route.path, load);

    return {
      path, writeDisabled,
      rules, loading,
      modalVisible, editingRule, editingOriginalId,
      ruleSchema, ruleColumns,
      openModal, saveRule, deleteRule,
    };
  },
  components: { DataTable, DraggableModal, ConfigForm, ToolbarButton },
  template: `
    <div class="page-container">
      <DataTable :columns="ruleColumns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal" @delete="deleteRule" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? '编辑 NAT66 目的规则' : '创建 NAT66 目的规则'" width="700px">
        <ConfigForm v-model="editingRule" :schema="ruleSchema" :showAdvanced="true" />
        <template #footer>
          <button @click="modalVisible = false">取消</button>
          <button class="btn-primary" @click="saveRule">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
