'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LifeBuoy,
  LogOut,
  PauseCircle,
  PlayCircle,
  CreditCard,
} from 'lucide-react';

interface TopbarProps {
  role: 'admin' | 'ristoratore';
  leftContent?: React.ReactNode;
  rightExtra?: React.ReactNode;
  onMobileMenuOpen: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Topbar({ role, leftContent, rightExtra, onMobileMenuOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const formatted = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}/${month}/${year}`;
    setFormattedDate(formatted);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const settingsPath = role === 'admin' ? '/admin/impostazioni' : '/ristoratore/pagamenti';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0 z-40 relative">
      {/* Hamburger button for mobile */}
      <button
        onClick={onMobileMenuOpen}
        className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground lg:hidden cursor-pointer flex-shrink-0 transition-colors"
        aria-label="Apri menu"
      >
        <Menu size={20} />
      </button>

      {/* Left Content Area */}
      <div className="flex items-center justify-between flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 min-w-0">{leftContent}</div>
        {formattedDate && (
          <span className="hidden lg:inline-block text-xs md:text-sm text-muted-foreground/80 flex-shrink-0 font-semibold ml-1.5 select-none">
            {formattedDate}
          </span>
        )}
      </div>

      {/* Right Content Area */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {rightExtra}

        {/* User Profile Avatar Dropdown */}
        <div className="relative pl-2 border-l border-border" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer text-left"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-foreground leading-none">
                {user?.name || 'Utente'}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                {role === 'admin' ? 'Amministratore' : 'Ristoratore'}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-muted-foreground hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Header Info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.name || 'Utente'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
              </div>

              {/* Menu options */}
              <div className="p-1.5">
                <Link
                  href={settingsPath}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  {role === 'admin' ? (
                    <Settings size={14} strokeWidth={1.75} />
                  ) : (
                    <CreditCard size={14} strokeWidth={1.75} />
                  )}
                  <span>{role === 'admin' ? 'Impostazioni' : 'Pagamenti'}</span>
                </Link>
              </div>

              <div className="border-t border-border mx-1.5 my-1" />

              <div className="p-1.5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut size={14} strokeWidth={1.75} />
                  <span>Esci</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
