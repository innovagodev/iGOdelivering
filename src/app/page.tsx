'use client';
import React from 'react';
import Link from 'next/link';
import {
  ChefHat,
  ShoppingCart,
  CalendarCheck,
  Bike,
  Sparkles,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  Star,
  Mail,
  Phone,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Footer from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary scroll-smooth">
      {/* ─── Top Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-md transition-all duration-300">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo only - highlighted in dark tone for visibility, no text, no background block */}
          <Link href="/" className="transition-opacity hover:opacity-90">
            <div className="flex items-center">
              <AppLogo size={120} />
            </div>
          </Link>

          {/* Single Accedi button, only in header */}
          <div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-hover transition-all hover:shadow-lg active:scale-95 duration-150"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-secondary/40 via-background to-background">
        {/* Decorative ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Hero Left */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 max-w-3xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-orange-200 text-xs font-bold text-primary">
              <Sparkles size={14} />
              <span>La tecnologia per il Food Delivery Indipendente</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
              Crea il tuo canale di{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                vendita diretto
              </span>
              . Zero commissioni.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Fornisci ai tuoi clienti un&apos;esperienza d&apos;ordine premium per asporto,
              domicilio o prenotazione tavolo direttamente dal tuo link o QR Code. Trattieni il 100%
              del valore dei tuoi piatti senza dipendere dai grandi aggregatori.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                href="#contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-primary-hover transition-all duration-150 active:scale-95 shadow-md hover:shadow-xl hover:shadow-primary/10 text-base"
              >
                Richiedi Informazioni <ArrowRight size={18} />
              </a>

              <Link
                href="/menu/pizzeria-bella-napoli"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-card hover:bg-muted text-foreground border border-border font-bold px-8 py-4 rounded-xl transition-all duration-150 active:scale-95 text-base"
              >
                Prova la Demo Cliente 🍕
              </Link>
            </div>

            {/* Quick stats */}
            <div className="pt-8 border-t border-border grid grid-cols-3 gap-6 text-center lg:text-left">
              <div>
                <p className="text-3xl font-extrabold text-primary">0%</p>
                <p className="text-xs text-muted-foreground mt-1">Commissioni sugli ordini</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-foreground">3 Click</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo medio di checkout</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground mt-1">Controllo dei tuoi dati</p>
              </div>
            </div>
          </div>

          {/* Hero Right: Illustration Preview */}
          <div className="lg:col-span-5 relative w-full aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-card group">
            <AppImage
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5"
              alt="Tablet con ordinazione digitale di una pizza in corso"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover group-hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <Star size={16} className="fill-amber-400 text-amber-400" />
              </div>
              <p className="text-lg font-bold italic leading-snug">
                &ldquo;Con iGOdelivering abbiamo tagliato i costi di commissione e fidelizzato i
                nostri clienti storici tramite social.&rdquo;
              </p>
              <p className="text-sm font-semibold opacity-80 mt-2">
                — Pizzeria Bella Napoli, Milano
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ───────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28 bg-card border-y border-border">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-primary">
              Le Funzionalità Chiave
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Tutto quello di cui hai bisogno per far crescere la tua attività
            </p>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Abbiamo sviluppato una piattaforma modulare che mette a disposizione dei ristoratori
              strumenti avanzati per competere al meglio nel mercato del food delivery moderno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <ChefHat size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Menu Digitale Intelligente</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Modifica piatti, categorie e prezzi in tempo reale dal tuo pannello. Gestisci
                allergeni, varianti di ingredienti e sospendi temporaneamente i prodotti terminati
                al volo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <ShoppingCart size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Guest Checkout Rapido</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nessuna registrazione obbligatoria per effettuare ordini. Riduzione drastica
                dell&apos;attrito all&apos;acquisto e persistenza intelligente nel browser per gli
                ordini futuri.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Bike size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Consegne Domicilio & Asporto</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Definisci le tue zone di consegna con precisione, impostando tariffe e importo
                minimo d&apos;ordine flessibili basati sulla distanza chilometrica o CAP.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Prenotazione Tavoli</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Integra un sistema semplice ed intuitivo per ricevere prenotazioni di coperti
                direttamente sul portale, massimizzando il riempimento del locale.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Esperienza PWA Mobile</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La tua vetrina cliente è ottimizzata al 100% per smartphone e tablet, ed è
                predisposta per essere installata come applicazione sulla schermata home.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl border border-border bg-background hover:shadow-card-hover transition-all duration-300 group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Autonomia & Branding</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Condividi il tuo link univoco sui social, sul tuo sito o tramite codici QR stampati
                sui tavoli. Costruisci il tuo database clienti personale, senza filtri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Combined Demo & Contact Section ────────────────────── */}
      <section
        id="contact"
        className="py-20 lg:py-28 bg-gradient-to-b from-background to-secondary/30 relative"
      >
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
            {/* Left: Contact Info Block */}
            <div className="bg-card border border-border rounded-3xl p-8 lg:p-12 shadow-xl flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-orange-100 text-xs font-bold text-primary">
                  <span>Richiedi Attivazione</span>
                </div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                  Contatta Innovago per iniziare
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Sei pronto ad attivare il tuo portale o desideri una presentazione su misura per
                  il tuo ristorante? Contattaci direttamente per qualsiasi informazione o per
                  ricevere le tue credenziali Partner.
                </p>
              </div>

              {/* Real Contacts displayed premiumly */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/80">
                <a
                  href="mailto:info@innovago.it?subject=Richiesta%20Attivazione%20iGOdelivering"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-background hover:bg-secondary/40 border border-border hover:border-primary/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Scrivici Via E-mail
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5 break-all">
                      info@innovago.it
                    </p>
                  </div>
                </a>

                <a
                  href="tel:+390282956598"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-background hover:bg-secondary/40 border border-border hover:border-primary/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Chiamaci Ora</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">+39 02 8295 6598</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Right: Try Live Demo Block */}
            <div className="bg-card border border-border rounded-3xl p-8 lg:p-12 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-orange-100 text-xs font-bold text-primary">
                  <span>Demo Attiva</span>
                </div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                  Esplora l&apos;esperienza cliente
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Vuoi testare in prima persona il funzionamento e la velocità del nostro menu
                  digitale? Esplora la vetrina demo live creata per simulare ordinazioni e
                  prenotazioni.
                </p>
              </div>

              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-border/80">
                <AppImage
                  src="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
                  alt="Piatti demo pronti per l'ordine"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>

              <div>
                <Link
                  href="/menu/pizzeria-bella-napoli"
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-primary-hover transition-all hover:shadow-lg active:scale-95 duration-150 text-base"
                >
                  Esplora la Demo Cliente 🍕
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
