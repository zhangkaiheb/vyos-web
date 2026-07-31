import { defineComponent, computed } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'MatchTypeCards',
  props: {
    modelValue: { type: String, default: '' },
    value: { type: String, default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    help: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'update:value'],
  setup(props, { emit }) {
    const selectedType = computed({
      get: () => props.modelValue,
      set: (val) => {
        emit('update:modelValue', val);
        emit('update:value', '');
      },
    });

    const inputValue = computed({
      get: () => props.value,
      set: (val) => emit('update:value', val),
    });

    return { selectedType, inputValue };
  },
  template: `
    <div class="match-type-cards">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="match-card"
        :class="{
          'match-card-selected': selectedType === opt.value,
          'match-card-disabled': selectedType && selectedType !== opt.value
        }"
        @click="!disabled && (selectedType = opt.value)"
      >
        <div class="match-card-header">
          <input
            type="radio"
            :name="'match-' + opt.value"
            :value="opt.value"
            :checked="selectedType === opt.value"
            :disabled="disabled"
            @click.stop="!disabled && (selectedType = opt.value)"
          />
          <span class="match-card-label">{{ opt.label }}</span>
        </div>
        <input
          v-if="selectedType === opt.value"
          type="text"
          class="match-card-input"
          :placeholder="placeholder"
          :value="inputValue"
          :disabled="disabled"
          @input="inputValue = $event.target.value"
          @click.stop
        />
      </div>
      <div v-if="help" class="form-hint">{{ help }}</div>
    </div>
  `,
});
