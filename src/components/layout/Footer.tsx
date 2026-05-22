'use client';
import React from 'react';
import versionData from '@/version.json';

interface FooterProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export default function Footer({ className = '', variant = 'full' }: FooterProps) {
  const year = new Date().getFullYear();
  const buildDate = new Date(versionData.buildDate);
  const formattedDate = buildDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-1 text-[10px] text-muted-foreground select-none ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <span>© {year} iGOdelivering</span>
          <span className="font-semibold text-foreground">v{versionData.version}</span>
        </div>
        <div>
          Tecnologia di{' '}
          <a
            href="https://www.innovago.it"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-primary transition-colors text-foreground"
          >
            innovago.it
          </a>
        </div>
      </div>
    );
  }

  return (
    <footer className={`bg-card border-t border-border py-8 ${className}`}>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>
          © {year} iGOdelivering. Tecnologia di{' '}
          <a
            href="https://www.innovago.it"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-primary transition-colors text-foreground"
          >
            innovago.it
          </a>
        </p>
        <div className="flex items-center gap-2 text-[10px] opacity-75">
          <span className="font-semibold">v{versionData.version}</span>
          <span className="text-border">|</span>
          <span>Build: {formattedDate}</span>
        </div>
      </div>
    </footer>
  );
}
