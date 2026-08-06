import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, api } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

const COLUMNS = [
  { key: 'index', label: '序号', width: 80 },
  { key: 'timestamp', label: '时间', width: 200 },
  { key: 'user', label: '用户', width: 120 },
  { key: 'source', label: '来源', width: 200 },
];

const TAB_ITEMS = [
  { key: 'revisions', title: '版本历史' },
  { key: 'compare', title: '配置比较' },
  { key: 'actions', title: '配置操作' },
];

const COMMENT_SECTIONS = [
  { value: 'firewall', label: 'Firewall' },
  { value: 'interfaces', label: 'Network interfaces' },
  { value: 'policy', label: 'Routing policy' },
  { value: 'protocols', label: 'Routing protocols' },
  { value: 'service', label: 'System services' },
  { value: 'system', label: 'System parameters' },
  { value: 'vpn', label: 'Virtual Private Network (VPN)' },
];

const LOAD_PROTOCOLS = [
  { value: 'scp', label: 'scp://' },
  { value: 'sftp', label: 'sftp://' },
  { value: 'http', label: 'http://' },
  { value: 'https', label: 'https://' },
  { value: 'ftp', label: 'ftp://' },
  { value: 'tftp', label: 'tftp://' },
];

const RENAME_PATHS = [
  { value: 'firewall', label: 'Firewall', hasSub: false },
  { value: 'interfaces', label: 'Network Interfaces', hasSub: true, subs: [
    { value: 'bonding', label: 'Bonding' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'dummy', label: 'Dummy' },
    { value: 'ethernet', label: 'Ethernet' },
    { value: 'geneve', label: 'GENEVE' },
    { value: 'input', label: 'Input' },
    { value: 'l2tpv3', label: 'L2TPv3' },
    { value: 'loopback', label: 'Loopback' },
    { value: 'macsec', label: 'MACsec' },
    { value: 'openvpn', label: 'OpenVPN' },
    { value: 'pppoe', label: 'PPPoE' },
    { value: 'pseudo-ethernet', label: 'Pseudo Ethernet' },
    { value: 'sstpc', label: 'SSTPC' },
    { value: 'tunnel', label: 'Tunnel' },
    { value: 'virtual-ethernet', label: 'Virtual Ethernet' },
    { value: 'vti', label: 'VTI' },
    { value: 'vxlan', label: 'VXLAN' },
    { value: 'wireguard', label: 'WireGuard' },
    { value: 'wireless', label: 'Wireless' },
    { value: 'wwan', label: 'WWAN' },
  ]},
  { value: 'policy', label: 'Routing Policy', hasSub: true, subs: [
    { value: 'access-list', label: 'Access List' },
    { value: 'access-list6', label: 'Access List6' },
    { value: 'as-path-list', label: 'AS Path List' },
    { value: 'community-list', label: 'Community List' },
    { value: 'extcommunity-list', label: 'Extended Community List' },
    { value: 'large-community-list', label: 'Large Community List' },
    { value: 'local-route', label: 'Local Route' },
    { value: 'local-route6', label: 'Local Route6' },
    { value: 'prefix-list', label: 'Prefix List' },
    { value: 'prefix-list6', label: 'Prefix List6' },
    { value: 'route', label: 'Route' },
    { value: 'route-map', label: 'Route Map' },
    { value: 'route6', label: 'Route6' },
  ]},
  { value: 'protocols', label: 'Routing Protocols', hasSub: false },
  { value: 'qos', label: 'QoS', hasSub: true, subs: [
    { value: 'interface', label: 'Interface' },
    { value: 'policy', label: 'Policy' },
    { value: 'traffic-match-group', label: 'Traffic Match Group' },
  ]},
  { value: 'service', label: 'System Services', hasSub: true, subs: [
    { value: 'aws', label: 'AWS' },
    { value: 'broadcast-relay', label: 'Broadcast Relay' },
    { value: 'config-sync', label: 'Config Sync' },
    { value: 'conntrack-sync', label: 'Conntrack Sync' },
    { value: 'console-server', label: 'Console Server' },
    { value: 'dhcp-relay', label: 'DHCP Relay' },
    { value: 'dhcp-server', label: 'DHCP Server' },
    { value: 'dhcpv6-relay', label: 'DHCPv6 Relay' },
    { value: 'dhcpv6-server', label: 'DHCPv6 Server' },
    { value: 'dns', label: 'DNS' },
    { value: 'event-handler', label: 'Event Handler' },
    { value: 'https', label: 'HTTPS' },
    { value: 'ids', label: 'IDS' },
    { value: 'ipoe-server', label: 'IPoE Server' },
    { value: 'lldp', label: 'LLDP' },
    { value: 'mdns', label: 'mDNS' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'ndp-proxy', label: 'NDP Proxy' },
    { value: 'ntp', label: 'NTP' },
    { value: 'pppoe-server', label: 'PPPoE Server' },
    { value: 'router-advert', label: 'Router Advert' },
    { value: 'salt-minion', label: 'Salt Minion' },
    { value: 'sla', label: 'SLA' },
    { value: 'snmp', label: 'SNMP' },
    { value: 'ssh', label: 'SSH' },
    { value: 'suricata', label: 'Suricata' },
    { value: 'tftp-server', label: 'TFTP Server' },
    { value: 'webproxy', label: 'Webproxy' },
  ]},
  { value: 'system', label: 'System Parameters', hasSub: false },
  { value: 'vpn', label: 'VPN', hasSub: true, subs: [
    { value: 'ipsec', label: 'IPsec' },
    { value: 'l2tp', label: 'L2TP' },
    { value: 'openconnect', label: 'OpenConnect' },
    { value: 'pptp', label: 'PPTP' },
    { value: 'sstp', label: 'SSTP' },
  ]},
  { value: 'vrf', label: 'VRF', hasSub: true, subs: [
    { value: 'name', label: 'VRF Name' },
  ]},
  { value: 'nat', label: 'NAT', hasSub: false },
  { value: 'nat64', label: 'NAT64', hasSub: true, subs: [
    { value: 'source', label: 'Source' },
  ]},
  { value: 'nat66', label: 'NAT66', hasSub: false },
  { value: 'netns', label: 'Network Namespace', hasSub: false },
  { value: 'pki', label: 'PKI', hasSub: false },
  { value: 'container', label: 'Container', hasSub: false },
  { value: 'load-balancing', label: 'Load Balancing', hasSub: false },
  { value: 'high-availability', label: 'High Availability', hasSub: false },
];

export default defineComponent({
  name: 'ConfigManagementPage',
  components: { DataTable, DraggableModal, ToolbarButton, TabGroup },
  setup() {
    const revisions = ref([]);
    const loading = ref(false);
    const selectedIndexes = ref([]);
    const activeTab = ref('revisions');

    // Compare
    const compareType = ref('working-active');
    const compareLeft = ref(0);
    const compareRight = ref(1);
    const compareResult = ref('');

    // Commit
    const commitComment = ref('');
    const showCommit = ref(false);

    // Commit-confirm
    const commitConfirmMinutes = ref(10);
    const commitConfirmComment = ref('');
    const showCommitConfirm = ref(false);

    // Confirm
    const showConfirm = ref(false);

    // Discard
    const showDiscard = ref(false);

    // Rollback-soft
    const rollbackSoftRevision = ref(0);
    const showRollbackSoft = ref(false);

    // Rollback
    const rollbackRevision = ref(0);
    const showRollback = ref(false);

    // Load
    const loadSource = ref('');
    const loadType = ref('local');
    const showLoad = ref(false);

    // Merge
    const mergeSource = ref('');
    const mergeType = ref('local');
    const showMerge = ref(false);

    // Save
    const saveTarget = ref('');
    const saveType = ref('local');
    const showSave = ref(false);

    // Comment
    const commentPath = ref('');
    const commentText = ref('');
    const showComment = ref(false);

    // Rename
    const renameCategory = ref('');
    const renameSubCategory = ref('');
    const renameOldName = ref('');
    const renameNewName = ref('');
    const showRename = ref(false);

    const renameSubOptions = computed(() => {
      const cat = RENAME_PATHS.find(c => c.value === renameCategory.value);
      return cat && cat.hasSub ? cat.subs : [];
    });

    const currentCommand = computed(() => {
      switch (activeTab.value) {
        case 'revisions': return 'show system commit-revisions';
        case 'compare': return 'compare';
        case 'actions': return 'commit / discard / save / load / merge / rollback';
        default: return '';
      }
    });

    async function loadRevisions() {
      loading.value = true;
      selectedIndexes.value = [];
      try {
        const res = await api.get('/system/revisions');
        revisions.value = (res.revisions || []).map((r, i) => ({
          index: i,
          ...r,
        }));
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    // --- Toolbar actions ---

    function doCompareSelected() {
      if (!selectedIndexes.value.length) return;
      compareLeft.value = selectedIndexes.value[0];
      compareRight.value = selectedIndexes.value.length > 1 ? selectedIndexes.value[1] : 0;
      compareType.value = selectedIndexes.value.length > 1 ? 'revision-revision' : 'working-revision';
      activeTab.value = 'compare';
      doCompare();
    }

    function doRollbackSoftSelected() {
      if (!selectedIndexes.value.length) return;
      rollbackSoftRevision.value = selectedIndexes.value[0];
      showRollbackSoft.value = true;
    }

    function doRollbackSelected() {
      if (!selectedIndexes.value.length) return;
      rollbackRevision.value = selectedIndexes.value[0];
      showRollback.value = true;
    }

    function doDeleteSelected() {
      if (!selectedIndexes.value.length) return;
      if (!confirm('确定要删除选中的版本记录吗？')) return;
      // VyOS 修订版本不能直接删除，这里只是提示
      alert('VyOS 修订版本无法直接删除，可通过系统清理功能管理。');
    }

    async function doCompare() {
      try {
        let left, right;
        if (compareType.value === 'working-active') {
          left = null; right = null;
        } else if (compareType.value === 'working-saved') {
          left = 'saved'; right = null;
        } else if (compareType.value === 'working-revision') {
          left = compareLeft.value; right = null;
        } else {
          left = compareLeft.value; right = compareRight.value;
        }
        const res = await configApi.compare(left, right);
        if (res.diff) {
          compareResult.value = res.diff;
        } else if (res.left && res.right) {
          compareResult.value = JSON.stringify({ running: res.left, session: res.right }, null, 2);
        } else {
          compareResult.value = 'No differences found.';
        }
      } catch (e) {
        showError(e);
      }
    }

    async function doCommitNormal() {
      try {
        const res = await api.post('/config/commit-with-comment', {
          comment: commitComment.value,
        });
        showCommit.value = false;
        commitComment.value = '';
        alert(res.message || 'Commit 成功');
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doCommitConfirm() {
      try {
        const res = await api.post('/config/commit-confirm', {
          minutes: commitConfirmMinutes.value,
          comment: commitConfirmComment.value,
        });
        showCommitConfirm.value = false;
        alert(res.message || 'Commit-confirm 成功');
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doConfirmAction() {
      try {
        const res = await api.post('/config/confirm', {});
        showConfirm.value = false;
        alert(res.message || 'Confirm 成功');
      } catch (e) {
        showError(e);
      }
    }

    async function doDiscardAction() {
      try {
        const res = await configApi.discard();
        showDiscard.value = false;
        alert(res.message || '未提交变更已丢弃');
      } catch (e) {
        showError(e);
      }
    }

    async function doRollbackSoftAction() {
      try {
        const res = await api.post('/config/rollback-soft', {
          revision: rollbackSoftRevision.value,
        });
        showRollbackSoft.value = false;
        alert(res.message || 'Rollback-soft 成功，请检查差异后 commit');
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doRollbackAction() {
      try {
        const res = await configApi.rollback(rollbackRevision.value);
        showRollback.value = false;
        alert(res.message || 'Rollback 成功，需要重启生效');
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doLoadAction() {
      try {
        let source = loadSource.value;
        if (loadType.value !== 'local' && loadType.value !== 'system') {
          source = loadType.value + '://' + source;
        }
        const res = await api.post('/config/load-file', { source, type: loadType.value });
        showLoad.value = false;
        loadSource.value = '';
        alert(res.message || '配置加载成功');
      } catch (e) {
        showError(e);
      }
    }

    async function doMergeAction() {
      try {
        let source = mergeSource.value;
        if (mergeType.value !== 'local' && mergeType.value !== 'system') {
          source = mergeType.value + '://' + source;
        }
        const res = await api.post('/config/merge-file', { source, type: mergeType.value });
        showMerge.value = false;
        mergeSource.value = '';
        alert(res.message || '配置合并成功');
      } catch (e) {
        showError(e);
      }
    }

    async function doSaveAction() {
      try {
        let target = saveTarget.value;
        if (saveType.value !== 'local' && saveType.value !== 'system') {
          target = saveType.value + '://' + target;
        }
        const res = await api.post('/config/save-file', { target, type: saveType.value });
        showSave.value = false;
        saveTarget.value = '';
        alert(res.message || '配置保存成功');
      } catch (e) {
        showError(e);
      }
    }

    async function doCommentAction() {
      try {
        const res = await api.post('/config/comment', {
          path: commentPath.value,
          text: commentText.value,
        });
        showComment.value = false;
        commentPath.value = '';
        commentText.value = '';
        alert(res.message || 'Comment 添加成功');
      } catch (e) {
        showError(e);
      }
    }

    async function doRenameAction() {
      try {
        let path = renameCategory.value;
        if (renameSubCategory.value) {
          path += ' ' + renameSubCategory.value;
        }
        const res = await api.post('/config/rename', {
          path: path,
          oldName: renameOldName.value,
          newName: renameNewName.value,
        });
        showRename.value = false;
        renameCategory.value = '';
        renameSubCategory.value = '';
        renameOldName.value = '';
        renameNewName.value = '';
        alert(res.message || 'Rename 成功');
      } catch (e) {
        showError(e);
      }
    }

    onMounted(() => {
      loadRevisions();
    });

    return {
      revisions, loading, selectedIndexes, activeTab, currentCommand,
      COLUMNS, TAB_ITEMS, COMMENT_SECTIONS, LOAD_PROTOCOLS, RENAME_PATHS,
      compareType, compareLeft, compareRight, compareResult,
      commitComment, showCommit,
      commitConfirmMinutes, commitConfirmComment, showCommitConfirm,
      showConfirm, showDiscard,
      rollbackSoftRevision, showRollbackSoft,
      rollbackRevision, showRollback,
      loadSource, loadType, showLoad,
      mergeSource, mergeType, showMerge,
      saveTarget, saveType, showSave,
      commentPath, commentText, showComment,
      renameCategory, renameSubCategory, renameOldName, renameNewName, showRename, renameSubOptions,
      loadRevisions,
      doCompareSelected, doRollbackSoftSelected, doRollbackSelected, doDeleteSelected,
      doCompare, doCommitNormal, doCommitConfirm, doConfirmAction, doDiscardAction,
      doRollbackSoftAction, doRollbackAction,
      doLoadAction, doMergeAction, doSaveAction, doCommentAction, doRenameAction,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <div class="toolbar">
          <div class="toolbar-left">
            <ToolbarButton icon="search" @click="doCompareSelected" :disabled="!selectedIndexes.length">比较</ToolbarButton>
            <ToolbarButton icon="rollback" @click="doRollbackSoftSelected" :disabled="!selectedIndexes.length">软回滚</ToolbarButton>
            <ToolbarButton icon="rollback" @click="doRollbackSelected" :disabled="!selectedIndexes.length">回滚</ToolbarButton>
            <ToolbarButton icon="delete" @click="doDeleteSelected" :disabled="!selectedIndexes.length">删除</ToolbarButton>
            <ToolbarButton icon="refresh" @click="loadRevisions">刷新</ToolbarButton>
          </div>
        </div>

        <TabGroup v-model="activeTab" :tabs="TAB_ITEMS">
          <template #revisions>
            <DataTable :columns="COLUMNS" :data="revisions" :loading="loading"
                       @selection-change="selectedIndexes = $event" :selectable="true" :externalToolbar="true" row-key="index" table-key="config-revisions">
            </DataTable>
          </template>

          <template #compare>
            <div style="padding:16px;">
              <div class="form-row">
                <label class="form-label">比较类型</label>
                <select class="form-control" v-model="compareType" style="width:300px;">
                  <option value="working-active">工作配置 vs 活动配置</option>
                  <option value="working-saved">工作配置 vs 已保存配置</option>
                  <option value="working-revision">工作配置 vs 指定版本</option>
                  <option value="revision-revision">版本 N vs 版本 M</option>
                </select>
              </div>
              <div v-if="compareType === 'working-revision'" class="form-row">
                <label class="form-label">版本号</label>
                <input type="number" class="form-control" v-model.number="compareLeft" style="width:120px;" />
              </div>
              <div v-if="compareType === 'revision-revision'" class="form-row">
                <label class="form-label">版本 N</label>
                <input type="number" class="form-control" v-model.number="compareLeft" style="width:120px;display:inline-block;margin-right:16px;" />
                <label class="form-label">版本 M</label>
                <input type="number" class="form-control" v-model.number="compareRight" style="width:120px;display:inline-block;" />
              </div>
              <div class="form-row">
                <label class="form-label"></label>
                <ToolbarButton icon="search" primary @click="doCompare">比较</ToolbarButton>
              </div>
              <div v-if="compareResult" style="margin-top:12px;">
                <label class="form-label">比较结果</label>
                <pre style="background:#f5f5f5;border:1px solid #ddd;padding:12px;max-height:400px;overflow:auto;white-space:pre-wrap;font-size:13px;">{{ compareResult }}</pre>
              </div>
            </div>
          </template>

          <template #actions>
            <div style="padding:16px;">
              <div style="display:flex;flex-wrap:wrap;gap:12px;">
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">提交配置</h4>
                  <ToolbarButton @click="showCommit=true">Commit</ToolbarButton>
                  <ToolbarButton @click="showCommitConfirm=true">Commit-Confirm</ToolbarButton>
                  <ToolbarButton @click="showConfirm=true">Confirm</ToolbarButton>
                  <ToolbarButton danger @click="showDiscard=true">Discard</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">保存/加载</h4>
                  <ToolbarButton primary @click="showSave=true">Save</ToolbarButton>
                  <ToolbarButton @click="showLoad=true">Load (替换)</ToolbarButton>
                  <ToolbarButton @click="showMerge=true">Merge (合并)</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">注释</h4>
                  <ToolbarButton @click="showComment=true">添加注释</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">重命名</h4>
                  <ToolbarButton @click="showRename=true">Rename</ToolbarButton>
                </div>
              </div>
            </div>
          </template>
        </TabGroup>
      </div>

      <div class="section">
      </div>

      <!-- Commit Modal -->
      <DraggableModal v-model:visible="showCommit" title="Commit 提交配置" @close="showCommit=false" :width="460">
        <div class="form-row">
          <label class="form-label">提交注释</label>
          <input class="form-control" v-model="commitComment" placeholder='例如: "add user bob"' style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showCommit=false">取消</button>
          <button class="primary" @click="doCommitNormal">确定</button>
        </div>
      </DraggableModal>

      <!-- Commit-Confirm Modal -->
      <DraggableModal v-model:visible="showCommitConfirm" title="Commit-Confirm 确认提交" @close="showCommitConfirm=false" :width="460">
        <div class="form-row">
          <label class="form-label">自动回滚时间(分钟)</label>
          <input type="number" class="form-control" v-model.number="commitConfirmMinutes" min="1" style="width:120px;" />
        </div>
        <div class="form-row">
          <label class="form-label">提交注释</label>
          <input class="form-control" v-model="commitConfirmComment" placeholder='例如: "test config"' style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showCommitConfirm=false">取消</button>
          <button class="primary" @click="doCommitConfirm">确定</button>
        </div>
      </DraggableModal>

      <!-- Confirm Modal -->
      <DraggableModal v-model:visible="showConfirm" title="Confirm 确认" @close="showConfirm=false" :width="400">
        <p>确认当前 commit-confirm，取消自动回滚？</p>
        <div class="modal-footer">
          <button @click="showConfirm=false">取消</button>
          <button class="primary" @click="doConfirmAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Discard Modal -->
      <DraggableModal v-model:visible="showDiscard" title="Discard 丢弃变更" @close="showDiscard=false" :width="400">
        <p>确定要丢弃所有未提交的变更吗？</p>
        <div class="modal-footer">
          <button @click="showDiscard=false">取消</button>
          <button class="danger" @click="doDiscardAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Rollback-Soft Modal -->
      <DraggableModal v-model:visible="showRollbackSoft" title="Rollback-Soft 软回滚" @close="showRollbackSoft=false" :width="460">
        <div class="form-row">
          <label class="form-label">回滚到版本号</label>
          <input type="number" class="form-control" v-model.number="rollbackSoftRevision" min="0" style="width:120px;" />
        </div>
        <p style="color:#666;font-size:12px;">软回滚不会立即重启，会将差异应用到当前配置，您可以比较并决定是否 commit。</p>
        <div class="modal-footer">
          <button @click="showRollbackSoft=false">取消</button>
          <button class="primary" @click="doRollbackSoftAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Rollback Modal -->
      <DraggableModal v-model:visible="showRollback" title="Rollback 回滚(需重启)" @close="showRollback=false" :width="460">
        <div class="form-row">
          <label class="form-label">回滚到版本号</label>
          <input type="number" class="form-control" v-model.number="rollbackRevision" min="0" style="width:120px;" />
        </div>
        <p style="color:#f5222d;font-size:12px;">注意：此操作回滚后需要重启设备才能生效。</p>
        <div class="modal-footer">
          <button @click="showRollback=false">取消</button>
          <button class="danger" @click="doRollbackAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Load Modal -->
      <DraggableModal v-model:visible="showLoad" title="Load 加载配置(替换)" @close="showLoad=false" :width="520">
        <div class="form-row">
          <label class="form-label">来源类型</label>
          <select class="form-control" v-model="loadType" style="width:200px;">
            <option value="system">系统配置文件</option>
            <option value="local">本地文件</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ loadType === 'system' ? '' : '文件路径/URL' }}</label>
          <input v-if="loadType !== 'system'" class="form-control" v-model="loadSource" :placeholder="loadType === 'local' ? '/path/to/config.boot' : loadType + '://host/path'" style="width:100%;" />
          <span v-else style="color:#666;">将从系统默认配置文件加载</span>
        </div>
        <p style="color:#f5222d;font-size:12px;">注意：Load 将用加载的配置替换当前运行配置。</p>
        <div class="modal-footer">
          <button @click="showLoad=false">取消</button>
          <button class="primary" @click="doLoadAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Merge Modal -->
      <DraggableModal v-model:visible="showMerge" title="Merge 合并配置" @close="showMerge=false" :width="520">
        <div class="form-row">
          <label class="form-label">来源类型</label>
          <select class="form-control" v-model="mergeType" style="width:200px;">
            <option value="local">本地文件</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">文件路径/URL</label>
          <input class="form-control" v-model="mergeSource" :placeholder="mergeType === 'local' ? '/path/to/config.boot' : mergeType + '://host/path'" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showMerge=false">取消</button>
          <button class="primary" @click="doMergeAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Save Modal -->
      <DraggableModal v-model:visible="showSave" title="Save 保存配置" @close="showSave=false" :width="520">
        <div class="form-row">
          <label class="form-label">保存目标</label>
          <select class="form-control" v-model="saveType" style="width:200px;">
            <option value="system">系统配置文件</option>
            <option value="local">本地文件</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ saveType === 'system' ? '' : '文件路径/URL' }}</label>
          <input v-if="saveType !== 'system'" class="form-control" v-model="saveTarget" :placeholder="saveType === 'local' ? '/path/to/config.boot' : saveType + '://host/path'" style="width:100%;" />
          <span v-else style="color:#666;">将保存到系统默认配置文件</span>
        </div>
        <div class="modal-footer">
          <button @click="showSave=false">取消</button>
          <button class="primary" @click="doSaveAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Comment Modal -->
      <DraggableModal v-model:visible="showComment" title="Comment 添加注释" @close="showComment=false" :width="460">
        <div class="form-row">
          <label class="form-label">配置区域</label>
          <select class="form-control" v-model="commentPath" style="width:260px;">
            <option value="">-- 选择区域 --</option>
            <option v-for="s in COMMENT_SECTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">注释内容</label>
          <textarea class="form-control" v-model="commentText" rows="3" style="width:100%;"></textarea>
        </div>
        <div class="modal-footer">
          <button @click="showComment=false">取消</button>
          <button class="primary" @click="doCommentAction">确定</button>
        </div>
      </DraggableModal>

      <!-- Rename Modal -->
      <DraggableModal v-model:visible="showRename" title="Rename 重命名" @close="showRename=false" :width="520">
        <div class="form-row">
          <label class="form-label">配置类别</label>
          <select class="form-control" v-model="renameCategory" style="width:260px;" @change="renameSubCategory=''">
            <option value="">-- 选择类别 --</option>
            <option v-for="c in RENAME_PATHS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div v-if="renameSubOptions.length" class="form-row">
          <label class="form-label">子类别</label>
          <select class="form-control" v-model="renameSubCategory" style="width:260px;">
            <option value="">-- 选择子类别 --</option>
            <option v-for="s in renameSubOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">旧名称</label>
          <input class="form-control" v-model="renameOldName" placeholder="当前名称" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">新名称</label>
          <input class="form-control" v-model="renameNewName" placeholder="新名称" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showRename=false">取消</button>
          <button class="primary" @click="doRenameAction">确定</button>
        </div>
      </DraggableModal>
    </div>
  `,
});
