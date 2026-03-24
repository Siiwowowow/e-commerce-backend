import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { ProductController } from "./products.controller";
import { updateProductZodSchema } from "./products.validation";

const router = Router();

// CRUD routes
router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);

// Admin / Manager only
router.post(
  "/",
  // checkAuth(Role.ADMIN, Role.MANAGER),
  ProductController.createProduct
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.MANAGER),
  validateRequest(updateProductZodSchema),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN),
  ProductController.deleteProduct
);

export const ProductRoutes = router;