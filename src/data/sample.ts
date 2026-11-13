import { MEDIA } from '../assets/media';
import type {
  Accessory,
  AccessoryCategory,
  AuditLogEntry,
  Banner,
  BikeCategory,
  BikeModel,
  BikePriceHistory,
  Booking,
  Branch,
  Coupon,
  CustomerAddress,
  DeliveryZone,
  EmiPlan,
  FAQ,
  Inquiry,
  LoyaltyLedgerEntry,
  NewsPost,
  Offer,
  Order,
  Payment,
  Profile,
  Refund,
  ReturnRequest,
  SavedComparison,
  ServiceAppointment,
  ServiceHistory,
  SiteSettingsMap,
  StaticPage,
  TestRide,
  TimeSlot,
  TradeInRequest,
  UserRole,
  WishlistItem,
} from '../types/database';

/**
 * Clearly labeled placeholder / sample dataset used ONLY when Supabase env vars
 * are not configured, allowing full interactive UI preview without crashing.
 */

export const SAMPLE_SETTINGS: SiteSettingsMap = {
  brand_name: 'Honda',
  brand_subtitle: 'SHOWROOM',
  legal_business_name: 'Capital Motors Showroom (Placeholder)',
  logo_url: '',
  contact_phone: '+92 51 111 000 000',
  contact_email: 'showroom@example.pk',
  whatsapp_number: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '923000000000',
  social_links: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    tiktok: 'https://tiktok.com',
  },
  bank_details: {
    bank_name: 'Sample Bank Limited',
    account_title: 'Capital Motors Showroom',
    account_number: '0000-0000000000',
    iban: 'PK00SAMP0000000000000000',
    instructions: 'Transfer the booking or order total and upload a clear receipt screenshot or PDF.',
  },
  booking_token_amount: 15000,
  booking_hold_days: 7,
  token_refundable_until_hours: 48,
  token_refund_policy_text:
    'Booking tokens are refundable if cancelled at least 48 hours prior to hold expiry. Processed via bank transfer within 5–7 working days.',
  cod_max_amount: 35000,
  return_window_days: 7,
  loyalty_points_per_100_pkr: 1,
  loyalty_point_value_pkr: 2,
  loyalty_redeem_on_bikes: false,
  payment_jazzcash_enabled: false,
  payment_easypaisa_enabled: false,
  payment_sandbox_mode: true,
  tax_rate_percent: 0,
  business_hours: 'Mon – Sat: 9:30 AM – 7:30 PM',
  price_disclaimer_text:
    'Prices are ex-showroom placeholder estimates and may change without prior notice. Final price is confirmed at the showroom.',
  emi_disclaimer_text:
    'Estimate only. Monthly installments and markup rates are indicative; final terms are determined by the financing bank.',
};

export const SAMPLE_BRANCHES: Branch[] = [
  {
    id: 'br-1',
    name: 'Main Showroom — Islamabad Blue Area (Placeholder)',
    slug: 'main-showroom-islamabad',
    address: 'Plot 14, Jinnah Avenue, Blue Area, Islamabad',
    city: 'Islamabad',
    phone: '+92 51 111 000 001',
    whatsapp: '923000000001',
    email: 'islamabad@example.pk',
    latitude: 33.7077,
    longitude: 73.0561,
    opening_hours: {
      'Mon – Fri': '9:30 AM – 7:30 PM',
      Saturday: '10:00 AM – 6:30 PM',
      Sunday: 'Closed',
    },
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'br-2',
    name: 'Lahore Gulberg Showroom & Service (Placeholder)',
    slug: 'lahore-gulberg',
    address: 'Main Boulevard, Gulberg III, Lahore',
    city: 'Lahore',
    phone: '+92 42 111 000 002',
    whatsapp: '923000000002',
    email: 'lahore@example.pk',
    latitude: 31.5102,
    longitude: 74.3441,
    opening_hours: {
      'Mon – Sat': '9:30 AM – 7:30 PM',
      Sunday: 'Closed',
    },
    is_active: true,
    sort_order: 2,
  },
];

export const SAMPLE_BIKE_CATEGORIES: BikeCategory[] = [
  { id: 'cat-commuter', name: 'Commuter', slug: 'commuter', sort_order: 1, is_active: true },
  { id: 'cat-midrange', name: 'Mid-Range', slug: 'mid-range', sort_order: 2, is_active: true },
  { id: 'cat-performance', name: 'Performance', slug: 'performance', sort_order: 3, is_active: true },
];

export const SAMPLE_BIKES: BikeModel[] = [
  {
    id: 'bike-cd70',
    slug: 'city-commuter-70',
    name: 'City Commuter 70 (Placeholder)',
    category_id: 'cat-commuter',
    tagline: 'Daily fuel efficiency engineered for urban routes',
    description:
      'Sample placeholder specification for a lightweight 70cc daily commuter motorcycle. Admin can update all prices, specs, colors, and photography directly from the Admin Panel.',
    engine_cc: 72,
    is_featured: true,
    status: 'published',
    seo_title: 'City Commuter 70 Price & Specs | Honda Showroom',
    seo_description: 'Explore City Commuter 70 placeholder price, fuel mileage, colors, and installment estimates.',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
    category: SAMPLE_BIKE_CATEGORIES[0],
    colors: [
      { id: 'col-70-red', model_id: 'bike-cd70', name: 'Crimson Red', hex_code: '#C4161C', sort_order: 1 },
      { id: 'col-70-blk', model_id: 'bike-cd70', name: 'Jet Black', hex_code: '#18191B', sort_order: 2 },
    ],
    images: [
      {
        id: 'img-70-1',
        model_id: 'bike-cd70',
        color_id: 'col-70-red',
        url: MEDIA.bikeCommuter70,
        storage_path: null,
        alt_text: 'City Commuter 70 studio side profile in Crimson Red',
        sort_order: 1,
        is_primary: true,
      },
      {
        id: 'img-70-2',
        model_id: 'bike-cd70',
        color_id: 'col-70-blk',
        url: MEDIA.bikeCommuter70,
        storage_path: null,
        alt_text: 'City Commuter 70 studio profile',
        sort_order: 2,
        is_primary: false,
      },
    ],
    variants: [
      {
        id: 'var-70-std',
        model_id: 'bike-cd70',
        name: 'Standard Kick Start',
        sku: 'CC70-STD-2026',
        ex_showroom_price: 157900,
        engine_type: '4-Stroke OHC Air-Cooled Single Cylinder',
        displacement_cc: 72,
        max_power: '5.5 HP @ 7,500 rpm',
        max_torque: '5.4 Nm @ 6,000 rpm',
        mileage_kmpl: 55,
        fuel_tank_l: 8.5,
        kerb_weight_kg: 82,
        seat_height_mm: 770,
        ground_clearance_mm: 135,
        front_brake: 'Mechanical Drum 110mm',
        rear_brake: 'Mechanical Drum 110mm',
        front_tyre: '2.25 - 17',
        rear_tyre: '2.50 - 17',
        starting: 'Kick Start',
        transmission: '4-Speed Constant Mesh',
        features: ['Tubular backbone frame', 'Long-travel telescopic front fork', 'Chrome muffler guard'],
        specs: [
          { label: 'Bore & Stroke', value: '47.0 x 41.4 mm' },
          { label: 'Compression Ratio', value: '8.8 : 1' },
        ],
        warranty_note: '3 Years / 36,000 km Engine Warranty (Placeholder)',
        is_active: true,
        sort_order: 1,
      },
    ],
    stock: [
      { id: 'stk-70-1', variant_id: 'var-70-std', color_id: 'col-70-red', branch_id: 'br-1', quantity: 12, reserved: 2 },
      { id: 'stk-70-2', variant_id: 'var-70-std', color_id: 'col-70-blk', branch_id: 'br-1', quantity: 8, reserved: 1 },
      { id: 'stk-70-3', variant_id: 'var-70-std', color_id: 'col-70-red', branch_id: 'br-2', quantity: 6, reserved: 0 },
    ],
  },
  {
    id: 'bike-cg125',
    slug: 'street-125-se',
    name: 'Street 125 SE (Placeholder)',
    category_id: 'cat-midrange',
    tagline: 'Balanced torque and refined highway poise',
    description:
      'Sample placeholder 125cc street commuter available in Standard and Self-Start editions. All pricing, stock quantities, and technical specifications are admin-managed.',
    engine_cc: 124,
    is_featured: true,
    status: 'published',
    seo_title: 'Street 125 SE Price & Specs | Honda Showroom',
    seo_description: 'Compare Street 125 SE variants, colors, and monthly installment plans.',
    created_at: '2026-01-12T08:00:00Z',
    updated_at: '2026-01-12T08:00:00Z',
    category: SAMPLE_BIKE_CATEGORIES[1],
    colors: [
      { id: 'col-125-char', model_id: 'bike-cg125', name: 'Graphite Charcoal', hex_code: '#2D3035', sort_order: 1 },
      { id: 'col-125-red', model_id: 'bike-cg125', name: 'Racing Red', hex_code: '#D71920', sort_order: 2 },
    ],
    images: [
      {
        id: 'img-125-1',
        model_id: 'bike-cg125',
        color_id: 'col-125-char',
        url: MEDIA.bikeMidrange125,
        storage_path: null,
        alt_text: 'Street 125 SE three-quarter studio view in Graphite Charcoal',
        sort_order: 1,
        is_primary: true,
      },
      {
        id: 'img-125-2',
        model_id: 'bike-cg125',
        color_id: 'col-125-red',
        url: MEDIA.bikeMidrange125,
        storage_path: null,
        alt_text: 'Street 125 SE studio angle',
        sort_order: 2,
        is_primary: false,
      },
    ],
    variants: [
      {
        id: 'var-125-std',
        model_id: 'bike-cg125',
        name: 'Standard 4-Speed',
        sku: 'ST125-STD-2026',
        ex_showroom_price: 234900,
        engine_type: '4-Stroke OHV Air-Cooled',
        displacement_cc: 124,
        max_power: '11.0 HP @ 8,500 rpm',
        max_torque: '10.2 Nm @ 7,000 rpm',
        mileage_kmpl: 42,
        fuel_tank_l: 9.2,
        kerb_weight_kg: 100,
        seat_height_mm: 780,
        ground_clearance_mm: 140,
        front_brake: 'Drum 130mm',
        rear_brake: 'Drum 130mm',
        front_tyre: '2.50 - 18',
        rear_tyre: '3.00 - 17',
        starting: 'Kick Start',
        transmission: '4-Speed Mesh',
        features: ['High-rigidity steel cradle frame', 'Dual-stage rear shocks', 'Halogen multi-reflector headlamp'],
        specs: [{ label: 'Ignition', value: 'CDI Electronic' }],
        warranty_note: '3 Years / 36,000 km Engine Warranty (Placeholder)',
        is_active: true,
        sort_order: 1,
      },
      {
        id: 'var-125-se',
        model_id: 'bike-cg125',
        name: 'Special Edition Self-Start',
        sku: 'ST125-SE-2026',
        ex_showroom_price: 282900,
        engine_type: '4-Stroke OHV Air-Cooled',
        displacement_cc: 124,
        max_power: '11.0 HP @ 8,500 rpm',
        max_torque: '10.2 Nm @ 7,000 rpm',
        mileage_kmpl: 42,
        fuel_tank_l: 9.2,
        kerb_weight_kg: 104,
        seat_height_mm: 780,
        ground_clearance_mm: 140,
        front_brake: 'Hydraulic Disc 240mm',
        rear_brake: 'Drum 130mm',
        front_tyre: '80/100 - 18 Alloy',
        rear_tyre: '90/90 - 18 Alloy',
        starting: 'Electric Self-Start + Kick',
        transmission: '5-Speed Return Shift',
        features: ['Electric self-start', 'Cast alloy rims', 'Front hydraulic disc brake', '5-speed gearbox'],
        specs: [{ label: 'Ignition', value: 'DC-CDI' }],
        warranty_note: '3 Years / 36,000 km Engine Warranty (Placeholder)',
        is_active: true,
        sort_order: 2,
      },
    ],
    stock: [
      { id: 'stk-125-1', variant_id: 'var-125-std', color_id: 'col-125-char', branch_id: 'br-1', quantity: 5, reserved: 1 },
      { id: 'stk-125-2', variant_id: 'var-125-se', color_id: 'col-125-char', branch_id: 'br-1', quantity: 4, reserved: 0 },
      { id: 'stk-125-3', variant_id: 'var-125-se', color_id: 'col-125-red', branch_id: 'br-1', quantity: 0, reserved: 0 },
      { id: 'stk-125-4', variant_id: 'var-125-se', color_id: 'col-125-red', branch_id: 'br-2', quantity: 3, reserved: 0 },
    ],
  },
  {
    id: 'bike-cb150',
    slug: 'sport-tourer-150f',
    name: 'Sport Tourer 150F (Placeholder)',
    category_id: 'cat-performance',
    tagline: 'Counter-balanced 150cc smoothness for city and touring',
    description:
      'Sample placeholder flagship 150cc sport commuter featuring digital gear indicator, front ventilated disc brake, and counter-balancer shaft for vibration-free cruising.',
    engine_cc: 149,
    is_featured: true,
    status: 'published',
    seo_title: 'Sport Tourer 150F Price & Specs | Honda Showroom',
    seo_description: 'Check Sport Tourer 150F placeholder specs, disc brakes, 5-speed gearbox, and showroom stock.',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
    category: SAMPLE_BIKE_CATEGORIES[2],
    colors: [
      { id: 'col-150-blk', model_id: 'bike-cb150', name: 'Matte Obsidian', hex_code: '#1A1B1E', sort_order: 1 },
      { id: 'col-150-red', model_id: 'bike-cb150', name: 'Crimson Accent', hex_code: '#B91C1C', sort_order: 2 },
    ],
    images: [
      {
        id: 'img-150-1',
        model_id: 'bike-cb150',
        color_id: 'col-150-blk',
        url: MEDIA.bikePerformance150,
        storage_path: null,
        alt_text: 'Sport Tourer 150F studio view in Matte Obsidian',
        sort_order: 1,
        is_primary: true,
      },
      {
        id: 'img-150-2',
        model_id: 'bike-cb150',
        color_id: 'col-150-red',
        url: MEDIA.heroShowroomBike,
        storage_path: null,
        alt_text: 'Sport Tourer 150F inside modern showroom',
        sort_order: 2,
        is_primary: false,
      },
    ],
    variants: [
      {
        id: 'var-150-std',
        model_id: 'bike-cb150',
        name: 'ABS Alloy Edition',
        sku: 'ST150-ABS-2026',
        ex_showroom_price: 493900,
        engine_type: '4-Stroke SOHC Air-Cooled Balancer',
        displacement_cc: 149,
        max_power: '12.0 HP @ 7,500 rpm',
        max_torque: '12.5 Nm @ 6,000 rpm',
        mileage_kmpl: 38,
        fuel_tank_l: 13.0,
        kerb_weight_kg: 124,
        seat_height_mm: 785,
        ground_clearance_mm: 168,
        front_brake: 'Ventilated Hydraulic Disc 240mm',
        rear_brake: 'Drum 130mm',
        front_tyre: '80/100 - 18 Tubeless',
        rear_tyre: '90/90 - 18 Tubeless',
        starting: 'Self-Start + Kick',
        transmission: '5-Speed Constant Mesh',
        features: ['Engine balancer shaft', 'LED position lamps', 'Tubeless tyres', 'Digital-analog cluster'],
        specs: [
          { label: 'Suspension Front', value: 'Telescopic Fork 119mm' },
          { label: 'Suspension Rear', value: '5-Step Adjustable Mono-Twin' },
        ],
        warranty_note: '3 Years / 36,000 km Engine Warranty (Placeholder)',
        is_active: true,
        sort_order: 1,
      },
    ],
    stock: [
      { id: 'stk-150-1', variant_id: 'var-150-std', color_id: 'col-150-blk', branch_id: 'br-1', quantity: 3, reserved: 1 },
      { id: 'stk-150-2', variant_id: 'var-150-std', color_id: 'col-150-red', branch_id: 'br-1', quantity: 2, reserved: 0 },
    ],
  },
];

export const SAMPLE_EMI_PLANS: EmiPlan[] = [
  { id: 'emi-12', name: '12 Months Standard', tenure_months: 12, markup_rate_percent_per_year: 14, min_down_payment_percent: 25, is_active: true },
  { id: 'emi-24', name: '24 Months Flexi', tenure_months: 24, markup_rate_percent_per_year: 16, min_down_payment_percent: 30, is_active: true },
  { id: 'emi-36', name: '36 Months Extended', tenure_months: 36, markup_rate_percent_per_year: 18, min_down_payment_percent: 35, is_active: true },
];

export const SAMPLE_ACCESSORY_CATEGORIES: AccessoryCategory[] = [
  { id: 'acat-helmets', name: 'Helmets', slug: 'helmets', parent_id: null, sort_order: 1, is_active: true },
  { id: 'acat-gear', name: 'Riding Gear', slug: 'riding-gear', parent_id: null, sort_order: 2, is_active: true },
  { id: 'acat-parts', name: 'Genuine Parts & Care', slug: 'genuine-parts', parent_id: null, sort_order: 3, is_active: true },
];

export const SAMPLE_ACCESSORIES: Accessory[] = [
  {
    id: 'acc-helmet-1',
    slug: 'apex-full-face-helmet',
    name: 'Apex Full-Face Touring Helmet',
    category_id: 'acat-helmets',
    description:
      'ECE-certified polycarbonate shell with dual-channel ventilation, quick-release smoked visor, and removable washable liner.',
    brand: 'Showroom Pro Gear',
    base_price: 14500,
    compare_at_price: 16500,
    status: 'published',
    is_featured: true,
    seo_title: 'Apex Full-Face Touring Helmet',
    seo_description: 'Lightweight full-face motorcycle helmet with smoked visor.',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
    category: SAMPLE_ACCESSORY_CATEGORIES[0],
    compatible_model_ids: ['bike-cd70', 'bike-cg125', 'bike-cb150'],
    images: [
      {
        id: 'aimg-1',
        accessory_id: 'acc-helmet-1',
        url: MEDIA.accessoryHelmetFullface,
        storage_path: null,
        alt_text: 'Matte black and crimson full-face motorcycle helmet',
        sort_order: 1,
      },
    ],
    variants: [
      { id: 'avar-h-m', accessory_id: 'acc-helmet-1', sku: 'HLM-APX-M', size: 'M (57-58cm)', color: 'Matte Black / Red', price: 14500, stock_quantity: 14, is_active: true },
      { id: 'avar-h-l', accessory_id: 'acc-helmet-1', sku: 'HLM-APX-L', size: 'L (59-60cm)', color: 'Matte Black / Red', price: 14500, stock_quantity: 9, is_active: true },
      { id: 'avar-h-xl', accessory_id: 'acc-helmet-1', sku: 'HLM-APX-XL', size: 'XL (61-62cm)', color: 'Matte Black / Red', price: 14900, stock_quantity: 4, is_active: true },
    ],
  },
  {
    id: 'acc-jacket-1',
    slug: 'mesh-armored-riding-jacket',
    name: 'All-Season Armored Mesh Jacket',
    category_id: 'acat-gear',
    description:
      'High-abrasion 600D cordura mesh riding jacket with CE Level-1 shoulder, elbow, and back armor inserts for warm-climate commuting.',
    brand: 'Showroom Pro Gear',
    base_price: 22900,
    compare_at_price: null,
    status: 'published',
    is_featured: true,
    seo_title: 'All-Season Armored Mesh Jacket',
    seo_description: 'Breathable motorcycle riding jacket with CE armor.',
    created_at: '2026-01-11T08:00:00Z',
    updated_at: '2026-01-11T08:00:00Z',
    category: SAMPLE_ACCESSORY_CATEGORIES[1],
    compatible_model_ids: ['bike-cg125', 'bike-cb150'],
    images: [
      {
        id: 'aimg-2',
        accessory_id: 'acc-jacket-1',
        url: MEDIA.accessoryRidingJacket,
        storage_path: null,
        alt_text: 'Black and charcoal armored motorcycle riding jacket',
        sort_order: 1,
      },
    ],
    variants: [
      { id: 'avar-j-m', accessory_id: 'acc-jacket-1', sku: 'JKT-MSH-M', size: 'M', color: 'Charcoal / Red', price: 22900, stock_quantity: 7, is_active: true },
      { id: 'avar-j-l', accessory_id: 'acc-jacket-1', sku: 'JKT-MSH-L', size: 'L', color: 'Charcoal / Red', price: 22900, stock_quantity: 5, is_active: true },
    ],
  },
  {
    id: 'acc-gloves-1',
    slug: 'carbon-knuckle-leather-gloves',
    name: 'Carbon Knuckle Perforated Gloves',
    category_id: 'acat-gear',
    description:
      'Full-grain perforated goat leather street gloves with molded carbon knuckle shield and touchscreen-compatible index fingertips.',
    brand: 'Showroom Pro Gear',
    base_price: 5400,
    compare_at_price: 6200,
    status: 'published',
    is_featured: true,
    seo_title: 'Carbon Knuckle Perforated Gloves',
    seo_description: 'Leather motorcycle gloves with carbon protection.',
    created_at: '2026-01-12T08:00:00Z',
    updated_at: '2026-01-12T08:00:00Z',
    category: SAMPLE_ACCESSORY_CATEGORIES[1],
    compatible_model_ids: ['bike-cd70', 'bike-cg125', 'bike-cb150'],
    images: [
      {
        id: 'aimg-3',
        accessory_id: 'acc-gloves-1',
        url: MEDIA.accessoryGlovesKit,
        storage_path: null,
        alt_text: 'Black perforated leather motorcycle gloves with carbon knuckles',
        sort_order: 1,
      },
    ],
    variants: [
      { id: 'avar-g-m', accessory_id: 'acc-gloves-1', sku: 'GLV-CRB-M', size: 'M', color: 'Obsidian Black', price: 5400, stock_quantity: 18, is_active: true },
      { id: 'avar-g-l', accessory_id: 'acc-gloves-1', sku: 'GLV-CRB-L', size: 'L', color: 'Obsidian Black', price: 5400, stock_quantity: 11, is_active: true },
    ],
  },
];

export const SAMPLE_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-tr-1', branch_id: 'br-1', slot_type: 'test_ride', day_of_week: 1, start_time: '10:00', end_time: '11:00', capacity: 2, is_active: true },
  { id: 'slot-tr-2', branch_id: 'br-1', slot_type: 'test_ride', day_of_week: 1, start_time: '11:30', end_time: '12:30', capacity: 2, is_active: true },
  { id: 'slot-tr-3', branch_id: 'br-1', slot_type: 'test_ride', day_of_week: 1, start_time: '15:00', end_time: '16:00', capacity: 2, is_active: true },
  { id: 'slot-tr-4', branch_id: 'br-2', slot_type: 'test_ride', day_of_week: 1, start_time: '10:30', end_time: '11:30', capacity: 2, is_active: true },
  { id: 'slot-sv-1', branch_id: 'br-1', slot_type: 'service', day_of_week: 1, start_time: '09:30', end_time: '11:00', capacity: 4, is_active: true },
  { id: 'slot-sv-2', branch_id: 'br-1', slot_type: 'service', day_of_week: 1, start_time: '11:30', end_time: '13:00', capacity: 4, is_active: true },
  { id: 'slot-sv-3', branch_id: 'br-1', slot_type: 'service', day_of_week: 1, start_time: '14:30', end_time: '16:00', capacity: 4, is_active: true },
  { id: 'slot-sv-4', branch_id: 'br-2', slot_type: 'service', day_of_week: 1, start_time: '10:00', end_time: '11:30', capacity: 3, is_active: true },
];

export const SAMPLE_DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'dz-isb', name: 'Islamabad & Rawalpindi', cities: ['Islamabad', 'Rawalpindi'], charge: 350, free_above: 15000, estimated_days: '1–2 working days', is_active: true },
  { id: 'dz-punjab', name: 'Major Cities (Lahore, Faisalabad, Multan)', cities: ['Lahore', 'Faisalabad', 'Multan', 'Gujranwala', 'Sialkot'], charge: 550, free_above: 20000, estimated_days: '2–4 working days', is_active: true },
  { id: 'dz-nation', name: 'Nationwide Courier (Karachi, Peshawar, Quetta)', cities: ['Karachi', 'Peshawar', 'Quetta', 'Hyderabad', 'Other'], charge: 750, free_above: 25000, estimated_days: '3–5 working days', is_active: true },
];

export const SAMPLE_COUPONS: Coupon[] = [
  {
    id: 'cp-1',
    code: 'GEAR10',
    discount_type: 'percent',
    discount_value: 10,
    min_order_amount: 5000,
    max_uses: 100,
    used_count: 14,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    is_active: true,
  },
];

export const SAMPLE_BANNERS: Banner[] = [
  {
    id: 'ban-1',
    title: 'Precision Built For Every Road',
    subtitle:
      'Explore 70cc to 150cc motorcycles, estimate monthly installments, and reserve your next ride with a verified showroom token.',
    image_url: MEDIA.heroShowroomBike,
    cta_label: 'Explore Motorcycles',
    cta_url: '/bikes',
    placement: 'home_hero',
    starts_at: null,
    ends_at: null,
    sort_order: 1,
    is_active: true,
  },
];

export const SAMPLE_OFFERS: Offer[] = [
  {
    id: 'off-1',
    title: 'Zero-Wait First Free Service Checkup',
    description: 'Book your 1,000 km inspection online and skip the morning queue at our Islamabad & Lahore workshops.',
    image_url: MEDIA.bikePerformance150,
    applies_to: 'service',
    starts_at: null,
    ends_at: null,
    is_active: true,
  },
  {
    id: 'off-2',
    title: '10% Off Riding Gear With Code GEAR10',
    description: 'Valid on full-face helmets, armored jackets, and leather gloves for orders above PKR 5,000.',
    image_url: MEDIA.accessoryHelmetFullface,
    applies_to: 'accessories',
    starts_at: null,
    ends_at: null,
    is_active: true,
  },
];

export const SAMPLE_FAQS: FAQ[] = [
  {
    id: 'faq-1',
    category: 'Bookings & Delivery',
    question: 'How does the bike booking token work?',
    answer:
      'You pay only the configurable booking token online via bank transfer (with receipt upload) to reserve your chosen variant and color. Once verified by our accounts team, the unit is held for 7 days while you complete registration paperwork and balance settlement at the showroom.',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'faq-2',
    category: 'Installments',
    question: 'Are EMI calculator figures final?',
    answer:
      'No. The EMI calculator provides an indicative monthly estimate using placeholder markup rates. Final installment terms, processing fees, and eligibility are set by your chosen financing partner.',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'faq-3',
    category: 'Store & Shipping',
    question: 'Can I pick up accessories directly from the showroom?',
    answer:
      'Yes. During checkout you can select Showroom Pickup at zero shipping charge or nationwide courier delivery with Cash on Delivery up to the configured COD limit.',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'faq-4',
    category: 'Service',
    question: 'What do I need to book a service appointment?',
    answer:
      'Select your branch, date, available workshop slot, bike model, and registration number. Your service history is logged in your account after completion.',
    sort_order: 4,
    is_active: true,
  },
];

export const SAMPLE_STATIC_PAGES: StaticPage[] = [
  {
    id: 'pg-about',
    slug: 'about',
    title: 'About Our Showroom',
    content_markdown:
      '## Modern Motorcycle Showroom & Service Center\n\nWe operate a full-service digital and physical motorcycle showroom in Pakistan. Customers can compare models, calculate installment estimates, book test rides, reserve stock with a transparent token, shop riding gear, and track excise registration and workshop service online.\n\n*Note: All brand names, specifications, and placeholder prices shown during preview are admin-editable.*',
    seo_title: 'About Us | Honda Showroom',
    seo_description: 'Learn about our showroom branches, service workshops, and transparent booking process.',
    is_published: true,
  },
  {
    id: 'pg-contact',
    slug: 'contact',
    title: 'Contact Us',
    content_markdown:
      '## Reach Our Showroom Team\n\nVisit our Islamabad or Lahore branches during showroom hours, or submit a direct inquiry below and a product specialist will call you back.',
    seo_title: 'Contact | Honda Showroom',
    seo_description: 'Contact our sales, accessories, and service teams.',
    is_published: true,
  },
  {
    id: 'pg-privacy',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content_markdown:
      '## Data We Collect\n\nWe collect your name, email, phone number, shipping address, vehicle registration number, and uploaded payment proofs or trade-in photos solely to process bookings, store orders, and service appointments.\n\nCNIC numbers are **not** collected online; vehicle registration paperwork is completed in person at the showroom.',
    seo_title: 'Privacy Policy | Honda Showroom',
    seo_description: 'How customer data is collected, protected, and used.',
    is_published: true,
  },
  {
    id: 'pg-terms',
    slug: 'terms',
    title: 'Terms & Conditions',
    content_markdown:
      '## Showroom Terms\n\n1. All motorcycle prices are ex-showroom in PKR and subject to confirmation at invoicing.\n2. Booking tokens hold inventory for the configured hold period once verified.\n3. Accessory orders are subject to stock confirmation and delivery zone charges.',
    seo_title: 'Terms & Conditions | Honda Showroom',
    seo_description: 'Terms governing bike bookings, accessory orders, and service appointments.',
    is_published: true,
  },
  {
    id: 'pg-return',
    slug: 'return-policy',
    title: 'Return & Exchange Policy',
    content_markdown:
      '## Accessories & Gear Returns\n\nUnused accessories in original packaging may be requested for return or exchange within the configured return window from delivery date.\n\nFor hygiene and safety reasons, helmets and inner liners with broken safety seals cannot be returned unless defective on arrival.',
    seo_title: 'Return Policy | Honda Showroom',
    seo_description: 'Eligibility and procedure for accessory returns and exchanges.',
    is_published: true,
  },
  {
    id: 'pg-warranty',
    slug: 'warranty-service-policy',
    title: 'Warranty & Service Policy',
    content_markdown:
      '## Scheduled Maintenance & Warranty\n\nPeriodic maintenance at recommended kilometer intervals keeps your engine warranty valid. Book workshop slots online to ensure zero waiting time and a verified digital service history.',
    seo_title: 'Warranty & Service Policy | Honda Showroom',
    seo_description: 'Warranty coverage and periodic service schedule guidelines.',
    is_published: true,
  },
  {
    id: 'pg-disclaimer',
    slug: 'disclaimer',
    title: 'Showroom & Pricing Disclaimer',
    content_markdown:
      '## Placeholder Pricing & Showroom Notice\n\nAll motorcycle prices displayed on this digital showroom are ex-showroom estimates in PKR and subject to confirmation at the time of showroom invoicing.\n\nInstallment estimates, mileage figures, and specifications are provided for informational comparison. Final registration and vehicle handover take place in person at your selected showroom branch.',
    seo_title: 'Disclaimer | Honda Showroom',
    seo_description: 'Ex-showroom pricing, specification, and installment estimator disclaimers.',
    is_published: true,
  },
];

export const SAMPLE_NEWS_POSTS: NewsPost[] = [
  {
    id: 'news-1',
    slug: 'pre-monsoon-workshop-inspection-camp',
    title: 'Pre-Monsoon Brake & Tyre Safety Checkup Week',
    excerpt:
      'Book a 20-point brake, tyre tread, and electrical seal checkup at our Islamabad and Lahore workshops before rainy season commutes.',
    content_markdown:
      '## Prepare Your Ride for Wet Weather\n\nOur workshop bays are running pre-monsoon safety inspections covering brake shoe thickness, tyre tread depth, chain tension, and spark plug boot sealing.\n\nReserve a morning bay online to avoid workshop wait times and keep your service history updated in your customer account.',
    image_url: MEDIA.bikePerformance150,
    published_at: '2026-11-08T09:00:00Z',
    is_published: true,
    created_at: '2026-11-08T09:00:00Z',
  },
  {
    id: 'news-2',
    slug: 'daily-commute-fuel-efficiency-guide',
    title: '5 Habits That Improve Daily Commuter Fuel Mileage',
    excerpt:
      'Simple tyre pressure, oil grade, and throttle habits that help 70cc and 125cc riders save on weekly fuel costs.',
    content_markdown:
      '## Practical Mileage Tips for Pakistani City Roads\n\n- Check front and rear tyre pressure weekly.\n- Replace engine oil at recommended kilometer intervals with genuine grade oil.\n- Keep the air filter clean in dusty traffic corridors.\n- Shift smoothly around mid-range RPM rather than holding lower gears.',
    image_url: MEDIA.bikeCommuter70,
    published_at: '2026-11-03T10:30:00Z',
    is_published: true,
    created_at: '2026-11-03T10:30:00Z',
  },
  {
    id: 'news-3',
    slug: 'choosing-dot-ece-helmet-fit',
    title: 'How to Measure and Fit a Full-Face Touring Helmet',
    excerpt:
      'A quick guide to crown sizing, cheek-pad break-in, and visor ventilation before ordering riding gear online.',
    content_markdown:
      '## Safety Starts With Proper Fit\n\nMeasure your head circumference 1 cm above your eyebrows using a soft tape. A helmet should feel snug across the cheeks without creating pressure points at the forehead.\n\nVisit our accessories store or try sizes M, L, and XL directly at our showroom counter.',
    image_url: MEDIA.accessoryHelmetFullface,
    published_at: '2026-10-27T12:00:00Z',
    is_published: true,
    created_at: '2026-10-27T12:00:00Z',
  },
  {
    id: 'news-4',
    slug: 'weekend-test-ride-islamabad-lahore',
    title: 'Weekend Test-Ride Sessions Open Across Branches',
    excerpt:
      'Reserve a dedicated 30-minute test ride slot for our 125cc SE and 150F models with product specialists on-site.',
    content_markdown:
      '## Test Before You Reserve\n\nBring your valid driving license and experience seat ergonomics, suspension damping, and disc braking performance in person before placing your booking token.',
    image_url: MEDIA.bikeMidrange125,
    published_at: '2026-10-19T08:30:00Z',
    is_published: true,
    created_at: '2026-10-19T08:30:00Z',
  },
];

// Demo accounts & live in-memory mutable store when Supabase is not configured
export interface DemoUserRecord {
  id: string;
  email: string;
  password: string;
  roles: UserRole[];
  profile: Profile;
}

export const DEMO_USERS: DemoUserRecord[] = [
  {
    id: 'user-cust-1',
    email: 'customer@demo.pk',
    password: 'Password123!',
    roles: ['customer'],
    profile: {
      id: 'user-cust-1',
      full_name: 'Hamza Tariq',
      phone: '+92 300 5551234',
      email: 'customer@demo.pk',
      avatar_url: null,
      loyalty_balance: 340,
      notes: 'Preferred contact after 4 PM',
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-01T10:00:00Z',
    },
  },
  {
    id: 'user-admin-1',
    email: 'admin@demo.pk',
    password: 'Password123!',
    roles: ['super_admin'],
    profile: {
      id: 'user-admin-1',
      full_name: 'Zainab Malik (Super Admin)',
      phone: '+92 300 5550001',
      email: 'admin@demo.pk',
      avatar_url: null,
      loyalty_balance: 0,
      notes: null,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
  },
  {
    id: 'user-sales-1',
    email: 'sales@demo.pk',
    password: 'Password123!',
    roles: ['sales_staff'],
    profile: {
      id: 'user-sales-1',
      full_name: 'Bilal Ahmed (Sales)',
      phone: '+92 300 5550002',
      email: 'sales@demo.pk',
      avatar_url: null,
      loyalty_balance: 0,
      notes: null,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
  },
];

export interface DemoStoreState {
  settings: SiteSettingsMap;
  branches: Branch[];
  bikeCategories: BikeCategory[];
  bikes: BikeModel[];
  priceHistory: BikePriceHistory[];
  emiPlans: EmiPlan[];
  accessoryCategories: AccessoryCategory[];
  accessories: Accessory[];
  timeSlots: TimeSlot[];
  deliveryZones: DeliveryZone[];
  coupons: Coupon[];
  banners: Banner[];
  offers: Offer[];
  faqs: FAQ[];
  staticPages: StaticPage[];
  newsPosts: NewsPost[];
  users: DemoUserRecord[];
  addresses: CustomerAddress[];
  bookings: Booking[];
  testRides: TestRide[];
  inquiries: Inquiry[];
  tradeIns: TradeInRequest[];
  serviceAppointments: ServiceAppointment[];
  serviceHistory: ServiceHistory[];
  orders: Order[];
  returns: ReturnRequest[];
  payments: Payment[];
  refunds: Refund[];
  wishlists: WishlistItem[];
  savedComparisons: SavedComparison[];
  loyaltyLedger: LoyaltyLedgerEntry[];
  auditLog: AuditLogEntry[];
}

export function createInitialDemoState(): DemoStoreState {
  return {
    settings: structuredClone(SAMPLE_SETTINGS),
    branches: structuredClone(SAMPLE_BRANCHES),
    bikeCategories: structuredClone(SAMPLE_BIKE_CATEGORIES),
    bikes: structuredClone(SAMPLE_BIKES),
    priceHistory: [
      {
        id: 'ph-1',
        variant_id: 'var-125-se',
        old_price: 274900,
        new_price: 282900,
        changed_by: 'user-admin-1',
        changed_at: '2026-10-01T09:00:00Z',
      },
    ],
    emiPlans: structuredClone(SAMPLE_EMI_PLANS),
    accessoryCategories: structuredClone(SAMPLE_ACCESSORY_CATEGORIES),
    accessories: structuredClone(SAMPLE_ACCESSORIES),
    timeSlots: structuredClone(SAMPLE_TIME_SLOTS),
    deliveryZones: structuredClone(SAMPLE_DELIVERY_ZONES),
    coupons: structuredClone(SAMPLE_COUPONS),
    banners: structuredClone(SAMPLE_BANNERS),
    offers: structuredClone(SAMPLE_OFFERS),
    faqs: structuredClone(SAMPLE_FAQS),
    staticPages: structuredClone(SAMPLE_STATIC_PAGES),
    newsPosts: structuredClone(SAMPLE_NEWS_POSTS),
    users: structuredClone(DEMO_USERS),
    addresses: [
      {
        id: 'addr-1',
        user_id: 'user-cust-1',
        label: 'Home',
        full_name: 'Hamza Tariq',
        phone: '+92 300 5551234',
        address_line: 'House 22, Street 9, F-8/2',
        city: 'Islamabad',
        province: 'Islamabad Capital Territory',
        postal_code: '44000',
        is_default: true,
      },
    ],
    bookings: [
      {
        id: 'bk-1',
        booking_number: 'BK-20261108-4102',
        user_id: 'user-cust-1',
        variant_id: 'var-125-se',
        color_id: 'col-125-char',
        branch_id: 'br-1',
        customer_name: 'Hamza Tariq',
        customer_phone: '+92 300 5551234',
        customer_email: 'customer@demo.pk',
        token_amount: 15000,
        status: 'converted_to_sale',
        payment_method: 'bank_transfer',
        notes: 'Prefer morning handover',
        internal_notes: 'Token receipt verified; excise file submitted.',
        assigned_to: 'user-sales-1',
        hold_expires_at: '2026-11-15T18:00:00Z',
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        created_at: '2026-11-08T10:30:00Z',
        updated_at: '2026-11-10T14:20:00Z',
        registration_progress: {
          id: 'rp-1',
          booking_id: 'bk-1',
          current_step: 'registration_in_process',
          step_history: [
            { step: 'booked', at: '2026-11-08T10:30:00Z', note: 'Booking created' },
            { step: 'payment_confirmed', at: '2026-11-08T13:15:00Z', note: 'Bank transfer verified' },
            { step: 'documents_submitted', at: '2026-11-09T11:00:00Z', note: 'Showroom invoice signed' },
            { step: 'registration_in_process', at: '2026-11-10T14:20:00Z', note: 'Filed at Islamabad Excise' },
          ],
          updated_by: 'user-admin-1',
          updated_at: '2026-11-10T14:20:00Z',
        },
      },
    ],
    testRides: [
      {
        id: 'tr-1',
        test_ride_number: 'TR-20261110-2044',
        user_id: 'user-cust-1',
        model_id: 'bike-cb150',
        variant_id: 'var-150-std',
        branch_id: 'br-1',
        ride_date: '2026-11-15',
        slot_id: 'slot-tr-1',
        customer_name: 'Hamza Tariq',
        customer_phone: '+92 300 5551234',
        customer_email: 'customer@demo.pk',
        status: 'confirmed',
        internal_notes: null,
        assigned_to: 'user-sales-1',
        created_at: '2026-11-10T09:00:00Z',
      },
    ],
    inquiries: [
      {
        id: 'inq-1',
        user_id: 'user-cust-1',
        model_id: 'bike-cb150',
        name: 'Hamza Tariq',
        phone: '+92 300 5551234',
        email: 'customer@demo.pk',
        message: 'Is Matte Obsidian 150F available in Islamabad branch this week?',
        preferred_contact_time: 'Afternoon (2 PM – 5 PM)',
        source: 'bike_detail',
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        status: 'contacted',
        internal_notes: 'Called and confirmed 2 units on floor.',
        assigned_to: 'user-sales-1',
        created_at: '2026-11-07T11:15:00Z',
      },
    ],
    tradeIns: [],
    serviceAppointments: [
      {
        id: 'sv-1',
        service_number: 'SV-20261111-7712',
        user_id: 'user-cust-1',
        branch_id: 'br-1',
        slot_id: 'slot-sv-1',
        service_date: '2026-11-16',
        model_name: 'Street 125 SE',
        registration_number: 'RIH-4812',
        service_type: 'regular_service',
        description: '3,000 km oil change & chain tension inspection',
        status: 'confirmed',
        internal_notes: null,
        assigned_to: null,
        created_at: '2026-11-11T08:40:00Z',
      },
    ],
    serviceHistory: [
      {
        id: 'sh-1',
        user_id: 'user-cust-1',
        appointment_id: null,
        registration_number: 'RIH-4812',
        model_name: 'Street 125 SE',
        service_date: '2026-10-02',
        odometer_km: 1050,
        work_done: 'First 1,000 km inspection, engine oil & filter replaced, tappet clearance checked',
        parts_used: 'Genuine 10W-30 1L Oil, Oil Strainer Gasket',
        cost: 1850,
        created_by: 'user-admin-1',
        created_at: '2026-10-02T14:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord-1',
        order_number: 'OD-20261105-8831',
        user_id: 'user-cust-1',
        status: 'delivered',
        fulfillment: 'delivery',
        pickup_branch_id: null,
        shipping_name: 'Hamza Tariq',
        shipping_phone: '+92 300 5551234',
        shipping_address: 'House 22, Street 9, F-8/2',
        shipping_city: 'Islamabad',
        delivery_zone_id: 'dz-isb',
        subtotal: 14500,
        delivery_charge: 350,
        discount_amount: 0,
        loyalty_points_used: 0,
        loyalty_discount: 0,
        total: 14850,
        coupon_id: null,
        payment_method: 'cod',
        payment_status: 'paid',
        courier_name: 'TCS Express',
        tracking_number: 'TCS-PK-992014',
        notes: null,
        internal_notes: null,
        created_at: '2026-11-05T12:00:00Z',
        updated_at: '2026-11-07T16:10:00Z',
        items: [
          {
            id: 'oi-1',
            order_id: 'ord-1',
            variant_id: 'avar-h-m',
            name_snapshot: 'Apex Full-Face Touring Helmet (M (57-58cm))',
            sku_snapshot: 'HLM-APX-M',
            unit_price: 14500,
            quantity: 1,
            line_total: 14500,
          },
        ],
      },
    ],
    returns: [],
    payments: [
      {
        id: 'pay-1',
        payable_type: 'booking',
        payable_id: 'bk-1',
        method: 'bank_transfer',
        amount: 15000,
        status: 'paid',
        proof_path: 'demo/receipt-bk-1.jpg',
        gateway_reference: 'IBFT-992817',
        gateway_payload: null,
        verified_by: 'user-admin-1',
        verified_at: '2026-11-08T13:15:00Z',
        created_at: '2026-11-08T10:30:00Z',
      },
      {
        id: 'pay-2',
        payable_type: 'order',
        payable_id: 'ord-1',
        method: 'cod',
        amount: 14850,
        status: 'paid',
        proof_path: null,
        gateway_reference: 'COD-TCS-992014',
        gateway_payload: null,
        verified_by: 'user-admin-1',
        verified_at: '2026-11-07T16:10:00Z',
        created_at: '2026-11-05T12:00:00Z',
      },
    ],
    refunds: [],
    wishlists: [
      {
        id: 'wl-1',
        user_id: 'user-cust-1',
        model_id: 'bike-cb150',
        accessory_id: null,
        created_at: '2026-11-09T10:00:00Z',
      },
    ],
    savedComparisons: [
      {
        id: 'cmp-1',
        user_id: 'user-cust-1',
        model_ids: ['bike-cg125', 'bike-cb150'],
        name: '125cc vs 150cc Daily & Highway',
        created_at: '2026-11-09T11:00:00Z',
      },
    ],
    loyaltyLedger: [
      {
        id: 'll-1',
        user_id: 'user-cust-1',
        points: 145,
        reason: 'order_earn',
        reference_type: 'order',
        reference_id: 'ord-1',
        note: 'Points earned on order OD-20261105-8831',
        created_by: null,
        created_at: '2026-11-07T16:10:00Z',
      },
      {
        id: 'll-2',
        user_id: 'user-cust-1',
        points: 195,
        reason: 'service_earn',
        reference_type: 'service_history',
        reference_id: 'sh-1',
        note: 'First service loyalty bonus',
        created_by: 'user-admin-1',
        created_at: '2026-10-02T14:05:00Z',
      },
    ],
    auditLog: [
      {
        id: 'aud-1',
        actor_id: 'user-admin-1',
        action: 'payment_verified',
        entity_type: 'payments',
        entity_id: 'pay-1',
        old_data: { status: 'pending' },
        new_data: { status: 'paid' },
        ip: '127.0.0.1',
        created_at: '2026-11-08T13:15:00Z',
      },
    ],
  };
}
