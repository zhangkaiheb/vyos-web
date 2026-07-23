import { defineComponent, ref } from '/src/utils/vue-import.js';

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

    return { active, select };
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
        <div v-for="tab in tabs" :key="tab.key" v-show="active === tab.key" class="tab-panel">
          <slot :name="tab.key" :tab="tab"></slot>
        </div>
      </div>
    </div>
  `,
});
