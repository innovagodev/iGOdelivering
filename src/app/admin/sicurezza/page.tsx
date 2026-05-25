'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import {
  Activity,
  Search,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  event: string;
  ipAddress: string;
  status: 'success' | 'failure';
  severity: 'low' | 'medium' | 'high';
}

const mockLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-05-21 11:32:15',
    user: 'admin@igodelivering.it',
    event: 'Autenticazione Amministratore',
    ipAddress: '93.42.180.12',
    status: 'success',
    severity: 'low',
  },
  {
    id: 'log-2',
    timestamp: '2026-05-21 10:45:00',
    user: 'giuseppe@bellanapoli.it',
    event: 'Reset Password Ristoratore',
    ipAddress: '151.24.89.202',
    status: 'success',
    severity: 'medium',
  },
  {
    id: 'log-3',
    timestamp: '2026-05-21 09:12:44',
    user: 'admin@igodelivering.it',
    event: 'Sospensione Ristorante "Osteria del Porto"',
    ipAddress: '93.42.180.12',
    status: 'success',
    severity: 'medium',
  },
  {
    id: 'log-4',
    timestamp: '2026-05-21 08:30:11',
    user: 'sconosciuto',
    event: 'Tentativo di accesso fallito (admin)',
    ipAddress: '198.51.100.45',
    status: 'failure',
    severity: 'high',
  },
  {
    id: 'log-5',
    timestamp: '2026-05-20 22:15:30',
    user: 'mario@trattoriamario.it',
    event: "Modifica Orario d'apertura",
    ipAddress: '87.12.115.4',
    status: 'success',
    severity: 'low',
  },
  {
    id: 'log-6',
    timestamp: '2026-05-20 18:44:22',
    user: 'system',
    event: 'Backup automatico Database',
    ipAddress: '127.0.0.1',
    status: 'success',
    severity: 'low',
  },
];

export default function AdminSicurezzaPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [logs, setLogs] = useState<AuditLog[]>(mockLogs);

  useEffect(() => {
    // Restore sidebar state
    const stored = localStorage.getItem('iGO_sidebar_collapsed');
    if (stored !== null) {
      setSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  const handleClearLogs = () => {
    if (
      confirm(
        'Sei sicuro di voler ripulire tutto il registro attività? Questa azione non può essere annullata.'
      )
    ) {
      setLogs([]);
    }
  };

  const handleExport = () => {
    alert('Logs esportati correttamente in formato CSV! Il download inizierà a breve.');
  };

  const handleReload = () => {
    setLogs(mockLogs);
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.event.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress.includes(search);
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-sicurezza"
        onSectionChange={() => {}}
        role="admin"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="admin"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base">Admin</span>
              <span className="text-muted-foreground text-sm">/ Registro Attività</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="text-primary" size={24} />
                  Registro Attività (Audit Log)
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Tracciamento delle operazioni amministrative e delle attività di sistema critiche.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReload}
                  className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Ripristina Log di Test"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={handleClearLogs}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-xs font-semibold"
                >
                  <Trash2 size={14} />
                  Svuota Registro
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-sm"
                >
                  <Download size={14} />
                  Esporta Log
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Cerca per evento, utente, IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                  <Filter size={12} />
                  Severità:
                </span>
                {(['all', 'low', 'medium', 'high'] as const).map((s) => (
                  <button
                    key={`filter-${s}`}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      severityFilter === s
                        ? 'bg-primary text-white'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s === 'all'
                      ? 'Tutte'
                      : s === 'low'
                        ? 'Bassa'
                        : s === 'medium'
                          ? 'Media'
                          : 'Alta'}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Logs Table (Desktop) & Cards (Mobile) */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Timestamp
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Utente / Operatore
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Evento
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                        Indirizzo IP
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Severità
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Esito
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                          Nessun log registrato
                        </td>
                      </tr>
                    )}
                    {filteredLogs.map((log) => {
                      return (
                        <tr key={log.id} className="hover:bg-muted/40 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-mono text-muted-foreground">
                              {log.timestamp}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-foreground">
                              {log.user}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-foreground">{log.event}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                              {log.ipAddress}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                log.severity === 'high'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : log.severity === 'medium'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }`}
                            >
                              {log.severity === 'high'
                                ? 'Alta'
                                : log.severity === 'medium'
                                  ? 'Media'
                                  : 'Bassa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                log.status === 'success'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}
                            >
                              {log.status === 'success' ? (
                                <>
                                  <CheckCircle size={12} />
                                  Ok
                                  </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  Fallito
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-border">
                {filteredLogs.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nessun log registrato
                  </div>
                )}
                {filteredLogs.map((log) => {
                  return (
                    <div key={log.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground block mb-0.5">
                            {log.timestamp}
                          </span>
                          <h4 className="font-semibold text-sm text-foreground leading-snug">{log.event}</h4>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {log.status === 'success' ? 'Ok' : 'Fallito'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Utente / Operatore</p>
                          <p className="font-medium text-foreground truncate max-w-xs">{log.user}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Indirizzo IP</p>
                          <p className="font-mono text-foreground text-[10px]">{log.ipAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Severità</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                            log.severity === 'high'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : log.severity === 'medium'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}
                        >
                          {log.severity === 'high'
                            ? 'Alta'
                            : log.severity === 'medium'
                              ? 'Media'
                              : 'Bassa'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
