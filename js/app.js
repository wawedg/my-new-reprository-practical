/* CONTROLLER / composition root – the only module that knows every other one.
   It wires views to models, owns the cross-cutting "active task" selection,
   reacts to timer events (credit a pomodoro, alert the user) and saves state.
   Load order (see index.html): config → storage → models → services → views → app. */
(() => {
  const $ = (id) => document.getElementById(id);

  const taskEls = {
    activeList: $('active-list'),
    completedList: $('completed-list'),
    activeEmpty: $('active-empty'),
    completedEmpty: $('completed-empty'),
    activeCount: $('active-count'),
    completedCount: $('completed-count'),
  };
  const form = $('task-form');
  const input = $('task-input');
  const formError = $('task-error');
  const sortSelect = $('task-sort');
  const searchBtn = $('search-btn');
  const emptyText = {
    active: taskEls.activeEmpty.textContent,
    completed: taskEls.completedEmpty.textContent,
  };

  /* Which task the current pomodoro counts towards. Lives here because it
     links the two models (Timer and TaskStore) without coupling them. */
  let activeTaskId = null;

  /* How both task lists are ordered ('created' or 'alpha'); remembered across visits. */
  let sortOrder = TaskStore.SORT_ORDERS.includes(Storage.loadSort()) ? Storage.loadSort() : 'created';

  /* Text the task lists are filtered by; '' means no search is applied. */
  let searchQuery = '';

  /* ---------- Persistence ---------- */

  function saveState() {
    Storage.saveState({ ...Timer.getState(), activeTaskId });
  }

  /* ---------- Rendering ---------- */

  function renderTimer() {
    const task = activeTaskId && TaskStore.get(activeTaskId);
    TimerView.render({
      mode: Timer.getState().mode,
      running: Timer.isRunning(),
      fresh: Timer.isFresh(),
      cyclePosition: Timer.cyclePosition(),
      cycleLength: Timer.LONG_EVERY,
      taskTitle: task ? task.title : null,
    });
  }

  function renderTasks() {
    TaskView.render(
      taskEls,
      {
        open: TaskStore.sort(TaskStore.search(TaskStore.active(), searchQuery), sortOrder),
        done: TaskStore.sort(TaskStore.search(TaskStore.completed(), searchQuery), sortOrder),
      },
      activeTaskId,
      taskHandlers,
      { locked: Timer.isRunning() }
    );
    const noMatch = searchQuery ? 'No tasks match your search.' : null;
    taskEls.activeEmpty.textContent = noMatch || emptyText.active;
    taskEls.completedEmpty.textContent = noMatch || emptyText.completed;
  }

  /* ---------- Search ---------- */

  function setSearch(query) {
    searchQuery = query;
    const searching = Boolean(query);
    searchBtn.textContent = searching ? 'Clear' : 'Search';
    searchBtn.setAttribute('aria-pressed', String(searching));
    searchBtn.title = searching ? `Clear the search for "${query}"` : 'Show only tasks containing the typed text';
    renderTasks();
  }

  searchBtn.addEventListener('click', () => {
    if (searchQuery) {
      input.value = '';
      setSearch('');
      Notifier.announce('Search cleared');
      input.focus();
      return;
    }
    const query = input.value.trim();
    if (!query) {
      alert('Please type something to search for.');
      input.focus();
      return;
    }
    formError.hidden = true;
    setSearch(query);
  });

  function renderAll() {
    renderTasks();
    renderTimer();
  }

  /* ---------- Timer events (Model → Controller) ---------- */

  function onTick(remainingMs) {
    const { mode } = Timer.getState();
    TimerView.renderTime({
      remainingMs,
      durationMs: Timer.duration(),
      label: Timer.LABELS[mode],
      running: Timer.isRunning(),
      paused: !Timer.isRunning() && !Timer.isFresh(),
    });
  }

  function onTimerChange() {
    // Task rows depend on the running state too (editing is locked while running).
    renderAll();
    saveState();
  }

  function onTimerComplete(finished, next, { restored }) {
    // A session that ended while the page was closed still counts, but a bell
    // or pop-up about it on page load would only be confusing.
    const alert = restored ? () => {} : Notifier.desktop;
    if (!restored) Notifier.bell();
    if (finished === 'focus') {
      if (activeTaskId && TaskStore.get(activeTaskId)) {
        TaskStore.addPomodoro(activeTaskId);
        renderTasks();
      }
      const breakName = `${Timer.LABELS[next].toLowerCase()} (${Config.MINUTES[next]} min)`;
      alert('Pomodoro complete! ⏳', `Time for a ${breakName}.`);
      Notifier.announce(`Pomodoro complete. Time for a ${breakName}.`);
    } else {
      alert('Break is over', 'Ready for the next pomodoro?');
      Notifier.announce('Break is over. Ready for the next pomodoro.');
    }
  }

  /* ---------- Timer actions (View → Controller → Model) ---------- */

  const timerHandlers = {
    onStartPause() {
      if (Timer.isRunning()) {
        Timer.pause();
      } else {
        Notifier.unlock();
        Timer.start();
      }
    },
    onReset() {
      Timer.reset();
    },
    onMode(mode) {
      if (mode === Timer.getState().mode) return;
      if (Timer.isRunning() && !confirm('The timer is running. Switch mode and reset it?')) return;
      Timer.setMode(mode);
    },
  };

  /* ---------- Task actions (View → Controller → Model) ---------- */

  const taskHandlers = {
    onToggle(id) {
      const task = TaskStore.toggleComplete(id);
      if (task && task.completed && activeTaskId === id) activeTaskId = null;
      renderAll();
      saveState();
    },
    /* Focus toggles: picking a task starts a focus session on it, clicking the
       already-focused task deselects it and pauses its running focus session. */
    onFocus(id) {
      const task = TaskStore.get(id);
      if (!task || task.completed) return;
      const { mode } = Timer.getState();

      if (activeTaskId === id) {
        activeTaskId = null;
        if (mode === 'focus' && Timer.isRunning()) Timer.pause();
        renderAll();
        saveState();
        Notifier.announce(`Stopped focusing on ${task.title}`);
        return;
      }

      activeTaskId = id;
      // A running session (focus or break) is left alone: switching task mid-
      // session just moves the credit, and a break is not cut short.
      if (!Timer.isRunning()) {
        if (mode !== 'focus') Timer.setMode('focus');
        Notifier.unlock();
        Timer.start();
      }
      renderAll();
      saveState();
      Notifier.announce(`Now focusing on ${task.title}`);
    },
    onRename(id, title) {
      if (Timer.isRunning()) {
        renderAll(); // discard the edit and restore the title
        return;
      }
      TaskStore.rename(id, title);
      renderAll();
    },
    onDelete(id) {
      const task = TaskStore.get(id);
      if (!task || !confirm(`Delete "${task.title}"?`)) return;
      TaskStore.remove(id);
      if (activeTaskId === id) activeTaskId = null;
      renderAll();
      saveState();
    },
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const task = TaskStore.add(input.value);
    if (!task) {
      formError.hidden = false;
      input.focus();
      return;
    }
    formError.hidden = true;
    input.value = '';
    // Drop any search so the new task is not hidden by the filter.
    if (searchQuery) setSearch('');
    // Make the first task the active one automatically.
    if (!activeTaskId) {
      activeTaskId = task.id;
      saveState();
    }
    renderAll();
  });

  input.addEventListener('input', () => (formError.hidden = true));

  sortSelect.value = sortOrder;
  sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    Storage.saveSort(sortOrder);
    renderTasks();
  });

  /* ---------- Boot ---------- */

  Notifier.init($('status'));
  TimerView.init(
    {
      card: $('timer-card'),
      modeTabs: document.querySelectorAll('.mode-tab'),
      time: $('time'),
      progress: $('progress-bar'),
      cycleInfo: $('cycle-info'),
      currentTask: $('current-task-name'),
      startBtn: $('start-btn'),
      resetBtn: $('reset-btn'),
    },
    timerHandlers
  );

  TaskStore.load();
  const saved = Storage.loadState();
  if (saved && saved.activeTaskId) {
    const t = TaskStore.get(saved.activeTaskId);
    if (t && !t.completed) activeTaskId = t.id;
  }
  // Timer.init emits a change, which renders the tasks as well.
  Timer.init(saved, { tick: onTick, change: onTimerChange, complete: onTimerComplete });
})();
