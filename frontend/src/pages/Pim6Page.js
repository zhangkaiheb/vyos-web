import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { useConfigStore } from '/src/stores/config.js';
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

function validateIPv6(value, t) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+$/.test(value)) return t('pim6.validation.ipv6');
  return '';
}

function validateIPv6Prefix(value, t) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+\/\d{1,3}$/.test(value)) return t('pim6.validation.ipv6Prefix');
  return '';
}

function validateTimer(value, min, max, name, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return t('pim6.validation.timer', { name, min, max });
  return '';
}

function validatePriority(value, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4294967295) return t('pim6.validation.priority');
  return '';
}

// PIM6 config conversion
function configToForm(data = {}) {
  // Interface list
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    // MLD joins
    const joins = [];
    const joinData = attrs.mld?.join || {};
    for (const [groupAddr, joinAttrs] of Object.entries(joinData)) {
      joins.push({
        group: groupAddr,
        source: joinAttrs.source || '',
      });
    }

    interfaces.push({
      name: ifName,
      'dr-priority': attrs['dr-priority'] || '',
      hello: attrs.hello || '',
      'no-bsm': !!attrs['no-bsm'],
      'no-unicast-bsm': !!attrs['no-unicast-bsm'],
      passive: !!attrs.passive,
      mld: {
        disable: !!attrs.mld?.disable,
        interval: attrs.mld?.interval || '',
        'last-member-query-count': attrs.mld?.['last-member-query-count'] || '',
        'last-member-query-interval': attrs.mld?.['last-member-query-interval'] || '',
        'max-response-time': attrs.mld?.['max-response-time'] || '',
        version: attrs.mld?.version || '',
      },
      joins,
    });
  }

  // RP addresses
  const rpAddresses = [];
  const rpAddressData = data.rp?.address || {};
  for (const [rpAddr, rpAttrs] of Object.entries(rpAddressData)) {
    const groups = [];
    const groupData = rpAttrs.group || {};
    for (const [groupAddr] of Object.entries(groupData)) {
      groups.push(groupAddr);
    }
    rpAddresses.push({
      address: rpAddr,
      'prefix-list6': rpAttrs['prefix-list6'] || '',
      groups,
    });
  }

  return {
    'join-prune-interval': data['join-prune-interval'] || '',
    'keep-alive-timer': data['keep-alive-timer'] || '',
    packets: data.packets || '',
    'register-suppress-time': data['register-suppress-time'] || '',
    rp: {
      'keep-alive-timer': data.rp?.['keep-alive-timer'] || '',
      addresses: rpAddresses,
    },
    interfaces,
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['join-prune-interval'])) result['join-prune-interval'] = String(form['join-prune-interval']);
  if (isPresent(form['keep-alive-timer'])) result['keep-alive-timer'] = String(form['keep-alive-timer']);
  if (isPresent(form.packets)) result.packets = String(form.packets);
  if (isPresent(form['register-suppress-time'])) result['register-suppress-time'] = String(form['register-suppress-time']);

  // RP
  if (isPresent(form.rp?.['keep-alive-timer']) || form.rp?.addresses?.length) {
    result.rp = {};
    if (isPresent(form.rp['keep-alive-timer'])) result.rp['keep-alive-timer'] = String(form.rp['keep-alive-timer']);
    if (form.rp.addresses?.length) {
      result.rp.address = {};
      for (const rp of form.rp.addresses) {
        if (!rp.address) continue;
        const rpAttrs = {};
        if (isPresent(rp['prefix-list6'])) rpAttrs['prefix-list6'] = String(rp['prefix-list6']);
        if (rp.groups?.length) {
          rpAttrs.group = {};
          for (const g of rp.groups) {
            if (g) rpAttrs.group[g] = {};
          }
        }
        result.rp.address[rp.address] = rpAttrs;
      }
    }
  }

  // Interfaces
  if (form.interfaces?.length) {
    result.interface = {};
    for (const iface of form.interfaces) {
      if (!iface.name) continue;
      const attrs = {};

      if (isPresent(iface['dr-priority'])) attrs['dr-priority'] = String(iface['dr-priority']);
      if (isPresent(iface.hello)) attrs.hello = String(iface.hello);
      if (iface['no-bsm']) attrs['no-bsm'] = {};
      if (iface['no-unicast-bsm']) attrs['no-unicast-bsm'] = {};
      if (iface.passive) attrs.passive = {};

      // MLD
      const mldAttrs = {};
      if (iface.mld?.disable) mldAttrs.disable = {};
      if (isPresent(iface.mld?.interval)) mldAttrs.interval = String(iface.mld.interval);
      if (isPresent(iface.mld?.['last-member-query-count'])) mldAttrs['last-member-query-count'] = String(iface.mld['last-member-query-count']);
      if (isPresent(iface.mld?.['last-member-query-interval'])) mldAttrs['last-member-query-interval'] = String(iface.mld['last-member-query-interval']);
      if (isPresent(iface.mld?.['max-response-time'])) mldAttrs['max-response-time'] = String(iface.mld['max-response-time']);
      if (isPresent(iface.mld?.version)) mldAttrs.version = String(iface.mld.version);

      // MLD joins
      if (iface.joins?.length) {
        mldAttrs.join = {};
        for (const j of iface.joins) {
          if (!j.group) continue;
          const joinAttrs = {};
          if (isPresent(j.source)) joinAttrs.source = String(j.source);
          mldAttrs.join[j.group] = joinAttrs;
        }
      }

      if (Object.keys(mldAttrs).length) attrs.mld = mldAttrs;

      result.interface[iface.name] = attrs;
    }
  }

  return result;
}

export default defineComponent({
  name: 'Pim6Page',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('basic');
    const writeDisabled = ref(false);
    const interfaces = ref([]);

    // Interface modal
    const interfaceModalVisible = ref(false);
    const editingInterfaceIndex = ref(-1);
    const interfaceForm = ref({
      name: '', 'dr-priority': '', hello: '', 'no-bsm': false,
      'no-unicast-bsm': false, passive: false,
      mld: { disable: false, interval: '', 'last-member-query-count': '', 'last-member-query-interval': '', 'max-response-time': '', version: '' },
      joins: [],
    });

    // Join modal (nested inside interface modal)
    const joinModalVisible = ref(false);
    const editingJoinIndex = ref(-1);
    const joinForm = ref({ group: '', source: '' });

    // RP address modal
    const rpModalVisible = ref(false);
    const editingRpIndex = ref(-1);
    const rpForm = ref({ address: '', 'prefix-list6': '', groups: [] });
    const newRpGroup = ref('');

    // Delete confirmation modals
    const deleteInterfaceModalVisible = ref(false);
    const pendingDeleteInterfaceName = ref('');
    const pendingDeleteInterfaceIndex = ref(-1);

    const deleteJoinModalVisible = ref(false);
    const pendingDeleteJoinName = ref('');
    const pendingDeleteJoinIndex = ref(-1);

    const deleteRpModalVisible = ref(false);
    const pendingDeleteRpName = ref('');
    const pendingDeleteRpIndex = ref(-1);

    const interfaceColumns = [
      { key: 'name', title: t('pim6.columns.interfaceName') },
      { key: 'dr-priority', title: t('pim6.columns.drPriority') },
      { key: 'hello', title: t('pim6.columns.helloInterval') },
      { key: 'passive', title: t('pim6.columns.passive') },
    ];

    const rpColumns = [
      { key: 'address', title: t('pim6.columns.rpAddress') },
      { key: 'prefix-list6', title: t('pim6.columns.prefixList') },
      { key: 'groups', title: t('pim6.columns.groupAddress'), format: row => (row.groups || []).join(', ') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols pim6 interface';
      if (activeTab.value === 'rp') return 'protocols pim6 rp';
      return 'protocols pim6';
    });

    const MLD_VERSION_OPTIONS = [
      { value: '', label: t('pim6.options.defaultVersion') },
      { value: '1', label: t('pim6.options.version1') },
      { value: '2', label: t('pim6.options.version2') },
    ];

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'pim6']);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function loadInterfaces() {
      try {
        const res = await interfaceApi.ethernet();
        const list = res.interfaces || [];
        interfaces.value = list.map(i => i.name).sort();
      } catch (e) {
        console.error('Failed to load interface list', e);
      }
    }

    async function save() {
      // Validate
      if (config.value['join-prune-interval']) {
        const err = validateTimer(config.value['join-prune-interval'], 1, 65535, t('pim6.labels.joinPruneInterval'), t);
        if (err) return showError({ message: err });
      }
      if (config.value['keep-alive-timer']) {
        const err = validateTimer(config.value['keep-alive-timer'], 1, 65535, t('pim6.labels.keepAliveTimer'), t);
        if (err) return showError({ message: err });
      }
      for (const iface of config.value.interfaces) {
        if (iface['dr-priority']) {
          const err = validatePriority(iface['dr-priority'], t);
          if (err) return showError({ message: t('pim6.errors.interfaceError', { name: iface.name, error: err }) });
        }
        for (const j of iface.joins) {
          if (j.group) {
            const err = validateIPv6(j.group, t);
            if (err) return showError({ message: t('pim6.errors.interfaceMldJoin', { name: iface.name, error: err }) });
          }
          if (j.source) {
            const err = validateIPv6(j.source, t);
            if (err) return showError({ message: t('pim6.errors.interfaceMldJoin', { name: iface.name, error: err }) });
          }
        }
      }
      for (const rp of config.value.rp.addresses) {
        if (rp.address) {
          const err = validateIPv6(rp.address, t);
          if (err) return showError({ message: t('pim6.errors.rpAddressError', { error: err }) });
        }
        for (const g of rp.groups) {
          if (g) {
            const err = validateIPv6Prefix(g, t);
            if (err) return showError({ message: t('pim6.errors.rpGroupError', { address: rp.address, error: err }) });
          }
        }
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols pim6', payload);
        configStore.markPending();
        await configStore.checkSessionChanged();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        rpModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    // Interface operations
    function openInterfaceModal(index = -1) {
      editingInterfaceIndex.value = index;
      if (index >= 0) {
        interfaceForm.value = JSON.parse(JSON.stringify(config.value.interfaces[index]));
      } else {
        interfaceForm.value = {
          name: '', 'dr-priority': '', hello: '', 'no-bsm': false,
          'no-unicast-bsm': false, passive: false,
          mld: { disable: false, interval: '', 'last-member-query-count': '', 'last-member-query-interval': '', 'max-response-time': '', version: '' },
          joins: [],
        };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('pim6.errors.interfaceNameRequired') });
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      pendingDeleteInterfaceName.value = config.value.interfaces[index].name;
      pendingDeleteInterfaceIndex.value = index;
      deleteInterfaceModalVisible.value = true;
    }

    function confirmDeleteInterface() {
      config.value.interfaces.splice(pendingDeleteInterfaceIndex.value, 1);
      deleteInterfaceModalVisible.value = false;
      pendingDeleteInterfaceName.value = '';
      pendingDeleteInterfaceIndex.value = -1;
    }

    // Join operations
    function openJoinModal(index = -1) {
      editingJoinIndex.value = index;
      if (index >= 0) {
        joinForm.value = JSON.parse(JSON.stringify(interfaceForm.value.joins[index]));
      } else {
        joinForm.value = { group: '', source: '' };
      }
      joinModalVisible.value = true;
    }

    function saveJoin() {
      if (!joinForm.value.group) return showError({ message: t('pim6.errors.groupAddressRequired') });
      if (editingJoinIndex.value >= 0) {
        interfaceForm.value.joins.splice(editingJoinIndex.value, 1, JSON.parse(JSON.stringify(joinForm.value)));
      } else {
        interfaceForm.value.joins.push(JSON.parse(JSON.stringify(joinForm.value)));
      }
      joinModalVisible.value = false;
    }

    function deleteJoin(index) {
      pendingDeleteJoinName.value = interfaceForm.value.joins[index].group;
      pendingDeleteJoinIndex.value = index;
      deleteJoinModalVisible.value = true;
    }

    function confirmDeleteJoin() {
      interfaceForm.value.joins.splice(pendingDeleteJoinIndex.value, 1);
      deleteJoinModalVisible.value = false;
      pendingDeleteJoinName.value = '';
      pendingDeleteJoinIndex.value = -1;
    }

    // RP operations
    function openRpModal(index = -1) {
      editingRpIndex.value = index;
      if (index >= 0) {
        rpForm.value = JSON.parse(JSON.stringify(config.value.rp.addresses[index]));
      } else {
        rpForm.value = { address: '', 'prefix-list6': '', groups: [] };
      }
      newRpGroup.value = '';
      rpModalVisible.value = true;
    }

    function saveRp() {
      if (!rpForm.value.address) return showError({ message: t('pim6.errors.rpAddressRequired') });
      if (editingRpIndex.value >= 0) {
        config.value.rp.addresses.splice(editingRpIndex.value, 1, JSON.parse(JSON.stringify(rpForm.value)));
      } else {
        config.value.rp.addresses.push(JSON.parse(JSON.stringify(rpForm.value)));
      }
      rpModalVisible.value = false;
    }

    function deleteRp(index) {
      pendingDeleteRpName.value = config.value.rp.addresses[index].address;
      pendingDeleteRpIndex.value = index;
      deleteRpModalVisible.value = true;
    }

    function confirmDeleteRp() {
      config.value.rp.addresses.splice(pendingDeleteRpIndex.value, 1);
      deleteRpModalVisible.value = false;
      pendingDeleteRpName.value = '';
      pendingDeleteRpIndex.value = -1;
    }

    function addRpGroup() {
      if (newRpGroup.value && !rpForm.value.groups.includes(newRpGroup.value)) {
        rpForm.value.groups.push(newRpGroup.value);
        newRpGroup.value = '';
      }
    }

    function removeRpGroup(idx) {
      rpForm.value.groups.splice(idx, 1);
    }

    onMounted(() => {
      load();
      loadInterfaces();
      onMenuRefresh(load);
      window.addEventListener('config-committed', load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      joinModalVisible, editingJoinIndex, joinForm,
      rpModalVisible, editingRpIndex, rpForm, newRpGroup,
      deleteInterfaceModalVisible, pendingDeleteInterfaceName, pendingDeleteInterfaceIndex,
      deleteJoinModalVisible, pendingDeleteJoinName, pendingDeleteJoinIndex,
      deleteRpModalVisible, pendingDeleteRpName, pendingDeleteRpIndex,
      interfaceColumns, rpColumns, commandPath,
      MLD_VERSION_OPTIONS,
      openInterfaceModal, saveInterface, deleteInterface, confirmDeleteInterface,
      openJoinModal, saveJoin, deleteJoin, confirmDeleteJoin,
      openRpModal, saveRp, deleteRp, confirmDeleteRp, addRpGroup, removeRpGroup,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('pim6.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('pim6.tabs.basic') },
        { key: 'interfaces', title: t('pim6.tabs.interfaces') },
        { key: 'rp', title: t('pim6.tabs.rpAddress') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim6.sections.basicConfig') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('pim6.labels.joinPruneInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['join-prune-interval']" min="1" max="65535" :placeholder="t('pim6.placeholders.joinPruneInterval')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim6.labels.keepAliveTimer') }}</label>
                  <input type="number" class="form-control" v-model="config['keep-alive-timer']" min="1" max="65535" :placeholder="t('pim6.placeholders.keepAliveTimer')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim6.labels.rpKeepAliveTimer') }}</label>
                  <input type="number" class="form-control" v-model="config.rp['keep-alive-timer']" min="1" max="65535" :placeholder="t('pim6.placeholders.rpKeepAliveTimer')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #interfaces>
          <DataTable :columns="interfaceColumns" :data="config.interfaces" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openInterfaceModal(-1)" @edit="openInterfaceModal" @delete="deleteInterface" />
        </template>

        <template #rp>
          <DataTable :columns="rpColumns" :data="config.rp.addresses" :loading="loading" :disabled="writeDisabled"
                     rowKey="address" :actions="['create', 'edit', 'delete']"
                     @create="openRpModal(-1)" @edit="openRpModal" @delete="deleteRp" />
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('pim6.modals.editInterface') : t('pim6.modals.addInterface')" width="700px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.interfaceNameRequired') }}</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('pim6.placeholders.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.drPriority') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['dr-priority']" min="1" placeholder="1-4294967295" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.hello" min="1" :placeholder="t('pim6.placeholders.helloInterval')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.noBsm') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.noUnicastBsm') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-unicast-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.passiveMode') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.passive" /></label>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">MLD</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">
                <input type="checkbox" v-model="interfaceForm.mld.disable" />
                {{ t('pim6.labels.disableMld') }}
              </label>
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.mldVersion') }}</label>
              <select class="form-control" v-model="interfaceForm.mld.version" style="width:100%;">
                <option v-for="opt in MLD_VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.queryInterval') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld.interval" min="1" :placeholder="t('pim6.placeholders.queryInterval')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.maxResponseTime') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['max-response-time']" min="1" :placeholder="t('pim6.placeholders.maxResponseTime')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.lastMemberQueryCount') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['last-member-query-count']" min="1" :placeholder="t('pim6.placeholders.lastMemberQueryCount')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.lastMemberQueryInterval') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['last-member-query-interval']" min="1" :placeholder="t('pim6.placeholders.lastMemberQueryInterval')" style="width:100%;" />
            </div>
          </div>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim6.sections.mldJoinGroups') }}</div>
          <div style="padding:16px;">
            <div style="margin-bottom:10px;">
              <ToolbarButton size="small" @click="openJoinModal(-1)">{{ t('pim6.buttons.addJoin') }}</ToolbarButton>
            </div>
            <table class="data-table" v-if="interfaceForm.joins.length">
              <thead><tr><th>{{ t('pim6.columns.groupAddress') }}</th><th>{{ t('pim6.columns.sourceAddress') }}</th><th>{{ t('app.actions') }}</th></tr></thead>
              <tbody>
                <tr v-for="(j, idx) in interfaceForm.joins" :key="idx">
                  <td>{{ j.group }}</td>
                  <td>{{ j.source || '-' }}</td>
                  <td>
                    <ToolbarButton size="small" @click="openJoinModal(idx)">{{ t('app.edit') }}</ToolbarButton>
                    <ToolbarButton size="small" danger @click="deleteJoin(idx)">{{ t('app.delete') }}</ToolbarButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DraggableModal>

      <!-- Join Modal -->
      <DraggableModal v-model:visible="joinModalVisible" :title="editingJoinIndex >= 0 ? t('pim6.modals.editMldJoin') : t('pim6.modals.addMldJoin')" width="500px" @confirm="saveJoin">
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.groupAddressRequired') }}</label>
          <input type="text" class="form-control" v-model="joinForm.group" :placeholder="t('pim6.placeholders.groupAddressExample')" style="width:100%;" :disabled="editingJoinIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.sourceAddress') }}</label>
          <input type="text" class="form-control" v-model="joinForm.source" :placeholder="t('pim6.placeholders.ipv6SourceAddress')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- RP Modal -->
      <DraggableModal v-model:visible="rpModalVisible" :title="editingRpIndex >= 0 ? t('pim6.modals.editRpAddress') : t('pim6.modals.addRpAddress')" width="600px" @confirm="saveRp">
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.rpAddressRequired') }}</label>
          <input type="text" class="form-control" v-model="rpForm.address" :placeholder="t('pim6.placeholders.rpAddressExample')" style="width:100%;" :disabled="editingRpIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim6.labels.prefixListIpv6') }}</label>
          <input type="text" class="form-control" v-model="rpForm['prefix-list6']" :placeholder="t('pim6.placeholders.prefixListName')" style="width:100%;" />
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim6.sections.groupAddressRange') }}</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('pim6.labels.addGroupAddress') }}</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newRpGroup" :placeholder="t('pim6.placeholders.groupAddressRangeExample')" style="width:100%;" />
                <ToolbarButton size="small" @click="addRpGroup">{{ t('app.add') }}</ToolbarButton>
              </div>
            </div>
            <div v-for="(g, idx) in rpForm.groups" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ g }}</span>
              <ToolbarButton size="small" danger @click="removeRpGroup(idx)">{{ t('app.delete') }}</ToolbarButton>
            </div>
          </div>
        </div>
      </DraggableModal>

      <!-- Delete Interface Confirmation Modal -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('pim6.modals.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('pim6.messages.confirmDeleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteInterfaceName }}</div>
        </div>
      </DraggableModal>

      <!-- Delete Join Confirmation Modal -->
      <DraggableModal v-model:visible="deleteJoinModalVisible" :title="t('pim6.modals.confirmDelete')" width="400px" @confirm="confirmDeleteJoin">
        <div>{{ t('pim6.messages.confirmDeleteMldJoin') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteJoinName }}</div>
        </div>
      </DraggableModal>

      <!-- Delete RP Confirmation Modal -->
      <DraggableModal v-model:visible="deleteRpModalVisible" :title="t('pim6.modals.confirmDelete')" width="400px" @confirm="confirmDeleteRp">
        <div>{{ t('pim6.messages.confirmDeleteRpAddress') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteRpName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
