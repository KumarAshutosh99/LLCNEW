(() => {
  // Prevent double-init (e.g., partial reloads)
  if (window.__formllcAppInit) return;
  window.__formllcAppInit = true;

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];

  // Year
  const yearEl = qs('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile sheet: scroll lock + focus trap + Esc/overlay close
  (function initMobileSheet(){
    const mmenu   = qs('#mmenu');
    const openBtn = qs('#burger');
    const closeBtn= qs('#closeSheet');
    if (!mmenu || !openBtn || !closeBtn) return;

    let lastFocus = null;
    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      const f = qsa('a,button,[tabindex]:not([tabindex="-1"])', mmenu);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    };
    const openMenu = () => {
      lastFocus = document.activeElement;
      mmenu.classList.add('open');
      mmenu.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
      mmenu.addEventListener('keydown', trapFocus);
      (qs('a,button', mmenu) || mmenu).focus();
    };
    const closeMenu = () => {
      mmenu.classList.remove('open');
      mmenu.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      mmenu.removeEventListener('keydown', trapFocus);
      lastFocus && lastFocus.focus();
    };

    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    mmenu.addEventListener('click', (e) => { if (e.target === mmenu) closeMenu(); }, {passive:true});
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mmenu.classList.contains('open')) closeMenu();
    });
  })();

  // Custom selects: supports new [data-select] and legacy IDs (#entityBtn/#entityMenu, #stateBtn/#stateMenu)
  (function initSelects(){
    function wire(root, btn, menu){
      if (!btn || !menu) return;
      menu.classList.add('menu'); // ensure class for CSS
      let open = false, idx = -1;
      const options = qsa('button[role="option"], .menu button', menu);

      const openMenu = () => {
        qsa('.menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
        menu.classList.add('open'); btn.setAttribute('aria-expanded','true');
        open = true; idx = -1;
      };
      const closeMenu = () => {
        menu.classList.remove('open'); btn.setAttribute('aria-expanded','false');
        open = false;
      };

      btn.addEventListener('click', (e) => { e.stopPropagation(); open ? closeMenu() : openMenu(); });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' '){
          e.preventDefault(); openMenu(); options[0]?.focus(); idx = 0;
        }
        if (e.key === 'Escape') closeMenu();
      });

      menu.addEventListener('keydown', (e) => {
        if (!open) return;
        if (e.key === 'Escape'){ e.preventDefault(); closeMenu(); btn.focus(); }
        if (e.key === 'ArrowDown'){ e.preventDefault(); idx = (idx+1) % options.length; options[idx]?.focus(); }
        if (e.key === 'ArrowUp'){ e.preventDefault(); idx = (idx-1+options.length) % options.length; options[idx]?.focus(); }
        if (e.key === 'Tab'){ closeMenu(); }
      });

      options.forEach(o => o.addEventListener('click', () => {
        const val = o.dataset.value || o.textContent.trim();
        btn.textContent   = val;
        btn.dataset.value = val;
        closeMenu(); btn.focus();
      }));

      document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) closeMenu(); });
    }

    // New pattern
    qsa('[data-select]').forEach(root => {
      const btn  = qs('[data-role="button"]', root) || qs('button', root);
      const menu = qs('[data-role="menu"]', root)   || qs('.menu', root);
      wire(root, btn, menu);
    });

    // Legacy fallback
    wire(null, qs('#entityBtn'), qs('#entityMenu'));
    wire(null, qs('#stateBtn'),  qs('#stateMenu'));
  })();

  // CTA: safe demo (still works with legacy IDs)
  (function initCTA(){
    const startBtn = qs('#startBtn');
    if (!startBtn) return;
    startBtn.addEventListener('click', () => {
      const entity = qs('#entityBtn')?.dataset.value || 'LLC';
      const state  = qs('#stateBtn')?.dataset.value  || 'Wyoming';
      alert(`Great! We'll help you form a ${entity} in ${state}.\nNext step: share your email/WhatsApp on the contact form.`);
    });
  })();

  // Logo rails: seamless marquee with reduced-motion / visibility pause
  (function initRails(){
    const rows = qsa('.logo-rails__row');
    if (!rows.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let paused = false;
    const section = qs('#logo-rails');
    if (section){
      section.addEventListener('mouseenter', () => paused = true);
      section.addEventListener('mouseleave', () => paused = false);
      section.addEventListener('touchstart', () => paused = true, {passive:true});
      section.addEventListener('touchend',   () => paused = false, {passive:true});
    }

    const recalcGap = (row) => {
      const track = qs('.logo-rails__track', row);
      if (!track) return 0;
      const cs = getComputedStyle(track);
      const g = parseFloat(cs.gap || cs.columnGap || cs.rowGap || '0');
      row.__gap = isNaN(g) ? 0 : g;
      return row.__gap;
    };

    rows.forEach((row) => {
      const track = qs('.logo-rails__track', row);
      if (!track) return;
      track.style.willChange = 'transform';

      const dir   = (row.dataset.direction || 'rtl').toLowerCase(); // 'rtl' | 'ltr'
      const speed = parseFloat(row.dataset.speed || '90');           // px/sec

      recalcGap(row);
      let offset = 0, lastT = performance.now();

      const step = (now) => {
        requestAnimationFrame(step);
        if (document.hidden || paused) { lastT = now; return; }
        const dt = (now - lastT) / 1000; lastT = now;

        const vx = (dir === 'rtl' ? -speed : speed);
        offset += vx * dt;

        if (dir === 'rtl'){
          let moved = true;
          while (moved){
            moved = false;
            const first = track.firstElementChild; if (!first) break;
            const w = first.getBoundingClientRect().width + row.__gap;
            if (-offset >= w){ track.appendChild(first); offset += w; moved = true; }
          }
        } else {
          let moved = true;
          while (moved){
            moved = false;
            const last = track.lastElementChild; if (!last) break;
            const w = last.getBoundingClientRect().width + row.__gap;
            if (offset >= w){ track.prepend(last); offset -= w; moved = true; }
          }
        }
        track.style.transform = `translate3d(${offset}px,0,0)`;
      };
      requestAnimationFrame(step);

      // Debounced gap recalc on resize
      let t;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => recalcGap(row), 120); });
    });
  })();

  // FAQ-------------------------

  (function initFAQ(){
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const tabs   = qsa('.faq-tab');
  const panels = qsa('.faq-panel');
  const questions = qsa('.faq-q');

  function showPanelByTab(tab){
    const cat = tab.dataset.cat || 'basics';

    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach(p => p.classList.remove('is-active'));
    const target = qs(`#faq-panel-${cat}`) || qs('#faq-panel-basics');
    target && target.classList.add('is-active');

    // Filter items if basics
    if (target && target.id === 'faq-panel-basics'){
      const list = qs('.faq-accordion', target);
      if (list){
        qsa('.faq-item', list).forEach(item => {
          const cats = (item.dataset.cat || '').split(/\s+/).map(s => s.trim());
          const show = cat === 'basics' ? cats.includes('basics') : cats.includes(cat);
          item.style.display = show ? '' : 'none';
          if (!show){
            const q = qs('.faq-q', item);
            const a = qs('.faq-a', item);
            q && q.setAttribute('aria-expanded','false');
            if (a){ a.style.maxHeight = '0px'; a.style.opacity = '0'; }
          }
        });
      }
    }
  }

  // Tab click
  tabs.forEach(tab => {
    tab.addEventListener('click', () => showPanelByTab(tab));
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPanelByTab(tab); }
    });
  });

  // Accordion toggle
  questions.forEach(q => {
    q.addEventListener('click', () => {
      const expanded = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', !expanded);
      const a = qs('#' + q.getAttribute('aria-controls'));
      if (a){
        if (!expanded){
          a.style.maxHeight = a.scrollHeight + 'px';
          a.style.opacity = '1';
        } else {
          a.style.maxHeight = '0px';
          a.style.opacity = '0';
        }
      }
    });
  });

  // Deep link (#faq-panel-xxx)
  const hash = location.hash;
  const panel = hash && qs(hash + '.faq-panel');
  const tab   = panel && qs(`.faq-tab[aria-controls="${panel.id}"]`);
  if (tab) showPanelByTab(tab);

})();

  // === Contact form: AJAX -> submit_contact.php (MySQL via PHP) ===
  (function initFaqForm(){
    const form = qs('#faqQuoteForm');
    const successEl = qs('#faqFormSuccess');
    if (!form) return;

    const btn = form.querySelector('button[type="submit"]');

    async function submitForm(e){
      e.preventDefault();
      if (!form.checkValidity()){ form.reportValidity(); return; }

      // UX: disable button during submission
      const oldLabel = btn ? btn.textContent : '';
      if (btn){ btn.disabled = true; btn.textContent = 'Submitting…'; }

      const fd = new FormData(form);

      try {
        const res = await fetch('submit_contact.php', {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' }
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          const err = (data && data.errors)
            ? Object.values(data.errors).join('\n')
            : (data && data.error) || 'Submission failed';
          alert(err);
          return;
        }

        // Success UI
        if (successEl) successEl.hidden = false;
        form.reset();
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        if (btn){ btn.disabled = false; btn.textContent = oldLabel; }
      }
    }

    form.addEventListener('submit', submitForm);
  })();

})();

// ===== Footer Year =====
document.getElementById('footerYear').textContent = new Date().getFullYear();