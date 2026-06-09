// Settings page: configure the server URL and sign in/out.
import { getSettings, saveSettings, login, clearToken, apiFetch } from './api.js';

const els = {
  baseUrl: document.getElementById('baseUrl'),
  user: document.getElementById('user'),
  pass: document.getElementById('pass'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  loggedOut: document.getElementById('loggedOut'),
  loggedIn: document.getElementById('loggedIn'),
  loggedInMsg: document.getElementById('loggedInMsg'),
  msg: document.getElementById('msg'),
};

function showError(text) {
  els.msg.textContent = text || '';
}

// Request host permission for a non-localhost URL.
async function ensurePermission(baseUrl) {
  try {
    const origin = new URL(baseUrl).origin + '/*';
    if (/^https?:\/\/localhost(:\d+)?$/i.test(new URL(baseUrl).origin)) return true;
    const granted = await chrome.permissions.request({ origins: [origin] });
    return granted;
  } catch {
    return false;
  }
}

async function refresh() {
  const { baseUrl, token } = await getSettings();
  els.baseUrl.value = baseUrl;
  if (token) {
    // Verify the token by fetching the current user.
    try {
      const me = await apiFetch('/api/auth/me');
      els.loggedIn.classList.remove('hidden');
      els.loggedOut.classList.add('hidden');
      els.loggedInMsg.textContent = `Signed in as ${me.displayName || me.username} (${me.role}).`;
      return;
    } catch {
      await clearToken();
    }
  }
  els.loggedIn.classList.add('hidden');
  els.loggedOut.classList.remove('hidden');
}

els.loginBtn.addEventListener('click', async () => {
  showError('');
  const baseUrl = els.baseUrl.value.trim().replace(/\/+$/, '');
  if (!baseUrl) return showError('Enter a server URL.');
  await saveSettings({ baseUrl });

  const granted = await ensurePermission(baseUrl);
  if (!granted) return showError('Permission to the server was denied.');

  els.loginBtn.disabled = true;
  els.loginBtn.textContent = 'Signing in…';
  try {
    await login(els.user.value.trim(), els.pass.value);
    els.pass.value = '';
    await refresh();
  } catch (e) {
    showError(e.message || 'Sign-in failed.');
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Sign in';
  }
});

els.logoutBtn.addEventListener('click', async () => {
  await clearToken();
  await refresh();
});

refresh();
