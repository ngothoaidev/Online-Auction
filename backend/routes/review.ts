import express from "express";
import { reviewController } from "../controllers/review.ts";

const router = express.Router();

// Get all reviews with optional filters and pagination
router.get("/", reviewController.getReviews);

// Get review statistics
router.get("/stats", reviewController.getReviewStats);

// Get a single review by ID
router.get("/:id", reviewController.getReviewById);

export default router;
