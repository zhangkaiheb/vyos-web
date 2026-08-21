import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
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

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('pim.errors.ipv4Format');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('pim.errors.ipv4Format');
  return '';
}

function validateIPv4Prefix(value, t) {
  if (!value) return '';
  const match = value.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/);
  if (!match) return t('pim.errors.ipv4PrefixFormat');
  const [, , prefix] = match;
  if (parseInt(prefix, 10) < 0 || parseInt(prefix, 10) > 32) return t('pim.errors.prefixLengthRange');
  return '';
}

function validateTimer(value, min, max, name, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return t('pim.errors.timerRange', { name, min, max });
  return '';
}

function validatePriority(value, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4294967295) return t('pim.errors.priorityRange');
  return '';
}

// PIM config transformation
function configToForm(data = {}) {
  // Interface list
  const interfaces = [];
  const interfaceData = data.interface || {};
  for (const [ifName, attrs] of Object.entries(interfaceData)) {
    // IGMP joins
    const joins = [];
    const joinData = attrs.igmp?.join || {};
    for (const [groupAddr, joinAttrs] of Object.entries(joinData)) {
      joins.push({
        group: groupAddr,
        'source-address': joinAttrs['source-address'] || '',
      });
    }

    interfaces.push({
      name: ifName,
      'dr-priority': attrs['dr-priority'] || '',
      hello: attrs.hello || '',
      'no-bsm': !!attrs['no-bsm'],
      'no-unicast-bsm': !!attrs['no-unicast-bsm'],
      passive: !!attrs.passive,
      'source-address': attrs['source-address'] || '',
      bfd: {
        enable: !!attrs.bfd,
        profile: attrs.bfd?.profile || '',
      },
      igmp: {
        disable: !!attrs.igmp?.disable,
        'query-interval': attrs.igmp?.['query-interval'] || '',
        'query-max-response-time': attrs.igmp?.['query-max-response-time'] || '',
        version: attrs.igmp?.version || '',
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
      groups,
    });
  }

  return {
    'join-prune-interval': data['join-prune-interval'] || '',
    'keep-alive-timer': data['keep-alive-timer'] || '',
    'no-v6-secondary': !!data['no-v6-secondary'],
    packets: data.packets || '',
    'register-suppress-time': data['register-suppress-time'] || '',
    ecmp: {
      enable: !!data.ecmp,
      rebalance: !!data.ecmp?.rebalance,
    },
    'watermark-warning': data.igmp?.['watermark-warning'] || '',
    'register-accept-list': data['register-accept-list']?.['prefix-list'] || '',
    rp: {
      'keep-alive-timer': data.rp?.['keep-alive-timer'] || '',
      addresses: rpAddresses,
    },
    'spt-switchover': {
      'infinity-and-beyond': {
        enable: !!data['spt-switchover']?.['infinity-and-beyond'],
        'prefix-list': data['spt-switchover']?.['infinity-and-beyond']?.['prefix-list'] || '',
      },
    },
    ssm: {
      'prefix-list': data.ssm?.['prefix-list'] || '',
    },
    interfaces,
  };
}

function configToConfig(form) {
  const result = {};

  if (isPresent(form['join-prune-interval'])) result['join-prune-interval'] = String(form['join-prune-interval']);
  if (isPresent(form['keep-alive-timer'])) result['keep-alive-timer'] = String(form['keep-alive-timer']);
  if (form['no-v6-secondary']) result['no-v6-secondary'] = {};
  if (isPresent(form.packets)) result.packets = String(form.packets);
  if (isPresent(form['register-suppress-time'])) result['register-suppress-time'] = String(form['register-suppress-time']);

  if (form.ecmp?.enable) {
    result.ecmp = {};
    if (form.ecmp.rebalance) result.ecmp.rebalance = {};
  }

  if (isPresent(form['watermark-warning'])) {
    result.igmp = { 'watermark-warning': String(form['watermark-warning']) };
  }

  if (isPresent(form['register-accept-list'])) {
    result['register-accept-list'] = { 'prefix-list': String(form['register-accept-list']) };
  }

  // RP
  if (isPresent(form.rp?.['keep-alive-timer']) || form.rp?.addresses?.length) {
    result.rp = {};
    if (isPresent(form.rp['keep-alive-timer'])) result.rp['keep-alive-timer'] = String(form.rp['keep-alive-timer']);
    if (form.rp.addresses?.length) {
      result.rp.address = {};
      for (const rp of form.rp.addresses) {
        if (!rp.address) continue;
        const rpAttrs = {};
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

  // SPT switchover
  if (form['spt-switchover']?.['infinity-and-beyond']?.enable) {
    result['spt-switchover'] = { 'infinity-and-beyond': {} };
    if (isPresent(form['spt-switchover']['infinity-and-beyond']['prefix-list'])) {
      result['spt-switchover']['infinity-and-beyond']['prefix-list'] = String(form['spt-switchover']['infinity-and-beyond']['prefix-list']);
    }
  }

  // SSM
  if (isPresent(form.ssm?.['prefix-list'])) {
    result.ssm = { 'prefix-list': String(form.ssm['prefix-list']) };
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
      if (isPresent(iface['source-address'])) attrs['source-address'] = String(iface['source-address']);

      // BFD
      if (iface.bfd?.enable) {
        attrs.bfd = {};
        if (isPresent(iface.bfd.profile)) attrs.bfd.profile = String(iface.bfd.profile);
      }

      // IGMP
      const igmpAttrs = {};
      if (iface.igmp?.disable) igmpAttrs.disable = {};
      if (isPresent(iface.igmp?.['query-interval'])) igmpAttrs['query-interval'] = String(iface.igmp['query-interval']);
      if (isPresent(iface.igmp?.['query-max-response-time'])) igmpAttrs['query-max-response-time'] = String(iface.igmp['query-max-response-time']);
      if (isPresent(iface.igmp?.version)) igmpAttrs.version = String(iface.igmp.version);

      // IGMP joins
      if (iface.joins?.length) {
        igmpAttrs.join = {};
        for (const j of iface.joins) {
          if (!j.group) continue;
          const joinAttrs = {};
          if (isPresent(j['source-address'])) joinAttrs['source-address'] = String(j['source-address']);
          igmpAttrs.join[j.group] = joinAttrs;
        }
      }

      if (Object.keys(igmpAttrs).length) attrs.igmp = igmpAttrs;

      result.interface[iface.name] = attrs;
    }
  }

  return result;
}

export default defineComponent({
  name: 'PimPage',
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
      'no-unicast-bsm': false, passive: false, 'source-address': '',
      bfd: { enable: false, profile: '' },
      igmp: { disable: false, 'query-interval': '', 'query-max-response-time': '', version: '' },
      joins: [],
    });

    // Join modal (nested inside interface modal)
    const joinModalVisible = ref(false);
    const editingJoinIndex = ref(-1);
    const joinForm = ref({ group: '', 'source-address': '' });

    // RP address modal
    const rpModalVisible = ref(false);
    const editingRpIndex = ref(-1);
    const rpForm = ref({ address: '', groups: [] });
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

    const interfaceColumns = computed(() => [
      { key: 'name', title: t('pim.columns.interfaceName') },
      { key: 'dr-priority', title: t('pim.columns.drPriority') },
      { key: 'hello', title: t('pim.columns.helloInterval') },
      { key: 'passive', title: t('pim.columns.passive') },
    ]);

    const rpColumns = computed(() => [
      { key: 'address', title: t('pim.columns.rpAddress') },
      { key: 'groups', title: t('pim.columns.groupAddress'), format: row => (row.groups || []).join(', ') },
    ]);

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols pim interface';
      if (activeTab.value === 'rp') return 'protocols pim rp';
      if (activeTab.value === 'ssm') return 'protocols pim ssm';
      return 'protocols pim';
    });

    const IGMP_VERSION_OPTIONS = computed(() => [
      { value: '', label: t('pim.options.defaultVersion') },
      { value: '1', label: t('pim.options.version1') },
      { value: '2', label: t('pim.options.version2') },
      { value: '3', label: t('pim.options.version3') },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'pim']);
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
        const err = validateTimer(config.value['join-prune-interval'], 1, 65535, t('pim.labels.joinPruneInterval'), t);
        if (err) return showError({ message: err });
      }
      if (config.value['keep-alive-timer']) {
        const err = validateTimer(config.value['keep-alive-timer'], 1, 65535, t('pim.labels.keepAliveTimer'), t);
        if (err) return showError({ message: err });
      }
      for (const iface of config.value.interfaces) {
        if (iface['dr-priority']) {
          const err = validatePriority(iface['dr-priority'], t);
          if (err) return showError({ message: t('pim.errors.interfaceError', { name: iface.name, error: err }) });
        }
        if (iface['source-address']) {
          const err = validateIPv4(iface['source-address'], t);
          if (err) return showError({ message: t('pim.errors.interfaceError', { name: iface.name, error: err }) });
        }
        for (const j of iface.joins) {
          if (j.group) {
            const err = validateIPv4(j.group, t);
            if (err) return showError({ message: t('pim.errors.igmpJoinError', { name: iface.name, error: err }) });
          }
          if (j['source-address']) {
            const err = validateIPv4(j['source-address'], t);
            if (err) return showError({ message: t('pim.errors.igmpJoinError', { name: iface.name, error: err }) });
          }
        }
      }
      for (const rp of config.value.rp.addresses) {
        if (rp.address) {
          const err = validateIPv4(rp.address, t);
          if (err) return showError({ message: t('pim.errors.rpAddressError', { error: err }) });
        }
        for (const g of rp.groups) {
          if (g) {
            const err = validateIPv4Prefix(g, t);
            if (err) return showError({ message: t('pim.errors.rpGroupError', { address: rp.address, error: err }) });
          }
        }
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols pim', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        interfaceModalVisible.value = false;
        rpModalVisible.value = false;
        await configStore.checkSessionChanged(); await load();
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
          'no-unicast-bsm': false, passive: false, 'source-address': '',
          bfd: { enable: false, profile: '' },
          igmp: { disable: false, 'query-interval': '', 'query-max-response-time': '', version: '' },
          joins: [],
        };
      }
      interfaceModalVisible.value = true;
    }

    function saveInterface() {
      if (!interfaceForm.value.name) return showError({ message: t('pim.messages.enterInterfaceName') });
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
        joinForm.value = { group: '', 'source-address': '' };
      }
      joinModalVisible.value = true;
    }

    function saveJoin() {
      if (!joinForm.value.group) return showError({ message: t('pim.messages.enterMulticastGroupAddress') });
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
        rpForm.value = { address: '', groups: [] };
      }
      newRpGroup.value = '';
      rpModalVisible.value = true;
    }

    function saveRp() {
      if (!rpForm.value.address) return showError({ message: t('pim.messages.enterRpAddress') });
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
      window.addEventListener('config-committed', load);
      loadInterfaces();
      onMenuRefresh(load);
    });

    return {t,
      
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      joinModalVisible, editingJoinIndex, joinForm,
      rpModalVisible, editingRpIndex, rpForm, newRpGroup,
      deleteInterfaceModalVisible, pendingDeleteInterfaceName, pendingDeleteInterfaceIndex,
      deleteJoinModalVisible, pendingDeleteJoinName, pendingDeleteJoinIndex,
      deleteRpModalVisible, pendingDeleteRpName, pendingDeleteRpIndex,
      interfaceColumns, rpColumns, commandPath,
      IGMP_VERSION_OPTIONS,
      openInterfaceModal, saveInterface, deleteInterface, confirmDeleteInterface,
      openJoinModal, saveJoin, deleteJoin, confirmDeleteJoin,
      openRpModal, saveRp, deleteRp, confirmDeleteRp, addRpGroup, removeRpGroup,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('pim.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: t('pim.tabs.basic') },
        { key: 'interfaces', title: t('pim.tabs.interfaces') },
        { key: 'rp', title: t('pim.tabs.rp') },
        { key: 'ssm', title: t('pim.tabs.ssm') },
        { key: 'spt', title: t('pim.tabs.spt') },
        { key: 'advanced', title: t('pim.tabs.advanced') }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.basicConfig') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.joinPruneInterval') }}</label>
                  <input type="number" class="form-control" v-model="config['join-prune-interval']" min="1" max="65535" :placeholder="t('pim.placeholders.joinPruneInterval')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.keepAliveTimer') }}</label>
                  <input type="number" class="form-control" v-model="config['keep-alive-timer']" min="1" max="65535" :placeholder="t('pim.placeholders.keepAliveTimer')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.enableEcmp') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.ecmp.enable" /></label>
                </div>
                <div v-if="config.ecmp.enable" class="form-row">
                  <label class="form-label">{{ t('pim.labels.enableEcmpRebalance') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config.ecmp.rebalance" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.rpKeepAliveTimer') }}</label>
                  <input type="number" class="form-control" v-model="config.rp['keep-alive-timer']" min="1" max="65535" :placeholder="t('pim.placeholders.rpKeepAliveTimer')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.igmpWatermarkWarning') }}</label>
                  <input type="number" class="form-control" v-model="config['watermark-warning']" min="0" :placeholder="t('pim.placeholders.groupRestrictionWarning')" style="width:100%;" />
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

        <template #ssm>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.ssmConfig') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.ssmPrefixList') }}</label>
                  <input type="text" class="form-control" v-model="config.ssm['prefix-list']" :placeholder="t('pim.placeholders.ssmPrefixListName')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #spt>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.sptSwitchover') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.neverSwitchToSpt') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['spt-switchover']['infinity-and-beyond'].enable" /></label>
                </div>
                <div v-if="config['spt-switchover']['infinity-and-beyond'].enable" class="form-row">
                  <label class="form-label">{{ t('pim.labels.prefixList') }}</label>
                  <input type="text" class="form-control" v-model="config['spt-switchover']['infinity-and-beyond']['prefix-list']" :placeholder="t('pim.placeholders.prefixListName')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #advanced>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.advancedOptions') }}</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.disableIpv6Secondary') }}</label>
                  <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="config['no-v6-secondary']" /></label>
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.packets') }}</label>
                  <input type="number" class="form-control" v-model="config.packets" min="1" :placeholder="t('pim.placeholders.packets')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.registerSuppressTime') }}</label>
                  <input type="number" class="form-control" v-model="config['register-suppress-time']" min="1" :placeholder="t('pim.placeholders.registerSuppressTime')" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">{{ t('pim.labels.registerAcceptList') }}</label>
                  <input type="text" class="form-control" v-model="config['register-accept-list']" :placeholder="t('pim.placeholders.registerAcceptList')" style="width:100%;" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </TabGroup>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? t('pim.modals.editPimInterface') : t('pim.modals.addPimInterface')" width="700px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.interfaceName') }} *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">{{ t('pim.placeholders.selectInterface') }}</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.drPriority') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm['dr-priority']" min="1" :placeholder="t('pim.placeholders.drPriority')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.helloInterval') }}</label>
          <input type="number" class="form-control" v-model="interfaceForm.hello" min="1" :placeholder="t('pim.placeholders.helloInterval')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.sourceAddress') }}</label>
          <input type="text" class="form-control" v-model="interfaceForm['source-address']" :placeholder="t('pim.placeholders.ipv4SourceAddress')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.noBsm') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.noUnicastBsm') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-unicast-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.passiveMode') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.passive" /></label>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.bfd') }}</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('pim.labels.enableBfd') }}</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.bfd.enable" /></label>
            </div>
            <div v-if="interfaceForm.bfd.enable" class="form-row">
              <label class="form-label">{{ t('pim.labels.bfdProfile') }}</label>
              <input type="text" class="form-control" v-model="interfaceForm.bfd.profile" :placeholder="t('pim.placeholders.bfdProfileName')" style="width:100%;" />
            </div>
          </div>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.igmp') }}</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">{{ t('pim.labels.disableIgmp') }}</label>
              <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.igmp.disable" /></label>
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim.labels.igmpVersion') }}</label>
              <select class="form-control" v-model="interfaceForm.igmp.version" style="width:100%;">
                <option v-for="opt in IGMP_VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim.labels.queryInterval') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.igmp['query-interval']" min="1" :placeholder="t('pim.placeholders.queryInterval')" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">{{ t('pim.labels.maxResponseTime') }}</label>
              <input type="number" class="form-control" v-model="interfaceForm.igmp['query-max-response-time']" min="1" :placeholder="t('pim.placeholders.maxResponseTime')" style="width:100%;" />
            </div>
          </div>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ t('pim.labels.igmpJoinGroups') }}</div>
          <div style="padding:16px;">
            <div style="margin-bottom:10px;">
              <ToolbarButton size="small" @click="openJoinModal(-1)">{{ t('pim.buttons.addJoin') }}</ToolbarButton>
            </div>
            <table class="data-table" v-if="interfaceForm.joins.length">
              <thead><tr><th>{{ t('pim.labels.multicastGroupAddress') }}</th><th>{{ t('pim.labels.sourceAddress') }}</th><th>{{ t('pim.labels.actions') }}</th></tr></thead>
              <tbody>
                <tr v-for="(j, idx) in interfaceForm.joins" :key="idx">
                  <td>{{ j.group }}</td>
                  <td>{{ j['source-address'] || '-' }}</td>
                  <td>
                    <ToolbarButton size="small" @click="openJoinModal(idx)">{{ t('pim.buttons.edit') }}</ToolbarButton>
                    <ToolbarButton size="small" danger @click="deleteJoin(idx)">{{ t('pim.buttons.delete') }}</ToolbarButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DraggableModal>

      <!-- Join Modal -->
      <DraggableModal v-model:visible="joinModalVisible" :title="editingJoinIndex >= 0 ? t('pim.modals.editIgmpJoin') : t('pim.modals.addIgmpJoin')" width="500px" @confirm="saveJoin">
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.multicastGroupAddress') }} *</label>
          <input type="text" class="form-control" v-model="joinForm.group" :placeholder="t('pim.placeholders.multicastGroupAddress')" style="width:100%;" :disabled="editingJoinIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.sourceAddress') }}</label>
          <input type="text" class="form-control" v-model="joinForm['source-address']" :placeholder="t('pim.placeholders.ipv4SourceAddress')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- RP Modal -->
      <DraggableModal v-model:visible="rpModalVisible" :title="editingRpIndex >= 0 ? t('pim.modals.editRpAddress') : t('pim.modals.addRpAddress')" width="600px" @confirm="saveRp">
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.rpAddressRequired') }}</label>
          <input type="text" class="form-control" v-model="rpForm.address" :placeholder="t('pim.placeholders.rpAddress')" style="width:100%;" :disabled="editingRpIndex >= 0" />
        </div>
        <h4 style="margin-top:16px;">{{ t('pim.labels.groupAddressRange') }}</h4>
        <div class="form-row">
          <label class="form-label">{{ t('pim.labels.addGroupAddress') }}</label>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="text" class="form-control" v-model="newRpGroup" :placeholder="t('pim.placeholders.groupAddress')" style="width:100%;" />
            <ToolbarButton size="small" @click="addRpGroup">{{ t('pim.buttons.add') }}</ToolbarButton>
          </div>
        </div>
        <div v-for="(g, idx) in rpForm.groups" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
          <span>{{ g }}</span>
          <ToolbarButton size="small" danger @click="removeRpGroup(idx)">{{ t('pim.buttons.delete') }}</ToolbarButton>
        </div>
      </DraggableModal>

      <!-- Delete Interface Confirmation Modal -->
      <DraggableModal v-model:visible="deleteInterfaceModalVisible" :title="t('pim.modals.confirmDelete')" width="400px" @confirm="confirmDeleteInterface">
        <div>{{ t('pim.messages.confirmDeleteInterface') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteInterfaceName }}</div>
        </div>
      </DraggableModal>

      <!-- Delete Join Confirmation Modal -->
      <DraggableModal v-model:visible="deleteJoinModalVisible" :title="t('pim.modals.confirmDelete')" width="400px" @confirm="confirmDeleteJoin">
        <div>{{ t('pim.messages.confirmDeleteIgmpJoin') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteJoinName }}</div>
        </div>
      </DraggableModal>

      <!-- Delete RP Confirmation Modal -->
      <DraggableModal v-model:visible="deleteRpModalVisible" :title="t('pim.modals.confirmDelete')" width="400px" @confirm="confirmDeleteRp">
        <div>{{ t('pim.messages.confirmDeleteRpAddress') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteRpName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
