import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(username, password);
      navigate(user.mustChangePassword ? '/change-password' : '/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('login.failed');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>LinkPortal</h1>
        <div className="sub">{t('login.subtitle')}</div>
        <label htmlFor="username">{t('login.username')}</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
        <label htmlFor="password">{t('login.password')}</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? t('login.signingIn') : t('login.signIn')}
          </button>
        </div>
      </form>
    </div>
  );
}
