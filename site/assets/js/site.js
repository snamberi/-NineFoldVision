// Shared behavior for every page: navigation, footer details, scroll reveals, reading progress, spoilers and
// the update/game renderers. Pages call into window.NFV.
(function () {
  document.documentElement.classList.remove('no-js');

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: progress just isn't kept */ } },
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // A small, safe subset of Markdown: **bold** and [label](url).
  const md = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => /^(https?:|mailto:|[\w./#?=-]+$)/.test(url) ? `<a href="${url}">${label}</a>` : label);

  const games = () => window.NFV_GAMES || [];
  const game = slug => games().find(g => g.slug === slug);
  const statusLabel = { live: 'Out now', dev: 'In development', soon: 'Coming soon' };

  /** Every game update the page has loaded, newest first within each game. */
  function gameUpdates(slug) {
    const generated = (window.NFV_GAME_UPDATES || {});
    const list = [];
    for (const g of games()) {
      if (slug && g.slug !== slug) continue;
      const items = generated[g.slug] || g.updates || [];
      items.forEach((u, i) => list.push({ ...u, game: g.slug, number: u.number || items.length - i }));
    }
    return list;
  }

  function renderUpdate(u, { open = false } = {}) {
    const g = game(u.game);
    const heads = (u.items || []).map(i => i.head).filter(Boolean);
    return `<details class="card update"${open ? ' open' : ''} style="--c:${g ? g.accent : 'var(--orange)'}">
      <summary>
        <div class="update-badge" style="border-color:${g ? g.accent : 'var(--line)'}"><span style="color:${g ? g.accent : 'var(--orange)'}">${esc(g ? g.name : 'Update')}</span><b>#${u.number}</b></div>
        <div><h3>${esc(u.title)}</h3><div class="heads">${esc(heads.slice(0, 6).join(' · '))}${heads.length > 6 ? ' …' : ''}</div></div>
        <span class="chev" aria-hidden="true">▾</span>
      </summary>
      <div class="update-body"><ul>${(u.items || []).map(i => `<li>${md(i.text)}</li>`).join('')}</ul></div>
    </details>`;
  }

  function renderNews(n) {
    const g = n.game && game(n.game);
    const date = new Date(`${n.date}T12:00:00`);
    return `<article class="card news-card">
      <time datetime="${esc(n.date)}">${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}${g ? ` · ${esc(g.name)}` : ' · Studio'}</time>
      <h3 style="margin-top:8px">${esc(n.title)}</h3>
      <p class="muted">${md(n.text)}</p>
      ${n.link ? `<a href="${esc(n.link.url)}">${esc(n.link.label)} →</a>` : ''}
    </article>`;
  }

  function renderGameCard(g) {
    const play = (g.links || []).find(l => l.primary);
    return `<article class="card game-card reveal" style="--accent:${esc(g.accent || "")}">
      <a class="cover" href="game.html?g=${encodeURIComponent(g.slug)}" aria-label="${esc(g.name)}"><img src="${esc(g.cover)}" alt="${esc(g.name)} cover art" loading="lazy" width="1200" height="630"></a>
      <div class="body">
        <span class="status status-${esc(g.status)}">${statusLabel[g.status] || esc(g.status)}</span>
        <h3>${esc(g.name)}</h3>
        <p class="muted" style="margin:0">${esc(g.tagline)}</p>
        <div class="tags">${[g.genre, g.price, ...(g.platforms || [])].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="btn-row" style="margin-top:auto">
          ${play ? `<a class="btn btn-primary" href="${esc(play.url)}" rel="noopener">${esc(play.label)}</a>` : ''}
          <a class="btn btn-ghost" href="game.html?g=${encodeURIComponent(g.slug)}">Details &amp; updates</a>
        </div>
      </div>
    </article>`;
  }

  const forgeCard = () => `<div class="card forge-card reveal">
      <span class="status status-soon">Next project</span>
      <h3 style="margin-top:12px">In the forge</h3>
      <p class="muted" style="margin:0">Our next game is being built. It will appear here, with its updates, the day we announce it.</p>
    </div>`;

  // Reading progress, per book: the last chapter opened and every chapter finished.
  const progress = {
    get(slug) { const p = store.get(`nfv:read:${slug}`, null); return { last: p?.last || 0, done: new Set(p?.done || []) }; },
    save(slug, p) { store.set(`nfv:read:${slug}`, { last: p.last, done: [...p.done].sort((a, b) => a - b) }); },
    /** The furthest chapter this visitor has reached (opened or finished). */
    furthest(slug) { const p = progress.get(slug); return Math.max(p.last, ...p.done, 0); },
  };

  // Spoilers: anything marked .spoiler[data-ch] stays blurred until the reader has reached that chapter,
  // or until they switch "Show all spoilers" on, or tap the item itself.
  function applySpoilers(root = document) {
    const showAll = store.get('nfv:spoilers', false);
    root.querySelectorAll('.spoiler[data-ch]').forEach(el => {
      const book = el.dataset.book || (window.NFV_BOOKS && window.NFV_BOOKS[0] && window.NFV_BOOKS[0].slug);
      const reached = book ? progress.furthest(book) : 0;
      const ch = Number(el.dataset.ch);
      const hide = !showAll && reached < ch && !el.dataset.revealed;
      el.classList.toggle('hidden', hide);
      let cover = el.querySelector(':scope > .spoiler-cover');
      if (!cover) {
        cover = document.createElement('button');
        cover.type = 'button';
        cover.className = 'spoiler-cover';
        cover.innerHTML = `<span>Spoiler · revealed in chapter ${ch}<br>Tap to reveal</span>`;
        cover.addEventListener('click', () => { el.dataset.revealed = '1'; el.classList.remove('hidden'); });
        el.prepend(cover);
      }
      // Hide the blurred content from screen readers too, but never the button that reveals it.
      for (const child of el.children) if (child !== cover) child.toggleAttribute('aria-hidden', hide);
    });
    document.querySelectorAll('[data-spoiler-toggle]').forEach(input => {
      input.checked = showAll;
      if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('change', () => { store.set('nfv:spoilers', input.checked); applySpoilers(); });
      }
    });
  }

  // Pixel social icons on a 16x16 grid: a stepped tile in the network's colour with a white glyph drawn from rows.
  const glyph = rows => rows.flatMap((row, y) => [...row].flatMap((c, x) => c === '1' ? [`M${x} ${y}h1v1h-1z`] : [])).join('');
  const ICONS = {
    discord: { bg: '#5865f2', dark: '#3c45a5', rows: ['', '', '', ' 00011000011000', ' 00111111111100', ' 01111111111110', ' 01111111111110', ' 11100111100111', ' 11100111100111', ' 11111111111111', ' 11111111111111', ' 01110000001110', ' 00100000000100'] },
    youtube: { bg: '#e62117', dark: '#9e140d', rows: ['', '', '', '', '', '      1', '      11', '      111', '      1111', '      111', '      11', '      1'] },
    tiktok: { bg: '#111318', dark: '#000', rows: ['', '', '         1', '         11', '         111', '         1 1', '         1', '     1111', '    11  1', '    1   1', '    1   1', '    11 11', '     111'] },
    instagram: { bg: '#c13584', dark: '#7a1f55', rows: ['', '', '   1111111111', '   1        1', '   1      1 1', '   1  111   1', '   1 1   1  1', '   1 1   1  1', '   1 1   1  1', '   1  111   1', '   1        1', '   1111111111'] },
    reddit: { bg: '#ff4500', dark: '#b33000', rows: ['', '', '          11', '        1 11', '       1', '  11 1111111 11', '  1111111111111', '   11111111111', '   11 111 1111', '   11111111111', '   111 111 111', '    111   111', '     1111111'] },
  };
  /** A social network's pixel icon as inline SVG. */
  function socialIcon(id, size = 20) {
    const i = ICONS[id];
    if (!i) return '';
    return `<svg class="px-icon" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="${i.dark}" d="M1 0h14v1h1v14h-1v1H1v-1H0V1h1z"/><path fill="${i.bg}" d="M1 1h14v13H1z"/>
      <path fill="#fff" d="${glyph(i.rows.map(r => r.replace(/ /g, '0')))}"/></svg>`;
  }

  /** Fills a [data-signup] slot with the email form, or removes the slot while no newsletter is set up. */
  function renderSignup(el) {
    const user = (window.NFV_STUDIO || {}).newsletter?.buttondown;
    if (!user) { (el.closest('.signup-band') || el).remove(); return; }
    const band = el.dataset.signup === 'band';
    const id = `signup-${Math.random().toString(36).slice(2, 8)}`;
    el.innerHTML = `<div class="signup${band ? '' : ' card'}">
      <div><p class="eyebrow">Newsletter</p><h2${band ? ' id="signup-title"' : ''}>Get new chapters and updates</h2>
        <p class="muted">New story chapters, game updates and studio news, straight to your inbox. No spam, unsubscribe any time.</p></div>
      <form class="signup-form" action="https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(user)}" method="post" target="_blank">
        <label class="sr-only" for="${id}">Email address</label>
        <input id="${id}" type="email" name="email" placeholder="you@example.com" autocomplete="email" required>
        <input type="hidden" name="embed" value="1">
        <button class="btn btn-primary" type="submit">Sign up</button>
        <p class="signup-legal">We'll send a confirmation email first. Your address is stored by our newsletter provider, Buttondown, and used only for these emails. See our <a href="privacy.html#collect">privacy policy</a>.</p>
      </form>
    </div>`;
    el.querySelector('form').addEventListener('submit', e => {
      const form = e.currentTarget;
      // Let the browser send the form to the new tab first, then thank the visitor here.
      setTimeout(() => { form.innerHTML = '<p class="signup-done">Almost there! Check your inbox and confirm your email.</p>'; }, 50);
    });
  }

  // Legal pages: fill the operator, contact, governing law and date from data/studio.js.
  function fillLegal(studio) {
    const legal = studio.legal || {};
    const contact = studio.email
      ? `<a href="mailto:${esc(studio.email)}">${esc(studio.email)}</a>`
      : studio.discord ? `<a href="${esc(studio.discord)}" target="_blank" rel="noopener noreferrer">our Discord server</a> (message a moderator)` : '';
    document.querySelectorAll('[data-legal-contact]').forEach(el => { if (contact) el.innerHTML = contact; });
    document.querySelectorAll('[data-legal-owner]').forEach(el => { el.textContent = legal.owner || studio.name || 'NineFoldVision'; });
    if (legal.country) document.querySelectorAll('[data-legal-law]').forEach(el => { el.textContent = `These terms are governed by the laws of ${legal.country}`; });
    if (legal.updated) document.querySelectorAll('[data-legal-updated]').forEach(el => {
      el.textContent = new Date(`${legal.updated}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    });
  }

  // A one-time notice about the strictly necessary storage the site uses. No consent is needed for it (nothing
  // tracks you), so this only informs; closing it is remembered.
  function storageNotice() {
    if (store.get('nfv:notice', false) || /(privacy|terms)\.html$/.test(location.pathname)) return;
    const bar = document.createElement('div');
    bar.className = 'storage-notice';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Storage notice');
    bar.innerHTML = `<p>No ads, no tracking. We only store your reading progress and settings on your device, and keep you signed in if you choose to. <a href="privacy.html#storage">Privacy &amp; cookies</a></p>
      <button type="button" class="btn btn-primary">Got it</button>`;
    bar.querySelector('button').addEventListener('click', () => { store.set('nfv:notice', true); bar.remove(); });
    document.body.appendChild(bar);
  }

  function initChrome() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (toggle && nav) toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#site-nav a').forEach(a => {
      const target = a.getAttribute('href');
      if (target === here || (here === 'game.html' && target === 'games.html') || (here === '' && target === 'index.html')) a.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

    const studio = window.NFV_STUDIO || {};
    const socials = (studio.socials || []).filter(s => s.url);
    const contact = [
      studio.email ? `<li><a href="mailto:${esc(studio.email)}">${esc(studio.email)}</a></li>` : '',
      ...socials.map(s => `<li><a class="social-line" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${socialIcon(s.id, 18)}${esc(s.label)}</a></li>`),
    ].join('');
    document.querySelectorAll('[data-studio-contact]').forEach(el => {
      if (contact) el.innerHTML = contact; else el.closest('[data-studio-contact-block]')?.remove();
    });
    // A row of pixel icons at the foot of every page.
    const base = document.querySelector('.footer-base');
    if (base && socials.length && !base.querySelector('.footer-social')) {
      base.insertAdjacentHTML('afterbegin', `<div class="footer-social" aria-label="NineFoldVision community">${socials.map(s =>
        `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.label)}" aria-label="${esc(s.label)} (opens in a new tab)">${socialIcon(s.id, 26)}</a>`).join('')}</div>`);
    }
    // Community page cards and the home page's icon row.
    document.querySelectorAll('[data-community-cards]').forEach(el => {
      el.innerHTML = socials.map(s => `<a class="card community-card lift" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
        ${socialIcon(s.id, 40)}<h3>${esc(s.label)}</h3><p class="muted">${esc(s.blurb || '')}</p><span class="go">${s.id === 'discord' ? 'Join the server' : 'Follow'} →</span></a>`).join('');
    });
    document.querySelectorAll('[data-community-icons]').forEach(el => {
      el.innerHTML = socials.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.label)}" aria-label="${esc(s.label)} (opens in a new tab)">${socialIcon(s.id, 34)}</a>`).join('');
    });
    // Email sign-up: a band above the footer on every page, plus any [data-signup] slot a page adds.
    const footer = document.querySelector('.site-footer');
    if (footer && !document.querySelector('.signup-band')) {
      footer.insertAdjacentHTML('beforebegin', `<section class="signup-band" aria-labelledby="signup-title"><div class="wrap" data-signup="band"></div></section>`);
    }
    document.querySelectorAll('[data-signup]').forEach(el => renderSignup(el));
    fillLegal(studio);
    storageNotice();
    if (studio.discord) document.querySelectorAll('[data-join-discord]').forEach(a => { a.href = studio.discord; a.insertAdjacentHTML('afterbegin', socialIcon('discord', 20)); });
    // Account button in the header; assets/js/account.js fills it in (signed-in name, or a sign-in prompt).
    const headerWrap = document.querySelector('.site-header .wrap');
    if (headerWrap && !headerWrap.querySelector('[data-account]')) {
      headerWrap.insertAdjacentHTML('beforeend', `<a class="acct-btn" data-account href="profile.html"><span class="acct-dot" aria-hidden="true"></span><span data-account-label>Sign in</span></a>`);
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'assets/js/account.js';
      document.head.appendChild(s);
    }
    window.dispatchEvent(new Event('nfv:chrome'));
    document.querySelectorAll('[data-game-links]').forEach(el => {
      el.innerHTML = games().map(g => `<li><a href="game.html?g=${encodeURIComponent(g.slug)}">${esc(g.name)}</a></li>`).join('');
    });
    observeReveals();
  }

  function observeReveals(root = document) {
    const items = root.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  }

  window.NFV = { socialIcon, renderSignup, esc, md, store, games, game, gameUpdates, renderUpdate, renderNews, renderGameCard, forgeCard, progress, applySpoilers, observeReveals, statusLabel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome); else initChrome();
})();
