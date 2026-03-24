import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandelar";
import { notFound } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import cors from "cors";

const app: Application = express();

// Enable CORS with credentials
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser())
app.use("/api/v1/", IndexRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});
app.use(globalErrorHandler)
app.use(notFound)
export default app;