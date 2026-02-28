import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { upload } from "../../middleware/upload";
import { createOrder, downloadInvoice, getMyOrders, reorder } from "./orders.controller";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.use(requireAuth);
router.post("/", upload.single("designFile"), asyncHandler(createOrder));
router.get("/my", asyncHandler(getMyOrders));
router.post("/:orderId/reorder", asyncHandler(reorder));
router.get("/:orderId/invoice", asyncHandler(downloadInvoice));

export default router;
