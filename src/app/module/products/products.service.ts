import AppError from "../../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import status from "http-status";

// 🔹 Create Product
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createProduct = async (payload: any) => {
  const product = await prisma.product.create({  // <-- lowercase
    data: {
      ...payload,
    },
  });

  return product;
};

// 🔹 Get all products
export const getAllProducts = async () => {
  const products = await prisma.product.findMany(); // <-- lowercase
  return products;
};

// 🔹 Get product by ID
export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({  // <-- lowercase
    where: { id },
  });

  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");
  return product;
};

// 🔹 Update product
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateProduct = async (id: string, payload: any) => {
  const product = await prisma.product.update({  // <-- lowercase
    where: { id },
    data: { ...payload },
  });

  return product;
};

// 🔹 Delete product
export const deleteProduct = async (id: string) => {
  await prisma.product.delete({  // <-- lowercase
    where: { id },
  });

  return { message: "Product deleted successfully" };
};