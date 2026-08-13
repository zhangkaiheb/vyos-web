import { defineComponent, ref, h, watch, onMounted, onBeforeUnmount } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'TimePicker',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'HH:mm:ss' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    const hour = ref('');
    const minute = ref('');
    const second = ref('');

    function parseTime(val) {
      if (!val) { hour.value = ''; minute.value = ''; second.value = ''; return; }
      const parts = val.split(':');
      hour.value = parts[0] || '';
      minute.value = parts[1] || '';
      second.value = parts[2] || '';
    }

    function formatTime() {
      const h = String(hour.value || '00').padStart(2, '0');
      const m = String(minute.value || '00').padStart(2, '0');
      const s = String(second.value || '00').padStart(2, '0');
      return `${h}:${m}:${s}`;
    }

    function confirmTime() {
      emit('update:modelValue', formatTime());
      isOpen.value = false;
    }

    function clearTime() {
      hour.value = '';
      minute.value = '';
      second.value = '';
      emit('update:modelValue', '');
      isOpen.value = false;
    }

    function togglePicker() {
      if (props.disabled) return;
      parseTime(props.modelValue);
      isOpen.value = !isOpen.value;
    }

    function closePicker(e) {
      if (!e.target.closest('.time-picker-wrapper')) {
        isOpen.value = false;
      }
    }

    watch(() => props.modelValue, (val) => {
      parseTime(val);
    });

    onMounted(() => document.addEventListener('click', closePicker));
    onBeforeUnmount(() => document.removeEventListener('click', closePicker));

    return () => {
      const children = [];

      const inputChildren = [];
      inputChildren.push(h('input', {
        type: 'text',
        value: props.modelValue || '',
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: true,
        onClick: togglePicker,
        class: 'time-picker-input',
      }));
      inputChildren.push(h('span', { class: 'time-picker-icon', onClick: togglePicker }, '🕐'));

      children.push(h('div', { class: 'time-picker-input-wrapper' }, inputChildren));

      if (isOpen.value) {
        const popupChildren = [];

        const rowChildren = [];
        const makeSelect = (label, val, max, onChange) => {
          const options = [];
          for (let i = 0; i <= max; i++) {
            options.push(h('option', { key: i, value: String(i).padStart(2, '0') }, String(i).padStart(2, '0')));
          }
          return h('div', { class: 'time-picker-field' }, [
            h('label', { class: 'time-picker-label' }, label),
            h('select', {
              class: 'time-picker-select',
              value: val,
              onChange: (e) => onChange(e.target.value),
            }, options),
          ]);
        };

        rowChildren.push(makeSelect('时', hour.value, 23, (v) => { hour.value = v; }));
        rowChildren.push(h('span', { class: 'time-picker-sep' }, ':'));
        rowChildren.push(makeSelect('分', minute.value, 59, (v) => { minute.value = v; }));
        rowChildren.push(h('span', { class: 'time-picker-sep' }, ':'));
        rowChildren.push(makeSelect('秒', second.value, 59, (v) => { second.value = v; }));

        popupChildren.push(h('div', { class: 'time-picker-row' }, rowChildren));

        const footerChildren = [];
        footerChildren.push(h('button', { class: 'time-picker-footer-btn', onClick: clearTime }, '清除'));
        footerChildren.push(h('button', { class: 'time-picker-footer-btn time-picker-footer-btn-primary', onClick: confirmTime }, '确定'));
        popupChildren.push(h('div', { class: 'time-picker-footer' }, footerChildren));

        children.push(h('div', { class: 'time-picker-popup' }, popupChildren));
      }

      return h('div', { class: 'time-picker-wrapper' }, children);
    };
  },
});
