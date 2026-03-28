import AppError from "../../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import status from "http-status";

// ⭐ Update product rating
const updateProductRating = async (productId: string) => {
  const stats = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: stats._avg.rating || 0,
      reviewCount: stats._count.rating,
    },
  });
};

// ✅ Create Review
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createReview = async (userId: string, payload: any) => {
  const { productId, rating, comment } = payload;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError(status.NOT_FOUND, "Product not found");
  }

  const existing = await prisma.review.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
  });

  if (existing) {
    throw new AppError(status.BAD_REQUEST, "Already reviewed");
  }

  const review = await prisma.review.create({
    data: { userId, productId, rating, comment },
  });

  await updateProductRating(productId);

  return review;
};

// ✅ Get Reviews by Product
const getReviewsByProduct = async (productId: string) => {
  return await prisma.review.findMany({
    where: { productId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ✅ Update Review
const updateReview = async (
  userId: string,
  reviewId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) throw new AppError(status.NOT_FOUND, "Review not found");

  if (review.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "Not allowed");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: payload,
  });

  await updateProductRating(review.productId);

  return updated;
};

// ✅ Delete Review (User)
const deleteReview = async (userId: string, reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) throw new AppError(status.NOT_FOUND, "Review not found");

  if (review.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "Not allowed");
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  await updateProductRating(review.productId);

  return null;
};

// ✅ Admin Delete
const adminDeleteReview = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) throw new AppError(status.NOT_FOUND, "Review not found");

  await prisma.review.delete({
    where: { id: reviewId },
  });

  await updateProductRating(review.productId);

  return null;
};

export const ReviewService = {
  createReview,
  getReviewsByProduct,
  updateReview,
  deleteReview,
  adminDeleteReview,
};