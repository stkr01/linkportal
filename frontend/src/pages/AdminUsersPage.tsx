import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, getUsers, updateUser } from '../api/client';
import type { Role } from '../types';

const roles: Role[] = ['VIEWER', 'EDITOR', 'ADMIN'];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMut = useMutation({
    mutationFn: () => createUser({ username, displayName, password, role }),
    onSuccess: () => {
      invalidate();
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('VIEWER');
      setError('');
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Kunde inte skapa användare.'
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: Role; isActive?: boolean; newPassword?: string } }) =>
      updateUser(id, data),
    onSuccess: invalidate,
  });

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Lösenordet måste vara minst 8 tecken.');
      return;
    }
    createMut.mutate();
  };

  const resetPassword = (id: number) => {
    const pw = window.prompt('Nytt lösenord (minst 8 tecken):');
    if (pw && pw.length >= 8) {
      updateMut.mutate({ id, data: { newPassword: pw } });
    } else if (pw) {
      alert('Lösenordet måste vara minst 8 tecken.');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <span className="spacer" />
        <RouterLink to="/">
          <button className="secondary">← Tillbaka</button>
        </RouterLink>
      </header>

      <div className="content" style={{ overflowY: 'auto', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <h2>Användarhantering</h2>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Ny användare</h3>
          <form onSubmit={onCreate}>
            <div className="row">
              <div>
                <label>Användarnamn</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label>Visningsnamn</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Tillfälligt lösenord</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label>Roll</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={createMut.isPending}>
                Skapa användare
              </button>
              <span className="muted" style={{ marginLeft: '0.75rem', fontSize: '0.8rem' }}>
                Användaren tvingas byta lösenord vid första inloggning.
              </span>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0 }}>Användare</h3>
          {usersQuery.isLoading ? (
            <div className="muted">Laddar…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Användarnamn</th>
                  <th>Namn</th>
                  <th>Roll</th>
                  <th>Status</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.displayName}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => updateMut.mutate({ id: u.id, data: { role: e.target.value as Role } })}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{u.isActive ? 'Aktiv' : 'Inaktiv'}</td>
                    <td style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        className="secondary"
                        onClick={() => updateMut.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                      >
                        {u.isActive ? 'Inaktivera' : 'Aktivera'}
                      </button>
                      <button className="secondary" onClick={() => resetPassword(u.id)}>
                        Återställ lösen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
