import { defineComponent, ref, watch, h, onMounted, inject, toRef } from '/src/utils/vue-import.js';
import { validateField } from '/src/utils/validators.js';
import { configApi } from '/src/api/index.js';
import DualListSelector from '/src/components/Form/DualListSelector.js';
import MatchTypeCards from '/src/components/Form/MatchTypeCards.js';
import DatePicker from '/src/components/Form/DatePicker.js';
import TimePicker from '/src/components/Form/TimePicker.js';

function defaultValue(field) {
  if (field.default !== undefined) return JSON.parse(JSON.stringify(field.default));
  if (field.type === 'checkbox') return false;
  if (field.type === 'multi-select' || field.type === 'dual-list') return [];
  if (field.type === 'number' || field.type === 'port') return null;
  if (field.type === 'group') return {};
  if (field.type === 'textarea' && field.multi) return [];
  if (field.type === 'select' && field.options && field.options.length) {
    const first = field.options[0];
    return typeof first === 'object' ? first.value : first;
  }
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
    editMode: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose, slots }) {
    const { t } = inject('i18n');
    const form = ref({});
    const advancedOpen = ref({ '': false });
    const fieldErrors = ref({});
    const suggestionsCache = ref({});
    const suggestionsVersion = ref(0);
    const activeTab = ref('');

    function suggestionKey(path, fieldKey) {
      // Must match loadSuggestions key format: [suggestionPath, ...path].join(' ') + '.' + fieldKey
      const allParts = props.suggestionPath ? [props.suggestionPath, ...path] : path;
      return allParts.join(' ') + '.' + fieldKey;
    }

    function getFormObj(path) {
      let obj = form.value;
      for (const p of path) {
        if (obj && obj[p] !== undefined) obj = obj[p];
        else return null;
      }
      return obj;
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
        suggestionsCache.value = Object.assign({}, suggestionsCache.value, { [key]: combined });
        suggestionsVersion.value++;
        // Auto-select first option if field value is empty and noAutoFill is not set
        const formObj = getFormObj(path);
        if (formObj && combined.length && (formObj[field.key] === undefined || formObj[field.key] === null) && !field.noAutoFill) {
          formObj[field.key] = combined[0];
        }
        return combined;
      } catch (e) {
        return field.suggestions || [];
      }
    }

    async function initForm() {
      const walk = (schema, model) => {
        const result = {};
        for (const field of schema) {
          if (field.type === 'tab') {
            const childResult = walk(field.children || [], model || {});
            Object.assign(result, childResult);
          } else {
            const modelVal = model?.[field.key];
            if (field.type === 'group') {
              result[field.key] = walk(field.children || [], modelVal || {});
            } else if (field.type === 'textarea' && field.multi) {
              result[field.key] = Array.isArray(modelVal)
                ? [...modelVal]
                : (modelVal !== undefined ? String(modelVal).split('\n').filter(Boolean) : []);
            } else if (field.type === 'checkbox' && field.valueless) {
              const val = modelVal !== undefined && modelVal !== false && modelVal !== null;
              result[field.key] = val;
            } else {
              result[field.key] = modelVal !== undefined ? JSON.parse(JSON.stringify(modelVal)) : defaultValue(field);
            }
          }
        }
        return result;
      };
      // Update form in place to preserve reactive references
      const newForm = walk(props.schema, props.modelValue);
      Object.keys(form.value).forEach(k => delete form.value[k]);
      Object.assign(form.value, newForm);
      // Preload suggestions after form data is initialized
      // Must match initForm's tab flattening: tab children are flattened to top level,
      // so we must skip tab-level keys when building paths
      const tasks = [];
      const collect = (schema, path, formObj, skipTopLevel) => {
        for (const field of schema) {
          if (field.type === 'tab') {
            // Tab children are flattened into parent level by initForm
            collect(field.children || [], path, formObj, true);
          } else if (field.type === 'group') {
            const newPath = skipTopLevel ? path : [...path, field.key];
            collect(field.children || [], newPath, formObj?.[field.key] || {}, false);
          } else if (field.dynamic) {
            tasks.push(loadSuggestions(path, field));
          }
        }
      };
      collect(props.schema, [], form.value, false);
      await Promise.all(tasks);
    }

    const modelValueRef = toRef(props, 'modelValue');
    watch(modelValueRef, initForm, { immediate: true });

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

    function fieldDisabled(field, formObj) {
      if (props.disabled) return true;
      // Disable rule number field in edit mode
      if (props.editMode && (field.key === 'rule' || field.key === 'id')) return true;
      if (field.disabledWhen && formObj) {
        for (const [key, val] of Object.entries(field.disabledWhen)) {
          const actual = formObj[key];
          const expectedValues = Array.isArray(val) ? val : [val];
          if (expectedValues.includes(actual)) return true;
        }
      }
      return !!field.disabled;
    }

    function errorKey(path, key) {
      return path.length ? `${path.join('.')}.${key}` : key;
    }

    function translateError(err) {
      if (!err) return '';
      if (typeof err === 'string') return err;
      if (err.key === 'errors._array') {
        return err.items.map(translateError).join(t('errors.separator'));
      }
      return t(err.key, err.params || {});
    }

    function validateOne(field, formObj, path) {
      const key = errorKey(path, field.key);
      const err = validateField(formObj[field.key], field);
      if (err) {
        fieldErrors.value[key] = translateError(err);
      } else {
        delete fieldErrors.value[key];
      }
      return !err;
    }

    function validateFields(schema, formObj, path, errors) {
      for (const field of schema) {
        if (field.type === 'tab') {
          // Tab children share the same flat form object
          validateFields(field.children || [], formObj, path, errors);
        } else if (field.type === 'group') {
          validateFields(field.children || [], formObj[field.key] || {}, [...path, field.key], errors);
        } else {
          const err = validateField(formObj[field.key], field);
          const key = errorKey(path, field.key);
          if (err) {
            const msg = translateError(err);
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
      if (field.help) {
        // translateField 已经将 field.help 翻译好了（不包含点号的是已翻译文本）
        // 如果仍包含点号，说明是翻译键未找到翻译，不显示
        if (typeof field.help === 'string' && !field.help.includes('.')) {
          parts.push(field.help);
        }
      }
      // number 类型根据 min/max 自动生成取值范围提示
      if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
        const min = field.min !== undefined ? field.min : '';
        const max = field.max !== undefined ? field.max : '';
        parts.push(`取值范围: ${min} - ${max}`);
      }
      // date/time 类型附加格式提示
      if (field.type === 'date') {
        parts.push('YYYY-MM-dd');
      } else if (field.type === 'time') {
        parts.push('HH:mm:ss');
      }
      if (field.default !== undefined) parts.push(`${t('form.defaultValue')}${field.default}`);
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
      const disabled = fieldDisabled(field, formObj);
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

    function translateTitle(title) {
      if (!title) return '';
      if (title.includes('.')) {
        return t(title);
      }
      return title;
    }

    function translateField(field) {
      if (!field || typeof field !== 'object') return field;
      const result = { ...field };
      if (result.placeholder && typeof result.placeholder === 'string' && result.placeholder.includes('.')) {
        const translated = t(result.placeholder);
        if (translated !== result.placeholder) result.placeholder = translated;
      }
      if (result.help && typeof result.help === 'string' && result.help.includes('.')) {
        const translated = t(result.help);
        // 只有翻译成功时才覆盖，否则保留原始翻译键让hintText判断隐藏
        if (translated !== result.help) result.help = translated;
      }
      if (result.title && typeof result.title === 'string' && result.title.includes('.')) {
        const translated = t(result.title);
        if (translated !== result.title) result.title = translated;
      }
      if (Array.isArray(result.options)) {
        result.options = result.options.map(opt => {
          if (typeof opt === 'object' && opt.label && typeof opt.label === 'string' && opt.label.includes('.')) {
            const translated = t(opt.label);
            return { ...opt, label: translated !== opt.label ? translated : opt.label };
          }
          return opt;
        });
      }
      if (Array.isArray(result.children)) {
        result.children = result.children.map(child => translateField(child));
      }
      // Also translate fields inside tabs array
      if (Array.isArray(result.tabs)) {
        result.tabs = result.tabs.map(tab => translateField(tab));
      }
      return result;
    }

    function renderInput(field, formObj, path) {
      const key = errorKey(path, field.key);
      const error = fieldErrors.value[key];
      const disabled = fieldDisabled(field, formObj);
      const children = [];

      if (field.type === 'select') {
        // For dynamic select fields, get options from suggestionsCache
        const sKey = suggestionKey(path, field.key);
        if (field.dynamic && !suggestionsCache.value[sKey]) {
          loadSuggestions(path, field);
        }
        const dynamicOpts = field.dynamic ? (suggestionsCache.value[sKey] || []) : [];
        const options = dynamicOpts.length > 0 
          ? dynamicOpts.map(o => ({ value: o, label: o }))
          : (field.options || []);
        const currentValue = formObj[field.key];
        // Always ensure current value is in options for edit mode
        if (currentValue != null && currentValue !== '' && !options.find(o => (typeof o === 'object' ? o.value : o) === currentValue)) {
          options.push({ value: currentValue, label: currentValue });
        }
        children.push(h('select', {
          value: currentValue != null ? currentValue : '',
          disabled,
          class: 'form-control',
          onChange: (e) => { formObj[field.key] = e.target.value; },
        }, options.map(opt => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
          return h('option', { key: optValue, value: optValue }, optLabel);
        })));
      } else if (field.type === 'multi-select') {
        children.push(h('div', { class: 'checkbox-group' }, (field.options || []).map(opt => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
          const checked = (formObj[field.key] || []).includes(optValue);
          return h('label', { key: optValue, class: 'checkbox-item' }, [
            h('input', {
              type: 'checkbox',
              value: optValue,
              checked,
              disabled,
              onChange: (e) => {
                if (e.target.checked) {
                  formObj[field.key].push(optValue);
                } else {
                  formObj[field.key] = formObj[field.key].filter(v => v !== optValue);
                }
              },
            }),
            h('span', {}, optLabel),
          ]);
        })));
      } else if (field.type === 'number-list') {
        // Merge consecutive numbers into ranges for display (e.g., 23,24,25 → "23-25")
        const mergeToRanges = (arr) => {
          if (!arr || arr.length === 0) return '';
          const nums = arr.map(s => parseInt(s)).filter(n => !isNaN(n)).sort((a, b) => a - b);
          const ranges = [];
          let start = nums[0], prev = nums[0];
          for (let i = 1; i < nums.length; i++) {
            if (nums[i] === prev + 1) {
              prev = nums[i];
            } else {
              ranges.push(start === prev ? String(start) : `${start}-${prev}`);
              start = prev = nums[i];
            }
          }
          ranges.push(start === prev ? String(start) : `${start}-${prev}`);
          return ranges.join('\n');
        };
        const listValue = mergeToRanges(formObj[field.key] || []);
        children.push(h('textarea', {
          defaultValue: listValue,
          placeholder: field.placeholder || '',
          disabled,
          class: 'form-control',
          rows: 3,
          onKeydown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const ta = e.target;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const val = ta.value;
              ta.value = val.substring(0, start) + '\n' + val.substring(end);
              ta.selectionStart = ta.selectionEnd = start + 1;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
          },
          onInput: (e) => {
            const lines = e.target.value.split('\n').map(s => s.trim()).filter(s => s !== '');
            const expanded = [];
            for (const line of lines) {
              const rangeMatch = line.match(/^(\d+)-(\d+)$/);
              if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                for (let i = start; i <= end; i++) {
                  expanded.push(String(i));
                }
              } else {
                expanded.push(line);
              }
            }
            formObj[field.key] = expanded;
          },
        }));
      } else if (field.type === 'dual-list') {
        children.push(h(DualListSelector, {
          modelValue: formObj[field.key] || [],
          'onUpdate:modelValue': (val) => { formObj[field.key] = val; },
          options: field.options || [],
          disabled,
          titleLeft: field.titleLeft || t('form.optional'),
          titleRight: field.titleRight || t('form.selected'),
        }));
      } else if (field.type === 'table') {
        // Table field type for complex nested data
        const tableData = formObj[field.key] || [];
        const columns = field.columns || [];
        const tableActions = [
          {
            label: t('common.add'),
            onClick: () => {
              const newRow = {};
              columns.forEach(col => {
                if (col.default !== undefined) newRow[col.key] = col.default;
              });
              tableData.push(newRow);
            }
          }
        ];
        children.push(h('div', { class: 'form-table-container' }, [
          h('div', { class: 'form-table-actions', style: 'margin-bottom: 8px;' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-sm btn-primary',
              onClick: () => {
                const newRow = {};
                columns.forEach(col => {
                  if (col.default !== undefined) newRow[col.key] = col.default;
                });
                tableData.push(newRow);
              }
            }, t('common.add'))
          ]),
          h('table', { class: 'form-table', style: 'width: 100%; border-collapse: collapse;' }, [
            h('thead', {}, [
              h('tr', {}, columns.map(col => h('th', { 
                key: col.key,
                style: 'border: 1px solid #ddd; padding: 8px; text-align: left; background: #f5f5f5;'
              }, col.title || col.key)))
            ]),
            h('tbody', {}, tableData.map((row, idx) => h('tr', { key: idx }, [
              ...columns.map(col => h('td', { 
                key: col.key,
                style: 'border: 1px solid #ddd; padding: 4px;'
              }, [
                col.type === 'checkbox' 
                  ? h('input', {
                      type: 'checkbox',
                      checked: !!row[col.key],
                      onChange: (e) => { row[col.key] = e.target.checked; }
                    })
                  : col.type === 'select'
                  ? h('select', {
                      value: row[col.key] || '',
                      onChange: (e) => { row[col.key] = e.target.value; },
                      style: 'width: 100%; padding: 4px;'
                    }, (col.options || []).map(opt => {
                      const optValue = typeof opt === 'object' ? opt.value : opt;
                      const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
                      return h('option', { key: optValue, value: optValue }, optLabel);
                    }))
                  : h('input', {
                      type: col.type === 'number' ? 'number' : 'text',
                      value: row[col.key] || '',
                      placeholder: col.placeholder || '',
                      min: col.min,
                      max: col.max,
                      onChange: (e) => { row[col.key] = col.type === 'number' ? parseInt(e.target.value) : e.target.value; },
                      style: 'width: 100%; padding: 4px;'
                    })
              ])),
              h('td', { style: 'border: 1px solid #ddd; padding: 4px; text-align: center;' }, [
                h('button', {
                  type: 'button',
                  class: 'btn btn-sm btn-danger',
                  onClick: () => { tableData.splice(idx, 1); }
                }, t('common.delete'))
              ])
            ])))
          ])
        ]));
      } else if (field.type === 'radio') {
        children.push(h('div', { class: 'radio-cards' }, (field.options || []).map(opt => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
          const isSelected = formObj[field.key] === optValue;
          return h('div', {
            key: optValue,
            class: ['radio-card', isSelected ? 'radio-card-selected' : ''].filter(Boolean).join(' '),
            onClick: () => { if (!disabled) formObj[field.key] = optValue; },
          }, [
            h('input', {
              type: 'radio',
              name: field.key,
              value: optValue,
              checked: isSelected,
              disabled,
              style: { display: 'none' },
            }),
            h('span', {}, optLabel),
          ]);
        })));
      } else if (field.type === 'tri-state') {
        // Tri-state selector: dropdown with empty / Set / Not
        const currentValue = formObj[field.key] || '';
        const options = field.options || [
          { value: '', label: '' },
          { value: 'set', label: 'Set' },
          { value: 'not', label: 'Not' },
        ];
        const emptyOpt = options.find(opt => !opt.value);
        const emptyLabel = emptyOpt ? (emptyOpt.label || '') : '';
        children.push(h('select', {
          class: 'form-control',
          value: currentValue,
          disabled,
          onChange: (e) => { formObj[field.key] = e.target.value; },
        }, [
          h('option', { value: '' }, emptyLabel),
          ...options.filter(opt => opt.value).map(opt =>
            h('option', { value: opt.value }, opt.label)
          ),
        ]));
      } else if (field.type === 'checkbox') {
        children.push(h('input', {
          type: 'checkbox',
          checked: !!formObj[field.key],
          disabled,
          onChange: (e) => { formObj[field.key] = e.target.checked; },
        }));
      } else if (field.type === 'date') {
        children.push(h(DatePicker, {
          modelValue: formObj[field.key] ?? '',
          placeholder: field.placeholder || 'YYYY-MM-dd',
          disabled: disabled,
          'onUpdate:modelValue': (val) => { formObj[field.key] = val; },
        }));
        // 不再单独添加YYYY-MM-DD提示，使用hintText统一处理
      } else if (field.type === 'time') {
        children.push(h(TimePicker, {
          modelValue: formObj[field.key] ?? '',
          placeholder: field.placeholder || 'HH:mm:ss',
          disabled: disabled,
          'onUpdate:modelValue': (val) => { formObj[field.key] = val; },
        }));
        // 不再单独添加HH:mm:ss提示，使用hintText统一处理
      } else if (field.type === 'multiselect') {
        const selected = formObj[field.key] || [];
        children.push(h('div', { class: 'checkbox-group' }, (field.options || []).map(opt => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
          const checked = selected.includes(optValue);
          return h('label', { key: optValue, class: 'checkbox-item' }, [
            h('input', {
              type: 'checkbox',
              value: optValue,
              checked,
              disabled,
              onChange: (e) => {
                if (e.target.checked) {
                  formObj[field.key] = [...selected, optValue];
                } else {
                  formObj[field.key] = selected.filter(v => v !== optValue);
                }
              },
            }),
            h('span', {}, optLabel),
          ]);
        })));
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
      // Support showWhen: hide field if condition not met
      if (field.showWhen) {
        if (Array.isArray(field.showWhen)) {
          // and conditions: all must match
          for (const cond of field.showWhen) {
            const actual = formObj[cond.key];
            const expected = cond.val;
            // Treat undefined as false for boolean fields
            if (!actual && expected) return null;
            if (actual && !expected) return null;
          }
        } else {
          // object format: single condition (value can be array for multi-value match)
          for (const [key, val] of Object.entries(field.showWhen)) {
            const actual = formObj[key];
            const expectedValues = Array.isArray(val) ? val : [val];
            if (!expectedValues.includes(actual)) return null;
          }
        }
      }
      if (field.type === 'tab') {
        return null;
      }
      if (field.type === 'group') {
        const groupClass = level > 0 ? 'form-group nested-group' : 'form-group';
        const contentClass = field.horizontal ? 'form-group-content form-group-content-horizontal' : 'form-group-content';
        const groupModel = formObj[field.key] || {};
        const groupChildren = [];
        groupChildren.push(h('div', { class: 'form-group-title' }, translateTitle(field.title)));
        groupChildren.push(h('div', { class: contentClass }, renderFields(field.children || [], groupModel, [...path, field.key], level + 1)));
        return h('div', { class: groupClass }, groupChildren);
      }
      if (field.type === 'checkbox') {
        return h('div', { class: 'form-row' }, [
          h('label', { class: 'form-label' }, translateTitle(field.title)),
          renderInput(field, formObj, path),
        ]);
      }
      // dynamicValue: text input when dependsOn value is 'address', select dropdown otherwise
      if (field.type === 'dynamicValue') {
        const dependsKey = field.dependsOn;
        const currentType = formObj[dependsKey] || 'address';
        const isAddress = currentType === 'address';
        const groupOptsMap = field.groupOptionsMap || {};
        const selectOptions = isAddress ? [] : (groupOptsMap[currentType] || []).map(v => ({ value: v, label: v }));

        const inputChildren = [];
        inputChildren.push(isAddress
          ? h('input', {
              type: 'text',
              class: 'form-input',
              placeholder: field.placeholder || '',
              value: formObj[field.key] || '',
              disabled: props.disabled,
              onInput: (e) => { formObj[field.key] = e.target.value; },
            })
          : h('select', {
              class: 'form-control',
              value: formObj[field.key] || '',
              disabled: props.disabled,
              onChange: (e) => { formObj[field.key] = e.target.value; },
            }, [
              h('option', { value: '' }, t('form.pleaseSelect')),
              ...selectOptions.map(opt => h('option', { value: opt.value }, opt.label)),
            ]));
        if (hintText(field)) {
          inputChildren.push(h('div', { class: 'form-hint' }, hintText(field)));
        }

        return h('div', { class: 'form-row' }, [
          h('label', { class: 'form-label' }, translateTitle(field.title)),
          h('div', { class: 'form-control' }, inputChildren),
        ]);
      }
      return h('div', { class: 'form-row' }, [
        h('label', { class: 'form-label' }, translateTitle(field.title)),
        renderInput(field, formObj, path),
      ]);
    }

    function renderFields(schema, formObj, path, level) {
      // 先翻译所有字段
      const translatedSchema = schema.map(f => translateField(f));
      const basic = translatedSchema.filter(f => !f.advanced);
      const advanced = translatedSchema.filter(f => f.advanced);
      if (props.showAdvanced) {
        return translatedSchema.map(f => renderField(f, formObj, path, level)).filter(Boolean);
      }
      const nodes = basic.map(f => renderField(f, formObj, path, level)).filter(Boolean);
      if (advanced.length) {
        const open = isAdvancedOpen(path);
        nodes.push(h('div', { class: 'advanced-section' }, [
          h('div', { class: 'advanced-title', onClick: () => toggleAdvanced(path) }, [
            h('span', {}, open ? '▼' : '▶'),
            h('span', {}, t('form.advanced')),
          ]),
          h('div', { class: 'advanced-content', style: { display: open ? 'block' : 'none' } }, advanced.map(f => renderField(f, formObj, path, level))),
        ]));
      }
      return nodes;
    }

    function renderTabs(schema, formObj, path, level) {
      const tabs = schema.filter(f => f.type === 'tab');
      const nonTabs = schema.filter(f => f.type !== 'tab');

      if (!tabs.length) {
        return renderFields(schema, formObj, path, level);
      }

      // Reset activeTab if current tab doesn't exist in new schema
      if (!tabs.find(t => t.key === activeTab.value)) {
        activeTab.value = tabs[0].key;
      } else if (!activeTab.value && tabs.length) {
        activeTab.value = tabs[0].key;
      }

      const tabNodes = [];

      // Render non-tab fields first
      if (nonTabs.length) {
        tabNodes.push(...renderFields(nonTabs, formObj, path, level));
      }

      // Tab bar
      tabNodes.push(h('div', { class: 'form-tabs' }, tabs.map(tab =>
        h('div', {
          key: tab.key,
          class: ['form-tab', activeTab.value === tab.key ? 'form-tab-active' : ''].filter(Boolean).join(' '),
          onClick: () => { activeTab.value = tab.key; },
        }, translateTitle(tab.title))
      )));

      // Tab content - check for named slot first
      const activeTabSchema = tabs.find(t => t.key === activeTab.value);
      if (activeTabSchema) {
        const slotContent = slots?.[activeTabSchema.key];
        if (slotContent) {
          tabNodes.push(h('div', { class: 'form-tab-content' }, slotContent(formObj)));
        } else {
          tabNodes.push(h('div', { class: 'form-tab-content' }, renderFields(activeTabSchema.children || [], formObj, path, level)));
        }
      }

      return tabNodes;
    }

    return () => {
      // Read suggestionsVersion to establish reactive dependency on cache updates
      void suggestionsVersion.value;
      return h('div', { class: 'config-form' }, renderTabs(props.schema, form.value, [], 0));
    };
  },
});
