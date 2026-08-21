import { ref, computed } from '/src/utils/vue-import.js';

// Feature visibility store - manages which features are visible/hidden
const visibleFeatures = ref(new Set());
const loading = ref(false);

// Tab/field feature mappings for specific pages
const TAB_FEATURE_MAP = {
  'bgp': {
    'bmp': 'bgp-bmp',
    'sid': 'bgp-sid',
    'srv6': 'bgp-srv6',
  },
  'ospf': {
    'mpls-te': 'ospf-mpls-te',
    'ldp-sync': 'ospf-ldp-sync',
    'segment-routing': 'ospf-segment-routing',
  },
  'qos': {
    'network-emulator': 'qos-network-emulator',
    'random-detection': 'qos-random-detection',
    'shaper-hfsc': 'qos-shaper-hfsc',
  },
  'ha': {
    'virtual-server': 'ha-virtual-server',
  },
  'ipsec': {
    'remote-access': 'ipsec-remote-access',
  },
  'ethernet': {
  },
};

export function useVisibilityStore() {
  async function load() {
    loading.value = true;
    try {
      const res = await fetch('/api/feature-visibility', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('vyos_token') },
      });
      const data = await res.json();
      if (data.success) {
        visibleFeatures.value = new Set(
          data.features.filter(f => f.is_visible).map(f => f.feature_key)
        );
      }
    } catch (e) {
      console.error('Failed to load feature visibility:', e);
    } finally {
      loading.value = false;
    }
  }

  function isVisible(featureKey) {
    return visibleFeatures.value.has(featureKey);
  }

  function isMenuItemVisible(item) {
    const featureKey = item.featureKey;
    if (!featureKey) return true; // No featureKey means always visible
    return isVisible(featureKey);
  }

  function isTabVisible(pageKey, tabKey) {
    const pageMap = TAB_FEATURE_MAP[pageKey];
    if (!pageMap) return true;
    const featureKey = pageMap[tabKey];
    if (!featureKey) return true;
    return isVisible(featureKey);
  }

  function filterMenuItems(items) {
    return items.filter(item => isMenuItemVisible(item));
  }

  function filterTabs(pageKey, tabs) {
    return tabs.filter(tab => isTabVisible(pageKey, tab.key));
  }

  return {
    visibleFeatures: computed(() => visibleFeatures.value),
    loading: computed(() => loading.value),
    load,
    isVisible,
    isMenuItemVisible,
    isTabVisible,
    filterMenuItems,
    filterTabs,
  };
}
