import { Router } from "express";
import { getQuotePreview, listProducts } from "./products.controller";
import { asyncHandler } from "../../utils/async-handler";
import { listProductReviews, upsertProductReview } from "./reviews.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/", asyncHandler(listProducts));
router.get("/quote-preview", asyncHandler(getQuotePreview));
router.get("/:productId/reviews", asyncHandler(listProductReviews));
router.post("/:productId/reviews", requireAuth, asyncHandler(upsertProductReview));

export default router;
