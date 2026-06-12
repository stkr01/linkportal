// Background service worker (MV3).
// Periodically polls the LinkPortal API and shows a desktop notification
// when new links have been added since the last time the user looked.
import { apiFetch, getSettings } from './api.js';

const ALARM_NAME = 'linkportal-poll';
const DEFAULT_INTERVAL_MIN = 5;

// Read the notification preferences (enabled by default).
async function getNotifyConfig() {
  const s = await chrome.storage.local.get(['notifyEnabled', 'notifyIntervalMin']);
  return {
    enabled: s.notifyEnabled !== false, // default ON
    intervalMin: Math.min(120, Math.max(1, Number(s.notifyIntervalMin) || DEFAULT_INTERVAL_MIN)),
  };
}

// Create (or re-create) the polling alarm using the configured interval.
async function ensureAlarm() {
  const { intervalMin } = await getNotifyConfig();
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing || existing.periodInMinutes !== intervalMin) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: intervalMin, delayInMinutes: 0.1 });
  }
}

// Show a notification and remember which URL it points to (so a click can open it).
async function notify(id, title, message, url) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 1,
  });
  if (url) {
    const stored = (await chrome.storage.local.get('notifUrls')).notifUrls || {};
    stored[id] = url;
    await chrome.storage.local.set({ notifUrls: stored });
  }
}

// Update the toolbar badge with the number of unseen new links.
async function setBadge(count) {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  await chrome.action.setBadgeText({ text });
  if (count > 0) await chrome.action.setBadgeBackgroundColor({ color: '#1d4ed8' });
}

// Core: fetch links, compare with the set we have already seen, notify on new ones.
async function checkForNewLinks() {
  const { enabled } = await getNotifyConfig();
  if (!enabled) return;

  const { token } = await getSettings();
  if (!token) return; // not signed in – nothing to do

  let links;
  try {
    links = await apiFetch('/api/links');
  } catch {
    return; // network/auth error – skip silently, try again next alarm
  }
  if (!Array.isArray(links)) return;

  const currentIds = links.map((l) => l.id);
  const stored = await chrome.storage.local.get(['seenLinkIds', 'notifyBaselineDone', 'unseenCount']);
  const seen = new Set(stored.seenLinkIds || []);

  // First run after install/login: remember the current links as a baseline,
  // so the user is NOT spammed with a notification for every existing link.
  if (!stored.notifyBaselineDone) {
    await chrome.storage.local.set({ seenLinkIds: currentIds, notifyBaselineDone: true });
    return;
  }

  const newLinks = links.filter((l) => !seen.has(l.id));

  // Always update the seen set to the current state.
  await chrome.storage.local.set({ seenLinkIds: currentIds });

  if (!newLinks.length) return;

  if (newLinks.length === 1) {
    const l = newLinks[0];
    const env = l.environment && l.environment !== 'NA' ? ` · ${l.environment}` : '';
    await notify(`linkportal-new-${l.id}`, 'New link added', `${l.name}${env}`, l.url);
  } else {
    const names = newLinks.slice(0, 5).map((l) => l.name).join(', ');
    const more = newLinks.length > 5 ? ', …' : '';
    await notify('linkportal-new-multi', `${newLinks.length} new links added`, `${names}${more}`, null);
  }

  const unseen = (Number(stored.unseenCount) || 0) + newLinks.length;
  await chrome.storage.local.set({ unseenCount: unseen });
  await setBadge(unseen);
}

// --- Event wiring ---------------------------------------------------------

// Make sure the alarm exists whenever the worker spins up.
ensureAlarm();

chrome.runtime.onInstalled.addListener(() => ensureAlarm());
chrome.runtime.onStartup.addListener(() => ensureAlarm());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkForNewLinks();
});

// React to setting changes: re-schedule the alarm, and check right after sign-in.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.notifyIntervalMin || changes.notifyEnabled) ensureAlarm();
  if (changes.token && changes.token.newValue) checkForNewLinks();
});

// Clicking a (single-link) notification opens that link.
chrome.notifications.onClicked.addListener(async (id) => {
  const stored = (await chrome.storage.local.get('notifUrls')).notifUrls || {};
  const url = stored[id];
  if (url) {
    chrome.tabs.create({ url });
    delete stored[id];
    await chrome.storage.local.set({ notifUrls: stored });
  }
  chrome.notifications.clear(id);
});
