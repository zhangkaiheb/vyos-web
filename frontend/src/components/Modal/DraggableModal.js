import { defineComponent, ref, onMounted, onUnmounted, watch } from '/src/utils/vue-import.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'DraggableModal',
  props: {
    title: { type: String, default: '' },
    visible: { type: Boolean, default: false },
    width: { type: String, default: '600px' },
    modalClass: { type: String, default: '' },
  },
  emits: ['update:visible', 'close', 'confirm'],
  setup(props, { emit }) {
    const modalRef = ref(null);
    const dragging = ref(false);
    const startPos = ref({ x: 0, y: 0 });
    const translate = ref({ x: 0, y: 0 });

    function resetPosition() {
      translate.value = { x: 0, y: 0 };
    }

    watch(() => props.visible, (v) => {
      if (v) resetPosition();
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

    return { modalRef, close, confirm, onMouseDown, translate };
  },
  components: { ToolbarButton },
  template: `
    <div v-if="visible" class="modal-overlay" :class="modalClass">
      <div ref="modalRef" class="modal-container" :style="{ width, transform: 'translate(' + translate.x + 'px, ' + translate.y + 'px)' }" @mousedown="onMouseDown">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="modal-close" @click="close">×</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <ToolbarButton icon="cancel" @click="close">取消</ToolbarButton>
            <ToolbarButton icon="confirm" primary @click="confirm">确定</ToolbarButton>
          </slot>
        </div>
      </div>
    </div>
  `,
});
