import { Router } from "express";
import { login, signup } from "./auth.controller";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));

export default router;
