import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { opModeApi, pkiFileApi } from '/src/api/index.js';
import { showError, errorState } from '/src/components/Layout/ErrorDisplay.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { useI18n } from '/src/i18n/index.js';
import { useConfigStore } from '/src/stores/config.js';

export default defineComponent({
  name: 'PkiToolPage',
  components: {
    DraggableModal,
    TabGroup,
    DataTable,
    ToolbarButton,
  },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const output = ref('');
    const activeTab = ref('ca');
    const showModal = ref(false);
    const modalTitle = ref('');

    // 文件管理
    const fileList = ref([]);
    const fileLoading = ref(false);
    const selectedFiles = ref([]);
    const viewFileModal = ref(false);
    const viewFileName = ref('');
    const viewFileContent = ref('');
    const viewFileLoading = ref(false);

    // 删除确认弹窗
    const deleteConfirmModal = ref(false);
    const deleteTargetName = ref('');
    const deleteFileNames = ref([]);
    const deleteIsBatch = ref(false);
    const deleteBatchCount = ref(0);

    // 生成结果弹窗
    const generateResultModal = ref(false);
    const generateResultContent = ref('');
    const generateResultFiles = ref([]);
    const generateResultTabs = ref([]);
    const generateResultActiveTab = ref('');

    const TABS = computed(() => [
      { key: 'ca', title: t('pkiTool.types.ca') },
      { key: 'certificate', title: t('pkiTool.types.certificate') },
      { key: 'crl', title: t('pkiTool.types.crl') },
      { key: 'dh', title: t('pkiTool.types.dh') },
      { key: 'key-pair', title: t('pkiTool.types.keyPair') },
      { key: 'openvpn', title: t('pkiTool.types.openvpn') },
      { key: 'ssh-key', title: t('pkiTool.types.sshKey') },
      { key: 'wireguard', title: t('pkiTool.types.wireguard') },
    ]);

    // 表单数据
    const formData = ref({
      type: '',
      action: 'generate',
      filename: '',
      installName: '',
      keyType: 'rsa',
      keyBits: 2048,
      countryCode: 'CN',
      state: 'Haidian',
      locality: 'Beijing',
      organization: 'Easynetworks',
      commonName: '',
      validityDays: 1825,
      encryptKey: false,
      passphrase: '',
      certType: 'server',
      subjectAltNames: '',
      configureSan: false,
      signCaName: '',
      signAction: 'generate',
      hasCertRequest: false,
      certRequestPem: '',
      certAction: 'generate',
      caName: '',
      crlAction: 'generate',
      dhBits: 2048,
      wgSubType: 'key-pair',
      wgInterface: '',
      wgPeer: '',
    });

    const keyTypes = computed(() => [
      { value: 'rsa', label: 'RSA' },
      { value: 'dsa', label: 'DSA' },
      { value: 'ec', label: 'EC' },
    ]);

    const certTypes = computed(() => [
      { value: 'server', label: t('pkiTool.certTypes.server') },
      { value: 'client', label: t('pkiTool.certTypes.client') },
    ]);

    const wgSubTypes = computed(() => [
      { value: 'key-pair', label: t('pkiTool.wgSubTypes.keyPair') },
      { value: 'preshared-key', label: t('pkiTool.wgSubTypes.presharedKey') },
    ]);

    const certSubActions = computed(() => [
      { value: 'generate', label: t('pkiTool.actions.generate') },
      { value: 'file', label: t('pkiTool.actions.file') },
      { value: 'install', label: t('pkiTool.actions.install') },
    ]);

    const crlSubActions = computed(() => [
      { value: 'generate', label: t('pkiTool.actions.generate') },
      { value: 'file', label: t('pkiTool.actions.file') },
      { value: 'install', label: t('pkiTool.actions.install') },
    ]);

    // 文件表格列定义
    const fileColumns = computed(() => [
      { key: 'base_name', title: t('pkiTool.files.certName') || '证书', width: '150px' },
      { key: 'name', title: t('pkiTool.files.fileName'), width: '250px' },
      { key: 'type', title: t('pkiTool.files.fileType'), width: '80px' },
      { key: 'size', title: t('pkiTool.files.fileSize'), width: '100px' },
      { key: 'mtime', title: t('pkiTool.files.modifiedTime'), width: '180px' },
    ]);

    // 按类型过滤文件
    const filteredFileList = computed(() => {
      const type = activeTab.value;
      return fileList.value.filter(f => f.type === type);
    });

    // 文件表格数据
    const fileTableData = computed(() => {
      return filteredFileList.value.map(f => ({
        ...f,
        size: formatFileSize(f.size),
        mtime: formatDateTime(f.mtime),
      }));
    });

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDateTime(timestamp) {
      const d = new Date(timestamp * 1000);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // 加载文件列表
    async function loadFileList() {
      fileLoading.value = true;
      try {
        const res = await pkiFileApi.list();
        fileList.value = res.data || [];
      } catch (e) {
        showError(e);
      } finally {
        fileLoading.value = false;
      }
    }

    // 强制刷新文件列表（带缓存破坏）
    async function refreshFileList() {
      fileLoading.value = true;
      try {
        const res = await pkiFileApi.list({ _t: Date.now() });
        console.log('[PKI] refreshFileList - API response:', JSON.stringify(res).substring(0, 500));
        fileList.value = res.data || [];
        console.log('[PKI] refreshFileList - fileList updated to', fileList.value.length, 'files');
      } catch (e) {
        console.error('[PKI] refreshFileList error:', e);
        showError(e);
      } finally {
        fileLoading.value = false;
      }
    }

    // 查看文件内容 - 使用 TabGroup 组织证书和密钥
    const viewFileTabs = ref([]);
    const viewFileActiveTab = ref('');

    async function viewFile(file) {
      viewFileLoading.value = true;
      const names = file.name.split(', ').filter(n => n);
      viewFileName.value = names.length > 1 ? `${names[0]} + ${names[1]}` : names[0];
      viewFileContent.value = '';
      viewFileTabs.value = [];
      viewFileActiveTab.value = '';
      viewFileModal.value = true;
      try {
        for (let i = 0; i < names.length; i++) {
          const res = await pkiFileApi.read(names[i]);
          const content = res.data?.content || '';
          viewFileTabs.value.push({
            key: names[i],
            title: names[i],
            content: content,
          });
        }
        if (viewFileTabs.value.length > 0) {
          viewFileActiveTab.value = viewFileTabs.value[0].key;
        }
      } catch (e) {
        showError(e);
        viewFileContent.value = 'Error: ' + (e.message || 'Failed to read file');
      } finally {
        viewFileLoading.value = false;
      }
    }

    // 下载当前激活 tab 的文件
    async function downloadActiveTabFile() {
      const activeTab = viewFileTabs.value.find(t => t.key === viewFileActiveTab.value);
      if (!activeTab) return;
      try {
        const res = await pkiFileApi.download(activeTab.key);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || 'Download failed');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeTab.key;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        showError(e);
      }
    }

    // 下载文件 - 下载所有相关文件
    async function downloadFile(file) {
      try {
        const names = file.name.split(', ').filter(n => n);
        for (const name of names) {
          const res = await pkiFileApi.download(name);
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.message || 'Download failed');
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        showError(e);
      }
    }

    // 拷贝文件内容到剪贴板
    async function copyFileContent() {
      try {
        const activeTab = viewFileTabs.value.find(t => t.key === viewFileActiveTab.value);
        const content = activeTab ? activeTab.content : viewFileContent.value;
        
        let copied = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(content);
            copied = true;
          } catch (e) {
            // navigator.clipboard 在 HTTP 环境下可能失败
            copied = false;
          }
        }
        
        if (!copied) {
          // 降级方案：使用 execCommand
          const textarea = document.createElement('textarea');
          textarea.value = content;
          textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        
        const tip = document.createElement('div');
        tip.textContent = t('pkiTool.files.copySuccess');
        tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#52c41a;color:#fff;padding:8px 20px;border-radius:4px;z-index:99999;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(tip);
        setTimeout(() => document.body.removeChild(tip), 2000);
      } catch (e) {
        showError(e);
      }
    }

    // 打开删除确认弹窗（单个）
    function openDeleteConfirm(file) {
      // Delete all files in the group (cert + key)
      const names = file.name.split(', ').filter(n => n);
      deleteTargetName.value = names.length > 0 ? names[0] : file.name;
      deleteFileNames.value = names;
      deleteIsBatch.value = false;
      deleteBatchCount.value = names.length;
      console.log('[PKI] openDeleteConfirm - names:', names, 'length:', names.length, 'isBatch:', deleteIsBatch.value);
      deleteConfirmModal.value = true;
    }

    // 打开批量删除确认弹窗
    function openBatchDeleteConfirm() {
      if (selectedFiles.value.length === 0) return;
      deleteTargetName.value = '';
      deleteIsBatch.value = true;
      deleteBatchCount.value = selectedFiles.value.length;
      // Collect all file names from selected groups
      const allNames = [];
      for (const baseName of selectedFiles.value) {
        const fileGroup = fileList.value.find(f => f.base_name === baseName);
        if (fileGroup) {
          const names = fileGroup.name.split(', ').filter(n => n);
          allNames.push(...names);
        }
      }
      deleteFileNames.value = allNames;
      deleteConfirmModal.value = true;
    }

    // 确认删除
    async function confirmDelete() {
      deleteConfirmModal.value = false;
      try {
        if (deleteIsBatch.value) {
          // Delete all selected groups
          for (const baseName of selectedFiles.value) {
            // Find the file group by base_name
            const fileGroup = fileList.value.find(f => f.base_name === baseName);
            if (fileGroup) {
              const names = fileGroup.name.split(', ').filter(n => n);
              for (const name of names) {
                await pkiFileApi.delete(name);
              }
            }
          }
          selectedFiles.value = [];
        } else {
          // Delete single group - delete all files in the group
          const fileGroup = fileList.value.find(f => f.base_name === deleteTargetName.value || f.name === deleteTargetName.value);
          if (fileGroup) {
            const names = fileGroup.name.split(', ').filter(n => n);
            for (const name of names) {
              await pkiFileApi.delete(name);
            }
          } else {
            await pkiFileApi.delete(deleteTargetName.value);
          }
        }
        await refreshFileList();
      } catch (e) {
        showError(e);
      }
    }

    // 取消删除
    function cancelDelete() {
      deleteConfirmModal.value = false;
    }

    function resetForm(type) {
      formData.value = {
        type,
        action: 'generate',
        filename: '',
        installName: '',
        keyType: 'rsa',
        keyBits: 2048,
        countryCode: 'CN',
        state: 'Haidian',
        locality: 'Beijing',
        organization: 'Easynetworks',
        commonName: '',
        validityDays: 1825,
        encryptKey: false,
        passphrase: '',
        certType: 'server',
        subjectAltNames: '',
        configureSan: false,
        signCaName: '',
        signAction: 'generate',
        hasCertRequest: false,
        certRequestPem: '',
        certAction: 'generate',
        caName: '',
        crlAction: 'generate',
        dhBits: 2048,
        wgSubType: 'key-pair',
        wgInterface: '',
        wgPeer: '',
      };
    }

    function openModal() {
      formData.value.type = activeTab.value;
      resetForm(activeTab.value);
      const typeLabels = {
        'ca': t('pkiTool.types.ca'),
        'certificate': t('pkiTool.types.certificate'),
        'crl': t('pkiTool.types.crl'),
        'dh': t('pkiTool.types.dh'),
        'key-pair': t('pkiTool.types.keyPair'),
        'openvpn': t('pkiTool.types.openvpn'),
        'ssh-key': t('pkiTool.types.sshKey'),
        'wireguard': t('pkiTool.types.wireguard'),
      };
      modalTitle.value = typeLabels[activeTab.value] || '';
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
    }

    function buildCommand() {
      const data = formData.value;
      let cmd = `run generate pki ${data.type}`;

      if (data.type === 'ca') {
        if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        } else if (data.action === 'sign' && data.signCaName) {
          cmd += ` sign ${data.signCaName}`;
          if (data.signAction === 'file' && data.filename) {
            cmd += ` file ${data.filename}`;
          } else if (data.signAction === 'install' && data.installName) {
            cmd += ` install ${data.installName}`;
          }
        }
      } else if (data.type === 'certificate') {
        if (data.action === 'self-signed') {
          cmd += ' self-signed';
          if (data.certAction === 'file' && data.filename) {
            cmd += ` file ${data.filename}`;
          } else if (data.certAction === 'install' && data.installName) {
            cmd += ` install ${data.installName}`;
          }
        } else if (data.action === 'sign' && data.signCaName) {
          cmd += ` sign ${data.signCaName}`;
          if (data.certAction === 'file' && data.filename) {
            cmd += ` file ${data.filename}`;
          } else if (data.certAction === 'install' && data.installName) {
            cmd += ` install ${data.installName}`;
          }
        } else if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        }
      } else if (data.type === 'crl') {
        if (data.caName) {
          cmd += ` ${data.caName}`;
          if (data.crlAction === 'file' && data.filename) {
            cmd += ` file ${data.filename}`;
          } else if (data.crlAction === 'install') {
            cmd += ' install';
          }
        }
      } else if (data.type === 'dh') {
        if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        }
      } else if (data.type === 'key-pair') {
        if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        }
      } else if (data.type === 'openvpn') {
        cmd += ' shared-secret';
        if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        }
      } else if (data.type === 'ssh-key') {
        if (data.action === 'file' && data.filename) {
          cmd += ` file ${data.filename}`;
        } else if (data.action === 'install' && data.installName) {
          cmd += ` install ${data.installName}`;
        }
      } else if (data.type === 'wireguard') {
        if (data.wgSubType === 'key-pair') {
          cmd += ' key-pair';
          if (data.action === 'install' && data.wgInterface) {
            cmd += ` install interface ${data.wgInterface}`;
          }
        } else if (data.wgSubType === 'preshared-key') {
          cmd += ' preshared-key';
          if (data.action === 'install' && data.wgInterface) {
            cmd += ` install interface ${data.wgInterface}`;
            if (data.wgPeer) {
              cmd += ` peer ${data.wgPeer}`;
            }
          }
        }
      }

      return cmd;
    }

    function buildInteractiveInputs() {
      const data = formData.value;
      const inputs = [];

      if (data.type === 'ca') {
        if (data.action === 'sign' && data.signCaName) {
          inputs.push({ prompt: 'Do you already have a certificate request? [y/N]', default: 'N', value: data.hasCertRequest ? 'y' : 'N' });
          if (data.hasCertRequest) {
            inputs.push({ prompt: 'Paste certificate request and press enter:', default: '', value: data.certRequestPem });
          } else {
            inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
            inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
            inputs.push({ prompt: 'Enter country code:', default: data.countryCode, value: data.countryCode });
            inputs.push({ prompt: 'Enter state:', default: data.state, value: data.state });
            inputs.push({ prompt: 'Enter locality:', default: data.locality, value: data.locality });
            inputs.push({ prompt: 'Enter organization name:', default: data.organization, value: data.organization });
            inputs.push({ prompt: 'Enter common name:', default: data.commonName, value: data.commonName });
            inputs.push({ prompt: 'Enter how many days certificate will be valid:', default: data.validityDays, value: data.validityDays });
            inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
          }
        } else {
          inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
          inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
          inputs.push({ prompt: 'Enter country code:', default: data.countryCode, value: data.countryCode });
          inputs.push({ prompt: 'Enter state:', default: data.state, value: data.state });
          inputs.push({ prompt: 'Enter locality:', default: data.locality, value: data.locality });
          inputs.push({ prompt: 'Enter organization name:', default: data.organization, value: data.organization });
          inputs.push({ prompt: 'Enter common name:', default: data.commonName, value: data.commonName });
          inputs.push({ prompt: 'Enter how many days certificate will be valid:', default: data.validityDays, value: data.validityDays });
          inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
        }
      }

      if (data.type === 'certificate') {
        if (data.action === 'sign') {
          inputs.push({ prompt: 'Do you already have a certificate request? [y/N]', default: 'N', value: data.hasCertRequest ? 'y' : 'N' });
          if (!data.hasCertRequest) {
            inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
            inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
            inputs.push({ prompt: 'Enter country code:', default: data.countryCode, value: data.countryCode });
            inputs.push({ prompt: 'Enter state:', default: data.state, value: data.state });
            inputs.push({ prompt: 'Enter locality:', default: data.locality, value: data.locality });
            inputs.push({ prompt: 'Enter organization name:', default: data.organization, value: data.organization });
            inputs.push({ prompt: 'Enter common name:', default: data.commonName, value: data.commonName });
            inputs.push({ prompt: 'Do you want to configure Subject Alternative Names? [y/N]', default: 'N', value: data.configureSan ? 'y' : 'N' });
            if (data.configureSan) {
              inputs.push({ prompt: 'Enter Subject Alternative Names (comma-separated):', default: '', value: data.subjectAltNames });
            }
            inputs.push({ prompt: 'Enter how many days certificate will be valid:', default: 365, value: data.validityDays });
            inputs.push({ prompt: 'Enter certificate type: (client, server)', default: data.certType, value: data.certType });
            inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
          }
        } else if (data.action === 'self-signed') {
          inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
          inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
          inputs.push({ prompt: 'Enter country code:', default: data.countryCode, value: data.countryCode });
          inputs.push({ prompt: 'Enter state:', default: data.state, value: data.state });
          inputs.push({ prompt: 'Enter locality:', default: data.locality, value: data.locality });
          inputs.push({ prompt: 'Enter organization name:', default: data.organization, value: data.organization });
          inputs.push({ prompt: 'Enter common name:', default: data.commonName, value: data.commonName });
          inputs.push({ prompt: 'Do you want to configure Subject Alternative Names? [y/N]', default: 'N', value: data.configureSan ? 'y' : 'N' });
          if (data.configureSan) {
            inputs.push({ prompt: 'Enter Subject Alternative Names (comma-separated):', default: '', value: data.subjectAltNames });
          }
          inputs.push({ prompt: 'Enter how many days certificate will be valid:', default: 365, value: data.validityDays });
          inputs.push({ prompt: 'Enter certificate type: (client, server)', default: data.certType, value: data.certType });
          inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
        } else {
          inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
          inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
          inputs.push({ prompt: 'Enter country code:', default: data.countryCode, value: data.countryCode });
          inputs.push({ prompt: 'Enter state:', default: data.state, value: data.state });
          inputs.push({ prompt: 'Enter locality:', default: data.locality, value: data.locality });
          inputs.push({ prompt: 'Enter organization name:', default: data.organization, value: data.organization });
          inputs.push({ prompt: 'Enter common name:', default: data.commonName, value: data.commonName });
          inputs.push({ prompt: 'Do you want to configure Subject Alternative Names? [y/N]', default: 'N', value: data.configureSan ? 'y' : 'N' });
          if (data.configureSan) {
            inputs.push({ prompt: 'Enter Subject Alternative Names (comma-separated):', default: '', value: data.subjectAltNames });
          }
          inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
        }
      }

      if (data.type === 'key-pair') {
        inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
        inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
        inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
      }

      if (data.type === 'ssh-key') {
        inputs.push({ prompt: 'Enter private key type: [rsa, dsa, ec]', default: data.keyType, value: data.keyType });
        inputs.push({ prompt: 'Enter private key bits:', default: data.keyBits, value: data.keyBits });
        inputs.push({ prompt: 'Do you want to encrypt the private key with a passphrase? [y/N]', default: 'N', value: data.encryptKey ? 'y' : 'N' });
      }

      if (data.type === 'dh') {
        inputs.push({ prompt: 'Enter DH parameters key size:', default: data.dhBits, value: data.dhBits });
      }

      return inputs;
    }

    async function executeGenerate() {
      console.log('[PKI] executeGenerate called, action:', formData.value.action, 'filename:', formData.value.filename);
      // 写入文件时，文件名必填
      if (formData.value.action === 'file' && !formData.value.filename.trim()) {
        const msg = t('pkiTool.form.filenameRequired') || '文件名为必填项';
        errorState.value = { code: 'ERROR', message: msg, detail: '', suggestion: '', trace: '' };
        return;
      }
      // 安装到配置时，安装名称必填
      if (formData.value.action === 'install' && !formData.value.installName.trim()) {
        const msg = t('pkiTool.form.installNameRequired') || '安装名称为必填项';
        errorState.value = { code: 'ERROR', message: msg, detail: '', suggestion: '', trace: '' };
        return;
      }

      loading.value = true;

      try {
        const cmd = buildCommand();
        const inputs = buildInteractiveInputs();
        const fullInput = inputs.map(i => i.value).join('\n');
        const response = await opModeApi.generate(cmd, { input: fullInput });
        const result = response.output || response;
        if (response.success !== false) {
          // 安装到配置操作：提示成功，标记待提交配置
          if (formData.value.action === 'install') {
            configStore.markPending();
            const msg = t('pkiTool.installSuccess') || '证书生成完成，请提交配置';
            output.value = msg;
            // Show success toast
            const tip = document.createElement('div');
            tip.textContent = msg;
            tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#52c41a;color:#fff;padding:8px 20px;border-radius:4px;z-index:99999;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
            document.body.appendChild(tip);
            setTimeout(() => document.body.removeChild(tip), 3000);
          }
          // 写入文件操作：显示文件信息，刷新列表
          else if (formData.value.action === 'file' && formData.value.filename) {
            console.log('[PKI] Before refresh, fileList length:', fileList.value.length);
            // 强制刷新文件列表
            await refreshFileList();
            console.log('[PKI] After refresh, fileList length:', fileList.value.length);
            console.log('[PKI] generatedFiles from response:', response.generatedFiles);
            // 使用后端返回的文件名列表
            const generatedFiles = response.generatedFiles || [];
            const newFiles = [];
            fileList.value.forEach(f => {
              console.log('[PKI] Checking file:', f.name, 'type:', f.type);
              // f.name may be merged like 'ca-file-web14.key, ca-file-web14.pem'
              // Check if any generated file is contained in f.name
              const match = generatedFiles.some(gf => f.name.includes(gf));
              if (match) {
                newFiles.push(f);
              }
            });
            console.log('[PKI] newFiles found:', newFiles.length);
            generateResultFiles.value = newFiles;

            // Read file contents and populate tabs (same as viewFile)
            generateResultTabs.value = [];
            generateResultActiveTab.value = '';
            for (const file of newFiles) {
              const names = file.name.split(', ').filter(n => n);
              for (const name of names) {
                try {
                  const res = await pkiFileApi.read(name);
                  const content = res.data?.content || '';
                  generateResultTabs.value.push({
                    key: name,
                    title: name,
                    content: content,
                  });
                } catch (e) {
                  console.error('[PKI] Failed to read generated file:', name, e);
                }
              }
            }
            if (generateResultTabs.value.length > 0) {
              generateResultActiveTab.value = generateResultTabs.value[0].key;
            }
            generateResultContent.value = '';
            generateResultModal.value = true;
          } else {
            // 生成操作：显示内容（使用 TabGroup）
            generateResultContent.value = '';
            generateResultFiles.value = [];
            generateResultTabs.value = [];
            generateResultActiveTab.value = '';
            
            // 后端返回 certContent 和 keyContent
            if (response.certContent || response.keyContent) {
              if (response.certContent) {
                generateResultTabs.value.push({
                  key: 'certificate',
                  title: 'Certificate',
                  content: response.certContent,
                });
              }
              if (response.keyContent) {
                generateResultTabs.value.push({
                  key: 'private-key',
                  title: 'Private Key',
                  content: response.keyContent,
                });
              }
              if (generateResultTabs.value.length > 0) {
                generateResultActiveTab.value = generateResultTabs.value[0].key;
              }
            } else {
              // 降级：使用 output
              generateResultContent.value = result;
            }
            generateResultModal.value = true;
          }
        } else {
          output.value = `Error: ${response.message || result}`;
        }
        closeModal();
      } catch (e) {
        showError(e);
        output.value = `Error: ${e.message}`;
      } finally {
        loading.value = false;
      }
    }

    async function copyGenerateResult() {
      try {
        const activeTab = generateResultTabs.value.find(t => t.key === generateResultActiveTab.value);
        const content = activeTab ? activeTab.content : generateResultContent.value;
        
        let copied = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(content);
            copied = true;
          } catch (e) {
            copied = false;
          }
        }
        
        if (!copied) {
          const textarea = document.createElement('textarea');
          textarea.value = content;
          textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        
        const tip = document.createElement('div');
        tip.textContent = t('pkiTool.files.copySuccess');
        tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#52c41a;color:#fff;padding:8px 20px;border-radius:4px;z-index:99999;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(tip);
        setTimeout(() => document.body.removeChild(tip), 2000);
      } catch (e) {
        // fallback ignored
      }
    }

    // 下载当前激活 tab 的文件
    async function downloadGeneratedActiveTabFile() {
      const activeTab = generateResultTabs.value.find(t => t.key === generateResultActiveTab.value);
      if (!activeTab) return;
      try {
        const res = await pkiFileApi.download(activeTab.key);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || 'Download failed');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeTab.key;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        showError(e);
      }
    }

    function getAvailableActions(type) {
      if (type === 'ca') {
        return [
          { value: 'generate', label: t('pkiTool.actions.generate') },
          { value: 'file', label: t('pkiTool.actions.file') },
          { value: 'install', label: t('pkiTool.actions.install') },
          { value: 'sign', label: t('pkiTool.actions.sign') },
        ];
      }
      if (type === 'certificate') {
        return [
          { value: 'generate', label: t('pkiTool.actions.generate') },
          { value: 'file', label: t('pkiTool.actions.file') },
          { value: 'install', label: t('pkiTool.actions.install') },
          { value: 'self-signed', label: t('pkiTool.actions.selfSigned') },
          { value: 'sign', label: t('pkiTool.actions.sign') },
        ];
      }
      if (type === 'crl') {
        return [
          { value: 'generate', label: t('pkiTool.actions.generate') },
          { value: 'file', label: t('pkiTool.actions.file') },
          { value: 'install', label: t('pkiTool.actions.install') },
        ];
      }
      if (type === 'openvpn') {
        return [
          { value: 'generate', label: t('pkiTool.actions.generate') },
          { value: 'file', label: t('pkiTool.actions.file') },
          { value: 'install', label: t('pkiTool.actions.install') },
        ];
      }
      if (type === 'wireguard') {
        return [
          { value: 'generate', label: t('pkiTool.actions.generate') },
          { value: 'install', label: t('pkiTool.actions.install') },
        ];
      }
      return [
        { value: 'generate', label: t('pkiTool.actions.generate') },
        { value: 'file', label: t('pkiTool.actions.file') },
        { value: 'install', label: t('pkiTool.actions.install') },
      ];
    }

    // 文件表格事件处理
    function handleFileRowClick(row) {
      viewFile(row);
    }

    function handleFileSelectionChange(keys) {
      selectedFiles.value = Array.from(keys);
    }

    function handleFileRefresh() {
      loadFileList();
    }

    onMounted(() => {
      loadFileList();
    });

    return {
      t,
      loading,
      output,
      activeTab,
      showModal,
      modalTitle,
      formData,
      TABS,
      keyTypes,
      certTypes,
      wgSubTypes,
      certSubActions,
      crlSubActions,
      // 文件管理
      fileList,
      fileLoading,
      selectedFiles,
      fileColumns,
      fileTableData,
      viewFileModal,
      viewFileName,
      viewFileContent,
      viewFileLoading,
      viewFileTabs,
      viewFileActiveTab,
      deleteConfirmModal,
      deleteTargetName,
      deleteFileNames,
      deleteIsBatch,
      deleteBatchCount,
      generateResultModal,
      generateResultContent,
      generateResultFiles,
      generateResultTabs,
      generateResultActiveTab,
      copyGenerateResult,
      downloadGeneratedActiveTabFile,
      viewFile,
      downloadFile,
      downloadActiveTabFile,
      copyFileContent,
      deleteFile: openDeleteConfirm,
      openBatchDeleteConfirm,
      confirmDelete,
      cancelDelete,
      handleBatchDelete: openBatchDeleteConfirm,
      handleFileRowClick,
      handleFileSelectionChange,
      handleFileRefresh,
      // 弹窗
      openModal,
      closeModal,
      executeGenerate,
      getAvailableActions,
    };
  },
  template: `
    <div class="page-container">
      <!-- PKI 生成工具 Tab -->
      <div class="section">
        <TabGroup v-model="activeTab" :tabs="TABS">
          <template #ca>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #certificate>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #crl>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #dh>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #key-pair>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #openvpn>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #ssh-key>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
          <template #wireguard>
            <DataTable
              :columns="fileColumns"
              :data="fileTableData"
              :loading="fileLoading"
              :selectable="true"
              rowKey="base_name"
              :actions="[]"
              @selection-change="handleFileSelectionChange"
              @row-click="handleFileRowClick"
            >
              <template #toolbar-left-extra>
                <ToolbarButton icon="create" @click="openModal">{{ t('pkiTool.actions.generate') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="openBatchDeleteConfirm" :disabled="selectedFiles.length === 0">{{ t('pkiTool.files.batchDelete') }}</ToolbarButton>
                <ToolbarButton icon="view" @click="selectedFiles.length === 1 && viewFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.viewContent') }}</ToolbarButton>
                <ToolbarButton icon="download" @click="selectedFiles.length === 1 && downloadFile(fileTableData.find(f => f.base_name === selectedFiles[0]))" :disabled="selectedFiles.length !== 1">{{ t('pkiTool.files.download') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="handleFileRefresh">{{ t('app.refresh') }}</ToolbarButton>
              </template>
              <template #base_name="{ row }">
                <span>{{ row.base_name }}</span>
              </template>
              <template #name="{ row }">
                <a href="javascript:void(0)" @click.stop="viewFile(row)" class="file-link">
                  <i class="fas fa-file-alt"></i> {{ row.name }}
                </a>
              </template>
              <template #type="{ row }">
                <span class="file-type-badge" :class="'file-type-' + row.type">{{ row.type.toUpperCase() }}</span>
              </template>
            </DataTable>
          </template>
        </TabGroup>
      </div>

      <!-- 输出结果 -->
      <div v-if="output" class="output-section">
        <h3>{{ t('pkiTool.output') }}</h3>
        <pre class="output-content">{{ output }}</pre>
      </div>

      <!-- 生成结果弹窗 -->
      <DraggableModal
        v-model:visible="generateResultModal"
        :title="t('pkiTool.generateResult') + ': ' + generateResultFiles.map(f => f.name).join(', ')"
        width="700px"
      >
        <div>
          <TabGroup
            v-if="generateResultTabs.length > 1"
            v-model="generateResultActiveTab"
            :tabs="generateResultTabs.map(t => ({ key: t.key, title: t.title }))"
          />
          <pre class="file-content-view" style="max-height:none;overflow-y:visible;white-space:pre-wrap;word-break:break-all;">{{ generateResultTabs.find(t => t.key === generateResultActiveTab)?.content || generateResultContent }}</pre>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <ToolbarButton icon="cancel" @click="generateResultModal = false">{{ t('modal.cancel') }}</ToolbarButton>
            <ToolbarButton icon="copy" @click="copyGenerateResult">{{ t('pkiTool.files.copy') }}</ToolbarButton>
            <ToolbarButton icon="download" @click="downloadGeneratedActiveTabFile">{{ t('pkiTool.files.download') }}</ToolbarButton>
          </div>
        </template>
      </DraggableModal>

      <!-- 查看文件内容弹窗 -->
      <DraggableModal
        v-model:visible="viewFileModal"
        :title="t('pkiTool.files.viewContent') + ': ' + viewFileName"
        width="700px"
      >
        <div v-if="viewFileLoading" style="text-align:center;padding:20px;">
          <i class="fas fa-spinner fa-spin"></i> {{ t('app.loading') }}
        </div>
        <div v-else>
          <TabGroup
            v-if="viewFileTabs.length > 1"
            v-model="viewFileActiveTab"
            :tabs="viewFileTabs.map(t => ({ key: t.key, title: t.title }))"
          />
          <pre class="file-content-view" style="max-height:none;overflow-y:visible;white-space:pre-wrap;word-break:break-all;">{{ viewFileTabs.find(t => t.key === viewFileActiveTab)?.content || viewFileContent }}</pre>
        </div>
        <template #footer>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <ToolbarButton icon="cancel" @click="viewFileModal = false">{{ t('modal.cancel') }}</ToolbarButton>
            <ToolbarButton icon="copy" @click="copyFileContent">{{ t('pkiTool.files.copy') }}</ToolbarButton>
            <ToolbarButton icon="download" @click="downloadActiveTabFile">{{ t('pkiTool.files.download') }}</ToolbarButton>
          </div>
        </template>
      </DraggableModal>

      <!-- 删除确认弹窗 -->
      <DraggableModal
        v-model:visible="deleteConfirmModal"
        :title="t('pkiTool.files.confirmDeleteTitle')"
        width="400px"
        @confirm="confirmDelete"
        @cancel="cancelDelete"
      >
        <div style="padding:10px 0;">
          <p style="margin:0 0 8px;font-size:14px;">
            {{ t('pkiTool.files.confirmBatchDelete') }} <strong>{{ deleteFileNames.length }}</strong> {{ t('pkiTool.files.files') }}?
          </p>
          <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#555;">
            <li v-for="name in deleteFileNames" :key="name" style="margin-bottom:4px;">{{ name }}</li>
          </ul>
        </div>
      </DraggableModal>

      <!-- 生成弹窗 -->
      <DraggableModal
        v-model:visible="showModal"
        :title="modalTitle"
        width="600px"
        @confirm="executeGenerate"
        @cancel="closeModal"
      >
        <div class="form-container">
          <!-- WireGuard 子类型选择 -->
          <div v-if="formData.type === 'wireguard'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.wgSubType') }}</label>
            <div class="form-control">
              <select v-model="formData.wgSubType" class="form-select">
                <option v-for="st in wgSubTypes" :key="st.value" :value="st.value">{{ st.label }}</option>
              </select>
            </div>
          </div>

          <!-- 操作类型选择 -->
          <div class="form-row">
            <label class="form-label">{{ t('pkiTool.form.action') }}</label>
            <div class="form-control">
              <select v-model="formData.action" class="form-select">
                <option v-for="action in getAvailableActions(formData.type)" :key="action.value" :value="action.value">
                  {{ action.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- CA 签名：选择签名 CA -->
          <div v-if="formData.type === 'ca' && formData.action === 'sign'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.signCaName') }}</label>
            <div class="form-control">
              <input v-model="formData.signCaName" type="text" class="form-input" :placeholder="t('pkiTool.form.signCaNamePlaceholder')" />
            </div>
          </div>

          <!-- CA 签名：子操作 -->
          <div v-if="formData.type === 'ca' && formData.action === 'sign' && formData.signCaName" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.signAction') }}</label>
            <div class="form-control">
              <select v-model="formData.signAction" class="form-select">
                <option value="generate">{{ t('pkiTool.actions.generate') }}</option>
                <option value="file">{{ t('pkiTool.actions.file') }}</option>
                <option value="install">{{ t('pkiTool.actions.install') }}</option>
              </select>
            </div>
          </div>

          <!-- 证书：自签名或签名时的子操作 -->
          <div v-if="formData.type === 'certificate' && (formData.action === 'self-signed' || formData.action === 'sign')" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.certAction') }}</label>
            <div class="form-control">
              <select v-model="formData.certAction" class="form-select">
                <option v-for="ca in certSubActions" :key="ca.value" :value="ca.value">{{ ca.label }}</option>
              </select>
            </div>
          </div>

          <!-- 证书签名：选择签名 CA -->
          <div v-if="formData.type === 'certificate' && formData.action === 'sign'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.signCaName') }}</label>
            <div class="form-control">
              <input v-model="formData.signCaName" type="text" class="form-input" :placeholder="t('pkiTool.form.signCaNamePlaceholder')" />
            </div>
          </div>

          <!-- CRL：选择 CA 名称 -->
          <div v-if="formData.type === 'crl'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.caName') }}</label>
            <div class="form-control">
              <input v-model="formData.caName" type="text" class="form-input" :placeholder="t('pkiTool.form.caNamePlaceholder')" />
            </div>
          </div>

          <!-- CRL：子操作 -->
          <div v-if="formData.type === 'crl' && formData.caName" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.crlAction') }}</label>
            <div class="form-control">
              <select v-model="formData.crlAction" class="form-select">
                <option v-for="ca in crlSubActions" :key="ca.value" :value="ca.value">{{ ca.label }}</option>
              </select>
            </div>
          </div>

          <!-- 文件名（file 操作） -->
          <div v-if="(formData.action === 'file' || formData.signAction === 'file' || formData.certAction === 'file' || formData.crlAction === 'file') && formData.type !== 'crl'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.filename') }}</label>
            <div class="form-control">
              <input v-model="formData.filename" type="text" class="form-input" :placeholder="t('pkiTool.form.filenamePlaceholder')" />
            </div>
          </div>

          <!-- CRL 文件名 -->
          <div v-if="formData.type === 'crl' && formData.crlAction === 'file'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.filename') }}</label>
            <div class="form-control">
              <input v-model="formData.filename" type="text" class="form-input" :placeholder="t('pkiTool.form.filenamePlaceholder')" />
            </div>
          </div>

          <!-- 安装名称（install 操作） -->
          <div v-if="(formData.action === 'install' || formData.signAction === 'install' || formData.certAction === 'install' || formData.crlAction === 'install') && formData.type !== 'crl' && formData.type !== 'wireguard'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.installName') }}</label>
            <div class="form-control">
              <input v-model="formData.installName" type="text" class="form-input" :placeholder="t('pkiTool.form.installNamePlaceholder')" />
            </div>
          </div>

          <!-- WireGuard 接口（install 操作） -->
          <div v-if="formData.type === 'wireguard' && formData.action === 'install'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.wgInterface') }}</label>
            <div class="form-control">
              <input v-model="formData.wgInterface" type="text" class="form-input" :placeholder="t('pkiTool.form.wgInterfacePlaceholder')" />
            </div>
          </div>

          <!-- WireGuard Peer（preshared-key install 操作） -->
          <div v-if="formData.type === 'wireguard' && formData.wgSubType === 'preshared-key' && formData.action === 'install' && formData.wgInterface" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.wgPeer') }}</label>
            <div class="form-control">
              <input v-model="formData.wgPeer" type="text" class="form-input" :placeholder="t('pkiTool.form.wgPeerPlaceholder')" />
            </div>
          </div>

          <!-- 是否有证书请求（CA 签名和证书签名） -->
          <div v-if="(formData.type === 'ca' && formData.action === 'sign') || (formData.type === 'certificate' && formData.action === 'sign')" class="form-row">
            <label class="form-label">
              <input v-model="formData.hasCertRequest" type="checkbox" />
              {{ t('pkiTool.form.hasCertRequest') }}
            </label>
          </div>

          <!-- 证书请求 PEM（当有证书请求时显示） -->
          <div v-if="((formData.type === 'ca' && formData.action === 'sign') || (formData.type === 'certificate' && formData.action === 'sign')) && formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.certRequestPem') }}</label>
            <div class="form-control">
              <textarea v-model="formData.certRequestPem" class="form-textarea" rows="6" :placeholder="t('pkiTool.form.certRequestPemPlaceholder')"></textarea>
            </div>
          </div>

          <!-- 密钥类型 -->
          <div v-if="['ca', 'certificate', 'key-pair', 'ssh-key'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.keyType') }}</label>
            <div class="form-control">
              <select v-model="formData.keyType" class="form-select">
                <option v-for="kt in keyTypes" :key="kt.value" :value="kt.value">{{ kt.label }}</option>
              </select>
            </div>
          </div>

          <!-- 密钥位数 -->
          <div v-if="['ca', 'certificate', 'key-pair', 'ssh-key'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.keyBits') }}</label>
            <div class="form-control">
              <input v-model.number="formData.keyBits" type="number" class="form-input" min="1024" max="8192" />
            </div>
          </div>

          <!-- 国家代码 -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.countryCode') }}</label>
            <div class="form-control">
              <input v-model="formData.countryCode" type="text" class="form-input" maxlength="2" />
            </div>
          </div>

          <!-- 州/省 -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.state') }}</label>
            <div class="form-control">
              <input v-model="formData.state" type="text" class="form-input" />
            </div>
          </div>

          <!-- 城市 -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.locality') }}</label>
            <div class="form-control">
              <input v-model="formData.locality" type="text" class="form-input" />
            </div>
          </div>

          <!-- 组织名称 -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.organization') }}</label>
            <div class="form-control">
              <input v-model="formData.organization" type="text" class="form-input" />
            </div>
          </div>

          <!-- 通用名称 -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.commonName') }}</label>
            <div class="form-control">
              <input v-model="formData.commonName" type="text" class="form-input" :placeholder="t('pkiTool.form.commonNamePlaceholder')" />
            </div>
          </div>

          <!-- 配置 SAN -->
          <div v-if="formData.type === 'certificate' && !formData.hasCertRequest && (formData.action === 'generate' || formData.action === 'self-signed' || formData.action === 'sign')" class="form-row">
            <label class="form-label">
              <input v-model="formData.configureSan" type="checkbox" />
              {{ t('pkiTool.form.configureSAN') }}
            </label>
          </div>

          <!-- SAN 值 -->
          <div v-if="formData.type === 'certificate' && formData.configureSan && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.subjectAltNames') }}</label>
            <div class="form-control">
              <input v-model="formData.subjectAltNames" type="text" class="form-input" :placeholder="t('pkiTool.form.subjectAltNamesPlaceholder')" />
            </div>
          </div>

          <!-- 有效期天数（CA 和证书） -->
          <div v-if="['ca', 'certificate'].includes(formData.type) && !formData.hasCertRequest && (formData.action === 'generate' || formData.action === 'install' || formData.action === 'self-signed' || formData.action === 'sign')" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.validityDays') }}</label>
            <div class="form-control">
              <input v-model.number="formData.validityDays" type="number" class="form-input" min="1" />
            </div>
          </div>

          <!-- 证书类型（证书） -->
          <div v-if="formData.type === 'certificate' && !formData.hasCertRequest && (formData.action === 'self-signed' || formData.action === 'sign')" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.certType') }}</label>
            <div class="form-control">
              <select v-model="formData.certType" class="form-select">
                <option v-for="ct in certTypes" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
              </select>
            </div>
          </div>

          <!-- DH 参数位数 -->
          <div v-if="formData.type === 'dh'" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.dhBits') }}</label>
            <div class="form-control">
              <input v-model.number="formData.dhBits" type="number" class="form-input" min="1024" max="8192" />
            </div>
          </div>

          <!-- 加密私钥 -->
          <div v-if="['ca', 'certificate', 'key-pair', 'ssh-key'].includes(formData.type) && !formData.hasCertRequest" class="form-row">
            <label class="form-label">
              <input v-model="formData.encryptKey" type="checkbox" />
              {{ t('pkiTool.form.encryptKey') }}
            </label>
          </div>

          <!-- 密码短语 -->
          <div v-if="['ca', 'certificate', 'key-pair', 'ssh-key'].includes(formData.type) && formData.encryptKey && !formData.hasCertRequest" class="form-row">
            <label class="form-label">{{ t('pkiTool.form.passphrase') }}</label>
            <div class="form-control">
              <input v-model="formData.passphrase" type="password" class="form-input" :placeholder="t('pkiTool.form.passphrasePlaceholder')" />
            </div>
          </div>
        </div>
      </DraggableModal>
    </div>
  `,
});
