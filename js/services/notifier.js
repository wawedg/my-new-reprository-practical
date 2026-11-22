/* SERVICE – user alerts through browser APIs: the bell sound (Web Audio),
   desktop notifications and screen-reader announcements (aria-live).
   Knows nothing about tasks or timers; the controller decides *when* to alert. */
const Notifier = (() => {
  let audioCtx = null;
  let liveRegion = null;

  function init(statusEl) {
    liveRegion = statusEl;
  }

  /* Browsers only allow audio/notification prompts after a user gesture,
     so the controller calls this from the Start click. */
  function unlock() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  function bell() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    [0, 0.4, 0.8].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  }

  function desktop(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, tag: 'focustime' });
      } catch {
        /* some mobile browsers only allow notifications via a service worker */
      }
    }
  }

  function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    // Small delay so screen readers notice the change even for repeated text.
    setTimeout(() => (liveRegion.textContent = message), 50);
  }

  return { init, unlock, bell, desktop, announce };
})();
