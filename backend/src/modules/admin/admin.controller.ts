import { Request, Response } from "express";
import { OrderStatus, Prisma, ProductMediaType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import {
  createOfferSchema,
  createProductSchema,
  updatePaymentSchema,
  updateOfferSchema,
  updateProductSchema
} from "./admin.validation";
import fs from "fs";
import path from "path";
import { env } from "../../config/env";

export async function getAllOrders(_req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    include: { user: true, items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json(orders);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const status = req.body.status as OrderStatus;
  if (!status || !Object.values(OrderStatus).includes(status)) {
    throw new HttpError(400, "Invalid status");
  }

  const order = await prisma.order.update({
    where: { id: req.params.orderId },
    data: { status }
  });

  return res.json(order);
}

export async function updateCashPaymentStatus(req: Request, res: Response) {
  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid payment payload");
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { payment: true }
  });

  if (!order || !order.payment) {
    throw new HttpError(404, "Order/payment not found");
  }

  if (order.payment.provider !== "CASH") {
    throw new HttpError(400, "Only CASH payments can be updated manually");
  }

  const payment = await prisma.payment.update({
    where: { id: order.payment.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.providerPaymentId ? { providerPaymentId: parsed.data.providerPaymentId } : {})
    }
  });

  return res.json(payment);
}

export async function getRevenueAnalytics(_req: Request, res: Response) {
  const paidOrders = await prisma.order.findMany({
    where: { payment: { is: { status: "PAID" } } },
    select: { totalAmount: true, createdAt: true }
  });

  const totalRevenue = paidOrders.reduce((acc, order) => acc + Number(order.totalAmount), 0);

  return res.json({
    totalRevenue,
    orderCount: paidOrders.length
  });
}

export async function getAllProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    include: { pricingOptions: { where: { isActive: true } }, media: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return res.json(products);
}

export async function createProduct(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid product payload");
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      basePrice: new Prisma.Decimal(parsed.data.basePrice),
      isActive: parsed.data.isActive ?? true,
      pricingOptions: {
        create: [
          { optionType: "PAPER", optionValue: "Standard", multiplier: new Prisma.Decimal(1) },
          { optionType: "FINISH", optionValue: "None", multiplier: new Prisma.Decimal(1) }
        ]
      }
    },
    include: { pricingOptions: true, media: true }
  });

  return res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid product payload");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new HttpError(400, "No fields provided for update");
  }

  const product = await prisma.product.update({
    where: { id: req.params.productId },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.basePrice !== undefined
        ? { basePrice: new Prisma.Decimal(parsed.data.basePrice) }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {})
    },
    include: { pricingOptions: { where: { isActive: true } }, media: { orderBy: { sortOrder: "asc" } } }
  });

  return res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await prisma.product.update({
    where: { id: req.params.productId },
    data: { isActive: false }
  });

  return res.json({ message: "Product deactivated", productId: product.id });
}

export async function uploadProductMedia(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    throw new HttpError(400, "No files uploaded");
  }

  await prisma.product.findUniqueOrThrow({ where: { id: req.params.productId } });

  const mediaRows = files.map((file, index) => ({
    productId: req.params.productId,
    filePath: path.join("products", path.basename(file.path)),
    fileType: file.mimetype.startsWith("video/") ? ProductMediaType.VIDEO : ProductMediaType.IMAGE,
    mimeType: file.mimetype,
    fileSize: file.size,
    sortOrder: index
  }));

  await prisma.productMedia.createMany({
    data: mediaRows
  });

  const media = await prisma.productMedia.findMany({
    where: { productId: req.params.productId },
    orderBy: { sortOrder: "asc" }
  });

  return res.status(201).json(media);
}

export async function deleteProductMedia(req: Request, res: Response) {
  const media = await prisma.productMedia.findFirst({
    where: { id: req.params.mediaId, productId: req.params.productId }
  });

  if (!media) {
    throw new HttpError(404, "Product media not found");
  }

  const absolutePath = path.resolve(process.cwd(), env.UPLOAD_DIR, media.filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  await prisma.productMedia.delete({ where: { id: media.id } });

  return res.json({ message: "Media deleted", mediaId: media.id });
}

export async function getAllOffers(_req: Request, res: Response) {
  const offers = await prisma.offer.findMany({
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: { media: { orderBy: { sortOrder: "asc" } } }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json(offers);
}

export async function createOffer(req: Request, res: Response) {
  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid offer payload");
  }

  const existing = await prisma.offer.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    throw new HttpError(409, "Offer slug already in use");
  }

  const offer = await prisma.offer.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
      products: {
        create: parsed.data.productIds.map((productId, index) => ({
          productId,
          sortOrder: index
        }))
      }
    },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: { media: { orderBy: { sortOrder: "asc" } } }
          }
        }
      }
    }
  });

  return res.status(201).json(offer);
}

export async function updateOffer(req: Request, res: Response) {
  const parsed = updateOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid offer payload");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new HttpError(400, "No fields provided for update");
  }

  if (parsed.data.slug) {
    const slugOwner = await prisma.offer.findUnique({ where: { slug: parsed.data.slug } });
    if (slugOwner && slugOwner.id !== req.params.offerId) {
      throw new HttpError(409, "Offer slug already in use");
    }
  }

  if (parsed.data.productIds) {
    await prisma.offerProduct.deleteMany({ where: { offerId: req.params.offerId } });
    if (parsed.data.productIds.length > 0) {
      await prisma.offerProduct.createMany({
        data: parsed.data.productIds.map((productId, index) => ({
          offerId: req.params.offerId,
          productId,
          sortOrder: index
        }))
      });
    }
  }

  const offer = await prisma.offer.update({
    where: { id: req.params.offerId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {})
    },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: { media: { orderBy: { sortOrder: "asc" } } }
          }
        }
      }
    }
  });

  return res.json(offer);
}

export async function deleteOffer(req: Request, res: Response) {
  const offer = await prisma.offer.update({
    where: { id: req.params.offerId },
    data: { isActive: false }
  });

  return res.json({ message: "Offer deactivated", offerId: offer.id });
}
