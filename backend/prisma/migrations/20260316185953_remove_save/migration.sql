/*
  Warnings:

  - You are about to drop the `UserProductSave` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserProductSave" DROP CONSTRAINT "UserProductSave_productId_fkey";

-- DropForeignKey
ALTER TABLE "UserProductSave" DROP CONSTRAINT "UserProductSave_userId_fkey";

-- DropTable
DROP TABLE "UserProductSave";
