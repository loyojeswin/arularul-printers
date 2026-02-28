import { Router } from "express";
import { getQuotePreview, listProducts } from "./products.controller";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.get("/", asyncHandler(listProducts));
router.get("/quote-preview", asyncHandler(getQuotePreview));

export default router;
