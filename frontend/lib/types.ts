export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface PricingOption {
  id: string;
  optionType: string;
  optionValue: string;
  multiplier: string;
  fixedAmount: string;
}

export interface ProductMedia {
  id: string;
  filePath: string;
  fileType: "IMAGE" | "VIDEO";
  mimeType: string;
  fileSize: number;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  basePrice: string;
  isActive?: boolean;
  pricingOptions: PricingOption[];
  media?: ProductMedia[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  paperType: string;
  finishType: string;
  lineTotal: string;
  product?: {
    name: string;
    slug: string;
  };
}

export interface Order {
  id: string;
  status: "PENDING" | "IN_REVIEW" | "PRINTING" | "COMPLETED" | "DELIVERED";
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  createdAt: string;
  payment?: {
    id: string;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    amount: string;
    provider: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
  items: OrderItem[];
  user?: ApiUser;
}

export interface RevenueSummary {
  totalRevenue: number;
  orderCount: number;
}

export interface Offer {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  productCount?: number;
}

export interface AdminOffer {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  products: Array<{
    productId: string;
    sortOrder: number;
    product: Product;
  }>;
}
