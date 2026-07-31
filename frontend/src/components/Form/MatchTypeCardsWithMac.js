import { defineComponent, computed } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'MatchTypeCardsWithMac',
  props: {
    groupType: { type: String, default: '' },
    groupValue: { type: String, default: '' },
    macValue: { type: String, default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    macPlaceholder: { type: String, default: '' },
    help: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:groupType', 'update:groupValue', 'update:macValue'],
  setup(props, { emit }) {
    const selectedType = computed({
      get: () => props.groupType,
      set: (val) => {
        emit('update:groupType', val);
        emit('update:groupValue', '');
      },
    });

    const inputValue = computed({
      get: () => props.groupValue,
      set: (val) => emit('update:groupValue', val),
    });

    const macInput = computed({
      get: () => props.macValue,
      set: (val) => emit('update:macValue', val),
    });

    return { selectedType, inputValue, macInput };
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
      <div class="match-card match-card-mac">
        <div class="match-card-header">
          <span class="match-card-label">{{ $t('firewall.macGroup') || 'MAC组' }}</span>
        </div>
        <input
          type="text"
          class="match-card-input"
          :placeholder="macPlaceholder"
          :value="macInput"
          :disabled="disabled"
          @input="macInput = $event.target.value"
        />
      </div>
      <div v-if="help" class="form-hint">{{ help }}</div>
    </div>
  `,
});
