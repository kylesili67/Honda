import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

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

interface JoinedDbCartItem {
  variant_id: string;
  quantity: number;
  variant: {
    id: string;
    accessory_id: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    stock_quantity: number;
    accessory: {
      id: string;
      slug: string;
      name: string;
      images?: Array<{ url: string; sort_order: number }>;
    } | null;
  } | null;
}

const CART_KEY = 'honda_showroom_cart_v1';
const COMPARE_KEY = 'honda_showroom_compare_v1';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

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

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const cartIdRef = useRef<string | null>(null);
  const mergedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
    } catch {
      // ignore storage quota errors
    }
  }, [compareIds]);

  const ensureCartId = useCallback(async (userId: string): Promise<string> => {
    if (!supabase) throw new Error('Supabase client unavailable');
    if (cartIdRef.current) return cartIdRef.current;

    const { data: existingCart, error: selectErr } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (selectErr) throw selectErr;

    if (existingCart?.id) {
      cartIdRef.current = existingCart.id as string;
      return cartIdRef.current;
    }

    const { data: created, error: insertErr } = await supabase
      .from('carts')
      .insert({ user_id: userId })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    if (!created?.id) throw new Error('Unable to create user cart');
    cartIdRef.current = created.id as string;
    return cartIdRef.current;
  }, []);

  // Hydrate & merge DB cart with local guest cart once on login
  useEffect(() => {
    if (!user) {
      mergedUserIdRef.current = null;
      cartIdRef.current = null;
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    if (mergedUserIdRef.current === user.id) return;

    let active = true;
    const mergeCartOnLogin = async () => {
      try {
        const cartId = await ensureCartId(user.id);
        if (!active) return;

        const { data: dbRows, error: fetchErr } = await supabase!
          .from('cart_items')
          .select(
            'variant_id, quantity, variant:accessory_variants(id, accessory_id, sku, size, color, price, stock_quantity, accessory:accessories(id, slug, name, images:accessory_images(url, sort_order)))'
          )
          .eq('cart_id', cartId);
        if (fetchErr) throw fetchErr;
        if (!active) return;

        const mergedMap = new Map<string, CartItemLocal>();

        for (const row of (dbRows ?? []) as unknown as JoinedDbCartItem[]) {
          if (!row.variant || !row.variant.accessory) continue;
          const sortedImages = [...(row.variant.accessory.images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          );
          const labelParts = [row.variant.size, row.variant.color].filter(Boolean);
          const maxStock = row.variant.stock_quantity || 99;
          mergedMap.set(row.variant_id, {
            variantId: row.variant_id,
            accessoryId: row.variant.accessory_id,
            accessorySlug: row.variant.accessory.slug,
            name: row.variant.accessory.name,
            variantLabel: labelParts.length > 0 ? labelParts.join(' · ') : row.variant.sku,
            sku: row.variant.sku,
            unitPrice: row.variant.price,
            imageUrl: sortedImages[0]?.url || '',
            quantity: Math.min(maxStock, row.quantity),
            maxStock,
          });
        }

        const localItems = itemsRef.current;
        for (const local of localItems) {
          const existing = mergedMap.get(local.variantId);
          if (existing) {
            const cap = existing.maxStock || local.maxStock || 99;
            existing.quantity = Math.min(cap, existing.quantity + local.quantity);
          } else {
            mergedMap.set(local.variantId, local);
          }
        }

        const mergedList = Array.from(mergedMap.values());
        setItems(mergedList);
        mergedUserIdRef.current = user.id;

        if (mergedList.length > 0) {
          const { error: upsertErr } = await supabase!.from('cart_items').upsert(
            mergedList.map((item) => ({
              cart_id: cartId,
              variant_id: item.variantId,
              quantity: item.quantity,
            })),
            { onConflict: 'cart_id,variant_id' }
          );
          if (upsertErr) throw upsertErr;
        }
      } catch (err) {
        if (active) {
          toast({
            title: 'Cart sync warning',
            description: err instanceof Error ? err.message : 'Unable to sync cart with account',
            variant: 'error',
          });
        }
      }
    };

    void mergeCartOnLogin();
    return () => {
      active = false;
    };
  }, [user, ensureCartId, toast]);

  const syncUpsertItem = async (variantId: string, quantity: number) => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    try {
      const cartId = await ensureCartId(user.id);
      const { error } = await supabase
        .from('cart_items')
        .upsert({ cart_id: cartId, variant_id: variantId, quantity }, { onConflict: 'cart_id,variant_id' });
      if (error) throw error;
    } catch (err) {
      toast({
        title: 'Cart update failed',
        description: err instanceof Error ? err.message : 'Unable to save item to account cart',
        variant: 'error',
      });
    }
  };

  const addItem = (incoming: CartItemLocal) => {
    trackEvent('add_to_cart', { sku: incoming.sku, price: incoming.unitPrice, quantity: incoming.quantity });
    const existing = itemsRef.current.find((i) => i.variantId === incoming.variantId);
    const nextQty = existing
      ? Math.min(incoming.maxStock || 99, existing.quantity + incoming.quantity)
      : Math.min(incoming.maxStock || 99, incoming.quantity);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variantId === incoming.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(incoming.maxStock || 99, next[idx].quantity + incoming.quantity),
        };
        return next;
      }
      return [...prev, { ...incoming, quantity: Math.min(incoming.maxStock || 99, incoming.quantity) }];
    });
    void syncUpsertItem(incoming.variantId, nextQty);
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    if (!user || !isSupabaseConfigured || !supabase) return;
    void (async () => {
      try {
        const cartId = await ensureCartId(user.id);
        const { error } = await supabase!
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId)
          .eq('variant_id', variantId);
        if (error) throw error;
      } catch (err) {
        toast({
          title: 'Failed to remove item',
          description: err instanceof Error ? err.message : 'Unable to remove item from saved cart',
          variant: 'error',
        });
      }
    })();
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    const existing = itemsRef.current.find((i) => i.variantId === variantId);
    const clampedQty = Math.min(existing?.maxStock || 99, quantity);
    setItems((prev) =>
      prev.map((i) => {
        if (i.variantId !== variantId) return i;
        return { ...i, quantity: Math.min(i.maxStock || 99, quantity) };
      })
    );
    void syncUpsertItem(variantId, clampedQty);
  };

  const clearCart = () => {
    setItems([]);
    if (!user || !isSupabaseConfigured || !supabase) return;
    void (async () => {
      try {
        const cartId = await ensureCartId(user.id);
        const { error } = await supabase!.from('cart_items').delete().eq('cart_id', cartId);
        if (error) throw error;
      } catch (err) {
        toast({
          title: 'Failed to clear saved cart',
          description: err instanceof Error ? err.message : 'Unable to clear account cart',
          variant: 'error',
        });
      }
    })();
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
