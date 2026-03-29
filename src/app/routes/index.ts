import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { ProductRoutes } from "../module/products/products.route";
import { UserRoutes } from "../module/user/user.route";
import { ReviewRoutes } from "../module/review/review.route";
import { StatsRoutes } from "../module/stats/stats.route";
import { PaymentRoutes } from "../module/payment/payment.route";

const router=Router();
router.use("/auth",AuthRoutes);
router.use("/products", ProductRoutes);
router.use("/users", UserRoutes)
router.use("/reviews", ReviewRoutes);
router.use("/stats", StatsRoutes)
router.use("/payment", PaymentRoutes)
export const IndexRoutes=router;