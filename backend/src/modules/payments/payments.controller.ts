import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { razorpayCreateOrderSchema, razorpayVerifySchema } from "./payments.validation";
import { Prisma } from "@prisma/client";

function requireRazorpayKeys() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(500, "Razorpay keys not configured");
  }
}

function toNumber(decimal: Prisma.Decimal | number) {
  return Number(decimal);
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signRazorpayPayment(orderId: string, paymentId: string) {
  requireRazorpayKeys();
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET as string).update(body).digest("hex");
}

function verifyRazorpayWebhookSignature(payload: Buffer, signatureHeader: string | undefined) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new HttpError(500, "Razorpay webhook secret not configured");
  }
  if (!signatureHeader) {
    throw new HttpError(400, "Missing Razorpay signature");
  }

  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!safeEqualHex(expected, signatureHeader)) {
    throw new HttpError(400, "Invalid Razorpay webhook signature");
  }
}

async function createRazorpayOrderViaApi(params: { amountPaise: number; currency: string; receipt: string; notes?: Record<string, string> }) {
  requireRazorpayKeys();

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: 1,
      notes: params.notes
    })
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new HttpError(502, `Razorpay order creation failed${error ? `: ${error}` : ""}`);
  }

  return (await response.json()) as { id: string; amount: number; currency: string; receipt: string; status: string };
}

export async function razorpayCreateOrder(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = razorpayCreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid payload");
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { payment: true }
  });

  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  if (req.authUser.role !== "ADMIN" && order.userId !== req.authUser.userId) {
    throw new HttpError(403, "Forbidden");
  }
  if (!order.payment) {
    throw new HttpError(400, "Payment not initialized for this order");
  }
  if (order.payment.status !== "PENDING") {
    throw new HttpError(400, "Payment already processed");
  }
  if (order.payment.provider === "CASH") {
    throw new HttpError(400, "Cash payments cannot create Razorpay orders");
  }

  if (order.payment.providerOrderId) {
    return res.json({
      orderId: order.id,
      amount: toNumber(order.payment.amount),
      currency: "INR",
      razorpayKeyId: env.RAZORPAY_KEY_ID || "",
      razorpayOrderId: order.payment.providerOrderId
    });
  }

  const amountPaise = Math.round(toNumber(order.payment.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new HttpError(400, "Invalid payment amount");
  }

  const razorpayOrder = await createRazorpayOrderViaApi({
    amountPaise,
    currency: "INR",
    receipt: order.id
  });

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { providerOrderId: razorpayOrder.id }
  });

  return res.json({
    orderId: order.id,
    amount: toNumber(order.payment.amount),
    currency: "INR",
    razorpayKeyId: env.RAZORPAY_KEY_ID || "",
    razorpayOrderId: razorpayOrder.id
  });
}

export async function razorpayVerify(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = razorpayVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid payload");
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { payment: true }
  });
  if (!order || !order.payment) {
    throw new HttpError(404, "Order/payment not found");
  }
  if (req.authUser.role !== "ADMIN" && order.userId !== req.authUser.userId) {
    throw new HttpError(403, "Forbidden");
  }
  if (order.payment.provider === "CASH") {
    throw new HttpError(400, "Cash payments cannot be verified via Razorpay");
  }
  if (order.payment.status === "PAID") {
    return res.json({ ok: true, status: "PAID" });
  }
  if (order.payment.providerOrderId && order.payment.providerOrderId !== parsed.data.razorpayOrderId) {
    throw new HttpError(400, "Razorpay order mismatch");
  }

  const expected = signRazorpayPayment(parsed.data.razorpayOrderId, parsed.data.razorpayPaymentId);
  if (!safeEqualHex(expected, parsed.data.razorpaySignature)) {
    throw new HttpError(400, "Invalid Razorpay payment signature");
  }

  await prisma.payment.update({
    where: { orderId: order.id },
    data: {
      status: "PAID",
      providerOrderId: parsed.data.razorpayOrderId,
      providerPaymentId: parsed.data.razorpayPaymentId
    }
  });

  return res.json({ ok: true, status: "PAID" });
}

export async function razorpayWebhook(req: Request, res: Response) {
  const rawBody = req.rawBody;
  if (!rawBody) {
    throw new HttpError(400, "Missing raw body");
  }

  verifyRazorpayWebhookSignature(rawBody, req.headers["x-razorpay-signature"] as string | undefined);

  const event = req.body as any;
  const eventType = String(event?.event || "");

  const entity = event?.payload?.payment?.entity;
  const paymentId = entity?.id ? String(entity.id) : null;
  const razorpayOrderId = entity?.order_id ? String(entity.order_id) : null;
  const status = entity?.status ? String(entity.status) : null;

  if (!razorpayOrderId) {
    return res.status(200).json({ received: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: razorpayOrderId }
  });

  if (!payment) {
    return res.status(200).json({ received: true });
  }

  if (eventType === "payment.captured" || status === "captured") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        ...(paymentId ? { providerPaymentId: paymentId } : {})
      }
    });
  } else if (eventType === "payment.failed" || status === "failed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        ...(paymentId ? { providerPaymentId: paymentId } : {})
      }
    });
  }

  return res.status(200).json({ received: true });
}
