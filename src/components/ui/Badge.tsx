import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
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

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[9px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-2',
};

export default function Badge({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
  size = 'sm',
  icon,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-600 border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={{ fontWeight: 600 }}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[variant]}`} />}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
