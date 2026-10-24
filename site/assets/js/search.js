// Player search (profiles by username prefix) and the pixel monogram used for players without a picture.
import { client, esc } from './account.js';

// A stable colour per name for the pixel monogram.
export const hue = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
export const monogram = (name, size = 'lg') => `<div class="monogram monogram-${size}" style="--h:${hue(name)}" aria-hidden="true">${esc(String(name || '?').slice(0, 1).toUpperCase())}</div>`;


export function bindSearch() {
  const form = document.getElementById('player-search');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  const input = form.querySelector('input');
  const list = form.querySelector('[data-results]');
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      const c = await client();
      const { data, error } = await c.from('lb_users').select('username, title, level').ilike('username', `${q.replace(/[%_\\]/g, m => `\\${m}`)}%`).order('level', { ascending: false }).limit(8);
      if (error) { list.innerHTML = `<li class="muted">Search is unavailable right now.</li>`; return; }
      list.innerHTML = (data || []).length
        ? data.map(p => `<li><a href="profile.html?u=${encodeURIComponent(p.username)}">${monogram(p.username, 'sm')}<span><b>${esc(p.username)}</b><small>${esc(p.title || '')}</small></span></a></li>`).join('')
        : `<li class="muted">No player called “${esc(q)}…”</li>`;
    }, 220);
  });
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q) location.href = `profile.html?u=${encodeURIComponent(q)}`; });
}

