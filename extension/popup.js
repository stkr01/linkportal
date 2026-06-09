import { apiFetch, getSettings, login, clearToken, getMe, quickSave } from './api.js';

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
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveView: document.getElementById('saveView'),
  saveName: document.getElementById('saveName'),
  saveUrl: document.getElementById('saveUrl'),
  saveCategory: document.getElementById('saveCategory'),
  saveError: document.getElementById('saveError'),
  saveCancelBtn: document.getElementById('saveCancelBtn'),
  saveConfirmBtn: document.getElementById('saveConfirmBtn'),
};

let allLinks = [];
let tree = [];
let pathMap = new Map();
let canEdit = false;

const roleRank = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

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

// Build a map of categoryId -> full path (for search results).
function buildPathMap(nodes, parent = '') {
  for (const n of nodes) {
    const path = parent ? `${parent} › ${n.name}` : n.name;
    pathMap.set(n.id, path);
    if (n.children?.length) buildPathMap(n.children, path);
  }
}

// Flatten the tree into { id, path } for the category dropdown.
function flattenCats(nodes, prefix = '', out = []) {
  for (const n of nodes) {
    const path = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, path });
    if (n.children?.length) flattenCats(n.children, path, out);
  }
  return out;
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

  // Direct links in the category
  const directLinks = linksByCat.get(node.id) || [];
  directLinks.forEach((l) => childWrap.appendChild(linkRow(l)));

  // Subcategories
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

  // Favorites at the top
  const favorites = allLinks.filter((l) => l.isFavorite);
  if (favorites.length) {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '★ Favorites';
    els.content.appendChild(title);

    const favBox = document.createElement('div');
    favBox.className = 'favorites';
    favorites
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .forEach((l) => favBox.appendChild(linkRow(l)));
    els.content.appendChild(favBox);
  }

  const treeTitle = document.createElement('div');
  treeTitle.className = 'section-title';
  treeTitle.textContent = 'Categories';
  els.content.appendChild(treeTitle);

  tree.forEach((n) => els.content.appendChild(categoryNode(n, linksByCat)));

  if (!allLinks.length) {
    setStatus('No links yet.');
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
    d.textContent = 'No matches';
    els.content.appendChild(d);
    return;
  }
  matches.forEach((l) => {
    const row = linkRow(l);
    els.content.appendChild(row);
  });
}

async function loadData() {
  setStatus('Loading…');
  els.loginView.classList.add('hidden');
  els.content.classList.remove('hidden');
  els.searchBox.classList.remove('hidden');
  try {
    const [cats, links, me] = await Promise.all([
      apiFetch('/api/categories'),
      apiFetch('/api/links'),
      getMe().catch(() => null),
    ]);
    tree = cats;
    allLinks = links;
    pathMap = new Map();
    buildPathMap(tree);
    canEdit = me ? roleRank[me.role] >= roleRank.EDITOR : false;
    els.saveBtn.classList.toggle('hidden', !canEdit);
    const q = els.searchBox.value.trim();
    if (q) renderSearch(q);
    else render();
  } catch (err) {
    if (err.status === 401) {
      await clearToken();
      showLogin();
    } else {
      setStatus(err.message || 'Could not fetch data.');
    }
  }
}

function showLogin() {
  els.content.classList.add('hidden');
  els.searchBox.classList.add('hidden');
  els.saveBtn.classList.add('hidden');
  els.saveView.classList.add('hidden');
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
    els.loginError.textContent = 'Fill in all fields.';
    return;
  }
  els.loginBtn.disabled = true;
  try {
    // Request host permission for the server (required for fetch against a custom URL).
    try {
      await chrome.permissions.request({ origins: [`${baseUrl}/*`] });
    } catch {
      /* localhost is already covered by the manifest */
    }
    await chrome.storage.local.set({ baseUrl });
    await login(username, password);
    await loadData();
  } catch (err) {
    els.loginError.textContent = err.message || 'Sign-in failed.';
  } finally {
    els.loginBtn.disabled = false;
  }
}

async function openSaveView() {
  els.saveError.textContent = '';
  // Read the current tab.
  let tab = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  } catch {
    /* ignore */
  }
  const url = tab?.url || '';
  if (!url || !/^https?:/i.test(url)) {
    els.saveError.textContent = 'This tab cannot be saved (no web address).';
  }
  els.saveName.value = tab?.title || '';
  els.saveUrl.value = url;

  // Fill the category dropdown: Inbox first (empty value), then the whole tree.
  els.saveCategory.innerHTML = '';
  const inbox = document.createElement('option');
  inbox.value = '';
  inbox.textContent = '📥 Inbox (unsorted)';
  els.saveCategory.appendChild(inbox);
  for (const c of flattenCats(tree)) {
    const opt = document.createElement('option');
    opt.value = String(c.id);
    opt.textContent = c.path;
    els.saveCategory.appendChild(opt);
  }

  els.content.classList.add('hidden');
  els.searchBox.classList.add('hidden');
  els.saveView.classList.remove('hidden');
  els.saveName.focus();
  els.saveName.select();
}

function closeSaveView() {
  els.saveView.classList.add('hidden');
  els.content.classList.remove('hidden');
  els.searchBox.classList.remove('hidden');
}

async function doQuickSave() {
  els.saveError.textContent = '';
  const url = els.saveUrl.value.trim();
  const name = els.saveName.value.trim();
  const catVal = els.saveCategory.value;
  if (!url || !/^https?:/i.test(url)) {
    els.saveError.textContent = 'Invalid web address.';
    return;
  }
  els.saveConfirmBtn.disabled = true;
  try {
    await quickSave({ url, name, categoryId: catVal ? Number(catVal) : null });
    closeSaveView();
    await loadData();
    showToast('✔ Page saved.');
  } catch (err) {
    els.saveError.textContent = err.message || 'Could not save the page.';
  } finally {
    els.saveConfirmBtn.disabled = false;
  }
}

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  els.content.prepend(t);
  setTimeout(() => t.remove(), 2500);
}

// Events
els.loginBtn.addEventListener('click', doLogin);
els.loginPass.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
els.refreshBtn.addEventListener('click', loadData);
els.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.searchBox.addEventListener('input', () => {
  const q = els.searchBox.value.trim();
  if (q) renderSearch(q);
  else render();
});
els.saveBtn.addEventListener('click', openSaveView);
els.saveCancelBtn.addEventListener('click', closeSaveView);
els.saveConfirmBtn.addEventListener('click', doQuickSave);

// Init
(async () => {
  const { token } = await getSettings();
  if (!token) {
    showLogin();
  } else {
    loadData();
  }
})();
