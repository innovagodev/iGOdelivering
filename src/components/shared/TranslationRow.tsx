'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Riga di traduzione: italiano in sola lettura, inglese modificabile, salvataggio al blur. */
export default function TranslationRow({
  label,
  source,
  value,
  suggestion,
  multiline,
  onSave,
}: {
  label?: string;
  source: string;
  value: string;
  suggestion?: string;
  multiline?: boolean;
  onSave: (v: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = React.useState(value);
  const [state, setState] = React.useState<SaveState>('idle');

  React.useEffect(() => setDraft(value), [value]);

  const commit = async (next: string) => {
    if (next.trim() === (value || '').trim()) return;
    setState('saving');
    const ok = await onSave(next.trim());
    setState(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setState('idle'), 1500);
  };

  const common = {
    value: draft,
    placeholder: source,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: () => commit(draft),
    className:
      'w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  };

  const canSuggest = !!suggestion && suggestion !== source && !draft.trim();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 items-start">
      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 break-words">
        {label && (
          <span className="block text-[10px] uppercase tracking-wider font-bold mb-0.5">
            {label}
          </span>
        )}
        <span className="text-foreground/80 text-sm">{source || '—'}</span>
      </div>
      <div className="space-y-1">
        <div className="relative">
          {multiline ? (
            <textarea rows={3} {...common} className={`${common.className} resize-none`} />
          ) : (
            <input type="text" {...common} />
          )}
          <span className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none">
            {state === 'saving' && <Loader2 size={14} className="animate-spin" />}
            {state === 'saved' && <Check size={14} className="text-emerald-600" />}
            {state === 'error' && <span className="text-red-500 text-[10px] font-bold">!</span>}
          </span>
        </div>
        {canSuggest && (
          <button
            type="button"
            onClick={() => {
              setDraft(suggestion as string);
              commit(suggestion as string);
            }}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Usa «{suggestion}»
          </button>
        )}
        {state === 'error' && (
          <p className="text-[11px] text-red-500">Salvataggio non riuscito, riprova.</p>
        )}
      </div>
    </div>
  );
}

