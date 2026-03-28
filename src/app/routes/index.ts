import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { ProductRoutes } from "../module/products/products.route";
import { UserRoutes } from "../module/user/user.route";
import { ReviewRoutes } from "../module/review/review.route";

const router=Router();
router.use("/auth",AuthRoutes);
router.use("/products", ProductRoutes);
router.use("/users", UserRoutes)
router.use("/reviews", ReviewRoutes);
export const IndexRoutes=router;