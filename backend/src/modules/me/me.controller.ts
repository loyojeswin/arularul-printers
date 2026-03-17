import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { cartUpdateSchema, toggleProductSchema } from "./me.validation";

function requireUser(req: Request) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }
  return req.authUser.userId;
}

export async function getLikes(req: Request, res: Response) {
  const userId = requireUser(req);
  const likes = await prisma.userProductLike.findMany({
    where: { userId },
    select: { productId: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(likes.map((like) => like.productId));
}

export async function getProfile(req: Request, res: Response) {
  const userId = requireUser(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return res.json(user);
}

export async function addLike(req: Request, res: Response) {
  const userId = requireUser(req);
  const parsed = toggleProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid payload");
  }

  await prisma.userProductLike.upsert({
    where: { userId_productId: { userId, productId: parsed.data.productId } },
    update: {},
    create: { userId, productId: parsed.data.productId }
  });

  return res.status(201).json({ ok: true });
}

export async function removeLike(req: Request, res: Response) {
  const userId = requireUser(req);
  const productId = req.params.productId;
  await prisma.userProductLike.deleteMany({ where: { userId, productId } });
  return res.json({ ok: true });
}

export async function getCart(req: Request, res: Response) {
  const userId = requireUser(req);
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(items);
}

export async function upsertCartItem(req: Request, res: Response) {
  const userId = requireUser(req);
  const parsed = cartUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid payload");
  }

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId: parsed.data.productId } },
    update: { quantity: parsed.data.quantity },
    create: { userId, productId: parsed.data.productId, quantity: parsed.data.quantity }
  });

  return res.status(201).json(item);
}

export async function removeCartItem(req: Request, res: Response) {
  const userId = requireUser(req);
  const productId = req.params.productId;
  await prisma.cartItem.deleteMany({ where: { userId, productId } });
  return res.json({ ok: true });
}

export async function clearCart(req: Request, res: Response) {
  const userId = requireUser(req);
  await prisma.cartItem.deleteMany({ where: { userId } });
  return res.json({ ok: true });
}
