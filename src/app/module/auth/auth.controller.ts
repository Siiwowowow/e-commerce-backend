import { Request, Response } from "express";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../shared/catchAsync";
import status from "http-status";
import { tokenUtils } from "../../utils/token";
import AppError from "../../../errorHelpers/AppError";

// ✅ REGISTER
const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);

  const { data, headers, accessToken, refreshToken } = result;

  const cookies = headers.get("set-cookie");
  if (cookies) {
    res.setHeader("set-cookie", cookies);
  }

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpCode: status.CREATED,
    success: true,
    message: "User registered successfully",
    data,
  });
});

// ✅ LOGIN
const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const { data, headers, accessToken, refreshToken } = result;

  const cookies = headers.get("set-cookie");
  if (cookies) {
    res.setHeader("set-cookie", cookies);
  }

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpCode: 200,
    success: true,
    message: "User logged in successfully",
    data,
  });
});

// ✅ GET ME
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const result = await AuthService.getMe(user);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

// ✅ REFRESH TOKEN
const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token missing");
  }

  const result = await AuthService.getNewToken(refreshToken);

  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Token refreshed",
    data: result,
  });
});

// ✅ CHANGE PASSWORD
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.cookies["better-auth.session_token"];

  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token required");
  }

  const result = await AuthService.changePassword(
    req.body,
    sessionToken
  );

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});
const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.cookies["better-auth.session_token"];

  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token required");
  }

  await AuthService.logoutUser(sessionToken);

  // ✅ Clear Better Auth cookie
  res.clearCookie("better-auth.session_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  // ✅ Clear JWT cookies
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });

  sendResponse(res, {
    httpCode: 200,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const AuthController = {
  createUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser
};