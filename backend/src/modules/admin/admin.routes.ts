import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import {
  createProduct,
  deleteProduct,
  deleteProductMedia,
  getAllOrders,
  getAllProducts,
  getRevenueAnalytics,
  uploadProductMedia,
  updateOrderStatus,
  updateProduct
} from "./admin.controller";
import { asyncHandler } from "../../utils/async-handler";
import { productMediaUpload } from "../../middleware/upload";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/orders", asyncHandler(getAllOrders));
router.patch("/orders/:orderId/status", asyncHandler(updateOrderStatus));
router.get("/analytics/revenue", asyncHandler(getRevenueAnalytics));
router.get("/products", asyncHandler(getAllProducts));
router.post("/products", asyncHandler(createProduct));
router.patch("/products/:productId", asyncHandler(updateProduct));
router.delete("/products/:productId", asyncHandler(deleteProduct));
router.post(
  "/products/:productId/media",
  productMediaUpload.array("files", 10),
  asyncHandler(uploadProductMedia)
);
router.delete("/products/:productId/media/:mediaId", asyncHandler(deleteProductMedia));

export default router;
