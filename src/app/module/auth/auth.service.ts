import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { UserStatus } from "../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../../config/env";
import { IChangePasswordPayload } from "./auth.interface";

interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
}

interface ILoginUserPayload {
  email: string;
  password: string;
}

// ✅ REGISTER
const registerUser = async (payload: IRegisterUserPayload) => {
  const response = await auth.api.signUpEmail({
    body: payload,
    asResponse: true,
  });

  const data = await response.json();

  if (!data) throw new AppError(status.BAD_REQUEST, "Failed to register");

  const jwtPayload = {
    userId: data.user.id,
    role: data.user.role,
    email: data.user.email,
    name: data.user.name,
  };

  return {
    data,
    headers: response.headers,
    accessToken: tokenUtils.getAccessToken(jwtPayload),
    refreshToken: tokenUtils.getRefreshToken(jwtPayload),
  };
};

// ✅ LOGIN
const loginUser = async (payload: ILoginUserPayload) => {
  const response = await auth.api.signInEmail({
    body: payload,
    asResponse: true,
  });

  const data = await response.json();

  // ✅ FIRST: check response status
  if (!response.ok) {
    throw new AppError(status.UNAUTHORIZED, data?.message || "Invalid credentials");
  }

  // ✅ SECOND: safe user check
  if (!data?.user) {
    throw new AppError(status.UNAUTHORIZED, "User not found");
  }

  if (
    data.user.status === UserStatus.BLOCKED ||
    data.user.isDeleted ||
    data.user.status === UserStatus.DELETED
  ) {
    throw new AppError(status.FORBIDDEN, "User is not active");
  }

  const jwtPayload = {
    userId: data.user.id,
    role: data.user.role,
    email: data.user.email,
    name: data.user.name,
  };

  return {
    data,
    headers: response.headers,
    accessToken: tokenUtils.getAccessToken(jwtPayload),
    refreshToken: tokenUtils.getRefreshToken(jwtPayload),
  };
};

// ✅ GET ME
const getMe = async (user: IRequestUser) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: user.userId },
  });

  if (!existingUser) throw new AppError(status.NOT_FOUND, "User not found");

  return existingUser;
};

// ✅ REFRESH TOKEN
const getNewToken = async (refreshToken: string) => {
  const verified = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET
  );

  if (!verified.success) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verified.data as JwtPayload;

  const accessToken = tokenUtils.getAccessToken(data);
  const newRefreshToken = tokenUtils.getRefreshToken(data);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

// ✅ CHANGE PASSWORD (Better Auth)
const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string
) => {
  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token missing");
  }

  try {
    // ✅ 1. Get session from Better Auth
    const session = await auth.api.getSession({
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!session?.user) {
      throw new AppError(status.UNAUTHORIZED, "Invalid session");
    }

    // ✅ 2. Change password
    const result = await auth.api.changePassword({
      body: {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        revokeOtherSessions: false,
      },
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // ✅ 3. Update needPasswordChange flag
    if (session.user.needPasswordChange) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          needPasswordChange: false,
        },
      });
    }

    return result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("🔴 CHANGE PASSWORD ERROR:", error);

    if (error?.status === 401) {
      throw new AppError(status.UNAUTHORIZED, "Invalid session or password");
    }

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      error?.message || "Password change failed"
    );
  }
};
const logoutUser = async (sessionToken: string) => {
  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "Session token missing");
  }

  try {
    const response = await auth.api.signOut({
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    return response;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("🔴 LOGOUT ERROR:", error);

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      error?.message || "Logout failed"
    );
  }
};
const verifyEmail = async (email : string, otp : string) => {

    const result = await auth.api.verifyEmailOTP({
        body:{
            email,
            otp,
        }
    })

    if(result.status && !result.user.emailVerified){
        await prisma.user.update({
            where : {
                email,
            },
            data : {
                emailVerified: true,
            }
        })
    }
}
const forgetPassword = async (email : string) => {
    const isUserExist = await prisma.user.findUnique({
        where : {
            email,
        }
    })

    if(!isUserExist){
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if(!isUserExist.emailVerified){
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if(isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED){
        throw new AppError(status.NOT_FOUND, "User not found"); 
    }

    await auth.api.requestPasswordResetEmailOTP({
        body:{
            email,
        }
    })
}
const resetPassword = async (email : string, otp : string, newPassword : string) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            email,
        }
    })

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    await auth.api.resetPasswordEmailOTP({
        body:{
            email,
            otp,
            password : newPassword,
        }
    })

    if (isUserExist.needPasswordChange) {
        await prisma.user.update({
            where: {
                id: isUserExist.id,
            },
            data: {
                needPasswordChange: false,
            }
        })
    }

    await prisma.session.deleteMany({
        where:{
            userId : isUserExist.id,
        }
    })
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session: Record<string, any>) => {

  const user = await prisma.user.upsert({
    where: { id: session.user.id },
    update: {
      name: session.user.name,
      email: session.user.email,
    },
    create: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  });

  const accessToken = tokenUtils.getAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: user.id,
    role: user.role,
    name: user.name,
  });

  return {
    accessToken,
    refreshToken,
  };
};
export const AuthService = {
  registerUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess
};