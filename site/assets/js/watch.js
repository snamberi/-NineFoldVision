// watch.html: the TikTok account's latest videos (TikTok's own creator embed) and any pinned videos, both
// set in data/studio.js. TikTok's embed script turns the blockquotes into players.
(function () {
  const { esc } = window.NFV;
  const tt = (window.NFV_STUDIO || {}).tiktok || {};
  const user = String(tt.username || '').replace(/^@/, '');
  const profile = user ? `https://www.tiktok.com/@${encodeURIComponent(user)}` : 'https://www.tiktok.com/';
  document.querySelectorAll('[data-tiktok-follow]').forEach(a => { a.href = profile; });

  const pinned = (tt.pinned || []).map(url => ({ url, id: (String(url).match(/\/video\/(\d+)/) || [])[1] })).filter(v => v.id);
  if (pinned.length) {
    document.querySelector('[data-pinned-section]').hidden = false;
    document.querySelector('[data-tiktok-pinned]').innerHTML = pinned.map(v =>
      `<blockquote class="tiktok-embed" cite="${esc(v.url)}" data-video-id="${esc(v.id)}" style="max-width:325px;min-width:300px"><section><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Watch on TikTok</a></section></blockquote>`).join('');
  }

  const feed = document.querySelector('[data-tiktok-feed]');
  feed.innerHTML = user
    ? `<blockquote class="tiktok-embed" cite="${esc(profile)}" data-unique-id="${esc(user)}" data-embed-type="creator" style="max-width:780px;min-width:288px"><section><a href="${esc(profile)}" target="_blank" rel="noopener noreferrer">@${esc(user)} on TikTok</a></section></blockquote>`
    : '<p class="tiktok-fallback muted">Videos are coming soon.</p>';

  if (user || pinned.length) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.tiktok.com/embed.js';
    // Blocked by a privacy extension or offline: the blockquotes still link to TikTok.
    s.onerror = () => feed.insertAdjacentHTML('beforeend', `<p class="tiktok-fallback muted">The player couldn't load here. <a href="${esc(profile)}" target="_blank" rel="noopener noreferrer">Watch on TikTok &rarr;</a></p>`);
    document.body.appendChild(s);
  }
})();
