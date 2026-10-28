/* Notice website interactions. Behaviour mirrors the app's defaults
   (NoticeDefaults: reminder every 5 min, red at 10, alarm at 20) and the
   Live Activity ring, which fills once per limit "lap" and restarts in red. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var S = { rem: 5, red: 10, alarm: 20, alarmOn: true };

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

  /* ---------- hero: the 10-minute moment, in real time ---------- */
  var hero = $('heroStage');
  if (hero) {
    var hT = $('heroTime'), hCap = $('heroCap'), hRing = hero.querySelector('.ring');
    var start = 592, end = 616, t0 = performance.now();
    var renderHero = function (sec) {
      var red = sec >= 600;
      hT.textContent = fmt(sec);
      setRing(hRing, ringFrac(sec, 600));
      hero.classList.toggle('red', red);
      var cap = red ? 'At 10 minutes the timer turns red.' : 'The timer runs in the Dynamic Island while you scroll.';
      if (hCap.textContent !== cap) hCap.textContent = cap;
    };
    if (reduce) renderHero(604);
    else (function tick(now) {
      var sec = start + ((now - t0) / 1000) % (end - start);
      renderHero(sec);
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- mini island in "how it works" ---------- */
  var mini = $('miniIsland');
  if (mini && !reduce) {
    var mt = 95;
    setInterval(function () { mt = mt >= 600 ? 95 : mt + 1; $('miniT').textContent = fmt(mt); setRing(mini.querySelector('.ring'), mt / 600); }, 1000);
  }

  /* ---------- 5 / 10 / 20 demo ---------- */
  var screen = $('demoScreen');
  var demo = null;
  if (screen) {
    var range = $('dRange'), isl = $('dIsland'), ban = $('dBanner'), flash = $('dFlash');
    var playBtn = $('dPlay'), playIc = $('dPlayIc'), stages = document.querySelectorAll('#stages li');
    var SPEED = 75;                // simulated seconds per real second
    var t = 0, playing = false, last = 0, holdUntil = 0, userTouched = false;

    var maxSec = function () { return Math.max(25, (S.alarmOn ? S.alarm : S.red) + 5) * 60; };
    var setPlaying = function (p) {
      playing = p;
      playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
      playIc.innerHTML = p ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
      if (p) { last = performance.now(); if (t >= maxSec()) t = 0; requestAnimationFrame(loop); }
    };
    var drawTicks = function () {
      var max = maxSec(), el = $('dTicks'), h = '';
      var marks = [[S.rem, '#4fe3ff'], [S.red, '#ff4f58']];
      if (S.alarmOn) marks.push([S.alarm, '#ff9a3d']);
      marks.forEach(function (m) { h += '<span style="left:' + (m[0] * 60 / max * 100) + '%;color:' + m[1] + '">' + m[0] + '</span>'; });
      el.innerHTML = h;
      range.max = max;
    };
    var render = function () {
      var min = t / 60, remS = S.rem * 60, redS = S.red * 60, alS = S.alarm * 60;
      var isRed = t >= redS;
      var alarmOn = S.alarmOn && t >= alS && t < alS + SPEED * 5;
      $('dTime').textContent = fmt(t);
      setRing(isl.querySelector('.ring'), ringFrac(t, redS));
      isl.classList.toggle('is-red', isRed);
      isl.classList.toggle('alarm', alarmOn);
      flash.classList.toggle('on', alarmOn);
      var k = Math.floor(t / remS);
      var showBan = k >= 1 && (t - k * remS) < SPEED * 2.4 && !(S.alarmOn && k * remS === alS) && !alarmOn;
      if (showBan) {
        var n = k * S.rem;
        $('dBannerT').textContent = n + ' minutes';
        $('dBannerB').textContent = 'You’ve been in the app for ' + n + ' minutes.';
      }
      ban.classList.toggle('show', showBan);
      range.value = Math.round(t);
      $('dRead').textContent = Math.floor(min) + ' min';
      var cur = 0;
      stages.forEach(function (li, i) {
        var key = li.dataset.k, at = key ? S[key] : 0;
        if (key === 'alarm' && !S.alarmOn) return;
        if (min >= at) cur = i;
      });
      stages.forEach(function (li, i) { li.classList.toggle('on', i === cur); });
    };
    var loop = function (now) {
      if (!playing) return;
      var dt = (now - last) / 1000; last = now;
      if (now < holdUntil) { requestAnimationFrame(loop); return; }
      t += dt * SPEED;
      if (t >= maxSec()) {
        t = maxSec(); render();
        if (userTouched) { setPlaying(false); return; }
        holdUntil = now + 1500; t = 0;
      }
      render();
      requestAnimationFrame(loop);
    };
    playBtn.addEventListener('click', function () { userTouched = true; setPlaying(!playing); });
    range.addEventListener('input', function () { userTouched = true; t = +range.value; if (playing) setPlaying(false); render(); });
    stages.forEach(function (li) {
      li.querySelector('button').addEventListener('click', function () {
        userTouched = true;
        var key = li.dataset.k; t = (key ? S[key] : 0) * 60 + 1; render();
        if (!playing) setPlaying(true);
      });
    });
    drawTicks(); render();
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !userTouched && !playing) setPlaying(true);
          if (!e.isIntersecting && playing && !userTouched) setPlaying(false);
        });
      }, { threshold: 0.35 }).observe(screen);
    }
    demo = { refresh: function () { drawTicks(); if (t > maxSec()) t = maxSec(); render(); } };
  }

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

    var tabs = app.querySelectorAll('[role=tab]');
    var showTab = function (id) {
      tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
      $('pOverview').hidden = id !== 'pOverview';
      $('pSettings').hidden = id !== 'pSettings';
    };
    tabs.forEach(function (b) { b.addEventListener('click', function () { showTab(b.dataset.tab); }); });

    var PRESETS = { mild: [10, 20, 30], balanced: [5, 10, 20], strict: [2, 5, 10] };
    var syncSettings = function () {
      $('oRem').textContent = 'every ' + S.rem + ' min';
      $('oRed').textContent = S.red + ' min';
      $('oAlarm').textContent = S.alarmOn ? S.alarm + ' min' : 'Off';
      $('oAlarmOn').setAttribute('aria-checked', String(S.alarmOn));
      document.querySelectorAll('[data-v]').forEach(function (el) {
        var v = S[el.dataset.v];
        if (el.classList.contains('m')) el.innerHTML = v + '<small>min</small>'; else el.textContent = v;
      });
      var q = document.querySelector('#stages q');
      if (q) q.textContent = 'You’ve been in the app for ' + S.rem + ' minutes.';
      var al = document.querySelector('#stages li[data-k=alarm]');
      if (al) al.style.display = S.alarmOn ? '' : 'none';
      var name = { mild: 'Mild', balanced: 'Balanced', strict: 'Strict' }[S.preset];
      var lead = document.querySelector('#demo .head p:last-child');
      if (lead) lead.textContent = 'Press play, or drag the slider. This is the ' + name + ' setting, sped up.';
      if (demo) demo.refresh();
    };
    var radios = function (group, attr, val) {
      group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset[attr] === val)); });
    };
    S.preset = 'balanced';
    $('pPreset').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = PRESETS[b.dataset.p]; S.preset = b.dataset.p;
        S.rem = v[0]; S.red = v[1]; S.alarm = v[2];
        radios($('pPreset'), 'p', b.dataset.p); syncSettings();
      });
    });
    var NOTES = { shared: 'One timer for all your connected apps. Switch apps and it keeps counting.', perApp: 'Each connected app gets its own timer and counts on its own.' };
    $('pMode').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { radios($('pMode'), 'm', b.dataset.m); $('pModeNote').textContent = NOTES[b.dataset.m]; });
    });
    $('oAlarmOn').addEventListener('click', function () { S.alarmOn = !S.alarmOn; syncSettings(); });
  }
})();
