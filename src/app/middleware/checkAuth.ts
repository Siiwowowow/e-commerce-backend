/* src/app/middleware/checkAuth.ts */
import { Request, Response, NextFunction } from "express";
import status from "http-status";
import { Role,  } from "../../generated/prisma/enums";

import { CookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";
import AppError from "../../errorHelpers/AppError";
import { envVars } from "../../config/env";

export const checkAuth = (...authRoles: Role[]) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = CookieUtils.getCookie(req, "accessToken");
    if (!token) throw new AppError(status.UNAUTHORIZED, "Unauthorized access! No access token provided.");

    const verified = jwtUtils.verifyToken(token, envVars.ACCESS_TOKEN_SECRET);
    if (!verified.success) throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Invalid token.");

    req.user = {
      userId: verified.data!.userId,
      role: verified.data!.role,
      email: verified.data!.email
    };

    if (authRoles.length > 0 && !authRoles.includes(verified.data!.role as Role)) {
      throw new AppError(status.FORBIDDEN, "Forbidden access! You do not have permission.");
    }

    next();
  } catch (error) {
    next(error);
  }
};