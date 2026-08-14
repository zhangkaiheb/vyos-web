// Re-export Vue globals as ES modules for CDN-based Vue 3
export const {
  createApp,
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  provide,
  inject,
  defineComponent,
  h,
  resolveComponent,
  keepAlive,
  nextTick,
  toRaw,
  toRef,
  shallowRef,
  watchEffect,
} = window.Vue;

export default window.Vue;
