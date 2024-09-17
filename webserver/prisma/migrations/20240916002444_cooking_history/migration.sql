/*
  Warnings:

  - You are about to drop the column `authorCookedRecipeAt` on the `RecipeNote` table. All the data in the column will be lost.
  - You are about to drop the column `cookTimeSeconds` on the `RecipeNote` table. All the data in the column will be lost.
  - You are about to drop the column `prepTimeSeconds` on the `RecipeNote` table. All the data in the column will be lost.
  - You are about to drop the column `totalTimeSeconds` on the `RecipeNote` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RecipeNote" DROP COLUMN "authorCookedRecipeAt",
DROP COLUMN "cookTimeSeconds",
DROP COLUMN "prepTimeSeconds",
DROP COLUMN "totalTimeSeconds";

-- CreateTable
CREATE TABLE "CookingHistory" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "cookId" UUID NOT NULL,
    "cookedAtYear" SMALLINT NOT NULL,
    "cookedAtMonth" SMALLINT NOT NULL,
    "cookedAtDay" SMALLINT,

    CONSTRAINT "CookingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CookingHistory_cookId_cookedAtYear_cookedAtMonth_idx" ON "CookingHistory"("cookId", "cookedAtYear", "cookedAtMonth");

-- CreateIndex
CREATE UNIQUE INDEX "CookingHistory_recipeId_cookId_cookedAtYear_cookedAtMonth_c_key" ON "CookingHistory"("recipeId", "cookId", "cookedAtYear", "cookedAtMonth", "cookedAtDay");

-- AddForeignKey
ALTER TABLE "CookingHistory" ADD CONSTRAINT "CookingHistory_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookingHistory" ADD CONSTRAINT "CookingHistory_cookId_fkey" FOREIGN KEY ("cookId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
