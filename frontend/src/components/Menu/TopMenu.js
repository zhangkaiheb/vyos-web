import { defineComponent, ref, computed, h, onMounted, onUnmounted } from '/src/utils/vue-import.js';
import { useRoute, useRouter } from '/src/utils/vue-router-import.js';
import { useAuthStore } from '/src/stores/auth.js';
import { locale } from '/src/i18n/index.js';

const CLOSE_DELAY = 600;

function renderSubmenu(items, state, keepParentOpen, clearParent, setOpen, clearOpen, toggleOpen, closeAll, router, route, level = 0) {
  return h('div', {
    class: 'top-submenu',
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
            href: 'javascript:;',
            onClick: (e) => { e.stopPropagation(); router.push(item.route); closeAll(); }
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

    function onDocumentClick(e) {
      const menuEl = document.querySelector('.top-menu-outer');
      if (menuEl && !menuEl.contains(e.target)) {
        closeAll();
      }
    }

    onMounted(() => {
      document.addEventListener('click', onDocumentClick);
    });
    onUnmounted(() => {
      document.removeEventListener('click', onDocumentClick);
    });

    function changeLanguage(e) {
      locale.value = e.target.value;
      localStorage.setItem('locale', locale.value);
    }
    function logout() {
      auth.logout();
    }

    return () => h('div', { class: 'top-menu-outer' }, [
      h('nav', { class: 'top-menu' }, topItems.value.map(l1 => {
        const hasChildren = l1.children?.length;
        return h('div', {
          class: ['top-menu-item', { active: activeL1.value === l1.id }],
          onMouseenter: () => setL1(l1.id),
          onMouseleave: clearL1,
          onClick: (e) => { e.stopPropagation(); if (hasChildren) toggleL1(l1.id); }
        }, [
          h('span', { style: { display: 'flex', alignItems: 'center' } }, [
            l1.label,
            hasChildren ? h('span', { class: 'arrow' }, '▾') : null
          ]),
          (openL1.value === l1.id && hasChildren)
            ? renderSubmenu(l1.children, openChild.value, () => setL1(l1.id), clearL1, setChild, clearChild, toggleChild, closeAll, router, route)
            : null,
        ]);
      })),
      h('div', { class: 'header-actions' }, [
        h('div', { class: 'notification', title: '通知' }, [
          h('span', null, '🔔'),
          h('span', { class: 'notification-badge' }, '0')
        ]),
        h('span', null, auth.user?.username || ''),
        h('select', { value: locale.value, onChange: changeLanguage }, [
          h('option', { value: 'zh-CN' }, '中文'),
          h('option', { value: 'en' }, 'English')
        ]),
        h('button', { onClick: logout }, '注销')
      ])
    ]);
  }
});
