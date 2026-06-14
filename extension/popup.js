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
  webAppBtn: document.getElementById('webAppBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveView: document.getElementById('saveView'),
  saveName: document.getElementById('saveName'),
  saveUrl: document.getElementById('saveUrl'),
  saveCategory: document.getElementById('saveCategory'),
  saveError: document.getElementById('saveError'),
  saveCancelBtn: document.getElementById('saveCancelBtn'),
  saveConfirmBtn: document.getElementById('saveConfirmBtn'),
  versionFooter: document.getElementById('versionFooter'),
};

let allLinks = [];
let tree = [];
let pathMap = new Map();
let canEdit = false;
let webAppUrl = '';
// Collapse state for the Favorites / Recently added sections (collapsed by default).
let sectionOpen = { favorites: false, recent: false };

const roleRank = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

function setStatus(msg) {
  els.status.textContent = msg;
  els.status.classList.remove('hidden');
}

// Show the backend version (public endpoint) so it can be compared with the
// server and a local checkout. Silently hidden if the server is unreachable.
async function showVersion() {
  if (!els.versionFooter) return;
  try {
    const data = await apiFetch('/api/version', { auth: false });
    if (data && data.display) {
      els.versionFooter.textContent = `Server ${data.display}`;
      els.versionFooter.title = data.commitDate ? `Commit ${data.commit} · ${data.commitDate}` : '';
    } else {
      els.versionFooter.textContent = '';
    }
  } catch {
    els.versionFooter.textContent = '';
  }
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

// Build a collapsible section header that toggles the given body element.
// The open/closed state is persisted in chrome.storage so it is remembered.
function sectionHeader(titleText, key, count, bodyEl) {
  const title = document.createElement('div');
  title.className = 'section-title section-toggle';

  const tw = document.createElement('span');
  tw.className = 'sec-twisty';
  const setIcon = () => (tw.textContent = sectionOpen[key] ? '▾' : '▸');
  setIcon();

  const label = document.createElement('span');
  label.textContent = titleText;

  const cnt = document.createElement('span');
  cnt.className = 'sec-count';
  cnt.textContent = String(count);

  title.append(tw, label, cnt);
  bodyEl.classList.toggle('hidden', !sectionOpen[key]);

  title.addEventListener('click', () => {
    sectionOpen[key] = !sectionOpen[key];
    bodyEl.classList.toggle('hidden', !sectionOpen[key]);
    setIcon();
    chrome.storage.local.set({ sectionOpen });
  });
  return title;
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

  // Favorites at the top (collapsible)
  const favorites = allLinks.filter((l) => l.isFavorite);
  if (favorites.length) {
    const favBox = document.createElement('div');
    favBox.className = 'favorites';
    favorites
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .forEach((l) => favBox.appendChild(linkRow(l)));
    els.content.appendChild(sectionHeader('★ Favorites', 'favorites', favorites.length, favBox));
    els.content.appendChild(favBox);
  }

  // Recently added – the 3 most recent links by dateAdded (collapsible).
  const recent = [...allLinks]
    .filter((l) => l.dateAdded)
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
    .slice(0, 3);
  if (recent.length) {
    const recentBox = document.createElement('div');
    recentBox.className = 'recent';
    recent.forEach((l) => recentBox.appendChild(linkRow(l)));
    els.content.appendChild(sectionHeader('🆕 Recently added', 'recent', recent.length, recentBox));
    els.content.appendChild(recentBox);
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
    // Fetch the configured web app URL (set on the web app's Settings page).
    // Falls back to the API server URL (same-origin in production).
    const settings = await apiFetch('/api/settings').catch(() => null);
    const { baseUrl } = await getSettings();
    webAppUrl = (settings && settings.webAppUrl) ? settings.webAppUrl : baseUrl;
    // Restore the remembered collapse state for the sections.
    const storedOpen = (await chrome.storage.local.get('sectionOpen')).sectionOpen;
    if (storedOpen) sectionOpen = { favorites: false, recent: false, ...storedOpen };
    // Mark everything currently visible as "seen" so the background worker only
    // notifies about links added while the popup was closed, and clear the badge.
    chrome.storage.local.set({ seenLinkIds: links.map((l) => l.id), notifyBaselineDone: true, unseenCount: 0 });
    chrome.action.setBadgeText({ text: '' });
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
    showVersion();
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
els.webAppBtn.addEventListener('click', () => {
  if (webAppUrl) openLink(webAppUrl);
  else chrome.runtime.openOptionsPage();
});
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
  showVersion();
  const { token } = await getSettings();
  if (!token) {
    showLogin();
  } else {
    // Put the cursor in the search box right away so you can start typing
    // as soon as the popup opens (no extra click needed).
    els.searchBox.focus();
    loadData();
  }
})();
