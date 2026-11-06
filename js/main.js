/* =========================================================
   L’Ins’temps pour soi — mise en scène (GSAP + ScrollTrigger + Lenis)
   Règles : animer uniquement transform / opacity, courbes douces (power3 / expo),
   prefers-reduced-motion respecté, version allégée sur mobile.
   ========================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  var FX = html.classList.contains('fx');
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  var lenis = null;

  /* =======================================================
     1. Fonctions indépendantes de GSAP (toujours actives)
     ======================================================= */

  /* ---- Menu mobile ---- */
  var burger = $('#burger'), mmenu = $('#mmenu'), nav = $('#nav');
  function setMenu(open) {
    if (!mmenu) return;
    mmenu.classList.toggle('open', open);
    mmenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) nav.classList.remove('hide');
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!mmenu.classList.contains('open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); closeLb(); } });

  /* ---- Navigation : se cache en descendant, revient en remontant ---- */
  var lastY = 0, ticking = false;
  function onScrollUi() {
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle('solid', y > 60);
    if (!mmenu.classList.contains('open')) {
      if (y > lastY + 6 && y > 320) nav.classList.add('hide');
      else if (y < lastY - 6 || y < 200) nav.classList.remove('hide');
    }
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var bar = $('.progress i'); if (bar && max > 0) bar.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScrollUi); } }, { passive: true });
  onScrollUi();

  /* ---- Ancres (compatibles smooth scroll) ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href');
    var target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault(); setMenu(false);
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.7, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else if (id === '#top') window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    if (id !== '#top') history.replaceState(null, '', id);
  });

  /* ---- FAQ (accordéon accessible) ---- */
  $$('.acc-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var item = b.closest('.acc-item');
      var open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 800);
    });
  });

  /* ---- Lightbox galerie ---- */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), items = $$('[data-gal]'), cur = 0, lastFocus = null;
  function showLb(i) {
    cur = (i + items.length) % items.length;
    var it = items[cur], im = $('img', it);
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt;
    lbCap.textContent = it.getAttribute('data-cap') || '';
  }
  function openLb(i) {
    lastFocus = document.activeElement; showLb(i);
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('open'); $('#lbClose').focus(); });
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('open');
    setTimeout(function () { lb.hidden = true; }, 500);
    if (lenis) lenis.start(); else document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (it, i) {
    it.setAttribute('tabindex', '0'); it.setAttribute('role', 'button');
    it.setAttribute('aria-label', 'Agrandir la photo : ' + (it.getAttribute('data-cap') || ''));
    it.addEventListener('click', function () { openLb(i); });
    it.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } });
  });
  if (lb) {
    $('#lbClose').addEventListener('click', closeLb);
    $('#lbPrev').addEventListener('click', function () { showLb(cur - 1); });
    $('#lbNext').addEventListener('click', function () { showLb(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'ArrowLeft') showLb(cur - 1);
      if (e.key === 'ArrowRight') showLb(cur + 1);
    });
  }

  /* ---- Carrousel d’avis ---- */
  (function carousel() {
    var root = $('#carousel'); if (!root) return;
    var vp = $('.car-viewport', root), track = $('.car-track', root), slides = $$('.slide', root), dotsEl = $('#carDots');
    var i = 0, gap = 24, timer = null, dragging = false, startX = 0, dx = 0, hover = false;
    dotsEl.innerHTML = slides.map(function (s, k) { return '<button type="button" role="tab" aria-label="Avis ' + (k + 1) + '" aria-selected="' + (k === 0) + '"></button>'; }).join('');
    var dots = $$('button', dotsEl);
    function w() { return slides[0].offsetWidth + gap; }
    function set(n, animate) {
      i = (n + slides.length) % slides.length;
      track.style.transition = animate === false ? 'none' : 'transform 1s cubic-bezier(.16,1,.3,1)';
      track.style.transform = 'translate3d(' + (-i * w()) + 'px,0,0)';
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); s.style.opacity = k === i ? '1' : '.55'; s.style.transition = 'opacity .8s'; });
      // la hauteur suit l’avis affiché : pas de grand vide sous les cartes courtes
      vp.style.transition = animate === false ? 'none' : 'height .7s cubic-bezier(.16,1,.3,1)';
      vp.style.height = slides[i].offsetHeight + 'px';
    }
    $('#carPrev').addEventListener('click', function () { set(i - 1); restart(); });
    $('#carNext').addEventListener('click', function () { set(i + 1); restart(); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { set(k); restart(); }); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') set(i - 1); if (e.key === 'ArrowRight') set(i + 1); });
    vp.addEventListener('pointerdown', function (e) { dragging = true; startX = e.clientX; dx = 0; track.style.transition = 'none'; vp.setPointerCapture(e.pointerId); });
    vp.addEventListener('pointermove', function (e) { if (!dragging) return; dx = e.clientX - startX; track.style.transform = 'translate3d(' + (-i * w() + dx) + 'px,0,0)'; });
    function end() { if (!dragging) return; dragging = false; if (dx < -60) set(i + 1); else if (dx > 60) set(i - 1); else set(i); restart(); }
    vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
    // défilement automatique seulement entre vrais avis (pas vers les emplacements vides)
    var real = slides.map(function (s, k) { return s.classList.contains('slide--empty') ? -1 : k; }).filter(function (k) { return k > -1; });
    function restart() {
      clearInterval(timer);
      if (RM || real.length < 2) return;
      timer = setInterval(function () {
        if (hover || document.hidden) return;
        var p = real.indexOf(i); set(real[(p + 1) % real.length]);
      }, 8000);
    }
    root.addEventListener('mouseenter', function () { hover = true; }); root.addEventListener('mouseleave', function () { hover = false; });
    root.addEventListener('focusin', function () { hover = true; }); root.addEventListener('focusout', function () { hover = false; });
    window.addEventListener('resize', function () { set(i, false); });
    window.addEventListener('load', function () { set(i, false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { set(i, false); });
    set(0, false); restart();
  })();

  /* ---- Compteurs (valeur finale si pas d’animation) ---- */
  function fmt(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); }
  $$('.count').forEach(function (el) { if (RM || !hasGsap) el.textContent = fmt(parseFloat(el.getAttribute('data-to')), parseInt(el.getAttribute('data-dec') || 0, 10)); });

  if (!hasGsap) { fallbackNoGsap(); return; }

  /* =======================================================
     2. GSAP / ScrollTrigger
     ======================================================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---- Smooth scroll ---- */
  if (!RM && FX && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---- Découpage de texte (masques qui montent) ---- */
  function splitText(el, mode, skip) {
    var out = [];
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var txt = n.nodeValue; if (!txt.trim()) return;
          var frag = document.createDocumentFragment();
          var parts = mode === 'chars' ? Array.from(txt) : txt.split(/(\s+)/);
          parts.forEach(function (p) {
            if (!p) return;
            if (mode === 'words') {
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'sw'; w.setAttribute('aria-hidden', 'true');
              var i = document.createElement('span'); i.className = 'si'; i.textContent = p; w.appendChild(i); frag.appendChild(w); out.push(i);
            } else {
              var c = document.createElement('span'); c.className = 'ch'; c.setAttribute('aria-hidden', 'true');
              var ci = document.createElement('span'); ci.className = 'chi'; ci.textContent = p; c.appendChild(ci); frag.appendChild(c); out.push(ci);
            }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !(skip && n.matches(skip))) walk(n);
      });
    })(el);
    return out;
  }

  /* ---- Vidéos : lecture seulement quand visibles ---- */
  function initVideos() {
    var saveData = navigator.connection && navigator.connection.saveData;
    $$('video').forEach(function (v) {
      var lazy = v.hasAttribute('data-src');
      if (RM || saveData || (lazy && !FX)) { v.removeAttribute('autoplay'); try { v.pause(); } catch (e) {} return; }
      if (!('IntersectionObserver' in window)) { v.play && v.play().catch(function () {}); return; }
      new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting) {
            if (lazy && !v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); }
            var p = v.play(); if (p && p.catch) p.catch(function () {});
          } else v.pause();
        });
      }, { rootMargin: '300px' }).observe(v);
    });
  }

  /* ---- Pétales qui flottent (hero) ---- */
  function initPetals() {
    var box = $('.hero-petals'); if (!box || RM) return;
    var n = FX ? 14 : 7;
    for (var k = 0; k < n; k++) {
      var p = document.createElement('span'); p.className = 'petal';
      var s = rand(14, 42);
      p.style.cssText = 'left:' + rand(2, 96) + '%;top:' + rand(5, 92) + '%;width:' + s + 'px;height:' + (s * 1.6) + 'px;opacity:' + rand(.25, .7).toFixed(2);
      p.innerHTML = '<svg aria-hidden="true"><use href="#i-petal"/></svg>';
      box.appendChild(p);
      gsap.set(p, { rotation: rand(-90, 90) });
      gsap.to(p, { y: '+=' + rand(40, 120), x: '+=' + rand(-60, 60), rotation: '+=' + rand(-80, 80), duration: rand(6, 11), ease: 'sine.inOut', repeat: -1, yoyo: true });
    }
  }

  /* ---- Préparation des états initiaux de l’intro ---- */
  var heroChars = [];
  if (!RM) {
    $$('.hero-title .hw').forEach(function (w) { heroChars = heroChars.concat(splitText(w, 'chars')); });
    gsap.set(heroChars, { yPercent: 125 });
    gsap.set('.hero-title .paren', { opacity: 0, scaleY: 0.2 });
    gsap.set(['.hero-eyebrow', '.hero-lead', '.hero-cta', '.hero-meta li', '.hero-scroll'], { autoAlpha: 0, y: 34 });
    nav.style.transition = 'none'; nav.classList.add('hide');
    requestAnimationFrame(function () { nav.style.transition = ''; });
  }

  function heroIntro() {
    if (RM) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero-media', { scale: 1.28 }, { scale: 1.02, duration: 3.2 }, 0)
      .to(heroChars, { yPercent: 0, duration: 1.5, stagger: { each: 0.045, from: 'start' } }, 0.1)
      .to('.hero-title .paren', { opacity: 1, scaleY: 1, duration: 1.6, stagger: 0.12 }, 0.5)
      .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 1.1 }, 0.3)
      .to('.hero-lead', { autoAlpha: 1, y: 0, duration: 1.2 }, 0.9)
      .to('.hero-cta', { autoAlpha: 1, y: 0, duration: 1.2 }, 1.05)
      .to('.hero-meta li', { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 1.3)
      .to('.hero-scroll', { autoAlpha: 1, y: 0, duration: 1 }, 1.5)
      .add(function () { nav.classList.remove('hide'); }, 0.9);
  }

  /* ---- Préchargeur ---- */
  function runLoader(done) {
    var loader = $('#loader');
    if (!loader || RM) { done(); return; }
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    var top = $('.ld-top'), bot = $('.ld-bot'), num = $('#ldNum'), ring = $('.ld-ring circle');
    var topChars = splitText(top, 'chars');
    var counter = { v: 0 }, ready = false, animDone = false, exited = false;
    gsap.set(bot, { opacity: 0, y: 20 });

    var tl = gsap.timeline({ onComplete: function () { animDone = true; tryExit(); } });
    tl.to(topChars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0.15)
      .to(bot, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, 0.7)
      .to(ring, { strokeDashoffset: 0.12, duration: 2, ease: 'power2.inOut' }, 0.1)
      .to(counter, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(counter.v); } }, 0.1);

    function onReady() { ready = true; tryExit(); }
    if (document.readyState === 'complete') onReady(); else window.addEventListener('load', onReady);
    setTimeout(function () { ready = true; tryExit(); }, 4500);
    setTimeout(function () { ready = true; animDone = true; tryExit(); }, 7000);

    function tryExit() {
      if (exited || !ready || !animDone) return; exited = true;
      var ex = gsap.timeline({ onComplete: function () { loader.style.display = 'none'; document.body.style.overflow = ''; if (lenis) lenis.start(); ScrollTrigger.refresh(); } });
      ex.to('.ld-center', { opacity: 0, scale: 0.94, duration: 0.55, ease: 'power2.in' }, 0)
        .to('.ld-l', { xPercent: -132, duration: 1.35, ease: 'expo.inOut' }, 0.4)
        .to('.ld-r', { xPercent: 132, duration: 1.35, ease: 'expo.inOut' }, 0.4)
        .add(done, 0.75);
    }
  }

  /* ---- Hero : parallax multicouche + souris ---- */
  function initHero() {
    if (RM) return;
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    tl.to('.hero-media', { yPercent: 14, ease: 'none' }, 0)
      .to('.hero-rings', { yPercent: -16, ease: 'none' }, 0)
      .to('.hero-petals', { yPercent: -48, ease: 'none' }, 0)
      .to('.hero-content', { yPercent: -10, opacity: 0.1, ease: 'none' }, 0)
      .to('.hero-meta,.hero-scroll', { opacity: 0, ease: 'none' }, 0);
    if (FX && FINE) {
      var rx = gsap.quickTo('.hero-rings', 'x', { duration: 1.4, ease: 'power3.out' }), ry = gsap.quickTo('.hero-rings', 'y', { duration: 1.4, ease: 'power3.out' });
      var px = gsap.quickTo('.hero-petals', 'x', { duration: 1.8, ease: 'power3.out' }), py = gsap.quickTo('.hero-petals', 'y', { duration: 1.8, ease: 'power3.out' });
      $('#hero').addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        rx(nx * -40); ry(ny * -30); px(nx * 70); py(ny * 50);
      });
    }
  }

  /* ---- Marquee réactif au scroll ---- */
  function initMarquee() {
    var rows = $$('.mq-row').map(function (r) { return { inner: $('.mq-inner', r), x: 0, dir: r.getAttribute('data-dir') === 'right' ? 1 : -1, half: 0 }; });
    if (!rows.length) return;
    function measure() { rows.forEach(function (s) { s.half = s.inner.scrollWidth / 2; }); }
    measure(); window.addEventListener('resize', measure); window.addEventListener('load', measure);
    rows[1] && (rows[1].x = -rows[1].half / 2);
    if (RM) return;
    var last = window.scrollY, boost = 0, dirF = 1, visible = true;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe($('.marquee'));
    gsap.ticker.add(function (time, dt) {
      if (!visible) return;
      var y = window.scrollY, d = y - last; last = y;
      boost += (d - boost) * 0.12;
      dirF += ((boost < -0.6 ? -1 : 1) - dirF) * 0.07;
      var mult = 1 + Math.min(Math.abs(boost) * 0.1, 7);
      rows.forEach(function (s, i) {
        var base = (i === 0 ? 70 : 52) * s.dir * dirF * mult;
        s.x += base * dt / 1000;
        if (s.half) { if (s.x <= -s.half) s.x += s.half; if (s.x > 0) s.x -= s.half; }
        s.inner.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
      });
    });
  }

  /* ---- Histoire : section pinnée, storytelling étape par étape ---- */
  function initStory() {
    var pin = $('.story-pin'); if (!pin) return;
    if (!FX) return;
    var steps = $$('.step', pin), imgs = $$('.arch-img', pin), N = steps.length, cur = $('#storyCur');
    gsap.set(steps.slice(1), { autoAlpha: 0, y: 50 });
    imgs.slice(1).forEach(function (f) { gsap.set(f, { yPercent: 100 }); gsap.set($('img', f), { yPercent: -100, scale: 1.25 }); });
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin, start: 'top top', end: '+=' + (N * 85) + '%', pin: true, scrub: 0.7, anticipatePin: 1,
        onUpdate: function (self) {
          var k = Math.min(N - 1, Math.floor(self.progress * N + 0.18));
          var t = pad(k + 1); if (cur.textContent !== t) cur.textContent = t;
        }
      }
    });
    for (var i = 1; i < N; i++) {
      var t = i - 0.38;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: 0.3, ease: 'power2.in' }, t)
        .to(imgs[i], { yPercent: 0, duration: 0.75, ease: 'power2.inOut' }, t)
        .to($('img', imgs[i]), { yPercent: 0, scale: 1, duration: 0.75, ease: 'power2.inOut' }, t)
        .to(steps[i], { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, t + 0.32);
    }
    tl.to('.orbit', { rotation: 200, transformOrigin: '50% 50%', duration: N }, 0)
      .to('.story-bar i', { scaleX: 1, duration: N }, 0)
      .to($('img', imgs[0]), { scale: 1.12, duration: 1.4 }, 0);
  }

  /* ---- Soins : défilement horizontal piloté par le scroll vertical ---- */
  function initHorizontal() {
    var pin = $('.hs-pin'), track = $('.hs-track'); if (!pin || !FX) return;
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true }
    });
    gsap.to('.hs-bar i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, scrub: true, invalidateOnRefresh: true } });

    $$('.hp').forEach(function (panel, idx) {
      if (idx === 0) return;
      var targets = $$('.hp-num, .hp .h3, .hp-note, .hp-link, .pr, .pr-sub, .epil-extra h4, .eyebrow, .end-title, .hp-end .btn', panel);
      var st = { trigger: panel, containerAnimation: tween, start: 'left 78%', toggleActions: 'play none none reverse' };
      var media = $('.hp-media, .paper', panel);
      if (media) gsap.from(media, { y: 70, opacity: 0, scale: 0.94, duration: 1.2, ease: 'power3.out', scrollTrigger: st });
      gsap.from(targets, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, scrollTrigger: st });
    });
    var parens = $$('.hp-end .paren');
    gsap.from(parens, { scaleY: 0.2, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: '.hp-end', containerAnimation: tween, start: 'left 80%', toggleActions: 'play none none reverse' } });
  }

  /* ---- Titres : mots qui montent ---- */
  function initHeadings() {
    if (RM) return;
    $$('[data-split="words"]').forEach(function (h) {
      var words = splitText(h, 'words');
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({
        trigger: h, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.055 }); }
      });
    });
  }

  /* ---- Apparitions génériques ---- */
  function initReveals() {
    if (RM) return;
    var sel = '.eyebrow:not(.hero-eyebrow), .sec-head .lead, .lead, .promises li, .labels, .rate, .car-ctrl, .info > div, .access-btns, .acc-item, .foot-cols > div, .foot-quote, .book-notes li, .big-tel, .book-addr, .num-grid li, .g-pano, .credit, .center .btn, .hp-link';
    var els = $$(sel).filter(function (el) {
      if (FX && (el.closest('.hs') || el.closest('.story'))) return false;
      if (el.closest('.hero') || el.closest('.carousel')) return false;
      return true;
    });
    els.forEach(function (el) { el.setAttribute('data-reveal', ''); });
    gsap.set(els, { y: 44 });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.09, overwrite: true }); }
    });
    // Version mobile des étapes d’histoire et des panneaux de soins (empilés)
    if (!FX) {
      $$('.step, .hp-media, .paper, .hp-body').forEach(function (el) {
        el.setAttribute('data-reveal', ''); gsap.set(el, { y: 50 });
        ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }); } });
      });
    }
  }

  /* ---- Cartes 3D (rituels) + galerie ---- */
  function tilt(el, max) {
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-(py - 0.5) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
  function initCards() {
    if (!RM) {
      gsap.from('.card-wrap', { y: 100, rotationX: -28, opacity: 0, transformOrigin: '50% 100%', duration: 1.4, ease: 'power3.out', stagger: 0.14, scrollTrigger: { trigger: '.cards', start: 'top 80%', once: true } });
    }
    if (FINE && !RM) { $$('[data-tilt]').forEach(function (c) { tilt(c, 11); }); $$('.g-item').forEach(function (c) { tilt(c, 5); }); }
  }
  function initGallery() {
    if (RM) return;
    var speed = FX ? 800 : 300;
    $$('.g-col').forEach(function (col) {
      var s = parseFloat(col.getAttribute('data-speed') || 0);
      if (!s) return;
      gsap.fromTo(col, { y: s * speed }, { y: -s * speed, ease: 'none', scrollTrigger: { trigger: '.g-cols', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.g-item').forEach(function (it) {
      gsap.fromTo($('img', it), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(it, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 92%', once: true } });
    });
    var pano = $('.g-pano img');
    if (pano) gsap.fromTo(pano, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.g-pano', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---- Produits : disque qui s’ouvre ---- */
  function initProducts() {
    if (RM) return;
    var tl = gsap.timeline({ scrollTrigger: { trigger: '.prod-visual', start: 'top 88%', end: 'top 30%', scrub: 0.8 } });
    tl.fromTo('.disc', { scale: 0.08 }, { scale: 1, ease: 'power2.out' }, 0)
      .fromTo('.disc img', { scale: 2.4 }, { scale: 1, ease: 'power2.out' }, 0)
      .fromTo('.petal-img', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, ease: 'back.out(1.6)', duration: 0.5 }, 0.5);
    gsap.fromTo('.disc-ring', { rotation: -60 }, { rotation: 140, ease: 'none', scrollTrigger: { trigger: '.prod-visual', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---- Chiffres clés ---- */
  function initNumbers() {
    if (RM) return;
    $$('.num-ring circle').forEach(function (c) {
      c.setAttribute('pathLength', '1'); c.style.strokeDasharray = '1'; c.style.strokeDashoffset = '1';
      gsap.to(c, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: c, start: 'top 85%', once: true } });
    });
    $$('.count').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-to')), dec = parseInt(el.getAttribute('data-dec') || 0, 10), o = { v: 0 };
      el.textContent = fmt(0, dec);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(o, { v: to, duration: 2.6, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v, dec); } }); }
      });
    });
  }

  /* ---- Pied de page : grand nom ---- */
  function initFooter() {
    var g = $('#footGiant'); if (!g || RM) return;
    var chars = splitText(g, 'chars', 'em');
    gsap.set(chars, { yPercent: 115 });
    var em = $('em', g); gsap.set(em, { opacity: 0, y: 40 });
    ScrollTrigger.create({
      trigger: g, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(chars, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.04 });
        gsap.to(em, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 0.5 });
      }
    });
    g.removeAttribute('aria-hidden'); g.setAttribute('aria-label', 'L’Ins’temps pour soi');
  }

  /* ---- Boutons magnétiques + curseur ---- */
  function initMagnetic() {
    if (!(FX && FINE) || RM) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.32, y: (e.clientY - (r.top + r.height / 2)) * 0.42, duration: 0.5, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', function () { gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,0.4)' }); });
    });
    var cur = $('.cursor');
    var cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3.out' });
    window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); cur.style.opacity = '1'; });
    document.addEventListener('pointerleave', function () { cur.style.opacity = '0'; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      cur.classList.toggle('is-view', !!t.closest('[data-gal]'));
      cur.classList.toggle('is-link', !!t.closest('a,button,[data-tilt],input,textarea,label') && !t.closest('[data-gal]'));
    });
  }

  /* =======================================================
     3. Orchestration
     ======================================================= */
  try {
    // Les sections pinnées d’abord (ordre du DOM), puis le reste
    initVideos();
    initPetals();
    initStory();
    initHorizontal();
    initHero();
    initMarquee();
    initHeadings();
    initReveals();
    initCards();
    initGallery();
    initProducts();
    initNumbers();
    initFooter();
    initMagnetic();
    runLoader(heroIntro);
  } catch (err) {
    console.error(err);
    html.classList.add('rm'); html.classList.remove('fx');
    var ld = $('#loader'); if (ld) ld.style.display = 'none';
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    nav.classList.remove('hide');
    $$('[data-reveal]').forEach(function (e) { e.style.opacity = 1; e.style.transform = 'none'; });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  // Changement de mise en page (bureau ↔ mobile) : on recharge proprement
  var mq = window.matchMedia('(min-width: 901px)');
  var onBp = function () { location.reload(); };
  if (mq.addEventListener) mq.addEventListener('change', onBp); else if (mq.addListener) mq.addListener(onBp);

  /* ---- Repli : pas de GSAP (CDN/blocage) → site lisible, sans animation ---- */
  function fallbackNoGsap() {
    html.classList.add('rm'); html.classList.remove('fx');
    var ld = $('#loader'); if (ld) ld.style.display = 'none';
  }
})();
