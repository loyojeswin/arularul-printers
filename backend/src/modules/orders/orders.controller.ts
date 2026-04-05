import { Request, Response } from "express";
import { PaymentProvider, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { calculatePrice } from "../../utils/price";
import { createOrderSchema } from "./orders.validation";
import { env } from "../../config/env";
import path from "path";

function toNumber(decimal: Prisma.Decimal | number) {
  return Number(decimal);
}

export async function createOrder(req: Request, res: Response) {
  let normalizedBody = req.body;
  if (typeof req.body.items === "string") {
    try {
      normalizedBody = {
        ...req.body,
        items: JSON.parse(req.body.items)
      };
    } catch {
      throw new HttpError(400, "Invalid items format");
    }
  }

  const parsed = createOrderSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid order payload");
  }

  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.productId) }, isActive: true },
    include: { pricingOptions: { where: { isActive: true } } }
  });

  if (products.length !== parsed.data.items.length) {
    throw new HttpError(400, "One or more products are invalid/inactive");
  }

  const filePath = req.file?.path;

  const itemRows = parsed.data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const paper = product.pricingOptions.find(
      (po) => po.optionType === "PAPER" && po.optionValue === item.paperType
    );
    const finish = product.pricingOptions.find(
      (po) => po.optionType === "FINISH" && po.optionValue === item.finishType
    );

    const breakdown = calculatePrice({
      basePrice: toNumber(product.basePrice),
      quantity: item.quantity,
      paperMultiplier: toNumber(paper?.multiplier ?? 1),
      finishMultiplier: toNumber(finish?.multiplier ?? 1)
    });

    return {
      productId: item.productId,
      quantity: item.quantity,
      paperType: item.paperType,
      finishType: item.finishType,
      designFilePath: filePath,
      unitPrice: new Prisma.Decimal(toNumber(product.basePrice)),
      lineTotal: new Prisma.Decimal(breakdown.subtotal),
      lineTax: breakdown.taxAmount
    };
  });

  const subtotal = itemRows.reduce((acc, row) => acc + toNumber(row.lineTotal), 0);
  const taxAmount = itemRows.reduce((acc, row) => acc + row.lineTax, 0);
  const totalAmount = subtotal + taxAmount;
  const provider = parsed.data.paymentMode === "CASH" ? PaymentProvider.CASH : PaymentProvider.RAZORPAY;

  const order = await prisma.order.create({
    data: {
      userId: req.authUser.userId,
      city: parsed.data.city || env.DEFAULT_CITY,
      notes: parsed.data.notes,
      subtotal: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(taxAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      items: {
        create: itemRows.map(({ lineTax, ...item }) => item)
      },
      payment: {
        create: {
          amount: new Prisma.Decimal(totalAmount),
          provider,
          status: "PENDING"
        }
      }
    },
    include: {
      items: true,
      payment: true
    }
  });

  return res.status(201).json(order);
}

export async function getMyOrders(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const orders = await prisma.order.findMany({
    where: { userId: req.authUser.userId },
    include: { items: { include: { product: true } }, payment: true, invoice: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json(orders);
}

export async function reorder(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const oldOrder = await prisma.order.findFirst({
    where: { id: req.params.orderId, userId: req.authUser.userId },
    include: { items: true }
  });

  if (!oldOrder) {
    throw new HttpError(404, "Order not found");
  }

  const newOrder = await prisma.order.create({
    data: {
      userId: req.authUser.userId,
      city: oldOrder.city,
      subtotal: oldOrder.subtotal,
      taxAmount: oldOrder.taxAmount,
      totalAmount: oldOrder.totalAmount,
      items: {
        create: oldOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          paperType: item.paperType,
          finishType: item.finishType,
          designFilePath: item.designFilePath,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      },
      payment: {
        create: {
          amount: oldOrder.totalAmount,
          provider: "RAZORPAY",
          status: "PENDING"
        }
      }
    },
    include: { items: true, payment: true }
  });

  return res.status(201).json(newOrder);
}

export async function downloadInvoice(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const order = await prisma.order.findFirst({
    where: { id: req.params.orderId, userId: req.authUser.userId },
    include: { invoice: true }
  });

  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  if (!order.invoice) {
    throw new HttpError(404, "Invoice not generated yet");
  }

  return res.download(path.resolve(order.invoice.invoicePath));
}
