import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  Accessory,
  AccessoryCategory,
  AccessoryImage,
  AccessoryVariant,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(candidate?: string): string {
  return candidate && UUID_RE.test(candidate) ? candidate : crypto.randomUUID();
}

export interface AccessoryFilterParams {
  categorySlug?: string;
  compatibleModelId?: string;
  search?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc';
  includeDrafts?: boolean;
}

export async function listAccessoryCategories(): Promise<AccessoryCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .accessoryCategories.filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('accessory_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccessoryCategory[];
}

export async function listAccessories(filters: AccessoryFilterParams = {}): Promise<Accessory[]> {
  let items: Accessory[];

  if (!isSupabaseConfigured || !supabase) {
    items = structuredClone(getDemoState().accessories);
  } else {
    let query = supabase
      .from('accessories')
      .select(
        `
        *,
        category:accessory_categories(*),
        variants:accessory_variants(*),
        images:accessory_images(*),
        compatibility:accessory_compatibility(model_id)
      `
      )
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!filters.includeDrafts) {
      query = query.eq('status', 'published');
    }
    const { data, error } = await query;
    if (error) throw error;
    items = ((data ?? []) as Array<Accessory & { compatibility?: Array<{ model_id: string }> }>).map(
      (row) => ({
        ...row,
        compatible_model_ids: (row.compatibility ?? []).map((c) => c.model_id),
      })
    );
  }

  let result = items.filter((a) => (filters.includeDrafts ? true : a.status === 'published'));
  if (filters.categorySlug && filters.categorySlug !== 'all') {
    result = result.filter((a) => a.category?.slug === filters.categorySlug);
  }
  if (filters.compatibleModelId && filters.compatibleModelId !== 'all') {
    result = result.filter((a) => (a.compatible_model_ids ?? []).includes(filters.compatibleModelId!));
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
    );
  }
  switch (filters.sort) {
    case 'price_asc':
      result.sort((a, b) => a.base_price - b.base_price);
      break;
    case 'price_desc':
      result.sort((a, b) => b.base_price - a.base_price);
      break;
    default:
      result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }

  return result;
}

export async function getAccessoryBySlug(slug: string): Promise<Accessory | null> {
  if (!isSupabaseConfigured || !supabase) {
    const found = getDemoState().accessories.find((a) => a.slug === slug);
    return found ? structuredClone(found) : null;
  }

  const { data, error } = await supabase
    .from('accessories')
    .select(
      `
      *,
      category:accessory_categories(*),
      variants:accessory_variants(*),
      images:accessory_images(*),
      compatibility:accessory_compatibility(model_id)
    `
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const typed = data as Accessory & { compatibility?: Array<{ model_id: string }> };
  return {
    ...typed,
    compatible_model_ids: (typed.compatibility ?? []).map((c) => c.model_id),
  };
}

export async function getAccessoryById(id: string): Promise<Accessory | null> {
  if (!isSupabaseConfigured || !supabase) {
    const found = getDemoState().accessories.find((a) => a.id === id);
    return found ? structuredClone(found) : null;
  }

  const { data, error } = await supabase
    .from('accessories')
    .select(
      `
      *,
      category:accessory_categories(*),
      variants:accessory_variants(*),
      images:accessory_images(*),
      compatibility:accessory_compatibility(model_id)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const typed = data as Accessory & { compatibility?: Array<{ model_id: string }> };
  return {
    ...typed,
    compatible_model_ids: (typed.compatibility ?? []).map((c) => c.model_id),
  };
}

export async function saveAccessory(payload: {
  id?: string;
  name: string;
  slug: string;
  category_id: string;
  description: string | null;
  brand: string | null;
  base_price: number;
  compare_at_price: number | null;
  status: Accessory['status'];
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  variants: Array<Omit<AccessoryVariant, 'accessory_id'>>;
  images: Array<Omit<AccessoryImage, 'accessory_id'>>;
  compatible_model_ids: string[];
}): Promise<Accessory> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const now = new Date().toISOString();
    const cat = s.accessoryCategories.find((c) => c.id === payload.category_id);
    if (payload.id) {
      const idx = s.accessories.findIndex((a) => a.id === payload.id);
      if (idx === -1) throw new Error('Accessory not found');
      const updated: Accessory = {
        ...s.accessories[idx],
        ...payload,
        category: cat,
        variants: payload.variants.map((v) => ({ ...v, accessory_id: payload.id! })),
        images: payload.images.map((i) => ({ ...i, accessory_id: payload.id! })),
        updated_at: now,
      };
      s.accessories[idx] = updated;
      saveDemoState();
      return updated;
    } else {
      const newId = uid('acc');
      const created: Accessory = {
        id: newId,
        slug: payload.slug,
        name: payload.name,
        category_id: payload.category_id,
        description: payload.description,
        brand: payload.brand,
        base_price: payload.base_price,
        compare_at_price: payload.compare_at_price,
        status: payload.status,
        is_featured: payload.is_featured,
        seo_title: payload.seo_title,
        seo_description: payload.seo_description,
        created_at: now,
        updated_at: now,
        category: cat,
        variants: payload.variants.map((v) => ({ ...v, id: v.id || uid('avar'), accessory_id: newId })),
        images: payload.images.map((i) => ({ ...i, id: i.id || uid('aimg'), accessory_id: newId })),
        compatible_model_ids: payload.compatible_model_ids,
      };
      s.accessories.unshift(created);
      saveDemoState();
      return created;
    }
  }

  const prevAcc = payload.id ? await getAccessoryById(payload.id) : null;

  const row = {
    name: payload.name,
    slug: payload.slug,
    category_id: payload.category_id,
    description: payload.description,
    brand: payload.brand,
    base_price: payload.base_price,
    compare_at_price: payload.compare_at_price,
    status: payload.status,
    is_featured: payload.is_featured,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
  };

  let accId = payload.id;
  if (accId) {
    const { error } = await supabase.from('accessories').update(row).eq('id', accId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('accessories').insert(row).select('id').single();
    if (error || !data) throw error ?? new Error('Failed to create accessory');
    accId = data.id;
  }

  const normalizedVariants = payload.variants.map((v) => ({
    ...v,
    id: ensureUuid(v.id),
    accessory_id: accId!,
  }));

  const normalizedImages = payload.images.map((img) => ({
    ...img,
    id: ensureUuid(img.id),
    accessory_id: accId!,
  }));

  if (prevAcc) {
    const nextVarIds = new Set(normalizedVariants.map((v) => v.id));
    const removedVarIds = (prevAcc.variants ?? []).map((v) => v.id).filter((id) => !nextVarIds.has(id));
    if (removedVarIds.length > 0) {
      const { error: delVarErr } = await supabase
        .from('accessory_variants')
        .delete()
        .in('id', removedVarIds);
      if (delVarErr) throw delVarErr;
    }

    const nextImgIds = new Set(normalizedImages.map((i) => i.id));
    const removedImgIds = (prevAcc.images ?? []).map((i) => i.id).filter((id) => !nextImgIds.has(id));
    if (removedImgIds.length > 0) {
      const { error: delImgErr } = await supabase
        .from('accessory_images')
        .delete()
        .in('id', removedImgIds);
      if (delImgErr) throw delImgErr;
    }
  }

  for (const v of normalizedVariants) {
    const { error: varErr } = await supabase.from('accessory_variants').upsert(v);
    if (varErr) throw varErr;
  }
  for (const img of normalizedImages) {
    const { error: imgErr } = await supabase.from('accessory_images').upsert(img);
    if (imgErr) throw imgErr;
  }

  const { error: delCompatErr } = await supabase
    .from('accessory_compatibility')
    .delete()
    .eq('accessory_id', accId);
  if (delCompatErr) throw delCompatErr;

  if (payload.compatible_model_ids.length > 0) {
    const { error: insCompatErr } = await supabase
      .from('accessory_compatibility')
      .insert(payload.compatible_model_ids.map((model_id) => ({ accessory_id: accId!, model_id })));
    if (insCompatErr) throw insCompatErr;
  }

  const refreshed = await getAccessoryById(accId!);
  if (!refreshed) throw new Error('Accessory saved but failed to reload');
  return refreshed;
}

export async function deleteAccessory(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.accessories = s.accessories.filter((a) => a.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('accessories').delete().eq('id', id);
  if (error) throw error;
}
