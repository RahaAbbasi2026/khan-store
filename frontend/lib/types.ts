export type LightLevel = 'LOW' | 'INDIRECT' | 'DIRECT';
export type CareDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
export type Occasion =
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'VALENTINE'
  | 'MOTHERS_DAY'
  | 'TEACHERS_DAY'
  | 'CONDOLENCE';

export interface GreetingCard {
  id: string;
  imageData: string;
  label?: string | null;
}

/** Optional per-page SEO overrides; empty means "derive from the content". */
export interface SeoFields {
  seoTitle?: string | null;
  seoDescription?: string | null;
  noindex?: boolean;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
}

export interface Category {
  id: string;
  slug: string;
  nameFa: string;
}

export interface Product extends SeoFields {
  id: string;
  slug: string;
  nameFa: string;
  nameScientific: string | null;
  description: string;
  priceToman: number;
  images: string[];
  category: Category;
  light: LightLevel | null;
  waterPerWeek: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  careDifficulty: CareDifficulty | null;
  petSafe: boolean;
  airPurifying: boolean;
  suitableForOffice: boolean;
  stockStatus: StockStatus;
  ratingAverage?: number;
  ratingCount?: number;
  updatedAt?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { name: string };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
  occasion: Occasion | null;
  greetingCard: string | null;
  message: string | null;
  isAnonymous: boolean;
}

export interface Cart {
  id: string;
  token: string;
  items: CartItem[];
  subtotalToman: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export interface Order {
  id: string;
  paymentRefId?: string | null;
  orderNumber: string;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED';
  totalToman: number;
  customerName: string;
  phone?: string;
  address?: string;
  city: string;
  deliveryDate: string;
  deliverySlot: string;
  createdAt?: string;
  items?: OrderItem[];
}

export type OrderReceipt = Pick<Order, 'orderNumber' | 'status' | 'totalToman' | 'paymentRefId'>;

export interface Article extends SeoFields {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}
