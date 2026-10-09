'use client';
import React, { useEffect, useRef, useState } from 'react';

export interface FilterPill {
  key: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: 'danger';
  badge?: number;
  title?: string;
  /** Un filo di separazione prima della pillola (gruppo diverso). */
  dividerBefore?: boolean;
}

/**
 * Fila di pillole filtro. Se non ci stanno scorre di lato: lo si capisce dalle sfumature
 * ai bordi (compaiono solo dove c'è altro da vedere), la pillola toccata si porta al centro
 * (magnetismo) e anche trascinando la fila le pillole si agganciano.
 */
export default function FilterPills({ pills, ariaLabel }: { pills: FilterPill[]; ariaLabel: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pills.length]);

  const centerOn = (btn: HTMLElement) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, btn.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2), behavior: 'smooth' });
  };

  return (
    <div className="relative min-w-0 lg:flex-1">
      <div
        ref={scroller}
        onScroll={update}
        role="group"
        aria-label={ariaLabel}
        className="scrollbar-hide relative flex snap-x snap-proximity gap-1.5 overflow-x-auto py-0.5"
      >
        {pills.map((p) => (
          <React.Fragment key={p.key}>
            {p.dividerBefore && <span aria-hidden className="mx-1 h-5 w-px flex-shrink-0 self-center bg-border" />}
            <button
              type="button"
              aria-pressed={p.active}
              title={p.title}
              onClick={(e) => {
                p.onClick();
                centerOn(e.currentTarget);
              }}
              className={`inline-flex h-10 flex-shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all cursor-pointer active:scale-[0.97] ${
                p.active
                  ? p.tone === 'danger'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {p.icon}
              {p.label}
              {p.badge !== undefined && p.badge > 0 && (
                <span
                  className={`min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-center text-xs font-extrabold tabular-nums ${
                    p.active ? 'bg-white/25 text-inherit' : 'bg-rose-500 text-white'
                  }`}
                >
                  {p.badge}
                </span>
              )}
            </button>
          </React.Fragment>
        ))}
      </div>
      {edge.left && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      )}
      {edge.right && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}
