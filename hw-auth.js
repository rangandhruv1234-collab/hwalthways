// hw-auth.js — HEALTHWAYS shared auth, smart CTA & booking logic
// localStorage is a placeholder; swap for Firebase Auth + Firestore later.

(function () {
  'use strict';

  const THEMES = {
    gym:      { accent: '#C9922A', light: '#E8B84B', label: 'Gym',          border: 'rgba(201,146,42,0.35)' },
    swimming: { accent: '#0EA5E9', light: '#38BDF8', label: 'Swimming Pool', border: 'rgba(14,165,233,0.35)' },
  };

  // ── Storage helpers ──────────────────────────────────────────────────────────
  function getSession() {
    try { return JSON.parse(localStorage.getItem('hw_session')); } catch { return null; }
  }
  function getBookings() {
    try { return JSON.parse(localStorage.getItem('hw_bookings') || '[]'); } catch { return []; }
  }
  function getUserBooking(identifier, source) {
    return getBookings().filter(b => b.identifier === identifier && b.source === source).pop() || null;
  }

  // ── "Already Booked" modal ───────────────────────────────────────────────────
  var modalReady = false;

  function injectModal() {
    if (modalReady) return;
    modalReady = true;

    // Styles
    var css = document.createElement('style');
    css.textContent =
      '#hw-modal{display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(14px);padding:20px;}' +
      '#hw-modal.hw-open{display:flex;}' +
      '#hw-mc{width:100%;max-width:420px;background:#101010;border-width:1px;border-style:solid;border-color:rgba(201,146,42,0.35);padding:40px 36px;position:relative;animation:hwfade .28s ease;}' +
      '@keyframes hwfade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}' +
      '#hw-mc-close{position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,0.3);font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;transition:color .2s;}' +
      '#hw-mc-close:hover{color:#fff;}' +
      '.hw-mey{font-family:Montserrat,sans-serif;font-size:9px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;}' +
      '.hw-mti{font-family:Oswald,sans-serif;font-weight:700;font-size:24px;letter-spacing:2px;text-transform:uppercase;color:#fff;margin-bottom:24px;line-height:1.1;}' +
      '.hw-mti em{font-style:normal;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '.hw-mrows{border:1px solid rgba(255,255,255,0.07);margin-bottom:24px;}' +
      '.hw-mrow{display:flex;justify-content:space-between;align-items:baseline;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,0.05);}' +
      '.hw-mrow:last-child{border-bottom:none;}' +
      '.hw-mk{font-family:Montserrat,sans-serif;font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);}' +
      '.hw-mv{font-family:Montserrat,sans-serif;font-size:11px;font-weight:500;color:#fff;text-align:right;max-width:60%;}' +
      '.hw-mbtns{display:flex;gap:10px;flex-wrap:wrap;}' +
      '.hw-mbtn{flex:1;min-width:120px;font-family:Montserrat,sans-serif;font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#fff;border:none;padding:13px 12px;cursor:pointer;text-align:center;text-decoration:none;display:block;}' +
      '.hw-mbtn-ghost{background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);transition:color .2s,border-color .2s;}' +
      '.hw-mbtn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.5);}' +
      '@media(max-width:480px){#hw-mc{padding:30px 20px;}.hw-mbtns{flex-direction:column;}}';
    document.head.appendChild(css);

    // Markup
    var el = document.createElement('div');
    el.id = 'hw-modal';
    el.innerHTML =
      '<div id="hw-mc">' +
        '<button id="hw-mc-close" onclick="HW.closeModal()" aria-label="Close">&#x2715;</button>' +
        '<p class="hw-mey" id="hw-mey"></p>' +
        '<h2 class="hw-mti">SESSION <em id="hw-mti-em">ALREADY BOOKED</em></h2>' +
        '<div class="hw-mrows" id="hw-mrows"></div>' +
        '<div class="hw-mbtns">' +
          '<a href="profile.html" class="hw-mbtn" id="hw-mbtn-primary">View My Profile</a>' +
          '<button class="hw-mbtn hw-mbtn-ghost" onclick="HW.closeModal()">Close</button>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function (e) { if (e.target === el) closeModal(); });
    document.body.appendChild(el);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  function showBookedModal(booking) {
    injectModal();
    var t = THEMES[booking.source] || THEMES.gym;

    // Update accent on card
    var card = document.getElementById('hw-mc');
    card.style.borderColor = t.border;
    var ey = document.getElementById('hw-mey');
    ey.style.color = t.accent;
    ey.textContent = t.label + ' — Free Trial';
    var em = document.getElementById('hw-mti-em');
    em.style.background = 'linear-gradient(135deg,' + t.accent + ',' + t.light + ')';

    // Rows
    var dateStr = booking.date;
    try { dateStr = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch {}
    var rows = [
      { k: 'Facility', v: t.label },
      { k: 'Goal',     v: booking.goal  || '—' },
      { k: 'Date',     v: dateStr },
      { k: 'Time',     v: booking.time  || '—' },
    ];
    document.getElementById('hw-mrows').innerHTML = rows.map(function (r) {
      return '<div class="hw-mrow"><span class="hw-mk">' + r.k + '</span><span class="hw-mv">' + r.v + '</span></div>';
    }).join('');

    // Primary button style
    var btn = document.getElementById('hw-mbtn-primary');
    btn.style.background = 'linear-gradient(135deg,' + t.accent + ',' + t.light + ')';

    document.getElementById('hw-modal').classList.add('hw-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var m = document.getElementById('hw-modal');
    if (m) m.classList.remove('hw-open');
    document.body.style.overflow = '';
  }

  // ── Nav update when logged in ────────────────────────────────────────────────
  function updateNav() {
    var session = getSession();
    if (!session) return;
    var firstName = (session.name || 'Account').split(' ')[0];

    // Desktop + mobile nav-join → profile link
    document.querySelectorAll('.nav-join').forEach(function (el) {
      el.textContent = firstName + ' \u203a'; // ›
      el.href = 'profile.html';
      el.title = 'My Profile';
      // Remove from CTA intercept scope
      el.dataset.hwSkip = '1';
    });
  }

  // ── Smart CTA intercept ──────────────────────────────────────────────────────
  function handleCTA(source, e) {
    if (e) e.preventDefault();
    var session = getSession();
    if (!session) {
      location.href = 'login.html?source=' + encodeURIComponent(source);
      return;
    }
    var booking = getUserBooking(session.identifier, source);
    if (booking) {
      showBookedModal(booking);
      return;
    }
    location.href = 'book-trial.html?source=' + encodeURIComponent(source) + '&name=' + encodeURIComponent(session.name || '');
  }

  function interceptLinks() {
    document.querySelectorAll('a[href*="login.html"]').forEach(function (el) {
      if (el.dataset.hwSkip) return;
      var url = new URL(el.href, location.href);
      var source = url.searchParams.get('source') || 'gym';
      el.addEventListener('click', function (e) { handleCTA(source, e); });
    });
  }

  // ── Floating WhatsApp Button ─────────────────────────────────────────────────
  function injectWhatsApp() {
    var css = document.createElement('style');
    css.textContent =
      '.hw-wa-float{position:fixed;bottom:28px;right:28px;z-index:9998;width:56px;height:56px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(37,211,102,0.45);text-decoration:none;transition:transform 0.25s,box-shadow 0.25s;}' +
      '.hw-wa-float:hover{transform:scale(1.12);box-shadow:0 8px 32px rgba(37,211,102,0.6);}' +
      '.hw-wa-float svg{width:28px;height:28px;fill:#fff;}' +
      '@keyframes hw-wa-pulse{0%,100%{box-shadow:0 4px 24px rgba(37,211,102,0.45);}50%{box-shadow:0 4px 32px rgba(37,211,102,0.7),0 0 0 8px rgba(37,211,102,0.1);}}' +
      '.hw-wa-float{animation:hw-wa-pulse 3s ease-in-out infinite;}';
    document.head.appendChild(css);

    var btn = document.createElement('a');
    btn.className = 'hw-wa-float';
    btn.href = 'https://wa.me/919711114918?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20HEALTHWAYS%20Gym%20%26%20Swim';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Chat with HEALTHWAYS on WhatsApp');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    document.body.appendChild(btn);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectModal();
    injectWhatsApp();
    updateNav();
    interceptLinks();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Public API
  window.HW = { closeModal: closeModal, getSession: getSession, getBookings: getBookings };
})();
