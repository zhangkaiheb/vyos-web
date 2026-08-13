import { defineComponent, ref, computed, onMounted, watch } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useI18n } from '/src/i18n/index.js';

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

const getRuleTabs = (t) => [
  { key: 'basic', title: t('routeMap.tabs.basic') },
  { key: 'match', title: t('routeMap.tabs.match') },
  { key: 'set', title: t('routeMap.tabs.set') },
  { key: 'onmatch', title: t('routeMap.tabs.onmatch') },
];

export default defineComponent({
  name: 'RouteMapPage',
  setup() {
    const route = useRoute();
    const configStore = useConfigStore();
    const { t } = useI18n();
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

    const deleteModalVisible = ref(false);
    const pendingDeleteNames = ref([]);
    const ruleDeleteModalVisible = ref(false);
    const pendingDeleteRuleNumbers = ref([]);

    const path = computed(() => route.path.replace(/^\//, '').replace(/\//g, ' '));
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    const canCreateRule = computed(() => !!editingList.value?.name);

    const listColumns = computed(() => [
      { key: 'name', title: t('routeMap.columns.name') },
      { key: 'description', title: t('routeMap.columns.description') },
      { key: 'ruleCount', title: t('routeMap.columns.ruleCount') },
    ]);

    const ruleColumns = computed(() => [
      { key: 'rule', title: t('routeMap.columns.rule') },
      { key: 'action', title: t('routeMap.columns.action') },
      { key: 'description', title: t('routeMap.columns.description') },
    ]);

    const listSchema = computed(() => [
      { key: 'name', title: t('routeMap.form.name'), type: 'text', required: true, placeholder: t('routeMap.form.namePlaceholder') },
      { key: 'description', title: t('routeMap.form.description'), type: 'text' },
    ]);

    const basicRuleSchema = computed(() => [
      { key: 'rule', title: t('routeMap.form.rule'), type: 'number', min: 1, max: 65535, required: true, help: t('routeMap.form.ruleHelp') },
      { key: 'action', title: t('routeMap.form.action'), type: 'select', options: ACTION_OPTIONS, required: true },
      { key: 'description', title: t('routeMap.form.description'), type: 'text' },
      { key: 'call', title: t('routeMap.form.call'), type: 'select', options: routeMaps.value.map(rm => ({ value: rm, label: rm })), placeholder: t('routeMap.form.callPlaceholder'), advanced: true },
      { key: 'continue', title: t('routeMap.form.continue'), type: 'number', min: 1, max: 65535, placeholder: t('routeMap.form.continuePlaceholder'), help: t('routeMap.form.ruleHelp'), advanced: true },
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

    onMounted(() => { load(); loadReferenceData(); onMenuRefresh(load); });
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
      if (!selectedListNames.value.length) return showError({ message: t('routeMap.messages.selectRouteMap') });
      if (selectedListNames.value.length > 1) return showError({ message: t('routeMap.messages.selectRouteMap') });
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

    function removeList() {
      if (!selectedListNames.value.length) return showError({ message: t('routeMap.messages.selectRouteMap') });
      pendingDeleteNames.value = [...selectedListNames.value];
      deleteModalVisible.value = true;
    }

    async function confirmRemoveList() {
      deleteModalVisible.value = false;
      for (const name of pendingDeleteNames.value) {
        await configStore.deleteConfig(`${path.value} ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedListNames.value = [];
      pendingDeleteNames.value = [];
      await load();
    }

    async function saveList() {
      if (!editingList.value.name) return showError({ message: t('routeMap.messages.enterName') });
      const original = editingListOriginalName.value;
      if (!original && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: t('routeMap.messages.nameExists') });
      }
      const value = {};
      if (editingList.value.description) value.description = editingList.value.description;
      try {
        if (original && original !== editingList.value.name) {
          await configStore.deleteConfig(`${path.value} ${original}`);
          configStore.markPending();
          const newValue = { ...value };
          if (editingList.value.rules?.length) {
            const rules = {};
            for (const r of editingList.value.rules) {
              rules[r.rule] = { action: r.action || '', ...(r.description ? { description: r.description } : {}) };
            }
            newValue.rule = rules;
          }
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, newValue);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} ${editingList.value.name}`, value);
          configStore.markPending();
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
      if (!editingList.value.name) return showError({ message: t('routeMap.messages.enterNameFirst') });
      if (!editingListOriginalName.value && lists.value.some(l => l.name === editingList.value.name)) {
        return showError({ message: t('routeMap.messages.nameExists') });
      }
      editingRule.value = emptyRule();
      editingRuleOriginalNumber.value = '';
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function editRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('routeMap.messages.selectRule') });
      if (selectedRuleNumbers.value.length > 1) return showError({ message: t('routeMap.messages.selectRule') });
      const row = editingList.value.rules.find(r => String(r.rule) === String(selectedRuleNumbers.value[0]));
      if (!row) return;
      // Load full rule data
      editingRule.value = flattenRuleData(row.rule, row._raw || {});
      editingRuleOriginalNumber.value = row.rule;
      ruleActiveTab.value = 'basic';
      ruleModalVisible.value = true;
    }

    function removeRule() {
      if (!editingList.value) return;
      if (!selectedRuleNumbers.value.length) return showError({ message: t('routeMap.messages.selectRule') });
      pendingDeleteRuleNumbers.value = [...selectedRuleNumbers.value];
      ruleDeleteModalVisible.value = true;
    }

    async function confirmRemoveRule() {
      ruleDeleteModalVisible.value = false;
      const listName = editingList.value.name;
      for (const num of pendingDeleteRuleNumbers.value) {
        await configStore.deleteConfig(`${path.value} ${listName} rule ${num}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedRuleNumbers.value = [];
      pendingDeleteRuleNumbers.value = [];
      await loadListRules(listName);
      await load();
    }

    function validateRule() {
      const r = editingRule.value;
      if (!r.rule) return t('routeMap.messages.enterRuleNumber');
      const n = parseInt(r.rule, 10);
      if (isNaN(n) || n < 1 || n > 65535) return t('routeMap.messages.ruleNumberRange');
      if (!r.action) return t('routeMap.messages.selectAction');
      return '';
    }

    async function saveRule() {
      const err = validateRule();
      if (err) return showError({ message: err });
      if (!editingList.value) return;
      const listName = editingList.value.name;
      const original = editingRuleOriginalNumber.value;
      if (!original && editingList.value.rules.some(r => String(r.rule) === String(editingRule.value.rule))) {
        return showError({ message: t('routeMap.messages.ruleNumberExists') });
      }
      const value = unflattenRuleData(editingRule.value);
      try {
        if (original && String(original) !== String(editingRule.value.rule)) {
          await configStore.deleteConfig(`${path.value} ${listName} rule ${original}`);
          configStore.markPending();
        }
        await configStore.setConfig(`${path.value} ${listName} rule ${editingRule.value.rule}`, value);
        configStore.markPending();
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
      if (!selectedListNames.value.length) return showError({ message: t('routeMap.messages.selectRouteMap') });
      if (selectedListNames.value.length > 1) return showError({ message: t('routeMap.messages.selectRouteMap') });
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

    return {t,
      
      lists, loading, selectedListNames, selectedRuleNumbers,
      listModalVisible, editingList, editingListOriginalName,
      ruleModalVisible, ruleActiveTab, editingRule, editingRuleOriginalNumber,
      listColumns, ruleColumns, listSchema, ruleTabs: computed(() => getRuleTabs(t)), ruleTabSchemas,
      path, writeDisabled, canCreateRule, ACTION_OPTIONS, ORIGIN_OPTIONS, PROTOCOL_OPTIONS, RPKI_OPTIONS, NEXTHOP_TYPE_OPTIONS, METRIC_TYPE_OPTIONS,
      prefixLists, prefixLists6, accessLists, communityLists, extcommunityLists, largeCommunityLists, asPathLists, routeMaps,
      deleteModalVisible, pendingDeleteNames, ruleDeleteModalVisible, pendingDeleteRuleNumbers,
      load, loadReferenceData, createList, editList: editListWithRaw, removeList, confirmRemoveList, saveList,
      createRule, editRule, removeRule, confirmRemoveRule, saveRule, loadListRules, loadRuleData,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="create" @click="createList" :disabled="writeDisabled">{{ t('routeMap.buttons.create') }}</ToolbarButton>
            <ToolbarButton icon="edit" @click="editList" :disabled="writeDisabled || !selectedListNames.length || selectedListNames.length > 1">{{ t('routeMap.buttons.edit') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="removeList" :disabled="writeDisabled || !selectedListNames.length">{{ t('routeMap.buttons.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="load">{{ t('routeMap.buttons.refresh') }}</ToolbarButton>
          </div>
        </div>
        <DataTable :columns="listColumns" :data="lists" :loading="loading" :disabled="writeDisabled"
                   @selection-change="selectedListNames = $event" :selectable="true" :externalToolbar="true" row-key="name">
        </DataTable>
      </div>
      <div class="section">
      </div>
      <DraggableModal v-model:visible="listModalVisible" :title="editingListOriginalName ? t('routeMap.modal.edit') : t('routeMap.modal.create')" width="780px" @confirm="saveList">
        <div>
          <ConfigForm v-model="editingList" :schema="listSchema" :disabled="writeDisabled" :showAdvanced="true" />
          <div style="margin-top:16px;">
            <div class="section-title" style="font-weight:bold;margin-bottom:8px;">{{ t('routeMap.buttons.rules') }}</div>
            <div class="toolbar toolbar-compact">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createRule" :disabled="writeDisabled || !canCreateRule">{{ t('routeMap.buttons.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editRule" :disabled="writeDisabled || !selectedRuleNumbers.length || selectedRuleNumbers.length > 1">{{ t('routeMap.buttons.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeRule" :disabled="writeDisabled || !selectedRuleNumbers.length">{{ t('routeMap.buttons.delete') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="ruleColumns" :data="editingList.rules" :disabled="writeDisabled"
                       @selection-change="selectedRuleNumbers = $event" :selectable="true" :externalToolbar="true" row-key="rule">
            </DataTable>
          </div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleModalVisible" :title="editingRuleOriginalNumber ? t('routeMap.modal.editRule') : t('routeMap.modal.createRule')" width="900px" @confirm="saveRule" modal-class="on-top">
        <TabGroup v-model="ruleActiveTab" :tabs="ruleTabs">
          <template #basic>
            <ConfigForm v-model="editingRule" :schema="ruleTabSchemas.basic" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
          <template #match>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-section-title">{{ t('routeMap.match.ipAddressMatch') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv4PrefixList') }}</label>
                <select class="form-control" v-model="editingRule.ipAddrPrefixList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in prefixLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv4AccessList') }}</label>
                <select class="form-control" v-model="editingRule.ipAddrAccessList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in accessLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv4NexthopPrefixList') }}</label>
                <select class="form-control" v-model="editingRule.ipNexthopPrefixList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in prefixLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv4NexthopAccessList') }}</label>
                <select class="form-control" v-model="editingRule.ipNexthopAccessList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in accessLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv4NexthopType') }}</label>
                <select class="form-control" v-model="editingRule.ipNexthopType" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in NEXTHOP_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-section-title">{{ t('routeMap.match.ipv6AddressMatch') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv6PrefixList') }}</label>
                <select class="form-control" v-model="editingRule.ipv6AddrPrefixList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in prefixLists6" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.ipv6NexthopPrefixList') }}</label>
                <select class="form-control" v-model="editingRule.ipv6NexthopPrefixList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in prefixLists6" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-section-title">{{ t('routeMap.match.bgpMatch') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.communityList') }}</label>
                <select class="form-control" v-model="editingRule.communityList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in communityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.communityExactMatch') }}</label>
                <input type="checkbox" v-model="editingRule.communityExactMatch" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.extcommunityList') }}</label>
                <select class="form-control" v-model="editingRule.extcommunityList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in extcommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.largeCommunityList') }}</label>
                <select class="form-control" v-model="editingRule.largeCommunityList" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in largeCommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.asPathList') }}</label>
                <select class="form-control" v-model="editingRule.asPath" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in asPathLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.origin') }}</label>
                <select class="form-control" v-model="editingRule.origin" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in ORIGIN_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.peerAddress') }}</label>
                <input type="text" class="form-control" v-model="editingRule.peer" :placeholder="t('routeMap.match.peerAddressPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-section-title">{{ t('routeMap.match.otherMatch') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.interface') }}</label>
                <input type="text" class="form-control" v-model="editingRule.interface" :placeholder="t('routeMap.match.interfacePlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.localPreference') }}</label>
                <input type="number" class="form-control" v-model="editingRule.localPreference" min="0" max="4294967295" :placeholder="t('routeMap.match.localPreferencePlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.match.localPreferenceHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.metric') }}</label>
                <input type="number" class="form-control" v-model="editingRule.metric" min="1" max="65535" :placeholder="t('routeMap.match.metricPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.match.metricHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.protocol') }}</label>
                <select class="form-control" v-model="editingRule.protocol" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in PROTOCOL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <small class="form-text text-muted">{{ t('routeMap.match.protocolHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.rpki') }}</label>
                <select class="form-control" v-model="editingRule.rpki" style="width:100%;">
                  <option value="">{{ t('routeMap.match.selectPlaceholder') }}</option>
                  <option v-for="opt in RPKI_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.match.tag') }}</label>
                <input type="number" class="form-control" v-model="editingRule.tag" min="1" max="65535" :placeholder="t('routeMap.match.tagPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.match.tagHelp') }}</small>
              </div>
            </div>
          </template>
          <template #set>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-section-title">{{ t('routeMap.set.bgpAttributeSet') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.aggregator') }}</label>
                <input type="text" class="form-control" v-model="editingRule.aggregator" :placeholder="t('routeMap.set.aggregatorPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.asPathPrepend') }}</label>
                <input type="text" class="form-control" v-model="editingRule.asPathPrepend" :placeholder="t('routeMap.set.asPathPrependPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.atomicAggregate') }}</label>
                <input type="checkbox" v-model="editingRule.atomicAggregate" style="margin-left:8px;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.communityAction') }}</label>
                <select class="form-control" v-model="editingRule.communityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.communityList" style="width:100%;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option v-for="opt in communityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.extcommunityAction') }}</label>
                <select class="form-control" v-model="editingRule.extcommunityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.extcommunityList" style="width:100%;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option v-for="opt in extcommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.largeCommunityAction') }}</label>
                <select class="form-control" v-model="editingRule.largeCommunityAction" style="width:100%;margin-bottom:4px;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option value="add">add</option>
                  <option value="delete">delete</option>
                  <option value="none">none</option>
                  <option value="replace">replace</option>
                </select>
                <select class="form-control" v-model="editingRule.largeCommunityList" style="width:100%;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option v-for="opt in largeCommunityLists" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.localPreference') }}</label>
                <input type="number" class="form-control" v-model="editingRule.localPreference" min="0" max="4294967295" :placeholder="t('routeMap.set.localPreferencePlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.localPreferenceHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.origin') }}</label>
                <select class="form-control" v-model="editingRule.origin" style="width:100%;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option v-for="opt in ORIGIN_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.originatorId') }}</label>
                <input type="text" class="form-control" v-model="editingRule.originatorId" :placeholder="t('routeMap.set.originatorIdPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.weight') }}</label>
                <input type="number" class="form-control" v-model="editingRule.weight" min="0" max="4294967295" :placeholder="t('routeMap.set.weightPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.weightHelp') }}</small>
              </div>
              <div class="form-section-title">{{ t('routeMap.set.routeAttributeSet') }}</div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.distance') }}</label>
                <input type="number" class="form-control" v-model="editingRule.distance" min="0" max="255" :placeholder="t('routeMap.set.distancePlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.distanceHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.ipv4Nexthop') }}</label>
                <input type="text" class="form-control" v-model="editingRule.ipNextHop" :placeholder="t('routeMap.set.ipv4NexthopPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.ipv6Nexthop') }}</label>
                <input type="text" class="form-control" v-model="editingRule.ipv6NextHop" :placeholder="t('routeMap.set.ipv6NexthopPlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.metric') }}</label>
                <input type="text" class="form-control" v-model="editingRule.metric" :placeholder="t('routeMap.set.metricPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.metricHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.metricType') }}</label>
                <select class="form-control" v-model="editingRule.metricType" style="width:100%;">
                  <option value="">{{ t('routeMap.set.selectPlaceholder') }}</option>
                  <option v-for="opt in METRIC_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.source') }}</label>
                <input type="text" class="form-control" v-model="editingRule.src" :placeholder="t('routeMap.set.sourcePlaceholder')" style="width:100%;" />
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.table') }}</label>
                <input type="number" class="form-control" v-model="editingRule.table" min="1" max="4294967295" :placeholder="t('routeMap.set.tablePlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.tableHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.set.tag') }}</label>
                <input type="number" class="form-control" v-model="editingRule.tag" min="1" max="65535" :placeholder="t('routeMap.set.tagPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.set.tagHelp') }}</small>
              </div>
            </div>
          </template>
          <template #onmatch>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.onmatch.gotoRule') }}</label>
                <input type="number" class="form-control" v-model="editingRule.goto" min="1" max="65535" :placeholder="t('routeMap.onmatch.gotoPlaceholder')" style="width:100%;" />
                <small class="form-text text-muted">{{ t('routeMap.onmatch.gotoHelp') }}</small>
              </div>
              <div class="form-row">
                <label class="form-label">{{ t('routeMap.onmatch.nextRule') }}</label>
                <input type="checkbox" v-model="editingRule.next" style="margin-left:8px;" />
              </div>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('routeMap.modal.confirmDelete')" width="400px" @confirm="confirmRemoveList">
        <div>{{ t('routeMap.modal.confirmDeleteList') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
      <DraggableModal v-model:visible="ruleDeleteModalVisible" :title="t('routeMap.modal.confirmDelete')" width="400px" @confirm="confirmRemoveRule">
        <div>{{ t('routeMap.modal.confirmDeleteRule') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="num in pendingDeleteRuleNumbers" :key="num" style="padding:2px 0;">{{ num }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
