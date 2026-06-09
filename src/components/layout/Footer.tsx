'use client';
import React, { useState, useEffect, useRef } from 'react';
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

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || variant === 'compact') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. If scrolling down past a threshold, hide on mobile
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // 2. If scrolling up, show it
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // 3. Clear timeout and set a new one to show footer when scrolling stops
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 250); // Reappear after 250ms of scroll inactivity
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [variant]);

  if (variant === 'compact') {
    return (
      <div
        className={`flex flex-col gap-1 text-[10px] text-muted-foreground select-none ${className}`}
      >
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
    <footer
      className={`fixed md:relative bottom-0 left-0 right-0 z-30 md:z-auto bg-card/95 md:bg-card backdrop-blur-md md:backdrop-blur-none border-t border-border py-4 md:py-8 transition-transform duration-300 ease-in-out shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none ${
        !isVisible ? 'translate-y-full md:translate-y-0' : 'translate-y-0'
      } ${className}`}
    >
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
