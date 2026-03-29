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
import { handlePrismaClientInitializationError, handlePrismaClientKnownRequestError, handlePrismaClientRustPanicError, handlePrismaClientUnknownError, handlePrismaClientValidationError } from "../../errorHelpers/handlePrismaErrors";


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
    let errorResponse: TErrorResponse = {
        success: false,
        message: 'Internal Server Error',
        errorSources: [],
        error: undefined,
        stack: undefined,
        statusCode: status.INTERNAL_SERVER_ERROR
    };

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
        const simplifiedError = handleZodError(err);
        errorResponse = {
            success: false,
            statusCode: simplifiedError.statusCode as number,
            message: simplifiedError.message,
            errorSources: simplifiedError.errorSources,
            error: err,
            stack: envVars.NODE_ENV === 'development' ? err.stack : undefined,
        };
    } 
    // Handle Prisma Known Request Errors
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        errorResponse = handlePrismaClientKnownRequestError(err);
        if (envVars.NODE_ENV === 'development') {
            errorResponse.error = err;
            errorResponse.stack = err.stack;
        }
    }
    // Handle Prisma Unknown Request Errors
    else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        errorResponse = handlePrismaClientUnknownError(err);
        if (envVars.NODE_ENV === 'development') {
            errorResponse.error = err;
            errorResponse.stack = err.stack;
        }
    }
    // Handle Prisma Validation Errors
    else if (err instanceof Prisma.PrismaClientValidationError) {
        errorResponse = handlePrismaClientValidationError(err);
        if (envVars.NODE_ENV === 'development') {
            errorResponse.error = err;
            errorResponse.stack = err.stack;
        }
    }
    // Handle Prisma Initialization Errors
    else if (err instanceof Prisma.PrismaClientInitializationError) {
        errorResponse = handlePrismaClientInitializationError(err);
        if (envVars.NODE_ENV === 'development') {
            errorResponse.error = err;
            errorResponse.stack = err.stack;
        }
    }
    // Handle Prisma Rust Panic Errors
    else if (err instanceof Prisma.PrismaClientRustPanicError) {
        errorResponse = handlePrismaClientRustPanicError();
        if (envVars.NODE_ENV === 'development') {
            errorResponse.error = err;
            errorResponse.stack = err.stack;
        }
    }
    // Handle Multer errors
    else if (err.code && err.code.startsWith("LIMIT_")) {
        const multerError = handleMulterError(err);
        errorResponse = {
            success: false,
            statusCode: multerError.statusCode,
            message: multerError.message,
            errorSources: multerError.errorSources,
            error: err,
            stack: envVars.NODE_ENV === 'development' ? err.stack : undefined,
        };
    }
    // Handle custom AppError
    else if (err instanceof AppError) {
        errorResponse = {
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errorSources: err.errorSources || [{ path: '', message: err.message }],
            error: err,
            stack: envVars.NODE_ENV === 'development' ? err.stack : undefined,
        };
    }
    // Handle generic errors
    else if (err instanceof Error) {
        errorResponse = {
            success: false,
            statusCode: status.INTERNAL_SERVER_ERROR,
            message: err.message,
            errorSources: [{ path: '', message: err.message }],
            error: err,
            stack: envVars.NODE_ENV === 'development' ? err.stack : undefined,
        };
    }

    // Send response
    res.status(errorResponse.statusCode).json(errorResponse);
};

// Handle Multer specific errors (keep this function inside globalErrorHandler.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleMulterError = (err: any) => {
    let statusCode: number = status.BAD_REQUEST;
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