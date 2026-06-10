import type { HealthStatus, LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { formatDate } from '../utils/date';

const DOT: Record<HealthStatus, string> = {
  UP: '🟢',
  DOWN: '🔴',
  UNKNOWN: '⚪',
};

// Liten statusindikator för en länks health-check (BLUEPRINT 14.9).
export default function HealthDot({ link }: { link: LinkItem }) {
  const { t } = useTranslation();

  const parts: string[] = [t(`health.status.${link.healthStatus}` as never)];
  if (link.lastCheckedAt) {
    parts.push(t('health.checkedAt', { date: formatDate(link.lastCheckedAt) }));
  }
  if (link.lastStatusCode != null) {
    parts.push(`HTTP ${link.lastStatusCode}`);
  }
  if (link.lastLatencyMs != null) {
    parts.push(`${link.lastLatencyMs} ms`);
  }
  if (link.extraMonitor && link.extraMonitorMinutes) {
    parts.push(t('health.extraEvery', { minutes: link.extraMonitorMinutes }));
  }

  return (
    <span className={`health-dot health-${link.healthStatus}`} title={parts.join(' · ')}>
      {DOT[link.healthStatus]}
    </span>
  );
}
