import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import CommandPreview from '/src/components/Layout/CommandPreview.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

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

function validateIPv4(value) {
  if (!value) return '';
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'IPv4 地址格式错误';
  if (!value.split('.').every(n => parseInt(n, 10) <= 255)) return 'IPv4 地址格式错误';
  return '';
}

function validateInterval(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
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
      { key: 'address', title: '对端地址' },
      { key: 'source-address', title: '源地址' },
      { key: 'multiplier', title: '乘数' },
      { key: 'receive-interval', title: '接收间隔' },
      { key: 'transmit-interval', title: '发送间隔' },
      { key: 'profile', title: '配置文件' },
    ];

    const profileColumns = [
      { key: 'name', title: '名称' },
      { key: 'receive-interval', title: '接收间隔' },
      { key: 'transmit-interval', title: '发送间隔' },
      { key: 'multiplier', title: '乘数' },
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
        await configApi.set('protocols bfd', payload);
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
      if (!peerForm.value.address) return alert('请输入对端地址');
      const err = validateIPv4(peerForm.value.address);
      if (err) return alert(err);
      if (peerForm.value.multiplier) {
        const err = validateInterval(peerForm.value.multiplier, 2, 50, '乘数');
        if (err) return alert(err);
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
      if (!profileForm.value.name) return alert('请输入配置文件名称');
      if (editingProfileIndex.value >= 0) {
        config.value.profiles.splice(editingProfileIndex.value, 1, JSON.parse(JSON.stringify(profileForm.value)));
      } else {
        config.value.profiles.push(JSON.parse(JSON.stringify(profileForm.value)));
      }
      profileModalVisible.value = false;
    }

    function deletePeer(index) {
      if (confirm('确定删除此对端？')) config.value.peers.splice(index, 1);
    }

    function deleteProfile(index) {
      if (confirm('确定删除此配置文件？')) config.value.profiles.splice(index, 1);
    }

    onMounted(load);

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      peerModalVisible, editingPeerIndex, peerForm,
      profileModalVisible, editingProfileIndex, profileForm,
      peerColumns, profileColumns, commandPath,
      openPeerModal, openProfileModal,
      deletePeer, deleteProfile,
      savePeer, saveProfile,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'peer', title: '对端' },
        { key: 'profile', title: '配置文件' }
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

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Peer Modal -->
      <DraggableModal v-model:visible="peerModalVisible" :title="editingPeerIndex >= 0 ? '编辑 BFD 对端' : '添加 BFD 对端'" width="600px" @confirm="savePeer">
        <div class="form-row">
          <label class="form-label">对端地址 *</label>
          <input type="text" class="form-control" v-model="peerForm.address" placeholder="IPv4 地址" style="width:100%;" :disabled="editingPeerIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">源地址</label>
          <input type="text" class="form-control" v-model="peerForm['source-address']" placeholder="IPv4 地址" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">乘数</label>
          <input type="number" class="form-control" v-model="peerForm.multiplier" min="2" max="50" placeholder="2-50" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">接收间隔</label>
          <input type="number" class="form-control" v-model="peerForm['receive-interval']" min="50" max="1000" placeholder="50-1000 毫秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">发送间隔</label>
          <input type="number" class="form-control" v-model="peerForm['transmit-interval']" min="50" max="1000" placeholder="50-1000 毫秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">配置文件</label>
          <input type="text" class="form-control" v-model="peerForm.profile" placeholder="配置文件名称" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- Profile Modal -->
      <DraggableModal v-model:visible="profileModalVisible" :title="editingProfileIndex >= 0 ? '编辑 BFD 配置文件' : '添加 BFD 配置文件'" width="500px" @confirm="saveProfile">
        <div class="form-row">
          <label class="form-label">名称 *</label>
          <input type="text" class="form-control" v-model="profileForm.name" placeholder="配置文件名称" style="width:100%;" :disabled="editingProfileIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">接收间隔</label>
          <input type="number" class="form-control" v-model="profileForm['receive-interval']" min="50" max="1000" placeholder="50-1000 毫秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">发送间隔</label>
          <input type="number" class="form-control" v-model="profileForm['transmit-interval']" min="50" max="1000" placeholder="50-1000 毫秒" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">乘数</label>
          <input type="number" class="form-control" v-model="profileForm.multiplier" min="2" max="50" placeholder="2-50" style="width:100%;" />
        </div>
      </DraggableModal>
    </div>
  `,
});
