-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" INTEGER,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
