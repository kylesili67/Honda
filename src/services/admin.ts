import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  AuditLogEntry,
  Coupon,
  CustomerAddress,
  DeliveryZone,
  EmiPlan,
  Profile,
  TimeSlot,
  UserRole,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().addresses.filter((a) => a.user_id === userId);
  }
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerAddress[];
}

export async function saveCustomerAddress(
  address: Omit<CustomerAddress, 'id'> & { id?: string }
): Promise<CustomerAddress> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (address.is_default) {
      s.addresses.forEach((a) => {
        if (a.user_id === address.user_id) a.is_default = false;
      });
    }
    if (address.id) {
      const idx = s.addresses.findIndex((a) => a.id === address.id);
      if (idx === -1) throw new Error('Address not found');
      s.addresses[idx] = { ...address, id: address.id } as CustomerAddress;
      saveDemoState();
      return s.addresses[idx];
    }
    const created: CustomerAddress = { ...address, id: uid('addr') };
    s.addresses.unshift(created);
    saveDemoState();
    return created;
  }
  if (address.is_default) {
    const { error: resetErr } = await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('user_id', address.user_id);
    if (resetErr) throw resetErr;
  }
  const { data, error } = await supabase
    .from('customer_addresses')
    .upsert(address)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomerAddress;
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.addresses = s.addresses.filter((a) => a.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
  if (error) throw error;
}

export async function listCustomersAdmin(): Promise<Array<Profile & { roles: UserRole[] }>> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().users.map((u) => ({ ...u.profile, roles: u.roles }));
  }
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
  if (rolesError) throw rolesError;
  const roleRows = (roles ?? []) as Array<{ user_id: string; role: UserRole }>;
  return ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    roles: roleRows.filter((r) => r.user_id === p.id).map((r) => r.role),
  }));
}

export async function updateCustomerNotesAdmin(userId: string, notes: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const u = s.users.find((x) => x.id === userId);
    if (!u) throw new Error('Customer not found');
    u.profile.notes = notes;
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('profiles').update({ notes }).eq('id', userId);
  if (error) throw error;
}

export async function assignStaffRoleAdmin(
  userId: string,
  roleOrRoles: UserRole | UserRole[],
  actorId: string
): Promise<void> {
  if (userId === actorId) {
    throw new Error('You cannot modify your own role assignment.');
  }
  const nextRoles = Array.from(new Set(Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]));
  if (nextRoles.length === 0) {
    throw new Error('At least one role must be selected.');
  }

  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const u = s.users.find((x) => x.id === userId);
    if (!u) throw new Error('User not found');
    const prev = [...u.roles];
    u.roles = nextRoles;
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: actorId,
      action: 'role_assigned',
      entity_type: 'user_roles',
      entity_id: userId,
      old_data: { roles: prev },
      new_data: { roles: nextRoles },
      ip: null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return;
  }

  const { data: existingRows, error: fetchErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (fetchErr) throw fetchErr;
  const prevRoles = ((existingRows ?? []) as Array<{ role: UserRole }>).map((r) => r.role);

  // Upsert desired roles first so the user is never left without a role if insert fails
  const { error: upsertErr } = await supabase
    .from('user_roles')
    .upsert(
      nextRoles.map((role) => ({ user_id: userId, role })),
      { onConflict: 'user_id,role' }
    );
  if (upsertErr) throw upsertErr;

  const toRemove = prevRoles.filter((r) => !nextRoles.includes(r));
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role', toRemove);
    if (delErr) throw delErr;
  }

  const { error: auditErr } = await supabase.from('audit_log').insert({
    actor_id: actorId,
    action: 'role_assigned',
    entity_type: 'user_roles',
    entity_id: userId,
    old_data: { roles: prevRoles },
    new_data: { roles: nextRoles },
  });
  if (auditErr) throw auditErr;
}

export async function listAuditLogAdmin(): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().auditLog;
  }
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}

export async function listCouponsAdmin(): Promise<Coupon[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().coupons;
  }
  const { data, error } = await supabase.from('coupons').select('*').order('code');
  if (error) throw error;
  return (data ?? []) as Coupon[];
}

export async function saveCouponAdmin(coupon: Partial<Coupon> & { code: string }): Promise<Coupon> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (coupon.id) {
      const idx = s.coupons.findIndex((c) => c.id === coupon.id);
      if (idx === -1) throw new Error('Coupon not found');
      s.coupons[idx] = { ...s.coupons[idx], ...coupon } as Coupon;
      saveDemoState();
      return s.coupons[idx];
    }
    const created: Coupon = {
      id: uid('cp'),
      code: coupon.code.toUpperCase(),
      discount_type: coupon.discount_type ?? 'percent',
      discount_value: coupon.discount_value ?? 10,
      min_order_amount: coupon.min_order_amount ?? 0,
      max_uses: coupon.max_uses ?? null,
      used_count: coupon.used_count ?? 0,
      starts_at: coupon.starts_at ?? null,
      ends_at: coupon.ends_at ?? null,
      is_active: coupon.is_active ?? true,
    };
    s.coupons.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('coupons').upsert(coupon).select('*').single();
  if (error) throw error;
  return data as Coupon;
}

export async function deleteCouponAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.coupons = s.coupons.filter((c) => c.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw error;
}

export async function saveDeliveryZoneAdmin(
  zone: Partial<DeliveryZone> & { name: string }
): Promise<DeliveryZone> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (zone.id) {
      const idx = s.deliveryZones.findIndex((z) => z.id === zone.id);
      if (idx === -1) throw new Error('Delivery zone not found');
      s.deliveryZones[idx] = { ...s.deliveryZones[idx], ...zone } as DeliveryZone;
      saveDemoState();
      return s.deliveryZones[idx];
    }
    const created: DeliveryZone = {
      id: uid('dz'),
      name: zone.name,
      cities: zone.cities ?? [],
      charge: zone.charge ?? 500,
      free_above: zone.free_above ?? null,
      estimated_days: zone.estimated_days ?? '2–4 working days',
      is_active: zone.is_active ?? true,
    };
    s.deliveryZones.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('delivery_zones').upsert(zone).select('*').single();
  if (error) throw error;
  return data as DeliveryZone;
}

export async function deleteDeliveryZoneAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.deliveryZones = s.deliveryZones.filter((z) => z.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) throw error;
}

export async function listTimeSlotsAdmin(): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().timeSlots;
  }
  const { data, error } = await supabase.from('time_slots').select('*').order('start_time');
  if (error) throw error;
  return (data ?? []) as TimeSlot[];
}

export async function saveEmiPlanAdmin(plan: Partial<EmiPlan> & { name: string }): Promise<EmiPlan> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (plan.id) {
      const idx = s.emiPlans.findIndex((p) => p.id === plan.id);
      if (idx === -1) throw new Error('EMI plan not found');
      s.emiPlans[idx] = { ...s.emiPlans[idx], ...plan } as EmiPlan;
      saveDemoState();
      return s.emiPlans[idx];
    }
    const created: EmiPlan = {
      id: uid('emi'),
      name: plan.name,
      tenure_months: plan.tenure_months ?? 12,
      markup_rate_percent_per_year: plan.markup_rate_percent_per_year ?? 14,
      min_down_payment_percent: plan.min_down_payment_percent ?? 25,
      is_active: plan.is_active ?? true,
    };
    s.emiPlans.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('emi_plans').upsert(plan).select('*').single();
  if (error) throw error;
  return data as EmiPlan;
}
