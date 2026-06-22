'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
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
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface TableItem {
  number: number;
  isActive: boolean;
}

export default function RistoratoreTavoliPage() {
  const { user, isLoading } = useAuth();
  const restaurantId = user?.restaurantId;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Table configuration states
  const [tableCount, setTableCount] = useState(0);
  const [tempTableCount, setTempTableCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restaurantLogo, setRestaurantLogo] = useState<string>('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [tableOrdersTodayCount, setTableOrdersTodayCount] = useState(0);

  const [copiedVetrina, setCopiedVetrina] = useState(false);
  const [copiedGenerico, setCopiedGenerico] = useState(false);

  const origin =
    isHydrated && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://igodelivering.it';
  const showcaseUrl = `${origin}/menu/${restaurantSlug}`;
  const genericTableUrl = `${origin}/menu/${restaurantSlug}?tavolo=generico`;

  const handleCopyVetrina = () => {
    navigator.clipboard.writeText(showcaseUrl);
    setCopiedVetrina(true);
    setTimeout(() => setCopiedVetrina(false), 2000);
  };

  const handleCopyGenerico = () => {
    navigator.clipboard.writeText(genericTableUrl);
    setCopiedGenerico(true);
    setTimeout(() => setCopiedGenerico(false), 2000);
  };

  const handleDownloadVetrina = () => {
    const canvas = document.getElementById('vetrina-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-vetrina-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.error('Canvas export failed', e);
      }
    }
  };

  const handleDownloadGenerico = () => {
    const canvas = document.getElementById('generico-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-tavolo-generico-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.error('Canvas export failed', e);
      }
    }
  };

  const handlePrintVetrina = () => {
    const canvas = document.getElementById('vetrina-qr-canvas') as HTMLCanvasElement;
    let qrDataUrl = '';
    if (canvas) {
      try {
        qrDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        /* ignore */
      }
    }
    if (!qrDataUrl) {
      qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(showcaseUrl)}&ecc=H`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'Il mio Ristorante';
    const logoHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${restName}</div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code - Vetrina ${restName}</title>
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
            .title-badge {
              background-color: #f97316;
              color: white;
              font-size: 14px;
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
              .card { border: 1px solid #cbd5e1 !important; }
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
              <div class="title-badge">MENU DIGITALE</div>
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

  const handlePrintGenerico = () => {
    const canvas = document.getElementById('generico-qr-canvas') as HTMLCanvasElement;
    let qrDataUrl = '';
    if (canvas) {
      try {
        qrDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        /* ignore */
      }
    }
    if (!qrDataUrl) {
      qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(genericTableUrl)}&ecc=H`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = user?.restaurantName || 'Il mio Ristorante';
    const logoHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${restName}</div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code - Tavolo Generico ${restName}</title>
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
              .card { border: 1px solid #cbd5e1 !important; }
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
              <div class="table-badge">TAVOLO</div>
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

  useEffect(() => {
    setIsHydrated(true);

    // Restore sidebar state
    const storedSidebar = localStorage.getItem('iGO_sidebar_collapsed');
    if (storedSidebar !== null) {
      setSidebarCollapsed(JSON.parse(storedSidebar));
    }
  }, []);

  useEffect(() => {
    if (user?.restaurantName) {
      setRestaurantSlug(
        user.restaurantName
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, '')
      );
    }
  }, [user?.restaurantName]);

  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') {
      setLoading(false);
      return;
    }

    async function loadTableCount() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('restaurants')
          .select('tables_count, logo_url, slug')
          .eq('id', restaurantId)
          .single();

        if (error) throw error;

        if (data) {
          const count = data.tables_count || 0;
          setTableCount(count);
          setTempTableCount(count);
          setSavedCount(count);
          if (data.logo_url) {
            setRestaurantLogo(data.logo_url);
          }
          if (data.slug) {
            setRestaurantSlug(data.slug);
          }
        }
      } catch (e) {
        console.error('Error loading table count:', e);
      } finally {
        setLoading(false);
      }
    }

    loadTableCount();
  }, [restaurantId]);

  // Fetch table orders count for today
  useEffect(() => {
    if (!restaurantId || restaurantId === 'r-001') return;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('type', 'tavolo')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .then(({ count }) => {
        setTableOrdersTodayCount(count || 0);
      });
  }, [restaurantId]);

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

  const handleSaveCount = async () => {
    if (!restaurantId || restaurantId === 'r-001') return;

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ tables_count: tempTableCount })
        .eq('id', restaurantId);

      if (error) throw error;

      setTableCount(tempTableCount);
      setSavedCount(tempTableCount);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Error saving table count:', e);
      alert('Impossibile salvare il numero di tavoli.');
    }
  };

  const getTableUrl = (num: number) => {
    const origin =
      isHydrated && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://igodelivering.it';
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
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-tavolo-${num}-${restaurantSlug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      } catch (e) {
        console.error('Canvas export failed', e);
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
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        /* ignore */
      }
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
            {isLoading || loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Caricamento tavoli in corso...</p>
              </div>
            ) : !restaurantId || restaurantId === 'r-001' ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Store size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Nessun Ristorante Collegato</h2>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                  Il tuo account non è ancora collegato a un ristorante attivo. Contatta l'amministratore per completare la configurazione e l'attivazione del tuo profilo.
                </p>
              </div>
            ) : (
              <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <QrCode className="text-primary" size={24} />
                  QR Code Tavoli
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Configura i tuoi tavoli e stampa i QR Code segnatavolo per le ordinazioni digitali
                  interne.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrintAll}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-primary-hover transition-all duration-150 active:scale-95 shadow-sm w-full sm:w-auto"
                >
                  <Printer size={14} />
                  Stampa Tutti i QR
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Tavoli Configurati
                </p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{tableCount}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Ordini al Tavolo Oggi
                </p>
                <p className="text-2xl font-bold text-[var(--success)] mt-1 tabular-nums">{tableOrdersTodayCount}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Scansioni Totali Oggi
                </p>
                <p className="text-2xl font-bold text-primary mt-1 tabular-nums">0</p>
              </div>
            </div>

            {/* Vetrina & Generic Table QR Code Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Link & QR Code Vetrina */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <LinkIcon size={16} className="text-primary" />
                  Link & QR Code Vetrina
                </h3>

                <p className="text-xs text-muted-foreground">
                  Condividi il link della tua vetrina digitale o scarica il QR Code da stampare per
                  asporto e consegne.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Link Vetrina Pubblica
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={showcaseUrl}
                        className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-xl focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyVetrina}
                        className="px-3 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedVetrina ? (
                          <CheckCircle size={14} className="text-[var(--success)]" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedVetrina ? 'Copiato' : 'Copia'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-xl border border-border/60 relative min-h-[148px]">
                    <QRCodeCanvas
                      id="vetrina-qr-canvas"
                      value={showcaseUrl}
                      size={512}
                      level="H"
                      includeMargin={true}
                      style={{ width: '120px', height: '120px' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadVetrina}
                      className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      <Download size={12} className="text-muted-foreground" />
                      Scarica QR
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintVetrina}
                      className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      <Printer size={12} className="text-muted-foreground" />
                      Stampa QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Link & QR Code Tavolo Generico */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
                  <LinkIcon size={16} className="text-primary" />
                  Link & QR Code Tavolo Generico
                </h3>

                <p className="text-xs text-muted-foreground">
                  Usa this link per far ordinare i clienti da un tavolo qualsiasi. Dovranno
                  inserire manualmente il numero del tavolo.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Link Tavolo Generico
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={genericTableUrl}
                        className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-xl focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyGenerico}
                        className="px-3 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedGenerico ? (
                          <CheckCircle size={14} className="text-[var(--success)]" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedGenerico ? 'Copiato' : 'Copia'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-xl border border-border/60 relative min-h-[148px]">
                    <QRCodeCanvas
                      id="generico-qr-canvas"
                      value={genericTableUrl}
                      size={512}
                      level="H"
                      includeMargin={true}
                      style={{ width: '120px', height: '120px' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadGenerico}
                      className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      <Download size={12} className="text-muted-foreground" />
                      Scarica QR
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintGenerico}
                      className="flex items-center justify-center gap-1 py-2 px-2 bg-secondary text-foreground hover:bg-muted rounded-lg text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      <Printer size={12} className="text-muted-foreground" />
                      Stampa QR
                    </button>
                  </div>
                </div>
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
                  <p className="text-[10px] text-muted-foreground">
                    Imposta il numero di tavoli attivi nel locale
                  </p>
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
                          <p
                            className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]"
                            title={getTableUrl(num)}
                          >
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
                            style={{ width: '132px', height: '132px' }}
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
