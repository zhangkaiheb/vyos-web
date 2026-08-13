import { defineComponent, ref, computed, onMounted, watch, inject } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'PkiPage',
  setup() {
    const { t } = inject('i18n');

    const TABS = computed(() => [
      { key: 'ca', title: t('pki.tabs.ca') },
      { key: 'certificate', title: t('pki.tabs.certificate') },
      { key: 'dh', title: t('pki.tabs.dh') },
      { key: 'key-pair', title: t('pki.tabs.keyPair') },
      { key: 'openssh', title: t('pki.tabs.openssh') },
      { key: 'openvpn', title: t('pki.tabs.openvpn') },
      { key: 'x509', title: t('pki.tabs.x509') },
    ]);
    const route = useRoute();
    const configStore = useConfigStore();
    const activeTab = ref('ca');
    const loading = ref(false);

    // CA data
    const caList = ref([]);
    const selectedCA = ref([]);
    const caModalVisible = ref(false);
    const editingCA = ref(null);
    const editingOriginalCA = ref('');

    // Certificate data
    const certList = ref([]);
    const selectedCert = ref([]);
    const certModalVisible = ref(false);
    const editingCert = ref(null);
    const editingOriginalCert = ref('');

    // DH data
    const dhList = ref([]);
    const selectedDH = ref([]);
    const dhModalVisible = ref(false);
    const editingDH = ref(null);
    const editingOriginalDH = ref('');

    // Key-pair data
    const keyPairList = ref([]);
    const selectedKeyPair = ref([]);
    const keyPairModalVisible = ref(false);
    const editingKeyPair = ref(null);
    const editingOriginalKeyPair = ref('');

    // OpenSSH data
    const opensshList = ref([]);
    const selectedOpenSSH = ref([]);
    const opensshModalVisible = ref(false);
    const editingOpenSSH = ref(null);
    const editingOriginalOpenSSH = ref('');

    // OpenVPN data
    const openvpnList = ref([]);
    const selectedOpenVPN = ref([]);
    const openvpnModalVisible = ref(false);
    const editingOpenVPN = ref(null);
    const editingOriginalOpenVPN = ref('');

    // X509 data
    const x509Data = ref({});

    // Delete modal refs
    const caDeleteModalVisible = ref(false);
    const pendingDeleteCaNames = ref([]);
    const certDeleteModalVisible = ref(false);
    const pendingDeleteCertNames = ref([]);
    const dhDeleteModalVisible = ref(false);
    const pendingDeleteDhNames = ref([]);
    const keypairDeleteModalVisible = ref(false);
    const pendingDeleteKeypairNames = ref([]);
    const opensshDeleteModalVisible = ref(false);
    const pendingDeleteOpensshNames = ref([]);
    const openvpnDeleteModalVisible = ref(false);
    const pendingDeleteOpenvpnNames = ref([]);

    const path = computed(() => 'pki');
    const writeDisabled = computed(() => route.meta?.menuItem?.permission === 'read');

    // CA columns and schema
    const caColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'description', title: t('pki.columns.description') },
      { key: 'hasCertificate', title: t('pki.columns.certificate') },
      { key: 'hasCrl', title: t('pki.columns.crl') },
      { key: 'hasPrivateKey', title: t('pki.columns.privateKey') },
    ]);

    const caSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.caName') },
      { key: 'description', title: t('pki.columns.description'), type: 'text' },
      { key: 'certificate', title: t('pki.labels.certificatePem'), type: 'textarea', placeholder: '-----BEGIN CERTIFICATE-----...' },
      { key: 'crl', title: t('pki.labels.crlPem'), type: 'textarea', placeholder: '-----BEGIN X509 CRL-----...' },
      { key: 'privateKey', title: t('pki.labels.privateKeyPem'), type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----...' },
      { key: 'passwordProtected', title: t('pki.labels.passwordProtected'), type: 'checkbox' },
    ]);

    // Certificate columns and schema
    const certColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'description', title: t('pki.columns.description') },
      { key: 'hasCertificate', title: t('pki.columns.certificate') },
      { key: 'hasPrivateKey', title: t('pki.columns.privateKey') },
      { key: 'acmeDomains', title: t('pki.columns.acmeDomains') },
    ]);

    const certSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.certName') },
      { key: 'description', title: t('pki.columns.description'), type: 'text' },
      { key: 'certificate', title: t('pki.labels.certificatePem'), type: 'textarea', placeholder: '-----BEGIN CERTIFICATE-----...' },
      { key: 'privateKey', title: t('pki.labels.privateKeyPem'), type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----...' },
      { key: 'passwordProtected', title: t('pki.labels.passwordProtected'), type: 'checkbox' },
      { key: 'acmeEmail', title: t('pki.labels.acmeEmail'), type: 'text', placeholder: 'admin@example.com' },
      { key: 'acmeListenAddress', title: t('pki.labels.acmeListenAddress'), type: 'text', placeholder: t('pki.placeholders.ipv4Address') },
      { key: 'acmeRsaKeySize', title: t('pki.labels.acmeRsaKeySize'), type: 'number', min: 1024, max: 8192, defaultValue: 2048, help: t('pki.help.default2048') },
      { key: 'acmeUrl', title: t('pki.labels.acmeUrl'), type: 'text', defaultValue: 'https://acme-v02.api.letsencrypt.org/directory', help: t('pki.help.defaultLetsEncrypt') },
      { key: 'acmeDomainNames', title: t('pki.labels.acmeDomainNames'), type: 'text', placeholder: 'example.com,www.example.com' },
    ]);

    // DH columns and schema
    const dhColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'hasParameters', title: t('pki.columns.parameters') },
    ]);

    const dhSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.dhName') },
      { key: 'parameters', title: t('pki.labels.dhParametersPem'), type: 'textarea', placeholder: '-----BEGIN DH PARAMETERS-----...' },
    ]);

    // Key-pair columns and schema
    const keyPairColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'hasPrivateKey', title: t('pki.columns.privateKey') },
      { key: 'hasPublicKey', title: t('pki.columns.publicKey') },
      { key: 'passwordProtected', title: t('pki.columns.passwordProtected') },
    ]);

    const keyPairSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.keyName') },
      { key: 'privateKey', title: t('pki.labels.privateKeyPem'), type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----...' },
      { key: 'publicKey', title: t('pki.labels.publicKeyPem'), type: 'textarea', placeholder: '-----BEGIN PUBLIC KEY-----...' },
      { key: 'passwordProtected', title: t('pki.labels.passwordProtected'), type: 'checkbox' },
    ]);

    // OpenSSH columns and schema
    const opensshColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'hasPrivateKey', title: t('pki.columns.privateKey') },
      { key: 'hasPublicKey', title: t('pki.columns.publicKey') },
      { key: 'passwordProtected', title: t('pki.columns.passwordProtected') },
    ]);

    const opensshSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.sshName') },
      { key: 'privateKey', title: t('pki.labels.privateKeyPem'), type: 'textarea', placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----...' },
      { key: 'publicKey', title: t('pki.columns.publicKey'), type: 'textarea', placeholder: 'ssh-rsa AAAA...' },
      { key: 'passwordProtected', title: t('pki.labels.passwordProtected'), type: 'checkbox' },
    ]);

    // OpenVPN columns and schema
    const openvpnColumns = computed(() => [
      { key: 'name', title: t('pki.columns.name') },
      { key: 'hasKey', title: t('pki.columns.key') },
      { key: 'version', title: t('pki.columns.version') },
    ]);

    const openvpnSchema = computed(() => [
      { key: 'name', title: t('pki.columns.name'), type: 'text', required: true, placeholder: t('pki.placeholders.vpnName') },
      { key: 'key', title: t('pki.labels.sharedKeyData'), type: 'textarea', placeholder: t('pki.placeholders.openvpnKeyData') },
      { key: 'version', title: t('pki.columns.version'), type: 'text', placeholder: t('pki.placeholders.versionNumber') },
    ]);

    // X509 schema
    const x509Schema = computed(() => [
      { key: 'country', title: t('pki.labels.country'), type: 'text', defaultValue: 'GB', placeholder: t('pki.placeholders.countryCode') },
      { key: 'locality', title: t('pki.labels.locality'), type: 'text', defaultValue: 'Some-City', placeholder: t('pki.placeholders.localityExample') },
      { key: 'organization', title: t('pki.labels.organization'), type: 'text', defaultValue: 'VyOS', placeholder: t('pki.placeholders.organizationExample') },
      { key: 'state', title: t('pki.labels.state'), type: 'text', defaultValue: 'Some-State', placeholder: t('pki.placeholders.stateExample') },
    ]);

    async function load() {
      loading.value = true;
      try {
        const res = await configStore.getConfig(path.value, false);
        const raw = res.data || {};

        // Parse CA
        const caData = raw.ca || {};
        const caResult = [];
        for (const [name, attrs] of Object.entries(caData)) {
          caResult.push({
            id: name,
            name,
            description: attrs.description || '',
            hasCertificate: !!attrs.certificate,
            hasCrl: !!attrs.crl,
            hasPrivateKey: !!attrs.private?.key,
            passwordProtected: !!attrs.private?.['password-protected'],
            _raw: attrs,
          });
        }
        caResult.sort((a, b) => a.name.localeCompare(b.name));
        caList.value = caResult;

        // Parse Certificate
        const certData = raw.certificate || {};
        const certResult = [];
        for (const [name, attrs] of Object.entries(certData)) {
          const acme = attrs.acme || {};
          const domainNames = acme['domain-name'] || [];
          certResult.push({
            id: name,
            name,
            description: attrs.description || '',
            hasCertificate: !!attrs.certificate,
            hasPrivateKey: !!attrs.private?.key,
            passwordProtected: !!attrs.private?.['password-protected'],
            acmeDomains: Array.isArray(domainNames) ? domainNames.join(', ') : Object.keys(domainNames).join(', '),
            _raw: attrs,
          });
        }
        certResult.sort((a, b) => a.name.localeCompare(b.name));
        certList.value = certResult;

        // Parse DH
        const dhData = raw.dh || {};
        const dhResult = [];
        for (const [name, attrs] of Object.entries(dhData)) {
          dhResult.push({
            id: name,
            name,
            hasParameters: !!attrs.parameters,
            _raw: attrs,
          });
        }
        dhResult.sort((a, b) => a.name.localeCompare(b.name));
        dhList.value = dhResult;

        // Parse Key-pair
        const keyPairData = raw['key-pair'] || {};
        const keyPairResult = [];
        for (const [name, attrs] of Object.entries(keyPairData)) {
          keyPairResult.push({
            id: name,
            name,
            hasPrivateKey: !!attrs.private?.key,
            hasPublicKey: !!attrs.public?.key,
            passwordProtected: !!attrs.private?.['password-protected'],
            _raw: attrs,
          });
        }
        keyPairResult.sort((a, b) => a.name.localeCompare(b.name));
        keyPairList.value = keyPairResult;

        // Parse OpenSSH
        const opensshData = raw.openssh || {};
        const opensshResult = [];
        for (const [name, attrs] of Object.entries(opensshData)) {
          opensshResult.push({
            id: name,
            name,
            hasPrivateKey: !!attrs.private?.key,
            hasPublicKey: !!attrs.public?.key,
            passwordProtected: !!attrs.private?.['password-protected'],
            _raw: attrs,
          });
        }
        opensshResult.sort((a, b) => a.name.localeCompare(b.name));
        opensshList.value = opensshResult;

        // Parse OpenVPN
        const openvpnData = raw.openvpn || {};
        const openvpnResult = [];
        const sharedSecret = openvpnData['shared-secret'] || {};
        for (const [name, attrs] of Object.entries(sharedSecret)) {
          openvpnResult.push({
            id: name,
            name,
            hasKey: !!attrs.key,
            version: attrs.version || '',
            _raw: attrs,
          });
        }
        openvpnResult.sort((a, b) => a.name.localeCompare(b.name));
        openvpnList.value = openvpnResult;

        // Parse X509
        const rawX509 = raw.x509 || {};
        const defaultData = rawX509.default || {};
        x509Data.value = {
          country: defaultData.country || 'GB',
          locality: defaultData.locality || 'Some-City',
          organization: defaultData.organization || 'VyOS',
          state: defaultData.state || 'Some-State',
        };

        // Clear selections if items no longer exist
        if (selectedCA.value.length && !caResult.some(n => n.name === selectedCA.value[0])) {
          selectedCA.value = [];
        }
        if (selectedCert.value.length && !certResult.some(n => n.name === selectedCert.value[0])) {
          selectedCert.value = [];
        }
        if (selectedDH.value.length && !dhResult.some(n => n.name === selectedDH.value[0])) {
          selectedDH.value = [];
        }
        if (selectedKeyPair.value.length && !keyPairResult.some(n => n.name === selectedKeyPair.value[0])) {
          selectedKeyPair.value = [];
        }
        if (selectedOpenSSH.value.length && !opensshResult.some(n => n.name === selectedOpenSSH.value[0])) {
          selectedOpenSSH.value = [];
        }
        if (selectedOpenVPN.value.length && !openvpnResult.some(n => n.name === selectedOpenVPN.value[0])) {
          selectedOpenVPN.value = [];
        }
      } catch (e) {
        showError(e);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });
    watch(() => route.path, () => {
      selectedCA.value = [];
      selectedCert.value = [];
      selectedDH.value = [];
      selectedKeyPair.value = [];
      selectedOpenSSH.value = [];
      selectedOpenVPN.value = [];
      load();
    });

    // CA functions
    function emptyCA() {
      return { name: '', description: '', certificate: '', crl: '', privateKey: '', passwordProtected: false };
    }

    function flattenCAData(name, attrs) {
      return {
        name,
        description: attrs.description || '',
        certificate: attrs.certificate || '',
        crl: attrs.crl || '',
        privateKey: attrs.private?.key || '',
        passwordProtected: !!attrs.private?.['password-protected'],
      };
    }

    function unflattenCAData(ca) {
      const result = {};
      if (ca.description) result.description = ca.description;
      if (ca.certificate) result.certificate = ca.certificate;
      if (ca.crl) result.crl = ca.crl;
      if (ca.privateKey || ca.passwordProtected) {
        result.private = {};
        if (ca.privateKey) result.private.key = ca.privateKey;
        if (ca.passwordProtected) result.private['password-protected'] = {};
      }
      return result;
    }

    function createCA() {
      editingCA.value = emptyCA();
      editingOriginalCA.value = '';
      caModalVisible.value = true;
    }

    function editCA() {
      if (!selectedCA.value.length) return showError({ message: t('pki.errors.selectOneCA') });
      if (selectedCA.value.length > 1) return showError({ message: t('pki.errors.selectOneCA') });
      const ca = caList.value.find(n => n.name === selectedCA.value[0]);
      if (!ca) return;
      editingCA.value = flattenCAData(ca.name, ca._raw || {});
      editingOriginalCA.value = ca.name;
      caModalVisible.value = true;
    }

    async function removeCA() {
      if (!selectedCA.value.length) return showError({ message: t('pki.errors.selectOneCA') });
      pendingDeleteCaNames.value = [...selectedCA.value];
      caDeleteModalVisible.value = true;
    }

    async function confirmRemoveCA() {
      caDeleteModalVisible.value = false;
      for (const name of pendingDeleteCaNames.value) {
        await configStore.deleteConfig(`${path.value} ca ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedCA.value = [];
      pendingDeleteCaNames.value = [];
      await load();
    }

    async function saveCA() {
      if (!editingCA.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalCA.value;
      if (!original && caList.value.some(n => n.name === editingCA.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenCAData(editingCA.value);
      try {
        if (original && original !== editingCA.value.name) {
          await configStore.deleteConfig(`${path.value} ca ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} ca ${editingCA.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} ca ${editingCA.value.name}`, value);
          configStore.markPending();
        }
        caModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // Certificate functions
    function emptyCert() {
      return {
        name: '', description: '', certificate: '', privateKey: '', passwordProtected: false,
        acmeEmail: '', acmeListenAddress: '', acmeRsaKeySize: 2048,
        acmeUrl: 'https://acme-v02.api.letsencrypt.org/directory',
        acmeDomainNames: '',
      };
    }

    function flattenCertData(name, attrs) {
      const acme = attrs.acme || {};
      const domainNames = acme['domain-name'] || [];
      return {
        name,
        description: attrs.description || '',
        certificate: attrs.certificate || '',
        privateKey: attrs.private?.key || '',
        passwordProtected: !!attrs.private?.['password-protected'],
        acmeEmail: acme.email || '',
        acmeListenAddress: acme['listen-address'] || '',
        acmeRsaKeySize: acme['rsa-key-size'] || 2048,
        acmeUrl: acme.url || 'https://acme-v02.api.letsencrypt.org/directory',
        acmeDomainNames: Array.isArray(domainNames) ? domainNames.join(',') : Object.keys(domainNames).join(','),
      };
    }

    function unflattenCertData(cert) {
      const result = {};
      if (cert.description) result.description = cert.description;
      if (cert.certificate) result.certificate = cert.certificate;
      if (cert.privateKey || cert.passwordProtected) {
        result.private = {};
        if (cert.privateKey) result.private.key = cert.privateKey;
        if (cert.passwordProtected) result.private['password-protected'] = {};
      }
      if (cert.acmeEmail || cert.acmeListenAddress || cert.acmeRsaKeySize || cert.acmeUrl || cert.acmeDomainNames) {
        result.acme = {};
        if (cert.acmeEmail) result.acme.email = cert.acmeEmail;
        if (cert.acmeListenAddress) result.acme['listen-address'] = cert.acmeListenAddress;
        if (cert.acmeRsaKeySize) result.acme['rsa-key-size'] = cert.acmeRsaKeySize;
        if (cert.acmeUrl) result.acme.url = cert.acmeUrl;
        if (cert.acmeDomainNames) {
          const domains = cert.acmeDomainNames.split(',').map(d => d.trim()).filter(d => d);
          result.acme['domain-name'] = domains;
        }
      }
      return result;
    }

    function createCert() {
      editingCert.value = emptyCert();
      editingOriginalCert.value = '';
      certModalVisible.value = true;
    }

    function editCert() {
      if (!selectedCert.value.length) return showError({ message: t('pki.errors.selectOneCert') });
      if (selectedCert.value.length > 1) return showError({ message: t('pki.errors.selectOneCert') });
      const cert = certList.value.find(n => n.name === selectedCert.value[0]);
      if (!cert) return;
      editingCert.value = flattenCertData(cert.name, cert._raw || {});
      editingOriginalCert.value = cert.name;
      certModalVisible.value = true;
    }

    async function removeCert() {
      if (!selectedCert.value.length) return showError({ message: t('pki.errors.selectOneCert') });
      pendingDeleteCertNames.value = [...selectedCert.value];
      certDeleteModalVisible.value = true;
    }

    async function confirmRemoveCert() {
      certDeleteModalVisible.value = false;
      for (const name of pendingDeleteCertNames.value) {
        await configStore.deleteConfig(`${path.value} certificate ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedCert.value = [];
      pendingDeleteCertNames.value = [];
      await load();
    }

    async function saveCert() {
      if (!editingCert.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalCert.value;
      if (!original && certList.value.some(n => n.name === editingCert.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenCertData(editingCert.value);
      try {
        if (original && original !== editingCert.value.name) {
          await configStore.deleteConfig(`${path.value} certificate ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} certificate ${editingCert.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} certificate ${editingCert.value.name}`, value);
          configStore.markPending();
        }
        certModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // DH functions
    function emptyDH() {
      return { name: '', parameters: '' };
    }

    function flattenDHData(name, attrs) {
      return {
        name,
        parameters: attrs.parameters || '',
      };
    }

    function unflattenDHData(dh) {
      const result = {};
      if (dh.parameters) result.parameters = dh.parameters;
      return result;
    }

    function createDH() {
      editingDH.value = emptyDH();
      editingOriginalDH.value = '';
      dhModalVisible.value = true;
    }

    function editDH() {
      if (!selectedDH.value.length) return showError({ message: t('pki.errors.selectOneDH') });
      if (selectedDH.value.length > 1) return showError({ message: t('pki.errors.selectOneDH') });
      const dh = dhList.value.find(n => n.name === selectedDH.value[0]);
      if (!dh) return;
      editingDH.value = flattenDHData(dh.name, dh._raw || {});
      editingOriginalDH.value = dh.name;
      dhModalVisible.value = true;
    }

    async function removeDH() {
      if (!selectedDH.value.length) return showError({ message: t('pki.errors.selectOneDH') });
      pendingDeleteDhNames.value = [...selectedDH.value];
      dhDeleteModalVisible.value = true;
    }

    async function confirmRemoveDH() {
      dhDeleteModalVisible.value = false;
      for (const name of pendingDeleteDhNames.value) {
        await configStore.deleteConfig(`${path.value} dh ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedDH.value = [];
      pendingDeleteDhNames.value = [];
      await load();
    }

    async function saveDH() {
      if (!editingDH.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalDH.value;
      if (!original && dhList.value.some(n => n.name === editingDH.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenDHData(editingDH.value);
      try {
        if (original && original !== editingDH.value.name) {
          await configStore.deleteConfig(`${path.value} dh ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} dh ${editingDH.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} dh ${editingDH.value.name}`, value);
          configStore.markPending();
        }
        dhModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // Key-pair functions
    function emptyKeyPair() {
      return { name: '', privateKey: '', publicKey: '', passwordProtected: false };
    }

    function flattenKeyPairData(name, attrs) {
      return {
        name,
        privateKey: attrs.private?.key || '',
        publicKey: attrs.public?.key || '',
        passwordProtected: !!attrs.private?.['password-protected'],
      };
    }

    function unflattenKeyPairData(kp) {
      const result = {};
      if (kp.privateKey || kp.passwordProtected) {
        result.private = {};
        if (kp.privateKey) result.private.key = kp.privateKey;
        if (kp.passwordProtected) result.private['password-protected'] = {};
      }
      if (kp.publicKey) {
        result.public = {};
        if (kp.publicKey) result.public.key = kp.publicKey;
      }
      return result;
    }

    function createKeyPair() {
      editingKeyPair.value = emptyKeyPair();
      editingOriginalKeyPair.value = '';
      keyPairModalVisible.value = true;
    }

    function editKeyPair() {
      if (!selectedKeyPair.value.length) return showError({ message: t('pki.errors.selectOneKeyPair') });
      if (selectedKeyPair.value.length > 1) return showError({ message: t('pki.errors.selectOneKeyPair') });
      const kp = keyPairList.value.find(n => n.name === selectedKeyPair.value[0]);
      if (!kp) return;
      editingKeyPair.value = flattenKeyPairData(kp.name, kp._raw || {});
      editingOriginalKeyPair.value = kp.name;
      keyPairModalVisible.value = true;
    }

    async function removeKeyPair() {
      if (!selectedKeyPair.value.length) return showError({ message: t('pki.errors.selectOneKeyPair') });
      pendingDeleteKeypairNames.value = [...selectedKeyPair.value];
      keypairDeleteModalVisible.value = true;
    }

    async function confirmRemoveKeyPair() {
      keypairDeleteModalVisible.value = false;
      for (const name of pendingDeleteKeypairNames.value) {
        await configStore.deleteConfig(`${path.value} key-pair ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedKeyPair.value = [];
      pendingDeleteKeypairNames.value = [];
      await load();
    }

    async function saveKeyPair() {
      if (!editingKeyPair.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalKeyPair.value;
      if (!original && keyPairList.value.some(n => n.name === editingKeyPair.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenKeyPairData(editingKeyPair.value);
      try {
        if (original && original !== editingKeyPair.value.name) {
          await configStore.deleteConfig(`${path.value} key-pair ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} key-pair ${editingKeyPair.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} key-pair ${editingKeyPair.value.name}`, value);
          configStore.markPending();
        }
        keyPairModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // OpenSSH functions
    function emptyOpenSSH() {
      return { name: '', privateKey: '', publicKey: '', passwordProtected: false };
    }

    function flattenOpenSSHData(name, attrs) {
      return {
        name,
        privateKey: attrs.private?.key || '',
        publicKey: attrs.public?.key || '',
        passwordProtected: !!attrs.private?.['password-protected'],
      };
    }

    function unflattenOpenSSHData(ssh) {
      const result = {};
      if (ssh.privateKey || ssh.passwordProtected) {
        result.private = {};
        if (ssh.privateKey) result.private.key = ssh.privateKey;
        if (ssh.passwordProtected) result.private['password-protected'] = {};
      }
      if (ssh.publicKey) {
        result.public = {};
        if (ssh.publicKey) result.public.key = ssh.publicKey;
      }
      return result;
    }

    function createOpenSSH() {
      editingOpenSSH.value = emptyOpenSSH();
      editingOriginalOpenSSH.value = '';
      opensshModalVisible.value = true;
    }

    function editOpenSSH() {
      if (!selectedOpenSSH.value.length) return showError({ message: t('pki.errors.selectOneOpenSSH') });
      if (selectedOpenSSH.value.length > 1) return showError({ message: t('pki.errors.selectOneOpenSSH') });
      const ssh = opensshList.value.find(n => n.name === selectedOpenSSH.value[0]);
      if (!ssh) return;
      editingOpenSSH.value = flattenOpenSSHData(ssh.name, ssh._raw || {});
      editingOriginalOpenSSH.value = ssh.name;
      opensshModalVisible.value = true;
    }

    async function removeOpenSSH() {
      if (!selectedOpenSSH.value.length) return showError({ message: t('pki.errors.selectOneOpenSSH') });
      pendingDeleteOpensshNames.value = [...selectedOpenSSH.value];
      opensshDeleteModalVisible.value = true;
    }

    async function confirmRemoveOpenSSH() {
      opensshDeleteModalVisible.value = false;
      for (const name of pendingDeleteOpensshNames.value) {
        await configStore.deleteConfig(`${path.value} openssh ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedOpenSSH.value = [];
      pendingDeleteOpensshNames.value = [];
      await load();
    }

    async function saveOpenSSH() {
      if (!editingOpenSSH.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalOpenSSH.value;
      if (!original && opensshList.value.some(n => n.name === editingOpenSSH.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenOpenSSHData(editingOpenSSH.value);
      try {
        if (original && original !== editingOpenSSH.value.name) {
          await configStore.deleteConfig(`${path.value} openssh ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} openssh ${editingOpenSSH.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} openssh ${editingOpenSSH.value.name}`, value);
          configStore.markPending();
        }
        opensshModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // OpenVPN functions
    function emptyOpenVPN() {
      return { name: '', key: '', version: '' };
    }

    function flattenOpenVPNData(name, attrs) {
      return {
        name,
        key: attrs.key || '',
        version: attrs.version || '',
      };
    }

    function unflattenOpenVPNData(vpn) {
      const result = {};
      if (vpn.key) result.key = vpn.key;
      if (vpn.version) result.version = vpn.version;
      return result;
    }

    function createOpenVPN() {
      editingOpenVPN.value = emptyOpenVPN();
      editingOriginalOpenVPN.value = '';
      openvpnModalVisible.value = true;
    }

    function editOpenVPN() {
      if (!selectedOpenVPN.value.length) return showError({ message: t('pki.errors.selectOneOpenVPN') });
      if (selectedOpenVPN.value.length > 1) return showError({ message: t('pki.errors.selectOneOpenVPN') });
      const vpn = openvpnList.value.find(n => n.name === selectedOpenVPN.value[0]);
      if (!vpn) return;
      editingOpenVPN.value = flattenOpenVPNData(vpn.name, vpn._raw || {});
      editingOriginalOpenVPN.value = vpn.name;
      openvpnModalVisible.value = true;
    }

    async function removeOpenVPN() {
      if (!selectedOpenVPN.value.length) return showError({ message: t('pki.errors.selectOneOpenVPN') });
      pendingDeleteOpenvpnNames.value = [...selectedOpenVPN.value];
      openvpnDeleteModalVisible.value = true;
    }

    async function confirmRemoveOpenVPN() {
      openvpnDeleteModalVisible.value = false;
      for (const name of pendingDeleteOpenvpnNames.value) {
        await configStore.deleteConfig(`${path.value} openvpn shared-secret ${name}`);
        configStore.markPending();
      }
      await configStore.checkSessionChanged();
      selectedOpenVPN.value = [];
      pendingDeleteOpenvpnNames.value = [];
      await load();
    }

    async function saveOpenVPN() {
      if (!editingOpenVPN.value.name) return showError({ message: t('pki.errors.enterName') });
      const original = editingOriginalOpenVPN.value;
      if (!original && openvpnList.value.some(n => n.name === editingOpenVPN.value.name)) {
        return showError({ message: t('pki.errors.nameExists') });
      }
      const value = unflattenOpenVPNData(editingOpenVPN.value);
      try {
        if (original && original !== editingOpenVPN.value.name) {
          await configStore.deleteConfig(`${path.value} openvpn shared-secret ${original}`);
          configStore.markPending();
          await configStore.setConfig(`${path.value} openvpn shared-secret ${editingOpenVPN.value.name}`, value);
          configStore.markPending();
        } else {
          await configStore.setConfig(`${path.value} openvpn shared-secret ${editingOpenVPN.value.name}`, value);
          configStore.markPending();
        }
        openvpnModalVisible.value = false;
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    // X509 functions
    async function saveX509() {
      const value = {};
      if (x509Data.value.country) value.country = x509Data.value.country;
      if (x509Data.value.locality) value.locality = x509Data.value.locality;
      if (x509Data.value.organization) value.organization = x509Data.value.organization;
      if (x509Data.value.state) value.state = x509Data.value.state;

      try {
        await configStore.setConfig(`${path.value} x509 default`, value);
        configStore.markPending();
        await configStore.checkSessionChanged();
        await load();
      } catch (e) {
        showError(e);
      }
    }

    return {t,
      
      activeTab, loading, writeDisabled, path, TABS,
      caList, selectedCA, caColumns, caSchema, caModalVisible, editingCA, editingOriginalCA,
      certList, selectedCert, certColumns, certSchema, certModalVisible, editingCert, editingOriginalCert,
      dhList, selectedDH, dhColumns, dhSchema, dhModalVisible, editingDH, editingOriginalDH,
      keyPairList, selectedKeyPair, keyPairColumns, keyPairSchema, keyPairModalVisible, editingKeyPair, editingOriginalKeyPair,
      opensshList, selectedOpenSSH, opensshColumns, opensshSchema, opensshModalVisible, editingOpenSSH, editingOriginalOpenSSH,
      openvpnList, selectedOpenVPN, openvpnColumns, openvpnSchema, openvpnModalVisible, editingOpenVPN, editingOriginalOpenVPN,
      x509Data, x509Schema,
      caDeleteModalVisible, pendingDeleteCaNames,
      certDeleteModalVisible, pendingDeleteCertNames,
      dhDeleteModalVisible, pendingDeleteDhNames,
      keypairDeleteModalVisible, pendingDeleteKeypairNames,
      opensshDeleteModalVisible, pendingDeleteOpensshNames,
      openvpnDeleteModalVisible, pendingDeleteOpenvpnNames,
      load,
      createCA, editCA, removeCA, confirmRemoveCA, saveCA,
      createCert, editCert, removeCert, confirmRemoveCert, saveCert,
      createDH, editDH, removeDH, confirmRemoveDH, saveDH,
      createKeyPair, editKeyPair, removeKeyPair, confirmRemoveKeyPair, saveKeyPair,
      createOpenSSH, editOpenSSH, removeOpenSSH, confirmRemoveOpenSSH, saveOpenSSH,
      createOpenVPN, editOpenVPN, removeOpenVPN, confirmRemoveOpenVPN, saveOpenVPN,
      saveX509,
    };
  },
  template: `
    <div class="page-container">
      <div class="section">
        <TabGroup v-model="activeTab" :tabs="TABS">
          <template #ca>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createCA" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editCA" :disabled="writeDisabled || !selectedCA.length || selectedCA.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeCA" :disabled="writeDisabled || !selectedCA.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="caColumns" :data="caList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedCA = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #certificate>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createCert" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editCert" :disabled="writeDisabled || !selectedCert.length || selectedCert.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeCert" :disabled="writeDisabled || !selectedCert.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="certColumns" :data="certList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedCert = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #dh>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createDH" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editDH" :disabled="writeDisabled || !selectedDH.length || selectedDH.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeDH" :disabled="writeDisabled || !selectedDH.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="dhColumns" :data="dhList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedDH = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #key-pair>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createKeyPair" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editKeyPair" :disabled="writeDisabled || !selectedKeyPair.length || selectedKeyPair.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeKeyPair" :disabled="writeDisabled || !selectedKeyPair.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="keyPairColumns" :data="keyPairList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedKeyPair = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #openssh>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createOpenSSH" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editOpenSSH" :disabled="writeDisabled || !selectedOpenSSH.length || selectedOpenSSH.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeOpenSSH" :disabled="writeDisabled || !selectedOpenSSH.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="opensshColumns" :data="opensshList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedOpenSSH = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #openvpn>
            <div class="toolbar">
              <div class="toolbar-left">
                <ToolbarButton icon="create" @click="createOpenVPN" :disabled="writeDisabled">{{ $t('app.create') }}</ToolbarButton>
                <ToolbarButton icon="edit" @click="editOpenVPN" :disabled="writeDisabled || !selectedOpenVPN.length || selectedOpenVPN.length > 1">{{ $t('app.edit') }}</ToolbarButton>
                <ToolbarButton icon="delete" @click="removeOpenVPN" :disabled="writeDisabled || !selectedOpenVPN.length">{{ $t('app.delete') }}</ToolbarButton>
                <ToolbarButton icon="refresh" @click="load">{{ $t('app.refresh') }}</ToolbarButton>
              </div>
            </div>
            <DataTable :columns="openvpnColumns" :data="openvpnList" :loading="loading" :disabled="writeDisabled"
                       @selection-change="selectedOpenVPN = $event" :selectable="true" :externalToolbar="true" row-key="name">
            </DataTable>
          </template>
          <template #x509>
            <ConfigForm v-model="x509Data" :schema="x509Schema" :disabled="writeDisabled" :showAdvanced="true" />
          </template>
        </TabGroup>
      </div>
      <div class="section">
      </div>

      <!-- CA Modal -->
      <DraggableModal v-model:visible="caModalVisible" :title="editingOriginalCA ? $t('app.edit') : $t('app.create')" width="700px" @confirm="saveCA">
        <ConfigForm v-model="editingCA" :schema="caSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- Certificate Modal -->
      <DraggableModal v-model:visible="certModalVisible" :title="editingOriginalCert ? $t('app.edit') : $t('app.create')" width="700px" @confirm="saveCert">
        <ConfigForm v-model="editingCert" :schema="certSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- DH Modal -->
      <DraggableModal v-model:visible="dhModalVisible" :title="editingOriginalDH ? $t('app.edit') : $t('app.create')" width="600px" @confirm="saveDH">
        <ConfigForm v-model="editingDH" :schema="dhSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- Key-pair Modal -->
      <DraggableModal v-model:visible="keyPairModalVisible" :title="editingOriginalKeyPair ? $t('app.edit') : $t('app.create')" width="700px" @confirm="saveKeyPair">
        <ConfigForm v-model="editingKeyPair" :schema="keyPairSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- OpenSSH Modal -->
      <DraggableModal v-model:visible="opensshModalVisible" :title="editingOriginalOpenSSH ? $t('app.edit') : $t('app.create')" width="700px" @confirm="saveOpenSSH">
        <ConfigForm v-model="editingOpenSSH" :schema="opensshSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- OpenVPN Modal -->
      <DraggableModal v-model:visible="openvpnModalVisible" :title="editingOriginalOpenVPN ? $t('app.edit') : $t('app.create')" width="600px" @confirm="saveOpenVPN">
        <ConfigForm v-model="editingOpenVPN" :schema="openvpnSchema" :disabled="writeDisabled" :showAdvanced="true" />
      </DraggableModal>

      <!-- CA Delete Confirmation Modal -->
      <DraggableModal v-model:visible="caDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveCA">
        <div>{{ $t('pki.confirmDeleteCA') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteCaNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- Certificate Delete Confirmation Modal -->
      <DraggableModal v-model:visible="certDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveCert">
        <div>{{ $t('pki.confirmDeleteCert') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteCertNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- DH Delete Confirmation Modal -->
      <DraggableModal v-model:visible="dhDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveDH">
        <div>{{ $t('pki.confirmDeleteDH') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteDhNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- Key-pair Delete Confirmation Modal -->
      <DraggableModal v-model:visible="keypairDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveKeyPair">
        <div>{{ $t('pki.confirmDeleteKeyPair') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteKeypairNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- OpenSSH Delete Confirmation Modal -->
      <DraggableModal v-model:visible="opensshDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveOpenSSH">
        <div>{{ $t('pki.confirmDeleteOpenSSH') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteOpensshNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>

      <!-- OpenVPN Delete Confirmation Modal -->
      <DraggableModal v-model:visible="openvpnDeleteModalVisible" :title="$t('config.confirmDelete')" width="400px" @confirm="confirmRemoveOpenVPN">
        <div>{{ $t('pki.confirmDeleteOpenVPN') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div v-for="name in pendingDeleteOpenvpnNames" :key="name" style="padding:2px 0;">{{ name }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  components: { DataTable, DraggableModal, ConfigForm, TabGroup, ToolbarButton },
});
