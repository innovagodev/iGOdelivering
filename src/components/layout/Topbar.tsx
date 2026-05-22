'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Menu, Bell, ChevronDown, User, Settings, LifeBuoy, LogOut } from 'lucide-react';

interface TopbarProps {
  role: 'admin' | 'ristoratore';
  leftContent?: React.ReactNode;
  rightExtra?: React.ReactNode;
  onMobileMenuOpen: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Topbar({
  role,
  leftContent,
  rightExtra,
  onMobileMenuOpen,
}: TopbarProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const settingsPath = role === 'admin' ? '/admin/impostazioni' : '/ristoratore/impostazioni';

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
      <div className="flex items-center gap-2 flex-1 min-w-0">{leftContent}</div>

      {/* Right Content Area */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {rightExtra}

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Notifiche"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* User Profile Avatar Dropdown */}
        <div className="relative pl-2 border-l border-border" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer text-left"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
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
            <ChevronDown size={14} className={`text-muted-foreground hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                  <User size={14} />
                  <span>Modifica Profilo</span>
                </Link>
                <Link
                  href={settingsPath}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  <Settings size={14} />
                  <span>Impostazioni account</span>
                </Link>
                <Link
                  href="#supporto"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  <LifeBuoy size={14} />
                  <span>Supporto</span>
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
                  <LogOut size={14} />
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
