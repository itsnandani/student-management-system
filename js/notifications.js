const Notifications = (() => {
  let items = DataStore.loadCollection("notifications", SAMPLE_NOTIFICATIONS);
  const all = () => items.map((item) => ({ ...item })).sort((a, b) => b.date.localeCompare(a.date));
  function add(type, title, message) {
    const item = { id: `NT-${Date.now()}`, type, title, message, date: new Date().toISOString(), read: false };
    items.unshift(item);
    DataStore.saveCollection("notifications", items);
    return item;
  }
  function markRead(id) { items = items.map((item) => item.id === id ? { ...item, read: true } : item); DataStore.saveCollection("notifications", items); }
  function markAllRead() { items = items.map((item) => ({ ...item, read: true })); DataStore.saveCollection("notifications", items); }
  function remove(id) { items = items.filter((item) => item.id !== id); DataStore.saveCollection("notifications", items); }
  function unreadCount() { return items.filter((item) => !item.read).length; }
  function reset() { items = [...SAMPLE_NOTIFICATIONS]; DataStore.saveCollection("notifications", items); }
  return { all, add, markRead, markAllRead, remove, unreadCount, reset };
})();
