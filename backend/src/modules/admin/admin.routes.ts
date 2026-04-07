import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import {
  createOffer,
  createProduct,
  deleteOffer,
  deleteProduct,
  deleteProductMedia,
  getAllOrders,
  getAllOffers,
  getAllProducts,
  getRevenueAnalytics,
  updateCashPaymentStatus,
  uploadOfferImage,
  uploadProductMedia,
  updateOffer,
  updateOrderStatus,
  updateProduct
} from "./admin.controller";
import { asyncHandler } from "../../utils/async-handler";
import { offerImageUpload, productMediaUpload } from "../../middleware/upload";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/orders", asyncHandler(getAllOrders));
router.patch("/orders/:orderId/status", asyncHandler(updateOrderStatus));
router.patch("/orders/:orderId/payment", asyncHandler(updateCashPaymentStatus));
router.get("/analytics/revenue", asyncHandler(getRevenueAnalytics));
router.get("/products", asyncHandler(getAllProducts));
router.get("/offers", asyncHandler(getAllOffers));
router.post("/products", asyncHandler(createProduct));
router.post("/offers", asyncHandler(createOffer));
router.patch("/products/:productId", asyncHandler(updateProduct));
router.patch("/offers/:offerId", asyncHandler(updateOffer));
router.delete("/products/:productId", asyncHandler(deleteProduct));
router.delete("/offers/:offerId", asyncHandler(deleteOffer));
router.post("/offers/:offerId/image", offerImageUpload.single("file"), asyncHandler(uploadOfferImage));
router.post(
  "/products/:productId/media",
  productMediaUpload.array("files", 10),
  asyncHandler(uploadProductMedia)
);
router.delete("/products/:productId/media/:mediaId", asyncHandler(deleteProductMedia));

export default router;
