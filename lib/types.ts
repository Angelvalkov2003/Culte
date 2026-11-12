export type DogSize = "small" | "medium" | "large";
export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
export type OrderStatus =
  | "pending_payment"
  | "new"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "expired"
  | "stock_issue";
export type PaymentMethod = "stripe" | "cod";
export type DeliveryType = "address" | "office" | "pickup" | "locker";

export interface Service {
  id: string;
  size: DogSize;
  name: string;
  description: string;
  duration_min: number;
  duration_max: number;
  price_from: number;
  price_to: number;
  is_addon: boolean;
  addon_allowed: boolean;
  group_name: ServiceGroup;
  includes: string;
  breeds: string;
  deposit: number | null;
  is_active: boolean;
  sort_order: number;
}

export type ServiceGroup = "package" | "single" | "care";
export const SERVICE_GROUP_LABEL: Record<ServiceGroup, string> = {
  package: "Пакети",
  single: "Отделни услуги",
  care: "Хигиена и грижа",
};
export const SIZE_HINT: Record<DogSize, string> = {
  small: "До 5 кг",
  medium: "От 5 до 10 кг",
  large: "Над 10 кг",
};
export const PRICE_NOTE =
  "Крайната цена зависи от прическата, дължината и гъстотата на козината и колко време ще отнеме. Обадете ни се за по-точна цена.";

export interface BusinessHours {
  weekday: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

export interface BlockedPeriod {
  id: string;
  start_at: string;
  end_at: string;
  reason: string;
}

export interface Booking {
  id: string;
  number: number;
  status: BookingStatus;
  source: "online" | "manual";
  size: DogSize;
  start_at: string;
  end_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  dog_name: string;
  dog_breed: string;
  message: string;
  total_from: number;
  total_to: number;
  deposit_amount: number;
  deposit_paid: boolean;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  refund_id: string | null;
  refunded_at: string | null;
  admin_note: string;
  reminder_sent_at: string | null;
  service_consent_at: string | null;
  created_at: string;
  booking_services?: BookingServiceRow[];
}

export interface BookingServiceRow {
  id: string;
  booking_id: string;
  service_id: string | null;
  name: string;
  is_main: boolean;
  duration_max: number;
  price_from: number;
  price_to: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  is_active: boolean;
  image_public_id: string | null;
  manufacturer: string;
  safety_info: string;
  sort_order: number;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  provider: string;
  delivery: DeliveryType;
  price: number;
  free_over: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  paid_at: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  delivery: DeliveryType;
  address: string;
  note: string;
  shipping_method_id: string | null;
  shipping_name: string;
  shipping_price: number;
  subtotal: number;
  total: number;
  stock_deducted: boolean;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  tracking_number: string;
  admin_note: string;
  shipped_at: string | null;
  refund_id: string | null;
  refunded_at: string | null;
  invoice_requested: boolean;
  invoice_details: InvoiceDetails;
  shipping_provider: "manual" | "speedy" | "boxnow";
  shipping_method: string;
  shipping_site_id: number | null;
  shipping_site_name: string;
  shipping_office_id: number | null;
  shipping_office_name: string;
  shipping_deadline: string | null;
  shipping_details: { addressLine?: string; lockerAddress?: string; postalCode?: string; [k: string]: unknown };
  speedy_shipment_id: string | null;
  speedy_parcel_id: string | null;
  speedy_created_at: string | null;
  speedy_last_synced_at: string | null;
  boxnow_locker_id: string | null;
  boxnow_locker_name: string;
  boxnow_delivery_id: string | null;
  boxnow_parcel_id: string | null;
  boxnow_created_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface InvoiceDetails {
  company?: string;
  eik?: string;
  vat?: string;
  address?: string;
  mol?: string;
}

export interface WithdrawalRequest {
  id: string;
  number: number;
  kind: "order" | "booking";
  order_id: string | null;
  booking_id: string | null;
  reference: string;
  customer_name: string;
  customer_email: string;
  items: string;
  reason: string;
  status: "received" | "processed" | "rejected";
  admin_note: string;
  created_at: string;
}

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalRequest["status"], string> = {
  received: "Получен",
  processed: "Обработен",
  rejected: "Отхвърлен",
};

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
}

export const SIZE_LABEL: Record<DogSize, string> = {
  small: "Малка порода",
  medium: "Средна порода",
  large: "Голяма порода",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Чака плащане",
  confirmed: "Потвърдена",
  completed: "Изпълнена",
  cancelled: "Отказана",
  expired: "Изтекла",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Чака плащане",
  new: "Нова",
  processing: "Обработва се",
  shipped: "Изпратена",
  delivered: "Доставена",
  cancelled: "Отказана",
  expired: "Изтекла",
  stock_issue: "Проблем с наличност",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  stripe: "Карта (Stripe)",
  cod: "Наложен платеж",
};

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  address: "До адрес",
  office: "До офис",
  pickup: "От салона",
  locker: "До автомат",
};
