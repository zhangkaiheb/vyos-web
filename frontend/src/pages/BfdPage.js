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
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return t('bfd.validation.ipv4');
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return t('bfd.validation.ipv4');
  return '';
}

function validateInterval(value, min, max, name, t) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return t('bfd.validation.interval', { name, min, max });
  return '';
}

function configToForm(data = {}) {
  const peers = [];
  const peerData = data.peer || {};
  for (const [ip, attrs] of Object.entries(peerData)) {
    peers.push({
      address: ip,
      'source-address': attrs['source-address'] || '',
      'multiplier': attrs.multiplier || '',
      'receive-interval': attrs['receive-interval'] || '',
      'transmit-interval': attrs['transmit-interval'] || '',
      'profile': attrs.profile || '',
    });
  }

  const profiles = [];
  const profileData = data.profile || {};
  for (const [name, attrs] of Object.entries(profileData)) {
    profiles.push({
      name,
      'receive-interval': attrs['receive-interval'] || '',
      'transmit-interval': attrs['transmit-interval'] || '',
      'multiplier': attrs.multiplier || '',
    });
  }

  return {
    peers,
    profiles,
  };
}

function configToConfig(form) {
  const result = {};

  if (form.peers?.length) {
    result.peer = {};
    for (const peer of form.peers) {
      if (!peer.address) continue;
      const attrs = {};
      if (isPresent(peer['source-address'])) attrs['source-address'] = peer['source-address'];
      if (isPresent(peer.multiplier)) attrs.multiplier = String(peer.multiplier);
      if (isPresent(peer['receive-interval'])) attrs['receive-interval'] = String(peer['receive-interval']);
      if (isPresent(peer['transmit-interval'])) attrs['transmit-interval'] = String(peer['transmit-interval']);
      if (isPresent(peer.profile)) attrs.profile = peer.profile;
      result.peer[peer.address] = attrs;
    }
  }

  if (form.profiles?.length) {
    result.profile = {};
    for (const profile of form.profiles) {
      if (!profile.name) continue;
      const attrs = {};
      if (isPresent(profile['receive-interval'])) attrs['receive-interval'] = String(profile['receive-interval']);
      if (isPresent(profile['transmit-interval'])) attrs['transmit-interval'] = String(profile['transmit-interval']);
      if (isPresent(profile.multiplier)) attrs.multiplier = String(profile.multiplier);
      result.profile[profile.name] = attrs;
    }
  }

  return result;
}

export default defineComponent({
  name: 'BfdPage',
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const saving = ref(false);
    const saved = ref(false);
    const config = ref(configToForm());
    const activeTab = ref('peer');
    const writeDisabled = ref(false);

    const peerModalVisible = ref(false);
    const editingPeerIndex = ref(-1);
    const peerForm = ref({
      address: '', 'source-address': '', multiplier: '',
      'receive-interval': '', 'transmit-interval': '', profile: '',
    });

    const profileModalVisible = ref(false);
    const editingProfileIndex = ref(-1);
    const profileForm = ref({
      name: '', 'receive-interval': '', 'transmit-interval': '', multiplier: '',
    });

    const peerColumns = [
      { key: 'address', title: t('bfd.columns.address') },
      { key: 'source-address', title: t('bfd.columns.sourceAddress') },
      { key: 'multiplier', title: t('bfd.columns.multiplier') },
      { key: 'receive-interval', title: t('bfd.columns.receiveInterval') },
      { key: 'transmit-interval', title: t('bfd.columns.transmitInterval') },
      { key: 'profile', title: t('bfd.columns.profile') },
    ];

    const profileColumns = [
      { key: 'name', title: t('bfd.columns.name') },
      { key: 'receive-interval', title: t('bfd.columns.receiveInterval') },
      { key: 'transmit-interval', title: t('bfd.columns.transmitInterval') },
      { key: 'multiplier', title: t('bfd.columns.multiplier') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'profile') return 'protocols bfd profile';
      return 'protocols bfd peer';
    });

    async function load() {
      loading.value = true;
      try {
        const res = await configApi.get(['protocols', 'bfd']);
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
        await configStore.setConfig('protocols bfd', payload);
        configStore.markPending();
        saved.value = true;
        setTimeout(() => (saved.value = false), 2000);
        peerModalVisible.value = false;
        profileModalVisible.value = false;
        await load();
      } catch (e) {
        showError(e);
      } finally {
        saving.value = false;
      }
    }

    function openPeerModal(index = -1) {
      editingPeerIndex.value = index;
      if (index >= 0) {
        peerForm.value = JSON.parse(JSON.stringify(config.value.peers[index]));
      } else {
        peerForm.value = { address: '', 'source-address': '', multiplier: '', 'receive-interval': '', 'transmit-interval': '', profile: '' };
      }
      peerModalVisible.value = true;
    }

    function savePeer() {
      if (!peerForm.value.address) return showError({ message: t('bfd.errors.peerAddressRequired') });
      const err = validateIPv4(peerForm.value.address, t);
      if (err) return showError({ message: err });
      if (peerForm.value.multiplier) {
        const err = validateInterval(peerForm.value.multiplier, 2, 50, t('bfd.columns.multiplier'), t);
        if (err) return showError({ message: err });
      }
      if (editingPeerIndex.value >= 0) {
        config.value.peers.splice(editingPeerIndex.value, 1, JSON.parse(JSON.stringify(peerForm.value)));
      } else {
        config.value.peers.push(JSON.parse(JSON.stringify(peerForm.value)));
      }
      peerModalVisible.value = false;
    }

    function openProfileModal(index = -1) {
      editingProfileIndex.value = index;
      if (index >= 0) {
        profileForm.value = JSON.parse(JSON.stringify(config.value.profiles[index]));
      } else {
        profileForm.value = { name: '', 'receive-interval': '', 'transmit-interval': '', multiplier: '' };
      }
      profileModalVisible.value = true;
    }

    function saveProfile() {
      if (!profileForm.value.name) return showError({ message: t('bfd.errors.profileNameRequired') });
      if (editingProfileIndex.value >= 0) {
        config.value.profiles.splice(editingProfileIndex.value, 1, JSON.parse(JSON.stringify(profileForm.value)));
      } else {
        config.value.profiles.push(JSON.parse(JSON.stringify(profileForm.value)));
      }
      profileModalVisible.value = false;
    }

    // Delete confirmation modals
    const deletePeerModalVisible = ref(false);
    const pendingDeletePeerNames = ref([]);

    const deleteProfileModalVisible = ref(false);
    const pendingDeleteProfileNames = ref([]);

    function deletePeer(index) {
      pendingDeletePeerNames.value = [config.value.peers[index].address];
      deletePeerModalVisible.value = true;
    }

    function confirmDeletePeer() {
      const index = config.value.peers.findIndex(a => a.address === pendingDeletePeerNames.value[0]);
      if (index >= 0) {
        config.value.peers.splice(index, 1);
      }
      deletePeerModalVisible.value = false;
      pendingDeletePeerNames.value = [];
    }

    function deleteProfile(index) {
      pendingDeleteProfileNames.value = [config.value.profiles[index].name];
      deleteProfileModalVisible.value = true;
    }

    function confirmDeleteProfile() {
      const index = config.value.profiles.findIndex(a => a.name === pendingDeleteProfileNames.value[0]);
      if (index >= 0) {
        config.value.profiles.splice(index, 1);
      }
      deleteProfileModalVisible.value = false;
      pendingDeleteProfileNames.value = [];
    }

    onMounted(() => {
      load();
      onMenuRefresh(load);
    });

    return {
      t,
      loading, saving, saved, config, activeTab, writeDisabled,
      peerModalVisible, editingPeerIndex, peerForm,
      profileModalVisible, editingProfileIndex, profileForm,
      peerColumns, profileColumns, commandPath,
      openPeerModal, openProfileModal,
      deletePeer, deleteProfile,
      confirmDeletePeer, confirmDeleteProfile,
      deletePeerModalVisible, pendingDeletePeerNames,
      deleteProfileModalVisible, pendingDeleteProfileNames,
      savePeer, saveProfile,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">{{ t('bfd.alerts.saved') }}</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'peer', title: t('bfd.tabs.peer') },
        { key: 'profile', title: t('bfd.tabs.profile') }
      ]">

        <template #peer>
          <DataTable :columns="peerColumns" :data="config.peers" :loading="loading" :disabled="writeDisabled"
                     rowKey="address" :actions="['create', 'edit', 'delete']"
                     @create="openPeerModal(-1)" @edit="openPeerModal" @delete="deletePeer" />
        </template>

        <template #profile>
          <DataTable :columns="profileColumns" :data="config.profiles" :loading="loading" :disabled="writeDisabled"
                     rowKey="name" :actions="['create', 'edit', 'delete']"
                     @create="openProfileModal(-1)" @edit="openProfileModal" @delete="deleteProfile" />
        </template>
      </TabGroup>

      <!-- Peer Modal -->
      <DraggableModal v-model:visible="peerModalVisible" :title="editingPeerIndex >= 0 ? t('bfd.modals.editPeer') : t('bfd.modals.addPeer')" width="600px" @confirm="savePeer">
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.peerAddressRequired') }}</label>
          <input type="text" class="form-control" v-model="peerForm.address" :placeholder="t('bfd.placeholders.ipv4')" style="width:100%;" :disabled="editingPeerIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.sourceAddress') }}</label>
          <input type="text" class="form-control" v-model="peerForm['source-address']" :placeholder="t('bfd.placeholders.ipv4')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.multiplier') }}</label>
          <input type="number" class="form-control" v-model="peerForm.multiplier" min="2" max="50" :placeholder="t('bfd.placeholders.multiplier')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.receiveInterval') }}</label>
          <input type="number" class="form-control" v-model="peerForm['receive-interval']" min="50" max="1000" :placeholder="t('bfd.placeholders.intervalMs')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.transmitInterval') }}</label>
          <input type="number" class="form-control" v-model="peerForm['transmit-interval']" min="50" max="1000" :placeholder="t('bfd.placeholders.intervalMs')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.profile') }}</label>
          <input type="text" class="form-control" v-model="peerForm.profile" :placeholder="t('bfd.placeholders.profileName')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Profile Modal -->
      <DraggableModal v-model:visible="profileModalVisible" :title="editingProfileIndex >= 0 ? t('bfd.modals.editProfile') : t('bfd.modals.addProfile')" width="500px" @confirm="saveProfile">
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.nameRequired') }}</label>
          <input type="text" class="form-control" v-model="profileForm.name" :placeholder="t('bfd.placeholders.profileName')" style="width:100%;" :disabled="editingProfileIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.receiveInterval') }}</label>
          <input type="number" class="form-control" v-model="profileForm['receive-interval']" min="50" max="1000" :placeholder="t('bfd.placeholders.intervalMs')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.transmitInterval') }}</label>
          <input type="number" class="form-control" v-model="profileForm['transmit-interval']" min="50" max="1000" :placeholder="t('bfd.placeholders.intervalMs')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('bfd.labels.multiplier') }}</label>
          <input type="number" class="form-control" v-model="profileForm.multiplier" min="2" max="50" :placeholder="t('bfd.placeholders.multiplier')" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modals -->
      <DraggableModal v-model:visible="deletePeerModalVisible" :title="t('bfd.modals.confirmDelete')" width="400px" @confirm="confirmDeletePeer">
        <div>{{ t('bfd.messages.confirmDeletePeer') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeletePeerNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteProfileModalVisible" :title="t('bfd.modals.confirmDelete')" width="400px" @confirm="confirmDeleteProfile">
        <div>{{ t('bfd.messages.confirmDeleteProfile') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteProfileNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
