import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  const result = await ReviewService.createReview(user.userId, req.body);

  sendResponse(res, {
    success: true,
    httpCode: status.CREATED,
    message: "Review created successfully",
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const result = await ReviewService.getReviewsByProduct(productId as string);

  sendResponse(res, {
    success: true,
    httpCode: status.OK,
    message: "Reviews fetched",
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  const result = await ReviewService.updateReview(
    user.userId,
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    success: true,
    httpCode: status.OK,
    message: "Review updated",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;

  await ReviewService.deleteReview(user.userId, req.params.id as string);

  sendResponse(res, {
    success: true,
    httpCode: status.OK,
    message: "Review deleted",
    data: null,
  });
});

const adminDeleteReview = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.adminDeleteReview(req.params.id as string);

  sendResponse(res, {
    success: true,
    httpCode: status.OK,
    message: "Review deleted by admin",
    data: null,
  });
});

export const ReviewController = {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
  adminDeleteReview,
};