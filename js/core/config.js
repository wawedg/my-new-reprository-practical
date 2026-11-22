/* Application configuration – the single place for tunable constants.
   Models read their settings from here instead of from the browser
   environment, which keeps them free of DOM/URL dependencies. */
const Config = (() => {
  // Add ?fast to the URL to use seconds instead of minutes (handy for testing).
  const fast =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');
  const UNIT = fast ? 1000 : 60 * 1000;

  return Object.freeze({
    DURATIONS: Object.freeze({ focus: 25 * UNIT, short: 5 * UNIT, long: 15 * UNIT }),
    LABELS: Object.freeze({ focus: 'Focus', short: 'Short Break', long: 'Long Break' }),
    LONG_BREAK_EVERY: 4,
    TICK_MS: 250,
    TASK_TITLE_MAX: 120,
  });
})();
