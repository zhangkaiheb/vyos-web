import { defineComponent, ref, watch, h, onMounted } from '/src/utils/vue-import.js';
import { validateField } from '/src/utils/validators.js';
import { configApi } from '/src/api/index.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';

function defaultValue(field) {
  if (field.default !== undefined) return JSON.parse(JSON.stringify(field.default));
  if (field.type === 'checkbox') return false;
  if (field.type === 'multi-select' || field.type === 'dual-list') return [];
  if (field.type === 'number' || field.type === 'port') return null;
  if (field.type === 'group') return {};
  if (field.type === 'textarea' && field.multi) return [];
  return '';
}

export default defineComponent({
  name: 'ConfigForm',
  props: {
    schema: { type: Array, default: () => [] },
    modelValue: { type: Object, default: () => ({}) },
    formKey: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    suggestionPath: { type: String, default: '' },
    showAdvanced: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const form = ref({});
    const advancedOpen = ref({ '': false });
    const fieldErrors = ref({});
    const suggestionsCache = ref({});

    function suggestionKey(path, key) {
      return path.length ? `${path.join('.')}.${key}` : key;
    }

    async function loadSuggestions(path, field) {
      const key = suggestionKey(path, field.key);
      if (suggestionsCache.value[key]) return suggestionsCache.value[key];
      if (!field.dynamic) return field.suggestions || [];
      const parentPath = [props.suggestionPath, ...path].filter(Boolean).join(' ');
      try {
        const res = await configApi.suggestions(parentPath, field.key);
        const list = res.suggestions || [];
        const staticSuggestions = field.suggestions || [];
        const combined = Array.from(new Set([...staticSuggestions, ...list]));
        suggestionsCache.value[key] = combined;
        return combined;
      } catch (e) {
        return field.suggestions || [];
      }
    }

    // Preload suggestions for dynamic fields on mount
    onMounted(async () => {
      const collect = (schema, path, formObj) => {
        for (const field of schema) {
          if (field.type === 'group') {
            collect(field.children || [], [...path, field.key], formObj?.[field.key] || {});
          } else if (field.dynamic) {
            loadSuggestions(path, field);
          }
        }
      };
      collect(props.schema, [], form.value);
    });

    function initForm() {
      const walk = (schema, model) => {
        const result = {};
        for (const field of schema) {
          const modelVal = model?.[field.key];
          if (field.type === 'group') {
            result[field.key] = walk(field.children || [], modelVal || {});
          } else if (field.type === 'textarea' && field.multi) {
            result[field.key] = Array.isArray(modelVal)
              ? [...modelVal]
              : (modelVal !== undefined ? String(modelVal).split('\n').filter(Boolean) : []);
          } else if (field.type === 'checkbox' && field.valueless) {
            // Treat node presence ({}, '', true) as checked; false/null/undefined as unchecked.
            const val = modelVal !== undefined && modelVal !== false && modelVal !== null;
            result[field.key] = val;
          } else {
            result[field.key] = modelVal !== undefined ? JSON.parse(JSON.stringify(modelVal)) : defaultValue(field);
          }
        }
        return result;
      };
      form.value = walk(props.schema, props.modelValue);
    }

    watch(() => props.modelValue, initForm, { immediate: true, deep: true });

    function deepMerge(target, source) {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]) ? target[key] : {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    function emitValue() {
      const next = JSON.parse(JSON.stringify(form.value));
      const current = JSON.parse(JSON.stringify(props.modelValue || {}));
      const merged = deepMerge(JSON.parse(JSON.stringify(current)), next);
      if (JSON.stringify(merged) !== JSON.stringify(current)) {
        emit('update:modelValue', merged);
      }
    }

    watch(form, emitValue, { deep: true });

    if (props.formKey) {
      advancedOpen.value[''] = localStorage.getItem(`vyos_advanced_${props.formKey}`) === 'true';
    }

    watch(advancedOpen, (val) => {
      if (props.formKey) {
        localStorage.setItem(`vyos_advanced_${props.formKey}`, val[''] ? 'true' : 'false');
      }
    }, { deep: true });

    function fieldDisabled(field) {
      if (props.disabled) return true;
      return !!field.disabled;
    }

    function errorKey(path, key) {
      return path.length ? `${path.join('.')}.${key}` : key;
    }

    function validateOne(field, formObj, path) {
      const key = errorKey(path, field.key);
      const msg = validateField(formObj[field.key], field);
      if (msg) {
        fieldErrors.value[key] = msg;
      } else {
        delete fieldErrors.value[key];
      }
      return !msg;
    }

    function validateFields(schema, formObj, path, errors) {
      for (const field of schema) {
        if (field.type === 'group') {
          validateFields(field.children || [], formObj[field.key] || {}, [...path, field.key], errors);
        } else {
          const msg = validateField(formObj[field.key], field);
          const key = errorKey(path, field.key);
          if (msg) {
            fieldErrors.value[key] = msg;
            errors.push(`${field.title}: ${msg}`);
          } else {
            delete fieldErrors.value[key];
          }
        }
      }
    }

    function validate() {
      const errors = [];
      fieldErrors.value = {};
      validateFields(props.schema, form.value, [], errors);
      return errors;
    }

    expose({ validate });

    function hintText(field) {
      const parts = [];
      if (field.help) parts.push(field.help);
      if (field.default !== undefined) parts.push(`默认值：${field.default}`);
      return parts.join('；');
    }

    function isAdvancedOpen(path) {
      return !!advancedOpen.value[path.join('.')];
    }

    function toggleAdvanced(path) {
      const key = path.join('.');
      advancedOpen.value[key] = !isAdvancedOpen(path);
    }

    function renderTextarea(field, formObj, path) {
      const key = errorKey(path, field.key);
      const error = fieldErrors.value[key];
      const disabled = fieldDisabled(field);
      const children = [];

      if (field.multi) {
        const value = Array.isArray(formObj[field.key]) ? formObj[field.key].join('\n') : String(formObj[field.key] || '');
        children.push(h('textarea', {
          value,
          placeholder: field.placeholder,
          rows: field.rows || 3,
          disabled,
          onInput: (e) => {
            formObj[field.key] = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
          },
        }));
      } else {
        children.push(h('textarea', {
          value: formObj[field.key] || '',
          placeholder: field.placeholder,
          rows: field.rows || 3,
          disabled,
          onInput: (e) => { formObj[field.key] = e.target.value; },
        }));
      }

      if (error) {
        children.push(h('div', { class: 'form-error' }, error));
      } else if (hintText(field)) {
        children.push(h('div', { class: 'form-hint' }, hintText(field)));
      }
      return h('div', { class: 'form-control' }, children);
    }

    function renderInput(field, formObj, path) {
      const key = errorKey(path, field.key);
      const error = fieldErrors.value[key];
      const disabled = fieldDisabled(field);
      const children = [];

      if (field.type === 'select') {
        children.push(h('select', {
          value: formObj[field.key] || '',
          disabled,
          onChange: (e) => { formObj[field.key] = e.target.value; },
        }, (field.options || []).map(opt => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
          return h('option', { key: optValue, value: optValue }, optLabel);
        })));
      } else if (field.type === 'multi-select') {
        children.push(h('div', { class: 'checkbox-group' }, (field.options || []).map(opt => {
          const checked = (formObj[field.key] || []).includes(opt);
          return h('label', { key: opt, class: 'checkbox-item' }, [
            h('input', {
              type: 'checkbox',
              value: opt,
              checked,
              disabled,
              onChange: (e) => {
                if (e.target.checked) {
                  formObj[field.key].push(opt);
                } else {
                  formObj[field.key] = formObj[field.key].filter(v => v !== opt);
                }
              },
            }),
            h('span', {}, opt),
          ]);
        })));
      } else if (field.type === 'dual-list') {
        children.push(h(DualListSelector, {
          modelValue: formObj[field.key] || [],
          'onUpdate:modelValue': (val) => { formObj[field.key] = val; },
          options: field.options || [],
          disabled,
          titleLeft: field.titleLeft || '可选',
          titleRight: field.titleRight || '已选',
        }));
      } else if (field.type === 'checkbox') {
        children.push(h('label', { class: 'checkbox-item' }, [
          h('input', {
            type: 'checkbox',
            checked: !!formObj[field.key],
            disabled,
            onChange: (e) => { formObj[field.key] = e.target.checked; },
          }),
          h('span', {}, field.label || field.title),
        ]));
      } else if (field.type === 'textarea') {
        return renderTextarea(field, formObj, path);
      } else {
        const inputType = field.type === 'number' || field.type === 'port' ? 'number' : 'text';
        const inputProps = {
          type: inputType,
          value: formObj[field.key] ?? '',
          placeholder: field.placeholder,
          disabled,
          onBlur: () => validateOne(field, formObj, path),
          onInput: (e) => { formObj[field.key] = e.target.value; },
        };
        if (field.min !== undefined) inputProps.min = field.min;
        if (field.max !== undefined) inputProps.max = field.max;
        const suggestions = suggestionsCache.value[key] || field.suggestions || [];
        if (field.dynamic) {
          inputProps.onFocus = () => loadSuggestions(path, field);
        }
        if (suggestions.length) {
          const listId = `suggestions-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
          inputProps.list = listId;
          children.push(h('datalist', { id: listId }, suggestions.map(s => h('option', { key: s, value: s }))));
        }
        children.push(h('input', inputProps));
      }

      if (error) {
        children.push(h('div', { class: 'form-error' }, error));
      } else if (hintText(field)) {
        children.push(h('div', { class: 'form-hint' }, hintText(field)));
      }
      return h('div', { class: 'form-control' }, children);
    }

    function renderField(field, formObj, path, level = 0) {
      if (field.type === 'group') {
        const groupClass = level > 0 ? 'form-group nested-group' : 'form-group';
        const groupModel = formObj[field.key] || {};
        return h('div', { class: groupClass }, [
          h('div', { class: 'form-group-title' }, field.title),
          h('div', { class: 'form-group-content' }, renderFields(field.children || [], groupModel, [...path, field.key], level + 1)),
        ]);
      }
      return h('div', { class: 'form-row' }, [
        h('label', { class: 'form-label' }, field.title),
        renderInput(field, formObj, path),
      ]);
    }

    function renderFields(schema, formObj, path, level) {
      const basic = schema.filter(f => !f.advanced);
      const advanced = schema.filter(f => f.advanced);
      if (props.showAdvanced) {
        return schema.map(f => renderField(f, formObj, path, level));
      }
      const nodes = basic.map(f => renderField(f, formObj, path, level));
      if (advanced.length) {
        const open = isAdvancedOpen(path);
        nodes.push(h('div', { class: 'advanced-section' }, [
          h('div', { class: 'advanced-title', onClick: () => toggleAdvanced(path) }, [
            h('span', {}, open ? '▼' : '▶'),
            h('span', {}, '高级选项'),
          ]),
          h('div', { class: 'advanced-content', style: { display: open ? 'block' : 'none' } }, advanced.map(f => renderField(f, formObj, path, level))),
        ]));
      }
      return nodes;
    }

    return () => h('div', { class: 'config-form' }, renderFields(props.schema, form.value, [], 0));
  },
});
