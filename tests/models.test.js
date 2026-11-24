/* Unit tests for the DOM-free model layer. Run with: node --test tests/
   The models are plain browser scripts (no import/export), so each test
   loads them into a fresh VM context with a fake localStorage. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', 'js');
const FILES = ['core/config.js', 'core/storage.js', 'models/timer.js', 'models/task-store.js'];

/* timers: optional overrides for setInterval/setTimeout, e.g. to simulate a
   background tab where the browser throttles the interval. */
function loadModels(timers = {}) {
  const store = new Map();
  const ctx = vm.createContext({
    URLSearchParams,
    setInterval, clearInterval, setTimeout, clearTimeout,
    ...timers,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  });
  ctx.Date = Date;
  ctx.Math = Math;
  const code = FILES.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
    + '\n;({ Config, Storage, Timer, TaskStore })';
  return vm.runInContext(code, ctx);
}

test('TaskStore: add trims, rejects empty titles and persists', () => {
  const { TaskStore, Storage } = loadModels();
  TaskStore.load();
  assert.equal(TaskStore.add('   '), null);
  const t = TaskStore.add('  Read chapter 3  ');
  assert.equal(t.title, 'Read chapter 3');
  assert.equal(Storage.loadTasks().length, 1);
});

test('TaskStore: complete, rename and pomodoro counting', () => {
  const { TaskStore } = loadModels();
  TaskStore.load();
  const t = TaskStore.add('Essay');
  TaskStore.addPomodoro(t.id);
  assert.equal(TaskStore.get(t.id).pomodoros, 1);
  TaskStore.toggleComplete(t.id);
  assert.equal(TaskStore.completed().length, 1);
  assert.equal(TaskStore.rename(t.id, 'New'), false, 'completed tasks are read-only');
});

test('Timer: four focus sessions lead to a long break', () => {
  const { Timer } = loadModels();
  const done = [];
  Timer.init(null, { complete: (f, n) => done.push([f, n]) });
  for (let i = 0; i < 4; i++) {
    // Simulate a session that ended in the past, then restore it.
    Timer.init({ ...Timer.getState(), mode: 'focus', endsAt: Date.now() - 1 },
               { complete: (f, n) => done.push([f, n]) });
  }
  assert.deepEqual(done.map((d) => d[1]), ['short', 'short', 'short', 'long']);
});

test('Timer: pause keeps remaining time, reset restores full duration', () => {
  const { Timer, Config } = loadModels();
  Timer.init(null, {});
  Timer.start();
  Timer.pause();
  assert.ok(!Timer.isRunning());
  assert.ok(Timer.remaining() <= Config.DURATIONS.focus);
  Timer.reset();
  assert.equal(Timer.remaining(), Config.DURATIONS.focus);
  assert.ok(Timer.isFresh());
});

/* Ends the current session as if its deadline passed while the page was closed. */
function finishByRestore(Timer, handlers = {}) {
  Timer.init({ ...Timer.getState(), endsAt: Date.now() - 1 }, handlers);
}

test('Timer: the cycle follows focus/short ×3, focus/long, then starts over', () => {
  const { Timer } = loadModels();
  const done = [];
  Timer.init(null, { complete: (f, n) => done.push(`${f}->${n}`) });
  const positions = [];
  for (let i = 0; i < 8; i++) {
    if (Timer.getState().mode === 'focus') positions.push(Timer.cyclePosition());
    finishByRestore(Timer);
  }
  assert.deepEqual(done, [
    'focus->short', 'short->focus', 'focus->short', 'short->focus',
    'focus->short', 'short->focus', 'focus->long', 'long->focus',
  ]);
  assert.deepEqual(positions, [1, 2, 3, 4]);
  assert.equal(Timer.cyclePosition(), 1, 'a new cycle starts after the long break');
});

test('Timer: a long break chosen by hand restarts the cycle', () => {
  const { Timer } = loadModels();
  Timer.init(null, {});
  for (let i = 0; i < 4; i++) finishByRestore(Timer); // 2 focus + 2 short breaks
  assert.equal(Timer.cyclePosition(), 3);
  Timer.setMode('long');
  finishByRestore(Timer);
  assert.equal(Timer.getState().mode, 'focus');
  assert.equal(Timer.cyclePosition(), 1);
});

test('Timer: skipping the long break by hand keeps the cycle within 1…4', () => {
  const { Timer } = loadModels();
  Timer.init({ mode: 'long', cycleDone: 4 }, {});
  Timer.setMode('focus');
  assert.equal(Timer.cyclePosition(), 1);
  const next = [];
  finishByRestore(Timer, { complete: (f, n) => next.push(n) });
  assert.deepEqual(next, ['short']);
});

test('Timer: restores the cycle from the old completedFocus field', () => {
  const { Timer } = loadModels();
  Timer.init({ mode: 'focus', completedFocus: 7 }, {});
  assert.equal(Timer.cyclePosition(), 4);
  const next = [];
  finishByRestore(Timer, { complete: (f, n) => next.push(n) });
  assert.deepEqual(next, ['long']);

  Timer.init({ mode: 'long', completedFocus: 8 }, {});
  assert.equal(Timer.getState().cycleDone, 4, 'still in the long break that was earned');
});

test('Timer: a session that ended while the page was closed is marked as restored', () => {
  const { Timer } = loadModels();
  const info = [];
  Timer.init({ mode: 'focus', endsAt: Date.now() - 1 }, { complete: (f, n, i) => info.push(i) });
  assert.equal(info.length, 1);
  assert.equal(info[0].restored, true);
});

test('Timer: finishes on time even when the interval is throttled (hidden tab)', async () => {
  // setInterval that never fires, like a heavily throttled background tab.
  const { Timer } = loadModels({ setInterval: () => 1, clearInterval: () => {} });
  const info = [];
  Timer.init({ mode: 'focus', remainingMs: 50 }, { complete: (f, n, i) => info.push(i) });
  Timer.start();
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(info.length, 1, 'deadline timeout ended the session');
  assert.equal(info[0].restored, false);
  assert.ok(!Timer.isRunning());
});

test('TaskStore: sort orders by title (case-insensitive) without mutating the store', () => {
  const { TaskStore } = loadModels();
  TaskStore.load();
  ['banana', 'Apple', 'cherry', 'apple'].forEach((t) => TaskStore.add(t));
  const titles = (list) => Array.from(list, (t) => t.title);
  assert.deepEqual(titles(TaskStore.sort(TaskStore.all(), 'alpha')), ['Apple', 'apple', 'banana', 'cherry']);
  assert.deepEqual(titles(TaskStore.sort(TaskStore.all(), 'created')), ['banana', 'Apple', 'cherry', 'apple']);
  assert.deepEqual(titles(TaskStore.all()), ['banana', 'Apple', 'cherry', 'apple'], 'stored order unchanged');
});
