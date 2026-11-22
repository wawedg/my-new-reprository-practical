/* MODEL – Pomodoro timer state machine (no DOM access).
   Time is derived from a wall-clock deadline (endsAt), not from counting ticks,
   so it stays accurate in throttled background tabs and across page reloads.
   Depends on: Config. Notifies the controller through tick/change/complete. */
const Timer = (() => {
  const { DURATIONS, LABELS, LONG_BREAK_EVERY: LONG_EVERY, TICK_MS } = Config;

  let state;
  let intervalId = null;
  const listeners = { tick() {}, change() {}, complete() {} };

  const defaultState = () => ({
    mode: 'focus',
    remainingMs: DURATIONS.focus,
    endsAt: null,
    cycleDone: 0, // focus sessions finished in the current cycle (0…LONG_EVERY)
  });

  function init(saved, handlers) {
    Object.assign(listeners, handlers);
    state = defaultState();
    if (saved && DURATIONS[saved.mode]) {
      state.mode = saved.mode;
      state.cycleDone = restoreCycle(saved);
      state.remainingMs = Math.min(
        Number(saved.remainingMs) || DURATIONS[saved.mode],
        DURATIONS[saved.mode]
      );
      state.endsAt = typeof saved.endsAt === 'number' ? saved.endsAt : null;
    }

    if (state.endsAt !== null) {
      if (state.endsAt <= Date.now()) {
        finish(); // session ended while the page was closed
        return;
      }
      startInterval();
    }
    emitChange();
  }

  /* Accepts the current field and the older `completedFocus` total, so state
     saved by earlier versions keeps its place in the cycle. */
  function restoreCycle(saved) {
    const n = Number(saved.cycleDone ?? saved.completedFocus) || 0;
    if (n <= 0) return 0;
    // A long break is only "owed" while we are in it; otherwise stay within the cycle.
    return saved.mode === 'long' ? Math.min(n, LONG_EVERY) : n % LONG_EVERY;
  }

  const isRunning = () => state.endsAt !== null;
  const remaining = () =>
    isRunning() ? Math.max(0, state.endsAt - Date.now()) : state.remainingMs;
  const isFresh = () => !isRunning() && state.remainingMs === DURATIONS[state.mode];

  function start() {
    if (isRunning()) return;
    state.endsAt = Date.now() + state.remainingMs;
    startInterval();
    emitChange();
  }

  function pause() {
    if (!isRunning()) return;
    state.remainingMs = remaining();
    state.endsAt = null;
    stopInterval();
    emitChange();
  }

  function reset() {
    stopInterval();
    state.endsAt = null;
    state.remainingMs = DURATIONS[state.mode];
    emitChange();
  }

  function setMode(mode) {
    if (!DURATIONS[mode]) return;
    stopInterval();
    state.mode = mode;
    state.endsAt = null;
    state.remainingMs = DURATIONS[mode];
    emitChange();
  }

  function finish() {
    stopInterval();
    const finished = state.mode;
    let next;
    if (finished === 'focus') {
      state.cycleDone = (state.cycleDone % LONG_EVERY) + 1;
      next = state.cycleDone === LONG_EVERY ? 'long' : 'short';
    } else {
      // A finished long break (automatic or picked by hand) starts a new cycle.
      if (finished === 'long') state.cycleDone = 0;
      next = 'focus';
    }
    state.mode = next;
    state.endsAt = null;
    state.remainingMs = DURATIONS[next];
    listeners.complete(finished, next);
    emitChange();
  }

  function tick() {
    const r = remaining();
    listeners.tick(r);
    if (r <= 0) finish();
  }

  function startInterval() {
    stopInterval();
    intervalId = setInterval(tick, TICK_MS);
  }

  function stopInterval() {
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = null;
  }

  function emitChange() {
    listeners.change();
    listeners.tick(remaining());
  }

  const getState = () => ({ ...state });
  const duration = (mode = state.mode) => DURATIONS[mode];
  // 1-based position of the current/next focus session within the 4-cycle.
  const cyclePosition = () => (state.cycleDone % LONG_EVERY) + 1;

  return {
    init, start, pause, reset, setMode,
    isRunning, isFresh, remaining, getState, duration, cyclePosition,
    LABELS, LONG_EVERY,
  };
})();
