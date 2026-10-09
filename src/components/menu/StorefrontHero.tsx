'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bike, Clock, Globe, MapPin, MessageCircle, Navigation, Phone, X } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { FacebookIcon, InstagramIcon } from '@/components/ui/BrandIcons';
import { useLenisRef } from '@/components/layout/LenisProvider';
import { mapsHref, safeHttpsHref, telHref, whatsappHref } from '@/lib/contacts';

/**
 * Testata della vetrina: immagine, nome, descrizione e i riquadri con stato,
 * orari, indirizzo e consegna.
 *
 * Per non appesantirla su telefono i contatti non sono una fila di pulsanti: un
 * solo pulsante "Contatti" (in alto a destra sul telefono, accanto ai riquadri
 * sui schermi larghi) apre un foglio con Chiama, WhatsApp, Indicazioni,
 * Instagram, Facebook e Sito web, solo quelli compilati. Il riquadro
 * dell'indirizzo è già di per sé un collegamento alle indicazioni.
 */

export interface HeroContacts {
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
}

export interface StorefrontHeroProps {
  name: string;
  tagline: string;
  image: string;
  imageAlt?: string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
  deliveryFee: number;
  deliveryLabel: string;
  lang: 'it' | 'en';
  contacts: HeroContacts;
  /** Riquadri di stato e orari di oggi: assenti nell'anteprima del profilo. */
  status?: { label: string; color: string };
  hoursText?: string | null;
}

// Le classi sono scritte per intero (non composte): Tailwind le trova solo così.
const c = {
  root: 'min-h-[clamp(15rem,42dvh,20rem)] sm:min-h-[26rem] md:min-h-[30rem]',
  pad: 'pt-14 pb-6 sm:pt-20 sm:pb-8 px-4 sm:px-6 lg:px-10',
  row: 'flex-col sm:flex-row items-start sm:items-center gap-5 lg:gap-8',
  h1: 'text-[clamp(1.5rem,1rem+2.6vw,3.25rem)]',
  p: 'text-[clamp(0.8125rem,0.75rem+0.3vw,1rem)]',
  pills: 'gap-x-3 sm:gap-x-5 text-xs sm:text-sm',
  pillText: 'text-[11px] sm:text-xs',
  topButton: 'absolute right-3 top-3 z-20 inline-flex h-10 sm:hidden',
  sideButton: 'hidden sm:inline-flex h-11 flex-shrink-0',
} as const;

const L = {
  it: {
    contacts: 'Contatti',
    call: 'Chiama',
    whatsapp: 'WhatsApp',
    directions: 'Indicazioni',
    instagram: 'Instagram',
    facebook: 'Facebook',
    website: 'Sito web',
    close: 'Chiudi',
    openMaps: 'Apri le indicazioni stradali',
  },
  en: {
    contacts: 'Contact',
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Directions',
    instagram: 'Instagram',
    facebook: 'Facebook',
    website: 'Website',
    close: 'Close',
    openMaps: 'Open directions',
  },
} as const;

interface ContactRow {
  key: string;
  label: string;
  value: string;
  href: string;
  external: boolean;
  icon: React.ReactNode;
}

/** Il handle da mostrare accanto a un profilo social (instagram.com/xyz -> @xyz). */
const handleOf = (url: string) => {
  try {
    const first = new URL(url).pathname.split('/').filter(Boolean)[0];
    return first ? `@${first}` : url;
  } catch {
    return url;
  }
};

/** +393331234567 -> +39 333 1234567 (solo per i numeri italiani, gli altri restano com'è). */
const formatWhatsapp = (digits: string) =>
  /^39\d{9,10}$/.test(digits) ? `+39 ${digits.slice(2, 5)} ${digits.slice(5)}` : `+${digits}`;

/** Indirizzo e città, senza ripetere la città se è già nell'indirizzo. */
const addressLine = (address?: string, city?: string) => {
  const a = (address || '').trim();
  const c = (city || '').trim();
  return c && !a.toLowerCase().includes(c.toLowerCase()) ? [a, c].filter(Boolean).join(', ') : a;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

function useRows(props: StorefrontHeroProps): ContactRow[] {
  const t = L[props.lang];
  const rows: ContactRow[] = [];
  const phone = (props.contacts.phone || '').trim();
  const tel = phone ? telHref(phone) : null;
  if (tel) {
    rows.push({ key: 'call', label: t.call, value: phone, href: tel, external: false, icon: <Phone size={18} /> });
  }
  const wa = props.contacts.whatsapp ? whatsappHref(props.contacts.whatsapp) : null;
  if (wa) {
    rows.push({
      key: 'wa',
      label: t.whatsapp,
      value: formatWhatsapp(props.contacts.whatsapp || ''),
      href: wa,
      external: true,
      icon: <MessageCircle size={18} />,
    });
  }
  const maps = mapsHref(props);
  if (maps) {
    rows.push({
      key: 'maps',
      label: t.directions,
      value: addressLine(props.address, props.city),
      href: maps,
      external: true,
      icon: <Navigation size={18} />,
    });
  }
  const ig = safeHttpsHref(props.contacts.instagram);
  if (ig) rows.push({ key: 'ig', label: t.instagram, value: handleOf(ig), href: ig, external: true, icon: <InstagramIcon size={18} /> });
  const fb = safeHttpsHref(props.contacts.facebook);
  if (fb) rows.push({ key: 'fb', label: t.facebook, value: handleOf(fb), href: fb, external: true, icon: <FacebookIcon size={18} /> });
  const web = safeHttpsHref(props.contacts.website);
  if (web) rows.push({ key: 'web', label: t.website, value: hostOf(web), href: web, external: true, icon: <Globe size={18} /> });
  return rows;
}

function ContactsSheet({ rows, lang, onClose }: { rows: ContactRow[]; lang: 'it' | 'en'; onClose: () => void }) {
  const t = L[lang];
  const lenisRef = useLenisRef();

  // Pagina ferma mentre il foglio è aperto; Esc lo chiude.
  useEffect(() => {
    lenisRef.current?.stop();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      lenisRef.current?.start();
      document.removeEventListener('keydown', onKey);
    };
  }, [lenisRef, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.contacts}
    >
      <div
        data-lenis-prevent
        className="w-full max-w-md max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl pb-[env(safe-area-inset-bottom)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
          <h3 className="text-base font-extrabold text-foreground">{t.contacts}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="p-2">
          {rows.map((r) => (
            <li key={r.key}>
              <a
                href={r.href}
                {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 text-foreground hover:bg-muted/60 active:bg-muted"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">{r.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export default function StorefrontHero(props: StorefrontHeroProps) {
  const { name, tagline, image, imageAlt, address, deliveryFee, deliveryLabel, lang, status, hoursText } = props;
    const t = L[lang];
  const [open, setOpen] = useState(false);
  const rows = useRows(props);
  const maps = mapsHref(props);

  // Il pulsante serve se c'è almeno un contatto oltre alle indicazioni: l'indirizzo è già
  // di per sé un collegamento alla mappa, e un "Contatti" con la sola mappa sarebbe rumore.
  const hasContacts = rows.some((r) => r.key !== 'maps');
  const contactsButton = (cls: string) =>
    hasContacts ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3.5 text-xs font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/25 active:scale-95 ${cls}`}
      >
        <Phone size={14} />
        {t.contacts}
      </button>
    ) : null;

  const addressPill = (
    <>
      <MapPin size={14} className="flex-shrink-0" />
      <span className="min-w-0 break-words">{address ?? ''}</span>
    </>
  );

  return (
    <div className={`relative ${c.root} h-auto flex flex-col justify-end overflow-hidden`}>
      <AppImage
        src={image || ''}
        alt={imageAlt || ''}
        fill
        sizes="100vw"
        priority
        unoptimized={image.startsWith('blob:')}
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      {/* Telefono: un solo pulsante in alto a destra, nessuna fila in più nella testata. */}
      {contactsButton(c.topButton)}

      <div className={`relative ${c.pad} text-white z-10 w-full`}>
        <div className={`max-w-screen-2xl mx-auto flex ${c.row}`}>
          <div className="flex-1 min-w-0">
            <h1 className={`${c.h1} font-black tracking-tight text-white mb-2.5 leading-tight drop-shadow-sm`}>
              {name}
            </h1>
            <p className={`text-white/90 ${c.p} font-medium mb-4 max-w-3xl leading-relaxed drop-shadow-xs`}>
              {tagline}
            </p>

            <div className={`flex flex-wrap items-center gap-y-2.5 ${c.pills} font-semibold text-white/95`}>
              {(status || hoursText) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {status && (
                    <span
                      className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg font-black tracking-wide ${c.pillText} ${status.color}`}
                    >
                      {status.label}
                    </span>
                  )}
                  {hoursText && (
                    <span className={`flex items-center gap-1.5 border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg font-black tracking-wide ${c.pillText} text-white`}>
                      <Clock size={11} className="text-white/70" />
                      <span>{hoursText}</span>
                    </span>
                  )}
                </div>
              )}
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.openMaps}: ${address ?? ''}`}
                  className="flex max-w-full items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
                >
                  {addressPill}
                </a>
              ) : (
                <span className="flex max-w-full items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  {addressPill}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                <Bike size={14} />
                {deliveryLabel} € {(deliveryFee ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
          {/* Schermi larghi: il pulsante sta a destra, in linea con la testata. */}
          {contactsButton(c.sideButton)}
        </div>
      </div>

      {open && <ContactsSheet rows={rows} lang={lang} onClose={() => setOpen(false)} />}
    </div>
  );
}
