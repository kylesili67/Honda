import { generateHumanNumber } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  ServiceAppointment,
  ServiceAppointmentStatus,
  ServiceHistory,
  ServiceType,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';
import { checkSlotAvailability } from './testRides';

export async function createServiceAppointment(input: {
  user_id: string;
  branch_id: string;
  slot_id: string;
  service_date: string;
  model_name: string;
  registration_number: string;
  service_type: ServiceType;
  description?: string | null;
}): Promise<ServiceAppointment> {
  const number = generateHumanNumber('SV');

  if (!isSupabaseConfigured || !supabase) {
    const avail = await checkSlotAvailability(input.branch_id, 'service', input.service_date);
    const chosen = avail.find((a) => a.id === input.slot_id);
    if (!chosen || chosen.remaining <= 0) {
      throw new Error('Selected service bay slot is full. Please choose another slot.');
    }

    const s = getDemoState();
    const row: ServiceAppointment = {
      id: uid('sv'),
      service_number: number,
      user_id: input.user_id,
      branch_id: input.branch_id,
      slot_id: input.slot_id,
      service_date: input.service_date,
      model_name: input.model_name,
      registration_number: input.registration_number.toUpperCase(),
      service_type: input.service_type,
      description: input.description ?? null,
      status: 'requested',
      internal_notes: null,
      assigned_to: null,
      created_at: new Date().toISOString(),
    };
    s.serviceAppointments.unshift(row);
    saveDemoState();
    return enrichDemoService(row);
  }

  const { data, error } = await supabase
    .from('service_appointments')
    .insert({
      service_number: number,
      user_id: input.user_id,
      branch_id: input.branch_id,
      slot_id: input.slot_id,
      service_date: input.service_date,
      model_name: input.model_name,
      registration_number: input.registration_number.toUpperCase(),
      service_type: input.service_type,
      description: input.description ?? null,
      status: 'requested',
    })
    .select('*, branch:branches(*), slot:time_slots(*)')
    .single();
  if (error) throw error;
  return data as ServiceAppointment;
}

function enrichDemoService(sv: ServiceAppointment): ServiceAppointment {
  const s = getDemoState();
  return {
    ...sv,
    branch: s.branches.find((b) => b.id === sv.branch_id),
    slot: s.timeSlots.find((sl) => sl.id === sv.slot_id),
  };
}

export async function listMyServiceAppointments(userId: string): Promise<ServiceAppointment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .serviceAppointments.filter((sv) => sv.user_id === userId)
      .map(enrichDemoService);
  }
  const { data, error } = await supabase
    .from('service_appointments')
    .select('*, branch:branches(*), slot:time_slots(*)')
    .eq('user_id', userId)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceAppointment[];
}

export async function listMyServiceHistory(userId: string): Promise<ServiceHistory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .serviceHistory.filter((h) => h.user_id === userId)
      .sort((a, b) => b.service_date.localeCompare(a.service_date));
  }
  const { data, error } = await supabase
    .from('service_history')
    .select('*')
    .eq('user_id', userId)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceHistory[];
}

export async function listAllServiceAppointmentsAdmin(): Promise<ServiceAppointment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().serviceAppointments.map(enrichDemoService);
  }
  const { data, error } = await supabase
    .from('service_appointments')
    .select('*, branch:branches(*), slot:time_slots(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceAppointment[];
}

export async function updateServiceAppointmentAdmin(
  id: string,
  updates: {
    status?: ServiceAppointmentStatus;
    internal_notes?: string | null;
    assigned_to?: string | null;
  }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row = s.serviceAppointments.find((sv) => sv.id === id);
    if (!row) throw new Error('Service appointment not found');
    Object.assign(row, updates);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('service_appointments').update(updates).eq('id', id);
  if (error) throw error;
}

export async function addServiceHistoryEntry(
  input: Omit<ServiceHistory, 'id' | 'created_at'>
): Promise<ServiceHistory> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row: ServiceHistory = {
      ...input,
      id: uid('sh'),
      created_at: new Date().toISOString(),
    };
    s.serviceHistory.unshift(row);
    saveDemoState();
    return row;
  }
  const { data, error } = await supabase
    .from('service_history')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as ServiceHistory;
}
