// watch.html: YouTube videos from data/studio.js. Each player is a click-to-play placeholder: the YouTube
// iframe (privacy-enhanced youtube-nocookie.com) is only created when the visitor presses play, so nothing
// is loaded from YouTube, and no YouTube cookies are set, before then.
(function () {
  const { esc } = window.NFV;
  const yt = (window.NFV_STUDIO || {}).youtube || {};
  const channel = yt.url || 'https://www.youtube.com/@NineFoldVision';
  document.querySelectorAll('[data-yt-channel]').forEach(a => { a.href = channel; });

  /** The video ID from a watch, youtu.be, Shorts or embed link. */
  const videoId = url => (String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
  const player = (src, label, vertical) => `<div class="yt-player${vertical ? ' vertical' : ''}">
      <button type="button" class="yt-play" data-src="${esc(src)}" aria-label="Play: ${esc(label)}">
        <svg width="72" height="72" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#9e140d" d="M1 3h14v1h1v8h-1v1H1v-1H0V4h1z"/><path fill="#e62117" d="M1 4h14v8H1z"/><path fill="#fff" d="M6 6h1v4H6zM7 6.5h1v3H7zM8 7h1v2H8zM9 7.5h1v1H9z"/></svg>
        <span>${esc(label)}</span><small>Plays from YouTube</small>
      </button>
    </div>`;
  const embed = (path, extra = '') => `https://www.youtube-nocookie.com/embed/${path}${path.includes('?') ? '&' : '?'}autoplay=1&rel=0${extra}`;

  const pinned = (yt.pinned || []).map(u => ({ id: videoId(u), shorts: /shorts\//.test(u) })).filter(v => v.id);
  if (pinned.length) {
    document.querySelector('[data-yt-section="pinned"]').hidden = false;
    document.querySelector('[data-yt-pinned]').innerHTML = pinned.map((v, i) => player(embed(v.id), `Featured video ${i + 1}`, v.shorts)).join('');
  }
  // A channel's uploads playlist is its channel ID with UC swapped for UU; it always shows the newest upload first.
  const uploads = /^UC[\w-]{22}$/.test(yt.channelId || '') ? `UU${yt.channelId.slice(2)}` : '';
  if (uploads) {
    document.querySelector('[data-yt-section="latest"]').hidden = false;
    document.querySelector('[data-yt-latest]').innerHTML = player(embed(`videoseries?list=${uploads}`), 'Latest uploads');
  }
  if (!pinned.length && !uploads) document.querySelector('[data-yt-section="empty"]').hidden = false;

  document.addEventListener('click', e => {
    const btn = e.target.closest('.yt-play');
    if (!btn) return;
    const frame = document.createElement('iframe');
    frame.src = btn.dataset.src;
    frame.title = btn.querySelector('span').textContent;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    btn.replaceWith(frame);
  });
})();
