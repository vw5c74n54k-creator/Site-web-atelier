/* =====================================================
   L'ATELIER ESTHÉTIQUE AUTOMOBILE — script.js
   ===================================================== */

// ---------- Adresse courriel qui reçoit les leads ----------
// Pour changer d'adresse, modifiez simplement la ligne ci-dessous.
const LEAD_EMAIL = 'info@lateliermtl.com';
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + LEAD_EMAIL;

// ---------- Navigation : fond au défilement ----------
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Menu mobile ----------
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a, button').forEach((el) => {
  el.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ---------- Animations d'apparition au défilement ----------
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ---------- Compteurs animés du hero ----------
const animateCount = (el) => {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1600;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

// ---------- Démo interactive : vitres teintées ----------
const tintFilm = document.getElementById('tintFilm');
const tintValue = document.getElementById('tintValue');
const tintButtons = document.getElementById('tintButtons');
if (tintButtons) {
  tintButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tint]');
    if (!btn) return;
    const pct = parseInt(btn.dataset.tint, 10);
    // % VLT = lumière transmise → opacité du film = 1 - VLT (bornée pour rester lisible)
    const opacity = Math.min(0.95, Math.max(0.12, 1 - pct / 100));
    tintFilm.style.opacity = opacity;
    tintValue.textContent = pct + '%';
    tintButtons.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
}

// ---------- Modal de soumission ----------
const modal = document.getElementById('quoteModal');
const formWrap = document.getElementById('modalFormWrap');
const successBox = document.getElementById('modalSuccess');
const quoteForm = document.getElementById('quoteForm');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');

const openModal = () => {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = quoteForm.querySelector('input');
  setTimeout(() => first && first.focus(), 350);
};
const closeModal = () => {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

document.querySelectorAll('[data-open-quote]').forEach((btn) => btn.addEventListener('click', openModal));
document.querySelectorAll('[data-close-quote]').forEach((btn) => btn.addEventListener('click', closeModal));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

// ---------- Envoi du formulaire ----------
quoteForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validation
  let valid = true;
  quoteForm.querySelectorAll('[required]').forEach((field) => {
    const empty = !field.value.trim();
    const badEmail = field.type === 'email' && field.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value);
    field.classList.toggle('invalid', empty || badEmail);
    if (empty || badEmail) valid = false;
  });
  formError.hidden = valid;
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi en cours…';

  const data = Object.fromEntries(new FormData(quoteForm).entries());
  data._subject = '🚗 Nouveau lead — ' + data['Prénom'] + ' ' + data['Nom'] + ' (' + data['Service'] + ')';
  data._template = 'table';
  data._captcha = 'false';

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const out = await res.json().catch(() => ({}));
    // FormSubmit répond 200 même en échec (ex. formulaire non activé)
    if (out.success === 'false' || out.success === false) throw new Error(out.message || 'refus FormSubmit');

    formWrap.hidden = true;
    successBox.hidden = false;
    quoteForm.reset();
  } catch (err) {
    // Repli : ouvre le client courriel du visiteur avec le lead pré-rempli
    const body = Object.entries(data)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => k + ' : ' + v)
      .join('\n');
    window.location.href =
      'mailto:' + LEAD_EMAIL +
      '?subject=' + encodeURIComponent('Demande de soumission — ' + data['Prénom'] + ' ' + data['Nom']) +
      '&body=' + encodeURIComponent(body);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML =
      'Envoyer ma demande <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  }
});

// Réinitialiser le modal quand on le rouvre après un succès
document.querySelectorAll('[data-open-quote]').forEach((btn) =>
  btn.addEventListener('click', () => {
    formWrap.hidden = false;
    successBox.hidden = true;
    formError.hidden = true;
  })
);

// ---------- Effet 3D au survol des cartes ----------
if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  document.querySelectorAll('.service-card, .detail-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        'translateY(-8px) rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 9).toFixed(2) + 'deg)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ---------- Année du footer ----------
document.getElementById('year').textContent = new Date().getFullYear();
