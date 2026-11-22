/* Unit tests for the browser tab title drawn by TimerView. Run with: node --test tests/
   The view is loaded into a VM context with a minimal fake document. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadView() {
  const document = { title: '' };
  const ctx = vm.createContext({ document });
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'timer-view.js'), 'utf8')
    + '\n;TimerView';
  const TimerView = vm.runInContext(code, ctx);
  const el = () => ({ setAttribute() {}, addEventListener() {}, style: {} });
  TimerView.init(
    { startBtn: el(), resetBtn: el(), modeTabs: [], time: el(), progress: el() },
    {}
  );
  const title = (state) => {
    TimerView.renderTime({ remainingMs: 754000, durationMs: 1500000, label: 'Focus', ...state });
    return document.title;
  };
  return { title };
}

test('Tab title: shows the countdown while running', () => {
  const { title } = loadView();
  assert.equal(title({ running: true, paused: false }), '12:34 – Focus · FocusTime');
});

test('Tab title: keeps the time with a pause mark when paused', () => {
  const { title } = loadView();
  assert.equal(title({ running: false, paused: true }), '⏸ 12:34 – Focus · FocusTime');
});

test('Tab title: shows only the app name when idle', () => {
  const { title } = loadView();
  assert.equal(title({ running: false, paused: false }), 'FocusTime');
});
