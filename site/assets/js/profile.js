// profile.html: a player's Ninefold profile. Universal username, friends, the six-trophy showcase, their Court Vision
// and Dragon Vision cards and recent activity. Anyone can read a profile; the owner can edit their showcase and name.
import { client, esc, getAccount, onAccount, openSignIn, setUsername, signOut, USERNAME_RE } from './account.js';
import { bindSearch, monogram } from './search.js';

const root = document.getElementById('profile-root');
const TROPHIES = window.NFV_TROPHIES || {};
const GAME = {
  courtvision: { name: 'Court Vision', emoji: '🏀', accent: '#f47b20', url: 'game.html?g=courtvision' },
  dragonvision: { name: 'Dragon Vision', emoji: '🐉', accent: '#c084fc', url: 'game.html?g=dragonvision' },
  ninefold: { name: 'NineFoldVision', emoji: '🌌', accent: '#9fc6e2', url: 'index.html' },
};
const num = n => Number(n || 0).toLocaleString();
const ago = iso => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const trophy = (game, id) => TROPHIES[game]?.[id] || { name: id.replace(/^mode-/, '').replace(/[-_]/g, ' '), text: '', group: '' };
const stars = n => `<span class="stars" aria-label="${n} stars">★${n}</span>`;

const params = new URLSearchParams(location.search);
let wanted = params.get('u');

function shell(html) { root.innerHTML = html; }
function loading(text = 'Loading the profile…') { shell(`<div class="card state-card"><p class="muted">${esc(text)}</p></div>`); }

// ---------------------------------------------------------------- landing (no ?u=)

async function landing(acct) {
  if (acct.status === 'signedIn' && acct.profile?.username) { location.replace(`profile.html?u=${encodeURIComponent(acct.profile.username)}`); return; }
  const claim = acct.status === 'signedIn' && !acct.profile?.username;
  shell(`
    ${claim ? claimCard() : ''}
    ${acct.status === 'signedOut' ? `<div class="card cta-card">
      <div><p class="eyebrow">Ninefold account</p><h2>One name for every world</h2>
      <p class="muted">Sign in with Discord or Google, the same account as Court Vision and Dragon Vision. Pick your six proudest trophies and see your friends across every game.</p></div>
      <button class="btn btn-primary" data-signin>Sign in</button></div>` : ''}
    <div class="card"><h3>Top players</h3><ol class="top-players" data-top><li class="muted">Loading…</li></ol></div>`);
  root.querySelector('[data-signin]')?.addEventListener('click', openSignIn);
  bindClaim();
  try {
    const c = await client();
    const { data } = await c.from('lb_users').select('username, title, level').order('xp', { ascending: false }).limit(12);
    root.querySelector('[data-top]').innerHTML = (data || []).map((p, i) => `<li><a href="profile.html?u=${encodeURIComponent(p.username)}"><span class="rank">${i + 1}</span>${monogram(p.username, 'sm')}<span><b>${esc(p.username)}</b><small>${esc(p.title || '')} · Lv ${p.level}</small></span></a></li>`).join('') || '<li class="muted">No players yet.</li>';
  } catch { root.querySelector('[data-top]').innerHTML = '<li class="muted">Players are unavailable right now.</li>'; }
}

function claimCard() {
  return `<form class="card claim-card" data-claim>
    <p class="eyebrow">Welcome</p><h2>Choose your Ninefold name</h2>
    <p class="muted">It's yours in every NineFoldVision game: 3–18 letters, numbers or underscores.</p>
    <div class="claim-row"><input name="username" required minlength="3" maxlength="18" pattern="[A-Za-z0-9_]{3,18}" autocomplete="nickname" placeholder="YourName" aria-label="Username">
    <button class="btn btn-primary">Claim name</button></div>
    <p class="muted small" data-claim-msg role="alert"></p></form>`;
}
function bindClaim() {
  const form = root.querySelector('[data-claim]');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = form.querySelector('[data-claim-msg]');
    const name = form.username.value.trim();
    if (!USERNAME_RE.test(name)) { msg.textContent = 'Use 3–18 letters, numbers or underscores.'; return; }
    try { await setUsername(name); location.replace(`profile.html?u=${encodeURIComponent(name)}`); } catch (err) { msg.textContent = err.message; }
  });
}

// ---------------------------------------------------------------- a profile

async function loadAll(username) {
  const c = await client();
  const { data: p, error } = await c.from('lb_users').select('id, username, title, frame, level, xp, stats, icon, color').ilike('username', username.replace(/[%_\\]/g, m => `\\${m}`)).maybeSingle();
  if (error) throw error;
  if (!p) return null;
  const id = p.id;
  const [summaries, cvAch, dvTro, showcase, followingQ, followersQ, activity] = await Promise.all([
    c.from('game_summaries').select('game, summary, updated_at').eq('user_id', id),
    c.from('user_achievements').select('achievement_id').eq('user_id', id),
    c.from('game_trophies').select('trophy_id, earned_at').eq('user_id', id).eq('game', 'dragonvision'),
    c.from('trophy_showcase').select('picks').eq('user_id', id).maybeSingle(),
    c.from('follows').select('target_id').eq('user_id', id),
    c.from('follows').select('user_id').eq('target_id', id),
    c.from('activity').select('game, kind, text, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(15),
  ]);
  const following = new Set((followingQ.data || []).map(r => r.target_id));
  const followers = new Set((followersQ.data || []).map(r => r.user_id));
  const friendIds = [...following].filter(x => followers.has(x));
  const friends = friendIds.length ? ((await c.from('lb_users').select('id, username, title').in('id', friendIds.slice(0, 40))).data || []) : [];
  const byGame = Object.fromEntries((summaries.data || []).map(s => [s.game, { ...s.summary, updatedAt: s.summary?.updatedAt || s.updated_at }]));
  return {
    profile: p, summaries: byGame,
    owned: { courtvision: (cvAch.data || []).map(a => a.achievement_id), dragonvision: (dvTro.data || []).map(t => t.trophy_id) },
    showcase: Array.isArray(showcase.data?.picks) ? showcase.data.picks.slice(0, 6) : [],
    friends, followers: followers.size, following: following.size, activity: activity.data || [],
  };
}

function showcaseHtml(d, mine) {
  const slots = Array.from({ length: 6 }, (_, i) => d.showcase[i]);
  return `<section class="card showcase" aria-labelledby="sc-h">
    <div class="panel-head"><h3 id="sc-h">Trophy Showcase</h3>${mine ? '<button class="btn btn-ghost btn-sm" data-edit-showcase>Edit showcase</button>' : ''}</div>
    <div class="showcase-grid">${slots.map(pick => {
      if (!pick) return `<div class="trophy-slot empty"><span>${mine ? 'Pick a trophy' : 'Empty'}</span></div>`;
      const g = GAME[pick.game] || GAME.ninefold;
      const t = trophy(pick.game, pick.id);
      return `<div class="trophy-slot" style="--accent:${g.accent}" title="${esc(t.text)}"><span class="trophy-game">${g.emoji} ${esc(g.name)}</span><b>${esc(t.name)}</b><small>${esc(t.text)}</small></div>`;
    }).join('')}</div>
    ${!d.showcase.length && !mine ? '<p class="muted small">No trophies picked yet.</p>' : ''}
  </section>`;
}

function courtHtml(d) {
  const s = d.summaries.courtvision || {};
  const st = d.profile.stats || {};
  const hours = s.hours ?? (st.playSeconds ? Math.floor(st.playSeconds / 3600) : null);
  const placements = s.placements || [];
  const honors = Array.isArray(st.honors) ? st.honors : [];
  const cos = s.cosmetics || { frame: d.profile.frame, icon: d.profile.icon };
  const played = s.level || d.profile.level > 1 || d.owned.courtvision.length;
  if (!played) return gameEmpty('courtvision');
  return `<section class="card game-panel" style="--accent:${GAME.courtvision.accent}" aria-labelledby="cv-h">
    <div class="panel-head"><h3 id="cv-h">🏀 Court Vision</h3><a class="small" href="${GAME.courtvision.url}">About the game →</a></div>
    <div class="stat-row">
      <div class="stat"><span>Level</span><b>${num(s.level ?? d.profile.level)}</b><small>${esc(s.scoutRank || s.title || d.profile.title || '')}</small></div>
      <div class="stat"><span>Played</span><b>${hours != null ? `${num(hours)}${hours >= 1 ? '+' : ''} h` : '—'}</b><small>hours</small></div>
      <div class="stat"><span>Achievements</span><b>${num(s.achievements ?? d.owned.courtvision.length)}</b><small>unlocked</small></div>
      <div class="stat"><span>Ranked best</span><b>${esc(String(st.rankedBest || '—')).replace(/^./, c => c.toUpperCase())}</b><small>tier</small></div>
    </div>
    ${placements.length || honors.length ? `<h4>Leaderboard placements</h4><ul class="chips">${placements.map(pl => `<li>#${num(pl.rank)} ${esc(pl.board)}${pl.season ? ` · ${esc(pl.season)}` : ''}</li>`).join('')}${honors.map(h => `<li>${esc(String(h).replace(/-/g, ' '))}</li>`).join('')}</ul>` : ''}
    ${cos.frame || cos.icon ? `<h4>Cosmetics</h4><ul class="chips">${['frame', 'icon', 'color'].filter(k => cos[k]).map(k => `<li>${k}: ${esc(String(cos[k]).split('|')[0])}</li>`).join('')}${(cos.titles || []).slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function dragonHtml(d) {
  const s = d.summaries.dragonvision;
  if (!s) return gameEmpty('dragonvision');
  const strongest = (s.strongest || []).slice(0, 5);
  return `<section class="card game-panel" style="--accent:${GAME.dragonvision.accent}" aria-labelledby="dv-h">
    <div class="panel-head"><h3 id="dv-h">🐉 Dragon Vision</h3><a class="small" href="${GAME.dragonvision.url}">About the game →</a></div>
    <div class="stat-row">
      <div class="stat"><span>Highest stage</span><b>${num(s.highestStage)}</b><small>${s.chapter ? `chapter ${num(s.chapter)}` : 'of 380'}</small></div>
      <div class="stat"><span>Fighters</span><b>${num(s.fighters)}</b><small>collected</small></div>
      <div class="stat"><span>Team power</span><b>${num(s.teamPower)}</b><small>best five</small></div>
      <div class="stat"><span>Rival Tower</span><b>${s.towerFloor ? `${num(s.towerFloor)}F` : '—'}</b><small>highest floor</small></div>
    </div>
    ${strongest.length ? `<h4>Strongest fighters</h4><ol class="fighter-list">${strongest.map(f => `<li>${monogram(f.name, 'sm')}<span><b>${esc(f.name)}</b><small>${stars(f.star)} · Lv ${num(f.level)}${f.power ? ` · ${num(f.power)} power` : ''}</small></span></li>`).join('')}</ol>` : ''}
    ${(s.forged || []).length ? `<h4>Forged legends</h4><ul class="chips legend-chips">${s.forged.map(f => `<li>✦ ${esc(f.name)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function gameEmpty(game) {
  const g = GAME[game];
  return `<section class="card game-panel is-empty" style="--accent:${g.accent}"><div class="panel-head"><h3>${g.emoji} ${esc(g.name)}</h3></div>
    <p class="muted">No ${esc(g.name)} progress on this account yet.</p><a class="btn btn-ghost btn-sm" href="${g.url}">Discover ${esc(g.name)}</a></section>`;
}

function friendsHtml(d) {
  return `<section class="card" aria-labelledby="fr-h"><div class="panel-head"><h3 id="fr-h">Friends <small class="muted">${d.friends.length}</small></h3><small class="muted">${num(d.followers)} follower${d.followers === 1 ? '' : 's'} · ${num(d.following)} following</small></div>
    ${d.friends.length ? `<ul class="friend-list">${d.friends.map(f => `<li><a href="profile.html?u=${encodeURIComponent(f.username)}">${monogram(f.username, 'sm')}<span><b>${esc(f.username)}</b><small>${esc(f.title || '')}</small></span></a></li>`).join('')}</ul>`
      : '<p class="muted small">Friends are players who follow each other.</p>'}</section>`;
}

function activityHtml(d) {
  return `<section class="card" aria-labelledby="ac-h"><h3 id="ac-h">Recent activity</h3>
    ${d.activity.length ? `<ul class="activity-list">${d.activity.map(a => { const g = GAME[a.game] || GAME.ninefold; return `<li style="--accent:${g.accent}"><span class="act-game">${g.emoji}</span><span>${esc(a.text)}</span><time datetime="${esc(a.created_at)}">${ago(a.created_at)}</time></li>`; }).join('')}</ul>`
      : '<p class="muted small">Nothing yet. Activity from every NineFoldVision game shows up here.</p>'}</section>`;
}

async function render(username, acct) {
  loading();
  let d;
  try { d = await loadAll(username); } catch { shell(`<div class="card state-card"><h2>Profiles are unavailable</h2><p class="muted">We couldn't reach the account service. Please try again in a moment.</p></div>`); return; }
  if (!d) { shell(`<div class="card state-card"><h2>No player called “${esc(username)}”</h2><p class="muted">Check the spelling, or search for them above.</p></div>`); return; }
  document.title = `${d.profile.username} · NineFoldVision`;
  const mine = acct.status === 'signedIn' && acct.user?.id === d.profile.id;
  const following = acct.status === 'signedIn' && !mine ? await isFollowing(acct.user.id, d.profile.id) : false;
  shell(`
    <section class="card profile-head">
      ${monogram(d.profile.username)}
      <div class="who"><p class="eyebrow">Ninefold player</p><h1>${esc(d.profile.username)}</h1><p class="muted">${esc(d.profile.title || 'Player')} · plays ${[d.summaries.courtvision || d.profile.level > 1 || d.owned.courtvision.length ? 'Court Vision' : null, d.summaries.dragonvision ? 'Dragon Vision' : null].filter(Boolean).join(' & ') || 'NineFoldVision games'}</p></div>
      <div class="head-actions">
        ${mine ? `<button class="btn btn-ghost btn-sm" data-signout>Sign out</button>` : acct.status === 'signedIn'
          ? `<button class="btn ${following ? 'btn-ghost' : 'btn-primary'} btn-sm" data-follow="${following ? 'off' : 'on'}">${following ? 'Unfollow' : 'Follow'}</button>`
          : `<button class="btn btn-primary btn-sm" data-signin>Sign in to follow</button>`}
      </div>
    </section>
    ${showcaseHtml(d, mine)}
    <div class="profile-grid">${courtHtml(d)}${dragonHtml(d)}</div>
    <div class="profile-grid">${friendsHtml(d)}${activityHtml(d)}</div>`);
  root.querySelector('[data-signin]')?.addEventListener('click', openSignIn);
  root.querySelector('[data-signout]')?.addEventListener('click', async () => { await signOut(); location.reload(); });
  root.querySelector('[data-follow]')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const c = await client();
    const on = btn.dataset.follow === 'on';
    const { error } = on
      ? await c.from('follows').insert({ user_id: acct.user.id, target_id: d.profile.id })
      : await c.from('follows').delete().eq('user_id', acct.user.id).eq('target_id', d.profile.id);
    if (!error) render(username, acct); else { btn.disabled = false; btn.textContent = 'Try again'; }
  });
  root.querySelector('[data-edit-showcase]')?.addEventListener('click', () => editShowcase(d, acct, username));
}

async function isFollowing(me, them) {
  const c = await client();
  const { data } = await c.from('follows').select('target_id').eq('user_id', me).eq('target_id', them).maybeSingle();
  return !!data;
}

// ---------------------------------------------------------------- showcase editor

function editShowcase(d, acct, username) {
  const picked = d.showcase.map(p => `${p.game}:${p.id}`);
  const options = ['courtvision', 'dragonvision'].flatMap(game => d.owned[game].map(id => ({ game, id, ...trophy(game, id) })));
  document.getElementById('nfv-showcase')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<dialog class="nfv-dialog wide" id="nfv-showcase" aria-labelledby="sc-edit-h">
    <form method="dialog" class="nfv-dialog-close"><button class="btn btn-ghost" aria-label="Close">✕</button></form>
    <p class="eyebrow">Trophy Showcase</p><h2 id="sc-edit-h">Pick your six proudest</h2>
    <p class="muted small"><b data-count>${picked.length}</b> / 6 picked, from any game.</p>
    ${options.length ? ['courtvision', 'dragonvision'].map(game => {
      const list = options.filter(o => o.game === game);
      if (!list.length) return '';
      return `<h4>${GAME[game].emoji} ${GAME[game].name}</h4><div class="pick-grid">${list.map(o => {
        const key = `${o.game}:${o.id}`;
        return `<label class="pick" style="--accent:${GAME[game].accent}"><input type="checkbox" value="${esc(key)}" ${picked.includes(key) ? 'checked' : ''}><span><b>${esc(o.name)}</b><small>${esc(o.text)}</small></span></label>`;
      }).join('')}</div>`;
    }).join('') : '<p class="muted">Earn achievements in Court Vision or Dragon Vision and they appear here.</p>'}
    <div class="btn-row" style="margin-top:20px"><button type="button" class="btn btn-primary" data-save>Save showcase</button></div>
    <p class="muted small" data-msg role="alert"></p></dialog>`);
  const dlg = document.getElementById('nfv-showcase');
  const order = [...picked];
  const count = dlg.querySelector('[data-count]');
  dlg.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) { if (order.length >= 6) { cb.checked = false; dlg.querySelector('[data-msg]').textContent = 'Six at most. Untick one first.'; return; } order.push(cb.value); }
    else order.splice(order.indexOf(cb.value), 1);
    dlg.querySelector('[data-msg]').textContent = '';
    count.textContent = order.length;
  }));
  dlg.querySelector('[data-save]').addEventListener('click', async () => {
    const picks = order.map(k => { const i = k.indexOf(':'); return { game: k.slice(0, i), id: k.slice(i + 1) }; });
    const c = await client();
    const { error } = await c.from('trophy_showcase').upsert({ user_id: acct.user.id, picks, updated_at: new Date().toISOString() });
    if (error) { dlg.querySelector('[data-msg]').textContent = `Couldn't save: ${error.message}`; return; }
    dlg.close();
    render(username, acct);
  });
  dlg.showModal();
}

// ---------------------------------------------------------------- start

bindSearch();
let started = false;
onAccount(acct => {
  if (acct.status === 'loading' || started) return;
  started = true;
  if (!wanted) { landing(acct); return; }
  render(wanted, acct).then(() => {
    // Signed in without a name yet: offer to claim one above their (or anyone's) profile.
    if (acct.status === 'signedIn' && !acct.profile?.username) { root.insertAdjacentHTML('afterbegin', claimCard()); bindClaim(); }
  });
});
if (getAccount().status === 'loading') loading('Checking your account…');
