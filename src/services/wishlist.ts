import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { SavedComparison, WishlistItem } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listMyWishlist(userId: string): Promise<WishlistItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    return s.wishlists
      .filter((w) => w.user_id === userId)
      .map((w) => ({
        ...w,
        model: w.model_id ? s.bikes.find((b) => b.id === w.model_id) : undefined,
        accessory: w.accessory_id ? s.accessories.find((a) => a.id === w.accessory_id) : undefined,
      }));
  }
  const { data, error } = await supabase
    .from('wishlists')
    .select('*, model:bike_models(*, images:bike_images(*), variants:bike_variants(*)), accessory:accessories(*, images:accessory_images(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WishlistItem[];
}

export async function toggleWishlistItem(
  userId: string,
  target: { model_id?: string; accessory_id?: string }
): Promise<boolean> {
  if (!target.model_id && !target.accessory_id) throw new Error('Missing wishlist item');

  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const idx = s.wishlists.findIndex(
      (w) =>
        w.user_id === userId &&
        (target.model_id ? w.model_id === target.model_id : w.accessory_id === target.accessory_id)
    );
    if (idx >= 0) {
      s.wishlists.splice(idx, 1);
      saveDemoState();
      return false;
    }
    s.wishlists.unshift({
      id: uid('wl'),
      user_id: userId,
      model_id: target.model_id ?? null,
      accessory_id: target.accessory_id ?? null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return true;
  }

  let q = supabase.from('wishlists').select('id').eq('user_id', userId);
  if (target.model_id) q = q.eq('model_id', target.model_id);
  if (target.accessory_id) q = q.eq('accessory_id', target.accessory_id);
  const { data: existing } = await q.maybeSingle();

  if (existing) {
    await supabase.from('wishlists').delete().eq('id', existing.id);
    return false;
  }
  const { error } = await supabase.from('wishlists').insert({
    user_id: userId,
    model_id: target.model_id ?? null,
    accessory_id: target.accessory_id ?? null,
  });
  if (error) throw error;
  return true;
}

export async function listSavedComparisons(userId: string): Promise<SavedComparison[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().savedComparisons.filter((c) => c.user_id === userId);
  }
  const { data, error } = await supabase
    .from('saved_comparisons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedComparison[];
}

export async function saveComparison(
  userId: string,
  name: string,
  modelIds: string[]
): Promise<SavedComparison> {
  const clipped = modelIds.slice(0, 3);
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row: SavedComparison = {
      id: uid('cmp'),
      user_id: userId,
      name,
      model_ids: clipped,
      created_at: new Date().toISOString(),
    };
    s.savedComparisons.unshift(row);
    saveDemoState();
    return row;
  }
  const { data, error } = await supabase
    .from('saved_comparisons')
    .insert({ user_id: userId, name, model_ids: clipped })
    .select('*')
    .single();
  if (error) throw error;
  return data as SavedComparison;
}

export async function deleteSavedComparison(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.savedComparisons = s.savedComparisons.filter((c) => c.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('saved_comparisons').delete().eq('id', id);
  if (error) throw error;
}
