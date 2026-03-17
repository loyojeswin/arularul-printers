import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  addLike,
  clearCart,
  getCart,
  getLikes,
  getProfile,
  removeCartItem,
  removeLike,
  upsertCartItem
} from "./me.controller";

const router = Router();

router.use(requireAuth);

router.get("/profile", asyncHandler(getProfile));
router.get("/likes", asyncHandler(getLikes));
router.post("/likes", asyncHandler(addLike));
router.delete("/likes/:productId", asyncHandler(removeLike));

router.get("/cart", asyncHandler(getCart));
router.post("/cart", asyncHandler(upsertCartItem));
router.delete("/cart/:productId", asyncHandler(removeCartItem));
router.delete("/cart", asyncHandler(clearCart));

export default router;
