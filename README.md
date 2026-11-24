# FocusTime

FocusTime is a simple study timer with a to-do list, made for students.

It uses the **Pomodoro Technique**: you work for 25 minutes, then take a short
break. After four work sessions, you take a longer break. This helps you stay
focused without getting tired.

Everything stays on your own computer. You don't need an account or an
internet connection (except for background photos).

## What it does

- **Timer** – counts down focus time (25 min), short breaks (5 min) and long
  breaks (15 min), and switches between them for you.
- **Alerts** – plays a sound and shows a pop-up when a session ends.
- **Task list** – add, edit, finish and delete the things you need to do.
- **Progress** – counts how many focus sessions (⏳) you spent on each task.
- **Search and sort** – find a task quickly, or sort tasks by name or date.
- **Backgrounds** – pick a color or a photo for the page.
- **Remembers you** – your tasks and settings are still there next time.
- **About page** – a short guide to the Pomodoro Technique.

## How to start the app

1. Download or copy the `focus-time` folder to your computer.
2. Open the folder.
3. Double-click `index.html`. It opens in your web browser.

That's it. Nothing to install.

**Optional:** if your computer has Python, you can also open a terminal in the
folder, type `python3 -m http.server 8000`, and go to `http://localhost:8000`
in your browser.

## User manual

See the [User Manual](docs/USER_MANUAL.md) for step-by-step help with the
timer, tasks and backgrounds.

## For testers

Add `?fast` to the end of the page address (for example `index.html?fast`).
Minutes then become seconds, so you can test the timer quickly.

## More documents

- [docs/USER_MANUAL.md](docs/USER_MANUAL.md) – how to use the app
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – how the app is built
- [docs/MVP.md](docs/MVP.md) – planned features and the first version's goals
