import { defineComponent, ref, computed, h, watch, onMounted, onBeforeUnmount } from '/src/utils/vue-import.js';
import { useI18n } from '/src/i18n/index.js';

export default defineComponent({
  name: 'DatePicker',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'YYYY-MM-dd' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const isOpen = ref(false);
    const selectedDate = ref(props.modelValue ? new Date(props.modelValue + 'T00:00:00') : null);
    const viewYear = ref(new Date().getFullYear());
    const viewMonth = ref(new Date().getMonth());

    const weekdays = computed(() => {
      const days = [];
      for (let i = 1; i <= 7; i++) {
        days.push(t(`form.weekday${i}`));
      }
      return days;
    });

    const calendarDays = computed(() => {
      const firstDay = new Date(viewYear.value, viewMonth.value, 1);
      const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = (firstDay.getDay() + 6) % 7;

      const days = [];
      const prevMonthLastDay = new Date(viewYear.value, viewMonth.value, 0).getDate();
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        days.push({ day: prevMonthLastDay - i, currentMonth: false });
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ day: i, currentMonth: true });
      }
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, currentMonth: false });
      }
      return days;
    });

    function formatDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function selectDay(day) {
      const date = new Date(viewYear.value, viewMonth.value, day);
      selectedDate.value = date;
      emit('update:modelValue', formatDate(date));
      isOpen.value = false;
    }

    function clearDate() {
      selectedDate.value = null;
      emit('update:modelValue', '');
      isOpen.value = false;
    }

    function selectToday() {
      const today = new Date();
      selectedDate.value = today;
      viewYear.value = today.getFullYear();
      viewMonth.value = today.getMonth();
      emit('update:modelValue', formatDate(today));
      isOpen.value = false;
    }

    function prevMonth() {
      viewMonth.value--;
      if (viewMonth.value < 0) { viewMonth.value = 11; viewYear.value--; }
    }

    function nextMonth() {
      viewMonth.value++;
      if (viewMonth.value > 11) { viewMonth.value = 0; viewYear.value++; }
    }

    function isToday(day) {
      const today = new Date();
      return day === today.getDate() && viewMonth.value === today.getMonth() && viewYear.value === today.getFullYear();
    }

    function isSelected(day) {
      if (!selectedDate.value) return false;
      return day === selectedDate.value.getDate() && viewMonth.value === selectedDate.value.getMonth() && viewYear.value === selectedDate.value.getFullYear();
    }

    function togglePicker() {
      if (props.disabled) return;
      isOpen.value = !isOpen.value;
    }

    function closePicker(e) {
      if (!e.target.closest('.date-picker-wrapper')) {
        isOpen.value = false;
      }
    }

    watch(() => props.modelValue, (val) => {
      if (val) {
        const date = new Date(val + 'T00:00:00');
        selectedDate.value = date;
        viewYear.value = date.getFullYear();
        viewMonth.value = date.getMonth();
      } else {
        selectedDate.value = null;
      }
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
        class: 'date-picker-input',
      }));
      inputChildren.push(h('span', { class: 'date-picker-icon', onClick: togglePicker }, '📅'));

      children.push(h('div', { class: 'date-picker-input-wrapper' }, inputChildren));

      if (isOpen.value) {
        const popupChildren = [];

        const headerChildren = [];
        headerChildren.push(h('button', { class: 'date-picker-nav-btn', onClick: prevMonth }, '‹'));
        headerChildren.push(h('span', { class: 'date-picker-month-year' }, `${viewYear.value}年${String(viewMonth.value + 1).padStart(2, '0')}月`));
        headerChildren.push(h('button', { class: 'date-picker-nav-btn', onClick: nextMonth }, '›'));
        popupChildren.push(h('div', { class: 'date-picker-header' }, headerChildren));

        const weekdayChildren = weekdays.value.map((day, i) =>
          h('div', { key: i, class: 'date-picker-weekday' }, day)
        );
        popupChildren.push(h('div', { class: 'date-picker-weekdays' }, weekdayChildren));

        const dayChildren = calendarDays.value.map((item, i) => {
          const classes = ['date-picker-day'];
          if (!item.currentMonth) classes.push('date-picker-day-other');
          if (isToday(item.day)) classes.push('date-picker-day-today');
          if (isSelected(item.day)) classes.push('date-picker-day-selected');
          return h('div', {
            key: i,
            class: classes.join(' '),
            onClick: () => item.currentMonth && selectDay(item.day),
          }, item.day);
        });
        popupChildren.push(h('div', { class: 'date-picker-days' }, dayChildren));

        const footerChildren = [];
        footerChildren.push(h('button', { class: 'date-picker-footer-btn', onClick: clearDate }, t('form.clear')));
        footerChildren.push(h('button', { class: 'date-picker-footer-btn date-picker-footer-btn-primary', onClick: selectToday }, t('form.today')));
        popupChildren.push(h('div', { class: 'date-picker-footer' }, footerChildren));

        children.push(h('div', { class: 'date-picker-popup' }, popupChildren));
      }

      return h('div', { class: 'date-picker-wrapper' }, children);
    };
  },
});
