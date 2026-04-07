import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { createReviewSchema } from "./reviews.validation";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export async function listProductReviews(req: Request, res: Response) {
  const productId = req.params.productId;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true }
  });

  if (!product || !product.isActive) {
    throw new HttpError(404, "Product not found");
  }

  const [totalCount, average, grouped, reviews] = await Promise.all([
    prisma.productReview.count({ where: { productId } }),
    prisma.productReview.aggregate({ where: { productId }, _avg: { rating: true } }),
    prisma.productReview.groupBy({ by: ["rating"], where: { productId }, _count: { rating: true } }),
    prisma.productReview.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const countByRating: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of grouped) {
    const rating = row.rating as 1 | 2 | 3 | 4 | 5;
    countByRating[rating] = row._count.rating;
  }

  return res.json({
    summary: {
      averageRating: round1(Number(average._avg.rating || 0)),
      totalReviews: totalCount,
      countByRating
    },
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      user: review.user
    }))
  });
}

export async function upsertProductReview(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const productId = req.params.productId;
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid review payload");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true }
  });

  if (!product || !product.isActive) {
    throw new HttpError(404, "Product not found");
  }

  const hasPaidOrder = await prisma.order.count({
    where: {
      userId: req.authUser.userId,
      items: { some: { productId } },
      payment: { is: { status: "PAID" } }
    }
  });

  if (hasPaidOrder === 0) {
    throw new HttpError(403, "Only paid customers can review this product");
  }

  const review = await prisma.productReview.upsert({
    where: { productId_userId: { productId, userId: req.authUser.userId } },
    create: {
      productId,
      userId: req.authUser.userId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      comment: parsed.data.comment
    },
    update: {
      rating: parsed.data.rating,
      title: parsed.data.title,
      comment: parsed.data.comment
    },
    include: { user: { select: { id: true, name: true } } }
  });

  return res.status(201).json({
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt,
    user: review.user
  });
}

