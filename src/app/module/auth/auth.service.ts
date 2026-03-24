import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { tokenUtils } from "../../utils/token";

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

/* ================================
   REGISTER USER
================================ */

const registerUser = async (payload: IRegisterUserPayload) => {
  try {
    const { name, email, password, phone, address, city, country } = payload;

    const data = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        phone,
        address,
        city,
        country,
      },
    });

    if (!data) {
      throw new AppError(status.BAD_REQUEST, "Failed to register user");
    }

    const jwtPayload = {
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    };

    const accessToken = tokenUtils.getAccessToken(jwtPayload);
    const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new AppError(
      error?.status || status.INTERNAL_SERVER_ERROR,
      error?.message || "Registration failed"
    );
  }
};

/* ================================
   LOGIN USER
================================ */

const loginUser = async (payload: ILoginUserPayload) => {
  try {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!data) {
      throw new AppError(status.UNAUTHORIZED, "Invalid credentials");
    }

    // 👉 user validation
    if (data.user.status === UserStatus.BLOCKED) {
      throw new AppError(status.FORBIDDEN, "User is Blocked");
    }

    if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
      throw new AppError(status.FORBIDDEN, "User is Deleted");
    }

    // 👉 token generate
    const jwtPayload = {
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    };

    const accessToken = tokenUtils.getAccessToken(jwtPayload);
    const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new AppError(
      error?.status || status.INTERNAL_SERVER_ERROR,
      error?.message || "Login failed"
    );
  }
};

/* ================================
   EXPORT
================================ */

export const AuthService = {
  registerUser,
  loginUser,
};