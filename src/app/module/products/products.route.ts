import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { ProductController } from "./products.controller";
import { productValidation } from "./products.validation";
import { multerUpload } from "../../../config/multer.config";

const router = Router();

// CRUD routes
router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);

// Admin / Manager only
router.post(
  "/",
  multerUpload.fields([
    { name: "productPhoto", maxCount: 1 },
    { name: "file", maxCount: 1 }
  ]),
  // checkAuth(Role.ADMIN, Role.MANAGER),
  validateRequest(productValidation.ProductZodSchema),
  ProductController.createProduct
);

router.patch(
  "/:id",
  multerUpload.fields([
    { name: "productPhoto", maxCount: 1 },
    { name: "file", maxCount: 1 }
  ]),
  checkAuth(Role.ADMIN, Role.MANAGER),
  validateRequest(productValidation.ProductUpdateZodSchema),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN),
  ProductController.deleteProduct
);

export const ProductRoutes = router;