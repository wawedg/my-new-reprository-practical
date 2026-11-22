/* FEATURE – background picker (solid colour or an Unsplash photo), shared by
   every page. Self-contained: owns its own state, persistence key and panel UI.
   The gradient feature is commented out (search for "GRADIENT FEATURE").
   (public images.unsplash.com links – no API key needed).
   Loaded in <head> so the saved background is applied before first paint;
   the settings panel is built once the DOM is ready. Depends on: Storage. */
const Background = (() => {
  const STATE_KEY = 'focustime.background';
  const OLD_API_KEY_KEY = 'focustime.unsplashKey'; // from the earlier API version
  const UTM = 'utm_source=focustime&utm_medium=referral';
  const HEX = /^#[0-9a-f]{6}$/i;

  const SOLID_PRESETS = [
    '#faf6ee', '#f3e3c3', '#e6c79c', '#dfe9e4', '#dde6f2', '#f2dede',
    '#4a3426', '#2d241b', '#1f2a30', '#2f3b2f', '#2b2d42', '#111111',
  ];

  // GRADIENT FEATURE (disabled) – uncomment to bring it back.
  // /* Gradient types. `uses` lists the controls each type responds to. */
  // const KINDS = {
    // linear: { label: 'Linear', uses: ['angle'] },
    // radial: { label: 'Radial', uses: ['pos'] },
    // conic: { label: 'Conic', uses: ['angle', 'pos'] },
    // stripes: { label: 'Stripes', uses: ['angle', 'size'] },
    // rings: { label: 'Rings', uses: ['pos', 'size'] },
    // mesh: { label: 'Mesh', uses: ['angle'] },
  // };

  // const POSITIONS = [
    // 'top left', 'top', 'top right',
    // 'left', 'center', 'right',
    // 'bottom left', 'bottom', 'bottom right',
  // ];
  // const SIZE_MIN = 10;
  // const SIZE_MAX = 200;

  // const GRADIENT_PRESETS = [
    // { name: 'Desert dusk', kind: 'linear', from: '#f6d365', to: '#fda085', angle: 135 },
    // { name: 'Sandstone', kind: 'linear', from: '#e6c79c', to: '#8c5a3c', angle: 160 },
    // { name: 'Sea glass', kind: 'linear', from: '#a8edea', to: '#fed6e3', angle: 135 },
    // { name: 'Twilight', kind: 'linear', from: '#3d5a8a', to: '#1b150e', angle: 180 },
    // { name: 'Sunrise glow', kind: 'radial', from: '#fde68a', to: '#b45309', pos: 'bottom' },
    // { name: 'Spotlight', kind: 'radial', from: '#414345', to: '#111111', pos: 'top' },
    // { name: 'Sunburst', kind: 'conic', from: '#f6d365', to: '#b45309', angle: 0, pos: 'center' },
    // { name: 'Color wheel', kind: 'conic', from: '#5cc4ad', to: '#92b2e8', angle: 90, pos: 'bottom left' },
    // { name: 'Sand stripes', kind: 'stripes', from: '#f3e3c3', to: '#e6c79c', angle: 45, size: 40 },
    // { name: 'Ripples', kind: 'rings', from: '#a8edea', to: '#3d5a8a', pos: 'center', size: 120 },
    // { name: 'Aurora', kind: 'mesh', from: '#5cc4ad', to: '#3d5a8a', angle: 135 },
    // { name: 'Peach mesh', kind: 'mesh', from: '#fda085', to: '#f6d365', angle: 45 },
  // ].map((p) => ({ angle: 135, pos: 'center', size: 60, ...p }));
  // END GRADIENT FEATURE

  // Public Unsplash photos (free to use under the Unsplash License).
  const GALLERY = [
    { id: '1473580044384-7ba9967e16a0', name: 'Sand dunes', color: '#c79a6b' },
    { id: '1509316785289-025f5b846b35', name: 'Desert canyon', color: '#b5643a' },
    { id: '1500534314209-a25ddb2bd429', name: 'Misty hills', color: '#8a9a8c' },
    { id: '1506905925346-21bda4d32df4', name: 'Above the clouds', color: '#5d6a85' },
    { id: '1501785888041-af3ef285b470', name: 'Mountain lake', color: '#3a8f8f' },
    { id: '1441974231531-c6227db76b6e', name: 'Forest light', color: '#4d5a2e' },
    { id: '1418065460487-3e41a6c84dc5', name: 'Foggy forest', color: '#7d8c84' },
    { id: '1507525428034-b723cf961d3e', name: 'Beach sunrise', color: '#d8b9a0' },
    { id: '1505144808419-1957a94ca61e', name: 'Ocean waves', color: '#2b7f9e' },
    { id: '1454496522488-7a8e488e8606', name: 'Snowy peaks', color: '#8fa0b5' },
    { id: '1519681393784-d120267933ba', name: 'Night mountains', color: '#2b2f4f' },
    { id: '1444703686981-a3abbc4d4fe3', name: 'Starry sky', color: '#1d1a2a' },
    { id: '1481627834876-b7833e8f5570', name: 'Library', color: '#5a4232' },
    { id: '1507842217343-583bb7270b66', name: 'Bookshelves', color: '#6b4a2f' },
  ];

  /* ---------- State ---------- */

  const defaults = () => ({
    type: 'default', // 'default' | 'solid' | 'image'  ('gradient' is disabled)
    solid: '#f3e3c3',
    // GRADIENT FEATURE (disabled) – uncomment to bring it back.
    // gradient: { from: '#f6d365', to: '#fda085', angle: 135, kind: 'linear', pos: 'center', size: 60 },
    // END GRADIENT FEATURE
    image: null,
  });

  const withUtm = (u) => u + (u.includes('?') ? '&' : '?') + UTM;

  /* Accepts a public Unsplash image link and returns a background-sized
     version of it, or null if it isn't one. */
  function photoUrl(input) {
    let u;
    try {
      u = new URL(String(input).trim());
    } catch {
      return null;
    }
    if (u.protocol !== 'https:' || u.hostname !== 'images.unsplash.com' || !u.pathname.startsWith('/photo-')) {
      return null;
    }
    ['h', 'crop', 'fit', 'fm', 'dpr', 'rect'].forEach((p) => u.searchParams.delete(p));
    u.searchParams.set('w', '2400');
    u.searchParams.set('q', '80');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'max');
    return u.href;
  }

  const thumbUrl = (id) =>
    `https://images.unsplash.com/photo-${id}?w=400&h=267&fit=crop&q=60&auto=format`;

  function load() {
    const s = defaults();
    const saved = Storage.get(STATE_KEY, null);
    if (!saved || typeof saved !== 'object') return s;

    // GRADIENT FEATURE (disabled) – uncomment to bring it back.
    // if (['default', 'solid', 'gradient', 'image'].includes(saved.type)) s.type = saved.type;
    // END GRADIENT FEATURE
    if (['default', 'solid', 'image'].includes(saved.type)) s.type = saved.type;
    if (HEX.test(saved.solid)) s.solid = saved.solid.toLowerCase();

    // GRADIENT FEATURE (disabled) – uncomment to bring it back.
    // const g = saved.gradient || {};
    // if (HEX.test(g.from)) s.gradient.from = g.from.toLowerCase();
    // if (HEX.test(g.to)) s.gradient.to = g.to.toLowerCase();
    // if (Number.isFinite(g.angle)) s.gradient.angle = Math.round(((g.angle % 360) + 360) % 360);
    // if (Object.hasOwn(KINDS, g.kind)) s.gradient.kind = g.kind;
    // if (POSITIONS.includes(g.pos)) s.gradient.pos = g.pos;
    // if (Number.isFinite(g.size)) s.gradient.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(g.size)));
    // END GRADIENT FEATURE

    const im = saved.image;
    const url = im && photoUrl(im.url);
    if (url) {
      s.image = {
        url,
        color: HEX.test(im.color) ? im.color : '#444444',
        name: typeof im.name === 'string' ? im.name.slice(0, 60) : 'Photo',
      };
    }
    if (s.type === 'image' && !s.image) s.type = 'default';
    return s;
  }

  let state = load();

  // GRADIENT FEATURE (disabled) – uncomment to bring it back.
  // function gradientCss(g) {
    // const { from, to, angle, pos, size } = g;
    // switch (g.kind) {
      // case 'radial':
        // return `radial-gradient(circle at ${pos}, ${from}, ${to})`;
      // case 'conic':
        // // Ends on the start colour so there is no hard seam.
        // return `conic-gradient(from ${angle}deg at ${pos}, ${from}, ${to}, ${from})`;
      // case 'stripes':
        // return `repeating-linear-gradient(${angle}deg, ${from} 0 ${size / 2}px, ${to} ${size / 2}px ${size}px)`;
      // case 'rings':
        // return `repeating-radial-gradient(circle at ${pos}, ${from} 0, ${to} ${size / 2}px, ${from} ${size}px)`;
      // case 'mesh': {
        // const mid = `color-mix(in oklab, ${from}, ${to})`;
        // const light = `color-mix(in oklab, ${from}, white 35%)`;
        // return [
          // `radial-gradient(at 15% 20%, ${light} 0, transparent 50%)`,
          // `radial-gradient(at 85% 25%, ${mid} 0, transparent 55%)`,
          // `radial-gradient(at 75% 85%, ${to} 0, transparent 55%)`,
          // `radial-gradient(at 20% 85%, ${mid} 0, transparent 50%)`,
          // `linear-gradient(${angle}deg, ${from}, ${to})`,
        // ].join(', ');
      // }
      // default:
        // return `linear-gradient(${angle}deg, ${from}, ${to})`;
    // }
  // }

  // // True when two gradients look the same (ignores controls the type doesn't use).
  // function sameGradient(a, b) {
    // return (
      // a.kind === b.kind && a.from === b.from && a.to === b.to &&
      // KINDS[a.kind].uses.every((k) => a[k] === b[k])
    // );
  // }
  // END GRADIENT FEATURE

  function cssValue() {
    switch (state.type) {
      case 'solid':
        return state.solid;
      // GRADIENT FEATURE (disabled) – uncomment to bring it back.
      // case 'gradient':
        // return gradientCss(state.gradient);
      // END GRADIENT FEATURE
      case 'image': {
        const url = state.image.url.replace(/["\\\n]/g, encodeURIComponent);
        // A light scrim keeps the floating header readable on busy photos.
        return `linear-gradient(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.12)), url("${url}") center / cover no-repeat ${state.image.color}`;
      }
      default:
        return null;
    }
  }

  function apply() {
    const root = document.documentElement;
    const value = cssValue();
    if (value) root.style.setProperty('--app-bg', value);
    else root.style.removeProperty('--app-bg');
    root.classList.toggle('has-custom-bg', Boolean(value));
    renderCredit();
  }

  function commit() {
    Storage.set(STATE_KEY, state);
    apply();
    syncControls();
  }

  const setSolid = (color) => {
    state.type = 'solid';
    state.solid = color.toLowerCase();
    commit();
  };

  // GRADIENT FEATURE (disabled) – uncomment to bring it back.
  // const setGradient = (patch) => {
    // state.type = 'gradient';
    // Object.assign(state.gradient, patch);
    // commit();
  // };
  // END GRADIENT FEATURE

  function normHex(value) {
    let v = String(value).trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, '$&$&');
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : null;
  }

  /* ---------- DOM helper ---------- */

  function el(tag, props = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    n.append(...children.filter((c) => c != null));
    return n;
  }

  const extLink = (href, text) =>
    el('a', { href, target: '_blank', rel: 'noopener noreferrer', text });

  /* ---------- Photo credit (courtesy – the Unsplash License doesn't require it) ---------- */

  function renderCredit() {
    if (!document.body) return;
    let credit = document.getElementById('photo-credit');
    if (state.type !== 'image' || !state.image) {
      if (credit) credit.remove();
      return;
    }
    if (!credit) {
      credit = el('p', { id: 'photo-credit', class: 'photo-credit' });
      document.body.append(credit);
    }
    credit.replaceChildren(
      state.image.name + ' · Photo from ',
      extLink(withUtm('https://unsplash.com/'), 'Unsplash')
    );
  }

  /* ---------- Photos ---------- */

  function setImage(url, color, name) {
    state.type = 'image';
    state.image = { url, color, name };
    commit();
  }

  function galleryItem(p) {
    const url = photoUrl('https://images.unsplash.com/photo-' + p.id);
    const btn = el(
      'button',
      { type: 'button', class: 'bg-photo-btn', 'aria-label': 'Use photo: ' + p.name, onclick: () => setImage(url, p.color, p.name) },
      el('img', { src: thumbUrl(p.id), alt: '', loading: 'lazy' })
    );
    btn.dataset.url = url;
    btn.style.backgroundColor = p.color;
    return el('li', { class: 'bg-photo' }, btn, el('span', { class: 'bg-photo-credit', text: p.name }));
  }

  function useLink(e) {
    e.preventDefault();
    const url = photoUrl(refs.linkInput.value);
    if (!url) {
      setStatus('Paste a direct image link that starts with https://images.unsplash.com/photo-', true);
      refs.linkInput.focus();
      return;
    }
    // Check the image really loads before switching to it.
    setStatus('Loading image…');
    const img = new Image();
    img.onload = () => {
      setImage(url, '#444444', 'Your photo');
      refs.linkInput.value = '';
      setStatus('Background updated.');
    };
    img.onerror = () => setStatus("That image couldn't be loaded. Check the link and try again.", true);
    img.src = url;
  }

  /* ---------- Panel ---------- */

  const refs = {};
  // GRADIENT FEATURE (disabled) – uncomment to bring it back.
  // const TABS = ['solid', 'gradient', 'image'];
  // const TAB_LABELS = { solid: 'Solid', gradient: 'Gradient', image: 'Unsplash' };
  // END GRADIENT FEATURE
  const TABS = ['solid', 'image'];
  const TAB_LABELS = { solid: 'Solid', image: 'Unsplash' };
  let currentTab = 'solid';

  function setStatus(message, isError = false) {
    refs.status.textContent = message;
    refs.status.classList.toggle('is-error', isError);
  }

  function buildSolidPane() {
    refs.solidColor = el('input', { type: 'color', id: 'bg-solid-color' });
    refs.solidColor.addEventListener('input', () => setSolid(refs.solidColor.value));

    refs.solidHex = el('input', {
      type: 'text', id: 'bg-solid-hex', class: 'bg-input bg-hex',
      maxlength: '7', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Hex colour code',
    });
    refs.solidHex.addEventListener('change', () => {
      const v = normHex(refs.solidHex.value);
      if (v) setSolid(v);
      else refs.solidHex.value = state.solid;
    });

    refs.swatches = el('div', { class: 'bg-swatches' });
    SOLID_PRESETS.forEach((c) => {
      const b = el('button', { type: 'button', class: 'bg-swatch', title: c, 'aria-label': 'Use colour ' + c, onclick: () => setSolid(c) });
      b.style.background = c;
      b.dataset.color = c;
      refs.swatches.append(b);
    });

    return el(
      'section', {},
      el('label', { class: 'bg-label', for: 'bg-solid-color', text: 'Colour' }),
      el('div', { class: 'bg-row' }, refs.solidColor, refs.solidHex),
      el('p', { class: 'bg-label', text: 'Presets' }),
      refs.swatches
    );
  }

  // GRADIENT FEATURE (disabled) – uncomment to bring it back.
  // function buildGradientPane() {
    // refs.gPreview = el('div', { class: 'bg-preview', 'aria-hidden': 'true' });

    // refs.gFrom = el('input', { type: 'color', id: 'bg-grad-from' });
    // refs.gTo = el('input', { type: 'color', id: 'bg-grad-to' });
    // refs.gFrom.addEventListener('input', () => setGradient({ from: refs.gFrom.value }));
    // refs.gTo.addEventListener('input', () => setGradient({ to: refs.gTo.value }));
    // const swap = el('button', {
      // type: 'button', class: 'btn btn-small', text: '⇄ Swap',
      // onclick: () => setGradient({ from: state.gradient.to, to: state.gradient.from }),
    // });

    // refs.gKinds = el('div', { class: 'bg-kinds', role: 'group', 'aria-labelledby': 'bg-kind-label' });
    // Object.entries(KINDS).forEach(([kind, { label }]) => {
      // const b = el(
        // 'button',
        // { type: 'button', class: 'bg-kind', onclick: () => setGradient({ kind }) },
        // el('span', { class: 'bg-kind-swatch', 'aria-hidden': 'true' }),
        // el('span', { text: label })
      // );
      // b.dataset.kind = kind;
      // refs.gKinds.append(b);
    // });

    // refs.gAngle = el('input', { type: 'range', id: 'bg-grad-angle', min: '0', max: '359', step: '1' });
    // refs.gAngle.addEventListener('input', () => setGradient({ angle: Number(refs.gAngle.value) }));
    // refs.gAngleOut = el('output', { for: 'bg-grad-angle' });
    // refs.gAngleRow = el(
      // 'div', { class: 'bg-control' },
      // el('label', { class: 'bg-label', for: 'bg-grad-angle' }, 'Angle ', refs.gAngleOut),
      // refs.gAngle
    // );

    // refs.gPositions = el('div', { class: 'bg-positions', role: 'group', 'aria-labelledby': 'bg-pos-label' });
    // POSITIONS.forEach((pos) => {
      // const b = el('button', {
        // type: 'button', class: 'bg-pos', title: pos, 'aria-label': 'Centre: ' + pos,
        // onclick: () => setGradient({ pos }),
      // });
      // b.dataset.pos = pos;
      // refs.gPositions.append(b);
    // });
    // refs.gPosRow = el(
      // 'div', { class: 'bg-control' },
      // el('p', { class: 'bg-label', id: 'bg-pos-label', text: 'Centre' }),
      // refs.gPositions
    // );

    // refs.gSize = el('input', { type: 'range', id: 'bg-grad-size', min: String(SIZE_MIN), max: String(SIZE_MAX), step: '2' });
    // refs.gSize.addEventListener('input', () => setGradient({ size: Number(refs.gSize.value) }));
    // refs.gSizeOut = el('output', { for: 'bg-grad-size' });
    // refs.gSizeRow = el(
      // 'div', { class: 'bg-control' },
      // el('label', { class: 'bg-label', for: 'bg-grad-size' }, 'Size ', refs.gSizeOut),
      // refs.gSize
    // );

    // refs.gPresets = el('div', { class: 'bg-presets' });
    // GRADIENT_PRESETS.forEach((p, i) => {
      // const b = el('button', {
        // type: 'button', class: 'bg-preset', title: `${p.name} (${KINDS[p.kind].label})`,
        // 'aria-label': `Gradient preset: ${p.name}, ${KINDS[p.kind].label}`,
        // onclick: () => setGradient({ kind: p.kind, from: p.from, to: p.to, angle: p.angle, pos: p.pos, size: p.size }),
      // });
      // b.style.background = gradientCss(p);
      // b.dataset.index = i;
      // refs.gPresets.append(b);
    // });

    // return el(
      // 'section', {},
      // refs.gPreview,
      // el(
        // 'div', { class: 'bg-gradient-colors' },
        // el('div', {}, el('label', { class: 'bg-label', for: 'bg-grad-from', text: 'From' }), refs.gFrom),
        // el('div', {}, el('label', { class: 'bg-label', for: 'bg-grad-to', text: 'To' }), refs.gTo),
        // swap
      // ),
      // el('p', { class: 'bg-label', id: 'bg-kind-label', text: 'Type' }),
      // refs.gKinds,
      // refs.gAngleRow,
      // refs.gPosRow,
      // refs.gSizeRow,
      // el('p', { class: 'bg-label', text: 'Presets' }),
      // refs.gPresets
    // );
  // }
  // END GRADIENT FEATURE

  function buildImagePane() {
    refs.photos = el('ul', { class: 'bg-photos' }, ...GALLERY.map(galleryItem));

    refs.linkInput = el('input', {
      type: 'url', id: 'bg-link', class: 'bg-input',
      placeholder: 'https://images.unsplash.com/photo-…', autocomplete: 'off', spellcheck: 'false',
    });
    const linkForm = el(
      'form', { class: 'bg-row', onsubmit: useLink },
      refs.linkInput,
      el('button', { type: 'submit', class: 'btn btn-primary btn-small', text: 'Use' })
    );

    refs.status = el('p', { class: 'bg-status', role: 'status' });
    refs.current = el('p', { class: 'bg-note' });

    return el(
      'section', {},
      refs.current,
      el('p', { class: 'bg-label', text: 'Gallery' }),
      refs.photos,
      el('label', { class: 'bg-label', for: 'bg-link', text: 'Or paste an Unsplash image link' }),
      el(
        'p', { class: 'bg-note' },
        'On ', extLink(withUtm('https://unsplash.com/'), 'unsplash.com'),
        ', open a photo, right-click the image and choose ', el('strong', { text: 'Copy image address' }), '.'
      ),
      linkForm,
      refs.status
    );
  }

  function selectTab(tab) {
    currentTab = tab;
    TABS.forEach((t) => {
      const on = t === tab;
      refs.tabs[t].setAttribute('aria-selected', String(on));
      refs.tabs[t].tabIndex = on ? 0 : -1;
      refs.panes[t].hidden = !on;
    });
  }

  function syncControls() {
    if (!refs.solidColor) return;

    refs.solidColor.value = state.solid;
    if (document.activeElement !== refs.solidHex) refs.solidHex.value = state.solid;
    refs.swatches.querySelectorAll('.bg-swatch').forEach((b) =>
      b.setAttribute('aria-pressed', String(state.type === 'solid' && b.dataset.color === state.solid))
    );

    // GRADIENT FEATURE (disabled) – uncomment to bring it back.
    // const g = state.gradient;
    // refs.gFrom.value = g.from;
    // refs.gTo.value = g.to;
    // const uses = KINDS[g.kind].uses;
    // refs.gAngle.value = g.angle;
    // refs.gAngleOut.textContent = g.angle + '°';
    // refs.gAngleRow.hidden = !uses.includes('angle');
    // refs.gSize.value = g.size;
    // refs.gSizeOut.textContent = g.size + 'px';
    // refs.gSizeRow.hidden = !uses.includes('size');
    // refs.gPosRow.hidden = !uses.includes('pos');
    // refs.gPositions.querySelectorAll('.bg-pos').forEach((b) =>
      // b.setAttribute('aria-pressed', String(b.dataset.pos === g.pos))
    // );
    // refs.gKinds.querySelectorAll('.bg-kind').forEach((b) => {
      // b.setAttribute('aria-pressed', String(b.dataset.kind === g.kind));
      // // Each type button previews the current colours in that style.
      // b.firstChild.style.background = gradientCss({ ...g, kind: b.dataset.kind, size: Math.min(g.size, 24) });
    // });
    // refs.gPreview.style.background = gradientCss(g);
    // refs.gPresets.querySelectorAll('.bg-preset').forEach((b) =>
      // b.setAttribute(
        // 'aria-pressed',
        // String(state.type === 'gradient' && sameGradient(g, GRADIENT_PRESETS[b.dataset.index]))
      // )
    // );
    // END GRADIENT FEATURE

    const imgUrl = state.type === 'image' && state.image ? state.image.url : null;
    refs.photos.querySelectorAll('.bg-photo-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.url === imgUrl))
    );
    refs.current.textContent = imgUrl ? 'Current background: ' + state.image.name : '';

    TABS.forEach((t) => refs.tabs[t].classList.toggle('is-current', state.type === t));
    refs.reset.disabled = state.type === 'default';
  }

  function focusables() {
    return [...refs.panel.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')].filter(
      (n) => !n.disabled && n.offsetParent !== null && n.tabIndex !== -1
    );
  }

  function onPanelKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open() {
    refs.overlay.hidden = false;
    refs.panel.hidden = false;
    refs.openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('bg-panel-open');
    refs.tabs[currentTab].focus();
  }

  function close() {
    refs.overlay.hidden = true;
    refs.panel.hidden = true;
    refs.openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('bg-panel-open');
    refs.openBtn.focus();
  }

  function buildPanel() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    refs.openBtn = el(
      'button',
      {
        type: 'button', class: 'btn bg-open-btn',
        'aria-haspopup': 'dialog', 'aria-controls': 'bg-panel', 'aria-expanded': 'false',
        onclick: open,
      },
      el('span', { 'aria-hidden': 'true', text: '🎨' }),
      el('span', { class: 'bg-open-label', text: 'Background' })
    );
    header.append(refs.openBtn);

    refs.tabs = {};
    // GRADIENT FEATURE (disabled) – uncomment to bring it back.
    // refs.panes = { solid: buildSolidPane(), gradient: buildGradientPane(), image: buildImagePane() };
    // END GRADIENT FEATURE
    refs.panes = { solid: buildSolidPane(), image: buildImagePane() };

    const tablist = el('div', { class: 'bg-tabs', role: 'tablist', 'aria-label': 'Background type' });
    TABS.forEach((t) => {
      refs.tabs[t] = el('button', {
        type: 'button', role: 'tab', id: 'bg-tab-' + t, class: 'bg-tab',
        'aria-controls': 'bg-pane-' + t, text: TAB_LABELS[t], onclick: () => selectTab(t),
      });
      tablist.append(refs.tabs[t]);
      Object.assign(refs.panes[t], { id: 'bg-pane-' + t, className: 'bg-pane' });
      refs.panes[t].setAttribute('role', 'tabpanel');
      refs.panes[t].setAttribute('aria-labelledby', 'bg-tab-' + t);
    });
    tablist.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = TABS[(TABS.indexOf(currentTab) + step + TABS.length) % TABS.length];
      selectTab(next);
      refs.tabs[next].focus();
    });

    refs.reset = el('button', {
      type: 'button', class: 'btn', text: 'Reset to default',
      onclick: () => {
        state.type = 'default';
        commit();
      },
    });

    refs.overlay = el('div', { class: 'bg-overlay', hidden: true, onclick: close });
    refs.panel = el(
      'aside',
      { id: 'bg-panel', class: 'bg-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bg-panel-title', hidden: true },
      el(
        'div', { class: 'bg-panel-head' },
        el('h2', { id: 'bg-panel-title', text: 'Background' }),
        el('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Close background settings', text: '✕', onclick: close })
      ),
      tablist,
      refs.panes.solid,
      // GRADIENT FEATURE (disabled) – uncomment to bring it back.
      // refs.panes.gradient,
      // END GRADIENT FEATURE
      refs.panes.image,
      el('div', { class: 'bg-panel-foot' }, refs.reset)
    );
    refs.panel.addEventListener('keydown', onPanelKeydown);

    document.body.append(refs.overlay, refs.panel);
    selectTab(state.type === 'default' ? 'solid' : state.type);
    syncControls();
  }

  /* ---------- Boot ---------- */

  Storage.remove(OLD_API_KEY_KEY);
  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderCredit();
      buildPanel();
    });
  } else {
    renderCredit();
    buildPanel();
  }

  return { open, close };
})();
