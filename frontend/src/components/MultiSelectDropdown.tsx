import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: DropdownOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyText?: string;
}

// Liten multi-select med kryssrutor i en popover. Stänger vid klick utanför.
export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  emptyText,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const count = selected.length;

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        type="button"
        className={`secondary filter-toggle${count ? ' active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {count ? ` (${count})` : ''} ▾
      </button>
      {open && (
        <div className="filter-menu" role="group" aria-label={label}>
          {options.length === 0 ? (
            <div className="filter-empty">{emptyText ?? '—'}</div>
          ) : (
            options.map((opt) => (
              <label key={opt.value} className="filter-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
