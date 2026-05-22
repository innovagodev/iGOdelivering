'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import {
  User,
  ShoppingCart,
  Search,
  MapPin,
  Clock,
  Star,
  Plus,
  Minus,
  Trash2,
  Tag,
  Bike,
  Phone,
  X,
  CheckCircle,
  ChefHat,
  Package,
  CalendarCheck,
  Calendar,
  Edit2,
  Settings,
  ChevronDown,
  Mail,
  CreditCard,
  Banknote,
  Wallet,
  Share2,
} from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';
import { usePromoCode } from '@/hooks/usePromoCode';
import CardPaymentForm from '@/components/menu/CardPaymentForm';
import PopularSection from '@/components/menu/PopularSection';
import ProductDetailSheet from '@/components/menu/ProductDetailSheet';
import Footer from '@/components/layout/Footer';

// ─── Types ────────────────────────────────────────────────────
interface MenuItemType {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  imageAlt: string;
  popular?: boolean;
  veg?: boolean;
  spicy?: boolean;
  allergens: string[];
}

interface CartItem extends MenuItemType {
  qty: number;
  note?: string;
  cartId?: string;
  addedIngredients?: { name: string; price: number }[];
  removedIngredients?: string[];
}

interface RestaurantType {
  name: string;
  tagline: string;
  address: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  minOrder: number;
  deliveryFee: number;
  phone: string;
  image: string;
  imageAlt: string;
  logoUrl: string;
  freeDeliveryActive?: boolean;
  freeDeliveryThreshold?: number;
  paymentMethods?: { cash: boolean; card: boolean; paypal: boolean };
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
}

// ─── Dynamic Restaurant Resolver ──────────────────────────────
const getRestaurantBySlug = (slug: string): RestaurantType => {
  const normalizedSlug = (slug || '').toLowerCase();

  if (normalizedSlug === 'pizzeria-bella-napoli') {
    return {
      name: 'Pizzeria Bella Napoli',
      tagline: 'Autentica pizza napoletana dal 1987',
      address: 'Via Roma 24, Milano',
      rating: 4.8,
      reviews: 312,
      deliveryTime: '25–40 min',
      minOrder: 12,
      deliveryFee: 2.5,
      phone: '+39 02 1234567',
      image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498',
      imageAlt: 'Pizza margherita appena sfornata da forno a legna in una pizzeria napoletana',
      logoUrl: '/assets/images/logo_pizzeria.png',
      paymentMethods: { cash: true, card: true, paypal: true },
      openingHours: [{ start: '00:00', end: '23:59' }],
      deliveryHours: [{ start: '00:00', end: '23:59' }],
    };
  } else if (normalizedSlug === 'sushi-zen') {
    return {
      name: 'Sushi Zen',
      tagline: 'Tradizione e purezza giapponese',
      address: 'Corso Magenta 12, Milano',
      rating: 4.9,
      reviews: 184,
      deliveryTime: '30–50 min',
      minOrder: 20,
      deliveryFee: 3.5,
      phone: '+39 02 7654321',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
      imageAlt: 'Splendido set di sushi e sashimi assortito servito su ardesia scura',
      logoUrl: '/assets/images/logo_sushi.png',
      paymentMethods: { cash: true, card: true, paypal: false },
    };
  } else if (normalizedSlug === 'burger-house') {
    return {
      name: 'Burger House',
      tagline: 'Smash burger gourmet e birre artigianali',
      address: 'Via Torino 45, Milano',
      rating: 4.7,
      reviews: 245,
      deliveryTime: '20–35 min',
      minOrder: 10,
      deliveryFee: 2.0,
      phone: '+39 02 9876543',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      imageAlt: 'Un hamburger gourmet gigante con formaggio fuso, bacon e cipolla caramellata',
      logoUrl: '/assets/images/logo_burger.png',
      paymentMethods: { cash: true, card: true, paypal: true },
    };
  }

  // Fallback: format any custom slug nicely
  const formattedName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: formattedName || 'Ristorante Partner',
    tagline: 'Benvenuto nel nostro ordinatore digitale',
    address: 'Via Garibaldi 10, Milano',
    rating: 4.6,
    reviews: 42,
    deliveryTime: '30–45 min',
    minOrder: 15,
    deliveryFee: 2.9,
    phone: '+39 02 0000000',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    imageAlt: 'Sala interna di un ristorante moderno ed accogliente',
    logoUrl: '',
    paymentMethods: { cash: true, card: true, paypal: true },
  };
};

// ─── Mock Data ────────────────────────────────────────────────
const categories = ['Promozioni', 'Antipasti', 'Primi', 'Pizza', 'Secondi', 'Dolci', 'Bevande'];

const menuItems: MenuItemType[] = [
  {
    id: 'sf-001',
    name: 'Antipasto Misto',
    category: 'Antipasti',
    price: 12.0,
    originalPrice: 15.0,
    description:
      'Salumi selezionati DOP, formaggi stagionati, olive taggiasche, bruschette al pomodoro',
    image: 'https://images.unsplash.com/photo-1616316326562-f081d9616d6b',
    imageAlt: 'Tagliere di antipasto misto con salumi, formaggi, olive e bruschette',
    popular: true,
    veg: false,
    spicy: false,
    allergens: ['Glutine', 'Latte'],
  },
  {
    id: 'sf-002',
    name: 'Bruschette al Pomodoro',
    category: 'Antipasti',
    price: 7.5,
    description: 'Pane casereccio tostato, pomodori datterini, basilico, aglio, olio EVO',
    image: 'https://images.unsplash.com/photo-1572650699880-d5be8606c4fe',
    imageAlt: 'Bruschette tostate con pomodori freschi, basilico e olio di oliva',
    veg: true,
    spicy: false,
    allergens: ['Glutine'],
  },
  {
    id: 'sf-003',
    name: 'Carpaccio di Manzo',
    category: 'Antipasti',
    price: 14.0,
    description: 'Manzo marinato, scaglie di grana, rucola, capperi, limone',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947',
    imageAlt: 'Carpaccio di manzo con scaglie di parmigiano e rucola su piatto bianco',
    veg: false,
    spicy: false,
    allergens: ['Latte'],
  },
  {
    id: 'sf-004',
    name: 'Spaghetti alla Carbonara',
    category: 'Primi',
    price: 13.5,
    originalPrice: 16.0,
    description:
      'Spaghetti trafilati al bronzo, guanciale di Amatrice, uova fresche, pecorino romano, pepe nero',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3',
    imageAlt: 'Spaghetti alla carbonara cremosi con guanciale croccante e pecorino',
    popular: true,
    veg: false,
    spicy: false,
    allergens: ['Glutine', 'Uova', 'Latte'],
  },
  {
    id: 'sf-005',
    name: "Penne all'Arrabbiata",
    category: 'Primi',
    price: 11.0,
    description: 'Penne rigate, pomodoro San Marzano, aglio, peperoncino calabrese, basilico',
    image: 'https://images.unsplash.com/photo-1563379971899-660589a01cc3',
    imageAlt: 'Penne all arrabbiata con salsa di pomodoro piccante e basilico fresco',
    veg: true,
    spicy: true,
    allergens: ['Glutine'],
  },
  {
    id: 'sf-006',
    name: 'Lasagne al Forno',
    category: 'Primi',
    price: 14.5,
    description:
      'Sfoglie fresche, ragù di manzo e maiale, besciamella, parmigiano reggiano 24 mesi',
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
    imageAlt: 'Lasagne al forno con ragù di carne, besciamella e parmigiano gratinato',
    veg: false,
    spicy: false,
    allergens: ['Glutine', 'Uova', 'Latte'],
  },
  {
    id: 'sf-007',
    name: 'Pizza Margherita',
    category: 'Pizza',
    price: 9.5,
    originalPrice: 12.0,
    description: 'Pomodoro San Marzano DOP, mozzarella fior di latte, basilico fresco, olio EVO',
    image: 'https://images.unsplash.com/photo-1703784022146-b72677752ce5',
    imageAlt: 'Pizza Margherita napoletana con mozzarella fior di latte e basilico fresco',
    popular: true,
    veg: true,
    spicy: false,
    allergens: ['Glutine', 'Latte'],
  },
  {
    id: 'sf-008',
    name: 'Pizza Diavola',
    category: 'Pizza',
    price: 11.0,
    originalPrice: 14.0,
    description: 'Pomodoro, mozzarella, salame piccante calabrese, peperoncino fresco',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    imageAlt: 'Pizza Diavola con salame piccante e peperoncino su base pomodoro',
    popular: true,
    veg: false,
    spicy: true,
    allergens: ['Glutine', 'Latte'],
  },
  {
    id: 'sf-009',
    name: 'Pizza Quattro Stagioni',
    category: 'Pizza',
    price: 13.0,
    description: 'Carciofi, funghi, prosciutto cotto, olive, mozzarella, pomodoro',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e',
    imageAlt: 'Pizza Quattro Stagioni con ingredienti di qualità',
    veg: false,
    spicy: false,
    allergens: ['Glutine', 'Latte'],
  },
  {
    id: 'sf-010',
    name: 'Pizza Prosciutto e Funghi',
    category: 'Pizza',
    price: 12.0,
    description: 'Prosciutto cotto, champignon freschi, mozzarella, pomodoro, origano',
    image: 'https://images.unsplash.com/photo-1650455458884-4c7957a28fe4',
    imageAlt: 'Pizza con prosciutto cotto, funghi champignon e mozzarella filante',
    veg: false,
    spicy: false,
    allergens: ['Glutine', 'Latte'],
  },
  {
    id: 'sf-011',
    name: 'Tagliata di Manzo',
    category: 'Secondi',
    price: 22.0,
    description:
      'Controfiletto irlandese alla griglia, rucola, scaglie di grana, pomodorini con-fit',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947',
    imageAlt: 'Tagliata di manzo grigliata con rucola e scaglie di grana su tagliere',
    popular: true,
    veg: false,
    spicy: false,
    allergens: ['Latte'],
  },
  {
    id: 'sf-012',
    name: 'Branzino al Forno',
    category: 'Secondi',
    price: 24.0,
    description: 'Branzino intero al forno con erbe aromatiche, patate, olive, capperi',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
    imageAlt: 'Branzino al forno intero servito con erbe aromatiche e patate',
    veg: false,
    spicy: false,
    allergens: [],
  },
  {
    id: 'sf-013',
    name: 'Tiramisù Classico',
    category: 'Dolci',
    price: 6.5,
    description:
      'Ricetta tradizionale: savoiardi, mascarpone, caffè espresso, cacao amaro in polvere',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9',
    imageAlt: 'Tiramisù classico in coppetta con strati di mascarpone e cacao in polvere',
    popular: true,
    veg: true,
    spicy: false,
    allergens: ['Uova', 'Latte', 'Glutine'],
  },
  {
    id: 'sf-014',
    name: 'Panna Cotta',
    category: 'Dolci',
    price: 5.5,
    description: 'Panna cotta alla vaniglia con coulis di frutti di bosco freschi',
    image: 'https://images.unsplash.com/photo-1687418343128-20249de29a88',
    imageAlt: 'Panna cotta bianca con salsa di frutti di bosco rossi su piatto bianco',
    veg: true,
    spicy: false,
    allergens: ['Latte'],
  },
  {
    id: 'sf-015',
    name: 'Acqua Naturale 75cl',
    category: 'Bevande',
    price: 2.5,
    description: 'Acqua minerale naturale in bottiglia di vetro',
    image: 'https://images.unsplash.com/photo-1608885898957-a599fb18cd3d',
    imageAlt: 'Bottiglia di acqua minerale naturale da 75cl su sfondo bianco',
    veg: true,
    spicy: false,
    allergens: [],
  },
  {
    id: 'sf-016',
    name: 'Birra Artigianale 33cl',
    category: 'Bevande',
    price: 4.5,
    description: 'Birra artigianale ambrata locale, produzione artigianale lombarda',
    image: 'https://images.unsplash.com/photo-1692827556801-09d8ff82274a',
    imageAlt: 'Bicchiere di birra artigianale ambrata con schiuma bianca in vetro trasparente',
    veg: true,
    spicy: false,
    allergens: ['Glutine'],
  },
];

const orderSteps = [
  { id: 'step-ricevuto', label: 'Ordine Ricevuto', icon: <CheckCircle size={18} />, done: true },
  { id: 'step-confermato', label: 'Confermato', icon: <CheckCircle size={18} />, done: true },
  {
    id: 'step-preparazione',
    label: 'In Preparazione',
    icon: <ChefHat size={18} />,
    done: false,
    active: true,
  },
  { id: 'step-consegna', label: 'In Consegna', icon: <Bike size={18} />, done: false },
  { id: 'step-consegnato', label: 'Consegnato', icon: <Package size={18} />, done: false },
];

// ─── Sub-components ────────────────────────────────────────────
function CartSidebar({
  cart,
  onAdd,
  onRemove,
  onDelete,
  onEdit,
  onCheckout,
  promoCode,
  onPromoChange,
  promoApplied,
  onApplyPromo,
  restaurant,
  showClose = false,
  onClose,
  deliveryType,
  minOrder,
  deliveryFee,
  freeDeliveryActive,
  freeDeliveryThreshold,
  actualDeliveryFee,
  onClear,
  tableNumber,
  guests,
  setGuests,
  discount = 0,
  appliedPromoDetail,
}: {
  cart: CartItem[];
  onAdd: (item: MenuItemType) => void;
  onRemove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: CartItem) => void;
  onCheckout: () => void;
  promoCode: string;
  onPromoChange: (v: string) => void;
  promoApplied: boolean;
  onApplyPromo: () => void;
  restaurant: RestaurantType;
  showClose?: boolean;
  onClose?: () => void;
  deliveryType: 'domicilio' | 'asporto' | 'tavolo';
  minOrder: number;
  deliveryFee: number;
  freeDeliveryActive: boolean;
  freeDeliveryThreshold: number;
  actualDeliveryFee: number;
  onClear?: () => void;
  tableNumber?: string | null;
  guests?: number;
  setGuests?: (v: number) => void;
  discount?: number;
  appliedPromoDetail?: any;
}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal - discount + (deliveryType === 'domicilio' ? actualDeliveryFee : 0);
  const meetsMin = subtotal >= minOrder;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">Il tuo ordine</h3>
          <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1">
            {cart.reduce((s, i) => s + i.qty, 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] font-black text-muted-foreground hover:text-red-500 uppercase tracking-wide px-2.5 py-1.5 rounded-xl hover:bg-red-50/60 transition-all duration-150 active:scale-95 border border-transparent hover:border-red-100"
            >
              Svuota
            </button>
          )}
          {showClose && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-muted/65 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Table info */}
      {cart.length > 0 && deliveryType === 'tavolo' && (
        <div className="px-5 py-3 border-b border-border/40 bg-primary/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold">
            <MapPin size={16} />
            <span>Tavolo {tableNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Ospiti:</label>
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setGuests?.(Math.max(1, (guests || 1) - 1))}
                className="w-6 h-6 flex items-center justify-center bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors"
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-bold">{guests || 1}</span>
              <button
                onClick={() => setGuests?.((guests || 1) + 1)}
                className="w-6 h-6 flex items-center justify-center bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <ShoppingCart size={40} className="text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground text-sm">Il carrello è vuoto</p>
          <p className="text-xs text-muted-foreground mt-1">
            Aggiungi prodotti dal menu per iniziare il tuo ordine
          </p>
        </div>
      ) : (
        <>
          <ul className="flex-1 overflow-y-auto py-3 px-4 space-y-3 scrollbar-hide">
            {cart.map((item) => (
              <li
                key={`cart-${item.cartId || item.id}`}
                className="flex items-start gap-3 border-b border-border/10 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">
                      {item.name}
                    </p>
                    <button
                      onClick={() => onEdit(item)}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                      title="Modifica ingredienti"
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>
                  {((item.addedIngredients && item.addedIngredients.length > 0) ||
                    (item.removedIngredients && item.removedIngredients.length > 0) ||
                    item.note) && (
                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 bg-muted/40 p-2 rounded-lg border border-border/30">
                      {item.addedIngredients?.map((ext) => (
                        <div
                          key={ext.name}
                          className="text-primary font-semibold flex justify-between"
                        >
                          <span>+ {ext.name}</span>
                          <span className="text-[9px] text-muted-foreground font-normal">
                            € {ext.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {item.removedIngredients?.map((rem) => (
                        <div key={rem} className="text-red-500 font-semibold flex justify-between">
                          <span>- Senza {rem}</span>
                          <span className="text-[9px] text-red-400 font-normal">Rimosso</span>
                        </div>
                      ))}
                      {item.note && (
                        <div className="italic text-muted-foreground pt-1 border-t border-border/20 mt-1">
                          Note: &quot;{item.note}&quot;
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs font-bold text-foreground mt-1 tabular-nums">
                    € {(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onRemove(item.cartId || item.id)}
                    className="w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => onAdd(item)}
                    className="w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(item.cartId || item.id)}
                    className="w-6 h-6 rounded-full hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] flex items-center justify-center transition-colors ml-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-border space-y-3 flex-shrink-0 bg-card">
            {/* Dynamic Free Delivery Progress Bar */}
            {deliveryType !== 'tavolo' && freeDeliveryActive && (
              <div className="bg-muted/30 border border-border/40 rounded-xl p-2.5 space-y-1">
                {subtotal < freeDeliveryThreshold ? (
                  <>
                    <p className="text-[10px] font-bold text-muted-foreground flex justify-between">
                      <span>
                        Ti mancano{' '}
                        <strong>€ {(freeDeliveryThreshold - subtotal).toFixed(2)}</strong> per la
                        consegna gratuita!
                      </span>
                      <span className="text-primary font-extrabold">
                        {Math.round((subtotal / freeDeliveryThreshold) * 100)}%
                      </span>
                    </p>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] font-extrabold text-[var(--success)] flex items-center gap-1">
                    🎉 Consegna gratuita raggiunta!
                  </p>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              {promoApplied && appliedPromoDetail && (
                <div className="flex justify-between text-[var(--success)]">
                  <span>
                    Sconto (
                    {appliedPromoDetail.type === 'percentage'
                      ? `${appliedPromoDetail.value}%`
                      : `€${appliedPromoDetail.value.toFixed(2)}`}
                    )
                  </span>
                  <span className="tabular-nums font-semibold">−€ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-foreground text-sm pt-0.5">
                <span>Prezzo</span>
                <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
              </div>
            </div>

            {!meetsMin && (
              <p className="text-[10px] text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-2.5 py-1.5 leading-snug">
                Ordine minimo € {minOrder.toFixed(2)} — aggiungi ancora €{' '}
                {(minOrder - subtotal).toFixed(2)}
              </p>
            )}

            <button
              onClick={onCheckout}
              disabled={!meetsMin}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 text-xs shadow-md shadow-primary/10"
            >
              {deliveryType === 'tavolo' ? 'Invia ordine' : 'Procedi'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItemCard({
  item,
  cart,
  onAdd,
  onCustomize,
  onRemove,
  compact = false,
}: {
  item: MenuItemType;
  cart: CartItem[];
  onAdd: (item: MenuItemType) => void;
  onCustomize: (item: MenuItemType) => void;
  onRemove: (cartId: string) => void;
  compact?: boolean;
}) {
  // Trova se c'è un elemento di base (senza personalizzazioni) nel carrello
  const defaultCartItem = cart.find(
    (c) =>
      c.id === item.id &&
      (!c.addedIngredients || c.addedIngredients.length === 0) &&
      (!c.removedIngredients || c.removedIngredients.length === 0) &&
      !c.note
  );

  const defaultQty = defaultCartItem ? defaultCartItem.qty : 0;
  const totalQty = cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.qty, 0);

  return (
    <div
      onClick={() => onCustomize(item)}
      className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col justify-between relative"
    >
      {totalQty > 0 && (
        <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10 animate-pop">
          {totalQty}
        </div>
      )}
      <div>
        <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-40'}`}>
          <AppImage
            src={item.image}
            alt={item.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10">
            {item.popular && (
              <Badge
                variant="primary"
                className={`shadow-sm font-bold bg-amber-500 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}
              >
                ⭐ POPOLARE
              </Badge>
            )}
            {item.veg && (
              <Badge
                variant="success"
                className={`shadow-sm font-bold bg-green-600 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}
              >
                🌿 VEG
              </Badge>
            )}
            {item.spicy && (
              <Badge
                variant="danger"
                className={`shadow-sm font-bold bg-red-600 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}
              >
                🌶️ SPICY
              </Badge>
            )}
          </div>
        </div>
        <div className={`${compact ? 'p-3 pb-1' : 'p-4'} flex-1`}>
          <h4
            className={`font-bold text-foreground mb-1 group-hover:text-primary transition-colors ${compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-base'}`}
          >
            {item.name}
          </h4>
          <p
            className={`text-muted-foreground leading-relaxed ${compact ? 'text-[10px] mb-1.5 line-clamp-1 leading-normal' : 'text-xs mb-3 line-clamp-2'}`}
          >
            {item.description}
          </p>
          {!compact && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.allergens.map((a) => (
                <span
                  key={`${item.id}-${a}`}
                  className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full px-2 py-0.5 font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        className={`${compact ? 'px-3 pb-3 pt-0.5' : 'px-4 pb-4 pt-1'} flex items-center justify-between`}
      >
        <div className="flex flex-col">
          <span
            className={`font-extrabold text-foreground ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}
          >
            € {item.price.toFixed(2)}
          </span>
          {item.originalPrice && (
            <span
              className={`text-muted-foreground line-through decoration-red-500/50 ${compact ? 'text-[9px]' : 'text-xs'}`}
            >
              € {item.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {defaultQty > 0 ? (
          <div
            className="flex items-center gap-1 bg-muted rounded-xl p-1 shadow-sm border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() =>
                defaultCartItem && onRemove(defaultCartItem.cartId || defaultCartItem.id)
              }
              className={`${compact ? 'w-5 h-5 rounded-md' : 'w-7 h-7 rounded-lg'} bg-card hover:bg-border flex items-center justify-center transition-colors shadow-sm active:scale-90`}
            >
              <Minus size={compact ? 10 : 12} className="text-foreground" />
            </button>
            <span
              className={`w-5 text-center font-bold tabular-nums text-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}
            >
              {defaultQty}
            </span>
            <button
              onClick={() => onAdd(item)}
              className={`${compact ? 'w-5 h-5 rounded-md' : 'w-7 h-7 rounded-lg'} bg-primary text-white hover:bg-[#d43d22] flex items-center justify-center transition-colors shadow-sm active:scale-90`}
            >
              <Plus size={compact ? 10 : 12} />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item);
            }}
            className={`flex items-center bg-primary text-white hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-sm shadow-primary/10 ${compact ? 'w-7 h-7 justify-center rounded-lg p-0' : 'gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold'}`}
          >
            <Plus size={compact ? 12 : 14} />
            {!compact && <span>Aggiungi</span>}
          </button>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({
  open,
  onClose,
  cart,
  total,
  deliveryType,
  setDeliveryType,
  name,
  setName,
  address,
  setAddress,
  phone,
  setPhone,
  email,
  setEmail,
  rememberMe,
  setRememberMe,
  actualDeliveryFee,
  slug,
  tableNumber,
  paymentMethods,
  autoSubmit,
  currentTimeStr,
  openingHours,
  deliveryHours,
  promoCode,
  setPromoCode,
  promoApplied,
  applyPromo,
  promoError,
  appliedPromoDetail,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  deliveryType: 'domicilio' | 'asporto' | 'tavolo';
  setDeliveryType: (v: 'domicilio' | 'asporto' | 'tavolo') => void;
  name: string;
  setName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  actualDeliveryFee: number;
  slug: string;
  tableNumber?: string | null;
  paymentMethods?: any;
  autoSubmit?: boolean;
  currentTimeStr: string;
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoApplied: boolean;
  applyPromo: () => void;
  promoError?: string | null;
  appliedPromoDetail?: any;
}) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [notes, setNotes] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'online'>('card');
  const [loading, setLoading] = useState(false);
  const itemsTotal = total - actualDeliveryFee;
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isCardFormValid, setIsCardFormValid] = useState(false);
  const [needRest, setNeedRest] = useState<boolean | null>(null);
  const [restAmount, setRestAmount] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    setCardError(null);
  }, [payMethod]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ').slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length > 2) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`.slice(0, 5);
    }
    return clean;
  };

  const timeSlots = React.useMemo(() => {
    if (deliveryType === 'tavolo') return [];
    const activeRanges =
      deliveryType === 'domicilio' ? deliveryHours || openingHours || [] : openingHours || [];
    const slots: string[] = [];
    if (activeRanges.length === 0) return [];

    // Parse current time in minutes
    const [currH, currM] = (currentTimeStr || '00:00').split(':').map(Number);
    const currMin = currH * 60 + currM;

    // Prep/delivery buffer (in minutes): 30 mins
    const buffer = 30;
    const minTimeStart = currMin + buffer;

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const slotMin = h * 60 + m;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        const inRange = activeRanges.some((r) => timeStr >= r.start && timeStr <= r.end);

        if (inRange && slotMin >= minTimeStart) {
          slots.push(timeStr);
        }
      }
    }
    return slots;
  }, [deliveryType, openingHours, deliveryHours, currentTimeStr]);

  useEffect(() => {
    if (timeSlots.length > 0) {
      if (!deliveryTime || !timeSlots.includes(deliveryTime)) {
        setDeliveryTime(timeSlots[0]);
      }
    } else {
      setDeliveryTime('');
    }
  }, [timeSlots, deliveryTime, setDeliveryTime]);

  useEffect(() => {
    if (open && paymentMethods) {
      const isCardEnabled =
        deliveryType === 'domicilio'
          ? paymentMethods.card_delivery !== false
          : paymentMethods.card_pickup !== false;
      const isCashEnabled =
        deliveryType === 'domicilio'
          ? paymentMethods.cash_delivery !== false
          : paymentMethods.cash_pickup !== false;
      const isPaypalEnabled = paymentMethods.paypal !== false;

      if (isCardEnabled) {
        setPayMethod('card');
      } else if (isPaypalEnabled) {
        setPayMethod('online');
      } else if (isCashEnabled) {
        setPayMethod('cash');
      }
    }
  }, [open, deliveryType, paymentMethods]);

  useEffect(() => {
    if (open) {
      if (autoSubmit) {
        setStep('details'); // Reset
        handleOrder();
      } else {
        setStep('details');
        setLoading(false);
      }
    }
  }, [open, autoSubmit]);

  const handleOrder = () => {
    if (payMethod === 'card' && !isCardFormValid) {
      setCardError('I dati della carta non sono validi o sono incompleti.');
      return;
    }
    setCardError(null);

    setLoading(true);
    if (rememberMe && deliveryType !== 'tavolo') {
      try {
        const guestData = JSON.stringify({ name, phone, email, address, deliveryType });
        localStorage.setItem(`iGO_guest_${slug}`, guestData);
        localStorage.setItem('iGO_guest_info', guestData);
      } catch (err) {
        console.error('Error saving guest info:', err);
      }
    } else if (deliveryType !== 'tavolo') {
      try {
        localStorage.removeItem(`iGO_guest_${slug}`);
        localStorage.removeItem('iGO_guest_info');
      } catch (err) {
        console.error('Error removing guest info:', err);
      }
    }

    // Write order details to localStorage under iGO_orders_${restaurantId}
    try {
      const getRestaurantIdLocal = (slugStr: string): string => {
        if (slugStr.startsWith('r-')) return slugStr;
        if (slugStr === 'pizzeria-bella-napoli') return 'r-001';
        if (slugStr === 'trattoria-da-mario') return 'r-002';
        if (slugStr === 'sushi-zen') return 'r-003';
        if (slugStr === 'osteria-del-porto') return 'r-004';
        if (slugStr === 'burger-house') return 'r-005';
        try {
          const storedStr =
            localStorage.getItem('iGOdelivering_restaurants') ||
            localStorage.getItem('gloriaorder_restaurants');
          if (storedStr) {
            const restaurants = JSON.parse(storedStr);
            const slugify = (text: string) =>
              text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
                .replace(/--+/g, '-');
            const matched = restaurants.find((r: any) => slugify(r.name) === slugStr || r.id === slugStr);
            if (matched) return matched.id;
          }
        } catch (e) {
          console.error(e);
        }
        return 'r-001';
      };
      const rId = getRestaurantIdLocal(slug);
      const ordersKey = `iGO_orders_${rId}`;
      const rawOrders = localStorage.getItem(ordersKey);
      const orders = rawOrders ? JSON.parse(rawOrders) : [];
      const newOrder = {
        email: email.trim().toLowerCase(),
        total: total,
        createdAt: new Date().toISOString(),
        itemsCount: cart.reduce((s: number, i: any) => s + i.qty, 0),
        customerName: name,
      };
      orders.push(newOrder);
      localStorage.setItem(ordersKey, JSON.stringify(orders));
    } catch (err) {
      console.error('Error saving order to history:', err);
    }

    setTimeout(
      () => {
        setLoading(false);
        setStep('success');
      },
      payMethod === 'online' ? 2200 : 1500
    );
  };

  const detailsValid =
    deliveryType === 'tavolo'
      ? true
      : !!name &&
        !!phone &&
        !!email &&
        email.includes('@') &&
        !!deliveryTime &&
        (deliveryType === 'asporto' || !!address);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === 'success' ? 'Ordine Confermato' : 'Checkout'}
    >
      {step === 'details' && (
        <div className="space-y-4 relative">
          {loading && autoSubmit && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-lg">
              <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm font-bold text-primary animate-pulse">
                Invio ordine in cucina...
              </p>
            </div>
          )}
          {/* Delivery type selector */}
          {deliveryType !== 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Modalità di consegna
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('domicilio')}
                  className={`flex items-center justify-center py-2.5 rounded-lg border text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    deliveryType === 'domicilio'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                      : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                  }`}
                >
                  Consegna a domicilio
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('asporto')}
                  className={`flex items-center justify-center py-2.5 rounded-lg border text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    deliveryType === 'asporto'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                      : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                  }`}
                >
                  Asporto
                </button>
              </div>
            </div>
          )}

          {/* Table info - only for tavolo */}
          {deliveryType === 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Tavolo Numero
              </label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={tableNumber || ''}
                  readOnly
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-muted border border-border/80 rounded-lg focus:outline-none focus:ring-0 font-bold text-foreground"
                />
              </div>
            </div>
          )}

          {/* Name - hidden for tavolo */}
          {deliveryType !== 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nome e Cognome *
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Address — only for home delivery */}
          {deliveryType === 'domicilio' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Indirizzo di consegna *
              </label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Via, numero civico, città"
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Phone - hidden for tavolo */}
          {deliveryType !== 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Numero di telefono *
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39 333 000 0000"
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Email — only for home delivery and takeaway */}
          {deliveryType !== 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Indirizzo Email *
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario.rossi@email.com"
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Orario di consegna / ritiro */}
          {deliveryType !== 'tavolo' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Clock size={12} />
                Orario di {deliveryType === 'domicilio' ? 'consegna' : 'ritiro'} *
              </label>
              <div className="relative">
                <Clock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
                />
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-[240px] max-w-full pl-9 pr-8 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all appearance-none font-semibold text-foreground cursor-pointer"
                >
                  <option value="">Seleziona orario...</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown size={14} />
                </div>
              </div>
              {timeSlots.length === 0 && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Nessun orario disponibile per oggi (il locale è in chiusura).
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Note per il ristorante
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                deliveryType === 'domicilio'
                  ? 'Allergie, preferenze, istruzioni per la consegna...'
                  : deliveryType === 'tavolo'
                    ? 'Allergie, preferenze...'
                    : 'Allergie, preferenze, orario di ritiro...'
              }
              rows={2}
              className="w-full px-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all resize-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex justify-between items-center py-2.5 border-t border-border/40 mt-4 text-sm font-bold text-foreground">
            <span>Prezzo</span>
            <span className="tabular-nums text-primary text-base">€ {itemsTotal.toFixed(2)}</span>
          </div>

          {/* Remember me checkbox - hidden for tavolo */}
          {deliveryType !== 'tavolo' && (
            <div className="flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-1 focus:ring-primary/20 focus:ring-offset-0 cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="text-xs text-muted-foreground font-medium cursor-pointer select-none"
              >
                Ricordami su questo dispositivo
              </label>
            </div>
          )}

          <button
            onClick={() => (deliveryType === 'tavolo' ? handleOrder() : setStep('payment'))}
            disabled={!detailsValid || loading}
            className="w-full py-3 bg-primary text-white text-sm sm:text-base font-bold rounded-lg hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            {loading ? 'Elaborazione...' : deliveryType === 'tavolo' ? 'Invia ordine' : 'Procedi'}
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-4">
          {(() => {
            const payOptions = [
              {
                id: 'card',
                title: 'Carta di Credito / Debito',
                desc: 'Visa, Mastercard, Maestro, PostePay',
                icon: (
                  <CreditCard
                    size={18}
                    className={payMethod === 'card' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled:
                  deliveryType === 'domicilio'
                    ? paymentMethods?.card_delivery !== false
                    : paymentMethods?.card_pickup !== false,
              },
              {
                id: 'online',
                title: 'Pagamento Online',
                desc: 'PayPal, Satispay, Apple/Google Pay',
                icon: (
                  <Wallet
                    size={18}
                    className={payMethod === 'online' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: paymentMethods?.paypal !== false,
              },
              {
                id: 'cash',
                title: deliveryType === 'asporto' ? 'Contanti al ritiro' : 'Contanti alla consegna',
                desc:
                  deliveryType === 'asporto'
                    ? 'Paga direttamente in cassa'
                    : "Paga all'arrivo del corriere",
                icon: (
                  <Banknote
                    size={18}
                    className={payMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled:
                  deliveryType === 'domicilio'
                    ? paymentMethods?.cash_delivery !== false
                    : paymentMethods?.cash_pickup !== false,
              },
            ].filter((opt) => opt.enabled);

            return (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Metodo di pagamento
                </label>
                <div className="space-y-2">
                  {payOptions.map((opt) => {
                    const active = payMethod === opt.id;
                    return (
                      <button
                        key={`pay-${opt.id}`}
                        type="button"
                        onClick={() => setPayMethod(opt.id as any)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/60 hover:border-muted-foreground/30 bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-md ${active ? 'bg-primary/10' : 'bg-muted'}`}
                          >
                            {opt.icon}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            active ? 'border-primary' : 'border-border'
                          }`}
                        >
                          {active && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {payMethod === 'card' && (
            <div className="space-y-2">
              <CardPaymentForm
                onChange={(data, isValid) => {
                  setCardNumber(data.number);
                  setCardExpiry(data.expiry);
                  setCardCvv(data.cvv);
                  setIsCardFormValid(isValid);
                }}
              />
              {cardError && <p className="text-xs text-red-500 font-semibold mt-1">{cardError}</p>}
            </div>
          )}

          {payMethod === 'cash' && (
            <div className="space-y-3">
              <div className="bg-amber-500/5 border border-amber-500/25 rounded-lg p-3 text-[11px] text-amber-700 dark:text-amber-400">
                Assicurati di avere il contante pronto{' '}
                {deliveryType === 'asporto' ? 'al ritiro' : 'alla consegna'}.
              </div>
              {deliveryType === 'domicilio' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Hai bisogno di resto?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'No, precisi', value: 'no' },
                      { label: 'Sì, da €20', value: '20' },
                      { label: 'Sì, da €50', value: '50' },
                    ].map((opt) => (
                      <button
                        key={`rest-${opt.value}`}
                        type="button"
                        onClick={() => {
                          if (opt.value !== 'no') {
                            setRestAmount(opt.value);
                            setNeedRest(true);
                          } else {
                            setRestAmount('');
                            setNeedRest(false);
                          }
                        }}
                        className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                          (opt.value === 'no' && needRest === false) ||
                          (opt.value !== 'no' && needRest === true && restAmount === opt.value)
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                            : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {payMethod === 'online' && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  📱 Pagamento Online
                </span>
                <span className="text-xs font-black tracking-tighter text-blue-600 dark:text-blue-400 italic">
                  Pay<span className="text-cyan-500">Pal</span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Verrai reindirizzato al portale sicuro di PayPal per autorizzare la transazione in
                modo protetto.
              </p>
            </div>
          )}

          {/* Promo Code Input Block */}
          {deliveryType !== 'tavolo' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Codice promozionale"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all uppercase font-semibold placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={!promoCode || promoApplied}
                  className="px-4 py-2 bg-secondary text-primary text-xs sm:text-sm font-bold rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:hover:bg-secondary transition-colors border border-orange-200"
                >
                  {promoApplied ? 'Applicato' : 'Applica'}
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-red-500 font-semibold mt-1">{promoError}</p>
              )}
              {promoApplied && appliedPromoDetail && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--success)] bg-[var(--success-bg)] rounded-md px-2.5 py-1 font-semibold">
                  <CheckCircle size={12} />
                  {appliedPromoDetail.type === 'percentage'
                    ? `Sconto promozionale del ${appliedPromoDetail.value}% applicato!`
                    : `Sconto promozionale di € ${appliedPromoDetail.value.toFixed(2)} applicato!`}
                </div>
              )}
            </div>
          )}

          {/* Checkout Finale breakdown display */}
          {deliveryType === 'domicilio' ? (
            <div className="bg-card border border-border/60 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Articoli</span>
                <span className="tabular-nums font-semibold">
                  € {(total - actualDeliveryFee).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Consegna</span>
                <span className="tabular-nums font-semibold">
                  {actualDeliveryFee === 0 ? (
                    <span className="text-[var(--success)] font-bold">Gratis</span>
                  ) : (
                    `€ ${actualDeliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-foreground pt-2 border-t border-border/60 text-sm">
                <span>Prezzo</span>
                <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-lg p-4 flex justify-between font-extrabold text-foreground text-sm">
              <span>Prezzo</span>
              <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="flex-1 py-3 border border-border/80 text-foreground font-bold rounded-lg hover:bg-muted transition-colors text-xs sm:text-sm"
            >
              Indietro
            </button>
            {payMethod === 'online' ? (
              <button
                onClick={handleOrder}
                disabled={loading}
                className="flex-[2_2_0%] py-3 bg-[#FFC439] hover:bg-[#F5B100] text-[#003087] font-extrabold rounded-lg transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm font-sans whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#003087]/30 border-t-[#003087] rounded-full animate-spin" />
                    Connessione...
                  </>
                ) : (
                  <span>
                    Paga con{' '}
                    <span className="font-black italic text-[#003087]">
                      Pay<span className="text-[#0079C1]">Pal</span>
                    </span>
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={handleOrder}
                disabled={loading || (payMethod === 'card' && !isCardFormValid)}
                className="flex-[2_2_0%] py-3 bg-primary text-white font-extrabold rounded-lg hover:bg-[#d43d22] transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {payMethod === 'card' ? 'Autorizzazione...' : 'Invio...'}
                  </>
                ) : payMethod === 'card' ? (
                  'Conferma pagamento'
                ) : (
                  'Conferma ordine'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-6 text-center py-6">
          <div className="w-20 h-20 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle size={40} className="text-[var(--success)]" />
          </div>
          <h3 className="text-2xl font-black text-foreground">Ordine ricevuto!</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            {deliveryType === 'tavolo'
              ? `Il tuo ordine per il tavolo ${tableNumber} è stato inviato in cucina. Inizieremo subito a prepararlo!`
              : 'Abbiamo ricevuto il tuo ordine. Lo prepareremo al più presto.'}
          </p>
          <button
            onClick={() => {
              onClose();
              setTimeout(() => window.location.reload(), 300);
            }}
            className="w-full mt-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-sm shadow-lg shadow-primary/20"
          >
            Torna al menu
          </button>
        </div>
      )}
    </Modal>
  );
}

const getCustomizationOptions = (category: string) => {
  const normalized = (category || '').toLowerCase();
  if (normalized === 'pizza') {
    return {
      extras: [
        { name: 'Doppia Mozzarella', price: 1.5 },
        { name: 'Prosciutto Cotto', price: 1.5 },
        { name: 'Funghi Champignon', price: 1.0 },
        { name: 'Salame Piccante', price: 1.5 },
        { name: 'Olive Nere', price: 0.8 },
      ],
      removes: ['Basilico', 'Origano', 'Mozzarella'],
    };
  }
  if (normalized === 'primi' || normalized === 'secondi' || normalized === 'antipasti') {
    return {
      extras: [
        { name: 'Parmigiano Reggiano', price: 1.2 },
        { name: 'Pane extra', price: 1.0 },
        { name: 'Olio al tartufo', price: 2.0 },
        { name: 'Pancetta croccante', price: 1.5 },
      ],
      removes: ['Pepe', 'Cipolla', 'Aglio', 'Prezzemolo'],
    };
  }
  if (normalized === 'dolci') {
    return {
      extras: [
        { name: 'Panna montata', price: 1.0 },
        { name: 'Granella di nocciole', price: 0.8 },
        { name: 'Cioccolato fuso', price: 1.2 },
      ],
      removes: [],
    };
  }
  if (normalized === 'bevande') {
    return {
      extras: [
        { name: 'Ghiaccio', price: 0.0 },
        { name: 'Fetta di limone', price: 0.5 },
      ],
      removes: ['Ghiaccio'],
    };
  }
  return { extras: [], removes: [] };
};

const getCategoryIcon = (category: string) => {
  const norm = (category || '').toLowerCase();
  if (norm.includes('pizza')) return '🍕';
  if (norm.includes('antipast')) return '🥗';
  if (norm.includes('prim')) return '🍝';
  if (norm.includes('second')) return '🥩';
  if (norm.includes('dolc') || norm.includes('dessert')) return '🍰';
  if (norm.includes('bevand') || norm.includes('bibit')) return '🥤';
  return '🏷️';
};

function CustomizationView({
  item,
  cartItem,
  onClose,
  onConfirm,
}: {
  item: MenuItemType | null;
  cartItem?: CartItem | null;
  onClose: () => void;
  onConfirm: (
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => void;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ name: string; price: number }[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('cheese');
  const [cookingStyle, setCookingStyle] = useState<
    'classico' | 'ben-cotto' | 'calzone' | 'schiacciata'
  >('classico');

  useEffect(() => {
    if (item) {
      if (cartItem) {
        setQty(cartItem.qty);
        // filter out preparazioni/stili from added list to keep it visual
        const baseAdded = (cartItem.addedIngredients || []).filter(
          (e) => !e.name.startsWith('Stile:') && !e.name.startsWith('Cottura:')
        );
        setAdded(baseAdded);
        setRemoved(cartItem.removedIngredients || []);
        setNote(cartItem.note || '');

        const styleItem = (cartItem.addedIngredients || []).find(
          (e) => e.name.startsWith('Stile:') || e.name.startsWith('Cottura:')
        );
        if (styleItem) {
          if (styleItem.name.includes('Schiacciata')) setCookingStyle('schiacciata');
          else if (styleItem.name.includes('Calzone')) setCookingStyle('calzone');
          else if (styleItem.name.includes('Ben Cotto')) setCookingStyle('ben-cotto');
        } else {
          setCookingStyle('classico');
        }
      } else {
        setQty(1);
        setAdded([]);
        setRemoved([]);
        setNote('');
        setCookingStyle('classico');
      }
    }
  }, [item, cartItem]);

  if (!item) return null;

  const { extras, removes } = getCustomizationOptions(item.category);

  const toggleExtra = (ext: { name: string; price: number }) => {
    setAdded((prev) =>
      prev.some((e) => e.name === ext.name)
        ? prev.filter((e) => e.name !== ext.name)
        : [...prev, ext]
    );
  };

  const toggleRemove = (rem: string) => {
    setRemoved((prev) => (prev.includes(rem) ? prev.filter((r) => r !== rem) : [...prev, rem]));
  };

  const handleQuickTag = (tag: string) => {
    const cleaned = tag.replace('🏷️ ', '');
    setNote((prev) => {
      if (prev.includes(cleaned)) return prev;
      return prev ? `${prev}, ${cleaned}` : cleaned;
    });
  };

  // Categorize extras dynamically based on keywords or categories:
  const categories = [
    {
      id: 'cheese',
      title: '🧀 Formaggi & Latticini',
      items: extras.filter(
        (e) =>
          e.name.toLowerCase().includes('bufala') ||
          e.name.toLowerCase().includes('mozzarella') ||
          e.name.toLowerCase().includes('parmigiano') ||
          e.name.toLowerCase().includes('cheddar') ||
          e.name.toLowerCase().includes('grana') ||
          e.name.toLowerCase().includes('formagg')
      ),
    },
    {
      id: 'meat',
      title: '🥓 Salumi & Carni',
      items: extras.filter(
        (e) =>
          e.name.toLowerCase().includes('crudo') ||
          e.name.toLowerCase().includes('salame') ||
          e.name.toLowerCase().includes('pancetta') ||
          e.name.toLowerCase().includes('bacon') ||
          e.name.toLowerCase().includes('cotto') ||
          e.name.toLowerCase().includes('uovo') ||
          e.name.toLowerCase().includes('pollo') ||
          e.name.toLowerCase().includes('manzo')
      ),
    },
    {
      id: 'veg',
      title: '🍅 Verdure & Condimenti',
      items: extras.filter(
        (e) =>
          e.name.toLowerCase().includes('funghi') ||
          e.name.toLowerCase().includes('basilico') ||
          e.name.toLowerCase().includes('tartufo') ||
          e.name.toLowerCase().includes('olive') ||
          e.name.toLowerCase().includes('cipolla') ||
          e.name.toLowerCase().includes('insalata') ||
          e.name.toLowerCase().includes('pomodor') ||
          e.name.toLowerCase().includes('limone')
      ),
    },
    {
      id: 'sauce',
      title: '🍯 Salse & Altro',
      items: extras.filter(
        (e) =>
          !e.name.toLowerCase().includes('bufala') &&
          !e.name.toLowerCase().includes('mozzarella') &&
          !e.name.toLowerCase().includes('parmigiano') &&
          !e.name.toLowerCase().includes('cheddar') &&
          !e.name.toLowerCase().includes('grana') &&
          !e.name.toLowerCase().includes('formagg') &&
          !e.name.toLowerCase().includes('crudo') &&
          !e.name.toLowerCase().includes('salame') &&
          !e.name.toLowerCase().includes('pancetta') &&
          !e.name.toLowerCase().includes('bacon') &&
          !e.name.toLowerCase().includes('cotto') &&
          !e.name.toLowerCase().includes('uovo') &&
          !e.name.toLowerCase().includes('pollo') &&
          !e.name.toLowerCase().includes('manzo') &&
          !e.name.toLowerCase().includes('funghi') &&
          !e.name.toLowerCase().includes('basilico') &&
          !e.name.toLowerCase().includes('tartufo') &&
          !e.name.toLowerCase().includes('olive') &&
          !e.name.toLowerCase().includes('cipolla') &&
          !e.name.toLowerCase().includes('insalata') &&
          !e.name.toLowerCase().includes('pomodor') &&
          !e.name.toLowerCase().includes('limone')
      ),
    },
  ].filter((c) => c.items.length > 0);

  const stylePrice = cookingStyle === 'schiacciata' ? 1.5 : 0.0;
  const unitPrice = item.price + added.reduce((sum, e) => sum + e.price, 0) + stylePrice;
  const totalPrice = unitPrice * qty;

  const handleConfirm = () => {
    const finalAdded = [...added];
    if (cookingStyle === 'schiacciata') {
      finalAdded.push({ name: 'Stile: A Schiacciata', price: 1.5 });
    } else if (cookingStyle === 'calzone') {
      finalAdded.push({ name: 'Stile: A Calzone', price: 0.0 });
    } else if (cookingStyle === 'ben-cotto') {
      finalAdded.push({ name: 'Cottura: Ben Cotto', price: 0.0 });
    }
    onConfirm(qty, finalAdded, removed, note);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted text-[10px] font-black text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 border border-border/20"
        >
          <span className="text-[12px] font-bold">←</span>
          <span>CARRELLO</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
        {/* Info panel */}
        <div className="flex gap-3 bg-muted/20 p-3 rounded-2xl border border-border/20">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <AppImage src={item.image} alt={item.imageAlt} fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>

        {/* 1. Base Ingredients */}
        {removes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Rimuovi Ingredienti standard
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {removes.map((rem) => {
                const isRemoved = removed.includes(rem);
                return (
                  <button
                    key={`remove-${rem}`}
                    type="button"
                    onClick={() => toggleRemove(rem)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                      isRemoved
                        ? 'border-red-100 bg-red-50/20 text-muted-foreground/75'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] transition-all ${isRemoved ? 'bg-red-500 border-red-500 text-white' : 'border-border bg-white text-transparent'}`}
                      >
                        ✓
                      </span>
                      <span
                        className={
                          isRemoved ? 'line-through text-red-500 font-medium' : 'text-foreground'
                        }
                      >
                        {rem}
                      </span>
                    </div>
                    {isRemoved && (
                      <span className="bg-red-100/70 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Rimosso
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Extra Ingredients Accordion */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Aggiungi Extra
            </h4>
            <div className="space-y-2">
              {categories.map((category) => {
                const isOpen = expandedCategory === category.id;
                return (
                  <div
                    key={category.id}
                    className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isOpen ? null : category.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/80 transition-colors text-xs font-bold text-foreground"
                    >
                      <span className="flex items-center gap-1.5">{category.title}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="p-2 space-y-1.5 bg-card border-t border-border/40 max-h-[25vh] overflow-y-auto">
                        {category.items.map((ext) => {
                          const isAdded = added.some((e) => e.name === ext.name);
                          return (
                            <button
                              key={`extra-${ext.name}`}
                              type="button"
                              onClick={() => toggleExtra(ext)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                isAdded
                                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                  : 'border-border bg-card text-foreground hover:bg-muted'
                              }`}
                            >
                              <div className="flex flex-col items-start">
                                <span>{ext.name}</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5 font-normal">
                                  + € {ext.price.toFixed(2)}
                                </span>
                              </div>
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] transition-all ${isAdded ? 'bg-primary border-primary text-white' : 'border-border bg-white text-transparent'}`}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Style / Cooking */}
        {(item.category.toLowerCase().includes('pizz') ||
          item.category.toLowerCase().includes('panin') ||
          item.category.toLowerCase().includes('burger')) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Impasti & Cotture
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'classico', label: 'Classico', price: 0.0 },
                { id: 'ben-cotto', label: 'Ben Cotto', price: 0.0 },
                { id: 'calzone', label: 'A Calzone', price: 0.0 },
                { id: 'schiacciata', label: 'A Schiacciata', price: 1.5 },
              ].map((style) => {
                const isSelected = cookingStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCookingStyle(style.id as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{style.label}</span>
                    <span className="text-[9px] text-muted-foreground font-normal mt-0.5">
                      {style.price > 0 ? `+ € ${style.price.toFixed(2)}` : 'Incluso'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Note speciali per la cucina
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es. ben cotta, senza pepe, allergie..."
            className="w-full p-2.5 text-base bg-muted/60 border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors h-14 resize-none placeholder:text-muted-foreground/75"
          />
          {/* Quick tags */}
          <div className="flex flex-wrap gap-1 mt-1">
            {[
              '🏷️ Salse a parte',
              '🏷️ Ben cotto',
              '🏷️ Ben caldo',
              '🏷️ Poco sale',
              '🏷️ No posate',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleQuickTag(tag)}
                className="text-[9px] bg-muted hover:bg-border border border-border/50 text-muted-foreground hover:text-foreground rounded-full px-2 py-0.5 font-bold transition-all active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Sticky Bar */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-muted border border-border px-2.5 py-1 rounded-xl">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors p-0.5"
            >
              <Minus size={12} />
            </button>
            <span className="w-5 text-center text-xs font-bold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <Plus size={12} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 shadow-md shadow-primary/10 text-xs"
          >
            {cartItem ? 'Salva Modifiche' : 'Aggiungi'} — € {totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CustomerStorefront() {
  const params = useParams();
  const slug = (params?.slug as string) || 'pizzeria-bella-napoli';

  const { settings: restaurantSettings } = useRestaurantSettings(slug);
  const { validatePromo } = usePromoCode(slug);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromoDetail, setAppliedPromoDetail] = useState<any>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Promozioni');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<'closed' | 'no_delivery' | null>(null);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingGuests, setBookingGuests] = useState(2);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('20:00');
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detail Sheet State
  const [customizingItem, setCustomizingItem] = useState<MenuItemType | null>(null);
  const [customizingCartItem, setCustomizingCartItem] = useState<CartItem | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Lifted customer and delivery type states
  const searchParams = useSearchParams();
  const [deliveryType, setDeliveryType] = useState<'domicilio' | 'asporto' | 'tavolo'>('domicilio');
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [guests, setGuests] = useState<number>(2);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const headerRef = useRef<HTMLElement>(null);
  const headerBgSolidRef = useRef<HTMLDivElement>(null);
  const headerBgGradRef = useRef<HTMLDivElement>(null);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Table Order Detection
  useEffect(() => {
    const tavoloParam = searchParams?.get('tavolo');
    if (tavoloParam) {
      setDeliveryType('tavolo');
      setTableNumber(tavoloParam);
    }
  }, [searchParams]);

  // Sync customize view open
  useEffect(() => {
    if (customizingItem) {
      setIsDetailSheetOpen(true);
    } else {
      setIsDetailSheetOpen(false);
    }
  }, [customizingItem]);

  // Load saved guest and delivery info from localStorage on mount
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(`iGO_guest_${slug}`) || localStorage.getItem('iGO_guest_info');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.deliveryType) setDeliveryType(data.deliveryType);
      }
    } catch (err) {
      console.error('Error loading saved guest info:', err);
    }
  }, [slug]);

  // Immediate Availability Check on Page Load & Config Changes
  useEffect(() => {
    const tavoloParam = searchParams?.get('tavolo');
    if (tavoloParam) return; // Skip closed/delivery popups for table ordering

    const currentStr = getCurrentTimeStr();

    // Check if open
    const isOpen =
      !restaurantSettings.openingHours ||
      restaurantSettings.openingHours.length === 0 ||
      restaurantSettings.openingHours.some((h) => currentStr >= h.start && currentStr <= h.end);

    if (!isOpen) {
      setAvailabilityError('closed');
      return;
    }

    // Check delivery hours
    if (deliveryType === 'domicilio') {
      const canDeliver =
        !restaurantSettings.deliveryHours ||
        restaurantSettings.deliveryHours.length === 0 ||
        restaurantSettings.deliveryHours.some((h) => currentStr >= h.start && currentStr <= h.end);
      if (!canDeliver) {
        setAvailabilityError('no_delivery');
        return;
      }
    }
  }, [simulatedTime, deliveryType, restaurantSettings, searchParams]);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // GSAP Navbar Smooth Transition
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 40;
      setIsScrolled(scrolled);

      if (scrolled) {
        gsap.to(headerBgSolidRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(headerBgGradRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(headerContentRef.current, {
          paddingTop: '12px',
          paddingBottom: '12px',
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(headerBgSolidRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(headerBgGradRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(headerContentRef.current, {
          paddingTop: '16px',
          paddingBottom: '16px',
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load saved booking info on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('iGO_booking_info');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.name) setBookingName(data.name);
        if (data.phone) setBookingPhone(data.phone);
      }
    } catch (err) {
      console.error('Error loading saved booking info:', err);
    }
  }, []);

  // Dynamic Browser Tab Title Update
  useEffect(() => {
    if (restaurantSettings?.name) {
      document.title = `${restaurantSettings.name} | iGOdelivering`;
    }
  }, [restaurantSettings]);

  const addToCartCustom = (
    item: MenuItemType,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    const customizationsKey = JSON.stringify({ addedIngredients, removedIngredients, note });
    setCart((prev) => {
      const existing = prev.find(
        (c) =>
          c.id === item.id &&
          JSON.stringify({
            addedIngredients: c.addedIngredients || [],
            removedIngredients: c.removedIngredients || [],
            note: c.note || '',
          }) === customizationsKey
      );

      if (existing) {
        return prev.map((c) =>
          c.id === item.id &&
          JSON.stringify({
            addedIngredients: c.addedIngredients || [],
            removedIngredients: c.removedIngredients || [],
            note: c.note || '',
          }) === customizationsKey
            ? { ...c, qty: c.qty + qty }
            : c
        );
      }

      const extraPrice = addedIngredients.reduce((sum, ext) => sum + ext.price, 0);
      const customizedItem: CartItem = {
        ...item,
        cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        price: item.price + extraPrice,
        qty,
        addedIngredients,
        removedIngredients,
        note,
      };

      return [...prev, customizedItem];
    });
    setCartOpen(true);
  };

  const updateCartItem = (
    cartId: string,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.cartId !== cartId) return c;
        const extraPrice = addedIngredients.reduce((sum, ext) => sum + ext.price, 0);
        const baseItem = menuItems.find((m) => m.id === c.id) || c;
        return {
          ...c,
          qty,
          price: baseItem.price + extraPrice,
          addedIngredients,
          removedIngredients,
          note,
        };
      })
    );
  };

  const handleEditCartItem = (cartItem: CartItem) => {
    const baseItem = menuItems.find((i) => i.id === cartItem.id) || cartItem;
    setCustomizingCartItem(cartItem);
    setCustomizingItem(baseItem);
  };

  const addToCart = (item: MenuItemType) => {
    const cartItem = item as CartItem;
    if (cartItem.cartId) {
      setCart((prev) =>
        prev.map((c) => (c.cartId === cartItem.cartId ? { ...c, qty: c.qty + 1 } : c))
      );
      return;
    }
    // Always open customizer for new items
    setCustomizingItem(item);
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((c) => c.cartId !== cartId);
      return prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  const deleteFromCart = (cartId: string) =>
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));

  const getCurrentTimeStr = () => {
    if (simulatedTime) return simulatedTime;
    const now = new Date();
    return (
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0')
    );
  };

  const getRestaurantStatus = () => {
    const currentStr = getCurrentTimeStr();
    const isOpen =
      !restaurantSettings.openingHours ||
      restaurantSettings.openingHours.length === 0 ||
      restaurantSettings.openingHours.some((h) => currentStr >= h.start && currentStr <= h.end);

    if (!isOpen) return { label: 'CHIUSO', color: 'bg-red-500/20 border-red-500/40 text-red-300' };

    const canDeliver =
      !restaurantSettings.deliveryHours ||
      restaurantSettings.deliveryHours.length === 0 ||
      restaurantSettings.deliveryHours.some((h) => currentStr >= h.start && currentStr <= h.end);

    if (!canDeliver)
      return { label: 'SOLO ASPORTO', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };

    return { label: 'APERTO', color: 'bg-green-500/20 border-green-500/40 text-green-300' };
  };

  const status = getRestaurantStatus();

  const handleCheckoutClick = () => {
    if (deliveryType === 'tavolo') {
      setCartOpen(false);
      setCheckoutOpen(true);
      return;
    }

    const currentStr = getCurrentTimeStr();

    const isOpen =
      !restaurantSettings.openingHours ||
      restaurantSettings.openingHours.length === 0 ||
      restaurantSettings.openingHours.some((h) => currentStr >= h.start && currentStr <= h.end);

    if (!isOpen) {
      setAvailabilityError('closed');
      return;
    }

    if (deliveryType === 'domicilio') {
      const canDeliver =
        !restaurantSettings.deliveryHours ||
        restaurantSettings.deliveryHours.length === 0 ||
        restaurantSettings.deliveryHours.some((h) => currentStr >= h.start && currentStr <= h.end);
      if (!canDeliver) {
        setAvailabilityError('no_delivery');
        return;
      }
    }

    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const applyPromo = () => {
    const res = validatePromo(promoCode, subtotal, email);
    if (res.isValid) {
      setPromoApplied(true);
      setPromoError(null);
      setAppliedPromoDetail(res.promo);
    } else {
      setPromoApplied(false);
      setPromoError(res.error || 'Codice non valido');
      setAppliedPromoDetail(null);
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Dynamic promo validation when subtotal changes
  useEffect(() => {
    if (promoApplied && appliedPromoDetail) {
      const res = validatePromo(appliedPromoDetail.code, subtotal, email);
      if (!res.isValid) {
        setPromoApplied(false);
        setPromoError(res.error || "L'ordine non soddisfa più i requisiti della promo");
        setAppliedPromoDetail(null);
      }
    }
  }, [subtotal, promoApplied, appliedPromoDetail, validatePromo, email]);

  const discount =
    promoApplied && appliedPromoDetail
      ? (appliedPromoDetail.type === 'percentage' || appliedPromoDetail.type === 'first_order')
        ? subtotal * (appliedPromoDetail.value / 100)
        : Math.min(appliedPromoDetail.value, subtotal)
      : 0;

  // Delivery Fee is applied conditionally based on delivery method and promo threshold
  const isFreeDeliveryEligible =
    !!restaurantSettings.freeDeliveryActive &&
    subtotal >= (restaurantSettings.freeDeliveryThreshold || 0);
  const actualDeliveryFee =
    deliveryType === 'domicilio' && !isFreeDeliveryEligible
      ? (restaurantSettings.deliveryFee ?? 0)
      : 0;
  const total = subtotal - discount + actualDeliveryFee;

  const filteredItems = menuItems.filter(
    (item) =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const promoItems = menuItems.filter(
    (item) => item.originalPrice && item.originalPrice > item.price
  );

  const displayedItems = searchQuery
    ? filteredItems
    : activeCategory === 'Promozioni'
      ? promoItems
      : menuItems.filter((i) => i.category === activeCategory);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    const el = document.getElementById('menu-section');
    if (el && lenisRef.current) {
      lenisRef.current.scrollTo(el, {
        offset: -128, // navbar header + sticky category bar
        duration: 0.4,
        immediate: false,
      });
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className={`min-h-screen bg-background ${cartCount > 0 ? 'pb-24 lg:pb-0' : ''}`}>
      {/* Topbar */}
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40" ref={headerRef}>
        {/* Layer 1: Solid glassmorphic background managed by GSAP */}
        <div
          ref={headerBgSolidRef}
          className="absolute inset-0 bg-card/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] z-[-1] pointer-events-none"
          style={{ opacity: 0 }}
        />

        {/* Layer 2: Transparent gradient background managed by GSAP */}
        <div
          ref={headerBgGradRef}
          className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent z-[-2] pointer-events-none"
          style={{ opacity: 1 }}
        />

        <div
          ref={headerContentRef}
          className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4 py-3 sm:py-4"
        >
          {/* Restaurant Logo and Name instead of iGO */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {restaurantSettings.logoUrl ? (
              <div
                className={`w-10 h-10 rounded-full overflow-hidden border bg-white flex items-center justify-center flex-shrink-0 shadow-sm transition-colors duration-300 ${!isScrolled ? 'border-white/20' : 'border-border/30'}`}
              >
                <img
                  src={restaurantSettings.logoUrl}
                  alt={`Logo ${restaurantSettings.name}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base flex-shrink-0 shadow-sm">
                {restaurantSettings.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-auto">
            <div className="relative">
              <Search
                size={14}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${!isScrolled ? 'text-white/70' : 'text-muted-foreground'}`}
              />
              <input
                type="text"
                placeholder="Cerca nel menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 h-10 text-base rounded-xl focus:outline-none transition-all duration-300 ${
                  !isScrolled
                    ? 'bg-white/10 text-white placeholder-white/60 border border-white/20 focus:bg-white/20 focus:ring-0 focus:border-white/40'
                    : 'bg-muted text-foreground placeholder-muted-foreground border border-border focus:ring-0 focus:border-primary'
                }`}
              />
            </div>
          </div>

          {/* Desktop Booking & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Desktop Booking Button */}
            {deliveryType !== 'tavolo' && (
              <button
                onClick={() => setShowBookingModal(true)}
                className={`hidden sm:flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${
                  !isScrolled
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                    : 'bg-[var(--success)] text-white hover:bg-green-700'
                }`}
              >
                <CalendarCheck size={14} />
                PRENOTA TAVOLO
              </button>
            )}

            {/* Cart Button (Visible on both desktop & mobile) */}
            <button
              onClick={() => setCartOpen((o) => !o)}
              className={`relative flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${
                !isScrolled
                  ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
                  : 'bg-primary text-white hover:bg-[#d43d22]'
              }`}
            >
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">Carrello</span>
              {cartCount > 0 && (
                <span className="bg-white text-primary text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Restaurant Hero */}
      <div className="relative h-[22rem] sm:h-[26rem] md:h-[30rem] overflow-hidden">
        <AppImage
          src={restaurantSettings.image || ''}
          alt={restaurantSettings.imageAlt || ''}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10 text-white z-10">
          <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-5 lg:gap-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2 leading-none">
                {restaurantSettings.name}
              </h1>
              <p className="text-white/80 text-sm sm:text-base font-medium mb-4 max-w-2xl leading-relaxed">
                {restaurantSettings.tagline}
              </p>

              <div className="flex flex-wrap items-center gap-y-2.5 gap-x-5 text-xs sm:text-sm font-semibold text-white/95">
                <span
                  className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg font-black tracking-wide text-[10px] sm:text-xs ${status.color}`}
                >
                  {status.label}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <strong>{restaurantSettings.rating}</strong>
                  <span className="text-white/75">({restaurantSettings.reviews} recensioni)</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Clock size={14} />
                  {restaurantSettings.deliveryTime}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Bike size={14} />
                  Consegna € {(restaurantSettings.deliveryFee ?? 0).toFixed(2)}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <MapPin size={14} />
                  {restaurantSettings.address ?? ''}
                </span>
              </div>
            </div>

            {/* Share and Booking Buttons */}
            <div className="flex flex-wrap gap-2.5 mt-4 sm:mt-0 flex-shrink-0">
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link del menu copiato negli appunti!');
                  }
                }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-white/20 transition-all active:scale-95 shadow-sm"
              >
                <Share2 size={16} />
                CONDIVIDI
              </button>

              {deliveryType !== 'tavolo' && (
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="flex items-center gap-2 bg-[var(--success)] hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-lg"
                >
                  <CalendarCheck size={16} />
                  PRENOTA UN TAVOLO
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Promo banner */}
      {deliveryType !== 'tavolo' && (
        <div className="bg-secondary border-b border-orange-200">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-2.5 flex items-center gap-3">
            <Tag size={14} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-semibold">
              🎉 Usa il codice <strong>WELCOME10</strong> per il 10% di sconto sul tuo primo ordine!
            </p>
          </div>
        </div>
      )}

      {/* Sticky category nav */}
      <div className="sticky top-16 z-30 bg-card border-b border-border shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
            {categories.map((cat) => {
              const icon = getCategoryIcon(cat);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={`cat-nav-${cat}`}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-95 border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-border'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div id="menu-section" className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8">
        {/* Menu content */}
        <main className="space-y-12">
          {searchQuery ? (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                {filteredItems.length} risultati per &quot;{searchQuery}&quot;
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    cart={cart}
                    onAdd={addToCart}
                    onCustomize={setCustomizingItem}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <Search size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="font-semibold text-foreground">Nessun prodotto trovato</p>
                  <p className="text-sm text-muted-foreground mt-1">Prova con un termine diverso</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Promo Carousel (Glovo style) */}
              {activeCategory !== 'Promozioni' && promoItems.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                      <span className="text-red-500">🏷️</span>
                      <span>Promozioni</span>
                    </h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
                    {promoItems.map((item) => (
                      <div
                        key={`promo-carousel-${item.id}`}
                        className="w-[170px] sm:w-[200px] flex-shrink-0"
                      >
                        <MenuItemCard
                          item={item}
                          cart={cart}
                          onAdd={addToCart}
                          onCustomize={setCustomizingItem}
                          onRemove={removeFromCart}
                          compact={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular section */}
              {!searchQuery && menuItems.filter((i) => i.popular).length > 0 && (
                <div className="mb-8 border-b border-border/40 pb-6">
                  <PopularSection
                    items={menuItems.filter((i) => i.popular)}
                    cart={cart}
                    onAdd={addToCart}
                    onCustomize={(item) => {
                      setCustomizingItem(item);
                    }}
                    onRemove={removeFromCart}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>{getCategoryIcon(activeCategory)}</span>
                  <span>{activeCategory}</span>
                </h2>
                <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-bold">
                  {displayedItems.length} {displayedItems.length === 1 ? 'prodotto' : 'prodotti'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    cart={cart}
                    onAdd={addToCart}
                    onCustomize={setCustomizingItem}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modern Glassmorphic Cart Modal (Full screen overlay) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop glassmorphism overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 pointer-events-auto"
            onClick={() => {
              setCartOpen(false);
              setCustomizingItem(null);
              setCustomizingCartItem(null);
            }}
          />

          {/* Cart Card Container */}
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl border border-border shadow-[0_32px_64px_rgba(0,0,0,0.15)] flex flex-col z-10 animate-pop-in overflow-hidden max-h-[85vh] h-auto">
            <div className="flex-1 overflow-hidden">
              <CartSidebar
                cart={cart}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onDelete={deleteFromCart}
                onEdit={handleEditCartItem}
                onCheckout={handleCheckoutClick}
                promoCode={promoCode}
                onPromoChange={setPromoCode}
                promoApplied={promoApplied}
                onApplyPromo={applyPromo}
                restaurant={restaurantSettings as any}
                showClose={true}
                onClose={() => {
                  setCartOpen(false);
                  setCustomizingItem(null);
                  setCustomizingCartItem(null);
                }}
                deliveryType={deliveryType}
                minOrder={restaurantSettings.minOrder ?? 0}
                deliveryFee={restaurantSettings.deliveryFee ?? 0}
                freeDeliveryActive={restaurantSettings.freeDeliveryActive || false}
                freeDeliveryThreshold={restaurantSettings.freeDeliveryThreshold || 0}
                actualDeliveryFee={actualDeliveryFee}
                onClear={() => setCart([])}
                tableNumber={tableNumber}
                guests={guests}
                setGuests={setGuests}
                discount={discount}
                appliedPromoDetail={appliedPromoDetail}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Customization Sheet */}
      <ProductDetailSheet
        item={customizingItem}
        cartItem={customizingCartItem}
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setCustomizingItem(null);
          setCustomizingCartItem(null);
        }}
        onConfirm={(qty, addedIngredients, removedIngredients, note) => {
          if (customizingItem) {
            if (customizingCartItem) {
              updateCartItem(
                customizingCartItem.cartId!,
                qty,
                addedIngredients,
                removedIngredients,
                note
              );
            } else {
              addToCartCustom(customizingItem, qty, addedIngredients, removedIngredients, note);
            }
            setCustomizingItem(null);
            setCustomizingCartItem(null);
          }
        }}
      />

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        total={total}
        deliveryType={deliveryType}
        setDeliveryType={setDeliveryType}
        name={name}
        setName={setName}
        address={address}
        setAddress={setAddress}
        phone={phone}
        setPhone={setPhone}
        email={email}
        setEmail={setEmail}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        actualDeliveryFee={actualDeliveryFee}
        slug={slug}
        tableNumber={tableNumber}
        paymentMethods={restaurantSettings.paymentMethods}
        autoSubmit={deliveryType === 'tavolo'}
        currentTimeStr={getCurrentTimeStr()}
        openingHours={restaurantSettings.openingHours}
        deliveryHours={restaurantSettings.deliveryHours}
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        promoApplied={promoApplied}
        applyPromo={applyPromo}
        promoError={promoError}
        appliedPromoDetail={appliedPromoDetail}
      />

      {/* Availability Error Modal */}
      <Modal
        open={!!availabilityError}
        onClose={() => setAvailabilityError(null)}
        hideClose={true}
        size="sm"
      >
        <div className="space-y-4 text-center py-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${availabilityError === 'closed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}
          >
            {availabilityError === 'closed' ? <Clock size={22} /> : <Bike size={22} />}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {availabilityError === 'closed' ? 'Locale Chiuso' : 'Consegna Non Disponibile'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {availabilityError === 'closed'
                ? 'Ci dispiace, il ristorante è chiuso in questo momento. Puoi consultare il menu ma non ordinare.'
                : 'La consegna a domicilio non è attiva in questa fascia oraria. Puoi comunque ordinare con ritiro da asporto!'}
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            {availabilityError === 'no_delivery' ? (
              <>
                <button
                  onClick={() => {
                    setDeliveryType('asporto');
                    setAvailabilityError(null);
                  }}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 shadow-md shadow-primary/10"
                >
                  Ordina da Asporto
                </button>
                <button
                  onClick={() => setAvailabilityError(null)}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  Consulta il Menu
                </button>
              </>
            ) : (
              <button
                onClick={() => setAvailabilityError(null)}
                className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 shadow-md shadow-primary/10"
              >
                Consulta il Menu
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Booking modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowBookingModal(false);
              setBookingConfirmed(false);
            }}
          />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarCheck size={20} className="text-[var(--success)]" />
                <h3 className="font-bold text-foreground">Prenota un Tavolo</h3>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingConfirmed(false);
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {bookingConfirmed ? (
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-[var(--success)]" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">Prenotazione Confermata!</h4>
                <p className="text-sm text-muted-foreground mb-1">
                  Tavolo per <strong>{bookingGuests} persone</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {bookingDate} alle {bookingTime}
                </p>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingConfirmed(false);
                  }}
                  className="bg-[var(--success)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Numero di persone
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setBookingGuests((g) => Math.max(1, g - 1))}
                      className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors font-bold text-lg"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold text-foreground w-8 text-center">
                      {bookingGuests}
                    </span>
                    <button
                      onClick={() => setBookingGuests((g) => Math.min(20, g + 1))}
                      className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Giorno
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-[180px] max-w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Orario
                  </label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-[180px] max-w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder="+39 ..."
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => {
                    if (bookingDate && bookingName) {
                      setBookingConfirmed(true);
                      try {
                        localStorage.setItem(
                          'iGO_booking_info',
                          JSON.stringify({ name: bookingName, phone: bookingPhone })
                        );
                      } catch (err) {
                        console.error('Error saving booking info:', err);
                      }
                    }
                  }}
                  disabled={!bookingDate || !bookingName}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--success)] text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CalendarCheck size={16} />
                  Conferma Prenotazione
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {/* Floating Test controller for Simulation */}
      <div className="fixed bottom-24 right-6 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-64 transition-all duration-300">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
          <Settings
            size={12}
            className="text-primary animate-spin"
            style={{ animationDuration: '4s' }}
          />{' '}
          Test Orari & Disponibilità
        </h4>
        <div className="grid grid-cols-1 gap-1 text-[11px]">
          <button
            onClick={() => setSimulatedTime(null)}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-semibold transition-all ${
              simulatedTime === null
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <span>
              Ora Reale (
              {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})
            </span>
            <span
              className={`w-2 h-2 rounded-full ${simulatedTime === null ? 'bg-green-500' : 'bg-zinc-400'}`}
            />
          </button>

          <button
            onClick={() => setSimulatedTime('16:00')}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-semibold transition-all ${
              simulatedTime === '16:00'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <span>Locale Chiuso (Simula 16:00)</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </button>

          <button
            onClick={() => setSimulatedTime('12:15')}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-semibold transition-all ${
              simulatedTime === '12:15'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <span>Solo Asporto (Simula 12:15)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </button>
        </div>
        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2 text-center leading-normal">
          Modifica il tempo simulato per vedere cambiare lo stato nell&apos;header o testare i
          blocchi nel checkout!
        </p>
      </div>

      {/* Mobile Sticky Bottom Bar for Cart */}
    </div>
  );
}
