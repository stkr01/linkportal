import { FormEvent, useState } from 'react';
import type { CategoryNode, Environment, LinkItem, LinkInput } from '../types';
import { flattenCategories } from '../utils/categories';

interface Props {
  categories: CategoryNode[];
  initial?: LinkItem | null;
  defaultCategoryId?: number | null;
  onSubmit: (input: LinkInput) => Promise<void>;
  onClose: () => void;
}

const environments: Environment[] = ['NA', 'PROD', 'TEST', 'DEV'];

export default function LinkForm({ categories, initial, defaultCategoryId, onSubmit, onClose }: Props) {
  const flat = flattenCategories(categories);
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(
    initial?.categoryId ?? defaultCategoryId ?? (flat[0]?.id ?? '')
  );
  const [manageSoftware, setManageSoftware] = useState(initial?.manageSoftware ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [environment, setEnvironment] = useState<Environment>(initial?.environment ?? 'NA');
  const [owningTeam, setOwningTeam] = useState(initial?.owningTeam ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).map((t) => t.name).join(', '));
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Namn krävs.');
    if (!categoryId) return setError('Välj en kategori.');
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      return setError('Ogiltig URL (måste börja med http:// eller https://).');
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        categoryId: Number(categoryId),
        manageSoftware: manageSoftware.trim() || null,
        description: description.trim() || null,
        environment,
        owningTeam: owningTeam.trim() || null,
        isFavorite,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Kunde inte spara länken.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? 'Redigera länk' : 'Ny länk'}</h2>

        <label htmlFor="lf-name">Namn *</label>
        <input id="lf-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

        <label htmlFor="lf-url">URL *</label>
        <input id="lf-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />

        <label htmlFor="lf-cat">Kategori *</label>
        <select id="lf-cat" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.path}
            </option>
          ))}
        </select>

        <div className="row">
          <div>
            <label htmlFor="lf-sw">Manage Software</label>
            <input id="lf-sw" value={manageSoftware} onChange={(e) => setManageSoftware(e.target.value)} />
          </div>
          <div>
            <label htmlFor="lf-team">Ägande team</label>
            <input id="lf-team" value={owningTeam} onChange={(e) => setOwningTeam(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="lf-env">Miljö</label>
            <select id="lf-env" value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)}>
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lf-tags">Taggar (kommaseparerade)</label>
            <input id="lf-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="prod, kritisk" />
          </div>
        </div>

        <label htmlFor="lf-desc">Beskrivning</label>
        <textarea id="lf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="checkbox-row" htmlFor="lf-fav">
          <input
            id="lf-fav"
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
          />
          <span>★ Favorit (visas högst upp i webbläsartillägget)</span>
        </label>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" disabled={busy}>
            {busy ? 'Sparar…' : 'Spara'}
          </button>
        </div>
      </form>
    </div>
  );
}
