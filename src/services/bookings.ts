import { generateHumanNumber, getUtmParams } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  Booking,
  BookingPaymentMethod,
  BookingStatus,
  RegistrationStep,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export interface CreateBookingInput {
  user_id: string;
  variant_id: string;
  color_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  payment_method: BookingPaymentMethod;
  notes?: string;
  proof_path?: string | null;
  gateway_reference?: string | null;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const utm = getUtmParams();

  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const now = new Date().toISOString();
    const bookingId = uid('bk');
    const bookingNumber = generateHumanNumber('BK');
    const holdDays = s.settings.booking_hold_days || 7;
    const holdExpires = new Date(Date.now() + holdDays * 86400_000).toISOString();

    const booking: Booking = {
      id: bookingId,
      booking_number: bookingNumber,
      user_id: input.user_id,
      variant_id: input.variant_id,
      color_id: input.color_id,
      branch_id: input.branch_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      token_amount: s.settings.booking_token_amount,
      status: 'pending',
      payment_method: input.payment_method,
      notes: input.notes ?? null,
      internal_notes: null,
      assigned_to: null,
      hold_expires_at: holdExpires,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      created_at: now,
      updated_at: now,
      registration_progress: {
        id: uid('rp'),
        booking_id: bookingId,
        current_step: 'booked',
        step_history: [{ step: 'booked', at: now, note: 'Booking submitted online' }],
        updated_by: input.user_id,
        updated_at: now,
      },
    };

    s.bookings.unshift(booking);
    s.payments.unshift({
      id: uid('pay'),
      payable_type: 'booking',
      payable_id: bookingId,
      method: input.payment_method,
      amount: s.settings.booking_token_amount,
      status: 'pending',
      proof_path: input.proof_path ?? null,
      gateway_reference: input.gateway_reference ?? null,
      gateway_payload: null,
      verified_by: null,
      verified_at: null,
      created_at: now,
    });
    saveDemoState();
    return enrichDemoBooking(booking);
  }

  const { data, error } = await supabase.rpc('create_booking', {
    p_variant_id: input.variant_id,
    p_color_id: input.color_id,
    p_branch_id: input.branch_id,
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone,
    p_customer_email: input.customer_email,
    p_payment_method: input.payment_method,
    p_notes: input.notes ?? null,
    p_proof_path: input.proof_path ?? null,
    p_utm_source: utm.utm_source,
    p_utm_medium: utm.utm_medium,
    p_utm_campaign: utm.utm_campaign,
  });

  if (error) throw error;
  const bookingNumber = typeof data === 'string' ? data : (data as { booking_number: string }).booking_number;
  const created = await getBookingByNumber(bookingNumber);
  if (!created) throw new Error('Booking created but unable to load details');
  return created;
}

function enrichDemoBooking(b: Booking): Booking {
  const s = getDemoState();
  const model = s.bikes.find((m) => (m.variants ?? []).some((v) => v.id === b.variant_id));
  const variant = model?.variants?.find((v) => v.id === b.variant_id);
  const color = model?.colors?.find((c) => c.id === b.color_id);
  const branch = s.branches.find((br) => br.id === b.branch_id);
  const payment = s.payments.find((p) => p.payable_type === 'booking' && p.payable_id === b.id);
  return {
    ...b,
    variant: variant ? { ...variant, model } : undefined,
    color,
    branch,
    payment,
  };
}

export async function listMyBookings(userId: string): Promise<Booking[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .bookings.filter((b) => b.user_id === userId)
      .map(enrichDemoBooking);
  }
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      variant:bike_variants(*, model:bike_models(*)),
      color:bike_colors(*),
      branch:branches(*),
      registration_progress(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function getBookingByNumber(bookingNumber: string): Promise<Booking | null> {
  if (!isSupabaseConfigured || !supabase) {
    const b = getDemoState().bookings.find((x) => x.booking_number === bookingNumber);
    return b ? enrichDemoBooking(b) : null;
  }
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      variant:bike_variants(*, model:bike_models(*)),
      color:bike_colors(*),
      branch:branches(*),
      registration_progress(*)
    `
    )
    .eq('booking_number', bookingNumber)
    .maybeSingle();
  if (error) throw error;
  return (data as Booking) ?? null;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (!isSupabaseConfigured || !supabase) {
    const b = getDemoState().bookings.find((x) => x.id === id);
    return b ? enrichDemoBooking(b) : null;
  }
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      variant:bike_variants(*, model:bike_models(*)),
      color:bike_colors(*),
      branch:branches(*),
      registration_progress(*)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Booking) ?? null;
}

export async function listAllBookingsAdmin(): Promise<Booking[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().bookings.map(enrichDemoBooking);
  }
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      variant:bike_variants(*, model:bike_models(*)),
      color:bike_colors(*),
      branch:branches(*),
      registration_progress(*)
    `
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function requestBookingCancel(bookingId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) throw new Error('Booking not found');
    if (b.status === 'confirmed') {
      for (const m of s.bikes) {
        const st = (m.stock ?? []).find(
          (row) => row.variant_id === b.variant_id && row.color_id === b.color_id && row.branch_id === b.branch_id
        );
        if (st && st.reserved > 0) st.reserved -= 1;
      }
    }
    b.status = 'cancelled';
    b.updated_at = new Date().toISOString();
    saveDemoState();
    return;
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function updateBookingAdmin(
  bookingId: string,
  updates: {
    status?: BookingStatus;
    internal_notes?: string | null;
    assigned_to?: string | null;
  },
  actorId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) throw new Error('Booking not found');
    const prevStatus = b.status;

    if (updates.status === 'confirmed' && prevStatus !== 'confirmed') {
      for (const m of s.bikes) {
        const st = (m.stock ?? []).find(
          (row) => row.variant_id === b.variant_id && row.color_id === b.color_id && row.branch_id === b.branch_id
        );
        if (st) st.reserved += 1;
      }
      if (b.registration_progress && b.registration_progress.current_step === 'booked') {
        b.registration_progress.current_step = 'payment_confirmed';
        b.registration_progress.step_history.push({
          step: 'payment_confirmed',
          at: new Date().toISOString(),
          note: 'Confirmed by showroom staff',
        });
      }
    }
    if ((updates.status === 'cancelled' || updates.status === 'expired') && prevStatus === 'confirmed') {
      for (const m of s.bikes) {
        const st = (m.stock ?? []).find(
          (row) => row.variant_id === b.variant_id && row.color_id === b.color_id && row.branch_id === b.branch_id
        );
        if (st && st.reserved > 0) st.reserved -= 1;
      }
    }

    Object.assign(b, updates, { updated_at: new Date().toISOString() });
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: actorId,
      action: 'booking_updated',
      entity_type: 'bookings',
      entity_id: bookingId,
      old_data: { status: prevStatus },
      new_data: updates as Record<string, unknown>,
      ip: null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return;
  }

  if (updates.status === 'confirmed') {
    const { error } = await supabase.rpc('confirm_booking', { booking_id: bookingId });
    if (error) throw error;
  }

  const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
  if (error) throw error;
}

export async function updateRegistrationProgress(
  bookingId: string,
  step: RegistrationStep,
  note: string,
  actorId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) throw new Error('Booking not found');
    const now = new Date().toISOString();
    if (!b.registration_progress) {
      b.registration_progress = {
        id: uid('rp'),
        booking_id: bookingId,
        current_step: step,
        step_history: [{ step, at: now, note }],
        updated_by: actorId,
        updated_at: now,
      };
    } else {
      b.registration_progress.current_step = step;
      b.registration_progress.step_history.push({ step, at: now, note });
      b.registration_progress.updated_by = actorId;
      b.registration_progress.updated_at = now;
    }
    saveDemoState();
    return;
  }

  const { data: existing } = await supabase
    .from('registration_progress')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  const now = new Date().toISOString();
  const prevHistory = (existing?.step_history as Array<{ step: RegistrationStep; at: string; note?: string }>) ?? [];
  const nextHistory = [...prevHistory, { step, at: now, note }];

  const { error } = await supabase.from('registration_progress').upsert(
    {
      booking_id: bookingId,
      current_step: step,
      step_history: nextHistory,
      updated_by: actorId,
      updated_at: now,
    },
    { onConflict: 'booking_id' }
  );
  if (error) throw error;
}
