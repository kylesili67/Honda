import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Payment, PaymentStatus, Refund } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listPaymentsAdmin(): Promise<Payment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().payments;
  }
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function listRefundsAdmin(): Promise<Refund[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().refunds;
  }
  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .order('processed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Refund[];
}

export async function verifyPaymentAdmin(
  paymentId: string,
  status: PaymentStatus,
  verifierId: string
): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const p = s.payments.find((x) => x.id === paymentId);
    if (!p) throw new Error('Payment not found');
    const prev = p.status;
    p.status = status;
    p.verified_by = verifierId;
    p.verified_at = now;

    if (p.payable_type === 'order') {
      const o = s.orders.find((x) => x.id === p.payable_id);
      if (o) o.payment_status = status;
    }

    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: verifierId,
      action: 'payment_status_updated',
      entity_type: 'payments',
      entity_id: paymentId,
      old_data: { status: prev },
      new_data: { status },
      ip: null,
      created_at: now,
    });
    saveDemoState();
    return;
  }

  const { error } = await supabase
    .from('payments')
    .update({ status, verified_by: verifierId, verified_at: now })
    .eq('id', paymentId);
  if (error) throw error;
}

export async function recordRefundAdmin(input: {
  payment_id: string;
  amount: number;
  reason: string;
  processed_by: string;
  reference?: string | null;
}): Promise<Refund> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const p = s.payments.find((x) => x.id === input.payment_id);
    if (!p) throw new Error('Payment not found');
    p.status = 'refunded';
    if (p.payable_type === 'order') {
      const o = s.orders.find((x) => x.id === p.payable_id);
      if (o) o.payment_status = 'refunded';
    } else {
      const b = s.bookings.find((x) => x.id === p.payable_id);
      if (b) b.status = 'refunded';
    }
    const refund: Refund = {
      id: uid('ref'),
      payment_id: input.payment_id,
      amount: input.amount,
      reason: input.reason,
      processed_by: input.processed_by,
      processed_at: now,
      reference: input.reference ?? null,
    };
    s.refunds.unshift(refund);
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: input.processed_by,
      action: 'refund_recorded',
      entity_type: 'refunds',
      entity_id: refund.id,
      old_data: null,
      new_data: refund as unknown as Record<string, unknown>,
      ip: null,
      created_at: now,
    });
    saveDemoState();
    return refund;
  }

  const { data, error } = await supabase
    .from('refunds')
    .insert({ ...input, processed_at: now })
    .select('*')
    .single();
  if (error) throw error;

  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', input.payment_id);
  if (paymentUpdateError) throw paymentUpdateError;

  return data as Refund;
}

export interface GatewayInitiationResult {
  status: string;
  reference?: string;
  message?: string;
  redirectUrl?: string;
  formAction?: string;
  formFields?: Record<string, string>;
}

export async function initiateGatewayPayment(
  gateway: 'jazzcash' | 'easypaisa',
  payload: { payableType: 'booking' | 'order'; payableId: string; amount: number; referenceNumber: string }
): Promise<GatewayInitiationResult> {
  const endpoint =
    gateway === 'jazzcash' ? '/api/payments/jazzcash-create' : '/api/payments/easypaisa-create';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Online payment is not available yet (HTTP ${res.status}).`);
  }

  const parsed = (await res.json()) as GatewayInitiationResult & { error?: string };
  if (!res.ok) {
    return {
      status: parsed.status || 'disabled',
      message:
        parsed.message ||
        parsed.error ||
        'Online payment is not available yet, please use bank transfer or COD.',
    };
  }
  return parsed;
}
