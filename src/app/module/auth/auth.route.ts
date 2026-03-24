import { Router } from "express";
import { AuthController } from "./auth.controller";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();
router.post("/register", AuthController.createUser);
router.post("/login", AuthController.loginUser)
router.get("/me",checkAuth(Role.ADMIN, Role.MANAGER,Role.USER, Role.SUPER_ADMIN),  AuthController.getMe)
export const AuthRoutes = router;