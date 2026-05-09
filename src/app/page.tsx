'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ShoppingCart, Search, MapPin, Clock, Star, Plus, Minus, Trash2, Tag, Bike, Phone, X, CheckCircle, ChefHat, Package, Calendar, CalendarCheck } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface MenuItemType {
  id: string;
  name: string;
  category: string;
  price: number;
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
}

// ─── Mock Data ────────────────────────────────────────────────
const restaurant = {
  name: 'Pizzeria Bella Napoli',
  tagline: 'Autentica pizza napoletana dal 1987',
  address: 'Via Roma 24, Milano',
  rating: 4.8,
  reviews: 312,
  deliveryTime: '25–40 min',
  minOrder: 12,
  deliveryFee: 2.50,
  phone: '+39 02 1234567',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_14a7b3042-1772810039848.png",
  imageAlt: 'Interno di pizzeria italiana con tavoli in legno e luci calde ambientali',
  logoUrl: '',
};

const categories = ['Antipasti', 'Primi', 'Pizza', 'Secondi', 'Dolci', 'Bevande'];

const menuItems: MenuItemType[] = [
{ id: 'sf-001', name: 'Antipasto Misto', category: 'Antipasti', price: 12.00, description: 'Salumi selezionati DOP, formaggi stagionati, olive taggiasche, bruschette al pomodoro', image: "https://images.unsplash.com/photo-1616316326562-f081d9616d6b", imageAlt: 'Tagliere di antipasto misto con salumi, formaggi, olive e bruschette', popular: true, veg: false, spicy: false, allergens: ['Glutine', 'Latte'] },
{ id: 'sf-002', name: 'Bruschette al Pomodoro', category: 'Antipasti', price: 7.50, description: 'Pane casereccio tostato, pomodori datterini, basilico, aglio, olio EVO', image: "https://img.rocket.new/generatedImages/rocket_gen_img_14fe786d4-1772650699880.png", imageAlt: 'Bruschette tostate con pomodori freschi, basilico e olio di oliva', veg: true, spicy: false, allergens: ['Glutine'] },
{ id: 'sf-003', name: 'Carpaccio di Manzo', category: 'Antipasti', price: 14.00, description: 'Manzo marinato, scaglie di grana, rucola, capperi, limone', image: "https://img.rocket.new/generatedImages/rocket_gen_img_175d64f09-1773173914886.png", imageAlt: 'Carpaccio di manzo con scaglie di parmigiano e rucola su piatto bianco', veg: false, spicy: false, allergens: ['Latte'] },
{ id: 'sf-004', name: 'Spaghetti alla Carbonara', category: 'Primi', price: 13.50, description: 'Spaghetti trafilati al bronzo, guanciale di Amatrice, uova fresche, pecorino romano, pepe nero', image: "https://img.rocket.new/generatedImages/rocket_gen_img_146ec8666-1772378183438.png", imageAlt: 'Spaghetti alla carbonara cremosi con guanciale croccante e pecorino', popular: true, veg: false, spicy: false, allergens: ['Glutine', 'Uova', 'Latte'] },
{ id: 'sf-005', name: 'Penne all\'Arrabbiata', category: 'Primi', price: 11.00, description: 'Penne rigate, pomodoro San Marzano, aglio, peperoncino calabrese, basilico', image: "https://img.rocket.new/generatedImages/rocket_gen_img_156bff04d-1772207897368.png", imageAlt: 'Penne all arrabbiata con salsa di pomodoro piccante e basilico fresco', veg: true, spicy: true, allergens: ['Glutine'] },
{ id: 'sf-006', name: 'Lasagne al Forno', category: 'Primi', price: 14.50, description: 'Sfoglie fresche, ragù di manzo e maiale, besciamella, parmigiano reggiano 24 mesi', image: "https://img.rocket.new/generatedImages/rocket_gen_img_16f478528-1775512225723.png", imageAlt: 'Lasagne al forno con ragù di carne, besciamella e parmigiano gratinato', veg: false, spicy: false, allergens: ['Glutine', 'Uova', 'Latte'] },
{ id: 'sf-007', name: 'Pizza Margherita', category: 'Pizza', price: 9.50, description: 'Pomodoro San Marzano DOP, mozzarella fior di latte, basilico fresco, olio EVO', image: "https://images.unsplash.com/photo-1703784022146-b72677752ce5", imageAlt: 'Pizza Margherita napoletana con mozzarella fior di latte e basilico fresco', popular: true, veg: true, spicy: false, allergens: ['Glutine', 'Latte'] },
{ id: 'sf-008', name: 'Pizza Diavola', category: 'Pizza', price: 11.00, description: 'Pomodoro, mozzarella, salame piccante calabrese, peperoncino fresco', image: "https://img.rocket.new/generatedImages/rocket_gen_img_107b3b30f-1765319154480.png", imageAlt: 'Pizza Diavola con salame piccante e peperoncino su base pomodoro', popular: true, veg: false, spicy: true, allergens: ['Glutine', 'Latte'] },
{ id: 'sf-009', name: 'Pizza Quattro Stagioni', category: 'Pizza', price: 13.00, description: 'Carciofi, funghi, prosciutto cotto, olive, mozzarella, pomodoro', image: "https://img.rocket.new/generatedImages/rocket_gen_img_195ed178f-1766924824253.png", imageAlt: 'Pizza Quattro Stagioni divisa in quattro sezioni con carciofi, funghi, prosciutto e olive', veg: false, spicy: false, allergens: ['Glutine', 'Latte'] },
{ id: 'sf-010', name: 'Pizza Prosciutto e Funghi', category: 'Pizza', price: 12.00, description: 'Prosciutto cotto, champignon freschi, mozzarella, pomodoro, origano', image: "https://images.unsplash.com/photo-1650455458884-4c7957a28fe4", imageAlt: 'Pizza con prosciutto cotto, funghi champignon e mozzarella filante', veg: false, spicy: false, allergens: ['Glutine', 'Latte'] },
{ id: 'sf-011', name: 'Tagliata di Manzo', category: 'Secondi', price: 22.00, description: 'Controfiletto irlandese alla griglia, rucola, scaglie di grana, pomodorini confit', image: "https://img.rocket.new/generatedImages/rocket_gen_img_14eafdf22-1769543734296.png", imageAlt: 'Tagliata di manzo grigliate con rucola, grana e pomodorini su tagliere', popular: true, veg: false, spicy: false, allergens: ['Latte'] },
{ id: 'sf-012', name: 'Branzino al Forno', category: 'Secondi', price: 24.00, description: 'Branzino intero al forno con erbe aromatiche, patate, olive, capperi', image: "https://img.rocket.new/generatedImages/rocket_gen_img_1bf17c2b8-1773092250767.png", imageAlt: 'Branzino al forno intero con erbe aromatiche, patate e olive su teglia', veg: false, spicy: false, allergens: [] },
{ id: 'sf-013', name: 'Tiramisù Classico', category: 'Dolci', price: 6.50, description: 'Ricetta tradizionale: savoiardi, mascarpone, caffè espresso, cacao amaro in polvere', image: "https://img.rocket.new/generatedImages/rocket_gen_img_12d6730d9-1773176609800.png", imageAlt: 'Tiramisù classico in coppetta con strati di mascarpone e cacao in polvere', popular: true, veg: true, spicy: false, allergens: ['Uova', 'Latte', 'Glutine'] },
{ id: 'sf-014', name: 'Panna Cotta', category: 'Dolci', price: 5.50, description: 'Panna cotta alla vaniglia con coulis di frutti di bosco freschi', image: "https://images.unsplash.com/photo-1687418343128-20249de29a88", imageAlt: 'Panna cotta bianca con salsa di frutti di bosco rossi su piatto bianco', veg: true, spicy: false, allergens: ['Latte'] },
{ id: 'sf-015', name: 'Acqua Naturale 75cl', category: 'Bevande', price: 2.50, description: 'Acqua minerale naturale in bottiglia di vetro', image: "https://img.rocket.new/generatedImages/rocket_gen_img_10bdfb671-1772977204034.png", imageAlt: 'Bottiglia di acqua minerale naturale da 75cl su sfondo bianco', veg: true, spicy: false, allergens: [] },
{ id: 'sf-016', name: 'Birra Artigianale 33cl', category: 'Bevande', price: 4.50, description: 'Birra artigianale ambrata locale, produzione artigianale lombarda', image: "https://images.unsplash.com/photo-1692827556801-09d8ff82274a", imageAlt: 'Bicchiere di birra artigianale ambrata con schiuma bianca in vetro trasparente', veg: true, spicy: false, allergens: ['Glutine'] }];


const orderSteps = [
{ id: 'step-ricevuto', label: 'Ordine Ricevuto', icon: <CheckCircle size={18} />, done: true },
{ id: 'step-confermato', label: 'Confermato', icon: <CheckCircle size={18} />, done: true },
{ id: 'step-preparazione', label: 'In Preparazione', icon: <ChefHat size={18} />, done: false, active: true },
{ id: 'step-consegna', label: 'In Consegna', icon: <Bike size={18} />, done: false },
{ id: 'step-consegnato', label: 'Consegnato', icon: <Package size={18} />, done: false }];


// ─── Sub-components ────────────────────────────────────────────

function CartSidebar({
  cart,
  onAdd,
  onRemove,
  onDelete,
  onCheckout,
  promoCode,
  onPromoChange,
  promoApplied,
  onApplyPromo










}: {cart: CartItem[];onAdd: (item: MenuItemType) => void;onRemove: (id: string) => void;onDelete: (id: string) => void;onCheckout: () => void;promoCode: string;onPromoChange: (v: string) => void;promoApplied: boolean;onApplyPromo: () => void;}) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal - discount + restaurant.deliveryFee;
  const meetsMin = subtotal >= restaurant.minOrder;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" />
          Il tuo ordine
        </h3>
        <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {cart.reduce((s, i) => s + i.qty, 0)}
        </span>
      </div>

      {cart.length === 0 ?
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <ShoppingCart size={40} className="text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground text-sm">Il carrello è vuoto</p>
          <p className="text-xs text-muted-foreground mt-1">Aggiungi prodotti dal menu per iniziare il tuo ordine</p>
        </div> :

      <>
          <ul className="flex-1 overflow-y-auto py-3 px-4 space-y-3 scrollbar-hide">
            {cart.map((item) =>
          <li key={`cart-${item.id}`} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">€ {(item.price * item.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onRemove(item.id)} className="w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center transition-colors">
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                  <button onClick={() => onAdd(item)} className="w-6 h-6 rounded-full bg-muted hover:bg-border flex items-center justify-center transition-colors">
                    <Plus size={11} />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="w-6 h-6 rounded-full hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] flex items-center justify-center transition-colors ml-1">
                    <Trash2 size={11} />
                  </button>
                </div>
              </li>
          )}
          </ul>

          <div className="px-4 py-3 border-t border-border space-y-3">
            {/* Promo */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                type="text"
                placeholder="Codice promo"
                value={promoCode}
                onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
                className="w-full pl-7 pr-2 py-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
              
              </div>
              <button
              onClick={onApplyPromo}
              disabled={!promoCode}
              className="px-3 py-2 bg-secondary text-primary text-xs font-semibold rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors border border-orange-200">
              
                Applica
              </button>
            </div>
            {promoApplied &&
          <div className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success-bg)] rounded-lg px-3 py-2">
                <CheckCircle size={13} />
                Promo WELCOME10 applicata: −10%
              </div>
          }

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotale</span>
                <span className="tabular-nums">€ {subtotal.toFixed(2)}</span>
              </div>
              {promoApplied &&
            <div className="flex justify-between text-[var(--success)]">
                  <span>Sconto 10%</span>
                  <span className="tabular-nums">−€ {discount.toFixed(2)}</span>
                </div>
            }
              <div className="flex justify-between text-muted-foreground">
                <span>Consegna</span>
                <span className="tabular-nums">€ {restaurant.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                <span>Totale</span>
                <span className="tabular-nums">€ {total.toFixed(2)}</span>
              </div>
            </div>

            {!meetsMin &&
          <p className="text-[11px] text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-3 py-2">
                Ordine minimo € {restaurant.minOrder.toFixed(2)} — aggiungi ancora € {(restaurant.minOrder - subtotal).toFixed(2)}
              </p>
          }

            <button
            onClick={onCheckout}
            disabled={!meetsMin}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 text-sm">
            
              Procedi al pagamento → € {total.toFixed(2)}
            </button>
          </div>
        </>
      }
    </div>);

}

function MenuItemCard({ item, onAdd }: {item: MenuItemType;onAdd: (item: MenuItemType) => void;}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
      <div className="relative overflow-hidden h-44">
        <AppImage
          src={item.image}
          alt={item.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300" />
        
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {item.popular && <Badge variant="primary" className="text-[10px] shadow-sm">⭐ Popolare</Badge>}
          {item.veg && <Badge variant="success" className="text-[10px] shadow-sm">🌿 Veg</Badge>}
          {item.spicy && <Badge variant="danger" className="text-[10px] shadow-sm">🌶 Piccante</Badge>}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-foreground text-sm mb-1">{item.name}</h4>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{item.description}</p>
        {item.allergens.length > 0 &&
        <div className="flex flex-wrap gap-1 mb-3">
            {item.allergens.map((a) =>
          <span key={`${item.id}-${a}`} className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-1.5 py-0.5">{a}</span>
          )}
          </div>
        }
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg tabular-nums text-foreground">€ {item.price.toFixed(2)}</span>
          <button
            onClick={() => onAdd(item)}
            className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#d43d22] transition-all duration-150 active:scale-95">
            
            <Plus size={13} />
            Aggiungi
          </button>
        </div>
      </div>
    </div>);

}

function CheckoutModal({ open, onClose, cart, total }: {open: boolean;onClose: () => void;cart: CartItem[];total: number;}) {
  const [step, setStep] = useState<'details' | 'payment' | 'tracking'>('details');
  const [deliveryType, setDeliveryType] = useState<'domicilio' | 'asporto'>('domicilio');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'online'>('card');
  const [loading, setLoading] = useState(false);

  const handleOrder = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('tracking');
    }, 1800);
  };

  const detailsValid = deliveryType === 'asporto'
    ? !!phone
    : !!address && !!phone;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={step === 'tracking' ? 'Ordine in corso' : 'Checkout'}>
      {step === 'details' &&
      <div className="space-y-4">

          {/* Delivery type selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Modalità di consegna</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('domicilio')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  deliveryType === 'domicilio'
                    ? 'border-primary bg-secondary text-primary' :'border-border text-muted-foreground hover:border-primary/50'
                }`}>
                <Bike size={16} />
                Consegna a domicilio
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('asporto')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  deliveryType === 'asporto' ?'border-primary bg-secondary text-primary' :'border-border text-muted-foreground hover:border-primary/50'
                }`}>
                <Package size={16} />
                Asporto
              </button>
            </div>
          </div>

          {/* Address — only for home delivery */}
          {deliveryType === 'domicilio' &&
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Indirizzo di consegna *</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Via, numero civico, città"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          }

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Numero di telefono *</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+39 333 000 0000"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Date & time — only for home delivery */}
          {deliveryType === 'domicilio' &&
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Data di consegna</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ora di consegna</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
          }

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Note per il ristorante</label>
            <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={deliveryType === 'domicilio' ? 'Allergie, preferenze, istruzioni per la consegna...' : 'Allergie, preferenze, orario di ritiro...'}
            rows={2}
            className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Riepilogo ordine</p>
            {cart.map((item) =>
          <div key={`checkout-${item.id}`} className="flex justify-between text-sm">
                <span className="text-foreground">{item.name} ×{item.qty}</span>
                <span className="tabular-nums font-semibold">€ {(item.price * item.qty).toFixed(2)}</span>
              </div>
          )}
            <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
              <span>Totale</span>
              <span className="tabular-nums">€ {total.toFixed(2)}</span>
            </div>
          </div>
          <button
          onClick={() => setStep('payment')}
          disabled={!detailsValid}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
            Continua al pagamento →
          </button>
        </div>
      }

      {step === 'payment' &&
      <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Metodo di pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {(['card', 'online', 'cash'] as const).map((m) =>
            <button
              key={`pay-${m}`}
              onClick={() => setPayMethod(m)}
              className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
              payMethod === m ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`
              }>
              
                  {m === 'card' ? '💳 Carta' : m === 'online' ? '📱 Online' : '💵 Contanti'}
                </button>
            )}
            </div>
          </div>
          {payMethod === 'card' &&
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Numero carta</label>
                <input type="text" placeholder="1234 5678 9012 3456" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Scadenza</label>
                  <input type="text" placeholder="MM/AA" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">CVV</label>
                  <input type="text" placeholder="123" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
                </div>
              </div>
            </div>
        }
          {payMethod === 'cash' &&
        <div className="bg-[var(--warning-bg)] border border-amber-200 rounded-xl p-4 text-sm text-[var(--warning)]">
              Il corriere porterà il resto. Assicurati di avere il contante pronto alla consegna.
            </div>
        }
          <div className="flex justify-between font-bold text-foreground bg-muted rounded-xl p-4">
            <span>Totale da pagare</span>
            <span className="tabular-nums text-primary">€ {total.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('details')} className="flex-1 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors text-sm">
              ← Indietro
            </button>
            <button
            onClick={handleOrder}
            disabled={loading}
            className="flex-2 flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-sm disabled:opacity-70 flex items-center justify-center gap-2">
            
              {loading ?
            <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Invio ordine...
                </> :

            'Conferma Ordine 🍕'
            }
            </button>
          </div>
        </div>
      }

      {step === 'tracking' &&
      <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={32} className="text-[var(--success)]" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Ordine confermato!</h3>
            <p className="text-sm text-muted-foreground mt-1">Stima consegna: <strong>25–40 minuti</strong></p>
          </div>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <ul className="space-y-4">
              {orderSteps.map((step, i) =>
            <li key={step.id} className="flex items-center gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
              step.done ? 'bg-[var(--success)] text-white' :
              step.active ? 'bg-primary text-white animate-pulse-soft' : 'bg-muted text-muted-foreground'}`
              }>
                    {step.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${step.done || step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {step.active && <p className="text-xs text-primary mt-0.5">In corso...</p>}
                  </div>
                </li>
            )}
            </ul>
          </div>
          <button onClick={onClose} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#d43d22] transition-all active:scale-95 text-sm">
            Chiudi
          </button>
        </div>
      }
    </Modal>);

}

// ─── Main Page ────────────────────────────────────────────────
export default function CustomerStorefront() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Antipasti');
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
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const addToCart = (item: MenuItemType) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing || existing.qty <= 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  };

  const deleteFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const applyPromo = () => {
    if (promoCode === 'WELCOME10') setPromoApplied(true);
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal - discount + restaurant.deliveryFee;

  const filteredItems = menuItems.filter((item) =>
  searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <AppLogo size={32} />
            <span className="font-bold text-lg text-foreground hidden sm:block">GloriaOrder</span>
          </div>
          <div className="flex-1 max-w-lg mx-auto">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca nel menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
              
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <Link href="/restaurant-management-dashboard" className="hidden md:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
              Pannello Ristorante →
            </Link>
            <Link href="/sign-up-login-screen" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Accedi
            </Link>
            <Link href="/cliente/account" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <User size={16} />
              Il mio account
            </Link>
            <button
              onClick={() => setShowBookingModal(true)}
              className="hidden sm:flex items-center gap-2 bg-[var(--success)] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-all active:scale-95">
              <CalendarCheck size={16} />
              PRENOTA TAVOLO
            </button>
            <button
              onClick={() => setCartOpen((o) => !o)}
              className="relative flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#d43d22] transition-all active:scale-95">
              
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Carrello</span>
              {cartCount > 0 &&
              <span className="bg-white text-primary text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              }
            </button>
          </div>
        </div>
      </header>

      {/* Restaurant Hero */}
      <div className="relative h-56 lg:h-72 overflow-hidden">
        <AppImage
          src={restaurant.image}
          alt={restaurant.imageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover" />
        
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Restaurant logo — top left */}
        {restaurant.logoUrl && (
          <div className="absolute top-4 left-6 lg:left-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-white/10 backdrop-blur-sm">
              <img src={restaurant.logoUrl} alt={`Logo ${restaurant.name}`} className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-screen-2xl mx-auto">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-1">{restaurant.name}</h1>
            <p className="text-white/80 text-sm mb-3">{restaurant.tagline}</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-white/90 text-sm">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <strong>{restaurant.rating}</strong>
                <span className="text-white/60">({restaurant.reviews} recensioni)</span>
              </span>
              <span className="flex items-center gap-1.5 text-white/90 text-sm">
                <Clock size={14} />
                {restaurant.deliveryTime}
              </span>
              <span className="flex items-center gap-1.5 text-white/90 text-sm">
                <Bike size={14} />
                Consegna € {restaurant.deliveryFee.toFixed(2)}
              </span>
              <span className="flex items-center gap-1.5 text-white/90 text-sm">
                <MapPin size={14} />
                {restaurant.address}
              </span>
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
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0">
            {categories.map((cat) =>
            <button
              key={`cat-nav-${cat}`}
              onClick={() => scrollToCategory(cat)}
              className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeCategory === cat ?
              'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
              }>
              
                {cat}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Menu content */}
          <main className="flex-1 min-w-0 space-y-10">
            {searchQuery ?
            <div>
                <h2 className="text-lg font-bold text-foreground mb-4">
                  {filteredItems.length} risultati per "{searchQuery}"
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
                  {filteredItems.map((item) =>
                <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
                )}
                </div>
                {filteredItems.length === 0 &&
              <div className="text-center py-16">
                    <Search size={40} className="mx-auto text-muted-foreground mb-3" />
                    <p className="font-semibold text-foreground">Nessun prodotto trovato</p>
                    <p className="text-sm text-muted-foreground mt-1">Prova con un termine diverso</p>
                  </div>
              }
              </div> :

            categories.map((cat) => {
              const items = menuItems.filter((i) => i.category === cat);
              return (
                <section
                  key={`section-${cat}`}
                  ref={(el) => {categoryRefs.current[cat] = el;}}>
                  
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      {cat}
                      <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
                      {items.map((item) =>
                    <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
                    )}
                    </div>
                  </section>);

            })
            }
          </main>

          {/* Cart sidebar — desktop */}
          <aside className={`hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0`}>
            <div className="sticky top-36 bg-card rounded-2xl border border-border shadow-card overflow-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              <CartSidebar
                cart={cart}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onDelete={deleteFromCart}
                onCheckout={() => setCheckoutOpen(true)}
                promoCode={promoCode}
                onPromoChange={setPromoCode}
                promoApplied={promoApplied}
                onApplyPromo={applyPromo} />
              
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile cart drawer */}
      {cartOpen &&
      <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-modal flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Il tuo ordine</h3>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartSidebar
              cart={cart}
              onAdd={addToCart}
              onRemove={removeFromCart}
              onDelete={deleteFromCart}
              onCheckout={() => {setCartOpen(false);setCheckoutOpen(true);}}
              promoCode={promoCode}
              onPromoChange={setPromoCode}
              promoApplied={promoApplied}
              onApplyPromo={applyPromo} />
            
            </div>
          </div>
        </div>
      }

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        total={total} />

      {/* Booking modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowBookingModal(false); setBookingConfirmed(false); }} />
          <div className="relative bg-card rounded-2xl shadow-modal w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarCheck size={20} className="text-[var(--success)]" />
                <h3 className="font-bold text-foreground">Prenota un Tavolo</h3>
              </div>
              <button onClick={() => { setShowBookingModal(false); setBookingConfirmed(false); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
            </div>
            {bookingConfirmed ? (
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-[var(--success)]" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">Prenotazione Confermata!</h4>
                <p className="text-sm text-muted-foreground mb-1">Tavolo per <strong>{bookingGuests} persone</strong></p>
                <p className="text-sm text-muted-foreground mb-4">{bookingDate} alle {bookingTime}</p>
                <button onClick={() => { setShowBookingModal(false); setBookingConfirmed(false); }} className="bg-[var(--success)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">Chiudi</button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Numero di persone</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setBookingGuests((g) => Math.max(1, g - 1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors font-bold text-lg">−</button>
                    <span className="text-xl font-bold text-foreground w-8 text-center">{bookingGuests}</span>
                    <button onClick={() => setBookingGuests((g) => Math.min(20, g + 1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors font-bold text-lg">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Giorno</label>
                  <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Orario</label>
                  <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Nome</label>
                  <input type="text" value={bookingName} onChange={(e) => setBookingName(e.target.value)} placeholder="Il tuo nome" className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Telefono</label>
                  <input type="tel" value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value)} placeholder="+39 ..." className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button
                  onClick={() => { if (bookingDate && bookingName) setBookingConfirmed(true); }}
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
      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            supportato da <a href="https://www.innovago.it" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors">iGO di innovago.it</a>
            {' '}|{' '}
            <a href="mailto:info@innovago.it" className="font-semibold text-foreground hover:text-primary transition-colors">info@innovago.it</a>
          </p>
        </div>
      </footer>
      
    </div>);

}