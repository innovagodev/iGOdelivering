'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import { User, ShoppingBag, Heart, MapPin, Settings, ChevronRight, Star, Clock, Package, Trash2, Plus, Edit2, Check, X, Bell, Globe, LogOut, ArrowLeft, Home, Bike, Phone, Mail, Lock,  } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type AccountTab = 'ordini' | 'preferiti' | 'indirizzi' | 'impostazioni';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  restaurant: string;
  restaurantImage: string;
  status: 'consegnato' | 'annullato' | 'in_corso';
  total: number;
  items: OrderItem[];
  type: 'consegna' | 'asporto';
}

interface FavoriteDish {
  id: string;
  name: string;
  restaurant: string;
  price: number;
  image: string;
  imageAlt: string;
}

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  zip: string;
  isDefault: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────

const mockOrders: Order[] = [
  {
    id: 'ORD-2024-001',
    date: '2 maggio 2025',
    restaurant: 'Pizzeria Bella Napoli',
    restaurantImage: 'https://img.rocket.new/generatedImages/rocket_gen_img_14a7b3042-1772810039848.png',
    status: 'consegnato',
    total: 34.50,
    type: 'consegna',
    items: [
      { name: 'Pizza Margherita', qty: 2, price: 9.50 },
      { name: 'Tiramisù Classico', qty: 1, price: 6.50 },
      { name: 'Acqua Naturale 75cl', qty: 2, price: 2.50 },
    ],
  },
  {
    id: 'ORD-2024-002',
    date: '28 aprile 2025',
    restaurant: 'Pizzeria Bella Napoli',
    restaurantImage: 'https://img.rocket.new/generatedImages/rocket_gen_img_14a7b3042-1772810039848.png',
    status: 'consegnato',
    total: 47.00,
    type: 'consegna',
    items: [
      { name: 'Tagliata di Manzo', qty: 1, price: 22.00 },
      { name: 'Spaghetti alla Carbonara', qty: 1, price: 13.50 },
      { name: 'Panna Cotta', qty: 1, price: 5.50 },
    ],
  },
  {
    id: 'ORD-2024-003',
    date: '20 aprile 2025',
    restaurant: 'Pizzeria Bella Napoli',
    restaurantImage: 'https://img.rocket.new/generatedImages/rocket_gen_img_14a7b3042-1772810039848.png',
    status: 'annullato',
    total: 22.00,
    type: 'asporto',
    items: [
      { name: 'Pizza Diavola', qty: 2, price: 11.00 },
    ],
  },
];

const mockFavorites: FavoriteDish[] = [
  {
    id: 'fav-001',
    name: 'Pizza Margherita',
    restaurant: 'Pizzeria Bella Napoli',
    price: 9.50,
    image: 'https://images.unsplash.com/photo-1703784022146-b72677752ce5',
    imageAlt: 'Pizza Margherita napoletana con mozzarella fior di latte e basilico fresco',
  },
  {
    id: 'fav-002',
    name: 'Spaghetti alla Carbonara',
    restaurant: 'Pizzeria Bella Napoli',
    price: 13.50,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_146ec8666-1772378183438.png',
    imageAlt: 'Spaghetti alla carbonara cremosi con guanciale croccante e pecorino',
  },
  {
    id: 'fav-003',
    name: 'Tiramisù Classico',
    restaurant: 'Pizzeria Bella Napoli',
    price: 6.50,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_12d6730d9-1773176609800.png',
    imageAlt: 'Tiramisù classico in coppetta con strati di mascarpone e cacao in polvere',
  },
  {
    id: 'fav-004',
    name: 'Tagliata di Manzo',
    restaurant: 'Pizzeria Bella Napoli',
    price: 22.00,
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_14eafdf22-1769543734296.png',
    imageAlt: 'Tagliata di manzo grigliate con rucola, grana e pomodorini su tagliere',
  },
];

const mockAddresses: Address[] = [
  { id: 'addr-001', label: 'Casa', street: 'Via Roma 24', city: 'Milano', zip: '20121', isDefault: true },
  { id: 'addr-002', label: 'Ufficio', street: 'Corso Buenos Aires 12', city: 'Milano', zip: '20124', isDefault: false },
];

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: Order['status'] }) {
  const map = {
    consegnato: { label: 'Consegnato', cls: 'bg-[var(--success-bg)] text-[var(--success)]' },
    annullato: { label: 'Annullato', cls: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
    in_corso: { label: 'In corso', cls: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ─── Order History Tab ────────────────────────────────────────

function OrderHistoryTab() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">Storico Ordini</h2>
        <span className="text-sm text-muted-foreground">{mockOrders.length} ordini totali</span>
      </div>

      {mockOrders.map((order) => (
        <div key={order.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <AppImage
                  src={order.restaurantImage}
                  alt={`Logo ${order.restaurant}`}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground text-sm truncate">{order.restaurant}</p>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={11} />
                    {order.date}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {order.type === 'consegna' ? <Bike size={11} /> : <Package size={11} />}
                    {order.type === 'consegna' ? 'Consegna' : 'Asporto'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-bold text-foreground tabular-nums">€ {order.total.toFixed(2)}</span>
                <ChevronRight
                  size={16}
                  className={`text-muted-foreground transition-transform duration-200 ${expandedOrder === order.id ? 'rotate-90' : ''}`}
                />
              </div>
            </div>
          </button>

          {expandedOrder === order.id && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dettaglio ordine</p>
              <ul className="space-y-1.5 mb-3">
                {order.items.map((item, idx) => (
                  <li key={`${order.id}-item-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      <span className="text-muted-foreground mr-1.5">{item.qty}×</span>
                      {item.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">€ {(item.price * item.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-bold text-foreground">Totale</span>
                <span className="text-sm font-bold text-foreground tabular-nums">€ {order.total.toFixed(2)}</span>
              </div>
              {order.status === 'consegnato' && (
                <div className="mt-3">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Riordina →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {mockOrders.length === 0 && (
        <div className="text-center py-16">
          <ShoppingBag size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">Nessun ordine ancora</p>
          <p className="text-sm text-muted-foreground mt-1">I tuoi ordini appariranno qui</p>
        </div>
      )}
    </div>
  );
}

// ─── Favorites Tab ────────────────────────────────────────────

function FavoritesTab() {
  const [favorites, setFavorites] = useState<FavoriteDish[]>(mockFavorites);

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">Piatti Preferiti</h2>
        <span className="text-sm text-muted-foreground">{favorites.length} salvati</span>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">Nessun piatto preferito</p>
          <p className="text-sm text-muted-foreground mt-1">Salva i tuoi piatti preferiti per trovarli facilmente</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d43d22] transition-colors">
            Sfoglia il menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {favorites.map((dish) => (
            <div key={dish.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden group">
              <div className="relative h-36 overflow-hidden">
                <AppImage
                  src={dish.image}
                  alt={dish.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => removeFavorite(dish.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors shadow-sm"
                  title="Rimuovi dai preferiti"
                >
                  <Heart size={14} className="fill-[var(--danger)] text-[var(--danger)]" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-foreground text-sm">{dish.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dish.restaurant}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-foreground tabular-nums">€ {dish.price.toFixed(2)}</span>
                  <Link
                    href="/"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Ordina →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Addresses Tab ────────────────────────────────────────────

function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', street: '', city: '', zip: '' });

  const openAdd = () => {
    setForm({ label: '', street: '', city: '', zip: '' });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setForm({ label: addr.label, street: addr.street, city: addr.city, zip: addr.zip });
    setEditId(addr.id);
    setShowForm(true);
  };

  const saveAddress = () => {
    if (!form.street || !form.city) return;
    if (editId) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editId ? { ...a, ...form } : a))
      );
    } else {
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        label: form.label || 'Nuovo indirizzo',
        street: form.street,
        city: form.city,
        zip: form.zip,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddr]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const setDefault = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">Indirizzi Salvati</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Aggiungi
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">{editId ? 'Modifica indirizzo' : 'Nuovo indirizzo'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Etichetta</label>
              <input
                type="text"
                placeholder="es. Casa, Ufficio"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">CAP</label>
              <input
                type="text"
                placeholder="20121"
                value={form.zip}
                onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Via e numero civico</label>
            <input
              type="text"
              placeholder="Via Roma 24"
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Città</label>
            <input
              type="text"
              placeholder="Milano"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveAddress}
              disabled={!form.street || !form.city}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d43d22] disabled:opacity-50 transition-colors"
            >
              <Check size={14} />
              Salva
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-border transition-colors"
            >
              <X size={14} />
              Annulla
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <MapPin size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">Nessun indirizzo salvato</p>
          <p className="text-sm text-muted-foreground mt-1">Aggiungi un indirizzo per velocizzare i tuoi ordini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${addr.isDefault ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}`}>
                {addr.label === 'Ufficio' ? <Home size={18} /> : <MapPin size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">{addr.label}</p>
                  {addr.isDefault && (
                    <span className="text-[10px] font-semibold bg-secondary text-primary px-2 py-0.5 rounded-full">Predefinito</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{addr.street}, {addr.zip} {addr.city}</p>
                {!addr.isDefault && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="text-xs text-primary font-semibold mt-1.5 hover:underline"
                  >
                    Imposta come predefinito
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(addr)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Modifica"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => removeAddress(addr.id)}
                  className="w-8 h-8 rounded-lg hover:bg-[var(--danger-bg)] flex items-center justify-center text-muted-foreground hover:text-[var(--danger)] transition-colors"
                  title="Elimina"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────

function SettingsTab() {
  const [name, setName] = useState('Mario Rossi');
  const [email, setEmail] = useState('mario.rossi@email.it');
  const [phone, setPhone] = useState('+39 333 1234567');
  const [editingProfile, setEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promos: true,
    newsletter: false,
  });
  const [language, setLanguage] = useState('it');
  const [saved, setSaved] = useState(false);

  const saveProfile = () => {
    setEditingProfile(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Preferenze Account</h2>

      {/* Profile */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <User size={16} className="text-primary" />
            Dati Personali
          </p>
          {!editingProfile ? (
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors"
            >
              <Edit2 size={12} />
              Modifica
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-[#d43d22] transition-colors"
              >
                <Check size={12} />
                Salva
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-muted text-foreground px-3 py-1.5 rounded-lg hover:bg-border transition-colors"
              >
                <X size={12} />
                Annulla
              </button>
            </div>
          )}
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-xs text-[var(--success)] bg-[var(--success-bg)] rounded-xl px-3 py-2 mb-3">
            <Check size={13} />
            Profilo aggiornato con successo
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <User size={11} />
              Nome e Cognome
            </label>
            {editingProfile ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm text-foreground font-medium px-3 py-2.5 bg-muted rounded-xl">{name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Mail size={11} />
              Email
            </label>
            {editingProfile ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm text-foreground font-medium px-3 py-2.5 bg-muted rounded-xl">{email}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Phone size={11} />
              Telefono
            </label>
            {editingProfile ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm text-foreground font-medium px-3 py-2.5 bg-muted rounded-xl">{phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Bell size={16} className="text-primary" />
          Notifiche
        </p>
        <div className="space-y-3">
          {[
            { key: 'orderUpdates' as const, label: 'Aggiornamenti ordine', desc: 'Ricevi notifiche sullo stato dei tuoi ordini' },
            { key: 'promos' as const, label: 'Offerte e promozioni', desc: 'Sconti esclusivi e codici promo' },
            { key: 'newsletter' as const, label: 'Newsletter', desc: 'Novità e aggiornamenti dal ristorante' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${notifications[key] ? 'bg-primary' : 'bg-border'}`}
                role="switch"
                aria-checked={notifications[key]}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${notifications[key] ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Globe size={16} className="text-primary" />
          Lingua
        </p>
        <div className="flex gap-2">
          {[{ value: 'it', label: '🇮🇹 Italiano' }, { value: 'en', label: '🇬🇧 English' }].map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                language === lang.value
                  ? 'bg-secondary text-primary border-primary/30' :'bg-muted text-muted-foreground border-border hover:bg-border'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Lock size={16} className="text-primary" />
          Sicurezza
        </p>
        <button className="flex items-center justify-between w-full py-2 text-sm text-foreground hover:text-primary transition-colors group">
          <span className="font-medium">Cambia password</span>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <div className="border-t border-border my-2" />
        <button className="flex items-center justify-between w-full py-2 text-sm text-foreground hover:text-primary transition-colors group">
          <span className="font-medium">Metodi di pagamento</span>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Logout */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <Link
          href="/sign-up-login-screen"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] px-3 py-2.5 rounded-xl transition-colors w-full"
        >
          <LogOut size={16} />
          Esci dall'account
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function CustomerAccountPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>('ordini');

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'ordini', label: 'Ordini', icon: <ShoppingBag size={18} />, count: mockOrders.length },
    { id: 'preferiti', label: 'Preferiti', icon: <Heart size={18} />, count: mockFavorites.length },
    { id: 'indirizzi', label: 'Indirizzi', icon: <MapPin size={18} /> },
    { id: 'impostazioni', label: 'Impostazioni', icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-screen-lg mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            <AppLogo size={32} />
            <span className="font-bold text-lg text-foreground hidden sm:block">GloriaOrder</span>
          </Link>
          <div className="flex-1" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Torna al menu</span>
          </Link>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 lg:px-8 py-8">
        {/* Profile hero */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Mario Rossi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">mario.rossi@email.it</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingBag size={11} />
                {mockOrders.filter((o) => o.status === 'consegnato').length} ordini completati
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                Cliente dal 2024
              </span>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-muted rounded-2xl p-1 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-primary text-white' : 'bg-border text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'ordini' && <OrderHistoryTab />}
        {activeTab === 'preferiti' && <FavoritesTab />}
        {activeTab === 'indirizzi' && <AddressesTab />}
        {activeTab === 'impostazioni' && <SettingsTab />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-screen-lg mx-auto px-4 lg:px-8 py-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            supportato da{' '}
            <a href="https://www.innovago.it" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors">
              iGO di innovago.it
            </a>
            {' '}|{' '}
            <a href="mailto:info@innovago.it" className="font-semibold text-foreground hover:text-primary transition-colors">
              info@innovago.it
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
