'use client';
import React, { useState } from 'react';
import { Plus, Search, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';
import AppImage from '@/components/ui/AppImage';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  image: string;
  imageAlt: string;
  allergens: string[];
  orders: number;
}

const menuItems: MenuItem[] = [
{ id: 'mi-001', name: 'Pizza Margherita', category: 'Pizza', price: 9.50, description: 'Pomodoro, mozzarella fior di latte, basilico fresco', available: true, image: "https://images.unsplash.com/photo-1602230537642-3f3654ddbe86", imageAlt: 'Pizza Margherita con pomodoro e mozzarella su sfondo scuro', allergens: ['Glutine', 'Latte'], orders: 284 },
{ id: 'mi-002', name: 'Pizza Diavola', category: 'Pizza', price: 11.00, description: 'Pomodoro, mozzarella, salame piccante, peperoncino', available: true, image: "https://img.rocket.new/generatedImages/rocket_gen_img_107b3b30f-1765319154480.png", imageAlt: 'Pizza Diavola con salame piccante e peperoncino', allergens: ['Glutine', 'Latte'], orders: 198 },
{ id: 'mi-003', name: 'Spaghetti Carbonara', category: 'Primi', price: 13.50, description: 'Spaghetti, guanciale, uova, pecorino, pepe nero', available: true, image: "https://img.rocket.new/generatedImages/rocket_gen_img_146ec8666-1772378183438.png", imageAlt: 'Spaghetti alla carbonara con guanciale croccante e uova', allergens: ['Glutine', 'Uova', 'Latte'], orders: 156 },
{ id: 'mi-004', name: 'Risotto ai Funghi', category: 'Primi', price: 14.00, description: 'Riso Carnaroli, funghi porcini, parmigiano, burro', available: false, image: "https://images.unsplash.com/photo-1627124679711-80f287a6451f", imageAlt: 'Risotto cremoso ai funghi porcini con parmigiano grattugiato', allergens: ['Latte'], orders: 89 },
{ id: 'mi-005', name: 'Tagliata di Manzo', category: 'Secondi', price: 22.00, description: 'Manzo irlandese, rucola, scaglie di grana, pomodorini', available: true, image: "https://img.rocket.new/generatedImages/rocket_gen_img_175d64f09-1773173914886.png", imageAlt: 'Tagliata di manzo con rucola, pomodorini e scaglie di grana', allergens: ['Latte'], orders: 112 },
{ id: 'mi-006', name: 'Tiramisù', category: 'Dolci', price: 6.50, description: 'Savoiardi, mascarpone, caffè espresso, cacao', available: true, image: "https://img.rocket.new/generatedImages/rocket_gen_img_1626fae1c-1764819698380.png", imageAlt: 'Tiramisù classico con strati di mascarpone e cacao in polvere', allergens: ['Uova', 'Latte', 'Glutine'], orders: 201 },
{ id: 'mi-007', name: 'Antipasto Misto', category: 'Antipasti', price: 12.00, description: 'Salumi selezionati, formaggi, olive, bruschette', available: true, image: "https://images.unsplash.com/photo-1450453034467-419285f36eca", imageAlt: 'Tagliere di antipasto misto con salumi, formaggi e olive', allergens: ['Glutine', 'Latte'], orders: 143 },
{ id: 'mi-008', name: 'Acqua Naturale 75cl', category: 'Bevande', price: 2.50, description: 'Acqua minerale naturale in bottiglia di vetro', available: true, image: "https://img.rocket.new/generatedImages/rocket_gen_img_15d8ee313-1772492791462.png", imageAlt: 'Bottiglia di acqua minerale naturale da 75cl', allergens: [], orders: 312 }];


const categories = ['Tutti', 'Antipasti', 'Primi', 'Pizza', 'Secondi', 'Dolci', 'Bevande'];

export default function MenuManagement() {
  const [items, setItems] = useState(menuItems);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tutti');

  const toggleAvailability = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, available: !item.available } : item));
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Tutti' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Gestione Menu</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} voci nel menu</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca voce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring w-48 placeholder:text-muted-foreground" />
            
          </div>
          <button className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-[#d43d22] transition-all duration-150 active:scale-95">
            <Plus size={15} />
            Aggiungi Voce
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto scrollbar-hide">
        {categories.map((cat) =>
        <button
          key={`cat-filter-${cat}`}
          onClick={() => setActiveCategory(cat)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
          activeCategory === cat ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-border'}`
          }>
          
            {cat}
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {filtered.length === 0 &&
        <div className="py-16 text-center text-sm text-muted-foreground">
            Nessuna voce trovata
          </div>
        }
        {filtered.map((item) =>
        <div
          key={item.id}
          className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${!item.available ? 'opacity-60' : ''}`}>
          
            <AppImage
            src={item.image}
            alt={item.imageAlt}
            width={56}
            height={56}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-border" />
          
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-foreground">{item.name}</span>
                <Badge variant="neutral" className="text-[10px]">{item.category}</Badge>
                {!item.available &&
              <Badge variant="warning" className="text-[10px]">
                    <AlertTriangle size={9} className="mr-0.5" />
                    Non disponibile
                  </Badge>
              }
              </div>
              <p className="text-xs text-muted-foreground truncate mb-1">{item.description}</p>
              <div className="flex items-center gap-3">
                {item.allergens.map((a) =>
              <span key={`${item.id}-al-${a}`} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{a}</span>
              )}
              </div>
            </div>
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="text-right">
                <p className="font-bold tabular-nums text-foreground">€ {item.price.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{item.orders} ordini</p>
              </div>
              <Toggle checked={item.available} onChange={() => toggleAvailability(item.id)} size="sm" />
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Modifica voce">
                  <Edit3 size={14} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-foreground hover:text-[var(--danger)] transition-colors" title="Elimina voce — questa azione non può essere annullata">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);

}