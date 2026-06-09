import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../api/client';
import { useTranslation } from '../i18n';

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) {
      setError(t('changePassword.tooShort'));
      return;
    }
    if (next !== confirm) {
      setError(t('changePassword.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      await refresh();
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('changePassword.failed');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>{t('changePassword.title')}</h1>
        <div className="sub">
          {user.mustChangePassword
            ? t('changePassword.mustChange')
            : t('changePassword.update')}
        </div>
        <label htmlFor="current">{t('changePassword.current')}</label>
        <input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <label htmlFor="next">{t('changePassword.new')}</label>
        <input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <label htmlFor="confirm">{t('changePassword.confirm')}</label>
        <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? t('common.saving') : t('changePassword.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
