-- CreateTable
CREATE TABLE "OrderItemDesignFile" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemDesignFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItemDesignFile_orderItemId_sortOrder_idx" ON "OrderItemDesignFile"("orderItemId", "sortOrder");

-- AddForeignKey
ALTER TABLE "OrderItemDesignFile" ADD CONSTRAINT "OrderItemDesignFile_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

