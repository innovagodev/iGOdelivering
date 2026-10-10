'use client';
import React, { useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Freccia "indietro" a sinistra del titolo: per i passaggi che hanno un passo precedente. */
  onBack?: () => void;
  backLabel?: string;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  onBack,
  backLabel = 'Indietro',
  title,
  children,
  size = 'md',
  hideClose = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,23,20,0.5)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${sizeClasses[size]} bg-card rounded-2xl shadow-modal animate-slide-up`}
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
        data-lenis-prevent
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
            {onBack && (
              <button
                onClick={onBack}
                className="-ml-2 mr-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={backLabel}
                title={backLabel}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
