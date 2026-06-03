export interface Category {
  id: string;
  name: string;
  order: number;
  backgroundStyle: 'luxury' | 'fastfood' | 'cafe' | 'neonbar' | 'dessert';
}

export interface ProductPrice {
  label: string; // e.g. "Simple", "Doble", "Media", "Entera"
  value: number;  // price value
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  photo: string; // compressed base64 string
  prices: ProductPrice[];
  isSuspended: boolean;
}

export interface ChefSuggestion {
  name: string;
  description: string;
  photo: string; // base64
  price: number;
  active: boolean;
}

export interface RestaurantConfig {
  restaurantName: string;
  pinCode: string;
  whatsappNumber: string;
  isOpen?: boolean; // New field
  chefSuggestion: ChefSuggestion;
}

export interface WishlistItem {
  productId: string;
  productName: string;
  selectedPriceLabel: string;
  selectedPriceValue: number;
  quantity: number;
}

export interface TableCall {
  id: string;
  tableNumber?: string;
  userName?: string;
  userAddress?: string;
  userPhone?: string;
  timestamp: string; // ISO string
  wishlist: WishlistItem[];
  waiterName?: string;
  notes?: string;
  status: 'pending' | 'attending' | 'ready' | 'completed';
  latitude?: number;
  longitude?: number;
}
