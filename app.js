/* ==========================================================================
   RUGA Hamädi · app.js
   Dependencias (auto-alojadas en /vendor): GSAP 3.12 + ScrollTrigger, Lenis 1.1
   Estructura:
     1. Utilidades y módulos sin GSAP (menú, FAQ, lightbox, formulario)
     2. Escena: loader, hero (intro, red de partículas, skyline), marcos de imagen
     3. Scroll: una sola función por sección, creadas en el orden del documento
     4. Movimiento reducido: todo el contenido queda visible y sin pines
   ========================================================================== */
(() => {
    'use strict';

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;
    const WA_NUMBER = '524425922621';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const hasGsap = !!(window.gsap && window.ScrollTrigger);

    let lenis = null;

    /* ======================================================================
       1. MÓDULOS SIN GSAP
       ====================================================================== */
    function scrollToY(y) {
        if (lenis) lenis.scrollTo(y, { duration: 1.8, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        else window.scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
    }

    function scrollToTarget(id) {
        const el = $(id);
        if (!el) return;
        // Las secciones ancladas (pin) usan el inicio de su ScrollTrigger
        const st = window.ScrollTrigger && ScrollTrigger.getById(id.slice(1));
        const y = st ? st.start : el.getBoundingClientRect().top + window.scrollY - 10;
        scrollToY(y);
    }

    function setMenu(open) {
        const burger = $('.nav__burger');
        const menu = $('#menu');
        if (!burger || !menu) return;
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        menu.classList.toggle('is-open', open);
        menu.inert = !open;
        root.classList.toggle('menu-open', open);
        if (lenis) open ? lenis.stop() : lenis.start();
    }

    function initMenu() {
        const burger = $('.nav__burger');
        if (!burger) return;
        $$('.menu__nav a').forEach((a, i) => a.style.setProperty('--i', i));
        burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
        matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

        // Enlaces internos con scroll suave (también en el menú móvil)
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2 || !$(id)) return;
            e.preventDefault();
            const wasOpen = root.classList.contains('menu-open');
            setMenu(false);
            setTimeout(() => scrollToTarget(id), wasOpen ? 350 : 0);
            history.pushState(null, '', id);
        });
    }

    function initFaq() {
        const items = $$('.faq__item');
        items.forEach((item) => {
            const btn = $('.faq__q', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((it) => {
                    it.classList.remove('is-open');
                    $('.faq__q', it).setAttribute('aria-expanded', 'false');
                });
                item.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', String(open));
                // El alto cambia: recalcula los puntos de scroll
                setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 650);
            });
        });
    }

    function initLightbox() {
        const dlg = $('#lightbox');
        if (!dlg || typeof dlg.showModal !== 'function') return;
        const img = $('.lb__img', dlg);
        const cap = $('.lb__cap', dlg);
        $$('[data-lightbox]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const thumb = $('img', btn);
                img.src = btn.dataset.lightbox;
                img.alt = thumb ? thumb.alt : '';
                const fc = btn.closest('figure') && $('figcaption', btn.closest('figure'));
                cap.textContent = fc ? fc.textContent : '';
                dlg.showModal();
                if (lenis) lenis.stop();
            });
        });
        dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        $('.lb__close', dlg).addEventListener('click', () => dlg.close());
    }

    function initForm() {
        const form = $('#lead-form');
        if (!form) return;
        const steps = $$('.lf__step', form);
        const bar = $('.lf__bar span', form);
        const now = $('[data-step-now]', form);
        const prev = $('[data-prev]', form);
        const next = $('[data-next]', form);
        const submit = $('[data-submit]', form);
        let i = 0;

        const show = (n, focus = true) => {
            i = n;
            steps.forEach((s, k) => s.classList.toggle('is-active', k === n));
            bar.style.transform = `scaleX(${(n + 1) / steps.length})`;
            now.textContent = String(n + 1);
            prev.hidden = n === 0;
            next.hidden = n === steps.length - 1;
            submit.hidden = n !== steps.length - 1;
            if (focus) {
                const first = $('input, select, textarea', steps[n]);
                if (first) first.focus({ preventScroll: true });
            }
        };

        const setFieldError = (field, bad) => {
            const wrap = field.closest('.field');
            wrap.classList.toggle('has-error', bad);
            const msg = $('.field__err', wrap);
            if (msg) msg.hidden = !bad;
            field.setAttribute('aria-invalid', String(bad));
        };

        const validate = (n) => {
            const err = $('.lf__err', steps[n]);
            if (n === 0) {
                const ok = !!form.querySelector('input[name="tipo"]:checked');
                if (err) err.hidden = ok;
                return ok;
            }
            if (n === 1) {
                const ok = form.querySelectorAll('input[name="necesidad"]:checked').length > 0;
                if (err) err.hidden = ok;
                return ok;
            }
            const nombre = form.elements.nombre;
            const tel = form.elements.tel;
            const nOk = nombre.value.trim().length >= 2;
            const digits = tel.value.replace(/\D/g, '');
            const tOk = !tel.value.trim() || (digits.length >= 10 && digits.length <= 13);
            setFieldError(nombre, !nOk);
            setFieldError(tel, !tOk);
            if (!nOk) nombre.focus();
            else if (!tOk) tel.focus();
            return nOk && tOk;
        };

        const send = () => {
            const d = new FormData(form);
            const unidades = (d.get('unidades') || '').toString();
            const lines = [
                `Hola RUGA Hamädi, soy ${d.get('nombre').toString().trim()}.`,
                `Administro o represento un condominio de tipo: ${d.get('tipo')}.`,
                unidades ? `Tiene ${unidades.charAt(0).toLowerCase() + unidades.slice(1)} unidades.` : '',
                `Quiero resolver: ${d.getAll('necesidad').join(', ')}.`,
                d.get('msg').toString().trim() ? `Comentarios: ${d.get('msg').toString().trim()}` : '',
                d.get('tel').toString().trim() ? `Mi teléfono: ${d.get('tel').toString().trim()}.` : '',
                'Me gustaría recibir mi asesoría sin costo.'
            ].filter(Boolean);
            const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
            form.classList.add('is-done');
            const done = $('.lf__done', form);
            done.hidden = false;
            $('[data-wa-link]', form).href = url;
            if (window.gsap) {
                const shapes = $$('.ico--draw *', done);
                gsap.set(shapes, { strokeDasharray: '1 2' });
                gsap.fromTo(shapes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' });
                gsap.from(done.children, { y: 24, autoAlpha: 0, stagger: .1, duration: .8, ease: 'expo.out' });
            }
            window.open(url, '_blank', 'noopener');
        };

        next.addEventListener('click', () => { if (validate(i)) show(i + 1); });
        prev.addEventListener('click', () => show(i - 1));
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (i < steps.length - 1) { next.click(); return; }
            if (validate(i)) send();
        });
        form.addEventListener('change', (e) => {
            const err = $('.lf__err', steps[i]);
            if (err && e.target.matches('input[type="radio"], input[type="checkbox"]')) err.hidden = true;
        });
        form.addEventListener('input', (e) => {
            const f = e.target.closest('.field');
            if (f && f.classList.contains('has-error')) setFieldError(e.target, false);
        });
        show(0, false);
    }

    function initActiveLinks() {
        const links = $$('.nav__links a');
        const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((a) => a.removeAttribute('aria-current'));
                const a = map.get(en.target.id);
                if (a) a.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-45% 0px -45% 0px' });
        // Secciones sin enlace en la barra (contacto, ventajas...) también limpian el estado activo
        [...map.keys(), 'inicio', 'manifiesto', 'comunidad', 'ventajas', 'contacto'].forEach((id) => {
            const s = document.getElementById(id);
            if (s) io.observe(s);
        });
    }

    initMenu();
    initFaq();
    initLightbox();
    initForm();
    initActiveLinks();
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* Sin librerías de animación: el sitio funciona como página estática */
    if (!hasGsap) {
        root.classList.remove('js');
        root.classList.add('no-js');
        const l = $('#loader');
        if (l) l.remove();
        const w = $('.wa');
        if (w) w.classList.add('is-in');
        return;
    }

    /* ======================================================================
       2. ESCENA
       ====================================================================== */
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* Scroll suave con inercia (Lenis). Con movimiento reducido se usa el scroll nativo. */
    if (!reduced.matches && window.Lenis) {
        lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    /* Genera máscaras palabra por palabra para los titulares */
    function splitWords(el) {
        if (!el || el.dataset.split === 'done') return;
        el.dataset.split = 'done';
        const walk = (node) => {
            Array.from(node.childNodes).forEach((ch) => {
                if (ch.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    ch.textContent.split(/(\s+)/).forEach((p) => {
                        if (!p) return;
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        const inner = document.createElement('span');
                        w.className = 'w';
                        inner.textContent = p;
                        w.appendChild(inner);
                        frag.appendChild(w);
                    });
                    ch.replaceWith(frag);
                } else if (ch.nodeType === 1 && !ch.classList.contains('inline-img') && !ch.matches('svg, img')) {
                    walk(ch);
                }
            });
        };
        walk(el);
    }
    $$('.hero__title, .h2, .h3, [data-scrub-words]').forEach(splitWords);

    /* ---------- Skyline: edificios que se dibujan y ventanas que se encienden ---------- */
    function mulberry32(a) {
        return () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function buildSkyline() {
        const svg = $('.hero__skyline');
        if (!svg) return [];
        const NS = 'http://www.w3.org/2000/svg';
        const rnd = mulberry32(11);
        const base = 270;
        const blocks = [[10, 120, 120], [140, 86, 190], [236, 120, 110], [366, 92, 236], [466, 140, 150], [616, 100, 204],
            [726, 130, 118], [866, 96, 252], [972, 120, 170], [1100, 88, 212], [1196, 132, 124], [1338, 96, 190], [1444, 110, 150], [1560, 56, 96]];
        const make = (tag, attrs) => {
            const el = document.createElementNS(NS, tag);
            Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
            svg.appendChild(el);
            return el;
        };
        let windows = '';
        const lit = [];
        make('path', { class: 'sk-line', pathLength: 1, d: `M0 ${base}H1600` });
        blocks.forEach(([x, w, h]) => {
            const top = base - h;
            let d;
            if (h > 200) {
                d = `M${x} ${base}V${top + 22}H${x + 8}V${top}H${x + w - 8}V${top + 22}H${x + w}V${base}`;
                if (rnd() > .4) d += `M${x + w / 2} ${top}V${top - 18}`;
            } else if (h > 140) {
                d = `M${x} ${base}V${top}H${x + w}V${base}M${x + 6} ${top}V${top - 8}H${x + w - 6}V${top}`;
            } else {
                d = `M${x} ${base}V${top}H${x + w}V${base}`;
            }
            make('path', { class: 'sk-line', pathLength: 1, d });
            for (let cx = x + 12; cx <= x + w - 18; cx += 16) {
                for (let cy = top + 18; cy <= base - 16; cy += 24) {
                    windows += `M${cx} ${cy}h6v9h-6z`;
                    if (rnd() > .88) lit.push([cx, cy]);
                }
            }
        });
        make('path', { class: 'sk-grid', d: windows });
        lit.forEach(([cx, cy]) => {
            const r = make('rect', { class: 'sk-win', x: cx, y: cy, width: 6, height: 9, rx: 1 });
            r.style.setProperty('--t', (4 + rnd() * 6).toFixed(1) + 's');
            r.style.setProperty('--d', '-' + (rnd() * 9).toFixed(1) + 's');
        });
        return $$('.sk-line', svg);
    }

    /* ---------- Marcos que se dibujan alrededor de las imágenes ---------- */
    const frameHosts = $$('[data-frame], [data-arch]');
    const NSVG = 'http://www.w3.org/2000/svg';
    const OFFSET = 10;

    function framePath(host) {
        const target = $('.media__clip, .arch__clip', host);
        const w = target.offsetWidth;
        const h = target.offsetHeight;
        const cs = getComputedStyle(target);
        let [tl, tr, br, bl] = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => parseFloat(cs['border' + c + 'Radius']) || 0);
        const f = Math.min(1, w / ((tl + tr) || 1), w / ((bl + br) || 1), h / ((tl + bl) || 1), h / ((tr + br) || 1));
        [tl, tr, br, bl] = [tl, tr, br, bl].map((v) => v * f + OFFSET);
        const W = w + OFFSET * 2;
        const H = h + OFFSET * 2;
        return {
            W, H,
            d: `M${tl} 0H${W - tr}A${tr} ${tr} 0 0 1 ${W} ${tr}V${H - br}A${br} ${br} 0 0 1 ${W - br} ${H}H${bl}A${bl} ${bl} 0 0 1 0 ${H - bl}V${tl}A${tl} ${tl} 0 0 1 ${tl} 0Z`
        };
    }

    function buildFrames() {
        frameHosts.forEach((host) => {
            const svg = document.createElementNS(NSVG, 'svg');
            const path = document.createElementNS(NSVG, 'path');
            svg.setAttribute('class', 'frame');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('preserveAspectRatio', 'none');
            path.setAttribute('pathLength', '1');
            svg.appendChild(path);
            host.appendChild(svg);
        });
        updateFrames();
    }

    function updateFrames() {
        frameHosts.forEach((host) => {
            const svg = $('.frame', host);
            if (!svg) return;
            const { W, H, d } = framePath(host);
            svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            $('path', svg).setAttribute('d', d);
        });
    }
    buildFrames();
    ScrollTrigger.addEventListener('refreshInit', updateFrames);

    /* ---------- Loader ---------- */
    function runLoader() {
        return new Promise((resolve) => {
            const L = $('#loader');
            if (!L) { resolve(); return; }
            if (reduced.matches) {
                // Movimiento reducido: solo un fundido breve, sin cortinas ni dibujos
                gsap.to(L, { autoAlpha: 0, duration: .35, onComplete: () => { L.remove(); resolve(); } });
                return;
            }
            let seen = null;
            try { seen = sessionStorage.getItem('ruga-seen'); } catch (e) { /* modo privado */ }
            const quick = !!seen || reduced.matches;
            const parts = [...$$('.mk-arc', L), ...$$('.mk-head', L), ...$$('.mk-bld', L)];
            const arcs = $$('.mk-arc', L);
            const heads = $$('.mk-head', L);
            const bld = $$('.mk-bld', L);
            const count = $('#loader-count');
            const barEl = $('.loader__bar', L);

            if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
            gsap.set(parts, { strokeDasharray: '1 2', strokeDashoffset: 1 });

            const tl = gsap.timeline();
            tl.to(arcs, { strokeDashoffset: 0, duration: quick ? .35 : .95, stagger: quick ? .05 : .17, ease: 'power2.inOut' }, 0)
                .to(heads, { strokeDashoffset: 0, duration: .3, stagger: quick ? .04 : .12 }, quick ? .15 : .5)
                .to(bld, { strokeDashoffset: 0, duration: quick ? .35 : .85, stagger: quick ? .03 : .08, ease: 'power2.out' }, quick ? .1 : .7);
            const ring = gsap.to($('.mark__ring', L), { rotation: 360, svgOrigin: '50 50', duration: 7, repeat: -1, ease: 'none' });

            const counter = { v: 0 };
            const dur = quick ? .85 : 2.6;
            const exit = () => {
                try { sessionStorage.setItem('ruga-seen', '1'); } catch (e) { /* noop */ }
                const out = gsap.timeline({
                    onComplete: () => {
                        ring.kill();
                        L.classList.add('is-done');
                        if (lenis) lenis.start(); else root.style.overflow = '';
                        L.remove();
                    }
                });
                out.to($('.loader__center', L), { y: -34, autoAlpha: 0, duration: .55, ease: 'power3.in' })
                    .to($('.loader__curtain--top', L), { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, '>-.05')
                    .to($('.loader__curtain--bottom', L), { yPercent: 101, duration: 1.15, ease: 'expo.inOut' }, '<')
                    .add(resolve, '<+=.25');
            };
            const pageReady = Promise.race([
                Promise.all([
                    document.fonts && document.fonts.ready,
                    new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })))
                ]),
                new Promise((r) => setTimeout(r, 3500))
            ]);
            gsap.to(counter, {
                v: 100, duration: dur, ease: 'power1.inOut',
                onUpdate: () => {
                    count.textContent = String(Math.round(counter.v));
                    barEl.style.transform = `scaleX(${counter.v / 100})`;
                },
                onComplete: () => pageReady.then(exit)
            });
        });
    }

    /* ---------- Hero: intro preparada en pausa (corre cuando abre el loader) ---------- */
    const skylineLines = buildSkyline();

    function prepareHero() {
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
        const words = $$('.hero__title .w > span');
        const archPath = $('[data-arch] .frame path');
        gsap.set(skylineLines, { strokeDasharray: '1 2' });
        if (archPath) gsap.set(archPath, { strokeDasharray: '1 2' });

        tl.from('.hero__eyebrow', { y: 18, autoAlpha: 0, duration: .9 }, .1)
            .from(words, { yPercent: 118, duration: 1.3, stagger: .07 }, .15)
            .fromTo('.hero__title .hl', { '--u': '0%' }, { '--u': '100%', duration: 1.3, ease: 'power3.inOut' }, 1.15)
            .from('.hero__lead', { y: 26, autoAlpha: 0, duration: 1 }, .7)
            .from('.hero__cta > *', { y: 28, autoAlpha: 0, duration: 1, stagger: .1 }, .85)
            .from('.arch__clip', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' }, .15)
            .from('.arch__img', { scale: 1.35, duration: 2.2 }, .15)
            .from('.seal--hero', { scale: 0, rotate: -140, autoAlpha: 0, duration: 1.5, ease: 'back.out(1.5)' }, 1.0)
            .from('.callcard', { x: -40, autoAlpha: 0, duration: 1.2 }, 1.25)
            .fromTo(skylineLines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: .07 }, .3)
            .from('.hero__skyline .sk-grid', { autoAlpha: 0, duration: 1.8, ease: 'power1.out' }, 1.6);
        if (archPath) tl.fromTo(archPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, .9);
        return tl;
    }

    /* ---------- Red de partículas (nodos = vecinos conectados) ---------- */
    function startNetwork() {
        const cv = $('.hero__net');
        if (!cv || reduced.matches) return;
        const ctx = cv.getContext('2d');
        const hero = $('.hero');
        const mouse = { x: -999, y: -999 };
        let w = 0, h = 0, link2 = 0, nodes = [], raf = 0, visible = true;

        const size = () => {
            const r = cv.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(Math.min(78, Math.max(24, (w * h) / 21000)));
            const link = Math.min(150, Math.max(100, w / 9));
            link2 = link * link;
            nodes = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
                r: 1.2 + Math.random() * 1.8, sky: Math.random() > .8
            }));
        };

        const tick = () => {
            raf = requestAnimationFrame(tick);
            if (!visible) return;
            ctx.clearRect(0, 0, w, h);
            for (const p of nodes) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
                const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
                if (d2 < 22000) { const f = (1 - d2 / 22000) * .018; p.x += dx * f; p.y += dy * f; }
            }
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
                    if (d < link2) {
                        ctx.strokeStyle = `rgba(50,48,155,${((1 - d / link2) * .24).toFixed(3)})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const mx = mouse.x - a.x, my = mouse.y - a.y, md = mx * mx + my * my;
                if (md < 30000) {
                    ctx.strokeStyle = `rgba(0,74,173,${((1 - md / 30000) * .45).toFixed(3)})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
            }
            for (const p of nodes) {
                ctx.fillStyle = p.sky ? 'rgba(115,150,182,.85)' : 'rgba(50,48,155,.55)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
            }
        };

        size();
        new ResizeObserver(size).observe(cv);
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
        hero.addEventListener('pointermove', (e) => {
            const r = cv.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        cv.classList.add('is-on');
        tick();
    }

    /* ---------- Microinteracciones de puntero ---------- */
    function initPointerFx() {
        if (!finePointer.matches || reduced.matches) return;
        // Botones magnéticos
        $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: .7, ease: 'power3' });
            const yTo = gsap.quickTo(el, 'y', { duration: .7, ease: 'power3' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * .22);
                yTo((e.clientY - (r.top + r.height / 2)) * .3);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
        // Foco de luz en las celdas del bento
        $$('[data-spotlight]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
        // Paralaje del hero con el puntero
        const hero = $('.hero');
        const arch = gsap.quickTo('.arch', 'x', { duration: 1.4, ease: 'power3' });
        const archY = gsap.quickTo('.arch', 'y', { duration: 1.4, ease: 'power3' });
        const seal = gsap.quickTo('.seal--hero', 'x', { duration: 1.6, ease: 'power3' });
        const sealY = gsap.quickTo('.seal--hero', 'y', { duration: 1.6, ease: 'power3' });
        const call = gsap.quickTo('.callcard', 'x', { duration: 1.2, ease: 'power3' });
        hero.addEventListener('pointermove', (e) => {
            const nx = (e.clientX / innerWidth - .5) * 2;
            const ny = (e.clientY / innerHeight - .5) * 2;
            arch(nx * -10); archY(ny * -8);
            seal(nx * 22); sealY(ny * 16);
            call(nx * -16);
        });
    }

    /* ======================================================================
       3. SCROLL (orden del documento)
       ====================================================================== */
    const drawIcons = (scope, trigger, start = 'top 85%') => {
        const shapes = $$('.ico--draw *', scope);
        if (!shapes.length) return;
        gsap.set(shapes, { strokeDasharray: '1 2', strokeDashoffset: 1 });
        gsap.to(shapes, {
            strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: .08,
            scrollTrigger: { trigger: trigger || scope, start, once: true },
            onComplete: () => gsap.set(shapes, { clearProps: 'strokeDasharray,strokeDashoffset' })
        });
    };

    const fadeUp = (targets, trigger, extra = {}) => gsap.from(targets, Object.assign({
        y: 44, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .09,
        scrollTrigger: { trigger, start: 'top 86%', once: true }
    }, extra));

    const drawFrame = (host) => {
        const path = $('.frame path', host);
        if (!path) return;
        gsap.set(path, { strokeDasharray: '1 2' });
        gsap.fromTo(path, { strokeDashoffset: 1 }, {
            strokeDashoffset: 0, duration: 2, ease: 'power2.inOut',
            scrollTrigger: { trigger: host, start: 'top 80%', once: true }
        });
    };

    function revealMedia(host, { scale = 1.3 } = {}) {
        const clip = $('.media__clip', host);
        const img = $('img', clip);
        gsap.from(clip, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: host, start: 'top 88%', once: true } });
        gsap.from(img, { scale, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: host, start: 'top 88%', once: true } });
        drawFrame(host);
    }

    /* Titulares de una sección: palabras que suben + resaltador que se pinta */
    function headings(scope) {
        $$('.h2, .h3', $(scope)).forEach((h) => {
            const words = $$('.w > span', h);
            const hl = $$('.hl', h);
            if (hl.length) gsap.set(hl, { '--u': '0%' });
            const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 84%', once: true } });
            tl.from(words, { yPercent: 118, duration: 1.1, ease: 'expo.out', stagger: .045 });
            if (hl.length) tl.to(hl, { '--u': '100%', duration: 1.2, ease: 'power3.inOut' }, '-=.55');
        });
    }

    function initTimeline(isStatic) {
        const tlEl = $('[data-timeline]');
        if (!tlEl) return () => {};
        const svg = $('.tl__svg', tlEl);
        const track = $('.tl__track', svg);
        const fill = $('.tl__fill', svg);
        const marker = $('.tl__marker', svg);
        const nodes = $$('.tl__node', tlEl);
        const steps = $$('.tl__step', tlEl);
        let pts = [];
        let len = 1;
        let fr = [];

        const pos = (el) => {
            let x = 0, y = 0, e = el;
            while (e && e !== tlEl) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
            return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
        };

        const update = (p) => {
            fill.style.strokeDashoffset = String(len * (1 - p));
            const pt = fill.getPointAtLength(len * p);
            marker.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
            steps.forEach((s, i) => {
                const on = p >= fr[i] - .012;
                if (on !== s.classList.contains('is-on')) {
                    s.classList.toggle('is-on', on);
                    if (on && !isStatic) {
                        const shapes = $$('.ico--draw *', s);
                        gsap.fromTo(shapes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' });
                    }
                }
            });
        };

        const build = () => {
            pts = nodes.map(pos);
            let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i], m = (a.y + b.y) / 2;
                d += `C${a.x.toFixed(1)} ${m.toFixed(1)} ${b.x.toFixed(1)} ${m.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
            }
            svg.setAttribute('viewBox', `0 0 ${tlEl.offsetWidth} ${tlEl.offsetHeight}`);
            track.setAttribute('d', d);
            fill.setAttribute('d', d);
            len = fill.getTotalLength();
            fill.style.strokeDasharray = String(len);
            const span = (pts[pts.length - 1].y - pts[0].y) || 1;
            fr = pts.map((p) => (p.y - pts[0].y) / span);
        };
        build();

        if (isStatic) {
            update(1);
            return () => {};
        }

        gsap.set($$('.ico--draw *', tlEl), { strokeDasharray: '1 2', strokeDashoffset: 1 });
        const proxy = { p: 0 };
        update(0);
        gsap.to(proxy, {
            p: 1, ease: 'none', onUpdate: () => update(proxy.p),
            scrollTrigger: { trigger: tlEl, start: 'top 62%', end: 'bottom 62%', scrub: .7 }
        });
        steps.forEach((s) => fadeUp($('.tl__body', s), s, { y: 40, stagger: 0, scrollTrigger: { trigger: s, start: 'top 84%', once: true } }));

        const onRefresh = () => { build(); update(proxy.p); };
        ScrollTrigger.addEventListener('refreshInit', onRefresh);
        return () => ScrollTrigger.removeEventListener('refreshInit', onRefresh);
    }

    const mm = gsap.matchMedia();
    mm.add({
        desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
        reduce: '(prefers-reduced-motion: reduce)'
    }, (ctx) => {
        const { desktop, reduce } = ctx.conditions;

        /* Barra de progreso + ocultar/mostrar navegación (válido también con movimiento reducido) */
        const nav = $('#nav');
        const setBar = gsap.quickSetter('.progress span', 'scaleX');
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                setBar(self.progress);
                if (reduce) return;
                const y = self.scroll();
                if (y > 240 && self.direction === 1 && !root.classList.contains('menu-open')) nav.classList.add('is-hidden');
                else if (self.direction === -1 || y <= 240) nav.classList.remove('is-hidden');
            }
        });

        if (reduce) {
            // Sin animaciones: todo visible, línea del proceso completa, sin título dividido en el zoom
            const zt = $('.zoom__title');
            if (zt) zt.style.display = 'none';
            return initTimeline(true);
        }

        /* ----- HERO: parallax de salida ----- */
        gsap.to('.arch__img', { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero__copy', { yPercent: -12, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true } });
        gsap.to('.hero__skyline', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero__aurora', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

        /* ----- TICKER: se acelera con la velocidad del scroll ----- */
        const track = $('.ticker__track');
        const anim = track && track.getAnimations ? track.getAnimations().find((a) => a.animationName === 'ticker') : null;
        if (anim) {
            let boost = 1, rate = 1;
            ScrollTrigger.create({
                start: 0, end: 'max',
                onUpdate: (self) => { boost = Math.max(boost, 1 + Math.min(Math.abs(self.getVelocity()) / 260, 8)); }
            });
            gsap.ticker.add(() => {
                boost += (1 - boost) * .04;
                rate += (boost - rate) * .1;
                anim.playbackRate = rate;
            });
        }

        /* ----- MANIFIESTO: las palabras se encienden con el scroll ----- */
        const manifesto = $('[data-scrub-words]');
        const mWords = $$('.w', manifesto);
        gsap.set(mWords, { opacity: .13 });
        gsap.to(mWords, {
            opacity: 1, ease: 'none', stagger: .12,
            scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 58%', scrub: .6 }
        });
        $$('.inline-img', manifesto).forEach((el) => {
            gsap.fromTo(el, { clipPath: 'inset(0% 100% 0% 0% round .22em)' }, {
                clipPath: 'inset(0% 0% 0% 0% round .22em)', ease: 'none',
                scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 52%', scrub: .5 }
            });
        });

        /* ----- ZOOM: la imagen se abre a pantalla completa ----- */
        const startInset = desktop ? 'inset(24% 30% 24% 30% round 26px)' : 'inset(30% 12% 30% 12% round 22px)';
        gsap.set('.zoom__frame', { clipPath: startInset });
        gsap.set('.zoom__img', { scale: 1.4 });
        gsap.set('.zoom__scrim', { opacity: 0 });
        gsap.set('.zoom__content > *', { autoAlpha: 0, y: 40 });
        gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { id: 'comunidad', trigger: '.zoom', start: 'top top', end: '+=175%', pin: '.zoom__pin', scrub: .8, anticipatePin: 1 }
        })
            .to('.zoom__frame', { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
            .to('.zoom__img', { scale: 1, duration: 1 }, 0)
            .to('.zoom__w--l', { xPercent: desktop ? -70 : -35, autoAlpha: 0, duration: .55 }, .05)
            .to('.zoom__w--r', { xPercent: desktop ? 70 : 35, autoAlpha: 0, duration: .55 }, .05)
            .to('.zoom__scrim', { opacity: 1, duration: .45 }, .6)
            .to('.zoom__content > *', { autoAlpha: 1, y: 0, stagger: .12, duration: .4 }, .8)
            .to({}, { duration: .35 });

        /* ----- SERVICIOS ----- */
        const svc = $('.svc');
        headings('.svc');
        if (desktop) {
            svc.classList.add('svc--h');
            const pin = $('.svc__pin');
            const trk = $('.svc__track');
            const barFill = $('.svc__bar span');
            const dist = () => Math.max(0, trk.offsetWidth - window.innerWidth);
            const tween = gsap.to(trk, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    id: 'servicios', trigger: svc, start: 'top top', end: () => '+=' + dist(), pin, scrub: .9, anticipatePin: 1,
                    invalidateOnRefresh: true, onUpdate: (self) => gsap.set(barFill, { scaleX: self.progress })
                }
            });
            $$('.svc__card').forEach((card) => {
                const st = { trigger: card, containerAnimation: tween, start: 'left 78%', toggleActions: 'play none none reverse' };
                gsap.fromTo($('.svc__media img', card), { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
                gsap.from($('.svc__media', card), { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.3, ease: 'expo.out', scrollTrigger: st });
                gsap.from($$('.svc__text > *', card), { y: 34, autoAlpha: 0, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: st });
                const shapes = $$('.ico--draw *', card);
                gsap.set(shapes, { strokeDasharray: '1 2' });
                gsap.fromTo(shapes, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .1, scrollTrigger: st });
            });
            const out = $('.svc__outro');
            gsap.from($('.svc__outro-txt', out).children, { y: 34, autoAlpha: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: out, containerAnimation: tween, start: 'left 78%', toggleActions: 'play none none reverse' } });
            gsap.from($('.svc__intro .lead'), { y: 30, autoAlpha: 0, duration: 1, delay: .3, ease: 'expo.out', scrollTrigger: { trigger: svc, start: 'top 70%', once: true } });
        } else {
            $$('.svc__card, .svc__outro').forEach((card) => {
                fadeUp(card, card, { y: 70, stagger: 0, scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
                const img = $('.svc__media img', card);
                gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
                drawIcons(card, card, 'top 80%');
            });
            fadeUp('.svc__intro .lead', '.svc__intro');
        }

        /* ----- CERTIFICACIÓN ----- */
        headings('.cert');
        const certMedia = $('.cert__media .media');
        revealMedia(certMedia);
        gsap.fromTo('.cert .media__clip img', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.cert__media', start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.from('.seal--cert', { scale: 0, rotate: -160, autoAlpha: 0, duration: 1.6, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.cert__media', start: 'top 70%', once: true } });
        fadeUp('.cert .lead', '.cert__copy');
        $$('.checks li').forEach((li, i) => {
            fadeUp(li, li, { y: 24, delay: i * .05, stagger: 0, scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
            drawIcons(li, li, 'top 90%');
        });

        /* ----- PROCESO ----- */
        headings('.proc');
        const cleanupTl = initTimeline(false);
        fadeUp('.proc .lead', '.proc .sec-head');
        fadeUp('.proc__cta .btn', '.proc__cta', { y: 30, stagger: 0 });

        /* ----- GALERÍA ----- */
        headings('.gal-sec');
        fadeUp('.gal-sec .lead', '.gal-sec .sec-head');
        $$('.gal__item').forEach((item) => {
            revealMedia($('.media', item), { scale: 1.25 });
            fadeUp($('figcaption', item), item, { y: 14, stagger: 0, delay: .5 });
            const sp = parseFloat(item.dataset.speed || '0.1') * (desktop ? 1 : .55);
            gsap.to(item, { yPercent: -sp * 100, ease: 'none', scrollTrigger: { trigger: '.gal', start: 'top bottom', end: 'bottom top', scrub: .6 } });
        });

        /* ----- BENTO ----- */
        headings('.adv');
        const cells = $$('.bento__cell');
        gsap.set(cells, { autoAlpha: 0, y: 70 });
        ScrollTrigger.batch(cells, {
            start: 'top 90%', once: true,
            onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .12 })
        });
        cells.forEach((c) => drawIcons(c, c, 'top 82%'));
        gsap.fromTo('.bento__big', { scale: .6, transformOrigin: '0% 100%' }, { scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.bento__cell--b', start: 'top 80%', once: true } });
        fadeUp('.adv__cta .btn', '.adv__cta', { y: 30, stagger: 0 });

        /* ----- FAQ ----- */
        headings('.faq');
        fadeUp('.faq .lead, .faq__head .link', '.faq__head', { stagger: .12 });
        fadeUp('.faq__item', '.faq__list', { y: 34, stagger: .08, scrollTrigger: { trigger: '.faq__list', start: 'top 82%', once: true } });

        /* ----- CONTACTO ----- */
        headings('.contact');
        gsap.fromTo('.contact__bg img', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
        fadeUp('.contact .lead', '.contact__copy');
        fadeUp('.contact__list li', '.contact__list', { y: 30, stagger: .1 });
        gsap.from('#lead-form', { y: 90, scale: .96, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '#lead-form', start: 'top 88%', once: true } });

        /* ----- FOOTER ----- */
        gsap.to('.foot__word-fill', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.foot__word', start: 'top 100%', end: 'bottom 97%', scrub: .6 } });
        fadeUp('.foot__grid > *', '.foot__grid', { y: 34, stagger: .1 });

        return cleanupTl;
    });

    /* ---------- Arranque ---------- */
    const heroTl = prepareHero();
    initPointerFx();
    runLoader().then(() => {
        if (reduced.matches) heroTl.progress(1); else heroTl.play();
        startNetwork();
        // Flotación constante de la tarjeta de llamada (GSAP para no chocar con el paralaje)
        if (!reduced.matches) gsap.to('.callcard', { y: -9, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        const wa = $('.wa');
        setTimeout(() => wa && wa.classList.add('is-in'), 900);
        setTimeout(() => wa && wa.classList.add('show-tip'), 5200);
        setTimeout(() => wa && wa.classList.remove('show-tip'), 9800);
        ScrollTrigger.refresh();
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
