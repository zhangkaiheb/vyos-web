import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const ACTION_OPTIONS = [
  { value: 'permit', label: 'permit' },
  { value: 'deny', label: 'deny' },
];

const ORIGIN_OPTIONS = [
  { value: 'igp', label: 'igp' },
  { value: 'egp', label: 'egp' },
  { value: 'incomplete', label: 'incomplete' },
];

const PROTOCOL_OPTIONS = [
  { value: 'babel', label: 'Babel' },
  { value: 'bgp', label: 'BGP' },
  { value: 'connected', label: 'Connected' },
  { value: 'isis', label: 'IS-IS' },
  { value: 'kernel', label: 'Kernel' },
  { value: 'ospf', label: 'OSPF' },
  { value: 'ospfv3', label: 'OSPFv3' },
  { value: 'rip', label: 'RIP' },
  { value: 'ripng', label: 'RIPng' },
  { value: 'static', label: 'Static' },
  { value: 'table', label: 'Table' },
  { value: 'vnc', label: 'VNC' },
];

const RPKI_OPTIONS = [
  { value: 'valid', label: 'valid' },
  { value: 'notfound', label: 'notfound' },
  { value: 'invalid', label: 'invalid' },
];

const NEXTHOP_TYPE_OPTIONS = [
  { value: 'blackhole', label: 'blackhole' },
];

const METRIC_TYPE_OPTIONS = [
  { value: 'type-1', label: 'type-1 (OSPF external type 1)' },
  { value: 'type-2', label: 'type-2 (OSPF external type 2)' },
];

const RULE_TABS = [
  { key: 'basic', title: '基本' },
  { key: 'match', title: '匹配条件' },
  { key: 'set', title: '设置属性' },
  { key: 'onmatch', title: '匹配后操作' },
];

export default defineComponent({
  name: 'RouteMapPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const lists = ref([]);
    const loading = ref(false);
    const selectedListNames = ref([]);
    const selectedRuleNumbers = ref([]);

    const prefixLists = ref([]);
    const prefixLists6 = ref([]);
    const accessLists = ref([]);
    const communityLists = ref([]);
    const extcommunityLists = ref([]);
    const largeCommunityLists = ref([]);
    const asPathLists = ref([]);
    const routeMaps = ref([]);

    const listModalVisible = ref(false);
    const editingList = ref(null);
    const editingListOriginalName = ref('');

    const ruleModalVisible = ref(false);
    const editingRule = ref(null);
    const editingRuleOriginalNumber = ref('');
    const ruleActiveTab = ref('basic');

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => !!editingList.value?.name);

    const listColumns = [
      { key: 'name', title: '名称' },
      { key: 'description', title: '描述' },
      { key: 'ruleCount', title: '规则数' },
    ];

    const ruleColumns = [
      { key: 'rule', title: '规则编号' },
      { key: 'action', title: '动作' },
      { key: 'description', title: '描述' },
    ];

    const listSchema = computed(() => [
      { key: 'name', title: '名称', type: 'text', required: true, placeholder: '例如: rm01' },
      { key: 'description', title: '描述', type: 'text' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: '规则编号', type: 'number', min: 1, max: 65535, required: true, help: '范围 1-65535' },
      { key: 'action', title: '动作', type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: '描述', type: 'text' },
      { key: 'call', title: '调用路由映射', type: 'select', options: routeMaps.value.map(rm => ({ value: rm, label: rm })), placeholder: '选择路由映射', advanced: true },
      { key: 'continue', title: '继续规则编号', type: 'number', min: 1, max: 65535, placeholder: '跳转到指定规则', help: '范围 1-65535', advanced: true },
    ]);

    const ruleTabSchemas = computed(() => ({
      basic: basicRuleSchema.value,
    }));

    // Match fields
    const matchFields = computed(() => ({
      ipAddrPrefixList: '',
      ipAddrAccessList: '',
      ipNexthopPrefixList: '',
      ipNexthopAccessList: '',
      ipNexthopType: '',
      ipv6AddrPrefixList: '',
      ipv6NexthopPrefixList: '',
      communityList: '',
      communityExactMatch: false,
      extcommunityList: '',
      largeCommunityList: '',
      asPath: '',
      interface: '',
      localPreference: '',
      metric: '',
      origin: '',
      peer: '',
      protocol: '',
      rpki: '',
      tag: '',
    }));

    // Set fields
    const setFields = computed(() => ({
      aggregator: '',
      asPathPrepend: '',
      atomicAggregate: false,
      communityAction: '',
      communityList: '',
      distance: '',
      extcommunityAction: '',
      extcommunityList: '',
      ipNextHop: '',
      ipv6NextHop: '',
      largeCommunityAction: '',
      largeCommunityList: '',
      localPreference: '',
      metric: '',
      metricType: '',
      origin: '',
      originatorId: '',
      src: '',
      table: '',
      tag: '',
      weight: '',
    }));

    // On-match fields
    const onMatchFields = computed(() => ({
      goto: '',
      next: false,
    }));

    async function loadReferenceData() {
      try {
        const [pl, pl6, al, cl, ecl, lcl, apl, rm] = await Promise.all([
          configStore.getConfig('policy prefix-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy prefix-list6', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy access-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy community-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy extcommunity-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy large-community-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy as-path-list', false).catch(() => ({ data: {} })),
          configStore.getConfig('policy route-map', false).catch(() => ({ data: {} })),
        ]);
        prefixLists.value = Object.keys(pl.data || {});
        prefixLists6.value = Object.keys(pl6.data || {});
        accessLists.value = Object.keys(al.data || {});
        communityLists.value = Object.keys(cl.data || {});
        extcommunityLists.value = Object.keys(ecl.data || {});
        largeCommunityLists.value = Object.keys(lcl.data || {});
        asPathLists.value = Object.keys(apl.data || {});
        routeMaps.value = Object.keys(rm.data || {});
      } catch (e) { /* ignore */ }
    }

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, true);
        const raw = res.data || {};
        const result = [];
        for (const [name, attrs] of Object.entries(raw)) {
          const rules = attrs.rule || {};
          result.push({
            id: name, name,
            description: attrs.description || '',
            ruleCount: Object.keys(rules).length,
            rules,
          });
        }
        result.sort((a, b) => a.name.localeCompare(b.name));
        lists.value = result;
        if (selectedListNames.value.length && !result.some(l => l.name === selectedListNames.value[0])) {
          selectedListNames.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => { load(); loadReferenceData(); });
    watch(() => route.path, () => {
      selectedListNames.value = [];
      selectedRuleNumbers.value = [];
      load();
      loadReferenceData();
    });

    function emptyList() { return { name: '', description: '', rules: [] }; }

    function emptyRule() {
      return {
        rule: '', action: '', description: '', call: '', continue: '',
        match: {}, set: {}, onMatch: {},
      };
    }

    // Flatten raw rule data to editing form
    function flattenRuleData(num, attrs) {
      const m = attrs.match || {};
      const s = attrs.set || {};
      const om = attrs['on-match'] || {};
      return {
        rule: num,
        action: attrs.action || '',
        description: attrs.description || '',
        call: attrs.call || '',
        continue: attrs.continue || '',
        // Match
        ipAddrPrefixList: m.ip?.address?.['prefix-list'] || '',
        ipAddrAccessList: m.ip?.address?.['access-list'] || '',
        ipNexthopPrefixList: m.ip?.nexthop?.['prefix-list'] || '',
        ipNexthopAccessList: m.ip?.nexthop?.['access-list'] || '',
        ipNexthopType: m.ip?.nexthop?.type || '',
        ipv6AddrPrefixList: m.ipv6?.address?.['prefix-list'] || '',
        ipv6NexthopPrefixList: m.ipv6?.nexthop?.['prefix-list'] || '',
        communityList: m.community?.['community-list'] || '',
        communityExactMatch: !!m.community?.['exact-match'],
        extcommunityList: m.extcommunity || '',
        largeCommunityList: m['large-community'] || '',
        asPath: m['as-path'] || '',
        interface: m.interface || '',
        localPreference: m['local-preference'] || '',
        metric: m.metric || '',
        origin: m.origin || '',
        peer: m.peer || '',
        protocol: m.protocol || '',
        rpki: m.rpki || '',
        tag: m.tag || '',
        // Set
        aggregator: s.aggregator || '',
        asPathPrepend: s['as-path'] || '',
        atomicAggregate: !!s['atomic-aggregate'],
        communityAction: s.community ? (s.community.add ? 'add' : s.community.delete ? 'delete' : s.community.none ? 'none' : s.community.replace ? 'replace' : '') : '',
        communityList: s.community?.list || '',
        distance: s.distance || '',
        extcommunityAction: s.extcommunity ? (s.extcommunity.add ? 'add' : s.extcommunity.delete ? 'delete' : s.extcommunity.none ? 'none' : s.extcommunity.replace ? 'replace' : '') : '',
        extcommunityList: s.extcommunity?.list || '',
        ipNextHop: s['ip-next-hop'] || '',
        ipv6NextHop: s['ipv6-next-hop'] || '',
        largeCommunityAction: s['large-community'] ? (s['large-community'].add ? 'add' : s['large-community'].delete ? 'delete' : s['large-community'].none ? 'none' : s['large-community'].replace ? 'replace' : '') : '',
        largeCommunityList: s['large-community']?.list || '',
        localPreference: s['local-preference'] || '',
        metric: s.metric || '',
        metricType: s['metric-type'] || '',
        origin: s.origin || '',
        originatorId: s['originator-id'] || '',
        src: s.src || '',
        table: s.table || '',
        tag: s.tag || '',
        weight: s.weight || '',
        // On-match
        goto: om.goto || '',
        next: !!om.next,
      };
    }

    // Reconstruct raw rule data from editing form
    function unflattenRuleData(r) {
      const result = { action: r.action || '' };
      if (r.description) result.description = r.description;
      if (r.call) result.call = r.call;
      if (r.continue) result.continue = r.continue;

      // Match
      const match = {};
      if (r.ipAddrPrefixList || r.ipAddrAccessList) {
        match.ip = match.ip || {};
        match.ip.address = {};
        if (r.ipAddrPrefixList) match.ip.address['prefix-list'] = r.ipAddrPrefixList;
        if (r.ipAddrAccessList) match.ip.address['access-list'] = r.ipAddrAccessList;
      }
      if (r.ipNexthopPrefixList || r.ipNexthopAccessList || r.ipNexthopType) {
        match.ip = match.ip || {};
        match.ip.nexthop = {};
        if (r.ipNexthopPrefixList) match.ip.nexthop['prefix-list'] = r.ipNexthopPrefixList;
        if (r.ipNexthopAccessList) match.ip.nexthop['access-list'] = r.ipNexthopAccessList;
        if (r.ipNexthopType) match.ip.nexthop.type = r.ipNexthopType;
      }
      if (r.ipv6AddrPrefixList) {
        match.ipv6 = match.ipv6 || {};
        match.ipv6.address = { 'prefix-list': r.ipv6AddrPrefixList };
      }
      if (r.ipv6NexthopPrefixList) {
        match.ipv6 = match.ipv6 || {};
        match.ipv6.nexthop = { 'prefix-list': r.ipv6NexthopPrefixList };
      }
      if (r.communityList || r.communityExactMatch) {
        match.community = {};
        if (r.communityList) match.community['community-list'] = r.communityList;
        if (r.communityExactMatch) match.community['exact-match'] = {};
      }
      if (r.extcommunityList) match.extcommunity = r.extcommunityList;
      if (r.largeCommunityList) match['large-community'] = r.largeCommunityList;
      if (r.asPath) match['as-path'] = r.asPath;
      if (r.interface) match.interface = r.interface;
      if (r.localPreference) match['local-preference'] = r.localPreference;
      if (r.metric) match.metric = r.metric;
      if (r.origin) match.origin = r.origin;
      if (r.peer) match.peer = r.peer;
      if (r.protocol) match.protocol = r.protocol;
      if (r.rpki) match.rpki = r.rpki;
      if (r.tag) match.tag = r.tag;
      if (Object.keys(match).length) result.match = match;

      // Set
      const set = {};
      if (r.aggregator) set.aggregator = r.aggregator;
      if (r.asPathPrepend) set['as-path'] = r.asPathPrepend;
      if (r.atomicAggregate) set['atomic-aggregate'] = {};
      if (r.communityAction && r.communityList) {
        set.community = {};
        set.community[r.communityAction] = {};
        set.community.list = r.communityList;
      }
      if (r.distance) set.distance = r.distance;
      if (r.extcommunityAction && r.extcommunityList) {
        set.extcommunity = {};
        set.extcommunity[r.extcommunityAction] = {};
        set.extcommunity.list = r.extcommunityList;
      }
      if (r.ipNextHop) set['ip-next-hop'] = r.ipNextHop;
      if (r.ipv6NextHop) set['ipv6-next-hop'] = r.ipv6NextHop;
      if (r.largeCommunityAction && r.largeCommunityList) {
        set['large-community'] = {};
        set['large-community'][r.largeCommunityAction] = {};
        set['large-community'].list = r.largeCommunityList;
      }
      if (r.localPreference) set['local-preference'] = r.localPreference;
      if (r.metric) set.metric = r.metric;
      if (r.metricType) set['metric-type'] = r.metricType;
      if (r.origin) set.origin = r.origin;
      if (r.originatorId) set['originator-id'] = r.originatorId;
      if (r.src) set.src = r.src;
      if (r.table) set.table = r.table;
      if (r.tag) set.tag = r.tag;
      if (r.weight) set.weight = r.weight;
      if (Object.keys(set).length) result.set = set;

      // On-match
      const onMatch = {};
      if (r.goto) onMatch.goto = r.goto;
      if (r.next) onMatch.next = {};
      if (Object.keys(onMatch).length) result['on-match'] = onMatch;

      return result;
    }

    async function loadListRules(listName) {
      try {
        const res = await configStore.getConfig(`${path.value} ${listName} rule`, true);
        const raw = res.data || {};
        editingList.value.rules = Object.entries(raw).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', description: attrs.description || '',
        }));
      } catch (e) { showError(e); }
    }

    function createList() { editingList.value = emptyList(); editingListOriginalName.value = ''; selectedRuleNumbers.value = []; listModalVisible.value = true; }

    async function editList() {
      if (!selectedListNames.value.length) return showError({ message: '请选择一个路由映射' });
      if (selectedListNames.value.length > 1) return showError({ message: '请选择一个路由映射' });
      const list = lists.value.find(l => l.name === selectedListNames.value[0]);
      if (!list) return;
      editingList.value = {
        name: list.name, description: list.description,
        rules: Object.entries(list.rules).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', description: attrs.description || '',
        })),
      };
      editingListOriginalName.value = list.name;
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    async function removeList() {
      if (!selectedListNames.value.length) return showError({ message: '请选择一个路由映射' });
      if (!confirm('确认删除选中的路由映射及其所有规则？')) return;
      for (const name of selectedListNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
      }
      await configStore.checkSessionChanged();
      selectedListNames.value = [];
      await load();
    }

    async function saveList() {
      if (!editingList.value.name) return showError({ message: '请输入名称' });
      const original = editingListOriginalName.value;
      if (!original && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: '名称已存在' });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && original !== editingList.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              rules[r.rule] = { action: r.action || '', ...(r.description ? { description: r.description } : {}) };
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, newValue);
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, value);
        }
        listModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    function createRule() {
      if (!editingList.value) return;
      if (!editingList.value.name) return showError({ message: '请先输入名称' });
      if (!editingListOriginalName.value && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: '名称已存在' });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: '请选择一条规则' });
      if (selectedRuleNumbers.value.length > 1) return showError({ message: '请选择一条规则' });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      // Load full rule data
      editingRule.value = flattenRuleData(row.rule, row._raw || {});
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    async function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: '请选择一条规则' });
      if (!confirm('确认删除选中的规则？')) return;
      const listName = editingList.value.name;
      for (const num of selectedRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listName} rule ${num}`);
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      await loadListRules(listName);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return '请输入规则编号';
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return '规则编号范围 1-65535';
      if (!r.action) return '请选择动作';
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      if (!editingList.value) return;
      const listName = editingList.value.name;
      const original = editingRuleOriginalNumber.value;
      if (!original && editingList.value.rules.some(r => String(r.rule) === String(editingRule.value.rule))) {
        return showError({ message: '规则编号已存在' });
      }
      const value = unflattenRuleData(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listName} rule ${original}`);
        }
        await configStore.setConfig(`${path.value} ${listName} rule ${editingRule.value.rule}`, value);
        ruleModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
        if (listModalVisible.value) {
          await loadListRules(listName);
        }
      } catch (e) {
        showError(e);
      }
    }

    // Load full rule data when editing
    async function loadRuleData(listName, ruleNum) {
      try {
        const res = await configStore.getConfig(`${path.value} ${listName} rule ${ruleNum}`, true);
        return res.data || {};
      } catch (e) {
        return {};
      }
    }

    // Override editList to also load raw rule data
    async function editListWithRaw() {
      if (!selectedListNames.value.length) return showError({ message: '请选择一个路由映射' });
      if (selectedListNames.value.length > 1) return showError({ message: '请选择一个路由映射' });
      const list = lists.value.find(l => l.name === selectedListNames.value[0]);
      if (!list) return;
      // Load raw rules
      const rawRules = list.rules;
      editingList.value = {
        name: list.name, description: list.description,
        rules: Object.entries(rawRules).map(([num, attrs]) => ({
          rule: num, action: attrs.action || '', description: attrs.description || '',
          _raw: attrs,
        })),
      };
      editingListOriginalName.value = list.name;
      selectedRuleNumbers.value = [];
      listModalVisible.value = true;
    }

    return {
      lists, loading, selectedListNames, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalName,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      listColumns, ruleColumns, listSchema, ruleTabs: RULE_TABS, ruleTabSchemas,
      path, writeDisabled, canCreateRule, ACTION_OPTIONS, ORIGIN_OPTIONS, PROTOCOL_OPTIONS, RPKI_OPTIONS, NEXTHOP_TYPE_OPTIONS, METRIC_TYPE_OPTIONS,
      prefixLists, prefixLists6, accessLists, communityLists, extcommunityLists, largeCommunityLists, asPathLists, routeMaps,
      load, loadReferenceData, createList, editList: editListWithRaw, removeList, saveList,
      createRule, editRule, removeRule, saveRule, loadListRules, loadRuleData,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">创建</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNames.length || selectedListNames.length > 1">编辑</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNames.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalName ? '编辑' : '创建'" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">规则</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">创建</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">编辑</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">删除</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="editingList.rules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? '编辑规则' : '创建规则'" width="900px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #match>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-section-title">IP 地址匹配</div>
              <div class="form-row">
                <label class="form-label">IPv4 前缀列表</label>
                <select class="form-control" v-model="editingRule.ipAddrPrefixList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in prefixLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">IPv4 访问列表</label>
                <select class="form-control" v-model="editingRule.ipAddrAccessList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in accessLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">IPv4 下一跳前缀列表</label>
                <select class="form-control" v-model="editingRule.ipNexthopPrefixList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in prefixLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">IPv4 下一跳访问列表</label>
                <select class="form-control" v-model="editingRule.ipNexthopAccessList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in accessLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">IPv4 下一跳类型</label>
                <select class="form-control" v-model="editingRule.ipNexthopType" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in NEXTHOP_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-section-title">IPv6 地址匹配</div>
              <div class="form-row">
                <label class="form-label">IPv6 前缀列表</label>
                <select class="form-control" v-model="editingRule.ipv6AddrPrefixList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in prefixLists6" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">IPv6 下一跳前缀列表</label>
                <select class="form-control" v-model="editingRule.ipv6NexthopPrefixList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in prefixLists6" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-section-title">BGP 匹配</div>
              <div class="form-row">
                <label class="form-label">团体列表</label>
                <select class="form-control" v-model="editingRule.communityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in communityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">精确匹配团体</label>
                <input type="checkbox" v-model="editingRule.communityExactMatch" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">扩展团体列表</label>
                <select class="form-control" v-model="editingRule.extcommunityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in extcommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">大型团体列表</label>
                <select class="form-control" v-model="editingRule.largeCommunityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in largeCommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">AS 路径列表</label>
                <select class="form-control" v-model="editingRule.asPath" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in asPathLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Origin</label>
                <select class="form-control" v-model="editingRule.origin" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in ORIGIN_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Peer 地址</label>
                <input type="text" class="form-control" v-model="editingRule.peer" placeholder="Peer 地址" style="width:100%;" />
              </div>
              <div class="form-section-title">其他匹配</div>
              <div class="form-row">
                <label class="form-label">接口</label>
                <input type="text" class="form-control" v-model="editingRule.interface" placeholder="接口名称" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">Local Preference</label>
                <input type="number" class="form-control" v-model="editingRule.localPreference" min="0" max="4294967295" placeholder="本地优先级值" style="width:100%;" />
                <small class="form-text text-muted">范围 0-4294967295</small>
              </div>
              <div class="form-row">
                <label class="form-label">Metric</label>
                <input type="number" class="form-control" v-model="editingRule.metric" min="1" max="65535" placeholder="Metric 值" style="width:100%;" />
                <small class="form-text text-muted">范围 1-65535</small>
              </div>
              <div class="form-row">
                <label class="form-label">协议</label>
                <select class="form-control" v-model="editingRule.protocol" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <small class="form-text text-muted">选择路由协议</small>
              </div>
              <div class="form-row">
                <label class="form-label">RPKI</label>
                <select class="form-control" v-model="editingRule.rpki" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in RPKI_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Tag</label>
                <input type="number" class="form-control" v-model="editingRule.tag" min="1" max="65535" placeholder="路由标签值" style="width:100%;" />
                <small class="form-text text-muted">范围 1-65535</small>
              </div>
            </div>
          </template>
          <template #set>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-section-title">BGP 属性设置</div>
              <div class="form-row">
                <label class="form-label">Aggregator</label>
                <input type="text" class="form-control" v-model="editingRule.aggregator" placeholder="例如: 65001 10.0.0.1" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">AS Path Prepend</label>
                <input type="text" class="form-control" v-model="editingRule.asPathPrepend" placeholder="AS 号列表" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">Atomic Aggregate</label>
                <input type="checkbox" v-model="editingRule.atomicAggregate" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">Community 操作</label>
                <select class="form-control" v-model="editingRule.communityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">请选择</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.communityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in communityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">扩展团体操作</label>
                <select class="form-control" v-model="editingRule.extcommunityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">请选择</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.extcommunityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in extcommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">大型团体操作</label>
                <select class="form-control" v-model="editingRule.largeCommunityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">请选择</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.largeCommunityList" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in largeCommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Local Preference</label>
                <input type="number" class="form-control" v-model="editingRule.localPreference" min="0" max="4294967295" placeholder="本地优先级值" style="width:100%;" />
                <small class="form-text text-muted">范围 0-4294967295</small>
              </div>
              <div class="form-row">
                <label class="form-label">Origin</label>
                <select class="form-control" v-model="editingRule.origin" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in ORIGIN_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Originator ID</label>
                <input type="text" class="form-control" v-model="editingRule.originatorId" placeholder="Originator ID" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">Weight</label>
                <input type="number" class="form-control" v-model="editingRule.weight" min="0" max="4294967295" placeholder="BGP weight" style="width:100%;" />
                <small class="form-text text-muted">范围 0-4294967295</small>
              </div>
              <div class="form-section-title">路由属性设置</div>
              <div class="form-row">
                <label class="form-label">Distance</label>
                <input type="number" class="form-control" v-model="editingRule.distance" min="0" max="255" placeholder="管理距离" style="width:100%;" />
                <small class="form-text text-muted">范围 0-255</small>
              </div>
              <div class="form-row">
                <label class="form-label">IPv4 下一跳</label>
                <input type="text" class="form-control" v-model="editingRule.ipNextHop" placeholder="下一跳 IP 地址" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">IPv6 下一跳</label>
                <input type="text" class="form-control" v-model="editingRule.ipv6NextHop" placeholder="下一跳 IPv6 地址" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">Metric</label>
                <input type="text" class="form-control" v-model="editingRule.metric" placeholder="例如: 100 或 +10 或 -10" style="width:100%;" />
                <small class="form-text text-muted">例如: 100 或 +10 或 -10</small>
              </div>
              <div class="form-row">
                <label class="form-label">Metric Type</label>
                <select class="form-control" v-model="editingRule.metricType" style="width:100%;">
                  <option value="">请选择</option>
                  <option v-for="opt in METRIC_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">Source</label>
                <input type="text" class="form-control" v-model="editingRule.src" placeholder="源地址" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">Table</label>
                <input type="number" class="form-control" v-model="editingRule.table" min="1" max="4294967295" placeholder="路由表名称" style="width:100%;" />
                <small class="form-text text-muted">范围 1-4294967295</small>
              </div>
              <div class="form-row">
                <label class="form-label">Tag</label>
                <input type="number" class="form-control" v-model="editingRule.tag" min="1" max="65535" placeholder="路由标签值" style="width:100%;" />
                <small class="form-text text-muted">范围 1-65535</small>
              </div>
            </div>
          </template>
          <template #onmatch>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">Goto 规则编号</label>
                <input type="number" class="form-control" v-model="editingRule.goto" min="1" max="65535" placeholder="跳转到指定规则编号" style="width:100%;" />
                <small class="form-text text-muted">范围 1-65535</small>
              </div>
              <div class="form-row">
                <label class="form-label">Next (下一条规则)</label>
                <input type="checkbox" v-model="editingRule.next" style="margin-left:8px;" />
              </div>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
