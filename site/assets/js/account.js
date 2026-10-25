// Ninefold accounts on the studio site: one login (Discord or Google, through Supabase) shared with Court Vision and
// Dragon Vision. Each game keeps its own progress; this site only reads it, and writes the things that belong to the
// player as a whole (username, trophy showcase, follows). The Supabase library is loaded only when it's needed: a
// stored session, a sign-in coming back, or the visitor pressing Sign in.

export const SUPABASE_URL = 'https://bqqgzfkpydmdfrszauvb.supabase.co';
// The public (publishable) key. Every row is protected by row-level security on the server.
export const SUPABASE_KEY = 'sb_publishable_EQHq7G1Qss1pb6_QRwGSQQ_C3v7j6Lx';
const STORAGE_KEY = 'ninefold-auth';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
export const USERNAME_RE = /^[A-Za-z0-9_]{3,18}$/;

let clientPromise = null;
/** The Supabase client (loads the library the first time). */
export function client() {
  clientPromise ??= import(LIB).then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: STORAGE_KEY },
  }));
  return clientPromise;
}

const stored = () => { try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; } };

/** status: 'loading' | 'signedOut' | 'signedIn'. profile is the shared profiles row (username, title, icon, …). */
let state = { status: 'loading', user: null, profile: null, error: null };
const subs = new Set();
export const getAccount = () => state;
export function onAccount(fn) { subs.add(fn); fn(state); return () => subs.delete(fn); }
function set(patch) { state = { ...state, ...patch }; subs.forEach(f => f(state)); paintHeader(); }

async function loadProfile(c, userId) {
  const { data } = await c.from('profiles').select('id, username, title, icon, color, avatar, level').eq('id', userId).maybeSingle();
  return data || { id: userId, username: null };
}

async function start() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const oauthError = params.get('error_description') || params.get('error');
  if (code || oauthError) {
    // Drop the sign-in parameters from the address so a reload doesn't try to use the code twice.
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach(k => params.delete(k));
    history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`);
  }
  if (oauthError) { set({ status: 'signedOut', error: `Sign-in didn't finish: ${oauthError}` }); return; }
  if (!code && !stored()) { set({ status: 'signedOut' }); return; }
  try {
    const c = await client();
    if (code) {
      const { error } = await c.auth.exchangeCodeForSession(code);
      if (error) { set({ status: 'signedOut', error: /verifier|flow state/i.test(error.message) ? 'Sign-in started in another tab or on another address. Please press Sign in again here.' : `Sign-in didn't finish: ${error.message}` }); return; }
    }
    const { data } = await c.auth.getSession();
    const user = data.session?.user || null;
    if (!user) { set({ status: 'signedOut' }); return; }
    set({ status: 'signedIn', user, profile: await loadProfile(c, user.id), error: null });
    c.auth.onAuthStateChange((_e, s) => { if (!s) set({ status: 'signedOut', user: null, profile: null }); });
  } catch (e) {
    set({ status: 'signedOut', error: `Accounts are unavailable right now (${e.message || e}).` });
  }
}

export async function signIn(provider) {
  const c = await client();
  // Come back to this exact page (a profile, Community…); the code arrives as ?code=.
  const back = new URL(location.href);
  back.hash = '';
  const { error } = await c.auth.signInWithOAuth({ provider, options: { redirectTo: back.toString() } });
  if (error) set({ error: `Couldn't start sign-in: ${error.message}` });
}

export async function signOut() {
  const c = await client();
  await c.auth.signOut();
  set({ status: 'signedOut', user: null, profile: null });
}

/** Claims the universal Ninefold username (the same one Court Vision shows). */
export async function setUsername(name) {
  if (!USERNAME_RE.test(name)) throw new Error('Use 3–18 letters, numbers or underscores.');
  const c = await client();
  const { error } = await c.from('profiles').update({ username: name }).eq('id', state.user.id);
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'That name is taken. Try another.' : error.message);
  set({ profile: { ...state.profile, username: name } });
}

// ---------------------------------------------------------------- header button and sign-in dialog

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function paintHeader() {
  document.querySelectorAll('[data-account]').forEach(btn => {
    const label = btn.querySelector('[data-account-label]');
    btn.classList.toggle('signed-in', state.status === 'signedIn');
    if (state.status === 'signedIn') {
      const name = state.profile?.username;
      label.textContent = name || 'Your account';
      btn.href = name ? `profile.html?u=${encodeURIComponent(name)}` : 'profile.html';
      btn.onclick = null;
    } else {
      label.textContent = state.status === 'loading' ? '…' : 'Sign in';
      btn.href = 'profile.html';
      btn.onclick = state.status === 'signedOut' ? (e) => { e.preventDefault(); openSignIn(); } : null;
    }
  });
}

/** The sign-in dialog: Discord or Google, the same accounts as Court Vision and Dragon Vision. */
export function openSignIn() {
  let dlg = document.getElementById('nfv-signin');
  if (!dlg) {
    document.body.insertAdjacentHTML('beforeend', `<dialog class="nfv-dialog" id="nfv-signin" aria-labelledby="nfv-signin-title">
      <form method="dialog" class="nfv-dialog-close"><button class="btn btn-ghost" aria-label="Close">✕</button></form>
      <p class="eyebrow">Ninefold account</p>
      <h2 id="nfv-signin-title">Sign in</h2>
      <p class="muted">One account for every NineFoldVision game. Your Court Vision and Dragon Vision progress stay separate; your name, friends and trophies follow you everywhere.</p>
      <div class="signin-buttons">
        <button type="button" class="btn btn-primary" data-provider="discord">${window.NFV?.socialIcon?.('discord', 20) || ''}Continue with Discord</button>
        <button type="button" class="btn btn-ghost" data-provider="google">Continue with Google</button>
      </div>
      <p class="muted small">By signing in you agree to our <a href="terms.html">terms</a>. Our <a href="privacy.html#collect">privacy policy</a> explains what we store.</p>
      <p class="muted small" data-signin-error role="alert"></p>
    </dialog>`);
    dlg = document.getElementById('nfv-signin');
    dlg.querySelectorAll('[data-provider]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await signIn(b.dataset.provider); } finally { b.disabled = false; }
    }));
  }
  dlg.querySelector('[data-signin-error]').textContent = state.error || '';
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

// Pages that load this module directly can run it before site.js adds the header button; site.js says when it has.
paintHeader();
window.addEventListener('nfv:chrome', paintHeader);
start();

export { esc };
