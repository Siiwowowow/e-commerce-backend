class AppError extends Error {
    public statusCode: number;
    errorSources: { path: string; message: string; }[];

    constructor(statusCode: number, message: string, stack = '') {
        super(message) // Error("My Error Message")
        this.statusCode = statusCode;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export default AppError;