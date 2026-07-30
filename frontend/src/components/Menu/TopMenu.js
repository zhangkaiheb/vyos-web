import { defineComponent, ref, computed, h, onMounted, onUnmounted } from '/src/utils/vue-import.js';
import { useRoute, useRouter } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { useNotificationStore } from '/src/stores/notifications.js';
import { emitMenuRefresh } from '/src/utils/eventBus.js';

const CLOSE_DELAY = 600;

function renderSubmenu(items, state, keepParentOpen, clearParent, setOpen, clearOpen, toggleOpen, closeAll, router, route, level = 0, fixedStyle = null) {
  const style = fixedStyle || undefined;
  return h('div', {
    class: 'top-submenu',
    style,
    onMouseenter: keepParentOpen,
    onMouseleave: clearParent,
  }, items.map(item => {
    const hasChildren = item.children?.length;
    const isActive = item.route && (route.path === item.route || route.path.startsWith(item.route + '/'));
    const isOpen = state.openId === item.id && hasChildren;
    return h('div', {
      class: ['top-submenu-item', { active: isActive }],
      onMouseenter: () => {
        if (hasChildren || level === 0) {
          setOpen(item.id);
        } else {
          keepParentOpen();
        }
      },
      onMouseleave: clearOpen,
    }, [
      item.route && !hasChildren
        ? h('a', {
            class: 'menu-leaf',
            href: 'javascript:;',
            onClick: (e) => {
              e.stopPropagation();
              if (route.path === item.route) {
                emitMenuRefresh(route.path);
              } else {
                router.push(item.route);
              }
              closeAll();
            }
          }, item.label)
        : h('span', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            onClick: (e) => { e.stopPropagation(); if (hasChildren) toggleOpen(item.id); }
          }, [
            item.label,
            hasChildren ? h('span', { class: 'arrow' }, '▸') : null
          ]),
      isOpen ? renderSubmenu(item.children, state, () => setOpen(item.id), clearOpen, setOpen, clearOpen, toggleOpen, closeAll, router, route, level + 1) : null,
    ]);
  }));
}

export default defineComponent({
  name: 'TopMenu',
  setup() {
    const auth = useAuthStore();
    const notifications = useNotificationStore();
    const route = useRoute();
    const router = useRouter();
    const topItems = computed(() => auth.menu);
    const activeL1 = computed(() => {
      const target = route.path;
      function findL1(items) {
        for (const item of items) {
          if (item.route && (target === item.route || target.startsWith(item.route + '/'))) {
            return item.id;
          }
          if (item.children) {
            const found = findL1(item.children);
            if (found) return item.id;
          }
        }
        return '';
      }
      return findL1(auth.menu);
    });

    const openL1 = ref(null);
    const openChild = ref({ openId: '' });
    let timer = null;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
    function closeAll() {
      clearTimer();
      openL1.value = null;
      openChild.value.openId = '';
    }
    function clearL1() {
      timer = setTimeout(() => { openL1.value = null; openChild.value.openId = ''; }, CLOSE_DELAY);
    }
    function setL1(id) {
      clearTimer();
      openL1.value = id;
    }
    function toggleL1(id) {
      clearTimer();
      if (openL1.value === id) {
        openL1.value = null;
        openChild.value.openId = '';
      } else {
        openL1.value = id;
        openChild.value.openId = '';
      }
    }
    function setChild(id) {
      clearTimer();
      openChild.value.openId = id;
    }
    function clearChild() {
      timer = setTimeout(() => { openChild.value.openId = ''; }, CLOSE_DELAY);
    }
    function toggleChild(id) {
      clearTimer();
      openChild.value.openId = openChild.value.openId === id ? '' : id;
    }

    function logout() {
      auth.logout();
    }

    const userMenuOpen = ref(false);
    function toggleUserMenu(e) {
      e.stopPropagation();
      userMenuOpen.value = !userMenuOpen.value;
    }
    function closeUserMenu() {
      userMenuOpen.value = false;
    }

    const notificationOpen = ref(false);
    function toggleNotification(e) {
      e.stopPropagation();
      notificationOpen.value = !notificationOpen.value;
      if (notificationOpen.value) {
        notifications.fetchNotifications();
      }
    }
    function closeNotification() {
      notificationOpen.value = false;
    }
    async function onNotificationClick(item, e) {
      e.stopPropagation();
      if (!item.read) {
        await notifications.markRead(item.id);
      }
    }
    async function onNotificationDelete(item, e) {
      e.stopPropagation();
      await notifications.deleteNotification(item.id);
    }
    async function onMarkAllRead(e) {
      e.stopPropagation();
      await notifications.markAllRead();
    }

    let notificationInterval = null;
    function startNotificationPolling() {
      notifications.fetchUnreadCount();
      notificationInterval = setInterval(() => {
        notifications.fetchUnreadCount();
      }, 30000);
    }
    function stopNotificationPolling() {
      if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
      }
    }

    function onDocumentClick(e) {
      const menuEl = document.querySelector('.top-menu-outer');
      if (menuEl && !menuEl.contains(e.target)) {
        closeAll();
      }
      const userMenuEl = document.querySelector('.user-menu');
      if (userMenuEl && !userMenuEl.contains(e.target)) {
        closeUserMenu();
      }
      const notificationEl = document.querySelector('.notification');
      if (notificationEl && !notificationEl.contains(e.target)) {
        closeNotification();
      }
    }

    onMounted(() => {
      document.addEventListener('click', onDocumentClick);
      startNotificationPolling();
    });
    onUnmounted(() => {
      document.removeEventListener('click', onDocumentClick);
      stopNotificationPolling();
    });

    const itemRefs = {};

    return () => {
      const openItem = openL1.value ? topItems.value.find(i => i.id === openL1.value) : null;
      const openItemEl = openL1.value ? itemRefs[openL1.value] : null;
      const openLeft = openItemEl ? openItemEl.getBoundingClientRect().left : 0;
      const fixedStyle = openItemEl
        ? { position: 'fixed', left: `${openLeft}px`, top: 'var(--header-height)' }
        : null;

      return h('div', { class: 'top-menu-outer' }, [
        h('nav', { class: 'top-menu' }, topItems.value.map(l1 => {
          const hasChildren = l1.children?.length;
          return h('div', {
            class: ['top-menu-item', { active: activeL1.value === l1.id }],
            ref: (el) => { if (el) itemRefs[l1.id] = el; },
            onMouseenter: () => setL1(l1.id),
            onMouseleave: clearL1,
            onClick: (e) => { e.stopPropagation(); if (hasChildren) toggleL1(l1.id); }
          }, [
            h('span', { style: { display: 'flex', alignItems: 'center', minWidth: 0 } }, [
              h('span', { class: 'top-menu-label' }, l1.label),
              hasChildren ? h('span', { class: 'arrow' }, '▾') : null
            ]),
          ]);
        })),
        (openItem && openItem.children?.length)
          ? renderSubmenu(openItem.children, openChild.value, () => setL1(openL1.value), clearL1, setChild, clearChild, toggleChild, closeAll, router, route, 0, fixedStyle)
          : null,
        h('div', { class: 'header-actions' }, [
          h('div', {
            class: ['notification', { open: notificationOpen.value }],
            title: '通知',
            onClick: toggleNotification,
          }, [
            h('span', { class: 'notification-icon' }, '🔔'),
            notifications.unreadCount > 0
              ? h('span', { class: 'notification-badge' }, notifications.unreadCount > 99 ? '99+' : notifications.unreadCount)
              : null,
            notificationOpen.value
              ? h('div', { class: 'notification-dropdown', onClick: (e) => e.stopPropagation() }, [
                  h('div', { class: 'notification-header' }, [
                    h('span', { class: 'notification-title' }, '报警信息'),
                    h('button', { class: 'notification-close', onClick: closeNotification }, '×'),
                  ]),
                  h('div', { class: 'notification-list' }, [
                    notifications.sortedNotifications.length === 0
                      ? h('div', { class: 'notification-empty' }, '暂无通知')
                      : notifications.sortedNotifications.map(item => h('div', {
                          key: item.id,
                          class: ['notification-item', { unread: !item.read }],
                          onClick: (e) => onNotificationClick(item, e),
                        }, [
                          h('span', { class: 'notification-dot' }, '⦿'),
                          h('div', { class: 'notification-content' }, [
                            h('div', { class: 'notification-time' }, notifications.formatTime(item.timestamp)),
                            h('div', { class: 'notification-text' }, item.title + (item.message ? `, ${item.message}` : '')),
                          ]),
                          h('button', {
                            class: 'notification-delete',
                            onClick: (e) => onNotificationDelete(item, e),
                          }, '×'),
                        ])),
                  ]),
                  notifications.unreadCount > 0
                    ? h('div', { class: 'notification-footer' }, [
                        h('button', { class: 'notification-mark-read', onClick: onMarkAllRead }, '全部已读'),
                      ])
                    : null,
                ])
              : null,
          ]),
          h('div', { class: ['user-menu', { open: userMenuOpen.value }] }, [
            h('button', {
              class: 'user-menu-trigger',
              type: 'button',
              onClick: toggleUserMenu,
            }, [
              h('span', null, auth.user?.username || ''),
              h('span', { class: 'user-menu-arrow' }, '▾'),
            ]),
            userMenuOpen.value
              ? h('div', { class: 'user-menu-dropdown' }, [
                  h('div', {
                    class: 'user-menu-item',
                    onClick: (e) => { e.stopPropagation(); logout(); closeUserMenu(); }
                  }, '注销')
                ])
              : null,
          ]),
        ])
      ]);
    };
  }
});
