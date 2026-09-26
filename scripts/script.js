(() => {
  'use strict';
  for(const type of ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'])
    document.addEventListener(type, e => e.preventDefault(), {
      passive: false
    });
  document.addEventListener('keydown', e => {
    if(e.key === 'Tab' || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ''].includes(e.key))
      e.preventDefault()
  }, {
    capture: true
  });
  const white = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'], black = ['w', 'e', 't', 'y', 'u'];
  const freqs = {
    a: 261.626,
    w: 277.183,
    s: 293.665,
    e: 311.127,
    d: 329.628,
    f: 349.994,
    t: 369.994,
    g: 391.995,
    y: 415.305,
    h: 440,
    u: 466.164,
    j: 493.883,
    k: 523.251
  };
  const all = {...white, ...black};
  const keys = document.getElementById('keys');
  all.forEach(k => {
    const el = document.createElement('div');
    el.className = 'key';
    el.id = 'key-' + k;
    el.dataset.note = k.toUpperCase();
    keys.appendChild(el)
  });
  const audio = new (window.AudioContext || window.webkitAudioContext)();
  const active = new Map();
  function sound(k) {
    if (audio.state === 'suspended') {
      audio.resume();
    }
    if (active.has(k)) {
      return;
    }
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'triangle';
    o.frequency.value = freqs[k];
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.65);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.68);
    active.set(k, o);
    setTimeout(() => {
      active.delete(k)
    }, 700);
  }
  function flash(k) {
    const el = document.getElementById('key-' + k);
    if(!el) {
      return;
    }
    el.classList.add('down');
    setTimeout(() => {
      el.classList.remove('down')
    }, 120);
  }
  let mode = 'menu',
  selected = 0,
  score = 0,
  combo =  0,
  maxCombo = 0,
  hits = 0,
  misses = 0,
  perfect = 0,
  running = false,
  startTime = 0,
  noteId = 0,
  notes = [],
  raf = 0;
  const songs = [['C', 'a'], ['C', 'a'], ['G', 'g'], ['G', 'g'], ['A', 'h'], ['A', 'h'], ['G', 'g'], ['F', 'f'], ['F', 'f'], ['E', 'd'], ['E', 'd'], ['D', 's'], ['D', 's'], ['C', 'a'], ['G', 'g'], ['G', 'g'], ['F', 'f'], ['F', 'f'], ['E', 'd'], ['E', 'd'], ['D', 's'], ['G', 'g'], ['G', 'g'], ['F', 'f'], ['F', 'f'], ['E', 'd'], ['E', 'd'], ['D', 's']];
  const menu = document.getElementById('menu')
  , how = document.getElementById('how')
  , results = document.getElementById('results');
  function show(x) {
    [menu, how, results].forEach(y => y.classList.add('hidden'));
    x.classList.remove('hidden')
  }
  function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = combo;
    document.getElementById('accuracy').textContent = (hits + misses ? Math.round(hits / (hits + misses) * 100) : 100) + '%';
  }
  function judge(t) {
    const j = document.getElementById('judge');
    j.textContent = t;
    j.className = 'judge show';
    setTimeout(() => {
      j.className = 'judge'
    }, 400);
  }
  function makeNote(k, time) {
    const n = document.createElement('div');
    n.className = 'note';
    n.dataset.key = k;
    const idx = white.indexOf(k);
    n.style.left = (idx * 12.5) + '%';
    n.style.width = '12.5%';
    n.style.background = 'var(--accent)';
    n.style.color = 'var(--accent)';
    document.getElementById('notes').appendChild(n);
    return {
      id: ++noteId,
      key: k,
      time,
      el: n,
      hit: false
    }
  }
  function start() {
    mode = 'songs';
    running = true;
    score = combo = hits = misses = perfect = maxCombo = 0;
    notes.forEach(n => n.el.remove());
    notes =[];
    updateStats();
    show(document.createElement('div'));
    document.getElementById('screen').classList.add('hidden');
    startTime = performance.now() + 1200;
    songSchedule();
    loop();
  }
  function songSchedule() {
    const interval = 620;
    songs.forEach((x, i) => notes.push(makeNote(x[1], startTime + i * interval)));
  }
  function loop(now = performance.now()) {
    if(!running) {
      return;
    }
    const speed = 0.42;
    const hitY = document.getElementById('game').clientHeight - 78;
    for(const n of notes) {
      if(n.hit) {
        continue;
      }
      const dt = n.time -now;
      const y = hitY - dt * speed -20;
      n.el.style.top = y + 'px';
      if(dt < -220) {
        n.hit = true;
        n.el.remove();
        misses++;
        combo = 0;
        judge('MISS');
        updateStats();
      }
    }
    if(notes.every(n => n.hit)) {
      running = false;
      setTimeout(finish, 500);
      return;
    }
    raf = requestAnimationFrame(loop)
  }
  function finish() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalAccuracy').textContent = (hits + misses ? Math.round(hits / (hits + misses) * 100) : 100) + '%';
    document.getElementById('finalCombo').textContent = maxCombo;
    document.getElementById('finalPerfect').textContent = perfect;
    show(results);
    document.getElementById('screen').classList.remove('hidden')
  }
  function free() {
    running = false;
    mode = 'free';
    show(document.createElement('div'));
    document.getElementById('screen').classList.add('hidden');
  }
  function hit(k) {
    sound(k);
    flash(k);
    if(!running || mode !== 'songs') {
      return;
    }
    let best = null
    , bestD = Infinity
    , now = performance.now();
    for(const n of notes) {
      if(n.hit || n.key !== k) {
        continue;
      }
      const d = Math.abs(n.time - now);
      if(d < bestD) {
        best = n;
        bestD = d;
      }
    }
    if(!best || bestD > 180) {
      combo = 0;
      judge('WRONG');
      updateStats();
      return;
    }
    best.hit = true;
    best.el.classList.add('hit');
    hits++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    let pts = bestD < 65 ? (perfect++, 100) : (bestD < 125 ? 70 : 40);
    score += pts + combo * 2;
    judge(bestD < 65 ? 'PERFECT' : bestD < 125 ? 'GOOD' : 'OK');
    updateStats();
  }
  let menuIndex = 0;
  function menuRender() {
    document.querySelectorAll('.option').forEach((e, i) => e.classList.toggle('selected', i === menuIndex))
  }
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if(e.repeat) {
      return;
    }
    if(k === 'escape') {
      cancelAnimationFrame(raf);
      running = false;
      mode = 'menu';
      show(menu);
      document.getElementById('screen').classList.remove('hidden');
      menuIndex = 0;
      menuRender();
      return;
    }
    if(!document.getElementById('screen').classList.contains('hidden')) {
      if(mode === 'mode' || document.querySelector('#menu:not(.hidden)')) {
        menuIndex = (menuIndex + 1) % 3;
        menuRender();
      }
      if(k === 'arrowup') {
        menuIndex = (menuIndex + 2) % 3;
        menuRender();
      }
      if(k === 'enter') {
        if (menuIndex === 0) {
          start()
        } else if(menuIndex === 1) {
          free();
        } else {
          show(how);
          mode = 'how'
        }
      }
      return;
    }
    if(!results.classList.contains('.hidden') && k === 'enter') {
      start();
      return;
    }
    if(!how.classList.contains('hidden') && k === 'enter') {
      show(menu);
      mode = 'menu';
      document.getElementById('screen').classList.remove('hidden');
      return;
    }
  }
  if(k === 'r' && mode === 'songs'){
    start();
    return;
  }
  if(all.includes(k)){
    hits(k);
  }
);
menuRender();
})();