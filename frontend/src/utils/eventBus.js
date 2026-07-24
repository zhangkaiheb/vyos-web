const bus = new EventTarget();

export function emitMenuRefresh(route) {
  bus.dispatchEvent(new CustomEvent('menu-refresh', { detail: { route } }));
}

export function onMenuRefresh(callback) {
  bus.addEventListener('menu-refresh', callback);
}

export function offMenuRefresh(callback) {
  bus.removeEventListener('menu-refresh', callback);
}
