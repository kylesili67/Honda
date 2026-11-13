import React, { createContext, useContext, useEffect, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export interface CartItemLocal {
  variantId: string;
  accessoryId: string;
  accessorySlug: string;
  name: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
}

interface CartContextValue {
  items: CartItemLocal[];
  itemCount: number;
  subtotal: number;
  addItem: (item: CartItemLocal) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  compareIds: string[];
  toggleCompare: (modelId: string) => { added: boolean; message?: string };
  clearCompare: () => void;
}

const CART_KEY = 'honda_showroom_cart_v1';
const COMPARE_KEY = 'honda_showroom_compare_v1';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemLocal[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartItemLocal[]) : [];
    } catch {
      return [];
    }
  });

  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
    } catch {
      // ignore
    }
  }, [compareIds]);

  // Merge guest cart into Supabase carts/cart_items on login
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase || items.length === 0) return;
    const syncToDb = async () => {
      const { data: existingCart } = await supabase!
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let cartId = existingCart?.id as string | undefined;
      if (!cartId) {
        const { data: created } = await supabase!
          .from('carts')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        cartId = created?.id as string | undefined;
      }
      if (!cartId) return;

      for (const item of items) {
        await supabase!.from('cart_items').upsert(
          {
            cart_id: cartId,
            variant_id: item.variantId,
            quantity: item.quantity,
          },
          { onConflict: 'cart_id,variant_id' }
        );
      }
    };
    void syncToDb();
  }, [user, items]);

  const addItem = (incoming: CartItemLocal) => {
    trackEvent('add_to_cart', { sku: incoming.sku, price: incoming.unitPrice, quantity: incoming.quantity });
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variantId === incoming.variantId);
      if (idx >= 0) {
        const next = [...prev];
        const mergedQty = Math.min(incoming.maxStock || 99, next[idx].quantity + incoming.quantity);
        next[idx] = { ...next[idx], quantity: mergedQty };
        return next;
      }
      return [...prev, incoming];
    });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(i.maxStock || 99, quantity) } : i
      )
    );
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const toggleCompare = (modelId: string) => {
    if (compareIds.includes(modelId)) {
      setCompareIds((prev) => prev.filter((id) => id !== modelId));
      return { added: false, message: 'Removed from compare' };
    }
    if (compareIds.length >= 3) {
      return { added: false, message: 'You can compare up to 3 bikes at a time.' };
    }
    setCompareIds((prev) => [...prev, modelId]);
    return { added: true, message: 'Added to compare' };
  };

  const clearCompare = () => setCompareIds([]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        compareIds,
        toggleCompare,
        clearCompare,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
