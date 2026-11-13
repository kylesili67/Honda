import type {
  BookingStatus,
  InquiryStatus,
  OrderStatus,
  PaymentStatus,
  RegistrationStep,
  ReturnStatus,
  ServiceAppointmentStatus,
  TestRideStatus,
  TradeInStatus,
  UserRole,
} from '../types/database';

export const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'manager',
  'sales_staff',
  'service_staff',
  'content_editor',
  'accountant',
];

export const ALL_ROLES: UserRole[] = ['customer', ...STAFF_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  super_admin: 'Super Admin',
  manager: 'Manager',
  sales_staff: 'Sales Staff',
  service_staff: 'Service Staff',
  content_editor: 'Content Editor',
  accountant: 'Accountant',
};

export const REGISTRATION_STEPS: Array<{ key: RegistrationStep; label: string; description: string }> = [
  { key: 'booked', label: 'Booked', description: 'Token booking created' },
  { key: 'payment_confirmed', label: 'Payment Confirmed', description: 'Token verified by accounts' },
  { key: 'documents_submitted', label: 'Documents Submitted', description: 'Showroom paperwork submitted' },
  { key: 'registration_in_process', label: 'Registration In Process', description: 'Excise & registration underway' },
  { key: 'number_plate_ready', label: 'Number Plate Ready', description: 'Plate issued & ready' },
  { key: 'ready_for_delivery', label: 'Ready for Delivery', description: 'Pre-delivery inspection complete' },
  { key: 'delivered', label: 'Delivered', description: 'Handed over to rider' },
];

export const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  'pending',
  'confirmed',
  'converted_to_sale',
  'cancelled',
  'refunded',
  'expired',
];

export const TEST_RIDE_STATUS_OPTIONS: TestRideStatus[] = [
  'requested',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

export const INQUIRY_STATUS_OPTIONS: InquiryStatus[] = [
  'new',
  'contacted',
  'qualified',
  'closed_won',
  'closed_lost',
];

export const TRADE_IN_STATUS_OPTIONS: TradeInStatus[] = [
  'new',
  'valued',
  'accepted',
  'declined',
  'closed',
];

export const SERVICE_STATUS_OPTIONS: ServiceAppointmentStatus[] = [
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export const RETURN_STATUS_OPTIONS: ReturnStatus[] = [
  'requested',
  'approved',
  'received',
  'refunded',
  'exchanged',
  'rejected',
];

export type AdminModuleKey =
  | 'dashboard'
  | 'bikes'
  | 'stock'
  | 'accessories'
  | 'bookings'
  | 'inquiries'
  | 'test_rides'
  | 'trade_ins'
  | 'service'
  | 'orders'
  | 'returns'
  | 'payments'
  | 'customers'
  | 'content'
  | 'settings'
  | 'staff'
  | 'audit_log'
  | 'reports';

export function canAccessAdminModule(roles: UserRole[], module: AdminModuleKey): boolean {
  if (roles.includes('super_admin')) return true;
  if (roles.includes('manager')) return module !== 'staff';

  switch (module) {
    case 'dashboard':
      return roles.some((r) => ['sales_staff', 'service_staff', 'accountant'].includes(r));
    case 'bikes':
    case 'stock':
      return roles.some((r) => ['sales_staff', 'accountant'].includes(r));
    case 'accessories':
      return roles.some((r) => ['sales_staff', 'service_staff', 'accountant'].includes(r));
    case 'bookings':
    case 'inquiries':
    case 'test_rides':
    case 'trade_ins':
      return roles.some((r) => ['sales_staff', 'accountant'].includes(r));
    case 'service':
      return roles.some((r) => ['service_staff', 'accountant'].includes(r));
    case 'orders':
    case 'returns':
      return roles.some((r) => ['sales_staff', 'accountant'].includes(r));
    case 'payments':
    case 'audit_log':
      return roles.includes('accountant');
    case 'customers':
      return roles.some((r) => ['sales_staff', 'service_staff'].includes(r));
    case 'content':
      return roles.includes('content_editor');
    case 'reports':
      return roles.some((r) => ['sales_staff', 'service_staff', 'accountant'].includes(r));
    case 'settings':
    case 'staff':
      return false;
    default:
      return false;
  }
}

export function canWriteAdminModule(roles: UserRole[], module: AdminModuleKey): boolean {
  if (roles.includes('super_admin')) return true;
  if (roles.includes('manager')) return !['staff', 'settings'].includes(module);

  switch (module) {
    case 'bookings':
    case 'inquiries':
    case 'test_rides':
    case 'trade_ins':
      return roles.includes('sales_staff');
    case 'service':
      return roles.includes('service_staff');
    case 'payments':
      return roles.includes('accountant');
    case 'content':
      return roles.includes('content_editor');
    case 'reports':
      return roles.includes('accountant');
    default:
      return false;
  }
}

export const SPLASH_CONFIG = {
  STORAGE_KEY: 'honda_splash_seen',
  TAGLINE: 'Ride Your Dream',
  TIMELINE_END_MS: 2800,
  EXIT_DURATION_MS: 600,
  MAX_DURATION_MS: 3500,
  REDUCED_MOTION_DURATION_MS: 800,
  REDUCED_MOTION_EXIT_MS: 250,
} as const;

