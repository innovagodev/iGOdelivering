'use client';
import React, { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import versionData from '@/version.json';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Percent,
  Map,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  Activity,
  Calendar,
  X,
  Clock,
  QrCode,
  CreditCard,
  Store,
} from 'lucide-react';

// useLayoutEffect applica la preferenza prima del primo disegno: con useEffect la
// sidebar compariva espansa per un istante a ogni cambio pagina (più a lungo
// sulle pagine pesanti, come Menu). Sul server resta useEffect, che non gira.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

const adminNavItems: NavItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} strokeWidth={1.75} />,
    href: '/admin/dashboard',
  },
  {
    id: 'nav-ristoranti',
    label: 'Ristoranti',
    icon: <Building2 size={18} strokeWidth={1.75} />,
    href: '/admin/restaurants',
  },
  {
    id: 'nav-utenti',
    label: 'Utenti',
    icon: <Users size={18} strokeWidth={1.75} />,
    href: '/admin/utenti',
  },
  {
    id: 'nav-impostazioni',
    label: 'Impostazioni',
    icon: <Settings size={18} strokeWidth={1.75} />,
    href: '/admin/impostazioni',
  },
  {
    id: 'nav-sicurezza',
    label: 'Registro Attività',
    icon: <Activity size={18} strokeWidth={1.75} />,
    href: '/admin/sicurezza',
  },
];

const ristoratoreNavItems: NavItem[] = [
  {
    id: 'nav-panoramica',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} strokeWidth={1.75} />,
    href: '/ristoratore/dashboard',
  },
  {
    id: 'nav-profilo',
    label: 'Profilo ristorante',
    icon: <Store size={18} strokeWidth={1.75} />,
    href: '/ristoratore/profilo',
  },
  {
    id: 'nav-ordini',
    label: 'Ordini Live',
    icon: <Receipt size={18} strokeWidth={1.75} />,
    href: '/ristoratore/ordini',
  },
  {
    id: 'nav-prenotazioni',
    label: 'Prenotazioni',
    icon: <Calendar size={18} strokeWidth={1.75} />,
    href: '/ristoratore/prenotazioni',
  },
  {
    id: 'nav-clienti',
    label: 'Clienti',
    icon: <Users size={18} strokeWidth={1.75} />,
    href: '/ristoratore/clienti',
  },
  {
    id: 'nav-orari',
    label: 'Orari',
    icon: <Clock size={18} strokeWidth={1.75} />,
    href: '/ristoratore/orari',
  },
  {
    id: 'nav-menu',
    label: 'Menu',
    icon: <BookOpen size={18} strokeWidth={1.75} />,
    href: '/ristoratore/menu',
  },
  {
    id: 'nav-promozioni',
    label: 'Promozioni',
    icon: <Percent size={18} strokeWidth={1.75} />,
    href: '/ristoratore/promozioni',
  },
  {
    id: 'nav-zone',
    label: 'Zone Consegna',
    icon: <Map size={18} strokeWidth={1.75} />,
    href: '/ristoratore/zone',
  },
  {
    id: 'nav-tavoli',
    label: 'QR Code Tavoli',
    icon: <QrCode size={18} strokeWidth={1.75} />,
    href: '/ristoratore/tavoli',
  },
  {
    id: 'nav-pagamenti',
    label: 'Pagamenti',
    icon: <CreditCard size={18} strokeWidth={1.75} />,
    href: '/ristoratore/pagamenti',
  },
];

interface SidebarProps {
  role?: 'admin' | 'ristoratore';
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  role = 'ristoratore',
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Sidebar adattiva: da 1024px è fissa, ma tra 1024 e 1280px (tablet in
  // orizzontale, laptop piccoli) parte compressa per lasciare spazio ai
  // contenuti. Se l'utente sceglie, la scelta vince ed è la stessa su tutte
  // le pagine (prima ogni pagina teneva uno stato suo). Sotto 1024px è un
  // drawer e mostra sempre le etichette.
  const [isDesktop, setIsDesktop] = useState(false);
  const [isWide, setIsWide] = useState(true);
  const [userPref, setUserPref] = useState<boolean | null>(null);

  useIsoLayoutEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const wide = window.matchMedia('(min-width: 1280px)');
    const sync = () => {
      setIsDesktop(desktop.matches);
      setIsWide(wide.matches);
    };
    sync();
    desktop.addEventListener('change', sync);
    wide.addEventListener('change', sync);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      if (stored !== null) setUserPref(JSON.parse(stored) === true);
    } catch {
      /* preferenza non leggibile: resta l'adattamento automatico */
    }
    return () => {
      desktop.removeEventListener('change', sync);
      wide.removeEventListener('change', sync);
    };
  }, []);

  const collapsed = isDesktop && (userPref ?? !isWide);

  // Le transizioni partono solo dopo il primo disegno: altrimenti la sidebar
  // si "chiuderebbe" animata a ogni apertura di pagina.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const tr = animate ? 'transition-all duration-300' : '';

  useEffect(() => {
    const updateCount = () => {
      if (role === 'ristoratore' && user?.restaurantId) {
        try {
          const storedOrders = localStorage.getItem(STORAGE_KEYS.orders(user.restaurantId));
          if (storedOrders) {
            const parsed = JSON.parse(storedOrders);
            if (Array.isArray(parsed)) {
              setPendingOrdersCount(
                parsed.filter((o: any) => o.status === 'new' || o.status === 'pending').length
              );
            } else if (parsed.pending) {
              setPendingOrdersCount(parsed.pending.length);
            }
          }
        } catch (e) {
          console.error('Error reading pending orders count', e);
        }
      }
    };

    updateCount();
    window.addEventListener('iGO_orders_updated', updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('iGO_orders_updated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, [role, user]);

  const handleToggleClick = () => {
    const next = !collapsed;
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(next));
    } catch {
      /* storage non disponibile */
    }
    setUserPref(next);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'R';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGradientColor = (name?: string) => {
    return 'from-slate-800 to-slate-900 border border-slate-700/50';
  };

  const rawItems = role === 'admin' ? adminNavItems : ristoratoreNavItems;
  const navItems = rawItems.map((item) => {
    if (item.id === 'nav-ordini') {
      return { ...item, badge: pendingOrdersCount };
    }
    return item;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card relative">
      {/* Header — Logo */}
      <div className="flex items-center h-16 border-b border-border px-4 relative justify-center">
        <div className="flex items-center justify-center overflow-hidden">
          {role === 'admin' ? (
            <div className={`${tr} flex items-center justify-center`}>
              <AppLogo size={collapsed ? 28 : 50} />
            </div>
          ) : (
            <div className={`${tr} flex items-center justify-center`}>
              {user?.restaurantLogo ? (
                <img
                  src={user.restaurantLogo}
                  alt={user.restaurantName || 'Logo'}
                  className={`object-contain ${tr} ${
                    collapsed ? 'w-7 h-7' : 'h-10 max-w-[140px]'
                  }`}
                />
              ) : (
                <div
                  className={`bg-gradient-to-br ${getGradientColor(
                    user?.restaurantName
                  )} text-white flex items-center justify-center font-extrabold shadow-xs ${tr} ${
                    collapsed ? 'w-7 h-7 rounded-full text-[11px]' : 'w-10 h-10 rounded-xl text-sm'
                  }`}
                >
                  {getInitials(user?.restaurantName)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="touch-target absolute right-3 p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden cursor-pointer"
            aria-label="Chiudi menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href || !!pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                collapsed ? 'lg:justify-center lg:px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                {item.icon}
              </span>
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}

              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <>
                  {!collapsed && (
                    <span className="bg-primary text-white text-[11px] font-extrabold rounded-full min-w-5 h-5 px-1.5 flex-shrink-0 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && (
                    <span className="hidden lg:block absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-card animate-pulse" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mini Sidebar Footer */}
      <div className="p-3 border-t border-border mt-auto flex flex-col gap-1 text-[11px] text-muted-foreground select-none">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span>© {new Date().getFullYear()} iGOdelivering</span>
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
          </>
        ) : (
          <div className="text-center font-bold text-[11px] text-foreground opacity-60">
            v{versionData.version.split('.').slice(0, 2).join('.')}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container — relative for the absolute toggle button */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-card border-r border-border ${animate ? 'transition-all duration-300 ease-in-out' : ''} flex-shrink-0
          lg:static lg:translate-x-0 lg:relative
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-16' : 'lg:w-64 w-64'}
        `}
      >
        {sidebarContent}

        {/* Floating Desktop Toggle Button — overlaps the right border edge */}
        <button
          onClick={handleToggleClick}
          className="
            hidden lg:flex
            absolute -right-3.5 top-[4.25rem]
            z-[60]
            w-7 h-7
            items-center justify-center
            rounded-full
            bg-card
            border border-border
            shadow-md
            text-muted-foreground hover:text-primary
            hover:border-primary/40
            transition-all duration-200
            cursor-pointer
          "
          aria-label={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
          title={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={13} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={13} strokeWidth={2.5} />
          )}
        </button>
      </aside>
    </>
  );
}
