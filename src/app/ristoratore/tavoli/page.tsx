'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/context/AuthContext';
import {
  QrCode,
  Plus,
  Minus,
  Download,
  Printer,
  Grid,
  CheckCircle,
  HelpCircle,
  Store,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface TableItem {
  number: number;
  isActive: boolean;
}

export default function RistoratoreTavoliPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Table configuration states
  const [tableCount, setTableCount] = useState(0);
  const [tempTableCount, setTempTableCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restaurantLogo, setRestaurantLogo] = useState<string>('');

  // Generate restaurant slug
  const restaurantSlug = user?.restaurantName
    ? user.restaurantName
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
    : 'pizzeria-bella-napoli';

  useEffect(() => {
    setIsHydrated(true);
    
    // Restore sidebar state
    const storedSidebar = localStorage.getItem('iGO_sidebar_collapsed');
    if (storedSidebar !== null) {
      setSidebarCollapsed(JSON.parse(storedSidebar));
    }

    // Restore table count state
    const storedTables = localStorage.getItem(`iGO_tables_${restaurantSlug}`);
    if (storedTables) {
      const count = parseInt(storedTables, 10);
      if (!isNaN(count)) {
        setTableCount(count);
        setTempTableCount(count);
        setSavedCount(count);
      }
    }

    // Restore logo from settings
    const storedSettings = localStorage.getItem(`iGO_settings_${restaurantSlug}`);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        if (parsed.logoUrl) {
          setRestaurantLogo(parsed.logoUrl);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [restaurantSlug]);

  const [localLogoUrl, setLocalLogoUrl] = useState<string>('');

  useEffect(() => {
    if (restaurantLogo) {
      if (restaurantLogo.startsWith('data:')) {
        setLocalLogoUrl(restaurantLogo);
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              setLocalLogoUrl(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error('CORS issue with logo', e);
            }
          }
        };
        img.src = restaurantLogo;
      }
    } else {
      setLocalLogoUrl('');
    }
  }, [restaurantLogo]);

  const handleSaveCount = () => {
    setTableCount(tempTableCount);
    setSavedCount(tempTableCount);
    localStorage.setItem(`iGO_tables_${restaurantSlug}`, tempTableCount.toString());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getTableUrl = (num: number) => {
    const origin = isHydrated && typeof window !== 'undefined' ? window.location.origin : 'https://igodelivering.it';
    return `${origin}/menu/${restaurantSlug}?tavolo=${num}`;
  };

  const getQrCodeUrl = (num: number) => {
    const tableUrl = getTableUrl(num);
    return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(tableUrl)}&ecc=H`;
  };

  const handleDownload = (num: number) => {
    const canvas = document.getElementById(`qr-canvas-${num}`) as HTMLCanvasElement;
    if (canvas) {
      try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-tavolo-${num}-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      } catch (e) {
        console.error("Canvas export failed", e);
      }
    }

    const qrUrl = getQrCodeUrl(num);
    fetch(qrUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-tavolo-${num}-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(qrUrl, '_blank');
      });
  };

  const getCanvasDataUrl = (num: number) => {
    const canvas = document.getElementById(`qr-canvas-${num}`) as HTMLCanvasElement;
    if (canvas) {
      try { return canvas.toDataURL("image/png"); } catch(e) {}
    }
    return getQrCodeUrl(num);
  };

  const handlePrintSingle = (num: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrDataUrl = getCanvasDataUrl(num);
    const restName = user?.restaurantName || 'Il mio Ristorante';
    const logoHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${restName}</div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code - Tavolo ${num}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fff;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              width: 280px;
              height: 280px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              box-sizing: border-box;
              box-shadow: none;
            }
            .qr-wrapper {
              position: relative;
              display: inline-block;
              width: 170px;
              height: 170px;
              margin: 0 auto;
            }
            .qr-image {
              width: 170px;
              height: 170px;
              display: block;
            }
            .table-badge {
              background-color: #f97316;
              color: white;
              font-size: 15px;
              font-weight: 800;
              padding: 4px 14px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              display: inline-block;
            }
            .footer-text {
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @media print {
              body { height: auto; }
              @page { size: portrait; margin: 0; }
              .card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoHtml}
            <div class="qr-wrapper">
              <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div>
              <div class="table-badge">TAVOLO ${num}</div>
              <div class="footer-text" style="margin-top: 6px;">Inquadra e Ordina</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'Il mio Ristorante';
    const logoHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${restName}</div>
      </div>
    `;

    let cardsHtml = '';
    for (let i = 1; i <= tableCount; i++) {
      const qrDataUrl = getCanvasDataUrl(i);
      cardsHtml += `
        <div class="card">
          ${logoHtml}
          <div class="qr-wrapper">
            <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
          </div>
          <div>
            <div class="table-badge">TAVOLO ${i}</div>
            <div class="footer-text" style="margin-top: 4px;">Inquadra e Ordina</div>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code - Tutti i Tavoli</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
              padding: 24px;
              box-sizing: border-box;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              width: 250px;
              height: 250px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              box-sizing: border-box;
              page-break-inside: avoid;
              break-inside: avoid;
              margin: 0 auto;
              box-shadow: none;
            }
            .qr-wrapper {
              position: relative;
              display: inline-block;
              width: 155px;
              height: 155px;
              margin: 0 auto;
            }
            .qr-image {
              width: 155px;
              height: 155px;
              display: block;
            }
            .table-badge {
              background-color: #f97316;
              color: white;
              font-size: 13px;
              font-weight: 800;
              padding: 3px 12px;
              border-radius: 9999px;
              letter-spacing: 0.05em;
              display: inline-block;
            }
            .footer-text {
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body { padding: 0; display: block; }
              .grid { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                grid-template-rows: repeat(2, auto);
                gap: 20px; 
                padding: 0;
              }
              .card { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeSection="nav-tavoli"
        onSectionChange={() => {}}
        role="ristoratore"
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar
          role="ristoratore"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          leftContent={
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base truncate">
                {user?.restaurantName || 'Ristorante'}
              </span>
              <span className="text-muted-foreground text-sm">/ QR Code Tavoli</span>
            </div>
          }
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <QrCode className="text-primary" size={24} />
                  QR Code Tavoli
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Configura i tuoi tavoli e stampa i QR Code segnatavolo per le ordinazioni digitali interne.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrintAll}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-sm w-full sm:w-auto"
                >
                  <Printer size={14} />
                  Stampa Tutti i QR
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tavoli Configurati</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {tableCount}
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ordini al Tavolo Oggi</p>
                <p className="text-2xl font-bold text-[var(--success)] mt-1 tabular-nums">
                  0
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Scansioni Totali Oggi</p>
                <p className="text-2xl font-bold text-primary mt-1 tabular-nums">
                  0
                </p>
              </div>
            </div>

            {/* Configuration Widget - Slim & Minimal */}
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg text-primary">
                  <Store size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Configurazione Sala</p>
                  <p className="text-[10px] text-muted-foreground">Imposta il numero di tavoli attivi nel locale</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center border border-border rounded-lg bg-muted overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTempTableCount((c) => Math.max(0, c - 1))}
                    className="p-2 hover:bg-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={tempTableCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setTempTableCount(Math.min(150, Math.max(0, val)));
                    }}
                    className="w-12 text-center text-sm font-bold bg-transparent border-0 focus:ring-0 focus:outline-none p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setTempTableCount((c) => Math.min(150, c + 1))}
                    className="p-2 hover:bg-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCount}
                    className="px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Salva
                  </button>
                  {saveSuccess && (
                    <span className="flex items-center gap-0.5 text-xs text-[var(--success)] font-semibold animate-fade-in">
                      <CheckCircle size={12} />
                      Salvato!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QR Codes Grid */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Grid size={16} className="text-primary" />
                Segnatavolo Generati
              </h3>
              
              {tableCount === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-dashed border-border text-center space-y-3">
                  <div className="p-3 bg-muted rounded-full text-muted-foreground">
                    <QrCode size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Nessun tavolo configurato</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Imposta il numero di tavoli sopra per iniziare a generare i codici QR.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
                  return (
                    <div
                      key={`table-qr-${num}`}
                      className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-col items-center justify-between text-center space-y-4 group hover:border-primary/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-foreground">Tavolo {num}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={getTableUrl(num)}>
                          {getTableUrl(num)}
                        </p>
                      </div>

                      <div className="p-3 bg-muted rounded-xl border border-border/60 relative flex items-center justify-center min-h-[148px]">
                        <QRCodeCanvas
                          id={`qr-canvas-${num}`}
                          value={getTableUrl(num)}
                          size={512}
                          level="H"
                          includeMargin={true}
                          style={{ width: "132px", height: "132px" }}
                        />
                      </div>

                      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                        <button
                          onClick={() => handleDownload(num)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border"
                        >
                          <Download size={12} className="text-muted-foreground" />
                          Scarica
                        </button>
                        <button
                          onClick={() => handlePrintSingle(num)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border"
                        >
                          <Printer size={12} className="text-muted-foreground" />
                          Stampa
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
