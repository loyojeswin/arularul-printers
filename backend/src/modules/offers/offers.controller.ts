import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";

export async function listOffers(_req: Request, res: Response) {
  const offers = await prisma.offer.findMany({
    where: { isActive: true },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json(
    offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      description: offer.description,
      imagePath: offer.imagePath,
      isActive: offer.isActive,
      productCount: offer.products.length
    }))
  );
}

export async function getOfferProducts(req: Request, res: Response) {
  const offer = await prisma.offer.findUnique({
    where: { slug: req.params.slug },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              pricingOptions: { where: { isActive: true } },
              media: { orderBy: { sortOrder: "asc" } }
            }
          }
        }
      }
    }
  });

  if (!offer || !offer.isActive) {
    throw new HttpError(404, "Offer not found");
  }

  return res.json({
    offer: {
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      description: offer.description,
      imagePath: offer.imagePath
    },
    products: offer.products.map((row) => row.product).filter((product) => product.isActive)
  });
}
