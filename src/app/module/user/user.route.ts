// src/modules/user/user.route.ts

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import { multerUpload } from "../../../config/multer.config";
import { updateMyProfileMiddleware } from "./user.middlewares";

const router = Router();

router.patch(
  "/update-my-profile",
  checkAuth(Role.USER),
  multerUpload.fields([
    { name: "profilePhoto", maxCount: 1 } // Accept profile photo
  ]),
  updateMyProfileMiddleware,
  validateRequest(UserValidation.updateUserProfileZodSchema),
  UserController.updateMyProfile
);

// Optional: Add route to remove profile photo
router.delete(
  "/remove-profile-photo",
  checkAuth(Role.USER),
  UserController.removeProfilePhoto
);

export const UserRoutes = router;