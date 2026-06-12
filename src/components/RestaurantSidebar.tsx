'use client';
import React, { useState } from 'react';
import Link from 'next/link';

import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Tag, MapPin, Settings, ChevronLeft, ChevronRight, Bell, LogOut, TrendingUp, Store, Users, Shield } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const superAdminNavGroups: NavGroup[] = [
  {
    label: 'Piattaforma',
    items: [
      { id: 'nav-ristoranti', label: 'Ristoranti', icon: <Store size={18} />, href: '/superadmin/restaurants' },
      { id: 'nav-utenti', label: 'Utenti', icon: <Users size={18} />, href: '/superadmin/restaurants' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'nav-impostazioni', label: 'Impostazioni', icon: <Settings size={18} />, href: '/superadmin/restaurants' },
      { id: 'nav-sicurezza', label: 'Sicurezza', icon: <Shield size={18} />, href: '/superadmin/restaurants' },
    ],
  },
];

const ristoratoreNavGroups: NavGroup[] = [
  {
    label: 'Operativo',
    items: [
      { id: 'nav-panoramica', label: 'Panoramica', icon: <LayoutDashboard size={18} />, href: '/restaurant-management-dashboard' },
      { id: 'nav-ordini', label: 'Ordini Live', icon: <ShoppingBag size={18} />, href: '/restaurant-management-dashboard', badge: 3 },
      { id: 'nav-performance', label: 'Performance', icon: <TrendingUp size={18} />, href: '/restaurant-management-dashboard' },
    ],
  },
  {
    label: 'Gestione',
    items: [
      { id: 'nav-menu', label: 'Menu', icon: <UtensilsCrossed size={18} />, href: '/ristoratore/menu' },
      { id: 'nav-promozioni', label: 'Promozioni', icon: <Tag size={18} />, href: '/restaurant-management-dashboard' },
      { id: 'nav-zone', label: 'Zone Consegna', icon: <MapPin size={18} />, href: '/restaurant-management-dashboard' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'nav-impostazioni', label: 'Impostazioni', icon: <Settings size={18} />, href: '/restaurant-management-dashboard' },
    ],
  },
];

interface RestaurantSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  role?: 'superadmin' | 'ristoratore';
}

export default function RestaurantSidebar({ collapsed, onToggle, activeSection, onSectionChange, role = 'ristoratore' }: RestaurantSidebarProps) {
  const navGroups = role === 'superadmin' ? superAdminNavGroups : ristoratoreNavGroups;

  return (
    <aside
      className={`flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-border ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <div>
            <span className="font-bold text-lg text-foreground tracking-tight">GloriaOrder</span>
            {role === 'superadmin' && (
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wide leading-none mt-0.5">Super Admin</p>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
        {navGroups.map((group) => (
          <div key={`group-${group.label}`}>
            {!collapsed && (
              <p className="px-4 mb-1 text-[11px] font-600 uppercase tracking-widest text-muted-foreground" style={{ fontWeight: 600 }}>
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => onSectionChange(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                        isActive
                          ? 'bg-secondary text-primary' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      style={{ fontWeight: isActive ? 600 : 500 }}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="bg-primary text-white text-[10px] font-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ fontWeight: 700 }}>
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Notifiche' : undefined}
        >
          <Bell size={18} />
          {!collapsed && <span className="font-medium">Notifiche</span>}
        </button>
        <Link
          href="/sign-up-login-screen"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Esci' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium">Esci</span>}
        </Link>
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors ${collapsed ? 'justify-center' : 'justify-end'}`}
          aria-label={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <span>Comprimi</span>
              <ChevronLeft size={16} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}