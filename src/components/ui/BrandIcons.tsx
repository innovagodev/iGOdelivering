import React from 'react';

/**
 * Icone di Instagram e Facebook nello stile di lucide (linea, 24×24).
 * La versione di lucide-react del progetto non include più le icone dei marchi.
 */
interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const base = (size: number, props: React.SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export function InstagramIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v4H8v7h4v-7h2.8l.7-4H12V7.8c0-.5.4-.8.9-.8H15V3z" />
    </svg>
  );
}
