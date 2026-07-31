import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';

export default defineComponent({
  name: 'StaticNatPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const path = 'nat static';
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const rules = ref([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingRule = ref(null);
    const editingOriginalId = ref(null);
    const modalKey = ref(0);
    const interfaces = ref([]);

    const tabs = [
      { key: 'basic', title: '基本' },
      { key: 'match', title: '匹配条件' },
      { key: 'translation', title: '翻译' },
    ];
    const activeTab = ref('basic');

    const tabSchemas = computed(() => ({
      basic: [
        { key: 'id', title: '规则编号', type: 'text', required: true, help: '规则标识符（文本）' },
        { key: 'description', title: '描述', type: 'text', help: '规则描述信息' },
        { key: 'log', title: '日志', type: 'checkbox', defaultValue: false, help: '记录匹配此规则的数据包' },
      ],
      match: [
        { key: 'destinationAddress', title: '目的地址', type: 'text', placeholder: 'IP地址或前缀', help: '目的IP地址或CIDR前缀，如: 192.168.1.0/24' },
        { key: 'inboundInterface', title: '入站接口', type: 'select', placeholder: '选择入站接口', help: '入站接口',
          options: ['any', ...interfaces.value] },
      ],
      translation: [
        { key: 'translationAddress', title: '翻译地址', type: 'text', placeholder: 'IP地址或前缀', help: '转换后的IP地址或前缀，如: 10.0.0.1/32' },
      ],
    }));

    const columns = [
      { key: 'id', title: '规则编号' },
      { key: 'description', title: '描述' },
      { key: 'destinationAddress', title: '目的地址' },
      { key: 'inboundInterface', title: '入站接口' },
      { key: 'translationAddress', title: '翻译地址' },
      { key: 'log', title: '日志' },
    ];

    async function load() {
      loading.value = true;
      try {
        const resp = await configStore.getConfig(path);
        if (resp.success && resp.data) {
          const raw = resp.data;
          const ruleData = raw.rule || {};
          rules.value = Object.entries(ruleData).map(([id, attrs]) => ({
            id: id,
            ...flattenRule(attrs),
          }));
        }
      } catch (e) {
        showError('加载静态 NAT 配置失败', e);
      } finally {
        loading.value = false;
      }
    }

    function flattenRule(attrs) {
      const rule = {};
      if (attrs.description) rule.description = attrs.description;
      if (attrs.log) rule.log = true;

      const dst = attrs.destination || {};
      if (dst.address) rule.destinationAddress = dst.address;

      const trans = attrs.translation || {};
      if (trans.address) rule.translationAddress = trans.address;

      if (attrs['inbound-interface']) {
        rule.inboundInterface = attrs['inbound-interface'];
      }

      return rule;
    }

    function buildRuleValue(rule) {
      const value = {};
      if (rule.description) value.description = rule.description;
      if (rule.log) value.log = '';

      const dst = {};
      if (rule.destinationAddress) dst.address = rule.destinationAddress;
      if (Object.keys(dst).length) value.destination = dst;

      const trans = {};
      if (rule.translationAddress) trans.address = rule.translationAddress;
      if (Object.keys(trans).length) value.translation = trans;

      if (rule.inboundInterface) {
        value['inbound-interface'] = rule.inboundInterface;
      }

      return value;
    }

    async function openModal(index) {
      if (index >= 0) {
        const row = rules.value[index];
        editingRule.value = { ...row };
        editingOriginalId.value = row.id;
      } else {
        editingRule.value = { id: '' };
        editingOriginalId.value = null;
      }
      modalKey.value++;
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
        showError('保存静态 NAT 规则失败', e);
      }
    }

    async function deleteRule(index) {
      const row = rules.value[index];
      if (!row) return;
      if (!confirm('确认删除此静态 NAT 规则？')) return;
      try {
        await configStore.deleteConfig(`${path} rule ${row.id}`);
        await load();
      } catch (e) {
        showError('删除静态 NAT 规则失败', e);
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        interfaces.value = (res.interfaces || []).map(i => i.name || i).filter(Boolean);
      } catch (e) {
        interfaces.value = [];
      }
    }

    onMounted(() => { load(); loadInterfaces(); });
    watch(() => route.path, () => { load(); loadInterfaces(); });

    return { path, writeDisabled, rules, loading, modalVisible, editingRule, editingOriginalId, tabs, activeTab, tabSchemas, columns, openModal, saveRule, deleteRule };
  },
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton, CommandPreview },
  template: `
    <div class="page-container">
      <DataTable :columns="columns" :data="rules" :loading="loading" :disabled="writeDisabled"
                 rowKey="id" :actions="['create', 'edit', 'delete']"
                 @create="openModal(-1)" @edit="openModal(rules.findIndex(r => r.id === $event.id))" @delete="deleteRule" />
      <div style="height:32px;"></div>
      <CommandPreview :path="path" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
      </div>
      <DraggableModal v-model:visible="modalVisible" :title="editingOriginalId ? '编辑静态 NAT 规则' : '创建静态 NAT 规则'" width="820px" :key="modalKey" @confirm="saveRule">
        <TabGroup v-model="activeTab" :tabs="tabs">
          <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
            <ConfigForm v-model="editingRule" :schema="tabSchemas[tab.key]" :showAdvanced="true" :formKey="'static_nat_rule_' + tab.key" />
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
});
