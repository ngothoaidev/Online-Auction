import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.ts";

const notFound = (req: Request, res: Response, next: NextFunction) => next(new AppError(404, "NOT_FOUND", `Not Found - ${req.originalUrl}`));

export default notFound;
