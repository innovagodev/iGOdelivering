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
  ArrowLeft,
  UtensilsCrossed,
  ChevronRight,
  Users,
  Leaf,
  Flame,
  Wheat,
  Sparkles,
  Milk,
  Heart,
  Fish,
  Apple,
  Coffee,
  Wine,
  Pizza,
  Snowflake,
  Vegan,
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
import { supabase } from '@/lib/supabase';
import { LanguageProvider, useLang } from '@/context/LanguageContext';


// ─── Types ────────────────────────────────────────────────────
interface MenuItemType {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  description_en?: string;
  image: string;
  imageAlt: string;
  popular?: boolean;
  veg?: boolean;
  spicy?: boolean;
  available?: boolean;
  allergens: string[];
  dishTags?: string[];
  ingredients?: string[];
  ingredients_en?: string[];
  optionGroups?: any[];
  customizationEnabled?: boolean;
  notesEnabled?: boolean;
}

interface CartItem extends MenuItemType {
  qty: number;
  note?: string;
  cartId?: string;
  addedIngredients?: { name: string; name_en?: string; price: number }[];
  removedIngredients?: string[];
  selectedOptions?: any[];
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

// Mock data removed in favor of Supabase.
const menuItems: MenuItemType[] = [];

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
  isPreOrderAllowed = false,
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
  isPreOrderAllowed?: boolean;
}) {
  const { t, lang } = useLang();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal - discount + (deliveryType === 'domicilio' ? actualDeliveryFee : 0);
  const meetsMin = subtotal >= minOrder;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm">{t('cart_your_order')}</h3>
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
              {t('cart_clear')}
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
            <span>{t('cart_table', { n: tableNumber || (lang === 'en' ? 'To specify' : 'Da specificare') })}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">{t('cart_guests')}</label>
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
          <p className="font-semibold text-foreground text-sm">{t('cart_empty')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('cart_add_items')}
          </p>
        </div>
      ) : (
        <>
          <ul
            data-lenis-prevent
            className="flex-1 overflow-y-auto py-3 px-4 space-y-3 scrollbar-hide"
          >
            {cart.map((item) => (
              <li
                key={`cart-${item.cartId || item.id}`}
                className="flex items-start gap-3 border-b border-border/10 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">
                      {lang === 'en' && item.name_en ? item.name_en : item.name}
                    </p>
                    <button
                      onClick={() => onEdit(item)}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                      title={lang === 'en' ? 'Edit ingredients' : 'Modifica ingredienti'}
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
                            <span>+ {lang === 'en' && ext.name_en ? ext.name_en : ext.name}</span>
                            <span className="text-[9px] text-muted-foreground font-normal">
                              € {ext.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {item.removedIngredients?.map((rem) => (
                          <div key={rem} className="text-red-500 font-semibold flex justify-between">
                            <span>{lang === 'en' ? `- Without ${rem}` : `- Senza ${rem}`}</span>
                            <span className="text-[9px] text-red-400 font-normal">{t('cart_removed')}</span>
                          </div>
                        ))}
                        {item.note && (
                          <div className="italic text-muted-foreground pt-1 border-t border-border/20 mt-1">
                            {t('cart_notes')} &quot;{item.note}&quot;
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
                        {t('cart_free_delivery_warning', { amount: `€ ${(freeDeliveryThreshold - subtotal).toFixed(2)}` })}
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
                    {t('cart_free_delivery_success')}
                  </p>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              {promoApplied && appliedPromoDetail && (
                <div className="flex justify-between text-[var(--success)]">
                  <span>
                    {t('cart_discount')} (
                    {appliedPromoDetail.type === 'percentage'
                      ? `${appliedPromoDetail.value}%`
                      : `€${appliedPromoDetail.value.toFixed(2)}`}
                    )
                  </span>
                  <span className="tabular-nums font-semibold">−€ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-foreground text-sm pt-0.5">
                <span>{t('cart_total')}</span>
                <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
              </div>
            </div>

            {!meetsMin && (
              <p className="text-[10px] text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-2.5 py-1.5 leading-snug">
                {t('cart_min_order_warning', { min: `€ ${minOrder.toFixed(2)}`, diff: `€ ${(minOrder - subtotal).toFixed(2)}` })}
              </p>
            )}

            <button
              onClick={onCheckout}
              disabled={!meetsMin || (isCurrentlyClosed && !isPreOrderAllowed)}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 text-xs shadow-md shadow-primary/10"
            >
              {isCurrentlyClosed && !isPreOrderAllowed
                ? t('cart_closed')
                : isCurrentlyClosed
                  ? t('cart_preorder')
                  : t('cart_proceed')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const getCleanTagLabel = (tag: string) => {
  if (tag.includes(':')) {
    return tag.split(':').slice(1).join(':').trim();
  }
  // Strip emojis, variation selectors, and common symbols
  return tag
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B50}]|[\u{FE0F}]/gu, '')
    .trim();
};

const getTagStyle = (tag: string) => {
  let iconName = '';
  if (tag.includes(':')) {
    iconName = tag.split(':')[0].trim().toLowerCase();
  } else {
    const t = tag.toLowerCase();
    if (t.includes('vegan') || tag.includes('🌱')) {
      iconName = 'vegan';
    } else if (t.includes('vegetar') || tag.includes('🥗')) {
      iconName = 'leaf';
    } else if (
      t.includes('piccant') ||
      t.includes('diavola') ||
      t.includes('spicy') ||
      tag.includes('🌶️') ||
      tag.includes('🔥')
    ) {
      iconName = 'flame';
    } else if (t.includes('gluten') || t.includes('glutine') || tag.includes('🌾')) {
      iconName = 'wheat';
    } else if (
      t.includes('novit') ||
      t.includes('nuov') ||
      t.includes('new') ||
      tag.includes('🆕')
    ) {
      iconName = 'sparkles';
    } else if (
      t.includes('consigliat') ||
      t.includes('special') ||
      tag.includes('⭐') ||
      tag.includes('👑')
    ) {
      iconName = 'star';
    } else if (t.includes('lattosio') || tag.includes('🥛')) {
      iconName = 'milk';
    } else if (t.includes('surgelat') || t.includes('frozen') || tag.includes('❄️')) {
      iconName = 'snowflake';
    }
  }

  if (iconName === 'vegan' || iconName === 'leaf') {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (iconName === 'flame') {
    return 'text-rose-600 dark:text-rose-400';
  }
  if (iconName === 'wheat') {
    return 'text-amber-600 dark:text-amber-400';
  }
  if (iconName === 'sparkles') {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (iconName === 'star') {
    return 'text-amber-600 dark:text-amber-400';
  }
  if (iconName === 'snowflake') {
    return 'text-sky-500 dark:text-sky-450';
  }
  return 'text-slate-500 dark:text-slate-400';
};

const getTagIcon = (tag: string) => {
  let iconName: string | null = null;
  if (tag.includes(':')) {
    iconName = tag.split(':')[0].trim().toLowerCase();
  } else {
    const t = tag.toLowerCase();
    if (t.includes('vegan') || tag.includes('🌱')) {
      iconName = 'vegan';
    } else if (t.includes('vegetar') || tag.includes('🥗')) {
      iconName = 'leaf';
    } else if (
      t.includes('piccant') ||
      t.includes('diavola') ||
      t.includes('spicy') ||
      tag.includes('🌶️') ||
      tag.includes('🔥')
    ) {
      iconName = 'flame';
    } else if (t.includes('gluten') || t.includes('glutine') || tag.includes('🌾')) {
      iconName = 'wheat';
    } else if (
      t.includes('novit') ||
      t.includes('nuov') ||
      t.includes('new') ||
      tag.includes('🆕')
    ) {
      iconName = 'sparkles';
    } else if (
      t.includes('consigliat') ||
      t.includes('special') ||
      tag.includes('⭐') ||
      tag.includes('👑')
    ) {
      iconName = 'star';
    } else if (t.includes('lattosio') || tag.includes('🥛')) {
      iconName = 'milk';
    } else if (t.includes('surgelat') || t.includes('frozen') || tag.includes('❄️')) {
      iconName = 'snowflake';
    }
  }

  switch (iconName) {
    case 'vegan':
      return <Vegan size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'leaf':
      return <Leaf size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'flame':
      return <Flame size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'wheat':
      return <Wheat size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'sparkles':
      return <Sparkles size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'star':
      return <Star size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'milk':
      return <Milk size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'heart':
      return <Heart size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'fish':
      return <Fish size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'apple':
      return <Apple size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'coffee':
      return <Coffee size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'wine':
      return <Wine size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'pizza':
      return <Pizza size={14} className="text-current shrink-0" strokeWidth={2} />;
    case 'snowflake':
      return <Snowflake size={14} className="text-current shrink-0" strokeWidth={2} />;
    default:
      return null;
  }
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
  const { t, lang } = useLang();

  const displayName = lang === 'en' && item.name_en ? item.name_en : item.name;
  const displayDescription = lang === 'en' && item.description_en ? item.description_en : item.description;
  const displayIngredients = lang === 'en' && item.ingredients_en && item.ingredients_en.length > 0 ? item.ingredients_en : item.ingredients;

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

  if (!compact) {
    return (
      <div
        onClick={() => onCustomize(item)}
        className="w-full flex items-start sm:items-center justify-between py-5 border-b border-border/60 hover:bg-muted/10 transition-all duration-150 cursor-pointer group relative px-1"
      >
        {/* Left Column: Image */}
        {item.image && (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-border/40 bg-muted mr-4">
            <AppImage
              src={item.image}
              alt={item.imageAlt || displayName}
              fill
              sizes="(max-width: 768px) 96px, 96px"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
            {totalQty > 0 && (
              <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-md z-10 animate-pop">
                {totalQty}
              </div>
            )}
          </div>
        )}

        {/* Center Column: Details */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors leading-snug flex items-center gap-1.5">
              {totalQty > 0 && !item.image && (
                <span className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs shrink-0 animate-pop">
                  {totalQty}
                </span>
              )}
              {displayName}
            </h4>
            <div className="flex items-center gap-0.5">
              {item.dishTags &&
                item.dishTags.map((tag) => {
                  const icon = getTagIcon(tag);
                  if (!icon) return null;
                  const label = getCleanTagLabel(tag);
                  return (
                    <span
                      key={`${item.id}-${tag}`}
                      title={label}
                      className="text-slate-400 select-none flex items-center"
                      role="img"
                      aria-label={label}
                    >
                      {icon}
                    </span>
                  );
                })}
            </div>
          </div>

          {displayDescription ? (
            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">
              {displayDescription}
            </p>
          ) : displayIngredients && displayIngredients.length > 0 ? (
            <p className="text-xs text-muted-foreground/75 mt-1 line-clamp-2 leading-relaxed">
              {displayIngredients.join(', ')}
            </p>
          ) : null}

          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.allergens.map((a) => (
                <span
                  key={`${item.id}-${a}`}
                  className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md px-1.5 py-0.5 font-medium border border-transparent"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Prices and Action Button */}
        <div className="shrink-0 flex flex-col items-end justify-between min-h-[72px] sm:min-h-[84px] min-w-[80px]">
          <div className="text-right">
            <span className="font-black text-foreground text-sm sm:text-base block">
              € {item.price.toFixed(2)}
            </span>
            {item.originalPrice && (
              <span className="text-xs text-muted-foreground/50 line-through decoration-red-500/50 block mt-0.5">
                € {item.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {defaultQty > 0 ? (
            <div
              className="flex items-center gap-1 bg-secondary rounded-xl p-0.5 border border-border/60 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() =>
                  defaultCartItem && onRemove(defaultCartItem.cartId || defaultCartItem.id)
                }
                className="w-6.5 h-6.5 rounded-lg bg-card hover:bg-border flex items-center justify-center transition-colors shadow-xs active:scale-90"
              >
                <Minus size={10} className="text-foreground" />
              </button>
              <span className="w-4 text-center font-bold tabular-nums text-foreground text-xs">
                {defaultQty}
              </span>
              <button
                onClick={() => onAdd(item)}
                className="w-6.5 h-6.5 rounded-lg bg-primary text-white hover:bg-primary-hover flex items-center justify-center transition-colors shadow-xs active:scale-90"
              >
                <Plus size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(item);
              }}
              className="w-8 h-8 bg-primary hover:bg-primary-hover text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all mt-2 cursor-pointer"
              title="Aggiungi al carrello"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    );
  }

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
        {item.image && (
          <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-40'}`}>
            <AppImage
              src={item.image}
              alt={item.imageAlt || displayName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        <div className={`${compact ? 'p-3 pb-1' : 'p-4'} flex-1`}>
          <h4
            className={`font-bold text-foreground mb-1 group-hover:text-primary transition-colors ${compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm sm:text-base'}`}
          >
            {displayName}
          </h4>
          {displayIngredients && displayIngredients.length > 0 && (
            <p className="text-[10px] text-muted-foreground/80 font-medium mb-1 line-clamp-1 leading-normal">
              {displayIngredients.join(', ')}
            </p>
          )}
          {item.dishTags && item.dishTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 mt-0.5 animate-in fade-in duration-200">
              {item.dishTags.map((tag) => {
                const icon = getTagIcon(tag);
                const label = getCleanTagLabel(tag);
                return (
                  <span
                    key={`${item.id}-${tag}`}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold ${getTagStyle(tag)}`}
                  >
                    {icon && <span className="shrink-0 scale-90">{icon}</span>}
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          )}
          <p
            className={`text-muted-foreground leading-relaxed ${compact ? 'text-[10px] mb-1.5 line-clamp-1 leading-normal' : 'text-xs mb-3 line-clamp-2'}`}
          >
            {displayDescription}
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
              className={`${compact ? 'w-5 h-5 rounded-md' : 'w-7 h-7 rounded-lg'} bg-primary text-white hover:bg-primary-hover flex items-center justify-center transition-colors shadow-sm active:scale-90`}
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
            className={`flex items-center bg-primary text-white hover:bg-primary-hover transition-all duration-150 active:scale-95 shadow-sm shadow-primary/10 ${compact ? 'w-7 h-7 justify-center rounded-lg p-0' : 'gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold'}`}
          >
            <Plus size={compact ? 12 : 14} />
            {!compact && <span>{t('menu_add')}</span>}
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
  setTableNumber,
  isTableEditable,
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
  isCurrentlyClosed,
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
  setTableNumber?: (v: string) => void;
  isTableEditable?: boolean;
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
  isCurrentlyClosed?: boolean;
}) {
  const { t, lang } = useLang();
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

    const itemsHtml = order.items
      .map((item: any) => {
        const customNotes =
          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
            ? '<div style="font-size: 10px; color: #666; margin-top: 2px;">' +
            item.addedIngredients
              ?.map((i: any) => '+' + (lang === 'en' && i.name_en ? i.name_en : i.name))
              .concat(item.removedIngredients?.map((i: string) => lang === 'en' ? '-Without ' + i : '-' + i))
              .join(', ') +
            '</div>'
            : '';
        const itemPrice =
          (item.price +
            (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) *
          item.qty;
        return (
          '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">' +
          '<div>' +
          '<strong>' +
          item.qty +
          'x ' +
          (lang === 'en' && item.name_en ? item.name_en : item.name) +
          '</strong>' +
          customNotes +
          '</div>' +
          '<span>&euro; ' +
          itemPrice.toFixed(2) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    const tableRow =
      order.type === 'tavolo'
        ? '<div class="row"><strong>' + t('receipt_table').replace(':', '') + ':</strong> <span>' + order.tableNumber + '</span></div>'
        : '<div class="row"><strong>' + t('receipt_customer').replace(':', '') + ':</strong> <span>' +
        (order.customer?.name || order.customerName) +
        '</span></div>' +
        '<div class="row"><strong>' + t('receipt_phone').replace(':', '') + ':</strong> <span>' +
        order.customer?.phone +
        '</span></div>' +
        (order.type === 'domicilio'
          ? '<div class="row"><strong>' + t('receipt_address').replace(':', '') + ':</strong> <span>' +
          order.customer?.address +
          '</span></div>'
          : '');

    const deliveryFeeRow =
      (order.deliveryFee || 0) > 0
        ? '<div class="row"><span>' + t('receipt_delivery').replace(':', '') + ':</span> <span>&euro; ' +
        (order.deliveryFee || 0).toFixed(2) +
        '</span></div>'
        : '';
    const discountRow =
      (order.discount || 0) > 0
        ? '<div class="row" style="color: #16a34a;"><span>' + t('receipt_discount', { promo: '' }).replace(':', '') + ':</span> <span>-&euro; ' +
        (order.discount || 0).toFixed(2) +
        '</span></div>'
        : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${t('receipt_title')} - ${order.id}</title>
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
              <div style="font-size: 10px; color: #777; margin-top: 4px;">${t('receipt_title')}</div>
            </div>
            
            <div class="section">
              <div class="row"><strong>${t('receipt_order_id')}:</strong> <span>${order.order_number || order.id}</span></div>
              <div class="row"><strong>${t('receipt_date_time').replace(' & ORA', '').replace(' & TIME', '')}:</strong> <span>${new Date(order.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'it-IT')}</span></div>
              <div class="row"><strong>${t('receipt_service').replace(':', '')}:</strong> <span style="text-transform: capitalize;">${order.type === 'domicilio' ? t('checkout_home_delivery') : order.type === 'asporto' ? t('checkout_takeaway') : t('checkout_your_table')}</span></div>
              ${tableRow}
              <div class="row"><strong>${t('receipt_payment').replace(':', '')}:</strong> <span>${order.payMethod === 'online' ? 'PayPal (Online)' : order.payMethod === 'card' ? t('receipt_pay_card') : order.payMethod === 'pos' ? t('receipt_pay_pos') : t('receipt_pay_cash')}</span></div>
            </div>
            
            <div class="section">
              ${itemsHtml}
            </div>
            
            <div class="totals">
              <div class="row"><span>${t('receipt_subtotal').replace(':', '')}:</span> <span>&euro; ${(order.subtotal || 0).toFixed(2)}</span></div>
              ${deliveryFeeRow}
              ${discountRow}
              <div class="total-row"><span>${t('receipt_total').replace(':', '')}:</span> <span>&euro; ${(order.total || 0).toFixed(2)}</span></div>
            </div>
            
            <div class="footer">
              ${t('receipt_thanks')}
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

  const DigitalReceipt = ({ order }: { order: any }) => {
    if (!order) return null;
    return (
      <div
        className="border border-border/80 rounded-xl bg-muted/30 p-4 text-left space-y-4 max-w-md mx-auto relative overflow-hidden"
        id={`receipt-${order.id}`}
      >
        <div className="flex justify-between items-start border-b border-border/40 pb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {t('receipt_order_id')}
            </p>
            <p className="text-sm font-black font-mono text-foreground">{order.order_number || order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {t('receipt_date_time')}
            </p>
            <p className="text-xs font-semibold text-foreground">
              {new Date(order.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
            {t('receipt_details')}
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('receipt_service')}</span>
            <span className="font-bold text-foreground capitalize">
              {order.type === 'domicilio'
                ? t('checkout_home_delivery')
                : order.type === 'asporto'
                  ? t('checkout_takeaway')
                  : t('checkout_your_table')}
            </span>
          </div>
          {order.deliveryTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('receipt_scheduled_for')}</span>
              <span className="font-bold text-amber-500">
                {order.deliveryDate
                  ? `${new Date(order.deliveryDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'it-IT', { day: '2-digit', month: '2-digit' })} `
                  : ''}
                {order.deliveryTime === 'asap'
                  ? t('checkout_asap')
                  : t('receipt_at', { time: order.deliveryTime })}
              </span>
            </div>
          )}
          {order.type === 'tavolo' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('receipt_table')}</span>
              <span className="font-extrabold text-primary">{order.tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('receipt_payment')}</span>
            <span className="font-semibold text-foreground uppercase">
              {order.payMethod === 'online'
                ? 'PayPal (Online)'
                : order.payMethod === 'card'
                  ? t('receipt_pay_card')
                  : order.payMethod === 'pos'
                    ? t('receipt_pay_pos')
                    : t('receipt_pay_cash')}
            </span>
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">
            {t('receipt_items')}
          </p>
          <ul className="space-y-2 text-xs">
            {Array.isArray(order.items) &&
              order.items.map((item: any, idx: number) => (
                <li key={`receipt-item-${idx}`} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-foreground truncate">
                      {item.qty}× {lang === 'en' && item.name_en ? item.name_en : item.name}
                    </p>
                    {(item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                        {item.addedIngredients
                          ?.map((i: any) => `+${lang === 'en' && i.name_en ? i.name_en : i.name}`)
                          .concat(item.removedIngredients?.map((i: string) => lang === 'en' ? `-Without ${i}` : `-${i}`))
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-foreground tabular-nums">
                    €{' '}
                    {(
                      (item.price +
                        (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) ||
                          0)) *
                      item.qty
                    ).toFixed(2)}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="border-t border-border/40 pt-3 text-xs space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('receipt_subtotal')}</span>
            <span className="tabular-nums">€ {(order.subtotal || 0).toFixed(2)}</span>
          </div>
          {(order.deliveryFee || 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('receipt_delivery')}</span>
              <span className="tabular-nums">€ {(order.deliveryFee || 0).toFixed(2)}</span>
            </div>
          )}
          {(order.discount || 0) > 0 && (
            <div className="flex justify-between text-[var(--success)] font-semibold">
              <span>{t('receipt_discount', { promo: order.promoApplied ? `(${order.promoApplied})` : '' })}</span>
              <span className="tabular-nums">- € {(order.discount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-foreground border-t border-border/40 pt-2">
            <span>{t('receipt_total')}</span>
            <span className="text-primary tabular-nums">€ {(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const OrderStatusTracker = ({
    orderId,
    orderStatus,
    payMethod,
    slug,
    onClose,
    restaurantName,
    restaurantPhone,
    setLastCreatedOrder,
    deliveryType,
    tableNumber,
    lastCreatedOrder,
  }: {
    orderId: string;
    orderStatus: string;
    payMethod: string;
    slug: string;
    onClose: () => void;
    restaurantName: string;
    restaurantPhone?: string;
    setLastCreatedOrder: (order: any) => void;
    deliveryType: string;
    tableNumber?: string | null;
    lastCreatedOrder: any;
  }) => {
    const [secondsLeft, setSecondsLeft] = useState(() => {
      const createdAt = lastCreatedOrder?.timestamp || lastCreatedOrder?.created_at;
      if (!createdAt) return 180;
      const elapsedMs = Date.now() - new Date(createdAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      return Math.max(0, 180 - elapsedSeconds);
    });

    const [phase, setPhase] = useState<'pending' | 'waiting_warn' | 'accepted' | 'rejected' | 'expired'>(() => {
      if (orderStatus === 'accepted' || orderStatus === 'preparing' || orderStatus === 'ready' || orderStatus === 'delivering') {
        return 'accepted';
      }
      if (orderStatus === 'rejected' || orderStatus === 'cancelled') {
        return 'rejected';
      }
      if (orderStatus === 'expired') {
        return 'expired';
      }
      const initialSeconds = (() => {
        const createdAt = lastCreatedOrder?.timestamp || lastCreatedOrder?.created_at;
        if (!createdAt) return 180;
        const elapsedMs = Date.now() - new Date(createdAt).getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        return Math.max(0, 180 - elapsedSeconds);
      })();
      if (initialSeconds === 0) return 'expired';
      if (initialSeconds <= 90) return 'waiting_warn';
      return 'pending';
    });

    const isBooking =
      lastCreatedOrder?.type === 'prenotazione_tavolo' ||
      orderId.startsWith('booking-') ||
      (lastCreatedOrder?.guests !== undefined && lastCreatedOrder?.customer_email !== undefined);

    // ─── Refs for immediate, closure-safe phase access ───────────────────────
    // phaseRef mirrors the `phase` state so the setInterval callback can always
    // read the current phase without stale closure issues.
    const phaseRef = useRef(phase);
    useEffect(() => {
      phaseRef.current = phase;
    }, [phase]);

    // timerRef holds the interval handle so we can clear it imperatively
    // from anywhere (realtime callback, polling) without waiting for a re-render.
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Helper: stop the countdown timer unconditionally
    const stopTimer = () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Helper: resolve a new status to the correct phase value
    const resolvePhase = (status: string): 'accepted' | 'rejected' | 'expired' | null => {
      if (status === 'accepted' || status === 'preparing' || status === 'ready' || status === 'delivering' || status === 'confirmed') {
        return 'accepted';
      }
      if (status === 'rejected' || status === 'cancelled') {
        return 'rejected';
      }
      if (status === 'expired') {
        return 'expired';
      }
      return null;
    };

    // ─── Countdown timer ──────────────────────────────────────────────────────
    useEffect(() => {
      // If already in a terminal phase, stop any running timer and bail out
      if (phase === 'accepted' || phase === 'rejected' || phase === 'expired') {
        stopTimer();
        return;
      }

      // If time is already up on mount, trigger expired immediately
      if (secondsLeft <= 0) {
        stopTimer();
        setPhase('expired');
        (async () => {
          try {
            await supabase.from('orders').update({ status: 'expired' }).eq('id', orderId);
            setLastCreatedOrder((prev: any) => {
              const next = { ...prev, status: 'expired' };
              sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(next));
              return next;
            });
          } catch (e) { console.error(e); }
        })();
        return;
      }

      // Clear any previously running timer before starting a new one
      stopTimer();

      timerRef.current = setInterval(() => {
        // Read phase from ref — not from closure — to get the live value
        if (phaseRef.current === 'accepted' || phaseRef.current === 'rejected' || phaseRef.current === 'expired') {
          stopTimer();
          return;
        }

        setSecondsLeft((s) => {
          const nextSec = s - 1;
          if (nextSec <= 0) {
            stopTimer();
            setPhase('expired');
            (async () => {
              try {
                await supabase.from('orders').update({ status: 'expired' }).eq('id', orderId);
                setLastCreatedOrder((prev: any) => {
                  const next = { ...prev, status: 'expired' };
                  sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(next));
                  return next;
                });
              } catch (e) { console.error(e); }
            })();
            return 0;
          }
          if (nextSec <= 90 && phaseRef.current === 'pending') {
            setPhase('waiting_warn');
          }
          return nextSec;
        });
      }, 1000);

      return () => stopTimer();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]); // ← Only depends on `phase`. When phase becomes 'accepted', effect re-runs,
                 //   hits the stopTimer() guard at the top and the countdown stops immediately.

    // ─── React to orderStatus prop changes (e.g. initial load or parent re-render) ──
    useEffect(() => {
      const resolved = resolvePhase(orderStatus);
      if (resolved) {
        stopTimer();
        setPhase(resolved);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderStatus]);

    // ─── Dedicated Supabase Realtime subscription ─────────────────────────────
    // PRIMARY mechanism: fires instantly when the restaurant updates the order.
    useEffect(() => {
      if (!orderId) return;

      const tableName = isBooking ? 'bookings' : 'orders';
      const channelName = `tracker-status-${orderId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            const newStatus = (payload.new as any).status;
            if (!newStatus) return;

            // Update persisted order state
            setLastCreatedOrder((prev: any) => {
              if (prev?.status === newStatus) return prev;
              const next = { ...prev, status: newStatus };
              sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(next));
              return next;
            });

            // Resolve and apply phase — stopTimer is called inside resolvePhase path
            const resolved = resolvePhase(newStatus);
            if (resolved) {
              stopTimer(); // ← Stop immediately, before React's next render cycle
              setPhase(resolved);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, slug, setLastCreatedOrder, isBooking]);

    // Polling fallback — safety net in case realtime is temporarily unavailable.
    useEffect(() => {
      if (phase === 'accepted' || phase === 'rejected' || phase === 'expired') return;

      const pollStatus = async () => {
        // Guard again with phaseRef so we don't run a stale poll
        if (phaseRef.current === 'accepted' || phaseRef.current === 'rejected' || phaseRef.current === 'expired') return;

        try {
          const table = isBooking ? 'bookings' : 'orders';
          const { data, error } = await supabase
            .from(table)
            .select('status')
            .eq('id', orderId)
            .maybeSingle();

          if (error) {
            console.error('Error polling status:', error);
            return;
          }

          if (data && data.status !== lastCreatedOrder?.status) {
            setLastCreatedOrder((prev: any) => {
              const next = { ...prev, status: data.status };
              sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(next));
              return next;
            });

            const resolved = resolvePhase(data.status);
            if (resolved) {
              stopTimer();
              setPhase(resolved);
            }
          }
        } catch (err) {
          console.error('Error in pollStatus:', err);
        }
      };

      // Poll immediately and then every 5 seconds
      pollStatus();
      const interval = setInterval(pollStatus, 5000);

      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, orderId, slug, setLastCreatedOrder, lastCreatedOrder?.status, isBooking]);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const percentage = (secondsLeft / 180) * 100;

    return (
      <div className="space-y-6 py-4">
        {/* Tracker Header Visual */}
        <div className="text-center">
          {phase === 'pending' && (
            <div className="space-y-4">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Clock className="text-primary animate-pulse" size={40} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground">{t('tracker_waiting')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {lastCreatedOrder?.type === 'prenotazione_tavolo'
                    ? t('tracker_booking_waiting')
                    : deliveryType === 'tavolo'
                      ? t('tracker_order_table', { n: tableNumber || '' })
                      : t('tracker_reviewing')}
                </p>
              </div>
            </div>
          )}

          {phase === 'waiting_warn' && (
            <div className="space-y-4">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                <Clock className="text-amber-500 animate-pulse animate-duration-500" size={40} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground">{t('tracker_just_moment')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('tracker_notifying')}
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-700 dark:text-amber-400 mt-4 text-center font-bold animate-pulse leading-relaxed">
                  {t('tracker_apologize')}
                </div>
              </div>
            </div>
          )}

          {phase === 'accepted' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-inner">
                <CheckCircle size={44} className="text-green-600 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">{t('tracker_confirmed')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('tracker_accepted')}
                </p>
              </div>
            </div>
          )}

          {phase === 'rejected' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
                <X size={44} className="text-rose-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-rose-600">{t('tracker_rejected')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('tracker_rejected_desc')}
                </p>
                {/* Refund info */}
                <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-400 mt-3 text-left leading-relaxed">
                  {(payMethod === 'online' || payMethod === 'card') ? (
                    <>
                      <strong>{lang === 'en' ? '💳 Refund:' : '💳 Rimborso:'}</strong> {lang === 'en' ? 'The pre-authorized or online paid amount will be reversed and automatically refunded within 3-5 business days.' : 'L\'importo pre-autorizzato o pagato online verrà stornato e rimborsato automaticamente entro 3-5 giorni lavorativi.'}
                    </>
                  ) : (
                    <>
                      <strong>{lang === 'en' ? 'No charge:' : 'Nessun addebito:'}</strong> {lang === 'en' ? 'Since you selected payment on delivery/checkout, no charge has been made.' : 'Poiché avevi selezionato il pagamento alla consegna/cassa, non è stato effettuato alcun addebito.'}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === 'expired' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-inner">
                <Clock size={44} className="text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-red-600">{t('tracker_no_response')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('tracker_expired')}
                </p>
                {/* Refund/expired info */}
                <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 text-xs text-red-700 dark:text-red-400 mt-3 text-left leading-relaxed">
                  {(payMethod === 'online' || payMethod === 'card') ? (
                    <>
                      <strong>{lang === 'en' ? '💳 Refund:' : '💳 Rimborso:'}</strong> {lang === 'en' ? 'The pre-authorized or online paid amount will be reversed and automatically refunded to your account within 3-5 business days.' : 'L\'importo pre-autorizzato o pagato online verrà stornato e rimborsato automaticamente sul tuo conto entro 3-5 giorni lavorativi.'}
                    </>
                  ) : (
                    <>
                      <strong>{lang === 'en' ? 'No charge:' : 'Nessun addebito:'}</strong> {lang === 'en' ? 'No payment was taken. You can try resubmitting the order or call the restaurant.' : 'Nessun pagamento è stato prelevato. Puoi provare a reinviare l\'ordine o contattare telefonicamente il locale.'}
                    </>
                  )}
                </div>

                {/* Call restaurant CTA */}
                {restaurantPhone && (
                  <div className="mt-4 pt-2">
                    <a
                      href={`tel:${restaurantPhone}`}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all active:scale-95 text-xs shadow-md shadow-emerald-600/15"
                    >
                      <Phone size={14} className="animate-pulse" />
                      {lang === 'en' ? `Call Restaurant (${restaurantPhone})` : `Chiama Locale (${restaurantPhone})`}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real-time progress loader (only during pending/waiting) */}
        {(phase === 'pending' || phase === 'waiting_warn') && (
          <div className="max-w-xs mx-auto space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground select-none">
              <span>{t('tracker_time_remaining')}</span>
              <span className="font-mono text-foreground text-sm tracking-wider tabular-nums font-black">
                {formatTime(secondsLeft)}
              </span>
            </div>
            <div className="w-full bg-muted/60 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-border/40 relative">
              <div
                className="bg-primary h-full rounded-full shadow-lg transition-all duration-1000 ease-linear"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Digital Receipt */}
        {lastCreatedOrder && (
          <div className="mt-6 pt-4 border-t border-border">
            <DigitalReceipt
              order={lastCreatedOrder}
            />
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onClose}
          disabled={phase === 'pending' || phase === 'waiting_warn'}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all active:scale-95 text-xs shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'pending' || phase === 'waiting_warn'
            ? t('tracker_waiting_response')
            : t('tracker_back_to_menu')}
        </button>
      </div>
    );
  };

  const [notes, setNotes] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'online' | 'pos'>('card');
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
          {
            id: 'zone-1',
            name: 'Zona Centro (Vicino)',
            minOrder: 0,
            deliveryFee: 2.0,
            freeDeliveryThreshold: 25,
            enabled: true,
            caps: '20121, 20122, 20123',
          },
          {
            id: 'zone-2',
            name: 'Zona Periferia (Medio)',
            minOrder: 0,
            deliveryFee: 4.0,
            freeDeliveryThreshold: 35,
            enabled: true,
            caps: '20124, 20125, 20126',
          },
          {
            id: 'zone-3',
            name: 'Fuori Comune (Lontano)',
            minOrder: 0,
            deliveryFee: 6.0,
            freeDeliveryThreshold: 50,
            enabled: false,
            caps: '20127, 20128, 20129',
          },
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
      if (
        matchedZone.freeDeliveryThreshold > 0 &&
        itemsTotal >= matchedZone.freeDeliveryThreshold
      ) {
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
  const isScheduledEnabled = true;

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
    const locale = lang === 'en' ? 'en-US' : 'it-IT';
    for (let i = 0; i <= maxDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      let label = '';
      if (i === 0) label = lang === 'en' ? 'Today' : 'Oggi';
      else if (i === 1) label = lang === 'en' ? 'Tomorrow' : 'Domani';
      else {
        let dayName = d.toLocaleDateString(locale, { weekday: 'short' }).replace(/\.$/, '');
        const dayNum = d.getDate();
        let monthName = d.toLocaleDateString(locale, { month: 'short' }).replace(/\.$/, '');

        if (lang === 'en') {
          const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          label = `${formattedDay} ${dayNum} ${formattedMonth}`;
        } else {
          const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          label = `${formattedDay} ${dayNum} ${monthName.toLowerCase()}`;
        }
      }
      const value = d.toISOString().split('T')[0];
      options.push({ value, label });
    }
    return options;
  }, [maxDays, lang]);

  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (dateOptions.length > 0) {
      const exists = dateOptions.some((opt) => opt.value === selectedDate);
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
  }, [
    deliveryType,
    openingHours,
    deliveryHours,
    currentTimeStr,
    selectedDate,
    dateOptions,
    minNoticeMinutes,
    timeInterval,
  ]);

  const showAsapOption = false;

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
      let isStripeEnabled = false;
      let isPaypalEnabled = false;
      let isPosEnabled = false;
      let isCashEnabled = false;

      if (bookingContext) {
        isStripeEnabled = !!(paymentMethods.stripe_enabled && paymentMethods.stripe_connected && paymentMethods.stripe_table);
        isPaypalEnabled = !!(paymentMethods.paypal_enabled && paymentMethods.paypal_connected && paymentMethods.paypal_table);
        isPosEnabled = !!paymentMethods.card_table;
        isCashEnabled = true;
      } else {
        if (deliveryType === 'domicilio') {
          isStripeEnabled = !!(paymentMethods.stripe_enabled && paymentMethods.stripe_connected && paymentMethods.stripe_delivery !== false);
          isPaypalEnabled = !!(paymentMethods.paypal_enabled && paymentMethods.paypal_connected && paymentMethods.paypal_delivery !== false);
          isPosEnabled = paymentMethods.card_delivery !== false;
          isCashEnabled = paymentMethods.cash_delivery !== false;
        } else if (deliveryType === 'asporto') {
          isStripeEnabled = !!(paymentMethods.stripe_enabled && paymentMethods.stripe_connected && paymentMethods.stripe_pickup !== false);
          isPaypalEnabled = !!(paymentMethods.paypal_enabled && paymentMethods.paypal_connected && paymentMethods.paypal_pickup !== false);
          isPosEnabled = paymentMethods.card_pickup !== false;
          isCashEnabled = paymentMethods.cash_pickup !== false;
        } else if (deliveryType === 'tavolo') {
          isStripeEnabled = !!(paymentMethods.stripe_enabled && paymentMethods.stripe_connected && paymentMethods.stripe_table !== false);
          isPaypalEnabled = !!(paymentMethods.paypal_enabled && paymentMethods.paypal_connected && paymentMethods.paypal_table !== false);
          isPosEnabled = !!paymentMethods.card_table;
          isCashEnabled = !!paymentMethods.cash_table;
        }
      }

      if (isStripeEnabled) {
        setPayMethod('card');
      } else if (isPaypalEnabled) {
        setPayMethod('online');
      } else if (isPosEnabled) {
        setPayMethod('pos');
      } else if (isCashEnabled) {
        setPayMethod('cash');
      }
    }
  }, [open, deliveryType, paymentMethods, bookingContext]);

  useEffect(() => {
    if (open) {
      setStep('details');
      setLoading(false);
    }
  }, [open]);

  const handleOrder = async () => {
    if (payMethod === 'card' && !isCardFormValid) {
      setCardError('I dati della carta non sono validi o sono incompleti.');
      return;
    }
    setCardError(null);
    setLoading(true);

    const rId = restaurantSettings.id;
    if (!rId) {
      alert('Errore: Ristorante non identificato');
      setLoading(false);
      return;
    }

    if (bookingContext) {
      try {
        const bookingPayload = {
          restaurant_id: rId,
          name: bookingContext.name.trim(),
          phone: bookingContext.phone.trim(),
          email: email.trim().toLowerCase() || null,
          guests: bookingContext.guests,
          date: bookingContext.date,
          time: `${bookingContext.time}:00`,
          status: 'pending',
          notes: bookingContext.note.trim(),
          pre_order_items: cart,
          pre_order_total: total,
        };

        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingPayload)
          .select()
          .single();

        if (bookingError || !bookingData) {
          throw bookingError || new Error("Errore durante l'inserimento della prenotazione");
        }

        const trackedBooking = {
          ...bookingData,
          type: 'prenotazione_tavolo',
          timestamp: bookingData.created_at,
          payMethod: payMethod,
          total: total,
        };

        setLastCreatedOrder(trackedBooking);
        sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(trackedBooking));
        clearCart();
        setBookingContext(null);

        setLoading(false);
        setStep('success');
      } catch (err: any) {
        console.error('Error saving booking:', err);
        alert(`Errore di rete: ${err.message || 'Impossibile completare la prenotazione'}`);
        setLoading(false);
      }
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

    try {
      const discount = appliedPromoDetail
        ? appliedPromoDetail.type === 'percentage' || appliedPromoDetail.type === 'first_order'
          ? itemsTotal * (appliedPromoDetail.value / 100)
          : appliedPromoDetail.type === 'free_delivery'
            ? actualDeliveryFee
            : Math.min(appliedPromoDetail.value, itemsTotal)
        : 0;

      const orderNumber =
        deliveryType === 'domicilio'
          ? generateId('ORD')
          : deliveryType === 'asporto'
            ? generateId('ASP')
            : generateId('TAV', tableNumber || undefined);

      const orderPayload = {
        restaurant_id: rId,
        order_number: orderNumber,
        type: deliveryType,
        status: 'new',
        customer_name: deliveryType === 'tavolo' ? `${name} (Tavolo ${tableNumber})` : name,
        customer_email:
          deliveryType === 'tavolo' ? 'tavolo@internal.it' : email.trim().toLowerCase(),
        customer_phone: deliveryType === 'tavolo' ? null : phone,
        customer_address: deliveryType === 'domicilio' ? `${address} (CAP: ${cap})` : null,
        table_number: deliveryType === 'tavolo' ? tableNumber : null,
        guests: deliveryType === 'tavolo' ? guests : null,
        subtotal: itemsTotal,
        delivery_fee: currentDeliveryFee,
        discount: discount,
        total: finalTotal,
        promo_code: appliedPromoDetail ? appliedPromoDetail.code : null,
        promo_applied: !!appliedPromoDetail,
        scheduled_at:
          deliveryType !== 'tavolo' && selectedDate && deliveryTime && deliveryTime !== 'asap'
            ? new Date(`${selectedDate}T${deliveryTime}:00`).toISOString()
            : null,
        notes: notes || '',
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError || !orderData) {
        throw orderError || new Error("Errore durante la creazione dell'ordine");
      }

      const orderItemsPayload = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id.startsWith('sf-') || item.id.startsWith('bk-') ? null : item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        note: item.note || null,
        added_ingredients: item.addedIngredients || [],
        removed_ingredients: item.removedIngredients || [],
        selected_options: item.selectedOptions || [],
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      if (appliedPromoDetail) {
        await supabase
          .from('promos')
          .update({ used_count: (appliedPromoDetail.usedCount || 0) + 1 })
          .eq('id', appliedPromoDetail.id);
      }

      const trackedOrder = {
        ...orderData,
        items: cart,
        timestamp: orderData.created_at,
        payMethod: payMethod,
      };

      setLastCreatedOrder(trackedOrder);
      sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(trackedOrder));
      clearCart();

      setLoading(false);
      setStep('success');
    } catch (err: any) {
      console.error('Error saving order:', err);
      alert(`Errore di rete: ${err.message || "Impossibile completare l'ordine"}`);
      setLoading(false);
    }
  };

  const detailsValid = bookingContext
    ? !!bookingContext.name && !!bookingContext.phone
    : deliveryType === 'tavolo'
      ? !!name && !!tableNumber
      : !!name &&
      !!phone &&
      !!email &&
      isEmailValid &&
      !!deliveryTime &&
      (deliveryType === 'asporto' ||
        (!!address && cap.length === 5 && !!matchedZone && itemsTotal >= matchedZone.minOrder));

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
              <p className="text-sm font-bold text-primary animate-pulse">Elaborazione...</p>
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
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Data e Ora
                    </span>
                    <strong className="text-foreground text-sm">
                      {new Date(bookingContext.date).toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      alle {bookingContext.time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Persone
                    </span>
                    <strong className="text-foreground text-sm">
                      {bookingContext.guests} {bookingContext.guests === 1 ? 'persona' : 'persone'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Nome Cliente
                    </span>
                    <strong className="text-foreground">{bookingContext.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Telefono
                    </span>
                    <strong className="text-foreground">{bookingContext.phone}</strong>
                  </div>
                </div>
                {bookingContext.note && (
                  <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Note:</span> &quot;
                    {bookingContext.note}&quot;
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border border-border/80 bg-muted/20 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  I Piatti Pre-ordinati
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {cart.map((item, idx) => (
                    <div
                      key={`summary-item-${idx}`}
                      className="flex justify-between items-start text-xs border-b border-border/10 pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {item.qty}x {item.name}
                        </p>
                        {((item.addedIngredients && item.addedIngredients.length > 0) ||
                          (item.removedIngredients && item.removedIngredients.length > 0) ||
                          item.note) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 pl-2 space-y-0.5">
                              {item.addedIngredients?.map((ext) => (
                                <div key={ext.name} className="text-primary font-medium">
                                  + {ext.name}
                                </div>
                              ))}
                              {item.removedIngredients?.map((rem) => (
                                <div key={rem} className="text-red-500">
                                  - Senza {rem}
                                </div>
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
                      onChange={
                        isTableEditable ? (e) => setTableNumber?.(e.target.value) : undefined
                      }
                      readOnly={!isTableEditable}
                      placeholder="Es. 5"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm border border-border/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-foreground ${!isTableEditable ? 'bg-muted cursor-not-allowed' : 'bg-input'
                        }`}
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
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Riepilogo Ordine
                </h4>
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
                  <span>{t('checkout_table_total')}</span>
                  <span className="text-primary tabular-nums">€ {total.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Delivery type selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  {t('checkout_delivery_method')}
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
                    {t('checkout_home_delivery')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('asporto')}
                    className={`flex items-center justify-center py-2.5 rounded-lg border text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${deliveryType === 'asporto'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                      : 'border-border/60 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                      }`}
                  >
                    {t('checkout_takeaway')}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {t('checkout_full_name')} *
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
                      {t('checkout_delivery_address')} *
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
                        placeholder={t('checkout_address_placeholder')}
                        className="w-full pl-9 pr-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      {t('checkout_cap_placeholder')} *
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
                        {t('checkout_cap_invalid')}
                      </p>
                    )}
                    {cap.length === 5 && matchedZone && itemsTotal < matchedZone.minOrder && (
                      <p className="text-xs text-amber-500 font-semibold mt-1.5 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                        {t('checkout_cap_min_order', { min: `€ ${matchedZone.minOrder.toFixed(2)}` })}{' '}
                        ({lang === 'en' ? 'Missing' : 'Mancano'} € {(matchedZone.minOrder - itemsTotal).toFixed(2)})
                      </p>
                    )}
                    {cap.length === 5 && matchedZone && itemsTotal >= matchedZone.minOrder && (
                      <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {t('checkout_cap_valid', { deliveryFee: currentDeliveryFee === 0 ? (lang === 'en' ? 'Free' : 'Gratis') : `€ ${currentDeliveryFee.toFixed(2)}` })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {t('checkout_phone_number')} *
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
                  {t('checkout_email')} *
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
                    {t('checkout_email_invalid')}
                  </p>
                )}
              </div>

              {/* Data di consegna / ritiro (Scheduled Orders) */}
              {isScheduledEnabled && maxDays > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Calendar size={12} />
                    {t('checkout_delivery_day', { service: deliveryType === 'domicilio' ? (lang === 'en' ? 'delivery' : 'consegna') : (lang === 'en' ? 'pickup' : 'ritiro') })} *
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 mb-1 scrollbar-hide">
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDate === opt.value;
                      const displayOptLabel = opt.label === 'Oggi' ? t('checkout_today') : opt.label === 'Domani' ? t('checkout_tomorrow') : opt.label;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedDate(opt.value)}
                          className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-card border-border/80 text-foreground hover:bg-muted/50'
                            }`}
                        >
                          {displayOptLabel}
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
                  {t('checkout_delivery_time', { service: deliveryType === 'domicilio' ? (lang === 'en' ? 'delivery' : 'consegna') : (lang === 'en' ? 'pickup' : 'ritiro') })} *
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
                    {!showAsapOption && <option value="">{t('checkout_select_time')}</option>}
                    {showAsapOption && <option value="asap">{t('checkout_asap')}</option>}
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                {timeSlots.length === 0 && !showAsapOption && (
                  <p className="text-xs text-red-500 font-semibold mt-1">
                    {t('checkout_no_times')}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {t('checkout_notes').replace(':', '')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    deliveryType === 'domicilio'
                      ? t('checkout_allergies')
                      : (lang === 'en' ? 'Allergies, preferences, pickup details...' : 'Allergie, preferenze, orario di ritiro...')
                  }
                  rows={2}
                  className="w-full px-3 py-2.5 text-base bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all resize-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="flex justify-between items-center py-2.5 border-t border-border/40 mt-4 text-sm font-bold text-foreground">
                <span>{t('cart_total')}</span>
                <span className="tabular-nums text-primary text-base">
                  € {itemsTotal.toFixed(2)}
                </span>
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
                  {t('checkout_remember_details')}
                </label>
              </div>
            </>
          )}

          <button
            onClick={() => setStep('payment')}
            disabled={!detailsValid || loading}
            className="w-full py-3 bg-primary text-white text-sm sm:text-base font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            {t('checkout_next')}
          </button>
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-4">
          {(() => {
            const payOptions = [
              {
                id: 'card',
                title: bookingContext
                  ? (lang === 'en' ? 'Pay with Card' : 'Paga con Carta')
                  : deliveryType === 'tavolo'
                    ? (lang === 'en' ? 'Pay at Table with Card' : 'Paga al Tavolo con Carta')
                    : (lang === 'en' ? 'Credit Card' : 'Carta di Credito'),
                desc: lang === 'en' ? 'Pay online with credit card' : 'Paga online con carta di credito',
                icon: (
                  <CreditCard
                    size={18}
                    className={payMethod === 'card' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext
                  ? !!(paymentMethods?.stripe_enabled && paymentMethods?.stripe_connected && paymentMethods?.stripe_table)
                  : deliveryType === 'domicilio'
                    ? !!(paymentMethods?.stripe_enabled && paymentMethods?.stripe_connected && paymentMethods?.stripe_delivery !== false)
                    : deliveryType === 'asporto'
                      ? !!(paymentMethods?.stripe_enabled && paymentMethods?.stripe_connected && paymentMethods?.stripe_pickup !== false)
                      : !!(paymentMethods?.stripe_enabled && paymentMethods?.stripe_connected && paymentMethods?.stripe_table !== false),
              },
              {
                id: 'online',
                title: bookingContext
                  ? (lang === 'en' ? 'Pay now with PayPal' : 'Paga adesso con PayPal')
                  : deliveryType === 'tavolo'
                    ? (lang === 'en' ? 'Pay now with PayPal' : 'Paga adesso con PayPal')
                    : 'PayPal',
                desc: lang === 'en' ? 'Pay with your PayPal account or card' : 'Paga con il tuo account PayPal o carta',
                icon: (
                  <Wallet
                    size={18}
                    className={payMethod === 'online' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext
                  ? !!(paymentMethods?.paypal_enabled && paymentMethods?.paypal_connected && paymentMethods?.paypal_table)
                  : deliveryType === 'domicilio'
                    ? !!(paymentMethods?.paypal_enabled && paymentMethods?.paypal_connected && paymentMethods?.paypal_delivery !== false)
                    : deliveryType === 'asporto'
                      ? !!(paymentMethods?.paypal_enabled && paymentMethods?.paypal_connected && paymentMethods?.paypal_pickup !== false)
                      : !!(paymentMethods?.paypal_enabled && paymentMethods?.paypal_connected && paymentMethods?.paypal_table !== false),
              },
              {
                id: 'pos',
                title: bookingContext
                  ? (lang === 'en' ? 'Card on pickup (POS)' : 'Carta al ritiro (POS)')
                  : deliveryType === 'tavolo'
                    ? (lang === 'en' ? 'Pay at table with Card' : 'Paga al tavolo con Carta')
                    : deliveryType === 'asporto'
                      ? (lang === 'en' ? 'Card on Pickup (POS)' : 'Carta al Ritiro (POS)')
                      : (lang === 'en' ? 'Card on Delivery (POS)' : 'Carta alla Consegna (POS)'),
                desc: lang === 'en' ? 'Payment with physical POS terminal' : 'Pagamento con terminale POS fisico',
                icon: (
                  <CreditCard
                    size={18}
                    className={payMethod === 'pos' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext
                  ? false
                  : deliveryType === 'domicilio'
                    ? paymentMethods?.card_delivery !== false
                    : deliveryType === 'asporto'
                      ? paymentMethods?.card_pickup !== false
                      : !!paymentMethods?.card_table,
              },
              {
                id: 'cash',
                title: bookingContext
                  ? (lang === 'en' ? 'Pay at cash desk' : 'Paga alla cassa')
                  : deliveryType === 'tavolo'
                    ? (lang === 'en' ? 'Pay at Cash Desk' : 'Paga in Cassa')
                    : deliveryType === 'asporto'
                      ? (lang === 'en' ? 'Cash on collection' : 'Contanti al ritiro')
                      : (lang === 'en' ? 'Cash on delivery' : 'Contanti alla consegna'),
                desc: bookingContext
                  ? (lang === 'en' ? "Submit booking and pay at cash desk" : "Invia l'ordine e paga in cassa")
                  : deliveryType === 'tavolo'
                    ? (lang === 'en' ? "Submit order and pay at cash desk" : "Invia l'ordine e paga alla cassa")
                    : deliveryType === 'asporto'
                      ? (lang === 'en' ? 'Pay at cash desk' : 'Paga in cassa')
                      : (lang === 'en' ? 'Pay on delivery' : 'Paga alla consegna'),
                icon: (
                  <Banknote
                    size={18}
                    className={payMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}
                  />
                ),
                enabled: bookingContext
                  ? true
                  : deliveryType === 'domicilio'
                    ? paymentMethods?.cash_delivery !== false
                    : deliveryType === 'asporto'
                      ? paymentMethods?.cash_pickup !== false
                      : !!paymentMethods?.cash_table,
              },
            ].filter((opt) => opt.enabled);

            return (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  {t('checkout_payment')}
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
                  💳 <strong>{lang === 'en' ? 'Pre-authorization:' : 'Pre-autorizzazione:'}</strong> {lang === 'en' ? 'Card details will only be used to pre-authorize the amount. The actual charge will happen only after the reservation is confirmed by the restaurant.' : 'I dati della carta serviranno solo a pre-autorizzare l\'importo. L\'addebito effettivo avverrà solo dopo la conferma della prenotazione da parte del ristorante.'}
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
              {(bookingContext || deliveryType === 'tavolo') && (
                <div className="bg-amber-500/5 border border-amber-500/25 rounded-lg p-3 text-[11px] text-amber-700 dark:text-amber-400">
                  {bookingContext
                    ? (lang === 'en' ? 'Submit reservation and order. You will pay at the cash desk after your meal (after the restaurant accepts and confirms).' : 'Invia la prenotazione e l\'ordine. Pagherai comodamente in cassa a fine pasto (dopo che il ristorante avrà accettato e confermato).')
                    : (lang === 'en' ? 'Submit order to the kitchen. You will pay at the cash desk or table after your meal.' : 'Invia l\'ordine in cucina. Pagherai comodamente in cassa o al tavolo a fine pasto.')}
                </div>
              )}
              {deliveryType === 'domicilio' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    {lang === 'en' ? 'Do you need change?' : 'Hai bisogno di resto?'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: lang === 'en' ? 'No' : 'No', value: 'no' },
                      { label: lang === 'en' ? 'Yes, from €20' : 'Sì, da €20', value: '20' },
                      { label: lang === 'en' ? 'Yes, from €50' : 'Sì, da €50', value: '50' },
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
                  📱 {lang === 'en' ? 'Online Payment' : 'Pagamento Online'}
                </span>
                <span className="text-xs font-black tracking-tighter text-blue-600 dark:text-blue-400 italic">
                  Pay<span className="text-cyan-500">Pal</span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {lang === 'en' ? 'You will be redirected to PayPal secure portal to authorize the transaction safely.' : 'Verrai reindirizzato al portale sicuro di PayPal per autorizzare la transazione in modo protetto.'}
              </p>
            </div>
          )}

          {payMethod === 'pos' && (bookingContext || deliveryType === 'tavolo') && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  💳 {lang === 'en' ? 'Payment with physical POS' : 'Pagamento con POS portatile'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {bookingContext
                  ? (lang === 'en' ? 'You will pay at the restaurant via credit/debit card.' : 'Pagherai comodamente al ristorante tramite carta di credito/debito.')
                  : (lang === 'en' ? 'Submit order to the kitchen. You will pay via POS at the table or cash desk after your meal.' : 'Invia l\'ordine in cucina. Pagherai tramite POS al tavolo o in cassa a fine pasto.')}
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
                    placeholder={lang === 'en' ? 'Promo code' : 'Codice promozionale'}
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
                  {promoApplied ? (lang === 'en' ? 'Applied' : 'Applicato') : (lang === 'en' ? 'Apply' : 'Applica')}
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-red-500 font-semibold mt-1">{promoError}</p>
              )}
              {promoApplied && appliedPromoDetail && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--success)] bg-[var(--success-bg)] rounded-md px-2.5 py-1 font-semibold">
                  <CheckCircle size={12} />
                  {appliedPromoDetail.type === 'percentage'
                    ? (lang === 'en' ? `Promo discount of ${appliedPromoDetail.value}% applied!` : `Sconto promozionale del ${appliedPromoDetail.value}% applicato!`)
                    : (lang === 'en' ? `Promo discount of € ${appliedPromoDetail.value.toFixed(2)} applied!` : `Sconto promozionale di € ${appliedPromoDetail.value.toFixed(2)} applicato!`)}
                </div>
              )}
            </div>
          )}

          {/* Checkout Finale breakdown display */}
          {deliveryType === 'domicilio' ? (
            <div className="bg-card border border-border/60 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{lang === 'en' ? 'Items' : 'Articoli'}</span>
                <span className="tabular-nums font-semibold">€ {itemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('receipt_delivery').replace(':', '')}</span>
                <span className="tabular-nums font-semibold">
                  {currentDeliveryFee === 0 ? (
                    <span className="text-[var(--success)] font-bold">{lang === 'en' ? 'Free' : 'Gratis'}</span>
                  ) : (
                    `€ ${currentDeliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-foreground pt-2 border-t border-border/60 text-sm">
                <span>{t('cart_total')}</span>
                <span className="tabular-nums text-primary">€ {finalTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-lg p-4 flex justify-between font-extrabold text-foreground text-sm">
              <span>{t('cart_total')}</span>
              <span className="tabular-nums text-primary">€ {finalTotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="flex-1 py-3 border border-border/80 text-foreground font-bold rounded-lg hover:bg-muted transition-colors text-xs sm:text-sm"
            >
              {t('checkout_back')}
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
                    {lang === 'en' ? 'Connecting...' : 'Connessione...'}
                  </>
                ) : (
                  <span>
                    {lang === 'en' ? 'Pay with' : 'Paga con'}{' '}
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
                className="flex-[2_2_0%] py-3 bg-primary text-white font-extrabold rounded-lg hover:bg-primary-hover transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {payMethod === 'card' ? (lang === 'en' ? 'Authorizing...' : 'Autorizzazione...') : (lang === 'en' ? 'Sending...' : 'Invio...')}
                  </>
                ) : payMethod === 'card' ? (
                  (lang === 'en' ? 'Confirm payment' : 'Conferma pagamento')
                ) : deliveryType === 'tavolo' ? (
                  (lang === 'en' ? 'Send order to kitchen' : 'Invia ordine in cucina')
                ) : (
                  t('checkout_place_order')
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <OrderStatusTracker
          orderId={lastCreatedOrder?.id || ''}
          orderStatus={lastCreatedOrder?.status || 'new'}
          payMethod={lastCreatedOrder?.payMethod || payMethod}
          slug={slug}
          onClose={onClose}
          restaurantName={restaurantSettings?.name || 'iGOdelivering'}
          restaurantPhone={restaurantSettings?.phone || ''}
          setLastCreatedOrder={setLastCreatedOrder}
          deliveryType={deliveryType}
          tableNumber={tableNumber}
          lastCreatedOrder={lastCreatedOrder}
        />
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
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      const playBeep = (delay: number, frequency: number, duration: number) => {
        setTimeout(() => {
          if (!audioCtx || audioCtx.state === 'closed') return;
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
    return () => {
      clearTimeout(timer);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(err => console.log('Error closing context:', err));
      }
    };
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
        <div
          className={`mt-0.5 w-7 h-7 rounded-full ${c.iconBg} text-white flex items-center justify-center text-xs font-black flex-shrink-0`}
        >
          {c.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">
            {c.label}
          </p>
          <p className="text-sm font-bold text-foreground leading-snug">{notification.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            {notification.message}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
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
          {item.image && (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <AppImage src={item.image} alt={item.imageAlt} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
            {item.ingredients && item.ingredients.length > 0 && (
              <p className="text-[10px] text-muted-foreground/80 font-medium leading-normal mb-0.5 truncate">
                {item.ingredients.join(', ')}
              </p>
            )}
            {item.dishTags && item.dishTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1.5 mt-0.5 animate-in fade-in duration-200">
                {item.dishTags.map((tag) => {
                  const icon = getTagIcon(tag);
                  const label = getCleanTagLabel(tag);
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 text-[9px] font-bold ${getTagStyle(tag)}`}
                    >
                      {icon && <span className="shrink-0 scale-90">{icon}</span>}
                      <span>{label}</span>
                    </span>
                  );
                })}
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
                      <div
                        data-lenis-prevent
                        className="p-2 space-y-1.5 bg-card border-t border-border/40 max-h-[25vh] overflow-y-auto"
                      >
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
            className="flex-1 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-md shadow-primary/10 text-xs"
          >
            {cartItem ? 'Salva Modifiche' : 'Aggiungi'} — € {totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

const FlagIT = () => (
  <svg viewBox="0 0 3 2" className="w-full h-full">
    <rect width="1" height="2" fill="#009246" />
    <rect x="1" width="1" height="2" fill="#fff" />
    <rect x="2" width="1" height="2" fill="#ce2b37" />
  </svg>
);

const FlagEN = () => (
  <svg viewBox="0 0 50 30" className="w-full h-full">
    <rect width="50" height="30" fill="#012169" />
    <path d="M0,0 L50,30 M0,30 L50,0" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L50,30 M0,30 L50,0" stroke="#C8102E" strokeWidth="3.5" />
    <path d="M25,0 L25,30 M0,15 L50,15" stroke="#fff" strokeWidth="10" />
    <path d="M25,0 L25,30 M0,15 L50,15" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────
export default function CustomerStorefront() {
  return (
    <LanguageProvider>
      <StorefrontContent />
    </LanguageProvider>
  );
}

function StorefrontContent() {
  const { lang, setLang, t } = useLang();
  const params = useParams();
  const slug = (params?.slug as string) || 'pizzeria-bella-napoli';

  const { settings: restaurantSettings } = useRestaurantSettings(slug);
  const { validatePromo, promos } = usePromoCode(slug);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromoDetail, setAppliedPromoDetail] = useState<any>(null);
  const [serviceHoursConfig, setServiceHoursConfig] = useState<any>(null);

  useEffect(() => {
    if (restaurantSettings?.hours_config) {
      setServiceHoursConfig(restaurantSettings.hours_config);
    }
  }, [restaurantSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      const rId = getRestaurantId(slug);
      const loadConfig = () => {
        const stored =
          localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
          localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
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

  const [menuItemsList, setMenuItemsList] = useState<MenuItemType[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ name: string; name_en?: string }[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!restaurantSettings?.id) return;
      try {
        const { data, error } = await supabase
          .from('menu_categories')
          .select('name, name_en')
          .eq('restaurant_id', restaurantSettings.id);
        if (error) throw error;
        if (data) {
          setCategoriesList(data);
        }
      } catch (err) {
        console.error('Error loading menu categories:', err);
      }
    };
    loadCategories();
  }, [restaurantSettings?.id]);

  const getDisplayCategoryName = (catName: string) => {
    if (lang === 'en') {
      if (catName === 'Promozioni') return 'Promotions';
      if (catName === 'Tutti') return 'All';
      const found = categoriesList.find((c) => c.name === catName);
      if (found?.name_en) return found.name_en;
    }
    return catName;
  };

  useEffect(() => {
    const loadMenuItems = async () => {
      if (!restaurantSettings?.id) return;
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantSettings.id)
          .eq('available', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const mappedItems: MenuItemType[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          name_en: item.name_en,
          category: item.category_name,
          price: parseFloat(item.price),
          originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
          description: item.description || '',
          description_en: item.description_en,
          image: item.image_url || '',
          imageAlt: item.image_alt || item.name,
          allergens: item.allergens || [],
          dishTags: item.dish_tags || [],
          ingredients: item.ingredients || [],
          ingredients_en: item.ingredients_en,
          optionGroups: item.option_groups || [],
          customizationEnabled:
            item.customization_enabled !== undefined ? !!item.customization_enabled : true,
          notesEnabled: item.notes_enabled !== undefined ? !!item.notes_enabled : true,
        }));

        setMenuItemsList(mappedItems);
      } catch (err) {
        console.error('Error loading menu items:', err);
      }
    };

    loadMenuItems();
  }, [restaurantSettings?.id]);

  // Dynamic categories list based on loaded menu items
  const categories = [
    'Promozioni',
    ...Array.from(
      new Set(menuItemsList.map((item) => item.category).filter((cat) => cat !== 'Promozioni'))
    ),
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
  const [availabilityError, setAvailabilityError] = useState<'closed' | 'no_delivery' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [preOrderAcknowledged, setPreOrderAcknowledged] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lastCreatedOrderRef = useRef(lastCreatedOrder);
  useEffect(() => {
    lastCreatedOrderRef.current = lastCreatedOrder;
  }, [lastCreatedOrder]);

  // Listen to order updates via Supabase Realtime
  useEffect(() => {
    if (typeof window === 'undefined' || !lastCreatedOrder) return;
    const orderId = lastCreatedOrder.id;

    let tableName = '';
    let channelName = '';

    const isBooking =
      lastCreatedOrder.type === 'prenotazione_tavolo' ||
      orderId.startsWith('booking-') ||
      (lastCreatedOrder.guests !== undefined && lastCreatedOrder.customer_email !== undefined);

    if (isBooking) {
      tableName = 'bookings';
      channelName = `booking-status-${orderId}`;
    } else {
      tableName = 'orders';
      channelName = `order-status-${orderId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedRecord = payload.new;
          const currentOrder = lastCreatedOrderRef.current;
          if (!currentOrder) return;

          if (updatedRecord.status !== currentOrder.status) {
            const oldStatus = currentOrder.status;
            const newStatus = updatedRecord.status;
            const restName = restaurantSettings?.name || 'iGOdelivering';
            const customerName =
              currentOrder.customer_name || currentOrder.name || 'Cliente';

            let variant: 'success' | 'warning' | 'danger' = 'success';
            let title = '';
            let message = '';

            if (tableName === 'bookings') {
              if (newStatus === 'cancelled') {
                variant = 'danger';
                title = `Prenotazione Rifiutata ❌`;
                message = `Spiacenti ${customerName}, la tua prenotazione per il tavolo il ${currentOrder.date} non è stata accettata dal ristorante.`;
              } else if (newStatus === 'confirmed') {
                variant = 'success';
                title = `Tavolo Confermato! 📅`;
                message = `Ottime notizie ${customerName}! La tua prenotazione per il tavolo è stata confermata da ${restName}.`;
              }
            } else {
              const tableNum = currentOrder.table_number;
              const isTable = currentOrder.type === 'tavolo';

              if (newStatus === 'rejected' || newStatus === 'cancelled') {
                variant = 'danger';
                title = isTable ? `Ordine Tavolo ${tableNum} rifiutato` : `Ordine rifiutato`;
                message = isTable
                  ? `Il tuo ordine al tavolo ${tableNum} è stato rifiutato dal ristorante.`
                  : `Spiacenti ${customerName}, il tuo ordine è stato rifiutato dal ristorante.`;
              } else if (newStatus === 'accepted' || newStatus === 'preparing') {
                variant = 'success';
                title = isTable ? `Tavolo ${tableNum} — In preparazione` : `Ordine confermato`;
                message = `Il tuo ordine è in preparazione!`;
              } else if (newStatus === 'ready') {
                variant = 'warning';
                title = isTable ? `Tavolo ${tableNum} — Pronto` : `Ordine pronto`;
                message = isTable
                  ? `I tuoi piatti sono pronti e stanno arrivando al tavolo!`
                  : `Il tuo ordine è pronto per il ritiro/consegna.`;
              }
            }

            setIncomingNotification({ variant, title, message, orderId });
            setLastCreatedOrder((prev: any) => {
              const next = { ...prev, status: newStatus };
              sessionStorage.setItem(`iGO_last_order_${slug}`, JSON.stringify(next));
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastCreatedOrder?.id, slug, restaurantSettings]);

  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);
  const [myOrdersEmail, setMyOrdersEmail] = useState('');
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any | null>(null);

  const loadHistoryOrders = async (custEmail: string) => {
    if (!custEmail || !restaurantSettings.id) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantSettings.id)
        .eq('customer_email', custEmail.trim().toLowerCase())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mapped = (data || []).map((o: any) => ({
        id: o.order_number,
        db_id: o.id,
        timestamp: o.created_at,
        type: o.type,
        status: o.status,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        scheduledAt: o.scheduled_at,
        subtotal: parseFloat(o.subtotal),
        deliveryFee: parseFloat(o.delivery_fee),
        discount: parseFloat(o.discount),
        total: parseFloat(o.total),
        payMethod: 'cash',
        itemsCount: (o.order_items || []).reduce((s: number, item: any) => s + item.qty, 0),
        items: (o.order_items || []).map((oi: any) => ({
          name: oi.name,
          price: parseFloat(oi.price),
          qty: oi.qty,
          addedIngredients: oi.added_ingredients || [],
          removedIngredients: oi.removed_ingredients || [],
        })),
      }));

      setHistoryOrders(mapped);
    } catch (err) {
      console.error('Error loading history orders:', err);
    }
  };
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

    const itemsHtml = order.items
      .map((item: any) => {
        const customNotes =
          item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0
            ? '<div style="font-size: 10px; color: #666; margin-top: 2px;">' +
            item.addedIngredients
              ?.map((i: any) => '+' + (lang === 'en' && i.name_en ? i.name_en : i.name))
              .concat(item.removedIngredients?.map((i: string) => lang === 'en' ? '-Without ' + i : '-' + i))
              .join(', ') +
            '</div>'
            : '';
        const itemPrice =
          (item.price +
            (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) || 0)) *
          item.qty;
        return (
          '<div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">' +
          '<div>' +
          '<strong>' +
          item.qty +
          'x ' +
          (lang === 'en' && item.name_en ? item.name_en : item.name) +
          '</strong>' +
          customNotes +
          '</div>' +
          '<span>&euro; ' +
          itemPrice.toFixed(2) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    const tableRow =
      order.type === 'tavolo'
        ? '<div class="row"><strong>' + t('receipt_table').replace(':', '') + ':</strong> <span>' + order.tableNumber + '</span></div>'
        : '<div class="row"><strong>' + t('receipt_customer').replace(':', '') + ':</strong> <span>' +
        (order.customer?.name || order.customerName) +
        '</span></div>' +
        '<div class="row"><strong>' + t('receipt_phone').replace(':', '') + ':</strong> <span>' +
        order.customer?.phone +
        '</span></div>' +
        (order.type === 'domicilio'
          ? '<div class="row"><strong>' + t('receipt_address').replace(':', '') + ':</strong> <span>' +
          order.customer?.address +
          '</span></div>'
          : '');

    const deliveryFeeRow =
      order.deliveryFee > 0
        ? '<div class="row"><span>' + t('receipt_delivery').replace(':', '') + ':</span> <span>&euro; ' +
        order.deliveryFee.toFixed(2) +
        '</span></div>'
        : '';
    const discountRow =
      order.discount > 0
        ? '<div class="row" style="color: #16a34a;"><span>' + t('receipt_discount', { promo: '' }).replace(':', '') + ':</span> <span>-&euro; ' +
        order.discount.toFixed(2) +
        '</span></div>'
        : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${t('receipt_title')} - ${order.id}</title>
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
              <div style="font-size: 10px; color: #777; margin-top: 4px;">${t('receipt_title')}</div>
            </div>
            
            <div class="section">
              <div class="row"><strong>${t('receipt_order_id')}:</strong> <span>${order.order_number || order.id}</span></div>
              <div class="row"><strong>${t('receipt_date_time').replace(' & ORA', '').replace(' & TIME', '')}:</strong> <span>${new Date(order.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'it-IT')}</span></div>
              <div class="row"><strong>${t('receipt_service').replace(':', '')}:</strong> <span style="text-transform: capitalize;">${order.type === 'domicilio' ? t('checkout_home_delivery') : order.type === 'asporto' ? t('checkout_takeaway') : t('checkout_your_table')}</span></div>
              ${tableRow}
              <div class="row"><strong>${t('receipt_payment').replace(':', '')}:</strong> <span>${order.payMethod === 'online' ? 'PayPal (Online)' : order.payMethod === 'card' ? t('receipt_pay_card') : order.payMethod === 'pos' ? t('receipt_pay_pos') : t('receipt_pay_cash')}</span></div>
            </div>
            
            <div class="section">
              ${itemsHtml}
            </div>
            
            <div class="totals">
              <div class="row"><span>${t('receipt_subtotal').replace(':', '')}:</span> <span>&euro; ${order.subtotal.toFixed(2)}</span></div>
              ${deliveryFeeRow}
              ${discountRow}
              <div class="total-row"><span>${t('receipt_total').replace(':', '')}:</span> <span>&euro; ${order.total.toFixed(2)}</span></div>
            </div>
            
            <div class="footer">
              ${t('receipt_thanks')}
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

  const DigitalReceipt = ({ order, onPrint }: { order: any; onPrint?: () => void }) => {
    if (!order) return null;
    return (
      <div
        className="border border-border/80 rounded-xl bg-muted/30 p-4 text-left space-y-4 max-w-md mx-auto relative overflow-hidden"
        id={`receipt-${order.id}`}
      >
        <div className="flex justify-between items-start border-b border-border/40 pb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              ID ORDINE
            </p>
            <p className="text-sm font-black font-mono text-foreground">{order.order_number || order.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              DATA & ORA
            </p>
            <p className="text-xs font-semibold text-foreground">
              {new Date(order.timestamp).toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
            Riferimenti
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Servizio:</span>
            <span className="font-bold text-foreground capitalize">{order.type}</span>
          </div>
          {order.deliveryTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Programmato per:</span>
              <span className="font-bold text-amber-500">
                {order.deliveryDate
                  ? `${new Date(order.deliveryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} `
                  : ''}
                {order.deliveryTime === 'asap'
                  ? 'Il prima possibile'
                  : `alle ${order.deliveryTime}`}
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
                <span className="font-semibold text-foreground">
                  {order.customer?.name || order.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefono:</span>
                <span className="font-semibold text-foreground">{order.customer?.phone}</span>
              </div>
              {order.type === 'domicilio' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indirizzo:</span>
                  <span
                    className="font-semibold text-foreground text-right max-w-[200px] truncate"
                    title={order.customer?.address}
                  >
                    {order.customer?.address}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pagamento:</span>
            <span className="font-semibold text-foreground uppercase">
              {order.payMethod === 'online'
                ? 'PayPal (Online)'
                : order.payMethod === 'card'
                  ? 'Carta di Credito (Online)'
                  : order.payMethod === 'pos'
                    ? 'POS (Alla Consegna/Ritiro)'
                    : 'Contanti'}
            </span>
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">
            Prodotti Ordinati
          </p>
          <ul className="space-y-2 text-xs">
            {Array.isArray(order.items) &&
              order.items.map((item: any, idx: number) => (
                <li key={`receipt-item-${idx}`} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-foreground truncate">
                      {item.qty}× {item.name}
                    </p>
                    {(item.addedIngredients?.length > 0 || item.removedIngredients?.length > 0) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                        {item.addedIngredients
                          ?.map((i: any) => `+${i.name}`)
                          .concat(item.removedIngredients?.map((i: string) => `-${i}`))
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-foreground tabular-nums">
                    €{' '}
                    {(
                      (item.price +
                        (item.addedIngredients?.reduce((s: number, i: any) => s + i.price, 0) ||
                          0)) *
                      item.qty
                    ).toFixed(2)}
                  </span>
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
      targetDayName = DAYS_MAP[new Date().getDay()];
    }

    // 2. Cerca le fasce orarie specifiche di prenotazione (reservation) o general
    let activeRanges: { start: string; end: string }[] = [];
    let hasDedicatedReservationHours = false;

    if (serviceHoursConfig) {
      const useGeneral =
        serviceHoursConfig.useGeneral?.reservation !== false &&
        !!serviceHoursConfig.serviceHours?.general;
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
      const cutoffMin = hasDedicatedReservationHours ? endMin : endMin - 60;

      for (let min = startMin; min <= cutoffMin; min += 15) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    });

    return Array.from(new Set(slots)).sort();
  }, [restaurantSettings.openingHours, serviceHoursConfig, bookingDate]);

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
  const isTableEditable =
    !searchParams?.get('tavolo') ||
    searchParams?.get('tavolo')?.toLowerCase() === 'generico' ||
    searchParams?.get('tavolo')?.toLowerCase() === 'generic';
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
      if (tavoloParam.toLowerCase() === 'generico' || tavoloParam.toLowerCase() === 'generic') {
        setTableNumber('');
      } else {
        setTableNumber(tavoloParam);
      }
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
    const now = new Date();
    return (
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0')
    );
  };

  const getCurrentDateStr = React.useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const checkServiceOpen = React.useCallback(
    (serviceType: 'pickup' | 'delivery' | 'reservation') => {
      let config = serviceHoursConfig;
      if (!config && typeof window !== 'undefined') {
        const rId = getRestaurantId(slug);
        const stored =
          localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
          localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
        if (stored) {
          try {
            config = JSON.parse(stored);
          } catch (e) {
            /* ignore */
          }
        }
      }

      if (config) {
        // Controllo chiusura temporanea (es. ferie)
        if (
          config.temporaryClosure?.enabled &&
          config.temporaryClosure.from &&
          config.temporaryClosure.to
        ) {
          const currentDate = getCurrentDateStr();
          if (
            currentDate >= config.temporaryClosure.from &&
            currentDate <= config.temporaryClosure.to
          ) {
            return false;
          }
        }

        if (config.serviceSuspended?.[serviceType] === true) {
          return false;
        }
        const DAYS_MAP = [
          'Domenica',
          'Lunedì',
          'Martedì',
          'Mercoledì',
          'Giovedì',
          'Venerdì',
          'Sabato',
        ];
        const todayDayName = DAYS_MAP[new Date().getDay()];

        const useGeneral =
          config.useGeneral?.[serviceType] !== false && !!config.serviceHours?.general;
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
        return (
          !restaurantSettings.deliveryHours ||
          restaurantSettings.deliveryHours.length === 0 ||
          restaurantSettings.deliveryHours.some((h) => currentStr >= h.start && currentStr <= h.end)
        );
      } else {
        return (
          !restaurantSettings.openingHours ||
          restaurantSettings.openingHours.length === 0 ||
          restaurantSettings.openingHours.some((h) => currentStr >= h.start && currentStr <= h.end)
        );
      }
    },
    [serviceHoursConfig, slug, restaurantSettings, getCurrentDateStr]
  );
  const getClosedReason = () => {
    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored =
        localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
        localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) {
          /* ignore */
        }
      }
    }

    const activeType = deliveryType === 'domicilio' ? 'delivery' : 'pickup';
    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const DAYS_MAP_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = new Date().getDay();
    const todayDayName = DAYS_MAP[dayIndex];
    const todayDayNameEn = DAYS_MAP_EN[dayIndex];
    const displayDay = lang === 'en' ? todayDayNameEn : todayDayName;
    const serviceName = activeType === 'delivery'
      ? (lang === 'en' ? 'delivery' : 'consegna')
      : (lang === 'en' ? 'takeaway' : 'asporto');
    const serviceNameCap = activeType === 'delivery'
      ? (lang === 'en' ? 'Delivery' : 'Consegna')
      : (lang === 'en' ? 'Takeaway' : 'Asporto');

    if (config) {
      // Controllo chiusura temporanea (es. ferie)
      if (
        config.temporaryClosure?.enabled &&
        config.temporaryClosure.from &&
        config.temporaryClosure.to
      ) {
        const currentDate = getCurrentDateStr();
        if (
          currentDate >= config.temporaryClosure.from &&
          currentDate <= config.temporaryClosure.to
        ) {
          if (lang === 'en') {
            return `We are closed for holidays from ${config.temporaryClosure.from} to ${config.temporaryClosure.to}.`;
          }
          return (
            config.temporaryClosure.message ||
            `Siamo chiusi per ferie dal ${config.temporaryClosure.from} al ${config.temporaryClosure.to}.`
          );
        }
      }
    }

    if (config) {
      if (config.serviceSuspended?.[activeType] === true) {
        if (lang === 'en') {
          return `The ${serviceNameCap} service has been temporarily suspended by the manager.`;
        }
        return `Il servizio di ${activeType === 'delivery' ? 'Consegna' : 'Asporto'} è stato temporaneamente sospeso dal gestore.`;
      }

      const useGeneral =
        config.useGeneral?.[activeType] !== false && !!config.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : activeType;

      const dayConfig = config.serviceHours?.[targetHoursKey]?.[todayDayName];
      if (dayConfig) {
        if (dayConfig.enabled === false) {
          if (lang === 'en') {
            return `Sorry, the restaurant is closed on ${todayDayNameEn} for ${serviceName} service.`;
          }
          return `Spiacenti, il ristorante è chiuso il ${todayDayName} per il servizio di ${activeType === 'delivery' ? 'consegna' : 'asporto'}.`;
        }

        const lunchEnabled = dayConfig.lunchEnabled !== false;
        const dinnerEnabled = dayConfig.dinnerEnabled !== false;

        let hoursStr = '';
        if (lang === 'en') {
          if (lunchEnabled && dinnerEnabled) {
            hoursStr = `lunch ${dayConfig.lunch.from}-${dayConfig.lunch.to}, dinner ${dayConfig.dinner.from}-${dayConfig.dinner.to}`;
          } else if (lunchEnabled) {
            hoursStr = `lunch ${dayConfig.lunch.from}-${dayConfig.lunch.to}`;
          } else if (dinnerEnabled) {
            hoursStr = `dinner ${dayConfig.dinner.from}-${dayConfig.dinner.to}`;
          } else {
            hoursStr = `no active time slots`;
          }
          return `We are sorry, we are currently closed. Service hours for ${todayDayNameEn}: ${hoursStr}.`;
        } else {
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
    }

    if (lang === 'en') {
      return 'We are sorry, the restaurant is closed at the moment. You can browse the menu but cannot place orders.';
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

    const isPickupOpen = checkServiceOpen('pickup');
    const isDeliveryOpen = checkServiceOpen('delivery');

    if (!isPickupOpen && !isDeliveryOpen) {
      if (!preOrderAcknowledged) {
        setAvailabilityError('closed');
      } else {
        setAvailabilityError(null);
      }
      return;
    }

    if (deliveryType === 'domicilio' && !isDeliveryOpen) {
      setAvailabilityError('no_delivery');
      return;
    }

    setAvailabilityError(null);
  }, [deliveryType, checkServiceOpen, searchParams, preOrderAcknowledged]);

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
    flyDot.className =
      'fixed z-[9999] flex items-center justify-center bg-primary text-white text-[11px] font-black rounded-full pointer-events-none shadow-lg';
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
        gsap
          .timeline()
          .to(targetEl, { scale: 1.15, duration: 0.1 })
          .to(targetEl, { rotation: 8, duration: 0.05, repeat: 3, yoyo: true })
          .to(targetEl, { rotation: 0, scale: 1, duration: 0.1 });
      },
    });

    // Horizontal linear movement
    tl.to(
      flyDot,
      {
        x: dx,
        duration: 0.75,
        ease: 'power1.inOut',
      },
      0
    );

    // Vertical arc (goes up then falls down)
    tl.to(
      flyDot,
      {
        y: peakY,
        scale: 1.3,
        duration: 0.35,
        ease: 'power1.out',
      },
      0
    ).to(
      flyDot,
      {
        y: dy,
        scale: 0.4,
        opacity: 0.5,
        duration: 0.4,
        ease: 'power2.in',
      },
      0.35
    );
  };

  const addToCartCustom = (
    item: MenuItemType,
    qty: number,
    addedIngredients: { name: string; price: number }[],
    removedIngredients: string[],
    note: string
  ) => {
    if (isCurrentlyClosed && !isPreOrderAllowed) return;

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
    if (isCurrentlyClosed && !isPreOrderAllowed) return;
    const cartItem = item as CartItem;
    if (cartItem.cartId) {
      setCart((prev) =>
        prev.map((c) => (c.cartId === cartItem.cartId ? { ...c, qty: c.qty + 1 } : c))
      );
      return;
    }
    // Direct add to cart if customizations are disabled
    if (item.customizationEnabled === false) {
      setCart((prev) => {
        const existing = prev.find(
          (c) =>
            c.id === item.id &&
            (!c.addedIngredients || c.addedIngredients.length === 0) &&
            (!c.removedIngredients || c.removedIngredients.length === 0) &&
            !c.note
        );
        if (existing) {
          return prev.map((c) =>
            c.id === item.id &&
              (!c.addedIngredients || c.addedIngredients.length === 0) &&
              (!c.removedIngredients || c.removedIngredients.length === 0) &&
              !c.note
              ? { ...c, qty: c.qty + 1 }
              : c
          );
        }
        const newCartItem: CartItem = {
          ...item,
          cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          qty: 1,
          addedIngredients: [],
          removedIngredients: [],
          note: '',
        };
        return [...prev, newCartItem];
      });
      setCartOpen(true);
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

  const activeServiceType =
    deliveryType === 'domicilio'
      ? 'delivery'
      : deliveryType === 'asporto'
        ? 'pickup'
        : 'reservation';
  const isCurrentlyClosed = isMounted ? !checkServiceOpen(activeServiceType) : false;

  const isTemporaryClosure = React.useMemo(() => {
    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored =
        localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
        localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) {
          /* ignore */
        }
      }
    }
    if (
      config?.temporaryClosure?.enabled &&
      config.temporaryClosure.from &&
      config.temporaryClosure.to
    ) {
      const currentDate = getCurrentDateStr();
      if (
        currentDate >= config.temporaryClosure.from &&
        currentDate <= config.temporaryClosure.to
      ) {
        return true;
      }
    }
    return false;
  }, [serviceHoursConfig, slug, getCurrentDateStr]);

  const closureMessage = React.useMemo(() => {
    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored =
        localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
        localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) {
          /* ignore */
        }
      }
    }
    if (
      config?.temporaryClosure?.enabled &&
      config.temporaryClosure.from &&
      config.temporaryClosure.to
    ) {
      const currentDate = getCurrentDateStr();
      if (
        currentDate >= config.temporaryClosure.from &&
        currentDate <= config.temporaryClosure.to
      ) {
        return (
          config.temporaryClosure.message ||
          `Siamo chiusi per ferie dal ${config.temporaryClosure.from} al ${config.temporaryClosure.to}.`
        );
      }
    }
    return null;
  }, [serviceHoursConfig, slug, getCurrentDateStr]);

  const isPreOrderAllowed = React.useMemo(() => {
    if (isTemporaryClosure) return false;
    return true;
  }, [isTemporaryClosure]);

  const getRestaurantStatus = () => {
    if (!isMounted) {
      return { label: lang === 'en' ? 'OPEN' : 'APERTO', color: 'bg-green-500/20 border-green-500/40 text-green-300' };
    }

    if (isTemporaryClosure) {
      return { label: lang === 'en' ? 'CLOSED FOR HOLIDAYS' : 'CHIUSO PER FERIE', color: 'bg-red-500/20 border-red-500/40 text-red-300' };
    }

    const isPickupOpen = checkServiceOpen('pickup');
    const isDeliveryOpen = checkServiceOpen('delivery');

    if (!isPickupOpen && !isDeliveryOpen) {
      if (isPreOrderAllowed) {
        return {
          label: lang === 'en' ? 'PRE-ORDERS ACTIVE' : 'PREORDINI ATTIVI',
          color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
        };
      }
      return { label: lang === 'en' ? 'CLOSED' : 'CHIUSO', color: 'bg-red-500/20 border-red-500/40 text-red-300' };
    }
    if (isPickupOpen && !isDeliveryOpen) {
      return { label: lang === 'en' ? 'TAKEAWAY ONLY' : 'SOLO ASPORTO', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };
    }
    return { label: lang === 'en' ? 'OPEN' : 'APERTO', color: 'bg-green-500/20 border-green-500/40 text-green-300' };
  };

  const status = getRestaurantStatus();

  const formattedTodayHours = React.useMemo(() => {
    if (!isMounted) return '';

    let config = serviceHoursConfig;
    if (!config && typeof window !== 'undefined') {
      const rId = getRestaurantId(slug);
      const stored =
        localStorage.getItem(STORAGE_KEYS.serviceHours(rId)) ||
        localStorage.getItem(STORAGE_KEYS.serviceHours(slug));
      if (stored) {
        try {
          config = JSON.parse(stored);
        } catch (e) {
          /* ignore */
        }
      }
    }

    if (
      config?.temporaryClosure?.enabled &&
      config.temporaryClosure.from &&
      config.temporaryClosure.to
    ) {
      const currentDate = getCurrentDateStr();
      if (
        currentDate >= config.temporaryClosure.from &&
        currentDate <= config.temporaryClosure.to
      ) {
        return lang === 'en' ? 'Holiday' : 'Ferie';
      }
    }

    const DAYS_MAP = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const todayDayName = DAYS_MAP[new Date().getDay()];

    const activeType =
      deliveryType === 'domicilio'
        ? 'delivery'
        : deliveryType === 'asporto'
          ? 'pickup'
          : 'reservation';

    if (config) {
      if (config.serviceSuspended?.[activeType] === true) {
        return lang === 'en' ? 'Suspended' : 'Sospeso';
      }

      const useGeneral =
        config.useGeneral?.[activeType] !== false && !!config.serviceHours?.general;
      const targetHoursKey = useGeneral ? 'general' : activeType;

      const dayConfig = config.serviceHours?.[targetHoursKey]?.[todayDayName];
      if (dayConfig) {
        if (dayConfig.enabled === false) {
          return lang === 'en' ? 'Closed' : 'Chiuso';
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
        return parts.length > 0 ? parts.join(', ') : (lang === 'en' ? 'Closed' : 'Chiuso');
      }
    }

    const legacyHours =
      deliveryType === 'domicilio'
        ? restaurantSettings.deliveryHours
        : restaurantSettings.openingHours;

    if (legacyHours && legacyHours.length > 0) {
      const is24h =
        legacyHours.length === 1 &&
        legacyHours[0].start === '00:00' &&
        legacyHours[0].end === '23:59';
      if (is24h) {
        return lang === 'en' ? '24 Hours' : '24 Ore';
      }
      return legacyHours.map((h) => `${h.start}-${h.end}`).join(', ');
    }

    return lang === 'en' ? 'Closed' : 'Chiuso';
  }, [isMounted, serviceHoursConfig, slug, deliveryType, restaurantSettings, getCurrentDateStr, lang]);

  // Dynamic promo banner text
  const activePromo = promos.find((p) => p.active);
  let bannerText = '';
  if (activePromo) {
    if (activePromo.customBannerText) {
      bannerText = activePromo.customBannerText;
    } else {
      const minStr =
        activePromo.minOrderSubtotal && activePromo.minOrderSubtotal > 0
          ? (lang === 'en'
            ? ` with a minimum spend of € ${activePromo.minOrderSubtotal.toFixed(2)}`
            : ` con spesa minima di € ${activePromo.minOrderSubtotal.toFixed(2)}`)
          : '';
      if (activePromo.type === 'percentage') {
        bannerText = lang === 'en'
          ? `Use code ${activePromo.code} for ${activePromo.value}% off${minStr}!`
          : `Usa il codice ${activePromo.code} per il ${activePromo.value}% di sconto${minStr}!`;
      } else if (activePromo.type === 'first_order') {
        bannerText = lang === 'en'
          ? `Use code ${activePromo.code} for ${activePromo.value}% off on your first order${minStr}!`
          : `Usa il codice ${activePromo.code} per il ${activePromo.value}% di sconto sul tuo primo ordine${minStr}!`;
      } else if (activePromo.type === 'fixed_amount') {
        bannerText = lang === 'en'
          ? `Use code ${activePromo.code} for a fixed € ${activePromo.value.toFixed(2)} discount${minStr}!`
          : `Usa il codice ${activePromo.code} per uno sconto fisso di € ${activePromo.value.toFixed(2)}${minStr}!`;
      } else if (activePromo.type === 'threshold_based') {
        bannerText = lang === 'en'
          ? `Use code ${activePromo.code} for a € ${activePromo.value.toFixed(2)} discount${minStr}!`
          : `Usa il codice ${activePromo.code} per uno sconto di € ${activePromo.value.toFixed(2)}${minStr}!`;
      } else if (activePromo.type === 'free_delivery') {
        bannerText = lang === 'en'
          ? `Use code ${activePromo.code} to get free delivery${minStr}!`
          : `Usa il codice ${activePromo.code} per ottenere la consegna gratuita${minStr}!`;
      }
    }
  } else {
    bannerText = '';
  }

  const handleCheckoutClick = () => {
    if (deliveryType === 'tavolo') {
      setCartOpen(false);
      setCheckoutOpen(true);
      return;
    }

    const isPickupOpen = checkServiceOpen('pickup');
    const isDeliveryOpen = checkServiceOpen('delivery');

    if (!isPickupOpen && !isDeliveryOpen) {
      if (isPreOrderAllowed) {
        setPreOrderAcknowledged(true);
        setCartOpen(false);
        setCheckoutOpen(true);
      } else {
        setAvailabilityError('closed');
      }
      return;
    }

    if (deliveryType === 'domicilio' && !isDeliveryOpen) {
      setAvailabilityError('no_delivery');
      return;
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
      ? appliedPromoDetail.type === 'percentage' || appliedPromoDetail.type === 'first_order'
        ? subtotal * (appliedPromoDetail.value / 100)
        : appliedPromoDetail.type === 'free_delivery'
          ? actualDeliveryFee
          : Math.min(appliedPromoDetail.value, subtotal)
      : 0;

  const total = subtotal - discount + actualDeliveryFee;

  const applyPromo = async () => {
    const res = await validatePromo(promoCode, subtotal, email, deliveryType, actualDeliveryFee);
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
      const checkPromo = async () => {
        const res = await validatePromo(
          appliedPromoDetail.code,
          subtotal,
          email,
          deliveryType,
          actualDeliveryFee
        );
        if (!res.isValid) {
          setPromoApplied(false);
          setPromoError(res.error || "L'ordine non soddisfa più i requisiti della promo");
          setAppliedPromoDetail(null);
        }
      };
      checkPromo();
    }
  }, [
    subtotal,
    promoApplied,
    appliedPromoDetail,
    validatePromo,
    email,
    deliveryType,
    actualDeliveryFee,
  ]);

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
    <div
      className={`flex flex-col min-h-screen bg-background ${cartCount > 0 ? 'pb-24 lg:pb-0' : 'pb-16 md:pb-0'}`}
    >
      {/* Closed Banner */}
      {isCurrentlyClosed && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 text-white text-[10px] sm:text-xs font-bold py-2 px-3 text-center flex items-center justify-center gap-1.5 shadow-md ${isPreOrderAllowed ? 'bg-amber-600' : 'bg-red-600'}`}
        >
          <Clock size={12} className="animate-pulse flex-shrink-0" />
          <span className="truncate max-w-full">
            {isTemporaryClosure
              ? closureMessage || (lang === 'en' ? 'Closed for Holidays' : 'Locale Chiuso per Ferie')
              : isPreOrderAllowed
                ? (lang === 'en' ? 'We are closed now, but you can pre-order for later!' : 'Siamo chiusi ora, ma puoi ordinare per dopo!')
                : (lang === 'en' ? 'Restaurant Closed - Menu consultation only' : 'Locale Chiuso - Solo consultazione menu')}
          </span>
        </div>
      )}

      {/* Topbar */}
      {/* Topbar */}
      <header
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${isCurrentlyClosed ? 'top-8' : 'top-0'}`}
        ref={headerRef}
      >
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
                placeholder={t('search_placeholder')}
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
              title={lang === 'en' ? 'Share Menu' : 'Condividi Vetrina'}
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
                    loadHistoryOrders(myOrdersEmail);
                  } else {
                    setHistoryOrders([]);
                  }
                }}
                title={lang === 'en' ? 'My orders' : 'I miei ordini'}
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
                {lang === 'en' ? 'BOOK A TABLE' : 'PRENOTA TAVOLO'}
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setLang('it')}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all transform active:scale-90 select-none overflow-hidden ${lang === 'it'
                    ? 'opacity-100 scale-110'
                    : 'opacity-35 hover:opacity-80 hover:scale-105'
                  }`}
                title="Italiano"
              >
                <FlagIT />
              </button>
              <button
                onClick={() => setLang('en')}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all transform active:scale-90 select-none overflow-hidden ${lang === 'en'
                    ? 'opacity-100 scale-110'
                    : 'opacity-35 hover:opacity-80 hover:scale-105'
                  }`}
                title="English"
              >
                <FlagEN />
              </button>
            </div>

            {/* Cart Button (Visible on both desktop & mobile) */}
            <button
              id="header-cart-button"
              onClick={() => setCartOpen((o) => !o)}
              className={`relative flex items-center justify-center gap-2 px-4 h-10 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm ${!isScrolled
                ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
                : 'bg-primary text-white hover:bg-primary-hover'
                }`}
            >
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">{t('menu_cart')}</span>
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
        <div
          className={`fixed left-0 right-0 z-35 transition-all duration-300 ${isCurrentlyClosed ? 'top-[6rem] sm:top-[6.5rem]' : 'top-[4rem] sm:top-[4.5rem]'} bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900/30 py-2.5 px-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]`}
        >
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold">
              <Calendar size={14} className="flex-shrink-0 animate-pulse text-green-600" />
              <span className="truncate text-foreground font-semibold">
                {t('modal_table_booking_banner_title')}{' '}
                <span className="font-extrabold text-green-600 dark:text-green-400">
                  {new Date(bookingContext.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'it-IT', {
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  {bookingContext.time}
                </span>{' '}
                · {bookingContext.guests} {bookingContext.guests === 1 ? t('checkout_guest_single') : t('checkout_guests')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm text-[11px] uppercase tracking-wider"
              >
                {t('modal_complete')} →
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(lang === 'en' ? 'Do you want to cancel the reservation? This will also clear the cart.' : 'Vuoi annullare la prenotazione? Questo svuoterà anche il carrello.')
                  ) {
                    setBookingContext(null);
                    setCart([]);
                  }
                }}
                className="text-red-500 hover:text-red-700 font-bold px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-[11px] uppercase tracking-wider"
              >
                {t('modal_cancel')}
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
                  <MapPin size={14} />
                  {restaurantSettings.address ?? ''}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <Bike size={14} />
                  Consegna € {(restaurantSettings.deliveryFee ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promo banner */}
      {deliveryType !== 'tavolo' && activePromo && bannerText && (
        <div className="bg-secondary border-b border-orange-200">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-2.5 flex items-center gap-3">
            <Tag size={14} className="text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-semibold">
              {activePromo.customBannerText ? (
                activePromo.customBannerText
              ) : (
                <>
                  {lang === 'en' ? (
                    <>
                      Use code <strong>{activePromo.code}</strong>{' '}
                      {activePromo.type === 'percentage' && `for ${activePromo.value}% off`}
                      {activePromo.type === 'first_order' && `for ${activePromo.value}% off on your first order`}
                      {activePromo.type === 'fixed_amount' && `for a fixed € ${activePromo.value.toFixed(2)} discount`}
                      {activePromo.type === 'threshold_based' && `for a € ${activePromo.value.toFixed(2)} discount`}
                      {activePromo.type === 'free_delivery' && `to get free delivery`}
                      {activePromo.minOrderSubtotal &&
                        activePromo.minOrderSubtotal > 0 &&
                        ` with a minimum spend of € ${activePromo.minOrderSubtotal.toFixed(2)}`}
                      !
                    </>
                  ) : (
                    <>
                      Usa il codice <strong>{activePromo.code}</strong> per{' '}
                      {activePromo.type === 'percentage' &&
                        `ricevere il ${activePromo.value}% di sconto`}
                      {activePromo.type === 'first_order' &&
                        `ricevere il ${activePromo.value}% di sconto sul tuo primo ordine`}
                      {activePromo.type === 'fixed_amount' &&
                        `ricevere uno sconto fisso di € ${activePromo.value.toFixed(2)}`}
                      {activePromo.type === 'threshold_based' &&
                        `ricevere uno sconto di € ${activePromo.value.toFixed(2)}`}
                      {activePromo.type === 'free_delivery' && `ottenere la consegna gratuita`}
                      {activePromo.minOrderSubtotal &&
                        activePromo.minOrderSubtotal > 0 &&
                        ` su una spesa minima di € ${activePromo.minOrderSubtotal.toFixed(2)}`}
                      !
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Sticky category nav */}
      <div
        className={`sticky z-30 bg-card border-b border-border shadow-card transition-all duration-300 ${bookingContext ? (isCurrentlyClosed ? 'top-[8.5rem] sm:top-[9rem]' : 'top-[6.5rem] sm:top-[7.25rem]') : isCurrentlyClosed ? 'top-[6rem] sm:top-[6.5rem]' : 'top-16 sm:top-[4.5rem]'}`}
      >
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10">
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
                  <span>{getDisplayCategoryName(cat)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div id="menu-section" className="flex-1 w-full max-w-screen-2xl mx-auto px-6 lg:px-10 py-8">
        {/* Menu content */}
        <main className="space-y-12">
          {searchQuery ? (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                {lang === 'en'
                  ? `${filteredItems.length} results for "${searchQuery}"`
                  : `${filteredItems.length} risultati per "${searchQuery}"`}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 w-full">
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
                  <p className="font-semibold text-foreground">
                    {lang === 'en' ? 'No products found' : 'Nessun prodotto trovato'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lang === 'en' ? 'Try searching for something else' : 'Prova con un termine diverso'}
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
                      <span>{getDisplayCategoryName('Promozioni')}</span>
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
                  <span>{getDisplayCategoryName(activeCategory)}</span>
                </h2>
                <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-bold">
                  {displayedItems.length} {displayedItems.length === 1 ? (lang === 'en' ? 'product' : 'prodotto') : (lang === 'en' ? 'products' : 'prodotti')}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 w-full">
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
                isPreOrderAllowed={isPreOrderAllowed}
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
        disabled={isCurrentlyClosed && !isPreOrderAllowed}
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
                addBookingPreOrderItemCustom(
                  customizingItem,
                  qty,
                  addedIngredients,
                  removedIngredients,
                  note
                );
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
        setTableNumber={setTableNumber}
        isTableEditable={isTableEditable}
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
        isCurrentlyClosed={isCurrentlyClosed}
      />

      {/* Availability Error Modal */}
      <Modal
        open={!!availabilityError}
        onClose={() => {
          if (availabilityError === 'closed') {
            setPreOrderAcknowledged(true);
          }
          setAvailabilityError(null);
        }}
        hideClose={true}
        size="sm"
      >
        <div className="space-y-4 text-center py-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${availabilityError === 'closed'
              ? isPreOrderAllowed
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-red-500/10 text-red-500'
              : 'bg-amber-500/10 text-amber-500'
              }`}
          >
            {availabilityError === 'closed' ? <Clock size={22} /> : <Bike size={22} />}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {availabilityError === 'closed' ? t('modal_closed_title') : t('modal_delivery_unavailable')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {availabilityError === 'closed' && isPreOrderAllowed
                ? t('modal_preorder_desc')
                : getClosedReason()}
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            {availabilityError === 'closed' && isPreOrderAllowed ? (
              <>
                <button
                  onClick={() => {
                    setPreOrderAcknowledged(true);
                    setAvailabilityError(null);
                  }}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-md shadow-primary/10"
                >
                  {t('cart_preorder')}
                </button>
                <button
                  onClick={() => {
                    setPreOrderAcknowledged(true);
                    setAvailabilityError(null);
                  }}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  {t('modal_browse_menu')}
                </button>
              </>
            ) : availabilityError === 'no_delivery' ? (
              <>
                <button
                  onClick={() => {
                    setDeliveryType('asporto');
                    setAvailabilityError(null);
                  }}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-md shadow-primary/10"
                >
                  {t('modal_order_takeaway')}
                </button>
                <button
                  onClick={() => setAvailabilityError(null)}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  {t('modal_browse_menu')}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (availabilityError === 'closed') {
                    setPreOrderAcknowledged(true);
                  }
                  setAvailabilityError(null);
                }}
                className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-md shadow-primary/10"
              >
                {t('modal_browse_menu')}
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
                  <h3 className="font-bold text-foreground text-sm leading-tight">
                    Prenota un Tavolo
                  </h3>
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
                    <h4 className="text-lg font-bold text-foreground mb-1">
                      Prenotazione Inviata!
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      In attesa di conferma dal ristorante. Ti invieremo una notifica di conferma
                      qui sul menu.
                    </p>
                  </div>
                  <div className="bg-muted/60 rounded-2xl p-4 text-left space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Users size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>
                        {bookingGuests} {bookingGuests === 1 ? 'persona' : 'persone'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <CalendarCheck size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>
                        {bookingDate} alle {bookingTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <User size={14} className="text-muted-foreground flex-shrink-0" />
                      <span>
                        {bookingName} ({bookingPhone})
                      </span>
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
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Giorno *
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Orario *
                      </label>
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
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Persone *
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBookingGuests((g) => Math.max(1, g - 1))}
                        className="w-10 h-10 rounded-xl bg-muted hover:bg-border transition-colors font-bold text-xl leading-none select-none"
                      >
                        −
                      </button>
                      <span className="text-2xl font-bold text-foreground w-10 text-center tabular-nums">
                        {bookingGuests}
                      </span>
                      <button
                        onClick={() => setBookingGuests((g) => Math.min(20, g + 1))}
                        className="w-10 h-10 rounded-xl bg-muted hover:bg-border transition-colors font-bold text-xl leading-none select-none"
                      >
                        +
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {bookingGuests === 1 ? 'persona' : 'persone'}
                      </span>
                    </div>
                  </div>

                  {/* Name + Phone side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        placeholder="Il tuo nome"
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Telefono *
                      </label>
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
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Note (opzionale)
                    </label>
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
                  disabled={
                    !bookingDate ||
                    !bookingTime ||
                    bookingGuests < 1 ||
                    !bookingName.trim() ||
                    !bookingPhone.trim()
                  }
                  onClick={() => {
                    // Submit Solo Tavolo
                    try {
                      localStorage.setItem(
                        'iGO_booking_info',
                        JSON.stringify({ name: bookingName, phone: bookingPhone })
                      );
                      const rId = getRestaurantId(slug);
                      const bookingsKey = STORAGE_KEYS.bookings(rId);
                      const existingStr = localStorage.getItem(bookingsKey);
                      let bookingsArray: any[] = [];
                      if (existingStr) {
                        try {
                          bookingsArray = JSON.parse(existingStr);
                        } catch (e) {
                          console.error(e);
                        }
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
                      sessionStorage.setItem(
                        `iGO_last_order_${slug}`,
                        JSON.stringify(trackedOrder)
                      );

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
                  disabled={
                    !bookingDate ||
                    !bookingTime ||
                    bookingGuests < 1 ||
                    !bookingName.trim() ||
                    !bookingPhone.trim()
                  }
                  onClick={() => {
                    // Ordina anche il cibo
                    if (cart.length > 0) {
                      const ok = window.confirm(
                        lang === 'en'
                          ? 'You already have items in the cart. Do you want to clear the cart and start an order associated with this booking?'
                          : 'Hai già dei piatti nel carrello. Vuoi svuotare il carrello e iniziare un ordine associato a questa prenotazione?'
                      );
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

      {/* Floating Test controller for Simulation removed */}

      {/* My Orders Modal */}
      <Modal
        open={showMyOrdersModal}
        onClose={() => {
          setShowMyOrdersModal(false);
          setSelectedHistoryOrder(null);
        }}
        size="md"
        hideClose={true}
      >
        <div className="flex flex-col h-full">
          {/* Simple Header with logo and close button X on the right */}
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-border/40">
            {/* Left spacer to center-align the logo */}
            <div className="w-8" />

            {restaurantSettings.logoUrl ? (
              <img
                src={restaurantSettings.logoUrl}
                alt={restaurantSettings.name}
                className="h-10 w-auto object-contain max-w-[130px]"
              />
            ) : (
              <span className="text-base font-bold text-foreground">
                {restaurantSettings.name}
              </span>
            )}

            <button
              onClick={() => {
                setShowMyOrdersModal(false);
                setSelectedHistoryOrder(null);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div>
            {selectedHistoryOrder ? (
              <div className="space-y-4">
                <div className="flex justify-start items-center">
                  <button
                    onClick={() => setSelectedHistoryOrder(null)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-2 animate-fade-in"
                  >
                    ← Torna alla lista
                  </button>
                </div>
                <DigitalReceipt
                  order={selectedHistoryOrder}
                  onPrint={() => handlePrintReceipt(selectedHistoryOrder)}
                />
              </div>
            ) : !myOrdersEmail ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!historyEmailInput.trim()) {
                    setHistoryEmailError("L'email è obbligatoria.");
                    return;
                  }
                  if (!emailRegex.test(historyEmailInput.trim())) {
                    setHistoryEmailError('Inserisci un indirizzo email valido.');
                    return;
                  }
                  setHistoryEmailError(null);
                  const cleanedEmail = historyEmailInput.trim().toLowerCase();
                  setMyOrdersEmail(cleanedEmail);
                  loadHistoryOrders(cleanedEmail);
                }}
                className="space-y-4 py-4 text-center"
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <History size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">Visualizza i tuoi ordini</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Inserisci l&apos;email utilizzata per gli ordini per recuperare lo storico dei tuoi
                    ultimi 10 acquisti.
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
                    className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors"
                  >
                    Cerca Ordini
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-1">
                <div className="flex justify-between items-center px-4 py-2 bg-muted/40 border border-border/40 rounded-xl text-xs">
                  <span className="text-muted-foreground font-medium">
                    Ordini per: <strong className="text-foreground">{myOrdersEmail}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setMyOrdersEmail('');
                      setHistoryEmailInput('');
                      setHistoryOrders([]);
                    }}
                    className="text-xs text-red-500 font-extrabold hover:underline"
                  >
                    Modifica
                  </button>
                </div>

                {historyOrders.length === 0 ? (
                  <div className="text-center py-8 space-y-2 text-muted-foreground">
                    <p className="text-sm font-semibold">Nessun ordine trovato per questa email.</p>
                    <p className="text-xs text-muted-foreground/70">Gli ordini effettuati compariranno qui.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                    {historyOrders.map((order: any) => {
                      const liveStatus = order.status;

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

                      const formatItalianDateTime = (dateStr: string | null | undefined) => {
                        if (!dateStr) return '';
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return dateStr;
                        const pad = (n: number) => String(n).padStart(2, '0');
                        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                      };

                      const getOrderTypeName = (type: string) => {
                        switch (type) {
                          case 'domicilio':
                            return 'Consegna a domicilio';
                          case 'asporto':
                            return 'Asporto';
                          case 'tavolo':
                            return 'Ordine al Tavolo';
                          case 'prenotazione_tavolo':
                            return 'Prenotazione';
                          default:
                            return type;
                        }
                      };

                      return (
                        <div
                          key={order.db_id || order.id}
                          onClick={() => setSelectedHistoryOrder({ ...order, status: liveStatus })}
                          className="border border-border/70 hover:border-primary/45 rounded-2xl p-4 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]"
                        >
                          {/* Row 1: Left: Order Type, Right: Date and Time in Italian format */}
                          <div className="flex justify-between items-center text-xs mb-3">
                            <div className="text-left space-y-0.5">
                              <span className="block text-[10px] sm:text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                                Tipologia
                              </span>
                              <span className="text-xs sm:text-[13px] font-black text-foreground">
                                {getOrderTypeName(order.type)}
                              </span>
                            </div>
                            <div className="text-right space-y-0.5 flex flex-col items-end">
                              <span className="block text-[10px] sm:text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                                Data Ordine
                              </span>
                              <span className="text-xs sm:text-[13px] font-extrabold text-foreground/80">
                                {formatItalianDateTime(order.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Row 2+: Grid details */}
                          <div className="space-y-2 pt-2.5 border-t border-border/50">
                            <div className="flex justify-between items-start gap-4 text-[11px] sm:text-xs">
                              <span className="text-muted-foreground/80 font-medium">Nominativo</span>
                              <span className="font-extrabold text-foreground text-right">
                                {order.customerName || 'N/A'}
                              </span>
                            </div>

                            {order.type === 'domicilio' && order.customerAddress && (
                              <div className="flex justify-between items-start gap-4 text-[11px] sm:text-xs">
                                <span className="text-muted-foreground/80 font-medium">Indirizzo</span>
                                <span className="font-extrabold text-foreground text-right break-words max-w-[70%]">
                                  {order.customerAddress}
                                </span>
                              </div>
                            )}

                            {order.type !== 'tavolo' && order.customerPhone && (
                              <div className="flex justify-between items-start gap-4 text-[11px] sm:text-xs">
                                <span className="text-muted-foreground/80 font-medium">Telefono</span>
                                <span className="font-extrabold text-foreground text-right">
                                  {order.customerPhone}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center gap-4 text-xs pt-1">
                              <span className="text-muted-foreground/80 font-medium">Totale</span>
                              <span className="text-sm sm:text-base font-black text-foreground tabular-nums">
                                € {order.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
