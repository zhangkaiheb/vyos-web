import { defineComponent, ref, watch, computed, h } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'TabGroup',
  props: {
    tabs: { type: Array, default: () => [] },
    modelValue: { type: String, default: '' },
    headersOnly: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const active = ref(props.modelValue || props.tabs[0]?.key || '');

    function select(key) {
      active.value = key;
      emit('update:modelValue', key);
    }

    watch(() => props.modelValue, (val) => {
      if (val && val !== active.value) active.value = val;
    });

    watch(() => props.tabs, (newTabs) => {
      if (newTabs.length && !newTabs.some(t => t.key === active.value)) {
        active.value = newTabs[0].key;
        emit('update:modelValue', active.value);
      }
    }, { immediate: true });

    const activeTab = computed(() => props.tabs.find(t => t.key === active.value) || props.tabs[0]);

    return () => h('div', { class: 'tab-group' }, [
      h('div', { class: 'tab-headers' }, props.tabs.map(tab =>
        h('div', {
          class: ['tab-header', { active: active.value === tab.key }],
          'data-tab-key': tab.key,
          onClick: () => select(tab.key)
        }, tab.title)
      )),
      props.headersOnly
        ? null
        : h('div', { class: 'tab-panels' }, (() => {
            const tab = props.tabs.find(t => t.key === active.value);
            return tab && slots[tab.key]
              ? h('div', { class: 'tab-panel' }, slots[tab.key]())
              : null;
          })())
    ]);
  },
});
