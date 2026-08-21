import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi, api } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { useI18n } from '/src/i18n/index.js';

const COMMENT_SECTION_KEYS = ['firewall', 'interfaces', 'policy', 'protocols', 'service', 'system', 'vpn'];

const LOAD_PROTOCOL_VALUES = ['scp', 'sftp', 'http', 'https', 'ftp', 'tftp'];

const RENAME_PATH_KEYS = [
  { value: 'firewall', hasSub: false },
  { value: 'interfaces', hasSub: true, subs: ['bonding', 'bridge', 'dummy', 'ethernet', 'geneve', 'input', 'l2tpv3', 'loopback', 'macsec', 'openvpn', 'pppoe', 'pseudoEthernet', 'sstpc', 'tunnel', 'virtualEthernet', 'vti', 'vxlan', 'wireguard', 'wireless', 'wwan'] },
  { value: 'policy', hasSub: true, subs: ['accessList', 'accessList6', 'asPathList', 'communityList', 'extCommunityList', 'largeCommunityList', 'localRoute', 'localRoute6', 'prefixList', 'prefixList6', 'route', 'routeMap', 'route6'] },
  { value: 'protocols', hasSub: false },
  { value: 'qos', hasSub: true, subs: ['interface', 'policyLabel', 'trafficMatchGroup'] },
  { value: 'service', hasSub: true, subs: ['aws', 'broadcastRelay', 'configSync', 'conntrackSync', 'consoleServer', 'dhcpRelay', 'dhcpServer', 'dhcpv6Relay', 'dhcpv6Server', 'dns', 'eventHandler', 'https', 'ids', 'ipoeServer', 'lldp', 'mdns', 'monitoring', 'ndpProxy', 'ntp', 'pppoeServer', 'routerAdvert', 'saltMinion', 'sla', 'snmp', 'ssh', 'suricata', 'tftpServer', 'webproxy'] },
  { value: 'system', hasSub: false },
  { value: 'vpn', hasSub: true, subs: ['ipsec', 'l2tp', 'openconnect', 'pptp', 'sstp'] },
  { value: 'vrf', hasSub: true, subs: ['vrfName'] },
  { value: 'nat', hasSub: false },
  { value: 'nat64', hasSub: true, subs: ['source'] },
  { value: 'nat66', hasSub: false },
  { value: 'netns', hasSub: false },
  { value: 'pki', hasSub: false },
  { value: 'container', hasSub: false },
  { value: 'loadBalancing', hasSub: false },
  { value: 'highAvailability', hasSub: false },
];

export default defineComponent({
  name: 'ConfigManagementPage',
  components: { DataTable, DraggableModal, ToolbarButton, TabGroup },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
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

    // Delete confirmation
    const deleteModalVisible = ref(false);
    const pendingDeleteIndexes = ref([]);

    // Computed translated data
    const COLUMNS = computed(() => [
      { key: 'index', label: t('configManagement.columns.index'), width: 80 },
      { key: 'timestamp', label: t('configManagement.columns.timestamp'), width: 200 },
      { key: 'user', label: t('configManagement.columns.user'), width: 120 },
      { key: 'source', label: t('configManagement.columns.source'), width: 200 },
    ]);

    const TAB_ITEMS = computed(() => [
      { key: 'revisions', title: t('configManagement.tabs.revisions') },
      { key: 'compare', title: t('configManagement.tabs.compare') },
      { key: 'actions', title: t('configManagement.tabs.actions') },
    ]);

    const COMMENT_SECTIONS = computed(() =>
      COMMENT_SECTION_KEYS.map(key => ({
        value: key,
        label: t('configManagement.options.commentSections.' + key),
      }))
    );

    const LOAD_PROTOCOLS = computed(() =>
      LOAD_PROTOCOL_VALUES.map(v => ({
        value: v,
        label: v + '://',
      }))
    );

    const RENAME_PATHS = computed(() =>
      RENAME_PATH_KEYS.map(cat => ({
        value: cat.value,
        label: t('configManagement.options.renamePaths.' + cat.value),
        hasSub: cat.hasSub,
        ...(cat.hasSub ? { subs: cat.subs.map(sk => ({
          value: sk,
          label: t('configManagement.options.renamePaths.' + sk),
        })) } : {}),
      }))
    );

    const renameSubOptions = computed(() => {
      const cat = RENAME_PATHS.value.find(c => c.value === renameCategory.value);
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
      pendingDeleteIndexes.value = [...selectedIndexes.value];
      deleteModalVisible.value = true;
    }

    function confirmDeleteSelected() {
      deleteModalVisible.value = false;
      showError({ message: t('configManagement.messages.deleteNotAllowed') });
      pendingDeleteIndexes.value = [];
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
        showError({ message: res.message || t('configManagement.messages.commitSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.commitConfirmSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doConfirmAction() {
      try {
        const res = await api.post('/config/confirm', {});
        showConfirm.value = false;
        showError({ message: res.message || t('configManagement.messages.confirmSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    async function doDiscardAction() {
      try {
        const res = await configApi.discard();
        showDiscard.value = false;
        showError({ message: res.message || t('configManagement.messages.discardSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.rollbackSoftSuccess') });
        configStore.markPending();
        loadRevisions();
      } catch (e) {
        showError(e);
      }
    }

    async function doRollbackAction() {
      try {
        const res = await configApi.rollback(rollbackRevision.value);
        showRollback.value = false;
        showError({ message: res.message || t('configManagement.messages.rollbackSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.loadSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.mergeSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.saveSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.commentSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
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
        showError({ message: res.message || t('configManagement.messages.renameSuccess') });
        configStore.markPending();
        await configStore.checkSessionChanged();
      } catch (e) {
        showError(e);
      }
    }

    onMounted(() => {
      loadRevisions();
      onMenuRefresh(loadRevisions);
      window.addEventListener('config-committed', loadRevisions);
    });

    return {
      t,
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
      deleteModalVisible, pendingDeleteIndexes,
      loadRevisions,
      doCompareSelected, doRollbackSoftSelected, doRollbackSelected, doDeleteSelected, confirmDeleteSelected,
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
            <ToolbarButton icon="search" @click="doCompareSelected" :disabled="!selectedIndexes.length">{{ t('configManagement.toolbar.compare') }}</ToolbarButton>
            <ToolbarButton icon="rollback" @click="doRollbackSoftSelected" :disabled="!selectedIndexes.length">{{ t('configManagement.toolbar.rollbackSoft') }}</ToolbarButton>
            <ToolbarButton icon="rollback" @click="doRollbackSelected" :disabled="!selectedIndexes.length">{{ t('configManagement.toolbar.rollback') }}</ToolbarButton>
            <ToolbarButton icon="delete" @click="doDeleteSelected" :disabled="!selectedIndexes.length">{{ t('configManagement.toolbar.delete') }}</ToolbarButton>
            <ToolbarButton icon="refresh" @click="loadRevisions">{{ t('configManagement.toolbar.refresh') }}</ToolbarButton>
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
                <label class="form-label">{{ t('configManagement.compare.type') }}</label>
                <select class="form-control" v-model="compareType" style="width:300px;">
                  <option value="working-active">{{ t('configManagement.compare.workingActive') }}</option>
                  <option value="working-saved">{{ t('configManagement.compare.workingSaved') }}</option>
                  <option value="working-revision">{{ t('configManagement.compare.workingRevision') }}</option>
                  <option value="revision-revision">{{ t('configManagement.compare.revisionRevision') }}</option>
                </select>
              </div>
              <div v-if="compareType === 'working-revision'" class="form-row">
                <label class="form-label">{{ t('configManagement.compare.revisionNumber') }}</label>
                <input type="number" class="form-control" v-model.number="compareLeft" style="width:120px;" />
              </div>
              <div v-if="compareType === 'revision-revision'" class="form-row">
                <label class="form-label">{{ t('configManagement.compare.revisionN') }}</label>
                <input type="number" class="form-control" v-model.number="compareLeft" style="width:120px;display:inline-block;margin-right:16px;" />
                <label class="form-label">{{ t('configManagement.compare.revisionM') }}</label>
                <input type="number" class="form-control" v-model.number="compareRight" style="width:120px;display:inline-block;" />
              </div>
              <div class="form-row">
                <label class="form-label"></label>
                <ToolbarButton icon="search" primary @click="doCompare">{{ t('configManagement.compare.compare') }}</ToolbarButton>
              </div>
              <div v-if="compareResult" style="margin-top:12px;">
                <label class="form-label">{{ t('configManagement.compare.result') }}</label>
                <pre style="background:#f5f5f5;border:1px solid #ddd;padding:12px;max-height:400px;overflow:auto;white-space:pre-wrap;font-size:13px;">{{ compareResult }}</pre>
              </div>
            </div>
          </template>

          <template #actions>
            <div style="padding:16px;">
              <div style="display:flex;flex-wrap:wrap;gap:12px;">
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">{{ t('configManagement.actions.commitConfig') }}</h4>
                  <ToolbarButton @click="showCommit=true">Commit</ToolbarButton>
                  <ToolbarButton @click="showCommitConfirm=true">Commit-Confirm</ToolbarButton>
                  <ToolbarButton @click="showConfirm=true">Confirm</ToolbarButton>
                  <ToolbarButton danger @click="showDiscard=true">Discard</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">{{ t('configManagement.actions.saveLoad') }}</h4>
                  <ToolbarButton primary @click="showSave=true">Save</ToolbarButton>
                  <ToolbarButton @click="showLoad=true">Load</ToolbarButton>
                  <ToolbarButton @click="showMerge=true">Merge</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">{{ t('configManagement.actions.comment') }}</h4>
                  <ToolbarButton @click="showComment=true">{{ t('configManagement.actions.addComment') }}</ToolbarButton>
                </div>
                <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;min-width:280px;">
                  <h4 style="margin:0 0 12px;">{{ t('configManagement.actions.rename') }}</h4>
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
      <DraggableModal v-model:visible="showCommit" :title="t('configManagement.modals.commit.title')" @close="showCommit=false" :width="460">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.commit.comment') }}</label>
          <input class="form-control" v-model="commitComment" :placeholder="t('configManagement.modals.commit.placeholder')" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showCommit=false">{{ t('configManagement.modals.commit.cancel') }}</button>
          <button class="primary" @click="doCommitNormal">{{ t('configManagement.modals.commit.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Commit-Confirm Modal -->
      <DraggableModal v-model:visible="showCommitConfirm" :title="t('configManagement.modals.commitConfirm.title')" @close="showCommitConfirm=false" :width="460">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.commitConfirm.autoRollbackTime') }}</label>
          <input type="number" class="form-control" v-model.number="commitConfirmMinutes" min="1" style="width:120px;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.commitConfirm.comment') }}</label>
          <input class="form-control" v-model="commitConfirmComment" :placeholder="t('configManagement.modals.commitConfirm.placeholder')" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showCommitConfirm=false">{{ t('configManagement.modals.commitConfirm.cancel') }}</button>
          <button class="primary" @click="doCommitConfirm">{{ t('configManagement.modals.commitConfirm.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Confirm Modal -->
      <DraggableModal v-model:visible="showConfirm" :title="t('configManagement.modals.confirm.title')" @close="showConfirm=false" :width="400">
        <p>{{ t('configManagement.modals.confirm.message') }}</p>
        <div class="modal-footer">
          <button @click="showConfirm=false">{{ t('configManagement.modals.confirm.cancel') }}</button>
          <button class="primary" @click="doConfirmAction">{{ t('configManagement.modals.confirm.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Discard Modal -->
      <DraggableModal v-model:visible="showDiscard" :title="t('configManagement.modals.discard.title')" @close="showDiscard=false" :width="400">
        <p>{{ t('configManagement.modals.discard.message') }}</p>
        <div class="modal-footer">
          <button @click="showDiscard=false">{{ t('configManagement.modals.discard.cancel') }}</button>
          <button class="danger" @click="doDiscardAction">{{ t('configManagement.modals.discard.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Rollback-Soft Modal -->
      <DraggableModal v-model:visible="showRollbackSoft" :title="t('configManagement.modals.rollbackSoft.title')" @close="showRollbackSoft=false" :width="460">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rollbackSoft.revisionNumber') }}</label>
          <input type="number" class="form-control" v-model.number="rollbackSoftRevision" min="0" style="width:120px;" />
        </div>
        <p style="color:#666;font-size:12px;">{{ t('configManagement.modals.rollbackSoft.description') }}</p>
        <div class="modal-footer">
          <button @click="showRollbackSoft=false">{{ t('configManagement.modals.rollbackSoft.cancel') }}</button>
          <button class="primary" @click="doRollbackSoftAction">{{ t('configManagement.modals.rollbackSoft.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Rollback Modal -->
      <DraggableModal v-model:visible="showRollback" :title="t('configManagement.modals.rollback.title')" @close="showRollback=false" :width="460">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rollback.revisionNumber') }}</label>
          <input type="number" class="form-control" v-model.number="rollbackRevision" min="0" style="width:120px;" />
        </div>
        <p style="color:#f5222d;font-size:12px;">{{ t('configManagement.modals.rollback.warning') }}</p>
        <div class="modal-footer">
          <button @click="showRollback=false">{{ t('configManagement.modals.rollback.cancel') }}</button>
          <button class="danger" @click="doRollbackAction">{{ t('configManagement.modals.rollback.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Load Modal -->
      <DraggableModal v-model:visible="showLoad" :title="t('configManagement.modals.load.title')" @close="showLoad=false" :width="520">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.load.sourceType') }}</label>
          <select class="form-control" v-model="loadType" style="width:200px;">
            <option value="system">{{ t('configManagement.modals.load.systemFile') }}</option>
            <option value="local">{{ t('configManagement.modals.load.localFile') }}</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ loadType === 'system' ? '' : t('configManagement.modals.load.filePath') }}</label>
          <input v-if="loadType !== 'system'" class="form-control" v-model="loadSource" :placeholder="loadType === 'local' ? t('configManagement.modals.load.placeholder') : loadType + '://host/path'" style="width:100%;" />
          <span v-else style="color:#666;">{{ t('configManagement.modals.load.systemMessage') }}</span>
        </div>
        <p style="color:#f5222d;font-size:12px;">{{ t('configManagement.modals.load.warning') }}</p>
        <div class="modal-footer">
          <button @click="showLoad=false">{{ t('configManagement.modals.load.cancel') }}</button>
          <button class="primary" @click="doLoadAction">{{ t('configManagement.modals.load.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Merge Modal -->
      <DraggableModal v-model:visible="showMerge" :title="t('configManagement.modals.merge.title')" @close="showMerge=false" :width="520">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.merge.sourceType') }}</label>
          <select class="form-control" v-model="mergeType" style="width:200px;">
            <option value="local">{{ t('configManagement.modals.merge.localFile') }}</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.merge.filePath') }}</label>
          <input class="form-control" v-model="mergeSource" :placeholder="mergeType === 'local' ? t('configManagement.modals.merge.placeholder') : mergeType + '://host/path'" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showMerge=false">{{ t('configManagement.modals.merge.cancel') }}</button>
          <button class="primary" @click="doMergeAction">{{ t('configManagement.modals.merge.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Save Modal -->
      <DraggableModal v-model:visible="showSave" :title="t('configManagement.modals.save.title')" @close="showSave=false" :width="520">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.save.saveTarget') }}</label>
          <select class="form-control" v-model="saveType" style="width:200px;">
            <option value="system">{{ t('configManagement.modals.save.systemFile') }}</option>
            <option value="local">{{ t('configManagement.modals.save.localFile') }}</option>
            <option v-for="p in LOAD_PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ saveType === 'system' ? '' : t('configManagement.modals.save.filePath') }}</label>
          <input v-if="saveType !== 'system'" class="form-control" v-model="saveTarget" :placeholder="saveType === 'local' ? t('configManagement.modals.save.placeholder') : saveType + '://host/path'" style="width:100%;" />
          <span v-else style="color:#666;">{{ t('configManagement.modals.save.systemMessage') }}</span>
        </div>
        <div class="modal-footer">
          <button @click="showSave=false">{{ t('configManagement.modals.save.cancel') }}</button>
          <button class="primary" @click="doSaveAction">{{ t('configManagement.modals.save.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Comment Modal -->
      <DraggableModal v-model:visible="showComment" :title="t('configManagement.modals.comment.title')" @close="showComment=false" :width="460">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.comment.configSection') }}</label>
          <select class="form-control" v-model="commentPath" style="width:260px;">
            <option value="">{{ t('configManagement.modals.comment.selectSection') }}</option>
            <option v-for="s in COMMENT_SECTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.comment.commentText') }}</label>
          <textarea class="form-control" v-model="commentText" rows="3" style="width:100%;"></textarea>
        </div>
        <div class="modal-footer">
          <button @click="showComment=false">{{ t('configManagement.modals.comment.cancel') }}</button>
          <button class="primary" @click="doCommentAction">{{ t('configManagement.modals.comment.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Rename Modal -->
      <DraggableModal v-model:visible="showRename" :title="t('configManagement.modals.rename.title')" @close="showRename=false" :width="520">
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rename.configCategory') }}</label>
          <select class="form-control" v-model="renameCategory" style="width:260px;" @change="renameSubCategory=''">
            <option value="">{{ t('configManagement.modals.rename.selectCategory') }}</option>
            <option v-for="c in RENAME_PATHS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div v-if="renameSubOptions.length" class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rename.subCategory') }}</label>
          <select class="form-control" v-model="renameSubCategory" style="width:260px;">
            <option value="">{{ t('configManagement.modals.rename.selectSubCategory') }}</option>
            <option v-for="s in renameSubOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rename.oldName') }}</label>
          <input class="form-control" v-model="renameOldName" :placeholder="t('configManagement.modals.rename.oldNamePlaceholder')" style="width:100%;" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('configManagement.modals.rename.newName') }}</label>
          <input class="form-control" v-model="renameNewName" :placeholder="t('configManagement.modals.rename.newNamePlaceholder')" style="width:100%;" />
        </div>
        <div class="modal-footer">
          <button @click="showRename=false">{{ t('configManagement.modals.rename.cancel') }}</button>
          <button class="primary" @click="doRenameAction">{{ t('configManagement.modals.rename.confirm') }}</button>
        </div>
      </DraggableModal>

      <!-- Delete Confirmation Modal -->
      <DraggableModal v-model:visible="deleteModalVisible" :title="t('configManagement.modals.delete.title')" width="400px" @confirm="confirmDeleteSelected">
        <div>{{ t('configManagement.modals.delete.message') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="idx in pendingDeleteIndexes" :key="idx" style="padding:2px 0;">{{ t('configManagement.modals.delete.revision') }} {{ idx }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
});
