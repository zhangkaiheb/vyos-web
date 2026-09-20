import { defineComponent, ref, onUnmounted, watch, inject } from '/src/utils/vue-import.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'DraggableModal',
  props: {
    title: { type: String, default: '' },
    visible: { type: Boolean, default: false },
    width: { type: String, default: '600px' },
    modalClass: { type: String, default: '' },
    hideFooter: { type: Boolean, default: false },
    zIndex: { type: Number, default: null },
    headerIcon: { type: String, default: '' },
  },
  emits: ['update:visible', 'close', 'confirm'],
  setup(props, { emit }) {
    const { t } = inject('i18n');
    const modalRef = ref(null);
    const dragging = ref(false);
    const startPos = ref({ x: 0, y: 0 });
    const translate = ref({ x: 0, y: 0 });

    function resetPosition() {
      translate.value = { x: 0, y: 0 };
    }

    watch(() => props.visible, (v) => {
      if (v) {
        resetPosition();
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    });

    function onMouseDown(e) {
      if (!e.target.closest('.modal-header')) return;
      e.preventDefault();
      dragging.value = true;
      startPos.value = { x: e.clientX, y: e.clientY };
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
      if (!dragging.value) return;
      translate.value.x += e.clientX - startPos.value.x;
      translate.value.y += e.clientY - startPos.value.y;
      startPos.value = { x: e.clientX, y: e.clientY };
    }

    function onMouseUp() {
      dragging.value = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    function onOverlayClick(e) {
      if (e.target === e.currentTarget) {
        close();
      }
    }

    function close() {
      emit('update:visible', false);
      emit('close');
      resetPosition();
    }

    function confirm() {
      emit('confirm');
    }

    onUnmounted(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    });

    return { modalRef, close, confirm, onMouseDown, onOverlayClick, translate, t };
  },
  components: { ToolbarButton },
  template: `
    <div v-if="visible" class="modal-overlay" :class="modalClass" :style="zIndex !== null ? { zIndex } : {}" @mousedown.stop>
      <div ref="modalRef" class="modal-container" :style="{ width, transform: 'translate(' + translate.x + 'px, ' + translate.y + 'px)' }" @mousedown="onMouseDown" @click.stop>
        <div class="modal-header">
          <svg v-if="headerIcon" style="margin-right:4px;width:16px;height:16px;fill:#FF8C00;vertical-align:middle;position:relative;top:1px;" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          <slot name="header-prefix"></slot>
          <span class="modal-title">{{ title }}</span>
          <button class="modal-close" @click="close">×</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="!hideFooter" class="modal-footer">
          <slot name="footer">
            <ToolbarButton icon="cancel" @click="close">{{ t('modal.cancel') }}</ToolbarButton>
            <ToolbarButton icon="confirm" primary @click="confirm">{{ t('modal.confirm') }}</ToolbarButton>
          </slot>
        </div>
      </div>
    </div>
  `,
});
