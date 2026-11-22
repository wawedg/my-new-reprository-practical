/* Application configuration – the single place for tunable constants.
   Models read their settings from here instead of from the browser
   environment, which keeps them free of DOM/URL dependencies. */
const Config = (() => {
  // Add ?fast to the URL to use seconds instead of minutes (handy for testing).
  const fast =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');
  const UNIT = fast ? 1000 : 60 * 1000;

  const MINUTES = Object.freeze({ focus: 25, short: 5, long: 15 });

  return Object.freeze({
    MINUTES,
    DURATIONS: Object.freeze({
      focus: MINUTES.focus * UNIT,
      short: MINUTES.short * UNIT,
      long: MINUTES.long * UNIT,
    }),
    LABELS: Object.freeze({ focus: 'Focus', short: 'Short Break', long: 'Long Break' }),
    LONG_BREAK_EVERY: 4,
    TICK_MS: 250,
    TASK_TITLE_MAX: 120,
  });
})();
