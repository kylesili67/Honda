import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { LoyaltyLedgerEntry, LoyaltyReason } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listMyLoyaltyLedger(userId: string): Promise<LoyaltyLedgerEntry[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .loyaltyLedger.filter((l) => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoyaltyLedgerEntry[];
}

export async function adjustLoyaltyPointsAdmin(input: {
  user_id: string;
  points: number;
  reason: LoyaltyReason;
  note: string;
  actor_id: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const user = s.users.find((u) => u.id === input.user_id);
    if (!user) throw new Error('Customer not found');
    const now = new Date().toISOString();
    user.profile.loyalty_balance = Math.max(0, user.profile.loyalty_balance + input.points);
    s.loyaltyLedger.unshift({
      id: uid('ll'),
      user_id: input.user_id,
      points: input.points,
      reason: input.reason,
      reference_type: 'admin_adjust',
      reference_id: null,
      note: input.note,
      created_by: input.actor_id,
      created_at: now,
    });
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: input.actor_id,
      action: 'loyalty_adjusted',
      entity_type: 'loyalty_ledger',
      entity_id: input.user_id,
      old_data: null,
      new_data: { points: input.points, note: input.note },
      ip: null,
      created_at: now,
    });
    saveDemoState();
    return;
  }

  const { error } = await supabase.rpc('add_loyalty_points', {
    p_user_id: input.user_id,
    p_points: input.points,
    p_reason: input.reason,
    p_note: input.note,
  });
  if (error) throw error;
}
