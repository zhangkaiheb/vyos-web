import { defineComponent, computed } from '/src/utils/vue-import.js';
import { useRoute, useRouter } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { emitMenuRefresh } from '/src/utils/eventBus.js';

export default defineComponent({
  name: 'SideMenu',
  setup() {
    const auth = useAuthStore();
    const route = useRoute();
    const router = useRouter();
    const parts = computed(() => route.path.split('/').filter(Boolean));
    const activeL1 = computed(() => parts.value[0] || '');
    const l1Item = computed(() => auth.menu.find(i => i.id === activeL1.value));

    function isActive(item) {
      if (!item.route) return false;
      return route.path === item.route || route.path.startsWith(item.route + '/');
    }

    function onLeafClick(item, event) {
      if (route.path === item.route) {
        event.preventDefault();
        emitMenuRefresh(route.path);
      }
    }

    const items = computed(() => {
      if (!l1Item.value) return [];
      return (l1Item.value.children || []).filter(item => !item.hidden).map(item => ({ ...item, level: 2 }));
    });

    return { items, isActive, router, onLeafClick };
  },
  template: `
    <aside class="side-menu">
      <template v-for="item in items" :key="item.route || item.id">
        <router-link v-if="item.route" :to="item.route" custom v-slot="{ navigate }">
          <div class="side-menu-item menu-leaf" :class="['level-' + item.level, { active: isActive(item) }]" @click="(e) => { onLeafClick(item, e); navigate(e); }">
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
