import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { createAddressSchema, updateAddressSchema } from "./addresses.validation";

export async function listMyAddresses(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const addresses = await prisma.address.findMany({
    where: { userId: req.authUser.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });

  return res.json(addresses);
}

export async function createAddress(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = createAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid address payload");
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.authUser.userId, isDefault: true },
      data: { isDefault: false }
    });
  }

  const address = await prisma.address.create({
    data: {
      userId: req.authUser.userId,
      label: parsed.data.label,
      fullAddress: parsed.data.fullAddress,
      city: parsed.data.city,
      pincode: parsed.data.pincode,
      phone: parsed.data.phone,
      isDefault: parsed.data.isDefault ?? false
    }
  });

  return res.status(201).json(address);
}

export async function updateAddress(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = updateAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.errors[0]?.message || "Invalid address payload");
  }

  const existing = await prisma.address.findFirst({
    where: { id: req.params.addressId, userId: req.authUser.userId }
  });

  if (!existing) {
    throw new HttpError(404, "Address not found");
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.authUser.userId, isDefault: true },
      data: { isDefault: false }
    });
  }

  const address = await prisma.address.update({
    where: { id: req.params.addressId },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.fullAddress !== undefined ? { fullAddress: parsed.data.fullAddress } : {}),
      ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
      ...(parsed.data.pincode !== undefined ? { pincode: parsed.data.pincode } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {})
    }
  });

  return res.json(address);
}

export async function deleteAddress(req: Request, res: Response) {
  if (!req.authUser) {
    throw new HttpError(401, "Unauthorized");
  }

  const existing = await prisma.address.findFirst({
    where: { id: req.params.addressId, userId: req.authUser.userId }
  });

  if (!existing) {
    throw new HttpError(404, "Address not found");
  }

  await prisma.address.delete({ where: { id: req.params.addressId } });

  return res.json({ message: "Address deleted", addressId: req.params.addressId });
}
