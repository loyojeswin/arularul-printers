import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireAuth } from "../../middleware/auth";
import { razorpayCreateOrder, razorpayVerify, razorpayWebhook } from "./payments.controller";

const router = Router();

router.post("/razorpay/webhook", asyncHandler(razorpayWebhook));

router.use(requireAuth);
router.post("/razorpay/create-order", asyncHandler(razorpayCreateOrder));
router.post("/razorpay/verify", asyncHandler(razorpayVerify));

export default router;
