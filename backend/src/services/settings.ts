import { prisma } from '../db';

export interface AppSettings {
  healthCheckEnabled: boolean;
  healthCheckIntervalHours: number;
  healthCheckTimeoutSec: number;
  healthRetentionDays: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  healthCheckEnabled: true,
  healthCheckIntervalHours: 4,
  healthCheckTimeoutSec: 5,
  healthRetentionDays: 30,
};

// Hämta inställningarna (skapar standardraden vid första anropet).
export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULT_SETTINGS },
  });
  return {
    healthCheckEnabled: row.healthCheckEnabled,
    healthCheckIntervalHours: row.healthCheckIntervalHours,
    healthCheckTimeoutSec: row.healthCheckTimeoutSec,
    healthRetentionDays: row.healthRetentionDays,
  };
}

export async function updateSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...DEFAULT_SETTINGS, ...input },
  });
  return {
    healthCheckEnabled: row.healthCheckEnabled,
    healthCheckIntervalHours: row.healthCheckIntervalHours,
    healthCheckTimeoutSec: row.healthCheckTimeoutSec,
    healthRetentionDays: row.healthRetentionDays,
  };
}
