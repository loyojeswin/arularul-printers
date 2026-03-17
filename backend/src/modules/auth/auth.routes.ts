import { Router } from "express";
import { login, logout, signup } from "./auth.controller";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/logout", asyncHandler(logout));

export default router;
