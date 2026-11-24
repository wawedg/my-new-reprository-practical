/* MODEL – task list domain logic: create, rename, complete, delete and
   count pomodoros. No DOM access; persists every change through Storage.
   Depends on: Storage, Config. */
const TaskStore = (() => {
  let tasks = [];

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const cleanTitle = (title) => String(title).trim().slice(0, Config.TASK_TITLE_MAX);

  function load() {
    tasks = Storage.loadTasks().filter(
      (t) => t && typeof t.id === 'string' && typeof t.title === 'string'
    );
  }

  function save() {
    Storage.saveTasks(tasks);
  }

  const all = () => tasks.slice();
  const active = () => tasks.filter((t) => !t.completed);
  const completed = () => tasks.filter((t) => t.completed);
  const get = (id) => tasks.find((t) => t.id === id) || null;

  function add(title) {
    const clean = cleanTitle(title);
    if (!clean) return null;
    const task = {
      id: uid(),
      title: clean,
      completed: false,
      pomodoros: 0,
      createdAt: Date.now(),
    };
    tasks.push(task);
    save();
    return task;
  }

  function rename(id, title) {
    const task = get(id);
    const clean = cleanTitle(title);
    if (!task || task.completed || !clean) return false;
    task.title = clean;
    save();
    return true;
  }

  function toggleComplete(id) {
    const task = get(id);
    if (!task) return null;
    task.completed = !task.completed;
    save();
    return task;
  }

  function remove(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
  }

  function addPomodoro(id) {
    const task = get(id);
    if (!task) return;
    task.pomodoros += 1;
    save();
  }

  /* Returns a sorted copy of `list` (never reorders the stored tasks).
     'alpha': lexicographic by title, case- and accent-insensitive, with
     creation time as the tie-breaker so equal titles keep a stable order.
     'created' (default): the order tasks were added. */
  const SORT_ORDERS = ['created', 'alpha'];
  const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
  const byTitle = (a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || byCreated(a, b);

  function sort(list, order) {
    const copy = list.slice();
    return order === 'alpha' ? copy.sort(byTitle) : copy;
  }

  return { load, all, active, completed, get, add, rename, toggleComplete, remove, addPomodoro, sort, SORT_ORDERS };
})();
