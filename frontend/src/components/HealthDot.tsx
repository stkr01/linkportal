import type { HealthStatus, LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { formatDate, formatDateTime } from '../utils/date';

const DOT: Record<HealthStatus, string> = {
  UP: '🟢',
  DOWN: '🔴',
  UNKNOWN: '⚪',
};

// Liten statusindikator för en länks health-check (BLUEPRINT 14.9).
export default function HealthDot({ link, onTest }: { link: LinkItem; onTest?: () => void }) {
  const { t } = useTranslation();

  const parts: string[] = [t(`health.status.${link.healthStatus}` as never)];
  if (link.lastCheckedAt) {
    parts.push(t('health.checkedAt', { date: formatDate(link.lastCheckedAt) }));
  }
  if (link.lastUpAt) {
    parts.push(t('health.lastUpAt', { date: formatDateTime(link.lastUpAt) }));
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

  const title = parts.join(' · ');

  // When a test handler is provided (editors), the dot doubles as a discreet "run check" button.
  if (onTest) {
    return (
      <button
        type="button"
        className={`health-dot health-dot-btn health-${link.healthStatus}`}
        title={title}
        aria-label={title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTest();
        }}
      >
        {DOT[link.healthStatus]}
      </button>
    );
  }

  return (
    <span className={`health-dot health-${link.healthStatus}`} title={title}>
      {DOT[link.healthStatus]}
    </span>
  );
}
