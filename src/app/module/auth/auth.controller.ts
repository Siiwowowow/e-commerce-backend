import { Request, Response } from "express";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../shared/catchAsync";
import status from "http-status";
import { tokenUtils } from "../../utils/token";

const createUser = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await AuthService.registerUser(payload);
    const { accessToken, refreshToken, token, ...rest } = result;

    // 👉 cookies set
    if (accessToken) {
      tokenUtils.setAccessTokenCookie(res, accessToken);
    }

    if (refreshToken) {
      tokenUtils.setRefreshTokenCookie(res, refreshToken);
    }

    if (token) {
      tokenUtils.setBetterAuthSessionCookie(res, token);
    }
    sendResponse(res, {
      httpCode: status.CREATED,
      success: true,
      message: "User registered successfully",
      data: {
        accessToken,
        refreshToken,
        token,
        ...rest,
      },
    });
  }
);

const loginUser = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await AuthService.loginUser(payload);

    sendResponse(res, {
      httpCode: 200,
      success: true,
      message: "User logged in successfully",
      data: result,
    });
  }
);

export const AuthController = {
  createUser,
  loginUser,
};