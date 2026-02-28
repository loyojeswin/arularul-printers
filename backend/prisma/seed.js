const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const baseProducts = [
  { slug: "visiting-cards", name: "Visiting Cards", basePrice: 2.5 },
  { slug: "flyers", name: "Flyers", basePrice: 1.8 },
  { slug: "brochures", name: "Brochures", basePrice: 5.2 }
];

const paperOptions = [
  ["Standard", 1],
  ["Premium", 1.25],
  ["Matte", 1.1]
];

const finishOptions = [
  ["None", 1],
  ["Gloss", 1.15],
  ["Lamination", 1.3]
];

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  await prisma.user.upsert({
    where: { email: "admin@arulprinters.com" },
    update: {
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      name: "Arul Admin"
    },
    create: {
      name: "Arul Admin",
      email: "admin@arulprinters.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      city: "Thoothukudi"
    }
  });

  for (const product of baseProducts) {
    const upserted = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        basePrice: new Prisma.Decimal(product.basePrice),
        isActive: true
      },
      create: {
        slug: product.slug,
        name: product.name,
        basePrice: new Prisma.Decimal(product.basePrice),
        isActive: true
      }
    });

    for (const [value, multiplier] of paperOptions) {
      await prisma.pricingOption.upsert({
        where: {
          productId_optionType_optionValue: {
            productId: upserted.id,
            optionType: "PAPER",
            optionValue: value
          }
        },
        update: { multiplier: new Prisma.Decimal(multiplier), isActive: true },
        create: {
          productId: upserted.id,
          optionType: "PAPER",
          optionValue: value,
          multiplier: new Prisma.Decimal(multiplier)
        }
      });
    }

    for (const [value, multiplier] of finishOptions) {
      await prisma.pricingOption.upsert({
        where: {
          productId_optionType_optionValue: {
            productId: upserted.id,
            optionType: "FINISH",
            optionValue: value
          }
        },
        update: { multiplier: new Prisma.Decimal(multiplier), isActive: true },
        create: {
          productId: upserted.id,
          optionType: "FINISH",
          optionValue: value,
          multiplier: new Prisma.Decimal(multiplier)
        }
      });
    }
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
