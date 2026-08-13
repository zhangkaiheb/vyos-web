import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
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

function validateIPv4(value, t) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('nhrp.validation.ipv4');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('nhrp.validation.ipv4');
  return '';
}

function configToForm(data = {}) {
  const tunnels = [];
  const tunnelData = data.tunnel || {};
  for (const [tunName, attrs] of Object.entries(tunnelData)) {
    const nhs = [];
    const nhData = attrs['nbma'] || {};
    for (const [nbmaAddr, nhAttrs] of Object.entries(nhData)) {
      nhs.push({
        nbma: nbmaAddr,
        'remote-ip': nhAttrs['remote-ip'] || '',
        'holdtime': nhAttrs.holdtime || '',
      });
    }
    tunnels.push({
      name: tunName,
      'authentication-key': attrs['authentication-key'] || '',
      'enable-redirect': !!attrs['enable-redirect'],
      'holdtime': attrs.holdtime || '',
      'register': !!attrs.register,
      'short-cut': !!attrs['short-cut'],
      nhs,
    });
  }
  return { tunnels };
}

function configToConfig(form) {
  const result = {};
  if (form.tunnels?.length) {
    result.tunnel = {};
    for (const tun of form.tunnels) {
      if (!tun.name) continue;
      const attrs = {};
      if (isPresent(tun['authentication-key'])) attrs['authentication-key'] = tun['authentication-key'];
      if (tun['enable-redirect']) attrs['enable-redirect'] = {};
      if (isPresent(tun.holdtime)) attrs.holdtime = String(tun.holdtime);
      if (tun.register) attrs.register = {};
      if (tun['short-cut']) attrs['short-cut'] = {};
      if (tun.nhs?.length) {
        attrs.nbma = {};
        for (const nh of tun.nhs) {
          if (!nh.nbma) continue;
          const nhAttrs = {};
          if (isPresent(nh['remote-ip'])) nhAttrs['remote-ip'] = nh['remote-ip'];
          if (isPresent(nh.holdtime)) nhAttrs.holdtime = String(nh.holdtime);
          attrs.nbma[nh.nbma] = nhAttrs;
        }
      }
      result.tunnel[tun.name] = attrs;
    }
  }
  return result;
}

export default defineComponent({
  name: 'NhrpPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('tunnels');
    const writeDisabled = ref(false);

    const tunnelModalVisible = ref(false);
    const editingTunnelIndex = ref(-1);
    const tunnelForm = ref({
      name: '', 'authentication-key': '', 'enable-redirect': false,
      holdtime: '', register: false, 'short-cut': false, nhs: [],
    });

    const nhModalVisible = ref(false);
    const editingNhIndex = ref(-1);
    const nhForm = ref({ nbma: '', 'remote-ip': '', holdtime: '' });

    const deleteModalVisible = ref(false);
    const pendingDeleteName = ref('');
    const pendingDeleteIndex = ref(-1);

    const tunnelColumns = [
      { key: 'name', title: t('nhrp.columns.tunnelName') },
      { key: 'holdtime', title: t('nhrp.columns.holdtime') },
      { key: 'nhs', title: t('nhrp.columns.nbmaCount'), render: (val) => val?.length || 0 },
    ];

    const nhColumns = [
      { key: 'nbma', title: t('nhrp.columns.nbmaAddress') },
      { key: 'remote-ip', title: t('nhrp.columns.remoteIp') },
      { key: 'holdtime', title: t('nhrp.columns.holdtime') },
    ];

    const commandPath = computed(() => 'protocols nhrp tunnel');

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'nhrp']);
        config.value = configToForm(res.data || {});
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configStore.setConfig('protocols nhrp', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        tunnelModalVisible.value = false;
        nhModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openTunnelModal(index = -1) {
      editingTunnelIndex.value = index;
      if (index >= 0) {
        tunnelForm.value = JSON.parse(JSON.stringify(config.value.tunnels[index]));
      } else {
        tunnelForm.value = { name: '', 'authentication-key': '', 'enable-redirect': false, holdtime: '', register: false, 'short-cut': false, nhs: [] };
      }
      tunnelModalVisible.value = true;
    }

    function saveTunnel() {
      if (!tunnelForm.value.name) return showError({ message: t('nhrp.errors.tunnelNameRequired') });
      if (editingTunnelIndex.value >= 0) {
        config.value.tunnels.splice(editingTunnelIndex.value, 1, JSON.parse(JSON.stringify(tunnelForm.value)));
      } else {
        config.value.tunnels.push(JSON.parse(JSON.stringify(tunnelForm.value)));
      }
      tunnelModalVisible.value = false;
    }

    function openNhModal(index = -1) {
      editingNhIndex.value = index;
      if (index >= 0) {
        nhForm.value = JSON.parse(JSON.stringify(tunnelForm.value.nhs[index]));
      } else {
        nhForm.value = { nbma: '', 'remote-ip': '', holdtime: '' };
      }
      nhModalVisible.value = true;
    }

    function saveNh() {
      if (!nhForm.value.nbma) return showError({ message: t('nhrp.errors.nbmaAddressRequired') });
      const err = validateIPv4(nhForm.value.nbma, t);
      if (err) return showError({ message: err });
      if (editingNhIndex.value >= 0) {
        tunnelForm.value.nhs.splice(editingNhIndex.value, 1, JSON.parse(JSON.stringify(nhForm.value)));
      } else {
        tunnelForm.value.nhs.push(JSON.parse(JSON.stringify(nhForm.value)));
      }
      nhModalVisible.value = false;
    }

    function deleteTunnel(index) {
      pendingDeleteName.value = config.value.tunnels[index].name;
      pendingDeleteIndex.value = index;
      deleteModalVisible.value = true;
    }

    function confirmDeleteTunnel() {
      config.value.tunnels.splice(pendingDeleteIndex.value, 1);
      deleteModalVisible.value = false;
      pendingDeleteName.value = '';
      pendingDeleteIndex.value = -1;
    }
    function deleteNh(index) {
      tunnelForm.value.nhs.splice(index, 1);
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      tunnelModalVisible, editingTunnelIndex, tunnelForm,
      nhModalVisible, editingNhIndex, nhForm,
      deleteModalVisible, pendingDeleteName, pendingDeleteIndex,
      tunnelColumns, nhColumns, commandPath,
      openTunnelModal, openNhModal,
      deleteTunnel, confirmDeleteTunnel, deleteNh,
      saveTunnel, saveNh,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('nhrp.messages.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'tunnels', title: t('nhrp.tabs.tunnels') }
      ]">

        <template #tunnels>
          <DataTable :columns="tunnelColumns" :data="config.tunnels" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openTunnelModal(-1)" @edit="openTunnelModal" @delete="deleteTunnel" />
        </template>
      </TabGroup>

      <!-- Tunnel Modal -->
      <DraggableModal v-model:visible="tunnelModalVisible" :title="editingTunnelIndex >= 0 ? t('nhrp.modals.editTunnel') : t('nhrp.modals.addTunnel')" width="700px" @confirm="saveTunnel">
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.tunnelName') }} *</label>
          <input type="text" class="form-control" v-model="tunnelForm.name" :placeholder="t('nhrp.placeholders.tunnelName')" style="width:100%;" :disabled="editingTunnelIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.authenticationKey') }}</label>
          <input type="text" class="form-control" v-model="tunnelForm['authentication-key']" :placeholder="t('nhrp.placeholders.authenticationKey')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.holdtime') }}</label>
          <input type="number" class="form-control" v-model="tunnelForm.holdtime" min="1" max="65535" :placeholder="t('nhrp.placeholders.holdtime')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.enableRedirect') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="tunnelForm['enable-redirect']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.register') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="tunnelForm.register" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.shortCut') }}</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="tunnelForm['short-cut']" /></label>
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold;">{{ t('nhrp.labels.nbmaList') }}</span>
            <ToolbarButton size="small" @click="openNhModal(-1)">{{ t('nhrp.buttons.addNbma') }}</ToolbarButton>
          </div>
          <DataTable :columns="nhColumns" :data="tunnelForm.nhs" rowKey="nbma"
                     :actions="['edit', 'delete']"
                     @edit="openNhModal" @delete="deleteNh" />
        </div>
      </DraggableModal>

      <!-- NBMA Modal -->
      <DraggableModal v-model:visible="nhModalVisible" :title="editingNhIndex >= 0 ? t('nhrp.modals.editNbma') : t('nhrp.modals.addNbma')" width="500px" @confirm="saveNh">
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.nbmaAddress') }} *</label>
          <input type="text" class="form-control" v-model="nhForm.nbma" :placeholder="t('nhrp.placeholders.ipv4Address')" style="width:100%;" :disabled="editingNhIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.remoteIp') }}</label>
          <input type="text" class="form-control" v-model="nhForm['remote-ip']" :placeholder="t('nhrp.placeholders.ipv4Address')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('nhrp.labels.holdtime') }}</label>
          <input type="number" class="form-control" v-model="nhForm.holdtime" min="1" max="65535" :placeholder="t('nhrp.placeholders.holdtime')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('nhrp.modals.confirmDelete')" width="400px" @confirm="confirmDeleteTunnel">
        <div>{{ t('nhrp.messages.confirmDeleteTunnel') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
