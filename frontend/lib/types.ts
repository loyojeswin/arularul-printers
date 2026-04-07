export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

export interface AuthResponse {
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

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  paperType: string;
  finishType: string;
  notes?: string | null;
  designFilePath?: string | null;
  lineTotal: string;
  designFiles?: Array<{
    id: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
    sortOrder: number;
  }>;
  product?: Product;
}

export interface ProductReview {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface ProductReviewSummary {
  averageRating: number;
  totalReviews: number;
  countByRating: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ProductReviewsResponse {
  summary: ProductReviewSummary;
  reviews: ProductReview[];
}

export interface Order {
  id: string;
  status: "PENDING" | "IN_REVIEW" | "PRINTING" | "COMPLETED" | "DELIVERED";
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string | null;
  createdAt: string;
  payment?: {
    id: string;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    amount: string;
    provider: "RAZORPAY" | "CASH" | "BANK_TRANSFER" | "CARD" | "UPI";
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
  imagePath?: string | null;
  productCount?: number;
}

export interface AdminOffer {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  imagePath?: string | null;
  products: Array<{
    productId: string;
    sortOrder: number;
    product: Product;
  }>;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullAddress: string;
  city: string;
  pincode?: string | null;
  phone?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
