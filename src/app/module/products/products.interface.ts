// src/modules/products/products.interface.ts

export interface IProductPayload {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  discount?: number;
  slug: string;
  productPhoto?: string; // Add this field for the photo URL
  categoryId?: string;
  brandId?: string;
}