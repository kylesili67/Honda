export type UserRole =
  | 'customer'
  | 'super_admin'
  | 'manager'
  | 'sales_staff'
  | 'service_staff'
  | 'content_editor'
  | 'accountant';

export type PublishStatus = 'draft' | 'published' | 'archived';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'converted_to_sale'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export type RegistrationStep =
  | 'booked'
  | 'payment_confirmed'
  | 'documents_submitted'
  | 'registration_in_process'
  | 'number_plate_ready'
  | 'ready_for_delivery'
  | 'delivered';

export type TestRideStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type InquiryStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'closed_won'
  | 'closed_lost';

export type TradeInStatus =
  | 'new'
  | 'valued'
  | 'accepted'
  | 'declined'
  | 'closed';

export type ServiceType =
  | 'free_service'
  | 'regular_service'
  | 'repair'
  | 'warranty_claim'
  | 'other';

export type ServiceAppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa';
export type BookingPaymentMethod = 'bank_transfer' | 'jazzcash' | 'easypaisa';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'refunded'
  | 'exchanged';

export type LoyaltyReason =
  | 'order_earn'
  | 'service_earn'
  | 'redeem'
  | 'admin_adjust'
  | 'expiry';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
  loyalty_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  user_id: string;
  role: UserRole;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Record<string, string> | null;
  is_active: boolean;
  sort_order: number;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string | null;
  is_default: boolean;
}

export interface BikeCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface BikeModel {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  tagline: string | null;
  description: string | null;
  engine_cc: number;
  is_featured: boolean;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  category?: BikeCategory;
  variants?: BikeVariant[];
  colors?: BikeColor[];
  images?: BikeImage[];
  stock?: BikeStock[];
}

export interface BikeVariant {
  id: string;
  model_id: string;
  name: string;
  sku: string;
  ex_showroom_price: number;
  engine_type: string | null;
  displacement_cc: number | null;
  max_power: string | null;
  max_torque: string | null;
  mileage_kmpl: number | null;
  fuel_tank_l: number | null;
  kerb_weight_kg: number | null;
  seat_height_mm: number | null;
  ground_clearance_mm: number | null;
  front_brake: string | null;
  rear_brake: string | null;
  front_tyre: string | null;
  rear_tyre: string | null;
  starting: string | null;
  transmission: string | null;
  features: string[];
  specs: Array<{ label: string; value: string }>;
  warranty_note: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface BikeColor {
  id: string;
  model_id: string;
  name: string;
  hex_code: string;
  sort_order: number;
}

export interface BikeImage {
  id: string;
  model_id: string;
  color_id: string | null;
  url: string;
  storage_path: string | null;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export interface BikePriceHistory {
  id: string;
  variant_id: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  changed_at: string;
}

export interface BikeStock {
  id: string;
  variant_id: string;
  color_id: string;
  branch_id: string;
  quantity: number;
  reserved: number;
}

export interface EmiPlan {
  id: string;
  name: string;
  tenure_months: number;
  markup_rate_percent_per_year: number;
  min_down_payment_percent: number;
  is_active: boolean;
}

export interface Booking {
  id: string;
  booking_number: string;
  user_id: string;
  variant_id: string;
  color_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  token_amount: number;
  status: BookingStatus;
  payment_method: BookingPaymentMethod;
  notes: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  hold_expires_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
  variant?: BikeVariant & { model?: BikeModel };
  color?: BikeColor;
  branch?: Branch;
  registration_progress?: RegistrationProgress;
  payment?: Payment;
}

export interface RegistrationStepHistoryItem {
  step: RegistrationStep;
  at: string;
  note?: string;
}

export interface RegistrationProgress {
  id: string;
  booking_id: string;
  current_step: RegistrationStep;
  step_history: RegistrationStepHistoryItem[];
  updated_by: string | null;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  branch_id: string;
  slot_type: 'test_ride' | 'service';
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
}

export interface SlotAvailability extends TimeSlot {
  booked_count: number;
  remaining: number;
}

export interface TestRide {
  id: string;
  test_ride_number: string;
  user_id: string | null;
  model_id: string;
  variant_id: string | null;
  branch_id: string;
  ride_date: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: TestRideStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  model?: BikeModel;
  branch?: Branch;
  slot?: TimeSlot;
}

export interface Inquiry {
  id: string;
  user_id: string | null;
  model_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  preferred_contact_time: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: InquiryStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  model?: BikeModel;
}

export interface TradeInRequest {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  current_make: string;
  current_model: string;
  year: number;
  mileage_km: number;
  condition: string;
  registration_city: string;
  expected_price: number;
  photo_paths: string[];
  interested_model_id: string | null;
  status: TradeInStatus;
  valuation_amount: number | null;
  valuation_note: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  interested_model?: BikeModel;
}

export interface ServiceAppointment {
  id: string;
  service_number: string;
  user_id: string;
  branch_id: string;
  slot_id: string;
  service_date: string;
  model_name: string;
  registration_number: string;
  service_type: ServiceType;
  description: string | null;
  status: ServiceAppointmentStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  branch?: Branch;
  slot?: TimeSlot;
}

export interface ServiceHistory {
  id: string;
  user_id: string;
  appointment_id: string | null;
  registration_number: string;
  model_name: string;
  service_date: string;
  odometer_km: number;
  work_done: string;
  parts_used: string | null;
  cost: number;
  created_by: string | null;
  created_at: string;
}

export interface AccessoryCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Accessory {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  description: string | null;
  brand: string | null;
  base_price: number;
  compare_at_price: number | null;
  status: PublishStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  category?: AccessoryCategory;
  variants?: AccessoryVariant[];
  images?: AccessoryImage[];
  compatible_model_ids?: string[];
}

export interface AccessoryVariant {
  id: string;
  accessory_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface AccessoryImage {
  id: string;
  accessory_id: string;
  url: string;
  storage_path: string | null;
  alt_text: string;
  sort_order: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  cities: string[];
  charge: number;
  free_above: number | null;
  estimated_days: string;
  is_active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  fulfillment: 'delivery' | 'pickup';
  pickup_branch_id: string | null;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string | null;
  shipping_city: string | null;
  delivery_zone_id: string | null;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  loyalty_points_used: number;
  loyalty_discount: number;
  total: number;
  coupon_id: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  courier_name: string | null;
  tracking_number: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payment?: Payment;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  name_snapshot: string;
  sku_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface ReturnRequest {
  id: string;
  return_number: string;
  order_id: string;
  user_id: string;
  type: 'return' | 'exchange';
  reason: string;
  details: string | null;
  item_ids: string[];
  photo_paths: string[];
  status: ReturnStatus;
  admin_note: string | null;
  created_at: string;
  order?: Order;
}

export interface Payment {
  id: string;
  payable_type: 'booking' | 'order';
  payable_id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  proof_path: string | null;
  gateway_reference: string | null;
  gateway_payload: Record<string, unknown> | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  processed_by: string;
  processed_at: string;
  reference: string | null;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  model_id: string | null;
  accessory_id: string | null;
  created_at: string;
  model?: BikeModel;
  accessory?: Accessory;
}

export interface SavedComparison {
  id: string;
  user_id: string;
  model_ids: string[];
  name: string;
  created_at: string;
}

export interface LoyaltyLedgerEntry {
  id: string;
  user_id: string;
  points: number;
  reason: LoyaltyReason;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  cta_url: string | null;
  placement: 'home_hero' | 'home_secondary' | 'store';
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  applies_to: 'bikes' | 'accessories' | 'service' | 'all';
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content_markdown: string;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  image_url: string | null;
  published_at: string;
  is_published: boolean;
  created_at: string;
}

export interface SiteSettingsMap {
  brand_name: string;
  brand_subtitle?: string;
  legal_business_name: string;
  logo_url: string;
  contact_phone: string;
  contact_email: string;
  whatsapp_number: string;
  social_links: { facebook?: string; instagram?: string; youtube?: string; tiktok?: string };
  bank_details: {
    bank_name: string;
    account_title: string;
    account_number: string;
    iban: string;
    instructions?: string;
  };
  booking_token_amount: number;
  booking_hold_days: number;
  token_refundable_until_hours: number;
  token_refund_policy_text: string;
  cod_max_amount: number;
  return_window_days: number;
  loyalty_points_per_100_pkr: number;
  loyalty_point_value_pkr: number;
  loyalty_redeem_on_bikes: boolean;
  payment_jazzcash_enabled: boolean;
  payment_easypaisa_enabled: boolean;
  payment_sandbox_mode: boolean;
  tax_rate_percent: number;
  business_hours: string;
  price_disclaimer_text: string;
  emi_disclaimer_text: string;
}

export interface NotificationLogEntry {
  id: string;
  user_id: string | null;
  channel: 'email' | 'sms' | 'whatsapp';
  template: string;
  recipient: string;
  status: 'queued' | 'sent' | 'failed';
  error: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}
