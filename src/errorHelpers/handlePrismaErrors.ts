// src/errorHelpers/handlePrismaError.ts
import status from "http-status";
import { TErrorResponse, TErrorSources } from "../app/interfaces/error.interface";
import { Prisma } from "../generated/prisma/client";

const getStatusCodeFromPrismaError = (errorCode: string): number => {
    // P2002: Unique constraint failed
    if (errorCode === "P2002") {
        return status.CONFLICT; // 409
    }

    // P2025, P2001, P2015, P2018 : Not Found errors
    if (["P2025", "P2001", "P2015", "P2018"].includes(errorCode)) {
        return status.NOT_FOUND; // 404
    }

    // P1000 , P6002 : DB Authentication errors = 401 Unauthorized
    if (["P1000", "P6002"].includes(errorCode)) {
        return status.UNAUTHORIZED; // 401
    }

    // P1010 , P6010 : Access denied errors = 403 Forbidden
    if (["P1010", "P6010"].includes(errorCode)) {
        return status.FORBIDDEN; // 403
    }

    // P6003 : Prisma Accelerate Plan limit exceeded = 402 Payment Required
    if (errorCode === "P6003") {
        return status.PAYMENT_REQUIRED; // 402
    }

    // P1008, 2004, 6004 : Timeout errors = 504 Gateway Timeout
    if (["P1008", "P2004", "P6004"].includes(errorCode)) {
        return status.GATEWAY_TIMEOUT; // 504
    }

    // P5011 : Rate Limit Exceeded = 429 Too Many Requests
    if (errorCode === "P5011") {
        return status.TOO_MANY_REQUESTS; // 429
    }

    // P6009 Response size limit exceeded = 413 Payload Too Large
    if (errorCode === "P6009") {
        return 413; // Payload Too Large
    }

    // P1xxx , P2024, P2037, P6008 : Connection errors
    if(errorCode.startsWith("P1") || ["P2024", "P2037", "P6008"].includes(errorCode)) {
        return status.SERVICE_UNAVAILABLE; // 503
    }

    // P2XXX : except unhandled errors, Bad Request
    if (errorCode.startsWith("P2")) {
        return status.BAD_REQUEST; // 400
    }

    // P3XXX, P4XXX : Internal Server Errors
    if (errorCode.startsWith("P3") || errorCode.startsWith("P4")) {
        return status.INTERNAL_SERVER_ERROR; // 500
    }

    // Default return for any unhandled error codes
    return status.INTERNAL_SERVER_ERROR; // 500
};

const formatErrorMeta = (meta?: Record<string, unknown>): string => {
    if(!meta) return "";

    const parts: string[] = [];

    if(meta.target){
        parts.push(`Field(s): ${String(meta.target)}`);
    }

    if(meta.field_name){
        parts.push(`Field: ${String(meta.field_name)}`);
    }

    if(meta.column_name){
        parts.push(`Column: ${String(meta.column_name)}`);
    }

    if(meta.table) {
        parts.push(`Table: ${String(meta.table)}`);
    }

    if(meta.model_name){
        parts.push(`Model: ${String(meta.model_name)}`);
    }

    if(meta.relation_name){
        parts.push(`Relation: ${String(meta.relation_name)}`);
    }

    if(meta.constraint){
        parts.push(`Constraint: ${String(meta.constraint)}`);
    }

    if(meta.database_error){
        parts.push(`Database Error: ${String(meta.database_error)}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "";
};

export const handlePrismaClientKnownRequestError = (error: Prisma.PrismaClientKnownRequestError): TErrorResponse => {
    const statusCode = getStatusCodeFromPrismaError(error.code);
    const metaInfo = formatErrorMeta(error.meta);

    let cleanMessage = error.message;

    // Remove the "Invalid `prisma.user.create()` invocation: " part from the message
    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");

    // Split by new line and take the first line as the main message
    const lines = cleanMessage.split("\n").filter(line => line.trim());
    const mainMessage = lines[0] || "An error occurred with the database operation.";

    const errorSources: TErrorSources[] = [
        {
            path: error.code,
            message: metaInfo ? `${mainMessage} | ${metaInfo}` : mainMessage
        }
    ];

    if(error.meta?.cause){
        errorSources.push({
            path: "cause",
            message: String(error.meta.cause)
        });
    }

    return {
        success: false,
        statusCode: statusCode, // Now statusCode is always number, not undefined
        message: `${mainMessage}`,
        errorSources,
    };
};

export const handlePrismaClientUnknownError = (error: Prisma.PrismaClientUnknownRequestError): TErrorResponse => {
    let cleanMessage = error.message;

    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");

    const lines = cleanMessage.split("\n").filter(line => line.trim());
    const mainMessage = lines[0] || "An unknown error occurred with the database operation.";

    const errorSources: TErrorSources[] = [
        {
            path: "Unknown Prisma Error",
            message: mainMessage
        }
    ];

    return {
        success: false,
        statusCode: status.INTERNAL_SERVER_ERROR, // Always 500
        message: mainMessage,
        errorSources,
    };
};

export const handlePrismaClientValidationError = (error: Prisma.PrismaClientValidationError): TErrorResponse => {
    let cleanMessage = error.message;

    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");

    const lines = cleanMessage.split("\n").filter(line => line.trim());

    const errorSources: TErrorSources[] = [];

    // Extract field name for field-specific validation errors
    const fieldMatch = cleanMessage.match(/Argument `(\w+)`/i);
    const fieldName = fieldMatch ? fieldMatch[1] : "Unknown Field";

    // Main message
    const mainMessage = lines.find(line => 
        !line.includes("Argument") &&
        !line.includes("→") &&
        line.length > 10
    ) || lines[0] || "Invalid query parameters provided to the database operation.";

    errorSources.push({
        path: fieldName,
        message: mainMessage
    });

    return {
        success: false,
        statusCode: status.BAD_REQUEST, // Always 400
        message: mainMessage,
        errorSources,
    };
};

export const handlePrismaClientInitializationError = (error: Prisma.PrismaClientInitializationError): TErrorResponse => {
    // Fix: Provide default status code if errorCode is undefined
    let statusCode: number;
    
    if (error.errorCode) {
        statusCode = getStatusCodeFromPrismaError(error.errorCode);
    } else {
        statusCode = status.SERVICE_UNAVAILABLE; // Default to 503
    }

    let cleanMessage = error.message;
    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");

    const lines = cleanMessage.split("\n").filter(line => line.trim());
    const mainMessage = lines[0] || "An error occurred while initializing the Prisma Client.";

    const errorSources: TErrorSources[] = [
        {
            path: error.errorCode || "Initialization Error",
            message: mainMessage
        }
    ];

    return {
        success: false,
        statusCode: statusCode, // Now statusCode is always number
        message: mainMessage,
        errorSources,
    };
};

export const handlePrismaClientRustPanicError = (): TErrorResponse => {
    const errorSources: TErrorSources[] = [{
        path: "Rust Engine Crashed",
        message: "The database engine encountered a fatal error and crashed. This is usually due to an internal bug in the Prisma engine or an unexpected edge case in the database operation."
    }];

    return {
        success: false,
        statusCode: status.INTERNAL_SERVER_ERROR, // Always 500
        message: "Database engine crashed due to a fatal error. Please try again later or contact support.",
        errorSources,
    };
};