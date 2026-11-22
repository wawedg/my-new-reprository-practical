/* VIEW – draws the timer card (time, progress bar, mode tabs, cycle info,
   current task) and forwards button clicks to the controller.
   Reads timer state passed in by the controller; never calls Timer directly. */
const TimerView = (() => {
  let els;

  const fmt = (ms) => {
    const total = Math.ceil(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  /* handlers: { onStartPause(), onReset(), onMode(mode) } */
  function init(elements, handlers) {
    els = elements;
    els.startBtn.addEventListener('click', () => handlers.onStartPause());
    els.resetBtn.addEventListener('click', () => handlers.onReset());
    els.modeTabs.forEach((tab) =>
      tab.addEventListener('click', () => handlers.onMode(tab.dataset.mode))
    );
  }

  /* Called every tick (~4×/s): only touches the cheap, fast-changing parts. */
  function renderTime({ remainingMs, durationMs, label, running }) {
    const text = fmt(remainingMs);
    els.time.textContent = text;
    els.time.setAttribute('aria-label', `${label}: ${text} remaining`);
    const pct = 100 - (remainingMs / durationMs) * 100;
    els.progress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    document.title = running ? `${text} – ${label} · FocusTime` : 'FocusTime';
  }

  /* Called on state changes (start, pause, mode switch, task change). */
  function render({ mode, running, fresh, cyclePosition, cycleLength, taskTitle }) {
    els.card.dataset.mode = mode;
    document.body.dataset.mode = mode;
    document.body.classList.toggle('is-running', running);

    els.modeTabs.forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });

    els.startBtn.textContent = running ? 'Pause' : fresh ? 'Start' : 'Resume';
    els.resetBtn.disabled = fresh;

    els.cycleInfo.textContent =
      mode === 'focus'
        ? `Pomodoro ${cyclePosition} of ${cycleLength}`
        : mode === 'long'
          ? 'Long break – you earned it!'
          : 'Short break – stretch, breathe, hydrate';

    els.currentTask.textContent = taskTitle || 'No task selected';
    els.currentTask.classList.toggle('is-empty', !taskTitle);
  }

  return { init, render, renderTime };
})();
