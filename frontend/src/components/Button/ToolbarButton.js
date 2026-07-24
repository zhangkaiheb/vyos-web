import { defineComponent, h } from '/src/utils/vue-import.js';

const ICON_MAP = {
  create: '＋',
  edit: '✎',
  delete: '✕',
  move: '⇄',
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
  setup(props, { slots }) {
    return () => h('button', {
      class: ['toolbar-btn', { primary: props.primary, danger: props.danger }],
      disabled: props.disabled,
      type: 'button',
    }, [
      props.icon ? h('span', { class: 'toolbar-btn-icon' }, ICON_MAP[props.icon] || props.icon) : null,
      h('span', { class: 'toolbar-btn-label' }, slots.default?.()),
    ]);
  },
});
