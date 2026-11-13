import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { TradeInRequest, TradeInStatus } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function createTradeInRequest(input: {
  user_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  current_make: string;
  current_model: string;
  year: number;
  mileage_km: number;
  condition: string;
  registration_city: string;
  expected_price: number;
  photo_paths: string[];
  interested_model_id?: string | null;
}): Promise<TradeInRequest> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row: TradeInRequest = {
      id: uid('ti'),
      user_id: input.user_id ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      current_make: input.current_make,
      current_model: input.current_model,
      year: input.year,
      mileage_km: input.mileage_km,
      condition: input.condition,
      registration_city: input.registration_city,
      expected_price: input.expected_price,
      photo_paths: input.photo_paths,
      interested_model_id: input.interested_model_id ?? null,
      status: 'new',
      valuation_amount: null,
      valuation_note: null,
      internal_notes: null,
      assigned_to: null,
      created_at: new Date().toISOString(),
      interested_model: s.bikes.find((b) => b.id === input.interested_model_id),
    };
    s.tradeIns.unshift(row);
    saveDemoState();
    return row;
  }

  const { data, error } = await supabase
    .from('trade_in_requests')
    .insert({
      ...input,
      status: 'new',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as TradeInRequest;
}

export async function listAllTradeInsAdmin(): Promise<TradeInRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    return s.tradeIns.map((t) => ({
      ...t,
      interested_model: s.bikes.find((b) => b.id === t.interested_model_id),
    }));
  }
  const { data, error } = await supabase
    .from('trade_in_requests')
    .select('*, interested_model:bike_models(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TradeInRequest[];
}

export async function updateTradeInAdmin(
  id: string,
  updates: {
    status?: TradeInStatus;
    valuation_amount?: number | null;
    valuation_note?: string | null;
    internal_notes?: string | null;
    assigned_to?: string | null;
  }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row = s.tradeIns.find((t) => t.id === id);
    if (!row) throw new Error('Trade-in request not found');
    Object.assign(row, updates);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('trade_in_requests').update(updates).eq('id', id);
  if (error) throw error;
}
