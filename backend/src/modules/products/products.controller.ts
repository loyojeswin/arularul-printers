import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { calculatePrice } from "../../utils/price";

export async function listProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      pricingOptions: { where: { isActive: true } },
      media: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: { name: "asc" }
  });

  return res.json(products);
}

export async function getQuotePreview(req: Request, res: Response) {
  const { productId, quantity, paperType, finishType } = req.query;

  if (!productId || !quantity || !paperType || !finishType) {
    return res.status(400).json({ message: "Missing query params" });
  }

  const product = await prisma.product.findUnique({
    where: { id: String(productId) },
    include: { pricingOptions: { where: { isActive: true } } }
  });

  if (!product || !product.isActive) {
    return res.status(404).json({ message: "Product not found" });
  }

  const paper = product.pricingOptions.find(
    (po) => po.optionType === "PAPER" && po.optionValue === String(paperType)
  );
  const finish = product.pricingOptions.find(
    (po) => po.optionType === "FINISH" && po.optionValue === String(finishType)
  );

  const breakdown = calculatePrice({
    basePrice: Number(product.basePrice),
    quantity: Number(quantity),
    paperMultiplier: Number(paper?.multiplier ?? 1),
    finishMultiplier: Number(finish?.multiplier ?? 1)
  });

  return res.json({
    product: { id: product.id, name: product.name },
    ...breakdown
  });
}
