/* eslint-disable prefer-const */
/* eslint-disable no-useless-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import z from "zod";

import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import { envVars } from "../../config/env";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config";
import { handleZodError } from "../../errorHelpers/handleZodError";
import AppError from "../../errorHelpers/AppError";
import { Prisma } from "../../generated/prisma/client";

// Helper function to extract file URLs from multer files object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractFileUrls = (files: any): string[] => {
  const urls: string[] = [];

  if (!files) return urls;

  // Handle single file upload (req.file)
  if (files.path) {
    urls.push(files.path);
  }

  // Handle array of files (req.files as array)
  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file.path) urls.push(file.path);
    });
  }

  // Handle fields object (req.files as object with multiple fields)
  if (typeof files === 'object' && !Array.isArray(files)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(files).forEach((fieldFiles: any) => {
      if (Array.isArray(fieldFiles)) {
        fieldFiles.forEach(file => {
          if (file.path) urls.push(file.path);
        });
      } else if (fieldFiles?.path) {
        urls.push(fieldFiles.path);
      }
    });
  }

  return urls;
};

// Helper function to clean up files
const cleanupFiles = async (req: Request): Promise<void> => {
  try {
    const fileUrls: string[] = [];
    
    // Check for single file
    if (req.file) {
      fileUrls.push(req.file.path);
    }
    
    // Check for multiple files
    if (req.files) {
      const extractedUrls = extractFileUrls(req.files);
      fileUrls.push(...extractedUrls);
    }
    
    // Delete all files from Cloudinary
    if (fileUrls.length > 0) {
      await Promise.all(
        fileUrls.map(url => 
          deleteFileFromCloudinary(url).catch(error => 
            console.error(`Failed to delete file: ${url}`, error)
          )
        )
      );
      console.log(`Cleaned up ${fileUrls.length} file(s) after error`);
    }
  } catch (cleanupError) {
    console.error("Error during file cleanup:", cleanupError);
  }
};

// Handle Prisma specific errors
// Handle Prisma specific errors
const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message = "Database error occurred";
  let errorSources: TErrorSources[] = [];

  switch (err.code) {
    case "P2002": {
      statusCode = status.CONFLICT;
      
      // Safely extract field names
      let fieldNames = "";
      const target = err.meta?.target;
      
      if (Array.isArray(target)) {
        fieldNames = target.join(", ");
      } else if (typeof target === "string") {
        fieldNames = target;
      } else if (target && typeof target === "object") {
        fieldNames = Object.values(target).join(", ");
      } else {
        fieldNames = "unknown fields";
      }
      
      message = `Unique constraint failed on the field(s): ${fieldNames}`;
      errorSources = [{
        path: "",
        message: `The value already exists. Please use a different value.`
      }];
      break;
    }
    
    case "P2025": {
      statusCode = status.NOT_FOUND;
      message = "Record not found";
      errorSources = [{
        path: "",
        message: "The requested record does not exist"
      }];
      break;
    }
    
    case "P2003": {
      statusCode = status.BAD_REQUEST;
      message = "Foreign key constraint failed";
      errorSources = [{
        path: "",
        message: "Referenced record does not exist"
      }];
      break;
    }
    
    case "P2014": {
      statusCode = status.BAD_REQUEST;
      message = "Invalid ID";
      errorSources = [{
        path: "",
        message: "The provided ID is invalid"
      }];
      break;
    }
    
    default: {
      message = err.message;
      errorSources = [{
        path: "",
        message: err.message
      }];
      break;
    }
  }

  return { statusCode, message, errorSources };
};

// Handle Multer specific errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleMulterError = (err: any) => {
  let statusCode: number = status.BAD_REQUEST; // ✅ Fixed: Explicit type annotation
  let message = "File upload error";
  let errorSources: TErrorSources[] = [];

  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      message = "File is too large. Maximum file size is 5MB";
      errorSources = [{
        path: err.field || "file",
        message: `File size exceeds the limit of 5MB`
      }];
      break;
    
    case "LIMIT_FILE_COUNT":
      message = "Too many files uploaded";
      errorSources = [{
        path: err.field || "files",
        message: `Maximum ${err.limit} files allowed`
      }];
      break;
    
    case "LIMIT_UNEXPECTED_FILE":
      message = `Unexpected field: ${err.field}`;
      errorSources = [{
        path: err.field,
        message: `Field '${err.field}' is not expected`
      }];
      break;
    
    case "LIMIT_FIELD_KEY":
      message = "Field name is too long";
      errorSources = [{
        path: "",
        message: "Field name exceeds the maximum length"
      }];
      break;
    
    case "LIMIT_FIELD_VALUE":
      message = "Field value is too long";
      errorSources = [{
        path: err.field,
        message: "Field value exceeds the maximum length"
      }];
      break;
    
    default:
      message = err.message;
      errorSources = [{
        path: err.field || "file",
        message: err.message
      }];
  }

  return { statusCode, message, errorSources };
};

// Main global error handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const globalErrorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error in development
  if (envVars.NODE_ENV === 'development') {
    console.log("Error from Global Error Handler:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      files: req.file || req.files ? "Files present" : "No files"
    });
  }

  // Clean up uploaded files on error
  await cleanupFiles(req);

  // Default values
  let errorSources: TErrorSources[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR; // ✅ Fixed: Explicit type annotation
  let message: string = 'Internal Server Error';
  let stack: string | undefined = undefined;

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } 
  // Handle Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    errorSources = prismaError.errorSources;
    stack = err.stack;
  }
  // Handle Prisma validation errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = status.BAD_REQUEST;
    message = "Invalid data provided";
    errorSources = [{
      path: "",
      message: "Please check your input data"
    }];
    stack = err.stack;
  }
  // Handle Multer errors
  else if (err.code && err.code.startsWith("LIMIT_")) {
    const multerError = handleMulterError(err);
    statusCode = multerError.statusCode;
    message = multerError.message;
    errorSources = multerError.errorSources;
    stack = err.stack;
  }
  // Handle custom AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = err.errorSources || [
      {
        path: '',
        message: err.message
      }
    ];
  }
  // Handle generic errors
  else if (err instanceof Error) {
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: '',
        message: err.message
      }
    ];
  }

  // Prepare error response
  const errorResponse: TErrorResponse = {
    success: false,
    message: message,
    errorSources,
    error: envVars.NODE_ENV === 'development' ? err : undefined,
    stack: envVars.NODE_ENV === 'development' ? stack : undefined,
  };

  // Send response
  res.status(statusCode).json(errorResponse);
};