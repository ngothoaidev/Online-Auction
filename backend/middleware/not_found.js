import { AppError } from "../utils/errors.js";

const notFound = (req, res, next) => next(new AppError(404, "NOT_FOUND", `Not Found - ${req.originalUrl}`));

export default notFound;
