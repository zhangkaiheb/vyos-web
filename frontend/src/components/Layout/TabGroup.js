import { defineComponent, ref, watch, computed } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'TabGroup',
  props: {
    tabs: { type: Array, default: () => [] },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const active = ref(props.modelValue || (props.tabs[0]?.key || ''));

    function select(key) {
      active.value = key;
      emit('update:modelValue', key);
    }

    watch(() => props.modelValue, (val) => {
      if (val && val !== active.value) active.value = val;
    });

    const activeTab = computed(() => props.tabs.find(t => t.key === active.value) || props.tabs[0]);

    return { active, select, activeTab };
  },
  template: `
    <div class="tab-group">
      <div class="tab-headers">
        <div v-for="tab in tabs" :key="tab.key"
             class="tab-header"
             :class="{ active: active === tab.key }"
             @click="select(tab.key)">
          {{ tab.title }}
        </div>
      </div>
      <div class="tab-panels">
        <div class="tab-panel">
          <slot :name="activeTab.key" :tab="activeTab"></slot>
        </div>
      </div>
    </div>
  `,
});
