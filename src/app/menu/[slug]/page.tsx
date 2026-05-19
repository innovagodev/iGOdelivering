'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Calendar,
  CalendarCheck,
  Edit2,
} from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

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
}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal - discount + restaurant.deliveryFee;
  const meetsMin = subtotal >= restaurant.minOrder;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" />
          <h3 className="font-bold text-foreground">Il tuo ordine</h3>
          <span className="bg-primary/10 text-primary text-xs font-extrabold px-2 py-0.5 rounded-full ml-1">
            {cart.reduce((s, i) => s + i.qty, 0)}
          </span>
        </div>
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-muted/65 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90"
          >
            <X size={15} />
          </button>
        )}
      </div>

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
              <li key={`cart-${item.cartId || item.id}`} className="flex items-start gap-3">
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
                      <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                        {item.addedIngredients?.map((ext) => (
                          <div key={ext.name} className="text-primary font-medium">
                            + {ext.name} (+€ {ext.price.toFixed(2)})
                          </div>
                        ))}
                        {item.removedIngredients?.map((rem) => (
                          <div key={rem} className="text-muted-foreground">
                            - Senza {rem}
                          </div>
                        ))}
                        {item.note && (
                          <div className="italic text-muted-foreground">
                            Note: "{item.note}"
                          </div>
                        )}
                      </div>
                    )}
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
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

          <div className="px-4 py-3 border-t border-border space-y-3">
            {/* Promo */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Codice promo"
                  value={promoCode}
                  onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
                  className="w-full pl-7 pr-2 py-2 text-base bg-muted border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors"
                />
              </div>
              <button
                onClick={onApplyPromo}
                disabled={!promoCode}
                className="px-3 py-2 bg-secondary text-primary text-xs font-semibold rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors border border-orange-200"
              >
                Applica
              </button>
            </div>
            {promoApplied && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success-bg)] rounded-lg px-3 py-2">
                <CheckCircle size={13} />
                Promo WELCOME10 applicata: −10%
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotale</span>
                <span className="tabular-nums">€ {subtotal.toFixed(2)}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-[var(--success)]">
                  <span>Sconto 10%</span>
                  <span className="tabular-nums">−€ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Consegna</span>
                <span className="tabular-nums">€ {restaurant.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                <span>Totale</span>
                <span className="tabular-nums">€ {total.toFixed(2)}</span>
              </div>
            </div>

            {!meetsMin && (
              <p className="text-[11px] text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-3 py-2">
                Ordine minimo € {restaurant.minOrder.toFixed(2)} — aggiungi ancora €{' '}
                {(restaurant.minOrder - subtotal).toFixed(2)}
              </p>
            )}

            <button
              onClick={onCheckout}
              disabled={!meetsMin}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 text-sm"
            >
              Procedi al pagamento → € {total.toFixed(2)}
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
              <Badge variant="primary" className={`shadow-sm font-bold bg-amber-500 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}>
                ⭐ POPOLARE
              </Badge>
            )}
            {item.veg && (
              <Badge variant="success" className={`shadow-sm font-bold bg-green-600 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}>
                🌿 VEG
              </Badge>
            )}
            {item.spicy && (
              <Badge variant="danger" className={`shadow-sm font-bold bg-red-600 text-white border-none ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px]'}`}>
                🌶️ SPICY
              </Badge>
            )}
          </div>
        </div>
        <div className={`${compact ? 'p-3 pb-1' : 'p-4'} flex-1`}>
          <h4 className={`font-bold text-foreground mb-1 group-hover:text-primary transition-colors ${compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-base'}`}>{item.name}</h4>
          <p className={`text-muted-foreground leading-relaxed ${compact ? 'text-[10px] mb-1.5 line-clamp-1 leading-normal' : 'text-xs mb-3 line-clamp-2'}`}>
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
      <div className={`${compact ? 'px-3 pb-3 pt-0.5' : 'px-4 pb-4 pt-1'} flex items-center justify-between`}>
        <div className="flex flex-col">
          <span className={`font-extrabold text-foreground ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>
            € {item.price.toFixed(2)}
          </span>
          {item.originalPrice && (
            <span className={`text-muted-foreground line-through decoration-red-500/50 ${compact ? 'text-[9px]' : 'text-xs'}`}>
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
              onClick={() => defaultCartItem && onRemove(defaultCartItem.cartId || defaultCartItem.id)}
              className={`${compact ? 'w-5 h-5 rounded-md' : 'w-7 h-7 rounded-lg'} bg-card hover:bg-border flex items-center justify-center transition-colors shadow-sm active:scale-90`}
            >
              <Minus size={compact ? 10 : 12} className="text-foreground" />
            </button>
            <span className={`w-5 text-center font-bold tabular-nums text-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>{defaultQty}</span>
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
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
}) {
  const [step, setStep] = useState<'details' | 'payment' | 'tracking'>('details');
  const [deliveryType, setDeliveryType] = useState<'domicilio' | 'asporto'>('domicilio');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'online'>('card');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem('iGO_guest_info');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.name) setName(data.name);
          if (data.phone) setPhone(data.phone);
          if (data.address) setAddress(data.address);
          if (data.deliveryType) setDeliveryType(data.deliveryType);
        }
      } catch (err) {
        console.error('Error loading saved guest info:', err);
      }
    }
  }, [open]);

  const handleOrder = () => {
    setLoading(true);
    if (rememberMe) {
      try {
        localStorage.setItem(
          'iGO_guest_info',
          JSON.stringify({ name, phone, address, deliveryType })
        );
      } catch (err) {
        console.error('Error saving guest info:', err);
      }
    } else {
      try {
        localStorage.removeItem('iGO_guest_info');
      } catch { }
    }
    setTimeout(() => {
      setLoading(false);
      setStep('tracking');
    }, 1800);
  };

  const detailsValid = deliveryType === 'asporto' ? !!name && !!phone : !!name && !!address && !!phone;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === 'tracking' ? 'Ordine in corso' : 'Checkout'}
    >
      {step === 'details' && (
        <div className="space-y-4">
          {/* Delivery type selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Modalità di consegna
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('domicilio')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${deliveryType === 'domicilio'
                  ? 'border-primary bg-secondary text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
              >
                <Bike size={16} />
                Consegna a domicilio
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('asporto')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${deliveryType === 'asporto'
                  ? 'border-primary bg-secondary text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
              >
                <Package size={16} />
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
                className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
          </div>

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
                  className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors"
                />
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
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 333 000 0000"
                className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
          </div>

          {/* Date & time — only for home delivery */}
          {deliveryType === 'domicilio' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Data di consegna
                </label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Ora di consegna
                </label>
                <div className="relative">
                  <Clock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
                  />
                </div>
              </div>
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
                  : 'Allergie, preferenze, orario di ritiro...'
              }
              rows={2}
              className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors resize-none"
            />
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Riepilogo ordine</p>
            {cart.map((item) => (
              <div key={`checkout-${item.id}`} className="flex justify-between text-sm">
                <span className="text-foreground">
                  {item.name} ×{item.qty}
                </span>
                <span className="tabular-nums font-semibold">
                  € {(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
              <span>Totale</span>
              <span className="tabular-nums">€ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-0 border-border cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="text-xs text-muted-foreground font-medium cursor-pointer select-none"
            >
              Ricordami su questo dispositivo (autocompila i prossimi ordini)
            </label>
          </div>

          <button
            onClick={() => setStep('payment')}
            disabled={!detailsValid}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Continua al pagamento →
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Metodo di pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['card', 'online', 'cash'] as const).map((m) => (
                <button
                  key={`pay-${m}`}
                  onClick={() => setPayMethod(m)}
                  className={`py-3 rounded-xl border text-xs font-semibold transition-all ${payMethod === m
                    ? 'border-primary bg-secondary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                >
                  {m === 'card' ? '💳 Carta' : m === 'online' ? '📱 Online' : '💵 Contanti'}
                </button>
              ))}
            </div>
          </div>
          {payMethod === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Numero carta
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Scadenza
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          )}
          {payMethod === 'cash' && (
            <div className="bg-[var(--warning-bg)] border border-amber-200 rounded-xl p-4 text-sm text-[var(--warning)]">
              Il corriere porterà il resto. Assicurati di avere il contante pronto alla consegna.
            </div>
          )}
          <div className="flex justify-between font-bold text-foreground bg-muted rounded-xl p-4">
            <span>Totale da pagare</span>
            <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="flex-1 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors text-sm"
            >
              ← Indietro
            </button>
            <button
              onClick={handleOrder}
              disabled={loading}
              className="flex-2 flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-sm disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Invio ordine...
                </>
              ) : (
                'Conferma Ordine 🍕'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'tracking' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={32} className="text-[var(--success)]" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Ordine confermato!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Stima consegna: <strong>25–40 minuti</strong>
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <ul className="space-y-4">
              {orderSteps.map((step) => (
                <li key={step.id} className="flex items-center gap-4 relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${step.done
                      ? 'bg-[var(--success)] text-white'
                      : step.active
                        ? 'bg-primary text-white animate-pulse-soft'
                        : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${step.done || step.active ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {step.label}
                    </p>
                    {step.active && <p className="text-xs text-primary mt-0.5">In corso...</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-sm"
          >
            Chiudi
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
        { name: 'Doppia Mozzarella', price: 1.50 },
        { name: 'Prosciutto Cotto', price: 1.50 },
        { name: 'Funghi Champignon', price: 1.00 },
        { name: 'Salame Piccante', price: 1.50 },
        { name: 'Olive Nere', price: 0.80 }
      ],
      removes: ['Basilico', 'Origano', 'Mozzarella']
    };
  }
  if (normalized === 'primi' || normalized === 'secondi' || normalized === 'antipasti') {
    return {
      extras: [
        { name: 'Parmigiano Reggiano', price: 1.20 },
        { name: 'Pane extra', price: 1.00 },
        { name: 'Olio al tartufo', price: 2.00 },
        { name: 'Pancetta croccante', price: 1.50 }
      ],
      removes: ['Pepe', 'Cipolla', 'Aglio', 'Prezzemolo']
    };
  }
  if (normalized === 'dolci') {
    return {
      extras: [
        { name: 'Panna montata', price: 1.00 },
        { name: 'Granella di nocciole', price: 0.80 },
        { name: 'Cioccolato fuso', price: 1.20 }
      ],
      removes: []
    };
  }
  if (normalized === 'bevande') {
    return {
      extras: [
        { name: 'Ghiaccio', price: 0.00 },
        { name: 'Fetta di limone', price: 0.50 }
      ],
      removes: ['Ghiaccio']
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

function CustomizationModal({
  item,
  cartItem,
  open,
  onClose,
  onConfirm,
}: {
  item: MenuItemType | null;
  cartItem?: CartItem | null;
  open: boolean;
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

  useEffect(() => {
    if (open && item) {
      if (cartItem) {
        setQty(cartItem.qty);
        setAdded(cartItem.addedIngredients || []);
        setRemoved(cartItem.removedIngredients || []);
        setNote(cartItem.note || '');
      } else {
        setQty(1);
        setAdded([]);
        setRemoved([]);
        setNote('');
      }
    }
  }, [open, item, cartItem]);

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
    setRemoved((prev) =>
      prev.includes(rem) ? prev.filter((r) => r !== rem) : [...prev, rem]
    );
  };

  const unitPrice = item.price + added.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = unitPrice * qty;

  return (
    <Modal open={open} onClose={onClose} title={cartItem ? `Modifica ${item.name}` : `Personalizza ${item.name}`}>
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border">
          <AppImage
            src={item.image}
            alt={item.imageAlt}
            fill
            className="object-cover"
          />
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>

        {removes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Rimuovi Ingredienti
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {removes.map((rem) => {
                const isRemoved = removed.includes(rem);
                return (
                  <button
                    key={`remove-${rem}`}
                    type="button"
                    onClick={() => toggleRemove(rem)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${isRemoved
                      ? 'border-red-200 bg-red-50/50 text-red-700'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                      }`}
                  >
                    <span>Senza {rem}</span>
                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      {isRemoved && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {extras.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Aggiungi Ingredienti (Extra)
            </h4>
            <div className="space-y-1.5">
              {extras.map((ext) => {
                const isAdded = added.some((e) => e.name === ext.name);
                return (
                  <button
                    key={`extra-${ext.name}`}
                    type="button"
                    onClick={() => toggleExtra(ext)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${isAdded
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                      }`}
                  >
                    <div className="flex flex-col items-start">
                      <span>{ext.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        + € {ext.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      {isAdded && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Note speciali per la cucina
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es. ben cotta, senza pepe, allergie particolari..."
            className="w-full p-3 text-base bg-muted border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors h-20 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border gap-4">
          <div className="flex items-center gap-3 bg-muted border border-border px-3 py-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            >
              <Minus size={15} />
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onConfirm(qty, added, removed, note)}
            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 shadow-md shadow-primary/10 text-sm"
          >
            {cartItem ? 'Salva Modifiche' : 'Aggiungi'} — € {totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CustomerStorefront() {
  const params = useParams();
  const slug = (params?.slug as string) || 'pizzeria-bella-napoli';
  const restaurant = getRestaurantBySlug(slug);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Promozioni');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
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
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const headerRef = useRef<HTMLElement>(null);
  const headerBgSolidRef = useRef<HTMLDivElement>(null);
  const headerBgGradRef = useRef<HTMLDivElement>(null);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

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
    if (restaurant?.name) {
      document.title = `${restaurant.name} | iGOdelivering`;
    }
  }, [restaurant]);

  const [customizingItem, setCustomizingItem] = useState<MenuItemType | null>(null);
  const [customizingCartItem, setCustomizingCartItem] = useState<CartItem | null>(null);

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
    // Immediate insertion for standard menu cards
    addToCartCustom(item, 1, [], [], '');
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((c) => c.cartId !== cartId);
      return prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  const deleteFromCart = (cartId: string) => setCart((prev) => prev.filter((c) => c.cartId !== cartId));

  const applyPromo = () => {
    if (promoCode === 'WELCOME10') setPromoApplied(true);
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal - discount + restaurant.deliveryFee;

  const filteredItems = menuItems.filter(
    (item) =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const promoItems = menuItems.filter((item) => item.originalPrice && item.originalPrice > item.price);

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
            {restaurant.logoUrl ? (
              <div className={`w-10 h-10 rounded-full overflow-hidden border bg-white flex items-center justify-center flex-shrink-0 shadow-sm transition-colors duration-300 ${!isScrolled ? 'border-white/20' : 'border-border/30'}`}>
                <img
                  src={restaurant.logoUrl}
                  alt={`Logo ${restaurant.name}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base flex-shrink-0 shadow-sm">
                {restaurant.name.charAt(0)}
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
                className={`w-full pl-9 pr-3 h-10 text-sm rounded-xl focus:outline-none transition-all duration-300 ${!isScrolled
                  ? 'bg-white/10 text-white placeholder-white/60 border border-white/20 focus:bg-white/20 focus:ring-0 focus:border-white/40'
                  : 'bg-muted text-foreground placeholder-muted-foreground border border-border focus:ring-0 focus:border-primary'
                  }`}
              />
            </div>
          </div>

          {/* Desktop Booking & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Desktop Booking Button */}
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

            {/* Cart Button (Visible on both desktop & mobile) */}
            <button
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

      {/* Restaurant Hero */}
      <div className="relative h-[22rem] sm:h-[26rem] md:h-[30rem] overflow-hidden">
        <AppImage
          src={restaurant.image}
          alt={restaurant.imageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10 text-white z-10">
          <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-5 lg:gap-8">

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2 leading-none">
                {restaurant.name}
              </h1>
              <p className="text-white/80 text-sm sm:text-base font-medium mb-4 max-w-2xl leading-relaxed">
                {restaurant.tagline}
              </p>

              <div className="flex flex-wrap items-center gap-y-2.5 gap-x-5 text-xs sm:text-sm font-semibold text-white/95">
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <strong>{restaurant.rating}</strong>
                  <span className="text-white/75">({restaurant.reviews} recensioni)</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Clock size={14} />
                  {restaurant.deliveryTime}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Bike size={14} />
                  Consegna € {restaurant.deliveryFee.toFixed(2)}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <MapPin size={14} />
                  {restaurant.address}
                </span>
              </div>
            </div>

            {/* Mobile/Desktop Booking Button */}
            <div className="flex sm:hidden mt-2">
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 bg-[var(--success)] hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg"
              >
                <CalendarCheck size={16} />
                PRENOTA UN TAVOLO
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Promo banner */}
      <div className="bg-secondary border-b border-orange-200">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-2.5 flex items-center gap-3">
          <Tag size={14} className="text-primary flex-shrink-0" />
          <p className="text-sm text-primary font-semibold">
            🎉 Usa il codice <strong>WELCOME10</strong> per il 10% di sconto sul tuo primo ordine!
          </p>
        </div>
      </div>

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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-95 border ${isActive
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
                {filteredItems.length} risultati per "{searchQuery}"
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Prova con un termine diverso
                  </p>
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
            onClick={() => setCartOpen(false)}
          />

          {/* Cart Card Container */}
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl border border-border shadow-[0_32px_64px_rgba(0,0,0,0.15)] flex flex-col h-[80vh] z-10 animate-fade-in overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <CartSidebar
                cart={cart}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onDelete={deleteFromCart}
                onEdit={handleEditCartItem}
                onCheckout={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
                promoCode={promoCode}
                onPromoChange={setPromoCode}
                promoApplied={promoApplied}
                onApplyPromo={applyPromo}
                restaurant={restaurant}
                showClose={true}
                onClose={() => setCartOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        total={total}
      />

      {/* Customization modal */}
      <CustomizationModal
        item={customizingItem}
        cartItem={customizingCartItem}
        open={customizingItem !== null}
        onClose={() => {
          setCustomizingItem(null);
          setCustomizingCartItem(null);
        }}
        onConfirm={(qty, added, removed, note) => {
          if (customizingItem) {
            if (customizingCartItem) {
              updateCartItem(customizingCartItem.cartId!, qty, added, removed, note);
            } else {
              addToCartCustom(customizingItem, qty, added, removed, note);
            }
            setCustomizingItem(null);
            setCustomizingCartItem(null);
          }
        }}
      />

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
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
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
                    className="w-full px-3 py-2.5 text-base bg-input border border-border rounded-xl focus:outline-none focus:ring-0 transition-colors min-w-0 appearance-none"
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
      <footer className="bg-card border-t border-border mt-8 py-8">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} iGOdelivering. Tecnologia di{' '}
            <a
              href="https://www.innovago.it"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-primary transition-colors text-foreground"
            >
              innovago.it
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Bar for Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/85 backdrop-blur-md border-t border-border z-30 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Il tuo ordine</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              € {total.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">({cartCount} prod.)</span>
            </span>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d43d22] transition-all active:scale-95 shadow-md shadow-primary/20"
          >
            <ShoppingCart size={16} />
            Vedi Carrello
          </button>
        </div>
      )}
    </div>
  );
}
