import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
router.post("/register", AuthController.createUser);
router.post("/login", AuthController.loginUser)
export const AuthRoutes = router;