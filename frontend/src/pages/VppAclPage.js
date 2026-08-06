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

export default defineComponent({
  name: 'VppAclPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
  setup() {
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const activeTab = ref('ip-acl');

    const config = ref({
      ip_acls: [],
      mac_ip_acls: [],
    });

    const ipAclColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'rule_count', title: '规则数', dataIndex: 'rule_count', width: 100 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const ipRuleColumns = [
      { key: 'rule_number', title: '规则号', dataIndex: 'rule_number', width: 100 },
      { key: 'action', title: '动作', dataIndex: 'action', width: 100 },
      { key: 'protocol', title: '协议', dataIndex: 'protocol', width: 100 },
      { key: 'source_prefix', title: '源地址', dataIndex: 'source_prefix', width: 150 },
      { key: 'dest_prefix', title: '目的地址', dataIndex: 'dest_prefix', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const macAclColumns = [
      { key: 'name', title: '名称', dataIndex: 'name', width: 150 },
      { key: 'description', title: '描述', dataIndex: 'description', width: 200 },
      { key: 'rule_count', title: '规则数', dataIndex: 'rule_count', width: 100 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const macRuleColumns = [
      { key: 'rule_number', title: '规则号', dataIndex: 'rule_number', width: 100 },
      { key: 'action', title: '动作', dataIndex: 'action', width: 100 },
      { key: 'mac_address', title: 'MAC地址', dataIndex: 'mac_address', width: 150 },
      { key: 'prefix', title: 'IP前缀', dataIndex: 'prefix', width: 150 },
      { key: 'actions', title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' },
    ];

    const selectedIpAcls = ref([]);
    const selectedIpRules = ref([]);
    const selectedMacAcls = ref([]);
    const selectedMacRules = ref([]);

    const showIpAclModal = ref(false);
    const editingIpAcl = ref(null);
    const showIpRuleModal = ref(false);
    const editingIpRule = ref(null);
    const currentIpAcl = ref(null);

    const showMacAclModal = ref(false);
    const editingMacAcl = ref(null);
    const showMacRuleModal = ref(false);
    const editingMacRule = ref(null);
    const currentMacAcl = ref(null);

    const commandPath = computed(() => {
      return activeTab.value === 'ip-acl' ? 'vpp acl ip' : 'vpp acl mac-ip';
    });

    function aclToForm(data = {}) {
      const ipAcls = data.ip || {};
      const macAcls = data['mac-ip'] || {};

      return {
        ip_acls: Object.entries(ipAcls).map(([name, acl]) => ({
          _name: name,
          name,
          description: acl.description || '',
          rules: acl.rule ? Object.entries(acl.rule).map(([num, rule]) => ({
            _rule_number: num,
            rule_number: parseInt(num),
            action: rule.action || 'permit',
            protocol: rule.protocol || 'all',
            source_prefix: rule.source?.prefix || '',
            source_port: rule.source?.port || '',
            dest_prefix: rule.destination?.prefix || '',
            dest_port: rule.destination?.port || '',
            tcp_flags: rule['tcp-flags'] || [],
          })) : [],
        })),
        mac_ip_acls: Object.entries(macAcls).map(([name, acl]) => ({
          _name: name,
          name,
          description: acl.description || '',
          rules: acl.rule ? Object.entries(acl.rule).map(([num, rule]) => ({
            _rule_number: num,
            rule_number: parseInt(num),
            action: rule.action || 'permit',
            mac_address: rule.source?.['mac-address'] || '',
            mac_mask: rule.source?.['mac-mask'] || 'ff:ff:ff:ff:ff:ff',
            prefix: rule.source?.prefix || '',
          })) : [],
        })),
      };
    }

    function formToAcl(form) {
      const result = {};

      const ipAcls = {};
      for (const acl of form.ip_acls || []) {
        if (!acl.name) continue;
        const aclObj = {};
        if (isPresent(acl.description)) aclObj.description = String(acl.description);
        if (acl.rules && acl.rules.length) {
          aclObj.rule = {};
          for (const rule of acl.rules) {
            const ruleObj = {};
            if (isPresent(rule.action)) ruleObj.action = String(rule.action);
            if (isPresent(rule.protocol)) ruleObj.protocol = String(rule.protocol);
            if (isPresent(rule.source_prefix)) {
              ruleObj.source = { prefix: String(rule.source_prefix) };
              if (isPresent(rule.source_port)) ruleObj.source.port = String(rule.source_port);
            }
            if (isPresent(rule.dest_prefix)) {
              ruleObj.destination = { prefix: String(rule.dest_prefix) };
              if (isPresent(rule.dest_port)) ruleObj.destination.port = String(rule.dest_port);
            }
            if (rule.tcp_flags && rule.tcp_flags.length) {
              ruleObj['tcp-flags'] = rule.tcp_flags;
            }
            aclObj.rule[rule.rule_number] = ruleObj;
          }
        }
        ipAcls[acl.name] = aclObj;
      }
      if (Object.keys(ipAcls).length) result.ip = ipAcls;

      const macAcls = {};
      for (const acl of form.mac_ip_acls || []) {
        if (!acl.name) continue;
        const aclObj = {};
        if (isPresent(acl.description)) aclObj.description = String(acl.description);
        if (acl.rules && acl.rules.length) {
          aclObj.rule = {};
          for (const rule of acl.rules) {
            const ruleObj = {};
            if (isPresent(rule.action)) ruleObj.action = String(rule.action);
            const source = {};
            if (isPresent(rule.mac_address)) source['mac-address'] = String(rule.mac_address);
            if (isPresent(rule.mac_mask)) source['mac-mask'] = String(rule.mac_mask);
            if (isPresent(rule.prefix)) source.prefix = String(rule.prefix);
            if (Object.keys(source).length) ruleObj.source = source;
            aclObj.rule[rule.rule_number] = ruleObj;
          }
        }
        macAcls[acl.name] = aclObj;
      }
      if (Object.keys(macAcls).length) result['mac-ip'] = macAcls;

      return result;
    }

    async function load() {
      loading.value = true;
      saved.value = false;
      try {
        const res = await configApi.get('vpp acl', true);
        config.value = aclToForm(res.data || {});
      } catch (e) {
        showError(e.message || '加载失败');
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      try {
        await configApi.delete('vpp acl');
        const payload = formToAcl(config.value);
        if (Object.keys(payload).length) {
          await configApi.set('vpp acl', payload);
        }
        await configStore.commit();
        saved.value = true;
        await load();
      } catch (e) {
        showError(e.message || '保存失败');
      } finally {
        saving.value = false;
      }
    }

    function createIpAcl() {
      editingIpAcl.value = { name: '', description: '', rules: [] };
      showIpAclModal.value = true;
    }

    function editIpAcl() {
      if (!selectedIpAcls.value.length) return alert('请选择要编辑的ACL');
      const row = config.value.ip_acls.find(a => a.name === selectedIpAcls.value[0]);
      if (!row) return alert('未找到选中的ACL');
      editingIpAcl.value = JSON.parse(JSON.stringify(row));
      currentIpAcl.value = row;
      showIpAclModal.value = true;
    }

    function removeIpAcl() {
      if (!selectedIpAcls.value.length) return alert('请选择要删除的ACL');
      config.value.ip_acls = config.value.ip_acls.filter(a => a.name !== selectedIpAcls.value[0]);
      selectedIpAcls.value = [];
    }

    function saveIpAcl() {
      if (!editingIpAcl.value.name) return alert('请输入ACL名称');
      const list = config.value.ip_acls;
      const idx = list.findIndex(a => a._name === editingIpAcl.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpAcl.value });
      else list.push({ ...editingIpAcl.value });
      config.value.ip_acls = list;
      showIpAclModal.value = false;
    }

    function createIpRule() {
      editingIpRule.value = {
        rule_number: 1,
        action: 'permit',
        protocol: 'all',
        source_prefix: '',
        source_port: '',
        dest_prefix: '',
        dest_port: '',
        tcp_flags: [],
      };
      showIpRuleModal.value = true;
    }

    function editIpRule() {
      if (!selectedIpRules.value.length) return alert('请选择要编辑的规则');
      const row = editingIpAcl.value.rules.find(r => r.rule_number === selectedIpRules.value[0]);
      if (!row) return alert('未找到选中的规则');
      editingIpRule.value = JSON.parse(JSON.stringify(row));
      showIpRuleModal.value = true;
    }

    function removeIpRule() {
      if (!selectedIpRules.value.length) return alert('请选择要删除的规则');
      editingIpAcl.value.rules = editingIpAcl.value.rules.filter(r => r.rule_number !== selectedIpRules.value[0]);
      selectedIpRules.value = [];
    }

    function saveIpRule() {
      if (!editingIpRule.value.rule_number) return alert('请输入规则号');
      const list = editingIpAcl.value.rules;
      const idx = list.findIndex(r => r._rule_number === editingIpRule.value._rule_number);
      if (idx >= 0) list.splice(idx, 1, { ...editingIpRule.value });
      else list.push({ ...editingIpRule.value });
      editingIpAcl.value.rules = list;
      showIpRuleModal.value = false;
    }

    function createMacAcl() {
      editingMacAcl.value = { name: '', description: '', rules: [] };
      showMacAclModal.value = true;
    }

    function editMacAcl() {
      if (!selectedMacAcls.value.length) return alert('请选择要编辑的ACL');
      const row = config.value.mac_ip_acls.find(a => a.name === selectedMacAcls.value[0]);
      if (!row) return alert('未找到选中的ACL');
      editingMacAcl.value = JSON.parse(JSON.stringify(row));
      currentMacAcl.value = row;
      showMacAclModal.value = true;
    }

    function removeMacAcl() {
      if (!selectedMacAcls.value.length) return alert('请选择要删除的ACL');
      config.value.mac_ip_acls = config.value.mac_ip_acls.filter(a => a.name !== selectedMacAcls.value[0]);
      selectedMacAcls.value = [];
    }

    function saveMacAcl() {
      if (!editingMacAcl.value.name) return alert('请输入ACL名称');
      const list = config.value.mac_ip_acls;
      const idx = list.findIndex(a => a._name === editingMacAcl.value._name);
      if (idx >= 0) list.splice(idx, 1, { ...editingMacAcl.value });
      else list.push({ ...editingMacAcl.value });
      config.value.mac_ip_acls = list;
      showMacAclModal.value = false;
    }

    function createMacRule() {
      editingMacRule.value = {
        rule_number: 1,
        action: 'permit',
        mac_address: '',
        mac_mask: 'ff:ff:ff:ff:ff:ff',
        prefix: '',
      };
      showMacRuleModal.value = true;
    }

    function editMacRule() {
      if (!selectedMacRules.value.length) return alert('请选择要编辑的规则');
      const row = editingMacAcl.value.rules.find(r => r.rule_number === selectedMacRules.value[0]);
      if (!row) return alert('未找到选中的规则');
      editingMacRule.value = JSON.parse(JSON.stringify(row));
      showMacRuleModal.value = true;
    }

    function removeMacRule() {
      if (!selectedMacRules.value.length) return alert('请选择要删除的规则');
      editingMacAcl.value.rules = editingMacAcl.value.rules.filter(r => r.rule_number !== selectedMacRules.value[0]);
      selectedMacRules.value = [];
    }

    function saveMacRule() {
      if (!editingMacRule.value.rule_number) return alert('请输入规则号');
      const list = editingMacAcl.value.rules;
      const idx = list.findIndex(r => r._rule_number === editingMacRule.value._rule_number);
      if (idx >= 0) list.splice(idx, 1, { ...editingMacRule.value });
      else list.push({ ...editingMacRule.value });
      editingMacAcl.value.rules = list;
      showMacRuleModal.value = false;
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      loading, saving, saved, config, activeTab, commandPath,
      ipAclColumns, ipRuleColumns, macAclColumns, macRuleColumns,
      selectedIpAcls, selectedIpRules, selectedMacAcls, selectedMacRules,
      showIpAclModal, editingIpAcl, showIpRuleModal, editingIpRule, currentIpAcl,
      showMacAclModal, editingMacAcl, showMacRuleModal, editingMacRule, currentMacAcl,
      load, save,
      createIpAcl, editIpAcl, removeIpAcl, saveIpAcl,
      createIpRule, editIpRule, removeIpRule, saveIpRule,
      createMacAcl, editMacAcl, removeMacAcl, saveMacAcl,
      createMacRule, editMacRule, removeMacRule, saveMacRule,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'ip-acl', title: 'IP ACL' },
        { key: 'mac-ip-acl', title: 'MAC-IP ACL' }
      ]">

      <template #ip-acl>
        <div style="font-weight:bold;margin:16px 0 8px;">IP ACL列表</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createIpAcl">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editIpAcl" :disabled="!selectedIpAcls.length || selectedIpAcls.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeIpAcl" :disabled="!selectedIpAcls.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="ipAclColumns" :data="config.ip_acls" rowKey="name" :externalToolbar="true" @selection-change="selectedIpAcls = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'rule_count'">
              {{ record.rules ? record.rules.length : 0 }}
            </template>
          </template>
        </DataTable>

        <div v-if="editingIpAcl && showIpAclModal" style="margin-top:16px;">
          <div style="font-weight:bold;margin:16px 0 8px;">规则管理 ({{ editingIpAcl.name }})</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createIpRule">添加规则</ToolbarButton>
            <ToolbarButton icon="edit" @click="editIpRule" :disabled="!selectedIpRules.length || selectedIpRules.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeIpRule" :disabled="!selectedIpRules.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="ipRuleColumns" :data="editingIpAcl.rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedIpRules = $event" :selectable="true" />
        </div>
      </template>

      <template #mac-ip-acl>
        <div style="font-weight:bold;margin:16px 0 8px;">MAC-IP ACL列表</div>
        <div class="toolbar">
          <ToolbarButton icon="create" @click="createMacAcl">创建</ToolbarButton>
          <ToolbarButton icon="edit" @click="editMacAcl" :disabled="!selectedMacAcls.length || selectedMacAcls.length > 1">编辑</ToolbarButton>
          <ToolbarButton icon="delete" @click="removeMacAcl" :disabled="!selectedMacAcls.length">删除</ToolbarButton>
        </div>
        <DataTable :columns="macAclColumns" :data="config.mac_ip_acls" rowKey="name" :externalToolbar="true" @selection-change="selectedMacAcls = $event" :selectable="true">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'rule_count'">
              {{ record.rules ? record.rules.length : 0 }}
            </template>
          </template>
        </DataTable>

        <div v-if="editingMacAcl && showMacAclModal" style="margin-top:16px;">
          <div style="font-weight:bold;margin:16px 0 8px;">规则管理 ({{ editingMacAcl.name }})</div>
          <div class="toolbar">
            <ToolbarButton icon="create" @click="createMacRule">添加规则</ToolbarButton>
            <ToolbarButton icon="edit" @click="editMacRule" :disabled="!selectedMacRules.length || selectedMacRules.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeMacRule" :disabled="!selectedMacRules.length">删除</ToolbarButton>
          </div>
          <DataTable :columns="macRuleColumns" :data="editingMacAcl.rules" rowKey="rule_number" :externalToolbar="true" @selection-change="selectedMacRules = $event" :selectable="true" />
        </div>
      </template>
      </TabGroup>

      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</ToolbarButton>
      </div>

      <DraggableModal v-model:visible="showIpAclModal" :title="editingIpAcl && editingIpAcl._name ? '编辑IP ACL' : '新建IP ACL'" @confirm="saveIpAcl" @close="showIpAclModal = false" width="800px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingIpAcl.name" :disabled="editingIpAcl._name" title="ACL名称" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingIpAcl.description" title="ACL描述" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showIpRuleModal" :title="editingIpRule && editingIpRule._rule_number ? '编辑规则' : '添加规则'" @confirm="saveIpRule" @close="showIpRuleModal = false" width="700px">
        <div class="form-row"><label class="form-label">规则号</label><input class="form-control" type="number" min="1" max="4294967295" v-model="editingIpRule.rule_number" :disabled="editingIpRule._rule_number" title="规则编号" /></div>
        <div class="form-row"><label class="form-label">动作</label>
          <select class="form-control" v-model="editingIpRule.action" title="规则动作">
            <option value="permit">允许</option>
            <option value="deny">拒绝</option>
            <option value="permit-reflect">允许并反射</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">协议</label>
          <select class="form-control" v-model="editingIpRule.protocol" title="IP协议">
            <option value="all">所有</option>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">源地址</label><input class="form-control" v-model="editingIpRule.source_prefix" placeholder="x.x.x.x/x" title="源IP前缀" /></div>
        <div class="form-row"><label class="form-label">源端口</label><input class="form-control" v-model="editingIpRule.source_port" placeholder="1-65535" title="源端口" /></div>
        <div class="form-row"><label class="form-label">目的地址</label><input class="form-control" v-model="editingIpRule.dest_prefix" placeholder="x.x.x.x/x" title="目的IP前缀" /></div>
        <div class="form-row"><label class="form-label">目的端口</label><input class="form-control" v-model="editingIpRule.dest_port" placeholder="1-65535" title="目的端口" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showMacAclModal" :title="editingMacAcl && editingMacAcl._name ? '编辑MAC-IP ACL' : '新建MAC-IP ACL'" @confirm="saveMacAcl" @close="showMacAclModal = false" width="800px">
        <div class="form-row"><label class="form-label">名称</label><input class="form-control" v-model="editingMacAcl.name" :disabled="editingMacAcl._name" title="ACL名称" /></div>
        <div class="form-row"><label class="form-label">描述</label><input class="form-control" v-model="editingMacAcl.description" title="ACL描述" /></div>
      </DraggableModal>

      <DraggableModal v-model:visible="showMacRuleModal" :title="editingMacRule && editingMacRule._rule_number ? '编辑规则' : '添加规则'" @confirm="saveMacRule" @close="showMacRuleModal = false" width="600px">
        <div class="form-row"><label class="form-label">规则号</label><input class="form-control" type="number" min="1" max="4294967295" v-model="editingMacRule.rule_number" :disabled="editingMacRule._rule_number" title="规则编号" /></div>
        <div class="form-row"><label class="form-label">动作</label>
          <select class="form-control" v-model="editingMacRule.action" title="规则动作">
            <option value="permit">允许</option>
            <option value="deny">拒绝</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">MAC地址</label><input class="form-control" v-model="editingMacRule.mac_address" placeholder="xx:xx:xx:xx:xx:xx" title="MAC地址" /></div>
        <div class="form-row"><label class="form-label">MAC掩码</label><input class="form-control" v-model="editingMacRule.mac_mask" placeholder="ff:ff:ff:ff:ff:ff" title="MAC掩码" /></div>
        <div class="form-row"><label class="form-label">IP前缀</label><input class="form-control" v-model="editingMacRule.prefix" placeholder="x.x.x.x/x" title="IP前缀" /></div>
      </DraggableModal>
    </div>
  `,
});
