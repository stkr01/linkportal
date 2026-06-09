import { apiFetch, getSettings, login, clearToken } from './api.js';

const els = {
  content: document.getElementById('content'),
  status: document.getElementById('status'),
  loginView: document.getElementById('loginView'),
  loginUrl: document.getElementById('loginUrl'),
  loginUser: document.getElementById('loginUser'),
  loginPass: document.getElementById('loginPass'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  searchBox: document.getElementById('searchBox'),
  searchBtn: document.getElementById('searchBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
};

let allLinks = [];
let tree = [];
let pathMap = new Map();

function setStatus(msg) {
  els.status.textContent = msg;
  els.status.classList.remove('hidden');
}

function faviconUrl(url) {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function openLink(url) {
  chrome.tabs.create({ url });
  window.close();
}

// Bygg en map categoryId -> full sökväg (för sökresultat).
function buildPathMap(nodes, parent = '') {
  for (const n of nodes) {
    const path = parent ? `${parent} › ${n.name}` : n.name;
    pathMap.set(n.id, path);
    if (n.children?.length) buildPathMap(n.children, path);
  }
}

function linkRow(link) {
  const a = document.createElement('a');
  a.className = 'link-item';
  a.href = link.url;
  a.title = link.url;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    openLink(link.url);
  });

  const fav = faviconUrl(link.url);
  if (fav) {
    const img = document.createElement('img');
    img.src = fav;
    img.addEventListener('error', () => (img.style.visibility = 'hidden'));
    a.appendChild(img);
  }

  const name = document.createElement('span');
  name.className = 'li-name';
  name.textContent = link.name;
  a.appendChild(name);

  if (link.environment && link.environment !== 'NA') {
    const env = document.createElement('span');
    env.className = `li-env ${link.environment}`;
    env.textContent = link.environment;
    a.appendChild(env);
  }
  if (link.isFavorite) {
    const star = document.createElement('span');
    star.className = 'li-star';
    star.textContent = '★';
    a.appendChild(star);
  }
  return a;
}

function categoryNode(node, linksByCat) {
  const wrap = document.createElement('div');
  wrap.className = 'cat-node';

  const hasChildren = (node.children && node.children.length) || (linksByCat.get(node.id) || []).length;

  const row = document.createElement('div');
  row.className = 'cat-row';

  const twisty = document.createElement('span');
  twisty.className = 'twisty';
  twisty.textContent = hasChildren ? '▸' : '·';
  row.appendChild(twisty);

  const label = document.createElement('span');
  label.textContent = node.name;
  row.appendChild(label);

  const count = document.createElement('span');
  count.className = 'cat-count';
  count.textContent = node.linkCount;
  row.appendChild(count);

  const childWrap = document.createElement('div');
  childWrap.className = 'cat-children hidden';

  // Direkta länkar i kategorin
  const directLinks = linksByCat.get(node.id) || [];
  directLinks.forEach((l) => childWrap.appendChild(linkRow(l)));

  // Underkategorier
  (node.children || []).forEach((c) => childWrap.appendChild(categoryNode(c, linksByCat)));

  row.addEventListener('click', () => {
    const collapsed = childWrap.classList.toggle('hidden');
    twisty.textContent = collapsed ? '▸' : '▾';
  });

  wrap.appendChild(row);
  wrap.appendChild(childWrap);
  return wrap;
}

function render() {
  els.content.innerHTML = '';
  els.status.classList.add('hidden');

  const linksByCat = new Map();
  for (const l of allLinks) {
    const arr = linksByCat.get(l.categoryId) || [];
    arr.push(l);
    linksByCat.set(l.categoryId, arr);
  }

  // Favoriter högst upp
  const favorites = allLinks.filter((l) => l.isFavorite);
  if (favorites.length) {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '★ Favoriter';
    els.content.appendChild(title);

    const favBox = document.createElement('div');
    favBox.className = 'favorites';
    favorites
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
      .forEach((l) => favBox.appendChild(linkRow(l)));
    els.content.appendChild(favBox);
  }

  const treeTitle = document.createElement('div');
  treeTitle.className = 'section-title';
  treeTitle.textContent = 'Kategorier';
  els.content.appendChild(treeTitle);

  tree.forEach((n) => els.content.appendChild(categoryNode(n, linksByCat)));

  if (!allLinks.length) {
    setStatus('Inga länkar ännu.');
  }
}

function renderSearch(query) {
  els.content.innerHTML = '';
  const q = query.toLowerCase();
  const matches = allLinks.filter((l) => {
    const hay = `${l.name} ${l.manageSoftware || ''} ${l.owningTeam || ''} ${pathMap.get(l.categoryId) || ''}`.toLowerCase();
    return hay.includes(q);
  });

  if (!matches.length) {
    const d = document.createElement('div');
    d.className = 'status';
    d.textContent = 'Inga träffar';
    els.content.appendChild(d);
    return;
  }
  matches.forEach((l) => {
    const row = linkRow(l);
    els.content.appendChild(row);
  });
}

async function loadData() {
  setStatus('Laddar…');
  els.loginView.classList.add('hidden');
  els.content.classList.remove('hidden');
  try {
    const [cats, links] = await Promise.all([
      apiFetch('/api/categories'),
      apiFetch('/api/links'),
    ]);
    tree = cats;
    allLinks = links;
    pathMap = new Map();
    buildPathMap(tree);
    render();
  } catch (err) {
    if (err.status === 401) {
      await clearToken();
      showLogin();
    } else {
      setStatus(err.message || 'Kunde inte hämta data.');
    }
  }
}

function showLogin() {
  els.content.classList.add('hidden');
  els.searchBox.classList.add('hidden');
  els.loginView.classList.remove('hidden');
  getSettings().then((s) => {
    els.loginUrl.value = s.baseUrl;
  });
}

async function doLogin() {
  els.loginError.textContent = '';
  const baseUrl = els.loginUrl.value.trim().replace(/\/+$/, '');
  const username = els.loginUser.value.trim();
  const password = els.loginPass.value;
  if (!baseUrl || !username || !password) {
    els.loginError.textContent = 'Fyll i alla fält.';
    return;
  }
  els.loginBtn.disabled = true;
  try {
    // Be om host-behörighet för servern (krävs för fetch mot egen URL).
    try {
      await chrome.permissions.request({ origins: [`${baseUrl}/*`] });
    } catch {
      /* localhost täcks redan av manifestet */
    }
    await chrome.storage.local.set({ baseUrl });
    await login(username, password);
    await loadData();
  } catch (err) {
    els.loginError.textContent = err.message || 'Inloggning misslyckades.';
  } finally {
    els.loginBtn.disabled = false;
  }
}

// Events
els.loginBtn.addEventListener('click', doLogin);
els.loginPass.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
els.refreshBtn.addEventListener('click', loadData);
els.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.searchBtn.addEventListener('click', () => {
  els.searchBox.classList.toggle('hidden');
  if (!els.searchBox.classList.contains('hidden')) {
    els.searchBox.focus();
  } else {
    els.searchBox.value = '';
    render();
  }
});
els.searchBox.addEventListener('input', () => {
  const q = els.searchBox.value.trim();
  if (q) renderSearch(q);
  else render();
});

// Init
(async () => {
  const { token } = await getSettings();
  if (!token) {
    showLogin();
  } else {
    loadData();
  }
})();
