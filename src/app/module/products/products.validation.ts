import z from "zod";

export const updateProductZodSchema = z.object({
  product: z
    .object({
      name: z.string().min(3).max(100).optional(),
      description: z.string().min(10).optional(),
      price: z.number().nonnegative().optional(),
      stockQuantity: z.number().int().nonnegative().optional(),
      isFeatured: z.boolean().optional(),
      isOnSale: z.boolean().optional(),
      discount: z.number().nonnegative().optional(),
      slug: z.string().min(3).optional(),
      // categoryId / brandId optional for testing
      categoryId: z.string().optional(),
      brandId: z.string().optional(),
    })
    .optional(),
});