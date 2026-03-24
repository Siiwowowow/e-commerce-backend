import { Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { jwtUtils, type JwtExpiresIn } from "./jwt";
import { envVars } from "../../config/env";
import { CookieUtils } from "./cookie";

const normalizeExpiresIn = (value: string): JwtExpiresIn => {
    const normalizedValue = value.trim().replace(/^["']|["']$/g, "");

    if (/^\d+$/.test(normalizedValue)) {
        return Number(normalizedValue);
    }

    return normalizedValue as JwtExpiresIn;
}


//Creating access token
const getAccessToken = (payload: JwtPayload) => {
    const accessToken = jwtUtils.createToken(
        payload,
        envVars.ACCESS_TOKEN_SECRET,
        normalizeExpiresIn(envVars.ACCESS_TOKEN_EXPIRES_IN)
    );

    return accessToken;
}

const getRefreshToken = (payload: JwtPayload) => {
    const refreshToken = jwtUtils.createToken(
        payload,
        envVars.REFRESH_TOKEN_SECRET,
        normalizeExpiresIn(envVars.REFRESH_TOKEN_EXPIRES_IN)
    );
    return refreshToken;
}


const setAccessTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, 'accessToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: '/',
        //1 day
        maxAge: 60 * 60 * 60 * 24,
    });
}

const setRefreshTokenCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, 'refreshToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: '/',
        //7d
        maxAge: 60 * 60 * 60 * 24 * 7,
    });
}

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    CookieUtils.setCookie(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: '/',
        //1 day
        maxAge: 60 * 60 * 60 * 24,
    });
}



export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setBetterAuthSessionCookie,
}