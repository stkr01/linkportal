import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../api/client';

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth();
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
      setError('Nytt lösenord måste vara minst 8 tecken.');
      return;
    }
    if (next !== confirm) {
      setError('Lösenorden matchar inte.');
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
        'Kunde inte byta lösenord.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Byt lösenord</h1>
        <div className="sub">
          {user.mustChangePassword
            ? 'Du måste byta lösenord innan du fortsätter.'
            : 'Uppdatera ditt lösenord.'}
        </div>
        <label htmlFor="current">Nuvarande lösenord</label>
        <input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <label htmlFor="next">Nytt lösenord</label>
        <input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <label htmlFor="confirm">Bekräfta nytt lösenord</label>
        <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Sparar…' : 'Spara nytt lösenord'}
          </button>
        </div>
      </form>
    </div>
  );
}
