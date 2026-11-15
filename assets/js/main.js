'use strict';

/*
 * All JavaScript för sidan ligger här i stället för inline i HTML:en.
 * Det gör att Content-Security-Policy kan förbjuda inline-skript helt
 * (script-src 'self'), vilket stoppar de flesta XSS-attacker.
 */

const CONTACT_EMAIL = 'roosminibygg@gmail.com';

// Maxlängder kontrolleras även här, eftersom maxlength i HTML kan kringgås
const LIMITS = { name: 100, contact: 100, location: 60, message: 1200 };

// Telefon: siffror, mellanslag, +, -, ( ). E-post: enkel rimlighetskontroll.
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

// Tillåtna projekttyper (vitlista) – allt annat ersätts med "Övrigt"
const ALLOWED_PROJECTS = new Set([
    'Nybyggnation & tillbyggnad',
    'Renovering',
    'Tak & fasad',
    'Småjobb & finsnickeri',
    'Övrigt',
]);

/** Tar bort styrtecken (t.ex. osynliga tecken) och trimmar mellanslag. */
function clean(value, maxLength) {
    return String(value ?? '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
        .trim()
        .slice(0, maxLength);
}

/** Tar dessutom bort radbrytningar – för fält som ska vara en rad. */
function cleanLine(value, maxLength) {
    return clean(value, maxLength).replace(/[\r\n]+/g, ' ');
}

/* ---------- Logotyp: visa reserv om bildfilen saknas ---------- */
function initLogoFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach((img) => {
        const showFallback = () => {
            img.hidden = true;
            const fallback = document.getElementById(img.dataset.fallback);
            if (!fallback) return;
            fallback.classList.remove('hidden');
            if (fallback.dataset.display) fallback.classList.add(fallback.dataset.display);
        };
        // Bilden kan redan ha misslyckats innan skriptet kördes
        if (img.complete && img.naturalWidth === 0) {
            showFallback();
        } else {
            img.addEventListener('error', showFallback, { once: true });
        }
    });
}

/* ---------- Mobilmeny ---------- */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !mobileMenu) return;

    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');

    const setMenuOpen = (open) => {
        mobileMenu.classList.toggle('hidden', !open);
        iconOpen?.classList.toggle('hidden', open);
        iconClose?.classList.toggle('hidden', !open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Stäng meny' : 'Öppna meny');
    };

    menuBtn.addEventListener('click', () => {
        setMenuOpen(mobileMenu.classList.contains('hidden'));
    });
    document.querySelectorAll('.mobile-link').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
            setMenuOpen(false);
            menuBtn.focus();
        }
    });
    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
        if (e.matches) setMenuOpen(false);
    });
}

/* ---------- Tjänstekort förväljer projekttyp ---------- */
function initServiceLinks() {
    const selectEl = document.getElementById('project-type');
    document.querySelectorAll('[data-service]').forEach((link) => {
        link.addEventListener('click', () => {
            const service = link.dataset.service;
            if (selectEl && ALLOWED_PROJECTS.has(service)) selectEl.value = service;
        });
    });
}

/* ---------- Offertformulär → förifyllt mejl ---------- */
function initQuoteForm() {
    const form = document.getElementById('quote-form');
    const success = document.getElementById('form-success');
    const mailtoLink = document.getElementById('mailto-direct-link');
    const resetBtn = document.getElementById('reset-form-btn');
    if (!form || !success) return;

    const field = (id) => document.getElementById(id);

    // Nollställ eget felmeddelande när användaren skriver igen
    form.addEventListener('input', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            e.target.setCustomValidity('');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = cleanLine(field('name')?.value, LIMITS.name);
        const contact = cleanLine(field('contact-info')?.value, LIMITS.contact);
        const location = cleanLine(field('location')?.value, LIMITS.location);
        const message = clean(field('message')?.value, LIMITS.message);
        const rawProject = field('project-type')?.value;
        const project = ALLOWED_PROJECTS.has(rawProject) ? rawProject : 'Övrigt';

        // Validering: "required" i HTML godkänner fält med bara mellanslag
        const checks = [
            [field('name'), name.length >= 2, 'Skriv ditt namn.'],
            [field('contact-info'), PHONE_RE.test(contact) || EMAIL_RE.test(contact),
                'Ange ett telefonnummer eller en giltig e-postadress.'],
            [field('message'), message.length >= 5, 'Beskriv kort vad du behöver hjälp med.'],
        ];
        for (const [input, ok, msg] of checks) {
            if (!input) continue;
            input.setCustomValidity(ok ? '' : msg);
        }
        if (!form.reportValidity()) return;

        const subject = `Offertförfrågan: ${project}${location ? ` (${location})` : ''}`;
        const body = [
            'Hej Minibygg Roos!',
            '',
            'Jag vill gärna begära en offert för följande projekt:',
            '',
            `Typ av projekt: ${project}`,
            location ? `Ort: ${location}` : null,
            '',
            'Beskrivning:',
            message,
            '',
            'Vänliga hälsningar,',
            name,
            `Kontaktuppgifter: ${contact}`,
        ].filter((line) => line !== null).join('\r\n');

        // encodeURIComponent: &, ?, # och radbrytningar kan inte lägga till
        // egna fält (t.ex. bcc=) i mejllänken
        const mailtoUrl = `mailto:${CONTACT_EMAIL}`
            + `?subject=${encodeURIComponent(subject)}`
            + `&body=${encodeURIComponent(body)}`;

        if (mailtoLink) mailtoLink.href = mailtoUrl;

        form.classList.add('hidden');
        success.classList.remove('hidden');
        success.focus({ preventScroll: true });
        success.scrollIntoView({ block: 'center', behavior: 'smooth' });

        window.location.href = mailtoUrl;
    });

    resetBtn?.addEventListener('click', () => {
        success.classList.add('hidden');
        form.classList.remove('hidden');
        field('name')?.focus();
    });
}

/* ---------- Årtal i sidfoten ---------- */
function initYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

// Skriptet laddas med "defer", så HTML:en är redan inläst här
initLogoFallbacks();
initMobileMenu();
initServiceLinks();
initQuoteForm();
initYear();
