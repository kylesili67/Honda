import { generateHumanNumber } from '../lib/format';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type {
  Coupon,
  DeliveryZone,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  ReturnRequest,
  ReturnStatus,
} from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listDeliveryZones(): Promise<DeliveryZone[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().deliveryZones.filter((z) => z.is_active);
  }
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as DeliveryZone[];
}

export async function validateCoupon(code: string, subtotal: number): Promise<Coupon> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Enter a coupon code');

  if (!isSupabaseConfigured || !supabase) {
    const c = getDemoState().coupons.find(
      (cp) => cp.code.toUpperCase() === cleanCode && cp.is_active
    );
    if (!c) throw new Error('Invalid or expired coupon code');
    if (subtotal < c.min_order_amount) {
      throw new Error(`Minimum order of PKR ${c.min_order_amount.toLocaleString()} required`);
    }
    if (c.max_uses && c.used_count >= c.max_uses) {
      throw new Error('Coupon usage limit reached');
    }
    return c;
  }

  const { data, error } = await supabase.rpc('apply_coupon', {
    p_code: cleanCode,
    p_subtotal: subtotal,
  });
  if (error) throw error;
  if (!data) throw new Error('Invalid coupon');
  return data as Coupon;
}

export interface CreateOrderInput {
  user_id: string;
  items: Array<{
    variant_id: string;
    name_snapshot: string;
    sku_snapshot: string;
    unit_price: number;
    quantity: number;
  }>;
  fulfillment: 'delivery' | 'pickup';
  pickup_branch_id?: string | null;
  shipping_name: string;
  shipping_phone: string;
  shipping_address?: string | null;
  shipping_city?: string | null;
  delivery_zone_id?: string | null;
  delivery_charge: number;
  coupon_id?: string | null;
  discount_amount: number;
  loyalty_points_used: number;
  loyalty_discount: number;
  payment_method: PaymentMethod;
  proof_path?: string | null;
  notes?: string | null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.items.length === 0) throw new Error('Cart is empty');
  const subtotal = input.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const total = Math.max(
    0,
    subtotal + input.delivery_charge - input.discount_amount - input.loyalty_discount
  );

  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const now = new Date().toISOString();
    const orderId = uid('ord');
    const orderNumber = generateHumanNumber('OD');

    if (input.payment_method === 'cod' && total > s.settings.cod_max_amount) {
      throw new Error(`COD is available for orders up to PKR ${s.settings.cod_max_amount.toLocaleString()}`);
    }

    const orderItems: OrderItem[] = input.items.map((i) => ({
      id: uid('oi'),
      order_id: orderId,
      variant_id: i.variant_id,
      name_snapshot: i.name_snapshot,
      sku_snapshot: i.sku_snapshot,
      unit_price: i.unit_price,
      quantity: i.quantity,
      line_total: i.unit_price * i.quantity,
    }));

    const order: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: input.user_id,
      status: 'pending',
      fulfillment: input.fulfillment,
      pickup_branch_id: input.pickup_branch_id ?? null,
      shipping_name: input.shipping_name,
      shipping_phone: input.shipping_phone,
      shipping_address: input.shipping_address ?? null,
      shipping_city: input.shipping_city ?? null,
      delivery_zone_id: input.delivery_zone_id ?? null,
      subtotal,
      delivery_charge: input.delivery_charge,
      discount_amount: input.discount_amount,
      loyalty_points_used: input.loyalty_points_used,
      loyalty_discount: input.loyalty_discount,
      total,
      coupon_id: input.coupon_id ?? null,
      payment_method: input.payment_method,
      payment_status: 'pending',
      courier_name: null,
      tracking_number: null,
      notes: input.notes ?? null,
      internal_notes: null,
      created_at: now,
      updated_at: now,
      items: orderItems,
    };

    s.orders.unshift(order);
    s.payments.unshift({
      id: uid('pay'),
      payable_type: 'order',
      payable_id: orderId,
      method: input.payment_method,
      amount: total,
      status: 'pending',
      proof_path: input.proof_path ?? null,
      gateway_reference: null,
      gateway_payload: null,
      verified_by: null,
      verified_at: null,
      created_at: now,
    });

    if (input.loyalty_points_used > 0) {
      const user = s.users.find((u) => u.id === input.user_id);
      if (user) {
        user.profile.loyalty_balance = Math.max(
          0,
          user.profile.loyalty_balance - input.loyalty_points_used
        );
      }
      s.loyaltyLedger.unshift({
        id: uid('ll'),
        user_id: input.user_id,
        points: -input.loyalty_points_used,
        reason: 'redeem',
        reference_type: 'order',
        reference_id: orderId,
        note: `Redeemed on order ${orderNumber}`,
        created_by: input.user_id,
        created_at: now,
      });
    }

    saveDemoState();
    return order;
  }

  const { data, error } = await supabase.rpc('create_order', {
    p_items: input.items,
    p_fulfillment: input.fulfillment,
    p_pickup_branch_id: input.pickup_branch_id ?? null,
    p_shipping_name: input.shipping_name,
    p_shipping_phone: input.shipping_phone,
    p_shipping_address: input.shipping_address ?? null,
    p_shipping_city: input.shipping_city ?? null,
    p_delivery_zone_id: input.delivery_zone_id ?? null,
    p_coupon_id: input.coupon_id ?? null,
    p_loyalty_points_used: input.loyalty_points_used,
    p_payment_method: input.payment_method,
    p_proof_path: input.proof_path ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) throw error;
  const orderNumber = typeof data === 'string' ? data : (data as { order_number: string }).order_number;
  const created = await getOrderByNumber(orderNumber);
  if (!created) throw new Error('Order created but could not reload details');
  return created;
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().orders.filter((o) => o.user_id === userId);
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().orders.find((o) => o.order_number === orderNumber) ?? null;
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().orders.find((o) => o.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

export async function listAllOrdersAdmin(): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().orders;
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function updateOrderAdmin(
  id: string,
  updates: {
    status?: OrderStatus;
    courier_name?: string | null;
    tracking_number?: string | null;
    internal_notes?: string | null;
  },
  actorId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const order = s.orders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');
    const prevStatus = order.status;

    if (updates.status === 'confirmed' && prevStatus === 'pending') {
      for (const item of order.items ?? []) {
        for (const acc of s.accessories) {
          const v = (acc.variants ?? []).find((x) => x.id === item.variant_id);
          if (v) v.stock_quantity = Math.max(0, v.stock_quantity - item.quantity);
        }
      }
    }

    Object.assign(order, updates, { updated_at: new Date().toISOString() });
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: actorId,
      action: 'order_updated',
      entity_type: 'orders',
      entity_id: id,
      old_data: { status: prevStatus },
      new_data: updates as Record<string, unknown>,
      ip: null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return;
  }

  const { error } = await supabase.from('orders').update(updates).eq('id', id);
  if (error) throw error;
}

export async function createReturnRequest(input: {
  order_id: string;
  user_id: string;
  type: 'return' | 'exchange';
  reason: string;
  details: string;
  item_ids: string[];
  photo_paths: string[];
}): Promise<ReturnRequest> {
  const returnNumber = generateHumanNumber('RT');
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const row: ReturnRequest = {
      id: uid('ret'),
      return_number: returnNumber,
      order_id: input.order_id,
      user_id: input.user_id,
      type: input.type,
      reason: input.reason,
      details: input.details,
      item_ids: input.item_ids,
      photo_paths: input.photo_paths,
      status: 'requested',
      admin_note: null,
      created_at: new Date().toISOString(),
      order: s.orders.find((o) => o.id === input.order_id),
    };
    s.returns.unshift(row);
    saveDemoState();
    return row;
  }

  const { data, error } = await supabase
    .from('returns')
    .insert({
      return_number: returnNumber,
      ...input,
      status: 'requested',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ReturnRequest;
}

export async function listAllReturnsAdmin(): Promise<ReturnRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    return s.returns.map((r) => ({ ...r, order: s.orders.find((o) => o.id === r.order_id) }));
  }
  const { data, error } = await supabase
    .from('returns')
    .select('*, order:orders(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReturnRequest[];
}

export async function updateReturnAdmin(
  id: string,
  updates: { status?: ReturnStatus; admin_note?: string | null }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const r = s.returns.find((x) => x.id === id);
    if (!r) throw new Error('Return request not found');
    Object.assign(r, updates);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('returns').update(updates).eq('id', id);
  if (error) throw error;
}
