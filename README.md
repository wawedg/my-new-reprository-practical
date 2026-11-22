# FocusTime

A Pomodoro timer with a simple task list for students. It runs fully in the
browser: no server, no build step, data stays in `localStorage`.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Add `?fast` to the URL (`index.html?fast`) so minutes become seconds, which
makes testing quicker.

## Structure

```
js/core/       config + storage adapter
js/models/     Timer state machine, TaskStore (no DOM)
js/services/   Notifier (sound, notifications, screen reader)
js/ui/         TimerView, TaskView (rendering only)
js/features/   Background picker (self-contained, used on every page)
js/app.js      controller – wires everything together
docs/          architecture document and diagrams
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture
diagram, component responsibilities, interactions and design decisions.
