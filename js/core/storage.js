/* CORE – thin localStorage wrapper (the persistence adapter). Every access is
   guarded so the app still works without persistence in private windows or
   when storage is blocked. Swapping the backend only touches this file. */
const Storage = (() => {
  const TASKS_KEY = 'focustime.tasks';
  const STATE_KEY = 'focustime.state';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable or full – ignore */
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  return {
    get: read,
    set: write,
    remove,
    loadTasks: () => {
      const tasks = read(TASKS_KEY, []);
      return Array.isArray(tasks) ? tasks : [];
    },
    saveTasks: (tasks) => write(TASKS_KEY, tasks),
    loadState: () => read(STATE_KEY, null),
    saveState: (state) => write(STATE_KEY, state),
  };
})();
