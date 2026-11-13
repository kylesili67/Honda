import { getUtmParams } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Inquiry, InquiryStatus } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export interface CreateInquiryInput {
  user_id?: string | null;
  model_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  preferred_contact_time?: string | null;
  source?: string;
}

export async function createInquiry(input: CreateInquiryInput): Promise<Inquiry> {
  const utm = getUtmParams();
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row: Inquiry = {
      id: uid('inq'),
      user_id: input.user_id ?? null,
      model_id: input.model_id ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message,
      preferred_contact_time: input.preferred_contact_time ?? null,
      source: input.source ?? 'website',
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      status: 'new',
      internal_notes: null,
      assigned_to: null,
      created_at: new Date().toISOString(),
      model: s.bikes.find((b) => b.id === input.model_id),
    };
    s.inquiries.unshift(row);
    saveDemoState();
    return row;
  }

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      user_id: input.user_id ?? null,
      model_id: input.model_id ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message,
      preferred_contact_time: input.preferred_contact_time ?? null,
      source: input.source ?? 'website',
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      status: 'new',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Inquiry;
}

export async function listMyInquiries(userId: string): Promise<Inquiry[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    return s.inquiries
      .filter((i) => i.user_id === userId)
      .map((i) => ({ ...i, model: s.bikes.find((b) => b.id === i.model_id) }));
  }
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, model:bike_models(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Inquiry[];
}

export async function listAllInquiriesAdmin(): Promise<Inquiry[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    return s.inquiries.map((i) => ({ ...i, model: s.bikes.find((b) => b.id === i.model_id) }));
  }
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, model:bike_models(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Inquiry[];
}

export async function updateInquiryAdmin(
  id: string,
  updates: { status?: InquiryStatus; internal_notes?: string | null; assigned_to?: string | null }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row = s.inquiries.find((i) => i.id === id);
    if (!row) throw new Error('Inquiry not found');
    Object.assign(row, updates);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('inquiries').update(updates).eq('id', id);
  if (error) throw error;
}
