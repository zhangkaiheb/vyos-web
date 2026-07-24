import { defineComponent, ref, onMounted, computed } from '/src/utils/vue-import.js';
import { userApi, aclApi } from '/src/api/index.js';
import { t } from '/src/i18n/index.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'UserPage',
  setup() {
    const users = ref([]);
    const acls = ref([]);
    const modalVisible = ref(false);
    const pwdModalVisible = ref(false);
    const editingUser = ref({ allowed_ips: [], allowed_macs: [], enabled: true });
    const passwordUser = ref({ username: '', password: '' });
    const selected = ref([]);
    const message = ref('');

    async function load() {
      const [u, a] = await Promise.all([userApi.list(), aclApi.list()]);
      users.value = u.users || [];
      acls.value = a.tables || [];
    }

    onMounted(load);

    const aclMap = computed(() => {
      const m = {};
      for (const a of acls.value) m[a.id] = a.name;
      return m;
    });

    function create() {
      editingUser.value = { username: '', password: '', full_name: '', email: '', allowed_ips: [], allowed_macs: [], access_control_table_id: acls.value[0]?.id || 3, enabled: true };
      modalVisible.value = true;
    }

    function edit() {
      if (!selected.value.length) return alert(t('msg.noSelection'));
      const u = users.value.find(x => x.username === selected.value[0]);
      if (!u) return;
      editingUser.value = { ...u, password: '' };
      modalVisible.value = true;
    }

    function changePassword() {
      if (!selected.value.length) return alert(t('msg.noSelection'));
      passwordUser.value = { username: selected.value[0], password: '' };
      pwdModalVisible.value = true;
    }

    async function savePassword() {
      try {
        await userApi.password(passwordUser.value.username, passwordUser.value.password);
        pwdModalVisible.value = false;
        message.value = t('msg.saved');
      } catch (e) {
        alert(e.message);
      }
    }

    async function remove() {
      if (!selected.value.length) return alert(t('msg.noSelection'));
      if (!confirm(t('msg.confirmDelete'))) return;
      for (const name of selected.value) {
        await userApi.delete(name);
      }
      selected.value = [];
      await load();
    }

    async function save() {
      try {
        const payload = { ...editingUser.value };
        payload.allowed_ips = (payload.allowed_ips || []).slice(0, 8);
        payload.allowed_macs = (payload.allowed_macs || []).slice(0, 8);
        const exists = users.value.some(u => u.username === payload.username);
        if (exists) {
          await userApi.update(payload.username, payload);
        } else {
          await userApi.create(payload);
        }
        modalVisible.value = false;
        await load();
      } catch (e) {
        alert(e.message);
      }
    }

    const ipInput = computed({
      get() { return (editingUser.value.allowed_ips || []).join('\n'); },
      set(v) { editingUser.value.allowed_ips = v.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8); },
    });

    const macInput = computed({
      get() { return (editingUser.value.allowed_macs || []).slice(0, 8).join('\n'); },
      set(v) { editingUser.value.allowed_macs = v.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8); },
    });

    return {
      users, acls, modalVisible, pwdModalVisible, editingUser, passwordUser, selected, message,
      aclMap, load, create, edit, remove, save, changePassword, savePassword, ipInput, macInput,
      columns: [
        { key: 'username', title: t('user.username') },
        { key: 'full_name', title: t('user.fullName') },
        { key: 'email', title: t('user.email') },
        { key: 'enabled', title: t('user.enabled') },
        { key: 'access_control_table_id', title: t('user.acl') },
        { key: 'allowed_ips', title: t('user.allowedIps') },
        { key: 'allowed_macs', title: t('user.allowedMacs') },
      ],
    };
  },
  template: `
    <div class="page-container">
      <div v-if="message" class="alert alert-success">{{ message }}</div>
      <div class="toolbar">
        <div class="toolbar-left">
          <ToolbarButton icon="create" @click="create">{{ $t('app.create') }}</ToolbarButton>
          <ToolbarButton icon="edit" @click="edit">{{ $t('app.edit') }}</ToolbarButton>
          <ToolbarButton icon="changePassword" @click="changePassword">{{ $t('user.changePassword') }}</ToolbarButton>
          <ToolbarButton icon="delete" @click="remove">{{ $t('app.delete') }}</ToolbarButton>
          <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
        </div>
      </div>
      <DataTable :columns="columns" :data="users" :externalToolbar="true" @selection-change="selected = $event">
        <template #enabled="{ value }">
          <span v-if="value">✓</span><span v-else style="opacity:0.3">-</span>
        </template>
        <template #access_control_table_id="{ value }">
          {{ aclMap[value] || value }}
        </template>
        <template #allowed_ips="{ value }">
          {{ (value || []).join(', ') }}
        </template>
        <template #allowed_macs="{ value }">
          {{ (value || []).join(', ') }}
        </template>
      </DataTable>
      <DraggableModal v-model:visible="modalVisible" :title="$t('user.title')" @confirm="save">
        <div class="form-row"><label class="form-label">{{ $t('user.username') }}</label><input class="form-control" v-model="editingUser.username" :disabled="editingUser.username && users.some(u => u.username === editingUser.username)" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.password') }}</label><input class="form-control" type="password" v-model="editingUser.password" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.fullName') }}</label><input class="form-control" v-model="editingUser.full_name" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.email') }}</label><input class="form-control" type="email" v-model="editingUser.email" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.enabled') }}</label><input type="checkbox" v-model="editingUser.enabled" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.acl') }}</label>
          <select class="form-control" v-model.number="editingUser.access_control_table_id">
            <option v-for="a in acls" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="form-row"><label class="form-label">{{ $t('user.allowedIps') }}</label><textarea class="form-control" v-model="ipInput" :placeholder="$t('user.ipsHint')" /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.allowedMacs') }}</label><textarea class="form-control" v-model="macInput" :placeholder="$t('user.macsHint')" /></div>
      </DraggableModal>
      <DraggableModal v-model:visible="pwdModalVisible" title="修改密码" @confirm="savePassword">
        <div class="form-row"><label class="form-label">{{ $t('user.username') }}</label><input class="form-control" v-model="passwordUser.username" disabled /></div>
        <div class="form-row"><label class="form-label">{{ $t('user.password') }}</label><input class="form-control" type="password" v-model="passwordUser.password" /></div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ToolbarButton },
});
