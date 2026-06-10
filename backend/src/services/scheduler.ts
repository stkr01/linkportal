import { prisma } from '../db';
import { getSettings } from './settings';
import { runChecks, runCheck } from './healthcheck';

// Två oberoende loopar (BLUEPRINT 14.3):
//  - bas-loopen kör alla länkar var N:e timme
//  - extra-loopen kör varje extraMonitor-länk på sitt egna minut-intervall

let baseTimer: NodeJS.Timeout | null = null;
let extraTimer: NodeJS.Timeout | null = null;

// Senaste gången en extra-bevakad länk testades (linkId → epoch ms).
const lastExtraRun = new Map<number, number>();

const EXTRA_TICK_MS = 30_000; // kolla var 30:e sek vilka extra-länkar som är "due"
const RETENTION_TICK_MS = 6 * 60 * 60 * 1000; // städa historik var 6:e timme

async function runBaseSweep(): Promise<void> {
  const settings = await getSettings();
  if (!settings.healthCheckEnabled) return;
  const links = await prisma.link.findMany({
    where: { isDeleted: false },
    select: { id: true, url: true },
  });
  await runChecks(links, settings.healthCheckTimeoutSec);
}

async function runExtraTick(): Promise<void> {
  const settings = await getSettings();
  if (!settings.healthCheckEnabled) return;

  const links = await prisma.link.findMany({
    where: { isDeleted: false, extraMonitor: true, extraMonitorMinutes: { gt: 0 } },
    select: { id: true, url: true, extraMonitorMinutes: true },
  });

  const now = Date.now();
  for (const link of links) {
    const intervalMs = (link.extraMonitorMinutes ?? 0) * 60_000;
    if (intervalMs <= 0) continue;
    const last = lastExtraRun.get(link.id) ?? 0;
    if (now - last >= intervalMs) {
      lastExtraRun.set(link.id, now);
      try {
        await runCheck(link, settings.healthCheckTimeoutSec);
      } catch {
        // ignorera enskilda fel
      }
    }
  }
}

async function cleanupHistory(): Promise<void> {
  const settings = await getSettings();
  if (settings.healthRetentionDays <= 0) return;
  const cutoff = new Date(Date.now() - settings.healthRetentionDays * 24 * 60 * 60 * 1000);
  await prisma.healthCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } });
}

// Schemalägg bas-loopen utifrån aktuellt intervall (timmar).
async function scheduleBaseLoop(): Promise<void> {
  if (baseTimer) clearTimeout(baseTimer);
  const settings = await getSettings();
  const intervalMs = Math.max(1, settings.healthCheckIntervalHours) * 60 * 60 * 1000;
  baseTimer = setTimeout(async () => {
    await runBaseSweep().catch(() => undefined);
    await cleanupHistory().catch(() => undefined);
    scheduleBaseLoop(); // läs om intervallet (kan ha ändrats i Settings)
  }, intervalMs);
}

export function startScheduler(): void {
  // Första svepet strax efter start (utan att blockera serverstart).
  setTimeout(() => {
    runBaseSweep().catch(() => undefined);
    cleanupHistory().catch(() => undefined);
  }, 10_000);

  scheduleBaseLoop();

  if (extraTimer) clearInterval(extraTimer);
  extraTimer = setInterval(() => {
    runExtraTick().catch(() => undefined);
  }, EXTRA_TICK_MS);

  setInterval(() => {
    cleanupHistory().catch(() => undefined);
  }, RETENTION_TICK_MS);
}
