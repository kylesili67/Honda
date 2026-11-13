import { generateHumanNumber } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { SlotAvailability, TestRide, TestRideStatus } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function checkSlotAvailability(
  branchId: string,
  slotType: 'test_ride' | 'service',
  date: string
): Promise<SlotAvailability[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const slots = s.timeSlots.filter(
      (sl) => sl.branch_id === branchId && sl.slot_type === slotType && sl.is_active
    );
    return slots.map((sl) => {
      const bookedCount =
        slotType === 'test_ride'
          ? s.testRides.filter(
              (tr) =>
                tr.branch_id === branchId &&
                tr.ride_date === date &&
                tr.slot_id === sl.id &&
                !['cancelled', 'no_show'].includes(tr.status)
            ).length
          : s.serviceAppointments.filter(
              (sv) =>
                sv.branch_id === branchId &&
                sv.service_date === date &&
                sv.slot_id === sl.id &&
                !['cancelled', 'no_show'].includes(sv.status)
            ).length;
      return {
        ...sl,
        booked_count: bookedCount,
        remaining: Math.max(0, sl.capacity - bookedCount),
      };
    });
  }

  const { data, error } = await supabase.rpc('check_slot_availability', {
    p_branch_id: branchId,
    p_slot_type: slotType,
    p_date: date,
  });
  if (error) throw error;
  return (data ?? []) as SlotAvailability[];
}

export async function createTestRide(input: {
  user_id?: string | null;
  model_id: string;
  variant_id?: string | null;
  branch_id: string;
  ride_date: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
}): Promise<TestRide> {
  const number = generateHumanNumber('TR');
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const avail = await checkSlotAvailability(input.branch_id, 'test_ride', input.ride_date);
    const chosen = avail.find((a) => a.id === input.slot_id);
    if (!chosen || chosen.remaining <= 0) {
      throw new Error('Selected slot is fully booked. Please pick another time.');
    }

    const row: TestRide = {
      id: uid('tr'),
      test_ride_number: number,
      user_id: input.user_id ?? null,
      model_id: input.model_id,
      variant_id: input.variant_id ?? null,
      branch_id: input.branch_id,
      ride_date: input.ride_date,
      slot_id: input.slot_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      status: 'requested',
      internal_notes: null,
      assigned_to: null,
      created_at: new Date().toISOString(),
    };
    s.testRides.unshift(row);
    saveDemoState();
    return enrichDemoTestRide(row);
  }

  const { data, error } = await supabase
    .from('test_rides')
    .insert({
      test_ride_number: number,
      user_id: input.user_id ?? null,
      model_id: input.model_id,
      variant_id: input.variant_id ?? null,
      branch_id: input.branch_id,
      ride_date: input.ride_date,
      slot_id: input.slot_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      status: 'requested',
    })
    .select('*, model:bike_models(*), branch:branches(*), slot:time_slots(*)')
    .single();
  if (error) throw error;
  return data as TestRide;
}

function enrichDemoTestRide(tr: TestRide): TestRide {
  const s = getDemoState();
  return {
    ...tr,
    model: s.bikes.find((b) => b.id === tr.model_id),
    branch: s.branches.find((br) => br.id === tr.branch_id),
    slot: s.timeSlots.find((sl) => sl.id === tr.slot_id),
  };
}

export async function listMyTestRides(userId: string): Promise<TestRide[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().testRides.filter((tr) => tr.user_id === userId).map(enrichDemoTestRide);
  }
  const { data, error } = await supabase
    .from('test_rides')
    .select('*, model:bike_models(*), branch:branches(*), slot:time_slots(*)')
    .eq('user_id', userId)
    .order('ride_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TestRide[];
}

export async function listAllTestRidesAdmin(): Promise<TestRide[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().testRides.map(enrichDemoTestRide);
  }
  const { data, error } = await supabase
    .from('test_rides')
    .select('*, model:bike_models(*), branch:branches(*), slot:time_slots(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TestRide[];
}

export async function updateTestRideStatus(
  id: string,
  updates: { status?: TestRideStatus; internal_notes?: string | null; assigned_to?: string | null }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row = s.testRides.find((t) => t.id === id);
    if (!row) throw new Error('Test ride not found');
    Object.assign(row, updates);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('test_rides').update(updates).eq('id', id);
  if (error) throw error;
}
