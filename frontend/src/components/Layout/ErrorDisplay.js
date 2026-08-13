import { defineComponent, ref, computed, inject } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

export const errorState = ref(null);

export function showError(err) {
  if (err && typeof err === 'object') {
    errorState.value = {
      code: err.code || 'ERROR',
      message: err.message || err.error || String(err),
      detail: err.detail || err.stderr || '',
      suggestion: err.suggestion || '',
      trace: err.trace || '',
    };
  } else {
    errorState.value = {
      code: 'ERROR',
      message: String(err),
      detail: '',
      suggestion: '',
      trace: '',
    };
  }
}

export function clearError() {
  errorState.value = null;
}

export default defineComponent({
  name: 'ErrorDisplay',
  setup() {
    const { t } = inject('i18n');
    const visible = computed({
      get() { return !!errorState.value; },
      set(v) { if (!v) clearError(); }
    });
    const err = computed(() => errorState.value || {});
    return { visible, err, clearError, t };
  },
  template: `
    <DraggableModal v-model:visible="visible" :title="t('error.title')" modal-class="error-modal" @confirm="clearError">
      <div v-if="err.code" style="margin-bottom:8px;"><strong>{{ t('error.code') }}</strong>{{ err.code }}</div>
      <div v-if="err.message" style="margin-bottom:8px;"><strong>{{ t('error.message') }}</strong>{{ err.message }}</div>
      <div v-if="err.detail" style="margin-bottom:8px;">
        <strong>{{ t('error.detail') }}</strong>
        <pre style="white-space:pre-wrap;background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:12px;">{{ typeof err.detail === 'object' ? JSON.stringify(err.detail, null, 2) : err.detail }}</pre>
      </div>
      <div v-if="err.suggestion" style="margin-bottom:8px;color:#0066cc;"><strong>{{ t('error.suggestion') }}</strong>{{ err.suggestion }}</div>
      <div v-if="err.trace" style="margin-bottom:8px;">
        <strong>{{ t('error.trace') }}</strong>
        <pre style="white-space:pre-wrap;background:#f5f5f5;padding:8px;border:1px solid #ddd;font-size:11px;max-height:200px;overflow:auto;">{{ err.trace }}</pre>
      </div>
    </DraggableModal>
  `,
  components: { DraggableModal },
});
