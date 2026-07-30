import { ref, computed } from '/src/utils/vue-import.js';
import { defineStore } from '/src/stores/pinia.js';
import { notificationApi } from '/src/api/index.js';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => {
      const ta = a.timestamp || '';
      const tb = b.timestamp || '';
      return tb.localeCompare(ta);
    });
  });

  async function fetchNotifications(limit = 100) {
    loading.value = true;
    try {
      const res = await notificationApi.list(limit);
      notifications.value = res.notifications || [];
    } catch (e) {
      notifications.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await notificationApi.unreadCount();
      unreadCount.value = res.count || 0;
    } catch (e) {
      unreadCount.value = 0;
    }
  }

  async function markRead(id) {
    await notificationApi.markRead(id);
    const item = notifications.value.find(n => n.id === id);
    if (item) item.read = true;
    await fetchUnreadCount();
  }

  async function markAllRead() {
    await notificationApi.markAllRead();
    notifications.value.forEach(n => { n.read = true; });
    unreadCount.value = 0;
  }

  async function deleteNotification(id) {
    await notificationApi.delete(id);
    notifications.value = notifications.value.filter(n => n.id !== id);
    await fetchUnreadCount();
  }

  async function deleteRead() {
    await notificationApi.deleteRead();
    notifications.value = notifications.value.filter(n => !n.read);
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace(/\//g, '-');
    } catch (e) {
      return iso;
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    sortedNotifications,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    deleteRead,
    formatTime,
  };
});
