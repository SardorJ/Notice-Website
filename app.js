/* Notice website interactions. Behaviour mirrors the app's defaults
   (NoticeDefaults: reminder every 5 min, red at 10, alarm at 20) and the
   Live Activity ring, which fills once per limit "lap" and restarts in red. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var S = { rem: 5, red: 10, alarm: 20, alarmOn: true, preset: 'balanced' };
  var PRESETS = { mild: [10, 20, 30], balanced: [5, 10, 20], strict: [2, 5, 10] };

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function ringFrac(sec, limitSec) {
    if (sec < limitSec) return sec / limitSec;
    var lap = Math.max(1, Math.floor(sec / limitSec));
    return (sec - lap * limitSec) / limitSec;
  }
  function setRing(svg, frac) {
    var p = svg && svg.querySelector('.prog');
    if (p) p.setAttribute('stroke-dasharray', (Math.max(0, Math.min(1, frac)) * 100).toFixed(2) + ' 100');
  }
  /* Runs start() while el is on screen and the tab is visible, stop() otherwise. */
  function whileVisible(el, start, stop) {
    if (!('IntersectionObserver' in window)) { start(); return; }
    var onScreen = false, running = false;
    var update = function () {
      var want = onScreen && !document.hidden;
      if (want && !running) { running = true; start(); }
      else if (!want && running) { running = false; stop(); }
    };
    new IntersectionObserver(function (es) { onScreen = es[es.length - 1].isIntersecting; update(); }).observe(el);
    document.addEventListener('visibilitychange', update);
  }

  /* Arrow keys move between options in every radio group. */
  document.querySelectorAll('[role=radiogroup]').forEach(function (g) {
    g.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      var bs = Array.prototype.slice.call(g.querySelectorAll('[role=radio]'));
      var i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = bs[(i + d + bs.length) % bs.length];
      n.focus(); n.click();
    });
  });

  /* ---------- hero: the 10-minute moment, in real time ---------- */
  var hero = $('heroStage');
  if (hero) {
    var hT = $('heroTime'), hCap = $('heroCap'), hRing = hero.querySelector('.ring');
    var start = 592, end = 616;
    var renderHero = function (sec) {
      var red = sec >= 600;
      hT.textContent = fmt(sec);
      setRing(hRing, ringFrac(sec, 600));
      hero.classList.toggle('red', red);
      var cap = red ? 'At 10 minutes, the timer turns red.' : 'The timer runs in the Dynamic Island while you scroll.';
      if (hCap.textContent !== cap) hCap.textContent = cap;
    };
    if (reduce) renderHero(604);
    else {
      var hRaf = 0, hT0 = 0, hElapsed = 0;
      var tick = function (now) {
        hElapsed = (now - hT0) / 1000;
        renderHero(start + hElapsed % (end - start));
        hRaf = requestAnimationFrame(tick);
      };
      whileVisible(hero,
        function () { hT0 = performance.now() - hElapsed * 1000; hRaf = requestAnimationFrame(tick); },
        function () { cancelAnimationFrame(hRaf); });
    }
  }

  /* ---------- mini island in "how it works" ---------- */
  var mini = $('miniIsland');
  if (mini && !reduce) {
    var mt = 95, mTimer = 0;
    whileVisible(mini, function () {
      mTimer = setInterval(function () { mt = mt >= 600 ? 95 : mt + 1; $('miniT').textContent = fmt(mt); setRing(mini.querySelector('.ring'), mt / 600); }, 1000);
    }, function () { clearInterval(mTimer); });
  }

  /* ---------- 5 / 10 / 20 demo: scroll position drives the clock ---------- */
  var scrolly = $('scrolly');
  if (scrolly) {
    var D = { rem: 5, red: 10, alarm: 20 };          // always Balanced here
    var AT = [0, 5, 10, 20], END = 25;               // minutes at the top of each beat, and at the end
    var isl = $('dIsland'), ban = $('dBanner'), flash = $('dFlash'), read = $('dRead');
    var beats = Array.prototype.slice.call(document.querySelectorAll('#stages li'));
    var lastSec = -1, queued = false;

    var render = function (t) {
      var remS = D.rem * 60, redS = D.red * 60, alS = D.alarm * 60;
      var isRed = t >= redS, alarmOn = t >= alS;
      $('dTime').textContent = fmt(t);
      read.textContent = fmt(t);
      read.parentNode.classList.toggle('is-red', isRed);
      setRing(isl.querySelector('.ring'), ringFrac(t, redS));
      isl.classList.toggle('is-red', isRed);
      isl.classList.toggle('alarm', alarmOn);
      flash.classList.toggle('on', alarmOn);
      var k = Math.floor(t / remS);
      var showBan = k >= 1 && (t - k * remS) < 180 && !alarmOn;
      if (showBan) {
        var n = k * D.rem;
        $('dBannerT').textContent = n + ' minutes';
        $('dBannerB').textContent = 'You’ve been in the app for ' + n + ' minutes.';
      }
      ban.classList.toggle('show', showBan);
    };
    /* Progress through the tall .scrolly while its stage is pinned. Each beat
       gets an equal share of the scroll, and the clock holds at the end. */
    var SHARE = 0.22, stage = scrolly.querySelector('.stage'), bar = $('dProg'), cur = -1;
    var update = function () {
      queued = false;
      var r = scrolly.getBoundingClientRect();
      var top = parseFloat(getComputedStyle(stage).top) || 0;
      var run = r.height - stage.offsetHeight;
      var p = run > 0 ? Math.min(1, Math.max(0, (top - r.top) / run)) : 0;
      var i = Math.min(AT.length - 1, Math.floor(p / SHARE));
      var next = i + 1 < AT.length ? AT[i + 1] : END;
      var min = p >= SHARE * AT.length ? END : AT[i] + (next - AT[i]) * (p / SHARE - i);
      var active = 0;
      AT.forEach(function (at, j) { if (min >= at) active = j; });
      if (active !== cur) {
        cur = active;
        beats.forEach(function (li, j) { li.classList.toggle('on', j === cur); li.setAttribute('aria-hidden', String(j !== cur)); });
      }
      bar.style.left = (min / END * 100) + '%';
      var sec = Math.round(min * 60);
      if (sec !== lastSec) { lastSec = sec; render(sec); }
    };
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  }

  /* ---------- preview settings: Mild / Balanced / Strict ---------- */
  var sync = function () {
    if (!$('oRem')) return;
    $('oRem').textContent = 'every ' + S.rem + ' min';
    $('oRed').textContent = S.red + ' min';
    $('oAlarm').textContent = S.alarmOn ? S.alarm + ' min' : 'Off';
    $('oAlarmOn').setAttribute('aria-checked', String(S.alarmOn));
  };
  var presetGroups = document.querySelectorAll('[data-presets]');
  var setPreset = function (p) {
    var v = PRESETS[p];
    S.preset = p; S.rem = v[0]; S.red = v[1]; S.alarm = v[2];
    presetGroups.forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.p === p)); });
    });
    sync();
  };
  presetGroups.forEach(function (g) {
    g.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { setPreset(b.dataset.p); });
    });
  });

  /* ---------- app preview ---------- */
  var app = $('app');
  if (app) {
    var hours = [0,0,0,0,0,0,0,4,9,0,0,0,6,0,0,0,0,11,0,12,0,0,0,0];
    var NOWH = 21, total = 42, count = 4, longest = 18;
    var bars = $('pBars');
    bars.innerHTML = hours.map(function (_, i) { return '<i' + (i === NOWH ? ' class="now"' : '') + '></i>'; }).join('');
    var drawBars = function () {
      var mx = Math.max(30, Math.max.apply(null, hours));
      Array.prototype.forEach.call(bars.children, function (b, i) { b.style.height = (hours[i] / mx * 100) + '%'; });
    };
    var mins = function (m) { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + '<small>hr</small> ' + (m % 60) + '<small>min</small>' : m + '<small>min</small>'; };
    var drawTotals = function () {
      $('pTotal').innerHTML = mins(total);
      $('pCount').textContent = count;
      $('pLong').innerHTML = mins(longest);
      drawBars();
    };
    drawTotals();

    var tabs = app.querySelectorAll('[role=tab]');
    var showTab = function (id) {
      tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
      $('pOverview').hidden = id !== 'pOverview';
      $('pSettings').hidden = id !== 'pSettings';
    };
    tabs.forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });

    var sess = null, raf = 0, openBtn = $('pOpen');
    var drawSession = function () {
      var sec = (performance.now() - sess.start) / 1000 * 20;
      sess.sec = sec;
      var redS = S.red * 60, isRed = sec >= redS;
      $('pSessT').textContent = fmt(sec);
      $('pSessNote').textContent = isRed ? fmt(sec - redS) + ' over' : 'Turns red at ' + S.red + ':00';
      $('pSession').classList.toggle('is-red', isRed);
      $('pDIt').textContent = fmt(sec);
      var di = $('pDI'); di.classList.toggle('is-red', isRed);
      setRing(di.querySelector('.ring'), ringFrac(sec, redS));
      raf = requestAnimationFrame(drawSession);
    };
    var startSession = function () {
      sess = { start: performance.now(), sec: 0 };
      $('pReady').hidden = true; $('pSession').hidden = false; $('pDI').classList.add('live');
      openBtn.setAttribute('aria-pressed', 'true'); openBtn.innerHTML = '■&nbsp; Leave the app';
      showTab('pOverview');
      raf = requestAnimationFrame(drawSession);
    };
    var stopSession = function () {
      if (!sess) return;
      cancelAnimationFrame(raf);
      var m = sess.sec / 60;
      total += m; count += 1; longest = Math.max(longest, Math.round(m)); hours[NOWH] += m;
      sess = null;
      $('pReady').hidden = false; $('pSession').hidden = true;
      var di = $('pDI'); di.classList.remove('live', 'is-red');
      openBtn.setAttribute('aria-pressed', 'false'); openBtn.innerHTML = '▶&nbsp; Open a connected app';
      drawTotals();
    };
    openBtn.addEventListener('click', function () { sess ? stopSession() : startSession(); });
    $('pStop').addEventListener('click', stopSession);

    var NOTES = { shared: 'One timer for all your connected apps. Switch apps and it keeps counting.', perApp: 'Each connected app gets its own timer and counts on its own.' };
    $('pMode').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        $('pMode').querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
        $('pModeNote').textContent = NOTES[b.dataset.m];
      });
    });
    $('oAlarmOn').addEventListener('click', function () { S.alarmOn = !S.alarmOn; sync(); });
  }

  /* ---------- screenshot gallery buttons ---------- */
  var gal = $('gallery');
  if (gal && $('gPrev')) {
    var prev = $('gPrev'), next = $('gNext');
    var page = function (dir) {
      var f = gal.querySelector('figure');
      var w = f ? f.getBoundingClientRect().width + 18 : 260;
      gal.scrollBy({ left: dir * w * Math.max(1, Math.floor(gal.clientWidth / w) - 1), behavior: reduce ? 'auto' : 'smooth' });
    };
    var upd = function () {
      prev.disabled = gal.scrollLeft < 4;
      next.disabled = gal.scrollLeft + gal.clientWidth > gal.scrollWidth - 4;
    };
    prev.addEventListener('click', function () { page(-1); });
    next.addEventListener('click', function () { page(1); });
    gal.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }
})();
