import { defineComponent, ref, computed, h, inject } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'DualListSelector',
  components: { DraggableModal, ToolbarButton },
  props: {
    modelValue: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    titleLeft: { type: String, default: '' },
    titleRight: { type: String, default: '' },
    allowCustom: { type: Boolean, default: false },
    customPlaceholder: { type: String, default: '' },
    customValidator: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = inject('i18n');
    const selectedLeft = ref(new Set());
    const selectedRight = ref(new Set());
    const lastSelectedLeft = ref(null);
    const lastSelectedRight = ref(null);
    const customValue = ref('');
    const showCustomModal = ref(false);

    // Extract the actual value from an option (supports both string and {value,label} formats)
    function optValue(opt) {
      return typeof opt === 'object' ? opt.value : opt;
    }

    function optLabel(opt) {
      return typeof opt === 'object' ? (opt.label || opt.value) : opt;
    }

    const availableItems = computed(() => {
      const selected = new Set(props.modelValue || []);
      return props.options.filter(opt => !selected.has(optValue(opt)));
    });

    const selectedItems = computed(() => {
      const selected = props.modelValue || [];
      // Map selected values back to their full option objects for display
      const optMap = {};
      props.options.forEach(opt => { optMap[optValue(opt)] = opt; });
      return selected.map(v => optMap[v] !== undefined ? optMap[v] : v);
    });

    function emitValue(nextSelected) {
      emit('update:modelValue', nextSelected);
    }

    function moveToRight() {
      const toAdd = availableItems.value.filter((_, i) => selectedLeft.value.has(i)).map(optValue);
      if (!toAdd.length) return;
      emitValue([...(props.modelValue || []), ...toAdd]);
      selectedLeft.value = new Set();
      lastSelectedLeft.value = null;
    }

    function moveToLeft() {
      const toRemove = new Set(selectedItems.value.filter((_, i) => selectedRight.value.has(i)).map(optValue));
      if (!toRemove.size) return;
      emitValue((props.modelValue || []).filter(v => !toRemove.has(v)));
      selectedRight.value = new Set();
      lastSelectedRight.value = null;
    }

    function moveAllToRight() {
      if (!availableItems.value.length) return;
      emitValue([...(props.modelValue || []), ...availableItems.value.map(optValue)]);
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

    function addCustom() {
      const value = String(customValue.value || '').trim();
      if (!value) {
        showCustomModal.value = false;
        return;
      }
      if (props.customValidator) {
        const err = props.customValidator(value);
        if (err) {
          alert(err);
          return;
        }
      }
      const current = props.modelValue || [];
      if (!current.includes(value)) {
        emitValue([...current, value]);
      }
      customValue.value = '';
      showCustomModal.value = false;
    }

    function renderList(items, selected, lastRef, side) {
      const titleChildren = [h('span', {}, side === 'left' ? (props.titleLeft || t('form.optional')) : (props.titleRight || t('form.selected')))];
      if (side === 'left' && props.allowCustom) {
        titleChildren.push(h('button', {
          type: 'button',
          class: 'dual-list-add-btn',
          disabled: props.disabled,
          title: t('form.addCustom'),
          onClick: () => { customValue.value = ''; showCustomModal.value = true; },
        }, '+'));
      }
      const itemElements = items.map((item, index) => h('div', {
        key: optValue(item),
        class: ['dual-list-item', { selected: selected.has(index), disabled: props.disabled }],
        onClick: (e) => toggleSelection(
          side === 'left' ? selectedLeft : selectedRight,
          side === 'left' ? lastSelectedLeft : lastSelectedRight,
          index, e, items
        ),
      }, optLabel(item)));
      const children = [
        h('div', { class: 'dual-list-title' }, titleChildren),
        h('div', { class: 'dual-list-items' }, itemElements),
      ];
      return h('div', { class: 'dual-list-box' }, children);
    }

    function renderCustomModal() {
      if (!props.allowCustom) return null;
      return h(DraggableModal, {
        title: t('form.addCustom'),
        width: '360px',
        visible: showCustomModal.value,
        'onUpdate:visible': (v) => { showCustomModal.value = v; },
        onConfirm: addCustom,
        onClose: () => { customValue.value = ''; },
      }, {
        default: () => h('div', { class: 'dual-list-custom-input' }, [
          h('input', {
            type: 'text',
            class: 'form-control',
            placeholder: props.customPlaceholder || t('form.customPlaceholder'),
            value: customValue.value,
            disabled: props.disabled,
            onInput: (e) => { customValue.value = e.target.value; },
            onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } },
          }),
        ]),
      });
    }

    function renderButtons() {
      return h('div', { class: 'dual-list-buttons' }, [
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedLeft.value.size,
          onClick: moveToRight,
          title: t('form.moveToRight'),
        }, '>'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !availableItems.value.length,
          onClick: moveAllToRight,
          title: t('form.moveAllToRight'),
        }, '>>'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedRight.value.size,
          onClick: moveToLeft,
          title: t('form.moveToLeft'),
        }, '<'),
        h('button', {
          type: 'button',
          class: 'dual-list-btn',
          disabled: props.disabled || !selectedItems.value.length,
          onClick: moveAllToLeft,
          title: t('form.moveAllToLeft'),
        }, '<<'),
      ]);
    }

    return () => h('div', { class: 'dual-list-selector' }, [
      renderList(availableItems.value, selectedLeft.value, lastSelectedLeft, 'left'),
      renderButtons(),
      renderList(selectedItems.value, selectedRight.value, lastSelectedRight, 'right'),
      renderCustomModal(),
    ]);
  },
});
