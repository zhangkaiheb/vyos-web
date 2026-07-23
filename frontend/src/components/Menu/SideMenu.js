import { defineComponent, computed } from '/src/utils/vue-import.js';
import { useRoute } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';

export default defineComponent({
  name: 'SideMenu',
  setup() {
    const auth = useAuthStore();
    const route = useRoute();
    const parts = computed(() => route.path.split('/').filter(Boolean));
    const activeL1 = computed(() => parts.value[0] || '');
    const l1Item = computed(() => auth.menu.find(i => i.id === activeL1.value));

    function isActive(item) {
      if (!item.route) return false;
      return route.path === item.route || route.path.startsWith(item.route + '/');
    }

    const items = computed(() => {
      if (!l1Item.value) return [];
      return (l1Item.value.children || []).map(item => ({ ...item, level: 2 }));
    });

    return { items, isActive };
  },
  template: `
    <aside class="side-menu">
      <template v-for="item in items" :key="item.route || item.id">
        <router-link v-if="item.route" :to="item.route">
          <div class="side-menu-item" :class="['level-' + item.level, { active: isActive(item) }]">
            {{ item.label }}
          </div>
        </router-link>
        <div v-else class="side-menu-item" :class="['level-' + item.level]">
          {{ item.label }}
        </div>
      </template>
    </aside>
  `,
});
