import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success-bg)] text-[var(--success)] border-green-200',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-amber-200',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)] border-red-200',
  info: 'bg-[var(--info-bg)] text-[var(--info)] border-blue-200',
  neutral: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-secondary text-primary border-orange-200',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
};

export default function Badge({ variant = 'neutral', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-600 border ${variantStyles[variant]} ${className}`}
      style={{ fontWeight: 600 }}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
}