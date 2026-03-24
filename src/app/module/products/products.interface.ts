export interface IProductPayload {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  discount?: number;
  slug: string;
  
}