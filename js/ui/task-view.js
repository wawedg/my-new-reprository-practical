/* VIEW – renders the task lists and turns clicks/keys into handler calls.
   Holds no task state of its own and never mutates tasks directly: every
   action goes back to the controller through the `handlers` object.
   Depends on: Config. */
const TaskView = (() => {
  function button(className, text, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = text;
    if (label) b.setAttribute('aria-label', label);
    return b;
  }

  function startEditing(li, task, onRename) {
    const titleEl = li.querySelector('.task-title');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit';
    input.value = task.title;
    input.maxLength = Config.TASK_TITLE_MAX;
    input.setAttribute('aria-label', 'Edit task title');
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      if (commit && input.value.trim() && input.value.trim() !== task.title) {
        onRename(task.id, input.value);
      } else {
        input.replaceWith(titleEl);
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  function renderItem(task, activeId, h) {
    const li = document.createElement('li');
    li.className = 'task';
    if (task.completed) li.classList.add('is-done');
    if (task.id === activeId) li.classList.add('is-active');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.completed;
    check.setAttribute(
      'aria-label',
      (task.completed ? 'Mark as not complete: ' : 'Mark as complete: ') + task.title
    );
    check.addEventListener('change', () => h.onToggle(task.id));

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    if (!task.completed) {
      title.title = 'Double-click to edit';
      title.addEventListener('dblclick', () => startEditing(li, task, h.onRename));
    }

    const count = document.createElement('span');
    count.className = 'task-count';
    count.textContent = '⏳ ' + task.pomodoros;
    count.title = task.pomodoros + ' pomodoro' + (task.pomodoros === 1 ? '' : 's') + ' completed';

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    if (!task.completed) {
      const isActive = task.id === activeId;
      const focusBtn = button(
        'btn btn-small' + (isActive ? ' btn-selected' : ''),
        isActive ? 'Focusing' : 'Focus',
        (isActive ? 'Currently focusing on ' : 'Focus on ') + task.title
      );
      focusBtn.setAttribute('aria-pressed', String(isActive));
      focusBtn.addEventListener('click', () => h.onFocus(task.id));
      actions.append(focusBtn);
    }

    if (!task.completed) {
      const editBtn = button('btn btn-icon', '✎', 'Edit ' + task.title);
      editBtn.addEventListener('click', () => startEditing(li, task, h.onRename));
      actions.append(editBtn);
    }

    const delBtn = button('btn btn-icon btn-danger', '🗑', 'Delete ' + task.title);
    delBtn.addEventListener('click', () => h.onDelete(task.id));

    actions.append(delBtn);
    li.append(check, title, count, actions);
    return li;
  }

  /* Renders both lists from plain data. `open`/`done` are task arrays from
     TaskStore; user actions are reported through `handlers` (the controller). */
  function render({ activeList, completedList, activeEmpty, completedEmpty, activeCount, completedCount }, { open, done }, activeId, handlers) {

    activeList.replaceChildren(...open.map((t) => renderItem(t, activeId, handlers)));
    completedList.replaceChildren(...done.map((t) => renderItem(t, activeId, handlers)));

    activeEmpty.hidden = open.length > 0;
    completedEmpty.hidden = done.length > 0;
    activeCount.textContent = open.length;
    completedCount.textContent = done.length;
  }

  return { render };
})();
