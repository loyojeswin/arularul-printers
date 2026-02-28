import { Router } from "express";

const router = Router();

router.post("/razorpay/create-order", async (_req, res) => {
  return res.json({
    message: "Razorpay order creation scaffold ready. Integrate SDK here."
  });
});

router.post("/razorpay/webhook", async (_req, res) => {
  return res.status(200).json({ received: true });
});

export default router;
