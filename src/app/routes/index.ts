import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { ProductRoutes } from "../module/products/products.route";

const router=Router();
router.use("/auth",AuthRoutes);
router.use("/products", ProductRoutes);

export const IndexRoutes=router;