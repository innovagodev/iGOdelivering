import React from 'react';
import { Plus, Minus, Star } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import Badge from '@/components/ui/Badge';

export interface MenuItemType {
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

export interface CartItem extends MenuItemType {
  qty: number;
  note?: string;
  cartId?: string;
  addedIngredients?: { name: string; price: number }[];
  removedIngredients?: string[];
}

interface PopularSectionProps {
  items: MenuItemType[];
  cart: CartItem[];
  onAdd: (item: MenuItemType) => void;
  onCustomize: (item: MenuItemType) => void;
  onRemove: (cartId: string) => void;
}

export default function PopularSection({
  items,
  cart,
  onAdd,
  onCustomize,
  onRemove,
}: PopularSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 px-1">
        <Star className="text-amber-500 fill-amber-500 w-5 h-5" />
        <h3 className="font-extrabold text-lg text-foreground tracking-tight">I Più Venduti</h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {items.map((item) => {
          // Find base item in cart (no customizations)
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
              key={`popular-${item.id}`}
              onClick={() => onCustomize(item)}
              className="min-w-[260px] max-w-[280px] bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col justify-between snap-start relative"
            >
              {totalQty > 0 && (
                <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10 animate-pop">
                  {totalQty}
                </div>
              )}

              <div>
                <div className="relative overflow-hidden h-32 w-full">
                  <AppImage
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10">
                    {item.popular && (
                      <Badge
                        variant="primary"
                        className="shadow-sm font-bold bg-amber-500 text-white border-none text-[8px] px-1 py-0"
                      >
                        ⭐ POPOLARE
                      </Badge>
                    )}
                    {item.veg && (
                      <Badge
                        variant="success"
                        className="shadow-sm font-bold bg-green-600 text-white border-none text-[8px] px-1 py-0"
                      >
                        🌿 VEG
                      </Badge>
                    )}
                    {item.spicy && (
                      <Badge
                        variant="danger"
                        className="shadow-sm font-bold bg-red-600 text-white border-none text-[8px] px-1 py-0"
                      >
                        🌶️ SPICY
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 pb-1">
                  <h4 className="font-bold text-foreground text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors mb-0.5">
                    {item.name}
                  </h4>
                  <p className="text-muted-foreground text-[10px] leading-relaxed mb-1.5 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="px-3 pb-3 pt-0.5 flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                  <span className="font-extrabold text-foreground text-sm">
                    € {item.price.toFixed(2)}
                  </span>
                  {item.originalPrice && (
                    <span className="text-muted-foreground line-through decoration-red-500/50 text-[9px]">
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
                      className="w-5 h-5 rounded-md bg-card hover:bg-border flex items-center justify-center transition-colors shadow-sm active:scale-90"
                    >
                      <Minus size={10} className="text-foreground" />
                    </button>
                    <span className="w-5 text-center font-bold tabular-nums text-foreground text-[10px]">
                      {defaultQty}
                    </span>
                    <button
                      onClick={() => onAdd(item)}
                      className="w-5 h-5 rounded-md bg-primary text-white hover:bg-[#d43d22] flex items-center justify-center transition-colors shadow-sm active:scale-90"
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
                    className="p-1.5 rounded-lg bg-primary text-white hover:bg-[#d43d22] transition-all duration-150 active:scale-95 shadow-md shadow-primary/10 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
