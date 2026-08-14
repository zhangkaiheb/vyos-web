import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { useConfigStore } from '/src/stores/config.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useVisibilityStore } from '/src/stores/visibility.js';
import { updateRouterMenu } from '/src/router/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useI18n } from '/src/i18n/index.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const CATEGORY_ORDER = [
  'system-interfaces',
  'system-container',
  'system-ha',
  'routing-protocols',
  'bgp-tabs',
  'ospf-tabs',
  'system-services',
  'qos',
  'vpn',
  'vpp',
];

const CATEGORY_LABELS = {
  'system-interfaces': { zh: '网络接口', en: 'Network Interfaces' },
  'system-container': { zh: '容器', en: 'Container' },
  'system-ha': { zh: '高可用性', en: 'High Availability' },
  'routing-protocols': { zh: '路由协议', en: 'Routing Protocols' },
  'bgp-tabs': { zh: 'BGP标签', en: 'BGP Tabs' },
  'ospf-tabs': { zh: 'OSPF标签', en: 'OSPF Tabs' },
  'system-services': { zh: '系统服务', en: 'System Services' },
  'qos': { zh: 'QoS策略', en: 'QoS Policy' },
  'vpn': { zh: '虚拟专用网络', en: 'VPN' },
  'vpp': { zh: 'VPP', en: 'VPP' },
};

export default defineComponent({
  name: 'FeatureVisibilityPage',
  components: { TabGroup, ToolbarButton },
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const authStore = useAuthStore();
    const visibilityStore = useVisibilityStore();
    const features = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const changedKeys = ref(new Set());
    const activeTab = ref('');

    const groupedFeatures = computed(() => {
      const groups = {};
      for (const f of features.value) {
        if (!groups[f.category]) {
          groups[f.category] = {
            label: CATEGORY_LABELS[f.category]?.zh || f.category_label,
            labelEn: CATEGORY_LABELS[f.category]?.en || f.category_label_en,
            items: [],
          };
        }
        groups[f.category].items.push(f);
      }
      return groups;
    });

    const tabs = computed(() => {
      return CATEGORY_ORDER
        .filter(key => groupedFeatures.value[key])
        .map(key => ({
          key,
          title: groupedFeatures.value[key].label,
        }));
    });

    const currentItems = computed(() => {
      if (!activeTab.value) return [];
      return groupedFeatures.value[activeTab.value]?.items || [];
    });

    const hasChanges = computed(() => changedKeys.value.size > 0);

    async function load() {
      loading.value = true;
      try {
        const res = await fetch('/api/feature-visibility', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('vyos_token') },
        });
        const data = await res.json();
        if (data.success) {
          features.value = data.features;
          changedKeys.value.clear();
          if (!activeTab.value && tabs.value.length > 0) {
            activeTab.value = tabs.value[0].key;
          }
        } else {
          showError(data.message || '加载失败');
        }
      } catch (e) {
        showError('加载功能可见性配置失败: ' + e.message);
      } finally {
        loading.value = false;
      }
    }

    function toggleVisibility(feature) {
      feature.is_visible = !feature.is_visible;
      changedKeys.value.add(feature.feature_key);
    }

    async function save() {
      if (!hasChanges.value) return;
      saving.value = true;
      try {
        const updates = features.value
          .filter(f => changedKeys.value.has(f.feature_key))
          .map(f => ({ feature_key: f.feature_key, is_visible: f.is_visible }));

        const res = await fetch('/api/feature-visibility/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('vyos_token'),
          },
          body: JSON.stringify({ updates }),
        });
        const data = await res.json();
        if (data.success) {
          changedKeys.value.clear();
          // Reload visibility and menu to reflect changes
          await Promise.all([
            visibilityStore.load(),
            authStore.loadMenu(),
          ]);
          updateRouterMenu(authStore.menu);
        } else {
          showError(data.message || '保存失败');
        }
      } catch (e) {
        showError('保存失败: ' + e.message);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      load();
    });

    return {
      t, loading, saving, activeTab, tabs, currentItems, hasChanges,
      toggleVisibility, save,
    };
  },
  template: `
    <div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template v-for="tab in tabs" :key="tab.key" #[tab.key]>
          <div v-if="loading" style="text-align:center;padding:40px;color:#999;">{{ t('common.loading') || '加载中...' }}</div>
          <div v-else-if="currentItems.length === 0" style="text-align:center;padding:40px;color:#999;">{{ t('common.noData') || '暂无数据' }}</div>
          <div v-else>
            <div
              v-for="feature in currentItems"
              :key="feature.feature_key"
              style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid #f0f0f0;"
            >
              <span style="font-size:14px;width:200px;">{{ feature.feature_label }}</span>
              <input type="checkbox" :checked="feature.is_visible" @change="toggleVisibility(feature)" style="cursor:pointer;" />
            </div>
          </div>
        </template>
      </TabGroup>
      <div style="margin-top:16px;text-align:right;">
        <ToolbarButton icon="confirm" primary :disabled="!hasChanges || saving" @click="save">
          {{ saving ? t('app.loading') : t('app.confirm') }}
        </ToolbarButton>
      </div>
    </div>
  `,
});
