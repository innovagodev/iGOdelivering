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
  PauseCircle,
  ChefHat,
  Package,
  CalendarCheck,
  Calendar,
  Edit2,
  Settings,
  Mail,
  CreditCard,
  Banknote,
  Wallet,
  Share2,
  Printer,
  History,
  UtensilsCrossed,
  ChevronRight,
  Users,
} from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';
import { ScheduledOrdersConfig } from '@/types/wizard';
import { usePromoCode } from '@/hooks/usePromoCode';
import CardPaymentForm from '@/components/menu/CardPaymentForm';
import ProductDetailSheet from '@/components/menu/ProductDetailSheet';
import Footer from '@/components/layout/Footer';
import { getRestaurantId, isMockRestaurant } from '@/lib/restaurant-utils';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { generateId } from '@/lib/id-generator';

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
  available?: boolean;
  allergens: string[];
  dishTags?: string[];
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
  scheduledOrders?: ScheduledOrdersConfig;
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
      minOrder: 0,
      deliveryFee: 2.5,
      phone: '+39 02 1234567',
      image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498',
      imageAlt: 'Pizza margherita appena sfornata da forno a legna in una pizzeria napoletana',
      logoUrl: '/assets/images/logo_pizzeria.png',
      paymentMethods: { cash: true, card: true, paypal: true },
      openingHours: [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
      deliveryHours: [
        { start: '11:30', end: '14:30' },
        { start: '19:00', end: '22:30' },
      ],
    };
  } else if (normalizedSlug === 'sushi-zen') {
    return {
      name: 'Sushi Zen',
      tagline: 'Tradizione e purezza giapponese',
      address: 'Corso Magenta 12, Milano',
      rating: 4.9,
      reviews: 184,
      deliveryTime: '30–50 min',
      minOrder: 0,
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
      minOrder: 0,
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
    minOrder: 0,
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
    dishTags: ['👑 Consigliato'],
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
    dishTags: ['🌶️ Piccante'],
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
    dishTags: ['🌱 Vegano', '⭐ Specialità'],
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
    dishTags: ['🌶️ Piccante', '🆕 Nuovo'],
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
    dishTags: ['👑 Consigliato'],
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
  isCurrentlyClosed = false,
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
  isCurrentlyClosed?: boolean;
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
          <ul data-lenis-prevent className="flex-1 overflow-y-auto py-3 px-4 space-y-3 scrollbar-hide">
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
              disabled={!meetsMin || isCurrentlyClosed}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 text-xs shadow-md shadow-primary/10"
            >
              {isCurrentlyClosed ? 'Locale Chiuso' : deliveryType === 'tavolo' ? 'Procedi' : 'Invia Ordine'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const getTagStyle = (tag: string) => {
  if (tag.includes('🌱') || tag.toLowerCase().includes('vegan') || tag.toLowerCase().includes('vegetar')) {
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40';
  }
  if (tag.includes('🌶️') || tag.includes('🔥') || tag.toLowerCase().includes('piccant')) {
    return 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40';
  }
  if (tag.includes('🆕') || tag.toLowerCase().includes('nuov')) {
    return 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40';
  }
  if (tag.includes('⭐') || tag.includes('👑') || tag.toLowerCase().includes('special') || tag.toLowerCase().includes('consigliat')) {
    return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40';
  }
  return 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/40';
};

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

        </div>
        <div className={`${compact ? 'p-3 pb-1' : 'p-4'} flex-1`}>
          <h4
            className={`font-bold text-foreground mb-1 group-hover:text-primary transition-colors ${compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-base'}`}
          >
            {item.name}
          </h4>
          {item.dishTags && item.dishTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 mt-0.5 animate-in fade-in duration-200">
              {item.dishTags.map((tag) => (
                <span
                  key={`${item.id}-${tag}`}
                  className={`inline-flex items-center text-[9px] font-extrabold border rounded px-1.5 py-0.5 shadow-xs ${getTagStyle(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
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
  currentTimeStr,
  openingHours,
  deliveryHours,
  promoCode,
  setPromoCode,
  promoApplied,
  applyPromo,
  promoError,
  appliedPromoDetail,
  guests,
  setGuests,
  lastCreatedOrder,
  setLastCreatedOrder,
  clearCart,
  bookingContext,
  setBookingContext,
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
  currentTimeStr: string;
  openingHours?: { start: string; end: string }[];
  deliveryHours?: { start: string; end: string }[];
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoApplied: boolean;
  applyPromo: () => void;
  promoError?: string | null;
  appliedPromoDetail?: any;
  guests: number;
  setGuests: (v: number) => void;
  lastCreatedOrder: any;
  setLastCreatedOrder: (order: any) => void;
  clearCart: () => void;
  bookingContext: any;
  setBookingContext: (v: any) => void;
}) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [emailTouched, setEmailTouched] = useState(false);
  const { settings: restaurantSettings } = useRestaurantSettings(slug);

  const isEmailValid = React.useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  const handlePrintReceipt = (order: any) => {
    if (!order) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = restaurantSettings?.name || 'iGOdelivering';
    const logoHtml = restaurantSettings?.logoUrl
      ? `<img src="${restaurantSettings.logoUrl}" style="max-height: 48px; margin-bottom: 8px;" />`
      : ``;

    const itemsHtml = order.items.map((item: any) => {
      const customNotes = (item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0)
        ? '<div style="font-size: 10px; color: #666; margin-top: 2px;">' +
        item.addedIngredients?.map((i: any) => '+' + i.name).concat(item.removedIngredients?.map((i: string) => '-' + i)).join(', ') +
        '</div>'
        : '';
      const itemPrice = (item.price + (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) * item.qty;
      return '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">' +
        '<div>' +
        '<strong>' + item.qty + 'x ' + item.name + '</strong>' +
        customNotes +
        '</div>' +
        '<span>&euro; ' + itemPrice.toFixed(2) + '</span>' +
        '</div>';
    }).join('');

    const tableRow = order.type === 'tavolo'
      ? '<div class="row"><strong>Tavolo:</strong> <span>' + order.tableNumber + '</span></div>'
      : '<div class="row"><strong>Cliente:</strong> <span>' + (order.customer?.name || order.customerName) + '</span></div>' +
      '<div class="row"><strong>Telefono:</strong> <span>' + order.customer?.phone + '</span></div>' +
      (order.type === 'domicilio' ? '<div class="row"><strong>Indirizzo:</strong> <span>' + order.customer?.address + '</span></div>' : '');

    const deliveryFeeRow = (order.deliveryFee || 0) > 0
      ? '<div class="row"><span>Consegna:</span> <span>&euro; ' + (order.deliveryFee || 0).toFixed(2) + '</span></div>'
      : '';
    const discountRow = (order.discount || 0) > 0
      ? '<div class="row" style="color: #16a34a;"><span>Sconto:</span> <span>-&euro; ' + (order.discount || 0).toFixed(2) + '</span></div>'
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Ricevuta Ordine - ${order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            .container { max-width: 320px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 12px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .section { border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
            .totals { margin-top: 8px; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 15px; margin-top: 8px; border-top: 1px solid #333; padding-top: 8px; color: #e11d48; }
            .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoHtml}
              <div style="font-size: 16px; font-weight: 800; text-transform: uppercase;">${restName}</div>
              <div style="font-size: 10px; color: #777; margin-top: 4px;">Ricevuta Digitale</div>
            </div>
            
            <div class="section">
              <div class="row"><strong>ID Ordine:</strong> <span>${order.id}</span></div>
              <div class="row"><strong>Data:</strong> <span>${new Date(order.timestamp).toLocaleString('it-IT')}</span></div>
              <div class="row"><strong>Servizio:</strong> <span style="text-transform: capitalize;">${order.type}</span></div>
              ${tableRow}
              <div class="row"><strong>Pagamento:</strong> <span>${order.payMethod === 'online' ? 'Online' : 'Contanti'}</span></div>
            </div>
            
            <div class="section">
              ${itemsHtml}
            </div>
            
            <div class="totals">
              <div class="row"><span>Subtotale:</span> <span>&euro; ${(order.subtotal || 0).toFixed(2)}</span></div>
              ${deliveryFeeRow}
              ${discountRow}
              <div class="total-row"><span>Totale:</span> <span>&euro; ${(order.total || 0).toFixed(2)}</span></div>
            </div>
            
            <div class="footer">
              Grazie per il tuo ordine!<br>A presto!
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const DigitalReceipt = ({ order, onPrint }: { order: any, onPrint?: () => void }) => {
    if (!order) return null;
    return (
      <div className="border border-border/80 rounded-xl bg-muted/30 p-4 text-left space-y-4 max-w-md mx-auto relative overflow-hidden" id={`receipt-${order.id}`}>
        <div className="flex justify-between items-start border-b border-border/40 pb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ID ORDINE</p>
            <p className="text-sm font-black font-mono text-foreground">{order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">DATA & ORA</p>
            <p className="text-xs font-semibold text-foreground">
              {new Date(order.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Riferimenti</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Servizio:</span>
            <span className="font-bold text-foreground capitalize">{order.type}</span>
          </div>
          {order.deliveryTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Programmato per:</span>
              <span className="font-bold text-amber-500">
                {order.deliveryDate ? `${new Date(order.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ` : ''}
                {order.deliveryTime === 'asap' ? 'Il prima possibile' : `alle ${order.deliveryTime}`}
              </span>
            </div>
          )}
          {order.type === 'tavolo' ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tavolo:</span>
              <span className="font-extrabold text-primary">{order.tableNumber}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-foreground">{order.customer?.name || order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefono:</span>
                <span className="font-semibold text-foreground">{order.customer?.phone}</span>
              </div>
              {order.type === 'domicilio' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indirizzo:</span>
                  <span className="font-semibold text-foreground text-right max-w-[200px] truncate" title={order.customer?.address}>
                    {order.customer?.address}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagamento:</span>
            <span className="font-semibold text-foreground uppercase">{order.payMethod === 'online' ? 'Carta (Online)' : 'Alla consegna'}</span>
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Prodotti Ordinati</p>
          <ul className="space-y-2 text-xs">
            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
              <li key={`receipt-item-${idx}`} className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-foreground truncate">{item.qty}× {item.name}</p>
                  {(item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {item.addedIngredients?.map((i: any) => `+${i.name}`).concat(item.removedIngredients?.map((i: string) => `-${i}`)).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-bold text-foreground tabular-nums">€ {((item.price + (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) * item.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border/40 pt-3 text-xs space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotale:</span>
            <span className="tabular-nums">€ {(order.subtotal || 0).toFixed(2)}</span>
          </div>
          {(order.deliveryFee || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Consegna:</span>
              <span className="tabular-nums">€ {(order.deliveryFee || 0).toFixed(2)}</span>
            </div>
          )}
          {(order.discount || 0) > 0 && (
            <div className="flex justify-between text-[var(--success)] font-semibold">
              <span>Sconto {order.promoApplied ? `(${order.promoApplied})` : ''}:</span>
              <span className="tabular-nums">- € {(order.discount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-foreground border-t border-border/40 pt-2">
            <span>Totale Ordine:</span>
            <span className="text-primary tabular-nums">€ {(order.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {onPrint && (
          <button
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <Printer size={12} />
            Stampa Ricevuta
          </button>
        )}
      </div>
    );
  };

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

  const [cap, setCap] = useState('');
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const storedZones = localStorage.getItem(STORAGE_KEYS.zones(rId));
      if (storedZones) {
        try {
          setZones(JSON.parse(storedZones));
        } catch (e) {
          console.error('Error parsing zones in checkout modal:', e);
        }
      } else {
        setZones([
          { id: 'zone-1', name: 'Zona Centro (Vicino)', minOrder: 0, deliveryFee: 2.0, freeDeliveryThreshold: 25, enabled: true, caps: '20121, 20122, 20123' },
          { id: 'zone-2', name: 'Zona Periferia (Medio)', minOrder: 0, deliveryFee: 4.0, freeDeliveryThreshold: 35, enabled: true, caps: '20124, 20125, 20126' },
          { id: 'zone-3', name: 'Fuori Comune (Lontano)', minOrder: 0, deliveryFee: 6.0, freeDeliveryThreshold: 50, enabled: false, caps: '20127, 20128, 20129' },
        ]);
      }
    }
  }, [open, slug]);

  const matchedZone = React.useMemo(() => {
    if (deliveryType !== 'domicilio' || cap.length < 5) return null;
    return zones.find((z) => {
      if (!z.enabled) return false;
      if (!z.caps) return false;
      const capsList = z.caps.split(',').map((c: string) => c.trim());
      return capsList.includes(cap);
    });
  }, [deliveryType, cap, zones]);

  const currentDeliveryFee = React.useMemo(() => {
    if (deliveryType !== 'domicilio') return 0;
    if (matchedZone) {
      if (matchedZone.freeDeliveryThreshold > 0 && itemsTotal >= matchedZone.freeDeliveryThreshold) {
        return 0;
      }
      return matchedZone.deliveryFee;
    }
    return actualDeliveryFee;
  }, [deliveryType, matchedZone, itemsTotal, actualDeliveryFee]);

  const finalTotal = itemsTotal + currentDeliveryFee;

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

  // 1. Get current scheduled orders configuration
  const scheduledOrdersConfig = restaurantSettings?.scheduledOrders;
  const isScheduledEnabled = !!scheduledOrdersConfig?.enabled;

  const currentConfig = React.useMemo(() => {
    if (!isScheduledEnabled || !scheduledOrdersConfig) return null;
    if (deliveryType === 'domicilio') return scheduledOrdersConfig.delivery;
    if (deliveryType === 'asporto') return scheduledOrdersConfig.pickup;
    return scheduledOrdersConfig.onPremise;
  }, [isScheduledEnabled, scheduledOrdersConfig, deliveryType]);

  const minNoticeMinutes = React.useMemo(() => {
    if (!currentConfig) return 30; // default 30 mins
    const val = currentConfig.minNoticeValue || 0;
    const unit = currentConfig.minNoticeUnit || 'minutes';
    if (unit === 'hours') return val * 60;
    return val;
  }, [currentConfig]);

  const timeInterval = React.useMemo(() => {
    if (deliveryType === 'domicilio' && currentConfig && 'timeWindowMinutes' in currentConfig) {
      return (currentConfig as any).timeWindowMinutes || 15;
    }
    return 15; // default 15 mins for pickup/onPremise
  }, [currentConfig, deliveryType]);

  const maxDays = React.useMemo(() => {
    if (!currentConfig) return 0; // only today
    return currentConfig.maxNoticeDays || 0;
  }, [currentConfig]);

  const dateOptions = React.useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i <= maxDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      let label = '';
      if (i === 0) label = 'Oggi';
      else if (i === 1) label = 'Domani';
      else {
        const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString('it-IT', { month: 'short' });
        label = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum} ${monthName}`;
      }
      const value = d.toISOString().split('T')[0];
      options.push({ value, label });
    }
    return options;
  }, [maxDays]);

  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (dateOptions.length > 0) {
      const exists = dateOptions.some(opt => opt.value === selectedDate);
      if (!exists) {
        setSelectedDate(dateOptions[0].value);
      }
    } else {
      setSelectedDate('');
    }
  }, [dateOptions, selectedDate]);

  const timeSlots = React.useMemo(() => {
    if (deliveryType === 'tavolo') return [];
    const activeRanges =
      deliveryType === 'domicilio' ? deliveryHours || openingHours || [] : openingHours || [];
    const slots: string[] = [];
    if (activeRanges.length === 0) return [];

    const isToday = !selectedDate || (dateOptions[0] && selectedDate === dateOptions[0].value);

    // Parse current time in minutes
    const [currH, currM] = (currentTimeStr || '00:00').split(':').map(Number);
    const currMin = currH * 60 + currM;

    // Apply minimum notice buffer if it's today
    const minTimeStart = isToday ? currMin + minNoticeMinutes : 0;

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += timeInterval) {
        const slotMin = h * 60 + m;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        const inRange = activeRanges.some((r) => timeStr >= r.start && timeStr <= r.end);

        if (inRange) {
          if (!isToday || slotMin >= minTimeStart) {
            slots.push(timeStr);
          }
        }
      }
    }
    return slots;
  }, [deliveryType, openingHours, deliveryHours, currentTimeStr, selectedDate, dateOptions, minNoticeMinutes, timeInterval]);

  const showAsapOption = !scheduledOrdersConfig?.hideAsap && (!selectedDate || (dateOptions[0] && selectedDate === dateOptions[0].value));

  useEffect(() => {
    if (currentTimeStr === '12:15' && deliveryType === 'domicilio') {
      setDeliveryType('asporto');
    }
  }, [currentTimeStr, deliveryType, setDeliveryType]);

  useEffect(() => {
    if (showAsapOption) {
      if (!deliveryTime || (deliveryTime !== 'asap' && !timeSlots.includes(deliveryTime))) {
        setDeliveryTime('asap');
      }
    } else {
      if (timeSlots.length > 0) {
        if (!deliveryTime || deliveryTime === 'asap' || !timeSlots.includes(deliveryTime)) {
          setDeliveryTime(timeSlots[0]);
        }
      } else {
        setDeliveryTime('');
      }
    }
  }, [timeSlots, deliveryTime, setDeliveryTime, showAsapOption]);

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
      setStep('details');
      setLoading(false);
    }
  }, [open]);

  const handleOrder = () => {
    if (payMethod === 'card' && !isCardFormValid) {
      setCardError('I dati della carta non sono validi o sono incompleti.');
      return;
    }
    setCardError(null);
    setLoading(true);

    if (bookingContext) {
      try {
        const rId = getRestaurantId(slug);
        const bookingsKey = STORAGE_KEYS.bookings(rId);
        const existingStr = localStorage.getItem(bookingsKey);
        let bookingsArray: any[] = [];
        if (existingStr) {
          try { bookingsArray = JSON.parse(existingStr); } catch (e) { console.error(e); }
        }

        const newBooking = {
          id: generateId('PRE'),
          restaurantId: rId,
          name: bookingContext.name.trim(),
          phone: bookingContext.phone.trim(),
          email: '',
          guests: bookingContext.guests,
          date: bookingContext.date,
          time: bookingContext.time,
          status: 'pending',
          notes: bookingContext.note.trim(),
          preOrderItems: cart,
          preOrderTotal: total,
          payMethod: payMethod,
          total: total,
          createdAt: new Date().toISOString(),
        };

        bookingsArray.push(newBooking);
        localStorage.setItem(bookingsKey, JSON.stringify(bookingsArray));

        // Sync with lastCreatedOrder so we can monitor status changes and show iOS notifications
        const trackedOrder = {
          ...newBooking,
          type: 'prenotazione_tavolo',
          customerName: bookingContext.name,
          total: total,
        };
        setLastCreatedOrder(trackedOrder);
        sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(trackedOrder));

        clearCart();
        setBookingContext(null); // Clear booking context!
        window.dispatchEvent(new Event('iGO_bookings_updated'));
      } catch (err) {
        console.error('Error saving booking pre-order:', err);
      }

      setTimeout(
        () => {
          setLoading(false);
          setStep('success');
        },
        payMethod === 'online' ? 2200 : 1500
      );
      return;
    }

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
      const rId = getRestaurantId(slug);
      const ordersKey = STORAGE_KEYS.orders(rId);
      const rawOrders = localStorage.getItem(ordersKey);
      const orders = rawOrders ? JSON.parse(rawOrders) : [];

      const discount = appliedPromoDetail
        ? (appliedPromoDetail.type === 'percentage' || appliedPromoDetail.type === 'first_order'
          ? itemsTotal * (appliedPromoDetail.value / 100)
          : appliedPromoDetail.type === 'free_delivery'
            ? actualDeliveryFee
            : Math.min(appliedPromoDetail.value, itemsTotal))
        : 0;

      const orderId =
        deliveryType === 'domicilio'
          ? generateId('ORD')
          : deliveryType === 'asporto'
            ? generateId('ASP')
            : generateId('TAV', tableNumber || undefined);

      const newOrder = {
        id: orderId,
        restaurantId: rId,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: deliveryType,
        items: cart,
        subtotal: itemsTotal,
        deliveryFee: currentDeliveryFee,
        discount,
        total: finalTotal,
        customerName: deliveryType === 'tavolo' ? `${name} (Tavolo ${tableNumber})` : name,
        email: deliveryType === 'tavolo' ? 'tavolo@internal.it' : email.trim().toLowerCase(),
        customer: {
          name: name,
          email: deliveryType === 'tavolo' ? 'tavolo@internal.it' : email.trim().toLowerCase(),
          phone: phone,
          address: deliveryType === 'domicilio' ? `${address} (CAP: ${cap})` : '',
        },
        tableNumber: deliveryType === 'tavolo' ? tableNumber : undefined,
        guests: deliveryType === 'tavolo' ? guests : undefined,
        status: 'new',
        promoApplied: appliedPromoDetail ? appliedPromoDetail.code : undefined,
        notes: notes || '',
        payMethod: payMethod,
        itemsCount: cart.reduce((s: number, i: any) => s + i.qty, 0),
        deliveryTime: deliveryType !== 'tavolo' ? deliveryTime : undefined,
        deliveryDate: deliveryType !== 'tavolo' ? selectedDate : undefined,
      };
      orders.push(newOrder);
      localStorage.setItem(ordersKey, JSON.stringify(orders));

      // Save order to guest order history if not table order
      if (deliveryType !== 'tavolo') {
        const custOrdersKey = STORAGE_KEYS.customerOrders(rId, email.trim().toLowerCase());
        const rawCustOrders = localStorage.getItem(custOrdersKey);
        const custOrders = rawCustOrders ? JSON.parse(rawCustOrders) : [];
        custOrders.unshift(newOrder); // Prepend new order
        if (custOrders.length > 10) {
          custOrders.pop(); // Keep only 10 most recent orders
        }
        localStorage.setItem(custOrdersKey, JSON.stringify(custOrders));
      }

      // Increment usedCount for the applied promo code
      if (appliedPromoDetail) {
        try {
          const promosKey = STORAGE_KEYS.promos(rId);
          const rawPromos = localStorage.getItem(promosKey);
          if (rawPromos) {
            const promoList = JSON.parse(rawPromos);
            const updatedPromos = promoList.map((p: any) => {
              if (p.code === appliedPromoDetail.code) {
                return { ...p, usedCount: (p.usedCount || 0) + 1 };
              }
              return p;
            });
            localStorage.setItem(promosKey, JSON.stringify(updatedPromos));
          }
        } catch (e) {
          console.error('Error updating promo usedCount:', e);
        }
      }

      setLastCreatedOrder(newOrder);
      try {
        sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(newOrder));
      } catch (err) {
        console.error('Error saving order to sessionStorage:', err);
      }
      clearCart();
      window.dispatchEvent(new Event('iGO_orders_updated'));
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

  const detailsValid = bookingContext
    ? !!bookingContext.name && !!bookingContext.phone
    : (deliveryType === 'tavolo'
      ? !!name && !!phone
      : !!name &&
      !!phone &&
      !!email &&
      isEmailValid &&
      !!deliveryTime &&
      (deliveryType === 'asporto' || (!!address && cap.length === 5 && !!matchedZone && itemsTotal >= matchedZone.minOrder)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === 'success' ? 'Stato Ordine' : 'Checkout'}
    >
      {step === 'details' && (
        <div className="space-y-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-card/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-lg">
              <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm font-bold text-primary animate-pulse">
                Elaborazione...
              </p>
            </div>
          )}

          {bookingContext ? (
            <>
              {/* Table Booking Summary Read-only card */}
              <div className="bg-green-500/5 dark:bg-green-950/10 border border-green-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarCheck size={14} /> IL TUO TAVOLO
                  </h4>
                  <span className="bg-green-500/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Da Confermare
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Data e Ora</span>
                    <strong className="text-foreground text-sm">
                      {new Date(bookingContext.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })} alle {bookingContext.time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Persone</span>
                    <strong className="text-foreground text-sm">{bookingContext.guests} {bookingContext.guests === 1 ? 'persona' : 'persone'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Nome Cliente</span>
                    <strong className="text-foreground">{bookingContext.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Telefono</span>
                    <strong className="text-foreground">{bookingContext.phone}</strong>
                  </div>
                </div>
                {bookingContext.note && (
                  <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Note:</span> &quot;{bookingContext.note}&quot;
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border border-border/80 bg-muted/20 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">I Piatti Pre-ordinati</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {cart.map((item, idx) => (
                    <div key={`summary-item-${idx}`} className="flex justify-between items-start text-xs border-b border-border/10 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-foreground">{item.qty}x {item.name}</p>
                        {((item.addedIngredients && item.addedIngredients.length > 0) ||
                          (item.removedIngredients && item.removedIngredients.length > 0) ||
                          item.note) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 pl-2 space-y-0.5">
                              {item.addedIngredients?.map((ext) => (
                                <div key={ext.name} className="text-primary font-medium">+ {ext.name}</div>
                              ))}
                              {item.removedIngredients?.map((rem) => (
                                <div key={rem} className="text-red-500">- Senza {rem}</div>
                              ))}
                            </div>
                          )}
                      </div>
                      <span className="font-bold text-foreground tabular-nums">
                        € {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/40 pt-3 flex justify-between text-sm font-black text-foreground">
                  <span>Totale Pre-ordine</span>
                  <span className="text-primary tabular-nums">€ {total.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : deliveryType === 'tavolo' ? (
            <>
              {/* Tavolo specifico */}
              <div className="grid grid-cols-2 gap-4">
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
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted border border-border/80 rounded-lg focus:outline-none focus:ring-0 font-bold text-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Numero di Persone *
                  </label>
                  <div className="flex items-center gap-2.5 h-10 border border-border/80 rounded-lg px-2 bg-card">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-7 h-7 rounded-md bg-muted hover:bg-border transition-colors font-bold text-sm flex items-center justify-center text-foreground"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-foreground w-6 text-center select-none">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests(guests + 1)}
                      className="w-7 h-7 rounded-md bg-muted hover:bg-border transition-colors font-bold text-sm flex items-center justify-center text-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
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
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                      placeholder="+39 3331234567"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Note per il ristorante (opzionale)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergie, preferenze..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all resize-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Order Summary (Riepilogo Ordine) */}
              <div className="border border-border/80 bg-muted/20 rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Riepilogo Ordine</h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {cart.map((item, idx) => (
                    <div key={`summary-item-${idx}`} className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        {item.qty}x {item.name}
                      </span>
                      <span className="font-bold text-foreground tabular-nums">
                        € {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/40 pt-2 flex justify-between text-sm font-extrabold text-foreground">
                  <span>Totale Ordine al tavolo</span>
                  <span className="text-primary tabular-nums">€ {total.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Delivery type selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Modalità di consegna
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={currentTimeStr === '12:15'}
                    onClick={() => setDeliveryType('domicilio')}
                    className={`flex items-center justify-center py-2.5 rounded-lg border text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${currentTimeStr === '12:15'
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50'
                      : deliveryType === 'domicilio'
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                        : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                      }`}
                  >
                    Consegna a domicilio
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('asporto')}
                    className={`flex items-center justify-center py-2.5 rounded-lg border text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${deliveryType === 'asporto'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                      : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                      }`}
                  >
                    Asporto
                  </button>
                </div>
              </div>

              {/* Name */}
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

              {/* Address — only for home delivery */}
              {deliveryType === 'domicilio' && (
                <div className="space-y-4">
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

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      CAP (Codice Avviamento Postale) *
                    </label>
                    <div className="relative">
                      <MapPin
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        maxLength={5}
                        value={cap}
                        onChange={(e) => setCap(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="Es. 20121"
                        className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50 font-bold tracking-widest"
                      />
                    </div>
                    {cap.length === 5 && !matchedZone && (
                      <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        Spiacenti, la consegna a domicilio non è disponibile per il CAP inserito.
                      </p>
                    )}
                    {cap.length === 5 && matchedZone && itemsTotal < matchedZone.minOrder && (
                      <p className="text-xs text-amber-500 font-semibold mt-1.5 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                        L'ordine minimo per questo CAP è € {matchedZone.minOrder.toFixed(2)} (Mancano € {(matchedZone.minOrder - itemsTotal).toFixed(2)})
                      </p>
                    )}
                    {cap.length === 5 && matchedZone && itemsTotal >= matchedZone.minOrder && (
                      <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        Zona servita! Consegna: {currentDeliveryFee === 0 ? 'Gratis' : `€ ${currentDeliveryFee.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Phone */}
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
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                    placeholder="+39 3331234567"
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Email */}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="mario.rossi@email.com"
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                {emailTouched && email && !isEmailValid && (
                  <p className="text-xs text-red-500 font-semibold mt-1">
                    Inserisci un indirizzo email valido.
                  </p>
                )}
              </div>

              {/* Data di consegna / ritiro (Scheduled Orders) */}
              {isScheduledEnabled && maxDays > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Calendar size={12} />
                    Giorno di {deliveryType === 'domicilio' ? 'consegna' : 'ritiro'} *
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 mb-1 scrollbar-none no-scrollbar">
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDate === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedDate(opt.value)}
                          className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-card border-border/80 text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Orario di consegna / ritiro */}
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
                    className="w-full pl-9 pr-10 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-foreground cursor-pointer"
                  >
                    {!showAsapOption && <option value="">Seleziona orario...</option>}
                    {showAsapOption && <option value="asap">Il prima possibile</option>}
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                {timeSlots.length === 0 && !showAsapOption && (
                  <p className="text-xs text-red-500 font-semibold mt-1">
                    Nessun orario disponibile per questo giorno.
                  </p>
                )}
              </div>

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

              {/* Remember me checkbox */}
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
            </>
          )}

          <button
            onClick={() => setStep('payment')}
            disabled={!detailsValid || loading}
            className="w-full py-3 bg-primary text-white text-sm sm:text-base font-bold rounded-lg hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            Invia Ordine
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-4">
          {(() => {
            const payOptions = [
              {
                id: 'card',
                title: bookingContext ? 'Paga adesso (carta)' : (deliveryType === 'tavolo' ? 'Paga adesso con Carta' : 'Carta di Credito / Debito'),
                desc: 'Visa, Mastercard, Maestro, PostePay',
                icon: (
                  <CreditCard
                    size={18}
                    className={payMethod === 'card' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext ? (paymentMethods?.card !== false) : (
                  deliveryType === 'domicilio'
                    ? paymentMethods?.card_delivery !== false
                    : paymentMethods?.card_pickup !== false
                ),
              },
              {
                id: 'online',
                title: bookingContext ? 'Paga adesso con PayPal' : (deliveryType === 'tavolo' ? 'Paga adesso con PayPal' : 'Pagamento Online'),
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
                title: bookingContext ? 'Paga alla cassa (Invia ordine)' : (deliveryType === 'tavolo' ? 'Paga in Cassa' : deliveryType === 'asporto' ? 'Contanti al ritiro' : 'Contanti alla consegna'),
                desc: bookingContext ? 'Invia l\'ordine direttamente e paga in cassa a fine pasto' : (
                  deliveryType === 'tavolo'
                    ? 'Invia l\'ordine e paga al tavolo/cassa a fine pasto'
                    : deliveryType === 'asporto'
                      ? 'Paga direttamente in cassa'
                      : "Paga all'arrivo del corriere"
                ),
                icon: (
                  <Banknote
                    size={18}
                    className={payMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext ? true : (
                  deliveryType === 'domicilio'
                    ? paymentMethods?.cash_delivery !== false
                    : paymentMethods?.cash_pickup !== false
                ),
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
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${active
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
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${active ? 'border-primary' : 'border-border'
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
              {bookingContext && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-700 dark:text-blue-300 mb-2 leading-relaxed">
                  💳 <strong>Pre-autorizzazione:</strong> I dati della carta serviranno solo a pre-autorizzare l'importo. L'addebito effettivo avverrà <strong>solo dopo la conferma</strong> della prenotazione da parte del ristorante.
                </div>
              )}
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
                {bookingContext
                  ? "Invia la prenotazione e l'ordine. Pagherai comodamente in cassa a fine pasto (dopo che il ristorante avrà accettato e confermato)."
                  : (deliveryType === 'tavolo'
                    ? 'Invia l\'ordine in cucina. Pagherai comodamente in cassa o al tavolo a fine pasto.'
                    : `Assicurati di avere il contante pronto ${deliveryType === 'asporto' ? 'al ritiro' : 'alla consegna'}.`)}
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
                        className={`py-2 rounded-lg border text-xs font-semibold transition-all ${(opt.value === 'no' && needRest === false) ||
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
                  € {itemsTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Consegna</span>
                <span className="tabular-nums font-semibold">
                  {currentDeliveryFee === 0 ? (
                    <span className="text-[var(--success)] font-bold">Gratis</span>
                  ) : (
                    `€ ${currentDeliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-foreground pt-2 border-t border-border/60 text-sm">
                <span>Prezzo</span>
                <span className="tabular-nums text-primary">€ {finalTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-lg p-4 flex justify-between font-extrabold text-foreground text-sm">
              <span>Prezzo</span>
              <span className="tabular-nums text-primary">€ {finalTotal.toFixed(2)}</span>
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
                ) : deliveryType === 'tavolo' ? (
                  'Invia ordine in cucina'
                ) : (
                  'Conferma ordine'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
            <Clock size={32} className="text-amber-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">
              {lastCreatedOrder?.type === 'prenotazione_tavolo' ? 'Prenotazione Inviata!' : 'Ordine inviato!'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {lastCreatedOrder?.type === 'prenotazione_tavolo'
                ? 'La tua prenotazione e pre-ordine del cibo sono stati inviati. Attendi la conferma direttamente da questa pagina del menu.'
                : (deliveryType === 'tavolo'
                  ? `Il tuo ordine per il tavolo ${tableNumber} è in attesa di accettazione. Torna alla pagina del menu per ricevere aggiornamenti.`
                  : 'Il tuo ordine è in attesa di essere accettato dal ristorante. Torna alla pagina del menu per ricevere la notifica di conferma.')}
            </p>
          </div>

          {/* Digital Receipt */}
          {lastCreatedOrder && (
            <div className="mt-4 pt-4 border-t border-border">
              <DigitalReceipt
                order={lastCreatedOrder}
                onPrint={() => handlePrintReceipt(lastCreatedOrder)}
              />
            </div>
          )}

          <button
            onClick={() => {
              onClose();
            }}
            className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-xs shadow-md shadow-primary/20"
          >
            Torna al menu
          </button>
        </div>
      )}
    </Modal>
  );
}

interface NotificationProps {
  notification: {
    variant: 'success' | 'warning' | 'danger';
    title: string;
    message: string;
    orderId: string;
  };
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationProps) {
  useEffect(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (delay: number, frequency: number, duration: number) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };
      if (notification.variant === 'danger') {
        playBeep(0, 330, 0.2);
        playBeep(220, 280, 0.3);
      } else {
        playBeep(0, 880, 0.1);
        playBeep(110, 1100, 0.15);
      }
    } catch (e) {
      console.log('Audio feedback not supported or allowed:', e);
    }

    const timer = setTimeout(() => onClose(), 8000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const colorMap = {
    success: {
      icon: '✓',
      iconBg: 'bg-emerald-500',
      bar: 'bg-emerald-500',
      label: 'Ordine Confermato',
    },
    warning: {
      icon: '⊙',
      iconBg: 'bg-amber-500',
      bar: 'bg-amber-500',
      label: 'Aggiornamento Ordine',
    },
    danger: {
      icon: '✕',
      iconBg: 'bg-red-500',
      bar: 'bg-red-500',
      label: 'Ordine Rifiutato',
    },
  };

  const c = colorMap[notification.variant];

  return (
    <div
      className="fixed top-5 right-5 z-[9999] w-[340px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden cursor-pointer animate-slide-in-notification"
      onClick={onClose}
      role="alert"
    >
      <style>{`
        @keyframes slideInNotification {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrinkBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .animate-slide-in-notification {
          animation: slideInNotification 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .notification-progress {
          animation: shrinkBar 8s linear forwards;
        }
      `}</style>

      {/* Colored accent top bar */}
      <div className={`h-1 w-full ${c.bar}`} />

      <div className="px-4 py-3 flex items-start gap-3">
        {/* Icon dot */}
        <div className={`mt-0.5 w-7 h-7 rounded-full ${c.iconBg} text-white flex items-center justify-center text-xs font-black flex-shrink-0`}>
          {c.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">{c.label}</p>
          <p className="text-sm font-bold text-foreground leading-snug">{notification.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{notification.message}</p>
        </div>

        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-muted hover:bg-border text-muted-foreground flex items-center justify-center transition-colors"
          aria-label="Chiudi"
        >
          <X size={10} />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 bg-muted">
        <div className={`h-full notification-progress ${c.bar} opacity-40`} />
      </div>
    </div>
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

      <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
        {/* Info panel */}
        <div className="flex gap-3 bg-muted/20 p-3 rounded-2xl border border-border/20">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <AppImage src={item.image} alt={item.imageAlt} fill className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
            {item.dishTags && item.dishTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5 mt-0.5 animate-in fade-in duration-200">
                {item.dishTags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center text-[8px] font-extrabold border rounded px-1.5 py-0.5 shadow-sm ${getTagStyle(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
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
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${isRemoved
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
                      <div data-lenis-prevent className="p-2 space-y-1.5 bg-card border-t border-border/40 max-h-[25vh] overflow-y-auto">
                        {category.items.map((ext) => {
                          const isAdded = added.some((e) => e.name === ext.name);
                          return (
                            <button
                              key={`extra-${ext.name}`}
                              type="button"
                              onClick={() => toggleExtra(ext)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${isAdded
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
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all duration-150 ${isSelected
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
  const { validatePromo, promos } = usePromoCode(slug);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromoDetail, setAppliedPromoDetail] = useState<any>(null);
  const [serviceHoursConfig, setServiceHoursConfig] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      const rId = getRestaurantId(slug);
      const loadConfig = () => {
        const stored = localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) || localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
        if (stored) {
          try {
            setServiceHoursConfig(JSON.parse(stored));
          } catch (e) {
            console.error('Error loading service hours in storefront:', e);
          }
        } else {
          setServiceHoursConfig(null);
        }
      };

      loadConfig();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEYS.serviceHours(rId) || e.key === STORAGE_KEYS.serviceHours(slug)) {
          loadConfig();
        }
      };
      window.addEventListener('storage', handleStorageChange);

      const handleCustomEvent = () => {
        loadConfig();
      };
      window.addEventListener(`iGO_service_hours_${rId}_updated`, handleCustomEvent);
      window.addEventListener(`iGO_service_hours_${slug}_updated`, handleCustomEvent);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener(`iGO_service_hours_${rId}_updated`, handleCustomEvent);
        window.removeEventListener(`iGO_service_hours_${slug}_updated`, handleCustomEvent);
      };
    }
  }, [slug]);

  const [menuItemsList, setMenuItemsList] = useState<MenuItemType[]>(() => {
    if (typeof window !== 'undefined' && slug) {
      const restaurantId = getRestaurantId(slug);
      if (!isMockRestaurant(slug) && !isMockRestaurant(restaurantId)) {
        return [];
      }
    }
    return menuItems;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      const restaurantId = getRestaurantId(slug);
      const stored = localStorage.getItem(STORAGE_KEYS.menuItems(slug)) || localStorage.getItem(STORAGE_KEYS.menuItems(restaurantId));
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMenuItemsList(parsed);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored menu items:', e);
        }
      }
      if (!isMockRestaurant(slug) && !isMockRestaurant(restaurantId)) {
        setMenuItemsList([]);
      } else {
        setMenuItemsList(menuItems);
      }
    }
  }, [slug]);

  // Dynamic categories list based on loaded menu items
  const categories = [
    'Promozioni',
    ...Array.from(new Set(menuItemsList.map((item) => item.category).filter((cat) => cat !== 'Promozioni')))
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Promozioni');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`iGO_last_order_${slug}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [incomingNotification, setIncomingNotification] = useState<{
    variant: 'success' | 'warning' | 'danger';
    title: string;
    message: string;
    orderId: string;
  } | null>(null);
  const [availabilityError, setAvailabilityError] = useState<'closed' | 'no_delivery' | 'paused' | null>(null);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [simulatedDay, setSimulatedDay] = useState<string | null>(null);
  const [simulatedDate, setSimulatedDate] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen to order updates in localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !lastCreatedOrder) return;
    const rId = getRestaurantId(slug);
    const ordersKey = STORAGE_KEYS.orders(rId);
    const bookingsKey = STORAGE_KEYS.bookings(rId);

    const checkOrderStatusUpdate = () => {
      try {
        if (lastCreatedOrder.type === 'prenotazione_tavolo' || lastCreatedOrder.id.startsWith('booking-')) {
          const rawBookings = localStorage.getItem(bookingsKey);
          if (!rawBookings) return;
          const bookings = JSON.parse(rawBookings);
          const currentBooking = bookings.find((b: any) => b.id === lastCreatedOrder.id);

          if (currentBooking) {
            if (currentBooking.status !== lastCreatedOrder.status) {
              const oldStatus = lastCreatedOrder.status;
              const newStatus = currentBooking.status;

              // Only transition if oldStatus is pending and newStatus is confirmed/cancelled
              if (oldStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
                const restName = restaurantSettings?.name || 'iGOdelivering';
                const customerName = lastCreatedOrder.name || 'Cliente';
                const dateFormatted = new Date(lastCreatedOrder.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                const timeStr = lastCreatedOrder.time;

                let variant: 'success' | 'warning' | 'danger' = 'success';
                let title = '';
                let message = '';

                if (newStatus === 'cancelled') {
                  variant = 'danger';
                  title = `Prenotazione Rifiutata ❌`;
                  message = `Spiacenti ${customerName}, la tua prenotazione per il tavolo il ${dateFormatted} alle ${timeStr} non è stata accettata dal ristorante. Contattaci per trovare un'alternativa.`;
                } else if (newStatus === 'confirmed') {
                  variant = 'success';
                  title = `Tavolo Confermato! 📅`;
                  message = `Ottime notizie ${customerName}! La tua prenotazione per il tavolo il ${dateFormatted} alle ${timeStr} è stata confermata da ${restName}. ${lastCreatedOrder.preOrderItems && lastCreatedOrder.preOrderItems.length > 0 ? 'Anche i piatti pre-ordinati sono confermati ed in preparazione.' : 'Ti aspettiamo al locale!'}`;
                }

                setIncomingNotification({ variant, title, message, orderId: lastCreatedOrder.id });
                setLastCreatedOrder(currentBooking);
                sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(currentBooking));
              }
            }
          }
        } else {
          const rawOrders = localStorage.getItem(ordersKey);
          if (!rawOrders) return;
          const orders = JSON.parse(rawOrders);
          const currentOrder = orders.find((o: any) => o.id === lastCreatedOrder.id);

          if (currentOrder) {
            // If status transitioned
            if (currentOrder.status !== lastCreatedOrder.status) {
              const oldStatus = lastCreatedOrder.status;
              const newStatus = currentOrder.status;

              // Trigger notification only for valid transitions
              const validTransitions = [
                ['new', 'accepted'],
                ['new', 'rejected'],
                ['accepted', 'completed'],
                ['new', 'completed'],
              ];
              const isValidTransition = validTransitions.some(
                ([from, to]) => oldStatus === from && newStatus === to
              );

              if (isValidTransition) {
                const restName = restaurantSettings?.name || 'iGOdelivering';
                const customerName = lastCreatedOrder.customer?.name || lastCreatedOrder.customerName || 'Cliente';
                const tableNum = lastCreatedOrder.tableNumber;
                const isTable = lastCreatedOrder.type === 'tavolo';

                let variant: 'success' | 'warning' | 'danger' = 'success';
                let title = '';
                let message = '';

                if (newStatus === 'rejected') {
                  variant = 'danger';
                  title = isTable
                    ? `Ordine Tavolo ${tableNum} non accettato`
                    : `Il tuo ordine non è stato accettato`;
                  message = isTable
                    ? `Spiacenti, il tuo ordine al tavolo ${tableNum} è stato rifiutato dal ristorante. Chiedi al personale di sala.`
                    : `Spiacenti, ${customerName}, il tuo ordine (${lastCreatedOrder.id}) non è stato accettato da ${restName}. Contatta il ristorante per maggiori informazioni.`;
                } else if (newStatus === 'accepted') {
                  variant = 'success';
                  title = isTable
                    ? `Tavolo ${tableNum} — Ordine accettato`
                    : `Ordine confermato`;
                  message = isTable
                    ? `Il tuo ordine è stato accettato ed è ora in preparazione!`
                    : `${customerName}, il tuo ordine (${lastCreatedOrder.id}) è stato accettato da ${restName} ed è in preparazione.`;
                } else if (newStatus === 'completed') {
                  variant = 'warning';
                  title = isTable
                    ? `Tavolo ${tableNum} — Ordine pronto`
                    : `Ordine pronto`;
                  message = isTable
                    ? `Il tuo ordine è pronto e sta arrivando al tavolo. Buon appetito!`
                    : `${customerName}, il tuo ordine è pronto! ${lastCreatedOrder.type === 'domicilio'
                      ? 'Il corriere è in arrivo.'
                      : 'Puoi ritirarlo al locale.'
                    }`;
                }

                setIncomingNotification({ variant, title, message, orderId: lastCreatedOrder.id });

                // Update tracked state so next transition is detected correctly
                setLastCreatedOrder(currentOrder);
                sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(currentOrder));
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking order status:', e);
      }
    };

    // Run initially in case it changed while offline or in transition
    checkOrderStatusUpdate();

    // Listen to standard storage events (across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ordersKey || e.key === bookingsKey) {
        checkOrderStatusUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen to custom local events (same tab)
    window.addEventListener('iGO_orders_updated', checkOrderStatusUpdate);
    window.addEventListener('iGO_bookings_updated', checkOrderStatusUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('iGO_orders_updated', checkOrderStatusUpdate);
      window.removeEventListener('iGO_bookings_updated', checkOrderStatusUpdate);
    };
  }, [lastCreatedOrder, slug, restaurantSettings]);

  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);
  const [myOrdersEmail, setMyOrdersEmail] = useState('');
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any | null>(null);
  const [historyEmailInput, setHistoryEmailInput] = useState('');
  const [historyEmailError, setHistoryEmailError] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href.split('?')[0];
      navigator.clipboard.writeText(url).then(() => {
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      });
    }
  };

  const handlePrintReceipt = (order: any) => {
    if (!order) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const restName = restaurantSettings.name || 'iGOdelivering';
    const logoHtml = restaurantSettings.logoUrl
      ? `<img src="${restaurantSettings.logoUrl}" style="max-height: 48px; margin-bottom: 8px;" />`
      : ``;

    const itemsHtml = order.items.map((item: any) => {
      const customNotes = (item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0)
        ? '<div style="font-size: 10px; color: #666; margin-top: 2px;">' +
        item.addedIngredients?.map((i: any) => '+' + i.name).concat(item.removedIngredients?.map((i: string) => '-' + i)).join(', ') +
        '</div>'
        : '';
      const itemPrice = (item.price + (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) * item.qty;
      return '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">' +
        '<div>' +
        '<strong>' + item.qty + 'x ' + item.name + '</strong>' +
        customNotes +
        '</div>' +
        '<span>&euro; ' + itemPrice.toFixed(2) + '</span>' +
        '</div>';
    }).join('');

    const tableRow = order.type === 'tavolo'
      ? '<div class="row"><strong>Tavolo:</strong> <span>' + order.tableNumber + '</span></div>'
      : '<div class="row"><strong>Cliente:</strong> <span>' + (order.customer?.name || order.customerName) + '</span></div>' +
      '<div class="row"><strong>Telefono:</strong> <span>' + order.customer?.phone + '</span></div>' +
      (order.type === 'domicilio' ? '<div class="row"><strong>Indirizzo:</strong> <span>' + order.customer?.address + '</span></div>' : '');

    const deliveryFeeRow = order.deliveryFee > 0
      ? '<div class="row"><span>Consegna:</span> <span>&euro; ' + order.deliveryFee.toFixed(2) + '</span></div>'
      : '';
    const discountRow = order.discount > 0
      ? '<div class="row" style="color: #16a34a;"><span>Sconto:</span> <span>-&euro; ' + order.discount.toFixed(2) + '</span></div>'
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Ricevuta Ordine - ${order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            .container { max-width: 320px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 12px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .section { border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
            .totals { margin-top: 8px; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 15px; margin-top: 8px; border-top: 1px solid #333; padding-top: 8px; color: #e11d48; }
            .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoHtml}
              <div style="font-size: 16px; font-weight: 800; text-transform: uppercase;">${restName}</div>
              <div style="font-size: 10px; color: #777; margin-top: 4px;">Ricevuta Digitale</div>
            </div>
            
            <div class="section">
              <div class="row"><strong>ID Ordine:</strong> <span>${order.id}</span></div>
              <div class="row"><strong>Data:</strong> <span>${new Date(order.timestamp).toLocaleString('it-IT')}</span></div>
              <div class="row"><strong>Servizio:</strong> <span style="text-transform: capitalize;">${order.type}</span></div>
              ${tableRow}
              <div class="row"><strong>Pagamento:</strong> <span>${order.payMethod === 'online' ? 'Online' : 'Contanti'}</span></div>
            </div>
            
            <div class="section">
              ${itemsHtml}
            </div>
            
            <div class="totals">
              <div class="row"><span>Subtotale:</span> <span>&euro; ${order.subtotal.toFixed(2)}</span></div>
              ${deliveryFeeRow}
              ${discountRow}
              <div class="total-row"><span>Totale:</span> <span>&euro; ${order.total.toFixed(2)}</span></div>
            </div>
            
            <div class="footer">
              Grazie per il tuo ordine!<br>A presto!
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const DigitalReceipt = ({ order, onPrint }: { order: any, onPrint?: () => void }) => {
    if (!order) return null;
    return (
      <div className="border border-border/80 rounded-xl bg-muted/30 p-4 text-left space-y-4 max-w-md mx-auto relative overflow-hidden" id={`receipt-${order.id}`}>
        <div className="flex justify-between items-start border-b border-border/40 pb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ID ORDINE</p>
            <p className="text-sm font-black font-mono text-foreground">{order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">DATA & ORA</p>
            <p className="text-xs font-semibold text-foreground">
              {new Date(order.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Riferimenti</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Servizio:</span>
            <span className="font-bold text-foreground capitalize">{order.type}</span>
          </div>
          {order.deliveryTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Programmato per:</span>
              <span className="font-bold text-amber-500">
                {order.deliveryDate ? `${new Date(order.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ` : ''}
                {order.deliveryTime === 'asap' ? 'Il prima possibile' : `alle ${order.deliveryTime}`}
              </span>
            </div>
          )}
          {order.type === 'tavolo' ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tavolo:</span>
              <span className="font-extrabold text-primary">{order.tableNumber}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-foreground">{order.customer?.name || order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefono:</span>
                <span className="font-semibold text-foreground">{order.customer?.phone}</span>
              </div>
              {order.type === 'domicilio' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indirizzo:</span>
                  <span className="font-semibold text-foreground text-right max-w-[200px] truncate" title={order.customer?.address}>
                    {order.customer?.address}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagamento:</span>
            <span className="font-semibold text-foreground uppercase">{order.payMethod === 'online' ? 'Carta (Online)' : 'Alla consegna'}</span>
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Prodotti Ordinati</p>
          <ul className="space-y-2 text-xs">
            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
              <li key={`receipt-item-${idx}`} className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-foreground truncate">{item.qty}× {item.name}</p>
                  {(item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {item.addedIngredients?.map((i: any) => `+${i.name}`).concat(item.removedIngredients?.map((i: string) => `-${i}`)).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-bold text-foreground tabular-nums">€ {((item.price + (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) * item.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border/40 pt-3 text-xs space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotale:</span>
            <span className="tabular-nums">€ {order.subtotal.toFixed(2)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Consegna:</span>
              <span className="tabular-nums">€ {order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-[var(--success)] font-semibold">
              <span>Sconto {order.promoApplied ? `(${order.promoApplied})` : ''}:</span>
              <span className="tabular-nums">- € {order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-foreground border-t border-border/40 pt-2">
            <span>Totale Ordine:</span>
            <span className="text-primary tabular-nums">€ {order.total.toFixed(2)}</span>
          </div>
        </div>

        {onPrint && (
          <button
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <Printer size={12} />
            Stampa Ricevuta
          </button>
        )}
      </div>
    );
  };

  const [promoCode, setPromoCode] = useState('');

  const [promoApplied, setPromoApplied] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingGuests, setBookingGuests] = useState(2);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('20:00');
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingWithPreOrder, setBookingWithPreOrder] = useState(false);
  const [bookingPreOrderItems, setBookingPreOrderItems] = useState<CartItem[]>([]);
  const [bookingStep, setBookingStep] = useState<'info' | 'preorder' | 'summary'>('info');
  const [isBookingPreOrderCustomizing, setIsBookingPreOrderCustomizing] = useState(false);
  const [bookingContext, setBookingContext] = useState<{
    date: string;
    time: string;
    guests: number;
    name: string;
    phone: string;
    note: string;
  } | null>(null);

  // Genera intervalli orari in cui il locale è effettivamente aperto per prenotazioni
  const bookingTimeSlots = React.useMemo(() => {
    // 1. Determina il giorno della settimana per la data selezionata
    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    let targetDayName = '';
    if (bookingDate) {
      const parts = bookingDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      targetDayName = DAYS_MAP[d.getDay()];
    } else {
      targetDayName = simulatedDay || DAYS_MAP[new Date().getDay()];
    }

    // 2. Cerca le fasce orarie specifiche di prenotazione (reservation) o general
    let activeRanges: { start: string; end: string }[] = [];
    let hasDedicatedReservationHours = false;

    if (serviceHoursConfig) {
      const useGeneral = serviceHoursConfig.useGeneral?.reservation !== false && !!serviceHoursConfig.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : 'reservation';
      const dayConfig = serviceHoursConfig.serviceHours?.[targetHoursKey]?.[targetDayName];

      if (dayConfig && dayConfig.enabled !== false) {
        if (dayConfig.lunchEnabled !== false && dayConfig.lunch) {
          activeRanges.push({ start: dayConfig.lunch.from, end: dayConfig.lunch.to });
        }
        if (dayConfig.dinnerEnabled !== false && dayConfig.dinner) {
          activeRanges.push({ start: dayConfig.dinner.from, end: dayConfig.dinner.to });
        }
        if (targetHoursKey === 'reservation') {
          hasDedicatedReservationHours = true;
        }
      }
    }

    // Se non troviamo configurazioni avanzate, usiamo gli orari di apertura generali del locale
    if (activeRanges.length === 0) {
      activeRanges = restaurantSettings.openingHours || [];
    }

    const slots: string[] = [];
    if (activeRanges.length === 0) {
      // Fallback standard pranzo e cena (con cut-off di 1 ora: pranzo fino alle 14:00, cena fino alle 22:00)
      for (let h = 12; h <= 14; h++) {
        for (let m = 0; m < 60; m += 15) {
          if (h === 14 && m > 0) continue; // Ultimo slot ore 14:00
          slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      for (let h = 19; h <= 22; h++) {
        for (let m = 0; m < 60; m += 15) {
          if (h === 22 && m > 0) continue; // Ultimo slot ore 22:00
          slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      return slots;
    }

    activeRanges.forEach((range) => {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      // Se l'admin ha definito orari dedicati alle prenotazioni, li applichiamo esattamente (senza sottrarre orari).
      // Se invece usiamo gli orari generali come ripiego, applichiamo un cut-off protettivo di 1 ora prima della chiusura.
      const cutoffMin = hasDedicatedReservationHours ? endMin : (endMin - 60);

      for (let min = startMin; min <= cutoffMin; min += 15) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    });

    return Array.from(new Set(slots)).sort();
  }, [restaurantSettings.openingHours, serviceHoursConfig, bookingDate, simulatedDay]);

  // Sincronizza orario di prenotazione con gli slot orari validi
  useEffect(() => {
    if (bookingTimeSlots.length > 0) {
      if (!bookingTime || !bookingTimeSlots.includes(bookingTime)) {
        if (bookingTimeSlots.includes('20:00')) {
          setBookingTime('20:00');
        } else if (bookingTimeSlots.includes('13:00')) {
          setBookingTime('13:00');
        } else {
          setBookingTime(bookingTimeSlots[0]);
        }
      }
    }
  }, [bookingTimeSlots, bookingTime]);

  const addBookingPreOrderItemCustom = (
    item: MenuItemType,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    const customizationsKey = JSON.stringify({ addedIngredients, removedIngredients, note });
    setBookingPreOrderItems((prev) => {
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
        cartId: `bk-${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        price: item.price + extraPrice,
        qty,
        addedIngredients,
        removedIngredients,
        note,
      };

      return [...prev, customizedItem];
    });
  };

  const updateBookingPreOrderItem = (
    cartId: string,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    setBookingPreOrderItems((prev) =>
      prev.map((c) => {
        if (c.cartId !== cartId) return c;
        const extraPrice = addedIngredients.reduce((sum, ext) => sum + ext.price, 0);
        const baseItem = menuItemsList.find((m) => m.id === c.id) || c;
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

  const handleEditBookingPreOrderItem = (item: CartItem) => {
    const baseItem = menuItemsList.find((m) => m.id === item.id);
    if (baseItem) {
      setCustomizingCartItem(item);
      setCustomizingItem(baseItem);
      setIsBookingPreOrderCustomizing(true);
    }
  };

  const handleCustomizeBookingPreOrderItem = (item: MenuItemType) => {
    setCustomizingCartItem(null);
    setCustomizingItem(item);
    setIsBookingPreOrderCustomizing(true);
  };
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
        if (data.email) {
          setEmail(data.email);
          setMyOrdersEmail(data.email.trim().toLowerCase());
        }
        if (data.address) setAddress(data.address);
        if (data.deliveryType) setDeliveryType(data.deliveryType);
      }
    } catch (err) {
      console.error('Error loading saved guest info:', err);
    }
  }, [slug]);

  const getCurrentTimeStr = () => {
    if (simulatedTime && simulatedTime !== 'paused') return simulatedTime;
    const now = new Date();
    return (
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0')
    );
  };

  const getCurrentDateStr = React.useCallback(() => {
    if (simulatedDate) return simulatedDate;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [simulatedDate]);

  const checkServiceOpen = React.useCallback((serviceType: 'pickup' | 'delivery' | 'reservation') => {
    if (simulatedTime === 'paused') return false;

    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored = localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) || localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) { }
      }
    }

    if (config) {
      // Controllo chiusura temporanea (es. ferie)
      if (config.temporaryClosure?.enabled && config.temporaryClosure.from && config.temporaryClosure.to) {
        const currentDate = getCurrentDateStr();
        if (currentDate >= config.temporaryClosure.from && currentDate <= config.temporaryClosure.to) {
          return false;
        }
      }

      if (config.serviceSuspended?.[serviceType] === true) {
        return false;
      }
      const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
      const todayDayName = simulatedDay || DAYS_MAP[new Date().getDay()];

      const useGeneral = config.useGeneral?.[serviceType] !== false && !!config.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : serviceType;

      const dayConfig = config.serviceHours?.[targetHoursKey]?.[todayDayName];
      if (dayConfig) {
        if (dayConfig.enabled === false) {
          return false;
        }
        const currentStr = getCurrentTimeStr();

        const lunchEnabled = dayConfig.lunchEnabled !== false;
        const inLunch = currentStr >= dayConfig.lunch.from && currentStr <= dayConfig.lunch.to;

        const dinnerEnabled = dayConfig.dinnerEnabled !== false;
        const inDinner = currentStr >= dayConfig.dinner.from && currentStr <= dayConfig.dinner.to;

        return (lunchEnabled && inLunch) || (dinnerEnabled && inDinner);
      }
    }

    // Fallback to legacy check
    const currentStr = getCurrentTimeStr();
    if (serviceType === 'delivery') {
      return !restaurantSettings.deliveryHours ||
        restaurantSettings.deliveryHours.length === 0 ||
        restaurantSettings.deliveryHours.some((h) => currentStr >= h.start && currentStr <= h.end);
    } else {
      return !restaurantSettings.openingHours ||
        restaurantSettings.openingHours.length === 0 ||
        restaurantSettings.openingHours.some((h) => currentStr >= h.start && currentStr <= h.end);
    }
  }, [simulatedTime, simulatedDay, simulatedDate, serviceHoursConfig, slug, restaurantSettings, getCurrentDateStr]);

  const getClosedReason = () => {
    if (simulatedTime === 'paused') {
      return 'Il ristorante ha temporaneamente sospeso la ricezione degli ordini. Puoi consultare il menu ma non ordinare.';
    }

    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored = localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) || localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try { config = JSON.parse(stored); } catch (e) { }
      }
    }

    if (config) {
      // Controllo chiusura temporanea (es. ferie)
      if (config.temporaryClosure?.enabled && config.temporaryClosure.from && config.temporaryClosure.to) {
        const currentDate = getCurrentDateStr();
        if (currentDate >= config.temporaryClosure.from && currentDate <= config.temporaryClosure.to) {
          return config.temporaryClosure.message || `Siamo chiusi per ferie dal ${config.temporaryClosure.from} al ${config.temporaryClosure.to}.`;
        }
      }
    }

    const activeType = deliveryType === 'domicilio' ? 'delivery' : 'pickup';
    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const todayDayName = simulatedDay || DAYS_MAP[new Date().getDay()];

    if (config) {
      if (config.serviceSuspended?.[activeType] === true) {
        return `Il servizio di ${activeType === 'delivery' ? 'Consegna' : 'Asporto'} è stato temporaneamente sospeso dal gestore.`;
      }

      const useGeneral = config.useGeneral?.[activeType] !== false && !!config.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : activeType;

      const dayConfig = config.serviceHours?.[targetHoursKey]?.[todayDayName];
      if (dayConfig) {
        if (dayConfig.enabled === false) {
          return `Spiacenti, il ristorante è chiuso il ${todayDayName} per il servizio di ${activeType === 'delivery' ? 'consegna' : 'asporto'}.`;
        }

        const lunchEnabled = dayConfig.lunchEnabled !== false;
        const dinnerEnabled = dayConfig.dinnerEnabled !== false;

        let hoursStr = '';
        if (lunchEnabled && dinnerEnabled) {
          hoursStr = `pranzo ${dayConfig.lunch.from}-${dayConfig.lunch.to}, cena ${dayConfig.dinner.from}-${dayConfig.dinner.to}`;
        } else if (lunchEnabled) {
          hoursStr = `pranzo ${dayConfig.lunch.from}-${dayConfig.lunch.to}`;
        } else if (dinnerEnabled) {
          hoursStr = `cena ${dayConfig.dinner.from}-${dayConfig.dinner.to}`;
        } else {
          hoursStr = `nessuna fascia oraria attiva`;
        }
        return `Ci dispiace, siamo fuori dall'orario di servizio. Orari ${todayDayName}: ${hoursStr}.`;
      }
    }

    return 'Ci dispiace, il ristorante è chiuso in questo momento. Puoi consultare il menu ma non ordinare.';
  };

  // Immediate Availability Check on Page Load & Config Changes
  useEffect(() => {
    const tavoloParam = searchParams?.get('tavolo');
    if (tavoloParam) {
      setAvailabilityError(null);
      return; // Skip closed/delivery popups for table ordering
    }

    if (simulatedTime === 'paused') {
      setAvailabilityError('paused');
      return;
    }

    const isPickupOpen = checkServiceOpen('pickup');
    const isDeliveryOpen = checkServiceOpen('delivery');

    if (!isPickupOpen && !isDeliveryOpen) {
      setAvailabilityError('closed');
      return;
    }

    if (deliveryType === 'domicilio' && !isDeliveryOpen) {
      setAvailabilityError('no_delivery');
      return;
    }

    setAvailabilityError(null);
  }, [simulatedTime, simulatedDay, simulatedDate, deliveryType, checkServiceOpen, searchParams]);

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

  // Lock scroll and stop Lenis when any modal or sheet is open
  useEffect(() => {
    const isAnyModalOpen = isDetailSheetOpen || checkoutOpen || !!availabilityError || cartOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      if (lenisRef.current) {
        lenisRef.current.stop();
      }
    } else {
      document.body.style.overflow = '';
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    }

    return () => {
      document.body.style.overflow = '';
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    };
  }, [isDetailSheetOpen, checkoutOpen, availabilityError, cartOpen]);

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
      setBookingDate(getCurrentDateStr());
    } catch (err) {
      console.error('Error loading saved booking info:', err);
    }
  }, [getCurrentDateStr]);

  // Dynamic Browser Tab Title Update
  useEffect(() => {
    if (restaurantSettings?.name) {
      document.title = `${restaurantSettings.name} | iGOdelivering`;
    }
  }, [restaurantSettings]);

  const triggerFlyToCart = () => {
    const sourceEl = document.getElementById('add-to-cart-confirm-btn');
    const targetEl = document.getElementById('header-cart-button');
    if (!sourceEl || !targetEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Create a temporary fly dot
    const flyDot = document.createElement('div');
    flyDot.className = 'fixed z-[9999] flex items-center justify-center bg-primary text-white text-[11px] font-black rounded-full pointer-events-none shadow-lg';
    flyDot.style.width = '30px';
    flyDot.style.height = '30px';
    flyDot.style.left = `${sourceRect.left + sourceRect.width / 2 - 15}px`;
    flyDot.style.top = `${sourceRect.top + sourceRect.height / 2 - 15}px`;
    flyDot.innerHTML = '+1';

    document.body.appendChild(flyDot);

    // Calculate relative translation distances
    const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    // Peak height of the parabolic arc
    const peakY = Math.min(0, dy) - 120;

    const tl = gsap.timeline({
      onComplete: () => {
        flyDot.remove();
        // Subtle bounce/shake animation on the header cart button
        gsap.timeline()
          .to(targetEl, { scale: 1.15, duration: 0.1 })
          .to(targetEl, { rotation: 8, duration: 0.05, repeat: 3, yoyo: true })
          .to(targetEl, { rotation: 0, scale: 1, duration: 0.1 });
      }
    });

    // Horizontal linear movement
    tl.to(flyDot, {
      x: dx,
      duration: 0.75,
      ease: 'power1.inOut'
    }, 0);

    // Vertical arc (goes up then falls down)
    tl.to(flyDot, {
      y: peakY,
      scale: 1.3,
      duration: 0.35,
      ease: 'power1.out'
    }, 0)
      .to(flyDot, {
        y: dy,
        scale: 0.4,
        opacity: 0.5,
        duration: 0.4,
        ease: 'power2.in'
      }, 0.35);
  };

  const addToCartCustom = (
    item: MenuItemType,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    if (isCurrentlyClosed) return;

    // Trigger fly-to-cart animation
    triggerFlyToCart();

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
        const baseItem = menuItemsList.find((m) => m.id === c.id) || c;
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
    const baseItem = menuItemsList.find((i) => i.id === cartItem.id) || cartItem;
    setCustomizingCartItem(cartItem);
    setCustomizingItem(baseItem);
  };

  const addToCart = (item: MenuItemType) => {
    if (isCurrentlyClosed) return;
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

  const activeServiceType = deliveryType === 'domicilio' ? 'delivery' : deliveryType === 'asporto' ? 'pickup' : 'reservation';
  const isCurrentlyClosed = isMounted ? !checkServiceOpen(activeServiceType) : false;

  const getRestaurantStatus = () => {
    if (!isMounted) {
      return { label: 'APERTO', color: 'bg-green-500/20 border-green-500/40 text-green-300' };
    }
    if (simulatedTime === 'paused') {
      return { label: 'TEMPORANEAMENTE CHIUSO', color: 'bg-red-500/20 border-red-500/40 text-red-300' };
    }

    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored = localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) || localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) { }
      }
    }

    if (config?.temporaryClosure?.enabled && config.temporaryClosure.from && config.temporaryClosure.to) {
      const currentDate = getCurrentDateStr();
      if (currentDate >= config.temporaryClosure.from && currentDate <= config.temporaryClosure.to) {
        return { label: 'CHIUSO PER FERIE', color: 'bg-red-500/20 border-red-500/40 text-red-300' };
      }
    }

    const isPickupOpen = checkServiceOpen('pickup');
    const isDeliveryOpen = checkServiceOpen('delivery');

    if (!isPickupOpen && !isDeliveryOpen) {
      return { label: 'CHIUSO', color: 'bg-red-500/20 border-red-500/40 text-red-300' };
    }
    if (isPickupOpen && !isDeliveryOpen) {
      return { label: 'SOLO ASPORTO', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };
    }
    return { label: 'APERTO', color: 'bg-green-500/20 border-green-500/40 text-green-300' };
  };

  const status = getRestaurantStatus();

  const formattedTodayHours = React.useMemo(() => {
    if (!isMounted) return '';

    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored = localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) || localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) { }
      }
    }

    if (config?.temporaryClosure?.enabled && config.temporaryClosure.from && config.temporaryClosure.to) {
      const currentDate = getCurrentDateStr();
      if (currentDate >= config.temporaryClosure.from && currentDate <= config.temporaryClosure.to) {
        return 'Ferie';
      }
    }

    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const todayDayName = simulatedDay || DAYS_MAP[new Date().getDay()];

    const activeType = deliveryType === 'domicilio' ? 'delivery' : deliveryType === 'asporto' ? 'pickup' : 'reservation';

    if (config) {
      if (config.serviceSuspended?.[activeType] === true) {
        return 'Sospeso';
      }

      const useGeneral = config.useGeneral?.[activeType] !== false && !!config.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : activeType;

      const dayConfig = config.serviceHours?.[targetHoursKey]?.[todayDayName];
      if (dayConfig) {
        if (dayConfig.enabled === false) {
          return 'Chiuso';
        }
        const lunchEnabled = dayConfig.lunchEnabled !== false;
        const dinnerEnabled = dayConfig.dinnerEnabled !== false;
        const parts = [];
        if (lunchEnabled && dayConfig.lunch) {
          parts.push(`${dayConfig.lunch.from}-${dayConfig.lunch.to}`);
        }
        if (dinnerEnabled && dayConfig.dinner) {
          parts.push(`${dayConfig.dinner.from}-${dayConfig.dinner.to}`);
        }
        return parts.length > 0 ? parts.join(', ') : 'Chiuso';
      }
    }

    const legacyHours = deliveryType === 'domicilio'
      ? restaurantSettings.deliveryHours
      : restaurantSettings.openingHours;

    if (legacyHours && legacyHours.length > 0) {
      const is24h = legacyHours.length === 1 && legacyHours[0].start === '00:00' && legacyHours[0].end === '23:59';
      if (is24h) {
        return '24 Ore';
      }
      return legacyHours.map(h => `${h.start}-${h.end}`).join(', ');
    }

    return 'Chiuso';
  }, [isMounted, simulatedDay, simulatedDate, serviceHoursConfig, slug, deliveryType, restaurantSettings, getCurrentDateStr]);

  // Dynamic promo banner text
  const activePromo = promos.find(p => p.active);
  let bannerText = '';
  if (activePromo) {
    if (activePromo.customBannerText) {
      bannerText = activePromo.customBannerText;
    } else {
      const minStr = activePromo.minOrderSubtotal && activePromo.minOrderSubtotal > 0
        ? ` con spesa minima di € ${activePromo.minOrderSubtotal.toFixed(2)}`
        : '';
      if (activePromo.type === 'percentage') {
        bannerText = `Usa il codice ${activePromo.code} per il ${activePromo.value}% di sconto${minStr}!`;
      } else if (activePromo.type === 'first_order') {
        bannerText = `Usa il codice ${activePromo.code} per il ${activePromo.value}% di sconto sul tuo primo ordine${minStr}!`;
      } else if (activePromo.type === 'fixed_amount') {
        bannerText = `Usa il codice ${activePromo.code} per uno sconto fisso di € ${activePromo.value.toFixed(2)}${minStr}!`;
      } else if (activePromo.type === 'threshold_based') {
        bannerText = `Usa il codice ${activePromo.code} per uno sconto di € ${activePromo.value.toFixed(2)}${minStr}!`;
      } else if (activePromo.type === 'free_delivery') {
        bannerText = `Usa il codice ${activePromo.code} per ottenere la consegna gratuita${minStr}!`;
      }
    }
  } else {
    bannerText = 'Usa il codice WELCOME10 per il 10% di sconto sul tuo primo ordine!';
  }

  const handleCheckoutClick = () => {
    if (deliveryType === 'tavolo') {
      setCartOpen(false);
      setCheckoutOpen(true);
      return;
    }

    if (simulatedTime === 'paused') {
      setAvailabilityError('paused');
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

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Delivery Fee is applied conditionally based on delivery method and promo threshold
  const isFreeDeliveryEligible =
    !!restaurantSettings.freeDeliveryActive &&
    subtotal >= (restaurantSettings.freeDeliveryThreshold || 0);
  const actualDeliveryFee =
    deliveryType === 'domicilio' && !isFreeDeliveryEligible
      ? (restaurantSettings.deliveryFee ?? 0)
      : 0;

  const discount =
    promoApplied && appliedPromoDetail
      ? (appliedPromoDetail.type === 'percentage' || appliedPromoDetail.type === 'first_order')
        ? subtotal * (appliedPromoDetail.value / 100)
        : appliedPromoDetail.type === 'free_delivery'
          ? actualDeliveryFee
          : Math.min(appliedPromoDetail.value, subtotal)
      : 0;

  const total = subtotal - discount + actualDeliveryFee;

  const applyPromo = () => {
    const res = validatePromo(promoCode, subtotal, email, deliveryType, actualDeliveryFee);
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

  // Dynamic promo validation when subtotal changes
  useEffect(() => {
    if (promoApplied && appliedPromoDetail) {
      const res = validatePromo(appliedPromoDetail.code, subtotal, email, deliveryType, actualDeliveryFee);
      if (!res.isValid) {
        setPromoApplied(false);
        setPromoError(res.error || "L'ordine non soddisfa più i requisiti della promo");
        setAppliedPromoDetail(null);
      }
    }
  }, [subtotal, promoApplied, appliedPromoDetail, validatePromo, email, deliveryType, actualDeliveryFee]);

  const filteredItems = menuItemsList.filter(
    (item) =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const promoItems = menuItemsList.filter(
    (item) => item.originalPrice && item.originalPrice > item.price
  );

  const displayedItems = searchQuery
    ? filteredItems
    : activeCategory === 'Promozioni'
      ? promoItems
      : menuItemsList.filter((i) => i.category === activeCategory);

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
      {/* Closed Banner */}
      {isCurrentlyClosed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-[10px] sm:text-xs font-bold py-2 px-3 text-center flex items-center justify-center gap-1.5 shadow-md">
          <Clock size={12} className="animate-pulse flex-shrink-0" />
          <span>{getClosedReason()}</span>
        </div>
      )}

      {/* Topbar */}
      {/* Topbar */}
      <header className={`fixed left-0 right-0 z-40 transition-all duration-300 ${isCurrentlyClosed ? 'top-8' : 'top-0'}`} ref={headerRef}>
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
                className={`w-full pl-9 pr-3 h-10 text-base rounded-xl focus:outline-none transition-all duration-300 ${!isScrolled
                  ? 'bg-white/10 text-white placeholder-white/60 border border-white/20 focus:bg-white/20 focus:ring-0 focus:border-white/40'
                  : 'bg-muted text-foreground placeholder-muted-foreground border border-border focus:ring-0 focus:border-primary'
                  }`}
              />
            </div>
          </div>

          {/* Desktop Booking & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Share Button */}
            <button
              onClick={handleShare}
              title="Condividi Vetrina"
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 shadow-sm ${!isScrolled
                ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
                : 'bg-secondary text-foreground hover:bg-muted border border-border'
                }`}
            >
              <Share2 size={16} />
            </button>

            {/* My Orders Button */}
            {deliveryType !== 'tavolo' && (
              <button
                onClick={() => {
                  setShowMyOrdersModal(true);
                  if (myOrdersEmail) {
                    try {
                      const rId = getRestaurantId(slug);
                      const custOrdersKey = STORAGE_KEYS.customerOrders(rId, myOrdersEmail);
                      const raw = localStorage.getItem(custOrdersKey);
                      if (raw) {
                        setHistoryOrders(JSON.parse(raw));
                      } else {
                        setHistoryOrders([]);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  } else {
                    setHistoryOrders([]);
                  }
                }}
                title="I miei ordini"
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 shadow-sm ${!isScrolled
                  ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
                  : 'bg-secondary text-foreground hover:bg-muted border border-border'
                  }`}
              >
                <History size={16} />
              </button>
            )}

            {/* Desktop Booking Button */}
            {deliveryType !== 'tavolo' && (
              <button
                onClick={() => setShowBookingModal(true)}
                className={`hidden sm:flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${!isScrolled
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
              id="header-cart-button"
              onClick={() => setCartOpen((o) => !o)}
              className={`relative flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${!isScrolled
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

      {/* Booking Context Bar (sticky under navbar) */}
      {bookingContext && (
        <div className={`fixed left-0 right-0 z-35 transition-all duration-300 ${isCurrentlyClosed ? 'top-[4.5rem]' : 'top-[3.5rem] sm:top-[4rem] md:top-[4.5rem]'} bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900/30 py-2.5 px-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]`}>
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold">
              <Calendar size={14} className="flex-shrink-0 animate-pulse text-green-600" />
              <span className="truncate text-foreground font-semibold">
                Tavolo: <span className="font-extrabold text-green-600 dark:text-green-400">{new Date(bookingContext.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} {bookingContext.time}</span> · {bookingContext.guests} {bookingContext.guests === 1 ? 'persona' : 'persone'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm text-[11px] uppercase tracking-wider"
              >
                Completa →
              </button>
              <button
                onClick={() => {
                  if (confirm("Vuoi annullare la prenotazione? Questo svuoterà anche il carrello.")) {
                    setBookingContext(null);
                    setCart([]);
                  }
                }}
                className="text-red-500 hover:text-red-700 font-bold px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-[11px] uppercase tracking-wider"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg font-black tracking-wide text-[10px] sm:text-xs ${status.color}`}
                  >
                    {status.label}
                  </span>
                  {isMounted && formattedTodayHours && (
                    <span className="flex items-center gap-1.5 border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg font-black tracking-wide text-[10px] sm:text-xs text-white">
                      <Clock size={11} className="text-white/70" />
                      <span>{formattedTodayHours}</span>
                    </span>
                  )}
                </div>
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
          </div>
        </div>
      </div>

      {/* Promo banner */}
      {deliveryType !== 'tavolo' && bannerText && (
        <div className="bg-secondary border-b border-orange-200">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-2.5 flex items-center gap-3">
            <Tag size={14} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-semibold">
              {activePromo ? (
                <>
                  {activePromo.customBannerText ? (
                    activePromo.customBannerText
                  ) : (
                    <>
                      Usa il codice <strong>{activePromo.code}</strong> per{' '}
                      {activePromo.type === 'percentage' && `ricevere il ${activePromo.value}% di sconto`}
                      {activePromo.type === 'first_order' && `ricevere il ${activePromo.value}% di sconto sul tuo primo ordine`}
                      {activePromo.type === 'fixed_amount' && `ricevere uno sconto fisso di € ${activePromo.value.toFixed(2)}`}
                      {activePromo.type === 'threshold_based' && `ricevere uno sconto di € ${activePromo.value.toFixed(2)}`}
                      {activePromo.type === 'free_delivery' && `ottenere la consegna gratuita`}
                      {activePromo.minOrderSubtotal && activePromo.minOrderSubtotal > 0 && ` su una spesa minima di € ${activePromo.minOrderSubtotal.toFixed(2)}`}
                      !
                    </>
                  )}
                </>
              ) : (
                <>
                  🎉 Usa il codice <strong>WELCOME10</strong> per il 10% di sconto sul tuo primo ordine!
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Sticky category nav */}
      <div className={`sticky z-30 bg-card border-b border-border shadow-card transition-all duration-300 ${bookingContext ? (isCurrentlyClosed ? 'top-32' : 'top-24 sm:top-28') : (isCurrentlyClosed ? 'top-24' : 'top-16')}`}>
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={`cat-nav-${cat}`}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-95 border ${isActive
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-border'
                    }`}
                >
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



              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
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
                isCurrentlyClosed={isCurrentlyClosed}
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
        disabled={isCurrentlyClosed}
        onClose={() => {
          setCustomizingItem(null);
          setCustomizingCartItem(null);
        }}
        onConfirm={(qty, addedIngredients, removedIngredients, note) => {
          if (customizingItem) {
            if (isBookingPreOrderCustomizing) {
              if (customizingCartItem) {
                updateBookingPreOrderItem(
                  customizingCartItem.cartId!,
                  qty,
                  addedIngredients,
                  removedIngredients,
                  note
                );
              } else {
                addBookingPreOrderItemCustom(customizingItem, qty, addedIngredients, removedIngredients, note);
              }
              setIsBookingPreOrderCustomizing(false);
            } else {
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
        currentTimeStr={getCurrentTimeStr()}
        openingHours={restaurantSettings.openingHours}
        deliveryHours={restaurantSettings.deliveryHours}
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        promoApplied={promoApplied}
        applyPromo={applyPromo}
        promoError={promoError}
        appliedPromoDetail={appliedPromoDetail}
        guests={guests}
        setGuests={setGuests}
        lastCreatedOrder={lastCreatedOrder}
        setLastCreatedOrder={setLastCreatedOrder}
        clearCart={() => setCart([])}
        bookingContext={bookingContext}
        setBookingContext={setBookingContext}
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
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${availabilityError === 'closed'
              ? 'bg-red-500/10 text-red-500'
              : availabilityError === 'paused'
                ? 'bg-zinc-500/10 text-zinc-500'
                : 'bg-amber-500/10 text-amber-500'
              }`}
          >
            {availabilityError === 'closed' ? (
              <Clock size={22} />
            ) : availabilityError === 'paused' ? (
              <PauseCircle size={22} />
            ) : (
              <Bike size={22} />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {availabilityError === 'closed'
                ? 'Locale Chiuso'
                : availabilityError === 'paused'
                  ? 'Ristorante in Pausa'
                  : 'Consegna Non Disponibile'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {getClosedReason()}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowBookingModal(false);
              setBookingConfirmed(false);
              setBookingStep('info');
              setBookingPreOrderItems([]);
            }}
          />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--success-bg)] flex items-center justify-center">
                  <CalendarCheck size={16} className="text-[var(--success)]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm leading-tight">Prenota un Tavolo</h3>
                  {!bookingConfirmed && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Dati prenotazione
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingConfirmed(false);
                  setBookingStep('info');
                  setBookingPreOrderItems([]);
                }}
                className="p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 min-h-0">

              {/* CONFIRMED */}
              {bookingConfirmed ? (
                <div className="px-6 py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-[var(--success)]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">Prenotazione Inviata!</h4>
                    <p className="text-xs text-muted-foreground">In attesa di conferma dal ristorante. Ti invieremo una notifica di conferma qui sul menu.</p>
                  </div>
                  <div className="bg-muted/60 rounded-2xl p-4 text-left space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Users size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>{bookingGuests} {bookingGuests === 1 ? 'persona' : 'persone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <CalendarCheck size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>{bookingDate} alle {bookingTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <User size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>{bookingName} ({bookingPhone})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setBookingConfirmed(false);
                      setBookingStep('info');
                      setBookingPreOrderItems([]);
                    }}
                    className="w-full bg-[var(--success)] text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    Chiudi
                  </button>
                </div>
              ) : (
                <div className="px-5 py-5 space-y-5">
                  {/* Date + Time side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Giorno *</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Orario *</label>
                      {bookingTimeSlots.length > 0 ? (
                        <select
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors"
                        >
                          <option value="">Orario...</option>
                          {bookingTimeSlots.map((slot) => (
                            <option key={`bk-slot-${slot}`} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors appearance-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Guests stepper */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Persone *</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBookingGuests((g) => Math.max(1, g - 1))}
                        className="w-10 h-10 rounded-xl bg-muted hover:bg-border transition-colors font-bold text-xl leading-none select-none"
                      >−</button>
                      <span className="text-2xl font-bold text-foreground w-10 text-center tabular-nums">{bookingGuests}</span>
                      <button
                        onClick={() => setBookingGuests((g) => Math.min(20, g + 1))}
                        className="w-10 h-10 rounded-xl bg-muted hover:bg-border transition-colors font-bold text-xl leading-none select-none"
                      >+</button>
                      <span className="text-xs text-muted-foreground">{bookingGuests === 1 ? 'persona' : 'persone'}</span>
                    </div>
                  </div>

                  {/* Name + Phone side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Nome *</label>
                      <input
                        type="text"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        placeholder="Il tuo nome"
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Telefono *</label>
                      <input
                        type="tel"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value.replace(/[^\d+]/g, ''))}
                        placeholder="+39 3331234567"
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Note (opzionale)</label>
                    <textarea
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      placeholder="Allergie, occasione speciale, seggiolone…"
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer CTA ──────────────────────────────────────── */}
            {!bookingConfirmed && (
              <div className="px-5 py-4 border-t border-border flex-shrink-0 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={!bookingDate || !bookingTime || bookingGuests < 1 || !bookingName.trim() || !bookingPhone.trim()}
                  onClick={() => {
                    // Submit Solo Tavolo
                    try {
                      localStorage.setItem('iGO_booking_info', JSON.stringify({ name: bookingName, phone: bookingPhone }));
                      const rId = getRestaurantId(slug);
                      const bookingsKey = STORAGE_KEYS.bookings(rId);
                      const existingStr = localStorage.getItem(bookingsKey);
                      let bookingsArray: any[] = [];
                      if (existingStr) {
                        try { bookingsArray = JSON.parse(existingStr); } catch (e) { console.error(e); }
                      }
                      const newBooking = {
                        id: `booking-${Date.now()}`,
                        restaurantId: rId,
                        name: bookingName.trim(),
                        phone: bookingPhone.trim(),
                        email: '',
                        guests: bookingGuests,
                        date: bookingDate,
                        time: bookingTime,
                        status: 'pending',
                        notes: bookingNote.trim(),
                        preOrderItems: [],
                        createdAt: new Date().toISOString(),
                      };
                      bookingsArray.push(newBooking);
                      localStorage.setItem(bookingsKey, JSON.stringify(bookingsArray));

                      const trackedOrder = {
                        ...newBooking,
                        type: 'prenotazione_tavolo',
                        customerName: bookingName,
                        total: 0,
                      };
                      setLastCreatedOrder(trackedOrder);
                      sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(trackedOrder));

                      window.dispatchEvent(new Event('iGO_bookings_updated'));
                      setBookingConfirmed(true);
                    } catch (err) {
                      console.error('Error saving booking:', err);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground py-3 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar size={14} /> Solo Tavolo
                </button>
                <button
                  disabled={!bookingDate || !bookingTime || bookingGuests < 1 || !bookingName.trim() || !bookingPhone.trim()}
                  onClick={() => {
                    // Ordina anche il cibo
                    if (cart.length > 0) {
                      const ok = window.confirm("Hai già dei piatti nel carrello. Vuoi svuotare il carrello e iniziare un ordine associato a questa prenotazione?");
                      if (!ok) return;
                    }
                    setCart([]);
                    setBookingContext({
                      name: bookingName.trim(),
                      phone: bookingPhone.trim(),
                      guests: bookingGuests,
                      date: bookingDate,
                      time: bookingTime,
                      note: bookingNote.trim(),
                    });
                    setDeliveryType('tavolo');
                    setShowBookingModal(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--success)] hover:bg-green-700 text-white py-3 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-500/10"
                >
                  <UtensilsCrossed size={14} /> Sì, ordina piatti
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {/* Floating Test controller for Simulation */}
      {isMounted && (
        <div className="fixed bottom-24 right-6 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-64 transition-all duration-300">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
            <Settings
              size={12}
              className="text-primary animate-spin"
              style={{ animationDuration: '4s' }}
            />{' '}
            Test Orari & Disponibilità
          </h4>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-zinc-400">Data Simulata (YYYY-MM-DD):</span>
              <input
                type="date"
                value={simulatedDate || ''}
                onChange={(e) => {
                  setAvailabilityError(null);
                  setSimulatedDate(e.target.value || null);
                  if (e.target.value) {
                    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                    const parts = e.target.value.split('-');
                    const localDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    const dayName = DAYS_MAP[localDate.getDay()];
                    setSimulatedDay(dayName);
                  }
                }}
                className="bg-zinc-100 dark:bg-zinc-800 text-[10px] rounded p-1 text-foreground border border-border focus:outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-zinc-400">Giorno Simulato:</span>
              <select
                value={simulatedDay || ''}
                onChange={(e) => {
                  setAvailabilityError(null);
                  setSimulatedDay(e.target.value || null);
                }}
                className="bg-zinc-100 dark:bg-zinc-800 text-[10px] rounded p-1 text-foreground border border-border focus:outline-none w-full"
              >
                <option value="">Giorno Reale ({['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][new Date().getDay()]})</option>
                <option value="Lunedì">Lunedì</option>
                <option value="Martedì">Martedì</option>
                <option value="Mercoledì">Mercoledì</option>
                <option value="Giovedì">Giovedì</option>
                <option value="Venerdì">Venerdì</option>
                <option value="Sabato">Sabato</option>
                <option value="Domenica">Domenica</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-zinc-400">Ora Simulata (HH:MM):</span>
              <div className="flex gap-1">
                <input
                  type="time"
                  value={simulatedTime && simulatedTime !== 'paused' ? simulatedTime : ''}
                  disabled={simulatedTime === 'paused'}
                  onChange={(e) => {
                    setAvailabilityError(null);
                    setSimulatedTime(e.target.value || null);
                  }}
                  className="bg-zinc-100 dark:bg-zinc-800 text-[10px] rounded p-1 text-foreground border border-border focus:outline-none flex-1"
                />
                <button
                  onClick={() => {
                    setAvailabilityError(null);
                    setSimulatedTime(null);
                    setSimulatedDay(null);
                    setSimulatedDate(null);
                  }}
                  className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 px-2 rounded text-[9px] font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="border-t border-border/40 my-1 pt-1 flex flex-col gap-1">
              <button
                onClick={() => {
                  setAvailabilityError(null);
                  if (simulatedTime === 'paused') {
                    setSimulatedTime(null);
                  } else {
                    setSimulatedTime('paused');
                  }
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg font-semibold transition-all ${simulatedTime === 'paused'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
              >
                <span>Forza Locale Chiuso (Pausa)</span>
                <span className="w-2 h-2 rounded-full bg-red-500" />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2 text-center leading-normal">
            Usa i selettori per cambiare il giorno e l&apos;ora simulati per validare le regole di apertura del locale.
          </p>
        </div>
      )}

      {/* My Orders Modal */}
      <Modal
        open={showMyOrdersModal}
        onClose={() => {
          setShowMyOrdersModal(false);
          setSelectedHistoryOrder(null);
        }}
        size="md"
        title={selectedHistoryOrder ? 'Dettaglio Ordine' : 'I Miei Ordini'}
      >
        {selectedHistoryOrder ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedHistoryOrder(null)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-2 animate-fade-in"
            >
              ← Torna alla lista
            </button>
            <DigitalReceipt order={selectedHistoryOrder} onPrint={() => handlePrintReceipt(selectedHistoryOrder)} />
          </div>
        ) : !myOrdersEmail ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!historyEmailInput.trim()) {
                setHistoryEmailError('L\'email è obbligatoria.');
                return;
              }
              if (!emailRegex.test(historyEmailInput.trim())) {
                setHistoryEmailError('Inserisci un indirizzo email valido.');
                return;
              }
              setHistoryEmailError(null);
              const cleanedEmail = historyEmailInput.trim().toLowerCase();
              setMyOrdersEmail(cleanedEmail);
              try {
                const rId = getRestaurantId(slug);
                const custOrdersKey = STORAGE_KEYS.customerOrders(rId, cleanedEmail);
                const raw = localStorage.getItem(custOrdersKey);
                if (raw) {
                  setHistoryOrders(JSON.parse(raw));
                } else {
                  setHistoryOrders([]);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            className="space-y-4 py-4 text-center"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <History size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Visualizza i tuoi ordini</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Inserisci l'email utilizzata per gli ordini per recuperare lo storico dei tuoi ultimi 10 acquisti.
              </p>
            </div>
            <div className="max-w-xs mx-auto space-y-3">
              <input
                type="email"
                required
                value={historyEmailInput}
                onChange={(e) => {
                  setHistoryEmailInput(e.target.value);
                  if (historyEmailError) setHistoryEmailError(null);
                }}
                placeholder="La tua email..."
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/50"
              />
              {historyEmailError && (
                <p className="text-xs text-red-500 font-semibold mt-1 text-left px-1">
                  {historyEmailError}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-[#d43d22] transition-colors"
              >
                Cerca Ordini
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">
                Ordini per: <strong className="text-foreground">{myOrdersEmail}</strong>
              </span>
              <button
                onClick={() => {
                  setMyOrdersEmail('');
                  setHistoryEmailInput('');
                  setHistoryOrders([]);
                }}
                className="text-[10px] text-red-500 font-bold hover:underline"
              >
                Cambia Email
              </button>
            </div>

            {historyOrders.length === 0 ? (
              <div className="text-center py-8 space-y-2 text-muted-foreground">
                <p className="text-sm">Nessun ordine trovato per questa email.</p>
                <p className="text-xs">Gli ordini effettuati compariranno qui.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {historyOrders.map((order: any) => {
                  // Fetch live status if changed in localstorage
                  let liveStatus = order.status;
                  try {
                    const rId = getRestaurantId(slug);
                    const rawAll = localStorage.getItem(STORAGE_KEYS.orders(rId));
                    if (rawAll) {
                      const allOrders = JSON.parse(rawAll);
                      const found = allOrders.find((o: any) => o.id === order.id);
                      if (found) liveStatus = found.status;
                    }
                  } catch (e) { }

                  const getStatusBadge = (st: string) => {
                    switch (st) {
                      case 'new':
                        return <Badge variant="info">Ricevuto</Badge>;
                      case 'accepted':
                        return <Badge variant="warning">In Cucina</Badge>;
                      case 'preparing':
                        return <Badge variant="warning">In Preparazione</Badge>;
                      case 'delivering':
                        return <Badge variant="primary">In Consegna</Badge>;
                      case 'completed':
                        return <Badge variant="success">Consegnato</Badge>;
                      default:
                        return <Badge>{st}</Badge>;
                    }
                  };

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedHistoryOrder({ ...order, status: liveStatus })}
                      className="border border-border hover:border-primary/30 rounded-xl p-3 bg-card flex justify-between items-center cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-foreground">{order.id}</span>
                          {getStatusBadge(liveStatus)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.timestamp).toLocaleDateString('it-IT')} - {order.itemsCount} {order.itemsCount === 1 ? 'prodotto' : 'prodotti'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs font-extrabold text-foreground">€ {order.total.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-primary uppercase">{order.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Mobile Sticky Bottom Bar for Cart */}
      {showCopiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 animate-fade-in backdrop-blur-xs">
          <span>Link copiato negli appunti!</span>
        </div>
      )}

      {incomingNotification && (
        <NotificationToast
          notification={incomingNotification}
          onClose={() => setIncomingNotification(null)}
        />
      )}
    </div>
  );
}
