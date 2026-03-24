/* src/app/module/auth/auth.service.ts */
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { UserStatus } from "../../../generated/prisma/enums";

interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface ILoginUserPayload {
  email: string;
  password: string;
}

const registerUser = async (payload: IRegisterUserPayload) => {
  const data = await auth.api.signUpEmail({ body: payload });
  if (!data) throw new AppError(status.BAD_REQUEST, "Failed to register user");

  const jwtPayload = { userId: data.user.id, role: data.user.role, email: data.user.email, name: data.user.name };
  return { ...data, accessToken: tokenUtils.getAccessToken(jwtPayload), refreshToken: tokenUtils.getRefreshToken(jwtPayload) };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const data = await auth.api.signInEmail({ body: payload });
  if (!data) throw new AppError(status.UNAUTHORIZED, "Invalid credentials");

  if (data.user.status === UserStatus.BLOCKED || data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is not active");
  }

  const jwtPayload = { userId: data.user.id, role: data.user.role, email: data.user.email, name: data.user.name };
  return { ...data, accessToken: tokenUtils.getAccessToken(jwtPayload), refreshToken: tokenUtils.getRefreshToken(jwtPayload) };
};

const getMe = async (user: IRequestUser) => {
  const existingUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!existingUser) throw new AppError(status.NOT_FOUND, "User not found");
  return existingUser;
};

export const AuthService = { registerUser, loginUser, getMe };