import { prisma } from "../../lib/prisma";
import status from "http-status";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IQueryParams } from "../../interfaces/query.interface";
import { productFilterableFields, productIncludeConfig, productSearchableFields } from "./product.constant";
import AppError from "../../../errorHelpers/AppError";
import { deleteFileFromCloudinary } from "../../../config/cloudinary.config";

// Helper function to generate unique slug
const generateUniqueSlug = async (name: string): Promise<string> => {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  if (!baseSlug) {
    baseSlug = `product-${Date.now()}`;
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check if slug exists and make it unique
  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });
    
    if (!existingProduct) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

// 🔹 Create Product
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createProduct = async (payload: any) => {
  // Generate slug if not provided
  let slug = payload.slug;
  if (!slug && payload.name) {
    slug = await generateUniqueSlug(payload.name);
  } else if (slug) {
    // Check if provided slug is unique
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });
    
    if (existingProduct) {
      throw new AppError(status.CONFLICT, `Product with slug '${slug}' already exists`);
    }
  } else {
    throw new AppError(status.BAD_REQUEST, "Product name or slug is required");
  }
  
  const product = await prisma.product.create({
    data: {
      ...payload,
      slug,
    },
  });

  return product;
};

// 🔹 Get all products
export const getAllProducts = async (queryParams: IQueryParams) => {
  const queryBuilder = new QueryBuilder(
    prisma.product,
    queryParams,
    {
      searchableFields: productSearchableFields,
      filterableFields: productFilterableFields,
    }
  );

  const result = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .dynamicInclude(productIncludeConfig)
    .execute();

  return result;
};

// 🔹 Get product by ID
export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");
  return product;
};

// 🔹 Update product
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateProduct = async (id: string, payload: any) => {
  // Get existing product
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) throw new AppError(status.NOT_FOUND, "Product not found");

  // If updating slug, check uniqueness
  if (payload.slug && payload.slug !== existingProduct.slug) {
    const slugExists = await prisma.product.findUnique({
      where: { slug: payload.slug }
    });
    
    if (slugExists) {
      throw new AppError(status.CONFLICT, `Product with slug '${payload.slug}' already exists`);
    }
  }

  // If updating product photo, delete old one from Cloudinary
  if (payload.productPhoto && existingProduct.productPhoto) {
    try {
      await deleteFileFromCloudinary(existingProduct.productPhoto);
      console.log("Old product photo deleted:", existingProduct.productPhoto);
    } catch (error) {
      console.error("Failed to delete old product photo:", error);
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: { ...payload },
  });

  return product;
};

// 🔹 Delete product
export const deleteProduct = async (id: string) => {
  // Get product to delete its photo
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  // Delete product photo from Cloudinary
  if (product.productPhoto) {
    try {
      await deleteFileFromCloudinary(product.productPhoto);
      console.log("Product photo deleted:", product.productPhoto);
    } catch (error) {
      console.error("Failed to delete product photo:", error);
    }
  }

  await prisma.product.delete({
    where: { id },
  });

  return { message: "Product deleted successfully" };
};