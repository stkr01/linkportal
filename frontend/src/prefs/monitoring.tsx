import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

// Per-user (per-browser) preference to hide all monitoring UI: status dots,
// card frames, the "Last successful" info, the Monitor Alerts view and the
// connection tests. For users who don't use the monitoring feature.
const STORAGE_KEY = 'linkportal.hideMonitoring';

interface MonitoringPrefValue {
  hideMonitoring: boolean;
  setHideMonitoring: (hide: boolean) => void;
}

const MonitoringPrefContext = createContext<MonitoringPrefValue | undefined>(undefined);

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function MonitoringPrefProvider({ children }: { children: ReactNode }) {
  const [hideMonitoring, setHideState] = useState<boolean>(readStored);

  const setHideMonitoring = useCallback((hide: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hide));
    } catch {
      /* ignore storage errors */
    }
    setHideState(hide);
  }, []);

  const value = useMemo(
    () => ({ hideMonitoring, setHideMonitoring }),
    [hideMonitoring, setHideMonitoring]
  );

  return <MonitoringPrefContext.Provider value={value}>{children}</MonitoringPrefContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMonitoringPref(): MonitoringPrefValue {
  const ctx = useContext(MonitoringPrefContext);
  if (!ctx) throw new Error('useMonitoringPref must be used within a MonitoringPrefProvider');
  return ctx;
}
