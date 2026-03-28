import { Router } from "express";
import { ReviewController } from "./review.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewValidation } from "./review.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// Create
router.post(
  "/",
  checkAuth(Role.USER),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview
);

// Get reviews by product
router.get("/product/:productId", ReviewController.getReviews);

// Update
router.patch(
  "/:id",
  checkAuth(Role.USER),
  validateRequest(ReviewValidation.updateReviewZodSchema),
  ReviewController.updateReview
);

// Delete (user)
router.delete("/:id", checkAuth(Role.USER), ReviewController.deleteReview);

// Admin delete
router.delete(
  "/admin/:id",
  checkAuth(Role.ADMIN),
  ReviewController.adminDeleteReview
);

export const ReviewRoutes = router;