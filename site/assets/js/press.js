// press.html: the fact sheet, long description and game cards, drawn from data/games.js, data/books.js and
// data/studio.js so the press kit stays current when a game or book is added.
(function () {
  const { esc, games, statusLabel } = window.NFV;
  const studio = window.NFV_STUDIO || {};
  const book = (window.NFV_BOOKS || [])[0];
  const list = games();

  const facts = [
    ['Studio', esc(studio.name || 'NineFoldVision')],
    ['Website', `<a href="${esc(studio.url || 'https://ninefoldvision.online')}">${esc((studio.url || 'https://ninefoldvision.online').replace(/^https?:\/\//, ''))}</a>`],
    ['Games', list.map(g => `<a href="game.html?g=${encodeURIComponent(g.slug)}">${esc(g.name)}</a> (${esc(statusLabel[g.status] || g.status)})`).join(', ')],
    ['Price', 'Free to play'],
    ['Platforms', esc([...new Set(list.flatMap(g => g.platforms || []))].join(', '))],
    book ? ['Story', `<a href="story.html"><em>${esc(book.title)}</em></a>, ${book.chapters.length} chapters, free to read`] : null,
    studio.email ? ['Press contact', `<a href="mailto:${esc(studio.email)}">${esc(studio.email)}</a>`] : null,
    studio.discord ? ['Community', `<a href="${esc(studio.discord)}" target="_blank" rel="noopener noreferrer">Discord server</a>`] : null,
  ].filter(Boolean);
  document.querySelector('[data-press-facts]').innerHTML = facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

  document.querySelector('[data-press-long]').textContent =
    `NineFoldVision is an independent game studio. Every game it makes is free and set in one shared world, the Vision universe: nine Earths, each guarded by its own goddess, joined by the Ninefold Path.\n\n`
    + list.map(g => g.description).join('\n\n')
    + (book ? `\n\nThe universe's first story, ${book.title}, is free to read in ${book.chapters.length} chapters at ninefoldvision.online.` : '');

  document.querySelector('[data-press-games]').innerHTML = list.map(g => `<article class="card">
      <img src="${esc(g.cover)}" alt="${esc(g.name)} cover art" loading="lazy" width="1200" height="630" style="width:100%;height:auto;margin-bottom:16px">
      <h3>${esc(g.name)}</h3>
      <p class="muted">${esc(g.description)}</p>
      <div class="tags">${[g.genre, g.price, ...(g.platforms || [])].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <div class="btn-row" style="margin-top:18px">${(g.links || []).slice(0, 2).map((l, i) => `<a class="btn ${i ? 'btn-ghost' : 'btn-primary'}" href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`).join('')}</div>
    </article>`).join('');

  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const text = document.getElementById(btn.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied!'; } catch { btn.textContent = 'Select and copy'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  }));
})();
