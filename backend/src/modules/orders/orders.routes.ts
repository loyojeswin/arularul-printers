import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { orderDesignUpload } from "../../middleware/upload";
import { createOrder, downloadInvoice, getMyOrders, reorder } from "./orders.controller";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.use(requireAuth);
router.post("/", orderDesignUpload.array("designFiles", 30), asyncHandler(createOrder));
router.get("/my", asyncHandler(getMyOrders));
router.post("/:orderId/reorder", asyncHandler(reorder));
router.get("/:orderId/invoice", asyncHandler(downloadInvoice));

export default router;
