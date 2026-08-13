import { defineComponent } from '/src/utils/vue-import.js';

const ICON_MAP = {
  create: '＋',
  edit: '✎',
  delete: '✕',
  move: '⇅',
  moveUp: '↑',
  moveDown: '↓',
  copy: '⧉',
  insert: '⊕',
  conflict: '⚠',
  validity: '✓',
  batch: '▤',
  refresh: '↻',
  search: '🔍',
  columnSetting: '☰',
  filter: '▦',
  save: '✓',
  cancel: '✕',
  confirm: '✓',
  login: '→',
  import: '↓',
  export: '↑',
  clearCounters: '✕',
  clear: '✕',
  execute: '▶',
  addWidget: '＋',
  checkUpdate: '↻',
  update: '⬆',
  rollback: '↶',
  changePassword: '🔑',
  diff: '▤',
  commit: '✓',
  discard: '✕',
};

export default defineComponent({
  name: 'ToolbarButton',
  props: {
    icon: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    primary: { type: Boolean, default: false },
    danger: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }) {
    function handleClick(e) {
      console.log('ToolbarButton click', props.icon, e);
      emit('click', e);
    }
    return { handleClick, ICON_MAP };
  },
  template: `
    <button
      type="button"
      class="toolbar-btn"
      :class="{ primary, danger }"
      :disabled="disabled"
      @click="handleClick">
      <span v-if="icon" class="toolbar-btn-icon">{{ ICON_MAP[icon] || icon }}</span>
      <span class="toolbar-btn-label"><slot /></span>
    </button>
  `,
});
