import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  BikeCategory,
  BikeColor,
  BikeImage,
  BikeModel,
  BikePriceHistory,
  BikeStock,
  BikeVariant,
  EmiPlan,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(candidate?: string): string {
  return candidate && UUID_RE.test(candidate) ? candidate : crypto.randomUUID();
}

export interface BikeFilterParams {
  categorySlug?: string;
  minCc?: number;
  maxCc?: number;
  minPrice?: number;
  maxPrice?: number;
  colorName?: string;
  minMileage?: number;
  inStockOnly?: boolean;
  search?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'cc_asc' | 'cc_desc';
  includeDrafts?: boolean;
}

export async function listBikeCategories(): Promise<BikeCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().bikeCategories.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('bike_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BikeCategory[];
}

export async function listBikes(filters: BikeFilterParams = {}): Promise<BikeModel[]> {
  let models: BikeModel[];

  if (!isSupabaseConfigured || !supabase) {
    models = structuredClone(getDemoState().bikes);
  } else {
    let query = supabase
      .from('bike_models')
      .select(
        `
        *,
        category:bike_categories(*),
        variants:bike_variants(*),
        colors:bike_colors(*),
        images:bike_images(*)
      `
      )
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!filters.includeDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;
    models = (data ?? []) as BikeModel[];

    const variantIds = models.flatMap((m) => (m.variants ?? []).map((v) => v.id));
    if (variantIds.length > 0) {
      const { data: stockData, error: stockError } = await supabase
        .from('bike_stock')
        .select('*')
        .in('variant_id', variantIds);
      if (stockError) throw stockError;
      const stockRows = (stockData ?? []) as BikeStock[];
      models = models.map((m) => ({
        ...m,
        stock: stockRows.filter((s) => (m.variants ?? []).some((v) => v.id === s.variant_id)),
      }));
    }
  }

  return applyBikeFilters(models, filters);
}

function applyBikeFilters(models: BikeModel[], filters: BikeFilterParams): BikeModel[] {
  let result = models.filter((m) => (filters.includeDrafts ? true : m.status === 'published'));

  if (filters.categorySlug && filters.categorySlug !== 'all') {
    result = result.filter((m) => m.category?.slug === filters.categorySlug);
  }
  if (filters.minCc) {
    result = result.filter((m) => m.engine_cc >= filters.minCc!);
  }
  if (filters.maxCc) {
    result = result.filter((m) => m.engine_cc <= filters.maxCc!);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.tagline ?? '').toLowerCase().includes(q) ||
        (m.category?.name ?? '').toLowerCase().includes(q)
    );
  }
  if (filters.colorName) {
    result = result.filter((m) =>
      (m.colors ?? []).some((c) => c.name.toLowerCase() === filters.colorName!.toLowerCase())
    );
  }
  if (filters.minMileage) {
    result = result.filter((m) =>
      (m.variants ?? []).some((v) => (v.mileage_kmpl ?? 0) >= filters.minMileage!)
    );
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    result = result.filter((m) => {
      const prices = (m.variants ?? []).map((v) => v.ex_showroom_price);
      if (prices.length === 0) return false;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (filters.minPrice !== undefined && max < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && min > filters.maxPrice) return false;
      return true;
    });
  }
  if (filters.inStockOnly) {
    result = result.filter((m) => getTotalAvailableBikeStock(m) > 0);
  }

  const minPrice = (m: BikeModel) => {
    const prices = (m.variants ?? []).map((v) => v.ex_showroom_price);
    return prices.length ? Math.min(...prices) : 0;
  };

  switch (filters.sort) {
    case 'price_asc':
      result.sort((a, b) => minPrice(a) - minPrice(b));
      break;
    case 'price_desc':
      result.sort((a, b) => minPrice(b) - minPrice(a));
      break;
    case 'cc_asc':
      result.sort((a, b) => a.engine_cc - b.engine_cc);
      break;
    case 'cc_desc':
      result.sort((a, b) => b.engine_cc - a.engine_cc);
      break;
    default:
      result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }

  return result;
}

export function getTotalAvailableBikeStock(
  model: BikeModel,
  variantId?: string,
  colorId?: string,
  branchId?: string
): number {
  const rows = model.stock ?? [];
  return rows
    .filter((s) => (!variantId || s.variant_id === variantId))
    .filter((s) => (!colorId || s.color_id === colorId))
    .filter((s) => (!branchId || s.branch_id === branchId))
    .reduce((sum, s) => sum + Math.max(0, s.quantity - s.reserved), 0);
}

export async function getBikeBySlug(slug: string): Promise<BikeModel | null> {
  if (!isSupabaseConfigured || !supabase) {
    const found = getDemoState().bikes.find((b) => b.slug === slug);
    return found ? structuredClone(found) : null;
  }

  const { data, error } = await supabase
    .from('bike_models')
    .select(
      `
      *,
      category:bike_categories(*),
      variants:bike_variants(*),
      colors:bike_colors(*),
      images:bike_images(*)
    `
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const model = data as BikeModel;
  const variantIds = (model.variants ?? []).map((v) => v.id);
  if (variantIds.length > 0) {
    const { data: stockData, error: stockError } = await supabase
      .from('bike_stock')
      .select('*')
      .in('variant_id', variantIds);
    if (stockError) throw stockError;
    model.stock = (stockData ?? []) as BikeStock[];
  } else {
    model.stock = [];
  }
  return model;
}

export async function getBikeById(id: string): Promise<BikeModel | null> {
  if (!isSupabaseConfigured || !supabase) {
    const found = getDemoState().bikes.find((b) => b.id === id);
    return found ? structuredClone(found) : null;
  }

  const { data, error } = await supabase
    .from('bike_models')
    .select(
      `
      *,
      category:bike_categories(*),
      variants:bike_variants(*),
      colors:bike_colors(*),
      images:bike_images(*)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const model = data as BikeModel;
  const variantIds = (model.variants ?? []).map((v) => v.id);
  if (variantIds.length > 0) {
    const { data: stockData, error: stockError } = await supabase
      .from('bike_stock')
      .select('*')
      .in('variant_id', variantIds);
    if (stockError) throw stockError;
    model.stock = (stockData ?? []) as BikeStock[];
  } else {
    model.stock = [];
  }
  return model;
}

export async function listEmiPlans(): Promise<EmiPlan[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().emiPlans.filter((p) => p.is_active);
  }
  const { data, error } = await supabase
    .from('emi_plans')
    .select('*')
    .eq('is_active', true)
    .order('tenure_months', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmiPlan[];
}

export async function listPriceHistory(variantIds: string[]): Promise<BikePriceHistory[]> {
  if (variantIds.length === 0) return [];
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .priceHistory.filter((h) => variantIds.includes(h.variant_id))
      .sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }
  const { data, error } = await supabase
    .from('bike_price_history')
    .select('*')
    .in('variant_id', variantIds)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BikePriceHistory[];
}

export async function saveBikeModel(
  payload: {
    id?: string;
    name: string;
    slug: string;
    category_id: string;
    tagline: string | null;
    description: string | null;
    engine_cc: number;
    is_featured: boolean;
    status: BikeModel['status'];
    seo_title: string | null;
    seo_description: string | null;
    variants: Array<Omit<BikeVariant, 'model_id'>>;
    colors: Array<Omit<BikeColor, 'model_id'>>;
    images: Array<Omit<BikeImage, 'model_id'>>;
    stock: BikeStock[];
  },
  actorId: string
): Promise<BikeModel> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const now = new Date().toISOString();
    const cat = s.bikeCategories.find((c) => c.id === payload.category_id);
    if (payload.id) {
      const idx = s.bikes.findIndex((b) => b.id === payload.id);
      if (idx === -1) throw new Error('Bike model not found');
      const prev = s.bikes[idx];
      for (const nextVar of payload.variants) {
        const oldVar = (prev.variants ?? []).find((v) => v.id === nextVar.id);
        if (oldVar && oldVar.ex_showroom_price !== nextVar.ex_showroom_price) {
          s.priceHistory.unshift({
            id: uid('ph'),
            variant_id: nextVar.id,
            old_price: oldVar.ex_showroom_price,
            new_price: nextVar.ex_showroom_price,
            changed_by: actorId,
            changed_at: now,
          });
        }
      }
      const updated: BikeModel = {
        ...prev,
        ...payload,
        category: cat,
        variants: payload.variants.map((v) => ({ ...v, model_id: prev.id })),
        colors: payload.colors.map((c) => ({ ...c, model_id: prev.id })),
        images: payload.images.map((i) => ({ ...i, view_angle: i.view_angle ?? null, model_id: prev.id })),
        stock: payload.stock,
        updated_at: now,
      };
      s.bikes[idx] = updated;
      saveDemoState();
      return updated;
    } else {
      const newId = uid('bike');
      const created: BikeModel = {
        id: newId,
        slug: payload.slug,
        name: payload.name,
        category_id: payload.category_id,
        tagline: payload.tagline,
        description: payload.description,
        engine_cc: payload.engine_cc,
        is_featured: payload.is_featured,
        status: payload.status,
        seo_title: payload.seo_title,
        seo_description: payload.seo_description,
        created_at: now,
        updated_at: now,
        category: cat,
        variants: payload.variants.map((v) => ({ ...v, id: v.id || uid('var'), model_id: newId })),
        colors: payload.colors.map((c) => ({ ...c, id: c.id || uid('col'), model_id: newId })),
        images: payload.images.map((i) => ({
          ...i,
          id: i.id || uid('img'),
          view_angle: i.view_angle ?? null,
          model_id: newId,
        })),
        stock: payload.stock,
      };
      s.bikes.unshift(created);
      saveDemoState();
      return created;
    }
  }

  const prevModel = payload.id ? await getBikeById(payload.id) : null;

  const modelRow = {
    name: payload.name,
    slug: payload.slug,
    category_id: payload.category_id,
    tagline: payload.tagline,
    description: payload.description,
    engine_cc: payload.engine_cc,
    is_featured: payload.is_featured,
    status: payload.status,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
  };

  let modelId = payload.id;
  if (modelId) {
    const { error } = await supabase.from('bike_models').update(modelRow).eq('id', modelId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('bike_models').insert(modelRow).select('id').single();
    if (error || !data) throw error ?? new Error('Failed to create bike model');
    modelId = data.id;
  }

  // Normalize UUIDs so newly added child records remap stock/image FK references cleanly
  const variantIdMap = new Map<string, string>();
  const normalizedVariants = payload.variants.map((v) => {
    const resolvedId = ensureUuid(v.id);
    variantIdMap.set(v.id, resolvedId);
    return { ...v, id: resolvedId, model_id: modelId! };
  });

  const colorIdMap = new Map<string, string>();
  const normalizedColors = payload.colors.map((c) => {
    const resolvedId = ensureUuid(c.id);
    colorIdMap.set(c.id, resolvedId);
    return { ...c, id: resolvedId, model_id: modelId! };
  });

  const normalizedImages = payload.images.map((img) => ({
    ...img,
    id: ensureUuid(img.id),
    color_id: img.color_id ? (colorIdMap.get(img.color_id) ?? img.color_id) : null,
    view_angle: img.view_angle ?? null,
    model_id: modelId!,
  }));

  const normalizedStock = payload.stock.map((st) => ({
    ...st,
    id: ensureUuid(st.id),
    variant_id: variantIdMap.get(st.variant_id) ?? st.variant_id,
    color_id: colorIdMap.get(st.color_id) ?? st.color_id,
  }));

  // Delete removed variants, colors, images, and track price history changes
  if (prevModel) {
    const nextVarIds = new Set(normalizedVariants.map((v) => v.id));
    const removedVarIds = (prevModel.variants ?? []).map((v) => v.id).filter((id) => !nextVarIds.has(id));
    if (removedVarIds.length > 0) {
      const { error: delVarErr } = await supabase.from('bike_variants').delete().in('id', removedVarIds);
      if (delVarErr) throw delVarErr;
    }

    const nextColIds = new Set(normalizedColors.map((c) => c.id));
    const removedColIds = (prevModel.colors ?? []).map((c) => c.id).filter((id) => !nextColIds.has(id));
    if (removedColIds.length > 0) {
      const { error: delColErr } = await supabase.from('bike_colors').delete().in('id', removedColIds);
      if (delColErr) throw delColErr;
    }

    const nextImgIds = new Set(normalizedImages.map((i) => i.id));
    const removedImgIds = (prevModel.images ?? []).map((i) => i.id).filter((id) => !nextImgIds.has(id));
    if (removedImgIds.length > 0) {
      const { error: delImgErr } = await supabase.from('bike_images').delete().in('id', removedImgIds);
      if (delImgErr) throw delImgErr;
    }
  }

  for (const v of normalizedVariants) {
    const { error: varErr } = await supabase.from('bike_variants').upsert(v);
    if (varErr) throw varErr;

    if (prevModel) {
      const oldVar = (prevModel.variants ?? []).find((ov) => ov.id === v.id);
      if (oldVar && oldVar.ex_showroom_price !== v.ex_showroom_price) {
        const { error: histErr } = await supabase.from('bike_price_history').insert({
          variant_id: v.id,
          old_price: oldVar.ex_showroom_price,
          new_price: v.ex_showroom_price,
          changed_by: actorId,
        });
        if (histErr) throw histErr;
      }
    }
  }

  for (const c of normalizedColors) {
    const { error: colErr } = await supabase.from('bike_colors').upsert(c);
    if (colErr) throw colErr;
  }

  for (const img of normalizedImages) {
    const { error: imgErr } = await supabase.from('bike_images').upsert(img);
    if (imgErr) throw imgErr;
  }

  for (const st of normalizedStock) {
    const { error: stErr } = await supabase
      .from('bike_stock')
      .upsert(st, { onConflict: 'variant_id,color_id,branch_id' });
    if (stErr) throw stErr;
  }

  const refreshed = await getBikeById(modelId!);
  if (!refreshed) throw new Error('Bike saved but failed to reload');
  return refreshed;
}

export async function deleteBikeModel(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.bikes = s.bikes.filter((b) => b.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('bike_models').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBikeStockRow(stockRow: Omit<BikeStock, 'id'> & { id?: string }): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    for (const b of s.bikes) {
      const idx = (b.stock ?? []).findIndex(
        (x) =>
          x.variant_id === stockRow.variant_id &&
          x.color_id === stockRow.color_id &&
          x.branch_id === stockRow.branch_id
      );
      if (idx >= 0) {
        b.stock![idx] = { ...b.stock![idx], ...stockRow };
      } else if ((b.variants ?? []).some((v) => v.id === stockRow.variant_id)) {
        b.stock = [...(b.stock ?? []), { ...stockRow, id: stockRow.id || uid('stk') }];
      }
    }
    saveDemoState();
    return;
  }

  const payload: Omit<BikeStock, 'id'> & { id?: string } = {
    variant_id: stockRow.variant_id,
    color_id: stockRow.color_id,
    branch_id: stockRow.branch_id,
    quantity: stockRow.quantity,
    reserved: stockRow.reserved,
  };
  if (stockRow.id && UUID_RE.test(stockRow.id)) {
    payload.id = stockRow.id;
  }

  const { error } = await supabase
    .from('bike_stock')
    .upsert(payload, { onConflict: 'variant_id,color_id,branch_id' });
  if (error) throw error;
}
