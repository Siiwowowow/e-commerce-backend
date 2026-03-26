import z from "zod";

// product অবজেক্টের ভেতর না রেখে সরাসরি ফিল্ডগুলো ডিফাইন করুন
const ProductZodSchema = z.object({
  name: z.string({ message: "Name is required" }).min(3).max(100),
  description: z.string({ message: "Description is required" }).min(10),
  price: z.number({ message: "Price is required" }).nonnegative(),
  stockQuantity: z.number({ message: "Stock is required" }).int().nonnegative(),
  isFeatured: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  discount: z.number().nonnegative().optional(),
  slug: z.string().min(3).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
});

export const productValidation = {
  ProductZodSchema,
};