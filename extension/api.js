// Delad logik för popup och options.
// Hämtar/sparar inställningar och anropar LinkPortal-API:t med Bearer-token.

const DEFAULTS = { baseUrl: 'http://localhost:4000', token: '' };

export async function getSettings() {
  const stored = await chrome.storage.local.get(['baseUrl', 'token']);
  return {
    baseUrl: (stored.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, ''),
    token: stored.token || DEFAULTS.token,
  };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

export async function clearToken() {
  await chrome.storage.local.remove('token');
}

// Anropa API. Kastar { status, message } vid fel.
export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const { baseUrl, token } = await getSettings();
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw { status: 0, message: `Kunde inte nå servern (${baseUrl}). Kontrollera URL och behörighet.` };
  }

  if (!res.ok) {
    let message = `Fel ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw { status: res.status, message };
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function login(username, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  await saveSettings({ token: data.token });
  return data.user;
}
