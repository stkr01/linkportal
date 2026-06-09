import { FormEvent, useState } from 'react';
import type { CategoryNode, Environment, LinkItem, LinkInput } from '../types';
import { flattenCategories } from '../utils/categories';
import { useTranslation } from '../i18n';

interface Props {
  categories: CategoryNode[];
  initial?: LinkItem | null;
  defaultCategoryId?: number | null;
  onSubmit: (input: LinkInput) => Promise<void>;
  onClose: () => void;
}

const environments: Environment[] = ['NA', 'PROD', 'TEST', 'DEV'];

export default function LinkForm({ categories, initial, defaultCategoryId, onSubmit, onClose }: Props) {
  const { t } = useTranslation();
  const flat = flattenCategories(categories);
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(
    initial?.categoryId ?? defaultCategoryId ?? (flat[0]?.id ?? '')
  );
  const [manageSoftware, setManageSoftware] = useState(initial?.manageSoftware ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [environment, setEnvironment] = useState<Environment>(initial?.environment ?? 'NA');
  const [owningTeam, setOwningTeam] = useState(initial?.owningTeam ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).map((t) => t.name).join(', '));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError(t('form.nameRequired'));
    if (!categoryId) return setError(t('form.selectCategory'));
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      return setError(t('form.invalidUrl'));
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        categoryId: Number(categoryId),
        manageSoftware: manageSoftware.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        environment,
        owningTeam: owningTeam.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('form.saveFailed');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? t('form.editTitle') : t('form.newTitle')}</h2>

        <label htmlFor="lf-name">{t('form.name')}</label>
        <input id="lf-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

        <label htmlFor="lf-url">URL *</label>
        <input id="lf-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />

        <label htmlFor="lf-cat">{t('form.category')}</label>
        <select id="lf-cat" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.path}
            </option>
          ))}
        </select>

        <div className="row">
          <div>
            <label htmlFor="lf-sw">{t('form.manageSoftware')}</label>
            <input id="lf-sw" value={manageSoftware} onChange={(e) => setManageSoftware(e.target.value)} />
          </div>
          <div>
            <label htmlFor="lf-team">{t('form.owningTeam')}</label>
            <input id="lf-team" value={owningTeam} onChange={(e) => setOwningTeam(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="lf-env">{t('form.environment')}</label>
            <select id="lf-env" value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)}>
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lf-tags">{t('form.tags')}</label>
            <input id="lf-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('form.tagsPlaceholder')} />
          </div>
        </div>

        <label htmlFor="lf-desc">{t('form.description')}</label>
        <textarea id="lf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label htmlFor="lf-img">{t('form.imageUrl')}</label>
        <div className="img-field">
          <input
            id="lf-img"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…/logo.png"
          />
          {imageUrl.trim() && (
            <img
              className="img-preview"
              src={imageUrl.trim()}
              alt={t('form.imagePreviewAlt')}
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
              onLoad={(e) => ((e.target as HTMLImageElement).style.visibility = 'visible')}
            />
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
