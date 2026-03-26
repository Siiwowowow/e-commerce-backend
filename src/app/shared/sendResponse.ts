import {   Response } from "express";

interface IRresponseData<T> {
  httpCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta ?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }
}
export const sendResponse = <T>(res: Response, response: IRresponseData<T>) => {
  const { httpCode, success, message, data } = response;
  res.status(httpCode).json({
    success,
    message,
    data,
  });
};