import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { getHelpContent, hasHelpTranslation } from '../i18n/help';

export default function HelpPage() {
  const { t, lang } = useTranslation();
  const content = getHelpContent(lang);
  const isFallback = !hasHelpTranslation(lang);

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <span className="spacer" />
        <RouterLink to="/">
          <button className="secondary">{t('common.back')}</button>
        </RouterLink>
      </header>

      <div className="content help-page">
        <h2>{content.title}</h2>
        <p className="muted help-intro">{content.intro}</p>
        {isFallback && <p className="muted help-fallback">{content.fallbackNote}</p>}

        <nav className="help-toc card" aria-label={content.title}>
          <ul>
            {content.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        {content.sections.map((s) => (
          <section key={s.id} id={s.id} className="card help-section">
            <h3>{s.title}</h3>
            {s.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
