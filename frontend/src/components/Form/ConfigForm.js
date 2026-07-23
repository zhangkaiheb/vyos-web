import { defineComponent, ref, computed, watch } from '/src/utils/vue-import.js';
import { validateField } from '/src/utils/validators.js';

function defaultValue(field) {
  if (field.default !== undefined) return JSON.parse(JSON.stringify(field.default));
  if (field.type === 'checkbox') return false;
  if (field.type === 'multi-select') return [];
  if (field.type === 'number' || field.type === 'port') return null;
  return '';
}

export default defineComponent({
  name: 'ConfigForm',
  props: {
    schema: { type: Array, default: () => [] },
    modelValue: { type: Object, default: () => ({}) },
    formKey: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const form = ref({});
    const showAdvanced = ref(false);
    const fieldErrors = ref({});

    function initForm() {
      const next = {};
      for (const field of props.schema) {
        next[field.key] = props.modelValue?.[field.key] !== undefined
          ? JSON.parse(JSON.stringify(props.modelValue[field.key]))
          : defaultValue(field);
      }
      form.value = next;
    }

    watch(() => props.modelValue, initForm, { immediate: true, deep: true });

    watch(form, (val) => {
      // Merge current form fields back into the parent model so fields from
      // other tabs/schema groups are not lost.
      const merged = { ...JSON.parse(JSON.stringify(props.modelValue || {})), ...JSON.parse(JSON.stringify(val)) };
      emit('update:modelValue', merged);
    }, { deep: true });

    const basicFields = computed(() => props.schema.filter(s => !s.advanced));
    const advancedFields = computed(() => props.schema.filter(s => s.advanced));

    function validateOne(field) {
      fieldErrors.value[field.key] = validateField(form.value[field.key], field);
      return !fieldErrors.value[field.key];
    }

    function validate() {
      const errors = [];
      fieldErrors.value = {};
      for (const field of props.schema) {
        const msg = validateField(form.value[field.key], field);
        if (msg) {
          fieldErrors.value[field.key] = msg;
          errors.push(`${field.title}: ${msg}`);
        }
      }
      return errors;
    }

    expose({ validate });

    function inputType(field) {
      if (field.type === 'password') return 'password';
      if (field.type === 'number' || field.type === 'port') return 'number';
      return 'text';
    }

    function hintText(field) {
      const parts = [];
      if (field.help) parts.push(field.help);
      if (field.default !== undefined) parts.push(`默认值：${field.default}`);
      return parts.join('；');
    }

    function advancedStorageKey() {
      return props.formKey ? `vyos_advanced_${props.formKey}` : '';
    }

    if (props.formKey) {
      showAdvanced.value = localStorage.getItem(advancedStorageKey()) === 'true';
    }

    watch(showAdvanced, (val) => {
      if (props.formKey) localStorage.setItem(advancedStorageKey(), val ? 'true' : 'false');
    });

    function fieldDisabled(field) {
      if (props.disabled) return true;
      return !!field.disabled;
    }

    return {
      form, showAdvanced, basicFields, advancedFields, fieldErrors,
      validate, validateOne, inputType, hintText, fieldDisabled,
    };
  },
  template: `
    <div class="config-form">
      <div class="form-row" v-for="field in basicFields" :key="field.key">
        <label class="form-label">{{ field.title }}</label>
        <div class="form-control">
          <select v-if="field.type === 'select'" v-model="form[field.key]" :disabled="fieldDisabled(field)">
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <div v-else-if="field.type === 'multi-select'" class="checkbox-group">
            <label v-for="opt in field.options" :key="opt" class="checkbox-item">
              <input type="checkbox" :value="opt" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
              <span>{{ opt }}</span>
            </label>
          </div>
          <div v-else-if="field.type === 'radio'" class="radio-group">
            <label v-for="opt in field.options" :key="opt" class="radio-item">
              <input type="radio" :value="opt" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
              <span>{{ opt }}</span>
            </label>
          </div>
          <label v-else-if="field.type === 'checkbox'" class="checkbox-item">
            <input type="checkbox" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
            <span>{{ field.label || field.title }}</span>
          </label>
          <textarea v-else-if="field.type === 'textarea'" v-model="form[field.key]" :placeholder="field.placeholder" :rows="field.rows || 3" :disabled="fieldDisabled(field)" />
          <input v-else :type="inputType(field)" v-model="form[field.key]" :placeholder="field.placeholder" @blur="validateOne(field)" :disabled="fieldDisabled(field)" />
          <div v-if="fieldErrors[field.key]" class="form-error">{{ fieldErrors[field.key] }}</div>
          <div v-else-if="hintText(field)" class="form-hint">{{ hintText(field) }}</div>
        </div>
      </div>
      <div class="advanced-section" v-if="advancedFields.length">
        <div class="advanced-title" @click="showAdvanced = !showAdvanced">
          <span>{{ showAdvanced ? '▼' : '▶' }}</span>
          <span>高级选项</span>
        </div>
        <div class="advanced-content" v-show="showAdvanced">
          <div class="form-row" v-for="field in advancedFields" :key="field.key">
            <label class="form-label">{{ field.title }}</label>
            <div class="form-control">
              <select v-if="field.type === 'select'" v-model="form[field.key]" :disabled="fieldDisabled(field)">
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <div v-else-if="field.type === 'multi-select'" class="checkbox-group">
                <label v-for="opt in field.options" :key="opt" class="checkbox-item">
                  <input type="checkbox" :value="opt" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
                  <span>{{ opt }}</span>
                </label>
              </div>
              <div v-else-if="field.type === 'radio'" class="radio-group">
                <label v-for="opt in field.options" :key="opt" class="radio-item">
                  <input type="radio" :value="opt" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
                  <span>{{ opt }}</span>
                </label>
              </div>
              <label v-else-if="field.type === 'checkbox'" class="checkbox-item">
                <input type="checkbox" v-model="form[field.key]" :disabled="fieldDisabled(field)" />
                <span>{{ field.label || field.title }}</span>
              </label>
              <textarea v-else-if="field.type === 'textarea'" v-model="form[field.key]" :placeholder="field.placeholder" :rows="field.rows || 3" :disabled="fieldDisabled(field)" />
              <input v-else :type="inputType(field)" v-model="form[field.key]" :placeholder="field.placeholder" @blur="validateOne(field)" :disabled="fieldDisabled(field)" />
              <div v-if="fieldErrors[field.key]" class="form-error">{{ fieldErrors[field.key] }}</div>
              <div v-else-if="hintText(field)" class="form-hint">{{ hintText(field) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
});
