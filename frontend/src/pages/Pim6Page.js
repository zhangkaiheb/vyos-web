import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, interfaceApi } from '/src/api/index.js';
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

function validateIPv6(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+$/.test(value)) return 'IPv6 地址格式错误';
  return '';
}

function validateIPv6Prefix(value) {
  if (!value) return '';
  if (!/^[0-9a-fA-F:]+\/\d{1,3}$/.test(value)) return 'IPv6 前缀格式错误 (例如: ff00::/8)';
  return '';
}

function validateTimer(value, min, max, name) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) return `${name}必须在 ${min}-${max} 之间`;
  return '';
}

function validatePriority(value) {
  if (!value) return '';
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 4294967295) return '优先级必须在 1-4294967295 之间';
  return '';
}

// PIM6 配置转换
function configToForm(data = {}) {
  // 接口列表
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

    const interfaceColumns = [
      { key: 'name', title: '接口名称' },
      { key: 'dr-priority', title: 'DR 优先级' },
      { key: 'hello', title: 'Hello 间隔' },
      { key: 'passive', title: '被动' },
    ];

    const rpColumns = [
      { key: 'address', title: 'RP 地址' },
      { key: 'prefix-list6', title: '前缀列表' },
      { key: 'groups', title: '组地址', format: row => (row.groups || []).join(', ') },
    ];

    const commandPath = computed(() => {
      if (activeTab.value === 'interfaces') return 'protocols pim6 interface';
      if (activeTab.value === 'rp') return 'protocols pim6 rp';
      return 'protocols pim6';
    });

    const MLD_VERSION_OPTIONS = [
      { value: '', label: '默认 (2)' },
      { value: '1', label: '版本 1' },
      { value: '2', label: '版本 2' },
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
        const err = validateTimer(config.value['join-prune-interval'], 1, 65535, 'Join/Prune 间隔');
        if (err) return alert(err);
      }
      if (config.value['keep-alive-timer']) {
        const err = validateTimer(config.value['keep-alive-timer'], 1, 65535, 'Keep-Alive 定时器');
        if (err) return alert(err);
      }
      for (const iface of config.value.interfaces) {
        if (iface['dr-priority']) {
          const err = validatePriority(iface['dr-priority']);
          if (err) return alert(`接口 ${iface.name}：${err}`);
        }
        for (const j of iface.joins) {
          if (j.group) {
            const err = validateIPv6(j.group);
            if (err) return alert(`接口 ${iface.name} MLD Join：${err}`);
          }
          if (j.source) {
            const err = validateIPv6(j.source);
            if (err) return alert(`接口 ${iface.name} MLD Join：${err}`);
          }
        }
      }
      for (const rp of config.value.rp.addresses) {
        if (rp.address) {
          const err = validateIPv6(rp.address);
          if (err) return alert(`RP 地址：${err}`);
        }
        for (const g of rp.groups) {
          if (g) {
            const err = validateIPv6Prefix(g);
            if (err) return alert(`RP ${rp.address} 组地址：${err}`);
          }
        }
      }

      saving.value = true;
      saved.value = false;
      try {
        const payload = configToConfig(config.value);
        await configApi.set('protocols pim6', payload);
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
      if (!interfaceForm.value.name) return alert('请输入接口名称');
      if (editingInterfaceIndex.value >= 0) {
        config.value.interfaces.splice(editingInterfaceIndex.value, 1, JSON.parse(JSON.stringify(interfaceForm.value)));
      } else {
        config.value.interfaces.push(JSON.parse(JSON.stringify(interfaceForm.value)));
      }
      interfaceModalVisible.value = false;
    }

    function deleteInterface(index) {
      if (confirm('确定删除此接口？')) config.value.interfaces.splice(index, 1);
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
      if (!joinForm.value.group) return alert('请输入组播组地址');
      if (editingJoinIndex.value >= 0) {
        interfaceForm.value.joins.splice(editingJoinIndex.value, 1, JSON.parse(JSON.stringify(joinForm.value)));
      } else {
        interfaceForm.value.joins.push(JSON.parse(JSON.stringify(joinForm.value)));
      }
      joinModalVisible.value = false;
    }

    function deleteJoin(index) {
      if (confirm('确定删除此 MLD Join？')) interfaceForm.value.joins.splice(index, 1);
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
      if (!rpForm.value.address) return alert('请输入 RP 地址');
      if (editingRpIndex.value >= 0) {
        config.value.rp.addresses.splice(editingRpIndex.value, 1, JSON.parse(JSON.stringify(rpForm.value)));
      } else {
        config.value.rp.addresses.push(JSON.parse(JSON.stringify(rpForm.value)));
      }
      rpModalVisible.value = false;
    }

    function deleteRp(index) {
      if (confirm('确定删除此 RP 地址？')) config.value.rp.addresses.splice(index, 1);
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
    });

    return {
      loading, saving, saved, config, activeTab, writeDisabled,
      interfaceModalVisible, editingInterfaceIndex, interfaceForm,
      joinModalVisible, editingJoinIndex, joinForm,
      rpModalVisible, editingRpIndex, rpForm, newRpGroup,
      interfaceColumns, rpColumns, commandPath,
      MLD_VERSION_OPTIONS,
      openInterfaceModal, saveInterface, deleteInterface,
      openJoinModal, saveJoin, deleteJoin,
      openRpModal, saveRp, deleteRp, addRpGroup, removeRpGroup,
      save, configToConfig,
    };
  },
  components: { TabGroup, ToolbarButton, CommandPreview, DataTable, DraggableModal },
  template: `
    <div class="page-container">
      <div v-if="saved" class="alert alert-success">已保存</div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'basic', title: '基本设置' },
        { key: 'interfaces', title: '接口' },
        { key: 'rp', title: 'RP 地址' }
      ]">

        <template #basic>
          <div style="padding:16px;">
            <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
              <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">基本配置</div>
              <div style="padding:16px;">
                <div class="form-row">
                  <label class="form-label">Join/Prune 间隔</label>
                  <input type="number" class="form-control" v-model="config['join-prune-interval']" min="1" max="65535" placeholder="默认: 60 秒" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">Keep-Alive 定时器</label>
                  <input type="number" class="form-control" v-model="config['keep-alive-timer']" min="1" max="65535" placeholder="Keep-Alive 定时器" style="width:100%;" />
                </div>
                <div class="form-row">
                  <label class="form-label">RP Keep-Alive 定时器</label>
                  <input type="number" class="form-control" v-model="config.rp['keep-alive-timer']" min="1" max="65535" placeholder="RP Keep-Alive 定时器" style="width:100%;" />
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

      <CommandPreview :path="commandPath" />
      <div class="page-actions-bottom">
        <ToolbarButton icon="save" primary @click="save" :disabled="saving || writeDisabled">{{ saving ? '保存中...' : '保存' }}</ToolbarButton>
      </div>

      <!-- Interface Modal -->
      <DraggableModal v-model:visible="interfaceModalVisible" :title="editingInterfaceIndex >= 0 ? '编辑 PIMv6 接口' : '添加 PIMv6 接口'" width="700px" @confirm="saveInterface">
        <div class="form-row">
          <label class="form-label">接口名称 *</label>
          <template v-if="editingInterfaceIndex >= 0">
            <input type="text" class="form-control" v-model="interfaceForm.name"
                   style="width:100%;" disabled />
          </template>
          <template v-else>
            <select class="form-control" v-model="interfaceForm.name" style="width:100%;">
              <option value="">请选择接口</option>
              <option v-for="iface in interfaces" :key="iface" :value="iface">{{ iface }}</option>
            </select>
          </template>
        </div>
        <div class="form-row">
          <label class="form-label">DR 优先级</label>
          <input type="number" class="form-control" v-model="interfaceForm['dr-priority']" min="1" placeholder="1-4294967295" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">Hello 间隔</label>
          <input type="number" class="form-control" v-model="interfaceForm.hello" min="1" placeholder="Hello 间隔 (秒)" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">不处理 Bootstrap 消息 (no-bsm)</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">不处理单播 Bootstrap 消息 (no-unicast-bsm)</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm['no-unicast-bsm']" /></label>
        </div>
        <div class="form-row">
          <label class="form-label">被动模式 (passive)</label>
          <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" v-model="interfaceForm.passive" /></label>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">MLD</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">
                <input type="checkbox" v-model="interfaceForm.mld.disable" />
                禁用 MLD
              </label>
            </div>
            <div class="form-row">
              <label class="form-label">MLD 版本</label>
              <select class="form-control" v-model="interfaceForm.mld.version" style="width:100%;">
                <option v-for="opt in MLD_VERSION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">查询间隔</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld.interval" min="1" placeholder="MLD 查询间隔 (秒)" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">最大响应时间</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['max-response-time']" min="1" placeholder="MLD 最大响应时间 (秒)" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">最后成员查询计数</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['last-member-query-count']" min="1" placeholder="最后成员查询计数" style="width:100%;" />
            </div>
            <div class="form-row">
              <label class="form-label">最后成员查询间隔</label>
              <input type="number" class="form-control" v-model="interfaceForm.mld['last-member-query-interval']" min="1" placeholder="最后成员查询间隔 (秒)" style="width:100%;" />
            </div>
          </div>
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">MLD Join 组播组</div>
          <div style="padding:16px;">
            <div style="margin-bottom:10px;">
              <ToolbarButton size="small" @click="openJoinModal(-1)">添加 Join</ToolbarButton>
            </div>
            <table class="data-table" v-if="interfaceForm.joins.length">
              <thead><tr><th>组播组地址</th><th>源地址</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="(j, idx) in interfaceForm.joins" :key="idx">
                  <td>{{ j.group }}</td>
                  <td>{{ j.source || '-' }}</td>
                  <td>
                    <ToolbarButton size="small" @click="openJoinModal(idx)">编辑</ToolbarButton>
                    <ToolbarButton size="small" danger @click="deleteJoin(idx)">删除</ToolbarButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DraggableModal>

      <!-- Join Modal -->
      <DraggableModal v-model:visible="joinModalVisible" :title="editingJoinIndex >= 0 ? '编辑 MLD Join' : '添加 MLD Join'" width="500px" @confirm="saveJoin">
        <div class="form-row">
          <label class="form-label">组播组地址 *</label>
          <input type="text" class="form-control" v-model="joinForm.group" placeholder="例如: ff02::1" style="width:100%;" :disabled="editingJoinIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">源地址</label>
          <input type="text" class="form-control" v-model="joinForm.source" placeholder="IPv6 源地址" style="width:100%;" />
        </div>
      </DraggableModal>

      <!-- RP Modal -->
      <DraggableModal v-model:visible="rpModalVisible" :title="editingRpIndex >= 0 ? '编辑 RP 地址' : '添加 RP 地址'" width="600px" @confirm="saveRp">
        <div class="form-row">
          <label class="form-label">RP 地址 *</label>
          <input type="text" class="form-control" v-model="rpForm.address" placeholder="例如: 2001:db8::1" style="width:100%;" :disabled="editingRpIndex >= 0" />
        </div>
        <div class="form-row">
          <label class="form-label">前缀列表 (IPv6)</label>
          <input type="text" class="form-control" v-model="rpForm['prefix-list6']" placeholder="prefix-list6 名称" style="width:100%;" />
        </div>
        <div style="margin-top:16px; border:1px solid #d9d9d9; border-radius:4px; overflow:hidden;">
          <div style="background:#f5f5f5; padding:10px 16px; font-weight:bold; font-size:14px; border-bottom:1px solid #d9d9d9;">组地址范围</div>
          <div style="padding:16px;">
            <div class="form-row">
              <label class="form-label">添加组地址</label>
              <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="form-control" v-model="newRpGroup" placeholder="例如: ff00::/8" style="width:100%;" />
                <ToolbarButton size="small" @click="addRpGroup">添加</ToolbarButton>
              </div>
            </div>
            <div v-for="(g, idx) in rpForm.groups" :key="idx" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
              <span>{{ g }}</span>
              <ToolbarButton size="small" danger @click="removeRpGroup(idx)">删除</ToolbarButton>
            </div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
