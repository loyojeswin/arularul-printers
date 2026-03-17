import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getOfferProducts, listOffers } from "./offers.controller";

const router = Router();

router.get("/", asyncHandler(listOffers));
router.get("/:slug/products", asyncHandler(getOfferProducts));

export default router;
 