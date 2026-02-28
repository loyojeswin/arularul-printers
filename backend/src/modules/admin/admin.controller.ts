import { Request, Response } from "express";
import { OrderStatus, Prisma, ProductMediaType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { createProductSchema, updateProductSchema } from "./admin.validation";
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
