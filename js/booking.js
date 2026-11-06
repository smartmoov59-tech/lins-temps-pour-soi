/* =========================================================
   Réservation 100 % statique — aucun serveur, aucun abonnement
   La demande est préparée côté navigateur, puis :
   • SMS pré-rempli (sms:)  • appel (tel:)  • fichier agenda (.ics)  • copier le message
   ========================================================= */
(function () {
  'use strict';

  var PHONE = '+33645779948';
  var PHONE_TXT = '06 45 77 99 48';
  var PLACE = '15 rue des Myosotis, 04000 Digne-les-Bains';

  var CATS = [
    { id: 'visage', label: 'Visage' },
    { id: 'corps', label: 'Corps' },
    { id: 'modelages', label: 'Modelages' },
    { id: 'epil', label: 'Épilations' }
  ];

  // dur = durée en minutes (si connue) ; price en euros
  var SERVICES = [
    { id: 'v-douceur', cat: 'visage', name: 'Parenthèse douceur visage', sub: '30 min', dur: 30, price: 40 },
    { id: 'v-plaisir', cat: 'visage', name: 'Parenthèse plaisir visage', sub: '60 min', dur: 60, price: 60 },
    { id: 'v-bienetre', cat: 'visage', name: 'Parenthèse bien-être visage', sub: '90 min', dur: 90, price: 80 },
    { id: 'v-extreme', cat: 'visage', name: 'Parenthèse relaxation extrême visage', sub: '120 min · avec modelage du dos 30 min', dur: 120, price: 100 },
    { id: 'v-yeux', cat: 'visage', name: 'Soin contour des yeux', sub: '', price: 35 },

    { id: 'c-eclat', cat: 'corps', name: 'Parenthèse éclat corps', sub: '30 min · gommage et huile', dur: 30, price: 40 },
    { id: 'c-relax', cat: 'corps', name: 'Parenthèse relaxante corps', sub: '30 min · partie du corps au choix', dur: 30, price: 40 },
    { id: 'c-plaisir', cat: 'corps', name: 'Parenthèse plaisir corps', sub: '60 min · modelage relaxant', dur: 60, price: 60 },
    { id: 'c-bienetre', cat: 'corps', name: 'Parenthèse bien-être corps', sub: '90 min · gommage et modelage', dur: 90, price: 80 },
    { id: 'c-extreme', cat: 'corps', name: 'Parenthèse relaxation extrême corps', sub: '120 min · gommage, modelage corps et visage', dur: 120, price: 100 },

    { id: 'm-suedois', cat: 'modelages', name: 'Modelage suédois', sub: 'tonique et relaxant', price: 70 },
    { id: 'm-abhyanga', cat: 'modelages', name: 'Modelage ayurvédique abhyanga', sub: 'énergisant et enveloppant', price: 70 },
    { id: 'm-signature', cat: 'modelages', name: 'Modelage signature Beauté Simple', sub: '40 min · visage', dur: 40, price: 40 },
    { id: 'm-yeux', cat: 'modelages', name: 'Modelage relaxant du contour des yeux', sub: '20 min', dur: 20, price: 15 },

    { id: 'e-sourcils', cat: 'epil', name: 'Épilation sourcils', sub: '', price: 10 },
    { id: 'e-levres', cat: 'epil', name: 'Épilation lèvres', sub: '', price: 7 },
    { id: 'e-bas-visage', cat: 'epil', name: 'Épilation bas du visage', sub: '', price: 10 },
    { id: 'e-visage', cat: 'epil', name: 'Épilation visage', sub: '', price: 18 },
    { id: 'e-aisselles', cat: 'epil', name: 'Épilation aisselles', sub: '', price: 10 },
    { id: 'e-bras', cat: 'epil', name: 'Épilation bras', sub: '', price: 15 },
    { id: 'e-maillot-classique', cat: 'epil', name: 'Épilation maillot classique', sub: '', price: 10 },
    { id: 'e-maillot-echancre', cat: 'epil', name: 'Épilation maillot échancré', sub: '', price: 15 },
    { id: 'e-maillot-integral', cat: 'epil', name: 'Épilation maillot intégral', sub: '', price: 22 },
    { id: 'e-demi-jambes', cat: 'epil', name: 'Épilation demi-jambes', sub: '', price: 16 },
    { id: 'e-jambes', cat: 'epil', name: 'Épilation jambes complètes', sub: '', price: 23 },
    { id: 'f-levres-sourcils', cat: 'epil', name: 'Forfait lèvres + sourcils', sub: '', price: 15 },
    { id: 'f-demi', cat: 'epil', name: 'Forfait demi-jambes + maillot classique + aisselles', sub: '', price: 32 },
    { id: 'f-jambes', cat: 'epil', name: 'Forfait jambes complètes + maillot classique + aisselles', sub: '', price: 40 },
    { id: 's-echancre', cat: 'epil', name: 'Supplément maillot échancré', sub: 'avec un forfait', price: 5 },
    { id: 's-integral', cat: 'epil', name: 'Supplément maillot intégral', sub: 'avec un forfait', price: 10 }
  ];

  var byId = {};
  SERVICES.forEach(function (s) { byId[s.id] = s; });

  var state = { sel: [], cat: 'visage', step: 1, date: null, moment: '', time: '' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function euro(n) { return n + ' €'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var tabsEl = $('#svcTabs'), listEl = $('#svcList'), sumEl = $('#selSum');
  if (!tabsEl || !listEl) return;

  /* ---------- Sélection ---------- */
  function totals() {
    var price = 0, dur = 0, unknown = false;
    state.sel.forEach(function (id) {
      var s = byId[id]; price += s.price;
      if (s.dur) dur += s.dur; else if (s.cat !== 'epil' || id.charAt(0) !== 's') unknown = true;
    });
    return { price: price, dur: dur, unknown: unknown, n: state.sel.length };
  }
  function durTxt(m) { var h = Math.floor(m / 60), mm = m % 60; return (h ? h + ' h' + (mm ? ' ' + pad(mm) : '') : mm + ' min'); }

  function toggle(id) {
    var i = state.sel.indexOf(id);
    if (i > -1) state.sel.splice(i, 1); else state.sel.push(id);
    syncAll();
  }

  function syncAll() {
    // boutons « + » du site
    $$('[data-add]').forEach(function (b) {
      var on = state.sel.indexOf(b.getAttribute('data-add')) > -1;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var span = $('span', b);
      if (span && b.classList.contains('chip-btn')) span.textContent = on ? 'Retirer' : 'Choisir';
    });
    // liste du formulaire
    $$('.svc', listEl).forEach(function (b) {
      b.setAttribute('aria-pressed', state.sel.indexOf(b.getAttribute('data-id')) > -1 ? 'true' : 'false');
    });
    // total
    var t = totals();
    if (!t.n) { sumEl.innerHTML = '<span>Aucun soin choisi pour le moment</span>'; }
    else {
      var d = t.dur ? ' · ≈ ' + durTxt(t.dur) + (t.unknown ? ' +' : '') : '';
      sumEl.innerHTML = '<span>' + t.n + (t.n > 1 ? ' soins' : ' soin') + d + '</span><b>' + euro(t.price) + '</b>';
    }
    updateFab();
  }

  /* ---------- Pastille flottante « Ma sélection » ---------- */
  var fab = $('#fabSel'), fabTxt = $('#fabSelTxt'), bookSec = $('#reserver'), bookVisible = false;
  function updateFab() {
    if (!fab) return;
    var t = totals();
    if (t.n && !bookVisible) {
      fabTxt.textContent = t.n + (t.n > 1 ? ' soins' : ' soin') + ' · ' + euro(t.price) + ' — Réserver';
      fab.hidden = false;
    } else fab.hidden = true;
  }
  if ('IntersectionObserver' in window && bookSec) {
    new IntersectionObserver(function (e) { bookVisible = e[0].isIntersecting; updateFab(); }, { threshold: 0.15 }).observe(bookSec);
  }

  /* ---------- Onglets + liste ---------- */
  function renderTabs() {
    tabsEl.innerHTML = CATS.map(function (c) {
      return '<button type="button" role="tab" class="tab" data-cat="' + c.id + '" aria-selected="' + (c.id === state.cat) + '">' + c.label + '</button>';
    }).join('');
  }
  function renderList() {
    listEl.innerHTML = SERVICES.filter(function (s) { return s.cat === state.cat; }).map(function (s) {
      return '<button type="button" class="svc" data-id="' + s.id + '" aria-pressed="false">' +
        '<span class="tick"><svg aria-hidden="true"><use href="#i-check"/></svg></span>' +
        '<span class="svc-name">' + esc(s.name) + (s.sub ? '<small>' + esc(s.sub) + '</small>' : '') + '</span>' +
        '<span class="svc-price">' + euro(s.price) + '</span></button>';
    }).join('');
    listEl.scrollTop = 0;
    listEnd();
    syncAll();
  }
  // petit fondu en bas de liste tant qu’il reste des soins à découvrir en défilant
  function listEnd() { listEl.classList.toggle('is-end', listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 4); }
  listEl.addEventListener('scroll', listEnd, { passive: true });
  window.addEventListener('resize', listEnd);
  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    state.cat = b.getAttribute('data-cat'); renderTabs(); renderList();
  });
  listEl.addEventListener('click', function (e) {
    var b = e.target.closest('.svc'); if (!b) return;
    toggle(b.getAttribute('data-id'));
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-add');
    var s = byId[id];
    if (s && state.cat !== s.cat) { state.cat = s.cat; renderTabs(); renderList(); }
    toggle(id);
  });

  /* ---------- Jours ---------- */
  var daysEl = $('#days'), dateOther = $('#dateOther'), timeExact = $('#timeExact');
  var dFmt = { weekday: 'long', day: 'numeric', month: 'long' };
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function renderDays() {
    var base = new Date(); base.setHours(0, 0, 0, 0);
    var out = [];
    for (var i = 0; i < 14; i++) {
      var d = new Date(base.getTime() + i * 86400000);
      out.push('<button type="button" role="radio" class="day" aria-checked="false" data-iso="' + isoLocal(d) + '">' +
        '<span>' + d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') + '</span>' +
        '<b>' + d.getDate() + '</b><span>' + d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') + '</span></button>');
    }
    daysEl.innerHTML = out.join('');
    dateOther.min = isoLocal(base);
  }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b) return;
    $$('.day', daysEl).forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
    state.date = parseIso(b.getAttribute('data-iso')); dateOther.value = '';
  });
  dateOther.addEventListener('change', function () {
    if (!dateOther.value) return;
    state.date = parseIso(dateOther.value);
    $$('.day', daysEl).forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
  });
  $$('input[name="moment"]').forEach(function (r) { r.addEventListener('change', function () { state.moment = r.value; }); });
  timeExact.addEventListener('change', function () { state.time = timeExact.value; });

  /* ---------- Étapes ---------- */
  var steps = $$('.bstep'), stepper = $$('.stepper li');
  function go(n, noScroll) {
    state.step = n;
    steps.forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-step') === n); });
    stepper.forEach(function (li) {
      var k = +li.getAttribute('data-s');
      li.classList.toggle('is-active', k === n);
      li.classList.toggle('is-done', k < n || n === 4);
      if (n === 4) li.classList.remove('is-active');
    });
    if (!noScroll) {
      var act = $('.bstep.is-active');
      if (act) { var h = $('.bstep-title', act); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
      var card = $('#bookCard');
      // on cadre la carte : centrée si elle tient à l’écran, sinon calée en haut pour voir le plus possible
      var off = -Math.max(24, Math.min(84, (window.innerHeight - card.offsetHeight) / 2));
      if (window.__lenis) window.__lenis.scrollTo(card, { offset: off, duration: 1 });
      else card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (n === 4) buildRecap();
  }
  function err(id, show) { var e = $(id); if (e) e.hidden = !show; }
  function validPhone(v) { var d = (v || '').replace(/\D/g, ''); return d.length >= 9 && d.length <= 14; }

  document.addEventListener('click', function (e) {
    var nx = e.target.closest('[data-next]'), pv = e.target.closest('[data-prev]');
    if (nx) {
      var to = +nx.getAttribute('data-next');
      if (to === 2) { if (!state.sel.length) return err('#err1', true); err('#err1', false); }
      if (to === 3) {
        var okDate = !!state.date, okMoment = !!(state.moment || timeExact.value);
        if (!okDate || !okMoment) return err('#err2', true); err('#err2', false);
      }
      if (to === 4) {
        if (!$('#fPrenom').value.trim() || !validPhone($('#fTel').value)) return err('#err3', true); err('#err3', false);
      }
      go(to);
    }
    if (pv) go(+pv.getAttribute('data-prev'));
  });

  /* ---------- Message & récapitulatif ---------- */
  function momentLabel() {
    var map = { 'matin': 'le matin', 'midi': 'le midi', 'apres-midi': 'l\'après-midi', 'fin-de-journee': 'en fin de journée' };
    return map[state.moment] || '';
  }
  function timeValue() {
    if (timeExact.value) return timeExact.value;
    var r = $('input[name="moment"]:checked'); return r ? r.getAttribute('data-def') : '10:00';
  }
  function dateTxt() { return state.date ? state.date.toLocaleDateString('fr-FR', dFmt) : ''; }
  function slotTxt() {
    var t = timeExact.value ? ('vers ' + timeExact.value.replace(':', 'h')) : momentLabel();
    return dateTxt() + (t ? ', ' + t : '');
  }
  function fullName() { return ($('#fPrenom').value.trim() + ' ' + $('#fNom').value.trim()).trim(); }

  function buildMessage() {
    var t = totals(), lines = [];
    lines.push('Bonjour Laurine, c\'est ' + fullName() + '.');
    lines.push('Je souhaiterais réserver à L\'Ins\'temps pour soi :');
    state.sel.forEach(function (id) { var s = byId[id]; lines.push('- ' + s.name + ' (' + euro(s.price) + ')'); });
    lines.push('Total : ' + euro(t.price));
    lines.push('Créneau souhaité : ' + slotTxt() + '.');
    lines.push('Mon numéro : ' + $('#fTel').value.trim() + '.');
    var m = $('#fMsg').value.trim(); if (m) lines.push('Message : ' + m);
    lines.push('Merci de me confirmer la disponibilité. À bientôt !');
    return lines.join('\n');
  }

  function buildRecap() {
    var t = totals();
    var html = '<div><h4>Mes soins</h4><ul>' + state.sel.map(function (id) {
      var s = byId[id]; return '<li><span>' + esc(s.name) + '</span><span>' + euro(s.price) + '</span></li>';
    }).join('') + '<li class="tot"><span>Total' + (t.dur ? ' · ≈ ' + durTxt(t.dur) + (t.unknown ? ' +' : '') : '') + '</span><span>' + euro(t.price) + '</span></li></ul></div>';
    html += '<div><h4>Mon créneau souhaité</h4><p>' + esc(slotTxt()) + ' <em>(à confirmer par Laurine)</em></p></div>';
    html += '<div><h4>Mes coordonnées</h4><p>' + esc(fullName()) + ' · ' + esc($('#fTel').value.trim()) + '</p></div>';
    $('#recap').innerHTML = html;
    var msg = buildMessage();
    $('#sendSms').setAttribute('href', 'sms:' + PHONE + '?&body=' + encodeURIComponent(msg));
    $('#live').textContent = '';
  }

  /* ---------- Actions : agenda .ics, copie ---------- */
  function fmtLocal(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function makeIcs() {
    var tv = timeValue().split(':'), d = state.date, t = totals();
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +tv[0], +tv[1], 0);
    var minutes = (t.dur || 0) + (t.unknown || !t.dur ? 30 : 0);
    var end = new Date(start.getTime() + minutes * 60000);
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var desc = 'Demande de rendez-vous (à confirmer par SMS avec Laurine, ' + PHONE_TXT + ').\n' +
      state.sel.map(function (id) { return '- ' + byId[id].name + ' (' + euro(byId[id].price) + ')'; }).join('\n') + '\nTotal : ' + euro(t.price);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L Ins temps pour soi//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + now.getTime() + '@lins-temps-pour-soi', 'DTSTAMP:' + stamp,
      'DTSTART:' + fmtLocal(start), 'DTEND:' + fmtLocal(end),
      'SUMMARY:' + icsEsc('RDV à confirmer · L\'Ins\'temps pour soi'),
      'LOCATION:' + icsEsc(PLACE), 'DESCRIPTION:' + icsEsc(desc),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel : rendez-vous demain', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function say(t) { var l = $('#live'); l.textContent = t; }
  $('#icsBtn').addEventListener('click', function () {
    var blob = new Blob([makeIcs()], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rendez-vous-lins-temps-pour-soi.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    say('Fichier agenda téléchargé : rendez-vous à confirmer avec Laurine.');
  });
  $('#copyBtn').addEventListener('click', function () {
    var msg = buildMessage();
    function ok() { say('Message copié : collez-le dans vos messages.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(ok, fallback); else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = msg; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { say('Copie impossible : sélectionnez le texte manuellement.'); }
      ta.remove();
    }
  });
  $('#sendSms').addEventListener('click', function () { say('Votre messagerie s’ouvre avec le message prêt à envoyer. Laurine vous répondra pour confirmer.'); });
  $('#resetBook').addEventListener('click', function () {
    state.sel = []; state.date = null; state.moment = ''; state.time = '';
    $('#bookForm').reset(); renderDays(); renderList(); go(1, true);
  });
  $('#bookForm').addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- Init ---------- */
  renderTabs(); renderDays(); renderList(); go(1, true);
  window.Booking = { toggle: toggle };
})();
