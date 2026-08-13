import { defineComponent, ref, computed, onMounted, inject } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ConfigForm from '/src/components/Form/ConfigForm.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import { api, interfaceApi } from '/src/api/index.js';
import { onMenuRefresh } from '/src/utils/eventBus.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';

const SOURCE_VALIDATION_OPTIONS = [
  { value: 'strict', labelKey: 'strict' },
  { value: 'loose', labelKey: 'loose' },
  { value: 'disable', labelKey: 'disable' },
];

export default defineComponent({
  name: 'LoopbackPage',
  components: { DataTable, DraggableModal, ConfigForm, TabGroup },
  setup() {
    const configStore = useConfigStore();
    const { t } = inject('i18n');
    const COLUMNS = computed(() => [
      { key: 'name', title: t('interface.loopback.name'), width: 120 },
      { key: 'description', title: t('interface.loopback.description'), width: 200 },
      { key: 'address', title: t('interface.loopback.address'), width: 200 },
      { key: 'actions', title: t('interface.loopback.actions'), width: 100 },
    ]);
    const loading = ref(false);
    const loopbacks = ref([]);
    const modalVisible = ref(false);
    const editingLoopback = ref(null);
    const interfaceOptions = ref([]);
    const activeTab = ref('basic');

    // Schema definitions
    const basicSchema = computed(() => [
      { key: 'name', title: t('interface.loopback.name'), type: 'text', required: true, value: 'lo', disabled: true, help: t('interface.loopback.name_help') },
      { key: 'description', title: t('interface.loopback.description'), type: 'text', placeholder: t('interface.loopback.description_placeholder') },
      { key: 'address', title: t('interface.loopback.address'), type: 'textarea', placeholder: t('interface.loopback.address_placeholder'), help: t('interface.loopback.address_help') },
    ]);

    const ipSchema = computed(() => [
      { key: 'ip_source_validation', title: t('interface.loopback.source_validation'), type: 'select', options: SOURCE_VALIDATION_OPTIONS.map(opt => ({ value: opt.value, label: opt.labelKey })), placeholder: t('interface.loopback.source_validation_placeholder'), help: t('interface.loopback.source_validation_help') },
    ]);

    const mirrorSchema = computed(() => [
      { key: 'mirror_egress', title: t('interface.loopback.mirror_egress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.loopback.mirror_placeholder'), help: t('interface.loopback.mirror_egress_help') },
      { key: 'mirror_ingress', title: t('interface.loopback.mirror_ingress'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.loopback.mirror_placeholder'), help: t('interface.loopback.mirror_ingress_help') },
    ]);

    const otherSchema = computed(() => [
      { key: 'redirect', title: t('interface.loopback.redirect'), type: 'select', options: interfaceOptions.value, placeholder: t('interface.loopback.mirror_placeholder'), help: t('interface.loopback.redirect_help') },
    ]);

    // Command text
    const commandText = computed(() => {
      if (!editingLoopback.value) return '';
      const l = editingLoopback.value;
      const name = l.name || 'lo';
      const lines = [];

      if (l.description) lines.push(`set interfaces loopback ${name} description "${l.description}"`);
      if (l.address) {
        l.address.split('\n').filter(Boolean).forEach(addr => {
          lines.push(`set interfaces loopback ${name} address ${addr.trim()}`);
        });
      }
      if (l.ip_source_validation) lines.push(`set interfaces loopback ${name} ip source-validation ${l.ip_source_validation}`);
      if (l.mirror_egress) lines.push(`set interfaces loopback ${name} mirror egress ${l.mirror_egress}`);
      if (l.mirror_ingress) lines.push(`set interfaces loopback ${name} mirror ingress ${l.mirror_ingress}`);
      if (l.redirect) lines.push(`set interfaces loopback ${name} redirect ${l.redirect}`);

      return lines.length ? lines.join('\n') : '# ' + t('interface.loopback.no_config');
    });

    const modalTabs = computed(() => [
      { key: 'basic', title: t('interface.loopback.basic_config') },
      { key: 'ip', title: t('interface.loopback.ipv4_params') },
      { key: 'mirror', title: t('interface.loopback.mirror_traffic') },
      { key: 'other', title: t('interface.loopback.other') },
    ]);

    function getDefaultForm() {
      return {
        name: 'lo', description: '', address: '',
        ip_source_validation: '',
        mirror_egress: '', mirror_ingress: '',
        redirect: '',
      };
    }

    function loopbackToForm(l) {
      return {
        name: l.name || 'lo',
        description: l.description || '',
        address: Array.isArray(l.address) ? l.address.join('\n') : (l.address || ''),
        ip_source_validation: l.ip?.source_validation || '',
        mirror_egress: l.mirror?.egress || '',
        mirror_ingress: l.mirror?.ingress || '',
        redirect: l.redirect || '',
      };
    }

    function formToLoopback(form) {
      const result = { name: form.name };
      if (form.description) result.description = form.description;
      if (form.address) {
        result.address = form.address.split('\n').filter(Boolean).map(s => s.trim());
      }
      const ip = {};
      if (form.ip_source_validation) ip.source_validation = form.ip_source_validation;
      if (Object.keys(ip).length) result.ip = ip;
      const mirror = {};
      if (form.mirror_egress) mirror.egress = form.mirror_egress;
      if (form.mirror_ingress) mirror.ingress = form.mirror_ingress;
      if (Object.keys(mirror).length) result.mirror = mirror;
      if (form.redirect) result.redirect = form.redirect;
      return result;
    }

    async function load() {
      loading.value = true;
      try {
        const res = await api.get('/config', { path: 'interfaces loopback' });
        const cfg = res.data || {};
        loopbacks.value = Object.entries(cfg).map(([name, val]) => ({
          name,
          ...val,
          address: Array.isArray(val.address) ? val.address.join(', ') : (val.address || ''),
          description: val.description || '',
        }));

        // Load interface options
        const ifRes = await interfaceApi.ethernet();
        const ifaces = ifRes.interfaces || [];
        interfaceOptions.value = ifaces.map(iface => ({
          value: iface.name || iface,
          label: iface.name || iface,
        }));
      } catch (err) {
        showError(err);
      } finally {
        loading.value = false;
      }
    }

    function showError(err) {
      showError({ message: `${t('error.code')} ${err.code || 'ERROR'}\n${t('error.message')} ${err.message || err}` });
    }

    function openModal() {
      const raw = loopbacks.value.find(l => l.name === 'lo');
      if (raw) {
        editingLoopback.value = loopbackToForm(raw);
      } else {
        editingLoopback.value = getDefaultForm();
      }
      activeTab.value = 'basic';
      modalVisible.value = true;
    }

    async function save() {
      try {
        const form = editingLoopback.value;
        const config = formToLoopback(form);
        console.log('[Loopback] ' + t('interface.loopback.save_log') + ' ' + JSON.stringify(config, null, 2));

        const path = 'interfaces loopback lo';
        await configStore.setConfig(path, config);
        configStore.markPending();

        modalVisible.value = false;
        await load();
      } catch (err) {
        displayError(err);
      }
    }

    onMounted(() => { load(); onMenuRefresh(load); });

    return {t,

      loading, loopbacks, modalVisible, editingLoopback, interfaceOptions, activeTab,
      COLUMNS,
      basicSchema, ipSchema, mirrorSchema, otherSchema,
      commandText, modalTabs,
      openModal, save, load,
    };
  },
  template: `
    <div class="page-container">
      <DataTable
        :columns="COLUMNS"
        :data="loopbacks"
        :loading="loading"
        :selectable="false"
        :actions="['edit', 'refresh']"
        @edit="openModal"
        @refresh="load"
      />

      <DraggableModal v-model:visible="modalVisible" :title="$t('interface.loopback.modal_edit')" width="800px">
        <template #default>
          <TabGroup v-model="activeTab" :tabs="modalTabs">
            <template #basic>
              <ConfigForm :schema="basicSchema" :model="editingLoopback" />
            </template>
            <template #ip>
              <ConfigForm :schema="ipSchema" :model="editingLoopback" />
            </template>
            <template #mirror>
              <ConfigForm :schema="mirrorSchema" :model="editingLoopback" />
            </template>
            <template #other>
              <ConfigForm :schema="otherSchema" :model="editingLoopback" />
            </template>
          </TabGroup>
        </template>
        <template #footer>
          <button type="button" class="btn btn-default" @click="modalVisible = false">{{ $t('app.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="save">{{ $t('app.confirm') }}</button>
        </template>
      </DraggableModal>
    </div>
  `,
});
