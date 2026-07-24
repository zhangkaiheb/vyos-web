import { defineComponent, ref, computed, h } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'DualListSelector',
  props: {
    modelValue: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    titleLeft: { type: String, default: '可选' },
    titleRight: { type: String, default: '已选' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const selectedLeft = ref(new Set());
    const selectedRight = ref(new Set());
    const lastSelectedLeft = ref(null);
    const lastSelectedRight = ref(null);

    const availableItems = computed(() => {
      const selected = new Set(props.modelValue || []);
      return props.options.filter(opt => !selected.has(opt));
    });

    const selectedItems = computed(() => {
      const selected = new Set(props.modelValue || []);
      return props.options.filter(opt => selected.has(opt));
    });

    function emitValue(nextSelected) {
      emit('update:modelValue', nextSelected);
    }

    function moveToRight() {
      const toAdd = availableItems.value.filter((_, i) => selectedLeft.value.has(i));
      if (!toAdd.length) return;
      emitValue([...(props.modelValue || []), ...toAdd]);
      selectedLeft.value = new Set();
      lastSelectedLeft.value = null;
    }

    function moveToLeft() {
      const toRemove = new Set(selectedItems.value.filter((_, i) => selectedRight.value.has(i)));
      if (!toRemove.size) return;
      emitValue((props.modelValue || []).filter(v => !toRemove.has(v)));
      selectedRight.value = new Set();
      lastSelectedRight.value = null;
    }

    function moveAllToRight() {
      if (!availableItems.value.length) return;
      emitValue([...(props.modelValue || []), ...availableItems.value]);
      selectedLeft.value = new Set();
      lastSelectedLeft.value = null;
    }

    function moveAllToLeft() {
      if (!selectedItems.value.length) return;
      emitValue([]);
      selectedRight.value = new Set();
      lastSelectedRight.value = null;
    }

    function toggleSelection(setRef, lastRef, index, event, items) {
      if (props.disabled) return;
      const next = new Set(setRef.value);
      if (event.shiftKey && lastRef.value !== null) {
        const start = Math.min(lastRef.value, index);
        const end = Math.max(lastRef.value, index);
        for (let i = start; i <= end; i++) next.add(i);
      } else if (event.ctrlKey || event.metaKey) {
        if (next.has(index)) next.delete(index);
        else next.add(index);
      } else {
        next.clear();
        next.add(index);
      }
      setRef.value = next;
      lastRef.value = index;
    }

    function renderList(items, selected, lastRef, side) {
      return h('div', { class: 'dual-list-box' }, [
        h('div', { class: 'dual-list-title' }, side === 'left' ? props.titleLeft : props.titleRight),
        h('div', { class: 'dual-list-items' }, items.map((item, index) => h('div', {
          key: item,
          class: ['dual-list-item', { selected: selected.has(index), disabled: props.disabled }],
          onClick: (e) => toggleSelection(
            side === 'left' ? selectedLeft : selectedRight,
            side === 'left' ? lastSelectedLeft : lastSelectedRight,
            index, e, items
          ),
        }, item))),
      ]);
    }

    function renderButtons() {
      return h('div', { class: 'dual-list-buttons' }, [
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedLeft.value.size,
          onClick: moveToRight,
          title: '移动选中项到右侧',
        }, '>'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !availableItems.value.length,
          onClick: moveAllToRight,
          title: '全部移动到右侧',
        }, '>>'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedRight.value.size,
          onClick: moveToLeft,
          title: '移动选中项到左侧',
        }, '<'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedItems.value.length,
          onClick: moveAllToLeft,
          title: '全部移动到左侧',
        }, '<<'),
      ]);
    }

    return () => h('div', { class: 'dual-list-selector' }, [
      renderList(availableItems.value, selectedLeft.value, lastSelectedLeft, 'left'),
      renderButtons(),
      renderList(selectedItems.value, selectedRight.value, lastSelectedRight, 'right'),
    ]);
  },
});
