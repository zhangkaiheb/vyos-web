import { defineComponent, ref, watch, computed, h } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'TabGroup',
  props: {
    tabs: { type: Array, default: () => [] },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const active = ref(props.modelValue || (props.tabs[0]?.key || ''));

    function select(key) {
      active.value = key;
      emit('update:modelValue', key);
    }

    watch(() => props.modelValue, (val) => {
      if (val && val !== active.value) active.value = val;
    });

    const activeTab = computed(() => props.tabs.find(t => t.key === active.value) || props.tabs[0]);

    return () => h('div', { class: 'tab-group' }, [
      h('div', { class: 'tab-headers' }, props.tabs.map(tab =>
        h('div', {
          class: ['tab-header', { active: active.value === tab.key }],
          onClick: () => select(tab.key)
        }, tab.title)
      )),
      h('div', { class: 'tab-panels' }, props.tabs.map(tab =>
        h('div', {
          class: 'tab-panel',
          style: { display: active.value === tab.key ? 'block' : 'none' }
        }, slots[tab.key] ? slots[tab.key]() : [])
      ))
    ]);
  },
});
