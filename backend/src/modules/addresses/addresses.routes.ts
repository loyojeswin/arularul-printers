import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { createAddress, deleteAddress, listMyAddresses, updateAddress } from "./addresses.controller";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(listMyAddresses));
router.post("/", asyncHandler(createAddress));
router.patch("/:addressId", asyncHandler(updateAddress));
router.delete("/:addressId", asyncHandler(deleteAddress));

export default router;
